# Session Handover — PbScoutPro

> **Purpose:** Living state-of-the-project for Opus chats (architect / strategy sessions). Read this before drafting any CC brief or making decisions about direction.
>
> **This replaces the static 2026-04-15 snapshot** (old version history accessible via `git log docs/ops/HANDOVER.md`). New model: updated at the end of every Opus session via a patch committed to this file.

**Last updated:** 2026-04-22 by CC implementation (Briefs A–G 2026-04-22 backlog batch — 7 briefs end-to-end)
**Live app:** https://epicsports.github.io/pbscoutpro
**Repo:** https://github.com/epicsports/pbscoutpro
**Main HEAD at last update:** `afb47c5`

---

## 🚧 Currently in flight

**Nothing active.** All branches from the 2026-04-22 session (7 briefs A–G) merged to main and deployed. No stacked work-in-progress branches.

**Carry-over items from this session (not blocking, no active work):**
- **Brief G (full schema migration + rules refactor) — DEFERRED.** Option B shims shipped today (`parseRoles` + session-restore slug normalization + stop seeding junk `role` string on new user profiles). Full data migration + firestore.rules consolidation on `users.workspaces` + legacy field retirement (`workspace.members`, `adminUid`, `passwordHash`, stale `*ClaimedBy`/`*ClaimedAt`) still outstanding. Requires Firebase Admin SDK, dedicated off-hours deploy window, multi-checkpoint human review per its own spec. Trigger: (a) Jacek has focused hours, (b) multi-user workspace activity starts hitting dead-schema issues, or (c) operational tolerance for stale `biuro@epicsports.pl`-type on-disk data runs out.
- **Brief C Option 2** — per-user feature flag overrides architecture. Option 1 (workspace-wide flags + admin toggle UI in renamed `/debug/flags` page) shipped today. Per-user overrides deferred — noted in DEPLOY_LOG Brief C entry.
- **Brief E Option 2** — SelfLog-as-tab + PlayerSelfLogPage. Option 1 (role-gated Scout/Coach tabs; pure-player sees only More) shipped today. Full SelfLog page + Self Log tab entry deferred.
- **canAccessRoute completeness audit + RouteGuard sweep** (Brief E follow-up) — pure-player currently blocked from `/profile` by default-deny branch in `canAccessRoute`. Allowlist extension needed before wider URL-level gating can ship safely.
- **Bug A + Bug C** (per Jacek, from 2026-04-21 iPhone validation) — Bug A: Team B positions + shots not visible on match heatmap. Bug C: remove coaching stats percentages (dorito/snake/disco/zeeker/center/danger/sajgon) from match view entirely — statistically noisy at small sample size, belongs only on ScoutedTeamPage aggregate. Blocked on: HTML mockup owed by Opus per DESIGN_DECISIONS §1.4 workflow (koncept → prototyp → design → kod). Bug B was resolved architecturally by Brief 8 v2 per-coach streams.
- **Stale `*ClaimedBy` / `*ClaimedAt` Firestore field cleanup** — cosmetic hygiene only; no code path reads these post-Brief-F. Can run from Firestore Console.

Next active work starts when Jacek drops the next brief or brings a mockup for Bug A+C.

---

## 🚢 Recently shipped (2026-04-13 → 2026-04-22)

Two intense sprint days: **2026-04-21** (concurrent scouting architectural redesign pre-Saturday) and **2026-04-22** (backlog batch — 7 briefs A–G end-to-end). Chronological, newest first:

