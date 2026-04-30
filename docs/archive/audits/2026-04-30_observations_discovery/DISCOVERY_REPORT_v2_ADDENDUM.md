# Discovery Report v2 — ADDENDUM (§ 15-18)

**Generated:** 2026-04-30 by Opus
**Companion to:** `DISCOVERY_REPORT_OBSERVATIONS_v2.md` (v2 main report — accepted "OK ale brakuje 4 rzeczy")
**Status:** addendum extending v2 with admin/matching/zones/propagation findings

This document adds 4 sections (§ 15-18) requested by Jacek and a back-update note clarifying what they change in v2 main sections (specifically § 6, § 10).

---

## 15. Roles & Auth — full picture

The v2 main report mentioned `firestore.rules` role helpers but didn't dedicate a section. Here it is, sourced from § 38 + § 49 + `firestore.rules` + `roleUtils.js` references.

### 15.1 Multi-role per user per workspace (§ 38.2)

**Roles are a SET, not a single value.** Stored as `workspace.userRoles[uid] = ['admin', 'coach', 'player', ...]`. Capability checks evaluate "any of" — if any held role grants a capability, the user has it.

```
admin   → workspace owner; manage members + roles, edit/delete anything, destructive actions
coach   → team coach; edit teams/tactics/notes, open/close matches, write scouting, view all analytics
scout   → dedicated scout; write scouting data only. Cannot delete, cannot manage members
viewer  → non-roster observer; read-only entire workspace
player  → roster player (linkedUid set); write own self-log, read own stats, read team summary
```

Default for new user post-PBLeagues match: `[]` (empty). User sees "Czeka na zatwierdzenie" until admin assigns ≥1 role.

**Why multi-role:** Jacek is simultaneously admin (manages workspace) + coach (runs practices) + player (plays + self-logs). Single-role would force a pick. This is identical to PerSideData carrying multiple writer attributions — the data model already mirrors the user model.

### 15.2 Admin paths (§ 38.3) — three independent grants

A user is admin if ANY of:

1. `hasRole(workspace.userRoles[uid], 'admin')` — primary path (role array)
2. `workspace.adminUid === user.uid` — legacy "workspace owner" pointer, transferable
3. `user.email ∈ ADMIN_EMAILS` (hardcoded `['jacek@epicsports.pl']`) — emergency restore

ADMIN_EMAILS does NOT grant admin globally — only in workspaces where user is already in `members[]`. Disaster recovery, not god-mode.

`firestore.rules:32-40` mirrors all three checks server-side. Client `roleUtils.isAdmin(workspace, user)` mirrors them client-side.

### 15.3 Capability matrix (`roleUtils.js`)

```javascript
canWriteScouting(roles)   → admin || coach || scout
canEditTactics(roles)     → admin || coach
canManageMembers(roles)   → admin
canWriteSelfLog(roles)    → player
canReadOnly(roles)        → viewer && roles.length === 1   // pure viewer only
```

Note `canWriteSelfLog` is **player-exclusive** — admin/coach without player role cannot self-log. This matches reality: self-log is "I as a player did X". Admin-as-coach can use KIOSK to record AS player via tile tap (§ 55), but the write still attributes `playerId = lobby tap target`.

### 15.4 View Switcher (§ 38.5) — admin role impersonation

Admin-only pill in header, dropdown of 5 roles + "Exit impersonation". Player mode opens PlayerPicker modal. State: `sessionStorage` (per-tab, deliberate non-persistence).

**Important caveat:** "permissions are NOT downgraded" — admin impersonating viewer can still write via direct Firestore call. UI hides CTAs only. **Preview, not sandboxing.**

For § 57: when admin uses View Switcher to impersonate player, `useViewAs.effectivePlayerId` becomes the picker selection. **This is a 4th attribution layer** I missed — alongside (auth.uid, scoutedBy, playerId, filledBy). The View-Switcher path is the same as KIOSK W7 architecturally — identity override on existing flow.

### 15.5 Implications for § 57

