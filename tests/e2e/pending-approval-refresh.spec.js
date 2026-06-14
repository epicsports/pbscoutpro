// Maks pending-gate bug (CC_BRIEF Maks permission-gate). The live-refresh
// contract: a PENDING member (in members[], empty roles → "poczekaj aż admin"
// gate), when an admin grants a role, must transition into the app WITHOUT a
// manual reload — the workspace onSnapshot listener fires and re-derives the gate.
// Maks stayed stuck because the listener had no error handling / re-attach and
// died silently; the fix adds bounded re-attach + a permissionError recovery gate.
//
// NOTE on coverage: this spec proves the live-refresh CONTRACT (the regression
// guard). The recovery path (listener error → PermissionErrorScreen) is NOT
// e2e'd here because the Firestore EMULATOR does not deliver permission-denied to
// an ACTIVE listener on mid-session revocation (verified: a removed member stays
// frozen on last state, no error event), and getDoc + the persistent listener
// share one channel so an attach-time denial can't be induced while the gate
// still renders. PROD does error on attach-time denial (Maks's case) → the
// re-attach + recovery fire there. Recovery is build/logic-verified + owed a prod
// smoke (Maks relogin). See DEPLOY_LOG.
//
// Can't use the shared login() helper: it waits for nav-ball / skip, which a
// pending user never renders — so we drive the form + wait for the gate directly.
import { test, expect } from '@playwright/test';
import { PENDING_ACCOUNT, SUPER_ACCOUNT, PENDING_WS, UID_PENDING } from './fixtures.js';

async function loginPending(page, acct) {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('pbscoutpro-handedness', 'right'));
  await page.locator('input[type="email"]').fill(acct.email);
  await page.locator('input[type="password"]').fill(acct.password);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByTestId('pending-approval')).toBeVisible({ timeout: 20000 });
}

async function bridgeSignIn(page, acct) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: acct.email, p: acct.password });
}

test('pending member: admin role-grant propagates live → gate clears, no reload', async ({ browser }) => {
  const ctxU = await browser.newContext();
  const pageU = await ctxU.newPage();
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  try {
    // Pending user signs in → auto-enters PENDING_WS → pending-approval gate.
    await loginPending(pageU, PENDING_ACCOUNT);

    // Admin (super) grants a role — the exact updateUserRoles path the UI uses.
    await bridgeSignIn(pageA, SUPER_ACCOUNT);
    await pageA.evaluate(
      ({ slug, uid }) => window.__pbtest.grantRole(slug, uid, ['player']),
      { slug: PENDING_WS, uid: UID_PENDING },
    );

    // LIVE contract: the pending user's gate clears and the app shell renders —
    // WITHOUT any manual reload on pageU.
    await expect(pageU.getByTestId('pending-approval')).toBeHidden({ timeout: 15000 });
    await expect(pageU.getByTestId('nav-ball')).toBeVisible({ timeout: 15000 });
  } finally {
    await ctxU.close();
    await ctxA.close();
  }
});
