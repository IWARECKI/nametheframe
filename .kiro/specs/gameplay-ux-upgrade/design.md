# Design Document: Gameplay UX Upgrade

## Overview

This design covers five interconnected UX and backend improvements for the Name the Frame quiz game:

1. **Responsive Answer Grid** — CSS-only change to render the 4-option multiple-choice grid as 2×2 on desktop (≥768px)
2. **Film Metadata Pills** — Render director, year, country, and era as styled pill elements in the `.frev` reveal section after each answer
3. **Heart/Favorite Frame** — New `HeartedFrame` model + toggle API + frontend heart button with audio and glow feedback
4. **Smart Timer Auto-Advance** — 7-second countdown on the "Następny kadr" button with activity-pause logic
5. **Backend Film Data Enrichment** — Expose `country`, `era`, and `genres` fields in the `/api/films/` response

All changes are additive — existing game flow and scoring logic remain unchanged.

## Architecture

```mermaid
graph TD
    subgraph Frontend (Vanilla JS)
        A[game/modes.js - renderQ]
        B[ui/game.js - showResult / sr]
        C[ui/game.js - SmartTimer class]
        D[ui/game.js - Heart button handler]
    end

    subgraph CSS
        E[main.css - .opts grid + pills + heart + timer styles]
    end

    subgraph Backend (Django)
        F[Film model - country, era, genres already exist]
        G[api_films view - serialize extra fields]
        H[HeartedFrame model - new]
        I[api_hearts_toggle view - new]
    end

    A -->|renders .opts grid| E
    B -->|renders pills + heart btn| E
    C -->|auto-calls nextRound| A
    D -->|POST /api/hearts/toggle/| I
    I --> H
    G --> F
```

### Data Flow

1. **Film data**: `api_films` → adds `country`, `era`, `genres` to each film object → frontend receives on load via `films_loader.js`
2. **Answer submission**: existing `cOpt`/`cLetter`/`cExpert` → `showResult`/`sr` → now additionally renders pills + heart button
3. **Heart toggle**: click → `POST /api/hearts/toggle/` → backend creates/deletes `HeartedFrame` → returns `{hearted, heart_count}`
4. **Smart timer**: after `showResult`, timer starts → visual fill bar on `.nbtn` → auto-calls `nextRound()` at 7s unless paused/clicked

## Components and Interfaces

### 1. CSS Grid Layout (Requirement 1)

**File**: `css/main.css`

Add a media query targeting `.opts` to switch from single-column to `grid-template-columns: 1fr 1fr` at `min-width: 768px`. No JS changes needed — the existing `renderQ` already outputs 4 `.opt` buttons inside `.opts`.

### 2. Metadata Pills (Requirement 2)

**File**: `js/ui/game.js` — modify `showResult()` and `sr()`

New function `renderMetaPills(film)` returns HTML string of pill elements:
```
<div class="meta-pills">
  <span class="pill pill-dir">🎬 {film.dir}</span>
  <span class="pill pill-year">📅 {film.y}</span>
  <span class="pill pill-country">🌍 {film.country}</span>  <!-- omit if empty -->
  <span class="pill pill-era">⏳ {film.era_label}</span>
</div>
```

Injected into `#fr` (the `.frev` container) after the existing `#frt` and `#frm` elements.

**Era label mapping** (JS constant):
```js
const ERA_LABELS = {
  silent: 'Era ciszy',
  golden: 'Złoty wiek',
  new_wave: 'Nowa fala',
  modern: 'Kino współczesne',
  contemporary: 'Najnowsze',
};
```

### 3. Heart/Favorite (Requirement 3)

**Backend**:
- New model `HeartedFrame` in `game/models.py`
- New endpoint `POST /api/hearts/toggle/` in `game/views.py`
- New URL pattern in `game/urls.py`

**Frontend** (`js/ui/game.js`):
- `renderHeartButton()` — returns heart icon button HTML, appended after pills
- Click handler sends POST, toggles glow class, plays Web Audio click (short sine burst)
- Unauthenticated users: button rendered but click is a no-op (no API call)

### 4. Smart Timer (Requirement 4)

**File**: `js/ui/game.js` — new `SmartTimer` class

```
class SmartTimer {
  constructor(duration, onComplete)
  start()        // begins countdown, shows progress bar
  pause()        // pauses without resetting
  resume()       // resumes from paused position
  cancel()       // stops and resets to 0%
  reset()        // alias for cancel
}
```

Activity detection: `mousemove` and `touchstart` listeners on `#game` → call `pause()`, then set a 3-second debounce that calls `resume()`.

Progress bar: CSS variable `--timer-progress` on `.nbtn` drives a `linear-gradient` background fill.

### 5. Backend Enrichment (Requirement 5)

**File**: `game/views.py` — modify `api_films`

Add `country`, `era` (cinema_era), and `genres` to the serialized response. The `Film` model already has these fields. The `sync_films` command already populates `country` from TMDB production countries.

Updated film object shape:
```json
{
  "id": 278,
  "title": "The Shawshank Redemption",
  "dir": "Frank Darabont",
  "y": 1994,
  "t": "D",
  "era": "modern",
  "country": "United States of America",
  "genres": ["Drama", "Crime"]
}
```

## Data Models

### Existing: Film (unchanged)

Already contains `country` (CharField, max_length=100, blank=True), `cinema_era` (CharField, max_length=12), and `genres` (JSONField). No migration needed.

### New: HeartedFrame

```python
class HeartedFrame(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hearted_frames')
    film = models.ForeignKey(Film, on_delete=models.CASCADE, related_name='hearts')
    backdrop_path = models.CharField(max_length=120, help_text='TMDB backdrop file_path')
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'film', 'backdrop_path')]
        ordering = ['-created']
        verbose_name = 'Ulubiony kadr'
        verbose_name_plural = 'Ulubione kadry'
```

