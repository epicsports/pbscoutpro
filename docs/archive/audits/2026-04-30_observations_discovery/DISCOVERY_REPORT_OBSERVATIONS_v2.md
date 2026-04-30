# Discovery Report v2 — Multi-Source Observations Architecture

**Generated:** 2026-04-30 by Opus
**Source:** main HEAD `99ae0e1` (last commit `chore(docs): update HANDOVER.md`)
**Files analyzed:** **22** (15 round-1 + 7 round-2)
**Status:** v1 (15 files) superseded — this is full discovery, ready for Stage 2 acceptance

---

## 0. TL;DR — what changed since handover task was written

The handover note (mobile, 2026-04-30) was authored against a stale memory snapshot. **Three of its assumptions are obsolete:**

| Handover assumed | Reality in main |
|---|---|
| Free § number for proposal = **§ 38** | § 38 already taken (Security Roles), latest is **§ 56**. Proposal becomes **§ 57**. |
| Multi-source for points doesn't exist | **§ 42-44 per-coach streams + end-match merge SHIPPED 2026-04-21**. Scout↔scout merge already event-sourced. **§ 55.4 KIOSK prefill resolver SHIPPED 2026-04-29** with per-field provenance (`{value, source}`). |
| Architecture proposal is novel | **§ 55.11 (KIOSK section) already documents almost identical "offline-first point fragments + reconciler" as backlog** — referenced from "Opus session 2026-04-29: 'Architektura: offline-first, fault-tolerant point sync'". |
| Audio is a candidate source | Already explicitly rejected in mobile session, NOT relitigated here. |

Net consequence: this discovery isn't input to a fresh design — it's input to **§ 57: extension of § 55.11 with 5-level hierarchy + fractal pattern + shared vocabulary diagram**, building on per-coach streams (§ 42-44), prefill resolver (§ 55.4), and PPT migrate-on-link pattern (§ 52).

Plus: **5 of the 5 handover discovery questions are RESOLVED** with file:line evidence. See § 8.

---

## 1. Numeration sanity check

Latest section: **§ 56. Player stats entry points (approved 2026-04-30)** — Brief E shipped today.

Free for new proposal: **§ 57**.

Note: § 39, § 40, § 53 had renumbering events (originally drafted with conflicting numbers). § 18 is DEPRECATED (chess model, superseded by § 42-44). § 38 is SECURITY ROLES (path A chosen, no conflict with proposed observations work).

---

## 2. The five-level hierarchy already exists in storage

The handover proposed 5-level hierarchy as if it were new. **It's already the storage layout** (tho not labelled as such in any single doc):

| Level | Storage path | Schema source |
|---|---|---|
| **L1 Layout** | `/workspaces/{slug}/layouts/{lid}` | `dataService.js:479-491` (`addLayout`) |
| **L2 Tournament/Training** | `/workspaces/{slug}/tournaments/{tid}` or `/trainings/{trid}` | `dataService.js:167-181` (`addTournament`), `:553-572` (`addTraining`) |
| **L3 Match/Matchup** | `…/tournaments/{tid}/matches/{mid}` or `…/trainings/{trid}/matchups/{mid}` | `dataService.js:266`, `:616-626` |
| **L4 Point** | `…/matches/{mid}/points/{pid}` (same path under matchups for training) | `dataService.js:313-336`, initial shape from `pointFactory.js:10-23` |
| **L5 Player-in-Point** | inline `point.homeData/awayData.{...}[slot]` (5 slots fixed) + side-specific subdocs (subcollection `shots/{sid}` for self-log + inline `selfLogs[playerId]`) + orphan `players/{pid}/selfReports/{sid}` (PPT) | full schema in § 4 below |

What's "missing" is **not the hierarchy** — it's:
1. A **canonical L5 read API** that consolidates scout side data + selfLogs + self-log shots subcollection + PPT selfReports + KIOSK prefill into one shape.
2. A **post-hoc reconciler** that resolves the orphan PPT selfReports (`matchupId: null, pointNumber: null`) to specific (matchup, point) tuples — explicitly named as TODO in § 48.10.

---

## 3. Schema reference — exact field shapes from main

### 3.1 Layout doc

`/workspaces/{slug}/layouts/{lid}` — `addLayout(data)` (`dataService.js:479-491`):

```javascript
{
  name: string,
  league: 'NXL' | 'DPL' | 'PXL',     // default 'NXL'
  year: number,                        // default current year
  fieldImage: string | null,           // base64 data URL, optional
  discoLine: 0.30,                     // y position default
  zeekerLine: 0.80,                    // y position default
  bunkers: Array<Bunker>,              // see § 3.2
  dangerZone: Array<{x,y}> | null,     // polygon vertices
  sajgonZone: Array<{x,y}> | null,
  bigMoveZone: Array<{x,y}> | null,    // (per § 19/big-moves, added via update — not in addLayout init)
  mirrorMode: 'y' | 'diag',            // default 'y'
  doritoSide: 'top' | 'bottom',        // default 'top'
  createdAt: serverTimestamp,
}
```

### 3.2 Bunker schema

Element of `layout.bunkers[]`. Reconstructed from `drawBunkers.js:38` + `theme.js:328-340` + `helpers.js:335` (`computeMirrors`) + § 34:

```javascript
{
  id: string,                    // stable identifier
  positionName: string,          // PRIMARY label — "Snake1", "Dorito50", "Snoop", "Hammer"
  name: string,                  // legacy fallback (drawBunkers.js:38: `b.positionName ?? b.name ?? ''`)
  type: string,                  // bunker shape — 'MD', 'C', 'GP', 'Br', 'GB', 'GD', 'Ck', 'Wg', 'Tr', 'SB', 'SD', 'SG', 'WB', 'WG'
  x: number, y: number,          // normalized 0..1
  labelOffsetY: number | undefined,
  role: 'mirror' | undefined,    // missing on masters
  masterId: string | undefined,  // set only on role='mirror'
}
```

`POSITION_NAMES` from `theme.js:328-332`:

