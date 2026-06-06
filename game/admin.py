from django.contrib import admin
from django.db.models import Avg, Count, Max
from django.utils.html import format_html

from .models import Score


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
