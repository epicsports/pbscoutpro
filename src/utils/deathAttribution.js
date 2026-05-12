// src/utils/deathAttribution.js
//
// Isolated attribution formula for LayoutAnalyticsPage mode='deaths' (Brief B, § 61).
// Does NOT affect § 30 kill counts elsewhere — pure function, no imports from
// playerStats.js or generateInsights.js. The existing global formula stays in
// place for PlayerStatsPage, ScoutedTeamPage, generateInsights consumers.
//
// Per Jacek 2026-05-12 mental model:
//   Per-point, two sides: defenders (rozbiegający) and shooters (strzelający).
//   For each eliminated defender, sweep the shooter side. Shooter has EITHER
//   precise shots OR zone shots (never both). Precise = within 10% of defender
//   position. Zone = shooter's zone arrays include defender's zone (per § 34.4
//   line-based dorito/snake/center). Credit splits 1/N across matched
//   attributors. N=0 leaves the elimination unattributed.

// ─── Internal constants ─────────────────────────────────────────────────────

const PRECISION_HIT_RADIUS = 0.10;
const BUNKER_THRESHOLD = 0.15;

// ─── Pure utility helpers (internal) ────────────────────────────────────────

const euclidean = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const isNonEmpty = (arr) => Array.isArray(arr) && arr.length > 0;
const unique = (arr) => Array.from(new Set(arr));

// Tolerant accessor for slot-keyed collections. Firestore stores shots /
// quickShots / obstacleShots as objects `{"0":[...],"1":[...]}` because
// nested arrays are rejected. In-memory shapes may already be decoded
// (`[[..],[..],..]`). Accept both.
function getSlotArray(coll, slot) {
  if (!coll) return [];
  if (Array.isArray(coll)) return coll[slot] || [];
  const v = coll[String(slot)] ?? coll[slot];
  return Array.isArray(v) ? v : [];
}

// Local nearest-bunker that returns the full bunker object (not just name).
// generateInsights.findNearestBunker returns string only; we need x/y for
// shooter markers (Stage 5) and positionName for the table column (Stage 4).
function findNearestBunkerObj(pos, bunkers, threshold = BUNKER_THRESHOLD) {
  if (!pos || !bunkers?.length) return null;
  let best = null;
  let bestDist = Infinity;
  bunkers.forEach(b => {
    const dx = b.x - pos.x;
    const dy = b.y - pos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist) { bestDist = d2; best = b; }
  });
  return bestDist > threshold * threshold ? null : best;
}

