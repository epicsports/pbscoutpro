// e2e — §116 rail-collapse shell (CanvasRailLayout variant A). On a tablet-
// landscape viewport (1194×834) where a full rail would cram the field, the rail
// collapses to a 56px icon strip; tapping a strip icon opens a TRANSIENT overlay
// panel over the field; closing it (scrim) leaves the field clean + tappable.
//
// FAIL-FIRST: pre-Stage-2 the shell never collapsed — at 1194×834 it showed the
// full rail (no strip), so `rail-strip-back` does not exist → RED. Post-Stage-2
// the strip + overlay exist and the field stays interactive → GREEN.
//
// Phone-landscape + desktop-wide stay FULL rail — covered by hitability-responsive
// .spec.js (1920×1080 asserts the full rail); this collapse must not disturb it.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, LAYOUT, TRN_HIT, HIT_TGT_POS, hitabilityUrl } from './fixtures.js';

const TABLET_LS = { width: 1194, height: 834 }; // iPad 11" landscape — full rail would cram the field

const setupBridge = async (page) => {
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
};
const hitCount = (page) => page.evaluate(
  ({ l, t }) => window.__pbtest.hitabilityHitCount(l, t), { l: LAYOUT, t: TRN_HIT },
);

test.describe('§116 rail-collapse (CanvasRailLayout variant A)', () => {
  test('tablet-landscape collapses to a strip; overlay opens/closes; field stays tappable', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await setupBridge(page);
    await page.setViewportSize(TABLET_LS);
    await page.goto('/' + hitabilityUrl);

    // COLLAPSED: the strip is present, the full-rail mode switcher is NOT.
    await expect(page.getByTestId('rail-strip-back')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('rail-strip-tab-track')).toBeVisible();
    await expect(page.getByTestId('hit-mode-track')).toHaveCount(0); // full rail mode-switcher gone

    // Field is the hero — fills ≥84% of the viewport height even with the strip.
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(350);
    const fieldBox = await canvas.boundingBox();
    expect(fieldBox.height).toBeGreaterThan(TABLET_LS.height * 0.84);

    // Tap a strip tab → TRANSIENT overlay panel slides over the field.
    await page.getByTestId('rail-strip-tab-track').click();
    await expect(page.getByTestId('rail-overlay-panel')).toBeVisible();
    await expect(page.getByTestId('rail-overlay-scrim')).toBeVisible();

    // Tap the scrim → panel closes (field no longer occluded).
    await page.getByTestId('rail-overlay-scrim').click();
    await expect(page.getByTestId('rail-overlay-panel')).toHaveCount(0);

    // Field tap STILL registers a hit (track mode was selected when we opened the panel).
    await page.waitForTimeout(300);
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + HIT_TGT_POS.x * box.width, box.y + HIT_TGT_POS.y * box.height);
    await expect.poll(() => hitCount(page)).toBeGreaterThan(0);
  });
});
