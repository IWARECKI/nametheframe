// Intro animation: dual curtains converge from edges to center
// Top curtain starts off-screen above, slides DOWN to cover top half.
// Bottom curtain starts off-screen below, slides UP to cover bottom half.
// They meet in the middle — logo appears at the seam.
// On click: curtains slide back out (top up, bottom down), revealing setup.

(function initIntro() {
  const intro      = document.getElementById('intro');
  const topCurtain = document.getElementById('curtain-top');
  const btmCurtain = document.getElementById('curtain-bottom');
  const counter    = document.getElementById('film-counter');
  const enter      = document.getElementById('frame-enter');
  const logo       = document.getElementById('intro-logo');
  const seamLine   = document.getElementById('seam-line');

  const TOTAL = 24;
  let ready = false;
  let audioCtx = null;
  let clickInterval = null;
  let gainNode = null;

  // ── Web Audio: projector click sound ───────────────────────
  function initAudio() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.05;
      gainNode.connect(audioCtx.destination);
    } catch (e) {
      audioCtx = null;
    }
  }

  function playClick() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.012);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800 + Math.random() * 400;
    filter.Q.value = 2;
    noise.connect(filter);
    filter.connect(gainNode);
    noise.start(now);
    noise.stop(now + 0.015);
  }

  function startProjectorSound() {
    if (!audioCtx) return;
    clickInterval = setInterval(playClick, 4000 / TOTAL);
  }

  function fadeOutSound() {
    if (!audioCtx || !gainNode) return;
    if (clickInterval) { clearInterval(clickInterval); clickInterval = null; }
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
  }

  // ── Curtain control ────────────────────────────────────────
  // Curtains converge: progress 0 = off-screen, 1 = meeting at center
  function setCurtainClose(progress) {
    const p = Math.max(0, Math.min(1, progress));
    // Top: starts at translateY(-100%) → ends at translateY(0)
    topCurtain.style.transform = 'translateY(' + (-100 + p * 100) + '%)';
    // Bottom: starts at translateY(100%) → ends at translateY(0)
    btmCurtain.style.transform = 'translateY(' + (100 - p * 100) + '%)';
  }

  // Curtains diverge (exit): progress 0 = at center, 1 = off-screen
  function setCurtainOpen(progress) {
    const p = Math.max(0, Math.min(1, progress));
    topCurtain.style.transform = 'translateY(' + (-p * 100) + '%)';
    btmCurtain.style.transform = 'translateY(' + (p * 100) + '%)';
  }

  // ── Film grain: animate feTurbulence seed ──────────────────
  let grainAnimId = null;
  function animateGrain() {
    const turb = document.querySelector('#grain-filter feTurbulence');
    if (!turb) return;
    let seed = 0;
    (function tick() {
      seed = (seed + 1) % 100;
      turb.setAttribute('seed', seed);
      grainAnimId = requestAnimationFrame(tick);
    })();
  }
  function stopGrain() {
    if (grainAnimId) { cancelAnimationFrame(grainAnimId); grainAnimId = null; }
  }

  // ── Initialize ─────────────────────────────────────────────
  setCurtainClose(0); // curtains off-screen
  logo.style.opacity = '0';
  if (seamLine) seamLine.style.opacity = '0';
  animateGrain();

  // ── Phase 1: flicker 24/25 for ~500ms ─────────────────────
  let flickerCount = 0;
  const flickerInterval = setInterval(() => {
    counter.textContent = flickerCount % 2 === 0 ? '25' : '24';
    flickerCount++;
    if (flickerCount >= 6) {
      clearInterval(flickerInterval);
      counter.textContent = '24';
      initAudio();
      startCountdown();
    }
  }, 85);

  // ── Phase 2: count 24→0, curtains converge to center ───────
  function startCountdown() {
    startProjectorSound();

    let count = TOTAL;
    const STEP = 4000 / TOTAL;

    const tick = setInterval(() => {
      count--;
      counter.textContent = count;
      const progress = (TOTAL - count) / TOTAL;
      setCurtainClose(progress);

      // Show logo when curtains are ~70% closed
      if (progress > 0.7 && logo.style.opacity === '0') {
        logo.style.opacity = '1';
      }

      // Gradually reduce audio gain
      if (gainNode && audioCtx) {
        gainNode.gain.setValueAtTime(0.05 * (1 - progress * 0.7), audioCtx.currentTime);
      }

      if (count <= 0) {
        clearInterval(tick);
        onCountdownDone();
      }
    }, STEP);
  }

  // ── Phase 3: done — show seam line + "click to enter" ──────
  function onCountdownDone() {
    fadeOutSound();
    counter.style.opacity = '0';
    setTimeout(() => { counter.style.display = 'none'; }, 300);
    if (seamLine) seamLine.style.opacity = '1';
    enter.classList.add('vis');
    ready = true;
  }

  // ── Phase 4: click → curtains retract, show setup ──────────
  function enterSite() {
    if (!ready) return;
    ready = false;

    enter.style.opacity = '0';
    logo.style.transition = 'opacity .3s ease';
    logo.style.opacity = '0';
    if (seamLine) { seamLine.style.transition = 'opacity .3s'; seamLine.style.opacity = '0'; }
    stopGrain();

    const DURATION = 800;
    const start = performance.now();

    function animate(now) {
      const elapsed = now - start;
      const p = Math.min(elapsed / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCurtainOpen(eased);

      if (p < 1) {
        requestAnimationFrame(animate);
      } else {
        intro.style.display = 'none';
        const setup = document.getElementById('setup');
        setup.style.display = 'flex';
        setTimeout(() => setup.classList.add('vis'), 50);
      }
    }
    requestAnimationFrame(animate);
  }

  intro.addEventListener('click', enterSite);
})();
