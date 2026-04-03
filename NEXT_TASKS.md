# NEXT TASKS — Read this, work top to bottom
## For Claude Code — push after each task

**Last updated:** 2026-04-03 by Opus
**Context:** CLAUDE.md has project setup. theme.js has color/sizing tokens.
All styles are inline JSX using COLORS/FONT/TOUCH from theme.js.

---

## 🔥🔥 PRIORITY -1: Canvas Interaction Overhaul (do FIRST, before everything)

### Task CRITICAL: Pinch-to-zoom + Pan + Loupe in FieldCanvas
**File:** `src/components/FieldCanvas.jsx` + `src/components/FieldEditor.jsx`

This is the MOST important task. Without this, mobile editing is unusable.

**DELETE the old zoom toggle** (the 🔍 button that does `transform:scale(2)`).
Replace with proper multi-touch gesture handling:

#### Gestures:
```
TWO fingers pinch  → zoom in/out (scale 1× to 4×, smooth)
ONE finger swipe   → pan canvas (when zoomed > 1×)
ONE finger tap     → action (place player, select bunker, place shot, etc.)
ONE finger drag    → drag existing element (player, bunker)
```

#### Implementation — transform state:
```javascript
// Add to FieldCanvas state:
const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
const lastTouchDist = useRef(null);  // for pinch tracking
const lastTouchCenter = useRef(null); // for pan tracking

// Apply transform in draw function:
ctx.save();
ctx.translate(viewTransform.x, viewTransform.y);
ctx.scale(viewTransform.scale, viewTransform.scale);
// ... draw everything ...
ctx.restore();

// Convert screen coords to canvas coords for interactions:
function screenToCanvas(screenX, screenY) {
  return {
    x: (screenX - viewTransform.x) / viewTransform.scale,
    y: (screenY - viewTransform.y) / viewTransform.scale,
  };
}
```

#### Touch handler:
```javascript
function handleTouchStart(e) {
  if (e.touches.length === 2) {
    // Pinch start — record distance + center
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDist.current = Math.sqrt(dx*dx + dy*dy);
    lastTouchCenter.current = {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    };
    return; // don't trigger placement
  }
  // Single touch — existing logic (tap/drag)
}

function handleTouchMove(e) {
  if (e.touches.length === 2 && lastTouchDist.current) {
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const scaleChange = dist / lastTouchDist.current;
    const center = {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    };
    
    setViewTransform(prev => {
      const newScale = Math.max(1, Math.min(4, prev.scale * scaleChange));
      // Zoom toward pinch center
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = center.x - rect.left;
      const cy = center.y - rect.top;
      const dx = cx - prev.x;
      const dy = cy - prev.y;
      const f = newScale / prev.scale;
      return {
        scale: newScale,
        x: cx - dx * f,
        y: cy - dy * f,
      };
    });
    
    lastTouchDist.current = dist;
    lastTouchCenter.current = center;
    return;
  }
  
  // Single touch + zoomed → pan
  if (e.touches.length === 1 && viewTransform.scale > 1 && !isDraggingElement) {
    // pan logic
  }
}

function handleTouchEnd(e) {
  if (e.touches.length < 2) {
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
  }
}
```

#### Reset zoom button:
When zoomed (scale > 1), show small "1:1" button in corner to reset:
```jsx
{viewTransform.scale > 1.05 && (
  <button onClick={() => setViewTransform({x:0, y:0, scale:1})}
    style={{ position:'absolute', top:8, right:8, ... }}>
    1:1
  </button>
)}
```

#### FieldEditor changes:
- DELETE the `zoom` prop and `onZoom` callback
- DELETE the zoom toggle button (🔍)
- DELETE the focus mode floating pills (they were for zoom mode)
- FieldCanvas handles its own zoom internally now

---

### Task CRITICAL-2: Fine-tuning loupe for placement precision
**File:** `src/components/FieldCanvas.jsx`

