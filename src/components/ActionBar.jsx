import React from 'react';
import { COLORS, FONT, TOUCH } from '../utils/theme';

/**
 * ActionBar — fixed bottom bar with action buttons.
 * actions: [{ id, icon, label, active?, variant?, onClick }]
 */
export default function ActionBar({ actions }) {
  return (
    <div style={{
      display: 'flex', gap: 6, padding: '8px 14px',
      background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
    }}>
      {actions.map(a => (
        <div key={a.id} onClick={a.onClick}
          style={{
            flex: a.flex ?? 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '0 8px', minHeight: 44, borderRadius: 8, cursor: 'pointer',
            fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: a.active ? 700 : 400,
            background: a.active ? COLORS.accent + '20' : (a.variant === 'accent' ? COLORS.accent : COLORS.surfaceLight),
            color: a.active ? COLORS.accent : (a.variant === 'accent' ? '#000' : COLORS.text),
            border: a.active ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
          }}>
          {a.icon && <span style={{ fontSize: 14 }}>{a.icon}</span>}
          {a.label && <span>{a.label}</span>}
        </div>
      ))}
    </div>
  );
}
