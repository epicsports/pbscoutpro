import React from 'react';
import { Play, Pause } from 'lucide-react';
import { COLORS, FONT, ELEV, TRACKING } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * PointAxisScrubber — the review-field "Oś punktu" (point axis).
 *
 * READ-SIDE ONLY. Renders the point's phases as keyframe NODES on a horizontal
 * scrub track under the review field, plus a play/scrub head and a play/pause
 * control. It drives VIEW state only (`phasePin` / replay) — never the
 * capture/save/write path. The editor's StageSwitcher is a SEPARATE control
 * (POINT_AS_TIMELINE §8).
 *
 * DISCRETE-KEYFRAME, NOT continuous. Production's `timeline[]` is keyframe-
 * not-continuous (D2/§3): we do NOT store continuous time, so the head SNAPS to
 * a node — there is no interpolation between nodes. The prototype's look (track
 * + nodes + play head + accent-active node) is reproduced; its faked continuous
 * `prog`/interpolation model is deliberately NOT.
 *
 * Nodes that the CURRENT scope (aggregate or previewed point) did NOT capture
 * render DIMMED + inert (positions occupy the same axis so the timeline reads
 * consistently, but only captured phases are reachable). break = keyframe #0,
 * always captured.
 *
 * Props:
 *   phases   [{ key, label, enabled }]  ordered axis nodes (key = persisted
 *                                       literal: 'break'|'settle'|'mid'|'endgame').
 *   active   string                     the active node key (phasePin, or the
 *                                       replay clock when playing).
 *   onPick   (key) => void              tap a captured node → pin that phase.
 *   playing  boolean                    replay running.
 *   canPlay  boolean                    replay possible (≥1 stage keyframe).
 *   onPlay   () => void                 toggle replay.
 *   atEnd    boolean                    active node is the last captured node.
 *   variant  'inline' | 'float'         'inline' = the full attached track under the
 *                                       review field (portrait). 'float' = a COMPACT
 *                                       glass chip that rides OVER the full-bleed field
 *                                       (landscape Field-View slot) — same keyframe
 *                                       language (nodes + active node + play head), same
 *                                       read-side bindings, just tighter and self-sized.
 */
