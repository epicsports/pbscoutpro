import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';

export default function RosterGrid({ roster, selected, onToggle, max = 5, heroPlayerIds = [] }) {
  const count = selected.length;
  const isFull = count >= max;
  return (
    <div style={{
      padding: `${SPACE.sm}px ${SPACE.md}px 10px`,
      background: COLORS.bg,
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
        color: isFull ? COLORS.accent : COLORS.textDim, marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent }} />
        Playing: {count}/{max}
      </div>
      <div style={{
        display: 'flex', gap: SPACE.sm,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        paddingBottom: 4,
        maskImage: roster.length > 4 ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
        WebkitMaskImage: roster.length > 4 ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
      }}>
        {roster.map(player => {
          const isOn = selected.includes(player.id);
          const isHero = heroPlayerIds.includes(player.id) || !!player.hero;
          const displayName = player.nickname || player.name?.split(' ').pop() || '';
          return (
            <div key={player.id} onClick={() => onToggle(player.id)}
              style={{
                flexShrink: 0,
                padding: '10px 14px',
                borderRadius: RADIUS.lg,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer',
                background: isOn ? COLORS.accent + '10' : COLORS.surface,
                color: isOn ? COLORS.accent : COLORS.textMuted,
                border: `1.5px solid ${isOn ? COLORS.accent + '60' : COLORS.border}`,
                WebkitTapHighlightColor: 'transparent',
              }}>
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 800, whiteSpace: 'nowrap' }}>
                #{player.number}
              </span>
              {isHero && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent, flexShrink: 0 }} />
              )}
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
