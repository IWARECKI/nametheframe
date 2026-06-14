# Implementation Plan: Karta Widza (Player Profile Panel MVP)

## Overview

Backend-first implementation: model + migration + signal + views + urls, then frontend HTML/CSS/JS, and finally integration wiring. The `PlayerProfile` model uses denormalized counters. `games_played` is derived from `Score.count()` via signal; `frames_guessed` is passed from the frontend in the score-save payload and accumulated on the profile.

## Tasks

- [x] 1. Backend: PlayerProfile model and migration
  - [x] 1.1 Add PlayerProfile model to `game/models.py`
    - OneToOneField to User (related_name='profile')
    - `last_nick_change` DateTimeField (null=True, blank=True)
    - `games_played` PositiveIntegerField (default=0)
    - `frames_guessed` PositiveIntegerField (default=0)
    - `__str__` returning user display info
    - _Requirements: 6.1, 10.1_

  - [x] 1.2 Generate and apply Django migration `0006_playerprofile`
    - Run `python manage.py makemigrations game`
    - Verify migration file created
    - _Requirements: 10.1_

- [x] 2. Backend: Signal to update profile counters on Score save
  - [x] 2.1 Create `game/signals.py` with `post_save` signal on Score
    - On `Score` creation (created=True), get_or_create PlayerProfile for the user
    - Set `profile.games_played = Score.objects.filter(user=instance.user).count()`
    - Increment `profile.frames_guessed` by the value of `instance.frames_guessed_count` (a transient attr set by the view, default 0)
    - Save with `update_fields`
    - _Requirements: 4.3, 4.4, 10.2_

  - [x] 2.2 Register signal in `game/apps.py` `ready()` method
    - Import `game.signals` inside `ready()`
    - _Requirements: 10.2_

  - [x] 2.3 Extend `api_scores_save` view to accept `frames_guessed` from request body
    - Parse optional `frames_guessed` int from payload (default 0)
    - Set `score_obj.frames_guessed_count = frames_guessed` as transient attribute before save (so signal can read it)
    - Or simpler: after Score.create, update profile directly in the view
    - _Requirements: 4.4_

- [x] 3. Backend: Profile API views and URL routing
  - [x] 3.1 Add `api_profile_stats` GET view to `game/views.py`
    - Return 403 if unauthenticated
    - get_or_create PlayerProfile
    - Return JSON: nick, games_played, frames_guessed, cooldown_remaining (days)
    - Compute cooldown from `last_nick_change`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Add `api_profile_nick` POST view to `game/views.py`
    - Return 403 if unauthenticated
    - Parse JSON body, strip nick
    - Validate length 1–22 → 400
    - Check uniqueness (case-insensitive) against User.first_name + Score.nick excluding self → 409
    - Check cooldown (30 days) → 429 with remaining_days
    - Persist: update User.first_name, set PlayerProfile.last_nick_change
    - Return `{ok: true, nick}`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 3.3 Add URL patterns to `game/urls.py`
    - `path('api/profile/stats/', views.api_profile_stats, name='api_profile_stats')`
    - `path('api/profile/nick/', views.api_profile_nick, name='api_profile_nick')`
    - _Requirements: 4.1, 7.1_

- [x] 4. Checkpoint – Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Frontend: HTML markup in index.html template
  - [x] 5.1 Add Golden Ticket button to the setup section of the template
    - `<button class="golden-ticket" id="golden-ticket">🎫</button>`
    - Include `aria-label="Otwórz profil gracza"`
    - Position: fixed top-right, visible in setup screen
    - _Requirements: 1.1, 1.3_

  - [x] 5.2 Add Profile Panel HTML structure to the template
    - Slide-in panel with role="dialog", aria-label="Profil gracza"
    - Close button, title "Karta Widza", nick display, stats (games + frames)
    - Nick change form: input (maxlength=22), submit button, cooldown display, error span
    - Backdrop overlay div for click-to-close
    - _Requirements: 3.1, 3.4, 3.5, 5.1, 6.4_

- [x] 6. Frontend: CSS styles in `static/css/main.css`
  - [x] 6.1 Add Golden Ticket styles
    - Position fixed, top-right, z-index above game
    - Gold shimmer animation (@keyframes)
    - Hover: scale(1.05) with smooth transition
    - _Requirements: 1.2, 1.3_

  - [x] 6.2 Add Profile Panel styles
    - Panel: fixed right, full height, transform translateX(100%) default, translateX(0) when `.open`
    - Transition: cubic-bezier bounce animation
    - Backdrop: semi-transparent overlay
    - Stats layout, nick form, cooldown/error message styling
    - Responsive: full-width on mobile (<480px)
    - _Requirements: 3.4, 3.5, 6.4_

