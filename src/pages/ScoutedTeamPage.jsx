import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import HeatmapCanvas from '../components/HeatmapCanvas';
import PageHeader from '../components/PageHeader';
import PlayerAvatar from '../components/PlayerAvatar';
import TeamBadge from '../components/TeamBadge';
import { Btn, EmptyState, Input, Modal, Icons, ConfirmModal, Score, ResultBadge, SideTag, SegmentedControl } from '../components/ui';
import { NotatkiSection, AddNoteSheet } from '../components/CoachNotes';
import { useTournaments, useActiveTeams, useScoutedTeams, useMatches, usePlayers, useLayouts, useNotes } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { mirrorPointToLeft } from '../utils/helpers';
import { computeCoachingStats } from '../utils/coachingStats';
import { generateInsights, generateCounters, computeBreakSurvival, computeSideTendency, computeTopHeroes, computeTacticalSignals, computeShotTargets, computeCalloutZoneTargets, computeBigMoves, computeEliminationReasons, INSIGHT_COLORS, INSIGHT_ICONS, COUNTER_COLORS } from '../utils/generateInsights';
import { ELIM_REASONS } from '../components/match/ReasonRadial';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, responsive } from '../utils/theme';
import { useField } from '../hooks/useField';
import { useUserNames, fallbackScoutLabel } from '../hooks/useUserNames';
import { useLanguage } from '../hooks/useLanguage';
import { Footprints, Crosshair, Route, Medal, Zap, Pencil, Skull } from 'lucide-react';
import { resolveZones } from '../utils/layoutZones';
import DrawingOverlay, { STROKE_COLORS, STROKE_SIZES } from '../components/canvas/DrawingOverlay';
import DrawToolbar from '../components/canvas/DrawToolbar';
import FullscreenToggle from '../components/canvas/FullscreenToggle';
import CanvasRailLayout from '../components/canvas/CanvasRailLayout';
import { RailZone, RailToggleList, RailItemList } from '../components/canvas/RailZones';
import FieldPhaseControl from '../components/canvas/FieldPhaseControl';
import { FIELD_LAYERS } from '../components/canvas/fieldViewConfig';
import { strokesToFirestore, strokesFromFirestore, eraseAcrossStrokes } from '../components/canvas/drawStrokes';
import SearchFilterPanel from '../components/SearchFilterPanel';
import { matchEntity, playerInDivision, playerDivisionSet } from '../utils/entityFilters';

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
      border: `1px solid ${COLORS.surfaceLight}`,
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
    // § OSTRZAŁ 3a (D1) — callout-zone tags count as a declared shot too, so
    // the reliability banner reflects callout coverage alongside bands.
    const zs = pt.zoneShots || [];
    const zos = pt.zoneObstacleShots || [];
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
        const hasBasic = (qs[i] && qs[i].length > 0) || (os[i] && os[i].length > 0)
          || (zs[i] && zs[i].length > 0) || (zos[i] && zos[i].length > 0);
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
  const { tournaments, loading: tournamentsLoading } = useTournaments();
  const { teams, loading: teamsLoading } = useActiveTeams();
  const { players, playersById } = usePlayers();
  const { scouted, loading: scoutedLoading } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { layouts } = useLayouts();
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterDiv, setRosterDiv] = useState(''); // § Stage C — add-player Dywizja filter
  const [showRoster, setShowRoster] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [allHeatmapPoints, setAllHeatmapPoints] = useState([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  // No-eternal-loading guard: if tournament/team never resolve, flip to an error
  // state after a bounded wait instead of spinning forever (the 2026-06-11
  // scouted-team bug — a createdAt-less scouted doc made the entry permanently
  // absent). Class-wide rule for data-gated detail pages (rollout: NEXT_TASKS arc B).
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeParam = searchParams.get('scope') || 'tournament';
  const matchIdParam = searchParams.get('mid') || null;
  const isLayoutScope = scopeParam === 'layout';
  const isLastMatchScope = scopeParam === 'lastMatch';
  const isMatchScope = scopeParam === 'match' && !!matchIdParam;
  const isTournamentScope = !isLayoutScope && !isLastMatchScope && !isMatchScope;
  const [matchPickerOpen, setMatchPickerOpen] = useState(false);
  const [hmShowPositions, setHmShowPositions] = useState(true);
  const [hmShowShots, setHmShowShots] = useState(true);
  // § OSTRZAŁ — zones are now INTRINSIC per mode (no "Strefy" toggle): the
  // frequency choropleth always renders for the active phase. The former
  // `hmShowZones` toggle was removed with the mode-GROUP redesign.
  // § Stage 2 — coach 3-way axis: 'break' | 'settle' | 'mid'. Break = kf#0
  // (default); Settle = the post-break stage (kf#0 settled / Stage-1 obstacle
  // compat ?? timeline.settle); Mid = timeline.mid (gated on availability).
  const [hmPhase, setHmPhase] = useState('break');
  // § OSTRZAŁ B3 — per-player isolation (roster player id | null).
  const [hmSelectedPlayer, setHmSelectedPlayer] = useState(null);
  // § Stage 6-lite — replay animation toggle (OFF by default; on-demand).
  const [hmReplay, setHmReplay] = useState(false);
  const [heatmapExpanded, setHeatmapExpanded] = useState(true);

  // § 81 ScoutedTeam immersive — heatmap-region full-viewport overlay.
  // Local state, DECOUPLED from useLandscapeMode / isLandscape: rotation
  // does NOT auto-promote (ScoutedTeam is a scroll-dashboard, not a
  // canvas-page; entry is explicit via Maximize2 on the expanded region).
  // Inline ↔ fixed-overlay is a single wrapper-style swap on the same JSX
  // subtree → no remount, draw state + canvas DOM preserved across enter/
  // exit. Scroll position saved on enter, restored on exit.
  const [heatmapFullscreen, setHeatmapFullscreen] = useState(false);
  const scrollContainerRef = useRef(null);
  const scrollTopBeforeFsRef = useRef(0);
  const enterHeatmapFs = () => {
    if (scrollContainerRef.current) {
      scrollTopBeforeFsRef.current = scrollContainerRef.current.scrollTop;
    }
    setHeatmapFullscreen(true);
  };
  const exitHeatmapFs = () => {
    setHeatmapFullscreen(false);
    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollTopBeforeFsRef.current;
      }
    });
  };
  // § 78 Stage 2 — annotation layer toggles.
  //   2a Plan coacha: editable per scouted-team, canonical coords, default ON.
  //   2b Notatki scouta: aggregated read-only from point.annotations,
  //                      mirrored upstream, default OFF (additive context).
  const [hmShowCoachPlan, setHmShowCoachPlan] = useState(true);
  const [hmShowAnnotations, setHmShowAnnotations] = useState(false);

  // § 78 2a — coach plan draw state. `coachStrokes` is the local editing
  // copy (initialized from scoutedEntry.annotations on mount + on any
  // remote update). drawMode hides the saved-set in HeatmapCanvas while
  // DrawingOverlay shows the live edit on top (no double rendering).
  const [coachDrawMode, setCoachDrawMode] = useState(false);
  const [coachStrokes, setCoachStrokes] = useState([]);
  const [coachRedo, setCoachRedo] = useState([]);
  const [coachCurrent, setCoachCurrent] = useState(null);
  const [coachColor, setCoachColor] = useState(STROKE_COLORS[0].value);
  const [coachSizeKey, setCoachSizeKey] = useState('medium');
  const [coachEraser, setCoachEraser] = useState(false);
  const [coachSaving, setCoachSaving] = useState(false);
  const [deleteMatchModal, setDeleteMatchModal] = useState(null); // { id, name }
  const [showAdditional, setShowAdditional] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deleteNoteConfirm, setDeleteNoteConfirm] = useState(null); // noteId

  const { user, workspace, roles, isAdmin } = useWorkspace();
  const userId = user?.uid || null;
  const userName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Scout');
  // Legacy single-role shim for CoachNotes author label. REAL roles on
  // purpose — note authorship reflects the actual user, not an impersonated
  // role from the View Switcher (§ 38.5).
  const userRole = isAdmin ? 'admin'
    : roles.includes('coach') ? 'coach'
    : roles.includes('scout') ? 'scout'
    : roles.includes('viewer') ? 'viewer'
    : roles.includes('player') ? 'player'
    : 'coach';
  const { notes } = useNotes(tournamentId, scoutedId);

  const tournament = tournaments.find(t => t.id === tournamentId);
  const scoutedEntry = scouted.find(s => s.id === scoutedId);
  const team = teams.find(t => t.id === scoutedEntry?.teamId);

  // No-eternal-loading: once resolved, clear the timeout; while unresolved, arm a
  // 12s ceiling → after which we show the error state even if a subscription
  // never emits. (Subscriptions normally resolve in <1s; this is a safety net.)
  useEffect(() => {
    if (tournament && team) { setLoadTimedOut(false); return undefined; }
    const id = setTimeout(() => setLoadTimedOut(true), 12000);
    return () => clearTimeout(id);
  }, [tournament, team]);
  const teamMatches = useMemo(
    () => matches.filter(m => m.teamA === scoutedId || m.teamB === scoutedId),
    [matches, scoutedId]
  );

  // § 60.6 — last completed match for "Ostatni mecz" scope.
  // Sort by updatedAt/completedAt (Firestore Timestamp) then date string,
  // pick newest. Returns null if no closed matches.
  const lastMatch = useMemo(() => {
    const closed = teamMatches.filter(m => m.status === 'closed');
    if (!closed.length) return null;
    const keyOf = (m) =>
      m.updatedAt?.toMillis?.() || m.completedAt?.toMillis?.() || m.date || '';
    return closed.slice().sort((a, b) => {
      const ak = keyOf(a), bk = keyOf(b);
      return bk > ak ? 1 : bk < ak ? -1 : 0;
    })[0];
  }, [teamMatches]);

  // § 60.6 — match-id filter resolved from scope. Layout scope spans
  // multiple tournaments so match-id filter is ignored there.
  const filterMatchId = isMatchScope
    ? matchIdParam
    : isLastMatchScope
      ? (lastMatch?.id || null)
      : null;

  const heatmapPoints = useMemo(() => {
    if (!filterMatchId) return allHeatmapPoints;
    return allHeatmapPoints.filter(pt => pt.matchId === filterMatchId);
  }, [allHeatmapPoints, filterMatchId]);
  // § Stage 6-lite — replay is playable only when ≥1 point carries Settle/Mid
  // keyframes (timeline[] holds only those; Break is keyframe #0). One stage
  // keyframe + Break = ≥2 keyframes to animate.
  const canReplay = useMemo(
    () => heatmapPoints.some(p => Array.isArray(p.timeline) && p.timeline.length > 0),
    [heatmapPoints]
  );
  // § Stage 2 — Mid is the only gated MODE segment. Break + Settle are always
  // available (every point has a settled/post-break view via kf#0); Mid only
  // when ≥1 point captured a mid keyframe.
  const hasMid = useMemo(
    () => heatmapPoints.some(p => Array.isArray(p.timeline) && p.timeline.some(e => e?.stage === 'mid')),
    [heatmapPoints]
  );
  // § dup-cleanup Part 2a — dedup the roster by RESOLVED canonical id. playersById
  // is alias-aware (alias + canonical ids both resolve to the same doc), so a
  // roster holding [survivor, alias] for one person would render the player twice.
  // Keep first occurrence per canonical id → renders once; also makes
  // remove-from-roster behave (no leftover twin).
  const roster = (() => {
    const seen = new Set();
    const out = [];
    (scoutedEntry?.roster || []).forEach(pid => {
      const p = playersById[pid];
      if (!p || seen.has(p.id)) return;
      seen.add(p.id);
      out.push(p);
    });
    return out;
  })();

  // § 78 Stage 2 (2a) — sync local coach strokes from Firestore. Runs on
  // mount + whenever the scouted doc's annotations field changes (e.g.,
  // remote update from another coach on the same team). NOT during local
  // drawMode editing (would clobber the in-progress edit).
  useEffect(() => {
    if (coachDrawMode) return;
    setCoachStrokes(strokesFromFirestore(scoutedEntry?.annotations));
    setCoachRedo([]);
    setCoachCurrent(null);
  }, [scoutedEntry?.annotations, coachDrawMode]);

  // § 78 2a — draw consumer handlers. Same pattern as MatchPage Stage 1
  // (eraser radius scales with selected stroke size; 1000×500 reference
  // field keeps the feel constant regardless of canvas size). Coach plan
  // coords are CANONICAL (no mirror at write time, no mirror at read).
  const COACH_ERASER_REF_W = 1000;
  const COACH_ERASER_REF_H = 500;
  const handleCoachDrawStart = (pos) => {
    if (coachEraser) {
      const radiusPx = STROKE_SIZES[coachSizeKey] * 2;
      setCoachStrokes(prev => eraseAcrossStrokes(prev, pos, radiusPx, COACH_ERASER_REF_W, COACH_ERASER_REF_H));
      setCoachRedo([]);
      return;
    }
    setCoachCurrent({ color: coachColor, size: STROKE_SIZES[coachSizeKey], pts: [pos] });
  };
  const handleCoachDrawMove = (pos) => {
    if (coachEraser) {
      const radiusPx = STROKE_SIZES[coachSizeKey] * 2;
      setCoachStrokes(prev => eraseAcrossStrokes(prev, pos, radiusPx, COACH_ERASER_REF_W, COACH_ERASER_REF_H));
      return;
    }
    setCoachCurrent(prev => (prev ? { ...prev, pts: [...prev.pts, pos] } : prev));
  };
  const handleCoachDrawEnd = () => {
    if (coachEraser) return;
    setCoachCurrent(prev => {
      if (!prev || prev.pts.length < 2) return null;
      setCoachStrokes(p => [...p, prev]);
      setCoachRedo([]);
      return null;
    });
  };
  const handleCoachDrawAbort = () => setCoachCurrent(null);
  const handleCoachUndo = () => {
    setCoachStrokes(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setCoachRedo(r => [...r, last]);
      return prev.slice(0, -1);
    });
  };
  const handleCoachRedo = () => {
    setCoachRedo(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setCoachStrokes(s => [...s, last]);
      return prev.slice(0, -1);
    });
  };
  const handleCoachClear = () => { setCoachStrokes([]); setCoachRedo([]); };
  const enterCoachDrawMode = () => { setCoachEraser(false); setCoachCurrent(null); setCoachDrawMode(true); };
  const exitCoachDrawMode = async () => {
    setCoachCurrent(null);
    setCoachEraser(false);
    setCoachDrawMode(false);
    // Persist via the existing scouted-team updater. updateScoutedTeam
    // stamps updatedAt; serializing here means we don't fight the load
    // effect (which is gated by !coachDrawMode and re-syncs on the next
    // snapshot anyway).
    if (!tournamentId || !scoutedId) return;
    setCoachSaving(true);
    try {
      await ds.updateScoutedTeam(tournamentId, scoutedId, { annotations: strokesToFirestore(coachStrokes) });
    } catch (e) {
      console.error('Coach plan save failed:', e);
    } finally {
      setCoachSaving(false);
    }
  };

  // Load tournament heatmap points — useEffect MUST be before any early return.
  // In layout scope, aggregate across every tournament sharing the same layoutId.
  const teamId = scoutedEntry?.teamId;
  const currentLayoutId = tournament?.layoutId;
  useEffect(() => {
    if (!tournamentId) { setAllHeatmapPoints([]); return; }
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
      // § Stage 6-lite (6L-0) — carry the additive Settle/Mid keyframes so the
      // replay animation (and Stage 2.5 coach-report) can read per-stage data.
      // Not a new fetch: the full point doc (incl. timeline[]) is already in
      // memory; the mapper just stops stripping it. Each keyframe's matching
      // side is reduced + mirrored to the SAME left-canonical space as
      // keyframe #0 (homeData/awayData) so layers align by slotId. Stage
      // keyframes share kf#0's fieldSide (buildTimeline never stamps one).
      const timeline = (Array.isArray(pt.timeline) ? pt.timeline : []).map(e => {
        const kf = isA ? e?.home : e?.away;
        if (!kf) return null;
        const m = mirrorPointToLeft(kf, sideFieldSide);
        return {
          stage: e.stage,
          players: m.players || [],
          bumpStops: m.bumpStops || [],
          eliminations: kf.eliminations || [],
          // § Stage 2 — per-stage carry for the 3-way coach axis: elimination
          // positions (mirrored like players) + per-keyframe zone/band shots
          // (zone ids / direction strings → no coord mirror). Enables Settle/Mid
          // positions + zones + elimination-positions in the aggregate.
          eliminationPositions: m.eliminationPositions || [],
          zoneShots: ds.quickShotsFromFirestore(kf.zoneShots),
          quickShots: ds.quickShotsFromFirestore(kf.quickShots),
          runners: kf.runners || [],
          assignments: kf.assignments || [],
          slotIds: kf.slotIds || [],
          // § Stage 2.5 — carry the captured-but-previously-DROPPED elimination
          // reasons (2b taxonomy, per slot keyed by slotIds) so the coach report's
          // per-stage reason breakdown can read them. Codes only → no mirroring.
          eliminationReasons: kf.eliminationReasons || [],
        };
      }).filter(Boolean);
      // § 101 forward-compat — the coach "post-break" shot source resolves to
      // the Settle keyframe's quick/zone shots when a settle keyframe exists,
      // else the legacy kf#0 obstacle* fields (old points still render). Break
      // source stays kf#0 quickShots/zoneShots. Shots are zone-id/direction
      // strings → no coord mirroring needed.
      const settleEntry = (Array.isArray(pt.timeline) ? pt.timeline : []).find(e => e?.stage === 'settle');
      const settleSide = settleEntry ? (isA ? settleEntry.home : settleEntry.away) : null;
      const obstacleSrc = settleSide ? settleSide.quickShots : data.obstacleShots;
      const zoneObstacleSrc = settleSide ? settleSide.zoneShots : data.zoneObstacleShots;
      return {
        ...mirrored,
        shots: ds.shotsFromFirestore(data.shots),
        assignments: data.assignments || [],
        eliminations: data.eliminations || [],
        bumpStops: data.bumpStops || [],
        runners: data.runners || [],
        quickShots: ds.quickShotsFromFirestore(data.quickShots),
        obstacleShots: ds.quickShotsFromFirestore(obstacleSrc),
        // § OSTRZAŁ 3a — carry callout-zone tags (zone ids, no mirroring needed)
        zoneShots: ds.quickShotsFromFirestore(data.zoneShots),
        zoneObstacleShots: ds.quickShotsFromFirestore(zoneObstacleSrc),
        opponentEliminations: oppMirrored?.eliminations || oppData?.eliminations || [],
        opponentPlayers: oppMirrored?.players || oppData?.players || [],
        matchId: pt.matchId,
        scoutedBy: data.scoutedBy || null,
        outcome,
        timeline,
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
            setAllHeatmapPoints(all);
            setHeatmapLoading(false);
          }
          return;
        }

        // Single-tournament mode (existing behavior)
        if (!teamMatches.length) {
          setAllHeatmapPoints([]);
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
        setAllHeatmapPoints(teamPts);
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
  // § Stage 2.5 — the global phase control (hmPhase) drives the numeric report
  // tables too, not just the heatmap: Breakouts + Shooting + the elim-reason block
  // all read the SELECTED phase so the field and the numbers always agree.
  const breakSurvival = useMemo(() => computeBreakSurvival(heatmapPoints, field, hmPhase), [heatmapPoints, field, hmPhase]);
  const sideTendency = useMemo(() => computeSideTendency(heatmapPoints, field), [heatmapPoints, field]);
  const tacticalSignals = useMemo(() => computeTacticalSignals(heatmapPoints, field, players), [heatmapPoints, field, players]);
  const shotTargets = useMemo(() => computeShotTargets(heatmapPoints, field, hmPhase), [heatmapPoints, field, hmPhase]);
  const elimReasons = useMemo(() => computeEliminationReasons(heatmapPoints, hmPhase), [heatmapPoints, hmPhase]);
  // § OSTRZAŁ 3a — callout-zone breakdown (carries player identity + inferred bunker)
  const calloutTargets = useMemo(() => computeCalloutZoneTargets(heatmapPoints, field), [heatmapPoints, field]);
  const topHeroes = useMemo(
    () => computeTopHeroes(heatmapPoints, scoutedEntry?.roster || [], players, field, 5),
    [heatmapPoints, scoutedEntry?.roster, players, field]
  );
  const layoutForZones = useMemo(
    () => layouts.find(l => l.id === currentLayoutId),
    [layouts, currentLayoutId]
  );
  // § OSTRZAŁ B1 — resolved callout polygons + per-zone weights for the heatmap
  // highlight layer. B1 default = post-breakout (obstacle) counts; B2 will switch
  // the source by active phase.
  const calloutZonesResolved = useMemo(() => resolveZones(layoutForZones), [layoutForZones]);
  // § OSTRZAŁ B2 — weights follow the active phase: breakout → zoneShots counts,
  // post-breakout → zoneObstacleShots counts. § OSTRZAŁ B3 — when a player is
  // isolated, weights reflect only that player's per-zone count (the aggregator
  // already keeps player identity per zone).
  const calloutZoneWeights = useMemo(() => {
    // § Stage 2 — per-stage: break|settle|mid. (players === holders in the
    // aggregator; both expose .player/.count for the isolation filter.)
    const src = calloutTargets[hmPhase] || {};
    const m = {};
    Object.entries(src || {}).forEach(([id, d]) => {
      if (hmSelectedPlayer) {
        const list = d.players || d.holders || [];
        m[id] = list.filter(e => e.player === hmSelectedPlayer).reduce((s, e) => s + e.count, 0);
      } else {
        m[id] = d.count;
      }
    });
    return m;
  }, [calloutTargets, hmPhase, hmSelectedPlayer]);
  const bigMoves = useMemo(
    () => computeBigMoves(heatmapPoints, layoutForZones),
    [heatmapPoints, layoutForZones]
  );

  const scoutUids = useMemo(
    () => [...new Set(heatmapPoints.map(p => p.scoutedBy).filter(Boolean))],
    [heatmapPoints]
  );
  const scoutNames = useUserNames(scoutUids);
  const scoutNamesLabel = scoutUids.length
    ? scoutUids.map(u => scoutNames[u] || fallbackScoutLabel(u)).join(', ')
    : null;

  if (!tournament || !team) {
    // Still resolving (subscriptions in flight) AND within the 12s ceiling → spinner.
    const stillLoading = (tournamentsLoading || teamsLoading || scoutedLoading) && !loadTimedOut;
    if (stillLoading) return <EmptyState icon="⏳" text={t('loading_default')} />;
    // Resolved-but-absent OR timed out → explicit error state, never an eternal
    // spinner. (Covers a deleted/invalid scouted-team URL on prod too.)
    return (
      <div data-testid="scouted-load-error">
        <EmptyState
          icon="⚠️"
          text={t('scouted_load_error')}
          subtitle={t('scouted_load_error_sub')}
        />
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Btn variant="accent" onClick={() => { setLoadTimedOut(false); navigate(0); }}>{t('match_retry')}</Btn>
        </div>
      </div>
    );
  }


  const nonRosterPlayers = players.filter(p => !(scoutedEntry?.roster || []).includes(p.id));
  // § Stage C — shared matchers + DERIVED Dywizja (player ↔ team(s) ↔ division).
  const rosterTeamsById = Object.fromEntries(teams.map(t => [t.id, t]));
  const rosterLeague = tournament?.league;
  const rosterDivOptions = (() => {
    const set = new Set();
    nonRosterPlayers.forEach(p => playerDivisionSet(p, rosterTeamsById, rosterLeague).forEach(d => set.add(d)));
    return [...set].sort().map(d => ({ value: d, label: d }));
  })();
  const searchResults = (rosterSearch || rosterDiv)
    ? nonRosterPlayers.filter(p =>
        matchEntity(rosterSearch, p, ['name', 'nickname', 'number']) &&
        playerInDivision(p, rosterDiv, rosterTeamsById, rosterLeague),
      ).slice(0, 8)
    : [];

  const handleAddToRoster = async (playerId) => {
    const newRoster = [...(scoutedEntry?.roster || []), playerId];
    await ds.updateScoutedTeam(tournamentId, scoutedId, { roster: newRoster });
    const player = playersById[playerId];
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
  // § Stage 6-lite — while replaying, the Mode (Breakout/Post-breakout) bar and
  // the Positions/Shots/annotation layer pills are inert (the replay overrides
  // rendering with markers-only); Isolate stays live so a single player can be
  // replayed. State isn't mutated → prior layer/phase selection restores on OFF.
  const replaying = hmReplay && canReplay;
  const inertWhileReplaying = replaying ? { opacity: 0.4, pointerEvents: 'none' } : null;

  // §116 Stage 4.2 — in LANDSCAPE the heatmap is promoted to the HERO
  // (CanvasRailLayout) and the report column (scope pills + all sections,
  // original order) moves to the rail BY REFERENCE; portrait is unchanged.
  // The canvas + its overlay chrome (Rysuj chip / DrawToolbar) are defined ONCE
  // and rendered in whichever branch is live; the below-canvas view controls
  // (Stage / Layers / Isolate) stay with the heatmap section in the column, so
  // in landscape they land in the rail at their original position.
  const landscape = device.isLandscape;
  const heroAvailable = teamMatches.length > 0 && !!field?.fieldImage;

  const heatmapCanvasEl = (
    <HeatmapCanvas
      fieldImage={field.fieldImage}
      points={heatmapPoints}
      rosterPlayers={roster}
      bunkers={field.bunkers || []}
      dangerZone={field.dangerZone}
      sajgonZone={field.sajgonZone}
      showPositions={hmShowPositions}
      showShots={hmShowShots}
      heroPlayerIds={heroPlayerIds}
      // § OSTRZAŁ — intrinsic per-mode zones: the choropleth
      // always renders for the active phase (no "Strefy" toggle).
      calloutZones={calloutZonesResolved}
      calloutZoneWeights={calloutZoneWeights}
      phase={hmPhase}
      selectedPlayerId={hmSelectedPlayer}
      // § Stage 6-lite — replay overlay (markers-only while on).
      replay={hmReplay && canReplay}
      // § 78 Stage 2 — annotation layers.
      showAnnotations={hmShowAnnotations}
      showCoachPlan={hmShowCoachPlan}
      coachAnnotations={coachStrokes}
      drawMode={coachDrawMode}
      onDrawStart={handleCoachDrawStart}
      onDrawMove={handleCoachDrawMove}
      onDrawEnd={handleCoachDrawEnd}
      onDrawAbort={handleCoachDrawAbort}
    >
      {/* § 78 2a — DrawingOverlay shows the LIVE editing copy on top of
          HeatmapCanvas while coachDrawMode is on. HeatmapCanvas hides the
          saved-set during drawMode (showCoachPlan && !drawMode gate) so we
          don't render both the stale-saved and live-edit versions. */}
      {coachDrawMode && (
        <DrawingOverlay strokes={coachStrokes} currentStroke={coachCurrent} />
      )}
    </HeatmapCanvas>
  );

  // § 78 2a — "✏ Rysuj" entry chip (PORTRAIT only — in landscape the draw entry is a
  // fieldTool beside the phase bar, see fvFieldToolsEl). Only on the expanded heatmap.
  const coachRysujChipEl = !coachDrawMode ? (
    <div
      role="button" aria-label={t('draw_coach_plan_aria')}
      onClick={enterCoachDrawMode}
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 35,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        minHeight: 36, padding: '0 12px', borderRadius: 18,
        background: 'rgba(15, 23, 42, 0.85)',
        border: `1px solid ${COLORS.border}`,
        color: COLORS.text,
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
        backdropFilter: 'blur(8px)',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Pencil size={16} strokeWidth={2.25} /> Rysuj
    </div>
  ) : null;

  // The draw toolbar (draw mode) — rides the canvas in BOTH orientations.
  const coachDrawToolbarEl = coachDrawMode ? (
    <DrawToolbar
      color={coachColor}
      onColorChange={setCoachColor}
      sizeKey={coachSizeKey}
      onSizeChange={setCoachSizeKey}
      eraserActive={coachEraser}
      onEraserToggle={setCoachEraser}
      canUndo={coachStrokes.length > 0}
      canRedo={coachRedo.length > 0}
      hasStrokes={coachStrokes.length > 0}
      onUndo={handleCoachUndo}
      onRedo={handleCoachRedo}
      onClear={handleCoachClear}
      onDone={exitCoachDrawMode}
    />
  ) : null;

  // Overlay chrome that rides the CANVAS — PORTRAIT path (chip + toolbar).
  const heatmapChromeEl = (<>{coachRysujChipEl}{coachDrawToolbarEl}</>);

  // §116 Stage 4.2 — the landscape HERO: canvas + ONLY the draw toolbar (the Rysuj
  // entry is a fieldTool beside the phase bar, not an overlapping top-right chip).
  const heatmapHeroEl = (
    <div style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0 }}>
      {heatmapCanvasEl}
      {coachDrawToolbarEl}
    </div>
  );

  // Below-canvas view controls — shared between the portrait expanded region
  // and the landscape rail (where they keep the section's original position).
  const heatmapControlsEl = (
    <>
      {/* § Stage 2 — coach 3-way axis (Break/Settle/Mid) GOVERNS the view:
          positions, the intrinsic zone choropleth, and the luf connectors all
          resolve to the active stage. Surface-fill segmented bar (coach idiom).
          Mid is greyed when no point captured it. */}
      <div style={{ padding: '8px 16px 0', ...inertWhileReplaying }}>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{t('scouted_layer_stage')}</div>
        <SegmentedControl
          items={[
            { key: 'break', label: 'Break', testId: 'hm-phase-break' },
            { key: 'settle', label: 'Settle', testId: 'hm-phase-settle' },
            { key: 'mid', label: 'Mid', disabled: !hasMid, title: !hasMid ? t('scouted_no_mid') : undefined, testId: 'hm-phase-mid' },
          ]}
          value={hmPhase}
          onChange={setHmPhase}
        />
      </div>
      {/* Subordinate layer toggles — sit beneath the governing mode group.
          Zones are no longer here (intrinsic per mode). */}
      <div style={{ padding: '10px 16px 0', fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('scouted_layer_layers')}</div>
      <div style={{ display: 'flex', gap: 6, padding: '6px 16px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div onClick={() => setHmShowPositions(v => !v)} style={{
          padding: '5px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
          fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
          background: hmShowPositions ? 'rgba(34,197,94,0.15)' : 'transparent',
          color: hmShowPositions ? COLORS.success : COLORS.textMuted,
          border: `1px solid ${hmShowPositions ? 'rgba(34,197,94,0.4)' : COLORS.border}`,
          ...inertWhileReplaying,
        }}>{t('scouted_layer_positions')}</div>
        <div onClick={() => setHmShowShots(v => !v)} style={{
          padding: '5px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
          fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
          background: hmShowShots ? 'rgba(239,68,68,0.15)' : 'transparent',
          color: hmShowShots ? COLORS.danger : COLORS.textMuted,
          border: `1px solid ${hmShowShots ? 'rgba(239,68,68,0.4)' : COLORS.border}`,
          ...inertWhileReplaying,
        }}>{t('scouted_layer_shots')}</div>
        {/* § Stage 6-lite — Replay toggle. Reuses the layer-pill idiom; amber
            (accent) only while active (playing) per § 27 color discipline.
            Disabled when no Settle/Mid keyframes exist to play. */}
        <div
          onClick={canReplay ? () => setHmReplay(v => !v) : undefined}
          title={canReplay ? undefined : 'No Settle/Mid stages captured yet'}
          style={{
            padding: '5px 14px', borderRadius: RADIUS.full,
            cursor: canReplay ? 'pointer' : 'default',
            fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
            background: replaying ? `${COLORS.accent}1f` : 'transparent',
            color: replaying ? COLORS.accent : COLORS.textMuted,
            border: `1px solid ${replaying ? `${COLORS.accent}66` : COLORS.border}`,
            opacity: canReplay ? 1 : 0.4,
          }}>{t('scouted_layer_replay')}</div>
        {/* § OSTRZAŁ — "Strefy" toggle removed: zones are intrinsic per mode now
            (always-on choropleth keyed to hmPhase). */}
        {/* § 78 Stage 2 — annotation layer toggles. Neutral styling (no semantic
            color) since strokes are multi-color per stroke and Jacek's spec was
            "labelowy pill". Default ON / OFF per § 78 brief. */}
        <div onClick={() => setHmShowCoachPlan(v => !v)} style={{
          padding: '5px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
          fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
          background: hmShowCoachPlan ? `${COLORS.accent}1f` : 'transparent',
          color: hmShowCoachPlan ? COLORS.accent : COLORS.textMuted,
          border: `1px solid ${hmShowCoachPlan ? `${COLORS.accent}66` : COLORS.border}`,
          ...inertWhileReplaying,
        }}>{t('scouted_layer_coach_plan')}</div>
        <div onClick={() => setHmShowAnnotations(v => !v)} style={{
          padding: '5px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
          fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
          background: hmShowAnnotations ? `${COLORS.accent}1f` : 'transparent',
          color: hmShowAnnotations ? COLORS.accent : COLORS.textMuted,
          border: `1px solid ${hmShowAnnotations ? `${COLORS.accent}66` : COLORS.border}`,
          ...inertWhileReplaying,
        }}>{t('scouted_layer_notes')}</div>
        {/* Collapse is a portrait scroll-estate device — meaningless when the
            hero is promoted (§116 Stage 4.2), so it hides in landscape. */}
        {!landscape && (
          <div onClick={() => setHeatmapExpanded(false)} style={{
            padding: '5px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
            fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
            background: 'transparent', color: COLORS.textMuted,
            border: `1px solid ${COLORS.border}`,
          }}>{t('scouted_layer_collapse')}</div>
        )}
      </div>
      {/* § OSTRZAŁ B3 — per-player isolation selector. Tap a roster player →
          only their positions/cones/zones read full, the rest dim; tap again to
          clear. Chip-based (not canvas-tap): the heatmap aggregates many
          overlapping positions per player, so a deterministic roster pick is
          unambiguous. Active chip = amber (selected state). */}
      {roster.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 8px', overflowX: 'auto', alignItems: 'center' }}>
          <span style={{ flexShrink: 0, fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('scouted_layer_isolate')}</span>
          {roster.map(p => {
            const active = hmSelectedPlayer === p.id;
            return (
              <div key={p.id} onClick={() => setHmSelectedPlayer(active ? null : p.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                padding: '3px 10px 3px 3px', borderRadius: RADIUS.full, cursor: 'pointer',
                background: active ? `${COLORS.accent}1f` : COLORS.surface,
                border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
              }}>
                <PlayerAvatar player={p} size={20} />
                <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: active ? COLORS.accent : COLORS.text, whiteSpace: 'nowrap' }}>{p.name || `#${p.number}`}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const pageHeaderEl = (
    <PageHeader
      back={{ to: '/' }}
      title={team?.name || 'Team'}
      subtitle={t('opponent_analysis')}
      badges={team ? <TeamBadge team={team} size={28} /> : null}
    />
  );

  // Scope pills (§ 60.6) — Ostatni mecz / Ten turniej / Cały layout /
  // Mecz ▾ picker. Layout pill only renders when tournament shares a
  // layout with another tournament; rest always visible.
  const scopePillsEl = (() => {
        const layoutTs = currentLayoutId
          ? tournaments.filter(t => t.layoutId === currentLayoutId)
          : [];
        const showLayoutPill = currentLayoutId && layoutTs.length > 1;

        const selectedMatch = isMatchScope
          ? teamMatches.find(m => m.id === matchIdParam)
          : null;
        const selectedOppEntry = selectedMatch
          ? scouted.find(s =>
              s.id === (selectedMatch.teamA === scoutedId ? selectedMatch.teamB : selectedMatch.teamA))
          : null;
        const selectedOppTeam = selectedOppEntry
          ? teams.find(tm => tm.id === selectedOppEntry.teamId)
          : null;
        const matchPillLabel = isMatchScope
          ? `vs ${selectedOppTeam?.name || '?'}`
          : t('scope_match_picker');

        const Pill = ({ active, disabled, onClick, title, children }) => (
          <div
            onClick={disabled ? undefined : onClick}
            title={title}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: active ? COLORS.accentA08 : 'transparent',
              border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
              color: active ? COLORS.accent : (disabled ? COLORS.borderLight : COLORS.textDim),
              fontFamily: FONT, fontSize: 12, fontWeight: 600,
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.55 : 1,
              minHeight: 44,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {children}
          </div>
        );

        return (
          <div style={{ display: 'flex', gap: 8, padding: '8px 16px 0', flexWrap: 'wrap' }}>
            <Pill
              active={isLastMatchScope}
              disabled={!lastMatch}
              title={!lastMatch ? t('scope_no_closed') : undefined}
              onClick={() => setSearchParams({ scope: 'lastMatch' })}
            >
              {t('scope_last_match')}
            </Pill>
            <Pill active={isTournamentScope} onClick={() => setSearchParams({})}>
              {t('scope_tournament')}
            </Pill>
            {showLayoutPill && (
              <Pill active={isLayoutScope} onClick={() => setSearchParams({ scope: 'layout' })}>
                {t('scope_layout')} ({layoutTs.length})
              </Pill>
            )}
            <Pill
              active={isMatchScope}
              onClick={() => isMatchScope ? setSearchParams({}) : setMatchPickerOpen(true)}
            >
              <span>{matchPillLabel}</span>
              {isMatchScope && <span style={{ fontSize: 11, opacity: 0.7 }}>✕</span>}
            </Pill>
          </div>
        );
      })();

  const columnEl = (
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 80 }}>
        {/* Data confidence banner — contextual qualifier */}
        {heatmapPoints.length > 0 && (() => {
          const c = computeCompleteness(heatmapPoints);
          if (!c) return null;
          const scoutSuffix = scoutNamesLabel ? t('scouted_by', scoutNamesLabel) : '';

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
                background: COLORS.accentA06, border: `1px solid ${COLORS.accentA15}`, borderRadius: 10,
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
            {t('scouted_loading')}
          </div>
        )}

        {/* No data state */}
        {!heatmapLoading && heatmapPoints.length === 0 && teamMatches.length > 0 && (
          <div style={{
            margin: '24px 16px', padding: '24px 16px', textAlign: 'center',
            background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>{t('scouted_no_data')}</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              {t('scouted_no_data_sub')}
            </div>
          </div>
        )}

        {!heatmapLoading && heatmapPoints.length === 0 && teamMatches.length === 0 && (
          <div style={{
            margin: '24px 16px', padding: '24px 16px', textAlign: 'center',
            background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏟</div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>{t('scouted_no_matches')}</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              {t('scouted_no_matches_sub')}
            </div>
          </div>
        )}

        {/* ─── ABOVE FOLD — Coach Brief priorities (Sławek § 34 + § 60) ─── */}

        {/* Heatmap — promoted to top of analysis, expanded by default (§ 60.1).
            §116 Stage 4.2: in landscape the canvas is the page HERO (promoted
            out of the column), so this section keeps only the view controls at
            their original position in the rail. */}
        {/* Field View shell: in landscape the heatmap controls (Stage/Layers/Isolate)
            moved OUT of the column — Stage+▶ → floating phaseControl, Layers/Isolate →
            structured rail zones (fvControlZonesEl, rendered above this column). So the
            column shows only the coach REPORT sections here. */}
        {teamMatches.length > 0 && !(landscape && heroAvailable) && (
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
                  <HeatmapCanvas
                    fieldImage={field.fieldImage}
                    points={heatmapPoints}
                    rosterPlayers={roster}
                    bunkers={field.bunkers || []}
                    dangerZone={field.dangerZone}
                    sajgonZone={field.sajgonZone}
                    showPositions={true}
                    showShots={true}
                    heroPlayerIds={heroPlayerIds}
                  />
                  <div style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    padding: '4px 10px',
                    fontFamily: FONT, fontSize: 10, fontWeight: 600,
                    color: COLORS.textSubtle, textAlign: 'center',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  }}>{t('scouted_heatmap_expand')}</div>
                </div>
              ) : (
                <div style={heatmapFullscreen ? {
                  // § 81 — heatmap-region full-viewport overlay. Same JSX
                  // subtree as inline (no remount) — only the wrapper style
                  // swaps. Covers viewport; dashboard underneath is hidden.
                  // Background = page bg so notch / dynamic island reads as
                  // a single immersive surface. Pills sit at the bottom of
                  // the flex column with safe-area-aware padding.
                  position: 'fixed', inset: 0, zIndex: 60,
                  background: COLORS.bg,
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                } : { borderRadius: 12, overflow: 'hidden', background: '#0a1410', border: '1px solid #162016', position: 'relative' }}>
                  {heatmapCanvasEl}
                  {/* § 81 ScoutedTeam immersive — heatmap-region overlay
                      trigger. top-left placement avoids collision with the
                      "✏ Rysuj" chip (top-right). Both orientations (NO
                      auto-on-landscape — entry is explicit on this surface
                      per § 81 boundary). `isLandscape={false}` bypasses the
                      canvas-page rotation gate baked into the shared
                      component (which is for canvas-primary surfaces, not
                      scroll-dashboards). Visible on the expanded region in
                      both inline + fullscreen states (same Icon flips
                      Maximize2 ↔ Minimize2 via fsActive). */}
                  <FullscreenToggle
                    placement="top-left"
                    fsActive={heatmapFullscreen}
                    onToggle={heatmapFullscreen ? exitHeatmapFs : enterHeatmapFs}
                    isLandscape={false}
                  />
                  {heatmapChromeEl}
                  {heatmapControlsEl}
                </div>
              )}
            </div>
          </>
        )}

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
              <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Column headers — § 60.4 added Played + In pts */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', background: COLORS.surface,
                  borderBottom: `1px solid ${COLORS.surfaceLight}`,
                }}>
                  <div style={{ flex: 1 }} />
                  <div style={{ width: 42, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('col_rozbieg')}</div>
                  <div style={{ width: 42, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('col_przezycie')}</div>
                  <div style={{ width: 36, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('col_played')}</div>
                  <div style={{ width: 44, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('col_played_in')}</div>
                </div>
                {rows.map((b, i) => {
                  const freqColor = qualityColor(b.pct, [30, 15]);
                  const survColor = qualityColor(b.survivalPct, [70, 50]);
                  return (
                    <div key={b.name} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px',
                      borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.surface}` : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SideTag side={b.side || 'center'} />
                        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                        {b.type && (
                          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, fontWeight: 500 }}>{b.type}</span>
                        )}
                      </div>
                      <div style={{ width: 42, textAlign: 'right', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: freqColor }}>{b.pct}%</div>
                      <div style={{ width: 42, textAlign: 'right', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: survColor }}>{b.survivalPct}%</div>
                      <div style={{ width: 36, textAlign: 'right', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.text }}>{b.timesPlayed}</div>
                      <div style={{ width: 44, textAlign: 'right', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.textDim }}>{b.pointsPlayed}/{b.totalPoints}</div>
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

          // § 60.5 reliability rate: declaredShooters / expectedShooters across
          // scoped points. Reuses computeCompleteness — same formula.
          const completeness = computeCompleteness(heatmapPoints);
          const reliabilityPct = completeness && completeness.nonRunnerPlayers > 0
            ? completeness.shotPct
            : null;
          const reliabilityLow = reliabilityPct != null && reliabilityPct < 80;

          return (
            <>
              <SectionHeader icon={Crosshair}>{t('section_shots_v2')}</SectionHeader>
              {reliabilityPct != null && (
                <div style={{
                  margin: '0 16px 8px',
                  padding: '8px 12px',
                  background: reliabilityLow ? COLORS.accentA0c : COLORS.surfaceDark,
                  border: `1px solid ${reliabilityLow ? COLORS.accentA40 : COLORS.border}`,
                  borderRadius: RADIUS.md,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {reliabilityLow && (
                    <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.accent, flexShrink: 0 }}>⚠</span>
                  )}
                  <span style={{
                    fontFamily: FONT, fontSize: 11, fontWeight: 600, lineHeight: 1.4,
                    color: reliabilityLow ? COLORS.accent : COLORS.textMuted,
                  }}>
                    {reliabilityLow
                      ? t('strzelanie_reliability_low', reliabilityPct)
                      : t('strzelanie_reliability', reliabilityPct)}
                  </span>
                </div>
              )}
              <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Column headers */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 14px', background: COLORS.surface,
                  borderBottom: `1px solid ${COLORS.surfaceLight}`,
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
                      borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.surface}` : 'none',
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

        {/* § Stage 2.5 — elimination-reason breakdown for the SELECTED phase.
            The 2b taxonomy (przejście/kara/gunfight/przeszkoda/nie wiadomo) is
            captured per Settle/Mid keyframe but was previously invisible (no
            table). Break is implicit (no captured reasons) → empty → hidden.
            Read-only, neutral styling (data, no amber); mirrors the table-row
            idiom of Breakouts/Shooting. */}
        {elimReasons.total > 0 && (() => {
          const rows = ELIM_REASONS
            .map(r => ({ code: r.code, label: t(r.key), count: elimReasons.counts[r.code] || 0 }))
            .filter(r => r.count > 0)
            .sort((a, b) => b.count - a.count);
          if (!rows.length) return null;
          const total = elimReasons.total;
          return (
            <>
              <SectionHeader icon={Skull}>{t('section_elim_reasons')}</SectionHeader>
              <div data-testid="elim-reasons" style={{ margin: '0 16px 12px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>
                {rows.map((r, i) => {
                  const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                  return (
                    <div key={r.code} data-testid={`elim-reason-${r.code}`} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.surface}` : 'none',
                    }}>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{r.label}</span>
                      <span style={{ width: 48, textAlign: 'right', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.textDim }}>{pct}%</span>
                      <span style={{ width: 28, textAlign: 'right', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: COLORS.text }}>{r.count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* § OSTRZAŁ 3a + B4 + (1a) — Callout-zone breakdown (per layout), two
            phase sub-tables: BREAK (zoneShots) + POST-BREAK (zoneObstacleShots).
            Clones the "Strzały" table pattern; carries player identity per zone.
            Each sub-table lists ONLY zones with ≥1 shot IN THAT PHASE (count>0),
            ordered by frequency — a configured-but-never-shot zone disappears
            entirely; a zone shot in one phase only shows in that phase's table.
            An empty sub-table (incl. its header) is not rendered. POST-BREAK
            chips show players only (the inferred-bunker text view stayed removed
            per B4 — that read is on the heatmap's Post-breakout mode). Read-only
            → no amber; identity via PlayerAvatar. */}
        {heatmapPoints.length > 0 && calloutTargets.hasAny && (() => {
          const zoneById = {};
          resolveZones(layoutForZones).forEach(z => { zoneById[z.id] = z; });
          // POST-BREAK holders are keyed `player|bunker` → aggregate by player so
          // chips mirror BREAK's per-player shape (bunker read lives on heatmap).
          const aggHolders = (holders) => {
            const m = new Map();
            (holders || []).forEach(h => { if (h.player) m.set(h.player, (m.get(h.player) || 0) + h.count); });
            return [...m.entries()].map(([player, count]) => ({ player, count })).sort((a, b) => b.count - a.count);
          };
          // § Stage 2 — per-stage sub-tables (Break/Settle/Mid). chips aggregate
          // the identity list by player (break = {player,count}; settle/mid =
          // holder shape {player,bunker,count}, summed by player).
          const buildRows = (src) => Object.entries(src || {})
            .map(([id, d]) => ({ zone: zoneById[id], ...d, chipPairs: aggHolders(d.players || d.holders || []) }))
            .filter(r => r.zone && r.count > 0)
            .sort((a, b) => b.count - a.count);
          const breakRows = buildRows(calloutTargets.break);
          const settleRows = buildRows(calloutTargets.settle);
          const midRows = buildRows(calloutTargets.mid);
          if (!breakRows.length && !settleRows.length && !midRows.length) return null;

          const chipBase = {
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 8px 3px 3px', background: COLORS.surface,
            border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.full,
          };
          const nameOf = (p) => p ? (p.name || p.nickname || `#${p.number || ''}`) : t('callout_unknown_player');
          const playerChip = (pid, count) => {
            const p = playersById[pid];
            return (
              <span key={pid} style={chipBase}>
                {p ? <PlayerAvatar player={p} size={20} /> : null}
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap' }}>{nameOf(p)}</span>
                {count > 1 && <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted }}>×{count}</span>}
              </span>
            );
          };
          // § OSTRZAŁ (A revised) — chips render only for the assigned subset;
          // when a zone's tags are all unassigned the chip row is omitted (just
          // the count shows, like the band "Shooting" section).
          // Completeness-weighted columns mirror the band "Shooting" table:
          // SHOOT% (pointsWithShot/points, same formula as computeShotTargets) ·
          // PLAYERS (distinct identifiable players, anonymous-safe — '—' when none
          // identifiable) · IN PTS (pointsWithShot). Frequency colour reuses the
          // band threshold pair [40, 25].
          const COL = 50;
          const qualityColor = (pct) =>
            pct >= 40 ? COLORS.success : pct >= 25 ? COLORS.accent : COLORS.danger;
          const colHeader = (label) => (
            <div style={{ width: COL, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</div>
          );
          const headerRow = (phaseLabel) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: COLORS.surface, borderBottom: `1px solid ${COLORS.surfaceLight}` }}>
              <div style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{phaseLabel}</div>
              {colHeader(t('col_strzela'))}
              {colHeader(t('col_callout_players'))}
              {colHeader(t('col_callout_inpts'))}
            </div>
          );
          const zoneRow = (r, chips, isLast) => (
            <div key={r.zone.id} style={{ padding: '10px 14px', borderBottom: isLast ? 'none' : `1px solid ${COLORS.surface}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: chips.length ? 6 : 0 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: r.zone.color, flexShrink: 0 }} />
                  <span style={{ minWidth: 0, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.zone.name}</span>
                </div>
                <div style={{ width: COL, textAlign: 'right', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: qualityColor(r.shotPct) }}>{r.shotPct}%</div>
                <div style={{ width: COL, textAlign: 'right', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: r.distinctPlayers > 0 ? COLORS.text : COLORS.textMuted }}>{r.distinctPlayers > 0 ? r.distinctPlayers : '—'}</div>
                <div style={{ width: COL, textAlign: 'right', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.text }}>{r.pointsWithShot}</div>
              </div>
              {chips.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{chips}</div>}
            </div>
          );

          const phaseTable = (phaseLabel, rows) => rows.length > 0 ? (
            <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>
              {headerRow(phaseLabel)}
              {rows.map((r, i) => zoneRow(r, r.chipPairs.map(p => playerChip(p.player, p.count)), i === rows.length - 1))}
            </div>
          ) : null;

          return (
            <>
              <SectionHeader icon={Crosshair}>{t('section_callout_zones')}</SectionHeader>
              {phaseTable('Break', breakRows)}
              {phaseTable('Settle', settleRows)}
              {phaseTable('Mid', midRows)}
            </>
          );
        })()}

        {/* § OSTRZAŁ (A) — "Strefy: off-break presence" section retired here:
            superseded by the Callout-zones break sub-section above (shooting)
            and the heatmap's post-breakout presence (brief B). computeZonePresence
            removed with it. */}

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
          const avgDiff = topHeroes.reduce((sum, h) => sum + (h.diff || 0), 0) / topHeroes.length;
          const isWeakData = avgDiff < 0;
          return (
            <>
              <SectionHeader icon={Medal}>{t('section_key_players')}</SectionHeader>
              {isWeakData && (
                <div style={{
                  margin: '0 16px 8px',
                  padding: '8px 12px',
                  background: `${COLORS.textMuted}15`,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.md,
                  fontFamily: FONT, fontSize: FONT_SIZE.xs,
                  color: COLORS.textDim,
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}>
                  {t('key_players_weak_data')}
                </div>
              )}
              <div style={{ margin: '0 16px 6px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>
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
                        borderBottom: i < topHeroes.length - 1 ? `1px solid ${COLORS.surface}` : 'none',
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

        {/* Section 5 — Big Moves (above fold only when detections exist) */}
        {bigMoves.hasZone && bigMoves.bunkers.length > 0 && (
          <>
            <SectionHeader icon={Zap}>{t('section_big_moves')}</SectionHeader>
            <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 14px', background: COLORS.surface,
                borderBottom: `1px solid ${COLORS.surfaceLight}`,
              }}>
                <div style={{ flex: 1 }} />
                <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t('big_moves_col_count')}</div>
                <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>%</div>
              </div>
              {bigMoves.bunkers.map((b, i) => {
                const freqC = b.pct >= 30 ? COLORS.danger : b.pct >= 15 ? COLORS.accent : COLORS.textDim;
                return (
                  <div key={b.name} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    borderBottom: i < bigMoves.bunkers.length - 1 ? `1px solid ${COLORS.surface}` : 'none',
                  }}>
                    <div style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                    <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.text }}>{b.count}×</div>
                    <div style={{ width: 56, textAlign: 'right', fontFamily: FONT, fontSize: 13, fontWeight: 800, color: freqC }}>{b.pct}%</div>
                  </div>
                );
              })}
            </div>
            <div style={{ margin: '0 16px 12px', fontFamily: FONT, fontSize: 10, fontStyle: 'italic', color: COLORS.textMuted }}>
              {t('big_moves_summary', bigMoves.totalPointsWithBigMove, bigMoves.totalPoints)}
            </div>
          </>
        )}

        {/* Section 6 — Notatki (Coach Notes) */}
        {userId && (
          <NotatkiSection
            notes={notes}
            userId={userId}
            userRole={userRole}
            onAdd={() => { setEditingNote(null); setNoteSheetOpen(true); }}
            onEdit={(n) => { setEditingNote(n); setNoteSheetOpen(true); }}
            onDelete={(noteId) => setDeleteNoteConfirm(noteId)}
          />
        )}

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

        {/* Big Moves — empty states (below fold) */}
        {(!bigMoves.hasZone || bigMoves.bunkers.length === 0) && (
          <div style={{
            margin: '0 16px 10px', padding: 14,
            background: COLORS.surface,
            border: `1px dashed ${COLORS.border}`,
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Zap size={14} color={COLORS.textMuted} strokeWidth={2} />
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.text }}>{t('section_big_moves')}</div>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, lineHeight: 1.5 }}>
              {bigMoves.hasZone ? t('big_moves_none_detected') : t('big_moves_no_zone')}
            </div>
          </div>
        )}

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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${COLORS.surface}` }}>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.borderLight, textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: 2, minWidth: 90, flexShrink: 0 }}>{label}</div>
              <div style={{ flex: 1 }}>{children}</div>
            </div>
          );

          return (
            <>
              <SectionHeader>{t('section_signals')}</SectionHeader>
              <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>

                {/* Most eliminated player */}
                {mostEliminated && (
                  <Row label={t('signal_targeted')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                        {mostEliminated.number ? `#${mostEliminated.number} ` : ''}{mostEliminated.name || `Slot ${mostEliminated.slot + 1}`}
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.danger }}>{mostEliminated.pct}%</span>
                      <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>{t('scouted_eliminated_label')}</span>
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
                            <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.accent, background: COLORS.accentA18, border: `1px solid ${COLORS.accentA30}`, borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>{t('signal_high')}</span>
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
                          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.borderLight }}>{t('b13_quick_shots_label')}</span>
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

        {/* Tendencja — demoted to additional sections (§ 60.2). Calculation
            logic preserved verbatim while formula is revalidated post-NXL. */}
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
            <div style={{ flex: 1, minWidth: 0, padding: 12, background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <SideTag side={side} />
                <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textDim, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>{data.pct}%</div>
              <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>{t('pts_label')}</div>
              <div style={{ paddingTop: 8, marginTop: 8, borderTop: `1px solid ${COLORS.surfaceLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600, color: COLORS.text }}>{t('scouted_manage_roster')}</div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted }}>{roster.length} players · add, remove, mark HERO</div>
            </div>
            <span style={{ color: COLORS.textMuted, transform: showRoster ? 'rotate(90deg)' : 'none', transition: '0.2s' }}><Icons.Chev /></span>
          </div>
          {showRoster && (
            <div className="fade-in" style={{ marginTop: 8, padding: 12, background: COLORS.surfaceDark, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}` }}>
              <div style={{ marginBottom: 10 }}>
                {/* § Stage C — shared search + Dywizja (Liga fixed by tournament) */}
                <SearchFilterPanel
                  search={rosterSearch}
                  onSearchChange={setRosterSearch}
                  searchPlaceholder="🔍 Search player..."
                  filters={rosterDivOptions.length ? [{ key: 'dyw', label: 'Dywizja', value: rosterDiv, onChange: setRosterDiv, allLabel: 'wszystkie', options: rosterDivOptions }] : []}
                />
                {(rosterSearch || rosterDiv) && searchResults.length === 0 && (
                  <div style={{ marginTop: 6, padding: '8px', textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>{t('scouted_roster_no_results')}</div>
                )}
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
                        background: isTHero ? COLORS.accentA12 : 'transparent',
                        border: `1px solid ${isTHero ? COLORS.accentA25 : COLORS.surfaceLight}`,
                      }}>
                      <span style={{ fontSize: 11, color: isTHero ? COLORS.accent : COLORS.textMuted }}>★</span>
                      <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '.3px', color: isTHero ? COLORS.accent : COLORS.textMuted }}>HERO</span>
                    </div>
                    <Btn variant="ghost" size="sm" onClick={() => handleRemoveFromRoster(p.id)}><Icons.Trash /></Btn>
                  </div>
                );
              })}
              {!roster.length && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 6 }}>{t('scouted_empty_roster')}</div>}
              {/* Quick add */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.border}30` }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('b13_add_new_player_label')}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('player_form_full_name_label')}
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

          {!teamMatches.length && <EmptyState icon="📋" text={t('b13_add_match_or_schedule')} />}

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
  );

  const modalsEl = (
    <>
      {/* Delete match — password protected */}
      <ConfirmModal open={!!deleteMatchModal} onClose={() => setDeleteMatchModal(null)}
        title={t('delete_match')} danger confirmLabel={t('delete')}
        message={t('match_delete_msg')}
        onConfirm={() => { ds.deleteMatch(tournament.id, deleteMatchModal); setDeleteMatchModal(null); }} />

      {/* § 60.6 — Mecz ▾ picker. List of teamMatches sorted newest first. */}
      <Modal open={matchPickerOpen} onClose={() => setMatchPickerOpen(false)} title={t('picker_match_title')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '60vh', overflowY: 'auto' }}>
          {!teamMatches.length && (
            <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted, padding: '12px 4px' }}>
              {t('picker_no_matches')}
            </div>
          )}
          {teamMatches.slice().sort((a, b) => {
            const keyOf = (m) =>
              m.updatedAt?.toMillis?.() || m.completedAt?.toMillis?.() || m.date || '';
            const ak = keyOf(a), bk = keyOf(b);
            return bk > ak ? 1 : bk < ak ? -1 : 0;
          }).map(m => {
            const isA = m.teamA === scoutedId;
            const oppScoutedId = isA ? m.teamB : m.teamA;
            const oppEntry = scouted.find(s => s.id === oppScoutedId);
            const oppTeam = oppEntry ? teams.find(tm => tm.id === oppEntry.teamId) : null;
            const sA = m.scoreA || 0, sB = m.scoreB || 0;
            const myScore = isA ? sA : sB;
            const oppScore = isA ? sB : sA;
            const isFinal = m.status === 'closed';
            const hasScore = sA > 0 || sB > 0;
            const won = isFinal && hasScore && myScore > oppScore;
            const lost = isFinal && hasScore && myScore < oppScore;
            const isDraw = isFinal && hasScore && myScore === oppScore;
            const resultColor = won ? COLORS.success : lost ? COLORS.danger : isDraw ? COLORS.accent : COLORS.text;
            const isSelected = isMatchScope && matchIdParam === m.id;
            return (
              <div
                key={m.id}
                onClick={() => {
                  setSearchParams({ scope: 'match', mid: m.id });
                  setMatchPickerOpen(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  background: isSelected ? COLORS.accentA10 : COLORS.surfaceDark,
                  border: `1px solid ${isSelected ? COLORS.accent : COLORS.border}`,
                  borderRadius: RADIUS.md,
                  cursor: 'pointer',
                  minHeight: TOUCH.minTarget,
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    vs {oppTeam?.name || '?'}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                    {m.date || t('match_card_scheduled')}
                  </div>
                </div>
                {hasScore ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Score value={`${myScore}:${oppScore}`} color={isFinal ? resultColor : undefined} />
                    {isFinal && <ResultBadge result={won ? 'W' : lost ? 'L' : 'D'} />}
                  </div>
                ) : (
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}>— : —</span>
                )}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Coach Notes — add/edit sheet + delete confirm */}
      <AddNoteSheet
        open={noteSheetOpen}
        onClose={() => { setNoteSheetOpen(false); setEditingNote(null); }}
        editingNote={editingNote}
        teamName={team?.name}
        onSave={async (content) => {
          if (!userId) return;
          if (editingNote) {
            await ds.updateNote(tournamentId, scoutedId, editingNote.id, { content });
          } else {
            await ds.addNote(tournamentId, scoutedId, {
              content, authorId: userId, authorName: userName, authorRole: userRole,
            });
          }
        }}
      />
      <ConfirmModal open={!!deleteNoteConfirm} onClose={() => setDeleteNoteConfirm(null)}
        title={t('notes_delete_confirm')} danger confirmLabel={t('notes_delete')}
        message={t('notes_delete_confirm')}
        onConfirm={() => {
          if (deleteNoteConfirm) ds.deleteNote(tournamentId, scoutedId, deleteNoteConfirm);
          setDeleteNoteConfirm(null);
        }} />
    </>
  );

  // ── Field View shell wiring (reference impl, 'scouted-team' descriptor) ──
  // STATE→PROPS binding only (the thickened contract carries the structure). The
  // draw entry stays the existing floating "Rysuj" chip (heatmapChromeEl) + §81
  // fullscreen is landscape-suppressed, so fieldTools is null here.
  const fvPhaseControlEl = (
    <FieldPhaseControl
      kind="coach"
      phases={[
        { key: 'break', label: 'Break' },
        { key: 'settle', label: 'Settle' },
        { key: 'mid', label: 'Mid', disabled: !hasMid, title: !hasMid ? t('scouted_no_mid') : undefined },
      ]}
      phase={hmPhase} onPhase={setHmPhase}
      done={{ break: true, settle: canReplay, mid: hasMid }}
      canReplay={canReplay} replaying={replaying}
      onReplay={() => setHmReplay(v => !v)}
    />
  );
  const fvLayerItems = [
    { key: 'positions', icon: FIELD_LAYERS.positions.icon, label: t('scouted_layer_positions'), on: hmShowPositions, onToggle: () => setHmShowPositions(v => !v), disabled: replaying },
    { key: 'shots', icon: FIELD_LAYERS.shots.icon, label: t('scouted_layer_shots'), on: hmShowShots, onToggle: () => setHmShowShots(v => !v), disabled: replaying },
    { key: 'coachPlan', icon: FIELD_LAYERS.coachPlan.icon, label: t('scouted_layer_coach_plan'), on: hmShowCoachPlan, onToggle: () => setHmShowCoachPlan(v => !v), disabled: replaying },
    { key: 'notes', icon: FIELD_LAYERS.notes.icon, label: t('scouted_layer_notes'), on: hmShowAnnotations, onToggle: () => setHmShowAnnotations(v => !v), disabled: replaying },
  ];
  const fvIsolateItems = roster.map(p => ({
    key: p.id, label: p.name || `#${p.number}`,
    avatar: p.number != null ? String(p.number) : '•', accent: p.playerColor || undefined,
    active: hmSelectedPlayer === p.id,
    onSelect: () => setHmSelectedPlayer(hmSelectedPlayer === p.id ? null : p.id),
  }));
  const fvControlZonesEl = (
    <>
      <RailZone label="Scope">{scopePillsEl}</RailZone>
      <RailZone label={t('scouted_layer_layers')}><RailToggleList items={fvLayerItems} /></RailZone>
      {roster.length > 0 && (
        <RailZone label={t('scouted_layer_isolate')} last><RailItemList items={fvIsolateItems} /></RailZone>
      )}
    </>
  );
  const fvPins = [
    { key: 'positions', icon: FIELD_LAYERS.positions.icon, label: t('scouted_layer_positions'), on: hmShowPositions, onToggle: () => setHmShowPositions(v => !v) },
    { key: 'coachPlan', icon: FIELD_LAYERS.coachPlan.icon, label: t('scouted_layer_coach_plan'), on: hmShowCoachPlan, onToggle: () => setHmShowCoachPlan(v => !v) },
    { key: 'notes', icon: FIELD_LAYERS.notes.icon, label: t('scouted_layer_notes'), on: hmShowAnnotations, onToggle: () => setHmShowAnnotations(v => !v) },
  ];
  // fieldTools — the draw entry as an ICON beside the phase bar (landscape; the toolbar
  // replaces it on the field in draw mode). Mockup `.f-btn`, real-scale ≥44px tap target.
  const fvFieldToolsEl = !coachDrawMode ? (
    <div role="button" aria-label={t('draw_coach_plan_aria')} data-testid="fv-tool-draw"
      onClick={enterCoachDrawMode}
      style={{
        minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(13,17,23,0.92)', border: `1px solid ${COLORS.border}`, borderRadius: 8,
        color: COLORS.text, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        backdropFilter: 'blur(8px)',
      }}>
      <Pencil size={18} strokeWidth={2.25} />
    </div>
  ) : null;

  // §116 Stage 4.2 — LANDSCAPE (hero available): the heatmap is the HERO, the
  // report column (sections) is the rail BY REFERENCE. The view controls now live
  // in structured rail zones (scope/layers/isolate) + the floating phaseControl;
  // primaryAction is null (coach plan auto-persists on draw-done, GAP B). Collapses
  // to the §116 strip on cramped tablet-landscape, pinning the most-used layers.
  if (landscape && heroAvailable) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh', zIndex: 100, background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
        <CanvasRailLayout
          isLandscape
          aspect={16 / 10}
          railMin={200}
          header={pageHeaderEl}
          artifact={heatmapHeroEl}
          phaseControl={fvPhaseControlEl}
          fieldTools={fvFieldToolsEl}
          rail={<>{fvControlZonesEl}{columnEl}</>}
          collapsed={{ tabs: [], pins: fvPins, count: null, onBack: () => navigate('/') }}
        />
        {modalsEl}
      </div>
    );
  }

  // PORTRAIT (and landscape without a hero) — the original stacked layout.
  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {pageHeaderEl}
      {scopePillsEl}
      {columnEl}
      {modalsEl}
    </div>
  );
}
