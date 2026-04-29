# NEXT TASKS — For Claude Code
## Read docs/DESIGN_DECISIONS.md + docs/PROJECT_GUIDELINES.md first.
## Work top to bottom. Push after each task.

**Last updated:** 2026-04-30 by CC implementation (Brief E shipped — 4 phone-facing entry points to PlayerStatsPage: ProfilePage CTA + fallback, More tab MoreItem ×2, PPT footer link, PlayerStatsPage auto-default scope=training for self-view. Plus React #300 hotfix in TrainingScoutTab — hooks-rule violation from Hotfix #6.)
**Rules:** Inline JSX styles (COLORS/FONT/TOUCH from theme.js). English UI labels.
Don't touch `src/workers/ballisticsEngine.js` (Opus territory).
Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`

---

## ⏸️ AWAITING JACEK ACTION (2026-04-28 evening parking)

| Item | State | What Jacek needs to do |
|---|---|---|
| `feat/custom-squad-names` (commit `ece9246`) | Pushed to origin, NOT merged | Smoke-test 8 scenarios per `CC_BRIEF_CUSTOM_SQUAD_NAMES` STEP 4. Reply `MERGE` or report failures. |
| Auto-swap regression fix (commit `13837e4`, on main + deployed) | Live in prod, unverified | Open prod in incognito → 3 scenarios per DEPLOY_LOG entry → reply WORKS / fail / etc. |
| Tier C forward fix (commit `f604343`, on main + deployed) | Live in prod, unverified | Open prod in incognito + hard reload → app loads, no `createContext` error → confirm or report. |
| ~~KIOSK Brief A (Death Reason Taxonomy)~~ ✅ DONE 2026-04-29 | Shipped, deployed | Optional: smoke-test 7 scenarios per Brief A STEP 5 (see DEPLOY_LOG entry for `ef94637`). |
| ~~KIOSK Brief B (Player Verification lobby)~~ ✅ DONE 2026-04-29 | Shipped, deployed | Smoke-test on tablet landscape ≥ 1024×768 (8 scenarios in DEPLOY_LOG `519b34b`). E6 viewport gate means phone/portrait users see no change — coach + Tier 1 HotSheet flow unchanged there. Iteration candidates flagged. |
| ~~KIOSK Brief C (Prefill Resolver)~~ ✅ DONE 2026-04-29 | Shipped, deployed | Source A (scouting positions+shots) + Source D (coach elim) implemented. Source B (drawing) + Source C (zone narrowing) deferred — both need separate product decisions. KIOSK feature complete modulo those. See DEPLOY_LOG `f717fda`. |
| ~~Brief D (PlayerStatsPage scope=training)~~ ✅ DONE 2026-04-28 | Shipped, deployed | 4 fixes: (a) field resolution unblocks zone/bunker stats, (b) self-log + selfShots aggregation flows KIOSK data into player profile, (c) custom squad names on opponent label, (d) post-KIOSK toast with "Zobacz swój dzień" CTA → deep-links to player stats. Closes incentive loop. See DEPLOY_LOG `80cc945`. **Smoke-test:** open KIOSK on tablet → tile → save self-log → toast appears → tap CTA → player stats page shows the just-saved point with bunker/zone/shot data populated. |
| ~~React #300 hotfix (TrainingScoutTab hooks-rule violation)~~ ✅ DONE 2026-04-30 | Shipped, deployed | Hotfix #6 (b210b86) added `useMemo` + `useLiveMatchScores` AFTER two conditional returns (`if (qlMatchup)` + `if (!training)`). Hook count changed between renders → React infinite-loop recovery → #300 on training launch. Same anti-pattern as KioskLobbyOverlay split-outer/inner + ScoutTabContent commit 950ab79. Fix: hoist hooks above early returns. See DEPLOY_LOG `dd2d37a`. |
| ~~Brief E (Phone entry points to PlayerStatsPage)~~ ✅ DONE 2026-04-30 | Shipped, deployed | 4 entry points + auto-default: (1) ProfilePage CTA "📊 Moje statystyki" linked + fallback "Połącz profil żeby zobaczyć statystyki" not-linked, (2) More tab KONTO MoreItem ×2 (tournament + training), (3) PPT TodaysLogsList ghost-link "Zobacz statystyki dnia →", (5) PlayerStatsPage auto-redirect to `?scope=training&tid={latestTid}` for self-view (zero new Firestore reads — uses existing useTrainings + client filter on attendees). Gap 4 (QR/share) + Gap 6 (sub-nav) deferred. See DEPLOY_LOG `ce8c320`. **Smoke-test path:** see DEPLOY_LOG entry — 5 scenarios covering linked, not-linked, More tab, PPT footer, auto-default. |
| Source B — drawing on layout (sposób 1) | DEFERRED — separate brief | Needs UI design + storage schema. Jacek to provide screens. |
| Source C — Quick Log zone persistence | DEFERRED — separate brief | QuickLogView `zones` is local React state currently. Adding `point.<side>Data.zones` field + save flow + read in resolver = ~2-3h. |
| BunkerPickerGrid outlined-vs-selected polish | DEFERRED — polish brief | Currently simplified to state-as-selected + hint banner. § 55.5 spec calls for per-tile outline distinct from full-amber selected. ~1h. |
| KIOSK Brief B (Lobby) | **BLOCKED** | (a) Add § 40 spec — current § 40 is "Per-team heatmap toggle". (b) Provide `outputs/MOCKUP_KIOSK_v2.html` — directory `outputs/` does not exist in repo. |
| KIOSK Brief C (Prefill Resolver) | **BLOCKED** | Same as Brief B — needs § 40.4 + § 40.5 spec content + mockup file. |

**P0 still outstanding** (from end-of-MAX security audit 2026-04-25):
- 🚨 Anthropic API key rotation at console.anthropic.com (CC cannot do — needs Jacek auth). See SECURITY_AUDIT_2026-04-25 § 3.1.

**Anonymous user purge** (commit `ed855cc`, 2026-04-26) — completed; orphaned `/users/{uid}` Firestore docs intentionally retained as "Unknown scout" fallback. Smoke-test still pending non-blocking.

---

# ✅ COMPLETED (summary — do not re-implement)

Everything below is shipped and working as of April 10, 2026:

**Core:** Canvas (pinch-zoom, loupe, pan, handedness), FieldCanvas/FieldEditor/HeatmapCanvas,
half-field viewport, max-vertical sizing, landscape immersive mode, ErrorBoundary.

**Design:** Premium design system (Inter font, dark theme, design tokens, ui.jsx components),
all pages redesigned (Home, Tournament, Teams, TeamDetail, ScoutedTeam, LayoutDetail),
design-contract.js, precommit linter, review suite.

**Scouting:** MatchPage (header, half-field, toolbar, bump drag, roster grid, shot drawer,
save flow), coaching stats (dorito/snake/disco/zeeker/center/danger/sajgon),
runner visualization (▲/●), eliminated markers (✕), No Point option,
point preview on heatmap, swap sides (nextFieldSideRef), drag fixes, desktop mouse pan.

**Concurrent:** Chess model (side-safe writes, homeData/awayData split, claim system
with heartbeat/TTL, LIVE badge, shell points, auto-attach, merge view toggle,
point status tracking, duplicate prevention, independent fieldSide per coach).

**Layout:** Wizard (3-step: Basic Info → Calibrate → Vision Scan), BunkerEditorPage,
calibration (tap-to-place + sliders), Vision scan (Claude Sonnet API),
disco/zeeker draggable handles, zone drawing (danger/sajgon with save/cancel),
premium toolbar pills, landscape floating toolbar, bunker drag, sticky New Tactic,
deaths heatmap (💀), break positions heatmap (🎯), layout analytics page.

**Ballistics:** BallisticsPage, engine rewrite (triangle/cross hitboxes, shape-aware
ray casting, bunkerShapes.js, 3-channel visibility: safe/arc/exposed).

**Tactic:** Scouting-style editor, freehand drawing (persist, rAF fix), zone drawing,
second position (bump stop), shot from 2nd position, curve cycling (5 arcs),
freehand visible in layout preview.

**Teams:** Parent + child teams, division enforcement, child team picker filter.

**Tournament:** Division pills, match sections (Live/Scheduled/Completed), close/reopen
(password-protected, CLOSED badge), observed teams (👁 toggle, W/L/LIVE on home).

**Home:** Active tournament selector, categorized matches, observed teams section.

**Auth:** Squad codes per layout, viewer role (?code login), guards on write actions.

**Canvas scaling:** Mobile/desktop vh-based, HeatmapCanvas aspect preservation,
FieldCanvas outer/inner wrapper, layout page width-first.

**Misc:** Font audit (all ≥10px), ActionSheet 80dvh, shot lines 5px, zone borders 3px,
desktop toolbar stays open, freehand sync fix.

---

# 🐛 KNOWN BUGS (from user feedback, April 2026 PXL weekend)

### ~~BUG-1: fieldSide useEffect race condition~~ ✅ FIXED (April 13, 2026)
Was: useEffect on line ~183 of MatchPage.jsx re-fired on editingId clear after
save → read stale `match.currentHomeSide` → silently reverted the swap that was
just persisted. Concurrent mode side flips also had no UI feedback.
**Fix shipped:**
- `lastSyncedHomeSideRef` now guards the sync effect: on re-fires (e.g.
  editingId clearing) where `currentHomeSide` hasn't actually changed, the
  effect is a no-op.
- Swap button + savePoint's swap branch now update local state +
  `lastSyncedHomeSideRef` **before** the async Firestore write, so the
  onSnapshot round-trip is also a no-op.
- Toast `⇄ Sides swapped — other coach flipped orientation` fires when the
  sync applies an external change.
- Base indicator pills (`◀ BASE {teamName}` / `{teamName} BASE ▶`) overlay
  the canvas corners, color-coded per team, so scouts can orient instantly.

---

# 🔨 NEEDS VALIDATION
- Ballistics accuracy: engine rewritten but needs tuning against real field data
- OCR/Vision scan: works but requires user's Anthropic API key in localStorage
- Concurrent scouting: needs real 2-device test with Tymek

---

# 📋 PLANNED (needs Opus brief before CC implements)

### [DONE] 2026-04-25: Post-MAX Tier B — passwordHash + /users disabled-family rules lockdown
Deployed via ff-merge of `chore/tier-b-rules-hardening-2026-04-25` (commit `bed5d05`, 1 commit, +30/-2 LOC). Closes the two latent rules-level holes from Phase 1 SECURITY_AUDIT (P1.1 + P1.2). **Hole A:** dropped `passwordHash` from `/workspaces/{slug}` self-join `hasOnly` allow-list — closes the defense-in-depth gap where any auth user could rewrite the workspace passwordHash during enterWorkspace. Unreachable in production today (ranger1996 has passwordHash set, LoginGate retired, jacek admin via email allowlist) but worth closing. **Hole B:** replaced unrestricted `allow write` on `/users/{uid}` with explicit `allow create` (signup, unrestricted) + scoped `allow update` (allow-list `hasOnly(['displayName', 'email', 'linkSkippedAt'])`). Closes the soft-delete bypass — users can no longer self-clear `disabled` via SDK to re-enable themselves after admin softDisableUser. Admin disable path (jacek email allowlist + disabled-family hasOnly) untouched. Allow-list derived from full enumeration of every self-write site (ProfilePage.handleSaveName / skipLinkOnboarding / getOrCreateUserProfile / admin softDisableUser-reEnableUser).

**Verification (Jacek incognito post-deploy):** all 4 critical flows pass — fresh signup, self-link "Tak, to ja", ProfilePage displayName change, admin disable test user. Rules-only deploy; no client code change; no `npm run deploy` needed.

**SECURITY_AUDIT and UX_QUALITY_AUDIT updated** to mark P1.1 + P1.2 as shipped. Cumulative P1 backlog Tier B section struck through.

### [DONE] 2026-04-25: Post-MAX Tier A cleanup — .gitignore + orphaned PBLI helpers
Deployed direct to main (commit `e8abb7b`, +7/-64 LOC). Two cleanups from the post-MAX P1 backlog. (1) `.gitignore` switched from explicit `.env` + `.env.local` (with stale duplicate `.env`) to `.env*` glob + `!.env.example` whitelist — closes the re-leak window for `.env.development` / `.env.staging` siblings. (2) Deleted orphaned `parsePbliId` + `PBLI_ID_FULL_REGEX` from `roleUtils.js` and `linkPbliPlayer` from `dataService.js` (no callers; replaced by `pbliMatching.js` cascade + `selfLinkPlayer` / `adminLinkPlayer` in the 2026-04-24 sprint). `normalizePbliId` retained. Stale comment in `PbleaguesOnboardingPage.jsx` referencing the deleted function tightened. Zero behavior change.

**~~Tier A.3 still pending (Jacek action):~~** ✅ DONE 2026-04-26. CC executed bulk delete of 611 legacy anonymous Firebase Auth users via Admin SDK script (commit `ed855cc`, brief `CC_BRIEF_BULK_DELETE_ANONYMOUS_2026-04-26`). Audit + delete + re-audit (0 remaining) all green. See DEPLOY_LOG entry + SECURITY_AUDIT § 2A for full results. Script retained at `scripts/purge-anonymous-users.cjs` for periodic re-run; runbook entry added at ADMIN_RUNBOOK § 11.

### [DONE] 2026-04-25: End-of-MAX production audit — security + UX/quality + admin runbook
Deployed in 2 commits: `8396146` (Phase 1 — security audit + VisionScan.jsx env-fallback fix) + `51f3fa3` (Phase 2 — UX/quality audit + ADMIN_RUNBOOK).

**🚨 P0 ESCALATE — needs Jacek action TODAY:** Anthropic API key `sk-ant-api03-KYGNizd7Du...` leaked in public Git history (committed at `f7450b7` 2026-04-06, removed from HEAD at `4c74335f` 2026-04-20 but commit still retrievable). **Rotate at https://console.anthropic.com → Settings → API Keys.** Rotation invalidates the leaked key. History scrubbing optional (recommend skip; public exposure already cached/forked). See `docs/audits/SECURITY_AUDIT_2026-04-25.md` § 3.1.

**Inline P0 fix shipped:** `src/components/VisionScan.jsx:159` — dropped `import.meta.env.VITE_ANTHROPIC_API_KEY` fallback so a re-introduced `.env` can no longer leak via Vite inlining into the public deploy bundle. Now consistent with `OCRBunkerDetect.jsx` + `ScheduleImport.jsx`.

**Deliverables:**
- `docs/audits/SECURITY_AUDIT_2026-04-25.md` — Phase 1 report. Per-collection rules tabulation, auth flow walkthrough, secrets scan, admin operational risks. 6 P1 findings logged (none currently exploitable).
- `docs/audits/UX_QUALITY_AUDIT_2026-04-25.md` — Phase 2 report. Nav audit clean, no dead code requiring removal, component consistency = deferred polish, performance baseline acceptable (3.6 MB dist / 264 kB gzipped initial).
- `docs/ops/ADMIN_RUNBOOK.md` — load-bearing deliverable for end-of-MAX survival. 10 sections + 2 appendices. Open this when something breaks post-MAX.

**Cumulative P1 backlog (post-MAX):** 8 items in 4 tiers — see `docs/audits/UX_QUALITY_AUDIT_2026-04-25.md` "Cumulative P1 backlog" for the full breakdown. ~~Tier A quick wins~~ ✅ DONE 2026-04-25/26 (gitignore + orphaned PBLI helpers + anonymous-user purge). ~~Tier B windowed rules deploy~~ ✅ DONE 2026-04-25 (passwordHash + /users disabled-family lockdown). ~~Tier C performance: vendor manualChunks split~~ ✅ DONE 2026-04-26 (commit `e0b8ee4`, app entry chunk 263→44 KB gzip, ~83% bundle cached across app-only deploys). **Tier D Brief G territory still pending:** custom-claims admin grant, per-pid selfReports ownership.

### [DONE] 2026-04-25: 🚨 Single-coach side flip — Path X full architectural cleanup (P0)
Deployed in merge of `hotfix/single-coach-side-flip-2026-04-25` (commit `33b81fc`, 1 commit `f7a23ad`). Solo coach scouting both teams sequentially saw TEAM B point #1 open with wrong side after TEAM A save with auto-swap. Root cause: `isConcurrent` flag (`MatchPage.jsx:648`) is misnamed — fires for ANY active match scouting. So `savePoint`'s "concurrent" branch wrote `match.currentHomeSide` to Firestore on every solo save with a winner; the team-switch effect then read the polluted value and mis-oriented TEAM B's view. Fix = **Path X** (yesterday's HANDOVER decision): auto-swap state is local-only, no Firestore writes, no shared signal. READ paths anchored at constant `'left'` to ignore polluted matches. Three Path X risks audited yesterday all clear (no other consumers of `currentHomeSide`, heatmap independent, single-coach changeFieldSide is local). Concurrent multi-coach preserved — per-point fieldSide snapshots in `homeData/awayData` remain authoritative.

**Known follow-ups:**
- DESIGN_DECISIONS § 53 supersession of the 2026-04-21 Bug 3a revert (commit `29c2be1`) — next docs sweep.
- Stale `match.currentHomeSide='right'` field on existing match docs is harmless (no longer read). Console batch-delete cosmetic only.

### [DONE] 2026-04-25: 🚨 Back nav restored on Settings ZARZĄDZAJ pages (P0 — admin/coach stuck)
Deployed in merge of `hotfix/back-nav-teams-players-2026-04-25` (commit `da83244`, 1 commit `0484120`). TeamsPage + PlayersPage + LayoutsPage rendered `<PageHeader>` without a `back` prop — user reaching them via Settings → ZARZĄDZAJ had no return chevron. Regression from `a0435cb` settings-reorg (legacy nav auto-rendered back; new React Router push doesn't). Added `back={{ to: '/' }}` to all three list pages. AppShell tab persistence restores Ustawienia tab on return. Detail pages were unaffected. No new functionality, no i18n change, no PageHeader API change.

### [DONE] 2026-04-25: 🚨 Self-link missing-field rules fix (P0 — players blocked during training)
Deployed in merge of `hotfix/self-link-still-broken-2026-04-25` (commit `b47a07c`, 1 commit `d548ad3`). Real players during training session reported "Tak, to ja" failing despite the 2026-04-24 `0ba285a` defensive rule. Decision-tree audit (CC_BRIEF_SELF_LINK_DEBUG_2026-04-25) walked STEP 1 → STEP 4 and identified bug pattern #1: `resource.data.linkedUid == null` is brittle when the field doesn't exist on the doc. `addPlayer` + `CSVImport` create players WITHOUT a `linkedUid` field at all — genuinely missing, not explicitly null. Per Firebase v2 spec missing fields evaluate to null, but production behavior differs. Fix: `resource.data.get('linkedUid', null)` canonical safe form for both null-checks in the self-link branch. Rules-only deploy via `firebase deploy --only firestore:rules`. No client change. Self-edit + self-unlink branches not touched (those only fire when field exists).

**Known follow-ups:**
- If this still fails on Saturday, the diagnostic logging from yesterday's `0ba285a` will capture the next failure with full workspace shape + write payload + FirebaseError structure → paste into STEP 4 round 2.
- Defensive `.get()` could be applied to self-edit + self-unlink branches as future hardening — deferred (those paths only fire when field exists).
- Path X (deprecate `match.currentHomeSide` cross-coach sync per Brief 8 per-coach-streams) still tracked — post-Saturday.

### [DONE] 2026-04-24: 🚨 Concurrent-scout flip guard + autoEnter diagnostics + defensive self-link rule (3 fixes batched)
Deployed in merge of `fix/concurrent-scout-flip-autoenter-diag-selflink-2026-04-24` (commit `c817516`, 1 commit + rules redeploy). (a) **Concurrent-scout side flip** — Saturday-prep regression report: coach B's field flipped when coach A saved a winning point while coach B was mid-placement. Added `hasDraftData` guard to MatchPage sync effect (Path Y minimal). Full Path X architectural cleanup (deprecate `match.currentHomeSide` cross-coach sync per Brief 8 per-coach-streams) deferred to tracked HANDOVER follow-up. (b) **autoEnter diagnostics** — c81dade didn't fully resolve prod 403s; added catch-block instrumentation capturing workspace shape + payload + error structure. Next failure lands actionable. (c) **Defensive self-link rule** — carve-out loosened to permit idempotent re-claims (`linkedUid == request.auth.uid` in addition to `== null`). Rules deployed before client.

**Known follow-ups:**
- **Path X — deprecate `match.currentHomeSide`** — HIGH-VALUE architectural cleanup. Jacek confirmed "relict of the past" in tonight's session. Sync effect + updateMatch(currentHomeSide) writes in savePoint + flip pill should all go; each coach manages local `fieldSide` only. Three downstream risks to verify: (a) initial perspective on first open, (b) HeatmapCanvas observer orientation, (c) single-coach legacy. Scope ~30-45min + verification. Codify as § 53 or § 42.5 supersession of the 2026-04-21 Bug 3a revert.
- autoEnter 20:43 UTC 403 diagnostic captures pending a real user hit. Monitor console + Sentry; if orphan dotted userRoles fields confirmed as root cause, batch-delete via Firebase console on `workspaces/ranger1996`.
- Defensive self-link rule is prophylactic. If next autoEnter or self-link log reveals a different root cause, revisit.

### [DONE] 2026-04-24: 🚨 Relax PBLeagues onboarding — second signup blocker resolved (P0 URGENT)
Deployed in merge of `feat/relax-pbleagues-onboarding-2026-04-24` (commit `2f8f971`, 1 commit). After `c9d99eb` retired the team-code gate and auto-joined users to ranger1996, users STILL hit the legacy strict-NNNNN-NNNN regex + dead-end "Nie znaleziono gracza" branch on `PbleaguesOnboardingPage`. Rewrote the page to render `<LinkProfileModal>` (reused verbatim from `fa2f15c`) inside the existing shell — same 5-priority cascade, same "Czy to ty?" confirm, same "Pomiń na razie" skip fallback. Zero logic duplication. Skip writes `users/{uid}.linkSkippedAt`; `App.jsx` gate updated (`if (!linkedPlayer && !userProfile?.linkSkippedAt)`). Link uses `selfLinkPlayer` for symmetry with ProfilePage. `onPlayerLinked` migration fires afterwards. No rules change. Legacy `parsePbliId` + `linkPbliPlayer` kept in place but no longer called from UI.

**Known follow-ups:**
- `pbliIdFull` not written via the new link path. If a user types `61114-8236`, the full form isn't preserved. Admin can fill via Členkowie. If this becomes a real need, either teach `selfLinkPlayer` to accept an optional pbliIdFull or detect valid full form client-side and opt into `linkPbliPlayer`.
- Legacy `parsePbliId` / `linkPbliPlayer` / `PBLI_ID_FULL_REGEX` left in `roleUtils.js` + `dataService.js` since the UI no longer imports them. Safe to remove in a follow-up cleanup if they stay unused for a sprint.
- `linkSkippedAt` is a boolean-like flag (only its existence matters). Admin can null it via Firestore console to force-re-onboard a user if needed. Not exposed in Členkowie UI — add if it becomes a real workflow.

### [DONE] 2026-04-24: 🚨 Retire team-code + auto-join ranger1996 + members panel audit (P0 URGENT)
Deployed in merge of `feat/retire-team-code-auto-join-2026-04-24` (commit `c9d99eb`, 1 commit). 100% of new users were blocked — signup → legacy "Team code" screen → typed `Ranger1996` → "Permission denied". `LoginGate` DELETED. WorkspaceProvider now auto-enters the default workspace (`userProfile.defaultWorkspace` or `DEFAULT_WORKSPACE_SLUG` fallback) as soon as `user` + `userProfile` resolve. New `<AutoEnterErrorScreen>` surfaces failures with sign-out escape. Password-gated `enterWorkspace(code)` path preserved for admin workspace-switch. Members panel Variant 3 surface: `useUserProfiles` returns `createdAt`, active members sorted desc, green "Nowy" badge on ≤7d joiners (non-interactive → green not amber, § 27 compliant), section header sub-count "N nowych w tym tygodniu". Rules: no change — writes stay in the existing self-join envelope.

**Known follow-ups:**
- Legacy users with no `createdAt` sort to the bottom. Low priority; could add a "no timestamp" pill if it confuses admin.
- `DEFAULT_USER_ROLES = ['player']` — admin still manually assigns scout/coach/admin via Members panel for specific users.
- Legacy user with no sessionStorage AND pre-§49 user doc (missing `defaultWorkspace`) falls back to DEFAULT_WORKSPACE_SLUG unconditionally per Variant 3. If Jacek wants workspace-picker UX for multi-workspace future, it's a separate brief.

### [DONE] 2026-04-24: Step 5 sticky + Coach live-score + PPT unlinked-mode (3 fixes batched)
Deployed in merge of `feat/coach-parity-step5-sticky-ppt-unlinked-2026-04-24` (commit `fa2f15c`, 3 commits + Firestore rules redeploy). (1) **Step 5 sticky CTA** — pinned "Zapisz punkt" to viewport bottom (mirrors Step 3 fix from `34755ce`). (2) **Coach live-score parity** — extracted `useLiveMatchScores` to `src/hooks/useLiveMatchScores.js`, wired CoachTabContent (closes the symmetry gap from P0 Fix 1 commit `629edc8`). (3) **PPT unlinked-mode** (option (a) from relax-player-linking Checkpoint 1 audit) — new `pendingSelfReports` collection + Firestore rule + service dual-path + offline-queue mode-namespacing + `onPlayerLinked` migrate-on-link helper wired into both ProfilePage and PbleaguesOnboardingPage link paths. UI: hard guard on `playerId` removed; `WizardShell` + `TodaysLogsList` accept `uid` and branch storage; new translucent-amber unlinked banner on both surfaces routes to `/profile`. `usePPTIdentity` returns `uid` and shows ALL workspace trainings to unlinked users.

**Known follow-ups:**
- `pendingSelfReports` not included in `getLayoutShotFrequencies` collection-group query — crowdsource picker doesn't see unlinked shots until migration. Trade-off documented in DEPLOY_LOG.
- Unlinked users see ALL workspace trainings (no team filter). Adequate for v1; "for me / any" toggle is a cheap follow-up if it becomes noisy.
- Migration is per-link with no auto-retry. Cloud Function trigger on `players/{pid}.linkedUid` change would be production-grade; deferred.
- ScoutTabContent + CoachTabContent now share `useLiveMatchScores` — any future change to listener semantics lands in one place.

### [DONE] 2026-04-24: 🚨 Relax player linking — PBLI cascade + confirm + skip (P0 URGENT)
Deployed in merge of `feat/relax-player-linking-2026-04-24` (commit `83c929b`, 1 commit). Real users blocked from self-linking via ProfilePage due to PBLI ID format mismatches (legacy matcher didn't strip `#`, short-circuited pbliIdFull lookups). Replaced substring matcher with 4-priority cascade in new `src/utils/pbliMatching.js`: exact pbliId / exact pbliIdFull / first-segment / substring. LinkProfileModal rewritten as 3-state in-place swap (list / confirm / no-match) with ALWAYS-required "Czy to ty?" confirmation before write + "Pomiń na razie" skip-link CTA. Defensive write-side normalize in PlayerEditModal + CSVImport. PPT empty-state gains prominent "Połącz teraz" CTA routing to ProfilePage. Shared modal means Členkowie admin panel picks up same behavior (with confirm gate). **Option B chosen** per Checkpoint 1 audit — PPT unlinked mode DEFERRED (data-model + rules scope); shipping matching/confirm/skip-link first matches Saturday priority.

**Known follow-ups:**
- PPT unlinked mode (~2-3h): new `/users/{uid}/selfReports/{sid}` rule + dual-write service path + dual-read hook merge + migration-on-link. Follow-up brief if users complain about "can't log pre-link".
- Admin bulk-linking in Členkowie now has one extra confirm tap. Add `quickMode` prop to LinkProfileModal if that workflow becomes real.
- Priority 5 name-similarity (Levenshtein) skipped — existing nickname/name substring covers the realistic case.

### [DONE] 2026-04-24: 🚨 React #310 crash in tournament scouting (P0 BLOCKER)
Deployed in merge of `hotfix/scouting-react-310-crash-2026-04-24` (commit `bbad249`, 1 commit). Tournament Scout view crashed with React #310 immediately on open — entire scouting flow unreachable, blocking Saturday usage. Root cause: P0 Fix 1 (commit `629edc8`) added `useMemo(liveCandidateIds)` + `useLiveMatchScores(...)` hooks at lines 223 / 227 of `ScoutTabContent.jsx`, BELOW the existing `if (!tournament) return` early return at line 141. On first render the guard fired (17 hooks ran); next render past the guard ran 19 → hook-count mismatch. Fix: hoist the two live-score hooks above the guard. Functional behavior preserved — no revert needed; P0 Fix 1's live-score feature still works end-to-end. Other scouting files audited (CoachTabContent, CompletenessCard) — no similar violations.

### [DONE] 2026-04-24: PPT hotfix follow-up — Step 1 dedup + Step 3 sticky CTA
Deployed direct to main (commit `34755ce`). Two follow-ups from same-day iPhone validation of the prior PPT hotfix batch. (A) **Step 1 dedup** — mirrored the Step 3 fix into `Step1Breakout.jsx` (bootstrap path was hitting the same twin-cell bug as Step 3 did). (B) **Step 3 "Dalej →" pinned** — § 48.3 spec called for sticky footer but implementation rendered the CTA inline; pinned to viewport bottom with `position: fixed` + safe-area inset + gradient fade. 120px spacer reserves room under the footer so the last grid row remains scrollable into view.

### [DONE] 2026-04-24: PPT hotfix batch — sticky training + shots picker dedup
Deployed in merge of `hotfix/ppt-training-sticky-shots-dedup-2026-04-24` (commit `31c1f7d`, 2 commits). Two PPT regressions surfaced by Jacek's iPhone validation pre-Saturday training. (1) **Fix 1 sticky training selection** — pre-fix the picker re-appeared on every "+ Nowy punkt" tap when liveTrainings.length !== 1. New `src/utils/pptActiveTraining.js` (date-stamped localStorage), entry logic prioritizes sticky over showList/single-LIVE inference, `handleSave` resets state in-place + bumps local pill count + inline toast (no navigation), training pill becomes the "Zmień trening" affordance (clears sticky + forces picker), Step 1 back arrow uses `?leave=1` to break the sticky-redirect loop. (2) **Fix 2 shots picker dedup** — `bunkerListFromLayout` only filtered `role==='mirror'` but `layout.bunkers` can carry duplicate entries per `positionName` (legacy docs without `role`, or BunkerEditorPage's master+mirror persistence with shared name). `BunkerPickerGrid` keys order-badges by `positionName` → twin-badge symptom. Defensive first-write-wins dedupe in Step 3's local helper. **Spec deviations:** "Zmień trening" implemented as extension of existing pill rather than separate link (§ 27 anti-pattern avoidance); save flow uses in-place state reset rather than navigate-to-wizard-URL (avoids flash + round-trip).

