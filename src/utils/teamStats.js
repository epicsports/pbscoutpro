/**
 * Compute W-L record and point differential for each scouted team
 * from match data (already loaded, zero additional queries).
 *
 * @param {Array} matches - all matches in tournament
 * @param {Array} scouted - scouted team entries
 * @returns {Object} { [scoutedTeamId]: { wins, losses, ptsFor, ptsAgainst, played, winRate, diff } }
 */
export function computeTeamRecords(matches, scouted) {
  const records = {};
  scouted.forEach(st => {
    records[st.id] = { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, played: 0 };
  });

  matches.forEach(m => {
    const sA = m.scoreA || 0;
    const sB = m.scoreB || 0;
    // Only count matches with at least one score (not empty scheduled matches)
    if (sA === 0 && sB === 0) return;

    if (records[m.teamA] !== undefined) {
      records[m.teamA].played++;
      records[m.teamA].ptsFor += sA;
      records[m.teamA].ptsAgainst += sB;
      if (sA > sB) records[m.teamA].wins++;
      else if (sB > sA) records[m.teamA].losses++;
    }
    if (records[m.teamB] !== undefined) {
      records[m.teamB].played++;
      records[m.teamB].ptsFor += sB;
      records[m.teamB].ptsAgainst += sA;
      if (sB > sA) records[m.teamB].wins++;
      else if (sA > sB) records[m.teamB].losses++;
    }
  });

  // Add computed fields
  Object.values(records).forEach(r => {
    r.diff = r.ptsFor - r.ptsAgainst;
    r.winRate = r.played > 0 ? Math.round((r.wins / r.played) * 100) : null;
  });

  return records;
}
