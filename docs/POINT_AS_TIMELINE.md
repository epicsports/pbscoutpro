# Point as Timeline ("Punkt jako Oś czasu") — Workstream Charter & Backlog

> **Status:** FINALIZED — Stage 0 ground-truth (CC 2026-06-02) + decisions **D1–D3 LOCKED 2026-06-02**;
> **D4 (full phase axis + naming) RATIFIED 2026-06-16**; Field View shell boundary drawn (§8).
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

**Drawing system:** ONE canonical draw — `BaseCanvas` `drawMode` arbiter + render-only `DrawingOverlay` +
`DrawToolbar`; strokes are consumer-owned arrays (`drawStrokes.js`). **Legacy draw CONFIRMED (Stage 2 discovery):
TacticPage's own raw-pointer overlay canvas (`TacticPage.jsx:478-534`, strokes on `tactic.freehandStrokes`),
isolated, not entangled with anything Stage 2 touches → its retirement is a SEPARATE cleanup ticket, OUT of
Stage 2.** Stage 2 reuses ONLY the canonical draw.

**Capture seams:** QuickShotPanel break|obstacle toggle; `outcome` bottom step; bump; canonical draw.

## 2. Architecture decisions — LOCKED 2026-06-02
- **D1 — Tenancy → workspace-private.**
- **D2 — Augment, event-sourced (keyframe + deltas).** Existing atomic point = **keyframe #0** (preserved, read
  by all 28+ readers). Add additive timestamped delta layer referencing `slotIds`. State at T = keyframe +
  replay. NOT pure snapshot-chaining; NOT replacing `homeData/awayData`.
