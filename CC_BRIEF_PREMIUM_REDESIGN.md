# CC Brief: Premium Design System Implementation

## Context
Jacek approved a unified premium design system across all screens.
Reference mockup: `/mnt/user-data/outputs/complete_design_v3.html`

Read these files BEFORE starting:
- `DESIGN_DECISIONS.md` — existing design decisions
- `src/utils/theme.js` — current tokens
- `src/components/ui.jsx` — current components (Card already partially updated)

## Design System Tokens

### Already Done (verify only)
- `RADIUS.md` = 10, `RADIUS.lg` = 12 (card radius)
- Card bg = `COLORS.surfaceDark` (#0f172a), padding 12px 16px, gap 12px
- Card icon box bg = `COLORS.border` (neutral)

### To Add in theme.js
```js
// Add to COLORS:
zeeker: '#06b6d4',  // cyan — zeeker line and zone metric
```

### Token Reference (DO NOT change existing values, just verify)
- bg: #0a0e17 (page background)
- surface: #111827 (headers, bottom nav, sticky bars)
- surfaceDark: #0f172a (cards, panels)
- border: #1e293b (all borders)
- Card radius: RADIUS.lg (12px)
- Button radius: RADIUS.md (10px)
- Section labels: FONT_SIZE.xxs (10px), weight 600, letterSpacing '1.5px', uppercase, COLORS.textMuted
- Scores: FONT_SIZE.lg+1 (18px), weight 800, letterSpacing '-0.02em'
- CTA: accentGradient, accentGlow shadow, 14px padding, RADIUS.md radius

---

## Implementation Order

### Part 1: Component Updates (ui.jsx)

#### 1.1 Card — already done, verify:
- bg: COLORS.surfaceDark
- borderRadius: RADIUS.lg
- padding: '14px 16px' (was '12px 16px' — standardize to 14px 16px)
- gap: 12
- Icon box: bg COLORS.border (not accent tint)
- Chevron: only shown when onClick AND no actions prop
- Optional: `icon` prop can be null (no icon box rendered)

#### 1.2 Add SectionLabel component:
```jsx
export function SectionLabel({ children, color }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
      color: color || COLORS.textMuted, letterSpacing: '1.5px',
      textTransform: 'uppercase', marginBottom: SPACE.sm,
    }}>{children}</div>
  );
}
```
Replace ALL inline section label styles across all pages with `<SectionLabel>`.
Subsection labels like LIVE, COMPLETED, SCHEDULED use this.
Section TITLES like "Matches (6)" stay as larger text (16px weight 700).

#### 1.3 Scheduled card variant:
Add support for scheduled/dashed style on Card:
```jsx
// In Card component, add `scheduled` prop:
borderStyle: scheduled ? 'dashed' : 'solid',
borderColor: scheduled ? COLORS.border + '80' : COLORS.border,
// Wrap children in a div with opacity: scheduled ? 0.55 : 1
```

#### 1.4 Live card variant:
Add `live` prop to Card:
```jsx
borderColor: live ? COLORS.accent + '40' : ...,
```

#### 1.5 Badge component (standardize):
```jsx
export function ResultBadge({ result }) {
  // result: 'W' | 'L' | 'D' | 'LIVE' | 'FINAL'
  const config = {
    W: { color: COLORS.success, bg: COLORS.success + '18' },
    L: { color: COLORS.danger, bg: COLORS.danger + '18' },
    D: { color: COLORS.accent, bg: COLORS.accent + '18' },
    LIVE: { color: '#000', bg: COLORS.accent, shadow: COLORS.accentGlow },
    FINAL: { color: COLORS.success, bg: COLORS.success + '15' },
  }[result] || {};
  return (
    <span style={{
      fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800,
      padding: '3px 7px', borderRadius: 5, letterSpacing: '0.3px',
      color: config.color, background: config.bg,
      boxShadow: config.shadow || 'none',
    }}>{result}</span>
  );
}
```

#### 1.6 Score component:
```jsx
export function Score({ value, color }) {
  return (
    <span style={{
      fontFamily: FONT, fontSize: FONT_SIZE.lg + 1, fontWeight: 800,
      letterSpacing: '-0.02em', color: color || COLORS.text,
    }}>{value}</span>
  );
}
```

#### 1.7 CoachingStats component (NEW):
Compact inline row of 4 mini-metric cards for match heatmap view.
```jsx
export function CoachingStats({ side, danger, disco, zeeker }) {
  // side: { dorito: 60, snake: 40 }
  // danger/disco/zeeker: number (percentage)
  const items = [
    { label: 'SIDE', render: () => (
      <div style={{ display: 'flex', gap: 4, fontSize: FONT_SIZE.xs, fontWeight: 800 }}>
        <span style={{ color: COLORS.danger }}>{side?.dorito || 0}%</span>
        <span style={{ color: COLORS.textMuted }}>/</span>
        <span style={{ color: COLORS.info }}>{side?.snake || 0}%</span>
      </div>
    )},
    { label: 'DANGER', value: danger, color: COLORS.danger },
    { label: 'DISCO', value: disco, color: COLORS.bump },
    { label: 'ZEEKER', value: zeeker, color: COLORS.zeeker || '#06b6d4' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, padding: `${SPACE.sm}px ${SPACE.lg}px` }}>
      {items.map(item => (
        <div key={item.label} style={{
          flex: 1, background: COLORS.surfaceDark, borderRadius: RADIUS.md - 2,
          padding: SPACE.sm, textAlign: 'center', border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 600, letterSpacing: '0.5px' }}>
            {item.label}
          </div>
          <div style={{ marginTop: 2 }}>
            {item.render ? item.render() : (
              <span style={{ fontSize: FONT_SIZE.base, fontWeight: 800, color: item.color }}>
                {item.value || 0}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

Push after Part 1.

---

### Part 2: HomePage Redesign

Reference: mockup screen ①

Key changes:
- Hero card: Keep current gradient border, update icon box to 44×44 border-radius 10px
- Recent matches: Use `.cd` card pattern with Score component + ResultBadge
- Scheduled matches: Use `scheduled` prop (dashed border, dimmed content)
- Other tournaments: Use Card component (already should work with new bg)
- Section labels: Replace inline styles with `<SectionLabel>`
- Remove emoji from section headers (no ⚔️ etc.)
- Recent match cards: colored score (green/red) + W/L badge (these show from active tournament perspective)
- Bottom nav: Verify padding/sizing matches design (8px top/bottom, 11px labels)

Push after Part 2.

---

### Part 3: TournamentPage Redesign

Reference: mockup screen ②

Key changes:
- Division tabs: bg `surfaceDark`, active tab has `accent` text + 2px bottom border + subtle accent bg
- Teams section: collapsible with chevron ▶, 16px weight 700 title
- Matches section: 16px title + "+ Add" in accent
- Match cards: Use CONSISTENT pattern:
  - `<div>` (not Card) with same `.cd` styles
  - Content: team names (15px w700) + date (11px muted) | score (18px w800 neutral) | badge | ⋮ dots
  - LIVE: amber border glow
  - COMPLETED: FINAL badge (green bg)
  - SCHEDULED: dashed border, dimmed, "— : —"
- Remove ALL emoji from section labels (no ⚔️ before "Matches")
- Remove duplicate "+ Add" buttons — keep only SectionTitle right action and sticky bottom CTA
- Sticky bottom: `.cta` pattern

**IMPORTANT:** Tournament page match cards show score in NEUTRAL color (#e2e8f0) because this is tournament view (both teams equal). Only scouted team page and home page use colored scores.

Push after Part 3.

---

### Part 4: ScoutedTeamPage Redesign

Reference: mockup screen ③ — this is the biggest change

#### 4.1 Header
- Standard PageHeader: back chevron (no label) + team name (18px w800) + "TOURNAMENT SUMMARY" subtitle (10px, textMuted, ls:0.5px) + ⋮ dots
- Remove duplicate team name below header

#### 4.2 Heatmap
- Full-bleed (edge to edge, no horizontal padding)
- Remove Positions/Shots toggle — always show both layers
- Delete `heatmapType` state

#### 4.3 Side Preference Bar
- Container: surfaceDark bg, 12px radius, 12px 14px padding, border
- Left: 3px red accent bar + "DORITO" red + percentage bold
- Right: percentage bold + "SNAKE" blue + 3px blue accent bar
- Split bar: 6px height, 3px radius, gradient fills, 2px gap between halves
- Compute: count player positions on dorito/snake half based on layout.doritoSide

#### 4.4 Zone Tendencies
- 2×2 grid, gap 8px
- Each cell: surfaceDark bg, 12px radius, 12px 14px padding, border
- 4px accent bar (height 32px) on left side
- Label: 10px, textMuted, ls:0.5px
- Value: 22px, weight 800, zone color, ls:-0.02em
- "%" in 13px weight 600
- Colors: DANGER=#ef4444, SAJGON=#3b82f6, DISCO=#f97316, ZEEKER=#06b6d4
- Compute from heatmapPoints (approximate zones by x-coordinate)

#### 4.5 Record Summary
- Centered row: `1`W `|` `2`L `|` pts `19`:`17`
- Win: 20px w800 green, "W" 11px w600 green 50% opacity
- Loss: 20px w800 red, "L" 11px w600 red 50% opacity
- Dividers: 1px × 16px, border color
- Points: "pts" 13px w600 textDim, numbers 16px w800 text

#### 4.6 Roster (collapsible)
- Card pattern: surfaceDark bg, 12px radius, 14px 16px padding
- Icon box: 32×32, border bg, 8px radius, 👥 emoji
- "Roster" 15px w600 text
- "6 players" 12px textMuted
- Chevron on right
- Expand: same as current (search + player list + quick add)

#### 4.7 Matches
- Section label: "MATCHES" using SectionLabel component
- Match cards: surfaceDark bg, 14px 16px padding, 12px radius
- "vs OPPONENT" 15px w700 | date 11px muted | Score colored | ResultBadge
- Scheduled: dashed border, dimmed
- No icons, no trash button, no separate chevron
- Tap → navigate to match heatmap

#### 4.8 Remove
- Delete `heatmapType` state and toggle
- Delete duplicate team name div
- Delete trash buttons from match cards (delete via tournament page ⋮)

Push after Part 4.

---

### Part 5: MatchPage Heatmap — Coaching Stats

Reference: mockup screens ④⑤

Add CoachingStats component between heatmap canvas and points list on BOTH live and final heatmap views.

Compute stats from points data:
- SIDE: count positions on dorito/snake half → percentage split
- DANGER: percentage of points with player in danger zone (x > 0.6 normalized to left)
- DISCO: percentage crossing disco line
- ZEEKER: percentage crossing zeeker line

Place `<CoachingStats>` below the heatmap canvas, above the POINTS section.
Use a 1px border-top to separate from canvas.

Push after Part 5.

---

### Part 6: TeamsPage Redesign

Reference: mockup screen ⑦

- Replace Card usage with consistent pattern
- Team cards: no icon box, team name 15px w700 + league badges inline
- Parent teams: show child count collapse toggle (▼ N)
- Child teams: 20px left indent, "↳ 2nd roster" label above
- Card tap → navigate to team detail
- Bottom nav: active tab (Teams) in accent color
- Header: simple "Teams" title (no back, it's a tab root)
- Remove emoji from SectionTitle

Push after Part 6.

---

### Part 7: TeamDetailPage Redesign

Reference: mockup screen ⑧

- Header: back + team name (16px w700) + ⋮ dots
- Leagues section: SectionLabel "LEAGUES" + toggle pills
  - Active: colored border + subtle colored bg (league color at 15% opacity)
  - Inactive: surfaceDark bg, border, textMuted
- Roster section: 16px title + action buttons (+ New, 🔍 Find)
- Player cards: `.cd` pattern
  - Large `#number` in accent (17px w800, min-width 40px)
  - Name (14px w600) + nickname (12px textDim) + details (11px textMuted)
  - Edit icon (pencil) on right, NO trash button inline
  - Remove from team via edit modal or swipe
- Delete team: dashed red border, centered "Delete team" text at bottom
- Division selector: keep current functionality, style with pills

Push after Part 7.

---

### Part 8: LayoutDetailPage Verification

Reference: mockup screen ⑨

- Header: back + layout name + league badge + ⋮ dots
- Toggle row: pill buttons (active = accent border + bg, inactive = surfaceDark + border)
- Tactic cards: `.cd` pattern with title + subtitle + eye toggle + ⋮ dots
- Sticky bottom: CTA "+ New tactic"
- Verify cards use surfaceDark bg after Card component update

Push after Part 8.

---

### Part 9: TacticPage Verification

Reference: mockup screen ⑩

- Header: back + tactic name + layout subtitle + ⋮ dots
- Full-height canvas (no changes needed)
- Floating toolbar: existing pattern should be correct
- Verify header matches Type A pattern

Push after Part 9.

---

### Part 10: Final Consistency Pass

Go through EVERY page and verify:
1. All section labels use `<SectionLabel>` or identical inline styles
2. All cards use surfaceDark bg (#0f172a), 12px radius, 14/16px padding
3. All badges use `<ResultBadge>` or identical styles
4. All scores use 18px w800 ls:-0.02em
5. All CTAs use gradient + glow shadow
6. All headers use Type A or Type B pattern
7. All back buttons are 28×28 amber chevrons
8. No emoji in section labels (SectionTitle can still have emoji for titles like "Matches")
9. Scheduled items use dashed border
10. No `surfaceLight` (#1a2234) used for card backgrounds anywhere

Fix any inconsistencies found.

Push after Part 10.

---

## Testing Checklist
- [ ] Home page loads correctly with new card styles
- [ ] Tournament page division tabs work
- [ ] Tournament match cards show neutral scores
- [ ] Scouted team page shows coaching stats
- [ ] Match heatmap shows coaching stats row
- [ ] Teams page parent/child hierarchy works
- [ ] Team detail page edit/add player works
- [ ] Layout detail tactic cards work
- [ ] Tactic editor full canvas works
- [ ] All scheduled items have dashed borders
- [ ] All sticky bottoms have consistent CTA style
- [ ] Back navigation works correctly on all pages
- [ ] Mobile (iPhone) — verify touch targets, contrast, readability
