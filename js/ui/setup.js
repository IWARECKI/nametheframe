// ── Setup screen — minimalist: nick + "Zapal projektor" ──────────────────────
// Default level is popcorn (hidden). No carousel, no genre select.

// ── Defaults (under the hood) ────────────────────────────────────────────────
S.level = 'popcorn';
S.diff  = 'test';
S.genre = 'casual';

// ── Web Audio: heavy clunk & error buzz ──────────────────────────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playClunk() {
  try {
    const ctx = getAudioCtx();
    // Low-frequency thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);

    // Metallic click overlay
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(2200, ctx.currentTime);
    click.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);
    clickGain.gain.setValueAtTime(0.15, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(ctx.currentTime);
    click.stop(ctx.currentTime + 0.08);
  } catch(e) { /* audio not available */ }
}

function playErrorBuzz() {
  try {
    const ctx = getAudioCtx();
    // Short static/crackle noise
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Snap: short square wave
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(120, ctx.currentTime);
    snapGain.gain.setValueAtTime(0.3, ctx.currentTime);
    snapGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    snap.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(ctx.currentTime);
    snap.stop(ctx.currentTime + 0.07);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(ctx.currentTime);
  } catch(e) { /* audio not available */ }
}

// ── Nick error animation (neon flash) ────────────────────────────────────────
function showNickError(msg) {
  const input = document.getElementById('nick-input');
  const errorEl = document.getElementById('nick-error');

  // Flash input 3 times
  input.classList.add('neon-error-flash');
  setTimeout(() => input.classList.remove('neon-error-flash'), 350);

  // Show error text with burnt-bulb effect
  errorEl.textContent = msg;
  errorEl.classList.add('visible', 'burnt-flash');
  setTimeout(() => errorEl.classList.remove('burnt-flash'), 400);

  playErrorBuzz();
}

function clearNickError() {
  const errorEl = document.getElementById('nick-error');
  errorEl.classList.remove('visible', 'burnt-flash');
  errorEl.textContent = '';
}

// ── Nick check against backend ───────────────────────────────────────────────
async function checkNickAvailability(nick) {
  try {
    const resp = await fetch(`/api/nick-check/?nick=${encodeURIComponent(nick)}`);
    if (!resp.ok) return true; // fail open on server error
    const data = await resp.json();
    return data.available;
  } catch(e) {
    return true; // fail open on network error
  }
}

// ── Auth state ───────────────────────────────────────────────────────────────
let _authNick = null;

function initAuthBar() {
  // Django template already sets input value + disabled for authenticated users with a nick.
  // Check DJANGO_USER (injected by template) or fall back to /api/me/.
  if (typeof DJANGO_USER !== 'undefined' && DJANGO_USER.authenticated && DJANGO_USER.nick) {
    // Only lock nick if the user actually has a first_name set (not email fallback)
    const isEmailFallback = DJANGO_USER.nick && DJANGO_USER.nick.includes('@');
    if (!isEmailFallback) {
      _authNick = DJANGO_USER.nick;
      const input = document.getElementById('nick-input');
      input.value = _authNick;
      input.disabled = true;
      input.classList.add('nick-input--authed');
      const statusEl = document.getElementById('auth-status');
      if (statusEl) statusEl.textContent = _authNick;
    }
  } else {
    // Fallback for static hosting (no Django)
    fetch('/api/me/').then(r => r.ok ? r.json() : null).then(data => {
      if (data && data.authenticated && data.nick) {
        const isEmailFallback = data.nick && data.nick.includes('@');
        if (!isEmailFallback) {
          _authNick = data.nick;
          const input = document.getElementById('nick-input');
          input.value = _authNick;
          input.disabled = true;
          input.classList.add('nick-input--authed');
          const statusEl = document.getElementById('auth-status');
          if (statusEl) statusEl.textContent = _authNick;
        }
      }
    }).catch(() => {});
  }
}

