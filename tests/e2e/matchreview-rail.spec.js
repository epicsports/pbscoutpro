// e2e — MatchPage REVIEW mode landscape = the prototype `TabletLiveScoringPremium`
// 1:1 (feat/live-review-rebuild, 2026-06-25). The landscape review no longer uses
// CanvasRailLayout's residual-rail + §116 collapse-strip + float-scrubber. Instead:
// a FIXED 372px LEFT sidebar (back · LIVE · scoreboard · Warstwa toggle · PointRow
// list · completeness · Zakończ mecz) + a RIGHT field panel (attached phase tabs ·
// field hero · bottom animation bar). The OLD assertions (rail-strip-back, hero
// ≥95% height, rail-overlay panel, field-phase float) targeted the retired shell —
// the design genuinely moved those elements, so this spec asserts the new structure.
// Scout editor view untouched. Portrait unchanged.
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

test.describe('MatchPage review landscape — TabletLiveScoringPremium', () => {
  test('portrait inline; landscape = fixed 372px sidebar (scoreboard) + right field panel', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // Fixture sanity: review mode (no ?scout param) renders the heatmap.
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + url);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });
    const pBox = await canvas.boundingBox();
    expect(pBox.height).toBeLessThan(PORTRAIT.height * 0.7); // portrait: inline, points below

    // PHONE-LANDSCAPE: the scoreboard lives in the LEFT sidebar; the field canvas
    // sits to its RIGHT (sidebar = 372px, so the field starts well past x>300).
    await page.setViewportSize(PHONE_LS);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('review-scoreboard')).toBeVisible();
    const sbBox = await page.getByTestId('review-scoreboard').boundingBox();
    expect(sbBox.x).toBeLessThan(372); // scoreboard in the left sidebar
    const lsBox = await canvas.boundingBox();
    expect(lsBox.x).toBeGreaterThan(300); // field panel is to the RIGHT of the sidebar

    // TABLET-LANDSCAPE: same structure (NO collapse strip — the sidebar is fixed).
    await page.setViewportSize(TABLET_LS);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('review-scoreboard')).toBeVisible();
    await expect(page.getByTestId('rail-strip-back')).toHaveCount(0); // strip retired

    // PORTRAIT again: unchanged stack (inline heatmap, capped height).
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(400);
    const pBox2 = await canvas.boundingBox();
    expect(pBox2.height).toBeLessThan(PORTRAIT.height * 0.7);
  });

  // Landscape chrome: attached phase tabs (top-left of the field panel) + the
  // Warstwa A/B segmented toggle (left sidebar) + the bottom animation bar's
  // play transport. These replace the retired float-scrubber + collapse pins.
  test('landscape: attached phase tabs, Warstwa A|B toggle, animation play transport', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(TABLET_LS);
    await page.goto('/' + url);
    await expect(page.getByTestId('review-scoreboard')).toBeVisible({ timeout: 20000 });

    // Attached phase tabs — Break is always present (keyframe #0).
    await expect(page.getByTestId('phase-seg-break')).toBeVisible();
    await expect(page.getByTestId('phase-seg-break')).toHaveAttribute('aria-pressed', 'true');

    // Warstwa A / Warstwa B segmented toggle (per-team heatmap layer).
    await expect(page.getByTestId('review-layer-a')).toBeVisible();
    await expect(page.getByTestId('review-layer-b')).toBeVisible();
    await page.getByTestId('review-layer-b').click();
    await expect(page.getByTestId('review-layer-b')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('review-layer-a')).toHaveAttribute('aria-pressed', 'false');

    // Bottom animation control bar — the play/pause transport is present.
    await expect(page.getByTestId('phase-play')).toBeVisible();
  });
});
