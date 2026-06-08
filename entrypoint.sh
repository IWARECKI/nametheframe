#!/bin/sh
set -e

# Runs at container start. migrate needs the DB (available now, unlike build).
python manage.py migrate --noinput

# Optional admin bootstrap; never let it block the server from starting.
python manage.py ensure_superuser || true

# exec → gunicorn becomes PID 1 (foreground), so the container stays alive
# as long as gunicorn runs. Fall back to 8080 if Railway did not inject PORT.
#
# Threaded workers: the /api/backdrops proxy is I/O-bound (waits on TMDB), and
# the frontend preloads ~176 films at once. Sync workers (2) saturate and time
# out under that burst → empty backdrops → "BRAK KADRU". 2×8 threads = 16
# concurrent requests handles the burst smoothly.
exec gunicorn nametheframe.wsgi \
    --workers 2 \
    --threads 8 \
    --worker-class gthread \
    --timeout 60 \
    --bind "0.0.0.0:${PORT:-8080}" \
    --access-logfile - \
    --error-logfile -
