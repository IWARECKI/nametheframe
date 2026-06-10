import environ
import dj_database_url
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / '.env', overwrite=False)

SECRET_KEY = env('SECRET_KEY', default='dev-secret-key-change-in-production')
DEBUG = env('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# ── Apps ─────────────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    # Third-party
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
    'allauth.socialaccount.providers.discord',
    # Local
    'game',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'nametheframe.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'nametheframe.wsgi.application'

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = env('DATABASE_URL', default=f'sqlite:///{BASE_DIR}/db.sqlite3')
DATABASES = {
    'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
}

# ── Static files (WhiteNoise) ─────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

# ── Auth ──────────────────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

SITE_ID = 1

# ── Email ─────────────────────────────────────────────────────────────────────
# Fully env-driven. Without EMAIL_HOST_PASSWORD mails go to the console (logs)
# and signup skips verification. Setting the SMTP env vars on Railway enables
# real mail + email verification automatically — no code change needed.
#
# Resend example (https://resend.com — free tier):
#   EMAIL_HOST=smtp.resend.com  EMAIL_HOST_USER=resend
#   EMAIL_HOST_PASSWORD=<api key>  DEFAULT_FROM_EMAIL=Name the Frame <no-reply@nametheframe.com>
EMAIL_HOST          = env('EMAIL_HOST', default='')
EMAIL_PORT          = env.int('EMAIL_PORT', default=587)
EMAIL_HOST_USER     = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS       = env.bool('EMAIL_USE_TLS', default=True)
DEFAULT_FROM_EMAIL  = env('DEFAULT_FROM_EMAIL', default='Name the Frame <no-reply@nametheframe.com>')

EMAIL_CONFIGURED = bool(EMAIL_HOST and EMAIL_HOST_PASSWORD)
EMAIL_BACKEND = env('EMAIL_BACKEND', default=(
    'django.core.mail.backends.smtp.EmailBackend' if EMAIL_CONFIGURED
    else 'django.core.mail.backends.console.EmailBackend'))

# django-allauth
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
# With real email: send a verification mail (non-blocking). Without: skip —
# sending would 500 on a missing SMTP server. Override via env if needed.
ACCOUNT_EMAIL_VERIFICATION = env(
    'ACCOUNT_EMAIL_VERIFICATION',
    default=('optional' if EMAIL_CONFIGURED else 'none'))
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'
# Social signup: take the email from the provider, log straight in.
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_LOGIN_ON_GET = True

# Social providers. A provider's button only appears once its OAuth keys are
# set (env vars) — so without keys there are no broken buttons, and adding the
# keys on Railway activates the provider automatically (no code change).
#
# To activate, set on Railway (per provider):
#   Google:  GOOGLE_CLIENT_ID  / GOOGLE_CLIENT_SECRET
#   GitHub:  GITHUB_CLIENT_ID  / GITHUB_CLIENT_SECRET
#   Discord: DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET
# Redirect/callback URL for each: https://<domain>/accounts/<provider>/login/callback/
SOCIALACCOUNT_PROVIDERS = {}

_SOCIAL = {
    'google':  {'SCOPE': ['profile', 'email'], 'AUTH_PARAMS': {'access_type': 'online'}},
    'github':  {'SCOPE': ['read:user', 'user:email']},
    'discord': {'SCOPE': ['identify', 'email']},
}
for _prov, _cfg in _SOCIAL.items():
    _cid = env(f'{_prov.upper()}_CLIENT_ID', default='')
    _sec = env(f'{_prov.upper()}_CLIENT_SECRET', default='')
    if _cid and _sec:
        SOCIALACCOUNT_PROVIDERS[_prov] = {**_cfg, 'APP': {'client_id': _cid, 'secret': _sec}}

# ── TMDB API key (server-side — not exposed to client) ────────────────────────
# Default is the project's existing v3 key (was already public in the old
# static frontend on GitHub Pages). Override via the TMDB_API_KEY env var on
# Railway to rotate it. It is a low-risk read-only key.
TMDB_API_KEY = env('TMDB_API_KEY', default='1c61618d5544a3d8f83110b7b8444d61')
TMDB_BASE_URL = 'https://api.themoviedb.org/3'
TMDB_IMG_BASE = 'https://image.tmdb.org/t/p'

# ── i18n ─────────────────────────────────────────────────────────────────────
LANGUAGE_CODE = 'pl'
TIME_ZONE = 'Europe/Warsaw'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Security (production) ─────────────────────────────────────────────────────
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # HSTS — production is served only over HTTPS (Railway terminates TLS)
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    # NOTE: Django needs the leading-dot form '.railway.app' (NOT '*.railway.app',
    # which Django's host validation does not match). CSRF_TRUSTED_ORIGINS below
    # is different — there the '*' wildcard IS supported.
    ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['nametheframe.com', '.railway.app'])
    # CSRF trusted origins for the Railway + custom domain (Django 4+ requires scheme)
    CSRF_TRUSTED_ORIGINS = env.list(
        'CSRF_TRUSTED_ORIGINS',
        default=['https://nametheframe.com', 'https://*.railway.app'],
    )

# Django's ALLOWED_HOSTS does not understand the '*.domain' wildcard — it needs
# the leading-dot form '.domain'. Auto-fix any '*.x' the env var may contain so
# a value like 'nametheframe.com,*.railway.app' still works.
ALLOWED_HOSTS = [
    ('.' + h[2:]) if h.startswith('*.') else h
    for h in ALLOWED_HOSTS
]
