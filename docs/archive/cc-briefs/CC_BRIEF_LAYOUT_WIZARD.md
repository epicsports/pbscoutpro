# CC Brief: Layout Creation Wizard

## Context
This brief details the 3-step wizard for creating new layouts. Currently, new layouts are created via a simple modal on LayoutsPage. This replaces that with a full-page wizard at route `/layout/new`.

**Depends on:** `CC_BRIEF_LAYOUT_REDESIGN.md` Parts 1 (data model) must be done first.
**Read before starting:** `src/utils/theme.js`, `src/components/ui.jsx`, `src/components/FieldCanvas.jsx`

---

## Part 1: Route & Navigation

### 1A. Add route
In `App.jsx`, add:
```jsx
<Route path="/layout/new" element={<LayoutWizardPage />} />
```

### 1B. LayoutsPage change
Replace the "New layout" modal with navigation:
```jsx
<Btn variant="accent" onClick={() => navigate('/layout/new')} style={{ width: '100%', justifyContent: 'center' }}>
  <Icons.Plus /> New layout
</Btn>
```
Remove the modal state, form fields, and `handleSave` for new layout creation from LayoutsPage entirely.

---

## Part 2: LayoutWizardPage Structure

### File: `src/pages/LayoutWizardPage.jsx`

### 2A. Overall structure
```jsx
export default function LayoutWizardPage() {
  const [step, setStep] = useState(1); // 1, 2, 3
  const [data, setData] = useState({
    name: '',
    league: 'NXL',
    customLeague: '',
    year: new Date().getFullYear(),
    image: null,              // base64 compressed image
    calibration: { homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 } },
    doritoSide: 'top',
    mirrorMode: 'y',
    bunkers: [],              // from vision scan or manual
  });

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        back={{ label: step === 1 ? 'Layouts' : 'Back', to: step === 1 ? '/layouts' : () => setStep(step - 1) }}
        title="New layout"
      />
      <ProgressBar step={step} total={3} />
      {step === 1 && <WizardStep1 data={data} setData={setData} onNext={() => setStep(2)} />}
      {step === 2 && <WizardStep2 data={data} setData={setData} onNext={() => setStep(3)} />}
      {step === 3 && <WizardStep3 data={data} setData={setData} onFinish={handleFinish} />}
    </div>
  );
}
```

### 2B. ProgressBar component
Three segments, filled up to current step. Use accent color.
```jsx
function ProgressBar({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < step ? COLORS.accent : COLORS.border,
        }} />
      ))}
    </div>
  );
}
```

### 2C. handleFinish
Creates layout in Firestore, then navigates to LayoutDetailPage:
```jsx
const handleFinish = async () => {
  const ref = await ds.addLayout({
    name: data.name.trim(),
    league: data.league === 'Other' ? data.customLeague.trim() : data.league,
    year: Number(data.year),
    fieldImage: data.image,
    fieldCalibration: data.calibration,
    doritoSide: data.doritoSide,
    mirrorMode: data.mirrorMode,
    bunkers: data.bunkers,
    discoLine: 0.30,
    zeekerLine: 0.80,
  });
  navigate(`/layout/${ref.id}`);
};
```

---

## Part 3: Step 1 — Basic Info

### Layout:
```
Step 1 of 3
BASIC INFO
─────────────────────────
Name
[NXL 2026 Event 1       ]

League                Year
[NXL] [DPL] [PXL] [Other]  [2026 ▾]

[If Other selected:]
[Custom league name     ]

┌─────────────────────────┐
│     📷                   │
│  Upload field image      │
│  (tap to select)         │
└─────────────────────────┘

[If image uploaded: show preview with aspect ratio preserved]

[████████ Next → ████████]  ← Btn accent, full width, disabled until name+image filled
```

### Components used:
- `Input` for name and custom league
- `Btn` variant="default" size="sm" for league pills, `active` prop for selected
- `Select` for year (use `yearOptions()` from helpers)
- `Btn` variant="default" for image upload trigger (hidden file input)
- `Btn` variant="accent" for Next, full width

### League "Other" option:
When "Other" is selected, show an `Input` below for custom league name. Store in `data.customLeague`.

