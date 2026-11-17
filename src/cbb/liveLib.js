// Live and final college scores from ESPN's free public scoreboard (no odds).
// Games are keyed by ESPN event id, which is also the id our CBB data uses.
export const BASE='https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/';
const number=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
const espnDay=day=>String(day).replaceAll('-','');

export function parseCbbScoreboard(payload){
  const scores=new Map();
  for(const event of payload?.events||[]){
    const game=event.competitions?.[0],type=game?.status?.type,state=type?.state;
    const home=game?.competitors?.find(t=>t.homeAway==='home'),away=game?.competitors?.find(t=>t.homeAway==='away');
    if(!home||!away||!['in','post'].includes(state))continue;
    const points=[Number(away.score),Number(home.score)];
    if(!points.every(Number.isFinite))continue;
    scores.set(String(event.id),{id:String(event.id),away:points[0],home:points[1],final:state==='post',
      detail:state==='post'?'Final':type.shortDetail||'Live'});
  }
  return scores;
}

// Player lines from a game summary, keyed by ESPN athlete id.
// Paired keys like "threePointFieldGoalsMade-threePointFieldGoalsAttempted" keep the made count.
export function parseCbbBox(summary){
  const players=new Map();
  for(const team of summary?.boxscore?.players||[])for(const group of team.statistics||[])for(const entry of group.athletes||[]){
    const id=String(entry.athlete?.id||'');
    if(!id)continue;
    const line=players.get(id)||{};
    (group.keys||[]).forEach((key,index)=>{
      const raw=String(entry.stats?.[index]??'');
      if(key.includes('-')){const names=key.split('-'),values=raw.split('-');names.forEach((name,i)=>{line[name]=number(values[i]);});}
      else line[key]=number(raw);
    });
    line.threes=line.threePointFieldGoalsMade??line.threes??0;
    for(const k of ['points','rebounds','assists','steals','blocks','turnovers'])line[k]=line[k]||0;
    line.PRA=line.points+line.rebounds+line.assists;line.PR=line.points+line.rebounds;line.PA=line.points+line.assists;line.RA=line.rebounds+line.assists;
    line.played=Boolean(number(line.minutes)||line.points||line.rebounds||line.assists);
    players.set(id,line);
  }
  return players;
}

// Win / Loss / Push for a saved game pick from a score ([away, home]).
export function gradeGame(row,final){
  const [away,home]=final;
  if(row.market==='Total'){const diff=(away+home-row.line)*(row.side==='over'?1:-1);return diff>0?'Win':diff<0?'Loss':'Push';}
  const diff=(home-away)*(row.side==='home'?1:-1)+Number(row.line||0);
  return diff>0?'Win':diff<0?'Loss':'Push';
}
const COUNTS=new Set(['points','rebounds','assists','threes','steals','blocks','PRA','PR','PA','RA']);
export function gradeProp(row,value){
  if(value===row.line)return 'Push';
  return (row.side==='under'?value<row.line:value>row.line)?'Win':'Loss';
}

// Adds provisional live/final info to a saved CBB pick. Saved results win.
export function liveRow(row,scores,boxes){
  const game=scores.get(String(row.game));
  const out={...row};
  if(game){out.liveScore=[game.away,game.home];out.liveDetail=game.detail;out.liveFinal=game.final;}
  if(row.result||!game)return out;
  if(row.market==='Player prop'){
    const stats=boxes.get(String(row.game))?.get(String(row.pid));
    if(!stats)return {...out,live:!game.final};
    const value=Number(stats[row.metric]||0);
    if(game.final)return {...out,actual:value,result:stats.played?gradeProp(row,value):'Void',provisional:true};
    const early=COUNTS.has(row.metric)&&value>row.line;
    return {...out,live:true,liveActual:value,...(early?{actual:value,result:row.side==='under'?'Loss':'Win',provisional:true}:{})};
  }
  if(game.final)return {...out,final:[game.away,game.home],result:gradeGame(row,[game.away,game.home]),provisional:true};
  return {...out,live:true};
}

