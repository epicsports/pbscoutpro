# Session Handover — PbScoutPro

> **Purpose:** Living state-of-the-project for Opus chats (architect / strategy sessions). Read this before drafting any CC brief or making decisions about direction.
>
> **This replaces the static 2026-04-15 snapshot** (old version history accessible via `git log docs/ops/HANDOVER.md`). New model: updated at the end of every Opus session via a patch committed to this file.

**Last updated:** 2026-04-21 by Opus session + CC implementation (Briefs 6/7/7-bis/8 v2/9 pre-Saturday sprint)
**Live app:** https://epicsports.github.io/pbscoutpro
**Repo:** https://github.com/epicsports/pbscoutpro
**Main HEAD at last update:** `19527a0`

---

## 🚧 Currently in flight

**Nothing active.** All branches from this session merged to main and deployed. No stacked work-in-progress branches.

Next active work starts when Jacek drops the next brief.

---

## 🚢 Recently shipped (last 7 days — 2026-04-13 → 2026-04-20)

Chronological, newest first:

| Date | Deploy commit | Summary |
|---|---|---|
| 2026-04-21 | `19527a0` | **Brief 9 + Bug 3a revert (pre-Saturday polish)** — post-Brief-8 2-device test findings. Bug 1: `order: Date.now()+i` added on canonical merge docs (subscribePoints orderBy excludes field-missing docs → canonical was invisible post-merge). Bug 2 Option A: score writes removed from regular save paths (coachUid-filtered race); `endMatchAndMerge`/`endMatchupAndMerge` now write authoritative `scoreA/scoreB` from canonical outcomes. Bug 3b: false-positive "sides swapped by other coach" toast suppressed (chess-model lock semantic extinct). Bug 3a: initially guarded `match.currentHomeSide` writes with `mode !== 'new'`, but that killed paintball § 2.5 auto-flip after a scored point — reverted same day, kept only Brief 7 `!editingId`. Intentional trade-off: match lists show 0:0 for active matches until End match. |
| 2026-04-21 | `30d169e` | **Brief 8 v2 — per-coach point streams + end-match merge (architectural redesign)** — replaces shared-doc chess-model with per-coach streams merged at End match. Doc ID scheme `{matchKey}_{coachShortId}_{NNN}`; localStorage-backed `useCoachPointCounter` hook; new `setPointWithId`/`setTrainingPointWithId` + `endMatchAndMerge`/`endMatchupAndMerge` in dataService; `usePoints`/`useTrainingPoints` opt-in `{ currentUid, merged }` filter (client-side to grandfather legacy docs missing `coachUid` per Blocker 2 decision). Problem A: URL entry semantics — all Scout CTAs `&mode=new`, list-card taps `&point=<id>`, auto-attach fallback search removed. Problem B: streams merged per index → canonical docs `{mid}_merged_{NNN}` with `sourceDocIds` audit pointers; legacy bucket canonical-standalone; idempotent; `match.mergeStats { merged, unmerged }` recorded. Diagnostic `[BUG-B]` + `[BUG-C]` logs retained in prod for validation. |
| 2026-04-21 | `8669b91` / `dc62f9c` / `bc6954d` | **Briefs 6 + 7 + 7-bis (Problem X incremental, § 41/§ 43)** — three surgical fixes under pre-Saturday urgency. Brief 6: savePoint joinable condition narrowed from `status=open|partial OR otherSide has players` → `status=open|partial` only (scouted terminal per § 18). Brief 7: Edit-vs-new side pointer separation — G2 auto-swap effect guarded `if (editingId) return;` + savePoint post-write flip guarded `&& !editingId` → § 41. Brief 7-bis: mirror fix applied to duplicate joinable at `startNewPoint` L852. All three merged + deployed 2026-04-21. |
| 2026-04-20 | `eb0f247` | **Documentation cleanup** — root reduced 14 → 4 `.md`, new `docs/{architecture,ops,product,archive/audits}/`, `CC_BRIEF_*` archived (28 files + INDEX), doc discipline codified (PROJECT_GUIDELINES §10, DESIGN_DECISIONS §37) |
| 2026-04-20 | `e11e845` | **Player Self-Report MVP Tier 1** — FAB + HotSheet bottom sheet in MatchPage, shot schema extension (`source: scout/self`), `breakoutVariants` team pool, email-based player identity (`useSelfLogIdentity`), onboarding modal in MainPage. Firestore collection group indexes deployed |
| 2026-04-19 | (polygon SHA) | **Unified polygon zone editor** — Google-Maps-style drag/midpoint-insert/delete for Danger/Sajgon/BigMove zones, iOS Safari magnifier suppressed via non-passive touch listeners + CSS callout disable |
| 2026-04-19 | (multi-branch merge) | **Notes + Big Moves + Kluczowi gracze refinements** — 3 branches merged together: Coach Notes subsystem (NotatkiSection + UnseenNotesModal), Big Moves user-drawn zone + detection, Kluczowi gracze multi-key sort + weak-data banner, section renames ("1. Breakouty" → "Rozbiegi") + Lucide icons |
| 2026-04-19 | (training fix) | **Training match navigation hotfix** — PlayerStatsPage match-history now respects `isTraining` flag |
| 2026-04-18 | `0f4ef8a` | **Coach Brief View** — ScoutedTeamPage redesigned to Sławek's 4 priorities above fold (Breakouty, Strzały, Tendencja, Kluczowi gracze), confidence banner, `<SideTag>` canonical component |

