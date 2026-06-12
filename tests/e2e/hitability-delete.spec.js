// e2e — Hitability marker delete (positions + targets) with cascade + confirm
// (brief §C, Jacek 2026-06-11). Runs against the Firebase emulator.
//
// Acceptance:
//   - delete a TARGET that has recorded hits ⇒ ConfirmModal with the correct hit
//     count ⇒ confirm ⇒ target row, its connection AND its hits all gone (count 0)
//   - delete a marker with ZERO hits ⇒ NO modal, immediate removal
//
// Isolated fixture (TRN_HIT_DEL on its OWN layout): the destructive flow never
// touches TRN_HIT's shared, layout-keyed config, so hitability-responsive stays
// green (shared-state rule). One target + one position + link → a track tap
// auto-attributes (count == taps).
//
// Fail-first: the pre-§C rail had no per-marker delete affordance at all (only
// connections were deletable), so the `hit-del-target-*` / `hit-del-pos-*`
// locators below do not exist until §C lands → RED.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, LAYOUT_HIT_DEL, TRN_HIT_DEL, HIT_TGT_ID, HIT_POS_ID, HIT_TGT_POS, hitabilityDelUrl } from './fixtures.js';

const PORTRAIT = { width: 414, height: 896 };

const setupBridge = async (page) => {
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
};
const hitCount = (page) => page.evaluate(
  ({ l, t }) => window.__pbtest.hitabilityHitCount(l, t), { l: LAYOUT_HIT_DEL, t: TRN_HIT_DEL },
);

async function tapTarget(page) {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(350); // let the ResizeObserver settle the fit
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + HIT_TGT_POS.x * box.width, box.y + HIT_TGT_POS.y * box.height);
}

const confirmBtn = (page) => page.getByRole('button', { name: /^(Usuń|Delete)$/ });

test.describe('#C Hitability marker delete', () => {
  test('record hit → delete target ⇒ confirm w/ count ⇒ cascade; zero-hit delete skips modal', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await setupBridge(page);
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + hitabilityDelUrl);
    await expect(page.getByTestId('hit-mode-config')).toBeVisible({ timeout: 20000 });

    // ── 1) record ONE hit on the target (auto-attributes to pos-1). ──
    await page.getByTestId('hit-mode-track').click();
    await tapTarget(page);
    await expect.poll(() => hitCount(page)).toBe(1);

    // ── 2) delete the TARGET (1 hit) → ConfirmModal surfaces the count. ──
    await page.getByTestId('hit-mode-config').click();
    await expect(page.getByTestId(`hit-del-target-${HIT_TGT_ID}`)).toBeVisible();
    await page.getByTestId(`hit-del-target-${HIT_TGT_ID}`).click();
    await expect(page.getByText(/(ma 1 |has 1 )/)).toBeVisible(); // hit count in the message
    await confirmBtn(page).click();

    // target row gone + cascade deleted its hit + its connection.
    await expect(page.getByTestId(`hit-del-target-${HIT_TGT_ID}`)).toHaveCount(0);
    await expect.poll(() => hitCount(page)).toBe(0);

    // ── 3) the position now has ZERO hits → its delete skips the modal. ──
    await expect(page.getByTestId(`hit-del-pos-${HIT_POS_ID}`)).toBeVisible();
    await page.getByTestId(`hit-del-pos-${HIT_POS_ID}`).click();
    await expect(confirmBtn(page)).toHaveCount(0);                     // no modal
    await expect(page.getByTestId(`hit-del-pos-${HIT_POS_ID}`)).toHaveCount(0); // removed immediately
  });
});
