# Name the Frame — System Progresji Gracza

> Dokument projektowy: pełny system progresji, odblokowania, ekonomii i monetyzacji.
> Metodyka: Roguelike (meta-progresja, proceduralność) + Nintendo/Zelda (dawkowanie, odkrywanie).
> Porównanie z: Framed.wtf, Wordle, Duolingo, Letterboxd, Heardle.

---

## 1. Filozofia & Core Loop

### Dlaczego gracz wraca?

**Framed.wtf** daje 1 quiz dziennie — szybko się nudzi. **Wordle** działa bo jest rytuał. **Duolingo** trzyma streakami i wstydem. My łączymy wszystko:

- **Rytuał** (daily challenge o 21:37)
- **Progresja** (odblokowania, rangi, odkrywanie)
- **Ciekawość** (jaki film to będzie? jaki żywioł odblokuję?)
- **Rywalizacja** (leaderboard, Kinofreak miesiąca)
- **Kolekcjonerstwo** (rangi reżyserów, odznaki, galeria ulubionych kadrów)

### Pętle czasowe

| Pętla | Czas | Co gracz robi |
|-------|------|---------------|
| Mikro | 10s | Patrzy na kadr → myśli → odpowiada → feedback |
| Sesja | 3-5 min | 10 rund, wynik, odkrycie żywiołu/rangi |
| Dzienna | 1-2x/dzień | Wykorzystuje bilety, daily challenge, sprawdza profil |
| Tygodniowa | co tydzień | Nowa liga, postęp rang, nowe odblokowania |
| Miesięczna | co miesiąc | Kinofreak miesiąca, sezonowe wyzwania |

### Zasada Zeldy: "Drzwi → Klucz → Nowe Drzwi"

Każde odblokowanie otwiera nową mechanikę, która z kolei prowadzi do kolejnego odblokowania:
- Grasz Popcorn → zdobywasz punkty → odblokowujesz Kinomana
- Grasz Kinomana → odkrywasz gatunki → gatunki dają bonusy
- Bonusy pomagają w Kinezie → Kineza daje rangi reżyserskie
- Rangi reżyserskie otwierają filtry → filtry dają dostęp do niszowych filmów

---

## 2. System Progresji — Drzewo Odblokowania

### Poziomy trudności

| Poziom | Odblokowanie | Warunek |
|--------|-------------|---------|
| 🍿 Akolita Popcornu | Od startu | — |
| 🎬 Samozwańczy Kinoman | Po zdobyciu **15 pkt łącznie** | ~3-4 dobre sesje Popcornu |
| 🎞️ Orędownik Wielkiej Kinezy | Po zdobyciu **50 pkt łącznie** + min. 1 sesja Kinomana | |

### XP i Poziom Gracza

Wprowadzamy **Poziom Kinomana** (LVL 1–50):
- XP = punkty z gier × mnożnik poziomu
- Każdy LVL wymaga rosnąco więcej XP (krzywa logarytmiczna)
- LVL odblokuje kolejne mechaniki:

| LVL | Odblokowanie |
|-----|-------------|
| 1 | Gra, Popcorn, 3 bilety/dzień |
| 3 | Odkrywanie żywiołów |
| 5 | Kinoman (poziom trudności) |
| 7 | Serduszka (like kadrów) |
| 10 | Daily Challenge |
| 12 | Rangi reżyserskie |
| 15 | Kineza (poziom trudności) |
| 18 | Filtry: dekady |
| 20 | 4. bilet dzienny (bonus) |
| 25 | Filtry: kraje |
| 30 | Filtry: nagrody |
| 35 | 5. bilet dzienny |
| 40 | Tryb Wyzwania (themed quizy) |
| 50 | Tytuł "Projekcjonista" — pełny dostęp |

### Komunikacja odblokowania (UX)

Jak w Zelda: **"Da-da-da-DAAA!"** moment:
- Ekran pauzy z animacją (złota ramka, tekst "NOWY POZIOM")
- Krótki opis co się odblokowało
- Przycisk "Wypróbuj teraz" — natychmiast prowadzi do nowej mechaniki
- Bez przytłaczania — jedna nowość na raz

