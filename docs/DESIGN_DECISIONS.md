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
