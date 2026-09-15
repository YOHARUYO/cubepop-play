/* Presentation adapter: consumes HUD/result values, never changes game decisions. */
(function(root){
  'use strict';
  if(root.__SIM)return;
  const $=id=>document.getElementById(id),app=document.querySelector('.app');
  const overlay=$('overlay'),layer=document.createElement('div');
  layer.className='coreResultLayer';layer.hidden=true;document.body.append(layer);layer.append(overlay);
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','ovTitle');overlay.setAttribute('aria-describedby','ovSub');overlay.tabIndex=-1;
  const heading=app.querySelector('h1');
  heading.setAttribute('aria-label','CUBEPOP');
  heading.innerHTML='<svg class="cpLogo" viewBox="175 81 1178 854" aria-hidden="true"><image href="assets/home-map/cubepop-logo-master.png" width="1536" height="1024"/></svg>';
  let previousFocus=null,inertState=[],active=false,pending=0;
  const buttonSizes=new WeakMap();
  function paintButtons(){
    for(const button of document.querySelectorAll('.app .controls button,.app .topBack,#skipBtn,.tutorialActions button:not(#exitLesson),#ovBtns button')){
      if(!button.offsetWidth||!button.offsetHeight)continue;
      button.classList.add('cpButton');
      if(!button.querySelector('.cpLabel')){
        const label=document.createElement('span');label.className='cpLabel';
        while(button.firstChild)label.append(button.firstChild);button.append(label);
      }
      const w=button.offsetWidth,h=button.offsetHeight,square=button.classList.contains('topBack'),gold=button.classList.contains('primary');
      const key=[w,h,square,gold,root.devicePixelRatio].join(':');
      if(buttonSizes.get(button)===key)continue;
      buttonSizes.set(button,key);button.querySelector('.cpSurface')?.remove();
      button.insertAdjacentHTML('afterbegin',root.HomeMapSurfaces.svg(w,h,square,gold).replace('hmSurface','cpSurface'));
      root.HomeMapSurfaces.raster(w,h,square,gold)?.then(src=>{
        if(buttonSizes.get(button)!==key||!button.isConnected)return;
        const img=new Image();img.src=src;img.alt='';img.className='cpSurface';img.width=w;img.height=h+7;
        button.querySelector('.cpSurface')?.replaceWith(img);
      }).catch(()=>{}); // The original-PNG SVG remains a valid fallback.
    }
  }
  function layoutGoals(){
    const row=$('goals'),items=[...row.children];if(!row.clientWidth||!items.length)return;
    const compact=root.innerWidth<=340,icon=compact?16:20;
    document.querySelector('.goalsCard').dataset.compact=String(compact);
    const measure=Math.max(...items.map(el=>el.querySelector('.goalMeasure').getBoundingClientRect().width));
    const min=Math.max(compact?64:72,measure+icon+(compact?16:20));
    let columns=3;while(columns>1&&(row.clientWidth-8*(columns-1))/columns<min)columns--;
    row.style.gridTemplateColumns=`repeat(${columns},minmax(0,1fr))`;row.dataset.checkBelow='false';
  }
  function positionResult(){
    if(layer.hidden)return;
    const board=$('board').getBoundingClientRect(),height=overlay.offsetHeight;
    const y=Math.max(16,Math.min(root.innerHeight-height-16,board.y+board.height/2-height/2));
    overlay.style.top=(y-(root.innerHeight-height)/2)+'px';
  }
  function fit(){
    if(!document.body.classList.contains('mPlay'))return true;
    const vw=document.documentElement.clientWidth,wide=vw>=768;
    // Mobile preserves readable cubes and scrolls; wide layouts use the spare height.
    const width=Math.min(704,vw-(vw<=340?8:16));
    const size=wide?Math.min(width,Math.max(280,root.innerHeight-340)):width;
    app.style.maxWidth=Math.max(size,wide?460:0)+'px';
    $('board').style.zoom=size/704;layoutGoals();
    // Large real scores can wrap without shrinking the font or touching the stars.
    const scoreHeight=Math.max(30,$('scoreV').offsetHeight);
    document.querySelector('.scorePanel').style.height=(100+scoreHeight-30)+'px';
    document.querySelector('.scorePanel').style.flexBasis=(100+scoreHeight-30)+'px';
    paintButtons();positionResult();root.TutorialUI?.refresh();return true;
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;fit();});}
  function close(){
    if(!active)return;active=false;layer.hidden=true;
    for(const [el,value] of inertState)el.inert=value;inertState=[];
    if(previousFocus?.isConnected&&!previousFocus.closest('[inert]'))previousFocus.focus({preventScroll:true});
    previousFocus=null;
  }
  function syncResult(){
    const shown=overlay.classList.contains('show')&&document.body.classList.contains('mPlay');
    if(!shown){close();return;}
    layer.hidden=false;paintButtons();positionResult();
    if(active)return;active=true;previousFocus=document.activeElement;
    inertState=[...document.body.children].filter(el=>el!==layer&&el.tagName!=='SCRIPT'&&el.tagName!=='STYLE').map(el=>[el,el.inert]);
    for(const [el] of inertState)el.inert=true;
    (overlay.querySelector('button:not(:disabled)')||overlay).focus({preventScroll:true});
  }
  function result(kind,remaining){
    overlay.dataset.kind=kind;
    for(const button of $('ovBtns').querySelectorAll('button')){
      const action=button.getAttribute('onclick')||'',name=action.includes('restartStage')?'retry':action.includes('exitToMap')?'back':null;
      if(name&&!button.querySelector('img'))button.insertAdjacentHTML('afterbegin','<img src="assets/pastel-garden/icons/'+name+'.svg" alt=""> ');
    }
    if(kind==='fail'){
      $('ovTitle').textContent='횟수 소진!';$('ovTitle').style.color='#A8424F';
      $('ovSub').textContent='목표까지 조금 남았어요';
      const list=document.createElement('div');list.className='cpRemaining';list.setAttribute('aria-label','남은 수집 목표');
      for(const goal of remaining||[]){
        const item=document.createElement('div');item.className='cpRemainingItem';
        const chip=document.createElement('span');chip.className='gchip';
        const dot=document.createElement('span');dot.className='dot';dot.dataset.shape=goal.shape;dot.style.background=goal.hex;dot.setAttribute('aria-hidden','true');chip.append(dot);
        const text=document.createElement('span');text.textContent=goal.remaining+'개 남음';
        const name=['빨간 원','노란 삼각형','초록 사각형','하늘색 별','보라 마름모','주황 하트'][goal.shape]||'큐브';
        item.setAttribute('aria-label',name+' '+goal.remaining+'개 남음');
        item.append(chip,text);list.append(item);
      }
      $('ovSub').append(list);
    }
    syncResult();
  }
  layer.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const buttons=[...overlay.querySelectorAll('button:not(:disabled)')],first=buttons[0]||overlay,last=buttons.at(-1)||overlay;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  document.addEventListener('focusin',event=>{if(active&&!layer.contains(event.target))(overlay.querySelector('button')||overlay).focus({preventScroll:true});});
  new MutationObserver(syncResult).observe(overlay,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{syncResult();schedule();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe($('goals'),{childList:true,subtree:true,characterData:true});
  new MutationObserver(schedule).observe($('scoreV'),{childList:true,characterData:true,subtree:true});
  new ResizeObserver(schedule).observe(app);
  root.addEventListener('scroll',positionResult,{passive:true});
  root.PastelGarden.layoutGoals=layoutGoals;
  root.CorePlay={fit,result,close,paintButtons};
  document.fonts.ready.then(schedule);schedule();
})(window);
