/* Original PNGs remain intact. SVG only positions their source windows. */
(function(root){
  'use strict';
  const windows={
    'button-gold':[2172,724,146,117,1881,490],
    'button-ivory':[2172,724,106,134,1960,452],
    'node-gold':[1254,1254,149,175,957,915],
    'node-ivory':[1254,1254,173,194,908,869]
  };
  function plan(width,height,square,gold,theme='sandstone'){
    const id=(square?'node-':'button-')+(gold?'gold':'ivory');
    const node=square?root.CubePopThemes?.node(theme,gold):null;
    const path=node?.path||'assets/home-map/'+id+'.png',key=node?.key||'sandstone:'+id;
    const [iw,ih,x,y,w,h]=node?.window||windows[id],dh=height+7;
    if(square){const k=Math.min(width/w,dh/h);return {id,iw,ih,path,key,theme:node?.theme||'sandstone',parts:[[x,y,w,h,(width-w*k)/2,(dh-h*k)/2,w*k,h*k]]};}
    const k=dh/h,cap=350*k,mid=width-2*cap,sw=w-700,e=.6;
    if(mid<16)throw Error('Horizontal surface needs wider click box');
    return {id,iw,ih,path,key,theme:'sandstone',parts:[[x,y,350+e/k,h,0,0,cap+e,dh],[x+350,y,sw+e*sw/mid,h,cap,0,mid+e,dh],[x+w-350,y,350,h,width-cap,0,cap,dh]]};
  }
  function svg(width,height,square,gold,theme='sandstone'){
    const p=plan(width,height,square,gold,theme);
    // Keep the 0.6px sampling extension, but clip adjoining translucent strips
    // to exclusive display slots so their alpha is not composited twice.
    return '<svg xmlns="http://www.w3.org/2000/svg" class="hmSurface" aria-hidden="true" focusable="false" width="'+width+'" height="'+(height+7)+'" data-asset="'+p.id+'" data-theme="'+p.theme+'">'+p.parts.map(([sx,sy,sw,sh,x,y,w,h],i)=>{
      const slot=square?w:(p.parts[i+1]?.[4]??width)-x;
      return '<svg x="'+x+'" y="'+y+'" width="'+slot+'" height="'+h+'" overflow="hidden"><svg width="'+w+'" height="'+h+'" viewBox="'+[sx,sy,sw,sh].join(' ')+'" preserveAspectRatio="none" overflow="hidden"><image href="'+p.path+'" width="'+p.iw+'" height="'+p.ih+'"/></svg></svg>';
    }).join('')+'</svg>';
  }
  const images=new Map(),rasters=new Map();
  function raster(width,height,square,gold,pixelRatio=root.devicePixelRatio||1,theme='sandstone'){
    if(!root.Image)return null;
    const dpr=Math.min(3,pixelRatio),p=plan(width,height,square,gold,theme),key=[width,height,p.key,dpr].join(':');
    if(rasters.has(key))return rasters.get(key);
    if(!images.has(p.key))images.set(p.key,new Promise((resolve,reject)=>{const img=new root.Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=p.path;}));
    const result=images.get(p.key).then(img=>{
      const canvas=document.createElement('canvas'),temp=document.createElement('canvas');
      canvas.width=temp.width=Math.ceil(width*dpr);canvas.height=temp.height=Math.ceil((height+7)*dpr);
      const ctx=canvas.getContext('2d'),sample=temp.getContext('2d',{willReadFrequently:true});
      if(square){const [sx,sy,sw,sh,x,y,w,h]=p.parts[0];ctx.drawImage(img,sx,sy,sw,sh,x*dpr,y*dpr,w*dpr,h*dpr);}
      else{
        const layers=p.parts.map(([sx,sy,sw,sh,x,y,w,h])=>{
          sample.clearRect(0,0,temp.width,temp.height);
          // Extend samples on both sides before selecting one layer per pixel.
          // This avoids both source-over darkening and antialiased clip gaps.
          const e=.6,ratio=sw/w;
          sample.drawImage(img,sx-e*ratio,sy,sw+2*e*ratio,sh,(x-e)*dpr,y*dpr,(w+2*e)*dpr,h*dpr);
          return sample.getImageData(0,0,temp.width,temp.height).data;
        });
        const output=ctx.createImageData(canvas.width,canvas.height);
        for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
          const cx=(x+.5)/dpr,i=cx<p.parts[1][4]?0:cx<p.parts[2][4]?1:2,pos=(y*canvas.width+x)*4;
          output.data.set(layers[i].subarray(pos,pos+4),pos);
        }
        ctx.putImageData(output,0,0);
      }
      return canvas.toDataURL('image/png');
    });
    // A resize only needs the shared sizes visible now; don't retain unbounded history.
    if(rasters.size>80)rasters.clear();rasters.set(key,result);return result;
  }
  root.HomeMapSurfaces={plan,svg,raster,windows};
  if(typeof module==='object')module.exports=root.HomeMapSurfaces;
})(typeof window==='object'?window:globalThis);
