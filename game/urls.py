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
]
