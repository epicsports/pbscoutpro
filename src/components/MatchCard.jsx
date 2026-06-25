import React from 'react';
import { COLORS, FONT, ELEV, TNUM } from '../utils/theme';
import { dayShort } from '../utils/divisionAliases';
import { useLanguage } from '../hooks/useLanguage';
import TeamBadge from './TeamBadge';

// Schedule meta helper (Brief 2026-05-13 Stage 3, re-shaped for the redesigned
// Fixture meta block). Returns the day / time / field PARTS separately so the
// scheduled card can stack them (uppercase day · large time · "POLE {field}")
// exactly like the prototype, instead of the single combined pill string.
//   { day, time, field }  — any may be '' / null when the source lacks it.
function scheduleMeta(m, lang) {
  let day = '';
  let time = '';
  if (m?.scheduledAt) {
    // scheduledAt may be a Firestore Timestamp (.toDate) OR a JS Date OR an
    // ISO string. Be tolerant — readers shouldn't crash on shape.
    const d = typeof m.scheduledAt?.toDate === 'function'
      ? m.scheduledAt.toDate()
      : (m.scheduledAt instanceof Date ? m.scheduledAt : new Date(m.scheduledAt));
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      day = dayShort(d, lang);
      time = `${hh}:${mm}`;
    }
  }
  if (!time) {
    // Legacy fallback — pre-CSV-import matches carried only date+time strings.
    // m.time is the canonical legacy time; m.date (if present) is the day-ish
    // prefix. We keep them split so the block layout stays consistent.
    if (m?.time) time = m.time;
    if (m?.date) day = m.date;
  }
  return { day, time, field: m?.field ?? null };
}

/**
 * MatchCard — split-tap tournament match card, rebuilt 1:1 from the redesign
 * prototype (HeroLive + Fixture). Extracted from ScoutTabContent (and shared
 * with CoachTabContent / MatchListPremium) so every tab uses one source of
 * truth for navigation and visual state.
 *
 * Two layouts, gated by `status`:
 *   live              → HeroLive  — TeamZone(A) | score zone | TeamZone(B)
 *   scheduled/completed → Fixture — 60px meta block | two stacked TeamLines
 *
 * Props (unchanged — wiring is byte-identical to the pre-rebuild card):
 *   m             match doc
 *   status        'live' | 'scheduled' | 'completed'
 *   tournamentId  workspace-scoped tournament id for navigation
 *   getTeamName   (scoutedId) => string — caller resolves via its own `scouted`
 *                 + `teams` data (no Firestore fetches inside this component)
 *   getTeam       (scoutedId) => team obj | null — resolved team for crest+color
 *   navigate      react-router navigate fn (caller owns routing)
 *   readOnly      tournament closed → tap side navigates to review, not scout
 *   liveScore     optional {a, b} from caller's live points subscription. When
 *                 present, takes precedence over m.scoreA/B (used for live +
 *                 scheduled matches per Brief 9 Bug 2 — match.scoreA/B is only
 *                 authoritative post-merge). Closed matches don't pass this prop
 *                 and fall back to cached fields.
 *
 * Interaction (FROZEN — same routing contract as before):
 *   tap team side  → /match/:id?scout=:scoutedId&mode=new  (or review if readOnly)
 *   tap score / meta → /match/:id (review)
 *
 * Brief F: side-claim state removed. Per-coach streams (§ 42) give each coach
 * their own identity via coachUid, so no side is "blocked" at the card level.
 */
