# NEXT TASKS — Canonical board for PbScoutPro

> **Canonical-board rule.** If something is *actionable and open*, it lives **here**. `DEPLOY_LOG.md` is the ship ledger (newest-first, full detail); `HANDOVER.md` is narrative state. Zero actionable items living ONLY in DEPLOY_LOG/HANDOVER. Kept current on every doc-closeout.
> **Mandatory reads before code:** `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG), `docs/PROJECT_GUIDELINES.md`, the active brief. See `CLAUDE.md`.

**Last synced:** 2026-06-24 · main HEAD `6b2cc7f1` — core-screens workstream (#1-#3) + tablet wide-shell rescue + e2e-port fix + i18n fix/guard + matchClassify dedup shipped. MatchPage #4 CD-gated; layout editor parked.

---

## ✅ DONE 2026-06-23/24 — core screens + tablet rescue + infra (detail in DEPLOY_LOG)
- **Core-screens redesign** (audit-scoped: MatchCard→ScoutTab→overview→MatchPage): **#1 MatchCard** premium (nav contract preserved) · **#2 ScoutTabContent + shared `DivisionTabs`** (lenient filter, c10a282e preserved) · **#3a StandingsTable** (phone + CoachWide) · **matchClassify util** dedup (3 copies→1).
- **🚨 Tablet wide-shell RESCUE** (user-reported, bug-mode): overlays (`NavDrawer`/`TournamentPicker`/modals) were `<AppShell>` children → the wide shell renders its own bodies INSTEAD of `{children}` → **on tablet they never mounted** (menu/event dead). **Fixed:** overlays moved to top-level in MainPage. + sidebar de-dupe (removed the 2nd drawer-opener) + **ScoutWide detail pane → real layout field image** (was placeholder).
- **🚨 i18n raw-keys bug** (38 keys referenced via `t()` but undefined → rendered as key-names, worst on wide shell): registered all 38 pl+en + **new `lint-i18n-missing.js` precommit guard** (blocks recurrence).
- **🚨 e2e PORT FIX** (`chore/e2e-port-5199`): emulator e2e silently reused a stray dev server on :5173 (another project) via `reuseExistingServer:!CI` → loaded the WRONG app → spurious failures masked signal for the whole training+core-screens workstream. **Fixed:** port→5199 + `reuseExistingServer:false`. **Local e2e is unblocked again.** [[project_deploy_dual_path]]

---

## ✅ DONE 2026-06-22 — verified against main + on prod (detail in DEPLOY_LOG)
- **Wide shell** (`AppShellPremiumWide`, ≥720px) increments 1-3: ScoutWide · CoachWide · PlayerWide (master-detail on real hooks/routes; mobile byte-identical). + the **deploy-gate unblock** (`VITE_USE_EMULATOR` gate — the e2e runs at 1280px and was reding the suite → silently blocking ALL deploys).
- **Premium determinate Preloader** (1:1 port) wired into opponent/player-stats/ranking; **scouted-teams list premium** (`CoachTabContent`); **team logo** on coach rows + a Logo URL field on `TeamFormModal`.
- **Player-stats premium redesign** + data-viz primitives + the design-review fixes (§27 amber, hero/gauge); **delete-player** "confirm does nothing" fix.

## 🟢 Premium redesign — A + B + C + sweep + 2 unsequenced ALL SHIPPED (2026-06-23, detail in DEPLOY_LOG)
- **Group A** ✅ — Today's points · My profile v1 · Team profile v1 · Scout ranking (full master-detail). public-profile skipped (covered by PlayerStatsPage hero).
- **Group B** ✅ — field primitives (`ui.jsx` Input/Select states + Field) · new-player form · new-team form + league-chip a11y · role-grouped roster + avatar ring · point-logging wizard (+ `self-log-wizard.spec.js` net).
- **Group C** ✅ — Setup (`AttendeesEditor`) · Squads (`SquadEditor`, DnD preserved) · Results (`TrainingResultsPage`). No IA change (opt-1).
- **Icon sweep** ✅ — RdIcon `star` + lucide/emoji → RdIcon (12 files, restyle-only).
- **Unsequenced** ✅ workspace switcher · ✅ CSV import (logic-preserved).

## 🔴 OPEN — gated / parked
- **MatchPage #4 — ONE screen, three internal modes (live / review / scout via `?scout=`).** Data-critical live-scoring write path in a 2894-line dual-mode component. **One-screen principle:** migrate the prototype `LiveMatchPremium` (LivePhone/TabletLiveScoring/LiveDesktop) skin into MatchPage as the SHARED shell (RdLiveHeader/RdScoreboard/RdLiveFieldCard/RdLivePointRow/RdCompleteness/RdFinishBtn) + re-skin detail+scout modes to the SAME language. NOT greenfield.
  - **GATE:** (a) net-green ✅ 12/12 (banked, `matchpage-modes`+golden) → (b) CD-accept ✅ → (c) Jacek go ✅. **Pass 1 STARTED 2026-06-24.**
  - **Pass 1a ✅** (review tokenize: ELEV/TNUM, neutral badge #1, emoji→RdIcon). **Pass 1b ✅** (scoreboard crests #3; 2-line names already present). Each held net 12/12.
  - **🔴 #2 consolidated head-to-head `RdLivePointRow` — DEFERRED, needs CD design call:** the live review row carries rich per-point meta (progressive score+preview · eliminations · penalties · comments · ⋮ menu) the simple prototype row omits. **Q for CD:** where does that meta go (drop / selected-expand / inline)? Don't guess on the data-critical screen. + remaining Pass 1: header/completeness migration to RdLiveHeader/RdCompleteness (non-gated, smaller).
  - **Pass 1 (medium) — CD refinements (locked):** (1) **Mode badge amber-discipline:** LIVE=amber (live/active) · Review=neutral (sunken/hairline/textDim, NOT active) · Scouting {team}=the scouted side's team-color accent (identifies the team, NOT amber). (2) **ONE `RdLivePointRow` in all 3 modes** = the consolidated head-to-head line (nr · crest+TP · score · BS+crest · completeness dots · trophy at winner); only the interaction changes (live/scout=split-tap SideZone; review=select→replay read-only) — NO second row variant. (3) **Edge-case law in header/scoreboard:** no logo→initials (never empty circle), long names→2 lines no font-shrink, no number→hide badge; scoreboard Crest can pull from the crests/ manifest w/ initials fallback.
  - **Pass 2 (separate scoped step):** the ≥720 tablet/desktop layouts (TabletLiveScoring/LiveDesktop 3-col) + shared-helper unification. **Don't-touch:** physics/canvas/`usePoints`/`matchScore`/merge-lock/routing (capture-parity enforces the write path).
- **Layout editor (`LayoutDetailPage`) — PARKED, needs Jacek IA discussion** before any redesign (UX-review flag 2026-05-27 §88, memory `project_layout_config_ux_review`).

## 🟡 DEFERRED — features/follow-ups (tracked, NOT blocking; revisit on product mandate)
- **Trafialność (accuracy) — NEW FEATURE** (`TrafialnoscPremium` in prototype): position→target pairs + hits-per-break. Needs a data model + product scoping. Deferred out of the Group C re-skin (Jacek).
- **Player `position` field** — model has none → roster/training cards show real meta (age/bunker/PBLI) instead. Adding it = model + PlayerEditModal/TeamFormModal change. LOW.
- **My-profile + Team-profile full 2-col Wide** — v1 shipped (tokenize + centered/widen); full sticky 2-col is an additive, claim/loader-isolated follow-up.
- ~~Tidy-later icon sweep~~ ✅ DONE 2026-06-23 (RdIcon star + lucide/emoji→RdIcon). Residual pre-existing emoji left by design: nationality 🏴 (data), App.jsx error-boundary ⚠️, CSV import-LOG emoji, `Square→pin` weak glyph (a future `bunker/diamond` RdIcon is maybe-later).
- **Wide-shell e2e coverage = ZERO** (gated off under VITE_USE_EMULATOR) — add a wide-viewport Playwright project + specs so the wide shell is gate-protected. **⭐ Flagged highest-value next safe item** — the tablet bugs (overlays/menu/event) reached the user *because* the wide shell has no e2e. Infra task (new project + un-gate + specs); needs Jacek go.
- **ScoutWide detail points-heatmap ("data on the layout")** — field image ships, but the user wants the scouting heatmap ON it. Confirmed 2026-06-24: NO clean reuse exists — ScoutedTeamPage's heatmap is *team-scoped/one-side*; the both-sides MATCH heatmap is MatchPage's fragile inline `getHeatmapPoints` (`mirrorPointToLeft`/`mirrorShotsToRight`/`kfTimeline`, A→left/B→right). **Proper fix = extract a shared `matchHeatmapPoints(points)` mapper out of MatchPage** (then ScoutWide + MatchPage both use it), with capture-parity/matchreview-rail re-verified. **Pairs naturally with MatchPage #4** (same file/logic). Interim: the "Szczegóły" CTA already opens the full review heatmap.
- **`ScheduleList` grouping component** — the matchClassify util shipped; the larger shared Live/Scheduled/Completed + MatchCard grouping (ScoutTab/CoachTab, + premium MatchCard into ScoutWide's master-detail) is a separate pass.
- ~~i18n-precommit guard~~ ✅ DONE 2026-06-24 (`lint-i18n-missing.js` blocks referenced-but-undefined `t()` keys).
- **Preloader true per-stage stepping** — promote `heatmapLoading` to fetch-done→compute-done (currently creep-and-snap on one boolean).

## ⏳ SMOKES OWED (Jacek, prod)
- **TABLET (≥720, hard-refresh first for i18n cache):** sidebar menu opens · DPL event chip switches event · single menu entry (no dupe) · ScoutWide select-a-match shows the field image · CoachWide standings · labels render (not `log_points` etc.).
- **Core screens:** match list (MatchCard) score-click→detail, side-click→scouting · Scout tab premium + division pills (lenient).
- Group A (Today's points · profiles · scout ranking) · Group B (forms · roster · **wizard — HARD: log a point → persist+read-back**) · Group C (training Setup/Squads/Results) · workspace switcher · CSV import · earlier: scouted-teams + team logo · preloader cold-load.

---

## ✅ DONE 2026-06-21 — verified against main
- **Premium "North Star" redesign — PLAYER STATS screen** (merge `feat/premium-redesign-player-stats`,
  `6eea25c8`, Tier-2 chat GO) — shared data-viz primitives (`src/components/dataviz/RdDataViz.jsx`:
  RdSplitBar/RdFieldLanes/RdStack/RdGaugeCards/RdDonut + rdPct) + `PlayerStatsPage` re-skin (5 sections
  onto the primitives, premium icon-tile section eyebrows, premium hero player card, ELEV grid +
  match-history). All data wiring/scopes/heatmap/lineup/samoocena/testids preserved. Resolved **Q1**
  (Crest=fallback) + **Q2** (coach list → CoachTabContent scouted-teams). DEPLOY_LOG 2026-06-21.
  **Smoke owed (Jacek, prod):** open a player → Player stats; confirm the amber eyebrow-tile motif.
- **Premium redesign — remaining handoff screens (OPEN, sequenced):** opponent analysis
  (`ScoutedTeamPage` — reuses the data-viz primitives + Crest) → match list (`MatchCard`) → coach team
  list (CoachTabContent per Q2) → live scoring (`MatchPage`, LAST — NXL-proven capture, golden-master
  parity). Foundation + menu + player-stats now live. Charter: `docs/architecture/PREMIUM_REDESIGN.md`.

## ✅ DONE 2026-06-19 (night) — verified against main
- **G1 — role grant co-writes `members[]` + orphan-roles prune** (`072abe73`, Tier-1) — `approveUserRoles`/`updateUserRoles` now `arrayUnion(uid)` into `members[]` so a role grant always grants workspace access (Majma class fixed at the write path). Migration pruned 6 orphan empty-role `userRoles` keys in ranger1996; 1 role-less *member* preserved → **Jacek triage (open, below)**. FULL e2e 98/98. DESIGN_DECISIONS §123. Smoke owed: grant a role → user sees events.
- **Arcade games fill the screen + Read Warrior cut-off fix** (`e46cefab`, Tier-1, night) — field wrapper `flex:1/minHeight:0/centered`; tall-aspect canvases grow to aspect-correct fit. Smoke owed (device).
- **Draw palette 5→9 colors** (`0e4a0d62`+merge, Tier-1, night) — added orange/blue/purple/pink + swatch wrap. §77 palette one-source.
- **ScoutedTeam/PlayerStats field-is-king** (`707c227c`, Tier-2 Jacek GO) — field-hero restored; collapsible report sections; dismissible confidence banner. Smoke owed (tablet-landscape, device).
- **Arcade 1-bit beautify ×4** (`da69d59b`·`e8e7d4bc`·`d8e606d4`·`8a7d06e3`, Tier-1) — render+music only, model verbatim. **Reads Mini `.m4a` retired → procedural chiptune** (the old "audio asset owed" residual is CLOSED).
- **Catalog IDB `storage.persist()` + §4.4 doc fix** (`53ef9eda`, Tier-1, night) — `navigator.storage.persist()` (guarded, once on first cache write) upgrades the catalog IndexedDB to durable storage so iOS/Safari ITP no longer evicts it after ~7 days idle (the cold-load-repeat root cause). Stale PROJECT_GUIDELINES §4.4 child-team-picker note corrected.
- **New-layout "Nie można załadować tego układu" — FIXED** (`e1f7b6af`, Tier-1, Jacek prod report) — `useLayouts` is overlay-driven; the wizard created the global base but never seeded the workspace overlay → the new layout was invisible → load error. Both wizard finish paths now `addLayoutToWorkspace(ref.id)` after `createBaseLayout`. Smoke owed: create a layout → opens straight into bunker editor.
- **3 safe i18n strings wrapped** (`e1f7b6af`, Tier-1) — `save_failed` reuse (LivePointTracker/TrainingMoreTab alerts) + new `removed_from_workspace` (AttendeesEditor). i18n residual now down to ~5 (CAUSE_META + ScheduleCSVImport traps).

## ✅ DONE 2026-06-18 — verified, detail in DEPLOY_LOG
- **Tactic save "too many index entries" — FIXED** (`b61c3246`) — `fieldOverrides` exempt `tactics.{freehandStrokes,strokes,drawings}` from indexing; `firestore:indexes` deployed.
- **Packed catalog cold-load — SHIPPED + rules/indexes/data** (`eb59bf5f`, Jacek GO) — `/catalog/{kind}` manifest+chunks → cold load ~6 reads vs ~2,886, all fields kept, version-gated, fallback-safe.
- **Dev Snapshot button (super-admin) — SHIPPED** (`f3d24baa` + global-mount `b6ce1ae1`) — floating ⌖, html2canvas + JSON context export, on every screen.
- **Scout stranded "Nie masz przydziału" (Majma) — FIXED** (`f3d24baa`) — auto-enter most-recent OPEN tournament for `isScoutOnly`.

## ✅ DONE since 2026-06-13 — verified, detail in DEPLOY_LOG
- 5 Arcade games (Read Warrior `813d28c3` · Invaders `40b30690` · Lander · Snake `59441c23` + Reads Mini) at `/break`, 5 per-game boards, §119-§122 canon.
- PaT `pointPhases.js` canonical module + consumer migration (`7baaf9e3`); **PaT Stage 2.5 coach-report per-stage tables** (`da06f0e9`); **Stage 6-lite replay** (HeatmapCanvas `buildReplayModel` + ▶ pill).
- Tactics data fully purged (`326e4343`); Packing Checklist (`a73a7744`); view-as re-enabled (`f45086ea`); Playbooks coach door (`de9f16bb`); Onboarding arc CLOSED (durable email-link invite); arc-B `<Screen>` model-C migration CLOSED (15 pages + 6 canvas-page exclusions registered `c5303ec9`); phase-view + nav-drawer (`154934a4`).

## 🧹 Audit 2026-06-19 — items found ALREADY DONE (pruned from open backlog)
_Historical docs still mentioned these as "deferred/owed"; the audit confirmed each shipped. Listed once so they don't resurface._
- Workspace-logo iPhone fallback (code) — PWA image-cache fix `93f8c872` (only a device *smoke* remains). §78 draw arbiter — present+functional in HeatmapCanvas. Child-team tournament picker — fixed (PROJECT_GUIDELINES §4.4 note is stale). `updatePlayer` catalog-version bump — bumps. MatchPage archetype — correctly stayed field-hero (no flip needed). arc-B canvas-page width + HeatmapCanvas landscape overflow (`sizingStrategy='fit'`). EN translation pass — real translations live. §70 Stage-2 `propagateMatchup`. CoachTabContent `--:--` score bug (`629edc8`). ViewAs (live infra, not dormant). `t()`-scope precommit lint. DPR `window.devicePixelRatio||2`. Team-ownership transfer UI (`transferAdmin`+`RoleTransferModal`). Phase 2.x twin-path cleanup + dead `subscribeTeams` (removed 2026-06-05). Manifest/title rebrand to "reads ⊖". Reads Mini `.m4a` (chiptune).

---

## ✅ DONE 2026-06-20 — verified against main
- **[DONE] Coach Tactics board (rail-native) + one contextual entry** (merge `feat/coach-tactics-board`,
  Tier-2 chat GO) — `LayoutTacticsBoardPage` (`/layout/:layoutId/tactics`): browse rail (select /
  drag-reorder / remove→library / + new / library picker) + read-only field preview; **full-bleed
  present/annotate** (§76 immersive draw, reuses DrawToolbar). Data additive+legacy-safe
  (`onBoard`/`order`, `utils/tacticState` client read; `reorderLayoutTactics`; no migration; no rules
  change). One contextual `<OpenTacticsAction>` in tournament/Konfig/training/coach-home.
  **LayoutDetailPage tactic-list COEXISTS** (structured position-editing → `TacticPage`). e2e
  `tactics-board.spec.js` green. DESIGN_DECISIONS §124, FIELD_VIEW_ARCHETYPES, fieldViewConfig
  `tactic-board`. **Smoke owed (prod):** open board → select → preview → reorder persists →
  ✕→library→re-add → + new → full-bleed draw saves. (Present "full-bleed" = §76 immersive, not the
  §116 manual collapse — F2 still open below.)

## 🔴 OPEN — Bugs (verified)
- **Loupe pan-lag (low perf).** `BaseCanvas` `loupeSourceRef` is never populated → `drawLoupe` reads back the full main canvas every frame. Needs a pre-baked offscreen source / throttle.
- **B8 Strzela% denominator (med, deferred).** Parked in the data-trust/validation workstream (Jacek doesn't trust scouted data yet).
- **B20 cross-device same-UID presence (low).** No contention signal after Brief F retired match-claim; passive-presence design.

## 🚦 OPEN — Decisions owed (Jacek) — these gate real work
- **G1 leftover.** ranger1996 member `DJISyG7yo3NIBVrVvwl5IsJhTTt1` has empty roles: assign a role, or remove from `members`? (1 user; we don't enforce ≥1-role-per-member.)
- **G2 cross-tenant catalog.** `players/teams/layouts/leagues` read = any authed user (Path-A interim, intentional). Sequence the Phase 2.2.d/2.3.d isolation cutover before FIT. *Architecture — needs an Opus brief.*
- **G3 per-role nav surface.** What should scout/coach/player each see (e.g. full layouts library for a scout)? `AppShell` is "admin sees all" today. Product decision.
- **freehand-as-string.** Annotations store as a map today (+ index exemption shipped). Want (a) keep map + exemption (done, safe) or (b) full string-pack rewrite? (b) touches the un-e2e-gated concurrent-merge path → escalated.
- **`chore/design-sync-inputs` push.** Branch `ae46d530` committed locally, NOT on main/remote. Awaiting GO to push the claude.ai/design sync inputs.

## 🔴 OPEN — Product / Tier-2 (need Opus brief and/or Jacek gate)
- **Catalog cold-load follow-ups.** (a) scouted-subset + lazy picker — **I recommend SKIP** (would regress to ~1,351 reads vs the ~6 the packed catalog already does); (b) iOS IDB resilience — **`storage.persist()` shipped `53ef9eda`** (the main eviction mitigation); deeper Firestore-persistence pinning still optional; (c) optional field-slimming.
- **READS_SPLASH (partial).** Login-screen `ReadsWelcomeSplash` is live; the full cold-start splash brief (`docs/briefs/CC_BRIEF_READS_SPLASH.md`) is NOT built. Jacek GO.
- **kiosk join-by-code** [arc E etap 2] — code on lobby + scout join route; flow does not exist (FreshWorkspaceChecklist CTA disabled until it ships). Opus brief.
- **events-list redesign** [arc D] — Jacek "przebudować docelowo"; dual-badge OK for now.
- **Custom zones** — `docs/product/CUSTOM_ZONES_SPEC.md` spec exists; no builder code. Design pass owed.
- **Hitability density UX** — at N>5, tap-a-connection-line to record + skip the pick. Own brief.
- **B4 role-aware home (partial).** `NoTournamentEmptyState` + `ScoutWaitingEmptyState` are functional; the role-aware "get started" home + final copy/CTA needs a mockup.
- **Shared `<ReportTable>` primitive** — breakouts/shooting + PlayerStats grids are copy-pasted; extract when a 3rd consumer appears. Not urgent.
- **Dev Snapshot v1+** — `__pbSnapshotContext` page-data publishing (button reads it; nothing publishes). Needs PII anonymisation. Low.
- **Reads Mini STAGE 3 App Check** — reCAPTCHA v3 app-wide (`initializeAppCheck` absent). Separate GO.
- **arc-B phase-2 "untangle-then-wrap"** — WorkspacesAdmin · LayoutAnalytics · TrainingSetup · LayoutWizard tangled shells. Each its own ticket. + AnalyticsCanvas extraction · Fold reads-ball into PageHeader · F2 §116 manual-collapse ("focus mode") + toggle e2e.

## 🧵 OPEN — Point-as-Timeline ladder (charter `docs/POINT_AS_TIMELINE.md`, D1-D3 LOCKED)
**Shipped:** Stage 2 (phase-spine, scout-side), Stage 2.5 (per-stage coach tables), Stage 6-lite (replay marker animation). Stage 7 infra (`useEvents`, `events_index`) exists but **gated** (`selfLog.enabled:false`, zero consumers).
- **Stage 4 — typed move-sequence** (hop/stretch/run vocabulary). Design locked (Model A); build PARKED on Jacek's vocabulary input + the §79-secondary-bump question.
- **Stage 5 — time axis** (timer + timestamped delta-events; reuse `LivePointTracker`).
- **Stage 7 — self-log + kiosk + cross-source unification** (flip flag; events A/B/C; reconciliation). Biggest; adoption-gated.
- **Stage 8 — conditional-move analytics.** Future.

## 🖼️ OPEN — Field View shell (one Opus brief folds these in)
- Ballistics→InteractiveCanvas migration + delete `FieldCanvas.jsx` (+ DPR pixel-change; FieldCanvas marked "Opus territory").
- Folded-rail opponent controls (ITEM-2). · ScoutedTeam-aggregate vs MatchPage-review phase-language unification.

## 🌍 OPEN — i18n (much smaller than the docs implied)
- **~5 hardcoded-PL violations left** (3 wrapped 2026-06-19 `e1f7b6af`): remaining = `PlayerStatsPage.jsx` CAUSE_META `'Przejście'`/`'za Karę'` + `'Trening'` template (module-scope domain labels — need care); ScheduleCSVImport two interpolated error strings (`t` shadowed locally + interpolation trap). Attended batch.
- **Optional:** add a dup-key precommit guard + de-dupe the one semantic near-dup (`no_matches` vs `picker_no_matches`). The "5 differing keys" are NOT conflicting — mostly a non-issue.
- DE/FR/ES + pseudoloc + i18next migration — far future.

## 🧹 OPEN — Code / arch residuals (low-priority, verified still-present)
- vite dynamic-import code-split (chunk limit raised to 600kB) · `isFreePlay` matchup-list hide · invite resend-with-role-change + cleanup · `externalId` admin-dedup tooling · PPT failed-queue auto-retry · `divisionAliases` derive-year-from-tournament-date + expand division buckets · OlderPointsSection `onTapPoint` lobby-context wiring · §112 "akwizycja killi" tab · TeamDuplicateResolution tournament/player re-pointing (disabled) · `hmVisibility` localStorage persistence · `defaultWorkspace` in `/users/{uid}` self-update rule (CONFIRM-gated) · point-count composite indexes (low).

## 🗄️ OPEN — Multi-tenant / security roadmap (architectural, held)
- **Brief G — schema unification** (partial today): retire `members[]`/`adminUid`/`passwordHash`, lowercase-slug normalize, make `users.workspaces` the single membership source. Needs Admin SDK + multi-checkpoint review.
- **Cross-workspace player identity bridge** — `pbliId` key exists + `/players` is global; the `pbliId`-keyed overlay doc + `/players/{pid}/workspaceNotes` annotations layer (Phase 3.1+) do NOT.
- **Route-level guards expansion** — `/teams`, `/players`, `/my-issues` unguarded (12 routes guarded today); needs player-allowlist extension first.
- **Per-workspace admin via custom claims** — still ADMIN_EMAILS allowlist only (`globalRole` is a Firestore field, not an Auth claim; no `setCustomUserClaims`).
- **2 isolation audits** (read-only, before any cutover date): scouting-data isolation map + layout-overlay shape.

## 🟡 Smokes owed (Jacek, prod)
- **Tonight (2026-06-19):** grant a role to a fresh user → they immediately see events.
- **2026-06-18 batch:** games fill screen / Read Warrior not cut off · 9-color pen · field-is-king tablet-landscape · 4 games look+sound · Majma auto-enter · Dev Snapshot ⌖ + export · packed-catalog faster roster · tactic dense-drawing saves · per-stage coach report (Break/Settle/Mid numbers track).
- **Carry-over:** §98 layout-config full pass · multi-ws switcher for non-super-admins · player profile/email-invite/relogin · service-worker + offline banner · player color badge persist · admin teams parity detail · iPhone logo PWA-cache render · B24 team-name mojibake · PWA airplane-mode cold-boot.

## ⏸ Far-future / parked (out of current sprint)
- **GDPR build** — BLOCKED-ON-LEGAL (`docs/architecture/GDPR_DATA_MAP.md`, doc only): consent page · delete-user+cascade · export.
- **Rebrand "reads" — store-listing only** (manifest/title/icons already "reads ⊖"). LP v1 landing page · FIT-readiness checklist · predictive-tactics engine (flagged off, no code) · video-CV system (no code) · concurrent-editing reliability flag (spec `concurrent-merge.spec.js` guards it; no circuit-breaker) · Spark→Blaze cost ladder (on Spark, `COST_PROJECTION_SPARK.md`) · Switcher UI brief · per-team setup checklist + cloneable layout library · arc E narratives (w/ Sławek).
- **Arcade shared-code extraction (PARKED — Jacek, 2026-06-19).** The 7 Take-a-Break games each inline their own sky/audio/dither/seven-seg/loop (~1,150 duplicated LOC; ~750–850 removable). Extract `gameAudio`/`cosmicSky`/`sevenSeg`/`dither`/`useArcadeCanvas` into `src/components/arcade/` (where `ArcadeButton` already lives) and migrate all 7 onto them — render-identical, no gameplay change, gated by the per-game e2e specs; hard rule: nothing eagerly-loaded may import `src/components/arcade/*` (keeps the arcade out of the app entry). Full spec + measurements: **`docs/ARCADE_SHARED_DISCOVERY.md`** (on branch `discovery/arcade-shared`, unmerged — merges with the refactor). No deadline; was gated on an 8th game which is no longer coming.
