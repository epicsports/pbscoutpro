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
