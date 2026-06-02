# Point as Timeline ("Punkt jako Oś czasu") — Workstream Charter & Backlog

> **Status:** FINALIZED — Stage 0 ground-truth (CC 2026-06-02) + decisions **D1–D3 LOCKED 2026-06-02**.
> v2 (2026-06-02): folded in Jacek's detailed phase/UX description. Lives in repo as
> `docs/POINT_AS_TIMELINE.md`. **Single reference** for this workstream — read first; don't re-invent.

## 0. Goal
Expand point scouting from today's 2 phases (break + obstacle) toward the **full point lifecycle**, ultimately
a **time axis** (timestamped events + scrubber). Direction reuses the 2026-04-30 event-sourced sketch as
*target*, but per Stage 0 that model is mostly paper — so we **augment what exists**, scout-first.

## 1. Current state — GROUND TRUTH (CC Stage 0, 2026-06-02)
**Reconcile model = mostly PAPER.** Shipped, narrow only: §70 provenance metadata
(`playersMeta/shotsMeta/eliminationsMeta` + per-slot `slotIds` UUIDs, `MatchPage.jsx:1072-77`) +
**training-only** self-report matcher (`selfReportMatcher` → `propagateMatchup`) + Stage-4 override/dismiss (no
review UI). **No `observations` collection** (`pointFragments` = backlog, `MULTISOURCE_RECONCILIATION.md`).
Insight readers (`coachingStats.js`/`generateInsights.js`) read **ONLY** `point.homeData/awayData`.

**Point = atomic snapshot, NOT a sequence.** Persisted `makeTeamData()` (`MatchPage:1061-80`) →
`assignments/bumpStops/eliminations/eliminationPositions` + `*Meta` + `slotIds` + `scoutedBy` + `fieldSide`.
Top-level: `homeData/awayData`, `outcome` (win_a|win_b|pending|null), `isOT`, `penalty`, `comment`, `annotations`,
`status`, `order`, timestamps, merge fields.
- **Break vs obstacle = field-name split, NO phase enum.** **End-state = ONLY `outcome`+`isOT`+`penalty`** (no
  forfeit, no win-reason, no per-player survived/eliminated-when). **Secondary-move = ONLY `bumpStops`** (§79).
  **Timestamps = point-level only** (exception: QuickLog `LivePointTracker` — QuickLog-only).
- **Eliminations** carry position (`eliminationPositions`) but **NO reason taxonomy.**

**Sources:** scout points workspace-private (`workspaces/{ws}/.../points/{pid}`, auto-IDs). Self-log + Kiosk
**GATED OFF** (`featureFlags.js:43`). Tournament = no cross-source merge. Multi-scout = positional index-pairing
(NOT consensus) → desync = corruption risk. `events_index` exists, `useEvents()` ZERO consumers, no point refs.

**Drawing system:** ONE canonical draw ("Rysuj" on heatmap/layout) used everywhere. **A LEGACY draw system may
linger in TacticPage — to be located + retired/avoided (Stage 2 discovery), per Jacek.** [confirm]

**Capture seams:** QuickShotPanel break|obstacle toggle; `outcome` bottom step; bump; canonical draw.

## 2. Architecture decisions — LOCKED 2026-06-02
- **D1 — Tenancy → workspace-private.**
- **D2 — Augment, event-sourced (keyframe + deltas).** Existing atomic point = **keyframe #0** (preserved, read
  by all 28+ readers). Add additive timestamped delta layer referencing `slotIds`. State at T = keyframe +
  replay. NOT pure snapshot-chaining; NOT replacing `homeData/awayData`.
- **D3 — Self-log/kiosk are NOT prerequisites → Stage 7.** Scout-side timeline self-contained.
> **Consequence:** scout-side (Stages 2–6) does NOT depend on events A/B/C (→ Stage 7).

## 3. Target spine (per D2, refined with Jacek's phase/UX model 2026-06-02)
**Stages = bounded keyframes** (the keyframe-per-stage realization of D2; continuous timestamped delta-events
deferred to Stage 5):
- **Break (required) = keyframe #0** — today's point: placement + run-outs (`runners`) + shots; ~first 5–7s
  (crouches/slides, moves, eliminations).
