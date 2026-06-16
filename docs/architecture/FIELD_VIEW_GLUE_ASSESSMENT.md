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
