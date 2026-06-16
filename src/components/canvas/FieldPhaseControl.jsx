import React from 'react';
import { COLORS, FONT, TOUCH } from '../../utils/theme';

/**
 * FieldPhaseControl — the ONE floating phase composite for the Field View shell
 * (GAP A, ratified 2026-06-16; mockup `.f-phase`). Views pass STATE, they do NOT
 * rebuild the widget — so Scout-point / Match-review / ScoutedTeam / Tactic share it.
 *
 * KIND drives transport (per `fieldViewConfig` phaseControl kind):
 *   'capture' → hosts the Point-as-Timeline "E" switcher as a BLACK BOX (§8) via
 *               `captureNode`; FieldPhaseControl does NOT reimplement it. No ▶.
 *   'setup'   → phase segment, NO ▶ (pick-a-phase-to-edit; nothing to replay).
 *   'coach' / 'review' → phase segment + ▶ replay transport.
 *   'filter'  → phase segment; ▶ only if `onReplay` is supplied (optional transport).
 *   null      → renders nothing (corner stays clean — Konfig).
 *
 * State contract: { phases:[{key,label,disabled?}], phase, onPhase, done:{key:bool},
 *                   canReplay, replaying, onReplay }. Floats top-right ON the field
 * (positioned by FieldFrame). §27: amber = active only; done = green; pending = muted.
 */
const HAS_TRANSPORT = { coach: true, review: true };

export default function FieldPhaseControl({
  kind = null, captureNode = null,
  phases = [], phase, onPhase, done = {},
  canReplay = false, replaying = false, onReplay,
}) {
  if (kind == null) return null;
  if (kind === 'capture') return captureNode || null;            // PaT "E" black box (§8)

  if (!phases.length) return null;
  const showPlay = (HAS_TRANSPORT[kind] || (kind === 'filter' && !!onReplay));

  const segBg = 'rgba(13,17,23,0.92)';
  return (
    <div data-testid="field-phase" role="tablist" style={{
      display: 'inline-flex', alignItems: 'stretch', background: segBg,
      border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    }}>
      {phases.map((p) => {
        const active = phase === p.key;
        const isDone = !active && !!done[p.key];
        const disabled = !!p.disabled;
        return (
          <div key={p.key} role="tab" aria-selected={active}
            data-testid={`field-phase-${p.key}`}
            title={disabled ? p.title : undefined}
            onClick={disabled ? undefined : () => onPhase && onPhase(p.key)}
            style={{
              minHeight: TOUCH.minTarget, minWidth: 38, padding: '0 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT, fontSize: 12, fontWeight: active ? 800 : 600,
              cursor: disabled ? 'default' : 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
              background: active ? COLORS.surfaceLight : 'transparent',
              color: active ? COLORS.accent : isDone ? COLORS.success : COLORS.textMuted,
              opacity: disabled ? 0.4 : 1,
            }}>
            {p.label}
          </div>
        );
      })}
      {showPlay && (
        <div role="button" aria-label="Replay" aria-pressed={replaying}
          data-testid="field-phase-replay"
          title={canReplay ? undefined : 'No replayable stages yet'}
          onClick={canReplay ? () => onReplay && onReplay(!replaying) : undefined}
          style={{
            minHeight: TOUCH.minTarget, minWidth: TOUCH.minTarget,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderLeft: `1px solid ${COLORS.border}`, fontSize: 13,
            cursor: canReplay ? 'pointer' : 'default',
            color: replaying ? COLORS.accent : COLORS.textDim,
            opacity: canReplay ? 1 : 0.4, WebkitTapHighlightColor: 'transparent',
          }}>▶</div>
      )}
    </div>
  );
}
