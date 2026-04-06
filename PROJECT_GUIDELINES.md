# PbScoutPro — Project Guidelines

> **Last updated:** April 6, 2026  
> **Decisions codified:** 39  
> **Period:** March 24 – April 6, 2026

## Dla kogo ten dokument

Każdy agent AI (Opus, Claude Code, Sonnet) pracujący na tym repo **MUSI** przeczytać ten dokument przed rozpoczęciem pracy. Nie zgaduj — czytaj. Jeśli coś tu jest zapisane, to znaczy że zostało zatwierdzone i NIE podlega dyskusji bez explicite zgody Jacka.

---

## 1. Design System

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
  - `xxs`: 9px
  - `xs`: 11px
  - `sm`: 13px
  - `md`: 15px
  - `lg`: 17px
  - `xl`: 20px
  - `xxl`: 22px

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

- Default scheme: green → orange → blue
- Colorblind-safe scheme: yellow → orange → purple
- 3 channels: positions (blue→purple), shots (white→yellow, 15px fade), bumps (cyan)
- Shot lines: 15px gradient fade from shot point toward player, white→yellow

### 1.6 Stylowanie — zasady absolutne

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

### 2.3 Match Header

- Stacked scoreboard card (wariant B3)
- Team names: red / blue
- Score: zawsze `#e2e8f0` — **neutral, NIGDY** zielony/czerwony

### 2.4 Canvas / Field

- **Pinch-to-zoom + pan:** 2 fingers = zoom, 1 finger (when zoomed) = pan
- **Max-vertical approach:** height fills available space, width clips
- Anchor dots: amber, with dark semi-transparent pill labels
- Touch handler: `usedTouchRef` for Safari double-fire prevention

### 2.5 Loupe (magnifier)

- Trigger: appears on **ANY** touch (hold > 200ms shows loupe with drag; tap < 200ms places instantly)
- Size: 50px radius, 3× magnification
- Style: amber border + crosshair
- **Handedness-aware positioning:**
  - Right-handed → loupe appears LEFT of finger
  - Left-handed → loupe appears RIGHT of finger
  - Priority cascade: above → opposite side → below → same side

### 2.6 Navigation

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
- Usage: `<Modal open={bool} onClose={fn} title="...">content</Modal>`

### `ConfirmModal`

- Extends Modal with confirm/cancel actions
- Used for destructive actions with "data loss" warning text
- Usage: `<ConfirmModal open={bool} onConfirm={fn} onCancel={fn} title="..." message="..."/>`

### `ActionSheet`

- Bottom sheet sliding up from bottom
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

- Phase 1 spec in `BREAK_ANALYZER_SPEC.md` and `BREAK_ANALYZER_DOMAIN_v2.md`
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
- ❌ **NIE** rób bezpośredniego delete — zawsze pattern: ⋮ → ActionSheet → ConfirmModal
- ❌ **NIE** używaj zielonego/czerwonego na wynikach meczów (score = neutral `#e2e8f0`)
- ❌ **NIE** twórz osobnych tabów dla positions/shots — oba widoczne jednocześnie
- ❌ **NIE** zakładaj że touch na canvas jest aktywny bez action mode

### Architektura
- ❌ **NIE** przypisuj taktyk do turniejów — taktyki są attached do layoutów
- ❌ **NIE** commituj `.env` ani żadnych sekretów do gita
- ❌ **NIE** pomijaj `ErrorBoundary` w App.jsx
- ❌ **NIE** używaj array do shots w Firestore — to musi być object

### Workflow
- ❌ **NIE** merge'uj sesji — push po każdym tasku
- ❌ **NIE** zgaduj designu — czytaj `CLAUDE.md`, `NEXT_TASKS.md` i ten dokument
- ❌ **NIE** twórz wireframe'ów — mockupy muszą wyglądać produkcyjnie
- ❌ **NIE** zmieniaj zatwierdzonych decyzji bez explicite zgody Jacka
