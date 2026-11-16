import {blendWithMarket} from './stats.js';
// Chance a price needs to win to break even (includes the sportsbook's cut).
export const breakEven=price=>Number.isFinite(price)&&price!==0?(price<0?Math.abs(price)/(Math.abs(price)+100):100/(price+100)):null;
// Smallest model-minus-break-even gap treated as a moneyline edge.
export const MONEYLINE_EDGE=.02;

export function moneylineEdge(game,elo){
  const sides=[[game.home,elo?.homeProbability,game.homePrice],[game.away,elo?.awayProbability,game.awayPrice]]
    .filter(([,probability,price])=>Number.isFinite(probability)&&breakEven(price)!=null)
    .map(([team,probability,price])=>({team,probability,price,breakEven:breakEven(price),edge:probability-breakEven(price)}))
    .sort((a,b)=>b.edge-a.edge);
  return {best:sides[0]||null,value:sides[0]?.edge>=MONEYLINE_EDGE?sides[0]:null,priced:sides.length>0};
}

export const ELO_WEIGHT=0;
// How strongly the model leans against a spread or total, from its gap to the line in points.
export const leanLabel=points=>points==null?'':Math.abs(points)>=2?'Strong lean':Math.abs(points)>=1?'Lean':'Slight lean';

export function gamePicks(game,model){
  const away=model?.a,home=model?.h;
  const margin=away&&home?home.score-away.score:null;
  const elo=game.context?.elo;
  const projectedTotal=away&&home?away.score+home.score:null;
  // Win chance starts from the moneyline's no-vig chance. Over 3,951 games (2012-2026) the Elo
  // rating did not improve on that line at any weight, so ELO_WEIGHT is 0 and Elo is only used
  // when no moneyline is posted. Raise the weight only if a new backtest supports it.
  const needHome=breakEven(game.homePrice),needAway=breakEven(game.awayPrice);
  const lineHome=needHome!=null&&needAway!=null?needHome/(needHome+needAway):null;
  const eloHome=elo?.homeProbability,eloAway=elo?.awayProbability;
  const fromLine=lineHome!=null;
  const homeProbability=fromLine?(Number.isFinite(eloHome)?blendWithMarket(eloHome,lineHome,ELO_WEIGHT):lineHome):eloHome;
  const awayProbability=fromLine?1-homeProbability:eloAway;
  const hasWinnerForecast=Number.isFinite(homeProbability)&&Number.isFinite(awayProbability);
  const winner=hasWinnerForecast&&Math.abs(homeProbability-awayProbability)>.0001
    ?(homeProbability>awayProbability?{team:game.home,probability:homeProbability,elo:eloHome,fromLine}:{team:game.away,probability:awayProbability,elo:eloAway,fromLine})
    :null;
  const spreadEdge=Number.isFinite(margin)&&Number.isFinite(game.homeSpread)?margin+game.homeSpread:null;
  const spreadTeam=spreadEdge==null||Math.abs(spreadEdge)<.05?null:spreadEdge>0?game.home:game.away;
  const spreadLine=spreadTeam===game.home?game.homeSpread:-game.homeSpread;
  const totalSide=Number.isFinite(projectedTotal)&&Number.isFinite(game.totalLine)
    ?projectedTotal-game.totalLine>.05?'OVER':game.totalLine-projectedTotal>.05?'UNDER':'NO CLEAR SIDE'
    :null;
  const moneyline=moneylineEdge(game,hasWinnerForecast?{homeProbability,awayProbability}:elo);
  // Size of the model's disagreement with the line, in points.
  const totalEdge=Number.isFinite(projectedTotal)&&Number.isFinite(game.totalLine)?projectedTotal-game.totalLine:null;
  if(winner){
    const price=winner.team===game.home?game.homePrice:game.awayPrice;
    winner.price=price;winner.breakEven=breakEven(price);
  }
  return {elo,margin,projectedTotal,winner,hasWinnerForecast,spreadTeam,spreadLine,spreadEdge,totalSide,totalEdge,moneyline};
}

export const gameMarkets={moneyline:'Moneyline',total:'Over/Under',spread:'Spread'};

export function marketSnapshot(game,model){
  const {winner,spreadTeam,spreadLine,totalSide}=gamePicks(game,model);
  const markets={};
  // The moneyline pick is always the model's predicted winner; edge records whether
  // the model's win chance also beats the price's break-even rate.
  if(winner)markets.moneyline={side:winner.team,probability:winner.probability,price:winner.price,
    ...(winner.breakEven!=null?{edge:winner.probability-winner.breakEven}:{})};
  if(spreadTeam)markets.spread={side:spreadTeam,line:spreadLine,price:spreadTeam===game.home?game.homeSpreadPrice:game.awaySpreadPrice};
  if(totalSide==='OVER'||totalSide==='UNDER')markets.total={side:totalSide,line:game.totalLine,price:totalSide==='OVER'?game.overPrice:game.underPrice};
  return markets;
}

export function gameResult(row,market){
  const pick=row.markets?.[market];
  if(!pick)return 'No pick';
  if(row.final?.length!==2||!row.final.every(Number.isFinite))return 'Pending';
  const [away,home]=row.final;
  const margin=pick.side===row.home?home-away:away-home;
  const difference=market==='moneyline'?margin:market==='spread'?margin+pick.line:
    (home+away-pick.line)*(pick.side==='OVER'?1:-1);
  return difference===0?'Push':difference>0?'Win':'Loss';
}
