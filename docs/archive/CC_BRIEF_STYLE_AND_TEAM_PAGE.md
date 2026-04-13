# ⚠️ SUPERSEDED — use CC_BRIEF_PREMIUM_REDESIGN.md instead

# CC Brief: Premium Style Upgrade + ScoutedTeamPage Redesign

## Context
Jacek approved a premium visual style from the scouted team page mockup. This brief covers:
1. Global style token updates (partially done)
2. ScoutedTeamPage full redesign
3. Consistency pass across all screens

Read DESIGN_DECISIONS.md and the approved mockup at `/mnt/user-data/outputs/scouted_team_premium.html` before starting.

---

## Part 1: Global Style Updates (ALREADY DONE — verify only)

These changes are already committed. Verify they look correct on all screens:

- `theme.js`: `RADIUS.md` = 10 (was 8), `RADIUS.lg` = 12 (primary card radius)
- `ui.jsx Card`: bg = `COLORS.surfaceDark` (#0f172a), border-radius = `RADIUS.lg` (12px), padding 12px 16px, gap 12px
- Card icon box: bg = `COLORS.border` (neutral, not amber tint)
- Card chevron: only shown when `onClick` AND no `actions` prop
- Card subtitle: `FONT_SIZE.xs`, `COLORS.textMuted`, marginTop 3

**Test**: Visit every screen that uses `<Card>` — TournamentPage, TeamsPage, LayoutDetailPage, ScoutedTeamPage. Confirm nothing is broken.

---

## Part 2: ScoutedTeamPage Redesign

Reference: `/mnt/user-data/outputs/scouted_team_premium.html`

The ScoutedTeamPage (`src/pages/ScoutedTeamPage.jsx`) is the tournament profile for a scouted team. It shows aggregate scouting data across all matches.

### 2.1 Header
- Standard `<PageHeader>` with back to tournament (keep current behavior)
- Title: team name (bold, 18px)
- Subtitle under title: "TOURNAMENT SUMMARY" (11px, `COLORS.textMuted`, letter-spacing 0.5px)
- No tournament name in back label — just `‹` chevron

### 2.2 Heatmap
- Full-bleed (no horizontal padding on the container — edge to edge)
- Show BOTH positions AND shots simultaneously (remove the Positions/Shots toggle buttons entirely)
- `heatmapType` state and the toggle buttons should be deleted
- Pass combined heatmap mode or adjust FieldView to show both layers

### 2.3 Side Preference Bar (NEW)
Add a new component below the heatmap.

Compute from `heatmapPoints`:
- For each point, determine if the player positions are predominantly on dorito side or snake side
- Use the layout's `doritoSide` ('top' or 'bottom') to know which half is dorito
- Aggregate: `doritoPercent = doritoPoints / totalPoints * 100`

Display:
```
DORITO 65%  [████████░░░░]  35% SNAKE
```
- Left label: red (#ef4444), "DORITO {n}%"
- Right label: blue (#3b82f6), "{n}% SNAKE"
- Bar: 8px height, border-radius 4px, red left / blue right proportional
- Container: bg `COLORS.surfaceDark`, border-radius 12, padding 12px 14px, border 1px solid COLORS.border
- 4px colored accent bar (width:3px, height:14px, border-radius:2px) on each side label

### 2.4 Zone Tendencies (NEW)
Add a 2×2 grid below the side preference bar.

Compute from `heatmapPoints`:
- DANGER %: percentage of points where a player is positioned in the "danger zone" (between the 50-yard line and the opponent's first row of bunkers). Approximate: players with x > 0.6 (assuming normalized to left).
- SAJGON %: players positioned in sajgon area (deep in own territory behind cover, x < 0.2)
- DISCO %: players crossing the disco line (use `layout.discoLine` if available, else approximate x > 0.45)
- ZEEKER %: players crossing the zeeker line (use `layout.zeekerLine` if available, else approximate x > 0.55)

Display: 2×2 grid, gap 8px. Each cell:
- bg: `COLORS.surfaceDark`, border-radius 12, padding 12px 14px, border
- 4px accent bar (left side, height 32px, border-radius 2px) in zone color
- Label: 10px, `COLORS.textMuted`, letter-spacing 0.5px
- Value: 22px, font-weight 800, zone color, letter-spacing -0.02em
- "%" in smaller 13px font

Colors:
- DANGER: `COLORS.danger` (#ef4444)
- SAJGON: `COLORS.info` (#3b82f6)  
- DISCO: `COLORS.bump` (#f97316)
- ZEEKER: #06b6d4 (add as `COLORS.zeeker` to theme.js)

### 2.5 Record Summary
Below zone tendencies. Centered, subtle, secondary info.

Compute from `teamMatches`:
- Wins: matches where myScore > oppScore and status=closed
- Losses: matches where myScore < oppScore and status=closed
- Total points won/lost: sum of myScore/oppScore across closed matches

Display: centered row
```
1 W  |  2 L  |  pts 19 : 17
```
- Win count: 20px, weight 800, green; "W" in 11px green 50% opacity
- Loss count: 20px, weight 800, red; "L" in 11px red 50% opacity  
- Dividers: 1px × 16px, `COLORS.border`
- Points: "pts" in 13px `COLORS.textDim`; numbers in 16px weight 800 `COLORS.text`

### 2.6 Roster
Keep current collapsible roster section.
- Use Card-style container: bg `COLORS.surfaceDark`, border-radius 12, padding 14px 16px
- Icon in 32×32 box (bg `COLORS.border`, border-radius 8)
- "Roster" label in 15px weight 600
- "6 players" count on right in 13px `COLORS.textMuted`
- Chevron on far right
- Expanded content: same as current (search, player list, quick add)

### 2.7 Matches Section  
Already rebuilt with premium match cards (committed). Verify:
- Section header: "MATCHES" in 11px, weight 600, `COLORS.textMuted`, letter-spacing 1px
- Match cards: surfaceDark bg, 14px 16px padding, border-radius 12
- "vs OPPONENT" in 15px weight 700
- Date in 11px `COLORS.textMuted`
- Score: 18px weight 800 in result color (green/red/amber)
- W/L/D badge: 10px weight 800, colored bg at 12% opacity
- Scheduled matches: 0.45 opacity, "— : —" in textMuted
- No icon, no trash button, no chevron. Tap → navigate to match heatmap.

### 2.8 Remove Unused Elements
- Remove `heatmapType` state and toggle buttons
- Remove duplicate team name `<div>` (was showing team.name twice — once in header, once as big title)
- Remove delete match button from match cards (delete via tournament page ⋮ menu instead)

---

## Part 3: Consistency Pass

After ScoutedTeamPage is done, verify these screens look correct with the new Card style:

### TournamentPage
- Match cards in Scheduled/Live/Completed sections use `<Card>` indirectly or custom divs
- Verify the match cards here also have surfaceDark bg, 12px radius
- The ⋮ menu on match cards should still work

### TeamsPage  
- Team cards use `<Card>` — verify they look good with new bg
- Division badges should still be visible

### LayoutDetailPage
- Tactic cards — verify bg contrast

### HomePage
- Tournament cards — verify

---

## Part 4: Add to theme.js

Add one new color token:
```js
zeeker: '#06b6d4',  // cyan — zeeker line and zone metric
```

---

## Implementation Order
1. Add `zeeker` color to theme.js
2. Rebuild ScoutedTeamPage (parts 2.1–2.8)
3. Consistency check (part 3) — fix any broken screens
4. Push after each part

## Testing
- Test on iPhone (Tymek) — check card contrast, readability
- Verify heatmap shows both positions and shots
- Verify side preference and zone tendencies compute from real data
- Verify back button from match → scouted team profile (already fixed)
