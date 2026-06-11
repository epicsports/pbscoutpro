# CC BRIEF — SPRINT DAY 2 (part 2): rail-collapse shell + intensity ramp + §113 rollout ×3

**Role:** CC, implementer. All three design gates passed by Jacek (2026-06-10) on Opus mockups:
`mockup-1-rail-collapse-A.html` · `mockup-2-playerstats-rail.html` · `mockup-3-summary-ramp.html` (Jacek can hand you the files; their inline comments carry the measurements). Do not re-decide anything gated. Runs AFTER Day 2 part 1 merges and AFTER the full-audit run finishes (emulator contention).

## STEP 0.5 — Verify Opus assumptions (STOP + escalate if wrong)
- A1: `CanvasRailLayout` landscape branch = rail flex `1 1 0` minWidth railMin (200/240/280) + field `0 1 auto` height:100% aspect 16/10; field shrinks uniformly when residual < railMin.
- A2: The colour-blind switch for `HEATMAP.default/colorblind` lives in `theme.js` (~:179, `activeHeatmap`) and is user-settable (verify WHERE the setting surfaces; if it is not yet user-facing in Settings, flag — Stage 3 needs a visible toggle).
- A3: `HitabilityCanvas.jsx`: `weightTargets` drives radius (`:154`), badge amber at `:162-166`; Layout cumulative HITS reuses the same canvas with `weightTargets` (inventory Mechanism C) — so one canvas change covers both.
- A4: MatchPage review mode currently uses the §81 immersive model; wrapping it in `CanvasRailLayout` will replace that path for review. If scout mode and review mode share layout code such that the wrap would disturb live scouting → STOP, report, `[ESCALATE TO JACEK]`.

## STAGE 1 — Doc-sync (decisions of 2026-06-10, doc-only commit)
1. CanvasRailLayout collapse behavior (variant A) approved — geometry-triggered (residual < railMin → 56px icon strip + transient overlay panel; tap-outside closes; never permanent occlusion).
2. "Report + promotable Canvas" landscape archetype approved on PlayerStats mockup — applies as-is to ScoutedTeam + MatchPage(review) without separate gates.
3. Intensity ramp: `INTENSITY_RAMP.default` = traffic-light (V1), `INTENSITY_RAMP.colorblind` = existing CB sequence (V2); switched by the SAME user setting as the heatmap CB mode (one "colour-blind mode" toggle app-wide). Fixed-size markers; amber removed from count badges (amber = interactive only). Extend §115 with these specifics.

## STAGE 2 — Rail-collapse shell (in `CanvasRailLayout`, branch `feat/rail-collapse`)
- Trigger: in landscape, if residual width (W − field@100%height − gap) < railMin → COLLAPSED mode.
- Collapsed strip: 56px column, top→bottom: back (44px target) · divider · one icon per mode/tab (Lucide icons matching existing tab semantics; active = surfaceLight bg + accent border, as tabs today) · divider · compact live count (e.g. hits total) pinned bottom. All targets ≥38px visual / ≥44px hit area.
- Tap a tab icon → TRANSIENT overlay panel (~264–280px) slides over the field from the strip edge: scrim `rgba(5,8,15,.45)`, panel = EXACT current rail content (header / tabs / content / hint). Close: tap scrim, × control, or back. After a field interaction the panel does NOT auto-reopen.
- Pages on the shell inherit with zero per-page code (shell-level only).
- e2e (fail-first, write first, watch it fail): tablet-landscape project entry (1194×834): no full rail; strip present; field height ≥ 84% of viewport; open overlay → panel visible → tap scrim → closed → field tap still registers a hit. Phone-landscape + desktop-wide assertions unchanged (full rail).

## STAGE 3 — Intensity ramp token + Summary redesign (branch `feat/intensity-ramp`)
1. `theme.js`: add `INTENSITY_RAMP = { default: ['#22c55e','#facc15','#ef4444'], colorblind: <reuse HEATMAP.colorblind stop sequence> }` + helper `rampColor(t, mode)` (piecewise lerp, t∈[0,1]). NOTE the mid stop is `#facc15` (deliberately nudged off accent-amber), not `#eab308`.
2. Wire to the existing CB setting (A2). If no user-facing toggle exists yet, add a single switch in Settings ("Tryb daltonistyczny") controlling heatmaps + ramp together.
3. `HitabilityCanvas` (`weightTargets` path): radius FIXED at 12 (≈24px), fill = `rampColor(cnt/maxCnt)`, ring neutral 2px `#0a0e17` + 1px hairline `#2a3548` (owner-colour ring REMOVED in summary — §115 one-meaning-per-view), label auto-contrast (dark text on light fills, white on dark). Normalization per view: Summary = session max; Layout HITS = cumulative max (comes free via the same path — verify per A3).
4. Count badge de-amber EVERYWHERE in Hitability (summary + tracking, same lines): bg `#0f172a`, text white, border `#475569`. Tracking otherwise UNCHANGED (identity colours stay).
5. `HitBreakdownList` → compact single-line rows per mockup 3: ramp chip (12×24, radius 4) + obstacle label + inline position-dots with counts + ramp-coloured total; row min-height 44.
6. Small legend strip on the Summary field corner (1 → max, gradient of the ACTIVE ramp).
7. e2e: summary spec asserts fixed marker size across counts + ramp fill differs between min/max targets (fail-first against current growing-circle render).

## STAGE 4 — §113 rollout ×3 (branch `feat/rail-rollout`, in this order)
1. **PlayerStatsPage** per mockup 2: landscape = `CanvasRailLayout`, hero = the "Strefy ostrzału + przeszkody startowe" HeatmapCanvas, rail = header(avatar+name+team+HERO badge) + ALL report sections in original order, scrolling. Portrait untouched. The 90dvh expand-modal stays portrait-only; remove its trigger in landscape.
   **[GO GATE — Jacek]** after PlayerStats: preview/prod-deployable state, Jacek smokes phone-landscape + tablet (collapse) + desktop. The archetype is validated IN CODE here; on GO continue without further design gates.
2. **ScoutedTeamPage**: same pattern (hero = team heatmap; rail = header + report content). Replaces its §81 region-overlay path in landscape.
3. **MatchPage — review mode** (audit P0): same pattern (hero = field canvas; rail = review controls/timeline list). Scout mode untouched in this brief (A4 escalation if inseparable).
- e2e per screen (fail-first): phone-landscape hero ≥95% height & rail-left; tablet-landscape strip-collapse active; portrait unchanged.

## STAGE 5 — Validation + closeout
- Re-run the cross-device audit AFTER all stages: expect match-review P0 cleared, hero<95% flags cleared/strip-collapsed on the three screens, NO new flags. Attach before/after counts.
- build ✓ · lint-ui 0 errors · precommit (Bash) · full e2e green (incl. new fail-first specs).
- **[GO GATE — Jacek]** final READY → merge train (one merge per branch, --no-ff) → deploy → DEPLOY_LOG. Double cold-launch reminder in the READY report.
- Protect scout.* / package.json as established.

**[ESCALATE TO JACEK]** only on: A1–A4 failure, MatchPage scout/review entanglement, or ramp normalization ambiguity on Layout HITS (if cumulative max produces degenerate t — e.g. one obstacle dominating — report with numbers + 2 options, do not invent a log scale silently).
