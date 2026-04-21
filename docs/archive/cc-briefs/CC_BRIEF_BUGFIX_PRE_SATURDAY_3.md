# CC_BRIEF_BUGFIX_PRE_SATURDAY_3

> **Archive:** shipped in commit `e695880`, merged to main 2026-04-21. See DESIGN_DECISIONS § 40.

**Context:** Third brief in pre-Saturday bugfix sprint. Briefs 1 + 2 already merged + deployed. This brief covers one narrowly-scoped change: replace the two-pill visibility toggle (`● Positions` / `⊕ Shots`) on the match heatmap view with a per-team 2×2 toggle block, allowing independent on/off for each team's positions and shots.

**Branch:** `fix/per-team-heatmap-toggle` off `main`

**Deploy urgency:** Pre-Saturday 2026-04-25 — nice-to-have. Not blocking. If iPhone validation of Briefs 1+2 raises hotfixes, those take priority.

**Pre-req:** None. Single-component swap; does not touch Briefs 1 or 2 surface area.

**Mockup reference:** `mockup_toggle_variants_v3.html` — variant V4 (Chip groups per team, rightmost frame in the mockup grid). Approved by Jacek 2026-04-21.

---

## Problem

The match heatmap view currently has two global pills between the field canvas and the metrics row:

```
┌─────────────────────┐
│  ● Positions   ⊕ Shots  │
└─────────────────────┘
```

These toggles operate **globally** — they flip positions OR shots for both teams together. There's no way to hide just Team B's data without hiding Team A's too, or vice versa. This becomes a problem when:

- A coach wants to analyze only own-team break patterns without opponent clutter
- A coach wants to see only opponent shots (e.g. "where does ALA shoot at us?") without visual noise from own-team shots
- Scout data quality is asymmetric — one team well-scouted, the other partially — and the coach wants clean views of each

---

## Solution — V4 Chip groups per team

Replace the current two pills with a 2-row block where each team has its own Positions + Shots chip pair, grouped by a team tag.

### Visual target

```
┌─────────────────────────────────────────────────┐
│  ● RANGER    [✓ ● Positions]  [✓ ⊕ Shots]        │
│─────────────────────────────────────────────────│
│  ● ALA       [✓ ● Positions]  [✓ ⊕ Shots]        │
└─────────────────────────────────────────────────┘
```

### Why V4 (design-system alignment)

V4 is the variant that most closely matches existing repo patterns. Verified against PROJECT_GUIDELINES + DESIGN_DECISIONS:

- **Scope pills pattern (§ 24 PlayerStatsPage):** `[This tournament] [All tournaments] [Global]` with *"Active = amber border + bg `#f59e0b08`"* — V4 uses the same active state styling.
- **Chip with colored dot (§ 23 point scouting):** V4 keeps the same mechanic (green dot for positions, red crosshair for shots, matching current pill icons).

Alternatives V1 (segmented), V2 (iOS switches), V3 (matrix) rejected — they introduce primitives that don't exist anywhere else in the app.

---

## Implementation spec

### Component location

`src/components/match/PerTeamHeatmapToggle.jsx` (new file).

### Props

```
{
  teamA: { name: string, color?: string },
  teamB: { name: string, color?: string },
  visibility: {
    teamA: { positions: boolean, shots: boolean },
    teamB: { positions: boolean, shots: boolean },
  },
  onChange: (newVisibility) => void,
}
```

Default state on mount: all four `true`. State lives in parent (`MatchPage.jsx`) — non-persisted v1 (flag for future localStorage if field use demands).

### Styling tokens

All from `src/utils/theme.js`:

- Container: `COLORS.surface` bg, `SPACE.md` padding
- Team tag: `COLORS.bg` recessed bg, team-colored 7px dot (`TEAM_COLORS.A`/`B`), 12px/700 team name
- Chip active: `rgba(245, 158, 11, 0.5)` border + `#f59e0b08` bg + `COLORS.accent` text + icon inherits currentColor
- Chip inactive: transparent bg + `COLORS.border` 1.5px + `COLORS.textMuted` + semantic icon color
- Border between rows: 1px `COLORS.border`
- `minHeight: TOUCH.minTarget` (44px) per § 27

### Behavior

- Tap chip → toggles that specific chip's state. No ripple, no confirmation.
- Minimum touch target 44px vertical per § 27
- No "All on/off" shortcut — tap 4 chips individually
- Keyboard: each chip is a real `<button>`, Tab-focusable, Space/Enter toggles, `aria-pressed` reflects active state

### Downstream — heatmap filter

`HeatmapCanvas` refactored to accept optional `visibility` prop. If provided, overrides global `showPositions`/`showShots` booleans (kept for `FieldView` / `ScoutedTeamPage` backward compat — no caller migration forced). Per-team filtering in render loops:

```js
// Before:
if (showPositions) renderPositions(allPointsFromAllTeams);

// After:
if (visibility.teamA.positions) renderPositions(pointsFromTeamA);
if (visibility.teamB.positions) renderPositions(pointsFromTeamB);
```

Data source — `homeData` vs `awayData` on each point doc — already split per team (§ 18 Concurrent Scouting).

---

## Team name source

Use `match.teamA?.name` / `match.teamB?.name` (same strings displayed on scoreboard). Tag has `min-width: 90px` + `max-width: 120px` with ellipsis to keep layout stable for long names.

## Empty-data behavior

Team B with zero scouted points → row still renders, chips still tappable, heatmap empty for that team. UI stability > hiding-what-nothing-affects.

## Out of scope (hands-off)

Header, scoreboard card, field canvas, metrics row, POINTS section, point cards, "Podgląd: Admin" banner, End match button — all untouched. If implementation touches any of these outside of threading the visibility prop to heatmap renderer, stop and reconsider scope.

---

## § 27 self-review expected findings

- **Color discipline:** Amber on active chip = legitimate interactive state. Green dot / red crosshair inherit `currentColor` when chip active — hierarchy amber-led.
- **Elevation:** Container `#0f172a` / team tag `#080c14` recessed — distinct layers.
- **Typography:** Team name 12px/700, chip label 12px/600 — both ≥ 11px floor.
- **Touch targets:** ≥44×44 via `minHeight: TOUCH.minTarget`.
- **Anti-patterns:** Zero chevrons, zero competing CTAs, zero amber on team tags (grouping, not actionable).

---

## Acceptance criteria

- [x] Component renders with two team rows, each with two chips, default all active
- [x] Tap any chip → that chip toggles; state update propagates to heatmap; heatmap re-renders showing/hiding exactly that team's positions or shots
- [x] All four chips independently controllable — no coupling between Team A and Team B state
- [x] Visual active state: amber border + `#f59e0b08` bg + amber text + amber icon
- [x] Visual inactive state: `#1a2234` border + transparent bg + muted text + colored icon
- [x] Team short names render correctly (RANGER, ALA, other 3-6 char names)
- [x] Team with 0 scouted points — row still renders, chips still tappable
- [x] Touch target ≥44px
- [x] No regression in heatmap rendering when all 4 chips on (parity with prior "both pills on" state)
- [x] Clean unmount — no state leak
- [ ] iPhone empirical validation — pending Jacek 2026-04-25

---

## Shipped

- Commit: `e695880 feat(match): per-team heatmap visibility toggle replaces global pills`
- Merge: 2026-04-21
- Touched: `src/components/match/PerTeamHeatmapToggle.jsx` (new, 124 lines), `src/components/HeatmapCanvas.jsx` (+27/−8), `src/pages/MatchPage.jsx` (+11/−20)
- Documentation: DESIGN_DECISIONS § 40
