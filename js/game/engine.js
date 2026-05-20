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
};

// Number of rounds per game session
const ROUNDS_PER_GAME = 10;

// Advance to the next round or end the game if limit reached.
// Django equivalent: a view that increments session state and redirects.
function nextRound() {
  if (S.round >= ROUNDS_PER_GAME) { endGame(); return; }
  const available = FILMS.filter(f => !S.used.includes(f.id));
  if (!available.length) { endGame(); return; }

  S.cur = available[Math.floor(Math.random() * available.length)];
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
  if (backdrop) { img.src = backdrop; img.style.opacity = '1'; }

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

  // Persist locally (localStorage)
  saveScore(S.nick, S.genre, S.level, S.score);

  // Render end screen
  document.getElementById('game').style.display = 'none';
  document.getElementById('end').style.display  = 'flex';
  document.getElementById('esc').textContent       = S.score;
  document.getElementById('emx').textContent       = `punktów · poziom: ${levelName}`;
  document.getElementById('enick-line').textContent = `${S.nick} · żywioł: ${genreLabel}`;
  document.getElementById('evd').textContent        = verdict;
}

// Reset state and return to setup screen.
// Django equivalent: session.flush() + redirect to /setup/.
function resetGame() {
  S = {...S, round: 0, score: 0, used: [], cur: null};
  document.getElementById('end').style.display   = 'none';
  document.getElementById('setup').style.display = 'flex';
  document.getElementById('setup').classList.add('vis');
}
