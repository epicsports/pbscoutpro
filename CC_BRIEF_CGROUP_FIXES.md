# CC BRIEF: Cleanup Fixes (C Group Audit)
**Priority:** MEDIUM — tech debt cleanup after scouting redesign + architecture refactor
**Run `npm run precommit` before every commit. Push after each part.**

---

## PART 1: TEAM_COLORS Adoption (15 min)

**File:** `src/pages/MatchPage.jsx`

`TEAM_COLORS` is defined in theme.js but MatchPage still hardcodes `'#ef4444'`, `'#3b82f6'`, `'#60a5fa'`, `'#f87171'`.

**Step 1:** Add import:
```javascript
import { COLORS, FONT, TOUCH, TEAM_COLORS, responsive } from '../utils/theme';
```

**Step 2:** Add derived team colors to theme.js if missing:
```javascript
// In theme.js, expand TEAM_COLORS:
export const TEAM_COLORS = {
  A: '#ef4444',       // home — red
  B: '#3b82f6',       // away — blue
  A_light: '#f87171', // home opponent indicator — lighter red
  B_light: '#60a5fa', // away opponent indicator — lighter blue
};
```

**Step 3:** In MatchPage, replace ALL hardcoded team color references:

```javascript
// FIND and REPLACE patterns:
'#ef4444'  →  TEAM_COLORS.A
'#3b82f6'  →  TEAM_COLORS.B
'#60a5fa'  →  TEAM_COLORS.B_light
'#f87171'  →  TEAM_COLORS.A_light

// Side picker:
{ side: 'home', team: teamA, color: TEAM_COLORS.A },
{ side: 'away', team: teamB, color: TEAM_COLORS.B },

// Opponent color:
opponentColor={activeTeam==='A' ? TEAM_COLORS.B_light : TEAM_COLORS.A_light}

// Context bar:
background: TEAM_COLORS[activeTeam] + '18',
color: TEAM_COLORS[activeTeam],

// Switch button:
const oppColor = TEAM_COLORS[activeTeam === 'A' ? 'B' : 'A'];
```

**DO NOT replace** semantic colors like `'#22c55e'` (green/success) or toolbar action colors (`'#60a5fa'` for Assign button) — those are UI semantic, not team-related.

**Verify:**
```bash
grep -n "'#ef4444'\|'#3b82f6'" src/pages/MatchPage.jsx
# Should return ZERO lines (only TEAM_COLORS references)
# Exception: '#ef4444' in DANGER zone badge is semantic, not team — leave it
```

---

## PART 2: FieldCanvas Touch Handler Extraction (45 min)

**Goal:** Extract ~250 lines of touch handling from FieldCanvas.jsx into `src/components/field/touchHandler.js`.

**Create `src/components/field/touchHandler.js`:**

Export a factory function that creates event handlers:
```javascript
/**
 * Creates touch event handlers for FieldCanvas.
 * Returns { handleDown, handleMove, handleUp } functions
 * that process pointer events on the canvas.
 */
export function createTouchHandler(opts) {
  // opts contains all refs, state, callbacks needed
  const {
    canvasRef, getCanvasSize, getZoom, getPan, setZoom, setPan,
    getPlayers, getDragging, setDragging,
    getActiveTouchPos, setActiveTouchPos,
    // Player interactions
    onPlacePlayer, onMovePlayer, onBumpPlayer, onSelectPlayer,
    onPlaceShot, onDeleteShot, onBumpStop,
    // Toolbar
    getToolbarPlayer, getToolbarItems, onToolbarAction,
    // Bunker/zone edit
    getLayoutEditMode, onBunkerPlace, onBunkerMove, onBunkerDelete,
    onZonePoint,
    // Calibration
    getCalibrationMode, getCalibrationData, onCalibrationMove,
    // Visibility
    getShowVisibility, onVisibilityTap,
    // Counter
    getCounterDrawMode, onCounterPath,
    // Mode
    getEditable, getMode,
    // Refs
    longPressTimer, longPressPos, didLongPress,
    dragStartRef, pinchRef, calDragRef,
    lastTapRef,
  } = opts;

  // ... move ALL handleStart/handleMove/handleEnd logic here
  // Use getter functions (getPlayers(), getZoom()) instead of direct state access
  // because this runs outside React's render cycle

  return { handleDown, handleMove, handleUp };
}
```

**Key pattern:** Since touch handler needs current state but runs outside React render, pass getter functions:
```javascript
// In FieldCanvas.jsx:
const handler = useMemo(() => createTouchHandler({
  canvasRef,
  getCanvasSize: () => canvasSize,
  getZoom: () => zoom,
  getPan: () => pan,
  // ... etc
}), []); // stable reference — getters close over refs
```

Actually, simpler approach — use refs for all mutable state that touch handler reads:
```javascript
// In FieldCanvas.jsx:
const stateRef = useRef({});
stateRef.current = { canvasSize, zoom, pan, players, toolbarPlayer, toolbarItems, ... };

const handler = useMemo(() => createTouchHandler({
  canvasRef, stateRef,
  setZoom, setPan, setDragging, setActiveTouchPos,
  onPlacePlayer, onMovePlayer, onBumpPlayer, onSelectPlayer,
  // ... all callbacks (stable via useCallback or props)
  longPressTimer, longPressPos, didLongPress,
  dragStartRef, pinchRef, calDragRef, lastTapRef,
}), []); // truly stable
```

