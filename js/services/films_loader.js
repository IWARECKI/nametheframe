// Films loader service — fetches films from Django API with JS fallback.
// The static FILMS array (from data/films.js) is always available as a baseline.
// This module tries to override it with fresh data from the backend.

// Try to load films from API, fall back to static FILMS array.
async function loadFilmsFromAPI() {
  try {
    const resp = await fetch('/api/films/');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.films && data.films.length > 0) {
      // Override the global FILMS array with API data
      FILMS.length = 0;
      data.films.forEach(f => FILMS.push(f));
      console.log(`Loaded ${FILMS.length} films from API`);
    }
  } catch (e) {
    console.log('API unavailable, using static FILMS:', e.message);
    // FILMS array from films.js is already loaded, nothing to do
  }
}

// Log a game round result to the backend for per-film statistics.
// Fire-and-forget — failures are silently ignored.
function logRound(filmId, guessed) {
  fetch('/api/rounds/log/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({ film_id: filmId, guessed: guessed }),
  }).catch(() => {}); // fire and forget
}
