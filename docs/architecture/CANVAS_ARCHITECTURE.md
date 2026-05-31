# Canvas Architecture — Full Map (as-built)

> **Status:** AS-BUILT map of the consolidated canvas system. Verified against the working
> tree at main HEAD `a0ccb2ac` (2026-05-31). Every claim cites `file:line`.
>
> **Supersedes** the 2026-05-19 Phase-0 migration *plan* that previously occupied this file
> (that version described the pre-consolidation world — three coexisting canvases incl. the
> now-deleted `FieldView.jsx` — and the *intended* BaseCanvas target. Git history preserves
> it). The as-built decisions also live scattered in `DESIGN_DECISIONS.md § 64` + ship-notes
> § 76/77/78/80/81/86 + archived `CC_BRIEF_CANVAS_STEP{2,4,5}_*.md`. This doc is the single
> consolidated source.

---

## 0. TL;DR

- **Shared layer** = `src/components/canvas/`: `BaseCanvas` (infrastructure + gesture/transform
  host) + specialized children `InteractiveCanvas` (interactive scouting) and a composable
  `DrawingOverlay` (freehand). `HeatmapCanvas` and `ShotDrawer` also compose `BaseCanvas`.
- **Consolidation is ~90% complete.** Three surfaces still bypass the shared layer:
  **BallisticsPage** (legacy `FieldCanvas`), **LayoutAnalyticsPage** (bespoke raw `<canvas>`),
  **CalibrationView** (img + divs, by design).
- **Zoom/pan/pinch math is centralized** in `src/components/field/touchHandler.js`
  (`createTouchHandler`), shared by both `BaseCanvas` and the legacy `FieldCanvas`. The
  inverse screen→normalized transform for hit-testing is `getRelPos` (`touchHandler.js:113-124`).
- **No canvas screen is super_admin-only.** Canvas access is RouteGuard role-based
  (admin/coach/scout/player), not `useIsSuperAdmin`. (Write-gating *within* LayoutDetail/Bunker
  editors is super_admin — see § 6 and the layout-globalization decision § 96.)
- **All coordinates are normalized 0..1 on the full field.**

---

## 1. Directory layout

### `src/components/canvas/` — the shared layer
| File | LOC | Role |
|---|---|---|
| `BaseCanvas.jsx` | ~401 | Infrastructure + gesture/transform host (the 7 § 64.3 concerns, and only those). Imports no `draw*` helper; content via `draw` render-prop. |
| `InteractiveCanvas.jsx` | ~390 | Interactive specialized child — scouting draw pipeline + inline player toolbar + reset-zoom chrome. Verbatim transplant of the old FieldCanvas L218-451. |
| `DrawingOverlay.jsx` | ~121 | Render-only freehand annotation overlay (separate absolutely-positioned `<canvas>`). |
| `drawStrokes.js` | ~167 | perfect-freehand helpers + Firestore (de)serialization + eraser. Shared by DrawingOverlay (live) and HeatmapCanvas (static replay). |
| `DrawToolbar.jsx`, `FullscreenToggle.jsx` | — | Drawing / immersive chrome. |

### `src/components/field/` — the legacy draw-helper pool (shared by old + new canvases)
`drawField.js`, `drawZones.js`, `drawAnalytics.js`, `drawBunkers.js`, `drawPlayers.js`,
`drawQuickShots.js`, `drawCalibration.js`, `drawLoupe.js`, `drawToolbar.js` (dead — see § 4),
`touchHandler.js`.

### Top-level components
- `src/components/FieldCanvas.jsx` (~454) — **legacy, still alive for BallisticsPage only.**
- `src/components/HeatmapCanvas.jsx` (~432) — **migrated**, now a BaseCanvas child.
- `src/components/ShotDrawer.jsx` (~378) — **migrated**, composes BaseCanvas directly.
- `src/components/FieldView.jsx` — **DELETED** (the stale plan still referenced it).
- `src/components/FieldEditor.jsx` — vestigial toggle-toolbar wrapper; not imported by any
  canvas consumer page mapped in § 6.

---

## 2. BaseCanvas (`src/components/canvas/BaseCanvas.jsx`)

Owns the cross-cutting concerns; renders no content itself (`:9-22`, `:28-29`).

