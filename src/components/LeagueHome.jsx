import React from 'react';
import PlayerPhoto from './PlayerPhoto.jsx';
import TeamLogo from './TeamLogo.jsx';
import './LeagueHome.css';

// League-neutral home page. Each league supplies plain data (see NflHome.jsx);
// nothing in here knows about a specific sport.
//   hero:     {league, photo, accent, date, lines:[text]}
//   record:   [{label, wins, losses, pending, href}]
//   sections: [{title, note, href, linkLabel, rows:[{id, rank, name, playerId, photo, color,
//               pick, price, final, status, tone, chance, chanceStyle, support}]}]
//   games:    {title, note, href, sport, rows:[{id, color, away, home, when, isLive, awayScore, homeScore,
//               scoreLabel (model), awayActual, homeActual, actualLabel, pickSide, pickText, result, tone}]}
const Result=({text,tone})=>text?<em className={'lh-result '+(tone||'')}>{text}</em>:null;

function RecordTile({label,wins,losses,pending,href}){
  const graded=wins+losses,rate=graded?wins/graded:null;
  return <a className="lh-tile" href={href}><span>
    <small>{label}</small>
    <b>{wins}–{losses}</b>
    <i className="lh-meter" aria-hidden="true"><i style={{width:rate==null?'0%':Math.round(rate*100)+'%'}}/></i>
    <em>{rate==null?'No results yet':`${Math.round(rate*100)}% of ${graded}`}{pending?` · ${pending} pending`:''}</em>
  </span></a>;
}

function PickRow({row}){
  return <li className={row.tone?'is-'+row.tone:''} style={{'--club':row.color||'#a775cf'}}>
    <span className="lh-rank">{row.rank}</span>
    {row.logo?<span className="lh-logo"><TeamLogo team={row.logo} sport={row.sport}/></span>:<PlayerPhoto id={row.playerId} name={row.name} url={row.photo} eager/>}
    <span className="lh-who"><b>{row.name}</b><small>{row.pick}{row.price?<i> · {row.price}</i>:null}</small>{row.final?<small className={'lh-final '+(row.tone||'')}>{row.final}</small>:null}</span>
    <span className="lh-chance"><strong style={row.chanceStyle}>{row.chance}</strong>{row.support?<small>{row.support}</small>:null}<Result text={row.status} tone={row.tone}/></span>
  </li>;
}

function GameRow({row,sport,href}){
  const played=row.awayActual!=null&&row.homeActual!=null;
  const side=(team,model,actual)=><span className={'lh-side'+(row.pickSide===team?' is-pick':'')}><TeamLogo team={team} sport={sport}/><b>{row.names?.[team]||team}</b>
    <i>{model??'–'}</i>{played?<u>{actual}</u>:null}</span>;
  return <a className={'lh-game'+(row.isLive?' is-live':'')} href={href} style={{'--club':row.color||'#a775cf'}}>
    <small><span>{row.when}</span>{row.scoreLabel?<i>{row.scoreLabel}</i>:null}{played?<u>{row.actualLabel}</u>:null}</small>
    {side(row.away,row.awayScore,row.awayActual)}{side(row.home,row.homeScore,row.homeActual)}
    <em>{row.pickText||'No pick saved'}<Result text={row.result} tone={row.tone}/></em>
  </a>;
}

export default function LeagueHome({hero,record=[],sections=[],games,note}){
  return <div className="league-home" style={{'--accent':hero.accent||'#b98aff'}}>
    <header className="lh-hero" style={{'--scene':`url('${hero.photo}')`}}>
      <span className="lh-live">Live</span>
      <h2>{hero.league}</h2>
      <p><b>{hero.date}</b>{hero.lines.filter(Boolean).map(line=><span key={line}>{line}</span>)}</p>
    </header>
    {record.length>0&&<section>
      <h3 className="lh-heading">Model record<a href={record[0].href}>Full record</a></h3>
      <div className="lh-tiles">{record.map(item=><RecordTile key={item.label} {...item}/>)}</div>
    </section>}
    <div className="lh-columns">{sections.filter(s=>s.rows.length).map(section=><section key={section.title}>
      <h3 className="lh-heading">{section.title}{section.note?<small>{section.note}</small>:null}<a href={section.href}>{section.linkLabel}</a></h3>
      <ol className="lh-rows">{section.rows.map(row=><PickRow key={row.id} row={row}/>)}</ol>
    </section>)}</div>
    {games?.rows.length>0&&<section>
      <h3 className="lh-heading">{games.title}{games.note?<small>{games.note}</small>:null}<a href={games.href}>{games.linkLabel||'All games'}</a></h3>
      <div className={"lh-games lh-games-"+(games.sport||"nfl")}>{games.rows.map(row=><GameRow key={row.id} row={row} sport={games.sport} href={games.href}/>)}</div>
    </section>}
    <p className="lh-note">{note||'Picks lock at kickoff.'}</p>
  </div>;
}
