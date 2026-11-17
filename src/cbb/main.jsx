import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import NflToolHeader from '../components/NflToolHeader.jsx';
import Bracket from './Bracket.jsx';
import LeagueHome from '../components/LeagueHome.jsx';
import GameBars from '../components/GameBars.jsx';
import LineControl,{ControlLabel} from '../components/LineControl.jsx';
import ChartSelect from '../components/ChartSelect.jsx';
import {rateStyle} from '../components/HitRate.jsx';
import FilterMenu from '../components/FilterMenu.jsx';
import CbbRecord from './CbbRecord.jsx';
import CbbTopLooks from './CbbTopLooks.jsx';
import {useLiveCbb} from './live.js';
import {pickLooks,withTeams,school,pickText,shortMarkets,tone as resultTone} from './shared.js';
import {Target,Shield,ChartNoAxesCombined} from 'lucide-react';
import '../components/ModelRecordPicks.css';
import '../components/NflGames.css';
import '../components/NflPropList.css';
import '../components/TopLooks.css';
import TeamLogo from '../components/TeamLogo.jsx';
import '../styles.css';
import '../components/NflCharts.css';
import './styles.css';

const markets={points:'Points',rebounds:'Rebounds',assists:'Assists',threes:'Made threes',turnovers:'Turnovers',steals:'Steals',blocks:'Blocks',PRA:'Points + rebounds + assists',PR:'Points + rebounds',PA:'Points + assists',RA:'Rebounds + assists'};
const pages=['home','charts','props','top','games','record','bracket'];
const venueOptions=['All','Home','Away','Neutral'];
const money=v=>v==null?'—':(v>0?'+':'')+v;
const pct=v=>v==null?'—':Math.round(v*100)+'%';
const dateFmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',weekday:'short'});
const timeFmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const etDay=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const labelDay=d=>dateFmt.format(new Date(d+'T12:00Z'));
function useFile(file){
  const [state,set]=useState({});
  useEffect(()=>{
    if(!file)return;
    const ctrl=new AbortController();
    fetch('/data/cbb-v2/'+file,{signal:ctrl.signal,cache:'no-cache'}).then(r=>{
      if(!r.ok)throw Error();return r.json();
    }).then(value=>set({file,value})).catch(()=>{if(!ctrl.signal.aborted)set({file,error:true});});
    return ()=>ctrl.abort();
  },[file]);
  return state.file===file?state:{};
}
const current=()=>window.location.hash.replace('#cbb-','');
function Select({label,value,onChange,children,disabled=false}){
  return <label className="cb-select">{label}<FilterMenu aria-label={label} disabled={disabled} value={value} onChange={e=>onChange(e.target.value)}>{children}</FilterMenu></label>;
}
function Headshot({id,team,large=false}){
  const [failed,setFailed]=useState(null);
  return <span className={'cb-face'+(large?' cb-face-large':'')}>{id&&failed!==id?
    <img alt="" loading="lazy" decoding="async" src={'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/'+id+'.png'} onError={()=>setFailed(id)}/>:
    <TeamLogo sport="cbb" team={team}/>}</span>;
}
function Team({id,teams}){
  const info=teams[id];
  return <span className="cb-team" style={{'--team':'#'+(info?.color||'b69bd8')}}><TeamLogo team={id} sport="cbb"/>{info?.rank?'#'+info.rank+' ':''}{info?.name||id}</span>;
}
function Shell(){
  const [page,setPage]=useState(current);
  const meta=useFile('index.json');
  useEffect(()=>{
    const onHash=()=>{const next=current();if(!pages.includes(next)){location.replace('/preview/cbb/');return;}setPage(next);window.scrollTo(0,0);};
    window.addEventListener('hashchange',onHash);return ()=>window.removeEventListener('hashchange',onHash);
  },[]);
  return <main className={'chart-lab cb '+({home:'model-record-preview',props:'prop-list',top:'top-looks',games:'model-record-preview',record:'model-record-preview'}[page]||'')}><NflToolHeader league="CBB" active={page}/>{meta.value&&page==='bracket'?<Bracket meta={meta.value} useFile={useFile}/>:meta.value&&page==='home'?<Home meta={meta.value}/>:meta.value?<League page={page} meta={meta.value}/>:<p role="status">{meta.error?'CBB snapshot unavailable.':'Loading college basketball…'}</p>}</main>;
}
function Home({meta}){
  const today=etDay(Date.now());
  const day=(meta.firstDay>=today?meta.firstDay:meta.days.find(d=>d>=today))||meta.days.at(-1);
  const slate=useFile(day+'.json'),record=useFile('record.json'),directory=useFile('team-directory.json').value;
  const ranks=directory?.ranks||{};
  const teams=Object.fromEntries(Object.entries(meta.teams).map(([id,t])=>[id,{...t,rank:ranks[id]}]));
  const saved=record.value?withTeams(record.value,teams):[];
  const published=saved.filter(r=>r.market==='Player prop'&&r.top&&etDay(r.time)===day).sort((a,b)=>(a.rank??99)-(b.rank??99));
  const looks=(published.length?published:pickLooks(slate.value||[])).slice(0,5);
  const live=useLiveCbb(day<=today?[day]:[],looks.filter(r=>!r.result).map(r=>r.game));
  if(!slate.value||!record.value)return <p role="status">{slate.error||record.error?'CBB home data is unavailable right now.':'Loading college basketball…'}</p>;
  const color=id=>'#'+(teams[id]?.color||'b69bd8');
  const label=id=>(ranks[id]?'#'+ranks[id]+' ':'')+school(teams[id]?.name||id);
  const games=slate.value;
  const graded=saved.map(live.row);
  const tally=(market,name)=>{
    const rows=graded.filter(r=>r.market===market);
    return {label:name,href:'#cbb-record',wins:rows.filter(r=>r.result==='Win').length,losses:rows.filter(r=>r.result==='Loss').length,pending:rows.filter(r=>!r.result).length};
  };
  const state=r=>r.result?(resultTone(r.result)):r.live?'live':Date.parse(r.time)<=Date.now()?'started':'pending';
  const lookRows=looks.map(live.row).map((r,i)=>{
    const value=r.actual??r.liveActual;
    return {id:r.game+r.pid,rank:r.rank||i+1,name:r.name,playerId:r.pid,photo:'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/'+r.pid+'.png',color:color(r.team),
      pick:pickText(r,teams),status:r.result||(r.live?'Live':Date.parse(r.time)<=Date.now()?'In progress':'Pending'),tone:state(r),
      final:value!=null?`${r.result?'Final':'Now'}: ${value} ${shortMarkets[r.metric]||''}`:'',
      chance:pct(r.prob),chanceStyle:rateStyle(r.prob),support:'model chance'};
  });
  const favorites=[...games].sort((a,b)=>Math.max(b.homeWin,1-b.homeWin)-Math.max(a.homeWin,1-a.homeWin)).slice(0,5).map((g,i)=>{
    const pick=g.homeWin>=.5?g.home:g.away,other=pick===g.home?g.away:g.home,score=live.scores.get(g.id);
    const won=score?.final?(score.home>score.away?g.home:g.away)===pick:null;
    return {id:g.id,rank:i+1,name:label(pick),logo:pick,sport:'cbb',color:color(pick),pick:(pick===g.home?'vs ':'at ')+label(other)+' · '+timeFmt.format(new Date(g.time)),
      status:won==null?(score?'Live':''):won?'Win':'Loss',tone:won==null?(score?'live':''):won?'hit':'miss',
      chance:pct(Math.max(g.homeWin,1-g.homeWin)),chanceStyle:rateStyle(Math.max(g.homeWin,1-g.homeWin)),support:'win chance'};
  });
  const featured=[...games].sort((a,b)=>Number(Boolean(ranks[b.home]||ranks[b.away]))-Number(Boolean(ranks[a.home]||ranks[a.away]))||a.time.localeCompare(b.time)).slice(0,12).map(g=>{
    const pick=g.homeWin>=.5?g.home:g.away,score=live.scores.get(g.id);
    const won=score?.final?(score.home>score.away?g.home:g.away)===pick:null,result=won==null?'':won?'Win':'Loss';
    return {id:g.id,color:color(pick),away:g.away,home:g.home,names:{[g.away]:label(g.away),[g.home]:label(g.home)},
      when:score?score.detail:timeFmt.format(new Date(g.time)),isLive:Boolean(score&&!score.final),scoreLabel:'Model',
      awayScore:Math.round(g.awayScore),homeScore:Math.round(g.homeScore),
      awayActual:score?score.away:null,homeActual:score?score.home:null,actualLabel:score?(score.final?'Final':'Live'):'',
      pickSide:pick,pickText:'Pick '+school(teams[pick]?.name)+' · '+pct(Math.max(g.homeWin,1-g.homeWin)),result,tone:resultTone(result)};
  });
  return <LeagueHome hero={{league:'CBB',photo:'/preview/assets/cbb-scene.svg',accent:'#f39bff',date:new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric'}).format(new Date(day+'T12:00Z')),
      lines:[games.length+(games.length===1?' game':' games'),published.length?published.length+' published picks':'']}}
    record={[tally('Player prop','Player props'),tally('Moneyline','Moneyline'),tally('Spread','Spread'),tally('Total','Over/under')].filter((t,i)=>i<2||t.wins+t.losses+t.pending>0)}
    sections={[{title:'Top looks',href:'#cbb-top',linkLabel:'See all',rows:lookRows},{title:'Biggest favorites',href:'#cbb-games',linkLabel:'All games',rows:favorites}]}
    games={{title:'Games',href:'#cbb-games',sport:'cbb',linkLabel:'All '+games.length+' games',rows:featured}}
    note="Picks lock at tip-off."/>;
}
function League({page,meta}){
  const today=etDay(Date.now());
  const [chosenDay,setDay]=useState('');
  const defaultDay=(meta.firstDay>=today?meta.firstDay:meta.days.find(d=>d>=today))||meta.days.at(-1);
  const day=meta.days.includes(chosenDay)||(page==='top'&&chosenDay)?chosenDay:defaultDay;
  const slate=useFile(meta.days.includes(day)?day+'.json':null),record=useFile(['top','record'].includes(page)?'record.json':null);
  const live=useLiveCbb(page==='games'&&day<=today?[day]:[]);
  const [selected,pickGame]=useState('');
  const [target,setTarget]=useState(null);
  const directory=useFile('team-directory.json').value;
  const [ranked,setRanked]=useState(false),[conference,setConference]=useState('');
  const ranks=directory?.ranks||{},conferences=directory?.conferences||{};
  const teams=Object.fromEntries(Object.entries(meta.teams).map(([id,t])=>[id,{...t,rank:ranks[id]}]));
  const match=id=>(!ranked||Boolean(ranks[id]))&&(!conference||conferences[id]===conference);
  const games=(slate.value||[]).filter(g=>match(g.home)||match(g.away));
  const playerGames=games.map(g=>({...g,roster:g.roster.filter(p=>match(p.team)),lines:[],priced:false}));
  const filteredPlayers=selected&&games.some(g=>g.id===selected)?playerGames.filter(g=>g.id===selected):playerGames;
  const game=games.find(g=>g.id===selected);
  function chart(g,p,k){pickGame(g.id);setTarget({id:p,metric:k});location.hash='cbb-charts';}
  const slateFilters=<div className={page==='top'?'cb-filter-grid cb-single':'cb-filter-grid cb-slate'}><Select label="Game date" value={day} onChange={d=>{setDay(d);pickGame('');setTarget(null);}}>{meta.days.map(d=><option key={d} value={d}>{labelDay(d)}</option>)}</Select>
      {['games','charts','props'].includes(page)&&<>
        <Select label="Team ranking" value={ranked?'ranked':'all'} disabled={!directory?.ranks} onChange={v=>{setRanked(v==='ranked');pickGame('');setTarget(null);}}>
          <option value="all">All teams</option><option value="ranked">AP Top 25</option>
        </Select>
        <Select label="Conference" value={conference} onChange={c=>{setConference(c);pickGame('');setTarget(null);}}><option value="">All conferences</option>{[...new Set(Object.values(conferences))].sort().map(c=><option key={c}>{c}</option>)}</Select>
      </>}
      {page!=='top'&&<Select label="Matchup · Eastern time" value={game?.id||''} onChange={id=>{pickGame(id);setTarget(null);}}><option value="">All games</option>{games.map(g=><option key={g.id} value={g.id}>{timeFmt.format(new Date(g.time))} · {ranks[g.away]?'#'+ranks[g.away]+' ':''}{teams[g.away].name} @ {ranks[g.home]?'#'+ranks[g.home]+' ':''}{teams[g.home].name}</option>)}</Select>}</div>;
  return <>
    {!['record','top'].includes(page)&&(page!=='charts'||!filteredPlayers.some(g=>g.roster.length))&&slateFilters}
    {page==='record'||page==='top'?record.value?(page==='record'?<CbbRecord rows={record.value} teams={teams}/>
      :<CbbTopLooks rows={withTeams(record.value,teams)} games={slate.value} teams={teams} days={meta.days} day={day} onDay={d=>{setDay(d);pickGame('');setTarget(null);}}
        onChart={r=>{const g=(slate.value||[]).find(x=>x.id===r.game);if(g)chart(g,r.pid,r.metric);}}/>):<p>{record.error?'Record unavailable.':'Loading picks…'}</p>:
      !slate.value?<p>{slate.error?'Slate unavailable.':'Loading slate…'}</p>:!games.length?<p>No matching games for {labelDay(day)}.</p>:
      page==='games'?game?<Detail game={{...game,roster:filteredPlayers[0].roster,priced:false,lines:[]}} meta={{...meta,teams}} live={live.scores.get(game.id)} back={()=>pickGame('')} chart={chart}/>:<div className="panel nfl-games"><div className="weekly-slate"><section><h3>{labelDay(day)}</h3>{games.map(g=><GameCard key={g.id} game={g} teams={teams} live={live.scores.get(g.id)} open={()=>pickGame(g.id)}/>)}</section></div></div>:
      page==='props'?<PropList games={filteredPlayers} teams={teams} chart={chart}/>:<Charts slateFilters={slateFilters} key={target?.id+':'+(target?.metric||'')+day} games={filteredPlayers} teams={teams} target={target}/>}
    <p className="cb-foot">Updated {dateFmt.format(new Date(meta.updated))}, {timeFmt.format(new Date(meta.updated))}</p>
  </>;
}
function GameCard({game:g,teams,live,open}){
  const win=g.homeWin>=.5?g.home:g.away;
  const leader=g.homeScore>=g.awayScore?g.home:g.away;
  const margin=Math.abs(g.homeScore-g.awayScore);
  const short=id=>(teams[id]?.rank?'#'+teams[id].rank+' ':'')+school(teams[id]?.name||id);
  const won=live?.final?(live.home>live.away?g.home:g.away)===win:null;
  return <button className="slate-fixture cb-fixture" onClick={open}>
    <span className="slate-pair"><b><span style={{'--club':'#'+(teams[g.away]?.color||'a775cf')}}><TeamLogo team={g.away} sport="cbb"/>{short(g.away)}</span> @ <span style={{'--club':'#'+(teams[g.home]?.color||'a775cf')}}><TeamLogo team={g.home} sport="cbb"/>{short(g.home)}</span></b><small>{timeFmt.format(new Date(g.time))} · {g.neutral?'Neutral court':'Home court'}</small></span>
    <span className="slate-score">
      {live&&<span className={'slate-live'+(live.final?' is-final':'')}><i>{live.final?'Final':'Live · '+live.detail}</i> {short(g.away)} {live.away}, {short(g.home)} {live.home}{won!=null&&<em className={'pick-row-result '+(won?'hit':'miss')}>{won?'Win':'Loss'}</em>}</span>}
      <span>Model score: {short(g.away)} {Math.round(g.awayScore)}, {short(g.home)} {Math.round(g.homeScore)}</span>
    </span>
    <span><small>Winner pick</small><b>{short(win)}</b><em>{pct(Math.max(g.homeWin,1-g.homeWin))} win chance</em></span>
    <span><small>Margin</small><b>{margin?short(leader)+' by '+margin.toFixed(1):'Even'}</b></span>
    <span><small>Total</small><b>{(g.homeScore+g.awayScore).toFixed(1)}</b></span>
    <span className="slate-chevron" aria-hidden="true">›</span>
  </button>;
}
function Detail({game:g,meta,live,back,chart}){
  const {teams}=meta;
  const [tab,set]=useState('Game picks');
  return <section className="panel nfl-games"><button className="slate-back" onClick={back}>← All games</button>
    <section className="match-score"><div className="match-score-caption"><h2>Projected final score</h2><span>{g.arena} · {g.neutral?'Neutral court':'Home court'} · {timeFmt.format(new Date(g.time))}</span></div>
      <div className="match-score-teams">{['away','home'].map(side=><div key={side} style={{'--club':'#'+teams[g[side]].color}}><TeamLogo team={g[side]} sport="cbb"/><span><small>{side}</small><b>{teams[g[side]].name}</b></span><strong>{g[side+'Score']}</strong>{live&&<em className={'cb-live-score'+(live.final?' is-final':'')}>{live[side]}</em>}</div>)}</div>{live&&<p className="cb-live-note">{live.final?'Final':'Live · '+live.detail} · model score in large print</p>}</section>
    <nav className="nfl-analysis-tabs" aria-label="Game analysis" role="tablist">{[['Game picks',Target],['Player props',ChartNoAxesCombined],['Matchup breakdown',Shield]].map(([t,Icon])=><button type="button" role="tab" aria-selected={t===tab} key={t} onClick={()=>set(t)}><Icon size={17}/>{t}</button>)}</nav>
    <div className="nfl-tab-panel" role="tabpanel">
  {tab==='Player props'?<PropList games={[g]} teams={teams} chart={chart}/>:tab==='Game picks'?<section className="nfl-view-panel"><div className="nfl-predictions-heading"><div><h3>Model picks</h3></div></div><div className="nfl-pick-grid">{(()=>{
    const win=g.homeWin>=.5?g.home:g.away,leader=g.homeScore>=g.awayScore?g.home:g.away,margin=Math.abs(g.homeScore-g.awayScore);
    const won=live?.final?(live.home>live.away?g.home:g.away)===win:null;
    return [['WINNER PICK',teams[win].name,pct(Math.max(g.homeWin,1-g.homeWin))+' win chance'+(won==null?'':won?' · Win':' · Loss')],
      ['PROJECTED MARGIN',margin?school(teams[leader].name)+' by '+margin.toFixed(1):'Even',g.neutral?'Neutral court':'Home court worth '+g.court+' points'],
      ['PROJECTED TOTAL',(g.homeScore+g.awayScore).toFixed(1),g.pace+' possessions'+(live?.final?' · final total '+(live.home+live.away):'')]]
      .map(([label,value,detail])=><article key={label} className="nfl-pick-tile"><small>{label}</small><b>{value}</b><span>{detail}</span></article>);})()}</div></section>:
  <section className="cb-panel lab-block"><h2>Matchup breakdown</h2><p>{g.pace} projected possessions · {g.court} points home-court adjustment</p><div className="cb-scroll"><table><thead><tr><th>Profile</th>{[g.away,g.home].map(t=><th key={t}><Team id={t} teams={teams}/></th>)}</tr></thead><tbody>{[['AdjO','adjO'],['AdjD','adjD'],['AdjT','adjT']].map(([label,k])=><tr key={k}><th>{label}</th>{[g.away,g.home].map(t=><td key={t}>{g.ratings[t][k]}</td>)}</tr>)}{['Effective FG','Turnover rate','Offensive rebound rate','FT attempts / FG attempts'].flatMap((label,i)=>['offense','defense'].map(k=><tr key={k+i}><th>{label} · {k==='offense'?'offense':'allowed'}</th>{[g.away,g.home].map(t=><td key={t}>{g.ratings[t][k][i]==null?'—':g.ratings[t][k][i]+'%'}</td>)}</tr>))}<tr><th>Days since last game</th>{[g.away,g.home].map(t=><td key={t}>{g.rest[t]??'—'}</td>)}</tr></tbody></table></div><h3>Availability</h3>{[g.away,g.home].map(t=>g.missingScoring?.[t]>0&&<p key={t}>{teams[t].name} · projected scoring reduced by {g.missingScoring[t]} points for reported absences.</p>)}{g.injuries.length?g.injuries.map((r,i)=><p key={i}>{r.name} · {r.status}</p>):<p>{meta.injuryFeed?'No players listed in the available report.':'Injury feed unavailable.'}</p>}</section>}</div></section>;
}
function rowsFor(games,metric){
  return games.flatMap(g=>g.priced?g.lines.filter(l=>metric==='ALL'||l.metric===metric).map(l=>({...l,g,book:true})):
    g.roster.flatMap(p=>(metric==='ALL'?Object.keys(markets):[metric]).map(k=>({pid:p.id,name:p.name,team:p.team,metric:k,proj:p.estimate[k],line:p.average[k],minutes:p.minutes,g}))));
}
function PropList({games,teams,chart}){
  const [market,setMarket]=useState('points'),[search,setSearch]=useState(''),[sort,setSort]=useState(['proj',-1]),[limit,setLimit]=useState(40);
  const rows=useMemo(()=>rowsFor(games,market).filter(r=>r.name.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>{
    const [k,dir]=sort;if(a[k]==null)return b[k]==null?0:1;if(b[k]==null)return -1;
    return dir*(typeof a[k]==='string'?a[k].localeCompare(b[k]):a[k]-b[k]);
  }),[games,market,search,sort]);
  const headers=[['name','Player'],['line','Line'],['proj','Model'],['minutes','Min']];
  return <section className="cb-prop-list"><div className="cb-filter-grid cb-pair"><Select label="Market" value={market} onChange={v=>{setMarket(v);setLimit(40);}}><option value="ALL">All markets</option>{Object.entries(markets).map(([k,v])=><option key={k} value={k}>{v}</option>)}</Select><label className="cb-select">Find player<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Player name"/></label></div><p className="prop-list-note">{rows.length} props</p><div className="prop-table-scroll cb-scroll"><table className="cb-props prop-research-table"><thead><tr>{headers.map(([k,v])=><th key={k} aria-sort={sort[0]===k?(sort[1]===1?'ascending':'descending'):'none'}><button className="column-sort" onClick={()=>setSort([k,sort[0]===k?-sort[1]:k==='name'?1:-1])}>{v} {sort[0]===k?(sort[1]>0?'↑':'↓'):'↕'}</button></th>)}</tr></thead><tbody>{rows.slice(0,limit).map((r,i)=><tr key={r.g.id+r.name+r.metric+i}><td style={{'--club':'#'+(teams[r.team]?.color||'aa77cc')}}><button className="cb-player" disabled={!r.pid} onClick={()=>chart(r.g,r.pid,r.metric)}><Headshot id={r.pid} team={r.team}/><span className="cb-player-copy"><b>{r.name}</b><small>{teams[r.team]?.name} · {markets[r.metric]}</small></span></button></td><td>{r.line}<small>{r.book?'DK · O '+money(r.over)+' / U '+money(r.under):'Player avg'}</small></td><td>{r.proj??'—'}</td><td>{r.minutes??'—'}</td></tr>)}</tbody></table></div>{!rows.length&&<p>No players match this selection.</p>}{rows.length>limit&&<button onClick={()=>setLimit(limit+40)}>Show more ({rows.length-limit})</button>}</section>;
}
function valueOf(g,k){if(k==='PRA')return g.points+g.rebounds+g.assists;if(k==='PR')return g.points+g.rebounds;if(k==='PA')return g.points+g.assists;if(k==='RA')return g.rebounds+g.assists;return g[k];}
function Charts({games,teams,target,slateFilters}){
  const [filters,setFilters]=useState(false),[expanded,setExpanded]=useState(false),[windowSize,setWindow]=useState('10');
  const [selectedLog,setSelectedLog]=useState('');
  const available=useMemo(()=>games.flatMap(g=>g.roster.filter(p=>!g.priced||g.lines.some(l=>l.pid===p.id)).map(p=>({p,g}))),[games]);
  const [id,select]=useState(target?.id||''),[k,setK]=useState(target?.metric||'points'),[venue,setV]=useState('All'),[line,setL]=useState(''),[side,setSide]=useState('over');
  const item=available.find(x=>x.p.id===id)||available[0],p=item?.p,g=item?.g;
  const hist=useFile(p?'teams/'+p.team+'.json':null);
  if(!p)return <p>No rotation history for this selection.</p>;
  const listed=g.lines.filter(l=>l.pid===p.id),keys=g.priced?[...new Set(listed.map(l=>l.metric))]:Object.keys(markets),metric=keys.includes(k)?k:keys[0];
  const book=listed.find(l=>l.metric===metric),base=book?.line??p.average[metric],point=line===''?base:Number(line);
  const history=(hist.value?.[p.id]||[]).filter(l=>venue==='All'||l.venue===venue);
  const logs=windowSize==='season'?history:history.slice(-Number(windowSize));
  const rows=logs.map(log=>{
    const value=valueOf(log,metric),outcome=value===point?'Push':(side==='over'?value>point:value<point)?'Hit':'Miss';
    const opponent=teams[log.opp]?.name||log.opp;
    return {log,id:log.game,opponent:log.opp,opponentLabel:(log.venue==='Away'?'@ ':'vs ')+opponent,date:log.date.slice(5),value,outcome,footer:outcome,description:log.date+' vs '+opponent+', '+value+' '+markets[metric]+', '+outcome};
  });
  const values=rows.map(r=>r.value).sort((a,b)=>a-b);
  const median=values.length?(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2:null;
  const hits=rows.filter(r=>r.outcome==='Hit').length,pushes=rows.filter(r=>r.outcome==='Push').length;
  const active=rows.find(r=>r.id===selectedLog),opp=p.team===g.home?g.away:g.home;
  const adj=p.adjustment[metric],pos=p.positionEffect[metric];
  return <div style={{'--club':'#'+teams[p.team].color}}>
    <div className="lab-controls primary-controls">
      <ChartSelect label="Player" value={p.id} onChange={v=>{select(v);setL('');setSelectedLog('');}}>{available.map(({p,g})=><option key={g.id+p.id} value={p.id}>{p.name} · {teams[p.team]?.name}</option>)}</ChartSelect>
      <ChartSelect label="Market" value={metric} onChange={v=>{setK(v);setL('');}}>{keys.map(k=><option key={k} value={k}>{markets[k]}</option>)}</ChartSelect>
    </div>
    <button className="filter-toggle chart-disclosure" aria-expanded={filters} aria-controls="cbb-chart-filters" onClick={()=>setFilters(!filters)}><ControlLabel>Filters</ControlLabel><span>{dateFmt.format(new Date(g.time))} · {venue} · {windowSize==='season'?'Full history':'Last '+windowSize}</span></button>
    <div className="extra-filters" id="cbb-chart-filters" data-open={filters}>{slateFilters}<div className="lab-controls secondary-controls">
      <ChartSelect label="Side" value={side} onChange={setSide}><option value="over">Over</option><option value="under">Under</option></ChartSelect>
      <ChartSelect label="Venue" value={venue} onChange={setV}>{venueOptions.map(v=><option key={v}>{v}</option>)}</ChartSelect>
      <ChartSelect label="Window" value={windowSize} onChange={setWindow}><option value="5">Last 5</option><option value="10">Last 10</option><option value="season">Full history</option></ChartSelect>
    </div></div>
    <LineControl key={p.id+metric} line={point} setLine={setL} resetLine={()=>setL('')} manual={line!==''} manualLabel="Research line" median={median} games={rows.map(r=>({stats:{[metric]:r.value}}))} metric={metric} direction={side}/>
    <section className="lab-player"><div className="player-identity"><Headshot id={p.id} team={p.team} large/><div><small>{teams[p.team].name} · {p.role}</small><h2>{p.name}</h2>
      <div className="player-prop"><strong>{side} {point}</strong><span>{markets[metric]}</span><small>{line!==''?'Research line':'Player average'}</small></div>
      <div className="player-next"><TeamLogo sport="cbb" team={opp}/><span><b>Next game</b> · {p.venue} vs {teams[opp].name}<br/>{dateFmt.format(new Date(g.time))} · {timeFmt.format(new Date(g.time))}</span></div></div></div>
      <div className="player-numbers"><div><small>Median</small><b>{median??'—'}</b></div><div><small>Hit rate</small><b style={values.length?rateStyle(hits/values.length):undefined}>{values.length?pct(hits/values.length):'—'}</b><small>{hits} hits · {rows.length-hits-pushes} misses · {pushes} pushes</small></div>
      <div><small>Model projection</small><b>{p.estimate[metric]}</b><small>Range {p.range?.[metric]?.join('–')}</small></div><div><small>Games shown</small><b>{rows.length}</b></div></div></section>
    <section className="lab-block"><h2>Game By Game</h2>{rows.length?<><GameBars rows={rows} label={markets[metric]} caption={rows.length+' games shown'} line={point} direction={side} sport="cbb" selected={selectedLog} onSelect={setSelectedLog} expanded={expanded} onExpand={()=>setExpanded(!expanded)}
      details={r=><><span className="bar-detail-item"><b>{r.log.min}</b><small>Minutes</small></span><span className="bar-detail-item"><b>{r.log.fga}</b><small>Field goal attempts</small></span></>}/>
      {active?<section className="bar-report game-report"><header className="game-report-header"><div className="game-report-title"><TeamLogo sport="cbb" team={active.opponent}/><div><small>Selected game · {active.log.date}</small><h3>{p.name}</h3><p>{active.opponentLabel}</p></div></div><button className="game-report-clear" onClick={()=>setSelectedLog('')}>Clear selection</button></header><dl className="game-report-stats">{[['Result',active.outcome],['Minutes',active.log.min],['Points',active.log.points],['Rebounds',active.log.rebounds],['Assists',active.log.assists],['Made threes',active.log.threes]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>:<p className="bar-hint">Select a game bar for player stats.</p>}</>:<p>{hist.error?'Game log unavailable.':hist.value?'No games in this venue split.':'Loading game log…'}</p>}</section>
    <section className="lab-block matchup-lab"><h2>Matchup research</h2><h3><Team id={opp} teams={teams}/> · Defense vs {p.role.toLowerCase()}</h3>{adj?<p>{adj[0]>0?'+':''}{adj[0]}% versus expected {markets[metric].toLowerCase()} across {adj[1]} prior player appearances in this role. {adj[1]>0&&<>Allowed {adj[2]} per appearance versus {adj[3]} expected. </>}{p.defenseRank?.[metric]&&<>Ranks {p.defenseRank[metric][0]} of {p.defenseRank[metric][1]} eligible defenses, most allowed relative to expectation first. </>}Position adjustment {pos[0]>0?'+':''}{pos[0]}% ({pos[1]} appearances).</p>:<p>Combination projections use the individual stat matchups.</p>}</section>
    <section className="lab-block"><h2>Production &amp; workload</h2><dl>{[['Projected minutes',p.minutes],['Recent minutes range',p.minuteRange?.join('–')],['Recent starts',p.starts],['Fouls per 40 minutes',p.foulRate]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>
    <section className="lab-block player-log"><h2>Game log</h2><div className="history-scroll log-table"><table><thead><tr>{['Date','Opponent','Minutes',markets[metric],'Result'].map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{rows.slice().reverse().map(r=><tr key={r.id}><td>{r.log.date}</td><td><TeamLogo sport="cbb" team={r.opponent}/>{r.opponentLabel}</td><td>{r.log.min}</td><td>{r.value}</td><td><span className="log-outcome" data-result={r.outcome}>{r.outcome}</span></td></tr>)}</tbody></table></div></section>
  </div>;
}
document.documentElement.dataset.theme='dark';
createRoot(document.getElementById('root')).render(<Shell/>);
