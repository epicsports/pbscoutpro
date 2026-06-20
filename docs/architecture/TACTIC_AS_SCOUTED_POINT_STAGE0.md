# Stage 0 — Discovery findings (capture-surface map + extraction plan)

**Companion to** `TACTIC_AS_SCOUTED_POINT.md`. Read-only discovery, no code. GATE to Jacek
before Stage 1. Source: `src/pages/MatchPage.jsx` (3187 lines), `pointPhases.js`,
`TacticPage.jsx`, `dataService.js`.

---

## 0. Headline — the safe cut line

The capture handlers (`handlePlacePlayer`, `handleToolbarAction`, `handleToggleQuickZone`,
`toggleElim`, …) are **already team- and stage-agnostic**: every one reads `draft` and writes
`setDraft`, which a single routing seam (`MatchPage.jsx:660-682`) resolves to the right
team/stage slot. **That seam + the handlers is the brain to extract.**

**The hook does NOT own persistence or outcome.** `savePoint` (L1233-1518), the `SaveSheet`
(L2929-3082), the `outcome` state, and the home/away side-stamping **stay in MatchPage,
verbatim.** `useCaptureDraft` owns only: the draft state atoms, the routing seam, the
factories (`emptyTeam`/`seedStageDraft`/`switchStage`), the capture handlers, and
`serialize`/`hydrate`. This is the smallest cut that gives the tactic editor the full capture
brain while leaving the NXL-proven save/outcome machinery untouched — directly serving the
"behavior-identical MatchPage" non-negotiable.

```
            ┌────────────────────── useCaptureDraft ──────────────────────┐
 field ───► │ draft / setDraft seam · stage machine · capture handlers ·  │
 gestures   │ emptyTeam/seedStageDraft/switchStage · serialize/hydrate     │
            └───────┬─────────────────────────────────────────┬───────────┘
                    │                                          │
        MatchPage (target=point, AB, outcome=on)   TacticEditor (target=tactic, single, outcome=off)
        · savePoint / SaveSheet / outcome          · updateLayoutTactic (phase-keyed)
        · home/away side-stamp (UNCHANGED)          · freehand annotation layer
```

---

## 1. Proposed engine API

```js
const eng = useCaptureDraft({
  target: 'point' | 'tactic',
  teams:  'AB' | 'single',          // single → no activeTeam, no draftB, no mirroredOpp
  outcome: true | false,            // false → no elim/reason/penalty capture, no SaveSheet
  capturePhases,                    // phase set (see §2) — point: capturePhases(); tactic: positional playPhases()
  initial,                          // hydrate() source (existing doc) or null
});
// returns:
eng.draft, eng.setDraft                       // the resolved per-team/per-stage draft seam
eng.captureStage, eng.switchStage, eng.stageDone
eng.activeAnnotations, eng.setActiveAnnotations
eng.toolbarItems, eng.onToolbarAction         // the player action menu (runner/shoot/bump/hit/…)
eng.handlers                                  // placePlayer/movePlayer/selectPlayer/placeShot/deleteShot/
                                              // removePlayer/toggleQuickZone/quickShotPrecise/(toggleElim/setElimReason if outcome)
eng.undo, eng.redo
eng.serialize()                               // → persisted shape for `target`
// teams:'AB' additionally exposes activeTeam/setActiveTeam + draftA/draftB + mirroredOpp
```

- `outcome:false` ⇒ `toggleElim`/`setElimReason`/`penalty` are **absent** (not no-ops left in the
  point path — they stay in the `outcome:true` branch only). The result-side draft fields
  (`elim/elimPos/elimReasons/penalty`) are simply never created for a tactic.
- `teams:'single'` ⇒ the routing seam collapses to one draft; `activeTeam`, `draftB`,
  `mirroredOpp`, `teamSideMemoryRef`'s two-key structure all live behind the `'AB'` branch.

---

## 2. Phase set (the 3rd parameter — confirmed against `pointPhases.js`)

`pointPhases` marks `preBreakout {captureEnabled:false, positional:false}`,
`breakout/settle/mid {captureEnabled:true, positional:true}`, `endgame {captureEnabled:false,
positional:true}`, `outcome {terminal}`. **Do not edit these flags** (would change scouting).

- **point** capture set = `capturePhases()` = breakout/settle/mid (unchanged).
- **tactic** capture set = the **positional** play phases = preBreakout · breakout · settle ·
  mid · endgame (a tactic captures positions in all five; preBreakout IN per §2/addendum A).

So `useCaptureDraft` takes the capturable phase list as a prop rather than reading
`captureEnabled` globally.

---

## 3. Proposed tactic-doc shape (mirrors the point draft; single-team, setup-side only)

`/layoutOverlays/{layoutId}/tactics/{tacticId}` — **additive, legacy-safe**:

```js
{
  // existing (untouched): name, squadCode, myTeamId, onBoard, order, createdAt, updatedAt, freehandStrokes
  schemaVersion: 2,                 // gate: presence of `phases` ⇒ new model
  phases: {                         // per-phase capture draft, MY-TEAM only, SETUP-side only
    preBreakout: PHASE | null,
    breakout:    PHASE | null,
    settle:      PHASE | null,
    mid:         PHASE | null,
    endgame:     PHASE | null,
  },
}
// PHASE = { players, assign, bumps, runners,
//           shots: shotsToFirestore(...), quickShots: quickShotsToFirestore(...),
//           zoneShots: quickShotsToFirestore(...) }
```

- **Excluded** (result side): `elim, elimPos, elimReasons, penalty, outcome`. **Excluded**
  (legacy read-only, never written by scout): `obstacleShots, zoneObstacleShots`.
- **Serialization** reuses the point's `shotsToFirestore`/`quickShotsToFirestore` (Firestore-safe,
  §9 no-nested-arrays) — same helpers, same shapes → zero divergence.
- **Legacy compat read** (no `schemaVersion:2`): the existing flat
  `{players, shots, bumps, runners, quickShots, obstacleShots}` **or** `steps[0]` → mapped into
  `phases.breakout` (the single arrangement = the buzzer/initial positions). `freehandStrokes`
  → the annotation layer (already). **No destructive migration; legacy tactics open as a
  one-phase tactic.** (OPEN Q1: legacy → `breakout` vs `preBreakout`.)
- **Freehand** stays the top-level annotation overlay (NOT inside `phases`), per §2.

---

## 4. Risk list (ranked) — the parameterize-out surfaces

| # | Risk | Where | Severity | Mitigation |
|---|---|---|---|---|
| R1 | A/B routing seam + save side-mapping collapsing to single-team | `663-666` (3 ternaries), `savePoint` `1299-1452`, `teamSideMemoryRef` `265`, `?scout=` effect `761-785`, manual-flip `2648-2674` | **HIGH** | `'AB'` stays the default code path; `'single'` is a thin branch (one draft, no activeTeam). MatchPage keeps savePoint verbatim — the hook never touches save. Harness covers AB. |
| R2 | Outcome coupling | `SaveSheet 2929-3082`, `savePoint` outcome/status branches `1355-1439`, auto-swap effect `354-364`, `toggleElim`/reasonMenu `1808-1824` | **MED-HIGH** | `buildTimeline` + draft machinery are outcome-clean. Outcome lives entirely in the page (not the hook). `outcome:false` simply omits the result-side handlers. |
| R3 | Two annotation stores (Break `annotations` + per-stage `stageAnnotations`) | `245`, `676-682` | MED | Hook owns both via `activeAnnotations` seam; preserve verbatim. |
| R4 | `elimPos` has **no live writer** (carried, cleared only in `removePlayer`) | schema | LOW | Carry verbatim — do NOT "fix" during extraction (behavior-preserving). |
| R5 | `obstacleShots`/`zoneObstacleShots` legacy read-only | `1665`, render `2721` | LOW | Preserve read, never write (as today). Excluded from tactic. |
| R6 | TacticPage-only `bumpShots` (2nd-position shot) + per-bump `curve` not in scout draft | `TacticPage 259-289` | LOW | OPEN Q2: drop (align to scout) or keep as a tactic-only extension. |

**Parity proof (Stage-1 gate artifact):** a **characterization/golden-master harness** —
record current MatchPage draft outputs over a battery of capture sequences (place → menu →
runner/shot/zone/bump, both teams, side-swap, all stages, endgame→outcome), assert the hook
reproduces them **byte-identical**. First mismatch ⇒ stop and re-plan (the non-negotiable).

---

## 5. Reuse ledger (no extraction needed)

`pointPhases.js`, `StageSwitcher`, `ReasonRadial` (+`ELIM_REASONS`), `QuickShotPanel`
(**unified** mode), `InteractiveCanvas` (+ inline `InteractiveChrome` toolbar), `ShotDrawer`,
the draw stack (`DrawingOverlay`/`DrawToolbar`/`drawStrokes`), and the dataService serializers
(`shotsToFirestore`/`quickShotsToFirestore`/…) are **already shared and reused as-is**.
TacticPage already drives `InteractiveCanvas` + the draw stack, so the surface is proven.

---

## 6. Open questions for Jacek (GATE)

- **Q1.** Legacy single-arrangement tactic → maps into `phases.breakout` (buzzer positions) or
  `phases.preBreakout` (line setup)? Recommend **breakout** (matches point keyframe-#0).
- **Q2.** `bumpShots` (the "Shot 2nd" from a bump) + per-bump `curve` are TacticPage-only and
  absent from the scout draft. Drop them to align to the single shared schema, or keep as a
  tactic-only extension on the engine? Recommend **drop** (one schema, zero drift) unless the
  2nd-position shot is wanted in tactics.
- **Q3.** Confirm the hook owns draft+handlers+serialize ONLY, and that `savePoint`/`SaveSheet`/
  outcome stay in MatchPage verbatim (the cut line in §0). This is the core risk decision.

**On GO:** Stage 1 = extract `useCaptureDraft`, MatchPage consumes it, characterization harness
proves parity (fail-first). MatchPage stays functionally identical. → GATE before Stage 2.
