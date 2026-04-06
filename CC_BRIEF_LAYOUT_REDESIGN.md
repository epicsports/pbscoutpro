# CC Brief: Layout Page Redesign

## Context
The Layout section is being redesigned from scratch. Current LayoutDetailPage has 5 bottom tabs (Preview, Bunkers, Lines, Calib, Tactics) — replaced with a single scrollable page: field canvas on top, toggles, then tactics list below. Setup moves to a 3-step wizard for new layouts only.

**Read before starting:** `src/utils/theme.js`, `src/components/ui.jsx`, `src/components/field/drawBunkers.js`, `src/utils/design-contract.js`

---

## Part 1: Data Model Changes

### 1A. Bunker object — add `positionName`
Current bunker: `{ id, name, type, x, y, labelOffsetY }`
New bunker: `{ id, positionName, type, x, y, labelOffsetY }`

- `positionName` = WHERE on field (comms name: "Dog", "Palma", "Snake1")
- `type` = WHAT it is physically (bunker shape abbreviation: "MD", "GP", "C")
- Migrate: copy current `name` → `positionName`, run `guessType(name)` → `type`
- Snake beams: `type: "SB"`, `positionName: ""` (empty — no comms name)

### 1B. Position presets
Add to `theme.js`:
```js
export const POSITION_NAMES = {
  dorito: ['Palma','Dog','Dexter','Dallas','Dreams','Dykta','Dorito1','Dorito2','Dorito3','Dorito50','Drago'],
  snake: ['Snoop','Cobra','Ring','Snake1','Snake2','Snake3','Snake50','Sweet','Soda','Suka','Skoda'],
  center: ['Hammer','Hiena','Drago','Gwiazda','Baza','Środek'],
};

// Which type is typically at each position (for auto-suggest after Vision scan or manual naming)
export const POSITION_TYPE_SUGGEST = {
  'Palma':'MD','Dog':'MD','Dexter':'Br','Dallas':'GP','Dreams':'Br','Dykta':'GB',
  'Dorito1':'MD','Dorito2':'MD','Dorito3':'MD','Dorito50':'GD',
  'Snoop':'C','Cobra':'Ck','Ring':'C',
  'Snake1':'C','Snake2':'C','Snake3':'C','Snake50':'C',
  'Sweet':'Br','Soda':'C','Suka':'C','Skoda':'C',
  'Hammer':'T','Hiena':'Ck','Drago':'GD','Gwiazda':'GP','Baza':'GB','Środek':'MT',
};
```

### 1C. Layout document — new fields
Add to layout Firestore doc:
```js
{
  mirrorMode: 'y',          // 'y' (Y-axis only, default) or 'diag' (X+Y diagonal)
  doritoSide: 'top',        // 'top' or 'bottom' — which side of image is dorito
  // existing fields unchanged: name, league, year, fieldImage, discoLine, zeekerLine,
  // bunkers, dangerZone, sajgonZone, fieldCalibration
}
```

### 1D. Side detection helper
Add to `helpers.js`:
```js
export function getBunkerSide(x, y, doritoSide = 'top') {
  if (x > 0.42 && x < 0.58) return 'center';
  const isTop = y < 0.5;
  if (doritoSide === 'top') return isTop ? 'dorito' : 'snake';
  return isTop ? 'snake' : 'dorito';
}
```

---

## Part 2: LayoutDetailPage Redesign

### Structure (top to bottom, single scrollable page):
1. **PageHeader** — back "Layouts", title, league+year badges, ⋮ menu
2. **FieldCanvas** — full image height, horizontal scroll, no vertical scroll on canvas
3. **Toggle row** — Checkbox components: Labels, Lines, Zones
4. **Section: Tactics** — list of tactic cards + sticky "New tactic" button

### 2A. PageHeader
Use existing `<PageHeader>` component:
- `back={{ label: 'Layouts', to: '/layouts' }}`
- `title={layout.name}`
- `badges` = LeagueBadge + YearBadge (existing components)
- `right` = `<MoreBtn>` that opens ActionSheet

