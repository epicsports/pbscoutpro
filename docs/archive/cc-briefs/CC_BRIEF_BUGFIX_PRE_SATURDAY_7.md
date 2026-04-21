# CC_BRIEF_BUGFIX_PRE_SATURDAY_7

> **Archive:** shipped in commit `17cd6e5`, merged to main 2026-04-21. Resolves Problem Y. See DESIGN_DECISIONS § 41 + PROJECT_GUIDELINES § 2.5 clarifier.

**Context:** Fix Y — stop `match.currentHomeSide` from flipping when user saves an edit of an existing point. Rendering bug where opening a saved point, pressing save (even without changes), and returning made canvas render the same data on flipped side. Workaround "scout only new, never edit" didn't work because flip also triggered on new-point edit-after-first-save.

**Branch:** `fix/guard-edit-flip` off `main`
**Deploy urgency:** 🔴 Saturday blocker (2026-04-25 NXL match)
**Diagnostic reference:** CC's 5-setter analysis (A-E) + [BUG-B] prod log 2026-04-21 showing point `1imySsDDYy1...` re-entered 3× with identical payload but visual flips

---

## Problem background

Two concepts, both semantically necessary, bleeding into each other:

| Concept | What it is | When it should change |
|---|---|---|
| `point.{homeData,awayData}.fieldSide` | Historical snapshot: which side team X was on when this point was scouted | Never. Frozen at save. |
| `match.currentHomeSide` | Live pointer: which side team A is on right now | After new-point save with winner (paintball § 2.5) |

For **new point scouting**: `match.currentHomeSide` is correct source. After save with winner, auto-swap flips it, next new point inherits. ✓

For **editing existing point**: `match.currentHomeSide` is wrong source — represents present, not past. Edited point has its own historical `fieldSide` snapshot from when scouted.

### Observed failure from [BUG-B] log 2026-04-21

User editing `1imySsDDYy1Rz5gM6nEW` (status='partial', awayData populated):

```
13:58:32 editPoint fires — reads pt.awayData.fieldSide='right', seeds UI correctly
13:59:39 save — writes updatePoint with fieldSide='right', but post-write auto-swap
         flips match.currentHomeSide (outcome was set)
13:59:41 navigate back → URL effect reads NEW currentHomeSide → sets UI flipped
         BEFORE editPoint can re-fire and correct
13:59:43 save again — payload fieldSide='right' stable, but canvas renders flipped
```

Net: Firestore data correct (`fieldSide='right'` preserved). Live UI wrong. Each cycle compounded.

### CC's 5-setter analysis

| # | Location | Source | Edit-time verdict |
|---|---|---|---|
| A | `MatchPage.jsx:L496-502` URL effect | `match.currentHomeSide` | Bug when pointParamId present |
| B | `MatchPage.jsx:L553-568` sync effect | `match.currentHomeSide` | Guarded `if (editingId) return;` ✓ |
| C | `MatchPage.jsx:L714-716` URL fallback | `match.currentHomeSide` | Suspect dead code |
| D | `MatchPage.jsx:L1110-1126` editPoint | `pt.{homeData,awayData}.fieldSide` | Correct ✓ |
| E | `MatchPage.jsx:L1067` post-save flip | Flips local + Firestore | **Root cause** |

Root cause chain:
1. E flipped `currentHomeSide` on every save with winner, including edit saves
2. Navigate-back triggered A to read polluted value
3. React effect ordering: A fired before D could correct
4. Result: UI paints wrong side; D may or may not correct depending on race

---

## Fix — defense-in-depth (Guards 1 + 2)

### Guard 2 — state-intent layer (L202-212)

```diff
 useEffect(() => {
+  // Fix Y: editing existing point must not re-arm swap intent — editPoint
+  // hydrates `outcome` from Firestore and that should not be treated as a
+  // winner pick. Auto-swap fires only for new-point scouting (§ 2.5).
+  if (editingId) return;
   if (outcome === 'win_a' || outcome === 'win_b') {
     setSideChange(true);
   } else {
     setSideChange(false);
   }
-}, [outcome]);
+}, [outcome, editingId]);
```

Cleanly separates "user picked winner" from "Firestore-restored outcome".

### Guard 1 — write-path layer (L1066)

```diff
 setSaving(false);
+// Fix Y: edit saves never mutate match.currentHomeSide — the edited point's
+// own {homeData,awayData}.fieldSide snapshot is authoritative for its
+// rendering. Auto-swap fires only on new-point save with a winner.
-if (shouldSwapSides && isConcurrent) {
+if (shouldSwapSides && isConcurrent && !editingId) {
```

`editingId` closed-over from savePoint invocation time — `resetDraft()`'s async `setEditingId(null)` doesn't mutate scope.

### Why both

| Scenario | G1 only | G2 only | Both |
|---|---|---|---|
| Edit, save, winner still set | ✓ | ✓ | ✓ |
| Manual swap-pill toggle in edit save sheet | ✗ flip fires | ✓ pill stays default | ✓ |
| `shouldSwapSides` leaks via shortcut (L1773) | ✗ | ✓ nothing to leak | ✓ |

~3 lines, covers all paths, minimal new logic.

---

## Out of scope

- Fix X (narrow joinable condition) — separate brief (6), separate code path
- `editPoint` at L1110-1126 (setter D) — stays, correct
- URL effect (A), sync effect (B, already guarded), URL fallback (C) — stays
- Auto-swap for new points — unchanged, § 2.5 intact
- FieldCanvas / useField / HeatmapCanvas — unchanged
- Training/solo else-if at L1077 — different semantic, no `match.currentHomeSide` in training
- Shortcut button at L1773 — not enumerated in A-E; brief explicit about L1067 only
- Diagnostic logs from `724abee` — retained in prod for validation; separate cleanup PR later

## Acceptance criteria

- [x] L1067 area has `&& !editingId` predicate added
- [x] L202 effect has `if (editingId) return;` top
- [x] G2 effect deps include `editingId`
- [x] No other setters (A, B, C, D) modified
- [x] No rendering code modified
- [x] Build clean, precommit clean
- [ ] iPhone empirical validation — pending 2026-04-25

## iPhone validation scenarios

1. **New-point regression:** scout new point + winner + save → next new-point UI shows flipped side. Firestore `currentHomeSide` flipped. ✓ G2 intact.
2. **Edit core fix:** open saved point with winner → save (no changes) → Firestore `currentHomeSide` **unchanged**; re-open → same orientation. 3× save → stable.
3. **Multi-entry repro (Jacek's):** open `1imySsDDYy1...`, save × 3 exits and re-entries → orientation stable across all, `currentHomeSide` stable.
4. **Diagnostic signal:** no new `[BUG-B]` output for flip — just confirm absence of `updateMatch(currentHomeSide)` writes on edit saves.
5. **Chess-model (skip if single-coach):** Coach B's edit of Coach A's partial doesn't perturb match state.

---

## Shipped

- Commit: `17cd6e5` — `fix(scouting): guard auto-swap flip from edit saves`
- Merge: 2026-04-21 (main)
- Deploy: via `npm run deploy` → GitHub Pages
- Files: `src/pages/MatchPage.jsx` (+9/-2)
- Documentation: DESIGN_DECISIONS § 41, PROJECT_GUIDELINES § 2.5 clarifier, DEPLOY_LOG 2026-04-21 entry
