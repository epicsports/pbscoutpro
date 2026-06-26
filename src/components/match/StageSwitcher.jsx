import React from 'react';
import { COLORS, FONT } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { capturePhases, toPersistedLiteral, label } from '../../utils/pointPhases';

/**
 * StageSwitcher — the "E": a mini-timeline + playhead for the SCOUT capture
 * stages of a single point (Point as Timeline, Stage 2a). Three nodes left→right:
 *   Break (keyframe #0, required) · Settle (optional) · Mid (optional).
 * Active node = amber; a node with captured data shows a filled dot (done);
 * pending = muted outline. Tap a node to switch the active capture stage.
 *
 * Distinct from the coach OSTRZAŁ Breakout/Post-break READ-mode bar — this is the
 * scout-side CAPTURE switcher. Build-new (no tactic step-switcher exists); follows
 * the segmented-pill idiom (QuickShotPanel) but rendered as a connected timeline.
 *
 * Props:
 *   stage    — active stage key: 'break' | 'settle' | 'mid'
 *   onChange — (key) => void
 *   done     — { break, settle, mid } booleans: stage has captured data
 *   device-agnostic: each node is a ≥44px tap target; scales by flex.
 */
export default function StageSwitcher({ stage = 'break', onChange, done = {}, stages = null, wrap = false }) {
  const { t } = useLanguage();
  // PaT D4 — default capture nodes from the canonical module (single source); keys
  // are the persisted literals (break/settle/mid + endgame). The TACTIC editor
  // passes its own 5 positional stages [{key,label}] (Stage 2.2) via `stages`.
  const STAGES = stages || capturePhases().map(p => ({ key: toPersistedLiteral(p.key), label: label(p.key, t) }));
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, flexWrap: wrap ? 'wrap' : 'nowrap', rowGap: wrap ? 8 : 0 }} role="tablist" aria-label={t('b13_capture_stage')}>
      {STAGES.map((s, i) => {
        const active = stage === s.key;
        const hasData = !!done[s.key];
        const color = active ? COLORS.accent : hasData ? COLORS.text : COLORS.textMuted;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && !wrap && (
              // Connector segment — filled up to the active node. Dropped in wrap mode
              // (narrow rail, multi-row) where a connector at a line break reads wrong.
              <div style={{
                width: 14, height: 2, flexShrink: 0,
                background: (active || hasData) ? `${COLORS.accent}66` : COLORS.border,
              }} />
            )}
            <div
              role="tab" aria-selected={active}
              onClick={() => onChange && onChange(s.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                minHeight: 44, padding: '0 8px', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent', userSelect: 'none',
              }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                background: active ? COLORS.accent : hasData ? `${COLORS.accent}40` : 'transparent',
                border: `2px solid ${active ? COLORS.accent : hasData ? `${COLORS.accent}80` : COLORS.border}`,
                boxShadow: active ? COLORS.accentGlow : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {hasData && !active && (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.accent }} />
                )}
              </span>
              <span style={{
                fontFamily: FONT, fontSize: 12, fontWeight: active ? 800 : 600, color,
                letterSpacing: 0.2,
              }}>{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
