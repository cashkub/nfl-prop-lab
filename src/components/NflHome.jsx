import React from 'react';
import {useArchive} from './useArchive.js';
import LeagueHome from './LeagueHome.jsx';
import {gameResult} from '../lib/gamePicks.js';
import {priceText} from '../lib/bookLine.js';
import {formatRate} from '../lib/stats.js';
import {rateStyle} from './HitRate.jsx';
import {teamColor} from '../lib/teamColors.js';
import {useLiveScores} from './useLiveScores.js';
import {scoreKey} from '../lib/liveScores.js';

const MODEL='2026.11.v2';
const eastern={timeZone:'America/New_York'};
const today=()=>new Date().toLocaleDateString('en-CA',eastern);
const dayOf=kickoff=>new Date(Date.parse(kickoff)).toLocaleDateString('en-CA',eastern);
const dayTitle=(day,weekday='long')=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday,month:'long',day:'numeric'}).format(new Date(day+'T12:00:00Z'));
const time=new Intl.DateTimeFormat('en-US',{...eastern,hour:'numeric',minute:'2-digit'});
const tally=(rows,result,label)=>({label,href:'#model-record',
  wins:rows.filter(r=>['Hit','Win'].includes(result(r))).length,losses:rows.filter(r=>['Miss','Loss'].includes(result(r))).length,
  pending:rows.filter(r=>!result(r)||result(r)==='Pending').length});
// The slate to feature: today if it has picks, otherwise the next day that does, otherwise the latest.
const featuredDay=days=>days.find(d=>d>=today())||days.at(-1)||'';
const tone=result=>({Hit:'hit',Win:'hit',Miss:'miss',Loss:'miss',Push:'push'})[result]||'';
const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;

const pickRow=row=>{
  const status=row.result||(Date.parse(row.kickoff)<=Date.now()?'Started':'');
  return {id:row.id,rank:row.rank,name:row.player,playerId:row.playerId,photo:row.photo,color:teamColor(row.team),
    pick:row.kind==='touchdown'?'Anytime touchdown':`${row.side==='under'?'Under':'Over'} ${row.line} ${String(row.label||'').toLowerCase()}`,
    price:Number.isFinite(row.price)?priceText(row.price):'',status,tone:tone(status),
    chance:formatRate(row.modelHitRate),chanceStyle:rateStyle(row.modelHitRate),
    support:row.total?`${row.hits} of last ${row.total}`:''};
};
const gameRow=(row,scores)=>{
  const pick=row.markets.moneyline,model=row.overall,projected=model?.length===2;
  // Saved finals win; otherwise use the live scoreboard when it has this game.
  const live=row.final?.length===2?{away:row.final[0],home:row.final[1],final:true,detail:'Final'}:scores.get(scoreKey(row.away,row.home));
  const pickWon=live?.final&&pick&&live.away!==live.home?(live.home>live.away?row.home:row.away)===pick.side:null;
  const result=pickWon==null?'':pickWon?'Win':'Loss';
  return {id:row.id,color:teamColor(pick?.side||row.home),away:row.away,home:row.home,
    when:live?live.detail:time.format(new Date(row.kickoff)),isLive:Boolean(live&&!live.final),
    awayScore:projected?Math.round(model[0]):null,homeScore:projected?Math.round(model[1]):null,scoreLabel:projected?'Model':'',
    awayActual:live?live.away:null,homeActual:live?live.home:null,actualLabel:live?(live.final?'Final':'Live'):'',
    pickSide:pick?.side,pickText:pick?`Pick ${pick.side}${Number.isFinite(pick.probability)?` · ${Math.round(100*pick.probability)}%`:''}`:'',
    result,tone:tone(result)};
};

export default function NflHome(){
  const picks=useArchive('nfl-picks.json'),games=useArchive('model-record.json'),scores=useLiveScores();
  if(picks.error&&games.error)return <p>Home data is unavailable right now. Use the menu to open a page.</p>;
  if(!picks.rows||!games.rows)return <p>Loading…</p>;
  const published=picks.rows.filter(r=>r.model===MODEL);
  const day=featuredDay([...new Set(published.map(r=>r.date))].sort());
  const forDay=kind=>published.filter(r=>r.date===day&&r.kind===kind).sort((a,b)=>a.rank-b.rank);
  const props=forDay('prop'),touchdowns=forDay('touchdown');
  const saved=games.rows.filter(r=>r.markets);
  const gameDay=featuredDay([...new Set(saved.map(r=>dayOf(r.kickoff)))].sort());
  const slate=saved.filter(r=>dayOf(r.kickoff)===gameDay).sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff));
  const market=(name,label)=>tally(saved.filter(r=>r.markets[name]),r=>gameResult(r,name),label);
  const shown=day||gameDay;
  return <LeagueHome
    hero={{league:'NFL',photo:'/preview/assets/nfl-action.jpg',accent:'#b98aff',date:shown?dayTitle(shown):'',
      lines:[slate.length?plural(slate.length,'game'):'',props.length+touchdowns.length?plural(props.length+touchdowns.length,'published pick'):'']}}
    record={[tally(published.filter(r=>r.kind==='prop'),r=>r.result,'Player props'),tally(published.filter(r=>r.kind==='touchdown'),r=>r.result,'Touchdowns'),
      market('moneyline','Moneyline'),market('spread','Spread'),market('total','Over/under')]}
    sections={[
      {title:'Top looks',href:'#top-eight',linkLabel:`See all ${props.length}`,rows:props.slice(0,5).map(pickRow)},
      {title:'Most likely to score',href:'#top-eight',linkLabel:`See all ${touchdowns.length}`,rows:touchdowns.slice(0,5).map(pickRow)}]}
    games={{title:'Games',note:gameDay&&gameDay!==shown?dayTitle(gameDay,'short'):'',href:'#nfl-games',sport:'nfl',rows:slate.map(row=>gameRow(row,scores))}}/>;
}
