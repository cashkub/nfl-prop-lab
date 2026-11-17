import React,{useMemo,useState} from 'react';
import {Activity,ChevronDown} from 'lucide-react';
import FilterMenu from '../components/FilterMenu.jsx';
import TeamLogo from '../components/TeamLogo.jsx';
import PlayerPhoto from '../components/PlayerPhoto.jsx';
import {rateStyle} from '../components/HitRate.jsx';
import {useLiveCbb} from './live.js';
import {etDay,timeFmt,dayLabel,pct,headshot,shortTeam,teamColor,resultText,rowState,pickText,pickLooks,shortMarkets} from './shared.js';
import '../components/TopLooks.css';

const STATE_TEXT={live:'Live',started:'In progress',pending:'Pending'};

function Look({row:r,teams,open,onToggle,onChart}){
  const state=rowState(r),opponent=r.team===r.home?r.away:r.home;
  const value=r.actual??r.liveActual;
  const finalText=value!=null?`${r.result?'Final':'Now'}: ${value} ${shortMarkets[r.metric]||''}`:'';
  return <article className={'top-pick panel is-'+state+(open?' is-open':'')} style={{'--club':teamColor(teams,r.team)}}>
    <button className="pick-row" type="button" aria-expanded={open} onClick={onToggle}>
      <span className="pick-row-rank">{r.rank}</span>
      <PlayerPhoto id={r.pid} name={r.name} url={headshot(r.pid)}/>
      <span className="pick-row-who"><b>{r.name}</b><small>{pickText(r,teams)}</small>
        {finalText?<small className={'pick-row-final '+state}>{finalText}</small>:null}
        <small className="pick-row-game"><TeamLogo team={r.team} sport="cbb"/><span>{shortTeam(teams,r.team)} vs {shortTeam(teams,opponent)} · {timeFmt.format(new Date(r.time))}</span></small></span>
      <span className="pick-row-chance"><b style={rateStyle(r.prob)}>{pct(r.prob)}</b><small>model chance</small><em className={'pick-row-result '+state}>{r.result?resultText(r):STATE_TEXT[state]||resultText(r)}</em></span>
      <ChevronDown className="pick-row-chevron" size={18}/>
    </button>
    {open&&<div className="pick-body">
      <div className="top-pick-stat projection-stat"><small>PROJECTION</small><b>{r.projection!=null?Number(r.projection).toFixed(1):'—'}</b><small>vs. {r.line} line</small></div>
      <div className="top-pick-stat chance-stat"><small>MODEL CHANCE</small><b style={rateStyle(r.prob)}>{pct(r.prob)}</b><small>{r.side==='under'?'to stay under':'to go over'}</small></div>
      <div className="top-pick-stat defense-stat"><small>LINE</small><b>{r.line}</b><small>season average</small></div>
      <div className="top-pick-actions"><button type="button" onClick={()=>onChart(r)}><Activity size={15}/>Charts</button></div>
    </div>}
  </article>;
}

export default function CbbTopLooks({rows,games,teams,days,day,onDay,onChart}){
  const [open,setOpen]=useState('');
  const today=etDay(Date.now());
  const saved=useMemo(()=>rows.filter(r=>r.market==='Player prop'&&r.top),[rows]);
  const options=[...new Set([...days,...saved.map(r=>etDay(r.time))])].sort();
  const published=saved.filter(r=>etDay(r.time)===day).sort((a,b)=>(a.rank??99)-(b.rank??99)||b.prob-a.prob);
  const preview=useMemo(()=>published.length?[]:pickLooks(games||[]),[published.length,games]);
  const base=published.length?published:preview;
  const live=useLiveCbb(day<=today?[day]:[],base.filter(r=>!r.result).map(r=>r.game));
  const looks=base.map((r,i)=>({...live.row(r),rank:r.rank||i+1}));
  return <>
    <div className="top-looks-heading"><div><p>Ranked by chance to hit.</p></div><span className="slate-count">{looks.length} QUALIFIED</span></div>
    <section className="top-filter panel cb-top-filter">
      <label>Date<FilterMenu value={day} onChange={e=>{onDay(e.target.value);setOpen('');}}>{options.map(d=><option key={d} value={d}>{dayLabel(d)}</option>)}</FilterMenu></label>
      <span>{dayLabel(day)} · {published.length?'Published picks':'Pregame preview'}</span>
    </section>
    {looks.length?<section className="top-pick-list">{looks.map(r=>{
      const key=r.game+r.pid+r.metric+r.side;
      return <Look key={key} row={r} teams={teams} open={open===key} onToggle={()=>setOpen(open===key?'':key)} onChart={onChart}/>;
    })}</section>
    :<section className="no-top-picks panel"><h2>No qualified picks for {dayLabel(day)}</h2><p>Check back after the next update.</p></section>}
  </>;
}
