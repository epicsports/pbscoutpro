# Scouting — Concurrency, Local Cache & Connectivity Behavior

> **Created:** 2026-05-29 (Opus discovery brief — "map before rebuild" for the PWA/offline track).
> **Type:** as-built map. Read-only discovery; no mechanism change made.
> **Scope:** the three local layers that hold a scouting point (React state → localStorage draft → Firestore IndexedDB cache), the per-coach concurrent model, the merge/matcher logic, and **what already happens on connectivity loss**.
>
> **Relationship to existing docs (no duplication):**
> - **`CONCURRENT_SCOUTING.md`** — the per-coach-stream model + end-match merge. Still accurate on the *model*, but **two sections are now STALE** (see § 2.4 below): the doc-ID scheme and the localStorage counter were retired 2026-05-15.
> - **`MULTISOURCE_RECONCILIATION.md`** — the § 70 self-log↔scout matcher (training only). Authoritative; summarized here in § 3.2 only to disambiguate it from coach-vs-coach merge.
> - This doc is the single place that maps the **cache + connectivity** dimension end-to-end, which neither of the above covers.

---

## 0. TL;DR

A scouting point lives in **three nested local layers** before it is durable on the server:

| Layer | Holds | Survives refresh? | Survives wifi drop? | Where |
|---|---|---|---|---|
| **1. React state** | the live in-progress point (`draftA`/`draftB` + outcome + ancillary) | ❌ no | ✅ (not yet committed) | `MatchPage.jsx:225-229` |
| **2. localStorage draft** | debounced snapshot of layer 1 (§ 89 / B5) | ✅ 24h TTL | ✅ | `scoutDraft.js` |
| **3. Firestore IndexedDB cache** | *committed* points + rosters/layout already read | ✅ | ✅ + queues writes | `firebase.js:41-44` |

**Net connectivity-loss behavior already in place:** an in-progress point survives refresh/crash/back-nav (layer 2); a *committed* point during a wifi drop is **not lost** — the Firestore SDK writes it to the local cache and flushes on reconnect (layer 3). The **residual gap** for true offline scouting is narrow (§ 5): cold-start offline boot (auth + never-fetched data), no offline UX affordances, and the fragile single-tab + silently-rejecting SW registration.

---

## 1. Layer 1+2 — In-progress point cache during scouting

### 1.1 React state (the live point)

The in-progress point is plain React state on `MatchPage`:

- `MatchPage.jsx:225-229` — `draftA`, `draftB` (per-side team data: `players`, `shots`, `quickShots`, `obstacleShots`, `assign`, `bumps`, `elim`, `elimPos`, `runners`, `penalty`), plus `outcome`, `draftComment`, `isOT`.
- Plus `annotations`, `fieldSide`, `activeTeam`, `editingId` — all part of the autosave snapshot below.

This is **lost on a page refresh**. It is rehydrated from layer 2.

### 1.2 localStorage autosave draft (§ 89 / B5) — `src/services/scoutDraft.js`

A debounced localStorage snapshot is the durable-across-refresh buffer. **It is a pre-commit buffer only — it does NOT change the commit path** (`savePoint` stays outcome-gated; the concurrent `status:'partial'` semantics are orthogonal — `scoutDraft.js:1-15`).

- **Key shape** (`scoutDraft.js:45-55`, built at `MatchPage.jsx:686-692`):
  `scout_draft__<kind>__<eventId>__<containerId>__<scoutingSide>__<editingId||'new'>`
  - `kind` ∈ `{tournament, training}`; `eventId` = tournamentId|trainingId; `containerId` = matchId|matchupId.
  - **`scoutingSide` and `editingId||'new'` are load-bearing** — they prevent cross-side bleed and stop a new-shell draft from hydrating into an existing-point edit context.
- **Serialized snapshot** (`MatchPage.jsx:734-739`, persisted at `scoutDraft.js:89-97`):
  `{ draftA, draftB, outcome, draftComment, isOT, annotations, fieldSide, activeTeam, editingId, updatedAt }`.
