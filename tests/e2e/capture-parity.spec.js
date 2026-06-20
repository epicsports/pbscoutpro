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
const GOLDEN_TACTIC = path.join(process.cwd(), 'tests/e2e/golden/capture-parity-tactic.json');
const scoutUrl = `#/tournament/${TRN}/match/${MATCH}?scout=${TEAM_A}&mode=new`;

// Call a probe driver, then wait for the resulting re-render (v increment) so the
// next read/driver sees committed state. (point probe = window.__pbCapture)
async function act(page, method, args = []) {
  const v0 = await page.evaluate(() => window.__pbCapture?.v ?? 0);
  await page.evaluate(([m, a]) => window.__pbCapture[m](...a), [method, args]);
  await page.waitForFunction(v => (window.__pbCapture?.v ?? 0) > v, v0, { timeout: 6000 });
}
async function snap(page, label, out) {
  out.push({ label, state: await page.evaluate(() => window.__pbCapture.state()) });
}
// Same, for the TACTIC probe (window.__pbCaptureTactic, Stage 2.0 rig).
async function actT(page, method, args = []) {
  const v0 = await page.evaluate(() => window.__pbCaptureTactic?.v ?? 0);
  await page.evaluate(([m, a]) => window.__pbCaptureTactic[m](...a), [method, args]);
  await page.waitForFunction(v => (window.__pbCaptureTactic?.v ?? 0) > v, v0, { timeout: 6000 });
}
async function snapT(page, label, out) {
  out.push({ label, state: await page.evaluate(() => window.__pbCaptureTactic.state()) });
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

// Stage 2.0 — the TACTIC battery: single team, ALL FIVE positional phases
// (preBreakout·breakout·settle·mid·endgame), place / runner / shoot[zone band +
// callout · precise] / bump — and NO hit/elim/reason (outcome:false). Drives the
// NEW engine branches via the emulator-only /test/capture rig, snapshots the
// single-team draft tree → its own byte-stable golden. Proves the tactic branches
// are exercised + deterministic before any editor screen exists.
test('tactic capture golden-master (single team, 5 positional phases, no outcome)', async ({ page }) => {
  test.setTimeout(60000);
  await login(page, TEST_ACCOUNT);
  await page.goto('/#/test/capture');
  await page.waitForFunction(() => typeof window.__pbCaptureTactic?.placePlayer === 'function', { timeout: 25000 });

  // outcome:false → the player action menu EXCLUDES hit/reason; keeps setup actions.
  await actT(page, 'placePlayer', [{ x: 0.2, y: 0.3 }]);
  await actT(page, 'selectPlayer', [0]);
  const menu = await page.evaluate(() => window.__pbCaptureTactic.toolbarItems());
  expect(menu).not.toContain('hit');
  expect(menu).not.toContain('reason');
  expect(menu).toEqual(expect.arrayContaining(['assign', 'runner', 'late', 'shoot', 'remove']));
  await actT(page, 'selectPlayer', [0]); // close toolbar

  const out = [];
  // ── ROOT = preBreakout ──
  await snapT(page, 'pre.place1', out);                        // (player 0 already placed)
  await actT(page, 'placePlayer', [{ x: 0.4, y: 0.5 }]);     await snapT(page, 'pre.place2', out);
  await actT(page, 'placePlayer', [{ x: 0.6, y: 0.7 }]);     await snapT(page, 'pre.place3', out);
  await actT(page, 'toolbarAction', ['runner', 1]);          await snapT(page, 'pre.runner', out);
  await actT(page, 'toolbarAction', ['shoot', 0]);
  await actT(page, 'toggleQuickZone', ['dorito', 'band']);   await snapT(page, 'pre.zoneBand', out);
  await actT(page, 'toggleQuickZone', ['zoneA', 'callout']); await snapT(page, 'pre.zoneCallout', out);
  await actT(page, 'placeShot', [0, { x: 0.5, y: 0.2 }]);    await snapT(page, 'pre.shot', out);
  await actT(page, 'toolbarAction', ['late', 2]);            await snapT(page, 'pre.bump', out);

  // ── breakout (seeds from preBreakout) ──
  await actT(page, 'switchStage', ['breakout']);             await snapT(page, 'breakout.seeded', out);
  await actT(page, 'placePlayer', [{ x: 0.3, y: 0.3 }]);     await snapT(page, 'breakout.place', out);
  // ── settle (seeds from breakout) ──
  await actT(page, 'switchStage', ['settle']);               await snapT(page, 'settle.seeded', out);
  await actT(page, 'placeShot', [1, { x: 0.4, y: 0.4 }]);    await snapT(page, 'settle.shot', out);
  // ── mid ──
  await actT(page, 'switchStage', ['mid']);                  await snapT(page, 'mid.seeded', out);
  await actT(page, 'placePlayer', [{ x: 0.7, y: 0.6 }]);     await snapT(page, 'mid.place', out);
  // ── endgame ──
  await actT(page, 'switchStage', ['endgame']);              await snapT(page, 'endgame.seeded', out);
  await actT(page, 'toolbarAction', ['runner', 0]);          await snapT(page, 'endgame.runner', out);

  if (process.env.CAPTURE_GOLDEN_WRITE === '1') {
    fs.mkdirSync(path.dirname(GOLDEN_TACTIC), { recursive: true });
    fs.writeFileSync(GOLDEN_TACTIC, JSON.stringify(out, null, 2));
    // eslint-disable-next-line no-console
    console.log(`[capture-parity] TACTIC golden written: ${out.length} steps → ${GOLDEN_TACTIC}`);
  } else {
    expect(fs.existsSync(GOLDEN_TACTIC), 'tactic golden must exist (run with CAPTURE_GOLDEN_WRITE=1 first)').toBe(true);
    const golden = JSON.parse(fs.readFileSync(GOLDEN_TACTIC, 'utf8'));
    expect(out).toEqual(golden);
  }
});
