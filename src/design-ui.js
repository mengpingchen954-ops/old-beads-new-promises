import {COLORS} from './model.js';
import {W,H,designPos} from './renderer.js';
import {MATERIALS,LOCKED,TRAYS,freshDesign,remaining,designChecks,designWon,placeBead,loadWorkshop,finishDesign,buyTray} from './design-rules.js';
const $=s=>document.querySelector(s);
export function designBracelet(slots,art){return `<div class="design-bracelet" role="img" aria-label="你设计的听海手串：${slots.map(c=>COLORS[c].name).join('、')}"><i></i>${slots.map((c,i)=>{const a=-Math.PI/2+i*Math.PI/6;return `<img src="${art(COLORS[c].file)}" alt="" style="left:${50+Math.cos(a)*36}%;top:${50+Math.sin(a)*36}%">`;}).join('')}<span>听海的旧约</span></div>`;}
export function showroom(ctx){
 const {progress,art,openModal,closeModal,save,tone,toast}=ctx;
 const paint=()=>{
  const w=progress.workshop=loadWorkshop(progress.workshop);
  openModal(`<div class="eyebrow">我的工坊 · 亲手设计的作品</div><h2>把这一串光，留下来。</h2><div class="showcase-tray tray-${w.tray}">${w.design?designBracelet(w.design,art):'<div class="empty-display">✧<p>完成「听海的旧约」<br>这里将展示你的真实搭配</p></div>'}</div><p>${w.design?'“熟悉的三颗旧珠还在，海的颜色也在。谢谢你，让我又想起了她。” — 林女士':'收下特别委托，用自己的配色，修复一份旧日心意。'}</p><div class="tray-heading"><b>更换展示托盘</b><span>✦ ${progress.coins} 金币</span></div><div class="tray-shop">${TRAYS.map(t=>`<button data-tray="${t.id}" class="tray-choice ${w.tray===t.id?'chosen':''}" ${!w.owned.includes(t.id)&&progress.coins<t.price?'disabled':''}><i class="tray-${t.id}"></i><b>${t.name}</b><span>${w.tray===t.id?'使用中':w.owned.includes(t.id)?'已拥有 · 使用':`${t.price} 金币 · 购买`}</span></button>`).join('')}</div><p class="muted">首次完成特别委托奖励 240 金币；重新搭配可更新作品。金币只在游戏内使用。</p><div class="modal-actions"><button class="secondary" data-close>继续逛工坊</button><button class="primary" id="showcase-design">${w.design?'重新搭配':'收下特别委托'}</button></div>`,true);
  $('#showcase-design').onclick=()=>{closeModal();ctx.start();};
  document.querySelectorAll('[data-tray]').forEach(b=>b.onclick=()=>{
   const result=buyTray(progress.workshop,progress.coins,b.dataset.tray);
   if(!result){toast('金币还不够，完成委托后再来看看。');return;}
   Object.assign(progress,result);save();tone('coin');paint();
   document.querySelectorAll('.coin-balance,.design-coins').forEach(el=>el.textContent=`✦ ${progress.coins}`);
   const preview=document.querySelector('.home-custom');if(preview)preview.className=`cover home-custom tray-${progress.workshop.tray}`;
  });
 };paint();
}
export async function mountDesigner(ctx){
 const {app,progress,art,save,tone,toast,openModal,closeModal}=ctx;
 progress.workshop=loadWorkshop(progress.workshop);
 let selectedColor=4,selectedSlot=null,history=[];
 app.innerHTML=`<main class="design-shell"><header class="design-header"><button class="text-button" id="design-home">← 回工坊</button><a class="brand"><img src="${art('seal')}" alt=""><span class="brand-cn">旧珠新约</span></a><div><span class="design-coins">✦ ${progress.coins}</span><button class="secondary" id="design-showcase">我的橱窗</button></div></header><section class="design-layout"><aside class="design-brief"><div class="eyebrow">特别委托 / 多种合格搭配</div><h1>听海的旧约</h1><p class="mobile-design-goal">左右对称 · 至少4颗海色 · 底端粉晶</p><details class="design-letter" open><summary>来信与委托要求 <span id="design-letter-progress"></span></summary><div class="design-client"><img src="${art('customer-lin')}" alt=""><div><b>林女士的来信</b><small>一份想留住的心意</small></div></div><blockquote>“这三颗月光石，是母亲留下的。请保留它们原来的位置，配一点海的颜色，左右对称，底下加一颗暖暖的粉晶。”</blockquote><div id="design-checks" class="design-checks" aria-label="委托要求"></div><p class="design-note">材料有限，搭配由你决定。<br>没有唯一珠序，也没有倒计时。</p><span class="design-bounty">首次交付奖励 <b>✦ 240</b></span></details></aside><section class="design-work"><div class="design-step"><b>① 选材料　② 点珠位</b><span id="design-count"></span></div><div id="board" class="board-wrap design-board"><div id="design-hit-layer" class="hit-layer" aria-label="自由搭配珠位"></div></div><div id="design-status" class="design-status" role="status">金圈里的三颗旧珠已保留。先选材料，再点空珠位。</div><div class="design-materials" aria-label="可用材料">${MATERIALS.map(m=>`<button data-material="${m.color}" aria-pressed="false"><img src="${art(COLORS[m.color].file)}" alt=""><b>${COLORS[m.color].name}</b><span data-stock="${m.color}"></span></button>`).join('')}<button data-material="remove" aria-pressed="false"><span class="remove-bead">↶</span><b>取下</b><span>放回材料盘</span></button></div><footer class="design-actions"><div><button class="tool" id="design-undo">↶ 撤销</button><button class="tool" id="design-reset">重新搭配</button><button class="tool" id="design-sound">声音</button></div><button class="primary" id="design-submit">欣赏并交付 ✦</button></footer></section></section></main>`;
 $('.design-letter').open=innerWidth>600;
 $('#design-home').onclick=ctx.home;$('#design-showcase').onclick=()=>showroom(ctx);$('#design-sound').onclick=ctx.toggleSound;
 const board=await ctx.ensureBoard();if(!ctx.active())return null;
 const status=message=>{$('#design-status').textContent=message;};
 function refresh(){
  if(!ctx.active())return;const w=progress.workshop,slots=w.draft;
  board.drawDesign({slots,selected:selectedSlot});
  $('#design-letter-progress').textContent=designChecks(slots).filter(r=>r.ok).length+'/5';
  $('#design-count').textContent=`${slots.filter(c=>c!==null).length} / 12 颗`;
  $('#design-checks').innerHTML=designChecks(slots).map(r=>`<div class="${r.ok?'met':''}"><span>${r.ok?'✓':'○'}</span>${r.label}</div>`).join('');
  document.querySelectorAll('[data-material]').forEach(b=>{const c=b.dataset.material==='remove'?null:Number(b.dataset.material);b.setAttribute('aria-pressed',String(c===selectedColor));if(c!==null){const stock=remaining(slots,c);b.querySelector('[data-stock]').textContent=`余 ${stock} 颗`;b.setAttribute('aria-label',`${COLORS[c].name}，余 ${stock} 颗`);}});
  $('#design-undo').disabled=!history.length;
  $('#design-submit').textContent=designWon(slots)?'欣赏并交付 ✦':'检查搭配并交付';
  const layer=$('#design-hit-layer'),focused=document.activeElement?.dataset.slot;layer.innerHTML='';
  slots.forEach((c,i)=>{const p=designPos(i),b=document.createElement('button');b.className='board-hit';b.dataset.slot=i;b.style.cssText=`left:${p.x/W*100}%;top:${p.y/H*100}%;width:${(W===660?100:112)/W*100}%;height:${(W===660?100:112)/H*100}%`;b.setAttribute('aria-label',`珠位 ${i+1}，${c===null?'空位':COLORS[c].name}${LOCKED.includes(i)?'，保留旧珠':''}`);b.onclick=()=>place(i);layer.append(b);});
  if(focused!==undefined)layer.querySelector(`[data-slot="${focused}"]`)?.focus({preventScroll:true});
 }
 function place(i){
  if(LOCKED.includes(i)){tone('reject');status('这是母亲留下的旧月光石，原位保留。试试其他珠位。');return;}
  const before=progress.workshop.draft,next=placeBead(before,i,selectedColor);
  if(!next){tone('reject');status('这份材料已用完。可以先取下一颗，或换一种搭配。');return;}
  if(next[i]===before[i]){status('这里已经是这颗珠子了。换一种材料，或选“取下”回收。');return;}
  history.push([...before]);selectedSlot=i;progress.workshop.draft=next;save();board.cancelFeedback();refresh();
  status(designWon(next)?'每一条心意都照顾到了。可以欣赏成品并交付。':selectedColor===null?'珠子已放回材料盘。可以重新选择配色。':`已放入${COLORS[selectedColor].name}。对面的珠位是 ${i===6?7:13-i} 号。`);
  if(selectedColor!==null){const p=designPos(i);board.animate(selectedColor,{x:p.x,y:p.y-45},p,{key:`design-${i}`,target:{type:'design',index:i},onImpact:()=>tone('land',{color:next[i],pan:(p.x/W-.5)*.8})});}else tone('undo');
 }
 function undo(){if(!history.length||!ctx.active())return;board.cancelFeedback();progress.workshop.draft=history.pop();save();refresh();status('已撤销一步，材料也回来了。');tone('undo');}
 document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{selectedColor=b.dataset.material==='remove'?null:Number(b.dataset.material);tone('pick',{color:selectedColor??3});refresh();status(selectedColor===null?'取下模式：点一颗配珠，把材料收回来。':`选中${COLORS[selectedColor].name}。点空珠位放入，也能直接替换旧配珠。`);});
 $('#design-undo').onclick=undo;
 $('#design-reset').onclick=()=>{openModal('<div class="eyebrow">重新搭配</div><h2>把配珠放回材料盘？</h2><p>保留三颗旧月光石。已交付的橱窗作品仍会保留。</p><div class="modal-actions"><button class="secondary" data-close>继续搭配</button><button class="primary" id="design-confirm-reset">放回材料盘</button></div>');$('#design-confirm-reset').onclick=()=>{closeModal();history.push([...progress.workshop.draft]);progress.workshop.draft=freshDesign();selectedSlot=null;board.cancelFeedback();save();refresh();status('材料已归位。换一种配色，让它重新发光。');};};
 $('#design-submit').onclick=()=>{
  const failed=designChecks(progress.workshop.draft).filter(r=>!r.ok);
  if(failed.length){status(`还差一点：${failed.map(r=>r.label).join('；')}。`);tone('reject');return;}
  board.cancelFeedback();const result=finishDesign(progress.workshop,progress.coins);Object.assign(progress,{workshop:result.workshop,coins:result.coins});save();refresh();tone('win');tone('coin');
  openModal(`<div class="eyebrow">特别委托完成 · 这是你的搭配</div><h2>旧珠还在，海也回来了。</h2><div class="showcase-tray tray-${progress.workshop.tray}">${designBracelet(progress.workshop.design,art)}</div><div class="coin-settlement"><span class="coin-medallion">✦</span><strong>${result.reward?'+240':'作品已更新'}</strong><small>${result.reward?'首次交付金币':'首次奖励已领取，重新搭配不重复发币'}</small><div class="coin-total">累计金币 <b>${progress.coins}</b></div></div><p>“你没有替我换掉过去，却让它有了新的样子。这样的蓝，我想每天戴着。” — 林女士</p><div class="modal-actions"><button class="secondary" data-close>再欣赏一会</button><button class="primary" id="design-display">放进我的橱窗</button></div>`,true);
  $('#design-display').onclick=()=>showroom(ctx);
 };
 $('#board').addEventListener('board-layout',()=>{$('.design-letter').open=innerWidth>600;refresh();});$('#board').addEventListener('board-restored',()=>{refresh();toast('工作台已恢复，你的搭配还在。');});
 refresh();return {undo,refresh,text:()=>({slots:progress.workshop.draft,selectedColor,selectedSlot,materials:MATERIALS.map(m=>({...m,remaining:remaining(progress.workshop.draft,m.color)})),checks:designChecks(progress.workshop.draft),targets:progress.workshop.draft.map((_,i)=>designPos(i)),savedDesign:progress.workshop.design,tray:progress.workshop.tray,rewarded:progress.workshop.rewarded})};
}