When user touches canvas in ANY interactive mode, show magnifying loupe.
This is a PRECISION tool — shows 3× zoom of the area under their finger.

**Triggers:** ANY touchstart/mousedown when an interactive mode is active:
- Player placement, player drag
- Bunker placement, bunker drag
- Shot placement
- Calibration marker drag
- Zone polygon point placement
- Counter-play path drawing

**Loupe specs:**
- 100px diameter circle
- 3× magnification of area under touch point
- Crosshair at center (thin amber lines)
- Amber border ring
- Smart position: above finger (default), then OPPOSITE-hand side,
  then below, then same side. Based on handedness preference.

**Handedness setting:**
On first app launch, show onboarding: "Którą ręką obsługujesz telefon?"
[🤚 Prawa] [🤚 Lewa]. Store: `localStorage.setItem('pbscoutpro-handedness', 'right'|'left')`.
Default: 'right'. Also add toggle in settings/profile if we add one later.

Right-handed user → finger on right side → loupe goes LEFT.
Left-handed user → finger on left side → loupe goes RIGHT.

**Rendering:** After ALL other draw calls, render loupe last (on top):
```javascript
function drawLoupe(ctx, canvas, touchX, touchY, canvasW, canvasH) {
  const loupeR = 50;
  const zoom = 3;
  const sourceR = loupeR / zoom;
  const gap = 40;
  const hand = localStorage.getItem('pbscoutpro-handedness') || 'right';
  const oppositeX = hand === 'right' ? -1 : 1; // LEFT for right-handed
  
  // Priority: 1) above  2) opposite-hand side  3) below  4) same side
  let lx = touchX, ly = touchY - loupeR - gap;
  
  if (ly - loupeR < 0) {
    // Can't go above → opposite-hand side
    ly = touchY;
    lx = touchX + oppositeX * (loupeR + gap);
  }
  if (lx - loupeR < 0 || lx + loupeR > canvasW) {
    // Doesn't fit → try below
    lx = touchX;
    ly = touchY + loupeR + gap;
  }
  if (ly + loupeR > canvasH) {
    // Last resort → same side
    ly = touchY;
    lx = touchX - oppositeX * (loupeR + gap);
  }
  
  ctx.save();
  
  // Clip to circle
  ctx.beginPath();
  ctx.arc(lx, ly, loupeR, 0, Math.PI * 2);
  ctx.clip();
  
  // Draw magnified canvas area
  ctx.drawImage(canvas,
    touchX - sourceR, touchY - sourceR, sourceR * 2, sourceR * 2,
    lx - loupeR, ly - loupeR, loupeR * 2, loupeR * 2
  );
  
  ctx.restore();
  
  // Border
  ctx.beginPath();
  ctx.arc(lx, ly, loupeR, 0, Math.PI * 2);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  
  // Crosshair
  ctx.strokeStyle = 'rgba(250,204,21,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx - 10, ly); ctx.lineTo(lx + 10, ly);
  ctx.moveTo(lx, ly - 10); ctx.lineTo(lx, ly + 10);
  ctx.stroke();
}
```

**State:** track touch position in FieldCanvas:
```javascript
const [activeTouchPos, setActiveTouchPos] = useState(null);
// Set on touchstart/mousemove in interactive mode
// Clear on touchend/mouseup
// In draw(): if (activeTouchPos) drawLoupe(...)
```

---

## 🔥 PRIORITY 0: Bugs & Consistency (after canvas overhaul)

### Task 0.0: TournamentPage — compact header, layout as preview module
**File:** `src/pages/TournamentPage.jsx`

**Problem:** Too much vertical space wasted. Tournament name, PXL badge, year, 
edit button, Div.1 dropdown, FIELD LAYOUT header, Change/Upload/Unlink buttons,
Lines toggle, layout preview — all take HALF the screen before you see teams.