---

## 3. Bilety Dzienne & Ekonomia

### Podstawowy system

| Element | Wartość |
|---------|---------|
| Bilety bazowe/dzień | 3 |
| Reset biletów | 00:00 czasu polskiego |
| Max bilety (z bonusami) | 5 |
| Bilet = | 1 sesja (10 rund) |

### Zdobywanie dodatkowych biletów

- **Streak dzienny** (7 dni z rzędu) → +1 bilet na 7. dzień
- **Daily Challenge** nie kosztuje biletu (zachęta do powrotu)
- **Osiągnięcie** → jednorazowy bonus +2 bilety
- **LVL 20, 35** → permanentny +1 bilet/dzień
- **Zaproszenie znajomego** (referral) → +3 bilety jednorazowo

### Gdy bilety się skończą

Nie "paywall" — raczej **"do zobaczenia jutro"**:
- Ekran z napisem kinowym: *"Projekcja na dziś zakończona. Kolejny seans jutro."*
- Pokazuje: ile czasu do resetu, Twój streak, zachęta do daily challenge
- Można przeglądać profil, galerie kadrów, rankingi — ale nie grać

### Dlaczego 3 a nie więcej?

Framed.wtf daje 1/dzień — za mało. Duolingo daje "serduszka" (5 błędów). My dajemy 3 sesje = ~30 rund = 15-20 minut rozgrywki. Dość by poczuć postęp, za mało by się nasycić. **Niedosyt = powrót jutro.**

---

## 4. Żywioły (Gatunki) — Discovery & Utility

### Odkrywanie żywiołów

Żywioły NIE są dostępne na starcie. Gracz zaczyna bez etykiety. System monitoruje jakie filmy odgadujesz i **odkrywa** żywioły:

| Warunek odkrycia | Żywioł |
|-----------------|--------|
| Odgadnij 3 filmy z gatunku | Żywioł odkryty (pojawia się w profilu) |
| Odgadnij 8 filmów z gatunku | Żywioł "aktywny" (można go wybrać) |
| Odgadnij 15 filmów z gatunku | Żywioł "opanowany" (daje bonus) |

### Co daje wybrany żywioł?

**Mechanika bonusu**: wybrany żywioł daje **+1 pkt** za każdy poprawnie odgadnięty film z tego gatunku. Ale UWAGA — żywioł widoczny jest dla innych graczy w rankingu. To Twoja "klasa postaci".

**Pasywne bonusy żywiołu (po opanowaniu):**

| Żywioł | Bonus pasywny |
|--------|--------------|
| 🩸 Horror | "Instynkt" — raz na sesję możesz odrzucić 1 opcję w teście |
| 😂 Komedia | "Publiczność" — +5% XP za całą sesję |
| 🎭 Dramat | "Wczucie" — podpowiedź rok ±5 lat (raz/sesja) |
| 🚀 Sci-Fi | "Skan" — podgląd 2s powiększenia kadru |
| 🎞️ Art-house | "Trzecie oko" — reżyser opcjonalny daje +4 zamiast +3 |
| 🕵️ Noir | "Detektyw" — przy wisielcu 2 litery odkryte zamiast 1 |

To jest roguelike'owy element: **wybór klasy wpływa na rozgrywkę**.

### UX odkrycia

Gdy odkrywasz żywioł — animacja: stary kinowy bilet z nazwą żywiołu "materializuje się" na ekranie. Tekst: *"Odkryłeś swój żywioł: 🩸 Siekacz Horrorów"*.

---

## 5. Rangi Reżyserskie & Aktorskie

### Koncepcja

Dla każdego reżysera (który ma ≥3 filmy w bazie) — pasek progresji. Im więcej jego filmów odgadniesz, tym wyższa ranga. Nazwy rang nawiązują do filmografii.

### Przykładowe drabinki rang

**David Lynch:**
| % filmów odgadniętych | Ranga |
|----------------------|-------|
| 20% | Turysta w Twin Peaks |
| 40% | Gość w Red Room |
| 60% | Leżysz na Zagubionej Autostradzie |
| 80% | Widziałeś słonia |
| 100% | Sam jesteś Lynchiem |

