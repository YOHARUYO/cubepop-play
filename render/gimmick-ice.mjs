import * as THREE from 'three';
// Same geometry, camera and depth buffer as the cube: screen-aligned texture
// coordinates cannot expand the silhouette or paint over a nearer cube.
export function createIceRenderer(scene,camera,geometry,wake){
 const loader=new THREE.TextureLoader(),maps={};
 for(const name of ['rim-1','rim-2','frost-30','frost-50']){maps[name]=loader.load('assets/gimmicks/polish-v13/ice/'+name+'.png',()=>wake(0),undefined,()=>{});maps[name].colorSpace=THREE.SRGBColorSpace;}
 const v=new THREE.Vector3(),pos=geometry.attributes.position,points=[];
 const seen=new Set();for(let i=0;i<pos.count;i++){const p=[pos.getX(i),pos.getY(i),pos.getZ(i)],k=p.join(',');if(!seen.has(k)){seen.add(k);points.push(p);}}
 function material(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false,uniforms:{rim:{value:maps['rim-1']},oldRim:{value:maps['rim-2']},blend:{value:1},frost:{value:maps['frost-30']},bounds:{value:new THREE.Vector4()},film:{value:.075},strength:{value:.6},alpha:{value:1}},
  vertexShader:'varying vec4 clip;void main(){clip=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=clip;}',
  fragmentShader:`uniform sampler2D rim;uniform sampler2D oldRim;uniform float blend;uniform sampler2D frost;uniform vec4 bounds;uniform float film;uniform float strength;uniform float alpha;varying vec4 clip;
   void main(){vec2 p=clip.xy/clip.w;vec2 uv=(p-bounds.xy)/bounds.zw;vec4 f=texture2D(frost,uv);f.a*=strength;vec4 r=mix(texture2D(oldRim,uv),texture2D(rim,uv),blend);float a=film+f.a*(1.0-film);vec3 color=(vec3(.64,.9,1.0)*film*(1.0-f.a)+f.rgb*f.a);color=color*(1.0-r.a)+r.rgb*r.a;a=a*(1.0-r.a)+r.a;gl_FragColor=vec4(color/max(a,.001),a*alpha);
   #include <colorspace_fragment>
   }`
 });}
 function sync(record,now){const layers=record.entity.ice||0;
  if(!record.ice&&layers){record.ice=new THREE.Mesh(geometry,material());record.ice.renderOrder=3;scene.add(record.ice);}
  if(!record.ice)return;
  if(record.iceLayers!==layers){record.iceFrom=record.iceLayers||layers;record.iceLayers=layers;record.iceTime=now;}
  const elapsed=now-record.iceTime,fade=layers===0&&record.iceFrom>0&&elapsed<220&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shell=record.ice;shell.visible=(layers>0||fade)&&record.mesh.visible;if(!shell.visible)return;
  shell.position.copy(record.mesh.position);shell.quaternion.copy(record.mesh.quaternion);shell.scale.copy(record.mesh.scale);shell.updateMatrixWorld();
  if(record.iceBoundsKey!==shell.position.toArray().join(':')){
   let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of points){v.set(...p).applyMatrix4(shell.matrixWorld).project(camera);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);}
   shell.material.uniforms.bounds.value.set(x0,y0,x1-x0,y1-y0);record.iceBoundsKey=shell.position.toArray().join(':');
  }
  const shown=layers||record.iceFrom,u=shell.material.uniforms;u.rim.value=maps['rim-'+Math.min(2,shown)];u.frost.value=maps[shown===2?'frost-50':'frost-30'];u.film.value=0;u.strength.value=1;u.alpha.value=fade?1-elapsed/220:1;
  u.blend.value=record.iceFrom===2&&layers===1&&!matchMedia('(prefers-reduced-motion: reduce)').matches?Math.min(1,elapsed/240):1;
 }
 function dispose(record){if(record.ice){scene.remove(record.ice);record.ice.material.dispose();}}
 function outline(record){record.mesh.updateMatrixWorld();const key=record.mesh.matrixWorld.elements.join(':');if(record.outlineKey===key)return record.outlinePoints;const p=points.map(a=>{v.set(...a).applyMatrix4(record.mesh.matrixWorld).project(camera);return {x:(v.x+1)*768,y:(1-v.y)*768};}).sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lo=[],hi=[];
  for(const a of p){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),a)<=0)lo.pop();lo.push(a);}for(const a of p.reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),a)<=0)hi.pop();hi.push(a);}record.outlineKey=key;record.outlinePoints=lo.slice(0,-1).concat(hi.slice(0,-1));return record.outlinePoints;
 }
 return {sync,dispose,outline};
}

