# CC BRIEF: Architecture Cleanup + Component Decomposition
**Priority:** HIGH — do BEFORE any new features
**Run `npm run precommit` before every commit. Push after each part.**

---

## PART A: Remove FieldEditor from MatchPage (30 min)

### What
MatchPage editor view must use FieldCanvas directly, not FieldEditor.
Visibility, counter-play, freehand drawing are REMOVED from editor view.
They belong in analytics/analysis section (future work).

### Steps

**1. In MatchPage.jsx, DELETE these imports:**
```
import FieldEditor from '../components/FieldEditor';
```

**2. DELETE all visibility/counter/freehand state and logic:**
```javascript
// DELETE these state variables:
const [showVisibility, setShowVisibility] = useState(false);
const [stanceOverride, setStanceOverride] = useState(null);
const [showCounter, setShowCounter] = useState(false);
const [counterMode, setCounterMode] = useState('idle');
const [counterPath, setCounterPath] = useState(null);
const [selectedCounterBunkerId, setSelectedCounterBunkerId] = useState(null);
const [freehandOn, setFreehandOn] = useState(false);

// DELETE these refs:
const freehandCanvasRef = useRef(null);
const counterCanvasRef = useRef(null);
const isDrawingFH = useRef(false);
const currentStrokeFH = useRef([]);
const strokesRef = useRef([]);
const counterContainerRef = useRef(null);

// DELETE the entire useVisibility hook usage:
const vis = useVisibility(...);

// DELETE all functions:
// getFreehandPos, drawFreehand, startCounterDraw, moveCounterDraw, endCounterDraw

// DELETE import:
import { useVisibilityPage as useVisibility } from '../hooks/useVisibility';
```

**3. Replace `<FieldEditor>...<FieldCanvas>...</FieldEditor>` with just `<FieldCanvas>`:**

Find the block (~line 641-694):
```jsx
<FieldEditor
  hasBunkers={false} hasZones={false} ...
>
  <FieldCanvas ... />
</FieldEditor>
```

Replace with JUST the FieldCanvas, adding the props that FieldEditor was injecting:
```jsx
<FieldCanvas fieldImage={field.fieldImage} viewportSide={fieldSide}
  players={draft.players} shots={draft.shots} bumpStops={draft.bumps}
  eliminations={draft.elim} eliminationPositions={draft.elimPos}
  onPlacePlayer={handlePlacePlayer} onMovePlayer={handleMovePlayer}
  onPlaceShot={handlePlaceShot} onDeleteShot={handleDeleteShot}
  onBumpStop={handleBumpStop} onSelectPlayer={handleSelectPlayer}
  onBumpPlayer={(idx, fromPos) => {
    pushUndo();
    setDraft(prev => {
      const n = { ...prev, bumps: [...prev.bumps] };
      n.bumps[idx] = { x: fromPos.x, y: fromPos.y };
      return n;
    });
  }}
  editable selectedPlayer={selPlayer}
  mode={shotMode !== null ? 'shoot' : 'place'}
  toolbarPlayer={toolbarPlayer} toolbarItems={toolbarItems}
  onToolbarAction={handleToolbarAction}
  playerAssignments={draft.assign} rosterPlayers={roster}
  opponentPlayers={showOpponent ? mirroredOpp : undefined}
  opponentEliminations={showOpponent ? mirroredOppElim : []}
  opponentAssignments={activeTeam==='A' ? draftB.assign : draftA.assign}
  opponentRosterPlayers={activeTeam==='A' ? rosterB : rosterA}
  showOpponentLayer={showOpponent}
  opponentColor={activeTeam==='A' ? '#60a5fa' : '#f87171'}
  discoLine={field.discoLine || 0}
  zeekerLine={field.zeekerLine || 0}
  bunkers={field.bunkers || []}
  showBunkers={true}
  dangerZone={field.dangerZone} sajgonZone={field.sajgonZone}
  showZones={true}
  fieldCalibration={field.fieldCalibration}
/>
```

**4. DELETE the freehand canvas overlay, counter canvas overlay, stance selector, counter mode controls, counter results panel** — all the JSX below FieldCanvas that was inside the FieldEditor wrapper. These are approximately lines 695-800 in current file.

