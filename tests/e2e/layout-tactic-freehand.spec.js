// Tactics field-shape drift fix (2026-06-16). `addLayoutTactic` was MISSING
// `freehandStrokes` from its written field shape, so creating/duplicating a
// LAYOUT tactic with a drawing silently dropped it (LayoutDetailPage.duplicateTactic
// passes freehandStrokes; the writer discarded it). `addTactic` (tournament) wrote
// it; only the layout-create path lost it. Surfaced by the ITEM-1 drawing unify.
//
// Fail-first: before the fix, the round-trip reports hasFreehand=false (dropped on
// create) → RED. After adding freehandStrokes to addLayoutTactic → true → GREEN.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, LAYOUT } from './fixtures.js';

test('addLayoutTactic preserves freehandStrokes (no drawing loss on create/duplicate)', async ({ page }) => {
  await login(page, TEST_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);

  const res = await page.evaluate(
    (layoutId) => window.__pbtest.layoutTacticFreehandRoundtrip(layoutId, {
      0: { color: '#f59e0b', size: 6, pts: [{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.2 }, { x: 0.5, y: 0.4 }] },
    }),
    LAYOUT,
  );
  expect(res.hasFreehand).toBe(true);
});
