/* Presentation-only scheduler. No scoring, target selection, or gameplay waits. */
(function(root){
  const durations={stage:[160,740,200],bonus:[110,560,180],fusion:[100,240,160],popped:[110,300,190],combo:[130,440,230],notice:[110,300,190]};
  function create({show,hide,blocked=()=>false,now=()=>Date.now(),later=setTimeout,cancel=clearTimeout}){
    let session=0,current=null,pending=null,timer=null,started=0;const seen=new Set();
    const priority=e=>['stage','bonus'].includes(e.kind)?3:e.kind==='fusion'?2:1;
    function stop(){if(timer!==null)cancel(timer);timer=null;current=null;hide();}
    function clear(){session++;pending=null;seen.clear();stop();return session;}
    function finish(){stop();const next=pending;pending=null;if(next&&now()-next.at<800)display(next.event);}
    function display(e){
      if(e.token!==session||blocked())return;
      stop();current=e;started=now();show(e,durations[e.kind]);
      timer=later(finish,durations[e.kind].reduce((a,b)=>a+b,0));
    }
    function emit(event){
      const e={...event,token:event.token??session};
      if(e.token!==session||!durations[e.kind]||blocked())return false;
      if(e.kind==='bonus'&&!(e.count>0))return false;
      // Finale results must not interrupt or queue behind the count announcement.
      if(current?.kind==='bonus'&&priority(e)<3)return false;
      if(e.id&&seen.has(e.id))return false;
      if(e.id){seen.add(e.id);if(seen.size>128)seen.delete(seen.values().next().value);}
      if(current&&priority(current)>priority(e)){
        pending={event:e,at:now()};
        if(current.kind==='fusion'){
          if(timer!==null)cancel(timer);
          timer=later(finish,Math.max(0,340-(now()-started)));
        }
        return true;
      }
      pending=null;display(e);return true;
    }
    return {emit,clear,token:()=>session,state:()=>({session,current,pending})};
  }
  root.CubePopAnnouncementModel={create,durations};
  if(typeof module==='object')module.exports={create,durations};
  if(!root.document||root.__SIM)return;
  const board=document.getElementById('board'),preview=document.getElementById('rollPreview');
  const layer=document.createElement('div');layer.className='gameAnnouncement';layer.hidden=true;
  layer.innerHTML='<div class="announcementMotion" aria-hidden="true"><div class="announcementArt"></div></div><span class="announcementAccessible" role="status" aria-live="polite" aria-atomic="true"></span>';
  board.append(layer);const art=layer.querySelector('.announcementArt'),motion=layer.querySelector('.announcementMotion'),accessible=layer.querySelector('.announcementAccessible');
  const images=new Map(),labels={'lets-roll':'LET’S ROLL!',fusion:'FUSION!',popped:'POPPED!',combo:'COMBO','bonus-time':'BONUS TIME!'};
  let animation=null,loaded=false,waiting=null,last=null;
  const blocked=()=>!document.body.classList.contains('mPlay')||!!lessonState||document.getElementById('overlay').classList.contains('show')||!preview.hidden;
  function hide(){animation?.cancel();animation=null;layer.hidden=true;accessible.textContent='';last=null;}
  function img(id,width){
    const el=images.get(id);if(el){el.style.width=width+'px';return el;}
    const text=document.createElement('span');text.className='announcementDynamic announcementFallback';text.textContent=labels[id];return text;
  }
  function number(value,small=false){const s=document.createElement('span');s.className='announcementDynamic'+(small?' announcementSmall':'');s.textContent=String(value);return s;}
  function row(...nodes){const r=document.createElement('div');r.className='announcementRow';r.append(...nodes);return r;}
  function layout(){
    if(layer.hidden||!last)return;
    const b=board.getBoundingClientRect(),scale=last.kind==='bonus'?1:b.width>=480?Math.min(1.2,b.width/400):1;
    // Only the announcement scales. Reserve space for the 1.07 overshoot and stroke.
    const limit=Math.max(1,Math.min(b.width*(last.kind==='bonus'?.8:.86),b.width-16)/1.07),width=Math.min(last.kind==='bonus'?250:260,limit/scale);
    art.style.width=width+'px';art.style.setProperty('--number-fit','1');art.classList.remove('wrap');
    let numberFit=1;
    for(const row of art.children){
      const numbers=[...row.querySelectorAll('.announcementDynamic')].reduce((sum,e)=>sum+e.offsetWidth,0);
      const fixed=[...row.querySelectorAll('img')].reduce((sum,e)=>sum+e.offsetWidth,0)+Math.max(0,row.children.length-1)*5;
      if(numbers)numberFit=Math.min(numberFit,(width-fixed)/numbers);
    }
    art.style.setProperty('--number-fit',Math.max(.85,Math.min(1,numberFit)));
    if([...art.children].some(e=>e.scrollWidth>width+1))art.classList.add('wrap');
    // The frame uses a fixed 704px canvas scaled by fitBoard. Text sizes above
    // are screen CSS pixels, so cancel that parent scale for this layer only.
    layer.style.setProperty('--announcement-scale',Math.min(scale,limit/Math.max(art.scrollWidth,width))*board.offsetWidth/b.width);
    let y=last.kind==='bonus'?.24:.5,short=false;
    if(last.kind==='fusion'){
      const core=last.core;const h=art.offsetHeight*scale+24;
      const overlap=f=>core?Math.max(0,Math.min(b.top+b.height*f+h/2,core.bottom)-Math.max(b.top+b.height*f-h/2,core.top))*Math.max(0,Math.min(b.left+b.width/2+width*scale/2,core.right)-Math.max(b.left+b.width/2-width*scale/2,core.left)):0;
      y=.27;if(overlap(y)>0){y=[.18,.72].sort((a,c)=>overlap(a)-overlap(c))[0];short=overlap(y)>0;}
    }
    layer.style.top=y*100+'%';layer.dataset.short=String(short);
  }
  const controller=create({blocked,hide,show(e,times){
    last=e;layer.dataset.kind=e.kind;art.className='announcementArt '+e.kind;art.replaceChildren();
    if(e.kind==='stage'){art.append(row(number('STAGE '+e.stage,true)),row(img('lets-roll',260)));accessible.textContent='스테이지 '+e.stage+' 시작';}
    if(e.kind==='fusion'){art.append(row(img('fusion',194)));accessible.textContent='폭탄 결합';}
    if(e.kind==='popped'){art.append(row(number(e.count),img('popped',130)));accessible.textContent=e.count+'개 소멸';}
    if(e.kind==='combo'){
      const secondary=row(number(e.count),img('popped',106));secondary.classList.add('secondary');
      art.append(row(img('combo',145),number('×'+e.mult+'!')),secondary);accessible.textContent='콤보 '+e.mult+'배, '+e.count+'개 소멸';
    }
    if(e.kind==='notice'){art.append(row(number(e.text,true)));accessible.textContent=e.text;}
    if(e.kind==='bonus'){
      const detail=row(number(e.count,true),number(e.count===1?'BOMB CREATED!':'BOMBS CREATED!',true));
      detail.classList.add('bonusDetail');
      art.append(row(img('bonus-time',250)),detail);accessible.textContent='보너스 타임, 폭탄 '+e.count+'개 생성';
    }
    layer.hidden=false;layout();
    const reduce=root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let [enter,hold,leave]=times;if(layer.dataset.short==='true')hold=100;
    const total=enter+hold+leave;
    const frames=reduce?[{opacity:0,offset:0},{opacity:1,offset:Math.min(120,enter)/total},{opacity:1,offset:1-Math.min(120,leave)/total},{opacity:0,offset:1}]:[
      {opacity:0,transform:'translateY(7px) scale(.82)',offset:0},
      {opacity:1,transform:'translateY(0) scale(1.07)',offset:enter*.65/total},
      {opacity:1,transform:'translateY(0) scale(1)',offset:enter/total},
      {opacity:1,transform:'translateY(0) scale(1)',offset:(enter+hold)/total},
      {opacity:0,transform:'translateY(-12px) scale(1)',offset:1}];
    animation=motion.animate(frames,{duration:total,fill:'both',easing:'ease-out'});
  }});
  const ready=Promise.all(Object.keys(labels).map(async id=>{
    const image=new Image();image.alt='';image.draggable=false;image.src='assets/announcements/'+id+'.png';
    try{await image.decode();images.set(id,image);}catch(_){} // Readable text fallback per failed asset.
  }).concat([document.fonts.load('400 46px "CP Jua"').catch(()=>{})])).then(()=>{loaded=true;layout();const e=waiting;waiting=null;if(e&&Date.now()-e.at<800)controller.emit(e.event);});
  root.CubePopAnnouncements={ready,token:controller.token,
    clear(){waiting=null;return controller.clear();},
    emit(event){const e={...event,token:event.token??controller.token()};if(!loaded){waiting={event:e,at:Date.now()};return;}controller.emit(e);},
    state:controller.state};
  board.addEventListener('pointerdown',()=>{if(controller.state().current?.kind==='stage')controller.clear();},{capture:true,passive:true});
  new MutationObserver(()=>{if(blocked())root.CubePopAnnouncements.clear();}).observe(preview,{attributes:true,attributeFilter:['hidden']});
  new ResizeObserver(layout).observe(board);
})(typeof window==='object'?window:globalThis);
