# Field View — state↔descriptor glue assessment (ScoutedTeam pattern, 2026-06-16)

> Jacek's directive: ScoutedTeam is the pattern for the other 2 daily-drivers; measure how
> much custom glue the state↔descriptor wiring needs — if a lot, thicken the descriptor
> contract BEFORE repeating it 2×. **Verdict: a LOT of glue + 4-5 real contract gaps →
> THICKEN FIRST.** Wiring NOT done (deliberately — would bake bespoke glue then copy it 2×).
> Evidence = `ScoutedTeamPage.jsx` (HEAD `ac8033db`), `CanvasRailLayout.jsx`, `RailZones.jsx`.

## What ScoutedTeam exposes today (the raw material)
- Phase: `hmPhase` ('break'|'settle'|'mid') + `setHmPhase`, `hasMid` disable — already a `SegmentedControl` (`:829`).
- Replay: `hmReplay`/`setHmReplay`, `canReplay`, `replaying`, `inertWhileReplaying` coupling (`:712-713`) — a separate layer-pill (`:862`).
- Layers: `hmShowPositions`/`hmShowShots` (SEMANTIC colors — green/red, `:843-858`), `hmShowCoachPlan`/`hmShowAnnotations` (amber, `:879-894`).
- Isolation: `hmSelectedPlayer`/`setHmSelectedPlayer` over `roster` — chips (`:911-929`).
- Scope: `scopePillsEl` — 3 pills + a **modal match-picker** + a **conditional** layout pill + disabled states + `searchParams` (`:945-1012`).
- Draw: `coachDrawMode` + a floating "Rysuj" chip (`:771-789`) that swaps to `DrawToolbar` (`:790-806`); save is **embedded in draw-done** (`exitCoachDrawMode`/`saveCoachPlan` `:445-452`) — NO discrete Save button.

## The glue each descriptor slot needs (and the gap it reveals)

| Slot (descriptor) | Maps cleanly? | Glue / gap |
|---|---|---|
| **phaseControl: 'coach'+▶** | ❌ | Phase + replay are TWO separate controls today; the mockup wants ONE floating composite (segment + ▶ + done/active/pending states + `canReplay` disable). Building it inline = ~6 props of bespoke glue **per view** → Match-review would rebuild the same composite. **GAP A.** |
| **primaryAction: 'save'** | ❌ | ScoutedTeam has **no discrete save** — coach plan auto-persists on draw-done. 'save' kind doesn't map; it's effectively `null` (or a draw-mode-only "Done"). Descriptor asserts a CTA the page doesn't have. **GAP B.** |
| **rail: scope zone** | ⚠️ | `scopePillsEl` ≠ a pick-one `SegmentedControl`: it's pills + a **modal picker** + conditional pill + disabled + searchParams. The `'scope'→segment` contract can't represent it. **GAP C.** |
| **rail: layers zone** | ⚠️ | 4 toggles → `RailToggleList` items is mechanical, BUT (1) positions=green/shots=red **semantic colors** are lost in the uniform amber switch list; (2) `inertWhileReplaying` (layers go inert during replay) must be threaded per-item. `RailToggleList` item shape lacks `tone`/`disabled-while`. **GAP E (minor).** |
| **rail: isolate zone** | ✅ | `roster` → `RailItemList` items (avatar/name/active/onSelect). Low, mechanical glue. |
| **fieldTools (draw + ⛶)** | ⚠️ | Draw-entry exists (chip) → restyle to icon; **fullscreen (⛶) is net-new** (ScoutedTeam has none). `DrawToolbar` is a separate surface the slot must coexist with. Moderate glue. |
| **collapsed `pinned`** | ❌ | `pinned: ['positions','coachPlan','notes']` are LAYER TOGGLES (on/off + state color, tap=toggle). The shell's `collapsed.tabs` model is TAB SWITCHERS (tap=switch+open-overlay) — a different concept. The mockup strip shows `on-g/on-r/on-a` colored layer pins. `CanvasRailLayout` has no `pins` support. **GAP D.** |

## Verdict — THICKEN the contract before wiring (don't repeat the glue 2×)
The mechanical zones (isolate; layers-as-list) map fine. But **phaseControl, primaryAction, the collapsed pins, and rich scope** each need bespoke glue that would be **copy-pasted into Scout-point + Match-review** — the exact 3× duplication the single-source-of-truth design exists to prevent. Recommend Opus ratify these contract additions first:

