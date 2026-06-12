// e2e — Hitability marker popup (STEP 2, Jacek decision (b)-extended 2026-06-12).
// Runs against the Firebase emulator.
//
// Acceptance:
//   - plain tap in Config = LINKING, unchanged (tap position → tap target →
//     connection row appears; NO popup opens from a plain tap)
//   - long-press a marker on the canvas ⇒ editor popup; saved alias renders in
//     the rail row (render-everywhere)
//   - tap a rail list row ⇒ the SAME popup, prefilled with the saved alias
//
// Isolated fixture (TRN_HIT_POP on its OWN layout): the spec renames a marker
// and creates the first link, so it never touches TRN_HIT's shared, layout-keyed
// config (shared-state rule). Seeded WITHOUT a link — step 1 creates it.
//
// Fail-first: pre-STEP-2 there is no `hit-editor` popup nor `hit-row-pos-*`
// row tap targets → RED until the feature lands.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import {
  TEST_ACCOUNT, WS, HIT_POS_ID, HIT_POS_XY, HIT_TGT_POS, hitabilityPopUrl,
} from './fixtures.js';

const PORTRAIT = { width: 414, height: 896 };

const canvasPoint = async (page, pt) => {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(350); // let the ResizeObserver settle the fit
  const box = await canvas.boundingBox();
  return { x: box.x + pt.x * box.width, y: box.y + pt.y * box.height };
};

test.describe('STEP 2 Hitability marker popup', () => {
  test('plain tap links; long-press opens editor; row tap opens the same editor', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + hitabilityPopUrl);
    await expect(page.getByTestId('hit-mode-config')).toBeVisible({ timeout: 20000 });

    // ── 1) plain tap = LINKING, unchanged: position → target → link row. ──
    const pos = await canvasPoint(page, HIT_POS_XY);
    await page.mouse.click(pos.x, pos.y);
    await expect(page.getByTestId('hit-editor')).toHaveCount(0); // no popup on plain tap
    const tgt = await canvasPoint(page, HIT_TGT_POS);
    await page.mouse.click(tgt.x, tgt.y);
    await expect(page.getByText(/(Połączenia \(1\)|Connections \(1\))/)).toBeVisible();

    // ── 2) long-press the position marker ⇒ editor popup; alias "Snake". ──
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    await page.waitForTimeout(700); // > the 500ms long-press threshold
    await page.mouse.up();
    await expect(page.getByTestId('hit-editor')).toBeVisible();
    await page.getByTestId('hit-editor').getByRole('textbox').fill('Snake');
    await page.getByRole('button', { name: /^(Zapisz|Save)$/ }).click();
    await expect(page.getByTestId('hit-editor')).toHaveCount(0);
    await expect(page.getByTestId(`hit-row-pos-${HIT_POS_ID}`)).toContainText('Snake');

    // ── 3) tap the rail row ⇒ the SAME editor, prefilled with the alias. ──
    await page.getByTestId(`hit-row-pos-${HIT_POS_ID}`).click();
    await expect(page.getByTestId('hit-editor')).toBeVisible();
    await expect(page.getByTestId('hit-editor').getByRole('textbox')).toHaveValue('Snake');
  });
});