- **Debounce:** 2000 ms after any draft-content change (`MatchPage.jsx:730-746`).
- **Non-pristine guard** (`scoutDraft.js:117-127`, called at `MatchPage.jsx:740`): persists only if ≥1 player placed OR ≥1 shot OR ≥1 elimination OR an outcome is set. A stray comment/annotation alone does **not** trigger a save (ghost-restore guard).
- **TTL = 24h** (`scoutDraft.js:38`). On load, snapshots older than TTL are dropped without restore (`scoutDraft.js:71`) — `loadScoutDraft` returns `null` and the user starts fresh.
- **Restore** (`MatchPage.jsx:700-722`): fires on URL-identifier change, **only for the `__new` key** (no `?point=` in URL). When the URL carries `?point=<id>`, the auto-attach effect calls `editPoint`, which loads Firestore state and **wins over** any local draft (documented precedence).
- **Cleared** on commit success (`MatchPage.jsx:1254-1256`), explicit discard via the editor ⋮ menu (`:2017`, `:2063`), and ClearAll.
- **All storage ops are `try/catch`-wrapped** (`scoutDraft.js:64-106`) — quota / private-mode / parse errors silently disable autosave rather than crash the scout flow.

> Pattern note (`scoutDraft.js:12-14`): this mirrors the PPT `WizardShell` persistence, **not** the `pptPendingQueue` (which is the PPT self-report offline-write retry queue — a *different* concern that scout points do **not** use; see § 4.2).

### 1.3 What survives what

- **Page refresh mid-scout:** layer 1 lost → restore effect rehydrates from layer 2 (within 24h). Already-committed points come back from layer 3 (Firestore cache).
- **Connectivity drop mid-point (not yet committed):** nothing to sync; layer 1 + layer 2 hold the draft. Reconnect changes nothing — the user commits when ready.
- **Connectivity drop after commit:** see § 4.

---

## 2. Layer 3a — Concurrent scouting (per-coach streams)

> Full model + rationale in **`CONCURRENT_SCOUTING.md`**. Summarized here with the **current** code references and the stale-spot corrections.

### 2.1 Side split

- `MatchPage.jsx:855` — `isConcurrent = !isTraining && (scoutingSide === 'home' || scoutingSide === 'away')`. Concurrency is a **tournament-only** mode; training is solo-per-matchup.
- `MatchPage.jsx:856` — `mySideKey = scoutingSide === 'home' ? 'homeData' : 'awayData'`.
- **Side is chosen by URL** (`?scout=<teamId>` → derived to `home`/`away`) and is **not persisted** on the match doc.

### 2.2 No claim / heartbeat / presence today (Brief F retirement)

- `MatchPage.jsx:833-837` — explicit comment: the claim system is **retired**. `match.home/awayClaimedBy/At` are **no longer written or read**; stale values on old docs are harmless.
- There is **no heartbeat, no TTL, no per-coach LIVE badge, no presence/lastSeen** in current code. The only "LIVE" signal is match/tournament-level (`tournament.status === 'live'`), not per-coach.
- Consequence (open bug **B20**): two devices on the **same UID** have **zero contention signal** — no banner, no indicator.

### 2.3 Shared shells + side-safe writes

- A point doc holds **both** `homeData` and `awayData`; each coach writes **only their own side** (`MatchPage.jsx:1120-1134`). `teamA`/`teamB` are written as a legacy mirror.
- **Status machine:** `open` (empty shell) → `partial` (one side has data) → `scouted` (both sides have data). Computed client-side at save (`MatchPage.jsx:1148`, `:1161`, `:1171`, `:1178`).
- **Joinable search** (only when `mode !== 'new'`, `MatchPage.jsx:1093-1098`): newest-first, find a point where my side is empty and status is `open`/`partial`, and join it. `mode=new` bypasses this and routes to the per-coach stream.
- Writes are **immediate, single-doc**: `addPoint` = `addDoc` (`dataService.js:864-867`), `updatePoint` = `updateDoc` field-merge (`dataService.js:869-870`). No app-level batching for point saves.