**Known follow-ups:**
- ~~Step 1 bootstrap dedup~~ — DONE in `34755ce` follow-up.
- TodaysLogsList view now only reachable via Step 1 back arrow + `?leave=1`. Pill counter shows `#N pkt dziś` inline so visibility preserved.
- `useMemo` reads localStorage on every teamTrainings change. Cheap; no observable cost.
- Step 5 "Zapisz punkt" CTA is also inline (not sticky). § 48.3 spec calls for sticky there too. Cheap symmetry fix if Jacek hits the same scroll-off issue on Step 5.

### [DONE] 2026-04-24: ProfilePage hotfix batch — 3 regressions
Deployed in merge of `hotfix/profile-page-regressions-2026-04-24` (commit `04ff7fc`, 3 commits). Three regressions on Mój profil surfaced by iPhone validation, batched into a single deploy. (1) **Fix 1 linked-player self-claim restored (§ 49.8 Path A)** — § 33.3 ProfilePage shipped without unlinked-state UI. Added empty-state + "Połącz z profilem gracza" CTA reusing admin `LinkProfileModal`; linked state unchanged except new "Rozłącz" row on separate surface (§ 27 anti-pattern avoidance, § 50.3 Wyjdź precedent). New `ds.selfLinkPlayer` (transactional, surfaces ALREADY_LINKED) + `ds.selfUnlinkPlayer` — no rules change needed (self-link + self-unlink carve-outs from § 33.3 + § 50.3 already whitelist exactly these writes). (2) **Fix 2 missing i18n keys** — `t('key') || 'fallback'` short-circuits to raw key. Added full `profile_roles_*` + `profile_player_*` + `profile_claim_*` + `profile_unlink_*` sets in PL+EN. (3) **Fix 3 remove "Podgląd: Admin" floating pill** — removed `<ViewAsIndicator />` from App.jsx, neutralised `ViewAsContext` (always null + clears stale sessionStorage on mount), replaced `ViewAsPill` in ADMIN settings with new `ViewAsPlaceholder` (toast "Funkcja wkrótce"). Old ViewAs* files kept on disk for easy revival. **Spec deviation:** § 50.1 kept ViewAsPill functional in ADMIN; hotfix brief updated direction toward placeholder.

