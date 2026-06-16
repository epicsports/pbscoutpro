// e2e — view-as re-enable (§38.5 / CC_BRIEF_VIEWAS_REENABLE).
// The feature was disabled in 2026-04-24 because there was NO visible exit (stuck-
// impersonation risk). These tests lock the re-enable: admin can impersonate, a
// persistent EXIT is always on-screen while impersonating, exiting restores real
// roles + clears sessionStorage, and a non-admin can NEVER impersonate.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, B4_SCOUT_ACCOUNT } from './fixtures.js';

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test.describe('view-as re-enable (§38.5)', () => {
  test('admin impersonates scout → admin surface hides + visible exit → exit restores + clears', async ({ page }) => {
    await login(page, TEST_ACCOUNT); // demo-ws member+admin+coach → realIsAdmin
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();

    // Admin sees the view-as entry (ADMIN section of the drawer).
    const pill = page.getByTestId('viewas-pill');
    await expect(pill).toBeVisible();

    // Open the switcher → impersonate SCOUT (a non-admin role).
    await pill.click();
    await page.getByTestId('viewas-role-scout').click();

    // THE NON-NEGOTIABLE: a persistent, floating EXIT is on-screen while impersonating.
    await expect(page.getByTestId('viewas-indicator')).toBeVisible();
    // effectiveIsAdmin collapsed → the admin entry (pill, inside the admin section) is gone.
    await expect(page.getByTestId('viewas-pill')).toHaveCount(0);
    // sessionStorage holds the intentional session (per-workspace key).
    const persisted = await page.evaluate(() =>
      Object.keys(sessionStorage).some(k => k.startsWith('pbscoutpro_viewAs_') && sessionStorage.getItem(k) && sessionStorage.getItem(k) !== 'null'));
    expect(persisted).toBe(true);

    // Exit via the indicator × → impersonation cleared, indicator gone, storage cleared.
    await page.getByTestId('viewas-exit').click();
    await expect(page.getByTestId('viewas-indicator')).toHaveCount(0);
    const cleared = await page.evaluate(() =>
      Object.keys(sessionStorage).filter(k => k.startsWith('pbscoutpro_viewAs_'))
        .every(k => !sessionStorage.getItem(k) || sessionStorage.getItem(k) === 'null'));
    expect(cleared).toBe(true);
  });

  test('non-admin can NEVER impersonate — no view-as entry (guard holds)', async ({ page }) => {
    await login(page, B4_SCOUT_ACCOUNT); // scout, not admin
    await skipOnboarding(page);
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    // The admin section (and the view-as pill) never render for a non-admin.
    await expect(page.getByTestId('viewas-pill')).toHaveCount(0);
    await expect(page.getByTestId('viewas-indicator')).toHaveCount(0);
  });
});
