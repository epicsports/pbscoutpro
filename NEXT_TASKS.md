# NEXT TASKS — For Claude Code
## Work top to bottom. Push after each task. Test on 375px mobile.

**Last updated:** 2026-04-03 by Opus
**Rules:** Inline JSX styles only (COLORS/FONT/TOUCH from theme.js). ALL labels in English.
Don't touch `src/workers/ballisticsEngine.js` (Opus territory).
Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`.

---

# ✅ SESSION 1: Canvas Foundation — DONE
Pinch-to-zoom, loupe, pan, handedness prompt. All implemented.

# ✅ SESSION 2: LayoutDetailPage Mode Tabs — DONE
Setup modal removed. Mode tabs implemented. Auto-save working.

# ✅ SESSION 3: TacticPage Mode Tabs — DONE
Mode tabs, swipe between steps, counter-play panel.

---

# SESSION 4: Cleanup + MatchPage Redesign

## 4.0 Remove dead zoom code
**Files:** `src/components/FieldEditor.jsx`, `src/pages/MatchPage.jsx`

Old toggle-zoom is dead code — pinch-to-zoom replaced it in Session 1.

**FieldEditor.jsx — delete:**
- Props: `zoom`, `onZoom`, `showZoom` (lines ~20-22)
- State: `intZoom`, `setIntZoom` (line ~56)
- Computed: `const zoom = ...` (line ~65)
- Function: `toggleZoom` (line ~74)
- All conditional rendering based on `zoom` (lines ~96, ~143, ~149)
- Focus mode floating pills (entire block lines ~182-214)
- Zoom button in toolbar

**MatchPage.jsx — delete:**
- State: `editorZoom`, `setEditorZoom` (line ~67)
- All 12 `editorZoom` conditionals
- `zoom={editorZoom} onZoom={setEditorZoom}` on FieldEditor
- Zoom anchor overlay div (lines ~617-623)
- `showZoom={false}` prop

## 4.1 Translate Polish → English
**See:** `TRANSLATION_MANIFEST.md` — ~80 strings, 15 files. Push after each file.

## 4.2 MatchPage — map-first layout
**File:** `src/pages/MatchPage.jsx`

Delete current bottom-half clutter. New layout:

```
┌─────────────────────────────────┐
│ ← Pxl Preseason Cup            │
│ RING Warsaw  [2:0]  VIKINGS    │  ← compact one-line score
├─────────────────────────────────┤
│                                 │
│     CANVAS (65-70% screen)      │
│     default = pan/zoom only     │
│                          [🔧]   │  ← FAB for analysis tools
│                                 │
├─────────────────────────────────┤
│ [P1] [P2] [P3] [P4] [P5]       │  ← player strip (chips)
├─────────────────────────────────┤
│ [📍Place] [💀Hit] [🎯Shot] [✓OK]│  ← action bar
└─────────────────────────────────┘
```

### Player strip
Horizontal chips. Color dot + number. Active = amber border.
```jsx
{[0,1,2,3,4].map(i => (
  <div key={i} onClick={() => setSelectedPlayer(i)} style={{
    padding: '8px 14px', borderRadius: 20,
    border: `2px solid ${selectedPlayer === i ? COLORS.accent : COLORS.border}`,
    background: selectedPlayer === i ? `${COLORS.accent}20` : COLORS.surface,
    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
  }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%',
      background: COLORS.playerColors[i] }} />
    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700,
      color: selectedPlayer === i ? COLORS.accent : COLORS.text }}>P{i+1}</span>
  </div>
))}
```

### Action bar
4 buttons, radio behavior (only ONE active). Default = none active (pan/zoom).
```
place → tap canvas = place selectedPlayer
hit   → tap player on canvas = eliminate
shot  → tap canvas = place shot for selectedPlayer
ok    → opens bottom sheet: point outcome + save
```

### FAB (🔧)
Bottom-right of canvas. Tap → expands vertical stack:
🔥 Visibility, 🎯 Counter, 👁 Opponent, 📊 Heatmap, ✏️ Draw.
Tap outside → collapse.

### Point outcome bottom sheet
On ✓OK tap:
```
Point outcome:
[✅ RING W]  [✅ VIKING]  [⏱ T/O]
[+ More info]
[✓ SAVE POINT]
```

## 4.3 Compact match overview
Point list screen (not scouting):
```
← Tournament
RING Warsaw  2:0  VIKINGS Black
[Positions] [Shots]  ← toggle canvas overlay
[Canvas — aggregated view]
POINTS (2)
 #1 [RIN] A0 B1 ⚠ DANGER  🗑
 #2 [RIN]                  🗑
[+ ADD POINT]
```

---

# SESSION 5: Tournament Divisions

## 5.1 Firestore model — division field
**File:** `src/services/dataService.js`

```javascript
// Tournament: add divisions array
{ ...existing, divisions: ['Div.1', 'Div.2'] }

// addScoutedTeam: add division param
{ teamId, division: data.division || null, roster }

