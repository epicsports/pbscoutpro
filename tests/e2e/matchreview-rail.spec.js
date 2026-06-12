// e2e — Stage 4.3: MatchPage REVIEW mode landscape = CanvasRailLayout (hero =
// review heatmap, rail = scoreboard + points column). §116 archetype applied
// as-is (audit P0). Scout editor view untouched (A4 verified: review is its own
// return). Portrait unchanged.
//
// Fixture: TRN_PSTATS / MATCH_PSTATS (base layout WITH fieldImage + one logged
// point) — the same read-only hero fixture the 4.1/4.2 specs use (viewport-only
// assertions; no writes).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_PSTATS, MATCH_PSTATS } from './fixtures.js';

const url = `#/tournament/${TRN_PSTATS}/match/${MATCH_PSTATS}`;
const PHONE_LS = { width: 896, height: 414 };
const TABLET_LS = { width: 1194, height: 834 };
const PORTRAIT = { width: 414, height: 896 };

test.describe('Stage 4.3 — MatchPage review landscape rail', () => {
  test('phone-landscape hero ≥95% + rail-left; tablet collapses; portrait unchanged', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // Fixture sanity: review mode (no ?scout param) renders the heatmap.
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + url);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });
    const pBox = await canvas.boundingBox();
    expect(pBox.height).toBeLessThan(PORTRAIT.height * 0.7); // portrait: inline, points below

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

    // PORTRAIT again: unchanged stack (inline heatmap, capped height).
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(400);
    const pBox2 = await canvas.boundingBox();
    expect(pBox2.height).toBeLessThan(PORTRAIT.height * 0.7);
  });
});
