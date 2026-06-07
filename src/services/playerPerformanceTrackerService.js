import {
  collection, collectionGroup, doc, addDoc,
  getDocs, query, where, orderBy, serverTimestamp, Timestamp,
  writeBatch, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { bp, activeWsSlug, getLayoutAggregate, bumpLayoutAggregateFromSelfReport } from './dataService';
import { getPending, removePending, clearPending } from './pptPendingQueue';

/**
 * Player Performance Tracker (PPT) — data layer.
 * See DESIGN_DECISIONS § 48 for the product spec this implements.
 *
 * Firestore path (workspace-scoped):
 *   /workspaces/{slug}/players/{playerId}/selfReports/{auto-id}
 *
 * Schema (§ 48.5):
 *   { createdAt, layoutId, trainingId, teamId, matchupId, pointNumber,
 *     breakout: { side, bunker, variant }, shots: [{ side, bunker, order }],
 *     outcome, outcomeDetail, outcomeDetailText }
 *
 * Collection group indexes required (firestore.indexes.json):
 *   (layoutId ASC, breakout.bunker ASC, createdAt DESC)
 *     — for getLayoutShotFrequencies
 */

function startOfTodayTimestamp() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

/**
 * Create a single selfReport document for this player.
 *
 * @param {string} playerId — matches the workspace-scoped player doc id.
 * @param {object} payload — per § 48.5 schema, WITHOUT createdAt (added here).
 *   Required shape:
 *     { layoutId, trainingId, teamId, breakout, shots, outcome,
 *       outcomeDetail?, outcomeDetailText? }
 * @returns {Promise<DocumentReference>}
 */
export async function createSelfReport(playerId, payload) {
  if (!playerId) throw new Error('createSelfReport: playerId required');
  if (!payload?.breakout?.bunker) throw new Error('createSelfReport: breakout.bunker required');
  if (!payload?.outcome) throw new Error('createSelfReport: outcome required');

  // § 90 Phase 2 Stage 1.B.3 cutover: write the FLAT path ONLY (legacy
  // per-player subcollection retired as a write target — backfill 1.B.2 made
  // every existing report parity-complete on the flat path). Explicit
  // `playerId` field is the § 90.2 contract that replaces the path segment.
  const baseDoc = {
    // Defaults per § 48.5 — matching happens post-hoc by coach.
    matchupId: null,
    pointNumber: null,
    outcomeDetail: null,
    outcomeDetailText: null,
    // § 57 multi-source observations: propagator (Phase 1b) sets these
    // when it binds this report to a point slot. Null = orphan / unbound.
    slotRef: null,
    propagatedAt: null,
    // Payload overrides defaults.
    ...payload,
    playerId,
    // § 90 cutover 1.1 — denormalize owning workspace for tenant-scoped
    // collectionGroup('selfReports') rules/queries.
    workspaceSlug: activeWsSlug(),
    // createdAt always server-authoritative.
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, bp(), 'selfReports'), baseDoc);
  // § read-volume C 1.2 — keep the layout-shot aggregate fresh (best-effort;
  // dormant until selfLog on + the Stage 2.4 write rule lands).
  try { await bumpLayoutAggregateFromSelfReport(baseDoc); } catch { /* best-effort */ }
  return ref;
}

/**
 * Delete a self-log point (W5 selfReport). § self-log point delete.
 *
 * **Caller MUST gate on `propagatedAt == null`** (an UNpropagated / orphan
 * report). A propagated report (`propagatedAt != null`) has been merged into a
 * W4 training point and deleting it leaves that contribution behind (the inverse
 * orphan) — that path is deliberately NOT offered here (escalated to Opus for
 * the un-merge-vs-block decision). Orphan reports have nothing downstream, so a
 * bare delete is the whole cascade. Rules: owner-only (firestore.rules:352,
 * `isLinkedSelfPlayer`).
 */
export async function deleteSelfReport(id) {
  if (!id) return;
  await deleteDoc(doc(db, bp(), 'selfReports', id));
}

/**
 * Today's selfReports for this player, newest first.
 *
 * Used by the post-save logs list (§ 48.9). "Today" = local midnight boundary
 * on the device; authoritative ordering still comes from server-side
 * createdAt.
 *
 * @param {string} playerId
 * @returns {Promise<Array<{id, ...doc}>>}
 */
export async function getTodaysSelfReports(playerId) {
  if (!playerId) return [];
  // § 90 — flat path only (legacy nested path retired, § 90.7.3). Single
  // `playerId` equality predicate (auto single-field index), client-filtered
  // by `createdAt` to avoid a composite index.
  const todayMs = startOfTodayTimestamp().toMillis();
  const snap = await getDocs(query(
    collection(db, bp(), 'selfReports'),
    where('playerId', '==', playerId),
  ));
  const rows = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => (r.createdAt?.toMillis?.() ?? 0) >= todayMs);
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

