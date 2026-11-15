import test from 'node:test';
import assert from 'node:assert/strict';
import {plainWhy} from '../src/lib/plainWhy.js';

const base={player:{name:'Deion Burks'},side:'under',line:1.5,projection:.9,hits:6,history:new Array(7),chance:.63,quote:{isBookLine:true,under:140}};
test('explains projection, history and price in one sentence',()=>{
  assert.equal(plainWhy(base,'Receptions'),"Projects 0.9 receptions against a 1.5 line, went under in 6 of 7 prior games; the model's 63% beats the 42% the +140 price needs.");
  assert.match(plainWhy({...base,quote:{isBookLine:true,under:-300}},'Receptions'),/more than the model's 63%/);
  assert.match(plainWhy({...base,quote:{isBookLine:false}},'Receptions'),/No sportsbook price/);
  assert.match(plainWhy({...base,side:'over',quote:{anytime:true,isBookLine:true,over:200}}),/^Model gives Burks a 63% chance to score/);
});
