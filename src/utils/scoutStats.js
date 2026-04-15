/**
 * Scout statistics — aggregates scouted-by attribution across points.
 * DESIGN_DECISIONS § 33.
 *
 * Each point can have up to two sides (home/away) scouted by different users.
 * We aggregate per-user fill rates across breaks, shots, assignments, runners,
 * and eliminations, then collapse to a composite quality score.
 */

const SECTION_WEIGHTS = {
  breakPct: 0.35,
  shotPct: 0.20,
  assignPct: 0.20,
  runnerPct: 0.10,
  elimPct: 0.15,
};

function slotHasShot(data, slot) {
  const qs = data?.quickShots || {};
  const os = data?.obstacleShots || {};
  const qHit = Array.isArray(qs[String(slot)]) ? qs[String(slot)].length : 0;
  const oHit = Array.isArray(os[String(slot)]) ? os[String(slot)].length : 0;
  return qHit + oHit > 0;
}

function emptyBuckets() {
  return {
    points: 0, matches: new Set(), tournaments: new Set(),
    totalSlots: 0, placed: 0,
    nonRunners: 0, withShots: 0,
    placedForAssign: 0, assigned: 0,
    placedForRunner: 0, runnerFlagged: 0,
    placedForElim: 0, elimMarked: 0,
    firstSeen: null, lastSeen: null,
  };
}

function finalize(b, uid) {
  const pct = (a, n) => (n > 0 ? Math.round((a / n) * 100) : 0);
  const breakPct = pct(b.placed, b.totalSlots);
  const shotPct = pct(b.withShots, b.nonRunners);
  const assignPct = pct(b.assigned, b.placedForAssign);
  const runnerPct = pct(b.runnerFlagged, b.placedForRunner);
  const elimPct = pct(b.elimMarked, b.placedForElim);
  // Weighted composite — ignores sections with zero denominator.
  let weightSum = 0;
  let score = 0;
  [['breakPct', breakPct, b.totalSlots], ['shotPct', shotPct, b.nonRunners],
   ['assignPct', assignPct, b.placedForAssign], ['runnerPct', runnerPct, b.placedForRunner],
   ['elimPct', elimPct, b.placedForElim]].forEach(([k, v, denom]) => {
    if (denom > 0) {
      score += v * SECTION_WEIGHTS[k];
      weightSum += SECTION_WEIGHTS[k];
    }
  });
  const composite = weightSum > 0 ? Math.round(score / weightSum) : 0;
  return {
    uid,
    points: b.points,
    matches: b.matches.size,
    tournaments: b.tournaments.size,
    breakPct, shotPct, assignPct, runnerPct, elimPct, composite,
    firstSeen: b.firstSeen, lastSeen: b.lastSeen,
  };
}

/**
 * Tally fill rates for one scouted side and merge into bucket `b`.
 * Expects `data` = homeData or awayData; `pt` is the enclosing point.
 */
function tallySide(b, data, pt) {
  if (!data?.scoutedBy) return;
  const uid = data.scoutedBy;
  b.points++;
  if (pt.matchId) b.matches.add(pt.matchId);
  if (pt.tournamentId) b.tournaments.add(pt.tournamentId);
  const ts = pt.createdAt?.seconds || pt.order || 0;
  if (ts) {
    if (!b.firstSeen || ts < b.firstSeen) b.firstSeen = ts;
    if (!b.lastSeen || ts > b.lastSeen) b.lastSeen = ts;
  }
  const players = data.players || [];
  for (let i = 0; i < 5; i++) {
    b.totalSlots++;
    const p = players[i];
    if (!p) continue;
    b.placed++;
    b.placedForAssign++;
    b.placedForRunner++;
    b.placedForElim++;
    if (data.assignments?.[i]) b.assigned++;
    if (data.runners?.[i]) b.runnerFlagged++;
    if (data.eliminations?.[i]) b.elimMarked++;
    const isRunner = !!data.runners?.[i];
    if (!isRunner) {
      b.nonRunners++;
      if (slotHasShot(data, i)) b.withShots++;
    }
  }
  return uid;
}

