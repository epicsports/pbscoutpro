# Style Audit — design-system consistency inventory (2026-06-08)

**Type:** read-only discovery (no code/token/doc changes). **Purpose:** find where styles live and where screens deviate
from `theme.js`, to drive a consolidation + phased migration to ONE canonical standard. This is the **migration backlog**,
not a fix. Authored on branch `audit/style-audit` (NOT merged to main).

Method: `theme.js` read in full; ripgrep sweeps over `src/**/*.{js,jsx}` for hex literals, token imports, surface-hex
bypasses, shared-primitive usage; `scripts/lint-ui.js` read for the precommit guard; doc grep for the `#080c14`/`#0a0e17`
drift.

---

## 0. TL;DR for the migration decision
- **Token system is solid and broadly adopted** — `theme.js` has a full 3-layer ladder; **148 files import from it**.
  This is a *consolidation*, not a greenfield.
- **The deviation is residual inline hex, concentrated in a handful of older/canvas-adjacent screens** — **417 hex
  literals across 67 files**; **66 of them are surface-ladder bypasses** (hardcoding `#111827` etc. instead of
  `COLORS.surface`). The top 5 non-canvas offenders hold ~50% of the surface bypasses.
- **The precommit hex-guard is the weak lever** — `lint-ui.js` only warns on the **accent** hexes
  (`#f59e0b/#fbbf24/#d97706`), and only as a **non-blocking WARNING**. Surface/status/text hexes are entirely uncaught.
  Tightening this guard is the durable enforcement for migration.
- **Doc drift resolved (see §2):** the real page bg is **`#0a0e17`** (`theme.js` authority). `#080c14` is a
  **documentation phantom** — it appears in REVIEW_CHECKLIST/BOILERPLATE/DESIGN_DECISIONS but **nowhere in `theme.js` or
  any code**. The docs claiming "`#080c14` NOT `#0a0e17`" are wrong.

---

## 1. `theme.js` ground truth (the authority)

`src/utils/theme.js` — Layer 1 primitives `P` (:4-15) → Layer 2 semantic `COLORS` (:18-65) → tokens.

**Surface / elevation ladder** (`COLORS`, :20-24) — the §27 §2 ladder, deepest→lightest:
| Token | Value | Role |
|---|---|---|
| `COLORS.bg` | `#0a0e17` (`P.gray950`) | **page background** (the real one — NOT `#080c14`) |
| `COLORS.surfaceDark` | `#0f172a` (`P.gray900`) | deepest surface / cards-on-bg |
| `COLORS.surface` | `#111827` | panels |
| `COLORS.surfaceLight` | `#1a2234` | raised panels |
| `COLORS.surfaceHover` | `#1f2b3d` | hover |
| `COLORS.border` | `#2a3548` / `borderLight` `#334155` | borders |

**Brand/status:** `accent #f59e0b` (`accentDim #b47708`), `danger #ef4444`, `success #22c55e`, `bump #f97316`,
`info #3b82f6`, `zeeker #06b6d4`. **Text:** `text #e2e8f0`, `textDim #94a3b8` (AAA), `textMuted #64748b` (AA).
**Light theme** swaps via `setTheme()` (:155-173) → `COLORS` is mutated in place + CSS vars set.

**Scales:** `FONT_SIZE` (:204-212) `xxs10/xs12/sm13/base15/lg17/xl20/xxl24`; `RADIUS` (:214-222)
`xs4/sm6/md10/lg12/xl14/xxl20/full999`; `SPACE` (:224-232) `xs4/sm8/md12/lg16/xl20/xxl24/page16`; `TOUCH` (:235-241)
`minTarget44/targetLg48/chipHeight36/iconBtn40`. `FONT` (:200) = Inter stack.
**Palette:** `COLORS_ZONE_PALETTE` (:86-94) 7 colors, **amber deliberately excluded** (reserved interactive). `TEAM_COLORS`
(:67-72), `ZONE_COLORS` (:75-79), `HEATMAP` schemes (:99-138), `LANE_COLORS` (:185).
**Responsive:** `responsive(deviceType)` (:411-440) returns per-device `font/touch/layout/canvas/modal/icon` packs —
**a second, parallel scale** used by ~the analytics/canvas screens (note: two scales coexist — `FONT_SIZE` constants vs
`responsive().font` — a consolidation candidate).

