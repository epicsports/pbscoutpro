# CC Brief: Practice Session UX + Scout Ranking

**Files to change:** `ScoutRankingPage.jsx`, `TrainingPage.jsx`, `QuickLogView.jsx`  
**Read:** DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.

---

## 1. ScoutRankingPage — Global + Tournament scope

**Current:** shows one global ranking across all tournaments.  
**Needed:** scope toggle: Global vs per-tournament (same pattern as PlayerStatsPage).

### Changes to `ScoutRankingPage.jsx`:

Add state:
```js
const [scope, setScope] = useState('global'); // 'global' | 'tournament'
const [selectedTournamentId, setSelectedTournamentId] = useState('');
```

Filter points before computing stats:
```js
const filteredPoints = useMemo(() => {
  if (scope === 'tournament' && selectedTournamentId)
    return points.filter(p => p.tournamentId === selectedTournamentId);
  return points;
}, [points, scope, selectedTournamentId]);

const stats = useMemo(() => computeScoutStats(filteredPoints), [filteredPoints]);
```

UI — add below PageHeader, above the list:
- Two pills: **Global** | **Tournament** (same pill style as other scope toggles in the app)
- When Tournament selected: show a tournament picker dropdown/select using existing `Select` from ui.jsx
- Tournament list comes from the existing `tournaments` array (already loaded)
- Default selectedTournamentId = tournaments[0]?.id when switching to tournament scope

Keep existing ScoutCard component unchanged.

---

## 2. TrainingPage — Edit squads button + back navigation

### Issue A: "Edit squads" button inconsistency
Current: custom-styled `<div>` acting as button inside context bar.  
Fix: Replace with `<Btn variant="ghost" size="sm">Edit squads</Btn>`.

### Issue B: No way to go back to attendees/setup  
Current: context bar only shows "Edit squads" → squads page.  
Fix: Add a second tappable item for returning to setup:

Context bar should show two tappable elements:
```
[← Attendees]   [Edit squads]
```
Both using `Btn variant="ghost" size="sm"`.
- "Attendees" → `navigate(\`/training/${trainingId}/setup\`)`
- "Edit squads" → `navigate(\`/training/${trainingId}/squads\`)`

Keep the info text (player count + squad names) in the context bar.

---

## 3. TrainingPage — Remove "tap = won" direct save behavior

**Current problem:** Tapping the home/away team name area in MatchupCard immediately saves a point (win) without any confirmation or player selection. This is wrong UX.

**New behavior:**
- Tapping ANYWHERE on an active matchup card (left side, right side, center) → opens QuickLogView
- Remove `onQuickLog` prop from MatchupCard entirely
- Remove `handleQuickTap` function in MatchupCard
- Remove "tap = won" hint text from both sides
- Both `left div onClick` and `right div onClick` should call `onOpen()` when active

In `TrainingPage.jsx`, the `MatchupCard` for active matchups:
```jsx
<MatchupCard
  key={m.id}
  matchup={m}
  squads={training.squads}
  squadRoster={squadRoster}
  onOpen={() => setQuickLogMatchupId(m.id)}
  onDelete={() => setDeleteMatchup({ id: m.id })}
  active
/>
```
No `onQuickLog` prop. MatchupCard simplifies: all taps → `onOpen()`.

The center score/SCOUT button area should remain tappable → `onOpen()` (same as sides).

---

## 4. QuickLogView — Show players by squad, not mixed

**Current problem:** All players (home + away squad) are shown in one flat list. User can't tell who's on which squad.

**New:** Show two labeled sections with squad colors.

### New props for `QuickLogView`:
```js
// Replace: roster (combined array)
// With:
homeRoster,  // array of player objects for squad A
awayRoster,  // array of player objects for squad B
// Keep: points, onSavePoint, onBack, onSwitchToScout
// teamA and teamB stay as { name, id } objects
```

### New player section UI (replace current flat roster):

```
[R1 — pick players]  ← squad label using teamA.name + color dot
[ Johny ] [ Mike ] [ Adam ]   ← chip per player, tap to toggle

[R2 — pick players]  ← squad label using teamB.name + color dot  
[ Tom ] [ Pete ] [ Chris ]
```

Colors: use the SQUAD_META colors from TrainingPage.  
Pass `homeColor` and `awayColor` as props (e.g. '#ef4444', '#3b82f6').

The `selected` Set still works the same — players from either squad can be selected.
The count shows selected.size / total (still max 5 but in practice can be up to 10).

"Who won?" buttons stay at the bottom:
```
[ R1 won ]    [ R2 won ]
```

### In `TrainingPage.jsx`, update QuickLogView call:
```jsx
<QuickLogView
  teamA={{ name: homeMeta.name, id: homeSquad, color: homeMeta.color }}
  teamB={{ name: awayMeta.name, id: awaySquad, color: awayMeta.color }}
  homeRoster={homeRoster}
  awayRoster={awayRoster}
  points={qlPoints}
  onSavePoint={async ({ assignments, outcome }) => { ... }}
  onBack={() => setQuickLogMatchupId(null)}
  onSwitchToScout={() => { ... }}
/>
```

The `onSavePoint` handler already works correctly — `assignments` is built from `selected` Set regardless of which squad the players belong to.

### Update `handleWin` in `QuickLogView`:
- Remove `if (selected.size === 0)` guard — allow saving with 0 selected (auto-fills from rosters)
- If selected.size === 0, auto-assign: home players get slots 0-4, away players get slots 0-4 each

Actually keep the guard but make it clear: if no players selected, both squads auto-fill from their rosters (same behavior as the old direct tap = won).

---

## "Advanced scouting" option

`onSwitchToScout` already exists in QuickLogView and is wired in TrainingPage.  
Make sure the button is clearly visible — label it **"Advanced scouting ›"** as a ghost link at the bottom of QuickLogView, below the win buttons.

---

## Summary of what NOT to change
- `TrainingSquadsPage.jsx` — no changes
- `TrainingSetupPage.jsx` — no changes  
- `TrainingResultsPage.jsx` — no changes
- Squad creation / matchup creation flow — no changes
- `onSavePoint` handler logic in TrainingPage — no changes

## Build & commit
Run `npx vite build` — must pass clean.  
Commit message: `feat: practice UX fix + scout ranking scope toggle`
