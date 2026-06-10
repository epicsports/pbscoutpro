# Cross-device render audit — FINDINGS

_Generated from `audit/findings.json` · 28 routes × 5 viewports = 140 screenshots._
_Severity is a SUGGESTION — final triage = Jacek + Opus. Screenshots: `audit/screenshots/<route>__<viewport>.png`._

## Summary
- **P0 (broken/unusable):** 1
- **P1 (ugly/wasteful but usable):** 92
- **P2 (polish / informational):** 16

**Baseline calibration:** ✅ HitabilityPage @phone-landscape = 100% (≥95% — harness calibrated)

**Viewport matrix:** phone-portrait 390×844 · phone-landscape 932×430 · tablet-portrait 834×1194 · tablet-landscape 1194×834 · desktop 1920×1080

## 10 worst screens

| # | route | viewport | score | flags |
|---|---|---|---|---|
| 1 | match-review | phone-landscape | 110 | P1 touch<44; P0 hero<95%@phone-ls |
| 2 | layout-detail | tablet-landscape | 31 | P1 off-viewport; P1 wider-than-viewport; P1 touch<44; P2 hero 76%@tablet-landscape |
| 3 | match-scout | tablet-landscape | 31 | P1 off-viewport; P1 wider-than-viewport; P1 touch<44; P2 hero 78%@tablet-landscape |
| 4 | layout-detail | phone-portrait | 30 | P1 off-viewport; P1 wider-than-viewport; P1 touch<44 |
| 5 | layout-detail | tablet-portrait | 30 | P1 off-viewport; P1 wider-than-viewport; P1 touch<44 |
| 6 | layout-detail | desktop | 21 | P1 off-viewport; P1 touch<44; P2 hero 81%@desktop |
| 7 | match-scout | desktop | 21 | P1 off-viewport; P1 touch<44; P2 hero 83%@desktop |
| 8 | match-scout | phone-portrait | 20 | P1 off-viewport; P1 wider-than-viewport |
| 9 | match-scout | tablet-portrait | 20 | P1 off-viewport; P1 wider-than-viewport |
| 10 | bunker-editor | tablet-landscape | 20 | P1 touch<44; P1 no-canvas |

## Systemic patterns (one fix → many screens)

- **List** · `touch<44` hits 8 routes (scouts-ranking, main-home, teams, players, layouts, my-issues…) — likely ONE archetype-level fix.
- **Detail** · `touch<44` hits 6 routes (team-detail, player-stats, scout-detail, scouted-team, training-results, user-detail) — likely ONE archetype-level fix.
- **Canvas** · `touch<44` hits 7 routes (layout-detail, match-review, hitability, match-scout, bunker-editor, ballistics…) — likely ONE archetype-level fix.
- **Canvas** · `hero` hits 5 routes (layout-detail, ballistics, match-review, match-scout, hitability) — likely ONE archetype-level fix.
- **Form** · `touch<44` hits 7 routes (layout-wizard, training-setup, training-squads, profile, debug-flags, ppt-log…) — likely ONE archetype-level fix.

## Register — by archetype → route → viewport

### List

**scouts-ranking** `#/scouts`

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | touch<44 | 3 interactive <44px — e.g. <button> 74×36 "Globalny" · <button> 82×36 "Ten layout" · <button> 84×36 "Ten turniej" |
| phone-landscape | P1 | touch<44 | 3 interactive <44px — e.g. <button> 78×36 "Globalny" · <button> 87×36 "Ten layout" · <button> 88×36 "Ten turniej" |
| tablet-portrait | P1 | touch<44 | 3 interactive <44px — e.g. <button> 78×36 "Globalny" · <button> 87×36 "Ten layout" · <button> 88×36 "Ten turniej" |
| tablet-landscape | P1 | touch<44 | 5 interactive <44px — e.g. <button> 70×30 "Globalny" · <button> 78×30 "Ten layout" · <button> 80×30 "Ten turniej" · <button> 155×36 "Zrobię to później" |
| desktop | P1 | touch<44 | 5 interactive <44px — e.g. <button> 70×30 "Globalny" · <button> 78×30 "Ten layout" · <button> 80×30 "Ten turniej" · <button> 155×36 "Zrobię to później" |

