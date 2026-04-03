# UI CONSISTENCY AUDIT — All Screens
**Date:** 2026-04-04
**Purpose:** Map every screen's UI patterns, find inconsistencies, define unified spec

---

## 1. HEADER PATTERNS

| Screen | Back target | Title | Subtitle | Right actions | Padding |
|--------|-------------|-------|----------|---------------|---------|
| **HomePage** | — (no back) | Logo image | — | Theme toggle, Logout | `10px 16px` |
| **LayoutsPage** | — (tab page) | "Layouts" text | — | — | `10px 16px` |
| **TeamsPage** | — (tab page) | "Teams" text | — | — | `10px 16px` |
| **PlayersPage** | — (tab page) | "Players" text | — | — | `10px 16px` |
| **LayoutDetailPage** | ← `/layouts` | Thumbnail + Name | LeagueBadge + YearBadge + "· N bunkers" | ✏️ Edit | `8px 16px` |
| **TournamentPage** | ← `/` | Tournament name | LeagueBadge + YearBadge + division | ✏️ Edit | `10px 16px` |
| **ScoutedTeamPage** | ← `/tournament/{id}` | Tournament name (back label) | — | — | `10px 16px` |
| **TacticPage** | ← Layout/Tournament | Back label (source name) | — | — | `10px 16px` |
| **MatchPage (heatmap)** | ← `/tournament/{id}` | Tournament name (back label) | — | — | `10px 16px` |
| **MatchPage (editor)** | ← `/tournament/{id}` | Match name | "Pt N" | — | `8px 16px` |
| **TeamDetailPage** | ← `/teams` | Team name | — | ✏️ Edit | `10px 16px` |

### INCONSISTENCIES:
1. **LayoutDetailPage uses 8px padding**, all others use 10px
2. **LayoutDetailPage has thumbnail** in header — no other screen does this
3. **Back label text** varies: some show parent name as text next to ←, some show only ←
4. **Title font size** varies: `TOUCH.fontBase` (Tournament) vs `TOUCH.fontSm` (Layout, Match)
5. **MatchPage editor** header is hidden during zoom — unique behavior

### PROPOSED STANDARD:
```
┌──────────────────────────────────────┐
│ ← [Parent]   Title   [LeagueBadge]  │  detail pages
│              [YearBadge]     [✏️]    │
├──────────────────────────────────────┤
│ Title                                │  tab pages (no back)
└──────────────────────────────────────┘
```
- **Padding:** `10px 16px` everywhere
- **Back:** `← ParentName` as accent-colored link (currently only some pages do this)
- **Title:** `fontWeight: 700, fontSize: TOUCH.fontBase` always
- **Subtitle:** League + Year pills on same line, no other info (no bunker count, no thumbnail)
- **Right actions:** Edit button if applicable, nothing else in header

---

## 2. CANVAS LAYER TOGGLE PATTERNS

| Screen | Toggle location | Toggle style | Layers available |
|--------|-----------------|--------------|------------------|
| **LayoutDetailPage** | Mode panel (below canvas) | `<input type="checkbox">` Labels/Lines/Zones | Labels, Lines, Zones |
| **TournamentPage** | Above canvas (inline) | `<input type="checkbox">` Labels/Lines/Zones | Labels, Lines, Zones |
| **MatchPage (heatmap)** | FieldEditor toolbar (above canvas) | Icon `<Btn>` toggle buttons | Lines, Labels, Zones (via FieldEditor) |
| **MatchPage (editor)** | FieldEditor toolbar (above canvas) | Icon `<Btn>` toggle buttons | Lines, Labels, Zones, Visibility, Counter, Draw |
| **TacticPage** | FieldEditor toolbar (above canvas) | Icon `<Btn>` toggle buttons | Lines, Labels, Zones, Visibility, Counter, Draw |
| **ScoutedTeamPage** | None (hardcoded `layers={['lines']}`) | — | Lines only (not toggleable) |

