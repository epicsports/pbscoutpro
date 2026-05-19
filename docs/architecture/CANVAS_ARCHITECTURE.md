# Canvas Architecture — Audit & Migration Plan

> **Status:** WIP audit, started 2026-05-18 from mobile session (no live code access).
> **Owner of completion:** CC autonomously on desktop session, or Opus on next desktop session.
> **Goal:** unify canvas implementation across all 10+ views + add universal drawing layer feature.

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
| `src/components/FieldView.*` | Older abstraction layer | 🟡 Referenced in 2026-04-14 audit ("ScoutedTeamPage: HeatmapCanvas via FieldView") — proposed for deprecation; **CC: verify still exists or was removed** |

### 1.2 Render helpers (in `src/components/field/`)

| File | Renders | Source |
|---|---|---|
| `touchHandler.js` | Pinch/pan/loupe/tap/Safari-double-fire prevention | ✅ CLAUDE.md "Key files" |
| `drawPlayers.js` | Player markers (circles, triangles, eliminated ✕) | ✅ CLAUDE.md |
| `drawQuickShots.js` | Shot indicators (two-ring break+obstacle) | ✅ CLAUDE.md |
| `drawBunkers.js` | Bunker shapes + position labels | ✅ DESIGN_DECISIONS § 2.6 + memory |
| `drawZones.js` | Disco/zeeker lines + danger/sajgon/bigmove polygons | 🟡 Inferred from DESIGN_DECISIONS § 1.6 — **CC: confirm file exists** |
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
| 1 | Scouting punktu | `MatchPage.jsx` (scout submode) | FieldCanvas + FieldEditor + `viewportSide` (half-field zoom 2x) | edit | players, shots, bumps, runners, eliminations | no |
| 2 | Match summary heatmap | `MatchPage.jsx` (heatmap submode) | HeatmapCanvas + FieldEditor | read | density clouds (positions + shots), point preview overlay | no |
| 3 | Coach team summary heatmap | `ScoutedTeamPage.jsx` | HeatmapCanvas + FieldView ⚠️ | read | density clouds (agregat całego turnieju lub layout scope) | no |
| 4 | Layout detail | `LayoutDetailPage.jsx` | FieldCanvas direct + lokalne checkboxes ⚠️ | edit (bunkers, lines, zones) | bunkers, disco/zeeker, danger/sajgon/bigmove polygons, freehand preview | preview only (read) |
| 5 | Tactics drawing | `TacticPage.jsx` | FieldCanvas + FieldEditor + **freehand overlay canvas** | edit | players, bumps, shots (from both positions), curve arrows, **freehand strokes** | **YES — full edit** |
| 6 | Kill mapping (deaths heatmap) | `LayoutAnalyticsPage.jsx?mode=deaths` | ❓ CC: which canvas component | read | 💀 markers + density | no |
| 7 | Breakouts heatmap | `LayoutAnalyticsPage.jsx?mode=breaks` | ❓ CC: which canvas component | read | position dots + density (across all tournaments sharing layoutId) | no |
| 8 | Ballistics | `BallisticsPage.jsx` | FieldCanvas + visibility overlay (3-channel: safe/arc/exposed) | edit (tap to query bunker or free point) | bunkers + visibility raster | no |
| 9 | Bunker editor | `BunkerEditorPage.jsx` | FieldCanvas (scouting-style full-height) | edit (bunker placement + naming) | bunkers + position labels + bottom sheet | no |
| 10 | Layout wizard calibration | wizard step component | 🟡 FieldCanvas (with `imageAspect` fix per 2026-04-14) | edit (tap-to-place calibration anchors + sliders) | calibration dots | no |
| 11 | Training matchup scouting | reuses `MatchPage.jsx` via training adapter | jw. point #1 | edit | jw. | no |
| 12 | Player Stats Page | `PlayerStatsPage.jsx` | ❓ CC: does it render heatmap/canvas at all? | read | per-player density?, bunker preference cards? | no |

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

These were flagged 5+ weeks ago and may or may not still apply — **CC: verify each before treating as actionable**:

1. **`LayoutDetailPage`** used FieldCanvas direct + lokalne checkbox div, proposed to wrap in FieldEditor → CC: check current state.
2. **`ScoutedTeamPage`** used FieldView → HeatmapCanvas, proposed to wrap in FieldEditor → CC: check.
3. **`TournamentPage`** was flagged but the page was removed in 2026-04-14 tab navigation refactor (replaced by AppShell + MainPage + Scout/Coach/More tabs). Likely obsolete entry in audit.
4. **Padding inconsistency** — LayoutDetailPage hardcoded `14px`, others used `R.layout.padding`. Some token system. CC: verify if still inconsistent.
5. **HeatmapCanvas gestures** ❓ — unknown if HeatmapCanvas reuses `touchHandler.js` (pinch/pan/loupe) or has its own implementation. Critical question — answer determines whether landscape coach view is a 1-day or 3-day task.
6. **Polish strings remaining** in FieldEditor toolbar (`'Etykiety bunkrów'`, `'Strefy'`, `'Widoczność'`, `'Daltonizm'`) — may have been fixed in i18n session (2026-04-15, commit `66b856a`). CC: verify.

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

### 5.3 Behavior matrix

For each page in § 2, fill in the actual touch behavior:

| Page | Pinch-zoom | Pan when zoomed | Loupe | Tap behavior | Drag behavior |
|---|---|---|---|---|---|
| MatchPage scout | ✅ | ✅ | ✅ | place player | move player; >8% = bump |
| MatchPage heatmap | ❓ | ❓ | ❓ | toggle point preview | ❓ |
| ScoutedTeamPage | ❓ | ❓ | ❓ | ❓ | ❓ |
| LayoutDetailPage | ✅ | ✅ | ✅ | edit bunker / draw zone | move bunker / label nudge |
| TacticPage | ✅ | ✅ | ✅ | place player / select / draw freehand | move player; >8% = bump |
| LayoutAnalyticsPage | ❓ | ❓ | ❓ | ❓ | ❓ |
| BallisticsPage | ❓ | ❓ | ❓ | tap to query visibility from that point | ❓ |
| BunkerEditorPage | ✅ | ✅ | ✅ | edit bunker | move bunker; label drag |
| Layout wizard calibration | ❓ | ❓ | ❓ | place anchor | ❓ |
| PlayerStatsPage | ❓ | n/a maybe | n/a maybe | ❓ | ❓ |

### 5.4 Aspect ratio + landscape handling

For each canvas-rendering page:
- How is canvas sized (height-first vs width-first vs max-vertical)?
- Does `@media (orientation: landscape)` do anything?
- Does it respect `env(safe-area-inset-*)`?
- Is `window.devicePixelRatio` used in render to keep zoom crisp?

### 5.5 The "iPad coach" reference

Jacek mentioned **one coach uses iPad with a default drawing tool**. To know what to replicate:
- Which coach? (Daniel? Don? Sławek?) — ask the coach directly
- Which app? (iPadOS native Markup? Procreate? GoodNotes? Notability? Concepts?)
- Which specific tools does he use? (pen, marker, highlighter, lasso, eraser, undo, colors)
- Apple Pencil pressure/tilt or finger only?

Output: short list of must-have features for first iteration of universal drawing layer.

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

Jacek pyta coacha (Daniel/Don/whoever) o specyfikę narzędzia z iPada. Wynik: lista 5-8 features dla drawing layer MVP. Dorzucone do § 5.5 + nowa sekcja w drugim draftcie tego dokumentu.

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

**Last updated:** 2026-05-18, mobile session (Opus). Verification status: WIP.
