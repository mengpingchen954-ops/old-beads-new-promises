import './style.css';
import {COLORS,createState,clone,move,colorAt,legal,won,actions,solve,loadProgress,validSession} from './model.js';
import {levels} from './levels.js';
import {chapters,customers,commissions} from './content.js';
import {Board,railPos,bufferPos,orderPos,beadPos,sourcePos,W,H} from './renderer.js';
import {AtelierAudio} from './audio.js';
const $=s=>document.querySelector(s),base=import.meta.env.BASE_URL,art=name=>`${base}art/${name}.svg`;
const icons={undo:'<path d="M9 6L4 11l5 5M4 11h9a6 6 0 010 12"/>',reset:'<path d="M19 8A8 8 0 105 19M19 3v6h-6"/>',hint:'<path d="M8 17c0-4-3-4-3-8a7 7 0 0114 0c0 4-3 4-3 8M8 20h8M10 23h4"/>',book:'<path d="M12 5Q7 1 2 4v16q5-3 10 1 5-4 10-1V4q-5-3-10 1v16"/>',sound:'<path d="M11 4L6 8H2v8h4l5 4ZM16 7a7 7 0 010 10M19 3a12 12 0 010 18"/>',home:'<path d="M3 11L12 3l9 8M6 9v12h12V9M10 21v-7h4v7"/>',arrow:'<path d="M4 12h16M14 6l6 6-6 6"/>',close:'<path d="M5 5l14 14M19 5L5 19"/>',full:'<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>'};
const icon=(name)=>`<svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.arrow}</svg>`;
const app=$('#app');
let progress;try{progress=loadProgress(localStorage);}catch{progress={completed:[],sound:true,session:null};}
let mode='home',index=0,state,history=[],selected=null,hint=null,board,modal=false,usedHint=false;
const audio=new AtelierAudio(progress);let saveWarning=false,completionTimer,activePointer=null;
function tone(type='pick',options={}){audio.play(type,options);}
function syncAudio(){audio.setActive(mode==='play'&&!modal&&!document.hidden);}
function cancelPointer(){activePointer=null;document.querySelectorAll('[data-source]').forEach(b=>{if(b._down){b._down=null;b._dragged=true;}});board?.cancelDrag();}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelPointer();audio.suspend();}else{syncAudio();}});
document.addEventListener('pointerdown',()=>audio.unlock(),{passive:true});
document.addEventListener('keydown',()=>audio.unlock());
function save(){try{localStorage.setItem('old-beads-v1',JSON.stringify({version:1,...progress}));}catch{if(!saveWarning){saveWarning=true;toast('浏览器暂不能保存。当前仍可游玩，请尽量保持页面打开。');}}}
function saveSession(){progress.session={level:index,state:clone(state),history:history.slice(-60),usedHint};save();}
function toast(text){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.role='status';document.body.append(t);}t.textContent=text;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),3300);}
function restoreValid(session){
 if(!validSession(session))return false;const l=levels[session.level],s=session.state;
 if(s.rails.length!==l.rails.length||s.orders.length!==l.orders.length||s.buffer.length!==l.capacity)return false;
 if(s.orders.some((a,i)=>a.some((c,j)=>l.orders[i][j]!==c)))return false;
 const all=[...s.rails.flat(),...s.orders.flat(),...s.buffer.filter(c=>c!==null)].sort().join(',');
 if(all!==l.rails.flat().sort().join(','))return false;
 return s.rails.every((a,i)=>JSON.stringify(a)===JSON.stringify(l.rails[i].slice(l.rails[i].length-a.length)));
}
function nextIndex(){return Math.min(11,Array.from({length:12},(_,i)=>i).find(i=>!progress.completed.includes(i))??11);}
function beadHTML(c,size=25){return `<img class="bead-icon" width="${size}" height="${size}" src="${art(COLORS[c].file)}" alt="${COLORS[c].name}${COLORS[c].symbol}">`;}
function braceletHTML(order,extra=''){return `<div class="bracelet ${extra}"><span class="bracelet-thread"></span>${order.map((c,i)=>{const a=i/order.length*Math.PI*2-Math.PI/2;return `<img src="${art(COLORS[c].file)}" alt="${COLORS[c].name}" style="left:${50+Math.cos(a)*36}%;top:${50+Math.sin(a)*36}%">`;}).join('')}<span class="bracelet-knot">✧</span></div>`;}
function home(){
 mode='home';modal=false;activePointer=null;index=nextIndex();clearTimeout(completionTimer);board?.cancelFeedback();board?.resizeObserver.disconnect();syncAudio();
 app.innerHTML=`<main class="home"><header class="home-header"><a href="#" class="brand" aria-label="旧珠新约首页"><img src="${art('seal')}" alt="">旧珠新约<span>THE BEAD ATELIER</span></a><button class="quiet" id="collection-home">${icon('book')}作品与来信 <span>${progress.completed.length}/12</span></button></header><section class="hero"><div class="hero-copy"><div class="eyebrow"><span></span> 一间把故事重新串起的小店</div><h1>旧珠<span>新约</span><i>Every bead holds a story.</i></h1><p>挑一颗旧珠，留一点余地。<br>把散落的心意，串成新的约定。</p><button class="primary start" id="start-btn">${progress.completed.length||progress.session?'回到工坊':'推开工坊的门'} ${icon('arrow')}</button><div class="home-detail"><span>12 份委托</span><span>3 位老朋友</span><span>不计时 · 慢慢来</span></div></div><div class="hero-art"><img class="cover" src="${art('cover')}" alt="手绘珠饰工坊：亚麻工作垫上的旧珠手链、绿线轴与金色剪刀"><div class="art-caption"><span>Est. 2026</span><em>旧物有光，心意有回响。</em><span>✧</span></div><div class="paper-label"><small>一件旧物的第二次开始</small><strong>手作 · 顺序 · 小故事</strong></div></div></section><footer class="home-footer"><span>原创手绘风 · 珠饰解谜小品</span><div class="customer-stamps">${customers.map(c=>`<img src="${art(c.portrait)}" alt="${c.name}">`).join('')}<span>有人在等一份特别的礼物。</span></div><button class="text-button" id="how-home">怎么玩 ${icon('arrow')}</button></footer></main>`;
 $('#start-btn').onclick=()=>{tone();if(restoreValid(progress.session))start(progress.session.level,true);else start(nextIndex());};
 $('#collection-home').onclick=()=>gallery();$('#how-home').onclick=()=>help();
}
async function ensureBoard(){if(board){board.mount($('#board'));return;}try{board=new Board($('#board'));board.onContact=(color,x)=>tone('land',{color,pan:(x/W-.5)*1.1,strength:.35});await board.load();}catch(error){board=null;$('#board').innerHTML=`<div class="gpu-error"><h2>工作台暂时未能打开</h2><p>需要浏览器 WebGL 支持。请尝试更新浏览器或开启硬件加速，然后重试。</p><button class="primary" onclick="location.reload()">重新载入</button></div>`;console.error(error);throw error;}}
async function start(n,resume=false){
 index=n;mode='play';selected=null;hint=null;history=[];usedHint=false;activePointer=null;
 if(resume&&restoreValid(progress.session)){state=clone(progress.session.state);usedHint=!!progress.session.usedHint;history=(progress.session.history??[]).filter(s=>restoreValid({level:n,state:s})).slice(-60);}else state=createState(levels[n]);
 const c=commissions[index],client=customers[c.client],ch=chapters[Math.floor(index/4)];
 if(board){board.resizeObserver.disconnect();board.cancelFeedback();}clearTimeout(completionTimer);
 app.innerHTML=`<main class="game-shell"><aside class="story-sidebar"><button class="brand brand-light" id="go-home"><img src="${art('seal')}" alt="">旧珠新约</button><div class="chapter-label">${ch.label} / ${ch.title}</div><div class="portrait-wrap"><img src="${art(client.portrait)}" alt="顾客${client.name}" class="portrait"><span class="portrait-stamp">来客</span></div><div class="client-name">${client.name}<small>${client.role}</small></div><blockquote class="client-note">“${c.note}”</blockquote><div class="sidebar-bottom"><span class="tiny-label">今日的约定</span><p>${ch.sub}</p><button class="sidebar-link" id="open-story">再读一次来信 ${icon('arrow')}</button><div class="progress-dots">${commissions.map((_,i)=>`<i class="${progress.completed.includes(i)?'complete':i===index?'active':''}"></i>`).join('')}</div><span class="chapter-progress">已交付 ${progress.completed.length} / 12 份心意</span></div></aside><section class="work-area"><header class="work-header"><div><span class="eyebrow">委托 ${String(index+1).padStart(2,'0')} <span class="header-divider">/</span> ${index<4?'初识':index<8?'往事':'新约'}</span><h1>${c.title}</h1></div><div class="top-tools"><button class="icon-button" id="gallery-btn" aria-label="打开作品与来信">${icon('book')}</button><button class="icon-button" id="help-btn" aria-label="玩法说明">?</button><button class="icon-button" id="sound-btn" aria-label="${progress.sound?'关闭':'开启'}声音" aria-pressed="${progress.sound}">${icon('sound')}</button></div></header><div class="instruction" id="instruction" role="status">${index===0?'选一颗料杆左端的珠子，再点需要它的手链。':'看看下一颗需要什么，再决定从哪根料杆取珠。'}</div><div class="board-wrap" id="board"><div id="hit-layer" class="hit-layer" aria-label="珠饰工作台"></div></div><footer class="work-footer"><div class="action-tools"><button id="undo-btn" class="tool">${icon('undo')}<span>撤销</span><kbd>Z</kbd></button><button id="restart-btn" class="tool">${icon('reset')}<span>重来</span></button><button id="hint-btn" class="tool">${icon('hint')}<span>一点灵感</span></button></div><span class="move-count" id="move-count">0 步</span><button id="fullscreen-btn" class="icon-button fullscreen-btn" aria-label="切换全屏">${icon('full')}</button></footer><div class="material-legend">${COLORS.filter((_,i)=>levels[n].orders.flat().includes(i)).map((col,i)=>{const id=COLORS.indexOf(col);return `<span>${beadHTML(id,24)}${col.name}</span>`;}).join('')}<span class="autosave">进度自动保存在此浏览器</span></div></section></main>`;
 $('#go-home').onclick=()=>{saveSession();home();};$('#gallery-btn').onclick=()=>gallery();$('#help-btn').onclick=help;$('#sound-btn').onclick=toggleSound;$('#undo-btn').onclick=undo;$('#restart-btn').onclick=()=>confirmRestart();$('#hint-btn').onclick=giveHint;$('#open-story').onclick=()=>story();$('#fullscreen-btn').onclick=toggleFullscreen;
 const settings=document.createElement('button');settings.className='text-button sound-settings';settings.id='audio-settings';settings.textContent='声音调校';settings.onclick=audioSettings;$('.material-legend').append(settings);
 $('#board').addEventListener('board-layout',()=>refresh());
 $('#board').addEventListener('board-lost',()=>{toast('画面连接中断，请稍候恢复。你的操作进度仍在。');});
 $('#board').addEventListener('board-restored',()=>toast('工作台已恢复。'));
 await ensureBoard();if(mode!=='play')return;refresh();saveSession();syncAudio();
 if(won(state,levels[index]))complete();else if(!resume)story();
}
function hitButton(label,source,target,p,w=82,h=82){
 const button=document.createElement('button');button.className='board-hit';button.setAttribute('aria-label',label);button.title=label;button.style.cssText=`left:${p.x/W*100}%;top:${p.y/H*100}%;width:${w/W*100}%;height:${h/H*100}%`;
 if(source){
   button.dataset.source=`${source.type}-${source.index}`;
   button.onclick=()=>{if(button._dragged){button._dragged=false;return;}choose(source);};
   button.onpointerdown=e=>{if(modal||mode!=='play'||activePointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;activePointer=e.pointerId;button._dragged=false;button._down={x:e.clientX,y:e.clientY,id:e.pointerId};button.setPointerCapture(e.pointerId);};
   button.onpointermove=e=>{
     const d=button._down;if(!d||d.id!==e.pointerId)return;
     if(!board.drag&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>8){board.beginDrag(source,colorAt(state,source),board.point(e.clientX,e.clientY),e.pointerType==='touch');tone('pick',{color:colorAt(state,source)});button._dragged=true;}
     if(board.drag){const target=targetAt(e.clientX,e.clientY);board.moveDrag(board.point(e.clientX,e.clientY),target,target?legal(state,levels[index],source,target):false);}
   };
   button.onpointerup=e=>{
     const d=button._down;if(!d||d.id!==e.pointerId)return;button._down=null;activePointer=null;if(!board.drag)return;
     const target=targetAt(e.clientX,e.clientY);selected=source;
     if(target)transfer(target);else{board.cancelDrag();refresh();tone('reject',{color:colorAt(state,source),strength:.5});}
     e.preventDefault();
   };
   button.onpointercancel=button.onlostpointercapture=e=>{if(activePointer===e.pointerId){activePointer=null;button._down=null;board.cancelDrag();}};
 }
 if(target){button.dataset.target=`${target.type}-${target.index}`;if(!source)button.onclick=()=>transfer(target);}
 return button;
}
function targetAt(x,y){const el=document.elementFromPoint(x,y)?.closest('[data-target]');if(!el)return null;const [type,num]=el.dataset.target.split('-');return {type,index:Number(num)};}
function refresh(){
 if(!board||mode!=='play')return;const level=levels[index];board.draw(state,level,selected,hint);
 const focused=document.activeElement,focusKey=focused?.dataset?.source?['source',focused.dataset.source]:focused?.dataset?.target?['target',focused.dataset.target]:null;
 const layer=$('#hit-layer');layer.innerHTML='';
 state.rails.forEach((a,i)=>{if(a.length)layer.append(hitButton(`料杆 ${'ABCD'[i]}，外端${COLORS[a[0]].name}`,{type:'rail',index:i},null,railPos(i)));});
 state.buffer.forEach((c,i)=>layer.append(hitButton(c===null?`放入暂存格 ${i+1}`:`暂存格 ${i+1}，${COLORS[c].name}`,c!==null?{type:'buffer',index:i}:null,c===null?{type:'buffer',index:i}:null,bufferPos(i,level.capacity))));
 state.orders.forEach((a,i)=>{const next=level.orders[i][a.length];layer.append(hitButton(next===undefined?`手链 ${i+1} 已完成`:`串入手链 ${i+1}，需要${COLORS[next].name}`,null,{type:'order',index:i},orderPos(i),244,225));});
 $('#move-count').textContent=`${state.moves} 步`;
 $('#undo-btn').disabled=!history.length;$('#sound-btn').setAttribute('aria-pressed',String(progress.sound));
 if(focusKey)layer.querySelector(`[data-${focusKey[0]}="${focusKey[1]}"]`)?.focus({preventScroll:true});
 if(!won(state,level)&&!actions(state,level).length){$('#instruction').textContent='暂时没有可走的路了。撤销几步，换一种取珠顺序吧。';$('#instruction').classList.add('stuck');}else $('#instruction').classList.remove('stuck');
}
function choose(source){if(modal||mode!=='play'||activePointer!==null||board.drag||won(state,levels[index]))return;hint=null;if(selected?.type===source.type&&selected.index===source.index){selected=null;$('#instruction').textContent='已放下珠子。可以换一颗，再慢慢想。';}else{selected=source;const c=colorAt(state,source);$('#instruction').textContent=`选中${COLORS[c].name}${COLORS[c].symbol} · 点需要它的手链${source.type==='rail'?'，也可以先放进空暂存格':''}。`;tone('pick',{color:c});}refresh();}
function transfer(target){
 if(modal||mode!=='play'||won(state,levels[index]))return;
 if(!selected){toast('先选一颗料杆左端或暂存盘里的珠子。');return;}
 const color=colorAt(state,selected),next=move(state,levels[index],selected,target);
 if(!next){board.cancelDrag();refresh();board.reject(target);tone('reject',{color,strength:.75});toast(target.type==='order'?'这条手链暂时不需要这颗珠子。看看“下一颗”的颜色与形状。':'只能把料杆上的珠子放入空暂存格。');return;}
 const source={...selected},drag=board.releaseDrag(),from=drag?.point??board.interruptSource(source)??sourcePos(source,levels[index].capacity),slot=state.orders[target.index]?.length;
 const to=target.type==='order'?beadPos(target.index,slot,levels[index].orders[target.index].length):bufferPos(target.index,levels[index].capacity),key=target.type==='order'?`order-${target.index}-${slot}`:`buffer-${target.index}`;
 const threadDone=target.type==='order'&&next.orders[target.index].length===levels[index].orders[target.index].length;
 history.push(clone(state));state=next;selected=null;hint=null;$('#instruction').textContent=target.type==='buffer'?'先放一放。用掉暂存珠后，这个位置就会腾空。':threadDone?'这一条串好了。把余下的心意也慢慢串起。':'心意又近了一颗。留意两条手链接下来各自需要什么。';refresh();
 board.animate(color,from,to,{key,target,source,onImpact:()=>{tone('land',{color,target:target.type,pan:(to.x/W-.5)*1.1});if(threadDone){board.celebrate(target.index);tone('thread',{strength:.75});}}});
 saveSession();if(won(state,levels[index]))complete(board.reduced?120:850);
}
function undo(){if(modal||mode!=='play'||!history.length)return;board.cancelFeedback();state=history.pop();selected=null;hint=null;$('#instruction').textContent='回到上一步。换个顺序，也许就会不一样。';refresh();saveSession();tone('undo');}
function reset(){board.cancelFeedback();state=createState(levels[index]);history=[];selected=null;hint=null;usedHint=false;$('#instruction').textContent='珠子已放回原位。慢慢来，没有时间限制。';refresh();saveSession();}
function confirmRestart(){openModal(`<div class="eyebrow">重新整理工作台</div><h2>从这一份委托的开头重来？</h2><p>只重置当前委托，已完成的作品都会保留。</p><div class="modal-actions"><button class="secondary" data-close>继续想想</button><button class="primary" id="confirm-reset">重新开始</button></div>`);$('#confirm-reset').onclick=()=>{closeModal();reset();};}
function giveHint(){if(modal||mode!=='play')return;const path=solve(state,levels[index],150000);if(path?.length){usedHint=true;hint=path[0];selected=null;const source=hint.source.type==='rail'?`料杆 ${'ABCD'[hint.source.index]}`:`暂存格 ${hint.source.index+1}`,target=hint.target.type==='order'?`手链 ${hint.target.index+1}`:`暂存格 ${hint.target.index+1}`;$('#instruction').textContent=`一点灵感：把${source}的${COLORS[colorAt(state,hint.source)].name}，放进${target}。`;refresh();saveSession();}else toast('当前排列可能走不通。撤销几步或重来，再留出暂存空间。');}
let previousFocus;
function openModal(html,wide=false){
 if($('#modal'))closeModal();cancelPointer();previousFocus=document.activeElement;modal=true;syncAudio();app.inert=true;const el=document.createElement('div');el.id='modal';el.className='modal-backdrop';el.innerHTML=`<section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="工坊小笺" tabindex="-1"><button class="modal-close icon-button" data-close aria-label="关闭窗口">${icon('close')}</button>${html}</section>`;document.body.append(el);el.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);el.addEventListener('keydown',e=>{if(e.key==='Tab'){const nodes=[...el.querySelectorAll('button:not([disabled]),a[href],input')].filter(b=>b.offsetParent!==null);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});el.querySelector('.modal').focus();
}
function closeModal(){const el=$('#modal');if(!el)return;el.remove();modal=false;app.inert=false;syncAudio();if(previousFocus?.isConnected)previousFocus.focus();}
function story(){const c=commissions[index],client=customers[c.client];openModal(`<div class="letter-layout"><img class="letter-portrait" src="${art(client.portrait)}" alt="${client.name}"><div><div class="eyebrow">${chapters[Math.floor(index/4)].label} · 委托 ${index+1}</div><h2>${c.title}</h2><p>${c.before}</p><span class="letter-sign">— ${client.name}的来信</span><button class="primary" id="accept-order">收下这份委托 ${icon('arrow')}</button></div></div>`);$('#accept-order').onclick=()=>{tone();closeModal();if(index===0&&state.moves===0){$('#instruction').textContent='第一步：选料杆 A 的朱砂花珠，再点手链 1。';}};}
function help(){openModal(`<div class="eyebrow">工坊里的三件小事</div><h2>取一颗，想一步。</h2><ol class="help-list"><li><b>取珠</b><p>只能选择料杆<b>左端</b>第一颗。后面的珠子可看见，前面取走后才能用。</p></li><li><b>串入</b><p>选中珠子，再点需要它的手链。按环形上的顺序，顺时针从顶端开始；绿色小圈表示下一颗。</p></li><li><b>暂存</b><p>暂时用不上，可以先放空盘。暂存珠只能串入手链，不能放回料杆。每一颗都要用完。</p></li></ol><p class="muted">不计时、不扣费。可无限撤销与重来，卡住时试试“一点灵感”。鼠标、触屏均可点选，也可拖放；键盘 Tab 选择、Enter 确认、Z 撤销、Esc 关闭、F 全屏。</p><button class="primary" data-close>我知道了</button>`);}
function complete(delay=0){
 mode='complete';syncAudio();if(!progress.completed.includes(index))progress.completed.push(index);progress.session=null;save();
 completionTimer=setTimeout(()=>{tone('win');
 const c=commissions[index],last=index===11;
 openModal(`<div class="eyebrow">${last?'全篇终 · 谢谢光临':'委托完成 · 心意已交付'}</div><h2>${last?'旧物有光，约定有回响。':c.title}</h2><div class="reward-bracelets">${levels[index].orders.map(a=>braceletHTML(a)).join('')}</div><p class="reward-story">${c.after}</p><div class="keepsake"><span>✧ 收入收藏</span><strong>${c.keepsake}</strong><small>${state.moves} 步完成${usedHint?' · 借来一点灵感':' · 亲手串起的心意'}</small></div><div class="modal-actions"><button class="secondary" id="reward-home">回工坊首页</button><button class="primary" id="next-order">${last?'翻开作品册':'迎接下一位来客'} ${icon('arrow')}</button></div>`);
 $('#modal .modal-close').hidden=true;
 $('#reward-home').onclick=()=>{closeModal();home();};$('#next-order').onclick=()=>{closeModal();if(last){home();gallery();}else start(index+1);};
 },delay);
}
function gallery(){
 openModal(`<div class="eyebrow">作品与来信 · ${progress.completed.length}/12</div><h2>每一颗，都是一段故事。</h2><div class="gallery-grid">${commissions.map((c,i)=>{const done=progress.completed.includes(i),unlocked=i===0||progress.completed.includes(i-1)||done;return `<button class="gallery-item ${done?'done':''}" data-level="${i}" ${unlocked?'':'disabled'}>${done?braceletHTML(levels[i].orders[0],'small'):`<div class="locked-art">${unlocked?'✧':'·'}</div>`}<span>${String(i+1).padStart(2,'0')} / ${chapters[Math.floor(i/4)].label}</span><strong>${c.title}</strong><small>${done?c.keepsake:unlocked?'可以开始':'待前一份委托交付'}</small></button>`;}).join('')}</div><p class="muted">点已完成作品可回看交付来信。关闭收藏可回到工作台；重新制作会切换当前委托。</p>`,true);
 $('#modal').querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.level);if(progress.completed.includes(n)){const c=commissions[n];openModal(`<div class="eyebrow">工坊收藏 · ${c.keepsake}</div><h2>${c.title}</h2><div class="reward-bracelets">${levels[n].orders.map(a=>braceletHTML(a)).join('')}</div><p>${c.after}</p><div class="modal-actions"><button class="secondary" id="back-gallery">回作品册</button><button class="primary" id="replay">重新制作</button></div>`);$('#back-gallery').onclick=gallery;$('#replay').onclick=()=>{closeModal();start(n);};}else{closeModal();start(n);}});
}
function toggleSound(){progress.sound=!progress.sound;save();audio.apply();$('#sound-btn')?.setAttribute('aria-label',`${progress.sound?'关闭':'开启'}声音`);$('#sound-btn')?.setAttribute('aria-pressed',String(progress.sound));if(progress.sound)tone();toast(progress.sound?'珠声已开启':'珠声已关闭');}
function audioSettings(){
 openModal(`<div class="eyebrow">听见手作的温度</div><h2>工坊的声音</h2><p>玉石清脆，蜜蜡温厚。珠子接触手链与木盘时，会有不同的轻碰与余响。</p><label class="audio-control" for="volume-slider">声音大小 <output id="volume-value">${Math.round((progress.volume??.7)*100)}%</output></label><input id="volume-slider" type="range" min="0" max="100" value="${Math.round((progress.volume??.7)*100)}"><label class="audio-control"><span>工坊弦音<small>舒缓的原创拨弦，轻轻陪伴</small></span><input id="music-toggle" type="checkbox" ${progress.music!==false?'checked':''}></label><button class="secondary" id="sound-preview">试听珠子轻碰</button><p class="muted">右上角喇叭可关闭全部声音。切到后台时自动暂停。</p><div class="modal-actions"><button class="primary" data-close>回到工作台</button></div>`);
 $('#volume-slider').oninput=e=>{progress.volume=Number(e.target.value)/100;$('#volume-value').textContent=`${e.target.value}%`;audio.apply();save();};
 $('#music-toggle').onchange=e=>{progress.music=e.target.checked;audio.apply();save();};
 $('#sound-preview').onclick=()=>{if(!progress.sound)toggleSound();tone('land',{color:1});};
}
function toggleFullscreen(){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>toast('当前浏览器暂不支持全屏。'));else document.exitFullscreen?.();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(mode==='complete')return;if(modal)closeModal();else if(selected||board?.drag){cancelPointer();selected=null;hint=null;refresh();}return;}if(modal)return;if(e.key.toLowerCase()==='z'&&mode==='play'){e.preventDefault();cancelPointer();undo();}if(e.key.toLowerCase()==='f'){e.preventDefault();toggleFullscreen();}});
window.render_game_to_text=()=>JSON.stringify({mode,modal,level:index+1,completed:progress.completed,feedback:board?.status(),audio:audio.status(),coordinates:`logical ${W}x${H}, origin top-left, x right, y down`,state,selected,hint,targets:state?{rails:state.rails.map((_,i)=>railPos(i)),buffer:state.buffer.map((_,i)=>bufferPos(i,levels[index].capacity)),orders:state.orders.map((_,i)=>orderPos(i))}:null,goals:state?levels[index].orders:null});
window.advanceTime=()=>{board?.render();return Promise.resolve();};
home();
