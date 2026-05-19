# Session Handover — PbScoutPro

> **Purpose:** Living state-of-the-project for Opus chats (architect / strategy sessions). Read this before drafting any CC brief or making decisions about direction.

**Last updated:** 2026-05-19 by Opus (post Phase 0 — consolidation pass, no deploy)
**Live app:** https://epicsports.github.io/pbscoutpro
**Repo:** https://github.com/epicsports/pbscoutpro
**Main HEAD at last update:** pending

---

## 🚧 Currently in flight

**Both tracks through Phase 0 — discovery complete, awaiting architecture rozkmina sessions:**

**Track A — Canvas Architecture audit.** Phase 0 done (commit added today). All ❓ resolved, 🟡 verified in `docs/architecture/CANVAS_ARCHITECTURE.md`. Critical finding: HeatmapCanvas has zero gesture support — landscape coach view cannot be a simple toggle, requires gesture migration. Next: Opus + Jacek rozkmina session — canvas Etap 4 (A vs B component model) using Phase 0 § 5.3/5.4 + `PHASE_0_DISCOVERY_FINDINGS.md` as evidence base.

**Track B — Multi-Tenant Architecture § 63.** Phase 0 done. All "Open questions for CC discovery" subsections answered. Key findings:
- § 63.3: **zero consumers** of `users/{uid}.workspaces` in src/. Option (a) breaking change cost ~zero — radically changes rozkmina #1 calculus
- § 63.5: project on Spark plan, Blaze upgrade needed before Phase 5 (Cloud Functions)
- § 63.7: NewTournamentModal already has 3-type selector with sparing implemented — Wizard refactor is rename+extract, not greenfield
- § 63.11: teams + players workspace-scoped; PBLI per-workspace with `pbliId` as ready-made bridge to global identity
- No fundamental wrong assumptions found; findings refine and strengthen migration story

Next: Opus + Jacek rozkmina session — § 63.3 schema a/b/c decision using Phase 0 Findings as evidence base.

**Parallel tracks unblocked after both rozkminy:** write `MULTI_TENANT_MIGRATION_PLAN.md` + canvas refactor briefs.

---

## 🚢 Recently shipped (last ~10 days)

> **Source-of-truth caveat:** Opus does not have direct repo access this session. The following are reconstructed from memory + earlier deploy logs. **CC: please verify against `DEPLOY_LOG.md` and patch missing entries when updating this file.**

