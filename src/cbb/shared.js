// Small helpers shared by the CBB pages.
export const markets={points:'Points',rebounds:'Rebounds',assists:'Assists',threes:'Made threes',turnovers:'Turnovers',steals:'Steals',blocks:'Blocks',PRA:'Points + rebounds + assists',PR:'Points + rebounds',PA:'Points + assists',RA:'Rebounds + assists'};
export const shortMarkets={points:'points',rebounds:'rebounds',assists:'assists',threes:'made threes',PRA:'pts + reb + ast',PR:'pts + reb',PA:'pts + ast',RA:'reb + ast',steals:'steals',blocks:'blocks',turnovers:'turnovers'};
export const eastern={timeZone:'America/New_York'};
export const etDay=t=>new Intl.DateTimeFormat('en-CA',{...eastern,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
export const timeFmt=new Intl.DateTimeFormat('en-US',{...eastern,hour:'numeric',minute:'2-digit'});
export const dayHeading=new Intl.DateTimeFormat('en-US',{...eastern,weekday:'long',month:'short',day:'numeric'});
export const dayLabel=d=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(d+'T12:00Z'));
export const pct=v=>v==null||!Number.isFinite(Number(v))?'—':Math.round(v*100)+'%';
export const money=v=>v==null?'—':(v>0?'+':'')+v;
export const headshot=id=>id?'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/'+id+'.png':'';

// Short school name for tight spaces: "Duke Blue Devils" -> "Duke".
const MASCOT_FIRST=/^(Golden|Red|Blue|Fighting|Crimson|Yellow|Great|Black|Scarlet|Mean|Demon|Horned|Nittany|Tar|Purple|Runnin'|Ragin'|Rainbow|Green|Big|Thundering|Delta|Wolf|Sun)$/;
export const school=(name='')=>{
  const words=String(name).split(' ');
  if(words.length<2)return name;
  words.pop();
  if(words.length>1&&MASCOT_FIRST.test(words.at(-1)))words.pop();
  return words.join(' ');
};
// "#5 Duke" with the AP rank when there is one.
export const shortTeam=(teams,id)=>{const t=teams[id];return t?(t.rank?'#'+t.rank+' ':'')+school(t.name):String(id||'');};
export const teamColor=(teams,id)=>teams[id]?.color?'#'+teams[id].color:'#a775cf';

// Result words to the shared hit/miss colors.
export const tone=r=>({Win:'hit',Loss:'miss',Push:'push',Void:'nostat'})[r]||'pending';
export const resultText=r=>r.result||(r.live?'Live':Date.parse(r.time)<=Date.now()?'In progress':'Pending');
export const rowState=r=>r.result?tone(r.result):r.live?'live':Date.parse(r.time)<=Date.now()?'started':'pending';

// Top Looks preview from a slate (same rule the daily save uses): best side per player, ranked by chance.
export function pickLooks(games,count=8){
  const best=new Map();
  for(const g of games)for(const p of g.roster||[])for(const [metric,q] of Object.entries(p.props||{}))for(const side of ['over','under']){
    const prob=q[side];
    if(!best.has(p.id)||prob>best.get(p.id).prob)best.set(p.id,{game:g.id,time:g.time,away:g.away,home:g.home,pid:p.id,name:p.name,label:p.name,team:p.team,metric,side,line:q.line,prob,projection:p.estimate?.[metric],market:'Player prop',top:true,preview:true});
  }
  const gap=r=>Math.abs((r.projection??r.line)-r.line)/Math.max(r.line,1);
  return [...best.values()].sort((a,b)=>b.prob-a.prob||gap(b)-gap(a)||a.name.localeCompare(b.name)).slice(0,count).map((r,i)=>({...r,rank:i+1}));
}

// "Duke to win", "Duke +4.5", "Under 152.5", "Over 14.5 points"
export function pickText(r,teams){
  if(r.market==='Player prop')return `${r.side==='under'?'Under':'Over'} ${r.line} ${shortMarkets[r.metric]||r.metric}`;
  if(r.market==='Total')return `${r.side==='under'?'Under':'Over'} ${r.line}`;
  const id=r.side==='away'?r.away:r.side==='home'?r.home:null,name=id?shortTeam(teams,id):school(r.label);
  if(r.market==='Moneyline')return name+' to win';
  return `${name} ${r.line>0?'+':''}${r.line}`;
}

// Older saved picks only carry the matchup text; fill in team ids from it.
export function withTeams(rows,teams){
  const byName=new Map(Object.entries(teams).map(([id,t])=>[t.name,id]));
  return rows.map(r=>{
    if(r.away&&r.home)return r;
    const [a,h]=String(r.matchup||'').split(' @ ');
    return {...r,away:r.away||byName.get(a),home:r.home||byName.get(h)};
  });
}