/**
 * § 70.9 — all of this player's selfReports (their "Samoocena" / self-logs),
 * newest first. `trainingId` filters to one training; null = all (global scope).
 * Flat collection filtered by `playerId` — no collectionGroup, no composite
 * index; one player's set is small, so fetch + client-filter is the lighter path.
 *
 * @param {string} playerId
 * @param {string|null} trainingId
 * @returns {Promise<Array<{id, ...doc}>>}
 */
export async function getSelfReportsForPlayer(playerId, trainingId = null) {
  if (!playerId) return [];
  // § 90 — flat path only (legacy nested path retired). trainingId filter
  // applied client-side.
  const snap = await getDocs(query(
    collection(db, bp(), 'selfReports'),
    where('playerId', '==', playerId),
  ));
  let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (trainingId) rows = rows.filter(r => r.trainingId === trainingId);
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

/**
 * Aggregate this player's historical breakout bunker frequencies for Step 1
 * mature mode (§ 48.6). Returns top 6 by count with percentage of total.
 *
 * Bootstrap (fewer than 5 total logs) returns `{ mature: false, total, top: [] }`
 * so callers can render the all-bunkers grid without an extra threshold check.
 *
 * @param {string} playerId
 * @returns {Promise<{mature: boolean, total: number, top: Array<{bunker, count, pct}>}>}
 */
export async function getPlayerBreakoutFrequencies(playerId) {
  if (!playerId) return { mature: false, total: 0, top: [] };
  // § 90 — flat path only (legacy nested path retired).
  const snap = await getDocs(query(
    collection(db, bp(), 'selfReports'),
    where('playerId', '==', playerId),
  ));
  const total = snap.size;
  if (total < 5) return { mature: false, total, top: [] };

  const counts = new Map();
  snap.forEach(d => {
    const b = d.data()?.breakout?.bunker;
    if (!b) return;
    counts.set(b, (counts.get(b) || 0) + 1);
  });
  const sorted = [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([bunker, count]) => ({
      bunker,
      count,
      pct: Math.round((count / total) * 100),
    }));
  return { mature: true, total, top: sorted };
}

/**
 * Aggregate layout-wide crowdsourced shot frequencies for Step 3 mature mode
 * (§ 48.6). Reads ALL players' selfReports matching the current layout AND
 * breakout bunker, then tallies every shot's target bunker.
 *
 * Composite index required: (layoutId, breakout.bunker, createdAt).
 * Without the index, the query fails — callers should fall back to bootstrap
 * mode on error per § 48.6 graceful-degradation note.
 *
 * @param {string} layoutId
 * @param {string} breakoutBunker — the player's current Step 1 selection
 * @returns {Promise<{mature: boolean, total: number, top: Array<{bunker, count}>}>}
 */
export async function getLayoutShotFrequencies(layoutId, breakoutBunker) {
  if (!layoutId || !breakoutBunker) return { mature: false, total: 0, top: [] };
  // § read-volume C 1.2 — read the precomputed /layoutAggregates/{layoutId} doc
  // (ONE read) instead of a cross-tenant collectionGroup('selfReports') sweep.
  // reports[breakoutBunker] = { total: totalShots, t: { [targetBunker]: count } }.
  // Bootstrap threshold still on total SHOTS (na-wslizgu variants skip this step).
  const agg = await getLayoutAggregate(layoutId);
  const r = agg?.reports?.[breakoutBunker];
  const totalShots = r?.total || 0;
  if (totalShots < 20) return { mature: false, total: totalShots, top: [] };
  const sorted = Object.entries(r.t || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([bunker, count]) => ({ bunker, count }));
  return { mature: true, total: totalShots, top: sorted };
}

/**
 * Event-scoped (§ 70.8 D2) per-breakout-bunker breakdown for ONE training.
 *
 * Reads every selfReport for the training via collectionGroup — both matched
 * (propagated reports stay in the subcollection, just stamped with
 * propagatedAt) AND orphan — so this single query is the COMPLETE self-log set
 * for the event. No in-tree point iteration: training points are zone-granular
 * (D/C/S from coach quick-log), not bunker-granular, so they cannot feed a
 * per-bunker count, and the selfReports already hold every self-logged bunker.
 * Anonymous — no playerId filter (§ 70 attribution-optional).
 *
 * Index: collectionGroup `selfReports`, fieldOverride `trainingId`
 * COLLECTION_GROUP scope. Without it the query throws — caller should treat a
 * failure as "no data" (graceful-degradation, like getLayoutShotFrequencies).
 *
 * @param {string} trainingId
 * @returns {Promise<Array<{bunker, side, count, hits, hitRate, shots}>>}
 *   sorted by `count` desc. `hitRate` = % of self-logs from that bunker whose
 *   outcome is an elimination; null when count is 0.
 */
export async function getEventShotFrequencies(trainingId) {
  if (!trainingId) return [];
  const q = query(
    collectionGroup(db, 'selfReports'),
    // § read-volume C 2.1 — workspaceSlug filter makes the isMember(workspaceSlug)
    // CG rule query-provable (rules-are-not-filters); trainingId is unique to one
    // workspace so this is parity-identical.
    where('workspaceSlug', '==', activeWsSlug()),
    where('trainingId', '==', trainingId),
  );
  const snap = await getDocs(q);
  // § 90.7.3: legacy nested path retired → flat docs only, no dedup needed.
  const byBunker = new Map();
  for (const d of snap.docs) {
    const s = d.data();
    const bunker = s?.breakout?.bunker;
    if (!bunker) continue;
    const e = byBunker.get(bunker)
      || { bunker, side: s?.breakout?.side || null, count: 0, hits: 0, shots: 0 };
    e.count += 1;
    if (typeof s.outcome === 'string' && s.outcome.startsWith('elim_')) e.hits += 1;
    e.shots += Array.isArray(s.shots) ? s.shots.length : 0;
    byBunker.set(bunker, e);
  }
  return [...byBunker.values()]
    .map(e => ({ ...e, hitRate: e.count > 0 ? Math.round((e.hits / e.count) * 100) : null }))
    .sort((a, b) => b.count - a.count);
}

/**
 * § 70.11 Stage 4 — every selfReport for a training (all players), each tagged
 * with its parent playerId. Feeds the manual-override review queue (the queue
 * needs a player's FULL report set to re-run alignSequence stably). One
 * collectionGroup query on the live trainingId index — no composite index.
 *
 * @param {string} trainingId
 * @returns {Promise<Array<{id, playerId, ...doc}>>}
 */
export async function getTrainingSelfReports(trainingId) {
  if (!trainingId) return [];
  const snap = await getDocs(query(
    collectionGroup(db, 'selfReports'),
    where('workspaceSlug', '==', activeWsSlug()), // § read-volume C 2.1 (see getEventShotFrequencies)
    where('trainingId', '==', trainingId),
  ));
  // § 90.7.3: legacy nested path retired → flat docs only (no dedup). Every
  // flat doc carries an explicit `playerId` field; the parent-path fallback is
  // kept as a defensive belt for any pre-field doc but is effectively dead.
  const out = [];
  for (const d of snap.docs) {
    const data = d.data();
    out.push({
      ...data,
      id: d.id,
      playerId: data.playerId ?? d.ref.parent.parent?.id ?? null,
    });
  }
  return out;
}

// ─── PPT unlinked-mode (2026-04-24) ────────────────────────────────────
// Players who haven't yet linked to a workspace player profile log their
// reports here instead of /players/{pid}/selfReports/{sid}. Once they
// link, migratePendingToPlayer batch-moves the docs into the canonical
// player path and deletes originals so coach analytics + crowdsource
// pickers pick them up.
//
// Collection: /workspaces/{slug}/pendingSelfReports/{auto-id}
// Schema is the same as the canonical selfReport with `uid` field added
// for ownership. Firestore rule (workspace-scoped) gates create on
// `request.resource.data.uid == request.auth.uid` and read/update/delete
// on `resource.data.uid == request.auth.uid`.
//
// These docs are intentionally NOT visible to coaches and NOT included
// in `getLayoutShotFrequencies`'s collection-group crowdsource — they're
// drafts until migration. Same reasoning for `getPlayerBreakoutFrequencies`
// remaining player-only: unlinked users always see bootstrap mode.

function pendingCol() {
  return collection(db, bp(), 'pendingSelfReports');
}

/**
 * Create a pending self-report owned by `uid`. Used by WizardShell when
 * the player isn't yet linked to a workspace player doc.
 *
 * @param {string} uid     — auth.uid of the logging user
 * @param {object} payload — same shape as createSelfReport (breakout/shots/
 *                           outcome/etc); `uid` is added here.
 */
export async function createPendingSelfReport(uid, payload) {
  if (!uid) throw new Error('createPendingSelfReport: uid required');
  if (!payload?.breakout?.bunker) throw new Error('createPendingSelfReport: breakout.bunker required');
  if (!payload?.outcome) throw new Error('createPendingSelfReport: outcome required');
  return addDoc(pendingCol(), {
    matchupId: null,
    pointNumber: null,
    outcomeDetail: null,
    outcomeDetailText: null,
    // § 57: pending docs carry the same propagator fields so migration to
    // canonical /players/{pid}/selfReports/ preserves them.
    slotRef: null,
    propagatedAt: null,
    ...payload,
    uid,
    createdAt: serverTimestamp(),
  });
}

/**
 * Today's pending self-reports for `uid`. Mirrors getTodaysSelfReports but
 * scoped to the unlinked drafts collection.
 */
export async function getTodaysPendingSelfReports(uid) {
  if (!uid) return [];
  const q = query(
    pendingCol(),
    where('uid', '==', uid),
    where('createdAt', '>=', startOfTodayTimestamp()),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Migrate every pending self-report owned by `uid` into the canonical
 * `/players/{playerId}/selfReports/` path, then delete the originals.
 * Called by `selfLinkPlayer` callers AFTER the link write succeeds so a
 * failed migration doesn't roll back a successful link (it just leaves
 * pending docs around — user can retry).
 *
 * Returns `{ moved, failed }`. Best-effort: per-doc errors don't abort
 * the batch loop. Firestore writeBatch is capped at 500 operations; we
 * chunk into batches of 200 (each pending doc = 1 write + 1 delete = 2
 * ops, so 200 docs = 400 ops, well under the limit).
 *
 * @param {string} uid
 * @param {string} playerId
 * @returns {Promise<{moved: number, failed: number}>}
 */
export async function migratePendingToPlayer(uid, playerId) {
  if (!uid || !playerId) return { moved: 0, failed: 0 };
  const snap = await getDocs(query(pendingCol(), where('uid', '==', uid)));
  if (snap.empty) return { moved: 0, failed: 0 };

  const newFlatCol = collection(db, bp(), 'selfReports');
  const docs = snap.docs;
  let moved = 0;
  let failed = 0;

  // § 90 Phase 2 Stage 1.B.3 cutover: each pending doc becomes 2 ops
  // (flat-path set + pending delete) — legacy per-player path retired as a
  // write target. Chunk size 150 to keep under Firestore's 500-op ceiling.
  for (let i = 0; i < docs.length; i += 150) {
    const slice = docs.slice(i, i + 150);
    try {
      const batch = writeBatch(db);
      slice.forEach(d => {
        const data = d.data();
        // Strip uid before writing — canonical selfReport schema doesn't
        // carry it. createdAt preserved as-is so the migrated docs keep their
        // original timestamps. Explicit playerId field — § 90.2 contract.
        const { uid: _drop, ...rest } = data;
        // § 90 cutover 1.1 — stamp owning workspace on migrated docs too.
        batch.set(doc(newFlatCol), { ...rest, playerId, workspaceSlug: activeWsSlug() });
        batch.delete(d.ref);
      });
      await batch.commit();
      moved += slice.length;
    } catch (err) {
      // Fall back to per-doc moves so a single bad doc doesn't stall the
      // whole migration. Failed docs stay in pending; user can re-link or
      // admin can clean up.
      for (const d of slice) {
        try {
          const data = d.data();
          const { uid: _drop, ...rest } = data;
          const perDocBatch = writeBatch(db);
          perDocBatch.set(doc(newFlatCol), { ...rest, playerId });
          perDocBatch.delete(d.ref);
          await perDocBatch.commit();
          moved += 1;
        } catch {
          failed += 1;
        }
      }
    }
  }

  return { moved, failed };
}

/**
 * Post-link cleanup: flush any local offline queue (uid namespace) directly
 * to the canonical player path, then migrate server-side pendingSelfReports
 * to the same destination, then clear the local queue. Idempotent.
 *
 * Call this from any code path that successfully links a uid to a player —
 * ProfilePage handleClaim, PbleaguesOnboardingPage handleSubmit, or admin
 * link via Členkowie. Best-effort: returns counts but doesn't throw on
 * partial failure (the link itself was the user-visible win).
 *
 * @param {string} uid
 * @param {string} playerId
 * @returns {Promise<{queueFlushed: number, queueRemaining: number,
 *                    serverMoved: number, serverFailed: number}>}
 */
export async function onPlayerLinked(uid, playerId) {
  const result = {
    queueFlushed: 0, queueRemaining: 0,
    serverMoved: 0, serverFailed: 0,
  };
  if (!uid || !playerId) return result;

  // 1. Flush offline-queue entries (failed Firestore writes from while the
  //    user was unlinked) directly to the canonical player path. Each entry
  //    becomes a regular selfReport — bypasses the pending intermediate.
  const queue = getPending(uid, 'uid');
  for (const entry of queue) {
    try {
      await createSelfReport(playerId, entry.payload);
      removePending(uid, entry.queuedAt, 'uid');
      result.queueFlushed += 1;
    } catch {
      // Stop on first failure — remaining stay queued for next attempt.
      break;
    }
  }
  result.queueRemaining = getPending(uid, 'uid').length;
  if (result.queueRemaining === 0) clearPending(uid, 'uid');

  // 2. Migrate any server-side pendingSelfReports to canonical path.
  const migration = await migratePendingToPlayer(uid, playerId);
  result.serverMoved = migration.moved;
  result.serverFailed = migration.failed;

  return result;
}