**Quentin Tarantino:**
| % | Ranga |
|---|-------|
| 20% | Widziałeś krew na ekranie |
| 40% | Znasz piosenkę z soundtracku |
| 60% | Cytujesz Ezechiel 25:17 |
| 80% | Royale with Cheese Connoisseur |
| 100% | Piąta Ściana Tarantino |

**Stanley Kubrick:**
| % | Ranga |
|---|-------|
| 20% | Here's Johnny (nowicjusz) |
| 40% | Droog Pierwszej Klasy |
| 60% | Otwieram kapsułę HAL |
| 80% | Singing in the Rain (ironicznie) |
| 100% | Monolith |

**Christopher Nolan:**
| % | Ranga |
|---|-------|
| 20% | Śpisz na INCEPTION |
| 40% | Czas biegnie wolniej |
| 60% | Interstellar Emotional Damage |
| 80% | Tenet — rozumiesz? |
| 100% | Oppenheimer tych quizów |

**Hayao Miyazaki:**
| % | Ranga |
|---|-------|
| 20% | Widziałeś Totoro |
| 40% | Lecisz na miotle |
| 60% | Poruszony Zamek |
| 80% | Spirited Away dosłownie |
| 100% | Studio Ghibli w sercu |

### Rangi aktorskie (podobnie)

Dla aktorów z ≥5 filmami w bazie: Leonardo DiCaprio, Morgan Freeman, Cate Blanchett, etc.

### Wyświetlanie w profilu

- Karta gracza: nick + żywioł + top 3 rangi reżyserskie
- Np: *"Kowalski · Siekacz Horrorów · 🎬 Leżysz na Zagubionej Autostradzie (Lynch 60%) · Royale with Cheese (Tarantino 80%)"*

---

## 6. System Serduszek (❤️ Kadr)

### Mechanika

Po każdej rundzie (niezależnie od wyniku) pojawia się ikonka ❤️ pod kadrem. Kliknięcie = "podoba mi się ten kadr".

### Co to daje:

1. **Galeria ulubionych** — w profilu gracza, sekcja "Moje kadry" — estetyczna kolekcja
2. **Popularne kadry** — ranking najczęściej lajkowanych kadrów globalnie (social proof)
3. **Rekomendacje** — "Skoro lubisz te kadry, spróbuj filmów z tego gatunku/reżysera"
4. **Admin insight** — wiemy które kadry są najładniejsze → możemy je promować w daily
5. **Social sharing** — udostępnij swój ulubiony kadr na IG/X z watermarkiem "Name the Frame"

### Analogia Nintendo

Jak "foto mode" w grach — nie wpływa na gameplay, ale daje osobiste doświadczenie i powód do powrotu (przeglądanie kolekcji).

---

## 7. Osiągnięcia & Odznaki (30+)

### Kategorie

**Progresja:**
1. 🎬 *Pierwszy Seans* — odgadnij pierwszy film
2. 🍿 *Popcorn Master* — zdobądź 10/10 w sesji Popcorn
3. 🎞️ *Wielka Kineza* — odblokuj poziom Kineza
4. 📈 *Seria 5* — odgadnij 5 filmów z rzędu
5. 📈 *Seria 10* — odgadnij 10 filmów z rzędu
6. 🔥 *Tydzień w kinie* — streak 7 dni

**Żywioły:**
7. 🩸 *Pierwsza krew* — odkryj żywioł Horror
8. 🌈 *Poliglota gatunków* — odkryj 5 żywiołów
9. 🎭 *Mistrz żywiołu* — opanuj (lvl 3) dowolny żywioł
10. 🌊 *Władca żywiołów* — opanuj 3 żywioły

**Reżyserzy:**
11. 🎥 *Uczęń mistrza* — osiągnij 1. rangę dowolnego reżysera
12. 🎥 *Cinefil* — osiągnij 3. rangę dowolnego reżysera
13. 🏆 *Stuprocentowiec* — 100% filmów jednego reżysera
14. 👑 *Kolekcjoner autografów* — rangi u 5 różnych reżyserów

