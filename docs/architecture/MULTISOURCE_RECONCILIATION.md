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

## 4. Matcher design — Stage 2 (placeholder)

Goal: assign each orphan `selfReport` to a point slot. **Signals:**
- **temporal** — `selfReport.createdAt` vs `point.createdAt` / `point.order`.
- **identity** — `selfReport` player (`players/{pid}` owner, or `pendingSelfReports`
  uid) vs `point.{side}.assignments[]` / `slotIds[]`.
- **position** — `selfReport.breakout.bunker` vs scout/coach position on the
  slot (via `bunkerToPosition`).
- **sequence** — ordered batch: N self-logs map to N points in `order` sequence.

**Confidence (§ 70.4.4):** max automation — auto-assign whenever signals
resolve (incl. batch-by-sequence); flag low-confidence for review but never
block; manual override/reassign always available. Observations are
append-only → a reassign is a new observation, auditable.

**Triggers (§ 57):** batch at end-of-matchup (client-side, coach app open) +
a late-log auto-trigger for self-logs saved after the matchup closed. No Cloud
Function (Spark-budget reasons — see `MULTI_SOURCE_OBSERVATIONS_INDEX.md`).

## 5. Write-back — § 57 Option C

On a confident match the Stage 2 propagator:
1. sets `selfReport.slotRef = point.{side}.slotIds[i]`,
2. writes the observation into `point.{home,away}Data` (`players[i]` synthetic
   position via `bunkerToPosition`, shots, outcome→elimination),
3. sets the sibling `_meta[i] = makeMeta('self', writerUid)`,
4. stamps `selfReport.propagatedAt`.

`homeData/awayData` thus becomes the single consensus store holding **all**
sources, each slot `_meta`-tagged. The 28 existing readers stay untouched (they
ignore `_meta`). Conflict resolution per field per § 57.7 (last-writer-wins on
`_meta.ts`).

## 6. Orphan handling

A selfReport with no confident anchor stays orphan (`slotRef` null). It is
still readable + aggregatable:
- `getLayoutShotFrequencies(layoutId, breakoutBunker)`
  (`playerPerformanceTrackerService.js:134`) — `collectionGroup('selfReports')`,
  **no playerId filter → anonymous crowdsourced counts**.
- Aggregation is **event-scoped, not date-scoped** (§ 70.4.3): orphans scoped
  by `eventId`; matched obs are event-scoped by tree position. No per-date
  dimension exists today — Stage 3 adds the event-scoped rollup.

**Free-play (Option A):** orphan *coach* quick-logs (training with no
squad-vs-squad matchup) attach to an implicit "Free play" matchup —
`getOrCreateFreePlayMatchup(trainingId)` (`dataService.js`, **dormant** Stage 1).
`{ isFreePlay:true, homeSquad:null, awaySquad:null }`. Training-only; sparing
keeps its natural us-vs-opponent match. The "Log free play" entry point +
squad-less QuickLogView mode = Stage 1b.

## 7. Granular read — Stage 3

Once `homeData/awayData` is `_meta`-tagged across sources, a granular read =
**filter slots by `_meta[i].source`**. UI separates sources via Apple-HIG tabs
(§ 70.2) — e.g. a heatmap rendered scout-only, coach-only, player-only, or
merged. Event-scoped aggregation answers "this bunker, 30× this event, 20%
hit". Scope: matched observations by tree position; orphans by `eventId`.

---

**Cross-references:** § 48 (PPT product spec), § 57 + `MULTI_SOURCE_OBSERVATIONS_INDEX.md`
(Phase 1a multi-source observations), § 69 (events_index), § 70 (this model),
`PLAYER_SELFLOG.md` (original PPT self-log), `FIRESTORE_DATA_MODEL.md` (DB map).