// Resolve defender + shooter blocks from a point. Defender = the side losing
// players this perspective; shooter = the other side. Tolerates both
// `homeData/awayData` (current schema) and legacy `teamA/teamB` shapes.
function resolveSides(point, sideAsDefender) {
  const home = point.homeData || point.teamA || null;
  const away = point.awayData || point.teamB || null;
  return sideAsDefender === 'home'
    ? { defender: home, shooter: away }
    : { defender: away, shooter: home };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Classify a position into 'dorito' | 'center' | 'snake' using § 34.4
 * line-based thresholds (NOT the midline-based getBunkerSide in helpers.js).
 *
 * Dorito = past discoLine on the dorito half.
 * Snake  = past zeekerLine on the snake half.
 * Center = anywhere else (fallback).
 *
 * Defaults: discoLine 0.30, zeekerLine 0.80, doritoSide 'top'.
 */
export function classifyDefenderZone(pos, field) {
  if (!pos) return 'center';
  const discoLine = field?.discoLine ?? 0.30;
  const zeekerLine = field?.zeekerLine ?? 0.80;
  const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
  const isDor = doritoSide === 'top' ? pos.y < discoLine : pos.y > (1 - discoLine);
  const isSnk = doritoSide === 'top' ? pos.y > zeekerLine : pos.y < (1 - zeekerLine);
  return isDor ? 'dorito' : isSnk ? 'snake' : 'center';
}

/**
 * Compute death attribution for one side acting as defender.
 *
 * @param {Object} point — Firestore point doc with `homeData`/`awayData`
 *   (or legacy `teamA`/`teamB`). Each side block: `players[]`, `eliminations[]`,
 *   `shots`, `quickShots`, `obstacleShots`.
 * @param {Object} field — resolved field with `bunkers[]`, `discoLine`,
 *   `zeekerLine`, `doritoSide`.
 * @param {'home'|'away'} sideAsDefender — which side is the defender for this
 *   call. To capture deaths on both sides of a point, the caller invokes the
 *   helper twice (once per side) and merges results.
 *
 * @returns {Object}
 *   {
 *     eliminations: Array<{
 *       defenderSlot: number,                 // 0..4
 *       defenderPos: { x, y },
 *       defenderBunker: { positionName, x, y, side?, type? } | null,
 *       defenderZone: 'dorito'|'center'|'snake',
 *       attributors: Array<{
 *         shooterSlot: number,
 *         shooterPos: { x, y },
 *         shooterBunker: bunkerObj | null,
 *         mode: 'precise' | 'zone',
 *       }>,
 *       shareEach: number,                    // 1/attributors.length, or 0
 *     }>,
 *     killCreditsByShooter: Map<shooterSlot, number>,
 *   }
 */
export function computeDeathAttribution(point, field, sideAsDefender = 'home') {
  const { defender, shooter } = resolveSides(point, sideAsDefender);
  const results = { eliminations: [], killCreditsByShooter: new Map() };
  if (!defender || !shooter) return results;

  const defPlayers = defender.players || [];
  const defElims = defender.eliminations || [];
  const shotPlayers = shooter.players || [];
  const bunkers = field?.bunkers || [];

  for (let D = 0; D < 5; D++) {
    if (!defElims[D]) continue;
    const defenderPos = defPlayers[D];
    if (!defenderPos) continue; // no scouted position → can't attribute

    const defenderZone = classifyDefenderZone(defenderPos, field);
    const defenderBunker = findNearestBunkerObj(defenderPos, bunkers, BUNKER_THRESHOLD);

    const attributors = [];
    for (let S = 0; S < 5; S++) {
      const shooterPos = shotPlayers[S];
      if (!shooterPos) continue;

      const preciseShots = getSlotArray(shooter.shots, S);
      const hasPrecise = isNonEmpty(preciseShots);

      if (hasPrecise) {
        // (a) Precise: any shot within PRECISION_HIT_RADIUS of defender position
        let matched = false;
        for (const shot of preciseShots) {
          if (!shot) continue;
          if (euclidean(shot, defenderPos) < PRECISION_HIT_RADIUS) {
            attributors.push({
              shooterSlot: S,
              shooterPos,
              shooterBunker: findNearestBunkerObj(shooterPos, bunkers, BUNKER_THRESHOLD),
              mode: 'precise',
            });
            matched = true;
            break;
          }
        }
        // Dev sanity: shooter with both precise + zone entries shouldn't happen.
        // Treat as precise-only (per Jacek). Warn in dev so we notice if data drifts.
        try {
          if (typeof import.meta !== 'undefined' && import.meta.env?.DEV && !matched) {
            const zones = unique([
              ...getSlotArray(shooter.quickShots, S),
              ...getSlotArray(shooter.obstacleShots, S),
            ]);
            if (zones.length > 0) {
              // eslint-disable-next-line no-console
              console.warn('[deathAttribution] Shooter slot', S, 'has precise + zone shots; precise-only per § 61 spec.');
            }
          }
        } catch (_e) { /* import.meta unavailable in test/node env */ }
      } else {
        // (b) Zone: shooter's zone arrays include defender's zone
        const zones = unique([
          ...getSlotArray(shooter.quickShots, S),
          ...getSlotArray(shooter.obstacleShots, S),
        ]);
        if (zones.includes(defenderZone)) {
          attributors.push({
            shooterSlot: S,
            shooterPos,
            shooterBunker: findNearestBunkerObj(shooterPos, bunkers, BUNKER_THRESHOLD),
            mode: 'zone',
          });
        }
      }
    }

    const share = attributors.length > 0 ? 1 / attributors.length : 0;
    for (const att of attributors) {
      const prev = results.killCreditsByShooter.get(att.shooterSlot) || 0;
      results.killCreditsByShooter.set(att.shooterSlot, prev + share);
    }

    results.eliminations.push({
      defenderSlot: D,
      defenderPos,
      defenderBunker,
      defenderZone,
      attributors,
      shareEach: share,
    });
  }

  return results;
}

/**
 * Display formatter for fractional kill credits.
 *
 *   0          → '0'
 *   1, 2, 3    → '1', '2', '3'
 *   0.5, 1.5   → '0.5', '1.5'
 *   2.0 (rare) → '2'    (trailing .0 trimmed)
 *
 * Trims the trailing zero so multi-attributor cells stay compact in narrow
 * table rows and badge cells.
 */
export function formatKills(n) {
  if (n == null || Number.isNaN(n)) return '0';
  if (n === 0) return '0';
  if (Number.isInteger(n)) return String(n);
  const fixed = n.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

// ─── Manual test cases (documented expected outputs per Stage 1 acceptance) ─
//
// No test runner is wired in this repo, so the helper documents three
// scenarios inline. To execute, run `node --input-type=module -e "..."` or
// drop a temporary script in /tmp; the cases are pure-function reproducible.
//
// Case 1 — single precise attribution
//   point = {
//     homeData: {
//       players: [{x:0.20, y:0.20}, ...],
//       eliminations: [true, false, false, false, false],
//     },
//     awayData: {
//       players: [{x:0.80, y:0.20}, null, null, null, null],
//       shots:   { '0': [{x:0.21, y:0.21}] },   // within 10% of (0.20, 0.20)
//     },
//   };
//   field = { bunkers: [], discoLine: 0.30, zeekerLine: 0.80, doritoSide: 'top' };
//   computeDeathAttribution(point, field, 'home')
//     → eliminations: [{ defenderSlot:0, defenderZone:'dorito',
//                        attributors:[{shooterSlot:0, mode:'precise'}],
//                        shareEach: 1 }]
//     → killCreditsByShooter: { 0 → 1 }
//
// Case 2 — zone split (2 shooters → 0.5 each)
//   point = {
//     homeData: {
//       players: [{x:0.50, y:0.85}, ...],          // y > zeekerLine → snake zone
//       eliminations: [true, false, false, false, false],
//     },
//     awayData: {
//       players: [{x:0.7,y:0.5},{x:0.7,y:0.5},null,null,null],
//       quickShots: { '0': ['snake'], '1': ['snake'] },
//       // no precise shots → falls through to zone branch
//     },
//   };
//   computeDeathAttribution(point, field, 'home')
//     → eliminations: [{ defenderSlot:0, defenderZone:'snake',
//                        attributors: [{slot:0, mode:'zone'}, {slot:1, mode:'zone'}],
//                        shareEach: 0.5 }]
//     → killCreditsByShooter: { 0 → 0.5, 1 → 0.5 }
//
// Case 3 — unattributed (defender died, no shooter matched)
//   point = {
//     homeData: {
//       players: [{x:0.50, y:0.50}],
//       eliminations: [true, false, false, false, false],
//     },
//     awayData: {
//       players: [{x:0.7, y:0.5}],
//       quickShots: { '0': ['dorito'] },        // shooter aimed at dorito,
//                                                // defender is in CENTER zone
//     },
//   };
//   computeDeathAttribution(point, field, 'home')
//     → eliminations: [{ defenderSlot:0, defenderZone:'center',
//                        attributors:[], shareEach: 0 }]
//     → killCreditsByShooter: {} (empty)
//
// Case 4 — formatKills sanity
//   formatKills(0)    === '0'
//   formatKills(1)    === '1'
//   formatKills(2.5)  === '2.5'
//   formatKills(0.5)  === '0.5'
//   formatKills(1.0)  === '1'      // trailing .0 trimmed
//   formatKills(NaN)  === '0'
//   formatKills(null) === '0'
