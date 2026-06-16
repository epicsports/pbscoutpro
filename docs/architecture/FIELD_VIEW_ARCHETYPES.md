# Field View Archetypes — CANON (ratified 2026-06-16, Jacek)

> **There are TWO legitimate field-view archetypes. This is a deliberate design choice, NOT
> tech debt.** A field view (a screen whose subject is the paintball field canvas) is EITHER
> rail-native OR §76 immersive depending on its job. Editors do **not** migrate to the rail —
> immersive is their *correct* archetype. Pointers: shipped detail in `DEPLOY_LOG.md`
> (2026-06-16 Field View entries); wiring/triage reasoning in `FIELD_VIEW_GLUE_ASSESSMENT.md`;
> shell↔Point-as-Timeline boundary in `POINT_AS_TIMELINE.md §8`.

## The two archetypes

### 1. RAIL-NATIVE — `CanvasRailLayout` (§113 / §116 + Field View shell slots)
**For: review / coach / scout / stats views** — you READ the field (or capture onto it) while
also needing persistent side controls + report content.
- **Landscape:** field = HERO (100% height), controls/report in a residual **rail**; on cramped
  tablet-landscape the rail **collapses to a 56px strip** + transient overlay (§116).
- **Shell slots** (`src/components/canvas/CanvasRailLayout.jsx`): `phaseControl` (floating
  `FieldPhaseControl` top-right), `fieldTools` (floating icons), `primaryAction` (floating
  bottom-right landscape / bottom bar portrait), structured `rail` zones (`RailZones.jsx`:
  segment = pick-one, toggle-list = on/off incl. per-team A|B, item-list = select), and
  `collapsed.pins` (semantic layer pins). Per-view contract: `fieldViewConfig.js`.
- **Members (DONE — consistent):**
  - **Match-review** (`MatchPage.jsx`, review mode) — wired.
  - **ScoutedTeam** (`ScoutedTeamPage.jsx`) — wired.
  - **PlayerStats** (`PlayerStatsPage.jsx`) — already compliant (report-column rail; no phase/
    layer controls to wire — hardcoded heatmap layers).
  - **Hitability** (`HitabilityPage.jsx`) — already compliant (config/track/sum `collapsed.tabs`).

### 2. §76 IMMERSIVE — `useLandscapeMode`
**For: EDITORS** — you EDIT the field geometry/setup and want the maximum uninterrupted canvas;
controls are transient, not a permanent rail.
- **Landscape (or portrait-FS):** header hidden, **full-bleed canvas**, **floating edge-tab
  controls**, **auto-save** (debounced) — no rail, no persistent side panel.
- **Members (stay immersive — do NOT migrate to rail):**
  - **LayoutDetail** (`LayoutDetailPage.jsx`) — layout config: zones / lines / names + tactics.
  - **TacticPage** (`TacticPage.jsx`) — per-phase player setup + draw.
- **Why not the rail:** an editor's value is the unobstructed canvas + direct manipulation; a
  permanent rail would steal canvas space from the exact task. Immersive is the right frame.

## Not field views (no archetype migration)
- **BunkerEditor** (`BunkerEditorPage.jsx`) — plain canvas + bottom-sheet naming + save. No rail
  content. Stays plain. (super-admin global-base editor.)
- **Ballistics** (`BallisticsPage.jsx`) — plain query view: canvas + status line. No rail
  content. Stays plain. (Carries the dormant `FieldCanvas→InteractiveCanvas` swap as a separate
  canvas-class cleanup, not an archetype migration.)
- **TrainingResults** (`TrainingResultsPage.jsx`) — a results **dashboard** (the heatmap is one
  section among overrides / bunker-breakdown / matchup-history). Report-primary, NOT a field view.

## The decision rule (use this for any NEW field view)
1. Is the field the *subject* and does the view need **persistent side controls / report**?
   → **RAIL-NATIVE** (`CanvasRailLayout` + the shell slots).
2. Is it an **editor** (direct field manipulation, wants max canvas, transient controls)?
   → **§76 IMMERSIVE** (`useLandscapeMode`).
3. Is the field just one **section** of a scroll/report page? → **not a field view** (plain page).
4. Bare canvas + a single status/save bar, no side content? → **plain page** (neither archetype).

**Anti-pattern:** forcing an editor onto the rail (steals canvas), or a dashboard onto the rail
(breaks the report). Pick the archetype by the view's JOB, not for uniformity's sake.

## Status
- Field View shell archetype + the rail-native family: **COMPLETE & consistent.**
- **Phase C CLOSED** (2026-06-16) — editors ratified as immersive (not migrations); plain/dashboard
  views excluded.
- **Future (separate brief, not now):** Scout-point capture — currently a bespoke stacked/immersive
  flow; a deliberate structural migration if/when it should adopt rail-native (highest-risk; the
  PaT "E" capture switcher is §8-owned regardless).
