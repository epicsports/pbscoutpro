import React, { useMemo } from 'react';
import { Star, AlertTriangle } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { computeMatchBreakdown } from '../../utils/scoutStats';

/**
 * CompletenessCard — match-view scouting completeness summary.
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
 *   ≥90% → COLORS.accent (gold) + ⭐ badge — celebrate
 *   70-89% → COLORS.success (green)
 *   50-69% → COLORS.accent (amber) — needs attention (no badge)
 *   <50% → COLORS.danger (red) + ⚠ badge — incomplete
 */
export default function CompletenessCard({ points = [] }) {
  const { t } = useLanguage();

  const breakdown = useMemo(() => computeMatchBreakdown(points), [points]);

  if (!points.length || !breakdown) {
    return (
      <div style={cardStyle}>
        <div style={titleStyle}>{t('completeness_section_title') || 'Scouting completeness'}</div>
        <div style={emptyStyle}>{t('completeness_empty') || 'No points scouted yet'}</div>
      </div>
    );
  }

  const rows = [
    { label: t('completeness_breaks')       || 'Breaks',       pct: breakdown.breakPct },
    { label: t('completeness_shots')        || 'Shots',        pct: breakdown.shotPct },
    { label: t('completeness_assignments')  || 'Assignments',  pct: breakdown.assignPct },
    { label: t('completeness_runners')      || 'Runners',      pct: breakdown.runnerPct },
    { label: t('completeness_eliminations') || 'Eliminations', pct: breakdown.elimPct },
  ];

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>{t('completeness_section_title') || 'Scouting completeness'}</div>
      <div style={{ marginTop: SPACE.md, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(row => <MetricRow key={row.label} label={row.label} pct={row.pct} />)}
      </div>
      <div style={dividerStyle} />
      <OverallRow
        label={t('completeness_overall') || 'Overall'}
        pct={breakdown.composite}
      />
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
    <div style={{ ...rowStyle, marginTop: SPACE.sm }}>
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
  if (kind === 'star') return <Star size={size} color={color} fill={color} strokeWidth={1.5} style={{ flexShrink: 0 }} />;
  if (kind === 'warn') return <AlertTriangle size={size} color={color} strokeWidth={2} style={{ flexShrink: 0 }} />;
  // Empty fixed-width slot keeps the percentage column visually aligned
  // across rows whether or not a badge appears.
  return <span style={{ display: 'inline-block', width: size, flexShrink: 0 }} />;
}

/* ─── styles ───────────────────────────────────────────────────────── */

const cardStyle = {
  background: COLORS.surfaceDark,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADIUS.lg,
  padding: SPACE.lg,
  margin: '0 12px 12px',
};

const titleStyle = {
  fontFamily: FONT,
  fontSize: FONT_SIZE.xs,
  fontWeight: 600,
  color: COLORS.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '.4px',
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: SPACE.sm,
};

const labelStyle = {
  fontFamily: FONT,
  fontSize: FONT_SIZE.sm,
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
  fontSize: FONT_SIZE.md,
  fontWeight: 700,
};

const barTrackStyle = {
  flex: 1,
  height: 6,
  borderRadius: 3,
  background: COLORS.border,
  overflow: 'hidden',
};

const barFillStyle = {
  height: '100%',
  borderRadius: 3,
  transition: 'width .2s ease',
};

const valueStyle = {
  fontFamily: FONT,
  fontSize: FONT_SIZE.sm,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
  minWidth: 42,
  flexShrink: 0,
};

const overallValueStyle = {
  ...valueStyle,
  fontSize: FONT_SIZE.md,
  fontWeight: 800,
  minWidth: 48,
};

const dividerStyle = {
  height: 1,
  background: COLORS.border,
  margin: `${SPACE.md}px 0 ${SPACE.sm}px`,
};

const emptyStyle = {
  fontFamily: FONT,
  fontSize: FONT_SIZE.sm,
  color: COLORS.textMuted,
  fontStyle: 'italic',
  textAlign: 'center',
  padding: `${SPACE.md}px 0`,
};
