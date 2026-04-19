import React, { useState, useEffect, useMemo } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import FieldView from '../components/FieldView';
import PageHeader from '../components/PageHeader';
import PlayerAvatar from '../components/PlayerAvatar';
import { Btn, EmptyState, Modal, Input, Select, Icons, ConfirmModal, Score, ResultBadge, SideTag } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePlayers, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { mirrorPointToLeft } from '../utils/helpers';
import { computeCoachingStats } from '../utils/coachingStats';
import { generateInsights, generateCounters, computeBreakSurvival, computeSideTendency, computeTopHeroes, computeTacticalSignals, computeShotTargets, INSIGHT_COLORS, INSIGHT_ICONS, COUNTER_COLORS } from '../utils/generateInsights';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, responsive } from '../utils/theme';
import { useField } from '../hooks/useField';
import { useUserNames, fallbackScoutLabel } from '../hooks/useUserNames';
import { useLanguage } from '../hooks/useLanguage';
import { Footprints, Crosshair, Route, Medal } from 'lucide-react';

// ── Inline helpers (§ 28) ──────────────────────────────────────────────

// SectionHeader: with `icon` prop renders prominent 15px/700 + Lucide icon
// (used for above-fold priority sections). Without it falls back to the
// original 11px uppercase muted label (secondary sections).
const SectionHeader = ({ children, icon: Icon }) => {
  if (Icon) {
    return (
      <div style={{
        padding: '18px 16px 8px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Icon size={18} color={COLORS.text} strokeWidth={2} />
        <div style={{
          fontFamily: FONT, fontSize: 15, fontWeight: 700,
          color: COLORS.text, letterSpacing: '-0.01em',
        }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{
      fontFamily: FONT, fontSize: 11, fontWeight: 700,
      letterSpacing: 0.6, textTransform: 'uppercase',
      color: COLORS.textMuted, padding: '18px 16px 8px',
    }}>{children}</div>
  );
};

const InsightCard = ({ type, text, detail }) => {
  const color = INSIGHT_COLORS[type] || COLORS.textDim;
  const icon = INSIGHT_ICONS[type] || '◦';
  return (
    <div style={{
      margin: '0 16px 8px',
      background: COLORS.surfaceDark,
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
        <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, lineHeight: 1.4 }}>{text}</div>
        {detail && (
          <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMuted, marginTop: 2 }}>{detail}</div>
        )}
      </div>
    </div>
  );
};

const CounterCard = ({ counter }) => {
  const color = COUNTER_COLORS[counter.priority] || COLORS.textMuted;
  return (
    <div style={{
      margin: '0 16px 6px',
      background: COLORS.surfaceDark,
      border: `1px solid ${color}25`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{counter.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.4 }}>{counter.action}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMuted, marginTop: 3, lineHeight: 1.4 }}>{counter.detail}</div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
        background: `${color}15`, color, textTransform: 'uppercase', letterSpacing: '.5px',
        flexShrink: 0, marginTop: 2,
      }}>{counter.priority}</span>
    </div>
  );
};

function computeCompleteness(heatmapPoints) {
  if (!heatmapPoints?.length) return null;
  let totalSlots = 0, placedSlots = 0;
  let nonRunnerPlayers = 0, playersWithShots = 0;
  let fullPoints = 0;
  let placedWithAssign = 0, totalPlaced = 0;
  let totalOppElims = 0, attributedKills = 0;
  let playersWithAnyShot = 0, playersWithPrecisionShot = 0;

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
        const hasBasic = (qs[i] && qs[i].length > 0) || (os[i] && os[i].length > 0);
        const hasPrecision = pt.shots && pt.shots[i] && pt.shots[i].length > 0;
        if (hasBasic) {
          playersWithShots++;
          playersWithAnyShot++;
          if (hasPrecision) playersWithPrecisionShot++;
        }
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
  const precisionRatio = playersWithAnyShot > 0
    ? Math.round((playersWithPrecisionShot / playersWithAnyShot) * 100)
    : 0;
  return {
    breakPct, fullPoints, totalPoints: heatmapPoints.length, placedSlots, totalSlots,
    shotPct, playersWithShots, nonRunnerPlayers,
    assignPct, placedWithAssign, totalPlaced,
    killAttrPct, attributedKills, totalOppElims,
    precisionRatio,
  };
}

