from django.urls import path
from . import views

urlpatterns = [
    # SPA
    path('', views.index, name='index'),

    # Auth state
    path('api/me/', views.api_me, name='api_me'),

    # Scores
    path('api/scores/', views.api_scores, name='api_scores'),
    path('api/scores/save/', views.api_scores_save, name='api_scores_save'),

    # TMDB proxy
    path('api/backdrops/<int:film_id>/', views.api_backdrops, name='api_backdrops'),

    # Frame reports (player flags broken/wrong frame)
    path('api/report-frame/', views.api_report_frame, name='api_report_frame'),

    # Films API (game frontend)
    path('api/films/', views.api_films, name='api_films'),

    # Game round logging
    path('api/rounds/log/', views.api_log_round, name='api_log_round'),

    # Nick availability check
    path('api/nick-check/', views.api_nick_check, name='api_nick_check'),

    # Player profile (Karta Widza)
    path('api/profile/stats/', views.api_profile_stats, name='api_profile_stats'),
    path('api/profile/nick/', views.api_profile_nick, name='api_profile_nick'),
]
