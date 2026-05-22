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

/**
 * § 72 — add `teamId` to a player's memberships (dedupe). The primary
 * (`teamId`) is preserved when still valid; otherwise the first existing
 * membership — else the added team — becomes primary. Returns the
 * `{teams, teamId}` patch; never overwrites an existing primary or memberships.
 * Shared by the TeamDetailPage quick-add button and the PlayerEditModal editor.
 */
export function withTeamAdded(player, teamId) {
  const cur = playerTeams(player);
  if (!teamId) return { teams: cur, teamId: player?.teamId ?? null };
  const teams = cur.includes(teamId) ? cur : [...cur, teamId];
  const keep = player?.teamId && teams.includes(player.teamId);
  return { teams, teamId: keep ? player.teamId : (cur[0] || teamId) };
}

/**
 * § 72 — remove `teamId` from a player's memberships. If the removed team was
 * the primary, the primary is reassigned to a remaining team (null when it was
 * the last) — never leaves a primary pointing at a team the player has left.
 */
export function withTeamRemoved(player, teamId) {
  const cur = playerTeams(player);
  const teams = cur.filter(t => t !== teamId);
  const primary = (player?.teamId && player.teamId !== teamId && teams.includes(player.teamId))
    ? player.teamId
    : (teams[0] || null);
  return { teams, teamId: primary };
}