**Who can write observations:**
- Scout writes (W1-W3) → admin/coach/scout role required (firestore.rules:299 `isScout` includes them)
- Self-log writes (W4-W7) → player role required (rules:282 `isSelfLogShotCreate`)
- KIOSK writes (W7) → coach holds the tablet (writes pass via scout branch since coach hasScout); shot doc gets `scoutedBy = coach uid` (§ 4 attribution quirk)
- View-Switcher writes → admin permissions used (UI hides CTAs but rules accept admin)

**Who can run reconcile:**
- The "match orphan PPT selfReports → point" coach action (§ 6.2 gap, § 48.10 named) requires coach+ permissions. Player cannot reconcile their own — too easy to mis-attribute.
- The "consensus build" runner (§ 57 proposed) needs coach+ trigger if user-initiated. Auto-trigger (e.g. on point save) bypasses role check via service-account context.

**Who can read consensus:**
- All members (any role) read consensus L5 view per existing rules — `isMember` covers it. Same as today's heatmap reads.

---

## 16. Matching ecosystem — three layers of identity matching

**You asked about "matchowania drużyn i zawodników, oraz zawodników z userami".** This is a deeper topic than v2 captured — there are actually THREE distinct matching layers in the system, only one of which is observation-related.

### 16.1 Layer M1 — Player ↔ Team

**Storage:** `players/{pid}.teamId` (single nullable ref) + `players/{pid}.teamHistory` (audit trail).

```javascript
// dataService.js:115-128 (addPlayer)
{
  name, nickname, number,
  teamId: data.teamId || null,
  teamHistory: [{ teamId, from, to: null }],   // initial entry on create
  age, favoriteBunker, pbliId, playerClass,
  role: 'player',
  nationality,
}

// dataService.js:136-143 (changePlayerTeam) — auditable transition
//   close current entry: open.to = now
//   push new entry: { teamId: newTeamId, from: now, to: null }
```

**Hierarchy:** `teams/{tid}.parentTeamId` allows nested teams. Ranger (parent) → Ring/Rage/Rebel/Rush (children). Each child team has own roster of players via `players[].teamId === childTeamId`.

**Implication for observations:** when reconciling PPT `selfReport` to a point, we need:
- `selfReport.teamId` (already stored — § 48.5)
- The training `matchup.{home,away}Squad` mapping to actual rosters
- Cross-check that `selfReport.playerId.teamId` is in the squad roster of the matchup

This is `playerId` membership verification, not new logic. Existing `pointFactory.createPointData(roster, ...)` already does the squad-membership filter.

### 16.2 Layer M2 — User ↔ Player (the auth-to-roster link)

This is the layer your question is mostly about. **Five mechanisms exist:**

#### M2.1 — `players/{pid}.linkedUid` (the link itself)

Single field. Set/unset by:
- **Self-claim** via ProfilePage (§ 33.3) — user selects their player from a roster picker
- **PBLeagues onboarding** (§ 51.6) — user enters PBLI ID, system finds matching player
- **Admin link** via LinkProfileModal (§ 50.4) — admin manually associates uid → playerId
- **Self-unlink via Wyjdź** (§ 50.3) — leaveWorkspaceSelf clears linkedUid

Firestore rule (`firestore.rules:175-218`) carve-outs:
- Self-link ALLOWED only when `resource.data.linkedUid` is null/missing (i.e. unclaimed slot) AND `request.resource.data.linkedUid == request.auth.uid`
- Idempotent re-claim same uid allowed (covers retry-after-flaky-write)
- Self-edit of identity fields (nickname/name/number/age/favoriteBunker/nationality) gated on `resource.data.linkedUid == request.auth.uid`

#### M2.2 — `pbliId` (PBLeagues system ID)

`players/{pid}.pbliId` — first segment numeric string only (e.g. `"61114"`, no `#` prefix). `pbliIdFull` audit field stores full two-segment ID at link time (e.g. `"61114-8236"`). Per memory.

Match function (`dataService.js:856+ findPlayerByPbliId`):

```javascript
findPlayerByPbliId(_wsSlug, systemId)
  → normalizePbliId(systemId)              // strip ##, lowercase, etc.
  → query players where pbliId == normalized
  → returns array (zero = manual add by admin; multiple = data bug)
```

Used by `PbleaguesOnboardingPage.handleSubmit` to auto-link new user → existing player in roster on first signup.

#### M2.3 — `players/{pid}.emails[]` — Tier 1 self-log identity

