# 🎯 Paintball Scout

Narzędzie do scoutingu drużyn paintballowych z real-time synchronizacją.
Wiele osób może uzupełniać dane jednocześnie na różnych urządzeniach.

## Funkcje

- **Globalna baza drużyn** z zawodnikami (imię, ksywka, numer) i przypisaniem do lig (NXL/DPL/PXL)
- **Turnieje** z layoutem pola i przypisanymi drużynami filtrowanymi po lidze
- **Scouting na canvasie** — dotykowe/myszowe rozmieszczanie 5 graczy + oznaczanie stref ostrzału
- **Przypisywanie zawodników** do pozycji na polu
- **Wynik punktu** — wygrana / przegrana / koniec czasu
- **Heatmapy** pozycji i strzałów (per mecz)
- **Real-time sync** — Firebase Firestore, dane widoczne natychmiast na wszystkich urządzeniach
- **GitHub Pages hosting** — zero kosztów

## Struktura projektu

```
paintball-scout/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui.jsx           # Buttons, inputs, cards, modals, icons
│   │   ├── FieldCanvas.jsx  # Canvas do scoutingu (touch + mouse)
│   │   ├── HeatmapCanvas.jsx # Canvas heatmap
│   │   └── Header.jsx       # Nawigacja z breadcrumbs
│   ├── hooks/
│   │   └── useFirestore.js  # Real-time subscriptions
│   ├── pages/
│   │   ├── HomePage.jsx     # Lista turniejów
│   │   ├── TeamsPage.jsx    # Globalna baza drużyn + edycja
│   │   ├── TournamentPage.jsx   # Turniej: layout + scouted teams
│   │   ├── ScoutedTeamPage.jsx  # Mecze danej drużyny
│   │   └── ScoutingPage.jsx     # Główny canvas scoutingowy
│   ├── services/
│   │   ├── firebase.js      # Firebase init
│   │   └── dataService.js   # Wszystkie operacje CRUD
│   ├── styles/
│   │   └── global.css
│   ├── utils/
│   │   ├── theme.js         # Kolory, fonty, stałe
│   │   └── helpers.js       # Utility functions
│   ├── App.jsx              # Router
│   └── main.jsx             # Entry point
├── .github/workflows/
│   └── deploy.yml           # Auto-deploy na GitHub Pages
├── .env.example
├── firestore.rules
├── vite.config.js
└── package.json
```

## Setup — krok po kroku

### 1. Firebase (darmowa baza danych)

1. Wejdź na [console.firebase.google.com](https://console.firebase.google.com)
2. **Create a project** → nazwij np. `paintball-scout`
3. W panelu projektu kliknij **</>** (Web app) → zarejestruj aplikację
4. Skopiuj wartości z `firebaseConfig` — będziesz ich potrzebować
5. W menu bocznym: **Firestore Database** → **Create Database** → **Start in test mode** → wybierz region `europe-west1`

### 2. Lokalne uruchomienie

```bash
# Sklonuj repo
git clone https://github.com/TWOJ_USERNAME/paintball-scout.git
cd paintball-scout

# Zainstaluj zależności
npm install

# Skopiuj i wypełnij config Firebase
cp .env.example .env
# Edytuj .env — wklej wartości z Firebase Console

# Uruchom lokalnie
npm run dev
```

Otwórz `http://localhost:3000` — aplikacja powinna działać z Firebase.

### 3. GitHub Pages (darmowy hosting)

#### Opcja A: Automatyczny deploy (zalecana)

1. W swoim repo na GitHubie: **Settings → Pages → Source → GitHub Actions**
2. **Settings → Secrets and variables → Actions** → dodaj sekrety:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Push na `main` → workflow automatycznie zbuduje i wdroży

#### Opcja B: Ręczny deploy

```bash
# W vite.config.js zmień base na nazwę swojego repo:
# base: '/paintball-scout/'

npm run build
npx gh-pages -d dist
```

### 4. Dodaj domenę w Firebase

W Firebase Console → Authentication → Settings → Authorized domains:
- Dodaj `TWOJ_USERNAME.github.io`

### 5. Zabezpiecz bazę (opcjonalnie, na później)

Edytuj `firestore.rules` — odkomentuj reguły production i wdroż przez Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

## Model danych w Firestore

```
/teams/{teamId}
  name: "Dynasty"
  leagues: ["NXL"]
  players: [{ id, name, nickname, number }]

/tournaments/{tournamentId}
  name: "NXL Tampa 2026"
  league: "NXL"
  fieldImage: "data:image/jpeg;base64,..."

  /scouted/{scoutedId}
    globalTeamId: "abc123"

    /matches/{matchId}
      name: "vs Dynasty"
      date: "2026-03-22"

      /points/{pointId}
        players: [{x, y}, ...]
        shots: [[{x,y},...], ...]
        assignments: ["playerId", ...]
        outcome: "win" | "loss" | "timeout"
        order: 1711100000000
```

## Stos technologiczny

- **React 18** + **Vite** — szybki frontend
- **Firebase Firestore** — real-time NoSQL, darmowy tier (1GB, 50K reads/day)
- **React Router** — nawigacja SPA (HashRouter dla GH Pages)
- **Canvas API** — scouting i heatmapy
- **GitHub Actions** — CI/CD
- **GitHub Pages** — darmowy hosting

## Darmowe limity Firebase

| Zasób | Limit/dzień |
|-------|-------------|
| Reads | 50,000 |
| Writes | 20,000 |
| Storage | 1 GB |

Więcej niż wystarczająco do scoutingu nawet na dużym turnieju.

## Rozwój

Projekt jest przygotowany do rozbudowy:
- Dodaj Firebase Auth do logowania
- Dodaj role (admin, scout, viewer)
- Eksport danych do PDF/CSV
- Analiza statystyczna tendencji graczy
- Porównywanie layoutów między turniejami
