import { useMemo } from 'react';
import { useWorkspace } from './useWorkspace';
import { useTrainings, useLayouts, useTeams } from './useFirestore';

/**
 * PPT identity + session-context resolver.
 * See DESIGN_DECISIONS § 48.2 for the entry-flow spec.
 *
 * Composes existing hooks (no new Firestore reads) — pulls:
 * - linkedPlayer from useWorkspace (the player doc matched to this user's
 *   uid at workspace level; null when the user isn't a player or the link
 *   hasn't been established via § 38.12 onboarding)
 * - trainings from useTrainings (workspace-wide list; we filter client-side)
 * - teams from useTeams (to expand player's team into parent + sibling set
 *   — a player on a child team should see trainings scheduled for the
 *   parent team too, and vice versa)
 * - layouts from useLayouts (to resolve active layout when exactly one
 *   training is LIVE)
 *
 * Returns:
 *   playerId         — string | null. Null ⇒ render "no player profile linked"
 *                      fallback; the route should not enter the wizard.
 *   player           — full linkedPlayer doc or null.
 *   teamIds          — array of team ids for this player (own + parent +
 *                      siblings), exposed so the picker can filter the
 *                      trainings collection without re-deriving the set.
 *   teamTrainings    — every training whose `teamId` is in teamIds, ALL
 *                      statuses (live / upcoming / closed). Sorted:
 *                      LIVE first, then date-desc.
 *   liveTrainings    — subset of teamTrainings with status === 'live'.
 *   activeLayout     — the Layout doc for liveTrainings[0]?.layoutId, OR null
 *                      when needsPicker is true (layout can't be resolved
 *                      until the user picks a training).
 *   needsPicker      — true when liveTrainings.length !== 1. The route
 *                      renders the picker in that case; otherwise it
 *                      auto-enters the wizard with liveTrainings[0] as
 *                      context.
 *   loading          — true while any of the underlying subscriptions are
 *                      still settling. needsPicker is meaningless until
 *                      loading === false.
 *
 * @returns {{ playerId, player, teamIds, teamTrainings, liveTrainings,
 *             activeLayout, needsPicker, loading }}
 */
export function usePPTIdentity() {
  const { linkedPlayer } = useWorkspace();
  const { trainings, loading: tLoading } = useTrainings();
  const { layouts, loading: lLoading } = useLayouts();
  const { teams, loading: tmLoading } = useTeams();

  const loading = tLoading || lLoading || tmLoading;
  const playerId = linkedPlayer?.id || null;

  // Team expansion — the player's teamId plus:
  //   - its parentTeamId (if the player is on a child team), so they can
  //     see trainings run by the parent roster
  //   - any child teams of their own team (if they're on the parent)
  // Covers the common case where Ranger coaches schedule one "Ranger"
  // training visible to Ring / Rage / Rebel / Rush alike.
  const teamIds = useMemo(() => {
    if (!linkedPlayer?.teamId || !Array.isArray(teams)) return [];
    const own = linkedPlayer.teamId;
    const set = new Set([own]);
    const ownTeam = teams.find(t => t.id === own);
    if (ownTeam?.parentTeamId) set.add(ownTeam.parentTeamId);
    teams.forEach(t => { if (t.parentTeamId === own) set.add(t.id); });
    return [...set];
  }, [linkedPlayer?.teamId, teams]);

  const teamTrainings = useMemo(() => {
    if (!playerId || teamIds.length === 0) return [];
    const filtered = (trainings || []).filter(tr => teamIds.includes(tr.teamId));
    // Sort: LIVE first, then by date desc (most recent first). Dates are
    // stored as ISO yyyy-mm-dd so lexical compare works. The picker
    // applies its own ended-trainings cap downstream.
    const rank = (tr) => tr.status === 'live' ? 0 : 1;
    return [...filtered].sort((a, b) => {
      const ra = rank(a); const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (b.date || '').localeCompare(a.date || '');
    });
  }, [trainings, playerId, teamIds]);

  const liveTrainings = useMemo(
    () => teamTrainings.filter(t => t.status === 'live'),
    [teamTrainings]
  );

  const needsPicker = liveTrainings.length !== 1;

  const activeLayout = useMemo(() => {
    if (needsPicker) return null;
    const layoutId = liveTrainings[0]?.layoutId;
    if (!layoutId) return null;
    return (layouts || []).find(l => l.id === layoutId) || null;
  }, [liveTrainings, layouts, needsPicker]);

  return {
    playerId,
    player: linkedPlayer,
    teamIds,
    teamTrainings,
    liveTrainings,
    activeLayout,
    needsPicker,
    loading,
  };
}
