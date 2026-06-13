// e2e — §H3 no-eternal-loading rollout (LayoutDetailPage, TrainingSetupPage,
// TrainingSquadsPage, TrainingResultsPage, PlayerStatsPage).
//
// Pattern: 12s loadTimedOut ceiling + resolved-but-absent → explicit error state
// with Retry button. Already shipped on ScoutedTeamPage / TeamDetailPage /
// TacticPage / MatchPage.
//
// Acceptance per page-family:
//   1. RENDER PATH: a valid ID renders the expected content (regression guard).
//   2. ERROR STATE: an invalid ID reaches an explicit error state (data-testid)
//      with a Retry button — never an eternal spinner.
//
// Fail-first: pre-H3 the gates were bare `if (loading) return <Skeleton>` /
// `if (!entity) return <EmptyState "⏳ not found">` with no 12s ceiling and no
// resolved-but-absent branch → test 2 RED until the guard lands.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import {
  TEST_ACCOUNT,
  TRN,
  LAYOUT,
  ROSTER_A_IDS,
} from './fixtures.js';

// TRN_TRAIN_REVIEW is the stable seeded training used by the rail spec.
// It's a training doc (workspaces/demo-ws/trainings/trn-train-review).
const TRAINING_ID = 'trn-train-review';
// pa1 is a seeded global player (players/pa1 — Team Alpha slot 0).
const PLAYER_ID = ROSTER_A_IDS[0]; // 'pa1'

// ─── LayoutDetailPage ────────────────────────────────────────────────────────

test.describe('LayoutDetailPage loader (§H3)', () => {
  test('renders a valid layout', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, `#/layout/${LAYOUT}`);
    // The demo layout is named "Demo Field" in the seed.
    await expect(page.getByText(/Demo Field/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('layout-load-error')).toHaveCount(0);
  });

  test('an invalid layout URL shows an error state, not an eternal spinner', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, '#/layout/does-not-exist');
    await expect(page.getByTestId('layout-load-error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Retry|Ponów/i })).toBeVisible();
  });
});

// ─── Training pages ──────────────────────────────────────────────────────────

test.describe('TrainingSetupPage loader (§H3)', () => {
  test('renders a valid training setup page', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, `#/training/${TRAINING_ID}/setup`);
    // Setup page shows "Who's at practice?" heading or the team name.
    await expect(
      page.getByText(/Who.s at practice|Kto jest na treningu/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('training-load-error')).toHaveCount(0);
  });

  test('an invalid training setup URL shows an error state, not an eternal spinner', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, '#/training/does-not-exist/setup');
    await expect(page.getByTestId('training-load-error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Retry|Ponów/i })).toBeVisible();
  });
});

test.describe('TrainingSquadsPage loader (§H3)', () => {
  test('renders a valid training squads page', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, `#/training/${TRAINING_ID}/squads`);
    // SquadEditor renders even with empty squads; the page header shows "Squads".
    await expect(
      page.getByText(/Squads|Składy/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('training-load-error')).toHaveCount(0);
  });

  test('an invalid training squads URL shows an error state, not an eternal spinner', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, '#/training/does-not-exist/squads');
    await expect(page.getByTestId('training-load-error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Retry|Ponów/i })).toBeVisible();
  });
});

test.describe('TrainingResultsPage loader (§H3)', () => {
  test('renders a valid training results page', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, `#/training/${TRAINING_ID}/results`);
    // Results page shows "Results" / "Wyniki" heading.
    await expect(
      page.getByText(/Results|Wyniki/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('training-load-error')).toHaveCount(0);
  });

  test('an invalid training results URL shows an error state, not an eternal spinner', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, '#/training/does-not-exist/results');
    await expect(page.getByTestId('training-load-error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Retry|Ponów/i })).toBeVisible();
  });
});

// ─── PlayerStatsPage ─────────────────────────────────────────────────────────

test.describe('PlayerStatsPage loader (§H3)', () => {
  test('renders a valid player stats page', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, `#/player/${PLAYER_ID}/stats`);
    // pa1's name is "A Player 1" in the seed (playersFor('A','pa') template).
    await expect(
      page.getByText(/A Player 1|PLAYER STATS|Player Stats/i).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('player-load-error')).toHaveCount(0);
  });

  test('an invalid player URL shows an error state, not an eternal spinner', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.evaluate(h => { window.location.hash = h; }, '#/player/does-not-exist/stats');
    await expect(page.getByTestId('player-load-error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Retry|Ponów/i })).toBeVisible();
  });
});
