/* Presentation only: thresholds and cfgPar fallback remain in updateStarGauge. */
(function(root){
  let initialized=false,target=null,displayed=0,frame=0,earned=[false,false,false];
  const $=id=>document.getElementById(id);
  const reduced=()=>root.__SIM||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function stopNumber(){if(frame)root.cancelAnimationFrame(frame);frame=0;}
  function reset(){
    stopNumber();initialized=false;target=null;
    for(let i=1;i<=3;i++){
      const img=$('gPin'+i).querySelector('img');
      img.getAnimations?.().forEach(a=>a.cancel());delete img.dataset.bursts;
    }
  }
  function renderScore(score,par,states){
    const immediate=!initialized||reduced()||!root.requestAnimationFrame,value=$('scoreV'),fill=$('gFill');
    const write=n=>{displayed=n;value.textContent=Math.round(n).toLocaleString('en-US');};
    value.dataset.digits=String(Math.trunc(score)).length;
    if(score!==target){
      stopNumber();target=score;
      if(immediate)write(score);
      else{
        const from=displayed,start=root.performance.now();
        const tick=now=>{const t=Math.min(1,(now-start)/180);write(from+(score-from)*(1-(1-t)**3));if(t<1)frame=root.requestAnimationFrame(tick);else frame=0;};
        frame=root.requestAnimationFrame(tick);
      }
    }
    // A loaded state lands immediately; only subsequent changes interpolate.
    if(immediate)fill.style.transition='none';
    fill.style.width=Math.max(0,Math.min(100,score/par*100))+'%';
    if(immediate){fill.getBoundingClientRect?.();fill.style.transition='';}
    let stagger=0;
    states.forEach((on,i)=>{
      const pin=$('gPin'+(i+1)),img=pin.querySelector('img');
      pin.classList.toggle('on',on);pin.setAttribute('aria-label','별 '+(i+1)+(on?' 획득':' 미획득'));
      const src='assets/pastel-garden/score-star-'+(on?'earned':'unearned')+'.png';
      if(img.getAttribute('src')!==src)img.setAttribute('src',src);
      if(initialized&&on&&!earned[i]&&!reduced()){
        img.getAnimations?.().forEach(a=>a.cancel());
        img.animate?.([{transform:'scale(1)'},{transform:'scale(1.14)',offset:.45},{transform:'scale(1)'}],{duration:320,delay:stagger++*80,easing:'ease-out'});
        img.dataset.bursts=String(Number(img.dataset.bursts||0)+1);
      }
    });
    earned=states.slice();initialized=true;
    const accessible='점수 '+score.toLocaleString('ko-KR')+' / '+par.toLocaleString('ko-KR')+', 별 '+states.filter(Boolean).length+'개';
    if($('gScore').textContent!==accessible)$('gScore').textContent=accessible;
  }
  function landscapeLayout(width,height,hudHeight=64){
    const extra=Math.max(0,hudHeight-64),contentHeight=Math.max(height,720+extra);
    const boardSize=Math.min(704,contentHeight-320-extra,width-48);
    return {boardSize,boardY:128+extra,contentHeight,scoreWidth:Math.min(384,Math.max(280,boardSize*.68)),controlsWidth:Math.max(288,boardSize*.82)};
  }
  root.PastelGarden={reset,renderScore,landscapeLayout};
})(window);
