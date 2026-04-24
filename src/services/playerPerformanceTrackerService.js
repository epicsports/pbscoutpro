import {
  collection, collectionGroup, doc, addDoc,
  getDocs, query, where, orderBy, serverTimestamp, Timestamp,
  writeBatch, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { bp } from './dataService';
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
  const ref = collection(db, bp(), 'players', playerId, 'selfReports');
  return addDoc(ref, {
    // Defaults per § 48.5 — matching happens post-hoc by coach.
    matchupId: null,
    pointNumber: null,
    outcomeDetail: null,
    outcomeDetailText: null,
    // Payload overrides defaults.
    ...payload,
    // createdAt always server-authoritative.
    createdAt: serverTimestamp(),
  });
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
  const ref = collection(db, bp(), 'players', playerId, 'selfReports');
  const q = query(
    ref,
    where('createdAt', '>=', startOfTodayTimestamp()),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  const ref = collection(db, bp(), 'players', playerId, 'selfReports');
  const snap = await getDocs(ref);
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
  const q = query(
    collectionGroup(db, 'selfReports'),
    where('layoutId', '==', layoutId),
    where('breakout.bunker', '==', breakoutBunker),
  );
  const snap = await getDocs(q);

  // Count every shot across every matching report. One report may contribute
  // multiple shots (ordered). Bootstrap threshold is on total SHOTS, not
  // total reports, since a low-shots-per-report variant (na-wslizgu) skips
  // this step entirely and wouldn't inflate the denominator.
  const counts = new Map();
  let totalShots = 0;
  snap.forEach(d => {
    const shots = d.data()?.shots;
    if (!Array.isArray(shots)) return;
    shots.forEach(s => {
      if (!s?.bunker) return;
      counts.set(s.bunker, (counts.get(s.bunker) || 0) + 1);
      totalShots += 1;
    });
  });
  if (totalShots < 20) return { mature: false, total: totalShots, top: [] };
  const sorted = [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([bunker, count]) => ({ bunker, count }));
  return { mature: true, total: totalShots, top: sorted };
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

  const targetCol = collection(db, bp(), 'players', playerId, 'selfReports');
  const docs = snap.docs;
  let moved = 0;
  let failed = 0;

  for (let i = 0; i < docs.length; i += 200) {
    const slice = docs.slice(i, i + 200);
    try {
      const batch = writeBatch(db);
      slice.forEach(d => {
        const data = d.data();
        // Strip uid before writing — canonical selfReport schema doesn't
        // carry it (the path's pid IS the owner). createdAt preserved as-is
        // so the migrated docs keep their original timestamps.
        const { uid: _drop, ...rest } = data;
        const newRef = doc(targetCol);
        batch.set(newRef, rest);
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
          await addDoc(targetCol, rest);
          await deleteDoc(d.ref);
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
