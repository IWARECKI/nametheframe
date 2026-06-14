from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Score, PlayerProfile


@receiver(post_save, sender=Score)
def update_profile_on_score_save(sender, instance, created, **kwargs):
    """Update PlayerProfile counters when a new Score is created."""
    if not created or not instance.user:
        return

    profile, _ = PlayerProfile.objects.get_or_create(user=instance.user)
    profile.games_played = Score.objects.filter(user=instance.user).count()
    profile.frames_guessed += getattr(instance, '_frames_guessed_count', 0)
    profile.save(update_fields=['games_played', 'frames_guessed'])
