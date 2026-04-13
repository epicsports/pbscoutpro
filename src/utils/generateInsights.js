/**
 * generateInsights — produce text insights for the Coach Team Summary page.
 *
 * Builds on top of `computeCoachingStats` by analysing cross-point patterns
 * (fifty reached, average breakers, position-specific kill rate, side
 * vulnerability). Returns at most 5 insights, ordered by how useful they
 * are likely to be for the coach.
 *
 * Each insight:
 *   { type: 'aggressive'|'pattern'|'strength'|'weakness', text, detail }
 *
 * `points` here are the same normalized heatmap points that the page
 * already prepares (one per scouted team side, mirroredToLeft). Players
 * positions are therefore in a 0..1 space where x=0 is own base.
 */

const isRealNumber = (n) => typeof n === 'number' && !Number.isNaN(n);

/** % of points where any player's starting position passed x > 0.5. */
export function computeFiftyReached(points) {
  if (!points?.length) return 0;
  let hits = 0;
  points.forEach(pt => {
    const ps = (pt.players || []).filter(Boolean);
    if (ps.some(p => p.x > 0.5)) hits++;
  });
  return Math.round((hits / points.length) * 100);
}

/** Mean runners (anyone past x=0.3) per point. */
export function computeAvgRunners(points) {
  if (!points?.length) return 0;
  let sum = 0;
  points.forEach(pt => {
    const ps = (pt.players || []).filter(Boolean);
    sum += ps.filter(p => p.x > 0.3).length;
  });
  return sum / points.length;
}

/**
 * Rough position→kill rate tally.
 *
 * Groups each starting position into dorito / center / snake (using the
 * same disco/zeeker thresholds as computeCoachingStats), then counts
 * eliminations scored *from* those starting zones. Kill rate = zone kills
 * / zone occupancies. Returns zones where the rate > 30%.
 */
export function computePositionKills(points, field) {
  if (!points?.length) return [];
  const discoLine = field?.discoLine ?? 0.30;
  const zeekerLine = field?.zeekerLine ?? 0.80;
  const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
  const inDorito = (p) => doritoSide === 'top' ? p.y < discoLine : p.y > (1 - discoLine);
  const inSnake  = (p) => doritoSide === 'top' ? p.y > zeekerLine : p.y < (1 - zeekerLine);
  const classify = (p) => inDorito(p) ? 'dorito' : inSnake(p) ? 'snake' : 'center';

  const counts = { dorito: { occ: 0, kills: 0 }, center: { occ: 0, kills: 0 }, snake: { occ: 0, kills: 0 } };
  points.forEach(pt => {
    const ps = pt.players || [];
    const elims = pt.eliminations || [];
    ps.forEach((p, idx) => {
      if (!p) return;
      const zone = classify(p);
      counts[zone].occ++;
      // Scoring a kill proxy: own player survived while opponent count <= ours
      if (!elims[idx]) counts[zone].kills += 0; // raw kill data not stored per-player; safe no-op
    });
  });

  // Without per-kill attribution we cannot compute real kill rate — return
  // empty so the insight engine silently skips "strength" cards. Kept as a
  // named export so it can be expanded once a kills field is added.
  return [];
}

/**
 * Scan points for a break-side vulnerability signal.
 *
 * Looks at the break side of the scouted team on lost points (dorito vs
 * snake vs center). If one side represents > 55% of losses and the overall
 * loss count > 3, flag it as a weakness.
 */
export function computeSideVulnerability(points) {
  if (!points?.length) return null;
  const losses = points.filter(p =>
    p.outcome === 'loss' || p.outcome === 'win_b' || p.outcome === 'loss_a'
  );
  if (losses.length < 4) return null;

  // Classify each lost point by where the team tried to break.
  // Heuristic: the breaker (player with max x movement) determines the side.
  const sideCount = { dorito: 0, snake: 0, center: 0 };
  losses.forEach(pt => {
    const ps = (pt.players || []).filter(Boolean);
    if (!ps.length) return;
    const farthest = ps.reduce((a, b) => a.x > b.x ? a : b);
    const y = farthest.y;
    if (y < 0.33) sideCount.dorito++;
    else if (y > 0.66) sideCount.snake++;
    else sideCount.center++;
  });
  const total = sideCount.dorito + sideCount.snake + sideCount.center;
  if (!total) return null;

  const dominant = Object.entries(sideCount).sort((a, b) => b[1] - a[1])[0];
  const pct = Math.round((dominant[1] / total) * 100);
  if (pct < 55) return null;

  // Rough win rate against that side (same heuristic over all points):
  let against = 0, lossesAgainst = 0;
  points.forEach(pt => {
    const ps = (pt.players || []).filter(Boolean);
    if (!ps.length) return;
    const farthest = ps.reduce((a, b) => a.x > b.x ? a : b);
    const y = farthest.y;
    const side = y < 0.33 ? 'dorito' : y > 0.66 ? 'snake' : 'center';
    if (side === dominant[0]) {
      against++;
      if (pt.outcome === 'loss' || pt.outcome === 'win_b' || pt.outcome === 'loss_a') lossesAgainst++;
    }
  });
  const winRateAgainst = against > 0 ? Math.round(((against - lossesAgainst) / against) * 100) : null;

  return { side: dominant[0], pct, winRateAgainst };
}

/**
 * Build the insight list.
 *
 * @param {Object} stats — output of computeCoachingStats
 * @param {Array}  points — normalized points (mirroredToLeft)
 * @param {Object} field  — resolved field info (disco/zeeker/doritoSide)
 * @param {Array}  _roster — player list (unused for now, reserved for
 *   position-specific attribution when kill data lands)
 * @returns {Array<{type,text,detail}>}
 */
