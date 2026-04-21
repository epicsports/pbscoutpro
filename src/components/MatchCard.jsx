import React from 'react';
import { COLORS, FONT, SPACE } from '../utils/theme';
import { auth } from '../services/firebase';

/**
 * MatchCard — split-tap tournament match card. Extracted from ScoutTabContent
 * (and restored to CoachTabContent) so both tabs share one source of truth for
 * claim state, navigation, and visual state. Previously lived inline in the
 * pre-§ 31 TournamentPage; the tab refactor duplicated the scout variant into
 * ScoutTabContent while the coach variant regressed to a simpler CompactMatchRow.
 *
 * Props:
 *   m             match doc
 *   status        'live' | 'scheduled' | 'completed'
 *   tournamentId  workspace-scoped tournament id for navigation
 *   getTeamName   (scoutedId) => string — caller resolves via its own `scouted`
 *                 + `teams` data (no Firestore fetches inside this component)
 *   navigate      react-router navigate fn (caller owns routing)
 *   readOnly      tournament closed → tap side navigates to review, not scout
 *
 * Interaction:
 *   tap team side → /match/:id?scout=:scoutedId (or review if readOnly)
 *   tap score center → /match/:id (review)
 *   claim active + not-me → side blocked (opacity 0.35, "not-allowed"), green
 *                           dot + "Scout" label indicating another scout owns it.
 *                           Claim expires after STALE_MS (10 min).
 */
const STALE_MS = 10 * 60 * 1000;
const isClaimActive = (uid, ts) => !!uid && (!ts || Date.now() - ts <= STALE_MS);

export default function MatchCard({ m, status, tournamentId, getTeamName, navigate, readOnly }) {
  const sA = m.scoreA || 0;
  const sB = m.scoreB || 0;
  const hasScore = sA > 0 || sB > 0;
  const tA = getTeamName(m.teamA);
  const tB = getTeamName(m.teamB);
  const isScheduled = status === 'scheduled';
  const isLive = status === 'live';
  const isCompleted = status === 'completed';

  const currentUid = auth.currentUser?.uid || null;
  const homeClaimActive = isClaimActive(m.homeClaimedBy, m.homeClaimedAt);
  const awayClaimActive = isClaimActive(m.awayClaimedBy, m.awayClaimedAt);
  const homeBlocked = homeClaimActive && m.homeClaimedBy !== currentUid;
  const awayBlocked = awayClaimActive && m.awayClaimedBy !== currentUid;

  const winnerA = isCompleted && sA > sB;
  const winnerB = isCompleted && sB > sA;

  const handleScout = (scoutedId, blocked) => (e) => {
    if (blocked) { e.stopPropagation(); return; }
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

  const TeamZone = ({ scoutedId, teamName, blocked, won, lost, align }) => (
    <div onClick={handleScout(scoutedId, blocked)}
      style={{
        flex: 1, minWidth: 0,
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        opacity: blocked ? 0.35 : 1,
        cursor: blocked ? 'not-allowed' : 'pointer',
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
      ) : blocked ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 3,
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 3, background: COLORS.success }} />
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted }}>Scout</span>
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
      <TeamZone scoutedId={m.teamA} teamName={tA} blocked={homeBlocked} won={winnerA} lost={winnerB} align="left" />
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
      <TeamZone scoutedId={m.teamB} teamName={tB} blocked={awayBlocked} won={winnerB} lost={winnerA} align="right" />
    </div>
  );
}
