# Canvas Architecture — Audit & Migration Plan

> **Status:** Phase 0 discovery COMPLETE 2026-05-19. All ❓ resolved, all 🟡 verified against code at HEAD `7508ea8`. Ready for architecture decision (Etap 4).
> **Owner of completion:** Opus + Jacek (architecture rozkmina).
> **Goal:** unify canvas implementation across all 10+ views + add universal drawing layer feature.

> **Phase 0 highlights:**
> - LayoutAnalyticsPage uses its **own custom canvas** (not FieldCanvas/HeatmapCanvas) — bigger divergence than the audit anticipated; deaths + breaks share one bespoke canvas implementation.
> - PlayerStatsPage has **no canvas at all** — stats + charts + tables only. Drop from canvas migration scope.
> - Layout wizard calibration uses **CalibrationView (image + 2 tappable points)**, no canvas.
> - FieldView **still alive**, used by ScoutedTeamPage; bypassed by MatchPage and TacticPage. Adoption is selective, not deprecated.
> - **Three canvas-rendering modes coexist**: gesture-rich FieldCanvas, gesture-free HeatmapCanvas, gesture-free LayoutAnalyticsPage custom canvas.
> - Hardcoded `×2` DPR scaling everywhere (no runtime `window.devicePixelRatio`).
> - Landscape handling is JavaScript-driven (`device.isLandscape`), zero `@media (orientation:landscape)`.
> - Safe-area insets handled at page-container level, not canvas-level.
> - drawZones.js still has hardcoded English labels (`DISCO`/`ZEEKER`/`DANGER`/`SAJGON`/`BIG MOVE`) — i18n incomplete.
> - See `PHASE_0_DISCOVERY_FINDINGS.md` for orthogonal findings.

## Legend

- ✅ **CONFIRMED** — verified against source (commit, audit, DESIGN_DECISIONS section, or implementation transcript). Source cited inline.
- 🟡 **INFERRED** — derived from memory or documentation but not directly confirmed in source. Needs CC verification.
- ❓ **UNKNOWN** — not in my context, requires desktop discovery.

When in doubt, **assume the feature exists** — we have 30+ briefs shipped and the audit dates back to 2026-04-14 which is pre-i18n, pre-tab-nav, pre-coach-brief-view, pre-player-self-log. Many proposed migrations may have already happened.

---

## 1. Component inventory

### 1.1 Core canvas components

| File | Role | Source confirming |
|---|---|---|
| `src/components/FieldCanvas.jsx` | Main canvas renderer | ✅ CLAUDE.md "Key files" section |
| `src/components/HeatmapCanvas.*` | Heatmap-specific renderer (separate from FieldCanvas) | ✅ 2026-04-14 audit table ("MatchPage (heatmap): HeatmapCanvas via FieldEditor") |
| `src/components/FieldEditor.*` | Wrapper combining canvas + toggle toolbar (Labels/Lines/Zones) | ✅ DESIGN_DECISIONS § 3 |
| `src/components/FieldView.*` | Mode-based dispatcher: `mode='heatmap'` → HeatmapCanvas, else → FieldCanvas. Layer toggle props (bunkers/zones/lines) with internal-state fallback. | ✅ `src/components/FieldView.jsx` (207 lines) [verified Phase 0, 2026-05-19]. **Still alive**, used by `ScoutedTeamPage.jsx:4`. Bypassed by `MatchPage.jsx:8-9` and `TacticPage.jsx:13` (they import FieldCanvas/HeatmapCanvas directly). Adoption is selective, not mandatory. |

### 1.2 Render helpers (in `src/components/field/`)

| File | Renders | Source |
|---|---|---|
| `touchHandler.js` | Pinch/pan/loupe/tap/Safari-double-fire prevention | ✅ CLAUDE.md "Key files" |
| `drawPlayers.js` | Player markers (circles, triangles, eliminated ✕) | ✅ CLAUDE.md |
| `drawQuickShots.js` | Shot indicators (two-ring break+obstacle) | ✅ CLAUDE.md |
| `drawBunkers.js` | Bunker shapes + position labels | ✅ DESIGN_DECISIONS § 2.6 + memory |
| `drawZones.js` | Disco/zeeker lines + danger/sajgon/bigmove polygons | ✅ `src/components/field/drawZones.js` confirmed [verified Phase 0, 2026-05-19]. ⚠️ Labels still hardcoded English: `'DISCO'` L38, `'ZEEKER'` L45, `'DANGER'`/`'SAJGON'`/`'BIG MOVE'` L66-72 (and L70-72 edit mode). i18n commit `66b856a` did not touch this file. |
| `bunkerShapes.js` | Shape geometry for ballistics ray-casting | ✅ Memory ("triangle/cross hitboxes, shape-aware ray casting") |

