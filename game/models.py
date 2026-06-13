from django.conf import settings
from django.db import models
from django.contrib.auth.models import User


class Score(models.Model):
    """One completed game session."""
    LEVEL_CHOICES = [
        ('popcorn', 'Akolita Popcornu'),
        ('kinoman', 'Samozwańczy Kinoman'),
        ('kineza',  'Orędownik Wielkiej Kinezy'),
    ]

    user  = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                               related_name='scores')
    nick  = models.CharField(max_length=22)
    genre = models.CharField(max_length=64)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES)
    score = models.IntegerField()
    duration_ms = models.IntegerField(null=True, blank=True, help_text='Session duration in milliseconds')
    ts    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score', '-ts']
        indexes  = [models.Index(fields=['-score'])]

    def __str__(self):
        return f'{self.nick} · {self.level} · {self.score} pkt'


# ── Frame management ──────────────────────────────────────────────────────────
# Players report broken/mismatched frames in-game; admins review them and can
# block a single backdrop (bad image in TMDB's gallery) or a whole film.

class FrameReport(models.Model):
    """Aggregated player reports of a broken/wrong frame for one film."""
    film_id  = models.IntegerField(unique=True)
    title    = models.CharField(max_length=120, blank=True)
    reports  = models.PositiveIntegerField(default=1)
    last_url = models.URLField(max_length=300, blank=True)
    updated  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-reports', '-updated']
        verbose_name = 'Zgłoszenie kadru'
        verbose_name_plural = 'Zgłoszenia kadrów'

    def __str__(self):
        return f'{self.title or self.film_id} · {self.reports} zgłoszeń'


# DEPRECATED: Replaced by Backdrop.status='blocked' and Film.is_active=False.
# Kept for backward compatibility with existing admin views and data migration.
class BlockedBackdrop(models.Model):
    """A single TMDB backdrop excluded from the game (bad/mismatched image)."""
    film_id   = models.IntegerField()
    file_path = models.CharField(max_length=120)  # TMDB path, e.g. /abc123.jpg
    created   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('film_id', 'file_path')]
        verbose_name = 'Zablokowany kadr'
        verbose_name_plural = 'Zablokowane kadry'

    def __str__(self):
        return f'{self.film_id} · {self.file_path}'


