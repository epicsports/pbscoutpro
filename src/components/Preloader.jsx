import React, { useState, useEffect, useRef } from 'react';
import { COLORS, ELEV } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

/**
 * Preloader — premium determinate loader for heavy screens (North Star redesign).
 *
 * A coach draws a straight tactical line across a mini field — the stroke reveals
 * in lock-step with progress, then an arrowhead and a shooting-target reticle draw
 * on at the end. A determinate bar + tabular % + a phase label narrate the load.
 * Brand-true (amber accent, field/bunker motif), fully tokenized — no raw hexes,
 * no emoji. Ported 1:1 from the design handoff (`prototype/preloader.jsx` →
 * `window.RDX_PRELOADER.Preloader`); `window.PT` tokens → `src/utils/theme`.
 *
 * PRODUCTION uses REAL progress: pass `progress` (0–100) from the screen's actual
 * load stages — the bar follows it monotonically and `onDone` fires once it holds
 * at 100%. Without `progress` it falls back to a time-driven sweep over `duration`
 * (the demo behaviour). `phases[].to` are the % thresholds at which `label` flips.
 *
 * Renders `position:absolute; inset:0` — the parent must be `position:relative`
 * with a sensible `minHeight`.
 *
 * Props:
 *   phases   — [{ label, to }] phase labels keyed to % thresholds
 *   progress — real progress 0–100 (production); omit for the time-driven fallback
 *   onDone   — called once after reaching 100% (~820ms hold). loop must be false.
 *   loop     — demo only (default false in production); restarts at 0 after 100%
 *   duration — fallback sweep duration (ms) when no real `progress` is supplied
 *   accent   — accent color (default COLORS.accent)
 *   caption  — small footer caption
 */

const MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace";
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp = (v) => Math.max(0, Math.min(100, v));

export default function Preloader({
  phases,
  progress = null,
  accent = COLORS.accent,
  onDone,
  duration = 2300,
  loop = false,
  caption = 'reads · paintball intelligence',
}) {
  const { t } = useLanguage();
  const phaseList = (phases && phases.length) ? phases : [{ label: t('preloader_loading'), to: 100 }];
  const driven = typeof progress === 'number'; // real-progress mode vs time fallback
  const [p, setP] = useState(driven ? Math.round(clamp(progress)) : 0);
  const held = useRef(false);
  const doneRef = useRef(false);

  // Drive `p`. Real mode: follow `progress` monotonically (never go backwards on a
  // re-render). Fallback: ease 0→100 over `duration`.
  useEffect(() => {
    if (driven) {
      setP((prev) => Math.max(prev, Math.round(clamp(progress))));
      return undefined;
    }
    let alive = true;
    let t0 = Date.now();
    const id = setInterval(() => {
      if (!alive) return;
      const frac = Math.min(1, (Date.now() - t0) / duration);
      setP(Math.round(ease(frac) * 100));
    }, 40);
    return () => { alive = false; clearInterval(id); };
  }, [driven, progress, duration]);

  // Completion (both modes): hold ~820ms at 100% → loop (demo) or fire onDone once.
  useEffect(() => {
    if (p < 100 || held.current) return undefined;
    held.current = true;
    const tid = setTimeout(() => {
      if (loop) { held.current = false; setP(0); }
      else if (!doneRef.current) { doneRef.current = true; if (onDone) onDone(); }
    }, 820);
    return () => clearTimeout(tid);
  }, [p, loop, onDone]);

  // line draws 0→80%, arrowhead 78→92%, target 90→100%
  const phase = phaseList.find((ph) => p <= ph.to) || phaseList[phaseList.length - 1];
  const complete = p >= 100;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.bg, overflow: 'hidden' }}>
      {/* faint field grid backdrop */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: `linear-gradient(${ELEV.hairline} 1px, transparent 1px), linear-gradient(90deg, ${ELEV.hairline} 1px, transparent 1px)`, backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse 60% 60% at 50% 45%, #000 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 45%, #000 30%, transparent 75%)' }} />

      <div style={{ position: 'relative', width: 320, maxWidth: '82%', padding: '28px 28px 24px', borderRadius: 20, background: ELEV.surface, border: `1px solid ${ELEV.hairlineStrong}`, boxShadow: ELEV.shadow2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* ── phase label + tabular % ── */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
          <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, letterSpacing: '2px', color: complete ? accent : COLORS.textDim, textTransform: 'uppercase', transition: 'color .2s' }}>
            {complete ? t('preloader_done') : (phase.label || t('preloader_loading'))}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>
            {String(p).padStart(2, '0')}<span style={{ fontSize: 11, opacity: 0.6 }}>%</span>
          </span>
        </div>

        {/* ── determinate bar ── */}
        <div style={{ width: '100%', height: 7, borderRadius: 99, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '100%', width: `${p}%`, borderRadius: 99, background: `linear-gradient(90deg, ${accent}cc, ${accent})`, boxShadow: `0 0 10px ${accent}66`, transition: 'width .12s linear' }} />
          {/* moving sheen */}
          {!complete && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.max(0, p - 14)}%`, width: '14%', background: `linear-gradient(90deg, transparent, ${COLORS.white}55, transparent)` }} />}
        </div>

        {/* ── caption ── */}
        {caption && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.5px', color: COLORS.textMuted, marginTop: 16, textTransform: 'uppercase' }}>{caption}</div>}
      </div>
    </div>
  );
}
