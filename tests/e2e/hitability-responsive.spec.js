// e2e #7 — Hitability responsive (Canvas/Tool archetype pilot, § 112).
// Runs against the Firebase emulator (see playwright.emulator.config.js).
//
// This spec drives the REAL component + REAL coordinate path (NOT the bridge) —
// the whole point is that the canvas tap-transform survives the orientation
// reflow. The bridge is used ONLY to count the resulting hits (the app's own
// fetchHitabilityHits read path). Acceptance reproduced here:
//   - portrait renders the STACK (no rotate-to-landscape gate)  ← fails on the
//     pre-redesign build, which short-circuited portrait to KioskRotatePrompt
//   - landscape MAXIMIZES the field + collapses controls to an edge RAIL
//   - a track-mode tap on the seeded target counts (+1, persists)
//   - tap-AFTER-rotate still maps to the correct target (the de-risked invariant)
//   - reload survives

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, LAYOUT, TRN_HIT, HIT_TGT_POS, hitabilityUrl } from './fixtures.js';

const PORTRAIT = { width: 414, height: 896 };
const LANDSCAPE = { width: 896, height: 414 };

const setupBridge = async (page) => {
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
};
const hitCount = (page) => page.evaluate(
  ({ l, t }) => window.__pbtest.hitabilityHitCount(l, t), { l: LAYOUT, t: TRN_HIT },
);

// Map the seeded target's normalized position onto the LIVE canvas rect, then
// click it. The canvas element is contain-fit to the field, so its rect IS the
// field area → (left + x*w, top + y*h). Re-measured every call, so it stays
// correct in BOTH orientations — that is exactly what we're proving.
async function tapTarget(page) {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(350); // let the ResizeObserver settle the post-reflow fit
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + HIT_TGT_POS.x * box.width, box.y + HIT_TGT_POS.y * box.height);
  return box;
}

test.describe('#7 Hitability responsive', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await setupBridge(page);
  });

  test('portrait stack → landscape maximize+rail → tap-after-rotate counts → reload survives', async ({ page }) => {
    // ── PORTRAIT: the responsive stack renders (NOT the old rotate gate). ──
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + hitabilityUrl);
    await expect(page.getByTestId('hit-mode-track')).toBeVisible({ timeout: 20000 });

    // Tracking + tap → 1 hit. The field is CAPPED (rail stacks below) — proves
    // the portrait stack, not a full-bleed canvas.
    await page.getByTestId('hit-mode-track').click();
    await expect(page.getByTestId('hit-mode-track')).toHaveAttribute('aria-pressed', 'true');
    const pBox = await tapTarget(page);
    expect(pBox.height).toBeLessThan(PORTRAIT.height * 0.7); // capped, room for the rail below
    await expect.poll(() => hitCount(page)).toBe(1);

    // ── ROTATE to LANDSCAPE: field maximized + rail on the edge; tap again. ──
    await page.setViewportSize(LANDSCAPE);
    await expect(page.locator('canvas').first()).toBeVisible();
    const lBox = await tapTarget(page);
    expect(lBox.x).toBeGreaterThan(150); // edge rail to the LEFT (hero field on the right) — §113 approved mockup
    await expect.poll(() => hitCount(page)).toBe(2); // tap-after-rotate mapped to the correct target

    // ── RELOAD survives (re-establish the bridge after the fresh page). ──
    await page.reload();
    await setupBridge(page);
    await expect.poll(() => hitCount(page)).toBe(2);
  });
});
