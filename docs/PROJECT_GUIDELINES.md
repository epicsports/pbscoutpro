# PbScoutPro — Project Guidelines

> **Last updated:** April 10, 2026 (late evening)
> **Decisions codified:** 58  
> **Period:** March 24 – April 6, 2026

## Dla kogo ten dokument

Każdy agent AI (Opus, Claude Code, Sonnet) pracujący na tym repo **MUSI** przeczytać ten dokument przed rozpoczęciem pracy. Nie zgaduj — czytaj. Jeśli coś tu jest zapisane, to znaczy że zostało zatwierdzone i NIE podlega dyskusji bez explicite zgody Jacka.

---

## 1. Design System

> **⚠️ APPLE HIG COMPLIANCE IS MANDATORY.** Every screen follows Apple Human Interface Guidelines principles: clarity (minimal elements), deference (UI recedes, content leads), depth (elevation = lighter surfaces), consistency (same patterns everywhere). Full spec in `docs/DESIGN_DECISIONS.md` section 27. When in doubt, remove an element rather than add one.

### 1.1 Kolory

- Background: `#0a0e17` → `COLORS.bg`
- Surface: `#111827` → `COLORS.surface`
- Card / elevated surface: `#1a2234` → `COLORS.card`
- Border: `#2a3548` → `COLORS.border`
- Accent: `#f59e0b` (amber) → `COLORS.accent` — używany na CTA, aktywne elementy, PageHeader back arrow
- Text primary: `#e2e8f0` → `COLORS.text`
- Score display: zawsze `#e2e8f0` — **NIGDY** zielony/czerwony na wynikach
- Danger: standardowy czerwony dla delete actions
- Semantic 3-layer system w `theme.js`: **primitives → semantic tokens → component tokens**

### 1.2 Typografia

- Font: **Inter** (nie JetBrains Mono, nie monospace)
- `FONT_SIZE` tokens (7 poziomów):
  - `xxs`: 10px — absolute minimum, badge labels only
  - `xs`: 12px — captions, secondary labels (Apple HIG caption min)
  - `sm`: 13px — secondary text, chips, pills
  - `md`/`base`: 15px — body text, buttons, inputs
  - `lg`: 17px — card titles, section headers (Apple HIG body)
  - `xl`: 20px — page titles
  - `xxl`: 24px — hero text, scores
- **NIGDY** poniżej 10px w kodzie — żaden hardcoded fontSize < 10
- **Badges** (LIVE/FINAL/SCHED/CLOSED): min 10px, padding `3px 8px`
- **Emoji icons** (👁 ⋮): min 16px for interactive, 18px for menus
- **Canvas labels** (drawZones/drawBunkers): min 9px (pixel-rendered, different from CSS)
- **Toolbar micro-labels** (Assign/Hit/Runner/Shot): 9px allowed (special case under icons)

### 1.3 Spacing

- `SPACE` tokens:
  - `xs`: 4px
  - `sm`: 8px
  - `md`: 12px
  - `lg`: 16px
  - `xl`: 20px
  - `xxl`: 24px
  - `page`: 16px (horizontal page padding)

### 1.4 Border Radius

- `RADIUS` tokens:
  - `xs`: 4px
  - `sm`: 6px
  - `md`: 8px
  - `lg`: 10px
  - `xl`: 12px
  - `xxl`: 16px
  - `full`: 999px (pills, avatars)

### 1.5 Heatmap