| Date | Branch / commit | Summary |
|---|---|---|
| 2026-05-15 | `15ae8e2` (merge) · branch `fix/heatmap-density-removal` · 1 commit (`acdcc00`) | **§ 62 — Heatmap density removal + stroked markers (NXL Czechy day 1).** Player position heatmaps (coach team summary § 28/§ 60 + match review § 21) — radial density blob layer removed entirely. `drawDot` + `drawTriangle` now take separate `fillColor` + `strokeColor`; both render solid team fill at alpha 1 + 2 px stroke for shape separation on overlap. Team A green family (`COLORS.success` + `COLORS.successDim`), Team B teal fill (`COLORS.zeeker`) + neutral dark stroke (`COLORS.surfaceDark`) because no dark-teal token exists in the palette and Jacek explicitly forbade adding new tokens. Marker radii unchanged. § 25 HERO amber halo preserved as outermost layer. Bump density + shot density untouched (different signal). Eliminated markers untouched (§ 31 X stays). Deaths heatmap (§ 61) on different canvas, untouched. Live scouting markers (FieldCanvas + drawPlayers.js) untouched — different visual class. § 62 appended to DESIGN_DECISIONS with full rule set + out-of-scope list. Density was actively hiding the circle (gun-up) vs triangle (runner) encoding when markers stacked on the same bunker — cluster size already conveys density by stacking, blob was redundant. |
| 2026-05-15 | `e0e3e6b` (merge) · branch `fix/schedule-import-scouted-division` · 1 commit (`859e9ef`) | **Schedule import scouted-division repair + source fix (NXL Czechy day 1).** Coach tab Teams empty for NXL Czechy because schedule import (ScheduleCSVImport Pass 0 / match / create branches + OCR ScheduleImport ensure-scouted loop) called `addScoutedTeam` without `division` → null landed in Firestore → CoachTabContent's client-side division filter (`tournament.divisions[0]` default) excluded everything. Jacek's initial hypothesis "Pass 0 silently failed" disproved by code analysis (no `deleteScoutedTeam` exists; matches existing proves scouted creates succeeded). Wrong-shape, not missing. Source fix at all four call sites + per-team try/catch with success/failure counts in import log. Repair surface: `dataService.repairScoutedDivisionsForTournament(tid, league)` UPDATES null-division rows from `team.divisions[league]` (no creates → zero duplicate risk), idempotent. UI affordance is a self-gated Btn in CoachTabContent that renders only when `scouted.length > 0 && divisionScouted.length === 0` and vanishes after onSnapshot settles. Diagnostic walkthrough in chat 2026-05-15 — 4-item discovery (path, shape, Pass 0 code, Coach query) plus disproof of the deletion-was-the-cause path. |
| 2026-05-15 | `3b236cf` (merge) · branch `fix/multi-device-overwrite` · 1 commit (`2f696f5`) | **Multi-device point-overwrite hotfix (NXL Czechy day 1).** Per-coach point stream used deterministic doc IDs `{matchKey}_{coachShortId}_{NNN}` with a localStorage-keyed counter; two devices on same UID computed identical IDs → `setDoc` silently overwrote prior point docs. Jacek lost 6 points mid-tournament. Opus option (b) shipped: drop deterministic IDs entirely, `savePointAsNewStream` now uses `addPoint`/`addTrainingPoint` (auto-ID), `index` computed reactively from live `points` array. `endMatchAndMerge` already groups by `coachUid` + sorts by `index` field (not doc ID), so no data migration. `useCoachPointCounter` deleted. `setPointWithId`/`setTrainingPointWithId` exports retained as dead code — post-NXL cleanup. Deferred: cross-device same-UID presence banner (claim system retired in Brief F), Sentry `onToolbarAction` ReferenceError, § 42 docs update. Two-device smoke validation pending Jacek on the tournament floor. Full diagnostic in chat 2026-05-15 (state-machine walk of 7 hypotheses; auto-ID + reactive index pin the bug structurally rather than papering it). |
| 2026-05-14 | `d4653ef` (merge) · branch `feat/schedule-auto-match-workspace` · 1 commit (`40fe366`) | **Schedule CSV: workspace auto-match + auto-attach.** Real-data follow-up to yesterday's schedule CSV ship. First Jacek run with the 229-row file pushed all 76 teams to the resolver because schedule import's auto-match was tournament-scouted-only — teams existed workspace-wide (from 2026-05-12 player CSV) but weren't attached to the new NXL Czechy tournament. Auto-match now does two passes: tournament-scouted first, then workspace-wide fallback (case-insensitive name + exact division). Exactly-one workspace hit triggers auto-attach during import (new Pass 0 creates scouted entry, roster pre-populated). 0 or 2+ workspace hits fall through to the resolver (2+ = ambiguous parent/child). Resolver UI shows new `🔗 Z workspace (zostaną dopięte)` counter. Result: 76 manual taps → 0 for Jacek's case. Merge + deploy done Jacek-side via terminal (CC approval channel was intermittent at the time). |
| 2026-05-13 | `5b1e15f` (merge) · branch `feat/schedule-csv-import` · 5 commits (`76f7a1f`, `d916347`, `be74c61`, `eb2e1d4`, `f3eb5f1`) | **Schedule CSV import + match list grouping (pre-NXL Czechy).** New `divisionAliases.js` shared util (SCHEDULE_DIVISION_ALIAS 7-entry map, normalizeScheduleDivision, parseScheduleDateTime, dayShort, stageRank/Label, groupMatchesByStage). New `ScheduleCSVImport.jsx` modal — separate from OCR `ScheduleImport`. Tournament picker filtered to NXL; year inherited from selected tournament. Hard-stop on unknown division or unparseable date with row number. Structured resolver for unmatched teams (Dopasuj / Utwórz / Pomiń per row). `addMatch` extended additively with `scheduledAt` / `field` / `round` / `group`. MatchCard pill now shows `Czw 14:20 · NXL Pro` (day-short + time + field) with legacy `date + time` fallback. Scout tab Scheduled section now grouped by stage (`Eliminacje` + `Sunday Club` — two buckets per Jacek 2026-05-13 directive, all bracket rounds collapse into Sunday Club) and sub-grouped by Grupa within Eliminacje. OCR ScheduleImport untouched. |
| 2026-05-12 | `06b4ec1` (merge) · branch `feat/csv-import-division` · 1 commit (`0b67166`) | **CSV import: Dywizja → team.divisions.NXL.** PBLeagues NXL exports now auto-map the Dywizja column to team.divisions.NXL during CSV import (zero manual per-team editing). DIVISIONS.NXL extended from 5 → 7 values (`PRO`, `SEMI-PRO`, `D2`, `D3`, `D4`, `PRO3v3`, `WNXL` — last two new per brief). `SEMI-PRO` casing preserved for backward compat; CSV `'Semi-PRO'` normalizes case-insensitively to canonical `'SEMI-PRO'` on import (option a from discovery — zero data migration). New `normalizeDivision(raw, league)` helper. New `teamDivision` MAPPABLE entry on the import UI; `'dywizja'`/`'division'` detect keywords moved from `playerClass` (where they were mis-mapping a TEAM-level field) to `teamDivision`. `addTeam` extended to accept `data.divisions`. Preview gains Dywizja stat row + intra-import collision count (dev console.warn). Import-log tags `[NXL: {div}]` per team line. All existing DIVISIONS.NXL consumers pick up the 7-value list via their `DIVISIONS[league].map(...)` iteration — no per-file updates needed. |
| 2026-05-12 | `ae3627f` (merge) · branch `fix/match-postclose-edit` · 1 commit (`c6e8749`) | **Match post-close edit + scout preservation (Bug 7 + Bug 2c).** New `match.editLockReleased` boolean lets a closed match flip into editable mode without changing status; reopen flow restored after April 2026 removal but with safer mechanics (no live/claim involvement, status stays 'closed'). MatchPage review-view sticky button branches: End match (open red ghost) / Odblokuj edycję (locked neutral ghost) / Zamknij ponownie (unlocked neutral ghost → confirm + recomputeMatchAggregates). Header pill: FINAL gray when locked, ODBLOKOWANY amber when reopened. New dataService helpers: `setMatchEditLockReleased`, `recomputeMatchAggregates`. MoreBtn menu omits End match while unlocked. Bug 2c: savePoint preserves `homeData/awayData.scoutedBy` on post-close edits (only when editingId AND status='closed'); open-match + new-point-during-unlocked behavior unchanged so Scout Ranking § 33 attribution is correct in all cases. Back-button half audited as already-working — no save-on-back logic exists, brief's first claim was preemptive. 8 i18n keys × PL+EN. Training matchups not in scope (parallel codepath via endMatchupAndMerge — separate follow-up if needed). |
| 2026-05-12 | `112fff9` (merge) · branch `fix/deaths-heatmap-table-scroll` · 1 commit (`dc3a76e`) | **Deaths heatmap table scroll regression (Bug 6).** Bug 5 stopped halfway — aligned width to responsive pattern but left `height: '100dvh'` on the page outer. That triggered the classic flex+overflow gotcha on iOS Safari (`flex: 1, overflowY: 'auto'` inner refuses to shrink below content size without `min-height: 0`), so the deaths table rendered but landed below the silently-broken scroll boundary. Single-line fix `height: '100dvh'` → `minHeight: '100vh'` matches ScoutedTeamPage / BallisticsPage / MatchPage + 8 other pages' canonical pattern. Document scrolls naturally now. Brief's four hypothesized causes (overflow:hidden, position:fixed, orientation conditional, container restructure) all wrong — real cause was layout-strategy mismatch only reproducible on iOS Safari. |
| 2026-05-12 | `3737705` (merge) · branch `fix/deaths-heatmap-landscape-width` · 2 commits (`d1dad51`, `607a5eb`) | **Deaths heatmap landscape width (Bug 5).** LayoutAnalyticsPage had hardcoded `maxWidth: 640` → 86 px dead margin in iPhone landscape. Initial fix (`d1dad51`) overcorrected to pure `width: 100%`; followup (`607a5eb`) aligned to canonical app-wide responsive pattern (`maxWidth: R.layout.maxWidth \|\| 640` from `responsive(device.type)`) used by MatchPage scouting canvas + 10 other pages. Mobile fills viewport, tablet caps at 768, desktop at 1200 — same look and feel as the rest of the app. Per Jacek "i want to have the same look and feel across app". Three relax-paths sketched in commit for global tighter-fit if needed (raise tablet maxWidth, tighten useDevice touch override, or per-page bypass); not in scope here. |
| 2026-05-12 | `555a634` (merge) · branch `fix/deaths-heatmap-cluster-zorder` · 2 commits (`9b13960`, `b548907`) | **Deaths heatmap cluster radius + z-order (Bugs 3+4).** Bug 3: shooter cluster bucket bumped from implicit 1% to 2% via new `SHOOTER_CLUSTER_BUCKET = 0.02` named constant — fewer, larger markers; tunable in one place. Applied at both `attributionData` + `linkMap` useMemos so shooterId keys stay aligned for cross-filter. Bug 4: render restructured into two passes when filter active — faded markers (both types at 0.3 alpha) first, highlighted markers (both types at 1) last — so a highlighted skull is never covered by a faded shooter at the same coord. Extracted `drawSkull` / `drawShooterMarker` local helpers; no-filter z-order preserved. |
| 2026-05-12 | `2125793` (merge) · branch `fix/deaths-heatmap-hotfix` · 1 commit (`c5dbb5e`) | **Deaths heatmap hotfix Bug 1 — shooter coords to right half.** Brief B Stage 5 spec incorrectly normalized shooter markers via `forceLeft` ("same as skulls"); production showed shooters stacking on top of skulls on the left half. Hotfix introduces `forceRightX` helper applied at both `attributionData` + `linkMap` useMemos so skulls cluster left (defender side) and shooters cluster right (shooter side). Cross-filter linking is attribution-based, not spatial — IDs continue to match. § 61.8 coord-frame note in DESIGN_DECISIONS anticipated this fix path. Bug 2 (canvas overflow / pan+zoom) ESCALATED to separate brief: raw canvas → `FieldCanvas` migration is architectural-scope. |
| 2026-05-12 | `a5bb51e` (merge) → DEPLOY_LOG entry · branch `feat/deaths-heatmap-v2` · 7 commits (`b1f32a2`/`3fe3b90`/`b024889`/`d9dc88b`/`71dfd71`/`4276639`/`ed82311`) | **Brief B — Deaths Heatmap v2 (§ 61).** LayoutAnalyticsPage `mode='deaths'` overhaul isolated to one screen. New `deathAttribution.js` helper (precision 10% + zone match + 1/N split, fractional credits via `formatKills`); progressive-disclosure scope pills Layout/Tournament/Match/Point with `ActionSheet` pickers; `_ctx` ids additive on `fetchLayoutDeaths`; attribution useMemo runs per filtered point per side; density auto-hide < 5 points; zero-point empty state; scope-aware count-line wording; `Pozycja strzelca` 7th table column via O(1) `attributionByDeath` lookup; shooter markers on canvas with team-color credit badges (zero-kill markers NOT rendered); bidirectional cross-filter linked highlighting (skull ↔ shooter via precomputed `linkMap`); status pill `📍 Eliminacja na D1 — N strzelców · ✕`. § 30 + all global kill displays preserved. Three deferral decisions documented in § 61.6: instant `globalAlpha` flip instead of 200 ms fade animation, no toast for unattributed-skull (pill carries `brak strzelca`), zero-kill markers gated out. Coord-frame check (§ 61.8) awaits real-data validation. 10-step smoke walkthrough in DEPLOY_LOG. Brief archived: `docs/archive/cc-briefs/CC_BRIEF_DEATHS_HEATMAP_V2_2026-05-12.md`. |
| 2026-05-12 | `36104cb` (merge) → `3a1ffed` (DEPLOY_LOG) → `8327d4f` (§ 60 docs) · branch `feat/pre-nxl-refinements` | **Brief A — Pre-NXL Refinements (§ 60).** 8/9 SAFE-tier items shipped, PLAYER #1 deferred (§ 60.9). Coach view changes: heatmap promoted to top + expanded (§ 60.1); Tendencja demoted to Additional sections (§ 60.2); Rozbiegi `Zagrań` + `W pkt` columns (§ 60.4, `computeBreakSurvival` extended); Strzelanie reliability banner (<80% amber alert, reuses `computeCompleteness.shotPct`, § 60.5); match-level scope filter — `Ostatni mecz` + `Mecz ▾` picker, URL `?scope=lastMatch` / `?scope=match&mid=X` (§ 60.6); ADD MATCH removed from coach summary (§ 60.7); ShotDrawer 80%/max-340 → 70vw/max-520 (§ 60.8). 10 i18n keys × PL+EN added. Brief archived to `docs/archive/cc-briefs/CC_BRIEF_PRE_NXL_REFINEMENTS_2026-05-12.md`. Discovery contradictions documented in archive: SCOUT #6 current state was 80%/max-340 (perceived as 40% due to maxWidth-cap on iPhone Pro Max landscape); brief said `§ 39` but renumbered to `§ 60` (§ 39 had been taken since 2026-04-21). |
| ~2026-05-02 | `d5d32ab` (DEPLOY_LOG `be9cead`) | **PlayerStatsPage redesign** — chemistry duo/trio, depth metric disabled, data-source pills per section, large overlapping avatars (40/48px), new naming convention for all section titles. Brief archived to `docs/archive/cc-briefs/`. |
| ~2026-05-02 | `fix/hotfix-bundle-2026-05-02` | **Hotfix bundle** — Issue #1 (winner-pick buttons appearing during Live tracking Stage 3 — legacy artifact removed) + Issue #2 (chemistry card avatars now use canonical `PlayerAvatar.jsx` with `photoURL` fallback). |
| earlier | various | KIOSK MVP, security audit (Tier A/B/C), ADMIN_RUNBOOK, anonymous user bulk-delete, vendor bundle splitting, feature flags + Sentry, training mode, bottom tab navigation. See `DEPLOY_LOG.md`. |

