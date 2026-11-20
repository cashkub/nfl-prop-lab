import {priceText} from '../lib/bookLine.js';
import {plainWhy} from '../lib/plainWhy.js';
import {statLine} from '../lib/liveBox.js';
import PregameForm from './PregameForm.jsx';
import {useArchive} from './useArchive.js';
import {useLiveNfl} from './useLiveNfl.js';
import {publishedLook} from '../lib/publishedLooks.js';
import TeamLogo from './TeamLogo.jsx';
import React,{useEffect,useMemo,useState} from 'react';
import {ChevronDown,Activity,Info} from 'lucide-react';
import PlayerPhoto from './PlayerPhoto.jsx';
import NflToolHeader from './NflToolHeader.jsx';
import {teamColor} from '../lib/teamColors.js';
import {formatRate,METRICS} from '../lib/stats.js';
import {rateStyle,defenseRankStyle} from './HitRate.jsx';
import FilterMenu from './FilterMenu.jsx';
import './TopLooks.css';

import {MIN_PROP_LINE,MAX_PROP_PRICE,MIN_PROP_EDGE,MIN_TD_CHANCE,buildTopLooks,dayKey,dayLabel,fmtShare,averageLineLabel,projectionReason,gameContext} from '../lib/topLooksModel.js';
export default function TopLooks({players,schedule,books,season,now,loading,error,onOpen}) {
  const future=useMemo(()=>schedule.filter(game=>Date.parse(game.kickoff)>now),[schedule,now]);
  // Today's slate stays on the page after kickoff so published picks remain visible all day.
  const todayKey=dayKey(new Date(now).toISOString());
  const current=useMemo(()=>schedule.filter(game=>Date.parse(game.kickoff)>now||dayKey(game.kickoff)===todayKey),[schedule,now,todayKey]);
  const archive=useArchive('nfl-picks.json');
  const live=useLiveNfl();
  const published=useMemo(()=>(archive.rows||[]).filter(r=>r.model==='2026.11.v2'&&r.look).map(live.pick),[archive.rows,live]);
  // Finished games leave the schedule, so today's published picks also keep today selectable.
  const days=[...new Set([...current.map(game=>dayKey(game.kickoff)),...published.filter(r=>r.date===todayKey).map(r=>r.date)])].sort();
  const weeks=[...new Set(future.map(game=>String(game.week)))].sort((a,b)=>Number(a)-Number(b));
  const initialParams=new URLSearchParams(window.location.search);
  const [type,setType]=useState(()=>initialParams.get('topType')==='anytime'?'anytime':'props');
  const [mode,setMode]=useState(()=>initialParams.get('topMode')==='week'?'week':'day');
  const [selected,setSelected]=useState(()=>initialParams.get('topSelection')||'');
  const [openWhy,setOpenWhy]=useState('');
  const [openPick,setOpenPick]=useState('');
  const [replayData,setReplayData]=useState(null);
  useEffect(()=>{let active=true;fetch((import.meta.env.BASE_URL||'/')+'data/nfl-v2-replay.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(data=>{if(active&&data?.schemaVersion===1)setReplayData(data);}).catch(()=>{});return()=>{active=false;};},[]);
  const replayWeeks=replayData?.week?[String(replayData.week)]:[];
  const options=mode==='day'?days:[...new Set([...weeks,...replayWeeks])].sort((a,b)=>Number(a)-Number(b));
  const value=options.includes(selected)?selected:options[0]||'';
  const isReplay=mode==='week'&&String(value)==='9'&&replayData?.week===9;
  const replayDays=isReplay?replayData.days||[]:[];
  const slate=useMemo(()=>current.filter(game=>mode==='day'?dayKey(game.kickoff)===value:String(game.week)===value),[current,mode,value]);
  const replayPicks=isReplay?replayDays.flatMap(day=>(day.picks?.[type]||[]).map(pick=>({...pick,replayDayDate:day.date,replayDayLabel:day.label,replayGameCount:day.gameCount,replayAsOf:day.asOf}))):[];
  useEffect(()=>{
    const url=new URL(window.location.href);
    url.searchParams.set('topMode',mode);
    url.searchParams.set('topType',type);
    if(value)url.searchParams.set('topSelection',value);else url.searchParams.delete('topSelection');
    window.history.replaceState(window.history.state,'',url);
  },[mode,value,type]);
  const livePicks=useMemo(()=>{
    if(isReplay || loading || !archive.rows)return [];
    const kind=type==='props'?'prop':'touchdown';
    const dates=mode==='day'?(value?[value]:[]):[...new Set([...slate.map(g=>dayKey(g.kickoff)),...published.filter(r=>String(r.week)===String(value)&&r.date>=todayKey).map(r=>r.date)])].sort();
    return dates.flatMap(date=>{
      const fixtures=slate.filter(g=>dayKey(g.kickoff)===date);
      const locked=published.filter(r=>r.date===date&&r.kind===kind);
      if(locked.length)return locked.sort((a,b)=>a.rank-b.rank).map(r=>publishedLook(r,players,fixtures));
      return buildTopLooks({players,slate:fixtures.filter(g=>Date.parse(g.kickoff)>now),books,season,type});
    });
  },[slate,players,season,books,type,published,archive.rows,isReplay,loading,now,mode,value,todayKey]);
  const picks=isReplay?replayPicks:livePicks;
  const markets=Object.fromEntries(Object.entries(METRICS).map(([key,market])=>[key,market.label]));
  const kickDate=value&&mode==='day'?dayLabel(value):value?'Week '+value:'Upcoming';
  const displayedGameCount=isReplay?replayDays.reduce((sum,day)=>sum+Number(day.gameCount||0),0):slate.length;
  return <main className="top-looks chart-lab"><NflToolHeader active="top"/>
    <div className="top-looks-heading">
      <div>
        <p>{type==='anytime'?'Ranked by chance to score.':'Only props where the model beats the price.'}</p></div>
      <span className="slate-count">{picks.length} QUALIFIED</span>
    </div>
    <section className="top-filter panel">
      <label>Show Picks By<FilterMenu value={mode} onChange={event=>{setMode(event.target.value);setSelected('');}}>
        <option value="day">Game Date</option><option value="week">Week</option>
      </FilterMenu></label>
      <label>{mode==='day'?'Date':'Week'}<FilterMenu value={value} onChange={event=>setSelected(event.target.value)}>
        {options.map(option=><option key={option} value={option}>{mode==='day'?dayLabel(option):'Week '+option}</option>)}
      </FilterMenu></label>
      <div className="pick-type" role="group" aria-label="Pick Type"><span>PICK TYPE</span><div><button type="button" aria-pressed={type==='anytime'} onClick={()=>setType('anytime')}>Anytime Touchdowns</button><button type="button" aria-pressed={type==='props'} onClick={()=>setType('props')}>Player Props</button></div></div>
      <span>{isReplay?`Week 9 Replay · ${displayedGameCount} archived games`:`${kickDate} · ${slate.length} ${slate.length===1?'game':'games'}`}</span>
      <details className="model-guide"><summary aria-label="What The Model Considers" title="What The Model Considers"><Info size={17}/></summary><div className="model-guide-panel"><b>HOW TOP LOOKS RANKS</b>{type==='anytime'
  ?<p>Ranked by the model’s chance to score. Long shots under {Math.round(MIN_TD_CHANCE*100)}% are left off.</p>
  :<p>Listed only when the model’s chance beats DraftKings’ price by {Math.round(MIN_PROP_EDGE*100)}+ points, best edge first, up to 3 per game. Skips lines under {MIN_PROP_LINE.receptions} catches or {MIN_PROP_LINE.receivingYards} yards and prices steeper than {MAX_PROP_PRICE}. Some nights there are none.</p>}</div></details>
    </section>
    {isReplay&&<aside className="top-replay-notice" role="note"><strong>HISTORICAL V2 REPLAY · WEEK 9</strong><p>{replayData.disclaimer}</p><small>{replayData.coverageNote} Replay selections and outcomes stay outside the official Model Record.</small></aside>}
    {loading||error||(!isReplay&&!archive.rows)?<p>{error||(archive.error?'Published picks unavailable.':'Loading Top Looks…')}</p>:isReplay&&!replayData?<p>Loading Week 9 replay…</p>:picks.length?
      <section className={'top-pick-list'+(isReplay?' is-replay':'')}>{picks.map((pick,index)=>{
        const context=gameContext(pick.game,pick);
        const recentLabel=pick.recent.length?'last '+pick.recent.length:'recent';
        const shareLabel=pick.usageKey==='targets'?'Target Share':pick.usageKey==='carries'?'Carry Share':pick.usageKey==='attempts'?'Attempt Share':'Touch Share';
        const pickKey=pick.game.id+'|'+pick.player.id+'|'+pick.metric+'|'+pick.side;
        const whyId='pick-why-'+index;
        const displayRank=pick.replayRank||pick.publishedRank||index+1;
        const displayCount=pick.replayCount||picks.length;
        const startsReplayDay=isReplay&&(index===0||picks[index-1]?.replayDayDate!==pick.replayDayDate);
        const whyOpen=openWhy===pickKey;
        const pickOpen=openPick===pickKey;
        const pickState=pick.result?({Hit:'hit',Miss:'miss',Push:'push'}[pick.result]||'nostat'):pick.live?'live':Date.parse(pick.game.kickoff)<=now&&!isReplay?'started':'pending';
        const rowPrice=pick.quote.anytime?pick.quote.over:pick.quote[pick.side];
        return <React.Fragment key={(isReplay?'replay-':'')+pick.game.id+pick.player.id+pick.metric+pick.side}>{startsReplayDay&&<div className="replay-day-heading"><strong>{pick.replayDayLabel}</strong><span>{pick.replayGameCount} games · pregame snapshot {new Date(pick.replayAsOf).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} ET</span></div>}<article className={"top-pick panel is-"+pickState+(pickOpen?" is-open":"")} key={pick.game.id+pick.player.id+pick.metric+pick.side} style={{'--club':teamColor(pick.player.team)||'#a775cf'}}>
          <button className="pick-row" type="button" aria-expanded={pickOpen} onClick={()=>setOpenPick(pickOpen?'':pickKey)}>
            <span className="pick-row-rank">{displayRank}</span>
            <PlayerPhoto id={pick.player.id} name={pick.player.name} url={pick.player.photo}/>
            <span className="pick-row-who"><b>{pick.player.name}</b><small>{pick.quote.anytime?'Anytime touchdown':`${pick.side==='under'?'Under':'Over'} ${pick.line} ${String(markets[pick.metric]).toLowerCase()}`}{pick.quote.isBookLine&&Number.isFinite(rowPrice)?<i> · {priceText(rowPrice)}</i>:null}</small>
              {pick.finalStat?<small className={'pick-row-final '+pickState}>{pick.finalStat}</small>:null}
              <small className="pick-row-game"><TeamLogo team={pick.player.team}/>{pick.player.team} vs {pick.game.opponent} · {new Date(pick.game.kickoff).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})}</small></span>
            {pick.value?<em className="pick-row-value" title="The model's chance beats what the price needs">Value</em>:null}
            <span className="pick-row-chance"><b style={rateStyle(pick.chance)}>{formatRate(pick.chance)}</b><small>{pick.quote.anytime?'to score':'model chance'}</small><em className={'pick-row-result '+pickState}>{pick.result||{live:'Live',started:'In progress',pending:'Pending'}[pickState]}</em></span>
            <ChevronDown className="pick-row-chevron" size={18}/>
          </button>
          {pickOpen&&<div className="pick-body">
          <div className="pick-rank"><b>{String(displayRank).padStart(2,'0')}</b>{pick.touchdownModel?<small title="Model chance to score a touchdown">{pick.rankScore}% TO SCORE</small>:<small title="Comparative Model Score, Not A Percentage">{pick.rankScore} SCORE</small>}</div>
          <PlayerPhoto id={pick.player.id} name={pick.player.name} url={pick.player.photo}/>
          <div className="top-pick-main">
            <div className="top-matchup">{!isReplay&&<>{pick.publishedRank?'Published pick':'Pregame preview'} · </>}<TeamLogo team={pick.player.team}/>{pick.player.team} · <TeamLogo team={pick.game.opponent}/>{pick.game.opponent} · {new Date(pick.game.kickoff).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})} ET</div>
            <h2>{pick.player.name}</h2><p>{pick.quote.anytime?(pick.side==='over'?'ANYTIME TD · YES':'ANYTIME TD · NO'):pick.side.toUpperCase()+' '+pick.line+' '+markets[pick.metric]}</p>
            <p className="pick-plain-why">{plainWhy(pick,markets[pick.metric])}</p>
            <div className="pick-meta-row"><small className={'line-origin '+(pick.quote.isBookLine?'sportsbook':'average')}>{pick.quote.anytime?(pick.quote.isBookLine?'DRAFTKINGS ANYTIME TD ODDS':'MODEL ESTIMATE · NO ODDS'):pick.quote.isBookLine?'DRAFTKINGS LINE':'PLAYER AVERAGE LINE'}</small><button className="why-toggle" type="button" aria-expanded={whyOpen} aria-controls={whyId} onClick={()=>setOpenWhy(whyOpen?'':pickKey)}><Info size={14}/>{whyOpen?'Hide details':'Full breakdown'}<ChevronDown size={14}/></button></div>
            <div className="top-pregame-form"><small>PRE-GAME FORM <span>· Last {Math.min(5,pick.recent.length)} games</span></small>
              <PregameForm values={pick.recent} line={pick.line} side={pick.side} touchdown={pick.quote.anytime} label={markets[pick.metric]}/>
            </div>
          </div>
          <div className="top-pick-stat projection-stat"><small>PROJECTION</small><b>{pick.projection.toFixed(1)}</b><small>vs. {pick.line} Line</small></div>
          <div className="top-pick-stat chance-stat"><small title="The model's predicted chance that this prop hits, based on the available data.">MODEL PREDICTED HIT RATE</small><b style={rateStyle(pick.chance)}>{formatRate(pick.chance)}</b><small>{pick.hits}/{pick.history.length} PRIOR · <span style={rateStyle(pick.hits/pick.history.length)}>{formatRate(pick.hits/pick.history.length)} PRIOR RATE</span></small></div>
          <div className="top-pick-stat defense-stat"><small>TOP REASON</small><b data-fit={pick.favoriteReason.label==='Matchup'?pick.matchupTone:undefined} style={pick.favoriteReason.label==='Matchup'?defenseRankStyle(pick.defense?.rank,32,pick.side):undefined}>{pick.favoriteReason.label}</b><small className="top-reason-detail">{pick.favoriteReason.label==='Matchup'?pick.matchup:pick.favoriteReason.detail}</small><small>{pick.quote.isBookLine?'DK '+(type==='anytime'?'YES':pick.side.toUpperCase())+' '+priceText(pick.quote[pick.side]):'Odds unavailable'}</small></div>
          <div className="top-pick-actions">
            <button type="button" onClick={()=>onOpen(pick.player,{metric:pick.metric,point:pick.line,source:pick.quote.anytime?(pick.quote.isBookLine?'DraftKings Anytime TD Odds':'Model Estimate'):(pick.quote.isBookLine?'DraftKings':'Player Average')},pick.side,pick.game)}><Activity size={15}/>Charts</button>
          </div>
          <div id={whyId} className={'pick-reason-collapse'+(whyOpen?' is-open':'')} aria-hidden={!whyOpen}>
              <div className="pick-reason">
                <b>WHY THE MODEL LIKES THIS PICK</b>
                <div className="pick-reason-grid">
                  <section className="favorite-reason"><strong>TOP REASON · {pick.favoriteReason.label.toUpperCase()}</strong><span>{pick.favoriteReason.detail}</span></section>
                                    <section><strong>HISTORICAL RESULTS</strong><span>{pick.side.toUpperCase()} hit {pick.hits} of {pick.history.length} prior games (<b style={rateStyle(pick.hits/pick.history.length)}>{formatRate(pick.hits/pick.history.length)} prior hit rate</b>); {pick.recentHits} of {pick.recent.length} in the {recentLabel}.</span></section>
                  <section><strong>PROJECTION</strong><span>{projectionReason(pick)}</span></section>
                  {pick.volumeSignal>.1&&<section><strong>{shareLabel.toUpperCase()}</strong><span>{fmtShare(pick.share.average)} of team {pick.usageKey} across {pick.share.count} recent games{pick.share.trend!=null?'; recent share '+(pick.share.trend>0?'+':'')+(pick.share.trend*100).toFixed(1)+' percentage points':''}.</span></section>}
                  {pick.usageTrend!=null&&pick.usageTrend*(pick.side==='over'?1:-1)>0&&<section><strong>RECENT WORKLOAD</strong><span>{pick.usageKey}: {pick.usageTrend>0?'+':''}{pick.usageTrend.toFixed(1)} per game over the last 3 compared with the previous 3.</span></section>}
                  {pick.defense&&<section><strong>DEFENSE MATCHUP</strong><span data-fit={pick.matchupTone} style={defenseRankStyle(pick.defense.rank,32,pick.side)}>{pick.game.opponent} · {pick.matchup.toLowerCase()} ({pick.defense.average.toFixed(1)} per game over {pick.defense.games} games).</span></section>}
                  {pick.metric==='scoredTDs'&&pick.scoring?.games>0&&(pick.scoring.targetShare!=null||pick.scoring.carryShare!=null)&&<section><strong>RED-ZONE USAGE · {pick.scoring.games} GAMES</strong><span>{pick.scoring.targetShare!=null?'Red-zone target share '+fmtShare(pick.scoring.targetShare):''}{pick.scoring.targetShare!=null&&pick.scoring.carryShare!=null?' · ':''}{pick.scoring.carryShare!=null?'Red-zone carry share '+fmtShare(pick.scoring.carryShare):''}{pick.scoring.redZoneTargets!=null?' · '+pick.scoring.redZoneTargets.toFixed(1)+' targets per game':''}{pick.scoring.redZoneCarries!=null?' · '+pick.scoring.redZoneCarries.toFixed(1)+' carries per game':''}{pick.scoring.redZoneTouches!=null?' · '+pick.scoring.redZoneTouches.toFixed(1)+' touches inside the 20 per game':''}{pick.scoring.inside5Touches!=null?' · '+pick.scoring.inside5Touches.toFixed(1)+' touches inside the 5 per game':''}.</span></section>}
                  {pick.quote.isBookLine&&pick.fairSide!=null&&pick.fairSide>=.52&&<section><strong>{pick.quote.anytime?'ANYTIME TD PRICE':'NO-VIG MARKET'}</strong><span>{pick.quote.anytime?'The listed Yes price implies '+formatRate(pick.fairSide)+' before removing sportsbook margin.':'Market price implies '+formatRate(pick.fairSide)+' for the '+pick.side+' side after removing the two-way vig.'}</span></section>}
                  {pick.weather&&pick.weather.signal>.08&&<section><strong>WEATHER FORECAST</strong><span>{pick.weather.details}. {pick.weather.interpretation}</span></section>}
                  {context.injuries.length>0&&<section className="injury-reason"><strong>KEY INJURIES</strong><span>{context.injuries.map(item=><span key={item.team+item.role+item.name}>{item.team} {item.role} · {item.name} · {item.status}{item.injury?' · '+item.injury:''}{Number.isFinite(item.volume)?' · '+item.volume.toFixed(1)+' workload per game':''}{item.selected?' · THIS PLAYER':''}</span>)}</span></section>}
                </div>
              </div>
          </div>
          </div>}
        </article></React.Fragment>;
      })}</section>:
      <section className="no-top-picks panel"><h2>{type==='anytime'?'No touchdown looks':'No props we like'} for {isReplay?'Week 9 replay':kickDate}</h2>
        <p>Nothing beats the price right now. Lines are checked again at the next odds update.</p>
      </section>}
  </main>;
}

