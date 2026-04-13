# CC_BRIEF_QUICK_SHOTS.md
## Quick Shot — Dual Mode (zone + precise)

**Priority:** HIGH — from user feedback (PXL weekend April 2026)
**Context:** Scouts report that precise shot placement on canvas is slow and unreliable in live play. Ice: "cross vs linia — pewna info. Konkretne miejsca to mało wiarygodne." Solution: quick zone-based shot input as default, with optional drill-down to existing precise ShotDrawer.

---

## Part 1: Data Model

### New field on point teamData (homeData/awayData/teamA/teamB):
```javascript
quickShots: {
  "0": ["dorito", "center"],  // Player 1 shoots dorito + center
  "1": ["snake"],              // Player 2 shoots snake
  "2": [],                     // Player 3 — no shots recorded
  "3": ["dorito"],
  "4": ["center", "snake"]
}
```

**Values:** `"dorito"` | `"center"` | `"snake"` — array per player slot (0-4).
**Firestore format:** Object with string keys (same pattern as existing `shots`).
**Backward compat:** Existing `shots` field (precise positions) remains unchanged. Both can coexist — a player can have quickShots AND precise shots.

### dataService.js changes:
- `makeTeamData()` in MatchPage must include `quickShots` when saving
- `shotsFromFirestore` / `shotsToFirestore` — no changes needed (quickShots is separate)
- Add helpers:
  ```javascript
  export const quickShotsToFirestore = (arr) => {
    // arr = [["dorito","center"], ["snake"], [], [], []]
    const obj = {};
    arr.forEach((zones, i) => { if (zones.length) obj[String(i)] = zones; });
    return obj;
  };
  export const quickShotsFromFirestore = (obj) => {
    // returns array of 5 arrays
    return [0,1,2,3,4].map(i => (obj && obj[String(i)]) || []);
  };
  ```

### Draft state in MatchPage:
Add to `emptyTeam()`:
```javascript
quickShots: [[], [], [], [], []]
```
Add to `draftA` / `draftB` state, `resetDraft()`, `editPoint()`, `makeTeamData()`.

---

## Part 2: Quick Shot Panel (new component)

### File: `src/components/QuickShotPanel.jsx`

**When it appears:** User taps player on canvas → floating toolbar → taps 🎯 Shot → QuickShotPanel slides up from bottom of canvas area.

**Layout:**
```
┌─ Player 2 — shot direction ──── ✕ ─┐
│                                      │
│  [🔺 Dorito]  [➕ Center]  [🐍 Snake]│
│                                      │
│  [   🎯 Precise placement →        ]│
└──────────────────────────────────────┘
```

**Behavior:**
- Three zone toggle buttons: tap to toggle on/off (filled = active)
- Buttons ordered: Dorito | Center | Snake (matching field top→bottom)
- Player typically selects 1-2 zones (rarely 3)
- Panel stays open until: user taps ✕, taps another player, or taps canvas
- "Precise placement →" opens existing ShotDrawer (no changes to ShotDrawer)

