import React, { useState, useMemo } from 'react';
import PageHeader from './PageHeader';
import { Btn } from './ui';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';

/**
 * QuickLogView — fast point logging without canvas.
 * Two labeled squad sections → pick players → tap winner → next.
 *
 * If no players are selected, both squads auto-fill from their full rosters
 * (same as the old direct-tap-to-score behavior).
 */
export default function QuickLogView({
  teamA, teamB,
  homeRoster, awayRoster,
  roster, // legacy: single flat roster — treated as the active team's squad
  points, activeTeam = 'A',
  onSavePoint, onBack, onSwitchToScout,
}) {
  // Back-compat: MatchPage still passes a flat `roster` for tournament quick
  // logging. Map it onto the active side so the single-section flow keeps
  // working with the new split-squad UI.
  if (!homeRoster && !awayRoster && roster) {
    if (activeTeam === 'B') { awayRoster = roster; homeRoster = []; }
    else { homeRoster = roster; awayRoster = []; }
  }
  homeRoster = homeRoster || [];
  awayRoster = awayRoster || [];
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const scoreA = points.filter(p => p.outcome === 'win_a').length;
  const scoreB = points.filter(p => p.outcome === 'win_b').length;
  const ptNum = points.length + 1;

  const allRoster = useMemo(() => [...homeRoster, ...awayRoster], [homeRoster, awayRoster]);

  const toggle = (pid) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const handleWin = async (winner) => {
    if (saving) return;
    setSaving(true);
    try {
      const assignments = Array(5).fill(null);
      if (selected.size > 0) {
        Array.from(selected).forEach((pid, i) => { if (i < 5) assignments[i] = pid; });
      }
      const outcome = winner === 'A' ? 'win_a' : 'win_b';
      await onSavePoint({ assignments, outcome });
    } catch (e) {
      console.error('Quick log save failed:', e);
    }
    setSaving(false);
  };

  const history = useMemo(() =>
    [...points].reverse().map((pt, ri) => {
      const num = points.length - ri;
      const data = pt.homeData || pt.teamA || pt.awayData || pt.teamB || {};
      const names = (data.assignments || []).filter(Boolean).map(pid => {
        const p = allRoster.find(r => r.id === pid);
        return p?.nickname || p?.name?.split(' ').pop() || '?';
      });
      const isWin = (activeTeam === 'A' && pt.outcome === 'win_a') || (activeTeam === 'B' && pt.outcome === 'win_b');
      const isLoss = (activeTeam === 'A' && pt.outcome === 'win_b') || (activeTeam === 'B' && pt.outcome === 'win_a');
      return { num, names: names.join(', ') || '—', isWin, isLoss };
    }),
  [points, allRoster, activeTeam]);

  const myTeam = activeTeam === 'A' ? teamA : teamB;
  const oppTeam = activeTeam === 'A' ? teamB : teamA;

  const homeColor = teamA?.color || '#22c55e';
  const awayColor = teamB?.color || '#ef4444';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: onBack }}
        title="Szybki log"
        subtitle={`${myTeam?.name || '?'} vs ${oppTeam?.name || '?'}`}
      />

      {/* Score bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 16px',
        background: '#0d1117', borderBottom: '1px solid #1a2234', gap: 4,
      }}>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{teamA?.name}</div>
        <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 800, color: COLORS.text, minWidth: 40, textAlign: 'center' }}>{scoreA}</div>
        <span style={{ fontFamily: FONT, fontSize: 24, fontWeight: 800, color: '#334155' }}>:</span>
        <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 800, color: COLORS.text, minWidth: 40, textAlign: 'center' }}>{scoreB}</div>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{teamB?.name}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px 4px' }}>
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569' }}>
            Punkt #{ptNum} — Kto grał?
          </span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: selected.size > 0 ? '#22c55e' : '#475569' }}>
            {selected.size} wybranych
          </span>
        </div>

        <SquadSection
          label={`${teamA?.name || 'Home'} — wybierz graczy`}
          color={homeColor}
          roster={homeRoster}
          selected={selected}
          onToggle={toggle}
        />
        <SquadSection
          label={`${teamB?.name || 'Away'} — wybierz graczy`}
          color={awayColor}
          roster={awayRoster}
          selected={selected}
          onToggle={toggle}
        />

        {/* Outcome buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569' }}>
            Kto wygrał?
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, padding: '0 16px 12px' }}>
          <div onClick={() => handleWin('A')} style={{
            flex: 1, minHeight: 80, borderRadius: 16,
            border: `2px solid ${homeColor}55`, background: `${homeColor}0d`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.4 : 1,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: homeColor }}>{teamA?.name} wygrali</span>
            <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: homeColor, opacity: 0.6 }}>dotknij aby zapisać</span>
          </div>
          <div onClick={() => handleWin('B')} style={{
            flex: 1, minHeight: 80, borderRadius: 16,
            border: `2px solid ${awayColor}55`, background: `${awayColor}0d`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.4 : 1,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: awayColor }}>{teamB?.name} wygrali</span>
            <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: awayColor, opacity: 0.6 }}>dotknij aby zapisać</span>
          </div>
        </div>

        {/* Advanced scouting link */}
        {onSwitchToScout && (
          <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'center' }}>
            <button type="button" onClick={onSwitchToScout}
              style={{
                background: 'transparent', border: 'none', color: COLORS.accent,
                fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                cursor: 'pointer', padding: '10px 12px', minHeight: 44,
              }}>
              Zaawansowane scoutowanie ›
            </button>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <>
            <div style={{ padding: '8px 16px 6px' }}>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569' }}>Historia punktów</span>
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
    </div>
  );
}

function SquadSection({ label, color, roster, selected, onToggle }) {
  return (
    <div style={{ padding: '8px 16px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 700,
          letterSpacing: '.5px', textTransform: 'uppercase', color,
        }}>{label}</span>
      </div>
      {roster.length === 0 ? (
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#475569', padding: '6px 2px' }}>
          No players in this squad
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {roster.map(p => {
            const on = selected.has(p.id);
            return (
              <div key={p.id} onClick={() => onToggle(p.id)} style={{
                height: 44, padding: '0 14px', borderRadius: 10,
                border: `1.5px solid ${on ? color + '90' : '#1e293b'}`,
                background: on ? `${color}15` : '#0f172a',
                display: 'flex', alignItems: 'center', gap: 5,
                cursor: 'pointer', transition: 'all .1s',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 700,
                  color: on ? color : '#475569',
                }}>{p.nickname || p.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
