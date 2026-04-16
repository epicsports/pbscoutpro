# PbScoutPro — Audyt Kodu
**Data:** 2026-04-16
**Rozmiar:** 24,317 linii · 96 plików · 3.1MB bundle

---

## 🔴 MARTWY KOD (usunąć natychmiast)

### 1. TrainingPage.jsx — 503 linii martwego kodu
App.jsx importuje `TrainingPageRedirect` zamiast starego `TrainingPage`.
Cała funkcjonalność przeniesiona do TrainingScoutTab/CoachTab/MoreTab.
**Akcja:** Usunąć plik. Oszczędność: 503 linii.

### 2. 12 nieużywanych eksportów w dataService.js
```
fetchUserProfile, updateUserProfile, subscribeUserProfile,
shotsToFirestore, shotsFromFirestore, quickShotsToFirestore,
quickShotsFromFirestore, removeScoutedTeam, fetchScoutedPointCounts,
migratePoint, migrateBunkers, addTactic
```
**Akcja:** Usunąć nieużywane funkcje. ~80 linii.

### 3. ~30 nieużywanych importów
React, COLORS, FONT, TOUCH importowane ale nieużywane w wielu plikach.
**Akcja:** Sweep z ESLint lub ręczny grep.

---

## 🟡 DUPLIKACJA (ekstrakcja do shared)

### 4. SQUAD_META zdefiniowane 5 razy!
```
TrainingPage.jsx        → const SQUAD_META = { red: {...}, ... }
TrainingScoutTab.jsx     → const SQUAD_META = { red: {...}, ... }
TrainingCoachTab.jsx     → SQUAD_COLORS + SQUAD_NAMES (inline)
TrainingResultsPage.jsx  → const SQUAD_META = { red: {...}, ... }
TrainingSquadsPage.jsx   → const SQUAD_META = [{ key: 'red', ... }]
```
**Dwa różne formaty:** obiekt `{ red: {...} }` vs tablica `[{ key: 'red', ... }]`!
**Akcja:** Wynieść do `src/utils/squads.js`:
```js
export const SQUAD_META = [
  { key: 'red', name: 'R1', color: '#ef4444' },
  { key: 'blue', name: 'R2', color: '#3b82f6' },
  { key: 'green', name: 'R3', color: '#22c55e' },
  { key: 'yellow', name: 'R4', color: '#eab308' },
];
export const squadByKey = (k) => SQUAD_META.find(s => s.key === k);
export const squadName = (k) => squadByKey(k)?.name || k;
export const squadColor = (k) => squadByKey(k)?.color || '#64748b';
```

### 5. emptyData() / makeData() zduplikowane
Identyczna logika tworzenia pustego point data w:
- TrainingScoutTab.jsx (emptyData + makeData)
- TrainingPage.jsx (emptyData + makeData — martwy kod)
**Akcja:** Wynieść do `src/utils/pointFactory.js`:
```js
export function createEmptyPointData(rosterArr, side) { ... }
export function createPointData(rosterArr, assignments, zones, side) { ... }
```

---

## 🟠 PLIKI-MOLOCHY (rozbić)

### 6. MatchPage.jsx — 1866 linii
Biggest file. Zawiera:
- Match Review view (~400 linii)
- Scouting Editor view (~800 linii)
- Point card rendering (~300 linii)
- Landscape mode (~150 linii)
- State management (~200 linii)
**Akcja:** Rozbić na:
- `MatchReview.jsx` — review mode (point list, stats)
- `MatchEditor.jsx` — scouting mode (canvas, toolbar)
- `MatchPointCard.jsx` — individual point card
- `MatchPage.jsx` — thin router między review/editor

### 7. ScoutedTeamPage.jsx — 1299 linii
Zawiera 10+ sekcji analitycznych, każda 50-100 linii.
**Akcja:** Wynieść sekcje do `src/components/scouted/`:
- `CounterSection.jsx`
- `InsightsSection.jsx`
- `SideTendencySection.jsx`
- `TacticalSignalsSection.jsx`
- `PerformanceSection.jsx`
- `PlayerRosterSection.jsx`

