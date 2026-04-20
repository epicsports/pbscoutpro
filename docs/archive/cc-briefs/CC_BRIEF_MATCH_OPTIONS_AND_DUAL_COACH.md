# CC Brief: Match Options + Dual-Coach Training Model

Read DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.
Two independent features — implement in order, build after each.

---

# PART 1 — Match options moved inside MatchPage

## Problem
Three-dot menu on MatchCard in ScoutTabContent only shows "Delete".
Options should be richer AND live inside the match view, not on the card.

## Changes

### `src/components/tabs/ScoutTabContent.jsx` — MatchCard

Remove ⋮ button and all onDelete/options logic from MatchCard entirely.
MatchCard becomes tap-only: whole card → navigate to match.

```jsx
// MatchCard: remove MoreBtn / ⋮ div, remove onDelete prop usage
// Every tap on the card → navigate to match (review or scout)
```

### `src/pages/MatchPage.jsx` — add ⋮ options menu

In the PageHeader `action` slot, add a `MoreBtn` (⋮) that opens an ActionSheet
with these options depending on match state:

**When match is open/live (not closed):**
- "Close match" → sets match status to 'closed', updates scores from points

**When match is closed:**
- "Reopen match" → sets match status back to 'open'
- "Edit score manually" → opens a small modal with two number inputs (Score A, Score B),
  saves with `ds.updateMatch(tid, mid, { scoreA, scoreB })`

**Always available:**
- "Delete match" → ConfirmModal ("Delete this match? All scouted points will be lost."),
  then `ds.deleteMatch(tid, mid)`, then `navigate(-1)`

Use existing `ActionSheet`, `ConfirmModal`, `Modal`, `Input` from `src/components/ui.jsx`.

Match status field: use `ds.updateMatch(tournamentId, matchId, { status: 'closed' })`.
If `ds.updateMatch` doesn't exist, use `updateDoc` directly (check dataService.js).

```jsx
// In MatchPage, add state:
const [showOptions, setShowOptions] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [showEditScore, setShowEditScore] = useState(false);
const [editScoreA, setEditScoreA] = useState('');
const [editScoreB, setEditScoreB] = useState('');

// PageHeader action:
action={<MoreBtn onClick={() => setShowOptions(true)} />}

// ActionSheet:
<ActionSheet
  open={showOptions}
  onClose={() => setShowOptions(false)}
  items={[
    isClosed
      ? { label: 'Reopen match', onPress: () => { ds.updateMatch(tid, mid, { status: 'open' }); setShowOptions(false); }}
      : { label: 'Close match', onPress: () => { /* close + score */ setShowOptions(false); }},
    { label: 'Edit score', onPress: () => {
        setEditScoreA(String(scoreA)); setEditScoreB(String(scoreB));
        setShowEditScore(true); setShowOptions(false);
    }},
    { label: 'Delete match', danger: true, onPress: () => { setShowDeleteConfirm(true); setShowOptions(false); }},
  ]}
/>
```

---

# PART 2 — Dual-coach training model

## Problem

Currently QuickLogView shows ALL players from both squads in one combined view.
During training, each coach logs for their own squad only — they don't select the
other team's players, positions, or zones. Data from both coaches is then combined
per point.

## New flow on TrainingPage MatchupCard

**Old:** tap anywhere → opens shared QuickLogView (both squads mixed)

**New:** tap left squad zone → open QuickLogView scoped to HOME squad only
         tap right squad zone → open QuickLogView scoped to AWAY squad only
         tap center score area → open combined view (existing behavior, for when one person logs both)

The MatchupCard already has three tap zones (left, center, right). Wire them:

```jsx
// In TrainingPage:
const [quickLogMatchupId, setQuickLogMatchupId] = useState(null);
const [quickLogSide, setQuickLogSide] = useState(null); // 'home' | 'away' | 'both'

// MatchupCard onOpen becomes:
onOpenHome={() => { setQuickLogMatchupId(m.id); setQuickLogSide('home'); }}
onOpenAway={() => { setQuickLogMatchupId(m.id); setQuickLogSide('away'); }}
onOpenBoth={() => { setQuickLogMatchupId(m.id); setQuickLogSide('both'); }}
```

### MatchupCard tap zones

```jsx
// Left div (home squad) onClick:
onClick={() => active ? onOpenHome?.() : onOpen?.()}

// Right div (away squad) onClick:
onClick={() => active ? onOpenAway?.() : onOpen?.()}

// Center div (score) onClick:
onClick={() => onOpenBoth?.() || onOpen?.()}
```

Add hint text to left/right zones (replace old "tap = won" which was removed):
```jsx
// Under squad name in active card:
{active && (
  <div style={{ fontFamily: FONT, fontSize: 9, color: '#475569', marginTop: 3 }}>
    tap to log
  </div>
)}
```

### QuickLogView when side = 'home'

Pass new prop `activeSide: 'home' | 'away' | 'both'` to QuickLogView.

