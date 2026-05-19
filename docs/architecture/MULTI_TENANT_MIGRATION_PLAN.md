# Multi-Tenant Migration Plan

> **Status:** Drafted 2026-05-19 by Opus, post rozkmina #3. Strategic plan consolidating three rozkmina outcomes into per-phase actionable migration sequence.
> **Last updated:** 2026-05-19
> **Owner:** Opus (architecture) + CC (implementation) + Jacek (product approval per phase gate)

## Overview

This document operationalizes the multi-tenant SaaS architecture decisions made in three Opus + Jacek rozkmina sessions on 2026-05-19. It does NOT contain new architectural decisions — those live in `docs/DESIGN_DECISIONS.md` § 63 (main + sub-sections 63.3, 63.14, 63.15, 63.16) and § 64.

This plan is the execution layer. It says **how** to ship, **in what order**, with **what guardrails**.

### Decision sources

| Source | Topic |
|---|---|
| `docs/DESIGN_DECISIONS.md` § 63 main | Multi-tenant architecture — 8 decisions |
| `docs/DESIGN_DECISIONS.md` § 63.3 | Schema choice — Option α (drop `users.workspaces`) |
| `docs/DESIGN_DECISIONS.md` § 63.14 | Resolved + parked items |
| `docs/DESIGN_DECISIONS.md` § 63.15 | Global Resources Architecture — Leagues + Players + Teams + TeamMemberships |
| `docs/DESIGN_DECISIONS.md` § 63.16 | GlobalEvents Architecture — Option B + α/β/γ/δ phases |
| `docs/DESIGN_DECISIONS.md` § 64 | Canvas Architecture — Option B (parallel track, not multi-tenant but independent execution) |
| `docs/architecture/PHASE_0_DISCOVERY_FINDINGS.md` | Phase 0 code-state findings |
| `docs/architecture/CANVAS_ARCHITECTURE.md` | Canvas audit (parallel track) |

### Phase summary

| Phase | Name | Scope | Duration estimate | Blaze required? |
|---|---|---|---|---|
| 0 | Discovery | Code audit, decision rozkminy | DONE 2026-05-19 | No |
| 1 | Schema foundation | Drop `users.workspaces`, switcher uses collectionGroup | ✅ DONE 2026-05-19 | No |
| 2 | Global Resources | Leagues + Players + Teams + TeamMemberships hoisted to global | 4-6 weeks | No |
| 3 | GlobalEvents β | Registry + optional workspace linkage | 3-4 weeks | No |
| 4 | GlobalEvents γ | Composite aggregation + reconciliation | 4-6 weeks | **Yes** |
| 5+ | GlobalEvents δ | Super admin merge UI | TBD when triggered | Yes |
| Parallel | Canvas refactor | § 64 — 8 sequential steps, independent track | 4-8 weeks | No |

**Total multi-tenant timeline:** 12-20 weeks for Phases 1-4 (depending on monitoring periods between phases). Canvas can run any time in parallel.

### Core principles

1. **Additive migration.** Each phase adds new globals/collections WITHOUT deleting workspace subcollections. Cleanup is the final irreversible step per phase, done only after stabilization period.
2. **Per-phase rollback.** Every phase has documented rollback. Until cleanup, dual existence allows revert.
3. **Stabilization periods.** Each phase has 1-2 week monitoring period (Sentry clean, no regressions) before next phase starts.
4. **Decision foundation locked.** This plan does not introduce new architectural decisions. If a decision needs revisiting, return to rozkmina format, update DESIGN_DECISIONS, then update this plan.
5. **Bla­ze upgrade is a gate.** Phase 4+ requires Blaze. Upgrade happens during Phase 3 (validate Cloud Functions infrastructure before composite aggregation goes live).

---

## Phase 0 — Discovery (DONE 2026-05-19)

**Scope:** Code audit, decision rozkminy, plan write.