**Known follow-ups:**
- § 50.1 DESIGN_DECISIONS entry is now stale — either codify the placeholder-only state or revive the feature.
- ViewAs feature dormant, not deleted. Admin loses role-impersonation preview surface until revived.
- `navigate` import in ProfilePage.jsx is unused (pre-existing, untouched).

### [DONE] 2026-04-24: P0 micro-hotfixes batch
Deployed in merge of `hotfix/p0-batch-2026-04-23` (commit `629edc8`, 3 commits). Three independent fixes batched into one deploy: (1) **Scout card score** — useLiveMatchScores hook subscribes to subscribePoints per non-closed match, derives {a,b} via canonical matchScore helper extracted to utils/helpers.js, MatchCard accepts liveScore prop. Side-effect fix: LIVE/Scheduled classification bug (same Brief 9 Bug 2 root cause). (2) **Side percentages removed from heatmap** for all roles — CoachingStats block deleted from MatchPage; computeCoachingStats function preserved for ScoutedTeamPage. (3) **releaseClaim ReferenceError** — two orphan call sites in MatchPage back handlers (Brief F leftover). `grep releaseClaim` now returns zero.

**Known follow-ups:**
- CoachTabContent has the same Scout-card score bug — out of brief scope, cheap symmetry fix if needed
- Brief 9 Bug 2 write-side decision left intact (race avoidance preserved)

