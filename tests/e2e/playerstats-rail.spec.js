// e2e — PlayerStats landscape = FIELD-IS-KING CanvasRailLayout (§118 canon; the
// §118.1 report-first WIDTH split was REVERTED 2026-06-18 — it shrank the field on
// wide screens). Landscape: field=HERO (fills height) → §116 collapses the rail to
// the 56px strip; portrait unchanged. KEPT from §118.1-STAGE-B: the stat grid
// reflows (auto-fit) so the 3rd card never clips (asserted in the stacked portrait
// view, where the grid is directly visible). Hero data: pa1 / MATCH_PSTATS heatmap.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_PSTATS, ROSTER_A_IDS } from './fixtures.js';

const PLAYER = ROSTER_A_IDS[0]; // pa1
const url = `#/player/${PLAYER}/stats?scope=tournament&tid=${TRN_PSTATS}`;
const TABLET_LS = { width: 1194, height: 834 };
const PORTRAIT = { width: 414, height: 896 };

test.describe('PlayerStats field-is-king rail', () => {
  test('tablet-landscape: field is HERO + §116 strip; stat grid never clips; portrait unchanged', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // PORTRAIT: capped hero, report stacked below (unchanged) — and the 6-metric
    // stat grid reflows (auto-fit) → no horizontal overflow / clipped 3rd card (STAGE-B fix kept).
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + url);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });
    expect((await canvas.boundingBox()).height).toBeLessThan(PORTRAIT.height * 0.7);
    const gridOverflow = await page.getByTestId('player-stat-grid')
      .evaluate(el => el.scrollWidth - el.clientWidth);
    expect(gridOverflow).toBeLessThanOrEqual(1);

    // TABLET-LANDSCAPE: field-is-king → §116 strip present (rail collapsed), field fills height.
    await page.setViewportSize(TABLET_LS);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('rail-strip-back')).toBeVisible();              // rail collapsed → field is king
    expect((await canvas.boundingBox()).height).toBeGreaterThan(TABLET_LS.height * 0.78); // field fills height (hero)

    // PORTRAIT again: unchanged stack.
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(400);
    expect((await canvas.boundingBox()).height).toBeLessThan(PORTRAIT.height * 0.7);
  });
});