**Deliverables shipped:**
- `docs/architecture/CANVAS_ARCHITECTURE.md` (canvas audit, all ❓ resolved)
- `docs/architecture/PHASE_0_DISCOVERY_FINDINGS.md` (orthogonal canvas + multi-tenant findings)
- `docs/DESIGN_DECISIONS.md` § 63 main (8 decisions)
- `docs/DESIGN_DECISIONS.md` § 63.3 Decision (Option α)
- `docs/DESIGN_DECISIONS.md` § 63.14 (resolved + parked items)
- `docs/DESIGN_DECISIONS.md` § 63.15 (Global Resources Architecture)
- `docs/DESIGN_DECISIONS.md` § 63.16 (GlobalEvents Architecture)
- `docs/DESIGN_DECISIONS.md` § 64 (Canvas Architecture)
- This document

**Key findings shaping plan:**
- Zero consumers of `users.workspaces` in src/ — Phase 1 migration cost ~zero
- Sparing is stub-only — write path exists, zero readers, simplifies Phase 2 prep
- `pbliId` / `pbliTeamId` as natural dedup keys for player/team migration
- Spark plan currently — Blaze upgrade needed before Phase 4
- NewTournamentModal already has 3-type selector — Wizard refactor smaller than initially scoped
- HeatmapCanvas zero gestures — load-bearing for landscape coach view (canvas track)
- security-roles-v2 merged via `fb049ac` + `50434fb` — foundation for `userRoles[uid]` source-of-truth already exists

---

## Phase 1 — Schema foundation (Option α) ✅ DONE 2026-05-19

**Decision source:** `docs/DESIGN_DECISIONS.md` § 63.3 Decision sub-block.

**🎉 Phase 1 schema foundation COMPLETE 2026-05-19.** All three sub-briefs shipped same day:
- Phase 1.1 (`b90ffed`): `useUserWorkspaces` hook deployed
- Phase 1.2 (`6c9ad4f`): write path dropped + signup writer removed; field fully orphan in code
- Phase 1.3 (`e560151`): migration script + run — 18 user docs migrated, 0 errors; field deleted from stored data

§ 63.3 Option α fully implemented. `workspace.userRoles[uid]` is sole source of truth.

### Scope

Drop `users/{uid}.workspaces: string[]` field. Source of truth = `workspace.userRoles[uid]`. Switcher UI uses collectionGroup query.

### Sub-briefs (sequential)

1. ✅ **Phase 1.1 — Switcher UI collectionGroup query** — DONE 2026-05-19 (`b90ffed`). Built `useUserWorkspaces` hook querying `workspace.userRoles[uid]`. Foundation for future switcher UI (separate UX brief).
2. ✅ **Phase 1.2 — Drop write path + bootstrap refactor** — DONE 2026-05-19 (`6c9ad4f`). Removed sole writer at `dataService.js:getOrCreateUserProfile`. SoT inline comments added at 3 `userRoles` write sites in `useWorkspace.jsx`. No firestore.rules change.
3. ✅ **Phase 1.3 — Migration script + field deletion** — DONE 2026-05-19 (`e560151` script + same-day run). Created `scripts/migration/phase_1_3_delete_users_workspaces.cjs` matching existing `purge-anonymous-users.cjs` pattern. Dry-run: 21 docs, 18 with field. Write run: 18 deleted, 0 errors. Post-write verification: 0 docs with field remaining.

### Dependencies

- Phase 0 done (✅)
- Test multi-workspace account exists (Jacek can prep one)
- Firestore rules from security-roles-v2 already merged (`fb049ac` + `50434fb`)

### Validation gates

- [ ] Switcher UI populates correctly for multi-workspace test account
- [ ] Super Coach derivation (`workspace count ≥ 2`) works against collectionGroup result
- [ ] Bootstrap auto-join writes only `userRoles`, no writes to `users.workspaces`
- [ ] All user docs have `workspaces` field deleted post-migration
- [ ] Zero Sentry errors related to missing `workspaces` field
- [ ] 1 week clean monitoring period before Phase 2 starts

