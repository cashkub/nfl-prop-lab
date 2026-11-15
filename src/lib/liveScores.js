// Live and final scores from ESPN's public scoreboard (free, no key, no odds).
// It is an unofficial feed, so every caller must work when it returns nothing.
const ALIASES={LA:'LAR',WSH:'WAS',JAC:'JAX'};
export const scoreTeam=code=>ALIASES[code]||code;
export const scoreKey=(away,home)=>scoreTeam(away)+'@'+scoreTeam(home);

export function parseScoreboard(payload){
  const scores=new Map();
  for(const event of payload?.events||[]){
    const game=event.competitions?.[0],state=game?.status?.type?.state;
    const home=game?.competitors?.find(t=>t.homeAway==='home'),away=game?.competitors?.find(t=>t.homeAway==='away');
    if(!home||!away||!['in','post'].includes(state))continue;
    const points=[Number(away.score),Number(home.score)];
    if(!points.every(Number.isFinite))continue;
    scores.set(scoreKey(away.team?.abbreviation,home.team?.abbreviation),
      {away:points[0],home:points[1],final:state==='post',detail:state==='post'?'Final':game.status.type.shortDetail||'Live'});
  }
  return scores;
}
