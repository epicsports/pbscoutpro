import React, { useState, useEffect } from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { ZONES } from '../utils/zones';

/**
 * QuickShotPanel — fast zone-based shot entry.
 *
 * Slides up when a player is selected and 🎯 Shot is tapped. Three zone toggles
 * (dorito/center/snake) record direction; an additive callout-zone scroller tags
 * layout zones[]. "Precise placement →" hands off to ShotDrawer.
 *
 * Two modes:
 *  - **unified (scout, § 101 shot-model unification):** NO break/obstacle toggle.
 *    Shots are logged against the ACTIVE CAPTURE STAGE (Break/Settle/Mid) — the
 *    StageSwitcher is the context. Taps write the active stage's quick/zone shots
 *    via `onToggleZone(zone, kind?)`; post-break shots are captured by advancing
 *    to the Settle stage. Props: `selectedZones`, `selectedCallout`, `stageLabel`.
 *  - **legacy (tactic editor, default):** keeps the Break / At-obstacle segmented
 *    toggle — a tactic is a single planned setup with break + obstacle sub-phases
 *    (no timeline), so the toggle is meaningful there. Props: `breakZones`,
 *    `obstacleZones`, `breakCalloutZones`, `obstacleCalloutZones`;
 *    `onToggleZone(zone, phase, kind?)`. (TacticPage retirement = Stage 3.)
 *
 * § 58.3: ZONES constant lives in utils/zones.js (shared with QuickLogView).
 */
export default function QuickShotPanel({
  playerIndex,
  playerLabel,
  // ── unified (scout) ──
  unified = false,
  selectedZones = [],     // active stage band zones (draft.quickShots[idx])
  selectedCallout = [],   // active stage callout-zone ids (draft.zoneShots[idx])
  stageLabel = '',        // 'Break' | 'Settle' | 'Mid' — active capture stage
  // ── legacy (tactic) ──
  zones = [],             // break-phase band (alias for breakZones)
  breakZones,
  obstacleZones = [],
  breakCalloutZones = [],
  obstacleCalloutZones = [],
  // ── shared ──
  calloutZones = [],      // layout zones[] (0..N): {id,name,color}
  onToggleZone,           // unified: (zone, kind?) · legacy: (zone, phase, kind?)
  onPrecise,
  onClose,
  visible,
}) {
  const [shotPhase, setShotPhase] = useState('break');
  useEffect(() => { if (playerIndex != null) setShotPhase('break'); }, [playerIndex]);

  if (!visible || playerIndex == null) return null;

  const activeZones = unified
    ? selectedZones
    : (shotPhase === 'break' ? (breakZones || zones || []) : (obstacleZones || []));
  const activeCallout = unified
    ? selectedCallout
    : (shotPhase === 'break' ? (breakCalloutZones || []) : (obstacleCalloutZones || []));
  const title = unified
    ? (stageLabel ? `${stageLabel} shots` : 'Shot direction')
    : (shotPhase === 'break' ? 'Break shot direction' : 'Obstacle play direction');
  // band kind omitted (→ handler default 'band'); callout passes 'callout'.
  const emit = (zone, kind) =>
    onToggleZone && (unified ? onToggleZone(zone, kind) : onToggleZone(zone, shotPhase, kind));

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
        marginBottom: unified ? SPACE.xs : SPACE.md,
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

      {/* unified: flow note (the stage is the shot context). legacy: Break |
          At-obstacle segmented toggle. */}
      {unified ? (
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 500,
          color: COLORS.textMuted, marginBottom: SPACE.md, lineHeight: 1.4,
        }}>
          Logging for the <strong style={{ color: COLORS.textDim }}>{stageLabel || 'current'}</strong> stage — switch stages (top) for post-break / mid shots.
        </div>
      ) : (
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
      )}

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
              onClick={() => emit(z.key)}
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
              {z.icon} {z.label}
            </div>
          );
        })}
      </div>

      {/* § Callout zones — additive. Reuses the band-tile style; horizontal
          scroller (zones are 0..N). Hidden when the layout has no zones. */}
      {calloutZones.length > 0 && (
        <>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
            textTransform: 'uppercase', color: COLORS.textDim, letterSpacing: 0.5,
            marginBottom: SPACE.sm,
          }}>
            Callout zones
          </div>
          <div style={{ display: 'flex', overflowX: 'auto', gap: SPACE.sm, marginBottom: SPACE.md }}>
            {calloutZones.map(z => {
              const active = activeCallout.includes(z.id);
              return (
                <div key={z.id}
                  onClick={() => emit(z.id, 'callout')}
                  style={{
                    minHeight: 56,
                    flexShrink: 0,
                    padding: '0 16px',
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
                    whiteSpace: 'nowrap',
                    transition: 'all 0.12s',
                  }}>
                  {z.name}
                </div>
              );
            })}
          </div>
        </>
      )}

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