**Wiedza:**
15. 🌍 *Obywatel świata* — odgadnij filmy z 10 różnych krajów
16. 📅 *Podróżnik w czasie* — odgadnij film z każdej ery (5 er)
17. 🏆 *Oscar Goes To...* — odgadnij 10 filmów nagrodzonych Oscarem
18. 🎵 *Cannes Cannes* — odgadnij 5 laureatów Cannes
19. 🐻 *Niedźwiedź Berliński* — odgadnij 3 laureatów Berlinale
20. 🦁 *Złoty Lew* — odgadnij 3 laureatów Wenecji

**Social:**
21. ❤️ *Kinesteta* — serduszko 10 kadrów
22. ❤️ *Kolekcjoner* — serduszko 50 kadrów
23. 🏆 *Daily Hero* — wygraj daily challenge
24. 👥 *Ambasador* — zaproś znajomego (referral)

**Ukryte (Zelda-style secrets):**
25. 🌙 *Nocna Sowa* — graj między 2:00 a 5:00
26. 🎂 *Rocznica* — graj dokładnie rok po rejestracji
27. 💀 *Memento Mori* — przegraj 10 rund z rzędu
28. 🐰 *Easter Egg* — odgadnij film w <2 sekundy
29. 🤯 *Impossible* — pełne punkty w Kinezie (tytuł + rok + reżyser)
30. 📽️ *21:37* — zagraj daily challenge w dniu premiery (film + data)
31. 🎞️ *Taśma się kończy* — wykorzystaj wszystkie bilety w 1 minutę
32. 🖤 *Monotematyczny* — 20 filmów z rzędu z tego samego gatunku

---

## 8. Social & Rywalizacja

### Daily Challenge (21:37)

- Codziennie o 21:37 — 5 kadrów, identycznych dla wszystkich
- Nie kosztuje biletu
- Ranking: najszybszy czas + najwyższy wynik
- **Kinofreak tygodnia / miesiąca** — podium z nagrodami (odznaki, bilety)

### Ligi (inspiracja Duolingo)

| Liga | Warunek wejścia | Gracze |
|------|-----------------|--------|
| Kino Osiedlowe | wszyscy nowi | ~30/liga |
| Kino Studyjne | LVL 5+ | ~30/liga |
| Festiwal | LVL 15+ | ~30/liga |
| Cannes | LVL 30+ | ~20/liga |
| Akademia | Top 100 globalnie | zaproszenie |

- Reset co tydzień (pon 00:00)
- Top 5 awansuje, bottom 5 spada
- Liga = motywacja do grania regularnie

### Udostępnianie

Po sesji — generowany obrazek wyniku (jak Wordle):
```
🎬 Name the Frame #247
🍿 8/10 · 🔥 streak 5
⬛⬛🟨🟩🟩🟩🟩🟩🟩🟩
nametheframe.com
```

---

## 9. Monetyzacja

### Model: Freemium + Battle Pass

**DARMOWE (na zawsze):**
- 3 bilety/dzień
- Pełna progresja (LVL, żywioły, rangi)
- Daily challenge
- Wszystkie osiągnięcia
- Leaderboardy

**PREMIUM "Karta Stałego Widza" (~15 PLN/miesiąc):**
- 5 biletów/dzień (zamiast 3)
- Bez reklam (jeśli dodamy)
- Ekskluzywne odznaki (złote ramki)
- Dostęp do archiwalnych daily challenges
- Statystyki zaawansowane (heat map gatunków, porównanie z innymi)
- Priorytet w ligach (szybszy awans)

**SEZONOWY "Festiwalowy Pass" (~25 PLN/sezon, 3 miesiące):**
- Wszystko z Premium
- Sezonowe wyzwania tematyczne (np. "Maj: Kino Azjatyckie")
- Unikalne kosmetyki profilowe (zmiana koloru ramki, animowane avatary)
- Ekskluzywne tryby (np. "Blind Mode" — rozmyty kadr, wyostrzasz kliknięciami)
- Early access do nowych filmów w bazie

**NIE sprzedajemy:**
- Podpowiedzi (P2W)
- Punktów
- Rang
- Osiągnięć