### Rollback procedure

If issues arise post-migration:
1. Revert Phase 1.2 commit (re-introduce dual-write to `users.workspaces`)
2. Run reverse migration script (re-populate `users.workspaces` from `userRoles` map)
3. Restore previous switcher UI implementation (if not just collectionGroup query addition)

Rollback window: indefinite (data not destroyed, can always be regenerated from `userRoles` map).

### Infrastructure triggers

None. Still on Spark plan.

### Risk

**Low.** Zero consumers of dropped field per Phase 0. Switcher query well-bounded scope. Migration is field-deletion (least-risk Firestore op).

### Success criteria

- All user docs migrated (workspaces field absent)
- Switcher works in production
- Zero regression in role resolution
- 1 week clean Sentry

### Estimated timeline

1-2 weeks total (3 sub-briefs, each ~2-3 days CC work + Jacek validation + 1 week monitoring before Phase 2).

---

## Phase 2 — Global Resources (Leagues + Players + Teams + TeamMemberships)

**Decision source:** `docs/DESIGN_DECISIONS.md` § 63.15.

### Scope

Hoist FOUR resources from workspace scope to global scope, coupled migration:
- Leagues — configurable global resource, super admin write, all read
- Players — global with `pbliId` dedup
- Teams — global with `pbliTeamId` dedup
- TeamMemberships — junction table replacing 1:1 player.teamId / team.players patterns

### Sub-briefs (sequential)

1. **Phase 2.1 — Leagues collection bootstrap + super admin UI** — Pre-populate `/leagues/` from current `LEAGUES` + `DIVISIONS` constants (3 entries: NXL, PXL, DPL). Super admin UI for adding new leagues, editing divisions. Workspace UI consumes read-only.
   - ✅ **2.1a — Bootstrap script (DONE 2026-05-19, `324f380`)** — `/leagues/` populated with l_nxl/l_pxl/l_dpl docs, schema per § 63.15.1. Idempotent.
   - ✅ **2.1b — Workspace consumption refactor (DONE 2026-05-19, `2f81b2b`)** — useLeagues + useLeagueDivisions hooks + buildLeaguesFromConstants adapter; 6 React consumers refactored. Additive constants-fallback pattern. Stored value format preserved (d.name not d.id).
   - ✅ **2.1c — Super admin UI (DONE 2026-05-19, `96e9951`)** — /admin/leagues route + AdminLeaguesPage + LeagueFormModal + CRUD service fns + firestore.rules block + More tab link. Defense in depth admin gate (AdminGuard + component check + Firestore rules). Soft delete only. useLeagues filters active=true by default; useAllLeagues exposed for admin view. **🚨 Requires `firebase deploy --only firestore:rules` to activate write gate + unblock useLeagues reads.**

   **🎉 Phase 2 Step 1 (Leagues) COMPLETE 2026-05-19.** Pattern template ready for Steps 2-4 (Players, Teams, TeamMemberships).
