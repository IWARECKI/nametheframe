// ── Karta Widza — Profile Panel logic ────────────────────────────────────────
// Depends on: getAudioCtx() from setup.js, getCsrfToken() from scores.js,
//             playErrorBuzz() from setup.js, DJANGO_USER from index.html

// ── 7.1 Auth gate ────────────────────────────────────────────────────────────
function onGoldenTicketClick() {
  if (typeof DJANGO_USER === 'undefined' || !DJANGO_USER.authenticated) {
    window.location.href = '/accounts/login/';
    return;
  }
  openProfilePanel();
}

// ── 7.2 Open / Close panel ───────────────────────────────────────────────────
async function openProfilePanel() {
  playTicketRevealSound();
  const panel = document.getElementById('profile-panel');
  const backdrop = document.getElementById('profile-backdrop');
  panel.classList.add('open');
  backdrop.classList.add('open');

  // Fetch stats
  try {
    const resp = await fetch('/api/profile/stats/');
    if (!resp.ok) return;
    const data = await resp.json();
    document.getElementById('profile-nick').textContent = data.nick || '—';
    document.getElementById('profile-games').textContent = data.games_played || 0;
    document.getElementById('profile-frames').textContent = data.frames_guessed || 0;

    // Handle cooldown
    const cooldownEl = document.getElementById('profile-cooldown');
    const nickBtn = document.getElementById('profile-nick-btn');
    const nickInput = document.getElementById('profile-nick-input');
    if (data.cooldown_remaining > 0) {
      cooldownEl.textContent = `Taśma zablokowana przez: ${data.cooldown_remaining} dni`;
      cooldownEl.classList.add('visible');
      nickBtn.disabled = true;
      nickInput.disabled = true;
    } else {
      cooldownEl.classList.remove('visible');
      nickBtn.disabled = false;
      nickInput.disabled = false;
      if (data.nick) nickInput.value = data.nick;
    }
  } catch(e) { /* network error — panel shows defaults */ }
}

function closeProfilePanel() {
  playPanelCloseSound();
  document.getElementById('profile-panel').classList.remove('open');
  document.getElementById('profile-backdrop').classList.remove('open');
  document.getElementById('profile-nick-error').textContent = '';
}

// ── 7.3 Nick change ──────────────────────────────────────────────────────────
async function submitNickChange() {
  const input = document.getElementById('profile-nick-input');
  const nick = input.value.trim();
  const btn = document.getElementById('profile-nick-btn');
  const errorEl = document.getElementById('profile-nick-error');

  // Check if locked (cooldown active)
  if (btn.disabled) {
    btn.classList.add('shake');
    playLockedSound();
    setTimeout(() => btn.classList.remove('shake'), 350);
    return;
  }

  if (!nick || nick.length > 22) {
    errorEl.textContent = 'Nick musi mieć 1-22 znaków';
    playErrorBuzz();
    return;
  }

  errorEl.textContent = '';
  btn.disabled = true;

  try {
    const resp = await fetch('/api/profile/nick/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      body: JSON.stringify({ nick }),
    });
    const data = await resp.json();

    if (resp.ok) {
      playNickChangeSuccess();
      document.getElementById('profile-nick').textContent = data.nick;
      // Update nick input on setup screen too
      const setupInput = document.getElementById('nick-input');
      if (setupInput) { setupInput.value = data.nick; }
      // Update auth status
      const statusEl = document.getElementById('auth-status');
      if (statusEl) statusEl.textContent = data.nick;
      btn.disabled = false;
    } else {
      errorEl.textContent = data.error || 'Błąd zmiany nicku';
      playErrorBuzz();
      btn.disabled = false;
    }
  } catch(e) {
    errorEl.textContent = 'Błąd sieci';
    playErrorBuzz();
    btn.disabled = false;
  }
}

// ── 7.4 Audio functions (reuse getAudioCtx from setup.js) ────────────────────
function playTicketRevealSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.22);
  } catch(e) {}
}

function playPanelCloseSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.14);
  } catch(e) {}
}

function playNickChangeSuccess() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.32);
  } catch(e) {}
}

function playLockedSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.setValueAtTime(100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
  } catch(e) {}
}