### Validation:
Next button disabled (`disabled` prop) until:
- `data.name.trim().length > 0`
- `data.image !== null`

### Image handling:
Use existing `compressImage(dataUrl, 1200)` from helpers.js.

---

## Part 4: Step 2 — Calibrate

### 4A. Purpose
User places two markers on the field image to define where home base and away base centers are. This determines the field's real center point (midpoint between markers) and allows coordinate normalization across all screens.

### 4B. Y-axis lock
Both markers ALWAYS share the same Y coordinate. When user drags H marker up/down, A marker moves vertically in sync. Only X position is independent between the two markers.

### 4C. Layout
```
Step 2 of 3
CALIBRATE FIELD
Drag markers to home & away base centers
─────────────────────────────────────────

┌──────────── full field image ───────────┐
│                                         │
│  (H)                              (A)   │  ← draggable markers
│                                         │
│            ╎ (center dot)               │
│                                         │
└─────────────────────────────────────────┘

┌─────────┐  ┌─────────┐  ┌─────────┐
│  HOME   │  │ CENTER  │  │  AWAY   │
│  zoom   │  │  zoom   │  │  zoom   │
└─────────┘  └─────────┘  └─────────┘

Dorito side
[Top ▲] [Bottom ▼]

[████████ Next → ████████]
```

### 4D. Three zoom panels
Each panel shows a cropped+zoomed portion of the field image:
- **HOME zoom**: 20% of image width around homeBase.x, full height
- **CENTER zoom**: 20% of image width around the calculated center (midpoint of H and A), full height
- **AWAY zoom**: 20% of image width around awayBase.x, full height

Each zoom panel has crosshair lines (horizontal + vertical) showing the exact center of the panel. The marker should align with the crosshair when correctly calibrated.

### 4E. Implementation — zoom panels
```jsx
function ZoomPanel({ image, focusX, focusY, label, color, markerLabel }) {
  // Show a 20% horizontal slice of the image, centered on focusX
  // Use CSS background-image + background-position for cropping
  const zoomFactor = 5; // 100/20 = 5x zoom
  return (
    <div style={{
      flex: 1, aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
      border: `1px solid ${color}40`, position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%',
        backgroundImage: `url(${image})`,
        backgroundSize: `${zoomFactor * 100}% auto`,
        backgroundPosition: `${focusX * 100}% ${focusY * 100}%`,
        backgroundRepeat: 'no-repeat',
      }} />
      {/* Crosshairs */}
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: `1px solid ${color}40` }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: `1px solid ${color}40` }} />
      {/* Marker dot */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 16, height: 16, borderRadius: '50%',
        background: `${color}30`, border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontWeight: 700, color,
      }}>{markerLabel}</div>
      {/* Label */}
      <div style={{
        position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
        fontSize: 9, fontWeight: 700, color, letterSpacing: 0.5,
      }}>{label}</div>
    </div>
  );
}
```

### 4F. Draggable markers on field image
Use touch events on the field image container:
- Detect which marker is closest to touch start point
- On move: update that marker's X position, update BOTH markers' Y position (Y-lock)
- Show calculated center point (small amber dot at midpoint)

```jsx
// Marker positions are normalized 0-1
const centerX = (calibration.homeBase.x + calibration.awayBase.x) / 2;
const centerY = calibration.homeBase.y; // same for both due to Y-lock
```

### 4G. Dorito side selector
Two pills: "Top ▲" and "Bottom ▼". Use `Btn` variant="default" size="sm" with `active` prop. Stores `data.doritoSide = 'top' | 'bottom'`.

### 4H. Center verification
Below zoom panels, show a status indicator:
- If markers are placed and Y matches: `✓ Field center calculated` (green text)
- Use `COLORS.success` color

---

## Part 5: Step 3 — Vision Scan

### 5A. Purpose
Send field image to Claude Vision API. AI detects bunker shapes on the LEFT HALF of the field, returns type + position. App mirrors results to right half. User reviews and accepts.

### 5B. Layout — scanning state
```
Step 3 of 3
SCAN BUNKERS
─────────────────────────────────────────

  ┌───────────────────────────────────┐
  │                                   │
  │         Scanning field...         │
  │         [spinner]                 │
  │                                   │
  └───────────────────────────────────┘
```

