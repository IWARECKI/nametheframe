import json
import requests
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

from .models import Score, FrameReport, BlockedBackdrop, BlockedFilm, Film, GameRound, HeartedFrame


# ── Main page ─────────────────────────────────────────────────────────────────

def privacy(request):
    """Privacy policy page."""
    return render(request, 'privacy.html')


@ensure_csrf_cookie
def index(request):
    """Serve the single-page app. Passes auth state to template.

    @ensure_csrf_cookie guarantees the csrftoken cookie is set on the page
    load, so the frontend (scores.js getCsrfToken) can send it back on
    POST /api/scores/save/. Without it, every save returns 403.
    """
    user = request.user
    # Nick = first_name, or fallback to last played score nick
    nick = None
    if user.is_authenticated:
        nick = user.first_name or None
        if not nick:
            last_score = Score.objects.filter(user=user).order_by('-ts').first()
            if last_score:
                nick = last_score.nick

    ctx = {
        'user_json': json.dumps({
            'authenticated': user.is_authenticated,
            'email': user.email if user.is_authenticated else None,
            'nick': nick,
        }),
        'player_nick': nick,  # for template rendering
    }
    return render(request, 'index.html', ctx)


# ── API: current user ─────────────────────────────────────────────────────────

def api_me(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({'authenticated': False})

    # Nick = first_name, or fallback to last score's nick
    nick = user.first_name or None
    if not nick:
        last_score = Score.objects.filter(user=user).order_by('-ts').first()
        if last_score:
            nick = last_score.nick

    return JsonResponse({
        'authenticated': True,
        'email': user.email,
        'nick': nick,
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
        duration_ms = int(body.get('duration_ms', 0)) or None
        frames_guessed = int(body.get('frames_guessed', 0))
    except (json.JSONDecodeError, ValueError, TypeError):
        return JsonResponse({'error': 'invalid payload'}, status=400)

    if not nick or level not in ('popcorn', 'kinoman', 'kineza'):
        return JsonResponse({'error': 'missing required fields'}, status=400)

    # Anti-cheat: 12 rounds × max per-round points:
    # popcorn 1, kinoman 5, kineza 8.
    max_score = {'popcorn': 12, 'kinoman': 60, 'kineza': 96}[level]
    if not (0 <= score <= max_score):
        return JsonResponse({'error': 'score out of range'}, status=400)

    Score.objects.create(
        user=request.user if request.user.is_authenticated else None,
        nick=nick,
        genre=genre,
        level=level,
        score=score,
        duration_ms=duration_ms,
    )

    # Persist nick as user's first_name for future sessions
    if request.user.is_authenticated and nick:
        if request.user.first_name != nick:
            request.user.first_name = nick
            request.user.save(update_fields=['first_name'])

    # Update frames_guessed on player profile
    if request.user.is_authenticated and frames_guessed > 0:
        from .models import PlayerProfile
        profile, _ = PlayerProfile.objects.get_or_create(user=request.user)
        profile.frames_guessed += frames_guessed
        profile.save(update_fields=['frames_guessed'])

    return JsonResponse({'ok': True})


# ── API: player profile ────────────────────────────────────────────────────────

@require_http_methods(['GET'])
def api_profile_stats(request):
    """Return profile stats for the authenticated user."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'unauthorized'}, status=403)
    from .models import PlayerProfile
    profile, _ = PlayerProfile.objects.get_or_create(user=request.user)
    nick = request.user.first_name or None
    cooldown_remaining = 0
    if profile.last_nick_change:
        elapsed = (timezone.now() - profile.last_nick_change).days
        if elapsed < 30:
            cooldown_remaining = 30 - elapsed
    return JsonResponse({
        'nick': nick,
        'games_played': profile.games_played,
        'frames_guessed': profile.frames_guessed,
        'cooldown_remaining': cooldown_remaining,
    })


@require_http_methods(['POST'])
def api_profile_nick(request):
    """Change the authenticated user's nick (with validation and cooldown)."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'unauthorized'}, status=403)
    try:
        body = json.loads(request.body)
        nick = str(body.get('nick', '')).strip()
    except (json.JSONDecodeError, ValueError, TypeError):
        return JsonResponse({'error': 'invalid payload'}, status=400)
    if not nick or len(nick) > 22:
        return JsonResponse({'error': 'Nick musi mieć 1-22 znaków'}, status=400)
    from django.contrib.auth.models import User
    taken_user = User.objects.filter(first_name__iexact=nick).exclude(pk=request.user.pk).exists()
    taken_score = Score.objects.filter(nick__iexact=nick).exclude(user=request.user).exists()
    if taken_user or taken_score:
        return JsonResponse({'error': 'Ten nick jest już zajęty'}, status=409)
    from .models import PlayerProfile
    profile, _ = PlayerProfile.objects.get_or_create(user=request.user)
    if profile.last_nick_change:
        elapsed = (timezone.now() - profile.last_nick_change).days
        if elapsed < 30:
            remaining = 30 - elapsed
            return JsonResponse({'error': f'Zmiana nicku możliwa za {remaining} dni', 'remaining_days': remaining}, status=429)
    request.user.first_name = nick
    request.user.save(update_fields=['first_name'])
    profile.last_nick_change = timezone.now()
    profile.save(update_fields=['last_nick_change'])
    return JsonResponse({'ok': True, 'nick': nick})


# ── API: TMDB backdrop proxy ───────────────────────────────────────────────────
# Keeps the API key on the server — never exposed in JS.

TMDB_CACHE = {}  # film_id -> list of TMDB file_paths (in-process; resets on restart)

def fetch_backdrop_paths(film_id):
    """Return up to 12 TMDB backdrop file_paths for a film (cached).

    Only returns backdrops with iso_639_1=None (no text overlay).
    Caching paths (not final URLs) lets blocked-backdrop filtering apply at
    response time, so an admin block takes effect without a cache flush.
    Raises requests.RequestException on TMDB failure.
    """
    if film_id in TMDB_CACHE:
        return TMDB_CACHE[film_id]
    resp = requests.get(
        f'{settings.TMDB_BASE_URL}/movie/{film_id}/images',
        params={'api_key': settings.TMDB_API_KEY, 'include_image_language': 'null'},
        timeout=5,
    )
    resp.raise_for_status()
    # Only keep backdrops with no language (pure film frames, no text)
    all_backdrops = resp.json().get('backdrops', [])
    paths = [b['file_path'] for b in all_backdrops if not b.get('iso_639_1')][:12]
    TMDB_CACHE[film_id] = paths
    return paths


def api_backdrops(request, film_id):
    """Return backdrop image URLs for a TMDB film ID (minus admin blocks).
    
    TODO: Migrate to use Backdrop model (Film.backdrops) instead of TMDB API + BlockedBackdrop/BlockedFilm.
    The new Backdrop model with status='active'/'blocked' replaces this workflow.
    """
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


# ── API: films for game frontend ──────────────────────────────────────────────

@require_http_methods(['GET'])
def api_films(request):
    """Return all active films for the game frontend."""
    qs = Film.objects.filter(is_active=True)

    # Optional filters
    tiers = request.GET.getlist('tier')
    if tiers:
        qs = qs.filter(tier__in=tiers)
    eras = request.GET.getlist('era')
    if eras:
        qs = qs.filter(cinema_era__in=eras)

    data = [
        {
            'id': f.tmdb_id,
            'title': f.title,
            'dir': f.director,
            'y': f.year,
            't': f.tier,
            'era': f.cinema_era,
            'country': f.country,
            'genres': f.genres,
        }
        for f in qs.only('tmdb_id', 'title', 'director', 'year', 'tier', 'cinema_era', 'country', 'genres')
    ]
    return JsonResponse({'films': data})


# ── API: game round logging ───────────────────────────────────────────────────

@require_http_methods(['POST'])
def api_log_round(request):
    """Log a game round for per-film statistics."""
    try:
        body = json.loads(request.body)
        film_id = int(body.get('film_id'))
        guessed = bool(body.get('guessed', False))
    except (json.JSONDecodeError, ValueError, TypeError):
        return JsonResponse({'error': 'invalid payload'}, status=400)

    GameRound.objects.create(film_id=film_id, guessed=guessed)
    return JsonResponse({'ok': True})


# ── API: nick availability check ──────────────────────────────────────────────

@require_http_methods(['GET'])
def api_nick_check(request):
    """Check if a nick is already taken (by any Score or User.first_name).
    
    If the requesting user is authenticated and the nick matches their own
    first_name, it's considered available (they own it).
    """
    nick = request.GET.get('nick', '').strip()
    if not nick:
        return JsonResponse({'available': False, 'reason': 'empty'})

    # Check if any existing user has this as first_name
    from django.contrib.auth.models import User
    user_qs = User.objects.filter(first_name__iexact=nick)
    # Exclude the requesting user themselves
    if request.user.is_authenticated:
        user_qs = user_qs.exclude(pk=request.user.pk)
    taken_by_user = user_qs.exists()

    # Check if any score used this nick (case-insensitive)
    # Exclude scores owned by the requesting user
    score_qs = Score.objects.filter(nick__iexact=nick)
    if request.user.is_authenticated:
        score_qs = score_qs.exclude(user=request.user)
    taken_by_score = score_qs.exists()

    available = not (taken_by_user or taken_by_score)
    return JsonResponse({'available': available, 'nick': nick})


# ── API: heart/favorite toggle ────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def api_hearts_toggle(request):
    """Toggle a hearted frame for the authenticated user.

    POST body: {"film_id": <tmdb_id>, "backdrop_path": "/abc123.jpg"}
    Returns: {"hearted": bool, "heart_count": int}
    """
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'authentication required'}, status=403)

    try:
        body = json.loads(request.body)
        film_id = int(body['film_id'])
        backdrop_path = str(body['backdrop_path'])
    except (json.JSONDecodeError, ValueError, TypeError, KeyError):
        return JsonResponse({'error': 'invalid payload'}, status=400)

    try:
        film = Film.objects.get(tmdb_id=film_id)
    except Film.DoesNotExist:
        return JsonResponse({'error': 'film not found'}, status=404)

    existing = HeartedFrame.objects.filter(
        user=request.user, film=film, backdrop_path=backdrop_path
    ).first()

    if existing:
        existing.delete()
        hearted = False
    else:
        HeartedFrame.objects.create(
            user=request.user, film=film, backdrop_path=backdrop_path
        )
        hearted = True

    heart_count = HeartedFrame.objects.filter(user=request.user).count()
    return JsonResponse({'hearted': hearted, 'heart_count': heart_count})
