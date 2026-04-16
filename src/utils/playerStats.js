import { findNearestBunker, computeKillCredit } from './generateInsights';

/**
 * Player stats — derive per-player performance metrics from scouted points.
 *
 * A "playerPoint" is a normalized record for one point where the target
 * player was on the field:
 *   {
 *     matchId, pointId, tournamentId,
 *     teamData,    // the side's team data (players/assignments/eliminations/...)
 *     playerSlot,  // 0..4 — which slot the player occupied
 *     isWin,       // did the scouted team win this point?
 *   }
 *
 * Spec: DESIGN_DECISIONS.md § 24.
 */

/**
 * Extract the slot (0..4) that `playerId` occupies in `assignments`, or -1.
 */
export function findPlayerSlot(assignments, playerId) {
  if (!assignments || !playerId) return -1;
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i] === playerId) return i;
  }
  return -1;
}

/**
 * Classify a 0..1 position into a named zone based on the layout field lines
 * and dorito side. Returns strings like "Dorito 1", "Snake 50", "Center base".
 */
export function classifyPosition(pos, field) {
  if (!pos) return 'Unknown';
  const disco = field?.discoLine ?? 0.3;
  const zeeker = field?.zeekerLine ?? 0.7;
  const doritoSide = field?.doritoSide || field?.layout?.doritoSide || 'top';

  const isDorito = doritoSide === 'top' ? pos.y < disco : pos.y > zeeker;
  const isSnake = doritoSide === 'top' ? pos.y > zeeker : pos.y < disco;

  // Depth along x axis (own base = 0, field center = 0.5)
  const depth = pos.x > 0.5 ? 'deep' : pos.x > 0.3 ? 'mid' : 'base';

  if (isDorito) {
    if (depth === 'deep') return 'Dorito 50';
    if (depth === 'mid') return 'Dorito 1';
    return 'Dorito base';
  }
  if (isSnake) {
    if (depth === 'deep') return 'Snake 50';
    if (depth === 'mid') return 'Snake 1';
    return 'Snake base';
  }
  if (depth === 'deep') return 'Center 50';
  if (depth === 'mid') return 'Center 1';
  return 'Center base';
}

/**
 * Compute per-player stats over a list of normalized playerPoints.
 *
 * @param {Array<Object>} playerPoints — normalized records (see top comment)
 * @param {Object} field — resolved field info, for zone classification
 * @returns {{
 *   played: number,
 *   wins: number,
 *   winRate: number|null,
 *   survivalRate: number|null,
 *   positions: Array<{ zone: string, count: number, pct: number }>,
 * }}
 */
