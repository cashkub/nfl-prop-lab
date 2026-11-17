import React,{useMemo,useState} from 'react';
import {Activity,ArrowUpDown,CalendarDays,ChevronDown,Filter,Scale,Shield,Target,TrendingUp,Trophy,Search} from 'lucide-react';
import RecordHeader from '../components/RecordHeader.jsx';
import FilterMenu from '../components/FilterMenu.jsx';
import TeamLogo from '../components/TeamLogo.jsx';
import PlayerPhoto from '../components/PlayerPhoto.jsx';
import {SummaryTile} from '../components/ModelRecordPicks.jsx';
import {useLiveCbb} from './live.js';
import {etDay,timeFmt,dayHeading,dayLabel,pct,money,headshot,shortTeam,teamColor,tone,resultText,rowState,pickText,withTeams,shortMarkets} from './shared.js';
import '../components/ModelRecordPicks.css';

const TABS=[['Player prop','Player Props',Target],['Moneyline','Moneyline',Trophy],['Total','Over/Under',ArrowUpDown],['Spread','Spread',Scale]];
const savedFmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const tally=rows=>{
  const c={Win:0,Loss:0,Push:0,Pending:0};
  for(const r of rows)c[r.result==='Win'||r.result==='Loss'||r.result==='Push'?r.result:'Pending']++;
  const graded=c.Win+c.Loss;
  return {...c,graded,rate:graded?c.Win/graded:null};
};
const rateTone=rate=>rate==null?'':rate>=.55?'green':'red';

function scoreLine(r,teams){
  const s=r.final||r.liveScore;
  return s?`${shortTeam(teams,r.away)} ${s[0]} · ${shortTeam(teams,r.home)} ${s[1]}`:'';
}

function Pick({row:r,teams,rank}){
  const [open,setOpen]=useState(false);
  const prop=r.market==='Player prop',state=rowState(r);
  const picked=prop?r.team:r.side==='away'?r.away:r.side==='home'?r.home:r.home;
  const opponent=prop?(r.team===r.home?r.away:r.home):null;
  const liveNow=r.live&&!r.result;
  const stat=prop?(r.actual??r.liveActual):null;
  const final=r.final||(r.liveFinal?r.liveScore:null);
  const head=liveNow?`LIVE · ${r.liveDetail||''}`:r.result?'FINAL':'PENDING';
  const big=prop?(stat!=null?`${stat} ${shortMarkets[r.metric]||''}`:'—'):final?final.join('–'):r.liveScore?r.liveScore.join('–'):'—';
  return <article className={`mr-pick ${open?'is-open':''} ${state}`}>
    <button className="mr-pick-head" type="button" aria-expanded={open} onClick={()=>setOpen(x=>!x)}>
      <span className="mr-rank">#{String(rank).padStart(2,'0')}</span>
      {prop?<span className="mr-photo" style={{'--club':teamColor(teams,r.team)}}><PlayerPhoto id={r.pid} name={r.name} url={headshot(r.pid)}/></span>
        :<span className="mr-photo mr-team-mark" style={{'--club':teamColor(teams,picked)}}><TeamLogo team={picked} sport="cbb"/></span>}
      <span className="mr-player">{prop?<><strong>{r.name}</strong><small><TeamLogo team={r.team} sport="cbb"/>{shortTeam(teams,r.team)} <i>VS</i> {shortTeam(teams,opponent)}</small></>
        :<><strong>{shortTeam(teams,r.away)} @ {shortTeam(teams,r.home)}</strong><small>{timeFmt.format(new Date(r.time))}</small></>}</span>
      <span className="mr-bet"><strong>{pickText(r,teams).toUpperCase()}</strong><small>{r.price==null?'Model pick':'DraftKings · '+money(r.price)}</small></span>
      <span className="mr-final"><small className={liveNow?'is-live':''}>{head}</small><strong>{big}</strong><em className={`mr-result ${liveNow?'live':tone(r.result)}`}>{resultText(r)}</em></span>
      <ChevronDown className="mr-chevron" size={18}/>
    </button>
    <div className="mr-pick-glance">
      <span className="mr-glance-date"><CalendarDays size={13}/>{dayLabel(etDay(r.time))} · {Date.parse(r.time)<=Date.now()?'Locked':'Pregame'}</span>
      <span className="mr-glance-form"><small>{prop?'MODEL PROJECTION':'MODEL SCORE'}</small><b className="mr-game-score">{prop?(r.projection!=null?Number(r.projection).toFixed(1):'—'):r.score?`${shortTeam(teams,r.away)} ${r.score[0]} · ${shortTeam(teams,r.home)} ${r.score[1]}`:'Not saved'}</b></span>
      <span className="mr-glance-prediction"><small>MODEL CHANCE</small><b>{pct(r.prob)}</b></span>
    </div>
    {open&&<div className="mr-detail-grid">
      <section className="mr-detail-block"><h3><Activity size={15}/> Pick</h3><dl>
        <div><dt>Pick</dt><dd>{pickText(r,teams)}</dd></div>
        <div><dt>Model chance</dt><dd>{pct(r.prob)}</dd></div>
        {r.price!=null&&<div><dt>Price</dt><dd>{money(r.price)}</dd></div>}
        {prop&&<div><dt>Line</dt><dd>{r.line} · player average</dd></div>}
        <div><dt>Saved</dt><dd>{savedFmt.format(new Date(r.saved))}</dd></div>
      </dl></section>
      <section className="mr-detail-block"><h3><Target size={15}/> Game</h3><dl>
        <div><dt>Matchup</dt><dd>{shortTeam(teams,r.away)} @ {shortTeam(teams,r.home)}</dd></div>
        <div><dt>Tip-off</dt><dd>{savedFmt.format(new Date(r.time))}</dd></div>
        <div><dt>{r.final?'Final':'Score'}</dt><dd>{scoreLine(r,teams)||'Not started'}</dd></div>
      </dl></section>
    </div>}
  </article>;
}

