import React, { useMemo, useState } from 'react';
import { COLORS, FONT, ELEV, TNUM, TRACKING } from '../../utils/theme';
import RdIcon from '../RdIcon';
import { useLanguage } from '../../hooks/useLanguage';
import { computeMatchBreakdown } from '../../utils/scoutStats';

/**
 * CompletenessCard — match-view scouting completeness summary.
 *
 * Premium "North Star" re-skin (RdCompleteness look): ELEV.surface + hairline
 * card, TRACKING.label eyebrow header, per-metric bar on an ELEV.sunken track
 * with a colored fill + TNUM % readout, collapse toggle via RdIcon chevron.
 * Props/API + every metric + role-gating + collapse behaviour are preserved —
 * this change is visual-only.
 *
 * Replaces (a) the inline 2-bar mini-summary that lived inside the Points
 * list block (Breaks + Shots only) and (b) the scout-only ScoutScoreSheet
 * which had a 3-row variant of the same data with a different threshold
 * scale. One canonical card, visible to scout/coach/admin (pure-player
 * sees nothing here — they don't scout).
 *
 * Metrics mirror the 5 sections + composite from the scout ranking page
 * (`computeMatchBreakdown` aggregates both homeData + awayData scouts'
 * work for this match):
 *   1. Breaks       — placed / totalSlots             (35% in composite)
 *   2. Shots        — withShots / nonRunners          (20%)
 *   3. Przypisania  — assigned / placedForAssign      (20%)
 *   4. Biegacze     — runnerFlagged / placedForRunner (10%)
 *   5. Eliminacje   — elimMarked / placedForElim      (15%)
 *   ── divider ──
 *   Ogólny wskaźnik — weighted composite (per ranking weights)
 *
 * Color scale (§ 27 exception — documented in deploy log; precedent set
 * by `compositeColor()` already using amber for non-interactive ranking
 * tiers):
 *   ≥90% → COLORS.accent (gold) + star badge — celebrate
 *   70-89% → COLORS.success (green)
 *   50-69% → COLORS.accent (amber) — needs attention (no badge)
 *   <50% → COLORS.danger (red) + warn badge — incomplete
 */
export default function CompletenessCard({ points = [] }) {
  const { t } = useLanguage();
  // B7 — collapsed by default; § 27 deference, Points list leads. No
  // localStorage / no persistence: remount resets to collapsed.
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(false);

  const breakdown = useMemo(() => computeMatchBreakdown(points), [points]);
  const title = t('completeness_section_title') || 'Scouting completeness';

  return (
    <div style={cardStyle}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        style={{
          ...headerButtonStyle,
          background: pressed ? ELEV.raised : 'transparent',
        }}
      >
        <span style={titleStyle}>{title}</span>
        <span style={{
          display: 'flex', flexShrink: 0, color: COLORS.textDim,
          transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease',
        }}>
          <RdIcon name="chevron" size={16} />
        </span>
      </button>
      {open && (
        !points.length || !breakdown ? (
          <div style={emptyStyle}>{t('completeness_empty') || 'No points scouted yet'}</div>
        ) : (
          <>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: t('completeness_breaks')       || 'Breaks',       pct: breakdown.breakPct },
                { label: t('completeness_shots')        || 'Shots',        pct: breakdown.shotPct },
                { label: t('completeness_assignments')  || 'Assignments',  pct: breakdown.assignPct },
                { label: t('completeness_runners')      || 'Runners',      pct: breakdown.runnerPct },
                { label: t('completeness_eliminations') || 'Eliminations', pct: breakdown.elimPct },
              ].map(row => <MetricRow key={row.label} label={row.label} pct={row.pct} />)}
            </div>
            <div style={dividerStyle} />
            <OverallRow
              label={t('completeness_overall') || 'Overall'}
              pct={breakdown.composite}
            />
          </>
        )
      )}
    </div>
  );
}

/* ─── helpers ──────────────────────────────────────────────────────── */