**5. DELETE remaining unused state:**
```javascript
// If these are now unused after removing counter/visibility:
const [showBunkers, setShowBunkers] = useState(false);  // → always true now
const [showLines, setShowLines] = useState(false);       // → always true now  
const [showZones, setShowZones] = useState(false);       // → always true now
```

**6. Verify:**
```bash
npm run build  # zero errors — no unused imports
grep -n 'FieldEditor\|freehand\|counterMode\|showVisibility\|stanceOverride' src/pages/MatchPage.jsx
# Should return ZERO lines (except possibly comments)
```

---

## PART B: Fix Raw confirm() (5 min)

**File:** `src/pages/MatchPage.jsx`

Find line with `if (confirm('Close this match?...`:
```javascript
// REPLACE:
if (confirm('Close this match? It will be marked as FINAL.')) {
  await ds.updateMatch(tournamentId, matchId, { status: 'closed' });
}

// WITH (use existing closeConfirm):
const closeConfirm = useConfirm(); // add to state section

// In handler:
const ok = await closeConfirm.ask();
if (ok) {
  await ds.updateMatch(tournamentId, matchId, { status: 'closed' });
}

// In render, add:
<ConfirmModal {...closeConfirm.modalProps()}
  title="Close match"
  message="Mark this match as FINAL? Score will be locked."
  confirmLabel="Close match"
/>
```

---

## PART C: Fix Polish Strings (5 min)

**1. LoginGate.jsx line 87:**
```javascript
// REPLACE:
{loading ? '⏳ Wczytywanie...' : '→ Enter'}
// WITH:
{loading ? '⏳ Loading...' : '→ Enter'}
```

**2. Polish comments in code — translate these:**
- `FieldCanvas.jsx:356` — "przycupy" → "bump stops"
- `FieldView.jsx:10` — "heatmapa pozycji/strzałów/przycup" → "position/shot/bump heatmap"
- `HeatmapCanvas.jsx:89` — "Kropki pozycji" → "Position dots"
- `HeatmapCanvas.jsx:107` — "Romb dla przycup" → "Diamond for bump stops"
- `MatchPage.jsx:449` — "czekamy na kliknięcie" → "waiting for destination click"
- `MatchPage.jsx:761` — "pozycji" → "positions"

---

## PART D: Shared Utilities (15 min)

### D1. `mirrorPointsToLeft()` in helpers.js

Currently duplicated in MatchPage and ScoutedTeamPage. Extract:

```javascript
// In src/utils/helpers.js — ADD:

/**
 * Mirror a position from right side to left (flip X axis).
 * Used for heatmap aggregation — all points shown from left perspective.
 */
export function mirrorPos(pos) {
  if (!pos) return pos;
  return { ...pos, x: 1 - pos.x };
}

/**
 * Mirror all player positions and shots in a point to LEFT side.
 * Points with fieldSide='right' get mirrored; 'left' or undefined stay as-is.
 */
export function mirrorPointToLeft(pointData, fieldSide) {
  if (!pointData || fieldSide === 'left' || !fieldSide) return pointData;
  return {
    ...pointData,
    players: (pointData.players || []).map(p => p ? mirrorPos(p) : null),
    shots: (pointData.shots || []).map(
      shotArr => Array.isArray(shotArr) ? shotArr.map(s => s ? mirrorPos(s) : null) : shotArr
    ),
    bumpStops: (pointData.bumpStops || []).map(b => b ? mirrorPos(b) : null),
    eliminationPositions: (pointData.eliminationPositions || []).map(p => p ? mirrorPos(p) : null),
  };
}
```

### D2. Update MatchPage to use it
Replace inline mirroring in `getHeatmapPoints()` / `getAggregatedHeatmapPoints()` with:
```javascript
import { mirrorPointToLeft } from '../utils/helpers';
// ...
const mirrored = mirrorPointToLeft(data, pt.fieldSide);
```

### D3. Update ScoutedTeamPage to use it
Replace inline mirroring with same import.

---

## PART E: Team Colors in Theme (5 min)

**File:** `src/utils/theme.js` — ADD:
```javascript
export const TEAM_COLORS = {
  A: '#ef4444',  // red — home team
  B: '#3b82f6',  // blue — away team
};
```

