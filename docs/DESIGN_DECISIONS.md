# DESIGN DECISIONS — PbScoutPro
## ⚠️ This is the SINGLE SOURCE OF TRUTH for all design decisions.
## CC: Read this before implementing any UI work. Do NOT re-add removed features.
## Last updated: 2026-05-26 by Claude Code (§ 86 — ShotDrawer migrated to BaseCanvas; B11/A2 closeout — last canvas surface joins § 64 ladder; § 75 grammar everywhere; dead-X cleanup bundled; opponent-half via viewportSide retires scrollLeft hack; v1 essentials = pinch/pan/loupe/tap-place/tap-delete; drag-move + tap-menu deferred to v2)

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
- ~~**NO Positions/Shots toggle**~~ — **CORRECTED 2026-05-25**: ScoutedTeam coach-summary heatmap DOES have layer toggles (Positions / Shots, both default ON; per § 60.1 promotion). § 78 Stage 2 adds two more: **Plan coacha** (editable, default ON) and **Notatki scouta** (read-only, default OFF). Original "NO toggle" intent was about the Match heatmap tab (B3 scoreboard view) which still has no per-team toggles; the wording was over-broad and conflicted with the heatmap UX that actually shipped on ScoutedTeam — keep the toggle policy scoped to Match B3 heatmap going forward.
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
> **Cleanup 2026-05-29:** struck stale/shipped lines — "Quick logging mode" SHIPPED (QuickLogView),
> "Practice tournament type" stale (practice is a flag on tournament docs, not a planned type; dead
> `type:'practice'` discriminator removed in B17), "Settings page" superseded by More-tab IA (§ 46).
- Break analyzer / prediction engine (spec exists: docs/architecture/BREAK_ANALYZER_SPEC.md)
- Tournament tendencies analytics (lineup patterns, player insights)
- Paintball IQ prediction engine
- Body count scenario analysis
- Dark/light theme toggle
- ~~Settings page~~ → superseded by More-tab IA (§ 46)
- Export CSV/Excel
- Haptic feedback
- Keyboard shortcuts

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
Canonical engine = `computePointKillCredits(pt, field)` (`generateInsights.js`).
**Specificity ladder — per eliminated opponent, the first source that matches
credits and the rest are skipped (precedence → no double-count):**
```
For each opponent eliminated in this point (with a known position):
  1.   Precision  : nearest pt.shots[s] {x,y} within 0.06 of elim pos
                    → WINNER (closest single slot), +1
  1.5. Callout-zone (PATH ∩ polygon): the eliminated player's PATH crosses a
                    callout zone tagged in pt.zoneShots[s]/zoneObstacleShots[s].
                    path = [start, elimPos]; start = layout calibration base on
                    the ELIMINATED player's side (home→homeBase / away→awayBase).
                    → SPLIT 1/N among those slots
  2.   Band       : opponent's lateral band (dorito/center/snake) ∈
                    union(quickShots[s], obstacleShots[s])
                    → SPLIT 1/N among those slots
```
**Three sources, common interface = (eliminated opponent → candidate shooter
slots):** precision (point proximity, winner), callout-zone (PATH ∩ polygon,
split), band (lateral match, split).

**Step 1.5 is PATH-intersection, NOT containment (corrected 2026-06-06).** Firing
zones lie **ON the eliminated player's path to their obstacle, not at it** — so
"is the elim position INSIDE the zone" (the original W1 `0e71e2d9` containment)
almost never fires. The canonical geometric zone-membership rule is: **does the
player's PATH cross the zone polygon**, path = segment from the calibration base
on that player's side to their elimination position (`segmentIntersectsPolygon` /
`zoneMembership` in `helpers.js` — edge-crossing ∪ endpoint-inside). Example:
opponent runs base→Dog, hit at Dog; my base player tagged zone ALFA (between base
and Dog); the base→Dog path crosses ALFA → credit my player (containment gave 0).

**Supporting wiring:** the eliminated player's real elim position is now carried
(`buildPlayerPointsFromMatch` sets `opponentEliminationPositions` + `opponentSide`;
per-slot fallback to the player position when an elim position is null). Guard:
`fieldCalibration == null` → Step 1.5 skipped (falls through to band). **RAW
per-side space invariant** — the path, calibration bases, and zone polygons are
all raw `homeData`/`awayData` layout coords; **never** the mirrored
`heatmapPoints` (mirror is display-only consolidation). **W1 (2026-06-06)** added
the callout-zone source — before it, scouting `zoneShots` tags contributed zero;
self-log zone-shots currently earn **precision** credit (the §109 propagator
writes a synthetic xy at the zone centroid — same on-path-not-at-obstacle
limitation, aligning it onto path∩zone is a recommended follow-up). ⚠️ The
`generateInsights` local var `zoneShots` (slotData) is the BAND set
(quickShots+obstacleShots), NOT the callout ids (`pt.zoneShots`) — distinct.

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

> **UPDATE 2026-05-25 — entry points gated OFF by default.** Per CC_BRIEF_SELFLOG_GATE_OFF: Jacek doesn't use self-log. The only live entry point — the MatchPage scout FAB (§ 35.2) — is now gated by the dynamic feature flag `selfLog` (`DYNAMIC_FLAG_DEFAULTS` in `src/utils/featureFlags.js`), **default `enabled: false`**, `audience: 'admin'`. With the flag OFF, `selfLogFabEl` is `null` (the FAB does not render in either render site — scout-lock view or editor view), making the subsystem unreachable from the UI. The HotSheet component, `setPlayerSelfLog`/`addSelfLogShot` dataService writes, `point.shots source:'self'` schema, collection-group indexes, and `breakoutVariants` shared-team subcollection are **preserved** (sleeping, not deleted). Reactivatable from `/debug/flags` → flip `selfLog.enabled` true. Tier 2 ("Mój dzień" in PlayerStatsPage per § 35.1) never shipped — confirmed during STEP 0 grep — so nothing to gate there. The 2026-04-20-era OnboardingModal in MainPage was already removed when PbleaguesOnboardingPage (App.jsx-routed player-link gate, § 38.12) took over the unmatched-user flow in 2026-04-24 — so nothing to gate there either. Subsystem dormancy means future re-enablement is a pure flag flip + smoke pass, no code resurrection.

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

### § 42.1 — Doc-ID scheme retired; merge semantics preserved (2026-05-15 hotfix → B18 closeout 2026-05-27)

The deterministic `{matchKey}_{coachShortId}_{NNN}` doc-ID scheme described above was retired during NXL Czechy on 2026-05-15 after a two-device same-UID data-corruption incident (`MatchPage.jsx:147` comment): when a single coach scouted from two browsers with localStorage counters in lockstep, both devices computed identical `_NNN` indexes → `setDoc` overwrote prior docs.

**Current shape (live since 2026-05-15):**
- Point doc IDs are **auto-generated by Firestore `addDoc()`** — opaque random IDs, no caller-supplied determinism. Eliminates the same-UID collision class structurally.
- The per-coach **logical index** (`index` field on the doc) is still written; `useCoachPointCounter` still drives it; `endMatchAndMerge` still groups by `coachUid` + sorts by `index` for canonical merging. **Merge semantics from § 42 are unchanged** — only the doc-ID generator changed.
- Legacy `_NNN` docs and new auto-ID docs **coexist correctly**: merge groups by `(coachUid, index)`, not by parsing the doc ID, so old streams + new streams interleave naturally.
- **B16 closeout 2026-05-27:** `setPointWithId` + `setTrainingPointWithId` exports retired (zero callers since 2026-05-15; the only writers — `addPoint` / `addTrainingPoint` — use `addDoc`). The § 42 "Related" line above keeps the historical reference for archaeology; the functions themselves are gone.

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

**Picker visibility (2026-05-22 fix).** For a linked player the picker lists own-team trainings (own + parent + child teams) **∪ any training where the player is in `attendees[]`** (guest participation). `usePPTIdentity` previously filtered by `teamId` alone, so a player invited as a guest/attendee to another team's training was structurally excluded and could not self-log. Attendee-trainings mix into the same live/upcoming/ended buckets; a distinguishing "guest" tag on those cards is a deferred follow-up. Unlinked users still see all workspace trainings (unchanged).

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

### 49.10 selfReports cross-pid tighten (rules audit gap #2, 2026-05-23)

Original § 49.9 rules deliberately deferred per-pid ownership ("Tighter ownership (pid == linkedUid of auth.uid) deferred — MVP gates on membership + player role, attack surface contained by invited-only workspace model"). The 2026-05-23 rules audit (read-only) re-graded this as **theoretical**, not real-exploitable (invited workspace + auth-uid binding contain it), but ripe for hygiene. Tightened in the same audit's follow-up brief.

**New rule shape** (`/workspaces/{slug}/players/{pid}/selfReports/{sid}`):
```
allow read:          if isMember(slug);
allow create:        if isLinkedSelfPlayer(slug, pid);
allow update, delete:if isCoach(slug) || isLinkedSelfPlayer(slug, pid);
```
Helper:
```
function isLinkedSelfPlayer(slug, pid) {
  return isPlayer(slug)
      && exists(/databases/$(database)/documents/workspaces/$(slug)/players/$(pid))
      && get(/.../players/$(pid)).data.get('linkedUid', null) == request.auth.uid;
}
```

**Why CREATE has no coach carve-out.** PRE-FLIGHT enumerated every write path:
- PPT wizard (`WizardShell:306 → createSelfReport`) — writer = the linked player. ✓
- Post-link pending flush (`playerPerformanceTrackerService:408`) — writer = the just-linked player. ✓
- KIOSK does **not** create selfReport docs — it writes `point.selfLogs[pid]` via `setPlayerSelfLogTraining` (`KioskLobbyOverlay:175`) and the propagator stamps `_meta source:'kiosk'` on the POINT, not into `/selfReports/`. ✓ (no carve-out needed.)

**Why UPDATE/DELETE has the `isCoach OR self` carve-out.** § 70 introduced four legit coach-session writers that mutate other players' selfReports:
- `propagateMatchup` writes `{slotRef, propagatedAt}` on a successful match (`dataService.js:1373`) and `{needsReview, candidateSlotRef}` on low-confidence (`:1357`).
- `applySelfReportOverride` (§ 70.11 Stage 4 accept/reassign) writes `{slotRef, propagatedAt, needsReview:false}`.
- `dismissSelfReportFlag` (§ 70.11) writes `{needsReview:false, reviewDismissedAt}`.

A bare `isLinkedSelfPlayer` would have BROKEN every matcher run + every Stage 4 action — hence the carve-out. The player-self branch is kept for symmetry + future "edit/delete my log" UX.

**Note on shots `playerId` claim** (rules header L12-15 comment): ~~a separate concern from selfReports~~ — ✅ **CLOSED 2026-05-27** (gap α fix). Both `isSelfLogShotCreate` and `isSelfLogShotOwned` now `get(/players/{playerId})` and verify `data.get('linkedUid', null) == request.auth.uid` — identical pattern to `isLinkedSelfPlayer`. PRE-FLIGHT confirmed: KIOSK + post-hoc propagator + PPT all ride `isScout` lane / a different collection; only MatchPage's PLAYER self-log flow hits these helpers and writes `playerId = own linked-player.id`. selfLog flag OFF in prod → exposure was theoretical; fix is hygiene before re-enable / workspace #2 onboarding. Data-quality follow-up (NOT security): KIOSK `scoutedBy = activePlayer.linkedUid` misattribution noted for the data-trust workstream.

**Deploy path:** rules ship via `firebase deploy --only firestore:rules` (NOT `npm run deploy`, which only deploys the GitHub Pages bundle). Same separate-step pattern as 2026-04-23.

### 49.10 Migration policy

**New users (post-deploy):** signup → user doc seeded with `roles: ['player']` + `defaultWorkspace: 'ranger1996'`. Enter ranger1996 code → auto-approved player.

**Existing users:** no automatic migration. Existing `workspace.userRoles[uid]` values continue to drive role resolution. If admin wants to upgrade an existing user, they use Members page as before — writes go to `workspace.userRoles[uid]`, reader picks up from there.

**Viewer users:** legacy role preserved. Strict matrix moves them to More-only visibility (functionally similar to read-only intent). Admin reassigns to one of 4 new roles at their pace.

### 49.11 Known follow-ups

- **Tighter selfReports ownership validation** — rules currently gate on `isPlayer(slug)`; should also verify `pid` matches `auth.uid`'s linked player. Deferred — invited-workspace model contains attack surface.
- ~~**workspace.userRoles self-write validation**~~ — ✅ **CLOSED 2026-05-27** (gap β fix). `firestore.rules` self-join + self-leave envelopes now carry (a) `isSelfJoinRoleValue` value gate restricting `userRoles[auth.uid]` to `[]` or `['player']`, and (b) own-key gate restricting the diff on `userRoles` to only `[auth.uid]` (closes the secondary `userRoles[OTHER-UID]` confederate-elevation vector). Both checks short-circuited by `!('userRoles' in affectedKeys)` so existing-role re-entry writes (which omit `userRoles`) are unaffected. PRE-FLIGHT confirmed SELF-KEY-ONLY client write semantics (`setDoc(merge:true)` nested-map + `updateDoc` dot-path; verified prod state 584 keys = preserve-semantics). **Deferred sibling (defense-in-depth, NOT load-bearing):** `/users/{uid}` `allow create` rule lacks value-check on `roles` field — workspace-side gap β alone stops the direct escalation path, but tightening `/users/` create is reasonable before workspace #2 onboarding.
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

> **⚠️ SUPERSEDED (2026-05-29) by § 57 Option C** — the write-back model was chosen over the
> fragment + reconciler design below (see § 57 "Supersedes § 55.11"). Kept for history; do not
> implement the fragment model. Current offline behavior: `SCOUTING_CONCURRENCY_AND_CACHE.md`.

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

### 55.10 KIOSK available after the QuickLog winner-pick (force-entry + portrait summary, 2026-06-07)

**Symptom (Jacek):** in the **training** scout flow (`QuickLogView` — the result
screen: scoreboard on top, "Kto wygrał?" winner buttons, Point history below),
picking the winner jumped **straight to the next point** with no KIOSK option.
**Cause:** `QuickLogView.handleWin` saves via `onSavePoint` → `TrainingScoutTab`
calls `enterPostSave`, but that **no-ops on phone/portrait** (E6) → the coach
proceeds without the post-save summary. (The KIOSK post-save was *already* wired
here — it just silently never showed in portrait.)

