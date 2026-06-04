import json
import requests
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from .models import Score


# ── Main page ─────────────────────────────────────────────────────────────────

def index(request):
    """Serve the single-page app. Passes auth state to template."""
    user = request.user
    ctx = {
        'user_json': json.dumps({
            'authenticated': user.is_authenticated,
            'email': user.email if user.is_authenticated else None,
            'nick': user.first_name or user.email.split('@')[0] if user.is_authenticated else None,
        })
    }
    return render(request, 'index.html', ctx)


# ── API: current user ─────────────────────────────────────────────────────────

def api_me(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({'authenticated': False})
    return JsonResponse({
        'authenticated': True,
        'email': user.email,
        'nick': user.first_name or user.email.split('@')[0],
        'id': user.id,
    })


# ── API: scores ───────────────────────────────────────────────────────────────

@require_http_methods(['GET'])
def api_scores(request):
    """Return top 50 scores globally."""
    level = request.GET.get('level')  # optional filter
    qs = Score.objects.all()
    if level:
        qs = qs.filter(level=level)
    top = qs[:50]
    data = [
        {
            'nick':  s.nick,
            'genre': s.genre,
            'level': s.level,
            'score': s.score,
            'ts':    s.ts.isoformat(),
        }
        for s in top
    ]
    return JsonResponse({'scores': data})


@require_http_methods(['POST'])
def api_scores_save(request):
    """Save a completed game score."""
    try:
        body  = json.loads(request.body)
        nick  = str(body.get('nick', '')).strip()[:22]
        genre = str(body.get('genre', ''))[:64]
        level = str(body.get('level', ''))
        score = int(body.get('score', 0))
    except (json.JSONDecodeError, ValueError, TypeError):
        return JsonResponse({'error': 'invalid payload'}, status=400)

    if not nick or level not in ('popcorn', 'kinoman', 'kineza'):
        return JsonResponse({'error': 'missing required fields'}, status=400)

    Score.objects.create(
        user=request.user if request.user.is_authenticated else None,
        nick=nick,
        genre=genre,
        level=level,
        score=score,
    )
    return JsonResponse({'ok': True})


# ── API: TMDB backdrop proxy ───────────────────────────────────────────────────
# Keeps the API key on the server — never exposed in JS.

TMDB_CACHE = {}  # simple in-process cache (resets on dyno restart; fine for now)

def api_backdrops(request, film_id):
    """Return backdrop image URLs for a TMDB film ID."""
    if not settings.TMDB_API_KEY:
        return JsonResponse({'error': 'TMDB not configured'}, status=503)

    if film_id in TMDB_CACHE:
        return JsonResponse(TMDB_CACHE[film_id])

    try:
        resp = requests.get(
            f'{settings.TMDB_BASE_URL}/movie/{film_id}/images',
            params={'api_key': settings.TMDB_API_KEY},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        backdrops = [
            f"{settings.TMDB_IMG_BASE}/w1280{b['file_path']}"
            for b in data.get('backdrops', [])[:5]
        ]
        result = {'film_id': film_id, 'backdrops': backdrops}
        TMDB_CACHE[film_id] = result
        return JsonResponse(result)
    except requests.RequestException as e:
        return JsonResponse({'error': str(e), 'backdrops': []}, status=502)
