// PPT self-log wizard smoke — drives the 5-step point-logging wizard end-to-end
// (Step1 Breakout → Step2 Variant → Step3 Shots → Step4 Outcome → Step5 Summary →
// SAVE) and asserts the selfReport PERSISTS via the app's own read path
// (getTodaysSelfReports → flat /workspaces/{slug}/selfReports). This is the
// SAFETY NET for the premium wizard re-skin: the core logging path writes real
// user data, so a UI break that drops the save must fail this spec.
//
// Steps are driven by stable `data-testid`s on the choice elements (the re-skin
// MUST preserve them): ppt-breakout-{positionName}, ppt-variant-{slug},
// ppt-shots-skip, ppt-outcome-{slug}, ppt-save.
//
// Fixture (seed-emulator.cjs): SELFLOG_WS — a player-role account linked to a
// player on TEAM_SELFLOG with a LIVE training (TRN_SELFLOG) on the base layout
// (base-demo carries one bunker, "Center"). Isolated → no shared-state contamination.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFLOG_ACCOUNT, SELFLOG_WS, TRN_SELFLOG, PLAYER_SELFLOG } from './fixtures.js';

test.describe('PPT self-log wizard', () => {
  test('drive Step1→Summary→save → selfReport persists + reads back', async ({ page }) => {
    await login(page, SELFLOG_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), SELFLOG_WS);

    // Baseline — no selfReports persisted for this player yet today.
    const before = await page.evaluate(
      pid => window.__pbtest.todaysSelfReports(pid),
      PLAYER_SELFLOG,
    );
    expect(before).toBe(0);

    // Enter the wizard directly — WizardHost resolves the training from
    // teamTrainings + the base layout (bunkers) from useLayouts.
    await page.goto(`/#/player/log/wizard?trainingId=${TRN_SELFLOG}`);

    // Step 1 — breakout bunker (the base layout's "Center").
    await page.getByTestId('ppt-breakout-Center').click({ timeout: 15000 });
    // Step 2 — a non-skip variant → routes through Step 3.
    await page.getByTestId('ppt-variant-ze-strzelaniem').click();
    // Step 3 — advance with no shots (skip-within-step → shots: []).
    await page.getByTestId('ppt-shots-skip').click();
    // Step 4 — alive → routes straight to Step 5 (no 4b reason cascade).
    await page.getByTestId('ppt-outcome-alive').click();
    // Step 5 — save.
    await page.getByTestId('ppt-save').click();

    // Read-back — the point persisted to Firestore via the REAL createSelfReport
    // write path (not just the local offline queue).
    await expect.poll(
      () => page.evaluate(pid => window.__pbtest.todaysSelfReports(pid), PLAYER_SELFLOG),
      { timeout: 10000 },
    ).toBe(1);
  });
});
