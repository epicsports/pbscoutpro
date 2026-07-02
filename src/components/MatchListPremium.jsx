import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, SectionTitle, EmptyState, Modal, Select } from './ui';
import ScheduleImport from './ScheduleImport';
import ScheduleCSVImport from './ScheduleCSVImport';
import ScheduleList from './match/ScheduleList';
import Preloader from './Preloader';
import { useScreenLoader } from '../hooks/useScreenLoader';
import { useActiveTeams, useScoutedTeams, useMatches, usePlayers } from '../hooks/useFirestore';
import { useTournaments } from '../hooks/useFirestore';
import { useViewAs } from '../hooks/useViewAs';
import { leagueDisplayName } from '../hooks/useLeagues';
import SearchFilterPanel from './SearchFilterPanel';
import SearchField from './SearchField';
import TeamBadge from './TeamBadge';
import { matchEntity, teamInDivision } from '../utils/entityFilters';
import { matchTimeMillis } from '../utils/divisionAliases';
import { useLiveMatchScores } from '../hooks/useLiveMatchScores';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, ELEV } from '../utils/theme';
import RdIcon from './RdIcon';
import DivisionTabs from './tabs/DivisionTabs';
import { playerOnTeam } from '../utils/playerTeams';
import { STATIC_FLAGS } from '../utils/featureFlags';
import { classifyMatch } from '../utils/matchClassify';
import { useLanguage } from '../hooks/useLanguage';

/**
 * MatchListPremium — the responsive match-list scout launcher (one task: choose
 * who to scout). ONE component for phone AND tablet, gated by the `wide` prop.
 * Lifted verbatim from ScoutTabContent (DESIGN_DECISIONS § 22, § 26, § 31) so
 * the phone path is byte-identical; `wide` adds a 2–3 col grid reflow for the
 * scheduled/completed sections (live cards stay full-width hero rows). The
 * split-tap MatchCard routing (`?scout=`+side / MatchPage review) is FROZEN —
 * identical at every width.
 *
 * Self-contained: fetches its own matches/teams/scouted by tournamentId so it
 * can be dropped into MainPage (phone) or AppShellPremiumWide (tablet) without
 * prop plumbing.
 *
 * Props:
 *   tournamentId  workspace-scoped tournament id
 *   wide          false (phone, single column) | true (tablet, grid reflow)
 */
