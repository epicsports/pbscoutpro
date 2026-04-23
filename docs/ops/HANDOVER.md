# Session Handover — PbScoutPro

> **Purpose:** Living state-of-the-project for Opus chats (architect / strategy sessions). Read this before drafting any CC brief or making decisions about direction.
>
> **This replaces the static 2026-04-15 snapshot** (old version history accessible via `git log docs/ops/HANDOVER.md`). New model: updated at the end of every Opus session via a patch committed to this file.

**Last updated:** 2026-04-23 by CC implementation (PPT + AUTH_ROLES_UNIFIED — two Tier-2 multi-checkpoint products)
**Live app:** https://epicsports.github.io/pbscoutpro
**Repo:** https://github.com/epicsports/pbscoutpro
**Main HEAD at last update:** `18be720`

---

## 🚧 Currently in flight

**Nothing active.** Two Tier-2 products shipped 2026-04-23 (PPT + AUTH_ROLES_UNIFIED) with full checkpoint review; no stacked WIP branches. Brief E Option 2 wchłonięte into AUTH_ROLES_UNIFIED's Gracz tab.

**Carry-over items from these sessions (not blocking, no active work):**
- **Brief G proper (full schema migration + rules refactor) — STILL DEFERRED.** AUTH_ROLES_UNIFIED introduced a dual-path reader (`workspace.userRoles` preferred, `users/{uid}.roles` bootstrap fallback). Works today; adds cognitive load. Full unification still wants its own dedicated off-hours window with Firebase Admin SDK.
- **Brief C Option 2** — per-user feature flag overrides. Workspace-wide audience-rule model shipped in Option 1; per-user overrides still deferred.
- **canAccessRoute completeness audit + RouteGuard sweep** — pure-player blocked from `/profile` by default-deny; allowlist extension needed before wider URL-level gating can ship safely. Low priority, isolated.
- **Bug A + Bug C** (per Jacek, 2026-04-21 iPhone validation) — Bug A: Team B positions + shots not visible on match heatmap. Bug C: remove coaching stats percentages from match view entirely. Blocked on HTML mockup owed by Opus per § 1.4 workflow.
- **Stale `*ClaimedBy` / `*ClaimedAt` Firestore field cleanup** — cosmetic hygiene; no code reads them. Run from Console when convenient.
- **selfReports ownership tightening (§ 49.11)** — current PPT rules gate on `isPlayer(slug)`, not on `pid` matching caller's linked player. Invited-workspace model contains attack surface; tightening is defense-in-depth, not urgent.
- **workspace.userRoles self-write diff gap (§ 49.11)** — pre-existing latent privilege-escalation risk in the self-join envelope update rule. Not introduced by AUTH_ROLES_UNIFIED; flagged there for visibility. Fix = field-value validation in rules.
- **Matchup-matching product** (§ 48.10) — coach-side workflow to assign orphan PPT selfReports to matchup/point. Separate product brief when PPT usage demands it.
- **PPT iPhone validation** — PPT shipped 2026-04-23 without device validation (`GO merge + deploy` came before iPhone test). PPT rules hotfix landed same day via AUTH_ROLES_UNIFIED, unblocking writes. Full user-path walkthrough still pending.

Next active work starts when Jacek drops the next brief or brings a mockup for Bug A+C.

---

## 🚢 Recently shipped (2026-04-13 → 2026-04-23)

Three sprint days: **2026-04-21** (concurrent scouting architectural redesign pre-Saturday), **2026-04-22** (backlog batch — 7 briefs A–G end-to-end), **2026-04-23** (two Tier-2 multi-checkpoint products). Chronological, newest first:

