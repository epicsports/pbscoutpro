# PbScoutPro — Current State Map

> **Co to jest:** Mapa funkcjonalna, nawigacyjna i danych aplikacji w jej obecnym stanie (kwiecień 2026).
> **Cel:** Rzeczywisty obraz **co już istnieje**, żeby decyzje produktowe nie były oparte na domysłach.
> **Źródło prawdy:** kod w main branch repo (commit z 17.04.2026).
>
> Autor: Claude (Opus 4.7) na zlecenie Jacka, oparte na review źródeł.

---

## Sekcja 1: Mapa nawigacyjna (sitemap + flow)

### 1.1. Top-level navigation

Aplikacja ma dwa równoległe systemy nawigacji:

**A) BottomNav (globalny tab bar)** — widoczny tylko na "list" pages:
- `/` — Home (MainPage)
- `/layouts` — biblioteka layoutów
- `/teams` — globalna baza drużyn
- `/players` — globalna baza graczy

Ukryty na detail/sub screens (regex `/layout/.+`, `/team/.+`, `/tournament/.+`, `/training/.+`).

**B) AppShell tabs (kontekstowy tab bar)** — widoczny tylko na MainPage gdy wybrany jest tournament/training:
- **Scout 🎯** — działania na meczach (lista meczów, scout flow)
- **Coach 📊** — analytics/insights/W-L per team
- **More ⚙️** — ustawienia, akcje turniejowe (close/delete), wylogowanie

### 1.2. Pełna lista routes (25 stron)

```
PUBLIC / GLOBAL:
/                                              MainPage (kontekstowy: tournament|training|empty)
/teams                                         TeamsPage (lista wszystkich drużyn workspace)
/team/:teamId                                  TeamDetailPage (detail per drużyna)
/players                                       PlayersPage (lista wszystkich graczy)
/player/:playerId/stats                        PlayerStatsPage (cross-tournament stats per gracz)
/profile                                       ProfilePage (user profile, edycja imienia)
/scouts                                        ScoutRankingPage (leaderboard scoutów)
/scouts/:uid                                   ScoutDetailPage (per-scout stats)
/my-issues                                     ScoutIssuesPage (problemy zgłoszone przez scout)

LAYOUTS:
/layouts                                       LayoutsPage (lista layoutów)
/layout/new                                    LayoutWizardPage (3-step wizard nowego layoutu)
/layout/:layoutId                              LayoutDetailPage (single layout — bunkry, lines, tactics)
/layout/:layoutId/bunkers                      BunkerEditorPage (edycja bunkrów)
/layout/:layoutId/ballistics                   BallisticsPage (BreakAnalyzer module)
/layout/:layoutId/analytics/:mode              LayoutAnalyticsPage (cross-tournament analytics per layout)
/layout/:layoutId/tactic/:tacticId             TacticPage (edycja taktyki na poziomie layoutu)

TOURNAMENTS:
/tournament/:tournamentId/team/:scoutedId      ScoutedTeamPage (per-team analytics w turnieju)
/tournament/:tournamentId/match/:matchId       MatchPage (mecz: scouting + review)
/tournament/:tournamentId/tactic/:tacticId     TacticPage (edycja taktyki w turnieju)

TRAININGS:
/training/:trainingId                          TrainingPageRedirect (legacy redirect)
/training/:trainingId/setup                    TrainingSetupPage (konfiguracja treningu)
/training/:trainingId/squads                   TrainingSquadsPage (przydziały do składów)
/training/:trainingId/results                  TrainingResultsPage (wyniki sesji treningowej)
/training/:trainingId/matchup/:matchupId       MatchPage (matchup w treningu — reuse MatchPage)
```

### 1.3. Persistent overlays

Nad routes:
- **SessionContextBar** — pasek nad BottomNav, pojawia się gdy istnieje tournament/training ze status='live'. Tap → wraca do tej sesji.
- **OfflineBanner** — czerwony pasek na górze gdy `!navigator.onLine`.

### 1.4. State persistence (localStorage keys)

```
pbscoutpro_activeTab        — który tab w MainPage (scout|coach|more)
pbscoutpro_activeTournament — id aktywnego turnieju
pbscoutpro_lastKind         — 'tournament' | 'training' (który był ostatnio wybrany)
pbscoutpro_lastTraining     — id ostatniego treningu
```

