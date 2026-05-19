// Django equivalent: fixtures/films.json or a Film model in models.py
// In Django: python manage.py loaddata films.json
// Each entry maps to: Film(id=tmdb_id, title=..., director=..., year=...)
//
// TMDB IDs must be verified at themoviedb.org before adding.
// Films should span different decades, regions and genres.
// Avoid films without backdrops in TMDB.

const FILMS = [
  {id: 797,    title: 'Persona',          dir: 'Bergman',        y: 1966},
  {id: 1398,   title: 'Stalker',          dir: 'Tarkowski',      y: 1979},
  {id: 422,    title: '8½',               dir: 'Fellini',        y: 1963},
  {id: 11906,  title: 'Suspiria',         dir: 'Argento',        y: 1977},
  {id: 10234,  title: 'Funny Games',      dir: 'Haneke',         y: 1997},
  {id: 680,    title: 'Pulp Fiction',     dir: 'Tarantino',      y: 1994},
  {id: 1018,   title: 'Mulholland Drive', dir: 'Lynch',          y: 2001},
  {id: 670,    title: 'Oldboy',           dir: 'Park Chan-wook', y: 2003},
  {id: 758866, title: 'Drive My Car',     dir: 'Hamaguchi',      y: 2021},
  {id: 785398, title: 'EO',               dir: 'Skolimowski',    y: 2022},
];
