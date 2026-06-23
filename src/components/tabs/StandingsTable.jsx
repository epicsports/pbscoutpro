import React from 'react';
import { useDevice } from '../../hooks/useDevice';
import { COLORS, FONT, ELEV, TRACKING, TNUM } from '../../utils/theme';
import TeamBadge from '../TeamBadge';

/**
 * StandingsTable — premium league table rendered on the READY `computeTeamRecords`
 * data (wins/losses/ptsFor/ptsAgainst/played/winRate/diff). Net-new render — only
 * fields present in the records are shown; no faked columns.
 *
 * Props:
 *   entries      pre-sorted scouted-team list (played desc, wins desc, losses asc)
 *   records      { [scoutedId]: { wins, losses, played, diff, winRate, ... } }
 *   resolveTeam  (st) => team object (for crest/name) | null
 *   onRow        (st) => void — row tap (→ ScoutedTeamPage), optional
 *
 * Responsive: phone = compact stacked rows; wide (>=720) = multi-column table.
 * W/L are semantic (W=success, L=danger, never amber). 0% winRate is never green.
 */
function winRateColor(played, winRate) {
  if (!played) return COLORS.textMuted;          // no data → neutral, never green
  if (winRate >= 60) return COLORS.success;
  if (winRate >= 40) return COLORS.accent;       // mid — gauge convention, not outcome
  return COLORS.danger;
}

export default function StandingsTable({ entries = [], records = {}, resolveTeam, onRow }) {
  const wide = useDevice().width >= 720;
  if (!entries.length) return null;

  const cell = (txt, color, w, align = 'right') => (
    <span style={{ width: w, flexShrink: 0, textAlign: align, fontFamily: FONT, fontSize: 13, fontWeight: 800, color, ...TNUM }}>{txt}</span>
  );
  const head = (txt, w, align = 'right') => (
    <span style={{ width: w, flexShrink: 0, textAlign: align, fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: TRACKING.label, textTransform: 'uppercase', color: COLORS.textMuted }}>{txt}</span>
  );

  return (
    <div style={{ background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, borderRadius: 14, boxShadow: ELEV.shadow1, overflow: 'hidden' }}>
      {/* column header (wide only — phone rows are self-describing) */}
      {wide && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: ELEV.sunken, borderBottom: `1px solid ${ELEV.hairline}` }}>
          {head('#', 26, 'left')}
          <span style={{ flex: 1, fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: TRACKING.label, textTransform: 'uppercase', color: COLORS.textMuted }}>Team</span>
          {head('P', 34)}{head('W', 30)}{head('L', 30)}{head('+/−', 48)}{head('Win%', 52)}
        </div>
      )}
      {entries.map((st, i) => {
        const team = resolveTeam ? resolveTeam(st) : null;
        const rec = records[st.id] || { wins: 0, losses: 0, played: 0, diff: 0, winRate: 0 };
        const name = team?.name || st.name || '?';
        const diffTxt = (rec.diff > 0 ? '+' : '') + rec.diff;
        const wr = Math.round(rec.winRate || 0);
        return (
          <div key={st.id}
            onClick={onRow ? () => onRow(st) : undefined}
            className={onRow ? 'rd-press' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', minHeight: 48,
              borderTop: i === 0 ? 'none' : `1px solid ${ELEV.hairline}`,
              cursor: onRow ? 'pointer' : 'default',
            }}>
            <span style={{ width: 26, flexShrink: 0, fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.textMuted, ...TNUM }}>{i + 1}</span>
            <TeamBadge team={team || { name }} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              {!wide && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, fontFamily: FONT, fontSize: 11.5, fontWeight: 700 }}>
                  <span style={{ color: COLORS.textMuted, ...TNUM }}>{rec.played}P</span>
                  <span style={{ color: COLORS.success, ...TNUM }}>{rec.wins}W</span>
                  <span style={{ color: COLORS.danger, ...TNUM }}>{rec.losses}L</span>
                  <span style={{ color: COLORS.textMuted, ...TNUM }}>{diffTxt}</span>
                  <span style={{ color: winRateColor(rec.played, wr), ...TNUM }}>{wr}%</span>
                </div>
              )}
            </div>
            {wide && (
              <>
                {cell(rec.played, COLORS.textDim, 34)}
                {cell(rec.wins, COLORS.success, 30)}
                {cell(rec.losses, COLORS.danger, 30)}
                {cell(diffTxt, COLORS.textDim, 48)}
                {cell(`${wr}%`, winRateColor(rec.played, wr), 52)}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
