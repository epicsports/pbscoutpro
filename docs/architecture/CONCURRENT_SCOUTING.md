# Concurrent Scouting — Architecture

> **Last updated:** 2026-04-21 (Brief 8 v2 + Brief 9 polish)
> **Live since:** 2026-04-21 deploy `30d169e` (Brief 8) + `65082aa` (Brief 9)
> **Supersedes:** docs/DESIGN_DECISIONS.md § 18 (chess-model lock, retired April 2026)

---

## Purpose

Two or more coaches can scout the same paintball match simultaneously from different devices — one watching home team, another watching away — with their work merged into a canonical record at match end.

---

## Problem with the original chess-model (April 2026, retired)

Original design: shared point docs with `homeData` + `awayData` fields, each coach writes only their own side via Firestore dot-notation partial updates. Enforced via a claim system with 10-min TTL heartbeat.

**Symptoms observed in production:**
1. Coach A's partial save could overwrite Coach B's partial save if timing collided (last-write-wins at doc level despite field-level partial updates)
2. `fieldSide` confusion — each coach had own orientation but shared doc → flip semantics ambiguous
3. Race conditions on shell-point creation — both coaches could create "point 1" simultaneously, resulting in two docs with conflicting IDs
4. Edit flow leaked fieldSide back into `match.currentHomeSide`, silently reverting the other coach's swap
5. Joinable-point auto-attach was unpredictable under concurrent writes

Root cause: **shared mutation state**. Any design that makes two coaches contend for the same Firestore doc will have race conditions.

---

## Solution — per-coach streams + end-match merge

### Core principle

**Each coach writes to their own isolated stream of point docs during the match. No shared mutation. At end-of-match, a merge step creates canonical docs combining both streams.**

This trades real-time shared state for post-processing consolidation. Correctness > liveness.

### Doc schema during match

```
/workspaces/{slug}/.../matches/{matchId}/points/{docId}

docId format: {matchId}_{coachShortId}_{NNN}
  where coachShortId = first 8 chars of coach's Firebase uid
  and NNN = zero-padded 3-digit counter (001..999)

Example:
  rzj1EYtDWjD0i54WtWnp_OPAHJZa6_001   ← Coach A's point 1
  rzj1EYtDWjD0i54WtWnp_h2410NZl_001   ← Coach B's point 1
  rzj1EYtDWjD0i54WtWnp_OPAHJZa6_002   ← Coach A's point 2
```

**Key fields:**
```javascript
{
  // Stream identity
  coachUid: "OPAHJZa6fROpL7DPVCN3lQiQRr52",   // full uid of author
  coachShortId: "OPAHJZa6",                    // 8-char prefix
  index: 1,                                    // counter within stream
  order: 1776807598582,                        // Date.now() for orderBy
  canonical: false,                            // true only after merge

  // Point data — only ONE of homeData/awayData populated
  homeData: { players, shots, assignments, ..., scoutedBy, fieldSide },
  awayData: { players, shots, assignments, ..., scoutedBy, fieldSide },

  // Also legacy mirror for backward compat (reader paths not yet migrated)
  teamA: { ... },  // copy of homeData (if home save)
  teamB: { ... },  // copy of awayData (if away save)

  outcome: 'win_a' | 'win_b' | 'pending' | 'no_point' | 'timeout',
  status: 'partial' | 'scouted',
  isOT: false,
  comment: null,

  // After end-match merge, source docs get this:
  mergedInto: "rzj1EYtDWjD0i54WtWnp_merged_001",
}
```

### Counter source

Counter `NNN` is **per-coach, per-match**, stored in localStorage:

```
pbscoutpro_counter_{matchId}_{uid} → integer
```

Increment on each successful write. Not synced to Firestore. This deliberately avoids the Firestore transaction we tried in Brief 8 v1 (which reintroduced race conditions — counter transactions themselves can collide).

If a coach clears localStorage or switches devices mid-match: counter resets. That's OK — doc IDs include coachShortId prefix, so collision with own earlier docs is still possible but rare. If it happens, existing doc is overwritten (setDoc with same ID). Post-merge canonical docs are the source of truth, so pre-merge collisions are recoverable via merge logic.

### Entry semantics (URL)

**Two URL modes for MatchPage scouting entry:**

1. `?scout={teamId}&mode=new` — always starts fresh new point. Does not attach to any existing doc. Counter auto-increments. This is the **default** entry from:
   - Match card SCOUT CTAs (tournament + training)
   - Training scout tab matchup cards
   - QuickLog save flow (always new)

2. `?scout={teamId}&point={docId}` — loads specific doc for edit. Fieldside and data loaded from that doc's side (home or away based on `scoutedBy`). On save, updatePoint on same docId (no new stream entry).

**Retired:** auto-attach fallback search (`where p[otherSide]?.players?.some(Boolean)`). Under per-coach streams this was both unnecessary and a source of subtle races.

### Read path

`usePoints(matchId)` subscribes to all points in match subcollection, orderedBy `order asc`. Filters client-side:

```js
// During match (match.merged !== true):
// Show all partial docs from any coach — legacy fallback includes docs without coachUid
const points = allPoints.filter(p => p.coachUid === currentUid || !p.coachUid);

// After merge (match.merged === true):
// Show only canonical docs
const points = allPoints.filter(p => p.canonical === true);
```

**Note:** the "during match" filter shows **own** stream only (plus legacy non-coachUid docs). Each coach sees their own progress. Other coach's docs exist in Firestore but are not displayed locally until post-merge.