| Date | Deploy commit | Summary |
|---|---|---|
| 2026-04-22 | `afb47c5` | **Brief G Option B — role + membership defensive shims** — `getOrCreateUserProfile` stops writing junk `role: 'scout,coach,admin'` string on new user profiles. `parseRoles()` shim in `roleUtils` accepts array ∨ comma-string ∨ pipe-string ∨ undefined, returns deduped array; applied inside `getRolesForUser`. Session-restore effect normalizes slug via existing `slugify()` on load (handles legacy uppercase localStorage like `"Ranger1996"` → `ranger1996`). DESIGN_DECISIONS § 33.1 + § 33.2 codify the deprecation + canonical slug shape. **Zero Firestore data migration, zero rules changes** — full schema cleanup deferred to Brief G proper. |
| 2026-04-22 | `57fc3e6` | **Brief F — concurrent scouting cleanup** — ~40 `[BUG-B]` / `[BUG-C]` diagnostic console statements removed from MatchPage.jsx. Claim system fully retired: `homeClaimedBy` / `awayClaimedBy` / `homeClaimedAt` / `awayClaimedAt` writes + 5-min heartbeat + stale-TTL cleanup + side-picker LIVE/blocked state (MatchCard) all deleted. DESIGN_DECISIONS § 18 marked **DEPRECATED** with pointer to § 42-44. PROJECT_GUIDELINES § 2.5 rewritten. Stale fields on existing Firestore match docs left in place (harmless, unread). Net −232 lines. |
| 2026-04-22 | `f6d4910` | **Brief E Option 1 — SessionContextBar removal + role-gated tabs** — Inline `SessionContextBar` function in App.jsx + its call-site + `useTournaments`/`useTrainings` imports that only served it: fully removed. AppShell `TAB_DEFS` now carries `requiredAny` per tab (Scout: scout/coach/viewer, Coach: coach/viewer, More: always). Effective-admin bypasses gates. Pure-player sees only More tab; MoreTabContent + TrainingMoreTab hide Session / Manage / Scouting / Actions sections for pure-player. Route-level URL-typing guards deferred (canAccessRoute completeness audit needed first). F2 ("quick scouting tylko na treningu") explicitly dropped from backlog per 2026-04-22 user decision. DESIGN_DECISIONS § 47. |
| 2026-04-22 | `e7b3f78` | **Brief D — Members + Mój profil targeted fixes** — B1: new `useUserProfiles(uids)` hook (alongside `useUserNames`) batch-fetches `{displayName, email, photoURL}` from `/users/{uid}` for MembersPage; fallback chain `linkedPlayer.nickname → linkedPlayer.name → displayName → email → 'Member'`; UID fragments no longer surfaced. B2: MemberCard Edit/Save/Cancel state machine dropped; chips tap-to-toggle for admins with optimistic `pendingRoles` buffer; self-admin self-protect (§ 38.3 transfer-before-demote) retained. B3: `adminCount` guardrail — 'admin' chip disabled + reason when adminCount ≤ 1; Remove menu action filtered entirely for last admin; confirm modal body expanded + title includes target name. C1+C2: ProfilePage displayName de-duplicated from avatar card header (was rendering twice). DESIGN_DECISIONS § 45. |
| 2026-04-22 | `3688786` | **Brief C Option 1 — Scouting MoreSection + Feature flags inline edit** — New `ScoutingSection` export in MoreShell, consumed by MoreTabContent + TrainingMoreTab. Contains handedness toggle (persists to `pbscoutpro-handedness` localStorage, already read by `drawLoupe.js` but previously had no UI). Feature Flags promoted from "Debug" sub-section to own admin-gated top-level MoreSection. Destination page (route `/debug/flags` kept for bookmark compat) renamed "Debug: Feature Flags" → "Feature flags" and gains inline per-flag enable toggle (green iOS-switch 48×44) + audience cycle pill (all→beta→admin, colors scaled broadest→most-restrictive). Writes to `/workspaces/{slug}/config/featureFlags`. Per-user override architecture explicitly deferred as Option 2. DESIGN_DECISIONS § 46. |
| 2026-04-22 | `d029856` | **Brief B — copy cleanup + language-flag single-source** — A2: More-tab section title `browse_section` renamed Przeglądaj → Zarządzaj (PL) / Browse → Manage (EN). Fallback literals updated so new copy holds pre-i18n-load. B4+C4+J2: `LangToggle` removed from `PageHeader.jsx` (single-edit removing flag from all 22 PageHeader consumers — every tab root, ProfilePage, etc.). `LangToggle.jsx` file deleted (PageHeader was its sole importer). `LanguageSection` in MoreShell kept as Settings-canonical switch. PlayerEditModal country flags (player nationality — not locale) untouched. |
| 2026-04-22 | `67b9a49` | **Brief A — tournament setup polish (I1 / I2 / H1)** — I1: duplicate `+ Add team` CTA gated XOR (empty-state when `scouted.length === 0`, primary action row when ≥ 1). I2: Add-team modal converted to checkbox multi-select with sticky `Add N teams` footer + `Promise.allSettled` batch add + partial-failure UX (only failed rows stay checked, inline error count). H1: `NewTournamentModal` + `EditTournamentModal` divisions field `string → string[]`, toggle handler adds/removes instead of replacing, inline "select at least one" error on submit; defensive initializer reads legacy singular `tournament.division`; authoritative `divisions: []` + mirror first entry to singular `division` for legacy `ScheduleImport` reader. DESIGN_DECISIONS § 5.7. |
| 2026-04-21 | `19527a0` | **Brief 9 + Bug 3a revert (pre-Saturday polish)** — post-Brief-8 2-device test findings. Bug 1: `order: Date.now()+i` added on canonical merge docs (subscribePoints orderBy excludes field-missing docs → canonical was invisible post-merge). Bug 2 Option A: score writes removed from regular save paths (coachUid-filtered race); `endMatchAndMerge`/`endMatchupAndMerge` now write authoritative `scoreA/scoreB` from canonical outcomes. Bug 3b: false-positive "sides swapped by other coach" toast suppressed. Bug 3a: initially guarded `match.currentHomeSide` writes with `mode !== 'new'`, but that killed paintball § 2.5 auto-flip after a scored point — reverted same day. Intentional trade-off: match lists show 0:0 for active matches until End match. |
| 2026-04-21 | `30d169e` | **Brief 8 v2 — per-coach point streams + end-match merge (architectural redesign)** — replaces shared-doc chess-model with per-coach streams merged at End match. Doc ID `{matchKey}_{coachShortId}_{NNN}`; localStorage-backed `useCoachPointCounter` hook; `setPointWithId` / `setTrainingPointWithId` + `endMatchAndMerge` / `endMatchupAndMerge` in dataService. Problem A: URL entry semantics — Scout CTAs `&mode=new`, list-card taps `&point=<id>`. Problem B: streams merged per index → canonical docs `{mid}_merged_{NNN}` with `sourceDocIds` audit pointers; idempotent. Diagnostic `[BUG-B]` + `[BUG-C]` logs retained for validation (removed in Brief F). |
| 2026-04-21 | `8669b91` / `dc62f9c` / `bc6954d` | **Briefs 6 + 7 + 7-bis (Problem X incremental, § 41/§ 43)** — three surgical fixes. Brief 6: savePoint joinable condition narrowed from `status=open|partial OR otherSide has players` → `status=open|partial` only. Brief 7: edit-vs-new side pointer separation — G2 auto-swap effect guarded `if (editingId) return;` → § 41. Brief 7-bis: mirror fix applied to duplicate joinable at `startNewPoint` L852. |
| 2026-04-20 | `eb0f247` | **Documentation cleanup** — root reduced 14 → 4 `.md`, new `docs/{architecture,ops,product,archive/audits}/`, `CC_BRIEF_*` archived (28 files + INDEX), doc discipline codified (PROJECT_GUIDELINES §10, DESIGN_DECISIONS §37) |
| 2026-04-20 | `e11e845` | **Player Self-Report MVP Tier 1** — FAB + HotSheet bottom sheet in MatchPage, shot schema extension (`source: scout/self`), `breakoutVariants` team pool, email-based player identity (`useSelfLogIdentity`), onboarding modal. Firestore collection group indexes deployed |
| 2026-04-19 | (polygon SHA) | **Unified polygon zone editor** — Google-Maps-style drag/midpoint-insert/delete for Danger/Sajgon/BigMove zones, iOS Safari magnifier suppressed |
| 2026-04-19 | (multi-branch merge) | **Notes + Big Moves + Kluczowi gracze refinements** — 3 branches merged together: Coach Notes subsystem, Big Moves user-drawn zone, Kluczowi gracze multi-key sort, section renames + Lucide icons |
| 2026-04-19 | (training fix) | **Training match navigation hotfix** — PlayerStatsPage match-history respects `isTraining` flag |
| 2026-04-18 | `0f4ef8a` | **Coach Brief View** — ScoutedTeamPage redesigned to Sławek's 4 priorities above fold, confidence banner, `<SideTag>` canonical component |

