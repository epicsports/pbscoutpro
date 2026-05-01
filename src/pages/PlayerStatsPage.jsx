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
import { Loading, EmptyState, SectionLabel, Select, ActionSheet, DataSourcePill } from '../components/ui';
import LineupStatsSection from '../components/LineupStatsSection';
import { computeLineupStats } from '../utils/generateInsights';
import { squadName, squadColor, getSquadName } from '../utils/squads';
import { resolveFieldFull } from '../utils/helpers';
import { usePlayers, useTeams, useTournaments, useTrainings, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, ZONE_COLORS, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';
import { resolveField } from '../utils/helpers';
import {
  computePlayerStats,
  buildPlayerPointsFromMatch,
} from '../utils/playerStats';
import { winRateColor, plusMinusColor } from '../utils/colorScale';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';

// ─── Side detection helpers (§ 59.4) ───
// classifyPosition returns full zone labels like "Snake Base", "Dorito 50".
// For § 59 we collapse depth and key by side (Snake / Center / Dorito).
function sideOf(zone) {
  if (!zone) return 'Center';
  if (zone.startsWith('Snake')) return 'Snake';
  if (zone.startsWith('Dorito')) return 'Dorito';
  return 'Center';
}
function sideColor(side) {
  if (side === 'Snake') return ZONE_COLORS.snake;     // cyan
  if (side === 'Dorito') return ZONE_COLORS.dorito;   // orange
  return ZONE_COLORS.center;                          // slate
}
// Bunker name → side (parses prefix). Used by § 59.4 bunker cards.
function sideFromBunkerName(name) {
  if (!name) return 'Center';
  const lower = String(name).toLowerCase();
  if (lower.startsWith('snake')) return 'Snake';
  if (lower.startsWith('dorito')) return 'Dorito';
  return 'Center';
}
// Aggregate stats.positions ([{zone:"Snake Base", count, pct}, ...]) into
// side totals — collapses depth per § 59.7. Returns { Snake, Center, Dorito,
// total } where each side carries `count`. pct is recomputed against total.
function aggregateBySide(positions) {
  const acc = { Snake: 0, Center: 0, Dorito: 0 };
  let total = 0;
  (positions || []).forEach(p => {
    const s = sideOf(p.zone);
    acc[s] += p.count || 0;
    total += p.count || 0;
  });
  return { ...acc, total };
}

// ─── Player avatar helpers (§ 59.5 chemistry cards) ───
function getPlayerInitial(p) {
  return ((p?.nickname || p?.name || '?').trim()[0] || '?').toUpperCase();
}
function getPlayerColor(p, idx = 0) {
  return p?.color
    || (Array.isArray(COLORS.playerColors) ? COLORS.playerColors[idx % COLORS.playerColors.length] : null)
    || COLORS.surfaceLight;
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

// § 59 redesign: legacy MetricCard / HeroMetric / MetricChip / GroupHeader
// / SubSection helpers removed — replaced by uniform `MetricGridCell` for
// the six-card headline + `SectionHeader` (descriptive verb-phrase title +
// DataSourcePill) for every mid-page section.

// ─── BarRow — label + horizontal bar + right-aligned values ───
// § 59.1 — single repeated mid-section visual (used for "Zazwyczaj gra
// po stronie:", "Na breaku strzela:", "Na pierwszej przeszkodzie:",
// "Powód spadania:", "Najczęściej trafiane przeszkody:").
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

// § 59 redesign: survivalColor + ShotBar removed.
//   survivalColor → reuse `winRateColor` from src/utils/colorScale.js
//     (same 40/70 thresholds across QuickLog + PlayerStats — single mental
//     model governs both surfaces).
//   ShotBar (stacked horizontal bar with per-zone legend) → replaced by
//     three BarRow children inside "Na breaku strzela:" / "Na pierwszej
//     przeszkodzie gra w stronę:" sections (§ 59.1 single repeated visual).

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

// ─── § 59 helpers ───────────────────────────────────────────────
// SectionHeader: descriptive verb-phrase title + DataSourcePill on the
// right. Replaces the old emoji-prefixed `GroupHeader` + small label
// `SubSection` combo for clarity (per § 59.2).
function SectionHeader({ title, source, t }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 8, padding: '0 2px 8px',
    }}>
      <span style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 700,
        color: COLORS.text, letterSpacing: '-0.1px',
      }}>{title}</span>
      <DataSourcePill source={source} t={t} />
    </div>
  );
}

