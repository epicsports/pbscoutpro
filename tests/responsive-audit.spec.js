// tests/responsive-audit.spec.js
// Takes screenshots of every screen on the current device viewport.
// Run: PBSCOUT_PASSWORD=xxx npx playwright test responsive-audit
// Report: npx playwright show-report tests/report

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

test.describe('Responsive audit', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Home page', async ({ page }) => {
    await expect(page.locator('text=Tournaments')).toBeVisible();
    await page.screenshot({ path: `tests/screenshots/${test.info().project.name}/01-home.png`, fullPage: true });
  });

  test('Teams page', async ({ page }) => {
    await page.click('text=Teams');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `tests/screenshots/${test.info().project.name}/02-teams.png`, fullPage: true });
  });

  test('Players page', async ({ page }) => {
    await page.click('text=Players');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `tests/screenshots/${test.info().project.name}/03-players.png`, fullPage: true });
  });

  test('Layouts page', async ({ page }) => {
    await page.click('text=Layout');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `tests/screenshots/${test.info().project.name}/04-layouts.png`, fullPage: true });
  });

  test('Layout detail (if exists)', async ({ page }) => {
    await page.click('text=Layout');
    await page.waitForTimeout(1000);
    // Click first layout card if any
    const card = page.locator('.layout-card, [class*="layout"]').first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `tests/screenshots/${test.info().project.name}/05-layout-detail.png`, fullPage: true });
    }
  });

  test('Tournament page (if exists)', async ({ page }) => {
    // Click first tournament
    const tourney = page.locator('text=NXL, text=DPL, text=PXL').first();
    if (await tourney.isVisible()) {
      await tourney.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `tests/screenshots/${test.info().project.name}/06-tournament.png`, fullPage: true });
    }
  });
});
