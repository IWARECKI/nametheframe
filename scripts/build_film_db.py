"""
Build film database for Name the Frame.
Fetches films from TMDB using discovery API with smart filtering.
Outputs films_generated.js with ~500+ films tagged by tier.

Tiers (based on vote_count + vote_average):
  - classic (50%): vote_count > 5000, popular mainstream
  - ambitious (30%): vote_count 1000-5000, high rated
  - arthouse (20%): vote_count 200-1000, very high rated

Usage:
  python scripts/build_film_db.py

Requires: requests (pip install requests)
"""

import json
import time
import requests
from pathlib import Path

TMDB_KEY = '1c61618d5544a3d8f83110b7b8444d61'
BASE = 'https://api.themoviedb.org/3'
MIN_BACKDROPS = 2
OUTPUT_JS = Path(__file__).parent.parent / 'js' / 'data' / 'films.js'
OUTPUT_JSON = Path(__file__).parent / 'films_raw.json'

def api_get(endpoint, params=None):
    """TMDB API request with rate limiting."""
    if params is None:
        params = {}
    params['api_key'] = TMDB_KEY
    url = f'{BASE}{endpoint}'
    resp = requests.get(url, params=params)
    if resp.status_code == 429:
        print('  Rate limited, waiting 2s...')
        time.sleep(2)
        resp = requests.get(url, params=params)
    if resp.status_code != 200:
        print(f'  Error {resp.status_code}: {endpoint}')
        return None
    return resp.json()


def get_director(movie_id):
    """Get director name from credits."""
    data = api_get(f'/movie/{movie_id}/credits')
    if not data:
        return ''
    crew = data.get('crew', [])
    directors = [c['name'] for c in crew if c.get('job') == 'Director']
    return directors[0] if directors else ''


def count_backdrops(movie_id):
    """Count available backdrops (language-neutral preferred)."""
    data = api_get(f'/movie/{movie_id}/images')
    if not data:
        return 0
    backdrops = data.get('backdrops', [])
    # Prefer neutral (no language text overlay)
    neutral = [b for b in backdrops if not b.get('iso_639_1')]
    return len(neutral) if neutral else len(backdrops)

def discover_films(tier, pages=10):
    """
    Discover films from TMDB based on tier criteria.
    Returns list of {id, title, year, vote_avg, vote_count, genres}.
    """
    films = []
    
    if tier == 'classic':
        # Mainstream: very popular, well-known
        params = {
            'sort_by': 'vote_count.desc',
            'vote_average.gte': 7.0,
            'vote_count.gte': 5000,
            'with_original_language': 'en|fr|it|de|ja|ko|es|pl',
        }
    elif tier == 'ambitious':
        # Festival-level: high rated, moderately popular
        params = {
            'sort_by': 'vote_average.desc',
            'vote_average.gte': 7.5,
            'vote_count.gte': 1000,
            'vote_count.lte': 8000,
        }
    else:  # arthouse
        # Niche: very high rated, less popular
        params = {
            'sort_by': 'vote_average.desc',
            'vote_average.gte': 7.8,
            'vote_count.gte': 200,
            'vote_count.lte': 2000,
        }
    
    for page in range(1, pages + 1):
        params['page'] = page
        data = api_get('/discover/movie', params)
        if not data or 'results' not in data:
            break
        for m in data['results']:
            films.append({
                'id': m['id'],
                'title': m['title'],
                'year': int(m.get('release_date', '0000')[:4]) if m.get('release_date') else 0,
                'vote_avg': m.get('vote_average', 0),
                'vote_count': m.get('vote_count', 0),
                'genre_ids': m.get('genre_ids', []),
            })
        time.sleep(0.3)  # Be nice to API
    
    return films

def enrich_film(film):
    """Add director and verify backdrops for a single film."""
    film['director'] = get_director(film['id'])
    film['backdrops'] = count_backdrops(film['id'])
    time.sleep(0.15)
    return film


def main():
    print('=== Name the Frame — Film Database Builder ===\n')
    
    # Step 1: Discover films per tier
    all_films = {}
    
    for tier, target, pages in [
        ('classic', 250, 15),
        ('ambitious', 150, 12),
        ('arthouse', 100, 10),
    ]:
        print(f'Discovering {tier} films ({target} target, {pages} pages)...')
        films = discover_films(tier, pages)
        print(f'  Found {len(films)} candidates')
        
        # Deduplicate
        for f in films:
            if f['id'] not in all_films:
                f['tier'] = tier
                all_films[f['id']] = f
    
    print(f'\nTotal unique candidates: {len(all_films)}')
    
    # Step 2: Enrich with director + backdrop count
    print('\nEnriching films (director + backdrops)...')
    enriched = []
    for i, (fid, film) in enumerate(all_films.items()):
        if i % 50 == 0:
            print(f'  Processing {i}/{len(all_films)}...')
        enrich_film(film)
        if film['backdrops'] >= MIN_BACKDROPS and film['director']:
            enriched.append(film)
    
    print(f'\nFilms with {MIN_BACKDROPS}+ backdrops and director: {len(enriched)}')

    # Step 3: Balance tiers
    classic = [f for f in enriched if f['tier'] == 'classic'][:250]
    ambitious = [f for f in enriched if f['tier'] == 'ambitious'][:150]
    arthouse = [f for f in enriched if f['tier'] == 'arthouse'][:100]
    
    final = classic + ambitious + arthouse
    print(f'\nFinal selection: {len(final)} films')
    print(f'  Classic: {len(classic)}')
    print(f'  Ambitious: {len(ambitious)}')
    print(f'  Arthouse: {len(arthouse)}')
    
    # Step 4: Save raw JSON (for review)
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(final, f, ensure_ascii=False, indent=2)
    print(f'\nRaw JSON saved: {OUTPUT_JSON}')
    
    # Step 5: Generate JS file
    js_entries = []
    for film in final:
        title_escaped = film['title'].replace("'", "\\'")
        dir_escaped = film['director'].replace("'", "\\'")
        tier_char = film['tier'][0]  # c/a/r
        js_entries.append(
            f"  {{id:{film['id']},"
            f"title:'{title_escaped}',"
            f"dir:'{dir_escaped}',"
            f"y:{film['year']},"
            f"t:'{tier_char}'}}"
        )
    
    js_content = (
        '// Auto-generated film database for Name the Frame\n'
        f'// Generated: {time.strftime("%Y-%m-%d %H:%M")}\n'
        f'// Total: {len(final)} films '
        f'(classic:{len(classic)}, ambitious:{len(ambitious)}, '
        f'arthouse:{len(arthouse)})\n'
        '// Tier key: c=classic, a=ambitious, r=arthouse\n\n'
        'const FILMS = [\n'
        + ',\n'.join(js_entries) + '\n'
        '];\n'
    )
    
    OUTPUT_JS.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f'JS file saved: {OUTPUT_JS}')
    print('\nDone! Review films_raw.json and remove unwanted entries.')


if __name__ == '__main__':
    main()
