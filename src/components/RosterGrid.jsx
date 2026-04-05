import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';

export default function RosterGrid({ roster, selected, onToggle, max = 5 }) {
  const count = selected.length;
  return (
    <div style={{
      padding: `${SPACE.sm}px ${SPACE.lg}px 10px`,
      background: COLORS.bg,
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
        color: COLORS.textDim, marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent }} />
        Playing: {count}/{max}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: SPACE.xs,
      }}>
        {roster.map(player => {
          const isOn = selected.includes(player.id);
          const shortName = (player.nickname || player.name || '').slice(0, 3).toUpperCase();
          return (
            <div key={player.id} onClick={() => onToggle(player.id)}
              style={{
                padding: '7px 2px',
                borderRadius: RADIUS.md,
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
                textAlign: 'center',
                cursor: 'pointer',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                background: isOn ? COLORS.accent + '10' : COLORS.surface,
                color: isOn ? COLORS.accent : COLORS.textMuted,
                border: `1.5px solid ${isOn ? COLORS.accent + '60' : COLORS.border}`,
              }}>
              <span style={{ fontWeight: 800 }}>#{player.number}</span>{' '}
              <span style={{ fontWeight: 500, opacity: 0.65 }}>{shortName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
