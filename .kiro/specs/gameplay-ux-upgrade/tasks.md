# Implementation Plan: Gameplay UX Upgrade

## Overview

Implement five interconnected UX and backend improvements for the Name the Frame quiz game: responsive answer grid, film metadata pills, heart/favorite frame functionality, smart timer auto-advance, and backend film data enrichment. Changes span Django backend (models, views, URLs), vanilla JavaScript frontend (ui/game.js), and CSS (main.css).

## Tasks

- [x] 1. Backend Film Data Enrichment & HeartedFrame Model
  - [x] 1.1 Enrich the `/api/films/` endpoint with `country`, `era`, and `genres` fields
    - Modify `api_films` view in `game/views.py` to include `country` (from `Film.country`), `era` (from `Film.cinema_era`), and `genres` (from `Film.genres`) in the serialized film object
    - Update the `.only()` queryset call to fetch the new fields
    - Response shape: `{id, title, dir, y, t, era, country, genres}`
    - _Requirements: 2.6, 5.2_

  - [x] 1.2 Create the `HeartedFrame` model and migration
    - Add `HeartedFrame` model to `game/models.py` with fields: `user` (FK to User), `film` (FK to Film), `backdrop_path` (CharField max_length=120), `created` (DateTimeField auto_now_add)
    - Set `unique_together = [('user', 'film', 'backdrop_path')]`
    - Set Meta: `ordering = ['-created']`, `verbose_name = 'Ulubiony kadr'`
    - Run `python manage.py makemigrations` and `python manage.py migrate`
    - _Requirements: 3.6_

  - [x] 1.3 Implement the `/api/hearts/toggle/` endpoint
    - Add `api_hearts_toggle` view in `game/views.py` accepting POST with JSON body `{film_id, backdrop_path}`
    - If user is not authenticated, return HTTP 403 `{"error": "authentication required"}`
    - If JSON is invalid, return HTTP 400 `{"error": "invalid payload"}`
    - If film_id does not exist in Film table, return HTTP 404 `{"error": "film not found"}`
    - If HeartedFrame exists for (user, film, backdrop_path), delete it and return `{"hearted": false, "heart_count": N}`
    - If not exists, create it and return `{"hearted": true, "heart_count": N}`
    - `heart_count` = total HeartedFrame records for that user after the operation
    - Add URL pattern `path('api/hearts/toggle/', views.api_hearts_toggle, name='api_hearts_toggle')` in `game/urls.py`
    - _Requirements: 3.7, 3.8, 3.9_

  - [ ]* 1.4 Write property test for heart toggle idempotence (Property 3)
    - **Property 3: Heart toggle idempotence**
    - Using `hypothesis`, generate random (user, film, backdrop_path) tuples
    - Assert: toggle once creates HeartedFrame, toggle twice deletes it — net result is no record
    - **Validates: Requirements 3.7**

  - [ ]* 1.5 Write property test for heart toggle response shape (Property 4)
    - **Property 4: Heart toggle response shape**
    - Using `hypothesis`, generate random user with 0–10 existing hearts
    - Assert: response contains boolean `hearted` and integer `heart_count` equal to user's total HeartedFrame count
    - **Validates: Requirements 3.8**

  - [ ]* 1.6 Write property test for Film API serialization completeness (Property 2)
    - **Property 2: Film API serialization completeness**
    - Using `hypothesis`, generate Film instances with varied country, era, genres values
    - Assert: JSON response for each film contains all required keys: `id`, `title`, `dir`, `y`, `t`, `era`, `country`, `genres`
    - **Validates: Requirements 2.6, 5.2**

- [x] 2. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. CSS Responsive Grid & Visual Styles
  - [x] 3.1 Add responsive 2×2 grid layout for `.opts` container
    - In `css/main.css`, add a `@media (min-width: 768px)` rule for `.opts` with `grid-template-columns: 1fr 1fr`
    - Below 768px the existing single-column grid remains unchanged
    - Ensure both columns share available space evenly
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Add CSS styles for metadata pills
    - Add `.meta-pills` container styles (flex wrap, gap, margin-top)
    - Add `.pill` base styles: rounded pill shape (`border-radius: 12px`), subtle border (`1px solid var(--border)`), semi-transparent background (`rgba(6,6,6,.55)`), small monospace font consistent with dark cinema aesthetic
    - Add pill variant classes: `.pill-dir`, `.pill-year`, `.pill-country`, `.pill-era` with subtle color accents
    - _Requirements: 2.3, 2.4_

  - [x] 3.3 Add CSS styles for heart button
    - Add `.heart-btn` base styles: inline button, no background, heart emoji/icon, cursor pointer
    - Add `.heart-btn.hearted` state: neon red glow using `box-shadow` or `text-shadow` with red color
    - Add glow animation keyframes for the heart activation transition
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 3.4 Add CSS styles for smart timer progress bar on `.nbtn`
    - Add CSS custom property `--timer-progress: 0` on `.nbtn`
    - Add linear-gradient background using `--timer-progress` to create a fill effect (0% to 100% width over time)
    - Style the fill with a subtle gold/warm tone that fits the cinema aesthetic
    - _Requirements: 4.2_

