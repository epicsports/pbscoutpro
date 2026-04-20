# CC_BRIEF_BUGFIX_PRE_SATURDAY_1

> **Archived 2026-04-21** after delivery (merge `0c39e52`, commits `07391a4` + `ada6936`).
> Brief was delivered in chat (not transit through `docs/ops/cc-tasks/`); preserved here as reasoning artifact per § 37.1.

**Context:** Jacek plays + coaches + scouts at weekly NXL practice match **Saturday 2026-04-25**. This brief covers three issues from post-merge test sweep 2026-04-20, ordered by criticality: F3 (BLOCKER crash), G2 (auto-swap), G1 (skull cosmetic). All three land in `MatchPage.jsx` / `FieldCanvas.jsx` / `drawPlayers.js` surface area, so grouping into one commit OR three sequential commits is fine — your call.

**Branch:** `fix/bugfix-sprint-pre-nxl-saturday` off `main`

**Deploy urgency:** F3 must be in prod by **Wednesday EOD** (Jacek will validate on iPhone before Saturday). G2 + G1 can ride in same PR.

---

## Part 1 — F3: Nested arrays crash on "zakończ punkt" (BLOCKER)

### Symptom (user report, verbatim)

> Wciśnięcie "zakończ punkt" daje error: `addDoc() called with invalid data. Nested arrays are not supported`

### Root cause

Firestore does not accept nested arrays as field values. The save pipeline for quick-logging / quick-scouting mode is passing an array-of-arrays somewhere. Historical precedent: `shots` had the same issue before being converted to object-map format (see `docs/DESIGN_DECISIONS.md` §2.4: *"Shots: Firestore object (not array) — crash was fixed by handling object format"*).

### Where to look

The crash happens on **quick scouting mode** save path, NOT the full canvas save path. Full canvas scouting works in production. So the divergence is between `QuickLogView.jsx` + training-mode save helper vs. `MatchPage.jsx` full-scouting save.

Suspect locations (investigate in this order):

1. **`src/components/QuickLogView.jsx`** — the zone picker (§ 19 + § 20 in DESIGN_DECISIONS) added `quickShots: { "0": ["dorito","center"], ... }`. Check if recent changes pass `quickShots` as array-of-arrays instead of object-of-arrays when the save shape is built.
2. **`src/services/dataService.js`** — training point save helpers (`addTrainingPoint` or similar). The shape passed to `addDoc` must be scalar-only; any array-typed field must contain only primitives, never nested arrays.
3. **`src/pages/MatchPage.jsx`** onSavePoint in quick-log branch — check if `players: [[x,y], [x,y], null]` gets serialized where Firestore expects `{ "0": {x,y}, "1": {x,y}, ... }`.
4. **`obstacleShots` field** (DESIGN_DECISIONS § 29) — same pattern as `quickShots`. If obstacleShots was added later than quickShots, it may have skipped the object-map conversion.

### Diagnostic strategy

1. Reproduce locally: start a training session → matchup → "Quick scout point" → mark result + eliminations → tap "Zakończ punkt". Error should fire in dev console with the exact field path (Firestore usually says `Cannot use 'nested' array at 'field.subfield'`).
2. The error message tells you exactly which field is broken. **Do not guess before reproducing.**
3. Once the field is identified, convert the array-of-arrays to one of these shapes depending on semantic:
   - **Object-keyed map** (preferred for per-player data): `{ "0": {...}, "1": {...} }` — matches existing `shots`/`quickShots` pattern
   - **Flat array of objects**: `[{playerId: 0, coords: {x,y}}, ...]` — only if order matters and indexing doesn't

### Acceptance criteria

- [x] "Zakończ punkt" in training quick-scouting saves without error
- [x] Resulting point document visible in Firestore Console (`workspaces/{slug}/trainings/{tid}/matchups/{mid}/points/{pid}`)
- [x] Point re-opens correctly (no data loss on re-read)
- [x] Player Stats Page still aggregates training points correctly after fix
- [x] If the fix touches an existing array-of-arrays field that may have old data in prod, write a migration helper (read → convert → write) OR gracefully handle both shapes in the reader. **Do NOT break historical data.**

### Testing

