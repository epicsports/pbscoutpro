# HALF-FIELD SCOUTING MODEL — Architecture Spec
**Author:** Opus (architecture) + Jacek (domain)
**Status:** SPEC — needs Jacek approval before CC implements
**Impact:** Fundamental change to FieldCanvas viewport + MatchPage flow

---

## Context

In xball paintball, a scout watches an opponent's match and records breakouts (rosbiegi).
Teams swap sides every point: left, right, left, right.
The scout cares about ONE team — where their players run to on each breakout.
At the end, all breakouts must be collapsed to ONE side for the heatmap.

The field is symmetric along the X axis (left-right mirror).
Currently we show the full field and the scout places players on both sides.
This wastes screen space and creates confusion about which side to place on.

---

## New Model

### Viewport: 60% of field from scouted team's base

Instead of showing the full 150ft field, show 60% from the base of the scouted team.
- If team starts LEFT: show x=0.0 to x=0.6 (base to just past midfield)
- If team starts RIGHT: show x=0.4 to x=1.0 (same, mirrored)

Canvas crops the field image to this viewport. Bunker labels, lines, zones —
everything clips to this 60% window.

**Implementation in FieldCanvas:**
```
New props:
  viewportSide: null | 'left' | 'right'  (null = full field, default)

When viewportSide is set:
  - left:  drawImage source rect = 0% to 60% of image width
  - right: drawImage source rect = 40% to 100% of image width

All coordinate input/output stays normalized 0-1 on the FULL field.
The canvas just zooms into the relevant 60%.

Coordinate transform:
  // Canvas pixel → field normalized
  if (viewportSide === 'left')  fieldX = canvasX / canvasW * 0.6
  if (viewportSide === 'right') fieldX = 0.4 + canvasX / canvasW * 0.6
  
  // Field normalized → canvas pixel
  if (viewportSide === 'left')  canvasX = fieldX / 0.6 * canvasW
  if (viewportSide === 'right') canvasX = (fieldX - 0.4) / 0.6 * canvasW
  
  // Y is unchanged (full height always)
```

### Side flipping per point

**State in MatchPage:**
```javascript
const [fieldSide, setFieldSide] = useState('left'); // which side scouted team starts from
```

**After saving a point:**
BottomSheet asks: "Side change?" with two buttons:
- **Yes, swap** → `setFieldSide(prev => prev === 'left' ? 'right' : 'left')`
- **No, same side** → keep current (for open points, overtime)

Plus a manual flip button in the header or toolbar — small toggle icon ⇄.

### Data storage — always store in full-field coordinates

Points store player positions in full-field normalized coords (0-1) as they do now.
The viewport is purely a display concern. No data model changes needed.

### Heatmap aggregation — collapse to one side

When building the heatmap, mirror all points to one side:
```javascript
function normalizeToLeft(point, pointFieldSide) {
  if (pointFieldSide === 'right') {
    return { ...point, x: 1 - point.x }; // mirror X
  }
  return point;
}
```

Each point in Firestore gets a new field: `fieldSide: 'left' | 'right'`
to record which side the scouted team started from.

---

## Shot View — Field Flip + Telebim

### Problem
Shots go to the OPPOSITE side of the field from where players are.
If I'm viewing the left 60% (breakout side), my shots land on the right 60%.

### Solution: Flip to shot side + telebim inset

When mode switches to 'shoot':
1. Canvas flips to the OPPOSITE 60%: if viewing left, flip to right
2. A small "telebim" inset appears in the corner showing the player's position
   from the breakout side — so you know WHICH player's shots you're placing
3. Tap on the flipped field to place shot positions

When mode switches back to 'place':
1. Canvas flips back to the breakout side
2. Telebim disappears

### Telebim spec

```
┌──────────────────────────────────────┐
│                                      │
│    SHOT SIDE (opposite 60%)          │
│                                      │
│    Tap here to place shots           │
│                                      │
│  ┌─────────┐                         │
│  │ TELEBIM │ ← shows breakout side   │
│  │ P3 ●    │    with selected player │
│  │ #86     │    highlighted          │
│  └─────────┘                         │
│                                      │
└──────────────────────────────────────┘
```

**Telebim details:**
- Size: ~25% of canvas width, ~30% of canvas height
- Position: bottom-left corner of canvas (or bottom-right for left-handed)
- Shows: the breakout-side 60% of field, miniaturized
- Highlights: the selected player with pulsing circle
- Shows existing shots as lines from player to shot position (across the midfield)
- Semi-transparent background, 1px amber border, rounded corners
- Only visible when a player is selected AND mode is 'shoot'
- Also shows in reverse: when on breakout side, and player has shots,
  show telebim of shot positions on the opposite side

### Shot lines (connecting player to shot target)

On the breakout side, if a player has shots recorded:
- Draw thin dashed lines from the player position toward the edge of the viewport
  (they extend beyond the visible 60% toward the shot targets)
- The actual shot positions are on the other side — shown in telebim

On the shot side, when placing shots:
- Draw lines from the edge of viewport (representing the player's approximate
  direction) to the placed shot positions

---

## UI Changes in MatchPage

### Header
```
┌──────────────────────────────────────────┐
│ ← Cup   Scouting RING Warsaw    [LIVE]  │
│          vs VIKINGS · Pt 2 · 1:0    ⇄   │
└──────────────────────────────────────────┘
```
- Large title: "Scouting {team name}"
- Subtitle: opponent, point number, score
- ⇄ button: manual side flip
- [LIVE] / [FINAL] badge for match state

