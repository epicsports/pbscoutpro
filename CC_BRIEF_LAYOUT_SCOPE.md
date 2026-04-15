# CC Brief 2: Layout Scope in All Stats Pages

Read DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.
Depends on: CC_BRIEF_STATUS_SYSTEM.md (eventType field exists on tournaments).

---

## Overview

Add "By layout" scope to PlayerStatsPage, ScoutedTeamPage, and ScoutRankingPage.
Layout scope = aggregate data from ALL events (trainings + sparings + tournaments) that share the same `layoutId`.

This is the primary analytical context for tournament preparation.

---

## 1. `PlayerStatsPage.jsx` — add layout scope

### Current scopes: `global` | `tournament` | `match` | `training`
### New scopes: `global` | `layout` | `tournament` | `match` | `training`

Add URL param support: `?scope=layout&lid=<layoutId>`

### Scope pill UI

Current pills row shows relevant scopes based on URL params.
Add a "By layout" pill that appears when layouts exist.

When `scope=layout`:
- Show a layout picker dropdown (Select from ui.jsx) with all layouts
- Default to `lid` param or first layout
- Filter all tournaments by `tournament.layoutId === selectedLayoutId`
- ALSO include training sessions with `training.layoutId === selectedLayoutId`

### Data fetching for layout scope

```js
if (scopeParam === 'layout') {
  const layoutId = searchParams.get('lid');
  // Scan all tournaments matching this layoutId
  const layoutTournaments = tournaments.filter(t => t.layoutId === layoutId);
  // Scan all trainings matching this layoutId
  const layoutTrainings = trainings.filter(t => t.layoutId === layoutId);
  // Walk both, same as global but filtered
  scanTids = layoutTournaments.map(t => t.id);
  // Also add training data using existing training scope logic
}
```

Each point should be tagged with its eventType:
```js
.map(pp => ({ ...pp, tournamentId: tid, field, eventType: tournament.eventType || 'tournament' }))
```

### Stats display for layout scope

Show a summary header above stats:
```
Layout: NXL 2025 Las Vegas
Training: 3 sessions · Sparing: 2 events · Tournament: 1
Total: 147 points on this layout
```

---

## 2. `ScoutedTeamPage.jsx` — add layout scope

This page shows stats for a scouted opponent team within one tournament.
Add layout scope to show how this team plays across ALL events on the same layout.

### New props/behavior

When viewing `ScoutedTeamPage` with `?scope=layout`:
- Load all tournaments that share the same `layoutId` as the current tournament
- Load all scouted entries for the same `scoutedId` (team) across those tournaments
- Aggregate `heatmapPoints` from all those matches

### UI addition

Below PageHeader, add scope pills:
```
[This tournament]  [All on this layout]
```

"All on this layout" is only shown when `tournament.layoutId` exists and other tournaments share that layoutId.

When layout scope active, show a summary:
```
Across 3 events on this layout · 67 points scouted
Sparing (Apr 2) · Local PXL (Apr 8) · NXL (Apr 14)
```

All existing sections (Key Insights, Counter Plan, Side Tendency, etc.) recalculate from the aggregated points. This is the most powerful view — the coach sees everything known about this opponent on this layout.

---

## 3. `ScoutRankingPage.jsx` — add layout scope

Already has global + tournament scope (from CC_BRIEF_PRACTICE_AND_SCOUT_RANKING.md).
Add layout scope:

```
[Global]  [Layout]  [Tournament]
```

When Layout: show layout picker, filter points by tournaments with matching layoutId.

---

## 4. Shared utility: `useLayoutScope` hook

Create `src/hooks/useLayoutScope.js`:

```js
// Returns tournaments and trainings filtered by a given layoutId
export function useLayoutScope(layoutId) {
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { layouts } = useLayouts();

  const layout = layouts.find(l => l.id === layoutId) || null;
  const scopedTournaments = layoutId
    ? tournaments.filter(t => t.layoutId === layoutId)
    : [];
  const scopedTrainings = layoutId
    ? trainings.filter(t => t.layoutId === layoutId)
    : [];

  return { layout, scopedTournaments, scopedTrainings };
}
```

---

## 5. Layout scope label on event cards (MainPage / ScoutTabContent)

When a tournament or training has a layout assigned, show the layout name as a small badge on the card:

```jsx
{tournament.layoutId && layouts.find(l => l.id === tournament.layoutId) && (
  <span style={{ fontSize: 9, color: '#475569', fontWeight: 600 }}>
    {layouts.find(l => l.id === tournament.layoutId).name}
  </span>
)}
```

This gives immediate visual grouping: coach sees "3 events, all on NXL 2025 Vegas layout".

---

## Build & commit

`npx vite build` must pass.
Commit: `feat: layout scope in PlayerStatsPage, ScoutedTeamPage, ScoutRankingPage`
