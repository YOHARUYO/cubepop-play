/* Rendering only. All ownership, counts and transitions come from GimmickPlay. */
(function(root){
 'use strict';
 const base='assets/gimmicks/integrated/',ns='http://www.w3.org/2000/svg';
 const polish='assets/gimmicks/polish-v13/';
 let terrain=null,marks=null,particles=null,previous=null,moving=false,generation=0,timers=new Set(),decoded=new Map();
 const reduced=()=>!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function later(fn,ms){if(root.__SIM){fn();return;}let id;id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);}
 const image=(file,cls='')=>'<img class="'+cls+'" src="'+base+file+'" alt="" aria-hidden="true">';
 const icons={ice:'ui/goal-ice.png',door:'goal-door.png',star:'ui/goal-star.png'};
 function icon(type){return type==='vine'?'<img class="gmVineIcon" src="assets/gimmicks/goal-vine-v8.png" alt="" aria-hidden="true">':image(icons[type]||'ui/guide-key.png','gmVineIcon');}
 function node(tag,attrs,parent){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);parent?.append(e);return e;}
 function ensure(){if(terrain)return;const board=document.getElementById('board');
  terrain=node('svg',{id:'gimmickArtFloor',viewBox:'0 0 1536 1536','aria-hidden':'true'},board);
  marks=node('svg',{id:'gimmickArtMarkers',viewBox:'0 0 1536 1536','aria-hidden':'true'},board);
  particles=node('svg',{id:'gimmickArtTransient',viewBox:'0 0 1536 1536','aria-hidden':'true'},board);
 }
 function at(k){const F=root.CubePopFrame,w=F.world(k%6*72,Math.floor(k/6)*72),p=F.project(w.x,0,w.z),scale=F.distance/(F.distance-w.z*F.cos);return {x:p.x-112*scale,y:p.y+(628-F.cy)*scale,w:224*scale,scale,world:w};}
 // Stars/rotors belong to the cell, so their visual anchor stays here while
 // cubes fall through it. Carrier keys still follow the live cube silhouette.
 function faceAt(k){return root.CubePopFrame.topFace(k%6*72,Math.floor(k/6)*72);}
 function art(parent,file,b,attrs={}){const el=node('image',{href:base+file,x:b.x,y:b.y,width:b.w,height:b.h||b.w,preserveAspectRatio:'xMidYMid meet',...attrs},parent);el.addEventListener('error',()=>{el.setAttribute('visibility','hidden');if(attrs['data-kind']||attrs['data-gate']){node('rect',{x:b.x+b.w*.12,y:b.y+b.w*.12,width:b.w*.76,height:b.w*.76,rx:12,fill:'#ddd5c3',stroke:'#777e7b','stroke-width':3},parent);const label=node('text',{x:b.x+b.w/2,y:b.y+b.w*.57,'text-anchor':'middle',fill:'#36506a','font-size':25},parent);label.textContent=attrs['data-gate']?'문':({rock:'암벽',fountain:'분수',void:'정원'}[attrs['data-kind']]||'');}});return el;}
 function draw(s){ensure();document.getElementById('board').classList.toggle('gmReduced',reduced());terrain.replaceChildren();marks.replaceChildren();
  const F=root.CubePopFrame;
  for(let k=0;k<36;k++){
   const type=s.terrain[k],b=at(k);
   if(type==='floor'){
    // Floor patches and boundary strips stay below real cubes, in mask coordinates.
    const p=F.project(b.world.x,0,b.world.z),size=182*b.scale;
    art(terrain,'board/floor.svg',{x:p.x-size/2,y:p.y-size/2,w:size});
    for(const [d,offset]of [['N',-6],['S',6],['W',-1],['E',1]]){
     const n=k+offset,valid=n>=0&&n<36&&(!(d==='W'||d==='E')||Math.floor(n/6)===Math.floor(k/6));
     if(valid&&s.terrain[n]==='void')art(terrain,'board/edge-'+d+'.svg',{x:p.x-size/2,y:p.y-size/2,w:size});
    }
   }else if(type==='rock')art(terrain,'objects/rock.png',b,{'data-cell':k,'data-kind':'rock'});
   else if(type==='void')art(terrain,'void-'+root.CubePopStages.get(s.stage).region+'.png',b,{'data-cell':k,'data-kind':'void'});
   else if(type==='door'){
    const lock=s.locks.find(g=>!g.open&&g.doors.some(p=>p[0]*6+p[1]===k));
    if(lock)art(terrain,'gate-'+lock.id+'.png',b,{'data-cell':k,'data-gate':lock.id});
   }
  }
  if(s.terrain.includes('fountain'))art(terrain,'fountain.png',{x:548,y:520,w:440},{'data-kind':'fountain'});
  for(const lock of s.locks){
   if(lock.open)for(const [r,c]of lock.doors)art(terrain,'gates/open-threshold.svg',at(r*6+c),{'data-open':lock.id});
   if(lock.keyState==='pending')keyImage(lock.id,{'data-pending-key':lock.id,'data-key-cell':lock.key[0]*6+lock.key[1]});
   if(lock.keyState==='carried')keyImage(lock.id,{'data-carrier':lock.carrierCubeId});
  }
  for(const t of s.stars){const b=faceAt(t.k),newly=t.lit&&previous&&!previous.stars.find(p=>p.k===t.k)?.lit;art(marks,'constellation/'+(t.lit?'lit':'unlit')+'.png',{x:b.x+b.w*.02,y:b.y+b.h*.02,w:b.w*.40},{'data-star':t.k,'data-lit':t.lit,class:newly?'gmLit':''});}
  for(const rotor of s.rotors){const k=rotor.r*6+rotor.c,e=s.cells[k];if(!e||s.vines.includes(k)||moving)continue;
   const b=faceAt(k),mode=e.bomb?'skip':s.countdown===1?'ready':'idle',g=node('g',{'data-rotor':k,'data-state':mode},marks),w=b.w*.92,h=b.w*.27,x=b.x+(b.w-w)/2,y=b.bottom-b.h*.02-h;
   node('path',{d:`M${b.x+b.w*.04} ${b.y+b.h*.20}v-${b.h*.18}h${b.w*.18}M${b.right-b.w*.04} ${b.y+b.h*.20}v-${b.h*.18}h-${b.w*.18}`,fill:'none',stroke:mode==='ready'?'#d4ad61':'#a69cbe','stroke-width':mode==='ready'?5:3},g);
   node('rect',{x,y,width:w,height:h,rx:8,fill:mode==='ready'?'#ffe3a0':'#fff6df',stroke:'#ae9abd','stroke-width':2},g);
   art(g,'rotor/'+rotor.direction+'-'+mode+'.svg',{x:x+5,y:y+2,w:h-4});
   if(!e.bomb){const ci=root.CubePopGimmicks.pull(e.o,root.CubePopGimmicks.dirs[rotor.direction]).U,shape=stageColors[ci];
    const face=node('svg',{x:x+w-h,y:y+3,width:h-6,height:h-6,viewBox:'0 0 32 32','data-next':ci},g);
    node('rect',{x:0,y:0,width:32,height:32,rx:5,fill:colHex(ci)},face);
    const glyph=node('g',{color:root.CubePopSymbols.inks[shape]},face);glyph.innerHTML=root.CubePopSymbols.svg(shape).replace('-.5 -.5 1 1','-.26 -.26 .52 .52').replace('<svg ','<svg x="5" y="5" width="22" height="22" ');
   }
  }
  // The engine snapshot is the sole source for a gate opening, including groups
  // with multiple cells. Decorative callbacks cannot award or consume anything.
  if(previous){for(const lock of s.locks.filter(g=>g.open&&!previous.locks.find(p=>p.id===g.id)?.open)){
   for(const [r,c]of lock.doors){const b=at(r*6+c),gate=art(terrain,'gate-'+lock.id+'.png',b,{'data-opening':lock.id,class:'gmGateOpening'});
    if(reduced())gate.remove();else{const run=generation;later(()=>{if(run===generation)gate.remove();},180);}
   }
   if(!reduced())for(const [r,c]of lock.doors){const b=at(r*6+c),signal=art(marks,'groups/crest-'+lock.id+'.png',{x:b.x+b.w*.36,y:b.y+b.w*.4,w:b.w*.28},{class:'gmKeySignal'});later(()=>signal.remove(),220);}
  }}
  positionKeys();previous=s;
 }
 function keyBadge(group){return '<img src="'+polish+'keys/key-horizontal-'+group+'.png" alt="" aria-hidden="true">';}
 function keyImage(group,attrs){return node('image',{href:polish+'keys/key-horizontal-'+group+'.png',class:'gmInsetKey',preserveAspectRatio:'xMidYMid meet','aria-label':group+' 문 열쇠',...attrs},marks);}
 function positionKeys(){if(!marks)return;const board=document.getElementById('board'),rect=board.getBoundingClientRect(),scale=(rect.width||704)/1536;
  for(const key of marks.querySelectorAll('.gmInsetKey')){
   let left,right,bottom,hull=null;
   if(key.hasAttribute('data-carrier')){
    const e=grid.flat().find(e=>e?.logicId===Number(key.getAttribute('data-carrier')));
    if(!e||e.vined||!e.el.isConnected){key.setAttribute('visibility','hidden');continue;}
    hull=root.CubePopVisual?.outline?.(e);
    if(hull?.length){left=Math.min(...hull.map(p=>p.x));right=Math.max(...hull.map(p=>p.x));bottom=Math.max(...hull.map(p=>p.y))-3/scale;}
    else{const b=at(e.r*6+e.c);left=b.x;right=b.x+b.w;bottom=b.y+b.w-3/scale;}
    key.style.opacity=getComputedStyleSafe(e.el).opacity||'1';
   }else{
    const b=at(Number(key.getAttribute('data-key-cell')));left=b.x+b.w*.18;right=b.x+b.w*.82;bottom=b.y+b.w*.80;
   }
   const width=Math.min(36/scale,(right-left)*.84),height=width*448/768;
   for(const [name,value]of Object.entries({x:(left+right-width)/2,y:bottom-height,width,height,visibility:'visible'}))key.setAttribute(name,value);
   if(hull?.length){const id='key-clip-'+key.getAttribute('data-carrier');let clip=marks.querySelector('#'+id);if(!clip)clip=node('clipPath',{id},marks);clip.replaceChildren();node('polygon',{points:hull.map(p=>p.x+','+p.y).join(' ')},clip);key.setAttribute('clip-path','url(#'+id+')');}
  }
 }
 function getComputedStyleSafe(el){return root.__SIM?el.style:getComputedStyle(el);}
 function preview(cube,bubble){bubble.querySelector('.gmPreviewExtra')?.remove();if(!root.GimmickPlay?.active())return;
  const s=root.GimmickPlay.displayState(),k=cube.r*6+cube.c,rotor=s.rotors.find(t=>t.r*6+t.c===k),lock=s.locks.find(t=>t.keyState==='carried'&&t.carrierCubeId===cube.logicId);
  if(!rotor&&!lock)return;const extra=document.createElement('div');extra.className='gmPreviewExtra';
  if(rotor){const item=s.cells[k],ci=item&&!item.bomb?root.CubePopGimmicks.pull(item.o,root.CubePopGimmicks.dirs[rotor.direction]).U:null;
   extra.innerHTML='<span>자동 회전 예정</span>'+(ci===null?'<b>이번 회전 쉬기</b>':'<span>다음 윗면 <i style="background:'+colHex(ci)+'">'+root.CubePopSymbols.svg(stageColors[ci])+'</i></span>');
  }
  if(lock)extra.insertAdjacentHTML('beforeend','<span>'+image('groups/crest-'+lock.id+'.png')+' 이 문양의 문을 열어요</span>');bubble.append(extra);
 }
 function phase(on){moving=on;document.getElementById('board')?.classList.toggle('gmMoving',on);if(on)marks?.querySelectorAll('[data-rotor]').forEach(e=>e.remove());}
 function iceDamage(damages){if(reduced())return;ensure();for(const damage of damages){const b=at(damage.k);for(const [x,y]of [[.12,.16],[.85,.18],[.13,.78],[.84,.78]]){if(particles.childElementCount>=24)break;const chip=node('path',{d:'M-5 -4L6 -2L3 6L-4 3Z',fill:'#d7f6ff',stroke:'#8ec2d0','stroke-width':1,transform:'translate('+(b.x+b.w*x)+','+(b.y+b.w*y)+')',class:'gmIceChip'},particles);later(()=>chip.remove(),220);}}}
 function autoCue(turns){if(reduced())return;ensure();for(const t of turns){const b=faceAt(t.k),cue=node('path',{d:`M${b.x+b.w*.04} ${b.y+b.h*.20}v-${b.h*.18}h${b.w*.18}M${b.right-b.w*.04} ${b.y+b.h*.20}v-${b.h*.18}h-${b.w*.18}`,fill:'none',stroke:'#e1b861','stroke-width':6,'data-auto-cue':t.id},particles);later(()=>cue.remove(),80);}}
 function clear(){generation++;for(const t of timers)clearTimeout(t);timers.clear();previous=null;terrain?.replaceChildren();marks?.replaceChildren();particles?.replaceChildren();phase(false);}
 // One decoded resource cache per document. Individual load failures are reported
 // and retain accessible state text instead of substituting an obsolete artwork.
 if(root.Image&&root.fetch){Promise.all([base,polish].map(p=>root.fetch(p+'manifest.json').then(r=>r.json()))).then(ms=>({entries:ms.flatMap(m=>m.entries)})).then(async m=>{
  const results=await Promise.all(m.entries.map(async e=>{const img=new root.Image();img.src=e.destination;decoded.set(e.destination,img);try{await img.decode();return {path:e.destination,ok:true};}catch(_){return {path:e.destination,ok:false};}}));
  const out=document.createElement('output');out.id='gimmickAssetState';out.hidden=true;out.textContent=JSON.stringify(results);document.body.append(out);
 }).catch(()=>{});}
 root.GimmickArt={draw,clear,phase,preview,icon,keyBadge,at,faceAt,base,iceDamage,autoCue,positionKeys};
})(window);