### Side indicator
Below header, thin colored bar:
```
┌──────────────────────────────────────────┐
│ ◀ LEFT SIDE                      60%    │
└──────────────────────────────────────────┘
```
Changes color/direction when flipped. Subtle but always visible.

### ActionBar changes
```
┌───────────┬───────────┬───────────┬───────────┐
│  📍 Place │  💀 Hit   │  🔫 Shot  │   ✓ OK    │
└───────────┴───────────┴───────────┴───────────┘
```
- 📷 → 🔫 (shot icon change per Jacek's request)
- 4 main buttons (bump + undo are secondary, accessed via long-press or gesture)
- Bigger padding: `padding: 12px 0`, `fontSize: 13px`
- When Shot is active, canvas auto-flips to opposite side

### After "OK" → Save BottomSheet
```
┌──────────────────────────────────────────┐
│  ─── (handle)                            │
│                                          │
│  Point outcome                           │
│  [✅ RING W]  [✅ VIKING]  [⏱ T/O]      │
│                                          │
│  Side change next point?                 │
│  [Yes, swap sides]  [No, same side]      │
│                                          │
│  [+ More options]                        │
│  [✓ SAVE POINT]                          │
└──────────────────────────────────────────┘
```

### Match state: open vs closed (p6)

**Firestore:** `match.status: 'open' | 'closed'` (default 'open')

**Open match:**
- Side picker → scouting editor
- ADD POINT button visible
- Points are editable/deletable
- Header shows [LIVE] badge

**Closed match:**
- No side picker — goes straight to results view
- Large final score centered
- Aggregated heatmap (all points collapsed to one side)
- Points list read-only (no delete, no edit)
- Header shows [FINAL] badge
- "Reopen" option in menu for corrections

**Close match action:**
- Button in save BottomSheet after last point: "Close match"
- Or in match menu (⋯ in header)
- Confirmation modal: "Close match? Score will be marked as final."

---

## Loupe fix (p4)

### Current
Loupe always above finger. If near top of canvas, it goes off-screen (negative Y).

### Fix
```javascript
// After calculating default position (above finger):
let lx = tx + offsetX;
let ly = ty - loupeR - gap;

// If loupe would go above canvas, move BELOW finger instead
if (ly - loupeR < 0) {
  ly = ty + loupeR + gap; // below finger
}

// Keep horizontal clamping as-is
if (lx - loupeR < 0) lx = loupeR;
if (lx + loupeR > w) lx = w - loupeR;
```

---

## Navigation fix (p3)

### Current
All navigate() calls use explicit paths — no history.back().
This should be correct (always goes to parent, not browser history).

### Verify
Check that MatchPage back button goes to `/tournament/{id}`, not to the previous
browser history entry. Same for all other pages. PageHeader already does this:
```jsx
back={{ to: `/tournament/${tournamentId}` }}
```

If user reports "goes back multiple levels", the issue might be:
- Side picker renders, user clicks back → goes to tournament (correct)
- But then tournament page might re-navigate somewhere?
- Or: user opened match from a deep link and back goes to wrong place?

**Action:** Add `replace: true` to the side claim navigation if needed,
so the side picker doesn't create an extra history entry.

---

## ActionBar icon size (p7)

### Current
`fontSize: TOUCH.fontXs` (11px), icons 14px.

### Fix in ActionBar.jsx
```javascript
// Change:
fontSize: TOUCH.fontXs → fontSize: TOUCH.fontSm (12px)
// Icon:
fontSize: 14 → fontSize: 18
// Padding:
padding: '0 8px' → padding: '4px 0'
// MinHeight stays 44px
// Reduce to 4 main buttons: Place, Hit, Shot, OK
// Bump + Undo become secondary (long-press on player chip, or small icons)
```

---

## Implementation phases

### Phase 1 — Quick fixes (p3, p4, p7) — CC can do now
- Loupe fallback below finger when near top
- Verify navigation targets
- ActionBar bigger icons + font
- Shot icon 📷 → 🔫
- Match status field (open/closed) + UI

### Phase 2 — Half-field viewport — needs FieldCanvas changes
- New `viewportSide` prop on FieldCanvas
- Coordinate transforms for 60% viewport
- Side flip state + toggle in MatchPage
- Side change prompt in save BottomSheet
- `fieldSide` field on point data

### Phase 3 — Shot flip + telebim
- Auto-flip canvas when entering shoot mode
- Telebim inset rendering
- Shot lines connecting player → shot across midfield

### Phase 4 — Heatmap aggregation
- Mirror points to one side based on `fieldSide`
- Aggregated heatmap always shows from one perspective

---

## Open questions for Jacek

1. **60% viewport** — should the crop percentage be adjustable, or fixed at 60%?
2. **Default side** — should first point always start LEFT, or should it match the actual game (HOME team starts from which side)?
3. **Telebim size** — 25% of canvas width OK, or should it be bigger/smaller?
4. **Shot icon** — 🔫 might not render well on all devices. Alternative: 🎯 (target) which we already use? Or a custom SVG crosshair icon?
5. **Second team scouting** — is it a completely separate match entry, or a tab within the same match? If separate, should the app pre-create it when you open the match?
