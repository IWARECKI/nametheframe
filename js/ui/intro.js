// Intro: "Projector warms up" effect
// During countdown: beam gradually brightens, logo slowly emerges
// At 0: flash, full brightness, dust appears, click prompt

(function initIntro() {
  const intro   = document.getElementById('intro');
  const counter = document.getElementById('film-counter');
  const enter   = document.getElementById('frame-enter');
  const logo    = document.getElementById('intro-logo');
  const beam    = document.getElementById('projector-beam');
  const flash   = document.getElementById('projector-flash');
  const dust    = document.getElementById('dust-particles');

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

  // ── Dust particles ─────────────────────────────────────────
  function createDustParticles() {
    if (!dust) return;
    dust.innerHTML = '';
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'dust-dot';
      p.style.left = (20 + Math.random() * 60) + '%';
      p.style.top = (10 + Math.random() * 70) + '%';
      p.style.animationDelay = (Math.random() * 4) + 's';
      p.style.animationDuration = (3 + Math.random() * 3) + 's';
      p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
      dust.appendChild(p);
    }
  }

  // ── Initialize ─────────────────────────────────────────────
  logo.style.opacity = '0';
  beam.style.opacity = '0';
  flash.style.opacity = '0';
  dust.style.opacity = '0';

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

  // ── Phase 2: count 24→0, beam warms up, logo emerges ──────
  function startCountdown() {
    startProjectorSound();
    createDustParticles();

    let count = TOTAL;
    const STEP = 4000 / TOTAL;

    const tick = setInterval(() => {
      count--;
      counter.textContent = count;
      const progress = (TOTAL - count) / TOTAL; // 0→1

      // Beam gradually appears (ease-in curve for "warming up" feel)
      const beamOpacity = Math.pow(progress, 2) * 0.7; // max 0.7 during countdown
      beam.style.opacity = beamOpacity.toString();

      // Logo starts appearing at 30% progress, reaches 0.5 opacity by end
      if (progress > 0.3) {
        const logoP = (progress - 0.3) / 0.7; // 0→1 within remaining range
        logo.style.opacity = (logoP * 0.5).toString();
      }

      // Dust starts at 50% progress
      if (progress > 0.5) {
        const dustP = (progress - 0.5) / 0.5;
        dust.style.opacity = (dustP * 0.4).toString();
      }

      // Audio fade
      if (gainNode && audioCtx) {
        gainNode.gain.setValueAtTime(0.05 * (1 - progress * 0.5), audioCtx.currentTime);
      }

      if (count <= 0) {
        clearInterval(tick);
        onCountdownDone();
      }
    }, STEP);
  }

  // ── Phase 3: flash → full brightness ──────────────────────
  function onCountdownDone() {
    fadeOutSound();
    counter.style.opacity = '0';
    setTimeout(() => { counter.style.display = 'none'; }, 300);

    // Flash!
    flash.style.opacity = '1';
    setTimeout(() => {
      flash.style.transition = 'opacity .4s ease';
      flash.style.opacity = '0';
    }, 120);

    // Beam to full
    setTimeout(() => {
      beam.style.transition = 'opacity .6s ease';
      beam.style.opacity = '1';
    }, 150);

    // Logo to full
    setTimeout(() => {
      logo.style.transition = 'opacity .6s ease';
      logo.style.opacity = '1';
    }, 200);

    // Dust to full
    setTimeout(() => {
      dust.style.transition = 'opacity .8s ease';
      dust.style.opacity = '1';
    }, 300);

    // "Click to enter"
    setTimeout(() => {
      enter.classList.add('vis');
      ready = true;
    }, 800);
  }

  // ── Phase 4: click → fade out, show setup ──────────────────
  function enterSite() {
    if (!ready) return;
    ready = false;

    beam.style.transition = 'opacity .6s ease';
    beam.style.opacity = '0';
    logo.style.transition = 'opacity .5s ease';
    logo.style.opacity = '0';
    dust.style.transition = 'opacity .4s ease';
    dust.style.opacity = '0';
    enter.style.transition = 'opacity .3s ease';
    enter.style.opacity = '0';

    setTimeout(() => {
      intro.style.transition = 'opacity .5s ease';
      intro.style.opacity = '0';
    }, 400);

    setTimeout(() => {
      intro.style.display = 'none';
      const setup = document.getElementById('setup');
      setup.style.display = 'flex';
      setTimeout(() => setup.classList.add('vis'), 50);
    }, 900);
  }

  intro.addEventListener('click', enterSite);
})();
