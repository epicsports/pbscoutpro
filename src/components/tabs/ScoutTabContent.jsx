import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Select } from '../ui';
import ScheduleImport from '../ScheduleImport';
import { useTeams, useScoutedTeams, useMatches, usePlayers } from '../../hooks/useFirestore';
import { useTournaments } from '../../hooks/useFirestore';
import { useWorkspace } from '../../hooks/useWorkspace';
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
  const { workspace } = useWorkspace();
  const isViewer = workspace?.role === 'viewer';

  const tournament = tournaments.find(t => t.id === tournamentId);
  const isPractice = tournament?.type === 'practice';
  const isClosed = tournament?.status === 'closed';

  const [activeDivision, setActiveDivision] = useState(null);
  const resolvedDivision = activeDivision || tournament?.divisions?.[0] || 'all';

  const [addMatchModal, setAddMatchModal] = useState(false);
  const [matchTeamA, setMatchTeamA] = useState('');
  const [matchTeamB, setMatchTeamB] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const divisionScouted = useMemo(() => {
    return resolvedDivision === 'all'
      ? scouted
      : scouted.filter(st => st.division === resolvedDivision);
  }, [scouted, resolvedDivision]);

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
              <div style={{ display: 'flex', gap: SPACE.sm, justifyContent: 'center', marginTop: SPACE.md }}>
                <Btn variant="default" onClick={() => setScheduleOpen(true)}>Import schedule</Btn>
              </div>
            )}
          </div>
        )}

        {live.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel color={COLORS.accent}>Live ({live.length})</SectionLabel>
            {live.map(m => (
              <MatchCard key={m.id} m={m} status="live" tournamentId={tournamentId} getTeamName={getTeamName} navigate={navigate} />
            ))}
          </div>
        )}

        {scheduled.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            {(live.length > 0 || completed.length > 0) && <SectionLabel>Scheduled ({scheduled.length})</SectionLabel>}
            {scheduled.map(m => (
              <MatchCard key={m.id} m={m} status="scheduled" tournamentId={tournamentId} getTeamName={getTeamName} navigate={navigate} />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel>Completed ({completed.length})</SectionLabel>
            {completed.map(m => (
              <MatchCard key={m.id} m={m} status="completed" tournamentId={tournamentId} getTeamName={getTeamName} navigate={navigate} />
            ))}
          </div>
        )}
      </div>

      {/* Add match button — primary action */}
      {scouted[0] && !isClosed && !isViewer && (
        <div
          onClick={() => setAddMatchModal(true)}
          style={{
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

      <ScheduleImport open={scheduleOpen} onClose={() => setScheduleOpen(false)}
        tournament={tournament} teams={teams} scouted={scouted} players={players}
        ds={ds} tournamentId={tournamentId} />
    </div>
  );
}

// ─── Split-tap match card (extracted from TournamentPage) ───
function MatchCard({ m, status, tournamentId, getTeamName, navigate }) {
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
          tap to scout
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
