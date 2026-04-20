import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, ZONE_COLORS } from '../../utils/theme';
import { getBunkerSide } from '../../utils/helpers';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Bootstrap-only header bar shown after a breakout is selected in a full
 * layout-wide grid. Taps re-open the grid (parent sets breakout=null).
 *
 * Mature state (top 5 grid) does NOT use this — grid stays compact already.
 */
export default function BreakoutCollapsed({ bunker, doritoSide = 'top', onChange }) {
  const { t } = useLanguage();
  const name = bunker.positionName || bunker.name || '';
  const side = bunker.side || getBunkerSide(bunker.x ?? 0.5, bunker.y ?? 0.5, doritoSide);
  const sideColor = ZONE_COLORS[side] || COLORS.textMuted;
  return (
    <button
      onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', gap: SPACE.sm,
        padding: `${SPACE.md}px ${SPACE.lg}px`,
        width: '100%', minHeight: TOUCH.targetLg,
        background: COLORS.accentGradient,
        border: 'none',
        borderRadius: RADIUS.md,
        boxShadow: COLORS.accentGlow,
        cursor: 'pointer',
      }}
    >
      <span style={{
        width: 10, height: 10, borderRadius: '50%',
        background: sideColor, border: '2px solid #000',
        flexShrink: 0,
      }} />
      <span style={{
        flex: 1, textAlign: 'left',
        fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800,
        color: '#000',
      }}>{name}</span>
      <span style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
        color: '#000', opacity: 0.7,
      }}>{t('selflog_breakout_change') || 'Zmień'} ⌄</span>
    </button>
  );
}
