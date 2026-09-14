import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Gameplay U is the upper playing face; the six logical directions remain unchanged.
export const SLOT_NORMALS={U:[0,1,0],D:[0,-1,0],N:[0,0,-1],S:[0,0,1],E:[1,0,0],W:[-1,0,0]};
export const MATERIAL_SLOTS=['E','W','U','D','S','N'];
export const FACE_COLORS=[4,3,5,1,2,0];
export const COLORS=['#f45c70','#f8c54d','#09c6aa','#3ebde8','#b68aee','#f79b58'];
export const SYMBOLS=['●','▲','■','★','◆','♥'];
export const NAMES=['빨강','노랑','초록','하늘','보라','주황'];
export const IDENTITY={U:0,D:1,N:2,S:3,E:4,W:5};
export const CAMERA_CONFIG={concept:{fov:28,position:[1.7,2.15,3.05],target:[0,.06,0]},play:{fov:23,position:[.12,4.5,1.45],target:[0,-.05,0]}};
// User-approved board look, 2026-09-09. The production frame migration is separate.
export const APPROVED_LOOK=Object.freeze({angle:75.3,glyph:'fixed',gap:1.125,lighting:Object.freeze({key:3.7,fill:1.9,hemi:.8,env:.2,rough:.6,coat:.5})});
export function quarterTurn(direction,amount=1){
  const axis=direction==='N'||direction==='S'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1);
  const sign=direction==='N'||direction==='E'?-1:1;
  return new THREE.Quaternion().setFromAxisAngle(axis,sign*Math.PI/2*amount);
}
export function cubeGeometry(radius=.05){return new RoundedBoxGeometry(1,1,1,6,radius);}
// A narrow planar chamfer, rounded only at its transitions. Six color groups remain.
export function chamferGeometry(bevel=.085,fillet=.018){
  const steps=24,base=new THREE.BoxGeometry(1,1,1,steps,steps,steps),g=base.toNonIndexed();base.dispose();
  const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,a=.5-bevel-fillet;
  const edge=[0,.30,.37,.40,.42,.44,.455,.467,.478,.486,.492,.497,.5];
  for(let i=0;i<p.count;i++){
    const original=[p.getX(i),p.getY(i),p.getZ(i)];
    const v=original.map(x=>Math.sign(x)*edge[Math.round(Math.abs(x)*steps)]);
    const excess=v.map(x=>Math.max(0,Math.abs(x)-a)),sorted=[...excess].sort((x,y)=>y-x);
    let sum=0,threshold=0;
    for(let j=0;j<3;j++){sum+=sorted[j];const t=(sum-bevel)/(j+1);if(j===2||t>=sorted[j+1]){threshold=t;break;}}
    const core=v.map((x,j)=>Math.sign(x)*(Math.min(Math.abs(x),a)+Math.max(0,excess[j]-threshold)));
    const normal=new THREE.Vector3(...v.map((x,j)=>x-core[j])).normalize();
    const out=core.map((x,j)=>x+fillet*normal.getComponent(j));p.setXYZ(i,...out);n.setXYZ(i,normal.x,normal.y,normal.z);
    const side=Math.floor(i/(p.count/6)),[x,y,z]=out;
    const coords=[[.5-z,y+.5],[z+.5,y+.5],[x+.5,.5-z],[x+.5,z+.5],[x+.5,y+.5],[.5-x,y+.5]][side];uv.setXY(i,...coords);
  }
  return g;
}
export function orientationQuaternion(orientation){
  const axis=face=>new THREE.Vector3(...SLOT_NORMALS[Object.keys(orientation).find(slot=>orientation[slot]===face)]);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(axis(4),axis(0),axis(3)));
}
export const FACE_UP={U:[0,0,-1],D:[0,0,1],N:[0,1,0],S:[0,1,0],E:[0,1,0],W:[0,1,0]};
// Complete the glyph's in-plane correction before the cube settles.
export function glyphCorrection(slot,direction){
  const q=quarterTurn(direction),normal=new THREE.Vector3(...SLOT_NORMALS[slot]);
  const destination=Object.keys(SLOT_NORMALS).find(s=>new THREE.Vector3(...SLOT_NORMALS[s]).distanceTo(normal.clone().applyQuaternion(q))<1e-6);
  const up=new THREE.Vector3(...FACE_UP[slot]),right=new THREE.Vector3().crossVectors(up,normal);
  const wanted=new THREE.Vector3(...FACE_UP[destination]).applyQuaternion(q.invert());
  return Math.atan2(-wanted.dot(right),wanted.dot(up));
}
export function geometryLift(geometry,quaternion){
  const p=geometry.attributes.position,v=new THREE.Vector3();let min=Infinity;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyQuaternion(quaternion);min=Math.min(min,v.y);}
  return -.5-min;
}
export function rollLift(radius,amount){const angle=amount*Math.PI/2;return (.5-radius)*(Math.cos(angle)+Math.sin(angle)-1);}
export function colorsForOrientation(orientation){return MATERIAL_SLOTS.map(slot=>FACE_COLORS[orientation[slot]]);}