Older entries up to 2026-04-20 covered by the previous HANDOVER snapshot (`git log docs/ops/HANDOVER.md`).

---

## 🎯 Next on deck (priority order)

### 1. Opus + Jacek rozkmina #1 — § 63.3 schema choice (a/b/c)
- Phase 0 § 63.3 Findings provide evidence base: zero consumers of `users.workspaces` in src/, role resolution via `workspace.userRoles[uid]`, option (a) breaking change effectively free
- Decision blocks Phase 1 schema foundation work
- Output: locked decision committed to § 63.3 + § 63.11

### 2. Opus + Jacek rozkmina #2 — Canvas Etap 4 (A vs B model + drawing layer)
- Phase 0 § 5.3/5.4 + `PHASE_0_DISCOVERY_FINDINGS.md` provide evidence base
- HeatmapCanvas zero-gestures finding is critical input
- Decision: single CanvasView with props vs BaseCanvas hierarchy
- Plus: drawing layer architecture (Feliks workflow replica)
- Output: locked decision committed to `CANVAS_ARCHITECTURE.md` § 6 + new DESIGN_DECISIONS section if warranted

### 3. Opus + Jacek rozkmina #3 — Global resources lock (players + teams + globalEvents arch)
- Player identity: resolved preliminary, formal lock alongside teams
- Teams global recommendation (per § 63.14)
- GlobalEvents registry architecture (per § 63.14 new PARKED item)
- Output: locks committed to § 63.14 + new sub-sections in § 63 if architecture needs detail

