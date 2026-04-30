# Multi-Source Observations Architecture — Master Index

**Status:** approved 2026-04-30 · awaiting implementation post-NXL Czechy
**Spec:** `docs/DESIGN_DECISIONS.md` § 57
**Discovery archive:** `docs/archive/audits/2026-04-30_observations_discovery/`

---

## TL;DR

Coaches, scouts, and players write observations to PbScoutPro from multiple devices and tiers. As of 2026-04-30, 28 reader functions are blind to all self-log data — heatmaps, insights, and stats produce zero output from player-collected data.

**Decision:** Option C — write-back propagation with sibling `_meta` arrays. A batch propagator runs at end-of-matchup, matches orphan selfReports to point slots via assignments, and writes back to `homeData/awayData` while preserving provenance. Existing 28 readers remain untouched.

**Schema additions:** `slotIds`, `playersMeta`, `shotsMeta`, `eliminationsMeta` on PerSideData; `slotRef` on selfReport.

**Free tier:** ~5% of Spark daily write limit. ~20x headroom.

**Effort:** 3 commits, ~5-6 days CC. Phase 1 ships post-NXL.

---

## Diagrams

All 10 SVG files live in `docs/architecture/diagrams/multi_source/`.

### High-level design (HLD) — 7 diagrams

| # | File | Question answered | Read time |
|---|---|---|---|
| 1 | `01_context_l1.svg` | Who interacts with the system, and where does data live? | 30s |
| 2 | `02_data_structure_l2.svg` | What does a point document look like with new schema? | 1m |
| 3 | `03_data_flow_l3.svg` | How does data flow from writers to storage to propagator? | 1m |
| 4 | `04_shared_vocabulary_l4.svg` | How do bunkers connect to player positions, both directions? | 1m |
| 5 | `05_streams_canonical_merge.svg` | How does propagator interact with § 42 per-coach streams + canonical merge? | 1m |
| 6 | `06_matching_ecosystem.svg` | What 3 layers of matching exist (Player↔Team, User↔Player, Observation↔Point)? | 1m |
| 7 | `07_field_zones_consumers.svg` | What 5 field zones exist and which functions read them? Why does propagator activate them automatically? | 1m |

### Low-level design (LLD) — 3 sequence diagrams

| # | File | Scenario | Read time |
|---|---|---|---|
| 8 | `08_sequence_happy_path.svg` | Coach assigns → player logs → end matchup → batch propagation → heatmap | 2m |
| 9 | `09_sequence_late_log.svg` | Player saves PPT after matchup already closed → auto-trigger → single-shot propagation | 2m |
| 10 | `10_sequence_conflict_resolution.svg` | Scout writes position, player writes selfReport with different values → propagator applies per-field rules | 2m |

**Notation choice:** UML sequence diagrams chosen over BPMN. BPMN is overformalized for a 5-person team and not developer-native; UML sequence is industry standard for "what happens in time between components".

---

## Reading order for new contributors

If you're picking up § 57 implementation:

1. **Start here:** read this index (you're here)
2. Read `DESIGN_DECISIONS.md` § 57 in full
3. View diagrams 1 → 2 → 3 → 4 to understand structure + flow
4. View diagrams 5 → 6 → 7 to understand cross-cutting integrations
5. View diagrams 8 → 9 → 10 to understand exact runtime behavior
6. Read `ONBOARDING_GUIDANCE.md` (Phase 2 spec — defer until Phase 1 lands)
7. Optional deep dive: discovery reports in `docs/archive/audits/2026-04-30_observations_discovery/`

If you're a stakeholder reviewing the decision:

1. Read § 57.1 (problem) + § 57.2 (decision) — 5 min
2. View diagrams 1 + 3 — 2 min
3. Review § 57.7 (conflict rules) + § 57.9 (risks) — 5 min

---

## Decision narrative

### Why Option C (write-back) over alternatives

Three architectures considered:

**Option A — Read-time consensus view:** Add a layer that merges `point.{home,away}Data` + `selfLogs` + `selfReports` at read time. Consumed by 28 readers.
- ❌ Requires rewriting 28 reader functions across `generateInsights.js` + `coachingStats.js`
- ❌ High-risk single deploy: any reader unmigrated = silent data loss in stats
- ❌ Slower reads (merge logic on every call)

**Option B — Separate consensus collection:** Write to `point.{home,away}Data` AND a parallel consensus collection. Readers gradually migrate to new collection.
- ⚠️ Dual storage forever (or until last reader migrates)
- ⚠️ Drift risk between primary and consensus copies
- ⚠️ Requires coordination across all writers (W1-W7) for dual-write

**Option C — Write-back to homeData/awayData with sibling _meta arrays:** Self-log data flows back to `point.{home,away}Data` via batch propagator. New `_meta` arrays carry provenance without touching existing fields.
- ✅ 28 readers untouched (don't know `_meta` exists)
- ✅ Single source of truth maintained
- ✅ `filledBy` per-slot already exists (§ 54.5) — `_meta` is half-built
- ✅ "5 graczy = scoutless heatmap" works on day 1 post-deploy
- ✅ Bunker-position lossy mapping mitigated by fieldSide offset

**Trade-off accepted:** propagator must handle conflict resolution per field (see § 57.7). This is contained logic, easy to test.

### Why batch end-of-matchup trigger over per-event

Per-event trigger fires propagation on every selfReport save. Pros: instant updates. Cons:
- ~40 writes per matchup (8 points × 5 players) instead of ~8 writes
- Most useful state is at end-of-matchup anyway (coach reviews then)
- Coordinator overhead per event = wasted writes when player saves 3 reports back-to-back

Batch end-of-matchup chosen by Jacek 2026-04-30 (preference for predictable bulk operation).

Late-log auto-trigger added as escape hatch for players who save PPT after matchup closed (~10 lines extra code in WizardShell).

### Why client-side propagator over Cloud Function

Cloud Function would consume Firebase Spark plan invocation budget (125K/month). Free tier headroom math:

| Trigger | Daily invocations | % of monthly limit |
|---|---|---|
| Per-event (Cloud Function) | ~120 | 0.3% (3 trainings × 40 events) |
| Batch (Cloud Function) | ~6 | 0.005% |
| Batch (client-side, no Cloud Function) | 0 | 0% |

Client-side adds zero monthly invocation overhead. Trade-off: requires coach app open at end-of-matchup (acceptable — coach is always present at that moment). Multi-tablet KIOSK race mitigated by per-field last-writer-wins on `_meta.ts`.

---

## Cross-references

| Topic | Where it lives |
|---|---|
| Full § 57 spec | `docs/DESIGN_DECISIONS.md` § 57 |
| Onboarding 9 moments (Phase 2) | `docs/architecture/ONBOARDING_GUIDANCE.md` |
| § 42 per-coach streams + merge | `docs/DESIGN_DECISIONS.md` § 42 |
| § 48 PPT Tier 2 | `docs/DESIGN_DECISIONS.md` § 48 |
| § 52 PPT unlinked-mode | `docs/DESIGN_DECISIONS.md` § 52 |
| § 54 death taxonomy + filledBy | `docs/DESIGN_DECISIONS.md` § 54 |
| § 55 KIOSK lobby | `docs/DESIGN_DECISIONS.md` § 55 |
| Original PPT architecture | `docs/architecture/PLAYER_SELFLOG.md` |
| Discovery reports (full ground-truth) | `docs/archive/audits/2026-04-30_observations_discovery/` |

---

## Implementation hand-off summary

When ready to start Phase 1 (post-NXL Czechy 2026-05-15):

1. Create branch `feat/observations-multi-source` off main
2. Commit 1: schema extensions + propagator core (~3-4 days)
3. Commit 2: provenance UI uplift (~1-2 days, optional in Phase 1)
4. Commit 3: backfill + cleanup (~0.5 days)
5. Deploy to GitHub Pages, verify Sentry stays clean
6. After 1 weekend of NXL data, audit `firestore:databases:get` quota for any surprises
7. If clean, ship Phase 2 (onboarding) ~2 weeks later