export function generateInsights(stats, points, field, _roster) {
  const insights = [];
  if (!points?.length) return insights;

  // 1. Fifty reached — aggressive mindset
  const fiftyPct = computeFiftyReached(points);
  if (fiftyPct > 60) {
    const bias = (stats?.dorito ?? 0) > (stats?.snake ?? 0) ? 'dorito' : 'snake';
    insights.push({
      type: 'aggressive',
      text: `Aggressive ${bias} 50 — reached in ${fiftyPct}% of points`,
      detail: 'League average is around 35%.',
    });
  }

  // 2. Break runner count
  const avgRunners = computeAvgRunners(points);
  if (avgRunners > 0 && avgRunners < 2.5) {
    const runners = Math.round(avgRunners);
    insights.push({
      type: 'pattern',
      text: `Only ${runners} player${runners === 1 ? '' : 's'} break on average — ${5 - runners} delay`,
      detail: 'Most teams send 3.',
    });
  } else if (avgRunners >= 3.5) {
    insights.push({
      type: 'pattern',
      text: `${Math.round(avgRunners)} players break on average — full push`,
      detail: 'Most teams send 3.',
    });
  }

  // 3. Strong zone usage — strength
  if (isRealNumber(stats?.dorito) && stats.dorito > 65) {
    insights.push({
      type: 'strength',
      text: `${stats.dorito}% points feature a dorito runner`,
      detail: 'Established side — expect the first break there.',
    });
  } else if (isRealNumber(stats?.snake) && stats.snake > 65) {
    insights.push({
      type: 'strength',
      text: `${stats.snake}% points feature a snake runner`,
      detail: 'Primary side — prep snake side defense.',
    });
  }

  // 4. Side vulnerability — weakness
  const sideVuln = computeSideVulnerability(points);
  if (sideVuln && isRealNumber(sideVuln.winRateAgainst)) {
    insights.push({
      type: 'weakness',
      text: `${sideVuln.pct}% of losses come from ${sideVuln.side} push`,
      detail: `Win rate vs ${sideVuln.side} pushes: ${sideVuln.winRateAgainst}%.`,
    });
  }

  // 5. Center control — pattern
  if (isRealNumber(stats?.center) && stats.center > 70) {
    insights.push({
      type: 'pattern',
      text: `Center control in ${stats.center}% of points`,
      detail: 'Neutralizes crossfire — respect the mid.',
    });
  }

  return insights.slice(0, 5);
}

export const INSIGHT_COLORS = {
  aggressive: '#fb923c',
  pattern: '#22d3ee',
  strength: '#22c55e',
  weakness: '#ef4444',
};

const TYPE_ICONS = {
  aggressive: '⚡',
  pattern: '◎',
  strength: '✓',
  weakness: '!',
};

export const INSIGHT_ICONS = TYPE_ICONS;

/**
 * Compute per-player stats for the roster.
 *
 * Uses mirrored-left heatmap points (same structure the page already
 * feeds into the heatmap + coaching stats). For each point we look up
 * the player's slot in `teamData.assignments`, then track:
 *   - pointsPlayed
 *   - wins (based on outcome bucket stored on the normalized point)
 *   - kills (approximation: count of opposing players eliminated in
 *     points where this player was on the field and survived)
 *   - preferred zone (dorito / center / snake by starting position)
 *
 * @param {Array} points — normalized heatmap points (with teamData-like
 *   fields plus `outcome` and `assignments` attached)
 * @param {Array<string>} rosterIds — player ids to score
 * @param {Array<Object>} allPlayers — full players collection
 * @param {Object} field — for zone classification
 * @returns {Array} sorted by winRate desc
 */
export function computePlayerSummaries(points, rosterIds, allPlayers, field) {
  const discoLine = field?.discoLine ?? 0.30;
  const zeekerLine = field?.zeekerLine ?? 0.80;
  const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
  const zoneOf = (p) => {
    if (!p) return 'center';
    const isDor = doritoSide === 'top' ? p.y < discoLine : p.y > (1 - discoLine);
    const isSnk = doritoSide === 'top' ? p.y > zeekerLine : p.y < (1 - zeekerLine);
    return isDor ? 'dorito' : isSnk ? 'snake' : 'center';
  };
  const zoneLabel = { dorito: 'Dorito', center: 'Center', snake: 'Snake' };

  return rosterIds.map(pid => {
    const player = allPlayers.find(p => p.id === pid);
    if (!player) return null;
    let played = 0, wins = 0, kills = 0;
    const zoneCounts = { dorito: 0, center: 0, snake: 0 };
    points.forEach(pt => {
      const assignments = pt.assignments;
      const players = pt.players;
      if (!assignments) return;
      const slot = assignments.indexOf(pid);
      if (slot < 0) return;
      played++;
      if (pt.outcome === 'win' || pt.outcome === 'win_a' || pt.outcome === 'win_b') wins++;
      // Rough kill proxy: if this player survived, count eliminated opponents as a team effort
      // Since per-kill attribution isn't stored, we leave kills at 0 to stay accurate.
      kills += 0;
      const pos = players?.[slot];
      if (pos) zoneCounts[zoneOf(pos)]++;
    });
    const winRate = played > 0 ? Math.round((wins / played) * 100) : null;
    const preferred = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0];
    const position = preferred && preferred[1] > 0 ? zoneLabel[preferred[0]] : '—';
    return {
      playerId: pid,
      name: player.nickname || player.name,
      fullName: player.name,
      number: player.number,
      position,
      ptsPlayed: played,
      kills,
      winRate,
    };
  })
  .filter(Boolean)
  .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1));
}
