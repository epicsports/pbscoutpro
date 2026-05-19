# NEXT TASKS — For Claude Code
## Read docs/DESIGN_DECISIONS.md + docs/PROJECT_GUIDELINES.md first.
## Work top to bottom. Push after each task.

**Last updated:** 2026-05-15 by CC (multi-device overwrite hotfix deployed NXL day 1)
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

## 🟡 New POST-NXL follow-ups from multi-device hotfix

- **Cross-device same-UID presence banner.** Brief F retired the match-level claim system so two devices on same UID have zero contention signal. Need a passive presence indicator (e.g. heartbeat doc keyed by `{matchId}_{uid}_{deviceId}` with lastSeen timestamp, banner if >1 fresh entry). Separate brief — non-trivial design surface (PWA presence + UX copy + privacy).
- **Sentry `onToolbarAction` ReferenceError** at `FieldCanvas-DGuBOyvU.js:1:28582` in `handleDown`. Surfaced 2026-05-15 alongside the corruption issue but unrelated — canvas tap handler reading an undefined prop under a specific mount sequence. Capture as separate ticket. Cheap repro candidate: open a match in observe mode (no `?scout=`) and tap the canvas.
- **§ 42 docs update.** Point IDs are now auto-generated (no longer `{matchKey}_{coachShortId}_{NNN}`). `endMatchAndMerge` still index-based so semantics unchanged. Short append to existing § 42 section.
- **Dead-code cleanup.** `setPointWithId` / `setTrainingPointWithId` in `dataService.js:340-344, 705-709` are no longer called. Safe to delete post-NXL.

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
**Status:** Phase 0 done 2026-05-19 (commit `c90c924`). All ❓/🟡 resolved against live code. See `docs/architecture/CANVAS_ARCHITECTURE.md` + `docs/architecture/PHASE_0_DISCOVERY_FINDINGS.md`. Awaiting Etap 4 rozkmina.
**Document:** `docs/architecture/CANVAS_ARCHITECTURE.md`

**Blocked items:**
- Landscape coach view (originally landscape view for ScoutedTeamPage + MatchPage heatmap — Jacek's request 2026-05-18)
- Universal drawing layer (Feliks workflow replication — color picker + freehand annotations on any view)
- Consolidation of FieldCanvas / HeatmapCanvas / FieldView / FieldEditor

**Why blocked:** Etap 4 architecture decision (A vs B component model + drawing layer architecture) is the next gate. Phase 0 finding that HeatmapCanvas has zero gesture support is load-bearing for landscape coach view sizing.

**Unblock path:**
1. ✅ Phase 0 CC desktop discovery (done 2026-05-19, commit `c90c924`)
2. Jacek asks Feliks which iPad app he uses (resolves § 5.5)
3. Architecture rozkmina #2 (Opus + Jacek) — Etap 4 A vs B decision + drawing layer architecture → new § in DESIGN_DECISIONS.md (proposed § 64+, post-§ 63 multi-tenant)
4. Per-view refactor briefs + drawing layer brief
5. Landscape coach view ships on top of unified base

### Multi-Tenant Architecture migration
**Status:** Phase 0 done 2026-05-19 (commit `c90c924`). § 63.X Findings appended per subsection. § 63.3 schema choice RESOLVED 2026-05-19 as Option α. Awaiting rozkmina #3 (global resources + globalEvents arch) before plan write.
**Document:** `docs/DESIGN_DECISIONS.md` § 63 + `docs/architecture/PHASE_0_DISCOVERY_FINDINGS.md`

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
- ✅ Player identity cross-workspace: global, mirrors layout pattern (resolved 2026-05-19, § 63.14)
- 🟡 Teams as global: preliminary (formal lock in rozkmina #3)
- 🆕 GlobalEvents registry + cross-workspace dedup: parked, options A/B/C in § 63.14

**Blocked items (waiting on rozkmina #3 + migration plan):**
- All multi-tenant migration phases 1-10 (see § 63.12)
- Onboarding US PRO team (waiting for workspace isolation verification)
- Layout insights monetization (waiting for aggregation Phase 2)
- New language support beyond PL/EN (waiting for i18next migration)

**Unblock path:**
1. ✅ Phase 0 CC desktop discovery done 2026-05-19 (see DESIGN_DECISIONS § 63.X Findings + `docs/architecture/PHASE_0_DISCOVERY_FINDINGS.md`)
2. ✅ Rozkmina #1 — § 63.3 schema choice RESOLVED 2026-05-19 as Option α (drop `users.workspaces` field)
3. Rozkmina #3 (Opus + Jacek) — global resources (players formal + teams + globalEvents arch)
4. Write `docs/architecture/MULTI_TENANT_MIGRATION_PLAN.md` with detailed phase plans
5. Phase 1 implementation brief (schema foundation) — **READY FOR BRIEF**: Option α locked, can proceed in parallel with rozkmina #3. Tasks: drop `users.workspaces` write path, one-shot migration script, switcher UI collectionGroup query, Firestore rules verification for collectionGroup access, bootstrap auto-join writes only to userRoles. Reference: DESIGN_DECISIONS § 63.3 Decision sub-block (Implementation notes).
6. Sequential phase execution with monitoring soaks between phases

**Independent of:** Canvas Architecture work track. Both can proceed in parallel.

---

# 📦 BACKLOG (see `docs/product/IDEAS_BACKLOG.md` — do NOT implement without instruction)

Dark/light toggle, settings page, colorblind UI toggle, undo stack,
tactic templates, direct manipulation drag, export CSV/Excel, print
layout with overlays, OffscreenCanvas heatmap, SharedArrayBuffer ballistics,
remaining ARIA/WCAG, haptic feedback, keyboard shortcuts, Paintball IQ,
body count analysis, agentic counter explanations, onboarding tunnel,
competitive analysis.
