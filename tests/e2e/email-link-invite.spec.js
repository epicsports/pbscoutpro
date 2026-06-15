// Durable invite — Part 2: full email-link flow, the headline cross-context fix.
// Admin sends an email invite → invitee opens the emailed link in a FRESH browser
// context (no token, no shared storage — the Messenger→Safari hop) → sets a
// password (express registration) → the email-keyed self-claim associates them on
// login → they land in the app with their role. End-to-end, Spark-only.
//
// The Firebase Auth EMULATOR exposes sent sign-in links via its REST API
// (/emulator/v1/projects/{p}/oobCodes), so we retrieve the real link the way a
// player would receive it by email, then complete it in a separate context.
import { test, expect } from '@playwright/test';
import { SUPER_ACCOUNT, CLAIM_WS, NEWINVITE_EMAIL } from './fixtures.js';

const OOB_URL = 'http://127.0.0.1:9099/emulator/v1/projects/demo-pbscoutpro/oobCodes';

async function bridgeSignIn(page, acct) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: acct.email, p: acct.password });
}

test('email-link invite: admin sends → invitee (fresh context) sets password → associated', async ({ browser }) => {
  // Admin records the email invite + sends the email-link (Firebase emulator).
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const ctxU = await browser.newContext();
  const pageU = await ctxU.newPage();
  try {
    await bridgeSignIn(pageA, SUPER_ACCOUNT);
    await pageA.evaluate(
      ({ slug, role, email }) => window.__pbtest.sendEmailInvite(slug, role, email),
      { slug: CLAIM_WS, role: 'coach', email: NEWINVITE_EMAIL },
    );

    // Retrieve the email sign-in link from the Auth emulator (the "email").
    const link = await pageA.evaluate(async ({ url, email }) => {
      const r = await fetch(url);
      const j = await r.json();
      const codes = (j.oobCodes || []).filter(c => c.email === email && c.requestType === 'EMAIL_SIGNIN');
      return codes.length ? codes[codes.length - 1].oobLink : null;
    }, { url: OOB_URL, email: NEWINVITE_EMAIL });
    expect(link).toBeTruthy();

    // Invitee opens the link in a FRESH context (no token / no shared storage).
    await pageU.goto(link);
    await expect(pageU.getByTestId('email-link-setup')).toBeVisible({ timeout: 30000 });

    // Fresh context → no stored email → the setup page always shows the
    // confirm-email step. Wait for the field (it appears after the brief
    // 'completing' step), fill it, continue. (A racy isVisible() check skipped
    // the fill when run before the step rendered.)
    const emailField = pageU.locator('input[type="email"]');
    await emailField.waitFor({ state: 'visible', timeout: 15000 });
    await emailField.fill(NEWINVITE_EMAIL);
    // Assert the controlled state registered BEFORE clicking — the submit button
    // is disabled while email is empty, so clicking before the value lands would
    // hang on Playwright's actionability wait (the earlier flake).
    await expect(emailField).toHaveValue(NEWINVITE_EMAIL, { timeout: 5000 });
    await pageU.getByRole('button', { name: /Dalej|Continue/ }).click();
    await pageU.locator('input[autocomplete="name"]').fill('New Player');
    await pageU.locator('input[type="password"]').first().fill('test1234');
    await pageU.locator('input[type="password"]').nth(1).fill('test1234');
    await pageU.getByRole('button', { name: /Aktywuj konto|Activate account/ }).click();

    // → URL replaced with app root → reload → email-keyed self-claim → ASSOCIATED.
    // The fresh (unlinked) invitee then lands on the onboarding gate (skip CTA) —
    // the positive signal that membership was written (vs NoWorkspace strand).
    await expect(pageU.getByRole('button', { name: /Pomiń na razie|Skip for now/ }))
      .toBeVisible({ timeout: 40000 });
  } finally {
    await ctxA.close();
    await ctxU.close();
  }
});
