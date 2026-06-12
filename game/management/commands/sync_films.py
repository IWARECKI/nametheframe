"""
Management command to import/sync films from the JS file or TMDB API.

Usage:
    python manage.py sync_films                     # Import from js/data/films.js
    python manage.py sync_films --source tmdb --all # Sync all DB films from TMDB
    python manage.py sync_films --source tmdb --film-id 278 550
    python manage.py sync_films --source tmdb --all --backdrops --keywords
"""

import re
import time

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from game.models import Backdrop, Film


TIER_MAP = {
    'c': 'D',  # Classic → Mainstream Classics
    'a': 'B',  # Ambitious → Ambitious / Festival
    'r': 'A',  # Arthouse → Niche Arthouse
}


class Command(BaseCommand):
    help = 'Import/sync films from JS file or TMDB API.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source', choices=['js', 'tmdb'], default='js',
            help='Import from JS file or refresh from TMDB API (default: js)',
        )
        parser.add_argument(
            '--film-id', type=int, nargs='*',
            help='Specific TMDB film IDs to sync',
        )
        parser.add_argument(
            '--all', action='store_true',
            help='Sync all films in DB from TMDB',
        )
        parser.add_argument(
            '--backdrops', action='store_true',
            help='Also sync backdrops for each film',
        )
        parser.add_argument(
            '--keywords', action='store_true',
            help='Also fetch keywords for each film',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview what would be done without saving',
        )

    def handle(self, *args, **options):
        source = options['source']
        if source == 'js':
            self._import_from_js(options)
        else:
            self._sync_from_tmdb(options)

    # ── JS Import ─────────────────────────────────────────────────────────────

    def _import_from_js(self, options):
        """Parse js/data/films.js and create Film records."""
        from pathlib import Path

        js_path = Path(settings.BASE_DIR) / 'js' / 'data' / 'films.js'
        if not js_path.exists():
            self.stderr.write(self.style.ERROR(f'File not found: {js_path}'))
            return

        films_data = self._parse_films_js(js_path)
        self.stdout.write(f'Parsed {len(films_data)} films from {js_path.name}')

        created = 0
        skipped = 0
        dry_run = options['dry_run']

        for entry in films_data:
            exists = Film.objects.filter(tmdb_id=entry['tmdb_id']).exists()
            if exists:
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(f'  [DRY-RUN] Would create: {entry["title"]} ({entry["year"]})')
                created += 1
                continue

            Film.objects.create(
                tmdb_id=entry['tmdb_id'],
                title=entry['title'],
                director=entry['director'],
                year=entry['year'],
                tier=entry['tier'],
                is_active=True,
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. Created: {created}, Skipped (existing): {skipped}'
        ))

    def _parse_films_js(self, js_path):
        """Parse the films.js file and return a list of dicts."""
        content = js_path.read_text(encoding='utf-8')

        # Match each object in the FILMS array
        # Pattern: {id:278, title:'...', dir:'...', y:1994, t:'c'}
        pattern = re.compile(
            r"""\{\s*id\s*:\s*(\d+)\s*,"""
            r"""\s*title\s*:\s*(?:'([^']*)'|"([^"]*)")\s*,"""
            r"""\s*dir\s*:\s*(?:'([^']*)'|"([^"]*)")\s*,"""
            r"""\s*y\s*:\s*(\d{4})\s*,"""
            r"""\s*t\s*:\s*(?:'([^']*)'|"([^"]*)")\s*\}""",
            re.DOTALL,
        )

        results = []
        for m in pattern.finditer(content):
            tmdb_id = int(m.group(1))
            title = m.group(2) or m.group(3)
            director = m.group(4) or m.group(5)
            year = int(m.group(6))
            tier_old = m.group(7) or m.group(8)
            tier_new = TIER_MAP.get(tier_old, 'C')

            results.append({
                'tmdb_id': tmdb_id,
                'title': title,
                'director': director,
                'year': year,
                'tier': tier_new,
            })

        if not results:
            raise ValueError(f'No films found in {js_path}. File format may have changed.')

        return results

    # ── TMDB Sync ─────────────────────────────────────────────────────────────

    def _sync_from_tmdb(self, options):
        """Fetch metadata from TMDB API and update Film records."""
        film_ids = options.get('film_id')
        sync_all = options['all']
        include_backdrops = options['backdrops']
        include_keywords = options['keywords']
        dry_run = options['dry_run']

        if not film_ids and not sync_all:
            self.stderr.write(self.style.ERROR(
                'Specify --film-id <ids> or --all for TMDB sync.'
            ))
            return

        if film_ids:
            films = Film.objects.filter(tmdb_id__in=film_ids)
        else:
            films = Film.objects.all()

        total = films.count()
        self.stdout.write(f'Syncing {total} film(s) from TMDB...')

        synced = 0
        errors = 0
        backdrops_added = 0

        for film in films:
            try:
                if dry_run:
                    self.stdout.write(f'  [DRY-RUN] Would sync: {film.title} (tmdb_id={film.tmdb_id})')
                    synced += 1
                    continue

                self._sync_single_film(film, include_keywords)
                synced += 1

                if include_backdrops:
                    added = self._sync_backdrops(film)
                    backdrops_added += added

                self.stdout.write(f'  ✓ {film.title}')

            except Exception as e:
                errors += 1
                self.stderr.write(self.style.WARNING(f'  ✗ {film.title}: {e}'))

            time.sleep(0.25)  # Rate limit

        summary = f'Done. Synced: {synced}, Errors: {errors}'
        if include_backdrops:
            summary += f', Backdrops added: {backdrops_added}'
        self.stdout.write(self.style.SUCCESS(summary))

    def _sync_single_film(self, film, include_keywords=False):
        """Fetch movie details + credits from TMDB and update the Film record."""
        data = self._tmdb_get(f'/movie/{film.tmdb_id}', params={
            'append_to_response': 'credits',
        })

        # Extract director from crew
        crew = data.get('credits', {}).get('crew', [])
        directors = [c['name'] for c in crew if c.get('job') == 'Director']
        if directors:
            film.director = directors[0]

        # Extract cinematographer
        cinematographers = [c['name'] for c in crew if c.get('job') == 'Director of Photography']
        film.cinematographer = cinematographers[0] if cinematographers else ''

        # Extract composer
        composers = [c['name'] for c in crew if c.get('job') == 'Original Music Composer']
        film.composer = composers[0] if composers else ''

        # Extract top 5 cast
        cast = data.get('credits', {}).get('cast', [])
        film.cast_top5 = [c['name'] for c in cast[:5]]

        # Core fields
        film.title = data.get('title', film.title)
        film.original_title = data.get('original_title', '')
        film.overview = data.get('overview', '')
        film.poster_path = data.get('poster_path', '')
        film.tmdb_rating = data.get('vote_average')
        film.tmdb_vote_count = data.get('vote_count', 0)
        film.genres = [g['name'] for g in data.get('genres', [])]

        # Year from release_date
        release_date = data.get('release_date', '')
        if release_date:
            film.year = int(release_date[:4])

        # Country
        production_countries = data.get('production_countries', [])
        film.country = production_countries[0]['name'] if production_countries else ''
        film.countries = [c['name'] for c in production_countries]

        # Extended fields
        film.runtime = data.get('runtime')
        film.tagline = data.get('tagline', '')
        film.imdb_id = data.get('imdb_id', '')
        film.original_language = data.get('original_language', '')
        film.production_companies = [c['name'] for c in data.get('production_companies', [])]
        film.spoken_languages = [
            lang.get('english_name', lang.get('name', ''))
            for lang in data.get('spoken_languages', [])
        ]
        collection = data.get('belongs_to_collection')
        film.belongs_to_collection = collection['name'] if collection else ''
        film.budget = data.get('budget') or None
        film.revenue = data.get('revenue') or None

        # Keywords (separate request)
        if include_keywords:
            kw_data = self._tmdb_get(f'/movie/{film.tmdb_id}/keywords')
            film.keywords = [kw['name'] for kw in kw_data.get('keywords', [])]
            time.sleep(0.25)

        film.tmdb_last_synced = timezone.now()
        film.save()

    def _sync_backdrops(self, film):
        """Fetch backdrops from TMDB /images endpoint and create Backdrop records."""
        data = self._tmdb_get(f'/movie/{film.tmdb_id}/images')
        time.sleep(0.25)

        backdrops = data.get('backdrops', [])[:20]  # Cap at 20 per film
        added = 0

        for bd in backdrops:
            file_path = bd.get('file_path', '')
            if not file_path:
                continue

            _, created = Backdrop.objects.get_or_create(
                film=film,
                file_path=file_path,
                defaults={
                    'width': bd.get('width', 0),
                    'height': bd.get('height', 0),
                    'language': bd.get('iso_639_1') or '',
                    'status': 'active',
                },
            )
            if created:
                added += 1

        return added

    # ── TMDB HTTP helpers ─────────────────────────────────────────────────────

    def _tmdb_get(self, path, params=None):
        """Make a GET request to the TMDB API with retry on 429."""
        url = f'{settings.TMDB_BASE_URL}{path}'
        request_params = {'api_key': settings.TMDB_API_KEY}
        if params:
            request_params.update(params)

        response = requests.get(url, params=request_params, timeout=15)

        # Retry once on rate limit
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 2))
            time.sleep(retry_after)
            response = requests.get(url, params=request_params, timeout=15)

        response.raise_for_status()
        return response.json()
