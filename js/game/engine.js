// Django equivalent: game/engine.py — core game state machine
// In Django this would be a GameSession model + a service layer:
//   class GameSession(models.Model):
//       nick = models.CharField(max_length=22)
//       genre = models.CharField(max_length=64)
//       level = models.CharField(max_length=16)
//       diff = models.CharField(max_length=16)
//       round = models.IntegerField(default=0)
//       score = models.IntegerField(default=0)
//
// S is the single source of truth for all game state.
// All UI modules read from S; only engine.js writes to it (except score updates in modes).

let S = {
  level:       null,   // 'popcorn' | 'kinoman' | 'kineza'
  nick:        '',
  genre:       '',
  diff:        'test', // 'test' | 'letter' | 'expert'
  round:       0,
  score:       0,
  used:        [],     // film IDs already shown this session
  cur:         null,   // current Film object
  revealedIdx: 0,      // index of the pre-revealed letter in hangman mode
  sessionStart: 0,     // timestamp when game started (ms)
  sessionMs:   0,      // total session duration (ms)
  history:     [],     // [{film, backdrop, guessed}] for summary grid
};

// Number of rounds per game session ("pół sekundy kina" = 12 klatek)
const ROUNDS_PER_GAME = 12;

// Tier weights per difficulty level.
// 't' field on each film: 'c' = classic, 'a' = ambitious, 'r' = arthouse
const TIER_WEIGHTS = {
  popcorn: { c: 0.80, a: 0.18, r: 0.02 },
  kinoman: { c: 0.50, a: 0.38, r: 0.12 },
  kineza:  { c: 0.20, a: 0.38, r: 0.42 },
};

// Weighted random pick from a pool of films using tier weights.
function pickWeighted(pool, level) {
  const w = TIER_WEIGHTS[level] || { c: 1/3, a: 1/3, r: 1/3 };
  // Assign a weight to each film, then do a weighted draw
  const weighted = pool.map(f => ({ f, weight: w[f.t] || 0.1 }));
  const total = weighted.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const { f, weight } of weighted) {
    r -= weight;
    if (r <= 0) return f;
  }
  return weighted[weighted.length - 1].f;
}

// Advance to the next round or end the game if limit reached.
// Django equivalent: a view that increments session state and redirects.
function nextRound() {
  smartTimer.reset();
  resetHeartState();
  if (S.round >= ROUNDS_PER_GAME) { endGame(); return; }
  const available = FILMS.filter(f => !S.used.includes(f.id) && !isPermaBroken(f.id));
  if (!available.length) { endGame(); return; }

  // Prefer films that actually have frames (admin-blocked films and TMDB
  // misses have an empty cache → would show BRAK KADRU). If the whole cache
  // is empty (e.g. preload failed offline), fall back to the raw pool.
  const withFrames = available.filter(f => (tmdbCache[f.id] || []).length > 0);
  const pool = withFrames.length ? withFrames : available;

  S.cur = pickWeighted(pool, S.level);
  S.used.push(S.cur.id);
  S.round++;

  // Update HUD
  document.getElementById('rnd').textContent  = S.round;
  document.getElementById('pts').textContent  = S.score;
  document.getElementById('prog').style.width = (S.round / ROUNDS_PER_GAME * 100) + '%';

  // Load backdrop
  const backdrop = getRandomBackdrop(S.cur.id);
  const img      = document.getElementById('bgimg');
  const loader   = document.getElementById('floader');
  img.style.opacity = '0';
  loader.style.display = 'flex';
  loader.style.opacity = '1';
  loader.textContent = 'ładowanie kadru…';
  if (backdrop) {
    img.src = backdrop;
    img.style.opacity = '1';
  } else {
    // No backdrop available — trigger error handling
    imgErr();
  }

  // Reset result area
  document.getElementById('rb').style.display  = 'none';
  document.getElementById('rb').className       = 'rbox';
  document.getElementById('fr').style.display  = 'none';
  document.getElementById('nb').style.display  = 'none';
  document.getElementById('hangman-area').innerHTML = '';

  renderQ();
}

// Transition to the end screen and persist the score.
// Django equivalent: a POST view that saves the Score model and redirects to /end/.
function endGame() {
  // Stop session timer
  S.sessionMs = Date.now() - S.sessionStart;

  const levelName = S.level === 'popcorn'
    ? 'Akolita Popcornu'
    : S.level === 'kinoman'
      ? 'Samozwańczy Kinoman'
      : 'Orędownik Wielkiej Kinezy';

  const maxPts = S.diff === 'test' ? ROUNDS_PER_GAME : S.diff === 'letter' ? ROUNDS_PER_GAME * 5 : ROUNDS_PER_GAME * 8;
  const pct    = Math.round(S.score / maxPts * 100);
  const verdict =
    pct >= 85 ? 'Nie ma co tu robić. Idź napisz recenzję.'
    : pct >= 65 ? 'Solidnie. Torba filmfestiwalowa zasłużona.'
    : pct >= 45 ? 'Obiecująco. Więcej Kieślowskiego, mniej Netflixa.'
    : pct >= 25 ? 'Popcorn był dobry?'
    : 'Tarkowski czeka. Zaczynaj od Stalkera.';

  const genreLabel = GENRE_LABELS[S.genre] || S.genre;

  // Format session time
  const secs = Math.round(S.sessionMs / 1000);
  const mins = Math.floor(secs / 60);
  const timeStr = mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;

  // Persist locally (localStorage)
  saveScore(S.nick, S.genre, S.level, S.score);

  // Render end screen
  document.getElementById('game').style.display = 'none';
  document.getElementById('end').style.display  = 'flex';
  document.getElementById('esc').textContent       = S.score;
  document.getElementById('emx').textContent       = `punktów · poziom: ${levelName} · ${timeStr}`;
  document.getElementById('enick-line').textContent = `${S.nick} · żywioł: ${genreLabel}`;
  document.getElementById('evd').textContent        = verdict;

  // Render summary grid (12 frames, 3×4)
  renderSummaryGrid();

  // XP system
  renderXPBar();

  // Render leaderboard
  renderLeaderboard();
}

