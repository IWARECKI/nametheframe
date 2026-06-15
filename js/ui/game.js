// Django equivalent: views/game.py â€” handles game round interactions
// In Django each answer submission would be a POST request:
//   class AnswerView(LoginRequiredMixin, View):
//       def post(self, request): ...  # validate answer, update score, return JSON

// Called by the <img> onload event when a backdrop finishes loading.
function imgOK() {
  const loader = document.getElementById('floader');
  loader.style.opacity = '0';
  setTimeout(() => loader.style.display = 'none', 300);
  // Mobile: set blurred background from the same image
  if (window.innerWidth <= 768) {
    const img = document.getElementById('bgimg');
    const bgf = document.querySelector('.bgf');
    if (img && bgf && img.src) {
      bgf.style.setProperty('--blur-bg', 'url(' + img.src + ')');
    }
  }
}

// Track broken films in localStorage
const BROKEN_KEY = 'ntf_broken_films';
function getBrokenFilms() {
  try { return JSON.parse(localStorage.getItem(BROKEN_KEY)) || {}; } catch { return {}; }
}
function markBroken(filmId) {
  const broken = getBrokenFilms();
  broken[filmId] = (broken[filmId] || 0) + 1;
  localStorage.setItem(BROKEN_KEY, JSON.stringify(broken));
  return broken[filmId];
}
function isPermaBroken(filmId) {
  const broken = getBrokenFilms();
  return (broken[filmId] || 0) >= 3;
}

// Called by the <img> onerror event if the backdrop fails to load.
function imgErr() {
  const loader = document.getElementById('floader');
  loader.innerHTML = `
    <div style="text-align:center;">
      <div style="margin-bottom:.75rem;font-size:10px;letter-spacing:.2em;color:var(--muted);">BRAK KADRU</div>
      <div style="font-size:9px;color:var(--muted);margin-bottom:1rem;max-width:280px;line-height:1.6;">
        Obraz nie zaĹ‚adowaĹ‚ siÄ™. PotwierdĹş brak â€” po 3 zgĹ‚oszeniach film zostanie usuniÄ™ty z puli.
      </div>
      <button onclick="confirmBrokenAndSkip()" style="background:var(--gold);color:#080808;border:none;border-radius:var(--r);padding:.6rem 1.5rem;font-family:'Space Mono',monospace;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;margin-right:8px;">PotwierdĹş brak</button>
      <button onclick="skipBrokenRound()" style="background:transparent;border:1px solid var(--border);border-radius:var(--r);padding:.6rem 1.5rem;color:var(--muted);font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;">PomiĹ„</button>
    </div>`;
  loader.style.opacity = '1';
}

// User confirms the image is broken
function confirmBrokenAndSkip() {
  if (S.cur) {
    const count = markBroken(S.cur.id);
    if (count >= 3) {
      console.log(`Film ${S.cur.id} (${S.cur.title}) permanently removed from pool.`);
    }
    // Report to the server so admins can review/block the frame in /admin/.
    try {
      fetch('/api/report-frame/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken()},
        body: JSON.stringify({
          film_id: S.cur.id,
          title: S.cur.title,
          url: (document.getElementById('bgimg') || {}).src || '',
        }),
      }).catch(() => {});
    } catch {}
  }
  skipBrokenRound();
}

// Skip this round and move to next (don't count as a played round)
function skipBrokenRound() {
  S.round--; // don't count this round
  S.used.push(S.cur.id); // but don't show it again this session
  nextRound();
}

// --- Metadata Pills ---

function renderMetaPills(film) {
  // Row 1: Director, Year, Country
  let row1 = '';
  row1 += `<span class="pill pill-dir">🎬 ${film.dir}</span>`;
  row1 += `<span class="pill pill-year">📅 ${film.y}</span>`;
  if (film.country) {
    row1 += `<span class="pill pill-country">🌍 ${film.country}</span>`;
  }
  // Row 2: Genres
  let row2 = '';
  if (film.genres && film.genres.length) {
    const genreText = film.genres.slice(0, 3).join(' · ');
    row2 = `<div class="meta-pills-row2"><span class="pill pill-genre">🎭 ${genreText}</span></div>`;
  }
  return `<div class="meta-pills">${row1}</div>${row2}`;
}

