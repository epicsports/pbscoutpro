// e2e — §B phase view on MatchPage review (mockup-6, 2026-06-12).
//
// Fixture: TRN_PHASE / MATCH_PHASE — pt-ph1 carries timeline[] (settle + mid
// keyframes with moved positions + per-stage quickShots), pt-ph2 is keyframe-#0
// only. Isolated (no other spec reads it).
//
// B2 scope rule (fail-first): the phase segments + ▶ operate on the CURRENT
// hero scope — the aggregate OR the selected preview point. The preview-point
// test was RED on pre-fix code (preview mapping stripped `timeline[]`, so a
// previewed point could never animate past its first phase).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, matchPhaseReviewUrl } from './fixtures.js';

const PORTRAIT = { width: 414, height: 896 };

// Three canvas snapshots ~500ms apart; animation ⇒ at least one differs.
async function canvasSamples(page) {
  const snap = () => page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? c.toDataURL() : null;
  });
  const s1 = await snap();
  await page.waitForTimeout(500);
  const s2 = await snap();
  await page.waitForTimeout(500);
  const s3 = await snap();
  return [s1, s2, s3];
}

test.describe('§B phase view — preview scope (B2)', () => {
  test('previewed point with timeline[] animates through phases', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + matchPhaseReviewUrl);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });

    // Admin first-login role-migration nudge overlays the page — dismiss it.
    const rolesNudge = page.getByRole('button', { name: /^(Zrobię to później|I'll do it later)$/ });
    if (await rolesNudge.isVisible().catch(() => false)) await rolesNudge.click();

    // Select the timeline-bearing point as preview. Center it first — the row
    // can sit under the sticky bottom-action gradient, which intercepts taps.
    const previewCell = page.getByTestId('point-preview-pt-ph1');
    await previewCell.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await previewCell.click();

    // Start playback.
    await page.getByTestId('phase-play').click();

    const samples = await canvasSamples(page);
    expect(samples[0]).toBeTruthy();
    const allEqual = samples[0] === samples[1] && samples[1] === samples[2];
    expect(allEqual, 'previewed point must animate across its phases').toBe(false);
  });
});
