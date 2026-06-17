# NEXT TASKS — Canonical board for PbScoutPro

> **Canonical-board rule.** If something is *actionable and open*, it lives **here**. `DEPLOY_LOG.md` is the ship ledger (newest-first, full detail); `HANDOVER.md` is narrative state. Zero actionable items living ONLY in DEPLOY_LOG/HANDOVER. Kept current on every doc-closeout.
> **Mandatory reads before code:** `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG), `docs/PROJECT_GUIDELINES.md`, the active brief. See `CLAUDE.md`.

**Last synced:** 2026-06-17 · main HEAD `a73a7744` · reconciled against git log. Full ship detail in `DEPLOY_LOG.md` (newest-first) + git. This board lists only **verified-open** work.

---

## ✅ DONE since the last sync (2026-06-13) — verified against main, detail in DEPLOY_LOG
- **🐍 Reads Snake — 2nd mini-game + game selector** SHIPPED (`59441c23`, 2026-06-17) — classic Snake at `/break/snake` + data-driven game selector at `/break` (Reads Mini → `/break/reads`); `leaderboards/readsSnake`, no rules change (shared `{board}` wildcard; Snake writes constant `mode:'A'`). SFX only. §119 / §27 PASS. Gate 90/90 (Snake T1-T5 fail-first). Shares Reads Mini's STAGE 3 App Check. Smoke owed: tap Take a Break → Snake row → play.
- **Role Visibility Audit — discovery** LANDED (2026-06-17, read-only) — `docs/architecture/ROLE_VISIBILITY_AUDIT.md` (verbatim) + live admin-SDK drift scan (`scripts/migration/role_membership_drift_audit.cjs`). **0 live role-only-without-member accounts** → reported scout lockout not reproducible now (userRoles ~569→22 since B15 cleanup). G1 = preventive policy decision (role-assign co-write members[]? + 7 empty-role keys + 1 member-no-role); G2 = cross-tenant catalog → sequence isolation cutover before FIT; G3 = per-role surface set. **Decisions owed (Jacek/Opus), no app/rules change shipped.**
- **PaT — canonical `pointPhases.js` module + consumer migration** SHIPPED (`7baaf9e3`, 2026-06-17) — single-source phase axis + selectors; migrated MatchPage/StageSwitcher/dataService/generateInsights/HeatmapCanvas/ScoutedTeam off scattered literals. Fixed the object-vs-key `.map(toPersistedLiteral)` bug that crashed the phase row ("Element type is invalid … MatchPage") + emptied the concurrent-merge timeline. `endgame` reserved (`captureEnabled:false`) per ratified D4 — model phase only, no capture/report UI. Tier-1, no rules/data. Gate 88/88. Smoke owed (see DEPLOY_LOG).
- **PaT Stage 2.5 — coach-report per-stage tables** SHIPPED (`da06f0e9`, 2026-06-17) — global `hmPhase` control now drives Breakouts + Shooting + a new elim-reason breakdown (heatmap-per-phase was already done). Stage-aware `computeBreakSurvival`/`computeShotTargets` + `computeEliminationReasons`; carried the previously-dropped keyframe `eliminationReasons` through normalization (read-side). Tier-1, no rules/capture/migration. Gate 86/86. **Charter Stage 2.5 closed.** Smoke owed: switch Break/Settle/Mid on a scouted team with Settle/Mid points.
- **Tactics — all data purged** (`326e4343`, 2026-06-17) — Jacek "nie potrzebujemy tych danych"; OP2 orphan-cleanup then full purge of all 35 (ranger1996 only). Feature code intact (empty stores). Optional future Tier-1: unify the dual-store code.
- **Packing Checklist "Checklista wyjazdowa" (player)** SHIPPED + rules deployed (`a73a7744`, 2026-06-17) — in-app travel checklist (static catalog v1, 3 templates, binary/counted, critical sheet, custom items, progress ring), per-user `users/{uid}/appState/packing` (degrade-to-memory), owner-only rule live. e2e fail-first caught 3 real bugs (t() call-shape crash · `Btn` testid-drop → added `testId`/`ariaLabel` to shared Btn · undefined `FONT_SIZE.md`). Phase 2 parked in `docs/PACKING_CHECKLIST.md`.
- **view-as (role impersonation) RE-ENABLED** (`f45086ea`) — real impersonation + persistent visible exit; admin-guarded; e2e green. (Closes the "Podgląd jako broken" bug.)
- **Playbooks coach-framed door** (`de9f16bb`) — coach drawer entry + role-branded LayoutsPage; e2e green. (Discharges "role-scoped layout-library visibility".)
- **Reads Mini "Take a Break" STAGE 2 build SHIPPED + rules deployed** (`186071e6`, 2026-06-17) — Game&Watch catch game (pure DOM/SVG, lazy chunk) + global leaderboard `leaderboards/readsMini/scores/{uid}` (anti-cheat rules live), entry at the very bottom of both More drawers, e2e (UI flow + leaderboard write vs real rules) green, gate 84/84. **Residual:** (a) audio asset `public/sounds/sky-catcher-loop60.m4a` owed (music degrades silently until dropped); (b) STAGE 3 App Check = separate GO. `lint-ui` skips `src/data/` catalogs now (`30fa3996`).
- **i18n draw aria-labels wrapped** (`fcc62b3d`). **Reads Mini STAGE 1 docs** (`b0022305`, §117) — spec only.
- **Onboarding arc CLOSED** — durable email-link invite (express-reg + email-keyed self-claim; verified-email tenant-isolation rules deployed) `a8ed9cad`; source-of-truth ENTRY fix (userRoles authoritative) `4ddbf0b2`; already-member self-claim `b81fc558`; idempotent re-send `7f4a0f40`; 4 account-stranding fixes + recovery (Maks +3 stamped). **biuro verified `claimed`+coach in prod 2026-06-16.**
- **arc-B `<Screen>` model-C migration TRACK CLOSED** — `Screen.jsx` model C (`8b4ab8e8`, "Jacek decision") + 15 pages live (Teams/Players/Layouts/Members/Profile/TeamDetail/TrainingResults/UserDetail/ScoutDetail/Ranking/Issues + 4 admin). Migration-diff 24/24 (re-baselined `9bdba6cc` for the p-selfedit fixture row).
- **phase-view + nav-drawer** SHIPPED + merged (`154934a4` §B; NavDrawer live). i18n crash classes (t-scope + call-shape) fixed + lints shipped. ITEM-1 drawing unify (`4ae31cfc`); tactics `freehandStrokes` drift fix (`96809879`); Polish-lint refine (`fefcbc7c`); player self-edit catalog-bump best-effort (`db8d4fc2`).

---

## 🔴 OPEN — Bugs (prod / UX)
- **✅ B26 — "Repair scouted rosters" box — CLOSED (2026-06-16).** Investigation ruled out all framed suspects (live tournament subscription; super passes `isScout` via `isSuperAdmin` so the stamp is permitted; super correctly saw box #2) and reframed it: the box MISFRAMED the real problem — scouted-roster "duplicates" are a **player-identity** issue (pbliId-as-primary-key), not roster narrowing. **Resolution: the permanent super-admin box was RETIRED** from `CoachTabContent` (couldn't cheaply self-collapse + misled). The narrowing fn (`repairScoutedRostersForTournament`) stays in dataService (non-destructive — orphan-preserving union — and e2e-covered). Real work → **player-dedup brief** below.
- **✅ Player-identity dedup (pbliId primary key) — COMPLETE (2026-06-16).** `docs/briefs/CC_BRIEF_PLAYER_DEDUP.md`.
  - ✅ **Item 1 prevention LIVE** — `resolvePbliImport` + `CSVImport`: a lone exact-name pbliId-less namesake is claimed (not duplicated); ambiguous → import-log flag. e2e all 4 decisions.
  - ✅ **Item 3 migration DONE** — `--live` merged the **13 obvious** dups (2592→2579; aliasIds preserved; catalogVersion bumped; backup gitignored). 0 pbliId-collisions, 61 namesakes left (real people).
  - ⏭ **Item 2 reconcile UI SKIPPED** (Jacek) — over-engineering for **4 ambiguous**; they go through the existing AdminPlayersPage `MergePlayersModal` if/when wanted (low priority, no ticket).
- **Workspace logo phone fallback (med, §93).** House-icon fallback on iPhone — URL/CORS/cache-headers/PWA cache. Jacek smokes iPhone Safari/PWA.
- **B4 Home role-aware dashboard remainder (med, awaiting Opus mockup).** Cold-open-on-Settings already fixed (`0c4852a2`); the role-aware "get started" home + `NoTournamentEmptyState` copy/CTA still needs a mockup.
- **B8 Strzela% denominator (med, deferred).** Parked in the "data-trust/validation" workstream (Jacek doesn't trust scouted data yet).
- **B20 cross-device same-UID presence (low).** No contention signal after Brief F retired match-claim; passive-presence design.
- **Loupe pan-lag (low perf).** Canvas redraws everything per frame; needs an overlay layer / throttle.
- ✅ **ci-flake `hitability-responsive.spec.js` — FIXED (2026-06-17).** Root cause: fixed `waitForTimeout(350)` before measuring the canvas rect → under full-suite load the ResizeObserver hadn't settled → tap missed the target → exact-count poll timed out. Fix: deterministic `waitForStableBox` (poll boundingBox until two reads match ±1px) + baseline-relative hit counts (spec no longer assumes a 0-hit slate) + 15s poll headroom. Coordinate-mapping assertion unchanged. Validated `--repeat-each=4` + full suite 84/84.

## 🔴 OPEN — Product / Tier-2 (need Opus brief and/or Jacek gate)
- **🌙 Lunar Lander — IN-FLIGHT on `feat/lunar-lander`, ⏸ AWAITING GO to merge.** 4th Arcade game (canvas + device-bezel chrome), brief `CC_BRIEF_LUNAR_LANDER`; spec `DESIGN_DECISIONS §121`; prototype `docs/prototypes/lunar-lander.html`. `GAMES` row + `/break/lander` lazy route; `leaderboards/readsLander` (no rules change; const `mode:'A'`); new-best initials overlay added (rule needs `[A-Z]{3}`); no brand mark in-game. Built + branch-pushed; precommit + build + **92/92 e2e** green. On GO: merge --no-ff → push → DEPLOY_LOG. NOTE: shares selector/route/dataService/i18n append-points with `feat/reads-invaders` (§120) → trivial union-merge conflict to resolve whichever merges second.
- **👾 Reads Invaders — IN-FLIGHT on `feat/reads-invaders`, ⏸ AWAITING GO to merge.** 3rd Arcade game (canvas field + Mini chrome), brief `CC_BRIEF_READS_INVADERS_INAPP`; spec `DESIGN_DECISIONS §120`; prototype `docs/prototypes/reads_invaders.html`. Added as a `GAMES` row in the §119 selector + `/break/invaders` lazy route; `leaderboards/readsInvaders` (Game A/B, no rules change); no brand mark in-game. Built + branch-pushed; precommit + build + **92/92 e2e** green. `/preview` dead → validated local + e2e; smoke prod after merge. On GO: merge --no-ff → push → DEPLOY_LOG.
- **MatchPage review — report-first archetype call (Jacek).** §118.1 made PlayerStats + ScoutedTeam report-first (`railPriority`); MatchPage review was deliberately NOT flipped (capture-adjacent, not a pure report). Decide: keep field-hero, or flip to report-first. (Its B1 stat grid already reflows via `auto-fit`.)
- **Durable follow-up — shared `<ReportTable>` primitive.** The Breakouts/Shooting/big-moves tables (ScoutedTeam) + the PlayerStats grids are copy-pasted fixed-width-right-column patterns. Extract one component (col defs + nowrap + maxWidth) so header-width/clip fixes aren't per-table. Not urgent; do when a 3rd consumer appears.
- **🎮 Reads Mini "Take a Break" — STAGE 2 build SHIPPED (`186071e6`).** Residual: (a) **audio asset** `public/sounds/sky-catcher-loop60.m4a` (60s AAC loop) — drop in; bg music degrades silently until then (SFX already work). (b) **STAGE 3 App Check** (reCAPTCHA v3 web, app-wide enforcement) — separate Jacek GO. Spec `DESIGN_DECISIONS §117`.
- **Field View archetypes — CANON (ratified, not debt).** `docs/architecture/FIELD_VIEW_ARCHETYPES.md`: TWO archetypes — RAIL-NATIVE `CanvasRailLayout` (Match-review/ScoutedTeam wired `d5a67999`; PlayerStats/Hitability already-compliant; shell API + `FieldPhaseControl`/`RailZones`/`fieldViewConfig` `8e8a3885`) + §76 IMMERSIVE `useLandscapeMode` (editors LayoutDetail/Tactic stay immersive — NOT migrations). BunkerEditor/Ballistics = plain/query (no rail); TrainingResults = dashboard. Phase C closed.
  - 🔮 **Future (separate brief, NOT now):** Scout-point capture structural rail-migration (highest-risk; bespoke flow; PaT "E" is §8-owned).
- **splash (READS_SPLASH)** — Tier-2/1.5, spec in repo (`docs/briefs/CC_BRIEF_READS_SPLASH.md`), **NOT built.** Jacek build GO/gate. (rebrand brick 1.)
- **tactics consolidation — DATA SIDE CLOSED (`--live` 2026-06-17).** Jacek: "wyrzucić wszystkie taktyki / nie potrzebujemy tych danych." All 35 tactics (all `ranger1996`, zero customer docs) PURGED — OP2 (24 orphans) then full purge (26 overlay + 9 tournament). Final: 0 tactics. Supersedes OP1 (no migration). `scripts/migration/tactics_purge_all.cjs` (+ `tactics_orphan_cleanup.cjs`); backups outside-repo. **Residual (low, optional Tier-1):** the dual-store CODE (`subscribeTactics`+`subscribeLayoutTactics`/`addTactic`+`addLayoutTactic`/TacticPage two routes) is now feeding empty stores — a future writer-layer unify would remove the debt, but harmless as-is. Discovery: `docs/architecture/TACTICS_TWO_STORE_DISCOVERY.md`.
- **canvas-unify phase-1 — ALREADY DONE by §64** (Interactive→BaseCanvas; 4/5 interactive views migrated). Residual = migrate **BallisticsPage** `FieldCanvas`→`InteractiveCanvas` + delete FieldCanvas. **Gated:** FieldCanvas is marked "Opus territory, off-limits" in-source (`InteractiveCanvas.jsx:29-34`) AND the migration trips a guaranteed DPR pixel-change on non-2-DPR devices (the ×2→`devicePixelRatio` correctness fix). Needs Opus brief + GO; not a pixel-diff=0 autonomous merge. **[→ folds into Field View shell]** Discovery: `docs/architecture/FIELD_VIEW_INVENTORY.md` + CANVAS_MERGE notes.
- **ITEM-2 folded-rail opponent controls** — propagate the mockup-6 phase-view composite into the folded rail. Needs phase-view ratified on MatchPage review + an Opus mockup (56px strip + overlay). **[→ folds into Field View shell]**
- **ScoutedTeam aggregate-phase vs MatchPage review-phase model** — unify into one visual language? Tier-2 redesign (Opus/Jacek), not a propagation. `docs/architecture/CONTROL_LANGUAGE_INVENTORY.md`. **[→ folds into Field View shell]**
- **kiosk join-by-code** [arc E etap 2] — build the flow (code on kiosk lobby + scout join route), then flip `b4-scout-join-disabled` live. Opus brief.
- **events-list redesign** [arc D] — Jacek "przebudować docelowo"; dual-badge OK for now. Opus design brief.
- **arc-B phase-2 "untangle-then-wrap"** — WorkspacesAdmin · LayoutAnalytics · TrainingSetup · LayoutWizard: tangled shell/flex must be restructured before a clean `<Screen>` wrap. Each its own ticket.
- **TrainingSquadsPage → arc-D tool-screen track** (drag-drop builder; `<Screen>` tiering is the wrong frame).
- **AnalyticsCanvas extraction** from LayoutAnalyticsPage (§64.1/64.8.2 canvas-class roadmap).
- **Fold reads-ball into PageHeader app-wide** [arc B] — PPT shows a double bar; fold the drawer trigger into PageHeader. Touches every header.
- **F2 §116 manual-collapse ("focus mode")** + toggle e2e — still TODO.
- **Custom zones** (`docs/product/CUSTOM_ZONES_SPEC.md`) — design pass owed before implementation.
- **Hitability density UX** — at N>5, tap-a-connection-line to record + skip the pick (canvas-archetype interaction). Own brief.

## 🔴 OPEN — i18n
- **Residual ~63 hardcoded-PL** — attended batch (NOT unattended): mixed with domain-data traps (CSVImport `detect:` arrays — must NOT extract) + interpolated log messages. Lint output (post-`fefcbc7c` refine) is the clean candidate list to triage; flag the ~10 ambiguous for ruling. Plus 2 clean aria-labels (`"Rysuj"` MatchPage / `"Rysuj plan coacha"` ScoutedTeam).
- **EN translation pass** — real EN review (EN values currently mirror extraction originals). Owner Opus translates, CC wires.
- **5 differing duplicate keys** — Jacek value-ruling: `no_matches` · `display_name_ph` · `password_changed` · `avatar_coming` · `not_signed_in` (app shows the LAST/live value; confirm or pick the alt). Add a dup-key precommit guard once cleaned.
- **DE/FR/ES + pseudoloc + i18next migration** — after the EN pass (far future).

## 🔴 OPEN — Decisions / verification owed (Jacek)
- **arc-B canvas-page width** — confirm CanvasRailLayout-owns-sizing is the intended answer (no tier cap on the 7 canvas-primary pages). One-word confirm.
- **2 isolation audits** (read-only, before any Phase 2.2.d cutover date) — (a) scouting-data isolation map; (b) layout-overlay shape. Then Jacek sets the date.
- **Phase 2.2.d/2.3.d isolation cutover** — deferred to the production-version push (§90.12, Path A interim accepted); trigger = first tenant doing private scouting that must be invisible.
- **GDPR build** — BLOCKED-ON-LEGAL (Q1-Q2 in `docs/architecture/GDPR_DATA_MAP.md`): (c) privacy/consent page first · (a) delete-user+cascade · (b) export. Plus account-deletion (B) + the guarded free-email script (C).
- **Spark cost ladder #2-4** — trigger ~N=40-50 or peak days (league-scoped catalog · match-listener scoping · version-read caching). `docs/architecture/COST_PROJECTION_SPARK.md`.
- **Per-team setup checklist + cloneable layout library** — trigger when the 2nd-3rd team makes manual onboarding expensive. Opus brief.
- **`defaultWorkspace` in `/users/{uid}` self-update rule** — deferred (lets the auto-enter stamp persist; not load-bearing given membership fallback). Rules-change → CONFIRM.

## 🟡 Smokes owed (Jacek, prod)
- **ITEM-1** — open a tactic with an existing drawing → renders OK under perfect-freehand; duplicate keeps the drawing; new draw+save+reload persists.
- **player profile save** (player-self-edit) · **email-invite end-to-end** (fresh email, different browser) · **Maks/Tymek relogin** (biuro ✅ verified).
- **defaultWorkspace multi-ws switcher** (#4) — other-account prod test → switcher shows >1 ws.
- Carry-over: §98 layout-config (admin edit/coach view-only + flag G §61 iPhone deaths-heatmap coord) · B24 team-name mojibake scan · PWA airplane-mode cold-boot · older §76-§81 checklists (line in DEPLOY_LOG history).

## ⏸ Far-future / parked (out of current sprint)
- **rebrand "reads"** (manifest · name · icons · strings · store listing) — formal track, Opus/Jacek.
- **LP v1 landing page** — Jacek review → domain + waitlist.
- **arc E narratives (w/ Sławek) + onboarding content** — Jacek gathers, then content per narrative.
- **FIT-readiness checklist** — Opus to author ("co musi być prawdą, żeby pierwsza obca drużyna weszła").
- **Switcher UI brief** (Slack-style workspace picker) · **Layout insights monetization** (Blaze) · **US PRO team onboarding** (post isolation-verify) · **B23 F5/F6/F7** (re-validate post-FIT).

---

## 🧵 Active workstream — "Point as Timeline" (charter `docs/POINT_AS_TIMELINE.md`, D1-D3 LOCKED)
Current = **Stage 2** (phase-spine + end-state, scout-side, additive). Opus writes the Stage 2 build brief. (Phase-view display layer already shipped; this is the capture/event-sourcing side.)