# DEPRECATED: Replaced by Backdrop.status='blocked' and Film.is_active=False.
# Kept for backward compatibility with existing admin views and data migration.
class BlockedFilm(models.Model):
    """A film fully removed from the pool (e.g. all frames are spoilers)."""
    film_id = models.IntegerField(unique=True)
    title   = models.CharField(max_length=120, blank=True)
    note    = models.CharField(max_length=200, blank=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Zablokowany film'
        verbose_name_plural = 'Zablokowane filmy'

    def __str__(self):
        return f'{self.title or self.film_id}'


# ── Film Admin Panel models ───────────────────────────────────────────────────
# Full TMDB metadata for films managed through the Django admin.

class Film(models.Model):
    TIER_CHOICES = [
        ('A', 'A — Niche Arthouse'),
        ('B', 'B — Ambitious / Festival'),
        ('C', 'C — Popular Quality'),
        ('D', 'D — Mainstream Classics'),
    ]
    CINEMA_ERA_CHOICES = [
        ('silent', 'Silent Era (< 1929)'),
        ('golden', 'Golden Age (1930–1959)'),
        ('new_wave', 'New Wave (1960–1979)'),
        ('modern', 'Modern (1980–1999)'),
        ('contemporary', 'Contemporary (2000+)'),
    ]

    # Core
    tmdb_id = models.IntegerField(unique=True, db_index=True)
    title = models.CharField(max_length=200)
    original_title = models.CharField(max_length=200, blank=True)
    director = models.CharField(max_length=120)
    year = models.PositiveSmallIntegerField()
    country = models.CharField(max_length=100, blank=True, help_text='Primary production country')
    countries = models.JSONField(default=list, blank=True, help_text='All production countries')
    genres = models.JSONField(default=list)
    tmdb_rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    tmdb_vote_count = models.PositiveIntegerField(default=0)
    overview = models.TextField(blank=True)
    poster_path = models.CharField(max_length=120, blank=True)

    # Extended TMDB fields
    runtime = models.IntegerField(null=True, blank=True, help_text='Runtime in minutes')
    tagline = models.CharField(max_length=300, blank=True)
    imdb_id = models.CharField(max_length=20, blank=True, help_text='e.g. tt0111161')
    original_language = models.CharField(max_length=10, blank=True)
    production_companies = models.JSONField(default=list, blank=True)
    belongs_to_collection = models.CharField(max_length=200, blank=True)
    spoken_languages = models.JSONField(default=list, blank=True)
    cast_top5 = models.JSONField(default=list, blank=True, help_text='Top 5 actors')
    cinematographer = models.CharField(max_length=120, blank=True, help_text='Director of Photography')
    composer = models.CharField(max_length=120, blank=True, help_text='Original Music Composer')
    keywords = models.JSONField(default=list, blank=True)
    budget = models.BigIntegerField(null=True, blank=True)
    revenue = models.BigIntegerField(null=True, blank=True)

    # Game-specific
    tier = models.CharField(max_length=1, choices=TIER_CHOICES, default='C', db_index=True)
    cinema_era = models.CharField(max_length=12, choices=CINEMA_ERA_CHOICES, blank=True,
                                  help_text='Auto-calculated from year, manually overridable')
    is_active = models.BooleanField(default=True, db_index=True)

    # Sync tracking
    tmdb_last_synced = models.DateTimeField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title']
        verbose_name = 'Film'
        verbose_name_plural = 'Filmy'
        indexes = [
            models.Index(fields=['tier', 'is_active']),
            models.Index(fields=['year']),
            models.Index(fields=['cinema_era']),
        ]

    def __str__(self):
        return f'{self.title} ({self.year}) — {self.director}'

    def save(self, *args, **kwargs):
        if not self.cinema_era and self.year:
            self.cinema_era = self._compute_era()
        super().save(*args, **kwargs)

    def _compute_era(self):
        if self.year < 1929:
            return 'silent'
        elif self.year <= 1959:
            return 'golden'
        elif self.year <= 1979:
            return 'new_wave'
        elif self.year <= 1999:
            return 'modern'
        else:
            return 'contemporary'

    @property
    def active_backdrop_count(self):
        return self.backdrops.filter(status='active').count()

    @property
    def poster_url(self):
        if self.poster_path:
            return f'{settings.TMDB_IMG_BASE}/w185{self.poster_path}'
        return ''

    @property
    def imdb_url(self):
        if self.imdb_id:
            return f'https://www.imdb.com/title/{self.imdb_id}/'
        return ''


class Backdrop(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('blocked', 'Blocked'),
        ('deleted', 'Deleted'),
    ]

    film = models.ForeignKey(Film, on_delete=models.CASCADE, related_name='backdrops')
    file_path = models.CharField(max_length=120)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active', db_index=True)
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    language = models.CharField(max_length=10, blank=True)
    added = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('film', 'file_path')]
        ordering = ['-width']
        verbose_name = 'Kadr (backdrop)'
        verbose_name_plural = 'Kadry (backdrops)'

    def __str__(self):
        return f'{self.film.title} — {self.file_path}'

    @property
    def thumb_url(self):
        return f'{settings.TMDB_IMG_BASE}/w300{self.file_path}'

    @property
    def full_url(self):
        return f'{settings.TMDB_IMG_BASE}/w1280{self.file_path}'


class Award(models.Model):
    PRIZE_CHOICES = [
        ('oscars', 'Academy Awards (Oscars)'),
        ('golden_globes', 'Golden Globes'),
        ('cannes', 'Cannes Film Festival'),
        ('bafta', 'BAFTA'),
        ('efa', 'European Film Awards'),
        ('venice', 'Venice Film Festival'),
        ('berlinale', 'Berlin International Film Festival (Berlinale)'),
        ('sundance', 'Sundance Film Festival'),
    ]

    film = models.ForeignKey(Film, on_delete=models.CASCADE, related_name='awards')
    prize = models.CharField(max_length=20, choices=PRIZE_CHOICES)
    category = models.CharField(max_length=200, help_text='e.g. "Best Picture", "Palme d\'Or", "Best Director"')
    year = models.IntegerField(help_text='Year the award was given')
    person = models.CharField(max_length=200, blank=True, help_text='Who received it (actor/director name)')

    class Meta:
        ordering = ['-year', 'prize']
        verbose_name = 'Award'
        verbose_name_plural = 'Awards'
        indexes = [
            models.Index(fields=['prize', 'year']),
        ]

    def __str__(self):
        person_str = f' — {self.person}' if self.person else ''
        return f'{self.get_prize_display()} {self.year}: {self.category}{person_str}'


class GameRound(models.Model):
    film_id = models.IntegerField(db_index=True, help_text='TMDB film ID')
    shown_at = models.DateTimeField(auto_now_add=True)
    guessed = models.BooleanField(default=False)
    session = models.ForeignKey(Score, null=True, blank=True, on_delete=models.SET_NULL, related_name='rounds')

    class Meta:
        ordering = ['-shown_at']
        verbose_name = 'Game Round'
        verbose_name_plural = 'Game Rounds'
        indexes = [
            models.Index(fields=['film_id', 'guessed']),
        ]

    def __str__(self):
        return f'Film {self.film_id} — {"✓" if self.guessed else "✗"} — {self.shown_at:%Y-%m-%d %H:%M}'
