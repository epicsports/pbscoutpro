# DESIGN DECISIONS — PbScoutPro
## ⚠️ This is the SINGLE SOURCE OF TRUTH for all design decisions.
## CC: Read this before implementing any UI work. Do NOT re-add removed features.
## Last updated: 2026-04-21 by Claude Code (§ 44 — Brief 9 polish: canonical order, Option A score, toast suppression, auto-flip retained)

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

## 18. Concurrent Scouting (April 2026)

### How it works
Two coaches can scout the same match simultaneously. Each picks their side:
- Coach A → "Home" (scoutingSide='home') → writes only `homeData`
- Coach B → "Away" (scoutingSide='away') → writes only `awayData`

### Data model
Each point document has independent side data:
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

### Side picker
- Shows "LIVE" badge when other side is actively claimed by another coach
- Grayed out + disabled when claimed by another coach (not stale)
- Stale claims (>30 min old) are shown but overridable
- "Just observe" always available

### Claim system (Firestore-backed)
- `match.homeClaimedBy` / `match.awayClaimedBy` — uid of claiming coach
- `match.homeClaimedAt` / `match.awayClaimedAt` — timestamp (Date.now())
- Written on side selection, released on component unmount
- Heartbeat every 5 min refreshes timestamp (handles browser crash via TTL)
- Stale threshold: 30 minutes — stale claims can be overridden by new coach
- Switching sides releases previous claim before setting new one

### Save behavior
- **Concurrent mode** (home/away): only writes own side (`updateDoc` with partial data)
- **Solo mode** (observe or no concurrent): writes both sides (legacy behavior)
- Outcome: set by whoever chooses it (doesn't overwrite if already set by other coach)

### Point status tracking
- `open` — shell created, no player data yet
- `partial` — one coach saved their side, other side empty
- `scouted` — both sides have player data
- Status computed on save: checks if `otherSideKey` has player data

### Post-Brief 8: `canonical` flag (see § 42)
The above status machine still describes per-point data completeness. **Brief 8 adds an orthogonal `canonical` flag** on a per-coach stream model:
- During match, each coach writes to their own doc stream (ID scheme `{matchKey}_{coachShortId}_{NNN}`); `canonical: false` on all.
- At End match, `endMatchAndMerge` groups by coachUid, merges per-index where possible, writes canonical docs, flips `canonical: true` on source/solo/legacy docs per rule.
- Match review post-merge filters by `canonical === true` — see § 42 for full semantics.

The chess-model "single shared doc with homeData+awayData" pattern described above is still used for **legacy pre-Brief 8 data (grandfathered)** and for the legacy URL fallback in savePoint (no `&mode=new`). New Scout › flows write per-coach streams.

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
  email, displayName, role: 'scout' | 'coach' | 'admin',
  workspaces: ['workspace-slug-1', ...],
  createdAt
}

// Point attribution (already exists, just use real UID)
point.homeData.scoutedBy = auth.currentUser.uid
point.awayData.scoutedBy = auth.currentUser.uid
```

### Completeness computation per scout
For each scout's points, compute per-section fill rate:
- Breaks: positions placed / total slots
- Shots: players with quickShots or obstacleShots / non-runner placed players
- Assignments: players with roster ID / placed players
- Runners: runner flags set / placed players
- Hits: eliminations marked / placed players
- Composite: weighted average of all sections

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

### 35.5 Outcome color simplification

**Decision:** All elimination outcomes (Brejk / Środek / Koniec) use `COLORS.danger`. Only `alive` uses `COLORS.success`. Distinguish elim states by **label text**, not color.

**Rationale:**
- Semantic clarity (all 3 mean "eliminated")
- 2 colors instead of 4 in outcome row
- Consistent with § 27 color discipline

### 35.6 Variant chips — shared team pool

Breakout variants (e.g. "late break", "ze ślizgu") stored at team level, not per-player.

- Storage: `/workspaces/{slug}/teams/{teamId}/breakoutVariants/`
- All team members see same chips
- "+ Nowy" chip opens `<NewVariantModal>` — added variant immediately available for whole roster
- Usage counter tracks popularity (informs future analytics)

**Rationale:** 5-person team uses shared vocabulary. "Late break" means same thing for everyone. Per-player variants would fragment naming.

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