---

## 2. Doc-drift resolution — `#0a0e17` vs `#080c14`

**Verdict: `#0a0e17` is correct (theme.js authority). `#080c14` is a phantom — never in `theme.js`, never in code.**

- ✅ Correct (`#0a0e17`): `PROJECT_GUIDELINES.md:19,270`, `MOCKUP_GUIDELINES.md:16,93`, `DESIGN_DECISIONS.md:11`.
- ❌ Stale/wrong (`#080c14`, "NOT #0a0e17"): `REVIEW_CHECKLIST.md:18`, `CC_BRIEF_BOILERPLATE.md:13`,
  `DESIGN_DECISIONS.md:586,865,3865`. (`#080c14` is darker than `COLORS.bg`; adopting it literally would put pages
  *below* the token floor.)
- **Reconcile action (later, not now):** correct REVIEW_CHECKLIST §2 + BOILERPLATE + DESIGN_DECISIONS §586/865 to
  `COLORS.bg` / `#0a0e17`; never hardcode either — reference the token.

---

## 3. Hardcoded-hex inventory (token-bypass deviations)

**417 hex literals across 67 files** (`#[0-9a-fA-F]{3,8}`, all of `src/`).

**Canvas / draw layer (computed colors — EXPECTED, audit separately, low priority):** `drawPlayers.js (32)`,
`drawZones.js (24)`, `drawBunkers.js (7)`, `FieldCanvas.jsx (6)`, `InteractiveCanvas.jsx (6)`, `HeatmapCanvas.jsx (5)`,
`HitabilityCanvas.jsx (5)`, `drawStrokes.js (5)`, `ColorPicker.jsx (4)`, `drawAnalytics*.js (3+3)`, `drawCalibration.js
(3)`, `CalibrationView.jsx (3)`, `ReasonRadial.jsx (2)`, `drawLoupe.js (1)`. These compute rgba/gradients per value — not
token-eligible the same way.

**`theme.js` itself: 47** — the source palette, expected.

**Non-canvas worst offenders (the real migration targets):**
| File | hex count | note |
|---|---|---|
| `pages/ScoutedTeamPage.jsx` | **37** | #1 offender — heavy inline palette (see §4 roll-your-own) |
| `pages/MatchPage.jsx` | **22** | scout editor — inline surfaces + status |
| `pages/PlayerStatsPage.jsx` | **19** | hero/stats — inline accent + surfaces |
| `components/QuickLogView.jsx` | **17** | training quick-log — inline surfaces |
| `pages/LayoutDetailPage.jsx` | 12 | immersive tabs (some legit canvas-overlay) |
| `components/PointSummary.jsx` | 12 | |
| `App.jsx` | 12 | (mostly auth/error screens + radial gradients) |
| `components/ui.jsx` | 12 | **shared primitives** — some inline rgba in Card/Modal; acceptable but worth tokenizing |
| `components/TeamBadge.jsx` | 9 | branding (some are data-driven team colors — legit) |

(Mid-tier: `generateInsights.js 7`, `squads.js 6`, `ShotDrawer.jsx 6`, `LivePointTracker.jsx 6`, `PlayerTile.jsx 5`,
`KioskPostSaveSummary.jsx 5`, `KioskLobbyOverlay.jsx 5`.)

---

## 4. Elevation-ladder bypass (§27 §2) — the highest-signal deviation

**66 surface-hex literals across 17 files** hardcode ladder shades instead of the `COLORS.surface*` tokens
(`#0f172a|#111827|#1a2234|#0d1117|#080c14|#0a0e17|#1f2b3d`):

