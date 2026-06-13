# Control-language inventory — scouting · coach-summary · layout-config (2026-06-13)

> Read-only map (CC discovery, NOT a redesign) of how interactive controls diverge across the three big interaction surfaces, so Jacek can decide whether a control-language unification pass is worth doing post-FIT. Verdict at the bottom.

## Per-surface control catalogue (condensed)

**Scouting — `MatchPage.jsx` editor.** Field-side flip = text pill ("FROM LEFT ⇄"); **StageSwitcher = timeline-dot widget** (Break·Settle·Mid nodes+connector, role=tablist, text-only); player float-toolbar = emoji icon-buttons; ReasonRadial = radial chips (PL, amber-active); QuickShotPanel = pill chips (zones); Save sheet = winner tiles + outcome pills + 2-segment side-change pill + native `<select>` penalties + iOS toggle (OT) + text input.

**Coach summary — `ScoutedTeamPage.jsx`.** Scope = custom `<Pill>` row (borderRadius 8, amber-active); **phase = shared `SegmentedControl`** (filled bar, text-only); **layer toggles = RAW `<div>` pills** (Pozycje green-active / Strzały red-active / Replay·Plan·Notatki amber-active); isolate = avatar chips; draw entry = "✏ Rysuj" absolute chip.

**Layout config — `LayoutDetailPage.jsx`.** Portrait view-layers = symbol-only pills (`Aā ½ ═ ◇`, RADIUS.full, amber-active); admin mode bar = **fixed-bottom icon+label tab-bar** (Nazwy/Strefy/Linie, Lucide); immersive = **left-edge vertical emoji+text tab strip**; zone/line cards = swatch + inline-edit input + Pencil/Trash icon-buttons + Above/Below 2-segment pill; division lines = custom drag-handles; rename = inline-input (zones) BUT full Modal (bunkers).

## Cross-surface inconsistencies (the payload)
1. **Phase selector = 3 different components** for the same Break/Settle/Mid: StageSwitcher (timeline dots, scouting) · `SegmentedControl` (filled bar, coach) · custom icon-segment row (MatchPage review, the B1 phase row).
2. **Phase labeling differs**: text-only (StageSwitcher, SegmentedControl) vs icon+collapsing-label (review row).
3. **Layer toggles = 2 different structures**: raw `<div>` pills (ScoutedTeam) vs `<button aria-pressed>` chips in a capsule (`PerTeamHeatmapToggle`, MatchPage review). Only the latter is accessible.
4. **Layer active-color semantics clash**: Positions = green on ScoutedTeam but team-color on review; same conceptual layer, different active color.
5. **Pill shapes diverge**: scope pills borderRadius 8 (ScoutedTeam) · view-layer RADIUS.full (LayoutDetail) · side-change 2-segment (MatchPage) — 3 shapes for "pick one of N".
6. **Mode-switcher placement**: fixed-bottom tab-bar (LayoutDetail admin) vs left-edge vertical strip (LayoutDetail immersive) vs none elsewhere.
7. **Expand/collapse**: rotating-chevron row (ScoutedTeam) vs text-link "+ options/− hide" (MatchPage save sheet).
8. **Rename pattern within ONE page**: inline-input-on-blur (zones) vs full Modal (bunkers) — LayoutDetail.
9. **Labeling language is incoherent**: EN stage labels everywhere · PL layer/scope labels (ScoutedTeam) · symbol-only view-layers (LayoutDetail portrait) · PL immersive edge tabs.
10. **Accessibility baseline**: only `PerTeamHeatmapToggle` uses `aria-pressed` on real `<button>`s; most others are `<div onClick>`.

## CC assessment
**Divergence is structural, not cosmetic.** Three components implement the same phase axis; the layer-toggle pattern has two physically different component trees with clashing active-color semantics; scope selection uses three pill shapes; labeling has four conventions; only one surface is keyboard/AT-accessible. The cost isn't just looks — a fix to one surface's pill/toggle doesn't propagate, and adding a new phase/layer must be done 3× in 3 idioms.

**A targeted unification pass (post-FIT) would yield ~4 shared primitives:** one `PhaseSegmentedControl` (icons + collapsing labels — the review row is the densest, best base), one `LayerToggle`/`LayerCapsule` with consistent amber-active + `aria-pressed`, one canonical pill shape for scope/filter, one rename idiom. Scoped to these 4 families it's a contained pass, not a redesign. **Recommend: post-FIT, not now** (no FIT blocker; it's polish + maintainability). Pairs naturally with the arc-D design pass + the `<Screen>` migration (shared-component era).