### [DONE] 2026-04-24: Settings menu reorg + nav cleanup + Członkowie full UX (§ 50)
Deployed in merge of `feat/settings-reorg-nav-cleanup` (commit `0fe8739`, 4 commits across 3 checkpoints). Six-section Settings menu (SESJA / ZARZĄDZAJ / SCOUTING / WORKSPACE / KONTO / ADMIN) per Jacek spec with strict role gating per § 49. Tab "More" → "Ustawienia". Legacy `BottomNav.jsx` deleted; AppShell role-tab bar is now the only bottom nav (Scout/Coach/Gracz/Ustawienia). Wyjdź workspace flow added (`ds.leaveWorkspaceSelf` + ConfirmModal + last-admin guard) — Firestore rules carve-outs for self-leave on workspace + self-unlink on player. **Członkowie full UX**: new `/settings/members/:uid` UserDetailPage with admin link override (LinkProfileModal — search players, conflict surface, atomic re-link via `ds.adminLinkPlayer`), unlink, deliberate role edit, soft-delete via `users/{uid}.disabled` flag (rule via ADMIN_EMAILS allowlist). AppRoutes bootstrap watches the disabled flag and renders DisabledAccountScreen. Four spec deviations documented in DEPLOY_LOG.

**Known follow-ups (§ 50.7):**
- Per-workspace admin check on `/users/{uid}` writes (replace ADMIN_EMAILS allowlist, requires custom claims)
- Server-side Firebase Auth deletion (true delete, requires Admin SDK + Cloud Function)
- Coach/staff profile entities (only player profiles exist today)
- Toast for legacy URL clicks (currently no redirect — pages remain reachable from Settings)
- DRY between MoreTabContent + TrainingMoreTab helpers (Training* prefix duplication)