**Fix — compact tournament header:**
```
┌─ ← Start ────────────────────────┐
│                                    │
│ Pxl Preseason Cup  PXL  2026  ✏️  │  ← title IS the header. Edit = modal.
│ Div.1 ▾                           │  ← division picker (if divisions exist)
│                                    │
│ ┌────────────────────────────────┐ │
│ │  Layout preview (Tampa)        │ │  ← tappable image, same toggles as
│ │  ☑Nazwy ☑Linie ☐Strefy       │ │     LayoutDetailPage preview
│ │  [layout canvas, full width]   │ │
│ └────────────────────────────────┘ │
│    ↑ tap layout image → go to     │
│      /layout/{id} for full edit   │
│                                    │
│ [All] [Div.1●] [Div.2] [Div.3]   │  ← division filter tabs
│                                    │
│ 🏴 Drużyny (13)  [Import schedule]│
│  Ata Warsaw · 8 players          > │
│  ...                               │
└────────────────────────────────────┘
```

**Key changes:**
1. Title in sticky header bar (not a separate section). PXL badge + year inline.
2. "Edit" opens modal (existing pattern) — NOT separate UI elements.
3. Remove: "FIELD LAYOUT (Tampa)" header text, "Change layout" button,
   "Upload custom" button, "Unlink" text. Instead: tap layout image → 
   navigate to layout detail page for full editing.
4. Layout preview: uses FieldCanvas (same as LayoutDetailPage preview section),
   with toggle checkboxes (Nazwy, Linie, Strefy). Full width.
5. If no layout linked: show "📷 Przypisz layout" button.
6. Division tabs: horizontal, below layout preview.

**Buttons hidden into Edit modal:**
- Change layout → in edit modal
- Upload custom image → in edit modal  
- Unlink layout → in edit modal
- Division management → in edit modal

### Task 0.0b: MatchPage — map-first redesign with gesture modes
**File:** `src/pages/MatchPage.jsx`

**Research basis:** Apple HIG gestures, Map UI Design patterns (mapuipatterns.com,
eleken.co, maplibrary.org). Key insight: pan/zoom and tap-to-place are TWO
different interaction patterns that must NOT compete for the same gesture.

**Problem:** Canvas is not pannable/zoomable. Single tap = place player (no way to
explore the field). Bottom half is information overload: Counter-play, Positions/
Shots/Opp toggles, 5 player chips (2 rows), Player dropdown, Hit button, Heatmap,
Point outcome buttons, More info, SAVE POINT. That's ~12 elements in 40% of screen.

**Fix — map-first with explicit modes:**

Default interaction = PAN/ZOOM (explore the field):
- Pinch = zoom (standard, already works if implemented)
- Single finger swipe = pan canvas
- Tap on player circle = SELECT that player (highlight, show info)
- Tap on empty = nothing (safe, no accidental placement)

Edit mode = activated by tapping an action button:
- 📍 Place → tap on canvas = place selected player at position
- 💀 Hit → tap player circle = mark as eliminated
- 📷 Shots → tap canvas = place shot marker for selected player

**New layout:**
```
┌─ ← Pxl Preseason Cup ────────────┐
│ RING vs VIKING · Punkt 3 · W 2:0 │  ← compact match info in header
│                                    │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ │     CANVAS — 65-70% screen    │ │
│ │     default: pan & zoom       │ │
│ │                                │ │
│ │                          [🔧] │ │  ← FAB for analysis tools
│ └────────────────────────────────┘ │
│                                    │
│ [P1] [P2] [P3] [P4] [P5]        │  ← player strip (horizontal)
│                                    │
│ [📍Place] [💀Hit] [📷Shot] [✓OK]│  ← action bar
└────────────────────────────────────┘
```

**Player strip:** horizontal row of 5 chips. Each chip = player color dot +
number + nickname. Tap = select (amber border). Eliminated = gray + 💀.
Horizontal scroll if names are long.

