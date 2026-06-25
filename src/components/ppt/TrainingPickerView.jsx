import React, { useState, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import PageHeader from '../PageHeader';
import RdIcon from '../RdIcon';
import EventTypeBadge from '../EventTypeBadge';
import { useLanguage } from '../../hooks/useLanguage';
import { useDevice } from '../../hooks/useDevice';
import { Btn } from '../ui';
import { COLORS, ELEV, ZONE_COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TNUM, TRACKING } from '../../utils/theme';
import { langToLocale } from '../../utils/plural';

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

function formatDate(iso, lang) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(langToLocale(lang), { day: 'numeric', month: 'short' });
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
  const { t, lang } = useLanguage();
  const isLive = kind === 'live';
  const isEnded = kind === 'ended';
  const metaParts = [
    formatDate(training.date, lang),
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
          {training.name || t('tab_training')}
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <Badge kind={kind} label={t(`ppt_picker_badge_${kind}`)} />
        <EventTypeBadge type="training" />
      </div>
    </div>
  );
}

// ── Wide (≥720) landscape player-hub. LEFT (sticky): greeting + subhead +
// next-training HERO (nearest live → else upcoming) with the week's layout tile
// + the single amber CTA. RIGHT: grid of earlier (ended) trainings. Prototype
// SelectTrainingWide (redesign6 :1079); NO badges/progress per m1142. All values
// DERIVED from the same buckets the phone path renders — nothing invented. Amber
// is reserved for the CTA + the hero accent-glow (§27 HERO-indicator exception);
// the eyebrow + layout tile are neutral (non-interactive identity). ─────────────