### Dlaczego to zadziała?

- Framed.wtf jest darmowy ale nudny (1 quiz/dzień, zero progresji)
- Duolingo zarabia na Super (serduszka + streak freeze + bez reklam)
- My dajemy wystarczająco darmowo żeby budować nawyk, premium daje komfort i status

---

## 10. UX — Pierwsza Godzina, Dzień, Tydzień

### Pierwsza godzina:

1. Intro animacja (projektor, typewriter)
2. "Wpisz nick" — jedyne co trzeba
3. Od razu gra — Popcorn, 10 rund
4. Po sesji: wynik + "Zdobyłeś LVL 2!" + "Jeszcze 5 pkt do Kinomana!"
5. Opcja: zaloguj się żeby zapisać postęp (Google/Discord)

### Pierwszy dzień:

- 3 sesje (bilety)
- Odkrycie 1-2 żywiołów
- Prawdopodobne odblokowanie Kinomana
- Daily challenge (jeśli LVL 10+) lub zachęta "wróć jutro na daily!"

### Pierwszy tydzień:

- LVL 10-15
- 3-5 żywiołów odkrytych
- 1-2 rangi reżyserskie rozpoczęte
- Przynależność do ligi
- Streak budowany (motywacja żeby nie przerwać)
- Daily challenge codziennie

---

## 11. Notatki Techniczne

### Nowe modele Django:

```python
class PlayerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=CASCADE)
    level = models.IntegerField(default=1)
    xp = models.IntegerField(default=0)
    total_points = models.IntegerField(default=0)
    tickets_today = models.IntegerField(default=3)
    tickets_reset_at = models.DateTimeField()
    streak_days = models.IntegerField(default=0)
    last_played = models.DateField(null=True)
    selected_genre = models.CharField(max_length=32, blank=True)
    unlocked_difficulties = JSONField(default=list)  # ['popcorn']
    unlocked_genres = JSONField(default=dict)  # {'horror': 12, 'comedy': 3}
    hearts_given = models.IntegerField(default=0)

class DirectorRank(models.Model):
    player = ForeignKey(PlayerProfile)
    director = CharField(max_length=120)
    films_guessed = IntegerField(default=0)
    films_total = IntegerField(default=0)
    rank_level = IntegerField(default=0)

class Achievement(models.Model):
    player = ForeignKey(PlayerProfile)
    code = CharField(max_length=50, unique per player)
    unlocked_at = DateTimeField(auto_now_add=True)

class HeartedFrame(models.Model):
    player = ForeignKey(PlayerProfile)
    film = ForeignKey(Film)
    backdrop_path = CharField(max_length=120)
    created = DateTimeField(auto_now_add=True)

class DailyChallenge(models.Model):
    date = DateField(unique=True)
    films = JSONField()  # list of 5 film IDs
    created = DateTimeField(auto_now_add=True)

class DailyChallengeResult(models.Model):
    challenge = ForeignKey(DailyChallenge)
    player = ForeignKey(PlayerProfile)
    score = IntegerField()
    time_seconds = IntegerField()
    completed_at = DateTimeField(auto_now_add=True)
```

### API Endpoints:

- `GET /api/profile/` — profil gracza, lvl, xp, tickety, żywioły
- `POST /api/tickets/use/` — zużyj bilet
- `POST /api/hearts/` — serduszko na kadr
- `GET /api/achievements/` — lista osiągnięć gracza
- `GET /api/ranks/` — rangi reżyserskie gracza
- `GET /api/daily/` — dzisiejszy daily challenge
- `POST /api/daily/result/` — wynik daily

---

## 12. Roadmap

### Faza 1 — MVP Progresji (2-3 tygodnie)
- PlayerProfile model
- System LVL + XP
- Odblokowanie trudności (Popcorn → Kinoman → Kineza)
- Bilety dzienne (3/dzień)
- Podstawowe osiągnięcia (10 najprostszych)

### Faza 2 — Żywioły & Rangi (2-3 tygodnie)
- Odkrywanie żywiołów z gry
- Bonusy pasywne żywiołów
- Rangi reżyserskie (top 10 reżyserów)
- Serduszka na kadry

