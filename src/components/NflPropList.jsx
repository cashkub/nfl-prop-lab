import TeamLogo from './TeamLogo.jsx';
import NflToolHeader from './NflToolHeader.jsx';
import React,{useMemo,useState} from 'react';
import {availableStats} from '../lib/availableStats.js';
import {playerAverageLine,quotedPlayers,matchupBook,fairSideProbability,priceText} from '../lib/bookLine.js';
import {breakEven} from '../lib/gamePicks.js';
import {defenseTable} from '../lib/matchup.js';
import {getPlayerGames,formatRate,isHit,summarize,estimateModelHitRate} from '../lib/stats.js';
import {teamColor} from '../lib/teamColors.js';
import {nextGame} from '../lib/schedule.js';
import {TeamFilter,useChartSlate} from './ChartSlate.jsx';
import {dayKey,dayLabel} from '../lib/topLooksModel.js';
import {rateStyle,DefenseRank} from './HitRate.jsx';
import SortableTable from './SortableTable.jsx';
import PropPlayerFilter from './PropPlayerFilter.jsx';
import ChartSelect from './ChartSelect.jsx';
import PlayerPhoto from './PlayerPhoto.jsx';
import './NflPropList.css';

const MIN_EDGE_GAMES=4;

function LastFive({row,side}) {
  return <span className="last-five" aria-label="Last five games, oldest to newest">{row.lastFive.map(game=>{
    const value=game.stats[row.metric] ?? 0;
    const result=value===row.point?'Push':isHit(value,row.point,side)?'Hit':'Miss';
    const detail=`Week ${game.week} vs. ${game.opponent} · ${value} · ${result} (${side} ${row.point})`;
    return <span key={game.gameId} className="last-five-game" data-result={result} title={detail} aria-label={detail}>
      <i aria-hidden="true"/>{value}
    </span>;
  })}</span>;
}

