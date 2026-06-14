# Discovery — Drawing-tools unification (ITEM 1, read-only, 2026-06-14)

**Status:** read-only discovery → verdict for Opus/Jacek to sequence into a build brief. No code changed.
**Ask (Jacek):** coach team-summary has a good NEW drawing tool; layout-tactics has an OLDER different one. Want ONE canonical drawing component — the coach-summary one promoted, layout-tactics consuming it. Discovery-first because the DATA MODELS may differ.

---

## The two tools

### A. Coach team-summary — the NEWER, shared-infra tool (canonical)
- **Where:** `src/pages/ScoutedTeamPage.jsx` ("Rysuj" / "Plan coacha"), rendered over `HeatmapCanvas`.
- **Stack (all SHARED):** `src/components/canvas/DrawingOverlay.jsx` (render-only overlay) + `BaseCanvas` draw-arbiter (1-finger draw / 2-finger zoom, PencilKit model) + `src/components/canvas/drawStrokes.js` (serialize / paint / erase) + `src/components/canvas/DrawToolbar.jsx`.
- **Toolset:** freehand (`perfect-freehand`), **5 colors, 3 sizes, eraser, undo/redo, clear**. Stroke shape `{ color, size, pts:[{x,y}] }`, coords 0..1 native.
- **Data model:** **persisted** as a single `annotations` field on the scouted-team doc — `workspaces/{ws}/tournaments/{tid}/scouted/{scoutedId}.annotations` (Firestore map `{"0":stroke,...}`). **Scope:** per-scouted-team, tournament-scoped, workspace-private; live-synced (re-loads on remote change). It is ONE annotation layer per team — not named, not listable.

### B. Layout-tactics — the OLDER, independent tool
- **Where:** `src/pages/TacticPage.jsx` (routes `/layout/:layoutId/tactic/:id` and `/tournament/:tid/tactic/:id`).
- **Stack (NONE shared):** own overlay `<canvas>` (`freehandCanvasRef`), raw `onPointerDown/Move/Up`, manual 2D `redrawStrokes()`, **inline** `strokesToFirestore`. Does NOT import DrawingOverlay/drawStrokes/DrawToolbar.
- **Toolset:** freehand ONLY — hardcoded amber, fixed width, **no colors/sizes/eraser/undo**. Stores **points only** (drops the `{color,size}` the canonical shape carries — schema drift).
- **Data model:** the freehand is ONE field (`freehandStrokes`) on a first-class **tactic OBJECT** that also holds `players[]`, `shots`, `bumps`, `squadCode`, `name`. **Two stores:** layout-level `workspaces/{ws}/layoutOverlays/{layoutId}/tactics/{id}` (reusable across tournaments) AND tournament-level `workspaces/{ws}/tournaments/{tid}/tactics/{id}`. Separate `addLayoutTactic`/`addTactic` + `useLayoutTactics`/`useTactics` (a pre-existing two-store consolidation debt). **Rich features the coach tool lacks:** named, listable (multiple per layout), create/rename/duplicate/delete, squad filter, print, layout-level reuse, full play-editor (players/shots/bumps placement).

### Shared-infra context
Canvas consolidation is ~90% (`docs/architecture/CANVAS_ARCHITECTURE.md`, DESIGN_DECISIONS §64). `DrawingOverlay` is the canonical drawing layer (used by ScoutedTeamPage + MatchPage). TacticPage is the last drawing holdout — and there's an EXISTING registered ticket "**[FUTURE] Tactic → DrawingOverlay unify**" (NEXT_TASKS), deferred 2026-05-24 "no urgency".

---

## Verdict

**Split the ask into the COMPONENT and the DATA MODEL — they are separable, and only the component should unify.**

- **Component unification = Tier 1 (pure-UI propagation).** Point TacticPage's freehand at the coach-summary's shared stack (`DrawingOverlay` + `BaseCanvas` arbiter + `drawStrokes` helpers + `DrawToolbar`), deleting its bespoke canvas + inline serializer. This is exactly the registered "[FUTURE] Tactic → DrawingOverlay unify" ticket. It gives tactics the better freehand UX (colors/sizes/eraser/undo) and removes duplicated canvas code. Matches Jacek's framing ("coach-summary promoted, layout-tactics consuming"). **Low risk; ~1 screen.**

- **The DATA MODELS should NOT merge — and don't need to.** They persist different concepts: an **annotation layer** (one `annotations` blob per scouted team) vs a **named play-object** (a tactic with players/shots/bumps, listable + reusable). Sharing the drawing COMPONENT does not require merging persistence — each surface keeps its own field (`annotations` vs `freehandStrokes`); both already use the same `{color,size,pts}` stroke shape. **So there is NO Tier-2 data-model-reconciling redesign required for the drawing-tool unification.** (Jacek's worry — "unifying the data model may not be easy" — resolves to "don't; they're different objects.")

- **One small additive migration inside Piece A:** TacticPage freehand currently stores points-only; adopting `DrawToolbar` adds `{color,size}` per stroke. Forward-compatible (paint defaults amber/width when absent) — no `--live` migration.

- **Orthogonal, separate ticket (NOT part of this):** the tactics **two-store consolidation** (layout-level vs tournament-level `tactics`, dual hooks/CRUD, `freehandStrokes` missing from `addLayoutTactic`). Real debt, but independent of the drawing-component unification — size it on its own.

### Recommendation
Opus issues a **Tier-1 brief** = "TacticPage adopts the shared DrawingOverlay/DrawToolbar/drawStrokes stack" (the canonical coach-summary component), additive color/size on `freehandStrokes`, H0 pixel-diff on the tactic canvas where unchanged. Keep the data models separate. File the tactics two-store consolidation as its own backlog ticket. No mockup needed (UI is the already-shipped coach toolbar); no Jacek architecture decision required beyond GO.

---
_Pairs with DESIGN_DECISIONS §64 (canvas unification) + the "[FUTURE] Tactic → DrawingOverlay unify" ticket + `docs/architecture/CANVAS_ARCHITECTURE.md`._