### 1.5. Authentication flow

```
App load
  ↓
Firebase auth check (useWorkspace)
  ↓
[no user]      → LoginPage (email/password)
[user, no ws]  → LoginGate (wybór workspace przez kod)
[user + ws]    → AppRoutes (cała apka)
```

Workspace = tenant scope (isolation). `bp()` w dataService zwraca `/workspaces/{slug}` jako prefix dla wszystkich Firestore queries.

---

## Sekcja 2: Mapa funkcjonalna per persona

### 2.1. Persona: Scout (zbiera dane z meczu)

**Główne zadania:**
1. Otworzyć aktywny tournament (MainPage → Scout tab)
2. Wybrać mecz z listy (klasyfikacja: scheduled / live / completed)
3. Dla każdego punktu — albo szybki zapis (QuickLog) albo pełny scouting (canvas)

**Flow scouting punktu:**
```
ScoutTabContent (lista meczów)
  ↓ tap mecz
MatchPage (review mode)
  ↓ tap "Scout team A" lub "Scout team B"
ScoutedTeamPage (detail drużyny, lista punktów)
  ↓ tap "+ Add point" 
[scouting canvas: place 5 players + shots + outcome]
  ↓ save
back to ScoutedTeamPage (heatmap się updateuje)
```

**Funkcjonalności wprowadzania danych (szczegóły):**

**a) Per punkt — pozycje graczy (canvas-based):**
- Field canvas z bunkrami widocznymi
- Tap na puste miejsce → place player (max 5)
- Long press → bump stop (gracz się przemieścił)
- Drag → przesuń gracza
- Loupe (lupa) na lewo od palca dla precyzji (right-handed)

**b) Per punkt — strzały:**
- Precision shots (`shots: [[], [], [], [], []]`) — per gracz, lista koordynatów (x,y). Rysowane na canvasie.
- Quick shots (`quickShots: [[], [], [], [], []]`) — per gracz, lista zon (`'dorito'|'snake'|'center'`). Tap-tap wprowadzenie.
- Obstacle shots (`obstacleShots: [[], [], [], [], []]`) — strzały na konkretną przeszkodę (bunker).

**c) Per punkt — outcome:**
- `'win_a'`, `'win_b'`, `'loss_a'`, `'loss_b'` (multi-format)
- Eliminacje per gracz (kto został trafiony)
- Runners (kto biegł)

**d) Quick logging mode (QuickLogView) — bez canvasu:**
- 3-kroki: pick players → assign zones (D/C/S) → tap winner
- Synthetic positions: `D = (0.30, 0.20)`, `C = (0.30, 0.50)`, `S = (0.30, 0.80)`
- Cel: szybki zapis bez precyzji canvasowej (Sławek wskazał: "to jest do retrospective Rangera")

**e) Concurrent editing (dual-coach):**
- W trakcie meczu dwóch coachów może scoutować jednocześnie
- Point-level dot notation writes (Firestore merge)
- Per-side: home / away / both
- Recently fixed (ostatnie 23 commity post-tournament)

### 2.2. Persona: Coach (konsumuje insights)

**Co już Coach widzi w apce:**

**a) CoachTabContent (`/` w trybie tournament):**
- Division pill filter (PRO/SEMI-PRO/D2-D4 lub Div.1-3)
- Lista drużyn z W-L per drużyna (sortowane po `played desc, wins desc, losses asc`)
- Lista meczów z score i statusem (LIVE / FINAL)
- Tap drużyna → ScoutedTeamPage z pełnymi insightami

**b) ScoutedTeamPage — DUŻO insightów per drużyna (1300 linii kodu):**

Renderuje:
- Heatmap (3 channels: positions, shots, bumps)
- InsightCards — automated insights wygenerowane z `generateInsights()`
- CounterCards — sugerowane countery z `generateCounters()`
- StatRows — % stats: dorito, snake, disco, zeeker, center, danger, sajgon
- Player summaries — per gracz: wins, losses, kills, position, bunker, win rate
- Tactical signals — most eliminated, hunted positions, fifty reach
- Shot targets — precision targets bunkery + quick zones %
- Break bunkers — top 6 bunkrów na break z %
- Sample badge — "X scouted points · Y matches"
- Lineup stats — pair/trio win rates

