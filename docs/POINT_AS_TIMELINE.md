# Point as Timeline ("Punkt jako Oś czasu") — Workstream Charter & Backlog

> **Status:** FINALIZED — Stage 0 ground-truth (CC 2026-06-02) + decisions **D1–D3 LOCKED 2026-06-02**.
> Lives in repo as `docs/POINT_AS_TIMELINE.md`. **Single reference** for this workstream — read first; don't re-invent.

## 0. Goal
Expand point scouting from today's 2 phases (break + obstacle) toward the **full point lifecycle**, ultimately
a **time axis** (timestamped events + scrubber). Direction reuses the 2026-04-30 event-sourced sketch as
*target*, but per Stage 0 that model is mostly paper — so we **augment what exists**, scout-first.

## 1. Current state — GROUND TRUTH (CC Stage 0, 2026-06-02)
**Reconcile model = mostly PAPER.** Shipped, narrow only: §70 provenance metadata
(`playersMeta/shotsMeta/eliminationsMeta` + per-slot `slotIds` UUIDs, `MatchPage.jsx:1072-77`) +
**training-only** self-report matcher (`selfReportMatcher`: `locatePlayerInPoint/alignSequence/positionConfidence`
→ `propagateMatchup`/`propagateSelfReportToPoint`, on training close) + Stage-4 override/dismiss (no review UI).
**No `observations` collection** (`pointFragments` = backlog, `MULTISOURCE_RECONCILIATION.md`). Insight readers
(`coachingStats.js`/`generateInsights.js`) read **ONLY** `point.homeData/awayData` — self/kiosk/selfReports
ignored for tournaments.

**Point = atomic snapshot, NOT a sequence.**
- Draft `emptyTeam()` (`MatchPage:53-55`); persisted `makeTeamData()` (`MatchPage:1061-80`) →
  `assignments/bumpStops/eliminations/eliminationPositions` + `*Meta` + `slotIds` + `scoutedBy` + `fieldSide`.
- Top-level: `homeData/awayData` (+legacy `teamA/teamB` mirror), `outcome` (win_a|win_b|pending|null), `isOT`,
  `penalty`, `comment`, `annotations`, `status` (open|partial|scouted), `order`, `createdAt/updatedAt`,
  `coachUid`, `index`, `canonical`, merge fields.
- **Break vs obstacle = field-name split, NO phase enum** (break=`quickShots`+`zoneShots`+positions/`bumpStops`;
  obstacle=`obstacleShots`+`zoneObstacleShots`).
- **End-state = ONLY `outcome`+`isOT`+`penalty`.** No forfeit, no win-reason, no per-player survived/eliminated-when.
- **Secondary-move = ONLY `bumpStops`** (single START→END per slot, §79). No move-sequence.
- **Timestamps = point-level only.** No per-shot/bump/phase time. EXCEPTION: QuickLog `LivePointTracker`
  captures `eliminationTimes/eliminationStages/reasons/pointDuration` (**QuickLog-only**, not on scout point).

**Sources & scatter:** scout points
`workspaces/{ws}/tournaments/{tid}/matches/{mid}/points/{pid}` (+ `trainings/{trid}/matchups/{mid}/points`),
auto-IDs. Self-log Tier-1 (`point.selfLogs[pid]` + `points/{pid}/shots` `source:'self'`) + Kiosk: code exists,
**GATED OFF in prod** (`featureFlags.js:43`). PPT self-reports: flat `workspaces/{ws}/selfReports/{id}`;
`pendingSelfReports` for unlinked. **Merge: training only; tournament = no cross-source merge.**

**Multi-tenancy:** points/matches/tournaments **workspace-private** under `workspaces/{slug}`; **no
`ownerWorkspaceId`** (ownership via path). players/teams = **global catalog** (`ownerWorkspaceId`); `assignments[]`
reference global player ids; point stays workspace-private. No cross-workspace point sharing.

**Multi-scout:** per-coach streams (`coachUid` + per-coach `index`); tournament `endMatchAndMerge` pairs
coach-vs-coach **by index position (positional, NOT consensus)** → out-of-sync index = **corruption risk**.

**events_index:** `workspaces/{slug}/events_index/{eventId}`, written for all event types; `useEvents()` exists but
**ZERO consumers** and **holds no match/point refs** → cannot address a Point across event types as-is.

**Capture seams:** QuickShotPanel break|obstacle toggle = only phase-spine; `outcome` = only end-state; bump =
only secondary-move; `LivePointTracker` = only intra-point time (QuickLog-only).

