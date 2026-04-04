# CC SESSION BRIEF: Layout Overhaul + MatchPage Redesign
**Do in order. Push after each section. Run `npm run precommit` before each commit.**

---

# PART A: Dead Zoom Cleanup (15 min)

Remove old toggle-zoom code — pinch-to-zoom replaced it in Session 1.

## A1. FieldEditor.jsx

DELETE these props from the function signature:
```
zoom: zoomProp, onZoom,
showZoom = true,
```

DELETE these state/computed:
```
const [intZoom, setIntZoom] = useState(false);
const zoom = zoomProp !== undefined ? zoomProp : intZoom;
const toggleZoom = () => { ... };
```

DELETE all conditional rendering based on `zoom`:
- `{!zoom && (` toolbar wrapper
- `{zoom && !true /* pan slider ...` block
- Any focus mode floating pills referencing zoom

Keep the toolbar itself — just remove the zoom conditional wrapping it. The toolbar should ALWAYS show (it was hidden during zoom).

DELETE the `pill()` helper function if it was only used for zoom focus mode.

## A2. MatchPage.jsx

DELETE:
- `const [editorZoom, setEditorZoom] = useState(false);`
- All `{!editorZoom && ...}` conditionals (remove the conditional, keep the content inside)
- All `{editorZoom && ...}` blocks (delete entirely — zoom overlay, close button)
- `zoom={editorZoom} onZoom={setEditorZoom}` props on FieldEditor
- `showZoom={false}` prop on FieldEditor

## A3. TacticPage.jsx

DELETE:
- `showLines showZoom` → keep `showLines`, remove `showZoom`

## A4. Verify

After cleanup, grep to confirm zero references remain:
```bash
grep -rn 'editorZoom\|showZoom\|toggleZoom\|intZoom\|onZoom\|zoomProp' src/ | grep -v node_modules
```
Must return EMPTY. Build must pass.

---

# PART B: LayoutDetailPage Overhaul (60 min)

**File:** `src/pages/LayoutDetailPage.jsx` (primary), `src/components/FieldCanvas.jsx` (minor)

## B1. Header — remove bunker count subtitle
**Current:** `subtitle={\`${editBunkers.length} bunkers\`}`
**Fix:** Remove the `subtitle` prop entirely from PageHeader. Just title + badges.

## B2. Merge Lines + Zones into one tab
**Current:** Separate "Lines" and "Zones" tabs in MODES array.
**Target:** One tab called "Lines" with 4 buttons inside.

Update MODES:
```javascript
const MODES = [
  { id: 'preview', icon: '👁', label: 'Preview' },
  { id: 'bunkers', icon: '🏷', label: 'Bunkers' },
  { id: 'lines', icon: '📏', label: 'Lines' },
  { id: 'calibrate', icon: '📐', label: 'Calib.' },
  { id: 'tactics', icon: '⚔️', label: `Tactics (${tactics.length})` },
];
```

New `lines` mode panel replaces both old `lines` and `zones` panels:
```jsx
{activeMode === 'lines' && (
  <div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
      {[
        { id: 'disco', label: '🟠 Disco', color: '#f97316' },
        { id: 'zeeker', label: '🔵 Zeeker', color: '#3b82f6' },
        { id: 'danger', label: '🔴 Danger', color: '#ef4444', isZone: true },
        { id: 'sajgon', label: '🟡 Sajgon', color: '#eab308', isZone: true },
      ].map(item => {
        const isActive = item.isZone
          ? zoneEditMode === item.id
          : lineEditMode === item.id;
        return (
          <Btn key={item.id} variant={isActive ? 'accent' : 'default'} size="sm"
            onClick={() => {
              if (item.isZone) {
                setZoneEditMode(isActive ? null : item.id);
                setLineEditMode(null);
              } else {
                setLineEditMode(isActive ? null : item.id);
                setZoneEditMode(null);
              }
            }}
            style={{ borderColor: isActive ? item.color : undefined }}>
            {item.label}
          </Btn>
        );
      })}
    </div>
    {/* Zone drawing controls */}
    {zoneEditMode && (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
          Tap points on canvas to draw polygon
        </span>
        <Btn size="sm" variant="ghost" onClick={() => {
          if (zoneEditMode === 'danger') setEditDanger(p => p.slice(0,-1));
          else setEditSajgon(p => p.slice(0,-1));
        }}>↩</Btn>
        <Btn size="sm" variant="ghost" onClick={() => {
          if (zoneEditMode === 'danger') setEditDanger([]);
          else setEditSajgon([]);
        }}>🗑</Btn>
      </div>
    )}
    {/* Line slider (keeping sliders for now — tap-to-place is future) */}
    {lineEditMode && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 700,
          color: lineEditMode === 'disco' ? '#f97316' : '#3b82f6', minWidth: 48 }}>
          {lineEditMode === 'disco' ? 'Disco' : 'Zeeker'}
        </span>
        <input type="range"
          min={lineEditMode === 'disco' ? 10 : 50}
          max={lineEditMode === 'disco' ? 50 : 95}
          value={lineEditMode === 'disco' ? disco : zeeker}
          onChange={e => (lineEditMode === 'disco' ? setDisco : setZeeker)(Number(e.target.value))}
          style={{ flex: 1, accentColor: lineEditMode === 'disco' ? '#f97316' : '#3b82f6' }} />
        <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, minWidth: 28 }}>
          {lineEditMode === 'disco' ? disco : zeeker}%
        </span>
      </div>
    )}
  </div>
)}
```