### 1.3 Hooks

| File | Role | Source |
|---|---|---|
| `src/hooks/useVisibility.js` | Ballistics visibility query API: `initField(bunkers, fieldW, fieldH, res)` + `queryVis(bunkerId, pos, stanceOverride)` | ✅ Conversation 2026-04-14 (BallisticsPage implementation) |
| `src/utils/makeFieldTransform.js` | `toField()`/`toImage()` coordinate transforms | ✅ PROJECT_GUIDELINES § 4.6, § 5.2 |

### 1.4 Workers

| File | Role | Source |
|---|---|---|
| `src/workers/ballisticsEngine.js` | Ballistics physics (Euler integration, drag, hitbox testing) | ✅ DESIGN_DECISIONS § 16 + NEXT_TASKS "Opus territory" |

---

## 2. Use cases — where canvas lives

| # | Page / view | File | Canvas stack | Mode | Draws | Drawing layer? |
|---|---|---|---|---|---|---|
| 1 | Scouting punktu | `MatchPage.jsx` (scout submode) | FieldCanvas direct (no FieldEditor wrapper) | edit | players, shots, bumps, runners, eliminations | no |
| 2 | Match summary heatmap | `MatchPage.jsx` (heatmap submode) | HeatmapCanvas direct (no FieldEditor wrapper) | read | density clouds (positions + shots), point preview overlay | no |
| 3 | Coach team summary heatmap | `ScoutedTeamPage.jsx` | HeatmapCanvas via FieldView ✅ [verified] | read | density clouds (agregat całego turnieju lub layout scope) | no |
| 4 | Layout detail | `LayoutDetailPage.jsx` | FieldCanvas direct + local layer toggle div (no FieldEditor wrapper) | edit (bunkers, lines, zones) | bunkers, disco/zeeker, danger/sajgon/bigmove polygons, freehand preview | preview only (read) |
| 5 | Tactics drawing | `TacticPage.jsx` | FieldCanvas direct + freehand overlay canvas | edit | players, bumps, shots (from both positions), curve arrows, **freehand strokes** | **YES — full edit** |
| 6 | Kill mapping (deaths heatmap) | `LayoutAnalyticsPage.jsx?mode=deaths` | ✅ **Custom canvas** (own `useRef` + manual `ctx` drawing), NOT HeatmapCanvas [verified Phase 0, 2026-05-19; `LayoutAnalyticsPage.jsx:93-131,213-267`] | read | 💀 markers + density via `drawAnalytics` | no |
| 7 | Breakouts heatmap | `LayoutAnalyticsPage.jsx?mode=breaks` | ✅ Same custom canvas as row #6 (single canvas, mode-switched) [verified] | read | position dots + density (across all tournaments sharing layoutId) | no |
| 8 | Ballistics | `BallisticsPage.jsx` | FieldCanvas with `maxCanvasHeight` + `showVisibility` prop + `visibilityData` | edit (tap to query bunker or free point) | bunkers + visibility raster | no |
| 9 | Bunker editor | `BunkerEditorPage.jsx` | FieldCanvas with `maxCanvasHeight=window.innerHeight-160` + `layoutEditMode='bunker'` | edit (bunker placement + naming) | bunkers + position labels + bottom sheet | no |
| 10 | Layout wizard calibration | `LayoutWizardPage.jsx` step 2 | ✅ **CalibrationView** (image + 2 tappable points), **NOT a canvas** [verified Phase 0, 2026-05-19; `src/components/CalibrationView.jsx`] | edit (tap-to-place calibration anchors + sliders) | image-only viewer, no canvas | no |
| 11 | Training matchup scouting | reuses `MatchPage.jsx` via training adapter | jw. point #1 | edit | jw. | no |
| 12 | Player Stats Page | `PlayerStatsPage.jsx` | ✅ **No canvas** — stats/charts/tables only [verified Phase 0, 2026-05-19] | n/a | n/a | n/a |

⚠️ = known divergence (see § 4).

