import { findNearestBunker, computeKillCredit } from './generateInsights';
import { getBunkerSide } from './helpers';

// Brief D Item (b): map PPT outcome slugs (alive | elim_break |
// elim_midgame | elim_endgame) to canonical death-stage keys per
// § 54. Used when player self-logged via KIOSK (storage uses PPT slugs)
// and stats need stage information for cause aggregation.
const PPT_OUTCOME_TO_STAGE = {
  alive: 'alive',
  elim_break: 'break',
  elim_midgame: 'inplay',
  elim_endgame: 'endgame',
};

// Brief D Item (b): inverse of REASON_CANONICAL_TO_PPT in resolver.
// Self-log writes PPT-slug deathReason values; convert back to canonical
// for causeCounts aggregation that already uses canonical keys (per
// CAUSE_META in PlayerStatsPage).
const PPT_REASON_TO_CANONICAL = {
  gunfight: 'gunfight',
  przejscie: 'przejscie',
  faja: 'faja',
  'na-przeszkodzie': 'na_przeszkodzie',
  'nie-wiem': 'nie_wiem',
  inne: 'inaczej',
};

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
  // § 54 canonical reason keys: gunfight/przejscie/faja/na_przeszkodzie/za_kare/nie_wiem/inaczej.
  // Legacy data with `eliminationCauses` (przebieg/kara/unknown/break) is normalized
  // on read via deathTaxonomy.normalizeLegacyReason. Legacy 'break' as reason
  // resolves to {reason: null, inferredStage: 'break'} — i.e. no reason was
  // recorded, just a stage hint — so it won't increment causeCounts.
  const causeCounts = {};
  let causeTotal = 0;            // points where we know the cause
  let deathTotal = 0;            // total eliminations recorded
  const breakShotCounts = { dorito: 0, center: 0, snake: 0 };
  const obstacleShotCounts = { dorito: 0, center: 0, snake: 0 };
  let breakShotTotal = 0, obstacleShotTotal = 0;
  const bunkers = field?.layout?.bunkers || field?.bunkers || [];
  const doritoSide = field?.doritoSide || field?.layout?.doritoSide || 'top';

  // § 59.4: per-bunker survival aggregation. Replaces the previous
  // bunkerCounts shape (Map<name, count>) with Map<name, {played, survived}>
  // so each break bunker reports its survival rate alongside the played
  // count. Helper isolates the increment so both coach-tap and self-log
  // breakout paths share the same logic.
  const bumpBunker = (name, didSurvive) => {
    if (!name) return;
    const entry = bunkerCounts[name] || { played: 0, survived: 0 };
    entry.played += 1;
    if (didSurvive) entry.survived += 1;
    bunkerCounts[name] = entry;
  };

  playerPoints.forEach(pp => {
    const { teamData, isWin, playerSlot, selfLog, selfShots } = pp;
    if (playerSlot == null || playerSlot < 0) return;
    played++;
    if (isWin) wins++;

    // Survival: not eliminated. Brief D Item (b) — coach-side
    // eliminations[slot] is primary signal; if coach didn't mark elim
    // but player self-logged via KIOSK with non-alive outcome, count
    // that. Coach data still wins when both present (observed > self-
    // reported per § 35 self-log honesty principle).
    const wasEliminated = !!teamData?.eliminations?.[playerSlot];
    const selfLoggedElim = !wasEliminated && selfLog?.outcome && selfLog.outcome !== 'alive';
    const pointSurvived = !wasEliminated && !selfLoggedElim;
    if (pointSurvived) survived++;
    else if (selfLoggedElim) {
      deathTotal++;
      // Self-log deathReason → canonical for causeCounts merge
      if (selfLog.deathReason) {
        const canonical = PPT_REASON_TO_CANONICAL[selfLog.deathReason] || null;
        if (canonical) {
          causeCounts[canonical] = (causeCounts[canonical] || 0) + 1;
          causeTotal++;
        }
      }
      // Self-log doesn't carry an elimination XY position, so no
      // deathBunkerCounts increment from self-log.
    } else {
      deathTotal++;
      // § 54 Cause of death — read new schema (eliminationReasons) first,
      // fall back to legacy eliminationCauses with normalize. Both produce
      // canonical keys (przejscie/za_kare/nie_wiem/...) when present.
      let canonicalReason = teamData?.eliminationReasons?.[playerSlot] || null;
      if (!canonicalReason && teamData?.eliminationCauses?.[playerSlot]) {
        // legacy fallback — inline normalize (avoids cyclical dep into
        // deathTaxonomy.js for this hot-path callsite; keep mapping local)
        const raw = teamData.eliminationCauses[playerSlot];
        canonicalReason = raw === 'przebieg' ? 'przejscie'
          : raw === 'kara'     ? 'za_kare'
          : raw === 'unknown'  ? 'nie_wiem'
          : (raw === 'gunfight' || raw === 'faja') ? raw
          : null; // 'break' was a stage-as-reason; no canonical reason
      }
      if (canonicalReason) {
        causeCounts[canonicalReason] = (causeCounts[canonicalReason] || 0) + 1;
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

      // Nearest bunker — § 59.4 also captures per-bunker survival.
      const bLabel = findNearestBunker(pos, bunkers);
      bumpBunker(bLabel, pointSurvived);
    } else if (selfLog?.breakout && bunkers.length) {
      // Brief D Item (b): coach didn't tap a position (Quick Log path,
      // not full FieldCanvas scouting). Use self-logged breakout bunker
      // for position aggregation. Look up bunker by name → classify
      // its xy into zone for positionCounts; bunkerCounts increments
      // by name directly (no nearestBunker lookup needed — name is
      // canonical from self-log).
      const sb = bunkers.find(b => (b.positionName || b.name) === selfLog.breakout);
      if (sb) {
        const zone = classifyPosition(sb, field);
        positionCounts[zone] = (positionCounts[zone] || 0) + 1;
      }
      bumpBunker(selfLog.breakout, pointSurvived);
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

    // Brief D Item (b): self-log shots from KIOSK wizard. Each shot
    // has targetBunker (name) — look up xy in layout to classify zone
    // via getBunkerSide. Counts as 'break' phase (KIOSK self-log
    // doesn't distinguish break vs obstacle phase per § 35.4 single-
    // shot list contract). Adds to existing coach quickShots/
    // obstacleShots aggregation (union — typically complementary, not
    // duplicative; coach observes external, player self-reports own).
    if (Array.isArray(selfShots) && selfShots.length > 0 && bunkers.length > 0) {
      selfShots.forEach(s => {
        if (!s?.targetBunker) return;
        const tb = bunkers.find(b => (b.positionName || b.name) === s.targetBunker);
        if (!tb) return;
        const side = getBunkerSide(tb.x, tb.y, doritoSide);
        if (breakShotCounts[side] !== undefined) {
          breakShotCounts[side]++;
          breakShotTotal++;
        }
      });
    }
  });

  // Most common bunker — § 59.4: each entry is now {played, survived};
  // sort by `played` desc to keep the top-N semantics unchanged.
  const bunkerEntries = Object.entries(bunkerCounts).sort((a, b) => b[1].played - a[1].played);
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
    // Bunker breakdown — where they BREAK (starting position).
    // § 59.4: each entry now exposes survived + survivalRate; `count`
    // alias preserved for any consumer reading the legacy field name
    // (zero hits in tree as of 2026-05-01 STEP 0 audit, but cheap to keep).
    topBunker: topBunker
      ? {
          name: topBunker[0],
          count: topBunker[1].played,
          played: topBunker[1].played,
          survived: topBunker[1].survived,
          survivalRate: topBunker[1].played > 0
            ? Math.round((topBunker[1].survived / topBunker[1].played) * 100)
            : null,
          pct: Math.round((topBunker[1].played / played) * 100),
        }
      : null,
    bunkers: bunkerEntries.map(([name, e]) => ({
      name,
      count: e.played,
      played: e.played,
      survived: e.survived,
      survivalRate: e.played > 0 ? Math.round((e.survived / e.played) * 100) : null,
      pct: Math.round((e.played / played) * 100),
    })),
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