**Styling (must match app design system):**
- Panel background: `COLORS.surface` (#111827)
- Border top: 1px solid `COLORS.border` (#2a3548)
- Zone buttons: 
  - Default: bg `COLORS.bg` (#0a0e17), border 2px solid `COLORS.border`
  - Active dorito: border `COLORS.discoLine` (#fb923c), bg `#fb923c12`
  - Active center: border `#94a3b8`, bg `#94a3b815`
  - Active snake: border `COLORS.zeekerLine` (cyan #06b6d4 or #22d3ee), bg `#22d3ee12`
  - Min height: 56px (TOUCH.min = 44px, but bigger for easy zone tapping)
  - Border-radius: `RADIUS.lg` (10px)
- Title: 11px uppercase, `COLORS.textDim`, weight 600
- Close button: ✕, `COLORS.textMuted`, padding 4px 8px
- Precise button: bg `COLORS.surfaceLight`, border `COLORS.border`, 44px height, `RADIUS.md`
- Panel padding: `SPACE.lg` (16px)

**Props:**
```javascript
<QuickShotPanel
  playerIndex={selPlayer}       // 0-4
  playerLabel="Player 2"        // display name
  zones={draftA.quickShots[selPlayer]}  // current zones array
  onToggleZone={(zone) => ...}  // toggle dorito/center/snake
  onPrecise={() => ...}         // open ShotDrawer
  onClose={() => ...}           // close panel
  visible={showQuickShot}       // controls slide animation
/>
```

---

## Part 3: Canvas visualization (shot direction arrows)

### In FieldCanvas.jsx or a new `drawQuickShots.js` module:

**What to draw:** For each player that has quickShots, draw dashed arrow lines from player position to the RIGHT edge of the canvas, targeting the appropriate zone vertical position.

**Zone targets on right edge:**
- Dorito: y = 15% of canvas height (top area)
- Center: y = 50% of canvas height (middle)
- Snake: y = 85% of canvas height (bottom area)

**Note:** These percentages should respect `doritoSide` from layout — if dorito is bottom instead of top, invert the mapping.

**Arrow styling:**
- Stroke: zone color (dorito=#fb923c, center=#94a3b8, snake=#22d3ee)
- Stroke width: 2px (canvas pixels, scale with DPR)
- Dash pattern: [6, 4]
- Opacity: 0.55
- Arrowhead: small triangle at the end (8px)

**Right edge zone indicators:**
- Three colored bars on the right edge of the canvas
- Default: 4px wide, 25% opacity
- When any player shoots in that zone: 6px wide, full opacity
- Colors match zone colors

**Edge labels:**
- "DORITO", "CENTER", "SNAKE" — positioned near right edge, inside dark pills
- Same style as existing zone labels (drawZones.js pattern)
- Only visible when quickShots exist (don't clutter empty canvas)

### Important: arrows should render in BOTH scouting view AND heatmap view
- Scouting: show arrows for current draft
- Heatmap: show aggregated arrows (or skip — this can be Phase 2)

---

## Part 4: Integration with MatchPage

### Toolbar flow change:
Current: Tap 🎯 Shot → opens ShotDrawer directly
New: Tap 🎯 Shot → opens QuickShotPanel → optional "Precise →" opens ShotDrawer

**State additions in MatchPage:**
```javascript
const [showQuickShot, setShowQuickShot] = useState(false);
```

**In toolbar action handler:**
```javascript
// When Shot is tapped in floating toolbar:
case 'shot':
  setShowQuickShot(true);
  // Do NOT open ShotDrawer directly anymore
  break;
```

**QuickShotPanel handlers:**
```javascript
const handleToggleZone = (zone) => {
  const current = activeDraft.quickShots[selPlayer] || [];
  const idx = current.indexOf(zone);
  const updated = idx >= 0 
    ? current.filter(z => z !== zone)
    : [...current, zone];
  // Update draft (same pattern as other draft updates)
  setActiveDraft(prev => {
    const qs = [...prev.quickShots];
    qs[selPlayer] = updated;
    return { ...prev, quickShots: qs };
  });
};

const handlePrecise = () => {
  setShowQuickShot(false);
  // Open existing ShotDrawer
  openShotDrawer(selPlayer);
};
```

**Close QuickShotPanel when:**
- User taps ✕ button
- User taps another player on canvas
- User taps empty canvas area
- Panel `onClose` → `setShowQuickShot(false)`

### Save flow:
In `makeTeamData()`, add:
```javascript
quickShots: quickShotsToFirestore(d.quickShots),
```

In `editPoint()`, load existing quickShots:
```javascript
quickShots: quickShotsFromFirestore(tA.quickShots),
```

---

## Part 5: TacticPage support

Tactic page also has shot capability. Add quickShots support there too:
- Same QuickShotPanel component
- Same toolbar flow: 🎯 → QuickShotPanel → optional Precise
- Tactic data model already has shots — add quickShots field alongside
- Canvas arrows render the same way

---

## Verification checklist

- [ ] Quick shot zones save to Firestore (check in Firebase console)
- [ ] Existing precise shots still work (backward compat)
- [ ] Both quickShots AND precise shots can coexist on same player
- [ ] Zone toggles on/off correctly (tap twice = remove)
- [ ] Panel closes on: ✕, tap other player, tap canvas
- [ ] "Precise →" opens ShotDrawer correctly
- [ ] Canvas arrows render from player to right edge
- [ ] Zone colors match: dorito=#fb923c, center=#94a3b8, snake=#22d3ee
- [ ] Right edge zone bars light up when targeted
- [ ] doritoSide respected (if dorito=bottom, zones flip)
- [ ] Works on phone (touch), tablet, desktop (mouse)
- [ ] editPoint loads existing quickShots
- [ ] TacticPage also supports quickShots
- [ ] Build passes: `npx vite build 2>&1 | tail -3`
- [ ] Precommit passes: `npm run precommit`