### [DONE] 2026-04-23: ProfilePage roles + linked-player self-edit (§ 33.3)
Deployed in merge of `feat/profile-player-section` (commit `0da83b4`, deploy log `7e69a2f`). ProfilePage now renders read-only Roles section (`RoleChips` from canonical `useWorkspace().roles` resolver) and a 6-field self-edit form for the linked player (nickname/name/number/age/nationality/favoriteBunker) when the active workspace contains a player doc with `linkedUid === auth.uid`. Team / PBLI ID / role / class stay admin-only via Firestore rules `affectedKeys.hasOnly([...])` whitelist on `/players/{pid}` update. User-doc photoURL editor *removed* — multi-player reality means a single avatar URL doesn't fit (Jacek interrupt). Firestore rules deployed via `firebase deploy --only firestore:rules` before client merge.

### [DONE] 2026-04-23: Unified auth + roles + tab visibility (§ 49)
Deployed in merge of `feat/auth-roles-unified`. New users auto-assigned to ranger1996 workspace + `['player']` role on signup. Strict per-role tab visibility matrix (admin/coach/scout/player/viewer-legacy). New Gracz tab routes to `/player/log`. PPT Firestore rules hotfix deployed alongside (selfReports subcollection + collection-group read). Admin panel already handles the new model (Path A verified). **Brief E Option 2 (PPT reachability) wchłonięte — DONE.** Migration policy: new users only; existing users untouched until admin reassigns.