```javascript
{
  dorito: ['Palma','Dog','Dexter','Dallas','Dreams','Dykta','Dorito1','Dorito2','Dorito3','Dorito50','Drago'],
  snake:  ['Snoop','Cobra','Ring','Snake1','Snake2','Snake3','Snake50','Sweet','Soda','Suka','Skoda','Scar1','Scar2','Scar3'],
  center: ['Hammer','Hiena','Drago','Gwiazda','Baza','Środek'],
}
```

`POSITION_TYPE_SUGGEST` (`theme.js:335`) maps positionName → bunker type abbreviation (e.g. 'Palma':'MD', 'Snake1':'C', 'Scar1':'Wg').

### 3.3 Point doc — current main schema (composite)

`/workspaces/{slug}/tournaments/{tid}/matches/{mid}/points/{pid}` (training mirror under matchups):

```javascript
{
  // ─── Per-coach stream identification (§ 42, since 2026-04-21) ───
  coachUid: string,              // auth uid of writer
  coachShortId: string,          // first 8 chars of coachUid
  index: number,                 // 1-based local counter from useCoachPointCounter
  canonical: boolean,            // false during match, true after merge (§ 44)
  mergedInto: string | null,     // canonicalId if this source doc was merged
  sourceDocIds: string[] | undefined,  // present only on canonical merged docs

  // ─── Per-side data (concurrent v2 — homeData/awayData with teamA/teamB legacy mirror) ───
  homeData: PerSideData,         // see § 3.4
  awayData: PerSideData,
  teamA: PerSideData | {},       // legacy mirror — duplicate of homeData (some readers still use this)
  teamB: PerSideData | {},

  // ─── Outcome + status ───
  outcome: 'win_a' | 'win_b' | 'timeout' | 'pending',
  status: 'open' | 'partial' | 'scouted',
  fieldSide: 'left' | 'right',   // top-level convenience (also lives under each side as homeData.fieldSide)

  // ─── Tier 1 self-log (HotSheet § 35, since 2026-04-20; KIOSK § 55 reuses) ───
  selfLogs: { [playerId]: SelfLogEntry },   // see § 3.5

  // ─── Meta ───
  order: number,                 // sort key — orderBy('order', 'asc') in subscribePoints (§ 44.1: REQUIRED)
  createdAt: serverTimestamp,
  updatedAt: serverTimestamp,
}
```

Source: `dataService.js:313-336` (`addPoint`/`setPointWithId`), `MatchPage.jsx:705-714` (scout save), `:362-376` (selfLogs lookup), `:828-833` (concurrent dual-side write).

**WRITE-INVARIANT:** scout save always writes BOTH `homeData` AND `awayData` — one is `{}` empty when scout works only one side (`MatchPage.jsx:706-707`). Plus duplicate `teamA`/`teamB` for legacy readers. Single scout save = 4 inline objects updated atomically.

### 3.4 PerSideData — initial shape (`pointFactory.baseSide`) + § 54 extensions

**Initial empty side from `pointFactory.js:10-23`:**

```javascript
{
  players: Array(5).fill(null),         // 5 slots — {x,y} | null
  assignments: Array(5).fill(null),     // 5 slots — playerId | null
  shots: {},                            // object form (Firestore nested-array workaround)
  eliminations: Array(5).fill(false),   // ⚠ DEFAULT false, not null
  eliminationPositions: Array(5).fill(null),  // ⚠ field name confirmed (not 'elimPos')
  quickShots: {},                       // sparse object — { '0': ['dorito','snake'], '2': ['snake'] }
  obstacleShots: {},                    // § 29 obstacle play
  bumpStops: Array(5).fill(null),
  runners: Array(5).fill(false),        // ⚠ DEFAULT false, not null
  fieldSide: 'left' | 'right',
}
```

**Added by save flow (NOT created by factory) — § 54 elimination fields per `MatchPage.jsx:182-183` + `deathTaxonomy.js`:**

```javascript
{
  // ─── Position metadata ───
  scoutedBy: uid,                       // attribution for scout writes

  // ─── Shots — inline scout shots (NOT subcollection!) ───
  // shots field codec from dataService.js:58-67:
  shots: { '0': [{x,y},...], '1': [...] },     // shotsToFirestore — array-of-arrays as object

  // ─── Elimination § 54 schema (extended on top of factory base) ───
  eliminationStages: Array<'alive'|'break'|'inplay'|'endgame'|null>,    // § 54.5
  eliminationReasons: Array<DeathReason | null>,                         // § 54.5 — 7 enum values
  eliminationReasonTexts: Array<string | null>,                          // § 54.5 — free text when reason='inaczej'
  eliminationTimes: Array<number | null>,                                // seconds from buzzer
  filledBy: Array<'coach'|'self' | null>,                                // § 54.5 — provenance per slot

  // ─── Legacy elimination fields (still read by deathTaxonomy.normalizeLegacyReason) ───
  eliminationCauses: Array<string | null>,    // ⚠ LEGACY — flat field mixing stage+reason
                                              //   values: 'break', 'gunfight', 'przebieg', 'faja', 'kara', 'unknown'
                                              //   normalize on read via deathTaxonomy
  elim, elimPos,                              // pre-v2 legacy from dataService.js:97 header

  // ─── Penalty ───
  penalty: any | null,
}
```

**QuickLog synthetic position constants (`QuickLogView.jsx:18-22`):**

```javascript
const ZONE_POS = {
  D: { x: 0.30, y: 0.20 },   // dorito
  C: { x: 0.30, y: 0.50 },   // center
  S: { x: 0.30, y: 0.80 },   // snake
};
```

Synthetic positions written into `players[i]` as plain `{x, y}` — **no `synthetic: true` flag, indistinguishable from scout-tapped positions post-write**.

### 3.5 SelfLogEntry (Tier 1 — HotSheet inline on point doc)

Inside `point.selfLogs[playerId]`, written by `setPlayerSelfLog(tid, mid, pid, playerId, data)` (`dataService.js:788-794`):

