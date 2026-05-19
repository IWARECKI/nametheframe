# Name the Frame — CLAUDE.md

## Czym jest projekt

Quiz filmowy dostępny na nametheframe.com. Użytkownik widzi kadr z filmu 
(pełnoekranowe tło) i zgaduje tytuł, reżysera lub rok. Projekt jest w 100% 
front-endowy — jeden plik index.html, deploy na GitHub Pages (iwarecki/nametheframe).

Filozofia: **nie kolejny quiz IMDb**. To kuratorskie doświadczenie dla kinomanów 
i tych którzy chcą nimi zostać. Estetyka kinowa, ciemna, złote akcenty. 
Język polski (docelowo też angielski).

---

## Stack techniczny

- Czysty HTML/CSS/JavaScript — zero frameworków, zero bundlerów
- Obrazy i metadane filmów: TMDB API (The Movie Database)
- TMDB API key wbudowany w kod (developer/personal, niekomercyjny)
- Hosting: GitHub Pages (branch main, root /)
- Domena: nametheframe.com (Cloudflare DNS → GitHub Pages)
- Fonty: Cormorant Garamond (serif, elegancki) + Space Mono (monospace, techniczny)

---

## Struktura index.html

Jeden plik zawiera wszystko: HTML, CSS (w <style>), JavaScript (w <script>).

### Główne sekcje HTML:
- `#intro` — animacja powitalna (projektor, beam, logo fade-in), 3.4s
- `#setup` — ekran konfiguracji: nick, żywioł filmowy, wybór poziomu
- `#game` — właściwa gra: pełnoekranowy kadr jako tło + panel quizu na dole
- `#end` — ekran końcowy z wynikiem, nickiem i żywiołem

### Kluczowe stałe JS:
- `FILMS` — tablica obiektów `{id, title, dir, y}` gdzie id = TMDB movie ID
- `GENRE_LABELS` — mapowanie wartości gatunku na poetyckie opisy (np. horror → "siekacz horrorów")
- `LVL` / `S.diff` — poziom trudności sterujący mechaniką

---

## Trzy poziomy trudności

### 🍿 Akolita Popcornu (`diff: 'test'`)
- Mechanika: test 4 opcje, zgaduje tylko tytuł
- Punktacja: +1 pkt za poprawną odpowiedź
- Dystraktory: inne tytuły z puli FILMS
- Opis: "Film to Netflix, chrupanie i chill. Ekspert od sequeli, prequeli 
  i spin-offów. Szybcy i Wściekli to saga życia, odlicza do premiery 
  kolejnego Pieprzyć Mickiewicza."
- Spoiler mechaniki: "Najważniejszy jest film — zgadujesz tytuł, klasyczny 
  test 4 opcje. Przygląda Ci się Hubert Urbański, który nieprzypadkowo 
  jest aktorem. Prawie jak Milionerzy."

### 🎬 Samozwańczy Kinoman (`diff: 'letter'`)
- Mechanika: wisielec — tytuł jako okienka, jedna litera odkryta
- Punktacja: +2 pkt za tytuł, opcjonalny reżyser: +3 pkt / -1 pkt za błąd
- Margines błędu: Levenshtein distance ≤ 1 (jedna literówka akceptowana)
- Opis: "Tłumaczy znajomym na imprezach różnicę między Davidami — 
  Cronenbergiem, Fincherem a Lynchem. Szczytuje przy każdej wzmiance 
  o Villeneuvie. Ukrywa miłość do Marvela."
- Spoiler mechaniki: "Testy są dla dzieci. Wprawiaj w ruch litery — 
  jedna z nich zawsze odkryta przed Twoim gustem. Masz też opcję reżysera 
  za extra punkty (+3) — ale pomyłka kosztuje (-1)."

### 🎞️ Orędownik Wielkiej Kinezy (`diff: 'expert'`)
- Mechanika: trzy pola — tytuł + rok + opcjonalny reżyser, bez podpowiedzi
- Punktacja: +3 pkt tytuł, +2 pkt rok (±1 rok = 50%, ±2 lata = 25%), 
  opcjonalny reżyser: +3 pkt / -1 pkt za błąd
- Margines błędu: Levenshtein ≤ 1 dla tytułu i reżysera
- Opis: "Zostaje na napisach. Nigdy nie wychodzi na siu siu. Płacze z dumą 
  na Malicku. Do każdego outfitu ma inną torbę filmfestiwalową. Ze smutkiem 
  akceptuje ludzi oceniających filmy na Filmwebie."
- Cytat w spoilerze: "Wróg sztuki to brak ograniczeń." — Orson Welles

---

## Baza filmów (FILMS)

Format każdego wpisu:

```js
{id: TMDB_ID, title: 'Tytuł', dir: 'Reżyser', y: ROK}
```