| File | count | |
|---|---|---|
| `pages/ScoutedTeamPage.jsx` | **21** | worst — hardcodes the whole ladder inline |
| `components/QuickLogView.jsx` | **8** | |
| `pages/MatchPage.jsx` | **6** | |
| `pages/PlayerStatsPage.jsx` | **5** | |
| `components/kiosk/KioskPostSaveSummary.jsx` | **4** | incl. `#0d1117` (off-ladder header shade) |
| `components/PointSummary.jsx` / `training/LivePointTracker.jsx` | 3 / 3 | |
| `AppShell.jsx` / `TabBar.jsx` / `KioskLobbyOverlay.jsx` | 2 / 2 / 2 | |
| `FieldCanvas/InteractiveCanvas/LineupStatsSection/KioskWizardHost/ReasonRadial/ShotDrawer/ColdReviewFlow` | 1–2 | |

**Two failure modes:** (a) **token-value-correct but bypassed** — e.g. `#111827` literal == `COLORS.surface` (cosmetically
fine, breaks theming + consistency enforcement); (b) **off-ladder shades** — `#0d1117` (kiosk headers) and `#080c14`
(the phantom) are NOT in the token set → genuine ladder violations. The kiosk overlays + ScoutedTeamPage are where a
shade is most likely reused across layers — **flag for per-screen elevation review at migration** (line-level audit is a
migration step, not this discovery).

---

## 5. Precommit / lint guard — current coverage vs gaps (`scripts/lint-ui.js`)

The UI linter (run in `npm run precommit`) checks: raw HTML controls (`<select>` = **ERROR**; checkbox/range/textarea/
`<input>` = WARNING, :49-73), Polish strings (:78-88), hardcoded `fontFamily` (:92-94), touch targets <36px (:101-109),
sticky-without-zIndex (:119-125), `className` usage (:133-135), header-padding 8px (:128-130).

**Hex coverage gap (the lever):** the ONLY hex rule (:96-98) flags the **accent** hexes `#f59e0b|#fbbf24|#d97706` → "use
COLORS.accent", and only as a **WARNING**. ⇒ **Surface, status, text, and border hexes are entirely uncaught**, and even
the accent rule **doesn't block** (precommit exits non-zero on ERRORS only, :177). This is exactly why 417 hex literals +
66 ladder bypasses coexist with a green precommit.
**Migration lever:** extend the hex rule to flag any non-`theme.js` hex that equals a known token value (auto-fixable →
token) and any off-ladder surface shade; promote to ERROR in migrated dirs via an allowlist that shrinks per batch.

---

## 6. Token-import coverage
**148 files import from `theme.js`** (`from '…theme'`). Against ~67 files containing any hex literal (many of which ALSO
import tokens), the picture is **broad token adoption with residual inline-hex pockets**, not ad-hoc/un-tokenized
screens. So migration = "drain the inline-hex residue + enforce", not "introduce a system."

---

## 7. Shared layout primitives (the "universal stylesheet")

`src/components/ui.jsx` exposes a **comprehensive token-consuming primitive set (31 exports)**:
`Btn, Input, Select, TextArea, Checkbox, Slider, FormField` (controls) · `Card, Modal, ConfirmModal, ActionSheet,
MoreBtn, BottomSheet*, EmptyState, Loading, Skeleton/SkeletonCard/SkeletonList` (containers/states) · `SectionTitle,
SectionLabel, SegmentedControl, SideTag, PlayerChip, Score, ScoreBadge, ResultBadge, LeagueBadge, YearBadge,
DataSourcePill, CoachingStats, SwipeDelete, Icons`. Plus `components/PageHeader.jsx` (shared header/back-nav) and
`components/TabBar.jsx` / `AppShell.jsx` (shell).
(*BottomSheet is a separate `components/BottomSheet.jsx`.)

**Gap = NO shared "Page/Screen shell"** — there is `PageHeader` but no `<Screen>`/`<Page>` wrapper that standardizes
`bg + maxWidth + padding + scroll + safe-area`. Every page hand-rolls that outer `<div style={{minHeight, maxWidth,
margin, padding…}}>` (e.g. `LayoutAnalyticsPage:430`, `HitabilityPage`, `ScoutedTeamPage`). **This is the single most
impactful missing primitive** — a `<Screen>` shell would absorb the page-bg + layout-pad deviations in one move and is
the natural **first reference implementation** (the brief names the Hitability responsive shell for this).