### Faza 3 — Social (2-3 tygodnie)
- Daily Challenge (21:37)
- Ligi tygodniowe
- Sharing wyniku (obrazek)
- Profil publiczny gracza

### Faza 4 — Monetyzacja (2 tygodnie)
- Karta Stałego Widza (premium)
- Dodatkowe bilety w subskrypcji
- Sezonowe wyzwania
- Stripe/PayU integracja

---

## 13. Porównanie z konkurencją

| Cecha | Name the Frame | Framed.wtf | Wordle | Duolingo |
|-------|---------------|------------|--------|----------|
| Gier dziennie | 3 sesje + daily | 1 | 1 | nielimitowane |
| Progresja | LVL + rangi + żywioły | brak | brak | XP + liga |
| Social | ligi, daily, profil | brak | sharing | liga, streak |
| Monetyzacja | premium pass | brak | NYT sub | Super Duolingo |
| Żywioły/klasy | tak (bonusy!) | nie | nie | nie |
| Reżyser rangi | tak | nie | nie | nie |
| Odkrywanie | odkrywasz żywioły! | nie | nie | odkrywasz lekcje |
| "One more game" | bilety = niedosyt | 1/dzień | 1/dzień | serduszka/życia |
| Estetyka | kinowa, ciemna | prosta | prosta | kolorowa |

**Nasze przewagi:**
1. Głębsza progresja niż Framed (które jest płytkie)
2. Tematyczny twist (żywioły = klasy postaci z RPG) — nikt tego nie ma
3. Rangi reżyserskie — unikalne, zero konkurentów
4. Kinowa estetyka — Framed wygląda jak strona z lat 2000

---

## 14. Synergie & Smaczki

### Jak systemy się wspierają:

- **Żywioły → Bilety**: opanowany żywioł (lvl 3) daje jednorazowy bonus bilet
- **Rangi → Osiągnięcia**: ranga 100% u reżysera = osiągnięcie + odznaka
- **Serduszka → Daily**: najczęściej lajkowane kadry mają wyższy priorytet w daily
- **Ligi → Streaki**: przerwanie streaka = spadek w lidze (motywacja podwójna)
- **Daily → XP**: daily daje 2x XP (zachęca do powrotu o 21:37)

### Smaczki kinowe:

- Nazwy lig nawiązują do kin: "Kino Osiedlowe", "Kino Studyjne"
- Rangi reżyserów to cytaty/sceny z ich filmów
- Osiągnięcia ukryte odkrywasz jak easter eggi — nie wiesz że istnieją
- O 21:37 animacja: zegar projektora się kręci
- Gdy odkrywasz żywioł — krótka animacja "starego biletu kinowego"
- Gdy kończą się bilety — ekran jak "koniec seansu" w starym kinie (kurtyna opada)
- Streak 30 dni = animacja złotej klatki filmowej w profilu

### Edge cases:

- **Gracz lubi tylko horror**: OK! Żywioł Horror opanowany szybko, ale inne nie — motywacja do eksploracji przez osiągnięcia "Poliglota gatunków"
- **Casual vs Hardcore**: casual gra 1 sesję/dzień, ma fun z Popcornem. Hardcore wyczerpuje 3 bilety, gra daily, ściga rangi w lidze. Oba ścieżki satysfakcjonujące
- **Nowy gracz onieśmielony**: zaczyna od Popcornu (łatwe, 4 opcje), sukcesy od razu, dopamina, chce więcej
- **Veteran się nudzi**: nowe wyzwania sezonowe, coraz trudniejsze osiągnięcia ukryte, rywalizacja w lidze Akademia

### Balansowanie:

- **XP za Kinezę > Kinomana > Popcorn** (zachęta do trudniejszych trybów)
- **Ale** Popcorn z bonusem żywiołu daje przyzwoity XP (casual nie jest karany)
- **Streak nie wymaga wygranej** — wystarczy zagrać jedną sesję (nie zniechęca)
- **Bilety resetują się o 00:00** nie 24h od użycia (przewidywalność)
- **Daily challenge nie kosztuje biletu** (gracz ZAWSZE ma powód wrócić)