### 4. After all three rozkminy → write `MULTI_TENANT_MIGRATION_PLAN.md`
- Detailed per-phase plan with validation gates, rollback procedures, dependencies
- Includes: schema migration plan, canvas refactor sequencing, global resource hoisting

### 5. Canvas refactor briefs (parallel track)
- Per-view migration briefs starting with highest-value view (likely ScoutedTeamPage for landscape coach view)
- Drawing layer feature brief
- Independent of multi-tenant tracks

### 6. Player Self-Report Tier 2 + Integrations (deferred from MVP session)
- "Mój dzień" section in PlayerStatsPage
- Shot accuracy section per player
- ScoutedTeamPage hybrid view when scouted team is own team

### 7. SCOUT/COACH backlog from feedback session 2026-05-12 (16+ items)
- Consolidated decision-tree brief
- Some items blocked on canvas (heatmap-touching) or multi-tenant (URL-touching)
- Independent items (ADD/CSS/reorder) can ship anytime

### 8. BreakAnalyzer module tuning
- Specs exist in `docs/architecture/BREAK_ANALYZER_SPEC.md`
- Engine scaffolded but needs tuning
- Opus territory

---

## ⏸️ Awaiting decision (needs Jacek input)

| Topic | Question | Blocks |
|---|---|---|
| **Canvas Etap 4 model decision** | A (single CanvasView with props) vs B (BaseCanvas + specialized children)? Plus drawing layer architecture (overlay component, persistence scope, multi-user model). Phase 0 § 5.3/5.4 + HeatmapCanvas zero-gestures finding inform. | Canvas refactor briefs + landscape coach view + drawing layer feature |
| **Teams global vs workspace-scoped (formal lock)** | Preliminary recommendation: global like players. Lock alongside player identity in rozkmina #3. | Multi-tenant Phase 1 schema migration |
| **GlobalEvents registry architecture (Option A/B/C)** | Cross-workspace dedup for super admin aggregation. Option B preferred preliminary. Decision deferred to rozkmina #3. | Aggregation Phase 2+ (Cloud Function dedup logic), super admin merge UI |
| **Factual observation reconciliation strategy** | When 2 workspaces observe same point with conflicting data (positions, shots) — trust one source / majority vote / manual / weighted average / most-recent? Phase γ+ concern. | Composite aggregation mode (Phase γ) |
| **§ 63.3 schema sub-option (a/b/c)** | Migrate `workspaces[]` → `workspaceMemberships[{slug,role,joinedAt}]` (a, breaking), parallel `workspaceRoles` field (b, additive), or per-workspace member doc (c, separate collection)? | Phase 1 schema work — evidence ready (zero consumers per Phase 0 § 63.3 Findings), Opus + Jacek lock in rozkmina #1 |
| **Data residency** | Firestore region for US team (+100ms latency if EU region). Single region for v1 or multi-region from start? | Multi-tenant Phase 0 (decision before workspace creation for US team) |
| **GDPR / data privacy implementation** | Player data removal mechanism. Right to portability. Cross-workspace data export per player. | Multi-tenant Phase 1 schema (data model must support deletion) |
| **Subscription model details** | Payment flow (Stripe?), billing cycle, plan tiers (free/pro/enterprise). Granular per-layout decision locked but UX details open | Multi-tenant Phase 6 (aggregation Phase 2 + tier UI) |
| **Tier gating Phase 1 default** | Admin-only Phase 1 soft-confirmed. Verify before Phase 5 implementation begins | Multi-tenant Phase 5 (aggregation Phase 1) |
| **Drawing layer persistence model** | Strokes ephemeral (React state), persistent per-event (Firestore like TacticPage), or hybrid with explicit "Save annotation" promote? | Drawing layer feature brief |
| **Drawing layer multi-user model** | Single global layer per event, or per-user strokes with author attribution? | Drawing layer feature brief |
| **Feliks's iPad app identification** | Which app does Feliks use? Likely iPadOS Markup — Jacek to confirm with Feliks | Drawing layer MVP scope finalization |
| **`PlayerSelfReportV4.jsx` mockup** | Provide mockup or accept extrapolated UI as-is? | Polish pass on Tier 1 + Tier 2 UI |
| **Coach / scout role system** | Explicit scout role + per-match-subject permissions, or current `workspace.role` (coach/viewer/admin) enough? | Tier 2 edit permissions in PlayerSelfReport |
| **Tactic schema shots support** | Add shot field to tactics, or skip tactic-page suggestions? | SelfLog Integrations Commit 3 |
| **F5/F6/F7 priority** | Three user-reported features with overlapping scope. Which next? | Which brief gets written |
| **BreakAnalyzer ship target** | Block on which other work, or run in parallel? | Engineering capacity allocation |

