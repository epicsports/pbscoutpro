# Field View Inventory — raw material for the unified Field View contract

> Read-only inventory (TRACK 3, 2026-06-16) feeding Opus's Field View archetype contract
> (shell: rail / collapsed-strip / pinned icons / focus mode across all field views).
> NO code changed. Anchors are `file:line` at HEAD `0f13ba39`.

## Canvas component split (the inconsistency root)
- **`InteractiveCanvas`** (`src/components/canvas/InteractiveCanvas.jsx`) → wraps **`BaseCanvas`**. The live core. 4 interactive consumers: BunkerEditor, LayoutDetail, Tactic, Match.
- **`FieldCanvas`** (`src/components/FieldCanvas.jsx`) — legacy, **one consumer left: BallisticsPage**. Marked in-source "Opus territory, off-limits to this refactor" (`InteractiveCanvas.jsx:29-34`).
- **`HeatmapCanvas`** — view-only heatmaps (TrainingResults, PlayerStats, ScoutedTeam, ScoutDetail). Phase-2, out of scope here.
- **`AnalyticsCanvas`** — LayoutAnalytics density/clusters.
- **`HitabilityCanvas`** — Hitability config/track.
- **`CanvasRailLayout`** — responsive portrait-stack ↔ landscape-rail-collapse shell; used by 4 views (Match, ScoutedTeam, PlayerStats, Hitability). The other 6 field views pre-decide layout per page → the inconsistency the contract must unify.

---

## 6 views NOT on CanvasRailLayout (the inconsistency source)

| View | File | Header | Toggles (show*/layer) | Tools | Draw fns called | DrawingOverlay + persist |
|---|---|---|---|---|---|---|
| **BunkerEditor** | `pages/BunkerEditorPage.jsx` (canvas `:212`) | `PageHeader` (back, title, subtitle) | none (full-height editor) | tap-place bunker · bottom-sheet name/type · drag-nudge position · drag-nudge label offset | drawField, drawBunkers | No |
| **LayoutDetail** | `pages/LayoutDetailPage.jsx` (canvas `:540`) | `PageHeader` (back, title, league/year badges, menu) + portrait toolbar (Aā/½/═/◇) + immersive left-edge tabs (landscape) | `showLabels` · `showHalf` · `showLines` · `showZones` | drag disco/zeeker handles · tap bunker→BunkerCard · zone draw/edit (polygon+vertex) · callout 2-pt line draw · rename | drawField, drawZones, drawBunkers, callout lines, labels | No |
| **Tactic** | `pages/TacticPage.jsx` (canvas `:468`) | `PageHeader` (back, title, subtitle=layout) + immersive floating controls | none in bar (full-height) | tap-place player · drag-move · double-tap-drag bump · tap-shoot · toolbar ◀/▲/🎯/⌒/✕ · draw mode ✏️ + DrawToolbar | drawField, drawPlayers, drawBumpStops, drawShots, drawQuickShots, drawBunkers(off) + legacy freehand | **Yes** — `DrawingOverlay` (`:510`); persist `updateLayoutTactic(…, freehandStrokes)` (`:193`) |
| **Ballistics** | `pages/BallisticsPage.jsx` (canvas `:92`, **FieldCanvas**) | `PageHeader` (back, title, subtitle: tap/free-point/from-bunker) + status bar (computing/channels/ready) | none | tap field→place shooter (live) · tap bunker→visibility query | drawField, drawBunkers(highlight), drawPlayers(shooter) + visibility overlay | No |
| **LayoutAnalytics** | `pages/LayoutAnalyticsPage.jsx` (**AnalyticsCanvas**) | `PageHeader` (back, mode label, layout name) | scope pills (tournament/match/point — Stage-3 filter) | tap heatmap→skull/shooter cross-filter (Stage 6) + 22px hit-test | drawField, drawDensity, drawSkullClusters, drawShooterMarkers, drawConnectionLinks | No |
| **TrainingResults** | `pages/TrainingResultsPage.jsx` (**HeatmapCanvas**) | `PageHeader` (back, 'Results', subtitle=date) | `sourceFilter` pills (all/scout/coach/player) → filter heatmapPoints | none (view-only) | drawField, drawPlayers(mirrored), drawShots, drawZones(danger/sajgon), drawEliminationMarkers | No |

