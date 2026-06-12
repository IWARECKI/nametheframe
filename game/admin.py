import csv

from django.conf import settings
from django.contrib import admin
from django.db.models import Avg, Count, Max
from django.http import HttpResponse
from django.shortcuts import redirect, render
from django.urls import path, reverse
from django.utils.html import format_html

from .models import Score, FrameReport, BlockedBackdrop, BlockedFilm, Film, Backdrop, Award, GameRound


# ── Branding ──────────────────────────────────────────────────────────────────
admin.site.site_header = 'Name the Frame — Panel'
admin.site.site_title  = 'Name the Frame'
admin.site.index_title = 'Zarządzanie grą'


# Level → (label, colour) for coloured badges in the list view.
LEVEL_STYLE = {
    'popcorn': ('🍿 Akolita Popcornu',          '#8a7b5c'),
    'kinoman': ('🎬 Samozwańczy Kinoman',       '#c9a227'),
    'kineza':  ('🏆 Orędownik Wielkiej Kinezy', '#e0b84a'),
}


@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    list_display    = ('rank', 'nick', 'level_badge', 'score_value', 'genre', 'account', 'when')
    list_filter     = ('level', 'genre', 'ts')
    search_fields   = ('nick', 'user__email', 'genre')
    ordering        = ('-score', '-ts')
    readonly_fields = ('ts',)
    date_hierarchy  = 'ts'
    list_per_page   = 40
    list_select_related = ('user',)
    save_on_top     = True

    fieldsets = (
        ('Wynik', {'fields': ('nick', 'score', 'level', 'genre')}),
        ('Powiązania', {'fields': ('user', 'ts')}),
    )

    # ── computed columns ──────────────────────────────────────────────────────
    @admin.display(description='#')
    def rank(self, obj):
        """Position by score (1 = best)."""
        better = Score.objects.filter(score__gt=obj.score).count()
        return f'#{better + 1}'

    @admin.display(description='Poziom', ordering='level')
    def level_badge(self, obj):
        label, colour = LEVEL_STYLE.get(obj.level, (obj.level, '#888'))
        return format_html(
            '<span style="background:{}1f;color:{};border:1px solid {}55;'
            'padding:2px 10px;border-radius:999px;font-weight:600;'
            'white-space:nowrap;">{}</span>',
            colour, colour, colour, label,
        )

    @admin.display(description='Punkty', ordering='score')
    def score_value(self, obj):
        return format_html('<b style="font-size:14px;color:#e0b84a;">{}</b>', obj.score)

    @admin.display(description='Konto', ordering='user__email')
    def account(self, obj):
        if obj.user:
            return obj.user.email or obj.user.username
        return format_html('<span style="color:#888;">gość</span>')

    @admin.display(description='Kiedy', ordering='ts')
    def when(self, obj):
        return obj.ts.strftime('%Y-%m-%d %H:%M')

    # ── summary stats on the changelist ───────────────────────────────────────
    def changelist_view(self, request, extra_context=None):
        qs = self.get_queryset(request)
        stats = qs.aggregate(
            total=Count('id'),
            players=Count('nick', distinct=True),
            best=Max('score'),
            avg=Avg('score'),
        )
        extra_context = extra_context or {}
        extra_context['ntf_stats'] = {
            'total':   stats['total'] or 0,
            'players': stats['players'] or 0,
            'best':    stats['best'] or 0,
            'avg':     round(stats['avg'] or 0, 1),
        }
        return super().changelist_view(request, extra_context=extra_context)


# ── Frame management ──────────────────────────────────────────────────────────

