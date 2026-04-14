import React, { useState, useMemo } from 'react';
import PageHeader from './PageHeader';
import { Btn, SectionLabel } from './ui';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';

/**
 * QuickLogView — fast point logging without canvas.
 * Roster chips → tap winner → next. Under 5 seconds per point.
 *
 * After saving, lineup is preserved (usually same players next point).
 */
export default function QuickLogView({
  teamA, teamB, roster, points, activeTeam,
  onSavePoint, onBack, onSwitchToScout,
}) {
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const scoreA = points.filter(p => p.outcome === 'win_a').length;
  const scoreB = points.filter(p => p.outcome === 'win_b').length;
  const ptNum = points.length + 1;

  const toggle = (pid) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else if (next.size < 5) next.add(pid);
      return next;
    });
  };

  const handleWin = async (winner) => {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    try {
      const assignments = Array(5).fill(null);
      Array.from(selected).forEach((pid, i) => { if (i < 5) assignments[i] = pid; });
      const outcome = winner === 'A' ? 'win_a' : 'win_b';
      await onSavePoint({ assignments, outcome });
    } catch (e) {
      console.error('Quick log save failed:', e);
    }
    setSaving(false);
    // Don't clear selected — lineup usually stays
  };

  // History: newest first
  const history = useMemo(() =>
    [...points].reverse().map((pt, ri) => {
      const num = points.length - ri;
      const data = pt.homeData || pt.teamA || pt.awayData || pt.teamB || {};
      const names = (data.assignments || []).filter(Boolean).map(pid => {
        const p = roster.find(r => r.id === pid);
        return p?.nickname || p?.name?.split(' ').pop() || '?';
      });
      const isWin = (activeTeam === 'A' && pt.outcome === 'win_a') || (activeTeam === 'B' && pt.outcome === 'win_b');
      const isLoss = (activeTeam === 'A' && pt.outcome === 'win_b') || (activeTeam === 'B' && pt.outcome === 'win_a');
      return { num, names: names.join(', ') || '—', isWin, isLoss };
    }),
  [points, roster, activeTeam]);

  const myTeam = activeTeam === 'A' ? teamA : teamB;
  const oppTeam = activeTeam === 'A' ? teamB : teamA;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: onBack }}
        title="Quick log"
        subtitle={`${myTeam?.name || '?'} vs ${oppTeam?.name || '?'}`}
      />

      {/* Score bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 16px',
        background: '#0d1117', borderBottom: '1px solid #1a2234', gap: 4,
      }}>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{teamA?.name}</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.text, fontFamily: FONT, minWidth: 40, textAlign: 'center' }}>{scoreA}</div>
        <span style={{ fontSize: 24, fontWeight: 800, color: '#334155', fontFamily: FONT }}>:</span>
        <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.text, fontFamily: FONT, minWidth: 40, textAlign: 'center' }}>{scoreB}</div>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{teamB?.name}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Roster */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px 8px' }}>
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569' }}>
            Point #{ptNum} — Who's playing?
          </span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: selected.size >= 5 ? '#22c55e' : '#475569' }}>
            {selected.size}/5
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 8px' }}>
          {roster.map(p => {
            const on = selected.has(p.id);
            return (
              <div key={p.id} onClick={() => toggle(p.id)} style={{
                height: 44, padding: '0 14px', borderRadius: 10,
                border: `1.5px solid ${on ? '#22c55e60' : '#1e293b'}`,
                background: on ? '#22c55e10' : '#0f172a',
                display: 'flex', alignItems: 'center', gap: 5,
                cursor: 'pointer', transition: 'all .1s',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 700,
                  color: on ? '#22c55e' : '#475569',
                }}>{p.nickname || p.name}</span>
              </div>
            );
          })}
        </div>

        {/* Outcome buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px 4px' }}>
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569' }}>
            Who won?
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, padding: '0 16px 12px' }}>
          <div onClick={() => handleWin('A')} style={{
            flex: 1, minHeight: 80, borderRadius: 16,
            border: '2px solid #22c55e40', background: '#22c55e08',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            cursor: selected.size > 0 && !saving ? 'pointer' : 'default',
            opacity: selected.size > 0 ? 1 : 0.3,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: '#22c55e' }}>{teamA?.name}</span>
            <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#22c55e', opacity: 0.5 }}>tap to log</span>
          </div>
          <div onClick={() => handleWin('B')} style={{
            flex: 1, minHeight: 80, borderRadius: 16,
            border: '2px solid #ef444440', background: '#ef444408',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            cursor: selected.size > 0 && !saving ? 'pointer' : 'default',
            opacity: selected.size > 0 ? 1 : 0.3,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{teamB?.name}</span>
            <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#ef4444', opacity: 0.5 }}>tap to log</span>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <>
            <div style={{ padding: '8px 16px 6px' }}>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569' }}>History</span>
            </div>
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {history.map(h => (
                <div key={h.num} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', background: '#0f172a',
                  border: '1px solid #1a2234', borderRadius: 8,
                }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#334155', minWidth: 24 }}>#{h.num}</span>
                  <span style={{ flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 500, color: '#8b95a5', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{h.names}</span>
                  <span style={{
                    fontFamily: FONT, fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center',
                    color: h.isWin ? '#22c55e' : h.isLoss ? '#ef4444' : '#475569',
                  }}>{h.isWin ? 'W' : h.isLoss ? 'L' : '—'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Switch to full scout */}
      {onSwitchToScout && (
        <div style={{
          background: '#0d1117', borderTop: '1px solid #1a2234',
          padding: '8px 16px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        }}>
          <Btn variant="default" onClick={onSwitchToScout}
            style={{ width: '100%', justifyContent: 'center', minHeight: 44, fontSize: FONT_SIZE.sm }}>
            Full scout →
          </Btn>
        </div>
      )}
    </div>
  );
}
