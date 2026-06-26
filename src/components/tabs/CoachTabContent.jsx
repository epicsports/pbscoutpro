import React, { useState, useMemo } from 'react';
import Preloader from '../Preloader';
import { useNavigate } from 'react-router-dom';
import { Btn, SectionTitle, SectionLabel, EmptyState, SkeletonList } from '../ui';
import SearchField from '../SearchField';
import { matchEntity } from '../../utils/entityFilters';
import MatchCard from '../MatchCard';
import { classifyMatch } from '../../utils/matchClassify';
import DivisionTabs from './DivisionTabs';
import StandingsTable from './StandingsTable';
import OpenTacticsAction from '../OpenTacticsAction';
import RdIcon from '../RdIcon';
import TeamBadge from '../TeamBadge';
import { useTournaments, useActiveTeams, useScoutedTeams, useMatches, usePlayers } from '../../hooks/useFirestore';
import { useLiveMatchScores } from '../../hooks/useLiveMatchScores';
import { computeTeamRecords } from '../../utils/teamStats';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, ELEV, TRACKING, TNUM } from '../../utils/theme';
import * as ds from '../../services/dataService';
import { useLanguage } from '../../hooks/useLanguage';

// Shared with CoachWide (the wide-shell coach tab) — hiding a team on the phone
// reflects on tablet/desktop and vice-versa.
const HIDDEN_KEY = 'reads.coach.hiddenTeams';

/**
 * CoachTabContent — premium scouted-teams list + grouped match list (DESIGN_DECISIONS
 * § 26 § 31). North Star re-skin (2026-06-22): team rows carry the option-E team-color
 * LEFT-GRADIENT identification + W-L pill + a per-team hide → `reads.coach.hiddenTeams`
 * with an "Ukryte · N" restore, consistent with `CoachWide`. ONE touch target per row
 * → ScoutedTeamPage. Division grouping/search/repair/nav + the split-tap match list are
 * preserved verbatim.
 */
