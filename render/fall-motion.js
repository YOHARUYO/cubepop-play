/* Cosmetic landing recoil shared by ordinary and gimmick gravity. */
(function(root){
 'use strict';
 const settleMs=140,leadMs=22;
 const smooth=t=>t*t*(3-2*t);
 function distance(rows){return 64*(.04+.02*Math.min(1,Math.max(0,rows-1)/5));}
 function sample(rows,elapsed,duration){
  const t=(elapsed-duration+leadMs)/settleMs,peak=leadMs/settleMs;
  if(t<=0||t>=1)return 0;
  return distance(rows)*(t<peak?smooth(t/peak):1-smooth((t-peak)/(1-peak)));
 }
 const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const clock=()=>root.performance?.now()??Date.now();
 function cancel(entity){entity.landingAnimation?.cancel();delete entity.landingAnimation;delete entity.landingRecoil;}
 function begin(entity,rows,duration){
  cancel(entity);if(reduced()||rows<=0)return;
  entity.landingRecoil={rows,duration,start:clock()};
  // Fallback moves only the visual wrapper, leaving the input box stationary.
  if(!root.CubePopVisual&&entity.wrap?.animate)entity.landingAnimation=entity.wrap.animate([
   {translate:'0 0',offset:0,easing:'cubic-bezier(.42,0,.58,1)'},
   {translate:'0 '+distance(rows)+'px',offset:leadMs/settleMs,easing:'cubic-bezier(.42,0,.58,1)'},
   {translate:'0 0',offset:1}
  ],{delay:Math.max(0,duration-leadMs),duration:settleMs,fill:'none'});
  root.CubePopVisual?.wake?.(duration+settleMs);
 }
 function offset(entity,now){
  const cue=entity.landingRecoil;if(!cue)return 0;
  if(reduced()||now>=cue.start+cue.duration+settleMs-leadMs){cancel(entity);return 0;}
  return sample(cue.rows,now-cue.start,cue.duration);
 }
 const api={begin,cancel,offset,sample,distance,settleMs};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.CubePopFall=api;
})(typeof window==='object'?window:globalThis);
