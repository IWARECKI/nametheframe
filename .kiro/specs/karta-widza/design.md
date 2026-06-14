# Design Document: Karta Widza (Player Profile Panel MVP)

## Overview

The feature adds a lightweight profile panel to the existing Name the Frame SPA. It follows established patterns: Django backend serves JSON APIs, vanilla JS frontend consumes them, styles in the single CSS file. No new dependencies are introduced.

**Key decisions:**
- `PlayerProfile` model with denormalized counters (`games_played`, `frames_guessed`) updated via `post_save` signal on `Score` — avoids expensive joins through `GameRound.session` on every panel open
- Panel slides from right using CSS transform with a heavy cubic-bezier bounce
- Golden Ticket is `position: fixed` top-right, visible on setup screen only
- Audio reuses `getAudioCtx()` from `setup.js` (already global scope)
- Auth gate is frontend-only (check `DJANGO_USER.authenticated`); backend APIs enforce via `@login_required`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (vanilla JS)                                           │
│                                                                 │
│  index.html          static/js/ui/profile.js                    │
│  ┌────────────┐      ┌─────────────────────────────────┐       │
│  │Golden Ticket│─────▶│ onGoldenTicketClick()           │       │
│  │Profile Panel│◄─────│ openProfilePanel() / close...() │       │
│  │HTML markup  │      │ submitNickChange()              │       │
│  └────────────┘      │ playTicketRevealSound() etc.    │       │
│                       └─────────────┬───────────────────┘       │
│                                     │ fetch()                   │
└─────────────────────────────────────┼───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend (Django — game app)                                     │
│                                                                 │
│  game/urls.py        game/views.py                              │
│  ┌──────────────┐    ┌────────────────────────────────┐        │
│  │/api/profile/ │───▶│ api_profile_stats (GET)        │        │
│  │  stats/      │    │ api_profile_nick  (POST)       │        │
│  │  nick/       │    └───────────────┬────────────────┘        │
│  └──────────────┘                    │                          │
│                                      ▼                          │
│  game/models.py      game/signals.py                            │
│  ┌──────────────┐    ┌────────────────────────────────┐        │
│  │PlayerProfile │◄───│ post_save(Score) → update      │        │
│  │  user (1:1)  │    │ counters on profile            │        │
│  │  last_nick   │    └────────────────────────────────┘        │
│  │  games_played│                                               │
│  │  frames_guess│                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

**File changes:**
| File | Change |
|------|--------|
| `game/models.py` | Add `PlayerProfile` model |
| `game/signals.py` | New file — `post_save` signal on `Score` |
| `game/apps.py` | Register signal in `ready()` |
| `game/views.py` | Add `api_profile_stats`, `api_profile_nick` |
| `game/urls.py` | Add 2 new URL patterns |
| `game/migrations/0006_playerprofile.py` | Auto-generated migration |
| `templates/index.html` | Add Golden Ticket button + Profile Panel HTML |
| `static/js/ui/profile.js` | New file — panel logic, audio, nick form |
| `static/css/main.css` | Add Golden Ticket + Profile Panel styles |

## Components and Interfaces

### Backend Components

#### PlayerProfile Model

```python
class PlayerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    last_nick_change = models.DateTimeField(null=True, blank=True)
    games_played = models.PositiveIntegerField(default=0)
    frames_guessed = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f'Profile: {self.user.first_name or self.user.email}'
```

#### Signal: `update_profile_stats`

```python
# game/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Score, PlayerProfile, GameRound

@receiver(post_save, sender=Score)
def update_profile_stats(sender, instance, created, **kwargs):
    if not created or not instance.user:
        return
    profile, _ = PlayerProfile.objects.get_or_create(user=instance.user)
    profile.games_played = Score.objects.filter(user=instance.user).count()
    profile.frames_guessed = GameRound.objects.filter(
        session__user=instance.user, guessed=True
    ).count()
    profile.save(update_fields=['games_played', 'frames_guessed'])
```

#### API View: `api_profile_stats`

```python
@require_http_methods(['GET'])
def api_profile_stats(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'unauthorized'}, status=403)
    profile, _ = PlayerProfile.objects.get_or_create(user=request.user)
    nick = request.user.first_name or None

    # Compute cooldown
    cooldown_remaining = 0
    if profile.last_nick_change:
        elapsed = (timezone.now() - profile.last_nick_change).days
        if elapsed < 30:
            cooldown_remaining = 30 - elapsed

    return JsonResponse({
        'nick': nick,
        'games_played': profile.games_played,
        'frames_guessed': profile.frames_guessed,
        'cooldown_remaining': cooldown_remaining,
    })
```

#### API View: `api_profile_nick`

