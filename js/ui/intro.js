// Django equivalent: No direct server-side equivalent — purely client-side.
// Effect: two black curtains converge from screen edges toward center,
// framing the logo with CSS film grain. Click retracts them → setup screen.
//
// FIX LOG (v3):
//   - Removed canvas-based grain: createImageData at full res every rAF frame
//     caused ~500MB/s GC pressure → main thread freeze → countdown never fired
//     → ready stayed false → clicks silently ignored.
//   - Grain is now pure CSS (SVG feTurbulence tile + background-position animation).
//   - Removed Web Audio (risk factor, will be re-added carefully later).
//   - Added null guards on all DOM lookups.
//   - Added 7s hard fallback: ready=true regardless, so user can always enter.

(function initIntro() {

  const intro       = document.getElementById('intro');
  const curtainTop  = document.getElementById('curtain-top');
  const curtainBot  = document.getElementById('curtain-bottom');
  const curtainLeft = document.getElementById('curtain-left');
  const curtainRight= document.getElementById('curtain-right');
  const counterEl   = document.getElementById('film-counter');
  const enterEl     = document.getElementById('frame-enter');

  // Bail out gracefully if HTML doesn't match (e.g. stale cache)
  if (!intro || !curtainTop || !curtainBot || !curtainLeft || !curtainRight || !counterEl || !enterEl) return;

  // Each curtain grows to MAX_VH from its edge toward center.
  // 42vh keeps the logo (~4rem tall) in the uncovered center strip.
  const MAX_VH       = 42;
  const TOTAL_FRAMES = 24;
  const COUNTDOWN_MS = 4000;
  const STEP_MS      = COUNTDOWN_MS / TOTAL_FRAMES; // ≈167ms per frame

  let ready = false;

  // ── Curtain position helper ─────────────────────────────────
  // progress 0 → all curtains invisible at their edges
  // progress 1 → vertical curtains at MAX_VH, horizontal at MAX_VW
  // Vertical (top/bottom) use vh; horizontal (left/right) use vw.
  // Both reach their max simultaneously → aperture close/open.
  const MAX_VW = 42; // matches MAX_VH for a balanced aperture

  function setCurtains(progress) {
    const p = Math.min(Math.max(progress, 0), 1);
    const h = (MAX_VH * p).toFixed(2);
    const w = (MAX_VW * p).toFixed(2);
    curtainTop.style.height   = h + 'vh';
    curtainBot.style.height   = h + 'vh';
    curtainLeft.style.width   = w + 'vw';
    curtainRight.style.width  = w + 'vw';
  }

  setCurtains(0);

  // ── Hard fallback: if something goes wrong, unlock clicking ──
  // Fires at MAX_VH animation time + generous buffer (7s total).
  const fallbackTimer = setTimeout(() => {
    if (!ready) {
      setCurtains(1);
      counterEl.style.opacity = '0';
      enterEl.classList.add('vis');
      ready = true;
    }
  }, 7000);

  // ── Phase 1: flicker 24 ↔ 25 for ~500ms ────────────────────
  let flickCount = 0;
  const flicker = setInterval(() => {
    counterEl.textContent = flickCount % 2 === 0 ? '25' : '24';
    flickCount++;
    if (flickCount >= 6) {
      clearInterval(flicker);
      counterEl.textContent = '24';
      startCountdown();
    }
  }, 85);

  // ── Phase 2: countdown 24 → 0, curtains converge ───────────
  function startCountdown() {
    let count = TOTAL_FRAMES;

    const tick = setInterval(() => {
      count--;
      counterEl.textContent = count;
      setCurtains((TOTAL_FRAMES - count) / TOTAL_FRAMES);

      if (count <= 0) {
        clearInterval(tick);
        onCountdownDone();
      }
    }, STEP_MS);
  }

  // ── Phase 3: done — show "click to enter" ──────────────────
  function onCountdownDone() {
    clearTimeout(fallbackTimer);
    counterEl.style.transition = 'opacity .35s';
    counterEl.style.opacity    = '0';
    setTimeout(() => {
      if (counterEl) counterEl.style.display = 'none';
      enterEl.classList.add('vis');
      ready = true;
    }, 350);
  }

  // ── Phase 4: click → curtains retract → reveal setup ───────
  function enterSite() {
    if (!ready) return;
    ready = false;

    enterEl.classList.remove('vis');

    // Curtains retract: top → up, bottom → down (ease-in²)
    const EXIT_MS = 520;
    const t0      = performance.now();

    function exitFrame(now) {
      const t       = Math.min((now - t0) / EXIT_MS, 1);
      const eased   = t * t;           // slow start → fast snap
      setCurtains(1 - eased);

      if (t < 1) {
        requestAnimationFrame(exitFrame);
      } else {
        // Fade out the whole intro overlay
        intro.style.transition = 'opacity .4s ease';
        intro.style.opacity    = '0';
        setTimeout(() => {
          intro.style.display = 'none';
          const setup = document.getElementById('setup');
          if (!setup) return;
          setup.style.display = 'flex';
          setTimeout(() => setup.classList.add('vis'), 50);
        }, 400);
      }
    }

    requestAnimationFrame(exitFrame);
  }

  intro.addEventListener('click', enterSite);

})();