// Render the 3×4 grid of frames from the session with staggered reveal animation
function renderSummaryGrid() {
  const container = document.getElementById('summary-grid');
  if (!container) return;
  container.innerHTML = '';

  S.history.forEach((entry, i) => {
    const cell = document.createElement('div');
    cell.className = 'sg-cell' + (entry.guessed ? ' sg-ok' : ' sg-miss');
    cell.style.animationDelay = (i * 100) + 'ms';

    const img = document.createElement('img');
    img.src = entry.backdrop || '';
    img.alt = entry.film ? entry.film.title : '';
    img.loading = 'lazy';

    const overlay = document.createElement('div');
    overlay.className = 'sg-overlay';
    overlay.innerHTML = `<span class="sg-icon">${entry.guessed ? '✓' : '✗'}</span>`;

    cell.appendChild(img);
    cell.appendChild(overlay);
    container.appendChild(cell);
  });
}

// XP reward table (non-linear)
const XP_TABLE = [0,1,2,3,4,5,6,8,10,12,14,18,24];
// Level thresholds: [xpNeeded, levelName]
const LEVELS = [
  [0, 'Akolita Popcornu'],
  [10, 'Kinoman Weekendowy'],
  [30, 'Kinoman Zaawansowany'],
  [60, 'Ekspert Kadru'],
  [100, 'Mistrz Ekranu'],
  [160, 'Or\u0119downik Wielkiej Kinezy'],
  [250, 'Legenda Srebrnego Ekranu'],
];

function getXP() {
  try { return parseInt(localStorage.getItem('ntf_xp') || '0', 10); } catch { return 0; }
}
function setXP(val) {
  try { localStorage.setItem('ntf_xp', String(val)); } catch {}
}
function getLevelInfo(xp) {
  let lvl = 1, name = LEVELS[0][1], nextXp = LEVELS[1] ? LEVELS[1][0] : 999, prevXp = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i][0]) {
      lvl = i + 1;
      name = LEVELS[i][1];
      prevXp = LEVELS[i][0];
      nextXp = LEVELS[i + 1] ? LEVELS[i + 1][0] : LEVELS[i][0] + 50;
      break;
    }
  }
  return { lvl, name, prevXp, nextXp };
}

function renderXPBar() {
  const correct = S.history.filter(e => e.guessed).length;
  const xpGained = XP_TABLE[correct] || 0;
  const prevXP = getXP();
  const newXP = prevXP + xpGained;
  setXP(newXP);

  const labelEl = document.getElementById('xp-label');
  const fillEl = document.getElementById('xp-bar-fill');
  const levelEl = document.getElementById('xp-level');
  if (!labelEl || !fillEl || !levelEl) return;

  const info = getLevelInfo(newXP);
  const range = info.nextXp - info.prevXp;
  const progress = range > 0 ? Math.min(1, (newXP - info.prevXp) / range) : 1;

  labelEl.textContent = `ZDOBYTE DO\u015AWIADCZENIE: +${xpGained} XP`;
  levelEl.textContent = `Level ${info.lvl} \u2014 ${info.name} (${newXP}/${info.nextXp} XP)`;

  // Animate from previous to new
  const prevInfo = getLevelInfo(prevXP);
  const prevProgress = range > 0 ? Math.min(1, (prevXP - info.prevXp) / range) : 0;
  fillEl.style.width = (Math.max(0, prevProgress) * 100) + '%';
  fillEl.style.transition = 'none';
  // Force reflow then animate
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fillEl.style.transition = 'width 1.5s ease-out';
      fillEl.style.width = (progress * 100) + '%';
    });
  });
}

// Reset state and return to setup screen.
// Django equivalent: session.flush() + redirect to /setup/.
function resetGame() {
  const prevNick = S.nick;  // remember nick for replay
  S = {...S, round: 0, score: 0, used: [], cur: null, sessionStart: 0, sessionMs: 0, history: []};
  S.nick = prevNick;  // keep nick across replays
  document.getElementById('end').style.display   = 'none';
  document.getElementById('setup').style.display = 'flex';
  document.getElementById('setup').classList.add('vis');
  document.getElementById('setup').style.opacity = '';

  // Reset implode animation and frame button
  const center = document.getElementById('setup-center');
  if (center) center.classList.remove('implode-ui');
  const frameBtn = document.querySelector('.cinematic-frame-button');
  if (frameBtn) frameBtn.style.display = '';

  // Reset the start button so it can be pressed again
  const btn = document.getElementById('start-btn');
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('firing', 'checking');
  }

  // Keep nick input filled from previous game
  const input = document.getElementById('nick-input');
  if (input && prevNick) {
    input.value = prevNick;
  }
}
