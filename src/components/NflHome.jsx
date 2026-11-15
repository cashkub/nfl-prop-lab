import React from 'react';
import {useArchive} from './useArchive.js';
import PlayerPhoto from './PlayerPhoto.jsx';
import TeamLogo from './TeamLogo.jsx';
import {gameResult} from '../lib/gamePicks.js';
import {priceText} from '../lib/bookLine.js';
import {formatRate} from '../lib/stats.js';
import {rateStyle} from './HitRate.jsx';
import './NflHome.css';

const MODEL='2026.11.v2';
const eastern={timeZone:'America/New_York'};
const today=()=>new Date().toLocaleDateString('en-CA',eastern);
const dayOf=kickoff=>new Date(Date.parse(kickoff)).toLocaleDateString('en-CA',eastern);
const dayTitle=day=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(day+'T12:00:00Z'));
const time=new Intl.DateTimeFormat('en-US',{...eastern,hour:'numeric',minute:'2-digit'});
const tally=(rows,result)=>{
  const wins=rows.filter(r=>['Hit','Win'].includes(result(r))).length,losses=rows.filter(r=>['Miss','Loss'].includes(result(r))).length;
  return {wins,losses,pending:rows.filter(r=>!result(r)||result(r)==='Pending').length};
};
// The slate to feature: today if it has picks, otherwise the next day that does, otherwise the latest.
const featuredDay=days=>days.find(d=>d>=today())||days.at(-1)||'';
const pickLine=row=>row.kind==='touchdown'?'Anytime touchdown':`${row.side==='under'?'Under':'Over'} ${row.line} ${String(row.label||'').toLowerCase()}`;
const tone=result=>({Hit:'hit',Win:'hit',Miss:'miss',Loss:'miss',Push:'push'})[result]||'';

function RecordTile({label,record,href}){
  const graded=record.wins+record.losses;
  return <a className="home-tile" href={href}>
    <small>{label}</small>
    <b>{record.wins}–{record.losses}</b>
    <span>{graded?`${Math.round(100*record.wins/graded)}% of ${graded} graded`:'None graded yet'}{record.pending?` · ${record.pending} pending`:''}</span>
  </a>;
}

function PickRows({rows}){
  return <ol className="home-rows">{rows.map(row=><li key={row.id}>
    <span className="home-rank">{row.rank}</span>
    <PlayerPhoto id={row.playerId} name={row.player} url={row.photo} eager/>
    <span className="home-who"><b>{row.player}</b><small>{pickLine(row)}{Number.isFinite(row.price)?<i> · {priceText(row.price)}</i>:null}</small></span>
    {row.result?<em className={'home-result '+tone(row.result)}>{row.result}</em>:null}
    <strong style={rateStyle(row.modelHitRate)}>{formatRate(row.modelHitRate)}</strong>
  </li>)}</ol>;
}

export default function NflHome(){
  const picks=useArchive('nfl-picks.json'),games=useArchive('model-record.json');
  if(picks.error&&games.error)return <p>Home data is unavailable right now. Use the menu to open a page.</p>;
  if(!picks.rows||!games.rows)return <p>Loading…</p>;
  const published=picks.rows.filter(r=>r.model===MODEL);
  const day=featuredDay([...new Set(published.map(r=>r.date))].sort());
  const forDay=kind=>published.filter(r=>r.date===day&&r.kind===kind).sort((a,b)=>a.rank-b.rank);
  const props=forDay('prop'),touchdowns=forDay('touchdown');
  const saved=games.rows.filter(r=>r.markets);
  const gameDay=featuredDay([...new Set(saved.map(r=>dayOf(r.kickoff)))].sort());
  const slate=saved.filter(r=>dayOf(r.kickoff)===gameDay).sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff));
  const market=name=>tally(saved.filter(r=>r.markets[name]),r=>gameResult(r,name));
  return <div className="nfl-home">
    <section>
      <h2 className="home-heading">Model record <a href="#model-record">Full record</a></h2>
      <div className="home-tiles">
        <RecordTile label="Player props" record={tally(published.filter(r=>r.kind==='prop'),r=>r.result)} href="#model-record"/>
        <RecordTile label="Anytime touchdowns" record={tally(published.filter(r=>r.kind==='touchdown'),r=>r.result)} href="#model-record"/>
        <RecordTile label="Moneyline" record={market('moneyline')} href="#model-record"/>
        <RecordTile label="Spread" record={market('spread')} href="#model-record"/>
        <RecordTile label="Over/under" record={market('total')} href="#model-record"/>
      </div>
    </section>
    {props.length>0&&<section>
      <h2 className="home-heading">Top looks <small>{dayTitle(day)}</small><a href="#top-eight">See all {props.length}</a></h2>
      <PickRows rows={props.slice(0,5)}/>
    </section>}
    {touchdowns.length>0&&<section>
      <h2 className="home-heading">Most likely to score <small>{dayTitle(day)}</small><a href="#top-eight">See all {touchdowns.length}</a></h2>
      <PickRows rows={touchdowns.slice(0,5)}/>
    </section>}
    {slate.length>0&&<section>
      <h2 className="home-heading">Games <small>{dayTitle(gameDay)}</small><a href="#nfl-games">All games</a></h2>
      <ul className="home-games">{slate.map(row=>{
        const pick=row.markets.moneyline,score=row.overall,final=row.final?.length===2?row.final:null,result=final&&pick?gameResult(row,'moneyline'):'';
        return <li key={row.id}>
          <span className="home-matchup"><TeamLogo team={row.away}/><b>{row.away}</b><i>@</i><TeamLogo team={row.home}/><b>{row.home}</b></span>
          <span className="home-when">{final?`Final ${final[0]}–${final[1]}`:time.format(new Date(row.kickoff))}</span>
          <small>{score?.length===2?`Model: ${row.away} ${Math.round(score[0])}, ${row.home} ${Math.round(score[1])}`:'Model score not saved'}{pick?<> · pick <b>{pick.side}</b>{Number.isFinite(pick.probability)?` ${Math.round(100*pick.probability)}%`:''}</>:null}</small>
          {result&&result!=='Pending'?<em className={'home-result '+tone(result)}>{result}</em>:null}
        </li>;})}</ul>
    </section>}
    <p className="home-note">Picks lock at each game’s kickoff. Percentages are the model’s estimated chance, not a guarantee.</p>
  </div>;
}