### 2.4 ⚠️ STALE in `CONCURRENT_SCOUTING.md` — corrected here

`CONCURRENT_SCOUTING.md` (dated 2026-04-21) describes deterministic doc IDs `{matchId}_{coachShortId}_{NNN}` plus a **localStorage counter** `pbscoutpro_counter_{matchId}_{uid}`. **Both were retired 2026-05-15** (NXL Czechy data-corruption fix; § 42.1). Current behavior (`MatchPage.jsx:145-174`, `savePointAsNewStream`):

- New stream points use **auto-generated Firestore IDs** (`addDoc`), not deterministic IDs.
- `index` is computed **reactively** from the live `points` array: `Math.max(...myPoints.map(p => p.index||0)) + 1`, where `myPoints = points.filter(p => p.coachUid === uid)`. Two devices on the same UID now converge on the next free index from the **same onSnapshot source of truth** instead of independent counters.
- Each new-stream doc carries `{ coachUid, index, canonical:false, mergedInto:null }`.
- This is **structurally safe** for the merge because `endMatchAndMerge` groups by `coachUid` and sorts by `index` (not by doc ID), so old `_NNN` docs and new auto-ID docs coexist and merge correctly.

### 2.5 Read filter (own-stream during match)

- `useFirestore.js usePoints(...)` subscribes to all points, then filters client-side:
  - **During match** (`currentUid` set): show `p.coachUid === currentUid || !p.coachUid` (own stream + legacy grandfathered docs).
  - **Post-merge** (`merged`): show `p.canonical === true` only.
- So during a match each coach sees **only their own progress** — there is no live cross-device preview by design (correctness > liveness).

---

## 3. Layer 3a/b — Merge & matcher

### 3.1 Coach-vs-coach end-match merge — `endMatchAndMerge` (`dataService.js:882-1009`)

This is the merge the brief asks about ("two coaches' contributions to the same point").

- **Idempotent:** no-op if `match.merged === true` (`:885`).
- **Group** all points by `coachUid` (`legacy` bucket for docs without one), sort each stream by `index` (legacy by `order`) (`:907-916`).
- **Pairing (≥2 coaches):** index-lockstep — `streamA[i]` paired with `streamB[i]` (`:957-997`). For each pair, write a **canonical** doc `{mid}_merged_{NNN}` taking `homeData` from whichever coach has it and `awayData` from the other, `status` = `scouted` if both populated else `partial`, with `sourceDocIds:[pA.id,pB.id]` as audit trail; source docs get `mergedInto` (`:987-988`).
- **Solo / legacy / leftover** points are marked `canonical:true` in place (`:931-947`, `:991-996`).
- **Score** computed once from canonical outcomes (`win_a`/`win_b`) and written to `match.scoreA/B` (`:920-928`, `:1000-1006`) — individual saves never write the score (Brief 9 Option A, avoids the coachUid-filtered race).

**Status: FULL for 2 coaches; partial for 3+.** The code processes the first two `coachUid` streams; 3+ coaches is accepted as "user responsibility — out-of-sync counters" (`:948-956`). **Conflict resolution is positional, not semantic:** it pairs by index position and takes each side from whichever coach supplied it; it does **not** reconcile two coaches who *both* scouted the *same* side of the *same* point (last-write at the field level would win, but the model steers each coach to a distinct side).

### 3.2 Self-log↔scout matcher — DIFFERENT subsystem (`MULTISOURCE_RECONCILIATION.md`)

The "propagator / matcher / conflict resolver" the brief's memory references is **§ 70 (Klocek 2)** — it reconciles **player self-log `selfReports` against coach-scouted point slots**, and runs **only in training** (`propagateMatchup`, `dataService.js:1517-1611`). It is **not** the coach-vs-coach path.