**Then in MatchPage**, replace all:
```javascript
// REPLACE:
const teamColor = activeTeam === 'A' ? '#ef4444' : '#3b82f6';
// WITH:
import { TEAM_COLORS } from '../utils/theme';
const teamColor = TEAM_COLORS[activeTeam];
```

Also replace hardcoded `'#ef4444'` / `'#3b82f6'` / `'#60a5fa'` / `'#f87171'` team color references in MatchPage with `TEAM_COLORS.A` / `TEAM_COLORS.B` where appropriate.

---

## PART F: FieldCanvas Decomposition (60 min) ⚠️ LARGEST PART

### Goal
Split 1093-line FieldCanvas.jsx into focused modules.
FieldCanvas.jsx becomes a thin orchestrator that imports layers.

### New file structure:
```
src/components/
  FieldCanvas.jsx          — orchestrator (props, state, touch handling, compose layers)
  field/
    drawField.js           — field image, grid, center line, base line, fade gradient
    drawBunkers.js         — bunker shapes + labels
    drawZones.js           — danger/sajgon zones, disco/zeeker lines
    drawPlayers.js         — player dots, labels, elim X, shot badges, bump arrows
    drawToolbar.js         — inline toolbar rendering
    drawCalibration.js     — calibration markers
    drawLoupe.js           — magnifying loupe
    drawAnalytics.js       — visibility heatmap, counter heatmap, enemy path (for TacticPage/LayoutPage)
    touchHandler.js        — touch event processing (tap, drag, pinch, long-press)
```

### How each module works

Each draw module exports a function:
```javascript
// Example: src/components/field/drawPlayers.js
import { COLORS, FONT, TOUCH } from '../../utils/theme';

/**
 * Draw players on field canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - canvas CSS width
 * @param {number} h - canvas CSS height
 * @param {object} opts - all player-related props
 */
export function drawPlayers(ctx, w, h, {
  players, eliminations, eliminationPositions,
  playerAssignments, rosterPlayers, playerColors,
  selectedPlayer, bumpStops, shots,
  opponentPlayers, opponentEliminations, showOpponentLayer, opponentColor,
  opponentAssignments, opponentRosterPlayers,
}) {
  const pr = Math.max(17, w * 0.044);
  // ... all player drawing logic moved here
}
```

### FieldCanvas.jsx becomes:
```javascript
import { drawField } from './field/drawField';
import { drawBunkers } from './field/drawBunkers';
import { drawZones } from './field/drawZones';
import { drawPlayers } from './field/drawPlayers';
import { drawToolbar } from './field/drawToolbar';
import { drawCalibration } from './field/drawCalibration';
import { drawLoupe } from './field/drawLoupe';
import { drawAnalytics } from './field/drawAnalytics';
import { createTouchHandler } from './field/touchHandler';

export default function FieldCanvas(props) {
  // ... state (zoom, pan, canvas size, imgObj, dragging, etc.)

  // Draw effect
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = canvasSize;
    canvas.width = w * 2; canvas.height = h * 2;
    ctx.scale(2, 2);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Layer order matters!
    drawField(ctx, w, h, { imgObj, viewportSide });
    drawZones(ctx, w, h, { dangerZone, sajgonZone, showZones, discoLine, zeekerLine,
      editDangerPoints, editSajgonPoints });
    drawBunkers(ctx, w, h, { bunkers, showBunkers, selectedBunkerId, viewportSide });
    drawAnalytics(ctx, w, h, { visibilityData, showVisibility, counterData, showCounter,
      enemyPath, selectedCounterBunkerId, counterDrawMode, counterDraft,
      fieldCalibration });
    drawPlayers(ctx, w, h, { players, eliminations, eliminationPositions,
      playerAssignments, rosterPlayers, selectedPlayer, bumpStops, shots,
      opponentPlayers, opponentEliminations, showOpponentLayer, opponentColor,
      opponentAssignments, opponentRosterPlayers });
    if (pendingBunkerPos) drawPendingBunker(ctx, w, h, pendingBunkerPos);
    drawToolbar(ctx, w, h, { toolbarPlayer, toolbarItems, players });
    drawCalibration(ctx, w, h, { calibrationMode, calibrationData });

    ctx.restore();
    // Loupe draws OUTSIDE pan/zoom transform
    drawLoupe(ctx, w, h, { activeTouchPos, loupeSourceRef, canvas, editable: editable || layoutEditMode });

  }, [/* all deps */]);

  // Touch handling
  useEffect(() => {
    const handler = createTouchHandler({
      canvasRef, canvasSize, zoom, pan, setZoom, setPan,
      players, onPlacePlayer, onMovePlayer, onBumpPlayer, onSelectPlayer,
      onPlaceShot, onDeleteShot,
      toolbarPlayer, toolbarItems, onToolbarAction,
      bunkers, layoutEditMode, onBunkerPlace, onBunkerMove,
      calibrationMode, calibrationData, onCalibrationMove,
      onZonePoint, editable, mode,
      setActiveTouchPos, setDragging,
      longPressTimer, longPressPos, didLongPress,
      dragStartRef,
    });
    const el = canvasRef.current;
    el.addEventListener('pointerdown', handler.down);
    el.addEventListener('pointermove', handler.move);
    el.addEventListener('pointerup', handler.up);
    return () => {
      el.removeEventListener('pointerdown', handler.down);
      el.removeEventListener('pointermove', handler.move);
      el.removeEventListener('pointerup', handler.up);
    };
  }, [/* touch deps */]);

  return (
    <div ref={containerRef} style={{ position: 'relative', touchAction: 'none' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: canvasSize.h }} />
    </div>
  );
}
```

