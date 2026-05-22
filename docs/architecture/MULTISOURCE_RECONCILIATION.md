# Multi-source reconciliation (Klocek 2 / Phase 1b) — architecture

**Status:** Stage 1 (Foundation) shipped 2026-05-21. Stages 1b–4 queued.
**Spec:** `docs/DESIGN_DECISIONS.md` § 70 · **Phase 1a:** § 57 · **PPT:** § 48
**Code verified:** 2026-05-21 — re-verify if dataService / point schema churns.

An event carries up to three observation sources — **scout** (proper canvas
scouting), **coach** (quick-log), **player** (self-log). Reconciliation makes
them granularly separable per layout × event-type × source, and matches orphan
player logs onto coach/scout points. This doc is the long-form companion to
§ 70.

---

## 1. Sources today

### scout — canvas / proper scouting
Writes `point.homeData` / `point.awayData` directly. Point docs:
`tournaments/{tid}/matches/{mid}/points/{pid}` and
`trainings/{trid}/matchups/{mid}/points/{pid}` — created by `addPoint`
(`dataService.js:690`) / `addTrainingPoint` (`:1070`), identical shape
`{ ...data, order: Date.now(), createdAt: serverTimestamp() }`.

Per-side shape — `utils/pointFactory.js baseSide()`: `players[5]`,
`assignments[5]`, `shots{}`, `eliminations[5]`, `eliminationPositions[5]`,
`quickShots{}`, `obstacleShots{}`, `bumpStops[5]`, `runners[5]`, `fieldSide`,
+ § 57 `slotIds[5]`, `playersMeta[5]`, `shotsMeta[5]`, `eliminationsMeta[5]`,
+ `scoutedBy`. Same across tournament / sparing / training (shared factory).
Canvas writer: `MatchPage.jsx makeTeamData` (`~:857`) — `_meta` source `'scout'`.

### coach — quick-log (QuickLogView)
`QuickLogView.jsx` is presentation-only — `buildPayload()` → `onSavePoint()`.
Two distinct host handlers, both writing full point docs:
- `MatchPage.jsx:716` (tournament/sparing) → `addPoint`.
- `TrainingScoutTab.jsx:140` (training) → `addTrainingPoint`.
As of § 70 Stage 1 both tag `_meta` source **`'coach'`** (`makeMeta('coach', …)`)
— previously indistinguishable from scout. QuickLog records `assignments`
(who played), zone-derived synthetic `players` positions, `outcome`; **no
shots/eliminations** unless the live-tracker (Stage 3) was used. `point.createdAt`
(server) + `point.order` (client ms) = the temporal/sequence anchor the matcher
keys on.

### player — self-log (two layers, both current)
| | `selfReports` | `point.selfLogs` |
|---|---|---|
| Path | `players/{pid}/selfReports/{id}` (+ `pendingSelfReports/` unlinked) | embedded map on the point doc |
| Writer | `createSelfReport` (`playerPerformanceTrackerService.js:43`) | `setPlayerSelfLog` / `setPlayerSelfLogTraining` (`dataService.js:1218/1231`) |
| Used by | PPT wizard (`/player/log`) | KIOSK flow |
| Point binding | **orphan by default** (`matchupId`/`pointNumber` default null) | 1:1 with a point |

selfReport schema (§ 48.5): `{ createdAt, layoutId, trainingId, teamId,
matchupId, pointNumber, breakout:{side,bunker,variant}, shots:[{side,bunker,order}],
outcome, outcomeDetail, outcomeDetailText, slotRef, propagatedAt }`. Only
`breakout.bunker` + `outcome` are required → **an orphan selfReport is the
normal state**. Self-log shots → `points/{pid}/shots/{sid}` subcollection,
`source:'self'`.

The matcher (Stage 2) operates on **orphan `selfReports`**. `point.selfLogs`
stays separate — already point-bound by the KIOSK user; unify to one consensus
target later (§ 70.4.1).

## 2. Provenance — `_meta`

`observationMeta.makeMeta(source, writerUid)` → `{ source, writerUid, ts }`.
`source ∈ {scout|coach|self|kiosk}` (`'coach'` added § 70 Stage 1). `ts` is
**client `Date.now()`** — Firestore rejects `serverTimestamp()` inside arrays,
and `_meta` lives in the per-side `playersMeta`/`shotsMeta`/`eliminationsMeta`
arrays. Acceptable for § 57.7 conflict resolution (ts comparison works with
client ms).