See `DEPLOY_LOG.md` for fuller entries with known-issues notes.

---

## 🎯 Next on deck (priority order)

### 0. Brief 10 — enroll/membership cleanup (POST-SATURDAY)
- Workspace ID case-sensitivity (login probe failure reports)
- `role` field array normalization (some docs have string, some array — single source of truth needed)
- `users.workspaces` sync with `/workspaces/{slug}/members` — drift observed; reconciliation utility needed
- Scope: data model audit + migration utility; NOT a user-facing feature. Post-Saturday priority so it doesn't destabilize the 2026-04-25 match.

### 1. Player Self-Report Tier 2 + Integrations (deferred from MVP session)
- "Mój dzień" section in `PlayerStatsPage` (own points list, completion status, Tier 2 edit modal for killer/notes)
- Shot accuracy section per player (top targets, hit rate, filter by layout/tournament/global)
- `ScoutedTeamPage` hybrid view when scouted team is own team (self-reported shots layer alongside scout data)
- Tactic page shot suggestions (if current tactic schema supports shots — needs confirmation before brief)
- Rationale: Tier 1 lives now but flywheel payoff comes from letting players see their own data

### 2. Validate Tier 1 on iPhone before Tier 2
- Still blind-coded UI — no Playwright test on device yet
- Thresholds (5 / 20) may need tuning
- Breakout collapse animation may need polish
- Could block Tier 2 if fundamentals need rework

### 3. User-reported F-bugs (from April PXL weekend)
- **F3: Quick shots dual mode** — brief exists (`docs/archive/cc-briefs/CC_BRIEF_QUICK_SHOTS.md`), check if fully shipped vs partial
- **F4: Sample size indicator** — tournament team cards (`CC_BRIEF_TEAM_STATS_CARDS.md` — archived, verify shipped)
- **F5: Self-scouting / counter analysis** — partially addressed by SelfLog hybrid view; may need own brief
- **F6: Tournament profiles** — per Jacek may be solved by quick shots dual mode
- **F7: Training data → break selection** — adjacent to SelfLog flywheel; wait for data to accumulate first

### 4. Security refactor + View Switcher (§ 38)
- Full spec in `docs/DESIGN_DECISIONS.md` § 38 (5 roles, admin hybrid, Settings Members UI, View Switcher, migration strategy, Firestore rules outline)
- **Blocked on Jacek's path decision** — Path A (full refactor, 8-15h, ships proper `userRoles` map + Firestore rules + Settings Members tab) vs Path B (MVP switcher only, 2-3h, keeps existing role system and adds preview-only impersonation before NXL)
- Path B is the recommended pre-NXL slice; Path A planned post-NXL Czechy
- Replaces the older "Security Phase 3" item — § 38 subsumes it

