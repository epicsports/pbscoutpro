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
import { TEST_ACCOUNT, WS, LAYOUT } from './fixtures.js';

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
  expect(r.legacyToBreakout).toBe(true);  // legacy flat doc → phases.breakout (Q1)
});