**c) LayoutAnalyticsPage (`/layout/:layoutId/analytics/:mode`):**
- Cross-tournament analytics dla całego layoutu (wszystkie turnieje na tym layoucie agregowane).

### 2.3. Persona: Admin (Jacek)

Wszystko z Coach + Scout PLUS:
- Layout creation (Wizard z Vision API auto-detection bunkrów)
- Bunker editor (manual edit pozycji)
- Team/player management
- Tournament/training CRUD
- ScoutRankingPage (kto najwięcej scoutuje)
- Workspace settings (LoginGate code)

### 2.4. Persona: Training (inny tryb!)

**Kontekst:** Apka rozróżnia dwa typy sesji:
- **Tournament** — prawdziwy turniej z drużynami przeciwników (Scout/Coach modes)
- **Training** — wewnętrzny trening Rangera, dual-coach model, składy własne

**Training flow:**
```
MainPage (training context)
  ↓ trzy tabs: TrainingScoutTab | TrainingCoachTab | TrainingMoreTab
  ↓
TrainingSetupPage (kogo zapraszamy, jakie składy)
  ↓
TrainingSquadsPage (przydziały do squad'ów A/B/C/D)
  ↓
[Live: matchup pairs play]
  ↓ tap matchup → MatchPage (reused) z dual-coach concurrent
  ↓
TrainingResultsPage (W-L per squad, leaderboard graczy)
```

Squads = własne grupy: Ring, Rage, Rebel, Rush (child teams Rangera) + ad-hoc.

Layout Insights: Coach może dodawać per-layout notatki tekstowe (już istnieje! `useLayoutInsights` hook).

---

## Sekcja 3: Mapa danych (Firestore schema + flow)

### 3.1. Top-level collections (per workspace)

```
/workspaces/{slug}/
├── tournaments/{tid}                — turnieje
│   ├── matches/{mid}                — mecze w turnieju
│   │   └── points/{pid}             — punkty w meczu
│   ├── scoutedTeams/{sid}           — scoutowane drużyny przeciwników
│   └── tactics/{tacticId}           — taktyki tournament-level
├── trainings/{trid}                  — treningi
│   ├── matchups/{mid}               — pary składów grające w treningu
│   └── points/{pid}                 — punkty w matchup'ach
├── layouts/{lid}                     — layouty pól
│   ├── tactics/{tid}                — taktyki layout-level
│   └── insights/{iid}               — Coach Notes per layout
├── teams/{teamId}                    — drużyny (parent + child)
├── players/{playerId}                — gracze (cross-team history)
└── users/{uid}                       — user profiles (display name)
```

### 3.2. Kluczowe encje

**Point (najważniejsza — to jest atom danych):**
```javascript
{
  id, matchId, tournamentId,
  pointNum,                              // 1-100
  outcome: 'win_a'|'win_b'|'loss_a'|'loss_b',
  scoredBy,                              // który team
  
  // Pozycje
  players: [{x, y}|null] × 5,            // pozycje 5 graczy
  assignments: [playerId|null] × 5,      // który slot to który gracz
  bumpStops: [{x, y}|null] × 5,          // late bumps
  runners: [boolean] × 5,                // kto biegł
  
  // Strzały (3 typy)
  shots: { 0: [{x,y}], 1: [...] },       // precision per slot
  quickShots: { 0: ['dorito','snake'] }, // zone per slot
  obstacleShots: { 0: ['snake'] },       // per-bunker per slot
  
  // Eliminacje
  eliminations: [{ slot, byPlayer?, time? }],
  
  // Concurrent editing audit
  createdBy, createdAt, updatedAt,
  scoutSide: 'home'|'away'|'both',       // który coach zapisał
}
```

**Match:**
```javascript
{
  id, name, teamA, teamB,                // teamA/B = scoutedTeam ID
  scoreA, scoreB,                        // 0-7 (race-to-7 NXL)
  status: 'open'|'live'|'closed',
  division,
  createdAt, updatedAt
}
```

**ScoutedTeam:**
```javascript
{
  id, teamId,                            // ref do globalnej teams collection
  division,                              // PRO/SEMI-PRO/D2/D3/D4 lub Div.1-3
  hero: [playerId],                      // ulubieni gracze do śledzenia
}
```

