import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Select } from '../ui';
import ScheduleImport from '../ScheduleImport';
import { useTeams, useScoutedTeams, useMatches, usePlayers } from '../../hooks/useFirestore';
import { useTournaments } from '../../hooks/useFirestore';
import { useViewAs } from '../../hooks/useViewAs';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { auth } from '../../services/firebase';

/**
 * ScoutTabContent — match list with split-tap "tap to scout" UX.
 * Extracted from TournamentPage scout mode (DESIGN_DECISIONS § 22, § 26, § 31).
 *
 * Self-contained: fetches its own matches/teams/scouted by tournamentId
 * so it can be dropped into MainPage without prop plumbing.
 */
export default function ScoutTabContent({ tournamentId }) {
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  // CTA gating uses effective roles so admin impersonating viewer sees a
  // viewer's UI (§ 38.5). Real role check unnecessary here — ScoutTabContent
  // is a UI-only surface.
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const isViewer = !effectiveIsAdmin
    && effectiveRoles.length > 0
    && effectiveRoles.every(r => r === 'viewer');

  const tournament = tournaments.find(t => t.id === tournamentId);
  const isPractice = tournament?.type === 'practice';
  const isClosed = tournament?.status === 'closed';

  const [activeDivision, setActiveDivision] = useState(null);
  const resolvedDivision = activeDivision || tournament?.divisions?.[0] || 'all';

  const [addMatchModal, setAddMatchModal] = useState(false);
  const [matchTeamA, setMatchTeamA] = useState('');
  const [matchTeamB, setMatchTeamB] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // "Add team to tournament" — restores the path lost in § 31 tab refactor
  // (ds.addScoutedTeam had no UI entry point after TournamentPage was split).
  const [addTeamModal, setAddTeamModal] = useState(false);

  const divisionScouted = useMemo(() => {
    return resolvedDivision === 'all'
      ? scouted
      : scouted.filter(st => st.division === resolvedDivision);
  }, [scouted, resolvedDivision]);

  // Eligible teams = workspace teams matching tournament league (or any team
  // when tournament has no league — e.g. practice) AND not already scouted.
  // Grouped with parent teams rendered first, their children indented below
  // (marked with _isChild flag); orphan children (no parent in filtered set)
  // appear at the end. Mirrors the old TournamentPage (a4912dc2) behavior.
  const sortedAvailable = useMemo(() => {
    const scoutedIds = new Set(scouted.map(s => s.teamId));
    const available = (teams || []).filter(tm => {
      if (scoutedIds.has(tm.id)) return false;
      if (!tournament?.league) return true;
      const leagues = Array.isArray(tm.leagues) ? tm.leagues : [];
      return leagues.includes(tournament.league);
    });
    const parents = available.filter(tm => !tm.parentTeamId);
    const children = available.filter(tm => !!tm.parentTeamId);
    const result = [];
    parents.forEach(p => {
      result.push({ ...p, _isChild: false });
      children
        .filter(c => c.parentTeamId === p.id)
        .forEach(c => result.push({ ...c, _isChild: true }));
    });
    // Orphan children — parent absent from filtered set — still surfaced.
    children
      .filter(c => !parents.find(p => p.id === c.parentTeamId))
      .forEach(c => result.push({ ...c, _isChild: true }));
    return result;
  }, [teams, scouted, tournament?.league]);

  if (!tournament) return <EmptyState icon="⏳" text="Loading..." />;

  const getTeamName = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    const t = s ? teams.find(x => x.id === s.teamId) : null;
    return t?.name || '?';
  };

  const handleAddMatch = async () => {
    if (!matchTeamA || !matchTeamB || matchTeamA === matchTeamB) return;
    const tA = scouted.find(s => s.id === matchTeamA);
    const tB = scouted.find(s => s.id === matchTeamB);
    const teamAObj = tA ? teams.find(t => t.id === tA.teamId) : null;
    const teamBObj = tB ? teams.find(t => t.id === tB.teamId) : null;
    await ds.addMatch(tournamentId, {
      teamA: matchTeamA,
      teamB: matchTeamB,
      name: `${teamAObj?.name || '?'} vs ${teamBObj?.name || '?'}`,
      division: tA?.division || resolvedDivision || null,
    });
    setAddMatchModal(false);
    setMatchTeamA('');
    setMatchTeamB('');
  };

  const handleAddScouted = async (teamId) => {
    const team = teams.find(tm => tm.id === teamId);
    // Roster pre-fill: include players from this team AND any of its child
    // teams (needed for practice + multi-squad org teams so the scouted
    // roster is populated from day one rather than left empty).
    const childIds = teams.filter(tm => tm.parentTeamId === teamId).map(tm => tm.id);
    const teamRoster = players
      .filter(p => [teamId, ...childIds].includes(p.teamId))
      .map(p => p.id);
    // Division auto-assign: team's pre-mapped division for this league takes
    // precedence; fall back to the currently-selected division pill when the
    // team has no mapping; null when tournament has no divisions.
    const teamDivision = team?.divisions?.[tournament.league] || null;
    const finalDivision = teamDivision
      || (resolvedDivision !== 'all' ? resolvedDivision : null);
    await ds.addScoutedTeam(tournamentId, {
      teamId,
      roster: teamRoster,
      division: finalDivision,
    });
    setAddTeamModal(false);
  };

  // Match classification + render
  const filtered = resolvedDivision === 'all'
    ? matches
    : matches.filter(m => m.division === resolvedDivision);
  const classify = (m) => {
    const hasScore = (m.scoreA || 0) > 0 || (m.scoreB || 0) > 0;
    if (m.status === 'closed') return 'completed';
    if (hasScore) return 'live';
    return 'scheduled';
  };
  const live = filtered.filter(m => classify(m) === 'live');
  const scheduled = filtered.filter(m => classify(m) === 'scheduled');
  const completed = filtered.filter(m => classify(m) === 'completed');

  return (
    <div style={{
      padding: SPACE.lg,
      paddingBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE.md,
    }}>
      {/* Closed banner */}
      {isClosed && (
        <div style={{
          padding: SPACE.lg, borderRadius: RADIUS.lg,
          background: `${COLORS.textMuted}10`,
          border: `1px solid ${COLORS.textMuted}30`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🔒</div>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.textMuted }}>
            Tournament closed
          </div>
        </div>
      )}

      {/* Division pill filter */}
      {!isPractice && (tournament.divisions?.length > 0) && (
        <div style={{
          display: 'flex',
          background: COLORS.surface,
          borderRadius: RADIUS.lg,
          border: `1px solid ${COLORS.border}`,
          padding: 3,
          flexShrink: 0,
        }}>
          {tournament.divisions.map(d => (
            <div key={d} onClick={() => setActiveDivision(d)}
              style={{
                flex: 1, padding: `${SPACE.sm}px ${SPACE.xs}px`,
                borderRadius: RADIUS.md,
                fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                cursor: 'pointer', textAlign: 'center',
                color: resolvedDivision === d ? COLORS.accent : COLORS.textMuted,
                background: resolvedDivision === d ? COLORS.surfaceLight : 'transparent',
                transition: 'all .12s',
                minHeight: 44,
              }}>
              {d}
            </div>
          ))}
        </div>
      )}

      {/* Matches */}
      <div>
        <SectionTitle right={
          scouted[0] && !isClosed && !isViewer ? (
            <span onClick={() => setAddMatchModal(true)}
              style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.accent, cursor: 'pointer' }}>
              + Add
            </span>
          ) : null
        }>Matches ({filtered.length})</SectionTitle>

        {!filtered.length && (
          <div style={{ textAlign: 'center', padding: SPACE.xl }}>
            <EmptyState icon="⚔️" text="No matches yet" />
            {!isClosed && !isViewer && (
              <div style={{ display: 'flex', gap: SPACE.sm, justifyContent: 'center', marginTop: SPACE.md, flexWrap: 'wrap' }}>
                <Btn variant="accent" onClick={() => setAddTeamModal(true)}>+ Add team</Btn>
                <Btn variant="default" onClick={() => setScheduleOpen(true)}>Import schedule</Btn>
              </div>
            )}
          </div>
        )}

        {live.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel color={COLORS.accent}>Live ({live.length})</SectionLabel>
            {live.map(m => (
              <MatchCard key={m.id} m={m} status="live" tournamentId={tournamentId} getTeamName={getTeamName} navigate={navigate} readOnly={isClosed} />
            ))}
          </div>
        )}

        {scheduled.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            {(live.length > 0 || completed.length > 0) && <SectionLabel>Scheduled ({scheduled.length})</SectionLabel>}
            {scheduled.map(m => (
              <MatchCard key={m.id} m={m} status="scheduled" tournamentId={tournamentId} getTeamName={getTeamName} navigate={navigate} readOnly={isClosed} />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel>Completed ({completed.length})</SectionLabel>
            {completed.map(m => (
              <MatchCard key={m.id} m={m} status="completed" tournamentId={tournamentId} getTeamName={getTeamName} navigate={navigate} readOnly={isClosed} />
            ))}
          </div>
        )}
      </div>

      {/* Add match + Add team — primary actions. "Add match" needs ≥1
          scouted team to pick from; "Add team" always available so coaches
          can keep expanding the scouted roster as the tournament unfolds. */}
      {!isClosed && !isViewer && (
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          {scouted[0] && (
            <div
              onClick={() => setAddMatchModal(true)}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: 12,
                border: `1px dashed ${COLORS.accent}50`,
                background: `${COLORS.accent}08`,
                color: COLORS.accent,
                fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                textAlign: 'center',
                cursor: 'pointer',
                minHeight: 52,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
              }}>
              + Add match
            </div>
          )}
          <div
            onClick={() => setAddTeamModal(true)}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: 12,
              border: `1px dashed ${COLORS.accent}50`,
              background: `${COLORS.accent}08`,
              color: COLORS.accent,
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
              textAlign: 'center',
              cursor: 'pointer',
              minHeight: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}>
            + Add team
          </div>
        </div>
      )}

      {/* New match modal */}
      <Modal open={addMatchModal} onClose={() => setAddMatchModal(false)} title="New match"
        footer={<>
          <Btn variant="default" onClick={() => setAddMatchModal(false)}>Cancel</Btn>
          <Btn variant="accent" onClick={handleAddMatch}
            disabled={!matchTeamA || !matchTeamB || matchTeamA === matchTeamB}>
            Create
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginBottom: SPACE.xs }}>Home team</div>
            <Select value={matchTeamA} onChange={setMatchTeamA} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
              <option value="">— select —</option>
              {divisionScouted.map(s => {
                const t = teams.find(x => x.id === s.teamId);
                return t ? <option key={s.id} value={s.id}>{t.name}</option> : null;
              })}
            </Select>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginBottom: SPACE.xs }}>Away team</div>
            <Select value={matchTeamB} onChange={setMatchTeamB} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
              <option value="">— select —</option>
              {divisionScouted.filter(s => s.id !== matchTeamA).map(s => {
                const t = teams.find(x => x.id === s.teamId);
                return t ? <option key={s.id} value={s.id}>{t.name}</option> : null;
              })}
            </Select>
          </div>
        </div>
      </Modal>

      {/* Add team to tournament modal — one-tap picker with parent/child
          hierarchy. Division auto-derives from team mapping in handleAddScouted.
          Hint strip above the list clarifies the auto-selection when the
          tournament has division splits. */}
      <Modal open={addTeamModal} onClose={() => setAddTeamModal(false)} title="Add team to tournament">
        {sortedAvailable.length === 0 ? (
          <div style={{
            padding: SPACE.lg, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          }}>
            {tournament.league
              ? `No eligible teams for ${tournament.league}. Create one in Teams or pick another league.`
              : 'All workspace teams already scouted in this tournament.'}
          </div>
        ) : (
          <>
            {(tournament.divisions?.length > 0) && (
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
                marginBottom: SPACE.sm, letterSpacing: '.2px',
              }}>
                Division is auto-assigned from each team's league mapping
                {resolvedDivision !== 'all' && ` (fallback: ${resolvedDivision})`}.
              </div>
            )}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              maxHeight: '60dvh', overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}>
              {sortedAvailable.map(tm => {
                const teamDiv = tm.divisions?.[tournament.league] || null;
                return (
                  <div
                    key={tm.id}
                    onClick={() => handleAddScouted(tm.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 14px',
                      marginLeft: tm._isChild ? 24 : 0,
                      minHeight: TOUCH.minTarget,
                      background: COLORS.surfaceDark,
                      border: `1px ${tm._isChild ? 'dashed' : 'solid'} ${COLORS.border}`,
                      borderRadius: RADIUS.md,
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    <span style={{
                      fontFamily: FONT,
                      fontSize: FONT_SIZE.base,
                      fontWeight: tm._isChild ? 500 : 600,
                      color: COLORS.text, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {tm._isChild && <span style={{ color: COLORS.textMuted, marginRight: 4 }}>↳</span>}
                      {tm.name}
                    </span>
                    {teamDiv && (
                      <span style={{
                        fontFamily: FONT, fontSize: 10, fontWeight: 700,
                        color: COLORS.textMuted, letterSpacing: '.3px',
                        padding: '2px 7px', borderRadius: 4,
                        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                      }}>{teamDiv}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      <ScheduleImport open={scheduleOpen} onClose={() => setScheduleOpen(false)}
        tournament={tournament} teams={teams} scouted={scouted} players={players}
        ds={ds} tournamentId={tournamentId} />
    </div>
  );
}

// ─── Split-tap match card (extracted from TournamentPage) ───
function MatchCard({ m, status, tournamentId, getTeamName, navigate, readOnly }) {
  const sA = m.scoreA || 0, sB = m.scoreB || 0;
  const hasScore = sA > 0 || sB > 0;
  const tA = getTeamName(m.teamA), tB = getTeamName(m.teamB);
  const isScheduled = status === 'scheduled';
  const isLive = status === 'live';
  const isCompleted = status === 'completed';

  const currentUid = auth.currentUser?.uid || null;
  const STALE_MS = 10 * 60 * 1000;
  const isClaimActive = (uid, ts) => !!uid && (!ts || Date.now() - ts <= STALE_MS);
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
    navigate(`/tournament/${tournamentId}/match/${m.id}?scout=${scoutedId}`);
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
