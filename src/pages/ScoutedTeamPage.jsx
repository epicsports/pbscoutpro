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
import { generateInsights, generateCounters, computePlayerSummaries, computeBreakBunkers, computeTacticalSignals, INSIGHT_COLORS, INSIGHT_ICONS, COUNTER_COLORS } from '../utils/generateInsights';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, responsive } from '../utils/theme';
import { useField } from '../hooks/useField';
import { useUserNames, fallbackScoutLabel } from '../hooks/useUserNames';

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

const CounterCard = ({ counter }) => {
  const color = COUNTER_COLORS[counter.priority] || '#475569';
  return (
    <div style={{
      margin: '0 16px 6px',
      background: '#0f172a',
      border: `1px solid ${color}25`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{counter.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4 }}>{counter.action}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', marginTop: 3, lineHeight: 1.4 }}>{counter.detail}</div>
      </div>
      <span style={{
        fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
        background: `${color}15`, color, textTransform: 'uppercase', letterSpacing: '.5px',
        flexShrink: 0, marginTop: 2,
      }}>{counter.priority}</span>
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

function computeCompleteness(heatmapPoints) {
  if (!heatmapPoints?.length) return null;
  let totalSlots = 0, placedSlots = 0;
  let nonRunnerPlayers = 0, playersWithShots = 0;
  let fullPoints = 0;
  let placedWithAssign = 0, totalPlaced = 0;
  let totalOppElims = 0, attributedKills = 0;

  heatmapPoints.forEach(pt => {
    const players = pt.players || [];
    const placed = players.filter(Boolean).length;
    const slots = 5;
    totalSlots += slots;
    placedSlots += placed;
    if (placed >= slots) fullPoints++;

    const assignments = pt.assignments || [];
    const qs = pt.quickShots || [];
    const os = pt.obstacleShots || [];
    const runners = pt.runners || [];

    players.forEach((p, i) => {
      if (!p) return;
      totalPlaced++;
      // Assignment: does this slot have a real player ID?
      if (assignments[i]) placedWithAssign++;
      // Shot coverage
      const isRunner = runners[i];
      if (!isRunner) {
        nonRunnerPlayers++;
        const hasShot = (qs[i] && qs[i].length > 0) || (os[i] && os[i].length > 0);
        if (hasShot) playersWithShots++;
      }
    });

    // Kill attribution: count opponent eliminations and how many match a player's shot zone
    const oppElim = pt.opponentEliminations || [];
    const oppPlayers = pt.opponentPlayers || [];
    const allShots = players.map((_, i) => [...(qs[i] || []), ...(os[i] || [])]);
    const allShotZones = new Set(allShots.flat());

    oppElim.forEach((elim, oi) => {
      if (!elim) return;
      totalOppElims++;
      // Can we attribute? Need an opponent position in a zone that someone shot at
      const oppPos = oppPlayers[oi];
      if (oppPos && allShotZones.size > 0) {
        // Simplified zone check
        const y = oppPos.y;
        const oppZone = y < 0.35 ? 'dorito' : y > 0.65 ? 'snake' : 'center';
        if (allShotZones.has(oppZone)) attributedKills++;
      }
    });
  });

  const breakPct = totalSlots > 0 ? Math.round((placedSlots / totalSlots) * 100) : 0;
  const shotPct = nonRunnerPlayers > 0 ? Math.round((playersWithShots / nonRunnerPlayers) * 100) : 0;
  const assignPct = totalPlaced > 0 ? Math.round((placedWithAssign / totalPlaced) * 100) : 0;
  const killAttrPct = totalOppElims > 0 ? Math.round((attributedKills / totalOppElims) * 100) : 0;
  return {
    breakPct, fullPoints, totalPoints: heatmapPoints.length, placedSlots, totalSlots,
    shotPct, playersWithShots, nonRunnerPlayers,
    assignPct, placedWithAssign, totalPlaced,
    killAttrPct, attributedKills, totalOppElims,
  };
}

function CompletenessBar({ heatmapPoints }) {
  const c = computeCompleteness(heatmapPoints);
  if (!c) return null;
  const metrics = [
    { label: 'Breaks', pct: c.breakPct, thresholds: [90, 60] },
    { label: 'Shots', pct: c.shotPct, thresholds: [80, 50] },
    { label: 'Assigned', pct: c.assignPct, thresholds: [80, 50] },
    ...(c.totalOppElims > 0 ? [{ label: 'Kills', pct: c.killAttrPct, thresholds: [60, 30] }] : []),
  ];
  return (
    <div style={{
      margin: '4px 16px 8px',
      display: 'flex', gap: 12,
    }}>
      {metrics.map(m => {
        const color = m.pct >= m.thresholds[0] ? '#22c55e' : m.pct >= m.thresholds[1] ? '#f59e0b' : '#ef4444';
        return (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#334155' }}>{m.label}</span>
            <span style={{ width: 20, height: 3, borderRadius: 2, background: '#1a2234', display: 'inline-block', position: 'relative', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${m.pct}%`, borderRadius: 2, background: color }} />
            </span>
            <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color }}>{m.pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

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
        // Get opponent data for kill attribution
        const oppData = isA ? (pt.awayData || pt.teamB) : (pt.homeData || pt.teamA);
        const oppMirrored = oppData ? mirrorPointToLeft(oppData, oppData.fieldSide || pt.fieldSide || 'left') : null;
        return {
          ...mirrored,
          shots: ds.shotsFromFirestore(data.shots),
          assignments: data.assignments || [],
          eliminations: data.eliminations || [],
          bumpStops: data.bumpStops || [],
          quickShots: ds.quickShotsFromFirestore(data.quickShots),
          obstacleShots: ds.quickShotsFromFirestore(data.obstacleShots),
          opponentEliminations: oppMirrored?.eliminations || oppData?.eliminations || [],
          opponentPlayers: oppMirrored?.players || oppData?.players || [],
          matchId: pt.matchId,
          scoutedBy: data.scoutedBy || null,
          outcome,
        };
      }).filter(Boolean);
      setHeatmapPoints(teamPts);
      setHeatmapLoading(false);
    }).catch(() => setHeatmapLoading(false));
    return () => { cancelled = true; };
  }, [teamMatches.length, tournamentId, scoutedId]);

  // NOW we can do early returns
  const field = useField(tournament, layouts, true); // full=true for bunkers

  // ── Derived stats (§ 28) — ALL hooks MUST be before early return ──
  const stats = useMemo(() => computeCoachingStats(heatmapPoints, field),
    [heatmapPoints, field]);
  const insights = useMemo(() => generateInsights(stats, heatmapPoints, field, roster),
    [stats, heatmapPoints, field, roster]);
  const counters = useMemo(() => generateCounters(insights), [insights]);
  const breakBunkers = useMemo(() => computeBreakBunkers(heatmapPoints, field), [heatmapPoints, field]);
  const tacticalSignals = useMemo(() => computeTacticalSignals(heatmapPoints, field, players), [heatmapPoints, field, players]);

  // Win rate + break survival across all points (team-level)
  const performance = useMemo(() => {
    if (!heatmapPoints.length) return { winRate: null, breakSurvival: null, fiftyReached: null };
    const wins = heatmapPoints.filter(p => p.outcome === 'win').length;
    const finalPts = heatmapPoints.filter(p => p.outcome === 'win' || p.outcome === 'loss').length;
    const winRate = finalPts ? Math.round((wins / finalPts) * 100) : null;
    const survived = heatmapPoints.filter(p => {
      const elims = p.eliminations || [];
      return !elims.every(Boolean);
    }).length;
    const breakSurvival = Math.round((survived / heatmapPoints.length) * 100);
    const fifty = heatmapPoints.filter(p => (p.players || []).some(pl => pl && pl.x > 0.4 && pl.x < 0.6)).length;
    const fiftyReached = Math.round((fifty / heatmapPoints.length) * 100);
    return { winRate, breakSurvival, fiftyReached };
  }, [heatmapPoints]);

  const playerSummaries = useMemo(
    () => computePlayerSummaries(heatmapPoints, scoutedEntry?.roster || [], players, field),
    [heatmapPoints, scoutedEntry?.roster, players, field]
  );

  const scoutUids = useMemo(
    () => [...new Set(heatmapPoints.map(p => p.scoutedBy).filter(Boolean))],
    [heatmapPoints]
  );
  const scoutNames = useUserNames(scoutUids);
  const scoutNamesLabel = scoutUids.length
    ? scoutUids.map(u => scoutNames[u] || fallbackScoutLabel(u)).join(', ')
    : null;

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

  // ── Derived values (non-hook, safe after early return) ──
  const tournamentHeroes = scoutedEntry?.heroPlayers || [];
  const heroPlayerIds = [...tournamentHeroes, ...roster.filter(p => p.hero).map(p => p.id)];

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        back={{ to: '/' }}
        title={team?.name || 'Team'}
        subtitle="TOURNAMENT SUMMARY"
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 80 }}>
        {/* Data confidence banner — contextual qualifier */}
        {heatmapPoints.length > 0 && (() => {
          const c = computeCompleteness(heatmapPoints);
          if (!c) return null;
          const scoutSuffix = scoutNamesLabel ? ` · Scouted by ${scoutNamesLabel}` : '';

          // Per-metric quality levels — each has independent thresholds
          // breakPct: positions placed per slot (most critical — base of all analysis)
          // shotPct: shots recorded for non-runner players
          // killAttrPct: opponent elims with attributable shot zone (optional)
          // assignPct: placed players with roster ID assigned
          const metricLevel = (pct, goodAt, warnAt) =>
            pct >= goodAt ? 'good' : pct >= warnAt ? 'warn' : 'bad';

          const breakLevel  = metricLevel(c.breakPct,    85, 60);
          const shotLevel   = metricLevel(c.shotPct,     75, 40);
          const killLevel   = c.totalOppElims > 0 ? metricLevel(c.killAttrPct, 60, 30) : null;
          const assignLevel = metricLevel(c.assignPct,   75, 40);

          const levelColor = { good: '#22c55e', warn: '#f59e0b', bad: '#ef4444' };

          // Metric pills rendered inside the banner
          const MetricPill = ({ label, pct, level }) => (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: `${levelColor[level]}18`,
              border: `1px solid ${levelColor[level]}30`,
              borderRadius: 5, padding: '1px 6px',
            }}>
              <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#64748b' }}>{label}</span>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: levelColor[level] }}>{pct}%</span>
            </span>
          );

          const pills = (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              <MetricPill label="Breaks"   pct={c.breakPct}    level={breakLevel} />
              <MetricPill label="Shots"    pct={c.shotPct}     level={shotLevel} />
              {killLevel && <MetricPill label="Kills"  pct={c.killAttrPct} level={killLevel} />}
              <MetricPill label="Players"  pct={c.assignPct}   level={assignLevel} />
            </div>
          );

          // Overall confidence = driven primarily by break quality (most critical),
          // degraded one level if two or more secondary metrics are bad/warn
          const secondaryBadCount = [shotLevel, killLevel, assignLevel]
            .filter(l => l != null && l === 'bad').length;
          const secondaryWarnCount = [shotLevel, killLevel, assignLevel]
            .filter(l => l != null && l !== 'good').length;

          let confidence; // 'high' | 'medium' | 'low'
          if (breakLevel === 'good' && secondaryWarnCount <= 1) confidence = 'high';
          else if (breakLevel === 'bad' || (breakLevel === 'warn' && secondaryBadCount >= 2)) confidence = 'low';
          else confidence = 'medium';

          // Low confidence — which specific metrics are weak?
          const weakLabels = [
            breakLevel  !== 'good' && 'breaks',
            shotLevel   !== 'good' && 'shots',
            killLevel   && killLevel !== 'good' && 'kills',
            assignLevel !== 'good' && 'player assignments',
          ].filter(Boolean);
          const weakText = weakLabels.length
            ? `Incomplete: ${weakLabels.join(', ')}.`
            : '';

          if (confidence === 'high') {
            return (
              <div style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#475569' }}>
                    Based on {heatmapPoints.length} points · {teamMatches.length} match{teamMatches.length === 1 ? '' : 'es'}{scoutSuffix}
                  </span>
                </div>
                {pills}
              </div>
            );
          }
          if (confidence === 'medium') {
            return (
              <div style={{
                margin: '8px 16px', padding: '10px 14px',
                background: '#f59e0b06', border: '1px solid #f59e0b15', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontFamily: FONT, fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠</span>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#f59e0b', lineHeight: 1.5 }}>
                    {heatmapPoints.length} points · some gaps — insights may be incomplete. {weakText}{scoutSuffix}
                  </span>
                </div>
                {pills}
              </div>
            );
          }
          // Low confidence
          return (
            <div style={{
              margin: '8px 16px', padding: '10px 14px',
              background: '#ef444406', border: '1px solid #ef444415', borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontFamily: FONT, fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠</span>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#ef4444', lineHeight: 1.5 }}>
                  Low data quality — {heatmapPoints.length} points. {weakText} Scout more to improve accuracy.{scoutSuffix}
                </span>
              </div>
              {pills}
            </div>
          );
        })()}

        {/* Loading state */}
        {heatmapLoading && (
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 20, textAlign: 'center' }}>
            Loading scouted points...
          </div>
        )}

        {/* No data state */}
        {!heatmapLoading && heatmapPoints.length === 0 && teamMatches.length > 0 && (
          <div style={{
            margin: '24px 16px', padding: '24px 16px', textAlign: 'center',
            background: '#0f172a', border: '1px solid #1a2234', borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>No scouted data yet</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              Scout points in matches to see insights, stats, shot coverage and counter plan.
            </div>
          </div>
        )}

        {!heatmapLoading && heatmapPoints.length === 0 && teamMatches.length === 0 && (
          <div style={{
            margin: '24px 16px', padding: '24px 16px', textAlign: 'center',
            background: '#0f172a', border: '1px solid #1a2234', borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏟</div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>No matches yet</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              Add a match with this team to start scouting.
            </div>
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

        {/* 2b. Counter plan */}
        {counters.length > 0 && (
          <>
            <SectionHeader>Counter plan</SectionHeader>
            {counters.map((c, i) => (
              <CounterCard key={i} counter={c} />
            ))}
          </>
        )}

        {/* 2d. Most likely break bunkers */}
        {breakBunkers.length > 0 && (() => {
          const sideColor = (side) => side === 'dorito' ? '#fb923c' : side === 'snake' ? '#22d3ee' : '#94a3b8';
          const maxPct = breakBunkers[0]?.pct || 1;
          return (
            <>
              <SectionHeader>Most likely break positions</SectionHeader>
              <div style={{ margin: '0 16px 8px', background: '#0f172a', border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden' }}>
                {breakBunkers.map((b, i) => {
                  const color = sideColor(b.side);
                  const barWidth = Math.round((b.pct / maxPct) * 100);
                  return (
                    <div key={b.name} style={{
                      display: 'grid', gridTemplateColumns: '1fr 120px 40px',
                      alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderBottom: i < breakBunkers.length - 1 ? '1px solid #111827' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{b.name}</span>
                        {b.type && (
                          <span style={{ fontFamily: FONT, fontSize: 10, color: '#475569', fontWeight: 500 }}>{b.type}</span>
                        )}
                      </div>
                      <div style={{ height: 6, background: '#1a2234', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barWidth}%`, background: color, borderRadius: 3, opacity: 0.75 }} />
                      </div>
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color, textAlign: 'right' }}>{b.pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* 2c. Side tendency — D vs S comparison */}
        {heatmapPoints.length > 0 && (() => {
          const discoLine = field?.discoLine ?? 0.30;
          const zeekerLine = field?.zeekerLine ?? 0.80;
          const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';

          const crossedDisco  = p => doritoSide === 'top' ? p.y < discoLine  : p.y > (1 - discoLine);
          const crossedZeeker = p => doritoSide === 'top' ? p.y > zeekerLine : p.y < (1 - zeekerLine);

          let dPts = 0, dWins = 0, sPts = 0, sWins = 0;
          let dShots = 0, sShots = 0, cShots = 0;

          heatmapPoints.forEach(pt => {
            const ps = (pt.players || []).filter(Boolean);
            const isWin = pt.outcome === 'win';
            const hasD = ps.some(p => crossedDisco(p));
            const hasS = ps.some(p => crossedZeeker(p));
            if (hasD) { dPts++; if (isWin) dWins++; }
            if (hasS) { sPts++; if (isWin) sWins++; }
            (pt.quickShots || []).forEach(zs => (zs || []).forEach(z => {
              if (z === 'dorito') dShots++;
              else if (z === 'snake') sShots++;
              else if (z === 'center') cShots++;
            }));
            (pt.obstacleShots || []).forEach(zs => (zs || []).forEach(z => {
              if (z === 'dorito') dShots++;
              else if (z === 'snake') sShots++;
              else if (z === 'center') cShots++;
            }));
          });

          const n = heatmapPoints.length;
          const dPct = Math.round((dPts / n) * 100);
          const sPct = Math.round((sPts / n) * 100);
          const dWinRate = dPts >= 3 ? Math.round((dWins / dPts) * 100) : null;
          const sWinRate = sPts >= 3 ? Math.round((sWins / sPts) * 100) : null;
          const totalShots = dShots + sShots + cShots;

          if (dPct === 0 && sPct === 0 && totalShots === 0) return null;

          // Coach classification
          let label = '', detail = '';
          if (dPct < 20 && sPct < 20) {
            label = 'Pocket team';
            detail = 'Stays near base — minimal runners to either side. Expect heavy break lanes.';
          } else if (dPct >= sPct * 2 && dPct >= 35) {
            label = 'Dorito dominant';
            detail = 'Primary threat is D-side. Snake wire will be under-defended — push snake early.';
          } else if (sPct >= dPct * 2 && sPct >= 35) {
            label = 'Snake dominant';
            detail = 'Primary threat is snake. Dorito wire will be under-defended — push D-side early.';
          } else if (dPct >= 40 && sPct >= 40) {
            label = 'Balanced';
            detail = 'Plays both sides equally — no obvious tape weakness to exploit.';
          } else if (dPct > sPct) {
            label = 'D-side leaning';
            detail = 'Slightly more dorito-focused. Snake wire may be underserved.';
          } else {
            label = 'S-side leaning';
            detail = 'Slightly more snake-focused. Dorito wire may be underserved.';
          }

          const dominant = dPct >= sPct ? 'dorito' : 'snake';
          const maxVal = Math.max(dPct, sPct, 1);
          const dBar = Math.round((dPct / maxVal) * 100);
          const sBar = Math.round((sPct / maxVal) * 100);

          return (
            <>
              <SectionHeader>Side tendency</SectionHeader>
              <div style={{ margin: '0 16px 8px', background: '#0f172a', border: '1px solid #1a2234', borderRadius: 12, padding: '16px' }}>

                {/* D vs S numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                  {/* Dorito */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fb923c', flexShrink: 0 }} />
                      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: 0.5 }}>DORITO</span>
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 800, color: dominant === 'dorito' ? '#fb923c' : '#334155', lineHeight: 1 }}>{dPct}%</div>
                    {dWinRate !== null && (
                      <div style={{ fontFamily: FONT, fontSize: 10, color: '#475569', marginTop: 4 }}>won {dWinRate}% of these</div>
                    )}
                  </div>

                  <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#334155', textAlign: 'center' }}>VS</div>

                  {/* Snake */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginBottom: 6 }}>
                      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: '#64748b', letterSpacing: 0.5 }}>SNAKE</span>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', flexShrink: 0 }} />
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 800, color: dominant === 'snake' ? '#22d3ee' : '#334155', lineHeight: 1 }}>{sPct}%</div>
                    {sWinRate !== null && (
                      <div style={{ fontFamily: FONT, fontSize: 10, color: '#475569', marginTop: 4 }}>won {sWinRate}% of these</div>
                    )}
                  </div>
                </div>

                {/* Balance bar */}
                <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
                  <div style={{ width: `${dBar}%`, background: '#fb923c', opacity: dPct > 0 ? 0.75 : 0, borderRadius: 3, transition: 'width 0.3s' }} />
                  <div style={{ flex: 1, background: '#1a2234', borderRadius: 3 }} />
                  <div style={{ width: `${sBar}%`, background: '#22d3ee', opacity: sPct > 0 ? 0.75 : 0, borderRadius: 3, transition: 'width 0.3s' }} />
                </div>

                {/* Classification */}
                <div style={{ borderTop: '1px solid #1a2234', paddingTop: 12 }}>
                  <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{detail}</div>
                </div>

                {/* Shot targeting */}
                {totalShots > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid #1a2234' }}>
                    <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>Shoots at</span>
                    {[
                      { key: 'D', count: dShots, color: '#fb923c' },
                      { key: 'C', count: cShots, color: '#94a3b8' },
                      { key: 'S', count: sShots, color: '#22d3ee' },
                    ].filter(x => x.count > 0).map(x => (
                      <div key={x.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: x.color }} />
                        <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: x.color }}>{Math.round((x.count / totalShots) * 100)}%</span>
                        <span style={{ fontFamily: FONT, fontSize: 10, color: '#475569' }}>{x.key}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* 3. Performance */}
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
            {stats.lateBreak > 0 && (
              <StatRow label="Bump rate" value={stats.lateBreak} color="#8b95a5" />
            )}
          </>
        )}

        {/* 4b. Tactical signals — most eliminated, positions they hunt, 50 reach */}
        {heatmapPoints.length > 0 && (() => {
          const { mostEliminated, huntedPositions, fiftyReach } = tacticalSignals;
          const hasContent = mostEliminated || huntedPositions.length > 0 || fiftyReach.snake > 0 || fiftyReach.dorito > 0;
          if (!hasContent) return null;

          const Row = ({ label, children }) => (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: '1px solid #111827' }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: 2, minWidth: 90, flexShrink: 0 }}>{label}</div>
              <div style={{ flex: 1 }}>{children}</div>
            </div>
          );

          return (
            <>
              <SectionHeader>Tactical signals</SectionHeader>
              <div style={{ margin: '0 16px 8px', background: '#0f172a', border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden' }}>

                {/* Most eliminated player */}
                {mostEliminated && (
                  <Row label="Most targeted">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                        {mostEliminated.number ? `#${mostEliminated.number} ` : ''}{mostEliminated.name || `Slot ${mostEliminated.slot + 1}`}
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{mostEliminated.pct}%</span>
                      <span style={{ fontFamily: FONT, fontSize: 10, color: '#475569' }}>eliminated</span>
                      <span style={{ fontFamily: FONT, fontSize: 10, color: '#334155' }}>({mostEliminated.eliminated}/{mostEliminated.played} pts)</span>
                    </div>
                  </Row>
                )}

                {/* Positions they hunt */}
                {huntedPositions.length > 0 && (
                  <Row label="They hunt">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {huntedPositions.map(h => (
                        <div key={h.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.text, minWidth: 80 }}>{h.label}</span>
                          <div style={{ flex: 1, height: 5, background: '#1a2234', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${h.pct}%`, background: h.unusual ? '#f59e0b' : '#475569', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: h.unusual ? '#f59e0b' : '#64748b', minWidth: 32, textAlign: 'right' }}>{h.pct}%</span>
                          {h.unusual && (
                            <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: '#f59e0b', background: '#f59e0b18', border: '1px solid #f59e0b30', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>⚡ HIGH</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </Row>
                )}

                {/* 50 reach */}
                {(fiftyReach.snake > 0 || fiftyReach.dorito > 0) && (
                  <Row label="Reach the 50">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {fiftyReach.snake > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', flexShrink: 0 }} />
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.text, minWidth: 68 }}>Snake 50</span>
                          <div style={{ flex: 1, height: 5, background: '#1a2234', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${fiftyReach.snake}%`, background: '#22d3ee', borderRadius: 3, opacity: 0.75 }} />
                          </div>
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#22d3ee', minWidth: 36, textAlign: 'right' }}>{fiftyReach.snake}%</span>
                          {fiftyReach.snake >= 40 && <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: '#22d3ee', background: '#22d3ee18', border: '1px solid #22d3ee30', borderRadius: 4, padding: '1px 5px' }}>SET LANE</span>}
                        </div>
                      )}
                      {fiftyReach.dorito > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fb923c', flexShrink: 0 }} />
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.text, minWidth: 68 }}>Dorito 50</span>
                          <div style={{ flex: 1, height: 5, background: '#1a2234', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${fiftyReach.dorito}%`, background: '#fb923c', borderRadius: 3, opacity: 0.75 }} />
                          </div>
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#fb923c', minWidth: 36, textAlign: 'right' }}>{fiftyReach.dorito}%</span>
                          {fiftyReach.dorito >= 40 && <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: '#fb923c', background: '#fb923c18', border: '1px solid #fb923c30', borderRadius: 4, padding: '1px 5px' }}>SET LANE</span>}
                        </div>
                      )}
                    </div>
                  </Row>
                )}

              </div>
            </>
          );
        })()}

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
                      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{ps.bunker || ps.position}</span>
                        <span style={{ color: '#334155' }}>·</span>
                        <span>{ps.ptsPlayed} pts</span>
                        {ps.diff !== 0 && <span style={{ color: ps.diff > 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{ps.diff > 0 ? '+' : ''}{ps.diff}</span>}
                        {ps.dataCoverage < 100 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ width: 24, height: 3, borderRadius: 2, background: '#1a2234', display: 'inline-block', position: 'relative', overflow: 'hidden' }}>
                              <span style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${ps.dataCoverage}%`, borderRadius: 2, background: ps.dataCoverage >= 80 ? '#22c55e' : ps.dataCoverage >= 50 ? '#f59e0b' : '#ef4444' }} />
                            </span>
                          </span>
                        )}
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
