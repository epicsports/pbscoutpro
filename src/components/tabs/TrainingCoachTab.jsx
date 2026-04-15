import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionTitle, SectionLabel, EmptyState, Input, Btn, ConfirmModal } from '../ui';
import { usePlayers, useMatchups, useLayoutInsights } from '../../hooks/useFirestore';
import * as ds from '../../services/dataService';
import { auth } from '../../services/firebase';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

const SQUAD_META = {
  red:    { name: 'R1', color: '#ef4444' },
  blue:   { name: 'R2', color: '#3b82f6' },
  green:  { name: 'R3', color: '#22c55e' },
  yellow: { name: 'R4', color: '#eab308' },
};

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
    const ensure = (pid) => { if (!stats[pid]) stats[pid] = { played: 0, wins: 0, losses: 0 }; return stats[pid]; };

    allPoints.forEach(pt => {
      const home = pt.homeData || pt.teamA || {};
      const away = pt.awayData || pt.teamB || {};
      const outcome = pt.outcome;
      const homePids = (home.assignments || home.players || []).filter(Boolean);
      const awayPids = (away.assignments || away.players || []).filter(Boolean);
      homePids.forEach(pid => { const s = ensure(pid); s.played++; if (outcome === 'win_a') s.wins++; else if (outcome === 'win_b') s.losses++; });
      awayPids.forEach(pid => { const s = ensure(pid); s.played++; if (outcome === 'win_b') s.wins++; else if (outcome === 'win_a') s.losses++; });
    });

    return (training.attendees || [])
      .map(pid => {
        const player = players.find(p => p.id === pid);
        if (!player) return null;
        const s = stats[pid] || { played: 0, wins: 0, losses: 0 };
        const winRate = s.played > 0 ? Math.round((s.wins / s.played) * 100) : null;
        return { playerId: pid, name: player.nickname || player.name || '?', number: player.number, played: s.played, wins: s.wins, losses: s.losses, diff: s.wins - s.losses, winRate };
      })
      .filter(Boolean)
      .sort((a, b) => b.played - a.played || (b.winRate ?? -1) - (a.winRate ?? -1) || b.diff - a.diff);
  }, [training, allPoints, players]);

  // ─── Squad leaderboard ───
  const squadBoard = useMemo(() => {
    if (!training?.squads || !allPoints) return [];
    const stats = {};
    allPoints.forEach(pt => {
      const mData = pt.matchupData || {};
      const homeSquad = mData.homeSquad;
      const awaySquad = mData.awaySquad;
      if (!homeSquad || !awaySquad) return;
      if (!stats[homeSquad]) stats[homeSquad] = { w: 0, l: 0, pts: 0 };
      if (!stats[awaySquad]) stats[awaySquad] = { w: 0, l: 0, pts: 0 };
      stats[homeSquad].pts++;
      stats[awaySquad].pts++;
      if (pt.outcome === 'win_a') { stats[homeSquad].w++; stats[awaySquad].l++; }
      else if (pt.outcome === 'win_b') { stats[awaySquad].w++; stats[homeSquad].l++; }
    });
    return Object.entries(stats)
      .map(([key, s]) => ({
        key, name: SQUAD_META[key]?.name || key, color: SQUAD_META[key]?.color || COLORS.textMuted,
        ...s, diff: s.w - s.l,
      }))
      .sort((a, b) => b.w - a.w || a.l - b.l || b.pts - a.pts);
  }, [training, allPoints]);

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

      {/* Squad table */}
      {squadBoard.length > 0 && (
        <>
          <SectionTitle>{t('squads_title')}</SectionTitle>
          <div style={{
            background: COLORS.surfaceDark, borderRadius: RADIUS.lg,
            border: `1px solid ${COLORS.border}`, overflow: 'hidden', marginBottom: SPACE.xl,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 40px 40px 46px 46px',
              padding: '8px 14px', borderBottom: `1px solid ${COLORS.border}`,
            }}>
              {['', 'W', 'L', 'Pts', '+/-'].map((h, i) => (
                <span key={i} style={{
                  fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted,
                  textAlign: i === 0 ? 'left' : 'center', letterSpacing: 0.5,
                }}>{h}</span>
              ))}
            </div>
            {squadBoard.map((row, i) => (
              <div key={row.key} style={{
                display: 'grid', gridTemplateColumns: '1fr 40px 40px 46px 46px',
                padding: '10px 14px', alignItems: 'center',
                borderBottom: i < squadBoard.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                background: i === 0 ? `${COLORS.accent}08` : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted, width: 14 }}>{i + 1}</span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: row.color }} />
                  <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: i === 0 ? COLORS.accent : COLORS.text }}>{row.name}</span>
                </div>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.success, textAlign: 'center' }}>{row.w}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.danger, textAlign: 'center' }}>{row.l}</span>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text, textAlign: 'center' }}>{row.pts}</span>
                <span style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 600, textAlign: 'center',
                  color: row.diff > 0 ? COLORS.success : row.diff < 0 ? COLORS.danger : COLORS.textMuted,
                }}>{row.diff > 0 ? '+' : ''}{row.diff}</span>
              </div>
            ))}
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
            Notes are saved to layout — visible in tournament prep too
          </div>
        </>
      ) : (
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
          textAlign: 'center', padding: SPACE.lg,
        }}>{t('notes_no_layout')}</div>
      )}

      {/* ─── Players ─── */}
      {leaderboard.length > 0 && (
        <>
          <div style={{ marginTop: SPACE.xl }} />
          <SectionTitle>{t('players_title')}</SectionTitle>
          {leaderboard.map((row, i) => {
            const wrColor = row.winRate == null ? COLORS.textMuted
              : row.winRate >= 60 ? COLORS.success : row.winRate >= 40 ? COLORS.accent : COLORS.danger;
            return (
              <div key={row.playerId}
                onClick={() => navigate(`/player/${row.playerId}/stats?scope=training&tid=${trainingId}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: SPACE.md,
                  padding: '10px 14px', marginBottom: SPACE.xs,
                  background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.lg, cursor: 'pointer', minHeight: 52,
                }}>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#334155', width: 22, textAlign: 'right' }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {row.number ? `#${row.number} ` : ''}{row.name}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 2 }}>
                    {row.played} pts · {row.wins}W-{row.losses}L{row.diff !== 0 ? ` (${row.diff > 0 ? '+' : ''}${row.diff})` : ''}
                  </div>
                </div>
                <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: wrColor, minWidth: 44, textAlign: 'right' }}>
                  {row.winRate == null ? '—' : `${row.winRate}%`}
                </span>
              </div>
            );
          })}
        </>
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
