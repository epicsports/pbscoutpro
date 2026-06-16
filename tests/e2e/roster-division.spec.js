// e2e UAT #4 — roster division-correctness (no cross-division bleed).
// Guards the global-catalog → workspace-scouting resolution: a scouted doc for
// Team Alpha (NXL/PRO) seeded with a roster BLOATED by Team Charlie (NXL/DIV1)
// players must narrow back to PRO-only via the REAL §83 path
// (repairScoutedRostersForTournament, the same division filter as
// buildScoutedPayload). Asserts every PRO id stays and every DIV1 id is dropped.

import { test, expect } from '@playwright/test';
import { TEST_ACCOUNT, WS, TRN, SCT_BLEED, ROSTER_A_IDS, ROSTER_C_IDS } from './fixtures.js';

test.describe('#4 roster division-correctness', () => {
  test('repair narrows a cross-division-bloated scouted roster to its own division', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
      await page.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: TEST_ACCOUNT.email, p: TEST_ACCOUNT.password });
      await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);

      // Sanity: the seeded scouted roster starts bloated (PRO ∪ DIV1).
      const before = await page.evaluate(a => window.__pbtest.readScouted(a.s, a.t, a.sid), { s: WS, t: TRN, sid: SCT_BLEED });
      expect(before.roster).toEqual(expect.arrayContaining([...ROSTER_A_IDS, ...ROSTER_C_IDS]));

      // Run the real division-narrowing repair.
      const res = await page.evaluate(a => window.__pbtest.repairRosters(a.t, a.league), { t: TRN, league: 'NXL' });
      expect(res.updated).toBeGreaterThanOrEqual(1);
      // B26 — the `rostersRepairedAt` stamp is the coach box's ONLY collapse signal.
      // It must persist (no stampError) or the box stays permanently visible. Assert
      // the instrumented field is present + falsy on a successful run (regression guard
      // for the silent-stamp-failure class that left the box stuck in prod).
      expect(res).toHaveProperty('stampError');
      expect(res.stampError).toBeFalsy();

      // After: PRO ids kept, DIV1 (Charlie) ids dropped — no bleed.
      const after = await page.evaluate(a => window.__pbtest.readScouted(a.s, a.t, a.sid), { s: WS, t: TRN, sid: SCT_BLEED });
      expect(after.roster).toEqual(expect.arrayContaining(ROSTER_A_IDS));
      for (const div1Id of ROSTER_C_IDS) expect(after.roster).not.toContain(div1Id);
    } finally {
      await ctx.close();
    }
  });
});