- **D3 — Self-log/kiosk are NOT prerequisites → Stage 7.** Scout-side timeline self-contained.
> **Consequence:** scout-side (Stages 2–6) does NOT depend on events A/B/C (→ Stage 7).
- **D4 — Full phase axis reserved + named (RATIFIED 2026-06-16, Jacek GO).** The phase ENUM is the full ordered
  set **`[preBreakout, breakout, settle, mid, endgame]`**, with **`inplay` = mid+endgame** as a derived group.
  **`alive`/`dead` = PLAYER STATUS, a separate dimension — NOT a phase** (corrects the death-taxonomy conflation).
  - **Capture today is a SUBSET** (Break/Settle/Mid + End). D4 widens the *model namespace*, NOT the capture UI.
    Building Pre-Breakout/Endgame capture is OUT of scope here — D4 only reserves the addressable phases so future
    view-side features (e.g. Pre-Breakout→Breakout movement animation, fuller replay) have a phase to attach to.
  - **Additive, near-zero migration (CC-verified 2026-06-16 against the persisted shape):** the only stage literals
    ever persisted in `point.timeline[]` are `'settle'`/`'mid'` (`MatchPage.jsx:1263` `STAGE_ORDER`, write/rehydrate
    `:1531`; merge `dataService.js:1133`) — **D4 keeps both names verbatim**. `'break'` is NEVER a `timeline[]`
    literal (it's keyframe #0 = `homeData/awayData`, transient capture-UI state only), so `break→breakout` is a
    UI-constant rename, not a data migration. `preBreakout`/`endgame` are net-new optional keyframes. → existing
    Break/Settle/Mid keyframes stay valid; readers tolerate phases they don't render.
  - **Naming-lock rationale = forward-correctness, not migration-avoidance:** locking now means any future explicit
    Break keyframe writes `stage:'breakout'` from day one (avoids a later `break`/`breakout` literal split).
  - **Shell-agnostic:** the Field View `phaseControl` slot is enum-agnostic, so widening the enum needs no shell change.

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
**UX (LOCKED 2026-06-02):** the stage-switcher is **BUILD-NEW** — a generic segmented (Stage 0/2 discovery:
**no tactic step-switcher exists**; closest idiom `QuickShotPanel.jsx:96-133`, none shared in `ui.jsx`). Rendered
as **"E" = a mini-timeline + playhead** at the TOP: 3 nodes left→right, Break (done ✓) · Settle (current, amber)
· Mid (pending), tap to switch. This is the SCOUT capture switcher (distinct from the coach OSTRZAŁ
Breakout/Post-break read-mode bar). **Merged top context bar** = start-side pill ("from LEFT ⇄", existing
MatchPage control) on the LEFT + the "E" switcher on the RIGHT, in **ONE row** (the vertical-row v1 was rejected).
**Reason menu = RADIAL, anchored on the player, gated to Settle/Mid only** (Break = implicit, no reason prompt);
auto-flip/clamp near canvas edges. Capture flow: place + run-outs + shots (Break) → switch Settle → move markers
/ change shots / mark hits (radial reason) → switch Mid → repeat → End from the bottom anytime.
**Storage = E1=(c) additive `point.timeline[]`:** ordered stage keyframes `{seq, stage:'settle'|'mid', home:{…},
away:{…}}` mirroring the `homeData/awayData` per-side shape, **keyed by `slotIds`**. **Break = keyframe #0 =
existing `homeData/awayData` — NOT duplicated into `timeline[]`.**
~~End-state extends `outcome` (forfeit + win-reason)~~ — **CANCELLED (Jacek 2026-06-02): the End sheet stays
as-is** (outcome/isOT/penalty/comment). Per-player survived/eliminated-when remains **DERIVED** from per-stage
hits when needed. The only End-sheet change shipped was a layout fix (full-width TEAM A | TEAM B winner row +
timeout/no-point below), not a data extension.

## 4. Backlog — stages (ground-truthed sizing; scout-first)
- **Stage 0 — Inventory** ✅ DONE. **Stage 1 — Lock D1–D3** ✅ DONE (2026-06-02).
- **Stage 2 — Stage-keyframes (+ reason)** ✅ **COMPLETE 2026-06-02.** 2a `50b925f0` (E mini-timeline switcher +
  merged top bar + additive `point.timeline[]` keyed by `slotIds` + per-stage capture/draw); 2b `3584f6c0` (radial
  reason menu Settle/Mid + `eliminationReasons` + smoke fixes); outcome-sheet layout `852b055a` (full-width
  TEAM A | TEAM B). **2c (forfeit + win-reason) CANCELLED.** Break = keyframe #0 (`homeData/awayData`) untouched throughout.
- **Stage 2.5 — Coach-report per-stage breakdown (NEAR-TERM, P1).** ⚠️ 2a/2b capture Settle/Mid keyframes +
  elimination reasons into `point.timeline[]`, but the coach report (`generateInsights.js` / `ScoutedTeamPage`)
  reads ONLY `homeData/awayData` (keyframe #0) → **the new data is captured-but-INVISIBLE** (same trap as the
  earlier callout-zones-with-no-view). Stage 2.5 = the coach-side CONSUMER: a per-stage breakdown in the report +
  render Settle/Mid positions/shots on the heatmap (reuse the OSTRZAŁ mode-group / `hmPhase` idiom). **Per-SOURCE**
  breakdown (scout vs self-log vs kiosk) stays **Stage 7** — this is per-STAGE only.
- **Stage 3 — carry `timeline[]` through the two-side merge — ✅ DONE 2026-06-05** (`mergeStreamTimelines`,
  `endMatchAndMerge`). **REFRAME (Jacek + `CONCURRENT_SCOUTING.md`):** concurrent scouting = per-coach streams, each
  scout watches ONE side (different opponents); the end-match merge (NOT point-close — the chess-model shared-doc was
  retired Apr 2026) combines **home-side (home-scout) + away-side (away-scout)** into the canonical doc. This is a
  per-side **UNION, not consensus/dedup** — the two sides never overlap, nothing to reconcile. Discovery found the
  merge combined `homeData/awayData` per-side correctly but **dropped `timeline[]`** → each side's Settle/Mid
  keyframes were lost on consolidation. Fix: union `timeline[]` per stage at the combine site — home sub-object from
  the home-scout's keyframe + away from the away-scout's (keyed by `slotIds`), mirroring kf#0; the 3-vs-1 case (one
  scout 3 stages, other 1) carries each captured side, other null. **Out of scope (held):** index-pairing rebuild
  (the per-coach-stream pairing is the deliberate offline-safe design — untouched); consensus/conflict-resolution
  (two sides don't overlap); backfill (no real 2-scout historical data — test-only, forward fix only). Solo/legacy
  points already kept `timeline[]` (canonical-in-place). e2e: `concurrent-merge.spec.js` extended (3-vs-1 carry).
- **Stage 4 — Typed move-sequence** (generalize `bumpStops`; the move vocabulary: hop/stretch/continuous;
  references `slotIds`).
  **── Stage 4 design (2026-06-05 — discovery + Opus/Jacek decisions; build PARKED pending the two gates below) ──**
  - **Discovery findings:** `bumpStops[i]` = per-slot `{x,y,curve}` secondary move (drag-START → `players[i]` END),
    **UNTYPED**, on kf#0 + every Settle/Mid keyframe side (`pointFactory.baseSide`). Settle/Mid keyframes capture
    position deltas per stage but **no move type** → typing is **net-new** (no `hop`/`stretch`/`continuous`/`moveType`
    enum anywhere; `eliminationReasons` is the only existing per-slot vocabulary). `bumpStops` *existence* is already
    consumed (`coachingStats` lateBreak, `generateInsights` latePoints + break positions, `drawPlayers` arrows + §79
    shot origin) — only the move TYPE is new.
  - **Model A — LOCKED.** Typed move = a per-slot `moveTypes[i]` enum array on each keyframe side, parallel to
    `eliminationReasons[i]`, keyed by `slotIds`. Types the Settle/Mid stage-relocation. **NOT model C** (a separate
    `moves[]` sequence) — its expressiveness (timestamped / multi-move / conditional) is deferred to Stage 5 (time
    axis) / Stage 8 (conditional moves); don't front-run.
  - **Capture — extend `ReasonRadial`** (the Stage 2b radial idiom, `ELIM_REASONS`): a radial on the slot picks the
    move-type, Settle/Mid only. No new control. (Two-axis interaction with `eliminationReasons` to be worked out in the
    build brief.)
  - **Consumer — LOCKED** (avoids the 2.5 captured-but-invisible trap): a coach **per-stage move-type breakdown**
    (extend the 2.5 per-stage tables). Heatmap arrow-color-by-type = optional nice-add.
  - **🔴 OPEN GATES — build PARKED until BOTH resolve:**
    1. **Vocabulary** — deferred to FIT returning with details (Jacek 2026-06-05). Provisional: "change shot
       direction" is a **shot-axis, NOT a move type**.
    2. **Bump-typing (model B)** — whether to ALSO type the §79 `bumpStops` secondary move, vs only the
       stage-relocation (A). Jacek to-decide.
- **Stage 5 — Time axis** (timer on first-player-placed + timestamped delta-events; reuse `LivePointTracker`;
  populate the delta layer). Continuous time WITHIN/ACROSS stages.
- **Stage 6 — Scrubber + optional auto-play replay animation** (Jacek 2026-06-02 — the "E" mini-timeline grows
  into a full scrubber; play button animates keyframe→keyframe).
- **Stage 7 — Self-log + kiosk + cross-source unification** (re-enable selfLog flag; tournament reconciliation;
  `events_index` + `useEvents()` + events A/B/C; observations per `MULTISOURCE_RECONCILIATION.md`). BIGGEST;
  lower priority; adoption-gated.
- **Stage 8 — Analytics: dependent/conditional moves** (corpus-level; future).

> **Cross-cutting — offline-write durability (own reliability check, NOT a timeline stage).** Stage 2 inherits
> current Firestore offline behavior **unchanged**. Whether offline persistence is enabled and whether writes
> queue + flush on reconnect is **UNVERIFIED — do not assume**; schedule a dedicated CC discovery. Context: venue
> WiFi reliability + prior RESOURCE_EXHAUSTED / read-volume concerns. (`SCOUTING_CONCURRENCY_AND_CACHE.md` claims
> the SDK queue covers commit-during-drop, but it's a doc claim, not a verified test.)

## 5. Reuse — DON'T reinvent (ground-truthed anchors)
`slotIds` = join key for ALL additive layers. §70 `*Meta` = provenance, extend not replace. `eliminations/
eliminationPositions` = extend with `reason`. `bumpStops` (§79) = generalize to move-sequence. `outcome/isOT/
penalty` = extend for end-state. **Canonical draw = the ONE draw system, reuse per-stage via consumer-owned
`strokesByStage[stage]` (ZERO refactor).** **Top stage-switcher = BUILD-NEW generic segmented** (no tactic
switcher exists; extract from `QuickShotPanel:96-133` idiom). **Legacy TacticPage draw (`TacticPage.jsx:478-534`,
`tactic.freehandStrokes`) = SEPARATE retirement ticket, OUT of Stage 2 — do not touch.** `LivePointTracker` =
time precedent (Stage 5). `selfReportMatcher`/`propagate*`/
Stage-4 = reconcile machinery (Stage 7). `events_index`/`useEvents()` = wire, don't recreate.

## 6. Interlock
events A/B/C + PPT picker + claim flow = Stage 7 cluster (NOT a blocker for 2–6). Multi-tenancy = container.
`ARCHITECTURE_C4.html` = target reconcile diagram (Stage 7).

## 7. Priority
- **P1:** Stage 1 ✅ → 2 ✅ (stage-keyframes + reason) → **2.5 (coach-report per-stage breakdown — captured-but-
  invisible today; NEXT)** → 3 (multi-scout reliability, incl. `timeline[]` reconcile).
- **P2:** 4 (typed moves) → 5 (time axis) → 6 (scrubber).
- **P3:** 7 (self-log/kiosk/observations + events A/B/C) → 8 (analytics).
- **Cross-cutting (any time):** offline-write durability discovery (unverified; own reliability check).

## 8. Boundary — Field View shell ⟷ Point-as-Timeline (2026-06-16, Jacek nod)
The Field View shell (Opus, new) and this workstream both touch "game phase." The line, so neither redesigns the other:

**Point-as-Timeline OWNS (Field View does NOT redesign):** the capture-side phase MODEL (stage-keyframes per §3
+ D4 enum); storage (`point.timeline[]` additive keyframes keyed by `slotIds`; Break = kf#0 = `homeData/awayData`);
the scout-capture **"E"** stage-switcher (`50b925f0`, merged top bar — start-side pill LEFT + E mini-timeline RIGHT,
one row, vertical rejected); the reason radial (Settle/Mid only) + per-stage notes/drawings via the ONE canonical draw.

**Field View shell OWNS (Opus):** the SHELL around the canvas (rail / collapsed-strip / pinned-semantic / focus,
unified across all 10 field views — only 4/10 on CanvasRailLayout today); the LAYER model (show/hide
players/shots/zones/bunkers/heatmap/drawings + per-view defaults + semantic pinning); the 3 drawing-persistence
targets as a contract (scoutNotes=`updateAnnotations` / coachNotes=`updateScoutedTeam` / tacticNotes=`updateLayoutTactic`).

**The seam — `phaseControl` is a black-box SLOT** the shell HOSTS but does NOT define:
- Scout-point (capture) view → slot = the Point-as-Timeline **"E"** switcher. Field View does NOT reimplement it.
- Coach views (Match-review, ScoutedTeam) → slot = the coach read-mode phase bar (DISTINCT from "E" per §3).
- Config-only views (LayoutDetail) → `phaseControl: null` (slot empty).
- Field View defines the slot's position/size/behavior across rail vs collapsed-strip vs focus — NOT the phase enum it carries.

**Folds into the Field View shell build brief (not separate tickets):** ITEM-2 folded-rail opponent controls;
ScoutedTeam-vs-Match phase-language unification; canvas-unify residual (Ballistics→InteractiveCanvas, FieldCanvas
delete, DPR correctness — same gate). These are SUBSETS of the shell. (Cross-ref `FIELD_VIEW_INVENTORY.md`.)
