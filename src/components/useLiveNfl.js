import {useEffect,useMemo,useRef,useState} from 'react';
import {useLiveScores} from './useLiveScores.js';
import {parseBox,livePick,liveGame} from '../lib/liveBox.js';

const SUMMARY='https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=';
// Live scores plus player box scores. In-progress games refresh with the
// scoreboard (once a minute); finished games are fetched once.
export function useLiveNfl(){
  const scores=useLiveScores();
  const [boxes,setBoxes]=useState(()=>new Map());
  const finished=useRef(new Set());
  useEffect(()=>{
    let active=true;
    for(const game of scores.values()){
      if(!game.id||finished.current.has(game.id))continue;
      if(game.final)finished.current.add(game.id);
      fetch(SUMMARY+game.id).then(r=>r.ok?r.json():null).then(data=>{
        if(active&&data)setBoxes(previous=>new Map(previous).set(game.id,parseBox(data)));
        else if(!data)finished.current.delete(game.id);
      }).catch(()=>finished.current.delete(game.id));
    }
    return ()=>{active=false;};
  },[scores]);
  return useMemo(()=>({scores,boxes,pick:row=>livePick(row,scores,boxes),game:row=>liveGame(row,scores)}),[scores,boxes]);
}
