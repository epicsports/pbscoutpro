# CC_BRIEF_BUGFIX_PRE_SATURDAY_9

> **Archive:** shipped in commits `a872782` (Bug 1 + Bug 3) + `65082aa` (Bug 2), merged 2026-04-21 via `fix/brief-8-polish`.

**Context:** Brief 8 deployed (per-coach streams + end-match merge). 2-device test (Jacek + biuro incognito) on match `rzj1EYtDWjD0i54WtWnp` revealed 3 bugs. Architecture works (merge creates canonical correctly, sourceDocIds wired); UI/UX polish needed.

**Branch:** `fix/brief-8-polish` off `main`
**Diagnostic reference:** 2-device test 2026-04-21 22:54-23:08; Firestore confirmed 6 docs (4 per-coach partials + 2 _merged canonical).

---

## Bug 1 — Canonical docs invisible post-End-match

**Symptom:** After End match, `_merged_001`/`_merged_002` exist with `canonical: true, status: 'scouted'`, match has `merged: true`, match list shows 1:1 FINAL — but match review heatmap shows 0:0, 0 POINTS.

**Root cause (contrary to brief's initial "missing index" hypothesis):** `subscribePoints` queries with `orderBy('order', 'asc')`. Firestore excludes docs missing the orderBy field from results. `endMatchAndMerge`'s `batch.set(canonicalRef, ...)` omitted `order`. Source docs (which had `order: Date.now()` from save) were visible; canonical docs were silently filtered out server-side; client-side `canonical===true` filter matched zero.

**Fix:** write `order: Date.now() + i` on canonical doc creation. Sorts after source docs (later timestamps), preserves canonical index order via `+i`. No Firestore index change needed — filter stays client-side.

## Bug 3a — `match.currentHomeSide` still flipping on mode=new saves

**Symptom:** Per-coach streams (Brief 8) don't share fieldSide, yet `match.currentHomeSide` was still mutated on every winner-save, triggering Bug 3b toast on the other device.

**Root cause:** Brief 7 added `!editingId` guard to post-save flip, but new-save path with `mode=new` was unguarded. Flip executed on every fresh mode=new save with a winner.

**Fix:** extend guard to `!editingId && mode !== 'new'`. Firestore updateMatch + `lastSyncedHomeSideRef` update skip for per-coach paths. Local `changeFieldSide` still fires — next-point orientation convenience.

## Bug 3b — False-positive "sides swapped by other coach" toast

**Symptom:** Every save by one coach with a winner triggered toast on the other: `⇄ Sides swapped — other coach flipped orientation`.

**Root cause:** Sync effect on `match.currentHomeSide` change fires toast. Designed for chess-model lock; per-coach streams make the notification noise. Bug 3a stops writes; 3b stops the display.

**Fix:** remove `setToast + setTimeout` from sync effect. Keep local `changeFieldSide` sync for correctness on rare legacy flips. `isInitialSync` retained as `void` placeholder if needed later.

## Bug 2 — Score desync across devices (Option A)

**Symptom:** Jacek saw 2:0, biuro saw 0:1, match list saw 1:1 — all different, none correct. Display path mapping showed:
- MatchPage scoreboard: `matchScore(points)` local compute from **filtered** `points` (per-coach)
- MatchCard / lists / teamStats: `match.scoreA/B` field — race-overwritten
- Writers (savePoint, QuickLog, delete, training): computed from filtered points → wrote subset → last-write-wins

**Option A resolution (per Jacek GO):** match.scoreA/B authoritative only post-merge.

**Removed writers:**
- `MatchPage.jsx` L806-809 (QuickLog inline save)
- `MatchPage.jsx` L1104-1110 (savePoint post-tracked)
- `MatchPage.jsx` L1206-1212 (handleDeletePoint)
- `TrainingScoutTab.jsx` L141-143 (training QuickLog save)

**Retained writers:**
- `MatchPage.jsx` L1803 (clearAll → 0:0)
- `dataService.createMatch` L553-554 (initial 0:0)

**Authoritative compute added:**
- `endMatchAndMerge`: `countOutcome(outcome)` accumulator walks legacy/solo/merged/leftover canonical docs as batch is built. Match doc update writes `scoreA/scoreB` alongside merged/mergeStats. Empty-match branch writes 0:0.
- `endMatchupAndMerge`: training analog — counts canonical outcomes in single-coach mark loop, writes matchup.scoreA/B.

**Intentional trade-off:** match lists show 0:0 for active matches until End match. Live score only on in-match scoreboard (own stream, per-device).

---

## Out of scope

- Re-running End match on already-merged matches — idempotency guard blocks. Follow-up: "recompute" trigger that re-runs score compute without re-processing canonical creation.
- Live match list score during active matches — Option Y (unfiltered raw subscribe + writer) is the alternative if 0:0-until-end is unacceptable.
- Cleanup of `[BUG-B]` + `[BUG-C]` diagnostic logs — kept for Brief 9 validation.

## Acceptance

- [x] Bug 1: Canonical docs visible post-End-match; heatmap shows 2 points with both sides merged
- [x] Bug 2: Match list 0:0 during active matches; snap-to-canonical score post-merge; per-device scoreboard reflects own stream
- [x] Bug 3: No false-positive flip toast; Firestore `match.currentHomeSide` stable across mode=new saves
- [x] Build + precommit clean
- [ ] iPhone 2-device retest — pending Jacek

## iPhone validation scenario

1. Fresh match, both coaches login
2. Both open match simultaneously
3. Coach A: SCOUT › Team A → save 2 points (win_a, win_b)
4. Coach B: SCOUT › Team B → save 2 points (matching)
5. **During match:**
   - Coach A scoreboard: 1:1 (own stream)
   - Coach B scoreboard: 1:1 (own stream)
   - **Match list: 0:0** (intentional)
   - No false toast
   - Firestore `match.currentHomeSide` unchanged
6. Coach A taps End match
7. **Post-merge:**
   - Both scoreboards: 1:1
   - Match heatmap: 2 canonical points with both sides
   - Match list: 1:1 FINAL

## Shipped

- Commits: `a872782` (Bug 1 + 3), `65082aa` (Bug 2)
- Merge: 2026-04-21
- Files: `src/services/dataService.js`, `src/pages/MatchPage.jsx`, `src/components/tabs/TrainingScoutTab.jsx`
- Documentation: DEPLOY_LOG 2026-04-21 entry
