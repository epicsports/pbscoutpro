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

function key(playerId) {
  return `ppt_pending_saves_${playerId || 'anon'}`;
}

export function getPending(playerId) {
  if (!playerId) return [];
  try {
    const raw = localStorage.getItem(key(playerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function queuePending(playerId, payload) {
  if (!playerId || !payload) return;
  try {
    const list = getPending(playerId);
    list.push({ payload, queuedAt: Date.now() });
    localStorage.setItem(key(playerId), JSON.stringify(list));
  } catch {
    // Quota / private mode — nothing we can do. Caller already has a
    // Firestore failure; let the user retry manually later.
  }
}

export function removePending(playerId, queuedAt) {
  if (!playerId) return;
  try {
    const list = getPending(playerId).filter(p => p.queuedAt !== queuedAt);
    localStorage.setItem(key(playerId), JSON.stringify(list));
  } catch { /* ignore */ }
}

export function clearPending(playerId) {
  if (!playerId) return;
  try { localStorage.removeItem(key(playerId)); } catch { /* ignore */ }
}

/**
 * Walk queue in order, await createFn(playerId, payload) for each. On
 * first failure, stop and leave the rest queued — resolves with the
 * count still pending. Idempotent guarantee comes from queuedAt being
 * unique per queued entry.
 *
 * @param {string} playerId
 * @param {(playerId, payload) => Promise<any>} createFn — typically
 *   createSelfReport from playerPerformanceTrackerService.
 * @returns {Promise<number>} remaining pending count
 */
export async function flushPending(playerId, createFn) {
  if (!playerId || typeof createFn !== 'function') return getPending(playerId).length;
  const snapshot = getPending(playerId);
  for (const entry of snapshot) {
    try {
      await createFn(playerId, entry.payload);
      removePending(playerId, entry.queuedAt);
    } catch {
      break;
    }
  }
  return getPending(playerId).length;
}
