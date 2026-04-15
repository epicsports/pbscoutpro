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
    const ensure = (pid) => { if (!stats[pid]) stats[pid] = { played: 0, wins: 0, losses: 0 }; return stats[pid]; };

    allPoints.forEach(pt => {
      const home = pt.homeData || pt.teamA || {};
      const away = pt.awayData || pt.teamB || {};
      const outcome = pt.outcome;
      const processSide = (side, isWin) => {
        const pids = (side.assignments || []).filter(Boolean);
        pids.forEach(pid => {
          const s = ensure(pid);
          s.played++;
          if (isWin) s.wins++; else s.losses++;
        });
      };
      if ((home.assignments || []).some(Boolean)) processSide(home, outcome === 'win_a');
      if ((away.assignments || []).some(Boolean)) processSide(away, outcome === 'win_b');
    });

    return (training.attendees || [])
      .map(pid => {
        const player = players.find(p => p.id === pid);
        if (!player) return null;
        const s = stats[pid] || { played: 0, wins: 0, losses: 0 };
        const winRate = s.played > 0 ? Math.round((s.wins / s.played) * 100) : null;
        return {
          playerId: pid, name: player.nickname || player.name || '?', number: player.number,
          played: s.played, wins: s.wins, losses: s.losses,
          winRate,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.played - a.played || (b.winRate ?? -1) - (a.winRate ?? -1));
  }, [training, allPoints, players]);

  // ─── Squad W/L ───
  const SQUAD_COLORS = { red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308' };
  const SQUAD_NAMES = { red: 'R1', blue: 'R2', green: 'R3', yellow: 'R4' };
  const squadBoard = useMemo(() => {
    if (!training?.squads || !allPoints) return [];
    const stats = {};
    allPoints.forEach(pt => {
      const mData = pt.matchupData || {};
      const h = mData.homeSquad, a = mData.awaySquad;
      if (!h || !a) return;
      if (!stats[h]) stats[h] = { w: 0, l: 0 };
      if (!stats[a]) stats[a] = { w: 0, l: 0 };
      if (pt.outcome === 'win_a') { stats[h].w++; stats[a].l++; }
      else if (pt.outcome === 'win_b') { stats[a].w++; stats[h].l++; }
    });
    return Object.entries(stats)
      .map(([key, s]) => ({ key, name: SQUAD_NAMES[key] || key, color: SQUAD_COLORS[key] || COLORS.textMuted, ...s }))
      .sort((a, b) => b.w - a.w || a.l - b.l);
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

      {/* ─── Squads ─── */}
      {squadBoard.length > 0 && (
        <>
          <SectionTitle>{t('squads_title')}</SectionTitle>
          <div style={{
            background: COLORS.surfaceDark, borderRadius: RADIUS.lg,
            border: `1px solid ${COLORS.border}`, overflow: 'hidden', marginBottom: SPACE.xl,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 50px 50px',
              padding: '8px 14px', borderBottom: `1px solid ${COLORS.border}`,
            }}>
              {['', 'W', 'L'].map((h, i) => (
                <span key={i} style={{
                  fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted,
                  textAlign: i === 0 ? 'left' : 'center', letterSpacing: 0.5,
                }}>{h}</span>
              ))}
            </div>
            {squadBoard.map((row, i) => (
              <div key={row.key} style={{
                display: 'grid', gridTemplateColumns: '1fr 50px 50px',
                padding: '12px 14px', alignItems: 'center',
                borderBottom: i < squadBoard.length - 1 ? `1px solid ${COLORS.border}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: row.color }} />
                  <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text }}>{row.name}</span>
                </div>
                <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.success, textAlign: 'center' }}>{row.w}</span>
                <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.danger, textAlign: 'center' }}>{row.l}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── Players ─── */}
      {leaderboard.length > 0 && (
        <>
          <SectionTitle>{t('players_title')}</SectionTitle>
          {leaderboard.map((row, i) => {
            const wrColor = row.winRate == null ? COLORS.textMuted
              : row.winRate >= 60 ? COLORS.success : row.winRate >= 40 ? COLORS.text : COLORS.danger;
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
                    {row.played} pkt · {row.wins}W-{row.losses}L
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
                        fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted,
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
