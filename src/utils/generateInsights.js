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

/** % of points where any player reached the fifty zone (0.4 < x < 0.6). 
 *  Also returns breakdown by which fifty bunker (Snake50, Dorito50, Center50). */
export function computeFiftyReached(points, field) {
  if (!points?.length) return { pct: 0, breakdown: {} };
  const discoLine = field?.discoLine ?? 0.30;
  const zeekerLine = field?.zeekerLine ?? 0.80;
  const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
  let hits = 0;
  const bunkCounts = {};
  points.forEach(pt => {
    const ps = (pt.players || []).filter(Boolean);
    const fiftyPlayers = ps.filter(p => p.x > 0.4 && p.x < 0.6);
    if (fiftyPlayers.length) {
      hits++;
      fiftyPlayers.forEach(p => {
        const isDor = doritoSide === 'top' ? p.y < discoLine : p.y > (1 - discoLine);
        const isSnk = doritoSide === 'top' ? p.y > zeekerLine : p.y < (1 - zeekerLine);
        const zone = isDor ? 'Dorito 50' : isSnk ? 'Snake 50' : 'Center 50';
        bunkCounts[zone] = (bunkCounts[zone] || 0) + 1;
      });
    }
  });
  return {
    pct: Math.round((hits / points.length) * 100),
    breakdown: bunkCounts,
  };
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
/** Zones with zero obstacle shots → uncovered during gun fights. */
export function computeUncoveredZones(points) {
  if (!points?.length) return [];
  const zoneCounts = { dorito: 0, center: 0, snake: 0 };
  let hasAnyObstacle = false;
  points.forEach(pt => {
    const obs = pt.obstacleShots || [];
    obs.forEach(zs => (zs || []).forEach(z => {
      if (z in zoneCounts) { zoneCounts[z]++; hasAnyObstacle = true; }
    }));
  });
  if (!hasAnyObstacle) return []; // no obstacle data collected yet
  return Object.entries(zoneCounts)
    .filter(([, count]) => count === 0)
    .map(([zone]) => zone);
}

/** Per-player win rate delta: team win rate WITH player - team win rate OVERALL. */
export function computePlayerDependency(points, rosterIds) {
  if (!points?.length || !rosterIds?.length) return [];
  const totalWins = points.filter(p => p.outcome === 'win' || p.outcome === 'win_a' || p.outcome === 'win_b').length;
  const totalFinal = points.filter(p => p.outcome && p.outcome !== 'pending').length;
  if (!totalFinal) return [];
  const teamWinRate = Math.round((totalWins / totalFinal) * 100);

  return rosterIds.map(pid => {
    const withPlayer = points.filter(p => (p.assignments || []).includes(pid));
    const withFinal = withPlayer.filter(p => p.outcome && p.outcome !== 'pending');
    const withWins = withPlayer.filter(p => p.outcome === 'win' || p.outcome === 'win_a' || p.outcome === 'win_b');
    if (withFinal.length < 3) return null; // not enough data
    const playerWinRate = Math.round((withWins.length / withFinal.length) * 100);
    const delta = playerWinRate - teamWinRate;
    return { playerId: pid, playerWinRate, teamWinRate, delta, ptsPlayed: withFinal.length };
  }).filter(Boolean).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** % of points where any player has a bump stop (moved after initial placement). */
export function computeLateBreakRate(points) {
  if (!points?.length) return 0;
  const latePoints = points.filter(p => {
    const bumps = p.bumpStops || [];
    return bumps.some(Boolean);
  }).length;
  return Math.round((latePoints / points.length) * 100);
}

export function generateInsights(stats, points, field, _roster) {
  const insights = [];
  if (!points?.length) return insights;

  // 1. Fifty reached — aggressive mindset
  const fifty = computeFiftyReached(points, field);
  const fiftyPct = fifty.pct;
  if (fiftyPct > 60) {
    const topFifty = Object.entries(fifty.breakdown).sort((a, b) => b[1] - a[1])[0];
    const fiftyName = topFifty ? topFifty[0] : 'fifty';
    insights.push({
      type: 'aggressive',
      text: `Aggressive ${fiftyName} — reached in ${fiftyPct}% of points`,
      detail: topFifty ? `${fiftyName}: ${topFifty[1]}x. League average ~35%.` : 'League average is around 35%.',
    });
  }

  // 2. Break runner count
  // Heavy pocket (≤1.5 avg): 4-5 players near base = heavy lane shooters on break.
  // Moderate delay (~2 runners): conservative but not a lane-shooting trap.
  // Full push (≥3.5): aggressive, vulnerable to disciplined lane shooting.
  const avgRunners = computeAvgRunners(points);
  if (avgRunners > 0 && avgRunners < 1.5) {
    const delayers = Math.round(5 - avgRunners);
    insights.push({
      type: 'pattern',
      text: `Heavy pocket — ${delayers} players delay, likely shooting lanes`,
      detail: `${delayers} players stay near base to shoot break lanes. Surviving the break is priority — don't run through paint.`,
    });
  } else if (avgRunners >= 1.5 && avgRunners < 2.5) {
    const runners = Math.round(avgRunners);
    insights.push({
      type: 'pattern',
      text: `Only ${runners} player${runners === 1 ? '' : 's'} break on average — conservative`,
      detail: 'Slow, controlled break — they build patiently. Their tape positions open after the break settles.',
    });
  } else if (avgRunners >= 3.5) {
    insights.push({
      type: 'pattern',
      text: `${Math.round(avgRunners)} players break on average — full push`,
      detail: 'Aggressive break — they commit runners early. Disciplined lanes on break can get free eliminations.',
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

  // 6. Uncovered zone — weakness (from obstacle shots)
  const uncovered = computeUncoveredZones(points);
  if (uncovered.length > 0) {
    const zoneNames = uncovered.map(z => z.charAt(0).toUpperCase() + z.slice(1)).join(' & ');
    insights.push({
      type: 'weakness',
      text: `${zoneNames} uncovered during obstacle play`,
      detail: `No obstacle shots target ${zoneNames.toLowerCase()} — vulnerable lane.`,
    });
  }

  // 7. Player dependency — strength or weakness
  const rosterIds = [...new Set(points.flatMap(p => p.assignments || []).filter(Boolean))];
  const deps = computePlayerDependency(points, rosterIds);
  if (deps.length > 0) {
    const top = deps[0];
    if (top.delta >= 20) {
      insights.push({
        type: 'strength',
        text: `Key player dependency — win rate +${top.delta}% with one player`,
        detail: `Team wins ${top.playerWinRate}% with this player vs ${top.teamWinRate}% overall (${top.ptsPlayed} pts).`,
      });
    } else if (top.delta <= -20) {
      insights.push({
        type: 'weakness',
        text: `Player drags win rate — ${top.delta}% impact`,
        detail: `Team wins ${top.playerWinRate}% with this player vs ${top.teamWinRate}% overall (${top.ptsPlayed} pts).`,
      });
    }
  }

  // 8. Late break rate — pattern
  const lateRate = computeLateBreakRate(points);
  if (lateRate > 30) {
    insights.push({
      type: 'pattern',
      text: `Late breakers in ${lateRate}% of points`,
      detail: 'Delayed runners — expect secondary push after initial break.',
    });
  }

  // 9. Formation consistency / predictability
  if (points.length >= 3) {
    const discoLine = field?.discoLine ?? 0.30;
    const zeekerLine = field?.zeekerLine ?? 0.80;
    const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
    const zoneOf = (p) => {
      if (!p) return '?';
      const isDor = doritoSide === 'top' ? p.y < discoLine : p.y > (1 - discoLine);
      const isSnk = doritoSide === 'top' ? p.y > zeekerLine : p.y < (1 - zeekerLine);
      return isDor ? 'D' : isSnk ? 'S' : 'C';
    };
    const formationCounts = {};
    points.forEach(pt => {
      const ps = (pt.players || []).filter(Boolean);
      if (ps.length < 3) return;
      const zones = ps.map(zoneOf).sort().join('');
      formationCounts[zones] = (formationCounts[zones] || 0) + 1;
    });
    const total = Object.values(formationCounts).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(formationCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length && total >= 3) {
      const [topFormation, topCount] = sorted[0];
      const topPct = Math.round((topCount / total) * 100);
      const readable = topFormation.replace(/D/g, 'D').replace(/S/g, 'S').replace(/C/g, 'C');
      const formatDesc = `${(readable.match(/D/g)||[]).length}D ${(readable.match(/S/g)||[]).length}S ${(readable.match(/C/g)||[]).length}C`;
      if (topPct >= 60) {
        insights.push({
          type: 'pattern',
          text: `Predictable — same formation ${topPct}% (${formatDesc})`,
          detail: `Most common: ${formatDesc} in ${topCount}/${total} points. Prepare a specific counter.`,
        });
      } else if (sorted.length >= 3 && topPct < 35) {
        insights.push({
          type: 'pattern',
          text: `Unpredictable — ${sorted.length} different formations used`,
          detail: `No single formation exceeds ${topPct}%. Hard to prepare a counter.`,
        });
      }
    }
  }

  return insights.slice(0, 6);
}

/**
 * Generate tactical counter-suggestions based on opponent insights.
 * Each insight maps to an actionable recommendation for the coach.
 */
export function generateCounters(insights) {
  const counters = [];
  if (!insights?.length) return counters;

  insights.forEach(insight => {
    const t = insight.text.toLowerCase();

    // Aggressive fifty → hold lanes
    if (t.includes('aggressive') && t.includes('50')) {
      const zone = t.includes('snake') ? 'snake' : t.includes('dorito') ? 'dorito' : 'center';
      counters.push({
        priority: 'high', icon: '🛡',
        action: `Hold ${zone} lanes on break`,
        detail: `They push ${zone} 50 aggressively. Assign a lane holder to cut off the runner before they reach the fifty.`,
      });
    }

    // Heavy pocket → survive break first, then push into empty real estate
    if (t.includes('heavy pocket') || t.includes('shooting lanes')) {
      counters.push({
        priority: 'high', icon: '🎯',
        action: 'Survive the break — read their lanes',
        detail: 'With 4+ in pocket they shoot heavy break lanes. Don\'t run through paint. Wait for their streams to drop (reload, lane shift), then push into the empty real estate they left open on the tape.',
      });
    }

    // Conservative delay → get alive, then apply steady pressure
    if (t.includes('conservative') && t.includes('break on average')) {
      counters.push({
        priority: 'medium', icon: '⚡',
        action: 'Win positions, then apply pressure',
        detail: 'They play slow. Get alive in good spots first, then build pressure from angles. Their tape will open — don\'t force the break.',
      });
    }

    // Full push → disciplined lanes on break, catch runners in the open
    if (t.includes('full push')) {
      counters.push({
        priority: 'high', icon: '🛡',
        action: 'Shoot break lanes — free kills available',
        detail: 'They commit many runners on break. Set disciplined lanes early — runners caught in the open are the easiest eliminations in paintball.',
      });
    }

    // Side dominant → attack weak side
    if (t.includes('dorito runner') && !t.includes('snake')) {
      counters.push({
        priority: 'high', icon: '🎯',
        action: 'Attack their weak snake',
        detail: 'They focus on dorito. Send a runner to snake — it will be under-defended.',
      });
    }
    if (t.includes('snake runner') && !t.includes('dorito')) {
      counters.push({
        priority: 'high', icon: '🎯',
        action: 'Attack their weak dorito',
        detail: 'They focus on snake. Send a runner to dorito — it will be under-defended.',
      });
    }

    // Side vulnerability → exploit it
    if (t.includes('losses come from')) {
      const side = t.includes('snake') ? 'snake' : t.includes('dorito') ? 'dorito' : 'center';
      counters.push({
        priority: 'high', icon: '🏃',
        action: `Push ${side} — their weak spot`,
        detail: `Most of their losses come from ${side} pushes. Exploit this pattern.`,
      });
    }

    // Center control → contest it
    if (t.includes('center control')) {
      counters.push({
        priority: 'medium', icon: '🎯',
        action: 'Contest center control',
        detail: 'They dominate the center. Send a center player with good lane coverage to challenge their positioning.',
      });
    }

    // Uncovered zone → send runner
    if (t.includes('uncovered')) {
      const match = insight.text.match(/(\w+)\s+uncovered/i);
      const zone = match?.[1] || 'the gap';
      counters.push({
        priority: 'high', icon: '🏃',
        action: `Send runner to ${zone.toLowerCase()}`,
        detail: `${zone} is consistently uncovered during obstacle play. A runner there faces no opposition.`,
      });
    }

    // Player dependency → eliminate key player
    if (t.includes('key player dependency') || t.includes('win rate +')) {
      counters.push({
        priority: 'medium', icon: '💀',
        action: 'Eliminate their key player early',
        detail: 'Their win rate drops significantly without one player. Focus fire on them at the break.',
      });
    }

    // Predictable formation → side-specific tactical counter
    if (t.includes('predictable')) {
      const formMatch = insight.text.match(/\(([^)]+)\)/);
      const form = formMatch?.[1] || '';
      // Parse D/S/C counts from format like "0D 2S 3C"
      const dMatch = form.match(/(\d+)D/); const sMatch = form.match(/(\d+)S/);
      const dCount = dMatch ? parseInt(dMatch[1]) : -1;
      const sCount = sMatch ? parseInt(sMatch[1]) : -1;
      let detail = `They run ${form} most of the time. `;
      if (dCount === 0 && sCount === 0) {
        detail += 'No tape runners — dorito and snake wire are open. Send your front players wide safely after surviving center lanes.';
      } else if (dCount === 0) {
        detail += 'No dorito runner — D-side tape is undefended. Your D-front can get deep early. Set up lanes for their snake attacker.';
      } else if (sCount === 0) {
        detail += 'No snake runner — snake wire is open. Send your snake player uncontested. Set up lanes for their dorito attacker.';
      } else {
        detail += 'Set up lanes and positions specifically for this formation before the buzzer.';
      }
      counters.push({
        priority: 'high', icon: '🧠',
        action: 'Counter their predictable formation',
        detail,
      });
    }

    // Unpredictable → play solid
    if (t.includes('unpredictable')) {
      counters.push({
        priority: 'low', icon: '⚖',
        action: 'Play solid fundamentals',
        detail: 'They vary formations — no single counter works. Focus on lane discipline and communication.',
      });
    }

    // Late breakers → watch for secondary push
    if (t.includes('late breakers')) {
      counters.push({
        priority: 'medium', icon: '👁',
        action: 'Watch for delayed runners',
        detail: 'They send late breakers after the initial break. Keep lanes active after the buzzer settles.',
      });
    }
  });

  // Deduplicate and prioritize
  const seen = new Set();
  return counters.filter(c => {
    if (seen.has(c.action)) return false;
    seen.add(c.action);
    return true;
  }).sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return (p[a.priority] || 1) - (p[b.priority] || 1);
  }).slice(0, 4);
}

export const COUNTER_COLORS = {
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#475569',
};

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
/**
 * Map a precision shot position {x, y} to a specific target bunker.
 *
 * The shot is placed in the "approach zone" BEFORE the bunker from
 * the opponent's base side. The opponent runs from base (Y≈0.5) to
 * their bunker, and the shooter aims at that corridor.
 *
 * Dorito (top): bunker.y < 0.5 → approach zone: shot.y ∈ [bunker.y, 0.5]
 * Snake (bottom): bunker.y > 0.5 → approach zone: shot.y ∈ [0.5, bunker.y]
 *
 * Among bunkers whose approach zone contains the shot, pick closest by distance.
 * Falls back to nearest same-side bunker if no approach match found.
 */
export function findPrecisionShotBunker(shotPos, bunkers, field) {
  if (!shotPos || !bunkers?.length) return null;
  const discoLine  = field?.discoLine  ?? 0.30;
  const zeekerLine = field?.zeekerLine ?? 0.80;
  const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
  const baseY = 0.5; // opponents start at centre Y

  const onDoritoSide = b => doritoSide === 'top' ? b.y < discoLine  : b.y > (1 - discoLine);
  const onSnakeSide  = b => doritoSide === 'top' ? b.y > zeekerLine : b.y < (1 - zeekerLine);

  // Determine which side the shot is aimed at
  const shotOnDorito = doritoSide === 'top' ? shotPos.y < baseY : shotPos.y > baseY;
  const shotOnSnake  = !shotOnDorito;

  // Filter bunkers whose approach zone contains the shot Y
  const inApproach = b => {
    if (shotOnDorito && onDoritoSide(b)) {
      // shot.y must be between bunker.y and baseY
      return doritoSide === 'top'
        ? shotPos.y >= b.y && shotPos.y <= baseY
        : shotPos.y <= b.y && shotPos.y >= baseY;
    }
    if (shotOnSnake && onSnakeSide(b)) {
      return doritoSide === 'top'
        ? shotPos.y <= b.y && shotPos.y >= baseY
        : shotPos.y >= b.y && shotPos.y <= baseY;
    }
    return false;
  };

  const candidates = bunkers.filter(inApproach);

  // If no approach matches, fall back to nearest bunker on same side
  const pool = candidates.length > 0 ? candidates
    : bunkers.filter(b => shotOnDorito ? onDoritoSide(b) : onSnakeSide(b));

  if (!pool.length) return null;

  let best = null, bestDist = Infinity;
  pool.forEach(b => {
    const dx = b.x - shotPos.x, dy = b.y - shotPos.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = b; }
  });
  return best ? (best.positionName || best.name) : null;
}

/**
 * Aggregate shot targets from both precision shots and quick shots.
 *
 * - Precision shots (shots[i] = [{x,y}...]): attributed to specific bunkers
 *   using the approach-zone algorithm above.
 * - Quick shots (quickShots[i] = ['dorito'|'snake'|'center']): zone-level only,
 *   cannot be attributed to specific bunkers without position data.
 *
 * Returns:
 *   precisionTargets: [{name, count, pct}] sorted by count — specific bunkers
 *   quickZones: {dorito, snake, center} — % of zone shots (quick shots)
 *   hasPrecision: boolean
 */
export function computeShotTargets(points, field) {
  if (!points?.length) return { precisionTargets: [], quickZones: { dorito: 0, snake: 0, center: 0 }, hasPrecision: false };
  const bunkers = field?.bunkers || [];
  const bunkCounts = {}; // bunkerName → count of precision shots
  let qd = 0, qs = 0, qc = 0, qTotal = 0;
  let precisionTotal = 0;

  points.forEach(pt => {
    // Precision shots per player slot
    const precShots = pt.shots || [[], [], [], [], []];
    precShots.forEach(slotShots => {
      (slotShots || []).forEach(shot => {
        if (!shot?.x == null || shot?.y == null) return;
        precisionTotal++;
        const label = findPrecisionShotBunker(shot, bunkers, field);
        if (label) bunkCounts[label] = (bunkCounts[label] || 0) + 1;
      });
    });

    // Quick shots (zone level)
    const qShots = pt.quickShots || [[], [], [], [], []];
    qShots.forEach(slotZones => {
      (slotZones || []).forEach(z => {
        qTotal++;
        if (z === 'dorito') qd++;
        else if (z === 'snake') qs++;
        else if (z === 'center') qc++;
      });
    });
    const oShots = pt.obstacleShots || [[], [], [], [], []];
    oShots.forEach(slotZones => {
      (slotZones || []).forEach(z => {
        qTotal++;
        if (z === 'dorito') qd++;
        else if (z === 'snake') qs++;
        else if (z === 'center') qc++;
      });
    });
  });

  const precisionTargets = Object.entries(bunkCounts)
    .map(([name, count]) => ({
      name,
      count,
      pct: precisionTotal > 0 ? Math.round((count / precisionTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const quickZones = qTotal > 0 ? {
    dorito: Math.round((qd / qTotal) * 100),
    snake:  Math.round((qs / qTotal) * 100),
    center: Math.round((qc / qTotal) * 100),
  } : { dorito: 0, snake: 0, center: 0 };

  return {
    precisionTargets,
    quickZones,
    hasPrecision: precisionTotal > 0,
    hasQuick: qTotal > 0,
  };
}

/**
 * computeTacticalSignals — three coach-oriented signals:
 *
 * 1. mostEliminated: which scouted team player gets eliminated most (by slot/player)
 * 2. huntedPositions: which opponent bunker positions the scouted team kills most,
 *    with an "unusual" flag if their kill rate there is 1.5× above average
 * 3. fiftyReach: % of points where scouted team reaches snake-50 or dorito-50 zone
 *
 * @param {Array}  points     - normalized heatmap points
 * @param {Object} field      - field object (discoLine, zeekerLine, doritoSide, bunkers)
 * @param {Array}  allPlayers - full players collection for name lookup
 * @returns {{ mostEliminated, huntedPositions, fiftyReach }}
 */
export function computeTacticalSignals(points, field, allPlayers) {
  const empty = { mostEliminated: null, huntedPositions: [], fiftyReach: { snake: 0, dorito: 0 } };
  if (!points?.length) return empty;

  const discoLine  = field?.discoLine  ?? 0.30;
  const zeekerLine = field?.zeekerLine ?? 0.80;
  const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
  const bunkers    = field?.bunkers || [];

  const onDoritoSide  = p => doritoSide === 'top' ? p.y < discoLine  : p.y > (1 - discoLine);
  const onSnakeSide   = p => doritoSide === 'top' ? p.y > zeekerLine : p.y < (1 - zeekerLine);
  const nearFifty     = p => p.x > 0.40 && p.x < 0.65; // deep but not past opp base

  // Slot-level stats for scouted team (1)
  const slotStats = {}; // slot → { played, eliminated, playerIds: Set }

  // Opponent bunker hunt stats (2)
  const hunted = {}; // bunkerLabel → { appeared, eliminated }

  // Fifty reach (3)
  let snakeFiftyPts = 0, doritoFiftyPts = 0;

  points.forEach(pt => {
    const ownPlayers  = pt.players || [];
    const ownElims    = pt.eliminations || [];
    const assignments = pt.assignments || [];
    const oppPlayers  = pt.opponentPlayers || [];
    const oppElims    = pt.opponentEliminations || [];

    // 1. Own player eliminations per slot
    ownPlayers.forEach((pos, i) => {
      if (!pos) return;
      if (!slotStats[i]) slotStats[i] = { played: 0, eliminated: 0, playerIds: new Set() };
      slotStats[i].played++;
      if (ownElims[i]) slotStats[i].eliminated++;
      if (assignments[i]) slotStats[i].playerIds.add(assignments[i]);
    });

    // 2. Opponent positions they hunt
    oppPlayers.forEach((pos, i) => {
      if (!pos) return;
      const label = findNearestBunker(pos, bunkers);
      if (!label) return;
      if (!hunted[label]) hunted[label] = { appeared: 0, eliminated: 0 };
      hunted[label].appeared++;
      if (oppElims[i]) hunted[label].eliminated++;
    });

    // 3. Fifty reach (anyone from scouted team in 50 zone)
    let hadSnake = false, hadDorito = false;
    ownPlayers.forEach(pos => {
      if (!pos || !nearFifty(pos)) return;
      if (onSnakeSide(pos))  hadSnake   = true;
      if (onDoritoSide(pos)) hadDorito  = true;
    });
    if (hadSnake)  snakeFiftyPts++;
    if (hadDorito) doritoFiftyPts++;
  });

  const n = points.length;

  // 1. Most eliminated — sort by elimination rate, min 3 points played
  const slotList = Object.entries(slotStats)
    .map(([slot, s]) => {
      const pid = [...s.playerIds][0] || null;
      const player = pid ? allPlayers?.find(p => p.id === pid) : null;
      return {
        slot: parseInt(slot),
        played: s.played,
        eliminated: s.eliminated,
        pct: s.played > 0 ? Math.round((s.eliminated / s.played) * 100) : 0,
        playerId: pid,
        name: player?.nickname || player?.name || null,
        number: player?.number || null,
      };
    })
    .filter(s => s.played >= 3)
    .sort((a, b) => b.pct - a.pct);

  const mostEliminated = slotList[0] || null;

  // 2. Hunted positions — compute avg kill rate, flag outliers
  const totalOppApp  = Object.values(hunted).reduce((s, h) => s + h.appeared, 0);
  const totalOppElim = Object.values(hunted).reduce((s, h) => s + h.eliminated, 0);
  const avgKillRate  = totalOppApp > 0 ? totalOppElim / totalOppApp : 0;

  const huntedList = Object.entries(hunted)
    .filter(([, h]) => h.appeared >= 2)
    .map(([label, h]) => ({
      label,
      appeared: h.appeared,
      eliminated: h.eliminated,
      pct: Math.round((h.eliminated / h.appeared) * 100),
      unusual: h.appeared >= 3 && (h.eliminated / h.appeared) >= Math.max(avgKillRate * 1.5, 0.5),
    }))
    .sort((a, b) => b.eliminated - a.eliminated)
    .slice(0, 5);

  return {
    mostEliminated,
    huntedPositions: huntedList,
    fiftyReach: {
      snake:  Math.round((snakeFiftyPts  / n) * 100),
      dorito: Math.round((doritoFiftyPts / n) * 100),
    },
  };
}

/**
 * @param {Array} points - normalized heatmap points
 * @param {Object} field  - field object with bunkers array
 * @returns {Array<{name, positionName, type, count, pct}>}
 */
export function computeBreakBunkers(points, field) {
  if (!points?.length || !field?.bunkers?.length) return [];
  const bunkers = field.bunkers;
  const counts = {}; // bunkerLabel → { count, bunker }

  points.forEach(pt => {
    const players = pt.players || [];
    // Use Set to count each bunker once per point (not per player slot)
    const seenThisPoint = new Set();
    players.forEach(pos => {
      if (!pos) return;
      let best = null, bestDist = Infinity;
      bunkers.forEach(b => {
        const dx = b.x - pos.x, dy = b.y - pos.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = b; }
      });
      if (!best || bestDist > 0.12 * 0.12) return; // ~12% of field width threshold
      const label = best.positionName || best.name;
      if (!label || seenThisPoint.has(label)) return;
      seenThisPoint.add(label);
      if (!counts[label]) counts[label] = { count: 0, bunker: best };
      counts[label].count++;
    });
  });

  return Object.entries(counts)
    .map(([label, { count, bunker }]) => ({
      name: label,
      type: bunker.type || null,
      side: bunker.side || null,
      count,
      pct: Math.round((count / points.length) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function findNearestBunker(pos, bunkers) {
  if (!pos || !bunkers?.length) return null;
  let best = null, bestDist = Infinity;
  bunkers.forEach(b => {
    const dx = (b.x - pos.x), dy = (b.y - pos.y);
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = b; }
  });
  // Only match if within reasonable distance (0.15 normalized = ~15% of field)
  if (bestDist > 0.15 * 0.15) return null;
  return best?.positionName || best?.name || null;
}

/**
 * Kill attribution: correlate player's quick shot zones with opponent
 * eliminations in the same point.
 *
 * If player shot toward zone X (break or obstacle) AND an opponent
 * positioned in zone X was eliminated → probable kill credit.
 */
export function computeKillCredit(playerSlot, pt, field) {
  const myShots = [...(pt.quickShots?.[playerSlot] || []), ...(pt.obstacleShots?.[playerSlot] || [])];
  if (!myShots.length) return 0;

  // We need opponent data — check if point has opponent info
  const oppElim = pt.opponentEliminations || [];
  const oppPlayers = pt.opponentPlayers || [];
  if (!oppElim.length || !oppPlayers.length) return 0;

  const discoLine = field?.discoLine ?? 0.30;
  const zeekerLine = field?.zeekerLine ?? 0.80;
  const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';

  const oppZone = (p) => {
    if (!p) return null;
    const isDor = doritoSide === 'top' ? p.y < discoLine : p.y > (1 - discoLine);
    const isSnk = doritoSide === 'top' ? p.y > zeekerLine : p.y < (1 - zeekerLine);
    return isDor ? 'dorito' : isSnk ? 'snake' : 'center';
  };

  let kills = 0;
  const shotZones = new Set(myShots);
  oppElim.forEach((elim, idx) => {
    if (!elim) return; // not eliminated
    const oppPos = oppPlayers[idx];
    const zone = oppZone(oppPos);
    if (zone && shotZones.has(zone)) kills++;
  });
  return kills;
}

export function computePlayerSummaries(points, rosterIds, allPlayers, field) {
  const discoLine = field?.discoLine ?? 0.30;
  const zeekerLine = field?.zeekerLine ?? 0.80;
  const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
  const bunkers = field?.bunkers || [];
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
    let played = 0, wins = 0, losses = 0, kills = 0;
    let dataFilled = 0; // points where player has position data
    const zoneCounts = { dorito: 0, center: 0, snake: 0 };
    const bunkerCounts = {};
    const matchIds = new Set();
    points.forEach(pt => {
      const assignments = pt.assignments;
      const players = pt.players;
      if (!assignments) return;
      const slot = assignments.indexOf(pid);
      if (slot < 0) return;
      played++;
      if (pt.matchId) matchIds.add(pt.matchId);
      const isWin = pt.outcome === 'win' || pt.outcome === 'win_a' || pt.outcome === 'win_b';
      const isLoss = pt.outcome === 'loss' || pt.outcome === 'loss_a' || pt.outcome === 'loss_b';
      if (isWin) wins++;
      if (isLoss) losses++;
      // Kill attribution: correlate shot zones with opponent eliminations
      kills += computeKillCredit(slot, pt, field);
      const pos = players?.[slot];
      if (pos) {
        dataFilled++;
        zoneCounts[zoneOf(pos)]++;
        const bLabel = findNearestBunker(pos, bunkers);
        if (bLabel) bunkerCounts[bLabel] = (bunkerCounts[bLabel] || 0) + 1;
      }
    });
    const diff = wins - losses;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : null;
    const dataCoverage = played > 0 ? Math.round((dataFilled / played) * 100) : 0;
    const preferred = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0];
    const position = preferred && preferred[1] > 0 ? zoneLabel[preferred[0]] : '—';
    const preferredBunker = Object.entries(bunkerCounts).sort((a, b) => b[1] - a[1])[0];
    const bunker = preferredBunker && preferredBunker[1] > 0 ? preferredBunker[0] : null;
    return {
      playerId: pid,
      name: player.nickname || player.name,
      fullName: player.name,
      number: player.number,
      position,
      bunker,
      matchesPlayed: matchIds.size,
      ptsPlayed: played,
      dataFilled,
      dataCoverage,
      wins,
      losses,
      diff,
      kills,
      winRate,
    };
  })
  .filter(Boolean)
  .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1));
}