- Manual: Jacek will run on iPhone + desktop before merge
- Automated: if there is an existing Jest/Vitest test for save path, extend it with the broken shape as a regression test. If not, skip (don't build infra for one test).

### Do NOT

- Do NOT touch full canvas scouting save path — it works.
- Do NOT refactor `coachingStats.js` or heatmap aggregation while here — out of scope.
- Do NOT add logging / Sentry breadcrumbs to "improve observability" — scope is fix, not observability.

---

## Part 2 — G2: Auto-swap sides on winner selection

### Symptom (user report)

> Po oznaczeniu wyniku punktu + kto zdobył — "Next point" NIE wybiera automatycznie "SWAP SIDES", a powinna.

### Canonical spec

`docs/PROJECT_GUIDELINES.md` § 2.5 Scouting, line ~139:

> **Auto swap sides:** when winner is selected (win_a / win_b), "Swap sides" toggle auto-selects. Timeout/clear resets to "Same". User can still override manually.

This behavior was disabled in the 2026-04-15 Opus direct session (DEPLOY_LOG: *"Auto-swap after save: disabled (was auto-enabling 'Swap sides' on winner selection)"*). That was over-corrective. This brief restores the §2.5 intent.

### Exact semantics

When user taps outcome in save sheet:

| Outcome selected | "Swap sides" toggle state |
|---|---|
| `win_a` (home team scored) | auto-flips to **Swap** |
| `win_b` (away team scored) | auto-flips to **Swap** |
| `timeout` | resets to **Same** |
| `no_point` / clear | resets to **Same** |
| User manually toggles after auto-flip | respects user override until outcome changes again |

The toggle remains visible and user can manually override. Auto-flip only fires on *change of outcome selection*, not on every re-render.

### Implementation notes

- The `nextFieldSideRef` / `swapSides` state in `MatchPage.jsx` is already wired to the save flow (per BUG-1 fix April 13). You are re-enabling the auto-flip hook on outcome change, not rewriting the swap machinery.
- Check `onOutcomeChange` (or equivalent) handler in save sheet — likely where the disable landed.
- Make sure the concurrent scouting path still works: `match.currentHomeSide` is source of truth, `lastSyncedHomeSideRef` guards against re-fire. Do not regress BUG-1.

### Acceptance criteria

- [x] Save sheet opens → user taps "Team A won" → "Swap sides" toggle turns ON
- [x] User taps "Team B won" → swap stays ON (both elimination outcomes flip)
- [x] User taps "Timeout" → swap returns to OFF
- [x] User manually toggles swap OFF after win_a → stays OFF (no re-auto-flip on same outcome)
- [x] User changes outcome win_a → timeout → win_a again → swap auto-flips back ON
- [x] On save, the next point inherits the flipped fieldSide correctly (verify via base indicator pills)
- [x] Concurrent scouting (2 coaches): BUG-1 toast `⇄ Sides swapped` still fires for the other coach

### Test path

Jacek will validate on iPhone in tournament mode. Training mode auto-swap should work identically.

---

## Part 3 — G1: Skull icon for all eliminated players

### Symptom (user report)

> Gdy gracz trafiony, pokazuje się mały "x" — zamień na małą czaszkę 💀

### Current state

Per NEXT_TASKS.md: *"runner visualization (▲/●), eliminated markers (✕)"*. Per CLAUDE.md: *"Runner+eliminated = triangle with skull"*. So skull already renders when a runner gets hit — extend to all eliminated players.

### Change

In `src/components/field/drawPlayers.js`:

- Find the branch that renders `✕` on eliminated non-runner players (the gun-up / ● circle case).
- Replace with 💀 emoji rendered via Canvas 2D text (`ctx.fillText('💀', x, y)` or equivalent — match whatever technique runner+eliminated uses for consistency).
- Font size: match the current ✕ render size (probably 12-14px). If skull looks crowded at that size, bump slightly — user preference noted in § 1.2 that emoji icons render reasonably at 16px+.
- Verify rendering on both retina and non-retina.

### Acceptance criteria

- [x] Eliminated gun-up player (●) → 💀 overlay
- [x] Eliminated runner (▲) → 💀 overlay (no regression — already worked)
- [x] Kill cluster heatmap (DESIGN_DECISIONS § 1.5) still uses 💀 — no change here
- [x] Skull is legible at player circle size (20-30px container) on iPhone
- [x] Heatmap view: eliminationPositions rendering unchanged (this change is for scouting canvas only, not heatmap)

### Do NOT

- Do NOT change the shape of the underlying player circle/triangle
- Do NOT change alive-player rendering
- Do NOT touch `drawQuickShots.js` or zone rendering

---

## Delivery notes (added at archive time)

- F3: fix was one line — `src/pages/MatchPage.jsx:728` `Array(5).fill([])` → `{}`. Inline shape in the tournament quick-log branch had drifted from `pointFactory.baseSide`. `shotsFromFirestore` reader already permissive (array/object/null), no migration needed.
- G2: root of the over-correction was a 3-line `useEffect(() => setSideChange(false), [outcome])` in `MatchPage.jsx` ~lines 189-193. Replaced with conditional set (`true` for win_a/win_b, `false` otherwise), keyed on outcome so user override persists.
- G1: shipped in two commits. First (`07391a4`) rewrote `drawElimMark` wholesale — bigger disc, translucent, no red ring — user flagged visual drift. Follow-up (`ada6936`) restored original backdrop + red ring, kept only the glyph swap (✕ → 💀 at fontPx = sz * 1.6).

## Cross-cutting: § 27 self-review (post-delivery)

```
§ 27 self-review:
Color discipline: PASS (no hardcoded hex added; removed two — the red ✕ diagonals are gone)
Elevation:        PASS (no UI layer changes)
Typography:       PASS (14px skull > 8-9px minimum; actual glyph ~12.8px fits original disc size)
Cards:            PASS
Navigation:       PASS
Anti-patterns:    ZERO
Verdict:          READY TO COMMIT (delivered)
```

## Commits

- `07391a4` — `fix(scouting): pre-NXL-Saturday bugfix sprint — F3 nested arrays + G2 auto-swap + G1 skull`
- `ada6936` — `fix(canvas): preserve original elim-marker styling, only swap ✕ → 💀`
- `0c39e52` — `merge: bugfix sprint pre-NXL Saturday (F3 nested arrays + G2 auto-swap + G1 skull)`