```javascript
{
  breakout: string,                     // bunker.positionName — VERIFIED HotSheet.jsx:34/73/124-125
  breakoutVariant: string | null,       // variant slug ('late-break', 'na-wslizgu') OR free-text variant
  outcome: 'alive' | 'elim_break' | 'elim_midgame' | 'elim_endgame',  // LEGACY enum, normalized on read via deathTaxonomy
  loggedAt: serverTimestamp,
}
```

**Note:** outcome here uses the legacy `elim_*` enum, normalized on read by `deathTaxonomy.normalizeLegacyStage`: `elim_break`→'break', `elim_midgame`→'inplay', `elim_end`→'endgame'. Does NOT carry `deathReason`/`deathReasonText`/`eliminationTime` — those live in side data (§ 3.4) when scout/coach fills them.

### 3.6 Self-log shot subcollection

`/workspaces/{slug}/tournaments/{tid}/matches/{mid}/points/{pid}/shots/{sid}` (training mirror under matchups), via `addSelfLogShot` (`dataService.js:794-799`):

```javascript
{
  source: 'self',                       // hardcoded by dataService — discriminates from scout shots
  scoutedBy: auth.uid,                  // ⚠ ATTRIBUTION QUIRK: in KIOSK = COACH'S uid (not player's), see § 4
  playerId: string,                     // claim — firestore.rules:18 NOTE: NOT cross-checked server-side
  layoutId: string,                     // for collectionGroup query (mature picker freq)
  breakout: string,                     // bunker.positionName, indexed (firestore.indexes.json shots:0)
  targetBunker: string,                 // bunker.positionName — destination of the shot
  result: 'hit' | 'miss' | 'unknown',   // § 35 cycle-tap
  tournamentId: tid,                    // post-filter for fetchSelfLogShotsForPlayer
  createdAt: serverTimestamp,
}
```

**Caller fan-out:** `MatchPage.handleSelfLogSave` performs ONE save = N+1 writes — 1× `setPlayerSelfLog` (inline) + N× `addSelfLogShot` (one per shot in shots map).

### 3.7 PPT selfReports doc (Tier 2 — orphan, post-hoc matched)

`/workspaces/{slug}/players/{playerId}/selfReports/{auto-id}` (linked players) — schema confirmed via `playerPerformanceTrackerService.js:43-59` + `WizardShell.jsx:284-318`:

```javascript
{
  createdAt: serverTimestamp,
  layoutId: string,
  trainingId: string,
  teamId: string,
  matchupId: null,                      // ⚠ ALWAYS null at write — coach reconcile is "Separate product/brief" (§ 48.10)
  pointNumber: null,                    // ⚠ same — orphan
  breakout: { side, bunker, variant },  // bunker = positionName, variant = slug from Step 2
  shots: Array<{ side, bunker, order }> | null,    // null if skip-shots variant (na-wslizgu/na-okretke)
  outcome: 'alive' | 'elim_break' | 'elim_midgame' | 'elim_endgame',
  outcomeDetail: DeathReason | null,    // § 54 — 7 canonical enum values
  outcomeDetailText: string | null,     // free text when outcomeDetail='inaczej'/'inne'
}
```

**Defaults set in service** (`playerPerformanceTrackerService.js:48-58`): `matchupId: null, pointNumber: null, outcomeDetail: null, outcomeDetailText: null` always set as defaults — payload overrides.

### 3.8 PPT pending (unlinked-mode, § 52.3)

`/workspaces/{slug}/pendingSelfReports/{auto-id}` — `playerPerformanceTrackerService.js:192-205`:

Same shape as 3.7 + `uid` field for ownership. Migrated to `/players/{playerId}/selfReports/{sid}` via `migratePendingToPlayer(uid, playerId)` on link event:

- Batched 200 docs at a time (Firestore writeBatch limit)
- Strips `uid` before write to canonical (path pid is owner)
- **Preserves original `createdAt`** — lineage retained, NOT new serverTimestamp
- Per-doc fallback if batch fails (best-effort, partial failures don't roll back link)

### 3.9 PPT offline queue (localStorage)

`pptPendingQueue.js` — namespaced by mode:

- `'player'` mode → key `ppt_pending_saves_{playerId}`
- `'uid'` mode → key `ppt_pending_saves_uid_{uid}`

Shape: `[{ payload: SelfReportPayload, queuedAt: timestamp }, ...]`. Idempotency via unique `queuedAt`. `flushPending(id, createFn, mode)` walks queue in order, stops on first failure, removes successful entries.

### 3.10 Firestore composite indexes (collectionGroup)

`firestore.indexes.json`:

| Collection group | Fields | Purpose |
|---|---|---|
| `shots` | `(layoutId ASC, breakout ASC)` | § 36 shots-mature picker (Tier 1 HotSheet) |
| `shots` | `(playerId ASC, createdAt DESC)` | `fetchSelfLogShotsForPlayer` (per-player history) |
| `selfReports` | `(layoutId ASC, breakout.bunker ASC, createdAt DESC)` | § 48 PPT shots-mature picker (`getLayoutShotFrequencies`) |

Field overrides on `points` collection group: `homeData.scoutedBy` and `awayData.scoutedBy` indexed for scout-attribution queries (§ 33). Plus `tactics/createdBy`, `notes/createdBy`.

### 3.11 Death Taxonomy reference (`deathTaxonomy.js`)

```javascript
DEATH_STAGES = ['alive', 'break', 'inplay', 'endgame'];   // 4-stage axis (D3 decision)

DEATH_REASONS = ['gunfight', 'przejscie', 'faja',
                 'na_przeszkodzie', 'za_kare', 'nie_wiem', 'inaczej'];

reasonAllowed(stage) → stage ∈ {'break', 'inplay', 'endgame'}    // null for alive

// buildEliminationRecord output shape (canonical L5 elim record per slot):
{
  eliminated: boolean,
  deathStage: 'alive'|'break'|'inplay'|'endgame'|null,
  deathReason: DeathReason|null,
  deathReasonText: string|null,         // only when deathReason='inaczej'
  eliminationTime: number|null,
  filledBy: 'coach'|'self'|null,
  filledAt: ISO timestamp|null,
}

// Legacy normalize:
normalizeLegacyStage('elim_break')      → 'break'
normalizeLegacyStage('elim_mid'|'elim_midgame') → 'inplay'
normalizeLegacyStage('elim_end')        → 'endgame'

normalizeLegacyReason('przebieg')       → { reason: 'przejscie', inferredStage: null }
normalizeLegacyReason('kara')           → { reason: 'za_kare', inferredStage: null }
normalizeLegacyReason('unknown')        → { reason: 'nie_wiem', inferredStage: null }
normalizeLegacyReason('break')          → { reason: null, inferredStage: 'break' }   // ⚠ STAGE-AS-REASON ambiguity
normalizeLegacyReason('gunfight')       → { reason: 'gunfight', inferredStage: null }
```

**Decision D2.no-migrate (`deathTaxonomy.js:8-11`):** legacy storage values stay literal in old docs. Normalize on every read via `readNormalizedEliminations(teamData)`. NOT batch migration. New writes set canonical values explicitly.

---

## 4. Multi-source landscape — who writes what, where (FULL)

This is the **complete current state** — seven writer paths producing five distinct write shapes:

| # | Writer | Trigger | Target collection | Target shape | scoutedBy / source attribution |
|---|---|---|---|---|---|
| **W1** | Scout (MatchPage canvas) | `savePoint` → `savePointAsNewStream` | `points/{matchKey}_{coachShortId}_{NNN}` | `point.homeData` / `awayData` inline | `coachUid`, `homeData.scoutedBy = auth.uid` |
| **W2** | Scout (QuickLog synthetic) | QuickLogView `onSavePoint` → `addPointFn` | `points/{auto-id}` | `point.homeData.players[i] = {x:0.30, y:0.20\|0.50\|0.80}` | same as W1 |
| **W3** | Coach Live Tracking (LivePointTracker) | onSavePoint with `eliminations*` arrays | `points/{auto-id}` | `point.{home\|away}Data.eliminationStages/Reasons/...` | `filledBy: 'coach'` per slot |
| **W4** | Player HotSheet (Tier 1, § 35) | FAB in MatchPage → `handleSelfLogSave` | (a) `point.selfLogs[playerId]` inline (b) `points/{pid}/shots/{sid}` subcoll | (a) SelfLogEntry (b) Self-log shot doc | (a) implicit (key=playerId) (b) `source:'self'`, `scoutedBy = auth.uid (player)`, `playerId` |
| **W5** | Player PPT linked (§ 48) | `WizardShell.handleSave` → `createSelfReport` | `players/{pid}/selfReports/{auto-id}` | PPT selfReport doc | path pid IS the owner |
| **W6** | Player PPT unlinked (§ 52) | Same wizard, unlinked branch → `createPendingSelfReport` | `pendingSelfReports/{auto-id}` | Same as W5 + `uid` for ownership | `uid` field |
| **W7** | KIOSK (§ 55) | Tablet handoff in lobby → reuses HotSheet with `playerId={kiosk.activePlayerId}` prop override | Same as W4 | Same shape as W4 | (a) implicit (key=playerId) (b) `source:'self'`, ⚠ `scoutedBy = auth.uid (COACH on tablet, NOT player)`, `playerId = lobby tap target` |

**Critical W7 attribution detail** (`KioskContext.jsx:7-10`, E1 decision): KIOSK does NOT recreate identity hooks — HotSheet receives `playerId` as prop, MatchPage's normal FAB path uses `useSelfLogIdentity().playerId` (email match). KIOSK passes `kiosk.activePlayerId` (tile tap target).

This means in `points/{pid}/shots/{sid}` collection, `scoutedBy` cannot distinguish W4 from W7. W4 `scoutedBy = player's auth.uid`, W7 `scoutedBy = coach's auth.uid`. **Real player provenance = `playerId` field only.** Firestore rules accept both via different branches (player+source=self+scoutedBy=auth, OR isScout — `firestore.rules:281-288`).

**The key observation:** there is no single "observation" collection. Each writer goes to its own canonical place. The implicit "consensus" of "what happened in point X to player Y" is **scattered across at least 4 documents**:
- `point.homeData` or `point.awayData` (scout positions, eliminations)
- `point.selfLogs[Y]` (HotSheet/KIOSK breakout+outcome)
- `points/{pid}/shots/{sid}` where playerId == Y (HotSheet/KIOSK shots)
- `players/{Y}/selfReports/*` where matchupId == ??? (PPT — orphan, must be reconciled post-hoc)

**No server-side reconcile.** Readers stitch this together client-side, partially.

---

## 5. What is already "multi-source-aware" in main

Three subsystems implement multi-source patterns today. **Building on these is the correct approach for § 57** — not replacing.

### 5.1 § 42-44 Per-coach point streams + end-match merge (scout↔scout)

**Event sourcing for scout writes.** Each coach writes own immutable doc, merged on explicit user action.

- Doc ID format: `{matchKey}_{coachShortId}_{NNN}` — deterministic, no collision (`MatchPage.jsx:139-143`)
- Per-coach counter persisted in localStorage (`useCoachPointCounter.js`)
- Filter during match: `p.coachUid === currentUid \|\| !p.coachUid` (own + legacy grandfathered)
- `endMatchAndMerge(tid, mid)` (`dataService.js:338-475`) — bucket by coachUid, sort by index, write canonical `_merged_NNN` docs with `sourceDocIds[]` audit trail
- Idempotent (`match.merged === true` short-circuits)
- Conflict cases acknowledged: one coach skipping index = data corruption (§ 42 acknowledged)

**What's missing for § 57:** this only merges scout↔scout. Self-log writers (W4-W7) don't participate. Self-log data accumulates orthogonally to canonical merge.

### 5.2 § 55.4 KIOSK prefill resolver (multi-source READ aggregation, not consensus)

**Pure function, defensive, never throws.** `kioskPrefillResolver.resolveKioskPrefill(point, playerId, layout)` returns a snapshot consumed by the wizard at open time. Found at `src/utils/kioskPrefillResolver.js`.

**Output shape** (`emptyPrefill`):

```javascript
{
  bunker:       { value: { side, bunker }, source: 'scouting' } | null,
  bunkerPickerFilter: { zone, source: 'quicklog' } | null,    // Source C — DISABLED
  way:          { value, source } | null,                     // Source A — coach scouting rarely tags
  shots:        { value: [{side, bunker, result}, ...], source: 'scouting' } | null,
  stage:        { value: PPT outcome slug, source: 'coach' } | null,
  reason:       { value: PPT detail slug, source: 'coach' } | null,
  reasonText:   { value, source: 'coach' } | null,
}
```

**Sources implemented:**
- **Source A — Scouting positions+shots** from `point.<side>Data.players[slot]` + `.shots[slot]`. Slot lookup via `assignments.findIndex(a => a === playerId)` (Hotfix #3 lesson — IDs in assignments, NOT players). Position → bunker via `findNearestBunkerObj` with `SHOT_DISTANCE_THRESHOLD = 0.15` (15% normalized). Coach shots default `result: 'unknown'` — coach can't observe hit/miss.
- **Source D — Coach Live Tracking eliminations** via `readNormalizedEliminations(teamData)` from `deathTaxonomy.js`. Translates canonical → PPT slug via two maps:
  - `STAGE_CANONICAL_TO_PPT`: `'alive'→'alive', 'break'→'elim_break', 'inplay'→'elim_midgame', 'endgame'→'elim_endgame'`
  - `REASON_CANONICAL_TO_PPT`: `'gunfight'→'gunfight'`, `'przejscie'→'przejscie'`, `'faja'→'faja'`, `'na_przeszkodzie'→'na-przeszkodzie'`, `'nie_wiem'→'nie-wiem'`, `'inaczej'→'inne'`. **`za_kare` unmapped** — falls through to no prefill (per source comment, slug unification deferred).

**Sources NOT implemented:**
- **Source B — Drawing on layout** (sposób 1) — separate brief deferred per § 55.10
- **Source C — Quick Log zone narrowing** — `point.<side>Data.zones` field **DOESN'T EXIST**. Quick Log zones are local React state (`QuickLogView.jsx`), not persisted. Resolver returns `bunkerPickerFilter: null` always. This is a bug-flag candidate per Brief C STEP 4.1 escalation.

**For § 57 this is the canonical template.** Differences from what § 57 should add:
- Resolver is **read-time pure function** — runs every wizard open, never stored
- Resolver is **KIOSK-specific** — sources A+D hardcoded, priority hardcoded
- Resolver returns prefill shape (per-field `{value, source}`), not consensus shape
- No confidence/recency, no conflict log, no "consensus generation" event

§ 57 generalizes this to: cross-source consensus runner, per-entity (not per-write), with persistence.

### 5.3 § 52 PPT pending → migrate-on-link (lazy reconciliation pattern)

**Two-step reconciliation**, `playerPerformanceTrackerService.onPlayerLinked(uid, playerId)`:

1. **Local queue flush** (`pptPendingQueue.flushPending`): walk localStorage queue (uid namespace), call `createSelfReport(playerId, payload)` per entry, remove on success, stop on first failure. Idempotency via unique `queuedAt`.
2. **Server pending migrate** (`migratePendingToPlayer`): query `pendingSelfReports` where `uid == X`, batch 200 docs (`writeBatch`), per-doc fallback on batch failure. Strip `uid` before writing canonical (path pid is owner). **Preserves original `createdAt`** — lineage retained.

**Trigger:** any successful self-link write. ProfilePage `handleClaim`, PbleaguesOnboardingPage `handleSubmit`, admin link via `LinkProfileModal`.

**Failure isolation:** per-doc errors don't abort batch loop, link itself is the user-visible win. Failed docs stay in pending — user can retry by triggering link again.

**Idempotency:** re-running `onPlayerLinked` after a full migration is a no-op (no pending docs remain). Partial-migration retries only move uncommitted remainder.

**Pending docs explicitly EXCLUDED from layout-wide crowdsource** (`playerPerformanceTrackerService.js:170-178` comment). `getLayoutShotFrequencies` queries `collectionGroup('selfReports')` which doesn't include `pendingSelfReports` (separate path). Drafts are isolated until migration.

**Pattern reusable for § 57:** the team is comfortable with **lazy reconciliation** — write now, materialize later. Reconciliation criterion is per-doc ownership flip (`uid` → `playerId`), idempotent retry, per-doc failure isolation.

---

## 6. What's missing — the actual gap § 57 should fill

Per the handover task and § 55.11 backlog, **the gap is cross-source consensus at the player-in-point level**.

### 6.1 No "what happened to player X in point Y" canonical view

Today, to answer this, a reader must:

1. Find canonical merged point doc (post-end-match) — § 42 audit
2. Look up scout perspective of player X in `point.homeData/awayData[slot]` — requires knowing side
3. Layer on `point.selfLogs[X_id]` if HotSheet/KIOSK was used
4. Query `points/{pid}/shots/{sid}` where `playerId == X` for self-log shots — collectionGroup query, post-filter
5. Cross-reference `players/{X}/selfReports/{sid}` where `matchupId == Y` — ⚠ **`matchupId` is null until reconciled** (§ 48.10 blocker)
6. Resolve disagreements (scout says elim_break filledBy='coach', player self-log says alive — who's right?)

**There is no service function for this.** Insights/stats functions in `generateInsights.js` operate on `points` array (the merged docs), reading scout side data only — they ignore `selfLogs` and `selfReports` completely.

**Verified:** `coachingStats.js` reads only `pt.players[]` and `pt.bumpStops[]`. `generateInsights.js` 28 functions touch only `points[i].{homeData,awayData,teamA,teamB}.*`. **No reader function references `selfLogs` or `selfReports` or `shots` subcollection.**

**Implication:** all the player self-log data being collected since 2026-04-20 is **not used by any insight or stat today**. Multi-source consensus is the prerequisite for those reads.

### 6.2 PPT orphan reconciliation explicitly deferred (§ 48.10)

Quote from § 48.10 (verified in DESIGN_DECISIONS.md): *"Matchup matching product — coach-side workflow to assign orphan selfReports to matchup/point. Separate product/brief."*

This is the **multi-source reconcile** Jacek is asking about, NAMED but undesigned.

`createSelfReport` always sets `matchupId: null, pointNumber: null` (`playerPerformanceTrackerService.js:50-51`). PPT reports accumulate without point linkage. A coach action ("assign orphan to point") doesn't exist today.

### 6.3 Death reason asymmetry (§ 54.3.1)

Coach can set `deathReason` for break stage, player wizard can't. Both write to the same canonical schema. Read code "treats `deathReason: null` as unknown regardless of source — no special-case for break". This is **multi-source-aware on the schema level** (canonical keys are unified per § 54.5), but the resolution rule ("if coach has reason, prefer coach; otherwise null") is **implicit in coach UI design**, not encoded in a reconciler.

### 6.4 § 55.11 backlog — already drafted, not implemented

Quoted from DESIGN_DECISIONS § 55.11: *"Idealna docelowa architektura: każdy Save tworzy immutable fragment w nowej kolekcji `pointFragments/{fid}`... Reconciler engine (client-side, deterministyczny) auto-matchuje fragments w pary po `pointNumber` + time proximity (60s window)..."*

**§ 57 = picking up § 55.11 + extending it** with mobile session decisions: 5-level fractal pattern, shared vocabulary diagram, per-field provenance shape (templated on § 55.4 prefill resolver).

---

## 7. Shared vocabulary — bunker.positionName flows everywhere

The handover noted that diagram 4 (Shared Vocabulary) was missing from `ARCHITECTURE_C4.html`. Here's the full evidence for the diagram:

| Layer | File:line | How it uses positionName |
|---|---|---|
| **Storage primitive** | `theme.js:328-332` | `POSITION_NAMES.{dorito\|snake\|center}` master vocabulary |
| **Layout creation** | `dataService.js:484` | `bunkers: data.bunkers` — bunker docs carry `positionName` field |
| **Layout migration** | `dataService.js:498-499` (comment) | legacy `name` → `positionName` migration on layout doc level |
| **Canvas rendering** | `drawBunkers.js:38` | `const label = b.positionName ?? b.name ?? '';` |
| **HotSheet bunker lookup** | `HotSheet.jsx:73` | `m.set(b.positionName \|\| b.name, b)` — Map keyed by positionName |
| **HotSheet breakout state** | `HotSheet.jsx:34, 124-125` | `breakout` state = positionName string, passed unchanged to save |
| **HotSheet shots state** | `HotSheet.jsx:36, 98-99` | `shots = { [targetBunker.positionName]: 'hit'\|'miss'\|... }` |
| **Self-log shot doc** | `dataService.js:794` (`addSelfLogShot`) | `breakout: positionName`, `targetBunker: positionName` — Firestore-indexed strings |
| **Firestore index** | `firestore.indexes.json` | `shots(layoutId ASC, breakout ASC)` — positionName as join key |
| **PPT wizard** | `WizardShell.jsx:289-296` (handleSave) | `breakout: { side, bunker (positionName), variant }` |
| **PPT selfReport index** | `firestore.indexes.json` | `selfReports(layoutId, breakout.bunker, createdAt)` — same positionName join key |
| **KIOSK prefill (Source A)** | `kioskPrefillResolver.js:151, 165` | resolves `nearest.positionName \|\| nearest.name` for prefill |
| **Insights — break bunker** | `generateInsights.js:1081 computeBreakBunkers` + `:1253 findNearestBunker` | aggregates by nearest-bunker positionName per point |
| **Position → side derivation** | `helpers.js:257 getBunkerSide(x, y, doritoSide)` + `kioskPrefillResolver.js:151,164` | runtime mapping bunker.x/y → 'dorito'\|'snake'\|'center' — NOT stored |
| **Position → bunker mapping** | `helpers.js:129 nearestBunker(pos, bunkers, threshold=0.08)` + `kioskPrefillResolver.js:75-87 findNearestBunkerObj(pos, bunkers, 0.15)` | runtime mapping position → positionName, threshold per caller |

**Three failure modes the diagram should highlight:**

1. **Rename invalidation:** if positionName changes on layout (e.g. "Snake1" → "Cobra"), all historical observations (HotSheet shots, PPT selfReports, insights aggregations) become disjoint. **No snapshot of positionName at observation time** — observations refer to current bunker state. Rename = silent re-categorization of months of data.

2. **Threshold inconsistency:** `helpers.nearestBunker` uses 0.08 default, `kioskPrefillResolver.findNearestBunkerObj` uses 0.15. Same input position → different bunker resolution depending on caller. § 57 should standardize.

3. **Side derivation runtime:** `getBunkerSide(b.x, b.y, doritoSide)` runs every render. If layout's `doritoSide` flips ('top' ↔ 'bottom'), all historical position interpretations re-classify. Currently no observation snapshots `side` at write — only PPT selfReport stores explicit `breakout.side` from wizard click (provenance preserved at write). HotSheet self-log shot stores `breakout` (positionName string) only — side is derived runtime from layout lookup.

---

## 8. Five handover discovery questions — RESOLVED

| # | Handover question | Answer | Evidence |
|---|---|---|---|
| 1 | Is `breakout` in self-log shot the same string as `bunker.positionName`? | **YES** | `HotSheet.jsx:73, 124-125`; `dataService.js:794`; § 48.5; `WizardShell.jsx:284-318` |
| 2 | Is `targetBunker` `bunker.id` or `positionName`? | **`positionName`** (string) | `HotSheet.jsx:36, 98-99` (state keyed by positionName); `addSelfLogShot` passes through |
| 3 | Eliminations format — boolean array per slot? With timestamps? | **Per-slot boolean (factory default `false`) + parallel arrays for stage/reason/text/time/cause/filledBy** | `pointFactory.js:15-19`; § 54.5; `MatchPage.jsx:182-183`; `deathTaxonomy.js:133-159` |
| 4 | Is `assignments` flat `[playerId, ...]` or obj? | **Flat `Array(5).fill(null)` of `playerId \| null`** | `pointFactory.js:13`; `QuickLogView.jsx:81-87`; `MatchPage.jsx:170-174`; `kioskPrefillResolver.js:136-139` (slot lookup) |
| 5 | QuickLogView synthetic coords — does it set a `synthetic: true` flag? | **NO** — synthetic positions write as plain `{x, y}` in `players[i]`, indistinguishable post-write | `QuickLogView.jsx:18-22, 87`; `pointFactory.js:12` (initial null) |

**Implication for question 5 + § 57:** architecture should consider provenance field (`origin: 'scout'|'quicklog'|'kiosk-prefill'|'live-tracking'`) — currently lost. Today's Tier 1 schema in `points/shots` collection has `source: 'scout'|'self'`, which is partial — doesn't distinguish QuickLog synthetic from canvas-tap (both 'scout').

---

## 9. New questions that emerged from discovery — RESOLVED

| # | Question | Status |
|---|---|---|
| N1 | What does `kioskPrefillResolver.js` actually return? Single resolved values, or `{value, source, confidence}` triples? | **`{value, source}` per field** — per-field provenance, **no confidence/recency**. Hardcoded priority order (Source A then D). See § 5.2. |
| N2 | How does `pointFactory.js` shape new points? Does it set initial homeData/awayData skeleton? | **Yes** — `baseSide(side)` returns canonical empty schema (10 fields per side). `createEmptyPointData(roster, side)` pre-populates `assignments` from roster (other fields null/false/empty). `createPointData(roster, assignments, zonePlayers, side)` populates from QuickLog selection. **§ 54 elim fields NOT in factory** — added by save flow. |
| N3 | Does PPT wizard ever write to `point.shots` subcollection (W4 path) or only to `selfReports` (W5)? | **PPT writes ONLY to selfReports** (`WizardShell.jsx:284-318` → `createSelfReport`/`createPendingSelfReport`). HotSheet writes to inline + shots subcollection (`MatchPage.handleSelfLogSave`). **Two completely separate code paths** sharing schema concepts but not storage. |
| N4 | Has every writer migrated to § 54 elim schema? | **NO — schema asymmetry persists.** New writes set canonical `eliminationStages/Reasons/...`. Legacy `eliminationCauses` still read by `readNormalizedEliminations`. HotSheet `selfLogs[playerId].outcome` still uses `'elim_break'/'elim_midgame'/'elim_endgame'` legacy enum, normalized on read. |
| N5 | Does any reader function consider `selfLogs` / selfReports / shots subcollection in its aggregations today? | **NO — major finding.** `coachingStats.js` reads only `pt.players` and `pt.bumpStops`. `generateInsights.js` 28 functions touch only side data. **All player self-log data is invisible to current insights pipeline.** This is a real consequence of § 6.1 — multi-source consensus is the prerequisite. |

---

## 10. Implications for proposed § 57

Based on the above, the design space for § 57 is much narrower than handover assumed:

1. **Don't propose `pointFragments/{fid}` from scratch.** § 55.11 already has it as backlog. § 57 EXTENDS § 55.11.
2. **Reuse per-coach stream pattern (§ 42-44) for self-log + KIOSK + Coach Live writes.** Each writer = stream. End-of-match (or end-of-training-session, or explicit "reconcile" action) → consensus build.
3. **The reconcile target is canonical L5 doc** — single "what happened to player X in point Y" view materialized from all sources. NEW. Schema templated on `kioskPrefillResolver` output (per-field `{value, source, confidence?}`).
4. **Provenance must be recorded uniformly.** Each L5 field needs `(value, source, writerUid, timestamp, confidence?)`. Today scattered across `scoutedBy`, `filledBy`, `selfLogs[pid].loggedAt`, `source:'self'` — inconsistent shapes (some implicit, some explicit). § 57 unifies.
5. **Conflict resolution rules are per-field, not per-document.** Concrete rules from existing data semantics:
   - **Position:** scout > quicklog (canvas tap higher fidelity than zone-derived). Currently both written to same field; no precedence encoded.
   - **DeathStage:** self-log > coach observation (player knows what happened to them).
   - **DeathReason:** coach > self-log (per § 54.3.1: "coach often has reason intel on break elims that a player on break wouldn't categorize"; player wizard restricted to non-break reasons).
   - **DeathReasonText (free):** ALWAYS source-of-truth — only filled when reason='inaczej', always intentional.
   - **Shots fired:** self-log > scout (player remembers shots; scout sees lanes). Per § 55.4 Source A coach shots default `result: 'unknown'`.
6. **Shared vocabulary risk** — observations should snapshot positionName at write-time, not reference live (§ 7 failure mode 1). PPT does this (`breakout.bunker = positionName string`). HotSheet shots subcollection does this. Insight queries do NOT — they runtime-match positions against current bunkers via `nearestBunker`.
7. **Threshold standardization** (§ 7 failure mode 2) — `nearestBunker` 0.08 vs `findNearestBunkerObj` 0.15. § 57 should pick one, document the choice.
8. **Migration plan template established by § 52** (pending → canonical via `migratePendingToPlayer`). Pattern reusable for "raw observation → consensus" flip. Especially: preserve `createdAt`, batch 200 with per-doc fallback, idempotent retry, failure isolation.
9. **Stage/reason translation maps already exist** (`kioskPrefillResolver.js:99-115`). § 57 reconciler can reuse them or generalize.
10. **`readNormalizedEliminations(teamData)` is the closest thing to a per-side reconciler today.** It collapses 5 elim fields into 5 normalized records. § 57 reconciler at L5 level needs a similar function but cross-source: collapse scout side data + selfLogs[pid] + shots subcoll where playerId=pid + selfReports[matchupId=mid, pointNumber=N] into one record per (pid, pid_in_point).

---

## 11. Outstanding gaps — FULLY CLOSED for diagram authority

All 7 round-2 files arrived and were analyzed. **Discovery is complete enough for Stage 2.**

Files NOT in scope (lower-priority — schema understood without them):
- `src/components/ppt/steps/Step{1-5}.jsx` — UI implementation, schema unchanged from § 48
- `src/components/kiosk/KioskWizardHost.jsx` — orchestration, behavior inferable from § 55 + KioskContext
- `src/hooks/usePPTIdentity.js` — email→player mapping, returns `{playerId, uid}` per WizardShell.jsx:131 usage
- `src/components/training/LivePointTracker.jsx` — UI for Coach Live Tracking, schema confirmed via MatchPage call site (`:182-183`)

These would tighten implementation details for the future § 57 implementation brief, but **don't change architectural decisions**. Stage 2 diagrams + Stage 3 § 57 patch can proceed.

---

## 12. Proposed Stage 2 — 4 SVG diagrams

Pending Jacek's accept of this report:

**12.1 Diagram 1 — Context (L1)** — same as old `ARCHITECTURE_C4.html`, no change. Coach / Scout / Player → System (PbScoutPro) → External (Firebase).

**12.2 Diagram 2 — Data Structure (L2) — extended hierarchy with full L5.**

5-level box hierarchy with EVERY field of L5 Player-in-Point listed concretely. Three columns per L5 view:

- **Scout-side fields** (`homeData/awayData[slot]`): players[i], assignments[i], shots, quickShots, obstacleShots, eliminations, eliminationStages, eliminationReasons, eliminationReasonTexts, eliminationTimes, eliminationCauses (legacy), filledBy, bumps, runners
- **Self-log inline fields** (`selfLogs[playerId]`): breakout, breakoutVariant, outcome, loggedAt
- **Self-log shot subcollection** (`shots/{sid}` where playerId=X): source, scoutedBy, breakout, targetBunker, result, layoutId, tournamentId, createdAt
- **PPT orphan** (`players/{X}/selfReports/`): breakout{side,bunker,variant}, shots[], outcome, outcomeDetail, outcomeDetailText, matchupId (null until reconciled), pointNumber (null), createdAt

Markers showing which writer (W1-W7) populates which field. Markers showing consensus-eligible vs raw-observation fields.

**12.3 Diagram 3 — Data Flow (L3) — actual writers + existing reconcilers + gap.**

7 writer paths W1-W7 → respective Firestore paths. **Existing reconcilers shown:**
- § 42 `endMatchAndMerge` (scout↔scout, post-action)
- § 52 `onPlayerLinked` → `migratePendingToPlayer` (uid→playerId, post-event)
- § 55.4 `resolveKioskPrefill` (read-time, KIOSK only, sources A+D)
- `readNormalizedEliminations` (read-time, per-side normalize)

**Gap shown explicitly:** "missing: cross-source consensus reconciler at L5 player-in-point level". Multi-source merge between scout side data + selfLogs + shots subcollection + selfReports.

**12.4 Diagram 4 — Shared Vocabulary (L4) — NEW.**

`bunker.positionName` flow from L1 Layout through every consumer. Shows:
- 13 file:line touch points (table § 7)
- 3 failure modes annotated (rename invalidation, threshold inconsistency, side runtime derivation)
- Distance threshold variants (0.08 helpers, 0.15 KIOSK) flagged

---

## 13. Proposed Stage 3 — § 57 patch

After diagram acceptance:

**13.1 New section in `DESIGN_DECISIONS.md`:**

```
## 57. Multi-source observations architecture (proposed, builds on § 55.11)
```

Content (preview):
- **Problem statement** — citing § 6.1, § 6.2, § 6.3, § 9-N5 (insights blind to self-log)
- **Decision** — 10 finalized in mobile session 2026-04-30 (5-level fractal, observations event-sourced, consensus = materialized view, immutable observations, shared vocabulary snapshotted)
- **Schema additions:**
  - L5 consensus doc — per-(point, playerId) materialized view with per-field `{value, source, writerUid, ts, confidence?}`
  - Reconciler service signature — `reconcilePlayerInPoint(pid, playerId)` returning consensus doc
  - Optional: `pointFragments/{fid}` (from § 55.11) — defer or fold into consensus model
- **Conflict resolution rules** (per § 10 above) — encoded as table in spec
- **Migration plan** in 3 phases:
  1. **Dual-write** — new writes go to canonical (existing) + new observations collection. No reads change.
  2. **Cutover** — readers migrate to consensus query. Old paths still written for safety.
  3. **Cleanup** — remove dual-write after readers stable for N days.
- **Open questions:**
  - Reconcile timing: end-of-match like § 42, post-event like § 52, or read-time like § 55.4?
  - Cloud Function vs client-side?
  - Snapshot policy for shared vocabulary (positionName at write-time)?
  - Versioning if positionName changes (rename → re-classify or freeze)?
  - `eliminationCauses` legacy: keep normalize-on-read or finally migrate?
- **Optional companion doc** at `docs/architecture/POINT_OBSERVATIONS.md` if § 57 exceeds ~300 lines.

**13.2 Update `HANDOVER.md`** with:
- "Recently shipped" — § 57 spec drafted
- "Awaiting decision" — Jacek to accept § 57 schema + reconcile timing question

---

## 14. Summary of decisions awaiting Jacek

| # | Decision needed | Status |
|---|---|---|
| **D1** | Doppakowanie 7 plików | ✅ DONE — all 22 files analyzed |
| **D2** | Approval of this discovery report → proceed to Stage 2 (diagrams) | **Pending** |
| **D3** | (Stage 2 deliverable) approval of diagrams → proceed to Stage 3 (§ 57 patch + handover update) | Future |

End of discovery report v2.