### [DONE] 2026-04-23: Player Performance Tracker (PPT) — full product
Deployed in merge of `feat/player-performance-tracker` (7 commits, Tier 2 / 5 checkpoints). Route `/player/log` picker + `/player/log/wizard` 5-step wizard + today's logs list + offline queue. Firestore indexes deployed via `firebase deploy --only firestore:indexes`. Spec lives in `docs/DESIGN_DECISIONS.md § 48` + `docs/product/PPT_MOCKUP.md`. Brief pasted inline (no archive file). iPhone validation pending.

**Known follow-ups:**
- Role gating (Brief E Option 2) — required for pure-player reachability
- Matchup-matching product — coach-side assignment of orphan `selfReports`
- Post-save list row edit/delete (§ 48.10 deferred)

### From user feedback (F1-F7):
1. **~~F1+F2: Side confusion fix~~** → ✅ **FIXED** — BUG-1 patched by CC (lastSyncedHomeSideRef, swap toast, base indicator pills)
2. **F3: Quick shots dual mode** → **ACTIVE: `CC_BRIEF_QUICK_SHOTS.md`** (zone toggles + precise drill-down)
3. **F4: Sample size indicator** → **ACTIVE: `CC_BRIEF_TEAM_STATS_CARDS.md`** (n=X on tournament team cards)
4. **Match flow redesign** → **ACTIVE: `CC_BRIEF_MATCH_FLOW.md`** (three-level nav, eliminate side picker, split-tap match cards, match review page, point summary bar)
5. **F5: Self-scouting** — scout own team + counter analysis view
6. **F6: Tournament profiles** — may be solved by quick shots (quick vs deep modes)
7. **F7: Training data → break selection** — practice data informing break choices