### 5C. Layout — results state
```
Step 3 of 3
SCAN BUNKERS
AI detected 14 bunkers → mirrored to 28
─────────────────────────────────────────

┌──────────── field with markers ─────────┐
│  ■ Dog       ■ Dallas                   │
│       ■ Dexter                          │
│                   ◆ Drago    ◇ Drago    │
│  ■ Snoop                                │
│       ■ Snake1                          │
└─────────────────────────────────────────┘

■ Confident  ◇ Mirrored  ⬡ Needs review

┌─ Detected bunkers ──────────────────────┐
│ ● Med. Dorito        → Dog         ✓    │
│ ● Giant Plus         → Dallas      ✓    │
│ ● Can                → Snoop       ✓    │
│ ○ Unknown            → ?          tap   │
└─────────────────────────────────────────┘

[+ Add manual]  [████ Accept all ✓ ████]
```

### 5D. Vision API call
```jsx
async function scanBunkers(imageBase64, calibration, doritoSide) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    alert('Vision API key not configured. Add VITE_ANTHROPIC_API_KEY to .env');
    return null;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64.split(',')[1] } },
          { type: 'text', text: VISION_PROMPT(calibration, doritoSide) },
        ],
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  // Parse JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]);
}
```

### 5E. Vision prompt
```js
function VISION_PROMPT(calibration, doritoSide) {
  return `You are analyzing a paintball field layout image. 

The field is symmetric — I only need you to analyze the LEFT HALF of the image (from the left edge to the center line).

For each bunker you detect on the LEFT HALF, return:
- type: the bunker shape abbreviation from this list:
  SD (Small Dorito/pyramid), MD (Medium Dorito), GD (Giant Dorito),
  Tr (Tree/small cylinder), R (Rollie), C (Can/cylinder), 
  Br (Brick/rectangle), Ck (Cake/hexagon), MW (Mini Wedge),
  GP (Giant Plus/star), T (Temple), GB (Giant Brick),
  Wg (Wing), GW (Giant Wing), SB (Snake Beam/long narrow rectangle),
  TCK (Tall Cake), Az (Aztec), Mn (Monolith), MT (Maya Temple), Pn (Pin)
- x: horizontal position as 0-1 fraction (0=left edge, 0.5=center line). Only values 0-0.5.
- y: vertical position as 0-1 fraction (0=top edge, 1=bottom edge)
- confidence: "high" or "low"

The ${doritoSide === 'top' ? 'top' : 'bottom'} half of the field is the DORITO side (pyramids/doritos).
The ${doritoSide === 'top' ? 'bottom' : 'top'} half is the SNAKE side (snake beams + cans).

Respond with ONLY a JSON array, no other text:
[{"type":"MD","x":0.15,"y":0.30,"confidence":"high"}, ...]`;
}
```

### 5F. Processing Vision results
```jsx
function processVisionResults(detected, doritoSide) {
  const bunkers = [];

  detected.forEach((d, i) => {
    const side = getBunkerSide(d.x, d.y, doritoSide);
    const positions = POSITION_NAMES[side] || POSITION_NAMES.center;

    // Auto-suggest position name based on location
    const suggestedName = suggestPositionName(d.x, d.y, side, bunkers);
    const suggestedType = d.type || 'Br';

    // Master bunker
    const masterId = uid();
    bunkers.push({
      id: masterId,
      positionName: suggestedName,
      type: suggestedType,
      x: d.x,
      y: d.y,
      confidence: d.confidence,
      role: 'master',
    });

    // Mirror bunker (skip if on center line)
    if (Math.abs(d.x - 0.5) > 0.02) {
      bunkers.push({
        id: uid(),
        positionName: suggestedName,
        type: suggestedType,
        x: 1 - d.x,
        y: d.y, // Y same for standard mirror
        confidence: d.confidence,
        role: 'mirror',
        masterId,
      });
    }
  });

  return bunkers;
}
```

