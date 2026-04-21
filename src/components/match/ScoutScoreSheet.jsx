import React, { useMemo } from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * ScoutScoreSheet — data-completeness dashboard for the scout role.
 *
 * Replaces the coaching-analytics row (CoachingStats) when the active user
 * has scout role but not admin/coach. Scouts can't action dorito/snake/etc.
 * percentages — those require coaching interpretation. Instead they need to
 * know "did I capture everything for this match?".
 *
 * Four rows:
 *   1. Players placed — non-null `{side}Data.players` slots / (5 × pointCount)
 *   2. Breaks         — placed AND within 15% of a bunker (brief § 30 kill
 *                       attribution distance threshold) / (5 × pointCount)
 *   3. Shots recorded — non-runner players with ≥1 entry in quickShots or
 *                       obstacleShots / non-runner player count
 *   4. Result         — match outcome + score (status-aware)
 *
 * Color semantics on the value column (§ 27 color discipline):
 *   100%  → green  (success)
 *   60-99% → amber (partial — legitimate state marker, not decoration)
 *   <60%  → red   (incomplete)
 *   Result → neutral (never pct-colored)
 *
 * Props:
 *   points           — array of point docs from match
 *   match            — match doc (outcome + score + status)
 *   scoutedTeamSide  — 'home' | 'away' (which side this scout was scouting)
 *   bunkers          — layout bunkers (for breaks bunker-inference); may be []
 *   teamNameA        — display name for team A (optional, fallback 'Team A')
 *   teamNameB        — display name for team B (optional, fallback 'Team B')
 */
const BUNKER_DIST_THRESHOLD = 0.15;

function nearestBunkerWithinThreshold(pos, bunkers) {
  if (!pos || !bunkers?.length) return false;
  for (const b of bunkers) {
    if (typeof b?.x !== 'number' || typeof b?.y !== 'number') continue;
    const dx = b.x - pos.x;
    const dy = b.y - pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < BUNKER_DIST_THRESHOLD) return true;
  }
  return false;
}

// Pick the scout's own side data, accepting both new (homeData/awayData) and
// legacy (teamA/teamB) shapes.
function pickSideData(point, scoutedTeamSide) {
  if (scoutedTeamSide === 'away') return point?.awayData || point?.teamB || null;
  return point?.homeData || point?.teamA || null;
}

function hasAnyShot(side, slotIdx) {
  const qs = side?.quickShots;
  const os = side?.obstacleShots;
  const hasIn = (obj) => {
    if (!obj) return false;
    if (Array.isArray(obj)) return obj[slotIdx]?.length > 0;
    return (obj[String(slotIdx)]?.length > 0) || (obj[slotIdx]?.length > 0);
  };
  return hasIn(qs) || hasIn(os);
}

export default function ScoutScoreSheet({
  points = [],
  match,
  scoutedTeamSide = 'home',
  bunkers = [],
  teamNameA,
  teamNameB,
}) {
  const { t } = useLanguage();

  const pointCount = points.length;

  const metrics = useMemo(() => {
    if (!pointCount) return null;
    const totalSlots = pointCount * 5;
    let placed = 0;
    let breaks = 0;
    let nonRunners = 0;
    let nonRunnersWithShots = 0;

    points.forEach(pt => {
      const side = pickSideData(pt, scoutedTeamSide);
      if (!side) return;
      const players = side.players || [];
      const runners = side.runners || [];
      for (let i = 0; i < 5; i++) {
        const p = players[i];
        const isRunner = !!runners[i];
        if (p) {
          placed++;
          if (nearestBunkerWithinThreshold(p, bunkers)) breaks++;
        }
        if (!isRunner) {
          nonRunners++;
          if (p && hasAnyShot(side, i)) nonRunnersWithShots++;
        }
      }
    });

    return { totalSlots, placed, breaks, nonRunners, nonRunnersWithShots };
  }, [points, scoutedTeamSide, bunkers, pointCount]);

  if (!pointCount || !metrics) {
    return (
      <div style={emptyStyle}>
        {t('scout_sheet_empty')}
      </div>
    );
  }

  // Shape value rows for reusable renderer.
  const rows = [
    {
      label: t('scout_sheet_players_placed'),
      done: metrics.placed,
      total: metrics.totalSlots,
    },
    {
      label: t('scout_sheet_breaks'),
      done: metrics.breaks,
      total: metrics.totalSlots,
    },
    {
      label: t('scout_sheet_shots_recorded'),
      done: metrics.nonRunnersWithShots,
      total: metrics.nonRunners,
    },
  ];

  const resultText = buildResultLine({ match, teamNameA, teamNameB, t });

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>{t('scout_sheet_title')}</div>
      {rows.map((row, i) => (
        <MetricRow key={row.label} row={row} lastMetric={i === rows.length - 1} />
      ))}
      <ResultRow text={resultText} />
    </div>
  );
}

