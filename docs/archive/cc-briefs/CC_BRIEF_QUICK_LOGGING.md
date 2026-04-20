# CC_BRIEF_QUICK_LOGGING.md
## Quick Logging Mode — Fast Point Tracking Without Canvas

**Priority:** HIGH — replaces paper tracking at fast-paced tournaments
**Context:** At PXL events, scouts track 8+ matches simultaneously. Full canvas scouting is too slow. Need: tap lineup → tap winner → next. Under 5 seconds per point.
**Design specs:** Inline — this file contains full spec.

---

## Part 1: Quick Log view in MatchPage

### Add viewMode: 'quicklog'

In MatchPage.jsx, add a third viewMode alongside 'editor' and 'review'/'heatmap':

```javascript
// Existing viewModes: 'editor' (scouting canvas), 'review'/'heatmap' (match review)
// New: 'quicklog' (fast lineup + outcome logging)
```

### Entry point

On the Match Review screen (the one with score + "Scout >" buttons), add a "Quick log" button:
- Position: alongside the existing "Scout >" on each team's side
- Style: smaller, outline/ghost variant
- Or: add a toggle in the match header between "Scout" and "Quick log" modes

When match is LIVE and user taps "Quick log >" → `setViewMode('quicklog')`.

---

## Part 2: QuickLogView component

### New file: `src/components/QuickLogView.jsx`

**Props:**
```javascript
{
  teamA,          // team object { name, id }
  teamB,          // team object { name, id }
  roster,         // player array for the scouted team
  scoreA, scoreB, // current score
  points,         // existing points array
  onSavePoint,    // (assignments, outcome) => Promise
  onSwitchToScout, // () => switch to full scout mode
}
```

**Layout (single screen, no scroll needed):**

```
┌─────────────────────────────────┐
│  ← Match         Quick log  Full scout → │
├─────────────────────────────────┤
│           Nexty  3:2  Husaria            │  ← score bar
├─────────────────────────────────┤
│  Point #6 — Who's playing?      3/5     │  ← section
│  [Koe] [Eryk] [Kacper] [Papcio] [Ice]   │  ← roster chips
│  [Bartek] [Kuba] [Dawid] [Szymon]        │    tap = toggle
├─────────────────────────────────┤
│  ┌──────────┐   ┌──────────┐             │
│  │  Nexty   │   │ Husaria  │             │  ← outcome buttons
│  │  (tap)   │   │  (tap)   │             │    ONE TAP = save
│  └──────────┘   └──────────┘             │
├─────────────────────────────────┤
│  #5  Koe, Ice, Dawid, Eryk, Piotrek  W  │  ← history
│  #4  Koe, Papcio, Bartek, Kuba    L     │
│  #3  Koe, Ice, Dawid, Eryk, Piotrek  W  │
└─────────────────────────────────┘
```

### Score bar
```jsx
<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 8, background: '#0d1117', borderBottom: '1px solid #1a2234' }}>
  <div style={{ flex: 1, textAlign: 'center' }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{teamA.name}</div>
  </div>
  <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.text }}>{scoreA}</div>
  <span style={{ fontSize: 28, fontWeight: 800, color: '#334155' }}>:</span>
  <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.text }}>{scoreB}</div>
  <div style={{ flex: 1, textAlign: 'center' }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{teamB.name}</div>
  </div>
</div>
```

