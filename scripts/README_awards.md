# Awards Import — CSV Format

## File: `awards_sample.csv`

Sample data file for the `import_awards` management command. Contains 55 real award entries across 20 films from the database.

## CSV Columns

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `tmdb_id` | integer | yes | TMDB movie ID (must exist in the Film table) |
| `prize` | string | yes | Award ceremony key (see valid values below) |
| `category` | string | yes | Award category, e.g. "Best Picture", "Palme d'Or" |
| `year` | integer | yes | Year the award was given (ceremony year) |
| `person` | string | no | Recipient name (leave blank for film-level awards) |

## Valid Prize Keys

- `oscars` — Academy Awards (Oscars)
- `golden_globes` — Golden Globes
- `cannes` — Cannes Film Festival
- `bafta` — BAFTA
- `efa` — European Film Awards
- `venice` — Venice Film Festival
- `berlinale` — Berlin International Film Festival
- `sundance` — Sundance Film Festival

## Usage

```bash
# Preview what would be imported (no DB changes)
python manage.py import_awards scripts/awards_sample.csv --dry-run

# Import awards into the database
python manage.py import_awards scripts/awards_sample.csv

# Import from JSON format
python manage.py import_awards scripts/awards.json --format json
```

## Notes

- Films must be imported first (`sync_films --source js`) before running award import.
- Duplicate awards (same film + prize + category + year) are automatically skipped.
- Invalid prize keys or missing TMDB IDs are logged as errors but don't stop the import.
