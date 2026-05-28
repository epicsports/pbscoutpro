# NEXT TASKS — Canonical board for PbScoutPro

> **Canonical-board rule.** If something is *actionable and open*, it lives **here**. `DEPLOY_LOG.md` "Known issues" lines stay as point-in-time notes from each deploy, but **every still-open item must be promoted** into the Open bugs section below. `HANDOVER.md` is narrative state; it does NOT carry actionable items that live nowhere else. **Zero actionable items existing only in DEPLOY_LOG or HANDOVER.** This file is kept current on every doc-closeout.

> **Mandatory reads before code:** `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG), `docs/PROJECT_GUIDELINES.md`, the active CC brief (if any). See `CLAUDE.md` MANDATORY READS for the full list.

**Last synced:** 2026-05-28 · main HEAD `01b1280b` (**§ 90.7.1 selfReports Stage 1.B.3 cutover SHIPPED + deployed** — writers flat-only; matcher reuses collectionGroup `getTrainingSelfReports` (design b, 1 query not N); `dedupePreferFlat` prefers flat copy; legacy nested path WRITE-DEAD (rules comment-only). **§90 Stage 1 COMPLETE.** Index-free — abandoned `1cb6777d` dropped, NO firebase deploy. **The only parked Firebase item is now cleared.** Next track: legacy-doc cleanup → Phase 2.2.d.) Prior: `05cfa9b7` (**§ 93 Workspace logo + § 92.7 one-row consolidation SHIPPED + deployed** — bundled: (1) one workspace row per More surface (slim 🚪 Leave row, training parity); (2) optional external `logoUrl` on `/workspaces/{slug}` shown in switcher/picker/context-bar, set in §91 surface, external URL not Storage (quota), `WorkspaceLogo` graceful fallback. NO rules change. Login screen excluded.) Prior: `4bda4e75` (**§ 92 Workspace switcher — OPERATION SHIPPED + deployed** — "Mój workspace" More-tab row now switches active context code-free via `setActiveWorkspace` (persist + reload); picker lists own approved memberships only (`useUserWorkspaces` filtered to non-empty roles). Open: `TrainingMoreTab` parallel row left static. Complements § 91.) Prior: `413d9e0d` (**§ 91 super_admin Workspaces surface SHIPPED + deployed** — `/admin/workspaces`, list/create/manage any workspace's members+roles without context switch; `_wsSlug` now honored via `dataService.wsPath()`, non-breaking; `createWorkspace` no-context-switch; NO rules change. Unblocks FIT onboarding. Catalog data-isolation gap promoted to hardening follow-ups below.) Prior sync: 2026-05-27 · `fad7dc7b` (B5 / § 89 scout autosave draft SHIPPED + deployed; B12 closed as MOOT (was shipped 2026-05-01); B10 + A2 v2 + dualwrite-orphans + B15 scripts + gap β sibling + KIOSK + B14 + B13 + B19 + B16-B18 + § 88 + gap α/β + B7 SHIPPED earlier today — 15 ships + adminUid script. B15 cleanup pending Jacek audit run; PART 3 linkedUid backstop = `[ESCALATE]`, not touched.)

---

## 🔥 Active — READY FOR OPUS BRIEF (priority queue)

Per Jacek 2026-05-26: "wszystkie Twoje sugestie. Kolejny brief pisze Opus" — items below are accepted next-work, awaiting Opus to write per-task briefs. CC executes after each brief lands.

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | ~~**A2 v2 — ShotDrawer drag-move-shot + tap-marker-menu**~~ | ✅ SHIPPED 2026-05-27 | `e4c7c585` (merge of `feat/a2-shotdrawer-v2-dragmove-menu` / `0c00c9d2`). New `draggingShotRef` + ref-wrapped `setDraggingShot` (PROJECT_GUIDELINES § 9); 6-px threshold in handleMove for drag-vs-tap; tap dispatches `onShotMenu` (legacy `onDeleteShot` kept as fallback); ShotMenuOverlay child of BaseCanvas mirroring InteractiveChrome's `toolbarPos` math; isKill render added to ShotDrawer drawFn (red ring + 💀) for visible kill-toggle feedback. ~300 LOC across touchHandler + BaseCanvas + ShotDrawer + MatchPage wiring. |
| 2 | **Phase 2.2.d + 2.3.d cleanup — drop workspace player/team dual-writes + collapse § 85 backstop** | CC, awaiting Opus brief | Pre-prod context (only Jacek + scout test) makes backwards-compat unnecessary. Drop dual-write from `addPlayer`/`updatePlayer`/`changePlayerTeam`/`addTeam`/`updateTeam` (workspace half), drop `subscribePlayers` (workspace), null-out workspace `linkedUid` backstop (or just delete workspace `/players/` + `/teams/` subcollections entirely). ~30 min, one bundled commit. Touches dataService + ev. workspace player/team subcollection cleanup script. |
| 3 | ~~**Phase 3.c.2 — Global `/players/` + `/teams/` create/update hardening**~~ | ✅ SHIPPED (rediscovered 2026-05-27) | **Phase 3.c.2 write ownership-gating: SHIPPED** in `8e8dda0c` (rules) + `f5adf292` (roleUtils helper). Global `/players/` + `/teams/` create/update gated by `isSuperAdmin() ∨ isWorkspaceAdminOf(ownerWorkspaceId)`, with `ownerWorkspaceId` pinned immutable on update (firestore.rules:435-503). The prior "today `auth != null` writes anything on global" framing was stale — the rule landed weeks ago and the row never got reconciled. Remaining inside the ticket: (a) `isViewer` rules helper — deferred at `firestore.rules:85-87`, blocked on first consumer match-block (not actionable now); (b) workspace #2 inert-branch smoke — verification debt gated on multi-tenant onboarding, § 65.7.5 / rules-audit gap #4. |
| 4 | ~~**B7 + B8 — SCOUT/COACH UX tactical batch**~~ | ✅ resolved 2026-05-27 | **B7 SHIPPED** branch `fix/b7-completeness-card` — card moved below Points list + inline collapse-by-default (no localStorage). **B8 DEFERRED** — parked pending dedicated "data trust / validation" workstream (Jacek doesn't trust scouted data yet → tuning denominator premature). See B6/B7/B8 rows in Open bugs. |
| 5 | ~~**Dead-code cleanup batch — B16 + B17 + B18**~~ | ✅ SHIPPED 2026-05-27 | Bundled commit: dropped `setPointWithId` + `setTrainingPointWithId` exports (zero callers since 2026-05-15 auto-ID hotfix); removed `type:'practice'` dead discriminator from 3 UI spots + `deriveEventType`; appended § 42.1 closeout note documenting the doc-ID-scheme retirement + merge-semantics preserved. CC executed autonomously from this NEXT_TASKS row's mini-brief — no Opus brief authored. |
| 6 | **Owed smoke checklists** (verification debt — Jacek on prod, not Opus brief) | Jacek on prod | § 81 7-step · self-log gate 5-step · § 80 6-step · § 79 6-step · § 78 5-step · § 77 5-step (#4 🔴 arbiter) · § 76 5-step · § 61 iPhone Deaths heatmap coord-frame · Brief F two-device · Phase 3.c.2 Stage 7.4 super_admin. **NOTE:** § 86 v1 + 2 hotfixes confirmed working on prod 2026-05-26 — that smoke list cleared. |

### Multi-tenant onboarding follow-ups (surfaced by the 2026-05-28 § 91 discoveries — `outputs/DISCOVERY_*` ephemeral)

> **Catalog data-isolation (workspace_admin write leak)** — **OPEN, awaiting Opus brief.** § 90.9 mandates catalog (`/players` `/teams`) be super_admin-only, but `firestore.rules` create/update allow `isSuperAdmin() || isWorkspaceAdminOf(ownerWorkspaceId)`, so a tenant's `workspace_admin` (the `adminUid` of e.g. `fit`) CAN create/update global catalog docs tagged `ownerWorkspaceId:'fit'` (and `addPlayer`/`addTeam` auto-tag from the active workspace). Cross-workspace member/role writes + data-subtree reads ARE isolated; catalog is NOT. Decision in flight per the § 91 brief ("data-isolation track — separate"). Rules-layer fix needed (not just UI).
> **FIT rank-and-file join carrier** — **OPEN, future Opus brief.** § 91 covers the super_admin side (create + approve). The tenant self-join carrier (magic-link / invite) is greenfield (no invite/appCheck scaffolding). **`defaultWorkspace` is the WRONG carrier** — it's write-once at signup + rules-locked against client update, AND would auto-approve (bypassing pending) when `roles` is non-empty. Needs a one-shot landing handler read pre-router (HashRouter + no query-param parsing today). See `outputs/DISCOVERY_WORKSPACE_PROVISIONING.md` Areas B + G.

### Hardening follow-ups (out-of-scope items surfaced by the 2026-05-27 3.c.2 discovery)

> ~~**gap β**~~ — ✅ **FIXED 2026-05-27** branch `fix/gap-beta-selfrole-validation` (rules-only). `firestore.rules` self-join + self-leave envelopes gain two conditional checks: (1) `isSelfJoinRoleValue(r) = r is list && (size == 0 || r == ['player'])` value gate on `userRoles[auth.uid]`; (2) own-key gate `userRoles.diff(...).affectedKeys().hasOnly([auth.uid])`. Both short-circuited by `!('userRoles' in affectedKeys)` so returning members (e.g. coach re-entry whose write omits userRoles) are unaffected. PRE-FLIGHT confirmed SELF-KEY-ONLY client write semantics. Awaiting Jacek `firebase deploy --only firestore:rules`.
> ~~**gap α**~~ — ✅ **FIXED 2026-05-27** branch `fix/gap-alpha-shot-playerid` (rules-only). Both `isSelfLogShotCreate` and `isSelfLogShotOwned` (`firestore.rules:88-115`) gain a single `get(/players/{playerId})` lookup verifying `data.get('linkedUid', null) == request.auth.uid` — identical shape to existing `isLinkedSelfPlayer`. PRE-FLIGHT verified: KIOSK + post-hoc propagator + PPT all ride `isScout` / a different collection; only MatchPage's PLAYER self-log flow hits these helpers and writes `playerId = own linked-player.id`. Namespace confirmed GLOBAL (`subscribeLinkedPlayer` queries `collection(db, 'players')` per § 85 B2(c)). selfLog flag OFF in prod → exposure was theoretical; fix is hygiene before re-enable / workspace #2. Awaiting Jacek `firebase deploy --only firestore:rules`.
> ~~**deferred sibling (defense-in-depth, NOT load-bearing)**~~ — ✅ **DEPLOYED 2026-05-27** `295c6bcb`. `/users/{uid}` `allow create` constrains `roles` ∈ {`[]`, `['player']`} and `globalRole` ∈ {null, absent}. Firestore-rules-only deploy via `firebase deploy --only firestore:rules`.
> ~~**data-quality follow-up (NOT security)**~~ — ✅ **FIXED 2026-05-27** `0ccdb400`. KIOSK now sets `writerUid = user?.uid || activePlayer?.linkedUid || kiosk.activePlayerId` — device user's auth.uid first, fallback chain preserved. Historical KIOSK shots NOT backfilled (read-only data-quality drift; left for data-trust workstream if it ever matters).

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
| **B5** | ~~med~~ | MatchPage (scouting save) | Redesigned as **localStorage debounced autosave draft + restore** (§ 89). Local pre-commit buffer; commit path unchanged (outcome-gated `savePoint`); no schema change; orthogonal to concurrent Firestore `status:'partial'`. Earlier "schema change needed" + "coordinate with sparing rozkmina" claims dropped — autosave is local + event-model-agnostic. | ✅ **DONE 2026-05-27** (`feat/b5-scout-autosave-draft`) | done | Jacek 2026-05-12 (SCOUT #4) |
| **B6** | ~~med~~ | Concurrent scouting | "Lazy scout" rotating 4 teams (AvB then CvD on alternate points) doesn't auto-flip side. | **NO-OP — already fixed 2026-04-28** via `teamSideMemoryRef` (`MatchPage.jsx:216`); diagnosis-only board closure. Cross-team leak fix preserved (savePoint auto-swap LOCAL-ONLY, no `match.currentHomeSide` write); per-team memory restores swap intent at URL re-entry. | **✅ DONE** (closed via 2026-05-26 diagnosis; board entry closed 2026-05-27 alongside B7) | Jacek 2026-05-12 (SCOUT #5) + Med-batch diagnosis 2026-05-26 |
| **B7** | ~~med~~ | MatchPage layout | Completeness table should move to bottom of scouting view (above END MATCH), collapsed by default. | Fixed via inline collapse + reposition: `CompletenessCard` moved from above Points list to BELOW (same scroll container, end of review content); `useState(false)` default-collapsed with tappable header (label + chevron ▶/▼, 44px touch target, subtle bg-on-press, neutral `textDim` chevron — § 27 deference, no localStorage persist). | **✅ DONE 2026-05-27** `3126e339` (merge of `fix/b7-completeness-card` / `e1ae18e7`) | Jacek 2026-05-12 (SCOUT #7) + Med-batch diagnosis 2026-05-26 |
| **B8** | med | ScoutedTeam Strzelanie row | Strzela% formula wrong — denominator should be `N×5 − runners − undeclared` to equal 100%. | TWO surfaces under "Strzela%" name: (1) per-zone table `ScoutedTeamPage.jsx:1057-1086` rendered via `generateInsights.js:774-868` `computeShotTargets` (denom = `points.length`, per-zone frequency, not affected by candidate); (2) computeCompleteness banner `ScoutedTeamPage.jsx:108-183` (denom = `nonRunnerPlayers` = placed-not-runner slots; **algebraically EQUAL to candidate `N×5 − placedRunners − unplaced`** if "undeclared" means unplaced slots). | **⏸ DEFERRED 2026-05-27** — shot-% metric semantics parked. Jacek does not currently trust the scouted data, so tuning a metric denominator is premature. Revisit only inside a dedicated "data trust / validation" workstream. | Jacek 2026-05-12 (COACH #5) + Med-batch diagnosis 2026-05-26 |
| **B9** | med | Training squad matchups | Pre-2026-05-24-fix matchups carry frozen `homeRoster`/`awayRoster` snapshots → guests added post-creation can't be scored against them (zero points accrue). | `matchups/{mid}` written at create-time only; never refreshed. Options: (a) UI "Refresh roster from squads" affordance, (b) dataService walker on attendee-add, (c) accept as documented limitation. | awaiting-decision | NEXT_TASKS new POST-NXL |
| **B10** | ~~med~~ | LogRow card (Samoocena / PPT) | Shipped via shared `LogRow` (TodaysLogsList.jsx): new `eventLabel` tri-state prop (undefined hide / string `Trening · <name>` / null `Bez treningu` orphan) + 2-col grid gutter with `Rozbieg` / `Strzały` labels (8/700 uppercase) left of the existing breakout + shotsText values. PlayerStatsPage Samoocena wires `eventLabel` from `useTrainings()`; TodaysLogsList own mount + TrainingResultsPage omit (already event-scoped). i18n PL+EN keys added. `shotsText` helper + `ppt_shots_*` keys untouched. | ✅ **DONE 2026-05-27** `f5a3b677` | done | NEXT_TASKS IN FLIGHT § 70 |
| **B11** | ~~med~~ | ShotDrawer (Match scouting) | Three symptoms = one § 75 grammar drift: (1) dead X icon next to placed precision shots, (2) pan in precision mode broken — drag places another shot instead of panning, (3) deletion only via UNDO (no tap-element→menu, no drag-to-move). | Fixed via § 86 v1: ShotDrawer migrated to BaseCanvas with `viewportSide` opponent-half framing; § 75 grammar essentials (pinch/pan/loupe/tap-place/tap-delete) via BaseCanvas arbiter; dead-X icon removed from drawPlayers; main canvas `mode='shoot'` switch removed. Drag-move-shot + tap-element-menu **deferred to v2** (would need new touchHandler logic ~80 LOC; v1 = strict upgrade — pre-§86 had neither). | **✅ SHIPPED v1** `4d16f118` (DEPLOY_LOG § 86) | NEXT_TASKS A2 |
| **B12** | ~~med~~ | QuickLog Stage 2 → Stage 3 routing | Closed via `b8aa7cf2` + `0fec6b26` (QuickLog hotfix v3+v4, 2026-05-01) — Option B contract: Stage 3 `LivePointTracker.onSave` captures only (no internal write), Stage 4 `handleWin` merges captured data + persists once. Row never reconciled until the 2026-05-27 audit. | ✅ **DONE / MOOT** — shipped 2026-05-01 (hotfixes v3+v4); row closed 2026-05-27 | done | DEPLOY_LOG 2026-05-04 § 58 ship "Known issues" |
| **B13** | ~~low~~ | `leaveWorkspaceSelf` guard | Fixed: added the `ADMIN_EMAILS` bootstrap-email path alongside the existing `globalRole==='super_admin'` check, mirroring all 3 paths of `roleUtils.isSuperAdmin`. A super_admin whose `/users/` doc lacks `globalRole` no longer slips the self-leave guard. | ✅ **DONE 2026-05-27** mini-hygiene batch | done | NEXT_TASKS Fragility cluster |
| **B14** | ~~low~~ | `computeIsLastAdmin` (MoreTabContent + TrainingMoreTab) | Widened to all 4 admin paths matching `roleUtils.isAdmin/isSuperAdmin` (role-array · adminUid · globalRole · ADMIN_EMAILS). Both helpers + signature `(workspace, user, userProfile)`; `userProfile` threaded through both Workspace sections. | ✅ **DONE 2026-05-27** | done | NEXT_TASKS Fragility cluster |
| **B15** | low | `ranger1996.userRoles{}` | 569 dead entries — post-anonymous-purge stragglers. | `scripts/migration/audit_dead_userroles.cjs/.cmd` (READ-ONLY) + `cleanup_dead_userroles.cjs/.cmd` (DESTRUCTIVE, gated `CLEANUP_DEAD_USERROLES_CONFIRMED=1`) shipped 2026-05-27 (`071c032b`). Criterion: uid ∉ members AND uid ≠ adminUid AND `/users/{uid}` missing AND email ∉ ADMIN_EMAILS. | **AWAITING Jacek** — run audit, confirm criterion, run cleanup | NEXT_TASKS Fragility cluster |
| **B16** | ~~low~~ | `dataService.js` dead exports | `setPointWithId` + `setTrainingPointWithId` retired (zero callers since 2026-05-15 auto-ID hotfix). | ✅ **DONE 2026-05-27** dead-code batch — both exports deleted. | done | NEXT_TASKS new POST-NXL |
| **B17** | ~~low~~ | `type:'practice'` dead discriminator | Removed: `dataService.deriveEventType` practice branch + `isPractice` in CoachTabContent + ScoutTabContent + the MainPage subtitle fallback. `NewTournamentModal`'s UI-side `kind === 'practice'` (modal-mode flag, NOT a data shape) is a separate concern and untouched. | ✅ **DONE 2026-05-27** dead-code batch | done | NEXT_TASKS new POST-NXL |
| **B18** | ~~low~~ | docs § 42 | Appended § 42.1 closeout note: auto-generated doc IDs since 2026-05-15 NXL Czechy hotfix; merge semantics (per-coach `index` + `endMatchAndMerge` grouping) preserved verbatim; legacy `_NNN` docs and new auto-ID docs coexist correctly. | ✅ **DONE 2026-05-27** dead-code batch | done | NEXT_TASKS new POST-NXL |
| **B19** | ~~low~~ | LivePointTracker ghost button | The original "Start punktu" 40px symptom was already resolved (`QuickLogView.jsx:640-656` is `minHeight: isTablet ? 52 : 44`). 2026-05-27 audit found one remaining § 27 violation in the same area: LivePointTracker's "✓ Zapisz" custom-death-reason CTA was 36px. Bumped 36 → 44 + added flex centering. **Note:** the two footer text-links in LivePointTracker (Pomiń / Zwiń) sit at 32px `minHeight` — those are plain-text-link affordances (not button-shaped), exempted from this batch; separate ticket if §27 strict reading is enforced everywhere. | ✅ **DONE 2026-05-27** mini-hygiene batch | done | DEPLOY_LOG 2026-05-04 § 58 + 2026-05-01 QuickLog redesign |
| **B20** | low | Cross-device same-UID presence | After Brief F retired the match-level claim system, two devices on the same UID have zero contention signal — no banner / no indicator. | Passive presence indicator: heartbeat doc keyed by `{matchId}_{uid}_{deviceId}` with lastSeen timestamp; banner if >1 fresh entry. Non-trivial design surface (PWA presence + UX + privacy). | open | NEXT_TASKS new POST-NXL |
| **B21** | low | ServiceWorker | `register Rejected` error in Sentry; separate ticket, lower priority. | SW registration in `index.html` / Vite PWA plugin config. | open | DEPLOY_LOG 2026-05-21 |
| **B22** | ~~low~~ | `workspace.adminUid` ranger1996 | Was pointing at dead pre-email-auth uid `JDDCmHSQcMQ6JADYtOr9VWnRgNQ2`. | Fixed 2026-05-27 via `scripts/migration/repoint_adminuid.cjs` run by Jacek: `adminUid` now = `OPAHJZa6fROpL7DPVCN3lQiQRr52` (Jacek's live uid from email lookup); dead-uid tombstone removed from `userRoles` (585 → 584 keys); `adminTransferredAt` stamped. Closes audit gap #1. | **✅ DONE** 2026-05-27 (`65cd563f` script + wrapper; Firestore write executed by Jacek with admin-SDK creds) | NEXT_TASKS Fragility cluster |
| **B23** | low | F5/F6/F7 features | F5 self-scouting+counter (partially addressed by SelfLog hybrid view); F6 tournament profiles (per Jacek may be solved by quick shots dual mode); F7 training→break selection (wait for data accumulation). | Verify each individually with Jacek/Opus — may need their own briefs or may be obsolete. | needs-validation | NEXT_TASKS Features backlog |

**Sentry sweep:** beyond B21 (SW register) and the now-fixed Sentry items (`onToolbarAction` ReferenceError closed 2026-05-23, `useLeagues` fetch failures closed by Phase 2.1c rules deploy 2026-05-19, `useEvents` index closed by collection-group indexes), no other actionable repeatables are currently captured in code/docs. **iabjs `://navigation_performance_logger_android` is FB webview noise, not our code — ignore.** A live Sentry sweep against the current dashboard is owed and would need Jacek to paste the open repeatable list.

