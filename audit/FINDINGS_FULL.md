# Cross-device render audit — FINDINGS_FULL (wave 2: stress data × 5-role matrix)

_5 roles × 32 routes × 5 viewports = 480 captures. Coach = full baseline; other roles report exclusive + differs-from-coach only. Severity & novelty are SUGGESTIONS — triage = Jacek + Opus._
_Screenshots: `audit/screenshots-full/<role>/<route>__<viewport>.png`. This file REPLACES FINDINGS.md as the living register._

## Run coverage & caveats
- **Captured roles:** coach, super, wsadmin.
- **NOT captured (automated):** scout, player — non-admin auto-enter never resolved ("Preparing your workspace…"; the blocking member-write logged as a backlog perf item). Their **access deltas are in `audit/REACHABILITY_MAP.md`** (guard-derived, authoritative); their allowed-route RENDER ≈ coach baseline (shared components, no role-branched layout). Re-run is role-fail-fast (records them as login-blocked + continues, no hang).
- **"Disappeared since wave-1" is mostly EXPECTED, not regressions:** wave-1's touch<44 cluster was FIXED (fix/audit-touch-spill, in this branch) and the spill was escalated; wave-2 also uses a different stress fixture (lay-stress w/ fieldImage vs base-demo null). Verify the few non-touch entries; ignore the touch<44 ones.

## Summary
**By severity:** P0 0 · P1 8 · P2 1

**By novelty:** carried-from-wave1 1 · new-on-stress-data 6 · new-role-specific 2

**Disappeared since wave-1 (SUSPICIOUS — verify the screen, not just the metric):** 96
  - scouts-ranking|phone-portrait|touch<
  - layout-detail|phone-portrait|off-viewport
  - layout-detail|phone-portrait|wider-than-viewport
  - layout-detail|phone-portrait|touch<
  - match-review|phone-portrait|touch<
  - match-scout|phone-portrait|off-viewport
  - match-scout|phone-portrait|wider-than-viewport
  - hitability|phone-portrait|touch<
  - scouts-ranking|phone-landscape|touch<
  - team-detail|phone-landscape|touch<
  - layout-detail|phone-landscape|touch<
  - match-review|phone-landscape|touch<
  - match-review|phone-landscape|hero<
  - match-scout|phone-landscape|touch<
  - hitability|phone-landscape|touch<
  - scouts-ranking|tablet-portrait|touch<
  - team-detail|tablet-portrait|touch<
  - layout-detail|tablet-portrait|off-viewport
  - layout-detail|tablet-portrait|wider-than-viewport
  - layout-detail|tablet-portrait|touch<
  - match-review|tablet-portrait|touch<
  - match-scout|tablet-portrait|off-viewport
  - match-scout|tablet-portrait|wider-than-viewport
  - hitability|tablet-portrait|touch<
  - main-home|tablet-landscape|touch<
  - teams|tablet-landscape|touch<
  - players|tablet-landscape|touch<
  - layouts|tablet-landscape|touch<
  - scouts-ranking|tablet-landscape|touch<
  - my-issues|tablet-landscape|touch<
  - training|tablet-landscape|touch<
  - members|tablet-landscape|touch<
  - team-detail|tablet-landscape|touch<
  - player-stats|tablet-landscape|touch<
  - scout-detail|tablet-landscape|touch<
  - scouted-team|tablet-landscape|touch<
  - training-results|tablet-landscape|touch<
  - user-detail|tablet-landscape|touch<
  - layout-detail|tablet-landscape|off-viewport
  - layout-detail|tablet-landscape|wider-than-viewport
  - layout-detail|tablet-landscape|touch<
  - layout-detail|tablet-landscape|hero
  - bunker-editor|tablet-landscape|touch<
  - ballistics|tablet-landscape|touch<
  - ballistics|tablet-landscape|hero
  - layout-analytics|tablet-landscape|touch<
  - match-review|tablet-landscape|touch<
  - match-review|tablet-landscape|hero
  - match-scout|tablet-landscape|off-viewport
  - match-scout|tablet-landscape|wider-than-viewport
  - match-scout|tablet-landscape|touch<
  - match-scout|tablet-landscape|hero
  - hitability|tablet-landscape|touch<
  - hitability|tablet-landscape|hero
  - layout-wizard|tablet-landscape|touch<
  - training-setup|tablet-landscape|touch<
  - training-squads|tablet-landscape|touch<
  - profile|tablet-landscape|touch<
  - debug-flags|tablet-landscape|touch<
  - ppt-log|tablet-landscape|touch<
  - ppt-wizard|tablet-landscape|touch<
  - main-home|desktop|touch<
  - teams|desktop|touch<
  - players|desktop|touch<
  - layouts|desktop|touch<
  - scouts-ranking|desktop|touch<
  - my-issues|desktop|touch<
  - training|desktop|touch<
  - members|desktop|touch<
  - team-detail|desktop|touch<
  - player-stats|desktop|touch<
  - scout-detail|desktop|touch<
  - scouted-team|desktop|touch<
  - training-results|desktop|touch<
  - user-detail|desktop|touch<
  - layout-detail|desktop|off-viewport
  - layout-detail|desktop|touch<
  - layout-detail|desktop|hero
  - bunker-editor|desktop|touch<
  - ballistics|desktop|touch<
  - ballistics|desktop|hero
  - layout-analytics|desktop|touch<
  - match-review|desktop|touch<
  - match-review|desktop|hero
  - match-scout|desktop|off-viewport
  - match-scout|desktop|touch<
  - match-scout|desktop|hero
  - hitability|desktop|touch<
  - hitability|desktop|hero
  - layout-wizard|desktop|touch<
  - training-setup|desktop|touch<
  - training-squads|desktop|touch<
  - profile|desktop|touch<
  - debug-flags|desktop|touch<
  - ppt-log|desktop|touch<
  - ppt-wizard|desktop|touch<