### 5G. Position name suggestion
Based on (x, y) location on the field, suggest the most likely position name:
```jsx
function suggestPositionName(x, y, side, existingBunkers) {
  // Already-used names
  const used = new Set(existingBunkers.map(b => b.positionName));

  // Heuristic rules based on position
  const candidates = [];

  if (side === 'dorito') {
    if (y < 0.2 && x < 0.15) candidates.push('Palma');
    if (y > 0.2 && y < 0.4 && x < 0.2) candidates.push('Dog');
    if (y > 0.3 && y < 0.5 && x > 0.15 && x < 0.28) candidates.push('Dexter');
    if (y < 0.3 && x > 0.2 && x < 0.35) candidates.push('Dallas');
    if (y > 0.35 && x > 0.25) candidates.push('Dreams', 'Dykta');
    if (x > 0.4) candidates.push('Dorito50', 'Drago');
  } else if (side === 'snake') {
    if (y > 0.8 && x < 0.15) candidates.push('Cobra');
    if (y > 0.6 && y < 0.75 && x < 0.18) candidates.push('Snoop');
    if (y > 0.6 && y < 0.75 && x > 0.15) candidates.push('Ring');
    if (y > 0.7 && x > 0.2 && x < 0.3) candidates.push('Snake1');
    if (y > 0.7 && x > 0.28 && x < 0.38) candidates.push('Snake2');
    if (y > 0.7 && x > 0.36) candidates.push('Snake3', 'Snake50');
    if (y > 0.5 && y < 0.65) candidates.push('Sweet', 'Soda', 'Suka');
  } else {
    if (x > 0.4 && y < 0.45) candidates.push('Drago');
    if (x > 0.45 && y > 0.45 && y < 0.55) candidates.push('Gwiazda', 'Środek');
    if (x > 0.35 && y > 0.55) candidates.push('Hiena');
    if (x < 0.25 && y > 0.45 && y < 0.6) candidates.push('Hammer');
  }

  // Return first unused candidate, or empty
  return candidates.find(c => !used.has(c)) || '';
}
```

### 5H. Review UI — detected bunker list
Each detected bunker shown as a row:
```jsx
function BunkerReviewRow({ bunker, onEdit, onAccept }) {
  const typeInfo = bunkerByAbbr(bunker.type) || {};
  const isAccepted = bunker.accepted;
  const needsReview = bunker.confidence === 'low' || !bunker.positionName;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderBottom: `1px solid ${COLORS.border}30`,
    }}>
      {/* Confidence dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: needsReview ? COLORS.accent : COLORS.success,
      }} />
      {/* Type name */}
      <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 600, flex: 1 }}>
        {typeInfo.name || bunker.type}
      </span>
      {/* Suggested position */}
      <span style={{ color: COLORS.accent, fontSize: 11 }}>
        → {bunker.positionName || '?'}
      </span>
      {/* Action */}
      {isAccepted ? (
        <span style={{ color: COLORS.success, fontSize: 10 }}>✓</span>
      ) : (
        <Btn variant="ghost" size="sm" onClick={() => onEdit(bunker)}>tap</Btn>
      )}
    </div>
  );
}
```

### 5I. "Accept all" action
Marks all confident bunkers as accepted. Uncertain ones remain for review. On "Finish", all accepted bunkers are saved to the layout document.

### 5J. "+ Add manual" button
Opens the standard BunkerCard (from CC_BRIEF_LAYOUT_REDESIGN.md Part 4) in "new" mode. User taps on field to place, then names/types in the card.

### 5K. Skip vision scan
If API key not configured or user prefers manual setup, show a skip option:
```jsx
<Btn variant="ghost" onClick={handleFinish} style={{ width: '100%', marginTop: 8 }}>
  Skip — I'll add bunkers manually
</Btn>
```
This creates the layout without bunkers, user adds them on LayoutDetailPage.

---

## Part 6: Calibration Corrections (post-setup)

### 6A. Re-calibrate from LayoutDetailPage
Accessible via ⋮ menu → "Re-calibrate field". Opens the same CalibrationView component used in wizard Step 2, but as a modal/page overlay.

### 6B. CalibrationView as reusable component
Extract Step 2 logic into `src/components/CalibrationView.jsx` so it can be used both in the wizard and in the re-calibrate flow.