---

## 🌿 In-flight

No unmerged feature branches. `main` is at `1504952d` (post § 81 doc closeout).

---

## ⏸ Blocked / awaiting Jacek

These need a product or design decision before code starts:

- **LayoutDetailPage UX pass** — Jacek 2026-05-27 (post § 88 deploy): "ux konfiguracji layoutu jest mało przyjazny … niespójna nawigacja i miejscami trudny interfejs." Modal-buried surfaces (Lines & Zones / Info / Mirror / Calibrate / OCR / Delete) compete with toolbar toggles + inline actions; the § 88 zone editor lives behind one of those modals, surfacing the pattern problem. Parked for design discussion — no code changes unilaterally. Also reconsider the 2 v1 design caveats from § 88: (a) the 3 retired toolbar zone shortcut buttons; (b) the scouting pill rendering even when `showZones=false`.
- **B4 Home view** — awaiting Opus clickable mockup across device sizes before brief.
- **B10 LogRow enhancement** — awaiting Opus mockup across device sizes before brief.
- ~~**B5 Partial save**~~ — ✅ **DONE 2026-05-27** as § 89 scout autosave draft (local-only; no schema/sparing dep). Earlier "coordinate with sparing architecture" framing was superseded.
- ~~**B6 Auto-swap**~~ — ✅ closed 2026-05-27 (no-op; fixed 2026-04-28 via `teamSideMemoryRef`).
- **B9 Training squad-matchup roster backfill** — choose option (a) UI affordance / (b) dataService walker / (c) accept.
- ~~**B12 QuickLog Stage 2→3 routing**~~ — ✅ **CLOSED 2026-05-27 (MOOT)** — was already shipped via QuickLog hotfix v3+v4 (`b8aa7cf2` + `0fec6b26`, 2026-05-01); Option B contract (Stage 3 captures, Stage 4 persists). Row never reconciled until the 2026-05-27 audit.
- **B17 `type:'practice'`** — decide: remove dead paths or keep for planned feature.
- ~~**B22 adminUid repoint**~~ — ✅ **CLOSED 2026-05-27.** Repointed to `OPAHJZa6fROpL7DPVCN3lQiQRr52` (Jacek live uid); dead-uid tombstone cleared; `adminTransferredAt` stamped.
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
- ✅ **Phase 3.c.2** — Global `/players/` + `/teams/` create/update write ownership-gating SHIPPED in `8e8dda0c` (rules) + `f5adf292` (`isWorkspaceAdminOf` helper). Remaining: `isViewer` rules helper (blocked on first consumer match-block, `firestore.rules:85-87`) + workspace #2 inert-branch smoke (rules-audit gap #4, gated on onboarding).
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