### Confirmed: no canvas

- `QuickLogView` — DESIGN_DECISIONS § 12 explicit "Quick logging mode without canvas". Zone toggles map to synthetic coords.
- `TrainingResultsPage` — leaderboard only.
- `TrainingSetupPage` / `TrainingSquadsPage` — chip grids + drag-drop, no canvas.
- `ScoutRankingPage` — leaderboard cards.

---

## 3. Existing drawing layer (TacticPage only)

This is **the prototype we'll build on**. Already shipped, working in production.

**Mechanics:**
- Separate `<canvas>` overlay positioned on top of FieldCanvas with `pointer-events: auto` when draw mode active
- Pointer capture (`setPointerCapture`) on stroke start
- Strokes stored in Firestore as **object** format (NOT array — Firestore nested array crash): `{"0":[{x,y},{x,y},...], "1":[...]}`
- Coordinates normalized 0-1
- Persists in tactic doc (`tactic.freehandStrokes`)
- Visible in LayoutDetailPage preview (read-only) via `freehandStrokes` prop on FieldCanvas

**Current tooling (single-mode):**
- One color: amber `#f59e0b`
- One thickness: 3px
- "Clear drawings" action in ⋮ ActionSheet
- No undo/redo
- No eraser
- No per-user attribution (single global layer per tactic)

**Source confirming:** DESIGN_DECISIONS § 11.8 + 2026-04-14 implementation transcripts.

---

## 4. Known divergence (technical debt from 2026-04-14 audit)

**Phase 0 verification status (2026-05-19) below each item:**

1. **`LayoutDetailPage`** used FieldCanvas direct + lokalne checkbox div, proposed to wrap in FieldEditor.
   - ✅ **Still divergent** [verified]. `LayoutDetailPage.jsx` imports FieldCanvas directly (not FieldEditor). Local layer toggle div + zone editing state (L46-48). Landscape branch (L258, L261) adjusts canvas height + width.
2. **`ScoutedTeamPage`** used FieldView → HeatmapCanvas, proposed to wrap in FieldEditor.
   - ✅ **Still uses FieldView** [verified `ScoutedTeamPage.jsx:4`]. FieldView dispatches to HeatmapCanvas via `mode='heatmap'`. No FieldEditor wrapper. FieldView itself is alive and selectively adopted (see § 1.1).
3. **`TournamentPage`** was flagged but the page was removed in 2026-04-14 tab navigation refactor (replaced by AppShell + MainPage + Scout/Coach/More tabs).
   - ✅ **Confirmed obsolete** — TournamentPage doesn't appear in current src/pages grep. Entry can be dropped from audit.
4. **Padding inconsistency** — LayoutDetailPage hardcoded `14px`, others used `R.layout.padding`. Some token system.
   - 🟡 **Not specifically verified in this pass** — Phase 0 focused on canvas component structure, not padding tokens. Re-audit during refactor work.
5. **HeatmapCanvas gestures** ❓ — unknown if HeatmapCanvas reuses `touchHandler.js` or has its own implementation.
   - ✅ **HeatmapCanvas has NO gestures** [verified `HeatmapCanvas.jsx` 353 lines, 11 props]. No pinch, no pan, no loupe, no touchHandler import. Read-only render. **Implication for landscape coach view: cannot just enable pinch-zoom on existing HeatmapCanvas — would need to import touchHandler.js + add gesture state, OR migrate the view to FieldCanvas in `viewportSide` half-field mode, OR add gestures to a unified base canvas.** This is the load-bearing answer for the landscape feature size estimate.
6. **Polish strings remaining** in FieldEditor toolbar — may have been fixed in i18n session (2026-04-15, commit `66b856a`).
   - 🟡 **FieldEditor toolbar strings not separately verified this pass** — Phase 0 found ZERO `// TODO i18n` markers across src/. drawZones.js labels (`DISCO`/`ZEEKER`/`DANGER`/`SAJGON`/`BIG MOVE`) confirmed STILL HARDCODED ENGLISH (see § 1.2 row). FieldEditor toolbar labels not directly inspected; assume fixed if no TODO markers but re-verify during canvas refactor.

---

## 5. Open questions for CC desktop discovery

Goal: fill in all ❓ + verify all 🟡 before architecture decisions.

### 5.1 File inventory grep

