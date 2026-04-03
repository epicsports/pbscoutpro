# NEXT TASKS — For Claude Code
## Work top to bottom. Push after each task. Test on 375px mobile.

**Last updated:** 2026-04-03 by Opus
**Rules:** Inline JSX styles (COLORS/FONT/TOUCH from theme.js). Labels in Polish.
Don't touch `src/workers/ballisticsEngine.js` (Opus territory).
Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`.

---

# SESSION 1: Canvas Foundation
> These tasks fix the core interaction model. Everything else depends on them.

## 1.1 Pinch-to-zoom + Pan in FieldCanvas
**Files:** `src/components/FieldCanvas.jsx`, `src/components/FieldEditor.jsx`

**DELETE** the old zoom toggle button (🔍) and `transform:scale(2)` hack.
Replace with proper multi-touch:

```
TWO fingers pinch → zoom (scale 1× to 4×, smooth)
ONE finger swipe  → pan canvas (when scale > 1×)
ONE finger tap    → action (place/select/etc — existing logic)
ONE finger drag   → drag element (player, bunker — existing logic)
Double-tap        → reset to 1:1
```

**State:**
```javascript
const [zoom, setZoom] = useState(1);      // 1 to 4
const [pan, setPan]   = useState({x:0, y:0});
const pinchRef = useRef(null);            // { startDist, startZoom, startPan }
```

**Touch handlers:**
```javascript
// touchstart: if 2 fingers → record dist + center, cancel action
// touchmove:  if 2 fingers → compute new scale, zoom toward pinch center
//             if 1 finger + zoomed → pan
// touchend:   if < 2 fingers → clear pinch state
```

**Apply in draw:**
```javascript
ctx.save();
ctx.translate(pan.x, pan.y);
ctx.scale(zoom, zoom);
// ... all drawing ...
ctx.restore();
// ... draw loupe AFTER restore (in screen space) ...
```

**Convert screen→game coords** (for all interactions):
```javascript
function screenToGame(clientX, clientY) {
  const rect = canvasRef.current.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  return {
    x: (sx - pan.x) / zoom / canvasSize.w,  // normalized 0-1
    y: (sy - pan.y) / zoom / canvasSize.h,
  };
}
```

**Reset button:** When zoom > 1.05, show small "1:1" in top-right corner.

**FieldEditor changes:**
- Delete `zoom`, `onZoom`, `showZoom` props
- Delete zoom toggle button and focus-mode floating pills
- FieldCanvas handles zoom internally

## 1.2 Fix Loupe — DPR + handedness
**File:** `src/components/FieldCanvas.jsx`

The loupe has a DPR offset bug. Canvas is `w*2 × h*2` with `ctx.scale(2,2)`.
Loupe source coords must account for this:
```javascript
const dpr = 2;
const srcX = touchX * dpr, srcY = touchY * dpr;
const srcR = sourceR * dpr;
ctx.drawImage(canvas,
  Math.max(0, srcX - srcR), Math.max(0, srcY - srcR), srcR * 2, srcR * 2,
  lx - loupeR, ly - loupeR, loupeR * 2, loupeR * 2
);
```

**Handedness positioning** (stored in `localStorage.pbscoutpro-handedness`):
```
Right-handed (default): loupe goes LEFT of finger
Left-handed: loupe goes RIGHT of finger