**main-home** `#/`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**teams** `#/teams`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 4 interactive <44px — e.g. <button> 89×36 "Team" · <input> 1146×36 "" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 4 interactive <44px — e.g. <button> 89×36 "Team" · <input> 1152×36 "" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**players** `#/players`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 5 interactive <44px — e.g. <button> 63×36 "📋 CSV" · <button> 94×36 "Player" · <input> 1146×36 "" · <button> 155×36 "Zrobię to później" |
| desktop | P1 | touch<44 | 5 interactive <44px — e.g. <button> 63×36 "📋 CSV" · <button> 94×36 "Player" · <input> 1152×36 "" · <button> 155×36 "Zrobię to później" |

**layouts** `#/layouts`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 3 interactive <44px — e.g. <button> 1146×36 "Browse library" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 3 interactive <44px — e.g. <button> 1152×36 "Browse library" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**my-issues** `#/my-issues`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**training** `#/training/trn-demo`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**members** `#/settings/members`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

### Detail

**team-detail** `#/team/team-a`

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | touch<44 | 20 interactive <44px — e.g. <button> 49×36 "NXL" · <button> 48×36 "DPL" · <button> 46×36 "PXL" · <button> 34×44 "PRO" |
| phone-landscape | P1 | touch<44 | 20 interactive <44px — e.g. <button> 50×36 "NXL" · <button> 49×36 "DPL" · <button> 48×36 "PXL" · <button> 34×44 "PRO" |
| tablet-portrait | P1 | touch<44 | 20 interactive <44px — e.g. <button> 50×36 "NXL" · <button> 49×36 "DPL" · <button> 48×36 "PXL" · <button> 34×44 "PRO" |
| tablet-landscape | P1 | touch<44 | 25 interactive <44px — e.g. <input> 1146×36 "" · <input> 1094×36 "" · <input> 1146×36 "" · <button> 45×30 "NXL" |
| desktop | P1 | touch<44 | 25 interactive <44px — e.g. <input> 1152×36 "" · <input> 1100×36 "" · <input> 1152×36 "" · <button> 45×30 "NXL" |

**player-stats** `#/player/pa1/stats`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 3 interactive <44px — e.g. <button> 142×36 "Load all-time stat" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 3 interactive <44px — e.g. <button> 142×36 "Load all-time stat" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**scout-detail** `#/scouts/test-coach`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**scouted-team** `#/tournament/trn-demo/team/team-a`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**training-results** `#/training/trn-demo/results`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**user-detail** `#/settings/members/test-coach`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 3 interactive <44px — e.g. <button> 135×36 "Połącz z profilem" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 3 interactive <44px — e.g. <button> 135×36 "Połącz z profilem" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

### Canvas

**layout-detail** `#/layout/base-demo`

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 1 element(s) spill right; worst +899px |
| phone-portrait | P1 | wider-than-viewport | 1 element(s) wider than viewport (fixed-width smell) |
| phone-portrait | P1 | touch<44 | 1 interactive <44px — e.g. <button> 80×36 "New" |
| phone-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 61×36 "‹ Back" · <button> 31×36 "⋮" |
| tablet-portrait | P1 | off-viewport | 1 element(s) spill right; worst +1188px |
| tablet-portrait | P1 | wider-than-viewport | 1 element(s) wider than viewport (fixed-width smell) |
| tablet-portrait | P1 | touch<44 | 1 interactive <44px — e.g. <button> 80×36 "New" |
| tablet-landscape | P1 | off-viewport | 1 element(s) spill right; worst +75px |
| tablet-landscape | P1 | wider-than-viewport | 1 element(s) wider than viewport (fixed-width smell) |
| tablet-landscape | P1 | touch<44 | 3 interactive <44px — e.g. <button> 80×32 "New" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| tablet-landscape | P2 | hero 76%@tablet-landscape | field 76% height — side-rail/aspect geometry (sanctioned edge case), informational |
| desktop | P1 | off-viewport | 1 element(s) spill right; worst +201px |
| desktop | P1 | touch<44 | 3 interactive <44px — e.g. <button> 80×32 "New" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P2 | hero 81%@desktop | field 81% height — side-rail/aspect geometry (sanctioned edge case), informational |