```python
@require_http_methods(['POST'])
def api_profile_nick(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'unauthorized'}, status=403)

    try:
        body = json.loads(request.body)
        nick = str(body.get('nick', '')).strip()
    except (json.JSONDecodeError, ValueError, TypeError):
        return JsonResponse({'error': 'invalid payload'}, status=400)

    # Length validation
    if not nick or len(nick) > 22:
        return JsonResponse({'error': 'Nick musi mieć 1-22 znaków'}, status=400)

    # Uniqueness (case-insensitive, exclude self)
    from django.contrib.auth.models import User
    taken_user = User.objects.filter(first_name__iexact=nick).exclude(pk=request.user.pk).exists()
    taken_score = Score.objects.filter(nick__iexact=nick).exclude(user=request.user).exists()
    if taken_user or taken_score:
        return JsonResponse({'error': 'Ten nick jest już zajęty'}, status=409)

    # Cooldown
    profile, _ = PlayerProfile.objects.get_or_create(user=request.user)
    if profile.last_nick_change:
        elapsed = (timezone.now() - profile.last_nick_change).days
        if elapsed < 30:
            remaining = 30 - elapsed
            return JsonResponse({
                'error': f'Zmiana nicku możliwa za {remaining} dni',
                'remaining_days': remaining,
            }, status=429)

    # Persist
    request.user.first_name = nick
    request.user.save(update_fields=['first_name'])
    profile.last_nick_change = timezone.now()
    profile.save(update_fields=['last_nick_change'])

    return JsonResponse({'ok': True, 'nick': nick})
```

### Frontend Components

#### `static/js/ui/profile.js`

| Function | Responsibility |
|----------|---------------|
| `onGoldenTicketClick()` | Auth gate — redirects guests to login, opens panel for authenticated |
| `openProfilePanel()` | Fetches stats, renders panel, adds `.open` class, plays reveal sound |
| `closeProfilePanel()` | Removes `.open` class, plays close sound |
| `renderProfileData(data)` | Populates DOM with nick, stats, cooldown state |
| `submitNickChange()` | Validates locally, POSTs to API, handles success/error + audio |
| `playTicketRevealSound()` | Web Audio ascending shimmer (reuses `getAudioCtx()`) |
| `playPanelCloseSound()` | Web Audio soft descending tone |
| `playNickChangeSuccess()` | Web Audio bright confirmation ping |

#### HTML Structure (added to `templates/index.html`)

```html
<!-- Golden Ticket — fixed top-right, visible on setup screen -->
<button class="golden-ticket" id="golden-ticket" onclick="onGoldenTicketClick()"
        aria-label="Otwórz profil gracza">🎫</button>

<!-- Profile Panel — slides from right -->
<div class="profile-panel" id="profile-panel" role="dialog" aria-label="Profil gracza">
  <button class="profile-close" onclick="closeProfilePanel()" aria-label="Zamknij">✕</button>
  <h2 class="profile-title">Karta Widza</h2>
  <div class="profile-nick-display" id="profile-nick">—</div>
  <div class="profile-stats">
    <div class="profile-stat">
      <span class="stat-value" id="profile-games">0</span>
      <span class="stat-label">Gry</span>
    </div>
    <div class="profile-stat">
      <span class="stat-value" id="profile-frames">0</span>
      <span class="stat-label">Zgadnięte kadry</span>
    </div>
  </div>
  <div class="profile-nick-form">
    <input type="text" id="profile-nick-input" maxlength="22" placeholder="Nowy nick…" />
    <button id="profile-nick-btn" onclick="submitNickChange()">Zmień nick</button>
    <span class="profile-cooldown" id="profile-cooldown"></span>
    <span class="profile-error" id="profile-nick-error"></span>
  </div>
</div>
<div class="profile-backdrop" id="profile-backdrop" onclick="closeProfilePanel()"></div>
```

### API Response Schemas

**GET `/api/profile/stats/` → 200**
```json
{
  "nick": "Filmowiec",
  "games_played": 42,
  "frames_guessed": 318,
  "cooldown_remaining": 12
}
```

**POST `/api/profile/nick/` → 200**
```json
{ "ok": true, "nick": "NowyNick" }
```

**POST `/api/profile/nick/` → 400 | 409 | 429**
```json
{ "error": "Opisowy komunikat błędu", "remaining_days": 12 }
```

### URL Routing (additions to `game/urls.py`)

```python
path('api/profile/stats/', views.api_profile_stats, name='api_profile_stats'),
path('api/profile/nick/', views.api_profile_nick, name='api_profile_nick'),
```

## Data Models

