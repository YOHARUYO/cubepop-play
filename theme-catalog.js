/* Production resources only. Concept previews/source studies never belong here. */
(function(root){
  const catalog={
    sandstone:{ready:true,revision:'ui-polish-v2',name:'사암 정원',banner:'assets/home-map/map-banner-sandstone.webp',
      fallbackBackground:'assets/sandstone/courtyard.webp',
      background:{portrait:'assets/themes/sandstone/desert-portrait.webp',landscape:'assets/themes/sandstone/desert-landscape.webp'},
      frame:{rear:'assets/sandstone/board-frame-rear.png',front:'assets/sandstone/board-frame-front.png'},
      nodes:{ivory:'assets/home-map/node-ivory.png',gold:'assets/home-map/node-gold.png'}},
    coast:{ready:true,revision:'coastal-garden-production-v1',name:'산토리니 정원',banner:'assets/home-map/map-banner-coast.webp',
      background:{portrait:'assets/themes/coast/coast-portrait.webp',landscape:'assets/themes/coast/coast-landscape.webp'},
      frame:{rear:'assets/themes/coast/board-frame-rear.png',front:'assets/themes/coast/board-frame-front.png'},
      nodes:{ivory:'assets/themes/coast/node-coast-ivory.png',gold:'assets/themes/coast/node-coast-gold.png'},
      // Confirmed shared window in the approved production master (both states).
      nodeWindow:[1254,1254,128,132,1000,992]}
  };
  // Resource availability is independent of production stage assignments.
  for(const [id,name] of [['alps','알프스 산악 정원'],['royal','왕실 정원'],['astral','별빛 천문 정원']]){
    catalog[id]={ready:true,revision:'three-gardens-v1',name,
      banner:'assets/home-map/map-banner-'+id+'.webp',
      background:{portrait:'assets/themes/'+id+'/'+id+'-portrait.webp',landscape:'assets/themes/'+id+'/'+id+'-landscape.webp'},
      frame:{rear:'assets/themes/'+id+'/board-frame-rear.png',front:'assets/themes/'+id+'/board-frame-front.png'},
      nodes:{...catalog.sandstone.nodes}};
  }
  for(const [id,c] of Object.entries(catalog)){
    c.revision='theme-mobile-frame-v2';
    c.background.mobile='assets/themes/'+id+'/'+id+'-mobile.webp';
  }
  root.CubePopThemeCatalog=catalog;
  if(typeof module==='object')module.exports=catalog;
})(typeof window==='object'?window:globalThis);
