# CC Brief: Unified Header System + Premium Redesign

## CRITICAL: Read first
- Read `DESIGN_DECISIONS.md` before starting
- Read `src/utils/theme.js` for current tokens
- The design specs below are self-contained — all measurements, colors, and patterns are described here.

## Header System — ONE pattern for ALL screens

Every header in the app follows the same anatomy:
```
[back 28×28] [title + subtitle, flex:1] [badges] [action 28×28]
```

### Header Component Spec

All headers use the same container:
```jsx
style={{
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '12px 16px',
  background: COLORS.surface,  // #111827
  borderBottom: `1px solid ${COLORS.border}`,
}}
```

#### Back button (optional — absent on tab roots: Home, Teams, Layouts)
```jsx
style={{
  color: COLORS.accent,  // #f59e0b
  width: 28, height: 28,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, marginLeft: -4,
}}
// Content: <svg> chevron left, stroke-width 2.5
```

#### Title block (always present, flex:1)
```jsx
<div style={{ flex: 1, minWidth: 0 }}>
  <div style={{
    fontWeight: 800, fontSize: FONT_SIZE.lg,  // 16-18px
    color: COLORS.text,  // or result color for FINAL
    letterSpacing: '-0.03em',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  }}>{title}</div>
  <div style={{
    fontSize: FONT_SIZE.xxs,  // 10px
    color: COLORS.textMuted,  // or result color for FINAL
    fontWeight: 600, letterSpacing: '0.5px', marginTop: 1,
  }}>{subtitle}</div>
</div>
```

#### Badges (optional, flex-shrink:0)
League badges, LIVE/FINAL badges — same as current but placed inline in header.

#### Action button (optional, 28×28)
⋮ three dots or ✏️ edit icon.

### Per-Screen Header Content

| Screen | Back | Title | Subtitle | Badges | Action |
|--------|------|-------|----------|--------|--------|
| Home | — | PbScoutPro (amber) | PAINTBALL SCOUTING | — | workspace pill |
| Tournament | ‹ | {tournament.name} | TOURNAMENT · {division} | league badge | edit icon |
| Scouted Team | ‹ | {team.name} (18px) | TOURNAMENT SUMMARY | — | ⋮ dots |
| Match LIVE | ‹ | Scouting {myTeam} | VS {oppTeam} · {scoreA}:{scoreB} | LIVE badge | — |
| Match FINAL WIN | ‹ | {myTeam} vs {oppTeam} (green) | {myScore}:{oppScore} · WIN (green) | FINAL badge | — |
| Match FINAL LOSS | ‹ | {myTeam} vs {oppTeam} (red) | {myScore}:{oppScore} · LOSS (red) | FINAL badge (red bg) | — |
| Match FINAL DRAW | ‹ | {myTeam} vs {oppTeam} (amber) | {myScore}:{oppScore} · DRAW (amber) | FINAL badge (amber bg) | — |
| Scouting Editor | ‹ | Scouting {myTeam} | VS {oppTeam} · {scoreA}:{scoreB} | LIVE badge | — |
| Scouting Editor (row 2) | — | — | — | — | "from LEFT ⇄" pill |
| Teams (tab root) | — | Teams | ROSTER MANAGEMENT | — | — |
| Team Detail | ‹ | {team.name} | TEAM PROFILE | league badges | ⋮ dots |
| Layouts (tab root) | — | Layouts | FIELD MAPS | — | — |
| Layout Detail | ‹ | {layout.name} | FIELD LAYOUT | league badge | ⋮ dots |
| Tactic Editor | ‹ | {tactic.name} | {layout.name} (uppercase) | — | ⋮ dots |
| New Layout (wizard) | ‹ | New layout | STEP {n} OF 3 · {stepName} | — | — |