This is a deliberate choice to avoid UI noise during scouting. Scout-time review is local; cross-device review happens at match-review page after End match.

### End-match merge

Triggered by "End match" button on MatchPage. Transaction:

```
1. Fetch all partial docs in match.points subcollection where canonical === false
2. Group by index (pair Coach A's _001 with Coach B's _001)
3. For each pair:
   a. Create canonical doc with ID {matchId}_merged_{NNN}
   b. Take homeData from whichever doc has homeHasData=true (Coach A's partial)
   c. Take awayData from whichever doc has awayHasData=true (Coach B's partial)
   d. Preserve outcome from whichever doc set it first (usually whoever saved first)
   e. Set canonical: true, status: 'scouted'
   f. Copy sourceDocIds array with both source IDs
   g. Set order: from earliest source doc (or Date.now()+i fallback)
4. Update source docs with { mergedInto: canonicalId }
5. Compute match.scoreA / match.scoreB from all canonical outcomes
6. Set match.merged = true, match.mergeStats = { ... }
```

After merge, partial docs are preserved (not deleted) for audit trail. Reader paths switch to canonical-only view via `match.merged` flag.

### Score semantics (Brief 9 Option A)

See DESIGN_DECISIONS § 44.2 for full rules. Summary:

- During match: `match.scoreA/B` stays at 0:0 or whatever was seeded
- Individual savePoint/quicklog/delete do NOT write match.scoreA/B
- `endMatchAndMerge` computes canonical score from merged outcomes, writes once
- MatchPage scoreboard reads from filtered local points (own stream during match, canonical post-merge)
- Match lists read `match.scoreA/B` field (0:0 for active, real for FINAL)

### Flip / fieldSide handling

Each coach's own `fieldSide` lives in their own per-coach doc (`homeData.fieldSide` or `awayData.fieldSide` depending on scoutingSide).

`match.currentHomeSide` is a shared signal for "physical field orientation for next point." Updated by:
- Flip pill manual click (both manually flips local state + writes to match doc)
- Auto-swap on winner-save (writes to match doc when outcome is win_a/win_b and !editingId)

Both coaches sync from `match.currentHomeSide` on entry + on change. Since the auto-swap semantics match real paintball (team wins point → teams physically swap sides), this shared signal is architecturally justified.

**False-positive toast suppression (Brief 9 Bug 3b):** sync effect no longer fires "sides flipped by other coach" toast. That toast was for chess-model lock semantics no longer in effect.

**Open question post-Saturday:** is this shared signal still needed? Could flip pill update only local state? See DESIGN_DECISIONS § 44.5.

---

## Pros & cons

**Pros:**
- ✅ No write races on point docs (each coach writes own stream)
- ✅ Crash-resilient — partial streams survive incomplete matches, can be merged later
- ✅ Edit flow isolated — editing Coach A's point doesn't affect Coach B
- ✅ Audit trail preserved (partial docs stay in Firestore after merge)
- ✅ Simple doc IDs (no Firestore transactions for counters)

**Cons:**
- ⚠️ 2N docs during match (N per coach), compressed to N canonical post-merge — storage cost
- ⚠️ Match lists show 0:0 during active match (acceptable per § 44.2)
- ⚠️ Each coach sees only own stream during match — no live cross-device preview
- ⚠️ Merge step is single-point-of-failure — if merge fails, canonical docs missing, match review broken
- ⚠️ `match.currentHomeSide` remains shared mutation — not fully isolated (see § 44.5)

**Known issues:**
- localStorage counter can collide if coach clears browser data mid-match (handled via setDoc overwrite, but sub-optimal)
- Legacy fallback `!p.coachUid` in usePoints filter — tech debt from gradual migration
- Claim fields (homeClaimedBy etc.) still written but unused — see NEXT_TASKS cleanup

---

## Test validation

2-device concurrent test 2026-04-21 on match `rzj1EYtDWjD0i54WtWnp`:

**Setup:**
- Main device (Jacek, uid OPAHJZa6...) as home scout
- Biuro device (incognito, uid h2410NZl...) as away scout
- Membership workaround: manually added biuro UID to `workspaces/ranger1996.members` field

**Result:**
- 4 partial docs created (2 per coach) — `_OPAHJZa6_001`, `_OPAHJZa6_002`, `_h2410NZl_001`, `_h2410NZl_002`
- End match → 2 canonical docs created — `_merged_001`, `_merged_002`
- Canonical docs correctly combined homeData + awayData from respective partials
- sourceDocIds wired correctly
- mergedInto field added to source docs

**Bugs discovered and fixed in Brief 9:**
1. Canonical docs missing `order` field (see § 44.1)
2. Score mismatch between devices (see § 44.2)
3. False-positive flip toast (see § 44.3)

All three fixed and deployed in commit `65082aa` + follow-up Bug 3a revert.

---

## Future work (post-Saturday)

1. **Architectural cleanup:** retire `match.currentHomeSide` Firestore write if investigation shows it's no longer needed (§ 44.5)
2. **Reader path migration:** currently MatchPage has dual paths (filtered own stream vs canonical). Unify behind a consistent `usePoints` abstraction
3. **Claim fields retirement:** stop writing `homeClaimedBy` etc. — informational only today, not used for routing
4. **Real-phone 2-device test with Tymek:** Saturday match will be this test, but a calmer test session before NXL championship would surface edge cases
5. **Offline handling:** what happens if Coach A is offline during Coach B's saves? Current behavior: Firebase queues writes, merge later. Untested at scale.
