// Coach Tactics board (rail-native) — completes the 'tactic' archetype shell.
//
// Fail-first: before the data-model change, addLayoutTactic wrote no onBoard/order
// and reorderLayoutTactics did not exist → the contract assertions go RED. After
// Stage 1 (onBoard default true + order=max+1 + reorder writeBatch + legacy-safe
// client-side read rules) → GREEN.
//
// Two layers:
//   1. DATA CONTRACT (bridge) — create on-board tactics, prove a LEGACY doc (no
//      onBoard/order) still appears on the board, reorder persists, and remove =
//      onBoard:false (library, NOT deleted) round-trips.
//   2. UI MOUNT — the /layout/:id/tactics screen mounts with its rail list + the
//      "+ New tactic" footer (canvas-pixel behaviour is device-smoke, not e2e).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, LAYOUT, BASE_LAYOUT } from './fixtures.js';

test('tactics board data contract — onBoard/order/legacy/reorder/remove round-trip', async ({ page }) => {
  await login(page, TEST_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);

  const r = await page.evaluate(
    ([slug, layoutId]) => window.__pbtest.tacticBoardRoundtrip(slug, layoutId),
    [WS, LAYOUT],
  );

  expect(r.onBoardOk).toBe(true);          // new tactics land ON the board
  expect(r.orderAscending).toBe(true);     // order = max+1 (B after A)
  expect(r.legacyOnBoard).toBe(true);      // legacy doc (no onBoard) still shows
  expect(r.reorderPersisted).toBe(true);   // drag-reorder persists
  expect(r.removedFromBoard).toBe(true);   // ✕ removes from the board
  expect(r.stillInLibrary).toBe(true);     // …but stays in the library
  expect(r.notDeleted).toBe(true);         // …and is NOT deleted
  expect(r.readded).toBe(true);            // library → board re-add works
});

test('tactics board UI mounts — rail list + “+ New tactic” footer', async ({ page }) => {
  await login(page, TEST_ACCOUNT);
  await page.setViewportSize({ width: 414, height: 896 }); // portrait
  // BASE_LAYOUT is the layout useLayouts resolves (base+overlay); LAYOUT='lay-demo'
  // is a legacy dead-twin id that only carries a tactics subcollection.
  await page.goto('/' + `#/layout/${BASE_LAYOUT}/tactics`);

  await expect(page.getByTestId('tactics-board-list')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('tactics-new')).toBeVisible();
});

// FIX 1 (present black field) + FIX 3 (edit door). Fail-first: before the present
// hero-box fix the InteractiveCanvas sat in a bare flex column with no sized box →
// the canvas measured degenerate → black field. After the fix the present field
// canvas is substantially sized. Edit door (FIX 3) opens the structured editor.
test('present mode renders a sized field + edit door opens the editor', async ({ page }) => {
  await login(page, TEST_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
  // Seed one on-board tactic on the RESOLVABLE layout so the board auto-selects it.
  await page.evaluate(id => window.__pbtest.seedLayoutTactic(id, 'Present E2E'), BASE_LAYOUT);

  await page.setViewportSize({ width: 1194, height: 834 }); // landscape (present surface)
  await page.goto('/' + `#/layout/${BASE_LAYOUT}/tactics`);

  // The seeded tactic auto-selects → the field tools (edit + present) float on the field.
  const presentEnter = page.getByTestId('tactics-present-enter');
  await expect(presentEnter).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('tactics-edit-enter')).toBeVisible();

  // FIX 1 — enter present; the field canvas must be substantially sized (NOT black/0).
  await presentEnter.click();
  await expect(page.getByTestId('tactics-present')).toBeVisible();
  const canvas = page.getByTestId('tactics-present').locator('canvas').first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(500);
  expect(box.height).toBeGreaterThan(300);

  // FIX 3 — back to the board, the edit door navigates to the structured editor.
  await page.getByTestId('tactics-present-back').click();
  await page.getByTestId('tactics-edit-enter').click();
  await expect.poll(() => page.url(), { timeout: 10000 }).toContain(`/layout/${BASE_LAYOUT}/tactic/`);
});