### Extraction order (do one at a time, verify build after each):
1. `drawField.js` — extract field background, grid, center line, base, fade
2. `drawBunkers.js` — extract bunker shape rendering + labels
3. `drawZones.js` — extract zone polygons + disco/zeeker lines
4. `drawPlayers.js` — extract player dots, labels, elim, bumps, shot badges, opponent layer
5. `drawToolbar.js` — extract inline toolbar rendering
6. `drawCalibration.js` — extract calibration markers
7. `drawLoupe.js` — extract loupe rendering
8. `drawAnalytics.js` — extract visibility heatmap, counter heatmap, enemy path
9. `touchHandler.js` — extract touch event processing (LAST — most complex)

**After each extraction:**
```bash
npm run build   # must pass
# Visually verify: does LayoutDetailPage still render bunkers?
# Does TacticPage still draw players?
# Does MatchPage toolbar still work?
```

### CRITICAL: Don't change any behavior!
This is a PURE REFACTOR. Zero behavior changes. Same pixels on screen.
Every function signature gets the data it needs via params, not via closure.

---

## PART G: usePlayerEditor Hook (30 min)

### Goal
Extract shared player editing logic from MatchPage into a reusable hook.
TacticPage can adopt it later.

**Create `src/hooks/usePlayerEditor.js`:**
```javascript
import { useState, useCallback, useRef } from 'react';

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];
const E5B = () => [false, false, false, false, false];

export function usePlayerEditor({ undoStack } = {}) {
  const [players, setPlayers] = useState(E5());
  const [assign, setAssign] = useState(E5());
  const [elim, setElim] = useState(E5B());
  const [elimPos, setElimPos] = useState(E5());
  const [shots, setShots] = useState(E5A());
  const [bumps, setBumps] = useState(E5());
  const [penalty, setPenalty] = useState('');

  const getDraft = () => ({ players, shots, assign, bumps, elim, elimPos, penalty });

  const setDraft = (updater) => {
    const prev = getDraft();
    const next = typeof updater === 'function' ? updater(prev) : updater;
    setPlayers(next.players);
    setAssign(next.assign);
    setElim(next.elim);
    setElimPos(next.elimPos);
    setShots(next.shots);
    setBumps(next.bumps);
    if (next.penalty !== undefined) setPenalty(next.penalty);
  };

  const placePlayer = useCallback((idx, pos) => {
    setPlayers(prev => { const n = [...prev]; n[idx] = pos; return n; });
  }, []);

  const movePlayer = useCallback((idx, pos) => {
    setPlayers(prev => { const n = [...prev]; n[idx] = pos; return n; });
  }, []);

  const removePlayer = useCallback((idx) => {
    setPlayers(prev => { const n = [...prev]; n[idx] = null; return n; });
    setShots(prev => { const n = [...prev]; n[idx] = []; return n; });
    setElim(prev => { const n = [...prev]; n[idx] = false; return n; });
    setAssign(prev => { const n = [...prev]; n[idx] = null; return n; });
    setBumps(prev => { const n = [...prev]; n[idx] = null; return n; });
  }, []);

  const toggleElim = useCallback((idx) => {
    setElim(prev => { const n = [...prev]; n[idx] = !n[idx]; return n; });
  }, []);

  const addShot = useCallback((playerIdx, pos) => {
    setShots(prev => { const n = [...prev]; n[playerIdx] = [...(n[playerIdx] || []), pos]; return n; });
  }, []);

  const removeLastShot = useCallback((playerIdx) => {
    setShots(prev => { const n = [...prev]; n[playerIdx] = (n[playerIdx] || []).slice(0, -1); return n; });
  }, []);

  const setBump = useCallback((idx, fromPos) => {
    setBumps(prev => { const n = [...prev]; n[idx] = fromPos; return n; });
  }, []);

  const assignPlayer = useCallback((slotIdx, rosterId) => {
    setAssign(prev => { const n = [...prev]; n[slotIdx] = rosterId; return n; });
  }, []);

  const swapAssign = useCallback((slotA, slotB) => {
    setAssign(prev => {
      const n = [...prev];
      const tmp = n[slotA]; n[slotA] = n[slotB]; n[slotB] = tmp;
      return n;
    });
  }, []);

  const reset = useCallback(() => {
    setPlayers(E5()); setAssign(E5()); setElim(E5B());
    setElimPos(E5()); setShots(E5A()); setBumps(E5()); setPenalty('');
  }, []);

  const placedCount = players.filter(Boolean).length;
  const nextEmptySlot = players.findIndex(p => p === null);

  return {
    players, assign, elim, elimPos, shots, bumps, penalty,
    getDraft, setDraft,
    placePlayer, movePlayer, removePlayer,
    toggleElim, addShot, removeLastShot, setBump,
    assignPlayer, swapAssign, reset,
    placedCount, nextEmptySlot,
  };
}
```

