import json
import requests
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

from .models import Score, FrameReport, BlockedBackdrop, BlockedFilm


# ── Main page ─────────────────────────────────────────────────────────────────

@ensure_csrf_cookie
def index(request):
    """Serve the single-page app. Passes auth state to template.

    @ensure_csrf_cookie guarantees the csrftoken cookie is set on the page
    load, so the frontend (scores.js getCsrfToken) can send it back on
    POST /api/scores/save/. Without it, every save returns 403.
    """
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

    # Anti-cheat: the client computes the score, so reject anything outside the
    # theoretical range for the level (10 rounds × max per-round points:
    # popcorn 1, kinoman 5, kineza 8). Keeps the leaderboard honest.
    max_score = {'popcorn': 10, 'kinoman': 50, 'kineza': 80}[level]
    if not (0 <= score <= max_score):
        return JsonResponse({'error': 'score out of range'}, status=400)

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

TMDB_CACHE = {}  # film_id -> list of TMDB file_paths (in-process; resets on restart)

def fetch_backdrop_paths(film_id):
    """Return up to 12 TMDB backdrop file_paths for a film (cached).

    Caching paths (not final URLs) lets blocked-backdrop filtering apply at
    response time, so an admin block takes effect without a cache flush.
    Raises requests.RequestException on TMDB failure.
    """
    if film_id in TMDB_CACHE:
        return TMDB_CACHE[film_id]
    resp = requests.get(
        f'{settings.TMDB_BASE_URL}/movie/{film_id}/images',
        params={'api_key': settings.TMDB_API_KEY},
        timeout=5,
    )
    resp.raise_for_status()
    paths = [b['file_path'] for b in resp.json().get('backdrops', [])[:12]]
    TMDB_CACHE[film_id] = paths
    return paths


def api_backdrops(request, film_id):
    """Return backdrop image URLs for a TMDB film ID (minus admin blocks)."""
    if not settings.TMDB_API_KEY:
        return JsonResponse({'error': 'TMDB not configured'}, status=503)

    if BlockedFilm.objects.filter(film_id=film_id).exists():
        return JsonResponse({'film_id': film_id, 'backdrops': [], 'blocked': True})

    try:
        paths = fetch_backdrop_paths(film_id)
    except requests.RequestException as e:
        return JsonResponse({'error': str(e), 'backdrops': []}, status=502)

    blocked = set(BlockedBackdrop.objects.filter(film_id=film_id)
                  .values_list('file_path', flat=True))
    urls = [f"{settings.TMDB_IMG_BASE}/w1280{p}" for p in paths if p not in blocked][:5]
    return JsonResponse({'film_id': film_id, 'backdrops': urls})


# ── API: frame reports (player flags a broken/wrong frame) ────────────────────

@require_http_methods(['POST'])
def api_report_frame(request):
    """Record a player report that a frame failed to load / shows wrong film."""
    try:
        body    = json.loads(request.body)
        film_id = int(body.get('film_id'))
        title   = str(body.get('title', ''))[:120]
        url     = str(body.get('url', ''))[:300]
    except (json.JSONDecodeError, ValueError, TypeError):
        return JsonResponse({'error': 'invalid payload'}, status=400)

    report, created = FrameReport.objects.get_or_create(
        film_id=film_id, defaults={'title': title, 'last_url': url},
    )
    if not created:
        report.reports += 1
        if title:
            report.title = title
        if url:
            report.last_url = url
        report.save()
    return JsonResponse({'ok': True, 'reports': report.reports})
