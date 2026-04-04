import React from 'react';
import { COLORS, FONT } from '../utils/theme';

export default function RosterGrid({ roster, selected, onToggle, max = 5 }) {
  const count = selected.length;
  return (
    <div style={{
      padding: '8px 12px 10px',
      background: COLORS.bg,
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 600,
        color: COLORS.textDim, marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent }} />
        Playing this point: {count}/{max}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4,
      }}>
        {roster.map(player => {
          const isOn = selected.includes(player.id);
          return (
            <div key={player.id} onClick={() => onToggle(player.id)}
              style={{
                padding: '8px 4px',
                borderRadius: 8,
                fontFamily: FONT, fontSize: 11, fontWeight: 600,
                textAlign: 'center',
                cursor: 'pointer',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                background: isOn ? COLORS.accent + '15' : COLORS.surface,
                color: isOn ? COLORS.accent : COLORS.textMuted,
                border: `1.5px solid ${isOn ? COLORS.accent : COLORS.border}`,
              }}>
              #{player.number}
            </div>
          );
        })}
      </div>
    </div>
  );
}
