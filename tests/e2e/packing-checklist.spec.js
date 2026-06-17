// e2e — Packing Checklist (CC_BRIEF_PACKING_CHECKLIST Stage E, fail-first).
// Exercises the REAL path: player menu entry → real route → real rows + critical sheet
// → success → persistence (Stage D; the emulator loads the STAGED appState rule) →
// landscape reflow. A green test that doesn't click the real menu/rows is forbidden.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT } from './fixtures.js';

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test.describe('Packing Checklist', () => {
  test('menu → route → critical flow → success → persists → landscape', async ({ page }) => {
    await login(page, SELFEDIT_ACCOUNT); // a LINKED player → sees the Checklista entry
    await skipOnboarding(page);

    // 1. Real menu entry → real route.
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await page.getByTestId('packing-menu-entry').click();
    await expect(page).toHaveURL(/player\/checklist/);
    await expect(page.getByText('Checklista wyjazdowa')).toBeVisible();

    // Clean slate (re-run safe): reset clears done/counts.
    await page.getByTestId('packing-reset-btn').click();
    await page.getByRole('button', { name: /^(Wyczyść|Clear)$/ }).click();

    // 2. Critical badge shows N>0 missing (N = visible critical items at default 'full').
    await expect(page.getByTestId('packing-crit-badge')).toBeVisible();

    // 3. Open the critical sheet, check EVERY critical item.
    await page.getByTestId('packing-crit-btn').click();
    await expect(page.getByTestId('packing-sheet')).toBeVisible();
    const rows = page.locator('[data-testid^="packing-sheet-row-"]');
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const cb = rows.nth(i).getByRole('checkbox');
      if ((await cb.getAttribute('aria-checked')) !== 'true') await cb.click();
    }

    // 4. Success state.
    await expect(page.getByTestId('packing-sheet-success')).toBeVisible();
    await expect(page.getByText('Komplet — możesz jechać')).toBeVisible();
    await page.getByTestId('packing-sheet-close').click();
    // badge gone (0 missing) on the main screen.
    await expect(page.getByTestId('packing-crit-badge')).toHaveCount(0);

    // 5. Persistence (Stage D): let the debounced write flush, reload → still 0 missing.
    await page.waitForTimeout(900);
    await page.reload();
    await expect(page.getByText('Checklista wyjazdowa')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('packing-crit-badge')).toHaveCount(0);

    // 6. Landscape: header + bottom bar visible, no horizontal overflow.
    await page.setViewportSize({ width: 900, height: 420 });
    await page.waitForTimeout(200);
    await expect(page.getByText('Checklista wyjazdowa')).toBeVisible();
    await expect(page.getByTestId('packing-crit-btn')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