- **Settle (optional)** = keyframe #1 — change shot direction, hops (`przeskok`), stretch to another bunker
  (`rozciągnięcie`), continuous move (`ciągły ruch`); eliminations w/ reason.
- **Mid (optional)** = keyframe #2 — further moves + hits w/ reason.
- **End** = result / time-out / OT flag / penalty — **stays at the BOTTOM, available from ANY stage; Settle/Mid
  are NOT required to end a point.**
**Per-stage capture:** positions, shots, **eliminations + REASON** {przejście · kara · gunfight · przeszkoda ·
nie wiadomo}, **typed notes**, **drawings** — notes & drawings are **per-stage** and use the **ONE canonical
draw system** (retire any legacy tactic draw).
**UX:** stage-switcher (Break/Settle/Mid) is a **distinct element at the TOP** (candidate: reuse the
tactic-planning step switcher — confirm in discovery); this is the SCOUT capture switcher (distinct from the
coach OSTRZAŁ Breakout/Post-break read-mode). Capture flow: place + run-outs + shots (Break) → switch Settle →
move markers / change shots / mark hits → switch Mid → repeat → End from the bottom anytime.
End-state **extends** `outcome` (add forfeit "ręcznik" + win-reason + per-player survived/eliminated-when/how).

## 4. Backlog — stages (ground-truthed sizing; scout-first)
- **Stage 0 — Inventory** ✅ DONE. **Stage 1 — Lock D1–D3** ✅ DONE (2026-06-02).
- **Stage 2 — Stage-keyframes + end-state** ← NEXT. **Re-sized MEDIUM-LARGE** (not just a toggle): top
  stage-switcher (confirm reuse tactic's) · optional Settle/Mid keyframes (move/shoot/hit+**reason**/notes/
  drawings per stage via canonical draw) · End always-available at bottom · extend `outcome`
  (forfeit/OT/result/penalty). Additive on keyframe #0. **Biggest near-term value.**
- **Stage 3 — Multi-scout reliability** (harden positional index-pairing; several scouts @ tournament).
- **Stage 4 — Typed move-sequence** (generalize `bumpStops`; the move vocabulary: hop/stretch/continuous;
  references `slotIds`).
- **Stage 5 — Time axis** (timer on first-player-placed + timestamped delta-events; reuse `LivePointTracker`;
  populate the delta layer). Continuous time WITHIN/ACROSS stages.
- **Stage 6 — Scrubber / replay UI.**
- **Stage 7 — Self-log + kiosk + cross-source unification** (re-enable selfLog flag; tournament reconciliation;
  `events_index` + `useEvents()` + events A/B/C; observations per `MULTISOURCE_RECONCILIATION.md`). BIGGEST;
  lower priority; adoption-gated.
- **Stage 8 — Analytics: dependent/conditional moves** (corpus-level; future).

## 5. Reuse — DON'T reinvent (ground-truthed anchors)
`slotIds` = join key for ALL additive layers. §70 `*Meta` = provenance, extend not replace. `eliminations/
eliminationPositions` = extend with `reason`. `bumpStops` (§79) = generalize to move-sequence. `outcome/isOT/
penalty` = extend for end-state. **Canonical draw ("Rysuj") = the ONE draw system, reuse per-stage; locate +
RETIRE any legacy TacticPage draw.** **Tactic-planning step switcher = candidate to reuse for the top
stage-switcher (confirm).** `LivePointTracker` = time precedent (Stage 5). `selfReportMatcher`/`propagate*`/
Stage-4 = reconcile machinery (Stage 7). `events_index`/`useEvents()` = wire, don't recreate.

## 6. Interlock
events A/B/C + PPT picker + claim flow = Stage 7 cluster (NOT a blocker for 2–6). Multi-tenancy = container.
`ARCHITECTURE_C4.html` = target reconcile diagram (Stage 7).

## 7. Priority
- **P1:** Stage 1 ✅ → 2 (stage-keyframes + end-state) → 3 (multi-scout reliability).
- **P2:** 4 (typed moves) → 5 (time axis) → 6 (scrubber).
- **P3:** 7 (self-log/kiosk/observations + events A/B/C) → 8 (analytics).