### INCONSISTENCIES:
1. **Two different toggle systems:** Native checkboxes (Layout, Tournament) vs FieldEditor icon buttons (Match, Tactic)
2. **Position varies:** Above canvas (Tournament), below canvas in mode panel (Layout), in FieldEditor toolbar (Match/Tactic)
3. **ScoutedTeamPage** has no layer toggles at all
4. **LayoutDetailPage** is the only screen using a mode tab system for canvas settings; all others use FieldEditor or inline

### PROPOSED STANDARD:
- **FieldEditor toolbar** (icon toggle buttons) is the canonical pattern — already used on Match and Tactic
- **All screens with canvas** should wrap in `<FieldEditor>` and use its toolbar for layer toggles
- This means LayoutDetailPage and TournamentPage should switch from checkboxes to FieldEditor
- ScoutedTeamPage should add FieldEditor wrapper with toggles
- FieldEditor already handles: Lines (wave icon), Labels (tag icon), Zones (zone icon), Visibility (flame), Counter (target), Draw

---

## 3. BOTTOM TAB / ACTION BAR PATTERNS

| Screen | Bottom element | Style | Sticky? | Content |
|--------|---------------|-------|---------|---------|
| **HomePage** | BottomNav (global) | Tab bar | Yes (global) | Home, Layouts, Teams, Players |
| **LayoutsPage** | BottomNav | Tab bar | Yes (global) | Home, Layouts, Teams, Players |
| **LayoutDetailPage** | Mode tabs | `flex: '0 0 auto'`, overflowX | ❌ NOT STICKY | Preview, Bunkers, Lines, Calib, Zones, Tactics |
| **TournamentPage** | BottomNav | Tab bar | Yes (global) | Home, Layouts, Teams, Players |
| **MatchPage (heatmap)** | ADD POINT button | Full-width accent | sticky (bottom: 0) | + ADD POINT |
| **MatchPage (editor)** | Action bar | flex, 4 buttons | Not sticky (at end of flex column) | Place, Hit, Shot, OK |
| **TacticPage** | Mode tabs | `flex: '0 0 auto'`, overflowX | ❌ NOT STICKY | Place, Shots, Draw, Counter, Save |
| **ScoutedTeamPage** | Quick actions | sticky bottom | Yes | Add match, Edit |
| **TeamDetailPage** | — | — | — | — |
| **PlayersPage** | BottomNav | Tab bar | Yes (global) | Home, Layouts, Teams, Players |

### INCONSISTENCIES:
1. **LayoutDetailPage mode tabs NOT sticky** — can scroll below fold
2. **TacticPage mode tabs NOT sticky** — same problem, `flex: '0 0 auto'` doesn't fill width
3. **MatchPage action bar** is not sticky — it's just at the end of the flex column
4. **BottomNav shows on ALL routes** including detail pages where it doesn't belong
5. **Tab flex sizing:** Layout and Tactic use `flex: '0 0 auto'` (cluster left), should use `flex: 1` (fill width)

### PROPOSED STANDARD:
- **Tab pages** (Home, Layouts, Teams, Players): BottomNav shown
- **Detail pages** (LayoutDetail, Tournament, Match, Tactic, ScoutedTeam, TeamDetail): BottomNav hidden, page has its own bottom bar
- **Mode tabs / Action bars:** Always `position: sticky, bottom: 0, zIndex: 20`, `flex: 1` per tab, `paddingBottom: env(safe-area-inset-bottom)`
- **Consistent tab style:**
  ```jsx
  {
    flex: 1,
    padding: '10px 4px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    borderTop: active ? `2px solid ${COLORS.accent}` : '2px solid transparent',
    color: active ? COLORS.accent : COLORS.textMuted,
    fontSize: 18, // icon
  }
  ```

---

## 4. CANVAS WRAPPER PATTERNS

| Screen | Canvas component | Wrapper | Padding |
|--------|-----------------|---------|---------|
| **LayoutDetailPage** | FieldCanvas (direct) | `padding: '4px 14px 0'` | 14px sides |
| **TournamentPage** | FieldCanvas (direct) | `borderRadius: 10, overflow: hidden, border` | via R.layout.padding |
| **MatchPage (heatmap)** | HeatmapCanvas via FieldEditor | FieldEditor default | R.layout.padding |
| **MatchPage (editor)** | FieldCanvas via FieldEditor | FieldEditor default | R.layout.padding |
| **TacticPage** | FieldCanvas via FieldEditor | FieldEditor default | R.layout.padding |
| **ScoutedTeamPage** | HeatmapCanvas via FieldView | FieldView internal | R.layout.padding |

