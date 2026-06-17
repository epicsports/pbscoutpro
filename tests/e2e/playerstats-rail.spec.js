// e2e — Stage 4.1 / §118.1: PlayerStats landscape = REPORT-FIRST CanvasRailLayout.
// The report screen gives the DATA primacy: field + rail SHARE width (no §116 strip),
// the rail breathes (far past the old railMin 200), and the stat grid reflows
// (auto-fit) so the 3rd card never clips. Portrait unchanged (capped hero + stack).
// Hero data: pa1 has the seeded MATCH_PSTATS heatmap fixture.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_PSTATS, ROSTER_A_IDS } from './fixtures.js';

const PLAYER = ROSTER_A_IDS[0]; // pa1
const url = `#/player/${PLAYER}/stats?scope=tournament&tid=${TRN_PSTATS}`;
const TABLET_LS = { width: 1194, height: 834 };
const PORTRAIT = { width: 414, height: 896 };

test.describe('Stage 4.1 — PlayerStats report-first rail (§118.1)', () => {
  test('tablet-landscape: rail BREATHES (report-first, no strip) + stat grid never clips; portrait unchanged', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // PORTRAIT: capped hero, report stacked below (unchanged).
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + url);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });
    expect((await canvas.boundingBox()).height).toBeLessThan(PORTRAIT.height * 0.7);

    // TABLET-LANDSCAPE: report-first → field + rail SHARE width, NO §116 strip.
    await page.setViewportSize(TABLET_LS);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('rail-strip-back')).toHaveCount(0); // report-first never strips

    // (a) the report column BREATHES — far past the old railMin(200) / 56px strip. RED before.
    const report = page.getByTestId('player-report-column');
    await expect(report).toBeVisible();
    expect((await report.boundingBox()).width).toBeGreaterThan(200);

    // (b) the 6-metric stat grid reflows (auto-fit) → no horizontal overflow / clipped 3rd card.
    const gridOverflow = await page.getByTestId('player-stat-grid')
      .evaluate(el => el.scrollWidth - el.clientWidth);
    expect(gridOverflow).toBeLessThanOrEqual(1);

    // field is the residual letterbox on the RIGHT (rail on the left).
    expect((await canvas.boundingBox()).x).toBeGreaterThan(200);

    // PORTRAIT again: unchanged stack.
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(400);
    expect((await canvas.boundingBox()).height).toBeLessThan(PORTRAIT.height * 0.7);
  });
});
