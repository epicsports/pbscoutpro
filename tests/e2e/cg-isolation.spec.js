// e2e § read-volume C 2 — collection-group tenant-isolation gate.
// Exercises the REAL firestore.rules in the emulator via the test bridge: proves
// the scoped selfReports/shots CG rules + the shots playerLinkedUid carve-out
// + the /layoutAggregates shared-write surface behave exactly as designed.
//
// LOAD-BEARING: no tenant-isolation rule deploys to prod until this matrix is
// green (per the Read-volume C Stage 2 brief, STEP 3).
//
// Two tenants:
//   demo-ws  — member: test-coach (TEST_ACCOUNT). selfReports(trn-demo) ×2,
//              shots ×2 (one owned by test-coach, one by the OTHER tenant's player).
//   other-ws — member: test-other (OTHER_ACCOUNT) ONLY. selfReports(trn-other) ×1,
//              shots ×1 (owned by test-other).

import { test, expect } from '@playwright/test';
import { TEST_ACCOUNT, OTHER_ACCOUNT, UID_OTHER, WS, OTHER_WS, TRN, TRN_OTHER } from './fixtures.js';

async function bridgeSignIn(page, acct) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: acct.email, p: acct.password });
}
// Resolve to the bridge op's value (a count) on success, or 'DENIED' on rejection.
const probe = (page, body, arg) => page.evaluate(body, arg).then(v => v).catch(() => 'DENIED');

test.describe('§ read-volume C 2 — CG tenant-isolation matrix', () => {
  test('demo-ws member: reads own tenant CGs, denied cross-tenant', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await bridgeSignIn(page, TEST_ACCOUNT);

      // selfReports CG — own tenant OK (2 seeded), cross-tenant DENIED.
      expect(await probe(page, a => window.__pbtest.cgSelfReportsByWs(a.s, a.t), { s: WS, t: TRN })).toBe(2);
      expect(await probe(page, a => window.__pbtest.cgSelfReportsByWs(a.s, a.t), { s: OTHER_WS, t: TRN_OTHER })).toBe('DENIED');

      // shots CG (by workspaceSlug) — own tenant OK (2 seeded), cross-tenant DENIED.
      expect(await probe(page, a => window.__pbtest.cgShotsByWs(a.s, a.t), { s: WS, t: TRN })).toBe(2);
      expect(await probe(page, a => window.__pbtest.cgShotsByWs(a.s, a.t), { s: OTHER_WS, t: TRN_OTHER })).toBe('DENIED');

      // /layoutAggregates — any authed member may increment (shared-write pool).
      expect(await probe(page, () => window.__pbtest.bumpLayoutAgg('lay-demo').then(() => 'OK'), null)).toBe('OK');
    } finally {
      await ctx.close();
    }
  });

  test('other-tenant player: own self-log shots via carve-out, denied a cross-tenant sweep', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await bridgeSignIn(page, OTHER_ACCOUNT);

      // Player self-read carve-out: test-other reads their OWN self-log shots by
      // playerLinkedUid — 2 docs (one in other-ws, one in demo-ws) — even though
      // they are NOT a demo-ws member. This is the usePlayerBreakoutHistory path.
      expect(await probe(page, u => window.__pbtest.cgShotsByUid(u), UID_OTHER)).toBe(2);

      // But a by-workspaceSlug sweep of demo-ws (a tenant they don't belong to)
      // is DENIED — the sweep returns test-coach's shot too, which fails both the
      // isMember and the own-uid branch.
      expect(await probe(page, a => window.__pbtest.cgShotsByWs(a.s, a.t), { s: WS, t: TRN })).toBe('DENIED');
      // selfReports has no carve-out → any cross-tenant read DENIED.
      expect(await probe(page, a => window.__pbtest.cgSelfReportsByWs(a.s, a.t), { s: WS, t: TRN })).toBe('DENIED');
    } finally {
      await ctx.close();
    }
  });
});
