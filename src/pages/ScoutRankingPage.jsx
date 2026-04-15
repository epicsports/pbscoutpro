/**
 * ScoutRankingPage — leaderboard of scouts by data quality × volume.
 * DESIGN_DECISIONS § 33.
 *
 * Card: rank + initial avatar + name + points count + composite % + stars.
 * Tap → /scouts/:uid (detail).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Btn, Loading, EmptyState, Select } from '../components/ui';
import { useTournaments } from '../hooks/useFirestore';
import { useUserNames, fallbackScoutLabel } from '../hooks/useUserNames';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';
import { computeScoutStats, scoutStars, compositeColor } from '../utils/scoutStats';

export default function ScoutRankingPage() {
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('global'); // 'global' | 'tournament'
  const [selectedTournamentId, setSelectedTournamentId] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!tournaments.length) { setPoints([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const all = [];
      for (const t of tournaments) {
        try {
          const matches = await ds.fetchMatches(t.id);
          if (!matches.length) continue;
          const mids = matches.map(m => m.id);
          const pts = await ds.fetchPointsForMatches(t.id, mids);
          pts.forEach(p => all.push({ ...p, tournamentId: t.id }));
        } catch (e) { /* skip tournament on error */ }
        if (cancelled) return;
      }
      if (cancelled) return;
      setPoints(all);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tournaments]);

  // Default the tournament picker to the first tournament the first time we
  // flip into tournament scope.
  useEffect(() => {
    if (scope === 'tournament' && !selectedTournamentId && tournaments.length) {
      setSelectedTournamentId(tournaments[0].id);
    }
  }, [scope, selectedTournamentId, tournaments]);

  const filteredPoints = useMemo(() => {
    if (scope === 'tournament' && selectedTournamentId)
      return points.filter(p => p.tournamentId === selectedTournamentId);
    return points;
  }, [points, scope, selectedTournamentId]);

  const stats = useMemo(() => computeScoutStats(filteredPoints), [filteredPoints]);
  const uids = useMemo(() => stats.map(s => s.uid), [stats]);
  const names = useUserNames(uids);

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', paddingBottom: 80 }}>
      <PageHeader back={{ to: '/' }} title="Scout ranking" subtitle="DATA QUALITY × VOLUME" />

      <div style={{
        display: 'flex', alignItems: 'center', gap: SPACE.sm,
        padding: `${SPACE.md}px ${SPACE.lg}px 0`, flexWrap: 'wrap',
      }}>
        <Btn variant="default" size="sm" active={scope === 'global'}
          onClick={() => setScope('global')}>Global</Btn>
        <Btn variant="default" size="sm" active={scope === 'tournament'}
          onClick={() => setScope('tournament')}>Tournament</Btn>
        {scope === 'tournament' && (
          <Select value={selectedTournamentId} onChange={setSelectedTournamentId}
            style={{ flex: 1, minWidth: 140 }}>
            {tournaments.length === 0 && <option value="">— no tournaments —</option>}
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.year ? ` · ${t.year}` : ''}
              </option>
            ))}
          </Select>
        )}
      </div>

      {loading ? (
        <Loading text="Loading scouted points..." />
      ) : stats.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <EmptyState icon="👤" text="No scouts yet" subtitle="Scout some points to start the leaderboard." />
        </div>
      ) : (
        <div style={{ padding: SPACE.lg, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.map((s, idx) => {
            const name = names[s.uid] || fallbackScoutLabel(s.uid);
            return (
              <ScoutCard
                key={s.uid}
                rank={idx + 1}
                name={name}
                points={s.points}
                composite={s.composite}
                stars={scoutStars(s.composite)}
                onClick={() => navigate(`/scouts/${s.uid}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoutCard({ rank, name, points, composite, stars, onClick }) {
  const color = compositeColor(composite);
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div
      onClick={onClick}
      style={{
        background: '#0f172a',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', minHeight: 60,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        fontFamily: FONT, fontSize: 18, fontWeight: 800,
        color: '#334155', width: 24, textAlign: 'center', flexShrink: 0,
      }}>{rank}</span>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: '#0b1120', border: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontWeight: 700, fontSize: 14, color: COLORS.text,
        flexShrink: 0,
      }}>{initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 600,
          color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{name}</div>
        <div style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#475569', marginTop: 2,
        }}>
          {points} point{points === 1 ? '' : 's'} · {composite}% quality
        </div>
      </div>
      <div style={{
        fontFamily: FONT, fontSize: 12, fontWeight: 700, color,
        letterSpacing: 1,
      }}>
        {'★'.repeat(stars)}<span style={{ color: '#334155' }}>{'★'.repeat(5 - stars)}</span>
      </div>
    </div>
  );
}