1. **GAP A — shared `FieldPhaseControl` component** (in `canvas/`). Driven by `kind` ('coach'|'review'|'setup'|'filter') + a small state contract `{ phases, value, onChange, canReplay, replaying, onReplayToggle }`. Renders the floating segment + ▶ + done/active/pending per the mockup `.f-phase`. Views pass STATE, not rebuild the widget. (Scout-point keeps the PaT "E" black-box per §8 — the component covers the non-capture kinds.)
2. **GAP D — extend `CanvasRailLayout.collapsed` with `pins`** (separate from `tabs`): `pins: [{ key, icon, tone:'g'|'r'|'a', on, onToggle }]` → strip renders colored layer-pins that toggle in place (tap = toggle, NOT open-overlay). Mockup-faithful; the core "layers reachable when collapsed" piece.
3. **GAP B — `primaryAction` contract:** allow the descriptor to declare `null` honestly, and/or a `mode:'drawDone'` scoped CTA. ScoutedTeam → likely `primaryAction: null` (auto-save). Opus value-call (matches the mockup, which shows NO f-primary on the coach/heatmap cells — confirms null for ScoutedTeam).
4. **GAP C — `scope` zone hosts a node:** let a rail zone of `type:'scope'` accept a page-supplied custom element (picker/modal/conditional) instead of forcing `SegmentedControl`. Pick-one stays the default; rich scope is allowed.
5. **GAP E — `RailToggleList` item `tone`:** optional per-item color (green/red) + an `inert` flag, so established layer semantics survive and the replay-inert coupling threads cleanly. (Or Jacek rules: drop rail colors, keep them only on the strip pins per the mockup.)

After (1)-(5), wiring ScoutedTeam → Scout-point → Match-review is mostly mechanical (state→props), and the source-of-truth promise holds. **Awaiting Opus/Jacek ratification of the thickened contract before wiring** (this is a contract/architecture call, not CC's to make unilaterally — and it's exactly the signal Jacek asked to surface).

---

## §2 — MatchPage wiring finding (2026-06-16, post-ScoutedTeam) — NEITHER view is a mechanical wire

ScoutedTeam wired clean + shipped (glue LOW, as predicted). But the MatchPage structural map (read-only) shows the brief's "wire 2 & 3 mechanically" premise does NOT hold for MatchPage — both touch approved/fragile UI:

**Scout-point (capture) — NOT on CanvasRailLayout at all.** Capture is a bespoke stacked layout (portrait) + landscape floating controls (`MatchPage.jsx:2540–3119`). It already has the slot-EQUIVALENTS as bespoke floating chrome: the "E" + start-side merged bar (`2579–2610`, PaT §8 black box), a "Save point" button (`2815`/`2625`), draw chip + FullscreenToggle (`2636`, `2708`). Giving it the formal shell = **migrating the most fragile capture flow onto `CanvasRailLayout`** (roster grid, place/shoot/bump tools, save bottom-sheet, the immersive controls) — a structural migration, NOT a mechanical state→props wire. **Decision owed:** migrate capture onto the rail, or leave it bespoke (it already has the controls; the §8 "E" is PaT-owned regardless)?

**Match-review — on CanvasRailLayout (`2514`), but the slots replace recently-shipped approved UI:**
- `phaseControl`: review already has a polished **§B phase row** (`2110–2160`: ▶/Pause + animated icon segments Break/Settle/Mid, `phasePin`/`phasePlaying`/`replayStage`). The shell slot would **replace it with the simpler `FieldPhaseControl` and relocate it floating** on the field — a redesign of approved UI, not a mechanical move. **Decision owed:** replace with `FieldPhaseControl`, or keep the §B row (relocate as-is into the slot)?
- `layers`: `PerTeamHeatmapToggle` (`hmVisibility` teamA/teamB positions+shots) already does per-team A/B — converting to `RailToggleList perTeam` is cosmetic/mechanical (the one safe piece).
- `primaryAction`: 'end' (End match, danger) maps cleanly; unlock/relock stay in the rail/menu.
- `pins`: per-team layers don't map to single-icon strip pins cleanly (4 toggles) — pin combined Positions/Shots (toggle both teams) or skip.

**Verdict:** stopped before editing — per the established discipline (Jacek validated "right to stop rather than brute-force"). Both decisions are Jacek/Opus calls touching the two most fragile/polished flows. Recommended sequencing: (a) Match-review first IF the §B-row→FieldPhaseControl replacement is approved (else keep §B row in-slot); (b) Scout-point capture as its OWN migration brief (structural, highest-risk, Tactic-tier caution).

---

## §3 — Phase C triage (2026-06-16, read-only) — the 6 "non-rail views" are NOT uniform

