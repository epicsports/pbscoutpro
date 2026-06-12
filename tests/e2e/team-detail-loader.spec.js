// e2e — no-eternal-loading rollout (arc B / §H3): TeamDetailPage gets the
// bounded-wait → error-state pattern shipped on ScoutedTeamPage 2026-06-11.
//
// Acceptance:
//   1. RENDER PATH: a valid team URL renders the team name (regression guard).
//   2. ERROR STATE: an invalid team id reaches an explicit error state with a
//      Retry button — never an eternal "Loading..." spinner.
//
// Fail-first: pre-H3 the gate was `if (!team) return <EmptyState "Loading...">`
// with no resolved-but-absent branch → test 2 RED until the guard lands.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TEAM_A } from './fixtures.js';

test.describe('team-detail loader', () => {
  test('renders a valid team', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, `#/team/${TEAM_A}`);
    await expect(page.getByText(/Team Alpha/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Couldn't load this team")).toHaveCount(0);
  });

  test('an invalid team URL shows an error state, not an eternal spinner', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, '#/team/does-not-exist');
    await expect(page.getByText(/Couldn't load this team/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Retry/i })).toBeVisible();
  });
});
