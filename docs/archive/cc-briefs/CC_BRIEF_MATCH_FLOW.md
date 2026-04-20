# CC_BRIEF_MATCH_FLOW.md
## Match Flow Redesign — Three-Level Navigation

**Priority:** HIGH — fundamental UX improvement from user feedback
**Context:** PXL weekend showed scouts need: tap match → immediately scout → back to match list. Current side picker adds friction. Current tournament page shows too much non-scout info. This brief restructures the entire match flow.

**Design specs:** DESIGN_DECISIONS.md sections 21, 22, 23

---

## Architecture overview

Three navigation levels:
```
Level 1: MATCH LIST (TournamentPage, simplified)
  ├── tap team name → Level 3: POINT SCOUTING (canvas, immediate)
  └── tap score → Level 2: MATCH REVIEW (summary + heatmap)

Level 2: MATCH REVIEW (new view within MatchPage)
  ├── tap team in scoreboard → Level 3: POINT SCOUTING
  ├── tap team in point card → Level 3: POINT SCOUTING (edit specific point)
  ├── tap score in point card → preview on heatmap (inline toggle)
  └── back → Level 1: MATCH LIST

Level 3: POINT SCOUTING (existing MatchPage editor, minus side picker)
  └── back → Level 2: MATCH REVIEW
```

---

## Part 1: TournamentPage — Match-first layout

### Restructure page layout
Move matches section to TOP (before teams). Current order: header → divisions → teams → matches.
New order: header → divisions → matches → collapsed section (teams, settings, layout).

### Match card redesign (split-tap)
Replace current MatchCard component with split-tap design.

**Three tappable zones per card:**
```
┌─────────────────────────────────────┐
│ [TEAM A zone]  [SCORE zone]  [TEAM B zone] │
│  tap=scout      tap=review    tap=scout     │
└─────────────────────────────────────┘
```

**Left team zone:**
- onClick: `navigate('/tournament/${tid}/match/${mid}?scout=${m.teamA}')`
- Shows: team name (15px/600) + "tap to scout" (9px/500, `#475569`)
- If claimed by other scout: dim to 35% opacity, show green dot + scout name, disable tap

**Score zone (center):**
- onClick: `navigate('/tournament/${tid}/match/${mid}')`  (no scout param)
- Shows: score (20px/800) + status pill (LIVE/FINAL/time)
- Background: `#0b1120` (recessed)

**Right team zone:**
- Same as left but for teamB, right-aligned

**Card styling by status:**
- Live: border `1px solid #f59e0b15`
- Scheduled: score dim `#334155`, "— : —"
- Completed: card opacity 50%, show W/L instead of "tap to scout"

### Collapsed footer section
Below matches, add collapsible accordion:
```jsx
<div onClick={toggleExpanded}>
  Teams · Settings · Layout ▾
</div>
{expanded && (
  // Existing teams section, layout link, settings
)}
```
Default collapsed. State in localStorage per tournament.

### Claim display on match cards
Read `match.homeClaimedBy` / `match.awayClaimedBy` from Firestore.
Map uid to user display name (from workspace members or "Scout").
Show on locked sides: green dot + name.

---

## Part 2: MatchPage — Route parameter for mode

### URL structure
- `/tournament/:tid/match/:mid` → Match Review (level 2)
- `/tournament/:tid/match/:mid?scout=SCOUTED_TEAM_ID` → Point Scouting (level 3)

### Read scout param on mount
```javascript
const searchParams = new URLSearchParams(location.search);
const scoutTeamId = searchParams.get('scout');

useEffect(() => {
  if (scoutTeamId) {
    // Determine if this team is teamA or teamB in the match
    const side = scoutTeamId === match?.teamA ? 'home' : 'away';
    setScoutingSide(side);
    setViewMode('editor');
    // Claim side (existing claim logic)
    claimSide(side);
  } else {
    // No scout param = review mode
    setScoutingSide('observe');
    setViewMode('review'); // new view mode
  }
}, [scoutTeamId, match?.teamA, match?.teamB]);
```

### REMOVE Side Picker entirely
Delete the side picker UI (the Home/Away/Observe cards). The `?scout=` param replaces it.
Keep the claim system logic (Firestore writes, heartbeat, stale detection) — just remove the UI.

---

## Part 3: Match Review view (new viewMode='review')

### When: `viewMode === 'review'` (no scout param, or observe mode)

### Layout (top to bottom):
1. **Header:** back "‹ Matches" + title centered + LIVE pill
2. **Scoreboard card:** split-tap (same pattern as match list cards but bigger)
   - Team names: 18px/700
   - "Scout ›" affordance below each name (11px/600, amber)
   - Score: 32px/900 in recessed center
   - Tap team → navigate with `?scout=teamId`