- [x] 7. Frontend: Profile panel JavaScript (`static/js/ui/profile.js`)
  - [x] 7.1 Implement `onGoldenTicketClick()` auth gate
    - Check `DJANGO_USER.authenticated`
    - If guest → redirect to login page
    - If authenticated → call `openProfilePanel()`
    - _Requirements: 2.1, 2.2_

  - [x] 7.2 Implement `openProfilePanel()` and `closeProfilePanel()`
    - Fetch GET `/api/profile/stats/`, render data into DOM
    - Add/remove `.open` class on panel element
    - Show/hide backdrop overlay
    - Handle cooldown state: disable button, show remaining days
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.4_

  - [x] 7.3 Implement `submitNickChange()`
    - Read input, validate length client-side
    - POST to `/api/profile/nick/` with CSRF token
    - On success: update display, play success sound
    - On error: show error message from response, play error buzz
    - _Requirements: 5.2, 5.3, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2_

  - [x] 7.4 Implement audio functions
    - `playTicketRevealSound()` — ascending shimmer using `getAudioCtx()`
    - `playPanelCloseSound()` — soft descending tone
    - `playNickChangeSuccess()` — bright confirmation ping
    - Reuse existing `playErrorBuzz()` for errors
    - _Requirements: 8.1, 8.2, 9.1, 9.2_

- [x] 8. Integration: Wire everything together
  - [x] 8.1 Add `<script src="static/js/ui/profile.js">` to template
    - Place after existing UI scripts so `getAudioCtx` and `DJANGO_USER` are available
    - Attach event listener to Golden Ticket button
    - _Requirements: 2.1, 2.2_

  - [x] 8.2 Update `saveScore()` in `js/services/scores.js` to pass `frames_guessed`
    - Count correct guesses from `S.history` (entries where `guessed === true`)
    - Include `frames_guessed` in the POST body to `/api/scores/save/`
    - _Requirements: 4.4_

- [x] 9. Checkpoint – Full integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 10. Property-based tests
  - [ ]* 10.1 Write property test for nick length validation
    - **Property 2: Nick length validation**
    - Generate random strings, verify 400 for empty/over-22-chars, verify user.first_name unchanged
    - **Validates: Requirements 5.2, 7.3**

  - [ ]* 10.2 Write property test for nick uniqueness enforcement
    - **Property 3: Nick uniqueness enforcement**
    - Generate random nick/user combinations, verify 409 when nick taken case-insensitively
    - **Validates: Requirements 5.3, 7.4**

  - [ ]* 10.3 Write property test for cooldown enforcement
    - **Property 4: Cooldown enforcement**
    - Generate random timestamps within 30 days, verify 429 + correct remaining_days
    - **Validates: Requirements 6.2, 7.5**

  - [ ]* 10.4 Write property test for successful nick change persistence
    - **Property 5: Successful nick change persistence**
    - Generate valid nicks, verify User.first_name updated + last_nick_change set
    - **Validates: Requirements 6.3, 7.2**

  - [ ]* 10.5 Write property test for auto-creation of PlayerProfile
    - **Property 6: Auto-creation of PlayerProfile**
    - Create users without profile, hit API, verify profile exists after
    - **Validates: Requirements 10.2**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- `frames_guessed` is tracked client-side (count of `S.history` entries with `guessed=true`) and sent to the backend in the score-save payload — this avoids needing `GameRound.session__user` joins which currently don't work (GameRound has no reliable user link)
- The signal on Score increments `profile.frames_guessed` by the count passed from the frontend, rather than querying GameRound
- `games_played` is simply `Score.objects.filter(user=user).count()` — always accurate
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.2", "3.3"] },
    { "id": 3, "tasks": ["2.3", "3.1", "3.2"] },
    { "id": 4, "tasks": ["5.1", "5.2"] },
    { "id": 5, "tasks": ["6.1", "6.2"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3", "7.4"] },
    { "id": 7, "tasks": ["8.1", "8.2"] },
    { "id": 8, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5"] }
  ]
}
```