Aktualna baza (10 filmów startowych):
- Persona (Bergman, 1966) — id: 797
- Stalker (Tarkowski, 1979) — id: 1398
- 8½ (Fellini, 1963) — id: 422
- Suspiria (Argento, 1977) — id: 11906
- Funny Games (Haneke, 1997) — id: 10234
- Pulp Fiction (Tarantino, 1994) — id: 680
- Mulholland Drive (Lynch, 2001) — id: 1018
- Oldboy (Park Chan-wook, 2003) — id: 670
- Drive My Car (Hamaguchi, 2021) — id: 758866
- EO (Skolimowski, 2022) — id: 785398

**Przy dodawaniu filmów:** zawsze weryfikuj TMDB ID na themoviedb.org. 
Filmy powinny być zróżnicowane — różne dekady, regiony, gatunki, poziomy 
trudności. Unikaj filmów bez backdrops w TMDB.

---

## Styl i estetyka — ZACHOWAJ

```css
--gold: #c9a96e          /* złoty akcent — główny kolor interaktywny */
--text: #f0ebe2          /* ciepła biel — tekst */
--glass: rgba(6,6,6,.8)  /* panel quizu — ciemne szkło */
--border: rgba(255,255,255,.09)
--r: 4px                 /* border-radius */
```

Fonty:
- Nagłówki, tytuły, pytania: `Cormorant Garamond` (serif, elegancki)
- UI, przyciski, monospace: `Space Mono`

Zasady estetyczne:
- Kadr filmowy = pełnoekranowe tło (position: fixed, object-fit: cover)
- Panel quizu na dole z backdrop-filter: blur
- Minimalizm — zero zbędnych elementów
- Animacje delikatne, filmowe (fade, nie bounce)

---

## Żywioł filmowy

Użytkownik wybiera gatunek przed grą. Pojawia się przy wyniku końcowym 
jako poetycki opis, np. "Kowalski · żywioł: siekacz horrorów".

Mapowanie (GENRE_LABELS):
horror→siekacz horrorów, thriller→łowca thrillerów, noir→czciciel mroku,
kryminał→detektyw kina, dramat→dramaturg salonów, komedia→kronikarz śmiechu,
romans→romantyk srebrnego ekranu, melodramat→płakacz pierwszego rzędu,
akcja→żołnierz ekranu, przygodowy→odkrywca nowych światów, western→rewolwerowiec kina,
wojenny→kronikarz wojen, szpiegowski→agent specjalny, superbohaterski→obrońca galaktyki,
sci-fi→wizjoner przyszłości, fantasy→strażnik magii, animacja→dusza rysunku,
baśń→bajarz wieczorny, surrealizm→budowniczy snów, art-house→kapłan sztuki,
slow-cinema→kontemplator ciszy, eksperyment→demolator formy, 
esej-filmowy→myśliciel z projektora, dokumentalny→łowca prawdy,
mockumentary→kłamca z kamerą, body-horror→anatom ekranu,
giallo→kolekcjoner czerwieni, yakuza→samuraj multipleksu, 
road-movie→nomad asfaltu, coming-of-age→strażnik niewinności,
mumblecore→szeptem o życiu, neon-noir→nocny łowca neonów, 
musical→śpiewak w ciemności

---

## Planowane funkcje (TODO)

- [ ] Rozbudowa bazy do 50+ filmów (zróżnicowane epoki, regiony, gatunki)
- [ ] Lepsze dystraktory w teście — z tej samej epoki/regionu co poprawny film
- [ ] Lokalna tabela wyników (localStorage)
- [ ] Globalna tabela wyników (wymaga backendu)
- [ ] Filtry przed grą: region, dekada, gatunek, nagrody, reżyser
- [ ] Achievementy (np. "Królestwo Snu" za 3 filmy Lyncha w sesji)
- [ ] Daily challenge — jeden kadr dziennie dla wszystkich
- [ ] Wersja angielska

---

## Czego NIE zmieniać bez pytania

- Nazwy poziomów i ich opisy (Akolita Popcornu, Samozwańczy Kinoman, 
  Orędownik Wielkiej Kinezy) — to jest kuratorski content, nie przypadkowe nazwy
- Paleta kolorów i fonty — estetyka jest świadoma i celowa
- Cytat Wellesa w spoilerze Orędownika
- Logika punktacji i margines błędu Levenshtein
- Animacja intro (beam + logo fade)

---

## Git workflow

Repozytorium: https://github.com/iwarecki/nametheframe
Branch: main
Deploy: automatyczny przez GitHub Pages po każdym push

Po każdej zmianie:

```bash
git add .
git commit -m "opis zmiany"
git push
```

GitHub Pages deplouje automatycznie w ~1-2 minuty.