---

## 🏛️ Architecture decisions reference

Long-form architecture docs in `docs/architecture/`. Opus should read the relevant doc before drafting specs touching that area.

| Doc | Topic | When to read |
|---|---|---|
| [`BALLISTICS_SYSTEM.md`](../architecture/BALLISTICS_SYSTEM.md) | Euler integration, hitboxes, 3-channel visibility | Anything touching `src/workers/ballisticsEngine.js` or BallisticsPage |
| [`BREAK_ANALYZER_SPEC.md`](../architecture/BREAK_ANALYZER_SPEC.md) | BreakAnalyzer Phase 1 spec | Before BreakAnalyzer feature work |
| [`BREAK_ANALYZER_DOMAIN_v2.md`](../architecture/BREAK_ANALYZER_DOMAIN_v2.md) | Domain vocabulary + constants | Same as above |
| [`BUNKER_RECOGNITION.md`](../architecture/BUNKER_RECOGNITION.md) | NXL 2026 bunker taxonomy (15 types) | Before Vision scan, bunker editor, shape-aware features |
| [`HALF_FIELD_SPEC.md`](../architecture/HALF_FIELD_SPEC.md) | Mirror system, `computeMirrors()`, calibration transform | Before FieldCanvas changes or bunker storage schema |
| [`PLAYER_SELFLOG.md`](../architecture/PLAYER_SELFLOG.md) | Two-tier model, synthetic coords, flywheel thresholds | Before Tier 2 / Integrations work |
| [`TACTIC_WORKFLOW.md`](../architecture/TACTIC_WORKFLOW.md) | Tactic editor scouting-style flow, bump, curve cycling | Before tactic page changes |