Add state: `const [lineEditMode, setLineEditMode] = useState(null);`
Reset both on mode switch: when `activeMode` changes, set `lineEditMode(null)` and `zoneEditMode(null)`.

DELETE the old separate `{activeMode === 'lines' && ...}` and `{activeMode === 'zones' && ...}` blocks.

Update `canvasEditMode`:
```javascript
const canvasEditMode = activeMode === 'bunkers' ? 'bunker'
  : activeMode === 'lines' && zoneEditMode ? zoneEditMode
  : null;
```

## B3. Calibration — use main FieldCanvas
**Current:** Separate `<img>` + `<svg>` overlay for calibration — tiny, broken.
**Target:** H/A markers rendered on the MAIN FieldCanvas.

DELETE the entire `{activeMode === 'calibrate' && (` block with `<img>`, `<svg>`, circles.

Pass calibration props to FieldCanvas:
```jsx
<FieldCanvas
  ...existing props...
  calibrationMode={activeMode === 'calibrate'}
  calibrationData={calibration}
  onCalibrationMove={(key, pos) => {
    setCalibration(prev => {
      const otherKey = key === 'homeBase' ? 'awayBase' : 'homeBase';
      const snapY = Math.abs(pos.y - prev[otherKey].y) < 0.03 ? prev[otherKey].y : pos.y;
      return { ...prev, [key]: { x: pos.x, y: snapY } };
    });
  }}
/>
```

In FieldCanvas.jsx, add support for calibration mode:

**Props:** Add `calibrationMode`, `calibrationData`, `onCalibrationMove` to props.

**Drawing (in the main draw useEffect, after everything else but before loupe):**
```javascript
if (calibrationMode && calibrationData) {
  const { homeBase, awayBase } = calibrationData;
  const hx = homeBase.x * w, hy = homeBase.y * h;
  const ax = awayBase.x * w, ay = awayBase.y * h;

  // Dashed axis line
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#facc1580'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.setLineDash([]);

  // Markers
  [{ x: hx, y: hy, color: '#22c55e', label: 'HOME' },
   { x: ax, y: ay, color: '#ef4444', label: 'AWAY' }].forEach(m => {
    ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = m.color + '40'; ctx.fill();
    ctx.strokeStyle = m.color; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = m.color; ctx.font = `bold 10px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(m.label, m.x, m.y - 18);
  });
}
```

**Touch handling:** In `handleStart`, when `calibrationMode`:
```javascript
if (calibrationMode && calibrationData) {
  const pos = getRelPos(e);
  const { homeBase, awayBase } = calibrationData;
  const hDist = Math.sqrt((pos.x - homeBase.x)**2 + (pos.y - homeBase.y)**2);
  const aDist = Math.sqrt((pos.x - awayBase.x)**2 + (pos.y - awayBase.y)**2);
  const threshold = 0.06;
  if (hDist < threshold) { calDragRef.current = 'homeBase'; didLongPress.current = true; return; }
  if (aDist < threshold) { calDragRef.current = 'awayBase'; didLongPress.current = true; return; }
}
```

In `handleMove`, when `calDragRef.current`:
```javascript
if (calDragRef.current && calibrationMode) {
  const pos = getRelPos(e);
  onCalibrationMove?.(calDragRef.current, pos);
  return;
}
```

In `handleEnd`: `calDragRef.current = null;`

Add `const calDragRef = useRef(null);` to FieldCanvas state.

Replace the calibrate mode panel with just:
```jsx
{activeMode === 'calibrate' && (
  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
      Drag HOME/AWAY markers on canvas
    </span>
    <Btn size="sm" variant="ghost" onClick={() => setCalibration({
      homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 }
    })}>Reset</Btn>
  </div>
)}
```

## B4. Move OCR from Calibration to Bunkers
DELETE the OCR button from calibrate panel (it's already gone after B3).
KEEP OCR button in bunkers panel — already there.

## B5. Bunker tap — pass bunker position, not click position
**File:** `src/components/FieldCanvas.jsx`

In the bunker mode touch handler, when clicking a pill, pass the BUNKER's position:
Find the line like: `onBunkerPlace?.(pos);` inside the pill-click branch.
Change to: `onBunkerPlace?.({ x: b.x, y: b.y });`

This ensures `handleBunkerTap` in LayoutDetailPage matches the existing bunker
(it checks distance < 0.05 from click to bunker center).

## B6. New bunker — show pending dot on canvas
Pass `pendingBunkerPos` to FieldCanvas:
```jsx
<FieldCanvas
  ...existing...
  pendingBunkerPos={bunkerCardOpen && !selectedBunker ? newBunkerPos : null}
