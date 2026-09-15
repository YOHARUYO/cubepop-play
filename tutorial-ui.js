/* Viewport UI only: lesson rules and the single cube renderer remain authoritative. */
(function(root){
  'use strict';
  const overlay=document.getElementById('tutorialOverlay'),card=document.getElementById('playGuide');
  const G=root.InteractionLayout;
  const actionsElement=document.querySelector('.tutorialActions');
  card.prepend($('exitLesson'));card.append(actionsElement);
  const guideContent=document.createElement('div');guideContent.id='guideContent';
  const facePreview=$('rollPreview'),previewParent=facePreview.parentNode;let previewCopy='';
  for(const el of [...card.children])if(!['exitLesson','guideCount'].includes(el.id))guideContent.append(el);card.append(guideContent);
  guideContent.setAttribute('aria-label','튜토리얼 설명');
  let handPixels=[];
  if(!root.__SIM){const img=$('tutorialHand');const ready=()=>{const c=document.createElement('canvas');c.width=c.height=40;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,40,40);const data=ctx.getImageData(0,0,40,40).data;for(let y=0;y<40;y++)for(let x=0;x<40;x++)if(data[(y*40+x)*4+3]>16)handPixels.push({x:x+.5,y:y+.5});refresh();};if(img.complete&&img.naturalWidth)Promise.resolve().then(ready);else img.addEventListener('load',ready,{once:true});}
  let observing=false,observer=null,raf=0,completed=null,lastLesson=null;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const box=(x,y,width,height)=>({x,y,width,height,right:x+width,bottom:y+height});
  const overlaps=(a,b,gap=0)=>a.x<b.right+gap&&a.right>b.x-gap&&a.y<b.bottom+gap&&a.bottom>b.y-gap;
  function cubeProjection(cube,board){
    const frame=root.CubePopFrame,world=frame.world(cube.c*72,cube.r*72),points=[],top=[];
    for(const dx of [-.5,.5])for(const dz of [-.5,.5])for(const y of [0,1]){
      const p=frame.project(world.x+dx,y,world.z+dz),q={x:board.x+p.x*board.width/frame.size,y:board.y+p.y*board.height/frame.size};points.push(q);if(y===1)top.push(q);
    }
    return {silhouette:G.hull(points),top:G.hull(top),bounds:G.union(points.map(p=>box(p.x,p.y,0,0)))};
  }
  function cubeBounds(cube,board){return cubeProjection(cube,board).bounds;}
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
      if(!actionWidth)return {...b,tail,cx,cy,actions:box(b.right-84,b.y+4,72,44)};
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
    $('tutorialHand').hidden=true;$('tutorialArrow').hidden=true;$('tutorialDirection').hidden=true;$('tutorialHandLink').hidden=true;
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
    const dir=lessonState?.definition.direction,words={E:'오른쪽으로',W:'왼쪽으로',N:'위로',S:'아래로'};
    if(!observingEffect&&lessonState?.phase==='roll'&&!armedWild)$('guideText').textContent=stageNo===0
      ? '큐브를 누르고 있으면 실제 옆면 배치가 보여요. 왼쪽 면을 위로 올리려면 오른쪽으로 굴려 세 색을 맞춰요.'
      : '손끝이 가리키는 큐브를 '+words[dir]+' 굴려요. 밝은 큐브의 윗면 색을 맞춰요.';
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
    const cubes=observingEffect?[]:targets(),projections=cubes.map(c=>cubeProjection(c,board)),rects=projections.map(p=>p.bounds);
    const pointsAttr=ps=>ps.map(p=>p.x+','+p.y).join(' ');
    $('tutorialHoles').innerHTML=observingEffect?`<rect x="${board.x}" y="${board.y}" width="${board.width}" height="${board.height}" fill="black"/>`:projections.map(p=>`<polygon points="${pointsAttr(p.silhouette)}" fill="black"/>`).join('');
    $('tutorialTargets').innerHTML=projections.length?['#243E61','#FFDB76'].map((color,i)=>`<polygon points="${pointsAttr(projections[0].top)}" fill="none" stroke="${color}" stroke-width="${i?2.3:4}" stroke-linejoin="round"/>`).join(''):'';
    const phase=overlay.dataset.phase,hand=$('tutorialHand'),arrow=$('tutorialArrow'),direction=$('tutorialDirection');
    const showDirection=!observingEffect&&phase==='roll'&&rects.length&&!facePreview.classList.contains('lessonFacePreview');
    direction.hidden=!showDirection;arrow.hidden=!showDirection;
    const angle=({E:0,S:90,W:180,N:270})[lessonState?.definition.direction]||0;
    direction.dataset.vertical=String(angle===90||angle===270);arrow.style.transform=`rotate(${angle}deg)`;
    $('directionText').textContent=({E:'오른쪽으로 굴리기',W:'왼쪽으로 굴리기',N:'위로 굴리기',S:'아래로 굴리기'})[lessonState?.definition.direction]||'';
    // Exit and cancel live inside the measured card, with their own 44px hit areas.
    card.style.maxHeight='';card.dataset.docked='false';guideContent.removeAttribute('tabindex');
    const cardBounds=card.getBoundingClientRect();
    let b=placeTutorial(observingEffect?[board]:rects,cardBounds.width,cardBounds.height,viewport,0,0,rects[0],observingEffect);
    if(b.fallback){
      const reservations=observingEffect?[board]:rects;
      const above=Math.min(...reservations.map(r=>r.y))-viewport.y-40,below=viewport.bottom-Math.max(...reservations.map(r=>r.bottom))-40;
      const available=Math.max(above,below);
      if(available>=90){card.dataset.docked='true';card.style.maxHeight=available+'px';guideContent.tabIndex=0;const compact=card.getBoundingClientRect();b=placeTutorial(reservations,compact.width,compact.height,viewport,0,0,rects[0],observingEffect);b.tail='none';}
    }
    overlay.dataset.placementFallback=String(!!b.fallback);
    card.style.left=b.x+'px';card.style.top=b.y+'px';card.dataset.tail=observingEffect?'none':b.tail;
    const focus=rects[0],cx=focus?focus.x+focus.width/2:b.cx,cy=focus?focus.y+focus.height/2:b.cy;
    card.style.setProperty('--tail-x',clamp(cx-b.x,22,b.width-22)+'px');card.style.setProperty('--tail-y',clamp(cy-b.y,22,b.height-22)+'px');
    hand.hidden=true;$('tutorialHandLink').hidden=true;
    let cue=null;
    if(rects.length&&!observingEffect&&['roll','tap','pick'].includes(phase)&&handPixels.length){
      const top=projections[0].top,center={x:top.reduce((s,p)=>s+p.x,0)/4,y:top.reduce((s,p)=>s+p.y,0)/4};
      const edges=top.map(p=>({x:p.x+(center.x-p.x)*.03,y:p.y+(center.y-p.y)*.03})).sort((a,b)=>(b.x+b.y)-(a.x+a.y));
      const glyphs=projections.map(p=>{const r=G.union(p.top.map(q=>box(q.x,q.y,0,0)));return box(r.x+r.width*.23,r.y+r.height*.23,r.width*.54,r.height*.54);});
      const tailBox=b.tail==='bottom'?box(b.x+clamp(cx-b.x,22,b.width-22)-10,b.bottom,20,11):b.tail==='top'?box(b.x+clamp(cx-b.x,22,b.width-22)-10,b.y-11,20,11):b.tail==='left'?box(b.x-11,b.y,11,b.height):b.tail==='right'?box(b.right,b.y,11,b.height):box(0,0,0,0);
      cue=G.chooseHand(edges,handPixels,[...glyphs,b,tailBox],viewport);
      if(cue){hand.hidden=false;hand.style.left=(cue.anchor.x-17.25)+'px';hand.style.top=(cue.anchor.y-6)+'px';hand.style.transform=`rotate(${cue.angle}deg)`;
        if(cue.line){const link=$('tutorialHandLink');link.hidden=false;link.setAttribute('viewBox',`0 0 ${root.innerWidth} ${root.innerHeight}`);link.querySelector('path').setAttribute('d',`M${cue.anchor.x} ${cue.anchor.y}L${cue.line.x} ${cue.line.y}`);}
      }
    }
    overlay.dataset.cueMissing=String(!!rects.length&&!observingEffect&&!cue);
    overlay.dataset.handTarget=cubes[0]?cubes[0].r+','+cubes[0].c:'';
    overlay.dataset.handAnchor=cue?JSON.stringify(cue.anchor):'';
  }

  function refresh(){if(!overlay.hidden&&!raf&&!root.__SIM&&root.requestAnimationFrame)raf=root.requestAnimationFrame(layout);}
  $('exitLesson').addEventListener('click',()=>{if(busy)return;cancelBoardPointers();unarmWild();clear();goMap();});
  function showFacePreview(){
    previewCopy=$('guideText').textContent;$('guideText').textContent='가운데는 현재 윗면, 주변은 실제 옆면이에요.';
    facePreview.classList.add('lessonFacePreview');guideContent.insertBefore(facePreview,$('guideText'));
    refresh();
  }
  function hideFacePreview(){
    if(!facePreview.classList.contains('lessonFacePreview'))return;
    facePreview.classList.remove('lessonFacePreview');previewParent.appendChild(facePreview);
    if(lessonState?.phase==='roll'&&!busy)$('guideText').textContent=previewCopy;
    refresh();
  }
  root.TutorialUI={sync,refresh,clear,cubeBounds,placeBubble,placeTutorial,focusCells:targets,cubeProjection,showFacePreview,hideFacePreview};
})(window);