Write sites: `MatchPage.jsx` (canvas `'scout'`, QuickLog `'coach'`, a `'self'`
path `:432`), `TrainingScoutTab.jsx` (QuickLog `'coach'`), `KioskLobbyOverlay.jsx`
(`'kiosk'`). `firestore.rules` does **not** validate `_meta.source` — the only
`source` rule is the shots-subcollection `source=='self'` player carve-out.

## 3. Phase 1a rails — shipped, do not rebuild

- `slotIds[5]` per side — stable UUIDs (`crypto.randomUUID()`) at point
  creation (`pointFactory.baseSide`; `MatchPage` generates lazily / preserves
  across edits). The matcher's write-back target.
- `playersMeta` / `shotsMeta` / `eliminationsMeta` — `[null×5]` provenance
  siblings, filled by writers alongside their data.
- `selfReport.slotRef` + `propagatedAt` — stub fields, currently always `null`
  (`createSelfReport` defaults; same on `pendingSelfReports`). The Stage 2
  propagator sets them.
- `utils/bunkerToPosition.js` — `bunkerToPosition(bunker, fieldSide)` maps a
  layout bunker centroid → synthetic `{x,y}` (2% offset toward base). **No
  caller yet** — the Stage 2 propagator wires it.

## 4. Matcher — `propagateMatchup` (as-built, Stage 2)

`dataService.propagateMatchup(trainingId, matchupId)` matches orphan training
`selfReports` to point slots. Pure resolution logic lives in
`utils/selfReportMatcher.js` (no Firestore).

**Candidate set** — every `playerId` in any `assignments[]` across the matchup's
points. Per player: `players/{pid}/selfReports where trainingId == X` — a single
`where` → the **auto single-field index**, *no composite index needed*;
`propagatedAt` is filtered in JS.

**IDENTITY (primary locator)** — `locatePlayerInPoint(point, playerId)`:
`homeData/awayData.assignments.indexOf(playerId)` → `{ sideKey, slot }`. Side +
slot come from this one lookup; nothing else is needed to *locate*.

**TEMPORAL / sequence** — `alignSequence(reports, points)`: a player's reports
sorted by `createdAt`, their identity-located points sorted by `order`, paired
1:1 up to `min(N,M)`; surplus left orphan. Aligned on the **FULL** report set
(propagated or not) each run → deterministic, so re-runs and late additions
yield stable pairs (the `propagatedAt` gate then skip-writes the done ones).

**POSITION (confidence only)** — `positionConfidence(...)`: `breakout.bunker`
NAME → `layout.bunkers[]` doc → `bunkerToPosition(bunker, {side}Data.fieldSide)`
→ distance to `{side}Data.players[slot]`. `≤ 0.12` normalized = `high`; beyond =
`low`; no slot coord / unknown bunker = `unknown`. `high`/`unknown` → write-back
(identity stands; `unknown` is unverifiable, not a contradiction — most QuickLog
slots carry no coord); `low` → flag `needsReview` + `candidateSlotRef`, no
write-back (Stage 4 review resolves).

**Triggers** — `endMatchupAndMerge` (per matchup, § 70.6 Stage 2) +
`updateTraining(status:'closed')` → `propagateTraining` over every matchup
(§ 70.6 Stage 1b — catches matchups never explicitly merged). Both best-effort:
a propagation failure never fails the merge/close. Late-log (propagate on
`createSelfReport`) is deferred — `updateTraining`-close is the safety net.

## 5. Write-back — `propagateSelfReportToPoint` (as-built, § 57 Option C)

`dataService.propagateSelfReportToPoint(...)` — the **shared** write-back, used
post-hoc by the propagator (`source:'self'`) and live by the KIOSK lobby
(`source:'kiosk'`). On a confident match:
1. `{side}.playersMeta[slot] = makeMeta(source, writerUid)`.
2. `{side}.players[slot]` ← synthetic coord (`bunkerToPosition`) **only when the
   slot is empty** — never overwrites a scout/coach position.
