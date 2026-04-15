import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionTitle, SectionLabel, EmptyState, SkeletonList } from '../ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches } from '../../hooks/useFirestore';
import { computeTeamRecords } from '../../utils/teamStats';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';

/**
 * CoachTabContent — minimal team cards (W-L) on top, compact match list below.
 * Extracted from TournamentPage coach mode (DESIGN_DECISIONS § 26 § 31).
 *
 * Card design (§ 26): ONE touch target → ScoutedTeamPage. Just name + W-L.
 * No chevrons, no logos, no point diff, no win%. All detail on drill-down.
 */
export default function CoachTabContent({ tournamentId }) {
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { scouted, loading } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);

  const tournament = tournaments.find(t => t.id === tournamentId);
  const isPractice = tournament?.type === 'practice';

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

  const filteredMatches = resolvedDivision === 'all'
    ? matches
    : matches.filter(m => m.division === resolvedDivision);

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

      {/* Teams (minimal W-L cards) */}
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

      {/* Compact match list — coach taps score for review */}
      <div>
        <SectionTitle>Matches ({filteredMatches.length})</SectionTitle>
        {filteredMatches.length === 0 && <EmptyState icon="⚔️" text="No matches yet" />}
        {filteredMatches.map(m => (
          <CompactMatchRow key={m.id} m={m} tournamentId={tournamentId} scouted={scouted} teams={teams} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}

function CompactMatchRow({ m, tournamentId, scouted, teams, navigate }) {
  const sA = m.scoreA || 0, sB = m.scoreB || 0;
  const hasScore = sA > 0 || sB > 0;
  const isClosed = m.status === 'closed';
  const isLive = !isClosed && hasScore;

  const nameOf = (sid) => {
    const s = scouted.find(x => x.id === sid);
    const t = s ? teams.find(x => x.id === s.teamId) : null;
    return t?.name || '?';
  };

  return (
    <div onClick={() => navigate(`/tournament/${tournamentId}/match/${m.id}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: SPACE.md,
        padding: '12px 14px',
        background: COLORS.surfaceDark,
        border: `1px solid ${isLive ? `${COLORS.accent}25` : COLORS.border}`,
        borderRadius: RADIUS.lg,
        marginBottom: SPACE.xs,
        cursor: 'pointer',
        opacity: isClosed ? 0.6 : 1,
        minHeight: 52,
      }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {nameOf(m.teamA)} <span style={{ color: COLORS.textMuted }}>vs</span> {nameOf(m.teamB)}
        </div>
        {m.division && (
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
            {m.division}
          </div>
        )}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 800,
        color: hasScore ? COLORS.text : COLORS.borderLight,
        flexShrink: 0,
      }}>
        {hasScore ? `${sA}:${sB}` : '— : —'}
      </div>
      {isLive && (
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 800,
          padding: '3px 7px', borderRadius: RADIUS.xs,
          background: `${COLORS.accent}18`, color: COLORS.accent,
          letterSpacing: '.4px',
        }}>LIVE</span>
      )}
      {isClosed && (
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 800,
          padding: '3px 7px', borderRadius: RADIUS.xs,
          background: `${COLORS.success}18`, color: COLORS.success,
          letterSpacing: '.4px',
        }}>FINAL</span>
      )}
    </div>
  );
}
