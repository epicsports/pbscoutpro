// e2e — scouted-team loader: renders on a valid team + NEVER loads forever.
// Two fail-first guards for the 2026-06-11 scouted-team eternal-"Loading…" bug:
//   1. RENDER PATH: the demo scouted docs carry NO createdAt. Pre-fix,
//      subscribeScoutedTeams orderBy('createdAt') silently EXCLUDED them →
//      scouted=[] → ScoutedTeamPage gate (!tournament||!team) spun forever →
//      "Team Alpha" never appeared. Post-fix (client-sort, no orderBy) it renders.
//   2. ERROR STATE: an invalid scouted id must reach an explicit error state, not
//      an eternal spinner (the no-eternal-loading rule).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN, TEAM_A } from './fixtures.js';

test.describe('scouted-team loader', () => {
  test('renders a valid scouted team (createdAt-less doc still visible via client-sort)', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, `#/tournament/${TRN}/team/${TEAM_A}`);
    // Pre-fix: eternal "Loading…", this never appears → RED. Post-fix → GREEN.
    await expect(page.getByText(/Team Alpha/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('scouted-load-error')).toHaveCount(0);
  });

  test('an invalid scouted-team URL shows an error state, not an eternal spinner', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, `#/tournament/${TRN}/team/does-not-exist`);
    // Pre-fix: gate spins forever (no error text) → RED. Post-fix: resolved-but-
    // absent → error state + Retry → GREEN.
    await expect(page.getByTestId('scouted-load-error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Retry/i })).toBeVisible();
  });
});