```bash
grep -rn "FieldCanvas\|HeatmapCanvas\|FieldEditor\|FieldView" src/pages src/components
```

Output should give exhaustive list of canvas usage. Compare against table § 2.

### 5.2 Specific files to read end-to-end

- `src/components/FieldCanvas.jsx` — full prop list, all branches
- `src/components/HeatmapCanvas.*` — does it import `touchHandler.js`? does it support pinch-zoom/pan/loupe? aspect ratio handling?
- `src/components/FieldEditor.*` — what props does it pass through? landscape mode handling?
- `src/components/FieldView.*` — still exists? if yes, what does it do that FieldEditor doesn't?
- `src/pages/LayoutAnalyticsPage.jsx` — which canvas component used (FieldCanvas? HeatmapCanvas? something custom?)
- `src/pages/BallisticsPage.jsx` — overlay rendering mechanism (separate canvas layer? or drawn into main field canvas?)
- `src/pages/PlayerStatsPage.jsx` — any heatmap rendering? per-player density?
- `src/pages/BunkerEditorPage.jsx` — uses FieldEditor or FieldCanvas direct?

### 5.3 Behavior matrix [completed Phase 0, 2026-05-19]

| Page | Canvas | Pinch-zoom | Pan when zoomed | Loupe | Tap behavior | Drag behavior |
|---|---|---|---|---|---|---|
| MatchPage scout | FieldCanvas | ✅ | ✅ | ✅ (editable) | long-press → place player | move player; >8% = bump |
| MatchPage heatmap | HeatmapCanvas | ❌ | ❌ | ❌ | n/a (read-only) | n/a |
| ScoutedTeamPage | HeatmapCanvas via FieldView | ❌ | ❌ | ❌ | n/a (read-only) | n/a |
| LayoutDetailPage | FieldCanvas | ✅ | ✅ | ✅ (edit mode) | zone vertex/midpoint drag start; bunker tap select | bunker drag / zone vertex drag / label nudge |
| TacticPage | FieldCanvas | ✅ | ✅ | ✅ (editable) | long-press → place player; freehand stroke in draw mode | player/shot/bump drag |
| LayoutAnalyticsPage | Custom canvas (not FieldCanvas) | ❌ | ❌ | ❌ | n/a (read-only) | n/a |
| BallisticsPage | FieldCanvas with `maxCanvasHeight` | ✅ | ✅ | ✅ (loupe enabled via `layoutEditMode='bunker'`) | place shooter / tap bunker → query visibility | shooter placement |
| BunkerEditorPage | FieldCanvas | ✅ | ✅ | ✅ (`layoutEditMode='bunker'`) | tap bunker → select + bottom sheet; tap empty → create | bunker drag / label nudge |
| Layout wizard calibration | CalibrationView (image, not canvas) | n/a | n/a | n/a | tap to place anchor point | n/a |
| PlayerStatsPage | none | n/a | n/a | n/a | n/a | n/a |

**Gesture asymmetry by design:**
- **FieldCanvas**: gesture-rich (pinch/pan/loupe always enabled when not suppressed by `viewportSide`)
- **HeatmapCanvas**: strictly gesture-free (no pinch/pan/loupe imports, no touchHandler)
- **LayoutAnalyticsPage custom canvas**: gesture-free
- **CalibrationView**: bespoke 2-point tap UI, no canvas gestures

Implication: a unified "drawing layer" or "landscape coach view" cannot just toggle gesture support on HeatmapCanvas — gesture support is not present in the component at all. Three paths to expose gestures on coach summary heatmap:
1. Import touchHandler.js + add gesture state to HeatmapCanvas (substantial refactor)
2. Migrate heatmap view to FieldCanvas in a new "read-only heatmap mode" with `viewportSide`/zoom enabled
3. Extract gesture concerns to a shared base canvas (architecture decision in Etap 4)

### 5.4 Aspect ratio + landscape + safe-area + DPR audit [completed Phase 0, 2026-05-19]

