'use strict';
let previewOn=true,previewCube=null;
try{previewOn=localStorage.getItem('cubepop_v2_preview')!=='0';}catch(_){}
let attemptSeeds={};
try{
  const saved=JSON.parse(localStorage.getItem('cubepop_v2_seeds')||'{}');
  if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const [key,value] of Object.entries(saved)){
    if(/^\d+$/.test(key)&&+key<TOTAL_STAGES&&Number.isInteger(value)&&value>0&&value<=0xffffffff)attemptSeeds[key]=value;
  }
}catch(_){}
function attemptSeed(n){
  if(CubePopRules.lessons[n])return CubePopRules.lessons[n].seed;
  if(!attemptSeeds[n]){
    const data=new Uint32Array(1);
    if(globalThis.crypto&&crypto.getRandomValues)crypto.getRandomValues(data);
    else data[0]=Math.floor(Math.random()*0xffffffff);
    attemptSeeds[n]=data[0]||1;
    try{localStorage.setItem('cubepop_v2_seeds',JSON.stringify(attemptSeeds));}catch(_){}
  }
  return attemptSeeds[n];
}
function setPreview(on){
  previewOn=!!on;$('previewToggle').checked=previewOn;
  try{localStorage.setItem('cubepop_v2_preview',previewOn?'1':'0');}catch(_){}
  if(!previewOn)hideRollPreview();
}
function showRollPreview(cube){
  hideRollPreview();
  if(!previewOn||busy||over||cube.bomb||armedWild||(lessonState&&!lessonState.complete))return;
  previewCube=cube;cube.el.classList.add('previewTarget');
  const faces={};
  for(const position of ['U','N','S','E','W']){
    // Show the face on this side of the cube, matching its visible edge.
    const face=$('preview-'+position),ci=colIdx(cube,position);
    faces[position]=colSym(ci);
    face.style.background=colHex(ci);face.querySelector('b').textContent=faces[position];
    face.querySelector('b').dataset.shape=stageColors[ci];
  }
  $('rollPreview').setAttribute('aria-label','큐브 면 배치. 가운데 '+faces.U+', 위쪽 옆면 '+faces.N+', 아래쪽 옆면 '+faces.S+', 왼쪽 옆면 '+faces.W+', 오른쪽 옆면 '+faces.E);
  $('rollPreview').hidden=false;positionRollPreview();
}
function positionRollPreview(){
  if(!previewCube||!previewCube.el.isConnected){hideRollPreview();return;}
  const rect=previewCube.el.getBoundingClientRect(),bubble=$('rollPreview');
  const width=bubble.offsetWidth,height=bubble.offsetHeight;
  const viewport=window.visualViewport;
  const leftEdge=viewport?viewport.offsetLeft:0,topEdge=viewport?viewport.offsetTop:0;
  // Fractional visualViewport widths can exceed the layout viewport by a
  // subpixel at device zoom. Keep the promised 8px inset on the actual screen.
  const vw=viewport?Math.min(viewport.width,document.documentElement.clientWidth||viewport.width):document.documentElement.clientWidth,vh=viewport?Math.min(viewport.height,window.innerHeight):window.innerHeight;
  const left=Math.max(leftEdge+8,Math.min(leftEdge+vw-width-8,rect.left+rect.width/2-width/2));
  const below=rect.top-height-14<topEdge+8;
  const top=Math.max(topEdge+8,Math.min(topEdge+vh-height-8,below?rect.bottom+12:rect.top-height-12));
  bubble.classList.toggle('below',below);bubble.style.left=left+'px';bubble.style.top=top+'px';
  bubble.style.setProperty('--tail-x',Math.max(16,Math.min(width-16,rect.left+rect.width/2-left))+'px');
}
function hideRollPreview(){
  if(previewCube)previewCube.el.classList.remove('previewTarget');
  previewCube=null;$('rollPreview').hidden=true;
}
function cancelBoardPointers(){
  hideRollPreview();
  const gesture=boardPointer;boardPointer=null;
  if(gesture)try{gesture.cube.el.releasePointerCapture(gesture.pointerId);}catch(_){}
}
let lessonState=null;
const directionArrows={N:'↑',S:'↓',E:'→',W:'←'};
function beginLesson(){
  const definition=CubePopRules.lessons[stageNo];
  lessonState=definition?{definition,phase:'roll',bomb:null,complete:false}:null;
  updateLessonGuide();
}
function updateLessonGuide(message){
  updateLessonCopy(message);
  window.TutorialUI?.sync();
}
function updateLessonCopy(message){
  boardInner.querySelectorAll('.lessonTarget').forEach(el=>{el.classList.remove('lessonTarget');el.removeAttribute('data-roll');});
  const card=$('playGuide');
  card.classList.toggle('learning',!!lessonState);
  card.classList.toggle('picking',!!armedWild);
  $('cancelPick').hidden=!armedWild;
  $('guideCount').textContent=lessonState?(stageNo+1)+' / '+CubePopRules.lessons.length:'';
  if(armedWild){
    $('guideTitle').textContent='지울 색을 골라주세요';
    $('guideText').textContent='빛나는 이웃 큐브를 누르면 같은 색을 모두 지워요.';
    $('guideNote').textContent='선택 취소는 횟수를 쓰지 않아요.';
    return;
  }
  if(!lessonState){
    $('guideTitle').textContent='플레이 안내';
    $('guideText').textContent='큐브를 눌러 면 배치를 보고, 원하는 방향으로 굴려보세요.';
    $('guideNote').textContent='같은 색 3개 이상을 가로나 세로로 연결해요.';
    return;
  }
  const {definition,phase}=lessonState;
  $('guideTitle').textContent=definition.title;
  $('guideNote').textContent=phase==='roll'?'연습 중 다른 큐브나 방향은 횟수를 쓰지 않아요.':phase==='complete'?'다음 스테이지에서 이어서 도전해보세요.':'특수 큐브는 굴리지 않고 눌러서 사용해요.';
  let target=null,text=message;
  if(phase==='roll'){
    const [r,c]=definition.target;target=grid[r]&&grid[r][c];
    if(target)target.el.dataset.roll=directionArrows[definition.direction];
    text=text||definition.instruction;
  }else if(phase==='tap'){
    target=lessonState.bomb;text=text||definition.bombInstruction;
  }else if(phase==='pick')text=text||'빛나는 이웃 큐브 중 하나를 눌러보세요. 고른 색을 보드 전체에서 지워요.';
  else if(phase==='complete')text=text||definition.success;
  else text=text||'어떤 매치가 만들어지는지 살펴보세요.';
  if(target)target.el.classList.add('lessonTarget');
  $('guideText').textContent=text;
}
function allowLessonRoll(cube,dir){
  if(!lessonState)return true;
  const {definition,phase}=lessonState;
  if(phase!=='roll'||cube.r!==definition.target[0]||cube.c!==definition.target[1]||dir!==definition.direction){
    updateLessonGuide(phase==='roll'?'화살표가 있는 큐브를 '+({N:'위',S:'아래',E:'오른쪽',W:'왼쪽'}[definition.direction])+' 방향으로 굴려보세요.':null);
    return false;
  }
  lessonState.phase='resolving';updateLessonGuide();return true;
}
function lessonResolved(){
  if(!lessonState||lessonState.phase!=='resolving')return;
  if(!lessonState.definition.type){completeLesson();return;}
  lessonState.bomb=grid.flat().find(cube=>cube&&cube.bomb&&cube.btype===lessonState.definition.type);
  if(lessonState.bomb){lessonState.phase='tap';updateLessonGuide();}
  else{
    // A guarded recovery leaves a usable retry if future level edits break the lesson.
    updateLessonGuide('연쇄로 특수 큐브가 사용됐어요. 같은 판에서 다시 연습해보세요.');
  }
}
function allowLessonBomb(bomb){
  if(!lessonState)return true;
  if(lessonState.phase==='pick'&&bomb===armedWild){lessonState.phase='tap';updateLessonGuide();return true;}
  if(lessonState.phase!=='tap'||bomb!==lessonState.bomb)return false;
  if(bomb.btype==='W'){lessonState.phase='pick';updateLessonGuide();}
  else completeLesson();
  return true;
}
function completeLesson(){
  if(!lessonState)return;
  lessonState.complete=true;lessonState.phase='complete';updateLessonGuide();
}
function replayTutorial(){
  if(busy)return;
  closeSettings();startStage(0);
}
$('previewToggle').checked=previewOn;
$('previewToggle').addEventListener('change',e=>setPreview(e.target.checked));
$('cancelPick').addEventListener('click',unarmWild);
window.addEventListener('blur',cancelBoardPointers);
window.addEventListener('resize',hideRollPreview);
window.addEventListener('scroll',hideRollPreview,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelBoardPointers();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){unarmWild();closeSettings();}});
