import * as THREE from 'three';

// The approved full PNG canvas stays camera-facing, but now shares the real
// cubes' depth buffer. Transparent pixels neither color nor occlude the scene.
export function createVineRenderer(scene,camera,board,wake){
 const records=new Map(),geometry=new THREE.PlaneGeometry(1,1),v=new THREE.Vector3();
 let ready=false;
 const map=new THREE.TextureLoader().load('assets/gimmicks/vine-cover-v8.png',()=>{ready=true;board.classList.add('vines3d');wake(240);},undefined,()=>{});
 map.colorSpace=THREE.SRGBColorSpace;
 function sync(){
  const live=new Set();
  for(const art of document.querySelectorAll('#gimmickVines image')){
   live.add(art);let mesh=records.get(art);
   if(!mesh){mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:1/255,depthTest:true,depthWrite:true,toneMapped:false}));scene.add(mesh);records.set(art,mesh);}
   const k=Number(art.dataset.cell),F=window.CubePopFrame,w=F.world(k%6*72,Math.floor(k/6)*72);
   const z=v.set(w.x,.5,w.z).project(camera).z;
   const x=Number(art.getAttribute('x')),y=Number(art.getAttribute('y')),size=Number(art.getAttribute('width'));
   const center=new THREE.Vector3((x+size/2)/768-1,1-(y+size/2)/768,z).unproject(camera);
   const edge=new THREE.Vector3((x+size)/768-1,1-(y+size/2)/768,z).unproject(camera);
   mesh.position.copy(center);mesh.quaternion.copy(camera.quaternion);mesh.scale.setScalar(center.distanceTo(edge)*2);
   mesh.material.opacity=Number(getComputedStyle(art).opacity);mesh.visible=ready;
  }
  for(const [art,mesh]of records)if(!live.has(art)){scene.remove(mesh);mesh.material.dispose();records.delete(art);}
 }
 function stop(){board.classList.remove('vines3d');for(const mesh of records.values()){scene.remove(mesh);mesh.material.dispose();}records.clear();}
 return {sync,stop,stats:()=>({ready,count:records.size,depthTest:true,depthWrite:true,alphaTest:1/255})};
}