- 3-axis match: **identity** (`assignments.indexOf(playerId)` → side+slot), **temporal** (`alignSequence` pairs reports↔points by `createdAt`/`order`), **position confidence** (`high`/`low`/`unknown` from bunker→synthetic-coord distance).
- `high`/`unknown` → write-back into the point slot (`propagateSelfReportToPoint`); `low` → flag `needsReview` for the Stage-4 manual queue (`applySelfReportOverride` / `dismissSelfReportFlag`, `:1641-1684`).
- **What's deferred:** late-log on-write propagation (safety net = training-close re-run) and any *un-propagate* / inverse. The matcher itself is **shipped through Stage 4**.

### 3.3 Dedup on read

- Points: no dedup field; `sourceDocIds` is audit, not dedup. Duplicate prevention is structural (own-stream filter + canonical-only post-merge, § 2.5).
- selfReports: flat collection-group reads, one doc per report since the legacy nested path was retired (§ 90.7.3) — no read-time dedup needed.

---

## 4. Layer 3 — Write/sync path + connectivity loss

### 4.1 Firestore offline persistence is ENABLED

- `firebase.js:41-44` — `enableIndexedDbPersistence(db)`. On failure it only `console.warn`s: `failed-precondition` (**multiple tabs open** — persistence is single-tab) or `unimplemented` (browser unsupported). **Non-fatal, silent degrade.**
- Consequence: **reads** of already-fetched data (points, rosters, layout) are served from the local IndexedDB cache when offline; **writes** issued offline are queued by the SDK and flushed on reconnect.

### 4.2 How a logged point reaches Firestore

- **Immediate, per-doc, no app-level queue.** `savePoint` (`MatchPage.jsx:1045-1231`) calls `addPoint`/`updatePoint` (or `savePointAsNewStream`) directly. The only `writeBatch` on this path is inside `endMatchAndMerge`.
- **There is no app-level retry queue for scout points** — unlike PPT self-reports (`pptPendingQueue`). Scout points rely entirely on the **Firestore SDK's** built-in offline write queue (layer 3).

### 4.3 Connectivity-loss behavior, concretely

| Event | Behavior |
|---|---|
| **Edit a point, drop wifi, keep editing** | Layer 1 + layer 2 hold the draft. Nothing tries to sync until commit. |
| **Commit a point while offline** | With IndexedDB persistence on, `addDoc`/`updateDoc` **resolve against the local cache** and the write is **queued for the server** — it does **not** reject for lack of network. The point is **not lost**; it syncs on reconnect. The success path clears the localStorage draft. |
| **Genuine write error (rules denial, etc.)** | `savePoint` catch shows an `alert('Save failed: …')` and the draft is **not** cleared, so a retry is possible (`MatchPage.jsx` catch). |
| **Refresh after a long offline session** | <24h: localStorage draft restores; ≥24h: draft expired, start fresh. Firestore cache still serves prior points for review. |
| **Two tabs open** | IndexedDB persistence fails (`failed-precondition`) → that session loses offline cache. Scouting should stay single-tab. |
| **End match while offline** | `endMatchAndMerge`'s batch write queues like any other write and flushes on reconnect. |

### 4.4 Service worker / PWA shell

- `public/sw.js` (`CACHE_NAME = 'pbscoutpro-v2'`): precaches the app shell (`./`, `index.html`, `manifest.json`, logos), cache-first for same-origin JS/CSS/images, network-first for HTML navigation.
- **`sw.js:34-36` explicitly skips cross-origin requests** → Firestore (`firestore.googleapis.com`) is **never** touched by the SW. Data offline comes from the Firestore IndexedDB cache, **not** the SW.
- `main.jsx` registers `sw.js` on `load` with **no `.catch()` and no explicit scope** → registration failures reject silently (open bug **B21**).

---

## 5. Feed-back to the PWA / offline-recovery track

### 5.1 What the existing mechanism ALREADY provides offline

1. **Local in-progress capture** — debounced localStorage draft (24h), survives refresh / tab-close / back-nav / crash (§ 1.2).
2. **Queued write of committed points** — the Firestore SDK's offline persistence resolves writes locally and flushes on reconnect; a point committed during a wifi drop is **not lost** (§ 4.3).
3. **Offline reads** — any data already fetched online (points, rosters, layout, bunkers) is served from IndexedDB when offline.
4. **Matching across reconnect** — `endMatchAndMerge` and the §70 matcher are batch/queued writes; they run online or queue and flush.
5. **App shell loads offline** — SW serves cached HTML/JS/CSS.

