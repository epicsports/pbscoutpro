// e2e #2 — Log a point (solo scout) → persists → reads back.
// Runs against the Firebase emulator (see playwright.emulator.config.js).
//
// Approach (brief-sanctioned latitude): the canvas + bottom-sheet placement is
// driven via the emulator-only test bridge (window.__pbtest) rather than brittle
// coordinate clicks. The bridge calls the REAL dataService write path
// (auto-id addPoint + coachUid/reactive-index — same as MatchPage), so the
// production write code is genuinely exercised. Assertions are primarily at the
// data layer, plus a read-back through the app's own read path + review UI.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, UID, WS, TRN, MATCH, matchScoutUrl, matchReviewUrl } from './fixtures.js';

const HOME_ROSTER = ['pa1', 'pa2', 'pa3', 'pa4', 'pa5'];

test.describe('#2 Log a point', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
  });

  test('seeded match opens in scout mode and the field editor renders', async ({ page }) => {
    await page.goto('/' + matchScoutUrl);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Select winner to save|Save point/i).first()).toBeVisible();
  });

  test('log a point → persists to emulator → reads back', async ({ page }) => {
    // WRITE via the real dataService path (bridge).
    const written = await page.evaluate(
      ({ tid, mid, uid, roster }) => window.__pbtest.logStreamPoint(tid, mid, uid, {
        outcome: 'win_a',
        status: 'partial',
        order: 1,
        homeData: { players: roster, scoutedBy: uid, fieldSide: 'left' },
        teamA: { players: roster },
      }),
      { tid: TRN, mid: MATCH, uid: UID, roster: HOME_ROSTER },
    );
    expect(written.id).toBeTruthy();
    expect(written.index).toBe(1);

    // READ-BACK via the app's own read path (dataService.getMatchPointsOnce).
    const points = await page.evaluate(
      ({ tid, mid }) => window.__pbtest.getPoints(tid, mid),
      { tid: TRN, mid: MATCH },
    );
    expect(points.length).toBe(1);
    const p = points[0];
    expect(p.coachUid).toBe(UID);
    expect(p.outcome).toBe('win_a');
    expect(p.homeData?.players).toEqual(HOME_ROSTER);
    expect(p.id).toBe(written.id); // auto-generated id round-trips

    // READ-BACK in the review UI — navigate to the match (no ?scout) and assert
    // it renders the populated review without crashing.
    await page.goto('/' + matchReviewUrl);
    await expect(page.locator('text=/Scout|Coach|Ustawienia|Settings/').first()).toBeVisible();
  });
});
