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
# It runs at container start instead (see railway.toml startCommand).
RUN python manage.py collectstatic --noinput

CMD ["sh", "-c", "gunicorn nametheframe.wsgi --workers 2 --bind 0.0.0.0:$PORT"]