### Roster chips
- Same nickname chips as training "Who's here" screen
- Height 44px, border-radius 10px
- Selected: green border + green text (#22c55e)
- Unselected: gray border + gray text
- Tap = toggle (max 5 selected)
- **IMPORTANT:** After saving a point, keep the selection (lineup usually stays same between points)
- Show selected count: "3/5"

### Outcome buttons
Two large buttons side by side:
- Team A: green border `#22c55e40`, bg `#22c55e08`, team name in green
- Team B: red border `#ef444440`, bg `#ef444408`, team name in red
- Min height: 100px, border-radius 16px
- **ONE TAP = save point immediately.** No confirmation modal. Speed is everything.

### Save flow
```javascript
const handleWin = async (winner) => {
  if (selected.size === 0) return;
  const assignments = Array(5).fill(null);
  const selectedArr = Array.from(selected);
  selectedArr.forEach((pid, i) => { if (i < 5) assignments[i] = pid; });
  
  const outcome = winner === 'A' ? 'win_a' : 'win_b';
  await onSavePoint({
    assignments,
    outcome,
    // No players/shots/eliminations — just lineup + result
    players: Array(5).fill(null),
    shots: Array(5).fill([]),
    eliminations: Array(5).fill(false),
  });
  // Don't clear selection — keep lineup for next point
};
```

### History list
- Scrollable, newest first
- Each row: `#N  [lineup names, comma separated]  [W/L badge]`
- W badge: green, L badge: red
- Tap row → open that point in full scout mode (for adding positions later)

---

## Part 3: Wire into MatchPage

### Add quicklog viewMode
```javascript
const [viewMode, setViewMode] = useState('review'); // 'review' | 'editor' | 'quicklog'
```

### Add entry point on match review
On the match review screen, for each team's "Scout >" button area, add "Quick >" option:

```jsx
// Existing: <div onClick={() => goScout(match?.teamA)}>Scout ›</div>
// Add below or alongside:
<div onClick={() => { setViewMode('quicklog'); setActiveTeam('A'); }}>Quick ›</div>
```

### Render QuickLogView
```jsx
{viewMode === 'quicklog' && (
  <QuickLogView
    teamA={teamA}
    teamB={teamB}
    roster={roster}
    scoreA={match?.scoreA || 0}
    scoreB={match?.scoreB || 0}
    points={points}
    activeTeam={activeTeam}
    onSavePoint={async (data) => {
      // Build the same data structure as full scout save
      const makeTeamData = (d) => ({
        players: d.players,
        assignments: d.assignments,
        shots: Array(5).fill([]),
        eliminations: Array(5).fill(false),
        eliminationPositions: Array(5).fill(null),
        quickShots: {},
        obstacleShots: {},
        bumpStops: Array(5).fill(null),
        runners: Array(5).fill(false),
      });
      
      const teamData = makeTeamData(data);
      const pointData = {
        homeData: activeTeam === 'A' ? { ...teamData, fieldSide: 'left' } : {},
        awayData: activeTeam === 'B' ? { ...teamData, fieldSide: 'right' } : {},
        teamA: activeTeam === 'A' ? teamData : {},
        teamB: activeTeam === 'B' ? teamData : {},
        outcome: data.outcome,
        status: 'scouted',
        fieldSide: 'left',
      };
      await addPointFn(pointData);
      
      // Update match score
      const allOutcomes = [...points.map(p => p.outcome), data.outcome];
      const newScoreA = allOutcomes.filter(o => o === 'win_a').length;
      const newScoreB = allOutcomes.filter(o => o === 'win_b').length;
      await updateMatchFn({ scoreA: newScoreA, scoreB: newScoreB });
    }}
    onSwitchToScout={() => setViewMode('editor')}
    onBack={() => setViewMode('review')}
  />
)}
```

---

## Part 4: Quick log for training mode

Quick log should also work in training mode matchups.
The same QuickLogView component can be used — roster comes from training squads instead of scouted teams.

Training matchup page should have "Quick log" button alongside "Scout point".

---

## Verification checklist
- [ ] Quick log accessible from match review via "Quick >" button
- [ ] Roster chips toggle correctly (max 5)
- [ ] One tap on outcome = point saved immediately
- [ ] Score updates after save
- [ ] Lineup preserved between points (not cleared after save)
- [ ] History shows all points with lineup + W/L
- [ ] "Full scout →" switches to canvas scouting
- [ ] Back button returns to match review
- [ ] Data compatible with full scout (assignments stored correctly)
- [ ] Tap history row → opens point in full scout mode
- [ ] Works in both tournament and training mode
- [ ] Build passes
