import React from 'react';
import { COLORS, FONT, TNUM } from '../utils/theme';
import { dayShort } from '../utils/divisionAliases';
import TeamBadge from './TeamBadge';
import LiveMatchTile from './LiveMatchTile';

// Schedule pill format helper (Brief 2026-05-13 Stage 3).
// Output examples:
//   Czw 14:20 · NXL Pro   (full: day-short + time + field)
//   Czw 14:20             (no field on match doc)
//   14:20                 (no scheduledAt — fall back to legacy m.time)
//   2026-05-14 14:20      (very old match — legacy m.date + m.time, no field)
//   ''                    (nothing usable — caller hides pill)
function formatSchedulePill(m) {
  const parts = [];
  if (m?.scheduledAt) {
    // scheduledAt may be a Firestore Timestamp (.toDate) OR a JS Date
    // OR an ISO string. Be tolerant — readers shouldn't crash on shape.
    const d = typeof m.scheduledAt?.toDate === 'function'
      ? m.scheduledAt.toDate()
      : (m.scheduledAt instanceof Date ? m.scheduledAt : new Date(m.scheduledAt));
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      parts.push(`${dayShort(d, 'pl')} ${hh}:${mm}`);
    }
  }
  if (!parts.length) {
    // Legacy fallback — pre-CSV-import matches carried only date+time strings.
    const legacy = [m?.date, m?.time].filter(Boolean).join(' ');
    if (legacy) parts.push(legacy);
  }
  if (m?.field) parts.push(m.field);
  return parts.join(' · ');
}

/**
 * MatchCard — split-tap tournament match card. Extracted from ScoutTabContent
 * (and restored to CoachTabContent) so both tabs share one source of truth
 * for navigation and visual state.
 *
 * Props:
 *   m             match doc
 *   status        'live' | 'scheduled' | 'completed'
 *   tournamentId  workspace-scoped tournament id for navigation
 *   getTeamName   (scoutedId) => string — caller resolves via its own `scouted`
 *                 + `teams` data (no Firestore fetches inside this component)
 *   navigate      react-router navigate fn (caller owns routing)
 *   readOnly      tournament closed → tap side navigates to review, not scout
 *   liveScore     optional {a, b} from caller's live points subscription. When
 *                 present, takes precedence over m.scoreA/B (used for live +
 *                 scheduled matches per Brief 9 Bug 2 — match.scoreA/B is
 *                 only authoritative post-merge). Closed matches don't pass
 *                 this prop and fall back to cached fields.
 *
 * Interaction:
 *   tap team side → /match/:id?scout=:scoutedId&mode=new (or review if readOnly)
 *   tap score center → /match/:id (review)
 *
 * Brief F: side-claim state removed. Per-coach streams (§ 42) give each
 * coach their own identity via coachUid, so no side is "blocked" by
 * another scout at the card level.
 */
export default function MatchCard({ m, status, tournamentId, getTeamName, getTeam, navigate, readOnly, liveScore }) {
  const sA = liveScore?.a ?? m.scoreA ?? 0;
  const sB = liveScore?.b ?? m.scoreB ?? 0;
  const hasScore = sA > 0 || sB > 0;
  const tA = getTeamName(m.teamA);
  const tB = getTeamName(m.teamB);
  // § Team branding — optional resolved-team objects for the side crests.
  // Absent (callers without getTeam) → no badge, name-only (back-compat).
  const teamA = getTeam ? getTeam(m.teamA) : null;
  const teamB = getTeam ? getTeam(m.teamB) : null;
  const isScheduled = status === 'scheduled';
  const isLive = status === 'live';
  const isCompleted = status === 'completed';

  const winnerA = isCompleted && sA > sB;
  const winnerB = isCompleted && sB > sA;

  const handleScout = (scoutedId) => (e) => {
    e.stopPropagation();
    if (readOnly) {
      navigate(`/tournament/${tournamentId}/match/${m.id}`);
      return;
    }
    // Brief 8 Problem A: Scout CTA = always new point, never auto-attach.
    navigate(`/tournament/${tournamentId}/match/${m.id}?scout=${scoutedId}&mode=new`);
  };
  const handleReview = (e) => {
    e.stopPropagation();
    navigate(`/tournament/${tournamentId}/match/${m.id}`);
  };

  // Zone BODY only — the tap wrapper (flex:1 · padding · column · cursor) now
  // lives in the shared LiveMatchTile primitive. `textAlign:align` is kept on
  // this body wrapper so the right side's sub-line stays right-aligned exactly
  // as before (the primitive's zone is alignment-agnostic).
  const TeamZoneBody = ({ teamName, team, won, lost, align }) => (
    <div style={{ textAlign: align }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, minWidth: 0,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      }}>
        {team && align !== 'right' && <TeamBadge team={team} size={22} />}
        <span style={{
          fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', wordBreak: 'break-word', lineHeight: 1.15,
        }}>
          {teamName}
        </span>
        {team && align === 'right' && <TeamBadge team={team} size={22} />}
      </div>
      {isCompleted ? (
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 700, marginTop: 3, letterSpacing: '.3px',
          color: won ? COLORS.success : (lost ? COLORS.danger : COLORS.textMuted),
        }}>
          {won ? 'W' : lost ? 'L' : '—'}
        </div>
      ) : (
        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 3 }}>
          {readOnly ? 'tap to view' : 'tap to scout'}
        </div>
      )}
    </div>
  );

  return (
    <LiveMatchTile
      live={isLive}
      dimmed={isCompleted}
      onLeft={handleScout(m.teamA)}
      onCenter={handleReview}
      onRight={handleScout(m.teamB)}
      left={<TeamZoneBody teamName={tA} team={teamA} won={winnerA} lost={winnerB} align="left" />}
      right={<TeamZoneBody teamName={tB} team={teamB} won={winnerB} lost={winnerA} align="right" />}
      center={(
        <>
          {hasScore ? (
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.text, lineHeight: 1, ...TNUM }}>
            {sA}<span style={{ color: COLORS.textMuted }}>:</span>{sB}
          </div>
        ) : (
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.borderLight, lineHeight: 1, ...TNUM }}>
            —<span style={{ color: COLORS.textMuted }}>:</span>—
          </div>
        )}
        {/* Status pill + schedule pill — Brief 2026-05-13 Stage 3.
            Scheduled  → 'Czw 14:20 · NXL Pro' (or fallback if scheduledAt absent)
            Live       → 'LIVE' + (if field present) ' · {field}'
            Completed  → 'FINAL' + (if field present) ' · {field}'
            Per-game W/L badges already render on each TeamZone, not here. */}
        {(() => {
          const schedule = formatSchedulePill(m);
          if (isLive) {
            return (
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.accent, marginTop: 4, letterSpacing: '.5px' }}>
                LIVE{m?.field ? ` · ${m.field}` : ''}
              </div>
            );
          }
          if (isCompleted) {
            return (
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted, marginTop: 4, letterSpacing: '.5px' }}>
                FINAL{m?.field ? ` · ${m.field}` : ''}
              </div>
            );
          }
          if (isScheduled && schedule) {
            return (
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted, marginTop: 4 }}>
                {schedule}
              </div>
            );
          }
          return null;
        })()}
        </>
      )}
    />
  );
}