Priority: 1) above  2) opposite-hand side  3) below  4) same side
```

## 1.3 Handedness onboarding
**File:** `src/pages/LoginGate.jsx` or new `src/components/HandednessPrompt.jsx`

On first launch (no `pbscoutpro-handedness` in localStorage), show:
```
┌────────────────────────────────┐
│  Którą ręką obsługujesz        │
│  telefon?                       │
│                                 │
│  [🤚 Prawa]    [🤚 Lewa]      │
└────────────────────────────────┘
```
Store choice. Show only once. Can also be in a future settings page.

---

# SESSION 2: LayoutDetailPage — Mode Tabs
> Kill the Setup modal. Everything on one screen.

## 2.1 Replace Setup modal + action buttons with mode tabs
**File:** `src/pages/LayoutDetailPage.jsx`

**DELETE:** Setup modal, `setupModal` state, tactics bottom sheet.

**New bottom bar = mode tabs:**
```
[👁 Podgląd] [🏷 Bunkry] [⚙️ Linie] [📐 Kalibr.] [⚠️ Strefy] [⚔️ Taktyki]
```
Icon + short label. Horizontal scroll. Active = amber border.

Each mode changes:
1. What the **panel below canvas** shows (max 30% screen, scrollable)
2. How the **canvas responds** to touch

**👁 Podgląd** (default):
- Panel: checkboxes (Nazwy, Linie, Strefy)
- Canvas: read-only (pan/zoom only)

**🏷 Bunkry:**
- Panel: "Tap na pole aby dodać" + bunker count
- Canvas: tap = place/select bunker → BunkerCard opens
- BunkerCard: max 35% height, shows bunker name in title,
  X/Y sliders for fine-tuning, type picker, mirror checkbox

**⚙️ Linie:**
- Panel: Disco + Zeeker sliders (live preview on canvas)
- Canvas: shows lines updating in real-time

**📐 Kalibracja:**
- Panel: "Przeciągnij markery" + [Reset] + [🔍 OCR detect]
- Canvas: HOME/AWAY markers draggable directly on canvas

**⚠️ Strefy:**
- Panel: [🔴 Danger] [🟡 Sajgon] toggle + cofnij/wyczyść/OK
- Canvas: zone polygon drawing mode

**⚔️ Taktyki:**
- Panel: tactic list + [+ Nowa taktyka]
- Canvas: read-only preview
- Tap tactic → navigate to TacticPage

**Auto-save:** on mode switch, debounced 2s. Use existing `useSaveStatus`.

## 2.2 BunkerCard improvements
**File:** `src/components/BunkerCard.jsx`

- Max 35% screen height
- Title: "✏️ PALMA" (bunker name, not generic)
- Selected bunker gets pulsing amber ring on canvas
- Canvas auto-scrolls to keep edited bunker visible above card
- X/Y position sliders (0-1, step 0.01, live preview)
- Type picker: grouped chips (Niskie/Średnie/Wysokie), inline
- Drag hint: "💡 Przeciągnij żółtą kropkę na polu"

## 2.3 Export layout as PNG
Add "📷 Eksportuj" in Podgląd mode panel.
`canvas.toDataURL('image/png')` → `navigator.share({files:[blob]})` on mobile,
download link on desktop.

---

# SESSION 3: TacticPage — Mode Tabs
> See `TACTIC_WORKFLOW.md` for full spec.

## 3.1 Replace bottom clutter with mode tabs
**File:** `src/pages/TacticPage.jsx`

**Mode tabs:**
```
[📍 Pozycje] [🎯 Strzały] [✏️ Rysuj] [🎯 Counter] [💾 Zapisz]
```

**📍 Pozycje:** Player strip P1-P5. Tap canvas = place. Drag = move.
**🎯 Strzały:** Same player strip (shows shot count). Tap = place shot. Players frozen.
**✏️ Rysuj:** Freehand. Color/width picker. Players + shots DISABLED.
**🎯 Counter:** Dedicated flow: draw path → analyze → results. See TACTIC_WORKFLOW.md.
**💾 Zapisz:** Step description + save button. No canvas interaction.

Only ONE mode active. Switching modes = clean state.

## 3.2 "Save as tactic" from MatchPage
**File:** `src/pages/MatchPage.jsx`

After saving a point, show: `[📋 Zapisz jako taktykę do layoutu]`.
Creates layout tactic with `source: { type:'scouted', matchId, teamName, ... }`.

## 3.3 Layout tactics — split view
**File:** `src/pages/LayoutDetailPage.jsx` (Taktyki mode panel)

Two sections:
```
📝 Moje taktyki (2)
  Push dorito · 1 kroków       >

🔍 Ze scoutingu (2)
  RANGER Breakout · RNG vs PP  >
