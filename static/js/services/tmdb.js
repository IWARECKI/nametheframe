// TMDB service — backdrops fetched via Django proxy (/api/backdrops/<id>/)
// API key lives on the server; JS never sees it.

// In-memory image cache: { [filmId]: string[] }  (full URLs)
const tmdbCache = {};

// Fetch and cache backdrop URLs for a single film via backend proxy.
async function loadFilmImages(film) {
  try {
    const res  = await fetch(`/api/backdrops/${film.id}/`);
    const data = await res.json();
    tmdbCache[film.id] = data.backdrops || [];
  } catch {
    tmdbCache[film.id] = [];
  }
}

// Preload all films in parallel before the game starts.
async function preloadAllFilms() {
  await Promise.all(FILMS.map(loadFilmImages));
}

// Pick a random cached backdrop URL for a given film id.
// Returns null if none available.
function getRandomBackdrop(filmId) {
  const bds = tmdbCache[filmId] || [];
  if (!bds.length) return null;
  return bds[Math.floor(Math.random() * bds.length)];
}