Per `useSelfLogIdentity`/`usePPTIdentity` (latter visible in WizardShell — usage at line 131 `playerId || uid`). Player doc has optional `emails[]` field — when user signs in with one of those emails, `useSelfLogIdentity().playerId` resolves to that player.

This is **email-based mapping** alongside `linkedUid`-based. Per memory: "useSelfLogIdentity hook (maps logged-in user to player via email)".

**Subtle:** if `linkedUid` is set on a different player than `emails[]` matches, behavior is implementation-dependent. I haven't read both hooks side-by-side to confirm.

#### M2.4 — `users/{uid}.workspaces[]` (membership list)

Per `firestore.rules:79-103`, user doc carries:
- `displayName, email`
- `roles` (array — set once at signup, mutated by admin only)
- `workspaces: [...]` (which workspaces this uid is member of)
- `defaultWorkspace: slug` (auto-enter target on next session)
- `linkSkippedAt` (Tier B field — when user skipped link, allows ProfilePage CTA logic per § 33)

User-doc create requires `auth.uid == uid`. Self-update is allow-listed to `['displayName', 'email', 'linkSkippedAt']` only — admin-managed fields (roles, defaultWorkspace, workspaces) are admin-only post-create.

#### M2.5 — `pendingApprovals` workspace field

Per § 49 unified auth: when new user joins workspace, their uid is added to `workspaces/{slug}.pendingApprovals[]` and `workspaces/{slug}.userRoles[uid] = []` (empty roles). Admin sees "Pending" tab in Členkowie page, assigns roles to clear pending state.

### 16.3 Layer M3 — Observation ↔ Point/Matchup (THE GAP)

This is the layer your question 4 is REALLY about. **Currently NO matching mechanism exists** for:

- PPT `selfReports.{matchupId, pointNumber}` → both null at write, never auto-filled
- HotSheet self-log shots already coupled by `(layoutId, tournamentId, playerId, createdAt)` to a specific point doc — but the COUPLING is via inline-write to `points/{pid}/shots/{sid}` subcollection, only happens because MatchPage finds existing pending point or creates new (`MatchPage.jsx:368-376`)

The HotSheet path "matches" implicitly via the act of writing to a specific point document. PPT path "matches" not at all.

**Per § 48.10 explicitly named as deferred:** *"Matchup matching product — coach-side workflow to assign orphan selfReports to matchup/point. Separate product/brief."*