**Tournament:**
```javascript
{
  id, name, league,                      // NXL/PXL/DPL/practice/sparing
  type: 'tournament'|'practice',
  eventType: 'tournament'|'sparing',
  isTest,                                // flag dla test sessions
  status: 'open'|'live'|'closed',
  divisions: [],                         // które divisions w tym turnieju
  layoutId,                              // wspólny layout
  date, year,
}
```

**Layout (najpotężniejsza encja — primary analytical unit):**
```javascript
{
  id, name, league, year,
  fieldImage,                            // URL do obrazka
  bunkers: [{                            // master half only
    name,                                // np. 'Snake1'
    positionName,                        // np. 'S1' (kod)
    type,                                // SB/MD/GP/Can/Tr/etc.
    x, y,                                // pozycja na polu (0-1)
    side,                                // 'snake'|'dorito'|'center'
  }],
  discoLine, zeekerLine,                 // 0-1
  doritoSide: 'top'|'bottom',
  dangerZone, sajgonZone,                // polygons
  mirrorMode: 'y-axis'|'diagonal',
  homeMarker, awayMarker,                // calibration points
}
```

**Training:**
```javascript
{
  id, name, date, teamId,
  layoutId,                              // jeśli na konkretnym layoucie
  status: 'open'|'live'|'closed',
  isTest,
  attendees: [playerId],                 // kto przyszedł
}
```

**Matchup (wewnątrz Training):**
```javascript
{
  id, trainingId,
  squadA, squadB,                        // squad keys (R/RG/RB/RH/ad-hoc)
  rosterA, rosterB,                      // [playerId]
  scoreA, scoreB,
  status,
}
```

### 3.3. Hooks (data access layer)

```
useTournaments()     → { tournaments, loading }    (subscribe globally)
useTrainings()       → { trainings, loading }
useTeams()           → { teams, loading }
usePlayers()         → { players, loading }
useLayouts()         → { layouts, loading }
useScoutedTeams(tid) → { scouted, loading }        (per tournament)
useMatches(tid)      → { matches, loading }
usePoints(tid, mid)  → { points, loading }         (real-time)
useMatchups(trid)    → { matchups, loading }
useTrainingPoints(tid, mid) → { points, loading }
useLayoutInsights(layoutId) → { insights }         ← Coach Notes per layout!
useUserNames(uids)   → { scoutNamesMap }
```

### 3.4. Computed analytics (utils/)

**Już istniejące funkcje:**
```javascript
// generateInsights.js (1179 linii — TO JEST ANALITYCZNE SERCE APKI)
generateInsights(stats, points, field, _roster, lang)    → InsightCard[]
generateCounters(insights, lang)                          → CounterCard[]
computeBreakBunkers(points, field)                       → top 6 bunkrów % ★ DLA SŁAWKA #1
computeShotTargets(points, field)                        → precision + zones % ★ DLA SŁAWKA #2
computePlayerSummaries(points, rosterIds, players, field) → per gracz wins/kills/winRate ★ DLA SŁAWKA #3
computeTacticalSignals(points, field, allPlayers)        → mostEliminated + huntedPositions + fiftyReach
computeLineupStats(points, field, allPlayers)            → pair/trio win rates
computePositionKills(points, field)                      → kills per position
computeSideVulnerability(points)                          → która strona przegrywa
computeFiftyReached(points, field)                        → % osiągnięcia 50
computeAvgRunners(points)                                 → średnia runners per punkt
computeUncoveredZones(points)                             → puste zone'y
computeLateBreakRate(points)                              → % punktów z late bumps
computeKillCredit(playerSlot, pt, field)                  → attribution (shot zone × elim)

// coachingStats.js
computeCoachingStats(points, field) → { dorito%, snake%, disco%, zeeker%, center%, danger%, sajgon% }

// teamStats.js
computeTeamRecords(matches, scouted) → per scoutedTeam: wins, losses, played

// playerStats.js
computePlayerStats(playerPoints, field) → cross-tournament per player
buildPlayerPointsFromMatch(...)

// scoutStats.js
computeScoutStats(points)            → per scout: completeness, accuracy
computeMatchCompleteness(points)     → % filled fields
computeScoutRow(points, uid)         → leaderboard row
computeScoutIssues(points, uid)      → problemy do naprawy
```

