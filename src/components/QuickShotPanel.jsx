import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { ZONES } from '../utils/zones';
import { SegmentedControl, Btn } from './ui';
import ZoneTapField from './ppt/ZoneTapField';

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
  calloutZones = [],      // layout zones[] (0..N): {id,name,color,polygon}
  fieldImage = null,      // § W2 — field bg for the callout-zone field-tap drawer
  onToggleZone,           // unified: (zone, kind?) · legacy: (zone, phase, kind?)
  onPrecise,
  onClose,
  visible,
}) {
  const [shotPhase, setShotPhase] = useState('break');
  // § zone-attribution W2 — the callout-zone field-tap drawer (shared
  // ZoneTapField, full field, no kills). Replaces the dozen-zone name scroller.
  const [zoneDrawerOpen, setZoneDrawerOpen] = useState(false);
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
        <SegmentedControl
          items={[{ key: 'break', label: 'Break' }, { key: 'obstacle', label: 'At obstacle' }]}
          value={shotPhase}
          onChange={setShotPhase}
          style={{ marginBottom: SPACE.md }}
        />
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

      {/* § Callout zones — § W2: a field-tap drawer (shared ZoneTapField, full
          field, no kills) replaces the name scroller, which is unusable at a
          dozen+ zones. Taps toggle live per-slot via emit(id,'callout'). */}
      {calloutZones.length > 0 && (
        <>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
            textTransform: 'uppercase', color: COLORS.textDim, letterSpacing: 0.5,
            marginBottom: SPACE.sm,
          }}>
            Callout zones
          </div>
          <div
            onClick={() => setZoneDrawerOpen(true)}
            role="button"
            style={{
              minHeight: 56, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '0 16px', marginBottom: SPACE.md,
              background: COLORS.bg,
              border: `2px solid ${activeCallout.length > 0 ? COLORS.accent : COLORS.border}`,
              borderRadius: RADIUS.lg, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>
              Pick zones on field
            </span>
            <span style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
              color: activeCallout.length > 0 ? COLORS.accent : COLORS.textMuted,
            }}>
              {activeCallout.length > 0 ? `${activeCallout.length} selected` : '→'}
            </span>
          </div>
        </>
      )}

      {/* § W2 — maximized full-field zone-tap drawer (scouting adapter; shares
          ZoneTapField with the self-log drawer). Taps write LIVE per-slot via
          emit(id,'callout'); "Done" just closes. No kills (scouting records
          zones fired at only). */}
      {zoneDrawerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: COLORS.bg, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            flexShrink: 0, height: 52, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: `0 ${SPACE.md}px`,
            background: COLORS.surfaceDark, borderBottom: `1px solid ${COLORS.border}`,
          }}>
            <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.text }}>
              Callout zones — {playerLabel || `Player ${playerIndex + 1}`}
            </span>
            <div onClick={() => setZoneDrawerOpen(false)} role="button" aria-label="Close" style={{
              minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: COLORS.textMuted, WebkitTapHighlightColor: 'transparent',
            }}>
              <X size={22} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500, color: COLORS.textMuted }}>
              Tap the zones this player fired at
            </div>
            <ZoneTapField
              fieldImage={fieldImage}
              zones={calloutZones}
              selectedIds={activeCallout}
              viewportSide={null}
              onToggleZone={(id) => emit(id, 'callout')}
            />
          </div>
          <div style={{
            flexShrink: 0, padding: SPACE.lg,
            paddingBottom: `calc(${SPACE.lg}px + env(safe-area-inset-bottom, 0px))`,
            borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg,
          }}>
            <Btn variant="accent" onClick={() => setZoneDrawerOpen(false)}
              style={{ width: '100%', minHeight: 56, fontSize: 17, fontWeight: 800 }}>
              Done
            </Btn>
          </div>
        </div>
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
