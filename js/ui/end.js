// Django equivalent: views/end.py — end screen / results page
// In Django this would be a TemplateView rendering end.html
// with context: {score, level_name, nick, genre_label, verdict}
//
// The actual DOM updates are performed in engine.js → endGame()
// because they happen as part of the game state transition.
// This file is reserved for any future end-screen interactions,
// e.g. sharing results, showing the local leaderboard, or social buttons.

// Placeholder — extend this file when adding end-screen features such as:
//   - Share score to social media
//   - Display local top scores (getScores() from scores.js)
//   - Animate the score number counting up
