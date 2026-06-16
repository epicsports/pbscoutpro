import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, SectionTitle, SectionLabel, EmptyState, SkeletonList } from '../ui';
import SearchField from '../SearchField';
import { matchEntity } from '../../utils/entityFilters';
import MatchCard from '../MatchCard';
import TeamBadge from '../TeamBadge';
import { useTournaments, useActiveTeams, useScoutedTeams, useMatches, usePlayers } from '../../hooks/useFirestore';
import { useLiveMatchScores } from '../../hooks/useLiveMatchScores';
import { computeTeamRecords } from '../../utils/teamStats';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import * as ds from '../../services/dataService';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * CoachTabContent — teams with W-L on top, grouped match list below.
 * Extracted from TournamentPage coach mode (DESIGN_DECISIONS § 26 § 31).
 *
 * Team card design (§ 26): ONE touch target → ScoutedTeamPage. Just name + W-L.
 * No chevrons, no logos, no point diff, no win%. All detail on drill-down.
 *
 * Match list: split-tap MatchCard (shared with ScoutTabContent) so coach can
 * jump into scouting a specific side directly from Coach tab without a detour
 * through Scout tab. Grouped into Live / Scheduled / Completed matching the
 * pre-§ 31 TournamentPage behavior. Claim state (concurrent-scouting awareness)
 * + per-side "tap to scout" lives inside MatchCard.
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
  // B17 cleanup (2026-05-27): `isPractice` removed — `type:'practice'` was
  // a dead discriminator (0 prod docs per § 69 backfill).
  const isClosed = tournament?.status === 'closed';

  const [activeDivision, setActiveDivision] = useState(null);
  const resolvedDivision = activeDivision || tournament?.divisions?.[0] || 'all';
  // § Stage D — search WITHIN the division-grouped team list (grouping kept).
  const [teamSearch, setTeamSearch] = useState('');

  // Self-gated repair affordance for the 2026-05-15 import-shape bug.
  // ScheduleCSVImport (and OCR ScheduleImport before this fix) wrote scouted
  // entries with division=null, so divisionScouted filters them out and the
  // Teams list looks empty even though scouted docs exist. Visibility is
  // gated on the exact symptom shape — scouted has rows but none survive
  // the division filter — so the button vanishes the moment it succeeds.
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

  // § 83 B3 roster-repair UI RETIRED (B26 close, 2026-06-16) — its state/handler/toast
  // were removed with the render box (see the render-site note). The narrowing fn lives
  // on in dataService; the real fix is docs/briefs/CC_BRIEF_PLAYER_DEDUP.md.

  const records = useMemo(() => computeTeamRecords(matches, scouted), [matches, scouted]);

  const divisionScouted = useMemo(() => {
    const filtered = resolvedDivision === 'all'
      ? scouted
      : scouted.filter(st => st.division === resolvedDivision);
    return [...filtered].sort((a, b) => {
      const rA = records[a.id] || { wins: 0, losses: 0, played: 0 };
      const rB = records[b.id] || { wins: 0, losses: 0, played: 0 };
      if (rA.played !== rB.played) return rB.played - rA.played;
      if (rA.wins !== rB.wins) return rB.wins - rA.wins;
      return rA.losses - rB.losses;
    });
  }, [scouted, resolvedDivision, records]);

  // § Stage D — search filters WITHIN the active-division team list (by team
  // name / extId, resolved via membership). Division grouping stays the view.
  const visibleScouted = useMemo(() => {
    if (!teamSearch.trim()) return divisionScouted;
    return divisionScouted.filter(st => matchEntity(teamSearch, teams.find(t => t.id === st.teamId), ['name', 'externalId']));
  }, [divisionScouted, teamSearch, teams]);

  // Filter by division, then classify into Live / Scheduled / Completed so
  // MatchCard receives the right `status` and groups render under labels.
  const filteredMatches = useMemo(() => (
    resolvedDivision === 'all'
      ? matches
      : matches.filter(m => m.division === resolvedDivision)
  ), [matches, resolvedDivision]);

  // Subscribe to points for non-closed matches so cards show live scores
  // (parity with ScoutTabContent fix from 2026-04-24 P0 Fix 1; commit
  // 629edc8 explicitly noted CoachTabContent as a symmetry follow-up).
  // Hook call MUST stay above the `!tournament` early return (see the
  // React #310 crash fix in ScoutTabContent at commit 950ab79).
  const liveCandidateIds = useMemo(
    () => filteredMatches.filter(m => m.status !== 'closed').map(m => m.id),
    [filteredMatches],
  );
  const liveScores = useLiveMatchScores(tournamentId, liveCandidateIds);

  const classify = (m) => {
    if (m.status === 'closed') return 'completed';
    const live = liveScores[m.id];
    const liveCount = live?.count ?? 0;
    const cachedA = m.scoreA || 0;
    const cachedB = m.scoreB || 0;
    if (liveCount > 0 || cachedA > 0 || cachedB > 0) return 'live';
    return 'scheduled';
  };

  // Sort within each group by createdAt descending (newest first) as a safe
  // default — match docs carry createdAt timestamps from addMatch.
  const sortByNewest = (a, b) => {
    const ta = a.createdAt?.seconds ?? a.createdAt ?? 0;
    const tb = b.createdAt?.seconds ?? b.createdAt ?? 0;
    return tb - ta;
  };

  const live = filteredMatches.filter(m => classify(m) === 'live').sort(sortByNewest);
  const scheduled = filteredMatches.filter(m => classify(m) === 'scheduled').sort(sortByNewest);
  const completed = filteredMatches.filter(m => classify(m) === 'completed').sort(sortByNewest);

  // Resolver closure passed into MatchCard — it avoids fetching teams/scouted
  // again inside the card. Matches the pattern used by ScoutTabContent.
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

  if (!tournament) return <EmptyState icon="⏳" text={t('loading_default')} />;

  return (
    <div style={{
      padding: SPACE.lg,
      paddingBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE.md,
    }}>
      {/* Division pill filter */}
      {(tournament.divisions?.length > 0) && (
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

      {/* Teams (minimal W-L cards — § 26 keeps this deliberately sparse) */}
      <div>
        <SectionTitle>Teams ({divisionScouted.length})</SectionTitle>
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
            background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
            borderRadius: RADIUS.lg,
          }}>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, marginBottom: SPACE.sm }}>
              {scouted.length} scouted entries exist but none match the current division filter — likely missing the division field from a past schedule import.
            </div>
            <Btn variant="accent" onClick={runRepair} disabled={repairing} style={{ width: '100%' }}>
              {repairing ? 'Repairing…' : 'Repair scouted divisions'}
            </Btn>
            {repairResult && !repairResult.error && (
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginTop: SPACE.sm }}>
                Scanned {repairResult.scanned} · updated {repairResult.updated} · already set {repairResult.alreadySet}
                {repairResult.skippedNoTeam ? ` · orphan ${repairResult.skippedNoTeam}` : ''}
                {repairResult.skippedNoDivision ? ` · team has no division ${repairResult.skippedNoDivision}` : ''}
                {repairResult.failures?.length ? ` · failed ${repairResult.failures.length}` : ''}
              </div>
            )}
            {repairResult?.error && (
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger, marginTop: SPACE.sm }}>
                Error: {repairResult.error}
              </div>
            )}
          </div>
        )}
        {/* § 83 B3 roster-repair box RETIRED (B26 close, 2026-06-16). It permanently
            occupied the super-admin coach screen, couldn't reliably self-collapse, and —
            per the 2026-06-16 investigation — MISFRAMED the real problem: scouted-roster
            "duplicates" are a player-IDENTITY issue (pbliId-as-primary-key dedup), not
            roster narrowing. The narrowing fn (repairScoutedRostersForTournament) stays in
            dataService (non-destructive, e2e-covered) for dev/admin use. Real work:
            docs/briefs/CC_BRIEF_PLAYER_DEDUP.md. */}
        {!loading && divisionScouted.length > 0 && visibleScouted.length === 0 && (
          <div style={{ padding: SPACE.md, fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>
            No teams match “{teamSearch}”.
          </div>
        )}
        {visibleScouted.map(st => {
          const gt = teams.find(g => g.id === st.teamId);
          if (!gt) return null;
          const rec = records[st.id] || { wins: 0, losses: 0, played: 0 };
          return (
            <div key={st.id}
              onClick={() => navigate(`/tournament/${tournamentId}/team/${st.id}`)}
              style={{
                background: COLORS.surfaceDark,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADIUS.lg,
                marginBottom: 4,
                cursor: 'pointer',
                transition: 'background .12s',
                minHeight: 52,
              }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                padding: '14px 16px', gap: 12,
              }}>
                <TeamBadge team={gt} size={32} />
                <span style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600,
                  color: COLORS.text, flex: 1, letterSpacing: '-.1px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{gt.name}</span>
                {rec.played > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: FONT, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    <span style={{ color: COLORS.success }}>{rec.wins}W</span>
                    <span style={{ color: COLORS.surfaceLight }}>·</span>
                    <span style={{ color: COLORS.danger }}>{rec.losses}L</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Split-tap match list — grouped Live / Scheduled / Completed with
          amber label on Live group, mirrors ScoutTabContent for consistency. */}
      <div>
        <SectionTitle>Matches ({filteredMatches.length})</SectionTitle>

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

      {/* B3 roster-repair toast removed with the box (B26 close, 2026-06-16). */}
    </div>
  );
}
