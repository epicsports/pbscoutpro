// e2e — Hitability icon-segment tab row (Jacek direction 2026-06-11, brief §B).
// Runs against the Firebase emulator (see playwright.emulator.config.js).
//
// Acceptance (the icon-segment pattern):
//   - the ACTIVE tab shows icon + full label (label has real width)
//   - INACTIVE tabs are icon-only (label collapsed to ~0 width)
//   - switching modes MOVES the label to the newly-active tab
//   - every tab keeps a ≥44px touch target even when icon-only (§27)
//
// Fail-first: on the pre-change rail every tab rendered its full text label at
// flex:1 and there was no `hit-mode-label-*` element at all, so the width
// assertions below are RED until the icon-segment switcher lands.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, hitabilityUrl } from './fixtures.js';

const PORTRAIT = { width: 414, height: 896 };

async function labelWidth(page, m) {
  const box = await page.getByTestId(`hit-mode-label-${m}`).boundingBox();
  return box ? box.width : 0;
}

test.describe('Hitability icon-segment tabs (§B)', () => {
  test('active = icon+label, inactive = icon-only, switching moves the label, ≥44px', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + hitabilityUrl);
    await expect(page.getByTestId('hit-mode-config')).toBeVisible({ timeout: 20000 });

    // Default active = config → its label is shown; track/sum labels are collapsed.
    await expect.poll(() => labelWidth(page, 'config')).toBeGreaterThan(10);
    expect(await labelWidth(page, 'track')).toBeLessThan(2);
    expect(await labelWidth(page, 'sum')).toBeLessThan(2);

    // Every tab keeps a ≥44px touch target even when icon-only.
    for (const m of ['config', 'track', 'sum']) {
      const box = await page.getByTestId(`hit-mode-${m}`).boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }

    // Switch → the label MOVES to the newly-active tab; the old one collapses.
    await page.getByTestId('hit-mode-track').click();
    await expect(page.getByTestId('hit-mode-track')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => labelWidth(page, 'track')).toBeGreaterThan(10);
    await expect.poll(() => labelWidth(page, 'config')).toBeLessThan(2);
  });
});
