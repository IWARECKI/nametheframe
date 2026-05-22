// Django equivalent: views/setup.py + forms/setup.py
// In Django:
//   class SetupForm(forms.Form):
//       nick  = forms.CharField(max_length=22)
//       genre = forms.ChoiceField(choices=GENRE_CHOICES)
//   class SetupView(FormView):
//       form_class = SetupForm
//       def form_valid(self, form): ...  # start session, redirect to game

// Wire up live validation for nick and genre fields.
['nick-input', 'genre-select'].forEach(id => {
  document.getElementById(id).addEventListener('change', checkReady);
  document.getElementById(id).addEventListener('input',  checkReady);
});

// Enable/disable the start button based on form completeness.
// Django equivalent: form.is_valid() — but handled client-side for UX.
function checkReady() {
  const nick  = document.getElementById('nick-input').value.trim();
  const genre = document.getElementById('genre-select').value;
  document.getElementById('start-btn').disabled = !(nick && genre && S.level);
}

// ── Circular Carousel ─────────────────────────────────────────────────────
// 4 cards: 0=Kasa, 1=Akolita, 2=Kinoman, 3=Kineza.
// Circular: wraps with modulo so Kineza→right→Kasa and Kasa→left→Kineza.
// Navigation labels update dynamically to show what's adjacent.

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

  // Dynamic nav labels — show what's adjacent (circular)
  const prevIdx = ((_carouselIdx - 1) + n) % n;
  const nextIdx = (_carouselIdx + 1) % n;
  const prevEl  = document.getElementById('carousel-prev-label');
  const nextEl  = document.getElementById('carousel-next-label');
  if (prevEl) prevEl.textContent = _CARD_LABELS[prevIdx] || '';
  if (nextEl) nextEl.textContent = _CARD_LABELS[nextIdx] || '';

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

// Initialise: show Akolita (idx 1) after first paint
window.addEventListener('load', () => { carouselTo(1); });

// Toggle the spoiler section on a level card.
// Isolated click event — does not bubble up to carouselSelect().
function toggleSpoiler(e, btn) {
  e.stopPropagation();
  const content = btn.nextElementSibling;
  const isOpen  = content.classList.contains('open');
  // Close any other open spoilers first
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

// Validate setup, fire projector animation, preload films, start game.
// Django equivalent: SetupView.form_valid() — saves session, redirects to game.
async function startGame() {
  const nick  = document.getElementById('nick-input').value.trim();
  const genre = document.getElementById('genre-select').value;
  if (!nick || !genre || !S.level) return;

  S.nick  = nick;
  S.genre = genre;

  const btn   = document.getElementById('start-btn');
  const flash = document.getElementById('screen-flash');

  // Phase 1: button fires (lamp explosion)
  btn.classList.add('firing');
  btn.disabled = true;

  // Phase 2: full-screen flash at peak of button animation (~450ms)
  setTimeout(() => {
    if (flash) flash.classList.add('bright');
    // Fade flash out after brief hold
    setTimeout(() => {
      if (flash) { flash.classList.remove('bright'); flash.classList.add('dim'); }
      setTimeout(() => { if (flash) flash.classList.remove('dim'); }, 600);
    }, 220);
  }, 420);

  // Phase 3: preload in background, then reveal game (min 700ms for animation)
  await Promise.all([
    preloadAllFilms(),
    new Promise(r => setTimeout(r, 700)),
  ]);

  S.round = 0;
  S.score = 0;
  S.used  = [];

  document.getElementById('mrnd').textContent  = ROUNDS_PER_GAME;
  document.getElementById('hnick').textContent = S.nick;
  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display  = 'flex';

  nextRound();
}

// Toggle scores panel on setup screen
function toggleScores() {
  const panel = document.getElementById('scores-panel');
  const isOpen = panel.classList.contains('open');

  if (isOpen) {
    panel.classList.remove('open');
    return;
  }

  // Render scores
  const scores = getScores();
  if (!scores.length) {
    panel.innerHTML = '<div class="sp-title">Tabela wyników</div><div class="sp-empty">Brak wyników — zagraj pierwszą grę!</div>';
  } else {
    const top = scores.sort((a, b) => b.score - a.score).slice(0, 50);
    const rows = top.map((s, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
      const lvl = s.level === 'popcorn' ? '🍿' : s.level === 'kinoman' ? '🎬' : '🎞️';
      const date = new Date(s.ts).toLocaleDateString('pl-PL', {day:'numeric', month:'short'});
      return `<div class="sp-row"><span class="sp-pos">${medal}</span><span class="sp-nick">${s.nick}</span><span class="sp-lvl">${lvl}</span><span class="sp-score">${s.score}</span><span class="sp-date">${date}</span></div>`;
    }).join('');
    panel.innerHTML = `<div class="sp-title">Tabela wyników</div>${rows}`;
  }

  panel.classList.add('open');
}
