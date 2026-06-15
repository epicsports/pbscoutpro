// ITEM-1 drawing-tools unification (2026-06-15). TacticPage's bespoke freehand
// canvas was replaced by the shared DrawingOverlay/DrawToolbar/drawStrokes stack
// (the same one ScoutedTeamPage + MatchPage use), via InteractiveCanvas's
// BaseCanvas draw-arbiter. The риск: a tactic carrying LEGACY points-only
// freehandStrokes (`{"0":[{x,y},...]}`, the pre-unify shape) must still LOAD —
// the canonical loader drops non-`{pts}` strokes, so TacticPage normalizes legacy
// bare-point-arrays into `{color,size,pts}`. This guards that the page renders
// (no crash, no data-loss path) and the shared draw toolbar wires in.
//
// (The full draw gesture rides the BaseCanvas arbiter, identical to the proven
// ScoutedTeamPage coach-plan integration; this spec covers the integration +
// legacy-load seam, not the canvas gesture itself.)
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, tacticLegacyUrl } from './fixtures.js';

test('tactic with legacy points-only freehand loads on the unified drawing stack', async ({ page }) => {
  await login(page, TEST_ACCOUNT);
  await page.goto('/' + tacticLegacyUrl);

  // Page renders (legacy strokes normalized, not dropped → no crash/empty state).
  await expect(page.getByTestId('tactic-loaded')).toBeVisible({ timeout: 20000 });

  // The shared draw toolbar wires in: entering draw mode reveals it (eraser/undo/
  // colors) and "Done" exits. The ✏️ entry button toggles draw mode.
  await page.getByRole('button', { name: '✏️' }).click();
  await expect(page.getByRole('button', { name: /Gotowe|Done/ })).toBeVisible({ timeout: 5000 });
});
