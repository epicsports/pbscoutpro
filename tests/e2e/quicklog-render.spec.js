// e2e regression — QuickLogView player-pick must render without crashing.
// Guards the 2026-06-13 "can't find variable t" crash: PlayerTileGrid is a
// module-level sub-component that called t('quicklog_win_label') without its
// own useLanguage() hook (added by the i18n regression-sweep). Entering the
// training quick-log flow (matchup → Quick ›) threw a ReferenceError.
// This path had NO prior e2e coverage (log-point covers MatchPage, not QLV).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_TRAIN_REVIEW, MATCHUP_REVIEW } from './fixtures.js';

test('training matchup → Quick log opens the player-pick grid (no t-crash)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await login(page, TEST_ACCOUNT);
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto(`/#/training/${TRN_TRAIN_REVIEW}/matchup/${MATCHUP_REVIEW}`);
  // The training scoreboard shows the Quick › CTA (STEP 3) — tap it → QuickLogView.
  await expect(page.getByTestId('quick-cta-a')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('quick-cta-a').click();
  // PlayerTileGrid renders the squad roster — a player tile proves it didn't throw.
  await expect(page.getByText(/A Player/).first()).toBeVisible({ timeout: 10000 });
  // No ReferenceError surfaced (pre-fix: "Can't find variable: t").
  expect(errors.join(' | ')).not.toMatch(/can't find variable|is not defined|t is not/i);
});