@admin.register(FrameReport)
class FrameReportAdmin(admin.ModelAdmin):
    list_display = ('film_id', 'title', 'reports_badge', 'updated', 'manage_link')
    search_fields = ('title', 'film_id')
    ordering = ('-reports',)

    @admin.display(description='Zgłoszenia', ordering='reports')
    def reports_badge(self, obj):
        colour = '#e57373' if obj.reports >= 3 else '#c9a227'
        return format_html('<b style="color:{};">{}</b>', colour, obj.reports)

    @admin.display(description='Kadry')
    def manage_link(self, obj):
        url = reverse('admin:game_frame_manage', args=[obj.film_id])
        return format_html('<a class="button" href="{}">🎞️ Zarządzaj kadrami</a>', url)

    # Custom per-film frame management view (thumbnails + block buttons).
    def get_urls(self):
        custom = [
            path('frames/<int:film_id>/',
                 self.admin_site.admin_view(self.manage_frames_view),
                 name='game_frame_manage'),
        ]
        return custom + super().get_urls()

    def manage_frames_view(self, request, film_id):
        from .views import fetch_backdrop_paths
        report = FrameReport.objects.filter(film_id=film_id).first()

        if request.method == 'POST':
            action = request.POST.get('action')
            fp = request.POST.get('file_path', '')
            if action == 'block' and fp:
                BlockedBackdrop.objects.get_or_create(film_id=film_id, file_path=fp)
            elif action == 'unblock' and fp:
                BlockedBackdrop.objects.filter(film_id=film_id, file_path=fp).delete()
            elif action == 'block_film':
                BlockedFilm.objects.get_or_create(
                    film_id=film_id,
                    defaults={'title': report.title if report else '',
                              'note': 'zablokowany z panelu kadrów'})
            elif action == 'unblock_film':
                BlockedFilm.objects.filter(film_id=film_id).delete()
            elif action == 'clear_reports':
                FrameReport.objects.filter(film_id=film_id).delete()
                return redirect('admin:game_framereport_changelist')
            return redirect(request.path)

        try:
            paths = fetch_backdrop_paths(film_id)
            tmdb_error = None
        except Exception as e:  # network/404 — still show the page
            paths, tmdb_error = [], str(e)

        blocked = set(BlockedBackdrop.objects.filter(film_id=film_id)
                      .values_list('file_path', flat=True))
        frames = [{
            'file_path': p,
            'thumb': f'{settings.TMDB_IMG_BASE}/w300{p}',
            'full': f'{settings.TMDB_IMG_BASE}/w1280{p}',
            'blocked': p in blocked,
        } for p in paths]

        ctx = {
            **self.admin_site.each_context(request),
            'title': f'Kadry filmu {report.title if report and report.title else film_id}',
            'film_id': film_id,
            'report': report,
            'frames': frames,
            'film_blocked': BlockedFilm.objects.filter(film_id=film_id).exists(),
            'tmdb_error': tmdb_error,
            'active_count': sum(1 for f in frames if not f['blocked']),
        }
        return render(request, 'admin/game/framereport/manage.html', ctx)


@admin.register(BlockedBackdrop)
class BlockedBackdropAdmin(admin.ModelAdmin):
    list_display = ('film_id', 'thumb', 'file_path', 'created')
    search_fields = ('film_id', 'file_path')

    @admin.display(description='Podgląd')
    def thumb(self, obj):
        return format_html(
            '<img src="{}/w185{}" style="height:60px;border-radius:6px;">',
            settings.TMDB_IMG_BASE, obj.file_path)


@admin.register(BlockedFilm)
class BlockedFilmAdmin(admin.ModelAdmin):
    list_display = ('film_id', 'title', 'note', 'created')
    search_fields = ('title', 'film_id')


# ── Film Admin Panel ──────────────────────────────────────────────────────────

class GenreFilter(admin.SimpleListFilter):
    title = 'genre'
    parameter_name = 'genre'

    def lookups(self, request, model_admin):
        genres = set()
        for film in Film.objects.values_list('genres', flat=True):
            if film:
                for g in film:
                    genres.add(g)
        return [(g, g) for g in sorted(genres)]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(genres__contains=[self.value()])
        return queryset


class HasBackdropsFilter(admin.SimpleListFilter):
    title = 'has backdrops'
    parameter_name = 'has_backdrops'

    def lookups(self, request, model_admin):
        return [('yes', 'Yes'), ('no', 'No')]

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(backdrops__status='active').distinct()
        elif self.value() == 'no':
            return queryset.exclude(backdrops__status='active').distinct()
        return queryset


class HasAwardsFilter(admin.SimpleListFilter):
    title = 'has awards'
    parameter_name = 'has_awards'

    def lookups(self, request, model_admin):
        return [('yes', 'Yes'), ('no', 'No')]

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(awards__isnull=False).distinct()
        elif self.value() == 'no':
            return queryset.filter(awards__isnull=True)
        return queryset


class BackdropInline(admin.TabularInline):
    model = Backdrop
    extra = 0
    readonly_fields = ('thumbnail', 'file_path', 'width', 'height', 'language', 'added')
    fields = ('thumbnail', 'file_path', 'status', 'width', 'language', 'added')

    @admin.display(description='Podgląd')
    def thumbnail(self, obj):
        if obj.file_path:
            return format_html(
                '<img src="{}" style="height:60px;border-radius:4px;">',
                obj.thumb_url
            )
        return '-'


class AwardInline(admin.TabularInline):
    model = Award
    extra = 1
    fields = ('prize', 'category', 'year', 'person')


