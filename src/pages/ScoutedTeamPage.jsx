import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import HeatmapCanvas from '../components/HeatmapCanvas';
import PageHeader from '../components/PageHeader';
import PlayerAvatar from '../components/PlayerAvatar';
import CrestBand from '../components/CrestBand';
import RdIcon from '../components/RdIcon';
import TeamBadge from '../components/TeamBadge';
import { Btn, EmptyState, Modal, Icons, ConfirmModal, Score, ResultBadge, SideTag } from '../components/ui';
import { NotatkiSection, AddNoteSheet } from '../components/CoachNotes';
import { useTournaments, useActiveTeams, useScoutedTeams, useMatches, usePlayers, useLayouts, useNotes } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { mirrorPointToLeft } from '../utils/helpers';
import { computeCoachingStats } from '../utils/coachingStats';
import { generateInsights, generateCounters, computeBreakSurvival, computeSideTendency, computeTopHeroes, computeTacticalSignals, computeShotTargets, computeCalloutZoneTargets, computeBigMoves, computeEliminationReasons, INSIGHT_COLORS, INSIGHT_ICONS, COUNTER_COLORS } from '../utils/generateInsights';
import { computeBreakoutRuns } from '../utils/breakoutRuns';
import { coachReportPhases, label as phaseLabel, toPersistedLiteral } from '../utils/pointPhases';
import { ELIM_REASONS } from '../components/match/ReasonRadial';
import { COLORS, FONT, FONT_COND, FONT_SIZE, RADIUS, SPACE, TOUCH, ELEV, TRACKING, TNUM, responsive } from '../utils/theme';
import { rdShade } from '../utils/color';
import { computeTeamRecords } from '../utils/teamStats';
import Preloader from '../components/Preloader';
import { useScreenLoader } from '../hooks/useScreenLoader';
import { useField } from '../hooks/useField';
import { useWide } from '../hooks/useWide';
import { useUserNames, fallbackScoutLabel } from '../hooks/useUserNames';
import { useLanguage } from '../hooks/useLanguage';
import { useDisplayName } from '../utils/playerName';
import { Footprints, Crosshair, Route, Medal, Zap, Skull, X, ChevronDown } from 'lucide-react';
import { resolveZones } from '../utils/layoutZones';
import DrawingOverlay, { STROKE_COLORS, STROKE_SIZES } from '../components/canvas/DrawingOverlay';
import DrawToolbar from '../components/canvas/DrawToolbar';
import { strokesToFirestore, strokesFromFirestore, eraseAcrossStrokes } from '../components/canvas/drawStrokes';
import SearchFilterPanel from '../components/SearchFilterPanel';
import { matchEntity, playerInDivision, playerDivisionSet } from '../utils/entityFilters';

// ── Inline helpers (§ 28) ──────────────────────────────────────────────