2. **Phase 2.2 — Players global migration** — Hoist workspace players to `/players/`. Dedup via `pbliId`. Update workspace UI to query global. Reference § 63.15.3.
   - ✅ **2.2.a — Bootstrap (DONE 2026-05-19, `ab1319c` + execute run)** — 976 workspace players → 934 global `/players/` docs. Option α (preserve workspace IDs as global IDs). 42 intra-workspace dedup groups collapsed (zero name conflicts, zero cross-workspace overlap). Aliases tracked in `aliasIds[]` on canonical doc. Legacy `/workspaces/ranger1996/players/` untouched (cleanup deferred to 2.2.d).
   - ✅ **2.2.b — Workspace consumption refactor + alias resolution (DONE 2026-05-19, `8614a9b`, sequenced rules+code deploy)** — usePlayers hook reads /players/ via onSnapshot, returns playersById map with canonical+alias keys (Phase 2.2.a 42 mappings folded in). 11 consumer files swapped raw-ID find → playersById lookup. dataService player write fns dual-write to both global + legacy paths. firestore.rules /players/ block added. Centralized usePlayers hook (1 modification) propagated to all 20 React consumers automatically.
   - ✅ **2.2.c — Super admin UI for players CRUD (DONE 2026-05-19, `7de12d4`)** — `/admin/players` route + AdminPlayersPage + PlayerFormModal. URL-backed search/filter (All/Linked/Unlinked/HERO)/sort/paginated 50/page (~19 pages for 934 docs). Defense in depth (3 layers): AdminGuard route, component check, firestore.rules /players/ delete admin-email gate (from 2.2.b). New `deletePlayerGlobal()` — global-only hard delete, workspace copy preserved until 2.2.d. Delete confirmation branches on `aliasIds[]`: empty → standard; non-empty → enhanced warning with full alias list + orphan-data callout + "Delete anyway" CTA (informed consent per data-loss waiver, not hard block). Form per § 63.15.3 (no teamId/teamHistory — Phase 2.4 territory). Audit section read-only with aliasIds[] count + monospace list. More tab admin "Players" link. Bundle: 15.87kB / 5.22kB gzip (lazy). **🎉 Phase 2 Step 2 (Players) effectively COMPLETE — only 2.2.d cleanup remains.**
   - **2.2.d — Legacy /workspaces/{slug}/players/ cleanup** — DEFERRED until Phase 2.2.c stable + Phase 2.3 maturity. Migration script to remove workspace write paths from dataService (addPlayer/updatePlayer/changePlayerTeam/setPlayerHero/deletePlayer dual-write paths collapse to global-only) + drop /workspaces/{slug}/players/ subcollection. Low priority; recovery cushion useful while dual-write stabilizes.
3. **Phase 2.3 — Teams global migration script** — Hoist workspace teams to `/teams/`. Dedup via `pbliTeamId`. Update workspace UI to query global. Reference § 63.15.2.
4. **Phase 2.4 — TeamMemberships junction migration** — Split existing team rosters into `/teamMemberships/` docs. Current state only (no historical seasons backfill). Reference § 63.15.4.
5. **Phase 2.5 — Workspace UI cutover** — Roster queries, player profile views, team detail pages, scouting flows all migrate to global collections + memberships junction. Performance check (sub-100ms target for roster lookup).
6. **Phase 2.6 — Workspace player notes schema** — `/workspaces/{slug}/scoutedTeams/{sid}/playerNotes/{playerId}` or similar — implementation detail decision needed before brief. Detail decision: notes per-player per-tournament vs per-player per-workspace.
7. **Phase 2.7 — Cleanup** — Deprecate workspace subcollections `/workspaces/{slug}/teams/`, `/workspaces/{slug}/players/` after 2-week stabilization. Final irreversible step.

### Dependencies

- Phase 1 stable (✅ 1 week monitoring done)
- Test data: existing workspaces with PbLeagues-backed and custom teams/players
- Backup before each migration script run (Firestore export)

### Validation gates

- [ ] All workspace teams have global equivalent (pbliTeamId match or new global entry)
- [ ] All workspace players have global equivalent (pbliId match or new global entry)
- [ ] Multi-league memberships work — synthetic test: assign one player to teams in 3 different leagues, verify all 3 memberships active
- [ ] Workspace UI queries successful against global collections
- [ ] Roster lookup performance < 100ms (collectionGroup query test)
- [ ] No dedup false positives (manual spot-check on test workspace)
- [ ] Super admin can add new league via UI
- [ ] Zero Sentry errors during migration runs
- [ ] 2 week clean monitoring period before cleanup phase
- [ ] Cleanup phase: 1 week after stabilization, deprecate workspace subcollections

### Rollback procedure

