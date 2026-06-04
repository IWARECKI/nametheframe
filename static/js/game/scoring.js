// Django equivalent: utils/scoring.py — pure scoring logic, no side effects
// These functions are stateless and easily unit-testable.
// In Django they'd live in a utils module and be tested with pytest.

// Normalize a string for fuzzy comparison:
// lowercase, remove diacritics, strip non-alphanumeric chars.
function nm(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

// Escape a string for safe use inside JS onclick attribute strings.
function es(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;');
}

// Escape HTML special characters to prevent XSS.
function he(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Compute Levenshtein edit distance between two strings.
// Django equivalent: could use python-Levenshtein or jellyfish library.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m + 1}, (_, i) =>
    Array.from({length: n + 1}, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// Accept a guess if it exactly matches or is within 1 edit of the correct answer.
// Comparison is normalized (see nm()).
function fuzzyMatch(guess, correct) {
  const g = nm(guess), c = nm(correct);
  return g === c || levenshtein(g, c) <= 1;
}

// Score a year guess with partial credit:
//   exact  → full basePts
//   ±1 yr  → 50%
//   ±2 yrs → 25%
//   further → 0
function yearScore(guess, correct, basePts) {
  const diff = Math.abs(parseInt(guess) - correct);
  if (diff === 0) return {pts: basePts, label: '✓ Dokładnie!'};
  if (diff === 1) return {pts: Math.round(basePts * .5), label: `⚡ Blisko! (±1 rok) +${Math.round(basePts * .5)} pkt`};
  if (diff === 2) return {pts: Math.round(basePts * .25), label: `⚡ Prawie (±2 lata) +${Math.round(basePts * .25)} pkt`};
  return {pts: 0, label: '✗ Rok daleki od prawdy'};
}
