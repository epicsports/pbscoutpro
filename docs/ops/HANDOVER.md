# Session Handover — PbScoutPro

> **Purpose:** Living state-of-the-project for Opus chats (architect / strategy sessions). Read this before drafting any CC brief or making decisions about direction.

**Last updated:** 2026-05-12 by Opus (session end) + CC docs patch (rebase onto Brief A shipped state)
**Live app:** https://epicsports.github.io/pbscoutpro
**Repo:** https://github.com/epicsports/pbscoutpro
**Main HEAD at last update:** this docs patch (post-`3a1ffed` Brief A deploy; supersedes `52a8fb8` queued-state snapshot)

---

## 🚧 Currently in flight

One brief queued for CC, must merge **pre-NXL Czechy 2026-05-15**.

### Brief B — Deaths Heatmap v2
File: `CC_BRIEF_DEATHS_HEATMAP_V2_2026-05-12.md` (repo root)
Branch: `feat/deaths-heatmap-v2`
LayoutAnalyticsPage deaths-mode overhaul, scoped to one screen. Isolated attribution helper (precision + zone + 1/N split, fractional credits with 1 decimal display), 4-level scope filter with progressive disclosure (Layout / Tournament / Match / Point, no global), shooter markers + linked highlighting cross-filter, new "Pozycja strzelca" column. § 30 formula and all global kill displays explicitly untouched. 7 stages with Jacek checkpoints between. Brief A is already on main — Brief B can start whenever Jacek issues GO. **Not started yet.**

---

## 🚢 Recently shipped (last ~10 days)

> **Source-of-truth caveat:** Opus does not have direct repo access this session. The following are reconstructed from memory + earlier deploy logs. **CC: please verify against `DEPLOY_LOG.md` and patch missing entries when updating this file.**

| Date | Branch / commit | Summary |
|---|---|---|
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
| 61 (pending merge) | Deaths heatmap v2 | 2026-05-12 | Isolated attribution helper (precision + zone + 1/N split), scope filter (Layout/Tournament/Match/Point — no global), shooter markers, cross-filter UX, "Pozycja strzelca" column, density auto-hide < 5 points. Brief: `CC_BRIEF_DEATHS_HEATMAP_V2_2026-05-12.md`. |
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