```
┌───────────────────────────┐       ┌───────────────────────────┐
│ auth.User                 │       │ game.PlayerProfile        │
├───────────────────────────┤  1:1  ├───────────────────────────┤
│ id (PK)                   │◄─────▶│ user (OneToOne FK)        │
│ first_name (nick)         │       │ last_nick_change (DT null)│
│ email                     │       │ games_played (uint, 0)    │
│ …                         │       │ frames_guessed (uint, 0)  │
└───────────────────────────┘       └───────────────────────────┘
         │ 1:N
         ▼
┌───────────────────────────┐
│ game.Score                │
├───────────────────────────┤        ┌──────────────────────────┐
│ user (FK → User, null)    │   1:N  │ game.GameRound           │
│ nick, level, score, ts    │◄──────▶│ session (FK → Score null)│
│ duration_ms               │        │ film_id, guessed, shown  │
└───────────────────────────┘        └──────────────────────────┘
```

**Why denormalized counters instead of live queries:**
- `GameRound.session` → `Score.user` is a two-hop join. For MVP this is fine but counters on `PlayerProfile` give O(1) reads.
- Counters are updated in a `post_save` signal on `Score` (fires once per completed game).
- Acceptable staleness: counters reflect state after the last completed game (not mid-game).

## Error Handling

| Scenario | HTTP Status | Frontend Behavior |
|----------|-------------|-------------------|
| Unauthenticated access to profile APIs | 403 | Should not occur (auth gate); if it does, silently fail |
| Nick empty or > 22 chars | 400 | Inline error message, error buzz sound |
| Nick already taken (case-insensitive) | 409 | Inline "nick zajęty" message, error buzz sound |
| Cooldown not elapsed (< 30 days) | 429 | Show remaining days, disable submit button, error buzz |
| Network failure on stats fetch | — | Panel shows "—" placeholder values |
| Network failure on nick change | — | Generic error message, error buzz |
| Malformed JSON in POST body | 400 | Generic error (should not happen from our form) |
| `get_or_create` race condition on PlayerProfile | — | Django handles via DB unique constraint; second call wins |

**Backend error pattern:** All API errors return `{ "error": "message" }` with appropriate HTTP status. The frontend checks `res.ok` and falls back to `data.error` for display.

**Audio on error:** Every client-side validation failure and every non-200 response triggers `playErrorBuzz()` for consistent tactile feedback matching the existing game UX.

## Testing Strategy

**Unit tests (Django TestCase):**
- Verify `api_profile_stats` returns correct counts for a user with known Score/GameRound data
- Verify `api_profile_nick` returns 400 for invalid length, 409 for taken nick, 429 for cooldown
- Verify `api_profile_stats` returns 403 for unauthenticated user
- Verify signal updates counters after Score creation

**Property-based tests (hypothesis):**
- Nick validation across randomly generated strings (length boundary testing)
- Uniqueness detection across randomly generated nick/user combinations
- Cooldown calculation across randomly generated timestamps

**Frontend (manual):**
- Golden Ticket visible on setup screen, not during game
- Panel opens/closes with animation
- Audio plays on interactions
- Nick change form validates and submits correctly

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stats computation correctness

*For any* authenticated user with N Score records and M GameRound records where `guessed=True` and `session__user` equals that user, the `/api/profile/stats/` endpoint SHALL return `games_played == N` and `frames_guessed == M`.

**Validates: Requirements 4.3, 4.4**

### Property 2: Nick length validation

*For any* string submitted as a nick, IF the string (after stripping) is empty or has length greater than 22 characters, THEN the `/api/profile/nick/` endpoint SHALL respond with HTTP 400 and the user's `first_name` SHALL remain unchanged.

**Validates: Requirements 5.2, 7.3**

### Property 3: Nick uniqueness enforcement

*For any* nick string N and any set of existing User.first_name values and Score.nick values, IF there exists another user (not the requester) whose `first_name` matches N case-insensitively, OR a `Score.nick` (not owned by requester) matches N case-insensitively, THEN the `/api/profile/nick/` endpoint SHALL respond with HTTP 409 and the user's `first_name` SHALL remain unchanged.

**Validates: Requirements 5.3, 7.4**

### Property 4: Cooldown enforcement

*For any* authenticated user whose `PlayerProfile.last_nick_change` timestamp is within 30 days of the current time, the `/api/profile/nick/` endpoint SHALL respond with HTTP 429, include the correct `remaining_days` value equal to `30 - days_elapsed`, and the user's nick SHALL remain unchanged.

**Validates: Requirements 6.2, 7.5**

### Property 5: Successful nick change persistence

*For any* valid nick (1-22 chars after strip, globally unique case-insensitively, no active cooldown), when submitted to `/api/profile/nick/`, the system SHALL update `User.first_name` to that nick AND set `PlayerProfile.last_nick_change` to approximately the current timestamp (within 1 second tolerance).

**Validates: Requirements 6.3, 7.2**

### Property 6: Auto-creation of PlayerProfile

*For any* authenticated user who has no existing PlayerProfile record, when any request is made to `/api/profile/nick/` or `/api/profile/stats/`, the system SHALL ensure a PlayerProfile record exists for that user after the request completes (via `get_or_create`).

**Validates: Requirements 10.2**
