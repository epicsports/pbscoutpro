// H0 migration gate (arc-B model C) — proves a page migrated to <Screen> is
// pixel-identical at PHONE + TABLET (the model-C promise: only desktop changes).
// Flow per page: baseline on pre-migration code (--update-snapshots), migrate,
// re-run → phone + tablet diff must be 0. Desktop is the intended cap (NOT shot
// here — it gets a register row, not a diff assertion). Isolated/clean-seed
// (run via test:e2e:migrationdiff), excluded from the shared suite.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, TEAM_A } from './fixtures.js';

const PHONE = { width: 414, height: 896 };
const TABLET = { width: 768, height: 1024 };

const PAGES = [
  { name: 'team-detail', url: `/#/team/${TEAM_A}`, anchor: 'team-load-error' /* unused; just settle */ },
  { name: 'profile', url: '/#/profile' },
];

async function dismissNudge(page) {
  const n = page.getByRole('button', { name: /^(Zrobię to później|I'll do it later)$/ });
  if (await n.isVisible().catch(() => false)) await n.click();
}

for (const p of PAGES) {
  for (const [vpName, vp] of [['phone', PHONE], ['tablet', TABLET]]) {
    test(`${p.name} @ ${vpName} pixel-stable (model C: below-desktop unchanged)`, async ({ page }) => {
      await login(page, TEST_ACCOUNT);
      await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 }).catch(() => {});
      await page.evaluate(s => window.__pbtest && window.__pbtest.setWorkspace(s), WS).catch(() => {});
      await page.setViewportSize(vp);
      await page.goto(p.url);
      await dismissNudge(page);
      await page.waitForTimeout(1500);
      await expect(page).toHaveScreenshot(`${p.name}-${vpName}.png`, {
        animations: 'disabled', maxDiffPixels: 0, fullPage: true,
      });
    });
  }
}
