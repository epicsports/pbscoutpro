# Player Self-Log — Architecture

**Status:** Tier 1 deployed (commit `ffb9b43`, 2026-04-20). Tier 2 + Integrations deferred to next session.

**See also:**
- `docs/DESIGN_DECISIONS.md` § 35 (UI patterns) + § 36 (adaptive thresholds)
- Implementation: `src/components/selflog/`, `src/hooks/useSelfLogIdentity.js`, `src/hooks/usePlayerBreakoutHistory.js`, `src/hooks/useLayoutShotHistory.js`
- Archived brief: `docs/archive/cc-briefs/CC_BRIEF_PLAYER_SELFLOG_UNIFIED.md` (if archived — otherwise still being worked through)

---

## Why

Coach on a training day plays + coaches simultaneously → no capacity to scout every point. Before this feature: 0 data collected on 19.04.2026 training. Self-log lets players log their own action (~10-15s between points) so data accumulates without dedicated scout.

Builds a flywheel: **more logs → better insights → higher adoption**.

## Two-tier model

**Tier 1 — Hot log** (during match): FAB in MatchPage opens a bottom sheet with 4 fields — breakout → variant (optional) → shots → outcome. Save → close. Must fit in 10-15s between points.

**Tier 2 — Cold review** (post-match): "Mój dzień" section in `PlayerStatsPage` lists the player's logged points with completion status. Tap a point → edit modal to add killer, notes, edit shots. Not time-pressured.

Rationale: keeps the hot path fast; delegates depth to cold path when player has time.

## Data architecture

### Unified shots, differentiated by source

Single `shots` subcollection under each point, flag distinguishes scout vs self:

```
/workspaces/{slug}/tournaments/{tid}/matches/{mid}/points/{pid}/shots/{sid}
{
  source: 'scout' | 'self',
  playerId: string,
  breakout: string,            // bunker player broke to ('D3')
  breakoutVariant: string|null,
  targetBunker: string,        // bunker shot at ('Dog')
  result: 'hit' | 'miss' | 'unknown',
  x: number,                   // synthetic (bunker center) for self; real for scout
  y: number,
  layoutId: string,
  tournamentId: string,
  createdAt: serverTimestamp,
}
```

**Migration strategy — lazy.** Pre-existing scout shots live on the old `point.shots` field (object); new self-log writes go to this subcollection. Read code defaults `source = shot.source || 'scout'` when aggregating. No batch migration.

