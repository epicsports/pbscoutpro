// e2e — ScoutedTeam = the prototype OpponentAnalysisWide / OpponentAnalysisPremium
// responsive model (feat/opponent-fieldcard, field-views-sync §2): a FIELD CARD
// (HeatmapCanvas + on-field Warstwy popover + Rysuj + attached Oś-punktu axis) +
// a RAIL (scope segment + coach tables). useWide(860): ≥860 = field card + rail
// SIDE BY SIDE (field sticky); <860 = field card ON TOP, rail below (one column).
// Replaces the prior orientation-gated CanvasRailLayout field-is-king path (the
// §116 strip / rail-strip-back is gone — there is no fixed fullscreen overlay now).
// Here we assert the responsive split + the coach-draw coordinate guardrail.
// Fixture: TRN_PSTATS (base layout WITH fieldImage).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_PSTATS, TEAM_A, WS } from './fixtures.js';

const url = `#/tournament/${TRN_PSTATS}/team/${TEAM_A}`;
const WIDE = { width: 1194, height: 834 };     // ≥860 → field + rail side by side
const NARROW = { width: 414, height: 896 };    // <860 → field on top, rail below

test.describe('ScoutedTeam field-card responsive (field-views-sync)', () => {
  test('wide: field card + rail side by side; narrow: stacked (field on top); field is a sized card, not a full-page hero', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // NARROW (<860): field card on TOP, report column BELOW (single column). The
    // field region is a sized card (~250px), well under the viewport — NOT a hero.
    await page.setViewportSize(NARROW);
    await page.goto('/' + url);
    const card = page.getByTestId('opponent-field-card');
    const report = page.getByTestId('scouted-report-column');
    await expect(card).toBeVisible({ timeout: 20000 });
    await expect(report).toBeVisible();
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    expect((await canvas.boundingBox()).height).toBeLessThan(NARROW.height * 0.7);
    // stacked: the field card sits ABOVE the report column.
    const cardBoxN = await card.boundingBox();
    const repBoxN = await report.boundingBox();
    expect(repBoxN.y).toBeGreaterThan(cardBoxN.y + cardBoxN.height - 5);

    // WIDE (≥860): the field card and the report column sit SIDE BY SIDE (the field
    // card's right edge is left of the report column's left edge). The field is a
    // sized card (~420px region), NOT a full-height hero.
    await page.setViewportSize(WIDE);
    await page.waitForTimeout(400);
    const cardBoxW = await card.boundingBox();
    const repBoxW = await report.boundingBox();
    expect(repBoxW.x).toBeGreaterThan(cardBoxW.x + cardBoxW.width - 5); // rail is to the RIGHT
    expect((await canvas.boundingBox()).height).toBeLessThan(WIDE.height * 0.78); // sized card, not hero

    // NARROW again: back to the stacked single column.
    await page.setViewportSize(NARROW);
    await page.waitForTimeout(400);
    const cardBox2 = await card.boundingBox();
    const repBox2 = await report.boundingBox();
    expect(repBox2.y).toBeGreaterThan(cardBox2.y + cardBox2.height - 5);
  });

  // §118.2 — the data-confidence banner shows on screen-open and the X dismisses it
  // (per-view, not persisted). Narrow, where the report column is stacked + visible.
  test('confidence banner shows on open; X dismisses it', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(NARROW);
    await page.goto('/' + url);
    const x = page.getByTestId('scouted-confidence-dismiss');
    await expect(x).toBeVisible({ timeout: 20000 });
    await x.click();
    await expect(x).toHaveCount(0);
  });

  // §118.2 STAGE 2 — report sections are individually collapsible. Breakouts is
  // the only defaultOpen section (the headline read); every other section opens
  // collapsed so the report is a scannable header list. Asserted narrow, where the
  // report column is stacked below the field card + visible.
  test('report sections collapse/expand; breakouts open by default, shots collapsed', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(NARROW);
    await page.goto('/' + url);
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });

    // Breakouts: defaultOpen → starts expanded; toggle closes then re-opens it.
    const breakouts = page.getByTestId('sec-breakouts-toggle');
    await expect(breakouts).toBeVisible({ timeout: 20000 });
    await expect(breakouts).toHaveAttribute('aria-expanded', 'true');
    await breakouts.click();
    await expect(breakouts).toHaveAttribute('aria-expanded', 'false');
    await breakouts.click();
    await expect(breakouts).toHaveAttribute('aria-expanded', 'true');

    // Every OTHER rendered section starts collapsed (scannable-header default). Which
    // secondary sections render is fixture-data-dependent, so assert generically:
    // take the first non-breakouts section toggle, prove it starts collapsed, then
    // expanding it works. (`additional sections` below-fold toggle is revealed first
    // so the below-fold sections are reachable too.)
    const additional = page.getByText(/additional sections|dodatkowe sekcje/i).first();
    if (await additional.count()) await additional.click();
    const collapsed = page.locator(
      '[data-testid^="sec-"][data-testid$="-toggle"]:not([data-testid="sec-breakouts-toggle"])'
    ).first();
    await expect(collapsed).toBeVisible();
    await expect(collapsed).toHaveAttribute('aria-expanded', 'false');
    await collapsed.click();
    await expect(collapsed).toHaveAttribute('aria-expanded', 'true');
  });

  // Coordinate guardrail in the field card canvas: a coach-draw at the canvas
  // CENTER persists a stroke whose normalized coords land near center — the tap
  // transform survives. Restores annotations after (shared serial emulator state).
  // Wide so the field card + attached Oś-punktu axis (field-phase) are present.
  test('field: coach-draw at center maps to ~center (coordinate guardrail)', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
    await page.setViewportSize(WIDE);
    await page.goto('/' + url);

    await expect(page.getByTestId('field-phase')).toBeVisible({ timeout: 20000 });
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(350);
    const readAnn = () => page.evaluate(
      ({ s, t, sid }) => window.__pbtest.readScouted(s, t, sid).then(d => (d ? d.annotations || null : null)),
      { s: WS, t: TRN_PSTATS, sid: TEAM_A });
    const prior = await readAnn();
    const priorCount = prior ? Object.keys(prior).length : 0;

    await page.getByLabel('Rysuj plan coacha').click();
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx - 35, cy); await page.mouse.down();
    await page.mouse.move(cx, cy, { steps: 5 });
    await page.mouse.move(cx + 35, cy, { steps: 5 });
    await page.mouse.up();
    await page.getByRole('button', { name: /^(done|gotowe)$/i }).click(); // exit → persist

    let after = null;
    await expect.poll(async () => { after = await readAnn(); return after ? Object.keys(after).length : 0; })
      .toBeGreaterThan(priorCount);
    const newKey = Object.keys(after).find(k => !prior || !(k in prior)) ?? Object.keys(after).slice(-1)[0];
    const pts = (after[newKey].pts) || [];
    expect(pts.length).toBeGreaterThan(1);
    const meanX = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const meanY = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    expect(meanX).toBeGreaterThan(0.3); expect(meanX).toBeLessThan(0.7);
    expect(meanY).toBeGreaterThan(0.3); expect(meanY).toBeLessThan(0.7);

    // RESTORE — un-contaminate the shared serial emulator state.
    await page.evaluate(({ s, t, sid, a }) => window.__pbtest.writeScouted(s, t, sid, { annotations: a }),
      { s: WS, t: TRN_PSTATS, sid: TEAM_A, a: prior });
  });
});
