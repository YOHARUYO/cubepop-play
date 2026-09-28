// Visual-only tree and timeline. Cell IDs break distance ties independently of
// state-array order; no gameplay RNG, score, or target mutations occur here.
// Keep the approved atlas timeline intact; shorten only completion playback.
export const connectionTiming=Object.freeze({scale:.75,duration:1720*.75,peakEnd:1035*.75});
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const pulse=t=>t<0?0:t<110?smooth(t/110):t<175?1:t<640?1-smooth((t-175)/465):0;
export function connectionTree(points,rootKey){
 const nodes=points.slice().sort((a,b)=>a.k-b.k),root=nodes.findIndex(n=>n.k===rootKey);
 if(root<0)return {nodes,edges:[],root:-1};
 const reached=new Set([root]),edges=[],distance=nodes.map(()=>0);
 while(reached.size<nodes.length){
  const candidates=[];
  for(const a of reached)for(let b=0;b<nodes.length;b++)if(!reached.has(b))candidates.push({a,b,length:Math.hypot(nodes[a].x-nodes[b].x,nodes[a].y-nodes[b].y)});
  candidates.sort((a,b)=>a.length-b.length||nodes[a.a].k-nodes[b.a].k||nodes[a.b].k-nodes[b.b].k);
  const e=candidates[0];edges.push(e);distance[e.b]=distance[e.a]+e.length;reached.add(e.b);
 }
 const longest=Math.max(...distance,1);
 for(const e of edges){e.start=190+distance[e.a]/longest*640;e.end=190+distance[e.b]/longest*640;}
 return {nodes,edges,root};
}
function sparkle(c,x,y,r,a){
 if(a<=0)return;c.save();c.globalAlpha=a;
 const g=c.createRadialGradient(x,y,0,x,y,r*1.9);g.addColorStop(0,'rgba(255,252,221,.8)');g.addColorStop(.2,'rgba(255,222,134,.45)');g.addColorStop(1,'rgba(255,205,101,0)');
 c.fillStyle=g;c.fillRect(x-r*2,y-r*2,r*4,r*4);c.fillStyle='#fffce3';c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.12,y-r*.12,x+r*.78,y);c.quadraticCurveTo(x+r*.12,y+r*.12,x,y+r);c.quadraticCurveTo(x-r*.12,y+r*.12,x-r*.78,y);c.quadraticCurveTo(x-r*.12,y-r*.12,x,y-r);c.fill();c.restore();
}
export function drawConnection(c,ms,tree,assets){
 if(ms<0||ms>=1720)return;
 const {nodes,edges,root}=tree,peak=pulse(ms-860),fade=1-smooth((ms-1140)/580);
 c.save();c.globalCompositeOperation='source-over';
 for(const e of edges){
  const q=smooth((ms-e.start)/Math.max(.001,e.end-e.start));if(!q)continue;
  const a=nodes[e.a],b=nodes[e.b],entry=assets.line.entry,frame=entry.frames[Math.min(entry.count-1,Math.floor(q*(entry.count-1)))];
  c.save();c.translate(a.x,a.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));c.globalAlpha=fade*(.78+.22*peak);
  c.drawImage(assets.line.image,...frame.rect,-24*e.length/592,-30,640*e.length/592,60);
  if(peak){c.globalAlpha=fade*peak*.5;c.lineCap='round';for(const [w,color]of [[32+8*peak,'rgba(255,207,112,.10)'],[18+4*peak,'rgba(255,220,143,.20)'],[7+2.1*peak,'rgba(255,230,165,.95)'],[3+peak,'rgba(255,255,235,.95)']]){c.beginPath();c.moveTo(0,0);c.lineTo(e.length,0);c.lineWidth=w;c.strokeStyle=color;c.stroke();}}
  c.restore();
 }
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i],arrival=i===root?0:edges.find(e=>e.b===i).end,local=pulse((ms-arrival)*2)*.42;
  if(ms>=860&&ms<1500){
   const entry=assets.pulse.entry,frame=entry.frames[Math.min(entry.count-1,Math.floor((ms-860)/640*entry.count))],s=n.size*1.45;
   c.save();c.globalAlpha=fade*(nodes.length>=7?.76:1);c.drawImage(assets.pulse.image,...frame.rect,n.x-s/2,n.y-s/2,s,s);c.restore();
  }else sparkle(c,n.x,n.y,n.size*(.26+.08*local),local);
  if(local>peak)sparkle(c,n.x,n.y,n.size*.22,local);
 }
 c.restore();
}