### 8. generateInsights.js — 1120 linii
6 eksportowanych funkcji + helpers, rosnący.
**Akcja:** Rozbić na:
- `src/utils/insights.js` — generateInsights + generateCounters
- `src/utils/lineup.js` — computeLineupStats
- `src/utils/tactical.js` — computeTacticalSignals + computeShotTargets
- `src/utils/breaks.js` — computeBreakBunkers
- `src/utils/playerSummary.js` — computePlayerSummaries

### 9. dataService.js — 545 linii, 71 eksportów
Monolityczny plik z CRUD dla każdej kolekcji.
**Akcja:** Rozbić po domenie:
- `src/services/tournamentService.js`
- `src/services/trainingService.js`
- `src/services/layoutService.js`
- `src/services/playerService.js`
- `src/services/dataService.js` — re-export z backward compat

---

## 🔵 STARE STRONY DO REWIZJI

### 10. TrainingSetupPage.jsx (302 linii) — częściowo zduplikowana
AttendeesEditor jest teraz inline w TrainingScoutTab.
Setup page nadal używana jako wizard entry (po tworzeniu treningu).
**Akcja:** Zamienić na thin wrapper wokół AttendeesEditor + "Next" button.
Z 302 → ~50 linii.

### 11. TrainingSquadsPage.jsx (364 linii) — częściowo zduplikowana
SquadEditor jest teraz inline w TrainingScoutTab.
Squads page nadal używana z MoreTab linku.
**Akcja:** Zamienić na thin wrapper wokół SquadEditor.
Z 364 → ~50 linii.

### 12. TrainingResultsPage.jsx (243 linii) — zduplikowana z Coach tab
Coach tab ma teraz leaderboard + player list.
Results page ma prawie identyczną logikę + matchup history.
**Akcja:** Usunąć Results page. Jeśli matchup history potrzebna,
dodać jako collapsible section w Coach tab.

---

## 📊 METRYKI POPRAWY

| Metryka | Przed | Po |
|---------|-------|-----|
| Martwy kod | ~750 linii | 0 |
| SQUAD_META definicji | 5 | 1 |
| MatchPage.jsx | 1866 linii | ~400 (router) |
| ScoutedTeamPage.jsx | 1299 linii | ~300 (shell) |
| generateInsights.js | 1120 linii | ~300 per file |
| dataService.js | 545 linii | ~150 per file |
| Nieużywane eksporty | 12 | 0 |
| Nieużywane importy | ~30 | 0 |
| Duplikacja emptyData | 2+ | 1 (pointFactory) |

**Szacowana oszczędność:** ~1500 linii martwego/zduplikowanego kodu.
**Szacowany czas:** 2 sesje CC (mechaniczna ekstrakcja + testy build).

---

## 📋 PLAN WDROŻENIA

### Faza 1: Quick wins (1 sesja CC)
- [x] Usunąć TrainingPage.jsx ✅ 503 linii (martwy)
- [x] Usunąć nieużywane eksporty z dataService ✅ 11 funkcji, 92 linii
- [x] Usunąć nieużywane importy ✅ 77 across 41 files
- [x] Wynieść SQUAD_META do src/utils/squads.js ✅
- [x] Wynieść emptyData/makeData do pointFactory.js ✅
- [x] Thin wrapper TrainingSetupPage ✅ 302→78 linii
- [x] Thin wrapper TrainingSquadsPage ✅ 364→58 linii

### Faza 2: Rozbicie monolitów (1-2 sesje CC)
- [ ] MatchPage → MatchReview + MatchEditor + MatchPointCard
- [ ] ScoutedTeamPage → sekcje w components/scouted/
- [ ] generateInsights → insights + lineup + tactical + breaks
- [ ] dataService → per-domain services

### Faza 3: Architektura (opcjonalnie)
- [ ] TrainingResultsPage → usunąć, Coach tab wystarczy
- [ ] ESLint config z no-unused-imports rule
- [ ] Bundle splitting — manualChunks w vite.config
