# NEXT TASKS — Canonical board for PbScoutPro

> **Canonical-board rule.** If something is *actionable and open*, it lives **here**. `DEPLOY_LOG.md` is the ship ledger (newest-first, full detail); `HANDOVER.md` is narrative state. Zero actionable items living ONLY in DEPLOY_LOG/HANDOVER. Kept current on every doc-closeout.
> **Mandatory reads before code:** `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG), `docs/PROJECT_GUIDELINES.md`, the active brief. See `CLAUDE.md`.

**Last synced:** 2026-06-16 · main HEAD `9bdba6cc` · **RECONCILED clean-slate** (premise had gone stale twice — arc-B + tier-2 branches were reported open but were already shipped). The verbose pre-2026-06-14 session-wrap history was pruned here; full ship detail lives in `DEPLOY_LOG.md` (newest-first) + git. This board now lists only **verified-open** work.

---

## ✅ DONE since the last sync (2026-06-13) — verified against main, detail in DEPLOY_LOG
- **Onboarding arc CLOSED** — durable email-link invite (express-reg + email-keyed self-claim; verified-email tenant-isolation rules deployed) `a8ed9cad`; source-of-truth ENTRY fix (userRoles authoritative) `4ddbf0b2`; already-member self-claim `b81fc558`; idempotent re-send `7f4a0f40`; 4 account-stranding fixes + recovery (Maks +3 stamped). **biuro verified `claimed`+coach in prod 2026-06-16.**
- **arc-B `<Screen>` model-C migration TRACK CLOSED** — `Screen.jsx` model C (`8b4ab8e8`, "Jacek decision") + 15 pages live (Teams/Players/Layouts/Members/Profile/TeamDetail/TrainingResults/UserDetail/ScoutDetail/Ranking/Issues + 4 admin). Migration-diff 24/24 (re-baselined `9bdba6cc` for the p-selfedit fixture row).
- **phase-view + nav-drawer** SHIPPED + merged (`154934a4` §B; NavDrawer live). i18n crash classes (t-scope + call-shape) fixed + lints shipped. ITEM-1 drawing unify (`4ae31cfc`); tactics `freehandStrokes` drift fix (`96809879`); Polish-lint refine (`fefcbc7c`); player self-edit catalog-bump best-effort (`db8d4fc2`).

---

## 🔴 OPEN — Bugs (prod / UX)
- **✅ B26 — "Repair scouted rosters" box — CLOSED (2026-06-16).** Investigation ruled out all framed suspects (live tournament subscription; super passes `isScout` via `isSuperAdmin` so the stamp is permitted; super correctly saw box #2) and reframed it: the box MISFRAMED the real problem — scouted-roster "duplicates" are a **player-identity** issue (pbliId-as-primary-key), not roster narrowing. **Resolution: the permanent super-admin box was RETIRED** from `CoachTabContent` (couldn't cheaply self-collapse + misled). The narrowing fn (`repairScoutedRostersForTournament`) stays in dataService (non-destructive — orphan-preserving union — and e2e-covered). Real work → **player-dedup brief** below.
- **Player-identity dedup (pbliId primary key)** — `docs/briefs/CC_BRIEF_PLAYER_DEDUP.md`. Policy: obvious→auto-claim, ambiguous→flag super-admin (`MergePlayersModal`).
  - ✅ **Item 1 — import-prevention SHIPPED** (`resolvePbliImport` + `CSVImport` wiring; e2e all 4 decisions). Conservative threshold ratified (auto-claim only a lone exact-name pbliId-less namesake). Flags currently surface in the import log.
  - 🔴 **Item 2 — reconcile queue + super-admin surface** (persistent flags → `MergePlayersModal`). GO-gated.
  - 🔴 **Item 3 — migration for existing dups** (auto-merge obvious singletons / flag ambiguous; `--dry`→`--live` Hard-ESCALATE + backup). GO-gated.
- **"Podgląd jako" (view-as role) broken (high).** Settings role-impersonation does nothing — dead handler vs broken `effectiveRoles` plumbing. e2e: view-as=player hides coach-only nav.
- **Workspace logo phone fallback (med, §93).** House-icon fallback on iPhone — URL/CORS/cache-headers/PWA cache. Jacek smokes iPhone Safari/PWA.
- **B4 Home role-aware dashboard remainder (med, awaiting Opus mockup).** Cold-open-on-Settings already fixed (`0c4852a2`); the role-aware "get started" home + `NoTournamentEmptyState` copy/CTA still needs a mockup.
- **B8 Strzela% denominator (med, deferred).** Parked in the "data-trust/validation" workstream (Jacek doesn't trust scouted data yet).
- **B20 cross-device same-UID presence (low).** No contention signal after Brief F retired match-claim; passive-presence design.
- **Loupe pan-lag (low perf).** Canvas redraws everything per frame; needs an overlay layer / throttle.
- **ci-flake `hitability-responsive.spec.js` (test-only).** Intermittent under full-suite load (canvas-tap + resize + poll); needed a manual deploy-gate re-run once. Stabilize waits; don't weaken the coordinate-mapping assertion.

## 🔴 OPEN — Product / Tier-2 (need Opus brief and/or Jacek gate)
- **✅ Field View shell — COMPLETE / Phase C CLOSED (2026-06-16).** Canon: `docs/architecture/FIELD_VIEW_ARCHETYPES.md` (TWO ratified archetypes — RAIL-NATIVE `CanvasRailLayout` + §76 IMMERSIVE `useLandscapeMode` — a deliberate choice, NOT debt). Shell API + `FieldPhaseControl`/`RailZones`/`fieldViewConfig` shipped (`8e8a3885`); rail-native family consistent: **Match-review** + **ScoutedTeam** wired (`d5a67999`), **PlayerStats** + **Hitability** already-compliant. **Editors stay immersive** (LayoutDetail/Tactic — not migrations). BunkerEditor/Ballistics = plain/query (no rail). TrainingResults = dashboard (not a field view). Detail: DEPLOY_LOG 2026-06-16 + `FIELD_VIEW_GLUE_ASSESSMENT.md` §1-§4.
  - 🔮 **Future (separate brief, NOT now):** Scout-point capture structural rail-migration (highest-risk; bespoke flow; PaT "E" is §8-owned).
- **splash (READS_SPLASH)** — Tier-2/1.5, spec in repo (`docs/briefs/CC_BRIEF_READS_SPLASH.md`), **NOT built.** Jacek build GO/gate. (rebrand brick 1.)
- **tactics consolidation** — Tier-2. THREE stores: `layoutOverlays/.../tactics` (21 live) · `tournaments/.../tactics` (9 live) · `layouts/{id}/tactics` (24 **orphaned, no reader**). § 97.5 = retire the tournament store. Needs `--live` migrate the 9 + **DELETE the 24** (verdict 2026-06-16 §8: dead rollback-safety copies from §96 STAGE-3, twins already at `layoutOverlays` by-id; gate on a per-doc id-coverage read, any uncovered → migrate-then-delete) + Opus brief + GO. Discovery+verdict: `docs/architecture/TACTICS_TWO_STORE_DISCOVERY.md`.
- **canvas-unify phase-1 — ALREADY DONE by §64** (Interactive→BaseCanvas; 4/5 interactive views migrated). Residual = migrate **BallisticsPage** `FieldCanvas`→`InteractiveCanvas` + delete FieldCanvas. **Gated:** FieldCanvas is marked "Opus territory, off-limits" in-source (`InteractiveCanvas.jsx:29-34`) AND the migration trips a guaranteed DPR pixel-change on non-2-DPR devices (the ×2→`devicePixelRatio` correctness fix). Needs Opus brief + GO; not a pixel-diff=0 autonomous merge. **[→ folds into Field View shell]** Discovery: `docs/architecture/FIELD_VIEW_INVENTORY.md` + CANVAS_MERGE notes.
- **ITEM-2 folded-rail opponent controls** — propagate the mockup-6 phase-view composite into the folded rail. Needs phase-view ratified on MatchPage review + an Opus mockup (56px strip + overlay). **[→ folds into Field View shell]**
- **ScoutedTeam aggregate-phase vs MatchPage review-phase model** — unify into one visual language? Tier-2 redesign (Opus/Jacek), not a propagation. `docs/architecture/CONTROL_LANGUAGE_INVENTORY.md`. **[→ folds into Field View shell]**
- **kiosk join-by-code** [arc E etap 2] — build the flow (code on kiosk lobby + scout join route), then flip `b4-scout-join-disabled` live. Opus brief.
- **role-scoped layout-library visibility** (admin→config / coach→tactics) — **Tier-1**, discovery DONE (`docs/architecture/ROLE_LAYOUT_VISIBILITY_DISCOVERY.md`). Finding: coach ALREADY reaches tactics; LayoutDetail already role-branches; TacticPage untouched. Real gap = discoverability/branding (coach "Playbooks" entry + brand LayoutsPage rows by role). Reuses authoritative role store. Opus build brief → GO.
- **events-list redesign** [arc D] — Jacek "przebudować docelowo"; dual-badge OK for now. Opus design brief.
- **arc-B phase-2 "untangle-then-wrap"** — WorkspacesAdmin · LayoutAnalytics · TrainingSetup · LayoutWizard: tangled shell/flex must be restructured before a clean `<Screen>` wrap. Each its own ticket.
- **TrainingSquadsPage → arc-D tool-screen track** (drag-drop builder; `<Screen>` tiering is the wrong frame).
- **AnalyticsCanvas extraction** from LayoutAnalyticsPage (§64.1/64.8.2 canvas-class roadmap).
- **Fold reads-ball into PageHeader app-wide** [arc B] — PPT shows a double bar; fold the drawer trigger into PageHeader. Touches every header.
- **F2 §116 manual-collapse ("focus mode")** + toggle e2e — still TODO.
- **Custom zones** (`docs/product/CUSTOM_ZONES_SPEC.md`) — design pass owed before implementation.
- **Hitability density UX** — at N>5, tap-a-connection-line to record + skip the pick (canvas-archetype interaction). Own brief.
- **DRY `drawLineFromTo`** — extract one shared helper (Hitability + drawPlayers + 2 luf sites). Own brief.

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