**match-review** `#/tournament/trn-demo/match/mat-demo`

| viewport | sev | check | detail |
|---|---|---|---|
| phone-landscape | P0 | hero<95%@phone-ls | field 89% of viewport height (hero-rule violation on a phone) |
| phone-landscape | P1 | touch<44 | 4 interactive <44px — e.g. <button> 147×36 "Pozycje" · <button> 147×36 "Strzały" · <button> 147×36 "Pozycje" · <button> 147×36 "Strzały" |
| phone-portrait | P1 | touch<44 | 4 interactive <44px — e.g. <button> 56×36 "Pozycje" · <button> 56×36 "Strzały" · <button> 56×36 "Pozycje" · <button> 56×36 "Strzały" |
| phone-portrait | P2 | text-clip | 4 leaf text node(s) scrollWidth>clientWidth (often intentional ellipsis — verify) |
| tablet-portrait | P1 | touch<44 | 4 interactive <44px — e.g. <button> 147×36 "Pozycje" · <button> 147×36 "Strzały" · <button> 147×36 "Pozycje" · <button> 147×36 "Strzały" |
| tablet-landscape | P1 | touch<44 | 6 interactive <44px — e.g. <button> 251×36 "Pozycje" · <button> 251×36 "Strzały" · <button> 251×36 "Pozycje" · <button> 251×36 "Strzały" |
| tablet-landscape | P2 | hero 72%@tablet-landscape | field 72% height — side-rail/aspect geometry (sanctioned edge case), informational |
| desktop | P1 | touch<44 | 6 interactive <44px — e.g. <button> 253×36 "Pozycje" · <button> 253×36 "Strzały" · <button> 253×36 "Pozycje" · <button> 253×36 "Strzały" |
| desktop | P2 | hero 56%@desktop | field 56% height — side-rail/aspect geometry (sanctioned edge case), informational |

**match-scout** `#/tournament/trn-demo/match/mat-demo?scout=team-a&mode=new`

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | off-viewport | 2 element(s) spill right; worst +939px |
| phone-portrait | P1 | wider-than-viewport | 2 element(s) wider than viewport (fixed-width smell) |
| phone-landscape | P1 | touch<44 | 3 interactive <44px — e.g. <button> 61×36 "‹ Back" · <button> 84×39 "✓ Save" · <div> 81×36 "Rysuj" |
| tablet-portrait | P1 | off-viewport | 2 element(s) spill right; worst +1228px |
| tablet-portrait | P1 | wider-than-viewport | 2 element(s) wider than viewport (fixed-width smell) |
| tablet-landscape | P1 | off-viewport | 2 element(s) spill right; worst +115px |
| tablet-landscape | P1 | wider-than-viewport | 2 element(s) wider than viewport (fixed-width smell) |
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| tablet-landscape | P2 | hero 78%@tablet-landscape | field 78% height — side-rail/aspect geometry (sanctioned edge case), informational |
| desktop | P1 | off-viewport | 2 element(s) spill right; worst +241px |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P2 | hero 83%@desktop | field 83% height — side-rail/aspect geometry (sanctioned edge case), informational |

**hitability** `#/training/trn-hit/hitability`

| viewport | sev | check | detail |
|---|---|---|---|
| phone-portrait | P1 | touch<44 | 1 interactive <44px — e.g. <div> 28×28 "×" |
| phone-landscape | P1 | touch<44 | 1 interactive <44px — e.g. <div> 28×28 "×" |
| tablet-portrait | P1 | touch<44 | 1 interactive <44px — e.g. <div> 28×28 "×" |
| tablet-landscape | P1 | touch<44 | 3 interactive <44px — e.g. <div> 28×28 "×" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| tablet-landscape | P2 | hero 68%@tablet-landscape | field 68% height — side-rail/aspect geometry (sanctioned edge case), informational |
| desktop | P1 | touch<44 | 3 interactive <44px — e.g. <div> 28×28 "×" · <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P2 | hero 94%@desktop | field 94% height — side-rail/aspect geometry (sanctioned edge case), informational |

