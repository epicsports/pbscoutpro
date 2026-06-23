// Shared match classification — 'live' | 'scheduled' | 'completed'.
//
// Hand-rolled identically in ScoutTabContent, CoachTabContent, and
// AppShellPremiumWide (ScoutWide). Extracted so the three stay in lockstep:
//   - closed match            → 'completed'
//   - any live point count OR a cached score (m.scoreA/B) > 0 → 'live'
//     (cached score covers the first paint before the live listener fires)
//   - otherwise               → 'scheduled'
export function classifyMatch(m, liveScores = {}) {
  if (m.status === 'closed') return 'completed';
  const liveCount = liveScores[m.id]?.count ?? 0;
  if (liveCount > 0 || (m.scoreA || 0) > 0 || (m.scoreB || 0) > 0) return 'live';
  return 'scheduled';
}