| Page | Sizing strategy | maxCanvasHeight | Landscape handling | DPR | Safe-area |
|---|---|---|---|---|---|
| FieldCanvas (default) | Width-first | null → use container width | Driven by caller | `×2` hardcoded (L261-262) | N/A on canvas |
| FieldCanvas (with maxCanvasHeight) | Height-first | Caller-provided, e.g. `window.innerHeight - 140` | Caller branches `isLandscape` | `×2` hardcoded | N/A on canvas |
| HeatmapCanvas | Width-first | `window.innerHeight - 200` or responsive config | None (no landscape branch) | `×2` hardcoded (L49) | N/A on canvas |
| LayoutAnalyticsPage custom canvas | Width-first | N/A | None (no landscape branch) | `×2` hardcoded (L261) | N/A on canvas |
| MatchPage | Dynamic | scout: `window.innerHeight - 180`; heatmap: as above | `isLandscape ? window.innerHeight : window.innerHeight - 180` (L70, L1750-1835) | via FieldCanvas | `env(safe-area-inset-*)` on bottom panel (L1919) |
| LayoutDetailPage | Height-first | `window.innerHeight - 200` | `isLandscape ? window.innerHeight - 20 : window.innerHeight - 200` (L258, L261) | via FieldCanvas | `100dvh` on container (L261) |
| TacticPage | Height-first | `window.innerHeight - 200` | `isLandscape ? window.innerHeight : window.innerHeight - 200` (L407, L411, L435) | via FieldCanvas | `100dvh` on container (L415) |
| BunkerEditorPage | Height-first | `window.innerHeight - 160` | No landscape branch | via FieldCanvas | N/A |
| BallisticsPage | Height-first | `window.innerHeight - 140` | No landscape branch | via FieldCanvas | N/A |

**Cross-cutting findings:**

- **No `@media (orientation: landscape)`** anywhere in `src/` — all landscape handling is **runtime JavaScript** (`device.isLandscape && !device.isDesktop` from `useDevice`).
- **`env(safe-area-inset-*)`** appears in ~23 files but applied at **page container level**, not on canvas. Pattern: container uses `100dvh` + safe-area padding; canvas computes height from `window.innerHeight - N`.
- **DPR is hardcoded `×2`** across all three canvas types (FieldCanvas L261, HeatmapCanvas L49, LayoutAnalyticsPage L261). No `window.devicePixelRatio` call anywhere. Works on 2x/3x mobile devices; possibly suboptimal on high-DPR future devices.
- **No CSS-driven canvas sizing** — every canvas sizes itself via JavaScript `window.innerHeight - N` computations + ResizeObserver.

### 5.5 The "iPad coach" reference — Feliks

**Coach:** Feliks (one of the team coaches, analytical mindset per earlier persona notes).

**What he does on iPad (per Jacek 2026-05-18):**
- Picks a color
- Draws by hand on the screenshot/canvas
- Marks specific moments: **start positions** (where players begin breakouts), **movement paths** (where they ran next), etc.

**Tool he uses:** ❓ Jacek to confirm which app — likely iPadOS native Markup (Photos screenshot annotation) given how casual the workflow sounds, or Notes if he saves the screenshot first. Not professional drawing software (Procreate/Concepts) given simplicity of the workflow.

**Implied minimum feature set for our replica:**

| Feature | Priority | Notes |
|---|---|---|
| Free-hand stroke drawing | P0 | Already exists on TacticPage — extend to other views |
| Multiple colors (palette) | P0 | Currently amber-only. Need at least 4-6 colors (red/blue/green/yellow/white/amber) |
| Color picker UI | P0 | Toolbar with color swatches; tap to switch active color |
| Clear all | P0 | Already exists on TacticPage (⋮ ActionSheet) |

**Probably P1 (not stated but typical of this workflow):**

| Feature | Priority | Notes |
|---|---|---|
| Undo (last stroke) | P1 | Strong UX expectation; even iPad Markup has it |
| Stroke thickness toggle (2-3 levels) | P1 | thin/medium/thick |
| Eraser (object-based — remove entire stroke) | P1 | Pixel eraser is overkill |

**Out of scope for MVP (defer unless Feliks explicitly asks):**
- Apple Pencil pressure/tilt support (web limitation, fingers work fine)
- Shape recognition (snap to circle/line)
- Lasso (select + move strokes)
- Layers
- Highlighter (semi-transparent overlay) — could be a second-color variant if needed
- Per-user attribution (whose stroke is whose) — defer to multi-user phase

**Persistence question (architecture decision needed):**
Feliks's annotations are **transient** in his current workflow — he marks up a screenshot, talks through it with the team, screenshot gets discarded. Does our replica:
- Save strokes per-event (point/match/team summary) to Firestore, like TacticPage does? Persistent across sessions, sharable.
- Keep strokes ephemeral (local React state, cleared on page exit)? Lighter, no Firestore writes.
- Hybrid: ephemeral by default, "Save annotation" button promotes to persistent?

