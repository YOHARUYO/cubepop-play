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
  const sceneryBase=document.createElement('div'),sceneryNext=document.createElement('div'),floorNext=document.createElement('div');
  sceneryBase.className='themeSceneryImage';sceneryNext.className='themeSceneryImage themeIncoming';floorNext.className='themeFloorImage themeIncoming';
  scenery.append(sceneryBase,sceneryNext);floor.appendChild(floorNext);
  mapLayer.append(floor,regions,scenery);document.body.appendChild(mapLayer);
  let mode='mHome',revision=0,layout=null,bannerTheme=null,candidate=null,stableTimer=null;
  const reduced=root.matchMedia('(prefers-reduced-motion: reduce)');
  let fades=[],fadeGeneration=0,queuedBanner=null,bannerKey=null;
  const url=path=>'url("'+T.assetUrl(path)+'")';
  function frames(c){
    const r=T.assetUrl(c.frame.rear),f=T.assetUrl(c.frame.front);
    if(rear.getAttribute('src')!==r)rear.src=r;
    if(front.getAttribute('src')!==f)front.src=f;
  }
  function reset(){delete document.body.dataset.playTheme;delete document.body.dataset.playBackground;document.body.style.removeProperty('--theme-background');frames(T.resource('sandstone'));}
  function paintPlay(){
    const id=T.forStage(stageNo+1),c=T.resource(id);
    const bg=T.backgroundFor(id,root.innerWidth,root.innerHeight);
    document.body.dataset.playTheme=id;
    document.body.dataset.playBackground=bg.kind;
    document.body.style.setProperty('--theme-background',url(bg.path));frames(c);
  }
  function measureHeader(){
    if(mode!=='mMap')return;
    const h=head.getBoundingClientRect().height;
    document.body.style.setProperty('--map-header-height',h+'px');
    scenery.style.height=Math.max(h,Math.min(320,root.innerWidth/3))+'px';
  }
  function settleBanner(){
    ++fadeGeneration;
    for(const a of fades)a.cancel();fades=[];queuedBanner=null;
    if(bannerTheme){const c=T.resource(bannerTheme);sceneryBase.style.backgroundImage=url(c.banner);floor.style.backgroundImage=url(c.background.portrait);}
    sceneryNext.style.opacity=floorNext.style.opacity='0';delete scenery.dataset.transitioning;
  }
  function commitBanner(id,immediate=false){
    const c=T.resource(id),key=[id,c.revision,c.banner,c.background.portrait].join(':');
    // Finish the current blend, then visit only the latest stable target. Two
    // opaque scenery layers avoid a dark dip and remain bounded during fast scrolling.
    if(fades.length&&!immediate&&!reduced.matches){queuedBanner=id;return;}
    if(key===bannerKey&&!immediate)return;
    const animate=bannerTheme!==null&&id!==bannerTheme&&!immediate&&!reduced.matches;
    settleBanner();bannerTheme=id;bannerKey=key;head.dataset.theme=id;name.textContent=c.name;
    if(!animate){settleBanner();return;}
    sceneryNext.style.backgroundImage=url(c.banner);floorNext.style.backgroundImage=url(c.background.portrait);
    scenery.dataset.transitioning='true';
    const token=fadeGeneration;
    fades=[sceneryNext,floorNext].map(el=>el.animate([{opacity:0},{opacity:1}],{duration:320,easing:'ease-in-out',fill:'forwards'}));
    Promise.all(fades.map(a=>a.finished)).then(()=>{
      if(token!==fadeGeneration)return;
      const next=queuedBanner;settleBanner();
      if(mode==='mMap'&&next&&next!==bannerTheme)commitBanner(next);
    }).catch(()=>{});
  }
  function considerBanner(id,immediate=false){
    if(immediate){clearTimeout(stableTimer);candidate=null;commitBanner(id,true);return;}
    if(id===bannerTheme){clearTimeout(stableTimer);candidate=null;queuedBanner=null;commitBanner(id);return;}
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
      await Promise.all([...new Set(['sandstone',...Array.from({length:50},(_,i)=>T.assigned(i+1))])].map(T.preload));
      if(ticket!==revision||mode!=='mMap')return;
      document.querySelectorAll('.pnode').forEach(button=>{button.dataset.theme=T.forStage(Number(button.dataset.n));root.HomeMap.paintButton(button);});
      // Refresh an already selected header once its images have decoded.
      paintMap();
    }else reset();
  }
  const originalMode=setMode;setMode=function(next){
    originalMode(next);mode=next;clearTimeout(stableTimer);candidate=null;settleBanner();
    if(next==='mMap'){measureHeader();considerBanner(T.forStage(progress.unlocked),true);}
    refresh();
  };
  const originalSetup=setupStage;setupStage=function(...args){const result=originalSetup(...args);if(mode==='mPlay')refresh();return result;};
  root.CubePopThemeUI={mapLayout(next){layout=next;paintMap();},refresh};
  sc.addEventListener('scroll',paintMap,{passive:true});
  new ResizeObserver(()=>{measureHeader();paintMap();}).observe(head);
  root.addEventListener('resize',()=>{if(mode==='mPlay')paintPlay();else paintMap();});
  reduced.addEventListener('change',()=>{if(reduced.matches){const next=queuedBanner;settleBanner();if(mode==='mMap'&&next)commitBanner(next,true);}});
})(window);
