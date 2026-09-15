/* Delivered art on three inert layers. No score, match, refill or input ownership. */
(function(root){
  if(root.__SIM)return;
  const P=root.CubePopEffectsPlan,F=root.CubePopFrame,board=document.getElementById('board');
  const layers=['floor','low','air'].map((name,i)=>{
    const canvas=document.createElement('canvas');canvas.className='gameFx gameFx-'+name;canvas.width=canvas.height=704;
    Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:String([0,2,4][i])});
    canvas.setAttribute('aria-hidden','true');board.append(canvas);return {canvas,ctx:canvas.getContext('2d')};
  });
  const out=document.createElement('output');out.id='effectsState';out.hidden=true;document.body.append(out);
  let loaded=false,disabled=false,active=[],poses=new WeakMap(),scheduled=false,last=0,stamp=0;
  const seen=new Set(),entries=new Map(),tinted=new Map(),history=[],drawTimes=[],intervals=[];
  const stats={version:5,bombs:4,spawn:3,lightGain:.85,ready:false,events:0,duplicates:0,maxParticles:0,maxSprites:0,frames:0,drawnAssets:{},errors:[]};
  const LIGHT=.85,CREAM='#FFF1D2';
  const reduced=()=>root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const point=(r,c,y=1)=>{const w=F.world(c*72,r*72);return F.project(w.x,y,w.z);};
  const shape=(r,c,y=1,inset=0)=>{const w=F.world(c*72,r*72),a=.5-inset;return [[-a,-a],[a,-a],[a,a],[-a,a]].map(([x,z])=>F.project(w.x+x,y,w.z+z));};
  const width=(r,c)=>{const q=shape(r,c);return Math.max(...q.map(p=>p.x))-Math.min(...q.map(p=>p.x));};
  const polygon=(ctx,points)=>{ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();};
  function diagnostic(){out.textContent=JSON.stringify({...stats,active:active.length,particleBudget:innerWidth<=520?96:192,atlasCount:tinted.size,drawTimes:drawTimes.slice(-180),intervals:intervals.slice(-180),history:history.slice(-30),layers:layers.map(l=>l.canvas.width)});}
  async function image(file,dir='effects-v3'){const img=new Image();img.src='assets/'+dir+'/'+file;await img.decode();return img;}
  function atlas(id,color,gain=1){
    const raw=entries.get(id);if(!raw.highlight)return raw.body;
    const key=id+color+gain;if(tinted.has(key))return tinted.get(key);
    const e=entries.get(id),canvas=document.createElement('canvas');canvas.width=e.width;canvas.height=e.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(e.body,0,0);
    if(id!=='PRISM'){
      ctx.globalCompositeOperation='multiply';ctx.fillStyle=color;ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.globalCompositeOperation='destination-in';ctx.drawImage(e.body,0,0);ctx.globalCompositeOperation='source-over';
    }
    ctx.globalAlpha=gain;ctx.drawImage(e.highlight,0,0);tinted.set(key,canvas);return canvas;
  }
  function warm(colors){if(!loaded)return;for(const id of entries.keys())for(const color of id==='PRISM'?['#ffffff']:[...colors,CREAM])atlas(id,color,id==='POP'?LIGHT:1);}
  const ready=fetch('assets/effects-v3/manifest.json').then(r=>{if(!r.ok)throw Error('FX manifest unavailable');return r.json();}).then(async m=>{
    await Promise.all(m.entries.map(async e=>{const [body,highlight]=await Promise.all([image(e.file),image(e.highlightFile)]);entries.set(e.id,{...e,body,highlight});}));
    const v4=await fetch('assets/effects-v4/manifest.json').then(r=>{if(!r.ok)throw Error('FX v4 manifest unavailable');return r.json();});
    await Promise.all(v4.entries.map(async e=>entries.set(e.id,{...e,body:await image(e.file,'effects-v4')})));
    loaded=true;warm(root.CubePopVisualBridge?.colors?.()||['#ff5c7a','#ffd052','#00c6a7','#43c6ed','#b987ef','#ffa15f']);stats.ready=true;board.classList.add('effectsReady');diagnostic();
  }).catch(e=>{stats.errors.push(String(e));diagnostic();console.warn('Effects assets unavailable; keeping legacy removal.',e);});
  let sprites=0;
  function sprite(ctx,id,color,age,x,y,w,h=w,rotation=0,alpha=1,staticIndex,gain=1){
    const e=entries.get(id),f=staticIndex===undefined?P.frameAt(e,age):e.frames[staticIndex%e.frames.length];if(!f||alpha<=0)return;
    ctx.save();ctx.globalAlpha=Math.min(1,alpha);ctx.translate(x,y);ctx.rotate(rotation);
    ctx.drawImage(atlas(id,id==='PRISM'?'#ffffff':color,gain),...f.rect,-w/2,-h/2,w,h);ctx.restore();sprites++;stats.drawnAssets[id]=(stats.drawnAssets[id]||0)+1;
  }
  function random(seed){let n=(seed*1664525+1013904223)>>>0;return ()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
  function accept(event,creation=false){
    if(!loaded||disabled)return null;if(seen.has(event.id)){stats.duplicates++;return null;}seen.add(event.id);if(seen.size>512)seen.delete(seen.values().next().value);
    const e=creation?{...event,creation:true,level:1,coreMs:0,cells:event.cells.map(c=>({...c,start:0,popAt:145,strong:true}))}:P.plan(event);
    e.started=performance.now();e.reduced=reduced();e.particles=[];
    e.strong=e.cells.some(c=>c.strong)&&!creation;e.density=e.strong?Math.min(1,Math.sqrt(6/e.cells.filter(c=>c.strong).length)):1;
    e.life=creation?360:Math.max(340,...(e.bursts||[]).map(b=>b.type==='W'?560:b.type==='COMBO'?520:480));
    for(const c of e.cells){c.p=point(c.r,c.c);c.w=width(c.r,c.c);poses.set(c.entity,{event:e,cell:c});}
    const cap=innerWidth<=520?96:192;
    for(const previous of active)previous.particles=previous.particles.filter(p=>e.started-previous.started<p.c.popAt+p.delay+p.life);
    // Reclaim old, small afterglow first so the next real clear still reads as fragments.
    let used=active.reduce((n,a)=>n+a.particles.length,0),reserve=e.reduced?0:Math.min(30,e.cells.length*2);
    const expendable=active.flatMap(previous=>previous.particles.filter(p=>p.id!=='STONE').map(p=>({previous,p}))).sort((a,b)=>(a.p.dust?-1:0)-(b.p.dust?-1:0)||a.p.w-b.p.w);
    for(const {previous,p} of expendable){if(cap-used>=reserve)break;previous.particles.splice(previous.particles.indexOf(p),1);used--;}
    const budget=Math.max(0,cap-used);
    const allocation=P.allocation(e.cells.length,budget,e.strong,creation,e.level,e.bursts?.some(b=>b.type==='COMBO'));
    const count=allocation.each;
    const rand=random(stats.events+91);
    if(!e.reduced)for(const c of e.cells){for(let i=0;i<count;i++){
      if(creation){const spark=i>=Math.ceil(count*2/3);e.particles.push({c,id:spark?'SPARK':'CHIP',index:Math.floor(rand()*16),angle:rand()*Math.PI*2,dist:(.43+rand()*.42)*c.w,w:(spark?.2:.08+rand()*.1)*c.w*1.3,spin:(rand()-.5)*6,air:i%3===0,life:300,lift:.3,delay:0,color:spark?'#fff3cf':c.hex});continue;}
      // Mixed removals retain normal v5 fragments on cells outside bomb membership.
      const normal=!c.strong;if(normal&&i>=10)continue;
      const stone=!normal&&i<allocation.stone,dust=!normal&&i>=count-allocation.dust,cream=normal&&i>=8;
      e.particles.push({c,id:stone?'STONE':'CHIP',index:Math.floor(rand()*16),angle:rand()*Math.PI*2,
        dist:(normal?.30+rand()*.225:.40+rand()*.45)*c.w,
        w:(normal?(cream?.18:[.30,.335,.37,.405][i%4]):stone?[.50,.62,.74][i%3]:dust?.12:.25+rand()*.165)*c.w,
        spin:(rand()-.5)*(normal?1.3:stone?1.6:3),air:!dust&&i%3===0,
        life:normal?200:stone?305:dust?180:265,lift:normal?.23:stone?.50:dust?.08:.35,
        delay:normal?8:0,color:cream||dust?CREAM:c.hex,dust,normal});
    }}
    if(!e.reduced)for(let i=0;i<allocation.extra;i++){const c=e.cells[i%e.cells.length];if(c)e.particles.push({c,id:'CHIP',index:i,angle:rand()*Math.PI*2,dist:c.w*.85,w:c.w*.405,spin:rand()*2,air:true,life:265,lift:.4,delay:0,color:c.hex});}
    active.push(e);stats.events++;stats.maxParticles=Math.max(stats.maxParticles,active.reduce((n,a)=>n+a.particles.length,0));
    history.push({id:e.id,creation,level:e.level,coreMs:e.coreMs,density:e.density,allocation,reduced:e.reduced,cells:e.cells.map(c=>({id:c.id,r:c.r,c:c.c,strong:c.strong,popAt:c.popAt})),bursts:(e.bursts||[]).map(b=>({id:b.id,type:b.type,targets:b.targets})),particles:e.particles.length,particleKinds:e.particles.reduce((a,p)=>(a[p.id]=(a[p.id]||0)+1,a),{})});
    if(history.length>30)history.shift();
    root.CubePopVisual?.wake(e.life);wake();diagnostic();return e;
  }
  function sample(entity,now){const p=poses.get(entity);return p?P.pose(now-p.event.started,p.cell.start,p.event.creation,p.event.reduced,p.cell.strong):null;}
  function clear(){active=[];poses=new WeakMap();for(const l of layers)l.ctx.clearRect(0,0,l.canvas.width,l.canvas.height);diagnostic();}
  function ribbon(ctx,from,to,color,age,w,wild=false,arrival=155,density=1){
    const t=Math.max(0,Math.min(1,(age-(wild?70:45))/(wild?70:arrival-45)));if(t<=0||age>(wild?285:230))return;
    const alpha=Math.min(1,((wild?285:230)-age)/65)*density,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,dx=x-from.x,dy=y-from.y,len=Math.hypot(dx,dy);
    ctx.save();ctx.globalAlpha=Math.max(0,alpha)*LIGHT;ctx.translate(from.x,from.y);ctx.rotate(Math.atan2(dy,dx));
    const strip=atlas('RIBBON-STRIP',color);ctx.drawImage(strip,0,0,strip.width,strip.height,0,-w/2,len,w);ctx.restore();sprites++;
    sprite(ctx,'RIBBON',color,Math.min(150,Math.max(0,age-45)),x,y,w*2,w*2,Math.atan2(dy,dx),alpha*LIGHT);
    if(wild)sprite(ctx,'SPARK',CREAM,Math.max(0,age-70),x,y,w*2.7,w*2.7,0,alpha*LIGHT);
  }
  function floorEffect(ctx,e,b,age){
    if(e.reduced||age>=e.coreMs-10||e.released)return;
    const targets=e.cells.filter(c=>b.targets.includes(c.id));if(!targets.length)return;
    ctx.save();ctx.beginPath();targets.forEach(c=>polygon(ctx,shape(c.r,c.c,0,-.06)));ctx.clip();
    if(e.reduced){ctx.fillStyle=b.hex;ctx.globalAlpha=.35;ctx.fill();}
    else{
      const origin=F.world(b.c*72,b.r*72),q=F.project(origin.x,0,origin.z),px=F.project(origin.x+1,0,origin.z),pz=F.project(origin.x,0,origin.z+1);
      ctx.transform(px.x-q.x,px.y-q.y,pz.x-q.x,pz.y-q.y,q.x,q.y);
      sprite(ctx,'SHOCK',CREAM,age,0,0,3.3,3.3,0,LIGHT*.45*e.density);
    }ctx.restore();
  }
  function drawEvent(e,now){
    const age=now-e.started,[floor,low,air]=layers.map(l=>l.ctx);
    for(const b of e.bursts||[]){
      const p=point(b.r,b.c),w=width(b.r,b.c),targets=e.cells.filter(c=>b.targets.includes(c.id));
      floorEffect(floor,e,b,age);
      if(e.reduced)continue;
      if(b.type==='H'||b.type==='V')for(const sign of [-1,1]){
        const directional=targets.filter(c=>Math.sign((b.type==='H'?c.c-b.c:c.r-b.r))===sign).sort((a,c)=>Math.abs(c.r-b.r)+Math.abs(c.c-b.c)-Math.abs(a.r-b.r)-Math.abs(a.c-b.c));
        if(directional[0])ribbon(low,p,directional[0].p,b.hex,age,w*.38,false,directional[0].popAt,e.density);
      }
      if(b.type==='W'){
        sprite(low,'PRISM','#ffffff',age,p.x,p.y,w*1.8);
        targets.filter(c=>c.id!==b.id).forEach(c=>ribbon(low,p,c.p,c.hex,age-(c.popAt-140),w*.085,true,155,e.density));
      }
    }
    for(const c of e.cells){
      let p=c.p;
      if(e.creation&&c.entity.el.isConnected){const matrix=new DOMMatrix(getComputedStyle(c.entity.el).transform);const pos=F.world(matrix.m41,matrix.m42);p=F.project(pos.x,1,pos.z);}
      if(e.reduced){if(age<150){low.save();low.globalAlpha=.4*(1-age/150);low.fillStyle=c.hex;low.beginPath();polygon(low,shape(c.r,c.c));low.fill();low.restore();}continue;}
      if(e.creation){sprite(low,'CROWN',c.hex,age,p.x,p.y,c.w*1.8);continue;}
      const t=age-c.popAt;
      if(t<0){if(c.strong&&t>=-30){low.save();low.beginPath();polygon(low,shape(c.r,c.c));low.strokeStyle=CREAM;low.lineWidth=c.w*.025;low.globalAlpha=.5*LIGHT*(1+t/30);low.stroke();low.restore();}continue;}
      if(!c.strong){if(t<45){const w=c.w*(.45+.4*t/45);sprite(low,'RUPTURE',CREAM,0,p.x,p.y,w,w,0,.38*(1-t/45),0);}continue;}
      const fade=Math.max(0,1-Math.max(0,t-35)/70),scale=.45+.75*Math.min(1,t/28);
      if(e.bursts?.some(b=>b.type==='W'&&b.id===c.id))continue;
      const popW=c.w*1.9*scale,ruptureW=c.w*(e.bursts?.some(b=>b.id===c.id)?2.1:1.65)*scale;
      sprite(low,'POP',c.hex,t+24,p.x,p.y,popW,popW,0,fade*.78*e.density,undefined,LIGHT);
      sprite(low,'RUPTURE',CREAM,0,p.x,p.y,ruptureW,ruptureW,0,fade*.9*LIGHT*e.density,0);
      if(e.level>=2&&age<e.coreMs)sprite(low,'SHOCK',c.hex,t-30,p.x,p.y,c.w*1.9,c.w*.9,0,.22*e.density);
    }
    for(const p of e.particles){
      const ageP=age-p.c.popAt-p.delay;if(ageP<0||ageP>p.life)continue;
      const t=ageP/p.life,u=1-(1-t)**3,x=p.c.p.x+Math.cos(p.angle)*p.dist*u,y=p.c.p.y+Math.sin(p.angle)*p.dist*u-p.c.w*p.lift*Math.sin(t*Math.PI),alpha=Math.min(1,(1-t)/(p.normal?.55:.52))*Math.min(1,(e.life-age)/45)*(p.dust?.24:1);
      sprite(p.air?air:low,p.id,p.color,ageP,x,y,p.w,p.w,p.spin*t,alpha,p.id==='SPARK'?undefined:p.index);
    }
  }
  function protect(ctx,entities,now){
    ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';ctx.beginPath();
    for(const entity of entities){
      const pose=poses.get(entity);if(pose&&now-pose.event.started<pose.event.life)continue;
      // Use the live DOM position: incoming cubes cannot inherit an old cell's effect.
      const m=new DOMMatrix(getComputedStyle(entity.el).transform),pos=F.world(m.m41,m.m42),a=.33;
      polygon(ctx,[[-a,-a],[a,-a],[a,a],[-a,a]].map(([x,z])=>F.project(pos.x+x,1,pos.z+z)));
    }ctx.fill();ctx.restore();
  }
  function tick(now){
    scheduled=false;const start=performance.now();sprites=0;
    if(last&&active.length)intervals.push(now-last);last=now;
    active=active.filter(e=>now-e.started<e.life);
    for(const l of layers){const ctx=l.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,l.canvas.width,l.canvas.height);ctx.setTransform(l.canvas.width/1536,0,0,l.canvas.height/1536,0,0);}
    for(const e of active)drawEvent(e,now);
    if(active.length){const entities=root.CubePopVisualBridge?.entities()||[];protect(layers[1].ctx,entities,now);protect(layers[2].ctx,entities,now);}
    stats.frames++;stats.maxSprites=Math.max(stats.maxSprites,sprites);drawTimes.push(performance.now()-start);if(drawTimes.length>180)drawTimes.shift();if(intervals.length>180)intervals.shift();
    root.CubePopEffectsFrame?.({now,layers:layers.map(l=>l.canvas),active:active.length,sprites});
    if(now-stamp>100||!active.length){diagnostic();stamp=now;}if(active.length)wake();else last=0;
  }
  function wake(){if(!scheduled){scheduled=true;requestAnimationFrame(tick);}}
  root.CubePopEffects={ready,get enabled(){return loaded&&!disabled&&!!root.CubePopVisual;},set disabled(value){disabled=!!value;board.classList.toggle('effectsReady',loaded&&!disabled);if(disabled)clear();},play:e=>accept(e),spawn:e=>accept(e,true),release:e=>{if(e)e.released=true;},sample,binding:entity=>{const p=poses.get(entity);return p?{eventId:p.event.id,entityId:p.cell.id}:null;},clear,warm,layers:layers.map(l=>l.canvas)};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  diagnostic();
})(window);
