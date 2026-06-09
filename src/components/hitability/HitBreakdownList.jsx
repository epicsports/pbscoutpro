import React, { useMemo } from 'react';
import { COLORS, FONT } from '../../utils/theme';

/**
 * HitBreakdownList — § 112 hits ranked by OBSTACLE (target): the most-hit
 * obstacle first, each with a sub-breakdown of which POSITIONS hit it (positions
 * sorted by their own hit count). Shared by the in-module Podsumowanie
 * (current-session hits) and the layout-analytics "Trafialność" section
 * (cumulative hits). Anonymous (config-local ids); null source = unattributed
 * target-level hit ("—").
 */
export default function HitBreakdownList({ hits, pColor, pLabel, tLabel, t, emptyText }) {
  const grouped = useMemo(() => {
    const byTarget = {};
    for (const h of hits) {
      const tg = byTarget[h.targetId] || (byTarget[h.targetId] = { total: 0, byPos: {} });
      tg.total += 1;
      const pid = h.playerId || '__none';
      tg.byPos[pid] = (tg.byPos[pid] || 0) + 1;
    }
    return Object.entries(byTarget)
      .map(([tid, d]) => ({
        tid,
        total: d.total,
        positions: Object.entries(d.byPos)
          .map(([pid, n]) => ({ pid: pid === '__none' ? null : pid, n }))
          .sort((a, b) => b.n - a.n),
      }))
      .sort((a, b) => b.total - a.total);
  }, [hits]);

  if (!grouped.length) {
    return <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' }}>{emptyText}</div>;
  }

  return (
    <div>
      {grouped.map(g => (
        <div key={g.tid} style={{ marginBottom: 8, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: 'hidden' }}>
          {/* Obstacle header — total hits, ranked desc */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: COLORS.surfaceLight || COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 14, fontWeight: 800, color: COLORS.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('hitability_target_n', tLabel(g.tid))}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: COLORS.accent, flexShrink: 0 }}>{g.total}</span>
          </div>
          {/* Position sub-breakdown — who hits it, sorted desc */}
          {g.positions.map((p, i) => (
            <div key={`${p.pid || 'none'}_${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 7px 18px', borderBottom: i < g.positions.length - 1 ? `1px solid ${COLORS.border}55` : 'none' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: (p.pid ? pColor(p.pid) : null) || COLORS.textMuted, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: FONT, fontSize: 12.5, color: COLORS.textDim, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.pid ? t('hitability_player_n', pLabel(p.pid)) : '—'}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text, flexShrink: 0 }}>{p.n}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
