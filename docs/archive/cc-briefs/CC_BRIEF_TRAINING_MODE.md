# CC_BRIEF_TRAINING_MODE.md
## Training Mode — Practice Sessions for Own Team

**Priority:** HIGH — coaches need this for weekly training
**Context:** Training ≠ tournament. All players from same team, dynamic squads (2-4), drag & drop assignment, focus on individual player performance.
**Design specs:** DESIGN_DECISIONS.md section 32

**WARNING:** This is a NEW feature with new Firestore collections. Read section 32 FULLY before starting.

---

## Part 1: Data model + Firestore

### New collection: trainings
Path: `/workspaces/{slug}/trainings/{tid}`

```javascript
// In dataService.js — add CRUD for trainings

export async function addTraining(data) {
  // data: { date, teamId, layoutId, attendees: [], squads: {} }
  const ref = collection(db, `workspaces/${slug}/trainings`);
  return addDoc(ref, { ...data, type: 'training', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateTraining(tid, data) {
  const ref = doc(db, `workspaces/${slug}/trainings`, tid);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTraining(tid) {
  return deleteDoc(doc(db, `workspaces/${slug}/trainings`, tid));
}
```

### New collection: matchups (inside training)
Path: `/workspaces/{slug}/trainings/{tid}/matchups/{mid}`

```javascript
export async function addMatchup(tid, data) {
  // data: { homeSquad: 'red', awaySquad: 'blue', scoreA: 0, scoreB: 0, status: 'playing' }
  const ref = collection(db, `workspaces/${slug}/trainings/${tid}/matchups`);
  return addDoc(ref, { ...data, createdAt: serverTimestamp() });
}

export async function updateMatchup(tid, mid, data) {
  return updateDoc(doc(db, `workspaces/${slug}/trainings/${tid}/matchups`, mid), data);
}
```

### Points inside matchups
Path: `/workspaces/{slug}/trainings/{tid}/matchups/{mid}/points/{pid}`

Same structure as tournament match points. Reuse existing `addPoint`, `updatePoint` patterns but with training path.

### New hook: useTrainings
```javascript
// In useFirestore.js
export function useTrainings() {
  // Real-time listener on trainings collection, sorted by date desc
}

export function useMatchups(trainingId) {
  // Real-time listener on matchups subcollection
}
```

---

## Part 2: "Who's here" screen

### New file: `src/pages/TrainingSetupPage.jsx`

Route: `/training/new` (new) or `/training/:trainingId/setup` (edit)

**Layout:**
- Nav: "Cancel" back, "Who's at practice?" title
- Preset pills: horizontal scroll, "Last training (N)" default selected
  - Get last training's attendees from most recent training doc
  - Child team presets from parent team's children
  - "All" selects everyone
- Search input
- Two sections: "Here" (green chips, on top), "Not here" (gray chips, below)
- Sticky footer: "{N} here — Form squads" CTA

**Player chips:**
- Height: 44px (Apple HIG touch target)
- Border-radius: 10px
- Selected: border `#22c55e60`, bg `#22c55e10`, green dot + green nickname text
- Unselected: border `#1e293b`, bg `#0f172a`, gray nickname text
- Nickname: 13px/700
- Tap toggles

**Data flow:**
- Load all players from team (via `usePlayers` filtered by `teamId`)
- Selected state in local React state
- On "Form squads" → save to training doc `attendees` array + navigate to squad screen

---

## Part 3: Squad builder with drag & drop

### New file: `src/pages/TrainingSquadsPage.jsx`

Route: `/training/:trainingId/squads`