function tierFor(pct) {
  if (pct >= 90) return { color: COLORS.accent, badge: 'star' };
  if (pct >= 70) return { color: COLORS.success, badge: null };
  if (pct >= 50) return { color: COLORS.accent, badge: null };
  return { color: COLORS.danger, badge: 'warn' };
}

function MetricRow({ label, pct }) {
  const { color, badge } = tierFor(pct);
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={barTrackStyle}>
        <div style={{ ...barFillStyle, width: `${pct}%`, background: color }} />
      </div>
      <span style={{ ...valueStyle, color }}>{pct}%</span>
      <BadgeIcon kind={badge} color={color} size={14} />
    </div>
  );
}

function OverallRow({ label, pct }) {
  const { color, badge } = tierFor(pct);
  return (
    <div style={{ ...rowStyle, marginTop: 6 }}>
      <span style={overallLabelStyle}>{label}</span>
      <div style={barTrackStyle}>
        <div style={{ ...barFillStyle, width: `${pct}%`, background: color }} />
      </div>
      <span style={{ ...overallValueStyle, color }}>{pct}%</span>
      <BadgeIcon kind={badge} color={color} size={16} />
    </div>
  );
}

function BadgeIcon({ kind, color, size }) {
  if (kind === 'star') return <span style={{ display: 'flex', flexShrink: 0, color }}><RdIcon name="star" size={size} fill={color} /></span>;
  if (kind === 'warn') return <span style={{ display: 'flex', flexShrink: 0, color }}><RdIcon name="warn" size={size} /></span>;
  // Empty fixed-width slot keeps the percentage column visually aligned
  // across rows whether or not a badge appears.
  return <span style={{ display: 'inline-block', width: size, flexShrink: 0 }} />;
}

/* ─── styles ───────────────────────────────────────────────────────── */

const cardStyle = {
  background: ELEV.surface,
  border: `1px solid ${ELEV.hairline}`,
  borderRadius: 14,
  boxShadow: ELEV.shadow1,
  padding: 16,
  margin: '0 12px 12px',
};

// B7 — header is the tap target; ≥44px touch + subtle bg-on-press
// (§ 27 active state = bg change, not border). Native <button> reset:
// no default border/padding/background, inherit font, flex layout.
const headerButtonStyle = {
  width: '100%',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: 0,
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: 'inherit',
  textAlign: 'left',
  transition: 'background 0.12s ease',
  WebkitTapHighlightColor: 'transparent',
};

const titleStyle = {
  fontFamily: FONT,
  fontSize: 12,
  fontWeight: 600,
  color: COLORS.textMuted,
  textTransform: 'uppercase',
  letterSpacing: TRACKING.label,
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const labelStyle = {
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 500,
  color: COLORS.text,
  flex: '0 0 auto',
  minWidth: 110,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const overallLabelStyle = {
  ...labelStyle,
  fontSize: 16,
  fontWeight: 700,
};

const barTrackStyle = {
  flex: 1,
  height: 6,
  borderRadius: 3,
  background: ELEV.sunken,
  border: `1px solid ${ELEV.hairline}`,
  overflow: 'hidden',
};

const barFillStyle = {
  height: '100%',
  borderRadius: 3,
  transition: 'width .2s ease',
};

const valueStyle = {
  fontFamily: FONT,
  fontSize: 14,
  fontWeight: 700,
  ...TNUM,
  textAlign: 'right',
  minWidth: 42,
  flexShrink: 0,
};

const overallValueStyle = {
  ...valueStyle,
  fontSize: 16,
  fontWeight: 800,
  minWidth: 48,
};

const dividerStyle = {
  height: 1,
  background: ELEV.hairline,
  margin: '12px 0 6px',
};

const emptyStyle = {
  fontFamily: FONT,
  fontSize: 14,
  color: COLORS.textMuted,
  fontStyle: 'italic',
  textAlign: 'center',
  padding: '12px 0',
};