// ── Start game ───────────────────────────────────────────────────────────────
async function startGame() {
  const input = document.getElementById('nick-input');
  const nick = input.value.trim();
  const btn = document.getElementById('start-btn');

  // Validate nick presence
  if (!nick) {
    showNickError('Podaj pseudonim, wędrowcze');
    return;
  }

  // Play clunk immediately on press for tactile feel
  playClunk();

  // Disable button during check (if button exists)
  if (btn) {
    btn.disabled = true;
    btn.classList.add('checking');
  }

  // Check nick availability (skip for authed users)
  if (!_authNick) {
    const available = await checkNickAvailability(nick);
    if (!available) {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('checking');
      }
      showNickError('Ten pseudonim jest już na taśmie');
      return;
    }
  }

  clearNickError();

  S.nick  = nick;
  // genre stays 'casual' — no select needed

  const flash = document.getElementById('screen-flash');

  // Phase 1: button fires (lamp explosion) — skip if btn doesn't exist
  if (btn) btn.classList.add('firing');

  // Phase 2: full-screen flash at peak of button animation (~450ms)
  setTimeout(() => {
    if (flash) flash.classList.add('bright');
    setTimeout(() => {
      if (flash) { flash.classList.remove('bright'); flash.classList.add('dim'); }
      setTimeout(() => { if (flash) flash.classList.remove('dim'); }, 600);
    }, 220);
  }, 420);

  // Phase 3: load films from API, preload first batch of backdrops, then reveal game
  await loadFilmsFromAPI();
  await Promise.all([
    preloadAllFilms(),
    new Promise(r => setTimeout(r, 400)),  // minimum for flash animation
  ]);

  S.round = 0;
  S.score = 0;
  S.used  = [];
  S.history = [];
  S.sessionStart = Date.now();

  document.getElementById('mrnd').textContent  = ROUNDS_PER_GAME;
  document.getElementById('hnick').textContent = S.nick;
  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display  = 'flex';

  nextRound();
}

// ── Setup dust particles ─────────────────────────────────────────────────────
function spawnSetupDust() {
  const container = document.getElementById('setup-dust');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 140; i++) {
    const d = document.createElement('div');
    d.className = 'setup-dust-dot';
    const size = Math.random() < 0.65
      ? (0.9 + Math.random() * 1.4)
      : (2.3 + Math.random() * 1.8);
    d.style.width  = size + 'px';
    d.style.height = size + 'px';
    d.style.left   = (Math.random() * 100) + '%';
    d.style.top    = (10 + Math.random() * 85) + '%';
    d.style.animationDuration = (6 + Math.random() * 12) + 's';
    d.style.animationDelay   = (Math.random() * 10) + 's';
    if (Math.random() < 0.3) d.style.background = 'rgba(240,235,226,.7)';
    container.appendChild(d);
  }
}

// ── Scores panel (kept from original) ────────────────────────────────────────
let _scoreTab = 'popcorn';

function toggleScores() {
  const panel = document.getElementById('scores-panel');
  if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
  panel.classList.add('open');
  renderScorePanel(_scoreTab);
}

async function renderScorePanel(level) {
  _scoreTab = level;
  const panel = document.getElementById('scores-panel');
  const TABS = [['popcorn', '🍿 Popcorn'], ['kinoman', '🎬 Kinoman'], ['kineza', '🎞️ Kineza']];
  const tabs = TABS.map(([l, label]) =>
    `<button class="sp-tab${l === level ? ' active' : ''}" onclick="renderScorePanel('${l}')">${label}</button>`
  ).join('');
  panel.innerHTML = `<div class="sp-title">Rankingi globalne</div><div class="sp-tabs">${tabs}</div><div id="sp-body">ładowanie…</div>`;

  const body = document.getElementById('sp-body');
  let rows = await getGlobalScores(level);
  if (!rows || !rows.length) {
    body.innerHTML = '<div class="sp-empty">Brak wyników — zagraj pierwszą grę!</div>';
    return;
  }
  rows = rows.sort((a, b) => b.score - a.score).slice(0, 50);
  body.innerHTML = rows.map((s, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
    const date = s.ts ? new Date(s.ts).toLocaleDateString('pl-PL', {day:'numeric', month:'short'}) : '';
    return `<div class="sp-row"><span class="sp-pos">${medal}</span><span class="sp-nick">${he(s.nick)}</span><span class="sp-score">${s.score}</span><span class="sp-date">${date}</span></div>`;
  }).join('');
}

// ── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  spawnSetupDust();
  initAuthBar();
  // Clear error on typing
  document.getElementById('nick-input').addEventListener('input', clearNickError);
});
