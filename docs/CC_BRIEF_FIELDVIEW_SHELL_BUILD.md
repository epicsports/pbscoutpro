# CC BRIEF — Field View shell unification (Tier-2, Opus-designed, Jacek-gated mockups)

> Canonical repo copy of the build brief (2026-06-16). **Status:** Phase A SHIPPED on branch
> `feat/field-view-shell-phase-a` (additive slots, pixel-diff=0). Phase B in progress against
> `docs/mockups/fieldview_matrix.html`. Boundary: `BOUNDARY_FIELDVIEW_TIMELINE.md` + `POINT_AS_TIMELINE.md §8`.

**Goal (Jacek):** ONE unified Field View archetype across every canvas/field screen, so a future UI
redesign happens SYSTEMICALLY (change the shell once → all views update) and optimization is
cross-system, not per-page. The §113/§116 Canvas archetype taken to completion.

**Ratified design:** mockups approved by Jacek 2026-06-16 (`docs/mockups/fieldview_matrix.html` =
canonical reference: 4 views × 3 proportions). Boundary = `POINT_AS_TIMELINE.md §8 + D4`.

## The contract — 4 declarative slots (ADDITIVE to today's CanvasRailLayout)
Today's signature: `{ isLandscape, artifact, rail, header, hint, aspect, railMin, portraitArtifactVh, side='left', collapsed }`. EXTEND it — do NOT rewrite. Existing behavior (portrait stack / landscape rail / §116 collapse-at-0.90 to 56px strip + overlay) is CORRECT and tested; preserve exactly. Add:

1. **`phaseControl`** (optional) — floating phase segment + transport, top-right ON the field (not a bar above it — the height-saving decision). Enum-agnostic per D4. Shell HOSTS the slot; PaT owns the model (§8). `null` → corner clean (Konfig). Play (▶) lives INSIDE this control, NOT a layer toggle.
2. **`fieldTools`** (optional) — floating icon buttons top-right under/beside phaseControl: draw (pencil), fullscreen (⛶). Icons only.
3. **`primaryAction`** (optional) — main commit button. LANDSCAPE → floating bottom-right ON the field. PORTRAIT → full-width bar pinned at the very bottom. `danger` variant (outline red, "End match") vs default (amber fill, "Save point"). `null` → none (Heatmap, Ballistics).
4. **`rail` content model — STRUCTURED** — declarative ZONES, each ONE control type: **scope** → full-width segmented (pick-one); **layers** → full-width toggle LIST (label + iOS switch, aligned rows, NOT wrapped pills); **isolate/selection** → avatar/item list. Control LANGUAGE fixed system-wide: segment = pick-one, toggle = on/off, list = select.

**Collapsed strip (existing, EXTEND):** every migrated view supplies a SEMANTIC pinned set (its most-used layers/tools, declared per view). phaseControl + primaryAction stay floating on the field even when collapsed (never lost behind the strip — core tablet fix). Strip pins LAYERS/TOOLS only, showing each pin's state color.

## Per-view contract (each view DECLARES its slots; source = FIELD_VIEW_INVENTORY.md)
| View | phaseControl | primaryAction | pinned (collapsed) | rail zones |
|---|---|---|---|---|
| Scout-point (capture) | capture subset, no ▶ replay (live) | Save point | Positions·Shots·place-tool | start · layers · players |
| Match-review | full + ▶ replay | End match (danger) | Positions·Shots | layers |
| ScoutedTeam (coach) | coach read-bar + ▶ | Save (notes) | Positions·CoachPlan·notes | scope · layers · isolate |
| PlayerStats | optional + ▶ | null | (generic expand) | scope · layers |
| Heatmap/TrainingResults | ▶ replay | null | source-filter | source-filter |
| LayoutAnalytics | optional filter | null | scope | scope · layers |
| Hitability | optional | (mode-dependent) | config·track·sum (existing tabs) | tabs |
| Ballistics | optional, NO ▶ | null | Shooter·Visibility | layers · status |
| LayoutDetail (Konfig) | **null** (no time axis) | Save | Labels·Zones·Lines | layers |
| Tactic | full (per-phase setup) | Save | players·draw | layers — LAST |

## Rollout — order matters (Jacek's risk priority)
Scout-point + Heatmap are DAILY-DRIVER, most-polished → migrate/validate FIRST. Tactic RARELY-touched, fragile → LAST.
1. **Phase A — extend CanvasRailLayout** with the 4 slots (additive, behavior-preserving). Existing 4 rail-views keep working unchanged; pixel-diff=0 until intentionally reconfigured. ✅ SHIPPED on branch.
2. **Phase B — structured rail zones** (scope-segment / toggle-list / isolate-list) + per-view config module. Daily-drivers first (Scout-point, Heatmap/Match-review, ScoutedTeam).
3. **Phase C — migrate the 6 non-rail views** (BunkerEditor, LayoutDetail, Ballistics, LayoutAnalytics, TrainingResults + Tactic LAST). Ballistics residual: FieldCanvas→InteractiveCanvas + delete FieldCanvas (accept the DPR ×2→devicePixelRatio change as a CORRECTNESS fix). Tactic = SHELL only, internals untouched (PaT §8).

## Folded-in items (now subsets — confirm closed)
- ITEM-2 folded-rail opponent controls → phaseControl + pinned strip on ScoutedTeam.
- ScoutedTeam-vs-Match phase-language unification → the one phaseControl contract.
- canvas-unify residual (Ballistics) → Phase C.

## Guardrails / tiering
- **Tier-2** — mockup-approved. Build on a branch; Jacek gates the rendered result before merge.
- Behavior-preserving on the existing 4 rail-views until intentionally changed — pixel-diff=0 checkpoints.
- Coordinate guardrail: artifact sizes from its own ResizeObserver; canvas re-fits + keeps live-rect tap transform across reflow/collapse. Every migrated view keeps tap-accuracy.
- §116 collapse logic (0.90 trigger, 56px strip, overlay) — preserve verbatim; only strip CONTENTS change (semantic pins).
- phaseControl enum-agnostic — widening D4 enum later needs NO shell change.
- DON'T touch the PaT capture switcher internals — phaseControl HOSTS it (§8 black-box slot).

## Coverage
- Unit/e2e: each new slot renders/null-renders; rail full → collapsed → overlay; phaseControl present/absent per declaration; primaryAction floats (landscape) / bottom-bar (portrait); tap-accuracy across reflow.
- Fail-first where logic changes (collapse trigger, primaryAction placement switch).
- Existing 4 rail-views: regression-clean (pixel-diff=0) until intentionally reconfigured.

## Discovery FIRST (stale-premise guard)
Verify against HEAD nothing is already shipped (the 4 slots absent, 6 views non-rail, FieldCanvas Ballistics-only). Report the delta, THEN build. Lead the build report with: "shell extended additively, existing 4 views pixel-diff=0, N views migrated, tap-accuracy verified."
