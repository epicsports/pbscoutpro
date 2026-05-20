# DESIGN DECISIONS — PbScoutPro
## ⚠️ This is the SINGLE SOURCE OF TRUTH for all design decisions.
## CC: Read this before implementing any UI work. Do NOT re-add removed features.
## Last updated: 2026-04-23 by Claude Code (§ 50 — Settings menu reorg + nav cleanup + Członkowie full UX with admin link override + soft-delete)

---

## 1. Design System

### 1.1 Theme
- **Dark theme** primary: bg `#0a0e17`, surface `#111827`, surfaceLight `#1a2234`
- **Amber accent** `#f59e0b` — buttons, active states, badges
- **Font:** Inter (not JetBrains Mono)
- **All tokens in `theme.js`:** COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, TEAM_COLORS

### 1.2 Components (in `ui.jsx`)
- Btn (accent, default, ghost, danger variants; min 44px touch)
- Card (bg surface, border, 10px radius, 36px icon box)
- Modal, ConfirmModal, ActionSheet (⋮ bottom sheet)
- Input, Select, Checkbox, Slider, TextArea, FormField
- PageHeader (sticky, back with label, title, badges, right action)
- EmptyState, LeagueBadge, YearBadge
- **NO HeatmapToggle** — removed, heatmap always shows both positions + shots
- **NO ActionBar** — never created, not needed

### 1.3 Inline styles only
No CSS modules, no Tailwind. All styles via JSX `style={{}}` using theme tokens.

### 1.3.1 Premium effects (accent buttons & active states)
- **Accent buttons** use `COLORS.accentGradient` (amber gradient `135deg`) + `COLORS.accentGlow` (subtle amber box-shadow) instead of flat color. Applied globally via `Btn variant="accent"`.
- **Active default buttons** have subtle `COLORS.accentGlow` when `active=true`.
- **Winner cards** on save sheet use `COLORS.successRadial` — radial green glow from bottom.
- **LIVE badge** gets `COLORS.accentGlow` for subtle pulse feel.
- These tokens live in `theme.js` under `// Premium effects`. Use them for any primary action that benefits from visual emphasis.

### 1.4 Global UX patterns (apply everywhere)

#### Page headers
- Use `PageHeader` component: `back` (chevron + label), `title`, optional `badges`, `right` action
- **One right action only** — never duplicate edit/menu functionality. Use either `MoreBtn` (⋮ → ActionSheet with multiple actions) OR a single action icon. Never both.
- Pattern by page type:
  - **Detail pages with multiple actions** (layout, tactic): `right={<MoreBtn />}` → ActionSheet (Rename, Print, Delete, etc.)
  - **Detail pages with single primary action** (tournament): `right={<Btn><Icons.Edit /></Btn>}` → opens edit modal
  - **Simple detail pages** (team detail): no right action

#### Floating player toolbar
- Appears when player is tapped on canvas (FieldCanvas renders it)
- Dark bubble (`#0f172aee`, border-radius 16px) with pointer triangle pointing at player
- Each action: 52×48px rounded button with emoji icon + 7px label
- Toolbar position auto-clamped to visible container edges
- **Tap anywhere outside toolbar to close** (invisible backdrop)
- Actions vary by context — see per-page sections for exact items
- **Bump is NEVER a toolbar action** — bump is a natural side-effect of dragging (see 2.2)

#### Player interaction on canvas (universal)
- **Tap empty canvas** → place next empty player slot
- **Tap placed player** → open floating toolbar
- **Drag placed player** → move position. If drag distance > 8% of field, auto-creates bump stop at drag start position. This is the ONLY way to create bumps.
- **Long-press** → loupe for fine positioning
- **Pinch** → zoom 1x–5x
- These rules apply identically on MatchPage (scouting) and TacticPage

#### Delete pattern (universal)
- Trigger: ⋮ three-dots → ActionSheet with context actions
- Delete/Remove always last, red/danger, separated by divider
- Confirmation: ConfirmModal with what-will-be-lost description

#### Mockup workflow for agents
- **Always consult UX/UI patterns from this document before designing any screen**
- **Start with pixel-perfect mockup** matching exact theme tokens, component styles, and interaction patterns
- **Check for duplicate actions** — if two UI elements do the same thing, one must go
- **Verify consistency** with existing pages before presenting to the user

---

## 2. Canvas (FieldCanvas.jsx)

### 2.1 Sizing strategy
- When `maxCanvasHeight` is set (MatchPage, TacticPage): **height-first** — fills available height, width clips
- When not set (LayoutDetailPage): **width-first** — fits container width, no feedback loop
- **NEVER use parent.clientHeight** in ResizeObserver — causes infinite zoom

### 2.2 Touch interaction
- **Tap** (<200ms): place player/bunker instantly
- **Hold** (>200ms): show loupe for fine-position drag
- **Loupe**: appears on OPPOSITE side of finger (left for right-handed, right for left-handed)
- **Pinch**: zoom in/out (1x-5x)
- **Single-finger drag on player**: move player. If drag distance > 8% of field → auto-creates bump stop at drag start position (player lands at new pos, orange dot marks pause point). **Bump is purely a drag side-effect, never a menu action.**
- **Single-finger drag on empty space**: pan when zoomed
- `usedTouchRef` prevents Safari double-fire

### 2.3 Half-field viewport (`viewportSide` prop)
- `'left'` or `'right'` — canvas zooms 2x showing one half
- Used in MatchPage scouting — coach sees their side enlarged

### 2.4 What FieldCanvas does NOT do
- No FAB / floating action button — REMOVED
- No focus mode — REMOVED
- No toggle zoom button — REMOVED (pinch-to-zoom replaced it)

---

## 3. FieldEditor.jsx
- Wraps FieldCanvas with **toggle toolbar** (Labels/Lines/Zones checkboxes)
- Used on LayoutDetailPage and heatmap view
- **NO zoom controls** — pinch-to-zoom is built into FieldCanvas
- **NO FAB** — removed
- **NO focus mode** — removed

---

## 4. Match Page

### 4.1 Side picker (entry)
- Two cards: **red** (home) + **blue** (away) with colored dots
- Subtitle "Home" / "Away"
- "Just observe" link at bottom
- Closed matches skip side picker → go straight to heatmap

### 4.2 Scouting header (editor view)
- Title: **"Scouting {TEAM_NAME}"**
- Subtitle: "vs {OPPONENT} · {score} · Pt {n}"
- Side flip: "from LEFT ⇄" (tappable, team-colored)
- LIVE/FINAL badge top-right
- Back button top-left

### 4.3 Match summary (heatmap view) — B3 scoreboard
- **Stacked scoreboard card**: Team A row (red, score right) + Team B row (blue, score right)
- Leading team in white, trailing in gray
- FINAL state: winner green with "WIN" label, loser dimmed, card border green
- **NO team filter tabs** (A/B/Both/All) — REMOVED, heatmap always shows all data
- **NO Positions/Shots toggle** — REMOVED, both rendered simultaneously
- "End match" button below points list (visible, not hidden in sheet)
- Back → "‹ Tournament"

### 4.4 Points list
- Cards with: #number, outcome badge (team 3-letter), OT badge, elimination count, DANGER/SAJGON badges
- **⋮ dots menu** on each point → "Edit point" / "Delete point" (danger)
- Tap card = edit point

### 4.5 Bottom actions
- "ADD POINT" (amber, full width, 52px height)
- "End match" (default, full width, below ADD POINT)
- Both hidden when match status = 'closed'

### 4.6 Cannot exit without saving — FIXED
- Back button: if no points exist and nothing saved → navigate to tournament
- If points exist → go to heatmap view

### 4.7 Player interaction (scouting editor)
- Same canvas interaction as global pattern (see section 1.4): tap to place, drag to move, drag > 8% = bump, long-press = loupe
- **Floating toolbar actions (scouting):** Assign (👤), Hit/Alive (💀/❤️), Shot (🎯), Del (✕) — 4 actions
- **Shot action** → opens ShotDrawer (side panel, opponent field half, tap to place shots)
- **Toolbar rendering** in FieldCanvas.jsx: `toolbarItems` array passed as prop, `toolbarPos` computed from player screen coords, clamped to visible container

---

## 5. Tournament Page

### 5.1 Header
- PageHeader: "‹ Start" + tournament name + LeagueBadge + YearBadge + ✏️ edit
- Edit button opens modal with: name, league, year, divisions (toggle buttons from DIVISIONS[league]), layout selector, **Delete tournament** (danger, at bottom)

### 5.2 Division pill filter
- Contained pill bar below header
- Shows divisions from tournament.divisions array
- **NO "All" option** — default to first division
- Filters teams AND matches

### 5.3 Match sections: Live / Scheduled / Completed
- Live: amber border, LIVE badge, score amber
- Scheduled: "— : —" score, time badge
- Completed: opacity 0.65, FINAL badge green
- Match card: both team names bold, "vs" dimmed, score neutral white
- **⋮ dots menu** → "View details" / "Delete match" (danger)
- "+ Add" in Matches section title → opens Add Match modal

### 5.4 Add Match modal
- Two dropdowns: Home team / Away team (filtered by active division)
- Can't pick same team for both
- After creating → **stays on tournament page** (does NOT navigate to match)

### 5.5 Teams section
- Cards with team name, player count, division
- **⋮ dots menu** → "View team" / "Hide from list" / "Remove from tournament" (danger)
- Foldable when many teams
- "Add team" expander below

### 5.6 What tournament page does NOT show
- **NO layout canvas** — removed
- **NO Labels/Lines/Zones toggles** — removed
- **NO tactics section** — tactics belong to layout, not tournament
- **NO "Import schedule" button** when matches exist (only in empty state)

### 5.7 Tournament setup polish (approved April 22, 2026 — Brief A)
- **Multi-division tournaments** — `NewTournamentModal` + `EditTournamentModal` render division chips as multi-select toggles (add/remove), not single-select replace. Form state `divisions: string[]`. Validation: `divisions.length >= 1` when `DIVISIONS[league]` exists; otherwise skipped (leagues without a divisions table don't gate submit). League switch clears the selection. Legacy defensive initializer accepts singular `tournament.division` for edits predating the array-native write path. Write path stores authoritative `divisions: [...]` AND mirrors `divisions[0]` to singular `division` for legacy readers like `ScheduleImport.jsx:240` (matches/teams remain single-division — § 10.3 unchanged).
- **Multi-select Add teams modal** — replaces tap-and-close single-add. Checkbox list (row = 52px touch target, whole row toggles), sticky footer shows `{N} selected` + primary `Add {N} teams` button. Batch writes via `Promise.allSettled`; on partial failure only failed rows stay selected and an inline error count is shown. Division filter unchanged (`sortedAvailable` — same league match + not-yet-scouted filter as the pre-multi-select path).
- **Single Add team affordance rule (I1)** — Scout tab renders exactly one `+ Add team` CTA at a time: empty-state CTA when `scouted.length === 0`, primary-action card row when `scouted.length >= 1`. Never both simultaneously. Any future surface adding another Add affordance must extend this XOR rule.

---

## 6. Teams Page

### 6.1 Team cards
- Icon + name + league badges + **⋮ dots menu** + chevron (›)
- ⋮ menu: "Edit name" / "Delete team" (danger)
- Chevron → TeamDetailPage (roster, leagues, divisions)
- **NO pencil icon** — removed (duplicate of chevron navigation)
- **NO trash icon** — replaced by ⋮ menu

### 6.2 Division selectors on create/edit
- When creating or editing team: league buttons + division selectors per league
- Same DIVISIONS[league] values as on TeamDetailPage

---

## 7. Delete Pattern (unified)

### 7.1 Trigger: ⋮ three-dots button
- Present on: match cards, team cards, point cards, tournament team cards
- Tap → ActionSheet (bottom sheet) with context actions
- Delete/Remove always last, red/danger, separated by divider

### 7.2 Confirmation: ConfirmModal
- Always shows what will be lost
- Match: "All scouted points and data will be permanently lost"
- Team from tournament: "All scouted data and match assignments will be permanently lost"
- Point: "Match score will be recalculated. This cannot be undone."
- Tournament: "All matches, points and scouted data will be permanently lost"

### 7.3 NO isAdmin guards
- All workspace users can delete (ConfirmModal is the safety net)
- **NO swipe-to-delete** — removed, replaced by ⋮ menu

---

## 8. Layout Page (ACTIVE REDESIGN — see CC_BRIEF_LAYOUT_REDESIGN.md)

### 8.1 Decided
- Single scrollable page (not tabs)
- Mirror system: editing one bunker updates its mirror pair
- BunkerCard bottom sheet with pair indicator, position pills, type bar
- Bunkers use `positionName` (e.g. "D1", "S50") alongside `name`
- Disco/Zeeker lines render per-side based on doritoSide

### 8.2 Canvas sizing
- Width-first: fits container width to prevent infinite zoom feedback loop
- No maxCanvasHeight on this page

---

## 9. Home Page
- Tournament list with league/year badges
- "+ Tournament" button
- Recent matches section
- **Layout selection in tournament creation modal** (dropdown from layouts library)
- `addTournament` stores `layoutId` in Firestore

---

## 10. Data Model

### 10.1 Team
- `name`, `leagues[]`, `divisions: { NXL: 'D3', PXL: 'Div.1' }`, `parentTeamId`
- Child teams (2nd roster) linked via parentTeamId

### 10.2 Tournament
- `name`, `league`, `year`, `divisions[]`, `layoutId`, `type` ('practice' optional)
- Practice type: players can be on multiple teams, assignments don't count to history

### 10.3 Match
- `teamA`, `teamB` (scoutedTeam IDs), `name`, `division`, `status` ('closed' = final)
- `scoreA`, `scoreB` computed from points

### 10.4 Point
- `outcome`, `isOT`, `comment`, `fieldSide`
- `teamA: { players, shots, assignments, bumpStops, eliminations, eliminationPositions, penalty }`
- `teamB: { ... }` (same structure)

---

## 11. Tactic Page (REDESIGN — scouting-style)

### 11.1 Philosophy
Tactic page uses the **same interaction model as scouting editor** (MatchPage).
Full-height canvas, floating toolbar on player tap, drag-to-bump, ShotDrawer for shots.
**No roster assignment** — tactics define positions (P1–P5), not specific players.
**No multi-step** — one breakout view per tactic, no step navigation.
**No analysis overlays** — no visibility heatmap, no counter-play, no stance selector. Those belong to a separate advanced analysis module.

### 11.2 Layout (top to bottom, full `100dvh`)
- **Header:** `PageHeader` component — back chevron (‹ Layout), title = tactic name, `right={<MoreBtn />}` → ActionSheet (Rename, Print, Delete)
- **Canvas:** `flex:1` fills all remaining height (`maxCanvasHeight` set like MatchPage). FieldCanvas with pinch-to-zoom, loupe, full field (no half-field viewport). Shows bunkers from layout, player markers P1–P5 with playerColors
- **Bottom bar:** "Save tactic" (amber, full-width) — single button, no print icon here

### 11.3 Player interaction (same as scouting, minus Assign & Hit)
- **Tap canvas** → place next empty player slot (P1→P5)
- **Tap placed player** → floating toolbar: Shot (🎯), Del (✕) — **only 2 actions**
- **Drag player** → move position. Drag > 8% = auto bump stop at start pos (see section 2.2)
- **Long-press** → loupe fine positioning
- **Shot** → opens ShotDrawer (side panel, tap to place shots on opponent half)
- **NO Assign** — no roster binding on tactic level
- **NO Hit/Alive** — irrelevant for pre-game planning
- **NO Bump button** — bump is drag side-effect only (see section 1.4 / 2.2)

### 11.4 Player labels
- Players shown as numbered circles: 1, 2, 3, 4, 5
- **No roster names** — tactic positions are generic (P1–P5), coach assigns real players at match time
- Colors: `COLORS.playerColors` array (red, blue, green, purple, orange)

### 11.5 Bump stops
- Created automatically when player is dragged > 8% distance (same mechanic as scouting)
- Orange dot (🟠) at drag start position, dashed line to new position
- No separate bump menu action — drag IS the bump

### 11.6 Print
- Triggered from ⋮ ActionSheet → "Print" action → `window.print()`
- Also available from tactic ⋮ menu on LayoutDetailPage (tactic card ActionSheet)
- `@media print` CSS: white background, canvas rendered at full width, tactic name as heading, bunker labels visible, no UI chrome

### 11.7 What Tactic Page does NOT have
- **NO multi-step / step navigation** — removed (was overengineered)
- **NO step description input** — tactic has only a name
- **NO ModeTabBar** — removed (was 5-tab bar: Place/Shots/Draw/Counter/Save)
- **NO counter-play mode** — removed (future: separate analysis module)
- **NO visibility heatmap** — removed (future: separate analysis module)
- **NO stance selector** — removed
- **NO FieldEditor wrapper** — no toggle toolbar (Labels/Lines/Zones)
- **NO RosterGrid** — no player assignment
- **NO PlayerChip strip** — no player list below canvas

### 11.8 Freehand drawing (on Tactic Page)
- Coach can draw directly on the field canvas (arrows, circles, annotations)
- ✏️ button on bottom bar (glows amber when active), next to Save tactic
- Strokes are amber (#f59e0b), 3px width
- Stored in Firestore as object `{ "0": [{x,y},...], "1": [...] }` (not nested arrays — Firestore limitation)
- "Clear drawings" in ⋮ ActionSheet
- Pointer events overlay canvas on top of FieldCanvas
- Strokes persist across sessions (saved with tactic)

### 11.8 Data model (simplified)
```javascript
{
  name: 'Snake push dorito',
  players: [{ x, y }, { x, y }, null, null, null],  // 5 slots, normalized 0-1
  shots: { "0": [], "1": [], "2": [], "3": [], "4": [] },  // Firestore object (no nested arrays)
  bumps: [null, { x, y }, null, null, null],          // per-player bump stops
  freehandStrokes: { "0": [{x,y},...], "1": [...] },  // Firestore object, or null
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```
**No `steps[]` array** — single flat structure. No `assignments[]`.

---

## 12. NOT Implemented (backlog — do NOT build without explicit instruction)
- Break analyzer / prediction engine (spec exists: docs/architecture/BREAK_ANALYZER_SPEC.md)
- Tournament tendencies analytics (lineup patterns, player insights)
- Paintball IQ prediction engine
- Body count scenario analysis
- Dark/light theme toggle
- Settings page
- Export CSV/Excel
- Haptic feedback
- Keyboard shortcuts
- Practice tournament type
- Quick logging mode (line+score without canvas)

## 19. Quick Shots — Dual Mode (approved April 2026)

### Concept
Two ways to record shots: Quick (zone-based) and Precise (canvas tap). Quick is default for live play, Precise is optional drill-down.

### Quick Shot zones
- **Dorito** — top of field (above disco line) — color `#fb923c`
- **Center** — middle of field (between disco and zeeker) — color `#94a3b8`
- **Snake** — bottom of field (below zeeker line) — color `#22d3ee`
- Zones are lateral bands running horizontally across the field
- Player can be at ANY position on the field and shoot towards any zone
- Typical: 1-2 zones per player, rarely 3

### Flow
1. Tap player on canvas → floating toolbar
2. Tap 🎯 Shot → **QuickShotPanel** slides up (NOT ShotDrawer)
3. Toggle zone buttons: Dorito | Center | Snake (ordered top→bottom matching field)
4. Optional: "Precise placement →" opens existing ShotDrawer for exact positioning
5. Both quickShots and precise shots can coexist on same player

### Canvas visualization
- Dashed arrow lines from player position → right edge of field at zone Y-level
- Right edge has three colored zone bars (dorito/center/snake)
- Bars light up when any player targets that zone
- Zone labels near right edge in dark pills
- Respects `doritoSide` — if dorito=bottom, zones invert

### Data model
```javascript
// New field alongside existing shots:
quickShots: { "0": ["dorito","center"], "1": ["snake"], ... }
// Existing precise shots unchanged:
shots: { "0": [[x,y],[x,y]], "1": [], ... }
```

## 13. Coaching Statistics Definitions (approved April 2026)

All stats are per-point percentages. A point counts as 1 regardless of player count.

### Side stats
- **Dorito %**: points where someone CROSSED disco line (ran on dorito side)
- **Snake %**: points where someone CROSSED zeeker line (ran on snake side)  
- **Disco %**: points where NOBODY crossed disco line (stayed behind = passive)
- **Zeeker %**: points where NOBODY crossed zeeker line (stayed above)
- Dorito + Disco = 100%, Snake + Zeeker = 100%

### Zone stats
- **Center %**: players between disco/zeeker lines AND within 70% x from own base
- **Danger %**: players inside drawn danger polygon (null if not drawn)
- **Sajgon %**: players inside drawn sajgon polygon (null if not drawn)

Implementation: `src/utils/coachingStats.js` — `computeCoachingStats(points, field)`

## 14. Point Summary Cards (Option C, approved April 2026)

Layout: `[4px accent bar] [content area] [56px mini field preview]`
- Accent bar: result color (green/red/amber)
- Content: #N + winner label + badges (OT/DANGER/SAJGON) + XvY count
- Dorito/snake micro split bar with D/S count
- Elim count, penalty, comment (1 line italic)
- Mini field: green bg, red dots for player positions

## 15. Layout Workflow (April 2026)

### Flow
1. Wizard: Basic Info → Calibration → Vision Scan (or skip)
2. After wizard → `/layout/{id}/bunkers` (Bunker naming editor)
3. From layout detail ⋮ menu:
   - "Bunker names & types" → `/layout/{id}/bunkers`
   - "Lines & zones config" → modal with disco/zeeker sliders + danger/sajgon zones
   - "Ballistics system" → `/layout/{id}/ballistics`
   - "Re-calibrate field" → calibration modal
   - "Re-scan bunkers (Vision)" → OCR modal

### Bunker Editor
- Scouting-style full-height canvas
- Tap bunker → bottom sheet with position name + type grid
- Name suggestions based on bunker side (dorito/snake/center)
- "Save & next" for quick sequential naming
- Mirror pairs auto-updated

## 16. Ballistics System (Phase 1, April 2026)

Entry point: Layout ⋮ menu → "Ballistics system"
Page: `/layout/{id}/ballistics`
- Full-height canvas with visibility overlay
- Tap bunker or free point → compute 3-channel visibility
- Channels: safe (green→red), arc (orange), exposed (blue)
- Uses Web Worker (`ballisticsEngine.js`) for computation
- See `docs/architecture/BALLISTICS_SYSTEM.md` for full documentation

## 17. Coaching Statistics Definitions (April 2026)

All stats are per-point percentages. A "point" counts once regardless of player count.

### Side Statistics
- **Dorito %**: Points where someone CROSSED disco line (ran dorito)
- **Snake %**: Points where someone CROSSED zeeker line (ran snake)  
- **Disco %**: Points where NOBODY crossed disco (stayed behind disco line)
- **Zeeker %**: Points where NOBODY crossed zeeker (stayed above zeeker line)
- **Center %**: Points with player between disco/zeeker lines AND within 70% x from own base

Mathematical: Dorito + Disco = 100%. Snake + Zeeker = 100%.

### Zone Statistics (require drawn polygons on layout)
- **Danger %**: Points with player inside danger polygon (null if polygon not drawn)
- **Sajgon %**: Points with player inside sajgon polygon (null if polygon not drawn)

### Implementation
- Utility: `src/utils/coachingStats.js` → `computeCoachingStats(points, field)`
- Used on: MatchPage heatmap (CoachingStats inline row), ScoutedTeamPage (aggregate)
- All points normalized to "starting from left" via `mirrorPointToLeft`
- `doritoSide` from layout determines which Y direction is dorito vs snake

### Point Card (Option C)
- 4px left accent bar in result color
- Winner label + OT/DANGER/SAJGON badges
- XvY player count
- Dorito/snake micro split bar
- 56px mini field preview on right with player dots

## 18. Concurrent Scouting — chess model (DEPRECATED — superseded by § 42-44)

> ⚠️ **DEPRECATED as of April 22, 2026 (Brief F).** The shared-doc chess model below was replaced by **per-coach point streams** (§ 42). Side-claim fields (`homeClaimedBy`/`awayClaimedBy`/`homeClaimedAt`/`awayClaimedAt`) are no longer written or read — Brief F retired the claim system entirely. Stale values on pre-retirement match docs are harmless (no code path reads them). See § 42 for per-coach stream architecture, § 43 for URL entry semantics, § 44 for Brief 9 polish.
>
> This section is preserved as a history/context reference. Do NOT use as a spec for new work. Any "chess model" terminology in comments (e.g., "perspective locked during editing") survives only as implementation detail inside per-coach streams.

### How it worked (historical)
Two coaches could scout the same match simultaneously. Each picked their side:
- Coach A → "Home" (scoutingSide='home') → wrote only `homeData`
- Coach B → "Away" (scoutingSide='away') → wrote only `awayData`

### Data model (still current for legacy grandfathered docs)
Each point document had independent side data:
```javascript
{
  homeData: { players, shots, bumps, elim, scoutedBy: "uid-A" },
  awayData: { players, shots, bumps, elim, scoutedBy: "uid-B" },
  teamA: { ... },  // legacy copy of homeData (backward compat)
  teamB: { ... },  // legacy copy of awayData
  outcome: 'win_a' | 'win_b' | 'pending',
  status: 'open' | 'partial' | 'scouted',
}
```
Point-document shape survives for legacy data. The **claim fields** on the parent `match` doc (retired in Brief F) do not.

### Retired: Side picker with LIVE badge
- ~~Shows "LIVE" badge when other side is actively claimed~~
- ~~Grayed out + disabled when claimed~~
- ~~Stale claims (>30 min old) shown but overridable~~
- ~~"Just observe" always available~~

Rationale: per-coach streams mean two coaches can scout the same team simultaneously without conflict — their writes land in separate doc streams and merge at end-match.

### Retired: Claim system (Firestore-backed)
- ~~`match.homeClaimedBy` / `match.awayClaimedBy` — uid of claiming coach~~
- ~~`match.homeClaimedAt` / `match.awayClaimedAt` — timestamp~~
- ~~Heartbeat every 5 min~~
- ~~Stale threshold: 30 minutes~~

Rationale: coachUid per doc (§ 42) identifies ownership at the stream level. Match-level claim state was redundant.

### Save behavior — superseded by § 42 per-coach stream writes
- New Scout CTAs (`&mode=new`) write to per-coach stream via `savePointAsNewStream` (§ 42).
- Legacy URL fallback (no `&mode=new`) still uses the joinable-search path for grandfathered flows; not exercised by new UI.
- End-match merge combines streams into canonical docs (§ 42.3).

### Point status tracking — unchanged
- `open` — shell created, no player data yet
- `partial` — one coach saved their side, other side empty
- `scouted` — both sides have player data
- Status computed on save: checks if `otherSideKey` has player data

### Post-Brief 8: `canonical` flag (see § 42)
**Brief 8 added an orthogonal `canonical` flag** on a per-coach stream model:
- During match, each coach writes to their own doc stream (ID scheme `{matchKey}_{coachShortId}_{NNN}`); `canonical: false` on all.
- At End match, `endMatchAndMerge` groups by coachUid, merges per-index, writes canonical docs, flips `canonical: true` on source/solo/legacy docs per rule.
- Match review post-merge filters by `canonical === true` — see § 42 for full semantics.

### Merge view (heatmap)
- Toggle in heatmap: `[My Team]` / `[Both Teams]`
- "My Team" — shows only own side's positions and shots (default)
- "Both Teams" — shows all 10 players + shots from both coaches
- Coaching stats update based on selected view
- `getHeatmapPoints('all')` combines both sides with proper mirroring

### "Scout Other Team" button
Available in concurrent mode — releases current claim and claims other side.

## 20. Tournament Team Cards — Coach Stats (approved April 2026)

### What it shows
Each team card on TournamentPage displays at-a-glance stats for coaches:
- **W-L record** (e.g. `5W-1L`) with wins green, losses red
- **Win rate %** as colored badge (green >60%, amber 40-60%, red <40%)
- **Point differential** (+12) and **pts for:against** (32:20)
- **n=X scouted pts** badge with ⚠ warning when n < 5

### Data sources
- W-L, point diff, for:against — computed from `matches` (zero additional queries)
- Scouted point count — lightweight fetch from points subcollections

### Sort order
Teams sorted by performance: played count desc → win rate desc → point diff desc.

### Card layout
Top row: icon + name + W-L + win% badge + 👁 + ⋮
Subtitle: player count + division
Stats row (border-top separator): point diff | for:against | n=X badge
Teams with no matches: simplified card without stats row.

## 21. Match Review Page — Production Design (approved April 2026)

### Elevation system (Apple HIG dark mode)
Three surface layers creating depth hierarchy:
- **Deepest (page bg):** `#080c14`
- **Cards (point cards):** `#0f172a` with border `#1a2234`
- **Elevated (scoreboard):** `#111827`
- **Recessed (score area):** `#0d1117`
Higher elevation = lighter surface. Never use same shade for different layers.

### Scoreboard (top card)
- Full team area is ONE tappable zone — no separate CTA button
- Team name: 18px weight 700
- Below name: amber text "Scout ›" (11px, weight 600, color `#f59e0b`) as affordance, NOT a button
- Active state: whole team area background changes to `#1a2234`
- Score center: 32px weight 900, separated by `#2a3548` colon
- Below score: "5 points" label (8px/600, `#475569`)
- Dividers between zones: 1px solid `#1e293b`

### Point cards
- Split-tap: left team name → edit that team's data, right team name → edit other team's
- Center score area → toggle point preview on heatmap
- Min height: 58px (Apple 44px touch target met with margin)
- Winner: green bar (3px, `#22c55e`) + bold name (14px/600, `#e2e8f0`)
- Loser: red bar (3px, `#ef4444`) + dimmed name (14px/500, `#64748b`)
- Score: 15px/700, `#8b95a5` (neutral), amber `#f59e0b` when preview active
- SVG chevrons (not text entities): `#2a3548` default, `#475569` on hover
- Card border-radius: 12px
- OT badge: 7px/700, `#f59e0b`

### Heatmap
- Background: `#0a1410` (dark green tint, NOT pure dark)
- Border: `#162016` (subtle green)
- Border-radius: 14px
- Density clouds: blur 18px, opacity 0.12
- Player dots: 3px radius, opacity 0.4
- Preview mode: dots become 4px with numbered labels (white text on colored circle) + 6px glow ring at 0.15 opacity
- Preview label: "Point #N" pill at top center, amber text on dark bg
- Team labels: 7px/600 uppercase, very dim (35% opacity of team color)

### Point preview interaction
- Tap score on point card → heatmap shows ONLY that point's data
- Clouds fade out, specific player positions appear with numbers
- Field border goes amber subtle (`#f59e0b25`)
- Tap same score again or "Show all points ×" → return to full heatmap

### Navigation
- Header: 48px, bg `#0d1117`
- Back: amber chevron SVG + "Matches" text
- Title: centered, 13px/500, `#8b95a5` (muted — not dominant)
- LIVE pill: 8px/700, amber tinted bg with border

### End match button (sticky bottom)
- 52px height, border-radius 12px
- Border: 1.5px solid `#ef444425`
- Background: `#ef444408`
- Text: `#ef4444`, 14px/600
- Active: bg `#ef444418`, border `#ef444450`
- Gradient fade on container: transparent → page bg

### Amber usage — RESTRICTED
Amber accent (#f59e0b) used ONLY for:
- Back navigation arrow + label
- "Scout ›" affordance text
- Point preview active state (score color, field border, preview label)
- OT badge
- LIVE pill
NOT for: decorative borders, card backgrounds, headers, section labels

### Typography scale (this page)
- 32px/900: match score (hero)
- 18px/700: team names in scoreboard
- 15px/700: point score
- 14px/600: team names in point cards
- 13px/500: nav title
- 11px/600: section labels, scout CTA
- 9px/600: point number, hints
- 8px/600: sublabels
- 7px/600-700: heatmap labels, OT badge

## 22. Match List — Production Design (approved April 2026)

### Overview
TournamentPage simplified for scout workflow. Matches on top, everything else collapsed at bottom.

### Match card (split-tap)
- Background: `#0f172a`, border: 1px solid `#1a2234`, border-radius: 12px
- Min height: 62px per row
- **Left team area:** tap → scouting mode for this team. Name 15px/600 + "tap to scout" hint 9px/500 `#475569`
- **Right team area:** same, right-aligned
- **Center score area:** tap → match review page. Score 20px/800, bg `#0b1120` (recessed)
- Active state on team areas: background `#1a223460`

### Match states
- **Live:** border `#f59e0b15`, Live pill below score
- **Scheduled:** score dim `#334155` as "— : —", time pill below
- **Completed:** entire card opacity 50%, W (green `#22c55e`) / L (red `#ef4444`) under team names instead of "tap to scout"
- **Claimed side:** locked at 35% opacity, green dot + scout name, untappable (no active state)

### Section headers
- Label: 11px/600, `#64748b`, letter-spacing .4px
- Count: 11px/500, `#334155`
- Top margin: 20px (16px for first section)

### Collapsed footer
- Separator: 1px solid `#1a2234`
- "Teams · Settings · Layout ▾" — 11px/500, `#475569`, centered
- Taps to expand (accordion) — scout rarely needs these

### Navigation
- Same nav bar as match review: 48px, bg `#0d1117`
- Back: "‹ Start" (amber)
- Title: tournament name, 14px/600, `#e2e8f0`, left-aligned
- Pills: league + year (right)

## 23. Point Scouting — Production Design (approved April 2026)

### Overview
Entered by tapping team name on match card or match review scoreboard.
Immediately shows canvas — no side picker, no intermediate screen.

### Navigation
- Back: "‹ Match" → returns to match review (level 2), NOT match list
- Title: "Scouting {TEAM}" centered, 13px/500, `#8b95a5` (muted center)
- Right: "vs {OPP} · {score}" 11px, `#64748b`

### Canvas
- Background: `#0a1410` (dark green tint)
- Field lines: 1.5px dashed, 8% opacity
- Base labels: "HOME" / "AWAY" — 7px/600, `#334155`, pill bg `#0a141080`
- Zone labels: "Dorito" / "Snake" — 8px/600, team color at 60% opacity, pill bg
- Player circles: 30px, numbered, team playerColors
- Selected player: 3px amber ring (`box-shadow: 0 0 0 3px #f59e0b`)
- Canvas fills all available height (flex:1)

### Roster pills
- Container: bg `#0d1117`, border-top `#1a2234`, horizontal scroll
- Pill: 11px/500, `#8b95a5`, bg `#0f172a`, border `#1a2234`, border-radius 20px
- Selected: border `#f59e0b`, color `#f59e0b`, bg `#f59e0b08`
- Padding: 6px 12px

### Point summary (NEW — scout verification)
- Container: bg `#0d1117`, border-top `#1a2234`, padding 10px 14px
- Title: "Point #N summary" — 8px/600, `#334155`, uppercase, letter-spacing .6px
- Chips row: flex wrap, gap 5px
- Chip: 10px/500, `#8b95a5`, bg `#0f172a`, border `#1a2234`, border-radius 8px, padding 4px 9px
- Each chip has colored dot (5px circle): white=placed, orange=dorito, cyan=snake, red=shots/elim
- Updates live as scout places/removes data

### Footer
- Container: bg `#0d1117`, border-top `#1a2234`, padding 10px 14px 14px
- "Save point": flex 2, amber gradient (`#f59e0b → #d97706`), 50px height, 12px radius, shadow `0 2px 16px #f59e0b20`, text `#0a0e17` 14px/700
- "Outcome": flex 1, bg `#0f172a`, border `#1a2234`, `#8b95a5` 12px/700

### Back navigation chain
Match list → (tap team) → Point scouting → (back) → Match review → (back) → Match list
This ensures scout always passes through review on exit, where they can verify data or scout more points.

## 24. Player Stats Page (approved April 2026)

### Route
`/player/:playerId/stats?scope=tournament&tid=xxx`

### Entry points
- Roster on ScoutedTeamPage → scope defaults to "This tournament"
- Player profile (TeamDetailPage/PlayersPage) → scope defaults to "Global"
- Point card in match review (future) → scope defaults to "This match"

### Layout (top to bottom)
1. **Profile header:** avatar (64px circle, player color, number), name (20px/700), team (12px/500 `#64748b`), HERO badge if tagged
2. **Scope pills:** `[This tournament] [All tournaments] [Global]` — filters all data below. Active = amber border + bg `#f59e0b08`
3. **Metrics grid:** 2×2, cards `#0f172a` border `#1a2234` radius 12px
   - Win rate: percentage, colored (green >70%, amber 40-70%, red <40%), 3px bar
   - Points played: count
   - Break survival: percentage with bar
   - Break kill rate: percentage with bar
4. **Preferred position:** breakdown bars — position name + bar + percentage + count (e.g. "Snake 1  ████  71%  10/14"). Colors: cyan for snake, orange for dorito, gray for center
5. **Match history:** per match rows — opponent name, W/L badge, points played

### Metric computation
- **Win rate:** points where player was assigned AND team won / total points assigned
- **Break survival:** points where player was NOT eliminated / total points
- **Break kill rate:** points where player got elimination on break / total points
- **Preferred position:** classify player's breakout position into zones using disco/zeeker lines from layout

### Typography
- Name: 20px/700
- Metric values: 24px/800
- Metric labels: 10px/500 `#475569`
- Position names: 12px/600
- Match opponent: 13px/500

## 25. HERO Rank System (approved April 2026)

### What it is
Manual tag set by coach to mark key players. Not computed — declarative.

### Scopes
- **Global HERO:** on player profile (TeamDetailPage). Stored in player doc: `hero: true`
- **Tournament HERO:** on roster in ScoutedTeamPage. Stored in scouted team roster entry: `heroPlayers: ['playerId1', 'playerId2']`
- Multiple HEROs per team allowed

### Setting HERO
- Toggle button on player profile card: amber star icon + "HERO" text
- Active: amber bg `#f59e0b12`, amber text, amber border `#f59e0b25`
- Inactive: transparent bg, `#475569` text, border `#1a2234`

### Visual indicators

**On scouting canvas:**
- Amber glow ring: `box-shadow: 0 0 0 2.5px #f59e0b, 0 0 12px #f59e0b30`
- Always visible (not just when selected)
- Does NOT change shape or color of player circle — number and team color preserved

**On roster pills:**
- Amber dot (6px circle, `#f59e0b`) before player name
- Pill border does NOT change (only selected state uses amber border)

**On heatmap:**
- Amber stroke ring around HERO position dots: `stroke: #f59e0b, stroke-width: 1.5, r+3px, opacity 0.6`
- Visible in both density cloud and point preview modes

**On player profile (avatar):**
- Small amber circle (20px) with star icon at top-right of avatar
- Border: 2px solid page bg color (cutout effect)

**HERO badge:**
- Below team name: amber pill with star + "HERO" text
- 10px/700, amber color, bg `#f59e0b12`, border `#f59e0b20`, radius 6px

### Data model
```javascript
// Player doc (global hero)
{ name: "Koe", hero: true, ... }

// Scouted team doc (tournament hero)
{ teamId: "...", roster: [...], heroPlayers: ["playerId1", "playerId2"] }
```

## 26. Scout/Coach Mode Toggle (approved April 2026)

### Toggle bar
- Position: below tournament page header, above content
- Style: pill toggle bar, bg `#0f172a`, border `#1a2234`, border-radius 10px, padding 3px
- Two options: "Scout" | "Coach"
- Active: bg `#111827`, color `#e2e8f0`, subtle shadow
- Inactive: transparent, color `#475569`
- Persisted: `localStorage.setItem('tournamentMode_' + tid, 'scout' | 'coach')`

### Scout mode (default)
Content order: Matches (Live → Scheduled → Completed) → collapsed "Teams · Settings · Layout ▾"
Match cards show "tap to scout" hints.

### Coach mode
Content order: Teams (with W-L) → Matches → collapsed "Settings · Layout ▾"
Match cards do NOT show "tap to scout" — coach taps score for review.

### Team card in coach mode — MINIMAL (Apple HIG: clarity, deference)
- Single touch target (whole card → navigates to ScoutedTeamPage)
- Layout: `[Team name]  [5W · 1L]`
- Name: 15px/600, `#e2e8f0`, flex:1
- W-L: 13px/700, wins `#22c55e`, separator `#1e293b` (·), losses `#ef4444`
- Card: bg `#0f172a`, border `#1a2234`, radius 12px, padding 14px 16px
- Active state: bg `#151d2e`
- NO: chevron, logo, point diff, for:against, win%, eye, n=, matches played
- All detailed stats are on drill-down (ScoutedTeamPage)

### NOT on team card (moved to drill-down):
Point diff, pts for:against, win rate %, observed eye, n= scouted points,
matches played count, team logo. These belong on ScoutedTeamPage where
coach has full context.

## 27. Apple HIG Compliance — MANDATORY for all screens (April 2026)

### This is a GLOBAL rule. Every screen, component, and interaction MUST follow these principles.

### Core principles (Apple HIG)
1. **Clarity** — clean, uncluttered, minimal elements. If an element doesn't serve a clear purpose, remove it.
2. **Deference** — UI never overshadows content. Controls recede, data leads.
3. **Depth** — visual layers (elevation) communicate hierarchy. Higher = lighter surface in dark mode.
4. **Consistency** — same patterns everywhere. Same component = same behavior on every screen.

### Elevation system (dark mode, mandatory)
- Page background: `#080c14` (deepest)
- Cards/list items: `#0f172a` (elevated)
- Headers/panels: `#111827` (higher)
- Recessed areas (score centers): `#0b1120` (inset)
- Never use the same shade for different elevation layers.

### Typography rules
- System font: Inter (our equivalent of SF Pro)
- Hero numbers (scores): 28-32px / weight 800-900
- Primary text (names, titles): 15-18px / weight 600-700
- Body text: 13-15px / weight 500
- Secondary/labels: 11px / weight 600
- Micro (badges, hints): 8-9px / weight 600-700
- NEVER below 8px. Prefer 11px+ for anything the user needs to read.
- Letter-spacing: negative on large text (-.2 to -.3px), neutral on body, positive on labels (.3-.6px)

### Touch targets
- Minimum: 44×44px (Apple HIG mandate)
- Recommended: 48px for primary actions
- Interactive cards: min-height 52-60px

### Color discipline
- Amber `#f59e0b` = interactive accent ONLY (CTAs, active states, navigation, selected items)
- Green `#22c55e` = positive/win/success
- Red `#ef4444` = negative/loss/danger/destructive
- Cyan `#22d3ee` = snake zone
- Orange `#fb923c` = dorito zone
- DO NOT use amber decoratively. Every amber element must be tappable or indicate active state.

### Card design
- One card = one touch target (unless explicitly split-tap like match cards)
- No unnecessary ornamentation (no icons, badges, extra stats that belong on drill-down)
- Show the minimum info needed at this level. Details on drill-down.
- Active state: subtle background change (not border change)
- Border-radius: 12px for cards, 10px for inner elements, 8px for pills

### Content hierarchy
- Show only what's needed at the current navigation level
- Details belong on drill-down, not on list cards
- If you're adding more than 3 data points to a card, you're probably showing too much
- "Tap to see more" > "cram everything into one view"

### Navigation
- Back label matches destination: "‹ Matches", "‹ Match", "‹ Start"
- Title centered (13-14px/500-600)
- Status pills right-aligned (LIVE, FINAL)
- Header height: 48px, bg `#0d1117`

### Anti-patterns (NEVER do these)
- ❌ Multiple CTAs competing for attention on one card
- ❌ Amber on non-interactive elements
- ❌ Chevrons on cards that aren't split-tap (whole card navigates)
- ❌ Stats/numbers on list cards that belong on detail pages
- ❌ Text smaller than 8px
- ❌ Touch targets below 44px
- ❌ Same background shade on different elevation layers
- ❌ Gradients/shadows/glow for decoration (only functional: CTA buttons, HERO indicator)

## 28. Coach Team Summary — ScoutedTeamPage redesign (approved April 2026)

### Overview
Stats-first dashboard for coaches. Replaces current heatmap-first layout.
Apple HIG: clarity, deference — minimum info per level, details on drill-down.

### Content order (top to bottom)
1. **Sample badge:** "26 scouted points · 6 matches" — 10px/500, `#475569`, bg `#111827`, radius 6px
2. **Key insights:** text-first cards with colored icon. Most important coaching info.
3. **Break tendencies:** % bars (dorito/snake/center)
4. **Performance:** % bars (win rate, break survival, fifty reached)
5. **Heatmap:** mini preview (110px), "Tap to expand heatmap", full field both teams
6. **Players:** simplified cards at bottom

### Insight cards
- Background: `#0f172a`, border `#1a2234`, radius 12px, padding 12px 14px
- Icon: 28px rounded square, tinted bg + colored text
  - Orange `#fb923c12` = aggressive tendency
  - Cyan `#22d3ee12` = snake/pattern tendency
  - Green `#22c55e12` = strength/positive
  - Red `#ef444412` = weakness/vulnerability
- Title: 13px/500, `#e2e8f0`, line-height 1.4
- Detail: 11px/500, `#475569`

### Stat rows (break tendencies + performance)
- Background: `#0f172a`, border `#1a2234`, radius 10px, padding 12px 14px
- Name: 13px/500, `#8b95a5`, flex:1
- Bar: 56px wide, 4px, bg `#111827`, colored fill
- Value: 13px/700, zone/status colored, min-width 34px right-aligned

### Player cards (MINIMAL — Apple HIG)
- Single touch target → Player Stats Page
- Layout: `[32px avatar] [name + subtitle] [win rate]`
- Avatar: number, team playerColor, HERO gets amber glow
- Name: 14px/600, HERO gets amber dot
- Subtitle: `{position} · {pts} pts · {kills} kills` — 10px/500, `#475569`
- Win rate: 15px/700, colored (green >70%, amber 50-70%, red <50%)
- Label under win rate: 9px/500, `#334155`
- NO stat rows, NO micro-metrics, NO influence, NO survival, NO fifty on card
- All detailed stats on drill-down (Player Stats Page)
- Cards sorted by win rate desc

### What is NOT on this page
- ❌ Point diff, for:against (too detailed)
- ❌ Player stat rows/grids (drill-down only)
- ❌ Multiple metrics per player card
- ❌ W-L record per player (win rate % is sufficient)

## 29. Obstacle Play Shots (approved April 2026)

### Concept
Two phases of shooting per player per point:
- **Break:** shots while running to position (existing quickShots)
- **At obstacle:** shots from cover after reaching position (new)

### Scouting input
QuickShotPanel gets segmented control at top: `[Break] [At obstacle]`
Same three zone buttons below (Dorito/Center/Snake).
Data recorded separately.

### Data model
```javascript
// Existing:
quickShots: { "0": ["dorito","center"], ... }     // break phase
// New:
obstacleShots: { "0": ["snake","center"], ... }   // obstacle phase
```
Same Firestore codec pattern as quickShots.

### Canvas visualization
- **Break shots:** thin dashed arrows (1.5px, dash `5 3`) — temporary, in motion
- **Obstacle play:** thicker solid arrows (2.5px, no dash) — established, sustained
- Same zone colors (dorito=#fb923c, center=#8b95a5, snake=#22d3ee)
- Same right-edge zone bar targets
- Legend at bottom when both types visible: dashed = Break, solid = At obstacle

### Panel styling
- Segmented control: bg `#0f172a`, border `#1a2234`, radius 8px, padding 2px
- Active segment: bg `#111827`, shadow, `#e2e8f0` text
- Inactive: transparent, `#475569`
- Title changes: "Break shot direction" ↔ "Obstacle play direction"

## 30. Metric Formulas — Approved (April 14, 2026)

### Coaching Stats (per team, per tournament)
| Metric | Formula |
|---|---|
| Dorito % | points where any player y < discoLine / total |
| Snake % | points where any player y > zeekerLine / total |
| Center % | points where player between disco/zeeker AND 0.3 ≤ x ≤ 0.7 / total |
| Late break % | points where any lateBreak[i]=true / total |

### Performance (per team)
| Metric | Formula |
|---|---|
| Win rate | points with outcome='win' / points with outcome ∈ {win, loss} |
| Break survival | points where NOT all eliminations[i]=true / total |
| Fifty reached | points where any player 0.4 < x < 0.6 / total |

### Player Stats
| Metric | Formula |
|---|---|
| Win rate | points where player in assignments AND team won / points played |
| Position | most frequent zone (dorito/center/snake) based on start position |
| Bunker | nearest bunker label to player's break position (within 15% distance) |
| Pts played | points where player appears in assignments |
| Kills | shot zones (break + obstacle) correlated with opponent eliminations in same zone, same point |

### Kill Attribution
```
For each point where player was assigned:
  shotZones = union of quickShots[slot] + obstacleShots[slot]
  For each opponent eliminated in this point:
    if opponent's position zone ∈ shotZones → +1 kill credit
```

### Insights (auto-generated text)
| Insight | Condition | Type |
|---|---|---|
| Aggressive fifty | fiftyReached > 60% | aggressive (orange) |
| Low runners | avg runners < 2 | pattern (cyan) |
| Full push | avg runners ≥ 3.5 | pattern |
| Dorito dominant | dorito% > 65% | strength (green) |
| Snake dominant | snake% > 65% | strength |
| Side vulnerability | >X% losses from one side push | weakness (red) |
| Center control | center% > 70% | pattern |
| Uncovered zone | 0 obstacle shots in zone | weakness |
| Player dependency | delta win rate ≥ ±20% | strength/weakness |
| Late breakers | lateBreak% > 30% | pattern |

## 31. Bottom Tab Navigation — App Shell Redesign (approved April 14, 2026)

### Overview
Replace current home page + tournament page with 3-tab bottom navigation.
Apple HIG: tab bar for distinct sections, not modes.

### Tab bar
Position: bottom, sticky, safe-area-aware.
Background: `#0d1117`, border-top `1px solid #1a2234`.
3 tabs: Scout | Coach | More
Active: amber label `#f59e0b`, full opacity icon.
Inactive: `#475569` label, 40% opacity icon.
Touch target: full tab width, min 48px height.

### Context bar (top, sticky)
Shows active tournament. Background `#0d1117`, border-bottom `#1a2234`.
Layout: `[green dot 8px] [name + subtitle] [Change button]`
- Name: 14px/600 `#e2e8f0`
- Subtitle: 10px `#475569` — league + match count + team count
- Change button: 11px/600 amber, border `#f59e0b20`, bg `#f59e0b08`, radius 8px
- Hidden when no tournament selected

### 🎯 Scout tab
Content: match list (Live → Scheduled → Completed).
Match cards: split-tap with "tap to scout" hints.
Same as current scout mode on TournamentPage.

### 📊 Coach tab
Content: teams with W-L (tap → ScoutedTeamPage drill-down).
Below teams: match list (compact, tap score → review).
Same as current coach mode on TournamentPage.

### ⚙ More tab
Grouped list:
**Tournament section:**
- Matches (manage, add, import)
- Teams in tournament (add/remove scouted teams)
- Switch tournament

**Setup section:**
- Layouts
- Teams (global team management)
- Players (global player management)

**Workspace section:**
- Settings
- Leave workspace (red, destructive)

### Tournament picker (bottom sheet)
Triggered by "Change" button or "Switch tournament" in More.
- Active tournament: green dot, amber border
- Other tournaments: gray dot
- Closed: gray badge "CLOSED"
- Training: cyan badge "Training"
- Tournament: amber badge with league name
- Dashed card: "+ New tournament or training"
- Tap item → select + close sheet

### No tournament selected
- Context bar hidden
- All tabs show empty state: trophy icon + "Select a tournament or training to start scouting" + amber "Choose tournament" button
- Tab bar still visible and functional

### Routes
- `/` → app shell with tabs (replaces HomePage + TournamentPage)
- `/tournament/:tid/match/:mid` → match page (full screen, no tabs)
- `/tournament/:tid/team/:sid` → scouted team page (full screen, no tabs)
- `/player/:pid/stats` → player stats (full screen, no tabs)
- All other routes (layout, etc.) → full screen from More tab

### Data flow
- Active tournament stored in `localStorage('pbscoutpro_activeTournament')`
- Tab bar persists across tournament switches
- Last active tab persisted in `localStorage('pbscoutpro_activeTab')`

### What gets removed
- HomePage.jsx (replaced by app shell)
- TournamentPage.jsx scout/coach toggle (replaced by tabs)
- AppFooter component (replaced by tab bar in shell)
- Auto-redirect logic in HomePage

## 32. Training Mode (approved April 14, 2026)

### Overview
Training sessions for own team. Different from tournament: all players from same team,
dynamic squads, focus on individual player development, not opponent analysis.

### Flow
1. **Tournament picker** → "New training" or select existing training session
2. **Who's here** → nickname chip grid, tap to toggle attendance
3. **Form squads** → drag & drop between colored zones
4. **Training** → matchups, scouting (same canvas as tournament), results

### Step 1: Who's here
- Full team roster as wrapping nickname chips (44px height, 13px/700 nickname)
- Two sections: "Here" (green border+dot, #22c55e) on top, "Not here" (gray, #475569) below
- Preset pills: "Last training (N)", child team names "Ring (8)", "Rage (7)", "All (28)"
- Search bar filters by nickname
- Sticky footer: "{N} here — Form squads" amber CTA
- **Accessible anytime during training** to add late arrivals or remove early departures
- Tap toggles attendance. Stats preserved regardless of when player joined/left.

### Step 2: Form squads
- Screen fills 100% between nav and footer
- Layout based on squad count:
  - 2 squads: top/bottom horizontal split (each 50%)
  - 3 squads: three horizontal sections (each ~33%)
  - 4 squads: 2×2 grid (each 25%)
- Each zone: colored header (dot + name + count, 2.5px bottom border) + wrapping player chips
- Colors: Red (#ef4444), Blue (#3b82f6), Green (#22c55e), Yellow (#eab308)
- Drag & drop: press chip → ghost follows finger → drop on target zone → player moves
- Ghost: fixed position, amber border, player nickname, shadow
- Target zone highlights (#0f172a) when dragging over
- +/- buttons in info bar change squad count (2-4)
- NO shuffle button — coach assigns manually
- Players auto-distributed on entry (round-robin by index) as starting point
- Nav: "Players" back button (returns to Who's here), title "Squads"
- Footer: "Start training" amber CTA

### Step 3: Training (matchups + scouting)
- Context bar: date + team name + player count + "Edit squads" button
- Current matchup card: [Red (6) vs Blue (6)] with score + "Playing" badge
- Completed matchups below (dimmed, with Final badge)
- "+ New matchup" → select which squads play
- "Scout point" → same canvas as tournament scouting
- "Results" → player leaderboard
- "Edit squads" → returns to step 2 (for mid-training changes)

### Step 4: Results
- Player leaderboard sorted by Win%
- Each row: rank + nickname + pts played + +/- + win%
- Win% colored: green >60%, amber 40-60%, red <40%
- Matchup history below

### Data model
```javascript
// Training session document
/workspaces/{slug}/trainings/{tid}
{
  type: 'training',
  date: '2026-04-16',
  teamId: 'team123',
  layoutId: 'layout456',
  attendees: ['playerId1', 'playerId2', ...],
  squads: {
    red: ['playerId1', 'playerId3', ...],
    blue: ['playerId2', 'playerId4', ...],
  },
  createdAt, updatedAt
}

// Matchup = like a match in tournament
/workspaces/{slug}/trainings/{tid}/matchups/{mid}
{
  homeSquad: 'red',
  awaySquad: 'blue',
  scoreA: 3, scoreB: 1,
  status: 'playing' | 'closed',
  createdAt
}

// Points = same structure as tournament points
/workspaces/{slug}/trainings/{tid}/matchups/{mid}/points/{pid}
{
  // identical to tournament point structure
  homeData: { players, shots, quickShots, ... },
  awayData: { ... },
  outcome: 'win_a' | 'win_b',
}
```

### Player stats integration
- Training points feed into player stats with scope='training'
- Player Stats Page scope pills: [This tournament] [Training] [Global]
- Global scope includes both tournament AND training data
- Stats tracked independently of when player joined training session

### Relation to tournament picker
Training sessions appear in tournament picker with cyan "Training" badge.
Same list as tournaments, differentiated by `type: 'training'`.

## 33. User Accounts + Scout Ranking (approved April 15, 2026)

### Authentication
- Email/password login via Firebase Auth
- After login → enter workspace code (existing magic word, stays for now)
- Future: workspace assignment per user, no magic word needed
- Default role: all three (scout + coach + admin)
- Admin can reassign roles globally (not per workspace)

### Scout data attribution
- Already exists: `homeData.scoutedBy` and `awayData.scoutedBy` on each point
- Currently stores Firebase anonymous UID → will store real user ID
- Display scout name on data views

### Scout ranking (visible to all)
Card-based leaderboard on Coach tab or More tab:
- Composite score: volume (points collected) × quality (data completeness)
- Card: rank + name + points count + completeness % + star rating
- Tap card → detail view with:
  - Match progression bars (completeness per match, chronological, shows learning curve)
  - Per-section breakdown (breaks, shots, assignments, runners, hits)

### Scout issues / TODO (visible to scout)
Auto-generated list of missing data, grouped by type:
- "Missing shots (8 points)" → list of matches + point numbers
- "Missing player assignments (3 points)" → same
- Tap specific point → opens it for editing
- NOT drill-down explorer — system tells scout what to fix

### Match progression per scout
```
vs Nexty (first)    ████░░  68%
vs Husaria          ██████  82%
vs Tigers (latest)  ████████ 91%  ↑
```
Bar per match, chronological. Trend visible at glance.

### Data model additions
```javascript
// User document (Firebase Auth + Firestore profile)
/users/{uid}
{
  email, displayName,
  workspaces: ['workspace-slug-1', ...],   // lowercase slugs; app still uses localStorage for active workspace selection
  createdAt
}

// Point attribution (already exists, just use real UID)
point.homeData.scoutedBy = auth.currentUser.uid
point.awayData.scoutedBy = auth.currentUser.uid
```

### 33.1 `users/{uid}.role` — DEPRECATED (2026-04-22 audit)
An earlier iteration of the user profile seeded `role: 'scout,coach,admin'` (comma-separated string) on first sign-in. **No app path reads `users/{uid}.role` today** — all role gating resolves through `workspaces/{slug}.userRoles[uid]` (v2 security, § 38), which is array-shaped per the 2026-04-20 migration.

- Write path removed (`dataService.js:getOrCreateUserProfile` no longer emits the field). New profiles land in canonical shape.
- Legacy docs retain the junk string — harmless (unread).
- Defensive `parseRoles()` shim in `roleUtils.js` accepts array | comma-string | undefined and returns a deduped array, applied inside `getRolesForUser`. Survives any legacy read path that surfaces later.
- **Full data cleanup — lowercase workspace-slug normalization in `users.workspaces`, legacy `workspace.members`/`adminUid`/`passwordHash` field retirement, and `firestore.rules` consolidation on `users.workspaces` as the single membership source of truth — deferred to Brief G** (HIGH priority, requires Firebase Admin SDK + multi-checkpoint human review per its own spec).

### 33.2 Workspace slug — canonical shape
- Doc ID is **lowercase, `/^[a-z0-9-]+$/`**. `slugify()` in `useWorkspace.jsx` enforces this at workspace creation.
- Session-restore effect now also normalizes slugs loaded from `localStorage` / `sessionStorage` — legacy uppercase entries (e.g., `"Ranger1996"` for doc `ranger1996`) are case-folded on load and persisted back in the cleaned shape, so subsequent loads don't re-run the shim.

### Completeness computation per scout
For each scout's points, compute per-section fill rate:
- Breaks: positions placed / total slots
- Shots: players with quickShots or obstacleShots / non-runner placed players
- Assignments: players with roster ID / placed players
- Runners: runner flags set / placed players
- Hits: eliminations marked / placed players
- Composite: weighted average of all sections

### 33.3 ProfilePage — roles display + linked-player self-edit (approved 2026-04-23)

**Context.** § 49 introduced the dedicated Gracz tab and the `users/{uid}.roles` bootstrap, but the ProfilePage (`/profile`) only exposed display-name + password + photoURL. Pure players had no way to see *which* roles they held, and a linked player who wanted to fix their own nickname/number had to ask a coach. Per Jacek's request, ProfilePage now (a) renders the user's resolved roles read-only and (b) exposes a self-edit form for the linked player document — same fields a coach edits in Members → PlayerEditModal, scoped to the six identity attributes.

**Sections rendered on ProfilePage:**
1. **Avatar card** — display name + email. PhotoURL editor was *removed* (Jacek: "drop the user link to photo — i have more players with their photos"); a single user-doc photo doesn't fit the multi-player reality. Avatar shows `auth.user.photoURL` if present, otherwise the first letter of the display name.
2. **Display name** — unchanged (writes to `users/{uid}.displayName` + Firebase Auth profile).
3. **Password** — unchanged.
4. **Roles** (NEW, read-only) — `<RoleChips roles={roles} editable={false} />`. Empty-state copy when no workspace is active or `roles.length === 0`. Source: `useWorkspace().roles` (canonical resolver — workspace.userRoles preferred, userProfile.roles fallback).
5. **Player data** (NEW, conditional on `linkedPlayer`) — surfaces only when there's a player doc in the active workspace whose `linkedUid === auth.uid`.

**Editable fields (linked-player self-edit):**

Whitelist matches the Firestore rules carve-out exactly:
- `nickname`
- `name`
- `number`
- `age`
- `nationality` (Select dropdown reusing `NATIONALITIES` exported from `PlayerEditModal.jsx`)
- `favoriteBunker` (free text)

Validation: `name.trim()` and `number.trim()` are both required. Save button disabled while `!dirty || !valid`.

**Read-only context box** (below the editable form): team name (looked up via `useTeams`), `pbliIdFull`, `paintballRole`, `playerClass`. These stay admin-only — team assignment shifts roster math, PBLI ID is the league identifier, and role/class are coach-curated.

**Propagation.** `ds.updatePlayer(linkedPlayer.id, {...})` writes to `/workspaces/{slug}/players/{pid}`. All consumers (MembersPage, PPT Gracz tab, scout ranking display names, training squad rosters) already subscribe via `onSnapshot` on the players collection — no extra wiring needed. Edits land within ~200ms in every tab that's open.

**Firestore rules carve-out** (`firestore.rules`, `match /players/{pid}` allow update):

```
|| (
  request.auth != null
  && resource.data.linkedUid == request.auth.uid
  && request.resource.data.linkedUid == request.auth.uid
  && request.resource.data.diff(resource.data).affectedKeys()
     .hasOnly(['nickname', 'name', 'number', 'age',
               'favoriteBunker', 'nationality', 'updatedAt'])
)
```

The `linkedUid` invariant on both `resource` and `request.resource` blocks identity hijacking — a player can't edit themselves out of their own link or claim someone else's player while editing. `affectedKeys().hasOnly([...])` guarantees they can't touch team assignment, role/class, or PBLI ID even with a hand-crafted write.

**Why not a modal reuse of PlayerEditModal?** PlayerEditModal exposes all admin-only fields (team picker, role/class, PBLI ID) and gates them by capability. Stripping it down conditionally for the player-self path would have meant two render branches in one component. A flat in-page form is simpler, matches ProfilePage's existing layout style, and keeps the whitelist visible at the call site for the next reviewer.

---

## 34. Field Side Representation Standard (approved April 18, 2026)

**Context.** W apce zidentyfikowano rozjazd oznaczania stron pola (dorito/snake/center) — różne kolory w różnych widokach, mieszanie "dorito" z "disco" i "snake" z "zeeker", brak centralnego standardu. Ten paragraf ustala jedno źródło prawdy.

### 34.1 Terminology

**Nazewnictwo stron pola (canonical):**
- `dorito` — strona Dorito (od Disco line / Dorito bunkers)
- `snake` — strona Snake (od Zeeker line / Snake bunkers)
- `center` — środek pola (między liniami, głębokie bunkry)

**Lines on field:**
- `discoLine` — linia definiująca granicę "dorito aggressive" strefy (default `y = 0.30`)
- `zeekerLine` — linia definiująca granicę "snake aggressive" strefy (default `y = 0.80`)

**ZAKAZ:** używania "disco" jako synonimu dla "dorito side". Disco to linia, dorito to strona. Tak samo zeeker = linia, snake = strona.

### 34.2 Color tokens (semantic)

Nowe tokeny w `src/utils/theme.js`:

```javascript
// Field sides — WHEN color-coding side categorically (not quality)
side: {
  dorito: '#f97316',   // orange (historically = bump color)
  snake:  '#06b6d4',   // cyan   (historically = zeeker color)
  center: '#94a3b8',   // grey-dim (textDim) — neutral
},
```

**Kiedy używać `COLORS.side.*`:**
- Wyłącznie gdy kolor koduje **kategorię strony** (nie jakość)
- Przykład valid: kolorowa kropka przy bunker label na field canvas
- Przykład valid: linia tendencji w wykresie dorito vs snake vs center

**Kiedy NIE używać:**
- Liczby procentowe jakości (% survival, % accuracy, % win rate) → używaj success/accent/danger
- Generic info → używaj textDim/textMuted
- Side labels w tekście ("D", "S", "C" tags) → używaj `surfaceLight` + `textDim` (neutralny kwadrat)

### 34.3 Visual marker: Side Tag (canonical component)

**Component:** `<SideTag side="dorito" />` renderuje neutralną pigułkę z literą.

```jsx
// src/components/ui.jsx — NEW component
export function SideTag({ side }) {
  const letter = side === 'dorito' ? 'D' : side === 'snake' ? 'S' : 'C';
  return (
    <span style={{
      minWidth: 18, height: 18, padding: '0 5px',
      borderRadius: 3,
      background: COLORS.surfaceLight,
      color: COLORS.textDim,
      fontFamily: FONT, fontSize: 10, fontWeight: 800,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>{letter}</span>
  );
}
```

**Usage rule:** Gdy chcesz pokazać stronę pola w liście/tabeli, użyj `<SideTag>`. Neutralny wygląd (szary) — nie konkuruje z kolorowymi metrykami jakości. Litera mówi "D/S/C".

**Alternatywy (zabronione od teraz):**
- ❌ Kropka kolorowa (side dot) — rozjeżdża się z quality colors
- ❌ Kolorowa nazwa "DORITO" (text w kolorze side) — za dużo kolorów
- ❌ Kolorowy background całego wiersza — ciężki wizualnie

### 34.4 Definitions — "aggressive presence" per side

Gdy apka liczy "jak często drużyna gra agresywnie daną stroną", używamy **niezależnych liczników** (nie muszą się sumować do 100%).

**Dorito aggressive** — punkt w którym **ktokolwiek z 5 graczy** przekroczył `discoLine` (position with `y < discoLine` jeśli `doritoSide === 'top'`).

**Snake aggressive** — punkt w którym **ktokolwiek** przekroczył `zeekerLine` (position with `y > zeekerLine`).

**Center aggressive** — punkt w którym **ktokolwiek** wszedł głęboko w środkowy box:
```
x ∈ [0.3, 0.7]  AND  y ∈ (discoLine, zeekerLine)
```
Uwaga: `y` jest ściśle między liniami (nie po stronach), `x` musi być głęboki (30-70% pola, czyli daleko od baz).

**Konsekwencja:** Suma D% + S% + C% może być 0-300%. Drużyna która co punkt gra agresywnie wszystkimi 3 strefami → każda metryka zbliża się do 100%.

### 34.5 Display rules in components

**W Scouted Team Page — sekcja Tendencja:**
- 3 karty (D / C / S) w porządku od lewej do prawej
- Każda karta ma: `<SideTag>` + nazwę strony + duży % (liczba punktów) + WR z 3-color skalą
- Klasyfikacja dodatkowa pod spodem (italic, textDim)

**W Scouted Team Page — sekcje Breakouty/Strzały:**
- `<SideTag>` po lewej od nazwy bunkera/strefy
- Reszta liczb (frequency%, quality%) kolorowana 3-color skalą

**W Field Canvas (mapa pola):**
- Bunkery mogą używać `COLORS.side.*` dla kropek/outlines (categorical encoding)
- Field lines: `discoLine` używa `COLORS.discoLine`, `zeekerLine` używa `COLORS.zeekerLine`

### 34.6 Migration plan

Istniejące lokalizacje z niespójnym kolorowaniem stron:
1. `ScoutedTeamPage.jsx:650` — `sideColor` func: zastąpić `<SideTag>` (w ZADANIU 3)
2. `BunkerEditorPage.jsx:222` — kolory background dorito/snake/center: użyć `COLORS.side.*` (osobny ticket, nie w tym work package)
3. Theme.js — dodać `COLORS.side = { dorito, snake, center }` (osobny ticket — ZADANIE 3 nie potrzebuje kolorów side, tylko neutralny SideTag)

**Backward compat:** `COLORS.bump` i `COLORS.zeeker` zostają (mają inne znaczenia: bump = arc trajectory, zeeker = linia). Ale nie używane dla side encoding.

---

## 35. Player Self-Report — UI patterns (approved April 20, 2026)

Reference: `docs/architecture/PLAYER_SELFLOG.md` (full architecture), `src/components/selflog/` (implementation).

### 35.1 Two-tier model

**Tier 1 — Hot log:** during match, ~10-15s between points. FAB → bottom sheet with 4 fields (breakout, variant, shots, outcome). Save → close.

**Tier 2 — Cold review:** post-match. "Mój dzień" section in PlayerStatsPage. List of logged points + edit modal for missing details (killer, notes).

**Why two-tier:** keeps hot path fast (game time pressure), allows depth in cold path (player has time post-match).

### 35.2 FAB pattern for self-log trigger

- Floating amber button in MatchPage, bottom-right, `RADIUS.full`, 56×56px
- `COLORS.accentGradient` + `COLORS.accentGlow`
- `<MapPin>` icon, `strokeWidth={2.5}`
- Badge with `pendingCount` (points not yet self-logged by current player)
- **Visible only when `playerId` matched** via `useSelfLogIdentity()` hook

### 35.3 Bootstrap collapse pattern (breakout only)

When picker has no history and shows full grid (15+ items), the **breakout selector collapses to a single header bar after selection** (`<BreakoutCollapsed>` component).

- Before select: full grid 3-column
- After select: header bar with `accentGradient` background, side dot, name, "Zmień" + chevron
- Tap bar → re-opens grid

**Shots picker does NOT collapse** — user needs multi-tap capability (max 3 shots), so full grid stays visible throughout selection.

**Mature state has no collapse** — top 5/6 grid is already compact, no space pressure.

### 35.4 Shot cycle tap pattern

Single tap cycles through results without modal:
- Unselected → `hit` (✓ green, `COLORS.success`)
- `hit` → `miss` (✕ red, `COLORS.danger`)
- `miss` → `unknown` (? grey, `COLORS.textDim`)
- `unknown` → unselected

Implemented in `<ShotCell>`. Faster than dropdown / modal per shot, scales to 1-3 shots per point in hot tier budget.

### 35.5 Outcome states — shared semantics across PlayerSelfLog + PPT (updated 2026-04-22)

**Decision:** 3 outcome states total. Only `alive` uses `COLORS.success`. Both elim states use `COLORS.danger`. Distinguish elim states by label text, not color.

**Outcome enum (canonical):**
```
outcome: "alive" | "elim_break" | "elim_midgame"
```

**Display labels (Polish UI):**
- `alive` → "Grałem do końca" · subtitle "Nikt mnie nie trafił"
- `elim_break` → "Dostałem na brejku" · subtitle "Pierwsze 5 sekund"
- `elim_midgame` → "Dostałem w grze" · subtitle "Po rozbiegu"

**Rationale:**
- Reduced from 4 states to 3 in v2026-04-22 iteration. Removed "Dostałem na końcu" (elim_endgame) as semantically redundant with elim_midgame.
- Semantic clarity (both elim mean "eliminated")
- Consistent with § 27 color discipline

**Migration note:** Existing Tier 1 HotSheet data may have `outcome: "elim_endgame"` in Firestore. Read-layer handles both legacy 4-state and new 3-state enum (maps legacy `elim_endgame` → display as `elim_midgame`). No destructive migration needed.

### 35.6 Variant chips — shared team pool

Breakout variants (e.g. "late break", "ze ślizgu") stored at team level, not per-player.

- Storage: `/workspaces/{slug}/teams/{teamId}/breakoutVariants/`
- All team members see same chips
- "+ Nowy" chip opens `<NewVariantModal>` — added variant immediately available for whole roster
- Usage counter tracks popularity (informs future analytics)

**Rationale:** 5-person team uses shared vocabulary. "Late break" means same thing for everyone. Per-player variants would fragment naming.

### 35.7 Scope clarification — § 35 applies to two products (added 2026-04-22)

§ 35 patterns were written for **PlayerSelfLog Tier 1 HotSheet** (shipped 2026-04-20).

**Player Performance Tracker (PPT)** reuses shared semantics but uses different UX paradigm: full-screen wizard, auto-advance single-tap, training picker entry. See § 48.

**Shared (HotSheet + PPT):**
- Outcome enum (3 states)
- Adaptive picker thresholds (§ 36)
- Breakout variants pool at team level (`breakoutVariants` subcollection)
- Player identity via logged-in email → player record

**Different:**
- HotSheet = bottom sheet over MatchPage, 4 inline fields
- PPT = full-screen 5-step wizard, dedicated route
- HotSheet writes to `points/{pid}/shots/{sid}` (integrates with scout data)
- PPT writes to `players/{pid}/selfReports/{auto}` (orphan-friendly, matched post-hoc)
- HotSheet requires MatchPage context — PPT opens standalone

---

## 36. Adaptive picker thresholds (approved April 20, 2026)

Picker UI changes based on data availability. Two thresholds:

### 36.1 Breakout picker — based on player history

```
totalPlayerLogs < 5  → bootstrap mode: show all bunkers
totalPlayerLogs ≥ 5  → mature mode: top 5 from player history + "Inne…"
```

**Source:** player's own self-log shots aggregated by `breakout` field.

### 36.2 Shot picker — based on layout history (crowdsourced)

```
totalLayoutShots < 20  → bootstrap mode: show all bunkers
totalLayoutShots ≥ 20  → mature mode: top 6 by weighted frequency + "+ Inne cele" expand
```

**Source:** all shots (any player, any team) where `layoutId === current` AND `breakout === current`.

### 36.3 Why asymmetric sources

- **Breakout = personal habit.** Each player has favorite running positions. Personal history is the right signal.
- **Shots = geometric constraint.** From D3 you physically see same spots regardless of who runs there. Layout-level crowdsourced data is the right signal.

### 36.4 Weighted frequency for shots

```js
const weight = { hit: 2, miss: 1, unknown: 0.5 };
frequency[targetBunker] += weight[shot.result];
```

Rewards effective shots (hit counts 2× more than miss, 4× more than unknown). Sorted by weighted frequency, top N shown.

### 36.5 Bootstrap → mature transition

System auto-transitions when threshold crossed. No manual switch. After ~20 logged shots from D3 on this layout, picker stabilizes to top 6 frequent shots; rest moves under "+ Inne cele" expand.

---

## 37. Documentation discipline (approved April 20, 2026)

### 37.1 Where decisions live

| Decision type | File |
|---------------|------|
| UI patterns + product decisions | `docs/DESIGN_DECISIONS.md` (numbered sections) |
| Build conventions, anti-patterns | `docs/PROJECT_GUIDELINES.md` |
| System architecture (long-form) | `docs/architecture/{NAME}.md` |
| Active task queue | `NEXT_TASKS.md` (root) |
| Active CC briefs | `NEXT_TASKS.md` (root) — paths only |
| Completed CC briefs | `docs/archive/cc-briefs/` |
| Deploy log | `DEPLOY_LOG.md` (root) |
| Operations / setup | `docs/ops/{NAME}.md` |

### 37.2 Decisions from chats

**Rule:** decisions made in Claude chats DO NOT live in chat history. They must be transferred to repo before chat ends.

**Workflow:**
1. Decision made in chat (e.g. "shot picker is layout-level, not team-level")
2. Before chat ends, Claude generates patch for `docs/DESIGN_DECISIONS.md` or `docs/PROJECT_GUIDELINES.md`
3. Patch reviewed and committed to repo
4. **Chat is reasoning archive, repo is source of truth.**

### 37.3 CC brief lifecycle

1. Brief written in chat → file in `/mnt/user-data/outputs/CC_BRIEF_*.md`
2. Brief committed to repo root (or referenced in `NEXT_TASKS.md`)
3. CC implements → 1+ commits
4. **After PR merge:** CC moves brief to `docs/archive/cc-briefs/` in same commit as deploy log entry
5. `NEXT_TASKS.md` updated: `[DONE] feat: X — see archive/cc-briefs/CC_BRIEF_X.md, deployed in {commit}`

### 37.4 Anti-patterns

- ❌ `CC_BRIEF_*` files lingering in repo root after deploy
- ❌ Decisions only in Claude chat, not in repo
- ❌ Same topic documented in 3 places (root + docs + chat) without single source of truth
- ❌ Stale `docs/archive/audits/CURRENT_STATE_MAP.md` not updated when major features ship

---

## 38. Security Role System + View Switcher (approved April 17, 2026, extended April 20, 2026 — Path A chosen, awaiting implementation)

Reference: decisions from Opus chat "Architect - 17.04.2026" (chat ID `c73a1a46`). Per § 37.2 these must live in repo before implementation starts. This section is the source of truth; any subsequent chat that revisits the topic reads this first.

### 38.1 Problem statement — current security gaps

`src/hooks/useWorkspace.jsx` today:
- Workspace code prefix `##name` → auto-grants admin role to first user who enters it if `workspace.adminUid` is unset. **Gap:** any user who guesses/learns the workspace code + `##` prefix becomes admin of a fresh workspace.
- Workspace code prefix `?name` → self-grants viewer role. **Gap:** self-promotion, no admin approval.
- Role `scout` is a fallback in `useFeatureFlag.getRole()` when `workspace.role` is null — never explicitly granted.
- Admin check today: `workspace.adminUid === user.uid` OR `user.email in ADMIN_EMAILS` (`['jacek@epicsports.pl']`).
- Role consumers (~5 call sites): `MatchPage.jsx:55,57`, `ScoutedTeamPage.jsx:215`, `MoreTabContent.jsx:32`, `ScoutTabContent.jsx:27`, `useFeatureFlag.js:12`.

### 38.2 Role model — multi-role per user

Roles are a **set**, not a single value. A user can hold multiple roles simultaneously (e.g. Jacek is `['admin', 'coach', 'player']`). Capability checks evaluate "any of" — if any held role grants a capability, the user has it.

| Role | Who | Grants capability to |
|---|---|---|
| `admin` | Workspace owner | Manage members + roles, edit everything, delete anything, destructive actions |
| `coach` | Team coach | Edit teams, tactics, notes, open/close matches, write scouting data, view all analytics |
| `scout` | Dedicated scout | Write scouting data (points, assignments, shots). Cannot delete, cannot manage members |
| `viewer` | Non-roster observer | Read-only entire workspace |
| `player` | Roster player (has `players/{X}.linkedUid === firebaseUid`) | Write own self-log only, read own stats, read team summary |

**Default roles for new user** after PBleagues match + admin approval: `[]` (empty array until admin assigns). New user sees blocked screen "Twoje konto czeka na zatwierdzenie przez admina" until admin adds at least one role.

**Roles stored as array:** `workspace.userRoles[uid] = ['admin', 'coach', 'player']`.

**Capability helpers** (in `src/utils/roleUtils.js`):
```javascript
function hasRole(roles, target) {
  return Array.isArray(roles) && roles.includes(target);
}

function hasAnyRole(roles, ...targets) {
  return targets.some(t => hasRole(roles, t));
}

function canWriteScouting(roles) {
  return hasAnyRole(roles, 'admin', 'coach', 'scout');
}

function canEditTactics(roles) {
  return hasAnyRole(roles, 'admin', 'coach');
}

function canManageMembers(roles) {
  return hasRole(roles, 'admin');
}

function canWriteSelfLog(roles) {
  return hasRole(roles, 'player');
}

function canReadOnly(roles) {
  return hasRole(roles, 'viewer') && roles.length === 1;
}
```

**Why multi-role:** Jacek is simultaneously admin (manages workspace), coach (runs practices), and player (plays in matches, self-logs). Single-role would force him to pick one, losing capabilities. Multi-role reflects reality: one person, multiple responsibilities.

**View Switcher behavior with multi-role:** admin with `['admin', 'coach', 'player']` sees 5 impersonation options (admin/coach/scout/viewer/player). Impersonating "coach" means UI gates based on `effectiveRoles = ['coach']` (single-element array, not the admin's full set). See § 38.5.

### 38.3 Admin determination

A user is admin of this workspace if ANY of:

1. `hasRole(workspace.userRoles[uid], 'admin')` — array includes `'admin'` (primary path, § 38.2 role model)
2. `workspace.adminUid === user.uid` — legacy admin field retained for backwards compatibility + single-source-of-truth for "workspace owner" (transferable via Settings UI)
3. `user.email in ADMIN_EMAILS` — hardcoded allowlist `['jacek@epicsports.pl']` as emergency restore when (1) and (2) are broken

`ADMIN_EMAILS` does NOT grant admin globally — only in workspaces where the user is already a `members[]` entry. The allowlist is disaster recovery, not god-mode.

`adminUid` is the single transferable "workspace owner" pointer. When admin transfers to another user via Settings UI, `adminUid` updates AND `userRoles[toUid]` gets `'admin'` appended AND `userRoles[fromUid]` has `'admin'` removed (keeping other roles intact — fromUid may retain `'coach'` and `'player'`).

`isAdmin()` helper in `roleUtils.js`:
```javascript
function isAdmin(workspace, user) {
  if (!workspace || !user) return false;
  const roles = workspace.userRoles?.[user.uid] || [];
  if (hasRole(roles, 'admin')) return true;
  if (workspace.adminUid === user.uid) return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}
```

### 38.4 Role assignment — Settings UI replaces workspace code prefixes

Workspace code `##` and `?` prefixes are **removed**. Role management moves to admin-only Settings → Members tab:
- List of workspace members (read from `workspaces/{slug}.members`)
- Per-user dropdown: `player / scout / coach / viewer / admin`
- Saves to `workspace.userRoles: { [uid]: role }` map in Firestore
- Role transfer: admin can promote another user to admin. When they confirm, `adminUid` updates and previous admin drops to `coach` (default post-transfer role)

Visual: Apple HIG compliant per § 27 (theme tokens, `ui.jsx` components, 44px touch targets, confirmation modal for destructive role changes with "what will this user lose access to" copy).

### 38.5 View Switcher — admin-only role impersonation

Admins need to preview UI as any role sees it (QA, bug diagnosis, onboarding design).

**Trigger:** pill in header next to user avatar, visible **only when `isAdmin === true`** (always visible even when impersonating viewer — escape hatch so admin can't lock themselves out).

**Behavior:**
- Dropdown with 5 roles + "Exit impersonation"
- Player mode opens a PlayerPicker modal (admin selects which roster player to impersonate, needed for self-log visibility)
- State storage: `sessionStorage` (per-tab, clears on tab close — deliberate: impersonation never persists cross-session)
- UI state: admin sees exactly what the target role sees (feature flags evaluated against impersonated role, hidden CTAs/tabs/routes respected)
- **Permissions are NOT downgraded** — admin impersonating viewer can still technically write via direct Firestore call; the UI just doesn't render CTAs. This is preview, not sandboxing.

**Visual indicator (mandatory, non-dismissable):**
- 2px amber strip across top of viewport (`COLORS.accent`)
- Pill below top-right: "Viewing as: {role}" + 8px amber dot
- Clicking pill → jumps to view switcher dropdown

**Protected routes:** when impersonated role has no access to current route, redirect to MainPage with toast `"Role {X} doesn't have access — redirected"`.

### 38.6 Protected routes per role (reference table)

| Route | admin | coach | scout | viewer | player |
|---|---|---|---|---|---|
| `/` (MainPage tabs) | ✅ all | ✅ all | ✅ Scout+Coach+More | ✅ read-only | ✅ Scout (read) + own player stats |
| `/tournament/:tid/match/:mid` scouting | ✅ | ✅ | ✅ | ✅ read-only | ❌ → MainPage |
| `/tournament/:tid/team/:sid` (ScoutedTeamPage) | ✅ | ✅ | ✅ | ✅ read-only | ✅ if own team |
| `/player/:pid/stats` | ✅ | ✅ | ✅ | ✅ | ✅ only own playerId |
| `/layout/:id` + `/ballistics` + `/bunkers` | ✅ | ✅ | ❌ | ✅ read-only | ❌ |
| `/debug/flags` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings → Members tab | ✅ | ❌ | ❌ | ❌ | ❌ |
| Settings → Self-log onboarding | ✅ | ✅ | ✅ | ❌ | ✅ |

Viewer = read-only everywhere means: all mutation CTAs hidden (Add, Edit, Delete, Save, ⋮ menu trimmed to view-only actions).

### 38.7 Migration strategy

**Existing workspaces have no explicit `userRoles` map today** — workspace members are stored as UIDs in `workspace.members[]`, role was derived from workspace code prefix at first login (non-persistent beyond localStorage session).

Strategy: **zero-migration default + admin opt-in review.**

1. **Zero-migration:** new role system ships with `userRoles = {}` for all existing workspaces. Derivation rule: `role = workspace.userRoles[uid] || 'player'`. All existing users become `player` by default on next login.
2. **Active coach/scout no-op preservation:** if existing user has made writes in last 30 days (check `points.homeData.scoutedBy` or `tactics.createdBy` presence), migration script pre-populates their role as `coach`. Everyone else defaults to `player`.
3. **Admin review prompt:** on first admin login post-deploy, show modal "Review member roles — N members need role assignment" → takes admin to Settings → Members tab. Dismissable but re-shown until every member has explicit role.

Rationale: can't get this wrong for existing Ranger Warsaw coach/scout workflow (they keep writing), new users go through explicit promotion gate.

### 38.8 Data model changes

```javascript
// workspaces/{slug}  — existing fields + additions:
{
  slug: 'ranger-warsaw',
  name: 'Ranger Warsaw',
  members: ['uid1', 'uid2', ...],        // existing
  adminUid: 'uid1',                       // existing, gains transferability

  // NEW fields:
  userRoles: {                            // NEW — per-user ROLE ARRAY (not string)
    'uid1': ['admin', 'coach', 'player'],
    'uid2': ['coach', 'player'],
    'uid3': ['scout'],
    'uid4': ['player'],
    'uid5': [],                           // awaiting admin approval
  },
  pendingApprovals: ['uid5'],             // NEW — uids past PBleagues match, awaiting first role
  rolesVersion: 2,                        // NEW — migration marker
  migrationReviewedAt: Timestamp | null,  // NEW — when admin last dismissed review
}

// players/{pid} — existing fields + additions:
{
  name: 'Jacek Parczewski',
  number: 66,
  teamId: 'ranger-rush',
  pbliId: '61114',                        // EXISTING — Paint Ball Leagues ID first segment
                                          // System-assigned on pbleagues.com, immutable, numeric
                                          // Already used by: PlayerEditModal, CSVImport, TeamDetailPage

  // NEW fields:
  linkedUid: 'firebase-uid-abc',          // NEW — Firebase uid of linked user account (null if unlinked)
  pbliIdFull: '61114-8236',               // NEW — full two-segment ID captured at link time
                                          // (audit + future re-verification if pbleagues suffix changes)
  linkedAt: Timestamp,                    // NEW — when player linked to uid
  emails: [...],                          // EXISTING from SelfLog Tier 1 — REMOVED as primary identity
                                          // keep field for historical data but no longer used for matching
}

// Removed concepts:
// - workspace code ##/? prefix handling in useWorkspace.jsx
// - implicit 'scout' fallback in useFeatureFlag.getRole()
// - email-based player matching via players/{X}.emails[] (replaced by pbliId + linkedUid)
```

**Migration note on `players/{X}.emails`:** SelfLog Tier 1 (shipped 2026-04-20) introduced `emails[]` for player-to-uid matching via `useSelfLogIdentity`. Post-§ 38, this mechanism is replaced. The `emails[]` field is NOT deleted (historical record), but matching logic moves to `linkedUid` lookup. Re-migration: on first admin login post-deploy, a script walks `players/{X}.emails[]` → attempts to map each email to current Firebase user → if match, sets `linkedUid` + prompts admin to confirm. After confirmation, email-based matching is disabled forever.

### 38.9 Firestore rules outline

```
match /workspaces/{ws}/{document=**} {
  allow read: if request.auth.uid in get(/workspaces/$(ws)).data.members;

  allow write: if isAdmin(ws)
               || (isCoach(ws) && resource.data.kind != 'member')
               || (isScout(ws) && isScoutingData(request.resource))
               || (isPlayer(ws) && isSelfLogData(request.resource));
}

function isAdmin(ws) {
  return get(/workspaces/$(ws)).data.userRoles[request.auth.uid] == 'admin'
      || get(/workspaces/$(ws)).data.adminUid == request.auth.uid
      || request.auth.token.email in ['jacek@epicsports.pl'];
}

function isSelfLogData(res) {
  return res.data.source == 'self'
      && res.data.playerId == getPlayerIdForUid(request.auth.uid);
}
```

Full rules drafted during implementation — this is outline, not final. Must be tested against current behavior to avoid breaking Ranger Warsaw writes.

### 38.10 Anti-patterns

- ❌ Don't use View Switcher to gate actual permissions — it's UI preview, not authorization
- ❌ Don't persist impersonation to localStorage — sessionStorage only (deliberate reset on tab close)
- ❌ Don't hide the View Switcher pill when impersonating viewer — that's how admin escapes
- ❌ Don't grant admin role via workspace code — Settings UI only, post-refactor
- ❌ Don't migrate existing users to `scout` en masse — use activity check (last 30 days of writes) to distinguish actives from dormants
- ❌ Don't couple `player` role to self-log feature flag — `player` is a permission level, self-log is a feature. Viewer can't self-log either, but for a different reason (read-only everything)

### 38.11 Implementation path — RESOLVED: Path A (full refactor)

Chosen 2026-04-20 by Jacek. Rationale: active season (matches weekly), player buy-in needed ASAP for SelfLog flywheel. Full refactor ships before next Sunday match with iPhone validation.

**Scope expanded from original estimate** to include:
- Multi-role model (was single-role in v1 of this section — updated above)
- PBleagues ID matching as mandatory registration gate (§ 38.12)
- Admin approval gate for new users (§ 38.13)
- No email-based player matching fallback

**New estimate:** 12-18h, 4 commits on `feat/security-roles-v2`. See `CC_BRIEF_SECURITY_ROLES_V2.md` for implementation breakdown.

**Deployment strategy:** branch complete → Jacek validates on iPhone → merge + deploy between matches → monitor 30 min post-deploy for rules regressions. ADMIN_EMAILS emergency restore path guarantees Jacek never locked out.

### 38.12 PBleagues ID account linking (onboarding flow)

Every new user must link their account to a PBleagues player profile before gaining any role in the workspace. No email-based fallback — if a user has no PBleagues account, they create one at pbleagues.com first. If their PBleagues ID is not yet in the admin's player database, they contact the admin (jacek@epicsports.pl) to be added.

#### ID format

- **pbleagues.com source:** user profile shows full ID like `61114-8236`
  - First segment (`61114`): system-assigned numeric, immutable, publicly visible on match results. Length varies (5-6+ digits observed).
  - Separator: hyphen `-`
  - Second segment (`8236`): user-configurable at pbleagues.com/profile. Numeric in observed cases; treat as `\w+` defensively
- **Our Firestore:** `players/{pid}.pbliId` stores first segment only (e.g. `"61114"` — no `#` prefix, no suffix). Existing field — already populated for all rostered players via CSV import and manual entry.
- **Normalization:** input from user may include `#` (some users copy-paste with pbleagues.com's display convention). Strip leading `#` before parsing and comparison.

#### Input validation

```javascript
const PBLI_ID_FULL_REGEX = /^#?\d+-\w+$/;

function parsePbliId(raw) {
  const trimmed = raw.trim();
  if (!PBLI_ID_FULL_REGEX.test(trimmed)) {
    return { error: 'INVALID_FORMAT' };
  }
  const cleaned = trimmed.replace(/^#/, '');
  const [systemId, userSuffix] = cleaned.split('-');
  return { systemId, userSuffix, full: `${systemId}-${userSuffix}` };
}
```

Reject inputs: missing separator, missing either segment, non-numeric first segment, whitespace inside.

**Stored vs input format:**
- Input (user types): `61114-8236` or `#61114-8236` — full two-segment ID
- Match against: `players/{X}.pbliId` which stores only `"61114"` (first segment)
- Save at link time: `players/{X}.pbliIdFull = "61114-8236"` (full captured input, normalized)

#### Matching algorithm

```javascript
async function findPlayerByPbliId(workspaceSlug, systemId) {
  const playersRef = collection(db, 'workspaces', workspaceSlug, 'players');
  const snap = await getDocs(playersRef);
  const matches = [];
  snap.forEach(doc => {
    const dbId = String(doc.data().pbliId || '').replace(/^#/, '').trim();
    if (dbId === systemId) matches.push({ id: doc.id, ...doc.data() });
  });
  return matches;
}
```

**Note on `#` handling:** defensive strip in matcher — even though current data samples are plain numeric, some legacy data may have been imported with `#` prefix. Normalizing at match time is cheap insurance.

**Match outcomes** — reference to `pbliId` in error messages:

| Outcome | Response |
|---|---|
| Zero matches | Reject: "Nie znaleziono gracza o PBLI #{systemId} w bazie workspace {name}. Skontaktuj się z adminem: {admin email}" |
| One match, `linkedUid === null` | Success — proceed to link |
| One match, `linkedUid === currentUid` | Success (idempotent re-login from same user) — proceed |
| One match, `linkedUid` is different uid | Reject: "Ten profil gracza jest już podłączony do innego konta. Skontaktuj się z adminem aby rozlinkować." |
| Multiple matches (data bug — `pbliId` should be unique per workspace) | Show disambiguation picker: list players with name + team + number. Log to Sentry. |

#### Linking action

On successful match + user confirmation:
```javascript
await runTransaction(db, async (tx) => {
  // Link player doc to uid
  tx.update(doc(db, 'workspaces', slug, 'players', matchedPlayerId), {
    linkedUid: currentUid,
    pbliIdFull: `${systemId}-${userSuffix}`,   // store full captured input
    linkedAt: serverTimestamp(),
  });

  // Add uid to members if not already, initialize empty roles array
  tx.update(doc(db, 'workspaces', slug), {
    members: arrayUnion(currentUid),
    [`userRoles.${currentUid}`]: [],          // empty — awaiting admin approval
    pendingApprovals: arrayUnion(currentUid),
  });
});
```

#### Onboarding screen specification

Full-page modal, no dismiss, no skip. Path: `/onboarding/pbleagues` (protected, requires auth but no workspace role).

Content:
- Title: "Podłącz profil gracza"
- Explainer: "Aby korzystać z aplikacji, podłącz swój profil z pbleagues.com. Jeśli nie masz konta, załóż je najpierw na pbleagues.com, następnie wróć tutaj."
- Link to pbleagues.com (opens new tab)
- Input field: `Player ID`, placeholder `61114-8236`, inline validation (must match pattern `^#?\d+-\w+$`)
- Help text below input: "Znajdziesz go w swoim profilu na pbleagues.com → Settings → Player ID. Format: NNNNN-NNNN (np. 61114-8236)"
- Submit button: "Podłącz profil" (disabled until validator passes)
- On success → modal state updates to "Konto zatwierdzone. Czekaj na przypisanie roli przez admina." with "Sprawdź status" refresh button
- On error → inline error above input, user stays on screen

#### Admin is also subject to PBleagues matching

Even Jacek (admin via ADMIN_EMAILS emergency path) must complete PBleagues linking to be fully functional — without it, `linkedUid` is null on his player doc, meaning he cannot self-log (player role capability requires link). His admin capabilities still work via ADMIN_EMAILS, but SelfLog won't.

### 38.13 Admin approval gate

Post-PBleagues linking, user has `userRoles[uid] = []` (empty array). They are members of the workspace but hold no capabilities.

**User experience while pending:**
- Full-screen blocker after login: "Twoje konto czeka na zatwierdzenie przez admina. Otrzymasz dostęp gdy admin przypisze Ci rolę. Skontaktuj się: {admin email}"
- Single button: "Odśwież" — re-fetches workspace, re-evaluates roles
- Sign-out always available

**Admin experience:**
- Settings → Members tab shows dedicated section "Oczekują zatwierdzenia ({count})" at top
- Each pending user card: avatar (initials), display name (from linked player doc), email, PBleagues ID
- Inline role multi-select chips: `[Admin] [Coach] [Scout] [Viewer] [Player]` — admin taps chips to toggle
- "Zatwierdź" button saves selected roles → user leaves pending state
- Default pre-selected role on pending card: `['player']` (most common case — admin can override)

**Firestore data flow:**
```javascript
// Admin approval
await updateDoc(doc(db, 'workspaces', slug), {
  [`userRoles.${targetUid}`]: selectedRoles,  // e.g. ['player', 'coach']
  pendingApprovals: arrayRemove(targetUid),
});
```

**Why explicit approval instead of auto-assign:** admin wants control over who gets scouting write access, who's just a spectator, who's a player. Auto-assigning all PBleagues-matched users to `'player'` is safe for rosters but wrong for guests/parents — admin reviews and decides.

### 38.14 Re-verification and re-linking edge cases

**Case: User reinstalls app / clears storage** — new Firebase session on same device. If email+password login maps to same uid → `linkedUid` still valid → no re-link needed. If user created new Firebase account → new uid → needs re-link (pbliId match finds old player doc but `linkedUid` is old uid → admin must rollinkować manually).

**Case: User changed suffix on pbleagues.com** — `pbliIdFull` no longer matches what user types if they update suffix later. Our match logic only uses `systemId` (first segment via `pbliId` field), so match still succeeds — suffix change doesn't break linking. Captured `pbliIdFull` in our DB is stale but not harmful. Re-verification flow: admin can trigger "Re-verify PBLI" in Settings → Members → per-user `⋮` menu, which clears `pbliIdFull` and prompts user to re-enter at next login.

**Case: Two users share same PBLI (data bug)** — cannot happen on pbleagues.com side (system-assigned first segments are globally unique). If our DB ever has two players with same `pbliId` in same workspace, it's admin error in data entry. Disambiguation picker (§ 38.12) handles UI; admin cleanup handles root cause.

**Case: Player dropped from roster** — admin deletes player doc. `linkedUid` reference dies with doc. User still has Firebase account + workspace membership, but no player capabilities. SelfLog FAB disappears. User is effectively demoted to whatever non-player roles they hold (if any). If none → back to pending-approval blocker until admin acts.

**Case: Admin wants to disable a member's access without deleting** — Settings → Members → set roles to `[]`. User is effectively kicked without losing their PBleagues link; admin can restore roles later. For full removal, admin sets roles to `[]` AND removes uid from `members[]` (separate explicit action, requires confirmation modal).

---

## 39. Scout score sheet — role-gated match summary (approved April 21, 2026)

### Problem

MatchPage heatmap view showed the same `CoachingStats` block (dorito / snake / disco / zeeker / center / danger / sajgon %) to every authenticated user. Pure-scout accounts have no use for coaching analytics — those percentages require interpretation (tendencies → counter planning) that serves coach pre-game prep, not the scout's in-match data-collection job. A scout needs to know "did I capture everything for this match?", not "how often do they push dorito?".

### Decision

Role-gate the match summary at the `CoachingStats` render slot in `src/pages/MatchPage.jsx` (heatmap view). Three branches:

```
if (hasAnyRole(roles, 'admin', 'coach') || isAdmin) {
  // render CoachingStats (unchanged — existing behavior)
} else if (hasAnyRole(roles, 'scout')) {
  // render ScoutScoreSheet (new — data-completeness dashboard)
} else {
  // viewer / empty roles → render nothing (no crash)
}
```

Multi-role users (Jacek: `['admin','coach','scout','player']`) hit the coach branch first — no regression for the common case.

### ScoutScoreSheet metrics

Four rows, computed across all points in the match, scoped to the scout's own side (`homeData` or `awayData`, legacy `teamA`/`teamB` fallback):

| Row | Formula |
|---|---|
| **Players placed** | non-null `{side}.players[i]` slots / (5 × pointCount) |
| **Breaks** | placed player AND within 0.15 of any bunker / (5 × pointCount). Distance threshold matches § 30 kill attribution. |
| **Shots recorded** | non-runner players with ≥1 entry in `quickShots` OR `obstacleShots` / total non-runner slots |
| **Result** | status-aware copy — `{team} won {sA}–{sB}` for closed/outcome; `In progress: {sA}–{sB}` for open/live |

Progress bar under each metric (not Result). Value color follows § 27 semantic palette:

- **100%** → green `COLORS.success`
- **60-99%** → amber `COLORS.accent` (partial-completion state — legitimate semantic use, NOT decorative)
- **<60%** → red `COLORS.danger`
- **Result row** → neutral `COLORS.text` (never pct-colored)

### Why not show coaching stats to pure scouts

1. **Cognitive load in live match:** scout scouting 10+ points per day needs rapid completeness feedback, not analytics to absorb.
2. **Interpretation gap:** "57% dorito" is a coach artifact (feeds counter planning). Scout can't action it mid-match.
3. **Screen real estate:** match summary is pinned high; using it for role-mismatched info wastes the slot.

Coaches keep both analytics AND the existing inline Points-section mini-strip (Breaks + Shots) — orthogonal concerns, unchanged by this section.

### Non-goals

- **No toggle "view as scout" in MatchPage.** Admins who need to verify scout view use the ViewSwitcher from § 38.5 (which exists and respects `effectiveRoles`).
- **Existing Points-section inline Breaks+Shots strip unchanged.** Its "Breaks" label is arguably a mis-naming for "placed" count, but redefining it is out of scope — `ScoutScoreSheet` is the new canonical surface with the brief's correct Breaks definition.
- **No per-player score sheet.** Match-level summary only.

### Related

- Implementation: commit `f68a70c` (`feat(match-summary): role-gated scout score sheet…`), merged 2026-04-21 via `2485653`
- Component: `src/components/match/ScoutScoreSheet.jsx`
- Brief: `docs/archive/cc-briefs/CC_BRIEF_BUGFIX_PRE_SATURDAY_2.md`
- Depends on: § 38 (hasAnyRole + multi-role API)

## 40. Per-team heatmap visibility toggle (approved April 21, 2026)

### Problem

The match heatmap view (`src/pages/MatchPage.jsx`, rendered below the field canvas in review mode) exposed two global pills — `● Positions` / `⊕ Shots` — that flipped both layers for both teams simultaneously. There was no way to isolate only one team's data, which coaches need when:

- Analyzing own-team break patterns without opponent visual noise
- Studying where an opponent shoots at us, with our shots hidden
- Scout data is asymmetric (one team well-scouted, one partial) and the coach wants clean per-team reads

### Decision

Replace the two global pills with `PerTeamHeatmapToggle` — a 2-row block, one row per team, each row holding a team tag (colored dot + name) plus an independent Positions chip and Shots chip. Four independent toggles. Default: all four ON (parity with prior "both pills on" state).

Visual layout:

```
┌─────────────────────────────────────────────┐
│  ● RANGER    [✓ ● Positions]  [✓ ⊕ Shots]    │
│─────────────────────────────────────────────│
│  ● ALA       [✓ ● Positions]  [✓ ⊕ Shots]    │
└─────────────────────────────────────────────┘
```

### Chip styling — reuses § 24 scope-pill pattern

**Active:** amber border `rgba(245,158,11,0.5)` + bg `#f59e0b08` + text `COLORS.accent` + icon inherits `currentColor`. Identical active-state treatment to the `[This tournament] [All tournaments] [Global]` scope pills on PlayerStatsPage — no new primitive introduced.

**Inactive:** transparent bg + 1.5px `COLORS.border` + muted text + semantic icon color (green `#22c55e` for positions dot, red `#ef4444` for shots crosshair).

**Team tag** (not interactive): 7px team-color dot (`TEAM_COLORS.A`/`B`) + team name at 12px/700 on recessed `COLORS.bg` surface. **Team tags never use amber** — they're visual grouping for chip pairs, not actionable. Consistent with § 27 rule "amber = interactive only".

### Touch + a11y

- Chips are real `<button>` elements with `aria-pressed` reflecting active state
- `minHeight: TOUCH.minTarget` (44px) per § 27
- Tab-focusable, Space/Enter toggles — no custom keyboard handlers

### State + data flow

Visibility state lives in the parent (`MatchPage.jsx` @ `hmVisibility`), not in the toggle component — must be threaded down to the heatmap renderer to actually filter. Shape:

```js
{ teamA: { positions: boolean, shots: boolean },
  teamB: { positions: boolean, shots: boolean } }
```

**Non-persisted v1** — resets to all-on when user remounts heatmap (navigation away + back). If field use reveals repeated re-tapping of same combo, add `localStorage` persistence keyed per match. Not a v1 concern.

### `HeatmapCanvas` backward-compat

Heatmap filter extended without breaking callers. `HeatmapCanvas` now accepts an optional `visibility` prop:

```js
<HeatmapCanvas
  visibility={{ A: { positions, shots }, B: { positions, shots } }}
  // ... OR legacy:
  showPositions={bool}
  showShots={bool}
/>
```

If `visibility` provided, it overrides the global booleans. If not, fallback to `showPositions`/`showShots` (still wired everywhere — `FieldView`, `ScoutedTeamPage`, etc.). No caller migration forced — match page opts in, others unchanged.

Per-team filtering in rendering loops: each `points.forEach` now guards with `if (isB ? !visBPositions : !visAPositions) return;` (and same for shots) so team-A and team-B data layers are populated independently. Heatmap rendering paths for density gradients, dots, eliminations, bump stops, shot arrows, and kill clusters all respect the visibility flags.

### Data source

The `points` array fed to `HeatmapCanvas` already tags each pre-merged entry with `side: 'A'` or `side: 'B'` (see § 18 Concurrent Scouting — `homeData`/`awayData` split per point). This toggle adds a new filter dimension to the existing pipeline — no schema change.

### Empty-data behavior

If Team B has zero scouted points, the toggle still renders both rows. ALA chips remain tappable; heatmap is empty for that team but controls stay stable. Intentional — UI stability across data states beats hiding-what-nothing-affects.

### Non-goals

- **No "All on/off" shortcut chip.** User taps 4 individual chips if they want all-off. If field use reveals need, separate follow-up.
- **No ScoutedTeamPage parallel.** ScoutedTeamPage heatmap is team-scoped by definition (one team per page), so per-team toggle doesn't apply. This decision is MatchPage-only.
- **No persisted visibility across sessions.** v1 scope ends at in-memory state.

### Related

- Implementation: commit `e695880` (`feat(match): per-team heatmap visibility toggle replaces global pills`), merged 2026-04-21
- Component: `src/components/match/PerTeamHeatmapToggle.jsx`
- Touched: `src/components/HeatmapCanvas.jsx`, `src/pages/MatchPage.jsx`
- Depends on: § 18 (concurrent scouting homeData/awayData split provides the per-team side tag), § 24 (scope-pill active-state pattern reused)
- Brief: `docs/archive/cc-briefs/CC_BRIEF_BUGFIX_PRE_SATURDAY_3.md`

## 41. Edit-vs-new side pointer separation (approved April 21, 2026)

### Problem

Two semantically distinct concepts were bleeding into each other in the save path, producing a rendering bug where editing a saved point and pressing save (even without changes) flipped the canvas orientation on every subsequent view of that same point.

| Concept | What it is | When it should change |
|---|---|---|
| `point.{homeData,awayData}.fieldSide` | **Historical snapshot** — which side each team was on at the moment this point was scouted | Never after first write. Frozen per-point. |
| `match.currentHomeSide` | **Live pointer** — which side Team A is on right now in the ongoing match flow | After each **new-point** save with a winner (paintball auto-swap rule per PROJECT_GUIDELINES § 2.5) |

Pre-fix: the `savePoint` post-write block flipped `match.currentHomeSide` on every save-with-winner — including edit saves. `editPoint` hydrates `outcome` from Firestore on re-entry, the G2 auto-swap effect treated that hydration as a user winner-pick and re-armed `sideChange=true`, the next save fired the flip. Navigating back to the edited point on second visit rendered data on the flipped side. Compounded per cycle.

### Decision

**Editing an existing point never mutates `match.currentHomeSide`.** Auto-swap fires exclusively for new-point scouting. The edited point's own `fieldSide` snapshot is authoritative for its rendering (`editPoint` at `MatchPage.jsx:L1110-1126` reads from `myData.fieldSide` and was already correct).

### Implementation — defense-in-depth at both state-intent and write-path layers

**Guard 2 (state-intent, `MatchPage.jsx:L202-212`)** — G2 auto-swap state effect:

```js
useEffect(() => {
  if (editingId) return;  // edit does not re-arm swap intent
  if (outcome === 'win_a' || outcome === 'win_b') setSideChange(true);
  else setSideChange(false);
}, [outcome, editingId]);
```

When `editPoint` hydrates outcome from a saved point, `editingId` is simultaneously set — the effect early-returns before touching `sideChange`. Cleanly separates "user picked winner" from "Firestore-restored outcome".

**Guard 1 (write-path, `MatchPage.jsx:L1066`)** — `savePoint` post-tracked flip block:

```js
if (shouldSwapSides && isConcurrent && !editingId) {
  // ... flip match.currentHomeSide via ds.updateMatch
}
```

Even if `sideChange` somehow leaks true during edit (e.g. user manually toggles the swap pill in save sheet), `editingId`-aware guard at write-path blocks the Firestore mutation. `editingId` at this point is closed-over from savePoint invocation time — `resetDraft()`'s async `setEditingId(null)` doesn't mutate it in scope.

### What stays unchanged

- `editPoint` fieldSide resolution (reads `myData.fieldSide` snapshot) — already correct, authoritative for edit renders
- Sync effect at `L553-568` — already guarded by `if (editingId) return;`
- URL effect at `L496-502` — reads `match.currentHomeSide` for new-point seed, correct when `currentHomeSide` stays stable (which is guaranteed by Guards 1+2)
- Training/solo else-if branch — no `match.currentHomeSide` concept in training (per-matchup solo coach scope), local fieldSide flip only, different semantic

### What this does NOT solve

- `startNewPoint` has an analogous issue to Fix X's joinable search bug (still open, tracked for Brief 7-bis if approved)
- Rendering path (FieldCanvas, useField, HeatmapCanvas) is correct; if canvas ever shows wrong orientation with `match.currentHomeSide` stable in Firestore, that's a separate rendering bug

### Why both guards, not just one

| Scenario | Guard 1 only | Guard 2 only | Both |
|---|---|---|---|
| User edits, hits save with winner still set | ✓ blocks flip | ✓ state stays clean | ✓ |
| User manually toggles swap pill in edit save sheet | ✗ sideChange=true → flip fires | ✓ state still clean → pill default false | ✓ |
| `shouldSwapSides` leaks via shortcut at other call site (e.g. `L1773`) | ✗ that path doesn't check editingId | ✓ sideChange=false → nothing to leak | ✓ |

Together: ~3 lines, covers all paths, minimal new logic.

### Related

- Implementation: commit `17cd6e5` (`fix(scouting): guard auto-swap flip from edit saves`), merged 2026-04-21
- Diagnostic reference: `diagnostic/bug-b-instrumentation` @ `724abee`; [BUG-B] prod log 2026-04-21 showed same point re-entered 3× with stable payload but visual flips
- Touched: `src/pages/MatchPage.jsx`
- Depends on: § 18 (homeData/awayData per-point fieldSide snapshots), PROJECT_GUIDELINES § 2.5 (auto-swap rule now explicit about new-only)
- Brief: `docs/archive/cc-briefs/CC_BRIEF_BUGFIX_PRE_SATURDAY_7.md`

## 42. Per-coach point streams + end-match merge (approved April 21, 2026)

### Problem

Prior concurrent-scouting architecture wrote all coaches' point data into a **single shared document** per point, with chess-model partials merging in place (`homeData` + `awayData` on the same doc). Three pathologies emerged:

1. **Bug C symptom:** a scout's own partial point was silently re-attached on the next Scout › click, because auto-attach searched by "status=open/partial + my-side empty" which a just-saved own-side-but-other-side-empty point satisfied. User thought "new point", app did "edit existing".
2. **Race on shared doc:** when Coach A and Coach B saved near-simultaneously, last-write-wins on root-level fields (outcome, fieldSide, mergedAt) even if `homeData` + `awayData` were merge-safe.
3. **Rollback hard:** any rewrite of point shape affected all callers + readers in lockstep; legacy docs had to migrate or coexist via fallbacks at every read site.

### Decision

**Per-coach streams during match; canonical merge at End match.**

Each coach writes to a private stream of point documents during the match. Streams are merged into canonical docs via an explicit end-match trigger. Match review shows the coach's own stream until merge; after merge, it shows canonical docs only.

### Document ID scheme

```
{matchKey}_{coachShortId}_{NNN}
```

- `matchKey` = tournament `matchId` or training `matchupId` (isTraining switch)
- `coachShortId` = first 8 chars of `auth.currentUser.uid` — readable prefix, deterministic, collision-safe within a match between 2-3 coaches
- `NNN` = zero-padded 3-digit index (001-999), 1-based, from local counter

Example: match `VZjLHWFTgQ6dmU5P35YY`, coach uid `OPAHJZa6fROpL7DPVCN3lQiQRr52`, fifth save → `VZjLHWFTgQ6dmU5P35YY_OPAHJZa6_005`.

### Per-coach counter — local, persisted

`src/hooks/useCoachPointCounter.js` — per-(matchKey, uid) counter with localStorage persistence (`pbscoutpro_counter_{matchKey}_{uid}`). `reserveNext()` returns next integer (1-based), increments state, writes localStorage. Zero Firestore round-trip. Zero shared-counter race by construction.

**Implication for late-joining coach:** their counter starts at 0, out of sync with prior coach. Accepted per founding assumption — user responsibility to sync counters before first save. Follow-up UI hint possible.

**Implication for browser refresh mid-match:** counter persists. User can safely refresh without double-indexing.

### Point doc schema extension (new fields on per-stream docs)

```javascript
{
  // Existing fields (homeData, awayData, teamA, teamB, outcome, status, fieldSide, ...)
  // unchanged.

  // Brief 8 additions:
  coachUid: string,          // auth uid of writer
  coachShortId: string,      // first 8 chars of coachUid
  index: number,             // 1-based local counter from useCoachPointCounter
  canonical: boolean,        // false during match, flipped to true at merge
  mergedInto: string | null, // canonicalId if this source doc was merged into a canonical
  sourceDocIds: string[] | undefined, // present only on canonical merged docs
}
```

Legacy points (pre-Brief 8 data) lack `coachUid` — grandfathered via filter fallback.

### usePoints filter semantics (§ 18 extension)

Point `status` state machine unchanged: `open | partial | scouted`.

Query filter layered on top (opt-in via hook options):

```
During match (merged: false):
  p.coachUid === currentUid            → own stream, always visible
  p.coachUid is missing                → legacy grandfathered, visible to all
  p.coachUid === otherCoachUid         → hidden (other coach's in-progress stream)

Post-merge (merged: true):
  p.canonical === true                 → visible (merged + solo-marked + legacy audit)
  p.canonical === false/undefined      → hidden (source docs only useful via mergedInto audit)
```

**Blocker 2 rationale:** filter is client-side (`!p.coachUid || p.coachUid === uid`) rather than server `where('coachUid', 'in', [uid, null])` because Firestore `in [null]` does not match field-missing docs. Client-side covers both missing AND null AND matching uid. Point count per match (<100) makes client-side safe.

### End-match merge algorithm

`ds.endMatchAndMerge(tid, mid)` — tournament:

1. **Idempotency guard:** skip if `match.merged === true`.
2. **Fetch all points** (raw, bypass coachUid filter) via getDocs + orderBy createdAt.
3. **Bucket by coachUid.** Legacy points (no coachUid) → 'legacy' bucket. Others keyed by coachUid.
4. **Sort each stream by index** (legacy by order/createdAt since they pre-date index).
5. **Legacy bucket → mark canonical standalone.** Audit trail; no merge attempt (Blocker 2 decision).
6. **Zero non-legacy coaches** (empty or legacy-only match) → just flip match.merged=true.
7. **Solo (1 non-legacy coach)** → mark each stream doc canonical in place.
8. **2+ coaches** → match by local index position:
   - Both coaches have index i → write canonical doc `{mid}_merged_{NNN}` with both sides populated, source docs get `mergedInto` pointer. Increment mergedCount.
   - Only one coach has index i → mark that doc canonical standalone. Increment unmergedCount.
9. **Match doc:** `merged: true, mergedAt, mergeStats: { merged, unmerged }`.

All writes batched via `writeBatch(db)` — atomic commit.

`ds.endMatchupAndMerge(trid, mid)` — training (Blocker 3 opcja c): training is solo per matchup per § 18, so the logic collapses to the single-coach branch — mark all canonical, flip matchup.merged=true. Schema is symmetric with tournament but no merge work needed.

### Conflict cases — acknowledged

1. **Coach A 12, Coach B 10 points:** indexes 1-10 merge. Indexes 11-12 canonical standalone (Coach A home-only). Unmerged banner shown. User audits manually.
2. **Coach A skips index (1, 2, 4, 5):** A's index 4 matches B's index 3 → **data corruption** (wrong pair merged). Accepted per founding assumption — counters must be monotonic per coach.
3. **Late-joining coach:** counter starts at 0, out of sync. User responsibility. No sync hint in v1.
4. **End match double-tap:** idempotency guard on `match.merged === true` → second call returns `{ alreadyMerged: true }` without re-running logic.
5. **Solo scout with existing legacy data:** legacy bucket + new coachUid bucket coexist. Legacy canonicalized first, new stream canonicalized second. Both visible post-merge.

### Claim system (legacy)

`match.homeClaimedBy / awayClaimedBy` fields + auto-claim-on-URL-entry no longer semantically needed — per-coach streams eliminate the "one coach per side" lock. Minimal retirement: stop writing claim fields on new flows, keep reading for backward compat. Cleanup migration is a follow-up.

### Post-merge UI (v1 minimal)

- Toast `⚠ {n} unmerged points — audit manually` for 4s after End match confirm if `unmerged > 0`.
- Match doc has `mergeStats` queryable in Firestore for audit.
- **No persistent banner in v1.** If field use demands, add follow-up reading `match.mergeStats?.unmerged`.

### Related

- Implementation: commits `335b058` (entry semantics) + `072861d` (stream infra) + `3f0f5e9` (merge), merged 2026-04-21 via PR on `feat/entry-semantics-and-per-coach-streams`
- Hook: `src/hooks/useCoachPointCounter.js`
- Service: `src/services/dataService.js` — `setPointWithId`, `setTrainingPointWithId`, `endMatchAndMerge`, `endMatchupAndMerge`
- Readers: `src/hooks/useFirestore.js` — `usePoints` / `useTrainingPoints` now accept `{ currentUid, merged }` options
- Depends on: § 18 (extended: `canonical` flag layered on `open|partial|scouted` status machine), § 38 (multi-role auth — merge uses isScout+ write path), Brief 6/7 (narrow joinable condition and edit-flip guard — joinable fallback still in place as legacy URL safety net)
- Brief: `docs/archive/cc-briefs/CC_BRIEF_BUGFIX_PRE_SATURDAY_8.md`

## 43. URL entry semantics for scouting (approved April 21, 2026)

### Problem

Prior scouting entry conflated "start new point" and "continue existing partial" into a single `?scout=teamId` URL with auto-attach "smart-guess" fallback search finding matching partial points. Scout clicked SCOUT › expecting a new point; app reloaded their own prior partial (Bug C).

### Decision — explicit URL intent, no smart guess

- **Rule 1:** Scout-intent CTA = always new point. Navigate with `?scout=teamId&mode=new`.
- **Rule 2:** List card click on existing point = edit that specific point. Navigate with `?scout=teamId&point=<pid>`.
- **Rule 3:** Auto-attach fallback search (openPoint find by status) removed entirely. User intent is always explicit via URL params.

### Scope — narrow per Blocker 1 resolution

Call sites updated to emit `&mode=new`:
- `MatchPage.goScout` helper (match-review scoreboard Scout › × 2)
- `MatchCard.handleScout` (tournament list match card × 2 team zones)
- `TrainingScoutTab.onSwitchToScout` (training from QuickLog)

Quick Log paths untouched — `QuickLogView` uses in-page `setViewMode` instead of URL navigation and its `onSavePoint` bypasses the joinable search by calling `addPointFn` directly. Already "always new point" by construction.

### Auto-attach rewrite

MatchPage auto-attach effect (post-Brief 8):
- `mode=new` → skip, fresh scout
- `point=<id>` → defer to pointParamId effect (editPoint loads target)
- neither → `console.warn`, no attach

The prior openPoint find-by-status fallback (`status='open'/'partial'` + mySide empty) is deleted. It was the root cause of users' own partials being silently reloaded on next Scout › click.

### savePoint mode=new bypass

When `editingId=null` AND URL has `mode=new`, savePoint bypasses the joinable search and routes directly to the new-point write path (Commit 2 per-coach stream via `savePointAsNewStream`). Legacy URLs (no params) still fall through to Brief 6 narrowed joinable fallback as safety net.

### Related

- Implementation: commit `335b058` (Brief 8 Commit 1), merged 2026-04-21
- Touched: `src/pages/MatchPage.jsx`, `src/components/MatchCard.jsx`, `src/components/tabs/TrainingScoutTab.jsx`
- Depends on: § 42 (per-coach streams — `mode=new` routes here), Brief 6 narrow joinable (legacy fallback still bounded)
- Brief: `docs/archive/cc-briefs/CC_BRIEF_BUGFIX_PRE_SATURDAY_8.md`

## 44. Brief 9 polish — canonical docs, score semantics, toast suppression (approved April 21, 2026)

> **Context:** Brief 8 (§ 42) introduced per-coach point streams + end-match merge. Brief 9 polished three concurrent UX issues discovered during 2-device test. Decisions below are intentional and must not be "fixed" without understanding why.

### 44.1 Canonical docs MUST have `order` field

**Rule:** When `endMatchAndMerge` creates canonical `_merged_NNN` docs, each MUST include an `order` field (e.g. `order: Date.now() + i` or `order: sourcePoint.order`).

**Why:** Firestore's `orderBy('order', 'asc')` query **excludes any document missing that field** (per Firestore docs). `subscribePoints` uses orderBy('order') — canonical docs without `order` are silently filtered out, resulting in empty `points` array and "0 POINTS" heatmap post-merge.

**Anti-pattern:** Creating canonical docs from merged sourceDocs without copying/generating `order`. Do not assume Firestore will fall back to createdAt or document ID.

### 44.2 Score semantics — Option A (per-stream local, canonical post-merge)

**Rule:** `match.scoreA` and `match.scoreB` fields on the match doc are:
- **NEVER written** during regular savePoint / quicklog / delete operations
- **Written ONLY** in `endMatchAndMerge` after canonical docs are created
- **Seeded to 0:0** on match creation (`createMatch`) and clear-all reset (`clearAll`)

**Scoreboard display behavior:**
- **Inside MatchPage** (scouting editor + review): score computed locally from filtered `points` array → reflects own-stream outcomes during match, canonical outcomes post-merge
- **In match lists** (MatchCard, ScoutedTeamPage, TrainingResultsPage, etc.): reads `match.scoreA/B` field → shows `0:0` during live match, snap-to-canonical after End match

**Intentional trade-off:** Match list shows "0:0" for active matches during scouting. This is **acceptable** because:
- Only FINAL matches need authoritative cross-device score
- During match, scouts see own progress on MatchPage (where they actually work)
- Match list is navigation, not a real-time scoreboard
- Eliminates race condition where each coach's partial writes overwrote each other with incomplete data

**Writers removed from regular saves (per Brief 9):**
- A. MatchPage savePoint — no longer writes scoreA/B
- B. MatchPage quicklog inline save — no longer writes scoreA/B
- C. MatchPage handleDeletePoint — no longer writes scoreA/B
- F. TrainingScoutTab quicklog save — no longer writes scoreA/B

**Writers retained (seeded/reset only):**
- D. MatchPage clearAll → hardcoded 0:0
- E. dataService createMatch → hardcoded 0:0
- endMatchAndMerge → one authoritative write after canonical creation

**Training analog:** TrainingScoutTab writer F follows same pattern. Even though training is solo per matchup (no race), schema consistency is maintained — score computed in `endMatchupAndMerge`.

### 44.3 False-positive flip toast suppression

**Rule:** In concurrent mode (per-coach streams, Brief 8 architecture), the "⇄ Sides swapped — other coach flipped orientation" toast is **suppressed**.

**Why:** Toast was designed for chess-model lock semantics that no longer exist under Brief 8. Under per-coach streams, each coach stores own `fieldSide` in their own doc — there is nothing shared to flip from the other coach's side of the match.

**Implementation:** Sync effect watching `match.currentHomeSide` changes still runs (to update local state), but does NOT fire user-visible toast. `lastSyncedHomeSideRef` guard remains to prevent infinite sync loop.

### 44.4 Auto-flip on winner-save DOES fire (Brief 9 Bug 3a reverted)

**Rule:** When a point is saved with a winner outcome (`win_a` or `win_b`) and `!editingId`, auto-swap updates `match.currentHomeSide` for BOTH coaches. This is intentional paintball semantics — after a point, teams physically swap sides on the field.

**History:** Brief 9 Bug 3a initially added `&& mode !== 'new'` guard to block this flip. That was a mistake — `mode=new` is the normal scouting flow, so auto-flip was disabled for every save. Reverted same day.

**Final code:**
```js
if (shouldSwapSides && isConcurrent && !editingId) {
  await ds.updateMatch(..., { currentHomeSide: flipped });
}
```

Brief 7's `!editingId` guard remains (editing a point should not flip sides for next point). No `mode` check.

### 44.5 Open question — `match.currentHomeSide` under per-coach streams

**Status:** Post-Saturday investigation item.

Under Brief 8 architecture, each coach has own `fieldSide` per doc. `match.currentHomeSide` is written by:
- Flip pill onClick (manual user action)
- Auto-swap on winner-save (see § 44.4)

And read by:
- URL entry effect (sets initial local fieldSide from match state)
- Sync effect (updates local state when other coach flips)

Is this still architecturally necessary? Or should flip pill update only local state, with no Firestore write? To investigate after NXL Czechy 2026-04-25.

### Related

- Implementation: commits `a872782` + `65082aa` (Brief 9) + `29c2be1` (Bug 3a revert), merged 2026-04-21
- Brief: `docs/archive/cc-briefs/CC_BRIEF_BUGFIX_PRE_SATURDAY_9.md`
- Supersedes/extends: § 18 (concurrent scouting chess-model retired), § 42 (per-coach streams)
- Long-form architecture: `docs/architecture/CONCURRENT_SCOUTING.md`

## 45. Members page inline role editing + profile identity single-render (approved April 22, 2026)

### 45.1 Member identity rendering (B1)
- Canonical fallback chain for a member's display label in both `MemberCard` and `PendingMemberCard`:
  1. `linkedPlayer.nickname` — primary for PBLI-linked members
  2. `linkedPlayer.name` — secondary linked-player identity
  3. `/users/{uid}.displayName` — profile-mirror Firestore doc
  4. `/users/{uid}.email` — last human-readable anchor
  5. Localized `'Member'` / `'Użytkownik'` fallback
- **Never surface `uid.slice(…)` fragments in UI.** UIDs are internal; seeing them means an upstream data-fetch path failed.
- Profile lookups batched via `useUserProfiles(uids)` hook (co-located with `useUserNames` in `src/hooks/useUserNames.js`). Process-wide cache; one read per uid per session unless invalidated by `invalidateUserName`.

### 45.2 Role chips are live for admins (B2)
- Chips toggle **inline on tap** — no Edit/Save/Cancel mode. Admin edits a role by tapping its chip; write is optimistic with revert-on-error.
- Non-admins see chips as `readOnly` pills (visual only). Toggle-on state: amber bg + amber border. Toggle-off: neutral border.
- Optimistic pattern: nullable `pendingRoles` state buffers the in-flight write; canonical `roles` prop (from snapshot) drives display at rest. Buffer cleared on write completion (success or error).
- **Self-admin self-protect (§ 38.3) is retained.** Admin cannot demote their own `admin` chip; they must use "Transfer admin" first. The chip shows `disabledReason` tooltip. This pre-dates B2 and remains a hard guardrail — not softened to a confirm, since relaxing would undo an existing security invariant.

### 45.3 Last-admin guard (B3)
- `adminCount` computed in MembersPage, passed to every `MemberCard`. A workspace admin holds `admin` via `userRoles[uid].includes('admin')` OR `workspace.adminUid === uid`.
- Two protection layers when `adminCount <= 1`:
  1. The last admin's `admin` chip is disabled with reason "Cannot remove last admin from workspace".
  2. "Remove from workspace" is **filtered out** of the kebab menu entirely — no disabled-button affordance; the last admin simply cannot be removed via UI.
- Confirmation modal body enumerates what is lost ("all tournaments, teams, scouting data") and warns it cannot be easily undone. Title includes target's display name for clarity.
- **Self-remove ("Leave workspace") is intentionally not exposed here.** Self-removal requires a post-leave redirect flow and workspace-switching UX; out of scope for inline member management. Future brief required.

### 45.4 Profile identity — single render rule (C1/C2)
- `/profile` (ProfilePage) renders the logged-in user's **display name exactly once** — in its dedicated editor card. Previous layout duplicated the read-only displayName inside the avatar card header above the editor; deprecated.
- The avatar card is now: `[avatar 72×72] [email (account-identity anchor)] [photo URL editor]`. Email stays because it's the stable account identifier and provides context for the avatar URL editor that changes what the avatar displays.
- Same rule applies to future surfaces showing current-user identity: **one canonical render per field per page**. Identity blocks on other pages may repeat values from different users (scout lists, member rows) — that's different, not a violation.

### Related
- Implementation: commits `326cdc2` + `a515657` (Brief D), merged 2026-04-22
- Brief: inline (user pasted in session, no archive file)
- Builds on: § 38 Security Role System v2, § 38.3 self-protection, § 34 Field Side Representation Standard

## 46. Settings IA — Scouting section + Feature flags home + deferred per-user override (approved April 22, 2026)

### 46.1 Settings lives in the More tab
- This app has no separate `/settings` page. `MoreTabContent` (for tournaments) and `TrainingMoreTab` (for trainings) are the Settings surface. § 31 established this; this section codifies it against future confusion: **"add to Settings" means add a new `MoreSection` to both More tabs**, not create a parallel settings route. Profile-level account settings live at `/profile` (ProfilePage) and stay there.

### 46.2 Scouting section (A3)
- New `ScoutingSection` MoreSection holds per-device preferences that affect the scouting surface (canvas, loupe, touch). Position: between **Manage** (browse_section) and **Actions** — after the data-nav block and before the session-action block.
- Handedness toggle persists via `localStorage['pbscoutpro-handedness']` — keep localStorage, not Firestore, since the preference is ergonomic and per-device (a user on an iPhone vs iPad wants different loupe positions). `drawLoupe.js` already reads this key — the section just gives it a UI.
- Future scouting options (haptic feedback, default point mode, canvas zoom default) go here. **Do not scatter scouting prefs across multiple sections.**

### 46.3 Feature flags home + edit semantics (D1 Option 1)
- **Feature Flags is admin-only and has its own top-level `MoreSection`** in both More tabs — not nested under "Debug" or any other category. Promotion reflects its role as a first-class admin tool for controlling rollout, not a developer side-door.
- Destination page `/debug/flags` (route preserved to avoid breaking bookmarks) renders as "Feature flags" — header text updated. Per-flag inline edit:
  - `enabled` — green iOS-style toggle
  - `audience` — cycle pill `all → beta → admin`, color-scaled green/amber/red for broadest→most-restrictive
- Writes update `/workspaces/{slug}/config/featureFlags` directly; the existing `useAllFlags` snapshot drives re-render. No optimistic buffer — saving state dims the row during the round-trip, which is acceptable for an admin tool.
- **Audience color scale is the visual affordance for reach.** Admin flipping a flag's audience to `all` sees the pill turn green — the broadest-reach state — before the write commits. No destructive confirmation modal for flags today (no current flag matches the brief's `disable*/restrict*/lock*` destructive pattern); add if/when one appears.

### 46.4 Deferred — per-user flag overrides
- The Brief C original premise assumed `users/{uid}.featureFlags: { flagName: boolean }` per-user overrides. The actual architecture is **workspace-global + audience rules** (`featureFlags.js` `isInAudience`), and the DebugFlagsPage (before this brief) read that source of truth.
- Per-user overrides are a genuinely useful feature (A/B with specific scouts, emergency opt-out for one user), but shipping them requires:
  - **Option A**: `users/{uid}.featureFlagOverrides: { flagName: true|false }` that layers on top of audience eligibility in `useFeatureFlag`. Simple schema, cascade rule: override wins if set.
  - **Option B**: Extend audience to explicit user lists, e.g. `audience: { type: 'users', userIds: [...] }`. More flexible but changes the `isInAudience` contract.
- Either requires a Firestore rules audit (admin needs to read `users/*` to list targets, which the current rules may not allow — the brief flagged this).
- **Not in scope for Brief C Option 1.** When a real use case surfaces, write a dedicated brief and pick A or B explicitly.

### Related
- Implementation: commit `524fe48` (Brief C Option 1), merged 2026-04-22
- Brief: inline (user pasted in session, no archive file)
- Builds on: § 31 Bottom Tab Navigation — More tab as Settings surface
- References: `src/utils/featureFlags.js` (STATIC + DYNAMIC_FLAG_DEFAULTS + audience rules), `src/hooks/useFeatureFlag.js`, `src/utils/roleUtils.js` (ADMIN_EMAILS fallback)

## 47. Role-gated tab visibility + pure-player More section rule (approved April 22, 2026)

### 47.1 Tab visibility matrix
- `AppShell.TAB_DEFS` defines every bottom-nav tab with a `requiredAny` role list. A tab renders if and only if at least one required role matches the user's `effectiveRoles`, OR `effectiveIsAdmin` is true (admin always sees every tab, even when their roles array is empty via `adminUid` or `ADMIN_EMAILS` paths).
- Current matrix (append new rows here when adding tabs):

  | Tab    | requiredAny                    | Visible to                                     |
  |--------|--------------------------------|------------------------------------------------|
  | Scout  | `['scout','coach','viewer']`   | scout, coach, viewer, admin                    |
  | Coach  | `['coach','viewer']`           | coach, viewer, admin                           |
  | More   | `null`                         | everyone                                       |

- Pure-scout sees Scout + More. Pure-coach sees Scout + Coach + More (coaches also scout — coach role transitively permits Scout tab via the matrix). Pure-player sees only More. Viewer (read-only) sees all tabs; in-tab components gate writes via `isViewer` check.
- When the persisted `activeTab` is no longer in the visible set (admin impersonating a lower role, multi-role user whose roles were just narrowed), `AppShell` effects a fallback to the first visible tab via `onTabChange`. Simpler than coordinating through MainPage; single source of truth for tab semantics.

### 47.2 Pure-player More sections
- `MoreTabContent` and `TrainingMoreTab` compute `isPurePlayer = hasRole(effectiveRoles, 'player') && !effectiveIsAdmin && !hasAnyRole(effectiveRoles, 'admin','coach','scout','viewer')`.
- When true, these sections hide: **Session** (edit tournament/training), **Manage** (layouts/teams/players/scouts/TODO), **Scouting** (handedness — a scout-canvas concern), **Actions** (close/delete event).
- These remain visible: **Account** (profile, workspace, sign out), **Language**, and — if the viewer is admin — **Feature flags** (unchanged admin gate).
- **Do NOT add pure-player-specific sections here.** A landing surface for a pure-player user (their own point history, performance, self-log entry) is a PlayerSelfLogPage concern (see `docs/architecture/PLAYER_SELFLOG.md` Tier 2) and belongs on its own route behind its own tab — that's a separate brief.

### 47.3 Route-level guards — deferred
- `canAccessRoute` in `src/utils/roleUtils.js:68-97` has an explicit player allowlist (`/`, `/player/*`, `/tournament/.../team/...`) and a default-deny tail. That correctly blocks player from `/layout/*` and `/match/*` (wrapped by `<RouteGuard>` in App.jsx). But the default-deny also blocks `/profile` — which the app currently avoids by NOT wrapping `/profile` with RouteGuard.
- Adding RouteGuard to more URL-level routes (e.g., `/teams`, `/players`, `/my-issues`) for defense-in-depth requires first extending the player allowlist (at minimum `/profile`, `/scouts` probably) so no regression occurs. Out of scope for Brief E Option 1; captured as a follow-up brief.
- Tab-chrome hiding alone is sufficient for the E1 symptom (player seeing Scout/Coach tabs). URL-typing is a separate concern addressed at the URL layer.

### 47.4 F2 — "Quick scouting only in training" — dropped
- User decision 2026-04-22: quick scouting stays available in all current contexts (tournaments + trainings). No gating by context. Removed from backlog; noted here so future sessions don't re-suggest it.

### Related
- Implementation: commits `8bbf85f` + `23e4bd6` (Brief E), merged 2026-04-22
- Brief: inline (user pasted in session, no archive file)
- Builds on: § 31 Bottom Tab Navigation, § 38.5 view-as impersonation semantics, § 38.6 route-access matrix
- Follow-up: canAccessRoute completeness audit + RouteGuard sweep (own brief when prioritized)

## 48. Player Performance Tracker (PPT) — wizard flow + training picker (approved 2026-04-22)

**Reference mockup:** `docs/product/PPT_MOCKUP.md` (v7-derived implementation spec — tokens + JSX pseudocode + i18n keys). The original v7 interactive HTML preview lives at `/mnt/user-data/outputs/PLAYER_PERFORMANCE_TRACKER_V7_TRAINING_PICKER.html` (outside repo); the markdown file is what CC uses.
**Related:** § 32 (Training Mode), § 34 (Field Side), § 35 (Outcome states), § 36 (Adaptive pickers), § 46/47 (Role gating Brief E)

### 48.1 Product framing

**Target persona:** Pure player. Not scout, not coach. Opens app after stepping off field, logs own performance. Does NOT see scouting canvas, heatmap, or coach analytics.

**Use case:** Between points during training, player logs "where I ran, how I ran, what I shot at, what happened to me" in 5-15 seconds. Gloves on, fatigued, limited fine motor control. Minimum 4 taps for fastest path.

**NOT PlayerSelfLog Tier 1.** Separate product from 2026-04-20 HotSheet. Shared schema semantics per § 35.7, different UX. Both coexist — HotSheet serves coach-who-plays, PPT serves pure-player.

### 48.2 Entry flow — training picker (adaptive)

**Auto-pick (1 training LIVE for player's team):** Skip picker, enter wizard directly with resolved `trainingId` + `layoutId`.

**Picker (multiple LIVE OR zero LIVE):**
- List of trainings for player's team
- LIVE trainings at top with pulsing green dot + "● LIVE" badge
- Upcoming with cyan "Zaplanowane" badge
- Ended (max 10 most recent) with gray "Zakończone" badge
- Tap card → enter wizard with that training's context
- **Refresh icon button** in top-right of picker header (PageHeader action slot) — explicit refresh, no pull-to-refresh infrastructure

**No trainings for team:** Empty state "Poczekaj aż coach utworzy trening" (out of scope for MVP).

### 48.3 Wizard structure — 5 steps (or 4 with skip-shots variant)

Auto-advance on tap for single-select steps. Explicit "Dalej" CTA on Step 3 (multi-select). 100ms slide-left transition between steps.

**Header on every step:**
- Left: 44×44 chevron back (`‹`). On Step 1: confirm modal "Wyjść z logowania?" if wizard state has data, else returns to picker directly.
- Center: "Krok N z M" where M is dynamic (5 for late-break/ze-strzelaniem, 4 for na-wslizgu/na-okretke)
- Right: 44×44 exit (`×`) — same confirm as Step 1 back
- Below: progress bar (amber gradient fill)

**Training pill below header:** Gray pill with live dot + training name + "#N pkt dziś" counter. Tap → returns to picker + clears wizard state (confirm first).

**Step 1 — Gdzie biegłeś?**
- Question: "Gdzie biegłeś?"
- Hint: Bootstrap (`playerLogs < 5`): "Wszystkie bunkry z {layoutName}". Mature: "Twoje top 6 bunkrów z {layoutName}".
- UI: 2-column grid, 88px min-height cells. Side label (SNAKE/CENTER/DORITO) colored per § 34. Bunker name 20px weight 800. Mature shows `{freq}%` top-right.
- Bottom: "Inne bunkry" dashed chip → bottom sheet with remaining bunkers from layout.
- Tap bunker → auto-advance to Step 2.

**Step 2 — Jak biegłeś?**
- Question: "Jak biegłeś?"
- Hint: "Sposób wejścia na pozycję"
- UI: Vertical stack of 4 variant cards, 76px min-height. Each: Lucide icon + label (16px 800) + subtitle hint (11px 500).
- Variants (label / hint / slug / next step):
  - `late-break`: "Late break" / "Przycup ze strzelaniem" → Step 3 (shots)
  - `na-wslizgu`: "Na wślizgu" / "Bez strzelania" + cyan **SKIP SHOTS** badge → skips to Step 4
  - `ze-strzelaniem`: "Ze strzelaniem" / (no hint) → Step 3 (shots)
  - `na-okretke`: "Na okrętkę" / "Dookoła przeszkody, bez strzelania" + **SKIP SHOTS** badge → skips to Step 4
- Tap variant → auto-advance (to Step 3 or Step 4 based on variant).

**Step 3 — Co strzelałeś? (shots, multi-select)**
- Shown only if variant ∈ {late-break, ze-strzelaniem}
- Question: "Co strzelałeś?"
- Hint (dynamic): "Tap po kolei · {count} cel(e) wybrany(e)"
- UI: 2-column grid (same component as Step 1), 88px cells. Mature shows `{freq}%` from layout crowdsource. Tap once = add to shots array with next order (1, 2, 3). Tap again = remove (re-orders remaining).
- "Inne bunkry" dashed chip → bottom sheet with remaining bunkers.
- Skip link below grid: "Nic nie strzelałem →"
- Sticky footer: amber "Dalej →" CTA (64px, full-width). Enabled if ≥1 shot OR skip tapped.

**Step 4 — Jak spadłeś? (outcome)**
- Question: "Jak spadłeś?"
- Hint: "Co się z Tobą stało w tym punkcie"
- UI: Vertical stack of 3 outcome cards, 84px each. Default-colored (not just selected):
  - `alive`: green border + green icon (Lucide Shield). "Grałem do końca" / "Nikt mnie nie trafił"
  - `elim_break`: red border + red icon (Lucide Zap). "Dostałem na brejku" / "Pierwsze 5 sekund"
  - `elim_midgame`: red border + red icon (Lucide Swords). "Dostałem w grze" / "Po rozbiegu"
- Tap alive or elim_break → Step 5. Tap elim_midgame → Step 4b.

**Step 4b — Jak Cię trafili? (detail, conditional)**
- Shown only if outcome === elim_midgame
- Question: "Jak Cię trafili?"
- Hint: "Wybierz rodzaj strzału"
- UI: Vertical stack of 6 detail cards, 72px each.
  - Group 1 (konkretne, red borders, red icons):
    - `gunfight`: "Gunfight" / "Wymiana ognia na przeszkodzie"
    - `przejscie`: "Przejście" / "Podczas zmiany przeszkód"
    - `faja`: "Faja" / "Przeciwnik mnie zabiegł"
    - `na-przeszkodzie`: "Na przeszkodzie" / "Blind shot, bounce"
  - Group 2 (nieprecyzyjne, neutral borders, gray icons):
    - `inne`: "Inaczej" / "Opisz własnymi słowami" → inline expand textarea (56px min, placeholder "Np. Strzelił mnie kolega na zapleczu...") + "Zapisz i dalej" amber CTA (50px) → Step 5
    - `nie-wiem`: "Nie wiem" / "Nie zauważyłem skąd" → auto-advance, NO input
- Tap any option except `inne` → auto-advance to Step 5 (collapses inne expand if active).

**Step 5 — Podsumowanie**
- Question: "Zapisać?"
- Hint: "Tap rząd żeby cofnąć i poprawić"
- UI: Single card with tappable rows (tap → back to that step, state preserved):
  - Row 1: "Gdzie biegłeś" → side-tag + bunker name
  - Row 2: "Jak" → variant label
  - Row 3: "Strzały" → side-tag + sequence "D1 → D3" OR "Pominięte (na wślizgu)" italic gray
  - Row 4: "Jak spadłeś" → outcome + optional detail + optional custom text, e.g. "Dostałem w grze · gunfight" or `Dostałem w grze · "Wpadłem na nogę Kuby..."`
- Sticky footer: amber "Zapisz punkt" CTA (64px, checkmark icon).

### 48.4 Routing matrix

```
Step 1 → auto-advance Step 2

Step 2 (variant):
  if variant ∈ {late-break, ze-strzelaniem} → Step 3 · totalSteps = 5
  if variant ∈ {na-wslizgu, na-okretke}     → Step 4 · totalSteps = 4

Step 3 (shots) → explicit "Dalej" → Step 4

Step 4 (outcome):
  if outcome === elim_midgame → Step 4b
  else                        → Step 5

Step 4b (detail):
  if detail === 'inne' → expand textarea → "Zapisz i dalej" → Step 5
  else                 → auto-advance Step 5

Step 5 → "Zapisz punkt" → Firestore write → navigate to today's logs list
```

### 48.5 Data model

**Firestore path:** `/players/{playerId}/selfReports/{auto-id}`

```javascript
{
  createdAt: Timestamp,  // serverTimestamp on save

  // Context — captured at wizard entry
  layoutId: "ranger-field-2026",
  trainingId: "training-2026-04-22",
  teamId: "ranger-ring",

  // Matching — filled post-hoc by coach (separate product)
  matchupId: null,
  pointNumber: null,

  // Player-entered data
  breakout: {
    side: "snake",                   // snake | center | dorito (derived from bunker)
    bunker: "Dogbone",               // bunker.positionName from layout
    variant: "na-wslizgu"            // enum slug
  },
  shots: [
    { side: "dorito", bunker: "D1", order: 1 },
    { side: "dorito", bunker: "D3", order: 2 }
  ],  // null if skip-shots variant, [] if required but "Nic nie strzelałem"

  outcome: "elim_midgame",             // alive | elim_break | elim_midgame
  outcomeDetail: "inne",               // gunfight | przejscie | faja | na-przeszkodzie | inne | nie-wiem | null
  outcomeDetailText: "Wpadłem na nogę Kuby..."  // string | null, only when outcomeDetail === "inne"
}
```

**Firestore indexes (collection group `selfReports`):**
- `createdAt desc` (today's logs list query)
- `(layoutId, breakout.bunker, createdAt desc)` (layout crowdsource for Step 3 mature mode)

### 48.6 Adaptive picker thresholds (reference § 36)

**Breakout picker (Step 1):** player's own `selfReports` aggregated by `breakout.bunker`.
- `totalPlayerLogs < 5` → bootstrap (show all bunkers, sorted snake/center/dorito, no freq)
- `totalPlayerLogs >= 5` → mature (top 6 by count, show `{pct}%`, + "Inne" chip)

**Shots picker (Step 3):** layout-wide crowdsourced from ALL players' `selfReports` matching current `layoutId` AND `breakout.bunker`.
- `totalLayoutShots < 20` → bootstrap
- `totalLayoutShots >= 20` → mature (top 6 by count)

**"Inne bunkry" expand:** bottom sheet with ALL bunkers from layout EXCEPT those already shown. For Step 3, exclude top 6 AND already-selected shots.

### 48.7 Role gating (cross-reference Brief E Option 2)

PPT gated behind role with `player` capability. Current Brief E Option 1 (2026-04-22) shows pure-player only Home + More tabs.

**Blocker:** Brief E Option 2 must ship alongside PPT to add entry point. Otherwise route exists but unreachable for target persona.

**Reachability options (Brief E Option 2 decides):**
- New tab "Gracz" in bottom nav between Home and More
- Route `/player/log` in More section (direct path)
- Deep link from onboarding when email matched

### 48.8 Offline behavior

**State persistence:** Wizard state persisted to `localStorage` on every step advance. Key: `ppt_wizard_state_{playerId}`. TTL 10 min (discarded after).

**Save on Step 5:**
- Primary: Firestore write. Success → toast "Zapisany punkt #{N}" → navigate to list.
- Failure (offline): localStorage queue `ppt_pending_saves_{playerId}`. Toast "Zapisany lokalnie, zsynchronizujemy gdy wróci sieć". Navigate to list anyway — list reads both Firestore + pending queue, pending rows get subtle sync indicator.
- Background sync: on route changes + `window.online` event, flush queue to Firestore. Remove on success.

### 48.9 Post-save flow — today's logs list

Route `/player/log` shows:
- Header: "Twoje dzisiejsze punkty" title + refresh icon button (top-right)
- Pending sync indicator if queue has items
- List: today's `selfReports` for this player (`where playerId == X AND createdAt > today_start ORDER BY createdAt desc`)
- Each row: `#N` (ordinal today), side-tag + breakout name + variant, second line shots "D1 → D3" + optional detail, right chip outcome (alive green / elim red)
- Sticky bottom amber CTA "+ Nowy punkt" (64px) → resets wizard state, enters Step 1 (or picker if training context lost)

### 48.10 Known unknowns (deferred to implementation)

- **Matchup matching product** — coach-side workflow to assign orphan `selfReports` to matchup/point. Separate product/brief.
- **Post-save list edit/delete** — tap card = read-only on initial ship, add edit in follow-up if users complain.
- **Team roster migration** — if player moves between teams, `selfReports` stay with old `teamId`. Cold review can re-attribute. Non-blocker.

## 49. Unified auth + roles + tab visibility (approved 2026-04-23)

**Related:** § 33 User Accounts, § 33.1/.2 Brief G Option B shims, § 38 Security Role System, § 45 Members inline role editing, § 47 Brief E Option 1 tab visibility (superseded here), § 48 PPT (reachability wchłonięte).

### 49.1 User-doc schema

```
/users/{uid}:
  email, displayName,
  workspaces: string[],        // slugs user has joined (existing)
  roles: string[],             // NEW — bootstrap role default, global per user
  defaultWorkspace: string,    // NEW — auto-join pointer; still requires code entry
  createdAt
```

`roles` is a plural array introduced fresh here — no collision with the deprecated singular `role` field dropped in § 33.1. Serves as a bootstrap default only; authoritative role once admin has touched the user is `workspace.userRoles[uid]`.

`defaultWorkspace` is a scalar slug pointer. Default value `'ranger1996'` (constant `DEFAULT_WORKSPACE_SLUG` in `src/utils/constants.js`). The user must still enter a workspace code at first login — "auto-join, nie auto-login" per 2026-04-23 decision.

### 49.2 Default workspace auto-join

When a new joiner calls `enterWorkspace(code)`:
- **If** `slug === userProfile.defaultWorkspace` AND `userProfile.roles` is a non-empty array → mirror `user.roles` into `workspace.userRoles[uid]` AND skip `pendingApprovals`. User enters the default workspace immediately with their bootstrap role.
- **Else** (non-default workspace OR user has no bootstrap roles yet) → existing flow applies: `userRoles[uid] = []` + `pendingApprovals.arrayUnion(uid)`. Admin must approve via Members page.

### 49.3 Canonical role resolution

`useWorkspace.roles` resolves in priority order:
1. `workspace.userRoles[uid]` if `Array.isArray && .length > 0` — authoritative (admin-set or default-workspace bootstrap mirrored at join).
2. `userProfile.roles` if `Array.isArray && .length > 0` — bootstrap default.
3. `[]` — most-restrictive fallback.

`workspace.userRoles[uid] = []` (empty array) does NOT fall through to `userProfile.roles` via the `non-empty` check — but empty array means pending approval; user should see bootstrap-capable tabs in the meantime.

Wait — revise step 1: `workspace.userRoles[uid]` **if non-empty** wins. Empty falls through to `userProfile.roles`. Matches the useWorkspace implementation.

### 49.4 Strict tab visibility matrix

| Role | Scout | Coach | Gracz | More |
|---|:-:|:-:|:-:|:-:|
| admin | ✓ | ✓ | ✓ | ✓ (all sections) |
| coach | ✗ | ✓ | ✗ | ✓ (full sections) |
| scout | ✓ | ✗ | ✗ | ✓ (full sections) |
| player | ✗ | ✗ | ✓ | ✓ (account + language) |
| (legacy) viewer | ✗ | ✗ | ✗ | ✓ (account + language) |
| multi-role (union) | union of allowed cells | | | always |

Replaces § 47's permissive matrix (coach was in Scout's `requiredAny`, viewer saw all tabs). New matrix is strict — if a user needs two tabs, admin assigns both roles. Explicit over implicit per 2026-04-23 decision.

Implementation: `TAB_DEFS` in `AppShell.jsx` with `requiredAny` single-role arrays (`['scout']`, `['coach']`, `['player']`). `computeVisibleTabs(effectiveRoles, effectiveIsAdmin)` handles matrix lookup + admin bypass. Persisted `activeTab` falls back to first-visible when invalidated.

### 49.5 Gracz tab

Key `ppt`, icon 🏃, label `Gracz`, position between Coach and More in the TAB_DEFS array. `requiredAny: ['player']`.

Tap handler in `MainPage.handleTabChange` routes `'ppt'` → `navigate('/player/log')` rather than setting `activeTab`. PPT has its own layout + chrome (picker / wizard / list) that would clash with AppShell's tournament context bar. `'ppt'` is **not** persisted to localStorage — returning to `/` drops the user back on their last real content tab.

### 49.6 More tab content gating

`isPurePlayer` predicate in `MoreTabContent` + `TrainingMoreTab` hides Session / Manage / Scouting / Actions sections. Predicate rewritten to:

```js
const isPurePlayer = !effectiveIsAdmin && !hasAnyRole(effectiveRoles, 'coach', 'scout');
```

Single-test simplification (§ 47's old model enumerated 5 roles explicitly). Naturally captures pure-player, legacy-viewer, empty-roles bootstrap users. Coach / scout (singular or multi-role) unlocks the full sections; admin bypasses via `effectiveIsAdmin`.

### 49.7 Viewer role retirement

- `ROLES` constant (`roleUtils.js`) keeps all 5 roles for legacy data parsing via `parseRoles`.
- New export `ASSIGNABLE_ROLES = ['admin', 'coach', 'scout', 'player']` — what Members page exposes.
- `RoleChips` renders from `ASSIGNABLE_ROLES`. Admin can no longer assign viewer to new members.
- Existing viewer users keep their role in `workspace.userRoles[uid]`; the strict matrix + isPurePlayer now puts them in the More-only bucket (same as pure-player). Admin can reassign per user at their own pace — no automatic migration.

### 49.8 Admin panel (Members page) — Path A

Admin panel at `/settings/members` (MembersPage, admin-guarded) already supports the new model end-to-end:
- Lists active members + pending approvals for the current workspace
- `MemberCard` per row uses `RoleChips` (now 4 roles: admin / coach / scout / player)
- Inline role toggle writes to `workspace.userRoles[uid]` via `updateUserRoles` — which is the canonical role store post-admin-touch
- Last-admin guard (§ 45) + self-admin self-protect (§ 38.3) retained
- Live reactive: `useWorkspace` subscribes to workspace doc + /users/{uid} doc; role changes propagate to tab visibility + section gating without reload

No Path B or Path C work needed.

### 49.9 PPT rules hotfix (§ 48 follow-up)

Along with this brief's deploy, `firestore.rules` gained:

```
// Inside /workspaces/{slug}/players/{pid}:
match /selfReports/{sid} {
  allow read: if isMember(slug);
  allow create: if isPlayer(slug);
  allow update, delete: if isPlayer(slug);
}

// Root-level, for collection-group reads in getLayoutShotFrequencies:
match /{path=**}/selfReports/{sid} {
  allow read: if request.auth != null;
}
```

§ 48 shipped without these — default-deny was blocking all PPT writes in prod. Caught during § 49 audit. Rules deployed 2026-04-23 via `firebase deploy --only firestore:rules`.

### 49.10 Migration policy

**New users (post-deploy):** signup → user doc seeded with `roles: ['player']` + `defaultWorkspace: 'ranger1996'`. Enter ranger1996 code → auto-approved player.

**Existing users:** no automatic migration. Existing `workspace.userRoles[uid]` values continue to drive role resolution. If admin wants to upgrade an existing user, they use Members page as before — writes go to `workspace.userRoles[uid]`, reader picks up from there.

**Viewer users:** legacy role preserved. Strict matrix moves them to More-only visibility (functionally similar to read-only intent). Admin reassigns to one of 4 new roles at their pace.

### 49.11 Known follow-ups

- **Tighter selfReports ownership validation** — rules currently gate on `isPlayer(slug)`; should also verify `pid` matches `auth.uid`'s linked player. Deferred — invited-workspace model contains attack surface.
- **workspace.userRoles self-write validation** — the existing `affectedKeys` diff check in rules allows a user to write arbitrary role values into their own `userRoles[uid]` slot during the self-join envelope update. Latent privilege-escalation risk. Not introduced by this brief (pre-existing). Fix = field-value validation in rules; deferred.
- **Full schema unification (Brief G proper)** — dual-path reader (workspace vs user-doc roles) works today but adds cognitive load. Deferred to a dedicated off-hours migration window when someone needs it.
- **Brief E Option 2 wchłonięte** — PPT reachability via Gracz tab satisfies the deferred § 48.7 note. Mark DONE in NEXT_TASKS.

### Related

- Implementation: commits `548a3bb` (user-doc schema + rules hotfix) + `470f227` (strict tab matrix + Gracz tab), merged 2026-04-23
- Brief: pasted inline 2026-04-23
- Replaces / supersedes: § 47 Brief E Option 1 permissive matrix

## 50. Settings menu reorg + nav cleanup (approved 2026-04-23)

**Related:** § 27 Apple HIG, § 31 Bottom Tab Navigation, § 33.3 ProfilePage self-edit, § 38 Security roles, § 46 Settings IA, § 49 Unified auth + tab matrix.

### 50.1 Settings menu structure

`MoreTabContent` + `TrainingMoreTab` restructured to Jacek's exact six-section spec. Section order is fixed; per-item visibility gates per § 49 strict matrix.

| Section | Items | Visibility |
|---|---|---|
| SESJA | Edytuj turniej/trening · Zamknij turniej (live) / Usuń turniej (closed) | Coach/scout/admin (when tournament/training context exists) |
| ZARZĄDZAJ | Layouty · Drużyny · Zawodnicy | Coach + admin (was scout+coach+admin pre-§50; brief specifies coach as the asset-management role) |
| SCOUTING | Ręka dominująca · Moje TODO · Ranking scoutów | Scout + coach + admin |
| WORKSPACE | Mój workspace · {workspace name} [Wyjdź] · Członkowie | All roles see Mój workspace + Wyjdź; Członkowie admin-only |
| KONTO | Mój profil · Język · Wyloguj się | All roles |
| ADMIN | ViewAsPill (Podgląd jako) · Feature flags | Admin only |

§ 49 `isPurePlayer` predicate continues to drive the SESJA/ZARZĄDZAJ/SCOUTING gates. WORKSPACE.Mój workspace + Wyjdź are explicitly visible for pure-player so they can leave a workspace they joined by mistake. KONTO.Wyloguj is now visible to all roles (was admin-only in the old More tab — pure-player had no UI logout path).

Brief author proposed a separate "Podgląd jako (placeholder — toast Funkcja wkrótce)" item. **Skipped** — the existing `ViewAsPill` component already IS the "Podgląd jako" entry (label + dropdown). Adding a stub next to it would have created two identically-labeled rows. ViewAsPill relocates from KONTO to ADMIN section, matching its admin-only nature.

Tab label "More" → "Ustawienia" via new `tab_settings` i18n key. `TAB_DEFS` in `AppShell.jsx` gains a `labelKey` field so AppShell renders the localized label.

### 50.2 Nav simplification

Legacy `BottomNav.jsx` (62 lines: Home/Layouts/Teams/Players object-based tabs) deleted. Mounted previously in `App.jsx` via fixed-position render outside the route tree, hidden by `HIDDEN_PATTERNS` regex on detail/sub routes.

AppShell role-tab bar (Scout/Coach/Gracz/Ustawienia per § 49) is now the only bottom nav app-wide.

**No legacy-route redirects added.** Brief proposed redirect-to-Home for `/layouts`, `/teams`, `/players`, `/scouts`, `/my-issues` based on the assumption these would become dead routes — they're not dead, just no longer in a tab strip. All five remain reachable via Settings → ZARZĄDZAJ / SCOUTING. Bookmarked URLs continue to work.

Stale "above BottomNav" comments in `design-contract.js` + `ViewAsIndicator.jsx` left in place — they describe spatial intent for any future bottom-anchored UI, not BottomNav specifically.

### 50.3 Wyjdź workspace flow

Self-leave path (previously absent — only admin could remove members via `removeMember`).

**UX:**
- WORKSPACE section row 2: workspace name as label, red `[Wyjdź]` Btn in `rightSlot` (button stops click propagation; row body has no onClick — avoids the multi-CTA-on-card § 27 anti-pattern)
- Click Wyjdź → `ConfirmModal` "Wyjść z workspace? — Stracisz dostęp…"
- Confirm → `ds.leaveWorkspaceSelf(uid)` → on success → `useWorkspace.leaveWorkspace()` clears local session → `LoginGate` takes over

**Last-admin guard:** UI computes admin count from `workspace.userRoles` + `workspace.adminUid`. If user is the only admin, the Wyjdź button is disabled with `title` tooltip "Jesteś jedynym administratorem. Przekaż administrację innemu członkowi przed wyjściem". Rules can't enforce this — would require iterating the userRoles map server-side.

**Service layer:** `ds.leaveWorkspaceSelf(uid)` is a wrapper that calls `removeMember(null, uid)` — same atomic transaction (strip `userRoles[uid]`, remove from `members[]`, remove from `pendingApprovals[]`, unlink player doc).

**Firestore rules** — two carve-outs added:

`/workspaces/{slug}` allow update — fourth branch (self-leave envelope):
```
|| (
  request.auth != null
  && request.auth.uid in resource.data.members
  && !(request.auth.uid in request.resource.data.members)
  && request.resource.data.diff(resource.data).affectedKeys()
     .hasOnly(['members', 'userRoles', 'pendingApprovals'])
)
```

`/players/{pid}` allow update — fourth branch (self-unlink):
```
|| (
  request.auth != null
  && resource.data.linkedUid == request.auth.uid
  && request.resource.data.linkedUid == null
  && request.resource.data.diff(resource.data).affectedKeys()
     .hasOnly(['linkedUid', 'pbliIdFull', 'unlinkedAt'])
)
```

Both use the was-self / now-not-self invariant pattern (mirror of § 33.3 self-edit) to scope the action strictly to the caller's own row.

### 50.4 Członkowie detail page

New route `/settings/members/:uid` (`UserDetailPage.jsx`). `AdminGuard` wrapped. Sections:

1. **Identity** — avatar + display name + email. UID + joined timestamp in metadata rows.
2. **Linked profile** — current player (avatar + name + team + PBLI) OR "Brak połączonego profilu". Buttons: `Połącz z profilem` / `Zmień powiązanie` (open `LinkProfileModal`) + `Rozłącz` (confirm modal).
3. **Roles** — `RoleChips` deliberate edit (separate surface from MembersPage chip toggles). Same self-protect + last-admin disable rules as MembersPage.
4. **Danger zone** — `Usuń usera` (soft-disable, see § 50.5). Hidden when target is self. Disabled with reason when target is the only admin.

If target user has `disabled: true`, a banner renders at top with `Włącz ponownie` button.

Tap-into-detail wired from `MemberCard` — the avatar + identity area is now a clickable region (only for current-user-admin viewers; chips and ⋮ menu actions stay independent). A green dot next to the name indicates "has linked profile" — implements brief's "linked indicator" without a separate row.

**LinkProfileModal** (`src/components/settings/LinkProfileModal.jsx`):
- Search by nickname / name / PBLI
- Players already linked to a different uid surface but disabled with subtext `Już powiązany z innym userem: {email}` — admin sees the conflict before overwriting
- Selection → `ds.adminLinkPlayer(playerId, uid)` — atomic transaction:
  - Reads any other player currently linked to this uid + the target player doc
  - Clears `linkedUid` on previously-linked player(s) (if pointing at the same uid)
  - Sets `linkedUid + linkedAt` on target player
- `pbliIdFull` not fabricated — admin can request the user complete PBLI onboarding for full ID

Player linking writes use existing `isCoach(slug)` rule branch on `/players/{pid}` (admin satisfies via `isAdmin → isCoach` chain). **No rules change needed for link/unlink/change.**

**Coach/staff profile linking — N/A.** Today's data model has only `players` collection; no `coaches` / `staff` entities. Role IS the coach/staff identity (`role='coach'` user IS a coach). Modal handles player linking only. Documented as deferred at § 50.7.

### 50.5 Soft-delete user

`users/{uid}.disabled: boolean` field (with `disabledAt` + `disabledBy` audit trail) added. Admin clicks `Usuń usera` → confirm modal → `ds.softDisableUser(uid, byEmail)` writes the flag.

**Bootstrap check:** `AppRoutes` watches `userProfile?.disabled` (from existing live `onSnapshot` on `/users/{uid}`). When true, renders `DisabledAccountScreen` — full-page "Konto wyłączone" message + `Wyloguj się` CTA. User can re-authenticate against Firebase Auth (admin SDK not available client-side) but immediately bounces back to the disabled screen.

**Re-enable:** admin opens disabled user's detail page (banner + button visible) → `Włącz ponownie` → `ds.reEnableUser(uid)` writes `disabled: false + reEnabledAt`.

**Firestore rules** — `/users/{uid}` admin-update carve-out:
```
allow update: if request.auth.token.email == 'jacek@epicsports.pl'
              && request.resource.data.diff(resource.data).affectedKeys()
                 .hasOnly(['disabled', 'disabledAt', 'disabledBy', 'reEnabledAt']);
```

ADMIN_EMAILS allowlist used (single-admin reality today). Per-workspace admin check would require custom claims or workspace-membership iteration — deferred. Consequence: only Jacek can soft-disable today; transferring admin to a different user wouldn't grant them this capability without code change.

### 50.6 Coach/staff profile entities — not implemented

Brief speculated about linking users to coach/staff profiles. No such collections exist; role IS the identity. Modal copy reflects this — no "coming soon" stub for non-player linking.

### 50.7 Known follow-ups

- **Per-workspace admin check on `/users/{uid}` writes** — replace ADMIN_EMAILS allowlist with custom claim or workspace-membership-based check. Requires server.
- **Server-side Firebase Auth deletion** — true delete (revokes Auth credentials), not soft-disable. Requires Admin SDK + Cloud Function. Today's soft-disable is enforced only by client bootstrap; sufficient for invited-workspace model but not for hostile actors.
- **Coach/staff profile entities** — separate collections if Jacek wants linking semantics for non-player roles. Not planned.
- **Toast for legacy URL clicks** — if Jacek decides legacy URLs should be redirected (currently they remain reachable), add the redirect + toast pattern. Not planned.
- **DRY between MoreTabContent and TrainingMoreTab** — Scouting/Workspace/Account helpers are duplicated with `Training*` prefix. Extract to a shared `<SettingsCommonSections />` if a third surface needs them.

### Related

- Implementation: commits `36ff0b4` (settings menu reorg) + `e4b6c62` (legacy nav removal) + `84d4da4` (Členkowie full UX), merged 2026-04-23
- Brief: `CC_BRIEF_SETTINGS_REORG_NAV_CLEANUP.md` (pasted inline 2026-04-23)
- Updates / replaces: § 46 Settings IA (superseded), § 47 More tab structure (superseded by new section order)

## 51. Signup flow redesign — access-first + Variant 3 reactive moderation (approved 2026-04-24)

**Related:** § 27 Apple HIG, § 33.3 ProfilePage self-claim, § 38 Security roles, § 49 Unified auth (parts superseded here), § 50.4 Členkowie panel.

**Supersedes:** § 49.10 "auto-join, nie auto-login" migration philosophy. New users now auto-enter their `defaultWorkspace` on first session without typing a code. Admin workspace-switch path (password-gated `enterWorkspace(code)`) stays for non-default workspaces.

### 51.1 Problem statement

Pre-fix, the signup funnel had three sequential gates that blocked 100% of new users:
1. **Team-code gate (`LoginGate`)** — after email signup, user had to type a workspace code like `Ranger1996`. Permission denied ensued from either hash mismatch or a `userProfile`-load race; § 49's "auto-approve when slug matches default" branch never fired because the user hadn't loaded `userProfile` by the time they typed the code.
2. **Dot-notation bug** on the workspace write — `update['userRoles.' + uid] = ...` (i.e. bracket notation with dot-in-string key) with `setDoc(merge:true)` creates a literal top-level field named `userRoles.<uid>` (setDoc does NOT parse dot-notation; that's updateDoc-only). Firestore rules' self-join envelope `affectedKeys().hasOnly([...])` rejected the write.
3. **PBLeagues onboarding gate** — after the first two gates were resolved, `PbleaguesOnboardingPage` STILL blocked users via `parsePbliId` strict `NNNNN-NNNN` regex + dead-end "Nie znaleziono gracza" branch whose only action was Wyloguj się.

Any one of these three was sufficient to break adoption end-to-end. § 51 closes all three.

### 51.2 Decision — Variant 3 (access-first, reactive moderation)

Rationale (Jacek's call):
1. Adoption is the blocker. "If they can't use it, nobody uses it."
2. `ranger1996` is the only real workspace. Low risk of cross-workspace data leak.
3. Email auth already provides identity verification.
4. Admin has delete/soft-disable via Členkowie (§ 50.4, § 50.5).
5. Approval queue would replicate the same UX problem as the team code (blocks when admin absent).

Explicit rejection of alternatives:
- **Variant 1 — approval queue**: rejected (same blocker as team-code).
- **Variant 2 — invite-only**: rejected for current scale (no invitation infra).

### 51.3 Part 1 — Retire team-code gate

- `src/pages/LoginGate.jsx` DELETED (109 LOC).
- `App.jsx`: `if (!workspace) return <LoginGate .../>` branch replaced with `<Loading text="Preparing your workspace..." />` while the auto-enter effect fires + `<AutoEnterErrorScreen>` (with sign-out escape) for the error case.
- `enterWorkspace(code)` function **preserved** in `useWorkspace.jsx` for admin workspace-switch via Settings (still password-gated for NON-default workspaces).

### 51.4 Part 2 — `autoEnterDefaultWorkspace`

New internal action in `useWorkspace.jsx` (not exported). Drive effect fires once per auth session via `useRef(false)` re-entrancy flag once all of `user`, `userProfile`, `!loading`, `!workspace` are true.

Target slug resolution: `userProfile?.defaultWorkspace || DEFAULT_WORKSPACE_SLUG` (= `'ranger1996'`).

Legacy users without `defaultWorkspace` (pre-§ 49) fall back to the hardcoded constant. Single-workspace reality makes this safe; any wrong assignment is reversible via Členkowie delete.

Skips the password check — target is system-trusted (either the hardcoded constant or a server-side-only-written field). Write shape = existing self-join envelope (`members`, `userRoles`, `pendingApprovals`, `lastAccess`, `passwordHash`). **No rules change.**

Auto-approve branch fires when `slug === userProfile.defaultWorkspace` AND `userProfile.roles` is non-empty: mirrors roles into `workspace.userRoles[uid]` + skips `pendingApprovals`. Otherwise falls through to pending (matches `enterWorkspace`'s existing logic).

### 51.5 Part 3 — Dot-notation fix for setDoc(merge)

Codified constraint (also saved to agent memory so future CC agents don't re-create the bug):

> `setDoc(ref, { ... }, { merge: true })` does **NOT** parse dot-notation in keys. Setting `update['field.' + k] = v` (bracket notation with a dotted string key) creates a literal top-level field named `"field.<k>"`. Use a nested-map literal instead:
> ```js
> update.field = { [k]: value };
> ```
> `setDoc(merge)` recursively merges maps, so existing entries under `field` are preserved.

Contrast:
- `updateDoc(ref, {['field.' + k]: v})` — parses dot-notation. Safe.
- `tx.update(ref, {['field.' + k]: v})` inside `runTransaction` — same as updateDoc. Safe.
- `setDoc(ref, {['field.' + k]: v}, {merge: true})` — **creates literal dotted top-level key**. Breaks rules' `affectedKeys` allow-lists.

Fixed in both `autoEnterDefaultWorkspace` (§ 51.4) and the pre-existing `enterWorkspace` call path — both used the broken pattern; only the dot-notation write mattered for `enterWorkspace` because admins (ADMIN_EMAILS allowlist) and returning users (skip the `existingRoles === undefined` branch) never hit it pre-§ 51.

### 51.6 Part 4 — PBLeagues onboarding relaxation

`PbleaguesOnboardingPage.jsx` rewritten to reuse `LinkProfileModal` (shipped in `fa2f15c` for ProfilePage self-claim). Zero logic duplication.

- **4-priority PBLI cascade** in `src/utils/pbliMatching.js` (`matchPlayers(query, players)` single entry):
  - P1: exact `pbliId` after `normalizePbliInput` (strip `#`, whitespace, lowercase)
  - P2: exact `pbliIdFull`
  - P3: first-segment extract when input contains `-`
  - P4: substring (≥6 chars) on either field
  - Alpha input (no digits): substring on `nickname` / `name` (legacy browse behavior)
- **"Czy to ty?" confirmation gate** — always required before write, even on exact PBLI match. Prevents wrong-profile clicks from substring / P3 / multi-match scenarios.
- **"Pomiń na razie" skip fallback** — visible when query returns 0 candidates. Writes `users/{uid}.linkSkippedAt: serverTimestamp()` via `ds.skipLinkOnboarding(uid)`.
- **App.jsx gate update**: `if (!linkedPlayer && !userProfile?.linkSkippedAt)` — onboarding falls through on subsequent renders after skip.
- **Link write**: `ds.selfLinkPlayer(playerId, uid)` — consistent with ProfilePage. User is already a workspace member via auto-enter by this point, so `linkPbliPlayer`'s workspace-membership branch would be a no-op. `pbliIdFull` not written — admin can fill it in Členkowie.
- **Post-link migration**: `onPlayerLinked(uid, playerId)` (§ 52) moves any PPT drafts written in unlinked mode to the canonical player path. Best-effort; non-blocking for link success.

Legacy `parsePbliId` + `PBLI_ID_FULL_REGEX` + `linkPbliPlayer` are NOT deleted — kept for any future strict-format UX or downstream caller. No live UI imports them.

### 51.7 Part 5 — Členkowie panel Variant 3 audit surface

Small UX additions so admin can spot new joins in <30s:
- `useUserProfiles` returns `createdAt` alongside name/email/photoURL.
- `MembersPage` sorts active members by `createdAt` desc. Nulls last (legacy users predating the § 49 bootstrap field).
- Section header sub-count: green "(N nowych w tym tygodniu)" when any joiners are ≤7 days old.
- `MemberCard` renders small green "Nowy" badge for ≤7d joiners. § 27 compliant: **green**, not amber (amber reserved for interactive; the badge is purely informational).
- 7-day window is a fixed constant; adjust in-place if Jacek wants 30d or 24h.
- Delete capability unchanged — lives on `/settings/members/:uid` UserDetailPage per § 50.4.

### 51.8 Known follow-ups

- `pbliIdFull` not captured when auto-link flow succeeds on input that looks like a full form (e.g. `61114-8236`). Could teach `selfLinkPlayer` to accept an optional `pbliIdFull` field. Low priority; admin fills via Členkowie.
- `linkSkippedAt` is a one-way signal. No Členkowie UI to reset it per user — Firestore console workaround exists. Add admin reset if it becomes a real workflow.
- Stale `userRoles.<uid>` top-level fields on `workspaces/ranger1996` from pre-§51.5 failed writes may still exist. Harmless (rules don't read them) but pollute the doc shape. Console batch-delete when convenient.
- `useUserProfiles` fetches `createdAt` as a Firestore Timestamp. `MemberCard`'s NEW-badge check handles both `toMillis()` and `{seconds}` shapes; extend if new timestamp serializations enter the system.
- `subscribeAuth` → `getOrCreateUserProfile` → `onSnapshot` → `autoEnterDefaultWorkspace` chain takes ~200-600ms on slow networks. Users see a brief "Preparing your workspace..." loading screen — acceptable but could be optimized if telemetry shows high bounce.

### Related

- **Implementation:**
  - `c9d99eb` (retire team-code + auto-enter + Členkowie audit)
  - `c81dade` (setDoc(merge) dot-notation fix in autoEnter + enterWorkspace)
  - `2f8f971` (relax PBLeagues onboarding + `linkSkippedAt` + reuse LinkProfileModal)
  - `fa2f15c` carries the prerequisite `pbliMatching.js` + rewritten `LinkProfileModal`
- **Supersedes:** § 49.10 migration policy (the "auto-join, nie auto-login" part). New signups auto-enter on first session.
- **Brief references:** `CC_BRIEF_RETIRE_TEAM_CODE_AUTO_JOIN` (Parts 1-4; Part 4 added after initial ship revealed the PBLeagues gate as the second blocker).

---

## 52. PPT unlinked-mode — `pendingSelfReports` + migrate-on-link (approved 2026-04-24)

**Related:** § 48 PPT wizard/flow, § 51 signup flow redesign, § 33.3 ProfilePage self-claim, § 49.8 Path A.

### 52.1 Problem statement

§ 48 shipped PPT with a hard `!playerId` guard: `PlayerPerformanceTrackerPage` showed a dead-end "no player linked" empty state unless `useWorkspace().linkedPlayer` resolved to a doc. Post-§ 51, unlinked users land in the app immediately but can't open PPT — contradiction with § 51's "access-first" rationale.

### 52.2 Decision — dual-path storage + migrate-on-link

Unlinked users write to a new workspace-scoped collection; on link, their drafts migrate to the canonical player path. No data loss, no admin intervention.

### 52.3 Data model

**New collection:** `/workspaces/{slug}/pendingSelfReports/{auto-id}`

Schema (same as canonical `selfReport` + `uid` field for ownership):
```
{
  uid: string,                   // auth.uid of the writer
  createdAt: Timestamp,          // serverTimestamp() at write
  layoutId: string | null,
  trainingId: string | null,
  teamId: string | null,
  breakout: { side, bunker, variant },
  shots: Array<{side, bunker, order}> | null,
  outcome: 'alive' | 'elim_break' | 'elim_midgame',
  outcomeDetail: string | null,
  outcomeDetailText: string | null,
  matchupId: null,               // always null until migration
  pointNumber: null,
}
```

On migration, `uid` is stripped (the path's `pid` IS the owner on the canonical side). Other fields preserved verbatim including `createdAt`.

### 52.4 Firestore rules

```
match /workspaces/{slug}/pendingSelfReports/{sid} {
  allow create: if request.auth != null
                && isMember(slug)
                && request.resource.data.uid == request.auth.uid;
  allow read, update, delete: if request.auth != null
                              && isMember(slug)
                              && resource.data.uid == request.auth.uid;
}
```

- **Strict per-doc ownership.** Create gates on `request.resource.data.uid`; read/update/delete gate on `resource.data.uid`.
- **No coach visibility.** Drafts by definition; coach sees nothing until migration.
- **No collection-group entry.** `getLayoutShotFrequencies` queries `collectionGroup('selfReports')` — pending docs are outside that group. Intentional: pending shots don't contribute to crowdsource until migrated (trade-off vs. attack surface of anonymous unauthenticated docs polluting the layout heatmap).

Deployed via `firebase deploy --only firestore:rules` as part of `fa2f15c`.

### 52.5 Service surface (`playerPerformanceTrackerService.js`)

- `createPendingSelfReport(uid, payload)` — create in pending path; `uid` is added to the payload here.
- `getTodaysPendingSelfReports(uid)` — today's drafts owned by `uid`, ordered by createdAt desc.
- `migratePendingToPlayer(uid, playerId)` — batch move (chunks of 200; writeBatch per chunk with per-doc fallback on batch failure). Strips `uid` before writing canonical. Returns `{moved, failed}`.
- **`onPlayerLinked(uid, playerId)`** — terminal post-link helper. Called by ProfilePage `handleClaim`, PbleaguesOnboardingPage `handleSubmit`, and any admin link path. Does three things in order:
  1. Flushes local offline queue (uid namespace) directly to canonical player path via `createSelfReport(playerId, payload)`
  2. Runs `migratePendingToPlayer(uid, playerId)` for server-side pending docs
  3. Clears local uid queue via `clearPending(uid, 'uid')`
  4. Returns `{queueFlushed, queueRemaining, serverMoved, serverFailed}`. Non-blocking — caller logs but doesn't roll back the link on failure.

Existing `createSelfReport(playerId, payload)` signature unchanged. Existing linked users: zero behavior change.

### 52.6 Offline queue namespace split (`pptPendingQueue.js`)

`pptPendingQueue` functions gain `mode` param (`'player'` | `'uid'`), default `'player'` (preserves existing behavior).

- `'player'` mode → localStorage key `ppt_pending_saves_<playerId>`
- `'uid'` mode → localStorage key `ppt_pending_saves_uid_<uid>`

Separate namespaces prevent collision if a `uid` happens to share a prefix with a `playerId`.

`usePPTSyncPending(id, {mode})` branches `createFn` between `createSelfReport` and `createPendingSelfReport`.

### 52.7 Page / UI changes

- **Hard guard removed** in `PlayerPerformanceTrackerPage` (was `if (!playerId) return <empty/>`). New guard bails only when `scopeId` (`playerId || uid`) is missing — auth missing, which AuthGate catches upstream.
- **`usePPTIdentity`** returns `uid` alongside `playerId`. `teamTrainings` returns ALL workspace trainings when unlinked (no team affiliation yet). Linked users see their team/parent/sibling trainings as before.
- **`WizardShell`**: `handleSave` branches — `createSelfReport(playerId, payload)` when linked vs `createPendingSelfReport(uid, payload)` when unlinked. Offline queue uses matching `(id, mode)` pair.
- **`TodaysLogsList`**: reads from `getTodaysSelfReports(playerId)` when linked or `getTodaysPendingSelfReports(uid)` when unlinked.
- **Unlinked banner** (translucent-amber surface matching the existing offline-pending banner pattern): rendered on both Wizard + TodaysLogsList. Tap navigates to `/profile` to trigger self-claim.
- **Step 1 / Step 3 pickers UNCHANGED** — they already short-circuit to bootstrap mode when `playerId` is null (existing useEffect guard). Unlinked users see all bunkers; mature mode kicks in post-link after ≥5 player-history logs OR ≥20 layout crowdsource shots accumulate.

### 52.8 Migration semantics

- **Trigger.** Any successful self-link write. ProfilePage `handleClaim` and PbleaguesOnboardingPage `handleSubmit` both call `onPlayerLinked(uid, playerId).catch(warn)` after the link transaction resolves.
- **Failure isolation.** Per-doc migration failures don't abort the batch or roll back the link. The link is the user-visible win; failed docs stay in pending (admin can clean up manually or user can trigger another link attempt to retry).
- **Idempotency.** Re-running `onPlayerLinked` after a full migration is a no-op (no pending docs remain for the uid). Partial-migration retries only move the uncommitted remainder.
- **No Cloud Function** required for v1. Production-grade would be a Cloud Function trigger on `players/{pid}.linkedUid` change; deferred until cross-device link scenarios or partial-failure telemetry demands it.

### 52.9 Known limitations

- Pending drafts don't contribute to `getLayoutShotFrequencies` crowdsource until migrated. A new user who opens PPT unlinked will always see bootstrap mode (top 6 shots from all bunkers) until they link. Accepted trade-off per § 52.4 rule rationale.
- Migration is per-link, not per-doc retry. If `onPlayerLinked` fails partway, docs stay in pending. Acceptable at current scale; Cloud Function escalation path exists.
- Unlinked users see ALL workspace trainings in the picker (no team filter — they have no team). Acceptable for single-workspace reality; a "for me / any" toggle is cheap if the picker becomes noisy.
- `pbliIdFull` is lost on the new self-link path (uses `selfLinkPlayer`, which doesn't write it). Admin can fill via Členkowie. No downstream read relies on it today.

### Related

- **Implementation:** `fa2f15c` (merge) / `e94aafa` (commit). Rules + service + hook + UI all in one commit for atomicity — cross-file refactor.
- **Called by:** ProfilePage `handleClaim` (§ 33.3), PbleaguesOnboardingPage `handleSubmit` (§ 51.6), admin link via `LinkProfileModal` (§ 50.4).
- **Relies on:** existing `pbliMatching.js` (§ 51.6) for the input side of the link, and the `selfLinkPlayer` carve-out (§ 33.3) for the player-doc write.

---

## 53. Custom Squad Names + 5-squad limit (approved April 28, 2026)

### Context
Trenerzy zgłaszają potrzebę nazywania składów na treningu. Obecnie hardcoded
"R1/R2/R3/R4" (§32). Na obowiązkowych treningach (przed turniejem) używa się
real child team names (Ranger, Ring, Rage, Rush, Rebel — child teamy parent
teamu Ranger Warsaw). Na nieobowiązkowych mieszany skład — trener chce custom
nazwę. Ten paragraf rozszerza §32.

### 53.1 Default squad names

Nowe defaulty dla świeżo utworzonych treningów:

| Squad slot | Identity (color) | Default name |
|---|---|---|
| 1 | red `#ef4444` | Ranger |
| 2 | blue `#3b82f6` | Ring |
| 3 | green `#22c55e` | Rage |
| 4 | yellow `#eab308` | Rush |
| 5 | purple `#a855f7` | Rebel |

**Identity vs label rozróżnienie:** identity to color key (`red`/`blue`/`green`/`yellow`/`purple`),
nazwa to label only. Wszystkie istniejące referencje do `matchup.homeSquad: 'red'`
działają bez zmian — names są display layer, nic poniżej się nie zmienia.

### 53.2 Squad count limit

§32 mówi "2-4 squads". **Nowy limit: 2-5 squads.** +/− buttons w squad-count
control rosną do max 5.

5-squad layout (Step 2 Form squads): zachowanie stylu istniejącego (responsive
grid). Sugerowany layout: 2×3 grid z piątym squadem rozciągniętym na dole
przez 2 kolumny, lub 3×2 grid jak miejsce pozwala. CC dobiera proporcje pod
mobile-first.

### 53.3 Fifth color (purple)

Nowy color token w `theme.js`:
- `COLORS.squadColors.purple = '#a855f7'`
- Lub jako rozszerzenie istniejącej tablicy squad colors

**Wybór purple uzasadniony:**
- Visualnie odróżnialny od red/blue/green/yellow
- Nie konfliktuje z `COLORS.side.dorito` (orange `#fb923c`) ani `COLORS.side.snake` (cyan `#22d3ee`) z §34 — zachowuje color discipline §27
- Nie jest amber (interactive accent, §27)

### 53.4 Rename UX

**Trigger:** tap squad header (na TrainingSquadsPage, w zone header). Cały header
jest tappable (44px+).

**Affordance:** ✎ pencil icon (Lucide `<Pencil size={12} />`) obok nazwy w header
+ subtle underline na nazwie. Bez czerwonej kropki / pulsowania.

**Modal (NIE ActionSheet):**
- Tytuł: "Zmień nazwę składu" (PL) / "Rename squad" (EN)
- Body: `<Input>` z aktualną nazwą jako placeholder + initial value
- Maksymalna długość: **16 znaków** (mieści "Ranger Warsaw" = 13, "Mixed Squad" = 11)
- Trim whitespace przed save
- Buttons: "Anuluj" (ghost) / "Zapisz" (accent)
- Pusty input = revert do default (Ranger/Ring/Rage/Rush/Rebel zależnie od slotu)

**Brak walidacji uniqueness:** trener może mieć dwa squady "Mixed" jeśli chce.
Identity (color key) jest unikalne, nazwy są label only.

### 53.5 Persistence

Per-training, w Firestore. Dodaje field do training document (rozszerza model z §32):

```javascript
/workspaces/{slug}/trainings/{tid}
{
  // ... existing §32 fields ...
  squadNames: {
    red: 'Ranger',
    blue: 'Ring',
    green: 'Rage',
    yellow: 'Rush',
    purple: 'Rebel',  // tylko gdy 5 squadów
  },
}
```

**Brak persistence na poziomie team.** Każdy nowy trening startuje od defaultów
(Ranger/Ring/Rage/Rush[/Rebel]). Trener override per-training.

**Brak migracji starych treningów.** Trening utworzony przed tym feature **nie ma**
field `squadNames`. Render fallback (§53.6).

### 53.6 Backward compatibility — stare treningi

Per Jacek (2026-04-28): stare treningi zostawiamy jak są.

**Render logic:**

```js
function getSquadName(training, squadKey) {
  // New training: squadNames written on creation
  if (training.squadNames?.[squadKey]) {
    return training.squadNames[squadKey];
  }
  
  // Old training (no squadNames field): legacy R1-R4 labels
  const legacyLabels = { red: 'R1', blue: 'R2', green: 'R3', yellow: 'R4', purple: 'R5' };
  return legacyLabels[squadKey];
}
```

**Edge case:** trener otwiera stary trening (squadNames === undefined) i wchodzi
w rename. Po pierwszym save → `squadNames` field zostaje zapisany do Firestore
z wartością wpisaną przez trenera + defaultami dla pozostałych slotów. Od tej
chwili trening "ma" squadNames i nie korzysta z legacy fallback.

### 53.7 Where rename trigger appears

- ✅ **TrainingSquadsPage** (Step 2) — primary location, zone headers
- ✅ **TrainingPage** (Step 3) — matchup cards header (np. "Ranger (5) vs Ring (5)")
  i context bar — tap squad name = ten sam Modal rename, propaguje do wszystkich
  miejsc po save (Firestore live update)
- ❌ **TrainingResultsPage** (Step 4) — read-only, nie trigger
- ❌ **TournamentPicker** — nie pokazuje squad names (tylko training name)

### 53.8 i18n

Modal copy w obu językach (`utils/i18n.js`):
- `rename_squad_title` — "Zmień nazwę składu" / "Rename squad"
- `rename_squad_placeholder` — "Wpisz nazwę..." / "Enter name..."
- `rename_squad_save` — "Zapisz" / "Save"
- `rename_squad_cancel` — "Anuluj" / "Cancel"
- `rename_squad_max_length_hint` — "Max 16 znaków" / "Max 16 characters"

Default names (Ranger/Ring/Rage/Rush/Rebel) NIE są tłumaczone — to brand names.

### 53.9 §27 compliance checklist (referenced for CC review)

- ✅ Touch target on rename trigger ≥ 44px (whole zone header tappable)
- ✅ Color discipline: purple `#a855f7` jest categorical encoding (squad identity), nie quality metric
- ✅ Pencil icon `#475569` (textMuted, nie amber) — NIE jest interactive accent samo w sobie, header tap = action
- ✅ Modal pattern (nie ActionSheet) — input field z save/cancel = standard rename UX
- ✅ Backward compat: legacy R1-R4 treningi zachowują wygląd

### Note on numbering

Originally drafted by Jacek as "## 38" but § 38 was already taken (Security
Role System + View Switcher, approved 2026-04-17). Renumbered to § 53 (next
available after § 52) on commit; all internal `§38.X` cross-references in
this section auto-translated to `§53.X`. External references in chat or
elsewhere should target § 53 going forward.

---

## 54. Death Reason Taxonomy — canonical dictionary (approved April 28, 2026)

### Context

Pre-existing implementations had divergent labels for "how was player eliminated" across player self-log wizard and coach live tracking popup. Per Jacek (2026-04-28): **one canonical dictionary** must be used everywhere "death reason / cause of leaving the field" is captured. This paragraph defines that dictionary.

### 54.1 Canonical taxonomy

Storage key + UI labels (single source of truth for both coach + player):

|Storage key      |PL UI label    |EN UI label |Definition                                                                                                                 |
|-----------------|---------------|------------|---------------------------------------------------------------------------------------------------------------------------|
|`gunfight`       |Gunfight       |Gunfight    |Wymiana ognia na przeszkodzie (sustained exchange while behind cover)                                                      |
|`przejscie`      |Przejście      |Crossing    |Trafiony podczas zmiany przeszkód (hit while moving between bunkers)                                                       |
|`faja`           |Faja           |Outflanked  |Przeciwnik mnie zabiegł (opponent flanked / outmaneuvered me)                                                              |
|`na_przeszkodzie`|Na przeszkodzie|On bunker   |Bounce, blind shot, hit on the bunker — multiple sub-causes captured under one label                                       |
|`za_kare`        |za Karę        |Penalty kill|**Inny** gracz dostał karę i ja zostałem wyeliminowany przez sędziego (referee elimination triggered by teammate's penalty)|
|`nie_wiem`       |Nie wiem       |Don't know  |Nie zauważyłem skąd (didn't see where the hit came from)                                                                   |
|`inaczej`        |Inaczej        |Other       |Free text custom — captured in adjacent `deathReasonText` field                                                            |

### 54.2 Why "za_kare" and "na_przeszkodzie" are distinct

Common confusion (which Jacek explicitly disambiguated 2026-04-28):

- **`za_kare`** = referee removes player X **because of teammate Y's penalty** (e.g. major penalty from coach → 1-for-1 pull). This is NOT player-skill related.
- **`na_przeszkodzie`** = paint hit landed on the bunker (bounce, blind shot from unknown angle, glanced off corner). Player-skill / opponent-skill related, geometrically interesting.

These must NOT be merged. Different downstream analytics (`za_kare` excluded from "how did opponent eliminate" stats; `na_przeszkodzie` is a coaching signal about positioning/angles).

### 54.3 Reason vs stage — two-axis model

Death reason (this dictionary) is **orthogonal** to elimination stage. Both must be captured for complete data.

**Stage** (when):

- `alive` — survived the point ("Grałem do końca" / "Played to the end")
- `break` — eliminated within first ~5 seconds ("Dostałem na brejku" / "Hit on break")
- `inplay` — eliminated mid-point ("Dostałem w grze" / "Hit in play")
- `endgame` — eliminated in the closeout / 50-50 phase ("Dostałem na końcówce" / "Hit at endgame")

**Reason** (how) — only captured when stage ∈ {`break`, `inplay`, `endgame`}. When stage = `alive`, reason field is null.

This matches the existing player wizard behavior (Krok 3 "Jak spadłeś?" — selects stage; Krok 4 "Jak Cię trafili?" — selects reason, conditionally rendered). The pre-existing `HotSheet` Tier 1 hot-log uses storage value `elim_end` for the endgame stage; legacy reads normalize `elim_end` → `endgame`, `elim_mid`/`elim_midgame` → `inplay`, `elim_break` → `break` (no batch migration per § 54.5 "no automatic <5s = break mapping" — same principle: legacy stays, normalize on read).

**Stage axis amendment (2026-04-29):** original spec drafted 3 stages (alive/break/inplay). Jacek expanded to 4 with `endgame` to preserve fidelity with existing HotSheet's `elim_end` outcome — collapsing 4 → 3 would erase paintball-coaching-relevant signal (closeout / 50-50 dynamics differ from mid-game elim). Brief A implementation uses 4-stage axis from the start.

### 54.3.1 Reason cascade window — break is its own reason (amendment 2026-04-29 hotfix #5)

Earlier amendment (immediately above) widened reason capture window to all 3 elim stages {break, inplay, endgame}. Hotfix #5 narrows back: **reason cascade fires for `elim_midgame` and `elim_endgame` only.** `elim_break` is its own categorical reason — the moment of being hit on break IS the categorical signal; finer "how were you hit" reason adds no actionable value at break-timing where everyone is moving fast through transitions.

**Player wizard surfaces (PPT route + KIOSK lobby):** Step 4 outcome tap routes:

- `alive` → Step 5 (no reason captured)
- `elim_break` → Step 5 (no reason captured — break IS the reason)
- `elim_midgame` → Step 4b → Step 5 (reason cascade)
- `elim_endgame` → Step 4b → Step 5 (reason cascade)

Storage: `selfLog.deathReason = null` for both alive and elim_break. Aggregations distinguish via `deathStage`.

**Coach Live Tracking surface (LivePointTracker per § 54.4) — UNCHANGED.** Coach 2-step picker still asks stage then reason for any elim, including break. Rationale: coach is observing, not self-reporting; coach often has reason intel on break elims (e.g. "saw the gunfight from snake 1 to snake 50") that a player on break wouldn't categorize. Coach-side reason for break stage is opt-in via "Pomiń" (still optional), so coach who has no insight skips and saves stage-only.

**Resulting taxonomy asymmetry:** intentional. Player surfaces capture {stage, reason?} where reason ≡ null for break. Coach surface captures {stage, reason?} where reason CAN be set for break if coach has it. Read code (analytics, KIOSK prefill resolver per § 55.4 Source D) treats `deathReason: null` as "unknown" regardless of source — no special-case for break.

**Anti-pattern carve-out:** § 54.7 forbids "different label text for the same canonical key in different screens". This amendment is NOT that — same canonical KEYS (deathStage values, deathReason values) are used everywhere. Only the cascade routing differs between player and coach surfaces. Same data shape on save, different UX flow.

### 54.4 Coach UI alignment (CHANGE — CC implementation required)

**Current coach UI (Image 5-6 from screenshots 2026-04-28 batch B):** popup "JAK SPADŁ?" mixes stage + reason in one flat list (Break / Gunfight / Przebieg / Faja / za Karę / Nie wiadomo).

**Required change (per Jacek 2026-04-28):** coach popup MUST mirror player wizard structure — first ask **stage**, then if eliminated also ask **reason**.

```
TRAFIONY tap on coach live tracking
    ↓
Step 1 popup: "Jak spadł?"
  • Grałem do końca (alive — but if coach tapped TRAFIONY this won't appear)
  • Dostałem na brejku (break)
  • Dostałem w grze (inplay)
    ↓ (only if stage ∈ {break, inplay})
Step 2 popup: "Jak go trafili?"
  • Gunfight / Przejście / Faja / Na przeszkodzie / za Karę / Nie wiem / Inaczej
    ↓
Save → return to live tracking
```

If coach skips reason ("Pomiń" / dismiss) — `deathReason: null`, `deathStage: 'break'|'inplay'` saved. Player can fill reason later in Tier 2 cold review or in KIOSK handoff (see KIOSK Player Verification section).

### 54.5 Data schema additions

Extend existing point/elimination schema:

```javascript
// Per-player elimination data (point.eliminations[playerId] or shots subcollection)
{
  eliminated: true,                        // boolean (existing)
  deathStage: 'alive'|'break'|'inplay',    // canonical (was implicit)
  deathReason: 'gunfight'|'przejscie'|...|null,  // canonical (NEW)
  deathReasonText: string|null,            // free text when deathReason='inaczej'
  eliminationTime: number|null,            // seconds from buzzer (existing in coach live tracking)
  filledBy: 'coach'|'self',                // who filled this record (existing pattern: scoutedBy)
  filledAt: timestamp,
}
```

`deathStage` may be derived in legacy data from `eliminated` + `eliminationTime` if missing — **but no automatic <5s = break mapping** (per Jacek 2026-04-28: "to założenie <5s jest umowne, nie mapujmy"). Legacy points without explicit stage stay `null` until edited.

### 54.6 i18n keys (add to existing PL+EN dictionaries)

```javascript
// Stage labels (already exist in player wizard, formalize keys)
death_stage_alive: 'Grałem do końca' / 'Played to the end',
death_stage_break: 'Dostałem na brejku' / 'Hit on break',
death_stage_inplay: 'Dostałem w grze' / 'Hit in play',
death_stage_endgame: 'Dostałem na końcówce' / 'Hit at endgame',

// Reason labels (canonical, used coach + player + Tier 2 review)
death_reason_gunfight: 'Gunfight' / 'Gunfight',
death_reason_przejscie: 'Przejście' / 'Crossing',
death_reason_faja: 'Faja' / 'Outflanked',
death_reason_na_przeszkodzie: 'Na przeszkodzie' / 'On bunker',
death_reason_za_kare: 'za Karę' / 'Penalty kill',
death_reason_nie_wiem: 'Nie wiem' / "Don't know",
death_reason_inaczej: 'Inaczej' / 'Other',

// Section labels
death_section_stage_q: 'Jak spadłeś?' / 'How did you fall?',
death_section_reason_q: 'Jak Cię trafili?' / 'How were you hit?',
death_section_stage_coach_q: 'Jak spadł?' / 'How did they fall?',
death_section_reason_coach_q: 'Jak go trafili?' / 'How were they hit?',
```

### 54.7 Anti-patterns

- ❌ Adding new reason variants without updating this canonical table first
- ❌ Auto-mapping `eliminationTime < 5s → deathStage='break'` (legacy migration prohibited)
- ❌ Merging `za_kare` and `na_przeszkodzie` "because they're both not gunfight" (semantically distinct)
- ❌ Coach UI showing reason without first capturing stage (must follow the coach UI alignment rule flow)
- ❌ Different label text for the same canonical key in different screens (e.g. coach saying "Przebieg" while player says "Przejście" for `przejscie` key — pick one PL label, use everywhere)

### Note on numbering

Originally drafted by Jacek as "## NN." placeholder + internal `§39.X` cross-refs (Opus authored CC_BRIEF_KIOSK_A_TAXONOMY against this number). § 39 was already taken by "Scout score sheet — role-gated match summary" (approved 2026-04-21), so renumbered to § 54 (next available after § 53) on commit. All internal `§39.X` cross-references in this section auto-translated to `§54.X`. CC_BRIEF_KIOSK_A_TAXONOMY references "§ 39" throughout — interpret as **§ 54** when implementing. Future briefs (KIOSK B/C) likely contain similar references; CC will translate at implementation time.

---

## 55. KIOSK Player Verification mode (approved April 28, 2026)

### Context
Coaches train + play simultaneously and don't have a dedicated scout per session. After a point ends, the coach hands the tablet to the team — each player taps their profile and verifies/fills their own data (breakout, shots, death reason). This paragraph defines the **handoff mode** for player self-log on a shared device.

KIOSK reuses everything that exists today (wizard from §35, coach quick log + live tracking from §32, scouting from §11, taxonomy from § 54 above). It only adds: **identity override**, **post-save auto-transition to lobby**, and **prefill resolver** that pulls coach-set values into wizard prefilled state.

### 55.1 Activation — Option C (post-save prompt, per-point)

After coach saves a point in Quick Log or Match Page (Save point CTA), system asks **once per point**:

```
Toast/banner: "Punkt zapisany. Pokazać lobby graczom?"
[ Nie ]   [ Tak — przekaż tablet ]
```

- **Tak** → transition to KIOSK Lobby for the point just saved
- **Nie** → return to normal coach view (Quick Log, MatchPage, etc.) — players can still self-log via FAB on their own phones (Tier 1 §35) or come back later via "Wcześniejsze punkty" link in lobby

No global "KIOSK mode" toggle in Settings. No persistent state. Each point is its own decision.

**Why post-save prompt vs persistent toggle:** coach may want to skip handoff during fast points and only enable it on important ones (e.g. final point of training). Decision happens at the moment it matters — when coach has tablet in hand and decides whether to walk over to team.

### 55.2 Lobby UI

Triggered by "Tak" in § 55.1, or via a separate "Lobby graczy" entry from training/match menu (post-point review).

**Filter — kluczowa zasada:** lobby pokazuje **tylko graczy którzy zagrali ten konkretny punkt**, nie cały squad. Lista graczy jest:

- Tournament: `point.homeData.players[]` (lub `awayData.players[]`) — slot indices z assignments
- Training: identycznie — `point.homeData.players[]` lub `awayData.players[]` z subkolekcji matchupu

Squad może mieć 7 graczy w trainingu, ale w danym punkcie zagrało 5 — lobby pokazuje 5. Coach jest źródłem prawdy poprzez Quick Log assignments. Jeśli coach pomylił się i nie wybrał kogoś kto faktycznie grał — gracz nie zobaczy siebie w lobby → coach musi wrócić, edytować punkt (z post-save summary § 55.1), dodać go.

**Layout (landscape, gloves-friendly):**

```
┌──────────────────────────────────────────────────────────────┐
│  ‹ Punkt #5 — kliknij swoje imię                    2/5 ✓   │
│   5 graczy R1 zagrało · uzupełnij swoje dane                 │
├──────────────────────────────────────────────────────────────┤
│  [tile 1]  [tile 2]  [tile 3]  [tile 4]  [tile 5]            │
│   Eryk      Jakub     Krzysztof  Konrad     Kamil             │
│   "Czacha"  "Jakubek" "Klaks"   "Koe"      "Karmelek"        │
│   #68 ✓     #05 ⚡     #9         #66 ✓     #333              │
├──────────────────────────────────────────────────────────────┤
│  Wcześniejsze punkty do uzupełnienia                  3 ▾   │
└──────────────────────────────────────────────────────────────┘
```

**Player tile — 5-row identity layout (44×44+ touch target, target ~200×220px landscape):**

Każdy kafelek dzieli się na dwie strefy: **photo zone (45% wysokości)** + **info zone (55% wysokości)**. Info zone zawiera 5 wierszy informacji od góry do dołu, plus pasek statusu na samym dole:

1. **Imię** — 11px, weight 500, `COLORS.textMuted` (#8b95a5)
2. **Nazwisko** — 11px, weight 500, `COLORS.textMuted`
3. **Ksywka** w cudzysłowach (`"Klaks"`) — 16px, weight 700, `COLORS.text` (primary). **Dominanta wizualna** — gracz najszybciej rozpoznaje swoją ksywkę
4. **Numer koszulki** (`#9`) — 14px, weight 600, `COLORS.textDim`
5. **Status bar** — 6px wysokości, kolor komunikuje stan (zob. niżej)

**Wiersze 1-2 są opcjonalne** — jeśli player document nie ma `firstName`/`lastName`, kafelek pokazuje tylko ksywkę + numer + status bar (4 wiersze info).

**Status bar — Apple HIG affordance (zamiast tekstu "Tap →"):**

Stan logowania komunikowany przez **kolor i animację paska 6px na dole kafelka**, nie przez tekst. Zgodne z § 27 (Apple HIG: visual properties komunikują stan, nie tekstowe etykiety).

| Stan | Kolor paska | Dodatkowo |
|------|-------------|-----------|
| **Czeka** | `COLORS.border` (#1a2234), statyczny | brak |
| **Sugerowany** | `rgba(245,158,11,0.3)` z amber shimmer animation | border kafelka 2px amber + glow |
| **Zalogowane** | `COLORS.success` (#22c55e), solid | ✓ overlay (30px, top-right corner), border kafelka 2px green, ksywka kolorem `COLORS.success`, tło kafelka `rgba(34,197,94,0.04)` |

"Sugerowany" stan opcjonalny — może być zarezerwowany dla future enhancement (np. system zauważa że Jakubek był ostatnio scoutowany, sugeruje go jako pierwszego). MVP może obejść się bez tego.

**Squad label** — overlay w lewym górnym rogu, 10px white text, 4px padding, `rgba(0,0,0,0.4)` background. Tekst = nazwa squadu (np. "RANGER", "RING") z § 53.1.

**Section headers per squad:** w trainingu z dwoma squadami (R1 + R3), tablet pokazuje **tylko jeden squad** (ten który coach scoutował). Brak section headers w MVP — całe lobby to jeden grid 5×1 albo 5×2 jeśli więcej niż 5 graczy zagrało (rare).

**Wcześniejsze punkty:** zwinięty rząd na dole z liczbą punktów wymagających uzupełnienia. Tap → expand do listy poprzednich punktów. Logika identyczna jak w bieżącym § 55.6.

**Tap player → wizard:** identycznie jak w § 55.3, bez zmian.

### 55.3 Tap player → wizard with prefill

Tap on a player tile:

1. **Identity override**: `kioskActivePlayerId` ref in `useSelfLogIdentity()` is set to that player's ID. Hook returns this ID instead of the email-matched user.
2. **Wizard opens** (existing 4-5 step wizard from §35) with point ID = current lobby point.
3. **Prefill resolver** runs (see §55.4) — populates wizard fields from coach-set data.
4. Player taps through wizard, accepts/edits prefilled values, taps "Zapisz punkt" on Krok 4/5.
5. Save → identity override **clears** → wizard closes → **return to lobby** (NOT to "Twoje dzisiejsze punkty" — that's the per-player flow, not KIOSK).
6. Lobby refreshes via Firestore live snapshot — ✓ appears on the player who just saved.

**Concurrency:** if two tablets are running KIOSK on the same point (multi-tablet, per §42-44 per-coach streams), each player's save writes to their own slot in unified `shots` collection (`source: 'self'`, `playerId`). Live snapshot updates both tablets — ✓ status converges. No merge logic needed beyond what already works in §35.4.

### 55.4 Prefill resolver — three coach setup sources

Prefill priority (highest data-richness wins). Resolver runs at wizard open, snapshots values into wizard local state. Player can override anything by tapping the row.

**Source A — Scouting-style coach setup** (§11 scouting on this point):

- `point.homeData.players[i]` or `point.awayData.players[i]` — exact bunker positions per slot
- `point.homeData.shots[i]` — shot lists per slot
- Mapping: player → slot via existing scouting assignments (§11.4 — coach assigns at match time)
- **Prefills:** Krok 1 (bunker = nearest bunker label to position), Krok 2 (way = derived if available, otherwise unprefilled), Krok 3 shots = list from scouting

**Source B — Drawing on layout (sposób 1)** (per Jacek 2026-04-28 — separate brief, not part of this rollout):

- Format TBD — pencil drawing on layout image
- When implemented: prefills Krok 1 (bunker per player) similar to Source A but typically without shots
- KIOSK code path will read `point.coachDrawing` (or whatever schema lands) and use as fallback when Source A absent

**Source C — Quick log + zone** (§32 quick log, "GDZIE STARTOWAŁ KAŻDY ZAWODNIK" Image 3 from batch B):

- `point.homeData.zones[playerId]` — Dorito / Centrum / Snake per player
- **Prefills:** Krok 1 picker filtered to top 6 bunkers **on that side** (instead of layout-wide top 6). Player still chooses, but shorter list.
- Does NOT prefill specific bunker (zone is too coarse).

**Source D — Coach live tracking elimination** (§54.4 Coach UI alignment):

- `point.eliminations[playerId].deathStage` and `.deathReason` (if filled by coach)
- **Prefills:** Krok 3 stage (Grałem do końca / na brejku / w grze — the 3 main per Jacek's "Prefilluje kwestie - grałem do końca, dostałem na brejku, dostałem inaczej - tylko 3 główne"), and Krok 4 reason if coach chose one

**Combination rules:**

- Sources stack — Source A or B fills bunker, Source C narrows picker, Source D fills stage/reason
- Player override on any field clears prefill mark for that field; other prefilled fields stay
- If coach set NOTHING for this player — wizard opens vanilla (like normal Tier 1 from §35)

### 55.5 Prefill UI annotation

Prefilled fields show subtle visual hint (NOT loud "FROM COACH" badge — Jacek values clean UI per §27):

- Krok 1 bunker tile: **outlined** (instead of fully selected) — taps once to confirm OR tap another to override. Top hint text: "Ustawione przez coacha — potwierdź lub zmień".
- Krok 2 way: pre-highlighted card with thin amber border, no badge.
- Krok 3 stage: pre-highlighted card with thin amber border.
- Krok 4 reason: pre-highlighted card with thin amber border.
- Krok 4 review screen: prefilled rows shown in normal text (no special styling) — review treats prefilled and player-entered as equivalent.

If player taps prefilled tile → it becomes "selected" (full amber). If they tap a different tile → original prefill is overridden, new selection is recorded as `filledBy: 'self'`.

### 55.6 "Wcześniejsze punkty" section

Per Jacek (2026-04-28): lobby shows current point only, with collapsed section underneath for previous points where this player still has missing data.

**Logic:**

- Section is **per-player after they tap their tile** in lobby — i.e. once player identifies themselves (by tapping Eryk), the lobby may switch to a "Eryk's view" where Wcześniejsze shows Eryk's incomplete points
- OR remain in main lobby and show points where ANY player has incomplete data (less personal, more global oversight)

**Decision (matches Jacek's text "pokazuje lobby dla danego punktu i stamtąd gracz może uzupełnić swoje dane"):**

Lobby is for current point. The "Wcześniejsze" link expands to a **filterable list of past points**, where rows show points where at least one player on the tablet's session has missing data. Tap a past point → that point becomes the "active lobby point" temporarily → tap player → wizard for that older point. Save → return to current point lobby.

Visual: collapsed section (1 line: "Wcześniejsze punkty (3) ▾"). Expand → list rows showing point #, scoreline, count of incomplete fills. Tap → switches lobby context to that point.

### 55.7 Lifecycle

- Lobby is **ephemeral** — no persistent "KIOSK session" state in Firestore. Closing/reopening the app re-enters via §55.1 if user is at coach view post-save.
- Lobby auto-closes when coach taps "Next point" (next Quick Log empty state) — players who didn't fill yet retain incomplete data, can fill later via Tier 2 cold review (§35.1) on their own phones.
- No "kick off lobby" button — coach simply navigates back via app navigation (back chevron, switch tab, etc.).

### 55.8 Multi-tablet support (per-tablet niezależność)

**Realny scenariusz:** dwóch coachów, dwa tablety, dwa pity po przeciwnych stronach pola. Coach Tymek na Tablet #1 scoutuje R1 (Ranger). Coach Sławek na Tablet #2 scoutuje R3 (Ring).

**Każdy tablet pokazuje swoje lobby z własnymi graczami:**

- Tablet #1 (Tymek, R1) → lobby = 5 graczy z `homeData.players[]` punktu
- Tablet #2 (Sławek, R3) → lobby = 5 graczy z `awayData.players[]` punktu

**Drugi coach jest niewidoczny w UI.** Każdy coach pracuje niezależnie. Żaden tablet nie pokazuje statusu drugiego coacha ("Sławek wpisał 3/5"). Żaden tablet nie blokuje czekając na drugi.

**Self-logs zapisują się do unified shots collection** per § 35.4 — `points/{pid}/shots/{sid}` z `playerId` + `source: 'self'`. PlayerId rozróżnia która strona (R1 player vs R3 player). Read-time merge agreguje shots z obu stron — bez dodatkowego kodu.

**Synchronizacja punktu:** dziś **ograniczona** — KIOSK używa bieżącej infrastruktury (§ 18 dla turnieju, training adapter dla treningu). Training adapter explicite skipuje claim logic (`if (!isTraining)` guard w MatchPage), więc dwa tablety w trainingu **nie synchronizują claim systemem**. W praktyce oznacza to:

- Tymek tworzy punkt p5 lokalnie (Quick Log Save) → `homeData` wypełniony, `awayData` pusty
- Sławek tworzy punkt p5 niezależnie na swoim tablecie → może to być **inny dokument** z innym `pointId` jeśli nie ma sieci lub timing się rozjedzie
- Konsekwencja: dwa "punkty 5" w Firestore, każdy z połową danych

**Mitygacja MVP — coachowie się umawiają:** w trainingu z dwoma tabletami coachowie ustalają przed-treningowo jeden tablet jako "main" (tworzy punkty), drugi jako "secondary" (dolewa). Tablet secondary widzi punkty utworzone przez main (Firestore live snapshot) i otwiera Quick Log na istniejącym punkcie zamiast tworzyć nowy. Workaround manualny, ale działa.

**Edge case: brak sieci** — jeśli tablet secondary jest offline gdy main tworzy punkt, secondary stworzy duplikat. Po sync → dwa punkty p5. Coach manualnie czyści w post-training review (delete duplicate). KIOSK nie ma dziś auto-merge.

**Przyszłość:** pełny offline-first multi-tablet sync wymaga refactora data modelu (zob. § 55.11). Nie jest scope KIOSK MVP.

**Wynik dla użytkownika:** KIOSK działa świetnie dla:

- Single tablet, single coach (Tymek scoutuje całe matchupy solo) — 100% smooth
- Multi tablet z koordynacją coachów (jeden main, drugi secondary) — działa, wymaga awareness
- Multi tablet w pełnej niezależności (dwóch coachów, brak koordynacji) — może produkować duplikaty, manual cleanup post-training

### 55.9 §27 compliance checklist

- ✅ Touch targets: player tiles ≥ 44px, wizard tiles unchanged (already compliant)
- ✅ Color discipline: prefill annotation = thin amber border on tile (interactive accent for "tap to confirm"). Squad section dots = categorical encoding (§53.1 colors), not quality
- ✅ Elevation: lobby on `#080c14` page bg, tiles on `#0f172a` surface, completed tiles on `rgba(34,197,94,0.04)` tint
- ✅ Typography: nicknames 13px/600, status sub-labels 10px/500, section headers 15px/600
- ✅ Anti-patterns: zero "FROM COACH" badge clutter, prefill is subtle border only

### 55.10 Out of scope (separate briefs)

- Sposób 1 (drawing on layout + pencil) source — Jacek will provide screens later
- Tier 2 cold review enhancements (PlayerStatsPage "Mój dzień") — already in HANDOVER #3
- Coach Live Tracking redesign to match §54.4 stage→reason flow — ✅ DONE in Brief A (`ef94637`, 2026-04-29). Source D prefill is now possible since coach can capture canonical `deathStage` + `deathReason` per player.
- Persistent "tablet mode" UX (lock app to KIOSK, prevent navigation away) — not requested, current flow allows free navigation

### 55.11 Future architecture — offline-first point fragments (BACKLOG, not KIOSK scope)

**Status:** decyzja długoterminowa. **NIE jest scope KIOSK MVP.** Zapisana tutaj żeby nie zgubić — implementacja kiedyś, nie w tej iteracji.

**Problem:** dziś `points/{pid}` jest jednym dokumentem z `homeData` + `awayData`. Multi-tablet sync wymaga koordynacji online (Firestore live snapshot + claim system). W trainingu z dwoma coachami offline lub przy słabej sieci → ryzyko duplikatów / data loss.

**Idealna docelowa architektura:**

- Każdy Save tworzy **immutable fragment** w nowej kolekcji `pointFragments/{fid}` z `createdAt`, `createdBy`, `side`, `data`, `localPointNumber`
- `pointSlots/{sid}` to logiczna pozycja w sekwencji punktów, z referencjami do fragmentów (`homeFragmentId`, `awayFragmentId`)
- Reconciler engine (client-side, deterministyczny) auto-matchuje fragments w pary po `pointNumber` + time proximity (60s window)
- "Punkty do pogodzenia" view dla manual override gdy auto-match się rozjedzie
- Save **zawsze działa**, niezależnie od stanu sieci. Łączenie odbywa się leniwie, post-hoc.
- Self-logs zapisują się do `pointFragments/{fid}/shots/{sid}` — fragment jest "world" dla self-logu

**Korzyści:**

- True offline-first — Save działa bez sieci, nigdy nie blokuje
- Brak race conditions / overwrites — fragments są immutable
- Bulletproof multi-tablet — każdy coach pisze niezależnie, system łączy
- Backward compatible — stare punkty (jeden dokument) zostają jako-są, nowy model tylko dla nowych

**Koszty:**

- Migration data model (3 collections zamiast 1)
- Reconciler engine + UI ("Punkty do pogodzenia")
- Update queries dla statystyk (read przez slot view)
- ~5-7 dni roboty CC dla implementation + testing

**Trigger refactora:** kiedy multi-tablet KIOSK użycie staje się standardem treningu (≥30% sesji), albo gdy edge case'y z duplikatami punktów stają się uciążliwe (≥5 cleanup operacji per trening).

**Tournament tez?** Nie automatycznie. Tournament zachowuje § 18 chess model dot-notation writes (działa, wifi w hali turniejowej zwykle stabilne, racing rzadkie). Decyzja o unifikacji odrębna.

**Reference dla future implementation:** dyskusja w chat'cie 2026-04-29 (Opus session: "Architektura: offline-first, fault-tolerant point sync"). Konkretny design zaproponowany ale nie zaimplementowany.

**Co dziś zostawiamy nietkniętego dla KIOSK MVP:**

- § 18 Concurrent Scouting (tournament chess model) — bez zmian
- § 32 Training Mode data model — bez zmian
- § 35 Player Self-Report shots collection — bez zmian
- KIOSK = wyłącznie warstwa UI nad istniejącym data modelem

### Note on numbering

Originally drafted by Jacek as "## NN." placeholder + internal `§40.X` cross-refs (Opus authored CC_BRIEF_KIOSK_B_LOBBY + CC_BRIEF_KIOSK_C_PREFILL against this number). § 40 was already taken by "Per-team heatmap visibility toggle" (approved 2026-04-21), so renumbered to § 55 (next available after § 54) on commit. All internal `§40.X` cross-references in this section auto-translated to `§55.X`.

External cross-refs in the original draft also adjusted on commit:

- `§38 squad names` / `§38.1` → **§53** / **§53.1** (Custom Squad Names was renumbered from § 38 to § 53 in commit `4e27073`, 2026-04-28; § 38 is "Security Role System")
- `§18 chess model` → **§42-44 per-coach streams** (§ 18 itself flags as DEPRECATED — superseded by § 42-44)
- §54.4 Coach UI alignment ✅ shipped in Brief A (`ef94637`, 2026-04-29) — Source D prefill is now realizable
- Topic anchors ("the prefill resolver subsection", "the activation rule above") preserved as-is

CC_BRIEF_KIOSK_B_LOBBY + CC_BRIEF_KIOSK_C_PREFILL reference "§ 40" / "§ 40.4" / "§ 40.5" throughout — interpret as **§ 55** / **§ 55.4** / **§ 55.5** when implementing.

**Mockup:** `docs/mockups/MOCKUP_KIOSK_v3.html` (~22 KB, landscape gloves-friendly redesign matching § 55.2 revision). Added 2026-04-29 alongside § 55.2 / § 55.8 / § 55.11 patch. Earlier `MOCKUP_KIOSK_v2.html` superseded — never landed in repo and the v2 layout (per-squad vertical sections) is replaced by v3's single-grid filtered view from § 55.2. Briefs B + C should treat MOCKUP_KIOSK_v3.html as the visual source of truth.

## 56. Player stats entry points (approved 2026-04-30)

Player views own stats via four entry points. None requires the trainer's KIOSK tablet — every path works on the player's phone after sign-in + self-claim (§ 49.8 Path A).

### 56.1 Entry surfaces

1. **ProfilePage button** — `/profile` linked-player section, dedicated surface card with `Btn variant="accent" size="lg"` ("📊 Moje statystyki"). Own card so it doesn't compete with the "Zapisz dane gracza" amber CTA on the edit-form card (§ 27 anti-pattern: multiple CTAs per surface). Visible only when `linkedPlayer` is set.

2. **ProfilePage fallback** — when `linkedPlayer` is null, the existing self-claim CTA copy switches to "Połącz profil żeby zobaczyć statystyki" (i18n: `profile_claim_for_stats_btn`). Same single CTA → opens existing `LinkProfileModal`. After successful link, ProfilePage refreshes and entry 1 takes over.

3. **More tab → KONTO → "📊 Moje statystyki"** — `MoreItem` rendered after "Mój profil" in BOTH `MoreTabContent.jsx` (tournament mode) and `TrainingMoreTab.jsx` (training mode). Conditional on `linkedPlayer` from `useWorkspace()`. Unlinked users go via "Mój profil" → claim flow first (entry 2).

4. **PPT → "Zobacz statystyki dnia →"** — `Btn variant="ghost"` footer link inside `TodaysLogsList`, between log rows and the sticky "+ Nowy punkt" amber CTA. Ghost variant by design — the existing "+ Nowy punkt" stays the primary action; § 27 anti-pattern (competing CTAs) avoided. Render gated on `playerId && combined.length > 0`.

### 56.2 Auto-default scope for self-view

When `linkedPlayer.id === playerId` (self-view) AND no `?scope` param in URL AND trainings have loaded:

```
latestTid = trainings
  .filter(tr => (tr.attendees || []).includes(playerId))
  .sort((a,b) => (b.date||'').localeCompare(a.date||''))[0]?.id

if (latestTid) navigate(`/player/${playerId}/stats?scope=training&tid=${latestTid}`, { replace: true })
```

`replace: true` keeps history clean. Falls through to `scope=global` (existing default) when player has no training history. Uses already-subscribed `useTrainings()` data + client-side filter — **no new Firestore query, no new index**. Training docs carry `attendees: [...]` per § 32.

Explicit `?scope=` URL params (e.g. KIOSK toast deep-link from § 55, tournament drill-down) are respected — auto-default only fires when the param is absent.

### 56.3 Out of scope (deferred)

- QR / SMS / share-link from KIOSK tablet → phone — Brief E gap 4, postponed; entries 1-3 cover phone access.
- Sub-nav within Gracz tab — Brief E gap 6, duplicates entry 3.
- Email-based auto-link of new user → existing player record — separate scope; manual self-claim via `LinkProfileModal` is the only path.


## 57. Multi-source observations architecture (approved 2026-04-30)

**Status:** approved, awaiting implementation. Estimated 5-6 days CC across 3 commits, post-NXL Czechy 2026-05-15.

**Reference:** Discovery sessions 2026-04-29 (mobile, abandoned mid-flight) and 2026-04-30 (desktop, full ground-truth analysis). 22 source files reviewed. 10 architecture diagrams in `docs/architecture/diagrams/multi_source/01..10_*.svg`.

**Supersedes:** § 55.11 backlog item "offline-first point fragments + reconciler" — Option C (write-back) chosen over fragment+reconciler model.

**Related sections:** § 38 (security roles), § 42 (per-coach streams + canonical merge), § 48 (PPT Tier 2), § 52 (PPT unlinked-mode + migrate-on-link), § 54 (death taxonomy + filledBy), § 55 (KIOSK lobby).

### 57.1 Problem statement

After § 48 (PPT Tier 2 cold-review) and § 52 (orphan reports + migrate-on-link), self-log data accumulates in three storage locations:
- `points/{pid}.selfLogs[playerId]` — HotSheet Tier 1 (in-match)
- `points/{pid}/shots/{sid}` subcollection — HotSheet shots, KIOSK shots
- `players/{pid}/selfReports/{sid}` — PPT Tier 2 cold review (orphan: matchupId/pointNumber null at write per § 48.10)

**Critical gap (verified by ground-truth code analysis 2026-04-30):**
- 28 reader functions in `generateInsights.js` (~14) and `coachingStats.js` (~7) read ONLY `point.{home,away}Data.{teamA,teamB}.*` inline schema
- Self-log data (selfLogs map, shots subcollection, selfReports collection) is invisible to all 28 readers
- Heatmaps, insights, coachingStats produce zero output from self-log data
- All self-log data collected since 2026-04-20 is unused by any insight today

**Use case driving § 57 (Jacek 2026-04-30):**
> "Player loguje 'biegłem na doga ze strzelaniem w sukę' via PPT/KIOSK. If we can match this to an existing point, the data should AUTO-POPULATE that point so it's viewable in scout's heatmap. Goal: with 5 players self-logging (no scout), produce data equivalent to advanced scouting + heatmap."

### 57.2 Decision — Option C: Write-back propagation with sibling _meta arrays

Three architectures considered:

| Option | Approach | Schema change | Reader cutover | Source of truth | Verdict |
|---|---|---|---|---|---|
| A | Read-time consensus view | None | All 28 readers rewrite | Computed at read | High-risk deploy |
| B | Separate consensus collection | New collection | Gradual | Dual storage forever | Drift risk |
| **C** | **Write-back to homeData/awayData with provenance** | **Sibling _meta arrays** | **None — readers untouched** | **Single (homeData)** | **CHOSEN** |

**Why Option C wins:**

1. Existing 28 readers keep working — they don't know `_meta` arrays exist, see only data arrays as before
2. `filledBy` per-slot already exists (§ 54.5) as half-built provenance flag — § 57 generalizes
3. § 55.4 KIOSK prefill resolver becomes simpler — KIOSK lobby reads `homeData[slot]` directly (already populated by self-log)
4. The "5 graczy = scoutless heatmap" use case works on day 1 post-deploy
5. Single source of truth maintained — no drift between scout view and consensus view

**Trade-offs accepted:**

- Bunker→position lossy mapping (centroid-based, not pixel-resolution) — see 57.3 for fieldSide offset mitigation
- Write-back requires propagator to handle conflicts per-field (see 57.7)
- Schema migration via sibling arrays (sub-option 1b) doubles per-write count for new data — offset by batch propagator (see 57.5)

### 57.3 Schema extensions

**PerSideData (homeData / awayData) gains:**

```javascript
// Existing fields (unchanged)
assignments: Array(5),       // [playerId, ...] or null
players: Array(5),           // [{x, y}, ...] or null
shots: Object,               // {0: [...], 1: [...], ...}
eliminations: Array(5),      // [bool, ...]
eliminationStages: Array(5), // [stage, ...] per § 54
eliminationReasons: Array(5),// [reason, ...] per § 54
filledBy: Array(5),          // [scout/self/coach/null, ...] per § 54.5
fieldSide: 'left' | 'right',

// NEW for § 57
slotIds: Array(5),           // [uuid-v4, ...] generated at point create, stable across edits
playersMeta: Array(5),       // [{source, writerUid, ts}, ...] sibling to players
shotsMeta: Array(5),         // [{source, writerUid, ts}, ...] sibling to shots
eliminationsMeta: Array(5),  // [{source, writerUid, ts}, ...] sibling to elim arrays
```

`_meta` entries:
```javascript
{
  source: 'scout' | 'self' | 'kiosk' | 'reconciler' | null,
  writerUid: string,         // who wrote (auth uid for scout/self, special for kiosk)
  ts: number,                // serverTimestamp at write
}
```

**Sub-option 1b (sibling fields) chosen** over 1a (embed in value) because:
- Existing readers iterate `players[i].x` directly — embedding `{x, y, _meta}` breaks them
- Sibling arrays are invisible unless explicitly read
- Trivial to deprecate later if better solution emerges

**selfReport (player-owned) gains:**

```javascript
// Existing fields per § 48
playerId, layoutId, trainingId, matchupId, pointNumber,
breakout: { side, bunker, variant },
shots: [...],
outcome,
createdAt,

// NEW for § 57
slotRef: { pointId, slotId } | null,  // null = orphan, set after match resolved
propagatedAt: timestamp | null,        // set when propagator processed
actionTimestamps: {                    // optional, for audit + analytics
  breakoutSelected, shotsCompleted, outcomeSelected, saved
}
```

**Bunker→position transformation (NEW, used by propagator):**

```javascript
function bunkerToPosition(bunker, fieldSide) {
  // Team starting from 'left' base runs to right;
  // player position is slightly LEFT of bunker centroid (between base and bunker)
  const offset = 0.02;  // 2% normalized distance
  const dx = fieldSide === 'left' ? -offset : +offset;
  return { x: bunker.x + dx, y: bunker.y };
}
```

Reverse path (`findNearestBunker`) already exists in `generateInsights.js:1253`.

### 57.4 Coach-first flow + assignment gate

**Hard rule:** Player CANNOT propagate self-log to a specific point until coach assigns them. Eliminates auto-create empty-side point race condition with § 42.

```
T+0:00  Coach: + Add Point → point doc created
        status='open', slotIds=[uuid1..5] populated, assignments=[null × 5]

T+0:05  Coach: assigns 5 players to slots
        status='partial', assignments=[p1,p2,p3,p4,p5]

T+0:30  Player p3 eliminated mid-point, walks to pit
        Opens PPT, logs breakout + shots + outcome
        SelfReport saved with slotRef=null (orphan, coach not yet ended matchup)

T+1:00  Point ends. Other players walk to pit, log.

T+2:00  Coach: saves point outcome → status='scouted'
        (Other selfReports still orphan with slotRef=null)

T+30:00 All points (1-8) scouted. Coach: clicks "End matchup"
        → matchup.status: 'playing' → 'closed'
        → BATCH PROPAGATOR fires (see 57.5)
```

**If player logs without assignment match (legitimate edge case):**
- SelfReport saved as orphan
- Stays orphan until coach assigns players to a point that matches (trainingId + layoutId + playerId in assignments + timestamp window)
- Orphan resolver re-runs on every coach assignment update
- After successful match: slotRef populated, propagator runs

### 57.5 Batch propagator

**Implementation:** client-side React hook `useMatchupPropagator()` mounted in `MatchPage`. Watches `matchup.status` field. When status flips `'playing'` → `'closed'`, fires propagation.

**Pseudocode:**

```javascript
async function propagateMatchup(matchupId) {
  // 1. Query orphan selfReports for this matchup
  const orphans = await getDocs(query(
    collectionGroup(db, 'selfReports'),
    where('matchupId', '==', matchupId),
    where('propagatedAt', '==', null),
  ));
  
  // 2. Group by point (after matching)
  const writesByPoint = new Map();
  for (const report of orphans) {
    const point = await findMatchingPoint(report);
    if (!point) continue;  // orphan stays orphan
    
    const slot = point.assignments.indexOf(report.playerId);
    if (slot === -1) continue;  // safety: should not happen post-assignment-gate
    
    const slotId = point.slotIds[slot];
    
    // Resolve fields
    const breakoutBunker = layout.bunkers.find(b => b.id === report.breakout.bunkerId);
    const position = bunkerToPosition(breakoutBunker, point.homeData.fieldSide);
    
    // Apply conflict rules per field (see 57.7)
    const updates = resolveFieldConflicts(point, slot, report);
    
    // Stash in batch
    if (!writesByPoint.has(point.id)) writesByPoint.set(point.id, {});
    Object.assign(writesByPoint.get(point.id), updates);
  }
  
  // 3. Single updateDoc per point with all 5 slots' meta
  for (const [pointId, updates] of writesByPoint) {
    await updateDoc(doc(db, pointPath(pointId)), updates);
  }
  
  // 4. Mark selfReports as propagated
  const batch = writeBatch(db);
  for (const report of orphans) {
    batch.update(report.ref, { propagatedAt: serverTimestamp() });
  }
  await batch.commit();
}
```

**Free tier impact:**

| Operation | Per training | Per day (2 trainings + 1 match) | % of 20K daily limit |
|---|---|---|---|
| Player saves (selfReports + shots) | 160 | ~450 | 2.3% |
| Batch propagator writes | 32 | ~85 | 0.4% |
| Mark propagated | 160 | ~450 | 2.3% |
| **Total writes** | **352** | **~985** | **5.0%** |

Headroom: ~20x current usage before hitting Spark plan limit. No Cloud Function required (would consume 125K monthly invocation limit).

**Multi-tablet KIOSK race mitigation:** propagator only runs on coach device with MatchPage open. Idempotency via `_meta.ts` last-writer-wins per (slotId, fieldName). Multiple coaches running propagator simultaneously is safe — same selfReport propagation produces same result, last write wins.

### 57.6 Late-log auto-trigger

When player saves PPT AFTER coach has already ended matchup, batch trigger has already fired. Late-log path:

```javascript
// In WizardShell.handleSave (~10 lines added)
async function handleSave() {
  const ref = await createSelfReport(playerId, payload);
  
  const matchup = await getMatchup(payload.matchupId);
  if (matchup?.status === 'closed') {
    // Late-log: trigger one-off propagation
    await propagateSingleSelfReport(ref.id);
    showToast('Twój log zsynchronizowany od razu — matchup już zakończony');
  }
  // Else: orphan stays, batch propagator picks up at end-of-matchup
}
```

`propagateSingleSelfReport(reportId)` reuses matcher logic from batch propagator, scoped to single document. Same write semantics, same conflict rules.

### 57.7 Conflict resolution table (per field)

Applied by propagator when both scout and self-log have written to same slot field:

| Field | Rule | Rationale |
|---|---|---|
| `players[i]` (position x,y) | scout > self-log | Canvas tap higher fidelity than bunker centroid |
| `shots[i]` (positions) | scout > self-log | Same fidelity reasoning |
| `eliminationStages[i]` | self-log > coach | Player knows own state best |
| `eliminationReasons[i]` | coach > self-log | Coach observes gunfight; player on break didn't see |
| `eliminations[i]` (bool) | OR (either says true) | Safety: don't lose elimination data |
| Free text (comments) | latest writer wins | Intentional override behavior |
| `assignments[i]` (playerId) | scout > self-log | Coach is authoritative roster |

**Tie-break (same source on both sides):** `_meta.ts` newer wins.

**Position recency override:** does NOT apply. Even if scout wrote 5min ago and player wrote just now, scout fidelity always wins on position field.

**Idempotency:** propagator can re-run safely. Player edits selfReport → re-fire propagation. `_meta.source = 'reconciler'` flag on propagated writes prevents infinite loop with watcher.

### 57.8 Migration plan (3 commits, ~5-6 days CC)

**Commit 1 — Schema + propagator core (~3-4 days)**

- `pointFactory.baseSide()` extended: init `slotIds`, `playersMeta`, `shotsMeta`, `eliminationsMeta` arrays
- All existing writers (W1-W7) populate `_meta` alongside their existing field writes
- New `useMatchupPropagator()` hook in `src/hooks/`
- New `findMatchingPoint()` matcher with assignments + timestamp logic
- New `bunkerToPosition()` utility in `src/utils/coachingStats.js` or new file
- New `resolveFieldConflicts()` per 57.7 rules
- Mount propagator in `MatchPage`
- selfReport extends with `slotRef`, `propagatedAt`
- Test with synthetic data: 1 player log → batch trigger → 1 write → heatmap renders

**Commit 2 — Reader uplift for provenance UI (~1-2 days)**

- Heatmap renders self-log positions with subtle visual differentiator (per `_meta.source`)
- ScoutedTeamPage shows "filled by scout / self / mixed" badge per stat
- Insights confidence weighting per source (optional, behind flag)

**Commit 3 — Backfill + cleanup (~0.5 day)**

- Backfill `slotIds` for legacy points (best-effort UUID assignment)
- Migrate any existing orphan selfReports via manual UI in admin panel
- Remove `kioskPrefillResolver` source A code path (now redundant with homeData direct read)

### 57.9 Risk register

| # | Risk | Mitigation |
|---|---|---|
| 1 | PositionName rename invalidation post-write | Snapshot bunker.id alongside positionName at selfReport write time |
| 2 | Reconciler infinite loop (selfReport → point → selfReport ping-pong) | `_meta.source = 'reconciler'` flag; watcher skips reconciler-sourced writes |
| 3 | Multi-tablet KIOSK race | per-field last-writer-wins on `_meta.ts`, deterministic outcome |
| 4 | Edit/undo on existing self-log | Idempotency keys via slotId + writerUid + source; re-run propagator |
| 5 | Lossy bunker centroid → position | fieldSide offset (±0.02) covers 80%; future: bunker.size for dynamic offset |
| 6 | Schema migration breaking edge readers | Full-repo grep for `\.players\[`, `\.shots\[` access patterns before deploy |
| 7 | Player without assignment writes orphan that never matches | Orphan resolver re-runs on every coach assignment update; UI shows "unsynced logs" badge for coach |
| 8 | Free tier exhaustion under heavy use | Hard cap 50 trainings/week before Spark plan; current ~3 trainings/week |

### 57.10 Onboarding (deferred to Phase 2)

§ 57 implementation Phase 1 ships propagator + schema without onboarding. Phase 2 adds 9 guidance moments per separate `docs/architecture/ONBOARDING_GUIDANCE.md` spec. Users will encounter:

- G2 — first scouted point with player logs pending: "Punkt zapisany. Dane graczy pojawią się po zakończeniu matchupu"
- G3 — first end-of-matchup: modal "Po zamknięciu wszystkie self-logi automatycznie zaktualizują heatmapę. Niesynchronizowanych: N"
- G4 — post-batch toast: "Zsynchronizowano N self-logów"
- G6 — first orphan save by player: "Twój log zapisany. Trener zsynchronizuje go po zakończeniu matchupu"
- G7 — late-log auto-trigger toast: "Zsynchronizowano od razu — matchup już zakończony"
- (4 more for G1, G5, G8, G9 — see ONBOARDING_GUIDANCE.md)

`onboardingFlags` storage on `users/{uid}` doc, max 9 boolean flags = negligible Firebase cost. Settings panel "Pokaż wskazówki ponownie" resets flags.

### 57.11 Definition of done

§ 57 Phase 1 is complete when:
- [ ] All 7 writers (W1-W7) populate `_meta` arrays alongside data arrays
- [ ] `useMatchupPropagator` mounted in MatchPage and triggers on status='closed'
- [ ] `findMatchingPoint` correctly matches by trainingId + layoutId + playerId in assignments + timestamp
- [ ] Late-log auto-trigger fires from PPT WizardShell when matchup.status === 'closed'
- [ ] Conflict resolution per § 57.7 verified with at least 1 test case per rule
- [ ] Heatmap renders self-log positions identically to scout positions (no visual diff in Phase 1)
- [ ] Free tier daily writes audited via `firebase firestore:databases:get` quota check after first weekend deploy
- [ ] Discovery report v2 + addendum + 10 architecture diagrams archived to `docs/archive/audits/2026-04-30_observations_discovery/`

---

## 58. QuickLog Stage-Based Scouting Flow (approved 2026-05-01)

### 58.1 Four-stage flow architecture
- **Stage 1 — Wybór graczy:** KIOSK-style player tiles z metrykami (win% + survival + punkty dziś)
- **Stage 2 — Pozycje:** zone icon toggles (Dorito/Center/Snake) re-used z QuickShotPanel via shared `src/utils/zones.js`
- **Stage 3 — Live tracking:** zachowany z produkcji (poza scope tego redesignu)
- **Stage 4 — Outcome:** dwie karty drużyn ("Skład w tym punkcie" zone-tag section deferred do follow-up briefu)

State machine w `QuickLogView.jsx`: `step: 'pick' | 'zone' | 'win' | 'tracking'`. Stage 1 = `'pick'`, Stage 2 = `'zone'`, Stage 4 = `'win'`, Stage 3 = `'tracking'` (osobna ścieżka uruchamiana z Stage 1 przyciskiem ghost "Start punktu (live tracking)").

### 58.2 Stage 1 player tile spec
**Layout:** `[avatar] [name + #number + metrics] [win% + WIN] [checkbox]`

**Avatar:**
- Mobile: 48px diameter
- Tablet (min-width 768px): 64px diameter
- Background: `playerColor` z theme (lub `#1e293b` fallback)
- Initial: 16/22px white (lub `#94a3b8` jeśli grey fallback)

**Name + number:**
- Number: 11/12px `#f59e0b` 700 (amber) — istniejący project precedent
- Name: 14/17px `#e2e8f0` 600

**Metrics row (under name):**
- ♥ Survival rate: lucide `<Heart>` filled, size 12/13px, color = `winRateColor(rate)`, count next to it 11/12px 700 same color
- ⏱ Punkty dziś: lucide `<Clock>` outline, size 12/13px stroke `#64748b`, count next to it 11/12px 600 `#94a3b8`

**Win rate (right side):**
- 19/22px 800, color = `winRateColor(rate)` (green >70 / amber 40-70 / red <40 / grey if no data)
- "WIN" label below: 8px 600 `#475569`, letter-spacing 0.5px

**Checkbox (rightmost):**
- 26/28px circle
- Inactive: 2px border `#475569`, transparent bg
- Active: bg `#f59e0b`, content = selection-order index `1`-`5` 14/16px 800 `#0a0e17` (reinforces slot model: tap order maps to `assignments[0..4]` per Bug B contract)

**Selected tile state:**
- Border: 1.5px (mobile) / 2px (tablet) solid `#f59e0b`
- Background: `#f59e0b08` (8% alpha)

**Inactive tile state:**
- Border: 1px solid `#1a2234`
- Background: `#0f172a`

**Tablet 3-col grid:** `gridTemplateColumns: 'repeat(3, 1fr)'` przy `(min-width: 768px)` via `useIsTablet()` hook (matchMedia + resize listener).

**Metrics computation:** lightweight inline `computeMetrics(playerId, points)` — iterates session points, finds player slot via `assignments.indexOf`, counts played/wins/survived. Memoized w `metricsByPlayer` (per-render). Nie używa `playerStats.computePlayerStats` żeby uniknąć field-aware deps tylko dla 3 liczb per kafelek.

**Single CTA rule (hotfix v2 2026-05-01):** Stage 1 ma TYLKO ONE primary CTA — "Przypisz pozycje → (X/5)". Brak secondary linków typu "Skip to live tracking" lub similar. Decyzje o pominięciu kroków = ⋮ menu na Stage 2 (gdzie user już wybrał graczy i może świadomie zdecydować). Mieszanie shortcut'ów na Stage 1 fragmentuje flow i sugeruje że Stage 2 jest opcjonalny — nie jest. Live tracking osiągalne przez Stage 2 → "Rozpocznij punkt", nigdy z Stage 1.

**Sticky-bottom CTA (hotfix v2 2026-05-01):** CTA renderuje się jako `position: sticky; bottom: 0` w obrębie scroll-containera. QuickLogView outer container używa `height: 100%` (NIE `minHeight: 100dvh`) żeby fitował dokładnie w AppShell content slot — bez tego `100dvh` rozsadza AppShell scroll wrapper i CTA ląduje pod foldem na desktop landscape. KIOSK pattern: lista scroll'uje, footer pinned.

### 58.3 Stage 2 zone icon toggles
**Icons re-used from QuickShotPanel.jsx via `src/utils/zones.js`** (cross-ref § 19 Quick Shots Dual Mode). Shared `ZONES` constant — single source of truth dla emoji + color identity. Emoji są OS-rendered (nie da się tintować via CSS filter), co jest OK bo emoji już mają natywny kolor. Active state używa border + bg tint dla wizualnej spójności.

**Zone colors (active state border + bg tint @ 15% alpha) — match `theme.js` ZONE_COLORS:**
- Dorito: `#fb923c` (orange) — emoji 🔺
- Center: `#94a3b8` (slate) — emoji ➕
- Snake: `#22d3ee` (cyan) — emoji 🐍

**Inactive state (uniform):**
- Border: 1px solid `#1a2234`
- Background: `#0f172a`
- Emoji: native color (no tint), opacity 0.55 to dim-but-visible

**Active state (per zone):**
- Border: 1.5px (mobile) / 2px (tablet) solid `ZONE_COLORS[zone]`
- Background: `${ZONE_COLORS[zone]}15` (15% alpha)
- Emoji: native color, opacity 1.0

**Tile layout:**
- aspect-ratio: 1:1 (kwadratowe)
- Icon size: 22px (mobile) / 40px (tablet)
- Gap between tiles: 5px (mobile) / 12px (tablet)

**Mobile only:** legend pill at bottom (icons + labels) for first-time users. Tablet has bigger icons + supporting subtitle, legend not needed.

**Landscape size cap (hotfix v2 2026-05-01):** Zone tiles na tablet/desktop mają `maxWidth: 140` na każdym tile + `maxWidth: 480` na całym row + `marginLeft: auto` (justify do prawej, po awatarze + nazwie po lewej). Bez tego cap, tiles rozciągają się do flex parent (~1500px na desktop landscape) i emoji w środku staje się zagubiona. Mobile pozostaje `flex: 1` bez cap (tiles wypełniają dostępną przestrzeń po awatarze+nazwie).

**⋮ menu w nagłówku (Stage 2 only):**
- "Zaawansowany scouting →" (amber via `ActionSheet { accent: true }` — added in this commit, see ui.jsx ActionSheet color resolution)
- "Pomiń pozycje" — skok do Stage 4 (outcome) bez zapisu zon
- "Anuluj punkt" — czyści `selected` + `zones`, wraca do Stage 1
- separator + istniejące End match / Delete match

**Footer:** `← Wróć` (ghost) + `▶ Rozpocznij punkt` (amber accent). Single primary CTA per § 27 — secondary actions w ⋮ menu.

### 58.4 SelfLog FAB visibility rule
FAB (z `feat/player-selflog`, commit `ffb9b43`) **już jest ukryty** podczas QuickLog flow przez early return przy `viewMode === 'quicklog'` w `MatchPage.jsx:772`. TrainingScoutTab path nie mountuje MatchPage, więc tam też nie renderuje FAB.

**No code change required** — istniejąca architektura już to obsługuje. Zostawiamy jako udokumentowaną decyzję na wypadek przyszłych rozszerzeń (np. dodanie nowych view modes które miałyby pozostawić FAB widoczny — wtedy explicit `&& !isQuickLogActive` warunek będzie potrzebny).

**Rationale:** FAB służy graczowi do logowania siebie (Tier 1 self-report). QuickLog służy scout'owi do logowania całego punktu zespołu. Architecture early return zapobiega konfliktowi UX.

### 58.5 Anti-patterns
- ❌ **Tekst zamiast ikon na Stage 2** — emoji jednoznacznie definiuje zonę, tekst zajmuje miejsce
- ❌ **Avatar < 48px na mobile** — w QuickLog (KIOSK use case) gracz musi widzieć kafelek z odległości ręki
- ❌ **Wiele konkurujących CTA na Stage 2** — single primary "▶ Rozpocznij punkt", secondary actions w ⋮ menu
- ❌ **FAB SelfLog widoczny podczas QuickLog** — różne use cases, konflikt UX (zapobiegane przez architecture early return)
- ❌ **Hardcoded color thresholds w komponentach** — zawsze przez `winRateColor()` helper z `src/utils/colorScale.js`
- ❌ **Lucide-react do zone icons gdy już są emoji w QuickShotPanel** — drift między dwoma surface'ami; reuse via `src/utils/zones.js`

### 58.6 Cross-references
- § 19 Quick Shots Dual Mode (zone icon source of truth — `QuickShotPanel.jsx`)
- § 27 Apple HIG Compliance (touch targets, color discipline, elevation, single primary CTA)
- § 32 Training Mode (squad → match → scouting flow)
- § 35 Player Self-Report UI patterns (FAB definition, Tier 1 self-log surface)
- § 57 Multi-Source Observations Foundation (slot/_meta architecture preserved through QuickLog → canvas handoff)

### 58.7 AppShell context bar visibility during QuickLog (hotfix v2 2026-05-01)
AppShell renders a tournament context bar (`AppShell.jsx:72-143`) above its content slot when `tournament` prop is set. During QuickLog flow the bar duplicates the QuickLog `PageHeader` and pushes Stage 1 CTA below the fold on desktop landscape (Bug 2 from hotfix v2).

**Solution — lifted state via `QuickLogContext`:**
- New context at `src/contexts/QuickLogContext.jsx` exposes `useQuickLogActive()` (consumer) + `useQuickLogSetter()` (producer).
- Provider wraps the app tree in `App.jsx` (between `KioskProvider` and `HashRouter`).
- `QuickLogView` calls `setQuickLogActive(true)` in a `useEffect` on mount, `false` on cleanup.
- `AppShell` reads `quickLogActive` and conditional-renders the context bar: `{tournament && !quickLogActive && (...)}`.

**Why not URL-based detection:** QuickLogView mounts in two deep places (MatchPage's tournament path with internal `viewMode==='quicklog'` state; TrainingScoutTab's training path with internal `quickLogMatchupId` state). Neither URL has a deterministic flag — context is the cleanest lift.

**Behavior:**
- Stage 1, 2, 3 (live tracking), 4 — context bar hidden.
- Back / save / cancel / Anuluj punkt → QuickLogView unmounts → setter called with `false` → bar returns.
- Tab bar at the bottom of AppShell stays visible — escape via tabs is intentional.
- PageHeader inside QuickLogView (back chevron + title + ⋮) stays — that's the QuickLog header, not the context bar.

---

## 59. PlayerStatsPage redesign (approved May 1, 2026)

Reference: chat 2026-05-01, mockup widget `player_stats_redesign_v2_bigger_fonts_avatars`,
implementation brief `docs/archive/cc-briefs/CC_BRIEF_PLAYER_STATS_REDESIGN_2026-05-01.md`.

### 59.1 Visual hierarchy — three repeated component types

Mid-page must be homogeneous. The same `BarRow` pattern across 6 mid-section types (Strona / Strzela / Przeszkoda / Powód / Trafiane / Chemia) creates a repeating visual rhythm. Coach's brain registers: "every section is a series of bars with label + value, only the topic changes." Faster scan, less cognitive load.

Three component types only on this page:
1. **HeroMetric** — top 6-card grid (Win rate, Survival, Punkty, +/−, Kills, K/pt)
2. **BarRow** — used in 6 mid-section types
3. **History card** — bottom only, W/L badge + opponent + count

Avatar-based duo/trio cards are a sub-variant of BarRow (label is the avatar stack instead of plain text).

Anti-pattern: do NOT introduce a 4th visual type for any single section. If a metric needs different presentation, design a new dedicated screen (drill-down).

### 59.2 Section naming convention (Polish, descriptive verb-phrases)

Use full sentences as section headers, not abstract nouns. Coach reads them as a sentence about the player.

| Concept | Header (PL) |
|---|---|
| Side preference | "Zazwyczaj gra po stronie:" |
| Top break bunkers | "Najczęściej zaczyna grę na:" |
| Break shot directions | "Na breaku strzela:" |
| Obstacle shot directions | "Na pierwszej przeszkodzie gra w stronę:" |
| Death reason | "Powód spadania:" |
| Death bunkers | "Najczęściej trafiane przeszkody:" |
| Lineup duo | "Najlepiej gra w duecie z:" |
| Lineup trio | "Najlepiej gra w trójce z:" |
| Match list | "Historia meczów" |

Anti-pattern: short noun headers like "Strona pola", "Top bunker", "Pary · Dorito" — too abstract for coaches scanning quickly mid-tournament.

### 59.3 Data-source pille — transparent provenance

Every section displaying metrics gets a data-source pill in the section header.

Three pill variants:

| Variant | Color | Background | When to use |
|---|---|---|---|
| `scout` | `COLORS.textDim` | transparent | Section uses scout-collected data only (no self-log integration possible or applicable) |
| `scout + self` | `#22d3ee` | `#22d3ee15` | Section combines scout + self-log union via Phase 1a foundation |
| `scout only` | `#f59e0b` | `#f59e0b15` | Section uses scout-only because self-log doesn't yet provide relevant fields (architectural gap, addressable in Phase 1b) |

Semantic intent:
- Cyan = "more sources, more confidence"
- Amber = "warning: incomplete coverage, only one source feeding this metric"
- Gray = "neutral, single-source by nature"

Coaches see at a glance which sections have richer underlying data.

**Pille are presentation only.** They describe the data origin, they do NOT change underlying logic. A section labeled "scout + self" must already be using union; the pill just makes it visible. A section labeled "scout only" continues to query scout-only data as before; the pill exposes the limitation transparently.

When Phase 1b unlocks self-log obstacle phase + death xy positions, sections currently `scout only` flip to `scout + self`. No backward-compat issue — pill mapping is a single config table updated alongside the pipeline change.

### 59.4 Survival rate per bunker

New metric in `computePlayerStats` for `breakBunkers` aggregation. Per top break bunker, alongside `played` count, compute `survivalRate = round(survived / played * 100)`.

Display in "Najczęściej zaczyna grę na:" section — each bunker card shows:
- Name (left)
- Mid bar with side color
- `played` count + `pkt` label (right top)
- `survivalRate` % + `SURV` sublabel (right bottom), color from `winRateColor()`

Color thresholds (shared with HeroMetric Win Rate, Survival, +/−):
- > 70% → green (success)
- 50–70% → amber (warning)
- < 50% → red (danger)
- null / NaN → textDim

Helper: `winRateColor(rate)` in `src/utils/colorThresholds.js` (or reuse existing `src/utils/colorScale.js` if present per STEP 0 discovery).

### 59.5 Avatar cards in lineup chemistry sections

Duo and trio cards use overlapping avatar stacks (sub-variant of BarRow).

Pattern:
- **Duo:** 2 avatars, second offset by `margin-left: -10px` (mobile) / `-12px` (tablet)
- **Trio:** 3 avatars, each offset by same margin, z-index 3-2-1 (first avatar visually on top)
- Avatar size: 40px mobile / 48px tablet
- Avatar font: 14px / 16px, weight 700, contrasting letter color
- Avatar border: 2px / 2.5px, color = card bg (creates cutout effect, makes overlap clear)
- Avatar bg: from `getPlayerColor(player)`, fallback `COLORS.surfaceLight` (slate)

Right column of card:
- Big % 16-19px weight 800, color from `winRateColor(winRate)`
- Sublabel "N punktów" (N=count of points played together) 11-12px textDim weight 500

This pattern reads as "these players together" at a glance — much faster than a plain text label like "Felix + Kesi + Ronir" alone.

### 59.6 Per-section data-source mapping

| Section | Pill variant |
|---|---|
| Win rate (HeroMetric) | scout |
| Survival (HeroMetric) | scout + self |
| Punkty (HeroMetric) | scout + self |
| +/− (HeroMetric) | scout |
| Kills (HeroMetric) | scout |
| K/pt (HeroMetric) | scout |
| Zazwyczaj gra po stronie | scout + self |
| Najczęściej zaczyna grę na | scout + self |
| Na breaku strzela | scout + self |
| Na pierwszej przeszkodzie gra w stronę | scout only |
| Powód spadania | scout + self |
| Najczęściej trafiane przeszkody | scout only |
| Najlepiej gra w duecie z | scout only |
| Najlepiej gra w trójce z | scout only |
| Historia meczów | (no pill — meta data, not a metric) |

`scout only` items unlock to `scout + self` in Phase 1b when self-log schema extends to:
- Obstacle shot phase distinction (currently break-only)
- Death xy positions (currently empty in self-log records)
- Lineup pairing inferred from synth-pairs in self-log

### 59.7 Depth section disabled

"Głębokość pozycji" (depth: base / mid / deep) section is removed from rendering on PlayerStatsPage.

**Reason:** Coaches don't immediately understand the metric. Without an explicit explanation in coach workflow (Sławek's framework), the data point creates more confusion than insight.

**Implementation:** UI rendering removed. Computation in `playerStats.js` is preserved — the metric may return as a sub-metric of "Zazwyczaj gra po stronie:" once coach education catches up.

### 59.8 Match history rows — count clarity

Row format changed from "5 pkt" → "Zagranych: 5".

**Reason:** Word "pkt" was ambiguous between:
- Points scored by team in match (game score)
- Points participated in by player (this player's match volume)

"Zagranych: 5" reads clearly as "this player participated in 5 points of this match" — eliminates ambiguity for coaches reviewing player workload.

### 59.9 Six-metric headline grid

Top of page above all sections — six HeroMetric cards in a 3×2 grid (mobile) / 1×6 row (tablet).

| Metric | Color |
|---|---|
| Win rate | `winRateColor(rate)` |
| Survival | `winRateColor(rate)` |
| Punkty | `COLORS.text` (neutral) |
| +/− | `plusMinusColor(value)` |
| Kills | `COLORS.text` |
| K/pt | `COLORS.text` |

Rate-based metrics get a 4px mini progress bar; count metrics have a transparent placeholder of same height (alignment grid).

Each card has DataSourcePill below the bar.

This grid is the **single source of truth for "is this player good?"** Coach scans 6 numbers in 2 seconds, then drills into mid-sections to understand why.

### 59.10 Anti-patterns

- ❌ Don't introduce 4+ visual types on this page (HeroMetric / BarRow / History card is the contract)
- ❌ Don't show > 3 data points on a single bunker card / chemistry card (name + bar + value is the limit)
- ❌ Don't add chevrons except on history rows that actually navigate (most cards on this page are read-only)
- ❌ Don't render scope `Layout` — three scopes only: Ten turniej / Globalny / Ten mecz
- ❌ Don't show depth metric until coach workflow integrates it explicitly (§ 59.7)
- ❌ Don't use generic "pkt" without context — always "Zagranych: N" or "{N} pkt" with leading metric name

## 60. Coach view refinements — pre-NXL 2026-05-15 (approved May 2026)

Adjustments to § 28 (Coach Brief View) based on real-use feedback from
Jacek 2026-05-12 after the April PXL weekend and run-up to NXL Czechy.
Brief: `docs/archive/cc-briefs/CC_BRIEF_PRE_NXL_REFINEMENTS_2026-05-12.md`
(reasoning archive, not active spec).

### 60.1 Heatmap promoted to top of analysis (expanded by default)

Heatmap moved from collapsed "Additional sections" to the first analysis
section on `ScoutedTeamPage`, expanded by default. Real coach use showed
heatmap is the fastest scan for "where do they play" before diving into
row-level stats. `heatmapExpanded` state defaults to `true`; the
mini-preview / collapse toggle is retained for users who want to fold it
away, but no longer required for first view.

### 60.2 Tendencja demoted to additional sections

Tendencja (3-card Dorito / Center / Snake breakdown with classification
labels) moved into "Additional sections" (collapsed). Computation
flagged unclear by Jacek; section preserved but hidden while the formula
is revalidated post-NXL. **Logic preserved verbatim** — no change to
classification thresholds, side cards, or i18n keys.

### 60.3 New section order on ScoutedTeamPage

1. Sample badge (confidence)
2. **Heatmap** (expanded)
3. Rozbiegi (Breakouty)
4. Strzelanie (Strzały) — with reliability banner at the top (§ 60.5)
5. Kluczowi gracze
6. Big Moves (when zone + detections present)
7. Coach Notes
8. Additional sections (collapsed): Counter plan, Insights, Tactical
   signals, **Tendencja**, Matches

### 60.4 Rozbiegi gets play counts (two new columns)

`computeBreakSurvival` (`src/utils/generateInsights.js`) extended to
return two additional fields per bunker row:

- `timesPlayed` — total player-bunker associations across scope points.
  Every placed player whose nearest bunker (≤ 0.12 distance) is this
  bunker increments by 1. **Double-counted within a point intentionally:**
  two players at D1 in one point = 2 plays.
- `pointsPlayed` (= existing `count`) — distinct point count where any
  player broke at this bunker.
- `totalPoints` — scope-points total, surfaced on every row for the
  `{x}/{N}` display in the second new column.

Row layout adds two columns to the existing Rozbieg% / Przeżycie% pair:

- `Zagrań` / `Plays` — value: `b.timesPlayed`
- `W pkt` / `In pts` — value: `b.pointsPlayed/b.totalPoints`

i18n keys: `col_played`, `col_played_in` (PL + EN). Column widths
tightened to fit four right-aligned cells on iPhone 13 width: 42/42/36/44
instead of the prior 56/56. Value font dropped 13→12px; existing % colors
unchanged.

### 60.5 Strzelanie reliability banner

Top-of-section banner showing `declaredShooters / expectedShooters` ratio
across scope. **Reuses `computeCompleteness.shotPct`** — same denominator
(non-runner placed players) and numerator (those with at least one shot
direction in `quickShots` ∪ `obstacleShots` ∪ precise `shots`).

UI:

- **Healthy (≥ 80%):** neutral pill, `COLORS.surfaceDark` bg, muted text,
  no icon. Format: `Strzelanie: dane dla {pct}% graczy`.
- **Alert (< 80%):** amber accent — `#f59e0b40` border, `#f59e0b0c` bg,
  ⚠ icon, `COLORS.accent` text. Format: `⚠ Strzelanie: dane dla {pct}%
  graczy (mała próbka)`. Amber here is a warning-state semantic (not
  decoration) and falls under the § 27 amber-as-active-indicator
  exception.
- Banner hides cleanly when `nonRunnerPlayers === 0` (no NaN%
  divide-by-zero).

Independent from row-level percentage formula. The row Strzela% formula
itself is separately ticketed post-NXL (COACH #5 — formula refactor,
deferred from Brief A).

### 60.6 Match-level scope filter

Two new scope pills on `ScoutedTeamPage` header pill row, in addition
to the existing Ten turniej / Cały layout pair:

- **Ostatni mecz** — auto-resolves to most recent closed match for the
  current team in the current tournament. Sort key:
  `updatedAt.toMillis() || completedAt.toMillis() || date`. Pill is
  disabled (greyed, tooltip "Brak zakończonych meczów") when no closed
  matches exist.
- **Mecz ▾** — opens a Modal picker (centered overlay) listing
  `teamMatches` sorted newest first. Each card shows opponent name, date
  (or "do zagrania" / "scheduled"), score, and W/L/D `ResultBadge` when
  final. Tap a card to select + close. Selected match shows on the pill
  as `vs {opponent} ✕`; tapping `✕` clears back to "Ten turniej".

Pill row order: `[Ostatni mecz] [Ten turniej] [Cały layout] [Mecz ▾]`.
"Cały layout" remains conditional on multi-tournament-layout (existing
rule). All pills share the same active-state amber treatment for visual
calm (§ 27 anti-pattern avoidance — no competing CTAs in a pill row).

Default scope on page load unchanged ("Ten turniej") — new filters are
opt-in.

URL contract:

| `?scope=` | `?mid=` | Effective scope |
|-----------|---------|-----------------|
| absent / `tournament` | — | current tournament, all team matches |
| `layout`              | — | layout-wide (multi-tournament aggregation, existing) |
| `lastMatch`           | — | most recent closed team match in current tournament |
| `match`               | `<id>` | single specified match |

State machinery: the loader writes `allHeatmapPoints` (raw); a derived
`heatmapPoints` `useMemo` applies the matchId filter so every downstream
`useMemo` (stats, insights, breakSurvival, shotTargets, topHeroes,
tacticalSignals, bigMoves, computeCompleteness) auto-respects the
filter. `teamMatches` wrapped in `useMemo` for stable identity in
dependency arrays. Layout scope ignores the matchId filter (spans
multiple tournaments).

### 60.7 ADD MATCH removed from coach team summary

ADD MATCH sticky button + "New match" Modal + `handleAddMatch` handler
+ `addMatchModal` / `selectedOpponent` state all removed from
`ScoutedTeamPage`. Match creation lives on the Scout tab and the More
tab only. Coach drill-down is not the right scope for tournament
management.

### 60.8 SCOUT #6 — precision shot drawer 70vw

`ShotDrawer` width changed from `width: '80%', maxWidth: 340` to
`width: '70vw', maxWidth: 520`. Discovery: the `maxWidth: 340` cap was
the perceptual bottleneck — on iPhone Pro Max landscape (932 px) the
prior cap yielded ~36% of viewport, matching Jacek's "40%" perception
report. The new `min(70vw, 520px)` ceiling preserves field aspect on
phones while keeping a sanity ceiling for tablets.

### 60.9 PLAYER #1 — BottomNav in player section (DEFERRED)

PLAYER #1 from 2026-05-12 feedback ("w tej sekcji nie widać na dole
menu — powinno być widoczne normalne menu") was deferred from Brief A.
Three concerns drove deferral:

1. § 31 explicitly excludes `/player/:playerId/stats` from BottomNav.
2. `AppShell.jsx:25-28` carries an explicit architectural comment that
   PPT (`/player/log`) was deliberately routed outside AppShell because
   "PPT has its own layout/chrome and nesting it inside AppShell's
   tournament context bar would be visually confusing."
3. Three candidate routes (`/profile`, `/player/log`,
   `/player/log/wizard`) with unclear scope — wrong pick risks
   regressing established flows.

Wrapping multiple routes in shared AppShell requires extracting tab
state from `MainPage` into a hook — a real refactor, not the "small
render fix" SAFE tier this brief was scoped to. Re-briefed post-NXL
with Jacek confirmation of which surface(s) he means.

## 61. Deaths heatmap v2 (approved May 2026)

LayoutAnalyticsPage `mode='deaths'` overhauled per Jacek 2026-05-12
feedback. Brief: `docs/archive/cc-briefs/CC_BRIEF_DEATHS_HEATMAP_V2_2026-05-12.md`
(reasoning archive). § 30 attribution formula and all global kill
displays in `playerStats.js` / `generateInsights.js` /
`ScoutedTeamPage` / `PlayerStatsPage` remain unchanged.

### 61.1 Isolated attribution helper

`src/utils/deathAttribution.js` implements the new attribution formula
used **only on this screen**. Pure function, no imports from
`playerStats.js`. Public surface:

- `computeDeathAttribution(point, field, sideAsDefender = 'home')` —
  returns `{ eliminations, killCreditsByShooter }`. Caller invokes
  twice per point (once per side as defender) to capture both sides'
  deaths.
- `classifyDefenderZone(pos, field)` — § 34.4 line-based thresholds
  (`discoLine` / `zeekerLine`), NOT the midline-based `getBunkerSide`
  from `helpers.js`. The two existing zone classifiers disagree at
  e.g. `y=0.40`; this helper follows the brief's mental model.
- `formatKills(n)` — fractional credit display (1 decimal max,
  trailing `.0` trimmed). `0` / `1` / `0.5` / `2.5` / `1.0 → '1'`.

Local `findNearestBunkerObj` returns the full bunker object (needed
for table `.positionName` + shooter marker `.x/.y`); the existing
`generateInsights.findNearestBunker` returns name only.

### 61.2 Attribution formula

Per-point, two sides: defenders (rozbiegający) and shooters
(strzelający). For each eliminated defender:

- Find nearest bunker via `positionName` (15% threshold).
- Sweep all placed shooters on the opposite side.
- A shooter has EITHER precise shots (`point.shots[slot]`) OR zone
  shots (`quickShots` ∪ `obstacleShots`) — never both. Dev guard
  warns if both are present; precise wins.
- **(a) Precision:** any shot in `shots[slot]` within 10% distance of
  defender position → attributor.
- **(b) Zone:** shooter's union of zone arrays contains defender's
  zone (`dorito` / `center` / `snake` per § 34) → attributor.
- Credit splits `1/N` across matched attributors.
- `N=0` leaves elimination unattributed (zero credit). Reachable on
  the heatmap as a tappable skull whose cross-filter highlights only
  the skull, fading all shooters; status pill shows `brak strzelca`.

### 61.3 Scope filter

Pills above heatmap: `[Cały layout]` / `[Turniej ▾]` / `[Mecz ▾]` /
`[Punkt ▾]`. Progressive disclosure — deeper pill appears only after
upper level is selected. `✕` on the deepest selected pill clears that
level and reverts to upstream. `Cały layout` resets all. No global
scope.

State shape: `{ level, tournamentId, matchId, pointId }` keyed off the
new `_ctx` IDs added to `fetchLayoutDeaths` (additive — existing
name-only consumers unaffected). Pickers use `ActionSheet` from
`ui.jsx` (per brief — flat label strings, no subtitle rows
supported); point picker label encodes `Pt {n} · {winner} · {elimCount}`.

### 61.4 Density layer threshold

Heatmap density layer hides when `filteredPoints.length < 5`
(insufficient samples for meaningful density). Markers always render.
Constant: `DENSITY_MIN_POINTS = 5`.

### 61.5 Shooter markers

Each unique shooter standing position (cluster-aggregated at 0.01
resolution) renders as a 10 px filled circle in the shooter's team
color (`TEAM_COLORS.A` red home / `TEAM_COLORS.B` blue away) with a
14 px credit badge showing `formatKills(credit)`. Visually subordinate
to skulls (smaller badge, lower visual weight).

Z-order: image → density → skulls → shooter markers.

**Zero-kill markers NOT rendered** (shooters placed but no defender
match). Brief flagged as ESCALATE; chose smaller-scope per CLAUDE.md
rule — they add visual noise without information. Gate is
`if (!m || m.credit <= 0) return;` — flip if checkpoint demands.

### 61.6 Linked highlighting (cross-filter)

Tap skull → attributing shooters stay 100% `globalAlpha`, rest fade
to 0.3. Tap shooter → attributed skulls stay 100%, rest fade. Tap
`✕` on status pill or empty area → reset. Status pill at top of
heatmap shows active filter with target name + count.

Status pill formats (PL):
- Filter by skull: `📍 Eliminacja na D1 — 3 strzelców · ✕`
- Filter by skull (unattributed): `📍 Eliminacja na D1 — brak strzelca · ✕`
- Filter by shooter: `📍 Strzały z Snake1 — 4 trafień · ✕`

Polish plural inflection uses genitive-plural form for all counts
(`strzelców` / `trafień`) — grammatically acceptable for 1 + 2+ as
a fallback. Proper inflection deferred.

Filter state `{ mode, id }` auto-clears on scope or mode change.
Skull cluster computation hoisted from inside the draw effect to a
`useMemo` so the click handler + link map + status pill all reference
the same data. Bidirectional `linkMap` (skullId↔shooterId Sets) is
precomputed; runtime interaction is O(1).

**Animation deferred** (brief mentioned "feels smooth"). Canvas
`globalAlpha` flips are instant. Smooth 200 ms fade would need rAF
interpolation with stored per-marker target opacities — functional
cross-filter ships in v1 to keep scope tight; animation as polish
follow-up if checkpoint feels jarring.

**Toast deferred for unattributed-skull case** (brief calls for both
pill + toast). The pill already says `brak strzelca`; toast adds
noise. Flip if checkpoint disagrees.

### 61.7 New table column

`Pozycja strzelca` between `P#` and end-of-row. Multi-attributor
formatted as `Snake1 · D2`. Unattributed shows `—` in `COLORS.textDim`
italic. Truncated with `…` if multi-attributor row exceeds maxWidth
110 (tap-to-expand deferred per brief). Driven by scope-filtered
point set via the `attributionByDeath` Map keyed `pointId|side|slot`
(O(1) per row).

### 61.8 Coord-frame note (carried from Stage 1)

The helper compares per-point shots and per-point defender positions
directly — assumes they live in compatible coordinate frames, mirroring
the convention `computePointKillCredits` uses with `pt.opponentPlayers`.
Shooter marker coordinates in `attributionData.shooterMarkers` are
pre-normalized via `forceLeft` so they overlay correctly on the
existing left-half rendering. If shooter markers appear on the wrong
half of the field on real-data validation, the fix is to add
`mirrorToLeft(shooterPos, data.fieldSide)` in the caller before
populating `shooterAgg` — not in the helper itself (keeps the helper
pure).

### 61.9 Out of scope (preserved guarantees)

§ 30 attribution formula and all other consumers (`PlayerStatsPage`,
`ScoutedTeamPage`, `generateInsights`) NOT modified. Survivability
stats on team breakouts not affected. KIOSK self-log unaffected.

i18n keys added (PL + EN, 13 total): `deaths_scope_all_layout`,
`deaths_scope_tournament_picker`, `deaths_scope_match_picker`,
`deaths_scope_point_picker`, `deaths_pick_tournament`,
`deaths_pick_match`, `deaths_pick_point`, `deaths_point_short`,
`deaths_empty_filtered`, `deaths_col_shooter_pos`,
`deaths_filter_skull_label`, `deaths_filter_skull_no_attr`,
`deaths_filter_shooter_label`.

## 62. Heatmap simplification — player position views (approved 2026-05-15)

### Decision
Player position heatmaps (coach team summary § 28/§ 60 + match summary § 21) do not
render density gradient. Player dots and triangles render with team solid fill +
team darker stroke for shape clarity.

### Rationale
Per Jacek's NXL Czechy 2026-05-15 tournament feedback: density blobs in original
heatmap rendering obscured overlapping markers, making circle (gun-up) vs triangle
(runner) shapes unreadable. Density also conflated with marker fill colors —
green dots on green density disappeared, blue dots on blue density disappeared.

Apple HIG: clarity, deference. Punkty z konturem dają tę samą "hotspot" intuition
przez physical clustering bez warstwy decoracyjnej. Mniej warstw = mniej szumu.

### Specification

**Affected views:**
- Coach team summary heatmap (ScoutedTeamPage, § 28 + Brief A § 60)
- Match summary heatmap (MatchPage review mode, § 21)

**Not affected:**
- Deaths heatmap (§ 61) — czaszki + shooter markers keep their own rendering
- Bump markers, shot markers, elimination X marks
- Scouting live mode canvas markers (during point entry)
- Tactic page, layout editor, bunker editor

**Rendering rules:**
- Field background: existing (white/light field rendering)
- Density gradient: REMOVED
- Player dot (gun-up): `fill = TEAM_COLORS.{A|B}.solid`, `stroke = TEAM_COLORS.{A|B}.stroke`, `stroke-width = 2px`
- Runner triangle: same as dot + `stroke-linejoin: round`
- Team A: green fill + darker green stroke
- Team B: blue fill (current Team B hex) + darker blue stroke
- HERO ring (§ 25): preserved as outer concentric stroke (amber, opacity 0.6),
  layered OVER the new team stroke

### Implementation
- theme.js: add `.stroke` (or `.dark`) field to `TEAM_COLORS.A` and `TEAM_COLORS.B`
- HeatmapCanvas + drawPlayers (or equivalent shared renderer): remove density
  call from these two view contexts, add stroke prop to dot/triangle render
- Both teams view in match summary: team identity from fill, shape from stroke

### Why two heatmaps unified under one rule
Coach team summary and match summary heatmaps serve same purpose (overview of
where team plays) on different data scope (aggregated vs single match). Single
visual standard = consistency per § 27 Apple HIG. Different rendering rules per
view would create cognitive overhead for coaches switching between them.

---

## 63. Multi-Tenant Architecture — SaaS foundation (approved 2026-05-19)

> **Status:** Product decisions locked. Migration plan + CC briefs pending separate session with desktop CC discovery.
> **Context:** Post-NXL Czechy 2026-05-17 (Ranger won). First non-PL workspace (US PRO team) incoming. Triggered pivot from single-tenant to multi-tenant SaaS architecture. Production-grade required from day 1 (paid access model, monetization of cross-workspace layout insights). 8 architectural decisions made in mobile session 2026-05-18 → 2026-05-19.
> **Related work:** § 57 (Multi-source observations — within-workspace self-log/scout unification, orthogonal to this cross-workspace SaaS scope).

### 63.1 Goals + non-goals

**Goals:**
- Support multiple isolated workspaces (Ranger Warsaw, US team, future drużyny) with strict data isolation
- Enable cross-workspace insights aggregation per layout (monetization opportunity)
- Production-grade security, stability, access control from day 1
- Easy onboarding of new languages (US team = EN primary, future expansion)

**Non-goals (current scope):**
- Cross-workspace real-time collaboration features
- Workspace-to-workspace data export/import
- Federated authentication (SSO with team identity providers)
- Marketplace for layout templates

### 63.2 Decision — Unified events collection

**Status quo (pre-decision):** Tournaments in `/workspaces/{slug}/tournaments/{id}` with `eventType: 'tournament'|'sparing'` (from 2026-04-15 deploy). Trainings in separate `/workspaces/{slug}/trainings/{id}`. PPT picker's `useTrainings()` queries only trainings collection — sparings invisible.

**Decision:** Unified `/workspaces/{slug}/events/{eid}` collection with `type: 'tournament'|'sparing'|'training'` field. All cross-event views (PPT picker, player stats, scout ranking) query single collection.

**Rationale:** Right thing architecturally, foundation for future multi-source data aggregation (§ 57 generalization). Single mental model, single hook (`useEvents()`), cross-event analytics for free. Per Jacek 2026-05-18: "later we'll need simple distinction which data is from training, sparing, tournament" — `type` field on event provides that.

**Rejected alternatives:**
- Status quo (separate collections) — fragmentation continues, blocks every cross-event feature
- Sparing as separate collection — solves nothing, doubles down on fragmentation
- Hybrid `/events_index` (read-only mirror) — perpetual technical debt

**Migration approach:** Staged dual-write 4-6 weeks. Phase 1: introduce `/events/`, dual-write to old + new collections, all reads from new. Phase 2: monitor for regressions via Sentry + manual audit. Phase 3: disable dual-write to old, remove from app code. Old collections retained as read-only archive for N months before deletion.

**Open questions for CC discovery:**
- Exact write paths in `dataService.js` that need dual-write wrappers
- Whether `eventType: 'sparing'` data was ever populated (or always empty since 04-15 ship)
- Migration data integrity validation script

**§ 63.2 Findings (Phase 0 discovery, 2026-05-19):**
- **Tournament writers:** `addTournament` (`dataService.js:173-185`), `updateTournament` (L187), `deleteTournament` (L188-203, uses `writeBatch` with cascading scouted+matches+points deletes), `addScoutedTeam` (L215-218, path `/workspaces/{slug}/tournaments/{tid}/scouted`).
- **Training writers:** `addTraining` (L656-676, writes `type: 'training'`), `updateTraining` (L677-678), `updateTrainingSquadName` (L691-700, dotted write), `deleteTraining` (L701-712, batch cascading).
- **Total dual-write surface:** ~25-30 functions including subcollection cascades + subscriber hooks. `endMatchAndMerge` (L409-536) is the heaviest single write site (~50 writes/batch).
- **Sparing data state:** **STUB-ONLY.** `NewTournamentModal.jsx:107-122` calls `ds.addTournament({ eventType: 'sparing', ... })` (write path exists, fully implemented). `addTournament` accepts `eventType` field. But: zero downstream consumers — `useTrainings()` queries only trainings collection per § 63.2 (sparings invisible to PPT picker); no aggregator/dashboard/stats reads `eventType === 'sparing'`. So `addTournament(eventType:'sparing')` succeeds and writes a doc, but no UI ever surfaces the result. Schema field is live; functionality is dead-end.
- **Migration pattern already in codebase:** `writeBatch` cascading deletes (deleteTournament) and large multi-doc updates (endMatchAndMerge) — dual-write to `/events/` follows existing paradigm.
- **Scouted teams subcollection path shift:** parent rename from `tournaments/{tid}/scouted/` → `events/{eid}/scoutedTeams/{sid}` (collection name also shifts plural). Migration is non-trivial because subcollection references must update too.

### 63.3 Decision — User-workspace boundary (multi-workspace membership)

**Status quo (pre-decision, per § 49 + § 51):** Multi-workspace support already exists at the data layer:
- `/users/{uid}.workspaces: string[]` — array of workspace slugs user belongs to (per § 49)
- `/users/{uid}.defaultWorkspace` — slug of preferred workspace (per § 49)
- Bootstrap auto-join on first login (per § 49.2), superseded by auto-enter-default flow (per § 51)

What's missing at UI layer: workspace switcher (UI assumes single active workspace), per-workspace role distinction (current data model has flat `workspaces: string[]` without role per slug).

**Decision:** Extend § 49 foundation:

- **Conceptual:** User can be member of multiple workspaces with one active at a time (Slack-style switcher) — UI now exposes data model that § 49 already supports.
- **Plus: Super Coach role** — auto-derived from membership count ≥ 2 with cross-workspace layout overlap. No manual role assignment — permission emerges from relationships.
- **Schema evolution (OPEN QUESTION for Phase 0 CC discovery):** Should `workspaces: string[]` be enriched with per-workspace role? Three sub-options to evaluate during Phase 0:
  - (a) Migrate `workspaces: string[]` → `workspaceMemberships: [{slug, role, joinedAt}]` (richest, breaking change to existing reads)
  - (b) Add parallel field `workspaceRoles: { [slug]: role }` (additive, no migration of existing `workspaces` field, but two sources of truth)
  - (c) Keep `workspaces: string[]` + introduce per-workspace membership doc `/workspaces/{slug}/members/{uid}` with role (cleanest separation, but query pattern shift)

  Decision deferred to Phase 0 — CC discovery to assess current `workspaces`-field consumers and recommend least-disruptive path. **Until Phase 0 resolves this, Phase 1 schema work is blocked on that micro-decision.**

**Rationale:** Future-proof for cross-workspace coaches (Sławek consulting for US team scenario explicitly raised). Standard UX pattern (Slack/Discord/Notion). Super admin (Jacek) gets natural membership in all workspaces without account tricks. § 49 already laid the data-layer foundation — this decision exposes it in UI and enriches it as Phase 0 determines.

**Rejected alternatives:**
- Single workspace per user — friction for consultants, multiple accounts per real person
- Multi-workspace, all active simultaneously (Slack-style sidebar showing all) — overkill for current scale, can be added later as extension

**Three-tier permission model (resulting from this + 63.5):**
1. **Workspace member** (scout/coach/admin role within workspace): read/write `/workspaces/{slug}/...` where they are member
2. **Super Coach** (derived from multi-workspace membership): read aggregated `/layouts/{lid}/aggregatedInsights/...` filtered to workspaces where member. Cannot read raw event data from other workspaces.
3. **Super Admin** (Jacek, email-based check): read all, plus moderation/data export interfaces, plus aggregation triggering

**Open questions for CC discovery (post § 49 reconciliation):**
- Current state of `security-roles-v2` branch (commits 3+4 status, View Switcher implementation per § 38)
- Inventory of `workspaces: string[]` field consumers (informs Phase 0 schema sub-option a/b/c)
- Whether `defaultWorkspace`/`activeWorkspace` naming should align (brief used `activeWorkspace` in § 63.11 data model; § 49 uses `defaultWorkspace`)

**§ 63.3 Findings (Phase 0 discovery, 2026-05-19) — MATERIAL TO DECISION:**

- **`users/{uid}.workspaces` consumers: ZERO direct reads found.** Grep across `src/` for `.workspaces`, `user.workspaces`, `userProfile.workspaces`, `currentUser.workspaces` returned **no matches**. The field is written (via `arrayUnion(slug)` in `useWorkspace.jsx:77-95, 102-105`) and mirrored live via `onSnapshot` (L64-72), but no UI/logic ever reads it.
- **Role resolution path:** flows entirely through `workspace.userRoles[uid]` (workspace doc, not user doc). Verified consumers: `roleUtils.js:49-52` (`getRolesForUser`), `MoreTabContent.jsx:248-250`, `TrainingMoreTab.jsx:365-367`, `firestore.rules:26,35`. § 49.3 canonical role resolution is **accurate** — `users.workspaces[]` is a passive registry, not load-bearing for any role decision.
- **Firestore rules don't read `users.workspaces`:** `firestore.rules` enforces workspace isolation via path structure (`/workspaces/{slug}/...`) + `data.userRoles[uid]` lookups + `data.members` membership list (workspace doc). Zero references to user-doc `workspaces` array in rule conditions. Comment at L75 acknowledges field is "create-only".
- **`security-roles-v2` branch is MERGED INTO MAIN.** Latest commit on branch (`50434fb` "Firestore rules v2 + legacy cleanup § 38.9") + Commit 3 (`fb049ac` "view switcher § 38.5-38.6") are in main's history. `git log main..feat/security-roles-v2` returns empty. No schema conflict with § 63.3 — security-roles-v2 work was on **role-array shape** (`workspace.userRoles[uid]`), not on `users.workspaces` membership registry.
- **`rolesVersion` migration mechanism is live** (`useWorkspace.jsx:143`): `workspace.rolesVersion !== 2` triggers `migrateWorkspaceRoles()` auto-run. Provides precedent + tooling for future schema migrations.

**Per-option impact assessment for a/b/c (evidence only — no recommendation per brief):**

- **Option (a) migrate `workspaces: string[]` → `workspaceMemberships: [{slug, role, joinedAt}]`** — Because zero consumers read the existing field, the "breaking change" cost is effectively zero in app code. Firestore rules untouched. The only "consumer" is the `arrayUnion` writer in `useWorkspace.jsx` which becomes an object-builder writer. **Cost ≈ refactor 1 writer + write a one-shot migration script.** External tooling/dashboards reading `users/{uid}` from Console may need to know about the rename.
- **Option (b) parallel `workspaceRoles: { [slug]: role }`** — Non-breaking. But creates two sources of truth for role (workspace.userRoles[uid] **and** users.workspaceRoles[slug]), risking drift during partial writes. Current code reads from workspace doc; would need consistency policy. **Cost ≈ low write-time but ongoing maintenance burden + cognitive load.**
- **Option (c) per-workspace member doc `/workspaces/{slug}/members/{uid}`** — Non-breaking to user doc. Largest refactor: `getRolesForUser(workspace, uid)` rewritten as separate doc read; `firestore.rules` `rolesOf(slug, uid)` helper rewritten; all UI role checks become async. Cleanest separation but biggest blast radius. **Cost ≈ high refactor scope + rules rewrite.**

- **Naming alignment:** § 49 uses `defaultWorkspace` (scalar, written at signup). § 63.11 data model uses `defaultWorkspace` consistently — earlier draft mentioned `activeWorkspace` but final § 63 narrative does not. Naming is already aligned; no rename needed.

- **`users.workspaces` initial write path:** not directly traced this pass — likely in `getOrCreateUserProfile()` in `dataService.js` or in `useWorkspace.jsx` first-time path. Flagged for re-verification when Phase 1 schema migration script is drafted.

#### Decision (Resolved 2026-05-19 — Opus + Jacek rozkmina #1)

**Option α — Drop `users/{uid}.workspaces` field entirely.**

**Source of truth:** `workspace.userRoles[uid]` (already exists, already established in security-roles-v2 commits `fb049ac` + `50434fb`).

**App-level "get user's workspaces" query pattern:** collectionGroup query against workspaces, filtering on `userRoles.{uid}` map key presence. Example shape:

```javascript
// Pseudocode — actual implementation in Phase 1 schema work
const workspacesForUser = await db
  .collectionGroup('workspaces')
  .where(`userRoles.${uid}`, '!=', null)
  .get();
```

**Reframe — why original (a)/(b)/(c) became suboptimal:** Phase 0 finding showed zero consumers of `users/{uid}.workspaces` in src/, and role data already lives in `workspace.userRoles[uid]` map. All three original options (workspaceMemberships array, parallel workspaceRoles map, per-workspace members subcollection) would have created duplicate storage of role data on user doc + workspace doc. Phase 0 unlocked a fourth option not visible in original framing: drop the unused field, derive membership from workspace.userRoles, treat workspace doc as single source of truth.

**Rationale:**

1. **Single source of truth.** Zero data duplication. Eliminates write-time consistency discipline (no dual-write pattern needed).
2. **Realistic scale fits collectionGroup query pattern.** Super Coach worst case ≈ 5-10 workspaces. collectionGroup query <100ms at this scale. No scale problem in foreseeable future.
3. **Migration cost effectively zero.** Phase 0 confirmed zero consumers — drop is a one-line schema change + one-shot migration script (delete field from all user docs). No app code refactor needed beyond the writer.
4. **No Phase 1 blocker on Blaze upgrade.** Options γ/δ (Cloud Function maintained cache) required Blaze plan. Option α has no such dependency — Phase 1 schema work can proceed on Spark, with Blaze upgrade deferred to Phase 5 alongside Cloud Functions for aggregation.
5. **Future option open.** If at some hypothetical future scale (1000+ workspaces per user) collectionGroup query becomes too slow, migrate to Cloud Function maintained cache. Deferring this decision costs nothing now.
6. **Rule of thumb:** simplest design that works > sophisticated cache requiring discipline. The unused `users.workspaces` field appears to have been added as a future-cache placeholder; nobody implemented consumers because the cache wasn't actually needed.

**Options β/γ/δ — rejected with reasoning:**

- **β (keep field as app-maintained cache):** Dual-write discipline at every grant/revoke site. Eventual consistency risk if any writer forgets cache update. Cost > benefit at current scale.
- **γ (Cloud Function maintained cache):** Best long-term for scale, but requires Blaze plan (Spark only currently). Infrastructure + monitoring overhead. Premature optimization for current scale.
- **δ (phased β → γ):** Pragmatic transition but accepts β's eventual-consistency risk in interim and γ's overhead long-term. If we'd already had Blaze + Cloud Functions deployed, γ would be marginally better than α; we don't, so α wins.

**Implementation notes (for Phase 1 schema work — separate brief, NOT this commit):**

1. **Drop write path:** identify single arrayUnion writer that adds slug to `users/{uid}.workspaces` (per Phase 0 § 63.3 Findings, this writer exists at workspace creation / member-add flow). Remove the write — workspace.userRoles update alone is sufficient.
2. **One-shot migration script:** delete `workspaces` field from all `/users/{uid}` docs. Single Firestore Admin SDK pass. No data loss because field has zero consumers.
3. **Switcher UI implementation:** collectionGroup query as shown above. Cache result in React state or context for session duration (single query on app load, refresh on workspace grant/revoke).
4. **Firestore rules verification:** confirm `collectionGroup('workspaces')` query with `userRoles.{uid} != null` filter is allowed by current rules (security-roles-v2 commits). Likely already permits this since reads are already gated on `userRoles[uid]` membership. Verify before Phase 1 implementation begins.
5. **Bootstrap auto-join (per § 49 + § 51):** existing user-to-workspace bootstrap logic writes to both userRoles map AND users.workspaces field. Update bootstrap to write only userRoles. Keep auto-join behavior; only the storage location changes.
6. **Verification:** post-migration, run smoke test confirming switcher UI populates correctly for a multi-workspace test account, and Super Coach derivation (`workspace count ≥ 2`) works against collectionGroup result.

**Coupled decisions for next sessions:**

- **`users/{uid}.activeWorkspace`** field — currently undecided. Likely needed to remember user's active workspace across sessions. Decision: separate session (small).
- **`users/{uid}.defaultWorkspace`** — already established per § 51. Independent of α decision.
- **Switcher UI design** — Slack-style switcher per § 63.2 decision. Implementation brief Phase 1+.
- **Super Coach derivation logic** — automatic when workspace count ≥ 2 with layout overlap. Implementation brief Phase 2+.

### 63.4 Decision — Layout ownership (hybrid global library + workspace customization)

**Status quo:** Layouts in `/workspaces/{slug}/layouts/{lid}` — fully workspace-scoped. Each workspace has own copy of same physical layout. Cross-workspace aggregation impossible (no shared layoutId).

**Decision:** **Hybrid model with three layers:**

```
/layouts/{layoutId}                         ← GLOBAL library, super admin owns
  - image, geometry, bunker positions, calibration, mirror config
  - default position names (NXL standard: "Dorito 1", "Snake 50", etc.)
  - represents real physical fields: NXL 2026 official, PXL official, DPL official, etc.

/workspaces/{slug}/layoutOverrides/{layoutId}   ← workspace-specific override layer
  - bunker name remappings (e.g. { bunkerId_xyz: "Dog" instead of "Dorito 1" })
  - workspace zones: danger / sajgon / bigmove polygons drawn by this team
  - workspace-specific minor calibration adjustments

/workspaces/{slug}/customLayouts/{layoutId}     ← fully workspace-private layouts
  - team's own training facility, experimental setups, private fields
  - NOT aggregated cross-workspace (workspace-private by definition)
```

**Read path:** When workspace renders a global layout, merge `/layouts/{lid}` (base) + `/workspaces/{slug}/layoutOverrides/{lid}` (overrides applied at read time).

**Promote to global library:** Super admin only. No workspace submission flow in Phase 1 (clean curated model). Can be added later.

**Rationale:** Satisfies all stated requirements:
- "All data is layout-specific, aggregation must be per layoutId" → global layoutId enables cross-workspace aggregation
- "Bunker naming workspace-specific" → override layer
- "Future drużyna with training facility" → custom layouts
- Monetization clarity: super admin curates library, sells access to `/layouts/{lid}/aggregatedInsights/` per layout
- Updates propagate: NXL changes field spec → super admin updates global → all workspaces see immediately

**Rejected alternatives:**
- Status quo (workspace-scoped) — blocks monetization, kills cross-workspace aggregation
- Pure global (no workspace customization) — coaches can't name bunkers their way, blocks workspace identity
- Fork-on-customize model — fragments shared data, defeats aggregation purpose

**Migration approach:** Per-layout human-in-the-loop classification. Super admin reviews each workspace's existing layouts: "Is this NXL 2026 official field?" → promoted to global library (deduplicated against any existing). "Is this team training pole?" → moved to `customLayouts`. Workspace-specific bunker naming extracted into `layoutOverrides`. Multi-week process, monitored.

**Open questions for CC discovery:**
- Current schema of `/workspaces/{slug}/layouts/{lid}` documents — what fields exist
- How tactics relate (§ 11 Tactic Page says tactics attached to layouts) — tactics also workspace-scoped or global?
- Mirror system (`HALF_FIELD_SPEC.md`) interaction with override layer

**§ 63.4 Findings (Phase 0 discovery, 2026-05-19):**

- **Layout document schema** (verified `dataService.js:582-593` `addLayout` + L595-597 `updateLayout`):
  - `name`, `league` (default 'NXL'), `year` (default current year), `fieldImage` (URL or null)
  - `discoLine` (normalized 0-1, default 0.30), `zeekerLine` (normalized 0-1, default 0.80)
  - `bunkers` (array of `{id, x, y, name, positionName, type, ...}`)
  - `dangerZone`, `sajgonZone` (polygon arrays, optional)
  - `mirrorMode` (default 'y'), `doritoSide` (default 'top') — **mirror config baked into layout doc**
  - `createdAt`, `updatedAt` (server timestamps)
  - `firestore.rules:278-286` gates writes to `isCoach(slug)`.
- **Tactics location:** **WORKSPACE-SCOPED SUBCOLLECTION.** Path `/workspaces/{slug}/layouts/{layoutId}/tactics/{tacId}` (verified `dataService.js:605-625` `subscribeLayoutTactics`). NOT global. Tournament-level tactics also exist as separate path `/workspaces/{slug}/tournaments/{tid}/tactics/{tacId}` (L628-631).
- **Implication for § 63.4 layout library:** if global layout library is introduced, **tactics decision is forced**: either (i) tactics stay workspace-scoped and move under `/workspaces/{slug}/layoutOverrides/` (cleaner separation), or (ii) tactics migrate to global `/layouts/{lid}/tactics/{tid}` (cross-workspace sharing — monetization potential), or (iii) hybrid (workspace-private + globally-shared templates). This sub-decision is currently parked in § 63.14 implicitly but should be explicit before Phase 4.
- **Mirror system interaction:** Mirror config (`mirrorMode`, `doritoSide`) lives in the layout doc. Per § 63.4 design, override layer contains only bunker naming + zones — **mirror config stays global**. Workspace cannot override mirror config in current spec. If a workspace needs mirror override (unlikely but possible), that's a new field in `layoutOverrides` requiring schema extension. Phase 4 work is straightforward as designed.

### 63.5 Decision — Aggregation architecture (phased: manual → scheduled)

**Status quo:** No cross-workspace aggregation exists. Current views compute insights at read time from single workspace's data.

**Decision:** **Phased rollout — manual Phase 1 → scheduled Phase 2.**

**Phase 1 (initial):**
- Cloud Function exists with full aggregation logic (reuses existing `src/utils/coachingStats.js`, `generateInsights.js`)
- **No Cloud Scheduler** — function triggered manually by super admin via UI button "Refresh insights for layout X"
- Snapshot written to `/layouts/{lid}/aggregatedInsights/{snapshotId}` with: `{ timestamp, version, sourceEventIds, byWorkspace: {...}, globalTotals: {...} }`
- Versioning: schema changes bump version, old snapshots retained for compare/audit
- Audit log: `sourceEventIds` array enables traceability (which events contributed to this snapshot)

**Phase 2 (after 2-4 weeks of Phase 1 monitoring):**
- Add Cloud Scheduler triggering function daily (e.g. 3am UTC)
- Manual button retained as safety valve
- Tier gating UI: per-workspace subscriptions, refresh button visible only to paid tier

**Phase 3 (future, not in scope of § 63):**
- Per-event-write incremental triggers (when scale justifies complexity)
- BigQuery export for analytical queries (when workspace count exceeds ~20)

**Rationale:** "Right thing slowly, verifying" filosofia (Jacek's verbatim). Production-grade means validated + monitored + recoverable, not "fully automated day 1." Phase 1 manual gives super admin full control during validation period. Cloud Function code identical Phase 1 → Phase 2 — zero rewriting, just add cron entry.

**Cost model (vs rejected real-time):**
- Real-time on-read: 1M doc reads per page load × $0.06/100K = $0.60/load × 10 loads/day per coach = $6/day per coach → unscalable
- Batch aggregation: 1× compute job amortized over N reads = predictable, cheap
- Same query economics that killed real-time make batch the only viable production option

**Rejected alternatives:**
- Real-time collection group query on every page load — economically infeasible
- Per-event-write incremental triggers — too complex for Phase 1, race condition risk, hard backfill
- BigQuery export — overkill at current scale (2-5 workspaces)

**Default tier gating (Phase 1):** Aggregated views visible only to Super Admin (Jacek). Zero monetization UI. Backend ready, frontend gated. Promotes to Phase 2 with granular per-layout subscriptions (`workspace.subscriptions: [{ layoutId, tier, expiresAt }]`).

**Per-workspace breakdown structure** (enabling Super Coach view):
```javascript
/layouts/{lid}/aggregatedInsights/{snapshotId}
{
  timestamp: ServerTimestamp,
  version: 1,
  sourceEventIds: ['eid1', 'eid2', ...],
  globalTotals: { breakouts: {...}, kills: {...}, ... },
  byWorkspace: {
    'ranger1996': { breakouts: {...}, ... },
    'usteam2026': { breakouts: {...}, ... }
  }
}
```

Super Coach view filters `byWorkspace` to their memberships in app code. Firestore rules enforce that they can only read snapshots; aggregation already strips raw data.

**Open questions for CC discovery:**
- Firestore project plan (Spark vs Blaze) — Cloud Functions require Blaze
- Existing Cloud Functions setup (if any) for guidance on conventions
- Sentry monitoring readiness for tracking Function execution health

**§ 63.5 Findings (Phase 0 discovery, 2026-05-19):**

- **Firestore plan: SPARK (free tier).** `firebase.json` has only `firestore` block (rules + indexes), **no `functions` config**. `.firebaserc` lists only `pbscoutpro` default project. No `functions/` directory in repo. **Upgrade to Blaze required before Phase 5 implementation begins** — billing setup is itself a prerequisite step Jacek owns.
- **Existing Cloud Functions: NONE.** Clean slate. No conventions to inherit; can adopt fresh Node.js 20+ patterns.
- **Sentry readiness: COMPATIBLE, READY.** `src/services/sentry.js` (52 lines) shipped 2026-04-17. EU ingest DSN hardcoded with `VITE_SENTRY_DSN` env override. `tracesSampleRate: 0.1` (10% sampling). User-context helper `setSentryUser()` (L32-37) tags workspace + role. Same project DSN can ingest Function errors (separate Node.js SDK import in Function code). Phase 5 should add Function-side Sentry init at function bootstrap + error-context enrichment (workspace ID, event ID, aggregation phase).

### 63.6 Decision — URL routing + localStorage (workspace slug in path)

**Status quo:** `pbscoutpro_activeTournament` localStorage (no workspace prefix). URLs `/tournament/:tid/...` and `/training/:tid/...` (no workspace context). § 43 covers scouting query-param semantics (`?scout=teamId&mode=new`) at a different layer — those rules continue to apply within the new workspace-prefixed URL structure.

**Decision:** **Workspace slug in URL path, minimal localStorage.**

URL structure:
```
/w/:workspaceSlug/events/:eid/matches/:mid    ← event details inside workspace
/w/:workspaceSlug/team/:sid                    ← scouted team within workspace
/w/:workspaceSlug                              ← workspace home (Scout/Coach/More tabs)
/player/:pid/stats                             ← player stats (cross-workspace if Super Coach view)
```

localStorage:
- `pbscoutpro_lastWorkspace` — global, last workspace user was in (for auto-route on app open)
- `pbscoutpro_w_{slug}_state` — minimal per-workspace state (collapse states, last active tab)
- No `pbscoutpro_activeTournament` — derived from URL

Route guard pattern: every route under `/w/:slug/` checks `currentUser.workspaces.includes(params.slug)` (or whatever Phase 0 settles on for membership representation). Unauthorized → redirect to user's accessible workspace list or login.

**Rationale:**
- Production-grade requires URL = source of truth. Shareable links matter (super admin sharing layout insight URL with workspace owner).
- Security check trivial — route guard reads slug from URL.
- Workspace switcher = navigate to new URL.
- Debug + support — user reports problem with link, immediately know which workspace.
- Future-proof for Super Coach UI — workspace drop-down navigates to `/w/:slug/...`.

**Rejected alternatives:**
- Workspace-prefixed localStorage keys (`pbscoutpro_workspace_{slug}_activeEvent`) — URL ambiguity, security check brittle
- JSON payload per workspace in localStorage — concurrent tab races possible, jw. URL ambiguity

**Migration approach:**
- Per-app-startup migration: read old keys (`pbscoutpro_activeTournament`), resolve workspace slug from `users/{uid}.defaultWorkspace` (or first `workspaces[]` entry as fallback), rewrite to new keys, remove old
- URL migration: old routes (`/tournament/:tid/...`, `/training/:tid/...`) keep redirect handler for N weeks (default 8) routing to `/w/:slug/events/:eid/...`
- After redirect window: remove old route handlers

**Open questions for CC discovery:**
- Full grep `localStorage\.` in `src/` — list all keys to migrate
- Full grep `Route path=` in `src/App.jsx` — list all routes to refactor
- Existing route guard mechanism (if any)

**§ 63.6 Findings (Phase 0 discovery, 2026-05-19):**

- **localStorage keys inventory** (Phase 3 migration scope):
  - `pbscoutpro-workspace` (`useWorkspace.jsx:18`, JSON `{slug, name}`) — active workspace state
  - `pbscoutpro_lang` (`useLanguage.jsx:4`) — language preference
  - `pbscoutpro-handedness` (`field/drawLoupe.js:12`) — dominant hand for loupe
  - `pbscoutpro_anthropic_key` (`VisionScan.jsx:160`) — Vision API key
  - `API_KEY_STORAGE` constant (`ScheduleImport.jsx:17`, `OCRBunkerDetect.jsx:12`) — schedule import API key
  - `squadCode_{layoutId}` dynamic (`LayoutDetailPage.jsx:78`) — squad code per layout
  - `TAB_KEY` constant (`MainPage.jsx:33`) — last active tab
  - `LAST_KIND_KEY` constant (`MainPage.jsx:38`) — last event kind
  - `HANDEDNESS_KEY` constant (`MoreShell.jsx:113`, `MoreTabContent.jsx:142`, `TrainingMoreTab.jsx:268`)
  - PPT draft persist key per player (`WizardShell.jsx:65`)
  - **NOTE:** `pbscoutpro_activeTournament` (mentioned in § 63.6) **not found** in current code — either already removed in earlier refactor or renamed. Verify before Phase 3 migration scripts.
- **Routes inventory** (Phase 3 refactor scope) — 28 route paths in `App.jsx:124-155`:
  - User + workspace gated: `/`, `/teams`, `/team/:teamId`, `/players`, `/tournament/:tournamentId/team/:scoutedId`, `/player/:playerId/stats`, `/training/:trainingId/setup`, `/training/:trainingId/squads`, `/training/:trainingId/results`, `/training/:trainingId`, `/profile`, `/scouts`, `/scouts/:uid`, `/my-issues`, `/player/log`, `/player/log/wizard`
  - `<RouteGuard>` (Coach+ only): `/layouts`, `/layout/new`, `/layout/:layoutId`, `/layout/:layoutId/bunkers`, `/layout/:layoutId/ballistics`, `/layout/:layoutId/analytics/:mode`, `/tournament/:tournamentId/tactic/:tacticId`, `/layout/:layoutId/tactic/:tacticId`
  - `<RouteGuard>` (Scout+ only): `/tournament/:tournamentId/match/:matchId`, `/training/:trainingId/matchup/:matchupId`
  - `<AdminGuard>` (Super Admin only): `/debug/flags`, `/settings/members`, `/settings/members/:uid`
- **Route guard mechanism:** `<RouteGuard>` wrapper (`App.jsx:12`) gates by role; `<AdminGuard>` (L175-182) checks `effectiveIsAdmin` from ViewAs context, redirects to `/` with `blockedRoute` state. `LoginGate` **DELETED** per § 51.3. `PbleaguesOnboardingPage` auto-shows if `!linkedPlayer && !userProfile?.linkSkippedAt` (L100-106). `PendingApprovalPage` auto-shows if `isPendingApproval` (L108-114). `<BlockedRouteToast>` (L187-200) surfaces denied redirects.
- **Phase 3 scope reality check:** 28 routes to refactor + 10 localStorage keys to migrate. All routes currently flat (no workspace prefix). Adding `/w/:workspaceSlug/` prefix to gated routes is mechanical; route guard already has the role-resolution infrastructure (just add `params.slug` membership check).

### 63.7 Decision — Wizard host (container + shared steps + type-specific sub-flows)

**Status quo:** `NewTournamentModal` with 3-way selector (Tournament / Sparing / Training) from 04-15. Likely `NewTrainingModal` as separate component (🟡 CC verify).

**Decision:** **Container `NewEventWizard` with type selector + shared step components + type-specific sub-flow components.**

Structure:
```
NewEventWizard.jsx                          ← container, type selector on step 1
  ├─ steps/TypeSelector.jsx                 ← step 1 (shared)
  ├─ steps/LayoutSelectionStep.jsx          ← shared step
  ├─ steps/NameStep.jsx                     ← shared step
  ├─ steps/DateStep.jsx                     ← shared step
  ├─ flows/TournamentSubFlow.jsx            ← tournament-specific: league + division + year + matches
  ├─ flows/SparingSubFlow.jsx               ← sparing-specific: opposing team selection
  └─ flows/TrainingSubFlow.jsx              ← training-specific: squad ranges + attendees
```

Entry points:
- TournamentPicker (renamed EventPicker per 63.8) "+ New event" button → `<NewEventWizard>`
- Empty state on workspace home "Create your first event" → `<NewEventWizard>`

**Rationale:**
- Single entry point = clean UX
- Shared steps eliminate duplication without monolithic component
- Adding new event type (e.g. "league series") = new sub-flow file, no rewriting
- De facto already heading this way: `NewTournamentModal` with 3-way selector is pre-step toward this

**Rejected alternatives:**
- Three separate wizards (`NewTournamentModal`, `NewSparingModal`, `NewTrainingModal`) — duplication of shared steps, inconsistency risk, cluttered entry points
- Single monolithic wizard with conditional fields — large component, hard to maintain, scales badly

**Migration approach:**
- Refactor `NewTournamentModal` → `NewEventWizard` (rename + reorganize internals)
- If separate `NewTrainingModal` exists, its flow becomes `<TrainingSubFlow>`
- Extract shared steps to `src/components/eventWizard/steps/`
- All call sites updated to invoke `<NewEventWizard>`

**Open questions for CC discovery:**
- Whether `NewTrainingModal` exists as separate component or training flow lives in `NewTournamentModal`
- Current state of "+ New event" empty state / picker dashed card
- Whether `eventType: 'sparing'` create flow is implemented end-to-end or stubbed

**§ 63.7 Findings (Phase 0 discovery, 2026-05-19):**

- **`NewTrainingModal`: DOES NOT EXIST** as separate component. Training flow lives inside `NewTournamentModal.jsx` (145 lines) with a 3-way type selector (`type: 'tournament' | 'sparing' | 'training'`) at L23. Form state branches per type at L39-67; submit branches at L94-145.
- **Sparing create flow: IMPLEMENTED, NOT STUBBED.** `NewTournamentModal.jsx:107-122` fully implemented sparing branch — collects name + date + layout, calls `ds.addTournament({ eventType: 'sparing', ... })`. (See § 63.2 findings: the write path works; the dead-end is downstream — nothing reads sparings.)
- **Missing for § 63.7 spec:** sparing flow does NOT collect **opposing team** field. § 63.7's `SparingSubFlow` spec calls for opposing team selection. Current code has none. This is net-new work in Phase 7 wizard refactor.
- **§ 63.7 scope assessment:** the refactor is more "rename + extract + add opposing-team-step" than "build from scratch." Container `NewEventWizard` is a rename of `NewTournamentModal` with the existing 3-way selector becoming `<TypeSelector>` step 1. Shared steps (NameStep, DateStep, LayoutSelectionStep) are extractions from existing inline form code. TournamentSubFlow + TrainingSubFlow are extractions of existing branches; SparingSubFlow is partial extraction + new opposing-team step.

### 63.8 Decision — Copy/UI context (mixed: generic in cross-type, specific in context)

**Status quo:** "Tournament" / "Training" hard-coded in many places. "Matchup" used in training only. "Match" used in tournament/sparing.

**Decision:** **Mixed copy strategy:**

Rules:
- **Cross-type list views, picker, navigation** → generic "event"
  - "Choose event" / "Active event" / "Add event"
  - `TournamentPicker` → `EventPicker`
- **Within specific event** → display event name + type pill
  - Page header: "NXL Czechy" + "Tournament" pill
  - "Sparing vs Tigers" + "Sparing" pill
- **Sub-entities** → unify to "match" globally
  - Eliminate "matchup" everywhere
  - Polish: "mecz" globalnie (was: "spotkanie" / "mecz" mix)
- **Status badges** (LIVE, SCHED, FINAL, CLOSED) — bez zmian, type-agnostic
- **Tab labels** (Scout / Coach / More) — bez zmian, type-agnostic
- **"Your team"** → workspace identity context ("Ranger Warsaw") — retained as user/workspace identity marker
- **"Your tournament"** → contextualized: "This event" or specific event name

**Polish naming for event types:** Turniej / Sparing / Trening — retained, no change.

**Rationale:**
- Generic copy for cross-type contexts (picker doesn't care if it's tournament or training)
- Specific copy in semantic contexts (coach thinks "Tournament: NXL Czechy", not "Event: NXL Czechy")
- Type pills as visual markers — quick recognition without verbose copy
- "Matchup" elimination — inconsistency that fragments mental model

**Rejected alternatives:**
- Type-specific everywhere (no "event" word) — verbose, conditional copy in generic components
- Generic everywhere ("event" only, no specific) — too abstract for coach mental model

**Migration approach:**
- i18n string audit: identify all "tournament" / "training" / "matchup" strings
- "Matchup" globally → "match" (PL: "spotkanie" → "mecz")
- New generic strings added: `event.title`, `event.add`, `event.picker.title`
- Type pills as new shared component `<EventTypeBadge type="tournament|sparing|training">`

### 63.9 Decision — i18n scalability (i18next library + structured locale files)

**Status quo:** Custom `src/utils/i18n.js` flat dictionary PL+EN (from 04-15, commit `66b856a`). `useLanguage` hook with localStorage persistence. `LangToggle` pill component (binary toggle). Polish default.

**Decision:** **Migrate to `i18next` + `react-i18next` library.** Production-grade i18n foundation.

Architecture:
1. **Per-language JSON files**: `src/locales/pl.json`, `en.json`, `es.json`, etc. (was: single file)
2. **Hierarchical key namespacing**: `event.tournament.title` (was: `event_tournament_title` flat)
3. **Library**: `i18next` + `react-i18next` (~30KB gzipped)
4. **Per-user language preference**: `/users/{uid}.language`
5. **Workspace default language**: `/workspaces/{slug}.defaultLanguage`
6. **Fallback chain**: user lang → workspace default → EN → key (dev mode), → EN (prod)
7. **`LanguageSelector`** component (dropdown) replaces `LangToggle` (binary). LangToggle retained when only 2 languages active (smart switch).
8. **Locale-aware formatting**: dates/numbers via `Intl` API (built-in, no extra lib)
9. **Translation completeness UI**: super admin view "ES is 73% complete" as curation tool (Phase 2, after Spanish or other languages added)

**Rationale:**
- Polish has 3 plural forms (1 jabłko / 2 jabłka / 5 jabłek), English has 2 — i18next handles natively via ICU MessageFormat. Custom would require hand-rolled hacks.
- Translation management ecosystem (Crowdin, Lokalise) integrates out-of-box — when 5+ countries onboard, structured workflow available.
- Bundle cost ~30KB gzipped — fraction of full app bundle.
- Migration mechanical: `t('key')` API compatible between custom and i18next, refactor is utility swap.

**Rejected alternatives:**
- Status quo evolution (extend custom i18n) — eventually rebuilds library in local code, no plural handling, no ICU
- `lingui` (lighter modern alternative) — less ecosystem support, fewer translation service integrations
- `react-intl` (formatjs) — comparable but heavier, less common in React community

**Migration approach (independent track from multi-tenant):**
- Phase 1: install i18next, parallel run with custom `useLanguage` hook for transition period
- Phase 2: migrate all `t()` call sites to `useTranslation` from `react-i18next` (mechanical refactor, ~150-200 locations estimated)
- Phase 3: remove custom `src/utils/i18n.js`, switch to JSON file imports
- Phase 4: introduce `LanguageSelector` component, drop `LangToggle` when 3+ languages active

**Open questions for CC discovery:**
- Full list of i18n keys currently in `src/utils/i18n.js` (for migration coverage)
- Whether any non-i18n hardcoded strings remain (per 04-15 deploy log noted precommit warnings about Polish strings)
- Sentry breadcrumb compatibility with i18next (for translated error messages)

**§ 63.9 Findings (Phase 0 discovery, 2026-05-19):**

- **`src/utils/i18n.js` size:** 1804 lines. Structure: **flat dictionary** (NOT nested), underscore-separated keys (`event_title`, `scout_ranking`, `onboarding_pbli_input_placeholder`). `T.pl` primary, `T.en` secondary. Languages: `['pl', 'en']` (L9).
- **Estimated key count:** ~400-500 keys (Navigation, tournament/events, scout ranking, player stats, lineup analytics, scouted team page, coach notes, member management, PBLI onboarding, pending approval, misc UI). Migration scope per § 63.9 Phase 2 (~150-200 `t()` call sites) is roughly consistent with key count.
- **Hardcoded strings:** zero `// TODO i18n` or `// FIXME i18n` markers found in `src/`. Spot-checks of `MatchPage.jsx` and `ScoutedTeamPage.jsx` (first 100 lines each) showed no hardcoded Polish in UI strings.
- **Known i18n debt:** `src/components/field/drawZones.js` L38-72 has hardcoded English labels (`DISCO`/`ZEEKER`/`DANGER`/`SAJGON`/`BIG MOVE`) per canvas audit § 1.2. Commit `66b856a` (2026-04-15 i18n) did not touch this file. Pre-i18next cleanup item.
- **i18next migration realism:** flat key structure maps cleanly to flat JSON files in Phase 1; converting to namespaced keys (`event.tournament.title`) is the actual cost of Phase 2 refactor. Could ship Phase 1 (lib install + parallel) without forcing key restructure first.

### 63.10 Security model summary

Three permission tiers consolidated from decisions above:

| Tier | Identity | Read scope | Write scope | UI affordances |
|---|---|---|---|---|
| **Workspace member** | Firebase auth user + `/users/{uid}.workspaces[]` (per § 49) | `/workspaces/{slug}/...` where member | `/workspaces/{slug}/...` where member, role-gated (per § 49.4 strict tab matrix) | Scout/Coach/More tabs, event creation, point logging |
| **Super Coach** | Auto-derived: member of 2+ workspaces | All from Workspace member tier, PLUS `/layouts/{lid}/aggregatedInsights/{snapId}` filtered to `.byWorkspace[membership.slugs]` | Same as Workspace member | Workspace switcher, aggregated layout insights view |
| **Super Admin** | Email match against `ADMIN_EMAILS` (jacek@epicsports.pl) | ALL | ALL, plus aggregation trigger, global layout library curation, subscription management | Admin panel, layout library promote, aggregation refresh, tier management UI |

Firestore rules enforce isolation by path structure (`/workspaces/{slug}/...`), not query filters. Production-grade security by default — no risk of forgotten filter leaking cross-workspace data.

### 63.11 Data model summary

```
GLOBAL (super admin owns):
/users/{uid}                                         ← user profile (extends § 49.1)
  - email, displayName, language, photoURL
  - workspaces: string[]            ← per § 49 (Phase 0 may evolve to richer form, see § 63.3)
  - defaultWorkspace: slug          ← per § 49
  - roles: string[]                 ← per § 49 (bootstrap default)
  - hero: bool                      ← legacy global hero flag

/layouts/{layoutId}                                  ← shared layout library
  - image, geometry, bunker positions, calibration
  - mirror config, doritoSide
  - default position names
  - createdBy: 'super-admin', curatedFrom: 'workspace-slug-or-null'

/layouts/{layoutId}/aggregatedInsights/{snapId}      ← cross-workspace aggregation
  - timestamp, version, sourceEventIds
  - globalTotals: {...}
  - byWorkspace: { 'slug1': {...}, 'slug2': {...} }

WORKSPACE-SCOPED:
/workspaces/{slug}                                   ← workspace metadata
  - name, defaultLanguage, members[]
  - userRoles: { [uid]: role[] }   ← per § 49.3 canonical role store
  - subscriptions: [{ layoutId, tier, expiresAt }]  ← future Phase 2 tier gating
  - createdAt, ownerUid

/workspaces/{slug}/events/{eid}                      ← unified events (this § 63.2 decision)
  - type: 'tournament' | 'sparing' | 'training'
  - name, layoutId, status, dates
  - eventType-specific fields (league, division for tournament; opposing team for sparing; squads for training)

/workspaces/{slug}/events/{eid}/matches/{mid}/points/{pid}    ← match data (unified for all event types)
/workspaces/{slug}/events/{eid}/matches/{mid}/points/{pid}/shots/{sid}    ← shots subcollection (per § 35-36 selflog)

/workspaces/{slug}/layoutOverrides/{layoutId}        ← workspace layer over global layout
  - bunkerNameOverrides: { bunkerId: customName }
  - zones: { danger, sajgon, bigmove polygons }
  - calibrationAdjustments (optional)

/workspaces/{slug}/customLayouts/{layoutId}          ← workspace-private layouts (training fields, etc.)
  - same shape as /layouts/{layoutId} but workspace-private
  - never aggregated cross-workspace

/workspaces/{slug}/teams/{teamId}                    ← teams (CC verify: currently here or global?)
/workspaces/{slug}/players/{playerId}                ← players (CC verify: currently here or global?)
/workspaces/{slug}/scoutedTeams/{sid}                ← opponent analysis (workspace-private)
/workspaces/{slug}/notes/{nid}                       ← coach notes
/workspaces/{slug}/breakoutVariants/{teamId}/...     ← per § 35 selflog variants
```

**Open questions for CC discovery:**
- Are `/workspaces/{slug}/teams/` and `/players/` workspace-scoped or already global? Memory says "PBLI integration started but unclear if collection-level migration happened"
- Should teams/players become global with workspace-level metadata overlay? (Following layout pattern from § 63.4) — this is a separate decision for next session

**§ 63.11 Findings (Phase 0 discovery, 2026-05-19):**

- **Players: WORKSPACE-SCOPED.** Path `/workspaces/{slug}/players/{playerId}` (verified `dataService.js:111-128` `subscribePlayers` + `addPlayer`, both use `bp()` workspace prefix; `findPlayerByPbliId` L968-978 also workspace-scoped).
- **Teams: WORKSPACE-SCOPED.** Path `/workspaces/{slug}/teams/{teamId}` (verified `dataService.js:147-164` `subscribeTeams` + `addTeam`).
- **Scouted teams: TOURNAMENT-SCOPED.** Path `/workspaces/{slug}/tournaments/{tid}/scouted/{sid}` (`dataService.js:206-209`). After § 63.2 events unification, parent path shifts to `/workspaces/{slug}/events/{eid}/scoutedTeams/{sid}` (also collection name plural shift).
- **PBLI is per-workspace, NOT a global registry.** 21 files reference PBLI/PBLeagues. Player doc carries `pbliId` (L122) + `pbliIdFull` (L1109) + `linkedUid` (L1160-1182 for member↔player linking per § 49.8). `findPlayerByPbliId` (L968-978) queries within workspace via `normalizePbliId()`. **Two workspaces with same real person = separate player records + separate `pbliId` links.** Cross-workspace player identity is the parked decision in § 63.14.
- **Implication for § 63.14 player-identity-cross-workspace decision:** the existing `pbliId` field on workspace-scoped player docs is **a ready-made bridge** if cross-workspace identity is needed later. Promote players to global `/players/{pid}` keyed by `pbliId` with workspace-overlay docs holding workspace-specific notes/stats — mirrors the § 63.4 layout pattern cleanly. Bridge not yet built, but field plumbing exists.

### 63.12 Migration approach summary

**High-level phasing** (detailed migration plan + per-phase CC briefs in separate document, next session):

| Phase | Scope | Validation gate | Estimated duration |
|---|---|---|---|
| **0. CC discovery** | Verify all `🟡` assumptions in § 63 against live code. Resolve § 63.3 schema sub-option a/b/c. Output: updated § 63 with all questions resolved + accurate data model | All `❓`/`🟡` markers cleared, schema path chosen | 1-2 sessions |
| **1. Schema foundation** | Apply Phase 0 schema decision (extend `workspaces[]` or introduce richer form). Add `defaultLanguage`, `language` fields for i18n preparation. | All existing users migrated per chosen schema path | 1 week |
| **2. Events unification** | Create `/workspaces/{slug}/events/{eid}`. Dual-write 4-6 weeks. Read from new collection only. | Sentry shows zero errors related to dual-write desync for 2 weeks | 5-7 weeks |
| **3. URL + localStorage** | New `/w/:slug/` URL structure. Old URLs redirect. localStorage migration on app startup. | All routes work, redirects log < 5% of traffic | 2 weeks |
| **4. Layout library** | Promote workspace layouts to global library (super admin curated). Introduce overrides collection. Move workspace-private layouts to `customLayouts`. | All workspaces resolve layouts correctly, naming overrides apply | 3-4 weeks (per-layout review) |
| **5. Aggregation Phase 1** | Cloud Function with manual trigger. Snapshot writes to `/layouts/{lid}/aggregatedInsights/`. Super admin UI for trigger. | Manual refresh produces valid snapshot, byWorkspace breakdown correct | 2 weeks |
| **6. Aggregation Phase 2** | Add Cloud Scheduler (daily). Tier gating UI for paid workspaces. | Scheduled runs complete, no monitoring alerts for 2 weeks | 1 week post-Phase 5 + 2 weeks soak |
| **7. Wizard refactor** | `NewEventWizard` with sub-flows. Shared step components extracted. | All event types creatable via unified wizard | 1 week |
| **8. Copy + matchup→match** | i18n strings updated. "Matchup" renamed globally. EventTypeBadge component. | UI consistent across event types | 1 week |
| **9. i18next migration** | Library install. Migrate `t()` call sites. JSON file split. LanguageSelector. | All translation tests pass, no missing keys in PL+EN | 2 weeks |
| **10. Cleanup** | Remove dual-write fallbacks. Remove old URL redirects. Remove `/workspaces/{slug}/layouts/` legacy. | Code clean of migration scaffolding | 1 week |

Total estimated calendar: **~6 months** with monitoring soak periods. Aggressive parallelization possible for some tracks (i18next migration independent of multi-tenant work, can run in parallel).

**Cross-dependencies:**
- Phase 1 (schema foundation) blocks on Phase 0 § 63.3 schema sub-option decision
- Phase 4 (layout library) depends on Phase 1 (schema) + Phase 2 (events unification) for cross-workspace aggregation prep
- Phase 5 (aggregation) depends on Phase 4 (global layouts)
- Phase 9 (i18next) can run independently in parallel with any phase
- Phase 7 (wizard refactor) depends on Phase 2 (events unification)
- Phase 10 (cleanup) is last, gates removal of compatibility code

### 63.13 Cross-references

- `docs/DESIGN_DECISIONS.md` § 10 — Data Model (existing, to be updated post-migration)
- `docs/DESIGN_DECISIONS.md` § 27 — Apple HIG (governs all UI changes in this work — workspace switcher, EventPicker, type pills)
- `docs/DESIGN_DECISIONS.md` § 31 — Bottom tab navigation (TournamentPicker → EventPicker rename, context bar update)
- `docs/DESIGN_DECISIONS.md` § 32 — Training mode (TrainingSubFlow inherits training-specific patterns documented here)
- `docs/DESIGN_DECISIONS.md` § 33 — User Accounts + Scout Ranking (authentication foundation, to be extended with workspace-membership UI)
- `docs/DESIGN_DECISIONS.md` § 35-36 — Player Self-Report (compatible — scoped per-event regardless of event type)
- `docs/DESIGN_DECISIONS.md` § 37 — Documentation discipline (this section follows the rules)
- `docs/DESIGN_DECISIONS.md` § 38 — Security Role System + View Switcher (related — commits 3+4 still pending per `security-roles-v2` branch)
- `docs/DESIGN_DECISIONS.md` § 42-44 — Per-coach point streams + URL entry semantics + Brief 9 polish (concurrent scouting model, superseded § 18; § 63 routing layer wraps § 43 scouting query-params)
- `docs/DESIGN_DECISIONS.md` § 49 — Unified auth + roles + tab visibility (**schema foundation for Decision 2** — `users/{uid}.workspaces[]` + `defaultWorkspace` + bootstrap auto-join already shipped 2026-04-23)
- `docs/DESIGN_DECISIONS.md` § 51 — Signup flow redesign — access-first + Variant 3 reactive moderation (**schema foundation for Decision 2** — supersedes § 49.10 "auto-join nie auto-login" with auto-enter-default flow)
- `docs/DESIGN_DECISIONS.md` § 57 — Multi-source observations architecture (**orthogonal axis** — within-workspace self-log/scout unification, not cross-workspace aggregation; § 63.2 events unification generalizes the per-event source-of-truth pattern § 57 established)
- `docs/architecture/CANVAS_ARCHITECTURE.md` — independent track, no direct dependency on § 63
- `docs/architecture/MULTI_TENANT_MIGRATION_PLAN.md` (NEW, to be created next session) — detailed migration plan with per-phase CC briefs
- Reserved: `docs/architecture/SUPER_ADMIN_INTERFACE.md` (NEW, future) — super admin UI for layout curation, subscription management, aggregation triggering

### 63.14 Resolved + Parked items (status tracked, updated 2026-05-19)

This subsection tracks decisions that emerged from § 63 work but are either resolved (with date) or parked (awaiting future rozkmina). Items resolved here are intentionally NOT moved to their own sub-section — they stay listed as ✅ for audit trail.

#### ✅ Player identity cross-workspace — RESOLVED formal 2026-05-19

**Decision:** Players are **global**, same person has one `playerId` across all workspaces. Mirrors layout pattern (§ 63.4): global resource, workspace observes/scouts but does not own.

**Formal lock 2026-05-19** (rozkmina #3): schema + migration approach detailed in § 63.15. Player can have multi-league memberships handled via junction table per § 63.15.

**Rationale (per Jacek 2026-05-18):** "gracze są unikalni dla całej aplikacji globalnie - to są te same osoby, które będą miały przypisane dane przez każdego scoutującego coacha." Same physical person across PL and US leagues if both contexts apply. Cross-workspace stats coherent.

**Phase 0 finding (§ 63.11):** Current state is workspace-scoped (`/workspaces/{slug}/players/{playerId}`). PBLI integration per-workspace with `pbliId` as ready-made bridge to global identity — migration to global has `pbliId` as natural deduplication key.

**Migration approach (high-level — detailed plan in `MULTI_TENANT_MIGRATION_PLAN.md`):**
- Add `/players/{playerId}` global collection
- Workspace players become **observations** of global player (per-workspace context: scouted notes, custom display name, workspace-specific data)
- `pbliId` as bridge: matching pbliId across workspaces → same global playerId
- Dual-write transition period
- Workspace's `/workspaces/{slug}/players/{playerId}` deprecated, replaced by global reference

#### ✅ Teams as global — RESOLVED formal 2026-05-19

**Decision:** Teams are **global**, with workspace-specific scouting context retained in `/workspaces/{slug}/scoutedTeams/{sid}` (already-existing pattern, unchanged).

**Per Jacek 2026-05-18:** "Baza drużyn powinna być globalna (w oparciu o bazę danych Pbleagues). Ta baza powinna być dostępna dla wszystkich workspaces."

**Formal lock 2026-05-19** (rozkmina #3): full schema + relationship to leagues + memberships detailed in § 63.15.

**PbLeagues integration:** super admin can bulk-import official teams from PbLeagues database with `pbliTeamId` as natural dedup key. Workspace coaches can create custom teams (training/sparing partners not in PbLeagues) — no `pbliTeamId`, dedup by name suggestion at create time. Super admin can later promote custom teams to PbLeagues-backed or merge duplicates.

**Brand grouping:** one physical "team brand" may have entries in multiple leagues (e.g. "Lucky 15s NXL EU Pro" + "Lucky 15s PXL" are separate team docs but conceptually related brand). `parentTeamId` field optional for UI grouping. Child teams pattern (Ranger Ring/Rage/Rebel/Rush per parent "Ranger Warsaw") naturally handles this.

#### ✅ GlobalEvents architecture — RESOLVED formal 2026-05-19

**Decision:** Option B locked — `/globalEvents/{geid}` registry + optional workspace event linkage. Three architecture options analyzed (A heuristic fingerprint, B registry, C auto-dedup Cloud Function); A and C rejected. Full content in § 63.16.

**Phase boundaries α/β/γ/δ locked** (rozkmina #3) — aligned with multi-tenant migration phases. See § 63.16.

**Reconciliation preliminary preference:** trust-one-source + manual super admin escape hatch. Formal lock deferred to Phase γ when actual data exists to inform choice. See § 63.16.

#### Other parked items (no status change since § 63 landing)

- **Data residency:** Firestore region selection. US team gets +100ms latency if region is EU. Acceptable for v1 or multi-region required? Decision needed before US workspace creation.
- **GDPR / data privacy implementation:** Player has right to data removal. How implemented across multi-workspace? Right to portability? Cloud Function for player data export.
- **Subscription model details:** Payment flow (Stripe?), billing cycle, plan tiers (free/pro/enterprise). Granular per-layout subscriptions decision locked but UX details open.
- **Tier gating Phase 1 default:** Admin-only Phase 1 soft-confirmed. Verify before Phase 5 implementation begins.
- **Federated authentication (SSO):** Future enterprise customers want identity provider integration. Not Phase 1.
- **Workspace deletion / archival:** When workspace stops paying, what happens to data? Frozen / deleted / exportable?

### 63.15 Global Resources Architecture (approved 2026-05-19, rozkmina #3)

> Schema + relationship model for global resources: leagues, teams, players, team memberships. Aligns with § 63 multi-tenant architecture. Captures decisions 2b (configurable leagues) + 2c (player–team many-to-many) from rozkmina #3 packet.

#### 63.15.1 Leagues — configurable global resource

**Schema:**
```
/leagues/{leagueId}
  name: "NXL US"                    // full display name
  shortName: "NXL"                  // pill display, may collide across leagues
  region: "US" | "EU" | null        // optional disambiguation
  parentLeagueFamily: "nxl" | null  // optional — groups NXL US + NXL EU under "NXL" brand for UI
  divisions: [
    { id: "pro",       name: "Pro",       order: 1 },
    { id: "semi-pro",  name: "Semi-Pro",  order: 2 },
    { id: "d1",        name: "D1",        order: 3 },
    ...
  ]
  active: boolean
  createdBy: uid                     // super admin uid (jacek@epicsports.pl for now)
  createdAt: Timestamp
  updatedAt: Timestamp
```

**Multi-league example (per Jacek 2026-05-19):** NXL US and NXL EU are **separate league documents** (each has own divisions, own teams, own player memberships). `parentLeagueFamily: "nxl"` allows UI grouping ("show all NXL teams") without merging membership logic.

**Migration:** current `LEAGUES` constant (NXL/PXL/DPL in `theme.js`) + per-league `DIVISIONS` constants hoist to Firestore `/leagues/` as 3 pre-populated documents during Phase 2. Super admin can edit existing leagues or add new ones via super admin UI (Phase 2+ feature).

**Access control:**
- Read: all authenticated users (every workspace consumes the league list)
- Write: super admin only (jacek@epicsports.pl per current featureFlags pattern; expand to multi-super-admin in future)
- Distinct from workspace password gate (workspace password protects workspace-internal actions; super admin gate protects cross-workspace global resources)

**UI consumption pattern:**
- Workspace tournament creation flow: league dropdown populated from `/leagues/` collection
- Workspace team creation flow: league + division dropdowns cascaded
- Settings pages: read-only league display

**Why configurable not hardcoded:** new paintball leagues emerge (regional pro circuits, new format leagues). Hardcoded enum requires code deploy per league add; Firestore-backed enables super admin to onboard new leagues immediately.

#### 63.15.2 Teams — global with PbLeagues bridge

**Schema:**
```
/teams/{teamId}
  name: "Lucky 15s"                  // full display name
  shortName: "Lucky"                 // optional, for compact UI
  pbliTeamId: "..." | null           // PbLeagues identifier — natural dedup key
  parentTeamId: teamId | null        // for child teams pattern (Ranger Ring/Rage/...)
  brandId: brandId | null            // optional brand grouping across leagues
  leagueId: "l_nxl_eu"               // reference to /leagues/{leagueId}
  divisionId: "pro"                  // from referenced league.divisions[]
  active: boolean
  createdBy: uid                     // workspace coach uid or super admin uid
  createdByWorkspace: slug | null    // null if super admin curated, else workspace that created
  createdAt: Timestamp
  updatedAt: Timestamp

  // No roster field — derived from /teamMemberships/ junction
```

**Key principle:** **one team doc per (brand, league, division) combination.** Same physical brand can have multiple team docs across leagues. "Lucky 15s NXL EU Pro" and "Lucky 15s PXL D1" are separate docs (different rosters, different schedules, different league entries). `brandId` field optional for UI grouping ("show all Lucky 15s teams across leagues").

**Migration:** current workspace-scoped teams (`/workspaces/{slug}/teams/{teamId}`) hoist to global `/teams/{teamId}` during Phase 2 with `pbliTeamId` as dedup key. Multi-league brand splits happen post-migration (current data assumes 1 team = 1 league + 1 division, which still applies — just lifted from workspace scope to global).

**Workspace-specific scouting context:** retained in `/workspaces/{slug}/scoutedTeams/{sid}` — already-existing pattern (per § 28). Stores tournament-specific notes, coach assignments, heroPlayers per tournament, scouting completion %, etc. No change to this collection.

**Access control:**
- Read: all authenticated users
- Write: workspace coach (role check) — create flow includes pbliTeamId/name dedup search to prevent duplicates
- Super admin: edit/delete any team (audit + cleanup powers), can promote workspace-created custom teams to PbLeagues-backed
- Distinct from leagues: teams are workspace-managed but globally visible; leagues are super-admin-managed

**Child teams pattern (preserved):** `parentTeamId` references parent brand team. Ranger Warsaw = parent, Ranger Ring/Rage/Rebel/Rush = children, each child has own `leagueId` + `divisionId`. Pattern unchanged from § 4.4 / § 2.4 — just lifted to global scope.

#### 63.15.2.X — External canonical IDs and in-app sister team curation (locked 2026-05-20)

**Source-of-truth distinction — varies per league:**

PBLeagues database is canonical source ONLY for leagues that publish to it (NXL US + NXL EU today). It is NOT a universal canonical source for all teams.

**Per-league reality (2026-05):**

| League | PBLeagues coverage | externalId state | Canonical source |
|---|---|---|---|
| NXL (US + EU pro circuits) | Publishes | populated | PBLeagues |
| PXL | Does not publish | null | in-app only |
| DPL | Does not publish | null | in-app only |
| Local leagues (future) | Assumed not published | null | in-app only |

**Phase 2.3.a audit data (2026-05-20):**
- 79/132 teams (60%) have `externalId` → these come from PBLeagues import (NXL teams)
- 53/132 teams (40%) have `externalId: null` → manual creates for PXL/DPL/local teams

**Implications:**

1. **`externalId` is canonical ONLY for PBLeagues-participating leagues.** For other leagues, the docId itself is the canonical identifier — no external reference exists.

2. **Future imports — strategy splits by source:**
   - **PBLeagues CSV/API imports** (NXL today): match by `externalId` first, deterministic, no admin review for matched cases
   - **Non-PBLeagues teams** (PXL, DPL, local): match by `name + league + division` fuzzy match, admin review required for any uncertain match, manual creation is default

3. **Sister team relationships are ALWAYS in-app data,** regardless of whether teams came from PBLeagues import or manual create. No external source provides parent-child structure.

4. **Phase 2.3.c admin UI must cover BOTH workflows as first-class:**
   - **Manual team creation** (for ~40% of teams + all future non-NXL tenants): full CRUD, league + division pickers, sister team designation
   - **PBLeagues-imported teams** (NXL teams): edit attributes, designate sister teams, optionally re-link externalId if PBLeagues team ID changes

5. **Multi-tenant onboarding pattern:**
   - Tenant with PBLeagues-tracked league (NXL): roster import → externalId-linked teams + players appear → admin curates sister teams
   - Tenant with non-PBLeagues league (PXL, DPL, local): manual team creation in admin UI is the **default path** → no automated player import (or custom CSV import as future feature) → admin curates sister teams from scratch

6. **Field naming convention:**
   - `externalId` = PBLeagues team ID when present, null otherwise. Plain string.
   - `parentTeamId` = in-app foreign key to canonical parent team docId
   - Forward-looking § 63.15.2 spec fields (`pbliTeamId`, `brandId`, `leagueId`, `divisionId`) are deferred to post-Phase-2 reconciliation. Verbatim hoist preserves production schema.

7. **RANGER vs Ranger Warsaw externalId duplicate** (1 case in Phase 2.3.a) is artifact of pre-canonicalization manual creates. Migrated as separate global docs. Admin curates via Phase 2.3.c (merge or retire one).

**Future enhancements (out of Phase 2 scope):**
- Generic CSV import format for non-PBLeagues leagues — admin-uploaded roster/schedule import for leagues that don't publish to PBLeagues
- Per-league import strategy configuration (PBLeagues API endpoint vs CSV format vs manual-only)
- Optional externalId backfill when previously-untracked league joins PBLeagues

### § 63.15.2.X.1 — Phase 2.3.c admin UX patterns (locked 2026-05-20 mockup review)

Building on § 63.15.2.X (locked policy for externalId canonicality + sister team curation), Phase 2.3.c admin UI implements these patterns:

**Sister team picker (TeamFormModal — Sister team relationship section):**
- Card-style display (NOT plain dropdown) showing team avatar + name + meta (league/division/child count) + inline actions
- Both directions supported (child-side parent picker AND parent-side children management)
- "Change ▾" opens TeamPickerModal (search-and-select overlay) — required for 132+ teams
- Cycle prevention validates parent chain before save (`validateNoCycle` in dataService walks proposed parent's chain, rejects if current team appears as ancestor)
- 2-level hierarchy convention (orphan can become child; child cannot add own children — enforced via UI hiding "Add child" when team has parent). Schema allows deeper but app convention enforced in UX.

**Duplicate resolution surface:**
- Banner at top of AdminTeamsPage when externalId dups present: `⚠ N externalId duplicate(s) detected. [Review →]`
- Filter pill `⚠ Duplicates (N)` in filter row (N = count of teams in dup groups)
- Per-row `⚠` prefix on duplicate rows + MoreBtn "Resolve duplicate →" action
- Resolution view: inline modal with side-by-side comparison cards, radio selection, action checkboxes, dynamic safety note

**Recommendation heuristic for canonical pick:**
- Weighted score: `children × 100 + tournamentRefs × 5 + playerRefs × 1 + recency (0–50)`
- Top scorer gets `RECOMMENDED` badge (green pill)
- Admin can override selection via radio
- Rationale: orphaning children is worst outcome → highest weight
- **Tournament refs DEFERRED in MVP** — collectionGroup query would add latency; for the 1 known case (RANGER vs Ranger Warsaw) children count alone (300 vs 0 points) makes recommendation unambiguous

**Soft delete via `retiredAt` timestamp:**
- Single source of truth for active/inactive state — NO separate `active: boolean` field
- Schema additions (all nullable, additive — existing 132 docs treat absent fields as active):
  - `retiredAt: Timestamp | null`
  - `retiredBy: uid | null`
  - `retirementReason: string | null`
  - `canonicalReplacementId: docId | null` (pointer to canonical when retired due to dup resolution)
- Filter contract: `team.retiredAt == null` = active (default visible), `!= null` = retired (filter pill `🗄 Retired`)
- Restorable via "Restore" action in row ActionSheet (clears all 4 fields)

**Reference re-pointing — DEFERRED to manual / Phase 2.3.d:**
- Phase 2.3.c does NOT implement re-pointing tournament/player references to canonical on retire
- UI shows "Re-point tournament/player references" checkbox as DISABLED with explanation
- Retired team docs remain queryable (the doc exists, just has `retiredAt` set) — references continue resolving via `teamsById[id]` lookup, can show "(retired)" badge in consumer UIs if needed
- Phase 2.3.d cleanup OR manual Firestore Console can handle re-pointing later

**Children orphan safety (`ChildrenOrphanWarning` component):**
- Retiring a team with active children triggers enhanced ConfirmModal content (not standard ConfirmModal — needs radio + select)
- Three options:
  - **Re-point children to selected new parent** (recommended for dup cleanup) — calls `setParentTeam(child.id, newParentId)` for each child
  - **Cascade retire children** — calls `retireTeam(child.id)` for each, with reason `"Cascade retire (parent: {teamId})"`
  - **Orphan (do nothing)** — children's parentTeamId continues pointing to retired team; lookups still resolve (retired team doc preserved), but admin can spot via filter
- Mirrors Phase 2.2.c aliasIds[] safety pattern, adapted for parent-child structure

**`useActiveTeams()` helper hook:**
- Located at `src/hooks/useFirestore.js` next to `useTeams()`
- Returns `{ teams: activeOnly, teamsById: allTeamsIncludingRetired, loading, error }`
- **Asymmetric design intentional:** `teams` array filtered to active (for iteration in pickers/lists hiding retired); `teamsById` map preserves ALL teams (so spot lookups by ID — `teamsById[player.teamId]` — still resolve even if team was retired after the reference was written, avoiding "Unknown team" rendering in MatchPage/PlayerStatsPage)
- Consumers default to this hook; AdminTeamsPage opts back into raw `useTeams()` to see retired in admin context
- 20 React consumers refactored from `useTeams` → `useActiveTeams` in same commit as Phase 2.3.c ship

**`retireTeam` dataService function:**
- Signature: `retireTeam(teamId, options)` — options include `reason`, `canonicalReplacementId`, `childAction` (`'orphan'|'rePoint'|'cascade'`), `newParentForChildren`
- Dual-write to both `/teams/{id}` global + `/workspaces/{slug}/teams/{id}` legacy paths (Phase 2.3.b pattern preserved)
- `retiredBy` populated from `auth.currentUser?.uid`
- Handles children action transactionally (sequential awaits — Firestore doesn't support multi-doc transactions across collections for setDoc-merge here, but each operation is idempotent + retryable)

**`unretireTeam` dataService function:**
- Clears all 4 retire fields (retiredAt, retiredBy, retirementReason, canonicalReplacementId) → null
- Dual-write
- No side effects (children's parentTeamId references are preserved through retire/unretire cycle — re-pointing is a separate explicit action)

**`setParentTeam` dataService function:**
- Validates no-cycle via `validateNoCycle` (recursive walk, depth-limited at 10 to bound infinite loop on corrupt data)
- Throws on cycle detection — caller surfaces error in UI (e.g. TeamFormModal submitError, AdminTeamsPage retire flow)
- Dual-write

#### 63.15.3 Players — global, single identity across workspaces + leagues

**Schema:**
```
/players/{playerId}
  name: "Lukasz Parczewski"
  displayName: "Jacek"               // nickname for UI / canvas labels
  pbliId: "61114" | null             // PbLeagues identifier (first segment, per existing convention)
  pbliIdFull: "61114-8236" | null    // full PbLeagues ID for audit
  photo: url | null                  // optional
  hero: boolean                      // global HERO flag (per § 25)
  createdBy: uid
  createdByWorkspace: slug | null
  createdAt, updatedAt
```

**Key principle:** **one player doc per physical person, globally.** Cross-workspace stats coherent — same playerId in Ranger Warsaw's NXL workspace AND in US scout's NXL workspace means same person, same metric history.

**Multi-league memberships:** captured via `/teamMemberships/` junction table (see § 63.15.4), NOT via fields on player doc. Player doc has no `teamId` field.

**Migration:** current workspace-scoped players (`/workspaces/{slug}/players/{playerId}`) hoist to global `/players/{playerId}` during Phase 2. Dedup via `pbliId` as natural key — same pbliId across workspaces → same global player. Players without pbliId (custom/local players from training or unaffiliated tournaments) dedup by name match at create time with manual confirmation.

**Workspace-specific scouting context:** workspace scouting notes about a player (e.g. "weak under pressure", "good at snake breaks", per-tournament coach commentary) stored in workspace subcollection — implementation detail TBD in Phase 2 brief, likely:
```
/workspaces/{slug}/scoutedTeams/{sid}/playerNotes/{playerId}
  notes: string
  tags: string[]
  updatedAt
```

This keeps workspace coaches' opinions workspace-scoped while global player identity is shared.

**Access control:**
- Read: all authenticated users
- Write: workspace coach (role check) — create flow includes pbliId/name dedup search
- Super admin: edit/delete any player

#### 63.15.4 TeamMemberships — junction table for multi-league multi-team relationships

**Schema:**
```
/teamMemberships/{tmid}
  playerId: "p_123"
  teamId: "t_456"                   // teamId implies leagueId + divisionId (from team doc)
  season: "2026" | "2026-summer"    // string; format TBD per Phase 2 (could be ISO range)
  role: "captain" | "player" | "backup" | null
  jerseyNumber: "10" | null
  startDate: Timestamp
  endDate: Timestamp | null         // null = current/active membership
  createdBy: uid
  createdByWorkspace: slug
  createdAt, updatedAt
```

**Multi-league example unlocked (per Jacek 2026-05-19):**
- Player P plays in NXL US Semi-Pro for Austin Notorious 2 → membership doc 1
- Same Player P plays in NXL EU Pro for Lucky 15s → membership doc 2
- Same Player P plays in PXL for another team → membership doc 3
- All three memberships active simultaneously (`endDate: null`)
- Each membership has different `teamId` referencing different `/teams/` docs (different leagueId + divisionId)

**Query patterns:**
- Roster of Team T (active): `collectionGroup('teamMemberships').where('teamId', '==', T).where('endDate', '==', null)`
- Player P's active teams: `collectionGroup('teamMemberships').where('playerId', '==', P).where('endDate', '==', null)`
- Player P historical seasons: `collectionGroup('teamMemberships').where('playerId', '==', P).orderBy('startDate', 'desc')`
- Past season roster: `collectionGroup('teamMemberships').where('teamId', '==', T).where('season', '==', '2025')`

**Performance for current scale:** team roster ≤ 20 players, single collectionGroup query per roster lookup. Sub-100ms. If scale becomes issue, add `team.activeRoster: [playerId]` denormalized cache (rebuilt on membership writes). Defer caching until needed.

**Migration:** current workspace team rosters (`team.players[]` or `team.roster[]`) split into individual `/teamMemberships/` docs during Phase 2. Each (player, team, current-season) tuple → one membership doc with `startDate: <migration date>`, `endDate: null`. Historical seasons not backfilled — only current state migrates initially. Past-season memberships can be backfilled later by super admin if needed.

**Access control:**
- Read: all authenticated users
- Write: workspace coach (when assigning player to team during scouting)
- Super admin: edit/delete any membership (audit + cleanup powers)

**Season handling (TBD detail for Phase 2 brief):** decision on whether `season` is free-form string ("2026", "2026-summer", "Winter 2025-2026") or constrained format (ISO year, season enum). Defer to Phase 2 brief — initial migration can use simple string "{year}" matching current PbLeagues convention.

#### 63.15.5 Migration summary — Phase 2 (high-level only — detailed sequencing in MULTI_TENANT_MIGRATION_PLAN.md)

Phase 2 hoists FOUR resources together (coupled migration):
1. Leagues — pre-populate `/leagues/` from constants
2. Teams — hoist workspace teams to global with pbliTeamId dedup
3. Players — hoist workspace players to global with pbliId dedup
4. TeamMemberships — split team.players/roster arrays into membership docs

Order within Phase 2 (preliminary, refine in migration plan):
1. Leagues first (read-only foundation, low risk)
2. Players + Teams together (need each other for membership creation in step 3)
3. TeamMemberships derived from existing roster data
4. Workspace UI updates to query global collections instead of workspace subcollections
5. Cleanup phase: deprecate workspace-scoped collections after stabilization period

Detailed Phase 2 sub-brief structure deferred to `MULTI_TENANT_MIGRATION_PLAN.md` (separate Opus session).

#### 63.15.6 Cross-references

- § 63.4 — Hybrid layout library (analogous global resource pattern: global + per-workspace override)
- § 63.11 — Phase 0 finding (teams + players workspace-scoped, PbLeagues as bridge)
- § 63.14 — Resolved + parked items (player + team formal locks)
- § 63.16 — GlobalEvents architecture (uses leagues + teams as referenced resources)
- § 25 — HERO rank system (hero flag preserved on player doc, scope unchanged)
- § 28 — Coach Team Summary (uses scoutedTeams collection — workspace-scoped, retained)
- § 33 — User Accounts (scout attribution patterns — preserved across migration)

### 63.16 GlobalEvents Architecture (approved 2026-05-19, rozkmina #3)

> Cross-workspace event deduplication architecture. Captures decisions 3 (Option B locked), 4 (phase boundaries α/β/γ/δ), and 5 (reconciliation strategy preliminary) from rozkmina #3 packet.

#### 63.16.1 Problem statement

Once players + teams are global (§ 63.15), observations from multiple workspaces about the same physical event need deduplication. Concrete scenario: NXL Czechy 2026 weekend is scouted by Workspace A (Ranger) AND Workspace B (US team scouting from stands) — both record observations of Player 1 of Team B in Match 5 Point 3. Super admin aggregated view must not double-count player metrics for that single physical point.

**Three scenarios distinguished:**

| Scenario | Same physical event? | Dedup needed? |
|---|---|---|
| 1. Coach A and Coach B scout the same physical point in different workspaces | Yes | Yes |
| 2. Coach A scouts Player 1 at tournament X, Coach B scouts Player 1 at tournament Y | No | No |
| 3. Same coach scouts Player 1 in points 3 and 4 of same match | N/A (same coach, different points) | No |

Scenario 1 is the hard case. Realistic risk because NXL/PXL events are public — many teams (each in own workspace) may legitimately scout the same tournament from stands.

**Conceptual two-layer model:**
- **Reality layer (physical events):** "NXL Czechy 2026, Saturday Match 5 Point 3 between Teams X and Y" happened **once**, regardless of how many workspaces observed it.
- **Observation layer (scouting records):** each workspace owns its observations of reality. Observations from same workspace are consistent; observations from different workspaces about the same reality may overlap.

Inside observation layer, distinguish:
- **Factual observations** (positions, shots, eliminations) — claims about reality, should agree across observers modulo error
- **Commentary** (coach notes, ratings, evaluations) — opinions, may legitimately differ per source

#### 63.16.2 Decision — Option B locked

**Option B: `/globalEvents/{geid}` registry + optional workspace event linkage.**

Pattern analogous to § 63.4 layout library (global resource + workspace linkage).

**Schema:**
```
/globalEvents/{geid}                 // curated by super admin or auto-from PbLeagues schedule
  name: "NXL Czechy 2026"
  date: "2026-05-15"                  // start date
  endDate: "2026-05-17"               // optional, for multi-day events
  league: leagueId                    // reference to /leagues/{leagueId}
  layoutId: layoutId | null           // global layout reference (per § 63.4)
  region: "EU" | "US" | null
  createdBy: uid                      // super admin uid
  createdAt, updatedAt

// Per § 63.2 unified workspace events:
/workspaces/{slug}/events/{eid}
  type: "tournament" | "sparing" | "training"
  globalEventId: geid | null          // optional link to global registry
  name: "NXL Czechy"                  // can differ from globalEvents.name (workspace-specific label)
  ...workspace-specific fields
```

**Linkage mechanics:**
- Workspace event creation: optional dropdown "Link to global event?" with autocomplete from `/globalEvents/`
- Workspace event can stay unlinked (`globalEventId: null`) — common for training/sparing
- Super admin can retroactively link unlinked events (Phase δ UI)
- Super admin can merge two `/globalEvents/` entries if duplicates created (Phase δ)

**Two aggregation modes:**

| Mode | Behavior | Use case |
|---|---|---|
| **Composite** (per `globalEventId`) | Reconcile observations from all linked workspaces → one canonical view of physical event. Factual data merged via § 63.16.4 reconciliation. Commentary stays per-source. | Super admin aggregated layout insights, cross-workspace player stats, dedup-aware analytics |
| **Aggregate** (sum across observations, no dedup) | Treat each workspace observation as independent. Sum metrics without dedup logic. | When workspaces haven't linked, when independent observations are desired, fallback when reconciliation logic unavailable |

#### 63.16.3 Options rejected — A and C

**Option A — Status quo + heuristic fingerprint matching:** workspaces don't link to global registry. Aggregation Cloud Function fingerprint-matches by `layoutId + date + score + opposingTeam` to guess duplicates. **Rejected** — brittle (different workspaces may name events differently), false positives, no audit trail, debug hell when super admin asks "why was X merged with Y".

**Option C — Auto-dedup via Cloud Function with confidence scoring:** Cloud Function automatic dedup in aggregation pipeline with confidence scores; super admin can override matches manually. **Rejected** — complex, false matches inevitable, hard to explain merges to operators ("why was my point merged with theirs?"). Better to have explicit linkage than magic auto-merge.

**Why B wins:**
1. Explicit linkage = audit trail
2. Phased rollout friendly (Phase α nothing → Phase β optional linking → Phase γ reconciliation → Phase δ UI)
3. Mental model clear: workspace event = observation; globalEvent = reality; linkage = "this observation is about this reality"
4. Workspace adoption gradual (linking is opt-in, never blocking)
5. Super admin curation overhead bounded (registry entries created on demand, not auto-spammed)

#### 63.16.4 Phase boundaries α/β/γ/δ

Aligned with multi-tenant migration phases (§ 63.15 + general § 63 sequencing):

| Phase | Trigger | Scope |
|---|---|---|
| **α — current state** | Phase 0 done | Nothing — workspaces isolated, no global registry exists |
| **β — Multi-tenant Phase 3** | After Phase 2 (players + teams + leagues + memberships global) | `/globalEvents/{geid}` registry collection introduced. Workspace event creation UI gains optional `globalEventId` linkage dropdown. Super admin can pre-populate registry from PbLeagues schedule or manually. No aggregation logic yet — registry is just identification layer. |
| **γ — Multi-tenant Phase 4** | After β has volume (multiple workspaces linking same events organically) | Composite aggregation mode in Cloud Function. Reconciliation logic kicks in (§ 63.16.5). Super admin aggregated layout insights start using composite mode for linked events. Aggregate mode remains fallback for unlinked. |
| **δ — Multi-tenant Phase 5+** | Volume justifies UI investment | Super admin merge UI — retroactively link unlinked events, designate authority for conflicting observations, audit trail viewer, merge duplicate registry entries. |

**Rollout principle:** never block workspace operations on globalEvents adoption. Linking is opt-in throughout. Workspaces that never link still get aggregate mode (independent observations summed).

#### 63.16.5 Reconciliation strategy preliminary (formal lock deferred to Phase γ)

When two workspaces observe same physical point with conflicting factual data (positions, shots, eliminations) under composite aggregation mode.

**Preliminary preference: trust-one-source + manual super admin escape hatch.**

**Mechanism (Phase γ+ design — not implemented yet):**
- Per `/globalEvents/{geid}` field `authorityWorkspace: slug` (defaults to first workspace that linked)
- Composite aggregation reads factual data from authority workspace
- Other workspaces' factual data shown in audit panel (verification, not primary)
- Commentary stays per-source attributed (multiple opinions legitimate)
- Super admin can change authority assignment per global event
- Super admin merge UI (Phase δ) lets manual reconciliation override per-event

**Why trust-one-source over alternatives:**

| Strategy | Pros | Cons | Status |
|---|---|---|---|
| **Trust-one-source (preferred)** | Simple, explicit, auditable, scales without UI overhead for common case | Requires authority designation, may discard better data from non-authority | ✅ Preferred |
| Majority vote (≥3 observers) | Democratic | Rarely 3+ observers; can't apply to common 2-observer case | ⛔ Insufficient data volume |
| Manual super admin resolution | Best accuracy | Doesn't scale | ✅ Escape hatch only |
| Weighted average for positions | Works for x/y coords | Doesn't work for binary (eliminated yes/no), doesn't handle shots count | ⛔ Partial applicability |
| Most-recent-observation wins | Trivial | Disregards potentially better earlier data | ⛔ Quality risk |

**Data preservation:** nothing discarded. All workspace observations remain in their workspace event docs. Composite aggregation reads authority + audit panel shows alternatives. Super admin can always inspect raw observations.

**Formal lock deferred:** decision finalized in Phase γ when actual conflicting data exists to inform the choice. Preliminary preference informs Phase γ implementation brief design.

#### 63.16.6 PbLeagues integration potential

Once `/leagues/` and `/teams/` are populated, `/globalEvents/` can optionally auto-populate from PbLeagues schedule API:
- Super admin imports PbLeagues season schedule → creates `/globalEvents/` for each upcoming tournament
- Workspaces creating events for those tournaments see registry suggestions
- Manual creation remains available for sparing/training/unaffiliated events

Defer auto-import implementation to Phase β+ (or later) — initially super admin manual create is sufficient.

#### 63.16.7 Cross-references

- § 63.2 — Unified events collection (workspace events get `globalEventId` field)
- § 63.4 — Hybrid layout library (pattern reference for global + workspace linkage)
- § 63.5 — Aggregation Cloud Function (composite mode lives here)
- § 63.14 — Resolved + parked items (globalEvents formal lock)
- § 63.15 — Global Resources (leagues + teams referenced by `/globalEvents/`)

---

**Approved by Jacek:** 2026-05-19 (mobile session, Opus chat). All 8 decisions locked, with § 63.3 schema sub-option (a/b/c) deferred to Phase 0 CC discovery. Implementation begins post-CC discovery (next session).

---

## 64. Canvas Architecture — Component Model + Drawing Layer (approved 2026-05-19)

> **Origin:** Opus + Jacek rozkmina #2 outcome 2026-05-19, evidence base = Phase 0 CC discovery commits 2026-05-19 (`CANVAS_ARCHITECTURE.md` audit + `PHASE_0_DISCOVERY_FINDINGS.md`).
> **Status:** Decision locked. Implementation via per-view migration briefs (Etap 5 in `CANVAS_ARCHITECTURE.md` § 7).

### 64.1 Decision

**Option B — BaseCanvas + specialized children + composable DrawingOverlay.**

Component model:
- **`BaseCanvas`** — shared infrastructure component. Handles canvas DOM element, runtime DPR scaling, sizing strategy (width-first vs height-first via prop), ResizeObserver, landscape orientation handling, safe-area awareness, `viewportSide` half-field clipping. Does not render content itself.
- **`InteractiveCanvas`** (replaces `FieldCanvas` after migration) — gesture-rich child. Pinch/pan/loupe/drag/tap always-on. Renders bunkers, players, shots, bumps, runners, zones, eliminations.
- **`HeatmapCanvas`** (current component, refactored to extend BaseCanvas) — read-only density rendering child. Pinch-zoom + pan opt-in via prop (default off). No loupe, no drag.
- **`AnalyticsCanvas`** (extracted from `LayoutAnalyticsPage` custom canvas) — read-only markers + scope-aware child. Pinch-zoom + pan opt-in via prop. Renders death markers, position dots, shooter attribution overlays, scope-pill UI.
- **`DrawingOverlay`** — composable overlay component, NOT extending BaseCanvas. Separate `<canvas>` positioned absolutely on top of any canvas. Pointer capture, stroke rendering, color/thickness state. Toggled active/inactive via prop. Replicates TacticPage prototype mechanics.

### 64.2 Why Option B over A and C

**Option A (single `<CanvasView mode>`) rejected.** Codebase has three fundamentally different rendering modes (interactive bunker placement, density aggregation, marker + scope analytics). Cramming into one component creates conditional-hell prop surface where most props are no-op for most modes. Architecture should reflect actual diversity, not flatten it.

**Option C (pure hooks composition) rejected as primary model.** Hooks isolate concerns well, but leave each call site responsible for composing. Without enforcement, structural drift returns (see existing FieldView selective adoption per Phase 0 finding C3). BaseCanvas as component wrapping enforces consistency — every canvas mode MUST go through it for DPR/sizing/landscape. (Internally BaseCanvas may use hooks; that's an implementation detail.)

**Option B chosen because:**
1. Three rendering modes already exist → three specialized children mirrors reality
2. Drawing layer as separate overlay matches TacticPage prototype mechanics (no rewrite of working pattern)
3. BaseCanvas internally uses hooks → all consumers get consistent DPR/sizing/landscape without call-site discipline
4. Per-view migration possible incrementally (not big-bang refactor)
5. Adding new mode = new specialized child, not new branch in god-component

### 64.3 BaseCanvas responsibilities

BaseCanvas owns these cross-cutting concerns (currently divergent per Phase 0 findings C4–C6):

- **Canvas DOM:** `<canvas>` element creation, ref forwarding to specialized child
- **DPR scaling:** runtime `window.devicePixelRatio || 2` (replaces hardcoded `×2` across three files — FieldCanvas L261-262, HeatmapCanvas L49, LayoutAnalyticsPage L261)
- **Sizing strategy:** prop-driven (`sizingStrategy: 'width-first' | 'height-first'`, plus `maxCanvasHeight: number | null`). Encapsulates `window.innerHeight - N` patterns.
- **ResizeObserver:** single setup, single handler. Avoids feedback-loop bugs (CANVAS_ARCHITECTURE.md § 2.1 warning about `parent.clientHeight`).
- **Landscape:** integrates with `useLandscapeMode` hook (see § 64.8.4)
- **Safe-area:** documented expectation that page container provides safe-area padding; BaseCanvas does NOT read `env(safe-area-inset-*)` directly (matches current pattern per Phase 0 finding C6)
- **`viewportSide` half-field clipping:** resurrected from dormant FieldCanvas prop (Phase 0 finding C9), promoted to BaseCanvas

### 64.4 Specialized children — gesture profiles

| Child | Pinch-zoom | Pan when zoomed | Loupe | Default state |
|---|---|---|---|---|
| InteractiveCanvas | ✅ always | ✅ always | ✅ always (suppressible via `viewportSide`) | Current FieldCanvas defaults |
| HeatmapCanvas | opt-in via prop | opt-in via prop | ❌ never | Default off (matches current behavior) |
| AnalyticsCanvas | opt-in via prop | opt-in via prop | ❌ never | Default off (matches current behavior) |

Gestures live in BaseCanvas (via `touchHandler.js` reuse + composition). Specialized children opt in or out via prop, not by importing or omitting `touchHandler.js`. This unblocks **landscape coach view** — HeatmapCanvas on `ScoutedTeamPage` can enable pinch-zoom + pan in landscape mode by flipping the prop.

### 64.5 Drawing layer architecture

`DrawingOverlay` is a **separate composable overlay component**, NOT built into BaseCanvas. Rationale:
- Drawing is opt-in per use case. Not every canvas needs drawing capability.
- Drawing has own gesture handling (stroke capture). Coexisting with main canvas gestures requires mode switch (when draw mode active, overlay catches pointer events via `pointerEvents: 'auto'`, main canvas gestures suspended via `pointerEvents: 'none'`).
- Drawing as separate component allows future variations (annotation drawing, measurement drawing, etc.) without polluting BaseCanvas.
- Matches existing TacticPage prototype mechanics — no rewrite needed.

Composition pattern:
```jsx
<>
  <InteractiveCanvas {...} />   // or HeatmapCanvas, or AnalyticsCanvas
  <DrawingOverlay
    enabled={drawMode}
    color={...}
    thickness={...}
    strokes={...}
    onStrokesChange={...}
    onCommit={...}        // for hybrid persistence (see § 64.6)
  />
</>
```

### 64.6 Drawing layer — persistence model (hybrid)

**Decision: hybrid — ephemeral by default + "Save annotation" promotes to per-event Firestore.**

| Use case | Default | Persistence trigger |
|---|---|---|
| TacticPage (existing) | Persistent | Auto-save on stroke (current behavior — no regression) |
| Coach summary heatmap (Feliks workflow) | Ephemeral | "Save annotation" button promotes to Firestore |
| Match heatmap | Ephemeral | "Save annotation" button promotes to Firestore |
| LayoutDetailPage preview | Read-only | n/a |
| All others | Ephemeral by default | Optional per-view config |

Why hybrid:
- Feliks's iPad workflow is screenshot annotation discarded after briefing. Ephemeral matches that.
- TacticPage strokes are pre-planned tactics meant to persist — auto-save is correct existing behavior.
- "Save annotation" promote pattern lets coach decide post-hoc when something is worth keeping.

Persisted strokes scope = per-event (match, scoutedTeam, layout, tactic). Storage shape matches existing TacticPage pattern: Firestore object `{"0":[{x,y},...], "1":[...]}` (NOT nested array — Firestore crash). Normalized coordinates 0-1.

### 64.7 Drawing layer — feature set

**P0 (MVP):**
- Free-hand stroke drawing (replicate TacticPage mechanics)
- 6-color palette: red, blue, green, yellow, white, amber (CSS tokens per COLORS in theme.js)
- Color picker UI (toolbar with color swatches, tap to switch active color)
- Clear all (already exists on TacticPage)

**P1 (post-MVP, Feliks may request):**
- Undo (last stroke pop)
- Stroke thickness toggle: thin / medium / thick (2px / 3px / 5px)
- Eraser — stroke-based, removes entire stroke (not pixel eraser)

**Out of scope (defer indefinitely):**
- Per-user attribution (single-user MVP per § 64.7.next)
- Apple Pencil pressure/tilt (fingers work fine, web limitation)
- Shape recognition (snap to circle/line)
- Lasso (select + move strokes)
- Layers
- Highlighter (semi-transparent variant)

### 64.8 Secondary architectural decisions (packaged)

**64.8.1 FieldView deprecation:**
With Option B, FieldView (Phase 0 finding C3 — alive but selectively adopted) becomes redundant. Its mode dispatcher role is replaced by call sites picking the right specialized canvas directly. **Decision: deprecate FieldView**, migrate ScoutedTeamPage to direct `HeatmapCanvas` usage. Implementation brief includes FieldView removal in migration sequence.

**64.8.2 LayoutAnalyticsPage scope:**
Phase 0 finding C1 — three canvas implementations, not two. Custom canvas in LayoutAnalyticsPage handles deaths + breaks rendering with shooter attribution + scope pills UI. **Decision: extract to `AnalyticsCanvas`** as third specialized child of BaseCanvas. Gains BaseCanvas infrastructure benefits (DPR, sizing, landscape); retains specialized rendering logic (markers, scope, shooter overlays).

**64.8.3 `viewportSide` prop resurrection:**
Phase 0 finding C9 — `FieldCanvas` already has `viewportSide: 'left'|'right'` prop, no current callers. Infrastructure dormant. **Decision: promote `viewportSide` to BaseCanvas** as half-field zoom mechanism. Coach summary landscape view (Etap 6 first beneficiary) builds on this.

**64.8.4 `useLandscapeMode` hook extraction:**
Phase 0 finding C4 — landscape handling is JavaScript-driven across 5+ files (`MatchPage.jsx:1750-1835`, `LayoutDetailPage.jsx:258-393`, `TacticPage.jsx:407-435`, etc.). **Decision: extract `useLandscapeMode()` hook** from `useDevice` consumers, consolidates `device.isLandscape && !device.isDesktop` + `window.innerHeight - N` pattern. Used by BaseCanvas internally + by page containers for chrome adjustments.

**64.8.5 DPR runtime detection:**
Phase 0 finding C5 — DPR hardcoded `×2` across three canvas types. No `window.devicePixelRatio` reads anywhere in src/. **Decision: replace with `window.devicePixelRatio || 2` in BaseCanvas**. Single cross-cutting cleanup. Works on 2x/3x today; correct on future high-DPR.

**64.8.6 `drawZones.js` i18n debt cleanup (pre-refactor):**
Phase 0 finding C7 — `drawZones.js` L38, L45, L66-72 still has hardcoded English: `DISCO`, `ZEEKER`, `DANGER`, `SAJGON`, `BIG MOVE`. i18n migration commit `66b856a` (2026-04-15) skipped this file. **Decision: move strings to `i18n.js` BEFORE canvas refactor begins.** Mechanical cleanup, frees future i18next migration (per § 63.8) to be straightforward conversion.

**64.8.7 Multi-user drawing attribution:**
Out of scope MVP. Per § 5.5 in CANVAS_ARCHITECTURE.md — defer to multi-user phase. Today: single global stroke layer per event, no author tagging.

### 64.9 Migration sequence (high-level — detailed per-view briefs separate)

Per-view migration briefs to be written separately. Recommended order (subject to per-brief discussion):

1. `drawZones.js` i18n cleanup (mechanical, low-risk, frees future work)
2. Build BaseCanvas + extract DPR/sizing/landscape/`viewportSide` concerns
3. Build `useLandscapeMode()` hook
4. Refactor FieldCanvas → InteractiveCanvas extending BaseCanvas (rename + refactor)
5. Refactor HeatmapCanvas to extend BaseCanvas (gesture opt-in via prop)
6. Extract LayoutAnalyticsPage custom canvas → AnalyticsCanvas extending BaseCanvas
7. Migrate ScoutedTeamPage off FieldView → direct HeatmapCanvas
8. Deprecate FieldView (delete component)
9. Extract drawing layer → DrawingOverlay component (compose-friendly)
10. Add drawing layer to coach summary heatmap with hybrid persistence
11. Landscape coach view feature ships on top of unified base (Etap 6 — first beneficiary)

Each step = one PR + one CC brief + one deploy log entry. No big-bang refactor.

### 64.10 First beneficiary

**Landscape coach view** for ScoutedTeamPage heatmap (the original feature request that triggered the entire canvas audit per 2026-05-19 session opening). Builds on:
- BaseCanvas providing pinch-zoom + pan opt-in (§ 64.4)
- `useLandscapeMode` hook detecting orientation (§ 64.8.4)
- `viewportSide` prop for half-field clipping if needed (§ 64.8.3)
- DrawingOverlay for Feliks annotations (§ 64.5–64.7)

Implementation brief written after migration steps 1–7 land (BaseCanvas + HeatmapCanvas + ScoutedTeamPage migration).

## 65. Permissions Architecture (locked 2026-05-20 — ⚠️ RECONCILIATION PENDING with § 38)

> **⚠️ Reconciliation note added 2026-05-20 (post Phase 3.a pre-flight HALT):**
> Phase 3.a pre-flight surfaced fundamental overlap between § 65's proposed role model and the live § 38 v2.1 role infrastructure (commit history ~6 months mature, currently authoritative for every admin gate, route guard, feature flag, and pending-user flow in production). § 65's 5 roles (`super_admin / workspace_admin / coach / scout / pending_user`) overlap but do NOT map cleanly onto § 38's 5 roles (`admin / coach / scout / viewer / player`). § 65 also proposes adding `workspaceMemberships[]` + `status` to `/users/` docs, but workspace membership state already lives in `workspace.userRoles[uid]` map (SOT post Phase 1.2/1.3) + `workspace.members[]` array, and pending state is already modeled via empty-roles + `isPendingApproval()` helper + existing `PendingApprovalPage`. AdminGuard is already role-based (not pure email check) via `isAdmin(workspace, user)` 3-path check (roles array OR adminUid OR ADMIN_EMAILS).
>
> **Status:** Phase 3.a implementation HALTED 2026-05-20 by Jacek. Awaiting Opus reconciliation session to either (a) layer § 65 over § 38 with explicit mapping, or (b) deprecate § 38 with full migration plan. Until reconciled, § 65 sub-sections 65.1–65.9 below should be treated as **forward-looking design target, NOT operational truth**. Operational truth for current admin/role behavior remains § 38 + § 49 (workspace.userRoles map + ADMIN_EMAILS allowlist + PendingApprovalPage).
>
> **What stays valid in § 65 even pre-reconciliation:**
> - Ownership model for teams (`ownerWorkspaceId` Phase 3 schema addition) — independent of role taxonomy
> - § 65.4 Q1-Q4 resolutions (policy decisions — Jacek wants super_admin-only user mgmt, ownership-based player editing, AI disabled, open canonical reads / strict PII)
> - § 65.5 anti-patterns (especially "no client-side Anthropic key" — already enforced by feature flag flip in same commit)
> - § 65.7.1 Phase 3.a status snapshot (see below — captures the HALT for continuity)
> - Phase 3.g AI Vision OCR disable (shipped commit `2997cca` independent of role architecture)
>
> **What requires reconciliation:**
> - § 65.1 role taxonomy (5 roles) vs § 38 taxonomy (5 roles) — overlap is partial
> - § 65.2 player tri-mode editing — depends on role taxonomy resolution
> - § 65.3 resource × operation matrix — rule columns currently use § 65 role names
> - § 65.6 Phase 3 sub-task plan — 3.a as written conflicts with § 38; 3.b-f depend on 3.a resolution
> - § 65.8 unlock claims — Phase 2.4 ownership semantics OK; Phase 3 implementation track BLOCKED on reconciliation

PbScoutPro moves from single-workspace + single-admin model (current: `jacek@epicsports.pl` email gate per featureFlags) toward production-grade multi-tenant SaaS model. § 65 captures the role + permission decisions locked in chat 2026-05-20 (post Phase 2.3.c ship).

This decision **kierunkuje** Phase 2.4 (TeamMemberships) ownership semantics and **unblocks** Phase 3 (Permissions implementation).

> **Section numbering note:** Brief originally specified § 64 but that number was already taken by § 64 Canvas Architecture (approved 2026-05-19). Permissions Architecture lands as § 65 (next available). All internal anchors below use § 65.x correspondingly.

### 65.1 Five roles

| Role | Scope | Default |
|---|---|---|
| `super_admin` | Global (all workspaces, all data) | Manually assigned (Jacek + future co-founders) |
| `workspace_admin` | Single workspace (tenant lead, e.g. Paintball FIT admin) | Manually assigned by super_admin per workspace |
| `coach` | Single workspace (operational) | Manually assigned by super_admin |
| `scout` | Single workspace (data entry) | Manually assigned by super_admin |
| `pending_user` | Zero access (welcome screen only) | Default for new signups |

**Key invariants:**
- New signup → `pending_user` (current code defaults to "scout+coach+admin" — to be changed in Phase 3.a)
- Role transitions: super_admin ONLY (per Q1 resolution)
- Each user has ONE role per workspace (multi-workspace = role per workspace)
- Roles can NEVER self-elevate (no "promote me to admin" flow)

### 65.2 Ownership model

#### Teams: single owner via `ownerWorkspaceId`

- `/teams/{teamId}` schema gains `ownerWorkspaceId: workspaceId | null` (Phase 3 addition)
- PBLeagues-imported canonical teams: super_admin sets ownerWorkspaceId at first import OR re-assigns later
- Manually created teams: ownerWorkspaceId = creator's workspace (auto-set on create)
- Workspace admin can edit teams WHERE `ownerWorkspaceId === user.workspaceId`
- Non-owners: read-only access (canonical fields only)
- Super admin: unrestricted edit on any team

**Rationale:** `originWorkspace` (Phase 2.3.a migration field) is **audit only**, NOT authorization signal. Ownership is explicit + curatable by super_admin.

#### Players: tri-mode editing

Players have heterogeneous edit rules based on data source:

| Player type | Detection | Edit permission |
|---|---|---|
| PBLeagues canonical | `externalId !== null` | super_admin only |
| Manually created | `externalId === null` + `ownerWorkspaceId === user.workspaceId` | workspace_admin (within own workspace) |
| Annotations (Phase 3.1+) | per-workspace subcollection | coach/scout (within own workspace, doesn't touch canonical) |

**Annotations layer (Phase 3.1+, DEFERRED):** `/players/{pid}/workspaceNotes/{workspaceId}` subcollection holds per-workspace overlay: nickname, comment, hero tag, favoriteBunker, photoURL. Coach/scout can edit. Canonical player doc never touched.

### 65.3 Resource × operation matrix

Authoritative source for Firestore rules + UI gating logic. Rows: operations. Columns: roles.

| Operation | super_admin | workspace_admin | coach | scout | pending |
|---|---|---|---|---|---|
| **System / Workspaces** | | | | | |
| View all workspaces | ✅ | ❌ | ❌ | ❌ | ❌ |
| Access own workspace | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create new workspace | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite users to any workspace | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign roles (any user) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **/leagues/** | | | | | |
| Read | ✅ | ✅ | ✅ | ✅ | ❌ |
| Write (create / edit / retire) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **/teams/** | | | | | |
| Read canonical fields | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create team (sets ownerWorkspaceId = user.workspaceId) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit team — owned (ownerWorkspaceId match) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit team — not owned | ✅ | ❌ | ❌ | ❌ | ❌ |
| Retire team (soft via retiredAt) | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Designate sister team relationship | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Set/change ownerWorkspaceId | ✅ | ❌ | ❌ | ❌ | ❌ |
| Duplicate resolution | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hard delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| **/players/** | | | | | |
| Read canonical fields | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read PII (emails, linkedUid) — own workspace context | ✅ | ✅ | ❌ | ❌ | ❌ |
| Read PII — any context | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create player — manually entered (externalId null) | ✅ | ✅ (own ws) | ❌ | ❌ | ❌ |
| Edit player — manually created, own ws ownership | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit player — PBLeagues canonical | ✅ | ❌ | ❌ | ❌ | ❌ |
| Annotate player (Phase 3.1+ subcollection) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete / merge player | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Workspace data (matches, tournaments, scouted, layouts, points)** | | | | | |
| Read | ✅ | ✅ (own ws) | ✅ (own ws) | ✅ (own ws) | ❌ |
| Write | ✅ | ✅ (own ws) | ✅ (own ws) | ✅ (own ws — own data) | ❌ |
| Workspace settings (name, branding, etc.) | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Deploy kiosk for players | ✅ | ✅ (own) | ❌ | ❌ | ❌ |

### 65.4 Q1-Q4 open question resolutions (2026-05-20)

**Q1 — Can workspace_admin invite users to own workspace?** → **NO** (super_admin only)
- Rationale: Jacek wants full control over user lifecycle. Operational burden accepted for now.
- Future revisit: if scaling burden becomes unsustainable, delegate scout/coach invites only (NEVER workspace_admin promotion). Workspace admin would request user additions via Jacek.

**Q2 — Player editing model: ownership-based OR annotations layer?** → **Ownership-based for MVP, annotations Phase 3.1+ deferred**
- MVP: workspace_admin edits manually-created players in own workspace; PBLeagues canonical = super_admin only
- Phase 3.1+: annotations layer (subcollection) for nickname/notes/hero without touching canonical
- Rationale: ship ownership model fast; annotations need more design + migration thought

**Q3 — AI exfiltration mitigation aggression?** → **Disable AI for import immediately + Phase 3 data isolation via Firestore rules**
- Concrete now: disable AI Vision OCR import (Layout Wizard Vision Scan step + Re-scan bunkers ⋮ menu + Schedule OCR import) — client-side Claude API key reads gated behind static feature flag (`ENABLE_VISION_API: false`)
- Underlying concern: data isolation against scraping → Phase 3 Firestore rules refactor per matrix
- Future: if/when AI features return, server-side via Cloud Functions only (API key NEVER in client bundle)
- Rationale: "production grade / market ready" cannot ship with client-side API key as attack surface
- Extended scope vs original brief: Schedule OCR import (ScheduleImport.jsx via "Import schedule (zdjęcie)" Btn in ScoutTabContent) added per § 65.5 anti-pattern consistency; CSV-based ScheduleCSVImport stays untouched (no Anthropic dependency)

**Q4 — Data isolation model: open reads OR strict isolation?** → **Open reads on canonical, strict on PII + workspace data**
- `/leagues/`, `/teams/`, `/players/` canonical fields → readable by all authenticated users (auth required, anonymous blocked)
- PII (emails, linkedUid associations) → strict scope (super_admin global, workspace_admin = own workspace context only — i.e. PII visible only for players linked to user's workspace)
- Workspace data (matches, scouted, tournaments, layouts, scouting points) → workspace members only
- Phase 3 Firestore rules refactor implements this via field-level reads + per-workspace scoping

### 65.5 Anti-patterns — NEVER do these

- ❌ Use `originWorkspace` as authorization signal (it's audit only — set during Phase 2.3.a migration)
- ❌ Hardcode super admin check by email outside `featureFlags` (use centralized `AdminGuard` + `useIsSuperAdmin()` hook)
- ❌ Skip workspace ownership check on team/player edit (must check `ownerWorkspaceId === user.workspaceId`)
- ❌ Expose PII (emails, linkedUid) to non-super-admin / non-workspace-context reads
- ❌ Bundle Anthropic API key in client bundle (move to Cloud Functions in Phase 3+ if AI features return)
- ❌ Allow workspace_admin to edit other workspaces' data (cross-workspace writes = super_admin only)
- ❌ Show full app to pending_user (welcome + invite-pending screen ONLY)
- ❌ Allow self-elevation (any UI path where user can grant themselves higher role)
- ❌ Trust client-side role check alone (always backed by Firestore rules)

### 65.6 Phase 3 implementation plan

Phase 3 = full permissions implementation. Sub-tasks ordered:

| Sub-task | Description | Risk | Deps |
|---|---|---|---|
| **3.a** | Role schema (`user.role`, `user.workspaces[]` with role per workspace) + migration script for existing users (Jacek = super_admin, others = coach in existing workspace) | Medium | Phase 2 closure |
| **3.b** | UI: pending user welcome screen + super_admin user management page | Low | 3.a |
| **3.c** | Firestore rules refactor (per matrix § 65.3, per role, per ownership) — most substantial sub-task | **HIGH** | 3.a + 3.b |
| **3.d** | Workspace admin UI (own workspace settings, own team management — separate from /admin/teams super admin path) | Medium | 3.c |
| **3.e** | Player editing model implementation (ownership check on /players/ writes — UI + dataService) | Medium | 3.c |
| **3.f** | Team ownership UI (set/change `ownerWorkspaceId` in /admin/teams — extends Phase 2.3.c admin UI) | Low | 3.c |
| **3.g** | AI Vision OCR disable | Low | — (already done as part of § 65 ship — bundled in this brief) |
| **3.1+** | Annotations layer (`/players/{pid}/workspaceNotes/{wid}`) — deferred | — | 3.e |

**Phase 3 NOT in scope for current ship.** This brief executes 3.g (AI Vision OCR disable) only. Full Phase 3 implementation = separate briefs, separate deploys.

### 65.7 Pre-Phase-3 status snapshot (2026-05-20)

- Current admin gate: email match (`jacek@epicsports.pl`) in `featureFlags.js`
- Current new user default: scout+coach+admin (per memory) — to be changed in 3.a to `pending_user`
- Workspaces: 1 active (`ranger1996`)
- AdminGuard: in use for /admin/leagues, /admin/players, /admin/teams (Phase 2.x)
- Firestore rules: per-resource gates exist (`/leagues/`, `/players/`, `/teams/`), but no role-based scoping yet

**Migration plan for existing users (Phase 3.a):**
1. Add `user.role` + `user.workspaces[]` schema to `/users/{uid}` docs
2. Backfill: Jacek = `super_admin`, all others = `coach` in `ranger1996` workspace
3. Change new signup default to `pending_user`
4. Roll out rules + UI per matrix

### 65.8 What § 65 closes / unlocks

**Closes:**
- Open questions Q1-Q4 from 2026-05-20 chat (matrix + ownership + AI + isolation)
- Permissions architecture ambiguity that blocked Phase 2.4 design
- Q3 immediate concern (AI Vision OCR import disabled in same commit — Layout Wizard + Re-scan bunkers ⋮ dead-code modal + Schedule OCR import all gated)

**Unlocks:**
- Phase 2.4 TeamMemberships design (now knows ownership semantics: single owner, super_admin sets, manually-created auto-set)
- Phase 3 implementation track (clear sub-task ordering)
- Tenant onboarding planning (e.g. Paintball FIT example from chat — workflow clear once 3.a-d ship)

### 65.7.1 Phase 3.a HALT — pre-flight discovery (2026-05-20)

Phase 3.a brief was authored against an incomplete view of § 38 v2.1 role infrastructure. CC pre-flight surfaced the conflict before any code shipped; Jacek chose Option 4 (HALT + Opus reconciliation session). Captured here so the reconciliation session does not have to rediscover.

**Existing live infrastructure (verified pre-flight 2026-05-20):**

| Component | File:line | Function |
|---|---|---|
| 5 active roles | `src/utils/roleUtils.js:11` | `ROLES = ['admin', 'coach', 'scout', 'viewer', 'player']` — different taxonomy from § 65.1 |
| Assignable roles | `src/utils/roleUtils.js:18` | `ASSIGNABLE_ROLES = ['admin', 'coach', 'scout', 'player']` (viewer retired per § 49) |
| `ADMIN_EMAILS` allowlist | `src/utils/roleUtils.js:23` | `['jacek@epicsports.pl']` — emergency restore + admin path 3 of 3 |
| `isAdmin(workspace, user)` | `src/utils/roleUtils.js:64` | 3-path: roles array OR `workspace.adminUid===uid` OR `ADMIN_EMAILS.includes(email)` |
| `isPendingApproval()` | `src/utils/roleUtils.js:75` | Empty userRoles + isMember = pending |
| `canAccessRoute(roles, path)` | `src/utils/roleUtils.js:92` | Full route matrix per § 38.6 already implemented |
| `getOrCreateUserProfile` | `src/services/dataService.js:36` | /users/{uid} doc create — currently writes `roles: [...DEFAULT_USER_ROLES]` + `defaultWorkspace` |
| `useWorkspace()` | `src/hooks/useWorkspace.jsx:31` | Exposes `{user, workspace, roles, isAdmin, userProfile, linkedPlayer}`; live `/users/{uid}` onSnapshot at line 66 |
| `useViewAs()` | `src/hooks/useViewAs.js` | Role-impersonation layer (§ 38.5); returns `effectiveRoles + effectiveIsAdmin` |
| AdminGuard | `src/App.jsx:177` | Uses `useViewAs().effectiveIsAdmin` (NOT pure email check) |
| `useFeatureFlag` | `src/hooks/useFeatureFlag.js:13` | Role-based audience gating; admin audience uses 3-path isAdmin |
| `PendingApprovalPage` | `src/pages/PendingApprovalPage.jsx` | EXISTS — gates app for workspace-member-empty-roles case |
| `workspace.userRoles[uid]` | (Firestore doc field) | Multi-role array per uid per workspace — SOT for role gating since Phase 1.2/1.3 |
| `workspace.adminUid` | (Firestore doc field) | Single workspace admin pointer (legacy + still active) |
| `workspace.members[]` | (Firestore doc field) | Membership array (SOT for "is user in workspace") |

**§ 65 vs § 38 taxonomy mapping (ambiguous — needs Opus reconciliation):**

| § 65 role (proposed) | Closest § 38 equivalent (live) | Conflict |
|---|---|---|
| `super_admin` | `ADMIN_EMAILS` allowlist | § 38's "admin" is per-workspace; § 65 splits into global super_admin + per-workspace workspace_admin |
| `workspace_admin` | `workspace.userRoles[uid].includes('admin')` OR `workspace.adminUid===uid` | Two existing signals merge into one § 65 role |
| `coach` | `coach` | match |
| `scout` | `scout` | match |
| `pending_user` | empty `userRoles[uid]` + `isMember=true` (via `isPendingApproval()`) | Already modeled, different shape |
| (no § 65 equivalent) | `viewer` | Retired in § 49 but exists in legacy data + `canAccessRoute` matrix |
| (no § 65 equivalent) | `player` | Active for PPT self-logging — § 65 doesn't address |

**§ 65 schema additions vs existing /users/ schema:**

| § 65 proposal | Existing reality | Duplication risk |
|---|---|---|
| `globalRole: 'super_admin' \| null` on /users/ | `ADMIN_EMAILS` allowlist (~static list) | LOW — could co-exist as 4th admin path |
| `workspaceMemberships: Array<{wsId, role, joinedAt, grantedBy}>` on /users/ | `workspace.userRoles[uid]` map + `workspace.members[]` array (SOT per Phase 1.2/1.3) | HIGH — duplicate SOT for membership state |
| `status: 'pending' \| 'active'` on /users/ | `isPendingApproval(workspace, uid)` derived from empty roles + isMember | MEDIUM — could co-exist but `isPendingApproval` already serves this |
| New `useUserRole(workspaceId)` returning § 65 role names | `useWorkspace().roles` returning § 38 role names | HIGH — two parallel role-derivation APIs |

**Reconciliation options for Opus session (CC enumerated, not chosen):**

1. **Layer § 65 over § 38** — keep § 38 SOT for per-workspace roles; add ONLY `globalRole` field to /users/ as super_admin signal; map § 65 names to § 38 in code (super_admin = ADMIN_EMAILS or globalRole field; workspace_admin = userRoles[uid].includes('admin')). Smallest change.
2. **Full § 38 → § 65 migration** — deprecate workspace.userRoles[uid]; migrate to users/{uid}.workspaceMemberships[]; rewrite isAdmin / useFeatureFlag / useViewAs / PendingApprovalPage / canAccessRoute / all 30+ consumers. Substantial.
3. **Hybrid** — keep § 38 in place; § 65 becomes documentation-only forward-looking model that maps to § 38 names; no new code/schema. Lowest cost but doesn't add globalRole signal that Phase 3.b-f may want.

**Files Opus session should review before reconciliation:**
- `src/utils/roleUtils.js` (full file)
- `src/hooks/useWorkspace.jsx` (esp. userProfile subscription + isAdmin derivation)
- `src/hooks/useViewAs.js` (role-impersonation layer)
- `src/services/dataService.js:36-49` (getOrCreateUserProfile)
- `src/pages/PendingApprovalPage.jsx`
- `firestore.rules` (workspace-scoped admin gates already encoded)
- DESIGN_DECISIONS § 38 + § 49 + § 50.5 (security roles v2.1 + unified auth + soft-disable)

### 65.7.2 Phase 3.a status — shipped (2026-05-20)

✅ Implemented per § 66.5 reconciled scope:
- `users.globalRole: 'super_admin' | null` field added (additive — absent on pre-3.a docs reads as falsy)
- `isAdmin(workspace, user, userProfile?)` extended to 4-path; 3rd arg optional, defaults null (backwards compat — all existing 2-arg call sites unchanged)
- `isSuperAdmin(user, userProfile)` helper exported from `src/utils/roleUtils.js` (globalRole field OR ADMIN_EMAILS bootstrap fallback)
- `useIsSuperAdmin()` hook — new file `src/hooks/useIsSuperAdmin.js` (consumes useWorkspace().{user, userProfile})
- `src/hooks/useWorkspace.jsx` — both `isAdmin` util call sites (adminFlag useMemo + migrateWorkspaceRoles trigger) pass `userProfile` through
- Migration: `scripts/migration/phase_3_a_globalrole.cjs` — idempotent, gated by `PHASE_3_A_EXECUTE_CONFIRMED`. **Run 2026-05-20:** 21 /users/ docs — `globalRole='super_admin'` for Jacek, `null` for the other 20. Field is explicitly present on every doc (Phase 3.c rules can reference it directly — a missing field errors `resource.data.globalRole`). See DEPLOY_LOG.
- ZERO refactor of existing § 38 v2.1 infrastructure (per § 66.6 anti-patterns)

Cascades automatic (no consumer code touched):
- `useViewAs().effectiveIsAdmin` picks up 4th path via useWorkspace
- `AdminGuard` (App.jsx) via useViewAs (unchanged code)
- `useFeatureFlag` via useViewAs (unchanged code)

**Phase 3 remaining:**
- 3.b — PendingApprovalPage polish (if needed) + super_admin user mgmt UI (first consumer of useIsSuperAdmin)
- 3.c — Firestore rules refactor per § 65.3 matrix on § 38 backend [HIGH RISK]
- 3.d — Workspace admin UI
- 3.e — Player editing model implementation
- 3.f — Team ownership UI (extend Phase 2.3.c)
- 3.1+ — Annotations layer (deferred)

### 65.7.3 Phase 3.b status — shipped (2026-05-20)

Scope reconciled at pre-flight (§ 66.8 lesson). The brief proposed a new
`/admin/users` super-admin console, but CC discovery found it would ~80%
duplicate existing workspace member-management UI — `MembersPage`
(`/settings/members`), `UserDetailPage` (`/settings/members/:uid`, § 50.4),
`MemberCard` inline role editing, `RoleChips`, `RoleTransferModal`, and
dataService helpers (`updateUserRoles`, `removeMember`, `transferAdmin`,
`softDisableUser`). All workspace-scoped helpers hardcode the current
workspace via `bp()`, and production runs a single workspace — so a
cross-workspace console has no consumer yet. Jacek chose the minimal path:
extend the existing pages with the one genuinely-new capability —
`globalRole` editing.

✅ Implemented:
- `ds.setUserGlobalRole(uid, role)` — writes `/users/{uid}.globalRole`,
  validates role ∈ {'super_admin', null}
- `UserDetailPage` — new "Global role" section, gated by `useIsSuperAdmin()`
  (visible to super_admin only, per § 65.3 Q1). Radio (Standard user /
  Super admin) + `ConfirmModal` on every change.
- `MemberCard` — neutral-gray "SUPER ADMIN" status badge (non-interactive,
  so not amber per § 27 colour discipline)
- `useUserProfiles` extended to expose `globalRole`
- 11 i18n keys (PL + EN)
- First UI consumer of `useIsSuperAdmin()` (Phase 3.a hook)

Per § 66.6 anti-patterns: NO new `/admin/users` route, NO `AdminUsersPage`,
NO `UserFormModal`, NO `SuperAdminGuard`, NO `useAllUsers`, NO duplicate
dataService helpers, NO schema beyond Phase 3.a's `globalRole` field.
`PendingApprovalPage` — reviewed, already § 27-compliant, no polish needed.

Deferred (no consumer in single-tenant production):
- Dedicated cross-workspace `/admin/users` super-admin console — re-brief
  when multi-tenant onboarding (workspace #2) begins
- Self-revoke guard on the Global role section — irrelevant while the only
  super_admin (Jacek) is ADMIN_EMAILS-protected; revisit with Phase 3.c rules

**Phase 3 remaining:**
- 3.a migration run (separate, pending service account)
- 3.c — Firestore rules refactor per § 65.3 matrix on § 38 backend [HIGH RISK]
- 3.d — Workspace admin UI
- 3.e — Player editing model implementation
- 3.f — Team ownership UI
- 3.1+ — Annotations layer (deferred)

### 65.7.4 Phase 3.c.1 status — shipped (2026-05-20)

✅ Shipped per § 67.7:
- Rules helpers: `isBootstrapAdmin()`, `isSuperAdmin()`, `isAdmin(slug)` 4-path
- 5 hardcoded `token.email == jacek` sites centralized via `isSuperAdmin()` (isAdmin path + `/users/` disable + `/leagues/` write + `/players/` delete + `/teams/` delete)
- Dead `/notes/{nid}` block removed — real notes live at `tournaments/{tid}/scouted/{sid}/notes/` (governed by the tournament catch-all = `isScout`)
- § 67 Firestore Rules Architecture doc
- Deployed via `firebase deploy --only firestore:rules` (no client deploy)

⏸ Deferred from 3.c.1:
- Emulator test harness (`@firebase/rules-unit-testing`) — the build machine has no JDK and the Firestore emulator requires one. Follow-up gated on JDK availability; § 67.5 documents the planned setup. 3.c.1 rules shipped validated by deploy-time compilation + smoke test (the Phase 2.x pattern).
- `isViewer()` helper — an unused rules function emits a Firestore-compiler warning; the helper lands in 3.c.2 alongside its first match-block consumer.

Backwards compatible: `isBootstrapAdmin()` retains the email allowlist — Jacek admin via bootstrap AND `globalRole='super_admin'`. Workspace coach/scout/admin paths unchanged. `/notes/` removal = zero behaviour change (no docs, no writers at that path).

**Phase 3.c remaining:** 3.c.2 (global `/players/`+`/teams/` create/update hardening [HIGH RISK]), 3.c.3 (PII scoping per § 65.3 Q4). See § 67.7.

### 65.9 References

- Phase 2.3.a (commit `a8cb308`) — teams `originWorkspace` migration field (audit only)
- Phase 2.3.c (commit `6638c54`) — admin UI for super_admin team curation
- DEPLOY_LOG 2026-04-17 — Feature Flags + Sentry shipped (foundation for role flags)
- DEPLOY_LOG 2026-04-25 — Security audit; `VITE_ANTHROPIC_API_KEY` env fallback removed (Vite-inline leak vector closed). § 65 builds on that work: static flag gates the remaining localStorage-based call paths.
- 2026-05-20 chat — full Q1-Q4 reasoning + role matrix discussion (archived as reasoning, this section is the locked decision)

## 66. Role taxonomy reconciliation — § 65 semantics ↔ § 38 implementation (locked 2026-05-20)

**Context.** § 65 (Permissions Architecture, locked earlier 2026-05-20 — commit `2997cca`) introduced 5 semantic role names — `super_admin`, `workspace_admin`, `coach`, `scout`, `pending_user` — and a resource × operation matrix for Phase 3. § 65.7 status snapshot incompletely described existing role infrastructure as "email match in featureFlags.js". Reality (surfaced by CC pre-flight escalation, halt commit `80bcb16`): § 38 v2.1 ships substantial role infrastructure live for ~6 months. The conflict was not in § 65's design intent but in its assertion of greenfield status.

**§ 66 reconciles the two.** It does NOT amend § 65 in place (commit history preserved). It does NOT alter § 38 (operational truth). It documents the mapping that future Phase 3 work consumes.

### 66.1 Layer model

- **§ 38 = data model + backend.** Operational truth. workspace.userRoles[uid] is SOT. Helper functions: isAdmin (3-path), isPendingApproval, canAccessRoute. PendingApprovalPage. useViewAs. ADMIN_EMAILS allowlist.
- **§ 65 = permission semantics + Phase 3 design intent.** Forward-looking. Names roles, defines ownership model, locks Q1-Q4 decisions, plans Phase 3 sub-tasks. Sub-sections 65.1–65.9 flagged forward-looking (per CC halt banner) pending § 66.
- **§ 66 = the bridge.** Authoritative mapping. Phase 3.b-f briefs reference § 66 for translation, not § 65 in isolation.

### 66.2 Role mapping table

| § 65 semantic role | § 38 implementation |
|---|---|
| `super_admin` | `userProfile.globalRole === 'super_admin'` (Phase 3.a addition) OR `ADMIN_EMAILS.includes(user.email)` (bootstrap fallback) |
| `workspace_admin` | `workspace.userRoles[uid].includes('admin')` OR `workspace.adminUid === uid` |
| `coach` | `workspace.userRoles[uid].includes('coach')` |
| `scout` | `workspace.userRoles[uid].includes('scout')` |
| `pending_user` | `isPendingApproval(workspace, uid)` — workspace member with empty userRoles |

### 66.3 Roles in § 38 not enumerated by § 65

§ 38 v2.1 has two backend roles that § 65 did not address:

- **`viewer`** — retired from NEW assignments per § 49 (April 2026). Existing viewer users continue functioning (backwards compat). No new viewer assignments via UI. Phase 3.c rules refactor preserves read-only access at viewer's current scope.
- **`player`** — wired into PPT (Player Play Tracker) self-logging system. Active and used. Players log own data; no scouting permissions. Phase 3.c rules refactor preserves player-self-logging path.

§ 65.3 matrix does NOT cover viewer or player. Phase 3.c implementation extends matrix with two additional columns (or sub-rules):
- **viewer** = read-only access to workspace scope (no writes); compat-only, gated on `workspace.userRoles[uid].includes('viewer')` and no new assignments.
- **player** = self-logging on own data within workspace; gated on `workspace.userRoles[uid].includes('player')` AND `data.playerId === user.linkedPlayerId`.

### 66.4 Backend SOT (§ 38 data model)

Source of truth for role assignments:

- `workspace.userRoles[uid]: Array<'admin' | 'coach' | 'scout' | 'viewer' | 'player'>` — multi-role per user per workspace
- `workspace.adminUid: string` — single workspace admin pointer (separate path from userRoles array)
- `workspace.members[]: Array<string>` — uid list, defines workspace membership scope
- `users.globalRole: 'super_admin' | null` — Phase 3.a-to-be-added field; explicit super_admin signal
- `ADMIN_EMAILS: ['jacek@epicsports.pl']` — bootstrap allowlist in `src/utils/roleUtils.js`

**No additional schema needed for § 65 semantic layer.** § 65 names are derived from § 38 data, NOT stored as separate fields.

### 66.5 Phase 3 sub-task plan rewritten against § 38

Phase 3.a-f implement § 65.3 matrix USING § 38 data model:

- **3.a (code brief next Opus session)** — Add `users.globalRole` field. Extend `isAdmin(workspace, user)` to `isAdmin(workspace, user, userProfile?)` with 4th path (`userProfile?.globalRole === 'super_admin'`). Add `isSuperAdmin(user, userProfile)` helper. Add `useIsSuperAdmin()` hook. Migration script writes `globalRole='super_admin'` for Jacek's uid; null for rest. NO refactor of existing infrastructure. Estimated ~1h per CC Option 2 analysis.

- **3.b** — Polish `PendingApprovalPage` (§ 38.13) if needed. Build super_admin user mgmt UI: list /users/ docs, edit `workspace.userRoles[uid]` per user per workspace, edit `users.globalRole`, view workspace memberships. Consumes useIsSuperAdmin gate.

- **3.c [HIGH RISK]** — Firestore rules refactor per § 65.3 matrix, written against § 38 schema. Includes viewer + player rules (§ 66.3 extension). Substantial separate brief. Phase 3.c must enumerate all 30+ existing role-consuming sites + verify each path.

- **3.d** — Workspace admin UI: manage `workspace.userRoles[uid]` for users in `workspace.members[]`. Limited to user's own workspace (scoped by useViewAs).

- **3.e** — Player editing model: enforce § 65.2 tri-mode (PBLeagues canonical vs manually-created vs annotations) using ownerWorkspaceId checks + isAdmin/isSuperAdmin paths.

- **3.f** — Team ownership UI: extend Phase 2.3.c `/admin/teams` with set/change `team.ownerWorkspaceId` action (super_admin only).

- **3.1+** — Annotations layer `/players/{pid}/workspaceNotes/{wid}` subcollection. Deferred.

### 66.6 Anti-patterns (NEVER do these — specific to § 65↔§ 38 conflict)

- ❌ Add `workspaceMemberships[]` field to `/users/` — duplicates `workspace.userRoles[uid]` (SOT in workspace doc)
- ❌ Add `status: 'pending'` field — use existing `isPendingApproval()` helper
- ❌ Create parallel PendingLockout component — use existing PendingApprovalPage (§ 38.13)
- ❌ Refactor `isAdmin()` from "email check to role check" — it's already 3-path role-based; just add 4th path in Phase 3.a
- ❌ Change new signup defaults — existing `getOrCreateUserProfile` + `DEFAULT_USER_ROLES` + `PendingApprovalPage` handle new users
- ❌ Migrate `workspace.userRoles` data into `users/{uid}.workspaceMemberships[]` — § 38 backend stays as SOT
- ❌ Treat § 65 sub-sections 65.1–65.9 as operational truth — they remain forward-looking until each Phase 3 sub-task implements via § 38 + § 66 mapping

### 66.7 References

- § 38 v2.1 — operational role architecture (data model, helpers, PendingApprovalPage spec at § 38.13, canAccessRoute matrix at § 38.6)
- § 49 — viewer retirement policy
- § 65 — Permission semantics + ownership + Q1-Q4 + Phase 3 plan (flagged forward-looking per CC halt banner)
- § 65.7.1 — Pre-flight discovery findings preserved by CC during halt (commit `80bcb16`)
- § 66 — THIS section (the bridge)
- Phase 3.g (commit `2997cca`) — AI Vision OCR disable, shipped, independent of role architecture
- § 63.15.2.X.1 — Phase 2.3.c sister team + duplicate resolution, independent

### 66.8 Why this happened + lesson

§ 65 was drafted during 2026-05-20 Opus session while memory snapshot was end-of-April. § 38 v2.1 and Phase 1.2/1.3 cleanup landed in May 2026, post-snapshot. § 65.7 status snapshot relied on stale mental model, asserting "current admin gate = email match in featureFlags" — which was literally ONE of the THREE paths in existing `isAdmin()` function, not the whole picture.

CC's pre-flight on Phase 3.a draft caught the conflict, halted, and preserved findings in § 65.7.1. Jacek chose Option 4 (defer Phase 3.a code, fix § 65 first via reconciliation). This § 66 fulfills that requirement.

**Lesson for future Opus permission/role design:**

Per CLAUDE.md PRE-FLIGHT rule: **"Default assumption: IT ALREADY EXISTS until CC says otherwise. PbScoutPro has 30+ briefs shipped. Never assert a feature doesn't exist without CC discovery first."**

Specific protocol for permission/role/auth design:
1. Before drafting any DESIGN_DECISIONS section touching roles/auth/permissions, send CC discovery request: "Enumerate src/utils/role*, src/hooks/useViewAs*, src/components/AdminGuard, isAdmin/isPending* fns, workspace doc role fields, PendingApproval* pages — file:line table with current behavior."
2. Read CC's discovery output BEFORE drafting.
3. ANY assertion in DESIGN_DECISIONS about "current state" must reference specific file:line from CC discovery.
4. If memory says "currently X", verify against repo via CC before writing.

§ 66 closes this specific gap. Future Phase 3 briefs reference § 66 mapping as authoritative bridge between § 65 design and § 38 implementation.

## 67. Firestore Rules Architecture (locked 2026-05-20)

**Context.** § 65 + § 66 define permission semantics and the role-taxonomy bridge. § 67 documents the implementation layer — `firestore.rules` helper functions, match-block patterns, and the (planned) test harness. Companion to § 38 v2.1 (data + helpers) and the § 65.3 matrix (semantic role × operation).

### 67.1 Layer relationship

- **§ 38 = data model** — `workspace.userRoles`, `adminUid`, `members[]`, `ADMIN_EMAILS`, `isPendingApproval`
- **§ 65 = permission semantics** — super_admin / workspace_admin / coach / scout / pending_user, ownership model, Q1-Q4
- **§ 66 = role taxonomy bridge** — § 65 semantic ↔ § 38 implementation mapping
- **§ 67 = Firestore rules architecture** — THIS section: rules helpers, match-block patterns, test harness

§ 67 implements the § 65.3 matrix in `firestore.rules` using the § 38 data model + § 66 mapping.

### 67.2 Helper function inventory (post 3.c.1)

```
Bootstrap / cross-workspace
  isBootstrapAdmin()          → request.auth.token.email == ADMIN_EMAILS owner
  isSuperAdmin()              → isBootstrapAdmin() OR users/{uid}.globalRole == 'super_admin'

Workspace-scoped (require slug param)
  wsData(slug) / rolesOf(slug,uid) / hasRoleIn(roles,target)   — primitives
  isMember(slug)              → auth.uid in wsData(slug).members
  isAdmin(slug)               → 4 paths: isSuperAdmin() OR role 'admin' OR adminUid==uid
  isCoach(slug)               → isAdmin OR role 'coach'
  isScout(slug)               → isCoach OR role 'scout'
  isPlayer(slug)              → auth!=null AND role 'player'

PPT-specific
  isSelfLogShotCreate(slug)   → isPlayer + request.resource.source=='self' + scoutedBy==auth.uid
  isSelfLogShotOwned(slug)    → isPlayer + resource.source=='self' + scoutedBy==auth.uid
```

Roles are additive (admin ⊃ coach ⊃ scout). Viewer and player are parallel paths (NOT subsets of scout). There is **no `isViewer()` helper** yet — viewer reads are covered by `isMember()`; a dedicated helper lands in 3.c.2 with its first match-block consumer (an unused rules function trips a Firestore-compiler warning, so the helper is added only when used).

### 67.3 Match-block patterns

| Pattern | Read | Write |
|---|---|---|
| Workspace-scoped data | `isMember(slug)` | `isScout` / `isCoach` / `isAdmin` per resource |
| Global resources (`/players/`, `/teams/`) | `auth != null` | **`auth != null`** today — 3.c.2 hardens to ownership-aware |
| Super-admin-only ops (`/leagues/` write, global delete, `/users/` disable) | — | `isSuperAdmin()` |
| User profile self-update | `auth != null` | `auth.uid == uid` + `affectedKeys` allowlist |
| PPT self-logging | `isMember` | `isSelfLogShot*` helpers |

Specific match blocks per collection; `{document=**}` catch-alls used only *inside* a parent path (e.g. `/tournaments/{tid}/{document=**}` = `isScout`). No top-level catch-all.

### 67.4 Bootstrap → globalRole transition

Phase 3.a migration (commit `fdcb4ae`) populated `globalRole` on all 21 `/users/` docs (1 super_admin, 20 null). Phase 3.c.1 makes the rules read it.

- `isBootstrapAdmin()` retains the `ADMIN_EMAILS` email allowlist as a fallback — the **one** place the hardcoded email lives.
- `isSuperAdmin()` = bootstrap OR `globalRole` — both fire for Jacek.
- New super_admins are assigned via `UserDetailPage` (Phase 3.b) → `users.globalRole = 'super_admin'`, no `ADMIN_EMAILS` edit needed.
- Removing the bootstrap path is deferred — keep as belt-and-suspenders until tenant onboarding proves stable.

### 67.5 Test harness (planned — deferred from 3.c.1)

Automated rules testing uses `@firebase/rules-unit-testing` + the Firestore emulator. **Not yet built** — the emulator is a Java application and the build machine has no JDK (CC pre-flight 2026-05-20). 3.c.1 shipped the rules refactor validated by deploy-time compilation + smoke test (the Phase 2.x pattern); the harness is a follow-up gated on a JDK being available.

Planned setup when built:
- `firebase.json` gains an `emulators` block (firestore + auth)
- `tests/rules/` — suites by helper / match block, run via the project test runner (vitest is the natural fit given the Vite stack)
- Coverage philosophy: each 3.c.x ships per-phase critical-path tests; once the harness exists, new rule changes add tests before deploy

Until then, rules changes ship validated by: careful review, `firebase deploy --only firestore:rules` server-side compilation, and staged smoke testing per the § 65.3 matrix.

### 67.6 Anti-patterns specific to rules

- ❌ Hardcode `token.email == 'jacek@epicsports.pl'` outside `isBootstrapAdmin()` — centralized helper required
- ❌ Skip `exists()` before `get()` on `/users/{uid}` — defensive against missing docs
- ❌ Invoke `isSuperAdmin()` inside loops / deeply nested rules — each call costs up to 1 document read
- ❌ Add a role name without updating the § 67.2 inventory + § 66 mapping
- ❌ Deploy rules without server-side compile validation + smoke test — and, once the harness (§ 67.5) exists, without running it
- ❌ Top-level `{document=**}` catch-all — explicit match blocks per collection
- ❌ Trust a client-side role check as the security boundary — `firestore.rules` IS the boundary
- ❌ Grant `viewer` in new assignments (§ 49 retired)

### 67.7 Phase 3.c sub-task ordering

- **3.c.1 (this commit)** — Helper refactor (`isBootstrapAdmin`, `isSuperAdmin`, `isAdmin` 4-path), 5 hardcoded sites centralized, dead `/notes/{nid}` block removed, § 67 docs. Backwards compatible. **Test harness deferred** (no JDK on build machine — § 67.5). `isViewer` deferred to 3.c.2 (added with its consumer).
- **3.c.2** — Global `/players/` + `/teams/` create/update hardening per § 65.3 (super_admin OR workspace_admin with `ownerWorkspaceId` match). HIGH RISK.
- **3.c.3** — PII scoping per § 65.3 Q4 (field-level read restrictions on `/users/` emails + linkedUid).
- **Deferred:** `firestore.rules.backup` cleanup (pre-§38 artifact); test harness build (§ 67.5).

### 67.8 References

- § 38 v2.1 — operational role architecture · § 49 — viewer retirement · § 65 — permission semantics + matrix · § 66 — § 65↔§ 38 reconciliation
- Phase 3.a code `8f77d62` · migration `fdcb4ae` · Phase 3.b `bddeb10` · Phase 3.c.1 (this commit)
- CC pre-flight discovery 2026-05-20 — firestore.rules 379-line enumeration + dataService cross-reference

## 68. MembersPage visibility — elevated-member surfacing (locked 2026-05-21)

**Incident (2026-05-20).** `MembersPage` builds its list from `workspace.members[]` and filtered non-pending members to `userRoles[uid].length > 0`. A member in `members[]`, not pending, with `userRoles = []` rendered in **neither** the pending nor the active bucket — invisible. This hid the super_admin (Jacek): his admin access is via `globalRole` / the bootstrap allowlist, not a workspace role array, so `userRoles[Jacek] = []`.

**Decision — surface elevated members.** A non-pending member joins the active list when `userRoles.length > 0` **OR** `isElevated(uid)`:

- `isElevated(uid)` = `uid === workspace.adminUid` **OR** (`uid === viewer.uid` AND the viewer is super_admin).
- **Zero extra queries** — `adminUid` is on the workspace doc; viewer super_admin status comes from `useIsSuperAdmin()`. No per-member `/users/` fan-out: the only elevated member in production's `members[]` is the viewer. A hypothetical other-super_admin who is neither the viewer nor `adminUid` would not be auto-promoted to "active" — acceptable, single-tenant, revisit for multi-tenant.
- `MemberCard` shows a derived **neutral-gray status badge** for elevated members — "Super admin" (`globalRole === 'super_admin'` — the Phase 3.b badge) and "Admin workspace" (`uid === adminUid`). Non-amber per § 27 (status, not interactive). An elevated member with `userRoles = []` renders the badge only — no empty `RoleChips` row; role assignment for them is via `UserDetailPage`.

**Deferred — no "no-role limbo" bucket.** A third bucket for non-pending members with `userRoles = []` was scoped and dropped: production has 570 such members of which **566 have no `/users/` doc and only 1 is a live user** — overwhelmingly dead post-anonymous-purge stragglers. A limbo section would render ~569 corpses. It is **blocked on the `members[]` dead-uid prune** (NEXT_TASKS fragility cluster); re-scope a no-role/assignment surface after that cleanup if still wanted.

**References:** § 38.13 (MembersPage), § 66.2 (super_admin), Phase 3.a `useIsSuperAdmin`, Phase 3.b MemberCard badge, incident discovery 2026-05-20.