export default function PointAxisScrubber({ phases, active, onPick, playing, canPlay, onPlay, atEnd, variant = 'inline' }) {
  const { t } = useLanguage();
  const nodes = phases || [];
  const n = nodes.length;
  // Even discrete spacing: first node at 0%, last at 100%.
  const posFor = (i) => (n <= 1 ? 0 : (i / (n - 1)) * 100);
  const activeIdx = Math.max(0, nodes.findIndex((p) => p.key === active));
  // Head snaps to the active node — discrete, no continuous scrub.
  const headPos = posFor(activeIdx);

  // ── COMPACT FLOAT variant — landscape Field-View slot ──────────────────────
  // Same keyframe vocabulary (mini rail + nodes + active node + play head) packed
  // into a self-sizing glass chip that floats top-right over the field. Read-side
  // only: identical phasePin / replay bindings as the inline track. Wrapper keeps
  // the `field-phase` testid so the landscape e2e still asserts a present + floating
  // phase control, plus `phase-play` + per-node `phase-seg-${key}` for parity.
  if (variant === 'float') {
    // Compact track width scales with node count so labels never collide; clamped
    // so the chip stays a chip (rides the field, never spans it).
    const trackW = Math.min(168, Math.max(96, (n - 1) * 46));
    return (
      <div
        data-testid="field-phase"
        role="group"
        aria-label={t('phase_row_label')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(13,17,23,0.92)', border: `1px solid ${COLORS.border}`,
          borderRadius: 10, padding: '5px 10px 5px 6px',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          boxShadow: ELEV.shadow1,
        }}
      >
        {/* Play / pause — replays through the captured stage keyframes. */}
        <div
          data-testid="phase-play"
          role="button"
          aria-pressed={playing}
          aria-label={t('phase_play')}
          title={canPlay ? t('phase_play') : t('phase_play_disabled_hint')}
          onClick={canPlay ? onPlay : undefined}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canPlay ? 'pointer' : 'default',
            background: canPlay ? COLORS.accentGradient : ELEV.raised,
            color: canPlay ? '#1a1205' : COLORS.textMuted,
            boxShadow: canPlay ? `0 2px 8px ${COLORS.accent}44` : 'none',
            opacity: canPlay ? 1 : 0.5,
            WebkitTapHighlightColor: 'transparent', userSelect: 'none',
          }}
        >
          {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        </div>

        {/* Mini keyframe track — nodes + active node + play head, no header/long labels. */}
        <div style={{ position: 'relative', width: trackW, height: 44, flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', height: 4, borderRadius: 999, background: ELEV.sunken, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            <div style={{ width: headPos + '%', height: '100%', borderRadius: 999, background: COLORS.accent, transition: 'width .18s ease' }} />
          </div>
          {nodes.map((p, i) => {
            const pos = posFor(i);
            const isActive = i === activeIdx;
            const passed = i <= activeIdx;
            const enabled = p.enabled;
            return (
              <div
                key={p.key}
                data-testid={`phase-seg-${p.key}`}
                role="button"
                aria-pressed={isActive}
                aria-disabled={!enabled}
                aria-label={p.label}
                title={p.label}
                onClick={enabled ? () => onPick(p.key) : undefined}
                style={{
                  position: 'absolute', left: pos + '%', top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: enabled ? 'pointer' : 'default', zIndex: 2,
                  opacity: enabled ? 1 : 0.4,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: isActive ? 14 : 11, height: isActive ? 14 : 11, borderRadius: '50%',
                    background: passed && enabled ? COLORS.accent : ELEV.raised,
                    border: `2px solid ${isActive ? '#fff' : (passed && enabled ? COLORS.accent : (enabled ? `${COLORS.accent}88` : COLORS.borderLight))}`,
                    boxShadow: isActive ? `0 0 0 3px ${COLORS.accent}33` : 'none',
                    transition: 'width .12s, height .12s',
                  }}
                />
              </div>
            );
          })}
          {/* Scrub head — sits AT the active node (discrete snap). */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', left: headPos + '%', top: '50%',
              transform: 'translate(-50%,-50%)', width: 3, height: 18, borderRadius: 2,
              background: '#fff', boxShadow: ELEV.shadow1, zIndex: 3, pointerEvents: 'none',
              transition: 'left .18s ease',
            }}
          />
        </div>

        {/* Active-phase label — single, compact (the chip can't fit 4 axis labels). */}
        <span style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.accent,
          whiteSpace: 'nowrap', flexShrink: 0, paddingRight: 2,
        }}>
          {(nodes[activeIdx] && nodes[activeIdx].label) || ''}
        </span>
      </div>
    );
  }

  const status = playing
    ? t('point_axis_playing')
    : (atEnd ? t('point_axis_end') : t('point_axis_hint'));

  return (
    <div style={{ background: ELEV.surface, borderTop: `1px solid ${ELEV.hairline}`, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.textDim, letterSpacing: TRACKING.label, textTransform: 'uppercase' }}>
          {t('point_axis_label')}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: playing ? COLORS.accent : COLORS.textMuted }}>
          {status}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Play / pause — replays through the captured stage keyframes. */}
        <div
          data-testid="phase-play"
          role="button"
          aria-pressed={playing}
          aria-label={t('phase_play')}
          title={canPlay ? t('phase_play') : t('phase_play_disabled_hint')}
          onClick={canPlay ? onPlay : undefined}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canPlay ? 'pointer' : 'default',
            background: canPlay ? COLORS.accentGradient : ELEV.raised,
            color: canPlay ? '#1a1205' : COLORS.textMuted,
            boxShadow: canPlay ? `${ELEV.innerTop}, 0 3px 12px ${COLORS.accent}44` : 'none',
            opacity: canPlay ? 1 : 0.5,
            WebkitTapHighlightColor: 'transparent', userSelect: 'none',
          }}
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }} role="group" aria-label={t('phase_row_label')}>
          {/* Track + keyframe nodes. The 44px tap wrappers keep nodes touchable. */}
          <div style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center' }}>
            {/* Rail */}
            <div style={{ height: 6, width: '100%', borderRadius: 999, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, overflow: 'hidden' }}>
              {/* Fill up to the active node (passed-segments accent). */}
              <div style={{ width: headPos + '%', height: '100%', borderRadius: 999, background: COLORS.accent, transition: 'width .18s ease' }} />
            </div>
            {nodes.map((p, i) => {
              const pos = posFor(i);
              const isActive = i === activeIdx;
              const passed = i <= activeIdx;
              const enabled = p.enabled;
              return (
                <div
                  key={p.key}
                  data-testid={`phase-seg-${p.key}`}
                  role="button"
                  aria-pressed={isActive}
                  aria-disabled={!enabled}
                  aria-label={p.label}
                  title={p.label}
                  onClick={enabled ? () => onPick(p.key) : undefined}
                  style={{
                    position: 'absolute', left: pos + '%', top: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: enabled ? 'pointer' : 'default', zIndex: 2,
                    opacity: enabled ? 1 : 0.4,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: isActive ? 16 : 13, height: isActive ? 16 : 13, borderRadius: '50%',
                      background: passed && enabled ? COLORS.accent : ELEV.raised,
                      border: `2px solid ${isActive ? '#fff' : (passed && enabled ? COLORS.accent : (enabled ? `${COLORS.accent}88` : COLORS.borderLight))}`,
                      boxShadow: isActive ? `0 0 0 4px ${COLORS.accent}33` : 'none',
                      transition: 'width .12s, height .12s',
                    }}
                  />
                </div>
              );
            })}
            {/* Scrub head — sits AT the active node (discrete snap). */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', left: headPos + '%', top: '50%',
                transform: 'translate(-50%,-50%)', width: 3, height: 22, borderRadius: 2,
                background: '#fff', boxShadow: ELEV.shadow1, zIndex: 3, pointerEvents: 'none',
                transition: 'left .18s ease',
              }}
            />
          </div>
          {/* Node labels. */}
          <div style={{ position: 'relative', height: 15, marginTop: 4 }}>
            {nodes.map((p, i) => {
              const pos = posFor(i);
              const isActive = i === activeIdx;
              const enabled = p.enabled;
              return (
                <span
                  key={p.key}
                  data-testid={`phase-seg-label-${p.key}`}
                  onClick={enabled ? () => onPick(p.key) : undefined}
                  style={{
                    position: 'absolute', left: pos + '%',
                    transform: pos === 0 ? 'none' : pos === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                    fontFamily: FONT, fontSize: 11, fontWeight: isActive ? 800 : 600,
                    color: isActive ? COLORS.accent : COLORS.textMuted,
                    cursor: enabled ? 'pointer' : 'default', whiteSpace: 'nowrap',
                    opacity: enabled ? 1 : 0.45,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