See `DEPLOY_LOG.md` for fuller entries with known-issues notes.

---

## 🎯 Next on deck (priority order)

### 1. Brief G (full schema migration + rules refactor) — DEFERRED, high effort
- **Scope:** audit script (read-only Admin SDK, enumerates inconsistencies) → migration script (dry-run + execute, idempotent, backup-preserved) → consolidate `workspace.members` into `users.workspaces` as single source of truth → `firestore.rules` refactor on canonical membership check → dead-field cleanup (`*ClaimedBy`, `*ClaimedAt`, `passwordHash`, `adminUid` where redundant with `userRoles`).
- **Pre-req:** dedicated windowed session with Jacek available at every checkpoint. NOT continuous-flow compatible per brief's own risk protocol.
- **Trigger:** today's Option B shims stopped the leak (no new junk data from fresh sign-ups; legacy bad strings still survive but are unread). Will resurface when more multi-user activity hits dead-schema issues or Jacek schedules dedicated time.
- 5-checkpoint progression per parent brief's risk assessment.

### 2. Bug A + Bug C — match heatmap redesign
- **Bug A:** Team B positions + shots not visible on match heatmap. Architectural regression from single-toggle assumption.
- **Bug C:** remove coaching stats percentages (dorito/snake/disco/zeeker/center/danger/sajgon) from match view entirely — statistically noisy at small sample size, belongs only on ScoutedTeamPage aggregate.
- **Blocked on:** HTML mockup owed by Opus per DESIGN_DECISIONS §1.4 workflow (koncept → prototyp → design → kod). 2026-04-21 session closed before mockup was built.
- Related clarification needed: "nie można wejść bezpośrednio jako scout do danej drużyny" — repro steps + intended flow.