**bunker-editor** `#/layout/base-demo/bunkers`

| viewport | sev | check | detail |
|---|---|---|---|
| phone-landscape | P1 | no-canvas | canvas screen rendered no <canvas> in landscape (did it activate the shell?) |
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| tablet-landscape | P1 | no-canvas | canvas screen rendered no <canvas> in landscape (did it activate the shell?) |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | no-canvas | canvas screen rendered no <canvas> in landscape (did it activate the shell?) |

**layout-analytics** `#/layout/base-demo/analytics/deaths`

| viewport | sev | check | detail |
|---|---|---|---|
| phone-landscape | P1 | no-canvas | canvas screen rendered no <canvas> in landscape (did it activate the shell?) |
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| tablet-landscape | P1 | no-canvas | canvas screen rendered no <canvas> in landscape (did it activate the shell?) |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | no-canvas | canvas screen rendered no <canvas> in landscape (did it activate the shell?) |

**ballistics** `#/layout/base-demo/ballistics`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| tablet-landscape | P2 | hero 60%@tablet-landscape | field 60% height — side-rail/aspect geometry (sanctioned edge case), informational |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P2 | hero 46%@desktop | field 46% height — side-rail/aspect geometry (sanctioned edge case), informational |

### Form

**profile** `#/profile`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 5 interactive <44px — e.g. <input> 1136×36 "" · <button> 71×36 "Zapisz" · <button> 1136×36 "Połącz profil żeby" · <button> 155×36 "Zrobię to później" |
| tablet-landscape | P2 | text-clip | 1 leaf text node(s) scrollWidth>clientWidth (often intentional ellipsis — verify) |
| desktop | P1 | touch<44 | 5 interactive <44px — e.g. <input> 1862×36 "" · <button> 71×36 "Zapisz" · <button> 1862×36 "Połącz profil żeby" · <button> 155×36 "Zrobię to później" |
| desktop | P2 | text-clip | 1 leaf text node(s) scrollWidth>clientWidth (often intentional ellipsis — verify) |
| phone-portrait | P2 | text-clip | 1 leaf text node(s) scrollWidth>clientWidth (often intentional ellipsis — verify) |
| phone-landscape | P2 | text-clip | 1 leaf text node(s) scrollWidth>clientWidth (often intentional ellipsis — verify) |
| tablet-portrait | P2 | text-clip | 1 leaf text node(s) scrollWidth>clientWidth (often intentional ellipsis — verify) |

**layout-wizard** `#/layout/new`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**training-setup** `#/training/trn-demo/setup`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**training-squads** `#/training/trn-demo/squads`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**debug-flags** `#/debug/flags`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**ppt-log** `#/player/log`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

**ppt-wizard** `#/player/log/wizard`

| viewport | sev | check | detail |
|---|---|---|---|
| tablet-landscape | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |
| desktop | P1 | touch<44 | 2 interactive <44px — e.g. <button> 155×36 "Zrobię to później" · <button> 275×36 "Przejdź do ustawie" |

## Exclusions (not in the matrix run)
- **super_admin-only:** `/admin/leagues` `/admin/players` `/admin/teams` `/admin/workspaces` `/admin/layouts` — need the SUPER_ACCOUNT + their own data; run as a separate super pass if wanted.
- **not-seeded params:** TacticPage (`/…/tactic/:tacticId` — no tactic seeded) · training-matchup MatchPage (`/training/:t/matchup/:m` — no matchup seeded). MatchPage canvas archetype IS covered via match-review / match-scout.
- **Kiosk:** an in-flow overlay (post-save / lobby), not a standalone route.

## Check legend
1 h-scroll · 2 off-viewport/wider-than-viewport · 3 touch<44 (§27) · 4 text-clip (P2, ellipsis-noisy) · 5 canvas hero<95% in landscape (P0 only @phone-landscape; tablet/desktop = sanctioned geometry, P2) · 6 fixed-width>viewport (=wider-than-viewport) · 7 bg≠token (`rgb(10, 14, 23)`).