### FINAL Header — Result Color Rules
When match is FINAL, title AND subtitle AND FINAL badge all use ONE color:
- WIN: title `COLORS.success`, subtitle `COLORS.success` at 70% opacity, badge green bg
- LOSS: title `COLORS.danger`, subtitle `COLORS.danger` at 70% opacity, badge red bg  
- DRAW: title `COLORS.accent`, subtitle `COLORS.accent` at 70% opacity, badge amber bg

### Scouting Editor — Side Pill
Below the main header row, indented 32px from left:
```jsx
<div style={{ width: '100%', marginTop: 4, paddingLeft: 32 }}>
  <span style={{
    fontSize: 12, padding: '4px 12px', borderRadius: 6,
    background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
  }}>
    <span style={{ color: COLORS.textDim }}>from</span>
    <span style={{ fontWeight: 700, color: TEAM_COLORS[activeTeam] }}>{fieldSide === 'left' ? 'LEFT' : 'RIGHT'}</span>
    <span style={{ color: COLORS.textMuted }}>⇄</span>
  </span>
</div>
```

---

## Implementation Plan

### Part 0: Update PageHeader Component
The `PageHeader` component in `src/components/PageHeader.jsx` (or wherever it lives) needs to be updated to support the new pattern:

Props:
- `title` — main title text
- `subtitle` — subtitle text (uppercase, small)  
- `titleColor` — override title color (for FINAL states)
- `subtitleColor` — override subtitle color
- `back` — back navigation config (same as current) or null for tab roots
- `badges` — React node for inline badges
- `action` — React node for right action (⋮ dots, edit icon)
- `children` — optional second row (for side pill on scouting editor)

Remove any centered-title pattern. All headers are left-aligned.

### Part 1: Apply to ALL Pages
Go through every page and update headers to use the new PageHeader:

1. **HomePage** — brand header (title=PbScoutPro in amber, subtitle=PAINTBALL SCOUTING)
2. **TournamentPage** — back + title + subtitle="TOURNAMENT · {division}" + league badge + edit
3. **ScoutedTeamPage** — back + title=team.name 18px + subtitle=TOURNAMENT SUMMARY + ⋮
4. **MatchPage heatmap LIVE** — back + title="Scouting {myTeam}" + subtitle="VS {opp} · {score}" + LIVE badge
5. **MatchPage heatmap FINAL** — back + title="{my} vs {opp}" in result color + subtitle="{score} · WIN/LOSS/DRAW" in result color + FINAL badge
6. **MatchPage scouting editor** — same as LIVE heatmap + side pill second row
7. **TeamsPage** — no back + title=Teams + subtitle=ROSTER MANAGEMENT
8. **TeamDetailPage** — back + title=team.name + subtitle=TEAM PROFILE + league badges + ⋮
9. **LayoutsPage** — no back + title=Layouts + subtitle=FIELD MAPS (verify with actual page)
10. **LayoutDetailPage** — back + title=layout.name + subtitle=FIELD LAYOUT + league badge + ⋮
11. **TacticPage** — back + title=tactic.name + subtitle=layout.name uppercase + ⋮
12. **LayoutWizardPage** — back + title="New layout" + subtitle="STEP {n} OF 3 · {stepName}"

### Part 2: Remove Old Patterns
- Remove any centered header patterns (the old "Scouting PPArena / vs ALA · 0:1" centered layout)
- Remove any `position: relative` + `position: absolute` back/badge positioning in headers
- Remove duplicate team names below headers
- All headers are now simple flex rows, no absolute positioning

### Part 3: Verify
Test every screen transition. Verify:
- Back buttons navigate correctly
- LIVE/FINAL badges show correctly
- Result colors on FINAL match headers
- Side pill appears on scouting editor
- Tab root pages (Home, Teams, Layouts) have no back button
- Long titles truncate with ellipsis
- League badges visible on Tournament and Team Detail

Push after each part.

---

## CC Prompt
```
Read CC_BRIEF_UNIFIED_HEADERS.md. Update PageHeader component and apply to ALL pages.
Push after each part.
```