### Toggle API Request/Response

**POST** `/api/hearts/toggle/`

Request body:
```json
{"film_id": 278, "backdrop_path": "/abc123.jpg"}
```

Response (200):
```json
{"hearted": true, "heart_count": 7}
```

Response (403 — unauthenticated):
```json
{"error": "authentication required"}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Metadata pills render all non-empty fields and omit empty fields

*For any* film object with arbitrary metadata values, calling `renderMetaPills(film)` SHALL produce a pill element for each non-empty field (director, year, era) and SHALL include a country pill if and only if `film.country` is a non-empty string.

**Validates: Requirements 2.1, 2.5**

### Property 2: Film API serialization completeness

*For any* active Film model instance with arbitrary field values, the `/api/films/` endpoint SHALL serialize it as an object containing all required keys: `id`, `title`, `dir`, `y`, `t`, `era`, `country`, and `genres`.

**Validates: Requirements 2.6, 5.2**

### Property 3: Heart toggle idempotence

*For any* authenticated user, film, and backdrop_path combination, calling the toggle endpoint once SHALL create a HeartedFrame record, and calling it a second time SHALL delete that record — resulting in no HeartedFrame for that combination. Toggling twice is equivalent to not toggling at all.

**Validates: Requirements 3.7**

### Property 4: Heart toggle response shape

*For any* toggle request from an authenticated user, the response SHALL contain a boolean field `hearted` and an integer field `heart_count` where `heart_count` equals the total number of HeartedFrame records for that user after the toggle operation.

**Validates: Requirements 3.8**

### Property 5: Timer progress linearity

*For any* elapsed time `t` where `0 ≤ t ≤ duration`, the SmartTimer's progress value SHALL equal `t / duration` (i.e., progress grows linearly from 0 to 1 over the configured duration).

**Validates: Requirements 4.2**

### Property 6: Timer pause/resume preserves position

*For any* SmartTimer in a running state with elapsed time `t`, pausing SHALL freeze the progress at `t / duration`. After exactly 3000ms of no activity, resuming SHALL continue from elapsed time `t` — no time is lost or gained during the pause.

**Validates: Requirements 4.6, 4.7**

## Error Handling

| Scenario | Handling |
|----------|----------|
| `/api/hearts/toggle/` called without auth | Return HTTP 403 `{"error": "authentication required"}` |
| `/api/hearts/toggle/` with invalid JSON body | Return HTTP 400 `{"error": "invalid payload"}` |
| `/api/hearts/toggle/` with non-existent film_id | Return HTTP 404 `{"error": "film not found"}` |
| Film has empty `country` field | Frontend omits country pill — no error |
| Film has empty `cinema_era` field | Frontend omits era pill gracefully |
| Backdrop image fails to load during heart | Heart button still functions — backdrop_path stored from URL |
| SmartTimer encounters navigation away | Timer cancelled on `#game` hide — no orphan timers |
| Web Audio not available (older browsers) | Catch error silently — heart still toggles without sound |
| Network error on heart toggle POST | Show brief toast "Brak połączenia" — button reverts to previous state |

## Testing Strategy

### Unit Tests (Example-Based)

| Test | What it verifies |
|------|------------------|
| CSS grid at 767px viewport | Single-column `.opts` layout |
| CSS grid at 768px viewport | 2-column `.opts` layout |
| Pills render on correct answer | `showResult('ok', ...)` includes `.meta-pills` |
| Pills render on incorrect answer | `sr(false, ...)` includes `.meta-pills` |
| Heart click unauthenticated | No fetch call dispatched |
| Heart glow on hearted:true response | `.heart-btn` has `.hearted` class |
| Heart un-glow on hearted:false | `.heart-btn` lacks `.hearted` class |
| Timer starts on button visible | Timer running after showResult |
| Manual click cancels timer | Timer stopped, progress reset |
| New round resets timer | Timer at 0%, no countdown active |
| 403 on unauthenticated toggle | Response status 403 |
| sync_films populates country | Mock TMDB, verify field saved |

### Property-Based Tests

Each property test runs a minimum of **100 iterations** with randomized inputs.

| Property | Generator | Assertion |
|----------|-----------|-----------|
| 1: Metadata pills rendering | Random film objects with optional empty `country`/`era` | Output HTML contains pills for non-empty fields only |
| 2: API serialization | Random Film model instances (varied country, era, genres) | JSON response contains all required keys |
| 3: Toggle idempotence | Random (user, film_id, backdrop_path) tuples | After 2 toggles, no HeartedFrame exists |
| 4: Toggle response shape | Random user with 0–10 existing hearts | Response has boolean `hearted`, integer `heart_count` = user's total |
| 5: Timer progress linearity | Random elapsed values in [0, 7000] | `progress === elapsed / 7000` |
| 6: Pause/resume position | Random elapsed + random pause duration ≥ 3000ms | Resumed elapsed === paused elapsed |

**PBT Library**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript) for frontend properties (1, 5, 6) and Django's hypothesis integration via [hypothesis](https://hypothesis.readthedocs.io/) for backend properties (2, 3, 4).

**Tag format**: Each property test is tagged with a comment:
```
// Feature: gameplay-ux-upgrade, Property {N}: {property text}
```

### Integration Tests

| Test | Scope |
|------|-------|
| Full heart toggle flow | Auth user → toggle → verify DB record → toggle again → verify deleted |
| Film API with enriched data | Seed films → GET /api/films/ → verify all fields present |
| sync_films with TMDB mock | Run command → verify country populated from mock response |
