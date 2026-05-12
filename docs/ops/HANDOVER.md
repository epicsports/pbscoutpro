# Session Handover — PbScoutPro

> **Purpose:** Living state-of-the-project for Opus chats (architect / strategy sessions). Read this before drafting any CC brief or making decisions about direction.

**Last updated:** 2026-05-12 by CC (deaths heatmap table scroll regression shipped — merge `112fff9` + deploy + DEPLOY_LOG)
**Live app:** https://epicsports.github.io/pbscoutpro
**Repo:** https://github.com/epicsports/pbscoutpro
**Main HEAD at last update:** post-`112fff9` deaths heatmap table-scroll merge (see `DEPLOY_LOG.md` 2026-05-12)

---

## 🚧 Currently in flight

_(empty — Brief A + Brief B + deaths heatmap hotfix Bug 1 shipped pre-NXL Czechy 2026-05-15. Post-NXL queue resumes from `NEXT_TASKS.md` POST-NXL section.)_

**Deaths heatmap follow-ups carried into POST-NXL:**
- **Bug 2 ESCALATED** — canvas overflow + pan+zoom request. Raw canvas → `FieldCanvas` migration is architectural, not hotfix scope. Three implementation paths sketched in `fix/deaths-heatmap-hotfix` ESCALATE note: (a) extend FieldCanvas to accept custom marker layer; (b) extract pan+zoom to shared hook; (c) inline pan+zoom on raw canvas (DRY-violation but contained). Needs separate brief — sized properly with stages + iPhone checkpoints. Jacek's screenshot of the overflow repro would tighten the brief.
- Coord-frame Bug 1 (Stage 1 → § 61.8) **FIXED** in hotfix `2125793` via `forceRightX` helper at the two shooter-sx sites. Skulls left, shooters right.

---

## 🚢 Recently shipped (last ~10 days)

> **Source-of-truth caveat:** Opus does not have direct repo access this session. The following are reconstructed from memory + earlier deploy logs. **CC: please verify against `DEPLOY_LOG.md` and patch missing entries when updating this file.**

| Date | Branch / commit | Summary |
|---|---|---|
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

## 🎯 Next on deck (post-NXL, priority order)

1. **Verify auto-swap regression status with CC** — `outputs/CC_BRIEF_AUTO_SWAP_REGRESSION.md`. May have shipped post-2026-04-28; need to confirm before treating SCOUT #5 as new work.
2. **Security-roles-v2 finish** — Commits 3 (View Switcher) + 4 (Firestore rules + cleanup) on `feat/security-roles-v2`, smoke tests, merge. Pre-existing branch from prior session.
3. **Jacek 2026-05-12 risky feedback items** — SCOUT #1, #2, #3, #4, #5, #7 + COACH #5 + NEW ACCOUNT #1. Each needs own brief; sequence depends on risk and overlap with sparing rozkmina. See `NEXT_TASKS.md` post-NXL section for full list.
4. **Sparing architecture rozkmina** — 5 product decisions needed. Gates SCOUT #4 (partial save), PPT picker fix, sparing implementation, player claim flow brief. Possible architectural reshape (Model A status quo / B unified events / C events_index).
5. **Player motivation claim flow brief** — mockup approved 2026-05-02 (`outputs/player_claim_flow_mockup.html`). Brief written post-sparing.
6. **BreakAnalyzer module** — needs tuning vs real field data. Opus territory (`src/workers/ballisticsEngine.js` off-limits to CC).

---

## ⏸️ Awaiting decision (needs Jacek input)

| Topic | Question | Blocks |
|---|---|---|
| **Auto-swap regression status** | Shipped or pending? Verify with CC before treating SCOUT #5 as new work. | SCOUT #5 |
| **Hotfix bundle 2026-05-02 verification** | Issues #1 + #2 truly fixed live? Influences SCOUT #2 triage (FAB icon). | SCOUT #2 |
| **Coach / scout role system** | Today uses `workspace.role`. Do we need explicit scout role + per-match-subject permissions? | Tier 2 SelfLog edit perms, permission model evolution |
| **Tactic schema shots support** | Current tactic schema has no shot field. Add or skip tactic-page shot suggestions? | SelfLog Integrations tactic suggestions task |
| **F5 vs F6 vs F7 priority** | Three overlapping user-feature scopes. Which next? | Post-NXL brief sequencing |
| **BreakAnalyzer ship date** | Module scaffolded but needs tuning. Pre or post other features? | Engineering capacity allocation |
| **Security refactor scope** | Full rewrite vs incremental. Cloud Functions cost implications. | Sequencing vs other features |
| **Sparing collection affiliation** | Same collection as trainings/tournaments, or new collection? | All sparing work + SCOUT #4 |
| **Events unification (Models A/B/C)** | Status quo, unified `events`, or `events_index`? | Architectural foundation, multiple briefs |
| **PPT picker training-only fix scope** | Architectural (recommended) or hotfix? Tied to sparing rozkmina. | PPT picker, sparing rollout |

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
