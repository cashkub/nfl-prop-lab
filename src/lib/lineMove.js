// Did the sportsbook line move toward a pick after we first published it?
// "with" means the later (closing) number was worse for a new bettor, so the
// original number beat the market. Uses only the snapshots we already pull.
const breakEven=price=>Number.isFinite(price)&&price!==0?(price<0?Math.abs(price)/(Math.abs(price)+100):100/(price+100)):null;

export function lineMove(row){
  if(!row||row.openLine==null||row.line==null)return null;
  const open=Number(row.openLine),close=Number(row.line);
  const over=row.kind==='touchdown'||String(row.side).toLowerCase()!=='under';
  if(open!==close){
    const better=over?close>open:close<open;
    return {direction:better?'with':'against',kind:'line',from:open,to:close};
  }
  const before=breakEven(Number(row.openPrice)),after=breakEven(Number(row.price));
  if(before==null||after==null)return null;
  if(Math.abs(after-before)<.005)return {direction:'none',kind:'price',from:row.openPrice,to:row.price};
  return {direction:after>before?'with':'against',kind:'price',from:row.openPrice,to:row.price};
}

export function lineMoveSummary(rows){
  const moves=rows.map(lineMove).filter(m=>m&&m.direction!=='none');
  return {with:moves.filter(m=>m.direction==='with').length,total:moves.length};
}
