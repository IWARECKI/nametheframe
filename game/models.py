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