- [x] 4. Frontend: Metadata Pills & Heart Button
  - [x] 4.1 Add `renderMetaPills(film)` function in `js/ui/game.js`
    - Define `ERA_LABELS` constant mapping era keys to Polish labels: `{silent: 'Era ciszy', golden: 'Złoty wiek', new_wave: 'Nowa fala', modern: 'Kino współczesne', contemporary: 'Najnowsze'}`
    - Create function that returns HTML string with `.meta-pills` container and individual `.pill` spans for director, year, country (if non-empty), and era (if non-empty)
    - Omit country pill if `film.country` is empty/falsy
    - Omit era pill if `film.era` is empty/falsy
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 4.2 Add `renderHeartButton()` function in `js/ui/game.js`
    - Create function that returns HTML for a `.heart-btn` button with ❤️ icon
    - Append after `.meta-pills` inside the `.frev` section
    - _Requirements: 3.1_

  - [x] 4.3 Integrate pills and heart button into `showResult()` and `sr()`
    - After setting `#frt` and `#frm` text content, inject `renderMetaPills(S.cur)` HTML into the `#fr` element
    - Append `renderHeartButton()` after the pills
    - Ensure pills render for both correct and incorrect answers
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 4.4 Implement heart button click handler with toggle API, audio, and glow
    - Add click event listener on `.heart-btn`
    - Check if user is authenticated (from global user state); if not, do nothing (no-op)
    - If authenticated: POST to `/api/hearts/toggle/` with `{film_id: S.cur.id, backdrop_path}` (backdrop_path from current `#bgimg` src)
    - On success with `hearted: true`: add `.hearted` class, play short Web Audio sine burst (catch errors silently)
    - On success with `hearted: false`: remove `.hearted` class
    - On network error: show brief "Brak połączenia" toast, revert button to previous state
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.5 Write property test for metadata pills rendering (Property 1)
    - **Property 1: Metadata pills render all non-empty fields and omit empty fields**
    - Using `fast-check`, generate random film objects with optional empty `country`/`era`
    - Assert: output HTML contains pills for non-empty fields only; country pill present iff `film.country` is non-empty
    - **Validates: Requirements 2.1, 2.5**

- [x] 5. Checkpoint - Ensure pills and heart functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Frontend: Smart Timer Auto-Advance
  - [x] 6.1 Implement `SmartTimer` class in `js/ui/game.js`
    - Create class with constructor taking `duration` (ms, default 7000) and `onComplete` callback
    - Implement `start()`: begins countdown using `requestAnimationFrame`, updates `--timer-progress` CSS var on `.nbtn`
    - Implement `pause()`: pauses the countdown, freezes progress at current position
    - Implement `resume()`: resumes from paused position
    - Implement `cancel()`: stops countdown and resets `--timer-progress` to 0
    - Implement `reset()`: alias for cancel
    - Progress grows linearly from 0 to 1 over the duration
    - When timer reaches 0, call `onComplete` (which triggers `nextRound()`)
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.2 Add activity-pause logic (mouse/touch detection with 3s debounce)
    - Add `mousemove` and `touchstart` event listeners on `#game` container
    - On activity detected: call `smartTimer.pause()`
    - Set a 3-second debounce timeout; after 3s of no activity, call `smartTimer.resume()`
    - Each new activity event resets the 3s debounce
    - _Requirements: 4.6, 4.7_

  - [x] 6.3 Wire SmartTimer into game flow
    - After `showResult()`/`sr()` displays the result and makes `.nbtn` visible, call `smartTimer.start()`
    - When player manually clicks `.nbtn`, call `smartTimer.cancel()` before proceeding to `nextRound()`
    - When a new round begins (in `nextRound()`), ensure timer is reset (`--timer-progress` to 0, no active countdown)
    - `.nbtn` remains clickable at all times during countdown
    - _Requirements: 4.4, 4.5, 4.8_

  - [ ]* 6.4 Write property test for timer progress linearity (Property 5)
    - **Property 5: Timer progress linearity**
    - Using `fast-check`, generate random elapsed values in [0, 7000]
    - Assert: `progress === elapsed / 7000` (linear relationship)
    - **Validates: Requirements 4.2**

  - [ ]* 6.5 Write property test for timer pause/resume position preservation (Property 6)
    - **Property 6: Timer pause/resume preserves position**
    - Using `fast-check`, generate random elapsed + random pause duration ≥ 3000ms
    - Assert: after resume, elapsed continues from the paused position — no time lost or gained
    - **Validates: Requirements 4.6, 4.7**

- [x] 7. Final Checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The Film model already has `country`, `cinema_era`, and `genres` fields — no new migration needed for those
- The `HeartedFrame` model is the only new migration required
- CSS changes go in `css/main.css` (source) — `static/css/main.css` is the served copy
- Frontend JS changes go in `js/ui/game.js` (source) — `static/js/ui/game.js` is the served copy
- Web Audio errors should be silently caught for browser compatibility
- PBT libraries: `fast-check` for JavaScript frontend properties, `hypothesis` for Django backend properties

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "3.1", "3.2", "3.3", "3.4"] },
    { "id": 1, "tasks": ["1.3", "4.1", "4.2"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.6", "4.3", "4.4"] },
    { "id": 3, "tasks": ["4.5", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3"] },
    { "id": 5, "tasks": ["6.4", "6.5"] }
  ]
}
```
