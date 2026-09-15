/* Home/map presentation only; progression and game entry remain in index.html. */
(function(){
  'use strict';
  const S=window.HomeMapSurfaces,home=$('homeScr'),modal=$('setModal');
  const icon=(name)=>'<svg class="hmIcon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">'+({
    settings:'<path d="m9 3-.7 2.5-2 .9L4 5.8 2.5 8.4l1.8 1.8v2.5l-1.8 1.9L4 17.2l2.3-.6 2 .9L9 20h3l.7-2.5 2-.9 2.3.6 1.5-2.6-1.8-1.9v-2.5l1.8-1.8L17 5.8l-2.3.6-2-.9L12 3Z"/><circle cx="10.5" cy="11.5" r="3"/>',
    play:'<path d="m7 3 14 9-14 9Z" fill="currentColor" stroke="none"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>'
  }[name]||'')+'</svg>';
  home.innerHTML='<img class="hmArt" src="assets/home-map/home-title-pop.png" alt="" decoding="async"><img class="hmLogo" src="assets/home-map/cubepop-logo-mobile.png" alt="CUBEPOP"><p class="homeSub">굴리고 맞추는 큐브 매치 퍼즐</p><button class="hmButton hmStart" data-gold="true" onclick="goMap()"><span class="hmLabel">'+icon('play')+'게임 시작</span></button><button class="hmButton hmSettings" onclick="openSettings()"><span class="hmLabel">'+icon('settings')+'설정</span></button>';
  const back=document.querySelector('#mapScr .backBtn');
  back.innerHTML='<span class="hmLabel"><img class="hmIcon" src="assets/pastel-garden/icons/back.svg" alt=""></span>';
  back.setAttribute('aria-label','홈으로');back.classList.add('hmButton');back.dataset.square='true';
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
  const dims=()=>({w:window.innerWidth||375,h:window.innerHeight||812});
  function profile(){const {w,h}=dims();
    if(w<360||h<640)return [220,-26,250,130,174,256,52,422,128,44,492,568];
    if(w<600)return [280,-18,375,170,240,280,60,660,138,44,740,812];
    if(w<1024)return [360,-22,480,252,306,300,64,824,146,48,912,1024];
    const t=Math.max(0,Math.min(1,(h-720)/180));return [340+40*t,0,400+70*t,110+65*t,218+32*t,280+20*t,56+4*t,574+158*t,138+8*t,44,650+166*t,720+180*t];
  }
  const sizeCache=new WeakMap();
  function paintButton(button){
    const rect=button.getBoundingClientRect?.(),w=rect?.width||0,h=rect?.height||0;if(!w||!h)return;
    const square=button.dataset.square==='true',gold=!button.disabled&&(button.dataset.gold==='true'||button.classList.contains('on'));
    const key=[w,h,square,gold].join();if(sizeCache.get(button)===key)return;
    sizeCache.set(button,key);button.querySelector('.hmSurface')?.remove();button.insertAdjacentHTML('afterbegin',S.svg(w,h,square,gold));
    S.raster(w,h,square,gold)?.then(url=>{
      if(sizeCache.get(button)!==key||!button.isConnected)return;
      const img=document.createElement('img');img.className='hmSurface';img.alt='';img.setAttribute('aria-hidden','true');img.style.width=w+'px';img.style.height=(h+7)+'px';img.dataset.asset=S.plan(w,h,square,gold).id;img.dataset.rasterReady='true';img.src=url;
      button.querySelector('.hmSurface')?.replaceWith(img);
    }).catch(()=>{button.dataset.surfaceError='true';});
  }
  const resizeObserver=window.ResizeObserver?new window.ResizeObserver(entries=>entries.forEach(e=>paintButton(e.target))):null;
  function watch(button){resizeObserver?.observe(button);paintButton(button);}
  function layoutHome(){const {w,h}=dims(),p=profile(),s=home.style;
    const extra=Math.max(0,h-p[11])/2;
    const pairs={'logo-w':Math.min(w,p[0]),'logo-y':p[1]+extra,'art-w':Math.min(w,p[2]),'art-y':p[3]+extra,'sub-y':p[4]-16+extra,'start-w':Math.min(w-32,p[5]),'start-h':p[6],'start-y':p[7]+extra,'settings-w':p[8],'settings-h':p[9],'settings-y':p[10]+extra,'home-height':Math.max(h,p[11])};
    for(const [key,value] of Object.entries(pairs))s.setProperty('--hm-'+key,value+'px');
    home.querySelector('.hmLogo').src='assets/home-map/cubepop-logo-'+(w>=1024?'master':'mobile')+'.png';
    home.querySelectorAll('button').forEach(watch);watch(back);
  }
  function mapLayout(){const {w,h}=dims();let face,gap,W,edge;
    if(w<360){face=64;gap=160;W=w-32;edge=62;}
    else if(w<600){face=70;gap=168;W=w-32;edge=78;}
    else if(w<1024){face=78;gap=176;W=Math.min(480,w-32);edge=96;}
    else{face=h>=810?78:76;gap=h>=810?176:168;W=520;edge=104;}
    edge=Math.min(edge,W/2-28);const top=88+face/2+42;
    const points=[];for(let n=1;n<=TOTAL_STAGES;n++)points[n]={x:[edge,W/2,W-edge,W/2][(n-1)%4],y:top+(TOTAL_STAGES-n)*gap+[7,10,15].filter(b=>n<b).length*44};
    return {W,face,gap,points,height:points[1].y+face/2+13+22+88};
  }
  function render(keepScroll=false){
    const cv=$('mapCanvas'),sc=$('mapScroll'),oldPos=mapPos[avatarStage],relative=oldPos?oldPos.y-sc.scrollTop:null;
    const l=mapLayout(),cur=Math.max(1,Math.min(progress.unlocked,TOTAL_STAGES));
    cv.querySelectorAll('.hmButton').forEach(b=>resizeObserver?.unobserve(b));
    document.body.style.setProperty('--hm-map-w',l.W+'px');document.body.style.setProperty('--hm-node-size',l.face+'px');
    mapPos=l.points;avatarStage=cur;avatarRot=0;mapAnim=false;
    let paths='',mask='<rect width="100%" height="100%" fill="white"/>';
    for(let n=1;n<=TOTAL_STAGES;n++){
      const p=mapPos[n];mask+='<rect x="'+(p.x-54)+'" y="'+(p.y-l.face/2-43)+'" width="108" height="'+(l.face+83)+'" fill="black"/>';
      if(n<TOTAL_STAGES){const q=mapPos[n+1];paths+='<path d="M '+p.x+' '+p.y+' L '+q.x+' '+q.y+'" stroke="'+(n<cur?'#d1ac4d':'#c4aa86')+'"/>';}
    }
    let html='<svg class="hmPath" width="'+l.W+'" height="'+l.height+'" viewBox="0 0 '+l.W+' '+l.height+'" aria-hidden="true"><defs><mask id="hmPathMask">'+mask+'</mask></defs><g fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 18" mask="url(#hmPathMask)">'+paths+'</g></svg>';
    for(let n=1;n<=TOTAL_STAGES;n++){
      const p=mapPos[n],complete=Object.hasOwn(progress.stars,n),stars=Math.max(0,Math.min(3,progress.stars[n]||0)),un=n<=cur,current=n===cur;
      const state=!un?'locked':current?'next':complete?'complete':'open';
      html+='<button class="pnode hmButton '+(!un?'locked ':'')+(current?'cur':'')+'" data-n="'+n+'" data-state="'+state+'" data-complete="'+complete+'" data-square="true" data-gold="'+current+'" style="left:'+p.x+'px;top:'+p.y+'px" aria-label="스테이지 '+n+', '+(!un?'잠김':(complete?'완료, 별 '+stars+'개':'미완료'))+(current?', '+(complete&&n===50?'마지막 스테이지':'다음 도전'):'')+'" '+(!un?'disabled':'onclick="selectStage('+(n-1)+')"')+'>'+S.svg(l.face,l.face,true,current&&un)+'<span class="hmLabel">'+n+'</span><span class="hmStars" aria-hidden="true">'+[1,2,3].map(i=>'<img src="assets/pastel-garden/score-star-'+(i<=stars?'earned':'unearned')+'.png" alt="">').join('')+'</span>'+(!un?'<span class="hmBadge lock">'+icon('lock')+'</span>':complete?'<span class="hmBadge"><img src="assets/pastel-garden/icons/check.svg" alt=""></span>':'')+(current?'<span class="hmCurrentRing"></span>':'')+'</button>';
    }
    [[1,'배우기 · 3색'],[7,'4색 구간'],[10,'5색 구간'],[15,'6색 구간']].forEach(([n,t])=>{html+='<div class="bandLbl" style="top:'+(mapPos[n].y+l.face/2+45)+'px">'+t+'</div>';});
    cv.style.height=l.height+'px';cv.innerHTML=html;
    // Layout dimensions are known even when goMap renders before its screen is visible.
    requestAnimationFrame(()=>cv.querySelectorAll('.hmButton').forEach(watch));
    avatarEl=document.createElement('div');avatarEl.className='avatarCube idle';avatarEl.setAttribute('aria-hidden','true');
    avatarEl.innerHTML=avatarCubeHTML()+'<span class="hmAvatarText">'+(cur===50&&Object.hasOwn(progress.stars,50)?'마지막 단계':'다음 도전')+'</span>';
    avMat=typeof DOMMatrix==='function'?new DOMMatrix():null;placeAvatar(cur);cv.appendChild(avatarEl);
    requestAnimationFrame(()=>{sc.scrollTop=Math.max(0,mapPos[cur].y-(keepScroll&&relative!==null?relative:sc.clientHeight*.43));updateMapFades();watch(back);});
    if(!sc._fadeBound){sc._fadeBound=true;sc.addEventListener('scroll',updateMapFades);}
    return l;
  }
  window.HomeMap={render,mapLayout,layoutHome,avatarOffset:()=>mapLayout().face/2+30,paintButton};
  const originalMode=setMode;setMode=function(mode){if(modal.dataset.homeMap&&mode==='mPlay')closeSettings();originalMode(mode);if(mode==='mHome')layoutHome();};
  const originalSelect=selectStage;selectStage=function(idx){
    if(mapAnim||!Number.isInteger(idx)||idx<0||idx>=Math.min(progress.unlocked,TOTAL_STAGES))return;
    if(reduced()){startStage(idx);return;}
    const same=idx+1===avatarStage;originalSelect(idx);if(same)mapAnim=true;
  };
  const originalEnter=enterFx;enterFx=function(target,done){mapAnim=true;originalEnter(target,done);};
  const originalHome=goHome;goHome=function(){if(!mapAnim)originalHome();};
  let press=null;
  const sc=$('mapScroll');
  sc.addEventListener('pointerdown',e=>{press={id:e.pointerId,x:e.clientX,y:e.clientY,scroll:sc.scrollTop,moved:false};},{passive:true});
  sc.addEventListener('pointermove',e=>{if(press&&press.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)press.moved=true;},{passive:true});
  sc.addEventListener('pointercancel',()=>{if(press)press.moved=true;});
  sc.addEventListener('click',e=>{if(press&&(press.moved||Math.abs(sc.scrollTop-press.scroll)>8)){e.preventDefault();e.stopImmediatePropagation();}press=null;},true);
  sc.addEventListener('keydown',e=>{const node=e.target.closest('.pnode');if(!node)return;const dir=e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0;if(!dir)return;e.preventDefault();cvNode(Number(node.dataset.n)+dir)?.focus();});
  function cvNode(n){return $('mapCanvas').querySelector('.pnode[data-n="'+n+'"]:not(:disabled)');}
  let returnFocus=null;
  function modalSurfaces(){modal.querySelectorAll('button').forEach(button=>{
    if(!button.querySelector('.hmLabel')){const span=document.createElement('span');span.className='hmLabel';while(button.firstChild)span.appendChild(button.firstChild);button.appendChild(span);}
    button.classList.add('hmButton');if(button.classList.contains('close')){button.dataset.square='true';button.setAttribute('aria-label','설정 닫기');}watch(button);
  });}
  const originalOpen=openSettings,originalClose=closeSettings;
  openSettings=function(){originalOpen();if(!document.body.classList.contains('mPlay')){
    returnFocus=document.activeElement;modal.dataset.homeMap='true';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','도움말 및 설정');
    document.querySelectorAll('.screen,.app').forEach(e=>e.inert=true);modalSurfaces();modal.querySelector('.close').focus();
  }};
  closeSettings=function(){const was=modal.dataset.homeMap;originalClose();if(was){delete modal.dataset.homeMap;modal.removeAttribute('aria-modal');document.querySelectorAll('.screen,.app').forEach(e=>e.inert=false);returnFocus?.focus();returnFocus=null;}};
  modal.addEventListener('keydown',e=>{if(!modal.dataset.homeMap||e.key!=='Tab')return;const items=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled)')],first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  if(window.MutationObserver)new window.MutationObserver(()=>{if(modal.dataset.homeMap)modal.querySelectorAll('button').forEach(paintButton);}).observe(modal,{attributes:true,subtree:true,attributeFilter:['class','disabled']});
  window.addEventListener('resize',()=>{layoutHome();if(document.body.classList.contains('mMap')&&!mapAnim)render(true);});
  layoutHome();
})();
