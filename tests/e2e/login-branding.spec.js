// e2e — Reads login branding (asset reads_welcome_animation.html + avatar).
// The welcome splash plays on the logged-out screen, is decorative
// (pointer-events:none → never blocks the form), and the "reads" lockup replaces
// the old logo above the form. Logged-out: '/' renders LoginPage.
import { test, expect } from '@playwright/test';

test.describe('Reads login branding', () => {
  test('welcome splash renders + is non-blocking; reads lockup present; form usable', async ({ page }) => {
    await page.goto('/');

    // The welcome splash overlay is in the DOM…
    await expect(page.getByTestId('reads-splash')).toHaveCount(1);
    // …and it NEVER blocks the form (pointer-events:none) — fill immediately, even
    // while the splash is still animating over the field.
    const email = page.locator('input[type="email"]');
    await email.fill('coach@example.com');
    await expect(email).toHaveValue('coach@example.com');

    // The "reads" lockup renders above the form (replaces the old logo.png).
    await expect(page.getByLabel('reads').first()).toBeVisible();
  });
});
