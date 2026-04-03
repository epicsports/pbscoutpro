# NEXT TASKS — Read this, work top to bottom
## For Claude Code — push after each task

**Last updated:** 2026-04-03 by Opus
**Context:** CLAUDE.md has project setup. theme.js has color/sizing tokens.
All styles are inline JSX using COLORS/FONT/TOUCH from theme.js.

---

## 🔥 PRIORITY 0: Bugs & Consistency (do first)

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

## PHASE 1.5: BunkerCard Wizard

### Task 1.5: BunkerCard wizard + position fine-tuning
**File:** `src/components/BunkerCard.jsx`

New bunkers → 2-step wizard:
- Step 1: Name (auto-focus) + X/Y position sliders (0-1, step 0.01, live preview) + Mirror checkbox → [Dalej]
- Step 2: Type chips grouped (Niskie/Średnie/Wysokie), auto-guessed from name → [Zapisz]

Existing bunkers → single view (all fields editable) + [Usuń] + drag hint.

After save → card closes, canvas stays in add mode.

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
