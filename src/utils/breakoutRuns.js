/**
 * breakoutRuns — Crest Krok 2 "Najczęstsze rozbiegi" (most-frequent breakouts).
 *
 * DATA-HONEST INTERPRETATION (Jacek 2026-06-21, LOCKED):
 *   The capture flow records WHERE a player breaks TO (the Break keyframe
 *   position → a bunker) but NOT their starting lane. So the literal wireframe
 *   "od → do" lane→bunker run (e.g. "Snake → 50 lewy") is NOT derivable from the
 *   stored data. This builds the derivable version instead: the team's most-
 *   frequent breakout-TARGET bunkers — every scouted player's Break-keyframe
 *   position grouped by the bunker it lands on, with frequency (count), success%
 *   and share%.
 *
 *   ⚠ DEFERRED: lane-level "od→do" runs need a capture-flow change (record the
 *   start lane at the buzzer, not just the settled Break position). Not in scope
 *   for Krok 2.
 *
 * REUSE (no reinvention):
 *   - Position → nearest bunker: `findNearestBunker` from generateInsights.js —
 *     the same 0.15-normalized-radius matcher used by computeTacticalSignals /
 *     computeCalloutZoneTargets. Returns the bunker's positionName || name.
 *   - "Survived this break" = the player slot is NOT eliminated in that point —
 *     the same `point.eliminations` (per-slot boolean array) the existing
 *     ROZBICIE / Breakouts tables read (cf. computeBreakSurvival). We use the
 *     binary "not eliminated" signal (no 10s survival window) for an honest,
 *     simple success% that matches the table's stated "Sukces" column.
 *
 * DEFINITIONS:
 *   - count       = total breaks landing on this bunker (every player-slot that
 *                   placed nearest to it across all scoped points; anonymous-
 *                   first — NOT gated on roster assignments).
 *   - successPct  = round(survived / count * 100), survived = slot not eliminated.
 *   - sharePct    = round(count / totalBreaks * 100), totalBreaks = sum of all
 *                   matched breaks (the denominator for the Udział share bar).
 *
 * @param {Array}  heatmapPoints — normalized (mirrored-left) points, keyframe #0
 *                  = Break (point.players + point.eliminations), x=0 = own base.
 * @param {Object} layout        — resolved field info with `bunkers` (same source
 *                  ScoutedTeamPage feeds the heatmap; accepts `field` or `layout`).
 * @returns {Array<{ bunker, count, successPct, sharePct }>} sorted by count desc,
 *          top ~6. Null-safe: no points / no bunkers → [].
 */

import { findNearestBunker } from './generateInsights';

const MAX_ROWS = 6;

export function computeBreakoutRuns(heatmapPoints, layout) {
  const points = Array.isArray(heatmapPoints) ? heatmapPoints : [];
  const bunkers = layout?.bunkers || [];
  if (!points.length || !bunkers.length) return [];

  // bunker name → { count, survived }
  const stats = {};
  let totalBreaks = 0;

  points.forEach((pt) => {
    const players = pt?.players || [];
    const elims = pt?.eliminations || [];
    players.forEach((pos, i) => {
      if (!pos) return;
      // REUSE the shared matcher (0.15 radius); unmatched breaks (too far from
      // any bunker — e.g. a player still mid-field) are skipped, not faked.
      const name = findNearestBunker(pos, bunkers);
      if (!name) return;
      if (!stats[name]) stats[name] = { count: 0, survived: 0 };
      stats[name].count += 1;
      totalBreaks += 1;
      // Survived this break = NOT eliminated in this point (same per-slot
      // eliminations the ROZBICIE / Breakouts tables read).
      if (!elims[i]) stats[name].survived += 1;
    });
  });

  if (!totalBreaks) return [];

  // Count first, attach success/share after (anonymous-first; never gated on
  // roster assignments — [[identity_features_aggregate_anonymous_first]]).
  return Object.entries(stats)
    .map(([bunker, { count, survived }]) => ({
      bunker,
      count,
      successPct: count > 0 ? Math.round((survived / count) * 100) : 0,
      sharePct: Math.round((count / totalBreaks) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_ROWS);
}
