// e2e STAGE 4 — Production isolation gate + invite carrier (Model B).
// Exercises the REAL firestore.rules in the emulator via the test bridge
// (window.__pbtest runs SDK ops as the signed-in user). Proves: self-join is
// closed, non-members can't read a workspace's data, a valid invite admits with
// the right role, expired/used are rejected, and generation gating holds.

import { test, expect } from '@playwright/test';
import {
  TEST_ACCOUNT, NEWCOMER_1, NEWCOMER_2, INVITE_VALID, INVITE_EXPIRED,
  WS, TRN, MATCH,
} from './fixtures.js';

// Sign in (SDK-level, no UI nav — works for no-workspace outsiders) and wait
// for the bridge to be installed.
async function bridgeSignIn(page, acct) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: acct.email, p: acct.password });
}
// Run a bridge op; resolve to 'OK' on success or 'DENIED' on any rejection.
const okOrDenied = (page, body, arg) => page.evaluate(body, arg).then(() => 'OK').catch(() => 'DENIED');

test.describe('STAGE 4 — invite isolation gate', () => {
  test('non-member is denied; valid invite admits with the right role', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await bridgeSignIn(page, NEWCOMER_1);

      // Isolation: a non-member cannot read the workspace doc, its points, and
      // cannot self-join (the old envelope is closed).
      expect(await okOrDenied(page, s => window.__pbtest.readWorkspaceDoc(s), WS)).toBe('DENIED');
      expect(await okOrDenied(page, a => window.__pbtest.readPointsRaw(a.s, a.t, a.m), { s: WS, t: TRN, m: MATCH })).toBe('DENIED');
      expect(await okOrDenied(page, s => window.__pbtest.rawSelfJoin(s), WS)).toBe('DENIED');

      // Redeem a valid token → becomes a scout member.
      const redeem = await page.evaluate(
        t => window.__pbtest.redeem(t).then(x => 'OK:' + x.role).catch(e => 'ERR:' + (e.message || e.code)),
        INVITE_VALID,
      );
      expect(redeem).toBe('OK:scout');

      // Now a member → can read the workspace's points.
      expect(await okOrDenied(page, a => window.__pbtest.readPointsRaw(a.s, a.t, a.m), { s: WS, t: TRN, m: MATCH })).toBe('OK');
    } finally {
      await ctx.close();
    }
  });

  test('expired token is rejected', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await bridgeSignIn(page, NEWCOMER_2);
      const redeem = await page.evaluate(
        t => window.__pbtest.redeem(t).then(() => 'OK').catch(e => 'ERR:' + (e.message || e.code)),
        INVITE_EXPIRED,
      );
      expect(redeem).toContain('ERR');
      // Still NOT a member.
      expect(await okOrDenied(page, a => window.__pbtest.readPointsRaw(a.s, a.t, a.m), { s: WS, t: TRN, m: MATCH })).toBe('DENIED');
    } finally {
      await ctx.close();
    }
  });

  test('generation gating: workspace_admin cannot issue an admin invite', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      // test-coach is admin+coach of demo-ws but NOT super_admin.
      await bridgeSignIn(page, TEST_ACCOUNT);
      // Non-admin role → allowed.
      expect(await okOrDenied(page, a => window.__pbtest.createInvite(a.s, a.r), { s: WS, r: 'coach' })).toBe('OK');
      // Admin role → denied (only super_admin may issue admin invites).
      expect(await okOrDenied(page, a => window.__pbtest.createInvite(a.s, a.r), { s: WS, r: 'admin' })).toBe('DENIED');
    } finally {
      await ctx.close();
    }
  });
});