When `activeSide === 'home'`:
- Show ONLY homeRoster in the pick step (no awayRoster section)
- Zone picker shows only home players
- "Who won?" buttons still show both squads (coach still decides winner)
- onSavePoint saves homeData only — awayData is auto-filled from awayRoster (assignments only, no positions)

When `activeSide === 'away'`: mirror of above.

When `activeSide === 'both'`: current behavior (both squads shown).

### QuickLogView changes

```jsx
export default function QuickLogView({
  teamA, teamB,
  homeRoster, awayRoster,
  roster,
  points, activeTeam = 'A',
  activeSide = 'both',  // NEW PROP
  onSavePoint, onBack, onSwitchToScout,
}) {
  // ...existing setup...

  // Which rosters to show in pick step:
  const pickRoster = activeSide === 'home' ? homeRoster
    : activeSide === 'away' ? awayRoster
    : null; // null = show both sections

  // Header label:
  const sideLabel = activeSide === 'home' ? teamA?.name
    : activeSide === 'away' ? teamB?.name
    : null;
```

In pick step, when `activeSide !== 'both'`, show only one `SquadSection`:
```jsx
{pickRoster ? (
  // Single squad
  <SquadSection
    label={`${sideLabel} — pick players`}
    color={activeSide === 'home' ? (teamA?.color || '#22c55e') : (teamB?.color || '#ef4444')}
    roster={pickRoster}
    selected={selected}
    onToggle={toggle}
  />
) : (
  // Both squads (existing behavior)
  <>
    <SquadSection label={...} roster={homeRoster} ... />
    <SquadSection label={...} roster={awayRoster} ... />
  </>
)}
```

### `onSavePoint` in TrainingPage — handle partial data

When `quickLogSide === 'home'`, the coach only provided home player positions.
Auto-fill awayData from awayRoster (assignments only, players = null array):

```js
onSavePoint={async ({ assignments, players, outcome }) => {
  const autoAssign = (rosterArr) => {
    const a = Array(5).fill(null);
    rosterArr.forEach((p, i) => { if (i < 5) a[i] = p.id; });
    return a;
  };
  const emptyData = (rosterArr, side) => ({
    players: Array(5).fill(null),
    assignments: autoAssign(rosterArr),
    shots: Array(5).fill([]), eliminations: Array(5).fill(false),
    eliminationPositions: Array(5).fill(null),
    quickShots: {}, obstacleShots: {},
    bumpStops: Array(5).fill(null),
    runners: Array(5).fill(false),
    fieldSide: side,
  });

  let homeData, awayData;

  if (quickLogSide === 'home') {
    homeData = {
      players: players || Array(5).fill(null),
      assignments,
      shots: Array(5).fill([]), eliminations: Array(5).fill(false),
      eliminationPositions: Array(5).fill(null),
      quickShots: {}, obstacleShots: {},
      bumpStops: Array(5).fill(null), runners: Array(5).fill(false),
      fieldSide: 'left',
    };
    awayData = emptyData(awayRoster, 'right');
  } else if (quickLogSide === 'away') {
    homeData = emptyData(homeRoster, 'left');
    awayData = {
      players: players || Array(5).fill(null),
      assignments,
      shots: Array(5).fill([]), eliminations: Array(5).fill(false),
      eliminationPositions: Array(5).fill(null),
      quickShots: {}, obstacleShots: {},
      bumpStops: Array(5).fill(null), runners: Array(5).fill(false),
      fieldSide: 'right',
    };
  } else {
    // 'both' — existing logic
    homeData = makeData(homeRoster);
    awayData = makeData(awayRoster);
  }

  await ds.addTrainingPoint(trainingId, quickLogMatchupId, {
    homeData, awayData, outcome, status: 'scouted', fieldSide: 'left',
  });
  // update scores...
}}
```

### Subtitle in QuickLogView when activeSide !== 'both'

```jsx
// PageHeader subtitle:
subtitle={activeSide === 'both'
  ? `${teamA?.name} vs ${teamB?.name}`
  : `Logujesz: ${sideLabel}`}
```

This makes it immediately clear which squad the coach is logging for.

---

## Build & commit

```
npx vite build
```

Commit:
```
feat: match options in MatchPage + dual-coach training model

Part 1 — MatchPage:
  - Remove ⋮ from MatchCard (ScoutTabContent), card tap = open match
  - MoreBtn in MatchPage header opens ActionSheet with:
    Close/Reopen match, Edit score (modal), Delete match (confirm)

Part 2 — Dual-coach training:
  - MatchupCard left tap = log home squad, right tap = log away squad,
    center tap = log both (existing combined view)
  - QuickLogView: new activeSide prop ('home'|'away'|'both')
    Single-side mode shows only that squad's roster + zones
  - TrainingPage onSavePoint: partial data when one side logged,
    auto-fills other side from roster assignments
  - Subtitle "Logujesz: R1" makes active side explicit
```
