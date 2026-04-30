# CC_BRIEF — § 57 Phase 1a: Foundation (additive schema + writers)

**Status:** approved 2026-04-30 by Jacek for execution before niedzielny sparing 2026-05-03
**Branch:** `feat/observations-foundation`
**Estimated effort:** ~1.5 days CC (3 small commits with Jacek checkpoint between each)
**Risk profile:** ZERO impact on current behavior — purely additive schema + parallel writes to new fields
**Author:** Opus (chat session 2026-04-30)

---

## Goal

Ship the **foundation half** of § 57 Phase 1: schema extensions + every existing writer populating `_meta` siblings alongside their existing field writes. Niedzielny sparing then generates data in the new format, ready for Phase 1b (propagator) post-sparing analysis.

**What we ship:** schema fields + provenance metadata at write time.
**What we DO NOT ship:** propagator, matcher, conflict resolver, write-back, late-log trigger. Those are Phase 1b, deferred.

---

## Reference

- Full spec: `docs/DESIGN_DECISIONS.md` § 57 (merged to main 2026-04-30, commit `4cadf41`)
- Master index: `docs/architecture/MULTI_SOURCE_OBSERVATIONS_INDEX.md`
- Schema diagram: `docs/architecture/diagrams/multi_source/02_data_structure_l2.svg`
- Data flow diagram: `docs/architecture/diagrams/multi_source/03_data_flow_l3.svg`

Read § 57.3 (Schema extensions) + § 57.7 (Conflict rules) before starting. § 57.5–57.7 describe the propagator — **DO NOT IMPLEMENT** that part in this brief.

---

## Workflow

Three commits, each pushed separately. **Jacek checkpoint between each.** CC stops after pushing each commit, reports back, waits for GO before next.

```
1.1 schema foundation     → push → Jacek GO → 1.2
1.2 writers W1-W4         → push → Jacek GO → 1.3
1.3 writers W5-W7         → push → Jacek GO → merge to main
```

