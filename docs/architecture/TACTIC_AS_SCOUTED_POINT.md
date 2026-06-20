# Tactic = Outcome-less Scouted Point — Architecture

**Status:** APPROVED (design gate, Jacek 2026-06-20). Staged implementation; each stage
GATE-d to Jacek. Stage 0 is a read-only discovery gate (no code).

**As-built progress:**
- ✅ **Stage 1** — `useCaptureDraft` extracted from MatchPage, behavior-identical (golden-master
  + full e2e). Live (`55dfd496`).
- ✅ **Stage 2.0** — tactic engine branches (`capturePhases`/`rootPhase`, `teams:'single'`,
  `outcomeEnabled:false`); tactic golden; point golden byte-identical. Live (`dd59ece0`).
- ✅ **Stage 2.1** — phased tactic doc (`schemaVersion:2` + `phases`), serialize/hydrate via the
  shared point helpers, hook `initial` param, legacy→`phases.breakout` (Q1) compat. `src/utils/
  tacticDoc.js`; e2e `tactic-doc.spec.js`. (No destructive migration; result-side + obstacle +
  bumpShots/curve dropped per Q2.)
- ⏳ **Stage 2.2** — tactic editor screen (next). · **Stage 2.3** — integration + retirement. ·
  **Stage 2.4** — #1 layout (independent branch).

---

## 1. Intent

A **tactic is a scouted point drawn BEFORE the point happens.** Same capture system as
point scouting:

> tap empty field → place player · tap placed player → action menu → runner / shoot
> (side · precision shot · zone) / bump

…same **game phases**, and — critically — a **single source of truth shared with
scouting**, so future changes update both places (the explicit reason for the real
extraction over a copy).

Differences vs a scouted point:
- **Single team** — a tactic places **my team only** (no A/B, no side-swap).
- **No outcome** — the point hasn't happened, so there is **no result/outcome capture**.

---

## 2. Model

- A tactic is a **phase-structured capture draft**, single team, no outcome.
- **Phases:** `preBreakout · breakout · settle · mid · endgame` — **NO `outcome`.**
  `preBreakout` = **IN** (the tactical setup at the line — where players start at the
  buzzer is the core of a tactic). See addendum A.
- **Per-phase draft fields** (subset of the point draft schema, my-team only):
  `players, shots, quickShots, obstacleShots, zoneShots, zoneObstacleShots, assign, bumps, runners`.
  **Excluded:** `elim, elimPos, elimReasons, penalty, outcome` (the entire result side).
- **Freehand annotation is kept** as a **separate coaching overlay layer** (the present/
  annotate pen), NOT part of the structured capture. It rides on top of the tactic for
  showing players live.

---

## 3. Shared capture engine — the core decision (proper extraction, zero drift)

**Already modular / shared today:** `pointPhases.js` (canonical phases, live),
`StageSwitcher`, `ReasonRadial`, `QuickShotPanel`, `InteractiveCanvas`. Reused as-is.

**Still inline in `MatchPage`:** the **capture orchestration** — the draft state machine
(`captureStage`, `stageDraftsA/B`, `seedStageDraft`, `draft`/`setDraft`), the
place→menu→runner/shot/zone/bump flow, and the per-phase / per-team draft management.

**Decision:** extract this orchestration into a **shared capture engine** — a hook
(`useCaptureDraft`) + a capture surface — parameterized by:
- `target`: `'point' | 'tactic'`
- `outcome`: `on | off`  (tactic = off)
- `teams`: `'AB' | 'single'`  (tactic = single)
- `capturePhases`: the capturable/positional phase set (target-parameterized — see addendum A)

`MatchPage` and the new tactic editor both consume it. One brain → both surfaces stay in
sync forever.

**Governing constraint (non-negotiable):** the extraction **must be behavior-preserving
for live point scouting** — the production path that won NXL Czech. Same discipline as the
`pointPhases` migration: **behavior-identical, fail-first, no functional change to
MatchPage**. If parity cannot be proven, we stop and re-plan rather than risk scouting.
The proof mechanism is the characterization harness in addendum B.

---

## 4. Data model + legacy

