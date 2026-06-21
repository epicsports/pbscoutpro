import React from 'react';
import { COLORS, ELEV, FONT, TRACKING, TNUM, ZONE_COLORS } from '../../utils/theme';

/**
 * RdDataViz — the premium "North Star" data-viz vocabulary (design handoff
 * `reference/redesign.jsx`). Five themed, tabular chart primitives shared by the
 * player-stats / opponent-analysis / live screens, plus the `rdPct` value-color
 * helper. Each is matched to the data's nature:
 *   - RdSplitBar   (:836) — proportional tri-split; each lane WIDTH == its share
 *   - RdFieldLanes (:880) — top-down field, 3 lanes shaded by frequency (spatial)
 *   - RdStack      (:944) — 100% stacked bar; few ordered parts summing to 100
 *   - RdGaugeCards (:969) — a rate per item (e.g. survival %); ring per card
 *   - RdDonut      (:1003) — categorical composition, few slices (Σ100%)
 *
 * Ported verbatim from the handoff with token aliases swapped to src/utils/theme
 * (RC→COLORS, RE→ELEV, RF→FONT, RK→TRACKING). PURELY PRESENTATIONAL — callers
 * pass pre-computed `items` + a `palette`/`colorFn`. Side labels + the points
 * unit are props (English defaults) so the page owns the display language.
 *
 * § 27: value colors come from the caller (winRateColor / ZONE_COLORS) — amber is
 * never used as a decorative fill. RdGaugeCards' rank-0 highlight is success-green
 * (informational "best start", not interactive) per § 27 "amber = interactive only".
 */

const SIDE_NAMES = { snake: 'Snake', center: 'Center', dorito: 'Dorito' };
const SIDE_ORDER = ['snake', 'center', 'dorito'];

const vizCard = { background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, borderRadius: 14, boxShadow: ELEV.shadow1 };

// Value-color helper — 0 → danger, <50 → accent (mid, matches §28 win-rate
// convention), else success. Callers that already use winRateColor (40/70
// thresholds) should pass that instead for cross-surface consistency.
export const rdPct = (v) => (v === 0 ? COLORS.danger : v < 50 ? COLORS.accent : COLORS.success);