---

## Sekcja 4: Co istnieje vs co Sławek prosił

### 4.1. Sławek brief: "per-player przeciwnika 3 rzeczy"

Zapytanie: "gdzie biega na breakout / gdzie strzela na breakout / z jaką skutecznością strzela na breakout"

| # | Zapytanie | Dane w bazie? | Funkcja licząca? | Renderowane gdzieś? |
|---|-----------|--------------|------------------|---------------------|
| 1 | Gdzie biega na breakout (per-player) | ✅ `points[].players[slot]` + `assignments` | ✅ `computePlayerSummaries` daje `bunker` (preferred) | ✅ ScoutedTeamPage → "Player Summaries" sekcja |
| 2 | Gdzie strzela na breakout (per-player) | ✅ `quickShots[slot]` + `shots[slot]` + `obstacleShots[slot]` | ✅ `computeShotTargets` ALE team-level, nie per-player | ⚠️ Częściowo — agregat team-level w ScoutedTeamPage. Per-player breakdown shots nie jest jawnie zrenderowany. |
| 3 | Skuteczność strzałów na breakout | ✅ `kills` z `computeKillCredit` (shot zone × elim correlation) | ✅ `computePlayerSummaries.kills` per-player | ✅ ScoutedTeamPage — ale jako "kills" nie "accuracy %". Brak: `kills / shots ratio`. |

**Ocena: 70-80% już jest.** Brakuje:
- **(2)** per-player breakdown gdzie konkretnie strzela każdy gracz (obecnie team-level)
- **(3)** accuracy jako % (kills / total shots), nie tylko kills count
- **(1+2+3)** brak dedykowanego "Brief View" — wszystko jest w ScoutedTeamPage rozproszone w sekcjach. Sławek nie chce scrolować, chce single-screen "3 rzeczy o gracza".

### 4.2. Co Coach widzi obecnie w apce vs co potrzebuje

**Coach Tab obecnie:**
- W-L per drużyna ✅ (proste, czytelne)
- Lista meczów ze score ✅
- NIE pokazuje insights na poziomie tab'a — żeby je zobaczyć trzeba kliknąć w drużynę

**Co Sławek prawdopodobnie chciałby (hipoteza, do walidacji):**
- Coach Tab pokazuje od razu insights summary dla każdej drużyny
- Format: per-team card z 3 najważniejszymi rzeczami (top bunker break, top shot zone, top accuracy player)
- Tap → drill-down do pełnego ScoutedTeamPage

### 4.3. Pre-NXL Czechy — realistyczny scope

**To czego NIE trzeba budować od zera:**
- ❌ Backend dla position/shot tracking (jest)
- ❌ Concurrent editing (jest, naprawione)
- ❌ Heatmapa, insights, counters (są)
- ❌ Per-player wins/kills/zone preference (jest)
- ❌ Scout flow z canvasem (jest)
- ❌ QuickLog (jest)

**Co trzeba zbudować na pre-NXL Czechy (małe):**
- Per-player shot breakdown — wyciągnąć z `computeShotTargets` per-slot (1-2 dni)
- Accuracy metric — `kills / total shots ratio` per player (0.5 dnia)
- Coach Brief View — single screen pokazujący 3 rzeczy per gracz przeciwnika (2-3 dni mockup + impl)
- Feature flags + Sentry — infrastruktura (2-3h)
- Confidence indicator — "ten brief oparty na X punktach z Y meczów" (0.5 dnia)

**Sumaryczny scope: ~5-7 dni rozłożonych na 4 tygodnie. Realne. Nie ambitne.**

---

## Sekcja 5: Architectural observations

### 5.1. Mocne strony architektury

- **Modular utils** — analytics oddzielone od UI (można reużyć w nowych views bez touching scout flow)
- **Lazy-loaded routes** — bundle size kontrolowany
- **Real-time Firestore subscriptions** — concurrent editing działa natywnie
- **Strong design tokens** — `theme.js` jako single source of truth (RADIUS, SPACE, FONT_SIZE, COLORS)
- **Inline JSX styles** — zero CSS modules complexity, 100% mobile-first
- **Workspace isolation** — multi-tenant ready (już dzisiaj można dać drugiej drużynie own workspace)