export default function CoachTabContent({ tournamentId }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useActiveTeams();
  const { scouted, loading } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { players } = usePlayers();   // § fix — pass cached catalog into the B3 repair (avoid re-reading 3.2k global players)

  const tournament = tournaments.find(t => t.id === tournamentId);
  const isClosed = tournament?.status === 'closed';

  const [activeDivision, setActiveDivision] = useState(null);
  const resolvedDivision = activeDivision || tournament?.divisions?.[0] || 'all';
  // § Stage D — search WITHIN the division-grouped team list (grouping kept).
  const [teamSearch, setTeamSearch] = useState('');

  // Per-team hide (shared key with CoachWide). Opt-in — empty by default, so the
  // full list shows until a coach hides something.
  const [hidden, setHidden] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'); } catch { return []; }
  });
  const [showHidden, setShowHidden] = useState(false);
  const persistHidden = (arr) => { setHidden(arr); try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(arr)); } catch { /* ignore */ } };
  const hideTeam = (id) => persistHidden(hidden.includes(id) ? hidden : [...hidden, id]);
  const unhideTeam = (id) => persistHidden(hidden.filter(x => x !== id));

  // Self-gated repair affordance for the 2026-05-15 import-shape bug (scouted
  // entries written with division=null vanish under the division filter).
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState(null);
  const runRepair = async () => {
    if (repairing || !tournamentId) return;
    setRepairing(true);
    setRepairResult(null);
    try {
      const report = await ds.repairScoutedDivisionsForTournament(tournamentId, tournament?.league);
      setRepairResult(report);
    } catch (e) {
      setRepairResult({ error: e.message });
    } finally {
      setRepairing(false);
    }
  };

  const records = useMemo(() => computeTeamRecords(matches, scouted), [matches, scouted]);

  const divisionScouted = useMemo(() => {
    const tournDivs = tournament?.divisions || [];
    const filtered = resolvedDivision === 'all'
      ? scouted
      // CRITICAL-BUG fix (2026-06-21): never HIDE a scouted team whose division is
      // null OR isn't one of THIS tournament's divisions. Such "unclassified-for-this-
      // tournament" teams show under every division tab instead of being lost.
      : scouted.filter(st => st.division === resolvedDivision || !st.division || !tournDivs.includes(st.division));
    return [...filtered].sort((a, b) => {
      const rA = records[a.id] || { wins: 0, losses: 0, played: 0 };
      const rB = records[b.id] || { wins: 0, losses: 0, played: 0 };
      if (rA.played !== rB.played) return rB.played - rA.played;
      if (rA.wins !== rB.wins) return rB.wins - rA.wins;
      return rA.losses - rB.losses;
    });
  }, [scouted, resolvedDivision, records, tournament?.divisions]);

  // Search filters WITHIN the active-division list (team name / extId). Hidden teams
  // drop out of the visible list into the "Ukryte · N" section below.
  const searchMatched = useMemo(() => {
    if (!teamSearch.trim()) return divisionScouted;
    return divisionScouted.filter(st => matchEntity(teamSearch, teams.find(t => t.id === st.teamId), ['name', 'externalId']));
  }, [divisionScouted, teamSearch, teams]);
  const visibleScouted = useMemo(() => searchMatched.filter(st => !hidden.includes(st.id)), [searchMatched, hidden]);
  const hiddenScouted = useMemo(() => searchMatched.filter(st => hidden.includes(st.id)), [searchMatched, hidden]);

  const filteredMatches = useMemo(() => (
    resolvedDivision === 'all'
      ? matches
      : matches.filter(m => m.division === resolvedDivision)
  ), [matches, resolvedDivision]);

  // Hook call MUST stay above the `!tournament` early return (React #310 fix).
  const liveCandidateIds = useMemo(
    () => filteredMatches.filter(m => m.status !== 'closed').map(m => m.id),
    [filteredMatches],
  );
  const liveScores = useLiveMatchScores(tournamentId, liveCandidateIds);

  const classify = (m) => classifyMatch(m, liveScores);

  const sortByNewest = (a, b) => {
    const ta = a.createdAt?.seconds ?? a.createdAt ?? 0;
    const tb = b.createdAt?.seconds ?? b.createdAt ?? 0;
    return tb - ta;
  };

  const live = filteredMatches.filter(m => classify(m) === 'live').sort(sortByNewest);
  const scheduled = filteredMatches.filter(m => classify(m) === 'scheduled').sort(sortByNewest);
  const completed = filteredMatches.filter(m => classify(m) === 'completed').sort(sortByNewest);

  const getTeamName = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    const tm = s ? teams.find(x => x.id === s.teamId) : null;
    return tm?.name || '?';
  };
  const getTeam = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    return s ? teams.find(x => x.id === s.teamId) || null : null;
  };

  // Premium team row — option-E team-color left-gradient identification (no square
  // logo), name + division sub, W-L pill, hide eyeoff. ONE touch target → drill-down.
  const TeamRow = ({ st, dim }) => {
    const gt = teams.find(g => g.id === st.teamId) || (st.name ? { id: st.teamId, name: st.name } : null);
    if (!gt) return null;
    const color = gt.color || COLORS.borderLight;
    const rec = records[st.id] || { wins: 0, losses: 0, played: 0 };
    const g0 = dim ? '1c' : '26';
    const g1 = dim ? '08' : '0a';
    return (
      <div
        onClick={() => navigate(`/tournament/${tournamentId}/team/${st.id}`)}
        style={{
          position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 14px', marginBottom: 9, minHeight: 56,
          background: `linear-gradient(90deg, ${color}${g0}, ${color}${g1} 30%, transparent 52%), ${ELEV.surface}`,
          border: `1px solid ${ELEV.hairline}`, borderRadius: 13, boxShadow: ELEV.shadow1, cursor: 'pointer',
        }}>
        <TeamBadge team={gt} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gt.name}</div>
          {st.division && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginTop: 2 }}>{st.division}</div>}
        </div>
        {rec.played > 0
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 9, padding: '5px 9px' }}>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.success, ...TNUM }}>{rec.wins}</span>
              <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted }}>–</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.danger, ...TNUM }}>{rec.losses}</span>
            </div>
          : <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.textDim, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 7, padding: '4px 8px', flexShrink: 0 }}>—</span>}
        {dim ? (
          <div className="rd-press" onClick={(e) => { e.stopPropagation(); unhideTeam(st.id); }} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '6px 11px', borderRadius: 9, background: `${COLORS.accent}1a`, border: `1px solid ${COLORS.accent}40`, color: COLORS.accent, cursor: 'pointer' }}>
            <RdIcon name="eye" size={14} />
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800 }}>{t('restore') || 'Przywróć'}</span>
          </div>
        ) : (
          <div className="rd-press" onClick={(e) => { e.stopPropagation(); hideTeam(st.id); }} title={t('hide_team') || 'Ukryj drużynę'} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, color: COLORS.textMuted, cursor: 'pointer' }}>
            <RdIcon name="eyeoff" size={15} />
          </div>
        )}
      </div>
    );
  };

  if (!tournament) return <Preloader loop />;

  return (
    <div style={{
      padding: SPACE.lg,
      paddingBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE.md,
    }}>
      {/* Division pill filter — shared premium DivisionTabs */}
      <DivisionTabs divisions={tournament.divisions} active={resolvedDivision} onChange={setActiveDivision} />

      {/* Premium standings table — net-new render on the ready computeTeamRecords
          data (W-L/diff/win%). Shows teams that have played; respects the active
          (lenient) division filter via divisionScouted. */}
      {(() => {
        const ranked = divisionScouted.filter(st => (records[st.id]?.played || 0) > 0);
        if (!ranked.length) return null;
        return (
          <div>
            <SectionTitle>{t('coach_standings_count', ranked.length)}</SectionTitle>
            <StandingsTable
              entries={ranked}
              records={records}
              resolveTeam={(st) => teams.find(g => g.id === st.teamId) || (st.name ? { id: st.teamId, name: st.name } : null)}
              onRow={(st) => navigate(`/tournament/${tournamentId}/team/${st.id}`)}
            />
          </div>
        );
      })()}

      {/* Teams — premium W-L cards with team-color identification + hide/restore */}
      <div>
        <SectionTitle>{t('coach_teams_count', divisionScouted.length)}</SectionTitle>
        {!loading && divisionScouted.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SearchField value={teamSearch} onChange={setTeamSearch} placeholder={t('b13_coach_search_team_ph')} />
          </div>
        )}
        {loading && <SkeletonList count={3} />}
        {!loading && divisionScouted.length === 0 && (
          <EmptyState icon="🏴" text={t('b13_no_teams_yet')} />
        )}
        {!loading && divisionScouted.length === 0 && scouted.length > 0 && (
          <div style={{
            marginTop: SPACE.sm, padding: SPACE.md,
            background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
            borderRadius: RADIUS.lg,
          }}>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, marginBottom: SPACE.sm }}>
              {t('coach_repair_no_filter_match', scouted.length)}
            </div>
            <Btn variant="accent" onClick={runRepair} disabled={repairing} style={{ width: '100%' }}>
              {repairing ? t('coach_repairing') : t('coach_repair_divisions')}
            </Btn>
            {repairResult && !repairResult.error && (
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginTop: SPACE.sm }}>
                {t('coach_repair_scanned')} {repairResult.scanned} · {t('coach_repair_updated')} {repairResult.updated} · {t('coach_repair_already_set')} {repairResult.alreadySet}
                {repairResult.skippedNoTeam ? ` · ${t('coach_repair_orphan')} ${repairResult.skippedNoTeam}` : ''}
                {repairResult.skippedNoDivision ? ` · ${t('coach_repair_no_division')} ${repairResult.skippedNoDivision}` : ''}
                {repairResult.failures?.length ? ` · ${t('coach_repair_failed')} ${repairResult.failures.length}` : ''}
              </div>
            )}
            {repairResult?.error && (
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger, marginTop: SPACE.sm }}>
                {t('coach_repair_error')}: {repairResult.error}
              </div>
            )}
          </div>
        )}
        {!loading && divisionScouted.length > 0 && visibleScouted.length === 0 && hiddenScouted.length === 0 && teamSearch.trim() && (
          <div style={{ padding: SPACE.md, fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>
            {t('coach_no_teams_match', teamSearch)}
          </div>
        )}

        {visibleScouted.map(st => <TeamRow key={st.id} st={st} />)}

        {/* Hidden teams — collapsible restore (shared with CoachWide) */}
        {hiddenScouted.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div className="rd-press" onClick={() => setShowHidden(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 12, cursor: 'pointer' }}>
              <span style={{ color: COLORS.textMuted, display: 'flex' }}><RdIcon name="eyeoff" size={15} /></span>
              <span style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.textDim, letterSpacing: TRACKING.label, textTransform: 'uppercase' }}>{t('hidden_label') || 'Ukryte'} · {hiddenScouted.length}</span>
              <span style={{ fontFamily: FONT, fontSize: 16, color: COLORS.textMuted, transform: showHidden ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
            </div>
            {showHidden && (
              <div style={{ marginTop: 8 }}>
                {hiddenScouted.map(st => <TeamRow key={st.id} st={st} dim />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coach Tactics board — contextual door (tournament's layout). */}
      {tournament?.layoutId && (
        <div style={{ marginBottom: SPACE.lg }}>
          <OpenTacticsAction layoutId={tournament.layoutId} variant="default" size="md"
            style={{ width: '100%', justifyContent: 'center' }} />
        </div>
      )}

      {/* Split-tap match list — grouped Live / Scheduled / Completed. */}
      <div>
        <SectionTitle>{t('coach_matches_count', filteredMatches.length)}</SectionTitle>

        {filteredMatches.length === 0 && (
          <EmptyState icon="⚔️" text={t('scout_tab_no_matches_yet')} />
        )}

        {live.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel color={COLORS.accent}>Live ({live.length})</SectionLabel>
            {live.map(m => (
              <MatchCard key={m.id} m={m} status="live" tournamentId={tournamentId}
                getTeamName={getTeamName} getTeam={getTeam} navigate={navigate} readOnly={isClosed}
                liveScore={liveScores[m.id]?.score || null} />
            ))}
          </div>
        )}

        {scheduled.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            {(live.length > 0 || completed.length > 0) && <SectionLabel>Scheduled ({scheduled.length})</SectionLabel>}
            {scheduled.map(m => (
              <MatchCard key={m.id} m={m} status="scheduled" tournamentId={tournamentId}
                getTeamName={getTeamName} getTeam={getTeam} navigate={navigate} readOnly={isClosed}
                liveScore={liveScores[m.id]?.score || null} />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel>Completed ({completed.length})</SectionLabel>
            {completed.map(m => (
              <MatchCard key={m.id} m={m} status="completed" tournamentId={tournamentId}
                getTeamName={getTeamName} getTeam={getTeam} navigate={navigate} readOnly={isClosed} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