### INCONSISTENCIES:
1. **LayoutDetailPage uses FieldCanvas directly** — should use FieldEditor for consistent toolbar
2. **TournamentPage uses FieldCanvas directly** — same issue
3. **ScoutedTeamPage uses FieldView** — a separate abstraction layer
4. **Padding varies:** 14px hardcoded (Layout) vs R.layout.padding (others)

### PROPOSED STANDARD:
- **All interactive canvas screens** use FieldEditor wrapper
- **All view-only canvas screens** use FieldEditor with reduced props (no edit features)
- FieldView can be deprecated — FieldEditor handles both cases
- Consistent padding via `R.layout.padding`

---

## 5. POLISH STRINGS REMAINING

Spotted during audit (should be English per TRANSLATION_MANIFEST):
- LayoutDetailPage line ~139: `"Inicjuj silnik balistyczny"` (comment, OK)
- MatchPage: stance labels `'🧍 Stoi'`, `'🧎 Klęczy'`, `'🐍 Leży'`, `'⚙ Auto'`, `'Pozycja:'`
- MatchPage: counter text `'Narysuj ścieżkę wroga na mapie'`, `'Rysuj...'`
- MatchPage: counter panel `'pozycji'`
- FieldEditor: title `'Etykiety bunkrów'`, `'Strefy'`, `'Widoczność'`
- FieldEditor: heatmap legend `'Daltonizm'`, `'Standard'` (toggles `'👁️ Daltonizm'`/`'👁️ Standard'`)
- HomePage loading: `'Sprawdzanie sesji...'`, `'Przygotowanie danych...'`, `'Ładowanie...'`
- HandednessPrompt: `'Którą ręką obsługujesz telefon?'`, `'Lewa'`, `'Prawa'`
- ScoutedTeamPage: `'Turniej'` fallback

---

## 6. SUMMARY — TOP PRIORITY UNIFICATIONS

### A. Header standardization (all 11 screens)
One shared `<PageHeader>` component:
```jsx
<PageHeader
  back={{ label: 'Tournament', to: `/tournament/${id}` }}  // or omit for tab pages
  title="Match Name"
  badges={[<LeagueBadge />, <YearBadge />]}  // optional
  actions={[<Btn onClick={edit}><Icons.Edit /></Btn>]}  // optional
/>
```

### B. Canvas toggle standardization
- Delete native checkboxes from LayoutDetailPage and TournamentPage
- Wrap all canvases in FieldEditor
- FieldEditor becomes THE standard for layer toggles everywhere

### C. Bottom bar standardization
- BottomNav: only on tab pages (Home, Layouts, Teams, Players)
- Detail pages: own sticky bottom bar with `flex: 1` tabs
- Consistent styling across LayoutDetailPage, TacticPage, MatchPage

### D. Translation sweep
- ~15 Polish strings remaining (see section 5)
- One pass to convert all to English

---

## 7. EXECUTION PLAN FOR CC

**Phase 1 — Quick wins (1 session):**
1. Fix mode tabs sticky + full-width on LayoutDetailPage and TacticPage
2. Translate remaining Polish strings to English
3. BottomNav: hide on detail pages

**Phase 2 — Canvas unification (1 session):**
4. Wrap LayoutDetailPage canvas in FieldEditor (replace checkboxes)
5. Wrap TournamentPage canvas in FieldEditor (replace checkboxes)
6. Add FieldEditor to ScoutedTeamPage

**Phase 3 — Header component (1 session):**
7. Extract `<PageHeader>` component
8. Apply to all 11 screens
9. Consistent back labels, padding, font sizes

**Phase 4 — BottomNav scope (quick):**
10. BottomNav only renders on tab routes (/, /layouts, /teams, /players)
