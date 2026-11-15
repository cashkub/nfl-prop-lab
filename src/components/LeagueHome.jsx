import React from 'react';
import PlayerPhoto from './PlayerPhoto.jsx';
import TeamLogo from './TeamLogo.jsx';
import './LeagueHome.css';

// League-neutral home page. Each league supplies plain data (see NflHome.jsx);
// nothing in here knows about a specific sport.
//   hero:     {league, photo, accent, date, lines:[text]}
//   record:   [{label, wins, losses, pending, href}]
//   sections: [{title, note, href, linkLabel, rows:[{id, rank, name, playerId, photo, color,
//               pick, price, status, tone, chance, chanceStyle, support}]}]
//   games:    {title, note, href, sport, rows:[{id, color, away, home, when, awayScore, homeScore,
//               scoreLabel, pickSide, pickText, result, tone}]}
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
  return <li style={{'--club':row.color||'#a775cf'}}>
    <span className="lh-rank">{row.rank}</span>
    <PlayerPhoto id={row.playerId} name={row.name} url={row.photo} eager/>
    <span className="lh-who"><b>{row.name}</b><small>{row.pick}{row.price?<i> · {row.price}</i>:null}</small></span>
    <Result text={row.status} tone={row.tone}/>
    <span className="lh-chance"><strong style={row.chanceStyle}>{row.chance}</strong>{row.support?<small>{row.support}</small>:null}</span>
  </li>;
}

function GameRow({row,sport,href}){
  const side=(team,score)=><span className={'lh-side'+(row.pickSide===team?' is-pick':'')}><TeamLogo team={team} sport={sport}/><b>{team}</b><i>{score??'–'}</i></span>;
  return <a className="lh-game" href={href} style={{'--club':row.color||'#a775cf'}}>
    <small>{row.when}{row.scoreLabel?<span> · {row.scoreLabel}</span>:null}</small>
    {side(row.away,row.awayScore)}{side(row.home,row.homeScore)}
    <em>{row.pickText||'No pick saved'}<Result text={row.result} tone={row.tone}/></em>
  </a>;
}

export default function LeagueHome({hero,record=[],sections=[],games}){
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
      <h3 className="lh-heading">{games.title}{games.note?<small>{games.note}</small>:null}<a href={games.href}>All games</a></h3>
      <div className="lh-games">{games.rows.map(row=><GameRow key={row.id} row={row} sport={games.sport} href={games.href}/>)}</div>
    </section>}
    <p className="lh-note">Picks lock at each game’s kickoff. Percentages are the model’s estimated chance, not a guarantee.</p>
  </div>;
}
