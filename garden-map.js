/* Presentation-only world geometry. No progress, unlock or game state mutations. */
(function(root){
  'use strict';
  const masks=typeof module!=='undefined'?require('./garden-map-masks.js'):root.GardenMapMasks;
  const themes=['sandstone','coast','alps','royal','astral'];
  const palette={sandstone:['#bca27d','#e3cdaa','#f6e4c8'],coast:['#b6c3bc','#e2e7d7','#fff9e8'],alps:['#8eaa72','#b0c28f','#dce3b7'],royal:['#bea98e','#e4d7bd','#fff1d6'],astral:['#9b96ac','#c8c1cc','#eee6df']};
  const asset=(theme,name)=>'assets/home-map/garden-paths/'+(themes.includes(theme)?theme:'sandstone')+'/'+name+'.png';
  const variant=n=>1+(n*3+Math.floor(n/4))%4;
  const surface=(n,theme)=>'<img class="hmSurface gardenStone" src="'+asset(theme,'node-0'+variant(n))+'" alt="" aria-hidden="true" width="98" height="98">';
  function number(n){return '<span class="hmLabel gardenNumber"><svg viewBox="0 0 82 82" aria-hidden="true"><defs><filter id="number-shadow-'+n+'" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation=".6" flood-color="#162D49" flood-opacity=".38"/></filter></defs><text x="41" y="46" text-anchor="middle" fill="#fff" stroke="#243E61" stroke-width="2.8" stroke-linejoin="round" paint-order="stroke fill" filter="url(#number-shadow-'+n+')">'+n+'</text></svg></span>';}
  function route(a,b){const d=a.y-b.y,side=Math.sign(a.x-b.x)||1;return[a,{x:a.x+(b.x-a.x)*.12,y:a.y-d*.38},{x:b.x+side*Math.min(126,Math.abs(d)*.57),y:b.y+d*.32},b];}
  function point(p,t){const s=1-t;return{x:s*s*s*p[0].x+3*s*s*t*p[1].x+3*s*t*t*p[2].x+t*t*t*p[3].x,y:s*s*s*p[0].y+3*s*s*t*p[1].y+3*s*t*t*p[2].y+t*t*t*p[3].y};}
  const overlap=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;
  const rect=(x,y,w,h)=>({x,y,w,h});
  function cells(theme,kind,b){return (masks[theme+'/'+kind]||[]).map(([x,y,w])=>rect(b.x+x*b.w/32,b.y+y*b.h/32,w*b.w/32,b.h/32));}
  function plan(l,viewport,resolve){
    const left=(l.W-viewport)/2,right=left+viewport,protect=[];
    // Reserve every possible pawn/state so progress changes cannot move scenery.
    for(const p of l.points.slice(1))protect.push(rect(p.x-54,p.y-87,108,96),rect(p.x-54,p.y-49,108,98),rect(p.x-39,p.y+53,78,26));
    for(const n of [1,7,10,15])protect.push(rect(0,l.points[n].y+86,l.W,22));
    const links=l.points.slice(1,-1).map((a,i)=>({id:i+1,theme:resolve(i+1),nextTheme:resolve(i+2),p:route(a,l.points[i+2])}));
    const roads=links.flatMap(link=>Array.from({length:25},(_,i)=>{const p=point(link.p,i/24);return rect(p.x-28,p.y-28,56,56);}));
    const scenery=[],decor=[];
    function safe(box,theme,kind){const occupied=cells(theme,kind,box).filter(c=>c.x+c.w>left&&c.x<right);
      return occupied.length&& !occupied.some(c=>protect.some(p=>overlap(c,p,8))||roads.some(p=>overlap(c,p,5)))?occupied:null;}
    // Wide scenes reserve sparse path-side planters before placing big buildings.
    if(viewport>=600)placeDecor();
    // Persistent identities are tied to stages, not viewport height or scroll position.
    for(let n=2;n<=50;n+=2){
      const theme=resolve(n),side=n%4===0?-1:1,kind=side<0?'scenery-a':'scenery-b';
      const size=viewport<360?(side<0?348:288):viewport<600?348:Math.min(660,348+(viewport-600)*.9);
      const baseY=l.points[n].y+(side<0?-140:180);
      let chosen=null;
      const maxShow=viewport<600?190:Math.min(450,(viewport-l.W)/2+170);
      for(let show=maxShow;show>=55&&!chosen;show-=20){
        for(const dy of [0,-40,40,-80,80]){
          const box=rect(side<0?left-size+show:right-show,Math.max(0,Math.min(l.height-size,baseY+dy)),size,size),occupied=safe(box,theme,kind);
          if(!occupied||scenery.some(s=>s.cells.some(c=>occupied.some(d=>overlap(c,d,16))))||decor.some(s=>s.cells.some(c=>occupied.some(d=>overlap(c,d,8)))))continue;
          chosen={id:'scenery-'+n,stage:n,theme,kind,...box,cells:occupied};break;
        }
      }
      if(chosen)scenery.push(chosen);
    }
    if(viewport<600)placeDecor();
    // One small cluster per link at most; 224px stage spacing keeps density sparse.
    function placeDecor(){
    for(const link of links){
      const size=viewport<600?48:60,kind=link.id%2?'decor-a':'decor-b';let chosen=null;
      for(const t of [.48,.3,.7]){const q=point(link.p,t),r=point(link.p,t+.002),dx=r.x-q.x,dy=r.y-q.y,len=Math.hypot(dx,dy);
        for(const side of [link.id%2?1:-1,link.id%2?-1:1]){for(const offset of [36+size/2,60+size/2,84+size/2]){const box=rect(q.x-dy/len*offset*side-size/2,q.y+dx/len*offset*side-size/2,size,size);
          if(box.x<left+5||box.x+size>right-5)continue;
          const occupied=safe(box,link.theme,kind);
          if(!occupied||decor.some(d=>overlap(box,d,36))||scenery.some(s=>s.cells.some(c=>occupied.some(d=>overlap(c,d,8)))))continue;
          chosen={id:'decor-'+link.id,stage:link.id,theme:link.theme,kind,...box,cells:occupied};break;
        }if(chosen)break;}if(chosen)break;
      }if(chosen)decor.push(chosen);
    }
    }
    return {links,scenery,decor,protect,left,width:viewport,height:l.height};
  }
  function road(link){
    const sides=[[],[]];
    for(let i=0;i<=80;i++){const t=i/80,q=point(link.p,t),a=point(link.p,Math.max(0,t-.001)),b=point(link.p,Math.min(1,t+.001)),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,half=20+1.8*Math.sin(t*Math.PI*2+link.id)+5*Math.exp(-Math.min(t,1-t)*14);
      sides[0].push([q.x-dy/len*half,q.y+dx/len*half]);sides[1].push([q.x+dy/len*half,q.y-dx/len*half]);}
    const fmt=a=>'M'+a.map(v=>v.map(n=>n.toFixed(2)).join(',')).join('L'),d=fmt([...sides[0],...sides[1].slice().reverse()])+'Z',pal=palette[link.theme];
    let s='<g data-road="'+link.id+'"><path d="'+d+'" fill="url(#garden-ground-'+link.theme+')"/>';
    if(link.theme!==link.nextTheme){const a=link.p[0],b=link.p[3];s+='<defs><linearGradient id="garden-transition-'+link.id+'" gradientUnits="userSpaceOnUse" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"><stop offset="35%" stop-color="white" stop-opacity="0"/><stop offset="65%" stop-color="white"/></linearGradient><mask id="garden-mask-'+link.id+'"><path d="'+d+'" fill="url(#garden-transition-'+link.id+')"/></mask></defs><path d="'+d+'" fill="url(#garden-ground-'+link.nextTheme+')" mask="url(#garden-mask-'+link.id+')"/>';}
    for(const side of sides)s+='<path d="'+fmt(side)+'" fill="none" stroke="'+pal[0]+'" stroke-width="5" transform="translate(0 1.3)"/><path d="'+fmt(side)+'" fill="none" stroke="'+pal[1]+'" stroke-width="4"/><path d="'+fmt(side)+'" fill="none" stroke="'+pal[2]+'" stroke-width=".7" transform="translate(-.35 -.6)"/>';
    return s+'</g>';
  }
  function svg(p){
    const image=b=>'<image data-decoration="'+b.id+'" data-theme="'+b.theme+'" href="'+asset(b.theme,b.kind)+'" x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'"/>';
    let s='<svg class="gardenWorld" width="'+p.width+'" height="'+p.height+'" viewBox="'+p.left+' 0 '+p.width+' '+p.height+'" style="left:'+p.left+'px" aria-hidden="true"><defs>';
    for(const theme of themes)s+='<pattern id="garden-ground-'+theme+'" width="144" height="144" patternUnits="userSpaceOnUse">'+[[0,0,''],[0,0,'translate(144 0) scale(-1 1)'],[0,0,'translate(0 144) scale(1 -1)'],[0,0,'translate(144 144) scale(-1 -1)']].map(([x,y,t])=>'<image href="'+asset(theme,'path-texture')+'" width="72" height="72" transform="'+t+'"/>').join('')+'</pattern>';
    s+='<linearGradient id="garden-scenery-fade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="36"><stop stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient><mask id="garden-scenery-mask" maskUnits="userSpaceOnUse" x="'+p.left+'" y="0" width="'+p.width+'" height="'+p.height+'"><rect x="'+p.left+'" width="'+p.width+'" height="'+p.height+'" fill="url(#garden-scenery-fade)"/></mask>';
    // One shared fade for the whole garden environment. Interactive nodes,
    // numbers, stars and the pawn are separate DOM layers and stay legible.
    return s+'</defs><g mask="url(#garden-scenery-mask)">'+p.scenery.map(image).join('')+p.links.map(road).join('')+p.decor.map(image).join('')+'</g></svg>';
  }
  let decoded;
  function preload(){
    if(!root.Image)return Promise.resolve();
    if(!decoded)decoded=Promise.all(themes.flatMap(theme=>['node-01','node-02','node-03','node-04','path-texture','decor-a','decor-b','scenery-a','scenery-b'].map(name=>new Promise(resolve=>{
      const image=new root.Image();image.onload=()=>{if(image.decode)image.decode().catch(()=>{}).then(resolve);else resolve();};image.onerror=resolve;image.src=asset(theme,name);
    }))));
    return decoded;
  }
  const api={asset,variant,surface,number,route,point,plan,svg,overlap,cells,preload};
  if(typeof module!=='undefined')module.exports=api;else root.GardenMap=api;
})(typeof window!=='undefined'?window:globalThis);
