// _render-tactics-canvas — render-verify for the STAGE 2 Coach Tactics page
// (TacticsCanvasPage) on the new DrawingCanvas engine, over SEEDED data. Not a
// gate spec (render-verify tag). Run:
//   npx playwright test --config playwright.emulator.config.js _render-tactics-canvas
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, LAYOUT } from './fixtures.js';

const OUT_DIR = path.resolve('data-export/render');

test.describe('render-verify — Coach Tactics canvas (seeded, NOT a gate spec)', () => {
  test.beforeAll(() => { fs.mkdirSync(OUT_DIR, { recursive: true }); });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pbscoutpro_lang', 'en'));
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate((s) => window.__pbtest.setWorkspace(s), WS);
  });

  test('render-verify tactics-canvas @ 1000x720 (add tactic → engine mounts on field)', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 720 });
    await page.goto(`/#/layout/${LAYOUT}/tactics-canvas`);
    // page shell
    await expect(page.getByText('Tactics', { exact: false }).first()).toBeVisible({ timeout: 20000 });
    const addBtn = page.getByRole('button', { name: 'New tactic' });
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    // add one → engine should mount (phase axis "POINT TIMELINE" is engine-only)
    await addBtn.click();
    await expect(page.getByText(/POINT TIMELINE/i).first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    const file = path.join(OUT_DIR, 'tactics-canvas-1000.png');
    await page.screenshot({ path: file, fullPage: false });
    // eslint-disable-next-line no-console
    console.log(`[render-verify] tactics-canvas → ${file}`);
  });
});
