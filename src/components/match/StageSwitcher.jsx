import React from 'react';
import { COLORS, FONT } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { capturePhases, toPersistedLiteral, label } from '../../utils/pointPhases';

// Lighter amber (amber-400) for the "passed/recorded" segment label — still inside
// the accent family (§ 27 identity-amber), reads brighter than the active dark text.
const ACCENT_LIGHT = '#fbbf24';
// Dark ink used on top of the active amber-gradient segment (prototype #1a1205 /
// #5a4208) — high-contrast text on amber, NOT a new palette colour.
const ON_AMBER = '#1a1205';
const ON_AMBER_DIM = '#5a4208';

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
 *   ranges   — optional { break, settle, mid } STATIC time-range hint strings
 *              (e.g. '0–5s'). Render-only sub-labels so the scout knows what to
 *              collect per phase; NOT data (phases carry no timestamps). When
 *              omitted the switcher renders exactly as before (portrait paths).
 *   device-agnostic: each node is a ≥44px tap target; scales by flex.
 *   variant  — 'dots' (default, the playhead+connector look — tactic editor +
 *              portrait context bar) | 'segmented' (the design-handoff connected
 *              timeline: full-width name+time segments with active/passed/default
 *              states — the immersive-rail matchup-card bottom strip). Capture
 *              wiring is identical in both: click → onChange(key); a stage with
 *              data (`done[key]`) reads as "recorded/passed".
 */
export default function StageSwitcher({ stage = 'break', onChange, done = {}, stages = null, wrap = false, ranges = null, variant = 'dots' }) {
  const { t } = useLanguage();
  // PaT D4 — default capture nodes from the canonical module (single source); keys
  // are the persisted literals (break/settle/mid + endgame). The TACTIC editor
  // passes its own 5 positional stages [{key,label}] (Stage 2.2) via `stages`.
  const STAGES = stages || capturePhases().map(p => ({ key: toPersistedLiteral(p.key), label: label(p.key, t) }));

  // ── Segmented timeline variant (design handoff "Scout point" `.timeline .seg2`) ──
  // Connected full-width segments, each carrying the phase name + a static time-range
  // hint. Three visual states: active (amber gradient, dark ink), passed = recorded
  // (accent outline + tint, mapped to the existing `done`/stageDone), default.
  if (variant === 'segmented') {
    return (
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 5, width: '100%' }} role="tablist" aria-label={t('b13_capture_stage')}>
        {STAGES.map((s) => {
          const active = stage === s.key;
          const passed = !active && !!done[s.key];
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange && onChange(s.key)}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 44,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                padding: '6px 5px',
                borderRadius: 9,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                background: active
                  ? `linear-gradient(150deg, ${COLORS.accent}, ${COLORS.accentDim})`
                  : passed
                    ? `${COLORS.accent}17`
                    : COLORS.surface,
                border: `1px solid ${active ? 'transparent' : passed ? `${COLORS.accent}61` : COLORS.border}`,
                boxShadow: active ? COLORS.accentGlow : 'none',
                transition: 'background .14s, border-color .14s',
              }}
            >
              <span style={{
                fontFamily: FONT, fontSize: 11, lineHeight: 1.1,
                fontWeight: active ? 800 : 700,
                color: active ? ON_AMBER : passed ? ACCENT_LIGHT : COLORS.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
              }}>{s.label}</span>
              {ranges && ranges[s.key] ? (
                <span style={{
                  fontFamily: FONT, fontSize: 8.5, fontWeight: 600,
                  color: active ? ON_AMBER_DIM : COLORS.textMuted,
                }}>{ranges[s.key]}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

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
              {ranges && ranges[s.key] ? (
                // phase label + static time-range hint stacked (rail variant)
                <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1.05 }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: active ? 800 : 600, color, letterSpacing: 0.2 }}>{s.label}</span>
                  <span style={{ fontFamily: FONT, fontSize: 8.5, fontWeight: 600, color: COLORS.textMuted, letterSpacing: 0.2 }}>{ranges[s.key]}</span>
                </span>
              ) : (
                <span style={{
                  fontFamily: FONT, fontSize: 12, fontWeight: active ? 800 : 600, color,
                  letterSpacing: 0.2,
                }}>{s.label}</span>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
