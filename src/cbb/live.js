import {useEffect,useMemo,useRef,useState} from 'react';
import {BASE,parseCbbScoreboard,parseCbbBox,liveRow} from './liveLib.js';

const espnDay=day=>String(day).replaceAll('-','');
// Scoreboards for the given days (refreshed each minute while visible) and box
// scores for the listed games once they tip off.
export function useLiveCbb(days=[],boxGames=[]){
  const [scores,setScores]=useState(()=>new Map());
  const [boxes,setBoxes]=useState(()=>new Map());
  const finished=useRef(new Set());
  const dayKey=[...new Set(days.filter(Boolean))].sort().join(',');
  const boxKey=[...new Set(boxGames.map(String))].sort().join(',');
  useEffect(()=>{
    if(!dayKey)return;
    let active=true;const done=new Map();
    const load=()=>{
      if(document.hidden)return;
      for(const day of dayKey.split(',')){
        if(done.get(day))continue;
        fetch(BASE+'scoreboard?groups=50&limit=400&dates='+espnDay(day)).then(r=>r.ok?r.json():null).then(data=>{
          if(!active||!data)return;
          const parsed=parseCbbScoreboard(data);
          // A past day whose games are all final will not change again.
          if(parsed.size&&[...parsed.values()].every(g=>g.final)&&(data.events||[]).every(e=>e.competitions?.[0]?.status?.type?.state==='post'))done.set(day,true);
          setScores(previous=>{const next=new Map(previous);parsed.forEach((v,k)=>next.set(k,v));return next;});
        }).catch(()=>{});
      }
    };
    load();
    const timer=window.setInterval(load,60000);
    document.addEventListener('visibilitychange',load);
    return ()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',load);};
  },[dayKey]);
  useEffect(()=>{
    let active=true;
    for(const id of boxKey?boxKey.split(','):[]){
      const game=scores.get(id);
      if(!game||finished.current.has(id))continue;
      if(game.final)finished.current.add(id);
      fetch(BASE+'summary?event='+id).then(r=>r.ok?r.json():null).then(data=>{
        if(active&&data)setBoxes(previous=>new Map(previous).set(id,parseCbbBox(data)));
        else if(!data)finished.current.delete(id);
      }).catch(()=>finished.current.delete(id));
    }
    return ()=>{active=false;};
  },[scores,boxKey]);
  return useMemo(()=>({scores,boxes,row:r=>liveRow(r,scores,boxes)}),[scores,boxes]);
}
