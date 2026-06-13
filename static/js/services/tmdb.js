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

// Preload backdrops for a batch of films (parallel).
async function preloadFilmBatch(films) {
  await Promise.all(films.map(loadFilmImages));
}

// Preload enough films to start quickly (first 5), then continue in background.
async function preloadAllFilms() {
  const unloaded = FILMS.filter(f => !tmdbCache[f.id]);
  if (!unloaded.length) return;

  // Load first batch fast (enough for first few rounds)
  const firstBatch = unloaded.slice(0, 5);
  await preloadFilmBatch(firstBatch);

  // Continue loading the rest in background (non-blocking)
  const rest = unloaded.slice(5);
  if (rest.length) {
    // Load in chunks of 5 to avoid hammering the backend
    (async () => {
      for (let i = 0; i < rest.length; i += 5) {
        await preloadFilmBatch(rest.slice(i, i + 5));
      }
    })();
  }
}

// Pick a random cached backdrop URL for a given film id.
// Returns null if none available.
function getRandomBackdrop(filmId) {
  const bds = tmdbCache[filmId] || [];
  if (!bds.length) return null;
  return bds[Math.floor(Math.random() * bds.length)];
}