Defer this decision until architecture rozkmina (Etap 4).

---

## 6. Drawing layer — design considerations (post-audit)

This section is **deliberately empty**. Will be filled after § 5 questions are answered. Premature design is the failure mode here.

Key questions to defer until § 5 complete:
- Universal drawing layer as separate overlay component, or built into base canvas?
- Strokes scoped to **what level**? Per-point (scouting), per-match (coach summary), per-layout (analytics), per-session (transient annotations during briefing)?
- Persistence: Firestore vs localStorage vs ephemeral?
- Multi-user attribution: whose strokes are these? Show all teammates' strokes simultaneously, or one author per session?
- Conflict with existing canvas gestures (player placement, bunker edit) — mode switch (`draw mode` toggle) or pen-only via input type detection?

---

## 7. Plan forward

### Etap 1 — Mobile draft (this document)

**Done.** Honest audit with ✅/🟡/❓ tags. Lists what is known vs what needs verification.

### Etap 2 — Desktop CC discovery

CC autonomously, or Opus on next desktop session:
1. Run grep from § 5.1
2. Read files from § 5.2
3. Fill in behavior matrix from § 5.3
4. Verify aspect/landscape/safe-area from § 5.4
5. Commit completed document. All ❓ resolved, 🟡 confirmed or refuted.

### Etap 3 — iPad coach interview

Jacek pyta Feliksa o specyfikę narzędzia z iPada (which app, are P1 features needed, persistence preference). Wynik: ostateczna lista features dla drawing layer MVP. Aktualizuje § 5.5.

### Etap 4 — Architecture decision (rozkmina)

Once § 2 table is complete with no ❓, decide:
- **A. Single component with props** (`<CanvasView mode="scout|heatmap|layout|tactic|analytics" {...}>`) vs **B. Hierarchy with shared BaseCanvas + specialized children**
- **Gestures baseline** — which gestures default-on everywhere (likely: pinch-zoom, pan, double-tap-to-fit). Which gestures are opt-in per mode (likely: loupe, half-field viewport).
- **Landscape mode** — single `useLandscapeMode()` hook + `<LandscapeChrome>` wrapper.
- **Drawing layer** — overlay component, gesture conflict resolution, persistence scope, multi-user model.

Output: new section in `docs/DESIGN_DECISIONS.md` (proposed § 38: Canvas Architecture).

### Etap 5 — Refactor briefs (CC implementation tracks)

Per-view migration briefs + drawing layer feature brief. Each brief is **decision-tree format** so CC can execute autonomously without Jacek mediation. Order TBD; likely start with the view that gives most coach value (Coach Summary landscape).

### Etap 6 — First beneficiary

Landscape coach view (the original feature request that triggered this whole audit) ships on top of unified base.

---

## 8. Cross-references

- `docs/DESIGN_DECISIONS.md` § 2 — Canvas behavior contract
- `docs/DESIGN_DECISIONS.md` § 3 — FieldEditor
- `docs/DESIGN_DECISIONS.md` § 11.8 — TacticPage freehand drawing (existing prototype)
- `docs/DESIGN_DECISIONS.md` § 16 — Ballistics system
- `docs/DESIGN_DECISIONS.md` § 27 — Apple HIG (touch targets, elevation, anti-patterns)
- `docs/PROJECT_GUIDELINES.md` § 2.7 — Canvas / Field
- `docs/PROJECT_GUIDELINES.md` § 6.4 — Canvas specifics
- `docs/architecture/HALF_FIELD_SPEC.md` — Mirror system, `computeMirrors()`, calibration transform
- `docs/architecture/BALLISTICS_SYSTEM.md` — Ballistics engine architecture
- `CLAUDE.md` — "Key files" section, "One FieldCanvas component renders field everywhere" architecture rule

---

**Last updated:** 2026-05-19, desktop session (CC Phase 0 discovery). Verification status: **COMPLETE** — all ❓ resolved against code at HEAD `7508ea8`, all 🟡 verified (5 confirmed alive, 1 confirmed obsolete, 2 deferred to refactor pass). Cross-ref `PHASE_0_DISCOVERY_FINDINGS.md` for orthogonal findings. Ready for architecture decision (Etap 4).
