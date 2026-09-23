/* Browser adapter for the versioned garden rules. The engine owns decisions;
 * these events only update the existing cube renderer, FX, HUD and progress. */
(function(root){
 'use strict';
 const R=root.CubePopGimmicks,D=root.CubePopStages;
 const names={ice:'얼음층',vine:'덩굴',door:'문',star:'별자리'},marks={ice:'❄',vine:'♧',door:'▣',star:'☆'};
 const teaching={
  ice:['고정된 얼음','얼음이 남은 큐브는 돌리거나 떨어뜨릴 수 없어요. 주변의 일반 큐브를 돌려보세요. 해제 방식은 현재 비교 검토 중입니다.'],
  rock:['암벽 아래에도 입구가 있어요','암벽은 돌리거나 지울 수 없어요. 아래 구역은 자체 입구에서 채워져요. 줄 폭탄은 암벽 너머까지 닿아요.'],
  thick:['두 겹 얼음','두 줄 테두리는 두 겹이에요. 얼음이 남아 있는 큐브는 제자리에 고정돼요. 해제 방식은 현재 비교 검토 중입니다.'],
  vine:['덩굴을 풀어요','묶인 큐브는 돌릴 수 없어요. 바로 위·아래·왼쪽·오른쪽 큐브를 지우거나 폭탄을 맞히면 풀려요.'],
  key:['열쇠와 문','열쇠가 달린 큐브를 없애면 같은 색·문양의 문이 열려요. 열쇠는 큐브와 함께 이동해요.'],
  star:['별자리를 밝혀요','별 테두리 위의 큐브를 지워 별을 밝혀요. 그냥 돌리거나 새 큐브가 내려오는 것만으로는 켜지지 않아요.'],
  rotor:['정원이 함께 돌아요','표시된 행동 수마다 회전판의 큐브가 동시에 돌아요. 작은 도형은 다음 윗면이에요. 폭탄은 돌지 않고, 자동 회전은 횟수를 쓰지 않아요.']
 };
 let state=null,shown=null,epoch=0,base=0,entities=new Map(),history=[],openedHelp=false;
 let hud=null,layer=null,help=null,feedbackTimer=0,helpTargets=[],dim=null,hand=null,helpAction=null,observing=false;
 const active=()=>!!state&&stageNo>=20;
 const vineAsset='assets/gimmicks/vine-cover-v8.png',vineIcon='assets/gimmicks/goal-vine-v8.png';
 const goalMark=type=>root.GimmickArt.icon(type);
 let vineLayer=null;
 // Load once; creating decorations does not decode the texture on every event.
 if(root.Image)for(const src of [vineAsset,vineIcon]){const image=new root.Image();image.src=src;image.decode?.().catch(()=>{});}
 function drawVines(s){
  const F=root.CubePopFrame;
  for(const art of vineLayer.querySelectorAll('image'))if(!s.vines.includes(Number(art.dataset.cell))&&!art.classList.contains('releasing'))art.remove();
  for(const k of s.vines){if(vineLayer.querySelector('[data-cell="'+k+'"]'))continue;
   const [r,c]=R.rc(k),w=F.world(c*STEP,r*STEP),p=F.project(w.x,0,w.z),scale=F.distance/(F.distance-w.z*F.cos),size=224*scale;
   const art=document.createElementNS('http://www.w3.org/2000/svg','image');
   for(const [name,value]of Object.entries({class:'gmVineArt','data-cell':k,href:vineAsset,x:p.x-112*scale,y:p.y+(628-F.cy)*scale,width:size,height:size,preserveAspectRatio:'xMidYMid meet'}))art.setAttribute(name,value);
   vineLayer.append(art);
  }
 }
 async function revealVines(event,run){
  const released=(event.released||[]).map(k=>({k,e:entities.get(event.state.cells[k]?.id),art:vineLayer.querySelector('[data-cell="'+k+'"]')}));
  if(!released.length)return;
  for(const {art}of released)art?.classList.add('releasing');
  root.CubePopVisual?.wake(240);
  if(!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches)await sleep(200);
  if(run!==epoch)return;
  for(const {e,art}of released){art?.remove();if(e){e.vined=false;e.el.classList.remove('gimmickVine');root.CubePopVisual?.paint?.(e);}}
  root.CubePopVisual?.wake(0);
 }
 function seed(n){const storageKey='cubepop_gimmick_seeds_'+D.get(n+1).version;let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch(_){}
  if(!Number.isInteger(saved[n])||saved[n]<=0||saved[n]>0xffffffff){const data=new Uint32Array(1);if(root.crypto?.getRandomValues)root.crypto.getRandomValues(data);else data[0]=Math.floor(Math.random()*0xffffffff);saved[n]=data[0]||1;try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch(_){} }
  return saved[n];
 }
 function config(n){const d=D.get(n+1);return {dist:[1,1,1,1,1,1],goals:d.colors,moves:d.moves,par:d.par};}
 function ensure(){if(hud)return;
  hud=document.createElement('div');hud.id='gimmickHud';hud.setAttribute('aria-label','정원 목표');document.querySelector('.goalsCard').append(hud);
  layer=document.createElement('div');layer.id='gimmickTerrain';boardInner.append(layer);
  vineLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');vineLayer.id='gimmickVines';vineLayer.setAttribute('viewBox','0 0 1536 1536');vineLayer.setAttribute('aria-hidden','true');$('board').append(vineLayer);
  help=document.createElement('section');help.id='gimmickHelp';help.hidden=true;help.setAttribute('role','dialog');help.setAttribute('aria-label','정원 기믹 안내');document.body.append(help);
  dim=document.createElementNS('http://www.w3.org/2000/svg','svg');dim.id='gimmickHelpDim';dim.setAttribute('aria-hidden','true');dim.style.display='none';document.body.append(dim);
  hand=document.createElement('img');hand.id='gimmickHelpHand';hand.src='assets/pastel-garden/tutorial/gesture-tap.svg';hand.alt='';hand.hidden=true;document.body.append(hand);
  hand.src='assets/interaction/gesture-roll-hand.svg';
  const rulesButton=document.createElement('button');rulesButton.id='gardenRulesSetting';rulesButton.className='tutorialReplay';rulesButton.textContent='정원 규칙 보기';rulesButton.onclick=()=>{closeSettings();openHelp();};$('setModal').querySelector('.modalInner').append(rulesButton);
  if(!root.__SIM&&root.ResizeObserver){new root.ResizeObserver(positionHelp).observe(help);document.fonts?.ready.then(positionHelp);}
 }
 function closeHelp(){openedHelp=false;observing=false;helpTargets=[];helpAction=null;if(help)help.hidden=true;if(dim)dim.style.display='none';if(hand)hand.hidden=true;document.querySelectorAll('.gimmickFocus').forEach(e=>e.classList.remove('gimmickFocus'));}
 function positionHelp(){if(root.__SIM)return;if(observing){positionObservation();return;}if(!openedHelp)return;const boxes=helpTargets.filter(e=>e?.isConnected).map(e=>e.getBoundingClientRect());if(!boxes.length)return;
  const top=Math.min(...boxes.map(r=>r.top)),bottom=Math.max(...boxes.map(r=>r.bottom)),height=Math.ceil(help.getBoundingClientRect().height),vh=root.innerHeight;
  const above=top-height-14,below=bottom+14;
  help.style.top=Math.max(8,Math.min(vh-height-8,above>=8?above:below+height<=vh-8?below:8))+'px';help.style.bottom='auto';
  help.dataset.tail=above>=8?'bottom':below+height<=vh-8?'top':'none';
  const focus=helpAction?.el.getBoundingClientRect()||boxes[0],hb=help.getBoundingClientRect();help.style.setProperty('--tail-x',Math.max(22,Math.min(hb.width-22,focus.left+focus.width/2-hb.left))+'px');
  const board=$('board').getBoundingClientRect(),scale=board.width/1536,paths=[];
  for(const el of helpTargets){const entity=Array.from(entities.values()).find(e=>e.el===el);if(entity?.vined)continue;const hull=entity&&root.CubePopVisual?.outline?.(entity);if(hull?.length)paths.push('M'+hull.map(p=>(board.x+p.x*scale)+','+(board.y+p.y*scale)).join('L')+'Z');
   else {const r=el.getBoundingClientRect(),b=Math.min(r.width,r.height)*.085;paths.push('M'+[ [r.left+b,r.top],[r.right-b,r.top],[r.right,r.top+b],[r.right,r.bottom-b],[r.right-b,r.bottom],[r.left+b,r.bottom],[r.left,r.bottom-b],[r.left,r.top+b]].map(p=>p.join(',')).join('L')+'Z');}}
  dim.setAttribute('viewBox','0 0 '+root.innerWidth+' '+vh);dim.innerHTML='<defs><mask id="gmHelpMask"><rect width="100%" height="100%" fill="white"/>'+paths.map(d=>'<path d="'+d+'" fill="black"/>').join('')+'</mask></defs><rect width="100%" height="100%" fill="#24354A" fill-opacity=".58" mask="url(#gmHelpMask)"/>';dim.style.display='block';
  hand.hidden=!helpAction||!canUse(helpAction);if(!hand.hidden){const r=helpAction.el.getBoundingClientRect(),d=D.get(stageNo+1).intro.direction;const right=d==='W'||r.left<70;hand.style.left=(right?r.right-15:r.left-40)+'px';hand.style.top=(r.bottom-14)+'px';hand.style.transform=right?'none':'scaleX(-1)';}
 }
 function positionObservation(){help.dataset.tail='none';const b=$('board').getBoundingClientRect(),h=help.getBoundingClientRect().height,vh=root.innerHeight;help.style.top=Math.max(8,b.top-h-12>=8?b.top-h-12:Math.min(vh-h-8,b.bottom+12))+'px';help.style.bottom='auto';dim.setAttribute('viewBox','0 0 '+root.innerWidth+' '+vh);dim.innerHTML='<defs><mask id="gmHelpMask"><rect width="100%" height="100%" fill="white"/><rect x="'+b.x+'" y="'+b.y+'" width="'+b.width+'" height="'+b.height+'" fill="black"/></mask></defs><rect width="100%" height="100%" fill="#24354A" fill-opacity=".58" mask="url(#gmHelpMask)"/>';dim.style.display='block';}
 function observation(type){if(!observing)return;hand.hidden=true;help.hidden=false;help.innerHTML='<p></p>';help.querySelector('p').textContent=({roll:'큐브가 제자리에서 돌아가요.',auto:'회전판이 함께 돌아가요.',clear:'보호층과 매치가 어떻게 바뀌는지 살펴보세요.',fall:'빈 구간에 큐브가 채워져요.'}[type])||'변화를 살펴보세요.';positionHelp();}
 function openHelp(){if(!active())return;ensure();openedHelp=true;const d=D.get(stageNo+1),kind=d.onboarding||({alps:'ice',royal:state.locks.length?'key':'vine',astral:state.period?'rotor':'star'}[d.region]),[title,body]=teaching[kind];
  hideRollPreview();help.innerHTML='<small>기믹 안내</small><button type="button" class="gmHelpExit" aria-label="기믹 안내 종료"><img src="assets/interaction/tutorial-close.svg" alt=""><span>종료</span></button><h2></h2><p></p>';help.querySelector('h2').textContent=title;help.querySelector('p').textContent=body;help.querySelector('button').onclick=closeHelp;help.hidden=false;
  const helpIcon=kind==='rock'?'<img class="gmVineIcon" src="'+root.GimmickArt.base+'objects/rock.png" alt="">':kind==='rotor'?'<img class="gmVineIcon" src="'+root.GimmickArt.base+'rotor/'+d.intro.direction+'-idle.svg" alt="">':goalMark(kind==='thick'?'ice':kind);
  help.querySelector('h2').insertAdjacentHTML('afterbegin',helpIcon+' ');
  const targets=kind==='rock'?d.rocks:kind==='vine'?[d.vines[0],...d.intro.match]:kind==='key'?state.locks.filter(g=>!g.open).map(g=>{const e=state.cells.find(e=>e?.id===g.carrierCubeId);return e?R.rc(e.k):g.key;}):kind==='rotor'?d.rotors.map(p=>[p.r,p.c]):d.intro.match;
  helpTargets=[];for(const [r,c] of targets){const el=grid[r]?.[c]?.el||layer.querySelector('[data-cell="'+R.key(r,c)+'"]');el?.classList.add('gimmickFocus');if(el)helpTargets.push(el);}
  if(state.action===0){const p=document.createElement('p');p.className='gmFirstMove';p.textContent=`첫 수: 위에서 ${d.intro.target[0]+1}번째 줄, 왼쪽 ${d.intro.target[1]+1}번째 큐브를 ${ {N:'위쪽',S:'아래쪽',E:'오른쪽',W:'왼쪽'}[d.intro.direction]}으로 굴려보세요 ${ {N:'↑',S:'↓',E:'→',W:'←'}[d.intro.direction]}`;help.querySelector('p').after(p);}
  helpAction=state.action===0?grid[d.intro.target[0]]?.[d.intro.target[1]]:null;
  if(helpAction&&canUse(helpAction)){if(!helpTargets.includes(helpAction.el))helpTargets.push(helpAction.el);const arrow=document.createElement('img');arrow.className='gmHelpArrow';arrow.src='assets/interaction/roll-arc-right.svg';arrow.style.transform='rotate('+({E:0,S:90,W:180,N:270}[d.intro.direction])+'deg)';arrow.alt='';help.querySelector('.gmFirstMove')?.prepend(arrow);}
  positionHelp();
 }
 function feedback(text){ensure();let out=$('gimmickFeedback');if(!out){out=document.createElement('div');out.id='gimmickFeedback';out.setAttribute('role','status');document.querySelector('.app').append(out);}out.textContent=text;out.hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>{out.hidden=true;},1400);}
 function canUse(cube){const s=shown||state,k=R.key(cube.r,cube.c);return !active()||(R.playable(s,k)&&!s.cells[k]?.ice);}
 function reject(cube){const s=shown||state,k=R.key(cube.r,cube.c);if(s?.vines.includes(k)){const art=vineLayer?.querySelector('[data-cell="'+k+'"]');if(art){art.classList.remove('rejected');art.getBoundingClientRect();art.classList.add('rejected');root.CubePopVisual?.wake(180);}}feedback(s?.cells[k]?.ice?'얼음 큐브는 고정돼 있어요. 주변의 일반 큐브를 돌려보세요.':s?.vines.includes(k)?'덩굴 옆 큐브를 지우거나 폭탄으로 풀어주세요.':'이 칸은 회전할 수 없어요.');}
 function sync(s){shown=s;const keep=new Set(s.cells.filter(Boolean).map(e=>e.id));
  for(const [id,e] of entities)if(!keep.has(id)){e.el.remove();entities.delete(id);}
  grid=Array.from({length:6},()=>Array(6).fill(null));
  for(const item of s.cells){if(!item)continue;const [r,c]=R.rc(item.k);let e=entities.get(item.id);
   if(e&&((e.btype||null)!==(item.bomb||null))){e.el.remove();entities.delete(item.id);e=null;}
   if(!e){e=item.bomb?makeBomb(r,c,item.ci,item.bomb):makeCube(r,c,item.o);e.id=base+item.id;e.logicId=item.id;entities.set(item.id,e);}
   e.r=r;e.c=c;e.ice=item.ice;e.vined=s.vines.includes(item.k);if(!item.bomb){e.orient={...item.o};e.faceColors=[0,1,2,3,4,5];paint(e);}place(e);grid[r][c]=e;
   e.el.dataset.ice=item.ice||0;e.el.classList.toggle('gimmickVine',e.vined);e.el.classList.toggle('gimmickIce',!!item.ice);
   let decoration=e.el.querySelector('.gimmickSkin');if(!decoration){decoration=document.createElement('div');decoration.className='gimmickSkin';decoration.setAttribute('aria-hidden','true');e.el.append(decoration);}
   decoration.textContent='';
   e.el.querySelectorAll('.gmCarriedKey').forEach(el=>el.remove());
   e.el.setAttribute('aria-label',e.vined?'덩굴로 봉인된 큐브':(item.ice?item.ice+'겹 얼음 ':'')+(item.bomb?'폭탄':colSym(R.color(item))+' 큐브'));
  }
  goals=s.goals.map(g=>({...g}));movesLeft=s.moves;score=stageStartScore+s.score;maxCombo=s.maxCombo;
  terrain(s);updateHUD();
 }
 function terrain(s){ensure();layer.innerHTML='';
  drawVines(s);root.GimmickArt.draw(s);
  for(let k=0;k<36;k++){
   const [r,c]=R.rc(k),type=s.terrain[k],vine=s.vines.includes(k),star=s.stars.find(t=>t.k===k),rotor=s.rotors.find(t=>R.key(t.r,t.c)===k),lock=s.locks.find(g=>R.key(...g.key)===k&&g.keyState==='pending'),door=s.locks.find(g=>g.doors.some(p=>R.key(...p)===k)&&!g.open);
   if(type!=='floor'){
    const el=document.createElement('div');el.className='gimmickTile gm-'+type;el.dataset.cell=k;el.style.transform=`translate(${c*STEP}px,${r*STEP}px)`;
    const label=type==='rock'?'암벽':type==='fountain'?'분수':type==='door'?'닫힌 문 '+door.id:'빈칸';
    el.textContent='';if(door)el.classList.add('gmGroup-'+door.id);el.setAttribute('aria-label',label);el.addEventListener('pointerdown',ev=>{ev.preventDefault();if(!busy)feedback(label+'은 돌릴 수 없어요.');});layer.append(el);
   }

  }

 }
 function renderHud(){if(!active()){if(hud)hud.hidden=true;document.querySelectorAll('.scorePanel .gmTools').forEach(el=>el.remove());return;}ensure();hud.hidden=false;const s=shown||state;
  const values=R.remaining(s),signature=values.map(g=>g.type+':'+g.ci).join('|');
  if(hud.dataset.signature!==signature){hud.dataset.signature=signature;hud.innerHTML='<div class="gmTools"><span class="gmCountdown"></span></div><div class="gmCards"></div>';
   for(const g of values){const card=document.createElement('div');card.className='gmGoal hudGoal';card.dataset.goal=g.type;card.innerHTML='<div class="gmValue hudValue"><span class="gmIcon hudIcon"></span><b class="hudCount"></b><img class="gmDone hudCheck" src="'+root.GimmickArt.base+'ui/complete.png" alt="완료"></div><span class="gmCaption hudCaption"></span>'+(g.type==='color'?'<div class="gmProgress hudTrack" role="progressbar"><i></i></div>':'');hud.querySelector('.gmCards').append(card);}
  }
  values.forEach((g,i)=>{const card=hud.querySelector('.gmCards').children[i],done=g.left===0;card.classList.toggle('done',done);card.querySelector('.gmDone').hidden=!done;
   card.querySelector('.gmIcon').innerHTML=g.type==='color'?root.CubePopSymbols.svg(stageColors[g.ci]).replace('-.5 -.5 1 1','-.26 -.26 .52 .52'):goalMark(g.type);
   if(g.type==='color')card.querySelector('.gmIcon').style.color=colHex(g.ci);
   card.querySelector('b').textContent=g.type==='color'?Math.min(g.got,g.need)+'/'+g.need:String(g.left);
   card.querySelector('.gmCaption').textContent=g.type==='color'?'모은 수':({ice:'얼음층 남음',vine:'덩굴 남음',door:'문 그룹 남음',star:'별자리 남음'}[g.type]);
   card.setAttribute('aria-label',g.type==='color'?colSym(g.ci)+' '+Math.min(g.got,g.need)+'/'+g.need:names[g.type]+' '+g.left+' 남음');
   if(g.type==='color'){const bar=card.querySelector('.gmProgress');bar.setAttribute('aria-label',colSym(g.ci)+' 수집');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',g.need);bar.setAttribute('aria-valuenow',Math.min(g.got,g.need));bar.querySelector('i').style.width=(Math.max(0,Math.min(1,g.got/g.need))*100)+'%';bar.querySelector('i').style.background=colHex(g.ci);}
  });
  const tools=hud.querySelector('.gmTools');
  if(tools){document.querySelectorAll('.scorePanel .gmTools').forEach(el=>el.remove());document.querySelector('.scorePanel').append(tools);}
  const counter=document.querySelector('.scorePanel .gmCountdown');
  counter.textContent=s.period?'자동 회전까지 '+s.countdown+'회':'';counter.hidden=!s.period;counter.parentElement.hidden=!s.period;
  $('gardenRulesSetting').disabled=busy;
 }

 function fxCells(items){return items.map(item=>{const entity=entities.get(item.id);return entity?effectCell(entity):null;}).filter(Boolean);}
 function bursts(items){return (items||[]).map(b=>({id:base+b.id,type:b.type,r:R.rc(b.k)[0],c:R.rc(b.k)[1],hex:colHex(b.ci??0),targets:b.targets.map(id=>base+id)}));}
 async function animate(events,run){for(const event of events){if(run!==epoch)return;root.GimmickPlay?.onPhase?.(event);observation(event.type);
  if(event.type==='roll'||event.type==='auto'){
   if(event.type==='auto'){feedback('회전판이 함께 돌아요');root.GimmickArt.autoCue(event.turns);}
   await Promise.all(event.turns.map(async t=>{const e=entities.get(t.id);if(!e)return;if(root.CubePopVisual)await root.CubePopVisual.roll(e,t.dir);else{e.wrap.style.transform=ROLL_T[t.dir];await sleep(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:265);e.wrap.style.transform=REST;}}));
   if(run!==epoch)return;sync(event.state);
  }else if(event.type==='clear'){
   const reveal=revealVines(event,run);
   const token=root.CubePopAnnouncements?.token(),cells=fxCells(event.consumed);
   const fx=root.CubePopEffects?.enabled?root.CubePopEffects.play({id:'garden:'+base+':'+event.id,cells,bursts:bursts(event.bursts),level:event.mult}):null;
   if(!fx)for(const cell of cells){cell.entity.el.style.opacity=0;cell.entity.el.style.transform+= ' scale(.12)';}
   for(const damage of event.damages){const e=entities.get(damage.id);if(e){e.ice=damage.layers;e.el.dataset.ice=damage.layers;e.el.classList.toggle('gimmickIce',!!damage.layers);e.el.querySelector('.gimmickSkin').textContent='';root.CubePopVisual?.paint(e);e.el.classList.add('iceCrack');}}
   root.GimmickArt.draw(event.state);root.GimmickArt.iceDamage(event.damages);shown=event.state;goals=shown.goals.map(g=>({...g}));score=stageStartScore+shown.score;updateHUD();
   if(event.mult>1||cells.length>=6)showFloat({kind:event.mult>1?'combo':'popped',mult:event.mult,count:cells.length,ids:cells.map(e=>e.id),token,id:'garden:'+base+':'+event.id});
   await Promise.all([sleep(fx?fx.coreMs:220),reveal]);if(run!==epoch)return;root.CubePopEffects?.release?.(fx);
   for(const e of event.consumed){entities.get(e.id)?.el.remove();entities.delete(e.id);}
   for(const e of entities.values())e.el.classList.remove('iceCrack');
  }else if(event.type==='fall'){
   sync(event.state);let duration=0;const falling=[],clips=[];
   for(const move of event.falls){const e=entities.get(move.id);if(!e)continue;const [r,c]=R.rc(move.to),fromR=Math.floor(move.from/6),d=70+Math.min(6,r-fromR)*30;duration=Math.max(duration,d);
    e.el.classList.add('falling');e.el.style.setProperty('--fall-duration',d+'ms');e.entryRow=Math.floor(move.entry/6);
    // The fallback DOM also clips replenishment to the segment's own mouth.
    // Coordinates stay board-relative, as required by the WebGL bridge.
    const clip=document.createElement('div');clip.className='gmFallClip';clip.style.clipPath=`inset(${e.entryRow*STEP}px 0 0 0)`;boardInner.append(clip);clip.append(e.el);clips.push(clip);
    e.el.style.transition='none';e.el.style.transform=`translate(${c*STEP}px,${fromR*STEP}px)`;e.el.getBoundingClientRect();e.el.style.transition='';place(e);falling.push(e);
   }
   root.CubePopVisual?.wake(duration+80);await sleep(duration?duration+40:0);if(run!==epoch){clips.forEach(e=>e.remove());return;}for(const e of falling){e.el.classList.remove('falling');e.el.style.removeProperty('--fall-duration');delete e.entryRow;boardInner.append(e.el);}clips.forEach(e=>e.remove());
  }else if(event.type==='spawn'||event.type==='convert'||event.type==='bonus-spawn'){
   sync(event.state);const fresh=(event.fresh||[]).map(e=>entities.get(e.id)).filter(Boolean);spawnEffects(fresh);
   if(event.type==='bonus-spawn')await sleep(48);
   if(event.type==='convert')await sleep(900);
  }else if(event.type==='fusion')showFloat({kind:'fusion',id:'garden:'+base+':'+event.id});
  else if(event.type==='bonus'){showFloat({kind:'bonus',count:event.count,id:'garden:'+base+':'+event.id});await sleep(200);}
  else sync(event.state);
 }}
 function start(n,keepScore,forcedSeed,comparisonOptions={}){
  ensure();epoch++;base+=100000;root.CubePopAnnouncements?.clear();root.CubePopEffects?.clear();root.PastelGarden.reset();cancelBoardPointers();closeHelp();unarmWild();
  boardInner.querySelectorAll('.cube,.gmFallClip').forEach(e=>e.remove());vineLayer.innerHTML='';entities=new Map();history=[];stageNo=n;
  root.GimmickArt.clear();state=R.create(D.get(n+1),forcedSeed??seed(n),comparisonOptions);shown=state;stageColors=[0,1,2,3,4,5];faceColorIdx=[0,1,2,3,4,5];
  cfgMoves=state.moves;cfgPar=D.get(n+1).par;if(!keepScore)score=0;stageStartScore=score;busy=false;over=false;skipReq=false;lastRolled=null;
  $('skipBtn').classList.remove('show');$('overlay').classList.remove('show');document.body.classList.add('gimmickGame');
  beginLesson();sync(state);
  if(D.get(n+1).onboarding&&!root.__SIM)openHelp();
 }
 async function play(input){if(!active()||busy||over||movesLeft<=0)return false;const began=root.performance?.now()||Date.now(),result=R.action(state,input);root.GimmickPlay.lastResolveMs=(root.performance?.now()||Date.now())-began;if(!result.valid){feedback('이 칸에서는 그 조작을 할 수 없어요.');return false;}
  const run=epoch,watch=openedHelp;history.push({...input});closeHelp();observing=watch;cancelBoardPointers();unarmWild();busy=true;root.GimmickArt.phase(true);movesLeft=state.moves;updateHUD();
  try{await animate(result.events,run);if(run!==epoch)return false;sync(state);
   if(state.status==='won'){over=true;await animate(R.finale(state),run);if(run!==epoch)return false;sync(state);busy=false;winStage();}
   else if(state.status==='lost'){busy=false;failStage();const extra=R.remaining(state).filter(g=>g.type!=='color'&&g.left);const p=document.createElement('p');p.className='gmRemaining';p.innerHTML=extra.map(g=>goalMark(g.type)+' '+names[g.type]+' '+g.left+' 남음').join(' · ');$('ovSub').append(p);}
  }finally{if(run===epoch){if(observing)closeHelp();busy=false;root.GimmickArt.phase(false);terrain(state);updateHUD();}}
  return true;
 }
 function tap(e){if(!active()||busy||over||movesLeft<=0||!e.el?.isConnected||grid[e.r]?.[e.c]!==e)return;if(!canUse(e)){reject(e);return;}
  const k=R.key(e.r,e.c);if(armedWild){const w=armedWild;if(w===e){unarmWild();return;}if(isAdjacent(w,e)){unarmWild();return play({type:'bomb',k:R.key(w.r,w.c),partner:k});}if(e.btype==='W'){unarmWild();arm(e);}return;}
  if(e.btype==='W'){arm(e);return;}return play({type:'bomb',k});
 }
 function arm(e){armWild(e);for(const row of grid)for(const x of row)if(x&&!R.playable(shown||state,R.key(x.r,x.c))){x.el.classList.remove('pickable');pickableCells.delete(x.r+','+x.c);}}
 function pick(ci){const e=armedWild;unarmWild();if(e)return play({type:'bomb',k:R.key(e.r,e.c),color:ci});}
 function stop(){epoch++;root.GimmickArt.clear();closeHelp();root.CubePopEffects?.clear();for(const e of entities.values())e.el.remove();entities.clear();if(layer)layer.innerHTML='';if(vineLayer)vineLayer.innerHTML='';if(hud)hud.hidden=true;state=shown=null;document.body.classList.remove('gimmickGame');}
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeHelp();});
 root.addEventListener('resize',positionHelp);root.addEventListener('scroll',positionHelp,{passive:true});
 root.GimmickPlay={displayState:()=>shown||state,active,start,stop,config,play,tap,pick,canUse,reject,hud:renderHud,closeHelp,openHelp,positionHelp,repaint:()=>active()&&terrain(shown||state),done:()=>!!state&&R.complete(state),snapshot:()=>R.copy(state),replay:()=>({version:state?.version,stage:stageNo+1,seed:state?.seed,actions:history.slice()}),sync:()=>state&&sync(state)};
})(window);
