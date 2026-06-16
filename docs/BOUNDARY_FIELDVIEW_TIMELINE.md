# BOUNDARY — Field View shell ⟷ Point-as-Timeline (+ D4: fuller phase model)

> Canonical repo copy of the boundary authored 2026-06-16 (Opus), ratified by Jacek.
> Stops the two workstreams colliding on the phase dimension. Field View shell (Opus, new)
> and Point-as-Timeline (FINALIZED, D1-D3 LOCKED, Stage 2 complete) both touch "game phase."
> The decision record lives in `docs/POINT_AS_TIMELINE.md §8 + D4`; this is the long-form.
> **Status:** D4 RATIFIED 2026-06-16; boundary in force. Field View shell building (Phase A shipped on branch).

## 1. Who owns what

**Point-as-Timeline OWNS (do not redesign in Field View):**
- The phase MODEL on the capture side: stage-keyframes Break(#0) / Settle / Mid + End-from-any-stage.
- Storage: `point.timeline[]` additive keyframes keyed by `slotIds`; Break = keyframe #0 = existing `homeData/awayData`.
- The scout-capture stage-switcher "E" (merged top bar: start-side pill LEFT + E mini-timeline+playhead RIGHT, one row — vertical rejected, D-LOCKED). Shipped `50b925f0`.
- Reason radial (Settle/Mid only), per-stage notes + drawings via the ONE canonical draw.

**Field View shell OWNS (Opus, new):**
- The SHELL around the canvas: rail / collapsed-strip / pinned (semantic) / focus mode, unified across all 10 field views (only 4/10 on CanvasRailLayout today).
- The LAYER model (show/hide: players/shots/zones/bunkers/heatmap/drawings) with per-view defaults + semantic pinning.
- A `phaseControl` SLOT in the shell — the shell HOSTS a phase control, it does NOT define one. The slot is filled by whichever control the view's context needs.
- The 3 drawing-persistence targets as a contract: scoutNotes / coachNotes / tacticNotes (= updateAnnotations / updateScoutedTeam / updateLayoutTactic — already how it works).

**The seam — `phaseControl` is a black-box slot:**
- Scout-point (capture) view → slot filled by the Point-as-Timeline "E" switcher (capture-phase). Field View does NOT reimplement it.
- Coach views (Match-review, ScoutedTeam) → slot filled by the coach read-mode phase bar (DISTINCT from "E" per charter §3).
- Config-only views (LayoutDetail) → slot empty (`phaseControl: null`).
- Field View's job: define the slot's position/size/behavior in rail vs collapsed-strip vs focus mode — NOT what phase enum it carries.

## 2. D4 — Full phase model (RATIFIED 2026-06-16, Jacek GO)
Full game-phase axis: **Pre-Breakout → Breakout → Settle → Mid → Endgame** (with `inplay` = Mid+Endgame as a derived group; `alive/dead` = PLAYER STATUS, a separate dimension, NOT a phase — corrects the death-taxonomy conflation).
- **Today (D2/D3 capture):** Break / Settle / Mid + End — a SUBSET of the full axis (Break≈Breakout; Pre-Breakout + Endgame not captured yet).
- **D4:** the phase ENUM in the data model is the full ordered set `[preBreakout, breakout, settle, mid, endgame]`, even though capture UI exposes only a subset now. Views may want phases capture doesn't collect — e.g. animating movement Pre-Breakout → Breakout needs Pre-Breakout to EXIST in the model as an addressable phase.
- **Consequence:** `timeline[]` stage enum widens to the full set (additive — existing Break/Settle/Mid keyframes still valid; preBreakout/endgame become optional new keyframes). Readers tolerate phases they don't render. `phaseControl` slot is enum-agnostic, so the shell needs no change when the enum grows.
- **NOT in scope:** building Pre-Breakout/Endgame capture UI. D4 only reserves the model + naming so future view-side features have a phase to attach to.
- **Migration reality (CC-verified 2026-06-16):** only `'settle'`/`'mid'` are persisted in `timeline[]` (`MatchPage.jsx:1263`); D4 keeps both verbatim. `'break'` is never a timeline literal (= keyframe #0), so `break→breakout` is a UI-constant rename, not a migration. preBreakout/endgame are net-new. Near-zero migration either way; naming-lock = forward-correctness (a future explicit Break keyframe writes `stage:'breakout'` from day one).

## 3. What this unblocks
- ITEM-2 folded-rail opponent controls + ScoutedTeam-vs-Match phase-language unification are SUBSETS of the Field View shell — folded in, not ticketed separately.
- canvas-unify residual (Ballistics→InteractiveCanvas, FieldCanvas delete, DPR correctness) folds into the shell build (same gate).
- The Field View mockup (`docs/mockups/fieldview_matrix.html`, approved 2026-06-16) is drawn against this stable phase contract.

## 4. Decision record
D4 ratified (widen enum + lock full naming now, build capture later). Boundary section 1 + the `phaseControl` black-box seam in force. See `POINT_AS_TIMELINE.md §8 + D4` for the locked charter form and `CC_BRIEF_FIELDVIEW_SHELL_BUILD.md` for the build.
