/* Input and modal lifecycle only. No scoring, seeds or progression live here. */
(function(root){
 'use strict';
 if(root.__SIM)return;
 const body=document.body,html=document.documentElement,board=document.getElementById('board');
 const app=document.querySelector('.app'),pointers=new Set();
 let locked=false,savedScroll=0,modal=null,inert=[],focusBefore=null,raf=0;
 const playing=()=>body.classList.contains('mPlay');
 function closeRestart(restore=true){
  if(!modal)return;modal.remove();modal=null;
  for(const [el,value] of inert)el.inert=value;inert=[];
  if(restore&&focusBefore?.isConnected)focusBefore.focus({preventScroll:true});
  focusBefore=null;
 }
 function requestRestart(){
  if(!playing()||busy||modal||document.getElementById('overlay').classList.contains('show'))return;
  cancelBoardPointers();focusBefore=document.activeElement;
  modal=document.createElement('div');modal.id='restartConfirm';modal.className='restartLayer';
  modal.innerHTML='<section class="restartDialog" role="dialog" aria-modal="true" aria-labelledby="restartTitle" aria-describedby="restartBody"><h2 id="restartTitle">다시 시작할까요?</h2><p id="restartBody">해당 스테이지를 다시 플레이하시겠습니까?<br>이번 도전의 진행 내용은 저장되지 않습니다.</p><div class="restartActions"><button type="button" data-no>아니요, 계속</button><button type="button" class="primary" data-yes>네, 다시하기</button></div></section>';
  inert=[...body.children].filter(el=>!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.inert]);
  for(const [el] of inert)el.inert=true;
  body.append(modal);root.CorePlay.paintButtons();
  const no=modal.querySelector('[data-no]'),yes=modal.querySelector('[data-yes]');
  no.onclick=()=>closeRestart();
  yes.onclick=()=>{if(!modal)return;yes.disabled=true;closeRestart();restartStage();};
  modal.onkeydown=e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeRestart();}
   else if(e.key==='Tab'){e.preventDefault();(document.activeElement===no&&!e.shiftKey||document.activeElement===yes&&e.shiftKey?yes:no).focus();}
  };
  modal.addEventListener('pointerdown',e=>e.stopPropagation());
  no.focus({preventScroll:true});
 }
 document.addEventListener('focusin',e=>{if(modal&&!modal.contains(e.target))modal.querySelector('[data-no]').focus({preventScroll:true});});
 const restart=document.querySelector('.controls button[onclick*="restartStage"]');
 restart?.removeAttribute('onclick');restart?.addEventListener('click',requestRestart);
 function down(e){
  if(e.pointerType==='mouse')return;
  pointers.add(e.pointerId);
  if(pointers.size>1){cancelBoardPointers();if(board.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}}
 }
 function move(e){if(pointers.size>1&&board.contains(e.target)){cancelBoardPointers();e.preventDefault();e.stopImmediatePropagation();}}
 function up(e){pointers.delete(e.pointerId);}
 function gesture(e){if(board.contains(e.target))e.preventDefault();}
 function attach(on){
  for(const [type,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['gesturestart',gesture],['gesturechange',gesture]]){
   if(on)document.addEventListener(type,fn,{capture:true,passive:false});else document.removeEventListener(type,fn,true);
  }
  if(!on){pointers.clear();cancelBoardPointers();}
 }
 let listening=false;
 function sync(){
  raf=0;const play=playing();
  if(play!==listening){attach(play);listening=play;}
  if(play){
   root.CorePlay.fit();
   const style=getComputedStyle(body),h=Math.min(root.innerHeight,root.visualViewport?.height||root.innerHeight);
   // Keep readable content reachable on exceptional short/accessibility viewports.
   const fits=!(root.visualViewport?.scale>1.02)&&app.offsetHeight+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)<=h+1;
   if(fits&&!locked){savedScroll=root.scrollY;locked=true;html.classList.add('playScrollLocked');root.scrollTo(0,0);}
   if(!fits&&locked){locked=false;html.classList.remove('playScrollLocked');}
  }else{
   closeRestart(false);
   if(locked){locked=false;html.classList.remove('playScrollLocked');root.scrollTo(0,savedScroll);}
  }
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(sync);}
 new MutationObserver(schedule).observe(body,{attributes:true,attributeFilter:['class']});
 new ResizeObserver(schedule).observe(app);
 root.addEventListener('resize',schedule,{passive:true});root.visualViewport?.addEventListener('resize',schedule,{passive:true});
 root.MobilePlay={requestRestart,closeRestart,sync};schedule();
})(window);
