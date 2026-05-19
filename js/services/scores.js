// Django equivalent: views/scores.py + models/score.py
// In Django this would be:
//   class Score(models.Model):
//       nick = models.CharField(max_length=22)
//       genre = models.CharField(max_length=64)
//       level = models.CharField(max_length=16)
//       score = models.IntegerField()
//       created_at = models.DateTimeField(auto_now_add=True)
//
// Currently uses localStorage for local persistence.
// Global leaderboard requires a backend (TODO).

const SCORES_KEY = 'ntf_scores';

// Save a completed game result to localStorage.
function saveScore(nick, genre, level, score) {
  const entry = {nick, genre, level, score, ts: Date.now()};
  const all   = getScores();
  all.unshift(entry);
  // Keep only the last 100 entries
  localStorage.setItem(SCORES_KEY, JSON.stringify(all.slice(0, 100)));
}

// Retrieve all saved scores from localStorage.
function getScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY)) || [];
  } catch {
    return [];
  }
}
