/* v5 artwork on the unchanged v2 camera and untrimmed 1536px registration. */
(function(root){
 const size=1536,display=704,side=6.9,angle=75.3,distance=60,fov=8.86938172232338;
 const sin=Math.sin(angle*Math.PI/180),cos=Math.cos(angle*Math.PI/180),focal=768/Math.tan(fov*Math.PI/360);
 const cy=200+focal*(side/2)*sin/(distance+(side/2)*cos);
 function project(x,y,z){const depth=distance-z*cos-y*sin;return {x:768+focal*x/depth,y:cy+focal*(z*sin-y*cos)/depth};}
 function world(px,py){return {x:(px+32-212)/64,z:(py+32-212)/64};}
 function hitMatrix(){
  const origin=212/64,depth=distance+origin*cos-sin,s=display/size;
  const a=focal/64/depth*s,b=-768*cos/64/depth*s,c=(768*depth-focal*origin)/depth*s;
  const e=(-cy*cos+focal*sin)/64/depth*s,f=(cy*depth-focal*sin*origin-focal*cos)/depth*s,g=-cos/64/depth;
  return `matrix3d(${a},0,0,0,${b},${e},0,${g},0,0,1,0,${c},${f},0,1)`;
 }
 const api={approved:true,frameVersion:'v2',assetVersion:'v5',size,display,side,angle,distance,fov,sin,cos,focal,cy,project,world,hitMatrix};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.CubePopFrame=api;
})(typeof window==='object'?window:globalThis);
