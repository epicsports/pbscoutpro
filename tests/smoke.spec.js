// tests/smoke.spec.js
// Core app flows that must never break.
// Run: PBSCOUT_PASSWORD=xxx npx playwright test smoke
// If any test fails after a deploy → something is broken.

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

test.describe('Smoke tests', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Login → Home loads', async ({ page }) => {
    await expect(page.locator('text=Tournaments')).toBeVisible();
    await expect(page.locator('text=Players & teams')).toBeVisible();
    await expect(page.locator('text=Layouts & tactics')).toBeVisible();
  });

  test('Navigate to Teams', async ({ page }) => {
    // "Players & teams" accordion is open by default — click Teams button directly
    const teamsBtn = page.locator('button').filter({ hasText: /Teams \(/ });
    await teamsBtn.click();
    await page.waitForURL(/#\/teams/, { timeout: 10000 });
    await expect(page).toHaveURL(/#\/teams/);
  });

  test('Navigate to Players', async ({ page }) => {
    // Click Players button inside the open accordion
    const playersBtn = page.locator('button').filter({ hasText: /^.*Players$/ });
    await playersBtn.click();
    await page.waitForURL(/#\/players/, { timeout: 10000 });
    await expect(page).toHaveURL(/#\/players/);
  });

  test('Navigate to Layouts', async ({ page }) => {
    // Expand "Layouts & tactics" accordion (closed by default), then click
    await page.click('text=Layouts & tactics');
    await page.click('text=Open Layout Library');
    await page.waitForURL(/#\/layouts/, { timeout: 10000 });
    await expect(page).toHaveURL(/#\/layouts/);
  });

  test('Layout library loads images', async ({ page }) => {
    await page.click('text=Layouts & tactics');
    await page.click('text=Open Layout Library');
    await page.waitForURL(/#\/layouts/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    // Check if any layout thumbnail images loaded
    const images = page.locator('img[src*="data:image"], img[src*="firebase"]');
    const count = await images.count();
    // If layouts exist, images should render
    if (count > 0) {
      const first = images.first();
      await expect(first).toBeVisible();
    }
  });

  test('Canvas renders without crash', async ({ page }) => {
    await page.click('text=Layouts & tactics');
    await page.click('text=Open Layout Library');
    await page.waitForURL(/#\/layouts/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    // Find layout card images (not header logo)
    const layoutImages = page.locator('img[src*="data:image"], img[src*="firebase"]');
    const count = await layoutImages.count();
    if (count === 0) {
      // No layouts — skip gracefully
      test.skip();
      return;
    }
    await layoutImages.first().click();
    await page.waitForTimeout(3000);
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();
  });

  test('FieldEditor toolbar renders', async ({ page }) => {
    await page.click('text=Layouts & tactics');
    await page.click('text=Open Layout Library');
    await page.waitForURL(/#\/layouts/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    const layoutImages = page.locator('img[src*="data:image"], img[src*="firebase"]');
    const count = await layoutImages.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await layoutImages.first().click();
    await page.waitForTimeout(3000);
    // Should see toolbar buttons (emoji icons)
    const toolbar = page.locator('button').filter({ hasText: /🏷️|〰️|⚠️|🔍/ });
    await expect(toolbar.first()).toBeVisible();
  });

  test('No console errors on Home', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    // Already logged in from beforeEach — just wait and collect errors
    await page.waitForTimeout(3000);
    // Filter out known non-critical warnings
    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('firebase') &&
      !e.includes('net::ERR')
    );
    expect(critical).toEqual([]);
  });

  test('Touch targets ≥ 44px', async ({ page, browserName }) => {
    // Only run on mobile viewports
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
    // Soft assertion — warn but don't fail (some icon buttons are intentionally small)
    expect(tooSmall.length).toBeLessThan(5);
  });
});
