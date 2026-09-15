/* Presentation only: thresholds and cfgPar fallback remain in updateStarGauge. */
(function(root){
  let initialized=false,target=null,displayed=0,frame=0,earned=[false,false,false];
  const $=id=>document.getElementById(id);
  const reduced=()=>root.__SIM||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function stopNumber(){if(frame)root.cancelAnimationFrame(frame);frame=0;}
  function reset(){
    goalSignature=null;
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
  let goalSignature=null,goalItems=[];
  const goalFills=['#C94F66','#A87B1E','#078C82','#167BA1','#8755B3','#B96732'];
  const goalNames=['빨간 원','노란 삼각형','초록 사각형','하늘색 별','보라 마름모','주황 하트'];
  const invalidGoals=new Set();
  function goalState(got,need){
    const validNeed=Number.isFinite(need)&&need>0,validGot=Number.isFinite(got)&&got>=0;
    const total=validNeed?need:0,value=validGot&&validNeed?Math.min(got,total):0;
    return {total,value,ratio:total?Math.max(0,Math.min(1,value/total)):0,done:validNeed&&validGot&&got>=need,valid:validNeed&&validGot};
  }
  function renderGoals(goals){
    const signature=JSON.stringify(goals.map(g=>[g.ci,g.shape,g.need]));
    const fresh=signature!==goalSignature,container=$('goals');
    if(fresh){
      container.innerHTML='';goalItems=goals.map(()=>{
        const chip=document.createElement('div');chip.className='gchip';
        chip.innerHTML='<div class="goalTop"><div class="dot" aria-hidden="true"></div><span class="cnt" aria-hidden="true"></span></div><span class="goalMeasure" aria-hidden="true"></span><div class="goalTrack" role="progressbar"><div class="goalFill"></div></div><img class="goalCheck" src="assets/pastel-garden/icons/check.svg" alt="" aria-hidden="true">';
        container.appendChild(chip);
        return {chip,dot:chip.querySelector('.dot'),count:chip.querySelector('.cnt'),measure:chip.querySelector('.goalMeasure'),track:chip.querySelector('.goalTrack'),fill:chip.querySelector('.goalFill'),check:chip.querySelector('.goalCheck')};
      });goalSignature=signature;
    }
    goals.forEach((g,i)=>{
      const s=goalState(g.got,g.need),item=goalItems[i],name=goalNames[g.shape]||'큐브';
      if(!s.valid&&!invalidGoals.has(i)){invalidGoals.add(i);console.warn('Invalid goal progress at slot '+i);}
      item.chip.classList.toggle('done',s.done);
      item.dot.dataset.shape=g.shape;item.dot.style.background=g.hex;item.dot.textContent=g.symbol;
      item.count.textContent=s.value+'/'+s.total;item.measure.textContent=s.total+'/'+s.total;
      item.check.style.visibility=s.done?'visible':'hidden';
      item.fill.style.background=goalFills[g.shape]||'#6F625D';
      item.fill.style.transition=fresh||reduced()?'none':'';
      item.fill.style.width=(s.ratio*100)+'%';
      item.track.setAttribute('aria-label',name+' 수집');
      item.track.setAttribute('aria-valuemin','0');item.track.setAttribute('aria-valuemax',String(s.total||1));
      item.track.setAttribute('aria-valuenow',String(s.value));
      item.track.setAttribute('aria-valuetext',s.valid?`${s.total}개 중 ${s.value}개${s.done?', 완료':''}`:'목표 값 확인 필요');
    });
  }
  function layoutGoals(){
    const card=document.querySelector('.goalsCard');
    if(!card?.offsetWidth||!goalItems.length)return;
    card.dataset.compact=String(card.getBoundingClientRect().width<360);
    const row=$('goals'),available=row.clientWidth,icon=goalItems[0].dot.getBoundingClientRect().width;
    let columns=3;
    const slot=n=>(available-8*(n-1))/n;
    const needed=width=>Math.max(...goalItems.map(item=>item.measure.getBoundingClientRect().width))+icon+6+(width>=78?18:0);
    while(columns>1&&slot(columns)<needed(slot(columns)))columns--;
    const width=slot(columns);
    row.style.gridTemplateColumns=`repeat(${columns},${width}px)`;
    row.dataset.checkBelow=String(width<78);
  }
  function landscapeLayout(width,height,hudHeight=64){
    const extra=Math.max(0,hudHeight-64),contentHeight=Math.max(height,720+extra);
    const boardSize=Math.min(704,contentHeight-320-extra,width-48);
    return {boardSize,boardY:128+extra,contentHeight,scoreWidth:Math.min(384,Math.max(280,boardSize*.68)),controlsWidth:Math.max(288,boardSize*.82)};
  }
  root.PastelGarden={reset,renderScore,renderGoals,layoutGoals,goalState,landscapeLayout};
})(window);
