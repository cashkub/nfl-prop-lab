import {Trophy,ArrowUpDown,Scale,Activity,CalendarDays,ChevronDown,Filter,Shield,Target,TrendingUp} from 'lucide-react';
import RecordHeader from './RecordHeader.jsx';
import React,{useState} from 'react';
import {gameMarkets,gameResult} from '../lib/gamePicks.js';
import {periodLabel,recordPeriod} from '../lib/recordWeeks.js';
import {priceText} from '../lib/bookLine.js';
import {teamColor} from '../lib/teamColors.js';
import TeamLogo from './TeamLogo.jsx';
import FilterMenu from './FilterMenu.jsx';
import {SummaryTile} from './ModelRecordPicks.jsx';
import './ModelRecordPicks.css';

const headers={
  moneyline:{icon:Trophy,description:'The model’s pregame winner and saved odds are graded against the final score.'},
  total:{icon:ArrowUpDown,description:'Final combined points are graded against the model’s saved over or under and game total.'},
  spread:{icon:Scale,description:'The final margin is graded against the team and point spread saved before kickoff.'}
};
const eastern={timeZone:'America/New_York'};
const dayKey=r=>new Date(Date.parse(r.kickoff)).toLocaleDateString('en-CA',eastern);
const dayHeading=new Intl.DateTimeFormat('en-US',{...eastern,weekday:'long',month:'short',day:'numeric'});
const kickoffTime=new Intl.DateTimeFormat('en-US',{...eastern,hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const savedTime=new Intl.DateTimeFormat('en-US',{...eastern,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const pct=n=>Number.isFinite(n)?`${Math.round(n*100)}%`:'—';
const breakEven=price=>Number.isFinite(price)&&price!==0?(price<0?-price/(100-price):100/(price+100)):null;
// Shared result styling with the prop record: Win/Loss use the hit/miss colors.
const tone=result=>({Win:'hit',Loss:'miss',Push:'push'})[result]||'pending';
const tally=(rows,market)=>{
  const count={Win:0,Loss:0,Push:0,Pending:0};
  for(const row of rows)count[gameResult(row,market)]++;
  const graded=count.Win+count.Loss;
  return {...count,graded,rate:graded?count.Win/graded:null};
};
const signed=n=>(n>0?'+':'')+n;
const pickLabel=(pick,market)=>market==='moneyline'?`${pick.side} TO WIN`:market==='spread'?`${pick.side} ${signed(pick.line)}`:`${pick.side} ${pick.line}`;

function modelNote(row,market){
  const pick=row.markets[market],score=row.overall;
  const projected=score?.length===2&&score.every(Number.isFinite);
  if(market==='moneyline')return {label:'MODEL WIN CHANCE',value:pct(pick.probability),detail:breakEven(pick.price)==null?'no price saved':`price needs ${pct(breakEven(pick.price))}`};
  if(!projected)return {label:'MODEL PROJECTION',value:'—',detail:'score projection not saved'};
  if(market==='total')return {label:'MODEL TOTAL',value:(score[0]+score[1]).toFixed(1),detail:`vs ${pick.line} line`};
  const margin=pick.side===row.home?score[1]-score[0]:score[0]-score[1];
  return {label:'MODEL MARGIN',value:`${pick.side} ${signed(Number(margin.toFixed(1)))}`,detail:`vs ${signed(pick.line)} spread`};
}

function GamePick({row,market,rank}){
  const [open,setOpen]=useState(false);
  const pick=row.markets[market],result=gameResult(row,market),note=modelNote(row,market);
  const final=row.final?.length===2?row.final:null,score=row.overall;
  const locked=Date.now()>=Date.parse(row.kickoff);
  const team=market==='total'?row.home:pick.side;
  return <article className={`mr-pick ${open?'is-open':''} ${tone(result)}`}>
    <button className="mr-pick-head" type="button" aria-expanded={open} onClick={()=>setOpen(x=>!x)}>
      <span className="mr-rank">#{String(rank).padStart(2,'0')}</span>
      <span className="mr-photo mr-team-mark" style={{'--club':teamColor(team)}}><TeamLogo team={team}/></span>
      <span className="mr-player"><strong>{row.away} @ {row.home}</strong><small>{kickoffTime.format(new Date(row.kickoff))}</small></span>
      <span className="mr-bet"><strong>{pickLabel(pick,market)}</strong><small>Sportsbook line{Number.isFinite(pick.price)?` · ${priceText(pick.price)}`:''}</small></span>
      <span className="mr-final"><small className={row.provisional?'is-live':''}>{final?(row.provisional?'FINAL · LIVE':'FINAL'):'PENDING'}</small><strong>{final?final.join('–'):'—'}</strong><em className={`mr-result ${tone(result)}`}>{result}</em></span>
      <ChevronDown className="mr-chevron" size={18}/>
    </button>
    <div className="mr-pick-glance">
      <span className="mr-glance-date"><CalendarDays size={13}/>{periodLabel(recordPeriod(row,'nfl'),'nfl')} · {locked?'Locked':'Pregame'}</span>
      <span className="mr-glance-form"><small>MODEL SCORE</small><b className="mr-game-score">{score?.length===2?`${row.away} ${score[0].toFixed(1)} · ${row.home} ${score[1].toFixed(1)}`:'Not saved'}</b></span>
      <span className="mr-glance-prediction"><small>{note.label}</small><b>{note.value} <i>{note.detail}</i></b></span>
    </div>
    {open&&<div className="mr-detail-grid">
      <section className="mr-detail-block"><h3><Activity size={15}/> Pick At Publish</h3><dl>
        <div><dt>Pick</dt><dd>{pickLabel(pick,market)}</dd></div>
        <div><dt>Sportsbook Price</dt><dd>{Number.isFinite(pick.price)?priceText(pick.price):'Unavailable'}</dd></div>
        <div><dt>Break-Even Rate</dt><dd>{pct(breakEven(pick.price))}</dd></div>
        {market==='moneyline'&&<div><dt>Model Win Chance</dt><dd>{pct(pick.probability)}{Number.isFinite(pick.edge)?<small> {pick.edge>=0?'+':''}{(pick.edge*100).toFixed(1)} points vs the price</small>:null}</dd></div>}
        <div><dt>Saved</dt><dd>{savedTime.format(new Date(row.saved))}</dd></div>
      </dl></section>
      <section className="mr-detail-block"><h3><Target size={15}/> Model Projection</h3><dl>
        {[['Projected Score',row.overall],['Stats-Only Score',row.stats],['Market-Informed Score',row.blend]].map(([label,value])=>
          <div key={label}><dt>{label}</dt><dd>{value?.length===2?`${row.away} ${value[0].toFixed(1)} · ${row.home} ${value[1].toFixed(1)}`:'Not saved'}</dd></div>)}
        <div><dt>Final Score</dt><dd>{final?`${row.away} ${final[0]} · ${row.home} ${final[1]}`:'Pending'}</dd></div>
      </dl></section>
      <p className="mr-caveat">This is the pick and projection saved before kickoff. In past testing the betting market was more accurate than this game model.</p>
    </div>}
  </article>;
}

export default function GameMarketRecord({rows,market}){
  const [week,setWeek]=useState('');
  const [status,setStatus]=useState('all');
  const all=rows.filter(r=>r.markets?.[market]);
  const weeks=[...new Set(all.map(r=>recordPeriod(r,'nfl')))].sort().reverse();
  const nearest=all.reduce((best,r)=>!best||Math.abs(Date.parse(r.kickoff)-Date.now())<Math.abs(Date.parse(best.kickoff)-Date.now())?r:best,null);
  const selected=week==='all'||weeks.includes(week)?week:nearest?recordPeriod(nearest,'nfl'):'all';
  const weekRows=all.filter(r=>selected==='all'||recordPeriod(r,'nfl')===selected);
  const visible=weekRows.filter(r=>status==='all'||gameResult(r,market)===status)
    .sort((a,b)=>dayKey(b).localeCompare(dayKey(a))||Date.parse(a.kickoff)-Date.parse(b.kickoff));
  const total=tally(all,market),period=tally(weekRows,market),shown=tally(visible,market);
  const title=selected==='all'?'All Weeks':periodLabel(selected,'nfl');
  const rateTone=rate=>rate==null?'':rate>=.55?'green':'red';
  const detail=t=>`${t.graded} graded · ${t.Push} push · ${t.Pending} pending`;
  let rank=0,lastDay='';
  return <div className="model-record-picks">
    <RecordHeader title={gameMarkets[market].toUpperCase()} icon={headers[market].icon}>{headers[market].description}</RecordHeader>
    <div className="mr-period-select"><label><CalendarDays size={16}/><span>WEEKLY RECORD VIEW</span><FilterMenu aria-label="Select week for record summary" value={selected} onChange={e=>setWeek(e.target.value)}><option value="all">All Weeks</option>{weeks.map(w=><option key={w} value={w}>{periodLabel(w,'nfl')}</option>)}</FilterMenu></label><small>Pregame picks only · pending games are not counted as wins or losses.</small></div>
    <div className="mr-kpis">
      <SummaryTile icon={Activity} label="ALL-TIME SETTLED RECORD" value={`${total.Win}–${total.Loss}`} detail={detail(total)} tone="purple"/>
      <SummaryTile icon={TrendingUp} label="ALL-TIME WIN RATE" value={pct(total.rate)} detail="Graded picks · pending excluded" tone={rateTone(total.rate)}/>
      <SummaryTile icon={Target} label={`${title.toUpperCase()} RECORD`} value={`${period.Win}–${period.Loss}`} detail={detail(period)} tone="purple"/>
      <SummaryTile icon={Shield} label={`${title.toUpperCase()} WIN RATE`} value={pct(period.rate)} detail="Selected week · pending excluded" tone={rateTone(period.rate)}/>
    </div>
    <section className="mr-archive">
      <div className="mr-section-title"><div><span className="mr-eyebrow">PICK ARCHIVE</span><h2>PUBLISHED PICKS</h2></div><span className="mr-count">{visible.length} RECORDS</span></div>
      <div className="mr-filters">
        <label><Filter size={15}/> RESULT <FilterMenu aria-label="Filter by result" value={status} onChange={e=>setStatus(e.target.value)}>{['all','Win','Loss','Push','Pending'].map(value=><option key={value} value={value}>{value==='all'?'All Results':value}</option>)}</FilterMenu></label>
      </div>
      <div className="mr-totals"><strong><i>{shown.Win} WIN</i><b>{shown.Loss} LOSS</b><span>{shown.Push} PUSH</span><em>{shown.Pending} PENDING</em></strong><small>Win rate counts only graded wins and losses. Pushes and pending games are excluded.</small></div>
      <div className="mr-pick-list">{visible.length?visible.map(row=>{
        const day=dayKey(row),first=day!==lastDay;
        if(first){rank=0;lastDay=day;}
        rank+=1;
        return <React.Fragment key={row.id}>
          {first&&<h3 className="mr-day-heading">{dayHeading.format(new Date(Date.parse(row.kickoff)))}<small>{visible.filter(r=>dayKey(r)===day).length} games</small></h3>}
          <GamePick row={row} market={market} rank={rank}/>
        </React.Fragment>;
      }):<div className="mr-empty">No pregame {gameMarkets[market].toLowerCase()} picks saved for this selection.</div>}</div>
    </section>
  </div>;
}
