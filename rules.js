(function(root){
  'use strict';
  const slots=['U','D','N','S','E','W'];
  const rollPull={N:'S',S:'N',E:'W',W:'E'};
  function pull(o,d){
    const {U,D,N,S,E,W}=o;
    if(d==='N')return {U:N,N:D,D:S,S:U,E,W};
    if(d==='S')return {U:S,S:D,D:N,N:U,E,W};
    if(d==='E')return {U:E,E:D,D:W,W:U,N,S};
    return {U:W,W:D,D:E,E:U,N,S};
  }
  function createRandom(seed){
    let value=seed>>>0;
    return function(){
      value=(value+0x6D2B79F5)|0;
      let t=Math.imul(value^(value>>>15),1|value);
      t^=t+Math.imul(t^(t>>>7),61|t);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  const orientations=[],seen=new Set(),queue=[{U:0,D:1,N:2,S:3,E:4,W:5}];
  while(queue.length){
    const o=queue.shift(),key=slots.map(s=>o[s]).join(',');
    if(seen.has(key))continue;
    seen.add(key);orientations.push(o);
    for(const d of 'NSEW')queue.push(pull(o,d));
  }
  const faces=[0,0,1,1,2,2];
  const definitions=[
    {title:'가로로 세 개',target:[2,2],direction:'E',cells:[[2,1],[2,2],[2,3]],type:null,moves:4,need:3,seed:1206,
      instruction:'화살표가 있는 큐브 하나만 오른쪽으로 돌려보세요. 밝게 보이는 세 개의 윗면 색을 맞춰요.',success:'가로로 같은 색 세 개를 연결했어요!'},
    {title:'세로로 세 개',target:[2,2],direction:'N',cells:[[1,2],[2,2],[3,2]],type:null,moves:4,need:3,
      instruction:'화살표 큐브만 위로 돌려보세요. 자리는 그대로, 세로 세 개의 윗면 색을 맞춰요.',success:'세로 매치도 성공했어요!'},
    {title:'가로 네 개 · 가로 폭탄',target:[2,2],direction:'E',cells:[[2,0],[2,1],[2,2],[2,3]],type:'H',moves:5,need:3,
      instruction:'화살표 큐브만 오른쪽으로 돌려 네 개의 색을 맞춰요. 가로 폭탄이 만들어져요.',bombInstruction:'가로 폭탄이 생겼어요! 빛나는 폭탄을 눌러 한 줄을 지워보세요.',success:'가로 폭탄으로 한 줄을 지웠어요!'},
    {title:'세로 네 개 · 세로 폭탄',target:[2,2],direction:'S',cells:[[0,2],[1,2],[2,2],[3,2]],type:'V',moves:5,need:3,seed:1206,
      instruction:'화살표 큐브만 아래로 돌려 세로 네 개의 색을 맞춰요. 세로 폭탄이 만들어져요.',bombInstruction:'세로 폭탄이 생겼어요! 눌러서 한 열을 지워보세요.',success:'세로 폭탄으로 한 열을 지웠어요!'},
    {title:'교차 매치 · 주변 폭탄',target:[2,2],direction:'W',cells:[[2,1],[2,2],[2,3],[1,2],[3,2]],type:'A',moves:5,need:4,seed:1208,
      instruction:'화살표 큐브만 왼쪽으로 돌려 가로와 세로의 색을 함께 맞춰요. 주변 폭탄이 만들어져요.',bombInstruction:'주변 폭탄이 생겼어요! 눌러서 주변 3×3칸을 지워보세요.',success:'교차 매치와 주변 폭탄을 익혔어요!'},
    {title:'다섯 개 · 무지개 큐브',target:[2,2],direction:'E',cells:[[2,0],[2,1],[2,2],[2,3],[2,4]],type:'W',moves:5,need:4,seed:1208,
      instruction:'화살표 큐브만 오른쪽으로 돌려 다섯 개의 색을 맞춰요. 무지개 큐브가 만들어져요.',bombInstruction:'무지개 큐브가 생겼어요! 먼저 무지개 큐브를 눌러보세요.',success:'선택한 색을 한 번에 지웠어요! 이제 자유롭게 도전해보세요.'}
  ];
  function runs(board){
    const found=[];
    for(const direction of ['H','V'])for(let fixed=0;fixed<6;fixed++){
      let cells=[],color=-1;
      const flush=()=>{if(color>=0&&cells.length>=3)found.push({direction,color,cells:cells.slice()});};
      for(let i=0;i<6;i++){
        const r=direction==='H'?fixed:i,c=direction==='H'?i:fixed,next=board[r][c];
        if(next!==color){flush();cells=[];color=next;}
        cells.push([r,c]);
      }
      flush();
    }
    return found;
  }
  function makeLesson(definition,index){
    const rng=createRandom(0xC0BE+index),key=([r,c])=>r+','+c;
    const expected=new Set(definition.cells.map(key));
    for(let attempt=0;attempt<10000;attempt++){
      const board=Array.from({length:6},()=>Array.from({length:6},()=>Math.floor(rng()*3)));
      for(const [r,c] of definition.cells)board[r][c]=0;
      const [tr,tc]=definition.target;board[tr][tc]=1;
      if(runs(board).length)continue;
      board[tr][tc]=0;
      const result=runs(board),actual=new Set(result.flatMap(run=>run.cells.map(key)));
      if(actual.size!==expected.size||[...actual].some(k=>!expected.has(k)))continue;
      if(definition.type==='A'&&result.length!==2)continue;
      // Existing cubes must not form an automatic second match after gravity.
      // The player should be able to inspect and activate the new special cube.
      const settled=Array.from({length:6},()=>Array(6).fill(-1));
      for(let c=0;c<6;c++){
        const stack=[];
        for(let r=5;r>=0;r--){
          if(!expected.has(key([r,c])))stack.push(board[r][c]);
          else if(definition.type&&r===tr&&c===tc)stack.push(definition.type==='W'?-2:0);
        }
        stack.forEach((color,i)=>{settled[5-i][c]=color;});
      }
      if(runs(settled).length)continue;
      board[tr][tc]=1;
      const layout=board.map((row,r)=>row.map((color,c)=>{
        const candidates=orientations.filter(o=>faces[o.U]===color&&
          (r!==tr||c!==tc||faces[pull(o,rollPull[definition.direction]).U]===0));
        return {...candidates[Math.floor(rng()*candidates.length)]};
      }));
      return {...definition,layout,seed:definition.seed||1201+index,par:390};
    }
    throw new Error('Unable to build the authored lesson '+index);
  }
  const lessons=definitions.map(makeLesson);
  function preview(orientation,faceColors){
    const result={U:faceColors[orientation.U]};
    for(const direction of 'NSEW')result[direction]=faceColors[pull(orientation,rollPull[direction]).U];
    return result;
  }
  const api={pull,rollPull,createRandom,orientations,lessons,faces,preview};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CubePopRules=api;
})(typeof globalThis==='object'?globalThis:this);