**In touchHandler.js, read state via:**
```javascript
const { canvasSize, zoom, pan, players } = opts.stateRef.current;
```

**Steps:**
1. Create `touchHandler.js` with `createTouchHandler()`
2. Move ALL touch logic from FieldCanvas (handleStart, handleMove, handleEnd, getRelPos, findPlayerAt)
3. In FieldCanvas, create stateRef pattern + use handler
4. Verify: all touch interactions still work (tap, drag, pinch, long-press, toolbar tap, bunker drag, calibration drag, zone point)

**Target: FieldCanvas.jsx should drop from 541 to ~280 lines.**

---

## PART 3: Polish Comments + Last Polish UI String (10 min)

### UI String
**App.jsx line 31:**
```javascript
// REPLACE:
if (loading) return <Loading text="Sprawdzanie sesji..." />;
// WITH:
if (loading) return <Loading text="Checking session..." />;
```

### Comments — translate these:
**FieldView.jsx line 10:**
```
heatmapa pozycji/strzałów/przycup → position/shot/bump heatmap
```

**HeatmapCanvas.jsx:**
```
line 89: Kropki pozycji → Position dots
line 95: Warstwa 2: przycupy (bump stops) — ciemnoniebieski → jasnoniebieski → Layer 2: bump stops — dark blue → light blue
line 107: Romb dla przycup (odróżnienie od kółek pozycji) → Diamond for bump stops (distinct from position circles)
line 116: Strzały: intensywna heatmapa + linie kierunkowe → Shots: intense heatmap + direction lines
```

**MatchPage.jsx:**
```
line 321: Jeśli gracz oczekuje na pozycję docelową po przycupie → If player is awaiting bump destination
line 354: Zapisujemy bump (pozycja startowa przycupy) i czekamy na kliknięcie miejsca docelowego → Save bump (start position) and wait for destination click
line 359: bump.x/y = obecna pozycja gracza (startowa przycupy) → bump.x/y = current player position (bump start)
line 363: czekamy na kliknięcie pozycji docelowej → waiting for destination click
```

**TacticPage.jsx:**
```
line 266: Jeśli gracz oczekuje na pozycję docelową po przycupie → If player is awaiting bump destination
line 424: Dodaj punkt co min 0.01 (unikaj duplikatów) → Add point every min 0.01 (avoid duplicates)
```

### Verify:
```bash
grep -rn 'przycup\|pozycji\|heatmapa\|czekamy\|Kropki\|Romb\|Strzały\|Sprawdzanie\|Dodaj punkt' src/ --include="*.jsx" --include="*.js" | grep -v node_modules
# Should return ZERO
```

---

## PART 4: Dead Code Removal (5 min)

### Delete unused components:
```bash
rm src/components/ActionBar.jsx
rm src/components/Header.jsx
```

### Remove ActionBar from any remaining imports:
```bash
grep -rn 'ActionBar' src/ --include="*.jsx"
# If any import remains, delete the import line
```

### Verify:
```bash
npm run build  # must pass — no missing imports
```

---

## PART 5: Remaining Lint Warnings (10 min)

Fix these specific warnings from `npm run lint:ui`:

**1. Raw range slider → `<Slider>`:**
- `src/components/BunkerCard.jsx:193`
- `src/pages/LayoutDetailPage.jsx:390`

Replace `<input type="range">` with `<Slider>` from ui.jsx. Import if needed.

**2. Raw textarea → `<TextArea>`:**
- `src/components/PlayerEditModal.jsx:127`

Replace `<textarea>` with `<TextArea>` from ui.jsx.

**3. Touch target too small:**
- `src/pages/TeamDetailPage.jsx:102` — `minHeight: 24px` → `minHeight: 36px`

**4. Sticky without zIndex:**
- `src/pages/ScoutedTeamPage.jsx:241` — add `zIndex: 20`

### Verify:
```bash
node scripts/lint-ui.js 2>&1 | grep "WARNINGS"
# Should show fewer warnings (ideally < 10)
```

---

## EXECUTION ORDER
1. Part 3 — Polish strings (quick, no risk)
2. Part 4 — Dead code removal (quick, no risk)
3. Part 5 — Lint warnings (quick, low risk)
4. Part 1 — TEAM_COLORS adoption (medium, search-replace)
5. Part 2 — Touch handler extraction (largest, most risk)

Push after each part. After Part 2, verify:
- MatchPage: tap to place, tap for toolbar, drag to move/bump, pinch zoom
- LayoutDetailPage: bunker drag, calibration drag, zone point placement
- TacticPage: player placement, shot placement, freehand drawing

---

## FINAL VERIFICATION
```bash
npm run build                    # zero errors
npm run precommit                # green
node scripts/lint-ui.js          # < 10 warnings
wc -l src/components/FieldCanvas.jsx  # < 300 lines
grep -rn "'#ef4444'\|'#3b82f6'" src/pages/MatchPage.jsx  # zero (except semantic)
grep -rn 'przycup\|pozycji\|Sprawdzanie' src/  # zero
ls src/components/ActionBar.jsx src/components/Header.jsx 2>&1 | grep 'No such file'  # both deleted
```
