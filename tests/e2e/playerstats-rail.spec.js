// e2e — Stage 4.1: PlayerStats landscape = CanvasRailLayout (hero = breakout
// heatmap, rail = report sections). FAIL-FIRST: current PlayerStats has NO
// landscape branch (portrait stack in every orientation), so phone-landscape
// hero-≥95% + rail-left FAIL → RED; after the wrap → GREEN. Tablet-landscape
// collapses to the strip (§116). Portrait unchanged.
//
// Hero data: pa1 has the seeded MATCH_PSTATS heatmap fixture (lay-demo fieldImage
// + a break position) → the breakout heatmap renders.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_PSTATS, ROSTER_A_IDS } from './fixtures.js';

const PLAYER = ROSTER_A_IDS[0]; // pa1
const url = `#/player/${PLAYER}/stats?scope=tournament&tid=${TRN_PSTATS}`;
const PHONE_LS = { width: 896, height: 414 };
const TABLET_LS = { width: 1194, height: 834 };
const PORTRAIT = { width: 414, height: 896 };

test.describe('Stage 4.1 — PlayerStats landscape rail', () => {
  // FIXME (un-fixme when the Stage-4.1 wrap lands): this is the RED fail-first.
  // The fixture (TRN_PSTATS / base-demo fieldImage) renders the hero correctly;
  // the landscape rail-left + hero-≥95% assertions FAIL on the un-wrapped page
  // (canvas x≈117, not >150). Pending the CanvasRailLayout wrap of PlayerStats
  // (extract the report column into a shared var → hero=@1127 + rail).
  test('phone-landscape hero ≥95% + rail-left; tablet collapses; portrait unchanged', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // Fixture sanity: the breakout heatmap (the HERO) renders for pa1.
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + url);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });
    const pBox = await canvas.boundingBox();
    expect(pBox.height).toBeLessThan(PORTRAIT.height * 0.7); // portrait: capped, report below

    // PHONE-LANDSCAPE: hero fills ≥95% height + sits RIGHT of a left rail.
    await page.setViewportSize(PHONE_LS);
    await page.waitForTimeout(400);
    const lsBox = await canvas.boundingBox();
    expect(lsBox.height).toBeGreaterThan(PHONE_LS.height * 0.95);
    expect(lsBox.x).toBeGreaterThan(150); // rail on the LEFT, hero field on the right

    // TABLET-LANDSCAPE: the rail collapses to the §116 strip.
    await page.setViewportSize(TABLET_LS);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('rail-strip-back')).toBeVisible();

    // PORTRAIT again: unchanged stack (capped hero).
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(400);
    const pBox2 = await canvas.boundingBox();
    expect(pBox2.height).toBeLessThan(PORTRAIT.height * 0.7);
  });
});
