# NEXT TASKS — Canonical board for PbScoutPro

> **Canonical-board rule.** If something is *actionable and open*, it lives **here**. `DEPLOY_LOG.md` "Known issues" lines stay as point-in-time notes from each deploy, but **every still-open item must be promoted** into the Open bugs section below. `HANDOVER.md` is narrative state; it does NOT carry actionable items that live nowhere else. **Zero actionable items existing only in DEPLOY_LOG or HANDOVER.** This file is kept current on every doc-closeout.

> **Mandatory reads before code:** `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG), `docs/PROJECT_GUIDELINES.md`, the active CC brief (if any). See `CLAUDE.md` MANDATORY READS for the full list.

**Last synced:** 2026-05-26 · main HEAD `22933aa0` (§ 86 + sizing hotfix — SHIPPED + deployed; canvas ladder consolidated)

---

## 🔥 Active — READY FOR OPUS BRIEF (priority queue)

Per Jacek 2026-05-26: "wszystkie Twoje sugestie. Kolejny brief pisze Opus" — items below are accepted next-work, awaiting Opus to write per-task briefs. CC executes after each brief lands.

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | **A2 v2 — ShotDrawer drag-move-shot + tap-marker-menu** | CC, awaiting Opus brief | § 86 v1 shipped grammar essentials (pinch/pan/loupe/tap-place/tap-delete). v2 adds: drag-move existing marker to new position + tap-marker opens contextual menu (delete + ev. kill-toggle). Needs new `touchHandler` state (`draggingShot` ref) + `onMoveShot` callback + handleMove threshold logic to distinguish drag-shot from pan. ~80 LOC across touchHandler + BaseCanvas + ShotDrawer. |
| 2 | **Phase 2.2.d + 2.3.d cleanup — drop workspace player/team dual-writes + collapse § 85 backstop** | CC, awaiting Opus brief | Pre-prod context (only Jacek + scout test) makes backwards-compat unnecessary. Drop dual-write from `addPlayer`/`updatePlayer`/`changePlayerTeam`/`addTeam`/`updateTeam` (workspace half), drop `subscribePlayers` (workspace), null-out workspace `linkedUid` backstop (or just delete workspace `/players/` + `/teams/` subcollections entirely). ~30 min, one bundled commit. Touches dataService + ev. workspace player/team subcollection cleanup script. |
| 3 | **Phase 3.c.2 — Global `/players/` + `/teams/` create/update hardening** | CC, awaiting Opus brief | § 65.3 matrix: today `auth != null` writes anything on global → restrict to super_admin OR workspace_admin with `ownerWorkspaceId` match. `ownerWorkspaceId` already backfilled (Phase 3.c.2 audit 1066 docs, 0 errors). Adds `isViewer` rules helper. Was HIGH RISK pre-prod; per "lećmy ostro" + pre-prod context = NORMAL RISK. Sequenced rules deploy required (pattern from § 85). |
| 4 | **B7 + B8 — SCOUT/COACH UX tactical batch** | CC, awaiting Opus brief | B7 = completeness table reposition (move to bottom above END MATCH, collapsed by default — MatchPage layout-only). B8 = Strzela% formula refactor (denominator = N×5 − runners − undeclared in `generateInsights.js`/`coachingStats.js`). Both small, can bundle. |
| 5 | **Dead-code cleanup batch — B16 + B17 + B18** | CC, awaiting Opus brief | B16: drop `setPointWithId`/`setTrainingPointWithId` dead exports (`dataService.js:340-344, 705-709`). B17: `type:'practice'` dead discriminator (MainPage/CoachTabContent/ScoutTabContent — zero prod docs per § 69 backfill). B18: `§ 42` docs update (point IDs auto-generated). ~50 LOC out + doc patch. Bundle into one cleanup commit. |
| 6 | **Owed smoke checklists** (verification debt — Jacek on prod, not Opus brief) | Jacek on prod | § 81 7-step · self-log gate 5-step · § 80 6-step · § 79 6-step · § 78 5-step · § 77 5-step (#4 🔴 arbiter) · § 76 5-step · § 61 iPhone Deaths heatmap coord-frame · Brief F two-device · Phase 3.c.2 Stage 7.4 super_admin. **NOTE:** § 86 v1 + 2 hotfixes confirmed working on prod 2026-05-26 — that smoke list cleared. |

---

## 🐛 Open bugs

Triage: **blocker** (production-breaking) · **high** (data integrity, critical UX, new-user funnel) · **med** (UX rough edges) · **low** (cosmetic, dead-code cleanup, fragility hygiene). Status: **open** · **needs-repro** · **needs-validation** (waiting on real-data confirmation) · **awaiting-mockup** · **awaiting-decision**.

| # | Sev | Surface | Symptom | Suspected cause / file | Status | Source |
|---|---|---|---|---|---|---|
| **B1** | ~~high~~ | MatchPage (scouting) | Cache leak between scouted points — viewing point N then scouting a new point loaded N's data into the draft. Three sequences diagnosed: Seq A (editPoint → mode=new silent overwrite), Seq B (team-switch in editor), Seq C (lastAssign roster-bleed via delete/clearAll). | `MatchPage.jsx` edit-state lifecycle — fixed via § 82: centralized `exitEditMode()` + `lastAssign` save-only + fresh-scout intent reset effect. § 18 invariants preserved via `isEmptyShellRef`. | **✅ SHIPPED** `5c65f7a9` (DEPLOY_LOG § 82) | Jacek 2026-05-12 (SCOUT #3) |
| **B2 hotfix** | ~~high~~ | First-login (new account) | Onboarding hang — `selfLinkPlayer` failures (workspace-vs-global collection mismatch) silently parked users on the Confirm card forever; `busy` flag stuck → modal disabled → topBar Logout disabled → only escape was closing the tab. | Fixed via § 84 (b+a): `finally { setBusy(false) }` + 8s watchdog + modal-side `error`-prop reflow (drops back to list w/ skip-fallback on error) + persistent Skip/Logout in topBar lifted above modal backdrop (z:110 > z:100). | **✅ SHIPPED** `86f98a85` (DEPLOY_LOG § 84). **Note:** B2 (c) — the underlying collection contract — is **STILL OPEN** (see below). | Jacek 2026-05-12 (NEW ACCOUNT #1) |
| **B2 (c)** | ~~high~~ | First-login (new account) | Architectural decision needed: which collection holds the link contract. Workspace-scoped writes/listener failed for any workspace ≠ ranger1996 because picker fed from global `/players/` (Phase 2.2.b). | Fixed via § 85: link ops (self/admin link/unlink + subscribe) migrate to GLOBAL `/players/`. Workspace-scoped self-link carve-out on rules (`isMember(resource.data.ownerWorkspaceId)`) preserves cross-workspace security. Workspace `linkedUid` stays as backstop (Phase 2.2.d cleanup). Picker filter at parent level (defense in depth) — admin paths unfiltered. Ownership-transfer invariant preserved (no `ownerWorkspaceId` in self-* diff allowlist). | **✅ SHIPPED** `c90b9fa9` (DEPLOY_LOG § 85; sequenced rules + code via CC; **migration SKIPPED per Option D** — existing linked users get one-shot re-link prompt on first reload). Phase 2.2.d will collapse workspace link-writes + backstop. | Jacek 2026-05-12 (NEW ACCOUNT #1) + High-3 diagnosis ESCALATE |
| **B3** | ~~high~~ | MatchPage roster picker | Roster picker showed parent + all child teams instead of per-tournament. Write-time bug at `ScoutTabContent.buildScoutedPayload` — unconditional union from `1a030508` (2026-04-20) over-corrected by skipping the division narrowing. | Fixed via § 83: write-time per-team filter on `team.divisions[league] === finalDivision` + defensive fallback to full union (preserves `1a030508` empty-roster fix when team data is incomplete); admin-gated `repairScoutedRostersForTournament` helper with orphan-preserving union (narrowed roster ∪ already-assigned-in-points). | **✅ SHIPPED** `30a03722` (DEPLOY_LOG § 83) | Jacek 2026-05-12 (SCOUT #1) |
| **B4** | med | Home / landing view | When all tournaments AND trainings are closed, the app lands on More ("Ustawienia") and looks broken on every entry. Two root causes: (1) "closed" not treated as "no active event" — `subscribeTournaments` has no status filter, close/end never clears `activeTournament` / localStorage; (2) § 31 empty state unreachable under `activeTab==='more'`. | (1) `subscribeTournaments` + close-flow doesn't clear activeTournament. (2) MoreTabContent close action forces persisted last-tab to `'more'`. Direction in DESIGN_DECISIONS § 73. | awaiting-mockup (Opus) | NEXT_TASKS PARKED |
| **B5** | med | MatchPage (scouting save) | Cannot save a break without a final point outcome (partial save). | Schema change needed: `point.status='partial'` + UI flow. Coordinate with sparing architecture rozkmina (events architecture decision). | awaiting-decision | Jacek 2026-05-12 (SCOUT #4) |
| **B6** | med | Concurrent scouting | "Lazy scout" rotating 4 teams (AvB then CvD on alternate points) doesn't auto-flip side — scout stays one side. | May overlap with `outputs/CC_BRIEF_AUTO_SWAP_REGRESSION.md` (verify status first — may have shipped post-2026-04-28). | needs-validation | Jacek 2026-05-12 (SCOUT #5) |
| **B7** | med | MatchPage layout | Completeness table should move to bottom of scouting view (above END MATCH), collapsed by default. | Layout-only refactor in MatchPage. | open | Jacek 2026-05-12 (SCOUT #7) |
| **B8** | med | ScoutedTeam Strzelanie row | Strzela% formula wrong — denominator should be `N×5 − runners − undeclared` to equal 100%. Independent of § 60 banner. | `generateInsights.js` / `coachingStats.js` Strzela computation. | open | Jacek 2026-05-12 (COACH #5) |
| **B9** | med | Training squad matchups | Pre-2026-05-24-fix matchups carry frozen `homeRoster`/`awayRoster` snapshots → guests added post-creation can't be scored against them (zero points accrue). | `matchups/{mid}` written at create-time only; never refreshed. Options: (a) UI "Refresh roster from squads" affordance, (b) dataService walker on attendee-add, (c) accept as documented limitation. | awaiting-decision | NEXT_TASKS new POST-NXL |
| **B10** | med | LogRow card (Samoocena / PPT) | Self-log card lacks two pieces of context: (1) which **event/training** the log belongs to (essential in global scope where 47 logs span 4 trainings), (2) explicit **"Rozbieg / Strzały"** labels (today only raw values: "DOG" over "DOG → SNAKE" is ambiguous — breakout vs shot target). | `LogRow.jsx` is `{row,ordinal,isPending}` → needs an `eventLabel` prop; `trainingId→name` resolved by the caller; wording via `ppt_*` i18n keys. | awaiting-mockup (Opus) | NEXT_TASKS IN FLIGHT § 70 |
| **B11** | ~~med~~ | ShotDrawer (Match scouting) | Three symptoms = one § 75 grammar drift: (1) dead X icon next to placed precision shots, (2) pan in precision mode broken — drag places another shot instead of panning, (3) deletion only via UNDO (no tap-element→menu, no drag-to-move). | Fixed via § 86 v1: ShotDrawer migrated to BaseCanvas with `viewportSide` opponent-half framing; § 75 grammar essentials (pinch/pan/loupe/tap-place/tap-delete) via BaseCanvas arbiter; dead-X icon removed from drawPlayers; main canvas `mode='shoot'` switch removed. Drag-move-shot + tap-element-menu **deferred to v2** (would need new touchHandler logic ~80 LOC; v1 = strict upgrade — pre-§86 had neither). | **✅ SHIPPED v1** `4d16f118` (DEPLOY_LOG § 86) | NEXT_TASKS A2 |
| **B12** | med | QuickLog Stage 2 → Stage 3 routing | Stage 2 "Rozpocznij punkt" routes directly to outcome (Stage 4), bypassing live tracking. § 58 ship deferred Bug 5 — `LivePointTracker.onSave` already saves internally; naive swap would duplicate-save or require a callback refactor (`onComplete` emits data without saving). | LivePointTracker contract change needed (option A swap-only / B refactor / C keep-as-is). | awaiting-decision | DEPLOY_LOG 2026-05-04 § 58 ship "Known issues" |
| **B13** | low | `leaveWorkspaceSelf` guard | Throws on `adminUid===uid` OR `globalRole==='super_admin'` only — narrower than `isSuperAdmin` (which also has `ADMIN_EMAILS` path). A super_admin with null/absent `globalRole` would slip the guard. | `dataService.js` `leaveWorkspaceSelf` — add `ADMIN_EMAILS` email fallback. | open | NEXT_TASKS Fragility cluster |
| **B14** | low | `computeIsLastAdmin` (MoreTabContent) | Checks role-array `'admin'` only — blind to super_admin, `adminUid`, `ADMIN_EMAILS`. Returns false for everyone in production (nobody holds role-array `'admin'`). | `MoreTabContent` helper. Deprecate or widen to 4-path admin signal. | open | NEXT_TASKS Fragility cluster |
| **B15** | low | `ranger1996.members[]` | 569 dead entries (566 uids with no `/users/` doc + 3 with a doc but no email) — post-anonymous-purge stragglers. Migration to drop them; unblocks future no-role/assignment surface. | One-shot migration script. | open | NEXT_TASKS Fragility cluster |
| **B16** | low | `dataService.js` dead exports | `setPointWithId` (L340-344) + `setTrainingPointWithId` (L705-709) no longer called after multi-device hotfix (point IDs now auto-generated). | Safe to delete post-NXL. | open | NEXT_TASKS new POST-NXL |
| **B17** | low | `type:'practice'` dead discriminator | Read in 3 UI spots (MainPage, CoachTabContent, ScoutTabContent) but zero `type:'practice'` docs in production (§ 69 backfill exercised on all 14 events — 0 practice). | Decide: remove dead paths or keep for planned feature. See `docs/architecture/FIRESTORE_DATA_MODEL.md` § 5. | awaiting-decision | NEXT_TASKS new POST-NXL |
| **B18** | low | docs § 42 | Point IDs are now auto-generated (no longer `{matchKey}_{coachShortId}_{NNN}`). `endMatchAndMerge` still index-based so semantics unchanged. Short append to existing § 42. | Doc-only patch. | open | NEXT_TASKS new POST-NXL |
| **B19** | low | LivePointTracker ghost button | "Start punktu (live tracking)" button is 40px tall — slightly under § 27's 44px minimum. Pre-existing from prior commits. | Single-line height bump; verify visual doesn't break Stage 1. | open | DEPLOY_LOG 2026-05-04 § 58 + 2026-05-01 QuickLog redesign |
| **B20** | low | Cross-device same-UID presence | After Brief F retired the match-level claim system, two devices on the same UID have zero contention signal — no banner / no indicator. | Passive presence indicator: heartbeat doc keyed by `{matchId}_{uid}_{deviceId}` with lastSeen timestamp; banner if >1 fresh entry. Non-trivial design surface (PWA presence + UX + privacy). | open | NEXT_TASKS new POST-NXL |
| **B21** | low | ServiceWorker | `register Rejected` error in Sentry; separate ticket, lower priority. | SW registration in `index.html` / Vite PWA plugin config. | open | DEPLOY_LOG 2026-05-21 |
| **B22** | low | `workspace.adminUid` ranger1996 | Points to `JDDCmHSQ…` — a deleted Firebase Auth user. Severity theoretical (Auth account deleted; UIDs aren't recycled). Interacts with Phase 3.c.2 `isWorkspaceAdminOf` rule helper, which trusts adminUid. | Re-point to a live admin, clear it, or leave (Jacek covers admin via `globalRole='super_admin'`). | **🚫 NO ACTION** (explicit go required — security boundary) | NEXT_TASKS Fragility cluster |
| **B23** | low | F5/F6/F7 features | F5 self-scouting+counter (partially addressed by SelfLog hybrid view); F6 tournament profiles (per Jacek may be solved by quick shots dual mode); F7 training→break selection (wait for data accumulation). | Verify each individually with Jacek/Opus — may need their own briefs or may be obsolete. | needs-validation | NEXT_TASKS Features backlog |

**Sentry sweep:** beyond B21 (SW register) and the now-fixed Sentry items (`onToolbarAction` ReferenceError closed 2026-05-23, `useLeagues` fetch failures closed by Phase 2.1c rules deploy 2026-05-19, `useEvents` index closed by collection-group indexes), no other actionable repeatables are currently captured in code/docs. **iabjs `://navigation_performance_logger_android` is FB webview noise, not our code — ignore.** A live Sentry sweep against the current dashboard is owed and would need Jacek to paste the open repeatable list.

