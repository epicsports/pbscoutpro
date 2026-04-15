import React from 'react';
import { COLORS, FONT } from '../utils/theme';

/**
 * LineupStatsSection — pair & trio win rates grouped by side.
 * Fed by `computeLineupStats()` from generateInsights.js.
 *
 * Hidden when the array is empty (no combos met the played >= 3 threshold).
 */
export default function LineupStatsSection({ lineupStats }) {
  if (!lineupStats?.length) return null;

  const dPairs = lineupStats.filter(l => l.type === 'pair' && l.side === 'D');
  const sPairs = lineupStats.filter(l => l.type === 'pair' && l.side === 'S');
  const dTrios = lineupStats.filter(l => l.type === 'trio' && l.side === 'D');
  const sTrios = lineupStats.filter(l => l.type === 'trio' && l.side === 'S');

  if (!dPairs.length && !sPairs.length && !dTrios.length && !sTrios.length) return null;

  return (
    <>
      <div style={{ padding: '12px 16px 4px' }}>
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600,
          color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          Najlepsze kombinacje graczy
        </span>
      </div>
      {dPairs.length > 0 && (
        <LineupGroup label="Pary — dorito" items={dPairs} color="#fb923c" />
      )}
      {sPairs.length > 0 && (
        <LineupGroup label="Pary — snake" items={sPairs} color="#22d3ee" />
      )}
      {dTrios.length > 0 && (
        <LineupGroup label="Trójki — dorito" items={dTrios} color="#fb923c" showCenter />
      )}
      {sTrios.length > 0 && (
        <LineupGroup label="Trójki — snake" items={sTrios} color="#22d3ee" showCenter />
      )}
    </>
  );
}

function LineupGroup({ label, items, color, showCenter }) {
  return (
    <div style={{
      margin: '0 16px 8px', background: '#0f172a',
      border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 14px 4px', borderBottom: '1px solid #111827',
        fontFamily: FONT, fontSize: 9, fontWeight: 600,
        color, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {label}
      </div>
      {items.slice(0, 5).map((item, i) => {
        const wr = item.winRate;
        const wrColor = wr >= 60 ? '#22c55e' : wr >= 45 ? '#f59e0b' : '#ef4444';
        return (
          <div key={item.key} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 44px',
            alignItems: 'center', gap: 8, padding: '10px 14px',
            borderBottom: i < items.length - 1 ? '1px solid #111827' : 'none',
            opacity: item.lowSample ? 0.65 : 1,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: FONT, fontSize: 12, fontWeight: 600,
                color: COLORS.text, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {item.names.join(' + ')}
              </div>
              {showCenter && item.centerName && (
                <div style={{
                  fontFamily: FONT, fontSize: 10, color: '#475569', marginTop: 1,
                }}>
                  + {item.centerName}
                </div>
              )}
              <div style={{
                fontFamily: FONT, fontSize: 10, color: '#334155', marginTop: 1,
              }}>
                {item.played} pkt{item.lowSample ? ' · mała próba' : ''}
              </div>
            </div>
            <div style={{
              height: 5, background: '#1a2234', borderRadius: 3, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${wr}%`, background: wrColor, borderRadius: 3,
              }} />
            </div>
            <div style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 700,
              color: wrColor, textAlign: 'right',
            }}>
              {wr}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