export function computePlayerStats(playerPoints, field) {
  let played = 0, wins = 0, survived = 0, totalKills = 0;
  const positionCounts = {};
  const bunkerCounts = {};
  const deathBunkerCounts = {}; // bunker where they tend to get eliminated
  const causeCounts = {};       // break/gunfight/przebieg/faja/kara/unknown
  let causeTotal = 0;            // points where we know the cause
  let deathTotal = 0;            // total eliminations recorded
  const breakShotCounts = { dorito: 0, center: 0, snake: 0 };
  const obstacleShotCounts = { dorito: 0, center: 0, snake: 0 };
  let breakShotTotal = 0, obstacleShotTotal = 0;
  const bunkers = field?.layout?.bunkers || field?.bunkers || [];

  playerPoints.forEach(pp => {
    const { teamData, isWin, playerSlot } = pp;
    if (playerSlot == null || playerSlot < 0) return;
    played++;
    if (isWin) wins++;

    // Survival: not eliminated
    const wasEliminated = !!teamData?.eliminations?.[playerSlot];
    if (!wasEliminated) survived++;
    else {
      deathTotal++;
      // Cause of death (from live point tracker; legacy points have no causes)
      const cause = teamData?.eliminationCauses?.[playerSlot];
      if (cause) {
        causeCounts[cause] = (causeCounts[cause] || 0) + 1;
        causeTotal++;
      }
      // Death bunker — nearest bunker to elimination position
      const elimPos = teamData?.eliminationPositions?.[playerSlot];
      if (elimPos && bunkers.length) {
        const dLabel = findNearestBunker(elimPos, bunkers);
        if (dLabel) deathBunkerCounts[dLabel] = (deathBunkerCounts[dLabel] || 0) + 1;
      }
    }

    // Kill attribution — build shape that computeKillCredit expects
    const rawQsAll = teamData?.quickShots;
    const rawOsAll = teamData?.obstacleShots;
    const rawShAll = teamData?.shots;
    const killPt = {
      quickShots: Array.isArray(rawQsAll) ? rawQsAll : [0,1,2,3,4].map(i => rawQsAll?.[String(i)] || rawQsAll?.[i] || []),
      obstacleShots: Array.isArray(rawOsAll) ? rawOsAll : [0,1,2,3,4].map(i => rawOsAll?.[String(i)] || rawOsAll?.[i] || []),
      shots: Array.isArray(rawShAll) ? rawShAll : [0,1,2,3,4].map(i => rawShAll?.[String(i)] || rawShAll?.[i] || []),
      opponentEliminations: pp.opponentEliminations || [],
      opponentPlayers: pp.opponentPlayers || [],
      opponentEliminationPositions: pp.opponentEliminationPositions || [],
    };
    totalKills += computeKillCredit(playerSlot, killPt, field);

    // Position classification based on starting position
    const pos = teamData?.players?.[playerSlot];
    if (pos) {
      const zone = classifyPosition(pos, field);
      positionCounts[zone] = (positionCounts[zone] || 0) + 1;

      // Nearest bunker
      const bLabel = findNearestBunker(pos, bunkers);
      if (bLabel) bunkerCounts[bLabel] = (bunkerCounts[bLabel] || 0) + 1;
    }

    // Break shots (handle both array and Firestore object format)
    const rawQs = teamData?.quickShots;
    const qs = Array.isArray(rawQs) ? (rawQs[playerSlot] || []) : (rawQs?.[String(playerSlot)] || rawQs?.[playerSlot] || []);
    if (qs.length) {
      qs.forEach(z => { if (breakShotCounts[z] !== undefined) { breakShotCounts[z]++; breakShotTotal++; } });
    }

    // Obstacle shots (handle both formats)
    const rawOs = teamData?.obstacleShots;
    const os = Array.isArray(rawOs) ? (rawOs[playerSlot] || []) : (rawOs?.[String(playerSlot)] || rawOs?.[playerSlot] || []);
    if (os.length) {
      os.forEach(z => { if (obstacleShotCounts[z] !== undefined) { obstacleShotCounts[z]++; obstacleShotTotal++; } });
    }
  });

  // Most common bunker
  const bunkerEntries = Object.entries(bunkerCounts).sort((a, b) => b[1] - a[1]);
  const topBunker = bunkerEntries[0] || null;
  const deathBunkerEntries = Object.entries(deathBunkerCounts).sort((a, b) => b[1] - a[1]);
  const causeEntries = Object.entries(causeCounts).sort((a, b) => b[1] - a[1]);

  return {
    played,
    wins,
    losses: played - wins,
    winRate: played > 0 ? Math.round((wins / played) * 100) : null,
    survivalRate: played > 0 ? Math.round((survived / played) * 100) : null,
    kills: totalKills,
    killsPerPoint: played > 0 ? Math.round((totalKills / played) * 100) / 100 : 0,
    deathsTotal: deathTotal,
    // Bunker breakdown — where they BREAK (starting position)
    topBunker: topBunker ? { name: topBunker[0], count: topBunker[1], pct: Math.round((topBunker[1] / played) * 100) } : null,
    bunkers: bunkerEntries.map(([name, count]) => ({ name, count, pct: Math.round((count / played) * 100) })),
    // Death bunker breakdown — where they GET KILLED
    deathBunkers: deathTotal > 0
      ? deathBunkerEntries.map(([name, count]) => ({ name, count, pct: Math.round((count / deathTotal) * 100) }))
      : [],
    // Cause-of-death breakdown — only filled in for points scouted via Live Point Tracker
    causes: causeTotal > 0
      ? causeEntries.map(([id, count]) => ({ id, count, pct: Math.round((count / causeTotal) * 100) }))
      : [],
    causesKnown: causeTotal,
    // Break shot pattern
    breakShots: breakShotTotal > 0 ? {
      dorito: Math.round((breakShotCounts.dorito / breakShotTotal) * 100),
      center: Math.round((breakShotCounts.center / breakShotTotal) * 100),
      snake: Math.round((breakShotCounts.snake / breakShotTotal) * 100),
      total: breakShotTotal,
    } : null,
    // Obstacle shot pattern
    obstacleShots: obstacleShotTotal > 0 ? {
      dorito: Math.round((obstacleShotCounts.dorito / obstacleShotTotal) * 100),
      center: Math.round((obstacleShotCounts.center / obstacleShotTotal) * 100),
      snake: Math.round((obstacleShotCounts.snake / obstacleShotTotal) * 100),
      total: obstacleShotTotal,
    } : null,
    // Position breakdown
    positions: Object.entries(positionCounts)
      .map(([zone, count]) => ({ zone, count, pct: Math.round((count / played) * 100) }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Given raw points from a single match plus the home/away scouted team ids,
 * yield normalized playerPoints for the target player across the match.
 */
export function buildPlayerPointsFromMatch({ points, match, playerId }) {
  const out = [];
  points.forEach(pt => {
    const homeData = pt.homeData || pt.teamA;
    const awayData = pt.awayData || pt.teamB;
    const homeSlot = findPlayerSlot(homeData?.assignments, playerId);
    const awaySlot = findPlayerSlot(awayData?.assignments, playerId);
    if (homeSlot >= 0) {
      out.push({
        matchId: match.id,
        pointId: pt.id,
        teamData: homeData,
        playerSlot: homeSlot,
        isWin: pt.outcome === 'win_a',
        outcome: pt.outcome,
        // Opponent data for kill attribution
        opponentEliminations: awayData?.eliminations || [],
        opponentPlayers: awayData?.players || [],
      });
    }
    if (awaySlot >= 0) {
      out.push({
        matchId: match.id,
        pointId: pt.id,
        teamData: awayData,
        playerSlot: awaySlot,
        isWin: pt.outcome === 'win_b',
        outcome: pt.outcome,
        opponentEliminations: homeData?.eliminations || [],
        opponentPlayers: homeData?.players || [],
      });
    }
  });
  return out;
}
