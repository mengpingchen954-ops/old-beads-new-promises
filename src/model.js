export const COLORS = [
  {name:'粉晶',symbol:'',hex:'#c5715c',file:'coral'},
  {name:'绿幽灵',symbol:'',hex:'#6a988a',file:'jade'},
  {name:'金发晶',symbol:'',hex:'#c6a257',file:'amber'},
  {name:'月光石',symbol:'',hex:'#d6d6c5',file:'pearl'},
  {name:'海蓝宝',symbol:'',hex:'#628b9a',file:'blue'},
  {name:'紫水晶',symbol:'',hex:'#ab889c',file:'lilac'},
  {name:'红玛瑙',symbol:'',hex:'#d34b66',file:'garnet'},
  {name:'绿松石',symbol:'',hex:'#32b8ad',file:'turquoise'},
  {name:'烟晶',symbol:'',hex:'#7884ad',file:'smoky'},
  {name:'黄水晶',symbol:'',hex:'#ef8b3a',file:'citrine'}
];
export function createState(level) {
  return {rails:level.rails.map(a=>[...a]),orders:level.orders.map(()=>[]),buffer:Array(level.capacity).fill(null),moves:0};
}
export const clone = state => ({rails:state.rails.map(a=>[...a]),orders:state.orders.map(a=>[...a]),buffer:[...state.buffer],moves:state.moves});
export const won = (state,level) => state.orders.every((a,i)=>a.length===level.orders[i].length) && state.rails.every(a=>!a.length) && state.buffer.every(x=>x===null);
export function colorAt(state,source) {return source?.type==='rail'?state.rails[source.index]?.[0]:source?.type==='buffer'?state.buffer[source.index]:undefined;}
export function legal(state,level,source,target) {
  const color=colorAt(state,source);
  if(color===undefined||color===null) return false;
  if(target.type==='order') return level.orders[target.index]?.[state.orders[target.index]?.length]===color;
  return target.type==='buffer' && source.type==='rail' && state.buffer[target.index]===null;
}
export function move(state,level,source,target) {
  if(!legal(state,level,source,target)) return null;
  const next=clone(state), color=colorAt(state,source);
  if(source.type==='rail') next.rails[source.index].shift(); else next.buffer[source.index]=null;
  if(target.type==='order') next.orders[target.index].push(color); else next.buffer[target.index]=color;
  next.moves++; return next;
}
export function actions(state,level) {
  const result=[];
  const sources=[...state.rails.map((_,index)=>({type:'rail',index})),...state.buffer.map((_,index)=>({type:'buffer',index}))];
  for(const source of sources) {
    for(let i=0;i<level.orders.length;i++) {const target={type:'order',index:i};if(legal(state,level,source,target)) result.push({source,target});}
    if(source.type==='rail') {const i=state.buffer.indexOf(null);if(i>=0&&colorAt(state,source)!==undefined)result.push({source,target:{type:'buffer',index:i}});}
  }
  return result;
}
export function solve(state,level,budget=90000) {
  const seen=new Set(); let visits=0;
  function search(s) {
    if(won(s,level)) return [];
    if(++visits>budget) return null;
    const key=JSON.stringify([s.rails,s.orders.map(a=>a.length),s.buffer.filter(x=>x!==null).sort()]);
    if(seen.has(key))return null; seen.add(key);
    for(const action of actions(s,level)) {const path=search(move(s,level,action.source,action.target));if(path)return [action,...path];}
    return null;
  }
  return search(state);
}
export function validLevel(level) {
  const supply=level.rails.flat().sort().join(','), demand=level.orders.flat().sort().join(',');
  return supply===demand && level.rails.every(a=>a.length>0) && level.capacity>0 && level.orders.every(a=>a.length>0);
}
export function loadProgress(storage) {
  try {const p=JSON.parse(storage.getItem('old-beads-v1'));if(p?.version===1&&Array.isArray(p.completed))return {completed:[...new Set(p.completed.filter(x=>Number.isInteger(x)&&x>=0&&x<12))],coins:Number.isInteger(p.coins)&&p.coins>=0?p.coins:0,sound:p.sound!==false,...(typeof p.volume==='number'&&Number.isFinite(p.volume)?{volume:Math.max(0,Math.min(1,p.volume))}:{}),...(typeof p.music==='boolean'?{music:p.music}:{}),session:validSession(p.session)?p.session:null};}catch{}
  return {completed:[],coins:0,sound:true,session:null};
}
export function validSession(s) {
  return s && Number.isInteger(s.level)&&s.level>=0&&s.level<12 && s.state && Array.isArray(s.state.rails) && s.state.rails.every(Array.isArray) && Array.isArray(s.state.orders) && s.state.orders.every(Array.isArray) && Array.isArray(s.state.buffer) && [...s.state.rails.flat(),...s.state.orders.flat(),...s.state.buffer.filter(x=>x!==null)].every(c=>Number.isInteger(c)&&c>=0&&c<COLORS.length) && Number.isInteger(s.state.moves)&&s.state.moves>=0;
}