**Action bar:** 4 buttons, always visible at bottom.
- 📍 Place: toggle. Active = amber bg. Tap canvas = place selected player.
  Tap again = deactivate (back to pan mode).
- 💀 Hit: toggle. Active = red bg. Tap player on canvas = eliminate.
- 📷 Shot: toggle. Active = blue bg. Tap canvas = place shot for selected player.
- ✓ OK: opens bottom sheet with point outcome + save.

Only ONE action can be active at a time. Tapping another deactivates the current.

**✓ OK bottom sheet:**
```
┌── Wynik punktu ──────────────────┐
│                                   │
│ [✅ {homeName}] [❌ {awayName}]  │
│ [⏱ Czas]                         │
│                                   │
│ [▸ Więcej opcji]  (collapsed)    │
│   Notatki: [___________]         │
│                                   │
│      [✓ ZAPISZ PUNKT]           │
└───────────────────────────────────┘
```

**🔧 FAB (analysis tools)** — positioned bottom-right of canvas:
Tap → radial or vertical menu:
- 🔥 Visibility heatmap
- 🎯 Counter-play
- 👁 Opponent layer
- 📊 Heatmap overlay
- ✏️ Freehand draw

These are ANALYSIS tools — used occasionally, not during active scouting.
They should not compete with core scouting UI.

**Zoom implementation:**
Replace current binary zoom with proper pinch-to-zoom:
```javascript
// In FieldCanvas, track transform state:
const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
// Apply to canvas rendering:
ctx.setTransform(scale, 0, 0, scale, x, y);
// Handle touch: pinch = scale, pan = translate
// Clamp: scale 1-4, position within bounds
```
This allows natural map-like exploration with two fingers.

**Remove from visible UI (moved to FAB or bottom sheet):**
- Counter-play button
- Positions/Shots/Opp toggle row
- Heatmap toggle
- "More info" section
- Player dropdown (replaced by player strip)

### Task 0.1: Unify headers — iOS-style back on ALL detail pages
**Problem:** ScoutedTeamPage has iOS-style "← Tournament name" back button.
All other pages still use breadcrumbs via Header component. Inconsistent.

**Fix pattern:**
```jsx
// Detail pages: show back arrow + parent page name (tappable, amber)
<div style={{
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
  background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
}}>
  <div onClick={() => navigate(backPath)}
    style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: COLORS.accent }}>
    <Icons.Back />
    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm }}>{parentName}</span>
  </div>
</div>
```

Pages to fix (back label → path):
- `MatchPage.jsx` → "← {tournament.name}" → `/tournament/{id}`
- `TacticPage.jsx` → "← {layout or tournament name}" → back
- `TournamentPage.jsx` → "← Start" → `/`
- `TeamDetailPage.jsx` → "← Drużyny" → `/teams`  
- `LayoutDetailPage.jsx` → "← Layouty" → `/layouts`

Tab destination pages (Home, Layouts, Teams, Players): NO back arrow.
Just show page title. They use bottom nav for navigation.

### Task 0.2: Polish labels — translate to Polish
- Bottom nav: Home→Start, Layouts→Layouty, Teams→Drużyny, Players→Zawodnicy
- "Layouts & Tactics" → "Layouty"
- "Players" (page title) → "Zawodnicy"
- "Teams" (page title) → "Drużyny"
- "Positions" → "Pozycje", "Shots" → "Strzały"
- "Roster" → "Skład", "Matches" → "Mecze"
- "Add team" → "Dodaj drużynę", "Add match" → "Dodaj mecz"
- "Import schedule" → "Import harmonogramu"
- "From layout" → "Z layoutu", "Hidden" → "Ukryte"

### Task 0.3: Bottom nav padding
Content hides behind fixed bottom nav. Fix:
Add `paddingBottom: 64` to main container on tab pages
(HomePage, LayoutsPage, TeamsPage, PlayersPage).

### Task 0.4: Move Import CSV from Home to Players page
Remove from HomePage. Add as secondary button on PlayersPage header area.

