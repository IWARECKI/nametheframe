// Django equivalent: No direct server-side equivalent — purely client-side.
// Effect: two black grainy curtains converge from screen edges toward center,
// framing the logo. On click they retract, revealing the setup screen.

(function initIntro() {
  const intro      = document.getElementById('intro');
  const curtainTop = document.getElementById('curtain-top');
  const curtainBot = document.getElementById('curtain-bottom');
  const counterEl  = document.getElementById('film-counter');
  const enterEl    = document.getElementById('frame-enter');

  // Each curtain grows to MAX_VH — leaves the center logo area uncovered.
  // Logo is ~clamp(2rem,6vw,4rem) tall + gap; 42vh safely clears it.
  const MAX_VH       = 42;
  const TOTAL_FRAMES = 24;
  const COUNTDOWN_MS = 4000;
  const STEP_MS      = COUNTDOWN_MS / TOTAL_FRAMES; // ≈167ms

  let ready = false;

  // ── Grain — animated canvas noise on each curtain ──────────
  // Each curtain canvas is redrawn every rAF frame with fresh random pixels.
  function startGrain(canvas) {
    let raf;
    function draw() {
      const parent = canvas.parentElement;
      const w = parent.offsetWidth;
      const h = parent.offsetHeight;
      if (w > 0 && h > 0) {
        canvas.width  = w;
        canvas.height = h;
        const ctx  = canvas.getContext('2d');
        const img  = ctx.createImageData(w, h);
        const data = img.data;
        // Fill with random gray values at low alpha — film grain feel
        for (let i = 0; i < data.length; i += 4) {
          const v   = (Math.random() * 255) | 0;
          data[i]   = v;
          data[i+1] = v;
          data[i+2] = v;
          data[i+3] = 22; // very subtle: ~8% opacity per pixel
        }
        ctx.putImageData(img, 0, 0);
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }

  const stopGrainTop = startGrain(curtainTop.querySelector('.grain-canvas'));
  const stopGrainBot = startGrain(curtainBot.querySelector('.grain-canvas'));

  // ── Projector sound — Web Audio API, zero external files ───
  // Short noise bursts through a bandpass filter = mechanical click.
  let projector = null;
  try {
    const actx       = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = actx.createGain();
    masterGain.gain.value = 0.05;
    masterGain.connect(actx.destination);

    const CLICK_INTERVAL = 0.19; // seconds between clicks (~5/s)

    function scheduleClick(when) {
      const bufLen  = Math.floor(actx.sampleRate * 0.035); // 35ms burst
      const buf     = actx.createBuffer(1, bufLen, actx.sampleRate);
      const ch      = buf.getChannelData(0);
      // Exponentially decaying noise → mechanical "tick"
      for (let i = 0; i < bufLen; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.18));
      }
      const src = actx.createBufferSource();
      src.buffer = buf;

      const bpf = actx.createBiquadFilter();
      bpf.type            = 'bandpass';
      bpf.frequency.value = 900;
      bpf.Q.value         = 0.8;

      src.connect(bpf);
      bpf.connect(masterGain);
      src.start(when);
    }

    // Pre-schedule enough clicks to cover the full animation
    const clickCount = Math.ceil((COUNTDOWN_MS / 1000 + 1) / CLICK_INTERVAL);
    const startT     = actx.currentTime + 0.08;
    for (let i = 0; i < clickCount; i++) {
      scheduleClick(startT + i * CLICK_INTERVAL);
    }

    projector = { actx, masterGain };
  } catch (e) {
    // Web Audio blocked or unavailable — animation works without sound
  }

  // Fade projector volume to fraction of original (0 = silent)
  function setProjectorGain(fraction) {
    if (!projector) return;
    projector.masterGain.gain.value = 0.05 * Math.max(0, fraction);
  }

  function stopProjector() {
    if (!projector) return;
    projector.masterGain.gain.linearRampToValueAtTime(
      0, projector.actx.currentTime + 0.4
    );
  }

  // ── Curtain height helper ───────────────────────────────────
  // progress: 0 (curtains at edges = not visible) → 1 (curtains at center)
  function setCurtains(progress) {
    const h = MAX_VH * Math.min(progress, 1);
    curtainTop.style.height = h + 'vh';
    curtainBot.style.height = h + 'vh';
  }

  setCurtains(0);

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

      const progress = (TOTAL_FRAMES - count) / TOTAL_FRAMES;
      setCurtains(progress);
      // Projector gradually quiets as curtains close
      setProjectorGain(1 - progress * 0.7);

      if (count <= 0) {
        clearInterval(tick);
        onCountdownDone();
      }
    }, STEP_MS);
  }

  // ── Phase 3: curtains stopped, show "click to enter" ───────
  function onCountdownDone() {
    stopProjector();
    counterEl.style.opacity = '0';
    setTimeout(() => { counterEl.style.display = 'none'; }, 350);
    // Small delay before prompt appears
    setTimeout(() => enterEl.classList.add('vis'), 200);
    ready = true;
  }

  // ── Phase 4: click → curtains retract → reveal setup ───────
  function enterSite() {
    if (!ready) return;
    ready = false;

    enterEl.classList.remove('vis');
    stopGrainTop();
    stopGrainBot();

    // Curtains retract: top goes up, bottom goes down
    const EXIT_DURATION = 550; // ms
    const startTime     = performance.now();
    const startH        = MAX_VH;

    function exitFrame(now) {
      const t        = Math.min((now - startTime) / EXIT_DURATION, 1);
      // ease-in: slow start, fast finish — curtains snap away
      const eased    = t * t;
      const progress = 1 - eased;
      setCurtains(progress);

      if (t < 1) {
        requestAnimationFrame(exitFrame);
      } else {
        // Fade out entire intro
        intro.style.transition = 'opacity .45s ease';
        intro.style.opacity    = '0';
        setTimeout(() => {
          intro.style.display = 'none';
          const setup = document.getElementById('setup');
          setup.style.display = 'flex';
          setTimeout(() => setup.classList.add('vis'), 50);
        }, 450);
      }
    }

    requestAnimationFrame(exitFrame);
  }

  intro.addEventListener('click', enterSite);
})();