Per-step rollback:
- Phase 2.1: drop `/leagues/` collection. Workspace UI falls back to constants (constants kept until Phase 2.7).
- Phase 2.2: dual-write means workspace players still exist. Workspace UI rolls back to workspace queries.
- Phase 2.3: same pattern as 2.2.
- Phase 2.4: drop `/teamMemberships/` collection. Team rosters in workspace docs still intact.
- Phase 2.5: UI revert to workspace queries.
- Phase 2.6: notes schema rollback per implementation detail.
- Phase 2.7 (cleanup): **IRREVERSIBLE without restore from Firestore backup.** Only run after 2 week stabilization + Jacek explicit GO.

### Infrastructure triggers

- Firestore cost monitoring: 4 new collections add to read/write count. Monitor Spark plan limits.
- No Blaze upgrade yet.

### Risk

**Medium.** Four coupled resources, dedup logic, junction table denormalization. Cleanup phase is irreversible. Strong rollback safety net via dual-write transition + retain workspace subcollections.

### Success criteria

- Multi-league memberships demoable (per Jacek's NXL US + NXL EU + PXL example)
- Workspace UI works without regression
- Super admin can add new leagues
- Cross-workspace player stats coherent (same playerId across workspaces)

### Estimated timeline

4-6 weeks total. 6 sub-briefs (~3-4 days CC work each) + Jacek validation + 2 week stabilization + 1 week cleanup phase.

---

## Phase 3 — GlobalEvents β (registry + optional linking)

**Decision source:** `docs/DESIGN_DECISIONS.md` § 63.16.4 β.

### Scope

Per § 63.16:
- `/globalEvents/{geid}` collection introduced
- Super admin UI for creating/editing global event entries
- Workspace event creation flow gains optional `globalEventId` linkage dropdown
- Workspace UI shows linkage status on event list
- Optional: PbLeagues schedule auto-import for super admin

### Sub-briefs (sequential)

1. **Phase 3.1 — `/globalEvents/` collection + super admin UI** — Schema per § 63.16.2. Super admin can create/edit/archive entries.
2. **Phase 3.2 — Workspace event creation linkage** — Optional dropdown in event creation flow. Autocomplete from global registry.
3. **Phase 3.3 — Linkage UI patterns** — Workspace event list shows linkage status (linked icon, global event name). Settings to retroactively link existing events.
4. **Phase 3.4 (optional) — PbLeagues schedule import** — Super admin can pre-populate registry from PbLeagues season schedule API. Defer to post-MVP if API integration is non-trivial.

### Dependencies

- Phase 2 stable (✅ stabilization done, cleanup phase complete)
- Global Leagues + Teams resources available (Phase 2.1 + 2.3)

### Validation gates

- [ ] Super admin can create global events
- [ ] Workspace coach can link/unlink events
- [ ] Two workspaces independently link to same global event (synthetic test)
- [ ] No regression in workspace event creation flow
- [ ] Audit trail visible (linkage history in event doc)
- [ ] 1 week clean monitoring period

### Rollback procedure

- Linkage is opt-in throughout. Disable UI → workspaces operate as before.
- `/globalEvents/` collection can stay (no impact if unused) or be dropped.
- No data loss in workspace events (linkage is additive field).

### Infrastructure triggers

- **Blaze upgrade should happen during Phase 3.** Cloud Functions infrastructure needed for Phase 4. Validate Cloud Functions deployment pipeline before Phase 4 starts. Set up Sentry monitoring for Cloud Function errors.
- Firestore cost monitoring continues.

### Risk

**Low.** Additive feature, opt-in linkage, no behavior change for workspaces that don't link.

### Success criteria

- Two workspaces successfully link to same global event in production
- Super admin can pre-populate registry
- Workspace UI shows linkage status correctly
- Blaze upgrade complete, Cloud Functions deployable

### Estimated timeline

3-4 weeks. 3-4 sub-briefs + Blaze upgrade prep + monitoring period.

---

## Phase 4 — GlobalEvents γ (composite aggregation + reconciliation)

**Decision source:** `docs/DESIGN_DECISIONS.md` § 63.16.4 γ + § 63.16.5.

### Scope

- Composite aggregation Cloud Function
- Reconciliation logic per § 63.16.5 (trust-one-source)
- Authority workspace designation (defaults to first linker)
- Super admin aggregated layout insights start using composite mode for linked events
- Aggregate mode remains fallback for unlinked events

### Sub-briefs (sequential)

1. **Phase 4.1 — Cloud Function infrastructure setup** — Deploy Cloud Functions to Blaze project. Sentry integration for error capture. Monitoring + alerting for function timing + failures.
2. **Phase 4.2 — Composite aggregation logic + reconciliation** — Implement composite mode per § 63.16. Trust-one-source reconciliation. Audit panel for non-authority observations. Authority workspace field on `/globalEvents/{geid}`.
3. **Phase 4.3 — Super admin layout insights UI update** — Switch from aggregate to composite mode for linked events. Toggle for super admin to view both. Audit panel UI.

### Dependencies

- Phase 3 stable (✅ multiple workspaces linking same events in production)
- **Blaze plan active** (verified during Phase 3)
- Cloud Functions deployment pipeline working

### Validation gates

- [ ] Composite mode produces correct dedup for linked events (synthetic test with 2 workspaces same event)
- [ ] Aggregate mode unchanged for unlinked events
- [ ] Authority designation works (default first linker, super admin can change)
- [ ] Audit panel shows non-authority observations
- [ ] Cloud Function timing acceptable (< 5s for typical aggregation)
- [ ] Cost monitoring: Cloud Function reads/writes within budget
- [ ] 2 week clean monitoring period before Phase 5+ trigger consideration

### Rollback procedure

- **Composite mode toggle in feature flags** (`enableCompositeMode`). Disable → fallback to aggregate mode.
- Cloud Function can be paused (Cloud Functions API).
- Authority designation data preserved (just unused if composite disabled).
- Aggregate mode is always-on fallback.

### Infrastructure triggers

- Blaze plan ACTIVE (mandatory).
- Cloud Functions deployed.
- Sentry monitoring for Cloud Function errors active.
- Cost monitoring for Firestore reads (composite mode reads many docs per global event).

### Risk

**Medium-high.** New infrastructure (Cloud Functions), composite logic complex, performance unknowns at scale. Strong rollback (feature flag) mitigates.

### Success criteria

- Super admin sees deduplicated metrics for linked events
- Authority workspace assignment works in production
- Audit panel shows non-authority observations correctly
- No production-breaking Cloud Function errors

### Estimated timeline

4-6 weeks. 3 sub-briefs (Cloud Function infra adds overhead) + Blaze validation + monitoring.

---

## Phase 5+ — GlobalEvents δ (super admin merge UI)

**Decision source:** `docs/DESIGN_DECISIONS.md` § 63.16.4 δ.

### Scope

- Super admin merge UI — retroactively link unlinked events, designate authority for conflicting observations, audit trail viewer, merge duplicate registry entries.

### Trigger

Phase 5 starts when:
- Phase 4 has been stable for ≥ 1 month
- Volume of linked events justifies UI investment (≥ 50 linked events, multiple workspaces actively linking)
- Specific merge scenarios encountered that require retroactive resolution

### Timeline

TBD when triggered.

---

## Parallel Track — Canvas Refactor

**Decision source:** `docs/DESIGN_DECISIONS.md` § 64.

Independent of multi-tenant phases. 8 sequential steps per § 64.9. Can run any time, no dependencies on multi-tenant work. First beneficiary: landscape coach view (ScoutedTeamPage heatmap).

Sub-briefs tracked separately in NEXT_TASKS.md ready-for-brief queue.

---

## Cross-phase concerns

### Sentry monitoring

Sentry shipped 2026-04-17 (`d8652d2`). Every phase ends with 1-2 week monitoring period before next phase starts:
- Sentry dashboard clean (no critical errors)
- No production rollback events
- No user-reported regressions

If errors appear during monitoring → debug + fix before proceeding. Do not advance to next phase with open critical issues.

### Firestore cost projections

| Phase | New collections | Estimated additional reads/day | Plan |
|---|---|---|---|
| 1 | None | ~0 (collectionGroup query for switcher) | Spark OK |
| 2 | 4 (`/leagues/`, `/players/`, `/teams/`, `/teamMemberships/`) | Roughly proportional to workspace activity | Spark monitor |
| 3 | 1 (`/globalEvents/`) | Low (registry lookups) | Spark monitor |
| 4 | Cloud Function reads (composite aggregation) | Significant — multiple workspace events per aggregation | **Blaze required** |

Detailed cost projections per phase to be calculated when implementation brief is written (current cost data needed from Firestore Console).

### Blaze upgrade trigger

**End of Phase 3 / start of Phase 4.**

Pre-upgrade checklist:
- [ ] Billing account setup
- [ ] Cost alerts configured (daily threshold + monthly budget)
- [ ] Sentry monitoring for Cloud Function errors validated
- [ ] Cloud Functions deployment pipeline tested in staging
- [ ] Rollback procedure documented for Cloud Function failures

### Migration script patterns

All migration scripts use Firestore Admin SDK from Node.js. Standard pattern:

1. **Dry-run mode** (default) — read-only, log what would be written, no writes. Verify counts + dedup correctness.
2. **Backup** — Firestore export to GCS bucket before write mode. Retain for 90 days minimum.
3. **Write mode** — actual migration. Run in batches (Firestore batch write limit: 500 ops).
4. **Verification** — post-migration read-only verification script confirms expected state.

Scripts live in `scripts/migration/` (new directory). Each phase has dedicated subfolder.

### Data preservation principles

- **Workspace subcollections retained** until explicit cleanup phase per migration (e.g. Phase 2.7).
- **Migration is additive** — global resources added, workspace data kept until cleanup gate.
- **Cleanup is the only irreversible step** per phase. Done only after stabilization period + Jacek explicit GO.
- **Backups retained 90 days** post-cleanup.
- Worst-case recovery: restore from Firestore export.

### Rollback principles

- **Per-phase rollback always possible** until cleanup phase.
- **Feature flags as primary rollback mechanism** for Phase 3+ features.
- **Code revert + data preservation** for Phase 1-2 (additive migration allows revert to pre-migration behavior).
- **Cleanup phase = point of no return** (workspace subcollection deletion). Always preceded by:
  - 2+ week stabilization
  - Jacek explicit GO
  - Firestore backup verified

### Documentation discipline (per DESIGN_DECISIONS § 37)

- Each phase commit updates this plan with deployment markers
- Each phase deploy updates `DEPLOY_LOG.md`
- Each phase changes `HANDOVER.md` "Currently in flight" and "Recently shipped"
- Phase-specific findings (surprises, learning) appended to relevant DESIGN_DECISIONS section

---

## Cross-references

- `docs/DESIGN_DECISIONS.md` § 63 (Multi-Tenant Architecture — 8 main decisions)
- `docs/DESIGN_DECISIONS.md` § 63.3 (Schema choice — Option α)
- `docs/DESIGN_DECISIONS.md` § 63.14 (Resolved + parked items)
- `docs/DESIGN_DECISIONS.md` § 63.15 (Global Resources Architecture)
- `docs/DESIGN_DECISIONS.md` § 63.16 (GlobalEvents Architecture)
- `docs/DESIGN_DECISIONS.md` § 64 (Canvas Architecture — parallel track)
- `docs/architecture/CANVAS_ARCHITECTURE.md` (Canvas audit)
- `docs/architecture/PHASE_0_DISCOVERY_FINDINGS.md` (Phase 0 findings)
- `docs/DESIGN_DECISIONS.md` § 37 (Documentation discipline)