### Props (`:76-135`)
- Sizing: `sizingStrategy='width-first' | 'height-first' | 'fit'`, `maxCanvasHeight=null` (`:78-79`).
- `fieldImage=null` (drives aspect) (`:83`).
- `viewportSide=null|'left'|'right'` half-field clip (`:85`).
- Gesture opt-ins: `pinchZoom=false`, `pan=false`, `loupe=false` (`:88-90`).
- Place callbacks (pass-through to touchHandler): `onPlacePlayer, onMovePlayer, onPlaceShot,
  onDeleteShot, onBumpStop, onSelectPlayer, onMoveBumpStop, onEmptyTap` (`:95-96`).
- Draw arbiter (§ 77): `drawMode=false`, `onDrawStart/Move/End/Abort` (`:112-113`).
- `touchHandlerState={}` — bag of ~25 feature fields the touchHandler reads, merged into
  `stateRef` (`:122`).
- `cursor='default'` (`:126`), `draw` render-prop (`:131`), `children` (chrome) (`:134`).

### State / refs
- `imgObj` loaded Image (`:141`), `canvasSize {w,h}` (`:154`).
- **Transform state:** `zoom` scalar (`:201`), `panState {x,y}` screen-px offset (`:202`),
  `activeTouchPos` (`:203`).
- **Ref-wrapped drag sentinels** (PROJECT_GUIDELINES § 9 silent-death guard):
  `draggingRef`/`draggingBunkerRef`/`draggingShotRef` + `setDragging`/`setDraggingBunker`/
  `setDraggingShot` wrappers write the ref *then* setState (`:210-229`). Reason: touchHandler
  reads `*.current` in `handleMove` (imperative, outside React render); raw setState would
  freeze the ref at null → silent tap/drag death.
- `drawingRef` stroke-in-progress sentinel (`:226`).
- Gesture work refs: `pinchRef, longPressTimer, longPressPos, didLongPress, calDragRef,
  dragStartRef, panStartRef, lastTapRef, loupeSourceRef` (`:219-237`).

### DPR / resize / image
- Image load effect (`:142-149`).
- **ResizeObserver observes the CONTAINER, never the canvas** — explicit guard against the
  `parent.clientHeight` infinite-zoom feedback loop (`:151-198`). Aspect =
  `imgObj.naturalWidth/naturalHeight`, default 2 (`:158-160`).
- Sizing branches: `'fit'` object-fit-contain (`:164-179`); `'height-first' || maxCanvasHeight`
  cap height (`:180-186`); else width-first (`:187-190`).
- **DPR runtime-detected:** `(window.devicePixelRatio) || 2` (`:325`) — the § 64.8.5 fix vs the
  legacy hardcoded ×2.

### Draw loop
No explicit rAF loop — drawing is a `useEffect` keyed on transform + content deps (`:322-342`).
Sets backing store to `cssSize × dpr` (`:326-327`), applies
`setTransform(dpr,0,0,dpr,0,0) → translate(pan.x,pan.y) → scale(zoom,zoom)` (`:332-334`), calls
`draw(ctx,w,h,{canvas,canvasSize,zoom,pan,activeTouchPos,loupeSourceRef,imgObj})` (`:336-339`),
then resets the transform so chrome renders in screen space (`:341`).
(DrawingOverlay does use a rAF retry for first-mount sizing — `DrawingOverlay.jsx:70-73`.)

### Touch attachment + the drawMode gate (`:289-316`)
`gesturesEnabled = pinchZoom||pan||loupe`; `handlerNeeded = gesturesEnabled || drawMode`
(`:290-291`). The `drawMode` clause is the § 78 silent-fail fix (commit `25123f8f`) — a
draw-only consumer with all gestures off still needs the handler. Touch listeners attached
imperatively with `{passive:false}` so `preventDefault` works against the iOS Safari magnifier
(`:304-308`); mouse handlers are React-synthetic (`:391-394`). `touchAction` is `'none'` when
attached else `'auto'` (`:383`).

**Gesture-gate caveat:** because `createTouchHandler` is monolithic, the three gesture opt-ins
are **collectively** gated — any-true attaches all (`:42-54`, `:290`). Granular per-gesture
gating is not yet real.

### Context
`BaseCanvasContext` (`:73`) exposes `canvasRef, containerRef, canvasSize, zoom, pan, setZoom,
setPan, activeTouchPos, loupeSourceRef, isLandscape, viewportSide, imgObj` (`:344-350`). Chrome
children (InteractiveChrome, ShotMenuOverlay, DrawingOverlay) read transform state via
`useBaseCanvas()`.

### DOM
OUTER resize-observed div (100% width) + INNER frame sized to `canvasSize`, `overflow:hidden`,
bordered, `margin:0 auto`; chrome `children` render inside the frame (`:352-398`).

