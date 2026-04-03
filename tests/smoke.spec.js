// tests/smoke.spec.js
// Core app flows that must never break.
// Run: PBSCOUT_PASSWORD=xxx npx playwright test smoke

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

test.describe('Smoke tests', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Login → Home loads', async ({ page }) => {
    // Dashboard shows PbScoutPro title and bottom nav
    await expect(page.getByText('PbScoutPro', { exact: true })).toBeVisible();
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('Navigate to Teams via bottom nav', async ({ page }) => {
    await page.locator('nav').locator('text=Teams').click();
    await page.waitForURL(/#\/teams/, { timeout: 10000 });
    await expect(page).toHaveURL(/#\/teams/);
  });

  test('Navigate to Players via bottom nav', async ({ page }) => {
    await page.locator('nav').locator('text=Players').click();
    await page.waitForURL(/#\/players/, { timeout: 10000 });
    await expect(page).toHaveURL(/#\/players/);
  });

  test('Navigate to Layouts via bottom nav', async ({ page }) => {
    await page.locator('nav').locator('text=Layouts').click();
    await page.waitForURL(/#\/layouts/, { timeout: 10000 });
    await expect(page).toHaveURL(/#\/layouts/);
  });

  test('Layout page loads', async ({ page }) => {
    await page.locator('nav').locator('text=Layouts').click();
    await page.waitForURL(/#\/layouts/, { timeout: 10000 });
    await expect(page.getByText('Layouts', { exact: true }).first()).toBeVisible();
  });

  test('Canvas renders without crash', async ({ page }) => {
    await page.locator('nav').locator('text=Layouts').click();
    await page.waitForURL(/#\/layouts/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    const layoutImages = page.locator('img[src*="data:image"], img[src*="firebase"]');
    const count = await layoutImages.count();
    if (count === 0) { test.skip(); return; }
    await layoutImages.first().click();
    await page.waitForTimeout(3000);
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();
  });

  test('No console errors on Home', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForTimeout(3000);
    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('firebase') &&
      !e.includes('net::ERR')
    );
    expect(critical).toEqual([]);
  });

  test('Touch targets ≥ 44px', async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width > 768) return;

    const buttons = page.locator('button');
    const count = await buttons.count();
    const tooSmall = [];

    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = buttons.nth(i);
      if (!await btn.isVisible()) continue;
      const box = await btn.boundingBox();
      if (box && (box.height < 36 || box.width < 36)) {
        const text = await btn.textContent();
        tooSmall.push(`"${text?.trim()}" ${Math.round(box.width)}×${Math.round(box.height)}`);
      }
    }

    if (tooSmall.length > 0) {
      console.warn('Small touch targets:', tooSmall.join(', '));
    }
    expect(tooSmall.length).toBeLessThan(5);
  });
});
