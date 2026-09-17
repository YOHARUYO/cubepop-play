/* Presentation resources and map boundaries, independent of game decisions. */
(function(root){
  'use strict';
  function create(catalog,assignments,loadImage){
    const loaded=new Set(),pending=new Map(),errors=new Map();
    for(let i=0;i<assignments.length;i++){
      const a=assignments[i];
      if(!Number.isInteger(a.from)||!Number.isInteger(a.to)||a.from<1||a.to>50||a.from>a.to||!catalog[a.theme])throw Error('Invalid stage theme assignment');
      if(assignments.slice(0,i).some(b=>a.from<=b.to&&b.from<=a.to))throw Error('Overlapping stage theme assignments');
    }
    const assigned=n=>Number.isInteger(n)&&n>=1&&n<=50?(assignments.find(a=>n>=a.from&&n<=a.to)?.theme||'sandstone'):'sandstone';
    const effective=id=>catalog[id]?.ready&&loaded.has(id)?id:'sandstone';
    const forStage=n=>effective(assigned(n));
    const resource=id=>{
      const c=catalog[effective(id)];
      // The original courtyard stays usable while the new orientation pair loads,
      // and remains the fallback if either new background fails.
      return c===catalog.sandstone&&!loaded.has('sandstone')&&c.fallbackBackground
        ?{...c,background:{portrait:c.fallbackBackground,landscape:c.fallbackBackground}}:c;
    };
    async function preload(id){
      if(!catalog[id]?.ready)return 'sandstone';
      if(loaded.has(id))return id;
      if(!pending.has(id)){
        const c=catalog[id],paths=[...new Set([...Object.values(c.background),...Object.values(c.frame),...Object.values(c.nodes)])];
        pending.set(id,Promise.all(paths.map(loadImage)).then(()=>{loaded.add(id);return id;}).catch(error=>{errors.set(id,String(error));return 'sandstone';}));
      }
      return pending.get(id);
    }
    function regions(points,height){
      const result=[];let first=1;
      for(let n=1;n<points.length;n++){
        const id=forStage(n);
        if(n+1<points.length&&forStage(n+1)===id)continue;
        // Map progresses bottom to top. Boundaries lie between actual node centers.
        const top=n+1<points.length?(points[n].y+points[n+1].y)/2:0;
        const bottom=first>1?(points[first].y+points[first-1].y)/2:height;
        result.push({theme:id,from:first,to:n,top,bottom});first=n+1;
      }
      return result;
    }
    function node(id,gold){
      const theme=effective(id),c=catalog[theme],state=gold?'gold':'ivory';
      return {theme,state,path:c.nodes[state],window:c.nodeWindow,key:[theme,c.revision,state,c.nodes[state]].join(':')};
    }
    return {assigned,effective,forStage,resource,preload,regions,node,errors};
  }
  function loadImage(path){return new Promise((resolve,reject)=>{
    const img=new root.Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Theme asset failed: '+path));img.src=path;
  });}
  root.CubePopThemes=create(root.CubePopThemeCatalog||{},root.CubePopStageThemes||[],loadImage);
  if(typeof module==='object')module.exports={create};
})(typeof window==='object'?window:globalThis);
