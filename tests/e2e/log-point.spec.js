// e2e #2 — Log a point (solo scout) → persists → reads back in review.
// Runs against the Firebase emulator (see playwright.emulator.config.js).
//
// Split deliberately:
//   - "match opens in scout mode" is a REAL assertion — it proves the seed +
//     routing + scout-editor render chain works end to end.
//   - the full place→winner→save→read-back is `test.fixme` until the FIRST
//     emulator run settles the canvas + save-sheet interaction. It could not be
//     run during authoring (no JRE in that environment → Firestore emulator
//     could not start), and the point-logging UI is canvas + bottom-sheet gated,
//     so the coordinates/selectors below MUST be verified on first run rather
//     than asserted blind. See the inline TODO.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, matchScoutUrl } from './fixtures.js';

test.describe('#2 Log a point', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNT);
  });

  test('seeded match opens in scout mode and the field editor renders', async ({ page }) => {
    await page.goto('/' + matchScoutUrl);
    // MatchPage derives scoutingSide from ?scout=team-a (=== match.teamA → home)
    // → concurrent scout editor → FieldCanvas mounts.
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
    // The save affordance is present (disabled until a winner is picked).
    await expect(page.getByText(/Select winner to save|Save point/i).first()).toBeVisible();
  });

  // TODO(first-run): settle on a Java-enabled env (CI / local with JRE).
  // Steps to implement once selectors/coords are confirmed against a live run:
  //   1. goto('/' + matchScoutUrl)
  //   2. place players: tap the FieldCanvas at N relative positions in the
  //      opponent half (use canvas.boundingBox() + relative offsets) OR drive
  //      the QuickLog path (roster grid, no canvas) if more stable.
  //   3. open the save sheet, pick the winning team (win_a/win_b), tap "Save point".
  //   4. assert read-back: review view lists the new point, AND/OR query the
  //      Firestore emulator REST endpoint
  //      GET http://127.0.0.1:8080/v1/projects/demo-pbscoutpro/databases/(default)/documents/
  //          workspaces/demo-ws/tournaments/trn-demo/matches/mat-demo/points
  //      and assert one point doc with the expected outcome + homeData.players.
  test.fixme('log a point → persists to emulator → reads back in review', async () => {
    // Intentionally unimplemented until the first emulator run (see TODO above).
  });
});
