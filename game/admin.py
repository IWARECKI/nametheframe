from django.conf import settings
from django.contrib import admin
from django.db.models import Avg, Count, Max
from django.shortcuts import redirect, render
from django.urls import path, reverse
from django.utils.html import format_html

from .models import Score, FrameReport, BlockedBackdrop, BlockedFilm


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
