// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIWUM: Usunięty JS z setup.js (refaktoryzacja 2026-06-14)
// Powód: Ekran startowy uproszczony do nick + przycisk.
// Karuzela poziomów, walidacja formularza z genre, toggleSpoiler, authBtnClick
// zostały usunięte. Zostawione tutaj na wypadek przywrócenia multi-level UI.
// ═══════════════════════════════════════════════════════════════════════════════

// Wire up live validation for nick and genre fields.
['nick-input', 'genre-select'].forEach(id => {
  document.getElementById(id).addEventListener('change', checkReady);
  document.getElementById(id).addEventListener('input',  checkReady);
});

// Enable/disable the start button based on form completeness.
function checkReady() {
  const nick  = document.getElementById('nick-input').value.trim();
  const genre = document.getElementById('genre-select').value;
  document.getElementById('start-btn').disabled = !(nick && genre && S.level);
}

// ── Circular Carousel ─────────────────────────────────────────────────────
// 4 cards: 0=Kasa, 1=Akolita, 2=Kinoman, 3=Kineza.
// Circular: wraps with modulo so Kineza→right→Kasa and Kasa→left→Kineza.

let _carouselIdx = 1; // start on Akolita Popcornu

const _CARD_LABELS = [
  'KASA BILETOWA',
  'AKOLITA POPCORNU',
  'KINOMAN',
  'WIELKA KINEZA',
];

function carouselTo(idx) {
  const carousel = document.getElementById('levels-carousel');
  const track    = document.getElementById('levels-track');
  if (!carousel || !track) return;
  const cards = [...track.querySelectorAll('.lvl-card')];
  const n = cards.length;
  if (!n) return;

  // Circular wrap
  _carouselIdx = ((idx % n) + n) % n;

  // Centre the active card
  const cw    = carousel.offsetWidth;
  const cardW = cards[0].offsetWidth;
  const gap   = parseFloat(getComputedStyle(track).gap) || 20;
  const tx    = (cw - cardW) / 2 - _carouselIdx * (cardW + gap);
  track.style.transform = `translateX(${tx}px)`;

  // Active class drives CSS accent colour + no blur
  cards.forEach((c, i) => c.classList.toggle('active', i === _carouselIdx));

  // Dynamic nav labels
  const prevEl  = document.getElementById('carousel-prev-label');
  const nextEl  = document.getElementById('carousel-next-label');
  if (prevEl) prevEl.textContent = 'poprzedni';
  if (nextEl) nextEl.textContent = 'następny';

  // Game state — auth card has no data-lvl, clears the level selection
  const lvl = cards[_carouselIdx].dataset.lvl || null;
  S.level = lvl;
  S.diff  = lvl === 'popcorn' ? 'test' : lvl === 'kinoman' ? 'letter' : lvl === 'kineza' ? 'expert' : null;
  checkReady();
}

// Called by onclick on playable level cards
function carouselSelect(card) {
  const cards = [...document.querySelectorAll('#levels-track .lvl-card')];
  carouselTo(cards.indexOf(card));
}

// Toggle the spoiler section on a level card.
function toggleSpoiler(e, btn) {
  e.stopPropagation();
  const content = btn.nextElementSibling;
  const isOpen  = content.classList.contains('open');
  document.querySelectorAll('.lvl-spoiler-content.open').forEach(el => {
    el.classList.remove('open');
    const b = el.previousElementSibling;
    b.textContent = '🔒 kliknij jeśli nie boisz się spoilerów';
    b.classList.remove('open');
  });
  if (!isOpen) {
    content.classList.add('open');
    btn.textContent = '🔓 schowaj mechanikę';
    btn.classList.add('open');
  }
}

// Auth button — show tooltip briefly, block bubbling to card
function authBtnClick(e, btn) {
  e.stopPropagation();
  btn.classList.add('tip-show');
  setTimeout(() => btn.classList.remove('tip-show'), 1800);
}

// Old startGame that required genre + level selection:
async function startGame() {
  const nick  = document.getElementById('nick-input').value.trim();
  const genre = document.getElementById('genre-select').value;
  if (!nick || !genre || !S.level) return;

  S.nick  = nick;
  S.genre = genre;

  const btn   = document.getElementById('start-btn');
  const flash = document.getElementById('screen-flash');

  btn.classList.add('firing');
  btn.disabled = true;

  setTimeout(() => {
    if (flash) flash.classList.add('bright');
    setTimeout(() => {
      if (flash) { flash.classList.remove('bright'); flash.classList.add('dim'); }
      setTimeout(() => { if (flash) flash.classList.remove('dim'); }, 600);
    }, 220);
  }, 420);

  await loadFilmsFromAPI();
  await Promise.all([
    preloadAllFilms(),
    new Promise(r => setTimeout(r, 700)),
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

// Init (old version): show carousel card 1 (Akolita) on load
window.addEventListener('load', () => {
  carouselTo(1);
  spawnSetupDust();
});
