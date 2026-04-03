# CC BRIEF: LayoutDetailPage Overhaul
**Priority:** HIGH — do before continuing Session 4
**File:** `src/pages/LayoutDetailPage.jsx` (primary), `src/components/FieldCanvas.jsx` (minor)
**Rules:** Inline JSX only (COLORS/FONT/TOUCH from theme.js). English UI. Mobile-first 44px targets.

---

## Fix 1: Header — clean up
**Current:** Miniaturka + nazwa layoutu + LeagueBadge + YearBadge + "· 40 bunkers" + ✏️
**Target:** `← NazwaLayoutu [NXL] [2026]` — no thumbnail, no bunker count, edit icon stays.

**Changes (lines ~254-269):**
- DELETE: `{image && <img src={image} ...` thumbnail (line ~259)
- DELETE: `· {editBunkers.length} bunkers` from subtitle (line ~265)
- KEEP: name as title, LeagueBadge, YearBadge, edit button
- Layout: name + pills on ONE line (flex, gap 8, align center, overflow ellipsis on name)

```jsx
{/* ═══ HEADER ═══ */}
<div style={{
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 16px', borderBottom: `1px solid ${COLORS.border}`,
  background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
}}>
  <div onClick={() => navigate('/layouts')}
    style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: COLORS.accent, flexShrink: 0 }}>
    <Icons.Back />
  </div>
  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontSm, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {name}
    </span>
    <LeagueBadge league={league} />
    <YearBadge year={year} />
  </div>
  <Btn variant="ghost" size="sm" onClick={() => setInfoModal(true)} style={{ padding: '4px' }}><Icons.Edit /></Btn>
</div>
```

---

## Fix 2: Mode tabs — full-width, properly spaced
**Current:** Tabs at bottom with `flex: '0 0 auto'`, `overflowX: auto` — they cluster left and don't fill width.
**Target:** Tabs fill full width equally, properly spaced, with safe-area padding.

**Changes (lines ~448-466):**
```jsx
<div style={{
  display: 'flex',
  borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  position: 'sticky', bottom: 0, zIndex: 20,  /* ADD: sticky bottom */
}}>
  {MODES.map(m => (
    <div key={m.id} onClick={() => { setActiveMode(m.id); if (m.id !== 'zones') setZoneEditMode(null); }}
      style={{
        flex: 1,             /* CHANGE: was '0 0 auto' */
        padding: '10px 4px', /* CHANGE: more vertical padding */
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        borderTop: activeMode === m.id ? `2px solid ${COLORS.accent}` : '2px solid transparent',
        color: activeMode === m.id ? COLORS.accent : COLORS.textMuted,
      }}>
      <span style={{ fontSize: 18 }}>{m.icon}</span>
      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: activeMode === m.id ? 700 : 400 }}>{m.label}</span>
    </div>
  ))}
</div>
```

---

## Fix 3: Preview checkboxes — move into toolbar consistency
**Current:** Checkboxes (Labels, Lines, Zones) + share/export buttons shown in mode panel below canvas.
**NOTE FOR OPUS:** This is flagged for cross-screen audit. For now, keep as-is but remove share/export buttons from preview panel. Those belong in header or info modal. Checkboxes stay in preview mode panel.

**Minimal change:**
- Move 📤 and 🔗 buttons to the header (next to edit icon) or into the info modal
- Keep Labels/Lines/Zones checkboxes in preview mode panel — they're fine there

---

## Fix 4: Calibration — use main FieldCanvas, not separate img
**Current:** Calibrate mode renders a SECOND `<img>` + `<svg>` overlay (lines ~377-393) below the main canvas. It's tiny (maxHeight: 120), cropped, and doesn't work well.
**Target:** Calibrate mode shows H/A markers on the MAIN FieldCanvas. User drags them to base centers. Y-axis snapping between the two markers.

