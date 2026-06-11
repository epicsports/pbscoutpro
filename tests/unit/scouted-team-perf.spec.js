// PERF investigation (§1) — measure the ScoutedTeamPage aggregation pipeline in
// isolation to find what hangs scouted-team ~55s on stress data. Times every
// useMemo'd function the page runs on render, scaled across N points, so the
// hottest function AND its complexity (linear vs super-linear) are visible.
// Run: npx playwright test --config playwright.unit.config.js scouted-team-perf
import { test } from '@playwright/test';
import {
  generateInsights, generateCounters, computeShotTargets, computeCalloutZoneTargets,
  computeTacticalSignals, computeBigMoves, computeBreakSurvival, computeSideTendency,
  computeTopHeroes,
} from '../../src/utils/generateInsights.js';
import { computeCoachingStats } from '../../src/utils/coachingStats.js';

// ── stress-shaped synthetic data ──────────────────────────────────────────
const NPLAYERS = 48;                 // stress seed: 48 players
const PLAYERS = Array.from({ length: NPLAYERS }, (_, i) => ({
  id: `p${i}`, name: `Player Łćź ${i}`, number: i, bunker: `B${i % 8}`, position: 'front',
}));
const ROSTER = PLAYERS.map(p => p.id);
const ZONES = Array.from({ length: 8 }, (_, i) => `z${i}`);
const FIELD = {
  bunkers: Array.from({ length: 8 }, (_, i) => ({
    id: `b${i}`, masterId: `b${i}`, x: 0.1 + (i % 4) * 0.25, y: i < 4 ? 0.3 : 0.7,
    positionName: `B${i}`, name: `B${i}`, shape: 'can',
  })),
  zones: ZONES.map((z, i) => ({ id: z, name: z, x: 0.1 + (i % 4) * 0.25, y: i < 4 ? 0.3 : 0.7 })),
  discoLine: 0.3, zeekerLine: 0.8, doritoSide: 'top',
};
const rnd = (seed) => { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };
function slot5(fn) { return Array.from({ length: 5 }, (_, i) => fn(i)); }
function makePoint(idx, r) {
  const pos = () => ({ x: r(), y: r() });
  const side = slot5(() => pos());
  const tags = slot5(() => (r() > 0.4 ? [ZONES[Math.floor(r() * 8)]] : []));
  const kf = (stage) => ({
    stage, players: slot5(() => pos()), bumpStops: slot5(() => pos()),
    eliminations: slot5(() => r() > 0.5), runners: slot5(() => r() > 0.7),
    assignments: slot5(() => ROSTER[Math.floor(r() * NPLAYERS)]),
    zoneShots: slot5(() => (r() > 0.5 ? [ZONES[Math.floor(r() * 8)]] : [])),
    quickShots: slot5(() => []),
  });
  return {
    matchId: `m${idx % 3}`, outcome: r() > 0.5 ? 'win' : 'loss', fieldSide: 'left',
    players: side, bumpStops: slot5(() => pos()), eliminations: slot5(() => r() > 0.5),
    eliminationPositions: slot5(() => pos()), runners: slot5(() => r() > 0.7),
    assignments: slot5(() => ROSTER[Math.floor(r() * NPLAYERS)]),
    shots: slot5(() => (r() > 0.4 ? [{ x: r(), y: r(), isKill: r() > 0.6 }] : [])),
    quickShots: slot5(() => []), obstacleShots: slot5(() => []),
    zoneShots: tags, zoneObstacleShots: slot5(() => (r() > 0.6 ? [ZONES[Math.floor(r() * 8)]] : [])),
    opponentPlayers: slot5(() => pos()), opponentEliminations: slot5(() => r() > 0.5),
    timeline: [kf('settle'), kf('mid')],
  };
}
function makePoints(n, seed = 7) { const r = rnd(seed); return Array.from({ length: n }, (_, i) => makePoint(i, r)); }

const FNS = [
  ['computeCoachingStats', (pts) => computeCoachingStats(pts, FIELD)],
  ['generateInsights',     (pts, stats) => generateInsights(stats, pts, FIELD, ROSTER, 'pl')],
  ['computeShotTargets',   (pts) => computeShotTargets(pts, FIELD)],
  ['computeCalloutZoneTargets', (pts) => computeCalloutZoneTargets(pts, FIELD)],
  ['computeTacticalSignals', (pts) => computeTacticalSignals(pts, FIELD, PLAYERS)],
  ['computeBigMoves',      (pts) => computeBigMoves(pts, FIELD)],
  ['computeBreakSurvival', (pts) => computeBreakSurvival(pts, FIELD)],
  ['computeSideTendency',  (pts) => computeSideTendency(pts, FIELD)],
  ['computeTopHeroes',     (pts) => computeTopHeroes(pts, ROSTER, PLAYERS, FIELD, 5)],
];

function timeFn(fn, pts, stats) {
  const t0 = performance.now();
  let out, err = null;
  try { out = fn(pts, stats); } catch (e) { err = e.message; }
  return { ms: +(performance.now() - t0).toFixed(1), err, out };
}

test('scouted-team aggregation perf — per function × N', () => {
  for (const N of [26, 60, 120]) {
    const pts = makePoints(N);
    const stats = computeCoachingStats(pts, FIELD); // generateInsights needs it
    const rows = [];
    for (const [name, fn] of FNS) {
      const { ms, err } = timeFn(fn, pts, stats);
      rows.push(`    ${name.padEnd(26)} ${String(ms).padStart(9)} ms${err ? '  ERR: ' + err : ''}`);
    }
    console.log(`\n=== N=${N} points (${NPLAYERS} players, 8 bunkers, 8 zones, +settle/mid kf) ===\n${rows.join('\n')}`);
  }
});