---

## PHASE 1: Home Dashboard

### Task 1.1: Home page → Dashboard
**File:** `src/pages/HomePage.jsx`

Replace current layout with dashboard. Remove sections that duplicate bottom nav.

Structure:
- ⚡ Ostatnie punkty (3) — horizontal scroll cards with outcome + score
- 🎯 Ostatnie mecze (3) — list cards with teams, score, date
- 🏆 Aktywny turniej (1) — big card, tap → TournamentPage  
- [+ Nowy turniej] button
- 🏆 Turnieje — filterable list (existing, keep)
- Footer: v0.5 · Jacek Parczewski

Data: scan matches/points across tournaments for recents.

---

## PHASE 1.5: BunkerCard + Loupe + Canvas Interactions

### Task 1.5a: BunkerCard — don't cover the canvas
**Problem:** When BunkerCard opens, user can't see which bunker they're editing.

**Fix:**
- BunkerCard takes max 35% screen height (not 50%)
- Canvas auto-scrolls so selected bunker is ABOVE the card
- Selected bunker gets pulsing amber ring on canvas
- Card title shows: "✏️ PALMA" (bunker name, not generic "Nowy bunkier")
- X/Y sliders for fine-tuning position (range 0-1, step 0.01, live preview)

### ~~Task 1.5b, 1.5c~~ — MOVED to PRIORITY -1 (Task CRITICAL + CRITICAL-2)
Pinch-to-zoom + loupe are now the top priority. See top of this file.

### Task 1.5d: Export layout as image
**File:** `src/pages/LayoutDetailPage.jsx`

Add "📷 Eksportuj" button (in Setup modal or as 3rd bottom button).
Uses `canvas.toDataURL('image/png')` → creates download link.
On mobile: opens share sheet via `navigator.share({ files: [blob] })`
if available, otherwise triggers download.

---

## PHASE 2: Tournament Divisions

### Task 2.1: Firestore model — `division` field
- Tournament: `divisions: ['Div.1', 'Div.2']`
- Scouted team: `division: 'Div.1'`
- Match: `division: 'Div.1'`

### Task 2.2: Division tabs in TournamentPage
Tab bar: [Wszystko] [Div.1] [Div.2]
Filter teams + matches by active tab.

### Task 2.3: Division picker on add team/match
### Task 2.4: Tournament edit — manage divisions (chip tags)

---

## PHASE 3: Concurrent Scouting (Split Sides)

### Task 3.1: homeData/awayData per point
Split point data into two independent objects. Migration helper for old format.

### Task 3.2: Side claim UI
"Wybierz stronę" screen → claim with uid → lock indicator.

### Task 3.3: Dual-write with Firestore dot notation
Each coach writes only their side. onSnapshot for live sync.

### Task 3.4: Merge view (both sides combined)

---

## PHASE 4: Features

### Task 4.1: OCR bunker detection (FEATURE_OCR_LANDSCAPE.md)
Claude Vision API reads bunker names from layout image.

### Task 4.2: Landscape editing mode (FEATURE_OCR_LANDSCAPE.md)
Canvas fullscreen in landscape. BunkerCard slides from right.

---

## PHASE 5: Polish (POLISH_SPRINT.md remaining items)
- [ ] PWA manifest + service worker + offline
- [ ] App icon/favicon
- [ ] Empty states with illustrations
- [ ] WCAG contrast audit
- [ ] OffscreenCanvas heatmap optimization
- [ ] Export tactic as image

---

## SECURITY (SECURITY.md)
- [ ] Phase 3: Replace `isAdmin` localStorage with `adminUid` in Firestore

---

## Rules
- Inline JSX styles with COLORS/FONT/TOUCH from theme.js — no CSS modules
- Labels in Polish
- Mobile-first (test 375px)
- Don't modify `src/workers/ballisticsEngine.js` — Opus territory
- Push after each task, descriptive commit
- Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`