### 3. canAccessRoute completeness audit + RouteGuard sweep (Brief E follow-up)
- Pure-player currently blocked from `/profile` by default-deny branch in `canAccessRoute` (roleUtils.js:88-95).
- Extending RouteGuard to `/teams`, `/players`, `/my-issues` etc. for URL-typing defense-in-depth requires allowlist extension first (at minimum `/profile`, probably `/scouts`).
- Low priority but blocks future role-gated route additions.

### 4. Brief C Option 2 — per-user feature flag overrides
- Option 1 (workspace-wide flags + admin toggle UI) shipped 2026-04-22.
- Option 2: individual user-level override for testing/rollout (`users/{uid}.featureFlagOverrides` map layering over workspace defaults, or explicit `userIds` allowlist in audience spec).
- Requires Firestore rules audit for `users/*` admin read access.

### 5. Brief E Option 2 — SelfLog-as-tab + PlayerSelfLogPage
- Option 1 (role-gated existing tabs; pure-player sees only More) shipped 2026-04-22.
- Option 2: dedicated `PlayerSelfLogPage` at `/selflog` with player's own point history, completion status, per-match progression. New "Self Log" tab entry in AppShell TAB_DEFS. Unblocks player role from `canAccessRoute` for this route.
- Also relates to PLAYER_SELFLOG.md Tier 2 scope.

### 6. Player Self-Report Tier 2 + Integrations (carried from 2026-04-20 backlog)
- "Mój dzień" section in `PlayerStatsPage` (own points list, completion status, Tier 2 edit modal for killer/notes)
- Shot accuracy section per player (top targets, hit rate, filter by layout/tournament/global)
- `ScoutedTeamPage` hybrid view when scouted team is own team (self-reported shots layer alongside scout data)
- Tactic page shot suggestions (if current tactic schema supports shots — needs confirmation before brief)
- Rationale: Tier 1 lives now but flywheel payoff comes from letting players see their own data

### 7. User-reported F-bugs (from April PXL weekend)
- **F2 DROPPED** per 2026-04-22 user decision — quick scouting stays available in all current contexts. Removed from backlog.
- **F3:** Quick shots dual mode — verify shipped vs partial (`CC_BRIEF_QUICK_SHOTS.md` archived)
- **F4:** Sample size indicator — `CC_BRIEF_TEAM_STATS_CARDS.md` archived, verify shipped
- **F5:** Self-scouting / counter analysis — partially addressed by SelfLog hybrid view; may need own brief
- **F6:** Tournament profiles — per Jacek may be solved by quick shots dual mode
- **F7:** Training data → break selection — adjacent to SelfLog flywheel; wait for data to accumulate first