---

## 4 views ON CanvasRailLayout — what each pins to `collapsed` today

| View | File | Header (portrait) | Rail content (landscape) | `collapsed` config | Tools / drawing |
|---|---|---|---|---|---|
| **Match** | `pages/MatchPage.jsx` (canvas `:2637`) | `PageHeader` (title centered, live/final badges) + stage-side bar (pill + "E" stage-switcher) | scoreboard + points column (list/annotations/notes) | `{ tabs: [], count: null, onBack }` | full scouting: place/drag-bump/shoot + ShotDrawer + QuickShotPanel + ReasonRadial; draw mode DrawingOverlay+DrawToolbar. Persist: `updatePoint` (homeData/awayData) + `updateAnnotations` (strokesToFirestore, `:1749`) |
| **ScoutedTeam** | `pages/ScoutedTeamPage.jsx` | `PageHeader` (title, subtitle, menu) | scope pills + sections (Formation/Breaks/Counters/Self-reports) | `{ tabs: [], count: null, onBack }` | coach-plan heatmap (view-only); draw mode DrawingOverlay+DrawToolbar. Persist: `updateScoutedTeam(annotations)` (`:452`) |
| **PlayerStats** | `pages/PlayerStatsPage.jsx` | `PageHeader` (title=player, subtitle=season) | report column (Outgoing/Breakout/Zones/Trends/Cold Review) | `{ tabs: [], count: null, onBack }` — tab-less → generic ☰ expand | heatmap view-only; no drawing |
| **Hitability** | `pages/HitabilityPage.jsx` | (none in landscape) | rail tab row: config (⚙) / track (✛) / sum (📊) + count badge | `{ tabs: [{key,icon,active,onSelect}], count: {value,label}, onBack }` — **only tabbed rail** | config: place player/target, drag, long-press editor; track: tap target→commit hit + attribution; sum: view-only |

**Pinned-slot reality:** only **Hitability** populates `collapsed.tabs` + `count` today. Match/ScoutedTeam/PlayerStats pass empty `tabs` + null `count` (rail shows just back-affordance / generic expand). → the contract has only ONE worked example of a populated collapsed strip to generalize from.

---

## Cross-cutting patterns (contract candidates)
1. **Header:** every field view uses `PageHeader`; immersive/landscape hides it for floating controls. LayoutDetail's vertical left-edge tabs are the lone outlier.
2. **Draw pipeline order (universal):** `drawField → drawZones → drawAnalytics → [drawPlayers/drawQuickShots/drawBunkers] → freehand(DrawingOverlay) → HUD(toolbar/loupe) → calibration → loupe`.
3. **Toggles:** portrait → inline toolbar/section pills; landscape immersive → edge strips (LayoutDetail) or rail tabs (Hitability).
4. **DrawingOverlay persistence (3 sites):** always `strokesToFirestore()` → an `update*()`. Render component is persistence-agnostic; caller owns the write. Paths: Tactic→`updateLayoutTactic`; Match→`updateAnnotations`/`updatePoint`; ScoutedTeam→`updateScoutedTeam`.
5. **Layer canon for the collapsed strip:** the user-toggleable layers that exist today are `labels · half · lines · zones` (LayoutDetail), shots/players (implicit per-view), source-filter (TrainingResults), scope (Analytics). These are the candidate pin set.

_Pairs with `CONTROL_LANGUAGE_INVENTORY.md` (control-language) + `CANVAS_MERGE` discovery (§ below in DEPLOY_LOG)._