### Features:
- BreakAnalyzer module (spec: BREAK_ANALYZER_SPEC.md, BREAK_ANALYZER_DOMAIN_v2.md)
- Tournament tendencies (team/lineup/player level analytics)
- Practice tournament type (ad-hoc lineups, no player history impact)
- Security Phase 3: server-side admin verification

---

# 🧹 Post-Saturday cleanup (after NXL Czechy 2026-04-25)

Tech-debt + investigation items surfaced during Brief 6-9 pre-Saturday sprint. None are Saturday-blocking; schedule after match validation.

### Brief 10 — enroll/membership cleanup (tech debt)
- Workspace ID case normalization (`users/{uid}/workspaces[0]` vs actual doc casing)
- Role field: migrate from comma-separated string `"scout,coach,admin"` to array
- Sync `users.workspaces` array ↔ `workspaces/{slug}.members` array (currently can drift)
- Audit `pendingApprovals` cleanup
- Problem manifested in 2-device test: biuro user had workspace "Ranger1996" but doc is `workspaces/ranger1996` (lowercase). Required manual Firestore edit to grant membership.

### Diagnostic logs removal (BUG-B / BUG-C)
- After Saturday validation confirms concurrent scouting works end-to-end
- Remove `[BUG-B]` and `[BUG-C]` console.log statements from MatchPage.jsx
- Keep in prod during Saturday match itself (useful if something breaks on real devices)
- Target: Sunday 2026-04-26 cleanup PR

