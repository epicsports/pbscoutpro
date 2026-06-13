// H0 pixel-diff harness — arc B <Screen> migration gate.
//
// Proves a screen migrated to <Screen archetype="detail"> renders pixel-
// identical to its pre-migration ad-hoc shell at phone width. Flow:
//   1. On pre-migration code: `--update-snapshots` writes the baseline.
//   2. Migrate the page to <Screen>.
//   3. Re-run (no update): toHaveScreenshot compares → must be 0 diff.
// Baselines are committed under tests/e2e/screen-pilot-diff.spec.js-snapshots/.
//
// The two pilot pages are BOTH detail-tier (640) — mockup-5: "the desktop
// list-760 tier is NOT exercised by these two pages (both detail)". The shell
// is what's under test (max-width, centering, header position, bottom pad);
// content is moved by-reference and unchanged, so any non-zero diff = a shell
// regression. Animations disabled to kill fade-in flake.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, UID } from './fixtures.js';

const PHONE = { width: 414, height: 896 };

async function dismissNudge(page) {
  const n = page.getByRole('button', { name: /^(Zrobię to później|I'll do it later)$/ });
  if (await n.isVisible().catch(() => false)) await n.click();
}

test.describe('arc B — <Screen> pilot pixel-diff (detail tier)', () => {
  test('ScoutIssuesPage (/my-issues) shell is pixel-stable', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(PHONE);
    await page.goto('/#/my-issues');
    await dismissNudge(page);
    // No networkidle (live Firestore listeners never idle); fixed settle.
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('my-issues-detail.png', {
      animations: 'disabled',
      maxDiffPixels: 0,
      fullPage: true,
    });
  });

  test('ScoutDetailPage (/scouts/:uid) shell is pixel-stable', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(PHONE);
    await page.goto(`/#/scouts/${UID}`);
    await dismissNudge(page);
    await expect(page.locator('canvas, h1, [class*="fade"]').first()).toBeVisible({ timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot('scout-detail.png', {
      animations: 'disabled',
      maxDiffPixels: 0,
      fullPage: true,
    });
  });

  test('ScoutRankingPage (/scouts) shell is pixel-stable', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(PHONE);
    await page.goto('/#/scouts');
    await dismissNudge(page);
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('scout-ranking-detail.png', {
      animations: 'disabled',
      maxDiffPixels: 0,
      fullPage: true,
    });
  });
});