### Usage in MatchPage (adopt gradually)
Don't rewrite MatchPage to use this hook in this brief — just create the hook.
MatchPage adoption is a separate task. The hook exists and is tested.

---

## EXECUTION ORDER
1. **Part A** — Remove FieldEditor from MatchPage → push
2. **Part B** — Fix raw confirm() → push
3. **Part C** — Fix Polish strings → push
4. **Part D** — Shared utilities (mirrorPointToLeft, update consumers) → push
5. **Part E** — TEAM_COLORS in theme → push
6. **Part F** — FieldCanvas decomposition (do sub-steps F1-F9, push after each) → push ×9
7. **Part G** — usePlayerEditor hook → push

After ALL parts:
```bash
npm run build
npm run precommit
grep -rn 'FieldEditor' src/pages/MatchPage.jsx  # must be empty
grep -rn "confirm(" src/pages/MatchPage.jsx      # must be empty  
grep -rn 'Wczytywanie' src/                      # must be empty
grep -rn 'mirrorPos\|mirrorIfNeeded' src/pages/  # should use mirrorPointToLeft from helpers
```

---

## TESTING CHECKLIST
- [ ] MatchPage editor: no toggle buttons (bunkers/zones/lines always visible)
- [ ] MatchPage editor: no visibility heatmap, no counter-play, no freehand
- [ ] MatchPage editor: FieldCanvas renders directly (no FieldEditor wrapper)
- [ ] MatchPage: "Close match" uses ConfirmModal (not browser confirm)
- [ ] LoginGate: "Loading..." not "Wczytywanie..."
- [ ] No Polish comments in FieldCanvas, FieldView, HeatmapCanvas, MatchPage
- [ ] mirrorPointToLeft used in both MatchPage and ScoutedTeamPage
- [ ] TEAM_COLORS used in MatchPage (no hardcoded #ef4444/#3b82f6)
- [ ] FieldCanvas.jsx < 300 lines (orchestrator only)
- [ ] All draw modules in src/components/field/
- [ ] LayoutDetailPage still renders correctly
- [ ] TacticPage still renders correctly (uses FieldEditor — unchanged)
- [ ] TournamentPage still renders correctly
- [ ] usePlayerEditor hook exists and exports all methods
- [ ] npm run precommit green
