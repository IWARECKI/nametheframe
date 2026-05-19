// Django equivalent: views/game.py — handles game round interactions
// In Django each answer submission would be a POST request:
//   class AnswerView(LoginRequiredMixin, View):
//       def post(self, request): ...  # validate answer, update score, return JSON

// Called by the <img> onload event when a backdrop finishes loading.
function imgOK() {
  const loader = document.getElementById('floader');
  loader.style.opacity = '0';
  setTimeout(() => loader.style.display = 'none', 300);
}

// Called by the <img> onerror event if the backdrop fails to load.
function imgErr() {
  const loader = document.getElementById('floader');
  loader.textContent   = 'brak kadru';
  loader.style.opacity = '0.35';
}

// Handle a multiple-choice option click (Akolita Popcornu mode).
// Django equivalent: POST /game/answer/ with {type: 'test', picked: '...'}
function cOpt(btn, correct, picked) {
  document.querySelectorAll('.opt').forEach(b => {
    b.disabled = true;
    if (b.textContent.trim() === correct) b.classList.add('correct');
  });
  if (picked !== correct) btn.classList.add('wrong');
  sr(picked === correct, 1, correct, '');
}

// Handle answer submission in hangman mode (Samozwańczy Kinoman).
// Django equivalent: POST /game/answer/ with {type: 'letter', title: '...', director: '...'}
function cLetter() {
  const f     = S.cur;
  const title = document.getElementById('mi').value.trim();
  const dir   = (document.getElementById('di') || {value: ''}).value.trim();
  disableInputs();

  const titleOK = fuzzyMatch(title, f.title);
  let pts = 0, lines = [];

  if (titleOK) { pts += 2; lines.push(`✓ Tytuł: <strong>${he(f.title)}</strong> +2 pkt`); }
  else          {           lines.push(`✗ Tytuł: <strong>${he(f.title)}</strong>`); }

  if (dir) {
    // Accept if the normalized guess contains the director's last name
    const dirOK = nm(dir).includes(nm(f.dir).split(' ').pop());
    if (dirOK) { pts += 3; lines.push(`✓ Reżyser: <strong>${he(f.dir)}</strong> +3 pkt`); }
    else        { pts = Math.max(0, pts - 1); lines.push(`✗ Reżyser: <strong>${he(f.dir)}</strong> -1 pkt`); }
  }

  S.score += pts;
  showResult(pts > 0 ? 'ok' : 'bad', lines.join('<br>'));
}

// Handle answer submission in expert mode (Orędownik Wielkiej Kinezy).
// Django equivalent: POST /game/answer/ with {type: 'expert', title, year, director}
function cExpert() {
  const f     = S.cur;
  const title = document.getElementById('et').value.trim();
  const year  = document.getElementById('ey').value.trim();
  const dir   = (document.getElementById('ed') || {value: ''}).value.trim();
  disableInputs();

  let pts = 0, lines = [], partial = false;

  // Title: up to 3 pts
  const titleOK = fuzzyMatch(title, f.title);
  if (titleOK) { pts += 3; lines.push(`✓ Tytuł: <strong>${he(f.title)}</strong> +3 pkt`); }
  else          {           lines.push(`✗ Tytuł: <strong>${he(f.title)}</strong>`); }

  // Year: up to 2 pts with partial credit
  const ys = yearScore(year, f.y, 2);
  pts += ys.pts;
  if (ys.pts > 0 && ys.pts < 2) partial = true;
  lines.push(`${ys.pts > 0 ? '✓' : '✗'} Rok: <strong>${f.y}</strong> ${ys.label}`);

  // Director: optional bonus/penalty
  if (dir) {
    const dirOK = nm(dir).includes(nm(f.dir).split(' ').pop());
    if (dirOK) { pts += 3; lines.push(`✓ Reżyser: <strong>${he(f.dir)}</strong> +3 pkt`); }
    else        { pts = Math.max(0, pts - 1); lines.push(`✗ Reżyser: <strong>${he(f.dir)}</strong> -1 pkt`); }
  }

  S.score += pts;
  const cls = pts === 0 ? 'bad' : (partial || pts < 5) ? 'partial' : 'ok';
  showResult(cls, lines.join('<br>'));
}

// Disable all answer inputs after submission to prevent re-submitting.
function disableInputs() {
  document.querySelectorAll('.ti, .dir-input, .cb').forEach(el => el.disabled = true);
}

// Render the result box and film reveal after an answer is submitted.
// Django equivalent: the response JSON rendered into the page via JS,
// or a template partial returned by an HTMX endpoint.
function showResult(cls, html) {
  document.getElementById('pts').textContent = S.score;
  const rb = document.getElementById('rb');
  rb.className  = 'rbox ' + cls;
  rb.innerHTML  = html;
  rb.style.display = 'block';
  document.getElementById('frt').textContent = S.cur.title;
  document.getElementById('frm').textContent = `${S.cur.dir} · ${S.cur.y}`;
  document.getElementById('fr').style.display = 'block';
  document.getElementById('nb').style.display = 'block';
}

// Simplified result renderer used by multiple-choice mode (cOpt).
// Kept separate for clarity — test mode only has a binary correct/wrong state.
function sr(ok, pts, ct, ex) {
  if (ok) S.score += pts;
  document.getElementById('pts').textContent = S.score;
  const rb = document.getElementById('rb');
  rb.className = 'rbox ' + (ok ? 'ok' : 'bad');
  rb.innerHTML = ok
    ? `✓ &nbsp;Tak! &nbsp;<strong>${he(ct)}</strong> &nbsp;+${pts} pkt`
    : `✗ &nbsp;Nie. To: &nbsp;<strong>${he(ct)}</strong>${ex}`;
  rb.style.display = 'block';
  document.getElementById('frt').textContent = S.cur.title;
  document.getElementById('frm').textContent = `${S.cur.dir} · ${S.cur.y}`;
  document.getElementById('fr').style.display = 'block';
  document.getElementById('nb').style.display = 'block';
}
