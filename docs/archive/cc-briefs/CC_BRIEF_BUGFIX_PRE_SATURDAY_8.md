# CC_BRIEF_BUGFIX_PRE_SATURDAY_8 (v2)

> **Archive:** shipped in commits `335b058` (C1) + `072861d` (C2) + `3f0f5e9` (C3), merged to main 2026-04-21 via `feat/entry-semantics-and-per-coach-streams`. See DESIGN_DECISIONS § 42 (per-coach streams + end-match merge) + § 18 extension (canonical flag).
>
> **v2 REVISION history:** v1 proposed shared doc IDs + Firestore transaction on shared counter — architecturally wrong (reintroduced race). v2 uses per-coach streams with end-match merge step.

**Context:** Two related fixes in one sprint:
- **Problem A** — "SCOUT ›" entry semantics: solo scout's partial points auto-attached on next Scout › click, causing perceived data corruption (Bug C from BUG-C diag log 2026-04-21).
- **Problem B** — chess-model concurrency: replace shared-doc merge with per-coach streams + end-match merge.

**Branch:** `feat/entry-semantics-and-per-coach-streams` off `main`
**Deploy urgency:** 🟡 Target pre-Saturday 2026-04-25. Problem A Saturday-critical; Problem B can land later if blowups.
**Diagnostic reference:** [BUG-C] log 2026-04-21 17:48-17:49 (point `ACgoWXqRFlyStWJvuYJM`) + 3-round user repro + Jacek's architecture decisions 2026-04-21 18:00-19:00.

---

## Problem A — Entry semantics

### Current (broken) behavior

All match-review CTAs dispatched through `?scout=teamId`. MatchPage auto-attach did "smart-guess" fallback search — finding user's own partial points and reloading them as `editingId`. User thought "new point", app did "edit existing partial".

### Desired behavior

**Rule 1:** Any CTA click = always new point. Never auto-attaches.
**Rule 2:** List card click = edit THIS specific point. Load by explicit ID.
**Rule 3:** Auto-attach fallback search = removed entirely. User intent is explicit.

### Narrow scope (per Blocker 1 decision)

Only Scout × 2 + list cards + training Scout analogue targeted. Quick Log untouched — already "always new point" by construction (in-page `setViewMode('quicklog')` + unconditional `addPointFn` in QuickLogView).

### Implementation

**URL param schema:**
- `?scout=teamId&mode=new` → create new point
- `?scout=teamId&point=<pointId>` → edit specific point
- `?scout=teamId` (no params) → console warning, no-op

**Call sites updated:**
- `MatchPage.goScout()` helper — appends `&mode=new`
- `MatchPage.goScoutPoint()` — unchanged (already `&point=id`)
- `MatchCard.jsx:handleScout` — navigates with `&mode=new`
- `TrainingScoutTab.jsx:onSwitchToScout` — navigates with `&mode=new`

**Auto-attach rewrite:**
- Removed fallback `openPoint` search
- Now dispatches purely from URL params: `mode=new` → skip; `point=<id>` → defer to pointParamId effect; else → console.warn
- Console log migrated from [BUG-B] to [BUG-C] for clarity

