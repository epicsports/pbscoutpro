import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Minimize2 } from 'lucide-react';
import { COLORS, FONT, ELEV, TRACKING } from '../../utils/theme';

/**
 * FieldFullscreen — § 1c AMBER. A reusable, VIEW-ONLY fullscreen overlay that
 * maximizes a field (any self-sizing canvas) over the device viewport, with an
 * OPTIONAL bottom contextual phase-axis (FFAxis). Mirrors the prototype
 * `FIELDFULL_UI.FieldFullscreen` + `FFAxis` (prototype/fieldfull.jsx) using prod
 * theme tokens.
 *
 * AMBER boundary (hard): VIEW + phase-scrub ONLY. NO write path, NO drawing/edit
 * palette (that is the RED field-edit-rail, out of scope). The prototype's draw
 * palette + Dane toggle are deliberately EXCLUDED. Layer toggles (Warstwy) and
 * the Rysuj/draw entry stay on the page — to change layers, close fullscreen.
 *
 * The `field` prop is either a node OR a render-prop `(stageHeight) => node`. The
 * render-prop form lets the caller build its canvas with a height cap matching the
 * measured stage box (HeatmapCanvas `maxCanvasHeight`, HitabilityCanvas `maxHeight`)
 * so the field fills the maximized area without overflow.
 *
 * The bottom axis renders ONLY when `phases` is a non-empty array — the data-less
 * screen (HitabilityPage) passes no `phases`, so its axis is HIDDEN.
 *
 * §27: ELEV layers for chrome, amber RESERVED for interactive (play button +
 * active keyframe + close pill border), 44px touch targets, edge-case safe
 * (empty/single-keyframe axis, missing labels).
 */

