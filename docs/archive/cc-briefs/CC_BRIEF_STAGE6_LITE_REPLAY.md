# CC BRIEF — Stage 6-lite: 3-step replay animation (coach view + match heatmap, toggleable)

> **[DONE] 2026-06-03** — shipped as merge `89acccd7` (6L-0 `db8ed092` · 6L-1+6L-2 `3a260ad3` · 6L-3 `c13830cf`).
> Archived reasoning artifact (DESIGN_DECISIONS §37.1) — not an active spec. See DEPLOY_LOG 2026-06-03.

**Author:** Opus · **Owner/GO:** Jacek · **Implementer:** CC
**Device-agnostic.** Visual target = the live looping preview shown in chat. Build on Stage 6-lite discovery
anchors. Parts ship in order, each its own commit + Jacek GO: **6L-0 → 6L-1 → 6L-2 → 6L-3.**

## 6L-0 — Carry `timeline[]` through both mappers (SHARED with Stage 2.5 — do first, size once)
Add `timeline` (mirrored per-keyframe, the way `homeData` is carried) to **`mapOnePointForTeam`
(`ScoutedTeamPage.jsx:418-446`)** and **`getHeatmapPoints` (`MatchPage.jsx:1734-1769`)**. **Not a new fetch** —
the full doc (incl. `timeline[]`) is already in memory (`dataService.js:936-943`/`:952-957`); the mappers just
stop stripping it. This single sub-task unblocks **both** this animation **and Stage 2.5** — implement once.

## 6L-1 — Animation layer in HeatmapCanvas (option A; no render refactor)
- RAF driver **inside `HeatmapCanvas`**: advance an internal `playT`; feed an **interpolated per-slot position
  override** (tween between consecutive keyframes **Break=kf#0 → Settle → Mid**) into the existing Layer-1 marker
  path (`phasePos` override `:100-101`, marker loop `:146-250`). Slot alignment by **`slotId`** across keyframes.
- **During play = markers only:** gate OFF the aggregate layers so each frame is ~10 cheap ops.
- **OFF = zero idle:** schedule RAF only while playing; cleanup cancels it.
- Loop: Break (hold) → tween Settle → hold → tween Mid → hold → loop (~1s tweens, short holds, ≈ chat preview).
- Break anchor = `bumpStops[i] ?? players[i]`; Settle/Mid = that keyframe's positions.

## 6L-2 — Elimination stop + fade (semantics — DECIDED, Jacek confirm)
- **Everyone alive at the Break frame** (do NOT apply kf#0 end-state elim at the start).
- **Progressive:** at Settle / Mid, apply *that keyframe's* `eliminations[]` → newly-out slots **freeze at that
  keyframe's position + fade** (opacity ≈0.4).
- kf#0 end-state elim applied on the **final** frame.

## 6L-3 — Toggles (two surfaces; same `HeatmapCanvas`)
- **Coach (`ScoutedTeamPage`):** "▶ Replay" pill in the Layers pill row, reuse the Positions/Shots pill idiom.
  Replay ON → Positions auto-on + animate; shots/zones hidden; **`hmPhase` inert while playing**; **Isolate still
  applies**. Replay OFF → restore prior layer/phase state.
- **Match-summary (`MatchPage`):** add a single global "▶ Replay" pill as a **sibling ABOVE the capsule row**.
- **Default = OFF.**

## Edge-case policies
- Slot present in Break but absent/null later → **hold last-known position**.
- A stage omitted entirely → tween only across present keyframes; **need ≥2 keyframes to animate** (else disable pill).
- Slot appearing mid-timeline → fade-in at the first keyframe it exists.

## Implementation notes (CC, as shipped)
- 6L-1+6L-2 landed as one commit (`buildReplayModel` computes `outAt` — animation + elimination inseparable in one model).
- Match-summary **single-side** review path deliberately keeps **no `side`** field (preserves existing A/green static coloring); replay there colors as one team.
- Coach: while playing, Mode bar + Positions/Shots/Plan/Notatki pills go **inert** (opacity 0.4 + pointer-events none); state not mutated → restores on OFF. Isolate + Collapse stay live.
- DESIGN_DECISIONS § (replay animation pattern) added in the closeout.
