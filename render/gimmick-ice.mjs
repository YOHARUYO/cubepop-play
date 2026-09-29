import * as THREE from 'three';
// UVs are normalized to the current atlas cell; atlas position must not change
// the frost opacity. A stable program key shares the compiled material program.
export function applyIceReadability(material){
 const uniforms={iceCell:{value:new THREE.Vector4(0,0,1,1)},iceRestMap:{value:null},iceRestWeight:{value:0}};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader='uniform vec4 iceCell;\nuniform sampler2D iceRestMap;\nuniform float iceRestWeight;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
   #ifdef USE_MAP
   vec2 iceUV=(vMapUv-iceCell.xy)/iceCell.zw;
   if(iceRestWeight>0.0){
    vec4 rest=texture2D(iceRestMap,iceUV);
    diffuseColor=mix(diffuseColor,vec4(rest.rgb,rest.a*opacity),iceRestWeight);
   }
   vec2 p=abs(iceUV-vec2(0.5))*2.0;
   float edge=smoothstep(0.58,0.94,max(p.x,p.y));
   float reflection=smoothstep(0.80,0.99,min(diffuseColor.r,min(diffuseColor.g,diffuseColor.b)));
   diffuseColor.a*=mix(0.32,0.87,max(edge,reflection));
   #endif`);
 };
 material.customProgramCacheKey=()=> 'ice-readability-v1';
 return uniforms;
}
// Actual geometry UVs, not a screen-facing frost card. Ownership follows the
// original entity, so a replenished cube cannot inherit an old ice sequence.
export function createIceRenderer(scene,camera,geometry,wake){
 const v=new THREE.Vector3(),pos=geometry.attributes.position,points=[],seen=new Set();
 for(let i=0;i<pos.count;i++){const p=[pos.getX(i),pos.getY(i),pos.getZ(i)],k=p.join(',');if(!seen.has(k)){seen.add(k);points.push(p);}}
 function sync(record,now){
  const fx=window.GimmickFeedback,layers=record.entity.ice||0;
  const sample=fx?.iceSample(record.entity.logicId,now),source=sample?.map||fx?.staticIce(layers);
  const visible=!!source&&(layers>0||!!sample)&&record.mesh.visible;
  if(!record.ice&&visible){record.ice=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false,alphaTest:1/255}));record.iceUniforms=applyIceReadability(record.ice.material);record.ice.renderOrder=2;scene.add(record.ice);}
  if(!record.ice)return;const shell=record.ice;shell.visible=visible;if(!visible)return;
  if(record.iceSource!==source){record.iceMap?.dispose();record.iceMap=source.clone();record.iceMap.needsUpdate=true;record.iceSource=source;shell.material.map=record.iceMap;shell.material.needsUpdate=true;}
  if(sample)fx.setFrame(record.iceMap,sample.entry,sample.frame);else{record.iceMap.repeat.set(1,1);record.iceMap.offset.set(0,0);}
  record.iceUniforms.iceCell.value.set(record.iceMap.offset.x,record.iceMap.offset.y,record.iceMap.repeat.x,record.iceMap.repeat.y);
  // Brief handoff within the existing event duration, never a gameplay wait.
  // This bridges the new still artwork to the approved older damage atlas.
  const ending=sample?.toLayers>0&&sample.elapsed>sample.duration-70;
  const rest=sample?fx.staticIce(ending?sample.toLayers:sample.fromLayers):source;
  record.iceUniforms.iceRestMap.value=rest||source;
  record.iceUniforms.iceRestWeight.value=sample&&rest?Math.max(0,Math.min(1,ending?(sample.elapsed-sample.duration+70)/70:1-sample.elapsed/60)):0;
  shell.position.copy(record.mesh.position);shell.quaternion.copy(record.mesh.quaternion);shell.scale.copy(record.mesh.scale);shell.material.opacity=record.materials[0].opacity;
 }
 function dispose(record){if(record.ice){scene.remove(record.ice);record.ice.material.dispose();record.iceMap?.dispose();}}
 function outline(record){record.mesh.updateMatrixWorld();const key=record.mesh.matrixWorld.elements.join(':');if(record.outlineKey===key)return record.outlinePoints;const p=points.map(a=>{v.set(...a).applyMatrix4(record.mesh.matrixWorld).project(camera);return {x:(v.x+1)*768,y:(1-v.y)*768};}).sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lo=[],hi=[];
  for(const a of p){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),a)<=0)lo.pop();lo.push(a);}for(const a of p.reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),a)<=0)hi.pop();hi.push(a);}record.outlineKey=key;record.outlinePoints=lo.slice(0,-1).concat(hi.slice(0,-1));return record.outlinePoints;
 }
 return {sync,dispose,outline};
}
