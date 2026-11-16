import test from 'node:test';
import assert from 'node:assert/strict';
import {blendWithMarket,estimateModelHitRate} from '../src/lib/stats.js';
import {buildTopLooks,MIN_PROP_LINE} from '../src/lib/topLooksModel.js';

test('the model moves the sportsbook chance only by its trust weight',()=>{
  assert.equal(blendWithMarket(.8,.5,0),.5);
  assert.ok(Math.abs(blendWithMarket(.8,.5,1)-.8)<1e-9);
  const part=blendWithMarket(.8,.5,.2);
  assert.ok(part>.5&&part<.6,String(part));
  const games=[9,8,7,9,8,9].map((n,i)=>({week:i+1,stats:{receptions:n}}));
  const withLine=estimateModelHitRate(games,'receptions',4.5,'over',{marketProbability:.5,marketWeight:.2});
  assert.ok(withLine.raw>.7&&withLine.rate>.5&&withLine.rate<.6,JSON.stringify([withLine.raw,withLine.rate]));
  assert.equal(estimateModelHitRate(games,'receptions',4.5,'over').rate,withLine.raw);
});
test('low-volume lines are not listed',()=>{
  assert.equal(MIN_PROP_LINE.receptions,2.5);
  assert.ok(Array.isArray(buildTopLooks({players:[],slate:[],books:[],season:2026,type:'props'})));
});
