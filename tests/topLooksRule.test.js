import test from 'node:test';
import assert from 'node:assert/strict';
import {MIN_PROP_EDGE,MIN_TD_CHANCE,MAX_PROP_PRICE} from '../src/lib/topLooksModel.js';

test('Top Looks only lists picks that clear the bar',()=>{
  assert.ok(MIN_PROP_EDGE>=.05,'props must beat the price');
  assert.ok(MIN_TD_CHANCE>=.35,'no touchdown long shots');
  assert.ok(MAX_PROP_PRICE>=-200,'no heavy juice');
});
