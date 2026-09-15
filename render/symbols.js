(function(root){
function symbolPath(ctx,color){
  ctx.beginPath();
  if(color===0)ctx.arc(0,0,.195,0,Math.PI*2);
  if(color===1){ctx.moveTo(0,-.24);ctx.lineTo(.23,.19);ctx.lineTo(-.23,.19);ctx.closePath();}
  if(color===2)ctx.rect(-.19,-.19,.38,.38);
  if(color===3){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.108:.25;ctx[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();}
  if(color===4){ctx.moveTo(0,-.235);ctx.lineTo(.235,0);ctx.lineTo(0,.235);ctx.lineTo(-.235,0);ctx.closePath();}
  if(color===5){ctx.moveTo(0,.23);ctx.bezierCurveTo(-.47,-.04,-.17,-.37,0,-.17);ctx.bezierCurveTo(.17,-.37,.47,-.04,0,.23);ctx.closePath();}
}
function svg(index){let d='';const n=v=>Number(v.toFixed(6));const ctx={beginPath(){},moveTo(x,y){d+='M'+n(x)+' '+n(y);},lineTo(x,y){d+='L'+n(x)+' '+n(y);},closePath(){d+='Z';},rect(x,y,w,h){d+='M'+n(x)+' '+n(y)+'h'+n(w)+'v'+n(h)+'h'+n(-w)+'Z';},arc(x,y,r){d+='M'+n(x-r)+' '+n(y)+'a'+n(r)+' '+n(r)+' 0 1 0 '+n(2*r)+' 0a'+n(r)+' '+n(r)+' 0 1 0 '+n(-2*r)+' 0';},bezierCurveTo(a,b,c,e,f,g){d+='C'+[a,b,c,e,f,g].map(n).join(' ');}};symbolPath(ctx,index);return '<svg viewBox="-.5 -.5 1 1" aria-hidden="true"><path d="'+d+'" fill="currentColor"/></svg>';}
root.CubePopSymbols={symbolPath,svg,inks:['#92283a','#966926','#007a6a','#176480','#604185','#9e502b']};
if(typeof module==='object')module.exports=root.CubePopSymbols;
})(typeof window==='object'?window:globalThis);
