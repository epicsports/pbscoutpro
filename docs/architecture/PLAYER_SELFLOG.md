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

## Open items

- **Tier 2 Cold Review** (PlayerStatsPage "Mój dzień", edit modal for killer/notes, shot accuracy section) — deferred to next CC session.
- **ScoutedTeamPage hybrid view** — when scouted team is own team, show self-reported shots layer alongside scout-observed.
- **Tactic page shot suggestions** — weighted-freq picks as hints when editing a tactic. Blocked if current tactic schema doesn't carry shots (needs confirmation).
- **Multi-team user** — currently assumes one player per user. Post-MVP problem.
- **Coach override / validation** — scout may want to confirm or override a player self-log. No UI today.
