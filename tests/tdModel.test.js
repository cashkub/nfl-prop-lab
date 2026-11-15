import test from 'node:test';
import assert from 'node:assert/strict';
import {touchdownChance} from '../src/lib/tdModel.js';
import {estimateModelHitRate} from '../src/lib/stats.js';
import {buildTopLooks} from '../src/lib/topLooksModel.js';

const game=(week,opportunities,tds,redZone=[0,0,0,0,0],snap=.6)=>({season:2026,week,team:'SEA',opponent:'LV',gameId:'g'+week,stats:{scoredTDs:tds,rushingYards:opportunities*4},usage:{opportunities,carries:opportunities,targets:0,offenseSnapRate:snap},scoringChances:redZone});
const workhorse=[1,2,3,4,5,6].map(w=>game(w,22,w%2,[5,1,2,6,2],.75));
const backup=[1,2,3,4,5,6].map(w=>game(w,3,0,[0,0,0,0,0],.1));
test('touchdown chance tracks workload and stays realistic for backups',()=>{
  const lead=touchdownChance(workhorse,'RB'),bench=touchdownChance(backup,'RB');
  assert.ok(lead>.45&&lead<.9,String(lead));
  assert.ok(bench<.12,String(bench));
  assert.equal(touchdownChance(workhorse.slice(0,2),'RB'),null);
  assert.equal(touchdownChance(workhorse,'K'),null);
  const estimate=estimateModelHitRate(workhorse,'scoredTDs',.5,'over',{position:'RB'});
  assert.equal(estimate.touchdownModel,true);assert.equal(estimate.rate,lead);
  assert.equal(estimateModelHitRate(workhorse,'rushingYards',60.5,'over',{position:'RB'}).touchdownModel,undefined);
});
test('anytime looks rank by chance and respect availability flags',()=>{
  const slate=[{id:'2026_10_SEA_LV',season:2026,week:10,home:'LV',away:'SEA',kickoff:'2026-11-15T21:05:00Z'}];
  const player=(id,name,games,availability)=>({id,name,team:'SEA',position:'RB',games,availability});
  const flag=status=>({status,season:2026,asOfWeek:9,missedWeeks:[8,9],lastPlayedWeek:7});
  const players=[player('a','Lead Back',workhorse),player('b','Bench Back',backup),
    player('c','Lost Role',workhorse,flag('no-role')),player('d','Back From Injury',workhorse,flag('returning')),player('e','Unlisted',workhorse,flag('inactive'))];
  const looks=buildTopLooks({players,slate,books:[],season:2026,type:'anytime'});
  const names=looks.map(l=>l.player.name);
  assert.ok(!names.includes('Lost Role')&&!names.includes('Unlisted'));
  assert.ok(names.includes('Back From Injury')&&names.includes('Lead Back'));
  assert.ok(!names.includes('Bench Back')||names.indexOf('Lead Back')<names.indexOf('Bench Back'));
  assert.equal(looks.find(l=>l.player.name==='Back From Injury').absence.missed,2);
  assert.deepEqual(looks.map(l=>l.chance),[...looks.map(l=>l.chance)].sort((x,y)=>y-x));
});
