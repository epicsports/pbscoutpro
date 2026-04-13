import React, { useState, useEffect, useMemo } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';
import FieldView from '../components/FieldView';
import PageHeader from '../components/PageHeader';
import { Btn, EmptyState, Modal, Input, Select, Icons, ConfirmModal, Score, ResultBadge } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePlayers, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { mirrorPointToLeft } from '../utils/helpers';
import { computeCoachingStats } from '../utils/coachingStats';
import { generateInsights, computePlayerSummaries, INSIGHT_COLORS, INSIGHT_ICONS } from '../utils/generateInsights';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, responsive } from '../utils/theme';
import { useField } from '../hooks/useField';

// ── Inline helpers (§ 28) ──────────────────────────────────────────────

const SectionHeader = ({ children }) => (
  <div style={{
    fontFamily: FONT, fontSize: 11, fontWeight: 700,
    letterSpacing: 0.6, textTransform: 'uppercase',
    color: '#475569', padding: '18px 16px 8px',
  }}>{children}</div>
);

const StatRow = ({ label, value, color }) => (
  <div style={{
    margin: '0 16px 3px',
    background: COLORS.surfaceDark,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.md,
    padding: '12px 14px',
    display: 'flex', alignItems: 'center', gap: 10,
  }}>
    <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 500, color: '#8b95a5', flex: 1 }}>{label}</span>
    <div style={{ width: 56, height: 4, borderRadius: 2, background: '#111827', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, background: color, borderRadius: 2 }} />
    </div>
    <span style={{
      fontSize: FONT_SIZE.sm, fontWeight: 700, color,
      minWidth: 34, textAlign: 'right',
    }}>{value}%</span>
  </div>
);

const InsightCard = ({ type, text, detail }) => {
  const color = INSIGHT_COLORS[type] || '#94a3b8';
  const icon = INSIGHT_ICONS[type] || '◦';
  return (
    <div style={{
      margin: '0 16px 8px',
      background: '#0f172a',
      border: '1px solid #1a2234',
      borderRadius: 12,
      padding: '12px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: color + '12',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', lineHeight: 1.4 }}>{text}</div>
        {detail && (
          <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', marginTop: 2 }}>{detail}</div>
        )}
      </div>
    </div>
  );
};

const SampleBadge = ({ points, matches }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 6,
    margin: '14px 16px 0',
    padding: '4px 10px',
    background: '#111827',
    border: '1px solid #1a2234',
    borderRadius: 6,
    fontFamily: FONT,
    fontSize: 10, fontWeight: 500,
    color: '#475569',
  }}>
    {points} scouted points · {matches} match{matches === 1 ? '' : 'es'}
  </div>
);

// Win rate color — § 28
const winRateColor = (wr) => {
  if (wr == null) return '#475569';
  if (wr > 70) return '#22c55e';
  if (wr >= 50) return '#f59e0b';
  return '#ef4444';
};

