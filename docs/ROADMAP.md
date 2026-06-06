# Name the Frame — plan rozwoju i zarządzania

> Przygotowane autonomicznie w nocy 2026-06-06. Stan odniesienia: aplikacja
> działa na Railway (Docker + Postgres), kadry TMDB ładują się poprawnie,
> panel admina ma motyw kinowy. Poniżej: uwierzytelnianie, przeprojektowanie
> punktacji, 3 punkty pod zarządzanie stroną oraz lista 12 ulepszeń.

---

## 1. Uwierzytelnianie (logowanie / rejestracja)

`django-allauth` jest już zainstalowany i skonfigurowany (patrz `settings.py`).
Brakuje tylko: szablonów UI, kluczy OAuth od dostawców i podpięcia przycisków
w grze. Logowanie e-mail/hasło jest **technicznie gotowe** — działa pod
`/accounts/login/` i `/accounts/signup/`, tylko wygląda jak surowy allauth.

### 1a. E-mail + hasło  — *gotowe w ~80%*
- **Stan:** allauth `account` aktywny, `ACCOUNT_LOGIN_METHODS={'email'}`,
  weryfikacja e-mail `optional`.
- **Do zrobienia:**
  1. Szablony `templates/account/login.html`, `signup.html`, `logout.html`
     w stylu gry (czerń + złoto) — przez `{% extends %}` wspólnego layoutu.
  2. Skonfigurować wysyłkę e-maili (na razie `console` backend; na produkcji
     np. Resend / Mailgun / SMTP) — potrzebne do resetu hasła i weryfikacji.
  3. Podpiąć przyciski „Zaloguj / Zarejestruj" w ekranie startowym gry.
- **Wysiłek:** ~½ dnia (głównie szablony + provider e-mail).

### 1b. Google  — *konfiguracja, brak kluczy*
- **Stan:** provider `allauth.socialaccount.providers.google` w `INSTALLED_APPS`,
  `SOCIALACCOUNT_PROVIDERS['google']` czyta `GOOGLE_CLIENT_ID/SECRET` z env.
- **Do zrobienia:**
  1. Google Cloud Console → APIs & Services → Credentials → OAuth client ID
     (typ: Web application).
  2. Authorized redirect URI:
     `https://<twoja-domena>/accounts/google/login/callback/`
     (oraz `http://localhost:8000/...` do testów lokalnych).
  3. Ustawić `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET` w zmiennych Railway.
- **Wysiłek:** ~1 h (sama konsola Google).

### 1c. GitHub  — *łatwy dodatkowy provider*
- **Czemu:** trywialny w allauth, popularny wśród „filmowo-technicznej" widowni.
- **Do zrobienia:**
  1. `INSTALLED_APPS += 'allauth.socialaccount.providers.github'`.
  2. GitHub → Settings → Developer settings → OAuth Apps → New.
     Callback: `https://<domena>/accounts/github/login/callback/`.
  3. Klucze do env: `GITHUB_CLIENT_ID/SECRET` + wpis w `SOCIALACCOUNT_PROVIDERS`.
- **Wysiłek:** ~30 min.

### 1d. Discord  — *drugi łatwy provider*
- **Czemu:** świetny dla społeczności filmowej (serwery o kinie); allauth ma
  gotowy provider `discord`.
- **Do zrobienia:**
  1. `INSTALLED_APPS += 'allauth.socialaccount.providers.discord'`.
  2. https://discord.com/developers → New Application → OAuth2 → Redirect:
     `https://<domena>/accounts/discord/login/callback/`.
  3. Klucze do env.
- **Wysiłek:** ~30 min.

> **Uwaga porządkowa:** po dodaniu logowania warto połączyć wynik gry z kontem
> (pole `Score.user` już istnieje i jest wypełniane, gdy gracz jest zalogowany),
> a w rankingu pokazywać zweryfikowane konta inaczej niż gości.

---

## 2. Przeprojektowanie punktacji

### Problem z obecnym systemem
1. **Nieporównywalne poziomy w jednym rankingu.** Popcorn maks ~10 pkt,
   Kineza ~80 pkt. Globalny ranking faworyzuje trudny tryb — początkujący
   nigdy nie trafią na szczyt, mimo perfekcyjnej gry.
2. **Brak nagrody za tempo.** Zgadnięcie w 2 s i w 60 s daje tyle samo.
3. **Brak serii (streak/combo).** Nie ma premii za nieprzerwaną passę.
4. **Punkty całkowite zależą od liczby rund** (zawsze 10) — OK, ale nie ma
   żadnej normalizacji do procentu.

### Propozycja: wynik znormalizowany + mnożniki
Zachowujemy „surowe" punkty za odpowiedź, ale wynik końcowy liczymy tak:

```
wynik_rundy = bazowe_pkt
            × mnożnik_poziomu        (popcorn 1.0 / kinoman 1.4 / kineza 1.8)
            × (1 + bonus_czasu)      (0…+0.5 liniowo: szybciej = więcej)
            × (1 + bonus_serii)      (+0.1 za każdą kolejną dobrą odpowiedź, max +0.5)
```

- **Mnożnik poziomu** wyrównuje trudność: dobry gracz Popcornu może rywalizować
  z dobrym graczem Kinezy, bo łatwiejsze pytania dają mniej punktów bazowych,
  ale wszyscy grają „o ten sam sufit" po przemnożeniu.
