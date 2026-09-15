/* Presentation only: callers supply already adjudicated entities and bomb targets. */
(function(root){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function plan(event){
    const cells=[...new Map(event.cells.map(c=>[c.id,c])).values()].map((c,i)=>({...c,strong:false,popAt:62+(i%3)*8}));
    const byId=new Map(cells.map(c=>[c.id,c]));
    for(const burst of event.bursts||[]){
      const arrivals=[...new Set(burst.targets)].filter(id=>id!==burst.id&&byId.has(id));
      const groupStep=Math.min(28,84/Math.max(1,Math.ceil(arrivals.length/3)-1));
      burst.targets.forEach((id,i)=>{
        const c=byId.get(id);if(!c)return;
        let at=75+Math.abs(c.r-burst.r)*18+Math.abs(c.c-burst.c)*8;
        if(burst.type==='H'||burst.type==='V')at=65+(Math.abs(c.r-burst.r)+Math.abs(c.c-burst.c))*22;
        if(burst.type==='A')at=85+Math.max(Math.abs(c.r-burst.r),Math.abs(c.c-burst.c))*28;
        if(burst.type==='W')at=id===burst.id?90:140+Math.floor(arrivals.indexOf(id)/3)*groupStep;
        c.popAt=c.strong?Math.min(c.popAt,at):at;c.strong=true;
      });
    }
    const level=clamp(event.level||1,1,3);
    for(const c of cells){c.start=c.popAt-62;c.end=c.popAt+42;c.boxW=c.strong?1.9:0;}
    return {...event,level,cells,coreMs:Math.max(104,...cells.map(c=>c.end))};
  }
  function pose(age,start=0,creation=false,reduced=false,strong=false){
    const t=age-start;
    if(creation){
      if(reduced)return {scale:1,opacity:1};
      if(t<105)return {scale:.93,opacity:1};
      if(t<145)return {scale:.93+(t-105)/40*.2,opacity:1};
      return {scale:1+.13*(1-clamp((t-145)/85,0,1)),opacity:1};
    }
    if(t<0)return {scale:1,opacity:1};
    if(reduced)return {scale:1,opacity:t<104?1:0};
    const low=strong?.945:.96,high=strong?1.06:1.04,begin=strong?0:17;
    if(t<begin)return {scale:1,opacity:1};
    if(t<35)return {scale:1-(1-low)*(t-begin)/(35-begin),opacity:1};
    if(t<62)return {scale:low+(high-low)*(t-35)/27,opacity:1};
    return {scale:Math.max(.001,high*(1-(t-62)/42)),opacity:clamp(1-(t-62)/42,0,1)};
  }
  // Shared remaining capacity is passed in by the renderer; no gameplay RNG is used.
  function allocation(count,budget,strong=false,creation=false,level=1,combo=false){
    const extra=strong&&combo&&level>=3?Math.min(8,budget):0;
    const each=Math.min(creation?8:strong?14:10,Math.floor(Math.max(0,budget-extra)/Math.max(1,count)));
    if(creation)return {each,stone:0,dust:0,cream:0,coat:each,extra:0};
    if(!strong){const cream=Math.max(0,Math.min(2,each-8));return {each,stone:0,dust:0,cream,coat:each-cream,extra:0};}
    const stone=Math.min(each,Math.min(4,Math.max(2,Math.floor(each*.3))));
    const dust=each>stone+1?(each>=10?2:1):0;
    return {each,stone,dust,cream:0,coat:each-stone-dust,extra};
  }
  function frameAt(entry,age){
    if(age<0)return null;
    let sum=0;for(const f of entry.frames||[]){sum+=f.durationMs||0;if(age<sum)return f;}
    return null;
  }
  const api={plan,pose,frameAt,allocation};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CubePopEffectsPlan=api;
})(typeof window==='object'?window:globalThis);