- **Team A (my team):** amber heatmap, white dots/triangles, amber shot crosshairs, blue bump diamonds
- **Team B (opponent, Both Teams view):** teal (#06b6d4) heatmap, teal dots/triangles, teal shot crosshairs, pink bump diamonds
- **Both Teams view:** Team A positions mirrored to LEFT, Team B positions mirrored to RIGHT (Y-axis mirror). Shots inversely mirrored.
- **Runner markers:** ▲ triangle (gun-up = ● circle) — on both scouting canvas and heatmap
- Kill clusters: 💀 with count badge

### 1.6 Canvas Annotations (drawZones.js)

All text labels on the canvas **MUST** have a dark background pill (`rgba(0,0,0,0.65)`) for readability against any field image. Never rely on colored text alone.

- **Disco line label:** `DISCO`, 11px bold, `#fb923c` (orange), centered on line, pill background, above line
- **Zeeker line label:** `ZEEKER`, 11px bold, `#22d3ee` (cyan), centered on line, pill background, below line
- **Danger zone label:** `DANGER`, 14px bold, `#ef4444` (red), centered in polygon, pill background
- **Sajgon zone label:** `SAJGON`, 14px bold, `#3b82f6` (blue), centered in polygon, pill background
- **Bunker labels:** positionName in pill with `rgba(0,0,0,0.55)` bg, amber anchor dot
- **Line thickness:** 2.5px dashed `[8,4]` for disco/zeeker, 2px dashed `[6,3]` for zone borders
- **Minimum font on canvas:** 9px (vertex dots) — all labels ≥ 11px
- **Zone fill:** color + `'28'` (16% opacity)

### 1.7 Stylowanie — zasady absolutne

- **TYLKO inline JSX styles** z tokenami z `theme.js`
- **ZERO CSS modules**
- **ZERO Tailwind**
- **ZERO external CSS files**
- Import: `import { COLORS, SPACE, RADIUS, FONT_SIZE, TOUCH } from '../theme.js'`

---

## 2. UX Patterns

### 2.1 Najważniejsze

- **Action mode pattern:** tap action button → mode active → canvas responds to touch ONLY in active mode. Bez aktywnego trybu canvas ignoruje dotyk.
- **Player selector: radio behavior** — tylko JEDEN player aktywny w danym momencie. Tap = switch, tap again = deselect.
- **Delete action pattern:** ⋮ (three-dots `MoreBtn`) → `ActionSheet` (bottom sheet) → `ConfirmModal` z ostrzeżeniem "data loss". Nigdy bezpośredni delete.

### 2.2 Tournament Page

- Division pill filter: `[All] [Div.1] [Div.2] ...` — filtruje mecze i drużyny
- Sekcje meczów: **LIVE** (na górze) → **Scheduled** → **Completed**
- Empty state: dwa CTA `[+ Add]` + `[Import]`; po dodaniu meczów: jeden CTA `[+ Add]`
- Add Match modal: Home/Away dropdowns filtrowane po division
- Layout selection w create/edit tournament flow
- **Foldable Teams section:** click header to collapse/expand, state persisted in `localStorage` per tournament (`teamsCollapsed_{tid}`)
- **Delete tournament:** button in edit modal footer (left-aligned, danger ghost), ConfirmModal + workspace password
- **No isAdmin guard** on delete actions — all workspace users can delete teams/matches/tournaments (workspace password is the safety gate)

### 2.3 Match Header (Heatmap View)

- Stacked scoreboard card (wariant B3): back link + LIVE/FINAL badge + ⋮ menu
- Team names: `TEAM_COLORS.A` (red) / `TEAM_COLORS.B` (blue)
- Score: zawsze `#e2e8f0` — **neutral, NIGDY** zielony/czerwony
- FINAL state: winner name + score = `COLORS.success` (green), loser = `COLORS.textMuted`, WIN label beside winner
- **⋮ menu (MoreBtn):** "End match (mark as FINAL)" + "Clear all points" — ActionSheet
- **Sticky CTA** at bottom: `+ ADD POINT` (accent only) + optional "Switch to {team}" in concurrent
- **Heatmap toggle:** `[My Team] / [Both Teams]` pill above heatmap (concurrent only)

### 2.4 Teams Page

- **No icon** on team cards (no yellow square) — just name + league badges + chevron
- **Foldable subteams:** parent teams with children show `▶ N` / `▼ N` toggle in actions area. Click toggle = expand/collapse children. Click card body = navigate to team detail. Collapse state persisted in `localStorage` (`teamsPage_collapsed`)
- **No ⋮ menu** on TeamsPage — editing and deletion happen on TeamDetailPage
- **Delete team** on TeamDetailPage: danger button at bottom, ConfirmModal + workspace password, navigates to `/teams` after delete
- **Sort order:** teams sorted A-Z by name, players sorted A-Z by name
- **League pills order:** always NXL → DPL → PXL (sorted by `LEAGUES` array index)

### 2.5 Scouting (Point Entry)

- **Auto swap sides:** when winner is selected (win_a / win_b), "Swap sides" toggle auto-selects. Timeout/clear resets to "Same". User can still override manually. **Fires ONLY on new-point scouting.** Editing an existing point with a winner does NOT flip `match.currentHomeSide` — the point's own `{homeData,awayData}.fieldSide` snapshot is authoritative for its rendering (see DESIGN_DECISIONS § 41).
- **Player shapes:** gun-up = ● circle (default), runner = ▲ triangle. Toggle via toolbar action.
- **After save:** always return to heatmap (`setViewMode('heatmap')`). No auto-switch to next point.
- **Heatmap toggle (concurrent):** `[My Team] / [Both Teams]` — switches between own side and merged view
- **⋮ menu in header:** "End match (mark as FINAL)" + "Clear all points"
- **Concurrent scouting (chess model):**
  - `match.currentHomeSide` = single source of truth for field orientation
  - Each coach derives perspective: home = same, away = opposite
  - Perspective locked during editing (`editingId` guard on sync effect)
  - Save: always `draftA→homeData`, `draftB→awayData` (never based on `activeTeam`)
  - Save both sides if coach scouted both teams (otherDraft has data)
  - `homeData.fieldSide` and `awayData.fieldSide` always opposite
  - When joining partial point: use opposite fieldSide of other coach's saved data
  - Outcome syncs from Firestore via effect (pre-fills save sheet)
  - No draft mirroring — positions stay where coach placed them
  - Claim system: Firestore-backed with 10min TTL heartbeat, beforeunload/visibilitychange cleanup
  - Auto-attach protected: won't overwrite if drafts have player data

### 2.6 Layout Detail Page

- **Single scrollable page** (no tabs): PageHeader → FieldCanvas → Toggle row → Tactics list → Sticky "New tactic" button
- **⋮ menu** on PageHeader (ActionSheet): Edit layout info, Re-calibrate, Re-scan (Vision), Delete layout
- **Tactic cards** use `Card` component with `MoreBtn` → ActionSheet (Edit, Duplicate, Delete)
- **Canvas always in edit mode** (`layoutEditMode="bunker"`) — tap to add/edit bunkers
- **drawBunkers:** uses `positionName` for labels (skip empty = snake beams). Mirrors drawn at 30% opacity. Selected bunker highlights both master + mirror pair.
- **Disco/Zeeker lines:** always visible on layout page. Draggable pill handles (`DISCO 24%` / `ZEEKER 57%`) overlay on canvas. Lines render on dorito/snake halves based on `doritoSide`.
- **Danger/Sajgon draw:** buttons inline in toggle row (`⚠ Danger` / `⚠ Sajgon`). Tap → draw mode → tap points → Save/Cancel bar. Each zone saves independently.
- **Toggle row:** Labels, ½, Zones checkboxes + Danger/Sajgon buttons (right-aligned)
- **No Lines checkbox** — disco/zeeker always visible with drag handles
- **Canvas sizing:** width-first (fills container width, height from image aspect). No maxCanvasHeight. Container NOT `overflowY: hidden`.
- **Bunker drag:** tap = edit sheet, drag = move position. Label pill drag = offset adjustment.

### 2.7 Canvas / Field

- **Pinch-to-zoom + pan:** 2 fingers = zoom, 1 finger (when zoomed) = pan
- **Max-vertical approach:** height fills available space, width clips
- Anchor dots: amber, with dark semi-transparent pill labels
- Touch handler: `usedTouchRef` for Safari double-fire prevention

### 2.8 Loupe (magnifier)

- Trigger: appears on **ANY** touch (hold > 200ms shows loupe with drag; tap < 200ms places instantly)
- Size: 50px radius, 3× magnification
- Style: amber border + crosshair
- **Handedness-aware positioning:**
  - Right-handed → loupe appears LEFT of finger
  - Left-handed → loupe appears RIGHT of finger
  - Priority cascade: above → opposite side → below → same side

### 2.9 Tactic Page

- **Player placement:** tap empty space = place, tap player = select + toolbar
- **Second position (bump):** with player selected, tap elsewhere = set 2nd point. Drag player far enough = bump. Both visible as start→end with curved arrow.
- **Runner toggle:** toolbar ▲/● button, saved as `runners[]` boolean array
- **Shots from both positions:** "Shot 1st" (from player) / "Shot 2nd" (from bump) toolbar buttons. `bumpShots` stored separately.
- **Curve cycling:** ⌒ toolbar button cycles 5 arc shapes (±0.15, ±0.3, 0). `curve` stored in bump object.
- **Draggable bumps:** `onMoveBumpStop` callback, 22px hit radius
- **Freehand drawing:** overlay canvas, pointer capture, strokes saved to Firestore. Visible in layout preview via `freehandStrokes` prop on FieldCanvas.
- **Squad code:** tactics tagged with `squadCode` on creation. No code = untagged only. Code = matching only.
- **Toolbar items:** 🎯 Shot 1st, 🎯 Shot 2nd (if bump), ▲/● Runner, ⌒ Curve (if bump), ↩ Clear 2nd (if bump), ✕ Del

### 2.10 Layout Analytics

- **Deaths heatmap:** `/layout/:id/analytics/deaths` — red heatmap of all eliminations across tournaments
- **Break positions:** `/layout/:id/analytics/breaks` — amber heatmap of all player positions
- **Unified page:** `LayoutAnalyticsPage.jsx`, mode param (deaths|breaks)
- **Data query:** `fetchLayoutDeaths()` queries tournaments with layoutId → matches → points. Uses `homeData||teamA` fallback (no double counting).
- **Access:** layout ⋮ menu + landscape left edge tabs (💀 DEATHS, 🎯 BREAKS)

### 2.11 Landscape Layout Controls

- **Left edge tabs:** LABELS, LINES, ZONES, DANGER, SAJGON, 💀 DEATHS, 🎯 BREAKS
- **Right edge tab:** TACTICS (pull tab with count badge → slide-in drawer)
- **Top left:** Back + ⋮ menu
- **Style:** vertical text, semi-transparent + backdrop blur, rounded corners toward screen center, active state highlighting

### 2.12 Navigation

- Bottom nav: content on tab pages must have `paddingBottom: 64` to avoid being hidden behind nav bar
- PageHeader: sticky, bg `#111827`, back arrow = accent color

---

## 3. Component Library (`ui.jsx`)

All components live in `src/components/ui.jsx`. Import from there, NEVER re-create.

### `Btn`

- Variants: `accent` (#f59e0b, black text), `default` (#1a2234), `ghost` (transparent), `danger` (red)
- Min touch target: 44px
- Usage: `<Btn variant="accent" onClick={fn}>Label</Btn>`

### `Card`

- Background: `#1a2234`, border: `#2a3548`, border-radius: 10px
- 36px icon box for leading icons
- Usage: `<Card onClick={fn}>content</Card>`

### `Modal`

- Centered overlay, dark backdrop
- Mobile: slides up from bottom (`alignItems: 'flex-end'`), `maxHeight: 92dvh` (uses `dvh` for iOS keyboard compatibility)
- **iOS keyboard fix:** `focusin` listener auto-scrolls focused input into view with `scrollIntoView({ block: 'center' })`
- Usage: `<Modal open={bool} onClose={fn} title="...">content</Modal>`

### `ConfirmModal`

- Extends Modal with confirm/cancel actions
- Used for destructive actions with "data loss" warning text
- **Password validation:** `requirePassword={workspace?.slug}` — slugifies user input (strips `##`, lowercases, removes special chars) before comparing to workspace slug
- Usage: `<ConfirmModal open={bool} onConfirm={fn} onCancel={fn} title="..." message="..." requirePassword={slug} password={pw} onPasswordChange={fn}/>`

### `ActionSheet`

- Bottom sheet sliding up from bottom
- `maxHeight: 60dvh` with `overflowY: auto` — ensures all options are reachable on small screens
- Used as intermediate step before ConfirmModal (delete flow)

### `MoreBtn`

- Three-dots `⋮` button
- Opens ActionSheet
- Usage: `<MoreBtn onClick={fn}/>`

### `PageHeader`

- Sticky header, bg: `#111827`
- Back arrow uses accent color
- Usage: `<PageHeader title="..." onBack={fn}/>`

### `Input`

- Background: `#0a0e17`
- Usage: `<Input value={v} onChange={fn} placeholder="..."/>`

### `Select`

- Styled select matching dark theme

### `Checkbox`

- `accent-color: #f59e0b`, size 16px

### `EmptyState`

- Centered message + icon + optional CTA buttons

### `LeagueBadge` / `YearBadge`

- Small pill badges for metadata display

### `SectionTitle`

- Section header text component

---

## 4. Architecture

### 4.1 Stack

- **React 18 + Vite** (migrated from Vue.js in March 2026)
- **Firebase Firestore** for data
- **Firebase Anonymous Auth** (Phase 1) — every device = unique `uid`
- **GitHub Pages** for deployment
- All UI copy in **English**

### 4.2 Data Model

- **Workspace-based isolation:** each team has `workspace/{slug}` in Firestore
- **Layout as central entity:** tactics are attached to layouts, NOT to tournaments. A shared field layout is referenced by multiple tournaments.
- **Tournament divisions:** `divisions: ['Div.1', 'Div.2']`, each match/team has a `division` field
- **Point data split:** `homeData` + `awayData` for concurrent scouting, dual-write via dot notation
- **Shots:** Firestore object (not array) — crash was fixed by handling object format
- **Bunker object (v2):** `{ id, positionName, type, x, y, labelOffsetY, role?, masterId? }`. `positionName` = comms name ("Dog", "Snake1"), `type` = bunker shape abbreviation ("MD", "C"). Migration: `migrateBunkers()` copies `name → positionName`, runs `guessType() → type`
- **Layout document (v2):** adds `mirrorMode: 'y'|'diag'`, `doritoSide: 'top'|'bottom'`
- **Mirror system:** bunkers stored as masters only (left half + center). Mirrors computed at render time via `computeMirrors()`. Mirror bunkers have `role: 'mirror'` + `masterId`
- **Position presets:** `POSITION_NAMES` (dorito/snake/center arrays) and `POSITION_TYPE_SUGGEST` (position → typical type mapping) in `theme.js`
- **Side detection:** `getBunkerSide(x, y, doritoSide)` returns 'dorito'|'snake'|'center'

### 4.3 Firestore Collections

```
/workspaces/{slug}/layouts/{lid}
/layouts/{lid}/tactics/{tid}
/tournaments/{tid}/tactics/{tid}
```

### 4.4 Team Model

- Parent team (e.g. "Ranger Warsaw") has child teams (Ring, Rage, Rebel, Rush)
- Each child team assigned to specific leagues + divisions
- Child teams MUST appear in tournament team picker for their assigned division/league
- **Known bug:** child teams not appearing in tournament team picker — fix pending

### 4.5 File Structure

```
src/
  pages/          # Route-level components
  components/     # Shared components (ui.jsx lives here)
  services/       # Firebase, API calls
  hooks/          # Custom React hooks
  utils/          # Pure utility functions
  modules/        # Feature modules (BreakAnalyzer, etc.)
  workers/        # Web Workers (ballistics, etc.)
```

### 4.6 Error Handling

- `ErrorBoundary` in `App.jsx` wraps the entire app

---

## 5. Domain Knowledge (Paintball)

### 5.1 Field

- NXL standard field: **150ft × 120ft**
- Grid: **10ft** squares
- Bases at field edges (NOT bunkers)
- Colors red/blue are purely visual (team sides)

### 5.2 NXL 2026 Bunker Taxonomy (15 types)

Each bunker has a `heightM` property.

| Category | Types |
|----------|-------|
| **Low** | SB (Snake Brick), SD (Snake Dorito), Tr (Triangle) |
| **Medium** | MD (Mini Dorito), SG (Snake God), C (Can/Cake) |
| **Tall** | GB (Giant Brick), GP (Giant Pin), WB (Wing Brick), WG (Wing God), and more |

- Use official abbreviations in code and UI
- Bunker positions transform from image-space to field-space via `makeFieldTransform()` utility with `toField()` / `toImage()` in `useVisibility.js`, `TacticPage`, `MatchPage`, `FieldCanvas`

### 5.3 Heatmap Channels

| Channel | Color Range | Purpose |
|---------|-------------|---------|
| Positions | blue → purple | Where players set up |
| Shots | white → yellow (15px fade line) | Lanes and shooting directions |
| Bumps | cyan | Player movements during point |

- Both positions and shots shown simultaneously (NOT on alternating tabs)

### 5.4 BreakAnalyzer Module

- Phase 1 spec in `docs/architecture/BREAK_ANALYZER_SPEC.md` and `docs/architecture/BREAK_ANALYZER_DOMAIN_v2.md`
- Ballistic model: Euler integration with drag, empirical accuracy curve, arc shots 5–15°
- Web Worker architecture for heavy computation

---

## 6. Code Conventions

### 6.1 Language

- **Variable names, functions, comments:** English ONLY
- **User-facing UI strings:** English (changed from earlier Polish)
- **File names:** English, kebab-case or camelCase per React convention

### 6.2 Styling Rules (repeat for emphasis)

- `import { COLORS, SPACE, RADIUS, FONT_SIZE } from '../theme.js'`
- Inline `style={{}}` on JSX elements
- NO CSS files, NO CSS modules, NO Tailwind, NO styled-components
- NO `className` except for third-party library integration

### 6.3 Component Rules

- All shared components come from `ui.jsx` — do not duplicate
- Min touch target: 44px (`TOUCH.min` from theme.js)
- Use `DIVISIONS` constant from theme.js for division names
- **Sticky CTAs:** primary action buttons at bottom of scrollable pages use `position: sticky; bottom: 0; zIndex: 20` with `background: COLORS.surface` or gradient fade
- **Component reusability is mandatory.** All solutions must be designed as reusable components — never hardcode behavior that exists (or should exist) as a shared pattern. Touch handling, canvas interactions, loupe, toolbar, save flow — all live in shared files. If a behavior is similar across pages, extract it. Before changing behavior in one place, check if other pages use the same component and whether the change should apply everywhere. If unsure — ASK.
- **Foldable sections:** use `localStorage` to persist collapsed state. Pattern: `▶/▼` indicator in header, `teamsCollapsed_{id}` key format
- **Delete in modal footer:** danger delete button goes in footer row, left-aligned (`marginRight: 'auto'`), next to Cancel + Save

### 6.4 Canvas Specifics

- Use `usedTouchRef` pattern for Safari double-fire prevention
- Calibration: `makeFieldTransform()` → `toField()` / `toImage()`
- Max-vertical layout: height fills available space, width clips

---

## 7. Workflow

### 7.1 Agent Model

```
Opus (architect, designs solutions, writes briefs)
  → Claude Code (implements, git push)
    → Sonnet (reviewer, optional)
```

### 7.2 Communication

- **Git is the communication channel** between agents
- `CLAUDE.md` — auto-read by Claude Code on startup. Contains project context and rules.
- `NEXT_TASKS.md` — prioritized work queue. Ordered top-to-bottom.

### 7.3 Design Workflow

For screen redesigns, follow this pipeline:

```
koncept → prototyp → design → klikalny prototyp → kod
```

- Design briefs: `CC_BRIEF_DESIGN_TOKENS.md` and `CC_BRIEF_SCREEN_REDESIGNS.md`
- Mockups MUST look production-ready, matching the dark theme exactly — never wireframe-style

### 7.4 Git Conventions

- Don't merge sessions — push after each task
- 7-session task list structure in `NEXT_TASKS.md`
- Each session = one focused task from the queue

### 7.5 Testing

- **Playwright smoke tests:** login → render → no errors
- **Responsive audit screenshots:** 5 viewports
- Tymek tests on iPhone and reports bugs directly

---

## 8. Security

### 8.1 Authentication

- **Firebase Anonymous Auth** — each device gets a unique `uid`
- Firestore rules: `uid` must be in workspace `members` array
- Dev environment: `allow true` (open for development)
- Production: full auth + uid membership check

### 8.2 Secrets

- `.env` is **NOT committed** to git (removed from tracking)
- Secrets via environment variables only
- CI/CD uses GitHub Secrets

### 8.3 Password Hashing (Phase 2 — planned)

- SHA-256 hash stored in Firestore
- On join: hash input, compare with stored hash

---

## 9. Anti-patterns — CZEGO NIE ROBIĆ

### Stylowanie
- ❌ **NIE** używaj CSS modules, Tailwind, styled-components, ani zewnętrznych plików CSS
- ❌ **NIE** używaj `className` (wyjątek: third-party libraries)
- ❌ **NIE** hardcoduj kolorów — zawsze `COLORS.x` z theme.js
- ❌ **NIE** hardcoduj spacing/radius/font-size — zawsze tokeny z theme.js
- ❌ **NIE** twórz nowych komponentów UI jeśli odpowiednik istnieje w `ui.jsx`

### UX
- ❌ **NIE** rób bezpośredniego delete — zawsze ConfirmModal (z passwordem workspace gdy dostępny)
- ❌ **NIE** używaj zielonego/czerwonego na wynikach meczów (score = neutral `#e2e8f0`)
- ❌ **NIE** twórz osobnych tabów dla positions/shots — oba widoczne jednocześnie
- ❌ **NIE** zakładaj że touch na canvas jest aktywny bez action mode
- ❌ **NIE** używaj `vh` na mobile — używaj `dvh` (dynamic viewport height, reaguje na iOS keyboard)
- ❌ **NIE** używaj `isAdmin` guard na delete — workspace password jest wystarczającym zabezpieczeniem
- ❌ **NIE** twórz team tabs (A/B/Both/All) na heatmap — zawsze "all"
- ❌ **NIE** przekazuj `icon` prop do Card dla team cards (żadnych żółtych kwadratów)

### Architektura
- ❌ **NIE** przypisuj taktyk do turniejów — taktyki są attached do layoutów
- ❌ **NIE** commituj `.env` ani żadnych sekretów do gita
- ❌ **NIE** pomijaj `ErrorBoundary` w App.jsx
- ❌ **NIE** używaj array do shots w Firestore — to musi być object

### Apple HIG compliance (MANDATORY)
- ❌ **NIE** dodawaj więcej niż 3 data points na kartę listy — detale na drill-down
- ❌ **NIE** używaj amber na nieinteraktywnych elementach — amber = tappable/active only
- ❌ **NIE** dodawaj chevronów na kartach które nawigują jako whole-card tap
- ❌ **NIE** używaj tego samego koloru tła na różnych warstwach elewacji
- ❌ **NIE** rób touch targetów mniejszych niż 44×44px
- ❌ **NIE** używaj tekstu mniejszego niż 8px (preferuj 11px+ dla czytelnego tekstu)
- ❌ **NIE** dodawaj gradientów/cieni/glow dekoracyjnie — tylko funkcjonalnie (CTA, HERO)
- ❌ **NIE** twórz wielu konkurujących CTA na jednej karcie
- ❌ **NIE** projektuj nowych ekranów bez sprawdzenia docs/DESIGN_DECISIONS.md section 27

### Workflow
- ❌ **NIE** merge'uj sesji — push po każdym tasku
- ❌ **NIE** zgaduj designu — czytaj `CLAUDE.md`, `NEXT_TASKS.md` i ten dokument
- ❌ **NIE** twórz wireframe'ów — mockupy muszą wyglądać produkcyjnie
- ❌ **NIE** zmieniaj zatwierdzonych decyzji bez explicite zgody Jacka

---

## 10. Documentation discipline

See `docs/DESIGN_DECISIONS.md` § 37 for the full rules. Quick reference below.

### 10.1 Where to put new docs

- UI patterns + product decisions → append new section to `docs/DESIGN_DECISIONS.md`
- Build conventions, anti-patterns → append new section to `docs/PROJECT_GUIDELINES.md`
- System architecture (long-form) → new file in `docs/architecture/`
- Active task queue → `NEXT_TASKS.md` (root)
- Operations / setup → new file in `docs/ops/`
- Product vision / feedback → new file in `docs/product/`

### 10.2 CC brief lifecycle

1. Brief written → may live in repo root temporarily during active implementation (referenced from `NEXT_TASKS.md`).
2. After PR merged → CC moves brief to `docs/archive/cc-briefs/` in the same commit as the `DEPLOY_LOG.md` entry.
3. `NEXT_TASKS.md` updated: `[DONE] feat: X — see archive/cc-briefs/CC_BRIEF_X.md, deployed in {commit}`.

### 10.3 Decisions from chats

Decisions made in Claude chats DO NOT live in chat history. Before chat ends, decisions must be transferred to:
- `docs/DESIGN_DECISIONS.md` (UI/product) — patch appended as `§ N+1`
- `docs/PROJECT_GUIDELINES.md` (build conventions) — patch appended in relevant section
- `docs/architecture/{NAME}.md` (architecture) — new or existing doc

If the patch is not committed before the chat closes, the decision is lost. **Repo is the source of truth.**

### 10.4 Anti-patterns (documentation)

- ❌ `CC_BRIEF_*` files lingering in repo root after deploy
- ❌ Decisions only in Claude chat, not in repo
- ❌ Same topic documented in 3 places without a single source of truth
- ❌ Stale audit snapshots (`docs/archive/audits/CURRENT_STATE_MAP.md`, etc.) not archived after they become outdated
