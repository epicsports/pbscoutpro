# CC_BRIEF_BUGFIX_PRE_SATURDAY_6

> **Archive:** shipped in commit `bc6954d`, merged to main 2026-04-21. Resolves Bug B from 43-step repro.

**Context:** Fix X — narrow the "joinable point" search condition in `savePoint` so that a `status='scouted'` point is never chosen as a join target for a new save. Data-corruption bug: scouting a fresh Team B point routes the write into an existing Ballistics-only point instead of creating the intended partial/empty shell.

**Branch:** `fix/narrow-joinable-condition` off `main`

**Deploy urgency:** 🔴 **Saturday blocker.** Scouting Team B in a match where Team A was already fully scouted silently overwrites the A team's `awayData` slot. Must be in prod before weekly NXL match 2026-04-25.

**Diagnostic reference:**
- Static analysis from CC (`diagnostic/bug-b-instrumentation` @ `724abee`, lines 892-915 pre-diagnostic-merge)
- 43-step user repro 2026-04-21: 4 Ballistics points saved (status='scouted'), then scout ALA → data lands in old Ballistics points in reverse order

---

## Problem

### Buggy condition

```js
const joinable = [...points].reverse().find(p => {
  if (p[mySide]?.players?.some(Boolean)) return false;
  return p.status === 'open'
    || p.status === 'partial'
    || p[otherSide]?.players?.some(Boolean);   // ← tautology trap
});
```

A `scouted` point per § 18 is terminal: *"both sides have player data."* That means `otherSide.players.some(Boolean) === true` is tautologically true for any scouted point. The third OR matches them all. Fresh Team B saves were routed into existing Team A-only points.

### 43-step failure trace

1. 4 points saved by Ballistics in solo scouting. All `status='scouted'`, `homeData.players.length > 0`, `awayData` empty.
2. User clicks "Scout › ALA" from match review to scout point 5.
3. `editingId === null` (fresh save, not edit).
4. Reverse search finds point 4 first: `awayData` empty ✓ → `otherSide` has Ballistics players ✓ → joinable=point4.
5. Save writes ALA data into point 4's `awayData`, `setEditingId(point4.id)`.
6. User perceives: "data disappeared from point 5."
7. Next "Scout › ALA" reset + fresh save lands in point 3, then point 2, then point 1. Cascade.

### Why `scouted` is never legitimate as join target

Per § 18: `'open' | 'partial' | 'scouted'` status state machine. Scouted is terminal — joining into it is overwrite, not collaboration. The third OR was either dead code or unintended coverage of the scouted case. Chess-model concurrent legitimately uses `status='partial'` for one-sided-in-progress.

---

## Fix

### Change

`src/pages/MatchPage.jsx:L944` (was ~L898 pre-diagnostic-merge):

```diff
- return p.status === 'open' || p.status === 'partial' || p[otherSide]?.players?.some(Boolean);
+ return p.status === 'open' || p.status === 'partial';
```

Plus 3-line WHY comment referencing § 18.

### Chess-model safety

Step (2) of chess flow (*Coach B joins Coach A's partial point*) still works — `status === 'partial'` clause still matches. Removed OR was redundant for that scenario.

### Status machine sanity (checked, not modified)

`savePoint` concurrent branch correctly computes `bothSidesHave` per point to transition `scouted` only when both sides populated. QuickLog path hardcodes `status='scouted'` even for one-sided saves (`MatchPage.jsx:L759`) — that's the mechanism by which Ballistics' points reach `scouted` state with empty `awayData`. Separate bug, out of scope.

---

## Known duplicate (NOT fixed this PR)

**`startNewPoint` at `MatchPage.jsx:L840`** has the identical buggy OR clause in the "+ Add Point" flow. Same root cause, different user action trigger. Out of brief scope per strict instruction. Follow-up Brief 7 if Jacek wants symmetric fix — single-line mirror.

## Out of scope

- Fix Y (fieldSide rendering + G2 auto-swap firing on editPoint-hydrated outcome) — different brief, different code path
- `editingId` handling — unchanged
- Auto-attach effect — unchanged
- URL effect — unchanged
- `editPoint` function — unchanged
- Status computation in `dataService.js` — unchanged (sanity-check only)
- Diagnostic logging from `724abee` — retained in prod for this fix's validation; separate cleanup PR later

## Acceptance criteria

- [x] L944 condition updated — third OR removed
- [x] Only condition: `p.status === 'open' || p.status === 'partial'`
- [x] `mySide has data` guard unchanged
- [x] Build clean (`npx vite build`)
- [x] Precommit clean
- [ ] Manual iPhone validation — pending 2026-04-25

## iPhone validation scenario

1. **Setup:** scout Ballistics 3-4 points via QuickLog (or Scout) with winner picks. Verify in Firestore: each has `homeData.players > 0`, `awayData` empty, `status='scouted'`.
2. **Scout fresh ALA:** match review → "Scout › ALA" → place 5 players → save.
3. **Verify routing:** NEW doc in Firestore with `awayData.players > 0`, `homeData` empty, `status='partial'`. Ballistics points 1-4 **untouched**.
4. **Failure signal:** if any of points 1-4 gained `awayData.players` — fix didn't work.
5. **Diagnostic signal:** `[BUG-B] joinable search ... : no match` on first ALA save console output. NOT `joinable.id=<ballistics_id>`.
6. **Chess-model regression (if 2-coach):** partial-joined save still routes to the same point.

---

## Shipped

- Commit: `bc6954d` — `fix(scouting): narrow joinable condition — only open/partial eligible`
- Merge: 2026-04-21 (main)
- Deploy: via `npm run deploy` → GitHub Pages
- Files: `src/pages/MatchPage.jsx` (+5/-2)
- Documentation: DEPLOY_LOG 2026-04-21 entry