export default function ScoutedTeamPage() {
  const device = useDevice();
  const R = responsive(device.type);
  const { t, lang } = useLanguage();
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
  const [searchParams, setSearchParams] = useSearchParams();
  const isLayoutScope = searchParams.get('scope') === 'layout';
  const [hmShowPositions, setHmShowPositions] = useState(true);
  const [hmShowShots, setHmShowShots] = useState(true);
  const [heatmapExpanded, setHeatmapExpanded] = useState(false);
  const [deleteMatchModal, setDeleteMatchModal] = useState(null); // { id, name }
  const [showAdditional, setShowAdditional] = useState(false);

  const tournament = tournaments.find(t => t.id === tournamentId);
  const scoutedEntry = scouted.find(s => s.id === scoutedId);
  const team = teams.find(t => t.id === scoutedEntry?.teamId);
  const otherScouted = scouted.filter(s => s.id !== scoutedId);
  const teamMatches = matches.filter(m => m.teamA === scoutedId || m.teamB === scoutedId);
  const roster = (scoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  // Load tournament heatmap points — useEffect MUST be before any early return.
  // In layout scope, aggregate across every tournament sharing the same layoutId.
  const teamId = scoutedEntry?.teamId;
  const currentLayoutId = tournament?.layoutId;
  useEffect(() => {
    if (!tournamentId) { setHeatmapPoints([]); return; }
    let cancelled = false;
    setHeatmapLoading(true);

    const mapOnePointForTeam = (pt, scoutedIdForTourn) => {
      const isA = pt._matchTeamA === scoutedIdForTourn;
      const data = isA ? (pt.homeData || pt.teamA) : (pt.awayData || pt.teamB);
      if (!data) return null;
      const sideFieldSide = data.fieldSide || pt.fieldSide || 'left';
      const mirrored = mirrorPointToLeft(data, sideFieldSide);
      let outcome = null;
      if (pt.outcome === 'win_a') outcome = isA ? 'win' : 'loss';
      else if (pt.outcome === 'win_b') outcome = isA ? 'loss' : 'win';
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
    };

    (async () => {
      try {
        if (isLayoutScope && currentLayoutId && teamId) {
          // Aggregate across every tournament sharing this layout.
          const sharedTournaments = tournaments.filter(t => t.layoutId === currentLayoutId);
          const all = [];
          for (const t of sharedTournaments) {
            if (cancelled) return;
            try {
              const scoutedList = await ds.fetchScoutedTeams(t.id);
              const sEntry = scoutedList.find(s => s.teamId === teamId);
              if (!sEntry) continue;
              const matchList = await ds.fetchMatches(t.id);
              const relevant = matchList.filter(m => m.teamA === sEntry.id || m.teamB === sEntry.id);
              if (!relevant.length) continue;
              const relevantMap = new Map(relevant.map(m => [m.id, m]));
              const rawPts = await ds.fetchPointsForMatches(t.id, relevant.map(m => m.id));
              rawPts.forEach(pt => {
                const m = relevantMap.get(pt.matchId);
                if (!m) return;
                const mapped = mapOnePointForTeam({ ...pt, _matchTeamA: m.teamA }, sEntry.id);
                if (mapped) all.push(mapped);
              });
            } catch (e) { /* skip tournament on error */ }
          }
          if (!cancelled) {
            setHeatmapPoints(all);
            setHeatmapLoading(false);
          }
          return;
        }

        // Single-tournament mode (existing behavior)
        if (!teamMatches.length) {
          setHeatmapPoints([]);
          setHeatmapLoading(false);
          return;
        }
        const matchIds = teamMatches.map(m => m.id);
        const pts = await ds.fetchPointsForMatches(tournamentId, matchIds);
        if (cancelled) return;
        const matchMap = new Map(teamMatches.map(m => [m.id, m]));
        const teamPts = pts.map(pt => {
          const m = matchMap.get(pt.matchId);
          if (!m) return null;
          return mapOnePointForTeam({ ...pt, _matchTeamA: m.teamA }, scoutedId);
        }).filter(Boolean);
        setHeatmapPoints(teamPts);
        setHeatmapLoading(false);
      } catch (e) {
        if (!cancelled) setHeatmapLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [teamMatches.length, tournamentId, scoutedId, isLayoutScope, currentLayoutId, teamId, tournaments]);

  // NOW we can do early returns
  const field = useField(tournament, layouts, true); // full=true for bunkers

  // ── Derived stats (§ 28) — ALL hooks MUST be before early return ──
  const stats = useMemo(() => computeCoachingStats(heatmapPoints, field),
    [heatmapPoints, field]);
  const insights = useMemo(() => generateInsights(stats, heatmapPoints, field, roster, lang),
    [stats, heatmapPoints, field, roster, lang]);
  const counters = useMemo(() => generateCounters(insights, lang), [insights, lang]);
  const breakSurvival = useMemo(() => computeBreakSurvival(heatmapPoints, field), [heatmapPoints, field]);
  const sideTendency = useMemo(() => computeSideTendency(heatmapPoints, field), [heatmapPoints, field]);
  const tacticalSignals = useMemo(() => computeTacticalSignals(heatmapPoints, field, players), [heatmapPoints, field, players]);
  const shotTargets = useMemo(() => computeShotTargets(heatmapPoints, field), [heatmapPoints, field]);
  const topHeroes = useMemo(
    () => computeTopHeroes(heatmapPoints, scoutedEntry?.roster || [], players, field, 5),
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
        subtitle={t('opponent_analysis')}
      />

      {/* Layout scope pills — only when this tournament uses a shared layout */}
      {currentLayoutId && (() => {
        const layoutTs = tournaments.filter(t => t.layoutId === currentLayoutId);
        if (layoutTs.length <= 1) return null;
        return (
          <div style={{ display: 'flex', gap: 8, padding: '8px 16px 0' }}>
            <div
              onClick={() => setSearchParams({})}
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: !isLayoutScope ? '#f59e0b08' : 'transparent',
                border: `1px solid ${!isLayoutScope ? COLORS.accent : COLORS.border}`,
                color: !isLayoutScope ? COLORS.accent : COLORS.textDim,
                fontFamily: FONT, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', minHeight: 44,
                display: 'flex', alignItems: 'center',
              }}
            >{t('scope_tournament')}</div>
            <div
              onClick={() => setSearchParams({ scope: 'layout' })}
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: isLayoutScope ? '#f59e0b08' : 'transparent',
                border: `1px solid ${isLayoutScope ? COLORS.accent : COLORS.border}`,
                color: isLayoutScope ? COLORS.accent : COLORS.textDim,
                fontFamily: FONT, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', minHeight: 44,
                display: 'flex', alignItems: 'center',
              }}
            >{t('scope_layout')} ({layoutTs.length})</div>
          </div>
        );
      })()}

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

          const levelColor = { good: COLORS.success, warn: COLORS.accent, bad: COLORS.danger };

          // Metric pills rendered inside the banner — only Positions + Shots (§ CC Work Package 3.7)
          const MetricPill = ({ label, pct, level, qualifier }) => (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: `${levelColor[level]}18`,
              border: `1px solid ${levelColor[level]}30`,
              borderRadius: 5, padding: '1px 6px',
            }}>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted }}>{label}</span>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: levelColor[level] }}>{pct}%</span>
              {qualifier && (
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, opacity: 0.75 }}>
                  {qualifier}
                </span>
              )}
            </span>
          );

          const pills = (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              <MetricPill label={t('conf_pill_positions')} pct={c.breakPct} level={breakLevel} />
              <MetricPill label={t('conf_pill_shots')}     pct={c.shotPct}  level={shotLevel}
                qualifier={c.shotPct > 0 ? t('prec_qualifier', c.precisionRatio) : null} />
            </div>
          );

          // Overall confidence = driven primarily by break quality, degraded if shots also weak
          let confidence;
          if (breakLevel === 'good' && shotLevel !== 'bad') confidence = 'high';
          else if (breakLevel === 'bad' || (breakLevel === 'warn' && shotLevel === 'bad')) confidence = 'low';
          else confidence = 'medium';

          const weakLabels = [
            breakLevel !== 'good' && t('conf_metric_positions'),
            shotLevel  !== 'good' && t('conf_metric_shots'),
          ].filter(Boolean);
          const weakText = weakLabels.join(', ');

          if (confidence === 'high') {
            return (
              <div style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.success, flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: COLORS.textMuted }}>
                    {t('conf_high', heatmapPoints.length, teamMatches.length, scoutNamesLabel)}
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
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: COLORS.accent, lineHeight: 1.5 }}>
                    {t('conf_medium', heatmapPoints.length, weakText)}{scoutSuffix}
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
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: COLORS.danger, lineHeight: 1.5 }}>
                  {t('conf_low', heatmapPoints.length, weakText)}{scoutSuffix}
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
            background: COLORS.surfaceDark, border: '1px solid #1a2234', borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>No scouted data yet</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              Scout points in matches to see insights, stats, shot coverage and counter plan.
            </div>
          </div>
        )}

        {!heatmapLoading && heatmapPoints.length === 0 && teamMatches.length === 0 && (
          <div style={{
            margin: '24px 16px', padding: '24px 16px', textAlign: 'center',
            background: COLORS.surfaceDark, border: '1px solid #1a2234', borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏟</div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>No matches yet</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              Add a match with this team to start scouting.
            </div>
          </div>
        )}

        {/* ─── ABOVE FOLD — Coach Brief priorities (Sławek § 34) ─── */}

        {/* Section 1 — Breakouty */}
        {breakSurvival.length > 0 && (() => {
          const overallSurvival = (() => {
            let count = 0, survived = 0;
            breakSurvival.forEach(b => { count += b.count; survived += Math.round((b.survivalPct / 100) * b.count); });
            return count > 0 ? Math.round((survived / count) * 100) : 0;
          })();
          const rows = breakSurvival.slice(0, 7);
          const qualityColor = (pct, thresholds) =>
            pct >= thresholds[0] ? COLORS.success : pct >= thresholds[1] ? COLORS.accent : COLORS.danger;

          return (
            <>
              <SectionHeader icon={Footprints}>{t('section_breakouts')}</SectionHeader>
              <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden' }}>
                {/* Column headers */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 14px', background: COLORS.surface,
                  borderBottom: '1px solid #1a2234',
                }}>
                  <div style={{ flex: 1 }} />
                  <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t('col_rozbieg')}</div>
                  <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t('col_przezycie')}</div>
                </div>
                {rows.map((b, i) => {
                  const freqColor = qualityColor(b.pct, [30, 15]);
                  const survColor = qualityColor(b.survivalPct, [70, 50]);
                  return (
                    <div key={b.name} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      borderBottom: i < rows.length - 1 ? '1px solid #111827' : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SideTag side={b.side || 'center'} />
                        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                        {b.type && (
                          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, fontWeight: 500 }}>{b.type}</span>
                        )}
                      </div>
                      <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: freqColor }}>{b.pct}%</div>
                      <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: survColor }}>{b.survivalPct}%</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ margin: '0 16px 12px', fontFamily: FONT, fontSize: 10, fontStyle: 'italic', color: COLORS.textMuted }}>
                {t('breakout_survival_overall', overallSurvival)}
              </div>
            </>
          );
        })()}

        {/* Section 2 — Strzały (3 zones with accuracy) */}
        {heatmapPoints.length > 0 && (shotTargets.hasQuick || shotTargets.hasPrecision) && (() => {
          const zwa = shotTargets.zonesWithAccuracy;
          const rows = [
            { key: 'snake',  side: 'snake',  label: t('side_snake_label'),  z: zwa.snake },
            { key: 'center', side: 'center', label: t('side_center_label'), z: zwa.center },
            { key: 'dorito', side: 'dorito', label: t('side_dorito_label'), z: zwa.dorito },
          ].filter(r => r.z.pointsWithShot > 0);
          if (!rows.length) return null;

          const qualityColor = (pct, thresholds) =>
            pct >= thresholds[0] ? COLORS.success : pct >= thresholds[1] ? COLORS.accent : COLORS.danger;

          let totalShots = 0, totalKills = 0;
          Object.values(zwa).forEach(z => { totalShots += z.pointsWithShot; totalKills += z.kills; });
          const overallAcc = totalShots > 0 ? Math.round((totalKills / totalShots) * 100) : 0;

          return (
            <>
              <SectionHeader icon={Crosshair}>{t('section_shots_v2')}</SectionHeader>
              <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden' }}>
                {/* Column headers */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 14px', background: COLORS.surface,
                  borderBottom: '1px solid #1a2234',
                }}>
                  <div style={{ flex: 1 }} />
                  <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t('col_strzela')}</div>
                  <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t('col_celnosc')}</div>
                </div>
                {rows.map((r, i) => {
                  const freqColor = qualityColor(r.z.shotPct, [40, 25]);
                  const accColor = qualityColor(r.z.accuracyPct, [30, 20]);
                  return (
                    <div key={r.key} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      borderBottom: i < rows.length - 1 ? '1px solid #111827' : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SideTag side={r.side} />
                        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{r.label}</span>
                      </div>
                      <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: freqColor }}>{r.z.shotPct}%</div>
                      <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: accColor }}>{r.z.accuracyPct}%</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ margin: '0 16px 12px', fontFamily: FONT, fontSize: 10, fontStyle: 'italic', color: COLORS.textMuted }}>
                {t('shot_accuracy_overall', overallAcc)}
              </div>
            </>
          );
        })()}

        {/* Section 3 — Tendencja (3 cards D/C/S, § 34.5) */}
        {heatmapPoints.length > 0 && sideTendency.dorito && (() => {
          const wrColor = (wr) => {
            if (wr == null) return COLORS.textMuted;
            if (wr >= 60) return COLORS.success;
            if (wr >= 45) return COLORS.accent;
            return COLORS.danger;
          };

          // Classification extended for Center (§ 34 D/S/C model)
          const d = sideTendency.dorito.pct;
          const s = sideTendency.snake.pct;
          const c = sideTendency.center.pct;
          let labelKey = '', detailKey = '';
          if (d < 20 && s < 20 && c < 20) {
            labelKey = 'side_class_base_label';
            detailKey = 'side_class_base_detail';
          } else if (c >= 50 && c >= d && c >= s) {
            labelKey = 'side_class_center_label';
            detailKey = 'side_class_center_detail';
          } else if (d >= s * 2 && d >= 35) {
            labelKey = 'side_class_dorito_label';
            detailKey = 'side_class_dorito_detail';
          } else if (s >= d * 2 && s >= 35) {
            labelKey = 'side_class_snake_label';
            detailKey = 'side_class_snake_detail';
          } else if (d >= 40 && s >= 40) {
            labelKey = 'side_class_both_label';
            detailKey = 'side_class_both_detail';
          } else if (d > s) {
            labelKey = 'side_class_lean_dorito_label';
            detailKey = 'side_class_lean_dorito_detail';
          } else {
            labelKey = 'side_class_lean_snake_label';
            detailKey = 'side_class_lean_snake_detail';
          }

          const SideCard = ({ label, side, data }) => (
            <div style={{ flex: 1, minWidth: 0, padding: 12, background: COLORS.surfaceDark, border: '1px solid #1a2234', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <SideTag side={side} />
                <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textDim, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>{data.pct}%</div>
              <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>{t('pts_label')}</div>
              <div style={{ paddingTop: 8, marginTop: 8, borderTop: '1px solid #1a2234', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>{t('col_wr')}</span>
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: wrColor(data.winRate) }}>
                  {data.winRate != null ? `${data.winRate}%` : '—'}
                </span>
              </div>
            </div>
          );

          return (
            <>
              <SectionHeader icon={Route}>{t('section_tendency')}</SectionHeader>
              <div style={{ display: 'flex', gap: 8, margin: '0 16px 8px' }}>
                <SideCard label={t('side_dorito_label')} side="dorito" data={sideTendency.dorito} />
                <SideCard label={t('side_center_label')} side="center" data={sideTendency.center} />
                <SideCard label={t('side_snake_label')}  side="snake"  data={sideTendency.snake} />
              </div>
              <div style={{ margin: '0 16px 12px' }}>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 3 }}>{t(labelKey)}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontStyle: 'italic', color: COLORS.textMuted, lineHeight: 1.5 }}>{t(detailKey)}</div>
              </div>
            </>
          );
        })()}

        {/* Section 4 — Kluczowi gracze (top 5 by +/-) */}
        {topHeroes.length > 0 && (() => {
          const diffColor = (diff) =>
            diff >= 10 ? COLORS.success : diff >= 3 ? COLORS.accent : diff < 0 ? COLORS.danger : COLORS.textDim;
          const wrColor = (wr) => {
            if (wr == null) return COLORS.textMuted;
            if (wr >= 65) return COLORS.success;
            if (wr >= 50) return COLORS.accent;
            return COLORS.danger;
          };
          return (
            <>
              <SectionHeader icon={Medal}>{t('section_key_players')}</SectionHeader>
              <div style={{ margin: '0 16px 6px', background: COLORS.surfaceDark, border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden' }}>
                {topHeroes.map((h, i) => {
                  const dc = diffColor(h.diff);
                  const wc = wrColor(h.winRate);
                  return (
                    <div
                      key={h.playerId}
                      onClick={() => navigate(`/player/${h.playerId}/stats?scope=tournament&tid=${tournamentId}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', cursor: 'pointer',
                        borderBottom: i < topHeroes.length - 1 ? '1px solid #111827' : 'none',
                        minHeight: TOUCH.minTarget,
                      }}
                    >
                      <div style={{ width: 20, textAlign: 'center', fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.textMuted }}>
                        #{i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {h.number ? `#${h.number} ` : ''}{h.name}
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 2, display: 'flex', gap: 6, alignItems: 'baseline' }}>
                          <span>{h.wins}–{h.losses}</span>
                          <span style={{ color: COLORS.borderLight }}>·</span>
                          <span style={{ color: wc, fontWeight: 700 }}>{h.winRate != null ? `${h.winRate}%` : '—'}</span>
                          <span style={{ color: COLORS.borderLight }}>·</span>
                          <span>{h.ptsPlayed} pts</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: dc, lineHeight: 1 }}>
                          {h.diff > 0 ? '+' : ''}{h.diff}
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textMuted, marginTop: 2, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>{t('col_diff')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ margin: '0 16px 14px', fontFamily: FONT, fontSize: 10, fontStyle: 'italic', color: COLORS.textMuted }}>
                {t('sorted_by_diff')}
              </div>
            </>
          );
        })()}

        {/* ─── Additional sections toggle ─── */}
        {heatmapPoints.length > 0 && (
          <div
            onClick={() => setShowAdditional(v => !v)}
            style={{
              margin: '12px 16px 10px', padding: '12px 14px',
              background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
              borderRadius: RADIUS.md, cursor: 'pointer', minHeight: TOUCH.minTarget,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.text, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              {t('additional_sections')}
            </span>
            <span style={{ color: COLORS.textMuted, transform: showAdditional ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>
              <Icons.Chev />
            </span>
          </div>
        )}

        {/* ─── BELOW FOLD — gated by toggle ─── */}
        {showAdditional && (<>

        {/* Big Moves — placeholder (Sławek taxonomy pending) */}
        <div style={{
          margin: '0 16px 10px', padding: 16,
          background: COLORS.surface,
          border: `1px dashed ${COLORS.border}`,
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.text }}>{t('big_moves_title')}</div>
            <div style={{
              padding: '2px 6px', borderRadius: 3,
              background: `${COLORS.accent}20`, color: COLORS.accent,
              fontFamily: FONT, fontSize: 9, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase',
            }}>{t('big_moves_coming')}</div>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, lineHeight: 1.5 }}>
            {t('big_moves_desc')}
          </div>
        </div>

        {/* Counter plan */}
        {counters.length > 0 && (
          <>
            <SectionHeader>{t('section_counter')}</SectionHeader>
            {counters.map((c, i) => (
              <CounterCard key={i} counter={c} />
            ))}
          </>
        )}

        {/* Key insights */}
        {insights.length > 0 && (
          <>
            <SectionHeader>{t('section_insights')}</SectionHeader>
            {insights.map((ins, i) => (
              <InsightCard key={i} type={ins.type} text={ins.text} detail={ins.detail} />
            ))}
          </>
        )}

        {/* 4b. Tactical signals — most eliminated, positions they hunt, 50 reach */}
        {heatmapPoints.length > 0 && (() => {
          const { mostEliminated, huntedPositions, fiftyReach } = tacticalSignals;
          const { precisionTargets, quickZones, hasPrecision, hasQuick } = shotTargets;
          const hasShotData = hasPrecision || hasQuick;
          const hasContent = mostEliminated || huntedPositions.length > 0 || fiftyReach.snake > 0 || fiftyReach.dorito > 0 || hasShotData;
          if (!hasContent) return null;

          const Row = ({ label, children }) => (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: '1px solid #111827' }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.borderLight, textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: 2, minWidth: 90, flexShrink: 0 }}>{label}</div>
              <div style={{ flex: 1 }}>{children}</div>
            </div>
          );

          return (
            <>
              <SectionHeader>{t('section_signals')}</SectionHeader>
              <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden' }}>

                {/* Most eliminated player */}
                {mostEliminated && (
                  <Row label={t('signal_targeted')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                        {mostEliminated.number ? `#${mostEliminated.number} ` : ''}{mostEliminated.name || `Slot ${mostEliminated.slot + 1}`}
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.danger }}>{mostEliminated.pct}%</span>
                      <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>eliminated</span>
                      <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.borderLight }}>({mostEliminated.eliminated}/{mostEliminated.played} pts)</span>
                    </div>
                  </Row>
                )}

                {/* Positions they hunt (from opponent elimination data) */}
                {huntedPositions.length > 0 && (
                  <Row label={t('signal_hunt')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {huntedPositions.map(h => (
                        <div key={h.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.text, minWidth: 80 }}>{h.label}</span>
                          <div style={{ flex: 1, height: 5, background: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${h.pct}%`, background: h.unusual ? COLORS.accent : COLORS.textMuted, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: h.unusual ? COLORS.accent : COLORS.textMuted, minWidth: 32, textAlign: 'right' }}>{h.pct}%</span>
                          {h.unusual && (
                            <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.accent, background: '#f59e0b18', border: '1px solid #f59e0b30', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>⚡ HIGH</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </Row>
                )}

                {/* Shot targets — precision shots attributed to specific bunkers, quick shots by zone */}
                {hasShotData && (
                  <Row label={t('signal_shoots_at')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {/* Precision shots → specific bunkers */}
                      {hasPrecision && precisionTargets.length > 0 && precisionTargets.map(t => (
                        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.text, minWidth: 80 }}>{t.name}</span>
                          <div style={{ flex: 1, height: 5, background: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${t.pct}%`, background: '#8b5cf6', borderRadius: 3, opacity: 0.8 }} />
                          </div>
                          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#8b5cf6', minWidth: 32, textAlign: 'right' }}>{t.pct}%</span>
                        </div>
                      ))}
                      {/* Quick shots → zone only */}
                      {hasQuick && !hasPrecision && (
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {[
                            { key: 'dorito', label: t('side_dorito_label'), pct: quickZones.dorito, color: COLORS.bump },
                            { key: 'snake',  label: t('side_snake_label'),  pct: quickZones.snake,  color: COLORS.zeeker },
                            { key: 'center', label: t('side_center_label'), pct: quickZones.center, color: COLORS.textDim },
                          ].filter(z => z.pct > 0).map(z => (
                            <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: z.color }} />
                              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: z.color }}>{z.pct}%</span>
                              <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>{z.label}</span>
                            </div>
                          ))}
                          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.borderLight, alignSelf: 'center' }}>{t('side_zone_only')}</span>
                        </div>
                      )}
                      {/* Both available — show precision bunkers + quick zone summary */}
                      {hasQuick && hasPrecision && precisionTargets.length > 0 && (
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.borderLight }}>Quick shots:</span>
                          {[
                            { key: 'dorito', label: 'D', pct: quickZones.dorito, color: COLORS.bump },
                            { key: 'snake',  label: 'S', pct: quickZones.snake,  color: COLORS.zeeker },
                            { key: 'center', label: 'C', pct: quickZones.center, color: COLORS.textDim },
                          ].filter(z => z.pct > 0).map(z => (
                            <span key={z.key} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: z.color }}>{z.pct}% {z.label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Row>
                )}

                {/* 50 reach */}
                {(fiftyReach.snake > 0 || fiftyReach.dorito > 0) && (
                  <Row label={t('signal_reach_50')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {fiftyReach.snake > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.zeeker, flexShrink: 0 }} />
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.text, minWidth: 68 }}>Snake 50</span>
                          <div style={{ flex: 1, height: 5, background: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${fiftyReach.snake}%`, background: COLORS.zeeker, borderRadius: 3, opacity: 0.75 }} />
                          </div>
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.zeeker, minWidth: 36, textAlign: 'right' }}>{fiftyReach.snake}%</span>
                          {fiftyReach.snake >= 40 && <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.zeeker, background: '#22d3ee18', border: '1px solid #22d3ee30', borderRadius: 4, padding: '1px 5px' }}>{t('signal_set_lane')}</span>}
                        </div>
                      )}
                      {fiftyReach.dorito > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.bump, flexShrink: 0 }} />
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.text, minWidth: 68 }}>Dorito 50</span>
                          <div style={{ flex: 1, height: 5, background: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${fiftyReach.dorito}%`, background: COLORS.bump, borderRadius: 3, opacity: 0.75 }} />
                          </div>
                          <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.bump, minWidth: 36, textAlign: 'right' }}>{fiftyReach.dorito}%</span>
                          {fiftyReach.dorito >= 40 && <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.bump, background: '#fb923c18', border: '1px solid #fb923c30', borderRadius: 4, padding: '1px 5px' }}>{t('signal_set_lane')}</span>}
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
            <SectionHeader>{t('section_heatmap')}</SectionHeader>
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
                      color: hmShowPositions ? COLORS.success : COLORS.textMuted,
                      border: `1px solid ${hmShowPositions ? 'rgba(34,197,94,0.4)' : COLORS.border}`,
                    }}>● Positions</div>
                    <div onClick={() => setHmShowShots(v => !v)} style={{
                      padding: '5px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
                      fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
                      background: hmShowShots ? 'rgba(239,68,68,0.15)' : 'transparent',
                      color: hmShowShots ? COLORS.danger : COLORS.textMuted,
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

        </>)}
        {/* ─── End of below-fold toggle ─── */}

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
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, minHeight: 44, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}` }}
                        onClick={() => handleAddToRoster(p.id)}>
                        <PlayerAvatar player={p} size={28} />
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
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, marginBottom: 3, minHeight: 44 }}>
                    <PlayerAvatar player={p} size={32} />
                    <span style={{ fontFamily: FONT, fontWeight: 800, color: COLORS.accent, fontSize: TOUCH.fontSm }}>#{p.number}</span>
                    {isHero && <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent, flexShrink: 0 }} />}
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
                        border: `1px solid ${isTHero ? '#f59e0b25' : COLORS.surfaceLight}`,
                      }}>
                      <span style={{ fontSize: 11, color: isTHero ? COLORS.accent : COLORS.textMuted }}>★</span>
                      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '.3px', color: isTHero ? COLORS.accent : COLORS.textMuted }}>HERO</span>
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
                    style={{ flex: 2, fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 10px', borderRadius: 6, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, minHeight: 44 }} />
                  <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="#"
                    style={{ width: 50, fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 8px', borderRadius: 6, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, minHeight: 44, textAlign: 'center' }} />
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

        {/* Matches — below fold */}
        {showAdditional && (
        <div>
          <SectionHeader>{t('section_matches', teamMatches.length)}</SectionHeader>

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
        )}
        </div>
      </div>

      {/* Delete match — password protected */}
      <ConfirmModal open={!!deleteMatchModal} onClose={() => setDeleteMatchModal(null)}
        title={t('delete_match')} danger confirmLabel={t('delete')}
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
        footer={<><Btn variant="default" onClick={() => setAddMatchModal(false)}>{t('cancel')}</Btn><Btn variant="accent" onClick={handleAddMatch} disabled={!selectedOpponent}><Icons.Check /> Add</Btn></>}>
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