### 2B. ⋮ Menu → ActionSheet
Use existing `<ActionSheet>` component. Actions:
```js
[
  { label: 'Edit layout info', onPress: () => setInfoModal(true) },
  { label: 'Re-calibrate field', onPress: () => navigate(`/layout/${id}/calibrate`) },
  { label: 'Re-scan bunkers (Vision)', onPress: () => setOcrOpen(true) },
  { label: 'Mirror mode', onPress: () => setMirrorModal(true) },
  { separator: true },
  { label: 'Delete layout', onPress: () => confirmDelete(), danger: true },
]
```

### 2C. FieldCanvas configuration
```jsx
<FieldCanvas
  fieldImage={image}
  bunkers={allBunkersWithMirrors}  // computed from masters + mirrorMode
  showBunkers={showLabels}
  discoLine={showLines ? layout.discoLine : 0}
  zeekerLine={showLines ? layout.zeekerLine : 0}
  dangerZone={showZones ? layout.dangerZone : null}
  sajgonZone={showZones ? layout.sajgonZone : null}
  showZones={showZones}
  layoutEditMode="bunker"  // always in edit mode on this page
  onBunkerPlace={handleBunkerTap}
  onBunkerMove={handleBunkerMove}
  fillHeight={true}  // use full image height
/>
```

Canvas container: `overflow-x: auto`, `overflow-y: hidden`, `scrollbar-width: none`, `-webkit-overflow-scrolling: touch`. Hide scrollbar with CSS.

### 2D. Toggle row
Use existing `<Checkbox>` from ui.jsx:
```jsx
<div style={{ display: 'flex', gap: 14, padding: '10px 16px' }}>
  <Checkbox label="Labels" checked={showLabels} onChange={setShowLabels} />
  <Checkbox label="Lines" checked={showLines} onChange={setShowLines} />
  <Checkbox label="Zones" checked={showZones} onChange={setShowZones} />
</div>
```

### 2E. Tactics section
Section title: uppercase label "TACTICS" with divider line (see `SectionTitle` or inline).

Tactic cards: use existing `<Card>` pattern:
```jsx
tactics.map(t => (
  <Card
    key={t.id}
    icon="⚔️"
    title={t.name}
    subtitle={`${t.steps?.length || 0} steps`}
    onClick={() => navigate(`/layout/${layoutId}/tactic/${t.id}`)}
    actions={<MoreBtn onClick={() => openTacticMenu(t)} />}
  />
))
```

Tactic ⋮ menu → ActionSheet:
```js
[
  { label: 'Edit', onPress: () => navigate(`/layout/${layoutId}/tactic/${t.id}`) },
  { label: 'Duplicate', onPress: () => duplicateTactic(t) },
  { separator: true },
  { label: 'Delete tactic', onPress: () => confirmDeleteTactic(t), danger: true },
]
```

### 2F. Sticky "New tactic" button
Fixed at bottom of page with gradient fade:
```jsx
<div style={{
  position: 'sticky', bottom: 0, padding: '10px 16px',
  paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
  background: 'linear-gradient(transparent, #0a0e17 30%)',
}}>
  <Btn variant="accent" onClick={() => setNewTacticModal(true)}
    style={{ width: '100%', justifyContent: 'center' }}>
    <Icons.Plus /> New tactic
  </Btn>
</div>
```

---

## Part 3: Mirror System

### 3A. Mirror computation
Bunkers are stored as masters only (left half + center). Mirrors are computed at render time.