### Claim fields retirement
- `match.homeClaimedBy`, `awayClaimedBy`, `homeClaimedAt`, `awayClaimedAt` fields
- Still written on side selection but no longer used for routing under Brief 8 (per-coach streams have own identity via coachUid)
- Safe to retire: stop writing + lazy cleanup
- Low priority — harmless if left

### Investigation: `match.currentHomeSide` necessity under Brief 8
- See DESIGN_DECISIONS § 44.5
- Question: should flip pill update only local state with no Firestore write?
- Currently shared between coaches via match doc, which introduces surprising semantics
- Not a bug, but architectural cleanup candidate

### Brief 8/9 CC briefs archiving verification
- Verify CC moved these to `docs/archive/cc-briefs/`:
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_6.md (Problem X narrow) ✅ archived
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_7.md (Fix Y) ✅ archived
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_7bis.md (L852 mirror) — informal, no brief file written; one-line mirror fix documented in commit message `257c80b`
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_8.md (per-coach streams v2) ✅ archived
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_9.md (polish) ✅ archived
- Per DESIGN_DECISIONS § 37.3 CC brief lifecycle
- Status verified 2026-04-21 — all briefs with files are in archive.

---

# 📦 BACKLOG (see IDEAS_BACKLOG.md — do NOT implement without instruction)
- Dark/light toggle, settings page, colorblind UI toggle
- Undo stack, tactic templates, direct manipulation drag
- Export CSV/Excel, print layout with overlays
- OffscreenCanvas heatmap, SharedArrayBuffer ballistics
- ARIA/WCAG remaining, haptic feedback, keyboard shortcuts
- Paintball IQ, body count analysis, agentic counter explanations
- Onboarding tunnel, competitive analysis
