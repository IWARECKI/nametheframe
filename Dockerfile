FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=nametheframe.settings

WORKDIR /app

# Install Python deps first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

# collectstatic needs no database, so it is safe at build time.
# migrate is intentionally NOT here — the DB is unreachable during build.
# It runs at container start instead (see entrypoint.sh).
RUN python manage.py collectstatic --noinput

# Start: migrate → ensure_superuser → exec gunicorn (foreground/PID 1).
RUN chmod +x entrypoint.sh
CMD ["./entrypoint.sh"]
