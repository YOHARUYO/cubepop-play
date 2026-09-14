import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {chamferGeometry,MATERIAL_SLOTS,quarterTurn,glyphCorrection,geometryLift,APPROVED_LOOK} from './cube-geometry.mjs';
import {drawFace} from './face-art.mjs';
import {screenUprightAngle} from './screen-glyph.mjs';
const prototypeModule=window.CubePopFrame?.prototype?await import('./board-prototype.mjs'):null;

// One world, camera and transparent board canvas. DOM elements retain gameplay
// input and transition timing, projected onto the same physical upper-face plane.
export function createCubeVisuals(bridge){
  const layout=window.CubePopFrame,host=document.getElementById('boardScene'),board=document.getElementById('board');
  const approved=!!layout.approved,look=approved?APPROVED_LOOK.lighting:{env:.35,hemi:.7,key:2,fill:.7,rough:.4,coat:.18};
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;
  renderer.setPixelRatio(1);host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(layout.fov,1,.1,150);
  camera.position.set(0,layout.distance*layout.sin,layout.distance*layout.cos);camera.up.set(0,layout.cos,-layout.sin);camera.lookAt(0,0,0);
  camera.setViewOffset(1536,1536,0,768-layout.cy,1536,1536);camera.updateMatrixWorld();
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;scene.environmentIntensity=look.env;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fffaf3','#ad8c72',look.hemi));
  const key=new THREE.DirectionalLight('#fff8ea',look.key);key.position.set(-3.5,6,4);scene.add(key);
  const fill=new THREE.DirectionalLight('#e4f4ff',look.fill);fill.position.set(4,2,1);scene.add(fill);
  const scaffold=prototypeModule?prototypeModule.createBoardPrototype(scene):null;
  const geometry=chamferGeometry(),records=new Map(),textures=new Map();
  // Reveal incoming geometry at the rear floor edge instead of popping the
  // entire cube into view halfway through its last cell of travel.
  renderer.localClippingEnabled=true;
  let scheduled=false,until=0,lost=false,active=0,side=0;
  const stats={ready:true,contextCount:1,projection:'shared-board',renders:0,rolls:0,maxFrameMs:0};
  const output=document.createElement('output');output.id='cubeRenderState';output.hidden=true;document.body.append(output);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;
  const ctx=shadowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,6,32,32,32);
  gradient.addColorStop(0,'rgba(83,54,29,.3)');gradient.addColorStop(.5,'rgba(83,54,29,.14)');gradient.addColorStop(1,'rgba(83,54,29,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const shadowMap=new THREE.CanvasTexture(shadowCanvas),shadowGeometry=new THREE.PlaneGeometry(1.25,1.25);
  function diagnostic(){output.textContent=JSON.stringify({...stats,active,pending:scheduled?1:0,cubeCount:records.size,glyphMode:approved?'screen-fixed':'during-roll',frameMode:scaffold?'3d-prototype':`delivered-${layout.assetVersion||layout.frameVersion||'v1'}`,lighting:look,triangles:geometry.attributes.position.count/3,canvasSize:side,camera:{angle:Math.asin(layout.sin)*180/Math.PI,fov:layout.fov,position:camera.position.toArray(),principalY:layout.cy}});}
  function texture(face){
    const key=JSON.stringify(face);if(textures.has(key))return textures.get(key);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;drawFace(canvas.getContext('2d'),face.hex,face.index,face.mark);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.center.set(.5,.5);map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.set(key,map);return map;
  }
  function ensure(entity){
    if(records.has(entity))return records.get(entity);
    const entryPlane=new THREE.Plane(new THREE.Vector3(0,0,1),100),entryPlanes=[entryPlane];
    const materials=MATERIAL_SLOTS.map(()=>new THREE.MeshPhysicalMaterial({roughness:look.rough,metalness:0,clearcoat:look.coat,clearcoatRoughness:.4,specularIntensity:.9,transparent:true,clippingPlanes:entryPlanes}));
    const mesh=new THREE.Mesh(geometry,materials),shadow=new THREE.Mesh(shadowGeometry,new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,clippingPlanes:entryPlanes}));
    shadow.rotation.x=-Math.PI/2;scene.add(mesh,shadow);
    const record={entity,mesh,materials,shadow,entryPlane,key:'',turn:null,turnMaps:[],fixedMaps:[]};records.set(entity,record);entity.el.classList.add('renderedCube');return record;
  }
  function clearTurn(record){record.turn=null;record.turnMaps.forEach(t=>t.dispose());record.turnMaps=[];record.key='';}
  function sync(record,now){
    const {entity,mesh,materials,shadow}=record,style=getComputedStyle(entity.el),matrix=new DOMMatrix(style.transform==='none'?undefined:style.transform);
    const position=layout.world(matrix.m41,matrix.m42);let scale=Math.hypot(matrix.m11,matrix.m12)||.001,opacity=Number(style.opacity);
    // Only replenishment uses the entry boundary; approved in-place rolls
    // retain their complete geometry, including rear-row corner lifts.
    record.entryPlane.constant=entity.el.classList.contains('falling')?layout.side/2:100;
    const spawning=entity.el.classList.contains('spawning');
    if(spawning&&!record.spawning)record.spawnStart=now;
    record.spawning=spawning;
    if(spawning&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const t=Math.min(1,(now-record.spawnStart)/380),points=[[0,.05],[.55,1.32],[.78,.92],[1,1]];
      const i=points.findIndex((p,i)=>i>0&&t<=p[0]),a=points[Math.max(0,i-1)],b=points[Math.max(1,i)];
      const u=(t-a[0])/(b[0]-a[0]);scale*=a[1]+(b[1]-a[1])*u*u*(3-2*u);opacity*=Math.min(1,.15+t*2);
    }
    const faces=bridge.describe(entity),key=JSON.stringify(faces);
    if(record.key!==key){record.fixedMaps.forEach(map=>map.dispose());record.fixedMaps=[];MATERIAL_SLOTS.forEach((slot,i)=>{const base=texture(faces[slot]),map=approved?base.clone():base;if(approved){map.needsUpdate=true;record.fixedMaps.push(map);}materials[i].map=map;materials[i].needsUpdate=true;});record.key=key;}
    mesh.quaternion.identity();let lift=0;
    if(record.turn){
      const turn=record.turn,t=turn.fixed??Math.min(1,(now-turn.start)/turn.duration),eased=t*t*(3-2*t);
      mesh.quaternion.copy(quarterTurn(turn.direction,eased));lift=geometryLift(geometry,mesh.quaternion);
      if(!approved)MATERIAL_SLOTS.forEach((slot,i)=>{record.turnMaps[i].rotation=glyphCorrection(slot,turn.direction)*eased;materials[i].map=record.turnMaps[i];});
    }
    materials.forEach(m=>m.opacity=opacity);mesh.scale.setScalar(scale);mesh.position.set(position.x,.5*scale+lift,position.z);
    if(approved&&!entity.bomb)MATERIAL_SLOTS.forEach((slot,i)=>materials[i].map.rotation=screenUprightAngle(slot,mesh.quaternion,mesh.position,camera,scale));
    shadow.position.set(position.x+.06,.006,position.z+.09);shadow.scale.setScalar(scale);shadow.material.opacity=opacity*(1-Math.min(.7,lift));
    mesh.visible=shadow.visible=true;
  }
  function render(now=performance.now()){
    if(lost)return;const start=performance.now();
    for(const [entity,record] of records){
      if(!entity.el.isConnected){scene.remove(record.mesh,record.shadow);clearTurn(record);record.fixedMaps.forEach(map=>map.dispose());record.materials.forEach(m=>m.dispose());record.shadow.material.dispose();records.delete(entity);continue;}
      sync(record,now);
    }
    renderer.render(scene,camera);stats.renders++;stats.maxFrameMs=Math.max(stats.maxFrameMs,performance.now()-start);
    bridge.onFrame?.({time:performance.now(),canvas:renderer.domElement,cubes:[...records.values()].map(r=>({el:r.entity.el,row:r.entity.r,col:r.entity.c,visible:r.mesh.visible&&r.mesh.position.z+r.mesh.scale.z/2>=-layout.side/2,y:r.mesh.position.y,z:r.mesh.position.z,scale:r.mesh.scale.x}))});
  }
  function tick(now){scheduled=false;render(now);if(now<until||active){scheduled=true;requestAnimationFrame(tick);}diagnostic();}
  function wake(duration=500){if(lost)return;until=Math.max(until,performance.now()+duration);if(!scheduled){scheduled=true;requestAnimationFrame(tick);}}
  function paint(entity){if(lost)return;ensure(entity);wake();}
  function setTurn(record,direction,extra){
    clearTurn(record);const faces=bridge.describe(record.entity);
    if(!approved)record.turnMaps=MATERIAL_SLOTS.map(slot=>{const map=texture(faces[slot]).clone();map.needsUpdate=true;return map;});
    record.turn={direction,...extra};
  }
  function roll(entity,direction){
    const record=ensure(entity),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?1:300;
    setTurn(record,direction,{start:performance.now(),duration});active++;entity.el.classList.add('rolling3d');wake(duration);
    // The state machine still awaits the visual turn. End frame is upright already.
    return new Promise(resolve=>setTimeout(()=>{render(performance.now());clearTurn(record);active--;stats.rolls++;entity.el.classList.remove('rolling3d');resolve();wake();},duration));
  }
  function resize(){
    const width=host.getBoundingClientRect().width;if(!width)return;
    const next=Math.max(384,Math.min(1408,Math.round(width*Math.min(devicePixelRatio,2))));
    if(side!==next){side=next;renderer.setSize(side,side,false);}wake(0);
  }
  new ResizeObserver(resize).observe(host);
  const observer=new MutationObserver(()=>wake());observer.observe(document.getElementById('boardInner'),{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;stats.ready=false;window.CubePopVisual=null;board.classList.remove('board3d');for(const entity of records.keys())entity.el.classList.remove('renderedCube');host.hidden=true;observer.disconnect();diagnostic();});
  board.classList.add('board3d');for(const entity of bridge.entities())paint(entity);resize();
  const api={paint,roll,wake,diagnostic,preview:(entity,direction,t)=>{const record=ensure(entity);if(direction)setTurn(record,direction,{fixed:t});else clearTurn(record);render();},captureLayers:()=>{
    if(!scaffold)return null;
    renderer.setSize(1536,1536,false);render();const composite=renderer.domElement.toDataURL('image/png');
    scaffold.visible=false;renderer.render(scene,camera);const cubes=renderer.domElement.toDataURL('image/png');
    scaffold.visible=true;for(const record of records.values()){record.mesh.visible=false;record.shadow.visible=false;}
    renderer.render(scene,camera);const frame=renderer.domElement.toDataURL('image/png');
    renderer.setSize(side,side,false);render();return {composite,cubes,frame};
  }};
  diagnostic();return api;
}
try{window.CubePopVisual=createCubeVisuals(window.CubePopVisualBridge);}
catch(error){console.warn('Cube renderer unavailable; using the existing game view.',error);}
