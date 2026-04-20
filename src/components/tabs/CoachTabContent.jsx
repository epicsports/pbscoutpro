import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionTitle, SectionLabel, EmptyState, SkeletonList } from '../ui';
import MatchCard from '../MatchCard';
import { useTournaments, useTeams, useScoutedTeams, useMatches } from '../../hooks/useFirestore';
import { computeTeamRecords } from '../../utils/teamStats';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';

/**
 * CoachTabContent — teams with W-L on top, grouped match list below.
 * Extracted from TournamentPage coach mode (DESIGN_DECISIONS § 26 § 31).
 *
 * Team card design (§ 26): ONE touch target → ScoutedTeamPage. Just name + W-L.
 * No chevrons, no logos, no point diff, no win%. All detail on drill-down.
 *
 * Match list: split-tap MatchCard (shared with ScoutTabContent) so coach can
 * jump into scouting a specific side directly from Coach tab without a detour
 * through Scout tab. Grouped into Live / Scheduled / Completed matching the
 * pre-§ 31 TournamentPage behavior. Claim state (concurrent-scouting awareness)
 * + per-side "tap to scout" lives inside MatchCard.
 */
export default function CoachTabContent({ tournamentId }) {
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { scouted, loading } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);

  const tournament = tournaments.find(t => t.id === tournamentId);
  const isPractice = tournament?.type === 'practice';
  const isClosed = tournament?.status === 'closed';

  const [activeDivision, setActiveDivision] = useState(null);
  const resolvedDivision = activeDivision || tournament?.divisions?.[0] || 'all';

  const records = useMemo(() => computeTeamRecords(matches, scouted), [matches, scouted]);

  const divisionScouted = useMemo(() => {
    const filtered = resolvedDivision === 'all'
      ? scouted
      : scouted.filter(st => st.division === resolvedDivision);
    return [...filtered].sort((a, b) => {
      const rA = records[a.id] || { wins: 0, losses: 0, played: 0 };
      const rB = records[b.id] || { wins: 0, losses: 0, played: 0 };
      if (rA.played !== rB.played) return rB.played - rA.played;
      if (rA.wins !== rB.wins) return rB.wins - rA.wins;
      return rA.losses - rB.losses;
    });
  }, [scouted, resolvedDivision, records]);

  // Filter by division, then classify into Live / Scheduled / Completed so
  // MatchCard receives the right `status` and groups render under labels.
  const filteredMatches = useMemo(() => (
    resolvedDivision === 'all'
      ? matches
      : matches.filter(m => m.division === resolvedDivision)
  ), [matches, resolvedDivision]);

  const classify = (m) => {
    const hasScore = (m.scoreA || 0) > 0 || (m.scoreB || 0) > 0;
    if (m.status === 'closed') return 'completed';
    if (hasScore) return 'live';
    return 'scheduled';
  };

  // Sort within each group by createdAt descending (newest first) as a safe
  // default — match docs carry createdAt timestamps from addMatch.
  const sortByNewest = (a, b) => {
    const ta = a.createdAt?.seconds ?? a.createdAt ?? 0;
    const tb = b.createdAt?.seconds ?? b.createdAt ?? 0;
    return tb - ta;
  };

  const live = filteredMatches.filter(m => classify(m) === 'live').sort(sortByNewest);
  const scheduled = filteredMatches.filter(m => classify(m) === 'scheduled').sort(sortByNewest);
  const completed = filteredMatches.filter(m => classify(m) === 'completed').sort(sortByNewest);

  // Resolver closure passed into MatchCard — it avoids fetching teams/scouted
  // again inside the card. Matches the pattern used by ScoutTabContent.
  const getTeamName = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    const t = s ? teams.find(x => x.id === s.teamId) : null;
    return t?.name || '?';
  };

  if (!tournament) return <EmptyState icon="⏳" text="Loading..." />;

  return (
    <div style={{
      padding: SPACE.lg,
      paddingBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE.md,
    }}>
      {/* Division pill filter */}
      {!isPractice && (tournament.divisions?.length > 0) && (
        <div style={{
          display: 'flex',
          background: COLORS.surface,
          borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border}`,
          padding: 3,
          flexShrink: 0,
        }}>
          {tournament.divisions.map(d => (
            <div key={d} onClick={() => setActiveDivision(d)}
              style={{
                flex: 1, padding: `${SPACE.sm}px ${SPACE.xs}px`,
                borderRadius: RADIUS.md,
                fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                cursor: 'pointer', textAlign: 'center',
                color: resolvedDivision === d ? COLORS.accent : COLORS.textMuted,
                background: resolvedDivision === d ? COLORS.surfaceLight : 'transparent',
                transition: 'all .12s',
                minHeight: 44,
              }}>
              {d}
            </div>
          ))}
        </div>
      )}

      {/* Teams (minimal W-L cards — § 26 keeps this deliberately sparse) */}
      <div>
        <SectionTitle>Teams ({divisionScouted.length})</SectionTitle>
        {loading && <SkeletonList count={3} />}
        {!loading && divisionScouted.length === 0 && (
          <EmptyState icon="🏴" text="No teams yet" />
        )}
        {divisionScouted.map(st => {
          const gt = teams.find(g => g.id === st.teamId);
          if (!gt) return null;
          const rec = records[st.id] || { wins: 0, losses: 0, played: 0 };
          return (
            <div key={st.id}
              onClick={() => navigate(`/tournament/${tournamentId}/team/${st.id}`)}
              style={{
                background: COLORS.surfaceDark,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                marginBottom: 4,
                cursor: 'pointer',
                transition: 'background .12s',
                minHeight: 52,
              }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                padding: '14px 16px', gap: 12,
              }}>
                <span style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600,
                  color: COLORS.text, flex: 1, letterSpacing: '-.1px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{gt.name}</span>
                {rec.played > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: FONT, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    <span style={{ color: COLORS.success }}>{rec.wins}W</span>
                    <span style={{ color: COLORS.surfaceLight }}>·</span>
                    <span style={{ color: COLORS.danger }}>{rec.losses}L</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Split-tap match list — grouped Live / Scheduled / Completed with
          amber label on Live group, mirrors ScoutTabContent for consistency. */}
      <div>
        <SectionTitle>Matches ({filteredMatches.length})</SectionTitle>

        {filteredMatches.length === 0 && (
          <EmptyState icon="⚔️" text="No matches yet" />
        )}

        {live.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel color={COLORS.accent}>Live ({live.length})</SectionLabel>
            {live.map(m => (
              <MatchCard key={m.id} m={m} status="live" tournamentId={tournamentId}
                getTeamName={getTeamName} navigate={navigate} readOnly={isClosed} />
            ))}
          </div>
        )}

        {scheduled.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            {(live.length > 0 || completed.length > 0) && <SectionLabel>Scheduled ({scheduled.length})</SectionLabel>}
            {scheduled.map(m => (
              <MatchCard key={m.id} m={m} status="scheduled" tournamentId={tournamentId}
                getTeamName={getTeamName} navigate={navigate} readOnly={isClosed} />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel>Completed ({completed.length})</SectionLabel>
            {completed.map(m => (
              <MatchCard key={m.id} m={m} status="completed" tournamentId={tournamentId}
                getTeamName={getTeamName} navigate={navigate} readOnly={isClosed} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
