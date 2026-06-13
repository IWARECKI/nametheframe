# Zadanie: Refaktoryzacja ekranu startowego

## Kontekst
Ekran ma być ekstremalnie minimalistyczny. Tylko nick + wielki przycisk "Zapal projektor". Jeden tryb (Popcorn) domyślny pod maską.

## Backend (Django)
1. Nowy endpoint `GET /api/nick-check/?nick=xxx` — sprawdza czy nick jest zajęty w bazie (Score lub User.first_name). Zwraca `{available: true/false}`.
2. Jeśli user zalogowany (allauth) — nick z profilu (read-only na froncie).
3. Jeśli gość — walidacja nicku przed startem.

## Frontend
1. **Usunąć z widoku**: żywioł (select), karuzelę poziomów, label "Wybierz seans"
2. **Zostawić**: auth-bar (góra), brand, input nick, przycisk "Zapal projektor"
3. **Przycisk "Wyniki"** — zwinięty do małego dyskretnego linku pod głównym przyciskiem
4. **Domyślnie**: S.level='popcorn', S.diff='test', S.genre='casual' (pod maską)

## UX/Game Feel
### Przycisk "Zapal projektor":
- Wygląd: ciężki metalowy przełącznik kinowy
- Głęboki box-shadow (8px+), zmniejsza się przy :active (fizyczne wciśnięcie)
- Web Audio: ciężki "clunk" (niski ton, krótki) przy kliknięciu
- Transition: transform scale(0.97) + shadow collapse

### Błąd nicku (zajęty/pusty):
- Input miga jaskrawoczerwono (2-3 razy, ~100ms each)
- Dźwięk zwarcia (krótki szum + trzask)
- Pod inputem pojawia się tekst: "Ten pseudonim jest już na taśmie"
- Tekst ma efekt "przepalonej żarówki" (miga raz i gaśnie do ciemnoczerwonego)

### Nick zalogowanego:
- Input disabled, wypełniony nickiem z profilu
- Lekko inna stylizacja (złota ramka zamiast białej)

## Pliki do modyfikacji:
- `templates/index.html` — przebudowa sekcji #setup
- `static/css/main.css` — nowe style przycisków, error states
- `static/js/ui/setup.js` — nowa logika (usunąć carousel, dodać nick-check, audio)
- `game/views.py` — nowy endpoint nick-check
- `game/urls.py` — route
