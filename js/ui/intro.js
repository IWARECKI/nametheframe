// Django equivalent: No direct server-side equivalent — purely client-side animation.
// Effect: a narrow horizontal film-frame bar expands to fill the screen
// in sync with a 24→0 frame counter, then waits for a click to enter.

(function initIntro() {
  const intro   = document.getElementById('intro');
  const frame   = document.getElementById('film-frame');
  const counter = document.getElementById('film-counter');
  const enter   = document.getElementById('frame-enter');

  // Bar geometry: starts at 8vh centered, expands to 100vh
  const START_H  = 8;   // vh
  const END_H    = 100; // vh
  const TOTAL    = 24;  // frames to count down

  // Position the bar centered on screen at a given height (vh)
  function setBarHeight(vh) {
    const h   = Math.min(vh, END_H);
    const top = (100 - h) / 2;
    frame.style.top    = top + 'vh';
    frame.style.height = h   + 'vh';
  }

  // Initialise bar position before anything plays
  setBarHeight(START_H);

  let ready = false; // true once countdown finishes and click is enabled

  // ── Phase 1: flicker between 24 and 25 for ~500ms ──────────
  let flickerCount = 0;
  const flickerInterval = setInterval(() => {
    counter.textContent = flickerCount % 2 === 0 ? '25' : '24';
    flickerCount++;
    if (flickerCount >= 6) { // ~6 ticks × ~85ms ≈ 500ms
      clearInterval(flickerInterval);
      counter.textContent = '24';
      startCountdown();
    }
  }, 85);

  // ── Phase 2: count 24→0, expand bar ────────────────────────
  function startCountdown() {
    let count    = TOTAL;
    const STEP   = 4000 / TOTAL; // ~167ms per frame

    const tick = setInterval(() => {
      count--;
      counter.textContent = count;

      // Expand bar proportionally: 8vh at 24, 100vh at 0
      const progress = (TOTAL - count) / TOTAL;
      setBarHeight(START_H + (END_H - START_H) * progress);

      if (count <= 0) {
        clearInterval(tick);
        onCountdownDone();
      }
    }, STEP);
  }

  // ── Phase 3: counter done — show "click to enter" ──────────
  function onCountdownDone() {
    counter.style.opacity = '0';
    setTimeout(() => { counter.style.display = 'none'; }, 300);
    enter.classList.add('vis');
    ready = true;
  }

  // ── Phase 4: click anywhere → fade out → show setup ────────
  function enterSite() {
    if (!ready) return;
    intro.style.transition = 'opacity .7s ease';
    intro.style.opacity    = '0';
    setTimeout(() => {
      intro.style.display = 'none';
      const setup = document.getElementById('setup');
      setup.style.display = 'flex';
      setTimeout(() => setup.classList.add('vis'), 50);
    }, 700);
  }

  intro.addEventListener('click', enterSite);
})();