**Synthetic coords for self-log.** Self-log self-report shot target, not precise xy. Writes the bunker center so existing heatmap/canvas viz renders self-log shots as dots at the bunker — honestly reflects data quality (less precise than scout's tap-on-canvas).

### Self-log point embed

```
/workspaces/{slug}/tournaments/{tid}/matches/{mid}/points/{pid}
{
  // existing scout fields unchanged...
  selfLogs: {
    [playerId]: {
      breakout, breakoutVariant,
      outcome: 'alive' | 'elim_break' | 'elim_mid' | 'elim_end',
      loggedAt, killedBy?, note?
    }
  }
}
```

**Zero scout/player collision by design.** Scout logs the *opponent*, player logs *themselves* → different `playerId` values, different slots. Scout and player never log the same subject.

### Shared variant pool (team-level)

```
/workspaces/{slug}/teams/{teamId}/breakoutVariants/{variantId}
{
  bunkerName: 'D3',
  variantName: 'late break',
  usageCount: 42,
  createdBy, createdAt, lastUsed
}
```

Per-team, not per-player — 5-person team shares vocabulary so "late break" means the same thing across the roster.

### Player identity

`player.emails: string[]` — lowercase email addresses matched to this player.

Login flow:
1. `useSelfLogIdentity()` hook reads `workspace.user.email`.
2. Finds `players.where(emails array-contains email.toLowerCase())`.
3. Match → sets `playerId`. No match → `needsOnboarding: true` → onboarding modal asks user to claim self from roster.

## Flywheel mechanics

### Asymmetric history sources

**Breakout picker** — based on *the player's* own history. Personal habit (each player has favorite positions).

**Shots picker** — based on *layout* history (crowdsourced across all players). Geometric: from D3 you see the same spots regardless of who runs there.

### Thresholds

| Picker | Bootstrap | Mature |
|---|---|---|
| Breakout | `totalPlayerLogs < 5` → all bunkers | top 5 + "Inne…" |
| Shots | `totalLayoutShots < 20` → all bunkers | top 6 weighted + "+ Inne cele" expand |

See `docs/DESIGN_DECISIONS.md` § 36 for the weighted-frequency formula (`hit=2, miss=1, unknown=0.5`).

### Real-time queries

Both hooks use one-shot `collectionGroup('shots')` queries filtered by `(playerId)` and `(layoutId, breakout)` respectively. No cron, no cache — every picker open reads fresh from Firestore. Expected size 50-500 shots per scope, aggregation is client-side `<100ms`.

Indexes (already deployed):
- `shots` collection group: `(layoutId ASC, breakout ASC)`
- `shots` collection group: `(playerId ASC, createdAt DESC)`

Source file: `firestore.indexes.json`.

Post-MVP optimization (if needed at scale): denormalized `/shotCounts/{layoutId}_{breakout}` doc updated by Cloud Function.

## Cold-review self-log (claim flow Phase 1b, W4) — 2026-06-05

A THIRD self-log entry, distinct from the two above:
- **Tier-1 hot-log** (`MatchPage.handleSelfLogSave`): live match, auto-grabs the recent pending point. W4 storage.
- **PPT hot-log** (`/player/log` wizard): W5 flat `/selfReports/` + matcher/propagator.
- **Cold-review** (NEW): the player picks an EXISTING scouted point they were assigned to and logs it after the fact. **W4 storage** (same as Tier-1), **matcher-free** (the pick IS the point id) + **propagator-free** (player ∈ `assignments[]` → §57 slot-meta stamps directly).

**Flow (source of truth — the original mockup was never committed):**
1. **Entry CTA** "Complete N points" — own player only (`isSelfView`), on `PlayerStatsPage` header. **Quiet at N=0** (renders nothing). `ColdReviewFlow.jsx`.
2. **Point picker** — candidates grouped per event, whole-row tap; row = "Point N" + the coach-recorded outcome (≤3 data points, no amber, no chevron per § 27).
3. **Wizard** — the EXISTING `HotSheet` (breakout → shots → outcome) + a read-only **coach-context strip** (recessed `#0b1120`, neutral — context, NOT pre-fill) via the new additive `contextStrip` prop.

**Writer** (`ColdReviewFlow.handleSave`, reuses the service primitives): `setPlayerSelfLog[Training]` on the picked point + per-shot `addSelfLogShot[Training]` (stamps `source:'self'` + `workspaceSlug` + `playerLinkedUid` → feeds `usePlayerBreakoutHistory` via the Stage-2 shots-CG carve-out; bumps `/layoutAggregates`) + §57 slot-meta (`updatePoint[Training]`, dot-notation, player ∈ assignments) + `incrementVariantUsage`.

**Picker query — decision A′ (events_index + 30-day rollup walk).** `ds.fetchColdReviewCandidates(playerId, {days=30})`:
1. `events_index` (§69, member-read) → events in the window / still open.
2. per event → `fetchPointsForMatches` (read-volume-C rollup-hybrid, **1 doc/match**) for tournaments, `fetchAllTrainingPoints` for trainings — reads **bounded to the window, not O(all points)**.
3. keep points where the player ∈ `assignments[]`.
4. **Freshness:** the rollup is a match-END snapshot (stale `selfLogs`) → re-read the LIVE point's `selfLogs` for the matched subset (bounded) and drop already-completed points.

**Rejected:** Option A (`collectionGroup('points')` array-contains) — points carry no `workspaceSlug` and have no CG isolation rule, so A would re-open point-level tenant isolation (denormalize + `--live` backfill + new points CG rule + CONFIRM + emulator gate) — a Stage-2-sized sub-project, not in 1b. Option B (flat `participants[]`) — write-path change + backfill. Future-only: a points-isolation sub-project (A done properly) IF true player-bounded cross-event point queries are ever needed at scale; an all-time "show older" escape hatch.

**Accepted reality — sparse assignment.** Most scouted points carry no `assignments[]` (`[null×5]`) and that remains the norm. 1b covers ONLY the assigned subset by design (the matcher-free link IS the assignment), so N is usually small/0 → the CTA degrades quietly. Letting players claim points they were in but NOT assigned to is a larger future phase (needs a different participation signal), explicitly out of 1b. (Verified vs prod 2026-06-05: ranger1996 had assigned points + correct candidate/freshness behaviour; pbfit had none → graceful N=0.)

## Open items

- **Tier 2 Cold Review** (PlayerStatsPage "Mój dzień", edit modal for killer/notes, shot accuracy section) — deferred to next CC session.
- **ScoutedTeamPage hybrid view** — when scouted team is own team, show self-reported shots layer alongside scout-observed.
- **Tactic page shot suggestions** — weighted-freq picks as hints when editing a tactic. Blocked if current tactic schema doesn't carry shots (needs confirmation).
- **Multi-team user** — currently assumes one player per user. Post-MVP problem.
- **Coach override / validation** — scout may want to confirm or override a player self-log. No UI today.
