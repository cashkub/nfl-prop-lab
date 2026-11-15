import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBox,livePick,liveGame} from '../src/lib/liveBox.js';

const summary={boxscore:{players:[{statistics:[
  {keys:['completions/passingAttempts','passingYards','sacks-sackYardsLost'],athletes:[{athlete:{displayName:'Pat Thrower'},stats:['22/35','348','1-9']}]},
  {keys:['rushingAttempts','rushingYards','rushingTouchdowns'],athletes:[{athlete:{displayName:'Emmett Johnson Jr.'},stats:['22','101','0']}]},
  {keys:['receptions','receivingYards','receivingTouchdowns'],athletes:[{athlete:{displayName:'Emmett Johnson Jr.'},stats:['6','70','2']}]}]}]}};
const box=parseBox(summary);
test('box score lines combine rushing and receiving and count touchdowns',()=>{
  const line=box.get('emmettjohnson');
  assert.deepEqual([line.rushingAttempts,line.rushingYards,line.receptions,line.scoredTDs,line.scrimmageYards],[22,101,6,2,171]);
  assert.deepEqual([box.get('patthrower').completions,box.get('patthrower').passingAttempts,box.get('patthrower').passingYards],[22,35,348]);
});
const pick=(extra)=>({away:'KC',home:'ATL',player:'Emmett Johnson',kind:'prop',metric:'rushingYards',side:'over',line:60.5,...extra});
const scores=final=>new Map([['KC@ATL',{id:'1',away:35,home:13,final,detail:final?'Final':'3:10 - 3rd'}]]);
const boxes=new Map([['1',box]]);
test('live picks grade at the final whistle, or early only when the stat cannot go back',()=>{
  assert.deepEqual((({result,actual,provisional})=>({result,actual,provisional}))(livePick(pick(),scores(true),boxes)),{result:'Hit',actual:101,provisional:true});
  const yards=livePick(pick(),scores(false),boxes);
  assert.equal(yards.result,undefined);assert.equal(yards.liveActual,101);assert.equal(yards.live,true);
  assert.equal(livePick(pick({metric:'receptions',line:5.5}),scores(false),boxes).result,'Hit');
  assert.equal(livePick(pick({metric:'receptions',line:5.5,side:'under'}),scores(false),boxes).result,'Miss');
  assert.equal(livePick(pick({metric:'receptions',line:7.5,side:'under'}),scores(false),boxes).result,undefined);
  assert.equal(livePick(pick({kind:'touchdown',metric:'scoredTDs',line:.5,side:'over'}),scores(false),boxes).result,'Hit');
  assert.equal(livePick(pick({player:'Nobody Here'}),scores(true),boxes).result,'No Stat');
  assert.equal(livePick(pick({result:'Miss'}),scores(true),boxes).provisional,undefined);
  assert.equal(livePick(pick(),new Map(),boxes).live,undefined);
});
test('live games take the final score only once the game is over',()=>{
  assert.deepEqual(liveGame({away:'KC',home:'ATL'},scores(true)).final,[35,13]);
  assert.equal(liveGame({away:'KC',home:'ATL'},scores(false)).final,undefined);
  assert.deepEqual(liveGame({away:'KC',home:'ATL',final:[1,2]},scores(true)).final,[1,2]);
});
