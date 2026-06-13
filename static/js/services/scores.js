// Scores service — persists to Django backend + localStorage fallback.
// POST /api/scores/save/  →  save a result
// GET  /api/scores/       →  global leaderboard

const SCORES_KEY = 'ntf_scores';

// Save score: send to backend AND keep local copy for instant UI.
async function saveScore(nick, genre, level, score) {
  const entry = {nick, genre, level, score, ts: Date.now()};
  const duration_ms = S.sessionMs || null;

  // Local fallback (instant, no network needed)
  const all = getScores();
  all.unshift(entry);
  localStorage.setItem(SCORES_KEY, JSON.stringify(all.slice(0, 100)));

  // Backend persist (fire-and-forget; don't block UI)
  try {
    await fetch('/api/scores/save/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      body: JSON.stringify({nick, genre, level, score, duration_ms}),
    });
  } catch {
    // Network error — local copy is enough
  }
}

// Retrieve local scores from localStorage.
function getScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY)) || [];
  } catch {
    return [];
  }
}

// Fetch global top scores from backend.
async function getGlobalScores(level) {
  try {
    const url = level ? `/api/scores/?level=${level}` : '/api/scores/';
    const res  = await fetch(url);
    const data = await res.json();
    return data.scores || [];
  } catch {
    return [];
  }
}

// Read CSRF token from Django cookie.
function getCsrfToken() {
  const m = document.cookie.match(/csrftoken=([^;]+)/);
  return m ? m[1] : '';
}
