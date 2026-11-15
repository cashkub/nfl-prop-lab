import {useEffect,useState} from 'react';
import {parseScoreboard} from '../lib/liveScores.js';

const URL='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
// Refreshes once a minute while the page is open and visible.
export function useLiveScores(){
  const [scores,setScores]=useState(()=>new Map());
  useEffect(()=>{
    let active=true;
    const load=()=>{
      if(document.hidden)return;
      fetch(URL).then(r=>r.ok?r.json():null).then(data=>{if(active&&data)setScores(parseScoreboard(data));}).catch(()=>{});
    };
    load();
    const timer=window.setInterval(load,60000);
    document.addEventListener('visibilitychange',load);
    return ()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',load);};
  },[]);
  return scores;
}
