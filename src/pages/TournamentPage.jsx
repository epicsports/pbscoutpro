import React, { useState, useEffect, useMemo } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';

import ScheduleImport from '../components/ScheduleImport';
import PageHeader from '../components/PageHeader';
import { Btn, Card, SectionTitle, SectionLabel, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, YearBadge, ConfirmModal, ActionSheet, MoreBtn, ResultBadge, Score } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePlayers, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS, responsive } from '../utils/theme';
import { useWorkspace } from '../hooks/useWorkspace';
import { yearOptions } from '../utils/helpers';
import { useField } from '../hooks/useField';
import { computeTeamRecords } from '../utils/teamStats';
import { auth } from '../services/firebase';

export default function TournamentPage() {
  const device = useDevice();
  const R = responsive(device.type);
    const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted, loading } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { layouts } = useLayouts();
  const [deleteModal, setDeleteModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [eName, setEName] = useState('');
  const [eLeague, setELeague] = useState('');
  const [eYear, setEYear] = useState('');
  const [eDivisions, setEDivisions] = useState([]);
  const [eLayoutId, setELayoutId] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [activeDivision, setActiveDivision] = useState(null);
  const [hiddenTeams, setHiddenTeams] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`hidden_${tournamentId}`) || '[]'); } catch { return []; }
  });
  const [observedTeams, setObservedTeams] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`observed_${tournamentId}`) || '[]'); } catch { return []; }
  });
  const toggleObserve = (scoutedId) => {
    setObservedTeams(prev => {
      const next = prev.includes(scoutedId) ? prev.filter(id => id !== scoutedId) : [...prev, scoutedId];
      localStorage.setItem(`observed_${tournamentId}`, JSON.stringify(next));
      return next;
    });
  };
  const [showAvailable, setShowAvailable] = useState(false);
  const [teamsCollapsed, setTeamsCollapsed] = useState(() => {
    // Default collapsed — scouts rarely need teams/settings/layout on this page
    try {
      const stored = localStorage.getItem(`teamsCollapsed_${tournamentId}`);
      return stored === null ? true : stored === '1';
    } catch { return true; }
  });
  const toggleTeamsCollapsed = () => {
    setTeamsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(`teamsCollapsed_${tournamentId}`, next ? '1' : '0');
      return next;
    });
  };
  // Scout/coach mode toggle — swaps content priority per DESIGN_DECISIONS § 26.
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(`tournamentMode_${tournamentId}`) || 'scout'; }
    catch { return 'scout'; }
  });
  const toggleMode = (m) => {
    setMode(m);
    try { localStorage.setItem(`tournamentMode_${tournamentId}`, m); } catch {}
  };
  const [deleteMatchModal, setDeleteMatchModal] = useState(null); // { id, name }
  const [actionMenu, setActionMenu] = useState(null); // { type, data }
  const [addMatchModal, setAddMatchModal] = useState(false);
  const [matchTeamA, setMatchTeamA] = useState('');
  const [matchTeamB, setMatchTeamB] = useState('');
  const [deleteMatchPassword, setDeleteMatchPassword] = useState('');
  const [deleteTournamentModal, setDeleteTournamentModal] = useState(false);
  const [deleteTournamentPassword, setDeleteTournamentPassword] = useState('');
  const [closeTournamentModal, setCloseTournamentModal] = useState(false);
  const [closeTournamentPassword, setCloseTournamentPassword] = useState('');
  const [pointCounts, setPointCounts] = useState({});
  const { workspace } = useWorkspace();
  const isViewer = workspace?.role === 'viewer';

  // Compute W-L records from already-loaded match data (zero queries)
  const records = useMemo(() => computeTeamRecords(matches, scouted), [matches, scouted]);

  // Fetch point counts once per tournament — lightweight n=X badge on cards
  useEffect(() => {
    if (!matches.length || !scouted.length) return;
    ds.fetchScoutedPointCounts(tournamentId, matches, scouted)
      .then(setPointCounts)
      .catch(() => {});
  }, [matches.length, scouted.length, tournamentId]);

  const toggleHide = (scoutedId) => {
    const next = hiddenTeams.includes(scoutedId) ? hiddenTeams.filter(id => id !== scoutedId) : [...hiddenTeams, scoutedId];
    setHiddenTeams(next);
    localStorage.setItem(`hidden_${tournamentId}`, JSON.stringify(next));
  };

  const tournament = tournaments.find(t => t.id === tournamentId);
  const field = useField(tournament, layouts); // must be before any early return (Rules of Hooks)

  if (!tournament) return <EmptyState icon="⏳" text="Loading..." />;
  const isPractice = tournament.type === 'practice';
  const isClosed = tournament.status === 'closed';
  const resolvedDivision = activeDivision || tournament.divisions?.[0] || 'all';
  const linkedLayout = field.layout;
  const alreadyIds = scouted.map(s => s.teamId);
  const available = teams.filter(t => {
    if (alreadyIds.includes(t.id)) return false;
    if (!isPractice && !(t.leagues || []).includes(tournament.league)) return false;
    return true;
  });
  const sortedAvailable = (() => {
    const parents = available.filter(t => !t.parentTeamId);
    const children = available.filter(t => !!t.parentTeamId);
    const result = [];
    parents.forEach(p => {
      result.push(p);
      children.filter(c => c.parentTeamId === p.id).forEach(c => {
        result.push({ ...c, _isChild: true });
      });
    });
    children.filter(c => !parents.find(p => p.id === c.parentTeamId)).forEach(c => {
      result.push({ ...c, _isChild: true });
    });
    return result;
  })();
  const filteredAvailable = resolvedDivision === 'all'
    ? sortedAvailable
    : sortedAvailable.filter(t => {
        const teamDiv = t.divisions?.[tournament.league];
        if (teamDiv === resolvedDivision) return true;
        // Child teams: also match if parent has the right division
        if (t.parentTeamId) {
          const parent = teams.find(p => p.id === t.parentTeamId);
          if (parent?.divisions?.[tournament.league] === resolvedDivision) return true;
        }
        return false;
      });

  const handleAddScouted = async (teamId) => {
    const team = teams.find(t => t.id === teamId);
    let teamRoster;
    if (isPractice) {
      const childIds = teams.filter(t => t.parentTeamId === teamId).map(t => t.id);
      teamRoster = players.filter(p => [teamId, ...childIds].includes(p.teamId)).map(p => p.id);
    } else {
      teamRoster = players.filter(p => p.teamId === teamId).map(p => p.id);
    }
    const teamDivision = team?.divisions?.[tournament.league] || null;
    const division = isPractice ? null : (teamDivision || (resolvedDivision !== 'all' ? resolvedDivision : null));
    await ds.addScoutedTeam(tournamentId, { teamId, roster: teamRoster, division });
  };

  const handleRemoveScouted = async (sid) => { await ds.removeScoutedTeam(tournamentId, sid); setDeleteModal(null); };

  const openEdit = () => { setEName(tournament.name); setELeague(tournament.league); setEYear(tournament.year || 2026); setEDivisions(tournament.divisions || []); setELayoutId(tournament.layoutId || ''); setEditModal(true); };
  const handleSaveEdit = async () => { await ds.updateTournament(tournamentId, { name: eName.trim(), league: eLeague, year: Number(eYear), divisions: eDivisions, layoutId: eLayoutId || null }); setEditModal(false); };

  // Resolve team names for matches
  const getTeamName = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    const t = s ? teams.find(x => x.id === s.teamId) : null;
    return t?.name || '?';
  };

  const divisionScoutedUnsorted = resolvedDivision === 'all'
    ? scouted.filter(st => !hiddenTeams.includes(st.id))
    : scouted.filter(st => !hiddenTeams.includes(st.id) && st.division === resolvedDivision);
  // Sort teams by record: played desc → wins desc → losses asc (§ 26 spec).
  const divisionScouted = [...divisionScoutedUnsorted].sort((a, b) => {
    const rA = records[a.id] || { wins: 0, losses: 0, played: 0 };
    const rB = records[b.id] || { wins: 0, losses: 0, played: 0 };
    if (rA.played !== rB.played) return rB.played - rA.played;
    if (rA.wins !== rB.wins) return rB.wins - rA.wins;
    return rA.losses - rB.losses;
  });

  const handleAddMatch = async () => {
    if (!matchTeamA || !matchTeamB || matchTeamA === matchTeamB) return;
    const tA = scouted.find(s => s.id === matchTeamA);
    const tB = scouted.find(s => s.id === matchTeamB);
    const teamAObj = tA ? teams.find(t => t.id === tA.teamId) : null;
    const teamBObj = tB ? teams.find(t => t.id === tB.teamId) : null;
    const ref = await ds.addMatch(tournamentId, {
      teamA: matchTeamA,
      teamB: matchTeamB,
      name: `${teamAObj?.name || '?'} vs ${teamBObj?.name || '?'}`,
      division: tA?.division || resolvedDivision || null,
    });
    setAddMatchModal(false);
    setMatchTeamA('');
    setMatchTeamB('');
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ COMPACT HEADER: back + title + badges + edit ═══ */}
      <PageHeader
        back={{ to: '/' }}
        title={tournament.name}
        subtitle={isPractice ? 'PRACTICE SESSION' : `TOURNAMENT${tournament.divisions?.[0] ? ' · ' + tournament.divisions[0] : ''}`}
        badges={isPractice
          ? <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, padding: '1px 6px', borderRadius: RADIUS.xs, background: COLORS.accent + '20', color: COLORS.accent }}>Practice</span>
          : <><LeagueBadge league={tournament.league} /> <YearBadge year={tournament.year} />
            {isClosed && <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: RADIUS.xs, background: COLORS.textMuted + '30', color: COLORS.textMuted, marginLeft: 4 }}>CLOSED</span>}
          </>}
        action={!isViewer ? <Btn variant="ghost" size="sm" onClick={openEdit}><Icons.Edit /></Btn> : null}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: R.layout.gap }}>

        {/* Closed tournament banner */}
        {isClosed && (
          <div style={{
            padding: `${SPACE.lg}px`, borderRadius: RADIUS.lg,
            background: COLORS.textMuted + '10', border: `1px solid ${COLORS.textMuted}30`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🔒</div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.textMuted }}>Tournament closed</div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginTop: 4 }}>
              Data is read-only. Reopen from the edit menu to make changes.
            </div>
          </div>
        )}

        {/* Division pill filter */}
        {!isPractice && (tournament.divisions?.length > 0) && (
          <div style={{
            display: 'flex', background: COLORS.surface, borderRadius: RADIUS.lg,
            border: `1px solid ${COLORS.border}`, padding: 3, flexShrink: 0,
          }}>
            {tournament.divisions.map(d => (
              <div key={d} onClick={() => setActiveDivision(d)}
                style={{
                  flex: 1, padding: `${SPACE.sm}px ${SPACE.xs}px`, borderRadius: RADIUS.md,
                  fontSize: FONT_SIZE.sm, fontWeight: 600, fontFamily: FONT,
                  cursor: 'pointer', textAlign: 'center',
                  color: resolvedDivision === d ? COLORS.accent : COLORS.textMuted,
                  background: resolvedDivision === d ? COLORS.surfaceLight : 'transparent',
                  transition: 'all 0.12s',
                }}>
                {d}
              </div>
            ))}
          </div>
        )}

        {/* ═══ SCOUT / COACH MODE TOGGLE (§ 26) ═══ */}
        <div style={{
          display: 'flex',
          background: COLORS.surfaceDark, borderRadius: RADIUS.md,
          padding: 3, border: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}>
          {['scout', 'coach'].map(m => {
            const active = mode === m;
            return (
              <div key={m} onClick={() => toggleMode(m)} style={{
                flex: 1, padding: '8px 0', textAlign: 'center',
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, letterSpacing: '.2px',
                borderRadius: RADIUS.sm, cursor: 'pointer',
                background: active ? COLORS.surface : 'transparent',
                color: active ? COLORS.text : COLORS.textMuted,
                boxShadow: active ? '0 1px 4px #00000025' : 'none',
                textTransform: 'capitalize',
                transition: 'all .2s',
              }}>
                {m}
              </div>
            );
          })}
        </div>

        {/* ═══ COACH MODE: Teams on top — minimal W-L cards ═══ */}
        {mode === 'coach' && (
          <div>
            <SectionTitle>Teams ({divisionScouted.length})</SectionTitle>
            {loading && <SkeletonList count={3} />}
            {!loading && divisionScouted.length === 0 && (
              <EmptyState icon="🏴" text="No teams yet" />
            )}
            {divisionScouted.map(st => {
              const gt = teams.find(g => g.id === st.teamId);
              if (!gt) return null;
              const rec = records[st.id] || { wins: 0, losses: 0, played: 0 };
              return (
                <div key={st.id}
                  onClick={() => navigate('/tournament/' + tournamentId + '/team/' + st.id)}
                  style={{
                    background: COLORS.surfaceDark,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: RADIUS.lg,
                    marginBottom: 4,
                    cursor: 'pointer',
                    transition: 'background .12s',
                  }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    padding: '14px 16px', gap: 12,
                  }}>
                    <span style={{
                      fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600,
                      color: COLORS.text, flex: 1, letterSpacing: '-.1px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{gt.name}</span>
                    {rec.played > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: FONT, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        <span style={{ color: COLORS.success }}>{rec.wins}W</span>
                        <span style={{ color: '#1e293b' }}>·</span>
                        <span style={{ color: COLORS.danger }}>{rec.losses}L</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ MATCHES — split-tap cards ═══ */}
        {(() => {
          const filtered = resolvedDivision === 'all' ? matches : matches.filter(m => m.division === resolvedDivision);
          const classify = (m) => {
            const hasScore = (m.scoreA || 0) > 0 || (m.scoreB || 0) > 0;
            if (m.status === 'closed') return 'completed';
            if (hasScore) return 'live';
            return 'scheduled';
          };
          const live = filtered.filter(m => classify(m) === 'live');
          const scheduled = filtered.filter(m => classify(m) === 'scheduled');
          const completed = filtered.filter(m => classify(m) === 'completed');
          const currentUid = auth.currentUser?.uid || null;
          const STALE_MS = 10 * 60 * 1000;
          const isClaimActive = (uid, ts) => !!uid && (!ts || Date.now() - ts <= STALE_MS);

          const MatchCard = ({ m, status }) => {
            const sA = m.scoreA || 0, sB = m.scoreB || 0;
            const hasScore = sA > 0 || sB > 0;
            const tA = getTeamName(m.teamA), tB = getTeamName(m.teamB);
            const isScheduled = status === 'scheduled';
            const isLive = status === 'live';
            const isCompleted = status === 'completed';

            // Claim state per side — blocked only if claimed by someone else and not stale.
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
                  fontFamily: FONT, fontSize: 15, fontWeight: 600, color: '#e2e8f0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {teamName}
                </div>
                {isCompleted ? (
                  <div style={{
                    fontFamily: FONT, fontSize: 9, fontWeight: 700, marginTop: 3, letterSpacing: '.3px',
                    color: won ? '#22c55e' : (lost ? '#ef4444' : '#475569'),
                  }}>
                    {won ? 'W' : lost ? 'L' : '—'}
                  </div>
                ) : blocked ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4, marginTop: 3,
                    justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: 3, background: '#22c55e' }} />
                    <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500, color: '#475569' }}>Scout</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500, color: '#475569', marginTop: 3 }}>
                    tap to scout
                  </div>
                )}
              </div>
            );

            return (
              <div style={{
                display: 'flex',
                marginBottom: SPACE.xs,
                background: '#0f172a',
                border: `1px solid ${isLive ? '#f59e0b15' : '#1a2234'}`,
                borderRadius: 12,
                overflow: 'hidden',
                opacity: isCompleted ? 0.5 : 1,
                minHeight: 62,
              }}>
                <TeamZone scoutedId={m.teamA} teamName={tA} blocked={homeBlocked} won={winnerA} lost={winnerB} align="left" />
                <div style={{ width: 1, background: '#1e293b' }} />

                {/* Center score zone — tap to review */}
                <div onClick={handleReview}
                  style={{
                    flex: '0 0 auto', minWidth: 82,
                    padding: '10px 12px',
                    background: '#0b1120',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {hasScore ? (
                    <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>
                      {sA}<span style={{ color: '#64748b' }}>:</span>{sB}
                    </div>
                  ) : (
                    <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: '#334155', lineHeight: 1 }}>
                      —<span style={{ color: '#64748b' }}>:</span>—
                    </div>
                  )}
                  {isLive && (
                    <div style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, color: '#f59e0b', marginTop: 4, letterSpacing: '.5px' }}>LIVE</div>
                  )}
                  {isCompleted && (
                    <div style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, color: '#64748b', marginTop: 4, letterSpacing: '.5px' }}>FINAL</div>
                  )}
                  {isScheduled && (m.date || m.time) && (
                    <div style={{ fontFamily: FONT, fontSize: 8, fontWeight: 600, color: '#475569', marginTop: 4 }}>
                      {[m.date, m.time].filter(Boolean).join(' ')}
                    </div>
                  )}
                </div>

                <div style={{ width: 1, background: '#1e293b' }} />
                <TeamZone scoutedId={m.teamB} teamName={tB} blocked={awayBlocked} won={winnerB} lost={winnerA} align="right" />
              </div>
            );
          };

          return (
            <div>
              <SectionTitle right={
                scouted[0] && !isClosed && !isViewer ? <span onClick={() => setAddMatchModal(true)}
                  style={{ fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.accent, cursor: 'pointer' }}>
                  + Add
                </span> : null
              }>Matches ({filtered.length})</SectionTitle>

              {/* Empty state — import only visible here */}
              {!filtered.length && (
                <div style={{ textAlign: 'center', padding: SPACE.xl }}>
                  <EmptyState icon="⚔️" text="No matches yet" />
                  <div style={{ display: 'flex', gap: SPACE.sm, justifyContent: 'center', marginTop: SPACE.md }}>
                    <Btn variant="default" onClick={() => setScheduleOpen(true)}>Import schedule</Btn>
                  </div>
                </div>
              )}

              {/* Live */}
              {live.length > 0 && (
                <div style={{ marginBottom: SPACE.sm }}>
                  <SectionLabel color={COLORS.accent}>Live ({live.length})</SectionLabel>
                  {live.map(m => <MatchCard key={m.id} m={m} status="live" />)}
                </div>
              )}

              {/* Scheduled */}
              {scheduled.length > 0 && (
                <div style={{ marginBottom: SPACE.sm }}>
                  {(live.length > 0 || completed.length > 0) && <SectionLabel>Scheduled ({scheduled.length})</SectionLabel>}
                  {scheduled.map(m => <MatchCard key={m.id} m={m} status="scheduled" />)}
                </div>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <div style={{ marginBottom: SPACE.sm }}>
                  <SectionLabel>Completed ({completed.length})</SectionLabel>
                  {completed.map(m => <MatchCard key={m.id} m={m} status="completed" />)}
                </div>
              )}
            </div>
          );
        })()}

        {/* Collapsed footer — scout: Teams · Settings · Layout; coach: Settings · Layout */}
        <div>
          <div onClick={toggleTeamsCollapsed} style={{
            cursor: 'pointer',
            borderTop: `1px solid #1a2234`,
            paddingTop: SPACE.md,
            marginTop: SPACE.md,
            textAlign: 'center',
          }}>
            <span style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 500,
              color: '#475569', letterSpacing: '.3px',
            }}>
              {mode === 'scout' ? 'Teams · Settings · Layout' : 'Settings · Layout'} {teamsCollapsed ? '▾' : '▴'}
            </span>
          </div>

          {!teamsCollapsed && mode === 'scout' && loading && <SkeletonList count={3} />}

          {/* Scout mode: minimal team cards inside collapsed section */}
          {!teamsCollapsed && mode === 'scout' && divisionScouted.map(st => {
            const gt = teams.find(g => g.id === st.teamId);
            if (!gt) return null;
            const rec = records[st.id] || { wins: 0, losses: 0, played: 0 };
            return (
              <div key={st.id}
                onClick={() => navigate('/tournament/' + tournamentId + '/team/' + st.id)}
                style={{
                  background: COLORS.surfaceDark,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.lg,
                  marginBottom: 4,
                  cursor: 'pointer',
                  transition: 'background .12s',
                }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: '14px 16px', gap: 12,
                }}>
                  <span style={{
                    fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600,
                    color: COLORS.text, flex: 1, letterSpacing: '-.1px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{gt.name}</span>
                  {rec.played > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontFamily: FONT, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      <span style={{ color: COLORS.success }}>{rec.wins}W</span>
                      <span style={{ color: '#1e293b' }}>·</span>
                      <span style={{ color: COLORS.danger }}>{rec.losses}L</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Hidden teams */}
          {!teamsCollapsed && showHidden && hiddenTeams.length > 0 && (
            <div style={{ marginTop: 8, padding: 8, background: COLORS.surfaceLight, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Hidden teams:</div>
              {scouted.filter(st => hiddenTeams.includes(st.id)).map(st => {
                const gt = teams.find(g => g.id === st.teamId);
                return gt ? (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, flex: 1 }}>{gt.name}</span>
                    <Btn variant="ghost" size="sm" onClick={() => toggleHide(st.id)}>Show</Btn>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {!teamsCollapsed && filteredAvailable.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {scouted.length > 0 ? (
                <Btn variant="ghost" size="sm" onClick={() => setShowAvailable(!showAvailable)}>
                  {showAvailable ? '▼' : '▶'} Add team ({filteredAvailable.length})
                </Btn>
              ) : (
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Add:</div>
              )}
              {(showAvailable || !scouted.length) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {filteredAvailable.slice(0, 20).map(t => {
                    const teamDiv = t.divisions?.[tournament.league];
                    return (
                      <Btn key={t.id} variant="default" size="sm" onClick={() => handleAddScouted(t.id)}
                        style={t._isChild ? { marginLeft: 16, fontSize: TOUCH.fontXs, borderStyle: 'dashed' } : {}}>
                        <Icons.Plus /> {t._isChild ? '↳ ' : ''}{t.name}
                        {teamDiv && <span style={{ fontSize: FONT_SIZE.xxs, color: COLORS.textDim, marginLeft: SPACE.xs }}>({teamDiv})</span>}
                      </Btn>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Sticky Add match */}
      {!isClosed && !isViewer && (
      <div style={{ position: 'sticky', bottom: 0, padding: `${SPACE.sm}px ${SPACE.lg}px`, background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, zIndex: 20, display: 'flex', gap: SPACE.sm }}>
        <Btn variant="accent" onClick={() => setAddMatchModal(true)}
          style={{ flex: 1, justifyContent: 'center', minHeight: 52, fontSize: FONT_SIZE.lg, fontWeight: 800 }}>
          <Icons.Plus /> Add match
        </Btn>
        <Btn variant="default" onClick={() => setScheduleOpen(true)}
          style={{ minHeight: 52, padding: '0 16px', fontSize: FONT_SIZE.sm, fontWeight: 600 }}>
          Import
        </Btn>
      </div>
      )}

      <ConfirmModal open={!!deleteMatchModal} onClose={() => { setDeleteMatchModal(null); setDeleteMatchPassword(''); }}
        title="Delete match?" danger confirmLabel="Delete"
        message={`Delete ${deleteMatchModal?.name || ''}? All scouted points and data for this match will be permanently lost.`}
        requirePassword={workspace?.slug}
        password={deleteMatchPassword} onPasswordChange={setDeleteMatchPassword}
        onConfirm={async () => { await ds.deleteMatch(tournamentId, deleteMatchModal.id); setDeleteMatchModal(null); setDeleteMatchPassword(''); }} />

      <ScheduleImport open={scheduleOpen} onClose={() => setScheduleOpen(false)}
        tournament={tournament} teams={teams} scouted={scouted} players={players}
        ds={ds} tournamentId={tournamentId} />

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit tournament"
        footer={<>
          <Btn variant="ghost" size="sm" onClick={() => { setEditModal(false); setDeleteTournamentModal(true); }}
            style={{ color: COLORS.danger, marginRight: 'auto' }}>
            <Icons.Trash /> Delete
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => { setEditModal(false); setCloseTournamentModal(true); }}
            style={{ color: isClosed ? COLORS.success : COLORS.accent }}>
            {isClosed ? '🔓 Reopen' : '🔒 Close'}
          </Btn>
          <Btn variant="default" onClick={() => setEditModal(false)}>Cancel</Btn>
          {!isClosed && <Btn variant="accent" onClick={handleSaveEdit} disabled={!eName.trim()}><Icons.Check /> Save</Btn>}
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={eName} onChange={setEName} placeholder="Tournament name" autoFocus />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>League</div>
              <div style={{ display: 'flex', gap: 6 }}>{LEAGUES.map(l => (<Btn key={l} variant="default" size="sm" active={eLeague===l} style={{ borderColor: eLeague===l?LEAGUE_COLORS[l]:COLORS.border, color: eLeague===l?LEAGUE_COLORS[l]:COLORS.textDim }} onClick={() => { setELeague(l); setEDivisions(prev => prev.filter(d => (DIVISIONS[l] || []).includes(d))); }}>{l}</Btn>))}</div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Year</div>
              <Select value={eYear} onChange={v => setEYear(Number(v))}>{yearOptions().map(y => <option key={y} value={y}>{y}</option>)}</Select>
            </div>
          </div>
          {/* Divisions — toggle from DIVISIONS[league] */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Divisions</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(DIVISIONS[eLeague] || []).map(d => {
                const active = eDivisions.includes(d);
                return (
                  <Btn key={d} variant="default" size="sm" active={active}
                    onClick={() => {
                      if (active) setEDivisions(prev => prev.filter(x => x !== d));
                      else setEDivisions(prev => [...prev, d]);
                    }}
                    style={{ fontSize: FONT_SIZE.xs, minHeight: 36 }}>
                    {d}
                  </Btn>
                );
              })}
            </div>
          </div>
          {/* Layout */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Layout</div>
            <Select value={eLayoutId} onChange={setELayoutId} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
              <option value="">— no layout —</option>
              {layouts.filter(l => l.league === eLeague || eLeague === 'NXL' || l.league === 'NXL').map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.league} {l.year})</option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={deleteTournamentModal} onClose={() => { setDeleteTournamentModal(false); setDeleteTournamentPassword(''); }}
        title="Delete tournament?" danger confirmLabel="Delete"
        message={`Delete "${tournament.name}"? All matches, scouted teams, and points will be permanently lost.`}
        requirePassword={workspace?.slug}
        password={deleteTournamentPassword} onPasswordChange={setDeleteTournamentPassword}
        onConfirm={async () => { await ds.deleteTournament(tournamentId); navigate('/'); }} />

      <ConfirmModal open={closeTournamentModal} onClose={() => { setCloseTournamentModal(false); setCloseTournamentPassword(''); }}
        title={isClosed ? 'Reopen tournament?' : 'Close tournament?'}
        message={isClosed
          ? `Reopen "${tournament.name}"? Matches and points can be added and edited again.`
          : `Close "${tournament.name}"? No matches, points, or teams can be added or edited. You can reopen later.`}
        confirmLabel={isClosed ? 'Reopen' : 'Close'} danger={!isClosed}
        requirePassword={workspace?.slug}
        password={closeTournamentPassword} onPasswordChange={setCloseTournamentPassword}
        onConfirm={async () => {
          await ds.updateTournament(tournamentId, { status: isClosed ? 'open' : 'closed' });
          setCloseTournamentModal(false); setCloseTournamentPassword('');
        }} />

            <ConfirmModal open={!!deleteModal} onClose={() => setDeleteModal(null)}
        title="Remove team?" danger confirmLabel="Remove"
        message={`Remove ${deleteModal?.name || ''} from this tournament? All scouted data, match assignments and points for this team will be permanently lost.`}
        onConfirm={() => handleRemoveScouted(deleteModal?.id)} />

      {/* Action sheet */}
      <ActionSheet open={!!actionMenu} onClose={() => setActionMenu(null)} actions={
        actionMenu?.type === 'team' ? [
          { label: 'View team', onPress: () => navigate('/tournament/' + tournamentId + '/team/' + actionMenu.id) },
          { label: observedTeams.includes(actionMenu.id) ? 'Stop observing' : 'Observe team', onPress: () => toggleObserve(actionMenu.id) },
          { label: 'Hide from list', onPress: () => toggleHide(actionMenu.id) },
          { separator: true },
          { label: 'Remove from tournament', danger: true, onPress: () => setDeleteModal({ id: actionMenu.id, name: actionMenu.name }) },
        ] : actionMenu?.type === 'match' ? [
          { label: 'View details', onPress: () => navigate('/tournament/' + tournamentId + '/match/' + actionMenu.id) },
          { separator: true },
          { label: 'Delete match', danger: true, onPress: () => { setDeleteMatchModal({ id: actionMenu.id, name: actionMenu.name }); setDeleteMatchPassword(''); } },
        ] : []
      } />

      {/* New match modal */}
      <Modal open={addMatchModal} onClose={() => setAddMatchModal(false)} title="New match"
        footer={<>
          <Btn variant="default" onClick={() => setAddMatchModal(false)}>Cancel</Btn>
          <Btn variant="accent" onClick={handleAddMatch}
            disabled={!matchTeamA || !matchTeamB || matchTeamA === matchTeamB}>
            <Icons.Check /> Create
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

    </div>
  );
}