export default function CbbRecord({rows,teams}){
  const all=useMemo(()=>withTeams(rows,teams),[rows,teams]);
  const counts=Object.fromEntries(TABS.map(([m])=>[m,all.filter(r=>r.market===m).length]));
  const [tab,setTab]=useState(counts['Player prop']?'Player prop':'Moneyline');
  const [chosen,setDay]=useState(''),[status,setStatus]=useState('all'),[query,setQuery]=useState(''),[limit,setLimit]=useState(40);
  const today=etDay(Date.now());
  const market=all.filter(r=>r.market===tab);
  const days=[...new Set(market.map(r=>etDay(r.time)))].sort().reverse();
  const nearest=days.find(d=>d<=today)||days.at(-1)||'all';
  const day=chosen==='all'||days.includes(chosen)?chosen:nearest;
  const liveDays=[...new Set([today,day].filter(d=>d!=='all'&&d<=today))];
  const live=useLiveCbb(liveDays,market.filter(r=>r.market==='Player prop'&&liveDays.includes(etDay(r.time))&&!r.result).map(r=>r.game));
  const graded=market.map(live.row);
  const dayRows=graded.filter(r=>day==='all'||etDay(r.time)===day);
  const q=query.trim().toLowerCase();
  const visible=dayRows.filter(r=>(status==='all'||(status==='Pending'?!['Win','Loss','Push'].includes(r.result):r.result===status))
    &&(!q||[r.name,r.label,r.matchup].some(t=>String(t||'').toLowerCase().includes(q))))
    .sort((a,b)=>etDay(b.time).localeCompare(etDay(a.time))||(a.rank??99)-(b.rank??99)||a.time.localeCompare(b.time));
  const total=tally(graded),period=tally(dayRows),shown=tally(visible);
  const title=day==='all'?'All days':dayLabel(day);
  const detail=t=>`${t.graded} graded · ${t.Push} push · ${t.Pending} pending`;
  let rank=0,lastDay='';
  const Icon=TABS.find(([m])=>m===tab)[2];
  return <section className="panel props-board model-record-shell">
    <div className="board-sort model-record-tabs">{TABS.map(([m,label])=><button key={m} className="outline-button" aria-pressed={tab===m} onClick={()=>{setTab(m);setDay('');setStatus('all');setLimit(40);}}>{label}</button>)}</div>
    <div className="model-record-picks">
      <RecordHeader title={TABS.find(([m])=>m===tab)[1].toUpperCase()} icon={Icon}/>
      <div className="mr-period-select"><label><CalendarDays size={16}/><span>GAME DAY</span><FilterMenu aria-label="Select day for record summary" value={day} onChange={e=>{setDay(e.target.value);setLimit(40);}}><option value="all">All Days</option>{days.map(d=><option key={d} value={d}>{dayLabel(d)}</option>)}</FilterMenu></label></div>
      <div className="mr-kpis">
        <SummaryTile icon={Activity} label="ALL-TIME RECORD" value={`${total.Win}–${total.Loss}`} detail={detail(total)} tone="purple"/>
        <SummaryTile icon={TrendingUp} label="ALL-TIME WIN RATE" value={pct(total.rate)} detail="Graded picks only" tone={rateTone(total.rate)}/>
        <SummaryTile icon={Target} label={`${title.toUpperCase()} RECORD`} value={`${period.Win}–${period.Loss}`} detail={detail(period)} tone="purple"/>
        <SummaryTile icon={Shield} label={`${title.toUpperCase()} WIN RATE`} value={pct(period.rate)} detail="Graded picks only" tone={rateTone(period.rate)}/>
      </div>
      <section className="mr-archive">
        <div className="mr-section-title"><div><span className="mr-eyebrow">PICK ARCHIVE</span><h2>PUBLISHED PICKS</h2></div><span className="mr-count">{visible.length} RECORDS</span></div>
        <div className="mr-filters">
          <label><Filter size={15}/> RESULT <FilterMenu aria-label="Filter by result" value={status} onChange={e=>setStatus(e.target.value)}>{['all','Win','Loss','Push','Pending'].map(v=><option key={v} value={v}>{v==='all'?'All Results':v}</option>)}</FilterMenu></label>
          <label className="mr-search"><Search size={16}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={tab==='Player prop'?'Search player…':'Search team…'} aria-label="Search picks"/></label>
        </div>
        <div className="mr-totals"><strong><i>{shown.Win} WIN</i><b>{shown.Loss} LOSS</b><span>{shown.Push} PUSH</span><em>{shown.Pending} PENDING</em></strong></div>
        <div className="mr-pick-list">{visible.length?visible.slice(0,limit).map((r,i)=>{
          const d=etDay(r.time),first=d!==lastDay;
          if(first){rank=0;lastDay=d;}
          rank+=1;
          return <React.Fragment key={[r.game,r.market,r.pid,r.metric,r.side,r.line,i].join('-')}>
            {first&&<h3 className="mr-day-heading">{dayHeading.format(new Date(d+'T17:00Z'))}<small>{visible.filter(x=>etDay(x.time)===d).length} picks</small></h3>}
            <Pick row={r} teams={teams} rank={r.rank||rank}/>
          </React.Fragment>;
        }):<div className="mr-empty">{tab==='Player prop'&&!market.length?'Top Looks start saving with the next daily update.':'No picks match this selection.'}</div>}</div>
        {visible.length>limit&&<button className="prop-list-more" onClick={()=>setLimit(limit+40)}>Show More Picks</button>}
      </section>
    </div>
  </section>;
}
