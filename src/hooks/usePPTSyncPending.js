import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getPending,
  flushPending as flushQueue,
} from '../services/pptPendingQueue';
import {
  createSelfReport,
  createPendingSelfReport,
} from '../services/playerPerformanceTrackerService';

/**
 * usePPTSyncPending — offline queue flusher + pending-count watcher
 * (DESIGN_DECISIONS § 48.8). Mode-aware (2026-04-24): when the user is
 * unlinked, the queue lives under the uid namespace and flushes via
 * createPendingSelfReport instead of createSelfReport.
 *
 * Behavior:
 *   - Reads localStorage-backed queue on mount + exposes `pendingCount`
 *     so the list UI can render "N niezsynchronizowanych" banner.
 *   - Flushes the queue when:
 *       (a) the browser fires `online` (recovered from airplane mode /
 *           flaky network)
 *       (b) React Router location changes (user navigated inside app —
 *           a good time to re-attempt since we're actively online)
 *   - Flush is serial (stops on first failure, remaining stay queued)
 *     and idempotent thanks to queuedAt ordering.
 *
 * @param {string} id — playerId (default 'player' mode) or uid ('uid' mode)
 * @param {{mode?: 'player'|'uid'}} options
 * @returns {{pendingCount, refresh, flush}}
 */
export function usePPTSyncPending(id, { mode = 'player' } = {}) {
  const [pendingCount, setPendingCount] = useState(() => getPending(id, mode).length);
  const location = useLocation();
  const createFn = mode === 'uid' ? createPendingSelfReport : createSelfReport;

  const refresh = useCallback(() => {
    setPendingCount(getPending(id, mode).length);
  }, [id, mode]);

  const flush = useCallback(async () => {
    if (!id) return;
    const remaining = await flushQueue(id, createFn, mode);
    setPendingCount(remaining);
  }, [id, mode, createFn]);

  // Route-change hook — re-checks queue + attempts a flush on any
  // navigation. Cheap when queue is empty.
  useEffect(() => {
    refresh();
    if (getPending(id, mode).length > 0) {
      flush();
    }
  }, [location.pathname, id, mode, refresh, flush]);

  // Network recovery — flush when the browser emits `online`.
  useEffect(() => {
    const onOnline = () => flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  return { pendingCount, refresh, flush };
}