export default function MatchCard({ m, status, tournamentId, getTeamName, getTeam, navigate, readOnly, liveScore }) {
  const { lang, t } = useLanguage();
  const sA = liveScore?.a ?? m.scoreA ?? 0;
  const sB = liveScore?.b ?? m.scoreB ?? 0;
  const tA = getTeamName(m.teamA);
  const tB = getTeamName(m.teamB);
  // § Team branding — optional resolved-team objects for side crests + the
  // TeamLine color gradient. Absent (callers without getTeam) → no badge,
  // name-only, transparent gradient (back-compat).
  const teamA = getTeam ? getTeam(m.teamA) : null;
  const teamB = getTeam ? getTeam(m.teamB) : null;
  const isScheduled = status === 'scheduled';
  const isLive = status === 'live';
  const isCompleted = status === 'completed';

  const winnerA = isCompleted && sA > sB;
  const winnerB = isCompleted && sB > sA;

  // tap a team side → new-point scout (or review when the tournament is closed)
  const handleScout = (scoutedId) => (e) => {
    e.stopPropagation();
    if (readOnly) {
      navigate(`/tournament/${tournamentId}/match/${m.id}`);
      return;
    }
    // Brief 8 Problem A: Scout CTA = always new point, never auto-attach.
    navigate(`/tournament/${tournamentId}/match/${m.id}?scout=${scoutedId}&mode=new`);
  };
  // tap score / meta block → open match review
  const handleReview = (e) => {
    e.stopPropagation();
    navigate(`/tournament/${tournamentId}/match/${m.id}`);
  };

  // ── LIVE → HeroLive (prototype lines 152-179) ──────────────────────────────
  // A card (radius 18, ELEV.raised, danger33 border) with three zones:
  // TeamZone(A) | center score zone | TeamZone(B). Each TeamZone taps to scout;
  // the center taps to review.
  if (isLive) {
    // TeamZone — vertical: crest(48) + 2-line name + "Scoutuj →".
    const TeamZone = ({ teamName, team, scoutedId }) => (
      <div className="rd-zone" onClick={handleScout(scoutedId)}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 7, minWidth: 0, padding: '10px 6px', minHeight: 44, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <TeamBadge team={team} size={48} />
        <span style={{
          fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text,
          textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', height: 34,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {teamName}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.accent, letterSpacing: '.3px' }}>
          {readOnly ? t('matchcard_tap_view') : t('matchcard_scout_cta')}
        </span>
      </div>
    );

    return (
      <div style={{
        position: 'relative', borderRadius: 18,
        background: ELEV.raised,
        border: `1px solid ${COLORS.danger}33`,
        boxShadow: `${ELEV.innerTop}, ${ELEV.shadow2}`,
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '16px 12px 14px', gap: 6 }}>
          <TeamZone teamName={tA} team={teamA} scoutedId={m.teamA} />
          {/* center → review */}
          <div className="rd-zone" onClick={handleReview}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
              minWidth: 96, minHeight: 44, padding: '14px 6px 10px', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <span style={{ fontFamily: FONT, fontSize: 44, fontWeight: 800, color: COLORS.text, lineHeight: 1, letterSpacing: '-1px', ...TNUM }}>
              {sA}<span style={{ color: COLORS.textMuted, margin: '0 4px' }}>:</span>{sB}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '.5px', marginTop: 8, textTransform: 'uppercase' }}>
              {t('matchcard_preview')}
            </span>
          </div>
          <TeamZone teamName={tB} team={teamB} scoutedId={m.teamB} />
        </div>
      </div>
    );
  }

  // ── SCHEDULED / COMPLETED → Fixture (prototype lines 181-215) ──────────────
  // Flex row: LEFT 60px meta block (borderRight hairline) → review; RIGHT a
  // column of two TeamLines (A over B) → scout each.
  const { day, time, field } = scheduleMeta(m, lang);

  // TeamLine — crest(30) + name (ellipsis, bold-800 if won, muted if lost) +
  // "›" chevron; background = subtle left-gradient of the team color (or
  // transparent if lost / no color). Whole row taps to scout that side.
  const TeamLine = ({ teamName, team, scoutedId, won, lost }) => {
    const color = team?.color || COLORS.borderLight;
    return (
      <div className="rd-zone" onClick={handleScout(scoutedId)}
        style={{
          position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center',
          gap: 10, minWidth: 0, padding: '7px 9px', minHeight: 44, borderRadius: 10,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          background: lost
            ? 'transparent'
            : `linear-gradient(90deg, ${color}1f, ${color}08 34%, transparent 58%)`,
        }}>
        <TeamBadge team={team} size={30} />
        <span style={{
          fontFamily: FONT, fontSize: 15, fontWeight: won ? 800 : 700,
          color: lost ? COLORS.textMuted : COLORS.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
        }}>
          {teamName}
        </span>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.accent, letterSpacing: '.3px', flexShrink: 0 }}>›</span>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 12, padding: 12,
      background: ELEV.surface, border: `1px solid ${ELEV.hairline}`,
      borderRadius: 14, boxShadow: ELEV.shadow1, marginBottom: 10,
    }}>
      {/* left meta block → open match */}
      <div className="rd-zone" onClick={handleReview}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, width: 60, minHeight: 44, borderRight: `1px solid ${ELEV.hairline}`,
          gap: 2, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
        {isCompleted ? (
          <span style={{ fontFamily: FONT, fontSize: 22, fontWeight: 800, color: COLORS.text, ...TNUM }}>
            {sA}<span style={{ color: COLORS.textMuted, fontSize: 16 }}>:</span>{sB}
          </span>
        ) : (
          <>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '.5px', textTransform: 'uppercase' }}>
              {day || '—'}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: COLORS.text, ...TNUM }}>
              {time || '—'}
            </span>
          </>
        )}
        {isCompleted
          ? <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, color: COLORS.textDim, letterSpacing: '.5px' }}>{t('matchcard_final')}</span>
          : (field != null && field !== '' && <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, color: COLORS.textDim, letterSpacing: '.3px' }}>{t('matchcard_field', field)}</span>)}
      </div>
      {/* teams → scout each */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, justifyContent: 'center', minWidth: 0 }}>
        <TeamLine teamName={tA} team={teamA} scoutedId={m.teamA} won={winnerA} lost={winnerB} />
        <TeamLine teamName={tB} team={teamB} scoutedId={m.teamB} won={winnerB} lost={winnerA} />
      </div>
    </div>
  );
}
