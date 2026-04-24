import React from 'react';
import { COLORS, FONT, SPACE } from '../utils/theme';

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
export default function MatchCard({ m, status, tournamentId, getTeamName, navigate, readOnly, liveScore }) {
  const sA = liveScore?.a ?? m.scoreA ?? 0;
  const sB = liveScore?.b ?? m.scoreB ?? 0;
  const hasScore = sA > 0 || sB > 0;
  const tA = getTeamName(m.teamA);
  const tB = getTeamName(m.teamB);
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

  const TeamZone = ({ scoutedId, teamName, won, lost, align }) => (
    <div onClick={handleScout(scoutedId)}
      style={{
        flex: 1, minWidth: 0,
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        cursor: 'pointer',
        textAlign: align,
      }}>
      <div style={{
        fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {teamName}
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
    <div style={{
      display: 'flex',
      marginBottom: SPACE.xs,
      background: COLORS.surfaceDark,
      border: `1px solid ${isLive ? `${COLORS.accent}15` : COLORS.surfaceLight}`,
      borderRadius: 12,
      overflow: 'hidden',
      opacity: isCompleted ? 0.5 : 1,
      minHeight: 62,
    }}>
      <TeamZone scoutedId={m.teamA} teamName={tA} won={winnerA} lost={winnerB} align="left" />
      <div style={{ width: 1, background: COLORS.surfaceLight }} />
      <div onClick={handleReview}
        style={{
          flex: '0 0 auto', minWidth: 82,
          padding: '10px 12px',
          background: COLORS.surfaceDark,
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
        {hasScore ? (
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>
            {sA}<span style={{ color: COLORS.textMuted }}>:</span>{sB}
          </div>
        ) : (
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.borderLight, lineHeight: 1 }}>
            —<span style={{ color: COLORS.textMuted }}>:</span>—
          </div>
        )}
        {isLive && (
          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.accent, marginTop: 4, letterSpacing: '.5px' }}>LIVE</div>
        )}
        {isCompleted && (
          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted, marginTop: 4, letterSpacing: '.5px' }}>FINAL</div>
        )}
        {isScheduled && (m.date || m.time) && (
          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted, marginTop: 4 }}>
            {[m.date, m.time].filter(Boolean).join(' ')}
          </div>
        )}
      </div>
      <div style={{ width: 1, background: COLORS.surfaceLight }} />
      <TeamZone scoutedId={m.teamB} teamName={tB} won={winnerB} lost={winnerA} align="right" />
    </div>
  );
}
