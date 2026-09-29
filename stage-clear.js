/* Shared result presentation. All amounts and star decisions come from the game. */
(function(root){
 'use strict';
 const overlay=document.getElementById('overlay'),original=overlay.innerHTML;
 const number=n=>Number(n).toLocaleString('ko-KR');
 function data({stageNumber,totalStages,stars,total,par,breakdown,ledger}){
  const b=breakdown||ledger,rows=[],notes=[];
  if(b){
   rows.push({label:'플레이 점수',amount:b.playScore});
   if(b.remainingMoves!=null){
    rows.push({label:'남은 횟수 보너스',amount:b.moveBonus});
    notes.push('남은 '+b.remainingMoves+'회 × 120점'+(breakdown?' · 사용 '+b.actions+'회':''));
   }
   if(breakdown&&b.efficientActions!=null){
    rows.push({label:'효율 클리어 보너스',amount:b.efficiencyBonus});
    notes.push(b.efficientActions+'회 이내 완료 시 3별 보장');
   }
   if(b.remainingMoves!=null)rows.push({label:'폭발·연쇄 보너스',amount:b.explosionScore});
  }
  const complete=rows.length>0&&rows.every(r=>Number.isFinite(r.amount))&&rows.reduce((sum,r)=>sum+r.amount,0)===total;
  // A restored/legacy snapshot without event accounting has only an authoritative
  // total. Never manufacture missing components by subtraction.
  if(!complete){rows.splice(0,rows.length,{label:'기록된 최종 점수',amount:total});notes.splice(0,notes.length,'이 판의 세부 점수 기록이 없습니다.');}
  return {stageNumber,totalStages,stars,total,par,rows,notes,complete};
 }
 function reset(){
  overlay.classList.remove('show');root.CorePlay?.close?.();
  if(overlay.classList.contains('stageClear')){overlay.innerHTML=original;overlay.classList.remove('stageClear');delete overlay.dataset.kind;overlay.style.top='';overlay.closest('.coreResultLayer')?.classList.remove('stageClearLayer');}
 }
 function render(model,actions){
  overlay.classList.add('stageClear');overlay.closest('.coreResultLayer')?.classList.add('stageClearLayer');
  overlay.innerHTML='<header class="scHead"><div id="ovStars"></div><p class="scStage"></p><h2 id="ovTitle"></h2></header><div id="ovSub"><section class="scScore" aria-label="이번 스테이지 점수"><p class="scLabel">이번 스테이지 점수</p><p class="scNumber"><strong></strong><span>점</span></p><p class="scCriterion"></p></section><details class="scDetails"><summary><span>점수 자세히 보기</span><svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5 8 L10 12 L15 8" fill="none" stroke="#243E61" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><dl class="scBreakdown"></dl><p class="scRule"></p></details></div><footer id="ovBtns"></footer>';
  const $=s=>overlay.querySelector(s);$('.scScore').setAttribute('aria-label','이번 스테이지 점수');
  $('#ovStars').setAttribute('aria-label','별 '+model.stars+'개 획득');
  $('#ovStars').innerHTML=[0,1,2].map(i=>'<img alt="" src="assets/pastel-garden/score-star-'+(i<model.stars?'earned':'unearned')+'.png">').join('');
  $('.scStage').textContent='STAGE '+model.stageNumber;
  $('#ovTitle').textContent=model.stageNumber===model.totalStages?'마지막 스테이지 클리어!':'스테이지 클리어!';
  $('.scNumber strong').textContent=number(model.total);
  $('.scNumber').classList.toggle('scLong',number(model.total).length>9);
  $('.scCriterion').textContent=model.stars===3?'별 3개 달성!':'3별 점수 기준 '+number(model.par)+'점';
  $('.scCriterion').classList.toggle('achieved',model.stars===3);
  for(const row of model.rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=row.label;dd.textContent=number(row.amount)+'점';if(row.amount===0){dt.className=dd.className='muted';}$('.scBreakdown').append(dt,dd);}
  $('.scRule').textContent=model.notes.join('\n');
  let taken=false;
  function button(label,key,gold){
   const b=document.createElement('button');b.type='button';b.dataset.action=key;if(gold)b.className='primary';
   if(key!=='next'){const icon=document.createElement('img');icon.src='assets/pastel-garden/icons/'+(key==='retry'?'retry':'back')+'.svg';icon.alt='';b.append(icon);}
   b.append(document.createTextNode(label));
   b.onclick=()=>{if(taken)return;taken=true;for(const x of overlay.querySelectorAll('button'))x.disabled=true;overlay.classList.remove('show');root.CorePlay?.close?.();actions[key]();};return b;
  }
  if(model.stageNumber<model.totalStages){
   $('#ovBtns').append(button('다음 스테이지 →','next',true));const row=document.createElement('div');row.className='scSecondary';row.append(button('다시하기','retry',false),button('맵으로','map',false));$('#ovBtns').append(row);
  }else $('#ovBtns').append(button('맵으로','map',true),button('다시하기','retry',false));
  overlay.removeAttribute('aria-describedby');overlay.setAttribute('aria-label','');overlay.setAttribute('aria-labelledby','ovTitle');
  overlay.classList.add('show');root.CorePlay?.result('win');
 }
 root.StageClear={data,render,reset};
})(window);
