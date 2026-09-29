/* Presentation clocks only. Gameplay owns totals, completion and star thresholds. */
(function(root){
 'use strict';
 const base='assets/gimmicks/hud-ice-v8/',tier=root.innerWidth<768||root.navigator?.deviceMemory<=4?'mobile':'standard';
 const entries=new Map(),images=new Map(),goals=new Map(),sprites=new Set();
 let frame=0,score=null,clearBatchAt=-1,clearBatch=0;
 const history=[];
 const now=()=>root.performance.now(),reduced=()=>root.__SIM||!root.requestAnimationFrame||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const ease=t=>1-(1-t)**3,clamp=v=>Math.max(0,Math.min(1,v));
 const value=(s,t)=>s.from+(s.to-s.from)*ease(clamp((t-s.start)/s.duration));
 const log=(kind,data)=>{history.push({kind,at:now(),...data});if(history.length>160)history.shift();};
 const ready=root.__SIM?Promise.resolve():fetch(base+tier+'/manifest.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(async m=>{
  await Promise.all(m.entries.filter(e=>e.id.startsWith('HUD_')).map(async e=>{const img=new Image();img.src=base+tier+'/'+e.file;await img.decode();entries.set(e.id,e);images.set(e.id,img);}));
 }).catch(e=>log('load-error',{message:String(e)}));
 function wake(){if(!frame&&!reduced())frame=root.requestAnimationFrame(tick);}
 function sprite(id,parent,start=now()){
  if(reduced()||!entries.has(id))return;
  // Repeated progress updates replace their tip instead of stacking it.
  for(const s of [...sprites])if(s.id===id&&s.parent===parent){s.canvas.remove();sprites.delete(s);}
  const e=entries.get(id),size=e.registration.displayBoxCssPx[0],canvas=document.createElement('canvas');
  canvas.className='hudFx '+id;canvas.width=canvas.height=size*Math.min(root.devicePixelRatio||1,2);
  canvas.style.width=canvas.style.height=size+'px';canvas.setAttribute('aria-hidden','true');parent.append(canvas);
  sprites.add({id,parent,canvas,start,entry:e,ctx:canvas.getContext('2d')});log(id,{start});wake();
 }
 function overlay(card){
  let el=card.querySelector('.hudCompletion');if(el)return el;
  el=document.createElement('span');el.className='hudCompletion';el.hidden=true;el.setAttribute('aria-hidden','true');
  const dim=document.createElement('span');dim.className='hudDim';
  const halo=document.createElement('span');halo.className='hudClearHalo';
  const img=document.createElement('img');img.className='hudClearWord';img.alt='';img.src=base+'ui/clear-wordmark'+(tier==='mobile'?'-mobile':'')+'.png';
  const check=document.createElement('span');check.className='hudCompactCheck';check.textContent='✓';
  el.append(dim,halo,img,check);card.append(el);return el;
 }
 function complete(s,animate){
  if(s.shown)return;s.shown=true;const el=overlay(s.card);el.hidden=false;
  if(animate&&!reduced()){
   el.classList.add('hudJustCompleted');
   if(s.timer)clearTimeout(s.timer);
   s.timer=setTimeout(()=>{el.classList.remove('hudJustCompleted');s.timer=0;},650);
   el.querySelector('.hudDim').animate?.([{opacity:0},{opacity:1}],{duration:120,easing:'ease-out'});
   el.querySelector('img').animate?.([{opacity:0,transform:'scale(1)'},{opacity:1,transform:'scale(1.10)',offset:90/280},{opacity:1,transform:'scale(1.12)',offset:.4},{opacity:1,transform:'scale(1)'}],{duration:280,easing:'ease-out'});
   const time=now();if(time-clearBatchAt>35){clearBatchAt=time;clearBatch=0;}
   sprite('HUD_GOAL_CLEAR',el.querySelector('.hudClearHalo'),time+Math.min(180,clearBatch++*60));log('goal-complete',{goal:s.card.dataset.goal});
  }
 }
 function goal(card,ratio,done,{immediate=false}={}){
  ratio=clamp(ratio);const t=now(),fill=card.querySelector('.hudTrack>i,.goalFill');
  if(!fill)return;
  let s=goals.get(card);const fresh=!s;
  if(fresh){s={card,fill,from:ratio,to:ratio,start:t,duration:280,done,shown:false};goals.set(card,s);overlay(card);}
  card.dataset.complete=String(done);
  if(fresh||immediate||reduced()){
   s.from=s.to=ratio;s.start=t-280;s.done=done;fill.style.transition='none';fill.style.width=ratio*100+'%';
   if(done)complete(s,false);else{s.shown=false;overlay(card).hidden=true;}return;
  }
  if(ratio===s.to&&done===s.done)return;
  const current=value(s,t),increased=ratio>s.to;s.from=current;s.to=ratio;s.start=t;s.done=done;
  fill.style.transition='none';if(!done){s.shown=false;overlay(card).hidden=true;}
  if(increased){sprite('HUD_PROGRESS_TIP',card.querySelector('.hudTrack'));card.querySelector('.hudIcon')?.animate?.([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:280,easing:'ease-out'});}
  wake();
 }
 function star(i,animate){
  const pin=document.getElementById('gPin'+(i+1)),img=pin.querySelector('img'),on=score.states[i];
  pin.classList.toggle('on',on);pin.setAttribute('aria-label','별 '+(i+1)+(on?' 획득':' 미획득'));
  img.src='assets/pastel-garden/score-star-'+(on?'earned':'unearned')+'.png';
  if(animate&&!reduced()&&!root.BonusFinale?.scoreEffect(i)){
   img.getAnimations?.().forEach(a=>a.cancel());img.animate?.([{transform:'scale(1)'},{transform:'scale(1.14)',offset:.45},{transform:'scale(1)'}],{duration:320,easing:'ease-out'});
   img.dataset.bursts=String(Number(img.dataset.bursts||0)+1);sprite('HUD_STAR_EARN',pin);log('star',{index:i});
  }
  score.earned[i]=on;
 }
 function scoreGauge(ratio,states,thresholds,immediate){
  const t=now(),fresh=!score;ratio=clamp(ratio);
  if(fresh)score={from:ratio,to:ratio,start:t,duration:240,states,thresholds,earned:[false,false,false]};
  if(fresh||immediate||reduced()){
   Object.assign(score,{from:ratio,to:ratio,start:t-240,states,thresholds});document.getElementById('gFill').style.transition='none';document.getElementById('gFill').style.width=ratio*100+'%';
   states.forEach((_,i)=>star(i,false));return;
  }
  if(ratio!==score.to){score.from=value(score,t);score.to=ratio;score.start=t;}
  score.states=states;score.thresholds=thresholds;
  states.forEach((on,i)=>{if(!on&&score.earned[i])star(i,false);});wake();
 }
 function tick(t){
  frame=0;let active=false;
  for(const [card,s]of goals){
   if(!card.isConnected){goals.delete(card);continue;}
   const p=reduced()?s.to:value(s,t);s.fill.style.width=p*100+'%';card.style.setProperty('--hud-progress',p*100+'%');
   if(t<s.start+280&&!reduced())active=true;else if(s.done&&!s.shown)complete(s,!reduced());
  }
  if(score){const p=reduced()?score.to:value(score,t);document.getElementById('gFill').style.width=p*100+'%';
   score.states.forEach((on,i)=>{if(on&&!score.earned[i]&&p+1e-9>=score.thresholds[i])star(i,true);});
   if(t<score.start+240&&!reduced())active=true;
  }
  for(const s of [...sprites]){
   const f=root.GimmickFeedbackPlan.frameAt(s.entry,t-s.start);
   if(reduced()||!s.parent.isConnected||t>=s.start+s.entry.durationMs){s.canvas.remove();sprites.delete(s);continue;}
   s.ctx.clearRect(0,0,s.canvas.width,s.canvas.height);if(f)s.ctx.drawImage(images.get(s.id),...f.rect,0,0,s.canvas.width,s.canvas.height);active=true;
  }
  if(active)wake();
 }
 function reset(){
  if(frame)root.cancelAnimationFrame(frame);frame=0;score=null;
  for(const s of sprites)s.canvas.remove();sprites.clear();
  for(const [card,s]of goals){if(s.timer)clearTimeout(s.timer);card.querySelectorAll('.hudCompletion').forEach(el=>el.remove());card.querySelectorAll('*').forEach(el=>el.getAnimations?.().forEach(a=>a.cancel()));}
  goals.clear();clearBatchAt=-1;clearBatch=0;
 }
 root.HudFeedback={goal,score:scoreGauge,reset,ready,assetTier:tier,stats:()=>({tier,loaded:[...entries.keys()],active:sprites.size,history:history.slice()})};
})(window);
