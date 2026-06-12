# Implementation Plan: Film Admin Panel

## Overview

Migrate the film database from a static JavaScript array into Django/PostgreSQL with a rich admin interface, game statistics, full filtering, CSV export, and a public API endpoint. Implementation follows the 5-phase migration path from the design document.

## Tasks

- [x] 1. Phase 1 — Database Models & App Setup
  - [x] 1.1 Configure the game app with Polish verbose name "Baza filmów"
    - Update `game/apps.py` to set `verbose_name = 'Baza filmów'` in `GameConfig`
    - This ensures films appear under "Baza filmów" section in the Django admin sidebar
    - _Requirements: User requirement #1_

  - [x] 1.2 Create Film model with all fields from design
    - Add `Film` model to `game/models.py` with all TMDB metadata fields
    - `countries` field as `JSONField(default=list)` storing all production countries (not just primary)
    - Keep `country` as CharField for primary country display, add `countries` JSONField for full list
    - Include tier choices (A/B/C/D), cinema_era choices, auto-calculate era on save
    - Add `poster_url`, `imdb_url`, `active_backdrop_count` properties
    - Add composite indexes: `(tier, is_active)`, `(year,)`, `(cinema_era,)`
    - Set `verbose_name = 'Film'`, `verbose_name_plural = 'Filmy'`
    - _Requirements: Design Component 1, User requirement #4_

  - [x] 1.3 Create Backdrop model
    - Add `Backdrop` model to `game/models.py` with FK to Film, status management
    - Fields: film (FK), file_path, status (active/blocked/deleted), width, height, language, added
    - `unique_together = [('film', 'file_path')]`
    - Add `thumb_url` and `full_url` properties
    - Set `verbose_name = 'Kadr (backdrop)'`, `verbose_name_plural = 'Kadry (backdrops)'`
    - _Requirements: Design Component 2_

  - [x] 1.4 Create Award model
    - Add `Award` model to `game/models.py` with FK to Film
    - Fields: film (FK), prize (choices), category, year, person
    - Index on `(prize, year)`
    - Set `verbose_name = 'Award'`, `verbose_name_plural = 'Awards'`
    - _Requirements: Design Component 3_

  - [x] 1.5 Create GameRound model for game statistics tracking
    - Add `GameRound` model to `game/models.py` to log each round played
    - Fields: `film_id` (IntegerField, indexed), `shown_at` (DateTimeField auto_now_add), `guessed` (BooleanField), `session` (FK to Score, nullable)
    - This enables per-film stats: times_shown, times_guessed, guess_rate%
    - Add index on `film_id` for fast aggregation
    - _Requirements: User requirement #3_

  - [x] 1.6 Generate and run migrations
    - Run `python manage.py makemigrations game`
    - Run `python manage.py migrate`
    - Verify all models created correctly in DB
    - _Requirements: Design Phase 1_

- [x] 2. Phase 1 — Management Commands & Data Import
  - [x] 2.1 Create `sync_films` management command
    - Create `game/management/commands/sync_films.py`
    - Implement `parse_films_js()` — parse `js/data/films.js` extracting tmdb_id, title, director, year, tier
    - Implement tier mapping: `c→D`, `a→B`, `r→A` (add `C` tier for future use)
    - Implement `--source js` mode: seed Film table from films.js (184 films)
    - Implement `--source tmdb` mode: fetch full metadata from TMDB API (details + credits + keywords)
    - Extract all extended fields: runtime, tagline, imdb_id, original_language, production_companies, belongs_to_collection, spoken_languages, cast_top5, cinematographer, composer, keywords, budget, revenue
    - Populate `countries` JSONField from `production_countries` array (all countries, not just first)
    - Implement `--backdrops` flag to sync backdrop records
    - Implement `--keywords` flag to fetch keywords
    - Implement `--film-id` for specific films, `--all` for entire DB
    - Implement `--dry-run` for preview
    - Handle rate limiting (0.25s delay, retry on 429)
    - _Requirements: Design Component 5, User requirement #4_

  - [x] 2.2 Create `import_awards` management command
    - Create `game/management/commands/import_awards.py`
    - Support CSV format (columns: tmdb_id, prize, category, year, person)
    - Support JSON format (list of objects)
    - Match films by tmdb_id, skip duplicates (same film+prize+category+year)
    - Implement `--dry-run` flag
    - Log errors for invalid prizes or missing films
    - _Requirements: Design Component 6_

  - [ ]* 2.3 Write unit tests for parse_films_js and tier mapping
    - Test parsing the actual films.js file (expect 184 entries)
    - Test tier mapping: c→D, a→B, r→A
    - Test edge cases: malformed JS, missing fields
    - _Requirements: Design Testing Strategy_

