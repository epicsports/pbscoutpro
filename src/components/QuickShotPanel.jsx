import React, { useState, useEffect } from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, ZONE_COLORS } from '../utils/theme';

/**
 * QuickShotPanel — fast zone-based shot entry.
 *
 * Slides up when a player is selected and the user taps 🎯 Shot in the
 * toolbar. Three zone toggles (dorito/center/snake) let the scout record
 * shot direction in a single tap. "Precise placement →" hands off to the
 * existing ShotDrawer for drill-down cases.
 *
 * § 29 Obstacle play: segmented control at the top toggles between
 *   "Break" (existing quickShots) and "At obstacle" (new obstacleShots).
 *   Zone taps write to the phase-appropriate field via `onToggleZone(zone, phase)`.
 */
const ZONES = [
  { key: 'dorito', label: '🔺 Dorito', color: ZONE_COLORS.dorito },
  { key: 'center', label: '➕ Center', color: ZONE_COLORS.center },
  { key: 'snake',  label: '🐍 Snake',  color: ZONE_COLORS.snake  },
];

export default function QuickShotPanel({
  playerIndex,
  playerLabel,
  zones = [],          // break-phase zones (legacy alias for breakZones)
  breakZones,          // explicit break phase
  obstacleZones = [],  // § 29 obstacle phase
  onToggleZone,        // (zone, phase) — phase = 'break' | 'obstacle'
  onPrecise,
  onClose,
  visible,
}) {
  const [shotPhase, setShotPhase] = useState('break');

  // Reset phase to 'break' whenever a new player is selected
  useEffect(() => {
    if (playerIndex != null) setShotPhase('break');
  }, [playerIndex]);

  if (!visible || playerIndex == null) return null;

  const activeZones = shotPhase === 'break'
    ? (breakZones || zones || [])
    : (obstacleZones || []);
  const title = shotPhase === 'break' ? 'Break shot direction' : 'Obstacle play direction';

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
          {playerLabel || `Player ${playerIndex + 1}`} — {title}
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

      {/* Segmented control: Break | At obstacle (§ 29) */}
      <div style={{
        display: 'flex',
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: 2,
        marginBottom: SPACE.md,
      }}>
        {[
          { key: 'break', label: 'Break' },
          { key: 'obstacle', label: 'At obstacle' },
        ].map(seg => {
          const active = shotPhase === seg.key;
          return (
            <div key={seg.key}
              onClick={() => setShotPhase(seg.key)}
              style={{
                flex: 1,
                padding: '8px 0',
                textAlign: 'center',
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                cursor: 'pointer',
                userSelect: 'none',
                minHeight: TOUCH.minTarget,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? COLORS.surface : 'transparent',
                color: active ? COLORS.text : COLORS.textMuted,
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                transition: 'all 0.12s',
              }}>
              {seg.label}
            </div>
          );
        })}
      </div>

      {/* Zone toggles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: SPACE.sm,
        marginBottom: SPACE.md,
      }}>
        {ZONES.map(z => {
          const active = activeZones.includes(z.key);
          return (
            <div key={z.key}
              onClick={() => onToggleZone && onToggleZone(z.key, shotPhase)}
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
