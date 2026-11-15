// Fills the league screen with today's real numbers. Every line has a plain
// fallback already in the HTML, so a failed request simply leaves that in place.
(() => {
  const eastern = {timeZone: 'America/New_York'};
  const today = new Date().toLocaleDateString('en-CA', eastern);
  const set = (id, text) => { const node = document.getElementById(id); if (node && text) node.textContent = text; };
  const json = path => fetch(path, {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject());
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  set('lobby-date', new Intl.DateTimeFormat('en-US', {...eastern, weekday: 'long', month: 'long', day: 'numeric'}).format(new Date()));

  json('/data/model-record.json').then(rows => {
    const day = rows.filter(r => r.markets && new Date(Date.parse(r.kickoff)).toLocaleDateString('en-CA', eastern) === today);
    if (day.length) set('nfl-line', plural(day.length, 'game') + ' today');
  }).catch(() => {});

  json('/data/nfl-picks.json').then(rows => {
    const live = rows.filter(r => r.model === '2026.11.v2');
    const days = [...new Set(live.map(r => r.date))].sort();
    const day = days.find(d => d >= today) || days.at(-1);
    const picks = live.filter(r => r.date === day).sort((a, b) => a.kind.localeCompare(b.kind) || a.rank - b.rank);
    const graded = kind => {
      const done = live.filter(r => r.kind === kind);
      return `${done.filter(r => r.result === 'Hit').length}–${done.filter(r => r.result === 'Miss').length}`;
    };
    set('nfl-sub', `Model record: props ${graded('prop')}, touchdowns ${graded('touchdown')}`);
    if (!picks.length) return;
    const label = r => r.kind === 'touchdown' ? 'to score' : `${r.side === 'under' ? 'under' : 'over'} ${r.line} ${String(r.label || '').toLowerCase()}`;
    const track = document.getElementById('ticker-track');
    const items = () => picks.map(r => {
      const item = document.createElement('span');
      const name = document.createElement('b'); name.textContent = r.player;
      const chance = document.createElement('i'); chance.textContent = Math.round(r.modelHitRate * 100) + '%';
      item.append(name, ' ' + label(r) + ' ', chance);
      return item;
    });
    track.append(...items());
    // A second copy lets the strip loop without a visible seam.
    const copy = items(); copy.forEach(node => node.setAttribute('aria-hidden', 'true')); track.append(...copy);
    track.style.setProperty('--ticker-seconds', Math.max(30, picks.length * 4) + 's');
    document.getElementById('ticker').hidden = false;
  }).catch(() => {});

  json(`/data/cbb-v2/${today}.json`).then(games => {
    if (Array.isArray(games) && games.length) set('cbb-line', plural(games.length, 'game') + ' today');
  }).catch(() => {});
})();