## 10 worst (role · route · viewport)

| # | role | route | viewport | score | flags |
|---|---|---|---|---|---|
| 1 | coach | training | phone-portrait | 20 | P1 off-viewport; P1 wider-than-viewport |
| 2 | coach | team-detail | phone-portrait | 20 | P1 touch<44; P1 text-broken-clip |
| 3 | super | players | phone-portrait | 20 | P1 off-viewport; P1 touch<44 |
| 4 | coach | teams | phone-portrait | 10 | P1 off-viewport |
| 5 | coach | players | phone-portrait | 10 | P1 off-viewport |
| 6 | coach | player-stats | phone-portrait | 1 | P2 text-ellipsis |

## Systemic patterns (coach baseline)

- **List** · `off-viewport` × 3 routes (teams, players, training)

## Per-role (vs coach baseline)

### super
- exclusive routes (not in coach set): none
- routes rendering DIFFERENT from coach: players
- blocked/redirected routes: 1 · same-as-coach captures: 158
- flags on exclusive/differing screens:
  - players phone-portrait: P1 off-viewport — 2 el; worst +136px
  - players phone-portrait: P1 touch<44 — 48× e.g. <button> 42×34 "" · <button> 42×34 "" · <button> 42×34 "" · <button> 42×34 ""

### wsadmin
- exclusive routes (not in coach set): none
- routes rendering DIFFERENT from coach: none
- blocked/redirected routes: 1 · same-as-coach captures: 159

### scout
- exclusive routes (not in coach set): none
- routes rendering DIFFERENT from coach: none
- blocked/redirected routes: 0 · same-as-coach captures: 0

### player
- exclusive routes (not in coach set): none
- routes rendering DIFFERENT from coach: none
- blocked/redirected routes: 0 · same-as-coach captures: 0

## Archetype register (coach baseline — full matrix)

### List

**teams** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 2 el; worst +216px |

**players** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 2 el; worst +136px |

**training** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 14 el; worst +2057px |
| phone-portrait | P1 | wider-than-viewport | 1 el |

### Detail

**team-detail** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | touch<44 | 13× e.g. <button> 34×44 "PRO" · <button> 27×44 "D2" · <button> 27×44 "D3" · <button> 27×44 "D4" |
| phone-portrait | P1 | text-broken-clip | 3 text node(s) clipped w/o ellipsis (broken wrap on stress name) |

**player-stats** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P2 | text-ellipsis | 2 (by-design — verify) |

### Canvas

_no flags._

### Form

_no flags._

### Admin

_no flags._

## Re-run
`JAVA_HOME=… npx playwright test --config playwright.audit-stress.config.js` then `node scripts/audit/build-findings-full.cjs`. Reachability: `audit/REACHABILITY_MAP.md`.