---

## 📐 Recent design decisions

`docs/DESIGN_DECISIONS.md` — newest sections. Brief B will append the next available section number (likely § 61 — verify before commit).

| § | Topic | Date | Notes |
|---|---|---|---|
| 63 (Phase 0 findings) | Phase 0 CC discovery — Canvas + Multi-Tenant § 63 | 2026-05-19 | Canvas audit ❓/🟡 cleared. § 63.X Findings sub-blocks added per subsection. Critical findings: zero consumers of users.workspaces (option a free), Spark→Blaze needed for Phase 5, NewTournamentModal already has 3-type selector, HeatmapCanvas zero gestures. § 63.14 updated: player identity RESOLVED global, teams PRELIMINARY global, globalEvents architecture NEW PARKED with full rozkmina material. |
| 63 | Multi-Tenant Architecture — SaaS foundation | 2026-05-19 | 8 architectural decisions for multi-tenant SaaS pivot. Unified events collection, multi-workspace membership + Super Coach role (extends § 49 foundation, schema sub-option a/b/c deferred to Phase 0), hybrid layout library, phased aggregation, workspace slug in URL, unified wizard, mixed copy strategy, i18next migration. Migration plan ~6 months. Triggered by US PRO team onboarding + monetization of cross-workspace layout insights. |
| 61 | Deaths heatmap v2 | 2026-05-12 | **Shipped (merge `a5bb51e`, deployed; see DEPLOY_LOG 2026-05-12).** Isolated `deathAttribution.js` helper (precision + zone + 1/N split, fractional credits via `formatKills`), scope filter pills (Layout/Tournament/Match/Point — no global) with `ActionSheet` pickers + cascading state, density auto-hide < 5 points, shooter markers on canvas with team-color badges, cross-filter linked highlighting (skull↔shooter via precomputed `linkMap`), status pill, "Pozycja strzelca" 7th table column. § 30 explicitly preserved for global consumers. Animation + unattributed-skull toast deferred per CLAUDE.md smaller-scope rule (documented in § 61.6). |
| 60 | Coach view refinements — pre-NXL | 2026-05-12 | **Shipped (merge `36104cb`, deploy `3a1ffed`).** Heatmap to top of ScoutedTeamPage, Tendencja demoted to additional, Rozbiegi +2 columns (`Zagrań` / `W pkt`), Strzelanie reliability banner, match-level scope filter (`Ostatni mecz` + `Mecz ▾`), ADD MATCH removed, precision drawer 70vw. PLAYER #1 BottomNav deferred (§ 60.9). |
| 37 | Documentation discipline | 2026-04-20 | Where decisions live, CC brief lifecycle, chat-is-not-SoT rule |
| 36 | Adaptive picker thresholds | 2026-04-20 | Breakout < 5, shots < 20, weighted hit=2/miss=1/unknown=0.5 |
| 35 | Player Self-Report UI patterns | 2026-04-20 | Two-tier model, FAB, bootstrap collapse, cycle-tap shots, shared variants |
| 34 | Field Side Representation Standard | 2026-04-18 | `SideTag` canonical component, terminology (dorito/snake/center, NOT disco/zeeker for sides) |
| 33 | User Accounts + Scout Ranking | 2026-04-15 | Email/password auth, scout leaderboard |
| 32 | Training Mode | 2026-04-14 | Squads, drag-drop, matchups reuse MatchPage |
| 31 | Bottom Tab Navigation — App Shell | 2026-04-14 | Scout/Coach/More, tournament picker |
| 30 | Metric Formulas | 2026-04-14 | Coaching stats, performance, kill attribution v1 (still authoritative for global consumers; Brief B's helper is isolated) |
| 27 | **Apple HIG Compliance — MANDATORY** | 2026-04 | Touch 44px, elevation, amber = interactive only, anti-patterns |

Earlier sections (§ 1–§ 26) cover foundational decisions. Full list: `grep '^## [0-9]' docs/DESIGN_DECISIONS.md`.

---

## 🔄 Update protocol

**At the end of every Opus chat** (or Claude Code session that changes direction):

1. Patch **this file** with changes in:
   - "Currently in flight" (new branch? complete?)
   - "Recently shipped" (add row to table if something deployed)
   - "Next on deck" (promotions / demotions / new tasks)
   - "Awaiting decision" (add new blockers / mark resolved)
   - "Recent design decisions" (add row if §N+1 appended to DESIGN_DECISIONS)

2. Bump **Last updated** date + author + **Main HEAD at last update**.

3. Commit: `chore(docs): update HANDOVER.md — <summary of changes>`

4. If Opus chat generated a new patch for `DESIGN_DECISIONS.md` or `PROJECT_GUIDELINES.md`, ship that patch in the same or adjacent commit, before the chat ends (per § 37.2 chat-is-not-SoT rule).

**Rule of thumb:** this file should be the first thing a fresh Opus chat reads to get situational awareness. If it's stale, fix it before asking Opus anything strategic.