### 5.2. Pain points (z perspektywy add-feature)

- **ScoutedTeamPage 1302 linii** — najgorszy file w projekcie. Trzeba refactoring zanim się dorzuca więcej
- **MatchPage 1879 linii** — drugi monolit. Działa, ale zmiany ryzykowne
- **`generateInsights.js` 1179 linii** — analytics core, ale single file z 21 export'ami. Powinno być rozbite na `insights/`, `counters/`, `summaries/`, `signals/`
- **Brak feature flags** — każda zmiana idzie 100% userów. To jest #1 do naprawy pre-NXL.
- **Brak monitoringu prod errors** — Sentry by się przydał

### 5.3. Co już jest jako "data foundation" pod predictive engine

- ✅ Per-point structured data (5 graczy × pozycje + strzały + outcome)
- ✅ Cross-match aggregation możliwa przez `layoutId` (wszystkie eventy na tym samym polu)
- ✅ Per-player history przez `assignments[slot] = playerId`
- ✅ Layout-specific vs cross-layout rozróżnienie istnieje na poziomie ID (każda kolekcja ma `layoutId`)
- ⚠️ Brak: tagowania notatek layout-specific vs cross-layout (Coach Notes mają tylko layoutId scope)
- ❌ Brak: opponent coach behavior tracking (np. "gdy przegrywają 3 punkty pod rząd, zmieniają tactic")

---

## Sekcja 6: Decyzyjny framework (po tej mapie)

**Pytanie projektowe #1:** Czy Sławek wie, że ScoutedTeamPage ma już 90% tego co prosi?

Hipoteza: Nie. Bo to jest schowane pod 3 tap'ami (Coach tab → tap drużyna → scroll). On chce to na single screen, w jednym otwarciu. To nie jest "buduj nowe analytics", to jest "przeprojektuj prezentację".

**Pytanie projektowe #2:** Czy Coach Brief View powinien być nowym ekranem czy przeprojektowaniem CoachTabContent?

- Argument za nowym ekranem: dedykowane miejsce, nie zaburza istniejącego flow.
- Argument za przeprojektowaniem: mniej kodu, mniej nawigacji, Sławek już wie gdzie kliknąć.

Decyzja do podjęcia po rozmowie ze Sławkiem.

**Pytanie projektowe #3:** Czy "skuteczność strzałów na breakout" w obecnych danych jest mierzalna?

Tak. `computeKillCredit(slot, pt, field)` koreluje shot zone z elim. Trzeba tylko dodać `shotsTotalAtBreakout` per-player i podzielić.

Brakuje jednak definicji "breakout" w utils — kiedy się kończy break? Pierwsze 5-7 sekund? Pierwsza eliminacja w punkcie? To jest pytanie do Sławka, nie do kodu.

---

## Sekcja 7: Co dalej

**Krok 1 (dziś):** Wrzucenie tej mapy do `docs/CURRENT_STATE_MAP.md` w repo. Każda kolejna sesja ze mną i z CC zaczyna się od tego pliku, nie od domysłów.

**Krok 2 (ten tydzień):**
- 30-min rozmowa ze Sławkiem (pytania w VISION.md v2 + dodatkowe: "czy widziałeś Player Summaries w ScoutedTeamPage?")
- Feature flags + Sentry (infrastruktura pod wszystko)
- Decision: Coach Brief View jako new screen czy redesign Coach tab

**Krok 3 (~2 tyg):**
- Mockup Coach Brief View (1 wieczór)
- Implementacja MVP (3 wieczory)
- Test z Tymkiem na 1 turnieju (PXL I, 9-10.05)
- Iteracja przed NXL Czechy

**Krok 4 (post-NXL Czechy):**
- VISION.md v3 (oparty na faktach z map'y i z testów)
- Wszystkie inne featury (CV, predictive, multi-scout collaboration) — Cykl II, III

---

## Historia zmian

- **2026-04-17:** Pierwsza wersja mapy oparta na review kodu z main branch (commit z 17.04). Stworzona po 12-godzinnej sesji rozmowy w której wcześniej spekulowałem o features bez sprawdzenia kodu — Jacek słusznie wskazał błąd.
