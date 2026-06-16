// e2e — Stage 4.2: ScoutedTeam landscape = CanvasRailLayout (hero = the team
// heatmap, rail = scope pills + report sections). §116 archetype applied as-is
// (no separate design gate). Portrait unchanged.
//
// Fixture: TRN_PSTATS (base layout WITH fieldImage) has a scouted Team Alpha +
// one live match + a heatmap-bearing point — the same read-only hero fixture
// the 4.1 PlayerStats spec uses (viewport-only assertions; no writes).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_PSTATS, TEAM_A, WS } from './fixtures.js';

const url = `#/tournament/${TRN_PSTATS}/team/${TEAM_A}`;
const PHONE_LS = { width: 896, height: 414 };
const TABLET_LS = { width: 1194, height: 834 };
const PORTRAIT = { width: 414, height: 896 };

test.describe('Stage 4.2 — ScoutedTeam landscape rail', () => {
  test('phone-landscape hero ≥95% + rail-left; tablet collapses; portrait unchanged', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // Fixture sanity: the expanded heatmap (the HERO) renders for Team Alpha.
    await page.setViewportSize(PORTRAIT);
    await page.goto('/' + url);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 20000 });
    const pBox = await canvas.boundingBox();
    expect(pBox.height).toBeLessThan(PORTRAIT.height * 0.7); // portrait: inline, report below

    // PHONE-LANDSCAPE: hero fills ≥95% height + sits RIGHT of a left rail.
    await page.setViewportSize(PHONE_LS);
    await page.waitForTimeout(400);
    const lsBox = await canvas.boundingBox();
    expect(lsBox.height).toBeGreaterThan(PHONE_LS.height * 0.95);
    expect(lsBox.x).toBeGreaterThan(150); // rail on the LEFT, hero field on the right

    // TABLET-LANDSCAPE: the rail collapses to the §116 strip.
    await page.setViewportSize(TABLET_LS);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('rail-strip-back')).toBeVisible();

    // PORTRAIT again: unchanged stack (inline heatmap, capped height).
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(400);
    const pBox2 = await canvas.boundingBox();
    expect(pBox2.height).toBeLessThan(PORTRAIT.height * 0.7);
  });

  // Field View shell (reference impl) — structured rail zones + floating phaseControl
  // + semantic collapsed pins, and the coordinate guardrail: a coach-draw at the canvas
  // CENTER while COLLAPSED persists a stroke whose normalized coords land near center
  // (the tap transform survived the §116 collapse). Restores annotations after (shared
  // serial emulator state).
  test('tablet-collapse: shell elements + pins + tap-accuracy across collapse', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
    await page.setViewportSize(TABLET_LS);
    await page.goto('/' + url);

    // Collapsed shell present.
    await expect(page.getByTestId('rail-strip-back')).toBeVisible({ timeout: 20000 });
    // phaseControl (coach kind) floats ON the field — present EVEN WHEN COLLAPSED.
    await expect(page.getByTestId('field-phase')).toBeVisible();
    // GAP D — semantic layer pins in the strip.
    const posPin = page.getByTestId('rail-strip-pin-positions');
    await expect(posPin).toBeVisible();
    // Smoke-fix regressions (2026-06-16): rail-EXPAND (☰) must stay present WITH pins
    // (pins toggle layers only; scope/isolate/report need the overlay), and the draw tool
    // sits in the field-corner cluster BESIDE the phase bar (not a separate overlapping chip).
    await expect(page.getByTestId('rail-strip-expand')).toBeVisible();
    await expect(page.getByTestId('field-corner-controls').getByTestId('fv-tool-draw')).toBeVisible();
    // A pin TOGGLES in place (aria-checked flips) — it does NOT open the overlay (≠ tabs).
    const before = await posPin.getAttribute('aria-checked');
    await posPin.click();
    await expect(posPin).not.toHaveAttribute('aria-checked', before || '');
    await expect(page.getByTestId('rail-overlay-panel')).toHaveCount(0);
    await posPin.click(); // restore layer state

    // ── TAP-ACCURACY ACROSS COLLAPSE (coordinate guardrail) ──
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(350);
    const readAnn = () => page.evaluate(
      ({ s, t, sid }) => window.__pbtest.readScouted(s, t, sid).then(d => (d ? d.annotations || null : null)),
      { s: WS, t: TRN_PSTATS, sid: TEAM_A });
    const prior = await readAnn();
    const priorCount = prior ? Object.keys(prior).length : 0;

    // Enter coach draw mode (the floating "Rysuj" chip rides the canvas even collapsed).
    await page.getByLabel('Rysuj plan coacha').click();
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    // Short horizontal stroke through the CENTER — center maps to ~0.5 regardless of
    // any aspect-fit letterboxing, so it's a clean transform probe.
    await page.mouse.move(cx - 35, cy); await page.mouse.down();
    await page.mouse.move(cx, cy, { steps: 5 });
    await page.mouse.move(cx + 35, cy, { steps: 5 });
    await page.mouse.up();
    await page.getByRole('button', { name: /^(done|gotowe)$/i }).click(); // exit → persist

    // A NEW stroke persisted, and its points sit in the central field band.
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
