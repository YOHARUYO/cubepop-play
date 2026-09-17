/* Presentation only: theme loading, continuous map scenery and header geometry. */
(function(root){
  'use strict';
  if(root.__SIM)return;
  const T=root.CubePopThemes,rear=document.querySelector('.frameRear'),front=document.querySelector('.frameFront');
  const sc=document.getElementById('mapScroll'),head=document.querySelector('.mapHead');
  const title=head.querySelector('h2'),name=document.createElement('span');
  name.className='mapThemeName';title.appendChild(name);
  const mapLayer=document.createElement('div');mapLayer.className='themeMapEnvironment';mapLayer.setAttribute('aria-hidden','true');
  const floor=document.createElement('div');floor.className='themeMapFloor';
  const regions=document.createElement('div');regions.className='themeMapRegions';
  const scenery=document.createElement('div');scenery.className='themeMapScenery';
  mapLayer.append(floor,regions,scenery);document.body.appendChild(mapLayer);
  let mode='mHome',revision=0,layout=null,bannerTheme=null,candidate=null,stableTimer=null;
  const banners=new Map();
  // Decoded once, separate from the six atomic play-theme resources.
  const bannerReady=Promise.all(['sandstone','coast'].map(async id=>{
    const image=new Image();image.src='assets/home-map/map-banner-'+id+'.webp';
    try{await image.decode();banners.set(id,image.src);}catch(_){}
  }));
  const landscape=()=>root.innerWidth>root.innerHeight;
  const url=path=>'url("'+path+'")';
  function frames(c){
    if(rear.getAttribute('src')!==c.frame.rear)rear.src=c.frame.rear;
    if(front.getAttribute('src')!==c.frame.front)front.src=c.frame.front;
  }
  function reset(){delete document.body.dataset.playTheme;document.body.style.removeProperty('--theme-background');frames(T.resource('sandstone'));}
  function paintPlay(){
    const id=T.forStage(stageNo+1),c=T.resource(id);
    document.body.dataset.playTheme=id;
    document.body.style.setProperty('--theme-background',url(c.background[landscape()?'landscape':'portrait']));frames(c);
  }
  function measureHeader(){
    if(mode!=='mMap')return;
    const h=head.getBoundingClientRect().height;
    document.body.style.setProperty('--map-header-height',h+'px');
    scenery.style.height=Math.max(h,Math.min(320,root.innerWidth/3))+'px';
  }
  function commitBanner(id){
    bannerTheme=id;head.dataset.theme=id;
    name.textContent=id==='coast'?'산토리니 정원':'사암 정원';
    scenery.style.backgroundImage=banners.has(id)?url(banners.get(id)):'none';
    floor.style.backgroundImage=url(T.resource(id).background.portrait);
  }
  function considerBanner(id,immediate=false){
    if(immediate){clearTimeout(stableTimer);candidate=null;commitBanner(id);return;}
    if(id===bannerTheme){clearTimeout(stableTimer);candidate=null;return;}
    if(candidate===id)return;
    clearTimeout(stableTimer);candidate=id;
    stableTimer=setTimeout(()=>{if(mode==='mMap'&&candidate===id)commitBanner(id);candidate=null;},120);
  }
  function paintMap(){
    if(mode!=='mMap'||!layout)return;
    measureHeader();regions.replaceChildren();
    const r=sc.getBoundingClientRect(),center=sc.scrollTop+sc.clientHeight/2;
    let closest=1;
    for(let n=2;n<layout.points.length;n++)if(Math.abs(layout.points[n].y-center)<Math.abs(layout.points[closest].y-center))closest=n;
    considerBanner(T.forStage(closest));
    const fade=64;
    for(const region of T.regions(layout.points,layout.height)){
      const top=region.top-sc.scrollTop+r.top,bottom=region.bottom-sc.scrollTop+r.top;
      if(bottom<-fade||top>root.innerHeight+fade)continue;
      const layer=document.createElement('div');layer.className='themeMapRegion';layer.dataset.theme=region.theme;
      layer.dataset.contentTop=region.top;layer.dataset.contentBottom=region.bottom;
      layer.style.backgroundImage=url(T.resource(region.theme).background.portrait);
      layer.style.maskImage='linear-gradient(to bottom,transparent '+(top-fade)+'px,#000 '+(top+fade)+'px,#000 '+(bottom-fade)+'px,transparent '+(bottom+fade)+'px)';
      regions.appendChild(layer);
    }
  }
  async function refresh(){
    const ticket=++revision;
    if(mode==='mPlay'){
      paintPlay();await Promise.all([T.preload('sandstone'),T.preload(T.assigned(stageNo+1))]);
      if(ticket===revision&&mode==='mPlay')paintPlay();
    }else if(mode==='mMap'){
      reset();paintMap();
      await Promise.all([bannerReady,...[...new Set(Array.from({length:50},(_,i)=>T.assigned(i+1)))].map(T.preload)]);
      if(ticket!==revision||mode!=='mMap')return;
      document.querySelectorAll('.pnode').forEach(button=>{button.dataset.theme=T.forStage(Number(button.dataset.n));root.HomeMap.paintButton(button);});
      // Refresh an already selected header once its images have decoded.
      commitBanner(T.forStage(progress.unlocked));paintMap();
    }else reset();
  }
  const originalMode=setMode;setMode=function(next){
    originalMode(next);mode=next;clearTimeout(stableTimer);candidate=null;
    if(next==='mMap'){measureHeader();considerBanner(T.forStage(progress.unlocked),true);}
    refresh();
  };
  const originalSetup=setupStage;setupStage=function(...args){const result=originalSetup(...args);if(mode==='mPlay')refresh();return result;};
  root.CubePopThemeUI={mapLayout(next){layout=next;paintMap();},refresh};
  sc.addEventListener('scroll',paintMap,{passive:true});
  new ResizeObserver(()=>{measureHeader();paintMap();}).observe(head);
  root.addEventListener('resize',()=>{if(mode==='mPlay')paintPlay();else paintMap();});
})(window);
