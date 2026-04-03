# FIX: Merge duplicate canvases in LayoutDetailPage
## ONE canvas, not two or three

### Problem
LayoutDetailPage has THREE renderings of the layout:
1. FieldEditor+FieldCanvas in Konfiguracja section (line ~375)
2. Calibration `<img>` + SVG overlay in Konfiguracja (line ~434)
3. FieldCanvas in Podgląd pola section (line ~619)

When Konfiguracja is expanded, user sees TWO full canvases on screen.

### Fix: Merge into ONE canvas

**Delete Konfiguracja canvas entirely.** The section keeps ONLY:
- Disco/Zeeker sliders
- Mode buttons (Nazwy, Typy, Strefy, Kalibracja)
- Bunker list (when in names/types mode)
- Save annotacje / Anuluj buttons
- NO canvas, NO FieldEditor, NO calibration image

**Podgląd pola canvas becomes THE canvas.** It handles both viewing AND editing:
- When no annotateMode → read-only preview with checkboxes (current behavior)
- When annotateMode is set (Nazwy/Typy/Strefy/Kalibracja) → canvas becomes editable

**Auto-expand behavior:**
When user clicks a mode button (Nazwy/Typy/Strefy/Kalibracja):
1. Set annotateMode
2. Auto-expand Podgląd pola section (setOpenSection('pole'))
3. Canvas receives edit props (onBunkerPlace, onBunkerMove, onZonePoint etc.)

When user clicks Save/Cancel in Konfiguracja:
1. Clear annotateMode
2. Canvas reverts to read-only

**Calibration markers render ON the canvas** (not a separate img):
When annotateMode === 'calibrate', FieldCanvas renders HOME/AWAY markers as
an overlay layer. The dragging logic uses the same coordinate system as bunkers.
This means calibration uses the SAME canvas aspect ratio as everything else.

### Step by step for Claude Code:

1. In Konfiguracja section: DELETE everything from line ~374 (FieldEditor) 
   through line ~423 (</FieldEditor>). Also DELETE the calibration overlay
   block (the `<div>` with `<img>` and `<svg>` for home/away markers).

2. In Podgląd pola section: pass ALL edit props to FieldCanvas:
   ```jsx
   <FieldCanvas
     {...canvasProps}
     layoutEditMode={canvasLayoutEditMode}
     editDangerPoints={editDanger}
     editSajgonPoints={editSajgon}
     onBunkerPlace={...}     // move from deleted Konfiguracja canvas
     onBunkerMove={...}      // move from deleted Konfiguracja canvas
     onZonePoint={...}       // move from deleted Konfiguracja canvas
     onZoneUndo={...}        // move from deleted Konfiguracja canvas
     onZoneClose={...}
     onBunkerLabelNudge={...}
     onBunkerLabelOffset={...}
   />
   ```

3. Mode button onClick: add `setOpenSection('pole')` so canvas auto-opens:
   ```jsx
   onClick={() => {
     setAnnotateMode(prev => prev === key ? null : key);
     if (key !== annotateMode) setOpenSection('pole');
   }}
   ```

4. For calibration: render markers ON the existing FieldCanvas.
   Add new props to FieldCanvas:
   ```jsx
   showCalibration={annotateMode === 'calibrate'}
   calibrationData={calibration}
   onCalibrationMove={(base, pos) => setCalibration(prev => ({...prev, [base]: pos}))}
   ```
   In FieldCanvas draw layer: if showCalibration, render green HOME circle
   and red AWAY circle at calibrationData positions, with drag handling.

5. Remove the FieldEditor wrapper from Konfiguracja entirely.
   The FieldEditor (toolbar + zoom) stays ONLY in Podgląd pola.

### Result
```
┌ 📋 Info ─────── PXL 2026 ►
├ ⚙️ Konfiguracja ── 40 bunkrów ▼
│  Disco ━━━━●━━━ 28%  Zeeker ━━━━━●━ 78%
│  [Nazwy] [Typy] [Strefy] [Kalibracja]
│  (bunker list when applicable)
│  [Zapisz annotacje]  Anuluj
├ 🗺️ Podgląd pola ▼
│  ☑Nazwy ☑Linie ☐Strefy  [🔍]
│  ┌─────────────────────────┐
│  │  ONE canvas             │  ← edit mode active when annotateMode set
│  │  (editable or readonly) │
│  └─────────────────────────┘
├ ⚔️ Taktyki ── 2 ►
```

ONE image on screen. Always. Period.
