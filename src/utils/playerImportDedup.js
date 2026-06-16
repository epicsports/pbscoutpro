// Player-import dedup resolver (CC_BRIEF_PLAYER_DEDUP, 2026-06-16).
//
// Decides what to do with a CSV import row that carries a pbliId but has NO existing
// pbliId match (the duplicate-creating gap — see the brief). pbliId is the primary key;
// a duplicate = same exact first+last name with one doc bearing a pbliId and one not.
//
// Policy (ratified): OBVIOUS → auto-claim, AMBIGUOUS → flag a super-admin to reconcile.
//   - 0 existing same-name docs                       → 'create' (genuinely new player).
//   - exactly 1 existing same-name doc, pbliId-LESS   → 'claim'  (stamp pbliId + append team).
//   - 1 with a (different) pbliId, OR 2+ same-name     → 'flag'   (ambiguous; create + flag).
// Conservative by design: auto-claim ONLY the single unambiguous pbliId-less namesake; any
// other shape is flagged (identity merges are irreversible-ish — default to human review).

/** Exact-name normalizer: trim, collapse internal whitespace, lowercase. Matches the
 *  existing import name-compare (plain lowercase) — intentionally NOT diacritic-stripping,
 *  to avoid over-merging distinct accented names. */
export function normName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * @param {string} rowName  the CSV row's player name
 * @param {Array}  players  the global catalog (each {id, name, pbliId, ...})
 * @returns {{ action: 'create'|'claim'|'flag', targetId: string|null, candidateIds: string[] }}
 */
export function resolvePbliImport(rowName, players) {
  const key = normName(rowName);
  if (!key) return { action: 'create', targetId: null, candidateIds: [] };
  const sameName = (Array.isArray(players) ? players : []).filter(p => normName(p.name) === key);
  if (sameName.length === 0) {
    return { action: 'create', targetId: null, candidateIds: [] };
  }
  if (sameName.length === 1 && !sameName[0].pbliId) {
    return { action: 'claim', targetId: sameName[0].id, candidateIds: [sameName[0].id] };
  }
  // exactly 1 but it already has a (different) pbliId, OR 2+ same-name docs → ambiguous.
  return { action: 'flag', targetId: null, candidateIds: sameName.map(p => p.id) };
}