// CollapsibleSection (§118.2): a report section that tucks away. Own useState
// (NOT an accordion — consistent with the RailZone control zones). Header reuses
// the SectionHeader visual (icon → 15px/700; no-icon → 11px uppercase muted) +
// a 44px tap target + a chevron disclosure. Body (children) shows when open.
const CollapsibleSection = ({ title, icon: Icon, defaultOpen = false, testId, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-testid={testId}>
      <div role="button" aria-expanded={open} data-testid={testId ? `${testId}-toggle` : undefined}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', minHeight: 44,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
        }}>
        {Icon && (
          <span style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`,
            color: COLORS.textDim,
          }}><Icon size={15} strokeWidth={2} /></span>
        )}
        <span style={{
          fontFamily: FONT, fontSize: 12, fontWeight: 800,
          color: COLORS.textDim, letterSpacing: TRACKING.label, textTransform: 'uppercase',
        }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: ELEV.hairline }} />
        <ChevronDown size={18} color={COLORS.textMuted}
          style={{ flexShrink: 0, transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .15s ease' }} />
      </div>
      {open && children}
    </div>
  );
};

const InsightCard = ({ type, text, detail }) => {
  const color = INSIGHT_COLORS[type] || COLORS.textDim;
  const icon = INSIGHT_ICONS[type] || '◦';
  return (
    <div style={{
      margin: '0 16px 8px',
      background: ELEV.surface,
      border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
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
      background: ELEV.surface,
      border: `1px solid ${color}25`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10, boxShadow: ELEV.shadow1,
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
  // § field-views-sync — container-query split (prototype OpponentAnalysisWide /
  // OpponentAnalysisPremium): ≥860 = field card + rail side-by-side; <860 = field
  // ON TOP, rail (scope segment + tables) below in a single column. Replaces the
  // prior orientation-gated CanvasRailLayout field-is-king path. The field card +
  // the rail measure off the SAME container width via this ref.
  const [wideRef, wide] = useWide(860);
  // § field-views-sync — the on-field "Warstwy" popover open state. 3 independent
  // filters (Pozycje/Strzały/Plan coacha) live here now, NOT in a rail LAYERS zone.
  const [layersOpen, setLayersOpen] = useState(false);
  const { t, lang } = useLanguage();
  const dn = useDisplayName();
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
  // §118.2 — confidence banner is dismissible per screen-open (not persisted): shows
  // on entry, X tucks it for this view, re-shows on reopen.
  const [confidenceDismissed, setConfidenceDismissed] = useState(false);
  // No-eternal-loading guard: if tournament/team never resolve, flip to an error
  // state after a bounded wait instead of spinning forever (the 2026-06-11
  // scouted-team bug — a createdAt-less scouted doc made the entry permanently
  // absent). Class-wide rule for data-gated detail pages (rollout: NEXT_TASKS arc B).
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const scopeParam = searchParams.get('scope') || 'tournament';
  const matchIdParam = searchParams.get('mid') || null;
  // § sub-stage 3 — POINT axis selection (match scope only). URL-driven (`pid`)
  // like scope/mid so back/forward + the landscape rail stay consistent. Null =
  // the whole-match aggregate (the prior behaviour); a value = scrub to one point.
  const pointIdParam = searchParams.get('pid') || null;
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
  // Isolate is a secondary drill-down → folded by default (Jacek 2026-06-17); the
  // breakout table is the priority read, so Isolate doesn't crowd it open.
  const [hmIsolateOpen, setHmIsolateOpen] = useState(false);
  // § Stage 6-lite — replay animation toggle (OFF by default; on-demand).
  const [hmReplay, setHmReplay] = useState(false);
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
  // W-L record for THIS scouted team (shared util, same logic as the coach list).
  const teamRecord = useMemo(
    () => computeTeamRecords(matches, scouted)[scoutedId] || { wins: 0, losses: 0, played: 0 },
    [matches, scouted, scoutedId],
  );

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

  // § sub-stage 3 — the match's points in chronological order, for the POINT axis.
  // Match scope only; `heatmapPoints` is already filtered to the selected match.
  // (`order` carried through the canonical mapper; falls back to index parity.)
  const matchPointsOrdered = useMemo(() => {
    if (!isMatchScope) return [];
    return heatmapPoints
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [heatmapPoints, isMatchScope]);

  // The selected point id is only meaningful in match scope AND when it resolves to
  // a real point in the current set (guards a stale `pid` after a scope/match switch).
  const selectedPointId = isMatchScope && matchPointsOrdered.some(p => p.id === pointIdParam)
    ? pointIdParam
    : null;

  // § sub-stage 3 — points fed to the FIELD (HeatmapCanvas). When a single point is
  // selected on the axis, the field shows JUST that point (filter to pt.id === K → a
  // 1-element array). Otherwise the whole-scope aggregate (unchanged). ONLY the field
  // narrows — the report tables (ROZBICIE/STRZELANIE/etc.) stay on the match aggregate
  // so they remain meaningful (a per-point breakdown would be trivially empty).
  const heatmapDisplayPoints = useMemo(() => {
    if (!selectedPointId) return heatmapPoints;
    return heatmapPoints.filter(pt => pt.id === selectedPointId);
  }, [heatmapPoints, selectedPointId]);

  // Selected match (when a match scope is active) + its opponent team — hoisted to
  // component scope so both the scope-pills and the report column (score bar) reuse
  // the SAME resolution (no divergence). Null in the aggregate scopes.
  const selectedMatch = isMatchScope
    ? teamMatches.find(m => m.id === matchIdParam) || null
    : null;
  const selectedOppEntry = selectedMatch
    ? scouted.find(s =>
        s.id === (selectedMatch.teamA === scoutedId ? selectedMatch.teamB : selectedMatch.teamA))
    : null;
  const selectedOppTeam = selectedOppEntry
    ? teams.find(tm => tm.id === selectedOppEntry.teamId)
    : null;
  // § Stage 6-lite — replay is playable only when ≥1 point carries Settle/Mid
  // keyframes (timeline[] holds only those; Break is keyframe #0). One stage
  // keyframe + Break = ≥2 keyframes to animate. Tracks the DISPLAYED set so a
  // single selected point's replay availability is honoured (sub-stage 3).
  const canReplay = useMemo(
    () => heatmapDisplayPoints.some(p => Array.isArray(p.timeline) && p.timeline.length > 0),
    [heatmapDisplayPoints]
  );
  // § Stage 2 — Mid is the only gated MODE segment. Break + Settle are always
  // available (every point has a settled/post-break view via kf#0); Mid only
  // when ≥1 point captured a mid keyframe.
  const hasMid = useMemo(
    () => heatmapPoints.some(p => Array.isArray(p.timeline) && p.timeline.some(e => e?.stage === 'mid')),
    [heatmapPoints]
  );
  const hasEndgame = useMemo(
    () => heatmapPoints.some(p => Array.isArray(p.timeline) && p.timeline.some(e => e?.stage === 'endgame')),
    [heatmapPoints]
  );
  // § PaT D4 — the coach report phase tabs come from the canonical module (single
  // source): break/settle/mid + endgame. Runtime keys are the PERSISTED literals
  // (toPersistedLiteral) so the stage-aware readers + testids are unchanged; only
  // the label ("Break"→"Breakout") + the net-new Endgame tab are added. Mid/Endgame
  // are gated to the data that captured them (graceful-empty otherwise).
  const phaseItems = coachReportPhases().map(p => {
    const key = toPersistedLiteral(p.key);
    const gated = key === 'mid' ? !hasMid : key === 'endgame' ? !hasEndgame : false;
    return { key, label: phaseLabel(p.key, t), testId: `hm-phase-${key}`, disabled: gated, title: gated ? t('scouted_no_mid') : undefined };
  });
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
  // § field-views-sync — the Warstwy popover closes on any outside click (prototype
  // parity: deferred listener so the opening click itself doesn't immediately close it).
  useEffect(() => {
    if (!layersOpen) return undefined;
    const close = () => setLayersOpen(false);
    const id = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(id); document.removeEventListener('click', close); };
  }, [layersOpen]);

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
        // Canonical point id (Firestore doc id) — carried so the match-scope POINT
        // axis can filter `heatmapPoints` to a SINGLE point (pt.id === K). Was
        // previously dropped by the mapper; additive, no other consumer relies on it.
        id: pt.id,
        order: pt.order,
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
  // § Stage 2.5 — the global phase control (hmPhase) drives ALL the numeric tables
  // per-phase (Jacek 2026-06-17): Break = where they ran/broke to, Settle = how the
  // setup looked, Mid = how the game developed. Breakouts/Shooting/elim-reasons all
  // follow the selected phase so field + numbers agree. Legacy pre-phase data (e.g.
  // Prague) has only Break captured → Settle/Mid show graceful-empty (no keyframe),
  // which is correct: there was no settle/mid setup to report.
  const breakSurvival = useMemo(() => computeBreakSurvival(heatmapPoints, field, hmPhase), [heatmapPoints, field, hmPhase]);
  // Crest Krok 2 — "Najczęstsze rozbiegi": most-frequent breakout-TARGET bunkers
  // for the team aggregate. Always Break-keyframe (kf#0 = point.players); NOT
  // phase-gated like breakSurvival — the lane-level "od→do" run is deferred
  // (needs a capture-flow change, see breakoutRuns.js header). Scope =
  // heatmapPoints (match/team aggregate), NOT the single-point field narrow.
  const breakoutRuns = useMemo(() => computeBreakoutRuns(heatmapPoints, field), [heatmapPoints, field]);
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

  // Premium determinate loader for the heatmap stage (point-fetch + compute = one
  // boolean → creep-and-snap; the 3 phase labels narrate fetch → compute → render).
  const { shown: heatLoaderShown, progress: heatLoaderP, close: closeHeatLoader } = useScreenLoader(heatmapLoading);

  if (!tournament || !team) {
    // Still resolving (subscriptions in flight) AND within the 12s ceiling → spinner.
    const stillLoading = (tournamentsLoading || teamsLoading || scoutedLoading) && !loadTimedOut;
    if (stillLoading) return <Preloader loop />;
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

  // § field-views-sync — the field card renders only when there's a real field image
  // + ≥1 match (else the report sections + empty states carry the page).
  const heroAvailable = teamMatches.length > 0 && !!field?.fieldImage;

  const heatmapCanvasEl = (
    <HeatmapCanvas
      fieldImage={field.fieldImage}
      points={heatmapDisplayPoints}
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

  // The draw toolbar (draw mode) — rides the canvas (replaces the on-field Rysuj
  // entry while drawing). Coach-plan write path unchanged (onDone → exitCoachDrawMode).
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

  // ── § field-views-sync — on-field "Warstwy" popover (prototype OpponentAnalysis
  // Wide/Premium) ─────────────────────────────────────────────────────────────────
  // 3 INDEPENDENT filters as the prototype's primary triad (dot swatch + label +
  // count badge), wired to the REAL prod layer state — Pozycje→hmShowPositions,
  // Strzały→hmShowShots, Plan coacha→hmShowCoachPlan. We also surface prod's two
  // additional real layers (Notatki scouta→hmShowAnnotations, Replay→hmReplay) so
  // no live capability is lost vs. the old rail LAYERS zone; the badge counts only
  // the three primary triad layers the prototype displays. §27: each swatch color is
  // semantic (success/danger), amber = the active Plan-coacha/Notatki/Replay state.
  const warstwyDefs = [
    { key: 'pos', label: t('scouted_warstwy_positions'), color: COLORS.success, on: hmShowPositions, toggle: () => setHmShowPositions(v => !v), primary: true },
    { key: 'shots', label: t('scouted_warstwy_shots'), color: COLORS.danger, on: hmShowShots, toggle: () => setHmShowShots(v => !v), primary: true },
    { key: 'plan', label: t('scouted_layer_coach_plan'), color: COLORS.accent, on: hmShowCoachPlan, toggle: () => setHmShowCoachPlan(v => !v), primary: true },
    { key: 'notes', label: t('scouted_layer_notes'), color: COLORS.accent, on: hmShowAnnotations, toggle: () => setHmShowAnnotations(v => !v), primary: false },
    { key: 'replay', label: t('scouted_warstwy_replay'), color: COLORS.accent, on: replaying, toggle: canReplay ? () => setHmReplay(v => !v) : undefined, primary: false, disabled: !canReplay },
  ];
  const warstwyActiveCount = warstwyDefs.filter(d => d.primary && d.on).length;
  const warstwyPopoverEl = (
    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 36 }}>
      <div
        role="button" aria-expanded={layersOpen} data-testid="warstwy-toggle"
        onClick={(e) => { e.stopPropagation(); setLayersOpen(o => !o); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 44,
          background: 'rgba(10,14,23,.82)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          border: `1px solid ${ELEV.hairlineStrong}`, borderRadius: 10, padding: '0 11px',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
        <span style={{ display: 'flex', color: COLORS.text }}><RdIcon name="layers" size={15} /></span>
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.text }}>{t('scouted_layer_layers')}</span>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.black, background: COLORS.accent, borderRadius: 999, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontVariantNumeric: 'tabular-nums' }}>{warstwyActiveCount}</span>
      </div>
      {layersOpen && (
        <div data-testid="warstwy-popover"
          onClick={(e) => e.stopPropagation()}
          style={{ marginTop: 7, background: ELEV.overlay, border: `1px solid ${ELEV.hairlineStrong}`, borderRadius: 12, boxShadow: ELEV.shadow3, padding: 6, minWidth: 188 }}>
          {warstwyDefs.map(d => {
            const on = !!d.on, disabled = !!d.disabled;
            return (
              <div key={d.key} role="button" aria-pressed={on}
                data-testid={`warstwy-${d.key}`}
                onClick={disabled ? undefined : (e) => { e.stopPropagation(); d.toggle && d.toggle(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', minHeight: 44,
                  borderRadius: 8, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
                  background: on ? `${d.color}1a` : 'transparent', WebkitTapHighlightColor: 'transparent',
                }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: on ? d.color : 'transparent', border: `1.5px solid ${on ? d.color : COLORS.textMuted}` }} />
                <span style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: on ? 800 : 600, color: on ? COLORS.text : COLORS.textDim }}>{d.label}</span>
                {on && <span style={{ display: 'flex', color: d.color }}><RdIcon name="check" size={14} /></span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // § field-views-sync — on-field "Rysuj" entry (prototype amber field chip). Top-
  // right ON the field; wires to the REAL prod enterCoachDrawMode (the coach-plan
  // draw — write path untouched). In draw mode the DrawToolbar replaces it.
  const fieldRysujEl = !coachDrawMode ? (
    <div role="button" aria-label={t('draw_coach_plan_aria')} data-testid="field-rysuj"
      onClick={enterCoachDrawMode}
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 36,
        display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 12px',
        background: 'rgba(10,14,23,.8)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        border: `1px solid ${COLORS.accent}55`, borderRadius: 10,
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>
      <span style={{ display: 'flex', color: COLORS.accent }}><RdIcon name="pencil" size={15} /></span>
      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.accent }}>{t('coach_draw_label')}</span>
    </div>
  ) : null;

  // § field-views-sync — ATTACHED "Oś punktu" phase axis (prototype): a play button +
  // scrubber track with the phase keyframes (Breakout/Settle/Mid/Endgame) BELOW the
  // field, replacing the floating phase tabs in the field corner. Backed by the REAL
  // prod phase state (hmPhase / phaseItems — gating + testids unchanged) and the
  // replay (hmReplay / canReplay). Each keyframe carries its hm-phase-${key} testid so
  // the per-phase report tables (and PaT Stage 2.5) stay driven from here.
  const activePhaseIdx = Math.max(0, phaseItems.findIndex(p => p.key === hmPhase));
  const phaseAxisPct = (idx) => phaseItems.length <= 1 ? 0 : Math.round((idx / (phaseItems.length - 1)) * 100);
  const fieldPhaseAxisEl = (
    <div data-testid="field-phase" style={{ background: ELEV.surface, borderTop: `1px solid ${ELEV.hairline}`, padding: '14px 18px', ...inertWhileReplaying }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.textDim, letterSpacing: TRACKING.label, textTransform: 'uppercase' }}>{t('scouted_layer_stage')}</span>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: replaying ? COLORS.accent : COLORS.textMuted }}>
          {replaying ? t('scouted_axis_playing') : (canReplay ? t('scouted_axis_hint') : '')}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div role="button" aria-label="Replay" aria-pressed={replaying}
          data-testid="field-phase-replay"
          onClick={canReplay ? () => setHmReplay(v => !v) : undefined}
          title={canReplay ? undefined : t('scouted_no_mid')}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: canReplay ? `linear-gradient(150deg, ${COLORS.accent}, ${COLORS.accentDim})` : ELEV.sunken,
            color: canReplay ? COLORS.black : COLORS.textMuted,
            cursor: canReplay ? 'pointer' : 'default', opacity: canReplay ? 1 : 0.5,
            boxShadow: canReplay ? `0 3px 12px ${COLORS.accent}44` : 'none',
          }}>{replaying ? <RdIcon name="pause" size={15} /> : <RdIcon name="play" size={15} />}</div>
        <div role="tablist" aria-label={t('scouted_layer_stage')} style={{ flex: 1, minWidth: 0, paddingTop: 5 }}>
          <div style={{ position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ height: 6, width: '100%', borderRadius: 999, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, overflow: 'hidden' }}>
              <div style={{ width: phaseAxisPct(activePhaseIdx) + '%', height: '100%', borderRadius: 999, background: COLORS.accent }} />
            </div>
            {phaseItems.map((p, i) => {
              const pos = phaseAxisPct(i), active = p.key === hmPhase, passed = i <= activePhaseIdx;
              return (
                <div key={p.key} role="tab" aria-selected={active}
                  data-testid={`field-phase-${p.key}`}
                  title={p.disabled ? p.title : undefined}
                  onClick={p.disabled ? undefined : () => setHmPhase(p.key)}
                  style={{
                    position: 'absolute', left: pos + '%', top: '50%', transform: 'translate(-50%,-50%)',
                    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: p.disabled ? 'default' : 'pointer', opacity: p.disabled ? 0.4 : 1,
                    zIndex: 2, WebkitTapHighlightColor: 'transparent',
                  }}>
                  <span style={{
                    width: active ? 15 : 12, height: active ? 15 : 12, borderRadius: '50%',
                    background: passed ? COLORS.accent : ELEV.raised,
                    border: `2px solid ${active ? '#fff' : (passed ? COLORS.accent : COLORS.accent + '88')}`,
                    boxShadow: active ? `0 0 0 4px ${COLORS.accent}33` : 'none', transition: 'width .12s, height .12s',
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ position: 'relative', height: 15, marginTop: 7 }}>
            {phaseItems.map((p, i) => {
              const pos = phaseAxisPct(i), active = p.key === hmPhase;
              return (
                <span key={p.key} data-testid={`hm-phase-${p.key}`}
                  onClick={p.disabled ? undefined : () => setHmPhase(p.key)}
                  title={p.disabled ? p.title : undefined}
                  style={{
                    position: 'absolute', left: pos + '%',
                    transform: pos === 0 ? 'none' : pos === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                    fontFamily: FONT, fontSize: 11, fontWeight: active ? 800 : 600,
                    color: p.disabled ? COLORS.borderLight : active ? COLORS.accent : COLORS.textMuted,
                    cursor: p.disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
                    opacity: p.disabled ? 0.5 : 1,
                  }}>{p.label}</span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // § sub-stage 3 — POINT axis ("Oś punktu"). Match scope only: a horizontal
  // scrubber of the SELECTED match's points, in chronological order. Selecting a
  // stop filters the field (HeatmapCanvas) to that ONE point (pt.id === K) via the
  // canonical source (kf#0 homeData/awayData + additive timeline[] — no reinvented
  // timeline); the leading "Whole match" stop clears back to the aggregate. This
  // REPLACES the per-match phase-aggregate field read with a per-point read; the
  // Stage segment below still governs the report tables (and the WITHIN-point phase
  // when one point is shown). Chosen form = horizontal scrubber (prototype "OŚ
  // PUNKTU") over reusing MatchPage's split-tap head-to-head row, which is bound to
  // MatchPage's bidirectional live-scoring state + both teams — this page is
  // one-side/read-only, so the scrubber is the clean, faithful fit and mirrors the
  // page's own segmented-axis idiom. Aggregate scopes never render it.
  const selectPoint = (id) => {
    const next = { scope: 'match', mid: matchIdParam };
    if (id) next.pid = id;
    setSearchParams(next);
  };
  const pointAxisEl = (isMatchScope && matchPointsOrdered.length > 0) ? (
    <div style={{ padding: '8px 16px 0', ...inertWhileReplaying }}>
      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{t('scouted_point_axis')}</div>
      <div role="tablist" aria-label={t('scouted_point_axis')} data-testid="scouted-point-axis"
        style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, alignItems: 'stretch' }}>
        {/* "Whole match" stop — clears the point filter back to the aggregate. */}
        {(() => {
          const active = !selectedPointId;
          return (
            <div role="tab" aria-selected={active} data-testid="point-axis-all"
              onClick={() => selectPoint(null)}
              style={{
                flexShrink: 0, minHeight: TOUCH.minTarget, padding: '0 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: RADIUS.full, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: active ? 800 : 700,
                background: active ? COLORS.accentA12 : COLORS.surface,
                color: active ? COLORS.accent : COLORS.textMuted,
                border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                whiteSpace: 'nowrap',
              }}>{t('scouted_point_all')}</div>
          );
        })()}
        {matchPointsOrdered.map((pt, i) => {
          const active = selectedPointId === pt.id;
          // outcome carried by the canonical mapper: 'win' | 'loss' | null (this
          // scouted team's result). Identity dot — success/danger, NEVER amber (§27).
          const dotColor = pt.outcome === 'win' ? COLORS.success
            : pt.outcome === 'loss' ? COLORS.danger : COLORS.borderLight;
          return (
            <div key={pt.id} role="tab" aria-selected={active}
              data-testid={`point-axis-${pt.id}`}
              onClick={() => selectPoint(pt.id)}
              style={{
                flexShrink: 0, minHeight: TOUCH.minTarget, minWidth: 44, padding: '0 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                borderRadius: RADIUS.full, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: active ? 800 : 700,
                background: active ? COLORS.accentA12 : COLORS.surface,
                color: active ? COLORS.accent : COLORS.text,
                border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                whiteSpace: 'nowrap',
              }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              {t('scouted_point_n', i + 1)}
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  // Below-canvas view controls. § field-views-sync RESTRUCTURE: the layer toggles
  // moved to the on-field Warstwy popover (warstwyPopoverEl) and the phase keyframes
  // to the attached Oś-punktu axis (fieldPhaseAxisEl) — so this block now hosts ONLY
  // the point axis (match scope) + the per-player Isolate selector. Same state, same
  // testids (point-axis-*, isolate-toggle); just relocated chrome.
  const heatmapControlsEl = (
    <>
      {pointAxisEl}
      {/* § OSTRZAŁ B3 — per-player isolation selector. Tap a roster player →
          only their positions/cones/zones read full, the rest dim; tap again to
          clear. Chip-based (not canvas-tap): the heatmap aggregates many
          overlapping positions per player, so a deterministic roster pick is
          unambiguous. Active chip = amber (selected state). */}
      {roster.length > 0 && (
        <div style={{ padding: '0 16px 8px' }}>
          {/* Folded by default — a secondary drill-down, kept out of the way of the
              breakout table. Header row toggles; shows the active isolate inline. */}
          <div
            role="button"
            data-testid="isolate-toggle"
            onClick={() => setHmIsolateOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              minHeight: 44, ...inertWhileReplaying,
            }}>
            <span style={{ flexShrink: 0, fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('scouted_layer_isolate')}</span>
            {hmSelectedPlayer && !hmIsolateOpen && (() => {
              const sp = roster.find(p => p.id === hmSelectedPlayer);
              return sp ? <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.accent }}>{(sp.name || sp.nickname) ? dn(sp) : `#${sp.number}`}</span> : null;
            })()}
            <span style={{ marginLeft: 'auto', fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, transition: 'transform 0.15s', transform: hmIsolateOpen ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {hmIsolateOpen && (
            <div style={{ display: 'flex', gap: 6, paddingTop: 4, overflowX: 'auto', alignItems: 'center' }}>
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
                    <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: active ? COLORS.accent : COLORS.text, whiteSpace: 'nowrap' }}>{(p.name || p.nickname) ? dn(p) : `#${p.number}`}</span>
                  </div>
                );
              })}
            </div>
          )}
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

  // Team-detail header BAND (prototype team-detail header, redesign.jsx 2408-2419) —
  // a big identity band with the crest (logo / flag / initials) bled in from the left
  // as the BACKGROUND, the team name + W-L riding on top, instead of the small circle.
  // Sits directly under the nav PageHeader. Color tint gradient + dark scrim keep the
  // name legible (§ 27: identity treatment, never amber, scrim is legibility not glow).
  const teamCrestHeaderEl = team ? (() => {
    const color = team.color || COLORS.borderLight;
    const rec = teamRecord || { wins: 0, losses: 0, played: 0 };
    return (
      <div data-testid="scouted-team-crest-header" style={{
        position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 18,
        margin: wide ? '0 24px 4px' : '0 16px 4px', minHeight: 108, padding: '24px 22px',
        background: `linear-gradient(100deg, ${rdShade(color, 0.36)}, ${rdShade(color, 0.6)} 56%, ${ELEV.surface})`,
        border: `1px solid ${color}45`, borderRadius: 20, boxShadow: ELEV.shadow1,
      }}>
        <CrestBand team={team} imgH={188} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg, rgba(8,11,17,.42) 0%, rgba(8,11,17,.14) 48%, transparent 74%)' }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 0, paddingLeft: 96 }}>
          <div style={{ fontFamily: FONT_COND, fontSize: 28, fontWeight: 700, color: COLORS.white, textTransform: 'uppercase', letterSpacing: TRACKING.tight, textShadow: '0 2px 8px rgba(0,0,0,.6)', overflowWrap: 'anywhere' }}>{team.name}</div>
          {rec.played > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 8, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 10, padding: '5px 11px' }}>
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: COLORS.success, ...TNUM }}>{rec.wins}</span>
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted }}>W</span>
              <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted }}>·</span>
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: COLORS.danger, ...TNUM }}>{rec.losses}</span>
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted }}>L</span>
            </div>
          )}
        </div>
      </div>
    );
  })() : null;

  // § field-views-sync — the FIELD CARD (prototype OpponentAnalysisWide/Premium
  // `fieldCard`): one rounded card = the field region (HeatmapCanvas + on-field
  // Warstwy popover + Rysuj entry + draw toolbar) with the attached Oś-punktu phase
  // axis BELOW it, then the point-axis/isolate controls. Replaces the old expand/
  // collapse heatmap section + the floating phase tabs. The HeatmapCanvas + coach-
  // draw wiring are the SAME elements (heatmapCanvasEl) — only the chrome changed.
  // The field region is NOT a fixed-height box: HeatmapCanvas sizes width-first
  // ('fit') and drives its own height (real prod sizing — a forced fixed height would
  // clip the canvas, since HeatmapCanvas hardcodes its sizing strategy). The card
  // width is governed by the grid column (≈1.45fr wide / full-bleed narrow).
  const fieldCardEl = heroAvailable ? (
    <div data-testid="opponent-field-card" style={{ background: ELEV.surface, border: `1px solid ${ELEV.hairlineStrong}`, borderRadius: 16, overflow: 'hidden', boxShadow: ELEV.shadow2 }}>
      <div style={{ position: 'relative', background: '#0a1410' }}>
        {heatmapCanvasEl}
        {coachDrawMode && coachDrawToolbarEl}
        {!coachDrawMode && warstwyPopoverEl}
        {!coachDrawMode && fieldRysujEl}
      </div>
      {/* attached Oś-punktu axis (phase keyframes + play) */}
      {fieldPhaseAxisEl}
      {/* point axis + isolate sit directly under the card (match scope / drill-down) */}
      <div style={{ background: ELEV.surface, borderTop: `1px solid ${ELEV.hairline}` }}>
        {heatmapControlsEl}
      </div>
    </div>
  ) : null;

  // § field-views-sync — SCOPE segmented control (prototype rail top): Ostatni mecz /
  // Ten turniej / Ten layout, an amber-fill segment (replaces the wrapping pill row).
  // Same scope state/URL writes; the Mecz ▾ picker pill rides alongside (match scope
  // is data-driven via the picker + the match list, not a fixed segment).
  const scopeSegmentEl = (() => {
    const layoutTs = currentLayoutId ? tournaments.filter(t => t.layoutId === currentLayoutId) : [];
    const showLayoutSeg = currentLayoutId && layoutTs.length > 1;
    const segs = [
      { key: 'lastMatch', label: t('scope_last_match'), active: isLastMatchScope, disabled: !lastMatch, onClick: () => setSearchParams({ scope: 'lastMatch' }) },
      { key: 'tournament', label: t('scope_tournament'), active: isTournamentScope, onClick: () => setSearchParams({}) },
      ...(showLayoutSeg ? [{ key: 'layout', label: `${t('scope_layout')} (${layoutTs.length})`, active: isLayoutScope, onClick: () => setSearchParams({ scope: 'layout' }) }] : []),
    ];
    const matchActive = isMatchScope;
    return (
      <div data-testid="scope-segment" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 12, padding: 4 }}>
          {segs.map(s => (
            <div key={s.key} role="button" aria-pressed={s.active} aria-disabled={s.disabled || undefined}
              data-testid={`scope-seg-${s.key}`}
              onClick={s.disabled ? undefined : s.onClick}
              title={s.disabled ? t('scope_no_closed') : undefined}
              style={{
                flex: 1, textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 9, cursor: s.disabled ? 'default' : 'pointer', opacity: s.disabled ? 0.45 : 1,
                background: s.active ? COLORS.accent : 'transparent',
                color: s.active ? COLORS.black : COLORS.textDim,
                fontFamily: FONT, fontSize: 12, fontWeight: 800, letterSpacing: 0.2,
                WebkitTapHighlightColor: 'transparent',
              }}>{s.label}</div>
          ))}
        </div>
        {/* Mecz ▾ picker — a separate affordance (the match scope opens a specific
            match's points); active state shows the opponent + a clear ✕. */}
        <div role="button" data-testid="scope-match-picker"
          onClick={() => matchActive ? setSearchParams({}) : setMatchPickerOpen(true)}
          style={{
            marginTop: 8, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            background: matchActive ? COLORS.accentA08 : 'transparent',
            border: `1px solid ${matchActive ? COLORS.accent : COLORS.border}`,
            color: matchActive ? COLORS.accent : COLORS.textDim,
            fontFamily: FONT, fontSize: 12, fontWeight: 700,
          }}>
          <span>{matchActive ? `vs ${selectedOppTeam?.name || '?'}` : t('scope_match_picker')}</span>
          {matchActive && <span style={{ fontSize: 11, opacity: 0.7 }}>✕</span>}
        </div>
      </div>
    );
  })();

  // (§ field-views-sync — the scope PILLS were replaced by the scope SEGMENT at the
  // top of the rail, see scopeSegmentEl above. The §60.6 scope semantics — Ostatni
  // mecz / Ten turniej / Ten layout + Mecz ▾ picker — are preserved verbatim there.)

  // Match score bar (§ sub-stage 1) — a prominent header strip rendered at the top
  // of the report column ONLY when a single match is scoped (isMatchScope). Shows
  // {scoutedTeam} {myScore} : {oppScore} {opponent} with W/L/draw color (the SAME
  // won/lost/resultColor logic as the Matches list rows), crests via TeamBadge, and
  // the match date/status. Additive — nothing renders in the aggregate scopes.
  const matchScoreBarEl = (() => {
    if (!isMatchScope || !selectedMatch) return null;
    const m = selectedMatch;
    const isA = m.teamA === scoutedId;
    const sA = m.scoreA || 0, sB = m.scoreB || 0;
    const myScore = isA ? sA : sB;
    const oppScore = isA ? sB : sA;
    const isFinal = m.status === 'closed';
    const hasScore = sA > 0 || sB > 0;
    const won = isFinal && hasScore && myScore > oppScore;
    const lost = isFinal && hasScore && myScore < oppScore;
    const isDraw = isFinal && hasScore && myScore === oppScore;
    const resultColor = won ? COLORS.success : lost ? COLORS.danger : isDraw ? COLORS.accent : COLORS.text;
    const statusLabel = isFinal
      ? (won ? 'W' : lost ? 'L' : isDraw ? 'D' : null)
      : null;
    const dateLabel = m.date || (isFinal ? null : t('match_card_scheduled'));
    return (
      <div data-testid="scouted-score-bar" style={{
        display: 'flex', alignItems: 'center', gap: SPACE.md,
        padding: '14px 16px', margin: '12px 16px 4px',
        background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`,
        borderRadius: RADIUS.lg,
      }}>
        {/* scouted (this) team */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text, textAlign: 'right', overflowWrap: 'normal', wordBreak: 'normal', textWrap: 'balance' }}>
            {team?.name || 'Team'}
          </span>
          {team && <TeamBadge team={team} size={26} />}
        </div>
        {/* score + status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 900, letterSpacing: '-.3px', color: hasScore ? resultColor : COLORS.textMuted, lineHeight: 1 }}>
            {hasScore ? `${myScore} : ${oppScore}` : '— : —'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {statusLabel && <ResultBadge result={statusLabel} />}
            {dateLabel && (
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600, color: COLORS.textMuted }}>
                {dateLabel}
              </span>
            )}
          </div>
        </div>
        {/* opponent team */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedOppTeam && <TeamBadge team={selectedOppTeam} size={26} />}
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text, overflowWrap: 'normal', wordBreak: 'normal', textWrap: 'balance' }}>
            {selectedOppTeam?.name || '?'}
          </span>
        </div>
      </div>
    );
  })();

  // § field-views-sync — the REPORT column (coach numeric sections). Content-height;
  // the page-level container (the useWide grid) owns scrolling. The fixed-width table
  // columns + word-wise name wrapping keep names full + un-clipped at any rail width.
  const renderColumn = () => (
      <div data-testid="scouted-report-column" style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 24 }}>
        {/* Match score bar — match-scoped only (sub-stage 1) */}
        {matchScoreBarEl}
        {/* Data confidence banner — contextual qualifier */}
        {heatmapPoints.length > 0 && !confidenceDismissed && (
          <div style={{ position: 'relative' }}>
          {(() => {
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
          <button type="button" data-testid="scouted-confidence-dismiss" aria-label={t('close') || 'Dismiss'} onClick={() => setConfidenceDismissed(true)}
            style={{ position: 'absolute', top: 2, right: 2, minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer' }}>
            <X size={16} />
          </button>
          </div>
        )}

        {/* Loading state — premium determinate Preloader (point-fetch + heatmap compute) */}
        {heatLoaderShown && (
          <div style={{ position: 'relative', minHeight: 260 }}>
            <Preloader
              progress={heatLoaderP}
              phases={[{ label: t('preloader_phase_fetch_points'), to: 38 }, { label: t('preloader_phase_compute_heatmap'), to: 80 }, { label: t('preloader_phase_render'), to: 100 }]}
              caption="reads · analiza przeciwnika"
              onDone={closeHeatLoader}
            />
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
        {/* § field-views-sync — the heatmap is no longer a section inside the report
            column: it is the dedicated FIELD CARD (fieldCardEl) rendered beside/above
            the rail. The report column holds ONLY the coach numeric sections. */}

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
            <CollapsibleSection icon={Footprints} title={t('section_breakouts')} defaultOpen testId="sec-breakouts">
              <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Column headers — § 60.4 added Played + In pts */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', background: COLORS.surface,
                  borderBottom: `1px solid ${COLORS.surfaceLight}`,
                }}>
                  <div style={{ flex: 1 }} />
                  <div style={{ width: 52, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('col_rozbieg')}</div>
                  <div data-testid="breakouts-col-surv" style={{ width: 72, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('col_przezycie')}</div>
                  <div data-testid="breakouts-col-people" style={{ width: 44, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('col_osobopozycje')}</div>
                  <div style={{ width: 44, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('col_played')}</div>
                  <div style={{ width: 52, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('col_played_in')}</div>
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
                        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text, minWidth: 0, overflowWrap: 'normal', wordBreak: 'normal', textWrap: 'balance' }}>{b.name}</span>
                        {b.type && (
                          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, fontWeight: 500 }}>{b.type}</span>
                        )}
                      </div>
                      <div style={{ width: 52, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: freqColor }}>{b.pct}%</div>
                      <div style={{ width: 72, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 12, fontWeight: 800, color: survColor }}>{b.survivalPct}%</div>
                      <div data-testid="breakouts-cell-people" style={{ width: 44, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: b.people > 0 ? COLORS.text : COLORS.textMuted }}>{b.people > 0 ? b.people : '—'}</div>
                      <div style={{ width: 44, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.text }}>{b.timesPlayed}</div>
                      <div style={{ width: 52, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.textDim }}>{b.pointsPlayed}/{b.totalPoints}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ margin: '0 16px 12px', fontFamily: FONT, fontSize: 10, fontStyle: 'italic', color: COLORS.textMuted }}>
                {t('breakout_survival_overall', overallSurvival)}
              </div>
            </CollapsibleSection>
          );
        })()}

        {/* Crest Krok 2 — Najczęstsze rozbiegi (most-frequent breakout-target
            bunkers). Mirrors the Breakouts table-row idiom; columns map to the
            wireframe: # · Rozbieg (bunker) · Częstość (count "14×") · Sukces
            (success %) · Udział (share bar, width = sharePct). Read-only DATA →
            zero amber (§27: amber is interactive-only); share bar uses a neutral
            fill, success% uses semantic success/accent/danger thresholds. The
            literal lane→bunker "od→do" run is DEFERRED — see breakoutRuns.js. */}
        {breakoutRuns.length > 0 && (() => {
          const successColor = (pct) =>
            pct >= 60 ? COLORS.success : pct >= 40 ? COLORS.accent : COLORS.danger;
          return (
            <CollapsibleSection icon={Route} title={t('breakout_runs_title')} testId="breakout-runs">
              <div style={{ margin: '0 16px 12px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Column headers — # · Rozbieg · Częstość · Sukces · Udział */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', background: COLORS.surface,
                  borderBottom: `1px solid ${COLORS.surfaceLight}`,
                }}>
                  <div style={{ width: 18, fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4 }}>#</div>
                  <div style={{ flex: 1, fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('breakout_runs_col_target')}</div>
                  <div style={{ width: 52, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('breakout_runs_col_count')}</div>
                  <div style={{ width: 52, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('breakout_runs_col_success')}</div>
                  <div style={{ width: 88, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('breakout_runs_col_share')}</div>
                </div>
                {breakoutRuns.map((r, i) => (
                  <div key={r.bunker} data-testid={`breakout-run-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    borderBottom: i < breakoutRuns.length - 1 ? `1px solid ${COLORS.surface}` : 'none',
                  }}>
                    <div style={{ width: 18, fontFamily: FONT, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: COLORS.textMuted }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text, overflowWrap: 'normal', wordBreak: 'normal', textWrap: 'balance' }}>{r.bunker}</div>
                    <div style={{ width: 52, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: COLORS.text }}>{r.count}×</div>
                    <div style={{ width: 52, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: successColor(r.successPct) }}>{r.successPct}%</div>
                    <div style={{ width: 88, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: COLORS.surface, overflow: 'hidden' }}>
                        <div style={{ width: `${r.sharePct}%`, height: '100%', borderRadius: 3, background: COLORS.textDim }} />
                      </div>
                      <span style={{ width: 32, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: FONT, fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: COLORS.textDim }}>{r.sharePct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
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
            <CollapsibleSection icon={Crosshair} title={t('section_shots_v2')} testId="sec-shots">
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
            </CollapsibleSection>
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
            <CollapsibleSection icon={Skull} title={t('section_elim_reasons')} testId="sec-elim-reasons">
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
            </CollapsibleSection>
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
          const nameOf = (p) => p ? ((p.name || p.nickname) ? dn(p) : `#${p.number || ''}`) : t('callout_unknown_player');
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
            <CollapsibleSection icon={Crosshair} title={t('section_callout_zones')} testId="sec-callout-zones">
              {phaseTable('Break', breakRows)}
              {phaseTable('Settle', settleRows)}
              {phaseTable('Mid', midRows)}
            </CollapsibleSection>
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
            <CollapsibleSection icon={Medal} title={t('section_key_players')} testId="sec-key-players">
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
                        <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text, overflowWrap: 'normal', wordBreak: 'normal', textWrap: 'balance' }}>
                          {h.number ? `#${h.number} ` : ''}{dn(playersById[h.playerId] || { name: h.fullName, nickname: h.name !== h.fullName ? h.name : undefined })}
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
            </CollapsibleSection>
          );
        })()}

        {/* Section 5 — Big Moves (above fold only when detections exist) */}
        {bigMoves.hasZone && bigMoves.bunkers.length > 0 && (
          <CollapsibleSection icon={Zap} title={t('section_big_moves')} testId="sec-big-moves">
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
          </CollapsibleSection>
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
          <CollapsibleSection title={t('section_counter')} testId="sec-counter">
            {counters.map((c, i) => (
              <CounterCard key={i} counter={c} />
            ))}
          </CollapsibleSection>
        )}

        {/* Key insights */}
        {insights.length > 0 && (
          <CollapsibleSection title={t('section_insights')} testId="sec-insights">
            {insights.map((ins, i) => (
              <InsightCard key={i} type={ins.type} text={ins.text} detail={ins.detail} />
            ))}
          </CollapsibleSection>
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
            <CollapsibleSection title={t('section_signals')} testId="sec-signals">
              <div style={{ margin: '0 16px 8px', background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`, borderRadius: 12, overflow: 'hidden' }}>

                {/* Most eliminated player */}
                {mostEliminated && (
                  <Row label={t('signal_targeted')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                        {mostEliminated.number ? `#${mostEliminated.number} ` : ''}{mostEliminated.name ? (playersById[mostEliminated.playerId] ? dn(playersById[mostEliminated.playerId]) : mostEliminated.name) : `Slot ${mostEliminated.slot + 1}`}
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
            </CollapsibleSection>
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
            <CollapsibleSection icon={Route} title={t('section_tendency')} testId="sec-tendency">
              <div style={{ display: 'flex', gap: 8, margin: '0 16px 8px' }}>
                <SideCard label={t('side_dorito_label')} side="dorito" data={sideTendency.dorito} />
                <SideCard label={t('side_center_label')} side="center" data={sideTendency.center} />
                <SideCard label={t('side_snake_label')}  side="snake"  data={sideTendency.snake} />
              </div>
              <div style={{ margin: '0 16px 12px' }}>
                <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 3 }}>{t(labelKey)}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontStyle: 'italic', color: COLORS.textMuted, lineHeight: 1.5 }}>{t(detailKey)}</div>
              </div>
            </CollapsibleSection>
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
                        <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>{dn(p)}</span>
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
                      {dn({ name: p.name })} {p.nickname && <span style={{ color: COLORS.textDim }}>„{p.nickname}"</span>}
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
                      <span style={{ display: 'inline-flex', color: isTHero ? COLORS.accent : COLORS.textMuted }}><RdIcon name="star" size={11} /></span>
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

        {/* Matches — § field-views-sync: in WIDE (≥860, field+rail side-by-side) this
            is the master pane of the master-detail flow (row → match scope drives the
            field card + score bar), surfaced + default-open. In NARROW it stays behind
            the show-more toggle and the whole row navigates to the match page. */}
        {(wide || showAdditional) && (
        <CollapsibleSection title={t('section_matches', teamMatches.length)} testId="sec-matches" defaultOpen={wide}>

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
            // Sub-stage 2 — master-detail in WIDE: the row is the master pane.
            // Click → select the match scope (field card + score-bar update beside it)
            // instead of navigating away; the selected row is accent-highlighted; an
            // explicit "open match" affordance keeps the full match page reachable.
            // NARROW is unchanged — the whole row navigates as today.
            const isSelectedRow = wide && isMatchScope && matchIdParam === m.id;
            const openMatch = () => navigate(`/tournament/${tournamentId}/match/${m.id}`);
            const rowClick = wide
              ? () => setSearchParams({ scope: 'match', mid: m.id })
              : openMatch;
            return (
              <div key={m.id} onClick={rowClick}
                aria-current={isSelectedRow ? 'true' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: SPACE.sm,
                  padding: '14px 16px', borderRadius: RADIUS.lg,
                  background: isSelectedRow ? COLORS.accentA10 : COLORS.surfaceDark,
                  border: `1px ${isScheduled ? 'dashed' : 'solid'} ${isSelectedRow ? COLORS.accent : COLORS.border}`,
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
                {/* Open-match affordance — wide only; narrow keeps the
                    whole-row-navigates behaviour so no second control competes. */}
                {wide && (
                  <div role="button" aria-label={t('open_match')} data-testid="open-match-btn"
                    onClick={(e) => { e.stopPropagation(); openMatch(); }}
                    style={{
                      minWidth: 44, minHeight: 44, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: RADIUS.md, color: COLORS.textDim,
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    }}>
                    <RdIcon name="door" size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </CollapsibleSection>
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

  // § field-views-sync — the scout CTA at the foot of the rail (prototype). Reuses
  // the existing "open this match → scout a point" door: a single accent action.
  const scoutCtaEl = isMatchScope && selectedMatch ? (
    <div role="button" data-testid="opponent-scout-cta"
      onClick={() => navigate(`/tournament/${tournamentId}/match/${selectedMatch.id}`)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        margin: '4px 16px 0', minHeight: 48, padding: '0 15px', borderRadius: 13,
        background: COLORS.accent, color: COLORS.black,
        fontFamily: FONT, fontSize: 15, fontWeight: 800, cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <RdIcon name="target" size={17} /> {t('open_match')}
    </div>
  ) : null;

  // § field-views-sync — ONE responsive layout (prototype OpponentAnalysisWide /
  // OpponentAnalysisPremium). `wide` (≥860, measured on wideRef) → field card + rail
  // SIDE BY SIDE (field sticky); `<860` → field card ON TOP, rail (scope segment +
  // tables + CTA) BELOW in a single column. No orientation gate, no fixed overlay:
  // the same chrome at phone / tablet / desktop. The coach-draw write path and all
  // data hooks are unchanged — only the container changed.
  const railEl = (
    <div style={{ minWidth: 0, marginTop: wide ? 0 : 22 }}>
      {scopeSegmentEl}
      {renderColumn()}
      {scoutCtaEl}
    </div>
  );

  return (
    <div ref={wideRef} style={{ minHeight: '100vh', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      {pageHeaderEl}
      {teamCrestHeaderEl}
      <div style={{ flex: 1, padding: wide ? '20px 24px 48px' : '14px 0 44px' }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          display: wide ? 'grid' : 'block',
          gridTemplateColumns: wide ? 'minmax(0, 1.45fr) minmax(380px, 1fr)' : '1fr',
          gap: 24, alignItems: 'start',
        }}>
          <div style={{ position: wide ? 'sticky' : 'static', top: wide ? 16 : 'auto', minWidth: 0, padding: wide ? 0 : '0 16px' }}>
            {fieldCardEl}
          </div>
          <div style={{ padding: wide ? 0 : 0 }}>{railEl}</div>
        </div>
      </div>
      {modalsEl}
    </div>
  );
}