function MetricRow({ row, lastMetric }) {
  const { label, done, total } = row;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const valueColor = total === 0
    ? COLORS.textMuted
    : pct >= 100 ? COLORS.success
    : pct >= 60 ? COLORS.accent
    : COLORS.danger;
  const barColor = valueColor;
  const barBg = COLORS.surfaceLight;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={rowStyle}>
        <span style={labelStyle}>{label}</span>
        <span style={{ ...valueStyle, color: valueColor }}>
          {total > 0 ? `${done}/${total} (${pct}%)` : '—'}
        </span>
      </div>
      <div style={{ ...barTrackStyle, background: barBg, marginTop: 6, marginBottom: lastMetric ? 10 : 0 }}>
        <div style={{ ...barFillStyle, width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

function ResultRow({ text }) {
  return (
    <div style={{ ...rowStyle, marginTop: 6, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
      <span style={labelStyle}>{text.label}</span>
      <span style={{ ...valueStyle, color: COLORS.text }}>{text.value}</span>
    </div>
  );
}

// Human-readable result/score line with graceful fallbacks on shapes.
function buildResultLine({ match, teamNameA, teamNameB, t }) {
  const nameA = teamNameA || 'Team A';
  const nameB = teamNameB || 'Team B';
  const sA = match?.scoreA || 0;
  const sB = match?.scoreB || 0;
  const status = match?.status || 'open';
  const score = `${sA}\u2013${sB}`;

  if (status === 'closed' || match?.outcome) {
    if (sA > sB) return { label: t('scout_sheet_result'), value: t('scout_sheet_result_won', { team: nameA, score }) };
    if (sB > sA) return { label: t('scout_sheet_result'), value: t('scout_sheet_result_won', { team: nameB, score }) };
    return { label: t('scout_sheet_result'), value: t('scout_sheet_result_draw', { score }) };
  }
  // open / live
  return { label: t('scout_sheet_result'), value: t('scout_sheet_result_in_progress', { score }) };
}

// ─── styles ───

const cardStyle = {
  background: COLORS.surfaceDark,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADIUS.lg,
  padding: '14px',
  margin: '0 12px 12px',
};

const titleStyle = {
  fontFamily: FONT, fontSize: 11, fontWeight: 600,
  color: COLORS.textMuted,
  letterSpacing: '.4px',
  textTransform: 'uppercase',
};

const rowStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: SPACE.md,
};

const labelStyle = {
  fontFamily: FONT, fontSize: 13, fontWeight: 500, color: COLORS.textDim,
  flex: 1, minWidth: 0,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const valueStyle = {
  fontFamily: FONT, fontSize: 13, fontWeight: 700,
  textAlign: 'right', flexShrink: 0,
  fontVariantNumeric: 'tabular-nums',
};

const barTrackStyle = {
  height: 4,
  borderRadius: 2,
  overflow: 'hidden',
};

const barFillStyle = {
  height: '100%',
  borderRadius: 2,
  transition: 'width .2s ease',
};

const emptyStyle = {
  fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
  fontStyle: 'italic',
  textAlign: 'center',
  padding: '14px 18px',
  margin: '0 12px 12px',
  background: COLORS.surfaceDark,
  border: `1px solid ${COLORS.border}`,
  borderRadius: RADIUS.lg,
};
