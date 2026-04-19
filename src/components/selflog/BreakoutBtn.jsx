import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, ZONE_COLORS } from '../../utils/theme';
import { getBunkerSide } from '../../utils/helpers';

/**
 * Breakout bunker button. 3-column grid cell with side dot + name.
 *
 * Selected = accent gradient (primary-action color per §27).
 * Unselected = surface light + neutral border.
 *
 * @param {object} bunker - layout bunker ({ name|positionName, x, y, side? })
 * @param {string} doritoSide - 'top'|'bottom' (for side fallback)
 * @param {boolean} selected
 * @param {number} [count] - optional count badge for mature history state
 * @param {() => void} onClick
 */
export default function BreakoutBtn({ bunker, doritoSide = 'top', selected, count, onClick }) {
  const name = bunker.positionName || bunker.name || '';
  const side = bunker.side || getBunkerSide(bunker.x ?? 0.5, bunker.y ?? 0.5, doritoSide);
  const sideColor = ZONE_COLORS[side] || COLORS.textMuted;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: SPACE.xs,
        padding: `${SPACE.sm}px ${SPACE.sm}px`,
        minHeight: TOUCH.minTarget,
        background: selected ? COLORS.accentGradient : COLORS.surfaceLight,
        border: `1px solid ${selected ? 'transparent' : COLORS.border}`,
        borderRadius: RADIUS.md,
        boxShadow: selected ? COLORS.accentGlow : 'none',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: sideColor,
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: FONT,
        fontSize: FONT_SIZE.sm,
        fontWeight: 700,
        color: selected ? '#000' : COLORS.text,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: '100%',
      }}>{name}</span>
      {typeof count === 'number' && count > 0 && !selected && (
        <span style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700,
          color: COLORS.textMuted, marginLeft: 'auto',
        }}>{count}</span>
      )}
    </button>
  );
}
