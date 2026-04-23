import React, { useState, useCallback } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import PageHeader from '../PageHeader';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, ZONE_COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';

/**
 * TrainingPickerView — full-screen list of trainings eligible for PPT
 * logging (see DESIGN_DECISIONS § 48.2).
 *
 * Presentation-only component. Parent (PlayerPerformanceTrackerPage)
 * owns the identity resolution, bucketing, and routing; this component
 * just renders the three groups and wires taps on LIVE/Upcoming cards.
 * Ended cards are visible for context but intentionally non-tappable —
 * a closed training can't accept new points.
 *
 * Props:
 *   playerName            — display name for the hero greeting
 *   teamName              — appears in the section divider label
 *   liveTrainings         — Training[] with status === 'live'
 *   upcomingTrainings     — Training[] with status ∉ {live, closed}
 *   endedTrainings        — Training[] with status === 'closed', parent
 *                           is expected to cap at 10 most-recent
 *   layouts               — Layout[] used to resolve training.layoutId → name
 *   onPickTraining        — (training) ⇒ void; called on tappable card tap
 *   loading               — hide empty-state while subscriptions settle
 */

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  } catch { return iso; }
}

function Badge({ kind, label }) {
  const palette = {
    live:     { bg: 'rgba(34,197,94,0.15)', color: COLORS.success,   border: 'rgba(34,197,94,0.4)' },
    upcoming: { bg: 'rgba(6,182,212,0.12)', color: ZONE_COLORS.snake, border: 'rgba(6,182,212,0.3)' },
    ended:    { bg: 'rgba(100,116,139,0.15)', color: COLORS.textMuted, border: COLORS.borderLight },
  };
  const s = palette[kind] || palette.ended;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: RADIUS.sm,
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      fontFamily: FONT, fontSize: 10, fontWeight: 800,
      letterSpacing: 0.4, textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {kind === 'live' && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: COLORS.success,
          boxShadow: '0 0 4px rgba(34,197,94,0.6)',
        }} />
      )}
      {label}
    </span>
  );
}

function TrainingCard({ training, kind, onClick, layoutName, pointsCount }) {
  const { t } = useLanguage();
  const isLive = kind === 'live';
  const isEnded = kind === 'ended';
  const metaParts = [
    formatDate(training.date),
    layoutName ? `Layout: ${layoutName}` : t('ppt_picker_meta_no_layout'),
    pointsCount != null ? t('ppt_picker_meta_points', pointsCount) : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      onClick={isEnded ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', marginBottom: 10,
        borderRadius: RADIUS.lg,
        background: isLive ? 'rgba(34,197,94,0.04)' : COLORS.surfaceDark,
        border: `2px solid ${isLive ? 'rgba(34,197,94,0.4)' : COLORS.border}`,
        cursor: isEnded ? 'default' : 'pointer',
        opacity: isEnded ? 0.55 : 1,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .15s',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: RADIUS.md,
        background: COLORS.surface,
        border: `2px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: COLORS.textDim,
      }}>
        <Calendar size={22} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
          color: COLORS.text, letterSpacing: '-0.1px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {training.name || 'Trening'}
        </div>
        {metaParts && (
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500,
            color: COLORS.textMuted, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {metaParts}
          </div>
        )}
      </div>
      <Badge kind={kind} label={t(`ppt_picker_badge_${kind}`)} />
    </div>
  );
}

export default function TrainingPickerView({
  playerName,
  teamName,
  liveTrainings = [],
  upcomingTrainings = [],
  endedTrainings = [],
  layouts = [],
  onPickTraining,
  loading,
}) {
  const { t } = useLanguage();
  // Bumped on refresh tap. Used only as a key to hint React to re-mount
  // the spinner-friendly icon; actual data refreshes live via onSnapshot
  // subscriptions upstream, so this is a user-visible ack only (no
  // pull-to-refresh infrastructure per 2026-04-23 clarification #7).
  const [refreshTick, setRefreshTick] = useState(0);
  const handleRefresh = useCallback(() => {
    setRefreshTick(n => n + 1);
  }, []);

  const layoutNameFor = useCallback((id) => {
    if (!id) return null;
    const l = (layouts || []).find(x => x.id === id);
    return l?.name || null;
  }, [layouts]);

  const hero = liveTrainings.length > 1
    ? t('ppt_picker_hero_multi_live')
    : t('ppt_picker_hero_no_live');
  const totalCount = liveTrainings.length + upcomingTrainings.length + endedTrainings.length;

  return (
    <div style={{ minHeight: '100dvh', background: COLORS.bg }}>
      <PageHeader
        back={{ to: '/' }}
        title={t('ppt_picker_title')}
        action={
          <div
            key={refreshTick}
            onClick={handleRefresh}
            style={{
              width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: COLORS.accent,
              WebkitTapHighlightColor: 'transparent',
            }}
            role="button"
          >
            <RefreshCw size={20} strokeWidth={2.5} />
          </div>
        }
      />
      <div style={{ padding: SPACE.lg, paddingBottom: 80 }}>
        <div style={{ marginBottom: SPACE.xl }}>
          <div style={{
            fontFamily: FONT, fontSize: 26, fontWeight: 800,
            color: COLORS.text, letterSpacing: '-0.5px', marginBottom: 6,
          }}>
            {t('ppt_picker_hero_greeting', playerName)}
          </div>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
            color: COLORS.textMuted, lineHeight: 1.5,
          }}>
            {hero}
          </div>
        </div>

        {totalCount > 0 && (
          <div style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 700,
            letterSpacing: 0.6, textTransform: 'uppercase',
            color: COLORS.textMuted,
            padding: '0 4px 10px',
          }}>
            {t('ppt_picker_section', teamName)}
          </div>
        )}

        {loading && totalCount === 0 && (
          <div style={{
            padding: SPACE.xl, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          }}>
            {t('loading')}
          </div>
        )}

        {!loading && totalCount === 0 && (
          <div style={{
            padding: SPACE.xl, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
            fontStyle: 'italic',
          }}>
            {t('ppt_picker_empty')}
          </div>
        )}

        {liveTrainings.map(tr => (
          <TrainingCard key={tr.id} training={tr} kind="live"
            onClick={() => onPickTraining?.(tr)}
            layoutName={layoutNameFor(tr.layoutId)}
            pointsCount={tr.pointsCount} />
        ))}
        {upcomingTrainings.map(tr => (
          <TrainingCard key={tr.id} training={tr} kind="upcoming"
            onClick={() => onPickTraining?.(tr)}
            layoutName={layoutNameFor(tr.layoutId)}
            pointsCount={tr.pointsCount} />
        ))}
        {endedTrainings.map(tr => (
          <TrainingCard key={tr.id} training={tr} kind="ended"
            layoutName={layoutNameFor(tr.layoutId)}
            pointsCount={tr.pointsCount} />
        ))}
      </div>
    </div>
  );
}