// ── Bottom phase axis (keyframes) — self-contained play + scrub. View-only:
// `onPhase(key)` drives the caller's existing phase state (e.g. setHmPhase),
// which swaps the field overlay content per phase. No write path. ──
function FFAxis({ phases, activeKey, label, playingLabel, hintLabel, onPhase }) {
  const list = Array.isArray(phases) && phases.length ? phases : null;
  const idxOfKey = list ? Math.max(0, list.findIndex((p) => p.key === activeKey)) : 0;
  const posOf = (i) => (!list || list.length <= 1 ? 0 : Math.round((i / (list.length - 1)) * 100));
  const idxAt = (p) => {
    if (!list) return 0;
    let best = 0, bd = Infinity;
    list.forEach((_, i) => { const d = Math.abs(posOf(i) - p); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  // Initialize the scrubber AT the currently-active phase so opening fullscreen
  // does NOT reset the caller's selection.
  const [prog, setProg] = useState(() => posOf(idxOfKey));
  const [playing, setPlaying] = useState(false);
  const curIdx = list ? idxAt(prog) : 0;
  const firstRun = useRef(true);

  // Fire onPhase only AFTER mount + only on an actual keyframe change (scrub/play).
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (onPhase && list && list[curIdx]) onPhase(list[curIdx].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curIdx]);

  // Play = animate the scrubber across the keyframes (pure view animation).
  useEffect(() => {
    if (!playing) return undefined;
    let raf, t0;
    const dur = 2600;
    const tick = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min(100, ((ts - t0) / dur) * 100);
      setProg(p);
      if (p < 100) raf = requestAnimationFrame(tick); else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  if (!list) return null;
  const play = () => { setProg(0); setPlaying(true); };
  const scrub = (p) => { setPlaying(false); setProg(Math.max(0, Math.min(100, p))); };
  const multi = list.length > 1;

  return (
    <div data-testid="fs-phase-axis" style={{
      flexShrink: 0, padding: '12px 18px calc(10px + env(safe-area-inset-bottom, 0px))',
      borderTop: `1px solid ${ELEV.hairline}`, background: ELEV.surface,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.textDim, letterSpacing: TRACKING.label, textTransform: 'uppercase' }}>{label || ''}</span>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: playing ? COLORS.accent : COLORS.textMuted }}>
          {playing ? (playingLabel || '') : (multi ? (hintLabel || '') : '')}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div role="button" aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing}
          data-testid="fs-phase-play"
          onClick={multi ? (playing ? () => setPlaying(false) : play) : undefined}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: multi ? `linear-gradient(150deg, ${COLORS.accent}, ${COLORS.accentDim})` : ELEV.sunken,
            color: multi ? COLORS.black : COLORS.textMuted,
            cursor: multi ? 'pointer' : 'default', opacity: multi ? 1 : 0.5,
            boxShadow: multi ? `0 3px 12px ${COLORS.accent}44` : 'none',
            WebkitTapHighlightColor: 'transparent',
          }}>{playing ? <Pause size={15} /> : <Play size={15} />}</div>
        <div role="tablist" aria-label={label || 'phase'} style={{ flex: 1, minWidth: 0, paddingTop: 5 }}>
          {/* track + keyframe dots */}
          <div
            onClick={multi ? (e) => { const r = e.currentTarget.getBoundingClientRect(); scrub(((e.clientX - r.left) / r.width) * 100); } : undefined}
            style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center', cursor: multi ? 'pointer' : 'default' }}>
            <div style={{ height: 6, width: '100%', borderRadius: 999, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, overflow: 'hidden' }}>
              <div style={{ width: prog + '%', height: '100%', borderRadius: 999, background: COLORS.accent }} />
            </div>
            {list.map((p, i) => {
              const pos = posOf(i), active = curIdx === i, passed = prog >= pos - 0.5;
              return (
                <div key={p.key} role="tab" aria-selected={active}
                  data-testid={`fs-phase-${p.key}`}
                  onClick={(e) => { e.stopPropagation(); scrub(pos); }}
                  style={{
                    position: 'absolute', left: pos + '%', top: '50%', transform: 'translate(-50%,-50%)',
                    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 2, WebkitTapHighlightColor: 'transparent',
                  }}>
                  <span style={{
                    width: active ? 15 : 12, height: active ? 15 : 12, borderRadius: '50%',
                    background: passed ? COLORS.accent : ELEV.raised,
                    border: `2px solid ${active ? '#fff' : (passed ? COLORS.accent : COLORS.accent + '88')}`,
                    boxShadow: active ? `0 0 0 4px ${COLORS.accent}33` : 'none', transition: 'width .12s, height .12s',
                  }} />
                </div>
              );
            })}
          </div>
          {/* keyframe labels */}
          <div style={{ position: 'relative', height: 15, marginTop: 6 }}>
            {list.map((p, i) => {
              const pos = posOf(i), active = curIdx === i;
              return (
                <span key={p.key} onClick={() => scrub(pos)}
                  style={{
                    position: 'absolute', left: pos + '%',
                    transform: pos === 0 ? 'none' : pos === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                    fontFamily: FONT, fontSize: 11, fontWeight: active ? 800 : 600,
                    color: active ? COLORS.accent : COLORS.textMuted, whiteSpace: 'nowrap', cursor: 'pointer',
                  }}>{p.label}</span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FieldFullscreen({
  onClose, title, subtitle, closeLabel,
  field,
  phases = null, activePhaseKey = null, onPhase = null,
  axisLabel, playingLabel, hintLabel,
}) {
  const stageRef = useRef(null);
  const [stageH, setStageH] = useState(0);

  // Esc closes; lock body scroll while open (view overlay).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [onClose]);

  // Measure the stage box so the caller can cap its canvas to the maximized area.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setStageH(Math.round(r.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fieldNode = typeof field === 'function' ? field(stageH || undefined) : field;

  const overlay = (
    <div data-testid="field-fullscreen" style={{
      position: 'fixed', inset: 0, zIndex: 300, background: ELEV.bg,
      display: 'flex', flexDirection: 'column', overscrollBehavior: 'contain',
    }}>
      {/* top bar — close + title (no draw/data tools: view-only) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', flexShrink: 0 }}>
        <div role="button" aria-label={closeLabel || 'Close'} data-testid="fs-close"
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 14px',
            borderRadius: 12, cursor: 'pointer', flexShrink: 0,
            background: ELEV.surface, border: `1px solid ${COLORS.accent}55`, color: COLORS.accent,
            fontFamily: FONT, fontSize: 13.5, fontWeight: 800, WebkitTapHighlightColor: 'transparent',
          }}>
          <Minimize2 size={16} />{closeLabel && <span>{closeLabel}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, marginLeft: 2 }}>
          {title && <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>}
          {subtitle && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '.4px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>}
        </div>
      </div>

      {/* field stage — maximized, centered */}
      <div ref={stageRef} style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 12px 10px', overflow: 'hidden',
      }}>
        {stageH > 0 && fieldNode}
      </div>

      {/* contextual phase axis — renders ONLY when `phases` provided */}
      {Array.isArray(phases) && phases.length > 0 && (
        <FFAxis phases={phases} activeKey={activePhaseKey} label={axisLabel}
          playingLabel={playingLabel} hintLabel={hintLabel} onPhase={onPhase} />
      )}
    </div>
  );

  if (typeof document !== 'undefined' && document.body) return createPortal(overlay, document.body);
  return overlay;
}
