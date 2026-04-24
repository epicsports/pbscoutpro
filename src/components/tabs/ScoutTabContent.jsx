import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Select } from '../ui';
import ScheduleImport from '../ScheduleImport';
import MatchCard from '../MatchCard';
import { useTeams, useScoutedTeams, useMatches, usePlayers } from '../../hooks/useFirestore';
import { useTournaments } from '../../hooks/useFirestore';
import { useViewAs } from '../../hooks/useViewAs';
import { useLiveMatchScores } from '../../hooks/useLiveMatchScores';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';

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
  // Multi-select (bug I2): checkbox list + batch add, replacing tap-and-close.
  const [addTeamModal, setAddTeamModal] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState(() => new Set());
  const [addingBatch, setAddingBatch] = useState(false);
  const [addErrorCount, setAddErrorCount] = useState(0);

  // Reset selection + error state whenever the modal closes so the next open
  // starts clean. Reopening a modal with stale selection would surprise users.
  useEffect(() => {
    if (!addTeamModal) {
      setSelectedTeamIds(new Set());
      setAddErrorCount(0);
    }
  }, [addTeamModal]);

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

  // ⚠️ Hooks below MUST run on every render — keep the early return AFTER
  // all hook calls (Rules of Hooks). The 2026-04-24 P0 Fix 1
  // (`useLiveMatchScores`) originally landed below the `if (!tournament)`
  // guard, which was a hook-after-early-return violation that crashed the
  // tournament scout view with React #310 once `tournament` resolved
  // mid-mount. Computing `filtered` + `liveCandidateIds` here is safe even
  // when `tournament` is undefined: `resolvedDivision` falls back to 'all',
  // `matches` is the empty subscription bootstrap, and `useLiveMatchScores`
  // no-ops on empty matchIds.
  const filtered = resolvedDivision === 'all'
    ? matches
    : matches.filter(m => m.division === resolvedDivision);

  const liveCandidateIds = useMemo(
    () => filtered.filter(m => m.status !== 'closed').map(m => m.id),
    [filtered],
  );
  const liveScores = useLiveMatchScores(tournamentId, liveCandidateIds);

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

  // Build the addScoutedTeam payload for one teamId. Keeps the roster +
  // division derivation identical to the pre-multi-select single-add path so
  // batch add preserves all behavior (child-team roster union, division
  // auto-map per team's league mapping with pill fallback).
  const buildScoutedPayload = (teamId) => {
    const team = teams.find(tm => tm.id === teamId);
    const childIds = teams.filter(tm => tm.parentTeamId === teamId).map(tm => tm.id);
    const teamRoster = players
      .filter(p => [teamId, ...childIds].includes(p.teamId))
      .map(p => p.id);
    const teamDivision = team?.divisions?.[tournament.league] || null;
    const finalDivision = teamDivision
      || (resolvedDivision !== 'all' ? resolvedDivision : null);
    return { teamId, roster: teamRoster, division: finalDivision };
  };

  const toggleTeamSelection = (teamId) => {
    setSelectedTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  // Batch add: fire all addScoutedTeam writes in parallel, then either close
  // on full success or keep the modal open with only the failed rows still
  // checked so the user can retry without re-ticking everything.
  const handleBatchAddTeams = async () => {
    if (selectedTeamIds.size === 0 || addingBatch) return;
    setAddingBatch(true);
    setAddErrorCount(0);

    const ids = Array.from(selectedTeamIds);
    const results = await Promise.allSettled(
      ids.map(teamId => ds.addScoutedTeam(tournamentId, buildScoutedPayload(teamId)))
    );
    const failedIds = ids.filter((_, i) => results[i].status === 'rejected');
    setAddingBatch(false);

    if (failedIds.length === 0) {
      setAddTeamModal(false);
      return;
    }
    setSelectedTeamIds(new Set(failedIds));
    setAddErrorCount(failedIds.length);
  };

  // Match classification + render — `filtered` / `liveCandidateIds` /
  // `liveScores` were computed above the early return for hook-safety; here
  // we just use them. See the comment near line 141.
  const classify = (m) => {
    if (m.status === 'closed') return 'completed';
    // Prefer live computed count (mirrors detail page); fall back to cached
    // m.scoreA/B for matches whose listener hasn't fired yet (first paint
    // before subscribePoints resolves).
    const live = liveScores[m.id];
    const liveCount = live?.count ?? 0;
    const cachedA = m.scoreA || 0;
    const cachedB = m.scoreB || 0;
    if (liveCount > 0 || cachedA > 0 || cachedB > 0) return 'live';
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
                {scouted.length === 0 && (
                  <Btn variant="accent" onClick={() => setAddTeamModal(true)}>+ Add team</Btn>
                )}
                <Btn variant="default" onClick={() => setScheduleOpen(true)}>Import schedule</Btn>
              </div>
            )}
          </div>
        )}

        {live.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel color={COLORS.accent}>Live ({live.length})</SectionLabel>
            {live.map(m => (
              <MatchCard key={m.id} m={m} status="live" tournamentId={tournamentId} getTeamName={getTeamName} navigate={navigate} readOnly={isClosed} liveScore={liveScores[m.id]?.score || null} />
            ))}
          </div>
        )}

        {scheduled.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            {(live.length > 0 || completed.length > 0) && <SectionLabel>Scheduled ({scheduled.length})</SectionLabel>}
            {scheduled.map(m => (
              <MatchCard key={m.id} m={m} status="scheduled" tournamentId={tournamentId} getTeamName={getTeamName} navigate={navigate} readOnly={isClosed} liveScore={liveScores[m.id]?.score || null} />
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

      {/* Add match + Add team — primary actions. Gated on scouted.length >= 1
          so the empty-state CTA (scouted=0 branch above) owns the first-team
          moment; once the first team is added, the empty state disappears and
          this row takes over. Avoids duplicate "Add team" CTAs (bug I1). */}
      {!isClosed && !isViewer && scouted.length >= 1 && (
        <div style={{ display: 'flex', gap: SPACE.sm }}>
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

      {/* Add teams modal (multi-select, bug I2) — checkbox list + batch add.
          Tapping a row toggles its checkbox. Footer shows selection count +
          "Add N teams" primary button. On partial failure the modal stays
          open with only the failed rows still selected.
          Division auto-derives from each team's league mapping in
          buildScoutedPayload (preserves pre-multi-select behavior). */}
      <Modal open={addTeamModal} onClose={() => setAddTeamModal(false)}
        title="Add teams"
        footer={sortedAvailable.length > 0 ? (
          <>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
              color: COLORS.textMuted,
            }}>
              {selectedTeamIds.size > 0 && `${selectedTeamIds.size} selected`}
            </div>
            <Btn variant="default" onClick={() => setAddTeamModal(false)} disabled={addingBatch}>
              Cancel
            </Btn>
            <Btn variant="accent"
              disabled={selectedTeamIds.size === 0 || addingBatch}
              onClick={handleBatchAddTeams}>
              {addingBatch
                ? 'Adding…'
                : selectedTeamIds.size === 0
                  ? 'Add'
                  : selectedTeamIds.size === 1
                    ? 'Add 1 team'
                    : `Add ${selectedTeamIds.size} teams`}
            </Btn>
          </>
        ) : null}>
        {sortedAvailable.length === 0 ? (
          <div style={{
            padding: SPACE.lg, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
            fontStyle: 'italic',
          }}>
            {tournament.league
              ? `No eligible teams for ${tournament.league}. Create one in Teams or pick another league.`
              : 'All available teams are already in this tournament.'}
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
            {addErrorCount > 0 && (
              <div style={{
                padding: '8px 12px', borderRadius: RADIUS.md,
                background: `${COLORS.danger}18`,
                border: `1px solid ${COLORS.danger}40`,
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
                color: COLORS.danger, marginBottom: SPACE.sm,
              }}>
                {addErrorCount} {addErrorCount === 1 ? 'team' : 'teams'} failed to add — try again
              </div>
            )}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              maxHeight: '60dvh', overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}>
              {sortedAvailable.map(tm => {
                const teamDiv = tm.divisions?.[tournament.league] || null;
                const checked = selectedTeamIds.has(tm.id);
                return (
                  <div
                    key={tm.id}
                    onClick={() => !addingBatch && toggleTeamSelection(tm.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px',
                      marginLeft: tm._isChild ? 24 : 0,
                      minHeight: 52,
                      background: checked ? `${COLORS.accent}12` : COLORS.surfaceDark,
                      border: `1px ${tm._isChild ? 'dashed' : 'solid'} ${checked ? `${COLORS.accent}60` : COLORS.border}`,
                      borderRadius: RADIUS.md,
                      cursor: addingBatch ? 'default' : 'pointer',
                      opacity: addingBatch && !checked ? 0.5 : 1,
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'background .12s, border-color .12s',
                    }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: checked ? COLORS.accent : 'transparent',
                      border: `2px solid ${checked ? COLORS.accent : COLORS.textDim}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all .12s',
                    }}>
                      {checked && (
                        <span style={{
                          color: COLORS.bg, fontSize: 14, fontWeight: 900,
                          lineHeight: 1,
                        }}>✓</span>
                      )}
                    </div>
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

