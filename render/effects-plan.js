/* Presentation only: callers supply already adjudicated entities and bomb targets. */
(function(root){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function plan(event){
    const cells=event.cells.map((c,i)=>({...c,strong:false,popAt:62+(i%3)*8}));
    const byId=new Map(cells.map(c=>[c.id,c]));
    for(const burst of event.bursts||[]){
      burst.targets.forEach((id,i)=>{
        const c=byId.get(id);if(!c)return;
        let at=75+Math.abs(c.r-burst.r)*18+Math.abs(c.c-burst.c)*8;
        if(burst.type==='H'||burst.type==='V')at=65+(Math.abs(c.r-burst.r)+Math.abs(c.c-burst.c))*26;
        if(burst.type==='A')at=c.r===burst.r&&c.c===burst.c?85:113;
        if(burst.type==='W')at=id===burst.id?62:140+(Math.floor(i/3)%4)*28;
        c.popAt=c.strong?Math.min(c.popAt,at):at;c.strong=true;
      });
    }
    const level=clamp(event.level||1,1,3);
    for(const c of cells){c.start=c.popAt-62;c.end=c.popAt+42;c.boxW=c.strong?2.162:1.88;}
    return {...event,level,cells,coreMs:Math.max(104,...cells.map(c=>c.end))};
  }
  function pose(age,start=0,creation=false,reduced=false){
    const t=age-start;
    if(creation){
      if(reduced)return {scale:1,opacity:1};
      if(t<105)return {scale:.93,opacity:1};
      if(t<145)return {scale:.93+(t-105)/40*.2,opacity:1};
      return {scale:1+.13*(1-clamp((t-145)/85,0,1)),opacity:1};
    }
    if(t<0)return {scale:1,opacity:1};
    if(reduced)return {scale:1,opacity:t<104?1:0};
    if(t<35)return {scale:1-.07*t/35,opacity:1};
    if(t<62)return {scale:.93+.2*(t-35)/27,opacity:1};
    return {scale:Math.max(.001,1.13*(1-(t-62)/42)),opacity:clamp(1-(t-62)/42,0,1)};
  }
  function frameAt(entry,age){
    if(age<0)return null;
    let sum=0;for(const f of entry.frames||[]){sum+=f.durationMs||0;if(age<sum)return f;}
    return null;
  }
  const api={plan,pose,frameAt};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CubePopEffectsPlan=api;
})(typeof window==='object'?window:globalThis);