/**
 * Compute scout stats for a flat list of enriched points.
 *
 * @param {Array} points — each item should include { homeData, awayData, matchId, tournamentId }
 * @returns {Array} sorted by composite desc
 */
export function computeScoutStats(points) {
  const map = new Map();
  (points || []).forEach(pt => {
    ['homeData', 'awayData'].forEach(sideKey => {
      const data = pt[sideKey];
      const uid = data?.scoutedBy;
      if (!uid) return;
      if (!map.has(uid)) map.set(uid, emptyBuckets());
      tallySide(map.get(uid), data, pt);
    });
  });
  return [...map.entries()]
    .map(([uid, b]) => finalize(b, uid))
    .sort((a, b) => b.composite - a.composite || b.points - a.points);
}

/**
 * Compute completeness % for a single match's worth of points, averaged per side.
 * Used on ScoutDetailPage for the chronological match progression bars.
 */
export function computeMatchCompleteness(points) {
  if (!points?.length) return 0;
  const b = emptyBuckets();
  points.forEach(pt => {
    ['homeData', 'awayData'].forEach(sideKey => {
      const data = pt[sideKey];
      if (!data?.scoutedBy) return;
      tallySide(b, data, pt);
    });
  });
  return finalize(b, null).composite;
}

/**
 * Compute per-scout completeness for a list of points. Returns single row.
 */
export function computeScoutRow(points, uid) {
  const b = emptyBuckets();
  (points || []).forEach(pt => {
    ['homeData', 'awayData'].forEach(sideKey => {
      const data = pt[sideKey];
      if (data?.scoutedBy !== uid) return;
      tallySide(b, data, pt);
    });
  });
  return finalize(b, uid);
}

/**
 * Scan points scouted by one user and bucket the missing-data items.
 * Used by the personal ScoutIssuesPage.
 */
export function computeScoutIssues(points, uid) {
  const issues = { shots: [], assignments: [], runners: [], eliminations: [] };
  (points || []).forEach(pt => {
    ['homeData', 'awayData'].forEach(sideKey => {
      const data = pt[sideKey];
      if (data?.scoutedBy !== uid) return;
      const players = data.players || [];
      for (let i = 0; i < 5; i++) {
        if (!players[i]) continue;
        const isRunner = !!data.runners?.[i];
        const common = {
          tournamentId: pt.tournamentId,
          matchId: pt.matchId,
          pointId: pt.id,
          side: sideKey === 'homeData' ? 'home' : 'away',
          slot: i,
        };
        if (!isRunner && !slotHasShot(data, i)) issues.shots.push(common);
        if (!data.assignments?.[i]) issues.assignments.push(common);
      }
      // Runners: no runners flagged on whole side at all is suspicious.
      if (players.some(Boolean) && !(data.runners || []).some(Boolean)) {
        issues.runners.push({
          tournamentId: pt.tournamentId, matchId: pt.matchId, pointId: pt.id,
          side: sideKey === 'homeData' ? 'home' : 'away',
        });
      }
      // Eliminations: no elim flags on any placed slot.
      if (players.some(Boolean) && !(data.eliminations || []).some(Boolean)) {
        issues.eliminations.push({
          tournamentId: pt.tournamentId, matchId: pt.matchId, pointId: pt.id,
          side: sideKey === 'homeData' ? 'home' : 'away',
        });
      }
    });
  });
  return issues;
}

/**
 * Star rating 1-5 from composite % (for ranking cards).
 */
export function scoutStars(composite) {
  if (composite >= 90) return 5;
  if (composite >= 75) return 4;
  if (composite >= 60) return 3;
  if (composite >= 40) return 2;
  return 1;
}

export function compositeColor(composite) {
  if (composite >= 80) return '#22c55e';
  if (composite >= 60) return '#f59e0b';
  return '#ef4444';
}
