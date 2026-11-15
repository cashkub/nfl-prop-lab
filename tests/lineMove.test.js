import test from 'node:test';
import assert from 'node:assert/strict';
import {lineMove,lineMoveSummary} from '../src/lib/lineMove.js';

test('line moves are judged from the pick side',()=>{
  assert.equal(lineMove({side:'over',openLine:6.5,line:7.5}).direction,'with');
  assert.equal(lineMove({side:'under',openLine:6.5,line:7.5}).direction,'against');
  assert.equal(lineMove({side:'over',openLine:6.5,line:6.5,openPrice:-110,price:-130}).direction,'with');
  assert.equal(lineMove({side:'over',openLine:6.5,line:6.5,openPrice:-110,price:-110}).direction,'none');
  assert.equal(lineMove({side:'over',line:6.5}),null);
  assert.deepEqual(lineMoveSummary([{side:'over',openLine:1,line:2},{side:'over',openLine:2,line:1},{side:'over',line:3}]),{with:1,total:2});
});