**Implementation:**
1. DELETE the entire `{activeMode === 'calibrate' && ...}` block with the second img/svg (lines ~371-399)
2. Pass calibration data to FieldCanvas as props:
   ```jsx
   <FieldCanvas
     ...existing props...
     calibrationMode={activeMode === 'calibrate'}
     calibrationData={calibration}
     onCalibrationMove={(key, pos) => {
       setCalibration(prev => {
         const otherKey = key === 'homeBase' ? 'awayBase' : 'homeBase';
         // Y-snap: if within 0.03 of other marker's Y, snap to it
         const snapY = Math.abs(pos.y - prev[otherKey].y) < 0.03 ? prev[otherKey].y : pos.y;
         return { ...prev, [key]: { x: pos.x, y: snapY } };
       });
     }}
   />
   ```
3. In FieldCanvas, when `calibrationMode` is true:
   - Draw two draggable markers (H green, A red) at `calibrationData.homeBase` / `calibrationData.awayBase`
   - Draw a dashed line between them (field axis)
   - On touch/drag of marker → call `onCalibrationMove(key, pos)`
   - Disable player placement / bunker edit while in calibration mode
4. Calibrate mode panel below canvas: just "Drag HOME/AWAY markers on canvas" text + Reset button. No OCR button here.

---

## Fix 5: Move OCR from Calibration to Bunkers
**Current:** OCR button appears in both Bunkers mode AND Calibration mode.
**Target:** OCR button ONLY in Bunkers mode.

**Changes:**
- DELETE: `<Btn size="sm" variant="default" onClick={() => setOcrOpen(true)}>🔍 OCR</Btn>` from calibrate panel (line ~397)
- KEEP: OCR button in bunkers panel (line ~349)

---

## Fix 6: Bunker editing — tap existing bunker opens BunkerCard with its data
**Current:** Tapping an existing bunker pill in bunker mode calls `onBunkerPlace(pos)` with the CLICK position, not the bunker's position. `handleBunkerTap` then fails to match any bunker because the click was on the label, not the center.
**Target:** Tapping a bunker (anchor dot OR label pill) opens BunkerCard pre-filled with that bunker's data.

**Changes in FieldCanvas.jsx (lines ~758-783):**
```javascript
if (layoutEditMode === 'bunker') {
  const { w, h } = canvasSize;
  const labelFont = Math.max(10, Math.min(15, w * 0.026));
  const lh = Math.round(labelFont * 1.8);
  for (const b of bunkers) {
    const bx = b.x * w, by = b.y * h;
    const tw_approx = b.name.length * labelFont * 0.62 + Math.round(labelFont * 0.7) * 2;
    const pillMidY = by - lh / 2 - 4;

    // Anchor drag — hit anchor dot
    const dxAnch = (b.x - pos.x) * w, dyAnch = (b.y - pos.y) * h;
    if (Math.sqrt(dxAnch * dxAnch + dyAnch * dyAnch) < 22) {
      setDraggingBunker(b.id); didLongPress.current = true; return;
    }

    // Pill click — pass BUNKER POSITION, not click position
    const dxLbl = (bx / w - pos.x) * w;
    const dyLbl = (pillMidY / h - pos.y) * h;
    if (Math.abs(dxLbl) < tw_approx / 2 + 6 && Math.abs(dyLbl) < lh / 2 + 4) {
      onBunkerPlace?.({ x: b.x, y: b.y });  // ← CHANGE: was onBunkerPlace?.(pos)
      try { navigator.vibrate?.(10); } catch(e) {}
      didLongPress.current = true; return;
    }
  }
  // Place new bunker on empty space
  onBunkerPlace?.(pos);
  try { navigator.vibrate?.(10); } catch(e) {}
  didLongPress.current = true;
  return;
}
```

---

## Fix 7: New bunker should appear on canvas immediately
**Current:** New bunker is added to `editBunkers` only after BunkerCard save. While BunkerCard is open, there's no dot on canvas.
**Target:** Show a temporary marker on canvas at `newBunkerPos` while BunkerCard is open.

**Option A (simpler):** Pass `pendingBunkerPos` to FieldCanvas, draw a pulsing yellow dot there.
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

