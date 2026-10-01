/* Absolute, already-awarded totals in; presentation only. Never grants points. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),base='assets/score-forecast-v3/';
 const panel=document.querySelector('.scorePanel'),bar=document.querySelector('.gaugeBar');
 const pending=document.createElement('span'),tip=document.createElement('span'),label=document.createElement('span');
 pending.className='scorePending';tip.className='scoreForecastTip';label.className='scoreForecastAdd';
 for(const el of [pending,tip,label])el.setAttribute('aria-hidden','true');
 bar.prepend(pending);bar.append(tip);panel.append(label);
 const pins=[1,2,3].map(n=>$('gPin'+n));
 for(const pin of pins){const halo=document.createElement('img');halo.className='scoreForecastHalo';halo.src=base+'star-forecast-halo.svg';halo.alt='';pin.append(halo);}
 const tier=root.innerWidth<768?'mobile':'standard',images=new Map(),effects=new Map(),history=[];
 let registration=null,state=null,raf=0,canvas=null,ctx=null;
 const clock=()=>root.performance?.now()||0,clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>1-(1-clamp(t))**3;
 const reduced=()=>!!root.__SIM||!root.requestAnimationFrame||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const log=(kind,data)=>{history.push({kind,at:clock(),...data});if(history.length>120)history.shift();};
 const ready=root.__SIM?Promise.resolve():fetch(base+'fanfare-registration.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(async m=>{
  registration=m[tier];await Promise.all(['score-fanfare','score-stars'].map(async id=>{const img=new Image();img.src=base+id+'-'+tier+'.png';await img.decode();images.set(id,img);}));
 }).catch(e=>{images.clear();log('load-error',{message:String(e)});});
 function sample(t){if(!state)return 0;return state.from+(state.target-state.from)*ease((t-state.commitAt)/240);}
 function wake(){if(!raf&&!reduced())raf=root.requestAnimationFrame(tick);}
 function announce(){if(!state)return;const text='점수 '+Math.round(state.target).toLocaleString('ko-KR')+' / '+state.par.toLocaleString('ko-KR')+', 별 '+state.states.filter(Boolean).length+'개';if($('gScore').textContent!==text)$('gScore').textContent=text;}
 function award(i,t){
  log('star',{index:i,total:state.target});
  if(reduced())return;
  const img=pins[i].querySelector('img');img.getAnimations?.().forEach(a=>a.cancel());
  img.animate?.([{transform:'scale(1)'},{transform:'scale(1.14)',offset:.45},{transform:'scale(1)'}],{duration:320,easing:'ease-out'});
  img.dataset.bursts=String(Number(img.dataset.bursts||0)+1);
  // One owner for ordinary play and Bonus Time. No deferred asset-load replay.
  if(images.size===2){effects.set(i,t);ensureCanvas();}
 }
 function ensureCanvas(){if(canvas)return;canvas=document.createElement('canvas');canvas.className='scoreFanfare';canvas.setAttribute('aria-hidden','true');panel.append(canvas);ctx=canvas.getContext('2d');}
 function drawEffects(t){
  if(!canvas)return;
  const b=panel.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,2),h=68;
  if(canvas.width!==Math.round(b.width*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,b.width,h);
  const rects=pins.map(p=>p.getBoundingClientRect());
  for(const [i,start]of effects){
   const age=t-start;if(age>=900||reduced()){effects.delete(i);continue;}
   const p=rects[i],x=p.x+p.width/2-b.x,y=p.y+p.height/2-b.y;
   // Keep light away from numbers, counter and other score-star centers.
   const left=i?(rects[i-1].right+p.left)/2-b.x:0,right=i<2?(p.right+rects[i+1].left)/2-b.x:b.width;
   ctx.save();ctx.beginPath();ctx.rect(left,0,right-left,h);ctx.clip();
   for(const [id,w,height]of [['score-fanfare',190,110],['score-stars',160,80]]){
    const e=registration[id],f=e.frames.find(f=>age>=f.atMs&&age<f.atMs+f.durationMs);
    if(f)ctx.drawImage(images.get(id),f.x,f.y,f.w,f.h,x-w*e.pivot[0],y-height*e.pivot[1],w,height);
   }ctx.restore();
  }
 }
 function paint(t,animate=true){
  if(!state)return;
  const shown=sample(t),ratio=n=>clamp(n/state.par),forecast=state.pendingFrom+(state.target-state.pendingFrom)*ease((t-state.start)/140);
  state.displayed=shown;$('scoreV').textContent=Math.round(shown).toLocaleString('en-US');
  $('scoreV').dataset.digits=String(Math.trunc(state.target)).length;
  $('gFill').style.width=ratio(shown)*100+'%';
  pending.style.width=ratio(Math.max(shown,forecast))*100+'%';tip.style.left=ratio(forecast)*100+'%';
  const delta=Math.max(0,Math.round(state.target-shown)),hasPending=delta>0;
  label.textContent=hasPending?'+'+delta.toLocaleString('en-US'):'';label.dataset.empty=String(!hasPending);tip.hidden=!hasPending;
  pins.forEach((pin,i)=>{
   const on=state.states[i]&&(shown+1e-8>=state.thresholds[i]),img=pin.querySelector('img');
   pin.style.left=ratio(state.thresholds[i])*100+'%';
   pin.dataset.forecast=String(!reduced()&&!on&&state.states[i]&&hasPending);
   if(on!==state.earned[i]){
    pin.classList.toggle('on',on);pin.setAttribute('aria-label','별 '+(i+1)+(on?' 획득':' 미획득'));
    img.src='assets/pastel-garden/score-star-'+(on?'earned':'unearned')+'.png';
    if(on&&state.earned[i]!==null&&animate)award(i,t);state.earned[i]=on;
   }
  });
  if(!hasPending)announce();drawEffects(t);
 }
 function tick(t){raf=0;if(!state)return;
  if(reduced()){state.from=state.target;state.commitAt=t-240;effects.clear();}
  paint(t);if(t<state.commitAt+240||effects.size)wake();
 }
 function render(total,par,states){
  const t=clock();par=Math.max(1,par);total=Math.max(0,total);
  const fresh=!state||state.par!==par||total<state.target,immediate=fresh||reduced();
  if(!fresh&&state.target===total&&states.every((v,i)=>v===state.states[i]))return;
  if(state)paint(t);
  if(immediate&&raf){root.cancelAnimationFrame(raf);raf=0;}
  const from=fresh?total:state.displayed,pendingFrom=fresh?total:Math.max(from,state.pendingFrom+(state.target-state.pendingFrom)*ease((t-state.start)/140));
  // A rapid chain retargets the current fill without repeatedly postponing it.
  const commitAt=immediate?t-240:state&&t<state.commitAt?state.commitAt:state&&t<state.commitAt+240?t:t+140;
  state={from:immediate?total:from,target:total,displayed:from,par,states:states.slice(),thresholds:[Math.round(par*.25),Math.round(par*.6),par],earned:fresh?[null,null,null]:state.earned,start:immediate?t-140:t,commitAt,pendingFrom};
  if(fresh){effects.clear();pins.forEach(p=>p.querySelector('img').getAnimations?.().forEach(a=>a.cancel()));}
  log('target',{total,from,immediate});paint(t,!immediate);if(!immediate)wake();
 }
 function reset(){if(raf)root.cancelAnimationFrame(raf);raf=0;state=null;effects.clear();canvas?.remove();canvas=ctx=null;label.textContent='';tip.hidden=true;pending.style.width='0%';pins.forEach(p=>{p.dataset.forecast='false';p.querySelector('img').getAnimations?.().forEach(a=>a.cancel());});}
 root.ScoreForecast={render,reset,ready,stats:()=>({displayed:state?.displayed,target:state?.target,earned:state?.earned.slice(),active:effects.size,loaded:images.size,tier,history:history.slice()})};
})(window);
