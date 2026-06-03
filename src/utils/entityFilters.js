/**
 * Search/filter kit — pure matchers (§ Search/filter unification).
 *
 * ONE canonical text matcher + the DERIVED division/league resolvers, replacing
 * the ~7× copy-pasted `(name||'').toLowerCase().includes(q)` idiom and centring
 * the "division-for-players is derived via team(s)" rule (Jacek-locked):
 *   a player matches a division/league if ANY of their teams is in it.
 *
 * Used by SearchFilterPanel / EntityPickerModal / useSearchFilter so every list
 * + picker filters identically.
 */
import { playerTeams } from './playerTeams';

/** Canonical text match: true when `query` is empty or hits any of `fields`. */
export function matchEntity(query, item, fields = ['name', 'nickname', 'number']) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  return fields.some(f => String(item?.[f] ?? '').toLowerCase().includes(q));
}

// ── Teams ──────────────────────────────────────────────────────────────────
/** A team is in `division` for `league` (no filter when `division` falsy). */
export function teamInDivision(team, division, league) {
  if (!division) return true;
  return (team?.divisions?.[league] ?? null) === division;
}
/** A team is in `league` (no filter when `league` falsy). teams carry leagues[]. */
export function teamInLeague(team, league) {
  if (!league) return true;
  return Array.isArray(team?.leagues) && team.leagues.includes(league);
}

// ── Players (DERIVED via team membership) ────────────────────────────────────
/** Set of divisions a player belongs to (via their teams) for `league`. */
export function playerDivisionSet(player, teamsById, league) {
  const set = new Set();
  playerTeams(player).forEach(tid => {
    const div = teamsById?.[tid]?.divisions?.[league];
    if (div) set.add(div);
  });
  return set;
}
/** A player matches `division` if ANY of their teams is in it (no filter when falsy). */
export function playerInDivision(player, division, teamsById, league) {
  if (!division) return true;
  return playerDivisionSet(player, teamsById, league).has(division);
}
/** A player matches `league` if ANY of their teams carries it (no filter when falsy). */
export function playerInLeague(player, league, teamsById) {
  if (!league) return true;
  return playerTeams(player).some(tid => {
    const ls = teamsById?.[tid]?.leagues;
    return Array.isArray(ls) && ls.includes(league);
  });
}
