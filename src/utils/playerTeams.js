/**
 * § 72 — multi-team player membership.
 *
 * A player can be rostered on multiple teams (pro players across regions).
 *   - `player.teams[]` — array of teamIds the player is DIRECTLY rostered on.
 *   - `player.teamId`  — the PRIMARY team (display / header / back-compat).
 *
 * `teams[]` is direct-only — a child-team membership does NOT imply the
 * parent. Parent-roster aggregation stays at the read sites (they expand
 * `[parentId, ...childIds]` from team-doc `parentTeamId`). See § 72.
 *
 * On-read fallback covers docs not yet carrying `teams[]` (no migration
 * script needed): a doc with only `teamId` resolves to `[teamId]`.
 *
 * Roster reads MUST use playerOnTeam() — never `player.teamId === X`
 * (PROJECT_GUIDELINES § 9).
 */

/** Effective list of teamIds the player is directly rostered on. */
export function playerTeams(player) {
  if (!player) return [];
  if (Array.isArray(player.teams) && player.teams.length > 0) return player.teams;
  return player.teamId ? [player.teamId] : [];
}

/** True when the player is rostered on `teamId` (multi-team aware). */
export function playerOnTeam(player, teamId) {
  return !!teamId && playerTeams(player).includes(teamId);
}
