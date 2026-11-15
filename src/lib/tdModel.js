import weights from './tdWeights.js';

// Anytime-touchdown chance from recent workload, red-zone touches and snap share.
// Weights come from scripts/train_td_model.py; keep the feature list in sync with it.
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;

export function touchdownFeatures(history,position){
  const opp=history.map(g=>Number(g.usage?.opportunities)||0);
  const snaps=history.map(g=>Number(g.usage?.offenseSnapRate)||0);
  const redZone=history.map(g=>g.scoringChances).filter(row=>Array.isArray(row)&&row.length>=5);
  const tds=history.map(g=>Number(g.stats?.scoredTDs)||0);
  return {
    oppAvg:mean(opp),oppLast3:mean(opp.slice(-3)),snapLast3:mean(snaps.slice(-3)),
    ...Object.fromEntries([0,1,2,3,4].map(i=>['rz'+i,mean(redZone.map(row=>Number(row[i])||0))])),
    tdAvg:mean(tds),tdGameRate:(tds.filter(n=>n>0).length+1)/(tds.length+5),
    isRB:Number(['RB','FB'].includes(position)),isTE:Number(position==='TE'),isQB:Number(position==='QB'),noRedZoneData:Number(!redZone.length)
  };
}

export const touchdownModelPositions=['QB','RB','FB','WR','TE'];

// Returns null when the model does not cover the player (under 3 games, other positions).
export function touchdownChance(history,position){
  const games=(history||[]).slice(-10);
  if(games.length<3||!touchdownModelPositions.includes(position))return null;
  const features=touchdownFeatures(games,position);
  const z=weights.features.reduce((sum,name,i)=>sum+weights.coefficients[i]*features[name],weights.intercept);
  return 1/(1+Math.exp(-z));
}