---

## 16. Balansowanie i Edge Cases

### Casual vs Hardcore

- **Casual** (1 sesja/dzień, Popcorn): Po miesiącu ma ~Lvl 4-5, 3-4 żywioły, kilka rang. Czuje postęp.
- **Hardcore** (3 sesje/dzień, daily, Kineza): Po miesiącu ma Lvl 8-9, wszystkie żywioły, wiele rang na 80%+. Czuje mastery.
- **Obu** dajemy powody do powrotu: casual — "odblokuję nowy żywioł", hardcore — "zdobędę Diamentową ligę"

### Zapobieganie grindowi

- XP ma diminishing returns per dzień (po 3 sesjach mniej XP za sesję)
- Rangi reżyserskie wymagają UNIKALNYCH filmów (nie można grindować tego samego)
- Achievementy wymagają różnorodności (nie da się zdobyć "Poliglota Kina" grając tylko horrory)

### Co jeśli gracz lubi tylko jeden gatunek?

- Żywioł dominujący daje bonus, ale gra losuje filmy z CAŁEJ puli (nie ogranicza się do żywiołu)
- Efekt: gracz odkrywa nowe gatunki "przy okazji" → odblokuje kolejne żywioły naturalnie
- Filtrowanie po gatunku = feature premium (lub wysoki level) → zachęta do eksploracji na start

### Nowy gracz vs powracający

- Reset nie istnieje — progresja jest permanentna
- Powracający gracz (nie grał miesiąc): "Witaj ponownie! Twój streak się zresetował, ale odkrycia zostają"
- Nie karzemy za nieobecność — tylko nagradzamy za regularność

---

## 17. Potencjał Rozwoju (6-12 miesięcy)

1. **Tryb Multiplayer** — "Film Duel": 2 graczy widzą ten sam kadr, kto pierwszy trafia → wygrywa
2. **Tryb Reżyserski** — cała sesja z filmami jednego reżysera (odblokowane po 50% rangi u niego)
3. **Tryb Dekada** — "Lata 80." — tylko filmy z wybranej dekady (gated by level)
4. **Tryb Maraton** — 50 filmów, 1 życie (roguelike!). Jak daleko zajdziesz?
5. **Sezonowe Battle Pass** — 30-dniowy pass z ekskluzywnymi nagrodami kosmetycznymi
6. **Kluby filmowe** — grupy 5-10 graczy, wspólny ranking, wspólne wyzwania
7. **Tworzenie własnych quizów** — zalogowani gracze mogą kuratorować zestawy 10 filmów do udostępnienia
8. **API dla partnerów** — kin, festiwali, dystrybutorów (quizy promujące premierę)

---

## Podsumowanie

Name the Frame to nie quiz — to **kuratorskie doświadczenie filmowe** z meta-grą, progresją i społecznością. Każdy element wzmacnia resztę:

- Wejściówki tworzą głód → gracz wraca
- Odkrywanie żywiołów daje "aha!" momenty → gracz czuje inteligencję
- Rangi reżyserskie budują ekspertyzę → gracz czuje dumę
- Daily challenge daje rytuał → gracz buduje nawyk
- Ligi dają rywalizację → gracz się angażuje
- Serduszka budują galerię → gracz wyraża siebie
- Achievementy nagradzają różnorodność → gracz eksploruje

**Cel**: Stać się Duolingo dla wiedzy filmowej. Codziennie. Z przyjemnością. Bez poczucia winy.


---

## Changelog

### 2026-06-14 — Refaktoryzacja ekranu startowego

**Zakres**: Uproszczenie setup screen do minimalistycznego formularza.

**Usunięte z widoku (zachowane w `docs/archive/`):**
- Select żywiołu (genre-select)
- Karuzela poziomów (4 karty: Kasa, Popcorn, Kinoman, Kineza)
- Label "Wybierz seans"
- Stary layout `.start-row` (przycisk + Wyniki obok siebie)