// 0 ── Proportional tri-split bar — each lane's WIDTH == its share of the whole.
export function RdSplitBar({ items, palette = ZONE_COLORS, names = SIDE_NAMES, unit = 'pts' }) {
  const by = Object.fromEntries(items.map(i => [i.side, i]));
  const lanes = SIDE_ORDER.map(side => by[side]).filter(Boolean);
  const max = Math.max(...lanes.map(i => i.pct), 0);
  return (
    <div style={{ ...vizCard, padding: 14 }}>
      <div style={{ display: 'flex', height: 76, borderRadius: 11, overflow: 'hidden', background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, gap: 2 }}>
        {lanes.map((it, i) => {
          const col = palette[it.side] || COLORS.accent;
          const wide = it.pct >= 14;
          return (
            <div key={i} style={{ flexGrow: it.pct, flexShrink: 1, flexBasis: 0, minWidth: it.pct > 0 ? 4 : 0, background: it.pct === 0 ? 'transparent' : `linear-gradient(180deg, ${col}, ${col}cc)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              {wide && (
                <>
                  <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase', color: '#0b0f17', opacity: 0.72, whiteSpace: 'nowrap' }}>{names[it.side]}</span>
                  <span style={{ fontFamily: FONT, fontSize: 26, fontWeight: 900, color: '#0b0f17', lineHeight: 1, marginTop: 2, ...TNUM }}>{it.pct}<span style={{ fontSize: 13, fontWeight: 800 }}>%</span></span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {SIDE_ORDER.map((side) => {
          const it = by[side]; if (!it) return null;
          const col = palette[side] || COLORS.accent;
          return (
            <div key={side} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 9, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}` }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: it.pct === 0 ? COLORS.textMuted : col, flexShrink: 0, opacity: it.pct === 0 ? 0.5 : 1 }}></span>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.textDim, whiteSpace: 'nowrap' }}>{names[side]}</span>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.textMuted, ...TNUM }}>{it.n} {unit}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 1 ── Field-lane map (top-down). 3 fixed lanes shaded by frequency.
export function RdFieldLanes({ items, palette = ZONE_COLORS, names = SIDE_NAMES, unit = 'pts' }) {
  const by = Object.fromEntries(items.map(i => [i.side, i]));
  const lanes = SIDE_ORDER.map(side => by[side]).filter(Boolean);
  const max = Math.max(...lanes.map(i => i.pct), 1);
  const bunker = (side, cx, col, on) => {
    const o = on ? 1 : 0.32;
    if (side === 'snake') return <rect x={cx - 3} y={70} width={6} height={42} rx={3} fill={col} opacity={o} />;
    if (side === 'dorito') return <path d={`M${cx} 70 L${cx + 11} 110 L${cx - 11} 110 Z`} fill={col} opacity={o} />;
    return <rect x={cx - 9} y={84} width={18} height={11} rx={2.5} fill={col} opacity={o} />;
  };
  return (
    <div style={{ ...vizCard, padding: 12 }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox="0 0 300 182" width="100%" style={{ display: 'block' }}>
          <defs>
            {lanes.map((it, i) => (
              <linearGradient key={i} id={`lane${it.side}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={palette[it.side] || COLORS.accent} stopOpacity={0.06 + 0.5 * (it.pct / max)} />
                <stop offset="100%" stopColor={palette[it.side] || COLORS.accent} stopOpacity={0.02 + 0.12 * (it.pct / max)} />
              </linearGradient>
            ))}
          </defs>
          <rect x="11" y="11" width="278" height="160" rx="15" fill={ELEV.sunken} stroke={ELEV.hairline} strokeWidth="1.5" />
          {SIDE_ORDER.map((side, i) => {
            const it = by[side]; if (!it) return null;
            const x = 12 + i * (276 / 3), w = 276 / 3, cx = x + w / 2;
            const col = palette[side] || COLORS.accent;
            const on = it.pct === max && it.pct > 0;
            return (
              <g key={side}>
                <rect x={x} y="12" width={w} height="158" fill={`url(#lane${side})`} />
                {i > 0 && <line x1={x} y1="16" x2={x} y2="166" stroke={ELEV.hairline} strokeDasharray="3 5" />}
                {bunker(side, cx, col, on)}
                <circle cx={cx} cy="158" r="3" fill={on ? col : COLORS.textMuted} opacity={on ? 1 : 0.5} />
              </g>
            );
          })}
          <line x1="14" y1="91" x2="286" y2="91" stroke={COLORS.textMuted} strokeOpacity="0.35" strokeDasharray="2 6" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {SIDE_ORDER.map((side, i) => {
            const it = by[side]; if (!it) return null;
            const col = palette[side] || COLORS.accent;
            const on = it.pct === max && it.pct > 0;
            return (
              <div key={side} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i / 3) * 100}%`, width: `${100 / 3}%`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0 12px' }}>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase', color: on ? col : COLORS.textMuted }}>{names[side]}</span>
                <div style={{ textAlign: 'center', lineHeight: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 900, color: on ? COLORS.text : COLORS.textDim, letterSpacing: '-1px', ...TNUM }}>{it.pct}<span style={{ fontSize: 13, fontWeight: 800, color: COLORS.textMuted }}>%</span></div>
                  <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted, marginTop: 3, ...TNUM }}>{it.n} {unit}</div>
                </div>
                <span style={{ width: 7, height: 7 }}></span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 2 ── 100% stacked segment bar — share that sums to 100, few ordered parts.
export function RdStack({ items, palette = ZONE_COLORS }) {
  const nz = items.filter(i => i.pct > 0);
  return (
    <div style={{ ...vizCard, padding: '15px 16px 14px' }}>
      <div style={{ display: 'flex', height: 26, borderRadius: 8, overflow: 'hidden', background: ELEV.sunken, border: `1px solid ${ELEV.hairline}` }}>
        {nz.map((it, i) => (
          <div key={i} style={{ width: `${it.pct}%`, background: palette[it.side] || COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: i < nz.length - 1 ? `1.5px solid ${ELEV.surface}` : 'none' }}>
            {it.pct >= 18 && <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 900, color: '#0b0f17', ...TNUM }}>{it.pct}%</span>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: it.pct === 0 ? 0.45 : 1 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: palette[it.side] || COLORS.accent, flexShrink: 0 }}></span>
            <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.textDim }}>{it.k}</span>
            <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.text, ...TNUM }}>{it.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3 ── Gauge-ring cards — a rate per item (survival %). Flexes 1–5 in a grid.
// `colorFn(pct)` colors each ring; `topColor` highlights the top-ranked card
// (success-green default — informational, § 27-clean, never amber). `topLabel`
// is the badge text on that card; pass null to suppress.
export function RdGaugeCards({ items, colorFn = rdPct, unit = 'pts', topColor = COLORS.success, topLabel = 'TOP START' }) {
  const ring = (pct, color, size = 78) => {
    const r = size / 2 - 6, cx = size / 2, C = 2 * Math.PI * r, len = (pct / 100) * C;
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={ELEV.sunken} strokeWidth="6" />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${len} ${C - len}`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontFamily: FONT, fontSize: 19, fontWeight: 900, color: COLORS.text, ...TNUM }}>{pct}</span>
          <span style={{ fontFamily: FONT, fontSize: 8, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '.5px' }}>%</span>
        </div>
      </div>
    );
  };
  const ranked = [...items].sort((a, b) => b.surv - a.surv);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, items.length)}, 1fr)`, gap: 8 }}>
      {ranked.map((it, i) => (
        <div key={i} style={{ ...vizCard, padding: '15px 8px 13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
          {ring(it.surv, colorFn(it.surv))}
          <div style={{ textAlign: 'center', lineHeight: 1.15 }}>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: COLORS.text }}>{it.k}</div>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, marginTop: 2, ...TNUM }}>{it.pts} {unit}</div>
          </div>
          {i === 0 && topLabel && <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 900, letterSpacing: '.5px', color: topColor, background: `${topColor}1a`, border: `1px solid ${topColor}40`, borderRadius: 5, padding: '2px 7px' }}>{topLabel}</span>}
        </div>
      ))}
    </div>
  );
}

// 4 ── Donut — categorical composition, few slices (Σ100%).
export function RdDonut({ items, palette = ZONE_COLORS }) {
  const size = 132, r = size / 2 - 11, cx = size / 2, C = 2 * Math.PI * r;
  const total = items.reduce((s, it) => s + it.pct, 0) || 1;
  const top = [...items].sort((a, b) => b.pct - a.pct)[0];
  let off = 0;
  return (
    <div style={{ ...vizCard, padding: '16px', display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={ELEV.sunken} strokeWidth="15" />
          {items.map((it, i) => {
            const len = (it.pct / total) * C;
            const el = <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={palette[it.side] || COLORS.accent} strokeWidth="15" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />;
            off += len; return el;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
          <span style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: COLORS.text, ...TNUM }}>{top.pct}%</span>
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.textMuted, marginTop: 3, maxWidth: 70, textAlign: 'center' }}>{top.k}</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: palette[it.side] || COLORS.accent, flexShrink: 0 }}></span>
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.k}</span>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: COLORS.text, ...TNUM }}>{it.pct}%</span>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, ...TNUM }}>· {it.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
