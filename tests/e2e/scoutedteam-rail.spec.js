// e2e — ScoutedTeam landscape = REPORT-FIRST CanvasRailLayout (§118 + §118.1).
// Report screen → field + rail SHARE width (no §116 strip): the rail breathes, the
// report column never clips/squeezes, every rail zone is independently collapsible,
// and the field is the residual letterbox (still promotable on tap → coordinate
// guardrail must survive). Portrait unchanged.
// Fixture: TRN_PSTATS (base layout WITH fieldImage) — scouted Team Alpha + a point.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_PSTATS, TEAM_A, WS } from './fixtures.js';

const url = `#/tournament/${TRN_PSTATS}/team/${TEAM_A}`;
const TABLET_LS = { width: 1194, height: 834 };
const PORTRAIT = { width: 414, height: 896 };

test.describe('ScoutedTeam report-first rail', () => {
  test('tablet-landscape: report-first split (rail breathes, no strip, field residual); Breakouts header no overflow; portrait unchanged', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // PORTRAIT: capped hero, report stacked below (unchanged).
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + url);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });
    expect((await canvas.boundingBox()).height).toBeLessThan(PORTRAIT.height * 0.7);

    // TABLET-LANDSCAPE: report-first → NO §116 strip; rail breathes; field on the right.
    await page.setViewportSize(TABLET_LS);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('rail-strip-back')).toHaveCount(0); // report-first never strips
    const report = page.getByTestId('scouted-report-column');
    await expect(report).toBeVisible();
    expect((await report.boundingBox()).width).toBeGreaterThan(200); // breathes (was strip/200)
    expect((await canvas.boundingBox()).x).toBeGreaterThan(200);      // rail left, field right

    // Breakouts "survival" header cell no longer overflows its column (widened + nowrap). RED before.
    const surv = page.getByTestId('breakouts-col-surv');
    await expect(surv).toBeVisible();
    const cellOverflow = await surv.evaluate(el => el.scrollWidth - el.clientWidth);
    expect(cellOverflow).toBeLessThanOrEqual(1);

    // PORTRAIT again: unchanged stack.
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(400);
    expect((await canvas.boundingBox()).height).toBeLessThan(PORTRAIT.height * 0.7);
  });

  // The rail scrolls as one unit (zones + report) and each zone collapses independently
  // (NOT an accordion). Expanding a zone never squeezes the report column.
  test('zones collapse independently; expanding a zone never squeezes the report column', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.setViewportSize(TABLET_LS);
    await page.goto('/' + url);
    const report = page.getByTestId('scouted-report-column');
    await expect(report).toBeVisible({ timeout: 20000 });
    const heightOf = async () => (await report.boundingBox()).height;

    // Isolate folded by default → no player rows; report has real estate.
    await expect(page.locator('[data-testid^="rail-item-"]')).toHaveCount(0);
    expect(await heightOf()).toBeGreaterThan(220);

    // Expand Isolate (14 players) → report column STILL has its full content height
    // (the rail scrolls as one unit; the column is content-height). RED before §118.
    await page.getByTestId('rail-isolate-toggle').click();
    await expect(page.locator('[data-testid^="rail-item-"]').first()).toBeVisible();
    expect(await heightOf()).toBeGreaterThan(220);

    // Independent collapse (not accordion): Scope open, Layers folded; toggling one
    // never touches the other.
    const scope = page.getByTestId('rail-scope-toggle');
    const layers = page.getByTestId('rail-layers-toggle');
    await expect(scope).toHaveAttribute('aria-expanded', 'true');
    await expect(layers).toHaveAttribute('aria-expanded', 'false');
    await expect(layers).toContainText('3'); // active-layer count pill while collapsed
    await scope.click();
    await expect(scope).toHaveAttribute('aria-expanded', 'false');
    await expect(layers).toHaveAttribute('aria-expanded', 'false'); // unaffected
  });

  // Coordinate guardrail in the report-first field (the residual letterbox on the
  // right): a coach-draw at the canvas CENTER persists a stroke whose normalized
  // coords land near center — the tap transform survives the share-width reflow.
  // Restores annotations after (shared serial emulator state).
  test('report-first field: coach-draw at center maps to ~center (coordinate guardrail)', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
    await page.setViewportSize(TABLET_LS);
    await page.goto('/' + url);

    // phaseControl (coach kind) floats ON the report-first field.
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
