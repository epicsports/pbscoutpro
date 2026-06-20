// Stage 1 PARITY GATE — golden-master for the MatchPage capture orchestration.
//
// Drives the REAL capture path (the emulator-only `window.__pbCapture` probe in
// MatchPage exposes the genuine handlers + routing seam) over the STAGE0 §4
// battery: place → menu(runner/shoot/zone/bump/hit/reason) → precise shot, across
// ALL stages (break/settle/mid/endgame), BOTH teams (A/B), + outcome. After each
// step it snapshots the DETERMINISTIC draft tree (the raw draft fully determines
// the persisted shape modulo savePoint's random slotIds/meta — untouched by the
// extraction). The snapshots are the golden.
//
// Use: pre-extraction run with CAPTURE_GOLDEN_WRITE=1 records the golden; every
// run thereafter (incl. post-extraction) asserts byte-identical. FIRST MISMATCH
// ⇒ STOP and re-plan (the non-negotiable). The point UI/save path is unchanged by
// the extraction, so the same battery must reproduce the same draft tree.
//
// SCOPE NOTE: the manual field-flip pill (inline onClick in MatchPage render, not
// an extracted handler) mutates the draft through the SAME `setDraft` seam the
// battery exercises everywhere; it stays in MatchPage verbatim, so it is covered
// transitively, not driven here.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, TRN, MATCH, TEAM_A } from './fixtures.js';

const GOLDEN = path.join(process.cwd(), 'tests/e2e/golden/capture-parity.json');
const scoutUrl = `#/tournament/${TRN}/match/${MATCH}?scout=${TEAM_A}&mode=new`;

// Call a probe driver, then wait for the resulting re-render (v increment) so the
// next read/driver sees committed state.
async function act(page, method, args = []) {
  const v0 = await page.evaluate(() => window.__pbCapture?.v ?? 0);
  await page.evaluate(([m, a]) => window.__pbCapture[m](...a), [method, args]);
  await page.waitForFunction(v => (window.__pbCapture?.v ?? 0) > v, v0, { timeout: 6000 });
}
async function snap(page, label, out) {
  out.push({ label, state: await page.evaluate(() => window.__pbCapture.state()) });
}

test('capture orchestration golden-master (draft tree byte-identical)', async ({ page }) => {
  test.setTimeout(90000);
  await login(page, TEST_ACCOUNT);
  await page.evaluate(s => window.__pbtest?.setWorkspace?.(s), WS).catch(() => {});
  await page.goto('/' + scoutUrl);
  // Wait for the FULL scout render (probe published with real handlers).
  await page.waitForFunction(() => typeof window.__pbCapture?.placePlayer === 'function', { timeout: 25000 });

  const out = [];

  // ── TEAM A · BREAK ──
  await act(page, 'switchStage', ['break']);
  await act(page, 'setActiveTeam', ['A']);
  await act(page, 'placePlayer', [{ x: 0.20, y: 0.30 }]); await snap(page, 'A.break.place1', out);
  await act(page, 'placePlayer', [{ x: 0.40, y: 0.50 }]); await snap(page, 'A.break.place2', out);
  await act(page, 'placePlayer', [{ x: 0.60, y: 0.70 }]); await snap(page, 'A.break.place3', out);
  await act(page, 'toolbarAction', ['runner', 1]);        await snap(page, 'A.break.runner', out);
  await act(page, 'toolbarAction', ['shoot', 0]);
  await act(page, 'toggleQuickZone', ['dorito', 'band']); await snap(page, 'A.break.zoneBand', out);
  await act(page, 'toggleQuickZone', ['zoneA', 'callout']); await snap(page, 'A.break.zoneCallout', out);
  await act(page, 'placeShot', [0, { x: 0.50, y: 0.20 }]); await snap(page, 'A.break.shot', out);
  await act(page, 'toolbarAction', ['late', 2]);          await snap(page, 'A.break.bump', out);
  await act(page, 'toolbarAction', ['hit', 0]);           await snap(page, 'A.break.hit', out);

  // ── TEAM A · SETTLE (positions carry; reason radial applies) ──
  await act(page, 'switchStage', ['settle']);             await snap(page, 'A.settle.seeded', out);
  await act(page, 'placePlayer', [{ x: 0.30, y: 0.30 }]); await snap(page, 'A.settle.place', out);
  await act(page, 'toolbarAction', ['hit', 0]);           await snap(page, 'A.settle.hit', out);
  await act(page, 'setElimReason', [0, 'gunfight']);      await snap(page, 'A.settle.reason', out);

  // ── TEAM A · MID ──
  await act(page, 'switchStage', ['mid']);                await snap(page, 'A.mid.seeded', out);
  await act(page, 'placeShot', [1, { x: 0.40, y: 0.40 }]); await snap(page, 'A.mid.shot', out);

  // ── TEAM A · ENDGAME ──
  await act(page, 'switchStage', ['endgame']);            await snap(page, 'A.endgame.seeded', out);
  await act(page, 'placePlayer', [{ x: 0.70, y: 0.70 }]); await snap(page, 'A.endgame.place', out);

  // ── TEAM B · BREAK (per-team routing seam) ──
  await act(page, 'switchStage', ['break']);
  await act(page, 'setActiveTeam', ['B']);                await snap(page, 'B.break.start', out);
  await act(page, 'placePlayer', [{ x: 0.25, y: 0.35 }]); await snap(page, 'B.break.place1', out);
  await act(page, 'placePlayer', [{ x: 0.45, y: 0.55 }]); await snap(page, 'B.break.place2', out);
  await act(page, 'toolbarAction', ['shoot', 0]);
  await act(page, 'toggleQuickZone', ['snake', 'band']);  await snap(page, 'B.break.zone', out);
  await act(page, 'removePlayer', [1]);                   await snap(page, 'B.break.remove', out);

  // ── OUTCOME ──
  await act(page, 'setOutcome', ['win_a']);               await snap(page, 'outcome.set', out);

  if (process.env.CAPTURE_GOLDEN_WRITE === '1') {
    fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
    fs.writeFileSync(GOLDEN, JSON.stringify(out, null, 2));
    // eslint-disable-next-line no-console
    console.log(`[capture-parity] golden written: ${out.length} steps → ${GOLDEN}`);
  } else {
    expect(fs.existsSync(GOLDEN), 'golden fixture must exist (run with CAPTURE_GOLDEN_WRITE=1 first)').toBe(true);
    const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
    expect(out).toEqual(golden);
  }
});
