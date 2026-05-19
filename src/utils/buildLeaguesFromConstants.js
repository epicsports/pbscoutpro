import { LEAGUES, DIVISIONS } from './theme';

// Convert legacy LEAGUES + DIVISIONS constants into Firestore-shape array
// matching DESIGN_DECISIONS § 63.15.1 schema. Used by useLeagues() hook as
// synchronous fallback when Firestore fetch hasn't resolved yet or fails.
//
// Output shape mirrors /leagues/{leagueId} docs created by Phase 2.1a
// bootstrap script (scripts/migration/phase_2_1a_bootstrap_leagues.cjs).
// Division id conversion regex matches the bootstrap script exactly so
// fallback and Firestore data are indistinguishable to consumers.
export function buildLeaguesFromConstants() {
  return LEAGUES.map(shortName => ({
    id: `l_${shortName.toLowerCase()}`,
    name: shortName,
    shortName,
    region: null,
    parentLeagueFamily: null,
    divisions: (DIVISIONS[shortName] || []).map((divName, i) => ({
      id: divName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: divName,
      order: i + 1,
    })),
    active: true,
    createdBy: 'constants-fallback',
  }));
}