**savePoint `mode=new` bypass:**
- When `editingId=null AND mode=new`, bypass joinable search, route to new-point save path (Commit 2's `savePointAsNewStream`)
- Legacy URLs still fall through to Brief 6 narrowed joinable fallback

---

## Problem B — Per-coach streams + end-match merge

### Doc ID scheme

`{matchKey}_{coachShortId}_{NNN}`
- `matchKey` = tournament `matchId` or training `matchupId`
- `coachShortId` = first 8 chars of uid
- `NNN` = zero-padded 3-digit index from localStorage-backed counter

### `useCoachPointCounter` hook (new)

`src/hooks/useCoachPointCounter.js` — per-(matchKey, uid) counter with localStorage persistence. `reserveNext()` returns next 1-based integer. Zero Firestore round-trip. No shared-counter race.

### Point doc schema extension

New fields on per-stream docs:
```javascript
{
  // existing (homeData, awayData, outcome, status, ...) unchanged
  coachUid, coachShortId, index,
  canonical: false,
  mergedInto: null,
  sourceDocIds?: string[],  // canonical merged docs only
}
```

Legacy points (pre-Brief 8) lack `coachUid` — grandfathered per Blocker 2.

### usePoints filter (per Blocker 2 opcja b)

Client-side (Firestore `in [uid, null]` doesn't match field-missing docs):
```
During match:   !p.coachUid || p.coachUid === currentUid
Post-merge:     p.canonical === true
```

Opt-in via hook options `{ currentUid, merged }`. Default = all (backward compat).

### Training (per Blocker 3 opcja c)

Training matchups get coachUid schema for symmetry. Solo per matchup per § 18 — `endMatchupAndMerge` collapses to single-coach canonical-mark branch. No merge logic needed.

### End-match merge algorithm

Tournament (`ds.endMatchAndMerge(tid, mid)`):
1. Idempotent (skip if `match.merged === true`)
2. Fetch all points (raw, bypass filter)
3. Bucket by coachUid; legacy (no coachUid) → 'legacy' bucket
4. Sort each: legacy by order/createdAt; others by index
5. Legacy bucket → mark canonical standalone (audit per Blocker 2)
6. Solo (1 coach) → canonical in place
7. 2+ coaches → per-index lockstep merge:
   - Both have index i → write canonical `{mid}_merged_{NNN}` with both sides; source docs get `mergedInto`; mergedCount++
   - Only one has index i → canonical standalone; unmergedCount++
8. Match doc: `merged: true, mergedAt, mergeStats: { merged, unmerged }`

All writes in `writeBatch(db)` — atomic.

Training (`ds.endMatchupAndMerge`): solo-only branch. Mark all canonical, flip matchup.merged=true.

### Conflict cases — acknowledged

1. Coach A 12 / Coach B 10 → indexes 1-10 merge, 11-12 canonical standalone, unmerged banner
2. Coach skips index → wrong pair merged; data corruption; accepted per founding assumption
3. Late-joining coach counter 0 vs other's N → user responsibility
4. End match double-tap → idempotency guard on `match.merged === true`
5. Solo with legacy data → legacy canonicalized first, new stream second

### Claim system — retirement

Minimal retirement in this brief. Follow-up cleanup PR.

### Post-merge UI

Transient toast `⚠ {n} unmerged points — audit manually` for 4s if `unmerged > 0`. `match.mergeStats` queryable in Firestore for audit. No persistent banner in v1.

---

## Corrections applied

1. Collection paths use `bp()` + `tournaments/{tid}/` prefix (and `trainings/{trid}/`), not brief's bare `matches/{mid}/points`.
2. New `setPointWithId` / `setTrainingPointWithId` helpers in dataService for deterministic-ID writes via `setDoc`.
3. Firestore rules untouched — tournament wildcard `match /{document=**}` already permits custom doc IDs.

## Out of scope (deferred)

- Firestore indexes on coachUid/canonical — client-side filter covers current load
- Persistent post-merge banner — toast only v1
- Counter sync hint for late-joining coach
- Manual merge conflict resolution UI
- Claim field cleanup migration
- Diagnostic [BUG-B] + [BUG-C] logs cleanup — kept for Brief 8 validation signal

## Acceptance

- [x] All Scout CTAs + list cards + training Scout navigate with explicit URL intent
- [x] Auto-attach reads URL params only, no fallback search
- [x] savePoint mode=new bypasses joinable, routes to per-coach stream
- [x] `useCoachPointCounter` + `setPointWithId` + `setTrainingPointWithId` infrastructure
- [x] `usePoints` / `useTrainingPoints` opt-in filter (`currentUid`, `merged`)
- [x] MatchPage wires counter + `savePointAsNewStream` + merged flag derivation
- [x] `endMatchAndMerge` + `endMatchupAndMerge` in dataService
- [x] End match confirm modal runs merge before status flip; toast on unmerged
- [x] Build + precommit clean across all 3 commits
- [ ] iPhone validation Tests 1-4 + 6 — pending Jacek 2026-04-25
- [ ] Test 5 (2-device concurrent) — deferred to Tymek session

---

## iPhone validation scenarios

1. **Problem A solo basic** — Scout › Ranger → empty editor, console `[BUG-C] mode=new → skip`. Save → Firestore has new doc with coachUid/coachShortId/index/canonical:false. Scout › ALA → empty editor (not partial-reload).
2. **Problem A edit via list card** — Tap point card on team side → loads specific point. pointParamId effect handles. Modify + save → updateDoc on that point (not new).
3. **Problem B solo per-coach stream** — Fresh match, localStorage counter=0. Save 3 points via `&mode=new` → Firestore docs `{mid}_{shortId}_001/002/003`, localStorage counter=3. Refresh browser → counter=3 retained.
4. **Problem B end-match merge (solo)** — After 3 saves, End match → all 3 docs `canonical:true`, match `merged:true, mergeStats:{merged:0, unmerged:3}`. Idempotency: second End match → no-op.
5. **Problem B 2-device concurrent** — **DEFERRED to Tymek session.** Both coaches save per-side streams; End match merges by index; canonical docs show both sides.
6. **Regression Fix Y** — Open saved point, edit, save → orientation stable.

---

## Shipped

- Branch merged 2026-04-21 to main
- Commits: `335b058` (C1) + `072861d` (C2) + `3f0f5e9` (C3)
- Files: `src/pages/MatchPage.jsx`, `src/services/dataService.js`, `src/hooks/useFirestore.js`, `src/hooks/useCoachPointCounter.js` (new), `src/components/MatchCard.jsx`, `src/components/tabs/TrainingScoutTab.jsx`
- Documentation: DESIGN_DECISIONS § 42 + § 18 extension, PROJECT_GUIDELINES unchanged, DEPLOY_LOG 2026-04-21 entry
