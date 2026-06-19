# NEXT TASKS — Canonical board for PbScoutPro

> **Canonical-board rule.** If something is *actionable and open*, it lives **here**. `DEPLOY_LOG.md` is the ship ledger (newest-first, full detail); `HANDOVER.md` is narrative state. Zero actionable items living ONLY in DEPLOY_LOG/HANDOVER. Kept current on every doc-closeout.
> **Mandatory reads before code:** `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG), `docs/PROJECT_GUIDELINES.md`, the active brief. See `CLAUDE.md`.

**Last synced:** 2026-06-19 · main HEAD `327fcd3b` · **reconciled via a full 6-agent backlog audit** (every historical candidate from DEPLOY_LOG / DESIGN_DECISIONS / HANDOVER / code TODOs re-checked against live code + git + prod; STALE/DONE entries pruned). This board now lists only **verified-open** work.

---

## ✅ DONE 2026-06-19 (night) — verified against main
- **G1 — role grant co-writes `members[]` + orphan-roles prune** (`072abe73`, Tier-1) — `approveUserRoles`/`updateUserRoles` now `arrayUnion(uid)` into `members[]` so a role grant always grants workspace access (Majma class fixed at the write path). Migration pruned 6 orphan empty-role `userRoles` keys in ranger1996; 1 role-less *member* preserved → **Jacek triage (open, below)**. FULL e2e 98/98. DESIGN_DECISIONS §123. Smoke owed: grant a role → user sees events.
- **Arcade games fill the screen + Read Warrior cut-off fix** (`e46cefab`, Tier-1, night) — field wrapper `flex:1/minHeight:0/centered`; tall-aspect canvases grow to aspect-correct fit. Smoke owed (device).
- **Draw palette 5→9 colors** (`0e4a0d62`+merge, Tier-1, night) — added orange/blue/purple/pink + swatch wrap. §77 palette one-source.
- **ScoutedTeam/PlayerStats field-is-king** (`707c227c`, Tier-2 Jacek GO) — field-hero restored; collapsible report sections; dismissible confidence banner. Smoke owed (tablet-landscape, device).
- **Arcade 1-bit beautify ×4** (`da69d59b`·`e8e7d4bc`·`d8e606d4`·`8a7d06e3`, Tier-1) — render+music only, model verbatim. **Reads Mini `.m4a` retired → procedural chiptune** (the old "audio asset owed" residual is CLOSED).
- **Catalog IDB `storage.persist()` + §4.4 doc fix** (`53ef9eda`, Tier-1, night) — `navigator.storage.persist()` (guarded, once on first cache write) upgrades the catalog IndexedDB to durable storage so iOS/Safari ITP no longer evicts it after ~7 days idle (the cold-load-repeat root cause). Stale PROJECT_GUIDELINES §4.4 child-team-picker note corrected.

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
- **~8 true hardcoded-PL violations** (not ~63): `PlayerStatsPage.jsx` CAUSE_META `'Przejście'`/`'za Karę'` + `'Trening'` template; `alert('Błąd zapisu: …')` in LivePointTracker + TrainingMoreTab; AttendeesEditor `'(usunięty z workspace)'`; ScheduleCSVImport two error strings. Attended batch.
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
