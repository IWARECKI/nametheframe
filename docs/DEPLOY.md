# Name the Frame — runbook produkcyjny

Operacyjna ściąga: jak to jest postawione i jak tym zarządzać.

## Architektura
- **Hosting:** Railway (region europe-west4).
- **Builder:** Docker (`Dockerfile` w repo), nie nixpacks.
- **Serwer:** gunicorn (2 workery) za proxy Railway (TLS terminowany przez Railway).
- **Baza:** Postgres (plugin Railway, ten sam projekt), łączność przez
  `postgres.railway.internal` (sieć prywatna).
- **Statyki:** WhiteNoise (`CompressedManifestStaticFilesStorage`),
  `collectstatic` w buildzie.
- **Auto-deploy:** push na `main` w `IWARECKI/nametheframe` → Railway buduje i wdraża.
- **URL:** https://web-production-228ae7.up.railway.app
- **Domena docelowa:** nametheframe.com (plik `CNAME` w repo; do podpięcia w Railway).

## Cykl uruchomienia kontenera
`railway.toml` → `startCommand`:
```
python manage.py migrate --noinput
&& python manage.py ensure_superuser   # no-op bez zmiennych env
&& gunicorn nametheframe.wsgi --workers 2 --bind 0.0.0.0:$PORT
```
`migrate` musi iść przy starcie (nie w buildzie) — w buildzie nie ma dostępu
do Postgresa (stąd wcześniejszy błąd „could not translate host name").

## Zmienne środowiskowe (serwis `web` → Variables)
| Zmienna | Wartość |
|---|---|
| `SECRET_KEY` | (długi losowy ciąg) |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `nametheframe.com,.railway.app` ⚠️ (kropka, nie `*.`) |
| `CSRF_TRUSTED_ORIGINS` | `https://nametheframe.com,https://*.railway.app` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencja) |
| `TMDB_API_KEY` | opcjonalnie (domyślny klucz jest w `settings.py`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | po konfiguracji OAuth |
| `DJANGO_SUPERUSER_EMAIL` / `DJANGO_SUPERUSER_PASSWORD` | by `ensure_superuser` założył admina |

> ⚠️ `ALLOWED_HOSTS`: Django **nie** matchuje `*.railway.app`. Użyj `.railway.app`.
> Aktualnie zmienna na Railway ma jeszcze `*.railway.app` — zaktualizuj ją.

## Logowanie do panelu admina
1. Ustaw na Railway `DJANGO_SUPERUSER_EMAIL` i `DJANGO_SUPERUSER_PASSWORD`.
2. Redeploy → `ensure_superuser` utworzy/odświeży konto.
3. Wejdź na `/admin/`. (Alternatywnie: Railway → serwis → **Console** →
   `python manage.py createsuperuser`.)

## Diagnostyka
- **502 + `x-railway-fallback: true`** = brak zdrowego kontenera. Sprawdź:
  Railway → serwis `web` → **Deployments** → **View logs** → **Deploy Logs**.
  Najczęściej: (a) wyczerpany limit/trial → Upgrade/płatność; (b) crash przy
  starcie (błąd w logach deploy).
- **400 DisallowedHost** = host spoza `ALLOWED_HOSTS`.
- **Build OK, ale 500 na stronie** = błąd aplikacji (zobacz Deploy Logs / Sentry,
  gdy będzie wpięty).

## Lokalne uruchomienie
```
.venv/Scripts/python.exe manage.py runserver
```
⚠️ **Python:** repo działa na 3.12 (produkcja). Lokalny `.venv` jest na
**Pythonie 3.14**, który jest niezgodny z Django 5.1 w panelu admina
(`AttributeError: 'super' object has no attribute 'dicts'` przy renderze
list zmian). Sama gra i API działają na 3.14; tylko admin się wywala.
Rozwiązanie: użyć lokalnie Pythona 3.12 **albo** podbić Django do 5.2.7+/6.0.
```
