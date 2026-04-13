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
- Break analyzer / prediction engine (spec exists: BREAK_ANALYZER_SPEC.md)
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
- See `BALLISTICS_SYSTEM.md` for full documentation

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