export default function NflPropList({players,roster,schedule,season,books,markets,now,loading,error,onOpen}) {
  const future=useMemo(()=>schedule.filter(g=>Date.parse(g.kickoff)>now),[schedule,now]);
  const slate=useChartSlate(future,now);
  const [day,setDay]=useState('');
  const days=[...new Set(slate.games.map(g=>dayKey(g.kickoff)))].sort();
  const activeDay=days.includes(day)?day:'';
  const dayGames=activeDay?slate.games.filter(g=>dayKey(g.kickoff)===activeDay):slate.games;
  const [market,setMarket]=useState('ALL');
  const [side,setSide]=useState('over');
  const [venue,setVenue]=useState('ALL');
  const venueLabel=({ALL:'All Games',H:'Home Games',A:'Away Games'})[venue];
  const [source,setSource]=useState('ALL');
  const [search,setSearch]=useState('');
  const [playerId,setPlayerId]=useState('');
  const [minimum,setMinimum]=useState('0');
  const [sort,setSort]=useState(null);
  const [limit,setLimit]=useState(24);
  const rows=useMemo(()=>{
    const result=[],ranks=new Map();
    const games=slate.game?[slate.game]:dayGames;
    for(const fixture of games){
      const quotes=quotedPlayers(matchupBook(books,fixture),fixture,players);
      const entries=quotes.length ? quotes.map(({line,player,status})=>({
        player:player||{id:'book-'+line.player,name:line.player,team:'',position:'',games:[]},
        metric:line.metric,quote:line,status
      })) : roster.flatMap(player=>{
        if(!nextGame([fixture],player.team,season,now))return [];
        const history=getPlayerGames(player,season,'ALL',venue).filter(g=>Number(g.week)<Number(fixture.week)).slice(-10);
        return availableStats(markets,history).map(metric=>({player,metric,quote:null}));
      });
      for(const {player,metric,quote,status} of entries){
        if(!markets[metric] || (market!=='ALL'&&metric!==market) || (quote?.anytime&&side==='under'))continue;
        const game=nextGame([fixture],player.team,season,now)||fixture;
        const team=game.opponent===game.home?game.away:game.opponent===game.away?game.home:null;
        if(slate.team && slate.team!==team)continue;
        const recent=getPlayerGames(player,season,'ALL',venue).filter(g=>Number(g.week)<Number(game.week)).slice(-10);
        const average=playerAverageLine(recent,metric);
        if(!quote && average<=0)continue;
        const point=quote?.point??average;
        const key=player.position+'|'+metric;
        if(!ranks.has(key))ranks.set(key,defenseTable(players,season,player.position,metric,game.week));
        const table=ranks.get(key);
        const opponent=({LAR:'LA',WAS:'WSH',JAX:'JAC'})[game.opponent];
        const defense=table.find(d=>d.team===game.opponent)??table.find(d=>d.team===opponent);
        const modelEstimate=estimateModelHitRate(recent,metric,point,side,{marketProbability:fairSideProbability(quote,side,point),position:player.position});
        const price=quote?.anytime?quote.over:quote?.[side];
        const needed=Number(quote?.point)===Number(point)||quote?.anytime?breakEven(price):null;
        // The general prop model isn't calibrated for anytime TDs or tiny samples, so no edge there.
        const edge=needed!=null&&!quote?.anytime&&modelEstimate.sample>=MIN_EDGE_GAMES&&Number.isFinite(modelEstimate.rate)?modelEstimate.rate-needed:null;
        result.push({player,game,metric,point,quote,status,lastFive:recent.slice(-5),summary:summarize(recent,metric,point,side),modelEstimate,needed,edge,rank:defense?.rank,teams:table.length});
      }
    }
    // Sportsbook lines first, ranked by model edge over the price's break-even rate.
    // Without a price, use the model estimate, which already shrinks small samples
    // (a 1-for-1 player no longer outranks an 8-for-9 player).
    const model=r=>Number.isFinite(r.modelEstimate.rate)?r.modelEstimate.rate:-1;
    return result.sort((a,b)=>Number(!!b.quote)-Number(!!a.quote) || Number(b.edge!=null)-Number(a.edge!=null) ||
      (a.edge!=null?b.edge-a.edge:model(b)-model(a)) || b.summary.total-a.summary.total || a.player.name.localeCompare(b.player.name));
  },[players,roster,season,books,markets,now,slate.week,slate.game,slate.team,future,market,side,venue,activeDay]);
  const matches=rows.filter(r=>r.summary.total>=Number(minimum) && (source==='ALL' || (source==='book')===!!r.quote) && r.player.name.toLowerCase().includes(search.trim().toLowerCase()));
  const choices=[...new Map(matches.map(r=>[r.player.id,r.player])).values()].sort((a,b)=>a.name.localeCompare(b.name) || a.team.localeCompare(b.team));
  const activeId=choices.some(p=>p.id===playerId)?playerId:'';
  const filtered=activeId?matches.filter(r=>r.player.id===activeId):matches;
  const columns=[
    {label:'Player',value:r=>r.player.name,render:r=><button type="button" className="prop-chart-link"
      disabled={!r.player.games?.length} aria-label={'Open Charts for '+r.player.name+', '+side+' '+r.point+' '+markets[r.metric].label} onClick={()=>onOpen(r,side,venue)}>
      <PlayerPhoto id={r.player.id} name={r.player.name} url={r.player.photo}/><b>{r.player.name}{r.status?` · ${r.status}`:''}</b><span className="prop-charts-tag">Charts</span></button>},
    {label:'Prop',value:r=>(r.quote?.anytime?'Anytime TD':markets[r.metric].label)+' '+r.point,render:r=><span className="prop-cell"><strong className="prop-point">{r.quote?.anytime?'Yes':side} {r.quote?.anytime?'':r.point}</strong><small>{r.quote?.anytime?'Anytime TD':markets[r.metric].label}</small></span>},
    {label:'Model',value:r=>r.modelEstimate.rate,highFirst:true,render:r=><span className="model-rate-cell"><b style={rateStyle(r.modelEstimate.rate)}>{formatRate(r.modelEstimate.rate)}</b><small>{r.modelEstimate.sample} games</small></span>},
    {label:'Edge',value:r=>r.edge,highFirst:true,render:r=>r.edge==null?<span className="edge-cell muted" title={r.quote?.anytime?'Edge is not shown for anytime TDs':'Needs a matching DraftKings price and 4+ games'}>—</span>:<span className={`edge-cell ${r.edge>=.02?'pos':r.edge<=-.02?'neg':''}`}><b>{r.edge>0?'+':''}{(r.edge*100).toFixed(1)}</b><small>needs {formatRate(r.needed)}</small></span>},
    {label:'Hit Rate',value:r=>r.summary.rate,highFirst:true,render:r=><b style={rateStyle(r.summary.rate)}>{formatRate(r.summary.rate)}</b>},
    {label:'Last 5',value:r=>summarize(r.lastFive,r.metric,r.point,side).rate,highFirst:true,render:r=><LastFive row={r} side={side}/>},
    {label:'Hits',value:r=>r.summary.hits,highFirst:true,render:r=>r.summary.hits+'/'+r.summary.total},
    {label:'Odds',value:r=>r.quote?.[side]??null,highFirst:true,render:r=>priceText(r.quote?.[side])},
    {label:'Source',value:r=>r.quote?'DraftKings':'Player Average'},
    {label:'Team',value:r=>r.player.team,render:r=><><TeamLogo team={r.player.team}/>{r.player.team}</>},
    {label:'Opponent',value:r=>r.game.opponent,render:r=>(r.game.venue==='Away'?'@ ':'vs. ')+r.game.opponent},
    {label:'DEF Rank',value:r=>r.rank,highFirst:true,render:r=><DefenseRank rank={r.rank} total={r.teams} label={markets[r.metric].label} position={r.player.position+'s'} side={side}/>},
    {label:'Pos',value:r=>r.player.position},
  ];
  return <main className="chart-lab prop-list">
    <NflToolHeader active="props"/>
    {loading || error?<p>{error || 'Loading player props…'}</p>:<>
      <div className="prop-list-filters prop-primary">
        <ChartSelect label="Game week" value={slate.week} onChange={week=>{slate.changeWeek(week);setDay('')}}>{slate.weeks.map(w=><option key={w} value={w}>{w}</option>)}</ChartSelect>
        <ChartSelect label="Game day" value={activeDay} onChange={value=>{setDay(value);slate.changeMatch('')}}><option value="">All days</option>{days.map(d=><option key={d} value={d}>{dayLabel(d)}</option>)}</ChartSelect>
        <ChartSelect label="Matchup" value={slate.game?.id || ''} onChange={slate.changeMatch}><option value="">All matchups</option>{dayGames.map(g=><option key={g.id} value={g.id}>{g.away} at {g.home}</option>)}</ChartSelect>
        <PropPlayerFilter choices={choices} value={activeId} query={search}
          onQuery={text=>{setSearch(text);setPlayerId('')}}
          onSelect={id=>{setPlayerId(id);setSearch('')}}/>
      </div>
      <details className="prop-advanced">
        <summary className="chart-disclosure"><b>Filters</b><span>{activeDay?dayLabel(activeDay)+' · ':''}{slate.team || 'All Teams'} · {market==='ALL'?'All Markets':markets[market].label} · {venueLabel} · {side==='over'?'Over':'Under'}{source!=='ALL' && ' · '+(source==='book'?'DraftKings':'Player Average')}{minimum!=='0' && ' · '+minimum+'+ Games'}</span></summary>
        <div className="prop-list-filters">
        <TeamFilter slate={slate}/>
        <ChartSelect label="Game History" value={venue} onChange={setVenue}><option value="ALL">All Games</option><option value="H">Home Games</option><option value="A">Away Games</option></ChartSelect>
        <ChartSelect label="Market" value={market} onChange={setMarket}><option value="ALL">All Markets</option>{Object.entries(markets).map(([k,m])=><option key={k} value={k}>{m.label}</option>)}</ChartSelect>
        <ChartSelect label="Line Source" value={source} onChange={setSource}><option value="ALL">All Lines</option><option value="book">DraftKings</option><option value="average">Player Average</option></ChartSelect>
        <ChartSelect label="Minimum Games" value={minimum} onChange={setMinimum}>{[0,1,3,5,10].map(n=><option key={n} value={n}>{n}+</option>)}</ChartSelect>
        <ChartSelect label="Side" value={side} onChange={setSide}><option value="over">Over</option><option value="under">Under</option></ChartSelect>
      </div>
      </details>
      <p className="prop-list-note">{filtered.length} props · {sort ? 'sorted by '+columns[sort.column].label.toLowerCase()+(sort.asc?' (low to high)':' (high to low)') : 'DraftKings lines first, biggest model edge on top'}. Tap a header to sort, or a player to open their charts.</p>
      {filtered.length>0 && <div className="history-scroll prop-table-scroll" role="region" aria-label="Sortable NFL Prop List" tabIndex="0">
        <SortableTable quietSort className="prop-research-table" headers={columns.map(c=>c.label)} rows={filtered} limit={limit}
          values={r=>columns.map(c=>c.value(r))} sort={sort} onSort={setSort}
          descending={columns.flatMap((c,i)=>c.highFirst?[i]:[])}
          renderRow={r=><tr key={[r.game.id,r.player.id,r.metric,r.point,r.quote?.anytime].join(':')} style={{'--club':teamColor(r.player.team)??'#9073a8'}}>
            {columns.map(c=><td key={c.label}>{c.render?c.render(r):c.value(r)}</td>)}
          </tr>}/>
      </div>}
      {filtered.length>0 && <p className="prop-list-note">Edge = model chance minus the chance the DraftKings price needs to break even, in percentage points. Green means the model beats the price by 2+ points. Edge needs 4+ games and isn't shown for anytime TDs. Hit rates use up to 10 prior {venue==='H'?'home games':venue==='A'?'away games':'games'} this season. Last 5 runs oldest to newest · green = hit · red = miss · gold = push.</p>}
      {!filtered.length && <p>No upcoming props match these filters.</p>}
      {filtered.length>limit && <button className="prop-list-more" onClick={()=>setLimit(limit+24)}>Show More Props</button>}
    </>}
  </main>;
}