@admin.register(Film)
class FilmAdmin(admin.ModelAdmin):
    list_display = ('poster_thumb', 'title', 'director', 'year', 'tier',
                    'cinema_era', 'tmdb_rating', 'backdrop_count', 'stats_display', 'is_active')
    list_filter = ('tier', 'cinema_era', 'is_active', 'country', 'original_language',
                   GenreFilter, HasBackdropsFilter, HasAwardsFilter)
    search_fields = ('title', 'original_title', 'director', 'tmdb_id', 'imdb_id',
                     'cast_top5', 'cinematographer', 'composer')
    list_editable = ('is_active', 'tier', 'cinema_era')
    list_per_page = 50
    inlines = [AwardInline, BackdropInline]
    readonly_fields = ('tmdb_id', 'tmdb_last_synced', 'created', 'updated',
                       'poster_preview', 'imdb_link')
    actions = ['sync_from_tmdb_action', 'activate_films', 'deactivate_films',
               'refresh_backdrops_action', 'recalculate_eras_action', 'export_csv']

    fieldsets = (
        ('Film', {
            'fields': ('title', 'original_title', 'director', 'year', 'country', 'cinema_era')
        }),
        ('TMDB Core', {
            'fields': ('tmdb_id', 'tmdb_rating', 'tmdb_vote_count', 'overview',
                       'poster_path', 'poster_preview', 'imdb_id', 'imdb_link',
                       'tmdb_last_synced')
        }),
        ('TMDB Extended', {
            'fields': ('runtime', 'tagline', 'original_language', 'belongs_to_collection',
                       'production_companies', 'spoken_languages', 'cast_top5',
                       'cinematographer', 'composer', 'keywords', 'budget', 'revenue'),
            'classes': ('collapse',)
        }),
        ('Game', {
            'fields': ('tier', 'genres', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created', 'updated'),
            'classes': ('collapse',)
        }),
    )

    # ── Display methods ───────────────────────────────────────────────────────

    @admin.display(description='Poster')
    def poster_thumb(self, obj):
        if obj.poster_path:
            url = f'{settings.TMDB_IMG_BASE}/w92{obj.poster_path}'
            return format_html('<img src="{}" style="height:45px;border-radius:4px;">', url)
        return '-'

    @admin.display(description='Tier', ordering='tier')
    def tier_badge(self, obj):
        colours = {'D': '#4caf50', 'C': '#ffc107', 'B': '#ff9800', 'A': '#f44336'}
        colour = colours.get(obj.tier, '#888')
        return format_html(
            '<span style="background:{}22;color:{};border:1px solid {}55;'
            'padding:2px 8px;border-radius:4px;font-weight:700;">{}</span>',
            colour, colour, colour, obj.tier
        )

    @admin.display(description='Backdrops')
    def backdrop_count(self, obj):
        return obj.active_backdrop_count

    @admin.display(description='Stats')
    def stats_display(self, obj):
        from .models import GameRound
        shown = GameRound.objects.filter(film_id=obj.tmdb_id).count()
        if shown == 0:
            return '—'
        guessed = GameRound.objects.filter(film_id=obj.tmdb_id, guessed=True).count()
        rate = round(guessed / shown * 100) if shown else 0
        return format_html(
            '<span title="Shown: {}, Guessed: {}">{} <small style="color:#888;">({}/{})</small></span>',
            shown, guessed, f'{rate}%', guessed, shown
        )

    @admin.display(description='Poster preview')
    def poster_preview(self, obj):
        if obj.poster_path:
            url = f'{settings.TMDB_IMG_BASE}/w185{obj.poster_path}'
            return format_html('<img src="{}" style="height:120px;border-radius:6px;">', url)
        return '-'

    @admin.display(description='IMDB')
    def imdb_link(self, obj):
        if obj.imdb_id:
            url = f'https://www.imdb.com/title/{obj.imdb_id}/'
            return format_html('<a href="{}" target="_blank" rel="noopener">{}</a>', url, obj.imdb_id)
        return '-'

    # ── Actions ───────────────────────────────────────────────────────────────

    @admin.action(description='Sync selected films from TMDB')
    def sync_from_tmdb_action(self, request, queryset):
        import requests
        from django.utils import timezone

        synced = 0
        errors = []
        for film in queryset:
            try:
                url = f'{settings.TMDB_BASE_URL}/movie/{film.tmdb_id}'
                params = {'api_key': settings.TMDB_API_KEY, 'append_to_response': 'credits,keywords'}
                resp = requests.get(url, params=params, timeout=10)
                resp.raise_for_status()
                data = resp.json()

                # Extract crew info
                credits = data.get('credits', {})
                crew = credits.get('crew', [])
                cast = credits.get('cast', [])

                director = next((c['name'] for c in crew if c.get('job') == 'Director'), film.director)
                cinematographer = next((c['name'] for c in crew if c.get('job') == 'Director of Photography'), '')
                composer = next((c['name'] for c in crew if c.get('job') == 'Original Music Composer'), '')

                film.title = data.get('title', film.title)
                film.original_title = data.get('original_title', '')
                film.director = director
                film.overview = data.get('overview', '')
                film.poster_path = data.get('poster_path', '')
                film.tmdb_rating = data.get('vote_average')
                film.tmdb_vote_count = data.get('vote_count', 0)
                film.runtime = data.get('runtime')
                film.tagline = data.get('tagline', '')
                film.imdb_id = data.get('imdb_id', '')
                film.original_language = data.get('original_language', '')
                film.budget = data.get('budget') or None
                film.revenue = data.get('revenue') or None
                film.genres = [g['name'] for g in data.get('genres', [])]
                film.production_companies = [c['name'] for c in data.get('production_companies', [])]
                film.spoken_languages = [l.get('english_name', l.get('name', '')) for l in data.get('spoken_languages', [])]
                film.cast_top5 = [c['name'] for c in cast[:5]]
                film.cinematographer = cinematographer
                film.composer = composer

                # Collection
                collection = data.get('belongs_to_collection')
                film.belongs_to_collection = collection['name'] if collection else ''

                # Country
                countries = data.get('production_countries', [])
                film.country = countries[0]['name'] if countries else ''

                # Keywords
                kw_data = data.get('keywords', {})
                film.keywords = [k['name'] for k in kw_data.get('keywords', [])]

                # Release year
                release_date = data.get('release_date', '')
                if release_date:
                    film.year = int(release_date[:4])

                film.tmdb_last_synced = timezone.now()
                film.save()
                synced += 1
            except Exception as e:
                errors.append(f'{film.title}: {e}')

        msg = f'Synced {synced} film(s).'
        if errors:
            msg += f' Errors: {len(errors)} — {"; ".join(errors[:3])}'
        self.message_user(request, msg)

    @admin.action(description='Activate selected films')
    def activate_films(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'Activated {updated} film(s).')

    @admin.action(description='Deactivate selected films')
    def deactivate_films(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'Deactivated {updated} film(s).')

    @admin.action(description='Refresh backdrops from TMDB')
    def refresh_backdrops_action(self, request, queryset):
        import requests

        total_added = 0
        errors = []
        for film in queryset:
            try:
                url = f'{settings.TMDB_BASE_URL}/movie/{film.tmdb_id}/images'
                params = {'api_key': settings.TMDB_API_KEY}
                resp = requests.get(url, params=params, timeout=10)
                resp.raise_for_status()
                data = resp.json()

                existing_paths = set(film.backdrops.values_list('file_path', flat=True))
                added = 0
                for bd in data.get('backdrops', []):
                    fp = bd.get('file_path', '')
                    if fp and fp not in existing_paths:
                        Backdrop.objects.create(
                            film=film,
                            file_path=fp,
                            width=bd.get('width', 0),
                            height=bd.get('height', 0),
                            language=bd.get('iso_639_1') or '',
                            status='active',
                        )
                        added += 1
                total_added += added
            except Exception as e:
                errors.append(f'{film.title}: {e}')

        msg = f'Added {total_added} new backdrop(s).'
        if errors:
            msg += f' Errors: {len(errors)} — {"; ".join(errors[:3])}'
        self.message_user(request, msg)

    @admin.action(description='Recalculate cinema eras from year')
    def recalculate_eras_action(self, request, queryset):
        updated = 0
        for film in queryset:
            new_era = film._compute_era()
            if film.cinema_era != new_era:
                film.cinema_era = new_era
                film.save(update_fields=['cinema_era', 'updated'])
                updated += 1
        self.message_user(request, f'Recalculated eras for {updated} film(s).')

    @admin.action(description='Export selected films to CSV')
    def export_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="films_export.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'tmdb_id', 'title', 'director', 'year', 'tier', 'cinema_era',
            'country', 'genres', 'tmdb_rating', 'is_active', 'imdb_id',
            'active_backdrops', 'awards_count',
        ])
        for film in queryset.select_related().prefetch_related('backdrops', 'awards'):
            writer.writerow([
                film.tmdb_id, film.title, film.director, film.year, film.tier,
                film.cinema_era, film.country, ', '.join(film.genres or []),
                film.tmdb_rating, film.is_active, film.imdb_id,
                film.backdrops.filter(status='active').count(),
                film.awards.count(),
            ])
        return response


@admin.register(Award)
class AwardAdmin(admin.ModelAdmin):
    list_display = ('film', 'prize', 'category', 'year', 'person')
    list_filter = ('prize', 'year')
    search_fields = ('film__title', 'category', 'person')
    autocomplete_fields = ('film',)
    list_per_page = 100
