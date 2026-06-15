// Durable invite association (Spark, no backend) — Part 1: email-keyed self-claim.
// The heart of the fix: a user with a PENDING invites/{email} but NO invite token
// and NO membership self-claims their workspace membership PURELY on login, keyed
// on their authenticated email. This is browser-agnostic — it survives the
// in-app-browser → Safari hop that the token path cannot (the user here never had
// any token at all).
//
// Validates BOTH the claim logic (dataService.claimEmailInvite via the on-login
// hook) AND the drafted rules (the emulator runs firestore.rules — the email
// self-claim workspace branch + the invites email-claim update). Prod rules are
// NOT deployed until Jacek CONFIRM; this proves the draft before that.
//
// Fail-first: without the claim logic / if the rules deny, claimee stays on
// NoWorkspaceScreen (no nav-ball) → RED.
import { test, expect } from '@playwright/test';
import { CLAIMEE_ACCOUNT } from './fixtures.js';

test('email invite → login self-claims membership (no token, browser-agnostic)', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('pbscoutpro-handedness', 'right'));
  await page.locator('input[type="email"]').fill(CLAIMEE_ACCOUNT.email);
  await page.locator('input[type="password"]').fill(CLAIMEE_ACCOUNT.password);
  await page.locator('button[type="submit"]').click();

  // On login the email self-claim runs (no invite link was ever opened) →
  // membership written → setActiveWorkspace reloads into the ws → app shell.
  // claimee carries linkSkippedAt, so post-claim they land in the app, not
  // onboarding. Generous timeout to ride the claim → reload.
  await expect(page.getByTestId('nav-ball')).toBeVisible({ timeout: 25000 });
});
