import csv
import json
from pathlib import Path

from django.core.management.base import BaseCommand

from game.models import Award, Film

VALID_PRIZE_KEYS = [
    'oscars', 'golden_globes', 'cannes', 'bafta',
    'efa', 'venice', 'berlinale', 'sundance',
]


class Command(BaseCommand):
    help = 'Bulk import awards from CSV or JSON file.'

    def add_arguments(self, parser):
        parser.add_argument('file', type=str, help='Path to CSV or JSON file')
        parser.add_argument(
            '--format', choices=['csv', 'json'], default='csv',
            help='File format (default: csv)',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Show what would be imported without saving',
        )

    def handle(self, *args, **options):
        file_path = Path(options['file'])
        file_format = options['format']
        dry_run = options['dry_run']

        if not file_path.exists():
            self.stderr.write(self.style.ERROR(f'File not found: {file_path}'))
            return

        # Parse entries from file
        if file_format == 'csv':
            entries = self._parse_csv(file_path)
        else:
            entries = self._parse_json(file_path)

        if entries is None:
            return

        created = 0
        skipped = 0
        errors = 0

        for entry in entries:
            tmdb_id = entry.get('tmdb_id')
            prize = entry.get('prize', '').strip()
            category = entry.get('category', '').strip()
            year = entry.get('year')
            person = entry.get('person', '').strip()

            # Validate prize
            if prize not in VALID_PRIZE_KEYS:
                self.stderr.write(self.style.ERROR(
                    f'Invalid prize "{prize}" for tmdb_id={tmdb_id}. '
                    f'Valid: {", ".join(VALID_PRIZE_KEYS)}'
                ))
                errors += 1
                continue

            # Find film by tmdb_id
            try:
                film = Film.objects.get(tmdb_id=tmdb_id)
            except Film.DoesNotExist:
                self.stderr.write(self.style.ERROR(
                    f'Film not found for tmdb_id={tmdb_id}. Skipping.'
                ))
                errors += 1
                continue

            # Check for duplicate
            exists = Award.objects.filter(
                film=film, prize=prize, category=category, year=year
            ).exists()
            if exists:
                skipped += 1
                continue

            # Create award
            if not dry_run:
                Award.objects.create(
                    film=film,
                    prize=prize,
                    category=category,
                    year=year,
                    person=person,
                )
            created += 1

        # Print summary
        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}Done. Created: {created}, Skipped (duplicates): {skipped}, Errors: {errors}'
        ))

    def _parse_csv(self, file_path):
        """Parse a CSV file with columns: tmdb_id, prize, category, year, person."""
        entries = []
        try:
            with open(file_path, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    try:
                        entry = {
                            'tmdb_id': int(row['tmdb_id']),
                            'prize': row.get('prize', ''),
                            'category': row.get('category', ''),
                            'year': int(row['year']),
                            'person': row.get('person', ''),
                        }
                        entries.append(entry)
                    except (ValueError, KeyError) as e:
                        self.stderr.write(self.style.ERROR(f'Malformed row: {row} — {e}'))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error reading CSV: {e}'))
            return None
        return entries

    def _parse_json(self, file_path):
        """Parse a JSON file with list of award objects."""
        try:
            with open(file_path, encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error reading JSON: {e}'))
            return None

        entries = []
        for item in data:
            try:
                entry = {
                    'tmdb_id': int(item['tmdb_id']),
                    'prize': item.get('prize', ''),
                    'category': item.get('category', ''),
                    'year': int(item['year']),
                    'person': item.get('person', ''),
                }
                entries.append(entry)
            except (ValueError, KeyError, TypeError) as e:
                self.stderr.write(self.style.ERROR(f'Malformed entry: {item} — {e}'))
        return entries