Final merge per project convention (memory #14, DEPLOY_LOG.md): plain git, no PR, no gh CLI.

```powershell
git checkout main
git pull origin main
git merge --no-ff feat/observations-foundation -m "<merge msg>"
git push origin main
# DEPLOY_LOG entry → push
git branch -d feat/observations-foundation
git push origin --delete feat/observations-foundation
```

`npm run deploy` IS needed (this is code change, not docs-only). Verify on production after deploy.

---

## Commit 1.1: Schema foundation (~3h)

### Scope

Add new fields to `pointFactory` and `selfReport` schemas. Add `bunkerToPosition()` utility. No writes to new fields yet — that comes in 1.2/1.3.

### STEP 1 — Locate `pointFactory.baseSide()`

```bash
grep -rn "baseSide\|pointFactory" src/utils/pointFactory.js
```

Find where the per-side data structure is initialized. Should be a function returning `{assignments, players, shots, eliminations, ...}` for either home or away side.

### STEP 2 — Extend `baseSide()` with new fields

Add to the returned object:

```javascript
slotIds: Array.from({length: 5}, () => crypto.randomUUID()),
playersMeta: [null, null, null, null, null],
shotsMeta: [null, null, null, null, null],
eliminationsMeta: [null, null, null, null, null],
```

Notes:
- `crypto.randomUUID()` is available in all modern browsers (Chrome 92+, Safari 15.4+, Firefox 95+) — PbScoutPro target browsers are all newer than that.
- `null` defaults are correct: existing readers ignore these fields. Writers in 1.2/1.3 fill them in.
- `slotIds` is generated ONCE at point creation. Stable across edits. Each side has its own slotIds (homeData.slotIds and awayData.slotIds are independent).

### STEP 3 — Verify existing readers do not break

```bash
grep -rn "\.slotIds\|playersMeta\|shotsMeta\|eliminationsMeta" src/
```

Should return zero matches except in `pointFactory.js` after your edit. If any reader references these fields, **STOP** [ESCALATE TO JACEK] — schema name collision means someone already started this work.

### STEP 4 — Locate `dataService` createSelfReport

```bash
grep -rn "createSelfReport\|selfReports" src/services/dataService.js
```

Find the function that writes to `players/{pid}/selfReports/`.

### STEP 5 — Extend selfReport schema

In the payload object passed to `addDoc`, add:

```javascript
slotRef: null,           // {pointId, slotId} when propagator binds, else null
propagatedAt: null,      // serverTimestamp when propagator processes, else null
```

These are written as `null` for now. Phase 1b propagator updates them. Existing PPT/HotSheet/KIOSK code does not need to know about these fields yet.

### STEP 6 — Create utility `src/utils/bunkerToPosition.js`

```javascript
/**
 * Convert bunker centroid to a player position, offset slightly toward
 * the team's base. Used by propagator (Phase 1b) to derive synthetic positions
 * from self-log breakout selections.
 *
 * @param {object} bunker - Bunker doc from layout.bunkers
 * @param {'left'|'right'} fieldSide - Team's starting side per point
 * @returns {{x: number, y: number} | null}
 */
export function bunkerToPosition(bunker, fieldSide) {
  if (!bunker || typeof bunker.x !== 'number' || typeof bunker.y !== 'number') {
    return null;
  }
  const offset = 0.02;
  const dx = fieldSide === 'left' ? -offset : +offset;
  return { x: bunker.x + dx, y: bunker.y };
}
```

Add unit-style sanity check by importing it in one console.log call somewhere (or skip — Phase 1b will exercise it).

### STEP 7 — Verification

```bash
npm run precommit  # must pass
```

Smoke check on dev:
1. Open MatchPage, create a new point
2. Open Firestore console, find the new point document
3. Confirm presence of `homeData.slotIds` (array of 5 UUIDs), `homeData.playersMeta` (array of 5 nulls), same for shotsMeta, eliminationsMeta
4. Confirm `awayData.slotIds` are DIFFERENT UUIDs from `homeData.slotIds` (independent per side)
5. Confirm existing point readers (heatmap, insights, coachingStats) still render — open ScoutedTeamPage with this matchup, all sections render normally

### STEP 8 — Commit

```bash
git add src/utils/pointFactory.js src/utils/bunkerToPosition.js src/services/dataService.js
git commit -m "feat(observations): § 57 Phase 1a.1 schema foundation

- pointFactory: add slotIds (5 UUIDs per side), playersMeta/shotsMeta/eliminationsMeta arrays (5 nulls each)
- selfReport: add slotRef + propagatedAt fields (null defaults)
- new utility bunkerToPosition() — used by Phase 1b propagator

Additive only. No existing reader/writer behavior changed.
Refs: § 57.3 schema extensions"

git push origin feat/observations-foundation
```

### STEP 9 — JACEK CHECKPOINT

Report back to Jacek:
- Commit SHA
- Confirm verification steps 1–5 passed
- Wait for explicit GO before starting commit 1.2

---

## Commit 1.2: Writers W1–W4 populate `_meta` (~4h)

### Scope

Modify 4 writer paths to populate `_meta` arrays alongside their data writes. Each `_meta` entry has shape:

```javascript
{
  source: 'scout' | 'self' | 'kiosk',
  writerUid: string,                  // auth.currentUser.uid
  ts: serverTimestamp(),              // Firestore sentinel
}
```

**Helper first:** Create `src/utils/observationMeta.js`:

```javascript
import { serverTimestamp } from 'firebase/firestore';

export function makeMeta(source, writerUid) {
  if (!writerUid) {
    console.warn('makeMeta called without writerUid');
  }
  return {
    source,
    writerUid: writerUid || 'unknown',
    ts: serverTimestamp(),
  };
}
```

### STEP 1 — Identify writers in code

Run discovery:

```bash
grep -rn "homeData\|awayData" src/ | grep -E "savePoint|setDoc|updateDoc|addDoc" | head -50
```

You should find write paths in:
- `src/pages/MatchPage.jsx` (W1: scout canvas savePoint)
- `src/components/ShotDrawer.jsx` or similar (W2: shot drawer)
- `src/components/QuickLogView.jsx` (W3: quick log zone-based positions)
- `src/components/selflog/HotSheet.jsx` (W4: HotSheet Tier 1)

If grep returns more or fewer locations than 4 writers, **STOP** [ESCALATE TO JACEK] — writer landscape may have changed since discovery 2026-04-30.

### STEP 2 — W1: Scout canvas savePoint (MatchPage)

Locate the function that builds the `homeData`/`awayData` payload before `setDoc`/`updateDoc`. Typically composes `players: [...]`, `shots: {...}`, `eliminations: [...]`.

For every slot index `i` where `players[i]` is set in this save:
- Set `playersMeta[i] = makeMeta('scout', auth.currentUser.uid)`
- Reset `playersMeta[i] = null` if `players[i] === null` (slot cleared)

Same pattern for `shotsMeta[i]` (when `shots[i]` is written) and `eliminationsMeta[i]` (when `eliminations[i]` is written).

**Important:** if a save only updates some slots (e.g. moves player 2 only), DO NOT clobber `playersMeta` for slots 0, 1, 3, 4. Use dot-notation path writes (`homeData.playersMeta.2`) or merge logic.

### STEP 3 — W2: Shot drawer

When ShotDrawer commits shots for a slot, write `shotsMeta[i] = makeMeta('scout', uid)`.

### STEP 4 — W3: QuickLogView

QuickLogView writes synthetic positions: `{x: 0.30, y: 0.20|0.50|0.80}` based on zone (dorito/center/snake).

Add `playersMeta[i]` per slot, but include the zone:

```javascript
{
  source: 'scout',
  writerUid: uid,
  ts: serverTimestamp(),
  syntheticZone: 'dorito' | 'center' | 'snake',  // marks position as zone-derived, not canvas-tapped
}
```

This zone tag will be useful in Phase 1b for confidence weighting.

### STEP 5 — W4: HotSheet Tier 1

HotSheet writes to two places:
- `point.{home,away}Data.selfLogs[playerId]` (legacy map structure)
- `point/{pid}/shots/{sid}` subcollection

For the first one (selfLogs map), the slot mapping is via `assignments.indexOf(playerId)`. When you find the slot:
- `playersMeta[slot] = makeMeta('self', uid)` (uid = current user, who IS the player here)
- `shotsMeta[slot] = makeMeta('self', uid)` if shots are also being written
- `eliminationsMeta[slot] = makeMeta('self', uid)` if elimination outcome is set

If `assignments.indexOf(playerId) === -1` (player not assigned to this point), **DO NOT** write `_meta` — the data is orphan and Phase 1b propagator handles it.

### STEP 6 — Verification

For each of W1–W4:

1. Trigger the write path in dev (scout canvas, shot drawer, quick log, HotSheet save)
2. Open Firestore console, find the affected point doc
3. Confirm corresponding `_meta` array slots are populated with `{source, writerUid, ts}`
4. Confirm slots NOT touched by this save remain unchanged (no clobbering)

```bash
npm run precommit
```

### STEP 7 — Commit

```bash
git add src/pages/MatchPage.jsx \
        src/components/ShotDrawer.jsx \
        src/components/QuickLogView.jsx \
        src/components/selflog/HotSheet.jsx \
        src/utils/observationMeta.js

git commit -m "feat(observations): § 57 Phase 1a.2 writers W1-W4 populate _meta

- W1 scout canvas (MatchPage): playersMeta + shotsMeta + eliminationsMeta on save
- W2 shot drawer: shotsMeta on shot commit
- W3 QuickLogView: playersMeta with syntheticZone tag
- W4 HotSheet Tier 1: _meta for slot-mapped selfLogs (when assignment matches)
- helper: src/utils/observationMeta.js

No reader behavior changed. Slots not touched by save remain unchanged.
Refs: § 57.3 schema extensions"

git push origin feat/observations-foundation
```

### STEP 8 — JACEK CHECKPOINT

Report:
- Commit SHA
- Verification results for each of W1–W4
- Wait for GO before commit 1.3

---

## Commit 1.3: Writers W5–W7 populate `_meta` (~4h)

### Scope

Three more writers, including the KIOSK edge case and PPT (which writes to selfReports, not point.homeData).

### STEP 1 — W5: KIOSK lobby

KIOSK writes via coach device but on behalf of player tap targets. Source = `'kiosk'`. WriterUid = the player whose tile was tapped (NOT the coach).

Locate KIOSK write paths:

```bash
grep -rn "KioskContext\|kiosk" src/ | grep -E "setDoc|updateDoc|addDoc"
```

For each write path:
- `playersMeta[slot] = makeMeta('kiosk', tappedPlayerId)`
- `shotsMeta[slot] = makeMeta('kiosk', tappedPlayerId)` if shots also written
- `eliminationsMeta[slot] = makeMeta('kiosk', tappedPlayerId)` if elims set

[ESCALATE TO JACEK] if you find KIOSK uses `auth.currentUser.uid` (which would be coach) for `scoutedBy` field — that's a known quirk per discovery report § 11. Document the writerUid choice in commit message but don't change `scoutedBy` semantics.

### STEP 2 — W6: PPT WizardShell (selfReports)

PPT writes to `players/{pid}/selfReports/` collection — orphan reports. Schema additions from commit 1.1 already added `slotRef: null, propagatedAt: null` defaults.

In this commit, PPT does NOT need to write `_meta` arrays (those live on point.homeData, not on selfReports). All PPT needs is the existing schema fields + the new `slotRef:null, propagatedAt:null` defaults.

**This is essentially a verification step, not a code change.** Confirm:
- `WizardShell.handleSave` calls `dataService.createSelfReport` (or equivalent)
- Created selfReport doc has `slotRef: null` and `propagatedAt: null` after commit 1.1 schema extension
- No additional code needed

If the createSelfReport call signature doesn't include the new fields after commit 1.1, **STOP** [ESCALATE TO JACEK] — commit 1.1 was incomplete.

### STEP 3 — W7: Eliminations from MatchPage UI

Find the elimination toggle UI in MatchPage (clicking on a player to mark them eliminated, or toggling stage/reason).

For each elimination write:
- `eliminationsMeta[slot] = makeMeta('scout', uid)` (coach is recording observed elim)

Note: this may overlap with W1 if save flow already covers eliminations. Verify no double-write.

### STEP 4 — Verification

For W5: trigger KIOSK lobby tap on dev, verify Firestore shows `_meta.source: 'kiosk'` with `writerUid` = tapped player's uid.

For W6: trigger PPT save on dev, verify selfReport doc has `slotRef: null` and `propagatedAt: null`.

For W7: mark player eliminated on dev MatchPage, verify `eliminationsMeta[slot]` populated.

```bash
npm run precommit
```

### STEP 5 — Commit

```bash
git add src/contexts/KioskContext.jsx \
        src/components/ppt/WizardShell.jsx \
        src/pages/MatchPage.jsx  # if W7 changes touched it

git commit -m "feat(observations): § 57 Phase 1a.3 writers W5-W7 populate _meta

- W5 KIOSK lobby: _meta with source='kiosk', writerUid=tapped player (not coach)
- W6 PPT WizardShell: verified selfReport now writes slotRef:null + propagatedAt:null defaults
- W7 elimination toggle: eliminationsMeta on scout-marked elims

KIOSK quirk preserved: scoutedBy still references coach uid per § 55 design.
Niedzielny sparing 2026-05-03 will generate full _meta dataset for Phase 1b analysis.
Refs: § 57.3 schema extensions"

git push origin feat/observations-foundation
```

### STEP 6 — JACEK CHECKPOINT

Report:
- Commit SHA
- Verification results for W5, W6, W7
- Wait for GO before merging to main

---

## Final merge (after Jacek GO on commit 1.3)

```powershell
git checkout main
git pull origin main

git merge --no-ff feat/observations-foundation -m "Merge branch 'feat/observations-foundation'

feat(observations): § 57 Phase 1a — schema foundation + writers populate _meta

3 commits:
- Phase 1a.1: schema foundation (slotIds, _meta arrays, slotRef, bunkerToPosition utility)
- Phase 1a.2: writers W1-W4 populate _meta (scout canvas, shot drawer, QuickLog, HotSheet)
- Phase 1a.3: writers W5-W7 populate _meta (KIOSK, PPT verification, elimination toggle)

Additive only. Zero impact on current behavior. Niedzielny sparing 2026-05-03
generates full dataset in new format for Phase 1b propagator analysis.

Refs: § 57 in DESIGN_DECISIONS.md, master index in MULTI_SOURCE_OBSERVATIONS_INDEX.md."

# Capture merge SHA
$merge_sha = git log -1 --format=%h
echo "Merge SHA: $merge_sha"

git push origin main

# DEPLOY_LOG entry (append at top per convention):
```

DEPLOY_LOG entry:

```markdown
## 2026-05-0X HH:MM — § 57 Phase 1a Foundation (feat/observations-foundation)
**Commit:** {merge_sha} (merge) · branch `feat/observations-foundation` · 3 commits
**Status:** ✅ Deployed
**What changed:** Foundation half of § 57 multi-source observations. Schema additions (slotIds, _meta sibling arrays, slotRef, propagatedAt) + every existing writer (W1-W7) populates _meta alongside data writes. bunkerToPosition utility added (used by Phase 1b propagator). No reader behavior changed — _meta arrays invisible to existing 28 readers in generateInsights/coachingStats. Niedzielny sparing 2026-05-03 will generate first full dataset in new format for Phase 1b matcher tuning.
**Known issues:**
- Phase 1b (propagator, matcher, conflict resolver, write-back, late-log trigger) NOT shipped — deferred for post-sparing analysis.
- Bundle size impact ~1KB per point document (5 UUIDs + 3×5 _meta entries) — well within Firestore 1MB doc limit.
- KIOSK writerUid uses tapped player uid (not coach) per § 55.4 — different from scoutedBy field which still uses coach uid.
```

```powershell
git add DEPLOY_LOG.md
git commit -m "docs(deploy-log): record § 57 Phase 1a foundation"
git push origin main

# Cleanup
git branch -d feat/observations-foundation
git push origin --delete feat/observations-foundation

# Deploy
npm run deploy
```

---

## Post-deploy verification (production)

After `npm run deploy`:

1. Open production app, create a new point on dev tournament
2. Open Firestore console, verify new point has slotIds + _meta arrays
3. Trigger one HotSheet self-log, verify selfReport has slotRef:null + propagatedAt:null
4. Open ScoutedTeamPage for affected team, verify all sections render (heatmap, insights, coachingStats)
5. Check Sentry for any new errors related to undefined `_meta` access — should be zero

If anything breaks: rollback per emergency procedure. Schema is additive so rollback to main pre-merge is safe.

---

## Phase 1b backlog (DO NOT IMPLEMENT in this brief)

These are deferred until after niedzielny sparing analysis:

- `useMatchupPropagator()` hook
- `findMatchingPoint()` matcher (assignments + timestamp window logic)
- `resolveFieldConflicts()` per § 57.7 rules
- Mount propagator in MatchPage with onSnapshot watcher on `matchup.status`
- Late-log auto-trigger in `WizardShell.handleSave`
- Backfill legacy points with slotIds (best-effort UUID assignment)

After niedzielny sparing: Opus reviews Firestore data (orphan distribution, assignment-to-self-log timestamp deltas, KIOSK race patterns), tunes matcher logic, ships Phase 1b brief.

---

## Escalation triggers

CC stops and asks Jacek if any of:

1. Schema name collision (commit 1.1 STEP 3) — `slotIds`/`_meta` already used somewhere
2. Writer count ≠ 4 in W1-W4 grep (commit 1.2 STEP 1) — landscape changed since discovery
3. KIOSK writerUid logic ambiguous (commit 1.3 STEP 1) — preserve `scoutedBy: coachUid` semantics?
4. Any test/lint failure that doesn't have an obvious additive-schema fix
5. Verification step shows reader breakage (anything in 28 readers stops rendering)

Otherwise: STEP-by-STEP, push at each commit boundary, wait for Jacek GO.

---

**End of brief.**
