import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, ZONE_COLORS } from '../../utils/theme';
import { getBunkerSide } from '../../utils/helpers';

const RESULT_COLOR = {
  hit: '#22c55e',     // success green
  miss: '#ef4444',    // danger red
  unknown: '#94a3b8', // neutral grey
};
const RESULT_GLYPH = {
  hit: '\u2713',      // ✓
  miss: '\u2715',     // ✕
  unknown: '?',
};

/**
 * Shot target cell. Cycle-tap pattern:
 *   unselected → hit → miss → unknown → unselected.
 *
 * Displays side dot + bunker name + (selected: result glyph / unselected: freq).
 *
 * @param {object} bunker
 * @param {string} doritoSide
 * @param {'hit'|'miss'|'unknown'|null|undefined} result - current selection state
 * @param {number} [freq] - weighted frequency (mature state only)
 * @param {() => void} onClick - caller advances state via cycleShot()
 */
export default function ShotCell({ bunker, doritoSide = 'top', result, freq, onClick }) {
  const name = bunker.positionName || bunker.name || '';
  const side = bunker.side || getBunkerSide(bunker.x ?? 0.5, bunker.y ?? 0.5, doritoSide);
  const sideColor = ZONE_COLORS[side] || COLORS.textMuted;
  const isSelected = !!result;
  const borderColor = isSelected ? RESULT_COLOR[result] : COLORS.border;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 2,
        padding: `${SPACE.sm}px ${SPACE.xs}px`,
        minHeight: TOUCH.minTarget,
        background: isSelected ? `${RESULT_COLOR[result]}15` : COLORS.surfaceLight,
        border: `1px solid ${borderColor}`,
        borderRadius: RADIUS.md,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', gap: SPACE.xs,
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
        color: COLORS.text,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: sideColor, flexShrink: 0,
        }} />
        {name}
      </span>
      {isSelected ? (
        <span style={{
          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800,
          color: RESULT_COLOR[result],
        }}>{RESULT_GLYPH[result]}</span>
      ) : typeof freq === 'number' && freq > 0 ? (
        <span style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700,
          color: COLORS.textMuted,
        }}>{Math.round(freq)}</span>
      ) : (
        <span style={{ height: FONT_SIZE.xxs }} /> /* spacer */
      )}
    </button>
  );
}
