/* Pure layout geometry. Never reads or changes game decisions. */
(function(root){
  const rect=(x,y,width,height)=>({x,y,width,height,right:x+width,bottom:y+height});
  const union=rs=>{const x=Math.min(...rs.map(r=>r.x)),y=Math.min(...rs.map(r=>r.y));return rect(x,y,Math.max(...rs.map(r=>r.right))-x,Math.max(...rs.map(r=>r.bottom))-y);};
  const overlaps=(a,b,g=0)=>a.x<b.right+g&&a.right>b.x-g&&a.y<b.bottom+g&&a.bottom>b.y-g;
  function hull(points){
    const p=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y),cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x),a=[],b=[];
    for(const q of p){while(a.length>1&&cross(a.at(-2),a.at(-1),q)<=0)a.pop();a.push(q);}
    for(const q of p.slice().reverse()){while(b.length>1&&cross(b.at(-2),b.at(-1),q)<=0)b.pop();b.push(q);}return a.slice(0,-1).concat(b.slice(0,-1));
  }
  function exitDistance(p,u,r){return Math.min(u.x>0?(r.right-p.x)/u.x:u.x<0?(r.x-p.x)/u.x:Infinity,u.y>0?(r.bottom-p.y)/u.y:u.y<0?(r.y-p.y)/u.y:Infinity);}
  function connector(a,b,ar,br){
    const length=Math.hypot(b.x-a.x,b.y-a.y),u={x:(b.x-a.x)/length,y:(b.y-a.y)/length};
    const start=exitDistance(a,u,ar),end=length-exitDistance(b,{x:-u.x,y:-u.y},br),space=end-start;
    const radius=2.8,span=42,required=span+2*radius+24;
    if(space<required)return {shortage:required-space,points:[],space};
    const center=(start+end)/2,points=Array.from({length:4},(_,i)=>{const t=center-span/2+i*span/3;return {x:a.x+u.x*t,y:a.y+u.y*t};});
    return {points,space,start,end,gap:(space-span)/2-radius,shortage:0};
  }
  function handAt(anchor,angle,pixels){
    const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const points=pixels.map(p=>({x:anchor.x+c*(p.x-17.25)-s*(p.y-6),y:anchor.y+s*(p.x-17.25)+c*(p.y-6)}));
    return {anchor,angle,points,bounds:union(points.map(p=>rect(p.x,p.y,1,1)))};
  }
  function chooseHand(edges,pixels,forbidden,view){
    const valid=h=>h.points.every(p=>p.x>=view.x+4&&p.x<=view.right-4&&p.y>=view.y+4&&p.y<=view.bottom-4&&!forbidden.some(r=>p.x>r.x-2&&p.x<r.right+2&&p.y>r.y-2&&p.y<r.bottom+2));
    for(const anchor of edges)for(const angle of [-35,35,-90,90,145,-145,180,0]){const h=handAt(anchor,angle,pixels);if(valid(h))return h;}
    // Keep pointing at a real edge when the nearby space is occupied.
    for(let y=view.y+30;y<view.bottom-40;y+=20)for(const x of [view.x+25,view.right-25])for(const angle of [-35,35,145,-145]){
      const h=handAt({x,y},angle,pixels);if(valid(h)){
        const target=edges.slice().sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
        const line=Array.from({length:21},(_,i)=>({x:x+(target.x-x)*i/20,y:y+(target.y-y)*i/20}));
        if(line.every(p=>!forbidden.some(r=>p.x>r.x&&p.x<r.right&&p.y>r.y&&p.y<r.bottom)))return {...h,line:target};
      }
    }
    return null;
  }
  root.InteractionLayout={rect,union,overlaps,hull,connector,chooseHand,handAt};
  if(typeof module==='object')module.exports=root.InteractionLayout;
})(typeof window==='object'?window:globalThis);
