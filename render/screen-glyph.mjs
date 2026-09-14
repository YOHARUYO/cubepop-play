import * as THREE from 'three';
import {SLOT_NORMALS,FACE_UP} from './cube-geometry.mjs';
// Keep the projected vertical axis of the symbol upright on its real face.
// Perspective gradients account for off-center cubes as well as central ones.
export function screenUprightAngle(slot,quaternion,center,camera,scale=1){
 const localNormal=new THREE.Vector3(...SLOT_NORMALS[slot]),normal=localNormal.clone().applyQuaternion(quaternion);
 const faceCenter=localNormal.clone().multiplyScalar(.5*scale).applyQuaternion(quaternion).add(center);
 const p=faceCenter.clone().applyMatrix4(camera.matrixWorldInverse),e=camera.matrixWorld.elements;
 const horizontal=new THREE.Vector3(e[0],e[1],e[2]).multiplyScalar(-p.z).addScaledVector(new THREE.Vector3(e[8],e[9],e[10]),p.x);
 const vertical=new THREE.Vector3(e[4],e[5],e[6]).multiplyScalar(-p.z).addScaledVector(new THREE.Vector3(e[8],e[9],e[10]),p.y);
 const wanted=new THREE.Vector3().crossVectors(normal,horizontal);
 if(wanted.lengthSq()<1e-10)return 0;
 if(wanted.dot(vertical)<0)wanted.negate();
 wanted.normalize().applyQuaternion(quaternion.clone().invert());
 const up=new THREE.Vector3(...FACE_UP[slot]),right=new THREE.Vector3().crossVectors(up,localNormal);
 return Math.atan2(-wanted.dot(right),wanted.dot(up));
}
