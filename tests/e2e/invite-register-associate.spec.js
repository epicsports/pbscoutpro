// Maks #3 — invite link → "Utwórz konto" (register) → must ASSOCIATE the new
// account with the invited workspace (members[] + role), NOT strand it on the
// NoWorkspaceScreen ("Konto utworzone — administrator musi dodać Cię"). Jacek's
// question: does the manual "create account" step after the magic link break the
// association? This reproduces the EXACT same-tab flow and verifies it doesn't.
//
// Flow: open #/invite/{token} → token stashed (sessionStorage) → switch to
// register → createUserWithEmailAndPassword auto-signs-in → useInviteRedemption
// redeems → setActiveWorkspace reloads into the ws. Associated coach (unlinked)
// then lands on the onboarding gate (skip button), which is the positive signal
// that membership was written.
import { test, expect } from '@playwright/test';
import { INVITE_SIGNUP_TOKEN, INVITE_SIGNUP_EMAIL } from './fixtures.js';

test('invite link → register associates the new account (no NoWorkspace strand)', async ({ page }) => {
  await page.goto(`/#/invite/${INVITE_SIGNUP_TOKEN}`);
  await page.evaluate(() => localStorage.setItem('pbscoutpro-handedness', 'right'));

  // LoginPage shows in login mode → switch to register ("Utwórz konto", exact so
  // it doesn't collide with the "→ Utwórz konto" submit button).
  await page.getByRole('button', { name: 'Utwórz konto', exact: true }).click();

  // Register form: display name + email + password.
  await page.locator('input[autocomplete="name"]').fill('Invite Signup');
  await page.locator('input[type="email"]').fill(INVITE_SIGNUP_EMAIL);
  await page.locator('input[type="password"]').fill('test1234');
  await page.locator('button[type="submit"]').click();

  // ASSOCIATED: redemption ran → member of invite-ws with a role → the unlinked
  // coach reaches the onboarding gate (skip CTA). If association had failed they
  // would be stranded on NoWorkspaceScreen (no skip CTA). Generous timeout to
  // ride the redeem → setActiveWorkspace reload.
  await expect(page.getByRole('button', { name: /Pomiń na razie|Skip for now/ }))
    .toBeVisible({ timeout: 25000 });
});