- [x] 3. Checkpoint — Verify data import
  - Ensure all tests pass, ask the user if questions arise.
  - Run `sync_films --source js --backdrops` and verify 184 films imported
  - Run `sync_films --source tmdb --all --backdrops --keywords` to enrich metadata

- [x] 4. Phase 2 — Awards Import
  - [x] 4.1 Prepare awards data file and run import
    - Document expected CSV format in a README or help text
    - Ensure `import_awards` command works end-to-end
    - _Requirements: Design Phase 2_

- [x] 5. Phase 3 — Django Admin Panel
  - [x] 5.1 Create BackdropInline with thumbnail display
    - Add `BackdropInline` (TabularInline) in `game/admin.py`
    - Show thumbnail preview (60px height), file_path, status, width, language, added
    - Make file_path, width, height, language, added readonly
    - Status editable for block/unblock
    - _Requirements: Design Component 4_

  - [x] 5.2 Create AwardInline for film detail page
    - Add `AwardInline` (TabularInline) in `game/admin.py`
    - Fields: prize, category, year, person
    - Extra = 1 for easy adding
    - _Requirements: Design Component 4_

  - [x] 5.3 Register FilmAdmin with full list display and color-coded tiers
    - Register `FilmAdmin` in `game/admin.py`
    - List columns: poster thumbnail (w92), title, director, year, tier (color-coded badge), era, backdrop count, game stats (guess rate %)
    - Color-coded tier badges: D=green, C=yellow, B=orange, A=red
    - Implement `poster_thumb()` — show small poster image in list
    - Implement `tier_badge()` — colored span with tier letter
    - Implement `backdrop_count()` — annotated count of active backdrops
    - Implement `stats_display()` — show guess_rate% from GameRound aggregation
    - list_per_page = 50, search by title/original_title/director/tmdb_id/imdb_id
    - list_editable: is_active, tier, cinema_era
    - _Requirements: Design Component 4, User requirements #5, #6_

  - [x] 5.4 Implement full admin filtering
    - Add `list_filter` with: tier, cinema_era, country
    - Create custom `GenreFilter` for JSONField genres (extract unique genres from DB)
    - Create custom `LanguageFilter` for original_language
    - Create `HasBackdropsFilter` (yes/no based on active backdrop count)
    - Create `HasAwardsFilter` (yes/no based on award count)
    - Create `HasReportsFilter` ("Problematic" filter — films with FrameReport records)
    - Add is_active filter
    - _Requirements: User requirements #2, #8_

  - [x] 5.5 Configure FilmAdmin fieldsets and detail view
    - Organize fields into fieldsets: Film, TMDB Core, TMDB Extended (collapsible), Game, Timestamps (collapsible)
    - Add readonly fields: tmdb_id, tmdb_last_synced, created, updated, poster_preview, tmdb_link, imdb_link
    - Include inlines: AwardInline, BackdropInline
    - Add "Play this film" preview button in detail view (link to frontend with film pre-selected or TMDB page)
    - _Requirements: Design Component 4, User requirement #10_

  - [x] 5.6 Implement admin bulk actions
    - `sync_from_tmdb` — sync selected films from TMDB API
    - `activate_films` / `deactivate_films` — bulk toggle is_active
    - `refresh_backdrops` — fetch new backdrops for selected films
    - `recalculate_eras` — recalculate cinema_era from year
    - _Requirements: Design Component 4_

  - [x] 5.7 Implement quick sync action icon in list view
    - Add a per-row "🔄" sync icon/link in list_display that triggers single-film TMDB sync
    - Implement custom admin URL for single-film sync action
    - Return to changelist after sync with success message
    - _Requirements: User requirement #7_

  - [x] 5.8 Implement CSV export action
    - Add admin action "Export to CSV" that exports filtered/selected films
    - Include columns: tmdb_id, title, director, year, tier, era, countries, genres, backdrop_count, guess_rate
    - Return HttpResponse with CSV content-type and attachment header
    - _Requirements: User requirement #9_

  - [x] 5.9 Register standalone AwardAdmin
    - Register `AwardAdmin` for bulk award management
    - list_display: film, prize, category, year, person
    - list_filter: prize, year
    - search_fields: film__title, category, person
    - autocomplete_fields: film (requires search_fields on FilmAdmin)
    - _Requirements: Design Component 4_

  - [x] 5.10 Migrate existing BlockedBackdrop records into Backdrop model
    - Write a data migration or management command
    - For each `BlockedBackdrop` record, find/create corresponding `Backdrop` with status='blocked'
    - Preserve existing blocked state
    - _Requirements: Design Phase 3, Correctness Property 14_

  - [ ]* 5.11 Write unit tests for admin custom methods
    - Test `tier_badge()` returns correct colors (D=green, C=yellow, B=orange, A=red)
    - Test `stats_display()` with mock GameRound data
    - Test CSV export action produces valid CSV
    - Test custom filters return correct querysets
    - _Requirements: Design Testing Strategy_

