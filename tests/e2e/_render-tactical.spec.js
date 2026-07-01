// _render-tactical — render-verify harness for the new DrawingCanvas engine
// (STAGE 1). Emulator-only route /test/tactical mounts a seeded scene. Not a gate
// spec (tagged render-verify → excluded by npm run test:e2e). Run explicitly:
//   npx playwright test --config playwright.emulator.config.js _render-tactical
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS } from './fixtures.js';

const OUT_DIR = path.resolve('data-export/render');

test.describe('render-verify — tactical DrawingCanvas (seeded, NOT a gate spec)', () => {
  test.beforeAll(() => { fs.mkdirSync(OUT_DIR, { recursive: true }); });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pbscoutpro_lang', 'en'));
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate((s) => window.__pbtest.setWorkspace(s), WS);
  });

  test('render-verify tactical @ 1000x720 (landscape)', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 720 });
    await page.goto('/#/test/tactical');
    await expect(page.getByTestId('tactical-harness')).toBeVisible({ timeout: 20000 });
    // engine painted: the field SVG line layer + at least one player node
    await expect(page.locator('svg path.tac-entry, svg line.tac-shot').first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500); // settle animations
    const file = path.join(OUT_DIR, 'tactical-1000.png');
    await page.screenshot({ path: file, fullPage: false });
    // eslint-disable-next-line no-console
    console.log(`[render-verify] tactical → ${file}`);
  });
});
