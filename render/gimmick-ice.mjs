import * as THREE from 'three';
// Actual geometry UVs, not a screen-facing frost card. Ownership follows the
// original entity, so a replenished cube cannot inherit an old ice sequence.
export function createIceRenderer(scene,camera,geometry,wake){
 const v=new THREE.Vector3(),pos=geometry.attributes.position,points=[],seen=new Set();
 for(let i=0;i<pos.count;i++){const p=[pos.getX(i),pos.getY(i),pos.getZ(i)],k=p.join(',');if(!seen.has(k)){seen.add(k);points.push(p);}}
 function sync(record,now){
  const fx=window.GimmickFeedback,layers=record.entity.ice||0;
  const sample=fx?.iceSample(record.entity.logicId,now),source=sample?.map||fx?.staticIce(layers);
  const visible=!!source&&(layers>0||!!sample)&&record.mesh.visible;
  if(!record.ice&&visible){record.ice=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,toneMapped:false,alphaTest:1/255}));record.ice.renderOrder=2;scene.add(record.ice);}
  if(!record.ice)return;const shell=record.ice;shell.visible=visible;if(!visible)return;
  if(record.iceSource!==source){record.iceMap?.dispose();record.iceMap=source.clone();record.iceMap.needsUpdate=true;record.iceSource=source;shell.material.map=record.iceMap;shell.material.needsUpdate=true;}
  if(sample)fx.setFrame(record.iceMap,sample.entry,sample.frame);else{record.iceMap.repeat.set(1,1);record.iceMap.offset.set(0,0);}
  shell.position.copy(record.mesh.position);shell.quaternion.copy(record.mesh.quaternion);shell.scale.copy(record.mesh.scale);shell.material.opacity=record.materials[0].opacity;
 }
 function dispose(record){if(record.ice){scene.remove(record.ice);record.ice.material.dispose();record.iceMap?.dispose();}}
 function outline(record){record.mesh.updateMatrixWorld();const key=record.mesh.matrixWorld.elements.join(':');if(record.outlineKey===key)return record.outlinePoints;const p=points.map(a=>{v.set(...a).applyMatrix4(record.mesh.matrixWorld).project(camera);return {x:(v.x+1)*768,y:(1-v.y)*768};}).sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lo=[],hi=[];
  for(const a of p){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),a)<=0)lo.pop();lo.push(a);}for(const a of p.reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),a)<=0)hi.pop();hi.push(a);}record.outlineKey=key;record.outlinePoints=lo.slice(0,-1).concat(hi.slice(0,-1));return record.outlinePoints;
 }
 return {sync,dispose,outline};
}
