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

// Mark a level card as selected and update S.diff accordingly.
// Django equivalent: a hidden form field updated via JS before submission.
function selectLevel(card) {
  document.querySelectorAll('.lvl-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');
  S.level = card.dataset.lvl;
  S.diff  = S.level === 'popcorn' ? 'test' : S.level === 'kinoman' ? 'letter' : 'expert';
  checkReady();
}

// Toggle the spoiler section on a level card.
// Isolated click event — does not bubble up to selectLevel().
function toggleSpoiler(e, btn) {
  e.stopPropagation();
  const content = btn.nextElementSibling;
  const isOpen  = content.classList.contains('open');
  // Close any other open spoilers first
  document.querySelectorAll('.lvl-spoiler-content.open').forEach(el => {
    el.classList.remove('open');
    el.previousElementSibling.textContent = 'kliknij jeśli nie boisz się spoilerów';
  });
  if (!isOpen) {
    content.classList.add('open');
    btn.textContent = '▲ schowaj spoiler';
  }
}

// Validate setup, preload all film images, then transition to the game.
// Django equivalent: SetupView.form_valid() — saves session, redirects to game.
async function startGame() {
  const nick  = document.getElementById('nick-input').value.trim();
  const genre = document.getElementById('genre-select').value;
  if (!nick || !genre || !S.level) return;

  S.nick  = nick;
  S.genre = genre;

  const btn = document.getElementById('start-btn');
  btn.textContent = '⏳  Ładowanie kadrów…';
  btn.disabled    = true;

  await preloadAllFilms();

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