// Next-training HERO — the nearest tappable training (live beats upcoming).
function NextTrainingHero({ training, kind, teamName, layoutName, onPick, t, lang }) {
  const isLive = kind === 'live';
  const accent = isLive ? COLORS.success : COLORS.accent;
  return (
    <div style={{ background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, borderRadius: 16, boxShadow: ELEV.shadow1, overflow: 'hidden' }}>
      <div style={{ position: 'relative', overflow: 'hidden', padding: '22px 22px 20px', background: `radial-gradient(120% 130% at 88% 4%, ${accent}30, ${accent}0d 48%, transparent 72%), linear-gradient(165deg, ${ELEV.raised}, ${ELEV.surface})` }}>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: FONT, fontSize: 10.5, fontWeight: 900, color: accent, letterSpacing: TRACKING.label, textTransform: 'uppercase', background: `${accent}1c`, border: `1px solid ${accent}55`, borderRadius: 999, padding: '5px 11px' }}>
            {isLive
              ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.success, boxShadow: '0 0 4px rgba(34,197,94,0.6)' }} />
              : <RdIcon name="clock" size={12} />}
            {isLive ? t('ppt_picker_badge_live') : t('ppt_picker_wide_next')}
          </div>
          {/* Long name → wraps to 2 lines, no font-shrink (edge-case law). */}
          <div style={{ fontFamily: FONT, fontSize: 27, fontWeight: 900, color: COLORS.text, letterSpacing: '-.5px', marginTop: 13, lineHeight: 1.1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {training.name || t('training')}
          </div>
          {[formatDate(training.date, lang), teamName].filter(Boolean).length > 0 && (
            <div style={{ fontFamily: FONT, fontSize: 14, color: COLORS.textDim, marginTop: 7 }}>
              {[formatDate(training.date, lang), teamName].filter(Boolean).join(' · ')}
            </div>
          )}
          {/* Week's-layout tile — sunken inset, neutral (not amber). No image →
              honest "to be assigned" placeholder (edge-case law). */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 16, padding: '9px 13px', borderRadius: 12, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}` }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, color: layoutName ? COLORS.textDim : COLORS.textMuted }}>
              <RdIcon name="target" size={15} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 9.5, fontWeight: 800, color: COLORS.textMuted, letterSpacing: TRACKING.label, textTransform: 'uppercase' }}>{t('ppt_picker_wide_layout')}</div>
              <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 800, color: layoutName ? COLORS.text : COLORS.textMuted, marginTop: 1, fontStyle: layoutName ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {layoutName || t('ppt_picker_wide_no_layout')}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Single primary CTA per surface (§27). */}
      <Btn variant="accent" onClick={onPick}
        style={{ width: '100%', borderRadius: 0, minHeight: 56, fontSize: 16.5, fontWeight: 800, gap: 9 }}>
        <RdIcon name="plus" size={18} /> {t('ppt_picker_wide_cta')}
      </Btn>
    </div>
  );
}

// Earlier-training card — ended trainings (non-tappable, parity with phone). NO
// chevron (whole-card is not navigating → §7 anti-pattern avoided).
function EarlierTrainingCard({ training, layoutName, t, lang }) {
  const meta = [formatDate(training.date, lang), layoutName].filter(Boolean).join(' · ');
  return (
    <div style={{ background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, borderRadius: 15, boxShadow: ELEV.shadow1, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 13, opacity: 0.72 }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, color: COLORS.textDim }}>
        <RdIcon name="clock" size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{training.name || t('training')}</div>
        {meta && <div style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta}</div>}
      </div>
      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: COLORS.textMuted, border: `1px solid ${ELEV.hairlineStrong}`, borderRadius: 8, padding: '5px 8px', flexShrink: 0 }}>{t('ppt_picker_badge_ended')}</span>
    </div>
  );
}

function TrainingPickerWide({
  playerName, teamName, liveTrainings, upcomingTrainings, endedTrainings,
  assignedEvents, layoutNameFor, onPickTraining, onPickAssignedEvent, loading, t, lang,
}) {
  const device = useDevice();
  const twoCol = device.width >= 1040; // grid the earlier-list at 2-up on very wide
  // Next training = first live, else first upcoming. Ended are never "next".
  const next = liveTrainings[0]
    ? { tr: liveTrainings[0], kind: 'live' }
    : upcomingTrainings[0]
      ? { tr: upcomingTrainings[0], kind: 'upcoming' }
      : null;
  // Earlier = ended + the upcoming ones NOT shown in the hero (kept tappable
  // via the same TrainingCard the phone uses, so no behaviour is dropped).
  const heroId = next?.tr.id;
  const otherUpcoming = upcomingTrainings.filter(tr => tr.id !== heroId);
  const otherLive = liveTrainings.filter(tr => tr.id !== heroId);

  const hero = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, color: COLORS.text, letterSpacing: '-.5px' }}>
          {t('ppt_picker_hero_greeting', playerName)}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 14.5, color: COLORS.textMuted, marginTop: 7, lineHeight: 1.5 }}>
          {t('ppt_picker_wide_subhead')}
        </div>
      </div>
      {next && (
        <NextTrainingHero
          training={next.tr} kind={next.kind} teamName={teamName}
          layoutName={layoutNameFor(next.tr.layoutId)}
          onPick={() => onPickTraining?.(next.tr)} t={t} lang={lang} />
      )}
    </div>
  );

  // Right column — still-tappable live/upcoming (TrainingCard) above the ended
  // grid; assigned events keep the existing cold-review entry.
  const tappable = [...otherLive, ...otherUpcoming];
  const earlierCount = endedTrainings.length;

  return (
    <div style={{ minHeight: '100dvh', background: COLORS.bg }}>
      <PageHeader back={{ to: '/' }} title={t('ppt_picker_title')} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xl}px`, boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'minmax(0, 380px) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        <div style={{ position: 'sticky', top: SPACE.lg, minWidth: 0 }}>{hero}</div>
        <div style={{ minWidth: 0 }}>
          {tappable.map(tr => {
            const isLive = liveTrainings.includes(tr);
            return (
              <TrainingCard key={tr.id} training={tr} kind={isLive ? 'live' : 'upcoming'}
                onClick={() => onPickTraining?.(tr)}
                layoutName={layoutNameFor(tr.layoutId)} pointsCount={tr.pointsCount} />
            );
          })}

          {earlierCount > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: `${tappable.length ? SPACE.md : 0}px 2px 14px` }}>
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: COLORS.textDim, letterSpacing: TRACKING.label, textTransform: 'uppercase' }}>
                  {t('ppt_picker_wide_earlier')}{teamName ? ` · ${teamName}` : ''}
                </span>
                <div style={{ flex: 1, height: 1, background: ELEV.hairline }} />
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: COLORS.textMuted, ...TNUM }}>{earlierCount}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr', gap: 12 }}>
                {endedTrainings.map(tr => (
                  <EarlierTrainingCard key={tr.id} training={tr} layoutName={layoutNameFor(tr.layoutId)} t={t} lang={lang} />
                ))}
              </div>
            </>
          )}

          {/* Assigned (cross-type "to complete") — same entry as phone. */}
          {assignedEvents.length > 0 && (
            <>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textMuted, padding: '18px 4px 10px' }}>
                {t('ppt_picker_assigned_section')}
              </div>
              {assignedEvents.map(ev => (
                <div key={ev.eventId} onClick={() => onPickAssignedEvent?.(ev)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', marginBottom: 10, borderRadius: RADIUS.lg, background: COLORS.surfaceDark, border: `2px solid ${COLORS.border}`, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ width: 42, height: 42, borderRadius: RADIUS.md, background: COLORS.surface, border: `2px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: COLORS.textDim }}>
                    <Calendar size={22} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text, letterSpacing: '-0.1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.eventName}</div>
                    <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500, color: COLORS.textMuted, marginTop: 2 }}>
                      {[formatDate(ev.eventDate, lang), t('ppt_picker_assigned_count', ev.count)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <EventTypeBadge type={ev.eventType} />
                </div>
              ))}
            </>
          )}

          {/* Empty / loading — right column carries the state when there is no
              hero and no list (mirrors phone copy). */}
          {!next && tappable.length === 0 && earlierCount === 0 && assignedEvents.length === 0 && (
            <div style={{ padding: SPACE.xl, textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, fontStyle: loading ? 'normal' : 'italic' }}>
              {loading ? t('loading') : t('ppt_picker_empty')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrainingPickerView({
  playerName,
  teamName,
  liveTrainings = [],
  upcomingTrainings = [],
  endedTrainings = [],
  assignedEvents = [],
  layouts = [],
  onPickTraining,
  onPickAssignedEvent,
  loading,
}) {
  const { t, lang } = useLanguage();
  const device = useDevice();
  const wide = device.width >= 720;
  const layoutNameFor = useCallback((id) => {
    if (!id) return null;
    const l = (layouts || []).find(x => x.id === id);
    return l?.name || null;
  }, [layouts]);

  const hero = liveTrainings.length > 1
    ? t('ppt_picker_hero_multi_live')
    : t('ppt_picker_hero_no_live');
  const totalCount = liveTrainings.length + upcomingTrainings.length + endedTrainings.length + assignedEvents.length;

  // ── Wide (≥720) landscape player-hub — additive; phone path below is
  // byte-identical. ──────────────────────────────────────────────────────────
  if (wide) {
    return (
      <TrainingPickerWide
        playerName={playerName}
        teamName={teamName}
        liveTrainings={liveTrainings}
        upcomingTrainings={upcomingTrainings}
        endedTrainings={endedTrainings}
        assignedEvents={assignedEvents}
        layoutNameFor={layoutNameFor}
        onPickTraining={onPickTraining}
        onPickAssignedEvent={onPickAssignedEvent}
        loading={loading}
        t={t}
        lang={lang}
      />
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: COLORS.bg }}>
      <PageHeader
        back={{ to: '/' }}
        title={t('ppt_picker_title')}
      />
      <div style={{ padding: SPACE.lg, paddingBottom: 100 }}>
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

        {/* § 63 — cross-type assigned points to complete (sparing / tournament /
            past training the player was scouted in → opens ColdReviewFlow). */}
        {assignedEvents.length > 0 && (
          <>
            <div style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 700,
              letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textMuted,
              padding: '14px 4px 10px',
            }}>
              {t('ppt_picker_assigned_section')}
            </div>
            {assignedEvents.map(ev => (
              <div key={ev.eventId}
                onClick={() => onPickAssignedEvent?.(ev)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', marginBottom: 10, borderRadius: RADIUS.lg,
                  background: COLORS.surfaceDark, border: `2px solid ${COLORS.border}`,
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}>
                <div style={{
                  width: 42, height: 42, borderRadius: RADIUS.md,
                  background: COLORS.surface, border: `2px solid ${COLORS.border}`,
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
                    {ev.eventName}
                  </div>
                  <div style={{
                    fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500,
                    color: COLORS.textMuted, marginTop: 2,
                  }}>
                    {[formatDate(ev.eventDate, lang), t('ppt_picker_assigned_count', ev.count)].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <EventTypeBadge type={ev.eventType} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
