/* Visual events only: never mutate cells, goals, RNG, score or turns. */
(function(root){
 'use strict';
 function frameAt(entry,elapsed){
  if(elapsed<0)return null;
  let end=0;
  for(const frame of entry.frames){end+=frame.durationMs;if(elapsed<end)return frame;}
  return entry.endBehavior==='hold'?entry.frames.at(-1):null;
 }
 // Door arrival uses one uniform scale, anchored to the floor by the renderer.
 // The door opens first; the cube then makes one small overshoot and settles.
 function gatePopPose(elapsed){
  if(elapsed<0)return {scale:.06,opacity:0};
  if(elapsed>=240)return null;
  const t=elapsed/240,peak=.72;
  const scale=t<peak?.06+1.02*(1-Math.pow(1-t/peak,3)):1.08-.08*((t-peak)/(1-peak))**2;
  return {scale,opacity:Math.min(1,elapsed/45)};
 }
 function vineCanopyOpacity(elapsed){
  const t=Math.max(0,Math.min(1,elapsed/440));
  return 1-t*t*(3-2*t);
 }
 function registeredBox(entry,box){
  if(entry.registration?.cubeProjectedBounds){
   const [x,y,w]=entry.registration.cubeProjectedBounds,[cw,ch]=entry.registration.logicalFrameSize,s=box.w/w;
   return {x:box.x-x*s,y:box.y-y*s,w:cw*s,h:ch*s};
  }
  const r=entry.registration||{},s=r.atlasBoxScaleRelativeToOldPng||entry.displayBoxW||1;
  const o=r.atlasTopLeftOffsetRelativeToOldPng||[(1-s)/2,(1-s)/2],h=box.h||box.w;
  return {x:box.x+o[0]*box.w,y:box.y+o[1]*h,w:box.w*s,h:h*s};
 }
 function transition(before,event){
  if(event.type!=='clear'||!before)return [];
  const after=event.state,out=[];
  for(const d of event.damages||[])out.push({kind:'ice',k:d.k,owner:d.id,layers:d.layers,ids:d.layers>0?['ICE_UV_2_TO_1','ICE_CHIPS_2_TO_1','ICE_BREAK_FLASH']:['ICE_UV_1_TO_0','ICE_CHIPS_1_TO_0','ICE_BREAK_FLASH']});
  for(const k of event.released||[])out.push({kind:'vine',k,owner:before.cells[k]?.id,ids:['VINE_BACK','VINE_FRONT']});
  for(const lock of after.locks)if(lock.open&&!before.locks.find(l=>l.id===lock.id)?.open){
   for(const [r,c] of lock.doors)out.push({kind:'gate',k:r*6+c,group:lock.id,ids:['GATE_SEAM_LIGHT','GATE_BODY','GATE_SEAL_'+lock.id,'GATE_RADIANCE']});
  }
  for(const s of after.stars)if(s.lit&&!before.stars.find(t=>t.k===s.k)?.lit)out.push({kind:'star',k:s.k,ids:['STAR_IGNITION_LIGHT','STAR_IGNITE']});
  if(after.stars.length&&after.stars.every(s=>s.lit)&&!before.stars.every(s=>s.lit))out.push({kind:'complete',nodes:after.stars.map(s=>s.k),root:Math.min(...out.filter(p=>p.kind==='star').map(p=>p.k))});
  return out;
 }
 function needed(s){
  const ids=[];
  if(s.cells.some(e=>e?.ice))ids.push('ICE_UV_2_TO_1','ICE_CHIPS_2_TO_1','ICE_UV_1_TO_0','ICE_CHIPS_1_TO_0','ICE_BREAK_FLASH');
  if(s.vines.length)ids.push('VINE_BACK','VINE_FRONT');
  if(s.locks.length)ids.push('GATE_BODY','GATE_SEAM_LIGHT','GATE_RADIANCE',...s.locks.map(l=>'GATE_SEAL_'+l.id));
  if(s.stars.length)ids.push('STAR_IGNITE','STAR_IGNITION_LIGHT');
  return [...new Set(ids)];
 }
 function tier(width,dpr,memory){return width/6*Math.min(dpr||1,2)>124&&(!memory||memory>4)?'standard':'mobile';}
 const api={frameAt,gatePopPose,vineCanopyOpacity,registeredBox,transition,needed,tier};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GimmickFeedbackPlan=api;
})(typeof window!=='undefined'?window:globalThis);
