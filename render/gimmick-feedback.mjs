import * as THREE from 'three';
import {connectionTree,drawConnection,connectionTiming} from './constellation-completion.mjs';
// Physical release sprites share cube depth; star lights are local badge overlays.
export function createGimmickFeedback(scene,camera,board,wake,renderer){
 const P=window.GimmickFeedbackPlan,base='assets/gimmicks/feedback-v6/',iceBase='assets/gimmicks/hud-ice-v8/';
 const loader=new THREE.TextureLoader(),plane=new THREE.PlaneGeometry(1,1),v=new THREE.Vector3();
 let badgeCanvas=null,badgeContext=null;
 let completion=null,completed=false;const peakWaiters=new Set();
 function endConnection(){completion=null;for(const w of peakWaiters){clearTimeout(w.timer);w.resolve();}peakWaiters.clear();}
 function waitForStarPeak(){
  const delay=completion&&!reduced()?Math.max(0,completion.start+connectionTiming.peakEnd-performance.now()):0;
  if(!delay)return Promise.resolve();
  return new Promise(resolve=>{const w={resolve,timer:setTimeout(()=>{peakWaiters.delete(w);resolve();},delay)};peakWaiters.add(w);});
 }
 const instances=new Set(),ice=new Map(),seen=new Set(),stars=new Map(),gateArrivals=new Map();
 let pool=new Map(),entries=new Map(),staticMaps=new Map(),warmMaterials=[],signature='',session=0,ready=false,loading=null;
 let metrics={events:0,duplicates:0,skipped:0,peakInstances:0,decodedMiB:0,loaded:[],failures:[],history:[]};
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const output=document.createElement('output');output.id='gimmickFeedbackState';output.hidden=true;document.body.append(output);
 function diagnostic(){output.textContent=JSON.stringify({...metrics,ready,session,completion,active:instances.size+(completion?1:0),ice:ice.size,heldStars:stars.size,gateArrivals:[...gateArrivals.values()],tier:signature.split(':')[0]||null,instances:[...instances].map(i=>({id:i.id,k:i.k,owner:i.owner,start:i.start,frame:i.frame,depth:i.depth,box:i.box,duration:i.duration,opacity:i.mesh.material.opacity})),pointerEvents:'none'});}
 async function loadTexture(path){const map=await loader.loadAsync(path);map.colorSpace=THREE.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=map.magFilter=THREE.LinearFilter;map.premultiplyAlpha=false;return map;}
 function remove(i){if(i.depth==='badge-overlay'){instances.delete(i);return;}scene.remove(i.mesh);i.mesh.geometry!==plane&&i.mesh.geometry.dispose();i.mesh.material.dispose();i.map?.dispose();instances.delete(i);}
 function clearBadges(){badgeContext?.clearRect(0,0,1536,1536);}
 function ensureBadges(){
  if(badgeCanvas)return;badgeCanvas=document.createElement('canvas');badgeCanvas.id='gimmickStarLights';badgeCanvas.width=badgeCanvas.height=1536;
  badgeCanvas.setAttribute('aria-hidden','true');badgeCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';
  board.append(badgeCanvas);badgeContext=badgeCanvas.getContext('2d');
 }
 function reset(){endConnection();completed=false;clearBadges();session++;for(const i of [...instances])remove(i);ice.clear();seen.clear();stars.clear();gateArrivals.clear();diagnostic();}
 function prepare(state){
  reset();metrics={events:0,duplicates:0,skipped:0,peakInstances:0,decodedMiB:metrics.decodedMiB,loaded:metrics.loaded,failures:metrics.failures,history:[]};
  const ids=P.needed(state),tier=P.tier(board.getBoundingClientRect().width,devicePixelRatio,navigator.deviceMemory),key=tier+':'+ids.slice().sort().join(',');
  if(key===signature){loading?.then(()=>wake(0));return loading;}
  signature=key;ready=false;metrics.failures=[];const requestedKey=key;
  warmMaterials.forEach(m=>m.dispose());warmMaterials=[];
  for(const map of [...pool.values(),...staticMaps.values()])map.dispose();pool=new Map();entries=new Map();staticMaps=new Map();
  metrics.loaded=[];metrics.decodedMiB=0;
  loading=(async()=>{
   try{
    const response=await fetch(base+tier+'/manifest.json');if(!response.ok)throw Error('manifest '+response.status);const manifest=await response.json();
    const desired=manifest.entries.filter(e=>ids.includes(e.id)&&!e.id.startsWith('ICE_')).map(e=>({...e,base}));
    if(state.stars.length){
     const connectionBase='assets/gimmicks/constellation-completion-v1/';
     try{const r=await fetch(connectionBase+'manifest.json');if(!r.ok)throw Error('connection manifest '+r.status);const m=await r.json();desired.push(...m.entries.map(e=>({...e,base:connectionBase,direct:true})));}
     catch(e){metrics.failures.push(e.message);}
    }
    const iceTier=window.HudFeedback?.assetTier||tier;
    if(ids.some(id=>id.startsWith('ICE_'))){const response=await fetch(iceBase+iceTier+'/manifest.json');if(!response.ok)throw Error('v8 manifest '+response.status);const m=await response.json();desired.push(...m.entries.filter(e=>ids.includes(e.id)).map(e=>({...e,base:iceBase,tier:iceTier})));}
    const materials=ids.includes('ICE_UV_2_TO_1')?['ice-face-1','ice-face-2']:[];

    await Promise.all([...desired.map(async entry=>{
     try{const path=entry.base+(entry.direct?'':(entry.tier||tier)+'/')+entry.file;const map=await loadTexture(path);if(signature!==requestedKey){map.dispose();return;}pool.set(entry.id,map);entries.set(entry.id,entry);metrics.loaded.push(path);metrics.decodedMiB+=entry.width*entry.height*4/1048576;}
     catch(e){if(signature===requestedKey)metrics.failures.push(entry.id+': '+e.message);}
    }),...materials.map(async id=>{try{const map=await loadTexture(iceBase+'materials/'+id+'.png');if(signature!==requestedKey){map.dispose();return;}staticMaps.set(id,map);metrics.loaded.push(iceBase+'materials/'+id+'.png');metrics.decodedMiB+=map.image.width*map.image.height*4/1048576;}catch(e){if(signature===requestedKey)metrics.failures.push(id+': '+e.message);}})]);
    if(signature===requestedKey&&ids.includes('VINE_FRONT')){
     const map=await loadTexture('assets/gimmicks/vine-cover-v8.png');
     if(signature!==requestedKey){map.dispose();return;}
     const {width,height}=map.image;
     pool.set('VINE_CANOPY',map);entries.set('VINE_CANOPY',{durationMs:440,width,height,endBehavior:'clear',frames:[{index:0,rect:[0,0,width,height],durationMs:440}]});
     metrics.loaded.push('vine-cover-v8.png');metrics.decodedMiB+=width*height*4/1048576;
    }
    if(signature===requestedKey){
     // Upload and compile before the first release; shader compilation must not
     // consume the short closed/opening part of an actual gameplay event.
     if(renderer){
      const warmScene=new THREE.Scene(),materials=[];
      for(const [id,map]of pool){if(id.startsWith('STAR_')||id==='connection-trace'||id==='node-pulse')continue;renderer.initTexture(map);const material=new THREE.MeshBasicMaterial({map,transparent:true,depthTest:true,depthWrite:false,alphaTest:1/255,toneMapped:false});if(id==='VINE_FRONT'||id==='VINE_CANOPY'||id.startsWith('GATE_')||id.startsWith('ICE_CHIPS')||id==='ICE_BREAK_FLASH')attachSurfaceDepth(material,0);materials.push(material);const mesh=new THREE.Mesh(plane,material);mesh.frustumCulled=false;warmScene.add(mesh);}
      try{await renderer.compileAsync(warmScene,camera);if(signature===requestedKey)warmMaterials=materials;else materials.forEach(m=>m.dispose());}catch(e){materials.forEach(m=>m.dispose());throw e;}
     }
     if(signature===requestedKey){ready=true;wake(0);diagnostic();}
    }
   }catch(e){if(signature===requestedKey){metrics.failures.push(e.message);diagnostic();}}
  })();diagnostic();return loading;
 }
 function starBox(k){const b=window.GimmickArt.faceAt(k);return {x:b.x+b.w*.02,y:b.y+b.h*.02,w:b.w*.40};}
 function depthAt(k,height){const F=window.CubePopFrame,w=F.world(k%6*72,Math.floor(k/6)*72);return v.set(w.x,height,w.z).project(camera).z;}
 function point(x,y,z){return new THREE.Vector3(x/768-1,1-y/768,z).unproject(camera);}
 // Floor quads are ray-projected onto y=.012: their depth varies across the
 // plane, so falling/rotating cubes mask the actual silhouette, not a rectangle.
 function floorGeometry(box,angle=0){
  const c={x:box.x+box.w/2,y:box.y+box.h/2},p=[];
  for(const [x,y] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]]){
   const sx=x*box.w,sy=y*box.h,screen=point(c.x+sx*Math.cos(angle)-sy*Math.sin(angle),c.y+sx*Math.sin(angle)+sy*Math.cos(angle),.5);
   const ray=screen.sub(camera.position).normalize(),t=(.012-camera.position.y)/ray.y;p.push(camera.position.clone().addScaledVector(ray,t));
  }
  const g=plane.clone();g.setAttribute('position',new THREE.Float32BufferAttribute(p.flatMap(p=>p.toArray()),3));return g;
 }
 function billboard(mesh,box,k,height){const z=depthAt(k,height),c=point(box.x+box.w/2,box.y+box.h/2,z),right=point(box.x+box.w,box.y+box.h/2,z),top=point(box.x+box.w/2,box.y,z);mesh.position.copy(c);mesh.quaternion.copy(camera.quaternion);mesh.scale.set(c.distanceTo(right)*2,c.distanceTo(top)*2,1);}
 // Only pixels intersecting this cell's cube envelope use its near surface.
 // Outside it the sprite retains its original depth. Neighbouring geometry
 // still depth-tests normally, including moving/rotating front-row cubes.
 function attachSurfaceDepth(material,k){
  const p=window.CubePopFrame.world(k%6*72,Math.floor(k/6)*72);
  material.onBeforeCompile=shader=>{
   shader.uniforms.fxBoxMin={value:new THREE.Vector3(p.x-.5,0,p.z-.5)};
   shader.uniforms.fxBoxMax={value:new THREE.Vector3(p.x+.5,1,p.z+.5)};
   shader.uniforms.fxViewProjection={value:new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)};
   shader.vertexShader='varying vec3 fxWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nfxWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader='varying vec3 fxWorld;\nuniform vec3 fxBoxMin,fxBoxMax;\nuniform mat4 fxViewProjection;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
    vec3 ray=normalize(fxWorld-cameraPosition);
    vec3 safeRay=mix(vec3(0.000001),ray,step(vec3(0.000001),abs(ray)));
    vec3 t0=(fxBoxMin-cameraPosition)/safeRay,t1=(fxBoxMax-cameraPosition)/safeRay;
    vec3 nearT=min(t0,t1),farT=max(t0,t1);
    float enter=max(max(nearT.x,nearT.y),nearT.z),leave=min(min(farT.x,farT.y),farT.z);
    gl_FragDepth=gl_FragCoord.z;
    if(leave>=max(enter,0.0)){
     vec4 clip=fxViewProjection*vec4(cameraPosition+ray*(max(enter,0.0)-0.004),1.0);
     gl_FragDepth=clip.z/clip.w*0.5+0.5;
    }`);
  };
  material.customProgramCacheKey=()=> 'gimmick-cell-surface-v1';
 }
 function add(id,box,k,start,{height=.5,owner=null,floor=false,angle=0}={}){
  const entry=entries.get(id),texture=pool.get(id);if(!entry||!texture){metrics.skipped++;return null;}
  // Local 2D target lights share the 1536px board registration, below markers,
  // frame front and UI. They never enter the physical cube depth buffer.
  if(id.startsWith('STAR_')){
   ensureBadges();const item={id,k,owner,start,entry,duration:entry.durationMs,map:texture,mesh:{material:{opacity:1},visible:false},box,depth:'badge-overlay',frame:-1};
   instances.add(item);metrics.peakInstances=Math.max(metrics.peakInstances,instances.size);return item;
  }
  const map=texture.clone();map.needsUpdate=true;
  const material=new THREE.MeshBasicMaterial({map,transparent:true,depthTest:true,depthWrite:false,alphaTest:1/255,toneMapped:false,blending:THREE.NormalBlending});
  const surface=id==='VINE_FRONT'||id==='VINE_CANOPY'||id.startsWith('GATE_')||id.startsWith('ICE_CHIPS')||id==='ICE_BREAK_FLASH';
  if(surface)attachSurfaceDepth(material,k);
  const mesh=new THREE.Mesh(floor?floorGeometry(box,angle):plane,material);if(!floor)billboard(mesh,box,k,height);
  // Physical sprites retain depth testing; badge lights composite locally last.
  mesh.renderOrder=id==='ICE_BREAK_FLASH'?4:id.startsWith('ICE_CHIPS')?3:id==='GATE_SEAM_LIGHT'?1:id==='GATE_BODY'?2:id.startsWith('GATE_SEAL')?3:id==='GATE_RADIANCE'?4:1;
  const duration=id==='VINE_BACK'||id==='VINE_FRONT'?720:entry.durationMs;
  scene.add(mesh);const item={id,k,owner,start,entry,duration,map,mesh,box,depth:surface?'cell-surface':floor?'floor':height,frame:-1};instances.add(item);metrics.peakInstances=Math.max(metrics.peakInstances,instances.size);return item;
 }
 function setFrame(map,entry,frame){const [x,y,w,h]=frame.rect;map.repeat.set(w/entry.width,h/entry.height);map.offset.set(x/entry.width,1-(y+h)/entry.height);}
 function iceSample(owner,now){const i=ice.get(owner);if(!i)return null;const entry=entries.get(i.id),map=pool.get(i.id);if(!entry||!map)return null;
  if(now-i.start>=entry.durationMs){ice.delete(owner);return null;}const frame=P.frameAt(entry,now-i.start);return frame?{map,entry,frame}:null;
 }
 function event(before,event){
  if(event.type!=='clear')return;
  const key=session+':'+event.id;if(seen.has(key)){metrics.duplicates++;diagnostic();return;}seen.add(key);
  const now=performance.now(),plans=P.transition(before,event);metrics.events+=plans.length;
  metrics.history.push({event:event.id,at:now,plans:structuredClone(plans),reduced:reduced()});if(metrics.history.length>120)metrics.history.shift();
  for(const plan of plans){
   if(plan.kind==='complete'){
    if(!completed&&!reduced()&&pool.has('connection-trace')&&pool.has('node-pulse')){
     ensureBadges();completion={start:now,root:plan.root,nodes:plan.nodes};
     // The root prelight now owns the final ignition, avoiding doubled light.
     for(const i of [...instances])if(i.k===plan.root&&i.id.startsWith('STAR_'))remove(i);
     stars.delete(plan.root);
    }
    completed=true;continue;
   }
   if(reduced())continue;
   if(plan.kind==='gate'&&ready&&entries.has('GATE_BODY'))gateArrivals.set(plan.k,{k:plan.k,opened:now,owner:null,start:null});
   let old=plan.kind==='star'?starBox(plan.k):window.GimmickArt.at(plan.k);
   if(plan.kind==='vine'){
    // Preserve the exact full-canvas placement of the dense, sealed vine.
    const art=document.querySelector?.('#gimmickVines [data-cell="'+plan.k+'"]');
    if(art)old={x:Number(art.getAttribute('x')),y:Number(art.getAttribute('y')),w:Number(art.getAttribute('width')),h:Number(art.getAttribute('height'))};
    add('VINE_CANOPY',old,plan.k,now,{owner:plan.owner,height:.5});
   }
   for(const id of plan.ids){
    const e=entries.get(id);if(!e)continue;
    if(id.startsWith('ICE_UV')){ice.set(plan.owner,{id,start:now});continue;}
    const entity=window.CubePopVisualBridge?.entities().find(e=>e.logicId===plan.owner),hull=entity&&window.CubePopVisual?.outline(entity);
    const b=plan.kind==='ice'&&hull?.length?{x:Math.min(...hull.map(p=>p.x)),y:Math.min(...hull.map(p=>p.y)),w:Math.max(...hull.map(p=>p.x))-Math.min(...hull.map(p=>p.x))}:old;
    const item=add(id,P.registeredBox(e,b),plan.k,now+(e.startOffsetMs||0),{owner:plan.owner,height:id==='VINE_BACK'?.01:id==='VINE_FRONT'||id.startsWith('GATE_')?.5:plan.kind==='ice'?1.01:1.02});
    if(id==='ICE_BREAK_FLASH'&&item)item.mesh.material.opacity=plan.layers>0?e.variantOpacity.twoToOne:e.variantOpacity.oneToZero;
    if(id==='STAR_IGNITE'&&item){const previous=stars.get(plan.k);if(previous)remove(previous);stars.set(plan.k,item);}
   }
  }
  // The render clock owns playback; only the next large presentation may await its peak.
  const last=Math.max(0,...[...instances].map(i=>i.start+i.duration-now));wake(Math.max(last,completion?connectionTiming.duration:0)+30);diagnostic();
 }
 function sync(now){
  clearBadges();
  if(reduced())gateArrivals.clear();
  for(const [k,cue]of gateArrivals)if(cue.start!==null?now>=cue.start+240:now>=cue.opened+2200)gateArrivals.delete(k);
  for(const [owner,i] of ice)if(now-i.start>=(entries.get(i.id)?.durationMs||0))ice.delete(owner);
  if(reduced())ice.clear();
  for(const i of [...instances]){
   if(i.id.startsWith('ICE_')&&window.GimmickPlay?.displayState()?.cells[i.k]?.id!==i.owner){remove(i);continue;}
   if(reduced()&&(i.id.startsWith('STAR_')||i.entry.endBehavior==='clear')){if(i.id==='STAR_IGNITE')stars.delete(i.k);remove(i);continue;}
   if(reduced())i.start=Math.min(i.start,now-i.entry.durationMs);
   if(i.id==='STAR_IGNITE'&&now-i.start>=i.entry.durationMs){remove(i);stars.delete(i.k);continue;}
   const elapsed=now-i.start,frame=P.frameAt(i.entry,elapsed*i.entry.durationMs/i.duration);
   if(!frame){i.mesh.visible=false;if(now>=i.start+i.duration)remove(i);continue;}
   if(i.id==='VINE_CANOPY')i.mesh.material.opacity=P.vineCanopyOpacity(elapsed);
   else if(i.id==='VINE_FRONT'||i.id==='VINE_BACK')i.mesh.material.opacity=1-P.vineCanopyOpacity(elapsed);
   i.mesh.visible=true;if(i.frame!==frame.index){if(i.depth!=='badge-overlay')setFrame(i.map,i.entry,frame);i.frame=frame.index;}
   if(i.depth==='badge-overlay'&&badgeContext){
    const [x,y,w,h]=frame.rect,b=i.box;badgeContext.globalAlpha=i.mesh.material.opacity;
    badgeContext.drawImage(i.map.image,x,y,w,h,b.x,b.y,b.w,b.h);
    badgeContext.globalAlpha=1;
   }
  }
  if(completion){
   if(reduced()||now>=completion.start+connectionTiming.duration)endConnection();
   else {
    const points=completion.nodes.map(k=>{const b=starBox(k);return {k,x:b.x+b.w/2,y:b.y+b.w/2,size:b.w};});
    drawConnection(badgeContext,(now-completion.start)/connectionTiming.scale,connectionTree(points,completion.root),{
     line:{image:pool.get('connection-trace').image,entry:entries.get('connection-trace')},
     pulse:{image:pool.get('node-pulse').image,entry:entries.get('node-pulse')}
    });
   }
  }
  // Keep the approved lit badge readable throughout ignition and refill.
  diagnostic();
 }
 // Keep the original cube concealed through the closed part of the release.
 // This is visibility only: no extra gameplay wait and no replacement entity.
 function conceals(owner,now){return !reduced()&&[...instances].some(i=>i.id==='VINE_FRONT'&&i.owner===owner&&now>=i.start&&now-i.start<105);}
 // Bind exactly once to the real first arrival. Later replacements in the same
 // cell must never inherit the old gate's animation, even in a fast cascade.
 function observeState(state,now=performance.now()){
  if(reduced()){gateArrivals.clear();return;}
  for(const [k,cue]of gateArrivals){
   const cell=state.cells[k];
   if(cue.owner!==null){if(cell?.id!==cue.owner)gateArrivals.delete(k);}
   else if(cell){cue.owner=cell.id;cue.start=Math.max(cue.opened+520,now);wake(cue.start+270-now);}
  }
 }
 function gatePose(entity,now){
  if(reduced())return null;
  const cue=gateArrivals.get(entity.r*6+entity.c);
  return cue&&cue.owner===entity.logicId&&cue.start!==null?P.gatePopPose(now-cue.start):null;
 }
 function cancelStars(){endConnection();clearBadges();for(const i of [...instances])if(i.id.startsWith('STAR_'))remove(i);stars.clear();wake(0);diagnostic();}
 const api={prepare,reset,cancelStars,waitForStarPeak,event,sync,iceSample,conceals,observeState,gatePose,staticIce:layers=>staticMaps.get('ice-face-'+Math.min(2,layers)),setFrame,
  handles:id=>ready&&entries.has(id),stats:()=>JSON.parse(output.textContent)};
 window.GimmickFeedback=api;const state=window.GimmickPlay?.displayState();if(state)api.prepare(state);diagnostic();return api;
}

