// e2e A3 regression — leaveWorkspaceSelf must not throw.
// Since 2026-05-27 it referenced an undeclared `userSnap` → ReferenceError for
// every non-admin who tried to leave (self-leave silently broken in prod). This
// proves the fix: a plain coach member self-leaves successfully and is removed
// from the workspace (verified by a still-present admin member).

import { test, expect } from '@playwright/test';
import { TEST_ACCOUNT, LEAVER_ACCOUNT, UID_LEAVER, WS } from './fixtures.js';

test.describe('A3 self-leave (leaveWorkspaceSelf regression)', () => {
  test('a non-admin member can self-leave without a ReferenceError', async ({ browser }) => {
    // The leaver leaves their own workspace.
    const ctxL = await browser.newContext();
    const pageL = await ctxL.newPage();
    try {
      await pageL.goto('/');
      await pageL.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
      await pageL.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: LEAVER_ACCOUNT.email, p: LEAVER_ACCOUNT.password });
      await pageL.evaluate(s => window.__pbtest.setWorkspace(s), WS);

      const result = await pageL.evaluate(
        () => window.__pbtest.leaveSelf().then(() => 'OK').catch(e => 'ERR:' + (e.message || e)),
      );
      // Pre-fix this was 'ERR:userSnap is not defined'.
      expect(result).toBe('OK');
    } finally {
      await ctxL.close();
    }

    // Verify removal via an admin member who can still read the workspace doc.
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    try {
      await pageA.goto('/');
      await pageA.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
      await pageA.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: TEST_ACCOUNT.email, p: TEST_ACCOUNT.password });
      const ws = await pageA.evaluate(s => window.__pbtest.readWorkspaceDoc(s), WS);
      expect(ws.members).not.toContain(UID_LEAVER);
      expect(ws.userRoles[UID_LEAVER] || []).toEqual([]); // roles cleared
    } finally {
      await ctxA.close();
    }
  });
});
