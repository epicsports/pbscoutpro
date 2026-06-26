// e2e — MatchPage REVIEW mode landscape = the prototype `TabletLiveScoringPremium`
// + `RdLiveFieldCard` (feat/live-landscape-fieldcard, 2026-06-26). The landscape
// review uses a FIXED 372px LEFT sidebar (back · LIVE · FULL-name scoreboard ·
// FULL-name PointRow list · completeness · Zakończ mecz) + a RIGHT field panel:
// `{A} vs {B}` header + the universal field card (field + on-field "Warstwy"
// popover with 4 independent filters + the SINGLE attached PointAxisScrubber whose
// play head folds in replay). The previous rail Warstwa A/B toggle + the separate
// top phase-tabs + the "Animacja punktu" bar are all RETIRED — this spec asserts
// the popover + scrubber. Scout editor view untouched. Portrait unchanged.
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

  // Landscape field card: the attached PointAxisScrubber (phase nodes + play head)
  // under the field + the on-field "Warstwy" popover (4 independent filters wired to
  // hmVisibility). These replace the retired top phase-tabs, "Animacja punktu" bar,
  // and the rail Warstwa A/B toggle.
  test('landscape: attached scrubber (phase nodes + play head) + on-field Warstwy popover', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(TABLET_LS);
    await page.goto('/' + url);
    await expect(page.getByTestId('review-scoreboard')).toBeVisible({ timeout: 20000 });

    // Attached scrubber — Break node always present (keyframe #0) + pinned by default.
    await expect(page.getByTestId('phase-seg-break')).toBeVisible();
    await expect(page.getByTestId('phase-seg-break')).toHaveAttribute('aria-pressed', 'true');

    // The play head (folds in replay) is present on the scrubber.
    await expect(page.getByTestId('phase-play')).toBeVisible();

    // Layers → the on-field "Warstwy" popover (NOT the retired rail toggle).
    await expect(page.getByTestId('review-layer-a')).toHaveCount(0); // old Warstwa A/B toggle gone
    await expect(page.getByTestId('review-layers-btn')).toBeVisible();
    await page.getByTestId('review-layers-btn').click();
    // 4 independent per-team filters Pozycje/Strzały × A/B.
    const bShot = page.getByTestId('review-layer-bShot');
    await expect(bShot).toBeVisible();
    const before = await bShot.getAttribute('aria-pressed');
    await bShot.click();
    await expect(bShot).not.toHaveAttribute('aria-pressed', before);
  });
});