// § 59.9 — uniform 6-metric grid cell. Rate metrics get a 4px mini bar;
// count metrics get a transparent placeholder (alignment grid).
function MetricGridCell({ label, value, suffix, color, isRate, barPct, source, t }) {
  return (
    <div style={{
      background: COLORS.surfaceDark, border: '1px solid #1a2234',
      borderRadius: 12, padding: '14px 12px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
      minHeight: 88,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 9, fontWeight: 600,
        color: COLORS.textDim, letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontFamily: FONT, fontSize: 26, fontWeight: 800,
        color: color || COLORS.text, letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        {value ?? '—'}
        {value != null && suffix && (
          <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 1, opacity: 0.85 }}>{suffix}</span>
        )}
      </div>
      {/* Mini bar (4px) for rate metrics; transparent placeholder for counts. */}
      <div style={{
        height: 4, width: '100%', borderRadius: 2,
        background: isRate ? COLORS.surfaceLight : 'transparent',
        overflow: 'hidden', marginTop: 'auto',
      }}>
        {isRate && barPct != null && (
          <div style={{
            height: '100%', width: `${Math.max(0, Math.min(100, barPct))}%`,
            background: color || COLORS.accent,
          }} />
        )}
      </div>
      {source && (
        <div style={{ marginTop: 2 }}>
          <DataSourcePill source={source} t={t} />
        </div>
      )}
    </div>
  );
}

