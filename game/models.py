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
