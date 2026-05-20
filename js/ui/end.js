// End screen: leaderboard display
// Renders top 10 local scores after each game.

function renderLeaderboard() {
  const container = document.getElementById('leaderboard');
  if (!container) return;

  const scores = getScores();
  if (!scores.length) {
    container.innerHTML = '';
    return;
  }

  // Sort by score descending, take top 10
  const top = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const rows = top.map((s, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const lvl = s.level === 'popcorn' ? '🍿' : s.level === 'kinoman' ? '🎬' : '🎞️';
    const date = new Date(s.ts).toLocaleDateString('pl-PL', {day:'numeric', month:'short'});
    return `<div class="lb-row">
      <span class="lb-pos">${medal}</span>
      <span class="lb-nick">${s.nick}</span>
      <span class="lb-lvl">${lvl}</span>
      <span class="lb-score">${s.score}</span>
      <span class="lb-date">${date}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="lb-wrap">
      <div class="lb-title">Tabela wyników</div>
      ${rows}
    </div>`;
}
