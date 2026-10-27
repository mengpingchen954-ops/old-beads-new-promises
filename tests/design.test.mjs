import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDesign,validDraft,placeBead,designWon,loadWorkshop,finishDesign,buyTray} from '../src/design-rules.js';
import {loadProgress} from '../src/model.js';
const example=[3,3,4,7,5,4,0,4,5,7,4,3];
test('finite materials cannot be duplicated; legacy beads cannot be changed; replacement returns stock',()=>{
 const initial=freshDesign();assert.equal(placeBead(initial,0,4),null);assert.equal(placeBead(initial,-1,4),null);assert.equal(placeBead(initial,2,99),null);
 let slots=initial;for(const i of [2,3,4,5])slots=placeBead(slots,i,4);
 assert.equal(placeBead(slots,6,4),null);slots=placeBead(slots,2,7);assert.ok(placeBead(slots,6,4));assert.equal(initial[2],null);assert.ok(validDraft(slots));
});
test('commission admits many distinct complete designs and rejects incomplete, asymmetric or wrong focal choices',()=>{
 assert.ok(designWon(example));assert.equal(designWon(freshDesign()),false);assert.equal(designWon([...example.slice(0,6),7,...example.slice(7)]),false);
 const wrong=[...example];[wrong[2],wrong[3]]=[wrong[3],wrong[2]];assert.equal(designWon(wrong),false);
 let count=0;for(const a of [4,7,5])for(const b of [4,7,5])for(const c of [4,7,5])for(const d of [4,7,5])if(designWon([3,3,a,b,c,d,0,d,c,b,a,3]))count++;
 assert.ok(count>10,`only ${count} solutions`);
});
test('first delivery awards coins exactly once; alternate design replaces actual saved creation',()=>{
 const w=loadWorkshop({draft:example});const result=finishDesign(w,0);assert.equal(result.coins,240);assert.equal(result.reward,240);assert.deepEqual(result.workshop.design,example);
 const restored=loadWorkshop(JSON.parse(JSON.stringify(result.workshop)));restored.draft=[3,3,7,4,5,4,0,4,5,4,7,3];
 const replay=finishDesign(restored,240);assert.equal(replay.coins,240);assert.equal(replay.reward,0);assert.notDeepEqual(replay.workshop.design,example);
 assert.equal(finishDesign(loadWorkshop(),50),null);
});
test('tray purchases require balance, subtract once, and persist with old commissions and session',()=>{
 const w=loadWorkshop({draft:example});assert.equal(buyTray(w,179,'azure'),null);assert.equal(buyTray(w,500,'unknown'),null);
 const bought=buyTray(w,240,'azure');assert.equal(bought.coins,60);assert.equal(bought.workshop.tray,'azure');assert.equal(buyTray(bought.workshop,60,'azure').coins,60);
 const saved=loadProgress({getItem:()=>JSON.stringify({version:1,completed:[0,2],coins:bought.coins,workshop:bought.workshop})});
 assert.deepEqual(saved.completed,[0,2]);assert.equal(saved.coins,60);assert.equal(saved.workshop.tray,'azure');assert.deepEqual(saved.workshop.draft,example);
});
test('corrupt new saves fall back safely without clearing existing progression',()=>{
 const w=loadWorkshop({draft:Array(12).fill(99),design:Array(12).fill(3),owned:['bad'],tray:'gold'});
 assert.deepEqual(w.draft,freshDesign());assert.equal(w.design,null);assert.deepEqual(w.owned,['ivory']);assert.equal(w.tray,'ivory');
 assert.equal(loadWorkshop({design:null}).design,null);assert.equal(validDraft(Array(12).fill(4)),false);
});