// § 59.4 — bunker card with played count + per-bunker survival rate.
function BunkerCard({ name, played, survivalRate, pct }) {
  const side = sideFromBunkerName(name);
  const barColor = sideColor(side);
  const survColor = winRateColor(survivalRate);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: COLORS.surfaceDark, border: '1px solid #1a2234',
      borderRadius: 10, minHeight: 56,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 15, fontWeight: 600,
        color: barColor, minWidth: 88,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{name}</div>
      <div style={{
        flex: 1, height: 5, background: COLORS.surfaceLight,
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${Math.max(0, Math.min(100, pct || 0))}%`,
          background: barColor,
        }} />
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        gap: 1, minWidth: 96,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>{played}</span>
          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, fontWeight: 600 }}>pkt</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: survColor }}>
            {survivalRate != null ? `${survivalRate}%` : '—'}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: COLORS.textDim, letterSpacing: '0.4px' }}>SURV</span>
        </div>
      </div>
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
  // Brief E Gap 5 — read raw scope param (null when absent) so the
  // self-view auto-default below can distinguish "user didn't specify"
  // from "user explicitly chose global".
  const scopeRawParam = searchParams.get('scope');
  const scopeParam = scopeRawParam || 'global';
  const tidParam = searchParams.get('tid') || null;
  const midParam = searchParams.get('mid') || null;
  const lidParam = searchParams.get('lid') || null;

  const { players } = usePlayers();
  const { teams } = useTeams();
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { layouts } = useLayouts();
  const { linkedPlayer } = useWorkspace();

  const player = players.find(p => p.id === playerId);
  const playerTeam = teams.find(t => t.id === player?.teamId);

  // Brief E Gap 5 — auto-default scope=training + latest tid for self-view.
  // Triggers only when (a) viewing own profile, (b) no ?scope= in URL, and
  // (c) trainings have loaded. Uses already-subscribed useTrainings() data
  // + client-side filter on attendees — no new Firestore query, no new
  // index needed (training docs carry attendees: [playerId,...] per § 32).
  // Falls through to default scope=global when player has no training
  // history (existing behavior). `replace: true` so back-nav from a self-
  // view stats page doesn't loop through the no-scope URL.
  const isSelfView = !!linkedPlayer && linkedPlayer.id === playerId;
  useEffect(() => {
    if (!isSelfView) return;
    if (scopeRawParam) return; // user explicitly chose a scope — respect it
    if (!Array.isArray(trainings) || trainings.length === 0) return;
    const ownTrainings = trainings
      .filter(tr => Array.isArray(tr.attendees) && tr.attendees.includes(playerId))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const latestTid = ownTrainings[0]?.id;
    if (!latestTid) return; // no training history — leave on default global
    navigate(`/player/${playerId}/stats?scope=training&tid=${latestTid}`, { replace: true });
  }, [isSelfView, scopeRawParam, trainings, playerId, navigate]);

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
            // Brief D Item (a): resolve full training doc + field for stats
            // computation (zone breakdown / bunker labels). Hotfix #6 squad
            // rename also lives on training.squadNames — needed by Item (c)
            // getSquadName below for opponent label.
            const trainingDoc = trainings.find(x => x.id === tid) || tr;
            const syntheticTournament = { id: tid, layoutId: trainingDoc?.layoutId || null };
            const trainingField = resolveFieldFull(syntheticTournament, layouts);
            let trainingPoints = [];
            try { trainingPoints = await ds.fetchAllTrainingPoints(tid); } catch { continue; }

            // Brief D Item (b): fetch self-log shots for this training.
            // KIOSK writes per-shot docs to points/{pid}/shots/ with
            // source: 'self', playerId, tournamentId: trainingId. One
            // collectionGroup query covers entire training. Filter by
            // playerId only (single-field index already deployed per
            // PLAYER_SELFLOG.md); refine post-fetch to source='self' +
            // tournamentId=tid (avoid composite index).
            let selfLogShots = [];
            try {
              selfLogShots = await ds.fetchSelfLogShotsForPlayer(playerId, tid);
            } catch { /* graceful — stats still work without self-log */ }
            const selfShotsByPoint = {};
            selfLogShots.forEach(sh => {
              if (!sh.pointId) return;
              (selfShotsByPoint[sh.pointId] ||= []).push(sh);
            });

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
              // Brief D Item (a): pass resolved training field instead of
              // null. computePlayerStats uses field.discoLine/zeekerLine for
              // dorito/center/snake classification + field.bunkers for
              // bunker labeling. Without this, training scope showed empty
              // zone breakdown + no bunker labels (audit finding).
              // Brief D Item (b): attach selfLog (point.selfLogs[playerId])
              // and selfShots (subcoll docs for this point) so
              // computePlayerStats can supplement coach-side data with
              // KIOSK-saved self-log records — long-term goal "gracz po
              // self-logu w KIOSK widzi swoje statystyki".
              }).map(pp => {
                const pointDoc = mPoints.find(p => p.id === pp.pointId);
                return {
                  ...pp,
                  tournamentId: tid,
                  field: trainingField,
                  isTraining: true,
                  selfLog: pointDoc?.selfLogs?.[playerId] || null,
                  selfShots: selfShotsByPoint[pp.pointId] || [],
                };
              });
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
              // Brief D Item (c): respect § 53 custom squad names.
              // getSquadName(training, key) reads training.squadNames[key] when
              // present (custom name set via SquadEditor rename modal) and
              // falls back to legacy R1-R5 via squadName() for trainings
              // pre-§ 53. Was hard-coded to legacy squadName() which ignored
              // custom names after Hotfix #6 squad-rename merge.
              const oppLabel = oppKey ? getSquadName(trainingDoc, oppKey) : (playerInHome ? 'Away' : 'Home');
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

        {!dataLoading && stats.played > 0 && (() => {
          // § 59.7: collapse position-zone depth into side totals.
          const sides = aggregateBySide(stats.positions);
          const plusMinus = stats.wins - stats.losses;
          return (
          <>
            {/* ─── § 59.9 — six-metric headline grid ──────────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',  // 3×2 mobile (and tablet — 6×1 escape via media is future polish)
              gap: 10,
            }}>
              <MetricGridCell t={t}
                label={t('stats_metric_win_rate')}
                value={stats.winRate ?? '—'}
                suffix={stats.winRate != null ? '%' : ''}
                color={winRateColor(stats.winRate)}
                isRate barPct={stats.winRate}
                source="scout"
              />
              <MetricGridCell t={t}
                label={t('stats_metric_survival')}
                value={stats.survivalRate ?? '—'}
                suffix={stats.survivalRate != null ? '%' : ''}
                color={winRateColor(stats.survivalRate)}
                isRate barPct={stats.survivalRate}
                source="scout+self"
              />
              <MetricGridCell t={t}
                label={t('stats_metric_punkty')}
                value={stats.played}
                source="scout+self"
              />
              <MetricGridCell t={t}
                label={t('stats_metric_plusminus')}
                value={`${plusMinus > 0 ? '+' : ''}${plusMinus}`}
                color={plusMinusColor(plusMinus)}
                source="scout"
              />
              <MetricGridCell t={t}
                label={t('stats_metric_kills')}
                value={stats.kills}
                source="scout"
              />
              <MetricGridCell t={t}
                label={t('stats_metric_kpt')}
                value={stats.killsPerPoint.toFixed(1)}
                source="scout"
              />
            </div>

            {/* ─── § 59.2 "Zazwyczaj gra po stronie:" ─────────────────────── */}
            {sides.total > 0 && (
              <div>
                <SectionHeader t={t} source="scout+self" title={t('stats_zazwyczaj_gra_po_stronie')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { key: 'Snake',  label: 'Snake',   count: sides.Snake,  color: ZONE_COLORS.snake },
                    { key: 'Center', label: 'Centrum', count: sides.Center, color: ZONE_COLORS.center },
                    { key: 'Dorito', label: 'Dorito',  count: sides.Dorito, color: ZONE_COLORS.dorito },
                  ].map(s => {
                    const pct = sides.total > 0 ? Math.round((s.count / sides.total) * 100) : 0;
                    return (
                      <BarRow key={s.key}
                        label={s.label} labelColor={s.color}
                        pct={pct} barColor={s.color}
                        right={`${pct}%`}
                        rightSub={`(${s.count})`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── § 59.4 "Najczęściej zaczyna grę na:" — top 3 bunker cards z survival ─── */}
            {stats.bunkers.length > 0 && (
              <div>
                <SectionHeader t={t} source="scout+self" title={t('stats_najczesciej_zaczyna_gre_na')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {stats.bunkers.slice(0, 3).map(b => (
                    <BunkerCard key={b.name}
                      name={b.name}
                      played={b.played ?? b.count}
                      survivalRate={b.survivalRate}
                      pct={b.pct}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─── § 59.2 "Na breaku strzela:" ────────────────────────────── */}
            {stats.breakShots && (
              <div>
                <SectionHeader t={t} source="scout+self" title={t('stats_na_breaku_strzela')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { key: 'snake',  label: 'Snake',   pct: stats.breakShots.snake,  color: ZONE_COLORS.snake },
                    { key: 'center', label: 'Centrum', pct: stats.breakShots.center, color: ZONE_COLORS.center },
                    { key: 'dorito', label: 'Dorito',  pct: stats.breakShots.dorito, color: ZONE_COLORS.dorito },
                  ].map(s => (
                    <BarRow key={s.key}
                      label={s.label} labelColor={s.color}
                      pct={s.pct} barColor={s.color}
                      right={`${s.pct}%`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─── § 59.3/59.6 "Na pierwszej przeszkodzie gra w stronę:" — scout-only ─── */}
            {stats.obstacleShots && (
              <div>
                <SectionHeader t={t} source="scout-only" title={t('stats_na_pierwszej_przeszkodzie')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { key: 'snake',  label: 'Snake',   pct: stats.obstacleShots.snake,  color: ZONE_COLORS.snake },
                    { key: 'center', label: 'Centrum', pct: stats.obstacleShots.center, color: ZONE_COLORS.center },
                    { key: 'dorito', label: 'Dorito',  pct: stats.obstacleShots.dorito, color: ZONE_COLORS.dorito },
                  ].map(s => (
                    <BarRow key={s.key}
                      label={s.label} labelColor={s.color}
                      pct={s.pct} barColor={s.color}
                      right={`${s.pct}%`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─── § 59.2 "Powód spadania:" ───────────────────────────────── */}
            {stats.causes.length > 0 && (
              <div>
                <SectionHeader t={t} source="scout+self" title={t('stats_powod_spadania')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {stats.causes.map(({ id, count, pct }) => {
                    const meta = CAUSE_META[id] || { label: id, color: COLORS.textDim };
                    return (
                      <BarRow key={id}
                        label={meta.label} labelColor={COLORS.text}
                        pct={pct} barColor={meta.color}
                        right={`${pct}%`}
                        rightSub={`(${count})`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── § 59.6 "Najczęściej trafiane przeszkody:" — scout-only ─── */}
            {stats.deathBunkers.length > 0 && (
              <div>
                <SectionHeader t={t} source="scout-only" title={t('stats_najczesciej_trafiane')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {stats.deathBunkers.slice(0, 3).map(({ name, count, pct }) => {
                    const labelCol = sideColor(sideFromBunkerName(name));
                    return (
                      <BarRow key={name}
                        label={name} labelColor={labelCol}
                        pct={pct} barColor={COLORS.danger}
                        right={`${count}×`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── § 59.5 Chemia składu — duo + trio with overlapping avatars ─── */}
            {lineupStats && lineupStats.length > 0 && (
              <LineupStatsSection lineupStats={lineupStats} t={t} />
            )}

            {/* ─── § 59.8 "Historia meczów" — Zagranych: N format ─────────── */}
            {raw.matches.length > 0 && (
              <div>
                <SectionHeader t={t} source={null} title={t('stats_historia_meczow')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                          padding: '13px 16px', minHeight: 52,
                          background: COLORS.surfaceDark,
                          border: '1px solid #1a2234',
                          borderRadius: 10, cursor: 'pointer',
                        }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 5,
                          background: `${badgeColor}33`,
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
                            fontFamily: FONT, fontSize: 14, fontWeight: 500,
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
                          display: 'flex', alignItems: 'baseline', gap: 4,
                          marginLeft: 4,
                        }}>
                          <span style={{
                            fontFamily: FONT, fontSize: 12, fontWeight: 500,
                            color: COLORS.textMuted,
                          }}>{t('stats_zagranych')}</span>
                          <span style={{
                            fontFamily: FONT, fontSize: 14, fontWeight: 700,
                            color: COLORS.text,
                          }}>{m.playedCount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
          );
        })()}
      </div>
    </div>
  );
}
