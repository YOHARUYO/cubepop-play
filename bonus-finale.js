/* Bonus presentation only. The two engines own rewards, RNG, conversions and clears. */
(function(root){
 'use strict';
 const base='assets/bonus-finale-v6/',ids=['entry-fanfare','entry-stars','move-spark','transfer-trail','conversion-burst','arrival-glints','bomb-ready'];
 const tier=root.innerWidth<1440||root.navigator?.deviceMemory<=4?'mobile':'standard',images=new Map(),specs=new Map(),sprites=new Set(),waiters=new Set(),history=[];
 const $=id=>document.getElementById(id),clock=()=>root.performance?.now()||Date.now(),reduced=()=>!!root.__SIM||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let run=null,epoch=0,frame=0,canvas=null,ctx=null,dim=null,title=null,loaded=false;
 const clamp=t=>Math.max(0,Math.min(1,t)),log=(kind,data={})=>{history.push({kind,at:clock(),...data});if(history.length>180)history.shift();diagnostic();};
 function diagnostic(){if(root.__SIM)return;let el=$('bonusFinaleState');if(!el){el=document.createElement('output');el.id='bonusFinaleState';el.hidden=true;document.body.append(el);}el.textContent=JSON.stringify({active:!!run,phase:run?.phase,moves:run?.displayMoves,heldScore:run?.hold,tier,loaded,sprites:sprites.size,history});}
 const ready=root.__SIM?Promise.resolve():fetch(base+'manifest.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(async m=>{
  await Promise.all(ids.map(async id=>{const e=m.variants[tier][id],img=new Image();img.src=base+e.atlas;await img.decode();specs.set(id,e);images.set(id,img);}));
  const img=new Image();img.src=base+'bonus-time.png';await img.decode();images.set('title',img);loaded=true;
 }).catch(e=>log('load-error',{message:String(e)}));
 function ensure(){if(canvas||root.__SIM)return;canvas=document.createElement('canvas');canvas.id='bonusFinaleCanvas';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:31';document.body.append(canvas);ctx=canvas.getContext('2d');
  dim=document.createElement('div');dim.className='bonusFinaleDim';dim.hidden=true;document.body.append(dim);
  title=document.createElement('div');title.className='bonusFinaleTitle';title.hidden=true;title.setAttribute('role','status');title.setAttribute('aria-label','보너스 타임');document.body.append(title);
 }
 function wipe(){sprites.clear();if(frame)root.cancelAnimationFrame(frame);frame=0;ctx?.clearRect(0,0,canvas.width,canvas.height);if(dim)dim.hidden=true;if(title)title.hidden=true;}
 function flush(){for(const w of [...waiters]){clearTimeout(w.id);waiters.delete(w);w.resolve();}}
 function cancel(){epoch++;wipe();flush();run=null;delete document.body.dataset.bonusFinale;log('cancel');}
 // Resize/backgrounding skips remaining decoration but lets the owning engine
 // finish normally. Scene changes cancel the owner via its existing epoch/token.
 function skip(){if(!run)return;run.fast=true;wipe();flush();log('skip');}
 function pause(ms){if(!run||run.fast||reduced())return Promise.resolve();return new Promise(resolve=>{const w={resolve,id:null};w.id=setTimeout(()=>{waiters.delete(w);resolve();},ms);waiters.add(w);});}
 const board=()=>$('board').getBoundingClientRect();
 function face(k){const b=board(),f=root.CubePopFrame.topFace(k%6*72,Math.floor(k/6)*72),s=b.width/1536;return {x:b.x+(f.x+f.w/2)*s,y:b.y+(f.y+f.h/2)*s,w:f.w*s,h:f.h*s};}
 function movesOrigin(){const b=$('movesV').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};}
 function sprite(id,geometry,{delay=0,alpha=1,clip=null}={}){if(!run||run.fast||reduced()||!images.has(id))return;ensure();sprites.add({id,geometry,start:clock()+delay,alpha,clip});wake();}
 function wake(){if(!frame&&!reduced())frame=root.requestAnimationFrame(tick);}
 function tick(now){frame=0;if(!run)return;const dpr=Math.min(root.devicePixelRatio||1,2),w=root.innerWidth,h=root.innerHeight;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  for(const s of [...sprites]){const e=specs.get(s.id),age=now-s.start;if(age>=e.durationMs){sprites.delete(s);continue;}if(age<0)continue;
   const f=e.frames.find(f=>age>=f.atMs&&age<f.atMs+f.durationMs);if(!f)continue;const g=s.geometry(age/e.durationMs);ctx.save();if(s.clip){const c=s.clip();ctx.beginPath();ctx.rect(c.x,c.y,c.w,c.h);if(c.exclude)ctx.rect(...c.exclude);ctx.clip(c.exclude?'evenodd':'nonzero');}ctx.globalAlpha=s.alpha;ctx.translate(g.x,g.y);ctx.rotate(g.angle||0);ctx.drawImage(images.get(s.id),f.x,f.y,f.w,f.h,-g.w*e.pivot[0],-g.h*e.pivot[1],g.w,g.h);ctx.restore();
  }
  if(run.phase==='entry'&&!run.fast){const u=(now-run.entryAt)/1000,fade=Math.min(clamp(u/.1),clamp((1-u)/.2)),b=board();dim.style.opacity=String(.30*fade);title.style.opacity=String(fade);title.style.width=Math.min(b.width*.9,450)+'px';title.style.left=b.x+b.width/2+'px';title.style.top=b.y+b.height*.44+'px';title.style.transform='translate(-50%,-50%) scale('+(u<.2?.7+.34*(1-(1-clamp(u/.2))**3):u<.34?1.04-.04*(u-.2)/.14:1)+')';}
  if(sprites.size||run.phase==='entry')wake();
 }
 function boardClip(){const b=board();return {x:b.x,y:b.y,w:b.width,h:b.height};}
 async function begin({moves,score,count}){cancel();document.body.dataset.bonusFinale='true';const id=epoch;run={id,displayMoves:moves,initialScore:score,hold:false,phase:'clear',fast:reduced()||document.hidden,count,arrived:0};log('begin',{moves,score,count});
  if(count>0&&!run.fast){await Promise.race([ready,pause(1200)]);if(!run||id!==epoch)return false;if(!loaded)run.fast=true;await pause(225);if(!run||id!==epoch)return false;
   if(!run.fast){ensure();run.phase='entry';run.entryAt=clock();dim.hidden=false;title.hidden=false;title.replaceChildren();const img=images.get('title').cloneNode();img.alt='BONUS TIME!';title.append(img);
    const g=()=>{const b=board();return {x:b.x+b.width/2,y:b.y+b.height*.44,w:b.width*1.05,h:b.width*.525};};sprite('entry-fanfare',g);sprite('entry-stars',g);wake();log('entry');await pause(1000);if(!run||id!==epoch)return false;dim.hidden=title.hidden=true;run.phase='transfer';
   }
  }return !!run&&id===epoch;
 }
 async function flight(item,index){const id=epoch;if(!run||run.fast||reduced())return;
  const from=movesOrigin(),to=face(item.k),b=board(),bend=(index%2?1:-1)*b.width*.1,c={x:from.x+(to.x-from.x)*.65+bend,y:from.y+(to.y-from.y)*.35};
  const path=u=>({x:(1-u)**2*from.x+2*(1-u)*u*c.x+u*u*to.x,y:(1-u)**2*from.y+2*(1-u)*u*c.y+u*u*to.y,angle:Math.atan2(2*(1-u)*(c.y-from.y)+2*u*(to.y-c.y),2*(1-u)*(c.x-from.x)+2*u*(to.x-c.x))});
  sprite('transfer-trail',u=>({...path(u),w:b.width*.46,h:b.width*.23}));sprite('move-spark',u=>({...path(u),w:b.width*.26,h:b.width*.26}));log('flight',{k:item.k,index});await pause(320);return id===epoch;
 }
 function arrival(item){if(!run)return;run.arrived++;run.displayMoves=Math.max(0,run.displayMoves-1);log('arrival',{k:item.k,moves:run.displayMoves});
  for(const [id,scale,alpha]of [['conversion-burst',2.8,1],['arrival-glints',1.7,.85],['bomb-ready',1.42,.2]])sprite(id,()=>{const p=face(item.k);return {...p,w:p.w*scale,h:p.h*scale};},{alpha,clip:boardClip});
 }
 async function convert(items,commit){const id=epoch;for(let i=0;i<items.length;){const batch=items.slice(i,i+(i<3?1:6));await Promise.all(batch.map((item,j)=>flight(item,i+j)));if(!run||id!==epoch)return false;for(const item of batch){arrival(item);commit(item);}i+=batch.length;}await pause(360);return !!run&&id===epoch;}
 async function readyBombs(items){if(!run)return;run.phase='ready';for(const item of items)sprite('bomb-ready',()=>{const p=face(item.k);return {...p,w:p.w*1.42,h:p.h*1.42};},{alpha:.86,clip:boardClip});log('ready',{count:items.length});await pause(items.length?320:0);if(run)run.phase='explode';}
 async function settle(update){if(!run){update();return;}const id=epoch;run.phase='settle';run.displayMoves=0;update();log('settle');await pause(260);if(run&&id===epoch){wipe();run=null;delete document.body.dataset.bonusFinale;log('finish');}}
 root.addEventListener('resize',skip);root.visualViewport?.addEventListener?.('resize',skip);document.addEventListener('visibilitychange',()=>{if(document.hidden)skip();});
 root.BonusFinale={begin,convert,readyBombs,settle,cancel,skip,ready,active:()=>!!run,displayMoves:value=>run?run.displayMoves:value,displayScore:value=>value,stats:()=>({active:!!run,history:history.slice(),tier,loaded})};
})(window);
