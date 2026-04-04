# CC BRIEF: Cleanup Pass — FINISH THE JOB
**Priority:** Do this NOW. Run `npm run precommit` after — must reach 0 errors.

---

## 1. POLISH STRINGS (27 remaining — translate ALL to English)

### Components (17 strings):
```
src/components/CSVImport.jsx:42
src/components/CSVImport.jsx:43
src/components/CSVImport.jsx:82
src/components/CSVImport.jsx:106
src/components/CSVImport.jsx:107
src/components/CSVImport.jsx:111
src/components/CSVImport.jsx:121
src/components/ScheduleImport.jsx:68
src/components/ScheduleImport.jsx:146
src/components/ScheduleImport.jsx:180
src/components/ScheduleImport.jsx:338
src/components/ScheduleImport.jsx:402
src/components/FieldCanvas.jsx:121
src/components/FieldCanvas.jsx:573
src/components/FieldEditor.jsx:211
src/components/PlayerEditModal.jsx:84
src/components/ui.jsx:201
```

### Hooks & Utils (6 strings):
```
src/hooks/useWorkspace.jsx:114
src/hooks/useWorkspace.jsx:116
src/hooks/useWorkspace.jsx:117
src/utils/helpers.js:10
src/utils/helpers.js:13
src/utils/theme.js:215
```

### TacticPage (4 strings you missed):
```
src/pages/TacticPage.jsx:406
src/pages/TacticPage.jsx:442
src/pages/TacticPage.jsx:606
src/pages/TacticPage.jsx:607
```

---

## 2. RAW FORM CONTROLS (replace with shared components)

### BunkerCard.jsx:
- Line 204: raw `<input type="checkbox">` → `<Checkbox label="Mirror (add symmetric bunker)" checked={doMirror} onChange={setDoMirror} />`
- Line 193: raw `<input type="range">` → `<Slider>` component (or leave as warning for now)

### PlayerEditModal.jsx:
- Line 127: raw `<textarea>` → import and use `<TextArea>` from ui.jsx  

### LayoutDetailPage.jsx:
- Line 344: raw `<input type="range">` → `<Slider>` component

---

## 3. SMALL FIXES

### ScoutedTeamPage.jsx ~line 239:
- Add `zIndex: 20` to the sticky bottom div

### TeamDetailPage.jsx ~line 102:
- Change `minHeight: 24` to `minHeight: 36` on the interactive element

### MatchPage.jsx line 585:
- Header padding `8px 16px` → `10px 16px`

### MatchPage.jsx lines 820, 825:
- The 24×24 action icons (💀 and ✕) — increase to `width: 32, height: 32`

---

## 4. VERIFY

After all fixes, run:
```bash
npm run lint:ui
```

Expected output: **0 errors, 0 warnings** (or close to 0 warnings).

Then run:
```bash
npm run precommit
```

Must pass with **0 errors** before committing.

---

## DO NOT skip any file. Open each one listed above, find the Polish string, translate it.
