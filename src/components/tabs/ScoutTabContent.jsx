import React from 'react';
import MatchListPremium from '../MatchListPremium';

/**
 * ScoutTabContent — phone Scout tab. Thin wrapper over the unified, responsive
 * MatchListPremium (single source of truth for the match-list scout launcher).
 * The entire view + data wiring (matches/teams/scouted/players, division
 * grouping, search, live scores, the 3 sections, the add-match/add-team modals,
 * the Preloader gate, the split-tap MatchCard routing) now lives in
 * MatchListPremium; this file preserves the MainPage mount + export name and
 * locks the phone path to `wide={false}` (single column, byte-identical to the
 * pre-unification ScoutTabContent). The tablet shell mounts the same component
 * with `wide`. See DESIGN_DECISIONS § 22, § 26, § 31.
 */
export default function ScoutTabContent({ tournamentId }) {
  return <MatchListPremium tournamentId={tournamentId} wide={false} />;
}