**This is most of an offline-scouting story already.** The capture buffer, the durable-write queue, and the read cache exist today.

### 5.2 The residual gap vs *true* offline scouting

1. **Cold-start offline boot is unverified / likely broken.** (a) `ensureAuth` requires a live auth handshake with a 10s timeout (`firebase.js:54-69`) — a launch with no network may fail to authenticate. (b) Data never fetched while online is absent from IndexedDB → a *first-ever* offline session has no rosters/layout. The HANDOVER "app opens offline but can't scout" finding is really this cold-start case, **not** a warm session.
2. **No offline UX.** No offline banner; no "queued / will sync" indicator on a committed-while-offline point. The only feedback on a failed write is an error `alert` (which, per § 4.3, mostly fires for *non-network* errors). Users get no confidence signal.
3. **Fragile SW + single-tab persistence.** B21: SW registration silently rejects (no `.catch`, `main.jsx`). `enableIndexedDbPersistence` is the **single-tab** legacy API and silently degrades with two tabs.
4. **SW caches no data by design** — correct, but it means the offline data story rests entirely on IndexedDB persistence being healthy.
5. **No cross-device presence** (B20) — orthogonal to offline, but the same "no live signal" theme.

### 5.3 Re-sizing the PWA work

The offline **write path** largely **does not need rebuilding** — the SDK queue + localStorage draft already cover capture and durable sync across a drop. The remaining, **much smaller** PWA scope is:

- **Harden SW registration** (add `.catch` + scope; close B21).
- **Multi-tab-safe persistence** — migrate `enableIndexedDbPersistence` → `persistentLocalCache({tabManager: persistentMultipleTabManager()})` (or `enableMultiTabIndexedDbPersistence`).
- **Offline auth / cold boot** — allow booting on a cached/persisted session so a no-network launch still reaches the scout view; pre-warm rosters/layout on entering a match so a *planned* offline session has its data.
- **Offline UX affordances** — offline banner + per-point "queued" indicator so a coach trusts that an offline save will sync.

None of these is "build offline scouting from scratch." That is the point of this map.

---

## 6. File:line reference index

| Concern | File:line |
|---|---|
| Live point React state | `src/pages/MatchPage.jsx:225-229` |
| Autosave key builder | `src/services/scoutDraft.js:45-55` ; `MatchPage.jsx:686-692` |
| Autosave snapshot + 2s debounce | `MatchPage.jsx:730-746` |
| Non-pristine guard | `scoutDraft.js:117-127` |
| TTL 24h + stale purge | `scoutDraft.js:38`, `:71` |
| Restore (`__new` only) | `MatchPage.jsx:700-722` |
| Clear on commit / discard | `MatchPage.jsx:1254-1256`, `:2017`, `:2063` |
| Concurrent flag + side key | `MatchPage.jsx:855-857` |
| Claim system retired (Brief F) | `MatchPage.jsx:833-837` |
| Per-coach stream (auto-ID + reactive index) | `MatchPage.jsx:145-174` |
| Concurrent save (side-safe) | `MatchPage.jsx:1080-1181` |
| Solo save (both sides) | `MatchPage.jsx:1182-1230` |
| `addPoint` / `updatePoint` (immediate) | `src/services/dataService.js:864-871` |
| `endMatchAndMerge` | `dataService.js:882-1009` |
| `propagateMatchup` (§70 self-log matcher) | `dataService.js:1517-1611` |
| Stage-4 override / dismiss | `dataService.js:1641-1684` |
| Firestore IndexedDB persistence | `src/services/firebase.js:41-44` |
| `ensureAuth` (10s handshake) | `firebase.js:54-69` |
| Service worker cache + cross-origin skip | `public/sw.js:34-36` |
| SW registration (no `.catch` — B21) | `src/main.jsx` (SW register block) |
</content>
</invoke>