Props:
```jsx
<CalibrationView
  image={layout.fieldImage}
  calibration={calibration}
  onChange={setCalibration}
  doritoSide={doritoSide}
  onDoritoSideChange={setDoritoSide}
/>
```

---

## Part 7: Files

| File | Action |
|------|--------|
| `src/pages/LayoutWizardPage.jsx` | **New.** Full wizard with 3 steps |
| `src/components/CalibrationView.jsx` | **New.** Reusable calibration UI with 3 zoom panels |
| `src/components/VisionScan.jsx` | **New.** Vision API call + review UI |
| `src/pages/LayoutsPage.jsx` | **Modify.** Remove new layout modal, navigate to `/layout/new` |
| `src/App.jsx` | **Modify.** Add `/layout/new` route |
| `src/utils/helpers.js` | **Modify.** Add `suggestPositionName()` |

---

## Part 8: Implementation Order

1. ProgressBar component + LayoutWizardPage shell with step navigation
2. Step 1 (Basic Info) — form with league "Other" option
3. CalibrationView component — draggable markers with Y-lock + 3 zoom panels
4. Step 2 integration — CalibrationView + dorito side selector
5. VisionScan component — API call + result processing
6. Step 3 integration — scan results review + accept/edit flow
7. LayoutsPage update — remove modal, navigate to wizard
8. Re-calibrate from LayoutDetailPage ⋮ menu

Run `npm run precommit` before each commit.

---

## ⚠️ CRITICAL: Design System Compliance

**Every component in this wizard MUST use the existing design system. No exceptions.**

### Required imports for every new file:
```jsx
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, responsive } from '../utils/theme';
import { Btn, Input, Select, Checkbox, Modal, Icons, EmptyState, PageHeader } from '../components/ui';
import { useDevice } from '../hooks/useDevice';
```

### Rules:
1. **No hardcoded colors.** Use `COLORS.bg`, `COLORS.surface`, `COLORS.surfaceLight`, `COLORS.border`, `COLORS.accent`, `COLORS.text`, `COLORS.textDim`, `COLORS.textMuted`, `COLORS.success`, `COLORS.danger` etc.
2. **No hardcoded fonts.** Use `FONT` for fontFamily, `FONT_SIZE.*` or `TOUCH.font*` for sizes.
3. **No hardcoded spacing.** Use `SPACE.xs/sm/md/lg/xl/xxl`, `R.layout.padding`, `R.layout.gap`.
4. **No hardcoded radii.** Use `RADIUS.sm/md/lg/xl`.
5. **Touch targets:** min `TOUCH.minTarget` (44px) on mobile.
6. **Buttons:** use `<Btn variant="accent/default/ghost/danger">` — never custom button styles.
7. **Inputs:** use `<Input>` and `<Select>` from ui.jsx — never raw `<input>` or `<select>`.
8. **Cards/containers:** bg=`COLORS.surfaceLight`, border=`1px solid ${COLORS.border}`, borderRadius=`RADIUS.lg` (10px).
9. **Section titles:** uppercase, `COLORS.textMuted`, fontSize `FONT_SIZE.xs`, letterSpacing 1.2px.
10. **Page structure:** `maxWidth: R.layout.maxWidth || 640`, `margin: '0 auto'`, padding `R.layout.padding`.
11. **Bottom sheets:** use `<ActionSheet>` or `<Modal>` from ui.jsx — never custom overlays.
12. **Responsive:** use `const device = useDevice(); const R = responsive(device.type);` in every page/component.

### Pattern reference — copy these EXACTLY from existing pages:
- **PageHeader:** see `src/components/PageHeader.jsx`
- **Card layout:** see any `<Card>` usage in `TeamsPage.jsx` or `TournamentPage.jsx`
- **ActionSheet menu:** see `MatchPage.jsx` MoreBtn + ActionSheet pattern
- **Sticky bottom button:** see `LayoutDetailPage.jsx` new tactic button
- **Form fields:** see any `<Modal>` with `<Input>` in `TeamsPage.jsx`

**If the code example in THIS brief conflicts with the design system, the design system wins.**
