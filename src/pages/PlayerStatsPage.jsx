/**
 * PlayerStatsPage — per-player performance stats.
 * DESIGN_DECISIONS.md § 24.
 *
 * Route: /player/:playerId/stats?scope=tournament&tid=xxx
 * URL params:
 *   - scope: 'tournament' | 'global' | 'match' (default 'global')
 *   - tid: tournament id (required for scope=tournament|match)
 *   - mid: match id (required for scope=match)
 *
 * Layout (top to bottom):
 *   1. Profile header — avatar + name + team + HERO badge
 *   2. Scope pills — [This tournament] [Global] (and [This match] when scoped)
 *   3. 2×2 metric grid — Win rate, Points played, Break survival, Break kill rate
 *   4. Preferred position — zone breakdown bars
 *   5. Match history — per-match rows with W/L and point counts
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Loading, EmptyState, SectionLabel, Select, ActionSheet } from '../components/ui';
import LineupStatsSection from '../components/LineupStatsSection';
import { computeLineupStats } from '../utils/generateInsights';
import { squadName, squadColor } from '../utils/squads';
import { usePlayers, useTeams, useTournaments, useTrainings, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';
import { resolveField } from '../utils/helpers';
import {
  computePlayerStats,
  buildPlayerPointsFromMatch,
} from '../utils/playerStats';
import { useLanguage } from '../hooks/useLanguage';

// ─── Zone color (matches design § 24 — cyan snake, orange dorito, gray center) ───
function zoneColor(zone) {
  if (zone.startsWith('Snake')) return COLORS.zeeker;
  if (zone.startsWith('Dorito')) return COLORS.bump;
  return COLORS.textMuted;
}

// ─── Win-rate color tier (§ 24) ───
function winRateColor(pct) {
  if (pct == null) return COLORS.textMuted;
  if (pct >= 70) return COLORS.success;
  if (pct >= 40) return COLORS.accent;
  return COLORS.danger;
}

// ─── Avatar — 64px circle with number in accent color ───
function Avatar({ player, isHero }) {
  const color = player?.color || COLORS.accent;
  const photoURL = player?.photoURL;
  const initial = (player?.nickname || player?.name || '?').charAt(0).toUpperCase();
  // Stable color for fallback by id hash
  const hashColor = (() => {
    const s = player?.id || initial;
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    const palette = ['#1e40af', '#7c3aed', '#be185d', '#b45309', '#15803d', '#0f766e', '#9f1239', '#5b21b6'];
    return palette[Math.abs(h) % palette.length];
  })();

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: photoURL ? COLORS.surfaceLight : hashColor,
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: FONT, fontWeight: 800, fontSize: 28, color: '#fff',
      }}>
        {photoURL ? (
          <img src={photoURL} alt=""
            onError={(e) => { e.target.style.display = 'none'; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initial
        )}
      </div>
      {/* Number badge — bottom-right, on top of photo */}
      <div style={{
        position: 'absolute', bottom: -4, right: -4,
        minWidth: 26, height: 22, borderRadius: 11, padding: '0 6px',
        background: COLORS.accent, border: `2px solid ${COLORS.bg}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontSize: 11, fontWeight: 800, color: '#000',
        letterSpacing: '-.02em',
      }}>#{player?.number || '?'}</div>
      {isHero && (
        <div style={{
          position: 'absolute', top: -2, right: -2,
          width: 20, height: 20, borderRadius: '50%',
          background: COLORS.accent, border: '2px solid #080c14',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#000', fontWeight: 800,
        }}>★</div>
      )}
    </div>
  );
}

// ─── Metric card — one cell of the 2×2 grid ───
function MetricCard({ label, value, suffix, barPct, barColor }) {
  return (
    <div style={{
      background: COLORS.surfaceDark, border: `1px solid #1a2234`,
      borderRadius: 12, padding: '14px 14px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      minHeight: 88,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 10, fontWeight: 500,
        color: COLORS.textMuted, letterSpacing: '0.4px',
        textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontFamily: FONT, fontSize: 24, fontWeight: 800,
        color: barColor || COLORS.text, letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        {value ?? '—'}
        {value != null && suffix && (
          <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 2 }}>{suffix}</span>
        )}
      </div>
      {barPct != null && (
        <div style={{
          height: 3, width: '100%',
          background: COLORS.surfaceLight, borderRadius: 2,
          overflow: 'hidden', marginTop: 'auto',
        }}>
          <div style={{
            height: '100%', width: `${Math.max(0, Math.min(100, barPct))}%`,
            background: barColor || COLORS.accent,
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Hero metric — 2×1 prominent KPIs at top ───
function HeroMetric({ label, value, suffix, color, sub, barPct }) {
  return (
    <div style={{
      background: COLORS.surfaceDark, border: `1px solid ${color || '#1a2234'}30`,
      borderRadius: 12, padding: '14px 14px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
      minHeight: 110,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 10, fontWeight: 500,
        color: COLORS.textMuted, letterSpacing: '0.4px',
        textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontFamily: FONT, fontSize: 36, fontWeight: 800,
        color: color || COLORS.text, letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        {value}
        {suffix && (
          <span style={{ fontSize: 18, fontWeight: 700, marginLeft: 2, opacity: 0.85 }}>{suffix}</span>
        )}
      </div>
      {sub && (
        <div style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 500,
          color: COLORS.textMuted, letterSpacing: '0.1px',
        }}>{sub}</div>
      )}
      {barPct != null && (
        <div style={{
          height: 3, width: '100%',
          background: COLORS.surfaceLight, borderRadius: 2,
          overflow: 'hidden', marginTop: 'auto',
        }}>
          <div style={{
            height: '100%', width: `${Math.max(0, Math.min(100, barPct))}%`,
            background: color || COLORS.accent,
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Compact metric chip — secondary stats in a 4-col strip ───
function MetricChip({ label, value }) {
  return (
    <div style={{
      background: COLORS.surfaceDark, border: '1px solid #1a2234',
      borderRadius: 10, padding: '10px 8px',
      display: 'flex', flexDirection: 'column', gap: 2,
      alignItems: 'flex-start',
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 9, fontWeight: 500,
        color: COLORS.textMuted, letterSpacing: '0.4px',
        textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontFamily: FONT, fontSize: 18, fontWeight: 800,
        color: COLORS.text, letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

// ─── Group header — large emoji + label, anchors a content cluster ───
function GroupHeader({ emoji, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginTop: 8, marginBottom: -4,
      paddingLeft: 2,
    }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 700,
        color: COLORS.text, letterSpacing: '-0.1px',
      }}>{label}</span>
    </div>
  );
}

// ─── Subsection — small label + content body ───
function SubSection({ label, hint, children }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        padding: '0 2px 6px',
      }}>
        <span style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 600,
          color: COLORS.textMuted, letterSpacing: '0.3px',
        }}>{label}</span>
        {hint && (
          <span style={{
            fontFamily: FONT, fontSize: 10,
            color: COLORS.textDim,
          }}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── BarRow — label + horizontal bar + right-aligned values ───
function BarRow({ label, labelColor, pct, barColor, right, rightSub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 0',
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 700,
        color: labelColor || COLORS.text, minWidth: 80,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</div>
      <div style={{
        flex: 1, height: 8, background: COLORS.surfaceLight,
        borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`,
          background: barColor || COLORS.accent,
        }} />
      </div>
      <div style={{
        fontFamily: FONT, fontSize: 12, fontWeight: 700,
        color: COLORS.text, minWidth: 38, textAlign: 'right',
      }}>{right}</div>
      {rightSub && (
        <div style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 500,
          color: COLORS.textMuted, minWidth: 42, textAlign: 'right',
        }}>{rightSub}</div>
      )}
    </div>
  );
}

// § 54 canonical reason metadata. Keys match playerStats.causeCounts output
// (always normalized to canonical via read-side mapping). Colors are
// categorical (squad-identity-style, not amber/green/red/cyan/orange semantic
// per § 27). `break` is no longer a reason — it's a stage; legacy 'break'
// data normalizes to {reason: null, inferredStage: 'break'} so it never
// enters this map's domain.
const CAUSE_META = {
  gunfight:        { label: 'Gunfight',         color: '#ef4444' },
  przejscie:       { label: 'Przejście',        color: '#eab308' },
  faja:            { label: 'Faja',             color: '#a855f7' },
  na_przeszkodzie: { label: 'Na przeszkodzie',  color: '#06b6d4' },
  za_kare:         { label: 'za Karę',          color: '#94a3b8' },
  nie_wiem:        { label: 'Nie wiem',         color: '#64748b' },
  inaczej:         { label: 'Inaczej',          color: '#fb7185' },
};

// Survival color — green high, neutral mid, red low
function survivalColor(pct) {
  if (pct == null) return COLORS.textMuted;
  if (pct >= 60) return COLORS.success;
  if (pct >= 35) return COLORS.text;
  return COLORS.danger;
}


// ─── Shot direction bar — stacked horizontal bar ───
function ShotBar({ dorito, center, snake }) {
  const zones = [
    { key: 'dorito', label: 'Dorito', pct: dorito, color: COLORS.bump },
    { key: 'center', label: 'Center', pct: center, color: '#8b95a5' },
    { key: 'snake', label: 'Snake', pct: snake, color: COLORS.zeeker },
  ].filter(z => z.pct > 0);
  return (
    <div>
      <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 8 }}>
        {zones.map(z => (
          <div key={z.key} style={{
            flex: z.pct, background: z.color + '30',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT, fontSize: 10, fontWeight: 700, color: z.color,
            minWidth: z.pct > 10 ? 30 : 0,
          }}>{z.pct > 10 ? `${z.pct}%` : ''}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {zones.map(z => (
          <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color }} />
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: z.color }}>{z.label} {z.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scope pill — one filter chip ───
function ScopePill({ label, active, hasMenu, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 8,
      background: active ? '#f59e0b08' : 'transparent',
      border: `1px solid ${active ? COLORS.accent : COLORS.surfaceLight}`,
      color: active ? COLORS.accent : COLORS.textDim,
      fontFamily: FONT, fontSize: 12, fontWeight: 600,
      cursor: 'pointer', minHeight: 44,
      display: 'flex', alignItems: 'center', gap: 4,
      WebkitTapHighlightColor: 'transparent',
    }}>
      <span>{label}</span>
      {hasMenu && (
        <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>▾</span>
      )}
    </div>
  );
}

export default function PlayerStatsPage() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const device = useDevice();
  const R = responsive(device.type);
  const { t } = useLanguage();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const scopeParam = searchParams.get('scope') || 'global';
  const tidParam = searchParams.get('tid') || null;
  const midParam = searchParams.get('mid') || null;
  const lidParam = searchParams.get('lid') || null;

  const { players } = usePlayers();
  const { teams } = useTeams();
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { layouts } = useLayouts();

  const player = players.find(p => p.id === playerId);
  const playerTeam = teams.find(t => t.id === player?.teamId);

  // ─── Fetch all playerPoints + match metadata ──────────────
  // Strategy: walk every tournament (global) or just one (tournament/match),
  // fetch scouted teams, find ones whose roster contains this player, then
  // fetch their matches + points and normalize via buildPlayerPointsFromMatch.
  const [raw, setRaw] = useState({ playerPoints: [], matches: [], tournamentHeroTids: [] });
  const [dataLoading, setDataLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(null); // null | 'training' | 'layout' | 'tournament'

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;

    (async () => {
      setDataLoading(true);
      const outPlayerPoints = [];
      const outMatches = []; // { id, tid, tournament, opponent, date, scoreA, scoreB, isWinA, isPlayerHome, playedCount }
      const tournamentHeroTids = [];

      // ─── Training scope ──────────────────────────────────
      // Walk trainings instead of tournaments. Training matchups share the
      // tournament point shape so buildPlayerPointsFromMatch can be reused
      // if we pass a pseudo-match object with `id` set to the matchup id.
      if (scopeParam === 'training') {
        try {
          const trainingsToScan = tidParam
            ? [{ id: tidParam }]
            : await (async () => {
                // No single-shot list helper for trainings — reuse
                // fetchAllTrainingPoints would be wasteful; instead read all
                // trainings via a snapshot equivalent. Fall back: skip global
                // training scope for now since walking every training without
                // a list API is not worth the cost. Callers always link
                // training scope with a tid from TrainingResultsPage.
                return [];
              })();

          for (const tr of trainingsToScan) {
            if (cancelled) return;
            const tid = tr.id;
            let trainingPoints = [];
            try { trainingPoints = await ds.fetchAllTrainingPoints(tid); } catch { continue; }

            // Group by matchup so buildPlayerPointsFromMatch keeps pointId context
            const byMatchup = {};
            trainingPoints.forEach(pt => {
              const mid = pt.matchupId || pt.id;
              (byMatchup[mid] ||= { matchup: pt.matchupData || {}, points: [] });
              byMatchup[mid].points.push(pt);
            });

            Object.entries(byMatchup).forEach(([mid, { matchup, points: mPoints }]) => {
              const pseudoMatch = { id: mid };
              const scoped = buildPlayerPointsFromMatch({
                points: mPoints,
                match: pseudoMatch,
                playerId,
              }).map(pp => ({ ...pp, tournamentId: tid, field: null, isTraining: true }));
              outPlayerPoints.push(...scoped);

              // Match history row — use proper squad names (R1/R2/R3/R4) instead of color keys
              const playedCount = scoped.length;
              if (playedCount === 0) return;
              const scoreA = mPoints.filter(p => p.outcome === 'win_a').length;
              const scoreB = mPoints.filter(p => p.outcome === 'win_b').length;
              const playerInHome = mPoints.some(pt => {
                const h = pt.homeData || pt.teamA;
                return (h?.assignments || []).includes(playerId);
              });
              const oppKey = playerInHome ? matchup.awaySquad : matchup.homeSquad;
              const oppLabel = oppKey ? (squadName(oppKey) || oppKey) : (playerInHome ? 'Away' : 'Home');
              outMatches.push({
                id: mid,
                tid,
                tournamentName: 'Training',
                opponent: oppLabel,
                opponentSquadKey: oppKey,
                date: null,
                scoreA, scoreB,
                playerIsHome: playerInHome,
                playedCount,
                isWin: playerInHome ? scoreA > scoreB : scoreB > scoreA,
                isTraining: true,
              });
            });
          }

          if (!cancelled) {
            setRaw({ playerPoints: outPlayerPoints, matches: outMatches, tournamentHeroTids });
            setDataLoading(false);
          }
          return;
        } catch (e) {
          console.error('Training scope fetch failed:', e);
        }
      }

      // Determine tournaments to scan
      let scanTids;
      if (scopeParam === 'tournament' || scopeParam === 'match') {
        scanTids = tidParam ? [tidParam] : [];
      } else if (scopeParam === 'layout' && lidParam) {
        scanTids = tournaments.filter(t => t.layoutId === lidParam).map(t => t.id);
      } else {
        scanTids = tournaments.map(t => t.id);
      }

      for (const tid of scanTids) {
        if (cancelled) return;
        const tournament = tournaments.find(t => t.id === tid);
        if (!tournament) continue;
        const field = resolveField(tournament, layouts);

        let scoutedList = [];
        try { scoutedList = await ds.fetchScoutedTeams(tid); } catch { continue; }
        const playerScouted = scoutedList.filter(st => (st.roster || []).some(r => (r.id || r) === playerId));
        if (!playerScouted.length) continue;

        // Track tournament-level HERO
        if (playerScouted.some(st => (st.heroPlayers || []).includes(playerId))) {
          tournamentHeroTids.push(tid);
        }

        const scoutedIds = new Set(playerScouted.map(st => st.id));
        let matchList = [];
        try { matchList = await ds.fetchMatches(tid); } catch { continue; }
        const relevantMatches = matchList.filter(m =>
          scoutedIds.has(m.teamA) || scoutedIds.has(m.teamB)
        );
        if (!relevantMatches.length) continue;

        const matchIds = scopeParam === 'match' && midParam
          ? relevantMatches.filter(m => m.id === midParam).map(m => m.id)
          : relevantMatches.map(m => m.id);
        if (!matchIds.length) continue;

        let rawPoints = [];
        try { rawPoints = await ds.fetchPointsForMatches(tid, matchIds); } catch { continue; }

        // Group points per match for buildPlayerPointsFromMatch
        const pointsByMatch = {};
        rawPoints.forEach(pt => {
          (pointsByMatch[pt.matchId] ||= []).push(pt);
        });

        relevantMatches.forEach(match => {
          if (!matchIds.includes(match.id)) return;
          const matchPoints = pointsByMatch[match.id] || [];
          const scoped = buildPlayerPointsFromMatch({
            points: matchPoints,
            match,
            playerId,
          }).map(pp => ({
            ...pp,
            tournamentId: tid,
            field,
            eventType: tournament.eventType || 'tournament',
          }));
          outPlayerPoints.push(...scoped);

          // Determine opponent scouted → team name
          const homeSt = scoutedList.find(st => st.id === match.teamA);
          const awaySt = scoutedList.find(st => st.id === match.teamB);
          const playerIsHome = homeSt && (homeSt.roster || []).some(r => (r.id || r) === playerId);
          const opponentSt = playerIsHome ? awaySt : homeSt;
          const opponentTeam = teams.find(t => t.id === opponentSt?.teamId);

          // Count this player's points played in this match
          const playedCount = scoped.length;
          if (playedCount === 0) return;

          // Resolve score from points
          const scoreA = matchPoints.filter(p => p.outcome === 'win_a').length;
          const scoreB = matchPoints.filter(p => p.outcome === 'win_b').length;

          outMatches.push({
            id: match.id,
            tid,
            tournamentName: tournament.name,
            opponent: opponentTeam?.name || opponentSt?.name || 'Unknown',
            date: match.date || null,
            scoreA, scoreB,
            playerIsHome,
            playedCount,
            isWin: playerIsHome ? scoreA > scoreB : scoreB > scoreA,
          });
        });
      }

      if (!cancelled) {
        setRaw({ playerPoints: outPlayerPoints, matches: outMatches, tournamentHeroTids });
        setDataLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [playerId, scopeParam, tidParam, midParam, lidParam, tournaments, layouts, teams]);

  // ─── Stats computation ──────────────────────────────────
  // Pick the field from the first playerPoint (for zone classification).
  // This is approximate when scope=global crosses multiple layouts — the
  // brief accepts this as the tradeoff for a single position breakdown.
  const statsField = raw.playerPoints[0]?.field || null;
  const stats = useMemo(() => computePlayerStats(raw.playerPoints, statsField),
    [raw.playerPoints, statsField]);

  const isHero = !!player?.hero || raw.tournamentHeroTids.length > 0;
  const scopedTournament = tidParam ? tournaments.find(t => t.id === tidParam) : null;

  // Lineup analytics — pair/trio win rates across all points the player played in.
  // Skip on match scope (sample too small) and build a flat point list where
  // `outcome` is normalized to 'win' / 'loss' from the player's perspective.
  // Filter to only combinations that include the viewed player — this page is
  // about THIS player's best partners, not the team's best combinations overall.
  const lineupStats = useMemo(() => {
    if (scopeParam === 'match') return null;
    const pts = raw.playerPoints.map(pp => ({
      players: pp.teamData?.players || [],
      assignments: pp.teamData?.assignments || [],
      outcome: pp.isWin ? 'win' : 'loss',
    }));
    const all = computeLineupStats(pts, statsField, players);
    if (!all || !playerId) return all;
    // Keep only combos where this player is part of the pair/trio.
    // pids = pair player IDs, centerPid = center player in trio.
    return all.filter(item => {
      const pids = item.pids || [];
      if (pids.includes(playerId)) return true;
      if (item.centerPid === playerId) return true;
      return false;
    });
  }, [raw.playerPoints, players, scopeParam, statsField, playerId, player]);

  // ─── Back target ────────────────────────────────────────
  const backTo = () => {
    if (window.history.length > 1) navigate(-1);
    else if (tidParam) navigate('/');
    else navigate(`/team/${player?.teamId || ''}`);
  };

  if (!player) {
    return (
      <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto' }}>
        <PageHeader back={{ to: backTo }} title={t('player_stats')} />
        {players.length === 0
          ? <Loading text="Loading player..." />
          : <EmptyState icon="?" text="Player not found" />}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        back={{ to: backTo }}
        title={player.name || 'Player'}
        subtitle={t('player_stats').toUpperCase()}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ─── Profile header ─────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '4px 0 8px',
        }}>
          <Avatar player={player} isHero={isHero} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontWeight: 700, fontSize: 20,
              color: COLORS.text, letterSpacing: '-0.02em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{player.name}</div>
            {playerTeam && (
              <div style={{
                fontFamily: FONT, fontSize: 12, fontWeight: 500,
                color: COLORS.textMuted, marginTop: 2,
              }}>{playerTeam.name}</div>
            )}
            {isHero && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                marginTop: 6, padding: '3px 8px', borderRadius: 6,
                background: '#f59e0b12', border: '1px solid #f59e0b20',
                fontFamily: FONT, fontSize: 10, fontWeight: 700,
                color: COLORS.accent, letterSpacing: '0.3px',
              }}>★ HERO</div>
            )}
          </div>
        </div>

        {/* ─── Scope pills (also serve as picker triggers) ─────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {/* Tournament scope */}
          {scopedTournament && (
            <ScopePill
              label={`Turniej: ${scopedTournament.name}`}
              active={scopeParam === 'tournament'}
              onClick={() => {
                if (scopeParam === 'tournament') return; // future: tournament picker
                navigate(`/player/${playerId}/stats?scope=tournament&tid=${scopedTournament.id}`);
              }}
            />
          )}
          {/* Training scope — when active, click opens picker */}
          {(scopeParam === 'training' || trainings.length > 0) && (() => {
            const tr = trainings.find(x => x.id === tidParam);
            const label = scopeParam === 'training' && tr
              ? `Trening: ${tr.date || 'Trening'}`
              : 'Trening';
            const isActive = scopeParam === 'training';
            return (
              <ScopePill
                label={label}
                active={isActive}
                hasMenu={isActive && trainings.length > 1}
                onClick={() => {
                  if (isActive) setPickerOpen('training');
                  else if (trainings.length) navigate(`/player/${playerId}/stats?scope=training&tid=${tidParam || trainings[0].id}`);
                }}
              />
            );
          })()}
          {/* Layout scope */}
          {layouts.length > 0 && (() => {
            const lay = layouts.find(l => l.id === lidParam);
            const label = scopeParam === 'layout' && lay
              ? `Layout: ${lay.name}${lay.year ? ` ${lay.year}` : ''}`
              : 'Layout';
            const isActive = scopeParam === 'layout';
            return (
              <ScopePill
                label={label}
                active={isActive}
                hasMenu={isActive && layouts.length > 1}
                onClick={() => {
                  if (isActive) setPickerOpen('layout');
                  else navigate(`/player/${playerId}/stats?scope=layout&lid=${lidParam || layouts[0].id}`);
                }}
              />
            );
          })()}
          {/* Global */}
          <ScopePill
            label={t('scope_global')}
            active={scopeParam === 'global'}
            onClick={() => navigate(`/player/${playerId}/stats?scope=global`)}
          />
          {scopeParam === 'match' && midParam && (
            <ScopePill label={t('scope_match')} active onClick={() => {}} />
          )}
        </div>

        {/* Training picker — bottom sheet */}
        <ActionSheet
          open={pickerOpen === 'training'}
          onClose={() => setPickerOpen(null)}
          actions={trainings
            .slice()
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .map(tr => ({
              label: `${tr.id === tidParam ? '✓ ' : ''}${tr.date || 'Trening'}${tr.status === 'closed' ? ' (zakończony)' : tr.status === 'live' ? ' · LIVE' : ''}`,
              onPress: () => navigate(`/player/${playerId}/stats?scope=training&tid=${tr.id}`),
            }))}
        />

        {/* Layout picker — bottom sheet */}
        <ActionSheet
          open={pickerOpen === 'layout'}
          onClose={() => setPickerOpen(null)}
          actions={layouts.map(l => ({
            label: `${l.id === lidParam ? '✓ ' : ''}${l.name}${l.league ? ` · ${l.league}` : ''}${l.year ? ` ${l.year}` : ''}`,
            onPress: () => navigate(`/player/${playerId}/stats?scope=layout&lid=${l.id}`),
          }))}
        />

        {/* Layout scope summary header — kept, gives context (point count) */}
        {scopeParam === 'layout' && lidParam && (() => {
          const layout = layouts.find(l => l.id === lidParam);
          const layoutTs = tournaments.filter(t => t.layoutId === lidParam);
          const sparingCount = layoutTs.filter(t => t.eventType === 'sparing').length;
          const tCount = layoutTs.filter(t => (t.eventType || 'tournament') === 'tournament').length;
          const subParts = [
            sparingCount > 0 && `${sparingCount} sparing`,
            tCount > 0 && `${tCount} tournament`,
            `${raw.playerPoints.length} pkt`,
          ].filter(Boolean);
          if (!subParts.length) return null;
          return (
            <div style={{
              padding: '8px 12px', background: COLORS.surfaceDark,
              border: '1px solid #1a2234', borderRadius: 8,
              fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
            }}>
              {subParts.join(' · ')}
            </div>
          );
        })()}

        {/* ─── Loading state ─────────────────────────── */}
        {dataLoading && <Loading text="Computing stats..." />}

        {!dataLoading && stats.played === 0 && (
          <EmptyState icon="?" text="No scouted points yet" subtitle="Scout matches with this player on the field to see stats." />
        )}

        {!dataLoading && stats.played > 0 && (
          <>
            {/* ─── A. PERFORMANCE — top hero metrics + secondary inline ─────── */}
            <GroupHeader emoji="📈" label="Performance" />
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            }}>
              <HeroMetric
                label="Win rate"
                value={stats.winRate ?? '—'}
                suffix={stats.winRate != null ? '%' : ''}
                color={winRateColor(stats.winRate)}
                sub={`${stats.wins}W · ${stats.losses}L`}
                barPct={stats.winRate}
              />
              <HeroMetric
                label="Survival"
                value={stats.survivalRate ?? '—'}
                suffix={stats.survivalRate != null ? '%' : ''}
                color={survivalColor(stats.survivalRate)}
                sub={stats.deathsTotal > 0 ? `${stats.deathsTotal} eliminacji` : 'bez eliminacji'}
                barPct={stats.survivalRate}
              />
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
            }}>
              <MetricChip label="Punkty" value={stats.played} />
              <MetricChip label="+/−" value={`${stats.wins - stats.losses > 0 ? '+' : ''}${stats.wins - stats.losses}`} />
              <MetricChip label="Kills" value={stats.kills} />
              <MetricChip label="K/pt" value={stats.killsPerPoint.toFixed(1)} />
            </div>

            {/* ─── B. STYL GRY — where & how they play ─────────────────────── */}
            {(stats.positions.length > 0 || stats.bunkers.length > 0 || stats.breakShots || stats.obstacleShots) && (
              <GroupHeader emoji="🎯" label="Styl gry" />
            )}

            {stats.positions.length > 0 && (
              <SubSection label="Preferowana pozycja">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {stats.positions.map(({ zone, count, pct }) => {
                    const color = zoneColor(zone);
                    return (
                      <BarRow key={zone}
                        label={zone}
                        labelColor={color}
                        pct={pct}
                        barColor={color}
                        right={`${pct}%`}
                        rightSub={`${count}/${stats.played}`}
                      />
                    );
                  })}
                </div>
              </SubSection>
            )}

            {stats.bunkers.length > 0 && (
              <SubSection label="Top break bunker"
                hint={stats.bunkers.length > 3 ? `+${stats.bunkers.length - 3} więcej` : null}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {stats.bunkers.slice(0, 3).map(({ name, count, pct }) => (
                    <BarRow key={name}
                      label={name}
                      labelColor={COLORS.accent}
                      pct={pct}
                      barColor={COLORS.accent}
                      right={`${pct}%`}
                      rightSub={`${count}/${stats.played}`}
                    />
                  ))}
                </div>
              </SubSection>
            )}

            {stats.breakShots && (
              <SubSection label={`Kierunek break shotów (${stats.breakShots.total})`}>
                <ShotBar dorito={stats.breakShots.dorito} center={stats.breakShots.center} snake={stats.breakShots.snake} />
              </SubSection>
            )}

            {stats.obstacleShots && (
              <SubSection label={`Kierunek obstacle shotów (${stats.obstacleShots.total})`}>
                <ShotBar dorito={stats.obstacleShots.dorito} center={stats.obstacleShots.center} snake={stats.obstacleShots.snake} />
              </SubSection>
            )}

            {/* ─── C. SŁABOŚCI — what goes wrong ──────────────────────────── */}
            {(stats.causes.length > 0 || stats.deathBunkers.length > 0) && (
              <GroupHeader emoji="☠️" label="Słabości" />
            )}

            {stats.causes.length > 0 && (
              <SubSection label={`Powód spadania (${stats.causesKnown} z ${stats.deathsTotal})`}
                hint={stats.causesKnown < stats.deathsTotal ? `${stats.deathsTotal - stats.causesKnown} bez kategorii` : null}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {stats.causes.map(({ id, count, pct }) => {
                    const meta = CAUSE_META[id] || { label: id, color: COLORS.textDim };
                    return (
                      <BarRow key={id}
                        label={meta.label}
                        labelColor={meta.color}
                        pct={pct}
                        barColor={meta.color}
                        right={`${pct}%`}
                        rightSub={`${count}`}
                      />
                    );
                  })}
                </div>
              </SubSection>
            )}

            {stats.deathBunkers.length > 0 && (
              <SubSection label="Najczęściej trafiane przeszkody"
                hint={stats.deathBunkers.length > 3 ? `+${stats.deathBunkers.length - 3} więcej` : null}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {stats.deathBunkers.slice(0, 3).map(({ name, count, pct }) => (
                    <BarRow key={name}
                      label={name}
                      labelColor={COLORS.danger}
                      pct={pct}
                      barColor={COLORS.danger}
                      right={`${pct}%`}
                      rightSub={`${count}`}
                    />
                  ))}
                </div>
              </SubSection>
            )}

            {/* ─── D. CHEMIA — pair/trio analytics ─────────────────────────── */}
            {lineupStats && lineupStats.length > 0 && (
              <>
                <GroupHeader emoji="🤝" label="Chemia składu" />
                <LineupStatsSection lineupStats={lineupStats} />
              </>
            )}

            {/* ─── E. HISTORIA MECZÓW ──────────────────────────────────────── */}
            {raw.matches.length > 0 && (
              <>
                <GroupHeader emoji="📊" label="Historia meczów" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {raw.matches.map(m => {
                    const badgeColor = m.isWin ? COLORS.success : COLORS.danger;
                    const badgeText = m.isWin ? 'W' : 'L';
                    const oppColor = m.opponentSquadKey ? squadColor(m.opponentSquadKey) : COLORS.textDim;
                    return (
                      <div
                        key={`${m.tid}-${m.id}`}
                        onClick={() => navigate(
                          m.isTraining
                            ? `/training/${m.tid}/matchup/${m.id}`
                            : `/tournament/${m.tid}/match/${m.id}`
                        )}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 14px', minHeight: 52,
                          background: COLORS.surfaceDark,
                          border: '1px solid #1a2234',
                          borderRadius: 12, cursor: 'pointer',
                        }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: `${badgeColor}18`,
                          border: `1px solid ${badgeColor}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: FONT, fontWeight: 800, fontSize: 13,
                          color: badgeColor,
                        }}>{badgeText}</div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {m.opponentSquadKey && (
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: oppColor, flexShrink: 0,
                            }} />
                          )}
                          <div style={{
                            fontFamily: FONT, fontSize: 13, fontWeight: 500,
                            color: COLORS.text, flex: 1, minWidth: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>vs <span style={{ color: oppColor, fontWeight: 700 }}>{m.opponent}</span></div>
                        </div>
                        {scopeParam === 'global' && m.tournamentName && m.tournamentName !== 'Training' && (
                          <div style={{
                            fontFamily: FONT, fontSize: 10, fontWeight: 500,
                            color: COLORS.textMuted,
                          }}>{m.tournamentName}</div>
                        )}
                        <div style={{
                          fontFamily: FONT, fontSize: 12, fontWeight: 700,
                          color: COLORS.textDim,
                        }}>{m.scoreA}–{m.scoreB}</div>
                        <div style={{
                          fontFamily: FONT, fontSize: 10, fontWeight: 600,
                          color: COLORS.textMuted, letterSpacing: '0.3px',
                          marginLeft: 4,
                        }}>{m.playedCount}p</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