---

## Fix 8: Merge Lines + Zones into one tab
**Current:** Separate "Lines" and "Zones" tabs.
**Target:** One tab called "Lines" with 4 buttons: Disco, Zeeker, Danger zone, Sajgon zone.

**Changes:**

1. Update MODES array — remove 'zones', rename 'lines':
```javascript
const MODES = [
  { id: 'preview', icon: '👁', label: 'Preview' },
  { id: 'bunkers', icon: '🏷', label: 'Bunkers' },
  { id: 'lines', icon: '📏', label: 'Lines' },
  { id: 'calibrate', icon: '📐', label: 'Calib.' },
  { id: 'tactics', icon: '⚔️', label: `Tactics (${tactics.length})` },
];
```

2. Merge lines panel content:
```jsx
{activeMode === 'lines' && (
  <div>
    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
      <Btn variant={lineEditMode === 'disco' ? 'accent' : 'default'} size="sm"
        onClick={() => setLineEditMode(lineEditMode === 'disco' ? null : 'disco')}
        style={{ borderColor: lineEditMode === 'disco' ? '#f97316' : undefined }}>
        🟠 Disco
      </Btn>
      <Btn variant={lineEditMode === 'zeeker' ? 'accent' : 'default'} size="sm"
        onClick={() => setLineEditMode(lineEditMode === 'zeeker' ? null : 'zeeker')}
        style={{ borderColor: lineEditMode === 'zeeker' ? '#3b82f6' : undefined }}>
        🔵 Zeeker
      </Btn>
      <Btn variant={zoneEditMode === 'danger' ? 'accent' : 'default'} size="sm"
        onClick={() => { setZoneEditMode(zoneEditMode === 'danger' ? null : 'danger'); setLineEditMode(null); }}>
        🔴 Danger
      </Btn>
      <Btn variant={zoneEditMode === 'sajgon' ? 'accent' : 'default'} size="sm"
        onClick={() => { setZoneEditMode(zoneEditMode === 'sajgon' ? null : 'sajgon'); setLineEditMode(null); }}>
        🟡 Sajgon
      </Btn>
    </div>
    {/* Undo/clear for zone drawing */}
    {zoneEditMode && (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
          Tap points on canvas to draw polygon
        </span>
        <Btn size="sm" variant="ghost" onClick={() => { if (zoneEditMode === 'danger') setEditDanger(p => p.slice(0,-1)); else setEditSajgon(p => p.slice(0,-1)); }}>↩</Btn>
        <Btn size="sm" variant="ghost" onClick={() => { if (zoneEditMode === 'danger') setEditDanger([]); else setEditSajgon([]); }}>🗑</Btn>
      </div>
    )}
    {/* Instruction for line placement */}
    {lineEditMode && (
      <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
        Tap canvas to place {lineEditMode} line · drag to adjust
      </span>
    )}
  </div>
)}
```

3. Add `lineEditMode` state: `const [lineEditMode, setLineEditMode] = useState(null); // null | 'disco' | 'zeeker'`
4. Reset both modes when switching tabs

---

## Fix 9: Disco/Zeeker lines — tap-to-place instead of slider
**Current:** Sliders set disco (10-50%) and zeeker (50-95%).
**Target:** Tap canvas to place a horizontal line, then drag it up/down.

**Implementation:**
1. When `lineEditMode === 'disco'` or `'zeeker'`:
   - Pass to FieldCanvas: `lineEditMode={lineEditMode}` + `onLinePlaced={(type, yNorm) => ...}`
   - FieldCanvas: on tap → draw horizontal line at that Y position, call `onLinePlaced`
   - FieldCanvas: show draggable handle on existing line when in edit mode
   - On drag → update `disco` or `zeeker` state (value = `Math.round(yNorm * 100)`)
2. DELETE slider inputs from lines panel
3. Danger/Sajgon zone point count labels — remove from button text (no `(${editDanger.length})`)

---

