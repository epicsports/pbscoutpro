import React from 'react';
import MatchCard from '../MatchCard';
import { SectionLabel } from '../ui';
import { groupMatchesByStage } from '../../utils/divisionAliases';
import { COLORS, FONT, FONT_SIZE, SPACE, TRACKING } from '../../utils/theme';

// Module-level so the component identity is STABLE across renders. Defining this
// inside the render body (as `const Grid = …`) gives it a new function identity
// every render → React remounts the whole match list on each liveScores poll
// (flicker + lost scroll). `wide` drives the grid reflow; phone = transparent.
// Lifted verbatim from MatchListPremium (dup-audit #2 extraction).
const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
  gap: SPACE.sm,
  alignItems: 'start',
};
function Grid({ wide, children }) {
  return wide ? <div style={GRID_STYLE}>{children}</div> : <>{children}</>;
}

/**
 * ScheduleList — the shared Live / Scheduled / Completed grouped match-section
 * render (dup-audit #2). Lifted verbatim from the two consumers that inlined it:
 * `MatchListPremium` (scout launcher) and `tabs/CoachTabContent` (coach tab).
 * DISPLAY-ONLY (§ 6.6): no data/write/routing logic — it receives the three
 * already-classified+sorted/searched match arrays from each consumer and renders
 * the three sections with `<MatchCard>` exactly as before. The split-tap nav
 * contract (score-click→detail, side/crest-click→scouting) lives entirely in
 * MatchCard and is passed through unchanged via `navigate`.
 *
 * The two consumers' renders DIVERGE, so this stays parametrized so EACH consumer
 * reproduces its CURRENT byte-identical output (we do NOT homogenize one to the
 * other):
 *   - scout (MatchListPremium): `wide` grid reflow on scheduled/completed +
 *     `groupScheduledByStage` stage/group sub-headers in the Scheduled section.
 *   - coach (CoachTabContent): no grid (wide=false → Grid is a transparent
 *     Fragment, byte-identical to its old direct map), no stage grouping
 *     (groupScheduledByStage=false → flat map, byte-identical to before).
 *
 * Empty-states, SectionTitle, search, modals + CTAs stay in the consumers — they
 * diverge hard and aren't part of the Live/Scheduled/Completed grouping.
 *
 * Props:
 *   live, scheduled, completed  classified + sorted/searched match arrays (consumer owns the order)
 *   tournamentId                workspace-scoped tournament id
 *   getTeamName, getTeam        scouted-id → name / global team object resolvers
 *   navigate                    react-router navigate (split-tap routing target)
 *   readOnly                    closed-tournament read-only flag (was `isClosed`)
 *   liveScores                  useLiveMatchScores map (consumer-level hook call)
 *   wide                        false (phone, single column) | true (grid reflow)
 *   groupScheduledByStage       false (flat scheduled) | true (stage/group sub-headers)
 */
export default function ScheduleList({
  live = [],
  scheduled = [],
  completed = [],
  tournamentId,
  getTeamName,
  getTeam,
  navigate,
  readOnly,
  liveScores = {},
  wide = false,
  groupScheduledByStage = false,
}) {
  return (
    <>
      {live.length > 0 && (
        <div style={{ marginBottom: SPACE.sm }}>
          <SectionLabel color={COLORS.accent}>Live ({live.length})</SectionLabel>
          {live.map(m => (
            <MatchCard key={m.id} m={m} status="live" tournamentId={tournamentId} getTeamName={getTeamName} getTeam={getTeam} navigate={navigate} readOnly={readOnly} liveScore={liveScores[m.id]?.score || null} />
          ))}
        </div>
      )}

      {scheduled.length > 0 && (
        <div style={{ marginBottom: SPACE.sm }}>
          {(live.length > 0 || completed.length > 0) && <SectionLabel>Scheduled ({scheduled.length})</SectionLabel>}
          {groupScheduledByStage ? (
            /* Stage + group sub-headers (Brief follow-up 2026-05-13).
               groupMatchesByStage returns stages in tournament progression
               order (prelims → ocho → quarter → semi → final). Each stage
               is sub-grouped by Grupa; the empty-group bucket renders
               without a group sub-header so older matches (no group field)
               stay tidy. When the whole Scheduled section has only one
               stage AND one group, headers are skipped to avoid clutter.
               On wide, each group's cards flow into the responsive grid. */
            (() => {
              const stages = groupMatchesByStage(scheduled);
              const flatten = stages.length === 1 && stages[0].groups.length === 1 && !stages[0].groups[0].groupName;
              if (flatten) {
                return (
                  <Grid wide={wide}>
                    {stages[0].groups[0].matches.map(m => (
                      <MatchCard key={m.id} m={m} status="scheduled" tournamentId={tournamentId} getTeamName={getTeamName} getTeam={getTeam} navigate={navigate} readOnly={readOnly} liveScore={liveScores[m.id]?.score || null} />
                    ))}
                  </Grid>
                );
              }
              return stages.map(stage => (
                <div key={stage.rank} style={{ marginTop: SPACE.sm }}>
                  <div style={{
                    fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
                    color: COLORS.textDim, letterSpacing: TRACKING.label, textTransform: 'uppercase',
                    margin: `${SPACE.sm}px 0 ${SPACE.xs}px`,
                  }}>
                    {stage.label} <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>· {stage.totalCount}</span>
                  </div>
                  {stage.groups.map(g => (
                    <React.Fragment key={`${stage.rank}-${g.groupName || '_'}`}>
                      {g.groupName && (
                        <div style={{
                          fontFamily: FONT, fontSize: 10, fontWeight: 600,
                          color: COLORS.textMuted, marginBottom: 2, marginLeft: 2,
                        }}>
                          Grupa {g.groupName}
                        </div>
                      )}
                      <Grid wide={wide}>
                        {g.matches.map(m => (
                          <MatchCard key={m.id} m={m} status="scheduled" tournamentId={tournamentId} getTeamName={getTeamName} getTeam={getTeam} navigate={navigate} readOnly={readOnly} liveScore={liveScores[m.id]?.score || null} />
                        ))}
                      </Grid>
                    </React.Fragment>
                  ))}
                </div>
              ));
            })()
          ) : (
            <Grid wide={wide}>
              {scheduled.map(m => (
                <MatchCard key={m.id} m={m} status="scheduled" tournamentId={tournamentId} getTeamName={getTeamName} getTeam={getTeam} navigate={navigate} readOnly={readOnly} liveScore={liveScores[m.id]?.score || null} />
              ))}
            </Grid>
          )}
        </div>
      )}

      {completed.length > 0 && (
        <div style={{ marginBottom: SPACE.sm }}>
          <SectionLabel>Completed ({completed.length})</SectionLabel>
          <Grid wide={wide}>
            {completed.map(m => (
              <MatchCard key={m.id} m={m} status="completed" tournamentId={tournamentId} getTeamName={getTeamName} getTeam={getTeam} navigate={navigate} readOnly={readOnly} />
            ))}
          </Grid>
        </div>
      )}
    </>
  );
}
