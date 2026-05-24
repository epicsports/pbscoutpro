# NEXT TASKS — For Claude Code
## Read docs/DESIGN_DECISIONS.md + docs/PROJECT_GUIDELINES.md first.
## Work top to bottom. Push after each task.

**Last updated:** 2026-05-24 by CC (**§ 77 Draw Stage 1** — SHIPPED + deployed `cd9aa448`. Per § 75 sequencing step 3 — closes the second § 75 piece on top of FS Stage 1 + the regression fix grammar. **`<DrawingOverlay>`** (render-only, `pointerEvents:none`, perfect-freehand outlines, DPR-scaled, reads transform from BaseCanvasContext). **BaseCanvas arbiter `drawMode` branch** — surgical addition to `touchHandler.js` (no rewrite): 1-finger-in-drawMode → `onDraw{Start,Move,End}`; 2-finger zoom/pan UNTOUCHED; 2nd finger mid-stroke → `onDrawAbort` then pinch starts; drawMode suspends ALL field-edit dispatch. New `drawingRef` sentinel owned by BaseCanvas. **`<DrawToolbar>`** — 5 colors / 3 widths / Undo / Redo / sized point-eraser (splits strokes; NOT whole-stroke) / Clear (ConfirmModal) / Done. flex-wrap, width:fit-content, Lucide icons, 44px touch, amber-on-active per § 27 carve-out. **`drawStrokes.js`** pure helpers — Firestore-safe map shape, `eraseAcrossStrokes`. **MatchPage wiring** — state + 9 handlers + chip + toolbar; `editPoint` loads via `strokesFromFirestore`; both savePoint branches write via `strokesToFirestore` (NATIVE-orientation coords, no mirror on write — Stage 2 mirrors at read). Entry chip `✏ Rysuj` LANDSCAPE-only on Match (portrait + portrait-FS = scouting / view-only, no draw). **`perfect-freehand` (MIT ^1.2.3) added to deps**. Build clean 5.53s, precommit pass, § 27 PASS. Bundle: main index.js unchanged 227.89 kB / 68.56 kB gzip; MatchPage +8.9 kB (DrawingOverlay+Toolbar+state+handlers); vendor-react +2.09 kB (Lucide icons). § 75 sequencing now complete (FS + Draw both shipped Stage 1). NEXT after GO: Draw Stage 2 (ScoutedTeam aggregation + heatmap toggle). Earlier today: § 76 Full-screen Stage 1 `884937d8`, § 75 Canvas Interaction Model `686b73d3`, InteractiveCanvas tap/drag fix `6f7158f7`, Training guest squad-persist fix `909e7105`, Canvas Step #5 `cb28a26a`, Step #4 `2b6a473`. Smoke owed: § 77 5-step from DEPLOY_LOG (#4 🔴 = arbiter regression — drawMode 1-finger draws + 2-finger STILL zoom/pan + outside drawMode tap/drag-player must hold). § 76 smoke also owed. Phase 3.c.2 Stage 7.4 super_admin still owed.)

## 2026-05-24 session decisions — captured here so they survive (don't ship without authorization)

- **[✅ SHIPPED 2026-05-24] § 77 Draw Stage 1** (`cd9aa448`, merge of `feat/draw-stage1-overlay` / `238adfde`). DrawingOverlay (render-only, perfect-freehand) + BaseCanvas arbiter `drawMode` branch + DrawToolbar + drawStrokes helpers + MatchPage wiring. Entry chip `✏ Rysuj` LANDSCAPE-only on Match scout per § 77 decision #1 (portrait + portrait-FS = no draw). `point.annotations` Firestore object shape, NATIVE-orientation coords (no mirror at write — Stage 2 mirrors at read). Stage 2 = ScoutedTeam aggregation + heatmap toggle (Pozycje/Strzały/Adnotacje) + per-match filter — separate brief after Stage 1 deploys + Jacek smoke OK. Discovery needed first for current ScoutedTeam heatmap toggle state (old docs claim no toggles — verify in CC env).
- **[NEXT after § 77 deploy] Draw Stage 2 — ScoutedTeam annotation aggregation.** Read `point.annotations` for the filter scope (Layout / Tournament / Match / Point — match the existing § 60 / § 61 scope pills); mirror each point's annotations via `mirrorPointToLeft` per `point.fieldSide`; stack on the single coach canvas. Add Annotations toggle (Pozycje / Strzały / Adnotacje) on the heatmap chrome. **Discovery first** — confirm current toggle state on ScoutedTeam (old docs: no toggles; verify), confirm `mirrorPointToLeft` symmetry for annotation point arrays.
- **[FUTURE] Tactic → DrawingOverlay unify.** Tactic keeps its current freehand (raw pointer events + own overlay canvas) per Jacek decision 2026-05-24 — portrait + landscape both work today, no urgency. Future ticket migrates to the shared DrawingOverlay + BaseCanvas arbiter for grammar consistency (eliminates the screen-relative coord vs canvas-world coord latent bug noted in § 77 discovery). Data shape (`tactic.freehandStrokes`) stays — same object-of-arrays form, just gain `color` + `size` via migration when toolbar adoption brings it in.
- **[READY-PARKED] A1 — Bump fix.** Discovery 2026-05-24 confirmed two related bugs:
  - **Bump arrow direction:** `drawPlayers.js:185-225` draws Bezier `(px,py)=players[i]` → `(bx,by)=bumpStops[i]` with arrowhead `t=0.88` near `bumpStops`. But `MatchPage.jsx:1167-1171` writes `bumps[idx] = currentPos` (the FIRST-placed position) and then clears `players[idx]` for re-tap → `bumpStops` = 1st-placed (Jacek's "start"), `players` = 2nd-placed (Jacek's "destination"). Result: arrow tip points to 1st position = "start" instead of intended "destination". Fix = render-side reverse in `drawPlayers.js:200-215` (swap `moveTo(px,py)` ↔ `(bx,by)` + recompute tangent base for arrowhead). **`curve` (`bs.curve ?? 0.15`) at L193 is bow-only, not direction — don't touch.**
  - **Precision-shot origin for bumpers:** `drawPlayers.js:100-132` "Regular shots — originate from player position" uses `originX = p.x * w` (= `players[i]` = 2nd-placed/destination). Per Jacek's intent, when a bump exists, origin should be `bumpStops[i]` (the 1st-placed position — "shoots from bump, then jumps"). Lane decision (re-origin `shots[i]` when bump present vs route new post-bump shots to existing `bumpShots[i]` lane) deferred to fix brief — CC will confirm whether `bumpShots` lane is reachable from the scout-side ShotDrawer flow before deciding.
  - **Status:** brief ready in spirit; not started. Wraca po full-screen + DrawingOverlay.

- **[DECISION] A2 — ShotDrawer § 75 grammar conformance: MIGRATE, NOT patch.** Discovery 2026-05-24 confirmed ShotDrawer (`src/components/ShotDrawer.jsx`) is **not a canvas** — `<img>` + native browser scroll + absolute `<div>` markers with `pointerEvents:'none'`. That's the canonical § 75 "grammar drift" pattern. The dead X icon lives in `drawPlayers.js:124-129` (NOT in ShotDrawer; rendered on the main InteractiveCanvas; hit-test in `touchHandler.findShot` consulted only when `mode==='shoot'`). Per session decision 2026-05-24: choose **migration** path (ShotDrawer → BaseCanvas + specialized canvas wrapper with `viewportSide='opponent-half'` clipping) over local-patch. Deferred as a future § 64 rung **AFTER** full-screen Stage 1 + DrawingOverlay so the BaseCanvas-as-arbiter pattern from DrawingOverlay is templated first. The dead-X removal is coupled to whatever shot-element interaction model lands with migration (not a stand-alone delete).

- **[NEXT] DrawingOverlay — gated on clickable toolbar mockup → impl.** Discovery 2026-05-24 confirmed: DrawingOverlay is **not in code** (zero matches), `perfect-freehand` is **not in deps**. Existing freehand lives in `TacticPage.jsx:469-526` only (raw pointer-event capture + separate overlay `<canvas>`, no library, screen-relative coord mapping not zoom-aware). Three host surfaces: Match (new field `point.annotations`), Tactic (existing `tactic.freehandStrokes`), ScoutedTeam (new field `scouted.annotations`). **Arbitraż gestów — DECYZJA 2026-05-24 (iPad / PencilKit model):** unified at **BaseCanvas** — DrawingOverlay = warstwa TYLKO renderująca (`pointerEvents:'none'`); BaseCanvas is the arbiter that routes `1-finger in drawMode → registered draw-consumer`, `2-fingers → zoom/pan (untouchable)`, and `drawMode deactivates field-edit`. Draw engine lives in consumer / DrawingOverlay (not in touchHandler — touchHandler stays as input source, BaseCanvas adds routing). **Event-forwarding REJECTED** (two input surfaces + synthetic dispatch is fragile on mobile Safari AND violates § 64 "BaseCanvas owns input"). Implication: touches BaseCanvas's arbiter — surgical change + extra smoke for tap/drag/pan/zoom (the regression we just fixed must hold under the new arbiter path).

**Rules:** Inline JSX styles (COLORS/FONT/TOUCH from theme.js). English UI labels.
Don't touch `src/workers/ballisticsEngine.js` (Opus territory).
Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`

---

# 🟢 ACTIVE — NXL Czechy 2026-05-15..17

**§ 62 — Heatmap density removal + stroked markers** — shipped 2026-05-15 (merge `15ae8e2`). Live; visual smoke from Jacek's floor view ongoing.
**Schedule import scouted-division repair + source fix** — shipped 2026-05-15 (merge `e0e3e6b`). Repair + Coach-tab populate validation pending Jacek on the tournament floor (open Coach tab on NXL Czechy → self-gated Repair Btn → tap → counter renders → Teams populate → Btn vanishes).
**Multi-device point-overwrite hotfix** — shipped 2026-05-15 (merge `3b236cf`). Two-device smoke validation pending Jacek on the tournament floor.

**Security-roles-v2 finish** — DONE: merged via commits `fb049ac` (View Switcher § 38.5-38.6) + `50434fb` (Firestore rules v2 + legacy cleanup § 38.9). Path A foundation complete. Phase 0 CC discovery 2026-05-19 confirmed merged state — `git log main..feat/security-roles-v2` empty.

**Brief A — Pre-NXL Refinements** — shipped 2026-05-12 (merge `36104cb`, § 60 in DESIGN_DECISIONS, brief archived).
**Brief B — Deaths Heatmap v2** — shipped 2026-05-12 (merge `a5bb51e`, § 61 in DESIGN_DECISIONS, brief archived). iPhone smoke test on production still owed; coord-frame check (§ 61.8) most critical. See `DEPLOY_LOG.md` 2026-05-12 Brief B row for 10-step walkthrough.
**Schedule CSV + workspace auto-match** — shipped 2026-05-13 (`5b1e15f`) + 2026-05-14 (`d4653ef`). [DONE] Real-data validation 2026-05-14: zero-hit symptom was browser cache (hypothesis 1) — no code fix needed. Normalizer fallback not shipped (not needed).

## 🔵 IN FLIGHT — Klocek 2 / Multi-source reconciliation (§ 70, Phase 1b)

- **Stage 1 — Foundation** — ✅ SHIPPED + deployed (merge `373cc84`). `'coach'` source tag on QuickLog writes; dormant `getOrCreateFreePlayMatchup` helper (training-only); § 70 + `docs/architecture/MULTISOURCE_RECONCILIATION.md`.
- **Stage 1b — Free-play coach UI** — ✅ SHIPPED + deployed (merge `01a93ed`). "Log free play" card (TrainingScoutTab) + squad-less QuickLogView `freePlay` mode (pick → zone → per-player survived/eliminated → save); `outcome:null`, `_meta source:'coach'`. STEP 2.4 winRate-over-decided fixes (TrainingResultsPage + playerStats). `isFreePlay` filtered from the matchup list.
- **Stage 2 — Matcher + write-back propagator** — ✅ SHIPPED + deployed (merge `184c04c`). `propagateMatchup` / `propagateSelfReportToPoint` (identity-primary, position-confidence); shared write-back KIOSK adopted; hooked into `endMatchupAndMerge` + `updateTraining`-close. Late-log deferred (batch-only). `selfReportMatcher.js` pure logic.
- **Stage 3 — Granular read + event-scoped aggregation** — ✅ **SHIPPED** (§ 70.8). **D2:** `getEventShotFrequencies` + "Break bunkers" breakdown on TrainingResultsPage (collection-group index live). **D1:** source-filtered training heatmap on TrainingResultsPage — `<FieldView mode="heatmap">` + All·Scout·Coach·Player pills masking slots by `_meta[i].source`.
- **§ 70.9 "Samoocena"** — ✅ SHIPPED — player self-logs (`selfReports`, matched + orphan) on `PlayerStatsPage`, after Historia meczów; reuses `LogRow`. Surfaces orphan self-logs that don't reconcile to a coach point.
- **§ 70.10 D1 self-log dot placement** — ✅ SHIPPED — D1 heatmap player dots were mirrored (bunker-absolute coord wrongly left-normalized → mirror-image bunker). Fix: reverse-lookup nearest bunker → `bunkerToPosition('left')` un-mirrored, render-scoped. FUTURE option (b): read `selfReports` directly → would also surface orphan self-logs on the heatmap (coverage decision, deferred).
- **Stage 4 — Manual override UI** — ✅ SHIPPED (§ 70.11) — "Needs review" queue on `TrainingResultsPage` (coach/admin-gated): Accept / Reassign / Dismiss flagged low-confidence self-logs. `reviewDismissedAt` sticky marker; matcher honours it. **§ 70 / Track C / Klocek 2 — COMPLETE.**
- **`LogRow` card enhancement** [queued — MOCKUP-FIRST] — the self-log card (`LogRow`, shared by "Samoocena" + PPT `/player/log`) should show (1) the **event/training** the log belongs to — essential in global scope where 47 logs span 4 trainings — and (2) explicit **"Rozbieg / Strzały"** labels (today only raw values: "DOG" over "DOG → SNAKE" is ambiguous — breakout vs shot target). **Jacek wants an Opus mockup across device sizes BEFORE a build brief.** Notes: `LogRow` is `{row,ordinal,isPending}` → needs an `eventLabel` prop; `trainingId→name` resolved by the caller; wording via `ppt_*` i18n keys; decide event-label always vs global-scope-only.
- Note: `isFreePlay` matchups are filtered from the `TrainingScoutTab` matchup list (Stage 1b). A future re-scope of a dedicated free-play history surface, if wanted, is open.

## 🟠 Home / landing view — PARKED (mockup-first)

- **Home / landing view** [PARKED — mockup-first, awaiting Opus] — when all tournaments AND trainings are closed, the app lands on the More tab ("Ustawienia" / Settings) — looks broken on every entry. **Two root causes:** (1) "closed" isn't treated as "no active event" — `subscribeTournaments` has no status filter, and close/end never clears `activeTournament` / `localStorage`, so a closed event stays a valid `tournament` object; (2) the § 31 empty state is unreachable under `activeTab==='more'` — the Close/End actions live in the More tab, which forces the persisted last-tab to `'more'`. **Fix needs BOTH:** closed-as-no-active-event + a home reachable regardless of tab. Direction recorded in `DESIGN_DECISIONS.md` § 73 (one shared home, role-aware cards). Awaiting an Opus clickable mockup before a build brief.

## 🟡 New POST-NXL follow-ups from multi-device hotfix

- **Cross-device same-UID presence banner.** Brief F retired the match-level claim system so two devices on same UID have zero contention signal. Need a passive presence indicator (e.g. heartbeat doc keyed by `{matchId}_{uid}_{deviceId}` with lastSeen timestamp, banner if >1 fresh entry). Separate brief — non-trivial design surface (PWA presence + UX copy + privacy).
- **selfReports cross-pid tighten (rules audit gap #2 / § 49.10)** — ✅ FIXED 2026-05-23. Was: `/players/{pid}/selfReports/{sid}` write gated on `isPlayer(slug)` only → any workspace player could write any pid's logs (theoretical, invited-only containment). Now: CREATE = `isLinkedSelfPlayer(slug, pid)` (writer == parent player's `linkedUid`); UPDATE/DELETE = `isCoach(slug) OR isLinkedSelfPlayer(slug, pid)` (coach carve-out for § 70 matcher + § 70.11 Stage 4 override paths). Helper `isLinkedSelfPlayer` added. **Rules deploy = separate manual step (`firebase deploy --only firestore:rules`); the file ships with the merge but the live rules don't change until that command runs.**
- **Sentry `onToolbarAction` ReferenceError** in `handleDown` — ✅ FIXED 2026-05-23. **Corrected diagnosis:** not "an undefined prop under a mount sequence" — it was an **undeclared identifier in `handleDown`'s closure scope**. `touchHandler.js:309` referenced bare `onToolbarAction`, but the destructure at L462 is local to `handleUp` and the top-level destructure (L17–26) doesn't include it. `?.()` does not protect against undeclared identifiers — only against `null`/`undefined` values — so every empty-canvas-tap with a toolbar open threw `ReferenceError` and the toolbar failed to close on that path. **Fix:** `stateRef.current.onToolbarAction?.(...)` — matches the existing convention at L555 and `stateRef.current.onEmptyTap` at L311.
- **§ 42 docs update.** Point IDs are now auto-generated (no longer `{matchKey}_{coachShortId}_{NNN}`). `endMatchAndMerge` still index-based so semantics unchanged. Short append to existing § 42 section.
- **Dead-code cleanup.** `setPointWithId` / `setTrainingPointWithId` in `dataService.js:340-344, 705-709` are no longer called. Safe to delete post-NXL.
- **`type:'practice'` dead discriminator.** The `type:'practice'` tournament flag is read in 3 UI spots (`MainPage`, `CoachTabContent`, `ScoutTabContent`) but **zero `type:'practice'` docs exist in production** (§ 69 backfill exercised the derivation on all 14 events — 0 practice). Cleanup candidate alongside the `eventType`/`type` half-merged-discriminator debt (see `docs/architecture/FIRESTORE_DATA_MODEL.md` § 5). Decide: remove the dead `practice` paths, or keep if practice events are a planned feature.
- **Training squad-matchup roster backfill (training guest fix follow-up).** Squad-vs-squad matchups in `matchups/{mid}` carry a frozen `homeRoster`/`awayRoster` snapshot taken at create-time (`TrainingScoutTab.jsx:99-101 / :111-112`) — they reference `training.squads[key]` only ONCE, at matchup creation. After the 2026-05-24 training-guest squad-persist fix (`909e7105`), new attendees correctly land in `training.squads{}`, but any matchup created BEFORE that attendee was invited still has the stale roster array → guest can't be scored against it (zero points accrue in that specific matchup). Future matchups + free-play + coach-summary label all fixed by the deployed change; this is purely about reaching back into existing pre-invite matchups. Decide: (a) one-shot UI "Refresh roster from squads" affordance on each running matchup, (b) dataService helper invoked on attendee-add that walks open matchups for the matching squadKey, or (c) leave as documented limitation — coaches re-open the matchup once attendees stabilize. Option (a) is the simplest if Jacek wants it.

## 🟡 2026-05-24 scouting canvas — bump + precision-shot cluster (Jacek on prod, post-§ 75; needs Opus brief)

Captured 2026-05-24 by Jacek after § 75 + InteractiveCanvas regression fix shipped. **Doc-only capture — NOT authorization to implement.** Build brief needed; A2 best addressed as part of shot-drawer conformance to § 75 grammar rather than ad-hoc patches.

### A1 — Bump semantics (logika)
- Strzałka bumpa renderuje w kierunku punktu **startowego**; ma renderować w kierunku **docelowego**. (`drawPlayers` / bump arrow direction.)
- Precision-shot dla gracza z bumpem originuje z punktu **docelowego**; ma originować z punktu **bumpa** (gracz strzela celnie z bumpa, potem skacze). (Shot origin = bump point dla bumperów.)

### A2 — Shot-drawer § 75 grammar conformance (three symptoms = one problem)
- Martwy X obok postawionych precision-shotów → usunąć (zastąpi go tap→menu).
- Pan w trybie precision nie działa — próba przesunięcia stawia kolejny strzał. Ma: 1-palec pan działa, strzał na tap/on-release (nie place-on-any-touch).
- Usuwanie strzałów tylko przez UNDO → zastąpić: tap-strzału→menu USUŃ + drag postawionego strzału = move. (HIG + § 75 edit-family grammar.)
- **Reframe:** shot-drawer ma adoptować uniwersalną gramatykę z § 75 (tap-element→menu, drag→move, pan działa, place-on-release) zamiast własnego UNDO-only modelu.

> Status: zdiagnozowane przez Jacka na prodzie. Wymaga Opus fix-briefu (po regres-smoke + § 75 sequencing).

## 🟠 [DESIGN-TRACK] Custom named zones — see `docs/product/CUSTOM_ZONES_SPEC.md`

Map → design → implement. **NOT started.** Doc-only capture of intent 2026-05-24 (Jacek). Spec file lists 7 impact surfaces (CC discovery owed) + open design questions + sequence (map → design → implement). Implementacja NIE autoryzowana — capture pierwsze, brief później.

## 🟡 Fragility cluster — surfaced by the MembersPage visibility incident (2026-05-20, § 68)

- **`adminUid` → non-member anomaly.** `removeMember` strips `members[]` but never clears `workspace.adminUid` — so `ranger1996.adminUid` (`JDDCmHSQ…`) currently points to a user who is **not in `members[]`**. Decide: re-point to a live admin, clear it, or leave (Jacek covers admin via `globalRole='super_admin'`). Note the interaction with Phase 3.c.2 `isWorkspaceAdminOf` — that rule helper trusts `adminUid`, so a stale pointer grants workspace-admin writes to a non-member.
- **`members[]` dead-uid prune.** 566 uids in `ranger1996.members[]` have no `/users/` doc + 3 have a doc with no email = **569 dead entries** (post-anonymous-purge stragglers). A migration to drop them. Unblocks a future no-role/assignment surface (the limbo bucket deferred in § 68).
- **super_admin detection is viewer + adminUid scoped, not general** (§ 68 `isElevated`). Fine for single-tenant. Revisit if a second super_admin joins as a workspace member — they would not be auto-surfaced on MembersPage without a per-member `/users/` lookup.
- **Phase 2.3.d — delete-team global/workspace mismatch** — ✅ SHIPPED 2026-05-23. UI "delete team" on `TeamDetailPage:117` + `TeamsPage:66` swapped from `deleteTeam` → `retireTeam` (soft, dual-write, recoverable). Confirm-copy updated (no more misleading "players become unassigned"). `deleteTeam` retained in `dataService` as the super_admin-only hard-delete (AdminTeamsPage). The 1 confirmed orphan (`7rXJ0Z0U3h4wBAaoZzo8` "SKASUJ MNIE") cleaned in closeout. See DESIGN_DECISIONS § 63.15.2.X.1 (Phase 2.3.d follow-up).
- **`leaveWorkspaceSelf` guard — no email fallback.** The Bug 1 guard throws on `adminUid===uid` OR `globalRole==='super_admin'` — narrower than `isSuperAdmin` (which also has the `ADMIN_EMAILS` path). A super_admin whose `globalRole` is null/absent would slip the guard. Add the `ADMIN_EMAILS` email fallback for consistency with `isSuperAdmin`.
- **`computeIsLastAdmin` blind to elevated.** `computeIsLastAdmin` (MoreTabContent) checks role-array `'admin'` only — blind to super_admin, `adminUid`, and `ADMIN_EMAILS`; returns false for everyone in production (nobody holds a role-array `'admin'`). Deprecate it, or widen to the 4-path admin signal.
- **§ 72 follow-up — quick-buttons + "+N" badge** — ✅ SHIPPED — `TeamDetailPage` quick add/remove are teams[]-aware (`withTeamAdded`/`withTeamRemoved`, shared with the editor); `PlayerStatsPage` header shows "+N" for multi-team players. Also fixed a latent crash: § 72 had shipped `TeamDetailPage` using `playerOnTeam` without importing it. Still deferred: mandatory-`pbliId` import toggle.

---

# 🔴 POST-NXL — Queued

Items deferred until after NXL Czechy 2026-05-15. Higher-risk or
dependent on architectural decisions (sparing rozkmina).

## User feedback from Jacek 2026-05-12 — moderate/risky tier

- **SCOUT #1:** Roster picker should filter per-tournament roster (currently shows parent + all child teams). Need CC discovery on data flow before fix.
- **SCOUT #2:** Self-log FAB icon visible when it shouldn't be. Need CC discovery — pin down where gating fails. Distinct from earlier Issue #4 (PPT picker training-only).
- **SCOUT #3:** Cache leak between scouted points — viewing point N then scouting new point loads N's data into draft. Likely `useEffect` cleanup bug in MatchPage. Critical for scouting integrity.
- **SCOUT #4:** Partial save — save break without point outcome. Schema change (`point.status='partial'`). Coordinate with sparing architecture rozkmina.
- **SCOUT #5:** Concurrent scouting side flip for "lazy scout" rotating 4 teams (AvB then CvD on alternate points, scout stays one side). Overlaps with existing `outputs/CC_BRIEF_AUTO_SWAP_REGRESSION.md` — verify status with CC first; may already be addressed.
- **SCOUT #7:** Completeness table moved to bottom of scouting view above END MATCH, collapsed by default.
- **COACH #5:** Strzelanie percentage formula refactor (denominator = N×5 − runners − undeclared = 100%). Independent ticket from COACH #4 (banner shipped in Brief A).
- **NEW ACCOUNT #1:** Onboarding hang — new user gets stuck on player profile match modal. App should work without matched profile. **Critical UX for new user funnel.**

## Pre-existing roadmap (from prior planning sessions)

- **Auto-swap regression** — `outputs/CC_BRIEF_AUTO_SWAP_REGRESSION.md`. **Verify status with CC** — may have shipped post-2026-04-28; if not, brief still valid. Gates SCOUT #5.
- **Sparing architecture rozkmina** (Issues #3 + #6 from prior session) — 5 product decisions needed: collection affiliation, sticky-state localStorage keying, wizard host resolution, copy/UI context assumptions, events unification. Gates PPT picker fix, sparing implementation, and player claim flow brief.
- **Events architecture decision** — unifying training/tournament/sparing: Model A (status quo, separate collections), Model B (single `events` collection), or Model C (lightweight `events_index`). Sub-decision within sparing rozkmina.
- **Player motivation claim flow brief** — mockup approved 2026-05-02 at `outputs/player_claim_flow_mockup.html`. Brief TBD post-sparing.
- **Self-log Phase 1b** — propagator / matcher / conflict resolver. Deferred post-sparing.
- **`ARCHITECTURE_C4_v2.html` + § 38 in DESIGN_DECISIONS** — needs CC discovery pass against real production code before diagramming. Blocked on desktop session with GitHub connector.
- **Tier D security items** — custom claims, per-pid selfReports ownership, `/users` global read, adminUid create-time validation. Post-MAX explicit defer.

## Features (longer-horizon backlog)

- **BreakAnalyzer module** — Phase 1 spec at `docs/architecture/BREAK_ANALYZER_SPEC.md`. Implementation scaffolded but needs tuning vs real field data. Opus territory.
- **Tournament tendencies** — team / lineup / player level analytics. Blocks on sufficient scouted data volume + SelfLog maturity.
- **F5: Self-scouting + counter analysis** — partially addressed by SelfLog hybrid view; may need own brief.
- **F6: Tournament profiles** — per Jacek may be solved by quick shots dual mode (verify).
- **F7: Training data → break selection** — adjacent to SelfLog flywheel; wait for data to accumulate first.
- **Practice tournament type** — ad-hoc lineups, no player history impact.

---

# 🧱 BLOCKED on architecture decision

### Canvas unification + universal drawing layer
**Status:** Phase 0 done 2026-05-19 (commit `c90c924`). Rozkmina #2 DONE 2026-05-19 — Option B locked in DESIGN_DECISIONS § 64. 8 implementation tasks ready for per-view briefs (Etap 5).
**Document:** `docs/architecture/CANVAS_ARCHITECTURE.md` + `docs/DESIGN_DECISIONS.md` § 64

**Decisions made (DESIGN_DECISIONS § 64, 11 sub-decisions packaged):**
- **Option B locked** — BaseCanvas + specialized children (InteractiveCanvas, HeatmapCanvas, AnalyticsCanvas) + composable DrawingOverlay
- Drawing layer: separate composable overlay component (not built into BaseCanvas)
- Drawing persistence: hybrid (ephemeral default + "Save annotation" promotes to Firestore; TacticPage retains auto-save)
- Drawing P0: freehand + 6-color palette + color picker + clear all. P1: undo + thickness toggle + stroke eraser.
- FieldView deprecated; ScoutedTeamPage migrates to direct HeatmapCanvas
- AnalyticsCanvas extracted from LayoutAnalyticsPage custom canvas
- `viewportSide` half-field prop promoted to BaseCanvas (resurrected from dormant FieldCanvas infrastructure)
- `useLandscapeMode()` hook extraction
- DPR runtime detection replaces hardcoded `×2`
- `drawZones.js` i18n cleanup pre-refactor (mechanical, low-risk)
- Multi-user drawing attribution deferred (single-user MVP)

**Blocked items (waiting on per-view implementation briefs):**
- Landscape coach view (ScoutedTeamPage heatmap) — first beneficiary per § 64.10
- Universal drawing layer (Feliks workflow replication)
- Consolidation of FieldCanvas / HeatmapCanvas / FieldView / LayoutAnalyticsPage custom canvas

**Unblock path:**
1. ✅ Phase 0 CC desktop discovery (done 2026-05-19, commit `c90c924`)
2. ✅ Rozkmina #2 — Canvas Etap 4 RESOLVED 2026-05-19 as Option B (commit landing now). See DESIGN_DECISIONS § 64.
3. Jacek asks Feliks which iPad app he uses (resolves § 5.5, refines drawing layer P1 priority)
4. Per-view implementation briefs (8 sequential steps below, each one PR + one CC brief + one deploy log entry)
5. Landscape coach view feature ships on top of unified base (Etap 6 — first beneficiary)

**READY FOR BRIEF — 8 sequential canvas refactor implementation tasks** (per § 64.9):

- ✅ **Step 1 — `drawZones.js` i18n cleanup** — DONE 2026-05-19, deployed commit `5f12f7d`. 5 hardcoded labels moved to `i18n.js` `zone_label_*` keys. `drawZones` accepts `t` accessor; `FieldCanvas` passes through via `useLanguage` hook. No behavior change. See DEPLOY_LOG 2026-05-19.
- ✅ **Step 2 — BaseCanvas extraction + `useLandscapeMode` hook** — DONE 2026-05-23, deployed merge `53df791`. Additive only — main bundle hash bit-identical pre/post deploy. § 64.9 step #2 + #3 combined: `src/components/canvas/BaseCanvas.jsx` (7 § 64.3 concerns + § 64.4 gesture composition + § 64.8.3 viewportSide + § 64.8.5 DPR) and `src/hooks/useLandscapeMode.js` (formula + `canvasMaxHeight(L,P)` + canonical per-site offset table embedded as doc-comment). Step-2 limitation documented in-file: `pinchZoom`/`pan`/`loupe` collectively gated (touchHandler is monolithic) — granular gating at touchHandler refactor. See DESIGN_DECISIONS § 64.11.
- ✅ **Step 3 (§ 64.9 #4) — FieldCanvas → InteractiveCanvas migration** — DONE 2026-05-24, deployed merge `2b6a473`. NEW `src/components/canvas/InteractiveCanvas.jsx` composing BaseCanvas + verbatim feature-layer transplant. 4 consumers migrated (BunkerEditorPage:173 / LayoutDetailPage:395 / TacticPage:433 / MatchPage:1835). `canvasMaxHeight(L,P)` from `useLandscapeMode` with verbatim § 64.11 offsets. FieldCanvas legacy retained for BallisticsPage (Opus territory) — `FieldCanvas:263` `×2` deferred. First live test of BaseCanvas gestures + `viewportSide` promotion. Bundle delta +0.09 kB. See DEPLOY_LOG 2026-05-24 + DESIGN_DECISIONS § 64.9 step #4.
- **🎯 Step 4 (§ 64.9 #5) — HeatmapCanvas extends BaseCanvas + gesture opt-in prop** — next active. Reference: § 64.1, § 64.4. Unblocks landscape coach view (step #11).
- **Step 5 — AnalyticsCanvas extraction from LayoutAnalyticsPage custom canvas** — Brief TBD. Reference: § 64.1, § 64.8.2.
- **Step 6 — ScoutedTeamPage off FieldView + FieldView deprecation** — Brief TBD. Reference: § 64.8.1.
- **Step 7 — DrawingOverlay component extraction** — Brief TBD. Reference: § 64.5–64.7.
- **Step 8 — Landscape coach view on ScoutedTeamPage heatmap** — Brief TBD. First beneficiary per § 64.10. Builds on Steps 2 + 4 + 6.

Steps are sequential dependencies but each is one CC PR. Order subject to per-brief discussion when writing them.

### Multi-Tenant Architecture migration
**Status:** 🎉 Phase 1 COMPLETE. 🎉 Phase 2 Step 1 (Leagues) COMPLETE 2026-05-19. 🎉 Phase 2 Step 2 (Players) effectively COMPLETE 2026-05-19. 🎉 Phase 2 Step 3 (Teams) effectively COMPLETE 2026-05-20. ✅ **§ 65 Permissions Architecture locked + AI Vision OCR import disabled 2026-05-20** (`2997cca`) — Phase 3 foundation prep: 5-role model + ownership semantics + Q1-Q4 resolutions + Phase 3 sub-task plan locked in DESIGN_DECISIONS § 65; client-side Anthropic API key reads gated behind `STATIC_FLAGS.ENABLE_VISION_API: false` across 3 sites (Layout Wizard + LayoutDetailPage OCR dead-code + ScheduleImport schedule OCR). § 63.15.2.X (`732dd8e`) + § 63.15.2.X.1 (in 2.3.c commit) lock policy + UX patterns. **Next strategic decision: Phase 2.4 (TeamMemberships junction — ownership semantics now defined via § 65.2) OR Phase 3.a (role schema + user migration) OR Canvas Step 2 (BaseCanvas extraction). Three independent tracks — pick by priority.**
**Document:** `docs/DESIGN_DECISIONS.md` § 63 (+ § 63.15 + § 63.16) + `docs/architecture/PHASE_0_DISCOVERY_FINDINGS.md`

**Decisions made:**
- Unified `/workspaces/{slug}/events/{eid}` collection (replaces /tournaments/ + /trainings/)
- Multi-workspace user membership + auto-derived Super Coach role (extends § 49 `workspaces[]` foundation)
- ✅ **§ 63.3 schema choice: Option α (resolved 2026-05-19 rozkmina #1)** — drop `users/{uid}.workspaces` field, source of truth = `workspace.userRoles[uid]`, switcher uses collectionGroup query. See § 63.3 Decision sub-block for Implementation notes.
- Hybrid layout library: global `/layouts/` + workspace overrides + workspace-private custom layouts
- Phased aggregation: manual trigger Phase 1 → scheduled Cloud Function Phase 2 (Blaze upgrade prerequisite)
- Workspace slug in URL path (`/w/:slug/event/:eid/...`)
- Container `NewEventWizard` + shared steps + type-specific sub-flows (existing `NewTournamentModal` already has 3-type selector — refactor is rename+extract)
- Mixed copy (generic + type-specific) — "matchup" → "match" globally
- i18next library migration with per-language JSON files
- ✅ Player identity cross-workspace: global, mirrors layout pattern (resolved formal 2026-05-19 rozkmina #3, schema in § 63.15.3)
- ✅ **Teams as global: formal RESOLVED 2026-05-19 rozkmina #3** — workspace-managed but globally visible, `pbliTeamId` dedup, child teams pattern preserved. Schema in § 63.15.2.
- ✅ **Leagues as configurable global resource: RESOLVED 2026-05-19 rozkmina #3** — `/leagues/` collection, super admin write, all read. Pre-populate from current LEAGUES/DIVISIONS constants. Schema in § 63.15.1.
- ✅ **Player–Team many-to-many via TeamMemberships junction: RESOLVED 2026-05-19 rozkmina #3** — unlocks multi-league multi-team simultaneous memberships (NXL US Semi-Pro + NXL EU Pro + PXL). Schema in § 63.15.4.
- ✅ **GlobalEvents architecture: Option B RESOLVED formal 2026-05-19 rozkmina #3** — `/globalEvents/{geid}` registry + optional workspace linkage, composite + aggregate aggregation modes, phase boundaries α/β/γ/δ. Reconciliation preliminary trust-one-source (Phase γ formal lock deferred). Full content in § 63.16.

**Blocked items (waiting on migration plan write + per-step implementation briefs):**
- All multi-tenant migration phases 1-10 (see § 63.12)
- Onboarding US PRO team (waiting for workspace isolation verification)
- Layout insights monetization (waiting for aggregation Phase 2)
- New language support beyond PL/EN (waiting for i18next migration)

**Unblock path:**
1. ✅ Phase 0 CC desktop discovery done 2026-05-19 (see DESIGN_DECISIONS § 63.X Findings + `docs/architecture/PHASE_0_DISCOVERY_FINDINGS.md`)
2. ✅ Rozkmina #1 — § 63.3 schema choice RESOLVED 2026-05-19 as Option α (drop `users.workspaces` field)
3. ✅ Rozkmina #3 — Global Resources + GlobalEvents RESOLVED 2026-05-19 (§ 63.15 + § 63.16)
4. ✅ MULTI_TENANT_MIGRATION_PLAN.md written 2026-05-19 (`docs/architecture/MULTI_TENANT_MIGRATION_PLAN.md`)
5. Per-phase implementation briefs (READY FOR BRIEF entries below)
6. Sequential phase execution with monitoring soaks between phases

**READY FOR BRIEF — 6 multi-tenant implementation tasks:**

- ✅ **Phase 1.1 — useUserWorkspaces hook** — DONE 2026-05-19, deployed commit `b90ffed`. New `src/hooks/useUserWorkspaces.js` queries `workspace.userRoles[uid]` map field as source of truth. Foundation hook for switcher UI (no consumer wired yet — separate UX brief). See DEPLOY_LOG 2026-05-19 for smoke test steps.
- ✅ **Phase 1.2 — Drop users.workspaces write path + bootstrap refactor** — DONE 2026-05-19, deployed commit `6c9ad4f`. Removed sole writer at `dataService.js:getOrCreateUserProfile`. Inline SoT comments added at 3 userRoles write sites in `useWorkspace.jsx`. Field is fully orphan in code (zero readers + zero writers, verified by post-change grep). Bootstrap auto-join behavior preserved. See DEPLOY_LOG 2026-05-19. NOTE: Phase 1.1 finding "no current direct write" was based on reads-only grep — Phase 1.2 wider field-name grep surfaced the signup writer.
- ✅ **Phase 1.3 — Migration script + field deletion** — DONE 2026-05-19. Script committed (`e560151`), run by CC after Jacek GO. 18 user docs migrated, 0 errors. Post-write verification confirmed 0 docs with `workspaces` field remaining. **🎉 Phase 1 schema foundation COMPLETE.**
- ✅ **Phase 2.1a — Leagues collection bootstrap script** — DONE 2026-05-19. Script committed (`324f380`), run by CC autonomously. `/leagues/` collection populated with 3 docs (l_nxl + 7 divisions, l_pxl + 3, l_dpl + 3) per § 63.15.1 schema. Idempotency verified. App behavior unchanged.
- ✅ **Phase 2.1b — useLeagues hook + workspace consumption refactor** — DONE 2026-05-19, deployed `2f81b2b`. 3 new files (buildLeaguesFromConstants adapter + useLeagues hook + useLeagueDivisions helper). 6 React consumers refactored (NewTournamentModal, LayoutDetailPage, LayoutWizardPage, MainPage EditTournamentModal, TeamDetailPage, TeamsPage). Additive constants-fallback pattern, Sentry on fetch error. Stored value format preserved (option.value = d.name). Utility consumers (CSVImport normalizeDivision, divisionAliases.js) stay with constants per scope discipline. See DEPLOY_LOG 2026-05-19 for smoke test steps.
- ✅ **Phase 2.1c — Super admin UI for league management** — DONE 2026-05-19, deployed `96e9951`. New /admin/leagues route + AdminLeaguesPage + LeagueFormModal. Defense in depth (3 layers): AdminGuard route wrap + component check + Firestore rules. Soft delete only. useLeagues now filters active=true by default; useAllLeagues for admin view. More tab admin section gets "Leagues" link. 🚨 **Pending Jacek action**: `firebase deploy --only firestore:rules` to apply new /leagues/ rules block (admin-only writes + unblock useLeagues reads which were silent-falling-back to constants per default-deny since Phase 2.1a). See DEPLOY_LOG 2026-05-19 for full smoke test.
- ✅ **Phase 2.2.a — Players bootstrap (discovery + execute)** — DONE 2026-05-19, commit `ab1319c` + execute run. 976 → 934 global docs in `/players/`. Option α (preserve IDs). 42 dedup groups collapsed (intra-workspace batch-import dups, zero name conflicts). Aliases tracked in `aliasIds[]` on canonical. Legacy `/workspaces/ranger1996/players/` untouched. Idempotency verified. Reports in scripts/migration/reports/.
- ✅ **Phase 2.2.b — usePlayers global + alias resolution + workspace consumption refactor** — DEPLOYED 2026-05-19, commit `8614a9b` (sequenced rules + code deploy). 12 files modified: usePlayers hook now reads /players/ Firestore (onSnapshot + Sentry), playersById map with canonical+alias keys, dataService 5 player write fns dual-write to global + legacy paths, firestore.rules /players/ block added, 11 consumer files swapped raw-ID find → playersById lookup. 42 Phase 2.2.a alias mappings transparently resolve. See DEPLOY_LOG 2026-05-19 for smoke test plan.
- ✅ **Phase 2.2.c — Super admin UI for global players CRUD** — DEPLOYED 2026-05-19, commit `7de12d4`. New `/admin/players` route + AdminPlayersPage + PlayerFormModal. Search + filter (All/Linked/Unlinked/HERO) + sort + paginated 50/page (~19 pages for 934 docs), URL-backed state (bookmarkable filtered views). Defense in depth (3 layers): AdminGuard route, component check, Firestore rules from 2.2.b (admin email delete gate). Create + edit via dual-write `addPlayer` / `updatePlayer`; new `deletePlayerGlobal()` is global-only hard delete (workspace doc preserved until 2.2.d). Delete confirmation branches on `aliasIds[]`: enhanced warning with full alias list + orphan-data callout for canonical-with-aliases case (informed consent, not hard block per data-loss waiver). Form excludes `teamId`/`teamHistory` per § 63.15.3 (workspace-scoped, Phase 2.4 territory). Audit section read-only. More tab admin "Players" link added. Bundle: 15.87kB / 5.22kB gzip (lazy). See DEPLOY_LOG 2026-05-19 for 13-step smoke test.
- **Phase 2.2.d — Legacy `/workspaces/{slug}/players/` cleanup** — DEFERRED until Phase 2.2.c stable + Phase 2.3 maturity. Migration script to remove workspace player-write paths from dataService + drop subcollection. Low priority; recovery cushion useful while dual-write churns.
- **Switcher UI brief (UX work)** — Consumes `useUserWorkspaces()` hook. Slack-style workspace picker in More tab per § 63.3. Independent of Phase 1.2/1.3 mechanics. Brief TBD.

- **Phase 2 implementation — Step 1: Leagues collection bootstrap** — CC Brief TBD (post migration plan). Pre-populate `/leagues/` from `LEAGUES` + per-league `DIVISIONS` constants. Super admin UI for league management. Workspace UI consumes read-only. Reference: § 63.15.1.
- **Phase 2 implementation — Step 2: Players global migration** — CC Brief TBD. Hoist workspace players to `/players/` with `pbliId` dedup. Workspace UI updates to query global. Reference: § 63.15.3.
- ✅ **Phase 2.3.a — Teams bootstrap (audit + dry-run + execute)** — DONE 2026-05-20. Scripts committed `a8cb308`, execute run by CC after Jacek GO. 132 global `/teams/` docs created (125 parents + 7 children, 0 orphans). Option α (preserve workspace docIds as global IDs). Verbatim schema hoist + 3 migration tracking fields (originWorkspace, migratedAt, createdAt/updatedAt). NO automatic dedup per § 63.15.2.X — 1 known externalId dup (RANGER vs Ranger Warsaw) migrated as separate global docs, admin curates via 2.3.c. 9 intra-workspace name overlaps are legitimate brand-multi-division pairs per § 63.15.2 (NXL PRO + NXL PRO3v3 variants). Reports in scripts/migration/reports/. Legacy /workspaces/ranger1996/teams/ untouched.
- ✅ **Phase 2.3.b — useTeams global hook + workspace consumption refactor + dual-write** — DEPLOYED 2026-05-20, commit `97af95a` (sequenced rules + code deploy). 3 files: useTeams hook refactored to read /teams/ via onSnapshot + teamsById map for O(1) parentTeamId resolution + Sentry on error; dataService addTeam/updateTeam dual-write to both global + legacy paths; firestore.rules /teams/ block added (read auth, create+update auth, delete admin). All 20 React consumers automatically picked up the change via centralized useTeams hook (zero consumer file changes). deleteTeam workspace-only (global delete deferred to 2.3.c). breakoutVariants subcollection untouched per § 63.15.2 workspace-context decision. See DEPLOY_LOG 2026-05-20 for smoke verification.
- ✅ **Phase 2.3.c — Super admin UI for global teams CRUD + sister team picker + duplicate resolution** — DEPLOYED 2026-05-20, commit `6638c54`. `/admin/teams` route + 5 new components (AdminTeamsPage + TeamFormModal + TeamPickerModal + TeamDuplicateResolutionView + ChildrenOrphanWarning) + 3 new dataService fns (retireTeam/unretireTeam/setParentTeam with cycle prevention) + useActiveTeams asymmetric hook (teams=active filtered, teamsById=all preserved for spot lookups) + 21 useTeams → useActiveTeams consumer refactor + schema additions (retiredAt/retiredBy/retirementReason/canonicalReplacementId — all nullable additive) + § 63.15.2.X.1 doc patch locking UX patterns. Soft delete via retiredAt (NOT hard delete). Recommendation heuristic: children×100 + playerRefs×1 + recency (tournament refs deferred per § 63.15.2.X.1). Reference re-pointing checkbox shown DISABLED with explanation. Defense in depth (3 layers): AdminGuard + component check + firestore.rules from 2.3.b. See DEPLOY_LOG 2026-05-20 for 17-step smoke test.
- **Phase 2.3.d — Legacy /workspaces/{slug}/teams/ cleanup** — DEFERRED until 2.3.c stable + Phase 2.4 TeamMemberships maturity. Migration script to remove workspace write paths from dataService + drop subcollection. Optional add-on: implement reference re-pointing (tournament/player teamId → canonical) for soft-deleted teams via collectionGroup query updates.
- **🎯 Phase 2.4 — TeamMemberships junction migration** — READY FOR CC BRIEF WRITING. With Phase 2.3 (Teams) complete + § 65 ownership semantics defined (single owner via `ownerWorkspaceId`, super_admin curatable), junction collection can reference global team IDs + global player IDs. Split team.players/roster arrays into `/teamMemberships/{tmid}` docs per § 63.15.4 (playerId + teamId + season + role + jerseyNumber + startDate + endDate). Multi-league memberships unlocked (NXL US Pro + NXL EU Pro + PXL simultaneously). Use useActiveTeams + usePlayers for active-only filter. Reference: § 63.15.4 + § 65.2.

---

# Phase 3 — Permissions Implementation (⏳ pending, ordered per § 65.6)

- ✅ **Phase 3.a — globalRole field + isAdmin 4th path + useIsSuperAdmin** — code DONE + deployed 2026-05-20 (commit `8f77d62`), per § 66.5. Added `users.globalRole: 'super_admin' | null` field, `isAdmin()` 4th path (optional 3rd param — backwards compat), `isSuperAdmin()` helper, `useIsSuperAdmin()` hook (`src/hooks/useIsSuperAdmin.js`), `userProfile` propagation through both `isAdmin` util call sites in useWorkspace. ZERO refactor of § 38 v2.1 infra (per § 66.6). ✅ **Migration run 2026-05-20** — `phase_3_a_globalrole.cjs` executed: 21 /users/ docs, Jacek = super_admin, 20 = null (`globalRole` explicit on every doc). See § 65.7.2 + DEPLOY_LOG 2026-05-20.
- ✅ **Phase 3.b — super_admin globalRole editing** — DONE + deployed 2026-05-20 (commit `bddeb10`). Scope reconciled at pre-flight: the brief's `/admin/users` console would ~80% duplicate existing MembersPage/UserDetailPage/MemberCard — Jacek chose the minimal path. Shipped: `ds.setUserGlobalRole` + "Global role" section on UserDetailPage (`useIsSuperAdmin`-gated, super_admin only) + SUPER ADMIN badge on MemberCard + 11 i18n keys. First useIsSuperAdmin UI consumer. PendingApprovalPage reviewed — § 27-compliant, no polish. Dedicated cross-workspace `/admin/users` console deferred to multi-tenant onboarding (workspace #2). See § 65.7.3 + DEPLOY_LOG 2026-05-20.
- ✅ **Phase 3.c.1 — Rules helpers refactor + super_admin awareness (§ 67)** — DONE + deployed 2026-05-20 (commit `0aac3c1`). `isBootstrapAdmin` / `isSuperAdmin` (reads Phase 3.a `globalRole`) / `isAdmin` 4-path; 5 hardcoded `token.email` sites centralized; dead `/notes/{nid}` block removed; § 67 Firestore Rules Architecture + § 65.7.4. Backwards compatible — zero behaviour change. Emulator test harness + `isViewer` helper deferred (§ 67.5 / § 67.7). See § 65.7.4 + DEPLOY_LOG 2026-05-20.
- 🎯 **Phase 3.c.2 — Global /players/ + /teams/ create/update hardening (HIGH RISK)** — NEXT. Deps: 3.c.1 ✅. Per § 65.3 matrix: global `/players/` + `/teams/` create/update are currently `auth != null` (any authed user can write any doc) → restrict to super_admin OR workspace_admin with `ownerWorkspaceId` match. Requires `ownerWorkspaceId` field on `/teams/` docs (audit existing data + backfill migration). Adds the `isViewer` helper with its first match-block consumer. Must also cover § 66.3 viewer + player roles. Enumerate all role-consuming sites before deploy. Consider building the § 67.5 emulator test harness here if a JDK is available.
- ⏳ **Phase 3.c.3 — PII scoping per § 65.3 Q4** — pending. Deps: 3.c.2 ✅. Field-level read restrictions on `/users/` emails + linkedUid.
- **Phase 3.d — Workspace admin UI** ⏳ pending. Tenant self-service (own workspace settings, own team management — distinct from /admin/teams super_admin path). Medium risk. Deps: 3.c.
- **Phase 3.e — Player editing model implementation** ⏳ pending. Ownership check on /players/ writes (UI + dataService) — PBLeagues canonical (externalId !== null) = super_admin only; manually created (externalId === null + ownerWorkspaceId match) = workspace_admin in own workspace. Medium risk. Deps: 3.c.
- **Phase 3.f — Team ownership UI** ⏳ pending. Set/change `ownerWorkspaceId` in /admin/teams — extends Phase 2.3.c admin UI. Low risk. Deps: 3.c.
- ✅ **Phase 3.g — AI Vision OCR disable** — DONE 2026-05-20 (bundled with § 65 ship, commit `2997cca`). 3 Anthropic call sites gated behind `STATIC_FLAGS.ENABLE_VISION_API: false` + UI affordances hidden. Re-enable requires Cloud Function migration per § 65.5 anti-pattern.
- **Phase 3.1+ — Annotations layer** ⏸ deferred. `/players/{pid}/workspaceNotes/{wid}` subcollection — per-workspace overlay (nickname, comment, hero tag, favoriteBunker, photoURL). Coach/scout can edit. Canonical player doc never touched. Deps: 3.e + design refinement post-3.e ship.
- **Phase 2 implementation — Step 5: workspace UI updates** — CC Brief TBD. Roster queries, player profile views, team detail pages, scouting flows all migrate to global collections + memberships junction. Reference: § 63.15.5.

- **Phase 3 implementation — GlobalEvents β registry** — CC Brief TBD (post Phase 2 stable). Introduce `/globalEvents/{geid}` collection. Workspace event creation gains optional `globalEventId` linkage. Super admin can pre-populate from PbLeagues schedule. Reference: § 63.16.4 β.

**Independent of:** Canvas Architecture work track. Both can proceed in parallel.

---

# 📦 BACKLOG (see `docs/product/IDEAS_BACKLOG.md` — do NOT implement without instruction)

Dark/light toggle, settings page, colorblind UI toggle, undo stack,
tactic templates, direct manipulation drag, export CSV/Excel, print
layout with overlays, OffscreenCanvas heatmap, SharedArrayBuffer ballistics,
remaining ARIA/WCAG, haptic feedback, keyboard shortcuts, Paintball IQ,
body count analysis, agentic counter explanations, onboarding tunnel,
competitive analysis.