## Fix 10: Mode panel + tabs sticky positioning
**Current:** Mode panel content can push tabs below fold. Tabs are not sticky.
**Target:** Tabs sticky at bottom. Mode panel scrollable between canvas and tabs.

**Changes:**
1. Mode tabs: add `position: 'sticky', bottom: 0, zIndex: 20` (already in Fix 2)
2. Mode panel: keep `maxHeight: '30vh', overflowY: 'auto'` — this is fine
3. Ensure the overall layout is: header (sticky top) → canvas (flex) → mode panel (max 30vh, scroll) → tabs (sticky bottom)
4. Each mode panel should have its primary action button(s) at the bottom of the panel, sticky within the panel if content scrolls

---

## Fix 11: Tactic creation fails
**Current:** `addLayoutTactic` sends `steps` with nested empty arrays: `shots: [[], [], [], [], []]`. Firestore may reject nested empty arrays or serialize them incorrectly.
**Error message:** "Nie udało się utworzyć taktyki. Wyloguj się i zaloguj ponownie."

**Diagnosis:** The `steps` array contains objects with `shots: E5A()` which is `[[], [], [], [], []]`. Firestore has issues with nested empty arrays in some configurations. Also check if the `bp()` base path is set correctly.

**Fix — sanitize empty arrays before Firestore write:**
```javascript
// In dataService.js, addLayoutTactic:
export async function addLayoutTactic(layoutId, data) {
  const sanitizeStep = (step) => ({
    ...step,
    shots: (step.shots || []).map(s => s.length ? s : []),  // keep as empty array
    players: step.players || [null, null, null, null, null],
    assignments: step.assignments || [null, null, null, null, null],
    bumps: step.bumps || [null, null, null, null, null],
  });
  return addDoc(collection(db, bp(), 'layouts', layoutId, 'tactics'), {
    name: data.name,
    myTeamId: data.myTeamId || null,
    steps: (data.steps || []).map(sanitizeStep),
    freehandStrokes: data.freehandStrokes || null,
    createdAt: serverTimestamp(),
  });
}
```

**If that doesn't fix it:** Add console.error logging before the alert to capture the actual Firestore error:
```javascript
} catch (e) {
  console.error('Create tactic failed:', e, e.code, e.message);
  alert(`Failed to create tactic: ${e.message}`);
}
```
This will show the real error (permissions? path? serialization?) in the console.

---

## Execution order
1. Fix 11 (tactic creation) — quick fix, unblocks feature
2. Fix 1 (header) — quick cosmetic
3. Fix 2 (mode tabs) — quick CSS
4. Fix 5 (move OCR) — quick move
5. Fix 8 (merge Lines+Zones) — medium, restructure
6. Fix 6 (bunker edit) — FieldCanvas change
7. Fix 7 (pending bunker dot) — FieldCanvas change
8. Fix 4 (calibration on main canvas) — bigger refactor
9. Fix 9 (line tap-to-place) — needs FieldCanvas interaction
10. Fix 10 (sticky layout) — verify after other fixes
11. Fix 3 (checkbox audit) — deferred to cross-screen audit

---

## Testing checklist
- [ ] Create new tactic from layout → opens TacticPage
- [ ] Header shows: ← LayoutName [NXL] [2026] — no thumbnail, no bunker count
- [ ] Mode tabs fill full width, are sticky at bottom, don't go under fold
- [ ] Bunkers tab: tap existing bunker → BunkerCard opens with correct name/type pre-filled
- [ ] Bunkers tab: tap empty space → yellow dot appears + BunkerCard opens for new
- [ ] Bunkers tab: OCR button present
- [ ] Calibrate tab: H/A markers on main canvas, draggable, Y-snap
- [ ] Calibrate tab: NO OCR button
- [ ] Lines tab: 4 buttons (Disco, Zeeker, Danger, Sajgon)
- [ ] Lines tab: tap canvas places disco/zeeker line, draggable
- [ ] Lines tab: danger/sajgon polygon drawing works
- [ ] No "Zones" tab exists anymore
- [ ] All labels in English
- [ ] Test on 375px mobile width