**§ 57 must define matching algorithm.** Candidates (mobile session didn't pick one):

1. **Time proximity match** — `selfReport.createdAt` falls within ±60s of point save → match (template from § 55.11)
2. **Time + content match** — time proximity AND `selfReport.layoutId == point.tournament.layoutId` AND `selfReport.trainingId == matchup.trainingId`
3. **Manual match** — coach reviews orphan list, taps point, confirms
4. **Hybrid** — auto-match (T+C) where confidence ≥ threshold, else queue for manual

For your "5 graczy logujących = scout-free heatmap" use case: **option 4 with low threshold** is needed — auto-match should be aggressive enough to populate point without coach intervention. Conflict cases queue for review.

### 16.4 Implications for § 57

§ 57 reconciler must respect the 3-layer hierarchy:

```
Layer M1 (Player ↔ Team)        → unchanged. Reconciler reads.
Layer M2 (User ↔ Player)        → unchanged. Reconciler reads.
Layer M3 (Observation ↔ Point)  → THIS IS THE NEW WORK.
```

Multi-source reconcile happens AT M3. M1 and M2 are inputs to M3 logic (player teamId determines which side of point they belong to; linkedUid determines whether selfReport author == player).

---

## 17. Field zones — 5 distinct concepts

You asked about "stref wykorzystywanych na layoutach (danger, disco, zeeker, Sajgon, Big move)". Here's the inventory.

### 17.1 Two LINES (numeric y values)

These are 1D dividers, not 2D zones. Stored on layout as scalars.

```javascript
layout.discoLine: 0.30    // y position — separates dorito side from center
layout.zeekerLine: 0.80   // y position — separates center from snake side
```

Used by:
- `coachingStats.computeCoachingStats(points, field)` — defines `crossedDisco`/`crossedZeeker`/`inCenter` predicates per point
- `helpers.getBunkerSide(x, y, doritoSide)` — derives 'dorito'|'snake'|'center' from position via line tests
- `drawZones.js` (per § 1.6) — renders `DISCO` and `ZEEKER` line labels on canvas
- LayoutDetailPage editor — drag handles for both lines (§ 2.6)
- `kioskPrefillResolver.js:151,164` — calls `getBunkerSide` to derive `breakout.side` for prefill

`doritoSide ∈ {'top', 'bottom'}` flips the directionality. coachingStats `crossedDisco(p)` becomes `p.y < discoLine` (top) or `p.y > 1-discoLine` (bottom).

### 17.2 Three POLYGONS (2D zones)

These are arrays of `{x, y}` vertices. Stored on layout as arrays.

```javascript
layout.dangerZone: Array<{x,y}> | null     // user-drawn polygon
layout.sajgonZone: Array<{x,y}> | null     // user-drawn polygon
layout.bigMoveZone: Array<{x,y}> | null    // user-drawn polygon (added 2026-04-19)
```

Membership test: `helpers.pointInPolygon(point, polygon)` — standard ray-casting.

**Used by:**
- `coachingStats.computeCoachingStats` — counts `dangerCount`, `sajgonCount` per-point (some player inside the polygon). Returns `null` for the metric if `polygon.length < 3` (not configured).
- `generateInsights.computeBigMoves(points, layout)` — per-point detection of player inside `bigMoveZone`, attributed to nearest bunker. **NEW feature 2026-04-19, not equivalent to danger/sajgon.**
- LayoutDetailPage zone editor — draw/edit per § 2.6 polygon UI (Google Maps-style, fix/polygon-zone-editor 2026-04-19)
- `firestore.rules` — written via `isCoach` only

### 17.3 What's the difference between the 5?

| Zone | Type | Purpose | Per-point detection criterion |
|---|---|---|---|
| `discoLine` | line (y scalar) | divides dorito-side vs center | "any player crossed" → `dorito%` count; "nobody crossed" → `disco%` (passive play) |
| `zeekerLine` | line (y scalar) | divides center vs snake-side | "any player crossed" → `snake%`; "nobody" → `zeeker%` |
| `dangerZone` | polygon | tactical danger spot (user-defined) | "any player inside" → `danger%` count |
| `sajgonZone` | polygon | tactical contested spot ("Sajgon" = mess) | "any player inside" → `sajgon%` count |
| `bigMoveZone` | polygon | aggressive movement zone (user-defined) | "any player inside" → counted per-point in computeBigMoves, attributed to nearest bunker |

**Lines define the dorito/snake/center vocabulary** — they're foundational. Polygons are tactical overlays — coach draws them to track specific behaviors.

### 17.4 Implications for § 57

When self-log propagates → point inline schema (per § 18 below), zone classifications get computed automatically because they're **read-time derivations** from positions:

- Player logs `breakout.bunker = 'Dorito1'` → reconciler resolves bunker.x/y → write `homeData.players[slot] = {bunker.x, bunker.y}` → next coachingStats run sees the position → `crossedDisco` test fires → `dorito%` increments

**No zone-specific reconcile logic needed.** Existing readers handle it. ✓

But there's a subtle thing: `bigMoveZone` detection (`computeBigMoves`) runs per-point. If 5 players self-log positions and reconciler propagates them, `computeBigMoves` will detect any of those positions falling in bigMoveZone — same as scout-tapped positions would. **Self-log data becomes first-class** in zone analytics post-propagation.

This is the strongest argument for Option C in § 18 below.

---

## 18. CRITICAL DECISION REQUEST — Write-back propagation model for § 57

**Your point 4 is the new architectural axis the mobile session didn't address.** It changes the shape of § 57.

### 18.1 The use case (your words, restated)

> Player logs "biegłem na doga ze strzelaniem w sukę" via PPT/KIOSK. If we can match this to an existing point in the system, the data should AUTO-POPULATE that point so it's viewable in scout's heatmap and detailed scouting view.
>
> Goal: with 5 players self-logging (no scout), produce data equivalent to advanced scouting + heatmap.

**This requires PPT `selfReport` data to flow INTO `point.homeData/awayData` inline schema.** Today it doesn't — PPT writes to orphan `players/{pid}/selfReports/`, scout reads from `point.homeData/awayData`. They're disjoint.

### 18.2 Three architectural options

**Option A — Read-time consensus view (no write-back)**

- Reconciler stays read-time pure function (like `kioskPrefillResolver`)
- `getPlayerInPoint(pid, playerId)` queries scout side data + selfLogs + shots subcoll + selfReports, returns merged shape
- Heatmap/insights migrate to use this function instead of raw `point.homeData`
- Existing `point.homeData/awayData` stay scout-only (unchanged shape)

**Pros:** clean separation, no schema changes, easy to revert.
**Cons:** **ALL 28 reader functions must migrate.** That's a massive change. Heatmap, insights, coachingStats — every consumer rewrites. § 6.1 finding makes this concrete: today readers are blind to selfReports; cutover means rewriting all 28 to call new API. High-risk deploy.

**Option B — Separate consensus collection**

- Reconciler writes consensus L5 view to `points/{pid}/consensus/{playerId}`
- New reader API queries `consensus` subcollection alongside legacy fields
- 28 readers can use either old shape (backward compat) or new shape (richer)
- Migrate readers gradually

**Pros:** dual source of truth managed explicitly, gradual cutover, both shapes available.
**Cons:** **two sources of truth maintained forever.** Drift risk: scout updates `point.homeData.players` → does consensus auto-update? When? Reconciler must run on every scout edit too, not just on player self-log. Increases write amplification.

**Option C — Write-back to homeData/awayData with provenance metadata** ⭐ RECOMMENDED

- Reconciler writes self-log data **DIRECTLY into `point.homeData/awayData[slot]`** — same fields scout uses
- Schema extended with provenance: `homeData.players[slot] = {x, y, _meta: {source, writerUid, ts}}`
- Existing readers ignore `_meta`, see {x,y}, work unchanged ✓
- New consumers read `_meta` for confidence/conflict UI

**The propagation mechanics for your use case:**

```javascript
// Player logs via PPT
selfReport = {
  layoutId, trainingId, teamId,
  breakout: { side: 'dorito', bunker: 'Dog', variant: 'ze-strzelaniem' },
  shots: [{ side: 'snake', bunker: 'Suka', order: 1 }],
  outcome: 'elim_midgame', outcomeDetail: 'gunfight',
}

// Step 1 — Match to point (M3 reconcile, § 16.3)
matchupId, pointNumber = findMatchingPoint(selfReport)
slot = findPlayerSlot(point, playerId, side)   // assignments lookup

// Step 2 — Resolve vocabulary to coordinates
breakoutBunker = layout.bunkers.find(b => b.positionName === 'Dog')
breakoutPos = { x: breakoutBunker.x, y: breakoutBunker.y }

shotTarget = layout.bunkers.find(b => b.positionName === 'Suka')
shotPos = { x: shotTarget.x, y: shotTarget.y }

// Step 3 — Write back to point with provenance
point.homeData.players[slot] = {
  x: breakoutPos.x, y: breakoutPos.y,
  _meta: { source: 'ppt-selflog', writerUid: playerId, ts: selfReport.createdAt }
}

point.homeData.shots[slot] = [{
  x: shotPos.x, y: shotPos.y,
  _meta: { source: 'ppt-selflog', writerUid: playerId, ts: selfReport.createdAt }
}]

point.homeData.eliminations[slot] = true
point.homeData.eliminationStages[slot] = 'inplay'    // normalized from 'elim_midgame'
point.homeData.eliminationReasons[slot] = 'gunfight'
point.homeData.filledBy[slot] = 'self'                // ← Per § 54.5, this discriminator already exists!
```

**After Step 3 — heatmap renders point with this player visible. No scout needed. No reader changes needed.** Existing 28 functions continue working.

### 18.3 Why Option C is the right answer

1. **Existing readers keep working.** § 6.1 critical finding (28 readers blind to selfReports) becomes irrelevant — readers don't need to know selfReports exist. The reconciler propagates UPSTREAM into the format readers already understand.

2. **`filledBy` per-slot already exists** (§ 54.5, `pointFactory` doesn't create it but save-flow adds it). The provenance discriminator is half-built. § 57 just generalizes: `filledBy` stops being elimination-specific and becomes the canonical per-field provenance flag.

3. **`scoutedBy` quirk in KIOSK (§ 4) gets resolved.** Today shot doc has `scoutedBy = coach uid in KIOSK`. With Option C, propagated shot in `homeData.shots[slot]` carries `_meta.writerUid = playerId` — real player attribution.

4. **The "5 graczy = scoutless heatmap" use case works on day 1.** Once propagation runs, point looks identical to scout-recorded point. Insights, heatmap, coachingStats all produce data.

5. **§ 55.4 prefill resolver becomes obsolete** for KIOSK reverse direction — KIOSK lobby tap reads from `homeData[slot]` directly (already scout-prefilled) instead of computing pure-function projection. Cleaner data flow.

6. **Backward compat:** old points without `_meta` work as before (readers don't expect `_meta`). New points have `_meta` which extends but doesn't break.

### 18.4 The hard part — write-back has 3 sub-problems

**Problem 1 — Schema migration for `_meta`**

Adding `_meta: {source, writerUid, ts}` per field means schema migration. Three sub-options:

- 1a. **Embed `_meta` in field value**: `homeData.players[i] = {x, y, _meta}` — breaks anything iterating `players[i].x` directly. Mitigation: scan readers, confirm none destructures.
- 1b. **Sibling field**: `homeData.players[i] = {x, y}` + `homeData.playersMeta[i] = {source, writerUid, ts}` — readers untouched, parallel arrays. Cleaner but doubles write count.
- 1c. **Per-side meta object**: `homeData._meta = {players: [...], shots: [...], eliminations: [...]}` — single nested object, parallel-indexed.

I'd pick **1b (sibling fields)** — readers untouched is the strongest argument for Option C, don't undermine it with embed-in-value.

**Problem 2 — When does propagation run?**

- **On selfReport save** — reconciler kicks off, finds matching point (M3), writes back. Latency: immediate. Cost: every save = 1 query + 1 write. Risk: if no matching point exists (player logs before scout creates point), what happens?
  - Sub-option 2a: queue selfReport, retry on next point creation
  - Sub-option 2b: create empty point (with `homeData[slot]` populated) — but scout side stays empty
  - Sub-option 2c: hold selfReport orphan, run propagation as scheduled batch
- **On point save** (scout) — reconciler runs after scout writes, sweeps recent selfReports for matches, writes back. Latency: after scout. Risk: doesn't help for scoutless points.
- **On end-match** — bulk reconcile like § 42 endMatchAndMerge. Latency: high. Cost: low (one batch run). Risk: live scoreboard stays empty during match.

For "5 graczy scoutless" use case, **Option 2a or 2b** is needed — selfReports need to populate points eagerly, even before any scout activity.

My recommendation: **2b with empty scout-side** — scoutless workflow creates points populated entirely from self-log, scout-side stays `{}` empty object (already accepted shape per `MatchPage.jsx:706-707`). When scout joins later, scout writes don't conflict because they target opposite-side or empty-slot.

**Problem 3 — Conflict resolution when both scout AND player write same field**

Scout taps player position at (0.45, 0.30). Player self-logs `breakout.bunker = 'Dog'` which resolves to (0.42, 0.28). Different positions. Reconciler runs. What wins?

Per § 57 conflict rules (§ 10 in main report):
- **Position:** scout > self-log (canvas tap higher fidelity than zone-derived OR bunker-derived)
- BUT: self-log might be more recent. If scout wrote 5 minutes ago and player wrote just now, recency might override fidelity rule.

**Decision matrix:**

| Scout has | Self-log has | Result |
|---|---|---|
| Yes | No | Scout wins (existing) |
| No | Yes | Self-log writes (the new behavior) |
| Yes | Yes, different value | **Conflict — needs rule** |

For position field specifically, I'd pick **scout always wins if both exist** — even if older. Self-log is bunker-derived; scout is canvas-tapped fine-grained. Recency doesn't override that fidelity gap.

For `eliminations`/`deathReason` — recency overrides because data evolves: coach observes break, player corrects to "actually I was alive then died inplay". Player-as-source-of-truth for own state.

Per § 10 conflict rules table — these rules already proposed. § 57 codifies them.

**Edge case:** what if reconciler writes from selfReport at T1, then scout writes at T2 with different value, then player edits selfReport at T3? Reconciler must re-run on selfReport edit. Idempotent re-run. **`_meta.ts` gets compared, latest wins per-field, with tie-break by source priority.**

### 18.5 Implications for § 57 architecture (UPDATED from § 10)

Adding to the implications list in v2 main § 10:

11. **Reconciler is WRITE-BACK propagator, not read-time view.** Aggressively populate `point.homeData/awayData` from self-log sources. Readers stay unchanged.
12. **Provenance via parallel `_meta` fields** (sub-option 1b above) — `playersMeta[i]`, `shotsMeta[i]`, `eliminationsMeta[i]` mirror existing arrays.
13. **Reconcile timing: per-event on selfReport save**, with auto-create empty-other-side point if no match exists (option 2b above).
14. **Conflict rules: per-field, scout > self-log on position, self-log > coach on stage, coach > self-log on reason, latest-wins on text fields.** Codify in § 57 spec table.
15. **Observation as standalone doc — DEFERRED.** § 55.11 backlog had `pointFragments/{fid}` as immutable observation log. Option C makes that optional — `_meta.source` carries observation provenance, full audit trail can be reconstructed if `pointFragments` added later.
16. **End-match merge (§ 42) gets new responsibility: re-run reconciler on canonical merged docs.** Today endMatchAndMerge merges scout streams. Post-§ 57, after canonical _merged_NNN docs exist, re-trigger selfReport propagation against canonical IDs (not source-stream IDs).

### 18.6 What about HotSheet (W4) and KIOSK (W7) Tier 1 self-log?

Currently HotSheet/KIOSK already write directly to `point.shots/{sid}` subcollection AND `point.selfLogs[playerId]`. They DON'T propagate to `point.homeData.players[slot]`.

**Should they?** Yes, per Option C. Same propagation logic:
- HotSheet save: shot doc written to subcollection → reconciler trigger → write `homeData.shots[slot]` AND `homeData.players[slot]` (breakout position from `selfLog.breakout`) AND `homeData.eliminations*[slot]` (from `selfLog.outcome`)
- KIOSK same path (it reuses HotSheet)

This MERGES W4/W7 Tier 1 with W5 PPT semantically — both feed the same propagation. Difference is only in the orphan-vs-coupled state at write time:
- W4/W7 write coupled (point exists, shot subcoll attaches to it)
- W5 write orphan (matchupId null, must be matched)

After § 57 reconciler, **all three feed the same `homeData/awayData` propagation**.

### 18.7 Migration plan (concrete)

Per § 13 in v2 main, but updated for Option C:

**Phase 1 — Dual-write + meta extension (~3-4 days CC)**

- Schema: add `playersMeta[]`, `shotsMeta[]`, `eliminationsMeta[]` (sub-option 1b) to PerSideData spec
- All existing writers (W1-W7) populate `_meta` alongside their existing field writes
- `pointFactory.baseSide` extended to init meta arrays alongside data arrays
- Reconciler service `propagateSelfLogToPoint(selfReport)` — finds match via M3 algo, writes to homeData with `_meta = {source: 'ppt'|'hotsheet'|'kiosk', writerUid, ts}`
- Trigger: on selfReport save (sub-option 2b — auto-create point if no match)
- Existing readers ignore meta arrays — no behavior change visible to user

**Phase 2 — Reader migration to use `_meta` for provenance UI (~2 days CC)**

- Heatmap: differentiate scout-recorded vs self-log positions (visual marker)
- ScoutedTeamPage: show "filled by" badge per stat
- Insights: confidence weighting per data source

**Phase 3 — Backfill + cleanup (~1 day CC)**

- Backfill `_meta` for legacy points (best-effort: scoutedBy → meta, all else 'unknown')
- Remove dual-write from old code paths once readers stable

**Total estimate: 6-8 days CC over 3 commits.**

### 18.8 Risk register for Option C

1. **Schema migration breaking edge readers** — some niche reader might destructure `players[i].x` directly. Mitigation: full-repo grep before deploy, scan all `\.players\[` and `\.shots\[` access patterns.

2. **Reconciler infinite loop** — selfReport propagates to point → triggers point watcher → writes selfLog → triggers selfReport watcher → loops. Mitigation: write `_meta.source = 'reconciler'` on propagated writes, watcher skips if source='reconciler'.

3. **PositionName change after propagation** — coach renames bunker "Snake1" → "Cobra". Self-log selfReport saved with `breakout.bunker = 'Snake1'`. Reconciler ran T1, wrote `homeData.players[slot] = {x_oldSnake1, y_oldSnake1}`. After rename, scout sees position labeled "Cobra" but selfReport says "Snake1". Mitigation: snapshot bunker.id (stable) instead of positionName at write time. **Schema implication: selfReport.breakout should store bunker.id alongside positionName.**

4. **Multi-tablet KIOSK race** — two tablets, two coaches, both running KIOSK on same point. Both write self-log shots. Reconciler runs on each. Different `_meta.writerUid` (different coach uid), but same `playerId` slot. Mitigation: per-side per-slot last-writer-wins on `_meta.ts`, conflict logged.

5. **Privacy / role boundary** — player self-log writes propagate to point document. Player role can write self-log (rules:282). Propagator writes to point document — needs scout+ permission. Mitigation: propagation runs in Cloud Function (admin SDK, bypasses rules) OR reconcile is scout/coach action triggered manually.

### 18.9 Bottom line

**My strong recommendation: Option C, sub-option 1b (sibling _meta arrays), trigger 2b (per-event with auto-create-empty-side).**

Why: it's the only option that makes the "5 graczy = scoutless heatmap" use case work without rewriting 28 readers AND maintains a single source of truth. § 55.4 prefill resolver gets simplified, § 54.5 `filledBy` gets generalized, § 42 per-coach merge gets a new step (re-run reconcile post-merge). Existing infrastructure mostly extends rather than replaces.

But this is a **decision request** — Option A or B might suit better if other constraints exist (e.g. risk aversion to schema changes, separation of concerns for compliance, future need for observation audit trail). I want your call before § 57 is drafted.

---

## Back-update note — what this changes in v2 main report

The 4 sections above modify v2 main as follows:

### v2 § 6.1 — refined

The "no canonical L5 read API" framing was correct but understated. **Real story is that 28 readers operate on `homeData/awayData`, and the right fix is to write self-log INTO `homeData/awayData` (Option C), not build a parallel canonical view (Options A/B).** v2 § 6.1 implicitly assumed Option A by saying "needs canonical view function". § 18 above shows that's the wrong framing.

### v2 § 10 implications — extended

Adds 6 new bullets (#11-16) covering write-back propagation, parallel _meta arrays, per-event reconcile trigger, end-match merge integration.

### v2 § 13 — § 57 patch outline updated

Migration plan switches from "dual-write → readers cutover → cleanup" to "dual-write + meta extension → reader uplift to use meta for provenance UI → backfill". Reader rewrite of 28 functions is no longer required — they keep working unchanged.

### Unchanged

- v2 § 1-5 schema reference — no changes (admin/matching/zones don't change point schema)
- v2 § 7 shared vocabulary — UNCHANGED, still 13 touch points + 3 failure modes
- v2 § 8-9 resolved questions — UNCHANGED
- v2 § 11 outstanding gaps — UNCHANGED, still closed
- Stage 2 diagram plan (§ 12) — DIAGRAM 3 (Data Flow) needs updating to show write-back propagation arrow from selfReports → homeData. Diagrams 1, 2, 4 unchanged.

---

## Decisions awaiting Jacek (refined)

| # | Decision | Status |
|---|---|---|
| **D1** | Doppakowanie 7 plików | ✅ DONE |
| **D2** | Approval of v2 discovery report | ✅ "OK ale brakuje 4 rzeczy" → addendum addresses |
| **D2.5** | **NEW** — Approve § 15-18 addendum + commit to Option C (write-back propagation w/ sibling _meta arrays) | **Pending — your call** |
| **D2.6** | If Option C accepted: confirm trigger timing (per-event 2b vs end-match) and scout > self-log conflict rule on position | **Pending — your call** |
| **D3** | (Stage 2 deliverable) approval of 4 diagrams → Stage 3 (§ 57 patch) | Future |

End of addendum.
