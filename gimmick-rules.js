/* Pure, deterministic rules for stages 21–50. Rendering consumes events; it never
 * calculates damage, goals, or refill colors. Legacy stages do not enter here. */
(function(root){
 'use strict';
 const shared=typeof module==='object'&&module.exports?require('./rules.js'):CubePopRules;
 const {pull,orientations,rollPull:dirs}=shared;
 const key=(r,c)=>r*6+c,rc=k=>[Math.floor(k/6),k%6];
 function random(s){s.rng=(s.rng+0x6D2B79F5)|0;let t=Math.imul(s.rng^(s.rng>>>15),1|s.rng);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;}
 const copy=s=>JSON.parse(JSON.stringify(s));
 const color=e=>e.bomb?(e.bomb==='W'?-1:e.ci):e.o.U;
 const blocked=(s,k)=>s.terrain[k]!=='floor';
 const locked=(s,k)=>s.vines.includes(k);
 const playable=(s,k)=>!blocked(s,k)&&!locked(s,k);
 // Independent permissions: fixed ice still exposes its color to the legacy
 // match resolver. Release policy remains unapproved; alternatives are QA-only.
 const canRotate=(s,k)=>!!s.cells[k]&&playable(s,k)&&!s.cells[k].ice&&!s.cells[k].bomb;
 const canFall=(s,k)=>playable(s,k)&&!s.cells[k]?.ice;
 const canMatch=(s,k)=>playable(s,k)&&!(s.icePolicy==='adjacent-qa'&&s.cells[k]?.ice);
 function bindKeys(s){const attached=[];for(const g of s.locks){
  if(g.open||g.keyState!=='pending')continue;
  const e=s.cells[key(...g.key)];if(!e||blocked(s,e.k))continue;
  g.carrierCubeId=e.id;g.keyState='carried';attached.push({group:g.id,id:e.id,k:e.k});
 }return attached;}
 function iceAccess(s){const issues=[];for(const e of s.cells)if(e?.ice){
  const windows=[];for(const axis of ['H','V'])for(let offset=-2;offset<=0;offset++){
   const [r,c]=rc(e.k),cells=[0,1,2].map(i=>[r+(axis==='V'?offset+i:0),c+(axis==='H'?offset+i:0)]);
   if(cells.some(([y,x])=>y<0||y>5||x<0||x>5))continue;
   const ks=cells.map(p=>key(...p));if(ks.some(k=>!playable(s,k)||!s.cells[k]))continue;
   windows.push(ks);
  }
  if(!windows.some(ks=>ks.some(k=>canRotate(s,k))&&ks.every(k=>!s.cells[k].ice||color(s.cells[k])===color(e))))issues.push({id:e.id,k:e.k,reason:'no-compatible-fixed-color-line'});
 }return issues;}
 function cube(s,k,o){return {id:++s.seq,k,o:o?{...o}:{...orientations[Math.floor(random(s)*24)]},ice:0};}
 function runs(s){const found=[];for(const dir of ['H','V'])for(let fixed=0;fixed<6;fixed++){
  let cells=[],ci=-1;const flush=()=>{if(ci>=0&&cells.length>=3)found.push({dir,ci,cells:cells.slice()});};
  for(let i=0;i<6;i++){const k=dir==='H'?key(fixed,i):key(i,fixed),e=s.cells[k],next=e&&canMatch(s,k)&&!(e.ice&&s.damaged.includes(e.id))?color(e):-1;
   if(next!==ci||next<0){flush();cells=[];ci=next;}if(next>=0)cells.push(k);
  }flush();
 }return found;}
 function base(def,seed){const terrain=def.mask.join('').split('').map(x=>x==='1'?'floor':'void');
  for(const p of def.rocks)terrain[key(...p)]='rock';for(const p of def.fountains)terrain[key(...p)]='fountain';
  for(const g of def.locks)for(const p of g.doors)terrain[key(...p)]='door';
  return {stage:def.stage,version:def.version,seed:seed>>>0,rng:seed|0,seq:0,event:0,action:0,moves:def.moves,score:0,maxCombo:1,terrain,cells:Array(36).fill(null),vines:def.vines.map(p=>key(...p)),locks:def.locks.map(g=>({...copy(g),open:false})),stars:def.stars.map(p=>({k:key(...p),lit:false})),rotors:copy(def.rotors),period:def.period,countdown:def.period,goals:def.colors.map(([ci,need])=>({ci,need,got:0})),damaged:[],status:'playing',intro:copy(def.intro),generationAttempts:0};}
 function create(def,seed,options={}){
  // Each trial uses the same stream. Hard bound; a deterministic construction is
  // the fallback, not an unbounded reroll or a change to legacy random calls.
  const s=base(def,seed);let made=false;
  if(def.rating)s.rating=copy(def.rating);
  const requestedPolicy=options.icePolicy||'legacy-unconfirmed';
  if(!['legacy-unconfirmed','match-qa','adjacent-qa'].includes(requestedPolicy))throw Error('Unknown ice comparison policy');
  s.icePolicy='legacy-unconfirmed'; // identical initial boards for policy A/B
  s.policyStatus='I-01 release trigger pending; thaw rematch confirmed; rating '+(s.rating?.version||'legacy');
  s.thawRule='rematch-after-thaw';
  for(const g of s.locks){g.keyState='pending';g.carrierCubeId=null;}
  const applyIce=()=>{for(const p of def.ice){const e=s.cells[key(p.r,p.c)];if(!e)throw Error('Ice on blocked terrain');e.ice=p.layers;}};
  for(let attempt=0;attempt<(options.forceFallback?0:64);attempt++){
   for(let k=0;k<36;k++)s.cells[k]=blocked(s,k)?null:cube(s,k);
   const intro=def.intro;
   for(const p of intro.match){const k=key(...p);if(!s.cells[k])continue;const target=k===key(...intro.target);
    const choices=orientations.filter(o=>target?o.U!==intro.color&&pull(o,dirs[intro.direction]).U===intro.color:o.U===intro.color);
    s.cells[k].o={...choices[Math.floor(random(s)*choices.length)]};
   }
   applyIce();s.generationAttempts=attempt+1;if(!runs(s).length&&!iceAccess(s).length){made=true;break;}
  }
  if(!made){
   // Properly colored Latin rows have no triples. Preserve the taught triple,
   // then repair only non-intro cells deterministically until no run remains.
   s.seq=0;
   for(let k=0;k<36;k++)s.cells[k]=blocked(s,k)?null:cube(s,k,orientations.find(o=>o.U===(Math.floor(k/6)+k%6)%6));
   for(const p of def.intro.match){const k=key(...p),target=k===key(...def.intro.target);s.cells[k].o={...orientations.find(o=>target?o.U!==def.intro.color&&pull(o,dirs[def.intro.direction]).U===def.intro.color:o.U===def.intro.color)};}
   const fixed=new Set([...def.intro.match.map(p=>key(...p)),...def.ice.map(p=>key(p.r,p.c))]);
   for(const p of def.ice)s.cells[key(p.r,p.c)].o={...orientations.find(o=>o.U===def.intro.color)};
   for(let k=0;k<36;k++)if(s.cells[k]&&!fixed.has(k))s.cells[k].o={...orientations.find(o=>o.U===(Math.floor(k/6)+k%6)%6)};
   for(let guard=0;guard<72&&runs(s).length;guard++)for(const run of runs(s)){
    const k=run.cells.find(k=>!fixed.has(k));if(k===undefined)throw Error('Invalid intro triple');
    s.cells[k].o={...orientations.find(o=>o.U===(run.ci+1)%6)};
   }
   if(runs(s).length)throw Error('Invalid authored fallback');s.fallback=true;
  }
  applyIce();
  if(iceAccess(s).length)throw Error('Authored ice has no compatible match access');
  if(def.ice.some(p=>key(p.r,p.c)===key(...def.intro.target)))throw Error('Intro cannot rotate frozen cube');
  bindKeys(s);
  s.icePolicy=requestedPolicy;
  return s;
 }
 function remaining(s){const result=s.goals.map(g=>({type:'color',ci:g.ci,left:Math.max(0,g.need-g.got),need:g.need,got:g.got}));
  const ice=s.cells.reduce((n,e)=>n+(e?.ice||0),0);
  if(s.stage<=30)result.push({type:'ice',left:ice});
  if(s.stage>=31&&s.stage<=40){if(s.vines.length||s.stage!==34)result.push({type:'vine',left:s.vines.length});if(s.locks.length)result.push({type:'door',left:s.locks.filter(g=>!g.open).length});}
  if(s.stars.length)result.push({type:'star',left:s.stars.filter(g=>!g.lit).length});return result;
 }
 const complete=s=>remaining(s).every(g=>g.left===0);
 function segments(s,c){const list=[];let seg=[];for(let r=0;r<6;r++){const k=key(r,c);if(!canFall(s,k)){if(seg.length)list.push(seg);seg=[];}else seg.push(k);}if(seg.length)list.push(seg);return list;}
 function gravity(s){const falls=[];for(let c=0;c<6;c++)for(const seg of segments(s,c)){
  const existing=seg.map(k=>s.cells[k]).filter(Boolean),need=seg.length-existing.length;
  const added=seg.slice(0,need).map(k=>cube(s,k)),stack=[...added,...existing];
  for(let i=0;i<seg.length;i++){const e=stack[i],to=seg[i],from=i<need?key(Math.floor(seg[0]/6)-need+i,c):e.k;
   s.cells[to]=e;e.k=to;if(from!==to)falls.push({id:e.id,from,to,entry:seg[0],fresh:i<need});
  }
 }bindKeys(s);return falls;}
 function spawnPlan(s,rs,last){const spawns=new Map(),eligible=k=>{const e=s.cells[k];return e&&!e.bomb&&!e.ice&&playable(s,k);};
  const choose=run=>run.cells.includes(last)&&eligible(last)?last:run.cells.filter(eligible)[Math.floor(run.cells.filter(eligible).length/2)];
  for(const run of rs)if(run.cells.length>=5&&!run.cells.some(k=>s.cells[k].bomb)){const k=choose(run);if(k!==undefined)spawns.set(k,{k,ci:run.ci,bomb:'W'});}
  const h=new Set(rs.filter(r=>r.dir==='H').flatMap(r=>r.cells)),v=new Set(rs.filter(r=>r.dir==='V').flatMap(r=>r.cells));
  for(const k of h)if(v.has(k)){
   const group=rs.filter(r=>r.cells.includes(k)),candidate=eligible(k)?k:group.flatMap(r=>r.cells).find(eligible);
   if(candidate!==undefined&&!spawns.has(candidate))spawns.set(candidate,{k:candidate,ci:color(s.cells[candidate]),bomb:'A'});
  }
  for(const run of rs)if(run.cells.length===4&&!run.cells.some(k=>s.cells[k].bomb)&&!run.cells.some(k=>spawns.has(k))){const k=choose(run);if(k!==undefined)spawns.set(k,{k,ci:run.ci,bomb:run.dir});}
  return spawns;
 }
 function area(k,radius){const [r,c]=rc(k),out=[];for(let y=Math.max(0,r-radius);y<=Math.min(5,r+radius);y++)for(let x=Math.max(0,c-radius);x<=Math.min(5,c+radius);x++)out.push(key(y,x));return out;}
 function range(s,k,type,ci){const [r,c]=rc(k);if(type==='H')return Array.from({length:6},(_,x)=>key(r,x));if(type==='V')return Array.from({length:6},(_,y)=>key(y,c));if(type==='A')return area(k,1);
  if(ci===undefined){const counts=Array(6).fill(0);s.cells.forEach(e=>{if(e&&color(e)>=0)counts[color(e)]++;});ci=counts.indexOf(Math.max(...counts));}
  return s.cells.flatMap((e,k)=>e&&color(e)===ci?[k]:[]);
 }
 function hit(s,targets,spawns,mult,emit,initialBursts=[],skip=new Set(),wildColor){
  const set=new Set(targets),bursts=initialBursts.slice(),detonated=new Set(skip);
  // Resolve blast geometry before applying damage; ice/vine protections use
  // original IDs and the snapshot at the beginning of this removal step.
  let changed=true;while(changed){changed=false;for(const k of [...set]){const e=s.cells[k];if(!e?.bomb||detonated.has(e.id))continue;detonated.add(e.id);changed=true;
   const cells=range(s,k,e.bomb,wildColor);bursts.push({id:e.id,k,type:e.bomb,ci:e.ci,targets:cells.map(k=>s.cells[k]?.id).filter(Boolean)});cells.forEach(k=>set.add(k));
  }}
  const oldVines=new Set(s.vines),consumed=[],damages=[],release=new Set();
  for(const k of [...new Set([...set,...spawns.keys()])].sort((a,b)=>a-b)){
   const e=s.cells[k];if(!e||blocked(s,k))continue;
   if(oldVines.has(k)){if(set.has(k))release.add(k);spawns.delete(k);continue;}
   // Damage protection lasts while ice remains. A newly thawed cube survives
   // this hit (continue below), then becomes ordinary in the next settle pass.
   // Blast overlap is already deduplicated by the target set, not by banning
   // a thawed original ID from every later match in the same user action.
   if(e.ice&&s.damaged.includes(e.id)){spawns.delete(k);continue;}
   if(e.ice){e.ice--;s.damaged.push(e.id);damages.push({id:e.id,k,layers:e.ice});spawns.delete(k);continue;}
   consumed.push(copy(e));
  }
  for(const e of consumed){const ci=color(e),g=s.goals.find(g=>g.ci===ci);if(g&&!s.finale)g.got++;
   const [r,c]=rc(e.k);for(const [dy,dx] of [[-1,0],[1,0],[0,-1],[0,1]]){const y=r+dy,x=c+dx;if(y>=0&&y<6&&x>=0&&x<6&&oldVines.has(key(y,x)))release.add(key(y,x));}
   for(const star of s.stars)if(!s.finale&&star.k===e.k)star.lit=true;
   for(const g of s.locks)if(!s.finale&&!g.open&&g.keyState==='carried'&&g.carrierCubeId===e.id){g.open=true;g.keyState='collected';g.collectedAction=s.action;for(const p of g.doors)s.terrain[key(...p)]='floor';}
  }
  // Isolated comparison only: normal matches exclude frozen cells, adjacent
  // actual consumption damages one layer. Direct special hits remain valid.
  if(s.icePolicy==='adjacent-qa')for(const e of s.cells)if(e?.ice&&!s.damaged.includes(e.id)&&consumed.some(x=>Math.abs(Math.floor(x.k/6)-Math.floor(e.k/6))+Math.abs(x.k%6-e.k%6)===1)){
   e.ice--;s.damaged.push(e.id);damages.push({id:e.id,k:e.k,layers:e.ice});
  }
  s.vines=s.vines.filter(k=>!release.has(k));s.score+=consumed.length*10*mult;s.maxCombo=Math.max(s.maxCombo,mult);
  emit('clear',{consumed,damages,released:[...release],bursts,mult});
  for(const e of consumed)s.cells[e.k]=null;
  const fresh=[];for(const [k,p] of spawns){if(!consumed.some(e=>e.k===k))continue;const e={id:++s.seq,k,bomb:p.bomb,ci:p.ci,ice:0};s.cells[k]=e;fresh.push(copy(e));}
  if(fresh.length)emit('spawn',{fresh});
  const falls=gravity(s);emit('fall',{falls});return consumed.length+damages.length+release.size;
 }
 function action(s,input,options={}){
  if(s.status!=='playing')return {valid:false,events:[],reason:'finished'};
  const k=input.k,e=s.cells[k];if(!e||!playable(s,k))return {valid:false,events:[],reason:'blocked'};
  if(e.ice)return {valid:false,events:[],reason:'frozen'};
  if(input.type==='roll'&&(e.bomb||!dirs[input.dir]))return {valid:false,events:[],reason:'invalid-roll'};
  if(input.type==='bomb'&&!e.bomb)return {valid:false,events:[],reason:'not-bomb'};
  if(!['roll','bomb'].includes(input.type))return {valid:false,events:[],reason:'invalid-input'};
  const neighbor=[k-6,k+6,k-1,k+1].filter(n=>n>=0&&n<36&&Math.abs(Math.floor(n/6)-Math.floor(k/6))+Math.abs(n%6-k%6)===1&&playable(s,n));
  let partner=null;
  if(input.type==='bomb'){
   if(e.bomb==='W'){
    partner=input.partner===undefined?null:neighbor.map(k=>s.cells[k]).find(x=>x?.k===input.partner&&x.bomb);
    if(!partner&&!neighbor.some(k=>s.cells[k]&&!s.cells[k].bomb&&color(s.cells[k])===input.color))return {valid:false,events:[],reason:'choose-neighbor'};
   }else partner=neighbor.map(k=>s.cells[k]).find(x=>x?.bomb)||null;
  }
  const events=[],emit=(type,detail={})=>{s.event++;if(options.events!==false)events.push({type,id:s.event,action:s.action,...detail,state:copy(s)});};
  s.moves--;s.action++;s.damaged=[];
  let last=input.type==='roll'?k:undefined;
  if(input.type==='roll'){const before=copy(e.o);e.o=pull(e.o,dirs[input.dir]);emit('roll',{turns:[{id:e.id,k,dir:input.dir,before}]});}
  else if(partner){
   const a=e.bomb,b=partner.bomb,skip=new Set([e.id,partner.id]),targets=new Set([k,partner.k]);
   emit('fusion',{k,ids:[e.id,partner.id]});
   let rays=[];
   if(a==='W'||b==='W'){
    if(a==='W'&&b==='W')s.cells.forEach((x,k)=>{if(x)targets.add(k);});
    else{const other=a==='W'?partner:e,fresh=[];
     for(const x of s.cells)if(x&&!x.bomb&&color(x)===other.ci){targets.add(x.k);if(!x.ice&&!locked(s,x.k)){x.ci=other.ci;x.bomb=other.bomb==='A'?'A':random(s)<.5?'H':'V';fresh.push(copy(x));}}
     emit('convert',{fresh});
    }
   }else if(a==='A'&&b==='A')area(k,2).forEach(k=>targets.add(k));
   else if(a!=='A'&&b!=='A')for(const type of ['H','V']){const cells=range(s,k,type);cells.forEach(k=>targets.add(k));rays.push({id:e.id+':'+type,k,type,ci:e.ci,targets:cells.map(k=>s.cells[k]?.id).filter(Boolean)});}
   else{const type=a==='A'?b:a,[r,c]=rc(k);for(let d=-1;d<=1;d++){const at=type==='H'?r+d:c+d;if(at<0||at>5)continue;const center=type==='H'?key(at,c):key(r,at),cells=range(s,center,type);cells.forEach(k=>targets.add(k));rays.push({id:e.id+':'+d,k:center,type,ci:e.ci,targets:cells.map(k=>s.cells[k]?.id).filter(Boolean)});}}
   hit(s,targets,new Map(),1,emit,[{id:e.id,k,type:'COMBO',ci:e.ci,targets:[...targets].map(k=>s.cells[k]?.id).filter(Boolean)},...rays],skip);
  }else hit(s,[k],new Map(),1,emit,[],new Set(),input.color);
  const settle=()=>{let mult=1;for(let guard=0;guard<256;guard++){
   const rs=runs(s);if(!rs.length)return;const spawns=spawnPlan(s,rs,last),targets=rs.flatMap(r=>r.cells);
   // Replacement locations are consumed once here, unlike legacy 1–20.
   if(!hit(s,targets,spawns,mult++,emit))throw Error('Resolution made no progress');last=undefined;
  }throw Error('Cascade bound exceeded');};
  settle();
  if(!complete(s)&&s.period){s.countdown--;if(s.countdown===0){
   s.countdown=s.period;const turns=[];
   for(const rotor of s.rotors){const at=key(rotor.r,rotor.c),x=s.cells[at];if(!canRotate(s,at))continue;turns.push({id:x.id,k:at,dir:rotor.direction,before:copy(x.o)});}
   for(const t of turns)s.cells[t.k].o=pull(s.cells[t.k].o,dirs[t.dir]);
   emit('auto',{turns});settle();
  }}
  s.status=complete(s)?'won':s.moves<=0?'lost':'playing';emit('settled');
  return {valid:true,events,status:s.status};
 }
 function actions(s){const list=[];for(let k=0;k<36;k++){const e=s.cells[k];if(!e||!playable(s,k)||e.ice)continue;
  if(!e.bomb)for(const dir of 'NSEW')list.push({type:'roll',k,dir});
  else if(e.bomb!=='W')list.push({type:'bomb',k});
  else for(let n=0;n<36;n++){const x=s.cells[n];if(!x||!playable(s,n)||Math.abs(Math.floor(n/6)-Math.floor(k/6))+Math.abs(n%6-k%6)!==1)continue;list.push(x.bomb?{type:'bomb',k,partner:n}:{type:'bomb',k,color:color(x)});}
 }return list;}
 function validate(def){const errors=[],s=base(def,1),inside=p=>p.length===2&&p.every(x=>Number.isInteger(x)&&x>=0&&x<6);
  const all=[...def.rocks,...def.vines,...def.stars,...def.ice.map(p=>[p.r,p.c]),...def.rotors.map(p=>[p.r,p.c]),...def.locks.flatMap(g=>[g.key,...g.doors])];
  if(all.some(p=>!inside(p)))errors.push('Out of range');
  const groups=new Map(def.locks.map(g=>[g.id,g])),visiting=new Set(),done=new Set();
  function visit(id){if(visiting.has(id)){errors.push('Door dependency cycle');return;}if(done.has(id))return;visiting.add(id);const g=groups.get(id);for(const other of def.locks)if(other.doors.some(p=>key(...p)===key(...g.key)))visit(other.id);visiting.delete(id);done.add(id);}
  for(const g of def.locks)visit(g.id);
  const open=s.terrain.map(t=>t==='floor'||t==='door');
  const capable=k=>['H','V'].some(d=>{let n=1;for(const sign of [-1,1]){let [r,c]=rc(k);while(true){r+=d==='V'?sign:0;c+=d==='H'?sign:0;if(r<0||r>5||c<0||c>5||!open[key(r,c)])break;n++;}}return n>=3;});
  for(let k=0;k<36;k++)if(open[k]&&!capable(k))errors.push('Unusable isolated floor: '+rc(k));
  for(const p of [...def.ice.map(p=>[p.r,p.c]),...def.stars,...def.locks.map(g=>g.key)])if(!capable(key(...p)))errors.push('Target without a three-cell line: '+p);
  for(const p of def.vines){const k=key(...p),[r,c]=p;if(![[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(q=>inside(q)&&open[key(...q)]&&!def.vines.some(v=>key(...v)===key(...q))))errors.push('Sealed vine: '+k);}
  return errors;
 }
 function finale(s,options={}){
  if(s.status!=='won'||s.finale)return [];s.finale=true;s.damaged=[];
  const events=[],emit=(type,detail={})=>{s.event++;if(options.events!==false)events.push({type,id:s.event,action:s.action,...detail,state:copy(s)});};
  const n=s.moves,playScore=s.score,moveBonus=n*120;
  // Keep the ordinary point target meaningful for slower clears. Efficient
  // completion receives only the missing guaranteed points, before random FX.
  const efficient=!!s.rating&&s.action<=s.rating.efficientActions;
  const efficiencyBonus=efficient?Math.max(0,s.rating.par-playScore-moveBonus):0;
  s.finaleBreakdown={version:s.rating?.version||'legacy',actions:s.action,efficientActions:s.rating?.efficientActions??null,efficient,playScore,remainingMoves:n,moveBonus,efficiencyBonus,explosionScore:0};
  s.moves=0;s.score+=moveBonus+efficiencyBonus;
  const candidates=s.cells.filter(e=>e&&!e.bomb).map(e=>e.k);
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  const fresh=[];for(const k of candidates.slice(0,n)){const old=s.cells[k],e={id:++s.seq,k,ci:color(old),bomb:random(s)<.62?(random(s)<.5?'H':'V'):'A',ice:0};s.cells[k]=e;fresh.push(copy(e));emit('bonus-spawn',{fresh:[copy(e)]});}
  if(fresh.length){emit('bonus',{count:fresh.length});hit(s,fresh.map(e=>e.k),new Map(),1,emit);let mult=1;for(let i=0;i<256;i++){const rs=runs(s);if(!rs.length)break;hit(s,rs.flatMap(r=>r.cells),new Map(),mult++,emit);}}
  s.finaleBreakdown.explosionScore=s.score-playScore-moveBonus-efficiencyBonus;
  emit('settled');return events;
 }
 const api={create,action,actions,finale,remaining,complete,segments,runs,spawnPlan,validate,color,pull,dirs,orientations,copy,key,rc,playable,canRotate,canMatch,canFall,bindKeys,iceAccess,gravity};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.CubePopGimmicks=api;
})(typeof window==='object'?window:globalThis);