/>
```

In FieldCanvas draw function, after bunker labels:
```javascript
if (pendingBunkerPos) {
  const px = pendingBunkerPos.x * w, py = pendingBunkerPos.y * h;
  ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#facc1580'; ctx.fill();
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.stroke();
}
```

## B7. Tactic creation error — add better logging
Replace the generic alert with the actual error:
```javascript
} catch (e) {
  console.error('Create tactic failed:', e, e.code, e.message);
  alert(`Failed to create tactic: ${e.message || 'Unknown error'}`);
}
```

---

# PART C: MatchPage Redesign (45 min)

## C1. Apply PageHeader to MatchPage heatmap view
Replace the ad-hoc header div (~line 465-477) with:
```jsx
<PageHeader
  back={{ label: tournament.name, to: `/tournament/${tournamentId}` }}
  title={match.name || 'Match'}
/>
```

## C2. Apply PageHeader to MatchPage editor view
Replace the ad-hoc header div (~line 582-599) with:
```jsx
<PageHeader
  back={{ to: `/tournament/${tournamentId}` }}
  title={match.name || 'Match'}
  subtitle={`Pt ${points.length + (editingId ? 0 : 1)}`}
/>
```

## C3. Apply ActionBar to MatchPage editor
Replace the ad-hoc action bar div (~line 838-885) with:
```jsx
<ActionBar actions={[
  { id: 'place', icon: '📍', label: 'Place', active: mode === 'place',
    onClick: () => setMode('place') },
  { id: 'hit', icon: '💀', label: 'Hit',
    variant: selPlayer !== null && draft.elim[selPlayer] ? 'danger' : undefined,
    onClick: () => { if (selPlayer !== null) toggleElim(selPlayer); } },
  { id: 'shot', icon: '📷', label: 'Shot', active: mode === 'shoot',
    onClick: () => setMode(mode === 'shoot' ? 'place' : 'shoot') },
  { id: 'bump', icon: '⏱', label: 'Bump',
    onClick: () => { /* bump flow from master brief */ },
    disabled: selPlayer === null || !draft.players[selPlayer] },
  ...(undoStack.canUndo ? [{ id: 'undo', icon: '↩', label: '', compact: true,
    onClick: handleUndo }] : []),
  { id: 'ok', icon: '✓', label: 'OK', variant: 'accent',
    onClick: () => setSaveSheetOpen(true) },
]} />
```

Import ActionBar: `import ActionBar from '../components/ActionBar';`

## C4. Remove 🔄 refresh button if still present
Check if the refresh button in team selector bar was already removed by urgent fix C.
If still there, delete it.

## C5. Clean up dead `editorZoom` conditionals
After Part A removes zoom code, all `{!editorZoom && ...}` wrappers in MatchPage
should be unwrapped (keep the content, remove the conditional).

---

# EXECUTION ORDER

1. **PART A** — Dead zoom cleanup → push
2. **PART B1-B2** — Header + merge Lines/Zones → push
3. **PART B3-B4** — Calibration on main canvas → push
4. **PART B5-B7** — Bunker fixes + tactic error → push
5. **PART C1-C5** — MatchPage headers + ActionBar → push
6. Run `npm run precommit` — must be green
7. Run `grep -rn 'editorZoom\|showZoom\|toggleZoom' src/` — must be empty

---

# TESTING CHECKLIST
- [ ] FieldEditor has no zoom props/state/conditionals
- [ ] MatchPage editor: no zoom overlay, toolbar always visible
- [ ] LayoutDetailPage: no thumbnail in header, no bunker count
- [ ] LayoutDetailPage: Lines tab has 4 buttons (Disco, Zeeker, Danger, Sajgon)
- [ ] LayoutDetailPage: no separate Zones tab
- [ ] LayoutDetailPage: calibration markers on main canvas (not separate img)
- [ ] LayoutDetailPage: OCR button only in Bunkers tab
- [ ] LayoutDetailPage: tap bunker → BunkerCard opens with correct data
- [ ] LayoutDetailPage: tap empty → pending dot + BunkerCard for new
- [ ] MatchPage heatmap: PageHeader with tournament back link
- [ ] MatchPage editor: PageHeader with "Pt N" subtitle
- [ ] MatchPage editor: ActionBar with Place/Hit/Shot/Bump/Undo/OK
- [ ] All on 375px mobile
- [ ] `npm run precommit` green
