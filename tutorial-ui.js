/* Viewport UI only: lesson rules and the single cube renderer remain authoritative. */
(function(root){
  'use strict';
  const overlay=document.getElementById('tutorialOverlay'),card=document.getElementById('playGuide');
  let observing=false,observer=null,raf=0,completed=null,lastLesson=null;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const box=(x,y,width,height)=>({x,y,width,height,right:x+width,bottom:y+height});
  const overlaps=(a,b,gap=0)=>a.x<b.right+gap&&a.right>b.x-gap&&a.y<b.bottom+gap&&a.bottom>b.y-gap;
  function cubeBounds(cube,board){
    const frame=root.CubePopFrame,world=frame.world(cube.c*72,cube.r*72),points=[];
    // Eight corners of the same unit cube and camera, converted once to CSS px.
    for(const dx of [-.5,.5])for(const dz of [-.5,.5])for(const y of [0,1]){
      const p=frame.project(world.x+dx,y,world.z+dz);
      points.push({x:board.x+p.x*board.width/frame.size,y:board.y+p.y*board.height/frame.size});
    }
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
    return box(x,y,Math.max(...points.map(p=>p.x))-x,Math.max(...points.map(p=>p.y))-y);
  }
  function placeBubble(targets,width,height,viewport,exit){
    const minX=viewport.x+12,maxX=viewport.right-width-12,minY=viewport.y+12,maxY=viewport.bottom-height-12;
    const t=targets.length?box(Math.min(...targets.map(t=>t.x)),Math.min(...targets.map(t=>t.y)),0,0):box(viewport.width/2,viewport.height/2,0,0);
    t.right=targets.length?Math.max(...targets.map(t=>t.right)):t.x;t.bottom=targets.length?Math.max(...targets.map(t=>t.bottom)):t.y;
    const cx=(t.x+t.right)/2,cy=(t.y+t.bottom)/2;
    const candidates=[['bottom',cx-width/2,t.y-height-20],['top',cx-width/2,t.bottom+48],['right',t.x-width-20,cy-height/2],['left',t.right+20,cy-height/2]];
    for(const [tail,x,y] of candidates){
      const b=box(clamp(x,minX,maxX),clamp(y,minY,maxY),width,height);
      if(!targets.some(t=>overlaps(b,t,18))&&!overlaps(b,exit,10))return {...b,tail,cx,cy};
    }
    // On unusually short/zoomed viewports scan free rows before the top fallback.
    for(let y=Math.max(minY,exit.bottom+12);y<=maxY;y+=8){
      const b=box(clamp(cx-width/2,minX,maxX),y,width,height);
      if(!targets.some(t=>overlaps(b,t,18)))return {...b,tail:'none',cx,cy};
    }
    return {...box(minX,Math.max(minY,exit.bottom+12),width,height),tail:'none',cx,cy};
  }
  function placeTutorial(targets,width,height,viewport,actionWidth,actionHeight,focus,observe=false){
    const left=viewport.x+12,right=viewport.right-12,top=viewport.y+12,bottom=viewport.bottom-12;
    const t=targets.length?{x:Math.min(...targets.map(r=>r.x)),y:Math.min(...targets.map(r=>r.y)),right:Math.max(...targets.map(r=>r.right)),bottom:Math.max(...targets.map(r=>r.bottom))}:box(viewport.x+viewport.width/2,viewport.y+viewport.height/2,0,0);
    const cx=focus?focus.x+focus.width/2:(t.x+t.right)/2,cy=focus?focus.y+focus.height/2:(t.y+t.bottom)/2;
    const vertical=[['bottom',cx-width/2,t.y-height-28],['top',cx-width/2,t.bottom+28]];
    const sides=[['left',t.right+28,cy-height/2],['right',t.x-width-28,cy-height/2]];
    const candidates=observe&&viewport.width>=720?[...sides,...vertical]:[...vertical,...sides];
    const inside=r=>r.x>=left-.1&&r.y>=top-.1&&r.right<=right+.1&&r.bottom<=bottom+.1;
    const free=(r,gap=18)=>!targets.some(t=>overlaps(r,t,gap));
    function attempt(tail,x,y){
      const b=box(clamp(x,left,right-width),clamp(y,top,bottom-height),width,height);
      if(!inside(b)||!free(b))return null;
      if(observe)tail='none';
      const tx=clamp(cx-b.x,22,width-22),ty=clamp(cy-b.y,22,height-22);
      const tip=tail==='bottom'?box(b.x+tx-9,b.bottom-1,18,10):tail==='top'?box(b.x+tx-9,b.y-9,18,10):tail==='left'?box(b.x-9,b.y+ty-9,10,18):tail==='right'?box(b.right-1,b.y+ty-9,10,18):null;
      if(tip&&(!inside(tip)||!free(tip)))return null;
      const choices=[[b.right-actionWidth,b.y-actionHeight-12],[b.right+12,b.y],[b.right-actionWidth,b.bottom+12],[b.x-actionWidth-12,b.y]];
      for(const [ax,ay] of choices){const actions=box(ax,ay,actionWidth,actionHeight);
        if(inside(actions)&&free(actions)&&!overlaps(actions,b,11.9)&&(!tip||!overlaps(actions,tip,12)))return {...b,tail,cx,cy,actions};
      }
      return null;
    }
    for(const [tail,x,y] of candidates){const found=attempt(tail,x,y);if(found)return found;}
    // Search remaining viewport space without shrinking readable type or targets.
    for(let y=top;y<=bottom-height;y+=12)for(const x of [clamp(cx-width/2,left,right-width),left,right-width]){
      const found=attempt('none',x,y);if(found)return found;
    }
    const actions=box(right-actionWidth,top,actionWidth,actionHeight);
    return {...placeBubble(targets,width,height,viewport,actions),actions,fallback:true};
  }
  function stopWatching(){
    if(!observing)return;observing=false;
    root.removeEventListener('resize',refresh);root.removeEventListener('orientationchange',refresh);root.removeEventListener('scroll',refresh);
    root.visualViewport?.removeEventListener('resize',refresh);root.visualViewport?.removeEventListener('scroll',refresh);
    observer?.disconnect();observer=null;
  }
  function clear(){
    overlay.hidden=true;stopWatching();
    if(raf){root.cancelAnimationFrame(raf);raf=0;}
    $('tutorialHoles').innerHTML='';$('tutorialTargets').innerHTML='';
    $('tutorialHand').hidden=true;$('tutorialArrow').hidden=true;
  }
  function watch(){
    if(observing||root.__SIM)return;observing=true;
    root.addEventListener('resize',refresh);root.addEventListener('orientationchange',refresh);root.addEventListener('scroll',refresh,{passive:true});
    root.visualViewport?.addEventListener('resize',refresh);root.visualViewport?.addEventListener('scroll',refresh);
    if(root.ResizeObserver){observer=new root.ResizeObserver(refresh);observer.observe($('board'));observer.observe(card);}
  }
  function sync(){
    if(lessonState!==lastLesson){completed=null;lastLesson=lessonState;}
    if(lessonState?.complete&&!busy){completed=lessonState;clear();return;}
    const active=document.body.classList.contains('mPlay')&&(armedWild||(lessonState&&(lessonState!==completed||busy)));
    if(!active){clear();return;}
    overlay.hidden=false;overlay.dataset.phase=armedWild?'pick':lessonState.phase;
    const observingEffect=!!lessonState&&(busy||lessonState.phase==='resolving');
    overlay.dataset.observing=String(observingEffect);
    if(observingEffect){
      $('guideTitle').textContent='변화를 살펴보세요';
      $('guideText').textContent=lessonState.complete?'폭탄과 낙하 효과를 살펴보세요.':'제자리 회전과 매치를 살펴보세요.';
    }
    $('exitLesson').hidden=!lessonState;$('exitLesson').disabled=busy;
    $('cancelPick').hidden=!armedWild;
    hideRollPreview();watch();refresh();
  }
  function targets(){
    if(armedWild)return lessonState?[...pickableCells].map(key=>entityAt(key)).filter(Boolean):grid.flat().filter(c=>c?.el.classList.contains('pickable'));
    if(!lessonState)return [];
    const {phase,definition,bomb}=lessonState;
    if(phase==='tap')return bomb?[bomb]:[];
    if(phase!=='roll')return [];
    const [r,c]=definition.target;
    // Authored match members, not a neighboring destination: cubes never swap.
    return [[r,c],...definition.cells.filter(([row,col])=>row!==r||col!==c)]
      .map(([row,col])=>grid[row]?.[col]).filter(Boolean);
  }
  function layout(){
    raf=0;if(overlay.hidden)return;
    const vv=root.visualViewport,x=vv?.offsetLeft||0,y=vv?.offsetTop||0;
    const width=Math.min(vv?.width||root.innerWidth,document.documentElement.clientWidth||root.innerWidth),height=Math.min(vv?.height||root.innerHeight,root.innerHeight);
    const viewport=box(x,y,width,height),board=$('board').getBoundingClientRect();
    overlay.style.setProperty('--view-left',x+'px');overlay.style.setProperty('--view-top',y+'px');overlay.style.setProperty('--view-right',Math.max(0,root.innerWidth-viewport.right)+'px');
    const svg=$('tutorialDim');svg.setAttribute('viewBox',`0 0 ${root.innerWidth} ${root.innerHeight}`);
    for(const id of ['tutorialMaskBase','tutorialShade']){$(id).setAttribute('width',root.innerWidth);$(id).setAttribute('height',root.innerHeight);}
    const observingEffect=overlay.dataset.observing==='true';
    const rects=observingEffect?[]:targets().map(c=>cubeBounds(c,board));
    const padded=rects.map(r=>box(r.x-5,r.y-5,r.width+10,r.height+10));
    const rectMarkup=(r,attrs)=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="7" ${attrs}/>`;
    // Keep the whole real board visible during rotations, explosions and falls.
    $('tutorialHoles').innerHTML=(observingEffect?[board]:padded).map(r=>rectMarkup(r,'fill="black"')).join('');
    $('tutorialTargets').innerHTML=padded.map((r,i)=>rectMarkup(r,`fill="none" stroke="${i===0&&overlay.dataset.phase==='roll'?'#ffe19a':'#fff9ef'}" stroke-width="${i===0&&overlay.dataset.phase==='roll'?3:1.5}"`)).join('');
    const actionsElement=document.querySelector('.tutorialActions'),actions=actionsElement.getBoundingClientRect();
    let cue=null;
    if(rects.length){
      const t=rects[0],candidates=[[t.right-18,t.bottom+16],[t.right+14,t.y+t.height/2],[t.x-50,t.y+t.height/2],[t.right+14,t.bottom+14]];
      const choices=candidates.map(([cx,cy])=>box(clamp(cx,x+12,viewport.right-48),clamp(cy,y+12,viewport.bottom-48),36,36));
      cue=choices.find(b=>!padded.some(r=>overlaps(b,r,3)))||choices[0];
    }
    const cardBounds=card.getBoundingClientRect();
    const b=placeTutorial(observingEffect?[board]:cue?[...padded,cue]:padded,cardBounds.width,cardBounds.height,viewport,actions.width,actions.height,rects[0],observingEffect);
    actionsElement.style.left=b.actions.x+'px';actionsElement.style.top=b.actions.y+'px';
    overlay.dataset.placementFallback=String(!!b.fallback);
    card.style.left=b.x+'px';card.style.top=b.y+'px';card.dataset.tail=observingEffect?'none':b.tail;
    const focus=rects[0],cx=focus?focus.x+focus.width/2:b.cx,cy=focus?focus.y+focus.height/2:b.cy;
    card.style.setProperty('--tail-x',clamp(cx-b.x,22,b.width-22)+'px');card.style.setProperty('--tail-y',clamp(cy-b.y,22,b.height-22)+'px');
    const hand=$('tutorialHand'),arrow=$('tutorialArrow'),phase=overlay.dataset.phase;
    hand.hidden=!rects.length||!['roll','tap','pick'].includes(phase);arrow.hidden=phase!=='roll'||!rects.length;
    if(rects.length){
      const t=rects[0];hand.style.left=cue.x+'px';hand.style.top=cue.y+'px';
      const angle=({E:0,S:90,W:180,N:270})[lessonState?.definition.direction]||0;
      const vertical=angle===90||angle===270;
      const arrowWidth=Math.min(42,(vertical?t.height:t.width)*.88),arrowHeight=arrowWidth*40/112;
      const halfX=(vertical?arrowHeight:arrowWidth)/2,halfY=(vertical?arrowWidth:arrowHeight)/2;
      const ax=clamp(vertical?t.right-3:t.x+t.width/2,x+12+halfX,viewport.right-12-halfX);
      const ay=clamp(vertical?t.y+t.height/2:t.bottom-3,y+12+halfY,viewport.bottom-12-halfY);
      arrow.style.width=arrowWidth+'px';arrow.style.height=arrowHeight+'px';
      arrow.style.left=ax-arrowWidth/2+'px';arrow.style.top=ay-arrowHeight/2+'px';arrow.style.transform=`rotate(${angle}deg)`;
    }
  }
  function refresh(){if(!overlay.hidden&&!raf&&!root.__SIM&&root.requestAnimationFrame)raf=root.requestAnimationFrame(layout);}
  $('exitLesson').addEventListener('click',()=>{if(busy)return;cancelBoardPointers();unarmWild();clear();goMap();});
  root.TutorialUI={sync,refresh,clear,cubeBounds,placeBubble,placeTutorial,focusCells:targets};
})(window);