### 5. BreakAnalyzer module
- Specs exist: `docs/architecture/BREAK_ANALYZER_SPEC.md` + `docs/architecture/BREAK_ANALYZER_DOMAIN_v2.md`
- Implementation scaffolded but needs tuning against real field data
- Opus territory per NEXT_TASKS.md (`don't touch src/workers/ballisticsEngine.js`)

### 6. Tournament tendencies analytics
- Cross-tournament lineup/player patterns
- Blocks on: sufficient scouted data volume + SelfLog maturity

### 7. Security Phase 3 — server-side admin verification
- Now effectively a subset of § 38 Path A (Firestore rules with role-based `isAdmin`/`isCoach`/etc. functions)
- Kept here as separate line until path chosen — may fold into § 38 Path A implementation brief

---

## ⏸️ Awaiting decision (needs Jacek input)

| Topic | Question | Blocks |
|---|---|---|
| **`match.currentHomeSide` under Brief 8 architecture** | Per-coach streams store `fieldSide` per doc, yet manual flip-pill + auto-flip after scored point still write the shared `match.currentHomeSide`. Post-Saturday investigation: should this field be deprecated entirely, kept as shared-flip signal (current behavior post Bug 3a revert), or rewired to per-coach state? Open question — today's behavior is intentional pragmatic choice, not a designed endpoint. | Post-Saturday concurrent refactor (if any); claim-system retirement (§ 42 claim-cleanup migration) |
| **`PlayerSelfReportV4.jsx` mockup** | Provide mockup or accept extrapolated UI as-is? Brief referenced it across 2 sessions but never landed in repo | Polish pass on Tier 1 + Tier 2 UI |
| **Tactic schema shots support** | Current tactic schema does NOT carry shots per-position. Add shot field to tactics, or skip tactic-page suggestions? | Commit 3 SelfLog Integrations (tactic suggestions task) |
| **F5 vs F6 vs F7 priority** | Three user-reported features with overlapping scope. Which is most-important pre-NXL Czechy 2026-05-15? | Which brief gets written next |
| **BreakAnalyzer ship date** | Module scaffolded but needs tuning. Block NXL release on it, or defer post-NXL? | Engineering capacity allocation |
| **Security refactor scope** | Full rewrite or incremental? Cloud Functions cost implications | Sequencing vs NXL deadline |

---

## 🏛️ Architecture decisions reference

Long-form architecture docs live in `docs/architecture/`. Opus should read the relevant one before drafting specs touching that area.

| Doc | Topic | When to read |
|---|---|---|
| [`BALLISTICS_SYSTEM.md`](../architecture/BALLISTICS_SYSTEM.md) | Euler integration, hitboxes, 3-channel visibility | Anything touching `src/workers/ballisticsEngine.js` or BallisticsPage |
| [`BREAK_ANALYZER_SPEC.md`](../architecture/BREAK_ANALYZER_SPEC.md) | BreakAnalyzer Phase 1 spec | Before BreakAnalyzer feature work |
| [`BREAK_ANALYZER_DOMAIN_v2.md`](../architecture/BREAK_ANALYZER_DOMAIN_v2.md) | Domain vocabulary + constants (companion to SPEC) | Same as above |
| [`BUNKER_RECOGNITION.md`](../architecture/BUNKER_RECOGNITION.md) | NXL 2026 bunker taxonomy (15 types), shape classification | Before Vision scan, bunker editor, or shape-aware features |
| [`HALF_FIELD_SPEC.md`](../architecture/HALF_FIELD_SPEC.md) | Mirror system (master + computed mirrors), `computeMirrors()`, calibration transform | Before FieldCanvas changes or bunker storage schema |
| [`PLAYER_SELFLOG.md`](../architecture/PLAYER_SELFLOG.md) | Two-tier model, unified shots collection, synthetic coords, flywheel thresholds | Before Tier 2 / Integrations work |
| [`TACTIC_WORKFLOW.md`](../architecture/TACTIC_WORKFLOW.md) | Tactic editor scouting-style flow, second position (bump), curve cycling | Before tactic page changes |

---

## 📐 Recent design decisions

`docs/DESIGN_DECISIONS.md` holds 43 sections. Most recent (newest first):

