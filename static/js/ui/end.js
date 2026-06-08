// End screen: leaderboard display.
// Shows the GLOBAL top-10 for the level just played (per-level ranking from
// the backend / Postgres), falling back to local scores if offline.

async function renderLeaderboard() {
  const container = document.getElementById('leaderboard');
  if (!container) return;

  const level = (typeof S !== 'undefined' && S.level) ? S.level : null;
  const META = {
    popcorn: ['🍿', 'Akolita Popcornu'],
    kinoman: ['🎬', 'Samozwańczy Kinoman'],
    kineza:  ['🎞️', 'Orędownik Wielkiej Kinezy'],
  };
  const meta = META[level] || ['🏆', 'Wszystkie poziomy'];
  const head = (suffix) =>
    `<div class="lb-title">${meta[0]} Ranking — ${meta[1]}${suffix || ''}</div>`;

  container.innerHTML = `<div class="lb-wrap">${head()}<div class="lb-row">ładowanie…</div></div>`;

  // Global per-level ranking (Postgres). Fall back to local filtered by level.
  let rows = await getGlobalScores(level);
  let suffix = '';
  if (!rows || !rows.length) {
    rows = getScores().filter(s => !level || s.level === level);
    suffix = ' (lokalnie)';
  }
  rows = rows.sort((a, b) => b.score - a.score).slice(0, 10);

  if (!rows.length) {
    container.innerHTML = `<div class="lb-wrap">${head()}<div class="lb-row">Brak wyników — bądź pierwszy!</div></div>`;
    return;
  }

  const body = rows.map((s, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const date = s.ts ? new Date(s.ts).toLocaleDateString('pl-PL', {day:'numeric', month:'short'}) : '';
    return `<div class="lb-row">
      <span class="lb-pos">${medal}</span>
      <span class="lb-nick">${he(s.nick)}</span>
      <span class="lb-score">${s.score}</span>
      <span class="lb-date">${date}</span>
    </div>`;
  }).join('');

  container.innerHTML = `<div class="lb-wrap">${head(suffix)}${body}</div>`;
}