---

## 3. The zoom / pan / pinch transform (load-bearing)

State lives in `BaseCanvas` (`:201-202`); the math lives in `touchHandler.js`.

- **Forward (field 0..1 → screen px)** — chrome positioning:
  `screenX = pl.x * canvasSize.w * zoom + pan.x` (`InteractiveCanvas.jsx:321-322`; identical in
  `ShotDrawer.jsx:297-298`).
- **Inverse (screen px → field 0..1)** — the hit-test/placement math, `touchHandler.getRelPos`
  (`touchHandler.js:113-124`):
  ```js
  const rect = canvasRef.current.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const canvasX = (cx - rect.left - pan.x) / zoom;     // undo pan, undo zoom
  const canvasY = (cy - rect.top  - pan.y) / zoom;
  return { x: clamp01(canvasX / canvasSize.w),          // px → normalized 0..1
           y: clamp01(canvasY / canvasSize.h) };
  ```
- **Pinch** (`touchHandler.js:180-197` arm, `:456-483` update): records `pinchRef={dist,zoom,pan}`;
  on move `scale=newDist/startDist`, `nz=clamp(1..5, startZoom*scale)`, re-pans so the point
  under the pinch centre stays fixed (`fieldX=(cx-startPan.x)/oldZoom; newPanX=cx-fieldX*nz`),
  pan clamped to container bounds. **Zoom range 1×–5×** (`:459`).
- **Single-finger pan** (`touchHandler.js:486-512`): always enabled (canvas may exceed container
  even at zoom=1, e.g. half-field). 12px move threshold cancels pending placement; pan clamped to
  `[-(canvasSize.w*zoom-containerW), 0]` (same for Y).
- **viewportSide clip** (`BaseCanvas.jsx:239-252`): forces `zoom=1` and pans so the requested half
  stays visible. Transplanted verbatim from `FieldCanvas.jsx:204-216`.

Transform composition is correct: DPR → translate(pan) → scale(zoom), and `getRelPos` inverts
exactly that order. No inversion bugs found.

---

## 4. Draw pipeline (`src/components/field/draw*.js`)

| Helper | Role | Anchor |
|---|---|---|
| `drawField.js` | Bg image (or grid placeholder) + captures clean loupe-source snapshot | `:7` (+ `drawViewportFade` `:33`) |
| `drawZones.js` | Disco/zeeker lines + danger/sajgon/bigMove zone polygons; accepts § 88 `zones[]` or legacy 3-named shape | `:18` |
| `drawAnalytics.js` | Visibility heatmap (safe/arc/exposed) + counter bump heatmap + enemy path | `:5` |
| `drawPlayers.js` | Player markers (circle/triangle), shots, bumps, eliminations (✕), opponent overlay, hero rings | `:5` |
| `drawQuickShots.js` | Obstacle cones + dashed break radii, zone-aware direction, team color | `:4` |
| `drawBunkers.js` | Bunker labels, anchor dots, selection ring, counter lanes | `:4` |
| `drawCalibration.js` | HOME/AWAY markers + dashed axis line | `:4` |
| `drawLoupe.js` | Magnifying loupe (clean-field magnification under finger), screen-space | `:5` |
| `drawToolbar.js` | **DEAD** — toolbars render as JSX, not via this helper; not imported by InteractiveCanvas or FieldCanvas | `:7` |

**Canonical call order** (InteractiveCanvas.jsx:197-269, identical in FieldCanvas.jsx:269-335):
`drawField → drawZones → drawAnalytics → drawPlayers → drawQuickShots → drawBunkers →
freehand (inline) → HUD (n/5, Shots P#, zoom-independent) → pendingBunkerPos → drawCalibration →
drawLoupe`.

`drawStrokes.js` (in `canvas/`): `STROKE_SIZES/COLORS/FREEHAND_OPTIONS` (`:21-45`), `paintStroke`
(`:60`), `svgPathFromStroke` (`:76`, the § 77 hotfix), `strokesTo/FromFirestore` (`:90/:104`),
`eraseAtPoint/eraseAcrossStrokes` (`:125/:150`).

---

## 5. touchHandler.js