// Returns HTML for the heart/favorite button shown after each round result.
// Positioned as floating bookmark in top-right of qinner.
function renderHeartButton() {
  return `<button class="heart-btn" type="button" aria-label="Polub ten kadr">♡</button>`;
}

// Handle a multiple-choice option click (Akolita Popcornu mode).
// Django equivalent: POST /game/answer/ with {type: 'test', picked: '...'}
function cOpt(btn, correct, picked) {
  document.querySelectorAll('.opt').forEach(b => {
    b.disabled = true;
    if (b.textContent.trim() === correct) b.classList.add('correct');
  });
  if (picked !== correct) btn.classList.add('wrong');
  sr(picked === correct, 1, correct, '');
}

// Handle answer submission in hangman mode (SamozwaĹ„czy Kinoman).
// Django equivalent: POST /game/answer/ with {type: 'letter', title: '...', director: '...'}
function cLetter() {
  const f     = S.cur;
  const title = document.getElementById('mi').value.trim();
  const dir   = (document.getElementById('di') || {value: ''}).value.trim();
  disableInputs();

  const titleOK = fuzzyMatch(title, f.title);
  let pts = 0, lines = [];

  if (titleOK) { pts += 2; lines.push(`âś“ TytuĹ‚: <strong>${he(f.title)}</strong> +2 pkt`); }
  else          {           lines.push(`✗ TytuĹ‚: <strong>${he(f.title)}</strong>`); }

  if (dir) {
    // Accept if the normalized guess contains the director's last name
    const dirOK = nm(dir).includes(nm(f.dir).split(' ').pop());
    if (dirOK) { pts += 3; lines.push(`âś“ ReĹĽyser: <strong>${he(f.dir)}</strong> +3 pkt`); }
    else        { pts = Math.max(0, pts - 1); lines.push(`✗ ReĹĽyser: <strong>${he(f.dir)}</strong> -1 pkt`); }
  }

  S.score += pts;
  showResult(pts > 0 ? 'ok' : 'bad', lines.join('<br>'));
}

// Handle answer submission in expert mode (OrÄ™downik Wielkiej Kinezy).
// Django equivalent: POST /game/answer/ with {type: 'expert', title, year, director}
function cExpert() {
  const f     = S.cur;
  const title = document.getElementById('et').value.trim();
  const year  = document.getElementById('ey').value.trim();
  const dir   = (document.getElementById('ed') || {value: ''}).value.trim();
  disableInputs();

  let pts = 0, lines = [], partial = false;

  // Title: up to 3 pts
  const titleOK = fuzzyMatch(title, f.title);
  if (titleOK) { pts += 3; lines.push(`âś“ TytuĹ‚: <strong>${he(f.title)}</strong> +3 pkt`); }
  else          {           lines.push(`✗ TytuĹ‚: <strong>${he(f.title)}</strong>`); }

  // Year: up to 2 pts with partial credit
  const ys = yearScore(year, f.y, 2);
  pts += ys.pts;
  if (ys.pts > 0 && ys.pts < 2) partial = true;
  lines.push(`${ys.pts > 0 ? 'âś“' : '✗'} Rok: <strong>${f.y}</strong> ${ys.label}`);

  // Director: optional bonus/penalty
  if (dir) {
    const dirOK = nm(dir).includes(nm(f.dir).split(' ').pop());
    if (dirOK) { pts += 3; lines.push(`âś“ ReĹĽyser: <strong>${he(f.dir)}</strong> +3 pkt`); }
    else        { pts = Math.max(0, pts - 1); lines.push(`✗ ReĹĽyser: <strong>${he(f.dir)}</strong> -1 pkt`); }
  }

  S.score += pts;
  const cls = pts === 0 ? 'bad' : (partial || pts < 5) ? 'partial' : 'ok';
  showResult(cls, lines.join('<br>'));
}

// Disable all answer inputs after submission to prevent re-submitting.
function disableInputs() {
  document.querySelectorAll('.ti, .dir-input, .cb').forEach(el => el.disabled = true);
}