```js
function computeMirrors(masters, centerBunkers, mirrorMode) {
  const mirror = (x, y) => mirrorMode === 'diag'
    ? { x: 1 - x, y: 1 - y }
    : { x: 1 - x, y };

  const all = [];

  masters.forEach(b => {
    all.push({ ...b, role: 'master' });
    const m = mirror(b.x, b.y);
    all.push({ ...b, id: b.id + '_mirror', x: m.x, y: m.y, role: 'mirror', masterId: b.id });
  });

  centerBunkers.forEach(b => {
    all.push({ ...b, role: 'center' });
    // Single bunkers on 50 line: no mirror
    if (Math.abs(b.x - 0.5) > 0.02) {
      const m = mirror(b.x, b.y);
      all.push({ ...b, id: b.id + '_mirror', x: m.x, y: m.y, role: 'center', masterId: b.id });
    }
  });

  return all;
}
```

### 3B. Editing either side updates both
When user taps ANY bunker (master or mirror):
1. Find the master (if tapped mirror, resolve via `masterId`)
2. Open BunkerCard with master data
3. Both master and mirror pulse/highlight on canvas
4. Save updates master → mirror auto-recomputed

When moving a bunker via drag:
- Move master → mirror moves symmetrically
- Move mirror → master moves symmetrically (reverse mirror transform)

---

## Part 4: BunkerCard Redesign

### 4A. Structure (bottom sheet)
```
┌─────────────────────────────────┐
│  [handle]                       │
│  ■ ⟷ ■  Dog × 2    Dorito side │  ← pair indicator
│                                 │
│  Position — dorito side:        │
│  [Palma] [Dog✓] [Dexter] ...   │  ← quick pills, filtered by side
│  [+ Custom]                     │  ← opens text input
│                                 │
│  [◁ Med. Dorito       change ▸] │  ← type bar (tap to expand grid)
│                                 │
│  [Delete pair] [Cancel] [Done✓] │
└─────────────────────────────────┘
```