**Layout:**
- Nav: "Players" back (to Who's here), "Squads" title
- Info bar: "{N} players" + squad count +/- (2-4)
- Squad zones fill 100% of remaining space:
  - 2 squads: `flex-direction: column`, each zone `flex: 1`
  - 3 squads: `flex-direction: column`, each zone `flex: 1`
  - 4 squads: `display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr`
- Footer: "Start training" CTA

**Zone styling:**
- Each zone: colored header (2.5px bottom border) + wrapping chips body
- Colors: Red `#ef4444`, Blue `#3b82f6`, Green `#22c55e`, Yellow `#eab308`
- Header: dot (10px) + name (12px/800) + count (10px/600, 50% opacity)
- Chips: 40px height, border in zone color 50% alpha, bg zone color 10% alpha, text zone color
- Gap between zones: 1px `#1a2234` separator

**Drag & drop implementation:**
```javascript
const [dragIdx, setDragIdx] = useState(-1);
const [ghostPos, setGhostPos] = useState(null);
const zoneRefs = useRef([]);

const handleStart = (playerIdx, e) => {
  e.preventDefault();
  setDragIdx(playerIdx);
  const t = e.touches ? e.touches[0] : e;
  setGhostPos({ x: t.clientX, y: t.clientY });
};

const handleMove = (e) => {
  if (dragIdx < 0) return;
  e.preventDefault();
  const t = e.touches ? e.touches[0] : e;
  setGhostPos({ x: t.clientX, y: t.clientY });
};

const handleEnd = (e) => {
  if (dragIdx < 0) return;
  const t = e.changedTouches ? e.changedTouches[0] : e;
  const targetZone = getZoneAtPoint(t.clientX, t.clientY);
  if (targetZone >= 0) {
    // Move player to target squad
    updateSquadAssignment(dragIdx, targetZone);
  }
  setDragIdx(-1);
  setGhostPos(null);
};
```

**Ghost element:**
- `position: fixed`, follows touch/mouse
- Amber border `#f59e0b`, bg `#111827`, player nickname, shadow
- `transform: translate(-50%, -50%)`, `pointer-events: none`, `z-index: 100`

**Drop target highlighting:**
- Zone under cursor gets `background: #0f172a` (elevated)
- Only if different from player's current zone

**Auto-distribution on entry:**
```javascript
// When entering squad page, auto-distribute unassigned players round-robin
attendees.forEach((pid, i) => {
  if (!hasSquadAssignment(pid)) {
    assignToSquad(pid, i % numSquads);
  }
});
```

**+/- squad count:**
- Min 2, max 4
- When reducing: players from removed squad get redistributed
- When increasing: new squad starts empty

**Save:** Write `squads` object to training doc on every change:
```javascript
{ red: ['pid1', 'pid3'], blue: ['pid2', 'pid4'], green: [...] }
```

---

## Part 4: Training main screen (matchups)

### New file: `src/pages/TrainingPage.jsx`

Route: `/training/:trainingId`

**Layout:**
- Nav: "Squads" back, "Training" title, "End" right
- Context bar: date + team name + player count + "Edit squads" button
- Matchup list:
  - Current: active matchup card with score + "Playing" badge
  - Completed: dimmed matchup cards with "Final" badge
  - "+ New matchup" dashed card
- Footer: "Scout point" (amber CTA, flex:2) + "Results" (outline, flex:1)

**Matchup card:**
```jsx
<div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 10 }}>
  <div>{/* Home squad: dot + name + (count) */}</div>
  <div>{/* Score: 3:1 + status badge */}</div>
  <div>{/* Away squad: (count) + name + dot */}</div>
</div>
```

**"+ New matchup" flow:**
- If 2 squads: auto-create Red vs Blue (only option)
- If 3+ squads: show picker — select home and away squad from dropdowns
- Create matchup doc in Firestore

**"Scout point" → reuse MatchPage scouting canvas:**
- Navigate to `/training/:tid/matchup/:mid?scout=home` or `?scout=away`
- Roster for each side = players in that squad
- Canvas, shots, eliminations — all identical to tournament
- Save point → update matchup score

**"Edit squads"** → navigate to `/training/:tid/squads`
- Any squad changes take effect for future points only
- Previous points retain their original squad assignments

**"Results"** → navigate to `/training/:tid/results`

---

## Part 5: Training results (leaderboard)

### New file: `src/pages/TrainingResultsPage.jsx`

Route: `/training/:trainingId/results`

**Layout:**
- Nav: "Training" back, "Results" title
- Info line: date + total points + matchup count
- Player leaderboard (sorted by win%):
  - Rank (13px/800, `#334155`)
  - Nickname (13px/600, `#e2e8f0`)
  - Subtitle: pts played + +/- (10px, `#475569`)
  - Win% right-aligned (13px/700, colored)
- Matchup history below

**Data computation:**
Reuse `computePlayerSummaries` from `generateInsights.js` — feed it all points from all matchups.

---

## Part 6: Integration with tournament picker

### Training sessions in tournament picker
- Load trainings alongside tournaments
- Sort by date desc
- Training badge: cyan "Training" pill
- Same select/change flow

### Training type on creation
In "New tournament" modal, add type selector:
```jsx
<div>
  <Btn variant={type === 'tournament' ? 'accent' : 'default'} onClick={() => setType('tournament')}>Tournament</Btn>
  <Btn variant={type === 'training' ? 'accent' : 'default'} onClick={() => setType('training')}>Training</Btn>
</div>
```
- Tournament: existing flow (name, league, division, year)
- Training: simplified (date + layout picker only, team auto-selected)

### Player Stats Page — training scope
Add "Training" to scope pills on PlayerStatsPage:
```jsx
<ScopePill label="Training" active={scope === 'training'} onClick={() => setScope('training')} />
```
Training scope aggregates points from all training sessions.

---

## Part 7: Routes + App.jsx

### Add new routes
```jsx
<Route path="/training/new" element={<TrainingSetupPage />} />
<Route path="/training/:trainingId/setup" element={<TrainingSetupPage />} />
<Route path="/training/:trainingId/squads" element={<TrainingSquadsPage />} />
<Route path="/training/:trainingId" element={<TrainingPage />} />
<Route path="/training/:trainingId/results" element={<TrainingResultsPage />} />
<Route path="/training/:trainingId/matchup/:matchupId" element={<MatchPage />} />
```

### MatchPage adaptation for training
MatchPage needs to work with both tournament and training paths:
- Check if URL has `trainingId` or `tournamentId`
- Load roster from training squads instead of scouted teams
- Save points to training matchup path instead of tournament match path
- Everything else (canvas, shots, toolbar) identical

---

## Verification checklist

### Setup flow
- [ ] "New training" creates training doc with date + team
- [ ] "Who's here" shows full roster as nickname chips
- [ ] Preset "Last training" selects correct players
- [ ] Search filters by nickname
- [ ] Tap toggles attendance
- [ ] Footer shows correct count

### Squad builder
- [ ] 2 squads: top/bottom 50/50 split
- [ ] 3 squads: three equal horizontal sections
- [ ] 4 squads: 2×2 grid
- [ ] Drag & drop moves player between zones
- [ ] Ghost follows finger with amber border
- [ ] Target zone highlights on drag over
- [ ] +/- changes squad count (2-4)
- [ ] Players auto-distributed on entry
- [ ] Squad assignments saved to Firestore

### Training
- [ ] Matchup card shows squads + score
- [ ] "+ New matchup" creates matchup doc
- [ ] "Scout point" opens canvas with correct roster
- [ ] Points save correctly to training path
- [ ] Score updates after point save
- [ ] "Edit squads" returns to squad builder
- [ ] Mid-training player add/remove works

### Results
- [ ] Player leaderboard shows all players across all matchups
- [ ] Stats correct: win%, pts, W-L, +/-
- [ ] Matchup history shows all completed matchups

### Integration
- [ ] Training appears in tournament picker with cyan badge
- [ ] Player Stats Page shows training data in training scope
- [ ] Build passes + precommit passes
