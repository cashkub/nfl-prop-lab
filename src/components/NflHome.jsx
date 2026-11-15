import React from 'react';
import {useArchive} from './useArchive.js';
import PlayerPhoto from './PlayerPhoto.jsx';
import TeamLogo from './TeamLogo.jsx';
import {gameResult} from '../lib/gamePicks.js';
import {priceText} from '../lib/bookLine.js';
import {formatRate} from '../lib/stats.js';
import {rateStyle} from './HitRate.jsx';
import {teamColor} from '../lib/teamColors.js';
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

const SHORT={'Player props':'Props','Anytime touchdowns':'TDs','Moneyline':'Moneyline','Spread':'Spread','Over/under':'Totals'};
function RecordCell({label,record}){
  const graded=record.wins+record.losses,rate=graded?record.wins/graded:null;
  return <a className="home-record-cell" href="#model-record" title={label}>
    <small><span className="long">{label}</span><span className="short">{SHORT[label]}</span></small>
    <b>{record.wins}–{record.losses}</b>
    <span className="home-meter" aria-hidden="true"><i style={{width:rate==null?'0%':Math.round(rate*100)+'%'}}/></span>
    <em>{rate==null?'No results yet':Math.round(rate*100)+'% won'}</em>
  </a>;
}

const support=row=>row.kind==='touchdown'
  ? (row.total?`Scored in ${row.hits} of his last ${row.total} games`:'')
  : (row.total?`Went ${row.side==='under'?'under':'over'} in ${row.hits} of his last ${row.total} games`:'');
const status=row=>row.result||(Date.parse(row.kickoff)<=Date.now()?'Started':'');

function Feature({row,label,href}){
  const opponent=row.team===row.home?row.away:row.home;
  return <a className="home-feature" href={href} style={{'--club':teamColor(row.team)||'#a775cf'}}>
    <span className="home-feature-tag">{label}</span>
    <span className="home-feature-body">
      <PlayerPhoto id={row.playerId} name={row.player} url={row.photo} eager/>
      <span className="home-feature-who">
        <b>{row.player}</b>
        <small><TeamLogo team={row.team}/>{row.team} vs {opponent} · {time.format(new Date(row.kickoff))}</small>
      </span>
      <strong style={rateStyle(row.modelHitRate)}>{formatRate(row.modelHitRate)}<small>{row.kind==='touchdown'?'to score':'model chance'}</small></strong>
    </span>
    <span className="home-feature-pick">{pickLine(row)}{Number.isFinite(row.price)?<i> {priceText(row.price)}</i>:null}{status(row)?<em className={'home-result '+tone(status(row))}>{status(row)}</em>:null}</span>
    <span className="home-feature-why">{support(row)}{Number.isFinite(row.breakEven)&&Number.isFinite(row.price)?` · price needs ${Math.round(100*row.breakEven)}%`:''}</span>
  </a>;
}

function PickRows({rows}){
  return <ol className="home-rows">{rows.map(row=><li key={row.id} style={{'--club':teamColor(row.team)||'#a775cf'}}>
    <span className="home-rank">{row.rank}</span>
    <PlayerPhoto id={row.playerId} name={row.player} url={row.photo} eager/>
    <span className="home-who"><b>{row.player}</b><small>{pickLine(row)}{Number.isFinite(row.price)?<i> · {priceText(row.price)}</i>:null}</small></span>
    {status(row)?<em className={'home-result '+tone(status(row))}>{status(row)}</em>:null}
    <strong style={rateStyle(row.modelHitRate)}>{formatRate(row.modelHitRate)}</strong>
  </li>)}</ol>;
}

function GameCard({row}){
  const pick=row.markets.moneyline,score=row.overall,final=row.final?.length===2?row.final:null;
  const result=final&&pick?gameResult(row,'moneyline'):'',projected=score?.length===2;
  const side=(team,index)=><span className={'home-game-side'+(pick?.side===team?' is-pick':'')}>
    <TeamLogo team={team}/><b>{team}</b><i>{final?final[index]:projected?Math.round(score[index]):'–'}</i></span>;
  return <a className="home-game" href="#nfl-games" style={{'--club':teamColor(pick?.side||row.home)||'#a775cf'}}>
    <small>{final?'Final':time.format(new Date(row.kickoff))}{!final&&projected?' · model score':''}</small>
    {side(row.away,0)}{side(row.home,1)}
    <em>{pick?<>Pick <b>{pick.side}</b>{Number.isFinite(pick.probability)?` ${Math.round(100*pick.probability)}%`:''}</>:'No pick saved'}{result&&result!=='Pending'?<span className={'home-result '+tone(result)}>{result}</span>:null}</em>
  </a>;
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
  const record=[['Player props',tally(published.filter(r=>r.kind==='prop'),r=>r.result)],['Anytime touchdowns',tally(published.filter(r=>r.kind==='touchdown'),r=>r.result)],
    ['Moneyline',market('moneyline')],['Spread',market('spread')],['Over/under',market('total')]];
  return <div className="nfl-home">
    <div className="home-intro"><h2>{day?dayTitle(day):'NFL'}</h2><p>{slate.length?`${slate.length} ${slate.length===1?'game':'games'} on the slate`:'No games on the slate'} · {props.length+touchdowns.length} published picks</p></div>
    {(props[0]||touchdowns[0])&&<section className="home-features">
      {props[0]&&<Feature row={props[0]} label="Top look" href="#top-eight"/>}
      {touchdowns[0]&&<Feature row={touchdowns[0]} label="Most likely to score" href="#top-eight"/>}
    </section>}
    <section>
      <h2 className="home-heading">Model record <a href="#model-record">Full record</a></h2>
      <div className="home-record">{record.map(([label,value])=><RecordCell key={label} label={label} record={value}/>)}</div>
    </section>
    <div className="home-columns">
      {props.length>1&&<section>
        <h2 className="home-heading">More top looks <a href="#top-eight">See all {props.length}</a></h2>
        <PickRows rows={props.slice(1,6)}/>
      </section>}
      {touchdowns.length>1&&<section>
        <h2 className="home-heading">More likely scorers <a href="#top-eight">See all {touchdowns.length}</a></h2>
        <PickRows rows={touchdowns.slice(1,6)}/>
      </section>}
    </div>
    {slate.length>0&&<section>
      <h2 className="home-heading">Games <small>{dayTitle(gameDay)}</small><a href="#nfl-games">All games</a></h2>
      <div className="home-game-strip">{slate.map(row=><GameCard key={row.id} row={row}/>)}</div>
    </section>}
    <p className="home-note">Picks lock at each game’s kickoff. Percentages are the model’s estimated chance, not a guarantee.</p>
  </div>;
}
