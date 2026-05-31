// e2e UAT #5 — logged kills flow into player stats (no silent zero).
// Logs a point where Alpha's slot-0 player (pa1) shoots 'dorito' and the opponent
// in the dorito zone is eliminated → the REAL aggregation (buildPlayerPointsFromMatch
// → computePlayerStats) must credit exactly 1 kill. Guards that logged points
// actually reach the stats engine.

import { test, expect } from '@playwright/test';
import { TEST_ACCOUNT, WS, TRN, MATCH_STATS, ROSTER_A_IDS, FIELD } from './fixtures.js';

test.describe('#5 stats — logged kills are non-zero', () => {
  test('a kill-shaped point credits the shooter exactly 1 kill', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
      await page.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: TEST_ACCOUNT.email, p: TEST_ACCOUNT.password });
      await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);

      // Log a point via the real addPoint path: pa1 (home slot 0) shoots dorito;
      // the opponent at the top (y<discoLine → dorito zone) is eliminated.
      const written = await page.evaluate(({ tid, mid, roster }) => window.__pbtest.addPointRaw(tid, mid, {
        outcome: 'win_a',
        order: 1,
        homeData: { assignments: roster, quickShots: { 0: ['dorito'] } },
        awayData: { eliminations: [true], players: [{ x: 0.5, y: 0.1 }] },
      }, ), { tid: TRN, mid: MATCH_STATS, roster: ROSTER_A_IDS });
      expect(written.id).toBeTruthy();

      // Real stats aggregation → kills for pa1 must be exactly 1.
      const kills = await page.evaluate(a => window.__pbtest.playerKills(a.s, a.t, a.m, a.pid, a.field),
        { s: WS, t: TRN, m: MATCH_STATS, pid: ROSTER_A_IDS[0], field: FIELD });
      expect(kills).toBe(1);

      // A non-shooting teammate (slot 1) gets 0 — the credit is attributed, not blanket.
      const killsTeammate = await page.evaluate(a => window.__pbtest.playerKills(a.s, a.t, a.m, a.pid, a.field),
        { s: WS, t: TRN, m: MATCH_STATS, pid: ROSTER_A_IDS[1], field: FIELD });
      expect(killsTeammate).toBe(0);
    } finally {
      await ctx.close();
    }
  });
});