// Render the result box and film reveal after an answer is submitted.
// Django equivalent: the response JSON rendered into the page via JS,
// or a template partial returned by an HTMX endpoint.
function showResult(cls, html) {
  document.getElementById('pts').textContent = S.score;
  const rb = document.getElementById('rb');
  rb.className  = 'rbox ' + cls;
  rb.innerHTML  = html;
  rb.style.display = 'block';
  document.getElementById('frm').style.display = 'none';
  const fr = document.getElementById('fr');
  fr.querySelectorAll('.meta-pills, .meta-pills-row2, .heart-btn').forEach(el => el.remove());
  // Hide the title row — info already in result box
  const frtRow = document.querySelector('.frt-row');
  if (frtRow) frtRow.style.display = 'none';
  fr.insertAdjacentHTML('beforeend', renderMetaPills(S.cur));
  fr.style.display = 'block';
  // Heart moves into the winning button (correct answer)
  if (cls === 'ok') {
    setTimeout(() => {
      const winBtn = document.querySelector('.opt.correct');
      if (winBtn) {
        winBtn.classList.add('opt-winner');
        winBtn.insertAdjacentHTML('beforeend', renderHeartButton());
        const hb = winBtn.querySelector('.heart-btn');
        if (hb) { hb.classList.add('heart-revealed'); playStampSound(); }
      }
    }, 400);
  }
  document.getElementById('nb').style.display = 'block';
  smartTimer.start();
}

// Simplified result renderer used by multiple-choice mode (cOpt).
// Kept separate for clarity â€” test mode only has a binary correct/wrong state.
function sr(ok, pts, ct, ex) {
  if (ok) S.score += pts;
  document.getElementById('pts').textContent = S.score;
  const rb = document.getElementById('rb');
  rb.className = 'rbox ' + (ok ? 'ok' : 'bad');
  rb.innerHTML = ok
    ? `✓ &nbsp;Tak! &nbsp;<strong>${he(ct)}</strong> &nbsp;+${pts} pkt`
    : `✗ &nbsp;Nie. To: &nbsp;<strong>${he(ct)}</strong>${ex}`;
  rb.style.display = 'block';
  document.getElementById('frm').style.display = 'none';
  const fr = document.getElementById('fr');
  fr.querySelectorAll('.meta-pills, .meta-pills-row2, .heart-btn').forEach(el => el.remove());
  // Hide the title row — info already in result box
  const frtRow = document.querySelector('.frt-row');
  if (frtRow) frtRow.style.display = 'none';
  fr.insertAdjacentHTML('beforeend', renderMetaPills(S.cur));
  fr.style.display = 'block';
  // Heart moves into the winning button (correct answer)
  if (ok) {
    setTimeout(() => {
      const winBtn = document.querySelector('.opt.correct');
      if (winBtn) {
        winBtn.classList.add('opt-winner');
        winBtn.insertAdjacentHTML('beforeend', renderHeartButton());
        const hb = winBtn.querySelector('.heart-btn');
        if (hb) { hb.classList.add('heart-revealed'); playStampSound(); }
      }
    }, 400);
  }
  document.getElementById('nb').style.display = 'block';
  smartTimer.start();
}

// --- Heart Button Click Handler ---

// Extract TMDB backdrop file_path from a full image URL.
// e.g. "https://image.tmdb.org/t/p/w1280/abc123.jpg" â†’ "/abc123.jpg"
function extractBackdropPath(url) {
  if (!url) return '';
  try {
    const pathname = new URL(url).pathname;
    // pathname is like /t/p/w1280/abc123.jpg â€” we want the last segment
    const parts = pathname.split('/');
    return '/' + parts[parts.length - 1];
  } catch {
    // Fallback: grab everything after the last /t/p/.../ pattern
    const m = url.match(/\/t\/p\/[^/]+(\/.+)$/);
    return m ? m[1] : url;
  }
}

// Play a short Web Audio sine burst for heart activation feedback.
function playHeartSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Silently ignore â€” Web Audio may not be available
  }
}

