import React from 'react';
import { COLORS, FONT } from '../utils/theme';

/**
 * ModeTabBar — horizontal scrollable tab bar at bottom of screen.
 * modes: [{ id, icon, label, badge? }]
 * activeMode: string
 * onModeChange: (id) => void
 */
export default function ModeTabBar({ modes, activeMode, onModeChange }) {
  return (
    <div style={{
      display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {modes.map(m => (
        <div key={m.id} onClick={() => onModeChange(m.id)}
          style={{
            flex: '0 0 auto', padding: '8px 12px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            borderTop: activeMode === m.id ? `2px solid ${COLORS.accent}` : '2px solid transparent',
            color: activeMode === m.id ? COLORS.accent : COLORS.textMuted,
            minWidth: 52,
          }}>
          <span style={{ fontSize: 16, position: 'relative' }}>
            {m.icon}
            {m.badge && (
              <span style={{
                position: 'absolute', top: -4, right: -8,
                background: COLORS.accent, color: '#000', fontFamily: FONT,
                fontSize: 8, fontWeight: 800, padding: '1px 3px', borderRadius: 6,
                minWidth: 12, textAlign: 'center',
              }}>{m.badge}</span>
            )}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: activeMode === m.id ? 700 : 400 }}>
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}