### 8. Validate Tier 1 on iPhone before Tier 2
- Still blind-coded UI — no Playwright test on device yet
- Thresholds (5 / 20) may need tuning
- Breakout collapse animation may need polish
- Could block Tier 2 if fundamentals need rework

### 9. Stale Firestore claim fields cleanup
- `*ClaimedBy` / `*ClaimedAt` fields on existing match docs — no code reads them post-Brief-F.
- Cosmetic Firestore hygiene only. Can run from Console with batch `updateDoc(deleteField())`. Harmless if deferred indefinitely.

### 10. BreakAnalyzer module (carried)
- Specs exist: `docs/architecture/BREAK_ANALYZER_SPEC.md` + `docs/architecture/BREAK_ANALYZER_DOMAIN_v2.md`
- Implementation scaffolded but needs tuning against real field data
- Opus territory per NEXT_TASKS.md (`don't touch src/workers/ballisticsEngine.js`)

### 11. Tournament tendencies analytics (carried)
- Cross-tournament lineup/player patterns
- Blocks on: sufficient scouted data volume + SelfLog maturity

---

## ⏸️ Awaiting decision (needs Jacek input)

| Topic | Question | Blocks |
|---|---|---|
| **Bug A+C mockup** | HTML mockup for match heatmap redesign — 4 toggles (Team A pos/shots + Team B pos/shots) vs team picker + data-type toggle vs segmented control. Also: completely remove coaching stats from match view, hide behind "Show advanced stats" toggle, or move lower in page hierarchy? | Brief for Bug A+C fix |
| **"Wejść bezpośrednio jako scout do danej drużyny"** | Doprecyzuj — brakuje entry pointu z match card, czy side picker został zlikwidowany zostawiając ambiguity którego team scoutujesz? | Bug A+C mockup design |
| **Brief G (full migration) scheduling** | When does full Firestore migration + rules refactor happen? Trigger: multi-user activity hitting dead schema, operational tolerance runs out, or Jacek schedules dedicated off-hours window | Whether Brief G runs soon or waits months |
| **`match.currentHomeSide` under Brief 8 architecture** (carried) | Per-coach streams store `fieldSide` per doc, yet manual flip-pill + auto-flip after scored point still write the shared `match.currentHomeSide`. Should this field be deprecated entirely, kept as shared-flip signal (current post-Bug-3a-revert behavior), or rewired to per-coach state? Today's behavior is intentional pragmatic choice, not a designed endpoint. | Post-Saturday concurrent refactor (if any); future claim-system cleanup migration |
| **`PlayerSelfReportV4.jsx` mockup** (carried) | Provide mockup or accept extrapolated UI as-is? Brief referenced it across 2 sessions but never landed in repo | Polish pass on Tier 1 + Tier 2 UI |
| **Tactic schema shots support** (carried) | Current tactic schema does NOT carry shots per-position. Add shot field to tactics, or skip tactic-page suggestions? | SelfLog Integrations (tactic suggestions task) |
| **F5 vs F6 vs F7 priority** (carried, F2 dropped 2026-04-22) | Which user-reported feature is most important pre-NXL Czechy 2026-05-15? | Which brief gets written next |
| **BreakAnalyzer ship date** (carried) | Module scaffolded but needs tuning. Block NXL release on it, or defer post-NXL? | Engineering capacity allocation |
| **Security refactor scope** (carried, partially resolved) | Option B defensive shims shipped 2026-04-22. Full rewrite (Brief G proper) still TBD — Cloud Functions cost implications, rules consolidation scope | Sequencing vs NXL deadline |

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

`docs/DESIGN_DECISIONS.md` holds 47 numbered sections + sub-sections 5.7 / 33.1 / 33.2. Most recent (newest first):

