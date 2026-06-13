// e2e STAGE 4 — PWA offline UX (the slice that's feasible in the dev+emulator
// harness). The SW app-shell precache boot and offline-data persistence are NOT
// testable here — the suite runs the vite dev server (no service worker) and the
// emulator uses an in-memory Firestore cache — so those are covered by manual
// real-device airplane-mode smoke (see DEPLOY_LOG). This guards the offline-aware
// sign-in: drop the network on a loaded page (no SW needed) → the dead form is
// replaced by the "connect once" message, and restored on reconnect.

import { test, expect } from '@playwright/test';

test.describe('STAGE 4 — PWA offline sign-in', () => {
  test('LoginPage swaps to the offline message when the network drops', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      // Unauthenticated fresh context → the email/password form renders.
      // Use the email input as a language-agnostic signal (B7: "Sign in" is now i18n-keyed).
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20000 });

      // Drop the network (page already loaded — no SW required). useOnline flips.
      await ctx.setOffline(true);
      await expect(page.getByText(/you're offline|offline/i)).toBeVisible();
      await expect(page.getByText(/connect to the internet once/i)).toBeVisible();

      // Reconnect → the form returns (no dead-state stuck).
      await ctx.setOffline(false);
      await expect(page.locator('input[type="email"]')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });
});