export default function MatchListPremium({ tournamentId, wide = false }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tournaments } = useTournaments();
  const { teams, loading: teamsLoading } = useActiveTeams();
  const { players } = usePlayers();
  const { scouted, loading: scoutedLoading } = useScoutedTeams(tournamentId);
  const { matches, loading: matchesLoading } = useMatches(tournamentId);
  // CTA gating uses effective roles so admin impersonating viewer sees a
  // viewer's UI (§ 38.5). Real role check unnecessary here — this is a UI-only
  // surface.
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const isViewer = !effectiveIsAdmin
    && effectiveRoles.length > 0
    && effectiveRoles.every(r => r === 'viewer');

  const tournament = tournaments.find(t => t.id === tournamentId);
  // B17 cleanup (2026-05-27): `isPractice` removed — `type:'practice'` was
  // a dead discriminator (0 prod docs per § 69 backfill).
  const isClosed = tournament?.status === 'closed';

  const [activeDivision, setActiveDivision] = useState(null);
  const resolvedDivision = activeDivision || tournament?.divisions?.[0] || 'all';
  // § Stage D — search WITHIN the division-grouped match list by team name
  // (division pills + stage grouping stay the view).
  const [matchSearch, setMatchSearch] = useState('');

  const [addMatchModal, setAddMatchModal] = useState(false);
  const [matchTeamA, setMatchTeamA] = useState('');
  const [matchTeamB, setMatchTeamB] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleCsvOpen, setScheduleCsvOpen] = useState(false);
  // "Add team to tournament" — restores the path lost in § 31 tab refactor
  // (ds.addScoutedTeam had no UI entry point after TournamentPage was split).
  // Multi-select (bug I2): checkbox list + batch add, replacing tap-and-close.
  const [addTeamModal, setAddTeamModal] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState(() => new Set());
  const [addingBatch, setAddingBatch] = useState(false);
  const [addErrorCount, setAddErrorCount] = useState(0);
  // § Stage C — add-team picker search + Dywizja (Liga is fixed by the tournament).
  const [addSearch, setAddSearch] = useState('');
  const [addDiv, setAddDiv] = useState('');

  // Reset selection + error state whenever the modal closes so the next open
  // starts clean. Reopening a modal with stale selection would surprise users.
  useEffect(() => {
    if (!addTeamModal) {
      setSelectedTeamIds(new Set());
      setAddErrorCount(0);
      setAddSearch('');
      setAddDiv('');
    }
  }, [addTeamModal]);

  const divisionScouted = useMemo(() => {
    const tournDivs = tournament?.divisions || [];
    return resolvedDivision === 'all'
      ? scouted
      // Lenient (unified with CoachTabContent, c10a282e): never hide a scouted
      // team whose division is null OR isn't one of THIS tournament's divisions.
      : scouted.filter(st => st.division === resolvedDivision || !st.division || !tournDivs.includes(st.division));
  }, [scouted, resolvedDivision, tournament?.divisions]);

  // Eligible teams = workspace teams matching tournament league (or any team
  // when tournament has no league — e.g. practice) AND not already scouted.
  // Grouped with parent teams rendered first, their children indented below
  // (marked with _isChild flag); orphan children (no parent in filtered set)
  // appear at the end. Mirrors the old TournamentPage (a4912dc2) behavior.
  const sortedAvailable = useMemo(() => {
    const scoutedIds = new Set(scouted.map(s => s.teamId));
    const teamById = new Map((teams || []).map(tm => [tm.id, tm]));
    // leagues[] is a CLUB-level attribute set on the parent. A child /
    // 2nd-roster team (parentTeamId set) often carries no leagues of its own,
    // so the bare `leagues.includes(...)` check below would drop it before the
    // parent→children grouping even runs — children vanished from the picker.
    // Treat a child as in-league when EITHER it or its parent club is.
    const inLeague = (tm) => {
      if (!tournament?.league) return true;
      const leagues = Array.isArray(tm?.leagues) ? tm.leagues : [];
      return leagues.includes(tournament.league);
    };
    const available = (teams || []).filter(tm => {
      if (scoutedIds.has(tm.id)) return false;
      if (inLeague(tm)) return true;
      if (tm.parentTeamId) {
        const parent = teamById.get(tm.parentTeamId);
        if (parent && inLeague(parent)) return true;
      }
      return false;
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

  // § Stage C — add-team picker filter (search + Dywizja). MUST stay ABOVE the
  // `if (!tournament)` early return (React #310 — these useMemos ran only after
  // tournament resolved, changing hook count between renders on cold launch).
  // Safe pre-return: all deps (sortedAvailable/addSearch/addDiv/tournament?.league)
  // are computed above; `tournament?.league` no-ops to undefined while loading.
  const addDivOptions = useMemo(
    () => [...new Set(sortedAvailable.map(tm => tm.divisions?.[tournament?.league]).filter(Boolean))].map(d => ({ value: d, label: d })),
    [sortedAvailable, tournament?.league],
  );
  const visibleAvailable = useMemo(
    () => sortedAvailable.filter(tm => matchEntity(addSearch, tm, ['name', 'externalId']) && teamInDivision(tm, addDiv, tournament?.league)),
    [sortedAvailable, addSearch, addDiv, tournament?.league],
  );

  // Preloader gate (the "?" fix) — while teams/matches/scouted load, MatchCards
  // would render rows whose getTeamName returns '?' (team docs not in yet). Show
  // the determinate Preloader instead so no '?'-name row ever flashes. Hooks
  // ABOVE any early return (Rules of Hooks). Pattern: PlayerStatsPage.jsx.
  const dataLoading = teamsLoading || matchesLoading || scoutedLoading;
  const { shown: loaderShown, progress: loaderP, close: closeLoader } = useScreenLoader(dataLoading);

  if (!tournament) return <Preloader loop />;

  if (loaderShown) {
    return (
      <div style={{ position: 'relative', minHeight: '60vh' }}>
        <Preloader
          progress={loaderP}
          phases={[{ label: t('preloader_phase_fetch_matches'), to: 45 }, { label: t('preloader_phase_load_teams'), to: 85 }, { label: t('preloader_phase_render'), to: 100 }]}
          caption="reads · lista meczów"
          onDone={closeLoader}
        />
      </div>
    );
  }

  const getTeamName = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    const t = s ? teams.find(x => x.id === s.teamId) : null;
    return t?.name || '?';
  };
  // § Team branding — resolve the global team object for a scouted-side crest.
  const getTeam = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    return s ? teams.find(x => x.id === s.teamId) || null : null;
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
    const allIds = [teamId, ...childIds];
    // Division enforcement: the team's own per-league division wins; a child /
    // 2nd-roster team inherits its PARENT club's division (division is a
    // club-level attribute carried on the parent — a child carries no
    // divisions[league] of its own and would otherwise land with no division).
    const parent = team?.parentTeamId
      ? teams.find(tm => tm.id === team.parentTeamId)
      : null;
    const teamDivision = team?.divisions?.[tournament.league]
      || parent?.divisions?.[tournament.league]
      || null;
    const finalDivision = teamDivision
      || (resolvedDivision !== 'all' ? resolvedDivision : null);
    // B3 / § 83 — narrow parent+children union to teams whose
    // divisions[league] === finalDivision. The unconditional union (introduced
    // 1a030508 to fix the empty-roster bug) over-corrected: parent + ALL
    // children showed up regardless of division. Per-team filter on
    // divisions[league] drops out-of-division siblings while preserving the
    // legit children-expansion for parents that themselves carry no direct
    // roster. Defensive fallback to the full union when finalDivision is
    // null (no division to filter by) or when the filter yields zero
    // (incomplete team data — better to over-show than ship empty roster).
    const matchingIds = finalDivision
      ? allIds.filter(id => {
          const tm = teams.find(t => t.id === id);
          return tm?.divisions?.[tournament.league] === finalDivision;
        })
      : allIds;
    const finalIds = matchingIds.length > 0 ? matchingIds : allIds;
    const teamRoster = players
      .filter(p => finalIds.some(id => playerOnTeam(p, id)))
      .map(p => p.id);
    return { teamId, name: team?.name || null, roster: teamRoster, division: finalDivision };
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
  const classify = (m) => classifyMatch(m, liveScores);
  // § Stage D — search filters WITHIN the division view by either side's team
  // name; division pills + stage grouping below are preserved.
  const searched = matchSearch.trim()
    ? filtered.filter(m => matchEntity(matchSearch, { name: `${getTeamName(m.teamA)} ${getTeamName(m.teamB)}` }, ['name']))
    : filtered;
  // Game-time ordering (Jacek 2026-07-02): each section is one clean list ordered
  // by scheduledAt (legacy date+time / gameNumber fallback). Live + Scheduled
  // ascending (follows the day's schedule); Completed descending (just-finished on
  // top). Stage/group sub-headers are dropped from Scheduled — see the flat
  // `groupScheduledByStage={false}` on <ScheduleList> below.
  const byTimeAsc = (a, b) => matchTimeMillis(a) - matchTimeMillis(b);
  const byTimeDesc = (a, b) => matchTimeMillis(b) - matchTimeMillis(a);
  const live = searched.filter(m => classify(m) === 'live').sort(byTimeAsc);
  const scheduled = searched.filter(m => classify(m) === 'scheduled').sort(byTimeAsc);
  const completed = searched.filter(m => classify(m) === 'completed').sort(byTimeDesc);

  // wide reflow + stage/group sub-headers live in <ScheduleList> (dup-audit #2):
  // scheduled/completed cards flow into a 2–3 col responsive grid (live stays
  // full-width hero rows). On phone (wide=false) the grid is a transparent
  // Fragment so the markup stays byte-identical to before — no extra wrapper,
  // no style change. We pass `wide` + `groupScheduledByStage` to drive both.

  return (
    <div style={{
      padding: SPACE.lg,
      paddingBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE.md,
      ...(wide ? { maxWidth: 1180, margin: '0 auto', width: '100%' } : null),
    }}>
      {/* Closed banner — premium */}
      {isClosed && (
        <div style={{
          padding: SPACE.lg, borderRadius: RADIUS.lg,
          background: ELEV.sunken,
          border: `1px solid ${ELEV.hairline}`,
          boxShadow: ELEV.shadow1,
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: COLORS.textMuted }}><RdIcon name="shield" size={26} /></div>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.textMuted }}>
            {t('mlp_tournament_closed')}
          </div>
        </div>
      )}

      {/* Division pill filter — shared premium DivisionTabs */}
      <DivisionTabs divisions={tournament.divisions} active={resolvedDivision} onChange={setActiveDivision} />

      {/* Matches */}
      <div>
        <SectionTitle right={
          scouted[0] && !isClosed && !isViewer ? (
            <span onClick={() => setAddMatchModal(true)}
              style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.accent, cursor: 'pointer' }}>
              {t('add_short')}
            </span>
          ) : null
        }>{t('matches_title')} ({filtered.length})</SectionTitle>

        {filtered.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SearchField value={matchSearch} onChange={setMatchSearch} placeholder={t('b13_scout_search_team_ph')} />
          </div>
        )}
        {filtered.length > 0 && matchSearch.trim() && searched.length === 0 && (
          <div style={{ padding: SPACE.md, fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>
            {t('mlp_no_matches_for', matchSearch)}
          </div>
        )}

        {!filtered.length && (
          <div style={{ textAlign: 'center', padding: SPACE.xl }}>
            <EmptyState icon="⚔️" text={t('scout_tab_no_matches_yet')} />
            {!isClosed && !isViewer && (
              <div style={{ display: 'flex', gap: SPACE.sm, justifyContent: 'center', marginTop: SPACE.md, flexWrap: 'wrap' }}>
                {scouted.length === 0 && (
                  <Btn variant="accent" onClick={() => setAddTeamModal(true)}>{t('scout_tab_add_team')}</Btn>
                )}
                {/* "Import schedule (zdjęcie)" hidden per DESIGN_DECISIONS § 65 (2026-05-20) —
                    OCR-based image import uses client-side Anthropic key (security violation).
                    CSV import is the working manual path. Re-enable requires Cloud Function migration. */}
                {STATIC_FLAGS.ENABLE_VISION_API && (
                  <Btn variant="default" onClick={() => setScheduleOpen(true)}>{t('mlp_import_photo')}</Btn>
                )}
                <Btn variant="default" onClick={() => setScheduleCsvOpen(true)}>{t('mlp_import_csv')}</Btn>
              </div>
            )}
          </div>
        )}

        {/* Shared Live / Scheduled / Completed grouping (dup-audit #2). Scout
            variant: `wide` grid reflow; each section is a single game-time-ordered
            list (stage/group sub-headers dropped — Jacek 2026-07-02). */}
        <ScheduleList
          live={live} scheduled={scheduled} completed={completed}
          tournamentId={tournamentId} getTeamName={getTeamName} getTeam={getTeam}
          navigate={navigate} readOnly={isClosed} liveScores={liveScores}
          wide={wide} groupScheduledByStage={false} />
      </div>

      {/* Add match + Add team — primary actions. Gated on scouted.length >= 1
          so the empty-state CTA (scouted=0 branch above) owns the first-team
          moment; once the first team is added, the empty state disappears and
          this row takes over. Avoids duplicate "Add team" CTAs (bug I1). */}
      {!isClosed && !isViewer && scouted.length >= 1 && (
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          <div onClick={() => setAddMatchModal(true)} className="rd-press"
            style={{
              flex: 1, padding: '16px', borderRadius: 12,
              border: `1px dashed ${COLORS.accentA40}`,
              background: COLORS.accentA12,
              color: COLORS.accent,
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800,
              cursor: 'pointer', minHeight: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <RdIcon name="plus" size={15} />{t('scout_tab_add_match')}
          </div>
          <div onClick={() => setAddTeamModal(true)} className="rd-press"
            style={{
              flex: 1, padding: '16px', borderRadius: 12,
              border: `1px dashed ${COLORS.accentA40}`,
              background: COLORS.accentA12,
              color: COLORS.accent,
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800,
              cursor: 'pointer', minHeight: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <RdIcon name="plus" size={15} />{t('scout_tab_add_team')}
          </div>
        </div>
      )}

      {/* New match modal */}
      <Modal open={addMatchModal} onClose={() => setAddMatchModal(false)} title={t('scout_tab_new_match')}
        footer={<>
          <Btn variant="default" onClick={() => setAddMatchModal(false)}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={handleAddMatch}
            disabled={!matchTeamA || !matchTeamB || matchTeamA === matchTeamB}>
            {t('create')}
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginBottom: SPACE.xs }}>{t('scout_tab_home_team')}</div>
            <Select value={matchTeamA} onChange={setMatchTeamA} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
              <option value="">{t('select_ph')}</option>
              {divisionScouted.map(s => {
                const team = teams.find(x => x.id === s.teamId);
                return team ? <option key={s.id} value={s.id}>{team.name}</option> : null;
              })}
            </Select>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginBottom: SPACE.xs }}>{t('scout_tab_away_team')}</div>
            <Select value={matchTeamB} onChange={setMatchTeamB} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
              <option value="">{t('select_ph')}</option>
              {divisionScouted.filter(s => s.id !== matchTeamA).map(s => {
                const team = teams.find(x => x.id === s.teamId);
                return team ? <option key={s.id} value={s.id}>{team.name}</option> : null;
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
        title={t('scout_tab_add_teams_title')}
        footer={sortedAvailable.length > 0 ? (
          <>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
              color: COLORS.textMuted,
            }}>
              {selectedTeamIds.size > 0 && t('scout_tab_n_selected', selectedTeamIds.size)}
            </div>
            <Btn variant="default" onClick={() => setAddTeamModal(false)} disabled={addingBatch}>
              {t('cancel')}
            </Btn>
            <Btn variant="accent"
              disabled={selectedTeamIds.size === 0 || addingBatch}
              onClick={handleBatchAddTeams}>
              {addingBatch
                ? t('scout_tab_adding')
                : selectedTeamIds.size === 0
                  ? t('add')
                  : t('scout_tab_add_n_teams', selectedTeamIds.size)}
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
              ? t('scout_tab_no_eligible_league', leagueDisplayName(tournament.league))
              : t('scout_tab_no_eligible_all')}
          </div>
        ) : (
          <>
            {(tournament.divisions?.length > 0) && (
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
                marginBottom: SPACE.sm, letterSpacing: '.2px',
              }}>
                {t('mlp_division_auto_hint')}
                {resolvedDivision !== 'all' && t('mlp_division_auto_fallback', resolvedDivision)}.
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
                {t('mlp_add_failed_n', addErrorCount)}
              </div>
            )}
            {/* § Stage C — shared search + Dywizja (Liga fixed by tournament) */}
            <SearchFilterPanel
              search={addSearch}
              onSearchChange={setAddSearch}
              searchPlaceholder={t('mlp_search_teams_ph')}
              filters={addDivOptions.length ? [{ key: 'dyw', label: 'Dywizja', value: addDiv, onChange: setAddDiv, allLabel: 'wszystkie', options: addDivOptions }] : []}
              style={{ marginBottom: SPACE.sm }}
            />
            {visibleAvailable.length === 0 ? (
              <div style={{ padding: SPACE.lg, textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>{t('picker_no_matches')}</div>
            ) : null}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              maxHeight: '60dvh', overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}>
              {visibleAvailable.map(tm => {
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
                      background: checked ? COLORS.accentA12 : ELEV.surface,
                      border: `1px ${tm._isChild ? 'dashed' : 'solid'} ${checked ? COLORS.accentA40 : ELEV.hairline}`,
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
                      {checked && <span style={{ color: COLORS.bg, display: 'flex' }}><RdIcon name="check" size={14} /></span>}
                    </div>
                    <TeamBadge team={tm} size={28} />
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
                        background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`,
                      }}>{teamDiv}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      {/* ScheduleImport render gated per § 65 — modal cannot mount even if
          scheduleOpen state is set elsewhere (defense in depth). */}
      {STATIC_FLAGS.ENABLE_VISION_API && (
        <ScheduleImport open={scheduleOpen} onClose={() => setScheduleOpen(false)}
          tournament={tournament} teams={teams} scouted={scouted} players={players}
          ds={ds} tournamentId={tournamentId} />
      )}
      <ScheduleCSVImport open={scheduleCsvOpen} onClose={() => setScheduleCsvOpen(false)}
        tournaments={tournaments} teams={teams} scouted={scouted} players={players}
        ds={ds} activeTournamentId={tournamentId} />
    </div>
  );
}