| § | Topic | Date | Notes |
|---|---|---|---|
| 43 | URL entry semantics for scouting | 2026-04-21 | Rule 1/2/3: Scout CTA = `&mode=new` always-new, list card = `&point=<id>` edit, auto-attach fallback search removed. Call sites: MatchPage.goScout, MatchCard.handleScout, TrainingScoutTab.onSwitchToScout. Quick Log untouched (always-new by construction). Brief 8 Problem A. |
| 42 | Per-coach point streams + end-match merge | 2026-04-21 | Replaces shared-doc chess-model. Doc ID `{matchKey}_{coachShortId}_{NNN}`, `useCoachPointCounter` hook (localStorage), point schema ext `coachUid/coachShortId/index/canonical/mergedInto/sourceDocIds`. Idempotent `endMatchAndMerge` per-index lockstep; legacy bucket canonical-standalone. Brief 8 Problem B. |
| 41 | Edit-vs-new side pointer separation | 2026-04-21 | `point.fieldSide` snapshot vs `match.currentHomeSide` live pointer. Defense-in-depth: G2 auto-swap effect `if (editingId) return;` + savePoint post-write `&& !editingId`. Fixes fieldSide rendering flip on re-enter (Brief 7). |
| 40 | Per-team heatmap visibility toggle | 2026-04-21 | V4 chip groups per team (§ 24 scope-pill active state reused), 2×2 toggle block, HeatmapCanvas optional `visibility` prop (backward-compat `showPositions`/`showShots`). Brief 3. |
| 38 | Security Role System + View Switcher (v2) | 2026-04-17 (v1) + 2026-04-20 (v2 extended: multi-role + PBleagues matching) | 5 roles ARRAY per user, PBleagues ID mandatory onboarding, admin approval gate. Path A chosen. Brief ready: `docs/archive/cc-briefs/CC_BRIEF_SECURITY_ROLES_V2.md` |
| 37 | Documentation discipline | 2026-04-20 | Where decisions live, CC brief lifecycle, chat-is-not-SoT rule |
| 36 | Adaptive picker thresholds | 2026-04-20 | Breakout < 5, shots < 20, weighted hit=2/miss=1/unknown=0.5 |
| 35 | Player Self-Report UI patterns | 2026-04-20 | Two-tier model, FAB, bootstrap collapse, cycle-tap shots, outcome colors, shared variants |
| 34 | Field Side Representation Standard | 2026-04-18 | `SideTag` canonical component, `COLORS.side.*`, terminology (dorito/snake/center) |
| 33 | User Accounts + Scout Ranking | 2026-04-15 | Email/password auth, scout leaderboard |
| 32 | Training Mode | 2026-04-14 | Squads (R/RG/RB/RH), drag-drop, matchups reuse MatchPage |
| 31 | Bottom Tab Navigation — App Shell Redesign | 2026-04-14 | Scout / Coach / More, tournament picker |
| 30 | Metric Formulas | 2026-04-14 | Coaching stats + performance + kill attribution formulas |
| 27 | **Apple HIG Compliance — MANDATORY** | 2026-04 | Touch 44px, elevation, amber = interactive only, anti-patterns. MUST READ before any UI work |

Sections 1–26 cover foundational decisions (canvas, match page, tournament page, teams page, data model, delete pattern, layout wizard, ballistics, concurrent scouting, coaching stats, point summary cards, obstacle shots, player stats, HERO rank, scout/coach toggle, coach team summary redesign). Full list at `grep '^## [0-9]' docs/DESIGN_DECISIONS.md`.

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

4. If Opus chat generated a new patch for `DESIGN_DECISIONS.md` or `PROJECT_GUIDELINES.md`, ship that patch in the same or adjacent commit, before the chat ends (per § 37.2 / § 10.3 chat-is-not-SoT rule).

5. **Proactive patching** — if Opus produced design decisions in a *previous* chat that never made it to repo (as happened with § 38, decided 2026-04-17 but codified 2026-04-20), the first task on opening the next CC session is to transfer them. Chat is reasoning archive; repo is source of truth. Delays compound — get it into the repo as soon as you notice the gap.

**Rule of thumb:** this file should be the first thing a fresh Opus chat reads to get situational awareness. If it's stale, fix it before asking Opus anything strategic.
