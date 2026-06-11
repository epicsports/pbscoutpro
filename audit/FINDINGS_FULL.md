# Cross-device render audit — FINDINGS_FULL **v2** (wave 2: stress data × 5-role matrix)

> **⛔ v1 of this file (prior git revision) is INVALID — do not triage from it.** v1 was generated
> before the generateInsights `zoneShots` crash was fixed; a hash-only `goto` left a dead React tree,
> so most v1 captures measured the Sentry "Crash Report" fallback as if it were the screen. v2 was
> produced on the fixed code + harness (crash guard, `about:blank` cascade isolation, check #8). The v1
> text is kept in git history only. See `docs/ops/AUDIT_RUNBOOK.md` for the discipline that follows.

_5 roles × 32 routes × 5 viewports = 800 captures. Coach = full baseline; other roles report exclusive + differs-from-coach only. Severity & novelty are SUGGESTIONS — triage = Jacek + Opus._
_Screenshots: `audit/screenshots-full/<role>/<route>__<viewport>.png`. This file REPLACES FINDINGS.md as the living register._

## Run coverage & caveats
- **Captured roles:** coach, super, wsadmin, scout, player.
- **"Disappeared since wave-1" is mostly EXPECTED, not regressions:** wave-1's touch<44 cluster was FIXED (fix/audit-touch-spill, in this branch) and the spill was escalated; wave-2 also uses a different stress fixture (lay-stress w/ fieldImage vs base-demo null). Verify the few non-touch entries; ignore the touch<44 ones.

## Crash / error state (check #8)
- **Crash screens (Sentry "Crash Report" rendered ⇒ FAILED-CONTENT, excluded from layout flags):** 0
- **Captures with console errors but NO crash screen (soft signal — eyeball):** 21
  - coach · profile · phone-portrait: 1×
  - coach · profile · phone-landscape: 1×
  - coach · profile · tablet-portrait: 1×
  - coach · profile · tablet-landscape: 1×
  - coach · profile · desktop: 1×
  - super · main-home · tablet-landscape: 1×
  - wsadmin · profile · phone-portrait: 1×
  - wsadmin · profile · phone-landscape: 1×
  - wsadmin · profile · tablet-portrait: 1×
  - wsadmin · profile · tablet-landscape: 1×
  - wsadmin · profile · desktop: 1×
  - scout · profile · phone-portrait: 1×
  - …+9 more
- **NOTE:** A crash capture is NOT a layout finding. If this count is >0, fix the crash and RE-RUN before trusting any layout numbers below (a dead React tree measures garbage — the wave-1 INVALID lesson).

## Failed / blocked captures (coverage gaps — NOT layout findings)
- **Total FAILED captures:** 0
- These never rendered, so they carry NO geometry flags (excluded from the layout register). Per-route timeouts inside a captured role mean that route is unverified.

## Summary
**By severity:** P0 7 · P1 107 · P2 33

**By novelty:** carried-from-wave1 25 · new-on-stress-data 74 · new-role-specific 48

**Disappeared since wave-1 (SUSPICIOUS — verify the screen, not just the metric):** 72
  - scouts-ranking|phone-portrait|touch<
  - layout-detail|phone-portrait|touch<
  - match-review|phone-portrait|touch<
  - hitability|phone-portrait|touch<
  - scouts-ranking|phone-landscape|touch<
  - match-review|phone-landscape|touch<
  - match-review|phone-landscape|hero<
  - hitability|phone-landscape|touch<
  - scouts-ranking|tablet-portrait|touch<
  - layout-detail|tablet-portrait|touch<
  - match-review|tablet-portrait|touch<
  - hitability|tablet-portrait|touch<
  - main-home|tablet-landscape|touch<
  - teams|tablet-landscape|touch<
  - players|tablet-landscape|touch<
  - layouts|tablet-landscape|touch<
  - scouts-ranking|tablet-landscape|touch<
  - my-issues|tablet-landscape|touch<
  - training|tablet-landscape|touch<
  - members|tablet-landscape|touch<
  - player-stats|tablet-landscape|touch<
  - scout-detail|tablet-landscape|touch<
  - scouted-team|tablet-landscape|touch<
  - training-results|tablet-landscape|touch<
  - user-detail|tablet-landscape|touch<
  - layout-detail|tablet-landscape|off-viewport
  - layout-detail|tablet-landscape|wider-than-viewport
  - layout-detail|tablet-landscape|touch<
  - bunker-editor|tablet-landscape|touch<
  - ballistics|tablet-landscape|touch<
  - layout-analytics|tablet-landscape|touch<
  - match-review|tablet-landscape|touch<
  - match-scout|tablet-landscape|off-viewport
  - match-scout|tablet-landscape|wider-than-viewport
  - match-scout|tablet-landscape|touch<
  - hitability|tablet-landscape|touch<
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
  - player-stats|desktop|touch<
  - scout-detail|desktop|touch<
  - scouted-team|desktop|touch<
  - training-results|desktop|touch<
  - user-detail|desktop|touch<
  - layout-detail|desktop|off-viewport
  - layout-detail|desktop|touch<
  - bunker-editor|desktop|touch<
  - ballistics|desktop|touch<
  - layout-analytics|desktop|touch<
  - match-review|desktop|touch<
  - match-scout|desktop|off-viewport
  - match-scout|desktop|touch<
  - hitability|desktop|touch<
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
| 1 | coach | scouted-team | phone-portrait | 100 | P0 render-error |
| 2 | coach | scouted-team | phone-landscape | 100 | P0 render-error |
| 3 | coach | ballistics | phone-landscape | 100 | P0 hero<95%@phone-ls |
| 4 | coach | scouted-team | tablet-portrait | 100 | P0 render-error |
| 5 | coach | scouted-team | tablet-landscape | 100 | P0 render-error |
| 6 | coach | scouted-team | desktop | 100 | P0 render-error |
| 7 | super | bunker-editor | phone-landscape | 100 | P0 hero<95%@phone-ls |
| 8 | coach | training | phone-portrait | 20 | P1 off-viewport; P1 wider-than-viewport |
| 9 | coach | team-detail | phone-portrait | 20 | P1 touch<44; P1 text-broken-clip |
| 10 | coach | layout-detail | phone-portrait | 20 | P1 off-viewport; P1 wider-than-viewport |

## Systemic patterns (coach baseline)

- **List** · `off-viewport` × 4 routes (teams, players, training, main-home)
- **Canvas** · `off-viewport` × 3 routes (layout-detail, ballistics, match-scout)
- **Canvas** · `wider-than-viewport` × 3 routes (layout-detail, ballistics, match-scout)
- **Canvas** · `hero` × 6 routes (layout-detail, ballistics, layout-analytics, match-review, match-scout, hitability)
- **Admin** · `off-viewport` × 5 routes (admin-leagues, admin-players, admin-teams, admin-workspaces, admin-layouts)
- **Admin** · `wider-than-viewport` × 5 routes (admin-leagues, admin-players, admin-teams, admin-workspaces, admin-layouts)

## Per-role (vs coach baseline)

### super
- exclusive routes (not in coach set): none
- routes rendering DIFFERENT from coach: players, user-detail, bunker-editor, layout-wizard, admin-leagues, admin-players, admin-teams, admin-workspaces, admin-layouts
- blocked/redirected routes: 2 · same-as-coach captures: 105
- flags on exclusive/differing screens:
  - players phone-portrait: P1 off-viewport — 2 el; worst +136px
  - players phone-portrait: P1 touch<44 — 48× e.g. <button> 42×34 "" · <button> 42×34 "" · <button> 42×34 "" · <button> 42×34 ""
  - bunker-editor phone-portrait: P1 off-viewport — 1 el; worst +705px
  - bunker-editor phone-portrait: P1 wider-than-viewport — 1 el
  - admin-leagues phone-portrait: P1 touch<44 — 1× e.g. <button> 40×44 "All"
  - admin-players phone-portrait: P1 touch<44 — 1× e.g. <button> 40×44 "All"
  - admin-players phone-portrait: P2 text-ellipsis — 1 (by-design — verify)
  - admin-teams phone-portrait: P1 touch<44 — 1× e.g. <button> 40×44 "All"
  - admin-teams phone-portrait: P2 text-ellipsis — 1 (by-design — verify)
  - players phone-landscape: P1 touch<44 — 48× e.g. <button> 42×32 "" · <button> 42×32 "" · <button> 42×32 "" · <button> 42×32 ""
  - bunker-editor phone-landscape: P0 hero<95%@phone-ls — 63%
  - admin-leagues phone-landscape: P1 touch<44 — 1× e.g. <button> 42×44 "All"
  - admin-players phone-landscape: P1 touch<44 — 1× e.g. <button> 42×44 "All"
  - admin-teams phone-landscape: P1 touch<44 — 1× e.g. <button> 42×44 "All"
  - players tablet-portrait: P1 touch<44 — 48× e.g. <button> 42×32 "" · <button> 42×32 "" · <button> 42×32 "" · <button> 42×32 ""
  - bunker-editor tablet-portrait: P1 off-viewport — 1 el; worst +854px
  - bunker-editor tablet-portrait: P1 wider-than-viewport — 1 el
  - admin-leagues tablet-portrait: P1 touch<44 — 1× e.g. <button> 42×44 "All"
  - admin-players tablet-portrait: P1 touch<44 — 1× e.g. <button> 42×44 "All"
  - admin-teams tablet-portrait: P1 touch<44 — 1× e.g. <button> 42×44 "All"
  - players tablet-landscape: P1 touch<44 — 48× e.g. <button> 38×28 "" · <button> 38×28 "" · <button> 38×28 "" · <button> 38×28 ""
  - bunker-editor tablet-landscape: P2 hero 81%@tablet-landscape — geometry (sanctioned)
  - admin-leagues tablet-landscape: P1 touch<44 — 1× e.g. <button> 36×44 "All"
  - admin-players tablet-landscape: P1 touch<44 — 1× e.g. <button> 36×44 "All"
  - admin-teams tablet-landscape: P1 touch<44 — 1× e.g. <button> 36×44 "All"
  - players desktop: P1 touch<44 — 48× e.g. <button> 38×28 "" · <button> 38×28 "" · <button> 38×28 "" · <button> 38×28 ""
  - bunker-editor desktop: P2 hero 85%@desktop — geometry (sanctioned)
  - admin-leagues desktop: P1 touch<44 — 1× e.g. <button> 36×44 "All"
  - admin-players desktop: P1 touch<44 — 1× e.g. <button> 36×44 "All"
  - admin-teams desktop: P1 touch<44 — 1× e.g. <button> 36×44 "All"

### wsadmin
- exclusive routes (not in coach set): none
- routes rendering DIFFERENT from coach: user-detail
- blocked/redirected routes: 7 · same-as-coach captures: 120

### scout
- exclusive routes (not in coach set): none
- routes rendering DIFFERENT from coach: main-home, ppt-log
- blocked/redirected routes: 14 · same-as-coach captures: 80
- flags on exclusive/differing screens:
  - ppt-log phone-portrait: P2 text-ellipsis — 3 (by-design — verify)
  - main-home phone-landscape: P1 off-viewport — 10 el; worst +1515px
  - main-home tablet-portrait: P1 off-viewport — 11 el; worst +1613px
  - main-home tablet-landscape: P1 off-viewport — 8 el; worst +1253px
  - main-home desktop: P1 off-viewport — 3 el; worst +527px

### player
- exclusive routes (not in coach set): none
- routes rendering DIFFERENT from coach: main-home, player-stats, scouted-team, profile, ppt-log, ppt-wizard
- blocked/redirected routes: 18 · same-as-coach captures: 45
- flags on exclusive/differing screens:
  - main-home phone-portrait: P2 text-ellipsis — 3 (by-design — verify)
  - player-stats phone-portrait: P2 text-ellipsis — 2 (by-design — verify)
  - profile phone-portrait: P1 text-broken-clip — 1 text node(s) clipped w/o ellipsis (broken wrap on stress name)
  - profile phone-portrait: P2 console-error — 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro
  - ppt-log phone-portrait: P2 text-ellipsis — 3 (by-design — verify)
  - profile phone-landscape: P1 text-broken-clip — 1 text node(s) clipped w/o ellipsis (broken wrap on stress name)
  - profile phone-landscape: P2 console-error — 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro
  - profile tablet-portrait: P1 text-broken-clip — 1 text node(s) clipped w/o ellipsis (broken wrap on stress name)
  - profile tablet-portrait: P2 console-error — 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro
  - profile tablet-landscape: P1 text-broken-clip — 1 text node(s) clipped w/o ellipsis (broken wrap on stress name)
  - profile tablet-landscape: P2 console-error — 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro
  - profile desktop: P1 text-broken-clip — 1 text node(s) clipped w/o ellipsis (broken wrap on stress name)
  - profile desktop: P2 console-error — 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro

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
| phone-landscape | P1 | off-viewport | 10 el; worst +1515px |
| tablet-portrait | P1 | off-viewport | 11 el; worst +1613px |
| tablet-landscape | P1 | off-viewport | 8 el; worst +1253px |
| desktop | P1 | off-viewport | 3 el; worst +527px |

**main-home** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-landscape | P1 | off-viewport | 10 el; worst +1515px |
| tablet-portrait | P1 | off-viewport | 11 el; worst +1613px |
| tablet-landscape | P1 | off-viewport | 8 el; worst +1253px |
| desktop | P1 | off-viewport | 3 el; worst +527px |

### Detail

**team-detail** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | touch<44 | 13× e.g. <button> 34×44 "PRO" · <button> 27×44 "D2" · <button> 27×44 "D3" · <button> 27×44 "D4" |
| phone-portrait | P1 | text-broken-clip | 3 text node(s) clipped w/o ellipsis (broken wrap on stress name) |
| phone-landscape | P1 | touch<44 | 13× e.g. <button> 34×44 "PRO" · <button> 27×44 "D2" · <button> 27×44 "D3" · <button> 27×44 "D4" |
| tablet-portrait | P1 | touch<44 | 13× e.g. <button> 34×44 "PRO" · <button> 27×44 "D2" · <button> 27×44 "D3" · <button> 27×44 "D4" |
| tablet-landscape | P1 | touch<44 | 13× e.g. <button> 34×44 "PRO" · <button> 27×44 "D2" · <button> 27×44 "D3" · <button> 27×44 "D4" |
| desktop | P1 | touch<44 | 13× e.g. <button> 34×44 "PRO" · <button> 27×44 "D2" · <button> 27×44 "D3" · <button> 27×44 "D4" |

**player-stats** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P2 | text-ellipsis | 2 (by-design — verify) |

**scouted-team** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P0 | render-error | hard-timeout 55000ms (coach · phone-portrait · scouted-team) |
| phone-landscape | P0 | render-error | hard-timeout 55000ms (coach · phone-landscape · scouted-team) |
| tablet-portrait | P0 | render-error | hard-timeout 55000ms (coach · tablet-portrait · scouted-team) |
| tablet-landscape | P0 | render-error | hard-timeout 55000ms (coach · tablet-landscape · scouted-team) |
| desktop | P0 | render-error | hard-timeout 55000ms (coach · desktop · scouted-team) |

### Canvas

**layout-detail** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 1 el; worst +641px |
| phone-portrait | P1 | wider-than-viewport | 1 el |
| phone-landscape | P1 | touch<44 | 1× e.g. <button> 31×44 "⋮" |
| tablet-portrait | P1 | off-viewport | 1 el; worst +790px |
| tablet-portrait | P1 | wider-than-viewport | 1 el |
| tablet-landscape | P2 | hero 76%@tablet-landscape | geometry (sanctioned) |
| desktop | P2 | hero 81%@desktop | geometry (sanctioned) |

**ballistics** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 1 el; worst +737px |
| phone-portrait | P1 | wider-than-viewport | 1 el |
| phone-landscape | P0 | hero<95%@phone-ls | 67% |
| tablet-portrait | P1 | off-viewport | 1 el; worst +886px |
| tablet-portrait | P1 | wider-than-viewport | 1 el |
| tablet-landscape | P2 | hero 83%@tablet-landscape | geometry (sanctioned) |
| desktop | P2 | hero 87%@desktop | geometry (sanctioned) |

**match-review** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P2 | text-ellipsis | 4 (by-design — verify) |
| tablet-landscape | P2 | hero 89%@tablet-landscape | geometry (sanctioned) |
| desktop | P2 | hero 69%@desktop | geometry (sanctioned) |

**match-scout** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 2 el; worst +673px |
| phone-portrait | P1 | wider-than-viewport | 2 el |
| phone-landscape | P1 | touch<44 | 1× e.g. <div> 81×36 "Rysuj" |
| tablet-portrait | P1 | off-viewport | 2 el; worst +822px |
| tablet-portrait | P1 | wider-than-viewport | 2 el |
| tablet-landscape | P2 | hero 78%@tablet-landscape | geometry (sanctioned) |
| desktop | P2 | hero 83%@desktop | geometry (sanctioned) |

**layout-analytics** ``

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P2 | hero 87%@tablet-landscape | geometry (sanctioned) |
| desktop | P2 | hero 68%@desktop | geometry (sanctioned) |

**hitability** ``

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P2 | hero 68%@tablet-landscape | geometry (sanctioned) |
| desktop | P2 | hero 94%@desktop | geometry (sanctioned) |

### Form

**training-setup** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 14 el; worst +2057px |
| phone-portrait | P1 | wider-than-viewport | 1 el |
| phone-landscape | P1 | off-viewport | 10 el; worst +1515px |
| tablet-portrait | P1 | off-viewport | 11 el; worst +1613px |
| tablet-landscape | P1 | off-viewport | 8 el; worst +1253px |
| desktop | P1 | off-viewport | 3 el; worst +527px |

**profile** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | text-broken-clip | 1 text node(s) clipped w/o ellipsis (broken wrap on stress name) |
| phone-portrait | P2 | console-error | 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro |
| phone-landscape | P1 | text-broken-clip | 1 text node(s) clipped w/o ellipsis (broken wrap on stress name) |
| phone-landscape | P2 | console-error | 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro |
| tablet-portrait | P1 | text-broken-clip | 1 text node(s) clipped w/o ellipsis (broken wrap on stress name) |
| tablet-portrait | P2 | console-error | 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro |
| tablet-landscape | P1 | text-broken-clip | 1 text node(s) clipped w/o ellipsis (broken wrap on stress name) |
| tablet-landscape | P2 | console-error | 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro |
| desktop | P1 | text-broken-clip | 1 text node(s) clipped w/o ellipsis (broken wrap on stress name) |
| desktop | P2 | console-error | 1× e.g. useUserWorkspaces query failed: FirebaseError: 
Null value error. for 'list' @ L231, Null value erro |

**ppt-log** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P2 | text-ellipsis | 3 (by-design — verify) |

### Admin

**admin-leagues** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 14 el; worst +2057px |
| phone-portrait | P1 | wider-than-viewport | 1 el |
| phone-landscape | P1 | off-viewport | 10 el; worst +1515px |
| tablet-portrait | P1 | off-viewport | 11 el; worst +1613px |
| tablet-landscape | P1 | off-viewport | 8 el; worst +1253px |
| desktop | P1 | off-viewport | 3 el; worst +527px |

**admin-players** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 14 el; worst +2057px |
| phone-portrait | P1 | wider-than-viewport | 1 el |
| phone-landscape | P1 | off-viewport | 10 el; worst +1515px |
| tablet-portrait | P1 | off-viewport | 11 el; worst +1613px |
| tablet-landscape | P1 | off-viewport | 8 el; worst +1253px |
| desktop | P1 | off-viewport | 3 el; worst +527px |

**admin-teams** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 14 el; worst +2057px |
| phone-portrait | P1 | wider-than-viewport | 1 el |
| phone-landscape | P1 | off-viewport | 10 el; worst +1515px |
| tablet-portrait | P1 | off-viewport | 11 el; worst +1613px |
| tablet-landscape | P1 | off-viewport | 8 el; worst +1253px |
| desktop | P1 | off-viewport | 3 el; worst +527px |

**admin-workspaces** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 14 el; worst +2057px |
| phone-portrait | P1 | wider-than-viewport | 1 el |
| phone-landscape | P1 | off-viewport | 10 el; worst +1515px |
| tablet-portrait | P1 | off-viewport | 11 el; worst +1613px |
| tablet-landscape | P1 | off-viewport | 8 el; worst +1253px |
| desktop | P1 | off-viewport | 3 el; worst +527px |

**admin-layouts** ``

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 14 el; worst +2057px |
| phone-portrait | P1 | wider-than-viewport | 1 el |
| phone-landscape | P1 | off-viewport | 10 el; worst +1515px |
| tablet-portrait | P1 | off-viewport | 11 el; worst +1613px |
| tablet-landscape | P1 | off-viewport | 8 el; worst +1253px |
| desktop | P1 | off-viewport | 3 el; worst +527px |

## Re-run
`JAVA_HOME=… npx playwright test --config playwright.audit-stress.config.js` then `node scripts/audit/build-findings-full.cjs`. Reachability: `audit/REACHABILITY_MAP.md`.