**Roll-your-own re-implementers (confirm per-screen at migration):** the §3/§4 hex hotspots are the prime suspects for
inline equivalents of Card/Header/row — **`ScoutedTeamPage` (37 hex / 21 surface — strongest signal), `MatchPage`,
`PlayerStatsPage`, `QuickLogView`, `PointSummary`**. The kiosk overlays (`KioskPostSaveSummary`/`KioskLobbyOverlay`) roll
their own header chrome (`#0d1117`) instead of `PageHeader` (intentional for full-screen overlays, but off-ladder).

---

## 8. Navigation / header consistency (§27 §6)
**`PageHeader` is used in 35 files** (most routed pages). Back-nav + title/subtitle is standardized there
(`back={{to}}`, title, subtitle). **Non-users (roll their own / intentionally headerless):** `MainPage` (AppShell+TabBar
root), `HitabilityPage` (custom landscape top bar — intentional full-screen module), kiosk overlays (custom chrome),
`LoginPage`/`PbleaguesOnboardingPage`/`PendingApprovalPage` (auth screens), `MatchPage` immersive mode. Consistency is
**good** for standard pages; the drift is the full-screen/immersive surfaces (kiosk, hitability, match-immersive) each
defining their own top bar — acceptable but un-shared. The lint even has a header-padding consistency check (:128-130,
"8px → 10px 16px").

---

## 9. Screen inventory (migration scope)
**`src/pages/`: 41 files** = ~**35 routed pages** + **6 modals/sub-views** (`admin/LeagueFormModal`,
`admin/PlayerFormModal`, `admin/TeamFormModal`, `admin/TeamPickerModal`, `admin/TeamDuplicateResolutionView`,
`admin/ChildrenOrphanWarning`). Routed pages (App.jsx): Login, Main, Teams, TeamDetail, Players, PlayerStats,
ScoutedTeam, Match, Layouts, LayoutDetail, LayoutWizard, LayoutAnalytics, Tactic, BunkerEditor, Ballistics,
Training{Setup,Squads,Results,Redirect}, Hitability, Profile, ScoutRanking, ScoutDetail, ScoutIssues, Members,
UserDetail, PbleaguesOnboarding, PendingApproval, PPT, DebugFlags, admin/{Leagues,Players,Teams,Workspaces,Layouts}.
**Plus ~7 screen-level tab/content components** outside `pages/`: `tabs/{ScoutTabContent,CoachTabContent,
TrainingScoutTab,TrainingCoachTab,TrainingMoreTab,MoreTabContent}`, `QuickLogView`. **≈42 distinct screens** to migrate.

---

## 10. Proposed migration backlog (for Opus/Jacek — NOT executed here)
1. **Reconcile docs** to `theme.js` authority: page bg = `#0a0e17`; kill `#080c14`; add a one-page `DESIGN_STANDARD.md`
   index (start-here → theme.js + REVIEW_CHECKLIST + MOCKUP_GUIDELINES) and reconcile the two parallel scales
   (`FONT_SIZE` vs `responsive().font`).
2. **Build the missing `<Screen>` shell** primitive (bg + maxWidth + padding + scroll + safe-area) → **Hitability =
   first reference implementation** (responsive shell), then roll outward.
3. **Batch-migrate the hex hotspots** worst-first: `ScoutedTeamPage` → `MatchPage` → `PlayerStatsPage` → `QuickLogView`
   → `PointSummary` → kiosk overlays. Replace inline ladder hexes with `COLORS.surface*`; resolve `#0d1117` off-ladder.
4. **Tighten the precommit hex-guard** in lockstep: per-batch allowlist, surface/off-ladder hexes → ERROR in migrated
   dirs (so migrated screens can't regress).
5. **Defer the canvas/draw layer** (computed colors) — separate, lower-priority pass.

**No code, tokens, or docs were changed by this audit.**
