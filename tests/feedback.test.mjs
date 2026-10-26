import test from 'node:test';
import assert from 'node:assert/strict';
import {flightPoint,rebound} from '../src/feedback.js';
import {loadProgress} from '../src/model.js';
import {AtelierAudio} from '../src/audio.js';
test('flights land on the exact bead slot and never overshoot in x',()=>{
  const a={x:145,y:168},b={x:741,y:138};
  assert.deepEqual(flightPoint(-1,a,b),a);assert.deepEqual(flightPoint(2,a,b),b);
  for(let t=0;t<=1;t+=.02){const p=flightPoint(t,a,b);assert.ok(p.x>=a.x&&p.x<=b.x);assert.ok(Number.isFinite(p.y));}
});
test('collision response is finite, reverses direction and returns fully to rest',()=>{
  assert.equal(rebound(0),0);assert.ok(rebound(.04)>0);assert.ok(rebound(.12)<0);
  assert.ok(Math.abs(rebound(.6))<.005);assert.equal(rebound(.7),0);assert.equal(rebound(-1),0);
});
test('sound settings migrate without losing commissions or accepting invalid volume',()=>{
  const read=p=>loadProgress({getItem:()=>JSON.stringify({version:1,completed:[0,2],...p})});
  assert.deepEqual(read({volume:9,music:false}).completed,[0,2]);assert.equal(read({volume:9}).volume,1);
  assert.equal(read({volume:-2}).volume,0);assert.equal(read({volume:'loud'}).volume,undefined);
  assert.equal(read({music:false}).music,false);
});
test('background completion callbacks cannot create or resume an audio context',()=>{
  const previous=globalThis.document;globalThis.document={hidden:true};
  try{const audio=new AtelierAudio({sound:true});audio.play('win');assert.equal(audio.ctx,undefined);assert.equal(audio.status().events,0);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
