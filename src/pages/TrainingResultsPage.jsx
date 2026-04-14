import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { SectionTitle, SectionLabel, EmptyState, SkeletonList } from '../components/ui';
import { useTrainings, useMatchups, usePlayers } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';

/**
 * TrainingResultsPage — player leaderboard for a training session (§ 32 step 4).
 *
 * Route: /training/:trainingId/results
 */
const SQUAD_META = {
  red:    { name: 'R1',    color: '#ef4444' },
  blue:   { name: 'R2',   color: '#3b82f6' },
  green:  { name: 'R3',  color: '#22c55e' },
  yellow: { name: 'R4', color: '#eab308' },
};

export default function TrainingResultsPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { trainings, loading: tLoading } = useTrainings();
  const { matchups, loading: mLoading } = useMatchups(trainingId);
  const { players } = usePlayers();

  const training = trainings.find(t => t.id === trainingId);

  // Fetch all points across all matchups for the leaderboard.
  const [allPoints, setAllPoints] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!trainingId) return;
    ds.fetchAllTrainingPoints(trainingId)
      .then(pts => { if (!cancelled) setAllPoints(pts); })
      .catch(e => { console.error('Fetch training points failed:', e); if (!cancelled) setAllPoints([]); });
    return () => { cancelled = true; };
  }, [trainingId, matchups.length]);

  const leaderboard = useMemo(() => {
    if (!training || !allPoints) return [];
    const stats = {}; // { playerId: { played, wins, losses, draws } }
    const ensure = (pid) => {
      if (!stats[pid]) stats[pid] = { played: 0, wins: 0, losses: 0, draws: 0 };
      return stats[pid];
    };

    allPoints.forEach(pt => {
      // Each point has matchup-level metadata + homeData/awayData.
      const home = pt.homeData || pt.teamA || {};
      const away = pt.awayData || pt.teamB || {};
      const outcome = pt.outcome;

      const homePlayers = (home.assignments || home.players || []).filter(Boolean);
      const awayPlayers = (away.assignments || away.players || []).filter(Boolean);

      const record = (pid, won, lost) => {
        const s = ensure(pid);
        s.played++;
        if (won) s.wins++;
        else if (lost) s.losses++;
        else s.draws++;
      };

      homePlayers.forEach(pid => {
        const w = outcome === 'win_a';
        const l = outcome === 'win_b';
        record(pid, w, l);
      });
      awayPlayers.forEach(pid => {
        const w = outcome === 'win_b';
        const l = outcome === 'win_a';
        record(pid, w, l);
      });
    });

    const attendees = training.attendees || [];
    const rows = attendees
      .map(pid => {
        const player = players.find(p => p.id === pid);
        if (!player) return null;
        const s = stats[pid] || { played: 0, wins: 0, losses: 0, draws: 0 };
        const winRate = s.played > 0 ? Math.round((s.wins / s.played) * 100) : null;
        const diff = s.wins - s.losses;
        return {
          playerId: pid,
          name: player.nickname || player.name || '?',
          number: player.number,
          played: s.played,
          wins: s.wins,
          losses: s.losses,
          diff,
          winRate,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Played desc → win rate desc → diff desc
        if (a.played !== b.played) return b.played - a.played;
        if ((a.winRate ?? -1) !== (b.winRate ?? -1)) return (b.winRate ?? -1) - (a.winRate ?? -1);
        return b.diff - a.diff;
      });

    return rows;
  }, [training, allPoints, players]);

  if (tLoading || mLoading || allPoints === null) {
    return <div style={{ padding: SPACE.lg }}><SkeletonList count={5} /></div>;
  }
  if (!training) return <EmptyState icon="⏳" text="Training not found" />;

  const totalPoints = allPoints.length;
  const matchupCount = matchups.length;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: () => navigate(`/training/${trainingId}`) }}
        title="Results"
        subtitle={training.date || 'Practice'}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, paddingBottom: 32 }}>
        {/* Info line */}
        <div style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.xs,
          color: COLORS.textMuted,
          padding: `${SPACE.xs}px ${SPACE.sm}px`,
          marginBottom: SPACE.md,
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.md,
          display: 'inline-block',
        }}>
          {totalPoints} scouted {totalPoints === 1 ? 'point' : 'points'} · {matchupCount} matchup{matchupCount === 1 ? '' : 's'}
        </div>

        {/* Player leaderboard */}
        <SectionTitle>Players</SectionTitle>
        {leaderboard.length === 0 ? (
          <EmptyState icon="🏴" text="No scouted data yet" />
        ) : (
          leaderboard.map((row, i) => (
            <PlayerRow key={row.playerId} row={row} rank={i + 1}
              onClick={() => navigate(`/player/${row.playerId}/stats?scope=training&tid=${trainingId}`)}
            />
          ))
        )}

        {/* Matchup history */}
        {matchups.length > 0 && (
          <div style={{ marginTop: SPACE.xl }}>
            <SectionLabel>Matchups</SectionLabel>
            {matchups.map(m => {
              const home = SQUAD_META[m.homeSquad] || { name: m.homeSquad, color: COLORS.textMuted };
              const away = SQUAD_META[m.awaySquad] || { name: m.awaySquad, color: COLORS.textMuted };
              const sA = m.scoreA || 0, sB = m.scoreB || 0;
              return (
                <div key={m.id}
                  onClick={() => navigate(`/training/${trainingId}/matchup/${m.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: SPACE.md,
                    padding: '12px 14px', marginBottom: SPACE.xs,
                    background: COLORS.surfaceDark,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: RADIUS.lg,
                    cursor: 'pointer', minHeight: 52,
                  }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                    color: home.color,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: home.color }} />
                    {home.name}
                  </span>
                  <span style={{
                    flex: 1, textAlign: 'center',
                    fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 800, color: COLORS.text,
                  }}>
                    {sA}<span style={{ color: '#2a3548' }}>:</span>{sB}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                    color: away.color,
                  }}>
                    {away.name}
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: away.color }} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ row, rank, onClick }) {
  const wrColor = row.winRate == null
    ? COLORS.textMuted
    : row.winRate >= 60 ? '#22c55e' : row.winRate >= 40 ? COLORS.accent : '#ef4444';
  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: SPACE.md,
        padding: '12px 14px', marginBottom: SPACE.xs,
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        cursor: 'pointer',
        minHeight: 52,
      }}>
      <span style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 800,
        color: '#334155', width: 22, textAlign: 'right',
      }}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {row.number ? `#${row.number} ` : ''}{row.name}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 500, color: '#475569', marginTop: 2,
        }}>
          {row.played} pts · {row.wins}W-{row.losses}L{row.diff !== 0 ? ` (${row.diff > 0 ? '+' : ''}${row.diff})` : ''}
        </div>
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 15, fontWeight: 800, color: wrColor,
        minWidth: 44, textAlign: 'right',
      }}>
        {row.winRate == null ? '—' : `${row.winRate}%`}
      </span>
    </div>
  );
}
