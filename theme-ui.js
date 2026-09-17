/* Keep asynchronous resource changes out of game state and input timing. */
(function(root){
  'use strict';
  const T=root.CubePopThemes;
  if(root.__SIM)return;
  const rear=document.querySelector('.frameRear'),front=document.querySelector('.frameFront');
  let mode='mHome',revision=0,layout=null;
  const mapLayer=document.createElement('div');mapLayer.className='themeMapEnvironment';mapLayer.setAttribute('aria-hidden','true');document.body.appendChild(mapLayer);
  const landscape=()=>root.innerWidth>root.innerHeight;
  function frames(c){
    // Do not restart image decoding on unrelated HUD/resize refreshes.
    if(rear.getAttribute('src')!==c.frame.rear)rear.src=c.frame.rear;
    if(front.getAttribute('src')!==c.frame.front)front.src=c.frame.front;
  }
  function reset(){
    delete document.body.dataset.playTheme;
    document.body.style.removeProperty('--theme-background');
    frames(T.resource('sandstone'));
  }
  function paintPlay(){
    const id=T.forStage(stageNo+1),c=T.resource(id);
    if(id==='sandstone'){reset();return;}
    document.body.dataset.playTheme=id;
    document.body.style.setProperty('--theme-background','url("'+c.background[landscape()?'landscape':'portrait']+'")');
    // Both full canvases commit together after the entire theme has loaded.
    frames(c);
  }
  function paintMap(){
    mapLayer.replaceChildren();if(mode!=='mMap'||!layout)return;
    const sc=document.getElementById('mapScroll'),r=sc.getBoundingClientRect();
    // Cover the header as well as the scroll viewport. A scroll-box-sized layer
    // left a hard sandstone strip above an otherwise coastal screen.
    mapLayer.style.top='0px';mapLayer.style.height=root.innerHeight+'px';
    const fade=64;
    for(const region of T.regions(layout.points,layout.height)){
      if(region.theme==='sandstone')continue;
      const top=region.top-sc.scrollTop+r.top,bottom=region.bottom-sc.scrollTop+r.top;
      if(bottom<-fade||top>root.innerHeight+fade)continue;
      const layer=document.createElement('div');layer.className='themeMapRegion';layer.dataset.theme=region.theme;
      layer.dataset.contentTop=region.top;layer.dataset.contentBottom=region.bottom;
      layer.style.backgroundImage='url("'+T.resource(region.theme).background[landscape()?'landscape':'portrait']+'")';
      // Only this alpha transition is a gradient; node surfaces are always image assets.
      layer.style.maskImage='linear-gradient(to bottom,transparent '+(top-fade)+'px,#000 '+(top+fade)+'px,#000 '+(bottom-fade)+'px,transparent '+(bottom+fade)+'px)';
      mapLayer.appendChild(layer);
    }
  }
  async function refresh(){
    const ticket=++revision;
    if(mode==='mPlay'){
      paintPlay();await T.preload(T.assigned(stageNo+1));
      if(ticket===revision&&mode==='mPlay')paintPlay();
    }else if(mode==='mMap'){
      reset();paintMap();
      await Promise.all([...new Set(Array.from({length:50},(_,i)=>T.assigned(i+1)))].map(T.preload));
      if(ticket!==revision||mode!=='mMap')return;
      document.querySelectorAll('.pnode').forEach(button=>{
        button.dataset.theme=T.forStage(Number(button.dataset.n));root.HomeMap.paintButton(button);
      });paintMap();
    }else{reset();mapLayer.replaceChildren();}
  }
  const originalMode=setMode;setMode=function(next){originalMode(next);mode=next;mapLayer.replaceChildren();refresh();};
  const originalSetup=setupStage;setupStage=function(...args){const result=originalSetup(...args);if(mode==='mPlay')refresh();return result;};
  root.CubePopThemeUI={mapLayout(next){layout=next;paintMap();},refresh};
  document.getElementById('mapScroll').addEventListener('scroll',paintMap,{passive:true});
  root.addEventListener('resize',()=>{if(mode==='mPlay')paintPlay();else paintMap();});
})(window);