export default function ScoutedTeamPage() {
  const device = useDevice();
  const R = responsive(device.type);
    const { tournamentId, scoutedId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { layouts } = useLayouts();
  const [rosterSearch, setRosterSearch] = useState('');
  const [showRoster, setShowRoster] = useState(false);
  const [addMatchModal, setAddMatchModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [hmShowPositions, setHmShowPositions] = useState(true);
  const [hmShowShots, setHmShowShots] = useState(true);
  const [heatmapExpanded, setHeatmapExpanded] = useState(false);
  const [deleteMatchModal, setDeleteMatchModal] = useState(null); // { id, name }

  const tournament = tournaments.find(t => t.id === tournamentId);
  const scoutedEntry = scouted.find(s => s.id === scoutedId);
  const team = teams.find(t => t.id === scoutedEntry?.teamId);
  const otherScouted = scouted.filter(s => s.id !== scoutedId);
  const teamMatches = matches.filter(m => m.teamA === scoutedId || m.teamB === scoutedId);
  const roster = (scoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  // Load tournament heatmap points — useEffect MUST be before any early return
  useEffect(() => {
    if (!teamMatches.length || !tournamentId) { setHeatmapPoints([]); return; }
    let cancelled = false;
    setHeatmapLoading(true);
    const matchIds = teamMatches.map(m => m.id);
    ds.fetchPointsForMatches(tournamentId, matchIds).then(pts => {
      if (cancelled) return;
      const teamPts = pts.map(pt => {
        const m = teamMatches.find(mm => mm.id === pt.matchId);
        if (!m) return null;
        const isA = m.teamA === scoutedId;
        const data = isA ? (pt.homeData || pt.teamA) : (pt.awayData || pt.teamB);
        if (!data) return null;
        const sideFieldSide = data.fieldSide || pt.fieldSide || 'left';
        const mirrored = mirrorPointToLeft(data, sideFieldSide);
        // Normalize outcome from our team's perspective: 'win' | 'loss' | null
        let outcome = null;
        if (pt.outcome === 'win_a') outcome = isA ? 'win' : 'loss';
        else if (pt.outcome === 'win_b') outcome = isA ? 'loss' : 'win';
        return {
          ...mirrored,
          shots: ds.shotsFromFirestore(data.shots),
          assignments: data.assignments || [],
          eliminations: data.eliminations || [],
          outcome,
        };
      }).filter(Boolean);
      setHeatmapPoints(teamPts);
      setHeatmapLoading(false);
    }).catch(() => setHeatmapLoading(false));
    return () => { cancelled = true; };
  }, [teamMatches.length, tournamentId, scoutedId]);

  // NOW we can do early returns
  const field = useField(tournament, layouts); // before early return

  if (!tournament || !team) return <EmptyState icon="⏳" text="Loading..." />;


  const nonRosterPlayers = players.filter(p => !(scoutedEntry?.roster || []).includes(p.id));
  const searchResults = rosterSearch ? nonRosterPlayers.filter(p =>
    (p.name||'').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.nickname||'').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.number||'').includes(rosterSearch)
  ).slice(0, 8) : [];

  const handleAddMatch = async () => {
    if (!selectedOpponent) return;
    const oppEntry = scouted.find(s => s.id === selectedOpponent);
    const oppTeam = oppEntry ? teams.find(t => t.id === oppEntry.teamId) : null;
    // Inherit division from scouted team entry
    const scoutedEntry = scouted.find(s => s.id === scoutedId);
    await ds.addMatch(tournamentId, {
      teamA: scoutedId, teamB: selectedOpponent,
      name: `${team.name} vs ${oppTeam?.name || '?'}`,
      division: scoutedEntry?.division || null,
    });
    setAddMatchModal(false); setSelectedOpponent('');
  };

  const handleAddToRoster = async (playerId) => {
    const newRoster = [...(scoutedEntry?.roster || []), playerId];
    await ds.updateScoutedTeam(tournamentId, scoutedId, { roster: newRoster });
    const player = players.find(p => p.id === playerId);
    if (player && player.teamId !== team.id) await ds.changePlayerTeam(playerId, team.id, player.teamHistory || []);
    setRosterSearch('');
  };

  const handleRemoveFromRoster = async (playerId) => {
    const newRoster = (scoutedEntry?.roster || []).filter(id => id !== playerId);
    await ds.updateScoutedTeam(tournamentId, scoutedId, { roster: newRoster });
  };

  // ── Derived stats (§ 28) ──
  const stats = useMemo(() => computeCoachingStats(heatmapPoints, field),
    [heatmapPoints, field]);
  const insights = useMemo(() => generateInsights(stats, heatmapPoints, field, roster),
    [stats, heatmapPoints, field, roster]);

  // Win rate + break survival across all points (team-level)
  const performance = useMemo(() => {
    if (!heatmapPoints.length) return { winRate: null, breakSurvival: null, fiftyReached: null };
    const wins = heatmapPoints.filter(p => p.outcome === 'win').length;
    const finalPts = heatmapPoints.filter(p => p.outcome === 'win' || p.outcome === 'loss').length;
    const winRate = finalPts ? Math.round((wins / finalPts) * 100) : null;
    // Break survival: % of points where no one was eliminated on the break (approximation: not all 5 eliminated)
    const survived = heatmapPoints.filter(p => {
      const elims = p.eliminations || [];
      return !elims.every(Boolean);
    }).length;
    const breakSurvival = Math.round((survived / heatmapPoints.length) * 100);
    // Fifty reached
    const fifty = heatmapPoints.filter(p => (p.players || []).some(pl => pl && pl.x > 0.5)).length;
    const fiftyReached = Math.round((fifty / heatmapPoints.length) * 100);
    return { winRate, breakSurvival, fiftyReached };
  }, [heatmapPoints]);

  const playerSummaries = useMemo(
    () => computePlayerSummaries(heatmapPoints, scoutedEntry?.roster || [], players, field),
    [heatmapPoints, scoutedEntry?.roster, players, field]
  );
  const tournamentHeroes = scoutedEntry?.heroPlayers || [];
  const heroPlayerIds = [...tournamentHeroes, ...roster.filter(p => p.hero).map(p => p.id)];

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        back={{ to: `/tournament/${tournamentId}` }}
        title={team?.name || 'Team'}
        subtitle="TOURNAMENT SUMMARY"
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 80 }}>
        {/* 1. Sample badge (§ 28) */}
        {heatmapPoints.length > 0 && (
          <div><SampleBadge points={heatmapPoints.length} matches={teamMatches.length} /></div>
        )}

        {/* Loading state */}
        {heatmapLoading && (
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 20, textAlign: 'center' }}>
            Loading scouted points...
          </div>
        )}

        {/* 2. Key insights */}
        {insights.length > 0 && (
          <>
            <SectionHeader>Key insights</SectionHeader>
            {insights.map((ins, i) => (
              <InsightCard key={i} type={ins.type} text={ins.text} detail={ins.detail} />
            ))}
          </>
        )}

        {/* 3. Break tendencies */}
        {heatmapPoints.length > 0 && (
          <>
            <SectionHeader>Break tendencies</SectionHeader>
            {stats.dorito != null && <StatRow label="Dorito side" value={stats.dorito} color="#fb923c" />}
            {stats.snake != null && <StatRow label="Snake side" value={stats.snake} color="#22d3ee" />}
            {stats.center != null && <StatRow label="Center play" value={stats.center} color="#94a3b8" />}
          </>
        )}

        {/* 4. Performance */}
        {heatmapPoints.length > 0 && (performance.winRate != null || performance.breakSurvival != null) && (
          <>
            <SectionHeader>Performance</SectionHeader>
            {performance.winRate != null && (
              <StatRow label="Win rate" value={performance.winRate} color={winRateColor(performance.winRate)} />
            )}
            {performance.breakSurvival != null && (
              <StatRow label="Break survival" value={performance.breakSurvival} color="#22c55e" />
            )}
            {performance.fiftyReached != null && (
              <StatRow label="Fifty reached" value={performance.fiftyReached} color="#fb923c" />
            )}
          </>
        )}

        {/* 5. Heatmap — mini preview, expandable */}
        {teamMatches.length > 0 && (
          <>
            <SectionHeader>Heatmap</SectionHeader>
            <div style={{ margin: '0 16px 4px' }}>
              {!heatmapExpanded ? (
                <div
                  onClick={() => setHeatmapExpanded(true)}
                  style={{
                    height: 110, borderRadius: 12, overflow: 'hidden',
                    background: '#0a1410', border: '1px solid #162016',
                    cursor: 'pointer', position: 'relative',
                  }}>
                  <FieldView mode="heatmap"
                    field={field}
                    heatmapPoints={heatmapPoints}
                    heatmapMode="positions"
                    heatmapRosterPlayers={roster}
                    heatmapShowPositions={true}
                    heatmapShowShots={true}
                    heroPlayerIds={heroPlayerIds}
                    layers={['lines']}
                  />
                  <div style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    padding: '4px 10px',
                    fontFamily: FONT, fontSize: 10, fontWeight: 600,
                    color: '#8b95a5', textAlign: 'center',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  }}>Tap to expand heatmap</div>
                </div>
              ) : (
                <div style={{ borderRadius: 12, overflow: 'hidden', background: '#0a1410', border: '1px solid #162016' }}>
                  <FieldView mode="heatmap"
                    field={field}
                    heatmapPoints={heatmapPoints}
                    heatmapMode="positions"
                    heatmapRosterPlayers={roster}
                    heatmapShowPositions={hmShowPositions}
                    heatmapShowShots={hmShowShots}
                    heroPlayerIds={heroPlayerIds}
                    layers={['lines']}
                  />
                  <div style={{ display: 'flex', gap: 6, padding: '6px 16px', justifyContent: 'center' }}>
                    <div onClick={() => setHmShowPositions(v => !v)} style={{
                      padding: '5px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
                      fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
                      background: hmShowPositions ? 'rgba(34,197,94,0.15)' : 'transparent',
                      color: hmShowPositions ? '#22c55e' : COLORS.textMuted,
                      border: `1px solid ${hmShowPositions ? 'rgba(34,197,94,0.4)' : COLORS.border}`,
                    }}>● Positions</div>
                    <div onClick={() => setHmShowShots(v => !v)} style={{
                      padding: '5px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
                      fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
                      background: hmShowShots ? 'rgba(239,68,68,0.15)' : 'transparent',
                      color: hmShowShots ? '#ef4444' : COLORS.textMuted,
                      border: `1px solid ${hmShowShots ? 'rgba(239,68,68,0.4)' : COLORS.border}`,
                    }}>⊕ Shots</div>
                    <div onClick={() => setHeatmapExpanded(false)} style={{
                      padding: '5px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
                      fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
                      background: 'transparent', color: COLORS.textMuted,
                      border: `1px solid ${COLORS.border}`,
                    }}>⇱ Collapse</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 6. Players — minimal § 28 cards */}
        {roster.length > 0 && (
          <>
            <SectionHeader>Players</SectionHeader>
            <div style={{ padding: '0 16px' }}>
              {playerSummaries.map(ps => {
                const rosterPlayer = roster.find(p => p.id === ps.playerId);
                const slotIdx = (scoutedEntry?.roster || []).indexOf(ps.playerId);
                const playerColor = (COLORS.playerColors && COLORS.playerColors[slotIdx % 5]) || '#94a3b8';
                const isHero = heroPlayerIds.includes(ps.playerId);
                const wr = ps.winRate;
                return (
                  <div key={ps.playerId}
                    onClick={() => navigate(`/player/${ps.playerId}/stats?scope=tournament&tid=${tournamentId}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', marginBottom: 6,
                      background: COLORS.surfaceDark,
                      border: `1px solid ${isHero ? '#f59e0b25' : COLORS.border}`,
                      borderRadius: RADIUS.md,
                      cursor: 'pointer', minHeight: TOUCH.minTarget,
                      boxShadow: isHero ? '0 0 0 1px #f59e0b18' : 'none',
                    }}>
                    {/* Avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: playerColor + '22',
                      border: `2px solid ${playerColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT, fontSize: 11, fontWeight: 800,
                      color: playerColor, flexShrink: 0,
                      boxShadow: isHero ? '0 0 8px #f59e0b40' : 'none',
                    }}>
                      {ps.number || '?'}
                    </div>
                    {/* Name + subtitle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {ps.name}
                        {isHero && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />}
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: '#475569', marginTop: 2 }}>
                        {ps.position} · {ps.ptsPlayed} pts{ps.kills > 0 ? ` · ${ps.kills} kills` : ''}
                      </div>
                    </div>
                    {/* Win rate */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: winRateColor(wr) }}>
                        {wr != null ? `${wr}%` : '—'}
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.4 }}>win</div>
                    </div>
                  </div>
                );
              })}
              {!playerSummaries.length && (
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, padding: '12px 0', textAlign: 'center' }}>
                  No player stats yet — add scouted matches
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ padding: `0 ${R.layout.padding}px`, display: 'flex', flexDirection: 'column', gap: R.layout.gap * 2 }}>

        {/* Roster management (editable) */}
        <div>
          <div onClick={() => setShowRoster(!showRoster)} style={{
            display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: '14px 16px',
            borderRadius: RADIUS.lg, background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
            cursor: 'pointer',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.border,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600, color: COLORS.text }}>Manage roster</div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted }}>{roster.length} players · add, remove, mark HERO</div>
            </div>
            <span style={{ color: COLORS.textMuted, transform: showRoster ? 'rotate(90deg)' : 'none', transition: '0.2s' }}><Icons.Chev /></span>
          </div>
          {showRoster && (
            <div className="fade-in" style={{ marginTop: 8, padding: 12, background: COLORS.surfaceDark, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}` }}>
              <div style={{ marginBottom: 10 }}>
                <Input value={rosterSearch} onChange={setRosterSearch} placeholder="🔍 Search player..." />
                {searchResults.length > 0 && (
                  <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {searchResults.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, minHeight: 36, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}` }}
                        onClick={() => handleAddToRoster(p.id)}>
                        <span style={{ fontFamily: FONT, fontWeight: 800, color: COLORS.accent, fontSize: TOUCH.fontSm }}>#{p.number}</span>
                        <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>{p.nickname || p.name}</span>
                        <Icons.Plus />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {roster.map(p => {
                const isTHero = tournamentHeroes.includes(p.id);
                const isHero = isTHero || p.hero;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, marginBottom: 3, minHeight: 36 }}>
                    <span style={{ fontFamily: FONT, fontWeight: 800, color: COLORS.accent, fontSize: TOUCH.fontSm }}>#{p.number}</span>
                    {isHero && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />}
                    <span
                      onClick={() => navigate(`/player/${p.id}/stats?scope=tournament&tid=${tournamentId}`)}
                      style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1, cursor: 'pointer', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name} {p.nickname && <span style={{ color: COLORS.textDim }}>„{p.nickname}"</span>}
                    </span>
                    {/* Tournament HERO toggle (§ 25) */}
                    <div
                      onClick={() => {
                        const next = isTHero
                          ? tournamentHeroes.filter(id => id !== p.id)
                          : [...tournamentHeroes, p.id];
                        ds.setTournamentHero(tournamentId, scoutedId, next);
                      }}
                      title={isTHero ? 'Remove tournament HERO' : 'Mark as tournament HERO'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '4px 6px', borderRadius: RADIUS.sm, cursor: 'pointer',
                        background: isTHero ? '#f59e0b12' : 'transparent',
                        border: `1px solid ${isTHero ? '#f59e0b25' : '#1a2234'}`,
                      }}>
                      <span style={{ fontSize: 11, color: isTHero ? '#f59e0b' : '#475569' }}>★</span>
                      <span style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, letterSpacing: '.3px', color: isTHero ? '#f59e0b' : '#475569' }}>HERO</span>
                    </div>
                    <Btn variant="ghost" size="sm" onClick={() => handleRemoveFromRoster(p.id)}><Icons.Trash /></Btn>
                  </div>
                );
              })}
              {!roster.length && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 6 }}>Empty roster</div>}
              {/* Quick add */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.border}30` }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Add new player:</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
                    style={{ flex: 2, fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 10px', borderRadius: 6, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, minHeight: 36 }} />
                  <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="#"
                    style={{ width: 50, fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 8px', borderRadius: 6, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, minHeight: 36, textAlign: 'center' }} />
                  <Btn variant="accent" size="sm" disabled={!newName.trim()} onClick={async () => {
                    const ref = await ds.addPlayer({ name: newName.trim(), number: newNumber.trim(), teamId: team.id });
                    const nr = [...(scoutedEntry?.roster || []), ref.id];
                    await ds.updateScoutedTeam(tournamentId, scoutedId, { roster: nr });
                    setNewName(''); setNewNumber('');
                  }}><Icons.Plus /></Btn>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Matches */}
        <div>
          <SectionHeader>Matches ({teamMatches.length})</SectionHeader>

          {!teamMatches.length && <EmptyState icon="📋" text="Add a match or import schedule" />}

          {teamMatches.map(m => {
            const isA = m.teamA === scoutedId;
            const oppScoutedId = isA ? m.teamB : m.teamA;
            const oppEntry = scouted.find(s => s.id === oppScoutedId);
            const oppTeam = oppEntry ? teams.find(t => t.id === oppEntry.teamId) : null;
            const sA = m.scoreA || 0, sB = m.scoreB || 0;
            const myScore = isA ? sA : sB;
            const oppScore = isA ? sB : sA;
            const isFinal = m.status === 'closed';
            const hasScore = sA > 0 || sB > 0;
            const won = isFinal && hasScore && myScore > oppScore;
            const lost = isFinal && hasScore && myScore < oppScore;
            const isDraw = isFinal && hasScore && myScore === oppScore;
            const isScheduled = !hasScore && !isFinal;
            const resultColor = won ? COLORS.success : lost ? COLORS.danger : isDraw ? COLORS.accent : COLORS.text;
            return (
              <div key={m.id} onClick={() => navigate(`/tournament/${tournamentId}/match/${m.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: SPACE.sm,
                  padding: '14px 16px', borderRadius: RADIUS.lg,
                  background: COLORS.surfaceDark,
                  border: `1px ${isScheduled ? 'dashed' : 'solid'} ${COLORS.border}`,
                  marginBottom: SPACE.sm, cursor: 'pointer',
                }}>
                <div style={{ flex: 1, minWidth: 0, opacity: isScheduled ? 0.55 : 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text }}>
                    vs {oppTeam?.name || '?'}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: 2 }}>
                    {m.date || 'scheduled'}
                  </div>
                </div>
                {hasScore ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Score value={`${myScore}:${oppScore}`} color={isFinal ? resultColor : undefined} />
                    {isFinal && <ResultBadge result={won ? 'W' : lost ? 'L' : 'D'} />}
                  </div>
                ) : (
                  <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600, color: COLORS.textMuted }}>— : —</span>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Delete match — password protected */}
      <ConfirmModal open={!!deleteMatchModal} onClose={() => setDeleteMatchModal(null)}
        title="Delete match?" danger confirmLabel="Delete"
        message={`Delete match?`}
        onConfirm={() => { ds.deleteMatch(tournament.id, deleteMatchModal); setDeleteMatchModal(null); }} />

      {/* Sticky ADD MATCH */}
      <div style={{ position: 'sticky', bottom: 0, padding: `8px ${R.layout.padding}px`, background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, zIndex: 20 }}>
        <Btn variant="accent"
          onClick={() => { setSelectedOpponent(''); setAddMatchModal(true); }}
          style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: TOUCH.fontLg, fontWeight: 800 }}>
          <Icons.Plus /> ADD MATCH
        </Btn>
      </div>

      <Modal open={addMatchModal} onClose={() => setAddMatchModal(false)} title="New match"
        footer={<><Btn variant="default" onClick={() => setAddMatchModal(false)}>Cancel</Btn><Btn variant="accent" onClick={handleAddMatch} disabled={!selectedOpponent}><Icons.Check /> Add</Btn></>}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: 8, fontWeight: 700 }}>Opponent</div>
          <Select value={selectedOpponent} onChange={setSelectedOpponent} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
            <option value="">— select —</option>
            {otherScouted.map(s => { const t = teams.find(x => x.id === s.teamId); return t ? <option key={s.id} value={s.id}>{t.name}</option> : null; })}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
