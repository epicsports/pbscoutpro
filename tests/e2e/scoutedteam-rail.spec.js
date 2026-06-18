// e2e — ScoutedTeam landscape = FIELD-IS-KING CanvasRailLayout (§118 canon; the
// §118.1 report-first WIDTH split was REVERTED 2026-06-18 — it shrank the field
// even on wide screens). Landscape: field=HERO (fills height, aspect drives width),
// rail residual → §116 collapses to the 56px strip; report sections live in the
// strip→overlay. Portrait unchanged. (The §116 strip/overlay mechanics are covered
// by rail-collapse.spec.js; here we assert the field-is-king invariant + the
// coach-draw coordinate guardrail.) Fixture: TRN_PSTATS (base layout WITH fieldImage).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_PSTATS, TEAM_A, WS } from './fixtures.js';

const url = `#/tournament/${TRN_PSTATS}/team/${TEAM_A}`;
const TABLET_LS = { width: 1194, height: 834 };
const PORTRAIT = { width: 414, height: 896 };

test.describe('ScoutedTeam field-is-king rail', () => {
  test('tablet-landscape: field is HERO (fills height) + §116 strip; portrait capped; portrait unchanged', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // PORTRAIT: capped hero, report stacked below (unchanged).
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + url);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });
    expect((await canvas.boundingBox()).height).toBeLessThan(PORTRAIT.height * 0.7);

    // TABLET-LANDSCAPE: field-is-king → §116 strip present (rail collapsed to 56px),
    // field fills the height (hero — NOT the report-first residual letterbox). RED while report-first.
    await page.setViewportSize(TABLET_LS);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('rail-strip-back')).toBeVisible();          // rail collapsed → field is king
    expect((await canvas.boundingBox()).height).toBeGreaterThan(TABLET_LS.height * 0.78); // field fills height (hero)

    // PORTRAIT again: unchanged stack.
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(400);
    expect((await canvas.boundingBox()).height).toBeLessThan(PORTRAIT.height * 0.7);
  });

  // §118.2 — the data-confidence banner shows on screen-open and the X dismisses it
  // (per-view, not persisted). Portrait, where the report column is stacked + visible.
  test('confidence banner shows on open; X dismisses it', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + url);
    const x = page.getByTestId('scouted-confidence-dismiss');
    await expect(x).toBeVisible({ timeout: 20000 });
    await x.click();
    await expect(x).toHaveCount(0);
  });

  // §118.2 STAGE 2 — report sections are individually collapsible. Breakouts is
  // the only defaultOpen section (the headline read); every other section opens
  // collapsed so the field stays king + the report is a scannable header list.
  // Asserted in portrait, where the report column is stacked + visible.
  test('report sections collapse/expand; breakouts open by default, shots collapsed', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(PORTRAIT);
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

    // Every OTHER rendered section starts collapsed (field-is-king default). Which
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

  // Coordinate guardrail in the field-is-king canvas: a coach-draw at the canvas
  // CENTER persists a stroke whose normalized coords land near center — the tap
  // transform survives. Restores annotations after (shared serial emulator state).
  test('field: coach-draw at center maps to ~center (coordinate guardrail)', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
    await page.setViewportSize(TABLET_LS);
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
