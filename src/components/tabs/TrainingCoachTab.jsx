import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionTitle, SectionLabel, EmptyState, Input, Btn, ConfirmModal } from '../ui';
import { usePlayers, useMatchups, useLayoutInsights } from '../../hooks/useFirestore';
import * as ds from '../../services/dataService';
import { auth } from '../../services/firebase';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

export default function TrainingCoachTab({ trainingId, training, layoutId }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { matchups } = useMatchups(trainingId);
  const { players } = usePlayers();
  const { insights } = useLayoutInsights(layoutId);

  // ─── Leaderboard ───
  const [allPoints, setAllPoints] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!trainingId) return;
    ds.fetchAllTrainingPoints(trainingId)
      .then(pts => { if (!cancelled) setAllPoints(pts); })
      .catch(() => { if (!cancelled) setAllPoints([]); });
    return () => { cancelled = true; };
  }, [trainingId, matchups.length]);

  const leaderboard = useMemo(() => {
    if (!training || !allPoints) return [];
    const stats = {};
    const ensure = (pid) => { if (!stats[pid]) stats[pid] = { played: 0, wins: 0, losses: 0, zones: [] }; return stats[pid]; };

    const classifyZone = (pos) => {
      if (!pos || pos.y == null) return null;
      if (pos.y < 0.35) return 'D';
      if (pos.y > 0.65) return 'S';
      return 'C';
    };

    allPoints.forEach(pt => {
      const home = pt.homeData || pt.teamA || {};
      const away = pt.awayData || pt.teamB || {};
      const outcome = pt.outcome;
      const processSide = (side, isWin) => {
        const pids = (side.assignments || []).filter(Boolean);
        const positions = side.players || [];
        pids.forEach((pid, i) => {
          const s = ensure(pid);
          s.played++;
          if (isWin) s.wins++; else s.losses++;
          const z = classifyZone(positions[i]);
          if (z) s.zones.push(z);
        });
      };
      const homePids = (home.assignments || []).filter(Boolean);
      const awayPids = (away.assignments || []).filter(Boolean);
      if (homePids.length) processSide(home, outcome === 'win_a');
      if (awayPids.length) processSide(away, outcome === 'win_b');
    });

    const maxPlayed = Math.max(1, ...Object.values(stats).map(s => s.played));

    return (training.attendees || [])
      .map(pid => {
        const player = players.find(p => p.id === pid);
        if (!player) return null;
        const s = stats[pid] || { played: 0, wins: 0, losses: 0, zones: [] };
        const winRate = s.played > 0 ? Math.round((s.wins / s.played) * 100) : null;
        const zoneCount = { D: 0, C: 0, S: 0 };
        s.zones.forEach(z => { zoneCount[z]++; });
        const isHot = s.played >= 3 && winRate >= 60;
        const isCold = s.played >= 3 && winRate != null && winRate < 40;
        return {
          playerId: pid, name: player.nickname || player.name || '?', number: player.number,
          played: s.played, wins: s.wins, losses: s.losses, diff: s.wins - s.losses,
          winRate, zoneCount, isHot, isCold,
          loadPct: Math.round((s.played / maxPlayed) * 100),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.played - a.played || (b.winRate ?? -1) - (a.winRate ?? -1) || b.diff - a.diff);
  }, [training, allPoints, players]);

  // ─── Notes ───
  const [noteText, setNoteText] = useState('');
  const [deleteInsight, setDeleteInsight] = useState(null);

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text || !layoutId) return;
    await ds.addLayoutInsight(layoutId, {
      text,
      source: { type: 'training', id: trainingId },
      createdBy: auth.currentUser?.uid || null,
    });
    setNoteText('');
  };

  const totalPoints = allPoints?.length || 0;

  return (
    <div style={{ padding: SPACE.lg, paddingBottom: 100 }}>
      {/* Info badge */}
      {totalPoints > 0 && (
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted,
          padding: `${SPACE.xs}px ${SPACE.sm}px`, marginBottom: SPACE.md,
          background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.sm, display: 'inline-block',
        }}>
          {t('pts_matchups', totalPoints, matchups.length)}
        </div>
      )}

      {/* ─── Training Pulse ─── */}
      {leaderboard.length > 0 && (
        <>
          <SectionTitle>Pulse</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs, marginBottom: SPACE.xl }}>
            {leaderboard.map(row => {
              const wrColor = row.winRate == null ? COLORS.textMuted
                : row.isHot ? COLORS.success : row.isCold ? COLORS.danger : COLORS.text;
              const icon = row.isHot ? '🔥' : row.isCold ? '🧊' : '';
              const totalZones = row.zoneCount.D + row.zoneCount.C + row.zoneCount.S;
              return (
                <div key={row.playerId}
                  onClick={() => navigate(`/player/${row.playerId}/stats?scope=training&tid=${trainingId}`)}
                  style={{
                    padding: '10px 14px', background: COLORS.surfaceDark,
                    border: `1px solid ${row.isHot ? `${COLORS.success}25` : row.isCold ? `${COLORS.danger}25` : COLORS.border}`,
                    borderRadius: RADIUS.lg, cursor: 'pointer',
                  }}>
                  {/* Row 1: name + win rate */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                      }}>
                        {row.number ? `#${row.number} ` : ''}{row.name}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: FONT, fontSize: 18, fontWeight: 800, color: wrColor, minWidth: 48, textAlign: 'right',
                    }}>
                      {row.winRate == null ? '—' : `${row.winRate}%`}
                    </span>
                  </div>
                  {/* Row 2: workload bar + zone pills + pts */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    {/* Workload bar */}
                    <div style={{ flex: 1, height: 4, background: '#1a2234', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, width: `${row.loadPct}%`,
                        background: row.isHot ? COLORS.success : row.isCold ? COLORS.danger : COLORS.accent,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    {/* Zone pills */}
                    {totalZones > 0 && (
                      <div style={{ display: 'flex', gap: 2 }}>
                        {row.zoneCount.D > 0 && <ZonePill label="D" count={row.zoneCount.D} total={totalZones} color="#fb923c" />}
                        {row.zoneCount.C > 0 && <ZonePill label="C" count={row.zoneCount.C} total={totalZones} color="#94a3b8" />}
                        {row.zoneCount.S > 0 && <ZonePill label="S" count={row.zoneCount.S} total={totalZones} color="#22d3ee" />}
                      </div>
                    )}
                    {/* Points count */}
                    <span style={{
                      fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted,
                      minWidth: 30, textAlign: 'right',
                    }}>{row.played} pkt</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── Coach notes ─── */}
      <SectionTitle>{t('coach_notes')}</SectionTitle>
      {layoutId ? (
        <>
          <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.md }}>
            <div style={{ flex: 1 }}>
              <Input value={noteText} onChange={setNoteText} placeholder={t('note_ph')}
                onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
              />
            </div>
            <Btn variant="accent" onClick={handleAddNote} disabled={!noteText.trim()}
              style={{ minWidth: 44, minHeight: 44, padding: 0, fontSize: 20, fontWeight: 700 }}>+</Btn>
          </div>
          {insights.length === 0 && (
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
              textAlign: 'center', padding: SPACE.lg,
            }}>{t('no_notes')}</div>
          )}
          {insights.map(note => (
            <div key={note.id} style={{
              padding: '12px 14px', marginBottom: SPACE.xs,
              background: COLORS.surfaceDark, borderRadius: RADIUS.md,
              border: `1px solid ${COLORS.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500, color: COLORS.text, lineHeight: 1.45 }}>
                    {note.text}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {note.bunkerRef && (
                      <span style={{
                        fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.accent,
                        padding: '2px 7px', borderRadius: 5,
                        background: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}30`,
                      }}>{note.bunkerRef}</span>
                    )}
                    {(note.tags || []).map(tag => (
                      <span key={tag} style={{
                        fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textDim,
                        padding: '2px 7px', borderRadius: 5,
                        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                      }}>{tag}</span>
                    ))}
                    {note.source?.type && (
                      <span style={{
                        fontFamily: FONT, fontSize: 9, fontWeight: 600, color: COLORS.textMuted,
                        padding: '2px 6px', borderRadius: 4, background: COLORS.surface,
                      }}>{note.source.type}</span>
                    )}
                  </div>
                </div>
                <div onClick={() => setDeleteInsight(note)} style={{
                  color: COLORS.textMuted, fontSize: 14, cursor: 'pointer', padding: '0 4px',
                  WebkitTapHighlightColor: 'transparent',
                }}>×</div>
              </div>
            </div>
          ))}
          <div style={{
            fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, textAlign: 'center',
            marginTop: SPACE.sm, padding: '8px 12px', borderRadius: 8,
            background: `${COLORS.accent}08`, border: `1px solid ${COLORS.accent}15`,
          }}>
            {t('notes_hint')}
          </div>
        </>
      ) : (
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
          textAlign: 'center', padding: SPACE.lg,
        }}>{t('notes_no_layout')}</div>
      )}

      <ConfirmModal open={!!deleteInsight} onClose={() => setDeleteInsight(null)}
        title={t('delete_note')} message={deleteInsight?.text || ''}
        confirmLabel={t('delete')} danger
        onConfirm={async () => {
          if (layoutId && deleteInsight) await ds.deleteLayoutInsight(layoutId, deleteInsight.id);
          setDeleteInsight(null);
        }}
      />
    </div>
  );
}

function ZonePill({ label, count, total, color }) {
  return (
    <span style={{
      fontFamily: FONT, fontSize: 9, fontWeight: 700,
      color, padding: '2px 5px', borderRadius: 4,
      background: `${color}15`, border: `1px solid ${color}30`,
      letterSpacing: 0.3,
    }}>{label}{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
  );
}
