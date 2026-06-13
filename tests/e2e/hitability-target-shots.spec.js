// e2e — Hitability track-mode per-target shot sheet (2026-06-13, Jacek request:
// "after clicking a target show all its shots with delete; navigation is hard").
// Runs against the Firebase emulator.
//
// Acceptance:
//   - track-mode plain tap on the target still RECORDS a hit (capture gesture
//     untouched) → hit count rises;
//   - LONG-PRESS the target (STEP-2 gesture model) opens a sheet listing THAT
//     target's shots, each deletable; deleting drops the count.
//
// Isolated fixture (TRN_HIT_TRACK on its own layout): net-zero (add then delete)
// but isolated so a mid-test failure never strands a hit on a shared config.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, HIT_TGT_POS, hitabilityTrackUrl } from './fixtures.js';

const PORTRAIT = { width: 414, height: 896 };

const canvasPoint = async (page, pt) => {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(350);
  const box = await canvas.boundingBox();
  return { x: box.x + pt.x * box.width, y: box.y + pt.y * box.height };
};

test.describe('Hitability track-mode per-target shot sheet', () => {
  test('plain tap records; long-press target lists its shots; delete drops the count', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + hitabilityTrackUrl);
    await expect(page.getByTestId('hit-mode-track')).toBeVisible({ timeout: 20000 });

    // Enter track mode.
    await page.getByTestId('hit-mode-track').click();

    // ── plain tap on the target = RECORD a hit (count 0 → 1). ──
    const tgt = await canvasPoint(page, HIT_TGT_POS);
    await page.mouse.click(tgt.x, tgt.y);
    await expect(page.getByText(/(Trafienia \(1\)|Hits \(1\))/)).toBeVisible({ timeout: 10000 });

    // ── long-press the target ⇒ per-target shot sheet with that 1 shot. ──
    await page.mouse.move(tgt.x, tgt.y);
    await page.mouse.down();
    await page.waitForTimeout(700); // > 500ms long-press threshold
    await page.mouse.up();
    await expect(page.getByTestId('target-shot-sheet')).toBeVisible();
    const delBtn = page.getByTestId('target-shot-sheet').getByRole('button', { name: 'delete' });
    await expect(delBtn).toHaveCount(1);

    // ── delete the shot from the sheet ⇒ count back to 0. ──
    await delBtn.click();
    await expect(page.getByText(/(Trafienia \(0\)|Hits \(0\))/)).toBeVisible({ timeout: 10000 });
  });
});