**Dodane:**
- Auth-bar (góra — nick lub "gość")
- Minimalistyczny formularz: nick-input + przycisk "Zapal projektor"
- Ciężki metalowy przycisk (deep box-shadow, :active scale(0.97))
- Web Audio: clunk (80Hz sine→35Hz + 2200Hz metallic click) na kliknięcie
- Web Audio: error buzz (biały szum + sawtooth snap) na błąd nicku
- Neon-error animation na inpucie (3× flash jaskrawą czerwienią)
- Efekt "przepalonej żarówki" na tekście błędu
- Async nick-check (`/api/nick-check/`) przed startem gry
- Złota ramka na inpucie zalogowanego usera (disabled)
- Link "Wyniki" (zamiast dużego buttona)
- `js/services/films_loader.js` dodany do script load

**Pod maską:**
- `S.level = 'popcorn'`, `S.diff = 'test'`, `S.genre = 'casual'` (domyślne)
- Backend endpoint `GET /api/nick-check/?nick=xxx` → `{available: true/false}`

**Pliki zmodyfikowane:**
- `templates/index.html` — przebudowa sekcji #setup (Django template)
- `index.html` — jw. (wersja statyczna)
- `static/css/main.css` + `css/main.css` — nowe style
- `static/js/ui/setup.js` + `js/ui/setup.js` — nowa logika
- `game/views.py` — endpoint nick-check (już istniał)
- `game/urls.py` — route (już istniał)

**Archiwum**: `docs/archive/setup_carousel_removed.html`, `docs/archive/setup_carousel_removed.js`

---

### 2026-06-14 — Bugfixy po refaktoryzacji

**Bug 1: Summary grid nie wyświetlał kadrów 3×4**
- Brakowało CSS `.summary-grid` / `.sg-cell` — dodane (grid 4 kolumny, aspect-ratio 16:9, staggered reveal)
- Trafione kadry: jasność .85, nietrafione: brightness(.4) saturate(.3)

**Bug 2: "Zagraj jeszcze raz" → przycisk "Zapal projektor" nie reagował**
- `resetGame()` nie resetowało klas `firing`/`checking` ani `disabled` na `#start-btn`
- Dodane: `btn.disabled = false; btn.classList.remove('firing','checking')`

**Bug 3: Nick pobierany z email zamiast ręcznie wpisany**
- `api_me()` zwracał `user.email.split('@')[0]` jako fallback — zmienione na `None`
- `index` view: `user_json` — jw.
- Template: `first_name|default:user.email` → teraz sprawdza `user.first_name` bezpośrednio
- JS `initAuthBar`: dodana walidacja `isEmailFallback` (nie lockuje pola jeśli nick wygląda jak email)

**Pliki zmodyfikowane:**
- `static/js/game/engine.js` + `js/game/engine.js`
- `static/css/main.css` + `css/main.css`
- `static/js/ui/setup.js` + `js/ui/setup.js`
- `templates/index.html`
- `game/views.py`


---

### 2026-06-14 — Poprawki UX po testach

**Bug 4: Nick-check blokował zalogowanego usera własnym nickiem**
- `api_nick_check()` teraz wyklucza requestującego usera z wyników (`.exclude(pk=request.user.pk)`)
- Zalogowany gracz może użyć swojego własnego nicku bez blokady

**Bug 5: Przycisk "Zapal projektor" wyglądał złoto zamiast metalicznie**
- Specyficzność CSS: `.start-btn` (złoty) nadpisywał `.start-btn--metal` (ciemny)
- Fix: selektory zmienione na `.start-btn.start-btn--metal` (wyższa specyficzność)
- Dodane `animation:none` żeby lamp-pulse nie działał na metalowej wersji

**Poprawa: Nick zachowany przy replay**
- `resetGame()` zachowuje `S.nick` i wypełnia input — przy "Zagraj jeszcze raz" nie trzeba wpisywać nicku ponownie
- Zalogowany user i tak ma disabled input z nickiem

**Pliki:**
- `game/views.py` — nick-check exclude self
- `static/css/main.css` + `css/main.css` — specyficzność `.start-btn.start-btn--metal`
- `static/js/game/engine.js` + `js/game/engine.js` — resetGame zachowuje nick
