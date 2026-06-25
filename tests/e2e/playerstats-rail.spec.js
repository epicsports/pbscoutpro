// e2e — PlayerStats responsive layout.
// PORTRAIT (phone): capped heatmap hero + stacked report; the 6-metric stat grid
// reflows (auto-fit) so the 3rd card never clips (asserted here, grid directly visible).
// TABLET-LANDSCAPE / WIDE (≥720): the wide 2-col ANALYTICS dashboard (hero card +
// self-review LEFT, analytics grid RIGHT). CD Option A (2026-06-25): the player
// self-stats screen renders ANALYTICS, not a field — so §116 "field-is-king"
// CanvasRailLayout is RETIRED for THIS screen only (it stays for match/scout/opponent,
// where the field IS the content). Hero/heatmap data: pa1 / MATCH_PSTATS.
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

    // TABLET-LANDSCAPE: PlayerStats landscape = the wide 2-col ANALYTICS dashboard
    // (CD Option A, 2026-06-25 — §116 field-hero RETIRED for THIS screen ONLY; the
    // player self-stats screen renders analytics, not a field). LEFT = hero card +
    // self-review; RIGHT = analytics grid. §116 stays everywhere else (match/scout/opponent).
    await page.setViewportSize(TABLET_LS);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('rail-strip-back')).toHaveCount(0);             // NO CanvasRailLayout field-hero on this screen
    const wideGrid = page.getByTestId('player-stat-grid');
    await expect(wideGrid).toBeVisible();                                         // analytics grid renders
    expect((await wideGrid.boundingBox()).x).toBeGreaterThan(320);               // RIGHT column → genuine 2-col (hero left, analytics right)

    // PORTRAIT again: unchanged stack.
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(400);
    expect((await canvas.boundingBox()).height).toBeLessThan(PORTRAIT.height * 0.7);
  });
});