---

## 🌿 In-flight

No unmerged feature branches. `main` is at `1504952d` (post § 81 doc closeout).

---

## ⏸ Blocked / awaiting Jacek

These need a product or design decision before code starts:

- **B4 Home view** — awaiting Opus clickable mockup across device sizes before brief.
- **B10 LogRow enhancement** — awaiting Opus mockup across device sizes before brief.
- **B5 Partial save** — coordinate with sparing architecture rozkmina (event model A/B/C decision).
- **B6 Auto-swap** — verify against `outputs/CC_BRIEF_AUTO_SWAP_REGRESSION.md` status with CC.
- **B9 Training squad-matchup roster backfill** — choose option (a) UI affordance / (b) dataService walker / (c) accept.
- **B12 QuickLog Stage 2→3 routing** — choose option A/B/C.
- **B17 `type:'practice'`** — decide: remove dead paths or keep for planned feature.
- **B22 adminUid repoint** — 🚫 NO ACTION (explicit go required; security boundary).
- **Sparing architecture rozkmina** (Issues #3 + #6 from prior session) — 5 product decisions: collection affiliation, sticky-state localStorage keying, wizard host resolution, copy/UI context assumptions, events unification. Gates PPT picker fix, sparing implementation, player claim flow brief.
- **Events architecture decision** — unifying training/tournament/sparing: Model A (status quo) / Model B (single `events`) / Model C (lightweight `events_index`). Sub-decision within sparing rozkmina.
- **Player motivation claim flow** — mockup approved 2026-05-02 (`outputs/player_claim_flow_mockup.html`). Brief TBD post-sparing.
- **Switcher UI brief** (Phase 1.x) — Slack-style workspace picker. Consumes `useUserWorkspaces()` hook. Independent of Phase 1.2/1.3 mechanics. Brief TBD.
- **`ARCHITECTURE_C4_v2.html` + § 38 in DESIGN_DECISIONS** — needs CC discovery pass against real production code before diagramming. Blocked on desktop session with GitHub connector.
- **Tier D security items** — custom claims, per-pid selfReports ownership, `/users` global read, adminUid create-time validation. Post-MAX explicit defer.

## 🚢 Recently shipped

Pointer to `DEPLOY_LOG.md` — last ~8 entries (newest first; all 2026-05-25 unless noted):

- **§ 86 hotfix ShotDrawer sizing** `22933aa0` — green-screen on open (BaseCanvas containerRef `height:auto` collapsed pre-canvas-sized → canvas 0×0). Fix: ResizeObserver measures flex parent, passes explicit `maxCanvasHeight` to BaseCanvas.
- **§ 86 B11/A2 ShotDrawer → BaseCanvas** `4d16f118` — last canvas surface migrated to § 64 ladder; § 75 grammar (pinch/pan/loupe/tap-place/tap-delete) inherited; dead-X cleanup bundled; opponent-half via `viewportSide` retires scrollLeft hack. Canvas ladder fully consolidated. v1 essentials; drag-move + menu deferred to v2.
- **§ 85 B2 (c) link-to-global** `c90b9fa9` — link ops migrate to global `/players/` with workspace-scoped self-link carve-out (`isMember(ownerWorkspaceId)`); HIGH batch now COMPLETE. Sequenced rules + code deploy by CC. Migration SKIPPED per Option D (existing linked users get one-shot re-link prompt).
- **§ 84 B2-hotfix onboarding funnel hang** `86f98a85` — async hygiene (`finally { setBusy(false) }` + 8s watchdog + removed busy-guard on skip) + modal-side error reflow + persistent Skip/Logout above modal backdrop (z:110).
- **§ 83 B3 scouted.roster contract** `30a03722` — division-filtered at write (`ScoutTabContent.buildScoutedPayload`) + admin-gated `repairScoutedRostersForTournament` with orphan-preserving union.
- **§ 82 B1 MatchPage edit-state lifecycle** `5c65f7a9` — cache leak between scouted points closed; centralized `exitEditMode()` + `lastAssign` save-only + fresh-scout reset effect; § 18 invariants preserved via `isEmptyShellRef`.
- **§ 81 ScoutedTeam immersive** `3e0126c2` — heatmap-region full-viewport overlay; closes immersive scope at 3 models.
- **Self-log entry points gated OFF** `84a3d140` — dynamic flag `selfLog` default false; subsystem preserved + reactivatable via `/debug/flags`.
- **§ 80 FS Stage 2** `c4642d1e` — LayoutDetailPage immersive; BunkerEditor + LayoutAnalytics excluded per canvas-primary boundary.
- **§ 79 A1 bump fix** `ebf634ff` — arrow direction + scout shot-origin (Option C explicit prop).
- **§ 78 Draw Stage 2** `293576a8` — ScoutedTeam annotations (Plan coacha + Notatki scouta); § 75 Draw sequencing COMPLETE.
- **§ 76 hotfix #2** `db08b059` — HeatmapCanvas `sizingStrategy='fit'` (landscape overflow).
- **§ 77 hotfix** `6a3fea4d` — DrawingOverlay SVG path (invisible strokes; data salvaged from `point.annotations`).
- **§ 76 hotfix** `d87abc4e` — `useLandscapeMode` hooks-order in LayoutDetail + Tactic (React 18 crash).

For older entries see `DEPLOY_LOG.md` directly.

---

# 📋 Long-running tracks (roadmap, not bugs)

Items below are planned / phased work — open and actionable but with their own multi-step plans, not surface-level bugs. Each track has its own sub-board with sequential briefs.

## 🟢 NXL Czechy 2026-05-15..17 (active tournament — smoke debt below)

- **§ 62 — Heatmap density removal + stroked markers** — shipped 2026-05-15 (`15ae8e2`). Live; visual smoke from Jacek's floor view ongoing.
- **Schedule import scouted-division repair + source fix** — shipped 2026-05-15 (`e0e3e6b`). Repair + Coach-tab populate validation pending Jacek on the tournament floor.
- **Multi-device point-overwrite hotfix** — shipped 2026-05-15 (`3b236cf`). Two-device smoke validation pending Jacek on the tournament floor.
- **Security-roles-v2 finish** — DONE (`fb049ac` + `50434fb`). Path A foundation complete.
- **Brief A — Pre-NXL Refinements** — shipped 2026-05-12 (`36104cb`, § 60). Archived.
- **Brief B — Deaths Heatmap v2** — shipped 2026-05-12 (`a5bb51e`, § 61). iPhone smoke + § 61.8 coord-frame check pending Jacek.
- **Schedule CSV + workspace auto-match** — shipped 2026-05-13 (`5b1e15f`) + 2026-05-14 (`d4653ef`). Real-data validation done.

## 🔵 Klocek 2 / Multi-source reconciliation (§ 70) — COMPLETE

- Stage 1 — Foundation — ✅ `373cc84`
- Stage 1b — Free-play coach UI — ✅ `01a93ed`
- Stage 2 — Matcher + write-back propagator — ✅ `184c04c`
- Stage 3 — Granular read + event-scoped aggregation — ✅ § 70.8
- § 70.9 Samoocena — ✅ shipped
- § 70.10 D1 self-log dot placement — ✅ shipped
- Stage 4 — Manual override UI — ✅ § 70.11 ("Needs review" queue)

Remaining: B10 LogRow enhancement (mockup-first; in Open bugs board above).

## 🧱 Canvas unification + universal drawing layer (DESIGN_DECISIONS § 64)

**Status:** Option B locked, 8-step plan; FieldView deprecation collapsed into Step #5. Steps 1-5 + Drawing layer (Step 7 equivalent) shipped via § 75/§ 76/§ 77/§ 78. Step 6 (AnalyticsCanvas) + Step 8 (landscape coach view) effectively folded into § 81 region-overlay.

- ✅ Step 1 — `drawZones.js` i18n cleanup — DONE (`5f12f7d`)
- ✅ Step 2 — BaseCanvas extraction + `useLandscapeMode` hook — DONE (`53df791`)
- ✅ Step 3 (§ 64.9 #4) — FieldCanvas → InteractiveCanvas migration — DONE (`2b6a473`)
- ✅ Step 4 (§ 64.9 #5) — HeatmapCanvas → BaseCanvas + FieldView deprecation — DONE (`cb28a26a`)
- ✅ DrawingOverlay (§ 77/§ 78) — DONE (`cd9aa448` + `293576a8`)
- ✅ § 76 / § 80 / § 81 — Full-screen immersive scope CLOSED at 3 models
- **Step 5 — AnalyticsCanvas extraction from LayoutAnalyticsPage** — open. Reference: § 64.1, § 64.8.2. Per § 80 LayoutAnalytics is excluded from immersive (canvas-secondary), but the canvas-class consolidation is still on the roadmap.
- **A2 — ShotDrawer → BaseCanvas migrate** — in Active board #2 / B11. Templated on the BaseCanvas-as-arbiter pattern from DrawingOverlay.
- **[FUTURE] Tactic → DrawingOverlay unify** — Tactic keeps its current freehand (raw pointer events + own overlay canvas) per 2026-05-24 decision; no urgency. Future ticket migrates to shared DrawingOverlay + BaseCanvas arbiter.

## 🧱 Multi-Tenant Architecture migration (DESIGN_DECISIONS § 63, § 65, § 66, § 67)

**Status:** Phase 1 COMPLETE · Phase 2 Steps 1-3 COMPLETE · Phase 3.a/b/c.1/g COMPLETE.

**Active next on this track:** Phase 3.c.2 (Active board #1 above).

- ✅ **Phase 1** — Schema foundation (`useUserWorkspaces` + drop `users.workspaces` + migration). `b90ffed` / `6c9ad4f` / `e560151`.
- ✅ **Phase 2.1** — Leagues collection bootstrap + hook + super admin UI. `324f380` / `2f81b2b` / `96e9951`.
- ✅ **Phase 2.2** — Players global migration + dual-write + super admin UI. `ab1319c` / `8614a9b` / `7de12d4`.
- ✅ **Phase 2.3.a-c** — Teams bootstrap + global hook + super admin UI with duplicate resolution. `a8cb308` / `97af95a` / `6638c54`.
- ⏸ **Phase 2.2.d / 2.3.d** — Legacy `/workspaces/{slug}/players/` and `/teams/` cleanup. Deferred until Phase 2.4 maturity.
- 🎯 **Phase 2.4 — TeamMemberships junction** — READY FOR BRIEF. Splits `team.players` / `roster` arrays into `/teamMemberships/{tmid}` per § 63.15.4. Multi-league memberships unlocked.
- ✅ **Phase 3.a/b/c.1/g** — globalRole + super_admin editing + rules helpers refactor + AI Vision disable. `8f77d62` / `bddeb10` / `0aac3c1` / `2997cca`.
- 🎯 **Phase 3.c.2** — Global `/players/` + `/teams/` create/update hardening (Active #1 / HIGH RISK).
- ⏳ **Phase 3.c.3** — PII scoping per § 65.3 Q4. Deps: 3.c.2.
- ⏳ **Phase 3.d** — Workspace admin UI (tenant self-service).
- ⏳ **Phase 3.e** — Player editing model implementation. Deps: 3.c.
- ⏳ **Phase 3.f** — Team ownership UI in /admin/teams. Deps: 3.c.
- ⏸ **Phase 3.1+** — Annotations layer (`/players/{pid}/workspaceNotes/{wid}`). Deps: 3.e + design.
- ⏳ **Phase 3 — GlobalEvents β registry** — Brief TBD post Phase 2 stable.
- ⏳ **Phase 2 — Switcher UI brief** — Slack-style workspace picker (deferred to multi-tenant onboarding workspace #2).
- ⏸ **Onboarding US PRO team** — waiting for workspace isolation verification (post Phase 3.c).
- ⏸ **Layout insights monetization** — waiting for aggregation Phase 2 (Cloud Functions, Blaze).
- ⏸ **i18next library migration + new language support** — beyond PL/EN.

## 🟠 Custom named zones (design-track)

See `docs/product/CUSTOM_ZONES_SPEC.md`. **NOT started.** Doc-only capture of intent 2026-05-24 (Jacek). Spec lists 7 impact surfaces + open design questions + sequence (map → design → implement). Implementation NOT authorized — design pass owed first.

## 📦 Backlog (do NOT implement without instruction)

See `docs/product/IDEAS_BACKLOG.md`. Highlights:
Dark/light toggle, settings page, colorblind UI toggle, undo stack, tactic templates, direct manipulation drag, export CSV/Excel, print layout with overlays, OffscreenCanvas heatmap, SharedArrayBuffer ballistics, remaining ARIA/WCAG, haptic feedback, keyboard shortcuts, Paintball IQ, body count analysis, agentic counter explanations, onboarding tunnel, competitive analysis. Also: **BreakAnalyzer module** (Phase 1 spec at `docs/architecture/BREAK_ANALYZER_SPEC.md` — Opus territory), **Tournament tendencies** (blocked on scouted-data volume + SelfLog maturity).

---

## Conventions

- **Inline JSX styles only** (COLORS/FONT/TOUCH from `theme.js`). No CSS modules, no Tailwind.
- **English UI labels.** Polish in code comments OK.
- **Don't touch** `src/workers/ballisticsEngine.js` (Opus territory).
- **Git:** `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`.
- **Pre-commit on Windows is broken** (`bash ENOENT`); verify directly (build clean, zero `console.log` / `debugger`, no Polish strings in code).
- **Commit messages with backticks** — use `git commit -F -` heredoc, NOT `-m "msg with \`backticks\`"` (bash interpolation drops the word).