## 2. Architecture decisions — LOCKED 2026-06-02 (CC's 3 escalations, confirmed by Jacek)
- **D1 — Tenancy → workspace-private. LOCKED.** Matches §90.12 + today; no cross-workspace aggregation.
- **D2 — Augment, event-sourced (keyframe + deltas). LOCKED.** The existing atomic point = **keyframe #0**
  (full initial state — break/settle — preserved, read by all 28+ readers). Add an additive timestamped
  **delta-event log** (`timeline[]`): move / shot / elimination, **referencing existing `slotIds`**. State at any
  T = keyframe + replay events (full snapshot on demand). **NOT** pure snapshot-chaining (too heavy to
  capture/store); **NOT** replacing `homeData/awayData`. Optional later: materialized keyframes for instant
  scrubbing (render optimization, not a capture model).
- **D3 — Self-log/kiosk are NOT prerequisites. LOCKED.** Scout-side timeline is self-contained; re-enabling the
  selfLog flag + tournament reconciliation are **Stage 7**.

> **Consequence of D2:** scout-side timeline (Stages 2–6) does **NOT** depend on the events A/B/C unification —
> that moves to Stage 7. We ship P1 value without resolving events unification first.

## 3. Target spine (additive per D2 — keyframe + deltas)
**Keyframe #0** = the existing atomic point (break/settle state), untouched. Formalize the phase lifecycle from
the QuickShotPanel seam (**Break → Settle → Mid → End**); **extend** `outcome` for end-state (forfeit "ręcznik" +
win-reason + per-player survived/eliminated-when/how); additive **delta-event** `timeline[]` (**empty until
Stage 5**) referencing `slotIds`; reuse `LivePointTracker`'s time-capture pattern. State at any T = keyframe + replay.

## 4. Backlog — stages (ground-truthed sizing; scout-first)
- **Stage 0 — Inventory** ✅ DONE (CC report 2026-06-02).
- **Stage 1 — Lock D1–D3** ✅ DONE (2026-06-02).
- **Stage 2 — Phase-spine + end-state** (phase-spine **SMALL** — break/obstacle already split + toggle exists;
  end-state **MEDIUM** — extend `outcome` → forfeit/win-reason/per-player). Additive. **Biggest near-term value.** ← NEXT
- **Stage 3 — Multi-scout reliability** (harden the positional index-pairing corruption risk; several scouts at
  tournaments = P1 use). Not full consensus — make pairing robust / detect desync.
- **Stage 4 — Mid-game / secondary-move capture** (**generalize** `bumpStops` → move-sequence; additive,
  references `slotIds`). Bigger.
- **Stage 5 — Time axis** (timer on first-player-placed + timestamped delta-events; **reuse** `LivePointTracker`
  `eliminationTimes/stages/pointDuration`; populate `timeline[]`). Bigger.
- **Stage 6 — Scrubber / replay UI** (keyframe + replay to any T).
- **Stage 7 — Self-log + kiosk + cross-source unification** (re-enable selfLog flag; extend training matcher →
  tournament reconciliation; `events_index` refs + `useEvents()` consumer + **events A/B/C**; observations/
  `pointFragments` per `MULTISOURCE_RECONCILIATION.md`). **BIGGEST cost; lower priority; adoption-gated.**
- **Stage 8 — Analytics: dependent/conditional moves** (corpus-level; future).

## 5. Reuse — DON'T reinvent (ground-truthed anchors)
`slotIds` = join key for ALL additive layers. §70 `*Meta` = provenance, extend not replace. QuickShotPanel
toggle = phase seam. `bumpStops` (§79) = secondary-move to generalize. `outcome/isOT/penalty` = end-state to
extend. `LivePointTracker` = intra-point time precedent to reuse. `selfReportMatcher` + `propagate*` + Stage-4 =
reconcile machinery to extend in Stage 7. `events_index` + `useEvents()` = wire, don't recreate.
`MULTISOURCE_RECONCILIATION.md` = Stage 7 design reference.

## 6. Interlock
events A/B/C + PPT picker + claim flow = **Stage 7 cluster** (NOT a blocker for scout-side 2–6, per D2).
Multi-tenancy (Phase 2/3) = the container. `ARCHITECTURE_C4.html` = target reconcile diagram (Stage 7).

## 7. Priority
- **P1:** Stage 1 ✅ → 2 (spine + end-state) → 3 (multi-scout reliability).
- **P2:** 4 (secondary moves) → 5 (time axis) → 6 (scrubber).
- **P3:** 7 (self-log/kiosk/observations + events A/B/C) → 8 (analytics).
