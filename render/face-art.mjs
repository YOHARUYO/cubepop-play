export const INKS=['#92283a','#966926','#007a6a','#176480','#604185','#9e502b'];
export function symbolPath(ctx,color){
  ctx.beginPath();
  if(color===0)ctx.arc(0,0,.195,0,Math.PI*2);
  if(color===1){ctx.moveTo(0,-.24);ctx.lineTo(.23,.19);ctx.lineTo(-.23,.19);ctx.closePath();}
  if(color===2)ctx.rect(-.19,-.19,.38,.38);
  if(color===3){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.108:.25;ctx[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();}
  if(color===4){ctx.moveTo(0,-.235);ctx.lineTo(.235,0);ctx.lineTo(0,.235);ctx.lineTo(-.235,0);ctx.closePath();}
  if(color===5){ctx.moveTo(0,.23);ctx.bezierCurveTo(-.47,-.04,-.17,-.37,0,-.17);ctx.bezierCurveTo(.17,-.37,.47,-.04,0,.23);ctx.closePath();}
}
export function drawFace(ctx,color,index,mark=''){
  const size=ctx.canvas.width;ctx.save();ctx.scale(size,size);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);
  if(mark==='W'){
    const gradient=ctx.createLinearGradient(.12,.12,.88,.88);
    ['#f45c70','#f8c54d','#09c6aa','#3ebde8','#b68aee','#f79b58'].forEach((c,i)=>gradient.addColorStop(i/5,c));ctx.fillStyle=gradient;ctx.fillRect(0,0,1,1);
  }
  if(mark==='H'||mark==='V'){
    ctx.fillStyle='#fffbee';if(mark==='H')ctx.fillRect(0,.28,1,.44);else ctx.fillRect(.28,0,.44,1);
    ctx.save();ctx.translate(.5,.5);if(mark==='V')ctx.rotate(Math.PI/2);ctx.fillStyle='#514c3f';
    for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(sign*.46,0);ctx.lineTo(sign*.33,-.08);ctx.lineTo(sign*.33,.08);ctx.closePath();ctx.fill();}ctx.restore();
  }
  if(mark==='A'){ctx.strokeStyle='#fffbee';ctx.lineWidth=.055;ctx.beginPath();ctx.arc(.5,.5,.33,0,Math.PI*2);ctx.stroke();}
  ctx.translate(.5,.5);
  if(mark==='W'){
    ctx.fillStyle='#fffdf1';ctx.beginPath();for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,r=i%2?.095:.32;ctx[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();
  }else if(mark!=='plain'){if(mark==='H'||mark==='V')ctx.scale(.7,.7);symbolPath(ctx,index);ctx.fillStyle=mark==='H'||mark==='V'?'#514c3f':INKS[index];ctx.fill();}
  ctx.restore();
}