```

---

# SESSION 4: MatchPage — Map-First Redesign

## 4.1 Canvas-first scouting
**File:** `src/pages/MatchPage.jsx`

**Delete** current bottom half clutter (Counter-play button, Positions/Shots/Opp
toggles, player chip grid, Player dropdown, Hit button, Heatmap, etc.)

**New layout:**
```
← Pxl Preseason Cup
RING Warsaw  2:0  VIKINGS Black
┌──────────────────────────────┐
│     CANVAS (65-70% screen)   │
│     pinch-zoom + pan         │  ← from Session 1
│                        [🔧]  │  ← FAB for analysis tools
└──────────────────────────────┘
[P1] [P2] [P3] [P4] [P5]       ← player strip
[📍Place] [💀Hit] [📷Shot] [✓OK] ← action bar
```

**Default gesture = pan/zoom.** Player placement only when 📍 is active.

**Action bar modes** (only one active at a time):
- 📍 Place: tap canvas = place selected player
- 💀 Hit: tap player = eliminate
- 📷 Shot: tap canvas = place shot for selected player
- ✓ OK: opens bottom sheet with outcome + save

**🔧 FAB** (analysis tools, bottom-right of canvas):
- 🔥 Visibility heatmap
- 🎯 Counter-play
- 👁 Opponent layer
- 📊 Heatmap overlay
- ✏️ Freehand draw

## 4.2 Compact match header
Score bar: `RING Warsaw [2:0] VIKINGS Black` — one line.
No separate header + score + point counter. All compact.

---

# SESSION 5: Tournament Divisions

## 5.1 Firestore model
- Tournament: `divisions: ['Div.1', 'Div.2']`
- Scouted team: `division: 'Div.1'`
- Match: `division: 'Div.1'`

## 5.2 Division tabs in TournamentPage
Tab bar: `[Wszystko] [Div.1] [Div.2] [Div.3]`
Filter teams + matches by active tab.

## 5.3 Division picker when adding team/match
## 5.4 Tournament edit — manage divisions (chip tags)

## 5.5 TournamentPage — compact layout
Title in sticky header. Layout as preview module with toggles.
Tap layout → navigate to layout detail. Change/Upload/Unlink → edit modal.

---

# SESSION 6: Concurrent Scouting (Split Sides)

## 6.1 Data model — homeData/awayData per point
```javascript
{
  homeData: { players, shots, bumps, eliminations, scoutedBy, lastUpdate },
  awayData: { players, shots, bumps, eliminations, scoutedBy, lastUpdate },
}
```
Migration: old format → homeData, empty awayData.

## 6.2 Side claim UI
"Wybierz stronę" screen → claim with uid → lock indicator.

## 6.3 Dual-write with Firestore dot notation
`updateDoc(ref, { 'homeData.players': [...] })` — no conflict.
Canvas renders both sides. onSnapshot for live sync.

## 6.4 Merge view

---

# SESSION 7: Polish & Features

## 7.1 Consistency pass
- iOS-style back on ALL detail pages (see patterns below)
- Polish labels everywhere (Layouty, Drużyny, Zawodnicy, Skład, Mecze)
- Bottom nav padding on tab pages (paddingBottom: 64)
- Move Import CSV from Home to Players page

**Back button pattern:**
```jsx
<div style={{
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
  background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
}}>
  <div onClick={() => navigate(backPath)}
    style={{ display: 'flex', alignItems: 'center', gap: 4,
      cursor: 'pointer', color: COLORS.accent }}>
    <Icons.Back />
    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm }}>{parentName}</span>
  </div>
</div>
```
Tab pages (Home, Layouts, Teams, Players): NO back arrow, just title.

## 7.2 Home dashboard
Replace Home sections (duplicate of bottom nav) with:
- ⚡ Ostatnie punkty (3) — horizontal scroll cards
- 🎯 Ostatnie mecze (3) — list
- 🏆 Aktywny turniej (1) — big card
- [+ Nowy turniej]
- Tournament list (existing, with filters)

## 7.3 OCR + Landscape (see FEATURE_OCR_LANDSCAPE.md)
## 7.4 Security Phase 3 (see SECURITY.md) — server-side admin
## 7.5 WCAG contrast audit
## 7.6 OffscreenCanvas heatmap optimization

---

# Reference docs
- `TACTIC_WORKFLOW.md` — scout→save→counter pipeline, TacticPage modes
- `FEATURE_OCR_LANDSCAPE.md` — OCR bunker detection, landscape editing
- `SECURITY.md` — Firebase auth phases
- `POLISH_SPRINT.md` — remaining visual polish items
- `UX_AUDIT.md` — Smashing Magazine research findings
