// e2e UAT #6 — offline → reconnect → sync (the Firestore write-queue path).
// Goes offline, logs a point (the SDK queues the mutation — its addDoc promise
// resolves only on reconnect, so it's kicked off without awaiting), reconnects,
// then waitForSync (waitForPendingWrites) resolves ONLY when the backend has
// acknowledged the write — proving real sync, not just the local cache. This is
// the warm-offline write path (NOT the SW shell, which stays manual-smoke). In
// the emulator the queue is in-memory (persistence is prod-only) but the
// offline→queue→reconnect→sync path is identical.

import { test, expect } from '@playwright/test';
import { TEST_ACCOUNT, WS, TRN, MATCH_OFFLINE, ROSTER_A_IDS } from './fixtures.js';

test.describe('#6 offline → reconnect → sync', () => {
  test('a point logged offline queues and syncs to Firestore on reconnect', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
      await page.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: TEST_ACCOUNT.email, p: TEST_ACCOUNT.password });
      await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);

      // Offline: log a point. addDoc resolves only on reconnect, so kick it off
      // without awaiting (store the promise on window).
      await ctx.setOffline(true);
      await page.evaluate(({ tid, mid, roster }) => {
        window.__pbWrite = window.__pbtest.addPointRaw(tid, mid, {
          outcome: 'win_a', order: 1, homeData: { assignments: roster },
        });
      }, { tid: TRN, mid: MATCH_OFFLINE, roster: ROSTER_A_IDS });

      // Reconnect → the queued write flushes; waitForSync resolves only after
      // the backend acks all pending writes (true sync).
      await ctx.setOffline(false);
      await page.evaluate(() => window.__pbWrite);
      await page.evaluate(() => window.__pbtest.waitForSync());

      // The point is now persisted in the emulator.
      const points = await page.evaluate(a => window.__pbtest.getPoints(a.t, a.m), { t: TRN, m: MATCH_OFFLINE });
      expect(points.length).toBe(1);
      expect(points[0].outcome).toBe('win_a');
    } finally {
      await ctx.close();
    }
  });
});