**Correction (a prior pass wrongly added buttons to MatchPage's "Who won this
point?" sheet — that is the SHARED/tournament-style screen, NOT the training
result screen; reverted, tournament untouched, per Jacek's "ONLY the training
workflow").** The fix lives in the QuickLog path:
- **Force-entry** — `TrainingScoutTab` now calls `enterPostSave(ctx, { force: true })`
  so the post-save **summary** ALWAYS shows after the winner pick (the summary IS
  the OPEN KIOSK / NEXT POINT choice — its CTAs are **"Przekaż graczom"** [→ lobby]
  and **"Następny punkt"** [→ next]). `enterPostSave` gained the `force` flag to
  bypass the E6 orientation no-op (callers without `force` are unchanged).
- **Portrait-responsive summary** — `KioskPostSaveSummary` now renders in any
  orientation: its panels (scoreboard + elim list / stats + CTAs) stack
  vertically + scroll when `!compatible` (`flexDirection` by `useKioskCompatible`),
  so the two CTAs are reachable in portrait. **The §27 floor stays on the 5-tile
  LOBBY only** — `KioskLobbyOverlay` ("Przekaż graczom" → `enterLobby`) keeps the
  landscape ≥1024 gate and shows a `KioskRotatePrompt` ("Obróć urządzenie
  poziomo") below it, swapping to the lobby on rotate. So: pick winner → summary
  (portrait OK) → "Przekaż graczom" → rotate to landscape → lobby.

### 55.11 KIOSK lobby viewport — decouple W/H floors + honest fallback (2026-06-06)

**Symptom (Jacek):** the lobby (5-tile, after "Przekaż graczom") never launched
even on a laptop — `kioskViewport.js` rejected on `h < 768` (a 1366×768 laptop's
usable height is ~640 after browser chrome), falling through to the rotate prompt
— which is impossible on a laptop.

**Part 1 — decouple the W/H floors (the §27 reasoning is the point):**
- The §27 risk is **WIDTH-only**: the lobby's 5-tile grid is width-driven
  (`PlayerTile` is fixed-height + fixed type, columns `1fr`) — below 1024px each
  tile compresses past the 32px Avatar floor. A short viewport does **not** shrink
  tiles (the grid scrolls). So `MIN_WIDTH = 1024` is **unchanged**.
- `MIN_HEIGHT` is **not** a §27 constraint — it was a symmetric iPad-landscape
  partner to 1024. Lowered **768 → 600** (the lobby's real content-minimum is
  header 56 + grid padding + one 200px tile row ≈ 300px). Laptops + iPad-landscape
  now reach the lobby. **§27 preserved, not traded off.**

**Part 2 — no §35 HotSheet fallback (it doesn't exist as a target); entry-gate +
honest message instead.** STEP 0 found the original "landscape-too-small → §35
HotSheet" target invalid: `featureFlags.selfLog` is **off**, and the HotSheet is a
single-player, own-phone MatchPage FAB (different device/user) — not an in-overlay
hand-around. So:
- **Entry-gate** — `KioskPostSaveSummary` hides "Przekaż graczom" when the device
  can never fit the lobby (`canEverFitKioskLobby()` = longer **physical** edge
  `window.screen` < 1024 → phones). The coach then sees only "Następny punkt" —
  the E6 phone path (no kiosk hand-around). Tablets keep the button (portrait
  tablet fits once rotated).
- **Honest fallback** — `KioskLobbyOverlay` routes via `useKioskMode()`: `'lobby'`
  (fits) / `'rotate'` (portrait that **would** fit rotated — portrait tablet) /
  `'message'` (can't fit either way → `KioskRotatePrompt variant="needsDevice"`,
  "Potrzebny tablet lub laptop"). **No device ever sees a futile "rotate"** that
  wouldn't help. The §35 HotSheet is explicitly **not** a lobby fallback.

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

**🔚 RESOLVED 2026-06-06 — Model B NOT executed; Model C (`events_index`, § 69) is the answer.** The full `/events/{eid}` migration above was **superseded**: § 69 (2026-05-21) shipped the thin cross-type `events_index` mirror (rejected here as "perpetual technical debt", but taken for zero-migration + no nested-data move). The cross-type read-side then landed incrementally on the mirror — claim flow 1b (`b1f6e7d4`) + the **PPT cross-type picker (Option A, 2026-06-06)**: the player panel surfaces the player's **assignment-scoped** points across training + sparing + tournament (`fetchAssignedPointsForPlayer` reuses the claim-flow `events_index` → rollup → `_locateInPoint` core; a shared `EventTypeBadge` distinguishes types). **Jacek decisions (LOCKED):** LIVE trainings keep the wizard path; events with **assigned-but-unlogged** points open the existing `ColdReviewFlow`; **show-all / browse-all REJECTED** (on tournaments/sparings coaches scout the OPPONENT → a self-browse list is a dead option nobody uses); **sparing opposing-team field + § 63.7 dedicated wizard DROPPED (D2)**; showing already-logged points = deferred "C-direction". → The "which events model (A/B/C)" question is **closed (Model C)**; `useEvents()` stays dormant (it's show-all, no assignment scope).

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

### Phase 2.3.d follow-up — UI delete → retire (shipped 2026-05-23)

The two UI "delete team" callers — `TeamDetailPage:117` `handleDeleteTeam` and `TeamsPage:66` `handleDelete` — now call `retireTeam` (not `deleteTeam`). This closes the Phase 2.3.d mismatch diagnosed `b9f9bc1`: the old `deleteTeam` was workspace-only while `useTeams` reads global, so a "deleted" team's global doc lingered and stayed visible in the UI (1 confirmed orphan `7rXJ0Z0U3h4wBAaoZzo8` "SKASUJ MNIE", cleaned in this brief's closeout).

**Why retire and not hard-delete-both:** `retireTeam` is canonical per § 63.15.2.X.1 — already dual-writes global+workspace, preserves the audit trail (`retiredAt` / `retiredBy` / `retirementReason`) and reference resolution (`teamsById` keeps retired teams for historical lookups). `useActiveTeams` (the asymmetric hook — `teams=active filtered, teamsById=all preserved`) is used by every user-facing consumer (audited 2026-05-23: 23 consumers via `useActiveTeams`; only `AdminTeamsPage` uses raw `useTeams`, explicitly commented) — so a retired team disappears from active lists exactly as a "deleted" one would.

**Confirm-copy update.** Both modals previously said *"Delete… Players will not be deleted but will become unassigned."* — misleading even under the old code (`deleteTeam` never touched players). New copy: *"X will be removed from your teams. Scouted data is preserved and an admin can restore the team."* — honest about retire's recoverability and about the player docs being untouched.

**`deleteTeam` (hard delete) stays in `dataService`** as the super_admin-only path used by `AdminTeamsPage` if a true hard-delete is ever needed; firestore.rules `/teams/{id}` `allow delete: if isSuperAdmin()` gates it.
> **SUPERSEDED 2026-06-05 (§90 dead-code sweep, `fece6b36`):** `deleteTeam` was REMOVED. This note was inaccurate — `deleteTeam` deleted the `/workspaces/{slug}/teams` **twin**, never global `/teams/{id}`, so it was not the super_admin hard-delete it claimed to be (and the `/teams/{id}` `delete:isSuperAdmin` rule never gated it). It had zero callers and, post-§90 twin-rule removal, would have failed. `retireTeam` (soft, global) is the canonical UI delete. A real super_admin team hard-delete, if ever needed, = a new global delete (cf. `deletePlayerGlobal`).

---

## 64. Canvas Architecture — Component Model + Drawing Layer (approved 2026-05-19)

> **Origin:** Opus + Jacek rozkmina #2 outcome 2026-05-19, evidence base = Phase 0 CC discovery commits 2026-05-19 (`CANVAS_ARCHITECTURE.md` audit + `PHASE_0_DISCOVERY_FINDINGS.md`).
> **Status:** Decision locked. Implementation via per-view migration briefs (Etap 5 in `CANVAS_ARCHITECTURE.md` § 7).

> **As-built map (2026-05-31):** `docs/architecture/CANVAS_ARCHITECTURE.md` was refreshed
> from the stale 2026-05-19 Phase-0 *plan* to the consolidated **as-built** state (HEAD
> `a0ccb2ac`), with `file:line` evidence for every claim — shared layer (BaseCanvas /
> InteractiveCanvas / DrawingOverlay), the zoom/pan/pinch transform, the draw pipeline,
> the full consumer×role table, and the 3 remaining holdouts (Ballistics/FieldCanvas,
> LayoutAnalytics, CalibrationView). Use it as the canonical canvas reference; this §64
> remains the architecture *decision* record.

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

1. ✅ `drawZones.js` i18n cleanup (mechanical, low-risk, frees future work) — shipped 2026-05-19, commit `5f12f7d`.
2. ✅ Build BaseCanvas + extract DPR/sizing/landscape/`viewportSide` concerns — shipped 2026-05-23, merge `53df791`. Additive — dormant until step #4. See § 64.11 below for the `useLandscapeMode` API + canonical per-site offset table.
3. ✅ Build `useLandscapeMode()` hook — shipped with Step 2 (`53df791`).
4. ✅ Refactor FieldCanvas → InteractiveCanvas extending BaseCanvas — shipped 2026-05-24, merge `2b6a473`. NEW `InteractiveCanvas` composing BaseCanvas + verbatim feature-layer transplant from FieldCanvas; 4 consumers migrated (BunkerEditor / LayoutDetail / Tactic / Match). FieldCanvas **retained as legacy** for BallisticsPage (Opus territory off-limits) — duplicate wiring accepted on the transition. First live test of BaseCanvas gestures + `viewportSide` promotion.
5. ✅ Refactor HeatmapCanvas to extend BaseCanvas — shipped 2026-05-24, merge `cb28a26a`. In-place refactor: ~300 LOC draw body moved verbatim to BaseCanvas's `draw` render-prop callback (plain arrow function — re-fires on every render → toggle props repaint via closure refresh). `pinchZoom` + `pan` opt-in default off (matches today's no-gesture behavior; step #11 will flip on for landscape coach view); **loupe NEVER** per § 64.4 — naturally inert via two existing consumer-side gates (touchHandler.js:178/352 `editable||layoutEditMode` check + drawLoupe call-site absence in HeatmapCanvas draw layer). Zero touchHandler changes. **Sizing deviation from brief STEP 3:** width-first via BaseCanvas (no `maxCanvasHeight` cap) instead of height-first — today's `min(aspectH, maxH)` reduces to width-first in portrait (`aspectH=175 ≪ maxH=500` on every phone), and landscape letterbox cap is dead code in step #5 scope. Documented in HeatmapCanvas header docblock; step #11 may need width-first-with-cap added to BaseCanvas API.
6. Extract LayoutAnalyticsPage custom canvas → AnalyticsCanvas extending BaseCanvas
7. Migrate ScoutedTeamPage off FieldView → direct HeatmapCanvas — ✅ **collapsed into step #5** (`cb28a26a`); ScoutedTeamPage:654/:674 + TrainingResultsPage:376 now call `<HeatmapCanvas>` directly with prop-by-prop mapping.
8. ✅ Deprecate FieldView (delete component) — **collapsed into step #5** (`cb28a26a`). After Step #4 its non-heatmap branch had zero callers; only living dispatch was `mode='heatmap'` which step #5 migrated to direct calls. 207 LOC deleted in same PR. Cosmetic `FieldView` mention in BaseCanvas:37 docblock comment left (cleanup is discretionary).
9. Extract drawing layer → DrawingOverlay component (compose-friendly)
10. Add drawing layer to coach summary heatmap with hybrid persistence
11. Landscape coach view feature ships on top of unified base (Etap 6 — first beneficiary)

Each step = one PR + one CC brief + one deploy log entry. No big-bang refactor.

### 64.11 Step 2 execution note — `useLandscapeMode` API + canonical offset table (2026-05-23)

Not a new decision — record of executing § 64.9 step #2/3 against the locked plan. Merge `53df791`, additive only (zero consumer touched; main bundle hash bit-identical pre/post deploy).

**Files created:**
- `src/hooks/useLandscapeMode.js` (61 LOC).
- `src/components/canvas/BaseCanvas.jsx` (219 LOC).

**`useLandscapeMode` API:**
```js
const { isLandscape, canvasMaxHeight } = useLandscapeMode();
const h = canvasMaxHeight(landscapeOffset = 0, portraitOffset = 0);
```
Owns the `device.isLandscape && !device.isDesktop` formula and the `window.innerHeight − N` consolidation. `canvasMaxHeight` returns `window.innerHeight − offset` where the offset is picked by the current orientation; default `0` reproduces the "full window height" literal that landscape-aware sites pass today. SSR-safe (returns `null` when `window` is absent — matching the per-site `typeof window !== 'undefined' ? … : null` guard).

**Canonical per-site offset table — load-bearing for migration steps #4 onward.** Each consumer must be passed these literals verbatim (no rounding, no "normalization"). Verified against `git main` 2026-05-23.

| Site | landscapeOffset | portraitOffset | Today's literal |
|---|---|---|---|
| `MatchPage.jsx:1837` | 0 | 180 | `isLandscape ? innerHeight : innerHeight - 180` |
| `TacticPage.jsx:435` | 0 | 200 | `isLandscape ? innerHeight : innerHeight - 200` |
| `LayoutDetailPage.jsx:397` | 20 | 200 | `isLandscape ? innerHeight - 20 : innerHeight - 200` |
| `HeatmapCanvas.jsx:36` | 200 | 200 | `innerHeight - 200` (no orientation branch) |
| `BunkerEditorPage.jsx:176` | 160 | 160 | `innerHeight - 160` (no branch) |
| `LayoutAnalyticsPage.jsx:122` | 90 | 90 | `innerHeight - 90` (no branch) |
| `BallisticsPage.jsx:92` | 140 | 140 | `innerHeight - 140` (no branch) — **Opus territory, off-limits to canvas refactor** |

**BaseCanvas Step-2 gesture-gate caveat** — recorded for the implementation brief at step #4. `createTouchHandler` (`./field/touchHandler.js`) is monolithic — pinch / pan / loupe / placement all sit in one closure. Step 2's brief excluded touching that file. The `pinchZoom` / `pan` / `loupe` opt-in props in `BaseCanvas` are therefore **collectively gated** today: *any* true → handler attached (all gestures active); *all* false → not attached. The API shape matches § 64.4 (three named opt-ins) so the contract doesn't break when `touchHandler` is refactored — at which point granular per-gesture gating becomes real. Documented prominently in `BaseCanvas.jsx`.

**3× hardcoded DPR `×2` sites** localized for the migration briefs (NOT touched in Step 2): `FieldCanvas.jsx:263`, `HeatmapCanvas.jsx:49`, `LayoutAnalyticsPage.jsx:416`. Each migrates with its owning consumer.

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

### 65.7.5 Phase 3.c.2 status — shipped (2026-05-20)

✅ Shipped per § 65.2 single-owner model (Option A — forward-looking ownership):
- `ownerWorkspaceId` backfilled on **1066** global docs (132 teams + 934 players, all `"ranger1996"`, 0 errors); `addTeam`/`addPlayer` set it on new docs; `updateTeam`/`updatePlayer` strip it from caller data.
- `firestore.rules`: new `isWorkspaceAdminOf(slug)` helper; `/teams/` + `/players/` create/update gated `isSuperAdmin() OR isWorkspaceAdminOf(ownerWorkspaceId)`; delete super_admin-only.
- Staged deploy (client → backfill → rules), clean rules compile. DEPLOY_LOG 2026-05-20.

Locked decisions:
- **Immutability guard kept** — the update rule's workspace_admin branch requires `ownerWorkspaceId` unchanged. Defense in depth: a bypassable dataService strip alone is insufficient — rules are the boundary. Ownership *transfer* is super_admin-only, via the future Phase 3.f team-ownership UI.
- **`retireTeam` asymmetry** — `retireTeam` is an *update* (sets `retiredAt`), so a workspace_admin can **soft-retire** a team whose `ownerWorkspaceId` matches their workspace (the update passes the gate; retire doesn't touch `ownerWorkspaceId`, so the immutability clause holds). **Hard delete stays super_admin-only** (§ 65.3 Q3). Phase 3.d (workspace admin UI) + 3.f (ownership UI) must expect this.
- **Emulator test harness deferred** — JDK-gated, § 67.5. 3.c.2 validation = deploy-time rules compilation (clean, 0 warnings) + production smoke.
- **`isWorkspaceAdminOf` rule branch is inert + unverified** — production has one workspace and one super_admin, so that branch has no live subject and was not emulator-tested. Load-bearing only at workspace #2 — re-verify then.

**Phase 3.c remaining:** 3.c.2 Stage 7.4 formal smoke (edit + retire/unretire) + the team-delete repro — deferred to the next session; 3.c.3 (PII scoping per § 65.3 Q4).

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

### 66.9 Super Admin panel — gate + entry point (2026-05-22)

The **global editors** — `/admin/leagues`, `/admin/players`, `/admin/teams` (cross-workspace leagues/teams/players data) — are gated **`super_admin`-only** via a new `SuperAdminGuard` (`useIsSuperAdmin` = `users/{uid}.globalRole==='super_admin'` OR the `ADMIN_EMAILS` bootstrap). Previously they used `AdminGuard` (workspace-level `effectiveIsAdmin`) — a plain workspace-admin could reach global data by URL. **`/debug/flags` deliberately keeps `AdminGuard`** — feature flags are per-workspace config, not global data. Entry point: a **"Super Admin"** section in the More tab (`MoreTabContent`), gated on the same `useIsSuperAdmin` as `SuperAdminGuard` (no dead links) — the three editor links moved out of the workspace-admin "Admin" section. **Flag-label copy fix:** `DebugFlagsPage` showed "hidden for your role" for *disabled* flags (a flag with `enabled:false` is not role-blocked). Now three-state: `Disabled` / `Active for you` / `Hidden for your role`. **Discovery #2 note — the View-As-ghost hypothesis is DISPROVEN:** `ViewAsContext` is runtime-disabled (`viewAs` hardcoded `null`); `effectiveRoles`/`effectiveIsAdmin` always equal the real values — do not re-investigate it.

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

## 69. Events Model C — events_index (locked 2026-05-21)

**Decision.** Implement **Model C** — a thin additive `events_index` collection — over Model B (full `/events/` unification). Source: the 2026-05-21 DB architecture discovery (`docs/architecture/FIRESTORE_DATA_MODEL.md`).

**Why C over B.** Ground truth from the discovery: sparing is *already* unified into `/tournaments/` via an `eventType` discriminator; only training sits in a separate `/trainings/` collection. The tournament/training parallel hook trees (`useMatches`↔`useMatchups`, `usePoints`↔`useTrainingPoints`) are *tolerated debt, not active pain*. Model B would rewrite the event read/write layer — ~30–40 dataService functions, ~22 consumer files, the hooks, `firestore.rules`, plus a migration of every nested event tree — with ~30+ shipped features at risk. Model C delivers the one thing actually needed (a cross-type event list for the PPT picker, cross-event aggregation, the player claim flow) **additively** — zero migration of existing trees, zero change to the 22 consumers.

### 69.1 Schema — `/workspaces/{slug}/events_index/{eventId}`

1:1 with the source doc id (`eventId` = the `/tournaments/` or `/trainings/` doc id). Fields — enough for a unified list + filter *without* resolving to the source:

`eventType` (`tournament|sparing|practice|training`) · `sourceCollection` (`tournaments|trainings`) · `name` · `date` · `layoutId` · `status` · `isTest` · `createdAt` · `updatedAt` · `teamId` (training only) · `league`/`year`/`divisions` (tournament/sparing only) · `lastIndexedAt` (server ts each index write — drift detection).

`eventType` derives from the source: training doc → `training`; `eventType:'sparing'` → `sparing`; `type:'practice'` → `practice`; else `tournament`.

### 69.2 Writer — atomic, in-band

Index writes are folded into the existing event functions and ride the **same `writeBatch`** as the source-doc write — the index cannot diverge from a successful event write:

- `addTournament` / `addTraining` — switched `addDoc` → `doc()` + `writeBatch`; `batch.set` the event doc + `batch.set` the `events_index` entry (same generated id).
- `updateTournament` / `updateTraining` — `writeBatch`: `batch.update` the event + `batch.set(…, {merge:true})` a partial index patch (merge so it self-heals if the entry doesn't exist yet — the pre-backfill window). `updateTrainingSquadName` writes no index (squad names aren't mirrored).
- `deleteTournament` / `deleteTraining` — `batch.delete` the `events_index` entry inside the existing cascade batch.

Primary consistency = the atomic batch; the backfill script is the recovery path.

### 69.3 Read — `useEvents()`

`useEvents({ eventType? })` (`useFirestore.js`) subscribes `events_index` via `subscribeEventsIndex`, returns the unified list sorted by event `date` desc (nulls last), with an optional `eventType` filter. It is the **only** new read surface — `useTournaments` / `useTrainings` and all 22 existing consumers are untouched. No explicit `workspaceSlug` param — matches every other event hook's `bp()`-implicit pattern.

### 69.4 Backfill

`scripts/migration/backfill_events_index.cjs` — one entry per existing `/tournaments/` + `/trainings/` doc, every workspace. `set` (overwrite) → idempotent + heals partials. `GOOGLE_APPLICATION_CREDENTIALS`, `--dry-run` default / `--commit`. Staged sequence: client deploy → backfill → consumers adopt `useEvents`.

### 69.5 Rules

`/workspaces/{slug}/events_index/{eventId}` — read `isMember`, write `isScout` (same as the parent `/tournaments/` + `/trainings/` collections; index writes ride the event-write batch).

### 69.6 Out of scope / deferred

- Model B full unification + parallel-tree dedup — deferred; revisit only if the duplication becomes active maintenance pain.
- PPT-picker rewiring to `useEvents`, cross-event aggregation, the player claim flow — separate follow-up briefs. The claim flow is now **unblocked** (it was waiting on "sparing", which already exists as `eventType`).
- `useEvents` ships with no consumer yet — intentional; it is the foundation the follow-ups build on.

**References:** `docs/architecture/FIRESTORE_DATA_MODEL.md` (ground-truth DB map), § 63.16 (GlobalEvents — distinct, deferred), DB architecture discovery 2026-05-21.

## 70. Multi-source reconciliation (Klocek 2) — model (approved 2026-05-21)

### 70.1 Intent
Every event can carry up to 3 sources — scout (proper scouting), coach (quick-log), player (self-log) — granularly separable per layout × event-type × source. Player self-log complements points where they were marked, OR stands alone (orphan). Coach quick-log may likewise be orphan (own squad plays a point, no squad-vs-squad matchup).

### 70.2 Source × event-type matrix
tournament: scout primary, coach/player rare (no time).
sparing: all three possible (educated teams).
training: coach quick-log + player self-log (where marked); scout rare.
Architecture supports all combinations; UI separates by source (Apple HIG tabs).

### 70.3 Core model — §57 Option C write-back
- Provenance via observationMeta.makeMeta → _meta.source ∈ {scout|coach|self|kiosk}.
- Scout + coach write directly into point homeData/awayData (source-tagged).
- Player self-log = orphan selfReport by default.
- Matcher (Stage 2) assigns orphan selfReport → point slot by temporal + identity + position.
- Write-back: matched → slotRef=slotIds[i], observation written into homeData/awayData + _meta source:'self', propagatedAt stamped.
- Consensus = homeData/awayData holds all sources, _meta-tagged → granular read = filter by _meta.source.
- Orphan fallback: no anchor → selfReport stays, aggregates per layout × position × event (collectionGroup), attribution optional.

### 70.4 Decisions
1. Matcher operates on orphan selfReports (phase 1). KIOSK point.selfLogs stays separate (already point-bound); unify to one consensus target later.
2. 'coach' added to source enum — without it scout vs coach separation is impossible.
3. Event-scoped aggregation, NOT a date dimension. Training/sparing = one day, so aggregate-per-event = per-day. Matched obs are naturally event-scoped (tree position); orphan scoped by eventId. Tournament may be multi-day but is scout-only in practice.
4. Matcher confidence: max automation — auto-assign whenever signals resolve (incl. batch via sequence), flag low-confidence for review but don't block; manual override/reassign always available. Observations append-only → reassign = new observation, auditable. **Conflict resolution (Stage 2):** a double-log onto the same player+slot is **last-writer-wins** on `_meta.ts` — the consensus `_meta[slot]` dotted-path write overwrites; `selfReports` stay **immutable** (both remain in the repo). No flag — Stage 4 reassign handles deliberate corrections.

### 70.5 Orphan symmetry + match/matchup optional
Both coach and player observations may be orphan (no match/matchup parent). Match/matchup is OPTIONAL: an observation is either structured (matchup/match-bound) or orphan (event-level, position-referenced). Free-play training + sparing quick-log are the orphan cases.
- Option A (CHOSEN): orphan coach points attach to an implicit "Free play" matchup container per event — zero schema change, orphan-semantics via default container, point stays event-scoped.
- Option B (future cleanup): flat points under event, matchupId nullable — cleaner but migration + ~22 consumer files.

The Option A helper (`getOrCreateFreePlayMatchup`) is training-first — dormant in Stage 1, wired by the Stage 1b free-play UI. Sparing keeps its natural us-vs-opponent match; coach quick-log writes points under that match, so no free-play container is needed for sparing (revisited only if the free-play UI later extends to sparing).

### 70.6 Phase 1b stages (revised after Stage 1 PRE-FLIGHT)
1.  Foundation: source enum + coach tag + DORMANT free-play helper (training) + doc sync [this].
1b. Free-play coach UI — SHIPPED 2026-05-21. "Log free play" entry (TrainingScoutTab Section 3, attendee-gated) + squad-less QuickLogView `freePlay` mode (pick → zone → per-player survived/eliminated → save). **Outcome model:** `point.outcome = null` (no team winner), `homeData` single side, per-player `homeData.eliminations[]`, zones in `players[]`/`syntheticZones`, `_meta source:'coach'`. winRate consumers (TrainingResultsPage, playerStats) exclude free-play via a decided-points (`wins+losses`) denominator. `isFreePlay` matchups filtered from the matchup list. Two-squad QuickLogView untouched (`freePlay` defaults false). Independent of the matcher.
2.  Matcher + write-back propagator — SHIPPED 2026-05-21 (`propagateMatchup` / `propagateSelfReportToPoint`; identity-primary, position-confidence; hooked into `endMatchupAndMerge` + `updateTraining`-close; late-log deferred).
3.  Granular read + event-scoped aggregation — **D2 (event aggregation) SHIPPED 2026-05-22**; **D1 (granular read) DEFERRED** — re-scoped as a separate training-heatmap brief (§ 70.8).
4.  Manual override UI.

### 70.7 Shipped rails (Phase 1a) — DO NOT rebuild
slotIds[5]/side, playersMeta/shotsMeta/eliminationsMeta, observationMeta.makeMeta, selfReport.slotRef + propagatedAt stubs, bunkerToPosition helper (no caller yet — Stage 2 propagator wires it).

### 70.8 Stage 3 — granular read + event aggregation (pre-flight + design, 2026-05-22)

**✅ Matcher verified — PPT smoke PASSED (2026-05-22).** The pre-flight scan had found 0 propagated `selfReports` (matcher never exercised). The smoke: coach quick-logged points with Koe in `assignments`, Koe PPT-self-logged 5 points via `/player/log`, training closed → `propagateTraining` ran. Result: **2 PROPAGATED · 0 FLAGGED · 3 orphan · 0 BAD.** Both propagated reports landed in the correct side+slot (`awayData[0]`, where `assignments.indexOf(Koe)===0`), `_meta[0].source='self'` written, and the matcher synthesised `players[0]` from the self-reported breakout bunker (slot had no coach coord — § 57 Option C write-back). The 3 orphans are correct (Koe was in only 2 coach points → `alignSequence` = min(5,2)=2). Identity→side→slot resolution + write-back confirmed correct on real data. **Stage 3 build gate cleared.** Notes from the smoke: (a) the matcher trigger for a *training* is `updateTraining(status:'closed')` → `propagateTraining`, NOT matchup-close; (b) `propagateTraining` runs synchronously inside `updateTraining` — a UX hang in the end-training modal was fixed separately (`2476cb0`).

**D1 — granular read (decided).** Matched player data lives *in* `homeData/awayData` (`_meta`-tagged) after write-back, so the granular split is a `_meta[i].source` filter on existing field-heatmap reads — not a new page. **Source-filter pills (All · Scout · Coach · Player)** above the `ScoutedTeamPage` heatmap, filtering `homeData/awayData` slots by `_meta[i].source`. (~20 `homeData/awayData` readers are currently source-agnostic; no `_meta` consumer exists today — Stage 3's read is greenfield.) Orphan (unpropagated) `selfReports` still need the `collectionGroup` path.

**D2 — event-scoped aggregation (decided).** Per-bunker per-event breakdown ("this bunker, 30× this event, 20% hit") on `TrainingResultsPage`, fed by a new `getEventShotFrequencies(trainingId)` — **matched** observations iterated in-tree (event's points' `homeData/awayData`, no index); **orphan** `selfReports` via `collectionGroup` scoped by `trainingId`. Anonymous (no per-player attribution) per § 70.1 — `getLayoutShotFrequencies` already has no `playerId` filter, the event variant inherits that.

**Stage 3 build — D2 SHIPPED, D1 DEFERRED (2026-05-22).** D2 is live: `getEventShotFrequencies(trainingId)` (`playerPerformanceTrackerService.js`) + a "Break bunkers" per-bunker breakdown section on `TrainingResultsPage`, reached via a new "Wyniki" (Training results) entry in the training **Coach tab** — `TrainingResultsPage` was a previously-orphaned route with no UI entry point (pre-existing gap, wired in here). **As-built adjustment vs the D2 sketch above:** `getEventShotFrequencies` is a *single* `collectionGroup('selfReports').where('trainingId','==',X)` query — no in-tree iteration. Rationale: propagated `selfReports` stay in the subcollection (just stamped `propagatedAt`), so one collectionGroup query is the **complete** self-log set (matched + orphan); training points in-tree are zone-granular (D/C/S from coach quick-log), not bunker-granular, so they cannot feed a per-bunker count anyway. Returns per bunker `{ bunker, side, count, hits, hitRate, shots }`. Index: `fieldOverrides` `selfReports.trainingId` COLLECTION_GROUP scope (deployed 2026-05-22). **D1 DEFERRED** — `ScoutedTeamPage` is route `/tournament/:tournamentId/team/:scoutedId`, strictly tournament *opponent*-scouting; the § 70 multi-source `_meta` (coach/self/kiosk) lives in **trainings**, and no training heatmap surface exists. D1 is re-scoped as a separate brief — "source-filtered training heatmap on `TrainingResultsPage`" (Option B, a new surface).

**D1 SHIPPED (2026-05-22) — source-filtered training heatmap.** Re-scoped from the abandoned `ScoutedTeamPage` plan onto `TrainingResultsPage` (the proper home — § 70 `_meta` data is training-scoped). A "Heatmap" section (next to "Break bunkers") renders `<FieldView mode="heatmap">` over per-side heatmap points built from the training's points: each non-empty side → one point via `mirrorPointToLeft` (free-play `homeData`-only → one point), carrying `players[]` + `playersMeta[]` + `shotsMeta[]` + `assignments[]`. **Source-filter pills** (All · Scout · Coach · Player) above the heatmap mask slots by `_meta[i].source` — `'self'`+`'kiosk'`→Player, `'coach'`→Coach, `'scout'`→Scout. `null`-`_meta` slots (legacy/untagged) are unattributable → shown only under **All**, hidden under any specific pill. Consensus-tree only — orphan (unpropagated) `selfReports` are NOT on the heatmap; they remain D2's territory. Section gated on `≥1 point AND field resolved` (no `training.layoutId` → hidden, no crash). **Stage 3 complete — only Stage 4 (manual override UI) remains in Track C.**

**References:** `docs/architecture/MULTISOURCE_RECONCILIATION.md` (long-form), § 48 (PPT), § 57 (Phase 1a multi-source observations), § 69 (events_index). Stage 1 shipped 2026-05-21.

### 70.9 "Samoocena" — player self-logs on the profile (2026-05-22)

**Why.** A player's PPT self-logs only count on the coach-side leaderboard when the matcher reconciles them into a coach point that has the player in its lineup (`assignments`). When a player self-logs more than the coach lineups them for, the surplus stays **orphan** — invisible everywhere. Decision (Jacek): orphan self-logs aren't a failure — they are the player's **self-assessment**, valuable on their own and worth surfacing on the player profile.

**What.** New **"Samoocena"** section on `PlayerStatsPage`, after "Historia meczów" — a list of the player's own `selfReports` (`players/{pid}/selfReports`), **ALL of them — matched + orphan**, separate from the coach-observed W/L. This is the § 70 granular-per-source read applied to the profile (Player Self-Report Tier 2 / "Mój dzień"), the counterpart of the D1 source-filtered training heatmap.

**How.**
- Row UI **reuses `LogRow`** (exported from `components/ppt/TodaysLogsList.jsx`) — single-sourced selfReport row (SideTag · bunker · variant · shot sequence · outcome chip). No duplicate row UI.
- `getSelfReportsForPlayer(playerId, trainingId)` (`playerPerformanceTrackerService.js`) — per-player subcollection read, fetch-all + client-filter by `trainingId`; **no collectionGroup, no composite index** (one player's set is small).
- Scope: visible in `scope=training` (filtered by `tid`) and `scope=global` (all, flat chronological). Hidden in `scope=tournament`/`match` (PPT self-logs are training-only) and when the player has no self-logs — no empty placeholder.
- **Matched + orphan shown uniformly** — no reconciliation-status indicator (the section is the player's voice per § 70; `propagatedAt` is available if a subtle tag is ever wanted — deferred).
- **Renders independently of coach-side stats (fix 2026-05-22).** The first cut placed "Samoocena" *inside* `PlayerStatsPage`'s `stats.played > 0` block — so a player with self-logs but **zero scouted coach points** (the common case — they self-logged more than the coach lineup'd them) hit the "No scouted points yet" empty state and never saw the section. Fixed: "Samoocena" is now a **sibling** of that block, gated only on `selfReports.length > 0`; the empty state shows only when there are *also* no self-logs.

### 70.10 D1 heatmap — player self-log dot placement (2026-05-22)

**Bug.** On the D1 training heatmap, player self-log dots ("Player" pill) landed at the *mirror-image* bunker. A scout/coach dot is a real, **team-relative** coord — `mirrorPointToLeft` correctly left-normalizes it by the point's `fieldSide`. A player self-log dot is **bunker-derived**: the propagator stores `bunkerToPosition(bunker, …)` = `bunker.x ± 0.02, bunker.y`, a **bunker-ABSOLUTE** coord. Running it through `mirrorPointToLeft` (x → 1-x) relocates it to the opposite bunker. The player never tapped a position and gave **no start side** — only a bunker.

**Fix — path (a), reverse-lookup, render-scoped.** In `TrainingResultsPage`'s `heatmapPoints` builder, for slots where `playersMeta[i].source ∈ {self, kiosk}`: take the **un-mirrored** `sd.players[i]`, reverse-look-up the nearest layout bunker (`field.bunkers`), re-place at `bunkerToPosition(bunker, 'left')` — **conventional LEFT** (start side unknown), **not mirrored**. Scout/coach slots keep the mirrored real coord. Scout reads position→bunker; the self-log path is the inverse.
- **Tie-guard** (`resolveSelfLogDot`): the synth sits 0.02 off its bunker; real layouts' tightest spacing is 0.0506 (NXL Tampa S1↔S2) so the lookup is unambiguous — **but** the "2026 sample layout" has a near-duplicate pair at 0.0028. Guard: snap only when the nearest bunker is `≤ 0.04` away AND beats the runner-up by `≥ 0.012`; otherwise keep the un-mirrored synth (still the correct bunker, just offset as-stored).
- Direction-only logs (bunker unresolved in the layout) never got a stored coord (`if (synth)` in the propagator) → slot stays empty → not rendered. Exclusion holds for free.
- **Render-scoped — stored data untouched.** The propagator's `players[slot]` synth coord stays as-is; it is correct for `positionConfidence` (matcher, same-point frame). Only D1's render re-places it.

**Deferred — path (b) FUTURE option.** Reading `selfReports` directly (via `getSelfReportsForPlayer`, § 70.9) would build player dots straight from `breakout.bunker` — and would additionally surface **orphan** self-logs on the heatmap (Samoocena-consistent). That is a **coverage/product change** (Player pill: matched slots → all self-logs), not a placement fix — deferred as a separate decision.

### 70.11 Stage 4 — manual override (flagged review queue) (2026-05-22)

**The last element of Track C.** The matcher flags low-confidence matches (`positionConfidence` dist > 0.12 → `needsReview:true` + `candidateSlotRef`, write-back **skipped**, point untouched) but never blocks. Stage 4 is the human review surface for that flagged queue.

**selfReport terminal states (3):** `propagated` (`propagatedAt` + `slotRef`), `flagged` (`needsReview` + `candidateSlotRef`, `propagatedAt` null), `orphan` (both falsy). Stage 4 adds a 4th via the dismiss action — see below.

**UI.** A **"Needs review"** section on `TrainingResultsPage` (between the leaderboard and "Break bunkers"), **coach/admin-gated** (`hasAnyRole(getRolesForUser(...), 'coach')` or `isAdmin`), visible only when the queue is non-empty. Per item: the player, the observation (reuses `LogRow` from `TodaysLogsList`), the matcher-proposed point, and three actions:
- **Accept** → `propagateSelfReportToPoint(candidate)` + stamp `{slotRef, propagatedAt, needsReview:false}` — identical to a `'high'` auto-match, triggered manually.
- **Reassign** → same write to a different one of the player's located points (re-run `locatePlayerInPoint`/`alignSequence` over the player's FULL report set to offer them).
- **Dismiss** → `{needsReview:false, reviewDismissedAt}`.

**Stable dismiss — the `reviewDismissedAt` terminal marker.** Clearing only `needsReview` would let `propagateMatchup` re-flag the report on the next training re-close. Fix: `reviewDismissedAt` is a **sticky** terminal marker; `propagateMatchup`'s per-pair skip now honours `propagatedAt` **OR** `reviewDismissedAt` (both reports stay in the `alignSequence` input so pairing is stable; the skip is per-pair). Orphan counters also exclude `reviewDismissedAt`.

**Override candidate resolution.** `candidateSlotRef` is an opaque `slotIds[slot]` string — the UI does **not** decode it; it re-runs the pure matcher primitives (`locatePlayerInPoint` + `alignSequence`) over the training's points in "preview" mode, which yields the candidate point/slot **and** the player's other located points for Reassign.

**Idempotency.** Accept/Reassign: re-runs skip on `propagatedAt`. Dismiss: re-runs skip on `reviewDismissedAt`. `_meta[slot]` via `makeMeta` gets a fresh `ts` → § 57.7 last-writer-wins holds.

**Out of scope (v1):** re-litigating an already-**propagated** match (`propagateSelfReportToPoint` has no inverse — undoing `_meta`/`players`/shots is a separate lift); **orphan-promotion** (identity is the locator — pulling in a no-located-point orphan needs a coach lineup edit, not an override). Orphans remain the player's self-assessment (Samoocena § 70.9 / D2).

**§ 70 / Track C / Klocek 2 — COMPLETE.** Stages 1, 1b, 2, 3 (D1+D2), 4 all shipped.

## 71. League KEY vs DISPLAY — safe-rename infrastructure (2026-05-22)

**Model.** A league has a stable **KEY** (`shortName`, e.g. `"NXL"`) and a human **DISPLAY** name (`name`). Every reference across the app stores the **shortName string** — `layout.league`, `tournament.league`, `team.leagues[]`, the *keys* of the `team.divisions{}` map, plus the `DIVISIONS` / `LEAGUE_COLORS` / `LEAGUES` constants (`theme.js`) and two hardcoded `'NXL'` literals. The `/leagues/{id}` doc id (`l_${shortName}`) is derived at create and immutable. Nothing keys off the doc id.

**`shortName` is FROZEN — never edit it.** It is the de-facto primary key in thousands of docs + code constants. `LeagueFormModal` renders it read-only in edit mode (editable only at CREATE); a new league needs a **unique** shortName (validated). Renaming a league = rename the **`name`** (display) field only.

**Resolution layer (shipped 2026-05-22).** Display sites resolve `shortName → /leagues doc .name`:
- `useLeagueName()` — reactive hook, used by `LeagueBadge`.
- `leagueDisplayName(shortName)` — non-reactive module-cached helper, used by the ~9 other display sites (AppShell + TournamentPicker badges; layout/tournament option text + subtitles in NewTournamentModal, MainPage, PlayerStatsPage, ScoutRankingPage, TrainingMoreTab, ScoutTabContent, MoreTabContent).
- Fallback: no matching doc (custom `'Other'` league) → the raw string.
- No-op while `shortName === name` (true for all 3 leagues today) → safe to ship **before** any rename.

This makes `"NXL" → "NXL Europe"` a **one-field `name` update** (`updateLeague('l_nxl', {name:'NXL Europe'})` via AdminLeaguesPage) — **no ref / constant / team-doc migration.** `"NXL"` stays the frozen code; a future **NXL US** import must use a **distinct** shortName (e.g. `"NXLUS"`).

**Fragility / scope notes.** Divisions are doc-sourced (`useLeagueDivisions` reads `league.divisions[]`); `LEAGUE_COLORS[shortName]` has a `COLORS.textMuted` fallback for codes outside the constant — both fine for new panel-created leagues.

### 71.1 Multi-league import — NXL-US readiness (shipped 2026-05-22)

The import paths were NXL-hardcoded — a new panel-created league (e.g. `NXLUS`) could not be imported. De-NXL'd this brief:
- **`CSVImport`** (global team+player CSV, on `/players` + now also `AdminPlayersPage`) — "Default league" `<Select>` is now sourced from `useLeagues()` (was hardcoded NXL/PXL/DPL); `normalizeDivision` validates against the selected league's `divisions[]` from the `/leagues` doc via `useLeagueDivisions` (was the `DIVISIONS` theme constant).
- **`ScheduleCSVImport`** (tournament schedule CSV) — the tournament picker dropped its `t.league === 'NXL'` filter (now any tournament with a league); every `team.divisions.NXL` lookup is now `team.divisions[league]`, keyed by the **selected tournament's** league.
- **`AdminPlayersPage`** gained a "📋 CSV import" entry (Super Admin → Players) — the global importer was previously only on the legacy `/players` page; one entry covers teams + players.

**Remaining residue:** `NewTournamentModal.jsx:374` still has a loose `l.league === 'NXL'` clause in its layout-pick filter — it is *permissive* (over-shows NXL layouts for non-NXL tournaments), not blocking, so left as-is. `normalizeScheduleDivision` (`divisionAliases.js`) is a flat alias map — a US division name absent from it fails the import with a clear, actionable error ("add an alias"); extend the map if NXL US uses novel division names.

## 72. Multi-team player membership (2026-05-22)

**Why.** Pro players play for multiple teams across regions (e.g. Chavez — a US team + an EU team). The single `player.teamId` could not represent that.

**Model.** Additive — `player.teams[]` is the array of teamIds the player is **directly** rostered on; `player.teamId` stays the **PRIMARY** (display / header / back-compat). `teams[]` is **direct-only** — a child-team membership does NOT imply the parent; parent-roster aggregation stays at the read sites (they expand `[parentId, …childIds]` from team-doc `parentTeamId`). No junction collection — `teams[]` + client-side `includes()` is the proportionate scope (there are no server-side `where('teamId')` queries).

**On-read fallback** — no migration script: `playerTeams(player)` (`src/utils/playerTeams.js`) returns `teams[]` when non-empty, else `[teamId]`. Roster reads MUST use `playerOnTeam(player, teamId)` — never `player.teamId === X` (PROJECT_GUIDELINES § 9). All ~9 roster-read sites converted.

**Import — pbliId is the authoritative CROSS-team key.** `CSVImport`: a row whose `pbliId` matches an existing player → **append** the import team to `teams[]` (dedupe; never overwrite `teamId` / name / profile). **Name-match never cross-appends** — names collide across regions (Chavez US ≠ Chavez EU). A row with **no pbliId** keeps the **existing within-team name-dedup unchanged** (no regression — not "create new", which would duplicate every re-import). Mandatory-pbliId is deferred as a future toggle (not enforced).

**Editor.** `PlayerEditModal` has a teams[] editor — list memberships, add (picker), remove, set primary (★). This is the manual path (e.g. add a player to a second team) alongside the import-match path.

**Follow-ups shipped (2026-05-22):** the `TeamDetailPage` quick add/remove-player buttons are now **teams[]-aware** — add = append a membership (existing primary + other teams preserved), remove = detach with **primary-reassign** (never leaves the primary pointing at a team the player left). The invariant logic is single-sourced in `playerTeams.js` — `withTeamAdded` / `withTeamRemoved` — shared by the quick-buttons **and** the `PlayerEditModal` editor (no duplication). `PlayerStatsPage`'s player header shows a **"+N" badge** when a player is on more than one team. Still deferred: the mandatory-`pbliId` import toggle.

## 73. Home view (parked) — 2026-05-22

**Status: PARKED — discovery + research done, awaiting a clickable mockup (Opus) before a build brief.**

**Problem.** When every tournament AND training is closed, the app lands on the More tab ("Ustawienia" / Settings) — it looks broken on entry. Two root causes (detail in `NEXT_TASKS.md`): (1) **"closed" is not treated as "no active event"** — `subscribeTournaments` has no status filter and close/end never clears the active id / `localStorage`, so a closed event stays a valid `tournament` object; (2) **the § 31 empty state is unreachable under `activeTab==='more'`** — the Close/End actions live in the More tab, so the persisted last-tab is structurally forced to `'more'`. A real fix needs **both**: closed-counts-as-no-active-event AND a home reachable regardless of the active tab.

**Direction (approved).** ONE **shared home view** — a single common frame with **role-aware cards**, NOT a per-tab home. Rationale: users hold multiple roles at once (e.g. `['admin','coach','scout','player']`); the Scout/Coach/More tabs are navigation, not role-silos — a per-tab home would fragment the same user. The home is the no-active-event landing; cards surface per-role value:
- **all roles** — resume / pick / create an event; recent events; review a recently-closed event.
- **scout** — incomplete scouting · scouting TODO.
- **coach** — teams W/L snapshot · unseen coach notes.
- **player** — upcoming / recent trainings · PPT-pending logs · recent personal stats.
- **super_admin** — the global admin links.

**Constraints.** Glanceable, **not** a full always-on dashboard. § 27: each card renders **only when** the role is present **AND** the card has content — no empty cards, no zero-state clutter. Research basis: multi-role product best practice = one shared frame + modular role cards (vs role-switched homes).

**Next step.** A clickable mockup across device sizes → then a build brief.

## 74. Role model + FAZA-2 multi-tenant direction + data-protection principle — snapshot 2026-05-23

Cross-refs: § 65 (Permissions Architecture), § 65.2 (single-owner model + workspace_admin path), § 65.3 (PII scoping deferred), § 65.7.5 (Phase 3.c.2 shipped + the inert `isWorkspaceAdminOf` branch), § 66 (Super Admin / Permissions), § 49.10 (selfReports cross-pid tighten), and `docs/archive/audits/RULES_COVERAGE_AUDIT_2026-05-23.md` (rules-coverage matrix at this snapshot).

### 74.1 Role model — single-tenant today

A linear hierarchy:

- **super_admin** (owner, sole) — full CRUD over workspaces / users / roles / access. Bootstrap path (`ADMIN_EMAILS` allowlist) + `users/{uid}.globalRole == 'super_admin'`. Currently exactly one: `jacek@epicsports.pl`.
- **workspace_admin** (local) — admin of one specific workspace. Manages roster, layout annotations, members. The `isWorkspaceAdminOf` rules predicate (§ 65.2) gates the workspace-admin path on global `/teams/` + `/players/` writes.
- **coach / scout / player / viewer** — workspace-scoped functional roles via `workspace.userRoles[uid]: ['coach',…]`. Multi-role union per § 38; `coach ⊃ scout ⊃ player` for write authority where the rules say so.

**Single-tenant assumption today.** Production has one workspace (`ranger1996`) and one super_admin. The `isWorkspaceAdminOf` branch is **inert** in prod (§ 65.7.5 noted) — no live subject exercises it. **It is intentionally retained** for FAZA-2; do not remove.

**Client mental model.** A *client* = a team buying one workspace.

### 74.2 FAZA 2 — multi-tenant direction

A single human user may hold roles across **multiple** workspaces — typically one player who plays for team A in NXL EU and team B in NXL US, or a coach who manages two teams. The `workspace.userRoles[uid]` map per workspace + the `isWorkspaceAdminOf` predicate already support this server-side; the gap is in the UX (no context switcher today) and in the global-collections read scoping.

**Multi-team membership (§ 72)** is the player-side foundation: one player doc can be a member of many teams via `player.teams[]`, with `teamId` as the primary. The same shape generalises to a user holding workspace-membership across multiple workspaces.

### 74.3 OPEN questions for FAZA 2 — not decided

These are tracked open so the next Opus session can resolve them deliberately, not by accident:

**(a) Global-vs-workspace boundary for workspace_admin writes.** `/teams/` and `/players/` are global resources (Phase 2.2.b / 2.3.b) with `isSuperAdmin OR isWorkspaceAdminOf(ownerWorkspaceId)` writes (§ 65.2). The intended product model — "an admin manages **their** own roster" — needs the workspace_admin path to actually fire in prod (today: super_admin short-circuits everything). What is the bright line for "this workspace's admin owns this team / player doc"? `ownerWorkspaceId` is the field; the question is the product story when a player or team is shared across workspaces (e.g. a pro player on two clubs' rosters).

**(b) Per-workspace isolation for the GLOBAL collections (rules audit gap #3, § 65.3 Q4).** Today `/users/`, `/players/`, `/teams/`, `/leagues/`, and collection-group `selfReports` all have `read: if request.auth != null` — every authed user reads every doc. Intended for single-tenant; **leaks PII cross-tenant in FAZA 2** (other workspaces' players' `pbliId` / `email` / `age` / `nationality` / `linkedUid`). Fix path = Phase 3.c.3 PII scoping: scope read to same-workspace, or split a `public / private` field shape. Significant design work; **must precede production multi-tenant onboarding.**

**(c) Provisioning + subscription lifecycle.** How does a client *get* a workspace (signup flow)? How does the *first* workspace_admin claim ownership? What revokes a workspace (non-payment, churn)? Today the only workspace was bootstrapped manually + a deleted Auth user holds the `adminUid` (rules audit gap #1 — see § 74's call-out below). A real provisioning flow has to exist before a second workspace is realistic.

**(d) Multi-workspace user UX/data-flow.** A user logged in as both `player@FIT` and `player@Ranger` — how do they switch context? Does the home / scout / coach view aggregate across workspaces, or stay strictly one-at-a-time? Does PlayerStatsPage show union-stats across both workspaces, or only the active one? The same question for the Samoocena (§ 70.9) and the heatmap (§ 70.8 D1) — both currently training-scoped, which is workspace-scoped by transitivity.

**Notable open follow-up (touches all four):** the `adminUid` stale-pointer on `ranger1996` (audit gap #1) still points at a deleted Auth user. Repoint to a real super_admin uid is scoped as a one-shot Firestore write; not yet executed.

### 74.4 Data-protection principle — codified

**Real security = `firestore.rules` (server-side). NOT UI guards. NOT code secrecy.**

The client bundle is *inherently public* — anyone with the URL can download and read it. JavaScript obfuscation is a *deterrent only*, not a security boundary. Every gate that protects data MUST live in the rules; UI guards are UX-only.

Concrete consequences for this codebase:

- **Every sensitive op must have a matching rules clause.** Audited 2026-05-23 — see `docs/archive/audits/RULES_COVERAGE_AUDIT_2026-05-23.md` § 4: no UI-only sensitive ops found.
- **Source-maps off in production.** The `vite build` output ships minified — do not enable `build.sourcemap: true` in production builds.
- **No real secrets in the bundle.** The Firebase `apiKey` is a public client identifier (Firebase docs: "API keys for Firebase services are not used to control access … they are used to identify your Firebase project"); it is fine in `src/firebase.js`. Anything that would be a true secret (a service-account JSON, a privileged API token) must never be bundled — they live on the server side (admin SDK / Functions / cron).
- **Firebase App Check** is the FAZA-2 layer against scripted data extraction (not currently enabled). When global-read collections still cover real PII (gap #3), App Check raises the bar against bot scraping — required before any product surface that reveals cross-workspace data.
- **Defense in depth, not defense in one place.** The rules audit explicitly counts UI guards as *complement*, not substitute — they make a UI flow correct + cheap; the rules make the *write* refused regardless of how the client is crafted.

### 74.5 Snapshot status (2026-05-23)

- Workspace isolation: **✅ enforced** (every `/workspaces/{slug}/…` match uses slug-bound helpers; cross-workspace reads/writes denied unless the user is in B's `members[]`).
- UI guards backed by rules: **✅ no UI-only sensitive ops.**
- Dev-open / legacy `if true` clauses: **none.**
- Acknowledged-deferred items: 3 — gap #1 (`adminUid` repoint scoped, not run), gap #3 (PII scoping → Phase 3.c.3), the shots-`playerId`-claim separate brief (rules header L12-15).
- Shipped this session: § 49.10 selfReports cross-pid tighten (gap #2, `c2fb9ba`).


## § 75 — Canvas Interaction Model: gesture grammar vs action content (approved 2026-05-24)

### Core principle (Apple HIG)
Oddziel **gramatykę wejścia** (gesty) od **treści akcji** (co edytowalne / co w menu). Gramatyka = spójna wszędzie, gdzie obowiązuje; treść = kontekstowa per ekran. Mapuje się na architekturę § 64: **BaseCanvas posiada gramatykę (uniwersalną); feature-children (InteractiveCanvas / HeatmapCanvas / DrawingOverlay) posiadają treść (kontekstową).** Regres z 2026-05-24 (tap-elementu i drag padły, a zoom/pan/place żyły) jest z definicji złamaniem gramatyki → split musi być wymuszony strukturalnie w BaseCanvas, żeby nie dryfował per-ekran.

### Trzy tiery spójności
1. **Universal (identyczne na każdym canvasie — BaseCanvas):** pinch-zoom, pan, **full-screen**.
2. **Edit-family (Match scouting / Tactic / Layout / BunkerEditor):** tap-elementu→menu kontekstowe, drag-elementu→move, long-press→loupe. Ta sama gramatyka; *treść* menu różna (Assign/Hit/Shot/Del vs Shot/Del vs bunker name/type).
3. **Read-family (heatmapy: Match heatmap / ScoutedTeam / TrainingResults / LayoutAnalytics):** tylko zoom/pan (+ preview/toggles). Brak place/menu/drag/loupe (loupe-off za darmo — read-only nie ma czego umieszczać).
4. **Screen-specific:** half-field/viewportSide (tylko Match), zone/line draw (Layout), visibility (Ballistics, off-limits), point-preview/both-teams (Match heatmap), source pills (Training), landscape edge tabs (Layout/Analytics).

### Full-screen (universal, BaseCanvas)
Generalizuje § 64.10/#11 ze ScoutedTeam-specific na uniwersalną zdolność każdego data-canvasa. Po obrocie urządzenia (auto, via `useLandscapeMode`) LUB jawnym przycisku expand: chrome (header/taby) chowa się, pole skaluje fit-to-viewport (wypełnia oś, która wypełni się pierwsza). Content-first (HIG deference). Trigger spójny wszędzie; różni się tylko wyświetlana treść. **Decyzja: oba triggery** (auto-on-rotate + jawny przycisk w pionie).

### Enhanced freehand draw (composable DrawingOverlay, § 64)
Rozbudowuje zaplanowaną w § 64 DrawingOverlay w realne narzędzie adnotacji. Unifikuje istniejący freehand z TacticPage (§ 11.8) w JEDEN współdzielony overlay używany na wszystkich data-canvasach.
- **Dostępność:** Match scouting, Tactic, ScoutedTeam (flow coacha: ustal taktykę / dorysuj do wyscoutowanych danych / narysuj kontrę). Osobny przycisk (tryb à la iOS Markup).
- **Mode, nie gest:** wejście w tryb → 1 palec = rysuje; jawne wejście/wyjście; dedykowany pasek.
- **Pasek:** kolory, mały pędzel (1–2 grubości), undo, gumka (po pociągnięciach), wyczyść wszystko. Na **`perfect-freehand`** (MIT, lekki — gładkie pociągnięcia pressure-sensitive; tej samej biblioteki używa tldraw pod spodem) + własna warstwa stanu/storage. **NIE tldraw** ($6k/rok licencja komercyjna), **NIE Excalidraw** (ciężki whiteboard, biłby się z custom field canvas).
- **Arbitraż gestów (decyzja):** w trybie draw 1 palec = rysuje, 2 palce = nadal zoom/pan (zoom/pan zostaje uniwersalny nawet podczas rysowania).
- **Persystencja (ta sama gramatyka, kontekstowy storage):** Tactic→tactic doc (istnieje), Match→adnotacja per-point, ScoutedTeam→scouted doc. Narzędzie identyczne; cel zapisu screen-specific.

### Sequencing
Regres tap-elementu/drag z 2026-05-24 (InteractiveCanvas, ze Step #4) naprawiamy **NAJPIERW** — full-screen + draw budują na działającej gramatyce. Potem: code-verify obecnego freehand/canvas → impl full-screen (#11 zgeneralizowany) → impl DrawingOverlay → klikalny mockup paska.


## § 76 — Full-screen — universal data-canvas (Stage 1, shipped 2026-05-24)

Generalizes § 64.10 / § 64.9 step #11 (landscape coach view, ScoutedTeam-specific) into a universal full-screen capability for every data-canvas surface, per § 75 sequencing ("full-screen + draw budują na działającej gramatyce" — InteractiveCanvas regression fix landed first as prerequisite).

### Trigger model — both axes
- **Auto-on-rotate** (existing, preserved). `device.isLandscape && !device.isDesktop` → immersive. Untouched.
- **Portrait toggle** (new). Shared `<FullscreenToggle>` button in the canvas frame, top-right; Lucide `Maximize2` / `Minimize2`. Visible **only in portrait** — landscape already immerses via rotation, so a button there would be redundant and clutter the immersive layout.

### Unified flag — `immersive = isLandscape || fsActive`
Lives in `useLandscapeMode()` (hook return shape extended to `{isLandscape, fsActive, immersive, setFullscreen, canvasMaxHeight}`; backward-compat for legacy consumers reading only `{isLandscape, canvasMaxHeight}` preserved). Every chrome-hide / fit-to-viewport site reads `immersive`; only the `<FullscreenToggle>` visibility gate keeps reading `isLandscape` (because the button itself is portrait-only).

Behavioral contract: landscape behavior unchanged (`isLandscape ⇒ immersive`); portrait toggle ADDS the same immersive state without rotation. `canvasMaxHeight(landscapeOffset, portraitOffset)` picks the landscape offset whenever `immersive`, so portrait-FS gets `innerHeight − landscapeOffset` (field fills viewport).

### `fsActive` semantics — portrait state, no auto-reset
`fsActive` is purely a portrait-state. In landscape it's visually moot (`immersive` is true from rotation regardless). On return to portrait the user sees `fsActive` as they left it — no auto-reset. Stuck-state safety = the `<FullscreenToggle>` stays mounted in portrait-FS (icon flips to `Minimize2`), so manual exit is always available even if the user can't or doesn't want to rotate.

### `<FullscreenToggle>` shared component
- File: `src/components/canvas/FullscreenToggle.jsx`.
- Props: `{ fsActive, onToggle, isLandscape }`.
- Returns `null` when `isLandscape` (landscape has no button — rotation immerses).
- 44px touch target (`TOUCH.minTarget`), absolute-positioned top-right inside the canvas frame, `z-index: 30` above canvas; backdrop blur + dark glass background; **amber accent allowed** (the toggle is interactive — § 27 color-discipline carve-out for tappable affordances). Single CTA, no chevron, no competing button.

### Per-surface placement (Stage 1 = Match + Tactic only)
Floating Back/Save/Menu/draw-toggle stay attached to each surface (they're per-surface action vocabulary). BaseCanvas does **NOT** own them in Stage 1 — `<FullscreenToggle>` is the only canvas-frame-resident chrome that's universal. Surfaces continue to render their own immersive-mode floating controls (Back/Save on Match; Back/More/draw/Save on Tactic), they just gate on `immersive` instead of `isLandscape`. **Lift to BaseCanvas (FullscreenToggle as BaseCanvas chrome rendered by default) = future § 64 rung**, not this PR — that decision needs DrawingOverlay impl experience first to know how chrome composes with overlays.

### Scope — Stage 1
- **Match scout** (`MatchPage.jsx`) — InteractiveCanvas hot path. 6 chrome-hide / fit sites swapped; toggle mounted in canvas frame.
- **TacticPage** — InteractiveCanvas. 5 sites swapped; toggle mounted; draw-mode (`✏️`) becomes available in portrait-FS via the floating controls path (was landscape-only before).

### Fast-follow (separate ticket — same pattern, shared component)
- ScoutedTeamPage heatmap (the original § 64.10 / step #11 target — landscape coach view)
- LayoutDetailPage
- BunkerEditorPage
- LayoutAnalyticsPage

Each: extend `useLandscapeMode` consumption to grab `immersive` + `fsActive` + `setFullscreen`, swap chrome-hide sites, mount `<FullscreenToggle>` in the canvas frame. Mechanical refactor on top of Stage 1.

> **UPDATE (§ 80, 2026-05-25):** Stage 2 closeout pruned this candidate list. LayoutDetailPage shipped; BunkerEditor + LayoutAnalytics **excluded** (not deferred) because they are not canvas-primary surfaces; ScoutedTeam belongs to a separate scroll-dashboard model. See § 80 for the canvas-primary boundary principle that governs which surfaces consume `immersive`.

### What's NOT in Stage 1 (explicit non-goals)
- DrawingOverlay (next major piece per § 75; gated on a clickable toolbar mockup per § 27).
- BaseCanvas-owned chrome (premature without DrawingOverlay impl experience).
- A1 bump fix (parked; render-side reverse in `drawPlayers.js` — separate brief).
- A2 ShotDrawer migration to BaseCanvas (deferred per § 75 grammar — bigger lift, after DrawingOverlay).
- iOS `requestFullscreen` API integration (not needed — viewport-level `100dvh` + chrome-hide gets us the full immersion without browser FS API permission UX).

### Invariants the fix verified
- **Tap-element + drag-element work in portrait-FS** (regression fix `6f7158f7` from earlier today must hold; smoke item #4).
- **2-finger pinch/pan untouched** (gesture grammar in BaseCanvas already correct after the wrapped-setter fix).
- **Landscape behavior unchanged** (all existing landscape sites read `immersive` which equals `isLandscape` when in landscape; only behavioral delta is the portrait-toggle path being newly available).

References: § 64.9, § 64.10, § 75.


## § 77 — Draw / DrawingOverlay — Stage 1 (Match scout, landscape-only entry, shipped 2026-05-24)

Closes the second § 75 sequenced item (after § 76 Full-screen Stage 1). Adds a hand-drawn annotation surface on top of the Match scouting canvas without compromising the gesture grammar that the InteractiveCanvas regression fix (`6f7158f7`) established. Implementation locks the iPad/PencilKit arbiter model § 75 chose: input ownership stays in BaseCanvas, the overlay is render-only.

### Arbiter model — single source of input, no event-forwarding
- **BaseCanvas's `touchHandler` is the SOLE input owner.** A new `drawMode` flag + `onDraw{Start,Move,End,Abort}` callbacks are added as BaseCanvas props and merged into `stateRef.current` alongside existing field-edit callbacks.
- **1-finger in drawMode** → routes to the draw consumer (Match holds the stroke state + engine); field-edit dispatch (place / select / bump / shot / loupe) is suspended for the duration of drawMode regardless of `editable`.
- **2-finger** → existing zoom/pan branch wins (early-return at the top of `handleDown`); UNTOUCHED.
- **2nd finger landing mid-stroke** → BaseCanvas calls `onDrawAbort()` from the pinch branch, sets `drawingRef.current = false`, then starts pinch. The consumer drops the in-progress stroke cleanly; transform takes over.
- **drawMode also short-circuits all of `handleUp`'s field-edit logic** (no toolbar-close, no place-on-release, no tap-detection). The branch resets all gesture refs and bails before the field-edit cascade.
- A new `drawingRef` sentinel (owned by BaseCanvas, sibling of `draggingRef`) is threaded into `createTouchHandler` so the arbiter can know "is a stroke in progress right now" without React re-renders.
- **No event-forwarding** (rejected per § 75 + this brief). Two input surfaces + synthetic dispatch is fragile on mobile Safari AND violates "BaseCanvas owns input". One handler, three branches.

### DrawingOverlay — render-only
`src/components/canvas/DrawingOverlay.jsx`. Sits inside BaseCanvas's frame as InteractiveCanvas child (so it can read transform via `useBaseCanvas()`). Declares `pointerEvents: 'none'` — never touches input. Receives `strokes` (committed) + `currentStroke` (in-progress) as props; paints both through the same perfect-freehand outline pipeline so the live trace matches the committed look. Backing store is DPR-scaled with rAF retry on first mount (handles parent-not-yet-sized).

Mapping field→screen uses the same transform BaseCanvas applies to its main canvas (`pt.x * canvasSize.w * zoom + pan.x`), so strokes track zoom + pan without rubber-banding. Stroke `size` is divided by `zoom` so the visual thickness stays constant in screen pixels regardless of canvas zoom.

### perfect-freehand
MIT, `^1.2.3`, added to deps. Single dep bump (~6 kB gzipped; tldraw uses it under the hood). Tuned for finger input on the field canvas:
```
streamline: 0.55  // smoothing — high enough to feel iPad-like
thinning:   0.35  // mild velocity-based taper
smoothing:  0.6
simulatePressure: true   // gives the iPad taper when phones report no pressure
last: true
```
Pressure-on-stylus path open for future when there's an iPad consumer who'd notice; finger input on phones uses simulatePressure for the taper.

### Toolbar — 5 colors / 3 widths / Undo / Redo / sized eraser / Clear-confirm / Done
`src/components/canvas/DrawToolbar.jsx`. Floating bar inside the canvas frame, bottom-center, `position: absolute; left: 0; right: 0; margin: 0 auto; width: fit-content; max-width: calc(100% - 16px)` + `flex-wrap` (1 row when fits, 2 when narrow). Survives content-driven width changes cleanly (the `left:50%; transform:translateX(-50%)` alternative loses centering when row count flips).

**Buttons** — all 44px touch (`TOUCH.minTarget`):
- **5 color swatches** (amber default + white + red + cyan + green) — selected gets an amber ring (`box-shadow: 0 0 0 2px ${COLORS.accent}33`).
- **3 width pills** (thin/medium/thick = 3/6/10 px) — selected fills amber bg + amber-border.
- **Undo / Redo** — Lucide `Undo2` / `Redo2`. Disabled at stack-empty boundaries.
- **Eraser** (toggle, Lucide `Eraser`) — when active, swatches & widths still selectable to set the eraser-radius source (radius = 2× selected stroke size). Eraser does point-erase (see below).
- **Clear** (Lucide `Trash2`, `danger`-styled) — opens ConfirmModal "This will remove every stroke on this point. Cannot be undone via Undo." (data-loss per § 27). Disabled when no strokes.
- **Done** (Lucide `Check`, amber-filled CTA) — exits drawMode + clears in-progress stroke. Does NOT immediately persist — annotations ride the next `savePoint` write.

§ 27 — amber accent on interactive-active per the toggle carve-out. ConfirmModal for destructive Clear. No emoji (Lucide only). No competing CTA per surface. Lives at `z-index: 40` (clean stack above DrawingOverlay 15, InteractiveChrome 19-20, FullscreenToggle 30, ✏ chip 35).

### Eraser — sized point-erase (NOT whole-stroke)
`eraseAcrossStrokes(strokes, eraserPos, radiusPx, refW, refH)` in `drawStrokes.js`. For each stroke, walks `pts`; any point within `radiusPx` (screen-px at the 1000×500 reference field) of `eraserPos` is removed; surviving contiguous runs of 2+ points become new sub-strokes (so erasing through the middle of a stroke splits it cleanly). One eraser tap can produce 0, 1, or N output strokes from a single input stroke. `setAnnotations` bails on identity when nothing changed.

Eraser is destructive — entering eraser mode and erasing clears the `redoStack` (matches "any new edit invalidates redo" semantics).

### Storage shape — `point.annotations`
Per-point Firestore field. Object-of-objects (no nested arrays per PROJECT_GUIDELINES § 9):
```json
"annotations": {
  "0": {"color":"#f59e0b", "size":6, "pts":[{"x":0.12,"y":0.34}, ...]},
  "1": {"color":"#ef4444", "size":3, "pts":[...]}
}
```
Numeric string keys preserve order on rehydrate (`strokesFromFirestore` sorts numerically). `pts` is a list of `{x, y}` maps; coords are normalized 0..1 in the field rect. `null` / unset = no annotations.

**Native-orientation coords (no mirror on write).** Stage 2 aggregation will apply `mirrorPointToLeft` at read time when stacking annotations from multiple points (each with its own `fieldSide`) onto a single side of the coach heatmap. Storing native keeps the data lossless and reversible.

### Entry surface — landscape-only on Match scout
Per § 77 decision #1 (locked): entry chip `✏ Rysuj` is gated on `isLandscape && !drawMode`. **Not portrait**, **not portrait-FS** (§ 76), **not Tactic** (Tactic keeps its existing freehand for now), **not ScoutedTeam** (Stage 2).
- Portrait Match = scouting without draw (entry would clutter the small viewport).
- Portrait-FS = view-only (per § 76 + this brief — explicit non-goal).
- Landscape Match = the immersive coach surface where draw makes sense.

The chip and FullscreenToggle are mutually exclusive in code (FS-toggle returns null in landscape, chip renders only in landscape) so they never collide for the top-right slot.

### Rewizja of § 75
§ 75 stated "1-finger draws, 2-fingers stay zoom/pan" as a tier-3 / read-family vs edit-family clean split. § 77 implements that as **draw being a 4th tier (drawMode) gated on orientation per surface**, with the arbiter living in BaseCanvas (input ownership stays universal). Specifically:
- The "draw available everywhere" reading is rewised: draw is a per-surface affordance gated on entry context (landscape on Match scout for now; Tactic stays untouched; ScoutedTeam = Stage 2).
- BaseCanvas is the arbiter, not a forwarding station — § 75's "event forwarding" framing is explicitly REJECTED here.
- Portrait-FS (§ 76) ≠ draw-enabled. Portrait-FS is preview-immerse for content-first reading; entering draw requires a dedicated affordance which today exists only in landscape on Match.

### Stage 2 (separate ticket)
- ScoutedTeam coach-heatmap annotation aggregation: read all `point.annotations` for the filter scope, mirror per-point via `mirrorPointToLeft`, stack on the single coach canvas.
- Annotations heatmap toggle (Pozycje / Strzały / Adnotacje) — first verify current toggle state on ScoutedTeam (discovery task).
- Per-match annotation filter (mirror match-scope picker pattern from § 60).

### What's NOT in Stage 1
- TacticPage freehand → DrawingOverlay unification (Tactic stays on its own freehand; unify later).
- Stylus / pen pressure (perfect-freehand supports it; no consumer that benefits yet).
- Cross-coach annotation merge in concurrent mode (last-write-wins; annotations are point-level not side-level — both coaches scouting the same point will overwrite each other's strokes on next save). Add per-coach annotation lanes if it matters in practice.
- Annotations in QuickLogView (no draw surface — QuickLog is the squad-less / no-canvas path).

References: § 64.4, § 64.5, § 75, § 76, PROJECT_GUIDELINES § 9 (Firestore-array anti-pattern).


## § 78 — Draw / DrawingOverlay — Stage 2 (ScoutedTeam annotations, shipped 2026-05-25)

Closes § 75 Draw sequencing — extends the Stage 1 (§ 77) capture surface to the coach-summary heatmap with TWO distinct annotation layers, each gated by its own toggle pill.

### Two layers, two storage scopes
| Layer | Field | Coords | Edit | Default | UX |
|---|---|---|---|---|---|
| **Plan coacha** (2a) | `scouted.annotations` (per scouted-team doc) | Canonical (no per-point mirror — drawn directly on the canonical summary view) | Editable, one set per scouted-team | Toggle **ON** | `✏ Rysuj` chip top-right of expanded heatmap, BOTH orientations. DrawingOverlay + DrawToolbar (reuse Stage 1). |
| **Notatki scouta** (2b) | `point.annotations` (per-point, Stage 1) | Mirrored at READ time via `mirrorPointToLeft` (same as positions/shots) | Read-only aggregate (writes happen on Match scout per § 77) | Toggle **OFF** (additive context) | No edit surface — purely a display layer. Respects `filterMatchId`. |

Same Firestore object shape for both (`{ "0": {color, size, pts:[{x,y}]}, ... }`), same `strokesToFirestore` / `strokesFromFirestore` helpers from `drawStrokes.js`. The scope distinction is purely semantic: per-point (mirrored) vs per-team (canonical).

### HeatmapCanvas signature extension (isomorphic with InteractiveCanvas Step #4)
- **Pass-through draw props:** `drawMode` + `onDraw{Start,Move,End,Abort}` + `children`. Forwarded to BaseCanvas. Self-closed `<BaseCanvas />` replaced with `<BaseCanvas>{children}</BaseCanvas>` so DrawingOverlay can compose via `useBaseCanvas()` context (just like InteractiveCanvas's chrome). BaseCanvas arbiter / `drawingRef` / `touchHandler` drawMode-branch are already universal from Stage 1 — HeatmapCanvas just forwards.
- **New render-path props:** `showAnnotations` (2b, default `false`), `showCoachPlan` (2a, default `false`), `coachAnnotations` (saved coach plan strokes, canonical coords).
- Two new render branches in `drawHeatmap` callback, both gated on their respective toggles:
  - `showAnnotations` → iterate `points[i].annotations`, paint each stroke via shared `paintStroke()`. Coords already mirrored upstream — HeatmapCanvas treats them as canonical-display.
  - `showCoachPlan && coachAnnotations && !drawMode` → paint saved coach plan. **Hidden during drawMode** — DrawingOverlay shows the live editing copy on top, and double-rendering stale-saved + live-edit causes ghost artifacts.

### Shared `paintStroke()` helper
Extracted from DrawingOverlay's internal paint loop to **`src/components/canvas/drawStrokes.js`**. Two callers now share one render path:
- **DrawingOverlay** (Stage 1) — paints to its own overlay canvas above BaseCanvas; live capture during drawMode.
- **HeatmapCanvas** (Stage 2) — paints inside BaseCanvas's main canvas via `drawHeatmap` callback; static aggregate render for the saved coach plan + per-point scout annotations.

Tuning constants (`STROKE_SIZES` / `STROKE_COLORS` / `FREEHAND_OPTIONS`) hoisted to `drawStrokes.js` as the canonical source. DrawingOverlay re-exports them for back-compat with existing MatchPage / DrawToolbar imports (no consumer change required). Breaks the circular import that would otherwise exist if `paintStroke` imported from DrawingOverlay.

The perfect-freehand SVG path generator (the § 77 hotfix bug — `Q` without endpoint pair) now lives with `paintStroke` in `drawStrokes.js`. **Single source of truth** so the two render surfaces can't drift on the path math.

### Aggregation extension (`mirrorPointToLeft`)
`src/utils/helpers.js:239-254`. Added `annotations: mirrorAnnotations(pointData.annotations)` to the return shape. New private `mirrorAnnotations()` helper:
- Accepts Firestore object shape OR pre-normalized array.
- Filters out invalid strokes (no `pts`).
- Maps each `pts[i]` through `mirrorPos` (the existing generic `{x, y} → {x: 1-x, y}` helper).
- Preserves `color` + `size` untouched.
- Returns `undefined` when input is empty/absent.

`mapOnePointForTeam` in ScoutedTeamPage (`:275-300`) propagates `annotations` automatically via the existing `...mirrored` spread — no per-call-site change.

### ScoutedTeam wiring
- **7 new state hooks** (`hmShowCoachPlan` ON / `hmShowAnnotations` OFF / `coachDrawMode` / `coachStrokes` / `coachRedo` / `coachCurrent` / `coachColor`/`coachSizeKey`/`coachEraser`/`coachSaving`).
- **9 handlers** (same shape as MatchPage Stage 1: start/move/end/abort/undo/redo/clear/enter/exit). Eraser radius scales with selected stroke size at 1000×500 reference field — feel matches Stage 1.
- **Load-from-Firestore `useEffect`** gated on `!coachDrawMode` — avoids clobbering an in-progress edit when remote scouted-team updates land (e.g., another coach on the same team).
- **Save via `ds.updateScoutedTeam(tid, sid, { annotations: strokesToFirestore(strokes) })`** — uses the existing updater. No new dataService function.
- **Entry chip `✏ Rysuj`** in expanded branch top-right, **both orientations** (ScoutedTeam is a read-only display surface, not a scouting flow — the § 77 Match landscape-only gate does NOT apply here). Miniature 110px preview stays read-only.
- **DrawToolbar** mounted when `coachDrawMode` — reused verbatim from Stage 1 (5 colors / 3 widths / Undo / Redo / sized eraser / Clear-confirm / Done).

### Toggle pills
Two new pills added to the existing toggle row (sibling of Positions / Shots / Collapse). Neutral amber styling per § 27 — multi-color stroke layer doesn't have a single semantic color, so we use the existing interactive-active accent. `flex-wrap` added to the toggle row so 5 pills fit gracefully on narrow widths.

### Render order on the heatmap (z-order)
1. Field image + heatmap density (positions/shots from `points`)
2. Scout annotations (2b — `points[i].annotations`, mirrored) — gated `showAnnotations`
3. Coach plan (2a — `coachAnnotations`, canonical) — gated `showCoachPlan && !drawMode`
4. Bunker labels (read-priority — annotations should not occlude labels)
5. DrawingOverlay live edit (only when `coachDrawMode` — replaces the hidden saved-set #3)

### Out of scope (Stage 2 non-goals)
- Per-coach annotation lanes (multi-author merge). 2a is last-write-wins per team (single editable set). Add lanes if multi-coach editing becomes real.
- 2b reverse-edit (coach editing scout's per-point annotations from the summary). Read-only by design; scout edits via Match scout per § 77.
- Annotation export / share. Strokes stay inside the scouted-team doc / point docs.
- Tactic → DrawingOverlay unify (still FUTURE per § 77 decision — Tactic keeps its current freehand).

References: § 4.3 (correction note), § 64.4, § 64.5, § 75, § 76, § 77, PROJECT_GUIDELINES § 9.


## § 79 — Bump arrow direction + scout shot-origin semantic (clarification + A1 fix, shipped 2026-05-25)

Two render-side fixes in `drawPlayers.js` that also lock the bump data semantic that wasn't fully written down before.

### Data semantic (the source of confusion)

For a player slot `i` that has been bumped:
- **`bumpStops[i]`** = drag-START position (= where the player WAS before the bump). Set by `onBumpPlayer(idx, fromPos)` (drag flow) and by the `'late'` menu action which saves the pre-action `players[i]` as the bump-stop, then clears `players[i]` for re-tap.
- **`players[i]`** = drag-END position (= where the player IS after the bump). Updated by `onMovePlayer` during drag, or by the re-tap after `'late'`.

PROJECT_GUIDELINES § 2.5 already says "auto-creates bump stop at drag START position". § 79 codifies it in DESIGN_DECISIONS for cross-reference.

### Lane labels (PROJECT_GUIDELINES § 2.9) are RENDER-SOURCE, not chronological

- **"Shot 1st (from player)"** = `shots[i]` lane. Default render origin = `players[i]` = drag-END = chronologically SECOND.
- **"Shot 2nd (from bump)"** = `bumpShots[i]` lane (Tactic-only — MatchPage scout has no Shot-2nd UI). Render origin = `bumpStops[i]` = drag-START = chronologically FIRST.

So the "1st" / "2nd" in the labels refer to **lane priority, not chronology**. This is intentional for Tactic where the coach decides which lane to mark based on the planned tactical sequence — there's no implicit chronology.

### Fix #1 — Bump arrow direction (render-side, `drawPlayers.js:185-225`)

Bezier reversed so the arrowhead lands on `players[i]` = end/destination:
- Before: `moveTo(players)` → `quadraticCurveTo(cp, bumpStops)`, arrowhead at `t=0.88` → near `bumpStops` (= START = wrong per user spec).
- After: `moveTo(bumpStops)` → `quadraticCurveTo(cp, players)`, arrowhead at `t=0.88` → near `players` (= END = correct per user spec).

Arc bow side preserved across the swap — the perpendicular vector for the control point is still computed from the OLD `(players → bumpStops)` direction, so saved `bs.curve` values render on the same physical side as before (no visual regression for previously-saved tactics).

The legacy ring marker at `bumpStops` position is unchanged; it correctly visualizes the START position (= "pause point" per § 2.5).

### Fix #2 — Scout shot-origin lane (Option C — explicit prop)

New `bumpShotOriginAtStart` prop on `drawPlayers` (default `false`). When `true` AND `bumpStops[i]` exists, the `shots[i]` lane origins from `bumpStops[i]` instead of `players[i]`.

Per-consumer setting:
| Consumer | `bumpShotOriginAtStart` | Effect |
|---|---|---|
| MatchPage scout | **`true`** | Scout's `shots[]` (sole lane — no Shot-2nd UI) render from drag-START when bump exists. Matches scout intent: "shoots from cover, then bumps". |
| TacticPage | default `false` | § 2.9 "Shot 1st (from player) / Shot 2nd (from bump)" dual-lane semantic preserved verbatim. Both lanes remain independently writable and render from their respective ends of the bump. |
| LayoutDetailPage tactic preview | default `false` | Same as Tactic — preview must match what Tactic shows. |
| BunkerEditorPage | default `false` | No players rendered on the bunker editor canvas; flag is moot. |
| BallisticsPage (FieldCanvas legacy) | not threaded | Opus territory; doesn't pass the flag, default falsy is fine. |

The flag is threaded through `InteractiveCanvas` as a pass-through prop. `drawPlayers` accepts it via the existing options-object destructure.

### Why Option C (explicit prop) over alternatives

Considered during STEP 0 escalate:
- **Option A — universal swap** (no prop, always swap when bump exists): rejected because it would change Tactic's "Shot 1st (from player)" lane to render from `bumpStops` everywhere, making the § 2.9 dual-lane semantic redundant (both lanes from the same origin).
- **Option B — implicit heuristic** (swap only if `bumpShots[i]` is empty): rejected for fragility. Works today because Match scout never writes `bumpShots`, but a future surface that writes both lanes on a scouted point would silently break this heuristic.
- **Option C — explicit prop**: clean, opt-in, no fragile data-shape dependency, ~5 LOC of plumbing. Chosen.

### What's NOT in this fix
- **No `bumpShots[]` semantic change.** Tactic's Shot-2nd lane still renders from `bumpStops[i]` — that's its design intent per § 2.9 and is correct for Tactic's dual-lane model. The user-reported A1 bug was specifically about the SCOUT lane (`shots[]`), which now has the corrected origin.
- **No data migration.** `bumps[]` and `shots[]` are written exactly as before. Only render-time origin changes when the scout flag is on.
- **No change to the ring/pause-point marker.** Stays at `bumpStops` position (= START = where the player paused before bumping).
- **No HeatmapCanvas change.** Heatmap surfaces (ScoutedTeam summary, Match heatmap tab, TrainingResults) don't render via `drawPlayers`; they use their own density paint. Coach summary heatmap shows player positions as dots, not via the bump-arrow path.

### Anti-pattern surfaced + corrected

Two misleading comments in `drawPlayers.js` were corrected in this fix:
- L185 said "(player start → bump destination)" — wrong: `players` = end, `bumpStops` = start per data.
- L158 said "shots from bump/destination position" — wrong: `bumpStops` origin = drag-START.

Both were written under the assumption that "bumpStops" semantically = "where the bump lands" (the destination), which conflicts with the actual write semantics ("bump stop at drag-START position" per § 2.5). Comments are now accurate.

References: § 2.5 (PROJECT_GUIDELINES) drag → bump rule, § 2.9 (PROJECT_GUIDELINES) Tactic shot lanes.


## § 80 — Full-screen Stage 2 closeout: `immersive` = canvas-primary surfaces (shipped 2026-05-25)

Closes § 76's fast-follow list. Stage 2 ships the wzorzec on the one remaining surface where it applies mechanically; the other two pages on § 76's original list are **excluded** (not "deferred"), and ScoutedTeam belongs to a separate model.

### What Stage 2 ships

- **LayoutDetailPage** — full wzorzec applied. 6 `!isLandscape` / `isLandscape` chrome-hide gates swapped to `!immersive` / `immersive`; `<FullscreenToggle>` mounted in the canvas frame (portrait-only, self-gates on `isLandscape`); destructure widened to `{ isLandscape, fsActive, immersive, setFullscreen, canvasMaxHeight }`. `canvasMaxHeight(20, 200)` offset preserved verbatim. § 76 hooks-order hotfix (hook above conditional returns) untouched.

### Boundary principle — `immersive` applies to canvas-primary surfaces only

The full-screen idea is "hide chrome so the canvas fills the viewport." That only makes sense when the canvas IS the primary thing on the surface. On surfaces where chrome ≠ decoration (the chrome IS the primary thing — a form to edit, a table to read), hiding it removes the user's task target.

This is the dividing line for which surfaces consume `immersive`:

| Surface | Primary content | In immersive scope? |
|---|---|---|
| Match scout | Field canvas | ✅ Stage 1 |
| Tactic | Field canvas | ✅ Stage 1 |
| LayoutDetailPage | Field canvas | ✅ Stage 2 |
| BunkerEditorPage | Canvas + **bunker-naming form** (form is the editing workflow) | ❌ excluded |
| LayoutAnalyticsPage | Canvas heat + **deaths/breaks tables + scope pills** (tables are the analytic deliverable) | ❌ excluded |
| ScoutedTeamPage | Scrollable coach dashboard (heatmap is one tile among many) | ⤴ separate model |

### Why BunkerEditor is excluded (not deferred)

BunkerEditor renders: PageHeader → canvas → bunker-naming form. The naming form is the editing workflow — the user taps a bunker on the canvas AND types a name in the form. Hiding the form on rotation breaks the workflow; keeping it visible while hiding the header is half a measure that adds button clutter for no payoff. The page's canvasMaxHeight already uses identical L/P offsets (`160 / 160`) by design — the form-area chrome is intentionally orientation-stable. Adding `<FullscreenToggle>` would offer a button that does nothing useful on this surface.

### Why LayoutAnalytics is excluded (not deferred)

LayoutAnalytics renders: PageHeader → small canvas heat tile → **scope pills + deaths/breaks tables** (long, scrollable, the actual deliverable). The canvas is a thumbnail-scale visualisation; the tables are where the analyst's eyes spend time. Going immersive would zoom up a secondary content element while hiding the primary one — inverse of what immersive is for. The page also doesn't consume `useLandscapeMode` today; the inline `window.innerHeight − 90` at LayoutAnalyticsPage:122 is a local literal that stays local. Future cleanup could route it through the hook for consistency, but that's a code-hygiene refactor, not an immersive-scope expansion.

### ScoutedTeam — separate scroll-dashboard model

ScoutedTeam is a scroll-of-tiles, not a canvas-page. The heatmap is one tile. Going "immersive" on a scroll-page either means (a) lift one tile to fill the viewport (a different UX — closer to a lightbox or zoom-modal) or (b) collapse the surrounding tiles (which destroys the dashboard's at-a-glance value). Either way it's a different design problem than § 76's "hide page chrome, fit canvas to viewport." Lives in its own spec when needed.

### Hook & component contract — frozen for the canvas-primary set

The Stage 1 contract from § 76 is now the **complete** contract for `immersive`:

- Consumers of `immersive` (the chrome-hide / fit-to-viewport callers): MatchPage, TacticPage, LayoutDetailPage.
- The hook's `canvasMaxHeight` offset table in `src/hooks/useLandscapeMode.js` retains all 7 entries — it's the source of truth for `innerHeight − N` literals across the codebase, separate from the `immersive`-eligibility set above. BunkerEditor and HeatmapCanvas continue to consume `canvasMaxHeight` (they need the height math); they just don't participate in the immersive chrome-hide path.
- `<FullscreenToggle>` is mounted only on canvas-primary surfaces. Adding it elsewhere would be a category error.

### What § 76's "Fast-follow" subsection now means

Read § 76 § "Fast-follow" as the **candidate list at the time § 76 was written**. Stage 2 (this section) is the closeout that pruned the list to its applicable subset. Future surfaces that join `immersive` must satisfy the canvas-primary test.

References: § 27 (Apple HIG — clarity, depth: chrome serves content, not vice versa), § 64.9, § 75, § 76.


## § 81 — ScoutedTeam immersive: heatmap-region full-viewport overlay (closes immersive scope, shipped 2026-05-25)

Adds the **third and final** immersive model on top of § 76 (canvas-page chrome-hide) and § 80 (canvas-primary boundary). ScoutedTeam is the scroll-dashboard case that § 80 deferred — § 81 ships it as a fundamentally different shape: not a chrome-hide on the page, but a **promotion of one region (the heatmap) to a full-viewport overlay** that covers the rest of the dashboard. After § 81 the immersive design is complete; every data-canvas surface now sits in exactly one of three buckets.

### Model — region-overlay, not chrome-hide

The expanded heatmap region (HeatmapCanvas + DrawingOverlay + Rysuj chip + DrawToolbar + Positions/Shots/Plan coacha/Notatki scouta toggle pills) promotes to a `position: fixed; inset: 0` overlay that covers the viewport. The dashboard underneath is intact but hidden. On exit, the overlay un-fixes and the dashboard returns to its prior scroll position.

This is **not** the canvas-page chrome-hide pattern from § 76. There is no `immersive` flag, no `<FullscreenToggle>` on a canvas-frame, no `isLandscape` auto-rotation. The decision space is different because the page shape is different — ScoutedTeam is a scroll of tiles, the heatmap is one tile, and "going immersive" on a scroll-page only makes sense if one tile takes over the viewport (the lightbox / zoom-modal model).

### Decisions — explicit entry, both orientations, no auto-on-landscape

- **Trigger:** explicit `<FullscreenToggle>` (Maximize2) on the **expanded** heatmap region only. The 110px collapsed miniature does NOT get a Maximize button — tap-to-expand stays the primary affordance for the miniature, and a second-step Maximize is added by the user only after the region is committed to.
- **Both orientations.** The toggle renders in portrait AND landscape (caller passes `isLandscape={false}` to the shared component to bypass the canvas-page rotation gate). The shared `<FullscreenToggle>` from § 76 is reused for visual consistency; the gate it ships with is meaningful only for canvas-primary surfaces.
- **NO auto-on-landscape.** Rotating the dashboard does NOT auto-promote the heatmap. Entry is always a deliberate tap on Maximize2. Rationale: ScoutedTeam is a scroll-page; rotating it just rotates the scroll. Promoting the heatmap on rotation would be a layout surprise — the user came to read text-heavy tiles around the heatmap and the rotation gesture is about content, not chrome.
- **State decoupled from `useLandscapeMode`.** The `heatmapFullscreen` state is local to ScoutedTeamPage and does not consume `isLandscape` / `immersive` / `fsActive` from the hook. This avoids leaking the canvas-primary `immersive` semantics onto the dashboard.

### Implementation contract — no-remount transition, scroll save / restore

- **No-remount.** The inline ↔ fixed-overlay transition is a single conditional `style` object swap on the SAME wrapper `<div>` in the expanded branch. React preserves the entire subtree across renders — HeatmapCanvas's canvas element stays mounted (no re-init), DrawingOverlay's stroke state stays, coach draw state (live strokes, redo, color, size, eraser) stays, toggle-pill state stays. Tested via build; verified semantically by tracing component identity through the render.
- **Same JSX subtree.** The overlay does not extract the region into a portal — keeping things on the same React tree means lifecycle is uninterrupted and the existing `DrawingOverlay` arbiter (§ 78) keeps working without context shenanigans.
- **Wrapper-style swap:** inline = `{ borderRadius: 12, overflow: 'hidden', background: '#0a1410', border: '1px solid #162016', position: 'relative' }`; fullscreen = `{ position: 'fixed', inset: 0, zIndex: 60, background: COLORS.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }`. Background = `COLORS.bg` so iOS notch / dynamic island reads as a single immersive surface.
- **Scroll save / restore.** `scrollContainerRef` attached to the `<div overflowY:auto>` at the dashboard root. On enter: `scrollTopBeforeFsRef.current = scrollContainerRef.current.scrollTop`. On exit: `setHeatmapFullscreen(false)` THEN `requestAnimationFrame(() => scrollContainerRef.current.scrollTop = scrollTopBeforeFsRef.current)` to wait for layout settle. The L748 margin wrapper around the expand/collapse branch collapses to 0 height when the inner region is `position: fixed`, so the dashboard below visually shifts up; explicit restore ensures the user lands back exactly where they were.
- **`<FullscreenToggle placement="top-left">`.** A small extension to the § 76 shared component: new `placement` prop (default `'top-right'` — Stage 1 canvas-primary callers untouched; new `'top-left'` value for ScoutedTeam to avoid colliding with the existing `✏ Rysuj` chip at top-right). The `'top-left'` variant uses safe-area-aware positioning (`calc(8px + env(safe-area-inset-*, 0px))`) because the overlay covers the viewport including iOS notch — the canvas-frame-bound default offsets stay literal to avoid regressing canvas-primary callers.

### Boundary — closes the § 76 immersive scope

After § 81, the immersive scope is complete. Every data-canvas surface sits in exactly one bucket:

| Surface | Primary content | Immersive model | Section |
|---|---|---|---|
| MatchPage scout | Field canvas | Chrome-hide (auto landscape + portrait FullscreenToggle) | § 76 |
| TacticPage | Field canvas | Chrome-hide (auto landscape + portrait FullscreenToggle) | § 76 |
| LayoutDetailPage | Field canvas | Chrome-hide (auto landscape + portrait FullscreenToggle) | § 80 |
| **ScoutedTeamPage** | **Scroll dashboard (heatmap = 1 of N tiles)** | **Region-overlay (explicit toggle, both orientations, no auto-on-landscape)** | **§ 81** |
| BunkerEditorPage | Canvas + bunker-naming form | Excluded — canvas-secondary | § 80 |
| LayoutAnalyticsPage | Canvas + deaths/breaks tables | Excluded — canvas-secondary | § 80 |

The scope is now frozen. Future surfaces that need immersive must declare which bucket they belong to (canvas-primary → chrome-hide, scroll-dashboard with one canvas tile → region-overlay) or argue for a fourth model. Adding immersive to a canvas-secondary surface (form-primary or table-primary) remains a category error.

### What's NOT in § 81

- **No HeatmapCanvas changes.** Its `sizingStrategy='fit'` default (window.innerHeight max) works in both inline and overlay contexts via flex-column natural sizing.
- **No data shape changes.** `scouted.annotations` write path identical in inline + overlay states; § 78 Stage 2 contract holds.
- **No `useLandscapeMode` changes.** The hook's offset table + `immersive` flag remain canvas-primary contracts.
- **No keyboard / Escape exit.** Stage 1 of region-overlay is touch-only. Future polish could add Escape-to-exit, but mobile is the primary target and the on-screen Minimize2 is the canonical affordance.
- **No portal / DOM restructure.** Same React subtree, conditional wrapper style. The simplicity is deliberate — preserves draw state without ceremony.

References: § 27 (clarity, depth), § 64.9, § 75, § 76, § 78, § 80.


## § 82 — MatchPage edit-state lifecycle (B1 closeout, shipped 2026-05-25)

Closes the SCOUT #3 cache-leak bug (HIGH severity, data integrity) by giving MatchPage's edit state a coherent lifecycle. Before § 82, `editPoint(pt)` loaded `draftA` / `draftB` / `editingId` / annotations from a saved point but had no symmetric exit hook — `setEditingId(null)` was called bare from two Back-from-editor sites, leaving drafts populated and `editingId` dropped. The next URL transition (fresh-scout, team-switch, point-id clear) inherited the bleed; the next save took the `if (editingId)` branch on the now-cleared editingId and went down weird paths; OR drafts survived even after editingId was nulled, contaminating the next "fresh" point. Three diagnosed bleed sequences (A: editPoint → mode=new; B: team-switch in editor; C: lastAssign roster-promotion via delete/clearAll) are closed by one coordinated change.

### Invariants (preserved verbatim)

§ 82 was scoped against three invariants that any future change to MatchPage state lifecycle must also honor:

1. **§ 18 concurrent — empty-shell editingId.** `startNewPoint` (`MatchPage.jsx:834`) was designed to create an empty shell in Firestore and set `editingId` to the shell's id, then let the user fill it in. The shell is empty but the editingId is set. Exit-edit transitions must NOT clear that editingId — the user should be able to come back to the same shell. Today `startNewPoint` is dead code (zero callers), but the invariant is preserved via an explicit `isEmptyShellRef` flag that gates the editingId clear inside `exitEditMode()`. Live code keeps the ref false → editingId always clears → matches the simple model. If `startNewPoint` is ever revived, the shell-link survives the exit transition.
2. **Perspective is not point-identity.** `fieldSide` (which way is "home") and `activeTeam` (`'A'` or `'B'`) track the user's perspective, not the identity of any specific point. Exit-edit transitions clear point-identity state (drafts, editingId, annotations) but preserve perspective state.
3. **`lastAssign*` memoization is save-only.** The "remember the last saved point's roster so the next fresh point auto-fills the same squad" UX feature is legitimate — but the capture must happen only after a successful save, not on every `resetDraft` call. Capturing in `resetDraft` had been a Seq-C source: `handleDeletePoint` and `clearAllPoints` route through `resetDraft`, which captured the about-to-be-deleted point's roster as "last used" and the next fresh point auto-filled with the deleted roster.

### Contract

- **`exitEditMode()`** (`MatchPage.jsx:~836`) is the single canonical exit-edit transition. It clears: drafts (`draftA` / `draftB`), draw state (annotations + redoStack + currentStroke + drawMode + eraserMode), point UI ephemerals (selPlayer, mode, outcome, showOpponent, quickShotPlayer, draftComment, isOT, toolbarPlayer, shotMode). It preserves: perspective (`fieldSide`, `activeTeam`). It clears `editingId` only when `!isEmptyShellRef.current` (invariant 1).
- **Back-from-editor handlers** (portrait PageHeader + landscape floating ‹ Back) route through `exitEditMode()` before navigating to review. Was bare `setEditingId(null)` + partial state clears; now clears drafts + annotations + outcome too so Seq-A bleed (drafts surviving the editor→review→fresh-scout round-trip) is closed at the exit.
- **`lastAssign*` capture** lives in `savePoint`'s success branch, right before the trailing `resetDraft()`. Removed from `resetDraft` (was unconditional; Seq-C source). `resetDraft` is now a pure state reset; memoization is the save path's responsibility.
- **Fresh-scout intent reset effect** (`MatchPage.jsx:~610`) watches `[scoutTeamId, searchParams]` and detects URL transitions into a NEW fresh-scout intent (mode=new + different scoutTeamId, OR re-entry into mode=new). Composes a `(scoutTeamId, mode|attach)` key; ack stored in `lastFreshScoutKeyRef`. On a new intent with stale state (`editingId` set OR drafts populated), calls `exitEditMode()` once. `?point=<id>` is explicitly handled by the existing pointParamId effect (the new effect updates the ack key and returns without resetting, letting editPoint load the new point normally). The key-based ack prevents re-triggering on in-progress draft updates during legitimate scouting (Seq A + Seq B closeout).

### Why explicit ref, not state-derived shell detection

An alternative considered: detect empty-shell via `points.find(p => p.id === editingId)` + `status === 'open'` + no-data check on both sides. Rejected because:
- Race: a point just-created via `addPointFn()` may not be in `points` yet (onSnapshot hasn't fired). `find` returns undefined → indeterminate.
- Today's live code has no shell path; the ref is a forward-compat hook for invariant 1 only.

The ref is set true ONLY in `startNewPoint`'s shell-create branch (`MatchPage.jsx:~872`), false in `editPoint` (loading saved data) and in `savePoint` success (data committed → no longer a shell).

### What's NOT in § 82

- **No data migration.** Existing points unaffected — this is a render-time / lifecycle fix, no schema changes.
- **No `resetDraft` removal.** `resetDraft` is still called from the save success path and from `handleDeletePoint` / `clearAllPoints`. It just no longer captures `lastAssign` as a side effect. `exitEditMode` is a SISTER function, not a replacement — `resetDraft` zeroes the activeTeam back to scoutingSide-default and is called after a save (where activeTeam reset to "ready for next point" is correct), while `exitEditMode` preserves activeTeam for the Back-to-review case (where the user may immediately re-enter scouting on the same team).
- **No zombie-shell cleanup.** If a future revival of `startNewPoint` creates a shell that the user abandons (via Back), the shell stays in Firestore as an "open" doc with no data. That's a § 18 hygiene concern separate from B1; not in scope here.
- **No URL-based detection of "fresh-scout" beyond `mode=new`.** The reset effect treats `mode=new` as the canonical fresh-scout intent + treats any `scoutTeamId` change as a team-switch. Other URL shapes (e.g. `?scout=X` with no mode and no point) fall under "attach" which acks the key but doesn't reset (matches today's auto-attach effect at `MatchPage.jsx:~683`).

References: § 18 (concurrent scouting), § 27, § 40 (per-coach streams), § 42 (point IDs).


## § 83 — `scouted.roster` contract: division-filtered at write, orphan-preserving on repair (B3 closeout, shipped 2026-05-25)

Closes SCOUT #1 (HIGH severity) — the roster picker rendered the union of a parent team's players + every child team's players, regardless of the tournament's division. The bug was at write time: `ScoutTabContent.buildScoutedPayload` unconditionally unioned `[teamId, ...childIds]` then mapped via `playerOnTeam`, so the resulting `scouted.roster[]` carried D2 + D3 + everything in one bag. The picker (`MatchPage.jsx:357 — rosterA = scoutedA.roster.map(pid => playersById[pid]).filter(Boolean)`) faithfully rendered the wrong data.

### Historical context — why the union existed

Commit `1a030508` (2026-04-20, "restore roster pre-fill + parent/child hierarchy + division auto-assign") introduced the parent+children union as a fix for the **opposite** prior symptom: empty roster blocking scouting. The chosen fix was a wide union (`[teamId, ...childIds]` with `playerOnTeam` filter), which solved the empty-roster bug by ensuring children's players surfaced for parent-only teams that have no direct roster. But it over-corrected — the division narrowing that should have been part of the new contract was missing, and the wide union shipped without it. § 83 restores the narrowing while preserving the children-expansion intent of `1a030508`.

### Contract

- **Write site:** `scouted.roster[]` is computed at write time (`ScoutTabContent.buildScoutedPayload`) as the players whose teams satisfy: (a) team is in `[teamId, ...childIds]` AND (b) `team.divisions[tournament.league] === finalDivision`. `finalDivision` resolves to `team.divisions[league]` first, falling back to the tournament's `resolvedDivision` (per the existing logic; B3 only re-orders the computation so finalDivision is known before the roster narrowing).
- **Defensive fallback to full union.** If `finalDivision` is null (no division criterion exists) OR the per-team filter yields zero matches (incomplete team data — division missing on every candidate), the writer falls back to the full `[teamId, ...childIds]` union. This preserves the `1a030508` empty-roster fix when team data is incomplete; better to over-show than to ship an empty roster that would re-introduce the prior bug.
- **Multi-team (§ 72) honored.** The `playerOnTeam` helper is unchanged and continues to honor `player.teams[]` (a player rostered on multiple teams). The narrowing operates on the team-id set, not the player set; multi-team players still surface where appropriate.
- **Read site UNCHANGED.** `MatchPage.jsx:357` continues to render `scouted.roster` verbatim through `playersById`. The data is now correct at write; the read site needs no change. `playersById` is the GLOBAL players map (Phase 2.2.b), so name resolution for already-assigned players is unaffected by what's in `scouted.roster`.

### Repair migration — orphan-preserving union

For scouted docs written before § 83 (parent + all children union), narrowing the roster could orphan players already assigned in existing points: the picker would no longer surface them as candidates. The repair (`repairScoutedRostersForTournament(tid, league)` in `dataService.js`) handles this structurally:

1. For each scouted doc S in the tournament, compute the **narrowed roster** using the same write-time logic as `buildScoutedPayload`.
2. Walk every match where `match.teamA === S.id` (S is home) or `match.teamB === S.id` (S is away). For each match's points, collect every playerId in `homeData.assignments` / `awayData.assignments` (whichever side matches S). This is the **already-assigned set**.
3. **New roster = narrowed roster ∪ already-assigned set.** The union guarantees the picker keeps resolving names for any player who's already been assigned to a point on this scouted entry, even if they fall outside the narrowed division.
4. If `newRoster` differs from the current `scouted.roster[]` → `updateDoc`. If they match (set equality) → skip the write. **Idempotent** — re-running the repair on already-narrowed rosters yields the same union, no Firestore writes.

The repair is admin-gated (`useIsSuperAdmin`) and surfaced as a "Repair scouted rosters" Btn in `CoachTabContent` — separate visual card from the existing `repairScoutedDivisionsForTournament` Btn so the two repairs don't blur. Result line shows `scanned / updated / unchanged / orphan / failed` counts.

### Why role-gated visibility (not symptom-gated)

The repair-divisions Btn (§ 71 era) is symptom-gated on `divisionScouted.length === 0 && scouted.length > 0` — a cheap client-side check. For B3 the over-broad-roster shape isn't cheaply detectable from the client without walking points to know which playerIds are legitimately in use. Computing the "is this roster over-broad?" predicate per scouted doc would cost ~O(scouted × matches × points × assignments) reads per render — not free. Role-gating is the pragmatic compromise: the user-visible repair-divisions surface stays auto-detecting; the admin-only B3 repair is always visible to super_admin (Jacek runs it once per affected tournament, then it remains as a no-op safety net).

### What's NOT in § 83

- **No Schedule-importer changes.** `ScheduleCSVImport.jsx:349, 372` and `ScheduleImport.jsx:277` use single `teamId` (no `[teamId, ...childIds]` union). They don't have the B3 over-broad bug — verified at pre-flight against current code. The diagnosis report's listing of these sites as "same union shape" was off.
- **No model change.** `team.divisions[league]` map already carries enough signal. Phase 2.4 `/teamMemberships/` junction is NOT a prerequisite. (A long-term cleaner solution — drop the `scouted.roster[]` snapshot entirely, compute live at read time from `players[].teams[]` × resolved child-team — is out of scope; that would be a Phase 2.4 rethink.)
- **No `playerOnTeam` change.** Multi-team handling stays as is.
- **No automated detection / mandatory repair prompt.** Admin reads the entry in DEPLOY_LOG / DESIGN_DECISIONS and runs the repair when ready.

References: § 27, § 71 (`repairScoutedDivisionsForTournament` pattern), § 72 (multi-team membership), CC_BRIEF_HIGH_BATCH_B3_B2HOTFIX.


## § 84 — Onboarding funnel hang: async hygiene + escape hatch (B2-hotfix b+a, shipped 2026-05-25)

Hotfix for the B2 funnel hang on `PbleaguesOnboardingPage` — fresh users could land permanently stuck on the "Czy to ja?" Confirm card when `selfLinkPlayer` failed silently (the root cause being the collection mismatch between the global `/players/` picker and the workspace-scoped link write/listener, **deferred to B2 (c)** for an architectural decision). § 84 covers the **(b) async hygiene + (a) escape hatch** halves: it does NOT make linking work — it only guarantees the user can always leave.

### Two diagnosed pain points the hotfix closes

1. **Permastuck `busy` flag.** `handleSelect` cleared `busy` only in its `catch` block; success-path relied on `subscribeLinkedPlayer` firing → page unmounts → busy unused. When the listener never fires (workspace-mismatch path), busy stayed true forever → modal disabled → Confirm card frozen on the spinner state → backdrop tap disabled (`Modal onClose={busy ? undefined : onClose}`) → topBar Logout disabled (`<Btn disabled={busy}>`) → only escape was closing the browser tab.
2. **No exit from Confirm card on error.** After `selfLinkPlayer` errored, the page's `setError(...)` painted a red toast on the shell card BEHIND the modal. The user was parked on the Confirm card with only `[Nie, szukaj dalej]` + `[Tak, to ja]` buttons — no Skip on this view. Re-tapping Tak re-fired the same error.

### Fixes

- **`finally { setBusy(false) }`** in both `handleSelect` and `handleSkip` (`PbleaguesOnboardingPage.jsx`). Busy ALWAYS clears post-await, regardless of success/error/hang. Removed the `if (busy) return;` guard from `handleSkip` so the escape hatch works even mid-selfLink.
- **Watchdog (8s)** armed before each `selfLinkPlayer` await. If the promise never settles, the watchdog clears `busy` + sets a recovery error. Cleared in the same `finally`, reset on each new attempt, cleaned up on unmount.
- **Modal-side error reflow.** `LinkProfileModal` now accepts an `error` prop and watches it via `useEffect`: when error transitions to non-null while `confirmTarget` is set, the modal drops back to the searchable list (where the `NoMatchFallback` Skip-link is reachable). Transition-only via `prevErrorRef` to avoid loops on sticky errors.
- **TopBar lifted above modal backdrop.** `position: relative; zIndex: 110` (above Modal's `zIndex: 100` within the same outer stacking context); opaque `background: COLORS.bg` covers the dimmed backdrop. Persistent **Pomiń na razie** + **Wyloguj się** buttons in the topBar — both always-enabled (no `disabled={busy}`). Skip routes through `handleSkip` (busy-guard removed); Logout through a new `handleSignOut` that clears the watchdog before delegating to `useWorkspace().signOutUser()`.

### Z-index sandwich (math)

The outer container of PbleaguesOnboardingPage has `position: fixed; zIndex: 50` which creates a stacking context. `LinkProfileModal` (a child) uses `position: fixed; zIndex: 100` — its z applies within outer's stacking context. The topBar (also inside outer) with `position: relative; zIndex: 110` wins over the modal's z:100 for the overlapping pixel region. No portal required.

### Concurrent skip vs in-flight selfLink — accepted race

Skip can now fire while a `selfLinkPlayer` promise is still in-flight. Acceptable race: if the link completes in the background, `linkedPlayer` will land in the gate, which takes precedence over `linkSkippedAt` in `App.jsx`'s onboarding gate (`if (!linkedPlayer && !userProfile?.linkSkippedAt) ...`). Either way the user gets unstuck.

### What's NOT in § 84 (explicit non-goals — deferred to B2 (c))

- **No change to the collection contract.** `selfLinkPlayer` continues to write workspace-scoped (`/workspaces/{slug}/players/{pid}`). `subscribeLinkedPlayer` continues to listen workspace-scoped. The picker continues to feed from global `/players/`. The mismatch is intact — linking will continue to fail for workspaces ≠ `ranger1996`. **The user just won't be permanently stuck anymore.**
- **No `firestore.rules` change.** The global vs workspace self-link carve-out decision is part of B2 (c).
- **No `ProfilePage` change.** ProfilePage uses the same `LinkProfileModal` — the new `error` prop is optional (parent must opt in). ProfilePage's existing flow is unaffected.
- **No watchdog as global pattern.** § 84 watchdog is local to onboarding's specific listener-may-never-fire shape. Other surfaces with async writes don't get it by default.

References: § 27, § 38.12 (player-link gate), § 49.8 (self-link Path A), CC_BRIEF_HIGH3_DIAGNOSIS (B2 diagnosis report), CC_BRIEF_HIGH_BATCH_B3_B2HOTFIX (this brief).


## § 85 — Player-link contract: global `/players/`, workspace-scoped self-link carve-out (B2 (c) closeout, shipped 2026-05-25)

Closes B2 (c) — the architectural decision deferred from § 84. Self/admin link/unlink + the `subscribeLinkedPlayer` listener migrate from workspace `/workspaces/{slug}/players/{pid}` to **global `/players/{pid}`**. **Completes the Phase 2.2 player-collection migration** for the link write path that was overlooked when reads (`usePlayers` hook) and structural writes (`addPlayer` / `updatePlayer` dual-write) moved to global in Phase 2.2.b.

### Why global is the correct contract (and why workspace was wrong)

`linkedUid` is fundamentally a user↔player identity binding. Users are global (`/users/{uid}`). Players are global (`/players/{pid}` per § 63.15.3). The binding belongs at the global layer. Workspace-scoping it was a Phase 0 artifact from before the players collection was hoisted to global — not a design intent.

Symptom that surfaced this: on workspaces ≠ ranger1996, the modal picker (fed from global `usePlayers`) showed players that didn't necessarily exist in the workspace subcollection where `selfLinkPlayer` writes. Result: `TARGET_NOT_FOUND` errors + silent listener no-show. § 84 covered the hotfix (escape hatch + watchdog); § 85 fixes linking itself.

### Workspace-scoped self-link carve-out — the security invariant

Moving link writes to global opens a previously-impossible attack: a workspace_admin of `workspaceA` could craft a `selfLinkPlayer(pid, ownUid)` write where `pid` is a player owned by `workspaceB`. Without scoping, the global write would succeed and the user would have claimed a cross-workspace player.

The carve-out closes this with **`isMember(resource.data.ownerWorkspaceId)`** — gated on the player's owner workspace, not just any auth user. The widened READ of global `/players/` (Phase 2.2.b — open to any auth user) does NOT grant cross-workspace claim ability because writes go through this scoping.

### Rule carve-out structure (global `/players/{playerId}` block)

Three new carve-outs added to the `allow update: if` chain, **mirroring the workspace block** (`firestore.rules:228-270`) but with the membership check substituted for the workspace's path-segment `slug` reference:

| Carve-out | Membership gate | Identity gate | Diff allowlist |
|---|---|---|---|
| Self-link | `isMember(resource.data.ownerWorkspaceId)` | `data.get('linkedUid', null) == null` (or self for idempotent re-claim) AND `request.resource.data.linkedUid == request.auth.uid` | `['linkedUid','pbliIdFull','linkedAt']` |
| Self-edit | `isMember(resource.data.ownerWorkspaceId)` | `resource.data.linkedUid == request.auth.uid` AND `request.resource.data.linkedUid == request.auth.uid` | `['nickname','name','number','age','favoriteBunker','nationality','updatedAt']` |
| Self-unlink | `isMember(resource.data.ownerWorkspaceId)` | `resource.data.linkedUid == request.auth.uid` AND `request.resource.data.linkedUid == null` | `['linkedUid','pbliIdFull','unlinkedAt']` |

**None include `ownerWorkspaceId` in `affectedKeys().hasOnly`** — Phase 3.c.2 ownership-transfer invariant preserved. Only super_admin (via the structural-write path) can change ownership.

Canonical brittle-null form (`data.get('linkedUid', null)`) used everywhere — covers both missing-field and explicit-null cases. Matches the workspace block (L239) pattern.

### `isLinkedSelfPlayer(slug, pid)` — body change, signature preserved

The selfReports rule (workspace path `/workspaces/{slug}/players/{pid}/selfReports/`) consults `isLinkedSelfPlayer(slug, pid)` at L295 (create) and L297 (update/delete). The helper's body now reads from global `/players/{pid}` instead of `/workspaces/{slug}/players/{pid}`:

- `slug` param retained — still consumed by the `isPlayer(slug)` workspace-role check that gates the helper.
- Only the `get(...)` path changes — from workspace to global.
- Call sites unchanged.

### Write contract — global-only (NOT dual)

Unlike structural writes (`addPlayer` / `updatePlayer` dual-write workspace + global), the link writes are **global-only**:

- The workspace mirror would re-invoke the workspace self-link rule which requires `isPlayer(slug)` (workspace role). The exact users this fix targets (non-ranger1996, no workspace player role yet) would fail the workspace half → dual-write would fail entirely.
- Existing workspace `linkedUid` values are NOT touched (backstop, per § 85 / Jacek decision — Phase 2.2.d will collapse them alongside the rest of the workspace players cleanup).
- The one-shot migration script (`phase_85_linkeduid_to_global.cjs`) copies existing workspace `linkedUid` to global so already-linked users keep resolving on first reload post-deploy.

### Picker filter — defense in depth on top of rules scoping

`usePlayers` (`useFirestore.js:31`) is all-global — no workspace filter. The self-link surfaces (`PbleaguesOnboardingPage`, `ProfilePage`) filter the picker source at parent level via `useUserWorkspaces` to `players.filter(p => userWorkspaceSlugs.has(p.ownerWorkspaceId))`. Defense in depth (UX matches rules scoping) — admin paths (`UserDetailPage` mounting `LinkProfileModal` for admin player assignment) DON'T filter; they continue to see the unfiltered global player list, as expected for the admin role.

### Sequenced deploy contract (security-critical)

Same pattern as Phase 2.1c / 2.2.b / 2.3.b — rules-first because the new code needs new rules to succeed:

1. **Rules deploy** — `firebase deploy --only firestore:rules`. New rules go live. Old code (still on workspace) is unaffected because the workspace block is untouched.
2. **Migration script** — copies workspace `linkedUid` → global per linked player. Idempotent + conflict-safe.
3. **Code deploy** — `npm run deploy`. New code reads/writes global; migrated linkedUids resolve immediately.

Old-code logged-in users keep working through the entire window. Post-code-deploy reload picks up the new code → reads global → migration filled the gap.

### What's NOT in § 85 (explicit non-goals)

- **No workspace `linkedUid` nulling.** Backstop intact. Cleanup with Phase 2.2.d.
- **No workspace block rules change.** Workspace self-link carve-out at L228-270 stays — needed for the backstop to keep being writable if a hypothetical rollback brings back workspace-path link writes.
- **No `LinkProfileModal` API change.** Admin paths continue to use unfiltered global player list. Filtering is parent-level concern.
- **No ProfilePage UI redesign.** Same UX, filtered candidate list under the hood.

### Pre-flight gotchas wired into the implementation

- Link writes use `updateDoc({field: value})` form — NOT `setDoc(merge:true)` with dot-notation. Firestore parses dot-notation in `setDoc` as nested-map sets, which would break the rules `affectedKeys().hasOnly([...])` allow-list.
- Rules use canonical brittle-null form `resource.data.get('linkedUid', null)` everywhere — covers both missing-field and explicit-null cases. Matches existing workspace block pattern.

References: § 38.12 (player-link gate), § 49.8 (self-link Path A), § 63.15.3 (players global), § 65.2 (ownership single-owner), § 67 (rules architecture), § 84 (B2 hotfix funnel-hang escape), CC_BRIEF_B2C_LINK_TO_GLOBAL (this brief).


## § 86 — ShotDrawer migrated to BaseCanvas: § 75 grammar everywhere, canvas ladder consolidated (B11 / A2 closeout, shipped 2026-05-26)

Closes B11 / A2 (was on Active board #2). **The last canvas surface still off the § 64 ladder** — ShotDrawer's pre-§ 86 `<img>` + native scroll + ad-hoc `onTouchEnd`/`onClick` handler — migrates to BaseCanvas. After § 86 every interactive field-rendering surface in the app sits on the same arbiter (Match scout / Tactic / LayoutDetail / ScoutedTeam heatmap / Bunker editor / Layout analytics / ShotDrawer), inherits the same § 75 input grammar, and shares the same touchHandler dispatch.

### What it gains for ShotDrawer

Pre-§ 86 ShotDrawer had: tap-place-only. Post-§ 86: pinch-zoom + 1-finger pan + long-press loupe + tap-place + tap-delete. Same touchHandler dispatch as the rest of the canvas surfaces — no grammar drift.

Plus structural cleanup bundled:
- **Dead-X icon removed** (drawPlayers.js block at L138-143 pre-§ 86) — was rendered on main canvas as a red-X-in-black-circle offset top-right of each shot marker, hit-tested ONLY in `mode='shoot'`, but `mode='shoot'` only fired when ShotDrawer modal was OPEN (at z:91 with backdrop opacity 0.4), which occluded the main canvas. → Dead affordance by construction since whenever the X was "live", it was unreachable.
- **`findShot` hit-test** changed from X-offset (`s.x + 14/w, s.y - 10/h`, radius 14px) to **shot center** (radius 22px = `TOUCH.minTarget/2`, finger-friendly). Single touch model — tap shot directly to delete.
- **`players[selectedPlayer]` precondition removed** from touchHandler's `mode='shoot'` branch — defensive check that's no longer needed because ShotDrawer is the only entry into `mode='shoot'` post-§ 86, and player-placement prereq is enforced upstream (drawer doesn't open without a selected player).
- **Main canvas `mode='shoot'` switch removed** from MatchPage (`<InteractiveCanvas mode={shotMode !== null ? 'shoot' : mode}>` → `mode={mode}`). Main canvas stays in user's editor mode regardless of drawer state.

### Why BaseCanvas (not InteractiveCanvas) — design call

The brief proposed mounting `<InteractiveCanvas>` inside ShotDrawer with "consumer draw function for markers". Those two together are contradictory — InteractiveCanvas has a **fixed `drawFn`** that always renders drawPlayers + drawQuickShots + drawZones + drawBunkers + opponent layer + counter data + visibility data + …, with no customization slot. The "consumer draw function" pattern fits **BaseCanvas's `draw` render-prop**, which is exactly what BaseCanvas is for (consumer decides what to render).

Going through InteractiveCanvas would have introduced clutter in the drawer:
- Player markers + diagonal origin lines from off-screen player to shots (player half is off-frame when `viewportSide` is opposite).
- Zones, quickShot indicators, bumps — none of which belong in a shot-placement surface.

BaseCanvas direct = exactly what ShotDrawer needs (field + bunkers context + shot markers) and nothing more.

### Opponent-half framing — `viewportSide` retires `scrollLeft` hack

Pre-§ 86 ShotDrawer used `<img height:100%; width:auto>` (image fills container height; width may exceed) inside `<div overflow:auto>`. Opponent-half framing by `scrollLeft = scrollWidth - clientWidth` (right) or `scrollLeft = 0` (left) on image load (L29-34 pre-§ 86).

Post-§ 86 uses BaseCanvas's `viewportSide` primitive (§ 64.8.3): canvas pans so the requested half stays in container. Identical visual effect, but now coords come from a canvas with `touchHandler.getRelPos` correctly accounting for pan (`canvasX = (clientX - rect.left - pan.x) / zoom` → `relX = canvasX / canvasSize.w`). Tap on visible opponent half → full-field 0-1 coord. No mismatch.

### v1 scope — drag-move-shot + tap-menu DEFERRED (explicit non-goal)

§ 86 v1 ships the **essentials** of § 75 grammar for shots: pinch + pan + loupe + tap-place + tap-delete. Two further behaviors from the broader § 75 vocabulary are deferred:
- **Drag-move-shot:** dragging an existing shot marker to a new position. Would need new touchHandler state (`draggingShot` ref) + new callback (`onMoveShot(pi, si, pos)`) + handleMove threshold logic to distinguish drag-shot from pan. ~80 LOC across touchHandler + BaseCanvas + ShotDrawer.
- **Tap-marker-menu:** tap-element opens contextual menu (delete + ev. edit + ev. kill toggle) instead of direct-delete. Pattern matches Match scout's player-toolbar approach.

Deferred because: (a) ShotDrawer pre-§ 86 had NEITHER drag nor menu — so v1 is strictly upgrade (gains tap-delete + pinch/pan/loupe; loses nothing); (b) implementation effort would have doubled the migration size; (c) tap-delete + Undo + re-place is reasonable workflow until the v2 brief is written.

### Why deviating from the brief is acceptable

Brief explicitly said "InteractiveCanvas" + smoke included drag-move + tap-element-menu. Two pieces of brief don't match the codebase shape (InteractiveCanvas's fixed drawFn vs "consumer draw function") or current touchHandler API (no shot-drag/no shot-tap callbacks). The brief was written before deep ShotDrawer + touchHandler reading. § 86 implements the spirit (canvas ladder consolidated, § 75 grammar, retire ad-hoc touch, dead-X cleanup) with adjustments documented above. v2 brief can pick up drag-move + menu when needed.

### What's NOT in § 86 (explicit non-goals)

- **No new touchHandler shot-drag logic.** Deferred to v2.
- **No InteractiveCanvas signature change.** `mode='shoot'` value still accepted (other callers could theoretically use it; today only ShotDrawer's internal BaseCanvas does).
- **No § 79 A1 contract change.** Origin lines + shot crosshair markers + bump bezier + `bumpShotOriginAtStart` prop all intact. Only the X-icon block at drawPlayers L138-143 removed; everything else preserved verbatim.
- **No data shape change.** `point.shots[pi][si] = {x, y, isKill: false}` model unchanged. Same Firestore writes (`sts(d.shots)` in savePoint).
- **No `quickShots` / `obstacleShots` change** (§ 19 / § 29 lanes untouched — ShotDrawer is precise-shot-only).
- **No admin UI / migration / rules change.** Pure client refactor.

### Canvas ladder status post-§ 86

Every interactive field-rendering surface in app:
| Surface | Mount | Grammar |
|---|---|---|
| Match scout, Tactic, LayoutDetail | InteractiveCanvas | § 75 universal |
| BunkerEditor, LayoutAnalytics | InteractiveCanvas | § 75 universal |
| ScoutedTeam heatmap | HeatmapCanvas (extends BaseCanvas) | § 75 universal (after § 81 region-overlay) |
| ShotDrawer | BaseCanvas (custom drawFn) | § 75 universal (§ 86) |
| BallisticsPage | FieldCanvas (legacy) | Opus territory, off-limits |

Ladder consolidated. Future canvas-needing surfaces should mount via BaseCanvas (or InteractiveCanvas / HeatmapCanvas if their fixed drawFns fit) — never raw `<img>` + ad-hoc touch.

References: § 27, § 64 (canvas ladder), § 64.8.3 (viewportSide), § 75 (canvas interaction model), § 79 (A1 origin lines), CC_BRIEF_B11_SHOTDRAWER_DISCOVERY (discovery), CC_BRIEF_B11_SHOTDRAWER_MIGRATE (this brief).

## § 87 — Zones — domain semantics + unified model (approved 2026-05-26)

### Domain semantics (settled — from Jacek)
- **Danger / Sajgon zones:** regions where, if an OPPONENT breaks into them *off the break*, they threaten our players — especially critical in the first phase of the point. Marked on the layout so the coach summary shows how often the opponent plays into them.
- **Big Move zone:** narrower than Danger/Sajgon, but additionally includes the center and our own side of the field.
- **Comms / callout zones (new):** in-game communication regions. A player yells the zone name (e.g. "ORANGE") to signal "I'm covering/shooting that zone — nobody else needs to hold it." The zone NAME is the team's callout vocabulary.

### Unified model (the decision)
All zones — Danger, Sajgon, Big Move, and any custom callout zone — are ONE object type. No special-casing, no hardcoded names.
- Zone = `{ id, name (editable), color, polygon: [{x,y},...], type? }`.
- **Names are data, never hardcoded** — they ARE the team's callout language, so they must be editable; each tenant/team has its own.
- Built-ins (Danger/Sajgon/BigMove) become seeded zones with default names + colors (red/blue/amber), fully renamable.
- Same functionality for EVERY zone: (1) drawn via the same polygon editor; (2) editable name; (3) own color; (4) scouting pill when a player is marked inside it; (5) per-zone stat in the coach summary.

### Universal stat
- Per zone: **"off the break %"** = % of scouted points where the analyzed team had ≥1 player whose break (initial, pre-bump) position is inside the zone, shown with count — e.g. "Strefa X off the break — 5% (1/30 punktów)".
- Generalizes the existing Danger%/Sajgon% computation to N zones.

### Scouting pill
- When a player's break position falls inside a zone during scouting, a pill in the zone's color + name appears — digitizes the in-game callout.

### Big Move's special analysis (pinned; generalize later)
- Big Move currently has a distinct computation (`computeBigMoves`: entry attempts attributed to nearest bunker) — the only non-presence stat.
- Decision: preserve it pinned to the migrated zone via `type:'bigMove'`. Generalizing "zone → nearest-bunker push" as an opt-in per-zone analysis is a future enhancement.
- **[OPEN — pending Jacek]** confirm the bunker-attribution is still used; if not, drop it for a cleaner model.

### Migration
- `layout.dangerZone / sajgonZone / bigMoveZone` (3 named fields) → `layout.zones: [{...}]`. Dual-write both shapes for ~1 ship cycle, then drop old fields. Idempotent one-shot, single workspace, low risk, no rules-surface change (`/layouts` writes already gated `isCoach`).

### Implementation status
- Approved direction; detailed schema + seams land in the forthcoming feature brief (extends existing polygon editor + `drawZones` + `coachingStats`, per the 2026-05-26 zone PRE-FLIGHT discovery).

## § 88 — Unified Zones v1 (approved May 2026)

### Concept
All field zones — Danger, Sajgon, Big Move, and custom callout zones — are ONE
object type. A zone's NAME is editable and IS the team's in-game callout
vocabulary (e.g. "ORANGE"). No hardcoded zone names.

### Model
`layout.zones[]`: { id (stable), name (editable), color (hex), polygon ([{x,y}]|null),
type ('danger'|'sajgon'|'bigMove'|null — internal) }. Replaces hardcoded
dangerZone/sajgonZone/bigMoveZone via dual-write migration (legacy fields kept in
sync; legacy readers untouched in v1). Palette: COLORS.zonePalette (amber reserved).

### Surfaces
1. **Zone list + draw** (LayoutDetailPage): card = swatch + name + actions. In-place
   edit — tap name = rename, tap swatch = color popover, pencil = draw, trash =
   delete (ConfirmModal). Draw mode = banner "Narysuj zakres strefy {NAME}" above
   full field + Save/Cancel, via the existing unified polygon editor. ≥3 vertices.
2. **Scouting pill** (MatchPage canvas): when a placed player falls inside a zone
   polygon, a zone-colored pill renders below the player marker (canvas-space,
   drawNumberBadge-style). Auto-detected via pointInPolygon. Digital callout.
3. **Strefy summary** (ScoutedTeamPage): net-new above-fold section between
   Strzelanie and Kluczowi gracze. Shield icon. Stat-row table (no progress bar):
   zone-color dot + name + off-break % + (N/M) count. Dashed empty-state when no
   zones. % colored by zone color (presence is informational, not quality).

### Detection (off-break %)
Extends danger/sajgon detection 1:1: static, placed positions only
(pointInPolygon on players[i]), iterating layout.zones[] instead of two hardcoded
fields. Per-zone { pct, count, total }.

### Big Move coexistence (§ 87)
Big Move stays its own pinned section with bunker-attribution (computeBigMoves);
excluded from the Strefy table to avoid double display.

### Transit — PARKED (May 2026)
Path∩polygon transit ("opponent runs THROUGH the zone = shot window") was designed
but gated on real data. Measured opponent in-point bump-rate = 4.7% (scouts
tap-place opponents, rarely record movement). Too sparse — transit % would be a
misleading near-zero. Not a model limitation (path base→bump→end exists) but a
capture-behavior one. Folds into the future movement / shot-by-zone pass, which
must first improve opponent-movement capture. Zone model kept forward-compatible
(stable id, ordered path) for that pass.

## § 89 — Scout point autosave draft (approved May 2026)

### Concept
Pre-commit resilience for the MatchPage scout editor — the in-progress point
(placements / shots / outcome / ancillary state) autosaves to localStorage after
~2 s idle and restores on return. **Local-only buffer; the commit path is
unchanged.** `savePoint` stays outcome-gated; the Save button gate
`disabled={!outcome || saving}` is untouched. Concurrent Firestore
`status: 'partial'` semantics (one coach's side committed, other side absent)
are **orthogonal** — they describe a committed but incomplete Firestore doc,
while the autosave is a local pre-commit buffer. The two never collide.

### Reused pattern
Mirrors § 48.8 PPT `WizardShell` persistence (`persistKey / loadPersisted /
savePersisted / clearPersisted` + TTL + try-catch on storage ops). **NOT**
the `pptPendingQueue` (which is an offline-write retry queue — a different
concern). The helper module lives at `src/services/scoutDraft.js`.

### Key shape
```
scout_draft__<kind>__<eventId>__<containerId>__<scoutingSide>__<editingId||'new'>
```
- `kind` ∈ {`tournament`, `training`}
- `eventId` = `tournamentId | trainingId`
- `containerId` = `matchId | matchupId`
- `scoutingSide` ∈ {`home`, `away`} (`'observe'` skips persist entirely)
- `editingId || 'new'` — load-bearing: prevents new-shell draft from hydrating
  into an edit-existing context and vice versa.

### Snapshot fields
`{ draftA, draftB, outcome, draftComment, isOT, annotations, fieldSide,
activeTeam, editingId, updatedAt }`. Excludes transient UI state
(`selPlayer`, `mode`, `toolbarPlayer`, etc.).

### TTL — 24h
Bigger than WizardShell's 10 min because a scout point edit can sit across a
tournament day. Stale snapshots return null on load (no ghost-restore).
Pressure-tested against the worst case: a snapshot rehydrating onto an
unrelated context — TTL + key identity-check together rule it out.

### Non-pristine guard
`isScoutDraftNonPristine(snapshot)` — true iff ≥1 player placed OR any shot
OR any elim OR `outcome` set. Pristine snapshots skip persist (avoids ghost
keys + ghost-restore of empty editors). `draftComment` and `annotations`
alone are auxiliary — they don't qualify.

### Restore precedence
Firestore `editPoint` (MatchPage `~:1217`) **wins** over localStorage when both
apply to the same point. The restore effect is declared **before** the
`?point=` auto-attach effect so `editPoint` runs last. The restore effect
only attempts the `__new` key — when URL has `?point=<id>`, that flow is
owned by `editPoint`, which loads canonical Firestore state and overwrites
any local hydration.

### Clear semantics
- **On `savePoint` success** → `clearScoutDraft(draftKey)`. Commit done; local
  buffer no longer needed.
- **On `clearAllConfirm` confirm** → clear too (user hard-wiped every point in
  the match; a stale draft afterwards is confusing).
- **On `exitEditMode` (back from editor) → DO NOT clear.** Matches WizardShell
  semantics — back-tap preserves; commit / explicit discard clears.
- Stale keys age out via TTL (no migration / sweep needed).

### Indicator + discard affordance
- **Indicator**: subtle `· zapisano` suffix in the editor PageHeader subtitle,
  appears for ~4 s after each autosave then fades. Text-only (no Lucide icon
  — kept low-noise per § 27 deference).
- **Discard**: `MoreBtn` in the editor PageHeader `action` slot → ActionSheet
  → "Porzuć draft" → `ConfirmModal` → `clearScoutDraft` + `resetDraft`.
  `MoreBtn` shown only when `draftKey` is non-null (= user has an active
  scout context). Lives in the editor view's chrome — not the review-view
  match menu (separate concern) and not the SaveSheet (would compete
  visually with the Save button).

### Orthogonality with Firestore `status: 'partial'`
The two layers are independent:
- `status: 'partial'` is **committed Firestore doc state** — one coach's side
  has data, the other's doesn't. Set by `savePoint` at the existing
  partial-completion branches; readers treat `status === 'open' || 'partial'`
  as in-progress.
- localStorage draft is **uncommitted local buffer** — pre-commit work-in-
  progress for THIS device's editing target.
- A `status: 'partial'` Firestore point loaded by `editPoint` populates the
  draft; subsequent local edits autosave under the `__<editingId>` key;
  commit clears the local key; Firestore status flips (or stays partial) on
  cross-coach state — local concerns never touch the Firestore status field.

No conflation, no race, no migration. The autosave is purely additive.

### Implementation
- New: `src/services/scoutDraft.js` (~120 LOC) — `buildScoutDraftKey`,
  `loadScoutDraft`, `saveScoutDraft`, `clearScoutDraft`, `isScoutDraftNonPristine`,
  `SCOUT_DRAFT_TTL_MS`.
- `pages/MatchPage.jsx` — 3 new effects (autosave / restore / —),
  3 clear-on hooks (savePoint success / clearAllConfirm / discard),
  PageHeader subtitle indicator + MoreBtn + ActionSheet + ConfirmModal.
- i18n PL + EN: `scout_draft_saved`, `scout_draft_discard`,
  `scout_draft_discard_confirm`.

### What this is NOT
- NOT a new Firestore write path. No partial-commit. No schema change.
- NOT a Save-gate change. The B5 backlog row's earlier (a)/(b) options
  (relax disabled gate) are moot — autosave is the entire B5 solution.
- NOT cross-device. localStorage is per-device by definition; a coach
  switching devices does not see drafts from the other device. Firestore-
  side cross-device sharing would require committing to `status: 'partial'`
  — explicitly declined.
- NOT a replacement for the events-model `sparing-rozkmina` decision.
  The "coordinate with sparing architecture" note on the B5 backlog row is
  superseded — autosave is local and event-model-agnostic.

## 90. Catalog + Tenant data model (approved 2026-05-28)

### Decision
Replace dual-write workspace+global duplication for players/teams/leagues with a **catalog + tenant** split:
- **Catalog** (PBLeagues, global): canonical identities — people, teams, leagues. Read: any auth. Write: super_admin only.
- **Tenant** (workspace-private): workspace-local entities + all scouting data — rosters per tournament, points, observations, notes. Read/write: `isMember(workspace)`.
- **Zero copy** for PBLeagues-linked entries. Workspace holds *references*, never duplicates.
- **Two classes**, distinguished by `pbliId`:
  - PBLeagues-linked → catalog (global, super_admin-only).
  - Workspace-local → tenant (workspace path, workspace-owned).

### 90.1 Why
Phase 2.x docs (§ 63.15, `MULTI_TENANT_MIGRATION_PLAN`) already target global-source-of-truth with workspace decommission (Phase 2.7). Current dual-write is transition cushion — workspace copies have zero readers. This § completes the migration. Side benefit: the duplication-sync bug class (e.g. `zdjecie` photo drop, fixed `fad7dc7b`) is eliminated structurally.

### 90.2 People — `/players/{id}` (catalog) · `/workspaces/{ws}/players/{id}` (tenant)
Pure identity. Fields: `name, nickname, photoURL, pbliId?, nationality, dateOfBirth?, ownerWorkspaceId, aliasIds[]`.

**No `role`, no `personType`, no persistent `teamId` on the person doc.** A single person can simultaneously be player on team A, coach on team B, staff on team C — even within one tournament. Role is *purely contextual*: lives only on roster entries.

Collection name "players" is historical. Semantically: "trackable individuals in the catalog" — includes coaches and staff.

- Catalog `/players/`: PBLeagues-linked only (all have `pbliId`).
- Tenant `/workspaces/{ws}/players/`: workspace-local (no `pbliId`).

### 90.3 Teams — same pattern
- Catalog `/teams/{id}`: PBLeagues teams.
- Tenant `/workspaces/{ws}/teams/{id}`: workspace-local teams.

No persistent roster on the team doc.

### 90.4 Per-tournament rich roster entry
Per workspace, per tournament, per participating team — at `/workspaces/{ws}/tournaments/{tid}/scouted/{sid}.roster[]`:

```
{
  playerId,            // catalog or workspace-local reference
  eventRole,           // 'player' | 'captain' | 'coach' | 'manager' | 'staff'
  number?,             // per-event override
  isGuest?,            // borrowed from another team
  guestOriginTeamId?   // origin team for guests
}
```

- **Initialization:** at team-add-to-tournament, roster initializes from canonical (PBLeagues default if linked, workspace-local default if not).
- **Editing:** workspace edits freely per tournament — guests, staff swaps, number overrides. Each tournament participation is an independent snapshot.
- **Canonical untouched.** PBLeagues canon is not modified; tournament entry is observation + per-event truth.

Backward-compatible upgrade from existing `[playerId, ...]` to rich entries: legacy entries interpreted as `{playerId, eventRole: 'player'}`.

### 90.5 Workspace scouting opinions — `playerNotes`
Workspace-private observations on catalog players live at a workspace path (exact shape decided at Stage 7 of migration: co-located with `scoutedTeam` vs flat per workspace). Receptacle required by the model: workspace cannot edit canonical doc but needs to record observations on canonical players.

### 90.6 Scoping
**Reads:**
- Catalog (`/players/`, `/teams/`, `/leagues/`): any authenticated user — PBLeagues entries are public-platform.
- Tenant (`/workspaces/{ws}/...`): **strictly `isMember(ws)`. No cross-workspace reads. Ever.** This is the FIT isolation guarantee.

**Writes:**
- Catalog: super_admin only. PBLeagues entries are immutable to workspace admins.
- Tenant: workspace coach/admin per existing rules.

### 90.7 Migration sequence
Ordered, each stage shippable independently and gated by explicit Jacek GO:

| # | Stage | Scope |
|---|-------|-------|
| 0 | §90 doc commit | This decision in repo. |
| 1 | `selfReports` relocation | `/workspaces/{ws}/players/{pid}/selfReports/{sid}` → `/workspaces/{ws}/selfReports/{sid}` (flat, `playerId` field). **Prereq for 2.2.d.** |
| 2 | `breakoutVariants` relocation | `/workspaces/{ws}/teams/{tid}/breakoutVariants/` → `/workspaces/{ws}/teamBreakouts/{tid}/variants/`. **Prereq for 2.3.d.** |
| 3 | `findPlayerByPbliId` → global | Single query target swap. |
| 4 | **Phase 2.2.d** — players cushion drop | Remove workspace player dual-write paths from `dataService`. PBLeagues-linked global docs stay; workspace-local global docs (no `pbliId`) migrate to `/workspaces/{ownerWorkspaceId}/players/` and removed from global (strict isolation by collection structure). |
| 5 | **Phase 2.3.d** — teams cushion drop | Same pattern for teams. |
| 6 | Rich roster entry upgrade | `scouted.roster[]` from `[id]` to `[{playerId, eventRole, ...}]`. Backward-compatible. |
| 7 | `playerNotes` rollout | When product need arises. |
| 8 | Final cushion drop (Phase 2.7) | Drop leftover workspace-mirror docs after stabilization. |

**Phase 2.4 (persistent TeamMemberships) — deferred indefinitely.** Per-tournament rich roster covers the immediate need; persistent per-team fields not currently required.

### 90.7.1 Stage 1 (`selfReports` relocation) — SHIPPED 2026-05-28
- **1.B.1 dual-write** + **1.B.2 backfill** (parity Legacy 52 == Flat 52) + **1.B.3 cutover** all shipped.
- **1.B.3 cutover = design (b), INDEX-FREE.** Writers go flat-only (`createSelfReport`, `migratePendingToPlayer`, and `propagateMatchup`/`applySelfReportOverride`/`dismissSelfReportFlag` via the new flat-only `updateSelfReport`). The matcher reuses the existing collectionGroup `getTrainingSelfReports` (1 query, grouped by `playerId`) instead of a per-player flat query — so the abandoned `(playerId, trainingId)` COLLECTION composite (`1cb6777d`) was **DROPPED** and **no `firebase deploy` was needed**. (Index-verification discovery established this; reading two viable matcher designs, (b) needs no composite.)
- **Dedup prefers flat** (`dedupePreferFlat` in PPT) across the 3 collectionGroup readers — collectionGroup path-order otherwise keeps the stale legacy copy, which would shadow override/dismiss mutations. Per-player dual-readers already prefer flat (Map new-wins).
- Legacy nested `/players/{pid}/selfReports/` is now **WRITE-DEAD** (rules comment-only); read-only until the legacy-doc cleanup stage, which precedes Phase 2.2.d (Stage 4).
- **§ 37.2 correction:** the index-verification brief's "`getTrainingSelfReports` @ `dataService.js:247`, path-derived" was **wrong** — it lives at `playerPerformanceTrackerService.js` and queries `collectionGroup('selfReports')` (field-first `playerId`, path fallback).

### 90.7.2 Legacy nested `selfReports` cleanup — DONE 2026-05-28
- One-shot delete script `scripts/migration/phase2_stage1_legacy_selfreports_cleanup.cjs` (CG-optimized, segment-count partition, per-doc twin check, orphan hard-stop). **Live run clean: 53 scanned / 53 twinned / 0 orphans / 53 deleted / 0 remaining**; flat path intact at 53. Idempotent (re-run is a no-op). The legacy nested `/workspaces/{ws}/players/{pid}/selfReports/` path is now **EMPTY** → Phase 2.2.d (player-doc cushion drop) can proceed without orphaning self-reports.
- **Follow-up micro-cleanup — DONE 2026-05-28 (§ 90.7.3 below):** the legacy-nested rules block + the `dedupePreferFlat` shim were removed, and the 3 PPT per-player dual-readers switched to flat-only. The legacy path is fully retired from code + rules.

### 90.7.3 Legacy `selfReports` path fully retired — DONE 2026-05-28
With the legacy docs deleted (§ 90.7.2), all remaining references to the nested path were removed:
- **PPT per-player readers** (`getTodaysSelfReports`, `getSelfReportsForPlayer`, `getPlayerBreakoutFrequencies`) dropped the legacy dual-read → flat-only (`where('playerId','==',…)`): one query instead of two, no more empty-subcollection reads on every PPT load.
- **`dedupePreferFlat` removed**; the 3 collectionGroup readers revert to plain `snap.docs` iteration (no legacy copy → no duplicate ids).
- **`firestore.rules`:** the dead nested `/players/{pid}/selfReports/` block was removed (deployed `firebase deploy --only firestore:rules` — compiled + released). collectionGroup reads ride the database-root `/{path=**}/selfReports/` rule; the flat block is the canonical selfReports rule.
- No data change; flat path (53 docs) unchanged. The only remaining nested-path reference is the defensive `playerId` path-fallback in `getTrainingSelfReports` (effectively dead, harmless).

### 90.8 Open (decided at execution time)
- Migration of existing 1066 global player docs at Stage 4: split by `pbliId`. Details in execution brief.
- `playerNotes` exact path at Stage 7.
- `breakoutVariants` relocation details at Stage 2.

### 90.9 Anti-patterns
- ❌ `personType` / `role` on `/players/{id}` doc — role is contextual, not personal.
- ❌ Cross-workspace reads of `/workspaces/{X}/...` — strict isolation.
- ❌ Workspace admin editing catalog (`pbliId`-bearing) entries — super_admin only.
- ❌ Mutating PBLeagues canonical roster from workspace — observe via tournament entry, don't override canon.

### 90.10 Isolation cutover deferred to the production-version push (decided 2026-05-28, Jacek)
> **Refined same day by § 90.12:** the scope below was revised down and **Stage 6 is no longer on the FIT critical path** — team membership stays on the global doc but workspace-READ-ONLY (super_admin-write), so there is no coach team-write to strand and the 2↔6 coupling argument here is **superseded**. Read § 90.12 for the current model + revised cutover scope.

Stages **2** (writers route by `pbliId` + catalog write-lock), **3** (migration: relocate no-`pbliId` → `/workspaces/{ws}/`, drop `pbliId` workspace twins), and **6** (team/role OFF the catalog doc → workspace roster) are **DEFERRED to the production-version push**, executed as **one coherent isolation cutover** — not piecemeal.

**Why coupled (the Stage 2 discovery):** Stage 2's catalog write-lock (global `/players` `/teams` create/update → `isSuperAdmin()` only) is semantically tied to Stage 6's thin identity doc. Team membership (`teams[]`/`teamId`) still lives on the "fat" catalog doc, and coach surfaces write it via `updatePlayer`/`changePlayerTeam` — `PlayerEditModal` (`PlayersPage`), `TeamDetailPage` add/remove, `ScoutedTeamPage` assign-to-team. Locking catalog writes (2a) **before** team membership leaves the doc (Stage 6) would strand coach team-assignment of `pbliId` players. So 2 + 6 ship together.

**Rationale:** all isolation effects are moot for single-tenant `ranger1996` (Jacek is super_admin → retains catalog edits; non-admin coaches already can't write the global-catalog half today). FIT's end-June tournament needs only a stable, read-mostly roster (no catalog mutation, no team reassignment). Avoid throwaway interim safeguards and half-states.

**Accepted interim posture (conscious, single-tenant-moot):**
- Shared global catalog → a second tenant would see the other's workspace-local players (read overlap).
- `workspace_admin` can still write the global catalog (the `isWorkspaceAdminOf(ownerWorkspaceId)` carve-out, `firestore.rules:506` / `:566`).
Both are closed by the production cutover; **accepted for the end-June FIT pilot.**

**Baseline (live + stable until the cutover):** **Stage 1** — merged readers `global ∪ /workspaces/{activeWs}/{players|teams}` + dedup by id with `pbliId` class-preference + the 42 ws-only `pbliId` backfill (global 3200→3242, ws-only 0); plus `findPlayerByPbliId`→global. Shipped `33b0d453` (2026-05-28). Backward-compatible: every doc is twinned today, so merged == global view.

### 90.11 Durable design principles (per Jacek, 2026-05-28)
Principles that govern the deferred isolation cutover (and the data model generally):
- **N-tenant, not 2.** No assumptions about workspace count anywhere; isolation is parametric by path / workspace. The Stage 3 migration routes by `ownerWorkspaceId`, supporting arbitrary N — never hard-code "ranger1996 + FIT".
- **Cost-first.** Minimize Firestore reads. The merged reader's full-catalog (~3242 docs) per-session load is the **#1 read-volume-audit target** — run the audit on the post-Stage-3 clean baseline (once the `pbliId` workspace twins are dropped and the workspace half shrinks to no-`pbliId` locals).
- **Identity ≠ membership.** The person doc is currently "fat" (`teamId` / `teams[]` / `role`). §90's thin identity doc + contextual role-on-roster is Stage 6 / TeamMemberships (§63.15.4). Multi-team **is** handled (`teams[]`); multi-**role** is NOT (single `role` field) — that is the real gap, deferred to Stage 6. Stage 2/3 must not deepen the fat-doc assumption — those fields ride along verbatim, untouched.

### 90.12 Global-vs-workspace data-model split + isolation principle (decided 2026-05-28, Jacek) — refines § 90.6 + § 90.10
The isolation guarantee is enforced by **who can WRITE**, not by where a field lives — so the "fat" catalog doc is acceptable as long as workspaces only READ it. This **removes Stage 6 (thin identity doc) from the FIT critical path** (it may remain a later nicety for multi-role).

**Global (shared platform data — workspace READ-ONLY, super_admin-write only):**
- **Player & team catalog**, INCLUDING team membership / affiliation. Workspaces consume it as read-only reference; they never write it → no cross-tenant write-bleed even with team-on-doc.
- **Layout technical config:** calibration, layout name, layout image.
- **Tournament schedule** (fixtures — who plays whom, division), at least for known leagues (NXL Europe, NXL US).

**Workspace-private (workspace-write, `isMember`-gated):**
- **Layout overlay:** naming, zones (strefy), tactics (taktyki) — a private overlay on the shared global layout.
- **Scouting data:** scouted teams + points.

**Isolation principle (refines § 90.6):**
- Global = read-only reference for workspaces; **only super_admin writes global.**
- Workspaces write ONLY their own data (layout overlay + scouting) under workspace paths gated `isMember`.
- "Physically cannot access" = a server-side `firestore.rules` READ predicate, **not** UI hiding.
- **super_admin (Jacek — sole holder of the role) = read-all across workspaces + write-global.**
- The realistic workspace write surface is exactly: layout description/zones/tactics + own scouting. Nothing else.

**Revised cutover scope (supersedes § 90.10's 2/3/6 framing):**
1. Lock global writes → `isSuperAdmin()` only (catalog incl. team membership + layout-technical config + tournament schedule).
2. Ensure workspace-writable data (layout overlay + scouting) lives under workspace paths with `isMember` rules.
3. Migrate any workspace-writable data still sitting in global out to workspace paths.
4. **Stage 6 NOT required for FIT** — global-read-only removes the team-membership write-bleed that previously coupled it (a later nicety for multi-role only).

**Trigger / hard deadline:** the cutover must complete **before a second tenant does real, private scouting whose data must be invisible to others.** FIT's end-June tournament (stable read-mostly roster, no catalog mutation) runs on the interim with accepted cross-tenant read-overlap; the hard deadline is the **first tenant doing active private scouting.**

**Owed before a calendar date can be set — two audits:** (a) scouting-data isolation map; (b) layout-overlay current shape (do naming / zones / tactics live on the global layout doc, or separately, today?). After both → effort sizing → Jacek sets the date.

## 91. super_admin Workspaces access surface (approved + shipped 2026-05-28)

**What:** A super_admin-only **Workspaces** surface (`/admin/workspaces`, behind
`SuperAdminGuard` + a More → Super Admin entry) that lists every workspace,
creates a new one, and manages ANY workspace's members / pending approvals /
roles — **without switching the super_admin's active context.** It replaces the
deleted workspace switcher (there is no other in-app path into a non-active
workspace; see the provisioning discovery).

**Why:** FIT (and future tenant) onboarding: tenants self-join into their own
workspace landing **pending**; the platform owner (super_admin =
`ADMIN_EMAILS` / `globalRole`) approves them and assigns a role — including
designating a tenant's own `workspace_admin` by granting the `admin` role —
all from one surface, while staying in `ranger1996`.

### 91.1 `_wsSlug` is now honored (was ignored)
The access-control writers historically took a `_wsSlug` param and ignored it,
always writing to `bp()` (the active workspace). New module-level helper:
```js
export function wsPath(wsSlug) { return wsSlug ? `workspaces/${wsSlug}` : bp(); }
```
`approveUserRoles`, `updateUserRoles`, `transferAdmin`, `removeMember`,
`migrateWorkspaceRoles` resolve their target via `wsPath(wsSlug)`. **Non-breaking
by construction:** every pre-existing caller passes the *active* slug
(`MembersPage` / `UserDetailPage` / `RoleTransferModal` → `workspace.slug`) or
`null` (`leaveWorkspaceSelf` → `removeMember(null, …)`) → resolves to `bp()`
exactly as before. Only the new surface passes a *different* slug. The dead
`wsPath()` stub that returned `bp()` unconditionally was removed.

### 91.2 createWorkspace does NOT switch active context
`enterWorkspace` (in `useWorkspace`) both writes the workspace doc AND switches
the caller's active workspace (`setWorkspace` + session/localStorage). The
super_admin must stay in their own context, so the surface uses a separate
`dataService.createWorkspace(slug, name, code)` that writes the bootstrap doc
only (caller becomes `adminUid` + `userRoles: ['admin']`; same shape as
`enterWorkspace`'s create branch). `slugify`/`hashPassword` are duplicated as
small local pure helpers to avoid importing the auth-critical hook into the
service layer (canonical copies stay in `useWorkspace.jsx`).

### 91.3 No rules change
Super_admin cross-workspace power already exists at the rules layer:
`isSuperAdmin()` is the first disjunct of `isAdmin(slug)` (so super_admin may
write members/userRoles/adminUid on ANY `/workspaces/{slug}`) and of the catalog
gates. The gap was purely client-side (the ignored `_wsSlug`). This brief was
client + service only.

### 91.4 Privilege tiers used (not the conflating `isAdmin`)
Gate the surface on `useIsSuperAdmin()` (route guard + component early-return +
menu item). Do NOT gate on the 4-path `useWorkspace().isAdmin`, which folds
super_admin into workspace-admin. The clean `isSuperAdmin` / `isWorkspaceAdminOf`
split is the basis for the eventual two-tier separation (workspace_admin blind
to super surfaces).

### 91.5 Known limitations
- **Reject/remove unlink read:** `removeMember` reads the target workspace's
  `players` subcollection to clear `linkedUid`; that read is `isMember(slug)`-
  gated. Works where super_admin is a member (e.g. `ranger1996`, any workspace
  they created). A workspace they've never joined would fail the unlink read
  (approve + role-assign are workspace-doc writes only, unaffected).
- **Catalog data-isolation is a SEPARATE track.** § 90.9 mandates catalog
  (`/players` `/teams`) be super_admin-only, but rules currently let a
  `workspace_admin` write own-workspace-owned catalog docs via
  `isWorkspaceAdminOf(ownerWorkspaceId)`. Not touched here — flagged for the
  data-isolation brief.

### 91.6 Anti-patterns
- ❌ Reusing `enterWorkspace` for provisioning — it switches active context.
- ❌ Gating cross-workspace management on the 4-path `isAdmin` (super_admin-only must use `isSuperAdmin`).
- ❌ Decorative amber on the surface (pending headers / badges stay neutral; amber only on CTAs + active RoleChips).

## 92. Workspace switcher — OPERATION (approved + shipped 2026-05-28)

**What:** The static "Mój workspace" More-tab row is now a **switcher**: tap →
bottom-sheet picker of the workspaces the user belongs to → tap one to switch
active context. Code-free for existing members; persists + reloads.

**Why this is NOT the switcher Jacek rejected.** The earlier-rejected switcher
was the *management* mechanism (→ replaced by § 91, which manages any workspace
WITHOUT switching). § 92 is the complementary *operation* need: be inside a
workspace to actually use it (scout / coach / view its data). Both exist.

### 92.1 setActiveWorkspace — code-free member switch
`enterWorkspace(code)` derives its slug from the typed code AND verifies the
password, so it can't switch an existing member without re-typing the code.
New `useWorkspace.setActiveWorkspace(slug)` skips the code entirely — the caller
picks from `useUserWorkspaces` (their own memberships), so access is already
granted. Persists `{slug,name}` to BOTH localStorage + sessionStorage (mirrors
`enterWorkspace`), best-effort `lastAccess` bump (self-join envelope,
non-blocking), then **hard-reloads**.

### 92.2 Why reload (not in-place swap)
Data subscriptions bind to `bp()`, and `<ViewAsProvider key={workspace.slug}>`
(App.jsx) remounts the whole subtree on slug change. React runs effects
bottom-up, so the remounted children's data-subscription effects fire BEFORE
App's parent `basePath` effect calls `setBasePath` — an in-place switch would
briefly subscribe against the STALE workspace (cross-workspace data bleed). A
fresh page load guarantees the clean init order
(restore → setWorkspace → basePath → setBasePath → render → child mount).

### 92.3 Approved-only, scoped to the user
The picker lists `useUserWorkspaces()` (queries `workspaces` where
`userRoles.{uid} != null`) — strictly the user's own memberships, NEVER
all-workspaces. Further filtered to **assigned roles** (`userRoles[uid]` is a
non-empty array): pending self-joins (`[]`) are excluded (no real access yet —
they'd land on the pending-approval screen). The active workspace is always
kept. Single-workspace users keep the static row (no picker). All-workspaces
listing is the § 91 super_admin management surface, NOT this one.

### 92.4 No rules change
Reading the workspace doc on switch is auth-gated; data access inside stays
isMember/role-gated as always.

### 92.5 Scope note
`TrainingMoreTab.jsx` carries a parallel static "Mój workspace" row (training-
mode More tab) — left as-is this brief (scoped to `MoreTabContent`). Mirror
`<WorkspaceSwitcher/>` there if training-mode switching is wanted.

### 92.6 Anti-patterns
- ❌ Live in-place context swap (stale-`bp()` bleed) — reload instead.
- ❌ Listing all workspaces in the operation switcher (that's the § 91 management surface; here super_admin sees only their own memberships).
- ❌ Showing pending (unapproved) workspaces as switchable access.

### 92.7 One workspace row per More surface (2026-05-28)
The § 92 switcher was added as a new row while the legacy "name + Wyjdź" row
stayed — so the workspace showed twice (switcher's "Mój workspace"/slug + the
Leave row's name label). Jacek's call (Option 2): keep the switcher as the
single workspace-identity row; strip the duplicated workspace name from the
Leave row so it becomes a single-purpose action — `🚪` + `leave_workspace_row`
("Wyjdź z workspace") + the existing Wyjdź button (all disabled-state logic
intact). Applied to BOTH `MoreTabContent` and `TrainingMoreTab` (the latter's
static "Mój workspace" row swapped for the real `<WorkspaceSwitcher />` —
parity). The Leave row was NOT deleted (it carries the Leave action, essential
for non-admin members) — only the redundant name display was removed.

## 93. Workspace logo (approved + shipped 2026-05-28)

**What:** Optional `logoUrl` (string, external image URL) on `/workspaces/{slug}`,
displayed as a small badge. Set by a super_admin in the § 91 surface.

### 93.1 External URL, not Firebase Storage
Jacek's pick after the 2026-05-27 daily-quota exhaustion: store an external URL,
NOT an uploaded blob. Rationale — Firebase Storage isn't wired in this project
and would add a product surface + Storage rules + download quota (pushing toward
Blaze). A URL field is zero-infra and quota-free. Tradeoff: the image must be
hosted elsewhere; we don't own/resize it. (base64-on-doc was the runner-up —
quota-friendly too but bloats the workspace doc; rejected for simplicity.)

### 93.2 Component + fallback
`WorkspaceLogo` (`components/settings/WorkspaceLogo.jsx`) renders an `<img>` and
flips to a neutral fallback (🏠 by default) on missing URL OR `onError` — it
NEVER shows a broken-image glyph. `onError` reset on `url` change. Pure
presentational, reused across surfaces.

### 93.3 Placements
Shown in: the switcher trigger row (replaces the 🏠 icon), the switcher picker
rows (thumbnail per workspace), and the AppShell tournament **context bar**
(only when a logo is set). **Login screen excluded** — it runs pre-auth with no
workspace selected, so there is no per-workspace logo to show; the context bar
is tournament-scoped, so the logo there appears only while a tournament is open.

### 93.4 Set-UI + rules
Super_admin sets it in the § 91 Workspaces surface: a `logoUrl` field in the
create modal (`createWorkspace(…, logoUrl)`) + a Logo editor (live preview + URL
+ Save → `setWorkspaceLogo(slug, url)`) in the manage view. **No
`firestore.rules` change** — a workspace-doc field write is permitted by
`isAdmin(slug)` (super_admin or the workspace's own admin).

### 93.5 Anti-patterns
- ❌ Broken-image glyph — always fall back to the neutral badge on error.
- ❌ Firebase Storage upload for a small badge (quota/Blaze pressure — use a URL).
- ❌ Decorative glow/gradient on the logo, or amber on the (non-interactive) image.

## 94. Production isolation gate + invite carrier — Model B (approved 2026-05-31)

**Goal:** let competitive teams in as isolated tenants. Onboarding = **Model B (invite-only)**:
a user joins a workspace only by redeeming a valid admin-issued invite token (magic link
`#/invite/{token}`); uninvited signups sit on `NoWorkspaceScreen`. The controlled join **replaces**
the open self-join, so closing self-join + shipping the invite carrier are one coordinated piece.

**Redemption mechanism: option (a) — rules-checked client batch, stay on Spark** (no Cloud
Functions / no Blaze). One-shot anchored on the single invite doc (`redeemedBy == null` gate,
serialized); the membership grant is in the SAME `writeBatch`, so a denied invite-write rolls back
the whole batch → no double membership.

### Isolation-gate rule changes (from the 2026-05-30 isolation audit)
This push ships **#1 + #2**; **#3 is DEFERRED, not dropped**:
- **#1 — close self-join** (`firestore.rules` :257-268): removed the open self-join branch.
  Membership is now admin-granted or invite-redeemed only → closes the cross-tenant read hole
  (`isMember` was true for any self-joiner → could read another tenant's scouting).
- **#2 — gate workspace-root read** (:207): `request.auth != null` → `isMember(slug) ||
  isSuperAdmin()`. Closes the members/userRoles/pendingApprovals/passwordHash metadata leak.
- **#3 — collectionGroup `selfReports` read leak (:199-201): DEFERRED.**
  - **Rationale:** a naive drop breaks the live §70 matcher (`getTrainingSelfReports`, a
    `collectionGroup` query) + PPT crowdsource reads; a collectionGroup read rule **cannot be
    membership-scoped without a data-model change** (workspace/membership must be denormalized onto
    each `selfReport` doc so the rule can evaluate membership).
  - **Severity:** low + dormant (selfLog gated off; ~53 docs).
  - **Trigger:** must be closed **before selfReports/crowdsource goes live in multi-tenant** (before
    self-logs become a populated, cross-tenant-sensitive feature). Gates the "selfReports live"
    milestone, **NOT** the "let teams in" milestone.

### Verified posture (audit)
All workspace-scoped scouting (tournaments/matches/points/scouted/tactics/notes/trainings/teams/
layouts/selfReports) is already read-gated by `isMember` — so the deferred Stage 2/3 catalog
write-ownership cutover is **NOT** required to let teams in (orthogonal). The isolation gate =
#1 + #2 + invite carrier. Regression net: the e2e-emulator harness (loads real `firestore.rules`).

## 95. Per-team setup path — fork: super-admin manual steps (decided 2026-05-31)

**Context.** Isolation + invite join shipped (§ 94) → a team can be invited in, but lands in an
**empty workspace** (the "pbfit empty" gap). Read-only discovery (2026-05-31) mapped what a
workspace needs to be scouting-ready and diffed pbfit vs ranger1996.

**Findings.**
- **No template/clone/wizard exists** — workspaces boot completely blank; the setup path is
  greenfield, but the *pieces* it would orchestrate already exist.
- **The player/team catalog is GLOBAL** (`/teams`, `/players`, ~298/~3242), not per-workspace.
  So the "empty" gap is **tournament + schedule + layout**, NOT roster — scouted teams resolve
  against the shared catalog by `name + divisions[league]`.
- **pbfit vs ranger1996 diff:** pbfit = name + logo + password + 2 members + 1 team, and **0
  tournaments / 0 layouts / 0 config**; ranger = 4 tournaments (23–190 matches) / 5 layouts /
  579 members. `lastRedeemedInviteToken` is set on pbfit → the § 94 invite carrier is already
  exercised in prod.
- **Schedule importers exist** (CSV PBLeagues 8-col `ScheduleCSVImport`; OCR `ScheduleImport`) —
  the strongest existing piece. **Layout is optional** to scout (`resolveField` falls back to
  `tournament.fieldImage`).
- **Top friction = layouts are workspace-LOCAL** — league fields are standard across all teams
  yet cannot be shared/cloned between workspaces; each new team rebuilds them.

**Fork decided (Jacek):** **super-admin manual steps — DOC-ONLY runbook, no build.** Rejected
for now: a setup wizard, and full clone-from-template (the latter risks inheriting irrelevant
template data + the larger isolation surface). Rationale: with exactly one new team in flight
(pbfit), the manual sequence is cheap and adds zero new isolation surface. Deliverable:
`docs/ops/TEAM_ONBOARDING_RUNBOOK.md` (the 7-step manual sequence + friction ledger).

**Revisit trigger.** When the 2nd–3rd team makes the manual path expensive, build the
**"checklist + layout-clone"** option: a lightweight new-team checklist wrapping the existing
importers + a **shared/cloneable layout library** (the two real gaps — orchestration + layout
reuse; rosters and schedule are already well-served). Tracked in `NEXT_TASKS.md`.

## 96. Layout globalization — global base + workspace overlay (model decided 2026-05-31)

**Context.** Layouts are the §95 top friction — workspace-local, rebuilt per team. Decided
model (Jacek): a **global library**. BASE = bunker placement / field image / geometry, designed
once, shared by all. OVERLAY = zones / zone names / tactics, team-local, referencing a base.
This dissolves "layouts rebuilt per team" and makes setup light. Read-only discovery 2026-05-31
confirmed feasibility.

**Findings.**
- **Greenfield** — no global/clone/template mechanism exists; all layouts are
  `/workspaces/{slug}/layouts/{id}`, read `isMember` / write `isCoach` (`firestore.rules:429`).
- **The seam is CLEAN.** Schema splits without entanglement; the writes already don't cross it —
  bunker edits (`updateLayout(id,{bunkers})`, `BunkerEditorPage.jsx:119`) never touch zones; zone
  edits (`persistZones`, `dataService.js:1133`) only touch zones + the legacy mirror. Read-merge
  is already abstracted (`resolveZones`, `layoutZones.js:87`).
  - **BASE:** `bunkers[]`, `fieldImage`, `fieldCalibration`, `discoLine`, `zeekerLine`,
    `mirrorMode`, `doritoSide`, `name`, `league`, `year`.
  - **OVERLAY:** `zones[]` + legacy `dangerZone`/`sajgonZone`/`bigMoveZone` + **`tactics`
    subcollection** + `insights`. ⚠️ tactics are team plays (19 across ranger) — they travel with
    the OVERLAY, NOT the global base.
- **Preview = STORED** `fieldImage` (~60–120 KB base64 dataURL), not derived. Global base shares
  it as-is and **de-duplicates** the heavy image instead of copying per team. It's a BASE field.
- **Migration is trivial + coupling is shallow.** Only **5 layouts total** (all ranger1996;
  pbfit 0). `layoutId` is referenced **only by tournaments** (4) — NOT denormalized onto
  matches/points (they resolve the field through the tournament via `resolveField`). ∴ keep the
  global base id == the current layout id and `tournament.layoutId` stays valid with **zero
  scouting-data rewrite**. Drift to handle: "NXL Tampa" lacks `mirrorMode`/`doritoSide`; only 1
  of 5 has unified `zones[]` populated (other 4 carry legacy single-zone) → migration carries
  both `zones[]` and the legacy fields into the overlay.
- **Consumers that change = read-merge + bunker-write target only.** `useLayouts`/
  `subscribeLayouts` merges global base ∪ workspace overlay by id → all 8 downstream consumers
  unchanged. The only behavioral change: bunker edits now target the governance-gated global base.

**Governance fork decided (Jacek): super_admin-curated.** Global `/layouts/{id}` = **read
authed, write `isSuperAdmin()`**. Coaches consume (browse → add overlay), they do not publish
or edit the shared base. Rationale: smallest blast radius, matches "designed once," tiny library
(5 bases) → no provenance/versioning machinery needed. Rejected: any-coach-publish federation
(would need `ownerWorkspaceId`/`createdBy` + base immutability/versioning because a cross-tenant
read means an owner's edit silently mutates everyone's field); and copy-on-edit hybrid (drift).
If coach self-service is ever wanted, revisit with versioning then.

**Minimal build shape (for the build brief).**
1. Global base `/layouts/{id}` (BASE fields) — read authed, write `isSuperAdmin()`.
2. Workspace overlay `/workspaces/{slug}/layoutOverlays/{id}` (`zones[]` + legacy + `tactics`/
   `insights` subcollections + `baseLayoutId == id`) — read `isMember`, write `isCoach`.
3. `useLayouts` merges base ∪ overlay by id → consumers untouched.
4. Migrate ranger's 5 docs, **ids preserved** (no `tournament.layoutId` rewrite); base→global,
   overlay+tactics→workspace.
5. "Browse library → add to my workspace" = create an empty overlay referencing a base → a new
   team gets all standard fields instantly (the §95 #3 dissolve).

**Status:** ✅ **SHIPPED 2026-05-31** (staged build, branch `feat/layout-globalization`). Rules deployed (global `/layouts` read-authed/write-super + workspace `/layoutOverlays` isMember/isCoach); migration `--live` (5 bases + 5 overlays, 19 tactics, 4/4 tournaments resolve, 0 dangling, legacy preserved for rollback); `useLayouts` merges base ∪ overlay; LayoutsPage library browse + super_admin-gated base authoring; STAGE 4 e2e (2 governance specs) green. See DEPLOY_LOG 2026-05-31. **Cleanup follow-up:** drop the legacy workspace `/layouts` collection + rules block once prod-confirmed.

## 97. Layout-config redesign — unify onto the admin section-stacked-detail pattern (decided 2026-05-31)

> **↑ Superseded for the layout-config surface by §98 (2026-05-31).** The canvas-first
> mode-switcher in §98 replaces the section-stacked route for layout-config; section-stacked
> still governs the rest of admin (users, workspaces).

**Context.** The features inventory + nav discovery (see `docs/MOCKUP_GUIDELINES.md`) found
layout-config fragments across a ⋮ ActionSheet of PUSH routes + a stack of Modals + inline
handles, and surfaces base-geometry controls to coaches that silently no-op (§96 STAGE 1 gated
writes, not controls). Decision direction:

- **Unify the layout-config UI onto the admin section-stacked-detail pattern** (à la
  `UserDetailPage`): `PageHeader` + stacked `Section`s + `Row`s on one detail screen; inline
  edit (chips/inputs/sliders) + `Modal`/`ConfirmModal` for discrete actions. **Retire the
  multi-entry fragmentation** (per-option PUSH routes + scattered modals + inline handles).
- **Names · Zones · Lines = sibling `Section`s** on that screen (not separate routes/menus).
- **Lines = a 0..N overlay collection** (not the fixed disco/zeeker pair): each line carries
  `name + color` (color from `COLORS_ZONE_PALETTE`, amber excluded) and a `trackSide`
  (above/below) that drives comms; **hatch is config-only** (visual aid, not comms). This
  generalizes today's two hardcoded lines.
- **Super Admin keeps the base** authoring path (`BunkerEditorPage` — bunker geometry,
  calibration, image). **Coach is view-only** on base geometry (read-only "managed by admin"
  card, no inert controls).
- **Drop / hide:** ballistics **hidden** (built+wired but usage-unknown — keep code, hide
  entry until usage justifies); **firing-zones dropped** (phantom feature — it's match
  `quickShots`, not layout config); **tactics stores to consolidate** (layout-overlay primary;
  retire the parallel `/tournaments/{tid}/tactics`). Plus the cleanups: deaths-heatmap §61
  iPhone coord-frame smoke (G), delete-modal dead password field (H).

**Status:** direction decided; **mockup → staged build brief** next (no code yet). Tracked in
`NEXT_TASKS.md`. Token/role/nav rules for the mockups live in `docs/MOCKUP_GUIDELINES.md`.

---

## 98. Layout-config redesign + bunker role split (approved 2026-05-31)

> **✅ SHIPPED 2026-06-01 (Stages 0-7).** Staged build complete — canvas-first
> mode-switcher Nazwy/Strefy/Linie; division lines + callout lines on the workspace
> overlay; per-team bunker names; coach view-only; ballistics hidden. Commits S2
> `1240e0d0` · S3 `0e144730` · S4a `9bda7f4d` · S4b `6bb60462` · S5 `3e687c1a` ·
> S6 `a6ad88af` · S7 `5de79196`. Visual spec in `docs/MOCKUP_GUIDELINES.md` §4.1.
> Owed: Jacek prod smoke (incl. flag G §61 iPhone deaths-heatmap coord). Open
> follow-ups: callout lines render config-only (surface on live layout if wanted);
> tactics two-store consolidation (own brief); drop legacy zone dual-write + base
> disco/zeeker once prod-confirmed.

> **Supersedes §97 for the layout-config surface only.** §97 proposed a section-stacked
> detail route for layout-config; this decision replaces it with a canvas-first
> mode-switcher. This **supersedes section-stacked** *only* for layout-config —
> section-stacked still governs the rest of admin (users, workspaces).

**Surface.** Canvas-first **mode-switcher** (à la iOS Photos) — the layout stays visible at
all times; a bottom bar switches between three per-team admin layers: **Names / Zones /
Lines**. Sits on `BaseCanvas` + `touchHandler` (§64 / `docs/architecture/CANVAS_ARCHITECTURE.md`)
— **no new gesture/transform layer**. Retires `drawToolbar.js` and the `FieldEditor`
toggle-toolbar.

**Bunker role split.**
- **super_admin places bunkers** (positions + type) on the layout. Required because importing
  a field image is only pixels — the app does not auto-detect bunkers.
- **Bunker names / callouts = per-team local admin** — every team names bunkers differently.
  Names are a **per-team overlay keyed by bunker id**; **positions are read-only** for the
  team admin.

**Per-team layers.**
- **Zones** — §88 polygon zones + callout.
- **Lines** — NEW, 0..N collection: `name` + `color` + `trackSide` (`'above'` / `'below'`);
  a hatch shows the tracked side **in config only**.
- **Names** — callouts placed on the super_admin's bunkers.
- **Coach:** read-only render — no mode-bar, no editor.

**Palette.** `COLORS.zonePalette` (amber reserved) for both zones and lines.

**Status:** approved; **mockup → staged build brief** next (no code yet). Canvas internals per
§64; base-vs-overlay layer model per §96; zone shape per §88.


## 99. Stage-replay animation on the heatmap (shipped 2026-06-03)

> **✅ SHIPPED 2026-06-03** — Point-as-Timeline Stage 6-lite. Merge `89acccd7`
> (6L-0 `db8ed092` · 6L-1+6L-2 `3a260ad3` · 6L-3 `c13830cf`). Brief archived
> `docs/archive/cc-briefs/CC_BRIEF_STAGE6_LITE_REPLAY.md`. Full scrubber /
> play-pause / speed = remaining Stage 6 (not this).

**What.** A toggleable, looping preview of player movement across the captured
stage keyframes — **Break (keyframe #0) → Settle → Mid (`point.timeline[]`)** —
on both heatmap surfaces (coach `ScoutedTeamPage`, match-summary `MatchPage`
review). OFF by default, on-demand.

**Pattern decisions.**
- **One component, one prop.** The replay layer lives in the shared
  `HeatmapCanvas` (`replay` prop); both surfaces consume the same component. No
  new canvas/animation component — option A from discovery (no render refactor).
- **Markers-only while playing.** During play the aggregate Positions / Shots /
  Bump / Zone layers are skipped (only ~markers/frame) — keeps mobile RAF cheap
  and matches "shots/zones hidden during play." OFF schedules **no RAF** (zero
  idle cost) — a paused canvas is byte-identical to the static one.
- **Slot-aligned tween.** Positions interpolate per `slotId` across keyframes
  (kf#0 shares slotIds with stage keyframes). Forward-fill: a slot absent in a
  later keyframe **stays put**; a slot appearing mid-timeline **fades in**.
- **Progressive elimination (§ 27 functional fade).** Everyone is alive at
  Break; per-keyframe `eliminations[]` freeze a slot at that stage's position +
  fade to 0.4α; kf#0 end-state elim lands on the final frame. The fade is
  **functional state communication**, not decoration (§ 27 anti-pattern carve-out).
- **Toggle idiom per surface.** Coach: a "▶ Replay" pill in the existing Layers
  pill row (amber **only** while active per § 27 color discipline); while playing
  the Mode bar + Positions/Shots/Plan/Notatki pills go **inert** (opacity 0.4 +
  pointer-events none) and `hmPhase` is ignored, but **Isolate stays live** (replay
  one player). No layer/phase state is mutated → prior selection **restores on OFF**.
  Match-summary: a single **global** "▶ Replay" pill above the per-team capsule
  row (replay is global, not per-team). Both disabled until ≥1 Settle/Mid keyframe
  exists (`canReplay`).
- **Shared data sub-task (6L-0).** Carrying `timeline[]` through the two heatmap
  mappers (`mapOnePointForTeam`, `getHeatmapPoints`) is the **same** data-access
  work Stage 2.5 needs — sized and shipped once here.

**Related:** § 27 (color discipline, functional-only fade), § 64 canvas ladder,
§ OSTRZAŁ `hmPhase` mode-group, Point-as-Timeline charter `docs/POINT_AS_TIMELINE.md`.

## 100. Per-workspace bunker names — name-keyed display override (shipped 2026-06-03)

> **✅ SHIPPED 2026-06-03** — b1 + b2, merge `1d4da04a`. Folds into §96 (layout
> globalization: global base + workspace overlay) and §98 (layout-config redesign).
> Brief: per-workspace bunker names everywhere (name-keyed display override).

**Decision.** Per-workspace bunker names appear **everywhere incl. PPT + self-log**,
via a **display-only override keyed by base `positionName`** (name→name). Canonical
identity stays the base `positionName`. Re-key / id-identity is **shelved** as a
future option (only buys base-rename / true-duplicate robustness; costs a
historical + cross-tenant data migration we deliberately avoid).

**Model.**
- Global base (`/layouts`, super-admin): canonical geometry + DEFAULT names.
- Workspace overlay (`layoutOverlays`, `isAdmin`-gated, rules-isolated):
  `bunkerNameOverrides: { [basePositionName]: workspaceName }` (name-keyed;
  supersedes the legacy id-keyed `bunkerNames`, migrated on read).
- Resolution **at display only**: the `useLayouts` merge attaches an additive
  `displayName = bunkerNameOverrides[positionName] ?? positionName` per bunker and
  exposes the override map for string-only consumers (self-log `targetBunker`, PPT
  stored breakout).

**INVARIANT (load-bearing).** `positionName` is NEVER overwritten and base never
receives workspace names. ALL matchers / writers / persisted docs
(`breakout`/`targetBunker`) / `breakoutVariants` keys / dedupe keep using canonical
`positionName`. `LayoutDetailPage` strips the merge-attached `displayName` before
the super-admin geometry save (`updateBaseLayout({bunkers})`) so no workspace name
leaks into the shared base.

**Bonus.** Name-keying fixes the master/mirror rename gap — a master and its mirror
share one `positionName`, so a single override covers the pair (the prior id-keyed
override only moved the tapped bunker's label).

**UPDATE — re-key off `positionName` → stable identity (2026-06-05, `bunkerNames.js`).**
Name-keying had a latent bug: when **two distinct obstacles share a `positionName`**
(e.g. "NXL EUROPE #2 - UK" carries two "Dykta" obstacles, [0]@y=0.270 + [21]@y=0.356,
each with a mirror), `bunkerNameOverrides[positionName]` collided → **renaming one
rewrote both** (Jacek-reported). The "shelved re-key" is now shipped (decision (A),
Jacek 2026-06-05).
- **Stable key = `b.masterId || b.id`** (`utils/bunkerNames.js`). A mirror carries
  `masterId` = its master's id → master+mirror collapse to ONE key (pair-rename
  **preserved**); two distinct same-named obstacles get **independent** keys (bug fixed).
  Mirrors are linked by the explicit `masterId` field — **NOT an id suffix** (two
  variants exist in prod: `_mirror` from `computeMirrors`, `_m` from
  `BunkerEditorPage`; masters carry random suffixes — so suffix rules are unreliable).
- `bunkerNameOverrides` is now **stableKey-keyed**. `normalizeBunkerNames(bunkers,
  overlay)` lazily reconciles BOTH legacy maps (id-keyed `bunkerNames` + positionName-keyed
  `bunkerNameOverrides`) into the stableKey form, **preserving currently-displayed
  names**, dropping stale keys; `LayoutDetailPage` persists it on next overlay write
  (lazy migration — **no global `/layouts` write**). Display now resolves
  `displayName = override[stableKey(b)] ?? positionName`.
- **Side benefit:** a blank `positionName` no longer collides on `override['']` — id-keying
  makes each unnamed bunker independently nameable (fixes "NXL Tampa" latent issue).
- **Scope/decision (A):** overlay layer only. The 4 legacy layouts (Prague/PLX/Tampa/sample)
  predate `masterId` (0 mirror metadata) → keyed per-bunker-id; their names are preserved
  but mirror pair-rename won't propagate there (accepted — frozen, not current; their
  repeated names are all geometric reflection pairs, no genuine duplicates). Current +
  future layouts (UK, Midwest Open, …) are authored via editor/VisionScan, which stamp
  `masterId` → fully correct. **(B) masterId backfill + (C) runtime geometric pairing are
  OUT.** Verified against real UK data: collision fixed, pair-rename preserved, current
  render unchanged, stale "Skar 1" dropped, idempotent.

**Editor guard (b1).** `BunkerEditorPage` is the GLOBAL base editor (super-admin
only; relabeled + caution). Workspace admins rename per-team via the layout page's
"Names" config mode (overlay). This removes the confound where a super-admin edited
global thinking it was per-team.

**Related:** §96 (global base + overlay), §98 (layout-config redesign), §27 (English
labels, no decorative color). Re-key path (id identity + persisted name→id migration)
documented in the 2026-06-03 re-key discovery if ever revived.

## 101. Shot-model unification onto the Break/Settle/Mid time axis (Stage 1 shipped 2026-06-03)

> **Decision (Jacek).** The break/obstacle (on-break / at-obstacle) shot-phase
> distinction is a redundant proto-timeline now that the real time axis exists.
> **Unify on Break/Settle/Mid; `obstacle ≡ Settle`; precision unchanged.** Staged:
> Stage 1 (scout capture + reader forward-compat) · Stage 2 (coach 3-way axis,
> the old "2.5") · Stage 3 (legacy cleanup). Folds into the Point-as-Timeline arc.

**Locked.**
- **Migration = forward-compat read (no `--live`).** Legacy `kf#0.obstacleShots` /
  `zoneObstacleShots` are never written anew, but stay readable for old points.
- **Field naming = stage-native.** Each keyframe's shots live in its own
  `quickShots` / `zoneShots` ("shots at this stage"). `obstacle*` is legacy-read-only.
- **Granularity is orthogonal to stage.** Direction (dorito/center/snake), zone
  (callout polygons), and precision (exact `{x,y}` via `ShotDrawer` → `shots`) are
  HOW precisely a shot is logged; stage is WHEN. Precision unchanged.
- **Coach aggregate "state" = elimination positions per stage** (Stage 2).

**Stage 1 (this ship).**
- **Capture:** removed the QuickShotPanel break/obstacle (`shotPhase`) segmented
  toggle. Direction/zone capture routes to the **active stage's** keyframe via the
  existing `captureStage`/draft indirection — Break → `kf#0.{quickShots,zoneShots}`,
  Settle → `timeline.settle.{quickShots,zoneShots}`, Mid → `timeline.mid.*`. The
  stage (StageSwitcher) is the context; scouts log post-break shots by advancing to
  the **Settle** stage. Precision (`ShotDrawer` → `draft.shots`) untouched.
- **Reader forward-compat:** the coach post-break source resolves as
  `timeline.settle.{quickShots,zoneShots}` (when a settle keyframe exists) `??`
  `kf#0.{obstacleShots,zoneObstacleShots}`. Injected at the coach mapper
  (`mapOnePointForTeam` → feeds `computeCalloutZoneTargets` / `calloutZoneWeights` /
  HeatmapCanvas luf) and in `playerStats` (raw teamData). The 2-way coach MODE
  (Breakout/Post-breakout) stays for now — it just reads the compat source; it's
  replaced by the 3-way axis in Stage 2.

**Invariants.** Shots only — bunker identity (`positionName`, `breakoutVariants`,
self-log matching) untouched. Break-only points byte-identical. Positions per-stage
(post-break `phasePos`), `TacticPage` phase routing, `drawQuickShots` live render,
i18n `callout_*` labels, `PlayerStatsPage` card labels = Stage 2/3 follow-ups.

**Related:** §96/§98 (overlay), §100 (bunker names), Point-as-Timeline charter.

## 102. Coach 3-way axis — Break/Settle/Mid (shipped 2026-06-03)

> **✅ SHIPPED 2026-06-03** — Shot-model unification Stage 2, merge `5aa49c1e`.
> Retires the 2-way Breakout/Post-breakout coach MODE in favour of the
> Break/Settle/Mid time axis. Folds into §101 (shot-model unification) +
> Point-as-Timeline.

**Decision.** The coach heatmap MODE is the **Break / Settle / Mid** time axis
(same axis as scout capture + the Replay pill), replacing Breakout/Post-breakout.
Each stage drives positions, the zone choropleth, the luf connectors, and the
per-stage callout text tables.

**Per-stage sources.**
- **Break** = keyframe #0 (`players`/`bumpStops`, `zoneShots`, `eliminations`).
- **Settle** = `timeline.settle` ?? **kf#0 obstacle compat** (Stage-1: so OLD
  points — which only have kf#0 obstacle data — still populate Settle).
- **Mid** = `timeline.mid` (gated: the Mid segment greys when no point captured it;
  Break + Settle are always available).

**Mechanism.**
- `computeCalloutZoneTargets` returns `{break, settle, mid}` (a transitional
  `obstacle` alias = settle is retained, unused).
- `HeatmapCanvas` `phase` accepts `break|settle|mid` (back-compat
  `breakout→break`, `postBreakout→settle`); a `stageView` resolves each point's
  per-stage positions/elim/runners/assignments/zone-tags from kf#0 or the timeline
  keyframe.
- The coach mapper carries per-keyframe `zoneShots`/`quickShots` +
  `eliminationPositions` so the aggregate has per-stage zones + elim positions.

**Scoping (deliberate).** Settle/Mid show **positions + zone choropleth + luf +
per-stage callout tables**. **Precision-shot cones + bump density are Break-only**
(kf#0-captured; not carried per stage). `showBreakLayers` (`phase` not in
`settle`/`mid`) keeps those layers for legacy consumers (match-review/training
default `postBreakout`) so they're not stripped there.

**Style.** Extended the existing **surface-fill segmented bar** to 3 segments
(coach review idiom — pick any stage); did NOT lift the scout "E"/amber. Active =
surface-fill; Mid disabled via opacity; segments ≥44px.

**Compose with Replay (§ Stage 6-lite).** `inertWhileReplaying` precedence holds —
selecting a stage sets the static frame; Replay overrides (markers-only). The 3
static stages now align 1:1 with the replay sequence.

**Related:** §101 (shot-model unification), §100, §96/§98, Point-as-Timeline charter.
Next: Stage 3 cleanup (`obstacle*` write paths, i18n `callout_*`, TacticPage phase,
PlayerStatsPage break/obstacle card labels).

## 103. Shot-model unification — Stage 3 cleanup + track closed (2026-06-03)

> **✅ SHIPPED 2026-06-03** — merge `0c3a70b5`. Final stage of the shot-model
> unification (§101 capture, §102 coach axis). Closes the track.

**Done (confirm-before-remove).** Retired the `obstacle*` *concept* from point/coach
surfaces: removed the unused `callout_break_label`/`callout_postbreak_label` i18n
keys (Stage 2 uses literals) and relabeled the PlayerStatsPage post-break card to
**Settle**.

**Deliberately KEPT (forward-compat).** The `obstacle*` fields on the point doc and
their round-trip code (`emptyTeam` / `makeTeamData` serialize / `tdToDraft` load /
canvas render) are **preservation**, not dead writes — the Stage-1 forward-compat
READ resolves OLD points' Settle data from `kf#0.obstacle*`. Removing them would
drop old points' Settle data on edit. So the *write of new* obstacle data is gone
(Stage 1), but the *fields + read* persist indefinitely as the old-data bridge.

**Scoped OUT.** `TacticPage` keeps its own break/obstacle authoring model + store
(no timeline); `reason_obstacle` is a death-reason label (unrelated feature). Both
untouched. Whether tactics ever adopt Break/Settle/Mid = a separate future feature.

**Track status: CLOSED.** §101 Stage 1 (scout capture + forward-compat) · §102
Stage 2 (coach 3-way axis) · §103 Stage 3 (cleanup). The break/obstacle phase is
retired from scout + coach; Break/Settle/Mid is the single axis.

## 104. Search/filter kit — shared components (Stage A, 2026-06-03)

> **Stage A shipped** — foundation of the search/filter unification (8bc0135f
> three-agent map). Stages B–D migrate lists → pickers → admin onto this kit.

**The kit (`theme.js` tokens only, device-agnostic; REUSE `ui.jsx` Input/Select/Modal):**
- `utils/entityFilters.js` — **`matchEntity(query, item, fields)`** (the single text
  matcher, replaces the ~7× copy-pasted `(name||'').toLowerCase().includes`) +
  **derived division/league resolvers** (`playerInDivision`/`playerInLeague` via
  team membership; `teamInDivision`/`teamInLeague`).
- `ui.jsx` **`SegmentedControl`** — the inline surface-fill PILL bar (single-select;
  consumer owns state + toggle/side-effects). Extracted from QuickShotPanel +
  the ScoutedTeamPage stage bar.
- `SearchField` (Input + clear), `FilterBar` (Select pills), **`SearchFilterPanel`**
  (composes them; canonical order **search → Liga → Dywizja → extras**),
  `EntityPickerModal` (SearchFilterPanel + exclude-already-added + single/multi
  select), `useSearchFilter` (filter→sort→paginate, pure).

**Locked rules (Jacek).**
- Filter order everywhere: **search → Liga → Dywizja → surface extras**.
- Dimensions: universal **Liga + Dywizja**; player-list extras **Team/Klasa/Rola**;
  admin-only **linked/active/retired**.
- **Division-for-players is DERIVED** (player → team(s) → `team.divisions[league]`);
  multi-team = a player matches a division/league if **ANY** of their teams is in it.
- **URL-back filter state on LIST screens; pickers keep it local/transient.**
- Pickers reuse the SAME `SearchFilterPanel` (via `EntityPickerModal`).

**Scope note.** Only the inline PILL segmented idiom is unified by `SegmentedControl`.
The `LayoutDetailPage` §98 **bottom icon tab-bar** (icon+label, accent-color active,
toggle-to-null + side-effects) and the `PerTeamHeatmapToggle` **per-team capsule
multi-toggle** are DISTINCT idioms — deliberately NOT forced into this primitive
(own components later if wanted).

**Separate thread (NOT this work).** Super-admin vs workspace-admin panel
consistency consumes this kit later; section-stacked §97 stays canonical for
data-admin. Logged in NEXT_TASKS.

**Migration:** Stage A (kit + SegmentedControl proof + doc) → B (PlayersPage +
TeamsPage) → C (add-to-event pickers, priority) → D (admin lists + modal-selects +
division-group lists). Each its own GO.

### 104.1 Stage B + C shipped (2026-06-03)

- **Stage B (`3c1fd20e`)** — PlayersPage + TeamsPage on `SearchFilterPanel`,
  **URL-backed** (`q/liga/dyw/team/class/role`), derived Liga/Dywizja, teams
  hierarchy + collapse preserved.
- **Stage C (`e4f739e3`)** — add-to-event pickers. Tournament add-team gains
  search + Dywizja; scouted add-player gains derived Dywizja;
  AttendeesEditor + InviteGuestModal matchers unified onto `matchEntity`
  (no Dywizja — single-team roster / cross-league no-context); matchups =
  squad-selects (N/A).
  - **Mechanism deviation (logged, accepted):** Stage C **injected**
    `SearchFilterPanel` + `entityFilters` matchers into the *existing* pickers
    rather than rebuilding them on `EntityPickerModal`. Rationale: the add-team
    picker carries bespoke batch multi-select / error count / parent-child
    grouping / division-auto note that `EntityPickerModal` doesn't model;
    inject = lower risk + same shared kit. EntityPickerModal remains the vehicle
    for the **Stage D** modal-selects where there's no bespoke logic to preserve.

### 104.2 Admin-consistency fork — direction (2026-06-03)

The "separate thread" above now has a direction and a **sequencing gate**:
- **Stage D's admin-list migration is GATED** on the super-admin ↔ workspace-admin
  parity decision — migrating `AdminPlayersPage`/`AdminTeamsPage` onto the kit
  *before* deciding the roster data-path would migrate them twice. Stages A–C are
  unaffected; non-admin parts of Stage D are unblocked.
- **The genuine [ESCALATE]:** what "a team's roster" means **cross-workspace** —
  global/canonical players-on-the-team vs per-workspace rosters. The workspace
  roster is players filtered by team membership (`playerOnTeam`, the
  `teams[]`/`teamId` dimension); the super-admin team surface is list-centric
  (no detail/roster panel). Whether super-admin reuses the workspace roster path
  straight or needs a new cross-workspace path depends on this data-path check.
- Discovery findings recorded in the session report + NEXT_TASKS; the data-path
  CONFIRM is owed to Jacek before any Stage D admin code.

### 104.3 Stage D remainder — kit migration COMPLETE (2026-06-04)
Closes the search/filter kit migration (A–D). The "~7× duplicated `toLowerCase()
.includes` matcher" finding from the original discovery is fully retired.

- **Modal-selects → `EntityPickerModal`:** `admin/TeamPickerModal` (descendant/
  retired/mode exclusions ported to `excludeIds`+`predicate`; exclusion caption via
  a new optional `note` prop on the kit) and `ViewAsPlayerPicker` (linked-first order
  preserved by pre-sorting `items`; custom row via `renderItem`).
- **No double-migration (verified, skipped):** `TeamDetailPage` add-player was
  already on `EntityPickerModal` (parity Stage 1); `ScoutedTeamPage` roster-add was
  already on the kit inline (`SearchFilterPanel`+`matchEntity`+Dywizja, Stage C) — its
  copy-paste matcher already gone, so the inline→modal conversion was skipped (no UX
  churn, acceptance already met).
- **Not a fit (skipped, by design):** `LinkProfileModal` uses the **PBLI cascade
  matcher** (`matchPlayers`) + a "Czy to ja?" confirm gate, not the copy-paste idiom;
  migrating would regress the cascade.
- **Division-group lists gain search (grouping kept):** `CoachTabContent` — search
  filters the active-division **teams** list by name/extId; `ScoutTabContent` — its
  `divisionScouted` is modal-only, so search filters the **matches** list by either
  side's team name. Both keep the division pills + (Scout) stage grouping; search
  filters *within* the grouped view, never flattens it.
- **Kit addition:** `EntityPickerModal` gained an optional `note` prop (caption under
  the panel) — additive, backward-compatible.

## 105. Global-first CRUD — write-side migration complete (2026-06-03)

Prerequisite for the admin-parity work (shared detail views reused cross-workspace
by super-admin). Completes the global-first migration the catalog split started.

**The three laggard writes are converted.** `updatePlayer`, `changePlayerTeam`,
`updateTeam` (and `addPlayer`'s create-new path) previously wrote the
**workspace twin FIRST** via `updateDoc(doc(db, bp(), …))`. That threw two ways
cross-workspace: `bp()` throws with no active workspace, and `updateDoc` throws
on a **missing twin** — which is exactly the super-admin case (a player/team's
twin doesn't exist in the admin's active workspace). This was the blocker found
in the admin-parity Stage 1 verify.

**New pattern (mirrors `retireTeam`/`unretireTeam`, already global-first):**
1. **Global-first** canonical write — `setDoc(doc(db, 'players'|'teams', id), patch, {merge:true})`. No workspace dependency; never throws on a missing doc.
2. **Conditional twin mirror** — a shared `mirrorTwin(coll, id, patch)` helper writes `/workspaces/{activeSlug}/{coll}/{id}` via `setDoc(merge)` **only when an active workspace is set** (`activeWsSlug()`, non-throwing). Skipped when none → no throw, no wrong-workspace write on the create path (the create-new ID is now minted from the **global** collection, not `bp()`).

**`addPlayer` create-new** now mints the doc ID from `/players` (global) and mirrors
the twin only when a workspace is active; the **reuse path was already** global-only
`setDoc(merge)` (unchanged). `setPlayerHero` routes through `updatePlayer` (fixed
transitively).

**Scope boundary.** Only the **global-catalog** dual-writes (players/teams) were
converted. Genuinely **workspace-scoped** writes — tournaments / scouted / matches /
points / layouts / tactics / trainings / matchups / selfReports / breakoutVariants —
keep `updateDoc(bp())`: they have **no global twin** and belong to one workspace by
design.

**Conversion-trap audit (§ setDoc-merge dot-notation).** Every converted write was
checked: patches are flat field maps or full nested literals (`withTeamAdded` →
`{teams, teamId}`; `updateTeam` `divisions` → full nested map). **Zero dot-notation
keys** — and since each already ran through `setDoc(merge)` as its *second* write
pre-refactor, any dotted caller would already have been broken globally. Safe.

**Behavior parity.** With an active workspace (every normal app flow) the end state
is identical — global + twin both written; twin via `setDoc(merge)` is a superset of
the old `updateDoc` (self-heals a missing twin instead of throwing). Cross-workspace
(super-admin) the canonical global write now succeeds; the twin is best-effort. The
twin **read** path was retired 2026-05-27 (zero React consumers), so nothing depends
on twin freshness. **The write side of the catalog migration is now complete.**

> **Phase 2.x.d note (stray twin, accepted).** Under super-admin a *cross-workspace*
> edit mirrors the twin into the **editor's** active workspace, not the doc's owner
> workspace — a harmless stray twin (read-retired). No `ownerWorkspaceId` guard is
> added: it's effort on the exact write path Phase 2.x.d deletes. When Phase 2.x.d
> removes twin writes entirely, these strays disappear — nothing further to do.

## 106. Super-admin ↔ admin parity — reuse the detail view, permission-gate (2026-06-04)

**Principle (Jacek-locked).** Super-admin and workspace-admin share the **SAME
detail views** for an entity — **different permissions only**, never a rebuilt
parallel super-admin panel. The mechanism is *reuse the workspace detail view from
the super-admin surface*, not a second implementation (rebuilding is the divergence
we're removing). Built on the global-first CRUD (§105) + global/canonical roster
(§104.2): a team's roster is the same set in every workspace, so the reused view is
correct cross-workspace.

**Permission model.** The list surface (`/admin/teams`) is `AdminGuard`-gated; the
shared detail view (`/team/:teamId`) is reachable by workspace members too. The real
permission gate is **server-side Firestore rules** (super-admin email → global
write; workspace member → their workspace). The client no longer throws
cross-workspace (§105), so no per-affordance client gating is needed for Teams —
rules enforce who may actually write.

### 106.1 Teams parity — SHIPPED 2026-06-04 (Stage 1)
- **Entry-wiring:** `AdminTeamsPage` card **body-tap → `/team/:teamId?from=admin`**
  (the shared `TeamDetailPage` — roster + leagues/divisions). The ⋮ `MoreBtn` keeps
  the admin metadata form (parent/extId/retire) + duplicate-resolve. No second panel.
- **Back-routing:** `TeamDetailPage` reads `?from=admin` → Back + post-retire nav
  return to `/admin/teams` (HIG "back matches destination"); workspace entry keeps
  `/teams`.
- **Bonus picker → kit:** `TeamDetailPage`'s add-existing-player picker migrated from
  the bespoke `toLowerCase().includes` list to **`EntityPickerModal`** (search → Liga
  → Dywizja, derived via team membership), `excludeIds` = current roster. Used in
  **multi** mode so assigning a player drops them from the list (excluded) and the
  picker stays open for adding several in a row.

### 106.2 Stage 3 — per-entity verify COMPLETE (2026-06-04) — thread closed
Read-only discovery (3 parallel agents) confirmed the other three entities need **no
detail-view reuse work.** Verdicts (Jacek-confirmed):

- **Players — legitimate divergence, NO work.** Super-admin row → `PlayerFormModal`
  (global identity + **admin-only** fields `pbliIdFull`/`hero`/`photoURL`/`comment`,
  not team-aware); workspace edits → `PlayerEditModal` (profile + `teams[]`, no
  admin-only fields); `PlayerStatsPage` (`/player/:id/stats`) is read-only stats.
  Unlike Teams, there is **no missing view** — both lists are on the kit (§106.3) and
  the two edit modals carry genuinely different field sets (admin-only flags don't
  belong in the workspace modal). This is a **defensible entity difference, not an
  inconsistency.** The optional symmetry (admin player row → stats page like Teams →
  roster) was **SKIPPED** (Jacek): admin wants to *edit*, not view stats; low value.
- **Leagues — N/A, already canonical.** `/admin/leagues` is `SuperAdminGuard`-only;
  **no** workspace-admin leagues UI — workspace consumes leagues read-only via
  `useLeagues()`. Single `AdminLeaguesPage`/`LeagueFormModal`, global `/leagues`.
  Search-kit not applicable (<10 leagues; Active/All toggle is right). No gap.
- **Layouts — correct-by-design divergence, confirmed.** Global base
  (`AdminLayoutsPage` + `BunkerEditorPage`, `updateBaseLayout`, super-admin geometry)
  + workspace overlay (`LayoutDetailPage`, `updateLayoutOverlay` — zones/lines/per-team
  names). Bunker-name workspace isolation shipped (§100); the invariant
  "`positionName` stays canonical, workspace names never leak to base" is enforced
  (`LayoutDetailPage:154`). Layouts parity is **NOT** detail-view reuse — and works as
  designed. No gap, nothing to escalate.

**Not forcing uniformity.** Where an entity's data/permission model legitimately
differs (Players two-modal, Layouts overlay), parity = "same where it makes sense,"
not identical UI.

**Admin-parity thread CLOSED.** Stage 1 (Teams `6bbeb918`) closed the one real gap;
Stage 2 (admin lists `32f6b717`) unified the lists; Stage 3 (this verify) confirms the
rest is correct/divergent-by-design. Remaining search/filter **Stage D** bits (tripled
modal-selects → `EntityPickerModal` + division-group lists gain search) live on the
search/filter track, not here.

### 106.3 Admin lists onto the kit — SHIPPED 2026-06-04 (Stage 2 · = search/filter Stage D admin half)
`AdminTeamsPage` + `AdminPlayersPage` lists migrated onto the shared kit:
- **`SearchFilterPanel`** for search + **Liga → Dywizja** (NEW — admin couldn't
  filter by league/division before; derived via `entityFilters`
  `teamInLeague`/`teamInDivision` and `playerInLeague`/`playerInDivision`).
- **`useSearchFilter`** pipeline (search via `matchEntity` → predicate → sort →
  paginate) replaces the hand-rolled `filtered` useMemo + the copy-paste
  `toLowerCase().includes` matcher. The rich **admin-only filters keep their bespoke
  pill UX** (teams: active/parents/children/extId/duplicates/retired; players:
  linked/unlinked/hero) — folded into the `predicate`, NOT converted to Selects
  (pills carry counts + danger styling the Select idiom can't). **Sort + pagination +
  URL-back state preserved verbatim.**
- Intentional minor widening: team search now also matches `externalId` (Stage-B
  parity); player search now also matches `number`. Same results otherwise.
- Liga/Dywizja for players resolve via **active** teams (`useActiveTeams`,
  consistent with the Stage-B user PlayersPage) — a membership on a retired team
  won't resolve a league. Accepted.

## 107. Team branding — color foundation + URL-paste logos (2026-06-04)

Team identity = **`color`** (hex on the doc) + **`logoUrl`** (asset-layer URL *ref*,
Phase 2) + monogram fallback. 🔴 **HARD RULE:** the logo is a URL ref on the doc,
**never base64 bytes** — embedding would bloat the §90-cached catalog (~2.3 MB / 153
docs) and turn a one-time asset cost into a recurring read cost. `color` is fine; bytes
are not. (From the data-footprint measurement.)

**Doc fields:** `color` (hex, optional) + `logoUrl` (string URL, optional, Phase 2) —
both written via `updateTeam` (global-first §105, rules-gated). `addTeam` carries
`color`. `externalId` is **not** the asset key (not universal — manual teams lack it);
under URL-paste no key is needed; if a Storage phase ever lands, key on team **doc id**.

**`TeamBadge`** (`components/TeamBadge.jsx`) — team analogue of `PlayerAvatar`. Props
`{team, size, ringColor}`; takes a **resolved team object**. Fallback chain: `logoUrl`
`<img>` (with `onError` → graceful fallback) → monogram (1–2 letters of `name`) on a
swatch. Swatch = `team.color` (validated hex) else a **stable hash color** from
`team.id`. **NEVER amber** (non-interactive identity, §27). Deliberate shape:
**rounded-square crest** (not PlayerAvatar's circle) — distinguishes team marks from
player avatars and crops square/shield logos cleanly. Exports `TEAM_COLORS` palette +
`isHex`.

### 107.1 Phase 1 — color foundation — SHIPPED 2026-06-04 (Batch 1)
- `color` doc field + brand-color **picker** on `TeamDetailPage` (44×44 swatch chips
  from `TEAM_COLORS` + "Default" clear; active = amber ring; super-admin canonical edit
  via `updateTeam`).
- `TeamBadge` slotted into **clean-object surfaces** (callers already hold a resolved
  team): `TeamDetailPage` **hero** (size-52 mark + subtle `color`-tint header) +
  `ScoutedTeamPage` header badge; `TeamsPage` + `AdminTeamsPage` list rows (`Card
  iconLeft`).
- **Batch 2 — SHIPPED 2026-06-04.** Threaded `TeamBadge` into the `getTeamName`-based
  surfaces: **`MatchCard` both sides** (new optional `getTeam(scoutedId)` prop; ScoutTab
  + CoachTab pass a `getTeam` resolver; back-compat — no prop → name-only) · **CoachTab
  team cards** · **ScoutTab add-team rows** · **`TeamPickerModal` rows** (renderItem) ·
  **`PlayerStatsPage` team chip**.
  - **Deferred/skip (rationale):** `TournamentPicker` (team name is part of a composite
    string label — no clean slot; low traffic); `PlayerEditModal` team **`<Select>`** (an
    `<option>` can't host a component); `MergePlayersModal` (team string-join). Not worth
    restructuring for marginal value.
- `logoUrl`-ready but unused (Phase 2).

### 107.2 Phase 2 — URL-paste logos — SHIPPED 2026-06-04
Fork-1 resolved to **URL-paste** (recommended default). `logoUrl` doc field
(`addTeam` carries it; `updateTeam` passes through) + a URL-paste `<Input>` on
`TeamDetailPage` ("Team logo (URL)", saved on blur, mirrors `setWorkspaceLogo` §93 /
player `photoURL`). `TeamBadge` was already `logoUrl`-ready (Phase 1) — renders
`<img src={logoUrl}>` with `onError` → graceful fallback to color + monogram. Empty
clears → color/monogram. **No base64, no Firebase Storage.**

**Deferred (not built):** Firebase Storage upload UX (init Storage + `storage.rules`
tenant-isolation + upload util + `getDownloadURL`) — only if URL-paste proves clunky.
The SW `images` runtime-cache `maxEntries` bump is moot under external URL-paste
(cross-origin); only relevant if logos are ever served same-origin (Storage phase).
**Team branding charter (§107) COMPLETE** for the URL-paste model.

## 108. Self-log live visibility on PlayerStatsPage — read-side fold (shipped 2026-06-06)

**Problem.** A linked player's self-logged training points (W5 — flat
`/selfReports/`, written live by the PPT wizard) did **not** appear in their own
PlayerStatsPage breakout stats until the training was closed / the matchup merged.
Two causes:
1. **Stats read the W4 bound shape only.** The breakout STATS walk
   (`PlayerStatsPage` training scope) builds player-points from scouted points +
   `point.selfLogs` / `players[slot]` + the per-point shots subcollection. That W4
   shape is written **only** by the § 70 propagator (`propagateMatchup` /
   `propagateTraining`) on matchup-merge / training-close. Until then the flat W5
   `/selfReports/` doc is readable but the stats view ignored it. (Samoocena §70.9
   already read W5 directly, so it showed live — the gap was stats only.)
2. **Self-view scope auto-default keyed on `attendees[]`.** Self-logging never
   writes `attendees[]` (the selfReport is the only signal a self-logger leaves),
   so a self-logger with no scouted-roster attendance defaulted to **global** scope
   with their self-logs invisible.

**Decision — read-side fix (option i), merge/propagation model untouched.** We
chose **not** to change the write/propagation model (option ii — making the wizard
bind into W4 on save, or auto-propagating without close — was the larger
architecture call and is **deliberately not taken** here). Two read-side changes
on `PlayerStatsPage`:
- **STEP 1a — orphan-report fold (breakout stats).** After the scouted byMatchup
  walk, fold every **orphan** self-report for the training (`getSelfReportsForPlayer`,
  filtered `!propagatedAt && !reviewDismissedAt && breakout.bunker`) in as a
  **synthetic free-play player-point**: `{ playerSlot:0, outcome:null, teamData:{},
  selfLog:{breakout,outcome,deathReason}, selfShots:[{targetBunker,result}] }`.
  `computePlayerStats` already has the self-log bridge (`selfLog.breakout` →
  bunker/position, `selfShots` → break-shot %, `outcome !== 'alive'` → survival),
  so the synthetic entry aggregates **identically** to a coach-scouted point — no
  new stats path (§ 27 Consistency). The W5 outcome vocab
  (`alive | elim_break | elim_midgame | elim_endgame`) aligns exactly with the
  `!== 'alive'` survival check — no remapping.
- **STEP 1b — scope auto-default union.** Self-view default candidate set =
  trainings ATTENDED (`attendees[]`) **∪** trainings SELF-LOGGED in
  (`/selfReports/` trainingIds). Latest by `training.date`. Read-side union only —
  no write-path change.

**Dedup invariant — `propagatedAt` is the single dedup key.** Orphan
(`propagatedAt == null`) reports fold via STEP 1a; the propagator stamps
`propagatedAt` (non-null) **and** writes the W4 representation in the same pass, so
a propagated report is counted via the byMatchup walk and **excluded** from the
fold. Every report is therefore represented **exactly once** — live (orphan→fold)
or post-close (bound→W4 walk) — across the close boundary, never double-counted.

**Why option ii was not taken (recorded for the architecture backlog).** Binding
W5→W4 at save time (or auto-propagating without a close) changes the source-of-
truth ownership of `point.selfLogs` / `players[slot]` and the merge-conflict model
(coach-observed vs self-reported per § 35 honesty principle). That is a § 57
multi-source-observation architecture decision, not a visibility bug — out of scope
here. The read-side fold gives live visibility with zero write-model risk.

## 109. Zone-shot self-log capture — `{zoneId, kill}` + Pattern B field-tap (staged, 2026-06-06)

**Problem.** The self-log shot step (`Step3Shots`) was a bunker-**NAME** multi-select
grid (`BunkerPickerGrid`, model `shots:[{side, bunker, order}]`). Fine for a few
bunkers, but a layout has a dozen+ firing lanes — the name grid doesn't scale, and a
bunker name is a worse domain model than a firing **zone**. The fix: capture shots by
tapping the layout's **callout zones** (`calloutZones`, the same polygons the heatmap
already renders), with a binary **kill** per zone.

**Model — `shots:[{zoneId, kill}]`.** `zoneId` references a `calloutZone`; presence =
fired-at; `kill` = boolean (one person, binary — **count/hit-number deliberately
rejected**: a single self-logging player either killed from that zone or didn't, a
count adds capture friction for no signal). zoneId is the right domain model — firing
lanes are zones, and the heatmap choropleth renders zone frequency readably.

**Dual-read, NO data migration (STAGE 0, `bb7aed97`).** The legacy `{side, bunker,
order}` shape stays **readable** everywhere; presence of `zoneId` selects the new path:
- `propagateSelfReportToPoint` — `zoneId` → synthetic shot XY from the **zone polygon
  centroid** (`resolveZones` + shared `polygonCentroid`) + carries `kill`; legacy
  `bunker` → unchanged bunker-centre path.
- `computePlayerStats` self-shots — `targetZoneId` → zone centroid → `getBunkerSide`
  side bucket; legacy `targetBunker` → unchanged. `kill` tallied as `selfShotKills`.
- The two `bumpLayoutAggregate*` crowdsource writers guard on `targetBunker`/`s.bunker`,
  so zone-shots skip the bunker aggregate gracefully (crowdsource untouched).

**Pattern B capture (STAGE 1, `d301410d`) — Jacek-approved prototype.** A first tile
"Wybierz strefę" opens a **maximized drawer** (fixed header + fixed Save). Body = the
field, **dense field = pure select/deselect** (tap a zone polygon → toggle; NO per-zone
controls on the field — that's the whole point, it solves the dozen-small-zones sub-44px
density problem). **Kill lives on roomy ≥44px chips below** (one per selected zone,
skull toggle) — §27: a kill is an interactive control, so it gets a proper target off
the cramped field. Writes `{zoneId, kill}`.

**Orientation — fixed right half (Jacek 2026-06-06).** The W5 self-log wizard is
*unbound* (no point/assignments/`fieldSide`), so the brief's "opponent half per
assignments" doesn't apply. Decision: the drawer shows a **fixed right half**
(`nx∈[0.5,1]` fills the canvas) — callout zones are authored on the field's right side
and it is always a self-log view, so orientation is a constant, not derived. No
breakout-bunker half-derivation, no ambiguity fallback.

**Bunker grid + zones COEXIST (corrected 2026-06-07).** STAGE 1 first shipped the zone
tile as a *replacement* for the `BunkerPickerGrid` (zones present → zone capture; absent
→ bunker grid). Jacek wanted **both**: pick bunker names as targets AND zones, in the
same point. `Step3Shots` now renders the "Wybierz strefę" tile **and** the
`BunkerPickerGrid` together — the zone tile when the layout has callout zones, the grid
when it has bunkers, the empty-state only when neither. The two pickers own **disjoint
subsets** of `state.shots` (bunker-shots `{side,bunker,order}` vs zone-shots
`{zoneId,kill}`) and merge on every toggle/save; the STAGE-0 dual-read counts both
downstream. **Bunker names are NOT drawn on the `ZoneTapField` canvas** (an interim
label attempt was rejected — names live in the grid only).

**OUTGOING vs INCOMING — kept distinct.** This captures shots the player **fired**
(outgoing: zone + kill). It does NOT touch INCOMING "hits taken on break" (the B3 gap —
only `eliminationPositions`→`deathBunkerCounts` exists today). The two stay separate in
the model and (STAGE 2) on the heatmap; do not conflate.

**Staging.** STAGE 0 data layer (shipped) → STAGE 1 capture drawer (shipped) → STAGE 2
render outgoing zone-shots on the player breakout heatmap (choropleth, kills emphasized;
reuses the existing `calloutZoneWeights` + `selectedPlayerId` isolation). Per-stage
branch → GO → merge → deploy.

### 109.1 Shared `ZoneTapField` + scouting reuse (zone-attribution W2, 2026-06-07)

The field-tap core is extracted as **`ZoneTapField`** — props `{fieldImage, zones,
selectedIds, viewportSide, onToggleZone}`, **pure select/deselect, no kill knowledge,
no chrome**. The tap hit-test always resolves to FULL normalized space (`toNorm`) and
`zone.polygon` is full-normalized, so `pointInPolygon` works for both `viewportSide`
modes. **One field component, two adapters:**
- **Self-log** (`ZoneShotDrawer`) — `viewportSide='right'` + kill chips + Save + flat
  `{zoneId,kill}` write.
- **Scouting** (`QuickShotPanel`) — `viewportSide=null` (**full field** — Jacek: preserve
  current scouting scope, both sides) + a maximized drawer replacing the callout-NAME
  pill scroller (unusable at a dozen+ zones). Taps write **live per-slot** via the
  existing `handleToggleQuickZone(id,'callout')` → `zoneShots[slot]`; **no kills**
  (scouting records zones fired at only). Band toggles untouched.

**Attribution (W1, § 30 — corrected to path∩polygon):** scouting zone-tags now also
**count** — `computePointKillCredits` Step 1.5 credits a slot whose tagged zone the
eliminated player's **path crosses** (path = calibration base on their side → elim
position). Self-log zone-shots flow through the same rule: the propagator writes their
zone-ids into `pt.zoneShots[slot]` (`0461fd87`), identical to scouting. So W1 (count) +
W2 (capture) together close the "zones don't matter / can't pick a dozen zones" pair.

**Centroid subcollection doc = side-stat source ONLY (clarification).** The self-log
zone-shot's centroid shot doc (`addSelfLogShotTraining`, `targetZoneId`) feeds
`computePlayerStats` break-shot **SIDE** stats via `selfShots` — it is **NOT** an
attribution input (attribution reads `pt.zoneShots` → path∩polygon; Step 1 precision
reads the point's `shots` field, which self-log never writes). So `kill` stays a
**self-stat** (on `/selfReports/` + `selfShotKills`), never geometric attribution.

### 109.2 STAGE 2 — OUTGOING zone-shots on the player breakout heatmap (2026-06-07)

**A new heatmap section on `PlayerStatsPage`** (it had none — the per-player choropleth
previously lived only on `ScoutedTeamPage`). Renders the player's **OWN OUTGOING**
zone-shots — zones they FIRED at — as a per-player **choropleth** (fill ∝ frequency),
reusing `HeatmapCanvas` (no new canvas; `points=[]` → choropleth-only, no position/shot
layers). Source: `teamData.zoneShots[slot]` across the player's points (scouted ∪
propagated self-log) **∪** orphan self-logs (deduped by `propagatedAt`), unified by
zoneId. **Kill emphasis:** new `calloutZoneKills` prop on `HeatmapCanvas` → kill-zones
get a stronger fill + a **bold red outline** (the self-log drawer's red-skull kill
idiom; red = `danger`). Per-zone kill comes from the player's `/selfReports/` (`kill`
flag), never `pt.zoneShots`. **OUTGOING / INCOMING invariant:** this layer + its legend
are OUTGOING-only; a future INCOMING ("hits taken on break", B3) layer must use a
**separate** weight map + legend — do not fold both into one undifferentiated weight.
**#3 CLOSED** (STAGE 0 + 1 + 2). Open: B3 INCOMING + the fieldSide-swap start-base edge.

### 109.3 Breakout-destination dots on the player heatmap (Part A, 2026-06-07)

The same PlayerStatsPage heatmap also shows **where the player ran on the break** — the
breakout-destination obstacle — as **position markers** (the "ran-TO" layer, distinct
from the "shot-AT" zone choropleth). Reuses `HeatmapCanvas`'s **existing position layer**
(the same marker styling as the scouting heatmap; **outcome color** = the elim marker on
eliminated-on-break vs the survived dot) — fed the player's points with `showPositions` +
`selectedPlayerId` (per-player isolation) + `phase='breakout'` (break-stage position =
`bumpStops[i] ?? players[i]`). Breakout source = wizard stage-1 `state.breakout.bunker` →
W5; bound: the propagator synthesizes `players[slot]` from the breakout bunker centre.
**No new marker code** — the brief's "reuse the dot-on-obstacle system" = the scouting
position renderer as the heatmap already mirrors it. **Follow-up (Jacek's "classes"):**
`drawPlayers` (scouting FieldCanvas) and `HeatmapCanvas`'s inline position markers are
duplicate logic — extract a shared marker module so all marker styling changes together.

### 109.4 Precision shot in self-log (Part B, 2026-06-07)

The self-log shot step now offers a **precision tap** (`{x, y, kill}`) alongside the zone
drawer + bunker grid — because zones are sometimes too coarse. **Reuses the scouting
`ShotDrawer`** verbatim (tap exact `{x,y}` on the field, tap-shot delete/kill menu);
`fieldSide='left'` → `viewportSide='right'` (self-log fixed-right framing). The self-log
shot record is now a **tri-shape**: `{zoneId,kill}` (zone) | `{x,y,kill}` (precision) |
`{side,bunker,order}` (legacy) — disjoint subsets of `state.shots`, each picker preserves
the others; **dual/tri-read, no migration**.

**Propagator routing (mirrors scouting exactly):** a precision shot → `{x,y,isKill}` into
**`pt.shots[slot]`** (the SAME field scouting writes) → flows through **Step 1 precision**
(nearest within 0.06 of an opponent elim → winner-takes-all). This is a **REAL tapped
position, NOT a synthesized centroid** — so the §109.1/align "centroid sits on-the-path-
not-at-the-obstacle" concern **does NOT apply** (that was only about synthesized
centroids; a real tap is where the player actually aimed). `kill`→`isKill` rides on the
shot as a visual/self-stat; **Step 1 credits by PROXIMITY, not `isKill`**, so kill stays
out of attribution. zone shots still → `pt.zoneShots` → Step 1.5 path∩polygon (unchanged).
`computePlayerStats` needs no change — precision shots count toward kills via the existing
`computeKillCredit(pt.shots)` path, exactly like scouting. Self-log shot is now
zone|precision|legacy-bunker, each routed to its own canonical attribution lane.

## 110. Self-log point delete (TodaysLogsList, 2026-06-07)

The player can delete a self-logged point from `TodaysLogsList` via the **§7 unified
idiom — `MoreBtn` ⋮ → `ActionSheet` ("Usuń punkt") → `ConfirmModal`** (the exact
components scouted points use in `MatchPage`; not swipe — Jacek's choice).

**A TodaysLogsList row is a W5 `selfReport`** (`getTodaysSelfReports`), **not** a W4
training point — so the W4-point cascade (unbind selfReports + rollup re-emit) is
**inapplicable**. Branch on `propagatedAt`:
- **Unpropagated (`propagatedAt == null`)** — the common case (training not closed yet).
  Delete = a bare `deleteDoc` on `/selfReports/{id}` (`deleteSelfReport`). Nothing
  downstream: the orphan report wasn't merged into any point. This is the **only path
  built**.
- **Propagated (`propagatedAt != null`)** — its contribution is already merged into a W4
  point; deleting the report leaves that behind (the inverse orphan). **Deliberately NOT
  built** — these rows get **no delete affordance** (gated off). Escalated for the
  un-merge-vs-block decision.

**Gate (`canDelete`):** `!pending && row.id && (isLinked ? !row.propagatedAt : true)`
(updated 2026-06-08 for Part b). **Rules:** owner-only — `firestore.rules:352`
`isLinkedSelfPlayer(slug, resource.data.playerId)` (no rule change). **Soft vs hard:**
hard (`deleteDoc`), matching the existing point delete. `ConfirmModal` guards the
destructive action.

### 110.1 Completion — Part (b) shipped, Part (a) escalated (2026-06-08)

**Part (b) — unlinked `/pendingSelfReports/` delete: SHIPPED.** An unlinked draft is
never propagated (`slotRef`/`propagatedAt` always null; the drafts collection is excluded
from collectionGroup until link-migration), so it has **no point/rollup contribution** → a
bare `deleteDoc` is the whole cascade. New `deletePendingSelfReport(id)` mirrors
`deleteSelfReport`; the `canDelete` gate now also lights the §7 ⋮ on unlinked rows, and the
ConfirmModal handler branches `isLinked ? deleteSelfReport : deletePendingSelfReport`.
**Rules unchanged** — `firestore.rules:371-373` already allows owner delete on
`/pendingSelfReports/{sid}` (`resource.data.uid == request.auth.uid`).

**Part (a) — propagated-selfReport delete (`propagatedAt != null`): RESOLVED as
BLOCK-WHILE-PROPAGATED (Opus, 2026-06-08). NOT individually deletable.** The brief's first
proposal — *un-merge by recompute* (re-derive the bound slot from its remaining sources,
never subtract) — was **rejected** after STEP-0 found the slot is **mixed-source without
per-entry provenance**, so recompute is unsafe:
- Scouting a point via `MatchPage` writes the **same** flat slot arrays the self-log
  propagator appends to — `zoneShots` (`MatchPage:1567-1569`, saved `:1155`) and `shots`
  (`:1620-1621`, saved `:1153-1156`) — and `MatchPage` serves training too (`isTraining`).
- The propagator dedupe-appends into those identical arrays (`dataService.js:1827` zoneShots
  `[...new Set(...)]`, `:1844` shots append). The arrays are flat (`string[]` / `{x,y,isKill}[]`)
  with only a slot-level **last-writer** `shotsMeta` — **no per-zone/per-shot source tag**.
- So if the coach tagged zone Z **and** the deleted player's selfReport also tagged Z, the
  dedupe collapsed them to one copy; recompute-from-remaining-self-sources would drop Z —
  **erasing the coach's tag** (the exact collision-erasure the brief's Acceptance forbids).
- Self sources *are* enumerable (`slotRef:{pointId,slotId}`), but the **scout-intrinsic**
  baseline is not separable → recompute can't reconstruct it.

(The pure-self assumption is also **not detectable per-slot**: `shotsMeta[slot]` is
last-writer only, so a coach contribution overwritten in `_meta` is invisible. And §70's
model is **sources-immutable** — corrections happen via Stage 4 reassign, not subtraction.)

**Resolution (shipped):** a propagated row is **blocked, with an HONEST state — not a
dead/absent control** (the brief's explicit requirement). It still opens the §7 ⋮, but to a
**disabled explanatory item** ("Scalone w punkcie — nie można usunąć tutaj. Korekta przez
reassign (wkrótce).") via a new additive `disabled` option on the shared `ActionSheet`
(muted, non-pressable, wraps). No recompute, no point mutation, no rule/index change. The
true propagated-correction capability is **Stage 4 reassign** territory (queued), not
standalone delete. **§110 (a) CLOSED as block.**

## 111. Catalog read model — stale-while-revalidate + single-flight (2026-06-06)

**Bug (Jacek, prod):** on the training screen, participants/lineups (uczestnicy/składy)
**suddenly disappeared mid-use** and came back "po jakimś czasie" / after refresh.
Intermittent.

**Root cause (discovery verdict).** Two sources feed the screen: the **IDs** (attendees,
squads, rosters) arrive via onSnapshot (training/matchup docs — fine), but the **people**
resolve through the version-gated catalog (`usePlayers` → `useGatedCatalog`). The old
`useGatedCatalog`, on a `/meta/catalogVersion` mismatch, went **straight to
`await fetchDocs()`** (a 3,242-doc `getDocs(/players)`) with `docs` held at `[]` for the
whole refetch — the still-valid stale IDB payload was served **only in the error `catch`**,
never during a normal refetch. So `playersById = {}` throughout, and every consumer's
`(ids).map(pid => playersById[pid]).filter(Boolean)` (`TrainingScoutTab:77-81`, Kiosk,
MatchPage, SquadEditor) **collapsed to empty**. The window opened on every remount of a
`usePlayers` consumer (tab-switch / navigation) while the version was stale; **`cc76f9ad`
amplified it** by bumping the global version on ~8 routine mutations (was ~2) — so an
ordinary edit (yours or a background coach/CSV) flipped the version and the next remount
paid a full blank refetch. "Po jakimś czasie" = the multi-thousand-doc fetch latency.

**Decision — SWR + single-flight, in the shared `useGatedCatalog` (fixes all consumers):**
- **Stale-while-revalidate** — on a version mismatch, if a non-empty stale payload exists in
  IDB, **serve it immediately** (`revalidating` flag) and refetch in the **background**,
  swapping to fresh when it lands. Consumers keep the previous names throughout — **never
  `[]`**. Cold start (no usable cache) keeps `loading=true` (never render `[]` as "no
  data"). The poisoned-empty guard (`docs?.length`) still blocks serving an empty cache as
  either fresh OR stale.
- **Single-flight** — refetches dedupe per `kind:version` (`_catalogInflight`): N consumers
  mounting in the same stale window share ONE `getDocs`, bounding read cost to one refetch
  per version-flip per client and removing the parallel-fetch race. The single non-empty
  recache happens inside the single-flight (once per fetch).
- **`cc76f9ad` intent preserved** — the bump still forces the refetch; an edited/added
  player is visible the instant the background fetch returns (behind the stale view), NOT
  reverted to the "edit invisible up to 30 days" class.
- `.filter(Boolean)` left as-is — with SWR `playersById` is populated during revalidation,
  so it no longer masks a degraded state. See `PROJECT_GUIDELINES §9` (cache-coherency).

**Deferred (separate brief, flagged):** cc76f9ad bumps the **global** version on routine
single-player edits → a full 3,242-doc refetch per bump per client. SWR+single-flight
*bounds* this (one refetch, no blank) but doesn't reduce frequency. A later carefully-scoped
analysis: can routine single-doc edits propagate incrementally without a global flip — and
without reintroducing "edit invisible"? Own brief, own analysis.

## 112. Hitability / Trafialność — empirical coach breakout-hit capture (staged, 2026-06-08)

**What:** an empirical coach tool — configure anonymous **player-position → target-obstacle**
pairs on a layout, then during breakout drills tap which obstacles got hit (and whose shot),
to see which obstacle is easy to hit and from where. **Empirical capture, NOT the
BreakAnalyzer physics sim.** "Players" are breakout **positions**, never roster/PBLI identity.
UX = the validated prototype `outputs/killability_prototype.html`; three modes
**Konfiguracja · Tracking · Podsumowanie**. v1 = **hit capture only** (no per-rep rate; "grał"
is an optional marker).

**Surfaces:** entry = **ONE card in the training COACH tab** (`TrainingCoachTab`, the SOLE
entry, training-only, coach-gated) → route `/training/:trainingId/hitability` → a **fullscreen,
landscape-maximized module**. Persistence is **on the layout** (config + hits), surfaced later
as a separate "Trafialność" analytics section that accumulates across trainings.

**Orientation (STAGE-0 correction, confirmed):** the maximize reuses **`useLandscapeMode`**
(BaseCanvas immersive), and a portrait phone gets the **`KioskRotatePrompt`** nudge (now
parameterised with optional `title`/`msg`). It does **NOT** use the kiosk `isKioskCompatible`
/ `useKioskMode` ≥1024 floor — that's the lobby's §27 tile-grid gate and would wrongly reject
a coach's phone in landscape.

**Data model (§96 overlay; amended at STAGE 2):** config + hits hang off the **layout overlay**
(`layoutOverlays/{id}`, **doc id == global base layout id** → portable for a future super-admin
pull). **Both live in COACH-writable SUBCOLLECTIONS** — the overlay DOC itself is **`isAdmin`-write**
(`firestore.rules:411`), so config can NOT be a doc field (a non-admin coach would be rules-denied);
only the recursive `/{document=**}` subcollection rule (`:412-415`) is **read `isMember` / write
`isCoach`**.
- **config** → `layoutOverlays/{id}/hitability/config` (single doc) = `{players:[{id,x,y,color,label}],
  targets:[{id,x,y,label}], links:[{playerId,targetId}]}` (anonymous, 0–1 coords), **read-DIRECT**
  via `subscribeHitabilityConfig` (NOT folded into `useLayouts`), written by `updateHitabilityConfig`.
- **hits** → `layoutOverlays/{id}/hitabilityHits/{id} = {playerId,targetId,ts,trainingId}`
  (anonymous, deletable per-entry, counter derived). In-module read = `where('trainingId','==',tid)`
  (**single-field auto index**); STAGE-3 analytics = whole-subcollection ordered by `ts` (auto).
- **NO `firestore:rules` deploy and NO composite index** — the existing `/{document=**}` wildcard
  already covers both. (The STAGE-0/STAGE-1 claim that the overlay-DOC write was `isCoach` and that a
  new rules block was needed was **wrong**; corrected here.)

**Target arch (capture-now, build-later):** cross-workspace sharing is a **manual,
super-admin-only pull** keyed by base layout id — **never** an automatic cross-workspace sync;
no capture/read path ever reads across workspaces. v1 builds none of it.

**Reuse vs net-new (STAGE 0):** reuses the canvas/marker idioms (`drawPlayers`-style),
`COLORS_ZONE_PALETTE` (amber excluded — amber stays interactive-only per §27), `ActionSheet`
(the overlap-disambiguation chooser), overlay storage, the TrainingCoachTab card + LayoutAnalytics
section patterns. **Net-new:** the module screen + canvas (`HitabilityCanvas`, bespoke
pointer/collect-all-hits — deliberately NOT routed through the scouting `touchHandler`,
first-hit-only), a shared `drawLineFromTo` (deferred — STAGE 1 keeps the line draw inline; the
3 existing inline sites + player-heatmap luf are a SEPARATE later DRY task, not rewired
mid-feature). "akwizycja killi" tab is **absent** → the Trafialność analytics section is its
future seed (stub only).

**STAGE 1 (shipped):** training-coach-tab card → landscape module (rotate nudge in portrait) →
**Konfiguracja**: reused-canvas field; tap left-half = add player, right-half = add target
(unlinked = dashed/gray), drag-to-move (5px threshold vs tap), tap player → tap target = link,
tap line = delete link, overlap disambiguation via ActionSheet; config persists to the overlay
(read-direct). Tracking/Summary are stubbed (STAGE 2/3). Anonymous; §27 PASS.

**STAGE 2 (shipped 2026-06-08):** **Tracking** + the config-storage move. (a) **Config moved**
from the STAGE-1 admin-write overlay doc-FIELD to the coach-writable `hitability/config` subdoc
(see amended data model) — **migrate-on-read**: if the new subdoc is empty and the legacy field is
present, seed once via `getLegacyHitabilityConfig` then write only the subdoc; the silent
`.catch(()=>{})` on config write is **removed** — failures `captureException` + a "Nie zapisano"
chip. (b) **Tracking mode** (to the prototype): reused canvas (read-only render with per-target
hit-count badges); **tap target → +1 hit** (single-owner auto; **shared target → whose-shot pick**
via the same ActionSheet chooser), **tap player → "grał"** session marker (optional, **no rate**),
**deletable hit-list** (side panel; × → delete the doc); **per-tap persist** to `hitabilityHits`
(no batch save). In-module view = the current session (live `subscribeHitabilityHits` for this
training). **No rules/index deploy.** §27 PASS. Summary + layout-analytics aggregation = STAGE 3.

**STAGE 3 (shipped 2026-06-08) — closes §112.** Two surfaces: (a) **in-module Podsumowanie**
= the CURRENT session — pairs (player→target) + hit counts (no rate) + total + "graczy grał"
(session marker), empty-state when nothing's linked. (b) **Layout-analytics "Trafialność"
section** = the cumulative payoff — a new `MODES.trafialnosc` entry + nav tab (`LayoutDetailPage`
left-edge "HITS" + the ⋮ menu "💥 Hitability") + an **early-branch** in `LayoutAnalyticsPage`
(`mode==='trafialnosc'` → self-contained `HitabilityAnalyticsSection`; the points pipeline is
guarded off). It reads **`hitabilityHits` whole-subcollection across ALL trainings** (one-shot
`fetchHitabilityHits` — no trainingId filter, **no composite, no collectionGroup**) + the
`hitability/config` subdoc (`getHitabilityConfig`), aggregates per (player→target) pair and per
target, and renders the **HitabilityCanvas read-only** with **targets weighted by cumulative
count** (new `weightTargets` prop — size ∝ count) + the connecting lines ("from where") + a
sorted pairs/counts list. Anonymous; loading/empty states. The future **"akwizycja killi"** layout
tab (absent today) **seeds from this section** (TODO stub — not built). **No rules/index deploy.**
§27 PASS. **DRY follow-up still open:** extract a shared `drawLineFromTo` + rewire the 3 inline
line sites + player-heatmap luf (separate task). **§112 Hitability = COMPLETE (STAGE 1/2/3).**

**Fix (2026-06-08) — tracking counted nothing on UNLINKED targets.** STAGE 2's `trackTap`
did `if (!owners.length) return` — so tapping a target with no `config.links` owner was a
**silent dead end** (Jacek: "counting does not work"; reproduces whenever the coach didn't
pre-draw player→target links). Fix: a target tap is **never** a dead end — candidates =
the target's linked owners if any, else **ALL configured players**; 1 → record, >1 → the
whose-shot ActionSheet. Recording now also **auto-creates the (player→target) pair** if it's
missing (`recordHit`) so the count lands in the badge/hit-list **and** the summary/analytics
(which key off `config.links`). Net: tracking works without a pre-link step; pairs form on
first hit. Coach-write only, no rules/index change.

**v2 MODEL CORRECTION (2026-06-08, Jacek — closes §112).** The earlier "player / whose-shot /
played" framing was **wrong**. Corrected, locked model:
- **Nodes = anonymous POSITIONS** (shooting spots), **not players** — *"nie ma znaczenia kto"*;
  many (>5). **Targets** = obstacles (many). A **connection** = position→target = a possible
  shot. The coach maps the field **exhaustively** in Config.
- **Tracking counts HITS only** per connection → effectiveness = **relative hit frequency / heat**
  (NO attempts, NO ratio). The shipped tap-target→+1 engine was already correct; v2 = a **relabel +
  one removal**, not a rework.
- **Relabel (user-facing + i18n PL/EN):** "gracz/zawodnik" → **"pozycja"**; **"Czyj to strzał?" →
  "Z której pozycji?"**; "Którego gracza połączyć?" → "Którą pozycję połączyć?"; `hitability_player_n`
  = "Pozycja {n}". The multi-connection target chooser picks the **source position** (ActionSheet
  scrolls/scales — with exhaustive mapping, >5 is the COMMON case, not an edge).
- **"grał"/played REMOVED** — no role under hits-only. Positions are **non-interactive in Tracking**
  (only target taps record); the `played` state + `playedSet` ring + the position-tap branch +
  the summary "graczy grał" line are gone.
- **Internal naming kept:** `playerId` / `config.players` are NOT renamed (would orphan smoke data
  for no user benefit) — documented as **position-node id** (`dataService.js` Hitability header).
- **STAGE-3 surfaces unchanged** (Podsumowanie = current-session connections + hit counts;
  layout-analytics "Trafialność" = cumulative hits per connection, weighted canvas + lines + list)
  — they only inherit the relabel. Anonymous; no rules/index.
- **DENSITY:** no regression at N>5 (ActionSheet scrolls `maxHeight:80dvh`; lines/config hold). The
  proper density UX (tap a connection line directly; rail layout) belongs to the **Canvas-archetype
  redesign**, NOT this finalize. **§112 Hitability CLOSED.**

**Fix (2026-06-08) — tracking still counted nothing; the picker was the friction.** Admin-SDK
read of prod (`ranger1996`/`XtQQKhVIegdTylygsbVX`) showed config = 6 positions / 12 targets /
8 links but **`hitabilityHits` = 0** — with links spread thin, almost every target tap had
**multiple** candidate positions → opened the "Z której pozycji?" ActionSheet, and the hit only
landed if the coach completed the modal (he didn't → 0 hits). Per Jacek "**każde tapnięcie to
nowe trafienie celu**": `trackTap` now records a hit **IMMEDIATELY on target tap, no picker** —
attributed to the target's connected position if any, else position 1, else unattributed
(`recordHit(tid, owners[0] || positions[0] || null)`; auto-forms the connection when missing).
Precise multi-position disambiguation (tap the connection LINE directly) is the **deferred
density / Canvas-archetype UX**, not a modal per tap.

**LOCKED principle — RECORD-THEN-ATTRIBUTE (2026-06-08, supersedes the above's "default to
position 1").** The hit count must NEVER be gated behind attribution. A tap on a target
**commits + persists a hit IMMEDIATELY** (`commitHit` → `hitabilityHits`); `count == taps`,
always; no modal in the critical path. Attribution is a **separate, non-blocking** follow-up:
- **1 connection** → commit attributed to that position (auto, silent).
- **multiple connections** → commit with `positionId = null` (target-level hit — counts toward
  the target total + Podsumowanie + analytics weight); **no ask** (precise pick = the future
  line-tap UX). **Never** auto-pick `owners[0]`.
- **0 connections** → commit with `positionId = null` (counts NOW), **then** ask "Z której
  pozycji?" (all positions) **after** the count; on pick → `attributeHit` edits the committed hit
  (`updateHitabilityHit`) + forms the connection (next taps auto-attribute); on **dismiss** → the
  hit **stays counted** (null). **Never** default to position 1.
- Delete ("×") removes a hit — unchanged. The only modal is the 0-connection ask, fired after the
  count, never blocking it. (New `dataService.updateHitabilityHit`; coach-write via the wildcard,
  no rules change.)

## 113. Responsive Canvas/Tool archetype + maximize-on-rotate rail (Hitability pilot, 2026-06-09)

First build of the responsive **Canvas/Tool archetype** (archetype-model discovery, § ARCHETYPE_MODEL).
Hitability is the pilot; the layout is a **reusable primitive** the Report+Canvas screens
(PlayerStats / ScoutedTeam / LayoutAnalytics) inherit next.

- **Nothing portrait-locked.** The module works in BOTH orientations — the hard landscape gate
  (`KioskRotatePrompt`) is GONE. (Was: portrait phone short-circuited to "rotate to landscape.")
- **Orientation convention for Canvas/Tool:**
  - **Portrait** → the field/heatmap is the HERO on top (full-width, capped height); the rail
    (mode switcher + per-mode content) stacks BELOW it and scrolls.
  - **Landscape (rotate = maximize)** → **THE LANDSCAPE RULE (record this):** the field/heatmap
    **fills 100% of height** and its **native aspect drives its width**; the rail is **RESIDUAL** —
    it takes only the leftover width, down to a usable **`railMin`**; the field **yields (shrinks)
    only if** the rail would otherwise drop below `railMin`. **The maximized field is the starting
    point, NOT a fixed-width rail with the field in the remainder.** (First WIP got this backwards —
    fixed 220px rail + field in the remainder; corrected to hero-first per the approved mockup.)
- **`CanvasRailLayout`** (`src/components/canvas/`) is the primitive — one tree, reflows on
  `isLandscape`; implements the rule via a CSS `aspect-ratio` hero box (`flex:0 1 auto`, height 100%)
  + a residual rail (`flex:1 1 0`, `min-width:railMin`). Per mode: Config = field + rail(switcher +
  connections + legend); Tracking = field + rail(switcher + HitList); Summary = weighted heatmap +
  rail(switcher + HitBreakdownList cel→pozycja). The **mode switcher lives IN the rail** (top), not a
  separate top row.
- **§ 81 alignment (NOT an override):** § 81's "rotation does NOT auto-promote" is scoped to
  **scroll-dashboards** (ScoutedTeam) — its own note reserves the rotation gate "for canvas-primary
  surfaces." Hitability **is** canvas-primary → rotate=maximize is the § 81 canvas case. Mitigation:
  orientation via `useLandscapeMode` (respects the OS lock); portrait is fully functional (rotate-back
  is free).
- **Coordinate guardrail preserved across the reflow** (the § 112 de-risked invariant): the canvas
  sizes from its OWN wrapper (ResizeObserver) + explicit px + live-rect `relPos`, and draw/hit-test
  use the same measured size. The layout only resizes the field's BOX (CSS, content-independent) → the
  canvas re-fits → **tap-after-rotate maps to the correct target.** Proven by the fail-first e2e
  (`hitability-responsive.spec.js`): drives the REAL canvas across orientation — portrait stack
  renders, landscape hero+residual rail, tap-after-rotate counts (+1, persists), reload survives;
  FAILS first if the gate/transform is wrong.
- **Preview-deploy (environment gate before merge):** `VITE_PREVIEW=1` build → `base
  '/pbscoutpro/preview/'` + **SW disabled** (no stale-cache / scope collision on the reviewer's phone)
  → `gh-pages -d dist --dest preview --add` (the `--add` keeps the prod root intact; `preview/` is
  ephemeral). Reviewer opens `…github.io/pbscoutpro/preview/#/training/<id>/hitability` on a real
  phone (real PWA-less env, real prod data, real orientation). This is the new faithful-mockup loop's
  environment gate — the real "done" is the phone smoke, not the green e2e.
