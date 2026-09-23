/* Presentation resources and map boundaries, independent of game decisions. */
(function(root){
  'use strict';
  function create(catalog,assignments,loadImage){
    const loaded=new Set(),mobileLoaded=new Set(),pending=new Map(),errors=new Map();
    const assetUrl=path=>{
      const c=Object.values(catalog).find(c=>[...Object.values(c.background),...Object.values(c.frame),c.banner,c.fallbackBackground].includes(path));
      return c?.revision?path+(path.includes('?')?'&':'?')+'v='+encodeURIComponent(c.revision):path;
    };
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
      if(c===catalog.sandstone&&!loaded.has('sandstone')&&c.fallbackBackground)
        return {...c,banner:c.fallbackBackground,background:{portrait:c.fallbackBackground,landscape:c.fallbackBackground}};
      if(c.background.mobile&&!mobileLoaded.has(effective(id))){
        const {mobile,...background}=c.background;return {...c,background};
      }
      return c;
    };
    function backgroundFor(id,width,height){
      const c=resource(id),kind=width>height?'landscape':width<height&&width<=599&&c.background.mobile?'mobile':'portrait';
      return {kind,path:c.background[kind]};
    }
    async function preload(id){
      if(!catalog[id]?.ready)return 'sandstone';
      if(loaded.has(id))return id;
      if(!pending.has(id)){
        const c=catalog[id],paths=[...new Set([c.background.portrait,c.background.landscape,...Object.values(c.frame),...Object.values(c.nodes),c.banner].filter(Boolean))];
        const required=Promise.all(paths.map(path=>loadImage(path,c.revision)));
        // A mobile-only failure must not discard an otherwise valid theme set.
        const optional=c.background.mobile?loadImage(c.background.mobile,c.revision).then(()=>mobileLoaded.add(id)).catch(error=>errors.set(id+':mobile',String(error))):Promise.resolve();
        pending.set(id,Promise.all([required,optional]).then(()=>{loaded.add(id);return id;}).catch(error=>{errors.set(id,String(error));return 'sandstone';}));
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
    return {assigned,effective,forStage,resource,preload,backgroundFor,assetUrl,regions,node,errors};
  }
  function loadImage(path,revision){return new Promise((resolve,reject)=>{
    const img=new root.Image();img.onload=()=>{if(img.decode)img.decode().then(()=>resolve(img),reject);else resolve(img);};img.onerror=()=>reject(Error('Theme asset failed: '+path));img.src=path+(path.includes('?')?'&':'?')+'v='+encodeURIComponent(revision);
  });}
  root.CubePopThemes=create(root.CubePopThemeCatalog||{},root.CubePopStageThemes||[],loadImage);
  if(typeof module==='object')module.exports={create};
})(typeof window==='object'?window:globalThis);
