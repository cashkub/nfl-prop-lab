import {playerKey} from './bookLine.js';
import {scoreKey} from './liveScores.js';

// Player stat lines from ESPN's public game summary (free, unofficial).
const number=value=>{const n=Number(String(value).split('/')[0]);return Number.isFinite(n)?n:0;};
const TOUCHDOWNS=['rushingTouchdowns','receivingTouchdowns','kickReturnTouchdowns','puntReturnTouchdowns','interceptionTouchdowns','defensiveTouchdowns'];

export function parseBox(summary){
  const players=new Map();
  for(const team of summary?.boxscore?.players||[])for(const group of team.statistics||[])for(const entry of group.athletes||[]){
    const key=playerKey(entry.athlete?.displayName||'');
    if(!key)continue;
    const line=players.get(key)||{};
    (group.keys||[]).forEach((name,index)=>{
      const raw=entry.stats?.[index];
      if(name==='completions/passingAttempts'){const [made,tried]=String(raw).split('/');line.completions=number(made);line.passingAttempts=number(tried);}
      else if(!name.includes('/')&&!name.includes('-'))line[name]=(line[name]||0)+number(raw);
    });
    players.set(key,line);
  }
  for(const line of players.values()){
    line.scoredTDs=TOUCHDOWNS.reduce((sum,name)=>sum+(line[name]||0),0);
    line.scrimmageYards=(line.rushingYards||0)+(line.receivingYards||0);
  }
  return players;
}

// Stats that only ever go up, so a line already passed cannot be un-passed.
const COUNTS=new Set(['receptions','rushingAttempts','passingAttempts','completions','scoredTDs','passingTouchdowns']);
const decide=(value,line,side)=>value===line?'Push':(side==='under'?value<line:value>line)?'Hit':'Miss';

// Adds a provisional result to a published pick from the live box score.
// Saved (official) results are never touched.
export function livePick(row,scores,boxes){
  if(row.result)return row;
  const game=scores.get(scoreKey(row.away,row.home)),box=game&&boxes.get(game.id);
  if(!game||!box)return row;
  const stats=box.get(playerKey(row.player));
  const value=stats?Number(stats[row.metric]||0):0,line=Number(row.line),side=row.kind==='touchdown'?'over':String(row.side).toLowerCase();
  if(game.final)return {...row,actual:stats?value:null,result:stats?decide(value,line,side):'No Stat',provisional:true};
  const settledEarly=COUNTS.has(row.metric)&&value>line;
  return {...row,live:true,liveActual:value,liveDetail:game.detail,
    ...(settledEarly?{actual:value,result:side==='under'?'Miss':'Hit',provisional:true}:{})};
}

// Adds a provisional final score to a saved game pick.
export function liveGame(row,scores){
  if(row.final?.length===2)return row;
  const game=scores.get(scoreKey(row.away,row.home));
  return game?.final?{...row,final:[game.away,game.home],provisional:true}:row;
}

// "5 receptions", "1 rushing yard", "no touchdown": a pick's stat in plain words.
export function statLine(row){
  const live=Boolean(row.live&&!row.result),value=live?row.liveActual:row.actual;
  if(value==null||(!live&&!row.result)||row.result==='No Stat')return '';
  const count=Number(value);
  const unit=row.kind==='touchdown'?'touchdowns':String(row.label||'').toLowerCase();
  const text=row.kind==='touchdown'&&count===0?'no touchdown':`${count} ${count===1?unit.replace(/s$/,''):unit}`;
  return `${live?'Now':'Final'}: ${text}`;
}
