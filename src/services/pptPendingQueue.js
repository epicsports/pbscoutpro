/**
 * PPT pending-save offline queue. Per DESIGN_DECISIONS § 48.8.
 *
 * Behavior:
 *   - Failed Firestore writes push `{ payload, queuedAt }` onto a
 *     localStorage array keyed by playerId.
 *   - Reads expose the queue to the today's-list UI (merges Firestore
 *     rows + pending rows; pending get a subtle indicator).
 *   - Background flush: caller-owned (see usePPTSyncPending) — fires on
 *     `window.online` and on route changes. Flush walks the queue in
 *     order, stops on first failure (remaining stay queued), removes
 *     successfully-written entries.
 *
 * Shape stored:
 *   [{ payload: SelfReportPayload, queuedAt: number }, ...]
 *
 * Shape not stored: Timestamp / serverTimestamp objects. Firestore
 * `serverTimestamp()` is replaced inside `createSelfReport` on each
 * flush attempt; the queued payload here is plain JSON-safe.
 */

// Namespaced by mode so the unlinked-PPT (mode='uid', 2026-04-24) and the
// canonical linked-player queue can't collide if a uid happens to share
// a prefix with a playerId. Default 'player' preserves the historical key
// shape (`ppt_pending_saves_<playerId>`) so existing localStorage entries
// from earlier deploys remain readable / flushable.
function key(id, mode = 'player') {
  if (mode === 'uid') return `ppt_pending_saves_uid_${id || 'anon'}`;
  return `ppt_pending_saves_${id || 'anon'}`;
}

export function getPending(id, mode = 'player') {
  if (!id) return [];
  try {
    const raw = localStorage.getItem(key(id, mode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function queuePending(id, payload, mode = 'player') {
  if (!id || !payload) return;
  try {
    const list = getPending(id, mode);
    list.push({ payload, queuedAt: Date.now() });
    localStorage.setItem(key(id, mode), JSON.stringify(list));
  } catch {
    // Quota / private mode — nothing we can do. Caller already has a
    // Firestore failure; let the user retry manually later.
  }
}

export function removePending(id, queuedAt, mode = 'player') {
  if (!id) return;
  try {
    const list = getPending(id, mode).filter(p => p.queuedAt !== queuedAt);
    localStorage.setItem(key(id, mode), JSON.stringify(list));
  } catch { /* ignore */ }
}

export function clearPending(id, mode = 'player') {
  if (!id) return;
  try { localStorage.removeItem(key(id, mode)); } catch { /* ignore */ }
}

/**
 * Walk queue in order, await createFn(id, payload) for each. On first
 * failure, stop and leave the rest queued — resolves with the count still
 * pending. Idempotent guarantee comes from queuedAt being unique per
 * queued entry.
 *
 * @param {string} id        — playerId (mode='player') or uid (mode='uid')
 * @param {(id, payload) => Promise<any>} createFn — typically
 *   createSelfReport (player mode) or createPendingSelfReport (uid mode).
 * @param {'player'|'uid'} mode — namespace selector for the queue key
 * @returns {Promise<number>} remaining pending count
 */
export async function flushPending(id, createFn, mode = 'player') {
  if (!id || typeof createFn !== 'function') return getPending(id, mode).length;
  const snapshot = getPending(id, mode);
  for (const entry of snapshot) {
    try {
      await createFn(id, entry.payload);
      removePending(id, entry.queuedAt, mode);
    } catch {
      break;
    }
  }
  return getPending(id, mode).length;
}