- **Bonus czasu**: licznik na rundę (np. 30 s); `bonus = 0.5 × pozostały_czas/limit`.
- **Bonus serii (combo)**: resetowany przy błędzie; widoczny licznik „🔥 ×3".

### Dodatkowo
- **Osobne rankingi per poziom** (filtr już jest w `api_scores?level=`),
  PLUS jeden ranking „Overall" liczony na wyniku znormalizowanym.
- **Walidacja po stronie serwera (ważne!).** Dziś punkty liczy wyłącznie
  przeglądarka i wysyła gotowy `score` — trywialne do oszukania. Docelowo
  serwer powinien znać poprawne odpowiedzi i liczyć punkty sam (patrz
  ulepszenie #1 niżej).
- **Tabela najlepszych dziennych / tygodniowych** (pole `ts` już jest).

---

## 3. Trzy punkty pod zarządzanie stroną (ops)

### 3.1. Monitoring błędów + logi (Sentry)
Dziś błąd produkcyjny widać tylko w logach Railway. Dodanie `sentry-sdk`
(kilka linii w `settings.py`, darmowy plan) da: alerty mailowe o wyjątkach,
stack-trace z kontekstem, śledzenie wydajności. **To pierwsza rzecz, którą
chce się mieć, gdy stronę używają realni ludzie.**

### 3.2. Kopie zapasowe i eksport danych
Postgres na Railway ma snapshoty, ale warto:
- włączyć automatyczne backupy w panelu Railway (Database → Backups),
- dodać komendę `manage.py dumpdata game.Score --output backup.json` do
  okresowego eksportu (np. cotygodniowy scheduled task),
- mieć procedurę odtworzenia (`loaddata`).
Bez tego jeden błędny `migrate`/usunięcie = utrata rankingu.

### 3.3. Ochrona API zapisu wyników (rate-limit + walidacja)
Endpoint `POST /api/scores/save/` przyjmuje dowolny `score`. Minimalnie:
- limit zapisów na IP / sesję (np. `django-ratelimit`),
- walidacja zakresu (`0 ≤ score ≤ teoretyczne_max_dla_poziomu`),
- docelowo: serwer liczy wynik sam (eliminuje cheaterów z rankingu).
To kwestia higieny — ranking publiczny bez tego szybko się „zaśmieca".

> Bonus 3.4 (domena): podpiąć `nametheframe.com` w Railway (Settings → Networking
> → Custom Domain) + rekord CNAME u rejestratora. Plik `CNAME` w repo sugeruje,
> że domena już istnieje — wystarczy przekierować ją z GitHub Pages na Railway.

---

## 4. Lista ulepszeń (12)

1. **Serwerowa walidacja odpowiedzi i punktów** — przenieść logikę zgadywania
   do Django (gra pyta API o pytanie i wysyła odpowiedź; serwer liczy punkty).
   Eliminuje oszustwa i jest fundamentem uczciwego rankingu.
2. **Testy automatyczne** — `pytest` + `pytest-django` na: scoring, fuzzy-match,
   endpointy API, zapis wyniku. Dziś zero testów.
3. **CI (GitHub Actions)** — uruchamiać testy i `manage.py check --deploy` na
   każdy push, zanim Railway zbuduje obraz.
4. **PWA / tryb offline** — manifest + service worker; gra ładuje kadry z TMDB,
   ale UI mogłoby działać jako instalowalna apka mobilna.
5. **Profile graczy** — strona `/u/<nick>` z historią wyników, statystykami,
   ulubionymi gatunkami (dane już są w modelu `Score`).
6. **Więcej trybów** — np. „tylko polskie kino", „dekada lat 90.", „reżyser
   z kadru", tryb na czas (speedrun 60 s).
7. **Udostępnianie wyniku** — generowany obrazek/karta wyniku do wrzucenia na
   Instagram/X (Open Graph + endpoint renderujący PNG).
8. **i18n / wersja EN** — gra jest po polsku; allauth i Django gotowe na i18n,
   warto wydzielić teksty i dodać angielski, by wyjść poza PL.
9. **Cache kadrów TMDB** — dziś cache jest w pamięci procesu (`TMDB_CACHE`) i
   znika po restarcie; przenieść do Redis lub bazy + ETag, by oszczędzać limity
   TMDB i przyspieszyć start gry.
10. **Dostępność (a11y)** — kontrast, nawigacja klawiaturą, `aria-*`, focus-ring;
    obecnie gra jest mocno „myszkowa".
11. **Antyspoiler / dobór kadrów** — niektóre kadry zdradzają tytuł (napisy,
    plakaty). Filtrować po stronie serwera lub pozwolić adminowi oznaczać
    „zły kadr" (mechanizm zgłaszania już jest w UI — podpiąć go do modelu).
12. **Panel statystyk gry w adminie** — wykres wyników w czasie, najczęściej
    mylone filmy, skuteczność per gatunek (Django admin + prosty wykres lub
    osobny widok). Rozszerzenie banera, który już dodałem.

---

### Sugerowana kolejność (gdybym miał priorytetyzować)
1. Domena + Google login (szybkie, widoczne efekty).
2. Sentry + backupy (bezpieczeństwo operacyjne).
3. Serwerowa walidacja + rate-limit (uczciwy ranking).
4. Przeprojektowanie punktacji + osobne rankingi.
5. Testy + CI (stabilność na przyszłość).
6. Reszta wg apetytu produktowego.
