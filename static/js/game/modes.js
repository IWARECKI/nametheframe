// Django equivalent: game/modes.py — question rendering per difficulty level
// In Django these would be view helpers or template tags that render
// different form widgets depending on the chosen game mode.

// Build the hangman letter structure for a given word.
// Returns an array of {ch, type, idx, revealed} descriptors.
// Django equivalent: a template tag that tokenizes a title string.
function buildHangman(word, revealedIdx) {
  const letters   = [];
  let letterCount = 0;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (ch === ' ' || ch === '-' || ch === ':') {
      letters.push({ch, type: 'space'});
    } else {
      letters.push({ch, type: 'letter', idx: letterCount, revealed: letterCount === revealedIdx});
      letterCount++;
    }
  }
  return letters;
}

// Render the hangman letter-box UI into #hangman-area.
function renderHangman(word, revealedIdx) {
  const area    = document.getElementById('hangman-area');
  const letters = buildHangman(word, revealedIdx);
  const boxes   = letters.map(l => {
    if (l.type === 'space')   return `<div class="hbox space"></div>`;
    if (l.revealed)            return `<div class="hbox revealed">${he(l.ch.toUpperCase())}</div>`;
    return `<div class="hbox"></div>`;
  }).join('');
  area.innerHTML = `
    <div class="hangman-wrap">
      <div class="hangman-label">Podpowiedź — jedna litera odkryta</div>
      <div class="hangman-boxes">${boxes}</div>
    </div>`;
}

// Render the question UI for the current round based on S.diff.
// Django equivalent: {% include "game/modes/"|add:diff|add:".html" %}
function renderQ() {
  const diff = S.diff;
  const f    = S.cur;
  const area = document.getElementById('aa');
  document.getElementById('hangman-area').innerHTML = '';

  if (diff === 'test') {
    // ── Akolita Popcornu: 4-option multiple choice ─────────────
    document.getElementById('qtxt').textContent = 'Jaki to film?';
    const correct = f.title;
    let opts = [correct], tries = 0;
    while (opts.length < 4 && tries++ < 40) {
      const candidate = FILMS[Math.floor(Math.random() * FILMS.length)].title;
      if (!opts.includes(candidate)) opts.push(candidate);
    }
    opts.sort(() => Math.random() - .5);
    area.innerHTML = `<div class="opts">${
      opts.map(o => `<button class="opt" onclick="cOpt(this,'${es(correct)}','${es(o)}')">${he(o)}</button>`).join('')
    }</div>`;

  } else if (diff === 'letter') {
    // ── Samozwańczy Kinoman: hangman + optional director ────────
    document.getElementById('qtxt').textContent = 'Jaki to film?';
    const word       = f.title;
    const letterOnly = word.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '');
    const revIdx     = letterOnly.length > 0 ? Math.floor(Math.random() * letterOnly.length) : 0;
    S.revealedIdx    = revIdx;
    renderHangman(word, revIdx);
    area.innerHTML = `
      <input class="ti" id="mi" placeholder="Wpisz tytuł…" autocomplete="off"
             onkeydown="if(event.key==='Enter')cLetter()">
      <div class="dir-bonus-wrap">
        <div class="dir-bonus-label">
          <span>Reżyser? (opcjonalnie)</span>
          <span class="dir-bonus-pts">+3 pkt / -1 pkt za błąd</span>
        </div>
        <input class="dir-input" id="di" placeholder="Wpisz reżysera lub zostaw puste…" autocomplete="off">
      </div>
      <button class="cb" onclick="cLetter()">Sprawdź</button>`;

  } else {
    // ── Orędownik Wielkiej Kinezy: title + year + optional director ─
    document.getElementById('qtxt').textContent = 'Tytuł, reżyser i rok?';
    area.innerHTML = `
      <input class="ti" id="et" placeholder="Tytuł…" autocomplete="off">
      <input class="ti" id="ey" placeholder="Rok…" autocomplete="off">
      <div class="dir-bonus-wrap">
        <div class="dir-bonus-label">
          <span>Reżyser? (opcjonalnie)</span>
          <span class="dir-bonus-pts">+3 pkt / -1 pkt za błąd</span>
        </div>
        <input class="dir-input" id="ed" placeholder="Wpisz reżysera lub zostaw puste…" autocomplete="off">
      </div>
      <button class="cb" onclick="cExpert()">Sprawdź</button>`;
  }
}
