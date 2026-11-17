import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCbbScoreboard,parseCbbBox,gradeGame,liveRow} from '../src/cbb/liveLib.js';

const board={events:[
  {id:'1',competitions:[{status:{type:{state:'in',shortDetail:'10:02 - 2nd'}},competitors:[{homeAway:'home',score:'40'},{homeAway:'away',score:'38'}]}]},
  {id:'2',competitions:[{status:{type:{state:'post'}},competitors:[{homeAway:'home',score:'70'},{homeAway:'away',score:'75'}]}]},
  {id:'3',competitions:[{status:{type:{state:'pre'}},competitors:[{homeAway:'home',score:'0'},{homeAway:'away',score:'0'}]}]}]};
const box={boxscore:{players:[{statistics:[{keys:['minutes','points','threePointFieldGoalsMade-threePointFieldGoalsAttempted','rebounds','assists'],
  athletes:[{athlete:{id:'9'},stats:['30','18','3-7','6','4']},{athlete:{id:'8'},stats:['0','0','0-0','0','0']}]}]}]}};

test('scoreboard keeps live and final games by id',()=>{
  const s=parseCbbScoreboard(board);
  assert.deepEqual([...s.keys()],['1','2']);
  assert.deepEqual(s.get('1'),{id:'1',away:38,home:40,final:false,detail:'10:02 - 2nd'});
  assert.equal(s.get('2').final,true);
});
test('box score reads made threes and combos',()=>{
  const p=parseCbbBox(box).get('9');
  assert.equal(p.threes,3);assert.equal(p.PRA,28);assert.equal(p.played,true);
  assert.equal(parseCbbBox(box).get('8').played,false);
});
test('game grading matches the python grader',()=>{
  assert.equal(gradeGame({market:'Moneyline',side:'away',line:0},[75,70]),'Win');
  assert.equal(gradeGame({market:'Spread',side:'away',line:4.5},[66,70]),'Win');
  assert.equal(gradeGame({market:'Total',side:'under',line:150.5},[75,70]),'Win');
});
test('live rows: saved result wins, final grades, live props settle early',()=>{
  const scores=parseCbbScoreboard(board),boxes=new Map([['1',parseCbbBox(box)]]);
  assert.equal(liveRow({game:'2',market:'Moneyline',side:'home',line:0,result:'Win'},scores,boxes).result,'Win');
  const g=liveRow({game:'2',market:'Moneyline',side:'home',line:0},scores,boxes);
  assert.equal(g.result,'Loss');assert.deepEqual(g.final,[75,70]);
  const over=liveRow({game:'1',market:'Player prop',pid:'9',metric:'points',side:'over',line:15.5},scores,boxes);
  assert.equal(over.result,'Win');assert.equal(over.provisional,true);
  const under=liveRow({game:'1',market:'Player prop',pid:'9',metric:'rebounds',side:'under',line:7.5},scores,boxes);
  assert.equal(under.result,undefined);assert.equal(under.live,true);assert.equal(under.liveActual,6);
});
