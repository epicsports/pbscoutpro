# DESIGN DECISIONS — PbScoutPro
## ⚠️ This is the SINGLE SOURCE OF TRUTH for all design decisions.
## CC: Read this before implementing any UI work. Do NOT re-add removed features.
## Last updated: 2026-04-13 by Opus

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