| Date | Deploy commit | Summary |
|---|---|---|
| 2026-04-23 | `18be720` | **Brief AUTH_ROLES_UNIFIED — user-doc roles + strict tab matrix (§ 49)** — 4 checkpoints. User-doc schema adds `roles: string[]` (bootstrap) + `defaultWorkspace: 'ranger1996'`. `enterWorkspace` auto-approves for default workspace (mirrors roles, skips pending). Canonical role resolver: `workspace.userRoles[uid]` (authoritative) → `userProfile.roles` (bootstrap) → `[]`. **Strict tab visibility matrix replaces § 47 permissive** — Scout/Coach/Gracz/More each gated by single-role `requiredAny`. **New Gracz tab** (🏃, between Coach and More) routes to `/player/log` on tap; Brief E Option 2 wchłonięte. **Viewer role retired** — new `ASSIGNABLE_ROLES` = 4 roles; legacy viewer data preserved via `ROLES` (5). **PPT Firestore rules hotfix** folded in — selfReports subcollection + collection-group read rules deployed via `firebase deploy` at Checkpoint 2; § 48 had shipped without them and was default-deny-blocked in prod. Migration policy: new users only. |
| 2026-04-23 | `f8416d7` | **Brief PPT_MASTER — Player Performance Tracker (§ 48)** — Tier 2, 5 checkpoints, 21 files, +3800 lines. Full 5-step wizard for pure-player performance logging during training. Route `/player/log` (picker or today's list) + `/player/log/wizard?trainingId=X` (5 steps). `createSelfReport` writes to `/workspaces/{slug}/players/{pid}/selfReports/{auto}` per § 48.5 schema. Adaptive pickers (bootstrap vs mature per § 48.6). Offline queue (`pptPendingQueue.js` + `usePPTSyncPending`) flushes on `window.online` + route changes. Glove-friendly touch targets (88/76/72/64/44 — 2× Apple HIG min). Reusable `BunkerPickerGrid` shared between Step 1 + Step 3. Firestore composite index `(layoutId, breakout.bunker, createdAt desc)` deployed via `firebase deploy --only firestore:indexes` on merge. **iPhone validation still pending** as of HANDOVER update. |
| 2026-04-22 | `afb47c5` | **Brief G Option B — role + membership defensive shims** — `getOrCreateUserProfile` stops writing junk `role` string; `parseRoles()` shim accepts array/string/undefined; session-restore slug normalization via existing `slugify()`. Zero Firestore data migration. § 33.1 + § 33.2 codify deprecation. |
| 2026-04-22 | `57fc3e6` | **Brief F — concurrent scouting cleanup** — ~40 BUG-B/C diagnostic logs removed + claim system retired (homeClaimedBy/At + heartbeat + side-picker LIVE state). § 18 DEPRECATED. Net −232 lines. |
| 2026-04-22 | `f6d4910` | **Brief E Option 1 — SessionContextBar removal + role-gated tabs** — inline bar function deleted; TAB_DEFS gets requiredAny per tab; pure-player sees only More. F2 (quick scouting only in training) explicitly dropped. |
| 2026-04-22 | `e7b3f78` | **Brief D — Members + Mój profil targeted fixes** — `useUserProfiles` hook, inline role chip toggles with last-admin guard, Remove-from-workspace destructive styling + expanded confirm body, ProfilePage displayName dedup. |
| 2026-04-22 | `3688786` | **Brief C Option 1 — Scouting MoreSection + Feature flags inline edit** — handedness toggle (first UI for the long-existing localStorage key); Feature flags promoted to admin-only MoreSection with inline enable toggle + audience cycle pill. |
| 2026-04-22 | `d029856` | **Brief B — copy cleanup + language-flag single-source** — Przeglądaj→Zarządzaj; LangToggle removed from PageHeader (affects all 22 pages); LanguageSection in More stays canonical. |
| 2026-04-22 | `67b9a49` | **Brief A — tournament setup polish (I1 / I2 / H1)** — duplicate Add team CTA XOR-gated; Add-team modal multi-select with batch add; NewTournamentModal + EditTournamentModal multi-division. |
| 2026-04-21 | `19527a0` | **Brief 9 + Bug 3a revert** — canonical order; Option A score semantics; auto-flip toast suppression; 3a guard reverted same day. |
| 2026-04-21 | `30d169e` | **Brief 8 v2 — per-coach point streams + end-match merge (architectural redesign)** — doc IDs `{matchKey}_{coachShortId}_{NNN}`; idempotent merge; URL entry semantics. |
| 2026-04-21 | `8669b91` / `dc62f9c` / `bc6954d` | **Briefs 6 + 7 + 7-bis — surgical fixes** — savePoint joinable narrowed; edit-vs-new side pointer separation; L852 mirror. |
| 2026-04-20 | `eb0f247` | **Documentation cleanup** — root reduced 14 → 4 `.md`, new `docs/{architecture,ops,product,archive/audits}/`, 28 CC briefs archived. |
| 2026-04-20 | `e11e845` | **Player Self-Report MVP Tier 1** — FAB + HotSheet bottom sheet in MatchPage. |
| 2026-04-19 | (polygon SHA) | **Unified polygon zone editor** — Google-Maps-style drag/midpoint-insert/delete; iOS magnifier suppressed. |
| 2026-04-19 | (multi-branch) | **Notes + Big Moves + Kluczowi gracze refinements** — Coach Notes, BigMoves zone, multi-key sort, section renames + Lucide icons. |
| 2026-04-19 | (training fix) | **Training match navigation hotfix** — PlayerStatsPage respects `isTraining` flag. |
| 2026-04-18 | `0f4ef8a` | **Coach Brief View** — ScoutedTeamPage Sławek's 4 priorities; `<SideTag>` component. |

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

### 5. ~~Brief E Option 2 — SelfLog-as-tab + PlayerSelfLogPage~~ — **DONE 2026-04-23**
- Wchłonięte into Brief AUTH_ROLES_UNIFIED Checkpoint 3 (§ 49). Gracz tab (🏃, requires `player` role) now routes to `/player/log` (PPT). Players reach PPT via the bottom nav; direct-URL entry is no longer the only path.
- Separate `PlayerSelfLogPage` was never built — Gracz tab re-uses the existing PPT `/player/log` surface (picker + today's list + wizard).

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

### 12. Matchup-matching product (§ 48.10 + § 49.11 follow-up)
- Coach-side workflow to assign orphan PPT `selfReports` (`matchupId: null`, `pointNumber: null`) to matchup/point. Unblocks coach analytics of player self-reported data.
- Scope: new admin/coach tool, likely inside ScoutedTeamPage or MatchPage. Reads uncategorized selfReports + matches them to canonical point ids.
- Waits on PPT usage data accumulating first — no point building this until a player has logged enough points that matching matters.

### 13. selfReports ownership tightening (§ 49.11)
- Current `match /selfReports/{sid}` rules gate on `isPlayer(slug)`, not on `pid` matching the caller's `linkedUid`. Defense-in-depth improvement.
- Workspace-invited model contains attack surface today — this is future-proofing, not urgent.

### 14. workspace.userRoles self-write diff gap (§ 49.11 — pre-existing)
- The self-join envelope update rule in `firestore.rules` allows a user to write arbitrary values to their own `userRoles[uid]` slot during enterWorkspace. Latent privilege-escalation risk.
- Not introduced by any recent brief; surfaced during § 49 audit.
- Fix = field-value validation in rules (e.g. `hasOnly(['player'])` on non-admin writes).

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

`docs/DESIGN_DECISIONS.md` holds 49 numbered sections + sub-sections 5.7 / 33.1 / 33.2 / 35.5 (rewritten) / 35.7. Most recent (newest first):

| § | Topic | Date | Notes |
|---|---|---|---|
| 49 | Unified auth + roles + tab visibility | 2026-04-23 | Brief AUTH_ROLES_UNIFIED (4 checkpoints). `users/{uid}.roles` bootstrap default + `defaultWorkspace: 'ranger1996'` scalar pointer. `enterWorkspace` auto-approves for default workspace (mirror + skip pending). Canonical role resolver: workspace.userRoles (non-empty) → userProfile.roles → []. **Strict tab matrix** replaces § 47 permissive — Scout/Coach/Gracz/More each gated by single-role `requiredAny`. New Gracz tab (🏃, routes to `/player/log`). Viewer retired from `ASSIGNABLE_ROLES` (ROLES kept for legacy parse). **PPT Firestore rules hotfix** folded in (§ 48 had shipped without them). Migration policy: new users only; existing untouched. Supersedes § 47 + wchłonie Brief E Option 2. |
| 48 | Player Performance Tracker (PPT) — wizard flow + training picker | 2026-04-22 (spec) / 2026-04-23 (shipped) | Brief PPT_MASTER (Tier 2, 5 checkpoints). Full 5-step wizard for pure-player performance logging. Route `/player/log` (picker + today's list) + `/player/log/wizard?trainingId=X`. `createSelfReport` → `/workspaces/{slug}/players/{pid}/selfReports/{auto}` with § 48.5 schema. Adaptive pickers (bootstrap vs mature, thresholds 5 player-logs / 20 layout-shots). Offline queue via `pptPendingQueue` + `usePPTSyncPending` (flush on online + route change). Glove-friendly touch targets (88/76/72/64/44). Firestore composite index `(layoutId, breakout.bunker, createdAt desc)` deployed at merge. `BunkerPickerGrid` shared between Step 1 + Step 3. |
| 47 | Role-gated tab visibility + pure-player More rule (§ 47 permissive — **superseded by § 49 strict** 2026-04-23) | 2026-04-22 | Brief E Option 1. AppShell TAB_DEFS with `requiredAny`; Scout/Coach/More matrix; effective-admin bypass; persisted-tab fallback effect. Pure-player `isPurePlayer` predicate hides scout/coach-level MoreSections. Route-guard sweep deferred. |
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
| 35.5 / 35.7 | Player Self-Report outcome states + two-product scope clarifier | 2026-04-22 (rewritten for PPT) | § 35.5 rewrite: 3-state outcome enum (alive / elim_break / elim_midgame). § 35.7: clarifies § 35 patterns apply to BOTH HotSheet (Tier 1) AND PPT. Brief PPT_MASTER Checkpoint 1 docs. |
| 33 | User Accounts + Scout Ranking | 2026-04-15 | Email/password auth, scout leaderboard. **Sub-sections 33.1 (user.role deprecation) + 33.2 (canonical workspace slug shape) added 2026-04-22 by Brief G Option B.** Further extended by § 49 (2026-04-23) — new `users/{uid}.roles` plural bootstrap + `defaultWorkspace` pointer; `/users/{uid}.role` singular stays deprecated. |
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
