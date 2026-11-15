import {breakEven} from './gamePicks.js';

const pct=n=>`${Math.round(n*100)}%`;
const surname=name=>name.split(' ').filter(part=>!/^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(part)).slice(-1)[0];
const price=n=>n>0?`+${n}`:String(n);

// One plain-English sentence explaining a Top Looks pick.
export function plainWhy(pick,marketLabel=''){
  const side=pick.side==='under'?'under':'over';
  const odds=pick.quote?.anytime?pick.quote.over:pick.quote?.[side];
  const needed=pick.quote?.isBookLine?breakEven(odds):null;
  const parts=[];
  if(pick.quote?.anytime){
    parts.push(`Model gives ${surname(pick.player.name)} a ${pct(pick.chance)} chance to score`);
    if(pick.touchdownModel){
      // Touchdown looks rank by chance to score, so describe the price without calling it an edge.
      let text=parts[0]+(needed!=null?`; DraftKings ${price(odds)} needs ${pct(needed)} to break even.`:'. No sportsbook price posted.');
      if(pick.absence?.missed)text+=` Back after missing ${pick.absence.missed} game${pick.absence.missed===1?'':'s'}, so his role may be limited.`;
      return text;
    }
  }else{
    const label=String(marketLabel).toLowerCase();
    if(Number.isFinite(pick.projection))parts.push(`Projects ${pick.projection.toFixed(1)} ${label} against a ${pick.line} line`);
    if(pick.history?.length)parts.push(`went ${side} in ${pick.hits} of ${pick.history.length} prior games`);
  }
  let text=parts.join(', ');
  if(needed!=null&&Number.isFinite(pick.chance)){
    const edge=pick.chance-needed;
    text+=edge>=.02?`; the model's ${pct(pick.chance)} beats the ${pct(needed)} the ${price(odds)} price needs.`
      :edge>-.02?`; at ${price(odds)} the price needs ${pct(needed)}, about what the model expects, so the value is thin.`
      :`; but the ${price(odds)} price needs ${pct(needed)}, more than the model's ${pct(pick.chance)}.`;
  }else text+='. No sportsbook price to compare against.';
  if(pick.absence?.missed)text+=` Back after missing ${pick.absence.missed} game${pick.absence.missed===1?'':'s'}, so his role may be limited.`;
  return text.charAt(0).toUpperCase()+text.slice(1);
}