- **New tactic doc:** phase-keyed drafts (§2), single team. Exact container shape mirrors
  the point draft — CC proposes it in Stage 0 against the live point schema.
- **Legacy tactics** (today = single arrangement: positions + freehand) → read as a
  **single-phase draft** (compat shim). **No destructive migration.** Their freehand →
  the annotation layer.
- Home stays `/layoutOverlays/{layoutId}/tactics`. The board's `onBoard` / `order` fields
  (§124) are untouched.

---

## 5. Layout (#1) + cleanup — folds in here

- Field is always **100% height**; horizontal overflow is **CROPPED** to the residual
  width (no letterbox / no field shrink). Native aspect drives width; the sides clip
  (unused image margins go first).
- Rail is **INLINE**, two states: **expanded** (residual width, tactic list) ↔
  **minimized** (56px strip, always visible & one-tap expandable). **No overlay panel.**
- **Tap the field → minimize the rail to the strip** (field crops less). Expand affordance
  → back to residual. The rail is never fully hidden and never an overlay — so switching
  tactics never costs an open/close.
- The separate **full-screen / present mode and its button become redundant** → removed.
  "Show to players" = minimize the rail (near-full field) + the freehand annotate toggle.

---

## 6. Staged plan (Stage 0 is a discovery gate)

- **STAGE 0 — DISCOVERY (CC, no code).** Map MatchPage's exact capture surface: draft
  state-machine boundaries, the place→menu→runner/shot/zone/bump flow (component vs
  inline), the draft container schema, every A/B branch, every phase↔outcome coupling.
  Deliver an extraction plan + risk list + proposed tactic-doc shape. **→ GATE to Jacek.**
- **STAGE 1 — EXTRACT** the shared capture engine from MatchPage, **behavior-IDENTICAL**
  (MatchPage unchanged functionally; the characterization harness in addendum B proves
  scouting parity, fail-first). **→ GATE.**
- **STAGE 2 — TACTIC EDITOR** on the shared engine: `target='tactic'`, `outcome=off`,
  `teams='single'`, phases `preBreakout…endgame`. Persist to the tactic doc; legacy
  single-phase compat read.
- **STAGE 3 — LAYOUT (#1):** crop + inline minimize/expand; remove the full-screen button;
  retain the freehand annotation layer.
- **STAGE 4 — wire** the board "edit" door → new tactic editor; retire the bespoke
  TacticPage editor + the old present mode. Docs + ship.

---

## 7. Implementer addenda (CC, recorded at the design gate 2026-06-20)

**A. `preBreakout` IN — but as a target-parameter, NOT a `pointPhases` flag flip.**
In `pointPhases.js` the live point system marks `preBreakout {captureEnabled:false,
positional:false}` and `endgame {captureEnabled:false, positional:true}`; the point's
positional capture subset is **breakout/settle/mid only**. A tactic wants positional
capture across **all five** play-phases. So the *capturable/positional phase set* is a
**third parameterization axis** of the engine (point → {breakout,settle,mid}+endgame-
positional; tactic → all five positional). Flipping the live `pointPhases` flags is
forbidden — it would change scouting. Stage 0 maps this axis alongside `outcome`/`teams`.

**B. Parity proof = a characterization (golden-master) harness (Stage-1 gate artifact).**
Before extraction, drive the *current* MatchPage draft through a battery of capture
sequences (place → menu → runner/shot/zone/bump, across phases, both teams, side-swap,
endgame→outcome) and record the resulting draft objects as golden output. After
extraction, assert the engine reproduces them **byte-identical**. This is what makes
"behavior-identical" provable and lets us stop-and-re-plan on the first mismatch.

**C. `teams:'single'` / `outcome:off` must be clean parameterization, not dead branches.**
A/B + side-swap + endgame→outcome coupling is pervasive in MatchPage (~121 orchestration-
symbol hits). Stage 0's risk list enumerates every A/B branch and every phase-progression
→ outcome touchpoint, so a "harmless" extraction can't silently change point behavior.

**D. Present-mode black-screen fix (`cacdfd75`) — KEEP.** Already shipped + live. Stage 3
retires present mode; until then the fix prevents a black field for everyone. Removed
naturally in Stage 3; no separate action, no revert.
