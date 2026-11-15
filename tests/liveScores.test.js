import test from 'node:test';
import assert from 'node:assert/strict';
import {parseScoreboard,scoreKey} from '../src/lib/liveScores.js';

const event=(state,detail,away,home,a,h)=>({competitions:[{status:{type:{state,shortDetail:detail}},competitors:[
  {homeAway:'home',score:String(h),team:{abbreviation:home}},{homeAway:'away',score:String(a),team:{abbreviation:away}}]}]});
test('scoreboard keeps live and final games and matches team aliases',()=>{
  const scores=parseScoreboard({events:[event('post','Final','WSH','NYG',24,21),event('in','0:10 - 4th','HOU','CLE',24,27),event('pre','4:25 PM','SF','DAL',0,0)]});
  assert.deepEqual(scores.get(scoreKey('WAS','NYG')),{id:'',away:24,home:21,final:true,detail:'Final'});
  assert.deepEqual(scores.get('HOU@CLE'),{id:'',away:24,home:27,final:false,detail:'0:10 - 4th'});
  assert.equal(scores.has('SF@DAL'),false);
  assert.equal(scoreKey('LA','ARI'),'LAR@ARI');
  assert.equal(parseScoreboard(null).size,0);
});