### 4B. Pair indicator
Shows two colored dots with ⟷ between them. Color = side color (dorito=#ef4444, snake=#3b82f6, center=#f59e0b). Single center bunkers show one dot + "(single)".

### 4C. Position pills
Filtered by `getBunkerSide(x, y, layout.doritoSide)`. Use `POSITION_NAMES[side]`. Active pill highlighted with accent. Last pill = "+ Custom" (dashed border) → shows Input for custom name.

### 4D. Type bar
Single row showing current type icon + name + "change ▸". Tap expands grid of all `BUNKER_TYPES`. Selecting a type collapses grid.

When user picks a position name, auto-suggest type from `POSITION_TYPE_SUGGEST`. Update type bar display.

### 4E. Snake beam sheet
Simplified: pair indicator (beam shape dots), description text "Structural cover. Affects ballistics only.", Delete + Close buttons. No position pills or type picker.

---

## Part 5: Setup Wizard (New Layout Only)

### Route: `/layout/new` (3-step wizard)

### Step 1: Basic Info
- Name input (required)
- League selector: NXL / DPL / PXL pills + "Other" pill → shows Input
- Year selector
- Image upload (required)
- **Next →** button (Btn variant="accent", full width)

### Step 2: Calibrate
- Field image displayed with two draggable markers (H=green, A=blue)
- Y-axis locked together: moving H vertically moves A vertically too
- Three zoom panels below field: HOME zoom, CENTER zoom, AWAY zoom
- Dorito side selector: "Top ▲" / "Bottom ▼" pills
- **Next →** button

Calibration data saved as: `{ homeBase: {x, y}, awayBase: {x, y} }`
Field center = midpoint between homeBase and awayBase.

### Step 3: Vision Scan
- Call Anthropic Vision API (client-side, key from env `VITE_ANTHROPIC_API_KEY`)
- Firebase Auth required (already have it)
- Prompt: analyze LEFT HALF of field image, detect bunker shapes, return type + position
- Mirror detected bunkers to right half
- Display results on field: green border = confident, amber dashed = uncertain
- List below field: each detected bunker with suggested positionName + type
- User reviews: tap to edit, accept individual or "Accept all"
- "+ Add manual" button for missed bunkers
- **Finish** → creates layout, navigates to LayoutDetailPage

### Vision API call:
```js
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
      { type: 'text', text: VISION_PROMPT }
    ]}]
  })
});
```

Vision prompt should ask for JSON array of detected bunkers with: `{ type, x, y, confidence }` where x,y are 0-1 normalized positions on LEFT HALF only.

---

## Part 6: Drawing Changes (drawBunkers.js)

### 6A. Label text
Change from `b.name` to `b.positionName`. If empty (beam), skip label.

### 6B. Mirror opacity
Mirrors drawn at 30% opacity (already handle `role` field).

### 6C. Disco/Zeeker lines
- **Disco line**: horizontal, only on DORITO side of field. Color: `COLORS.discoLine` (#f97316).
- **Zeeker line**: horizontal, only on SNAKE side of field. Color: `COLORS.zeekerLine` (#3b82f6).
- Use `layout.doritoSide` to determine which half gets which line.

### 6D. Selected bunker
When bunker tapped: both master + mirror get highlight ring. Use existing `selectedBunkerId` logic but extend to also highlight the paired bunker.

---

## Part 7: Files to Modify

| File | Changes |
|------|---------|
| `src/pages/LayoutDetailPage.jsx` | **Full rewrite.** Remove 5-tab system. New structure: PageHeader + FieldCanvas + Toggles + Tactics list + sticky New Tactic button |
| `src/pages/LayoutsPage.jsx` | Minor: "New layout" navigates to `/layout/new` wizard instead of modal |
| `src/components/BunkerCard.jsx` | **Rewrite.** Add pair indicator, position pills, type bar, side detection |
| `src/components/field/drawBunkers.js` | Use `positionName` instead of `name`. Mirror opacity. Paired highlight |
| `src/components/field/drawField.js` | Disco line only dorito side, Zeeker only snake side |
| `src/utils/theme.js` | Add `POSITION_NAMES`, `POSITION_TYPE_SUGGEST` |
| `src/utils/helpers.js` | Add `getBunkerSide()` |
| `src/services/dataService.js` | Migration helper: `name` → `positionName` |

### New files:
| File | Purpose |
|------|---------|
| `src/pages/LayoutWizardPage.jsx` | 3-step new layout wizard |
| `src/components/CalibrationView.jsx` | 3-zoom calibration UI |
| `src/components/VisionScan.jsx` | Vision API scan + review UI |

---

## Part 8: Implementation Order

1. **Data model** — add `positionName`, `POSITION_NAMES`, `POSITION_TYPE_SUGGEST`, `getBunkerSide()`, migration helper
2. **LayoutDetailPage rewrite** — new structure with field + toggles + tactics
3. **BunkerCard rewrite** — pair indicator, position pills, type bar
4. **Mirror system** — `computeMirrors()`, edit-either-side logic
5. **drawBunkers.js updates** — positionName, mirror opacity, paired highlight
6. **drawField.js** — Disco/Zeeker per-side rendering
7. **LayoutWizardPage** — 3-step wizard with calibration
8. **VisionScan** — API integration (can defer if API key not ready)

**Priority for Saturday tournament:** Parts 1-6 are essential. Parts 7-8 (wizard + vision) can ship after tournament — current layout creation flow still works as fallback.

---

## Design Tokens Reference
All styling must use existing tokens from `theme.js`:
- Backgrounds: `COLORS.bg` (#0a0e17), `COLORS.surface` (#111827), `COLORS.surfaceLight` (#1a2234)
- Borders: `COLORS.border` (#2a3548)
- Accent: `COLORS.accent` (#f59e0b)
- Text: `COLORS.text` (#e2e8f0), `COLORS.textDim` (#94a3b8), `COLORS.textMuted` (#64748b)
- Font: `FONT` (Inter)
- Touch: `TOUCH.minTarget` (44px)
- Radius: `RADIUS.lg` (12), `RADIUS.md` (8)
- Use existing components: `Btn`, `Card`, `Modal`, `Input`, `Select`, `Checkbox`, `ActionSheet`, `MoreBtn`, `ConfirmModal`, `PageHeader`, `EmptyState`
