import React, { useMemo } from 'react';
import { COLORS, FONT, rampColor } from '../../utils/theme';

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

  // § 115 / mockup-3 — compact single-line rows. Magnitude = the intensity ramp
  // (chip + total), normalized to the busiest obstacle. Owner identity lives in
  // the inline position dots (small, secondary). Row min-height 44 (§27).
  const maxTotal = Math.max(1, ...grouped.map(g => g.total));
  return (
    <div>
      {grouped.map(g => {
        const ramp = rampColor(g.total / maxTotal);
        return (
          <div key={g.tid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, minHeight: 44 }}>
            <div style={{ width: 12, height: 24, borderRadius: 4, background: ramp, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text, flexShrink: 0 }}>{tLabel(g.tid)}</span>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', fontFamily: FONT, fontSize: 11.5, color: COLORS.textDim, whiteSpace: 'nowrap' }}>
              {g.positions.map((p, i) => (
                <span key={`${p.pid || 'none'}_${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: (p.pid ? pColor(p.pid) : null) || COLORS.textMuted, flexShrink: 0 }} />
                  {(p.pid ? pLabel(p.pid) : '—')}·{p.n}
                </span>
              ))}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: ramp, flexShrink: 0, minWidth: 24, textAlign: 'right' }}>{g.total}</span>
          </div>
        );
      })}
    </div>
  );
}