// Play a mechanical stamp/click sound when the heart slot reveals.
function playStampSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    // Thud â€” low freq burst
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(120, t);
    osc1.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    g1.gain.setValueAtTime(0.3, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc1.connect(g1);
    g1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.1);
    // Click â€” high freq tick
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = 1200;
    g2.gain.setValueAtTime(0.15, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc2.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.05);
  } catch (e) {
    // Silently ignore
  }
}

// Show a brief toast notification at the bottom of the screen.
function showToast(msg, durationMs = 2500) {
  let toast = document.getElementById('ntf-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ntf-toast';
    toast.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);' +
      'background:rgba(20,20,20,.92);color:#fff;padding:.6rem 1.4rem;border-radius:8px;' +
      'font-size:12px;font-family:"Space Mono",monospace;letter-spacing:.05em;' +
      'z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._tid);
  toast._tid = setTimeout(() => { toast.style.opacity = '0'; }, durationMs);
}

// Delegated click handler for the heart button.
// Attached once via event delegation on .frev (the film reveal container).
document.addEventListener('DOMContentLoaded', function() {
  const fr = document.getElementById('fr');
  if (!fr) return;

  fr.addEventListener('click', async function(e) {
    const btn = e.target.closest('.heart-btn');
    if (!btn) return;

    // Auth gate: if not authenticated, do nothing
    if (typeof DJANGO_USER === 'undefined' || !DJANGO_USER.authenticated) return;

    // Determine backdrop path from current image
    const bgImg = document.getElementById('bgimg');
    const backdropPath = extractBackdropPath(bgImg ? bgImg.src : '');

    if (!S.cur || !backdropPath) return;

    // Remember previous state for revert on error
    const wasHearted = btn.classList.contains('hearted');

    try {
      const res = await fetch('/api/hearts/toggle/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
          film_id: S.cur.id,
          backdrop_path: backdropPath,
        }),
      });

      if (!res.ok) return;

      const data = await res.json();

      if (data.hearted) {
        btn.classList.add('hearted');
        btn.textContent = '❤';
        playHeartSound();
      } else {
        btn.classList.remove('hearted');
        btn.textContent = '♡';
      }
    } catch (err) {
      // Network error â€” revert and show toast
      if (wasHearted) {
        btn.classList.add('hearted');
        btn.textContent = 'âť¤';
      } else {
        btn.classList.remove('hearted');
        btn.textContent = '♡';
      }
      showToast('Brak poĹ‚Ä…czenia');
    }
  });
});

// --- Smart Timer Auto-Advance ---

/**
 * SmartTimer â€” countdown that drives --timer-progress CSS var on .nbtn
 * and auto-calls onComplete (nextRound) when elapsed >= duration.
 *
 * Uses requestAnimationFrame for smooth visual updates.
 */
class SmartTimer {
  constructor(duration = 7000, onComplete = null) {
    this.duration = duration;
    this.onComplete = onComplete;
    this._elapsed = 0;
    this._startTime = null;
    this._rafId = null;
    this._running = false;
    this._paused = false;
  }

  /** Begin countdown from 0. */
  start() {
    this.cancel();
    this._elapsed = 0;
    this._running = true;
    this._paused = false;
    this._startTime = performance.now();
    this._tick();
  }

