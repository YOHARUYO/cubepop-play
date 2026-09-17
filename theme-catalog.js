/* Production resources only. Concept previews/source studies never belong here. */
(function(root){
  const catalog={
    sandstone:{ready:true,revision:'ui-polish-v2',
      fallbackBackground:'assets/sandstone/courtyard.webp',
      background:{portrait:'assets/themes/sandstone/desert-portrait.webp',landscape:'assets/themes/sandstone/desert-landscape.webp'},
      frame:{rear:'assets/sandstone/board-frame-rear.png',front:'assets/sandstone/board-frame-front.png'},
      nodes:{ivory:'assets/home-map/node-ivory.png',gold:'assets/home-map/node-gold.png'}},
    coast:{ready:true,revision:'coastal-garden-production-v1',
      background:{portrait:'assets/themes/coast/coast-portrait.webp',landscape:'assets/themes/coast/coast-landscape.webp'},
      frame:{rear:'assets/themes/coast/board-frame-rear.png',front:'assets/themes/coast/board-frame-front.png'},
      nodes:{ivory:'assets/themes/coast/node-coast-ivory.png',gold:'assets/themes/coast/node-coast-gold.png'},
      // Confirmed shared window in the approved production master (both states).
      nodeWindow:[1254,1254,128,132,1000,992]}
  };
  root.CubePopThemeCatalog=catalog;
  if(typeof module==='object')module.exports=catalog;
})(typeof window==='object'?window:globalThis);