After ScoutedTeam + Match-review shipped, started Phase C. Reading the 6 candidates shows "migrate all 6 onto CanvasRailLayout" doesn't hold — the rail archetype needs (a) a canvas HERO **and** (b) rail-worthy controls. Several lack one:

| View | Canvas-primary? | Existing rail content | Verdict |
|---|---|---|---|
| **TrainingResults** | ❌ NO — it's a scrolling **results dashboard** (heatmap is ONE section among overrides/bunker-breakdown/matchup-history) | n/a | **Not a rail view — keep as dashboard.** Force-fitting (heatmap=hero) breaks the report. |
| **BunkerEditor** | yes | none — bare canvas + bottom-sheet naming + save bar | **Thin wrap** — empty rail unless the naming bottom-sheet is redesigned INTO the rail. Low shell value (collapse only). super-gated. |
| **Ballistics** | yes | none — canvas + a status line (Shooter/Visibility are inherent state, NOT toggles) | **Thin wrap** — near-empty rail. + carries the FieldCanvas→InteractiveCanvas swap (DPR change). Low shell value. |
| **LayoutDetail (Konfig)** | yes | **YES** — config mode bar (Names/Zones/Lines) + view toggles (labels/half/lines/zones) + tactics list | **Real candidate** (most value) — but complex (immersive edge-tabs, zone/line editing). |
| **LayoutAnalytics** | yes | scope pills + density | **Candidate** — but flagged "tangled, untangle-then-wrap" (NEXT_TASKS arc-B). |
| **Tactic** | yes | toolbar + draw + player setup | **Candidate, LAST** (fragile, shell-only). |

**Recommended Phase C scope (reshaped):**
1. **Drop TrainingResults** from the rail set — it's a dashboard; leave as-is.
2. **LayoutDetail** = the genuinely-valuable migration (real rail content). Do it next (its own careful pass — immersive tabs).
3. **LayoutAnalytics** — after untangling (per the arc-B note).
4. **Tactic** — LAST, shell-only.
5. **BunkerEditor + Ballistics** = LOW priority — thin/near-empty rails; the shell only buys them collapse-consistency. Decide whether they're worth wrapping at all (and Ballistics' contract "layers" + BunkerEditor's "rail naming" would have to be BUILT, not wired). Ballistics also carries the FieldCanvas deletion (canvas-unify residual).

**Stopped before editing** (no clean mechanical migration exists; brute-forcing a dashboard/empty-rail wrap would be actively wrong). Scope decision owed: confirm the reshaped set + order.

---

## §4 — Phase C resolution (2026-06-16): the mechanical wiring is DONE

Reading PlayerStats + Hitability (the other two CanvasRailLayout views) closes the loop:

- **PlayerStats** — on CanvasRailLayout already; `<HeatmapCanvas showPositions showShots={false}>` is HARDCODED, no phase/scope/layer state. **Nothing to wire** — already shell-compliant (rail = report column, generic-expand collapse). The contract's "phaseControl + scope/layers" are aspirational features that don't exist.
- **Hitability** — already populates `collapsed.tabs` (config/track/sum); no layer toggles or phase. **Already shell-compliant.**

**So the Field View shell's MECHANICAL wiring is complete for its natural family (the 4 rail-native views):**
- Match-review ✅ wired · ScoutedTeam ✅ wired · PlayerStats ✅ already-compliant (no controls) · Hitability ✅ already-compliant (tabs).

**Everything else needs a decision or is low/no value (NOT clean wires):**
- **LayoutDetail + Tactic** — use the §76 IMMERSIVE landscape archetype (`useLandscapeMode`: hidden header + floating edge-tabs + fullscreen canvas + 2s-debounce auto-save), NOT the rail. Migrating = REPLACING immersive with rail+collapse. **Opus archetype decision:** is the rail meant to supplant §76 immersive for editor views, or is immersive a valid sibling archetype? (The shell unified the review/coach/scout/stats family; editor views may legitimately differ.)
- **BunkerEditor + Ballistics** — plain pages, no rail content (canvas + status/save). Thin/empty-rail wraps — low value; their contract "layers" would have to be BUILT.
- **TrainingResults** — dashboard, not a rail view.

**Conclusion:** the shell archetype + the 2 wireable daily-drivers are shipped; the rail-native family is consistent. Further "Phase C" is an Opus archetype call (immersive vs rail for editors) + optional low-value wraps — NOT mechanical CC work. Recommend pausing Phase C here pending the archetype ruling.
