# Requirements Document

## Introduction

Gameplay UX Upgrade for the Name the Frame quiz game. This feature set enhances the post-answer experience and responsive layout with four improvements: responsive answer grid layout (2×2 on desktop), film metadata pills after correct answer, heart/favorite functionality for frames, and a smart auto-advance timer on the "Następny kadr" button.

## Glossary

- **Answer_Grid**: The `.opts` container rendering 4 answer option buttons in the multiple-choice (Akolita Popcornu) game mode
- **Metadata_Pills**: Styled tag/pill elements displaying film metadata (director, year, country, genre era) shown in the `.frev` section after a correct answer
- **Heart_Button**: A clickable ❤️ icon element next to the metadata pills that allows authenticated users to favorite a specific frame
- **HeartedFrame**: A Django model storing the relationship between a user, a film, and a specific backdrop path
- **Smart_Timer**: A 7-second auto-advance countdown embedded in the "Następny kadr" button with a visual progress bar fill
- **Film_API**: The existing `/api/films/` endpoint that serves film data to the frontend
- **Next_Button**: The `.nbtn` element labeled "Następny kadr →" shown after answering a round
- **Activity_Pause**: The behavior where mouse movement or touch interaction pauses the Smart_Timer countdown, resuming after a 3-second debounce of inactivity

## Requirements

### Requirement 1: Responsive Answer Grid Layout

**User Story:** As a player on a desktop device, I want the answer buttons arranged in a 2×2 grid, so that I can scan all options faster without excessive vertical scrolling.

#### Acceptance Criteria

1. WHILE the viewport width is below 768px, THE Answer_Grid SHALL render answer buttons in a single-column layout (1×4)
2. WHILE the viewport width is 768px or above, THE Answer_Grid SHALL render answer buttons in a 2-column, 2-row grid layout (2×2)
3. THE Answer_Grid SHALL use CSS Grid with a `min-width: 768px` media query breakpoint for the layout transition
4. THE Answer_Grid SHALL maintain equal column widths in the 2×2 layout so both columns share available space evenly

### Requirement 2: Film Metadata Pills After Correct Answer

**User Story:** As a player, I want to see elegant metadata about the film after I answer correctly, so that I learn more about the film I just identified.

#### Acceptance Criteria

1. WHEN a correct answer is submitted, THE Metadata_Pills SHALL display the following film attributes as individual pill elements: director, year, country, and cinema era
2. WHEN an incorrect answer is submitted, THE Metadata_Pills SHALL display the same pill elements so the player can learn about the film
3. THE Metadata_Pills SHALL be rendered inside the `.frev` section below the film title and director line
4. THE Metadata_Pills SHALL be styled as rounded pill/tag elements with a subtle border and semi-transparent background consistent with the existing dark cinema aesthetic
5. IF the country field is empty for a film, THEN THE Metadata_Pills SHALL omit the country pill rather than displaying an empty element
6. THE Film_API SHALL include `country` and `era` fields in the film object response alongside the existing `dir`, `y`, and `t` fields

### Requirement 3: Heart/Favorite Frame Functionality

**User Story:** As an authenticated player, I want to heart/favorite a frame I enjoyed, so that I can build a collection of memorable film frames.

#### Acceptance Criteria

1. WHEN a round result is displayed, THE Heart_Button SHALL appear next to the Metadata_Pills inside the `.frev` section
2. WHEN an authenticated user clicks the Heart_Button, THE Heart_Button SHALL send a POST request to `/api/hearts/toggle/` with the film ID and backdrop path
3. WHEN the toggle API returns success with `hearted: true`, THE Heart_Button SHALL display a neon red glow animation and play a short Web Audio confirmation sound
4. WHEN the toggle API returns success with `hearted: false`, THE Heart_Button SHALL remove the neon red glow and return to its default unfilled state
5. WHEN an unauthenticated user clicks the Heart_Button, THE Heart_Button SHALL remain visually inactive and not send any API request
6. THE HeartedFrame model SHALL store: user (FK to User), film (FK to Film), backdrop_path (CharField), and created (DateTimeField auto_now_add)
7. WHEN a POST is received at `/api/hearts/toggle/`, THE toggle endpoint SHALL create a HeartedFrame record if none exists for that user+film+backdrop combination, or delete the existing record if one already exists
8. THE toggle endpoint SHALL return a JSON response containing `hearted` (boolean) and `heart_count` (integer of total hearts for that user)
9. IF the user is not authenticated, THEN THE toggle endpoint SHALL return HTTP 403 with an error message

### Requirement 4: Smart Timer Auto-Advance

**User Story:** As a player, I want the game to automatically advance to the next frame after a brief pause, so that the gameplay flow feels smooth and cinematic without requiring me to click between every round.

#### Acceptance Criteria

1. WHEN the Next_Button becomes visible after a round result, THE Smart_Timer SHALL begin a 7-second countdown
2. WHILE the Smart_Timer is counting down, THE Next_Button SHALL display a progress bar fill animation in its background, growing from 0% to 100% width over 7 seconds
3. WHEN the Smart_Timer reaches zero, THE Smart_Timer SHALL trigger the `nextRound()` function to advance to the next frame
4. THE Next_Button SHALL remain clickable at all times during the countdown, allowing the player to manually advance before the timer expires
5. WHEN the player clicks the Next_Button before the timer expires, THE Smart_Timer SHALL cancel the countdown immediately
6. WHEN mouse movement or touch activity is detected on the game area, THE Smart_Timer SHALL pause the countdown
7. WHEN 3 seconds have elapsed without any mouse movement or touch activity (Activity_Pause debounce), THE Smart_Timer SHALL resume the countdown from its paused position
8. WHEN a new round begins, THE Smart_Timer SHALL reset the progress bar fill to 0% and clear any running countdown state

### Requirement 5: Backend Film Data Enrichment

**User Story:** As a developer, I want the film API to expose all metadata fields needed for the pills UI, so that the frontend has the data it needs without additional API calls.

#### Acceptance Criteria

1. THE Film model SHALL retain the existing `country` field (CharField, max_length=100, blank=True)
2. THE Film_API SHALL serialize each film object with the fields: `id`, `title`, `dir`, `y`, `t`, `era`, `country`, and `genres`
3. WHEN the `sync_films` management command runs, THE command SHALL populate the `country` field from TMDB's primary production country if the field is currently empty
