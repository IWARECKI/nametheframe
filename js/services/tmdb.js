// Django equivalent: services/tmdb.py — external API client
// In Django this would be a class-based service:
//   class TMDBService:
//       BASE_URL = 'https://api.themoviedb.org/3'
//       def get_backdrops(self, movie_id): ...
//
// API key is developer/personal, non-commercial use only.
// Images fetched per-film at game start and cached in memory.

const TMDB_KEY     = '1c61618d5544a3d8f83110b7b8444d61';
const TMDB_IMG     = 'https://image.tmdb.org/t/p/w1280';
const TMDB_APIBASE = 'https://api.themoviedb.org/3';

// In-memory image cache: { [filmId]: backdrop[] }
// Django equivalent: Django cache framework (django.core.cache)
const tmdbCache = {};

// Fetch and cache backdrop images for a single film.
// Prefers language-neutral backdrops sorted by vote_average.
async function loadFilmImages(film) {
  try {
    const res  = await fetch(`${TMDB_APIBASE}/movie/${film.id}/images?api_key=${TMDB_KEY}`);
    const data = await res.json();
    const neutral = (data.backdrops || [])
      .filter(b => !b.iso_639_1)
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 8);
    tmdbCache[film.id] = neutral.length ? neutral : (data.backdrops || []).slice(0, 3);
  } catch {
    tmdbCache[film.id] = [];
  }
}

// Preload all films in parallel before the game starts.
async function preloadAllFilms() {
  await Promise.all(FILMS.map(loadFilmImages));
}

// Pick a random cached backdrop path for a given film id.
// Returns null if no backdrops are available.
function getRandomBackdrop(filmId) {
  const bds = tmdbCache[filmId] || [];
  if (!bds.length) return null;
  return TMDB_IMG + bds[Math.floor(Math.random() * bds.length)].file_path;
}