3. **Heatmap:** full field, both teams (existing HeatmapCanvas, mode="positions")
4. **Points list:** split-tap cards per point
   - Left team: tap → navigate with `?scout=teamId&point=pointId`
   - Score center: tap → toggle point preview on heatmap (existing preview logic)
   - Right team: tap → navigate with `?scout=otherTeamId&point=pointId`
   - Winner: green bar + bold name. Loser: red bar + dim name.
5. **Sticky "End match" button** at bottom (red outline)

### Point preview (existing feature, reconnect)
When score center is tapped in point card:
- Filter heatmap to show only that point's data
- Show numbered player markers
- Highlight selected card (amber border)
- "Show all points ×" to reset

### Scoreboard team tap:
```javascript
const handleScoutTeam = (scoutedTeamId) => {
  navigate(`/tournament/${tid}/match/${mid}?scout=${scoutedTeamId}`);
};
```

---

## Part 4: Point Scouting — edit specific point

### URL: `?scout=TEAM_ID&point=POINT_ID`

When both params present, auto-load that point for editing:
```javascript
const pointId = searchParams.get('point');
useEffect(() => {
  if (pointId && points.length) {
    const pt = points.find(p => p.id === pointId);
    if (pt) editPoint(pt);
  }
}, [pointId, points.length]);
```

### Back navigation from scouting
```javascript
const handleBack = () => {
  // Always go to match review (remove scout param)
  navigate(`/tournament/${tid}/match/${mid}`);
  // Release claim
  releaseClaim();
};
```

---

## Part 5: Point summary bar (scout verification)

### New component: `src/components/PointSummary.jsx`

Shows below roster pills during scouting. Updates live as scout adds data.

**Props:**
```javascript
<PointSummary
  pointNumber={currentPointNumber}
  draft={activeDraft}   // draftA or draftB
  quickShots={activeDraft.quickShots}
/>
```

**Computes from draft:**
- Players placed: count of non-null positions
- Dorito/Center/Snake: count from quickShots zones
- Shots: count of precise shots
- Eliminations: count of elim flags
- Bumps: count of non-null bump stops

**Styling:** See DESIGN_DECISIONS.md section 23 (Point summary).

---

## Part 6: Header updates

### Match Review header:
```jsx
<PageHeader
  back={{ label: 'Matches', onClick: () => navigate(`/tournament/${tid}`) }}
  title={`${teamAName} vs ${teamBName}`}
  badges={[match.status === 'closed' ? 'FINAL' : 'LIVE']}
/>
```
Title centered, muted color (13px/500, `#8b95a5`).

### Point Scouting header:
```jsx
<PageHeader
  back={{ label: 'Match', onClick: handleBack }}
  title={`Scouting ${scoutedTeamName}`}
  subtitle={`vs ${opponentName} · ${score}`}
/>
```
Title centered, muted. Subtitle right-aligned.

---

## Part 7: Side confusion fix (BUG-1) — ✅ ALREADY FIXED BY CC

BUG-1 was fixed in a parallel CC session (April 13, 2026). Changes shipped:
- `lastSyncedHomeSideRef` guards sync effect
- Swap persists to local state before Firestore write
- Toast on external side flip
- Base indicator pills on canvas corners

**No action needed in this brief.** Just verify the fix still works after
Parts 1-6 refactoring.

---

## Verification checklist

### Match list (TournamentPage)
- [ ] Matches section is ABOVE teams section
- [ ] Split-tap cards: left team → scouting, score → review, right team → scouting
- [ ] Claimed sides show scout name + green dot + disabled state
- [ ] Live/Scheduled/Completed styling correct
- [ ] Collapsed footer (Teams/Settings/Layout) works with localStorage
- [ ] Division filter still works on matches

### Match review
- [ ] Opens when navigating to match WITHOUT ?scout param
- [ ] Scoreboard shows both teams with "Scout ›" affordance
- [ ] Tap team in scoreboard → navigates with ?scout param
- [ ] Heatmap renders full field with both teams
- [ ] Point cards: tap left team → edit that team's point data
- [ ] Point cards: tap right team → edit other team's point data
- [ ] Point cards: tap score → preview on heatmap (toggle)
- [ ] End match button sticky at bottom
- [ ] Back → tournament page (match list)

### Point scouting
- [ ] Opens when ?scout param present
- [ ] No side picker shown
- [ ] Correct team auto-selected based on ?scout value
- [ ] Claim written to Firestore on entry
- [ ] Point summary bar shows live stats (placed/shots/elim/zones)
- [ ] Back → match review (removes ?scout param)
- [ ] ?point param auto-loads specific point for editing
- [ ] Save point → returns to match review

### BUG-1 (already fixed — verify after refactoring)
- [ ] Swap sides persists correctly in solo mode
- [ ] No more fieldSide flipping from useEffect race
- [ ] Base indicators (team name pills) visible on canvas corners
- [ ] Concurrent: swap toast appears on external side flip

### General
- [ ] Build passes: `npx vite build 2>&1 | tail -3`
- [ ] Precommit passes: `npm run precommit`
- [ ] Test on phone + tablet + desktop
