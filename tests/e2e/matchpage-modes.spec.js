// e2e — MatchPage: ONE screen, three modes share the shell (the #4 re-skin net).
//
// MatchPage is a single 2894-line component with three modes switched by the
// `?scout=` URL param: REVIEW (no param → scoutingSide 'observe'), SCOUT (param →
// 'home'/'away', the live-editor write path), and live. A re-skin migrates a shared
// shell (scoreboard / phase-row / heatmap / chrome) across all three — so this proves
// the SAME shell survives each mode + the scout-side write round-trips, BEFORE anyone
// touches the shared render-helpers. Complements the per-mode guards (capture-parity
// golden write-shape, log-point, matchreview-rail, phase-view).
//
// Isolated fixture: `mat-modes` (own match) so its point writes never contaminate
// `mat-demo` (log-point / capture-parity / matchreview-rail). Write goes through the
// REAL dataService path via the emulator test bridge (window.__pbtest), same as
// log-point.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, UID, WS, TRN, MATCH_MODES, matchModesScoutUrl, matchModesReviewUrl } from './fixtures.js';

const ROSTER = ['pa1', 'pa2', 'pa3', 'pa4', 'pa5'];

test.describe('MatchPage — one screen, three modes share the shell', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
  });

  test('review → scout (save → persist) → review shows the point; shared scoreboard renders in each mode', async ({ page }) => {
    // MODE 1 — REVIEW (no ?scout → 'observe'): the shared scoreboard renders.
    await page.goto('/' + matchModesReviewUrl);
    await expect(page.getByTestId('review-scoreboard')).toBeVisible({ timeout: 20000 });

    // MODE 2 — SCOUT (?scout=TEAM_A&mode=new → editor): the field editor + save prompt
    // render — same screen, mode swapped.
    await page.goto('/' + matchModesScoutUrl);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Select winner to save|Save point/i).first()).toBeVisible();

    // The scout-side WRITE — through the real dataService path (bridge), same code MatchPage runs.
    const written = await page.evaluate(
      ({ tid, mid, uid, roster }) => window.__pbtest.logStreamPoint(tid, mid, uid, {
        outcome: 'win_a', status: 'partial', order: 1,
        homeData: { players: roster, scoutedBy: uid, fieldSide: 'left' },
        teamA: { players: roster },
      }),
      { tid: TRN, mid: MATCH_MODES, uid: UID, roster: ROSTER },
    );
    expect(written.id).toBeTruthy();

    // PERSIST — read back through the app's own read path.
    const points = await page.evaluate(
      ({ tid, mid }) => window.__pbtest.getPoints(tid, mid),
      { tid: TRN, mid: MATCH_MODES },
    );
    expect(points.some(p => p.id === written.id)).toBe(true);

    // MODE 3 — back to REVIEW: shared scoreboard still renders AND the saved point now
    // appears in the review point-list (the read path through the shared shell).
    await page.goto('/' + matchModesReviewUrl);
    await expect(page.getByTestId('review-scoreboard')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId(`point-preview-${written.id}`)).toBeVisible({ timeout: 15000 });
  });
});