| § | Topic | Date | Notes |
|---|---|---|---|
| 47 | Role-gated tab visibility + pure-player More rule | 2026-04-22 | Brief E Option 1. AppShell TAB_DEFS with `requiredAny`; Scout/Coach/More matrix; effective-admin bypass; persisted-tab fallback effect. Pure-player `isPurePlayer` predicate hides scout/coach-level MoreSections. Route-guard sweep deferred. |
| 46 | Settings IA — Scouting section + Feature flags home + deferred per-user override | 2026-04-22 | Brief C Option 1. More tab IS the Settings surface (§ 31). New `ScoutingSection` (handedness toggle). Feature flags promoted to own admin-only MoreSection; inline enable toggle + audience cycle (all/beta/admin); writes to `/workspaces/{slug}/config/featureFlags`. Per-user overrides deferred as Option 2. |
| 45 | Members page inline role editing + profile identity single-render | 2026-04-22 | Brief D. B1 fallback chain (linkedPlayer → displayName → email → fallback; no UID fragments). B2 live role chips for admins + self-admin self-protect (§ 38.3) retained. B3 last-admin guard at chip + menu + confirm. C1/C2 ProfilePage displayName single-render rule. |
| 44 | Brief 9 polish — canonical docs, score semantics, toast suppression | 2026-04-21 | Canonical merge docs get `order: Date.now()+i`. Option A: score written only at end-match merge (0:0 during active). Bug 3b auto-flip toast suppressed. Bug 3a `modeParam !== 'new'` guard reverted same day (killed § 2.5 auto-flip). |
| 43 | URL entry semantics for scouting | 2026-04-21 | Rule 1/2/3: Scout CTA = `&mode=new` always-new, list card = `&point=<id>` edit, auto-attach fallback search removed. Brief 8 Problem A. |
| 42 | Per-coach point streams + end-match merge | 2026-04-21 | Replaces shared-doc chess-model. Doc ID `{matchKey}_{coachShortId}_{NNN}`, `useCoachPointCounter` hook (localStorage), idempotent `endMatchAndMerge` per-index lockstep. Brief 8 Problem B. |
| 41 | Edit-vs-new side pointer separation | 2026-04-21 | `point.fieldSide` snapshot vs `match.currentHomeSide` live pointer. Defense-in-depth: G2 auto-swap effect `if (editingId) return;` + savePoint post-write `&& !editingId`. Brief 7. |
| 40 | Per-team heatmap visibility toggle | 2026-04-21 | V4 chip groups per team, 2×2 toggle block, HeatmapCanvas optional `visibility` prop. Brief 3. |
| 39 | Scout score sheet — role-gated match summary | 2026-04-21 | `ScoutScoreSheet` for pure scouts; existing CoachingStats for admin/coach. Brief 2 (G3+G4). |
| 38 | Security Role System + View Switcher (v2) | 2026-04-17 (v1) + 2026-04-20 (v2) | 5 roles ARRAY per user, PBleagues ID mandatory onboarding, admin approval gate. Path A chosen. |
| 37 | Documentation discipline | 2026-04-20 | Where decisions live, CC brief lifecycle, chat-is-not-SoT rule |
| 36 | Adaptive picker thresholds | 2026-04-20 | Breakout < 5, shots < 20, weighted hit=2/miss=1/unknown=0.5 |
| 35 | Player Self-Report UI patterns | 2026-04-20 | Two-tier model, FAB, bootstrap collapse, cycle-tap shots, outcome colors, shared variants |
| 34 | Field Side Representation Standard | 2026-04-18 | `SideTag` canonical component, `COLORS.side.*`, terminology (dorito/snake/center) |
| 33 | User Accounts + Scout Ranking | 2026-04-15 | Email/password auth, scout leaderboard. **Sub-sections 33.1 (user.role deprecation) + 33.2 (canonical workspace slug shape) added 2026-04-22 by Brief G Option B.** |
| 27 | **Apple HIG Compliance — MANDATORY** | 2026-04 | Touch 44px, elevation, amber = interactive only, anti-patterns. MUST READ before any UI work |
| 18 | Concurrent scouting (claim system) — **DEPRECATED 2026-04-22** | (original April 2026) | Superseded by §42-§44. Section kept for historical context; Brief F retired the implementation (diagnostic logs + claim writes removed). |
| 5.7 | Tournament setup polish — multi-division + Add teams multi-select + single Add-team XOR | 2026-04-22 | Brief A. Data model always supported array; this fixed UI single-select bug + batch add UX + CTA dedup. |

Sections 1–26 + 28–32 cover foundational decisions (canvas, match page, tournament page, teams page, data model, delete pattern, layout wizard, ballistics, coaching stats, point summary cards, obstacle shots, player stats, HERO rank, scout/coach toggle, coach team summary redesign, obstacle play shots, metric formulas, bottom tab navigation, training mode). Full list at `grep '^## [0-9]' docs/DESIGN_DECISIONS.md`.

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
