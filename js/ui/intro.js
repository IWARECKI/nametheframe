// Intro: projector warm-up + typewriter logo + neon glow
// During countdown: beam warms up
// After countdown: typewriter types "Name the Frame" letter by letter
// Each word gets its neon glow class. Cursor blinks at end.

(function initIntro() {
  const intro   = document.getElementById('intro');
  const counter = document.getElementById('film-counter');
  const enter   = document.getElementById('frame-enter');
  const logo    = document.getElementById('intro-logo');
  const beam    = document.getElementById('projector-beam');
  const flash   = document.getElementById('projector-flash');
  const dust    = document.getElementById('dust-particles');
  const cursor  = document.getElementById('logo-cursor');

  const logoName  = document.getElementById('logo-name');
  const logoThe   = document.getElementById('logo-the');
  const logoFrame = document.getElementById('logo-frame');

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

  // ── Typewriter effect ──────────────────────────────────────
  function typeWriter(callback) {
    const words = [
      { el: logoName,  text: 'Name ' },
      { el: logoThe,   text: 'the ' },
      { el: logoFrame, text: 'Frame' }
    ];

    let wordIdx = 0;
    let charIdx = 0;
    const CHAR_DELAY = 90;    // ms per character
    const WORD_PAUSE = 200;   // pause between words

    function typeNext() {
      if (wordIdx >= words.length) {
        // Done typing — hide cursor after a moment
        setTimeout(() => {
          cursor.style.animation = 'cursor-blink .7s steps(1) infinite';
        }, 300);
        if (callback) callback();
        return;
      }

      const word = words[wordIdx];
      if (charIdx < word.text.length) {
        word.el.textContent += word.text[charIdx];
        charIdx++;
        // Slight randomness in typing speed for realism
        const jitter = CHAR_DELAY + (Math.random() - 0.5) * 40;
        setTimeout(typeNext, jitter);
      } else {
        // Move to next word
        wordIdx++;
        charIdx = 0;
        setTimeout(typeNext, WORD_PAUSE);
      }
    }

    typeNext();
  }

  // ── Initialize ─────────────────────────────────────────────
  logo.style.opacity = '0';
  beam.style.opacity = '0';
  flash.style.opacity = '0';
  dust.style.opacity = '0';
  cursor.style.opacity = '0';
  logoName.textContent = '';
  logoThe.textContent = '';
  logoFrame.textContent = '';

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

  // ── Phase 2: count 24→0, beam warms up ────────────────────
  function startCountdown() {
    startProjectorSound();
    createDustParticles();

    let count = TOTAL;
    const STEP = 4000 / TOTAL;

    const tick = setInterval(() => {
      count--;
      counter.textContent = count;
      const progress = (TOTAL - count) / TOTAL;

      // Beam gradually appears
      beam.style.opacity = (Math.pow(progress, 2) * 0.6).toString();

      // Dust starts at 60%
      if (progress > 0.6) {
        dust.style.opacity = ((progress - 0.6) / 0.4 * 0.3).toString();
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

  // ── Phase 3: flash → typewriter → glow ────────────────────
  function onCountdownDone() {
    fadeOutSound();
    counter.style.opacity = '0';
    setTimeout(() => { counter.style.display = 'none'; }, 300);

    // Flash
    flash.style.opacity = '1';
    setTimeout(() => {
      flash.style.transition = 'opacity .4s ease';
      flash.style.opacity = '0';
    }, 120);

    // Beam to full
    setTimeout(() => {
      beam.style.transition = 'opacity .8s ease';
      beam.style.opacity = '1';
    }, 150);

    // Show logo container + cursor, start typing
    setTimeout(() => {
      logo.style.transition = 'opacity .3s ease';
      logo.style.opacity = '1';
      cursor.style.opacity = '1';

      typeWriter(function onTypingDone() {
        // Dust to full
        dust.style.transition = 'opacity .8s ease';
        dust.style.opacity = '1';

        // Show "click to enter" after typing finishes
        setTimeout(() => {
          enter.classList.add('vis');
          ready = true;
        }, 500);
      });
    }, 400);
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
