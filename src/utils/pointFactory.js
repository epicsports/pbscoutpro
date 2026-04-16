/**
 * Point data factory — shared helpers for building training/match point documents.
 * Replaces duplicated emptyData/makeData helpers from TrainingScoutTab and old TrainingPage.
 */

/**
 * Base shape for one side of a point (home or away).
 * shots uses {} (not Array(5).fill([])) — Firestore rejects nested arrays.
 */
function baseSide(side) {
  return {
    players: Array(5).fill(null),
    assignments: Array(5).fill(null),
    shots: {},
    eliminations: Array(5).fill(false),
    eliminationPositions: Array(5).fill(null),
    quickShots: {},
    obstacleShots: {},
    bumpStops: Array(5).fill(null),
    runners: Array(5).fill(false),
    fieldSide: side,
  };
}

/**
 * Empty side (no assignments). Roster provided for continuity, but all slots null.
 */
export function createEmptyPointData(rosterArr, side) {
  const data = baseSide(side);
  // Pre-populate assignments from roster so UI knows who *could* play
  rosterArr.forEach((p, i) => { if (i < 5) data.assignments[i] = p.id; });
  return data;
}

/**
 * Populated side with assignments, positions (from zones), for a given squad.
 * @param rosterArr - squad players array
 * @param assignments - full 5-slot array of player IDs (from QuickLog)
 * @param zonePlayers - optional 5-slot array of {x, y} positions
 * @param side - 'left' | 'right'
 */
export function createPointData(rosterArr, assignments, zonePlayers, side) {
  const data = baseSide(side);
  const squadIds = new Set(rosterArr.map(p => p.id));
  const selectedIds = assignments.filter(id => id && squadIds.has(id));
  const pidsForSquad = selectedIds.length ? selectedIds : rosterArr.map(p => p.id);

  pidsForSquad.forEach((id, i) => {
    if (i >= 5) return;
    data.assignments[i] = id;
    if (zonePlayers) {
      const origIdx = assignments.indexOf(id);
      if (origIdx >= 0) data.players[i] = zonePlayers[origIdx] || null;
    }
  });

  return data;
}