- [x] 6. Checkpoint — Verify admin panel
  - Ensure all tests pass, ask the user if questions arise.
  - Verify admin displays films with all columns, filters work, actions execute

- [x] 7. Phase 4 — Public API & Frontend Migration
  - [x] 7.1 Create /api/films/ endpoint
    - Add `api_films` view in `game/views.py`
    - Return JSON `{"films": [...]}` with keys: id, title, dir, y, t, era
    - Only return films where `is_active=True`
    - Support optional query params: `?tier=A&tier=B` and `?era=modern`
    - Add URL pattern in `game/urls.py`
    - _Requirements: Design Component 7, Correctness Properties 5, 6_

  - [x] 7.2 Update frontend to fetch from API with JS fallback
    - Modify `js/data/films.js` import logic or `js/app.js` to try `/api/films/` first
    - On API failure, fall back to static FILMS array
    - Update tier filtering to use A/B/C/D system
    - _Requirements: Design Phase 4_

  - [x] 7.3 Add GameRound logging to the game flow
    - Update the backend or add a new API endpoint `POST /api/rounds/log/`
    - Accept: film_id, guessed (boolean)
    - Create GameRound record on each round played
    - This feeds the per-film statistics in admin (times_shown, times_guessed, guess_rate)
    - _Requirements: User requirement #3_

  - [ ]* 7.4 Write unit tests for /api/films/ endpoint
    - Test response shape (all required keys present)
    - Test inactive films excluded
    - Test tier/era filtering
    - _Requirements: Design Testing Strategy, Correctness Properties 5, 6_

- [x] 8. Phase 5 — Cleanup & Final Integration
  - [x] 8.1 Wire GameRound stats into FilmAdmin display
    - Annotate Film queryset in `get_queryset()` with `times_shown`, `times_guessed` from GameRound
    - Calculate `guess_rate` as percentage
    - Display in list view stats column
    - _Requirements: User requirement #3_

  - [x] 8.2 Deprecate old BlockedBackdrop/BlockedFilm workflows
    - Update `api_backdrops` view to check Backdrop.status instead of BlockedBackdrop table
    - Update `api_backdrops` to check Film.is_active instead of BlockedFilm table
    - Remove in-memory TMDB_CACHE from views.py (backdrops now served from DB)
    - Keep old models for reference but add deprecation comments
    - _Requirements: Design Phase 5_

  - [x] 8.3 Update TMDB settings constant
    - Ensure `settings.TMDB_IMG_BASE` is defined (for poster/backdrop URL generation)
    - Verify all existing TMDB_API_KEY and TMDB_BASE_URL settings are in place
    - _Requirements: Design Dependencies_

  - [ ]* 8.4 Write integration tests for full sync → API flow
    - Test: import from JS → enrich from TMDB (mocked) → serve via API
    - Test: GameRound logging → stats display in admin
    - Test: backdrop sync preserves existing blocked status
    - _Requirements: Design Testing Strategy, Correctness Properties 3, 4_

- [x] 9. Final checkpoint — Full system verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify end-to-end: admin panel, API endpoint, frontend loading, game stats

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The `countries` field is a JSONField storing all production countries as a list (user requirement #4)
- GameRound model enables per-film game statistics without modifying the frontend Score model
- Color-coded tiers use CSS inline styles in admin: D=green (#4caf50), C=yellow (#ffc107), B=orange (#ff9800), A=red (#f44336)
- "Problematic" filter checks for films that have matching FrameReport records
- The "Play this film" button links to the game frontend with the film pre-loaded or opens TMDB page

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"] },
    { "id": 1, "tasks": ["1.6"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "4.1"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.9"] },
    { "id": 5, "tasks": ["5.3", "5.4", "5.5", "5.6"] },
    { "id": 6, "tasks": ["5.7", "5.8", "5.10"] },
    { "id": 7, "tasks": ["5.11", "7.1", "7.3"] },
    { "id": 8, "tasks": ["7.2", "7.4"] },
    { "id": 9, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 10, "tasks": ["8.4"] }
  ]
}
```