3. shots → `points/{pid}/shots/` subcollection (`addSelfLogShotTraining`,
   synthetic xy from bunker centre) + `{side}.shotsMeta[slot]`.
4. `outcome` `elim_*` → `{side}.eliminationsMeta[slot]`.
5. on the `selfReport`: `slotRef = {side}.slotIds[slot]`, `propagatedAt` stamped.

`writerUid = player.linkedUid || playerId` (stable identity for unlinked). The
28 existing readers stay untouched (they ignore `_meta`).

**Idempotency** — `propagatedAt != null` → skip-write on re-run; the target slot
is deterministic from identity, so a re-run is a no-op.

**Conflict** (double-log, same player + slot — § 70.4.4) — **last-writer-wins**:
the `_meta[slot]` dotted-path write overwrites; the latest `_meta.ts` wins the
consensus slot. `selfReports` are **immutable** — both remain in the repo;
Stage 4 reassign handles deliberate corrections.

## 6. Orphan handling

A selfReport with no confident anchor stays orphan (`slotRef` null). It is
still readable + aggregatable:
- `getLayoutShotFrequencies(layoutId, breakoutBunker)`
  (`playerPerformanceTrackerService.js:134`) — `collectionGroup('selfReports')`,
  **no playerId filter → anonymous crowdsourced counts**.
- Aggregation is **event-scoped, not date-scoped** (§ 70.4.3): orphans scoped
  by `eventId`; matched obs are event-scoped by tree position. No per-date
  dimension exists today — Stage 3 adds the event-scoped rollup.

**Free-play (Option A) — Stage 1b shipped (2026-05-21).** Coach quick-logs with
no squad-vs-squad matchup attach to a per-training "Free play" matchup
(`getOrCreateFreePlayMatchup`, `isFreePlay:true`, null squads). Entry: the
"Log free play" card in `TrainingScoutTab` Section 3 (attendee-gated;
`isFreePlay` matchups are filtered from the regular matchup list). QuickLogView
runs a squad-less `freePlay` mode: pick (attendees, one roster) → zone →
per-player survived/eliminated → save. The point lands in `homeData` only,
`outcome:null`, per-player `eliminations[]`, `_meta source:'coach'` — event-
scoped, ready for the matcher's consensus reads. Win-rate consumers exclude
`outcome:null` points via a decided-points denominator. Training-only; sparing
keeps its natural us-vs-opponent match.

## 7. Granular read + event aggregation — Stage 3

**D2 — event-scoped aggregation — SHIPPED 2026-05-22.** `getEventShotFrequencies(trainingId)`
(`playerPerformanceTrackerService.js`) — one `collectionGroup('selfReports')
.where('trainingId','==',X)` query, grouped by `breakout.bunker`. Propagated
`selfReports` stay in the subcollection (stamped `propagatedAt`), so this single
query is the *complete* self-log set for the event — matched + orphan — with no
in-tree iteration (training points are zone-granular D/C/S, not bunker-granular).
Returns per bunker `{ bunker, side, count, hits, hitRate, shots }`, anonymous (no
`playerId`). Surfaced as the "Break bunkers" breakdown on `TrainingResultsPage`
("this bunker, N× this event, X% hit"). Index: `fieldOverrides`
`selfReports.trainingId` COLLECTION_GROUP.

**D1 — granular consensus read — DEFERRED.** The plan was source-filter pills on
the `ScoutedTeamPage` heatmap, but `ScoutedTeamPage` is route
`/tournament/:tournamentId/team/:scoutedId` — strictly tournament *opponent*
scouting. The § 70 multi-source `_meta` (coach/self/kiosk) lives in **trainings**,
and there is no training heatmap surface today. D1 is re-scoped as its own brief:
a **source-filtered training heatmap on `TrainingResultsPage`** (a new surface) —
filter slots by `_meta[i].source` (`scout`/`coach`/`self`+`kiosk`→Player).

---

**Cross-references:** § 48 (PPT product spec), § 57 + `MULTI_SOURCE_OBSERVATIONS_INDEX.md`
(Phase 1a multi-source observations), § 69 (events_index), § 70 (this model),
`PLAYER_SELFLOG.md` (original PPT self-log), `FIRESTORE_DATA_MODEL.md` (DB map).
