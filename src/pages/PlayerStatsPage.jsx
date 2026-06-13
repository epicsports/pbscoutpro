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
import TeamBadge from '../components/TeamBadge';
import { Loading, EmptyState, SectionLabel, Select, ActionSheet, DataSourcePill, Btn } from '../components/ui';
import LineupStatsSection from '../components/LineupStatsSection';
import { computeLineupStats } from '../utils/generateInsights';
import { squadName, squadColor, getSquadName } from '../utils/squads';
import { resolveFieldFull } from '../utils/helpers';
import { resolveZones } from '../utils/layoutZones';
import HeatmapCanvas from '../components/HeatmapCanvas';
import CanvasRailLayout from '../components/canvas/CanvasRailLayout';
import { usePlayers, useActiveTeams, useTournaments, useTrainings, useLayouts } from '../hooks/useFirestore';
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
import { leagueDisplayName } from '../hooks/useLeagues';
import { getSelfReportsForPlayer } from '../services/playerPerformanceTrackerService';
import { LogRow } from '../components/ppt/TodaysLogsList';
import ColdReviewFlow from '../components/selflog/ColdReviewFlow';
import { playerTeams } from '../utils/playerTeams';

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
function Avatar({ player, isHero, onPhotoClick }) {
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

  // Photo opens a full-image lightbox when present — PBLeagues photos are
  // usually head-to-toe shots tightly cropped by the 64px circle, so the
  // tap-to-enlarge restores the original framing.
  const clickableProps = photoURL && onPhotoClick ? {
    role: 'button',
    onClick: (e) => { e.stopPropagation(); onPhotoClick(photoURL); },
    style: { cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
  } : {};

  return (
    <div {...clickableProps} style={{ position: 'relative', flexShrink: 0, ...(clickableProps.style || {}) }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: photoURL ? COLORS.surfaceLight : hashColor,
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: FONT, fontWeight: 800, fontSize: 28, color: COLORS.white,
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
        fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.black,
        letterSpacing: '-.02em',
      }}>#{player?.number || '?'}</div>
      {isHero && (
        <div style={{
          position: 'absolute', top: -2, right: -2,
          width: 20, height: 20, borderRadius: '50%',
          background: COLORS.accent, border: `2px solid ${COLORS.bg}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: COLORS.black, fontWeight: 800,
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
      background: active ? COLORS.accentA08 : 'transparent',
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
      background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`,
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
      background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`,
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

  const { players, playersById, loading: playersLoading } = usePlayers();
  const { teams } = useActiveTeams();
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { layouts } = useLayouts();
  const { linkedPlayer, user } = useWorkspace();

  const player = playersById[playerId];
  const playerTeam = teams.find(t => t.id === player?.teamId);

  // §H3 no-eternal-loading — 12s ceiling on the catalog loading state.
  // useGatedCatalog always resolves, but if loading stays true indefinitely
  // (e.g. cold cache + network stall), the timeout flips to error state.
  const [playerLoadTimedOut, setPlayerLoadTimedOut] = useState(false);
  useEffect(() => {
    if (player) { setPlayerLoadTimedOut(false); return undefined; }
    const id = setTimeout(() => setPlayerLoadTimedOut(true), 12000);
    return () => clearTimeout(id);
  }, [player]);

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
    let cancelled = false;
    (async () => {
      // Brief STEP 1b — candidate set = trainings the player ATTENDED (scouted
      // roster) UNION trainings the player SELF-LOGGED in. Self-logging never
      // writes attendees[] (§ 70.9 — the selfReport is the only signal a self-
      // logger leaves), so the prior attendee-only default stranded self-loggers
      // on global scope with their self-logs invisible. Read-side union only —
      // no write-path change (option a). The selfReports read reuses the same
      // per-player subcollection query the Samoocena effect uses (no new index).
      const candidateIds = new Set(
        trainings
          .filter(tr => Array.isArray(tr.attendees) && tr.attendees.includes(playerId))
          .map(tr => tr.id),
      );
      try {
        const rs = await getSelfReportsForPlayer(playerId, null);
        rs.forEach(r => { if (r.trainingId) candidateIds.add(r.trainingId); });
      } catch { /* graceful — fall back to attended-only candidate set */ }
      if (cancelled || candidateIds.size === 0) return; // no history — stay global
      const latestTid = [...candidateIds]
        .map(id => trainings.find(tr => tr.id === id) || { id, date: '' })
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.id;
      if (!latestTid) return;
      navigate(`/player/${playerId}/stats?scope=training&tid=${latestTid}`, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [isSelfView, scopeRawParam, trainings, playerId, navigate]);

  // ─── Fetch all playerPoints + match metadata ──────────────
  // Strategy: walk every tournament (global) or just one (tournament/match),
  // fetch scouted teams, find ones whose roster contains this player, then
  // fetch their matches + points and normalize via buildPlayerPointsFromMatch.
  const [raw, setRaw] = useState({ playerPoints: [], matches: [], tournamentHeroTids: [] });
  const [dataLoading, setDataLoading] = useState(true);
  // § read-volume — the global scope walks EVERY tournament (~T·S discovery +
  // matches·points), which fired automatically on a TeamDetailPage roster tap
  // (?scope=global). Defer that heavy walk behind an explicit "Load all-time"
  // tap; bounded scopes (tournament/match/layout/training, one tid/lid) run
  // immediately. Reset on nav change so each player/scope re-gates.
  const [runHeavy, setRunHeavy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(null); // null | 'training' | 'layout' | 'tournament'

  // § 70.9 — "Samoocena": the player's own selfReports (self-logs). Separate
  // small read (per-player subcollection — no index). training scope filters
  // by tid; global = all; tournament/match scopes don't apply (PPT self-logs
  // are training-only) → empty → the section hides itself.
  const [selfReports, setSelfReports] = useState([]);
  const [photoLightbox, setPhotoLightbox] = useState(null); // url or null
  useEffect(() => {
    if (!playerId || (scopeParam !== 'training' && scopeParam !== 'global')) {
      setSelfReports([]);
      return undefined;
    }
    let cancelled = false;
    getSelfReportsForPlayer(playerId, scopeParam === 'training' ? tidParam : null)
      .then(rs => { if (!cancelled) setSelfReports(rs); })
      .catch(() => { if (!cancelled) setSelfReports([]); });
    return () => { cancelled = true; };
  }, [playerId, scopeParam, tidParam]);

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
            // collectionGroup query scoped server-side to playerId +
            // tournamentId (composite index shots(playerId,tournamentId)
            // deployed 2026-06-04, § read-volume B); source='self' refined
            // post-fetch.
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

            // ── Brief STEP 1a — orphan self-report fold (live self-log) ──────
            // The byMatchup walk above only covers points the player was
            // SCOUTED into. A player's OWN self-logs (W5: flat /selfReports/)
            // stay orphan — unbound, propagatedAt:null — until the § 70
            // propagator binds them into W4 (point.selfLogs / players[slot] +
            // shots subcollection) on matchup-merge / training-close. So
            // breakout stats showed nothing live. Fold every orphan report for
            // this training in as a synthetic free-play point: computePlayerStats
            // already has the self-log bridge (selfLog.breakout → bunker/position,
            // selfShots → break-shot pattern, outcome !== 'alive' → survival), so
            // a { selfLog, selfShots } entry aggregates identically to a coach-
            // scouted point — no new stats path (§ 27 Consistency).
            //
            // EXACTLY-ONCE across the close boundary — dedup key = propagatedAt.
            // Orphan (null) reports fold HERE; the propagator stamps propagatedAt
            // (non-null) AND writes the W4 representation in the same pass, so a
            // propagated report is counted via the byMatchup walk and EXCLUDED
            // here. Every report is represented exactly once, live or post-close.
            try {
              const reports = await getSelfReportsForPlayer(playerId, tid);
              reports
                .filter(r => !r.propagatedAt && !r.reviewDismissedAt && r.breakout?.bunker)
                .forEach(r => {
                  outPlayerPoints.push({
                    playerSlot: 0,
                    isWin: false,
                    outcome: null,     // free-play: excluded from win/loss; survival still counts
                    teamData: {},      // no coach scouting — eliminations[slot] absent
                    field: trainingField,
                    isTraining: true,
                    tournamentId: tid,
                    selfLog: {
                      breakout: r.breakout.bunker,
                      outcome: r.outcome,            // 'alive' | 'elim_break|midgame|endgame'
                      deathReason: r.outcomeDetail || null,
                    },
                    // § zone-shot dual-read: orphan reports may carry zone-shots
                    // ({zoneId, kill}) or legacy bunker-shots ({bunker, result}).
                    selfShots: Array.isArray(r.shots)
                      ? r.shots
                          .filter(s => s?.zoneId || s?.bunker)
                          .map(s => (s.zoneId
                            ? { targetZoneId: s.zoneId, kill: !!s.kill }
                            : { targetBunker: s.bunker, result: s.result || 'unknown' }))
                      : [],
                  });
                });
            } catch { /* graceful — scouted stats still render without the fold */ }
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

      // § read-volume — defer the unbounded global walk until the user opts in.
      // (Layout/tournament/match scopes are bounded and run as before.)
      if (scopeParam === 'global' && !runHeavy) {
        if (!cancelled) {
          setRaw({ playerPoints: [], matches: [], tournamentHeroTids: [] });
          setDataLoading(false);
        }
        return;
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
  }, [playerId, scopeParam, tidParam, midParam, lidParam, tournaments, layouts, teams, runHeavy]);

  // § read-volume — re-gate the global walk whenever the target changes.
  useEffect(() => { setRunHeavy(false); }, [playerId, scopeParam, tidParam, lidParam]);

  // ─── Stats computation ──────────────────────────────────
  // Pick the field from the first playerPoint (for zone classification).
  // This is approximate when scope=global crosses multiple layouts — the
  // brief accepts this as the tradeoff for a single position breakdown.
  const statsField = raw.playerPoints[0]?.field || null;
  const stats = useMemo(() => computePlayerStats(raw.playerPoints, statsField),
    [raw.playerPoints, statsField]);

  // § STAGE 2 (#3) — the player's OWN OUTGOING zone-shots → choropleth weights +
  // kill set, for the breakout heatmap below. OUTGOING = zones the player FIRED
  // at (self-logged ∪ scouted, unified by zoneId); distinct from any future
  // INCOMING ("hits on break", B3) layer. Frequency = bound zone tags from the
  // player's points (`teamData.zoneShots[slot]` — scouted + propagated self-log)
  // ∪ orphan self-logs (deduped by propagatedAt, mirroring the §108 fold). Kill
  // = any self-logged kill in that zone (kill is a self-stat on /selfReports/,
  // never an attribution input — §109.1).
  const outgoingZones = useMemo(() => {
    const freq = {};
    const kill = new Set();
    raw.playerPoints.forEach(pp => {
      const td = pp.teamData || {};
      const slot = pp.playerSlot;
      if (slot == null || slot < 0) return;
      [...(td.zoneShots?.[slot] || []), ...(td.zoneObstacleShots?.[slot] || [])]
        .forEach(zid => { if (zid) freq[zid] = (freq[zid] || 0) + 1; });
    });
    selfReports.forEach(r => {
      (Array.isArray(r.shots) ? r.shots : []).forEach(s => {
        if (!s?.zoneId) return;
        if (s.kill) kill.add(s.zoneId);
        if (!r.propagatedAt) freq[s.zoneId] = (freq[s.zoneId] || 0) + 1; // orphan only
      });
    });
    return { freq, kill: [...kill], hasAny: Object.keys(freq).length > 0 };
  }, [raw.playerPoints, selfReports]);
  const outgoingCalloutZones = useMemo(
    () => resolveZones(statsField?.layout).filter(z => Array.isArray(z?.polygon) && z.polygon.length >= 3),
    [statsField],
  );

  // § Part A — BREAKOUT-destination markers ("which obstacle I ran to") for the
  // heatmap above. Reuses HeatmapCanvas's position layer (SAME styling as the
  // scouting heatmap; outcome = the elim marker on eliminated-on-break). Each
  // point is built SINGLE-SLOT (only the player's break position) so only the
  // player's dots render. Position source: scouted/bound `bumpStops||players[slot]`,
  // ELSE the self-logged breakout bunker NAME → centroid (self-logs carry the
  // bunker name, not a position, until the §70 propagator binds it on close —
  // so without this, a self-logger sees NO breakout dot). Distinct from the
  // OUTGOING zone choropleth (shot-AT) — this is ran-TO. [follow-up: shared
  // marker module so drawPlayers + HeatmapCanvas change together — Jacek's "classes".]
  const breakoutPoints = useMemo(() => {
    const bunkers = statsField?.bunkers || statsField?.layout?.bunkers || [];
    const out = [];
    raw.playerPoints.forEach(pp => {
      const slot = pp.playerSlot;
      if (slot == null || slot < 0) return;
      let pos = pp.teamData?.bumpStops?.[slot] || pp.teamData?.players?.[slot] || null;
      if (!pos && pp.selfLog?.breakout && bunkers.length) {
        const b = bunkers.find(bb => (bb.positionName || bb.name) === pp.selfLog.breakout);
        if (b && typeof b.x === 'number') pos = { x: b.x, y: b.y };
      }
      if (!pos) return;
      const elim = !!(pp.teamData?.eliminations?.[slot])
        || (typeof pp.selfLog?.outcome === 'string' && pp.selfLog.outcome.startsWith('elim_'));
      const players = Array(5).fill(null); players[slot] = pos;
      const eliminations = Array(5).fill(false); eliminations[slot] = elim;
      const assignments = Array(5).fill(null); assignments[slot] = playerId;
      out.push({ side: 'A', players, bumpStops: [], eliminations, runners: [], assignments, timeline: [] });
    });
    return out;
  }, [raw.playerPoints, statsField, playerId]);

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
    const stillLoading = playersLoading && !playerLoadTimedOut;
    return (
      <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto' }} data-testid={stillLoading ? undefined : 'player-load-error'}>
        <PageHeader back={{ to: backTo }} title={t('player_stats')} />
        {stillLoading ? (
          <Loading text="Loading player..." />
        ) : (
          <>
            <EmptyState
              icon="⚠️"
              text={t('player_load_error')}
              subtitle={t('player_load_error_sub')}
            />
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <Btn variant="accent" onClick={() => { setPlayerLoadTimedOut(false); navigate(0); }}>{t('match_retry')}</Btn>
            </div>
          </>
        )}
      </div>
    );
  }

  // § 116 Stage 4.1 — in LANDSCAPE the breakout heatmap is promoted to the HERO
  // (CanvasRailLayout) and the report column moves to the rail BY REFERENCE
  // (`columnEl`); portrait is unchanged. `heatmapHeroEl` is the SAME canvas shown
  // inline in the portrait section (defined once, used in whichever branch renders).
  const landscape = device.isLandscape;
  const heatmapHeroEl = (outgoingZones.hasAny || breakoutPoints.length > 0) && statsField?.fieldImage ? (
    <HeatmapCanvas
      fieldImage={statsField.fieldImage}
      points={breakoutPoints}
      selectedPlayerId={playerId}
      phase="breakout"
      showPositions
      showShots={false}
      calloutZones={outgoingCalloutZones}
      calloutZoneWeights={outgoingZones.freq}
      calloutZoneKills={outgoingZones.kill}
    />
  ) : null;

  const pageHeaderEl = (
    <PageHeader
      back={{ to: backTo }}
      title={player.name || 'Player'}
      subtitle={t('player_stats').toUpperCase()}
    />
  );

  const columnEl = (
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ─── Cold-review entry (claim flow 1b, W4) — own player only;
              quiet at N=0 (renders nothing). ─────────────────────────── */}
        {isSelfView && (
          <ColdReviewFlow
            playerId={playerId}
            uid={user?.uid}
            teamId={player?.teamId || linkedPlayer?.teamId || null}
            layouts={layouts}
          />
        )}

        {/* ─── Profile header ─────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '4px 0 8px',
        }}>
          <Avatar player={player} isHero={isHero} onPhotoClick={setPhotoLightbox} />
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
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <TeamBadge team={playerTeam} size={18} />
                <span>{playerTeam.name}</span>
                {/* § 72 — multi-team badge: +N other memberships beyond the primary. */}
                {playerTeams(player).length > 1 && (
                  <span style={{
                    fontFamily: FONT, fontSize: 10, fontWeight: 700,
                    color: COLORS.textDim,
                    background: COLORS.surfaceDark,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 4, padding: '1px 5px',
                  }}>+{playerTeams(player).length - 1}</span>
                )}
              </div>
            )}
            {isHero && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                marginTop: 6, padding: '3px 8px', borderRadius: 6,
                background: COLORS.accentA12, border: `1px solid ${COLORS.accentA20}`,
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
            label: `${l.id === lidParam ? '✓ ' : ''}${l.name}${l.league ? ` · ${leagueDisplayName(l.league)}` : ''}${l.year ? ` ${l.year}` : ''}`,
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
              border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 8,
              fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
            }}>
              {subParts.join(' · ')}
            </div>
          );
        })()}

        {/* ─── Loading state ─────────────────────────── */}
        {dataLoading && <Loading text={t('player_stats_computing')} />}

        {/* § read-volume — global all-time walk is deferred; tap to run it. */}
        {!dataLoading && scopeParam === 'global' && !runHeavy && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            padding: '28px 16px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted, maxWidth: 280 }}>
              {t('player_stats_load_alltime_hint')}
            </div>
            <Btn variant="accent" onClick={() => setRunHeavy(true)}>{t('player_stats_load_alltime_btn')}</Btn>
          </div>
        )}

        {/* § 70.9 — empty state only when there is NOTHING (no coach points
            AND no self-logs); self-logs alone still render "Samoocena" below.
            Suppressed while the global walk is deferred (CTA shown above). */}
        {!dataLoading && stats.played === 0 && selfReports.length === 0
          && !(scopeParam === 'global' && !runHeavy) && (
          <EmptyState icon="?" text="No scouted points yet" subtitle={t('player_stats_empty_subtitle')} />
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

            {/* ─── § STAGE 2 (#3) — OUTGOING zone-shots breakout heatmap ──────
                The player's OWN zones fired at, as a per-player choropleth (fill
                ∝ frequency); kill-zones emphasized (stronger fill + red outline).
                OUTGOING only — kept distinct from any future INCOMING (B3) layer.
                Reuses HeatmapCanvas (no new canvas); points=[] → choropleth only. */}
            {/* Portrait: heatmap inline here. Landscape: it's the HERO instead
                (heatmapHeroEl), so this section is suppressed (§116 Stage 4.1). */}
            {!landscape && (outgoingZones.hasAny || breakoutPoints.length > 0) && statsField?.fieldImage && (
              <div>
                <SectionHeader t={t} source="scout+self" title={t('player_stats_zone_section_title')} />
                {heatmapHeroEl}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLORS.success }} />
                    {t('player_stats_legend_breakout')}
                  </span>
                  {outgoingZones.hasAny && (
                    <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>
                      {t('player_stats_legend_zones')}
                    </span>
                  )}
                  {outgoingZones.kill.length > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, border: `2px solid ${COLORS.danger}` }} />
                      {t('player_stats_legend_elim_zone')}
                    </span>
                  )}
                </div>
              </div>
            )}

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
                          border: `1px solid ${COLORS.surfaceLight}`,
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

        {/* § 70.9 "Samoocena" — the player's own self-logs. Rendered
            independently of coach-side stats: a player with self-logs but no
            scouted coach points (the common case) still sees them here. */}
        {!dataLoading && selfReports.length > 0 && (() => {
          // B10 — Samoocena rows span trainings, so each row gets an event
          // eyebrow. Build a one-shot trainingsById map (cheap; trainings
          // array is already in scope via useTrainings(). Tri-state:
          //   - trainingId set + training found      → name (string)
          //   - trainingId set + training missing/deleted → null (graceful orphan)
          //   - trainingId null/undefined            → null (true orphan)
          const trainingsById = {};
          for (const tr of trainings || []) {
            if (tr?.id) trainingsById[tr.id] = tr;
          }
          return (
            <div style={{ marginTop: 24 }}>
              <SectionHeader t={t} source={null} title={t('stats_samoocena')} />
              <div>
                {selfReports.map((r, idx) => {
                  const eventLabel = r.trainingId
                    ? (trainingsById[r.trainingId]?.name ?? null)
                    : null;
                  return (
                    <LogRow key={r.id} row={r}
                      ordinal={selfReports.length - idx} isPending={false}
                      eventLabel={eventLabel} />
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
  );

  // Photo lightbox — tap-to-enlarge for the profile avatar. PBLeagues photos are
  // usually head-to-toe shots tightly cropped by the 64px circle, so tapping opens
  // the full image. Click anywhere closes. (Valid in both orientations.)
  const photoLightboxEl = photoLightbox ? (
    <div
      onClick={() => setPhotoLightbox(null)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <img src={photoLightbox} alt=""
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '100%', maxHeight: '90dvh',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.6)',
          objectFit: 'contain', cursor: 'default',
        }} />
      <div
        onClick={() => setPhotoLightbox(null)}
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(0,0,0,.5)', color: COLORS.white,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontFamily: FONT, fontWeight: 700,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>×</div>
    </div>
  ) : null;

  // LANDSCAPE (with a heatmap to promote): field is the HERO, report column is the
  // rail (by reference). Collapses to the §116 strip on cramped tablet-landscape.
  if (landscape && heatmapHeroEl) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh', zIndex: 100, background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
        <CanvasRailLayout
          isLandscape
          aspect={16 / 10}
          railMin={200}
          header={pageHeaderEl}
          artifact={heatmapHeroEl}
          rail={columnEl}
          collapsed={{ tabs: [], count: null, onBack: backTo }}
        />
        {photoLightboxEl}
      </div>
    );
  }

  // PORTRAIT (and landscape without a heatmap) — the original stacked layout.
  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {pageHeaderEl}
      {columnEl}
      {photoLightboxEl}
    </div>
  );
}
