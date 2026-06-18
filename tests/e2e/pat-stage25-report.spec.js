// e2e — Point-as-Timeline Stage 2.5 (coach-report per-stage tables, fail-first).
// Two layers:
//  (1) BRIDGE — the per-stage aggregations (computeBreakSurvival / computeShotTargets
//      / computeEliminationReasons) on a CRAFTED point, asserting Break/Settle/Mid
//      produce DISTINCT numbers (the repo has no unit runner; this is the unit check
//      run in-browser where Vite imports resolve). RED before: the fns ignored stage.
//  (2) UI — on ScoutedTeamPage the global hmPhase control now drives the numeric
//      report: switching Break→Settle→Mid toggles the elim-reason breakdown to that
//      phase's captured reasons (TRN_PHASE seeds settle=gunfight, mid=penalty; Break
//      is implicit → no block). RED before: the block didn't exist + tables ignored phase.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TRN_PHASE, TEAM_A } from './fixtures.js';

const scoutedUrl = `#/tournament/${TRN_PHASE}/team/${TEAM_A}`;

const dismissNudge = async (page) => {
  const n = page.getByRole('button', { name: /^(Zrobię to później|I'll do it later|Pomiń na razie|Skip for now)$/ });
  await n.first().waitFor({ state: 'visible', timeout: 4000 }).then(() => n.first().click()).catch(() => {});
};

test.describe('PaT Stage 2.5 — per-stage report tables', () => {
  test('per-stage aggregations are stage-distinct (bridge: breakouts / shots / reasons)', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

    const field = { bunkers: [
      { positionName: 'D1', x: 0.10, y: 0.20, side: 'dorito', type: 'can' },
      { positionName: 'S50', x: 0.45, y: 0.72, side: 'snake', type: 'can' },
      { positionName: 'C50', x: 0.52, y: 0.50, side: 'center', type: 'can' },
    ] };
    // Break at D1 (dorito quickshot), Settle relocates to S50 (snake obstacle shot,
    // gunfight), Mid relocates to C50 (center shot, penalty). Each stage is distinct.
    const pt = {
      players: [{ x: 0.10, y: 0.20 }, null, null, null, null],
      eliminations: [true, false, false, false, false], eliminationTimes: [5, null, null, null, null],
      quickShots: [['dorito'], [], [], [], []], obstacleShots: [['snake'], [], [], [], []], shots: [[], [], [], [], []],
      opponentEliminations: [], opponentPlayers: [],
      timeline: [
        { stage: 'settle', players: [{ x: 0.45, y: 0.72 }, null, null, null, null], eliminations: [true, false, false, false, false], quickShots: [['snake'], [], [], [], []], eliminationReasons: ['gunfight', null, null, null, null] },
        { stage: 'mid', players: [{ x: 0.52, y: 0.50 }, null, null, null, null], eliminations: [false, false, false, false, false], quickShots: [['center'], [], [], [], []], eliminationReasons: ['penalty', null, null, null, null] },
      ],
    };
    const run = (stage) => page.evaluate(({ p, f, s }) => window.__pbtest.stage25([p], f, s), { p: pt, f: field, s: stage });

    const brk = await run('break');
    const set = await run('settle');
    const mid = await run('mid');

    // Breakouts — the held bunker follows the STAGE positions.
    expect(brk.breakouts).toContain('D1');
    expect(set.breakouts).toContain('S50');
    expect(mid.breakouts).toContain('C50');

    // Shooting bands — break = merged kf#0 (dorito+snake), settle = obstacle (snake),
    // mid = mid keyframe band (center). Distinct per stage.
    expect(brk.shots.dorito.pointsWithShot).toBe(1);
    expect(set.shots.snake.pointsWithShot).toBe(1);
    expect(set.shots.dorito.pointsWithShot).toBe(0);
    expect(mid.shots.center.pointsWithShot).toBe(1);
    expect(mid.shots.snake.pointsWithShot).toBe(0);

    // Elimination reasons — Break implicit (none), Settle gunfight, Mid penalty.
    expect(brk.reasons.total).toBe(0);
    expect(set.reasons.counts.gunfight).toBe(1);
    expect(mid.reasons.counts.penalty).toBe(1);

    // Graceful empty: a point with NO timeline → Mid shows nothing (not zeros-as-data).
    const noTl = await page.evaluate(({ p, f }) => {
      const q = { ...p, timeline: [] };
      return window.__pbtest.stage25([q], f, 'mid');
    }, { p: pt, f: field });
    expect(noTl.breakouts.length).toBe(0);
    expect(noTl.reasons.total).toBe(0);
  });

  test('global hmPhase control drives the elim-reason breakdown per phase (UI)', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    await dismissNudge(page);

    // PORTRAIT — the inline Break/Settle/Mid SegmentedControl is the portrait path;
    // landscape replaces it with the floating FieldPhaseControl (§76). The report
    // tables it governs are the same either way; portrait gives stable testids.
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto('/' + scoutedUrl);
    await dismissNudge(page);
    await expect(page.getByTestId('hm-phase-break')).toBeVisible({ timeout: 20000 });

    // Isolate is folded by default (secondary drill-down; the breakout table is the
    // priority read) — only the toggle header shows, chips are collapsed.
    await expect(page.getByTestId('isolate-toggle')).toBeVisible();

    // Break (default): implicit phase → no captured reasons → block absent.
    await expect(page.getByTestId('elim-reasons')).toHaveCount(0);

    // Settle → reason block appears with the seeded gunfight.
    await page.getByTestId('hm-phase-settle').click();
    // §118.2 field-is-king restructure — the elim-reasons section is collapsible
    // (collapsed by default) and only MOUNTS for a phase that has reasons; expand it
    // once it exists. The open state persists when switching Settle → Mid below.
    await page.getByTestId('sec-elim-reasons-toggle').click();
    await expect(page.getByTestId('elim-reasons')).toBeVisible();
    await expect(page.getByTestId('elim-reason-gunfight')).toBeVisible();
    await expect(page.getByTestId('elim-reason-penalty')).toHaveCount(0);

    // Mid → the breakdown is phase-specific: penalty now, gunfight gone.
    await page.getByTestId('hm-phase-mid').click();
    await expect(page.getByTestId('elim-reason-penalty')).toBeVisible();
    await expect(page.getByTestId('elim-reason-gunfight')).toHaveCount(0);

    // Back to Break → block gone again (one global control, coherent view).
    await page.getByTestId('hm-phase-break').click();
    await expect(page.getByTestId('elim-reasons')).toHaveCount(0);
  });
});
