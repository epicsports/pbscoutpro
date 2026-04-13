import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, ZONE_COLORS } from '../utils/theme';

/**
 * QuickShotPanel — fast zone-based shot entry.
 *
 * Slides up when a player is selected and the user taps 🎯 Shot in the
 * toolbar. Three zone toggles (dorito/center/snake) let the scout record
 * shot direction in a single tap. "Precise placement →" hands off to the
 * existing ShotDrawer for drill-down cases.
 */
const ZONES = [
  { key: 'dorito', label: '🔺 Dorito', color: ZONE_COLORS.dorito },
  { key: 'center', label: '➕ Center', color: ZONE_COLORS.center },
  { key: 'snake',  label: '🐍 Snake',  color: ZONE_COLORS.snake  },
];

export default function QuickShotPanel({
  playerIndex,
  playerLabel,
  zones = [],
  onToggleZone,
  onPrecise,
  onClose,
  visible,
}) {
  if (!visible || playerIndex == null) return null;

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      background: COLORS.surface,
      borderTop: `1px solid ${COLORS.border}`,
      padding: SPACE.lg,
      boxShadow: '0 -8px 24px rgba(0,0,0,0.45)',
      animation: 'slideUp 0.18s ease-out',
    }}>
      {/* Title row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: SPACE.md,
      }}>
        <div style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.xxs,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: COLORS.textDim,
          letterSpacing: 0.5,
        }}>
          {playerLabel || `Player ${playerIndex + 1}`} — shot direction
        </div>
        <div onClick={onClose}
          style={{
            padding: '4px 8px',
            fontSize: FONT_SIZE.md,
            color: COLORS.textMuted,
            cursor: 'pointer',
            minHeight: TOUCH.minTarget,
            minWidth: TOUCH.minTarget,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          ✕
        </div>
      </div>

      {/* Zone toggles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: SPACE.sm,
        marginBottom: SPACE.md,
      }}>
        {ZONES.map(z => {
          const active = zones.includes(z.key);
          return (
            <div key={z.key}
              onClick={() => onToggleZone && onToggleZone(z.key)}
              style={{
                minHeight: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: active ? `${z.color}12` : COLORS.bg,
                border: `2px solid ${active ? z.color : COLORS.border}`,
                borderRadius: RADIUS.lg,
                fontFamily: FONT,
                fontSize: FONT_SIZE.sm,
                fontWeight: 600,
                color: active ? z.color : COLORS.textMuted,
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.12s',
              }}>
              {z.label}
            </div>
          );
        })}
      </div>

      {/* Precise drill-down */}
      <div onClick={onPrecise}
        style={{
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.surfaceLight,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.md,
          fontFamily: FONT,
          fontSize: FONT_SIZE.sm,
          fontWeight: 600,
          color: COLORS.textMuted,
          cursor: 'pointer',
          userSelect: 'none',
        }}>
        🎯 Precise placement →
      </div>
    </div>
  );
}
