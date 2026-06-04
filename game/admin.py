from django.contrib import admin
from .models import Score


@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    list_display  = ('nick', 'level', 'score', 'genre', 'user', 'ts')
    list_filter   = ('level', 'genre')
    search_fields = ('nick', 'user__email')
    ordering      = ('-score',)
    readonly_fields = ('ts',)