`src/components/field/touchHandler.js` (~797 LOC) exports one factory `createTouchHandler(opts)`
→ `{handleDown, handleMove, handleUp}` (`:16`, `:796`). Single dispatch closure for ALL canvas
interaction, reading everything via `stateRef.current` (runs outside React's render cycle):

- pinch / pan (§ 3); loupe (`:225-232`, `:448-455`); Safari double-fire guard `usedTouchRef`
  (`:160-168`).
- player place/move/select (`:348-353`, `:542-547`, `:765-775`); bump-stop drag (`:355-364`,
  `:549-552`).
- shot place/move/delete/menu (§ 86 / A2 v2) (`:326-346`, `:407-429`, `:708-745`).
- bunker place/move/label-nudge (`:290-324`, `:524-539`).
- unified zone polygon editor — vertex/midpoint/delete, Google-Maps style (`:249-289`, `:439-446`,
  `:629-679`).
- calibration drag (`:234-242`, `:514-519`).
- § 77 draw arbiter: 1-finger→stroke, 2-finger→zoom, 2nd-finger-mid-stroke→abort (`:208-223`,
  `:431-437`, `:580-596`).

Threshold disambiguation: pan 12px (`:494`), player drag ~0.02 normalized, shot drag 6 CSS px.

**Consumers:** `BaseCanvas.jsx:296-303` (modern path — InteractiveCanvas, HeatmapCanvas,
ShotDrawer all reach it through BaseCanvas) and `FieldCanvas.jsx:137-142` (legacy direct).

---

## 6. Consumer screens × role

Routes from `src/App.jsx` (HashRouter). RouteGuard (`RouteGuard.jsx:18`) gates via
`canAccessRoute(effectiveRoles, path)` (`roleUtils.js:124-153`). Role reach: **admin**
unrestricted; **coach** everywhere except admin-only; **scout** everywhere except non-analytics
`/layout/*`; **player** only `/`, `/player/*`, `/tournament/*/team/*`. `useIsSuperAdmin` gates
only `/admin/*` — **no canvas page is super_admin-only**. (Super_admin *write-gating inside*
LayoutDetail/Bunker editors is a separate concern — base geometry is super_admin-curated; zones/
tactics are coach-writable. See the layout-globalization decision § 96.)

| Screen | Route | Canvas | Renders | Interactions | Zoom·Pan | Role reach | Evidence |
|---|---|---|---|---|---|---|---|
| LayoutDetailPage | `/layout/:layoutId` | `InteractiveCanvas` | image, bunkers, disco/zeeker lines, zones, freehand preview | view + tap-place bunkers + draw/edit zone polygons + drag bunkers/labels (`layoutEditMode={zoneDrawMode}`) | **Yes** | admin, coach | LayoutDetailPage.jsx:451,:504; App.jsx:151 |
| BunkerEditorPage | `/layout/:layoutId/bunkers` | `InteractiveCanvas` | image, bunkers + position labels | tap-create/select bunker, drag bunker/label (`layoutEditMode="bunker"`) | **Yes** | admin, coach (write super_admin-only — lock view for others, BunkerEditorPage.jsx:170) | BunkerEditorPage.jsx:193,:200; App.jsx:152 |
| BallisticsPage | `/layout/:layoutId/ballistics` | **`FieldCanvas` (legacy)** | image, bunkers, visibility raster | tap bunker/free-point → query visibility (`editable=false`) | **Yes** (FieldCanvas own) | admin, coach | BallisticsPage.jsx:90,:98; App.jsx:153 |
| LayoutAnalyticsPage — deaths | `/layout/:layoutId/analytics/deaths` | **bespoke raw `<canvas>`** | image + 💀 clusters + density + shooter markers | view + `onClick` hit-test (cross-filter); no place/drag | **No** | admin, coach, **scout** | LayoutAnalyticsPage.jsx:744,:413-416; App.jsx:154 |
| LayoutAnalyticsPage — breaks | `/layout/:layoutId/analytics/breaks` | same bespoke `<canvas>` | image + position dots + density | view only | **No** | admin, coach, scout | LayoutAnalyticsPage.jsx:744,:747 |
| MatchPage — scout point | `/tournament/:tid/match/:mid` (+ `/training/:tid/matchup/:mid`) | `InteractiveCanvas` + `DrawingOverlay` + `ShotDrawer` | image, players, shots, bumps, runners, eliminations, zones, freehand | tap/long-press place, drag move, >8% bump, tap-select toolbar, shot placement, draw annotations | **Yes** | admin, coach, scout | MatchPage.jsx:2181; ShotDrawer.jsx:220; App.jsx:156,:164 |
| MatchPage — heatmap tab | (same route, submode) | `HeatmapCanvas` | density clouds | view only | No (default off) | admin, coach, scout | MatchPage.jsx:1720; HeatmapCanvas.jsx:46 |
| ScoutedTeamPage | `/tournament/:tid/team/:scoutedId` (no RouteGuard) | `HeatmapCanvas` ×2 (read-only + Coach-Plan w/ `DrawingOverlay`) | density aggregate, scout annotations, coach plan strokes | view; Coach-Plan instance draws via `drawMode` | Read-only: No. Coach-Plan: gestures off, draw via arbiter | admin, coach, scout, **player** | ScoutedTeamPage.jsx:791,:824-853; App.jsx:155 |
| TrainingResultsPage | `/training/:trainingId/results` | `HeatmapCanvas` | training aggregate density | view only | No | any authed | TrainingResultsPage.jsx:376; App.jsx:162 |
| TacticPage | `/tournament/:tid/tactic/:tid` & `/layout/:lid/tactic/:tid` | `InteractiveCanvas` + freehand overlay | image, players, shots (both positions), bumps, runners, curve arrows, freehand (full edit) | place/move/drag (when `!drawMode`), full freehand draw | **Yes** | admin, coach (scout on `/tournament/*/tactic` only) | TacticPage.jsx:443,:465; App.jsx:157-158 |
| CalibrationView (wizard step 2) | `/layout/new` | **NOT a canvas** — `<img>` + 2 tappable `<div>` | field image | tap to place home/away anchors; sliders | **No** | admin, coach | CalibrationView.jsx:139-143; LayoutWizardPage.jsx:219; App.jsx:150 |
| QuickLogView | (MainPage Scout tab; no route) | **NONE** | n/a | tap roster → tap winner | n/a | any authed | DESIGN_DECISIONS § 12 |
| PlayerStatsPage / TrainingSetup / TrainingSquads | `/player/:id/stats`, `/training/:tid/setup`,`/squads` | **NONE** | n/a | n/a | n/a | any authed | App.jsx:159-161 |

Grep anchors: `<InteractiveCanvas>` LayoutDetailPage:451, BunkerEditorPage:193, MatchPage:2181,
TacticPage:443. `<HeatmapCanvas>` MatchPage:1720, ScoutedTeamPage:791 & :824, TrainingResultsPage:376.
`<FieldCanvas>` BallisticsPage:90 (sole living consumer). `<BaseCanvas>` direct: ShotDrawer:220.
Raw `<canvas>`: LayoutAnalyticsPage:744.

---

## 7. Legacy / consolidation status

- **`FieldCanvas.jsx` — STILL EXISTS, full standalone.** Own `zoom`/`pan` state (`:87-88`), own
  ResizeObserver (`:175-202`), own `createTouchHandler` wiring (`:137-142`), own draw effect with
  **hardcoded ×2 DPR** (`:263-264`), own viewportSide pan effect (`:204-216`). Intentionally
  retained **for BallisticsPage only** (`InteractiveCanvas.jsx:29-34` — "FieldCanvas.jsx is
  intentionally retained as legacy for BallisticsPage … the ×2 DPR literal stays for the same
  reason"). Imported by exactly one page: `BallisticsPage.jsx:12`.
- **`HeatmapCanvas.jsx` — migrated.** Composes `<BaseCanvas draw={drawHeatmap}>` (`:406-431`);
  no own zoom/pan/pinch, no touchHandler import; gestures opt-in via props default off (`:46-47`),
  loupe hardcoded off (`:418`). Pre-refactor ×2 removed.
- **`ShotDrawer.jsx` — migrated.** Composes `<BaseCanvas draw={draw}>` directly (`:220-257`),
  `viewportSide` opponent-half framing (`:69`,`:222`), `mode='shoot'`+`selectedPlayer` enables the
  shot branch. § 86 / A2 v2.
- **`FieldView.jsx` — DELETED** (zero matches in tree; deletion recorded in
  `CC_BRIEF_CANVAS_STEP5_IMPL.md:12`; 3 call-sites migrated to direct `<HeatmapCanvas>`).
- **`LayoutAnalyticsPage.jsx` — bespoke raw `<canvas>`, NOT shared.** Own `canvasRef` (`:93`),
  own ResizeObserver (`:116-131`), own draw effect with **hardcoded ×2 DPR** (`:416`), own
  `getBoundingClientRect` hit-testing (`:562-564`). **No zoom/pan/pinch** (read-only, `onClick`).
  Biggest remaining divergence.

### Migration ladder (DESIGN_DECISIONS § 64.9 — shipped)
- ✅ Step 1 — `drawZones.js` i18n cleanup (`5f12f7d`)
- ✅ Step 2 — BaseCanvas + `useLandscapeMode` (`53df791`)
- ✅ Step 4 — FieldCanvas → InteractiveCanvas (`2b6a473`)
- ✅ Step 5 — HeatmapCanvas → BaseCanvas + FieldView deprecation (`cb28a26a`)
- ✅ DrawingOverlay § 77/§ 78 (`cd9aa448` + `293576a8`)
- ✅ ShotDrawer → BaseCanvas § 86 (`4d16f118`)
- ⏳ **Open — AnalyticsCanvas extraction** (LayoutAnalyticsPage); BallisticsPage migration (Opus
  territory). These are the two surfaces still carrying hardcoded ×2 DPR.

---

## 8. Coordinate system

- **All canvas coordinates are normalized 0..1 on the FULL field** (`CLAUDE.md`; `HALF_FIELD_SPEC.md:41`,
  `:72`). Stored normalized; scaled to pixels only at draw time (`*w`, `*h`).
- **X axis:** field is symmetric left↔right; teams swap sides every point
  (`HALF_FIELD_SPEC.md:11,:15`). x=0 = base/breakout edge, x=1 = opposite edge. `viewportSide='left'`
  shows x≈0.0–0.6, `'right'` x≈0.4–1.0 (`:26,:46-50`). CLAUDE.md "x:0 home→1 away" maps onto this.
- **Y axis:** standard canvas, y:0 top → y:1 bottom (every helper multiplies `*h`, no flip;
  `touchHandler.js:122`). `doritoSide='top'|'bottom'` flips *shot-direction rendering*, not the axis
  (`drawQuickShots.js:8`).
- **Image-space ↔ field-space:** bunkers stored image-space, transformed via `makeFieldTransform()`
  → `toField()`/`toImage()` (`PROJECT_GUIDELINES.md:372,:417-420`); mirrors re-projected via
  `recomputeMirrorsWithCalibration` (`InteractiveCanvas.jsx:118-121`, `FieldCanvas.jsx:114-117`).

---

## 9. Inconsistency hotspots (for any future "do it once, properly" pass)

1. **LayoutAnalyticsPage** — fully bespoke `<canvas>` with its own ×2-DPR draw loop, own
   ResizeObserver, own hit-testing, no gestures. The largest divergence; duplicates HeatmapCanvas
   grid-render logic (`:425+` vs `HeatmapCanvas.jsx:92-117`).
2. **BallisticsPage / FieldCanvas** — the one remaining FieldCanvas consumer; duplicates the
   surrounding state/effect/pipeline wiring that BaseCanvas+InteractiveCanvas own (the pinch/pan
   *math* is NOT duplicated — both call the same `createTouchHandler`). Hardcoded ×2 DPR. Opus
   territory (off-limits without a brief).
3. **CalibrationView** — img + absolutely-positioned div markers + `getBoundingClientRect` tap
   math; no canvas, no zoom/pan, by design.
4. **DPR inconsistency:** BaseCanvas + DrawingOverlay use runtime `window.devicePixelRatio||2`
   (`BaseCanvas.jsx:325`, `DrawingOverlay.jsx:77`); FieldCanvas (`:263`) and LayoutAnalyticsPage
   (`:416`) still hardcode ×2.
5. **Monolithic touchHandler** — all gestures in one closure; per-gesture gating proposed (§ 64.4)
   but not implemented (gates are collective).
6. **Stale name references** — `PROJECT_GUIDELINES.md § 2.x` still names `FieldCanvas.jsx` as the
   universal canvas; that's stale relative to the InteractiveCanvas migration.

---

## 10. Cross-references
- `DESIGN_DECISIONS.md § 64` — the architecture decision (Option B) + § 64.3 concerns, § 64.4
  gesture profiles, § 64.5 DrawingOverlay, § 64.8 secondary decisions, § 64.9 migration sequence,
  § 64.11 `useLandscapeMode` + offset table.
- Ship-notes: § 75 (interaction model), § 76/§ 80/§ 81 (full-screen immersive), § 77/§ 78 (draw
  layer), § 86 (ShotDrawer).
- `HALF_FIELD_SPEC.md` — coordinate + viewportSide spec.
- `BALLISTICS_SYSTEM.md` — the ballistics engine behind BallisticsPage/FieldCanvas.
- Archived briefs: `docs/archive/cc-briefs/CC_BRIEF_CANVAS_STEP{2,4,5}_*.md`.
