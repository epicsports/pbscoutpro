// e2e — §B phase view on MatchPage review (mockup-6, 2026-06-12).
//
// Fixture: TRN_PHASE / MATCH_PHASE — pt-ph1 carries timeline[] (settle + mid
// keyframes with moved positions + per-stage quickShots), pt-ph2 is keyframe-#0
// only. Isolated (no other spec reads it).
//
// B2 scope rule (fail-first): the phase segments + ▶ operate on the CURRENT
// hero scope — the aggregate OR the selected preview point. The preview-point
// animate test was RED on pre-fix code (preview mapping stripped `timeline[]`,
// so a previewed point could never animate past its first phase).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, matchPhaseReviewUrl, matchupReviewUrl } from './fixtures.js';

const PORTRAIT = { width: 414, height: 896 };
const PHONE_LS = { width: 896, height: 414 };

async function openReview(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto('/' + matchPhaseReviewUrl);
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
  // Admin first-login role-migration nudge overlays the page — dismiss it.
  const rolesNudge = page.getByRole('button', { name: /^(Zrobię to później|I'll do it later)$/ });
  if (await rolesNudge.isVisible().catch(() => false)) await rolesNudge.click();
}

// Center a points-list cell first — rows can sit under the sticky
// bottom-action gradient, which intercepts taps.
async function tapPreview(page, ptId) {
  const cell = page.getByTestId(`point-preview-${ptId}`);
  await cell.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await cell.click();
}

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

const canvasSnap = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas');
  return c ? c.toDataURL() : null;
});

test.describe('§B phase view — phase row, defaults, scope', () => {
  test('phase row pins phases, applies per-phase layer defaults, §40 overrides within phase', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await openReview(page, PORTRAIT);

    // Row renders; Break pinned by default; Settle/Mid enabled (aggregate
    // scope carries both stages via pt-ph1).
    await expect(page.getByTestId('phase-play')).toBeVisible();
    await expect(page.getByTestId('phase-seg-break')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('phase-seg-settle')).toHaveAttribute('aria-disabled', 'false');
    await expect(page.getByTestId('phase-seg-mid')).toHaveAttribute('aria-disabled', 'false');

    // Pin Settle → pressed; B3 defaults keep positions+shots ON.
    await page.getByTestId('phase-seg-settle').click();
    await expect(page.getByTestId('phase-seg-settle')).toHaveAttribute('aria-pressed', 'true');
    const shotChips = page.getByRole('button', { name: /^(Strzały|Shots)$/ });
    await expect(shotChips.nth(0)).toHaveAttribute('aria-pressed', 'true');

    // B4 — in Settle the only shot layer is the direction arrows: toggling
    // Shots off for both teams must change the canvas (arrows disappear).
    const withArrows = await canvasSnap(page);
    await shotChips.nth(0).click();
    await shotChips.nth(1).click();
    await page.waitForTimeout(300);
    const withoutArrows = await canvasSnap(page);
    expect(withArrows, 'settle direction arrows must render under the Shots layer').not.toBe(withoutArrows);

    // Pin Mid → B3 defaults reset: positions ON, shots OFF.
    await page.getByTestId('phase-seg-mid').click();
    await expect(page.getByTestId('phase-seg-mid')).toHaveAttribute('aria-pressed', 'true');
    const posChips = page.getByRole('button', { name: /^(Pozycje|Positions)$/ });
    await expect(shotChips.nth(0)).toHaveAttribute('aria-pressed', 'false');
    await expect(shotChips.nth(1)).toHaveAttribute('aria-pressed', 'false');
    await expect(posChips.nth(0)).toHaveAttribute('aria-pressed', 'true');

    // §40 override WITHIN the phase: positions off in Mid…
    await posChips.nth(0).click();
    await expect(posChips.nth(0)).toHaveAttribute('aria-pressed', 'false');
    // …and switching back to Break re-applies that phase's defaults.
    await page.getByTestId('phase-seg-break').click();
    await expect(posChips.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(shotChips.nth(0)).toHaveAttribute('aria-pressed', 'true');

    // Scoreboard is a permanent resident across every phase state.
    await expect(page.getByTestId('review-scoreboard')).toBeVisible();
  });

  test('▶ plays through phases and the active segment follows; scoreboard stays', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await openReview(page, PORTRAIT);

    await page.getByTestId('phase-play').click();
    await expect(page.getByTestId('phase-play')).toHaveAttribute('aria-pressed', 'true');
    // Clock: hold 600ms → tween 1000ms → Settle. Segment must follow.
    await expect(page.getByTestId('phase-seg-settle')).toHaveAttribute('aria-pressed', 'true', { timeout: 4000 });
    await expect(page.getByTestId('review-scoreboard')).toBeVisible();

    // Tapping a segment stops playback and pins it.
    await page.getByTestId('phase-seg-break').click();
    await expect(page.getByTestId('phase-play')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('phase-seg-break')).toHaveAttribute('aria-pressed', 'true');
  });

  test('preview scope rule (B2): timeline point animates; kf#0-only point disables phases', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await openReview(page, PORTRAIT);

    // Previewed timeline-bearing point animates (fail-first RED pre-fix).
    await tapPreview(page, 'pt-ph1');
    await page.getByTestId('phase-play').click();
    const samples = await canvasSamples(page);
    expect(samples[0]).toBeTruthy();
    const allEqual = samples[0] === samples[1] && samples[1] === samples[2];
    expect(allEqual, 'previewed point must animate across its phases').toBe(false);

    // Pin Settle on the preview, then switch preview to the kf#0-only point:
    // Settle/Mid disable and the pin clamps back to Break.
    await page.getByTestId('phase-seg-settle').click();
    await tapPreview(page, 'pt-ph1'); // off
    await tapPreview(page, 'pt-ph2'); // on (no timeline)
    await expect(page.getByTestId('phase-seg-settle')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('phase-seg-mid')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('phase-seg-break')).toHaveAttribute('aria-pressed', 'true');
  });

  test('landscape: attached phase tabs + animation-bar play; End match in sidebar; portrait keeps the §B row inline', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await openReview(page, PHONE_LS);

    // TabletLiveScoringPremium 1:1 (feat/live-review-rebuild, 2026-06-25): in landscape the
    // §B phase row + float-scrubber are REPLACED by ATTACHED phase tabs (top-left of the right
    // field panel, `phase-seg-*`) + a bottom animation bar carrying the `phase-play` transport.
    // End match = the sidebar's "Zakończ mecz" gradient button (keeps `rail-primary-end`).
    // The in-rail §B row is portrait-only.
    await expect(page.getByTestId('phase-seg-break')).toBeVisible(); // attached tab (not a float)
    await expect(page.getByTestId('field-phase')).toHaveCount(0);    // float-scrubber retired
    await expect(page.getByTestId('phase-play')).toBeVisible();      // play lives in the animation bar
    await expect(page.getByTestId('review-scoreboard')).toBeVisible();
    await expect(page.getByTestId('end-match-inline')).toHaveCount(0);
    await expect(page.getByTestId('rail-primary-end')).toBeVisible();  // End match = sidebar button
    // ⋮ ActionSheet still carries End match too.
    await page.getByTestId('match-menu-btn').click();
    await expect(page.getByTestId('end-match-final-action')).toBeVisible();

    // Portrait keeps the inline §B phase row + inline destructive button (unchanged).
    await openReview(page, PORTRAIT);
    await expect(page.getByTestId('phase-play')).toBeVisible();
    await expect(page.getByTestId('end-match-inline')).toBeVisible();
  });

  // Regression guard for the TabletLiveScoringPremium rebuild: TRAINING review keeps its
  // quick-log shortcut in the new landscape sidebar scoreboard; TOURNAMENT review (the
  // prototype design) has none. (The rebuild initially dropped the training Quick CTA in
  // landscape — restored conditionally on isTraining.)
  test('landscape: training review keeps Quick CTA in sidebar; tournament has none', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(PHONE_LS);
    await page.goto('/' + matchupReviewUrl);
    await expect(page.getByTestId('review-scoreboard')).toBeVisible({ timeout: 20000 });
    const rolesNudge = page.getByRole('button', { name: /^(Zrobię to później|I'll do it later)$/ });
    if (await rolesNudge.isVisible().catch(() => false)) await rolesNudge.click();
    await expect(page.getByTestId('quick-cta-a')).toBeVisible();
    await expect(page.getByTestId('quick-cta-b')).toBeVisible();
    // Tournament review (landscape) → no Quick CTA (matches the prototype).
    await openReview(page, PHONE_LS);
    await expect(page.getByTestId('quick-cta-a')).toHaveCount(0);
  });
});
