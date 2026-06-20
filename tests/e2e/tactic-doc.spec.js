// Stage 2.1 — phased tactic doc: serialize / hydrate / legacy compat.
//
// Through the REAL Firestore path (testBridge.tacticDocRoundtrip): build a tactic
// phase state, persist (schemaVersion:2 + phases via the SHARED point serializers),
// read back + hydrate, and assert: setup-side round-trip identity (players/assign/
// bumps/runners/shots/quickShots/zoneShots), result-side + legacy-RO fields DROPPED
// (elim/penalty/outcome/obstacleShots), hydrated drafts are emptyTeam-shaped, and a
// LEGACY flat doc (no schemaVersion) hydrates into phases.breakout (Q1).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, LAYOUT, BASE_LAYOUT } from './fixtures.js';

test('phased tactic doc — serialize/hydrate round-trip + result-side dropped + legacy→breakout', async ({ page }) => {
  await login(page, TEST_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);

  const r = await page.evaluate(
    ([slug, layoutId]) => window.__pbtest.tacticDocRoundtrip(slug, layoutId),
    [WS, LAYOUT],
  );

  expect(r.schemaOk).toBe(true);          // schemaVersion:2 + phases written
  expect(r.shapeOk).toBe(true);           // populated phases present, empty phase = null
  expect(r.rootRoundtrip).toBe(true);     // all setup-side fields survive the round-trip
  expect(r.settleRoundtrip).toBe(true);   // a non-root phase round-trips too
  expect(r.excludedDropped).toBe(true);   // elim/penalty/outcome/obstacleShots NOT persisted
  expect(r.hydrateDefaults).toBe(true);   // hydrated draft is emptyTeam-shaped (elim=[]/penalty='')
  expect(r.annsRoundtrip).toBe(true);     // per-phase freehand (R3) round-trips
  expect(r.legacyToBreakout).toBe(true);  // legacy flat doc → phases.breakout (Q1)
  expect(r.legacyFreehandToBreakout).toBe(true); // legacy top-level freehand → breakout annotations
});

// Stage 2.2 — the tactic editor screen mounts on the shared engine.
test('tactic editor mounts — field + 5-phase spine + save (no outcome node)', async ({ page }) => {
  await login(page, TEST_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
  // Seed a tactic on the RESOLVABLE layout (base-demo) so useLayouts finds it.
  const tacId = await page.evaluate(id => window.__pbtest.seedLayoutTactic(id, 'Editor E2E').then(r => r.id), BASE_LAYOUT);

  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto('/' + `#/layout/${BASE_LAYOUT}/tactic-edit/${tacId}`);

  await expect(page.getByTestId('tactic-editor-loaded')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('tactic-editor-save')).toBeVisible();
  // 5-phase spine, NO outcome node.
  await expect(page.getByRole('tab')).toHaveCount(5);
  await expect(page.locator('canvas').first()).toBeVisible();
});

// Bugfix — the editor keeps its chrome (header + phase spine + bottom bar), so the
// field must fit the AVAILABLE flex height, not window.innerHeight. Before the fix
// the landscape canvas was sized to the full viewport → it spilled DOWN over the
// bottom bar. After: 'fit' bounded to the measured wrapper → canvas ≤ wrapper, and
// the Save bar stays visible + un-overlapped.
test('tactic editor — field fits its slot in landscape (no spill over the bottom bar)', async ({ page }) => {
  await login(page, TEST_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
  const tacId = await page.evaluate(id => window.__pbtest.seedLayoutTactic(id, 'Fit E2E').then(r => r.id), BASE_LAYOUT);

  await page.setViewportSize({ width: 1194, height: 834 }); // tablet landscape
  await page.goto('/' + `#/layout/${BASE_LAYOUT}/tactic-edit/${tacId}`);
  await expect(page.getByTestId('tactic-editor-loaded')).toBeVisible({ timeout: 20000 });

  const canvas = page.getByTestId('tactic-editor-field').locator('canvas').first();
  await expect(canvas).toBeVisible();
  const wrapBox = await page.getByTestId('tactic-editor-field').boundingBox();
  const canvasBox = await canvas.boundingBox();
  const saveBox = await page.getByTestId('tactic-editor-save').boundingBox();

  // Canvas fits INSIDE its slot (no downward spill) …
  expect(canvasBox.height).toBeLessThanOrEqual(wrapBox.height + 1);
  expect(canvasBox.y + canvasBox.height).toBeLessThanOrEqual(saveBox.y + 1);
  // … and the Save bar is fully on-screen (not pushed below the viewport).
  expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(834 + 1);
  // The field is still substantial (didn't collapse).
  expect(canvasBox.height).toBeGreaterThan(300);
});
