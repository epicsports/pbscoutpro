// e2e #7 — Hitability responsive (Canvas/Tool archetype pilot, § 112 / §113).
// Runs against the Firebase emulator (see playwright.emulator.config.js).
//
// This spec drives the REAL component + REAL coordinate path (NOT the bridge) —
// the whole point is that the canvas tap-transform survives the orientation
// reflow. The bridge is used ONLY to count the resulting hits (the app's own
// fetchHitabilityHits read path). Acceptance reproduced here:
//   - portrait renders the STACK (no rotate-to-landscape gate)
//   - landscape MAXIMIZES the field to ~100dvh with ALL chrome in the LEFT rail
//     (nothing above/below the field) — phone-size AND desktop-size (the desktop
//     activation that the old !isDesktop gate broke, §113 fix)
//   - a track-mode tap on the seeded target counts (+1, persists)
//   - tap-AFTER-rotate / AFTER-desktop-resize still maps to the correct target
//   - reload survives
//
// Note (intentional): the desktop-size check is an in-test viewport switch, not a
// separate Playwright project — a project entry would re-run the WHOLE suite at
// 1920×1080 for no benefit to the other specs.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, LAYOUT, TRN_HIT, HIT_TGT_POS, hitabilityUrl } from './fixtures.js';

const PORTRAIT = { width: 414, height: 896 };
const LANDSCAPE = { width: 896, height: 414 };       // phone-size landscape
const DESKTOP_LS = { width: 1920, height: 1080 };    // desktop-size landscape (D2)

const setupBridge = async (page) => {
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
};
const hitCount = (page) => page.evaluate(
  ({ l, t }) => window.__pbtest.hitabilityHitCount(l, t), { l: LAYOUT, t: TRN_HIT },
);

// DETERMINISTIC reflow settle (replaces fixed sleeps — the ci-flake root cause:
// under full-suite load the ResizeObserver hadn't settled at a fixed 350ms, so the
// measured rect was mid-transition and the tap missed the target). Poll the canvas
// boundingBox until two consecutive reads match (±1px) → the fit has settled. This
// does NOT weaken the coordinate-mapping assertion: we still tap the live-measured
// point and assert exact hit counts; we only wait for the rect to STOP moving first.
async function waitForStableBox(locator, { tries = 25, gap = 80 } = {}) {
  await expect(locator).toBeVisible();
  let prev = await locator.boundingBox();
  for (let i = 0; i < tries; i++) {
    await locator.page().waitForTimeout(gap);
    const box = await locator.boundingBox();
    if (prev && box
      && Math.abs(box.x - prev.x) < 1 && Math.abs(box.y - prev.y) < 1
      && Math.abs(box.width - prev.width) < 1 && Math.abs(box.height - prev.height) < 1) {
      return box;
    }
    prev = box;
  }
  return prev;
}
// hit-count poll headroom — the write (canvas tap) → emulator → read roundtrip is
// slower under full-suite load; 5s default occasionally lost the race.
const POLL = { timeout: 15000 };

// Map the seeded target's normalized position onto the LIVE canvas rect, then
// click it. The canvas element is contain-fit to the field, so its rect IS the
// field area → (left + x*w, top + y*h). Re-measured every call, so it stays
// correct in EVERY orientation/size — that is exactly what we're proving.
async function tapTarget(page) {
  const canvas = page.locator('canvas').first();
  const box = await waitForStableBox(canvas); // deterministic post-reflow settle
  await page.mouse.click(box.x + HIT_TGT_POS.x * box.width, box.y + HIT_TGT_POS.y * box.height);
  return box;
}

// Landscape shell invariants (§113 TRUE-hero rule): field is the hero on the RIGHT
// filling ~100dvh, ALL chrome (incl. back) in the LEFT rail — nothing above/below.
async function assertLandscapeShell(page, vp) {
  const canvas = page.locator('canvas').first();
  const box = await waitForStableBox(canvas); // deterministic reflow settle
  // Nothing above/below the field: it's vertically CENTERED in the viewport (equal
  // letterbox gaps). A header above (old layout) would bias it down → unequal gaps.
  const topGap = box.y;
  const bottomGap = vp.height - (box.y + box.height);
  expect(Math.abs(topGap - bottomGap)).toBeLessThan(6);
  expect(box.x).toBeGreaterThan(150);                   // rail on the LEFT, hero field on the right
  expect(box.height).toBeGreaterThan(vp.height * 0.85); // field is the hero, fills the height (was ~70% with chrome)
  const back = page.getByTestId('hit-back');
  await expect(back).toBeVisible();                     // back nav present (functional affordance)…
  const backBox = await back.boundingBox();
  expect(backBox.x).toBeLessThan(box.x);               // …INSIDE the left rail, not above the field
}

test.describe('#7 Hitability responsive', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await setupBridge(page);
  });

  test('portrait stack → landscape hero+rail (phone + desktop) → tap counts → reload survives', async ({ page }) => {
    // ── PORTRAIT: the responsive stack renders (NOT the old rotate gate). ──
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + hitabilityUrl);
    await expect(page.getByTestId('hit-mode-track')).toBeVisible({ timeout: 20000 });

    // Baseline-RELATIVE counts (not absolute): the emulator seeds once and specs
    // run serially, so this spec must not assume a 0-hit slate — assert each tap
    // adds exactly +1 over the starting count. Still proves the coordinate mapping
    // (every tap lands on the target); just resilient to prior/seeded hits.
    const base = await hitCount(page);

    // Tracking + tap → +1 hit. The field is CAPPED (rail stacks below) — proves
    // the portrait stack, not a full-bleed canvas.
    await page.getByTestId('hit-mode-track').click();
    await expect(page.getByTestId('hit-mode-track')).toHaveAttribute('aria-pressed', 'true');
    const pBox = await tapTarget(page);
    expect(pBox.height).toBeLessThan(PORTRAIT.height * 0.7); // capped, room for the rail below
    await expect.poll(() => hitCount(page), POLL).toBe(base + 1);

    // ── PHONE LANDSCAPE: field hero ~100dvh, chrome in the LEFT rail; tap again. ──
    await page.setViewportSize(LANDSCAPE);
    await assertLandscapeShell(page, LANDSCAPE);
    await tapTarget(page);
    await expect.poll(() => hitCount(page), POLL).toBe(base + 2); // tap-after-rotate mapped to the correct target

    // ── DESKTOP LANDSCAPE (D2): the shell ACTIVATES on viewport geometry, not
    //    device class — the old !isDesktop gate left the stacked portrait here. ──
    await page.setViewportSize(DESKTOP_LS);
    await assertLandscapeShell(page, DESKTOP_LS);
    await tapTarget(page);
    await expect.poll(() => hitCount(page), POLL).toBe(base + 3); // tap-after-desktop-resize still maps

    // ── RELOAD survives (re-establish the bridge after the fresh page). ──
    await page.reload();
    await setupBridge(page);
    await expect.poll(() => hitCount(page), POLL).toBe(base + 3);
  });
});
