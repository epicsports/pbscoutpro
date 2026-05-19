import { useLeagues } from './useLeagues';

// Convenience helper — returns divisions array for a given league
// shortName (e.g. 'NXL'). Returns empty array if league not found OR
// league has no divisions table. Pattern matches legacy
// `DIVISIONS[shortName] || []` semantics.
//
// Each division: { id, name, order }. Consumers should use `.name`
// for stored value to preserve compatibility with existing tournament
// /team data (see useLeagues comment for rationale).
export function useLeagueDivisions(shortName) {
  const leagues = useLeagues();
  if (!shortName) return [];
  const league = leagues.find(l => l.shortName === shortName);
  return league?.divisions || [];
}
