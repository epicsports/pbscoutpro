import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getPending,
  flushPending as flushQueue,
} from '../services/pptPendingQueue';
import { createSelfReport } from '../services/playerPerformanceTrackerService';

/**
 * usePPTSyncPending — offline queue flusher + pending-count watcher
 * (DESIGN_DECISIONS § 48.8).
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
 * Returns { pendingCount, refresh, flush } — `refresh` re-reads queue
 * without writing; `flush` triggers a write attempt manually (used by
 * the refresh-icon button on the list view).
 */
export function usePPTSyncPending(playerId) {
  const [pendingCount, setPendingCount] = useState(() => getPending(playerId).length);
  const location = useLocation();

  const refresh = useCallback(() => {
    setPendingCount(getPending(playerId).length);
  }, [playerId]);

  const flush = useCallback(async () => {
    if (!playerId) return;
    const remaining = await flushQueue(playerId, createSelfReport);
    setPendingCount(remaining);
  }, [playerId]);

  // Route-change hook — re-checks queue + attempts a flush on any
  // navigation. Cheap when queue is empty.
  useEffect(() => {
    refresh();
    if (getPending(playerId).length > 0) {
      flush();
    }
  }, [location.pathname, playerId, refresh, flush]);

  // Network recovery — flush when the browser emits `online`.
  useEffect(() => {
    const onOnline = () => flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  return { pendingCount, refresh, flush };
}