  /** Pause at current position. */
  pause() {
    if (!this._running || this._paused) return;
    this._paused = true;
    // Accumulate elapsed up to this moment
    this._elapsed += performance.now() - this._startTime;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** Resume from paused position. */
  resume() {
    if (!this._running || !this._paused) return;
    this._paused = false;
    this._startTime = performance.now();
    this._tick();
  }

  /** Stop countdown and reset progress to 0. */
  cancel() {
    this._running = false;
    this._paused = false;
    this._elapsed = 0;
    this._startTime = null;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._setProgress(0);
  }

  /** Alias for cancel. */
  reset() {
    this.cancel();
  }

  /** @private â€” rAF loop */
  _tick() {
    if (!this._running || this._paused) return;

    const now = performance.now();
    const totalElapsed = this._elapsed + (now - this._startTime);
    const progress = Math.min(totalElapsed / this.duration, 1);

    this._setProgress(progress);

    if (totalElapsed >= this.duration) {
      // Timer complete
      this._running = false;
      this._rafId = null;
      if (this.onComplete) this.onComplete();
      return;
    }

    this._rafId = requestAnimationFrame(() => this._tick());
  }

  /** @private â€” update CSS custom property on .nbtn */
  _setProgress(value) {
    const btn = document.querySelector('.nbtn');
    if (btn) {
      btn.style.setProperty('--timer-progress', value);
    }
  }
}

// --- Smart Timer Instance & Activity-Pause Logic ---

const smartTimer = new SmartTimer(7000, () => nextRound());

let _activityTimeout = null;
function onActivity() {
  if (!smartTimer._running) return;
  smartTimer.pause();
  clearTimeout(_activityTimeout);
  _activityTimeout = setTimeout(() => smartTimer.resume(), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  const game = document.getElementById('game');
  if (game) {
    game.addEventListener('mousemove', onActivity);
    game.addEventListener('touchstart', onActivity);
  }
});

// Report wrong frame â€” player says the image doesn't match the film
function reportWrongFrame() {
  if (!S.cur) return;
  const count = markBroken(S.cur.id);
  const btn = document.querySelector('.report-btn');
  if (btn) {
    btn.textContent = count >= 3
      ? 'âś“ UsuniÄ™to z puli (3 zgĹ‚oszenia)'
      : `âś“ ZgĹ‚oszono (${count}/3)`;
    btn.disabled = true;
    btn.style.color = 'rgba(180,90,90,.6)';
  }
  // Skip round without penalty
  S.round--;
  setTimeout(() => nextRound(), 1200);
}

// --- Draggable Island (Pointer Events) ---
(function initDraggable() {
  document.addEventListener('DOMContentLoaded', () => {
    const panel = document.querySelector('.qpanel');
    if (!panel) return;

    let isDragging = false;
    let startX, startY, origLeft, origTop;

    function getPanelPos() {
      const rect = panel.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    }

    panel.addEventListener('pointerdown', (e) => {
      // Don't drag from buttons/inputs
      if (e.target.closest('button, input, .opt, a')) return;
      isDragging = true;
      panel.classList.add('is-dragging');
      panel.setPointerCapture(e.pointerId);

      const pos = getPanelPos();
      startX = e.clientX;
      startY = e.clientY;
      origLeft = pos.left;
      origTop = pos.top;

      // Switch to left/top positioning for drag
      panel.style.left = origLeft + 'px';
      panel.style.top = origTop + 'px';
      panel.style.bottom = 'auto';
      panel.style.transform = 'none';
    });

    panel.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = origLeft + dx;
      let newTop = origTop + dy;

      // Bounding box â€” keep within viewport
      const rect = panel.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (newLeft < 0) newLeft = 0;
      if (newTop < 0) newTop = 0;
      if (newLeft + rect.width > vw) newLeft = vw - rect.width;
      if (newTop + rect.height > vh) newTop = vh - rect.height;

      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    });

    panel.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      panel.classList.remove('is-dragging');
      panel.releasePointerCapture(e.pointerId);
    });

    panel.addEventListener('pointercancel', (e) => {
      if (!isDragging) return;
      isDragging = false;
      panel.classList.remove('is-dragging');
    });
  });
})();

// --- Mobile: Hide UI on background tap ---
(function initMobileUIHide() {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth > 768) return; // only mobile

    const bgf = document.querySelector('.bgf');
    if (!bgf) return;

    let uiHidden = false;

    bgf.addEventListener('pointerdown', (e) => {
      // Only if tap is on the background itself (not on island/hud)
      if (e.target.closest('.qpanel, .hud, .opt, button')) return;

      const panel = document.querySelector('.qpanel');
      const hud = document.querySelector('.hud');

      if (!uiHidden) {
        if (panel) panel.classList.add('ui-hidden');
        if (hud) hud.classList.add('ui-hidden');
        uiHidden = true;
      } else {
        if (panel) panel.classList.remove('ui-hidden');
        if (hud) hud.classList.remove('ui-hidden');
        uiHidden = false;
      }
    });
  });
})();