// addMatch: add division param
{ homeTeamId, awayTeamId, division: data.division || null, date }
```

## 5.2 Division tabs in TournamentPage
**File:** `src/pages/TournamentPage.jsx`

Tab bar below header: `[All] [Div.1] [Div.2] [Div.3]`

```jsx
const [activeDivision, setActiveDivision] = useState('all');
const filteredTeams = activeDivision === 'all'
  ? scouted : scouted.filter(s => s.division === activeDivision);
const filteredMatches = activeDivision === 'all'
  ? matches : matches.filter(m => m.division === activeDivision);
```

## 5.3 Division picker on add team/match
Dropdown from `tournament.divisions` when adding scouted team or match.

## 5.4 Tournament edit — manage divisions
Chip tags: `[Div.1 ×] [Div.2 ×] [+ Add]`
Inline text input on [+ Add]. Save as `divisions[]` array.

## 5.5 TournamentPage — compact header
Title + badges in sticky header. Layout as small preview module.
```
← Home
Pxl Preseason Cup  [PXL] [2026]
Layout: 2026Midatlantic  [Change]
[Div.1] [Div.2] [All]
```

---

# SESSION 6: Concurrent Scouting (Split Sides)

## 6.1 Data model — homeData/awayData
**File:** `src/services/dataService.js`

Each point splits into two independent objects:
```javascript
{
  pointNumber: 1,
  outcome: 'win',
  homeData: {
    players: [null,null,null,null,null],
    shots: [[],[],[],[],[]],
    bumps: [null,null,null,null,null],
    eliminations: [],
    scoutedBy: 'uid-coach1',
    lastUpdate: Timestamp,
  },
  awayData: { /* same structure */ },
}
```

**Migration** for old points:
```javascript
function migratePoint(point) {
  if (point.homeData) return point;
  return {
    ...point,
    homeData: { players: point.players, shots: point.shots,
      bumps: point.bumps, eliminations: point.eliminations },
    awayData: { players: [null,null,null,null,null],
      shots: [[],[],[],[],[]], bumps: [null,null,null,null,null],
      eliminations: [] },
  };
}
```

## 6.2 Side claim UI
**File:** `src/pages/MatchPage.jsx`

Before scouting, show side selector:
```
Choose your scouting side:
🔴 HOME: RANGER Warsaw    [Claim] / ✅ You
🔵 AWAY: PPARENA Pisen    [Claim] / ✅ Coach2
[👀 Watch both] (read-only)
```

Claim writes `match.homeScoutedBy = myUid` (or awayScoutedBy).
Lock indicator shows who claimed each side.

## 6.3 Dual-write with Firestore dot notation
Coach writes ONLY to their side:
```javascript
await updateDoc(pointRef, {
  [`points.${idx}.${mySide}Data.players`]: players,
  [`points.${idx}.${mySide}Data.shots`]: shots,
  [`points.${idx}.${mySide}Data.lastUpdate`]: serverTimestamp(),
});
```
Never touches other side → zero conflicts.
`onSnapshot` for live sync — both coaches see updates.

## 6.4 Merge view
When both sides scouted, combined view:
- 10 players (5 home colors + 5 away colors)
- All shots from both
- Toggle: [Home] [Away] [Both]

---

# SESSION 7: Polish & Features

## 7.1 Translation
See `TRANSLATION_MANIFEST.md`. If not done in 4.1, do here.

## 7.2 Back buttons — consistent pattern
All detail pages get iOS-style back:
- MatchPage → "← {tournament}" → `/tournament/{id}`
- TacticPage → "← {layout/tournament}" → back
- TournamentPage → "← Home" → `/`
- TeamDetailPage → "← Teams" → `/teams`
- LayoutDetailPage → "← Layouts" → `/layouts`
- ScoutedTeamPage → "← {tournament}" → `/tournament/{id}`

Tab pages (Home, Layouts, Teams, Players): title only, no back arrow.

## 7.3 Bottom nav padding
Tab pages: `paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))'`

## 7.4 Import CSV → Players page
Remove from Home. Add as `[📋 Import CSV]` button on PlayersPage.

## 7.5 Home dashboard
Replace Home with:
- ⚡ Recent matches (3) — list cards with score + date
- 🏆 Active tournament (1) — big card
- [+ New tournament]
- Other tournaments (with filters)

Remove: Players, Teams, Import, Layouts sections (in bottom nav already).

## 7.6 OCR + Landscape
See `FEATURE_OCR_LANDSCAPE.md`.

## 7.7 Security Phase 3
See `SECURITY.md` — server-side admin verification.

## 7.8 WCAG contrast audit
Lighthouse check. Fix AA violations. Focus: dim text, small targets.

## 7.9 OffscreenCanvas heatmap
Move heatmap grid drawing to OffscreenCanvas on worker thread.

---

# Reference docs
- `TACTIC_WORKFLOW.md` — scout→save→counter pipeline
- `TRANSLATION_MANIFEST.md` — Polish→English string mapping
- `FEATURE_OCR_LANDSCAPE.md` — OCR bunker detection
- `SECURITY.md` — Firebase auth phases
- `IDEAS_BACKLOG.md` — future features (NOT a task queue)
