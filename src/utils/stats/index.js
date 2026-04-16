/**
 * Stats module barrel — domain-focused imports.
 *
 * Use these focused imports instead of the monolithic generateInsights:
 *   import { computeLineupStats } from '@/utils/stats/lineup';
 *   import { generateInsights } from '@/utils/stats/insights';
 *
 * This is a transitional barrel — the implementation still lives in
 * generateInsights.js (1120 lines). Future refactor (Faza 2) will
 * split that file into separate implementations under this folder.
 *
 * Existing callers that import from '../utils/generateInsights' continue
 * to work unchanged.
 */

// ─── Basic metrics ───
export {
  computeFiftyReached,
  computeAvgRunners,
  computePositionKills,
  computeSideVulnerability,
  computeUncoveredZones,
  computePlayerDependency,
  computeLateBreakRate,
} from '../generateInsights';

// ─── Insights + counters (coaching narrative) ───
export {
  generateInsights,
  generateCounters,
  INSIGHT_COLORS,
  INSIGHT_ICONS,
  COUNTER_COLORS,
} from '../generateInsights';

// ─── Lineup analysis (pairs/trios) ───
export {
  computeLineupStats,
} from '../generateInsights';

// ─── Field helpers (bunker matching) ───
export {
  findNearestBunker,
  findPrecisionShotBunker,
  computeKillCredit,
  computeBreakBunkers,
} from '../generateInsights';

// ─── Tactical signals (targets, shot direction) ───
export {
  computeShotTargets,
  computeTacticalSignals,
} from '../generateInsights';

// ─── Player summaries ───
export {
  computePlayerSummaries,
} from '../generateInsights';
