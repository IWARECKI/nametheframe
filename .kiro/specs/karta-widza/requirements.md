# Requirements Document

## Introduction

Karta Widza (Player Profile Panel) is a lightweight MVP panel accessible from the main game screen via a "Złoty Bilet" (Golden Ticket) button. It provides authenticated players with basic profile stats (games played, frames guessed) and the ability to change their nick (with global uniqueness and a 30-day cooldown). Guest users see the golden ticket but are redirected to the login page. No XP, levels, or avatars are included in this version.

## Glossary

- **Profile_Panel**: The slide-in UI panel displaying the player's profile information, stats, and nick-change form
- **Golden_Ticket**: The animated golden button visible on the setup screen that opens the Profile_Panel
- **PlayerProfile**: A Django model (OneToOneField to User) storing the `last_nick_change` timestamp
- **Nick**: The player's display name (max 22 characters), stored as `User.first_name`, globally unique and case-insensitive
- **Nick_Cooldown**: A 30-day waiting period between nick changes, enforced via `PlayerProfile.last_nick_change`
- **Games_Played**: The count of Score records associated with the authenticated user
- **Frames_Guessed**: The count of GameRound records with `guessed=True` linked via the user's Score sessions
- **System**: The Name the Frame application (Django backend + vanilla JS frontend)

## Requirements

### Requirement 1: Golden Ticket Visibility

**User Story:** As a player (authenticated or guest), I want to see a golden ticket button on the setup screen, so that I know a profile feature exists.

#### Acceptance Criteria

1. THE System SHALL render the Golden_Ticket button element in the setup section of the index.html template
2. THE Golden_Ticket SHALL use a CSS gold shimmer animation to attract visual attention
3. WHEN a player hovers over the Golden_Ticket, THE System SHALL scale the Golden_Ticket element by a factor of 1.05 with a smooth transition

### Requirement 2: Golden Ticket Authentication Gate

**User Story:** As a product owner, I want only authenticated users to access the profile panel, so that guest accounts do not access profile features.

#### Acceptance Criteria

1. WHEN a guest user clicks the Golden_Ticket, THE System SHALL redirect the browser to the Django login page
2. WHEN an authenticated user clicks the Golden_Ticket, THE System SHALL open the Profile_Panel

### Requirement 3: Profile Panel Display

**User Story:** As an authenticated player, I want to see my profile stats in a panel, so that I can track my progress.

#### Acceptance Criteria

1. WHEN the Profile_Panel opens, THE System SHALL display the player's current Nick
2. WHEN the Profile_Panel opens, THE System SHALL display the Games_Played count computed from the Score model filtered by the authenticated user
3. WHEN the Profile_Panel opens, THE System SHALL display the Frames_Guessed count computed from the GameRound model where `guessed` equals True and the GameRound is linked to the user's Score sessions
4. THE Profile_Panel SHALL slide in from the right side of the viewport with a CSS transition
5. WHEN the player clicks outside the Profile_Panel or clicks a close button, THE System SHALL close the Profile_Panel with a slide-out transition

### Requirement 4: Profile Stats API Endpoint

**User Story:** As a frontend developer, I want a backend endpoint that returns the player's stats, so that the panel can fetch data without page reload.

#### Acceptance Criteria

1. THE System SHALL expose a GET endpoint at `/api/profile/stats/` that returns JSON containing the player's Nick, Games_Played, and Frames_Guessed
2. WHEN an unauthenticated request reaches `/api/profile/stats/`, THE System SHALL respond with HTTP 403 status
3. THE System SHALL compute Games_Played as the count of Score records where `user` equals the requesting user
4. THE System SHALL compute Frames_Guessed as the count of GameRound records where `guessed` equals True and `session__user` equals the requesting user

### Requirement 5: Nick Change Form

**User Story:** As an authenticated player, I want to change my nick from the profile panel, so that I can update my display name.

#### Acceptance Criteria

1. THE Profile_Panel SHALL display a text input pre-filled with the player's current Nick and a "Zmień nick" submit button
2. WHEN the player submits a new Nick value, THE System SHALL validate the Nick is between 1 and 22 characters
3. WHEN the player submits a new Nick value, THE System SHALL check global uniqueness of the Nick using case-insensitive comparison against all User.first_name values and Score.nick values (excluding the requesting user's own records)

### Requirement 6: Nick Change Cooldown

**User Story:** As a product owner, I want to limit nick changes to once every 30 days, so that players cannot abuse name switching.

#### Acceptance Criteria

1. THE System SHALL create a PlayerProfile model with a OneToOneField to User and a nullable DateTimeField named `last_nick_change`
2. WHILE the Nick_Cooldown period has not elapsed (fewer than 30 days since `last_nick_change`), THE System SHALL reject nick change requests with an error message indicating the remaining days
3. WHEN a nick change succeeds, THE System SHALL update `PlayerProfile.last_nick_change` to the current timestamp
4. WHEN the Profile_Panel opens and Nick_Cooldown is active, THE System SHALL display the remaining cooldown days next to the nick change form and disable the submit button

### Requirement 7: Nick Change API Endpoint

**User Story:** As a frontend developer, I want a backend endpoint to process nick changes, so that validation and persistence happen server-side.

#### Acceptance Criteria

1. THE System SHALL expose a POST endpoint at `/api/profile/nick/` that accepts JSON with a `nick` field
2. WHEN the nick passes validation (length, uniqueness, cooldown), THE System SHALL update `User.first_name` to the new nick and update `PlayerProfile.last_nick_change`
3. IF the submitted nick is empty or exceeds 22 characters, THEN THE System SHALL respond with HTTP 400 and an error message
4. IF the submitted nick is already taken (case-insensitive), THEN THE System SHALL respond with HTTP 409 and an error message
5. IF the Nick_Cooldown period has not elapsed, THEN THE System SHALL respond with HTTP 429 and an error message with remaining days
6. WHEN an unauthenticated request reaches `/api/profile/nick/`, THE System SHALL respond with HTTP 403 status

### Requirement 8: Nick Change Sound Feedback

**User Story:** As a player, I want audio feedback when changing my nick, so that the interaction feels consistent with the game's cinematic atmosphere.

#### Acceptance Criteria

1. WHEN a nick change succeeds, THE System SHALL play a confirmation sound using the Web Audio API via the existing `getAudioCtx()` pattern
2. WHEN a nick change fails validation, THE System SHALL play the existing `playErrorBuzz()` sound

### Requirement 9: Profile Panel Close Sound

**User Story:** As a player, I want the profile panel open/close to have subtle audio feedback, so that interactions feel tactile.

#### Acceptance Criteria

1. WHEN the Profile_Panel opens, THE System SHALL play a subtle ticket-reveal sound using the Web Audio API via the existing `getAudioCtx()` pattern
2. WHEN the Profile_Panel closes, THE System SHALL play a soft close sound using the Web Audio API

### Requirement 10: PlayerProfile Model Migration

**User Story:** As a developer, I want the PlayerProfile model to be created via a Django migration, so that the database schema supports the cooldown feature.

#### Acceptance Criteria

1. THE System SHALL define the PlayerProfile model in the `game` app with fields: `user` (OneToOneField to User, primary key or with related_name), and `last_nick_change` (DateTimeField, null=True, blank=True)
2. THE System SHALL auto-create a PlayerProfile instance when a nick change is first attempted and no profile exists for the user
