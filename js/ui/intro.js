// Intro: projector warm-up + typewriter logo with neon glow
// Counter: starts "25/24" (PAL/NTSC nod), then counts 23→0
// Countdown is ~2.5s, then flash + typewriter types "Name the Frame"

(function initIntro() {
  const intro   = document.getElementById('intro');
  const counter = document.getElementById('film-counter');
  const enter   = document.getElementById('frame-enter');
  const logo    = document.getElementById('intro-logo');
  const typed   = document.getElementById('typed-text');
  const beam    = document.getElementById('projector-beam');
  const flash   = document.getElementById('projector-flash');
  const dust    = document.getElementById('dust-particles');

  const TOTAL = 24; // countdown from 23 to 0 (24 ticks)
  let ready = false;
  let audioCtx = null;
  let clickInterval = null;
  let gainNode = null;

  // ── Web Audio: projector click ─────────────────────────────
  function initAudio() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.05;
      gainNode.connect(audioCtx.destination);
    } catch (e) { audioCtx = null; }
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
    clickInterval = setInterval(playClick, 2500 / TOTAL);
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

  // ── Typewriter ─────────────────────────────────────────────
  function typeWriter(callback) {
    // Structure: [{text, glowClass}]
    const segments = [
      { text: 'Name', cls: 'glow-name' },
      { text: ' the ', cls: 'glow-the' },
      { text: 'Frame', cls: 'glow-frame' }
    ];

    typed.innerHTML = '<span class="logo-cursor">|</span>';

    let segIdx = 0;
    let charIdx = 0;
    let currentSpan = null;

    function typeNext() {
      if (segIdx >= segments.length) {
        // Done — remove cursor after a pause
        setTimeout(() => {
          const cur = typed.querySelector('.logo-cursor');
          if (cur) cur.style.display = 'none';
        }, 1500);
        if (callback) callback();
        return;
      }

      const seg = segments[segIdx];

      // Create span for this segment on first char
      if (charIdx === 0) {
        currentSpan = document.createElement('span');
        currentSpan.className = seg.cls;
        // Insert before cursor
        const cur = typed.querySelector('.logo-cursor');
        typed.insertBefore(currentSpan, cur);
      }

      if (charIdx < seg.text.length) {
        currentSpan.textContent += seg.text[charIdx];
        charIdx++;
        const delay = 80 + (Math.random() - 0.5) * 40;
        setTimeout(typeNext, delay);
      } else {
        // Next segment
        segIdx++;
        charIdx = 0;
        setTimeout(typeNext, 150);
      }
    }

    typeNext();
  }

  // ── Initialize ─────────────────────────────────────────────
  logo.style.opacity = '0';
  beam.style.opacity = '0';
  flash.style.opacity = '0';
  dust.style.opacity = '0';
  typed.textContent = '';

  // ── Phase 1: show "25/24" for 400ms then start countdown ──
  counter.textContent = '25/24';
  setTimeout(() => {
    initAudio();
    startCountdown();
  }, 400);

  // ── Phase 2: count 23→0 in 2.5s, beam warms up ────────────
  function startCountdown() {
    startProjectorSound();
    createDustParticles();

    let count = 23;
    const STEP = 2500 / TOTAL; // ~104ms per tick

    counter.textContent = '23';

    const tick = setInterval(() => {
      count--;
      counter.textContent = count;
      const progress = (23 - count) / 23; // 0→1

      // Beam gradually appears
      beam.style.opacity = (Math.pow(progress, 2) * 0.5).toString();

      // Dust from 60%
      if (progress > 0.6) {
        dust.style.opacity = ((progress - 0.6) / 0.4 * 0.25).toString();
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

  // ── Phase 3: flash → typewriter ────────────────────────────
  function onCountdownDone() {
    fadeOutSound();
    counter.style.transition = 'opacity .3s';
    counter.style.opacity = '0';
    setTimeout(() => { counter.style.display = 'none'; }, 300);

    // Flash
    flash.style.opacity = '1';
    setTimeout(() => {
      flash.style.transition = 'opacity .4s ease';
      flash.style.opacity = '0';
    }, 100);

    // Beam to full
    setTimeout(() => {
      beam.style.transition = 'opacity .8s ease';
      beam.style.opacity = '1';
    }, 120);

    // Show logo area and start typing
    setTimeout(() => {
      logo.style.transition = 'opacity .2s ease';
      logo.style.opacity = '1';

      typeWriter(function onDone() {
        // Dust to full
        dust.style.transition = 'opacity 1s ease';
        dust.style.opacity = '1';
        // Show enter prompt
        setTimeout(() => {
          enter.classList.add('vis');
          ready = true;
        }, 400);
      });
    }, 300);
  }

  // ── Phase 4: click → exit ──────────────────────────────────
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
