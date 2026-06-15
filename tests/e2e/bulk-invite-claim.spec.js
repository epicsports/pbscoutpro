// Durable invite — STEP 3 bulk proof (2026-06-15): TWO email-invitees with pending
// invites to the SAME workspace both self-claim on login, in parallel fresh
// contexts. This is the multi-account activation window that stranded Maks + 3 —
// it must not cross-contaminate (each claims their OWN invite/role, lands in).
// Both carry linkSkippedAt + emailVerified, so post-claim they reach the app shell
// (nav-ball), not the onboarding gate. Keyed purely on the authenticated email.
import { test, expect } from '@playwright/test';
import { BULK1_ACCOUNT, BULK2_ACCOUNT } from './fixtures.js';

async function loginAndExpectIn(page, acct) {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('pbscoutpro-handedness', 'right'));
  await page.locator('input[type="email"]').fill(acct.email);
  await page.locator('input[type="password"]').fill(acct.password);
  await page.locator('button[type="submit"]').click();
  // Self-claim on login → membership+role written → reload → app shell.
  await expect(page.getByTestId('nav-ball')).toBeVisible({ timeout: 25000 });
}

test('bulk: two email-invitees both self-claim the shared workspace (no cross-contamination)', async ({ browser }) => {
  const c1 = await browser.newContext();
  const c2 = await browser.newContext();
  const p1 = await c1.newPage();
  const p2 = await c2.newPage();
  try {
    await loginAndExpectIn(p1, BULK1_ACCOUNT);
    await loginAndExpectIn(p2, BULK2_ACCOUNT);
  } finally {
    await c1.close();
    await c2.close();
  }
});
