import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { useDevice } from '../hooks/useDevice';
import { useWorkspace } from '../hooks/useWorkspace';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import FieldCanvas from '../components/FieldCanvas';
import HeatmapCanvas from '../components/HeatmapCanvas';
import FieldEditor from '../components/FieldEditor'; // used only in heatmap view
import { Btn, SectionTitle, SectionLabel, Select, Icons, EmptyState, Modal, ConfirmModal, ActionSheet, MoreBtn, CoachingStats } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints, usePlayers, useLayouts, useTrainings, useMatchups, useTrainingPoints } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, POINT_OUTCOMES, TEAM_COLORS, responsive } from '../utils/theme';
import { useTrackedSave } from '../hooks/useSaveStatus';
import { auth } from '../services/firebase';
import { pointInPolygon, mirrorPointToLeft, mirrorShotsToRight } from '../utils/helpers';
import { computeCoachingStats } from '../utils/coachingStats';
import { useField } from '../hooks/useField';
import { useUndo } from '../hooks/useUndo';
import BottomSheet from '../components/BottomSheet';
import PageHeader from '../components/PageHeader';
import RosterGrid from '../components/RosterGrid';
import ShotDrawer from '../components/ShotDrawer';
import QuickShotPanel from '../components/QuickShotPanel';
import PointSummary from '../components/PointSummary';

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];
const E5B = () => [false, false, false, false, false];
const PENALTIES = ['', '141', '241', '341'];

function emptyTeam() {
  return { players: E5(), shots: E5A(), quickShots: E5A(), obstacleShots: E5A(), assign: E5(), bumps: E5(), elim: E5B(), elimPos: E5(), runners: E5B(), penalty: '' };
}

function mirrorX(p) { return p ? { ...p, x: 1 - p.x } : null; }

// Score from points
function matchScore(points) {
  if (!points?.length) return null;
  const a = points.filter(p => p.outcome === 'win_a').length;
  const b = points.filter(p => p.outcome === 'win_b').length;
  return { a, b };
}

export default function MatchPage() {
  const device = useDevice();
  const { workspace } = useWorkspace();
  const isViewer = workspace?.role === 'viewer';
  const R = responsive(device.type);
  const isLandscape = device.isLandscape && !device.isDesktop;
    const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Training mode: URL is /training/:trainingId/matchup/:matchupId instead of
  // /tournament/:tournamentId/match/:matchId. All tournament-specific concepts
  // (scouted teams, claims, concurrent scouting) collapse to a single-coach,
  // two-squad matchup.
  const isTraining = !!params.trainingId;
  const tournamentId = isTraining ? null : params.tournamentId;
  const matchId = isTraining ? null : params.matchId;
  const trainingId = isTraining ? params.trainingId : null;
  const matchupId = isTraining ? params.matchupId : null;

  // Route params replace the side picker: ?scout=SCOUTED_TEAM_ID drops the
  // user directly into the editor for that team. ?point=POINT_ID auto-loads
  // a specific point for editing. Absence of `scout` means Match Review.
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const scoutTeamId = searchParams.get('scout');
  const pointParamId = searchParams.get('point');
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { matchups } = useMatchups(trainingId);
  const { points: tournPoints, loading: tournLoading } = usePoints(tournamentId, matchId);
  const { points: trainPoints, loading: trainLoading } = useTrainingPoints(trainingId, matchupId);
  const points = isTraining ? trainPoints : tournPoints;
  const loading = isTraining ? trainLoading : tournLoading;
  const { layouts } = useLayouts();

  // ── ds wrappers — switch between tournament & training paths ──
  const addPointFn = (data) => isTraining
    ? ds.addTrainingPoint(trainingId, matchupId, data)
    : ds.addPoint(tournamentId, matchId, data);
  const updatePointFn = (pid, data) => isTraining
    ? ds.updateTrainingPoint(trainingId, matchupId, pid, data)
    : ds.updatePoint(tournamentId, matchId, pid, data);
  const deletePointFn = (pid) => isTraining
    ? ds.deleteTrainingPoint(trainingId, matchupId, pid)
    : ds.deletePoint(tournamentId, matchId, pid);
  const updateMatchFn = (data) => isTraining
    ? ds.updateMatchup(trainingId, matchupId, data)
    : ds.updateMatch(tournamentId, matchId, data);
  const deleteMatchFn = () => isTraining
    ? ds.deleteMatchup(trainingId, matchupId)
    : ds.deleteMatch(tournamentId, matchId);
  const backToParent = isTraining ? `/training/${trainingId}` : '/';
  const reviewUrl = isTraining
    ? `/training/${trainingId}/matchup/${matchupId}`
    : `/tournament/${tournamentId}/match/${matchId}`;

  // Editor state
  const [editingId, setEditingId] = useState(null);
  const deleteConfirm = useConfirm();
  const playerDeleteConfirm = useConfirm();
  const closeMatchConfirm = useConfirm();
  const clearAllConfirm = useConfirm();
  const deleteMatchConfirm = useConfirm();
  const [draftA, setDraftA] = useState(emptyTeam());
  const [draftB, setDraftB] = useState(emptyTeam());
  const [activeTeam, setActiveTeam] = useState('A');
  const [fieldSide, setFieldSide] = useState('left');
  const nextFieldSideRef = useRef('left'); // always holds the truth
  // BUG-1 fix: track the last currentHomeSide we applied so the sync effect
  // doesn't re-fire on unrelated dep changes (like editingId clearing after save).
  const lastSyncedHomeSideRef = useRef(null);
  const [selPlayer, setSelPlayer] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [pointMenu, setPointMenu] = useState(null); // { id, idx }
  const [mode, setMode] = useState('place');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const tracked = useTrackedSave();
  const [showOpponent, setShowOpponent] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [viewMode, setViewMode] = useState('auto'); // auto|heatmap|editor
  const [showBunkers, setShowBunkers] = useState(false);
  // editorZoom removed — pinch-to-zoom is built into FieldCanvas
  const [showLines, setShowLines] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [draftComment, setDraftComment] = useState('');
  const [isOT, setIsOT] = useState(false);
  // scoutingSide derived from URL: null until URL effect resolves (see below).
  // 'home'|'away' = scouting, 'observe' = review mode (no scout param).
  const [scoutingSide, setScoutingSide] = useState(null);
  const [heatmapSide, setHeatmapSide] = useState('mine');
  const [hmShowPositions, setHmShowPositions] = useState(true);
  const [hmShowShots, setHmShowShots] = useState(true);
  const [previewPointId, setPreviewPointId] = useState(null);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const undoStack = useUndo(10);
  const [toolbarPlayer, setToolbarPlayer] = useState(null);
  const [shotMode, setShotMode] = useState(null);
  const [quickShotPlayer, setQuickShotPlayer] = useState(null); // idx of player in QuickShotPanel
  const [onFieldRoster, setOnFieldRoster] = useState([]);
  const [rosterGridVisible, setRosterGridVisible] = useState(true);
  const [sideChange, setSideChange] = useState(false);
  // Auto-select "Swap sides" when a winner is picked (paintball rule: winner switches sides)
  useEffect(() => {
    setSideChange(false); // default: stay on same side (Apple HIG: user controls actions)
  }, [outcome]);
  const [blockedTeam, setBlockedTeam] = useState(null);
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const [matchMenuOpen, setMatchMenuOpen] = useState(false);
  const lastAssignA = useRef(E5());
  const lastAssignB = useRef(E5());

  const changeFieldSide = (newSide) => {
    if (typeof newSide === 'function') newSide = newSide(nextFieldSideRef.current);
    nextFieldSideRef.current = newSide;
    setFieldSide(newSide);
  };



  // Training adapter: synthesize tournament/match/scouted/teams objects from
  // the training session + matchup so the rest of MatchPage sees a uniform
  // shape. Squad names (red/blue/green/yellow) map onto team names.
  const SQUAD_DISPLAY = { red: 'R1', blue: 'R2', green: 'R3', yellow: 'R4' };
  const training = isTraining ? trainings.find(t => t.id === trainingId) : null;
  const matchup = isTraining ? matchups.find(m => m.id === matchupId) : null;
  const parentTeam = isTraining ? teams.find(t => t.id === training?.teamId) : null;

  const tournament = isTraining
    ? (training ? {
        id: trainingId,
        name: parentTeam?.name ? `${parentTeam.name} training` : 'Training',
        type: 'training',
        layoutId: training.layoutId,
        year: null,
        league: null,
      } : null)
    : tournaments.find(t => t.id === tournamentId);

  const match = isTraining
    ? (matchup ? {
        id: matchupId,
        teamA: matchup.homeSquad,
        teamB: matchup.awaySquad,
        name: `${SQUAD_DISPLAY[matchup.homeSquad] || matchup.homeSquad} vs ${SQUAD_DISPLAY[matchup.awaySquad] || matchup.awaySquad}`,
        scoreA: matchup.scoreA || 0,
        scoreB: matchup.scoreB || 0,
        status: matchup.status,
      } : null)
    : matches.find(m => m.id === matchId);

  const field = useField(tournament, layouts, true); // useField hook

  // Resolve teams
  const scoutedA = isTraining && matchup
    ? { id: matchup.homeSquad, roster: matchup.homeRoster || training?.squads?.[matchup.homeSquad] || [] }
    : scouted.find(s => s.id === match?.teamA);
  const scoutedB = isTraining && matchup
    ? { id: matchup.awaySquad, roster: matchup.awayRoster || training?.squads?.[matchup.awaySquad] || [] }
    : scouted.find(s => s.id === match?.teamB);
  const teamA = isTraining && matchup
    ? { id: matchup.homeSquad, name: SQUAD_DISPLAY[matchup.homeSquad] || matchup.homeSquad }
    : teams.find(t => t.id === scoutedA?.teamId);
  const teamB = isTraining && matchup
    ? { id: matchup.awaySquad, name: SQUAD_DISPLAY[matchup.awaySquad] || matchup.awaySquad }
    : teams.find(t => t.id === scoutedB?.teamId);
  const rosterA = (scoutedA?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  const rosterB = (scoutedB?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  // Active draft/roster
  const draft = activeTeam === 'A' ? draftA : draftB;
  const setDraft = activeTeam === 'A' ? setDraftA : setDraftB;
  const roster = activeTeam === 'A' ? rosterA : rosterB;

  // HERO ids for active scouted team — union of tournament + global heroes (§ 25)
  const heroPlayerIds = useMemo(() => {
    const scoutedEntry = activeTeam === 'A' ? scoutedA : scoutedB;
    const activeRoster = activeTeam === 'A' ? rosterA : rosterB;
    const tournamentHeroes = scoutedEntry?.heroPlayers || [];
    const globalHeroes = activeRoster.filter(p => p?.hero).map(p => p.id);
    return [...new Set([...tournamentHeroes, ...globalHeroes])];
  }, [activeTeam, scoutedA, scoutedB, rosterA, rosterB]);

  // Mirrored opponent for canvas overlay
  const mirroredOpp = useMemo(() => {
    const src = activeTeam === 'A' ? draftB : draftA;
    return src.players.map(p => p ? mirrorX(p) : null);
  }, [activeTeam, draftA.players, draftB.players]);
  const mirroredOppElim = useMemo(() => {
    return (activeTeam === 'A' ? draftB : draftA).elim || E5B();
  }, [activeTeam, draftA.elim, draftB.elim]);

  // Hooks MUST be before any early return (React hooks ordering rule)
  useEffect(() => {
    if (draft.players.some(Boolean) && rosterGridVisible) setRosterGridVisible(false);
  }, [draft.players]);

  const toolbarItems = useMemo(() => {
    if (toolbarPlayer === null) return [];
    const isElim = draft.elim[toolbarPlayer];
    const isRunner = draft.runners?.[toolbarPlayer];
    const isLate = !!draft.bumps?.[toolbarPlayer];
    return [
      { icon: '👤', label: 'Assign', color: COLORS.accent, action: 'assign' },
      { icon: isElim ? '❤️' : '💀', label: isElim ? 'Alive' : 'Hit', color: COLORS.danger, action: 'hit' },
      { icon: isRunner ? '🔫' : '🏃', label: isRunner ? 'Gun up' : 'Runner', color: isRunner ? COLORS.info : COLORS.textDim, action: 'runner' },
      { icon: '⏱', label: isLate ? 'Bumped' : 'Bump', color: isLate ? COLORS.accent : COLORS.textDim, action: 'late' },
      { icon: '🎯', label: 'Shot', color: COLORS.textDim, action: 'shoot' },
      { icon: '✕', label: 'Del', color: COLORS.textMuted, action: 'remove' },
    ];
  }, [toolbarPlayer, draft.elim, draft.runners, draft.bumps]);

  // Auto-observe for closed matches — skip scout mode
  useEffect(() => {
    if (match?.status === 'closed' && !scoutingSide) {
      setScoutingSide('observe');
      setViewMode('review');
    }
  }, [match?.status, scoutingSide]);

  // Derive scoutingSide + viewMode from URL (?scout=) — replaces the side picker.
  // When ?scout=<scoutedTeamId> matches match.teamA → 'home', match.teamB → 'away'.
  // Absence of scout param → Match Review.
  useEffect(() => {
    if (!match) return;
    if (scoutTeamId) {
      const side = scoutTeamId === match.teamA ? 'home' : scoutTeamId === match.teamB ? 'away' : null;
      if (!side) return; // unknown team — ignore
      if (scoutingSide !== side) {
        setScoutingSide(side);
        setViewMode('editor');
        // Local orientation setup (mirrors the old claimSide side-effects).
        const homeSide = match?.currentHomeSide || 'left';
        if (side === 'home') {
          setActiveTeam('A');
          changeFieldSide(homeSide);
        } else {
          setActiveTeam('B');
          changeFieldSide(homeSide === 'left' ? 'right' : 'left');
        }
        // Write claim to Firestore so other scouts see the lock.
        // Training mode is solo per coach — no claim bookkeeping.
        if (!isTraining) {
          const uid = auth.currentUser?.uid || null;
          const claimField = side === 'home' ? 'homeClaimedBy' : 'awayClaimedBy';
          const claimTimeField = side === 'home' ? 'homeClaimedAt' : 'awayClaimedAt';
          ds.updateMatch(tournamentId, matchId, { [claimField]: uid, [claimTimeField]: Date.now() }).catch(() => {});
        }
      }
    } else {
      // No scout param → review mode
      if (scoutingSide !== 'observe') setScoutingSide('observe');
      if (viewMode !== 'review' && match?.status !== 'closed') setViewMode('review');
    }
  }, [scoutTeamId, match?.teamA, match?.teamB]);

  // Auto-load specific point when ?point=<id> param present.
  // Fires once per pointParamId — ref guards against re-loading after user navigates
  // away from the point (which would otherwise re-run on any deps change).
  const lastLoadedPointRef = useRef(null);
  useEffect(() => {
    if (!scoutTeamId || !pointParamId) {
      lastLoadedPointRef.current = null;
      return;
    }
    if (!points.length || !scoutingSide || scoutingSide === 'observe') return;
    if (lastLoadedPointRef.current === pointParamId) return;
    const pt = points.find(p => p.id === pointParamId);
    if (pt) {
      lastLoadedPointRef.current = pointParamId;
      editPoint(pt);
    }
  }, [pointParamId, scoutTeamId, scoutingSide, points.length]);

  // Sync outcome from Firestore — when other coach saves with an outcome, update local state
  useEffect(() => {
    if (!editingId || (scoutingSide !== 'home' && scoutingSide !== 'away')) return;
    const currentPoint = points.find(p => p.id === editingId);
    if (currentPoint?.outcome && currentPoint.outcome !== 'pending' && !outcome) {
      setOutcome(currentPoint.outcome);
    }
  }, [points, editingId]);

  // Sync fieldSide from Firestore (match.currentHomeSide) — deterministic for both coaches
  // Chess model: perspective locked during editing, syncs between points
  // BUG-1 fix: guard against re-firing on editingId clears. We only want to apply
  // when match.currentHomeSide actually changes (or on first mount). Without the
  // `lastSyncedHomeSideRef` check, clearing editingId after save would re-read stale
  // currentHomeSide and silently revert a swap that was just persisted.
  useEffect(() => {
    if (!scoutingSide || scoutingSide === 'observe') return;
    if (editingId) return; // perspective locked during active edit
    const homeSide = match?.currentHomeSide || 'left';
    if (lastSyncedHomeSideRef.current === homeSide) return; // already applied, skip no-op re-fires
    const isInitialSync = lastSyncedHomeSideRef.current === null;
    lastSyncedHomeSideRef.current = homeSide;
    const mySide = scoutingSide === 'home' ? homeSide : (homeSide === 'left' ? 'right' : 'left');
    if (mySide === nextFieldSideRef.current) return; // local already matches (self-initiated swap)
    changeFieldSide(mySide);
    // Notify user when another coach flipped orientation while we weren't editing
    if (!isInitialSync) {
      setToast('⇄ Sides swapped — other coach flipped orientation');
      setTimeout(() => setToast(null), 2500);
    }
  }, [match?.currentHomeSide, scoutingSide, editingId]);

  // Auto-attach to open point in concurrent mode
  // When other coach creates a shell point, this coach auto-enters edit mode for it
  useEffect(() => {
    if (!scoutingSide || scoutingSide === 'observe') return;
    if (editingId) return; // already editing
    if (saving) return;
    // Don't auto-attach if user already has player data in drafts (protect work in progress)
    if (draftA.players.some(Boolean) || draftB.players.some(Boolean)) return;
    const mySide = scoutingSide === 'home' ? 'homeData' : 'awayData';
    const openPoint = points.find(p => {
      const myData = p[mySide];
      const hasMyPlayers = myData?.players?.some(Boolean);
      return (p.status === 'open' || p.status === 'partial') && !hasMyPlayers;
    });
    if (openPoint && viewMode !== 'heatmap') {
      // Auto-enter edit mode for the open point
      const tA = openPoint.homeData || openPoint.teamA || {};
      const tB = openPoint.awayData || openPoint.teamB || {};
      setDraftA({
        players: [...(tA.players || E5())], shots: ds.shotsFromFirestore(tA.shots).map(s => [...(s||[])]),
        quickShots: ds.quickShotsFromFirestore(tA.quickShots),
        obstacleShots: ds.quickShotsFromFirestore(tA.obstacleShots),
        assign: [...(tA.assignments || E5())], bumps: [...(tA.bumpStops || E5())],
        elim: [...(tA.eliminations || E5B())], elimPos: [...(tA.eliminationPositions || E5())],
        runners: [...(tA.runners || E5B())],
        penalty: tA.penalty || '',
      });
      setDraftB({
        players: [...(tB.players || E5())], shots: ds.shotsFromFirestore(tB.shots).map(s => [...(s||[])]),
        quickShots: ds.quickShotsFromFirestore(tB.quickShots),
        obstacleShots: ds.quickShotsFromFirestore(tB.obstacleShots),
        assign: [...(tB.assignments || E5())], bumps: [...(tB.bumpStops || E5())],
        elim: [...(tB.eliminations || E5B())], elimPos: [...(tB.eliminationPositions || E5())],
        runners: [...(tB.runners || E5B())],
        penalty: tB.penalty || '',
      });
      setEditingId(openPoint.id);
      // Load outcome/comment if other coach already set them
      if (openPoint.outcome && openPoint.outcome !== 'pending') setOutcome(openPoint.outcome);
      if (openPoint.comment) setDraftComment(openPoint.comment);
      if (openPoint.isOT) setIsOT(openPoint.isOT);
      setViewMode('editor');
      setToast('New point started — scout your team');
      setTimeout(() => setToast(null), 2500);
    }
  }, [points, scoutingSide, editingId, saving, viewMode]);

  // Claim hooks — MUST be before early returns (React hooks ordering rule)
  const scoutingSideRef = useRef(scoutingSide);
  scoutingSideRef.current = scoutingSide;

  const releaseClaim = () => {
    if (isTraining) return;
    const side = scoutingSideRef.current;
    if (side === 'home' || side === 'away') {
      const claimField = side === 'home' ? 'homeClaimedBy' : 'awayClaimedBy';
      const claimTimeField = side === 'home' ? 'homeClaimedAt' : 'awayClaimedAt';
      ds.updateMatch(tournamentId, matchId, { [claimField]: null, [claimTimeField]: null }).catch(() => {});
    }
  };

  // Release on unmount
  useEffect(() => { return releaseClaim; }, [tournamentId, matchId]);

  // Release on tab close / navigate away (more reliable than unmount)
  useEffect(() => {
    const onBeforeUnload = () => releaseClaim();
    const onVisChange = () => { if (document.visibilityState === 'hidden') releaseClaim(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [tournamentId, matchId]);

  // Heartbeat — refresh claim timestamp every 5 min so stale detection works on crash
  useEffect(() => {
    if (isTraining) return;
    if (scoutingSide !== 'home' && scoutingSide !== 'away') return;
    const interval = setInterval(() => {
      const claimTimeField = scoutingSide === 'home' ? 'homeClaimedAt' : 'awayClaimedAt';
      ds.updateMatch(tournamentId, matchId, { [claimTimeField]: Date.now() }).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [scoutingSide, tournamentId, matchId, isTraining]);

  // Auto-clear stale/own claims when entering side picker
  const claimCleanedRef = useRef(false);
  useEffect(() => {
    if (isTraining) return;
    if (scoutingSide) { claimCleanedRef.current = false; return; }
    if (claimCleanedRef.current) return;
    if (!match) return;
    claimCleanedRef.current = true;
    const uid = auth.currentUser?.uid || null;
    const clearFields = {};
    if (match?.homeClaimedBy && (match?.homeClaimedAt && Date.now() - match.homeClaimedAt > 10 * 60 * 1000 || match?.homeClaimedBy === uid)) {
      clearFields.homeClaimedBy = null; clearFields.homeClaimedAt = null;
    }
    if (match?.awayClaimedBy && (match?.awayClaimedAt && Date.now() - match.awayClaimedAt > 10 * 60 * 1000 || match?.awayClaimedBy === uid)) {
      clearFields.awayClaimedBy = null; clearFields.awayClaimedAt = null;
    }
    if (Object.keys(clearFields).length > 0) {
      ds.updateMatch(tournamentId, matchId, clearFields).catch(() => {});
    }
  }, [scoutingSide, match?.homeClaimedBy, match?.awayClaimedBy]);

  if (!tournament || !match) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EmptyState icon="⏳" text="Loading..." />
    </div>
  );

  // Side claim handler — writes to Firestore so other coach sees it
  const CLAIM_TTL_MS = 10 * 60 * 1000; // 10 min stale threshold
  const claimSide = async (side) => {
    // Release previous claim if switching sides (tournament mode only — training is solo).
    if (!isTraining && (scoutingSide === 'home' || scoutingSide === 'away')) {
      const prevField = scoutingSide === 'home' ? 'homeClaimedBy' : 'awayClaimedBy';
      const prevTimeField = scoutingSide === 'home' ? 'homeClaimedAt' : 'awayClaimedAt';
      await ds.updateMatch(tournamentId, matchId, { [prevField]: null, [prevTimeField]: null }).catch(() => {});
    }
    setScoutingSide(side);
    const homeSide = match?.currentHomeSide || 'left';
    if (side === 'home') { setActiveTeam('A'); changeFieldSide(homeSide); }
    else if (side === 'away') { setActiveTeam('B'); changeFieldSide(homeSide === 'left' ? 'right' : 'left'); }
    // Write claim to Firestore (home/away only, not observe, tournament only)
    if (!isTraining && (side === 'home' || side === 'away')) {
      const uid = auth.currentUser?.uid || null;
      const claimField = side === 'home' ? 'homeClaimedBy' : 'awayClaimedBy';
      const claimTimeField = side === 'home' ? 'homeClaimedAt' : 'awayClaimedAt';
      await ds.updateMatch(tournamentId, matchId, { [claimField]: uid, [claimTimeField]: Date.now() }).catch(() => {});
    }
  };

  // Check if a claim is stale (>30 min old)
  const isClaimStale = (claimedAt) => {
    if (!claimedAt) return false;
    return Date.now() - claimedAt > CLAIM_TTL_MS;
  };

  // Side picker removed — scoutingSide is derived from URL (?scout=) in effect above.
  // Briefly render a loading state before the URL effect resolves scoutingSide.
  if (!scoutingSide) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState icon="⏳" text="Loading..." />
      </div>
    );
  }

  const isConcurrent = !isTraining && (scoutingSide === 'home' || scoutingSide === 'away');
  const mySideKey = scoutingSide === 'home' ? 'homeData' : 'awayData';
  const myLegacyKey = scoutingSide === 'home' ? 'teamA' : 'teamB';

  const score = matchScore(points);
  const effectiveView = viewMode === 'auto'
    ? (isConcurrent
      ? 'editor'  // Concurrent: stay in editor, don't flip when other coach saves
      : (points.length > 0 && !editingId ? 'review' : 'editor'))
    : viewMode;
  // 'review' is the new no-scout-param view; 'heatmap' stays as a synonym for
  // closed-match observe flow. Both render the same block below.
  const isReviewView = effectiveView === 'review' || effectiveView === 'heatmap';

  // Helpers
  const sts = ds.shotsToFirestore;
  const sfs = ds.shotsFromFirestore;

  const resetDraft = () => {
    if (draftA.assign.some(Boolean)) lastAssignA.current = [...draftA.assign];
    if (draftB.assign.some(Boolean)) lastAssignB.current = [...draftB.assign];
    setDraftA(emptyTeam()); setDraftB(emptyTeam());
    setEditingId(null); setSelPlayer(null); setMode('place'); setActiveTeam(scoutingSide === 'away' ? 'B' : 'A');
    // fieldSide intentionally NOT reset — swap sides persists between points
    setOutcome(null); setShowOpponent(false);
    setDraftComment(''); setIsOT(false);
    setQuickShotPlayer(null);
  };

  const startNewPoint = async () => {
    resetDraft();
    setFieldSide(nextFieldSideRef.current);
    setDraftA(prev => ({ ...prev, assign: [...lastAssignA.current] }));
    setDraftB(prev => ({ ...prev, assign: [...lastAssignB.current] }));
    setViewMode('editor');
    setRosterGridVisible(true);
    setOnFieldRoster([]);

    if (isConcurrent) {
      // Check for existing point where my side is empty
      // Search newest first — the most recent point from the other coach
      const mySide = scoutingSide === 'home' ? 'homeData' : 'awayData';
      const otherSide = scoutingSide === 'home' ? 'awayData' : 'homeData';
      const joinable = [...points].reverse().find(p => {
        // Must not have my side's data yet
        if (p[mySide]?.players?.some(Boolean)) return false;
        // Must be open/partial OR the other side has data (their coach already saved)
        return p.status === 'open' || p.status === 'partial' || p[otherSide]?.players?.some(Boolean);
      });
      if (joinable) {
        // Load existing data from the other coach's side
        editPoint(joinable);
        setToast('Point already in progress — joining now');
        setTimeout(() => setToast(null), 2500);
        return;
      }
      // Create empty shell in Firestore — other coach sees it via real-time sync
      try {
        const ref = await addPointFn({
          outcome: 'pending',
          status: 'open',
          fieldSide: nextFieldSideRef.current,
          order: Date.now(),
          createdBy: auth.currentUser?.uid || null,
        });
        setEditingId(ref.id);
      } catch (e) {
        console.error('Failed to create point shell:', e);
      }
    }
  };

  // ─── SAVE POINT (concurrent-safe) ───

  const savePoint = async (shouldSwapSides = false) => {
    const myDraft = activeTeam === 'A' ? draftA : draftB;
    const anyData = draftA.players.some(Boolean) || draftB.players.some(Boolean);
    if (!outcome && !anyData) return;
    if (saving) return;
    setSaving(true);
    try {
      const makeTeamData = (d) => ({
        players: d.players, shots: sts(d.shots), assignments: d.assign,
        quickShots: ds.quickShotsToFirestore(d.quickShots || E5A()),
        obstacleShots: ds.quickShotsToFirestore(d.obstacleShots || E5A()),
        bumpStops: d.bumps, eliminations: d.elim, eliminationPositions: d.elimPos,
        runners: d.runners || E5B(),
        penalty: d.penalty || null,
      });
      const uid = auth.currentUser?.uid || null;

      await tracked(async () => {
        if (isConcurrent) {
          // ── CONCURRENT: always draftA→homeData, draftB→awayData ──
          const homeTeamData = makeTeamData(draftA);
          const awayTeamData = makeTeamData(draftB);
          const homeHasData = draftA.players.some(Boolean);
          const awayHasData = draftB.players.some(Boolean);

          const sideUpdate = {
            isOT: isOT || false,
            comment: draftComment || null,
          };

          const homeSideValue = scoutingSide === 'home' ? fieldSide : (fieldSide === 'left' ? 'right' : 'left');
          const awaySideValue = homeSideValue === 'left' ? 'right' : 'left';

          // Write home side if it has data
          if (homeHasData) {
            sideUpdate.homeData = { ...homeTeamData, scoutedBy: uid, fieldSide: homeSideValue };
            sideUpdate.teamA = homeTeamData;
          }
          // Write away side if it has data
          if (awayHasData) {
            sideUpdate.awayData = { ...awayTeamData, scoutedBy: uid, fieldSide: awaySideValue };
            sideUpdate.teamB = awayTeamData;
          }

          if (outcome) sideUpdate.outcome = outcome;

          if (editingId) {
            // Mark 'scouted' if both sides have player data
            const currentPoint = points.find(p => p.id === editingId);
            const remoteHomeHas = currentPoint?.homeData?.players?.some(Boolean);
            const remoteAwayHas = currentPoint?.awayData?.players?.some(Boolean);
            const bothSidesHave = (homeHasData || remoteHomeHas) && (awayHasData || remoteAwayHas);
            sideUpdate.status = bothSidesHave ? 'scouted' : 'partial';
            await updatePointFn(editingId, sideUpdate);
          } else {
            // Fallback: no shell exists — check for joinable point first (race condition protection)
            const mySide = scoutingSide === 'home' ? 'homeData' : 'awayData';
            const otherSide = scoutingSide === 'home' ? 'awayData' : 'homeData';
            const joinable = [...points].reverse().find(p => {
              if (p[mySide]?.players?.some(Boolean)) return false;
              return p.status === 'open' || p.status === 'partial' || p[otherSide]?.players?.some(Boolean);
            });
            if (joinable) {
              // Found existing point — update it instead of creating duplicate
              const currentPoint = joinable;
              const remoteHomeHas = currentPoint?.homeData?.players?.some(Boolean);
              const remoteAwayHas = currentPoint?.awayData?.players?.some(Boolean);
              const bothSidesHave = (homeHasData || remoteHomeHas) && (awayHasData || remoteAwayHas);
              sideUpdate.status = bothSidesHave ? 'scouted' : 'partial';
              await updatePointFn(joinable.id, sideUpdate);
              setEditingId(joinable.id);
            } else {
              sideUpdate.order = Date.now();
              if (!outcome) sideUpdate.outcome = 'pending';
              sideUpdate.fieldSide = fieldSide;
              sideUpdate.status = (homeHasData && awayHasData) ? 'scouted' : 'partial';
              await addPointFn(sideUpdate);
            }
          }
        } else {
          // ── SOLO: write both sides ──
          // fieldSide is from the active team's perspective.
          // When editing, preserve the stored fieldSide for the non-active team.
          let homeSide, awaySide;
          if (editingId) {
            const existing = points.find(p => p.id === editingId);
            if (activeTeam === 'A') {
              homeSide = fieldSide;
              awaySide = existing?.awayData?.fieldSide || (homeSide === 'left' ? 'right' : 'left');
            } else {
              awaySide = fieldSide;
              homeSide = existing?.homeData?.fieldSide || (awaySide === 'left' ? 'right' : 'left');
            }
          } else {
            // New point: active team's fieldSide, other is opposite
            homeSide = activeTeam === 'A' ? fieldSide : (fieldSide === 'left' ? 'right' : 'left');
            awaySide = homeSide === 'left' ? 'right' : 'left';
          }
          const data = {
            teamA: makeTeamData(draftA), teamB: makeTeamData(draftB),
            homeData: { ...makeTeamData(draftA), scoutedBy: uid, fieldSide: homeSide },
            awayData: { ...makeTeamData(draftB), scoutedBy: uid, fieldSide: awaySide },
            outcome: outcome || 'pending',
            status: 'scouted',
            comment: draftComment || null, isOT: isOT || false, fieldSide: homeSide,
          };
          if (editingId) await updatePointFn(editingId, data);
          else await addPointFn(data);
        }
      });

      // Update match score from all points (for tournament page display)
      const allPoints = editingId
        ? points.map(p => p.id === editingId ? { ...p, outcome: outcome || p.outcome } : p)
        : [...points, { outcome: outcome || 'pending' }];
      const scoreA = allPoints.filter(p => p.outcome === 'win_a').length;
      const scoreB = allPoints.filter(p => p.outcome === 'win_b').length;
      await updateMatchFn({ scoreA, scoreB }).catch(() => {});

      resetDraft();
      setViewMode('heatmap');
      setRosterGridVisible(true);
      setOnFieldRoster([]);
      // Clear ?scout param so "Scout ›" button works again from review
      navigate(reviewUrl, { replace: true });
    } catch (e) {
      console.error('Save failed:', e);
      alert('Save failed: ' + (e.message || 'Unknown error'));
    }
    setSaving(false);
    if (shouldSwapSides && isConcurrent) {
      // Sync swap to Firestore — other coach picks up via onSnapshot
      const newHomeSide = (match?.currentHomeSide || 'left') === 'left' ? 'right' : 'left';
      const myNewSide = scoutingSide === 'home' ? newHomeSide : (newHomeSide === 'left' ? 'right' : 'left');
      // BUG-1 fix: update local state + ref BEFORE async Firestore write so the
      // sync effect (which fires after resetDraft clears editingId) reads the
      // stale currentHomeSide but detects `lastSyncedHomeSideRef === homeSide`
      // and skips — preventing the swap from being silently reverted.
      changeFieldSide(myNewSide);
      lastSyncedHomeSideRef.current = newHomeSide;
      await ds.updateMatch(tournamentId, matchId, { currentHomeSide: newHomeSide }).catch(() => {});
    } else if (shouldSwapSides) {
      changeFieldSide(prev => prev === 'left' ? 'right' : 'left');
    }
  };

  const editPoint = (pt) => {
    // Prefer split format (homeData/awayData) over legacy (teamA/teamB)
    const tA = pt.homeData || pt.teamA || {};
    const tB = pt.awayData || pt.teamB || {};
    setDraftA({
      players: [...(tA.players || E5())], shots: sfs(tA.shots).map(s => [...(s||[])]),
      quickShots: ds.quickShotsFromFirestore(tA.quickShots),
      obstacleShots: ds.quickShotsFromFirestore(tA.obstacleShots),
      assign: [...(tA.assignments || E5())], bumps: [...(tA.bumpStops || E5())],
      elim: [...(tA.eliminations || E5B())], elimPos: [...(tA.eliminationPositions || E5())],
      runners: [...(tA.runners || E5B())],
      penalty: tA.penalty || '',
    });
    setDraftB({
      players: [...(tB.players || E5())], shots: sfs(tB.shots).map(s => [...(s||[])]),
      quickShots: ds.quickShotsFromFirestore(tB.quickShots),
      obstacleShots: ds.quickShotsFromFirestore(tB.obstacleShots),
      assign: [...(tB.assignments || E5())], bumps: [...(tB.bumpStops || E5())],
      elim: [...(tB.eliminations || E5B())], elimPos: [...(tB.eliminationPositions || E5())],
      runners: [...(tB.runners || E5B())],
      penalty: tB.penalty || '',
    });
    setOutcome(pt.outcome || null);
    setDraftComment(pt.comment || '');
    setIsOT(pt.isOT || false);
    setEditingId(pt.id); setSelPlayer(null); setMode('place'); setActiveTeam(scoutingSide === 'away' ? 'B' : 'A');
    // Load fieldSide: in concurrent mode, from my side's data; or opposite of other coach
    if (isConcurrent) {
      const myData = scoutingSide === 'home' ? tA : tB;
      const otherData = scoutingSide === 'home' ? tB : tA;
      if (myData.fieldSide) {
        changeFieldSide(myData.fieldSide);
      } else if (otherData.fieldSide) {
        // Other coach already saved — I scout from the opposite side
        changeFieldSide(otherData.fieldSide === 'left' ? 'right' : 'left');
      }
      // else: neither side saved yet — keep current fieldSide
    } else {
      // Solo: pt.fieldSide is home team's side. If editing away, use opposite.
      const storedSide = pt.fieldSide || 'left';
      const editingSide = scoutingSide === 'away' ? (storedSide === 'left' ? 'right' : 'left') : storedSide;
      changeFieldSide(editingSide);
    }
    if ((tB.players || E5()).some(Boolean)) setShowOpponent(true);
    setViewMode('editor');
  };

  const handleDeletePoint = async (pid) => {
    await deletePointFn(pid);
    // Recalculate score after deletion
    const remaining = points.filter(p => p.id !== pid);
    const scoreA = remaining.filter(p => p.outcome === 'win_a').length;
    const scoreB = remaining.filter(p => p.outcome === 'win_b').length;
    await updateMatchFn({ scoreA, scoreB });
    if (editingId === pid) resetDraft();
  };

  // Undo: snapshot before each mutation
  const pushUndo = () => undoStack.push({ draftA: JSON.parse(JSON.stringify(draftA)), draftB: JSON.parse(JSON.stringify(draftB)), selPlayer, outcome });
  const handleUndo = () => {
    const prev = undoStack.undo();
    if (!prev) return;
    setDraftA(prev.draftA); setDraftB(prev.draftB);
    setSelPlayer(prev.selPlayer); setOutcome(prev.outcome);
  };

  // Canvas handlers
  const toggleRosterPlayer = (playerId) => {
    setOnFieldRoster(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= 5) return prev;
      return [...prev, playerId];
    });
  };

  const handleToolbarAction = (action, idx) => {
    if (action === 'close') { setToolbarPlayer(null); return; }
    if (action === 'hit') { pushUndo(); toggleElim(idx); setToolbarPlayer(null); }
    if (action === 'runner') {
      pushUndo();
      setDraft(prev => {
        const runners = [...(prev.runners || E5B())];
        runners[idx] = !runners[idx];
        return { ...prev, runners };
      });
      setToolbarPlayer(null);
    }
    if (action === 'late') {
      // Bump flow: save current position as bump stop, clear player, re-enter place mode
      pushUndo();
      const currentPos = draft.players[idx];
      if (currentPos) {
        setDraft(prev => {
          const n = { ...prev, players: [...prev.players], bumps: [...prev.bumps] };
          n.bumps[idx] = { x: currentPos.x, y: currentPos.y };
          n.players[idx] = null; // clear so next tap re-places at new position
          return n;
        });
        setMode('place');
      }
      setToolbarPlayer(null);
      setQuickShotPlayer(null);
    }
    if (action === 'shoot') { setQuickShotPlayer(idx); setSelPlayer(idx); setToolbarPlayer(null); }
    if (action === 'remove') {
      setToolbarPlayer(null);
      playerDeleteConfirm.ask(idx);
    }
    if (action === 'assign') { setAssignTarget(idx); setToolbarPlayer(null); }
  };

  // QuickShotPanel handlers — toggle a zone for the selected player, or drill
  // down into the precise ShotDrawer. § 29: `phase` routes the write to
  // quickShots (break) or obstacleShots (at obstacle).
  const handleToggleQuickZone = (zone, phase = 'break') => {
    if (quickShotPlayer == null) return;
    const field = phase === 'obstacle' ? 'obstacleShots' : 'quickShots';
    pushUndo();
    setDraft(prev => {
      const base = (prev[field] || E5A()).map(a => [...(a || [])]);
      const cur = base[quickShotPlayer] || [];
      base[quickShotPlayer] = cur.includes(zone) ? cur.filter(z => z !== zone) : [...cur, zone];
      return { ...prev, [field]: base };
    });
  };
  const handleQuickShotPrecise = () => {
    const idx = quickShotPlayer;
    setQuickShotPlayer(null);
    if (idx != null) setShotMode(idx);
  };

  const handleSelectPlayer = (idx) => {
    // Tapping another player closes the QuickShotPanel
    if (quickShotPlayer != null && idx !== quickShotPlayer) setQuickShotPlayer(null);
    setToolbarPlayer(toolbarPlayer === idx ? null : idx);
  };

  const handlePlacePlayer = (pos) => {
    pushUndo();
    setDraft(prev => {
      const n = { ...prev, players: [...prev.players], bumps: [...prev.bumps], assign: [...prev.assign] };
      const idx = n.players.findIndex(p => p === null);
      if (idx >= 0) {
        n.players[idx] = pos;
        const lastRef = activeTeam === 'A' ? lastAssignA : lastAssignB;
        if (!n.assign[idx] && lastRef.current[idx]) n.assign[idx] = lastRef.current[idx];
        setSelPlayer(idx);
      }
      return n;
    });
  };
  // handleSelectPlayer defined above with toolbar integration
  const handleMovePlayer = (idx, pos) => { pushUndo(); setDraft(prev => { const n = { ...prev, players: [...prev.players] }; n.players[idx] = pos; return n; }); };
  const removePlayer = (idx) => { pushUndo();
    setDraft(prev => ({ ...prev, players: prev.players.map((p,i)=>i===idx?null:p), shots: prev.shots.map((s,i)=>i===idx?[]:[...s]), bumps: prev.bumps.map((b,i)=>i===idx?null:b), elim: prev.elim.map((e,i)=>i===idx?false:e), elimPos: prev.elimPos.map((e,i)=>i===idx?null:e), assign: prev.assign.map((a,i)=>i===idx?null:a) }));
    setSelPlayer(null);
  };
  const handlePlaceShot = (pi, pos) => { pushUndo(); setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].push(pos); return n; }); };
  const handleDeleteShot = (pi, si) => { pushUndo(); setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].splice(si,1); return n; }); };
  // Bump is now handled by drag on canvas (onBumpPlayer prop)
  const handleBumpStop = () => {}; // no-op — kept for FieldCanvas prop compatibility
  const toggleElim = (idx) => { pushUndo(); setDraft(prev => { const n = { ...prev, elim: [...prev.elim] }; n.elim[idx] = !n.elim[idx]; return n; }); };

  const getChipLabel = (idx) => {
    const ap = draft.assign[idx];
    const rp = ap ? roster.find(p => p.id === ap) : null;
    return rp ? `#${rp.number} ${rp.nickname || rp.name.split(' ').pop()}` : `P${idx+1}`;
  };

  const getHeatmapPoints = (side) => {
    if (side === 'all' || side === 'both') {
      return points.flatMap(pt => {
        const results = [];
        const dataA = pt.homeData || pt.teamA;
        const dataB = pt.awayData || pt.teamB;
        if (dataA) {
          const fs = dataA.fieldSide || pt.fieldSide || 'left';
          const mirrored = mirrorPointToLeft(dataA, fs);
          results.push({ ...mirrored, shots: mirrorShotsToRight(sfs(dataA.shots), fs), runners: dataA.runners || [], eliminations: dataA.eliminations || [], outcome: pt.outcome, side: 'A' });
        }
        if (dataB) {
          const fs = dataB.fieldSide || pt.fieldSide || 'left';
          // Team B: mirror to RIGHT (opposite of Team A) so they don't overlap
          const mirroredToLeft = mirrorPointToLeft(dataB, fs);
          const mirroredToRight = {
            ...mirroredToLeft,
            players: (mirroredToLeft.players || []).map(p => p ? { ...p, x: 1 - p.x } : null),
            bumpStops: (mirroredToLeft.bumpStops || []).map(b => b ? { ...b, x: 1 - b.x } : null),
          };
          const shotsRight = mirrorShotsToRight(sfs(dataB.shots), fs);
          // Mirror shots to LEFT for team B (opposite)
          const shotsLeft = (shotsRight || []).map(arr => (arr || []).map(s => s ? { ...s, x: 1 - s.x } : null));
          results.push({ ...mirroredToRight, shots: shotsLeft, runners: dataB.runners || [], eliminations: dataB.eliminations || [], outcome: pt.outcome, side: 'B' });
        }
        return results;
      });
    }
    return points.map(pt => {
      const d = side === 'A' ? (pt.homeData || pt.teamA) : (pt.awayData || pt.teamB);
      if (!d) return null;
      const sideFieldSide = d.fieldSide || pt.fieldSide || 'left';
      const mirrored = mirrorPointToLeft(d, sideFieldSide);
      return { ...mirrored, shots: mirrorShotsToRight(sfs(d.shots), sideFieldSide), runners: d.runners || [], eliminations: d.eliminations || [], outcome: pt.outcome };
    }).filter(Boolean);
  };

  // ═══ MATCH REVIEW VIEW (was: heatmap) ═══
  if (isReviewView) {
    const isClosed = match?.status === 'closed';
    const sA = score?.a || 0;
    const sB = score?.b || 0;
    const goScout = (scoutedTeamId) => {
      if (!scoutedTeamId) return;
      navigate(`${reviewUrl}?scout=${scoutedTeamId}`);
    };
    const goScoutPoint = (scoutedTeamId, pointId) => {
      if (!scoutedTeamId) return;
      navigate(`${reviewUrl}?scout=${scoutedTeamId}&point=${pointId}`);
    };
    return (
      <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        {/* Match header — centered muted title per design spec §21 */}
        <PageHeader
          back={{ to: () => navigate(backToParent) }}
          title={`${teamA?.name || '?'} vs ${teamB?.name || '?'}`}
          subtitle={tournament?.name || ''}
          badges={
            <span style={{
              fontFamily: FONT, fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: RADIUS.xs,
              background: isClosed ? '#64748b18' : '#f59e0b18',
              color: isClosed ? '#64748b' : '#f59e0b',
              border: `1px solid ${isClosed ? '#64748b30' : '#f59e0b30'}`,
              letterSpacing: '.5px',
            }}>{isClosed ? 'FINAL' : 'LIVE'}</span>
          }
          action={!isClosed && <MoreBtn onClick={() => setMatchMenuOpen(true)} />}
        />
        {/* Scoreboard card — elevated surface with split-tap zones */}
        <div style={{ padding: `${SPACE.md}px ${R.layout.padding}px 0` }}>
          <div style={{
            display: 'flex',
            background: '#111827',
            border: '1px solid #1a2234',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            {/* Left team zone */}
            <div onClick={() => goScout(match?.teamA)}
              style={{
                flex: 1, minWidth: 0,
                padding: '16px 14px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
              <div style={{
                fontFamily: FONT, fontSize: 18, fontWeight: 700, color: '#e2e8f0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{teamA?.name || 'Home'}</div>
              {!isClosed && (
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#f59e0b', marginTop: 3 }}>
                  Scout ›
                </div>
              )}
            </div>
            {/* Divider */}
            <div style={{ width: 1, background: '#1e293b' }} />
            {/* Score center — recessed */}
            <div style={{
              flex: '0 0 auto', minWidth: 110,
              padding: '14px 12px',
              background: '#0d1117',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 900, color: '#e2e8f0', lineHeight: 1 }}>
                {sA}<span style={{ color: '#2a3548' }}>:</span>{sB}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 8, fontWeight: 600, color: '#475569', marginTop: 4, letterSpacing: '.4px' }}>
                {points.length} POINT{points.length === 1 ? '' : 'S'}
              </div>
            </div>
            <div style={{ width: 1, background: '#1e293b' }} />
            {/* Right team zone */}
            <div onClick={() => goScout(match?.teamB)}
              style={{
                flex: 1, minWidth: 0,
                padding: '16px 14px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                textAlign: 'right',
              }}>
              <div style={{
                fontFamily: FONT, fontSize: 18, fontWeight: 700, color: '#e2e8f0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{teamB?.name || 'Away'}</div>
              {!isClosed && (
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#f59e0b', marginTop: 3 }}>
                  ‹ Scout
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Heatmap — BOTH teams in review mode (observe); scout's team otherwise */}
          <div>
              <HeatmapCanvas fieldImage={field.fieldImage} points={(() => {
                const mySideKey = scoutingSide === 'away' ? 'B' : 'A';
                const showAll = scoutingSide === 'observe' || heatmapSide === 'all';
                const allPts = getHeatmapPoints(showAll ? 'all' : mySideKey);
                if (previewPointId) {
                  // Show only the previewed point
                  const previewPt = points.find(p => p.id === previewPointId);
                  if (previewPt) {
                    const results = [];
                    const dataA = previewPt.homeData || previewPt.teamA;
                    const dataB = previewPt.awayData || previewPt.teamB;
                    if (dataA) {
                      const fs = dataA.fieldSide || previewPt.fieldSide || 'left';
                      const mirrored = mirrorPointToLeft(dataA, fs);
                      results.push({ ...mirrored, shots: mirrorShotsToRight(sfs(dataA.shots), fs), runners: dataA.runners || [], eliminations: dataA.eliminations || [], outcome: previewPt.outcome, side: 'A' });
                    }
                    if (dataB) {
                      const fs = dataB.fieldSide || previewPt.fieldSide || 'left';
                      const mirroredToLeft = mirrorPointToLeft(dataB, fs);
                      const mirroredToRight = {
                        ...mirroredToLeft,
                        players: (mirroredToLeft.players || []).map(p => p ? { ...p, x: 1 - p.x } : null),
                        bumpStops: (mirroredToLeft.bumpStops || []).map(b => b ? { ...b, x: 1 - b.x } : null),
                      };
                      const shotsRight = mirrorShotsToRight(sfs(dataB.shots), fs);
                      const shotsLeft = (shotsRight || []).map(arr => (arr || []).map(s => s ? { ...s, x: 1 - s.x } : null));
                      results.push({ ...mirroredToRight, shots: shotsLeft, runners: dataB.runners || [], eliminations: dataB.eliminations || [], outcome: previewPt.outcome, side: 'B' });
                    }
                    return results;
                  }
                }
                return allPts;
              })()}
                rosterPlayers={[...rosterA, ...rosterB]}
                bunkers={[]} showBunkers={false}
                showZones={false}
                showPositions={hmShowPositions} showShots={hmShowShots}
                discoLine={0} zeekerLine={0} />
          </div>
          {/* Layer toggles */}
          <div style={{ display: 'flex', gap: 6, padding: `6px ${R.layout.padding}px`, justifyContent: 'center' }}>
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
          </div>
          {/* Coaching stats */}
          {points.length > 0 && (() => {
            const mySide = scoutingSide === 'away' ? 'B' : 'A';
            const showSide = isConcurrent && heatmapSide === 'all' ? 'all' : mySide;
            const myPts = getHeatmapPoints(showSide);
            if (!myPts.length) return null;
            const stats = computeCoachingStats(myPts, field);
            return <CoachingStats stats={stats} />;
          })()}
          {/* Points list */}
          <div style={{ padding: `8px ${R.layout.padding}px`, borderTop: `1px solid ${COLORS.border}` }}>
            <SectionLabel>Points ({points.length})</SectionLabel>
            {(() => {
              // Compute cumulative score progression per point (chronological).
              let runA = 0, runB = 0;
              const progression = points.map(p => {
                if (p.outcome === 'win_a') runA++;
                else if (p.outcome === 'win_b') runB++;
                return { a: runA, b: runB };
              });
              return [...points].reverse().map((pt) => {
                const idx = points.indexOf(pt);
                const isOpen = (pt.status === 'open' || pt.status === 'partial') && (!pt.outcome || pt.outcome === 'pending');
                const oc = pt.outcome;
                const aWon = oc === 'win_a';
                const bWon = oc === 'win_b';
                const aBar = aWon ? '#22c55e' : bWon ? '#ef4444' : '#334155';
                const bBar = bWon ? '#22c55e' : aWon ? '#ef4444' : '#334155';
                const ptDataA = pt.homeData || pt.teamA || {};
                const ptDataB = pt.awayData || pt.teamB || {};
                const elimA = (ptDataA.eliminations || []).filter(Boolean).length;
                const elimB = (ptDataB.eliminations || []).filter(Boolean).length;
                const totalElim = elimA + elimB;
                const prog = progression[idx] || { a: 0, b: 0 };
                const isPreviewing = previewPointId === pt.id;
                return (
                  <div key={pt.id} className="fade-in" style={{
                    display: 'flex', alignItems: 'stretch',
                    background: isPreviewing ? '#f59e0b08' : '#0f172a',
                    border: `1px solid ${isPreviewing ? '#f59e0b40' : isOpen ? COLORS.accent + '60' : '#1a2234'}`,
                    borderRadius: 12,
                    marginBottom: 6,
                    overflow: 'hidden',
                    minHeight: 58,
                    transition: 'border-color 0.15s, background 0.15s',
                  }}>
                    {/* Team A zone */}
                    <div
                      onClick={(e) => { e.stopPropagation(); if (!isClosed) goScoutPoint(match?.teamA, pt.id); }}
                      style={{
                        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px',
                        cursor: isClosed ? 'default' : 'pointer',
                      }}
                    >
                      <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: aBar, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#475569' }}>#{idx+1}</span>
                          {pt.isOT && <span style={{ fontFamily: FONT, fontSize: 7, fontWeight: 700, color: '#f59e0b', letterSpacing: '.3px' }}>OT</span>}
                          {isOpen && <span style={{ fontFamily: FONT, fontSize: 7, fontWeight: 700, color: '#f59e0b', letterSpacing: '.3px' }}>OPEN</span>}
                        </div>
                        <div style={{
                          fontFamily: FONT, fontSize: 14,
                          fontWeight: aWon ? 600 : 500,
                          color: aWon ? '#e2e8f0' : '#64748b',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginTop: 1,
                        }}>{teamA?.name || 'Home'}</div>
                      </div>
                    </div>
                    {/* Score center — tap to toggle preview */}
                    <div
                      onClick={(e) => { e.stopPropagation(); setPreviewPointId(isPreviewing ? null : pt.id); }}
                      style={{
                        flex: '0 0 auto', minWidth: 68,
                        padding: '8px 10px',
                        background: '#0d1117',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        borderLeft: '1px solid #1a2234',
                        borderRight: '1px solid #1a2234',
                      }}
                    >
                      <div style={{
                        fontFamily: FONT, fontSize: 15, fontWeight: 700,
                        color: isPreviewing ? '#f59e0b' : '#8b95a5',
                        lineHeight: 1,
                      }}>
                        {prog.a}<span style={{ color: '#2a3548' }}>:</span>{prog.b}
                      </div>
                      {totalElim > 0 && (
                        <div style={{ fontFamily: FONT, fontSize: 8, fontWeight: 600, color: '#475569', marginTop: 3 }}>
                          {totalElim} elim
                        </div>
                      )}
                    </div>
                    {/* Team B zone */}
                    <div
                      onClick={(e) => { e.stopPropagation(); if (!isClosed) goScoutPoint(match?.teamB, pt.id); }}
                      style={{
                        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end',
                        padding: '8px 12px',
                        cursor: isClosed ? 'default' : 'pointer',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                        <div style={{
                          fontFamily: FONT, fontSize: 14,
                          fontWeight: bWon ? 600 : 500,
                          color: bWon ? '#e2e8f0' : '#64748b',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{teamB?.name || 'Away'}</div>
                        {(ptDataA.penalty || ptDataB.penalty || pt.comment) && (
                          <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500, color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ptDataA.penalty && <span style={{ color: '#ef4444' }}>{ptDataA.penalty} </span>}
                            {ptDataB.penalty && <span style={{ color: '#ef4444' }}>{ptDataB.penalty} </span>}
                            {pt.comment && <span style={{ fontStyle: 'italic' }}>💬 {pt.comment}</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: bBar, flexShrink: 0 }} />
                    </div>
                    {/* ⋮ menu */}
                    <div onClick={(e) => { e.stopPropagation(); setPointMenu({ id: pt.id, idx: idx + 1 }); }}
                      style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', color: '#64748b', fontSize: 18 }}>
                      ⋮
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
        {!isClosed && !isViewer && (
          <div style={{
            position: 'sticky', bottom: 0, zIndex: 20,
            padding: `${SPACE.md}px ${R.layout.padding}px calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
            background: 'linear-gradient(to bottom, transparent, #080c14 30%)',
          }}>
            <div
              onClick={() => closeMatchConfirm.ask(true)}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ef444418'; e.currentTarget.style.borderColor = '#ef444450'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ef444408'; e.currentTarget.style.borderColor = '#ef444425'; }}
              style={{
                width: '100%', height: 52,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 12,
                border: '1.5px solid #ef444425',
                background: '#ef444408',
                color: '#ef4444',
                fontFamily: FONT, fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}>
              End match
            </div>
          </div>
        )}

      <ConfirmModal {...deleteConfirm.modalProps(
        (id) => handleDeletePoint(id),
        { title: 'Delete point?', message: 'Match score will be recalculated. This cannot be undone.', confirmLabel: 'Delete' }
      )} />
      <ConfirmModal {...closeMatchConfirm.modalProps(
        async () => { await updateMatchFn({ status: 'closed' }); },
        { title: 'End match', message: 'Mark this match as FINAL? No more points can be added.', confirmLabel: 'End match' }
      )} />
      <ConfirmModal {...clearAllConfirm.modalProps(
        async () => {
          for (const pt of points) await deletePointFn(pt.id);
          await updateMatchFn({ scoreA: 0, scoreB: 0 });
          resetDraft();
        },
        { title: 'Clear all points?', message: `Delete all ${points.length} points from this match? This cannot be undone.`, confirmLabel: 'Clear all' }
      )} />
      <ConfirmModal {...deleteMatchConfirm.modalProps(
        async () => {
          await deleteMatchFn();
          navigate(backToParent);
        },
        { title: 'Delete match?', message: 'All scouted points and data for this match will be permanently lost.', confirmLabel: 'Delete match', danger: true }
      )} />
      <ActionSheet open={!!pointMenu} onClose={() => setPointMenu(null)} actions={[
        { label: 'Edit point', onPress: () => { const pt = points.find(p => p.id === pointMenu?.id); if (pt) editPoint(pt); } },
        { separator: true },
        { label: `Delete Point #${pointMenu?.idx}`, danger: true, onPress: () => deleteConfirm.ask(pointMenu?.id) },
      ]} />
      <ActionSheet open={matchMenuOpen} onClose={() => setMatchMenuOpen(false)} actions={[
        { label: 'End match (mark as FINAL)', onPress: () => closeMatchConfirm.ask(true) },
        ...(points.length > 0 ? [{ separator: true }, { label: 'Clear all points', danger: true, onPress: () => clearAllConfirm.ask(true) }] : []),
        { separator: true },
        { label: 'Delete match', danger: true, onPress: () => deleteMatchConfirm.ask(true) },
      ]} />
      </div>
    );
  }

  // ═══ EDITOR VIEW ═══
  return (
    <div style={{ height: '100dvh', maxWidth: isLandscape ? '100%' : (R.layout.maxWidth || 640), margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ═══ COMPACT HEADER ═══ */}
      {!isLandscape && (() => {
        const scoutedTeam = scoutingSide === 'away' ? teamB : teamA;
        const opponentTeam = scoutingSide === 'away' ? teamA : teamB;
        const scoutedName = scoutedTeam?.name || '?';
        const opponentName = opponentTeam?.name || '?';
        const scoreStr = score ? `${score.a}:${score.b}` : '0:0';
        const ptLabel = editingId ? ` · Pt ${points.findIndex(p => p.id === editingId) + 1}` : '';
        return (
      <PageHeader
        back={{ to: () => {
          // Back from scouting always returns to Match Review (no ?scout param).
          setEditingId(null);
          setToolbarPlayer(null); setShotMode(null); setQuickShotPlayer(null);
          releaseClaim();
          navigate(reviewUrl, { replace: true });
        }}}
        title={`Scouting ${scoutedName}`}
        subtitle={`vs ${opponentName} · ${scoreStr}${ptLabel}`}
        badges={
          <span style={{
            fontFamily: FONT, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: RADIUS.xs,
            background: match?.status === 'closed' ? COLORS.success + '18' : COLORS.accent,
            color: match?.status === 'closed' ? COLORS.success : '#000',
            boxShadow: match?.status === 'closed' ? 'none' : COLORS.accentGlow,
            letterSpacing: '.5px',
          }}>{match?.status === 'closed' ? 'FINAL' : 'LIVE'}</span>
        }
      >
        {/* Side pill — second row */}
        <div style={{ width: '100%', marginTop: 4, paddingLeft: 32, paddingBottom: 8 }}>
          <span onClick={async () => {
              if (isConcurrent) {
                // Sync side swap to Firestore — both coaches auto-adjust
                const newHomeSide = (match?.currentHomeSide || 'left') === 'left' ? 'right' : 'left';
                const myNewSide = scoutingSide === 'home' ? newHomeSide : (newHomeSide === 'left' ? 'right' : 'left');
                // BUG-1 fix: update local state AND ref BEFORE Firestore write so
                // the sync effect's onSnapshot re-fire sees a no-op (ref === homeSide).
                changeFieldSide(myNewSide);
                lastSyncedHomeSideRef.current = newHomeSide;
                await ds.updateMatch(tournamentId, matchId, { currentHomeSide: newHomeSide }).catch(() => {});
              } else {
                changeFieldSide(s => s === 'left' ? 'right' : 'left');
              }
              setDraft(prev => ({
                ...prev,
                players: prev.players.map(p => p ? { ...p, x: 1 - p.x } : null),
                bumps: prev.bumps.map(b => b ? { ...b, x: 1 - b.x } : null),
                shots: prev.shots.map(arr => (arr || []).map(s => s ? { ...s, x: 1 - s.x } : null)),
              }));
            }}
            style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 6,
              background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
              fontFamily: FONT,
            }}>
            <span style={{ color: COLORS.textDim }}>from</span>
            <span style={{ fontWeight: 700, color: TEAM_COLORS[activeTeam] }}>{fieldSide === 'left' ? 'LEFT' : 'RIGHT'}</span>
            <span style={{ color: COLORS.textMuted }}>⇄</span>
          </span>
        </div>
      </PageHeader>
        );
      })()}
      {/* Landscape floating controls */}
      {isLandscape && (
        <div style={{ position: 'fixed', top: 12, left: 12, display: 'flex', gap: 8, zIndex: 50 }}>
          <Btn variant="default" size="sm" onClick={() => {
            setEditingId(null); setToolbarPlayer(null); setShotMode(null); setQuickShotPlayer(null);
            releaseClaim();
            navigate(reviewUrl);
          }} style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '8px 12px' }}>‹ Back</Btn>
        </div>
      )}
      {isLandscape && (
        <div style={{ position: 'fixed', bottom: 12, right: 12, display: 'flex', gap: 8, zIndex: 50 }}>
          <Btn variant="accent" size="sm" onClick={() => setSaveSheetOpen(true)}
            style={{ padding: '10px 20px', fontSize: FONT_SIZE.sm, fontWeight: 700, backdropFilter: 'blur(8px)' }}>
            ✓ Save
          </Btn>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Canvas + base indicators (BUG-1 fix: visual orientation cue) */}
        <div style={{ position: 'relative' }}>
          <FieldCanvas fieldImage={field.fieldImage} viewportSide={fieldSide}
            maxCanvasHeight={typeof window !== 'undefined'
              ? (isLandscape ? window.innerHeight : window.innerHeight - 180)
              : null}
            players={draft.players} shots={draft.shots} bumpStops={draft.bumps}
            eliminations={draft.elim} eliminationPositions={draft.elimPos}
            runners={draft.runners || []}
            quickShots={draft.quickShots || []}
            obstacleShots={draft.obstacleShots || []}
            doritoSide={field.layout?.doritoSide || 'top'}
            onPlacePlayer={handlePlacePlayer} onMovePlayer={handleMovePlayer}
            onPlaceShot={handlePlaceShot} onDeleteShot={handleDeleteShot}
            onBumpStop={handleBumpStop} onSelectPlayer={handleSelectPlayer}
            onEmptyTap={() => { if (quickShotPlayer != null) setQuickShotPlayer(null); }}
            onBumpPlayer={(idx, fromPos) => { pushUndo(); setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; n.bumps[idx] = { x: fromPos.x, y: fromPos.y }; return n; }); }}
            editable selectedPlayer={selPlayer} mode={shotMode !== null ? 'shoot' : mode}
            toolbarPlayer={toolbarPlayer} toolbarItems={toolbarItems} onToolbarAction={handleToolbarAction}
            playerAssignments={draft.assign} rosterPlayers={roster}
            opponentPlayers={showOpponent ? mirroredOpp : undefined}
            opponentEliminations={showOpponent ? mirroredOppElim : []}
            opponentAssignments={activeTeam==='A' ? draftB.assign : draftA.assign}
            opponentRosterPlayers={activeTeam==='A' ? rosterB : rosterA}
            showOpponentLayer={showOpponent}
            opponentColor={activeTeam==='A' ? TEAM_COLORS.B_light : TEAM_COLORS.A_light}
            discoLine={0}
            zeekerLine={0}
            bunkers={field.bunkers || []}
            showBunkers={false} showZones={false}
            heroPlayerIds={heroPlayerIds}
            fieldCalibration={field.fieldCalibration} />
          <QuickShotPanel
            visible={quickShotPlayer != null}
            playerIndex={quickShotPlayer}
            playerLabel={quickShotPlayer != null ? getChipLabel(quickShotPlayer) || `Player ${quickShotPlayer + 1}` : ''}
            breakZones={quickShotPlayer != null ? (draft.quickShots?.[quickShotPlayer] || []) : []}
            obstacleZones={quickShotPlayer != null ? (draft.obstacleShots?.[quickShotPlayer] || []) : []}
            onToggleZone={handleToggleQuickZone}
            onPrecise={handleQuickShotPrecise}
            onClose={() => setQuickShotPlayer(null)}
          />
          {(() => {
            // BUG-1 fix: base indicator overlays help scout orient when sides swap.
            // Resolves to whichever team's base is on left/right edges of the field.
            const mineKey = activeTeam;
            const oppKey = activeTeam === 'A' ? 'B' : 'A';
            const mineTeam = activeTeam === 'A' ? teamA : teamB;
            const oppTeam = activeTeam === 'A' ? teamB : teamA;
            const leftKey = fieldSide === 'left' ? mineKey : oppKey;
            const rightKey = fieldSide === 'left' ? oppKey : mineKey;
            const leftTeam = fieldSide === 'left' ? mineTeam : oppTeam;
            const rightTeam = fieldSide === 'left' ? oppTeam : mineTeam;
            const leftColor = TEAM_COLORS[leftKey];
            const rightColor = TEAM_COLORS[rightKey];
            const shortName = (t) => (t?.name || '').slice(0, 10).toUpperCase() || '—';
            return (
              <>
                <div style={{
                  position: 'absolute', top: 6, left: 10, zIndex: 15,
                  fontFamily: FONT, fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                  color: leftColor, opacity: 0.85, pointerEvents: 'none',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                }}>
                  {shortName(leftTeam)}
                </div>
                <div style={{
                  position: 'absolute', top: 6, right: 10, zIndex: 15,
                  fontFamily: FONT, fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
                  color: rightColor, opacity: 0.85, pointerEvents: 'none',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                }}>
                  {shortName(rightTeam)}
                </div>
              </>
            );
          })()}
        </div>

      </div>

      {/* ═══ ROSTER GRID ═══ */}
      {!isLandscape && rosterGridVisible && (
        <RosterGrid roster={roster} selected={onFieldRoster} onToggle={toggleRosterPlayer} heroPlayerIds={heroPlayerIds} />
      )}

      {/* ═══ BOTTOM BAR ═══ */}
      {!isLandscape && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px',
            background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          }}>
            <Btn variant="accent" style={{ width: '100%', padding: '14px 0', fontSize: FONT_SIZE.base, fontWeight: 700 }}
              onClick={quickShotPlayer != null ? () => setQuickShotPlayer(null) : () => setSaveSheetOpen(true)}>
              {quickShotPlayer != null ? '✓ Done' : '✓ Save point'}
            </Btn>
          </div>
      )}

      {/* ═══ SHOT DRAWER ═══ */}
      <ShotDrawer
        open={shotMode !== null}
        onClose={() => setShotMode(null)}
        playerIndex={shotMode}
        playerLabel={shotMode !== null ? getChipLabel(shotMode) || `P${shotMode + 1}` : ''}
        playerColor={shotMode !== null ? COLORS.playerColors[shotMode] : '#fff'}
        fieldSide={fieldSide}
        fieldImage={field.fieldImage}
        bunkers={field.bunkers || []}
        shots={shotMode !== null ? (draft.shots[shotMode] || []) : []}
        onAddShot={pos => { if (shotMode !== null) { pushUndo(); handlePlaceShot(shotMode, pos); } }}
        onUndoShot={() => { if (shotMode !== null && draft.shots[shotMode]?.length) { pushUndo(); handleDeleteShot(shotMode, draft.shots[shotMode].length - 1); } }}
      />

      {/* ═══ SAVE BOTTOM SHEET ═══ */}
      <BottomSheet open={saveSheetOpen} onClose={() => setSaveSheetOpen(false)} maxHeight="auto">
        {/* Question */}
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 500, color: COLORS.textDim, textAlign: 'center', marginBottom: SPACE.md }}>
          Who won this point?
        </div>

        {/* Outcome cards */}
        <div style={{ display: 'flex', gap: SPACE.sm, marginBottom: SPACE.xl }}>
          {[
            { val: 'win_a', label: teamA?.name?.slice(0, 10) || 'A' },
            { val: 'win_b', label: teamB?.name?.slice(0, 10) || 'B' },
          ].map(o => (
            <div key={o.val} onClick={() => setOutcome(outcome === o.val ? null : o.val)}
              style={{
                flex: 1, padding: '16px 8px 14px', borderRadius: RADIUS.xl, textAlign: 'center',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                border: `2px solid ${outcome === o.val ? COLORS.success + '50' : COLORS.border}`,
                background: outcome === o.val ? COLORS.success + '08' : COLORS.surfaceDark,
              }}>
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, letterSpacing: 1,
                color: outcome === o.val ? COLORS.success : 'transparent',
                marginBottom: SPACE.xs + 2, height: 14,
              }}>{outcome === o.val ? 'WINNER' : '\u00A0'}</div>
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 700,
                color: outcome === o.val ? COLORS.text : COLORS.textMuted,
                position: 'relative', zIndex: 1,
              }}>{o.label}</div>
              {outcome === o.val && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse at bottom center, rgba(34,197,94,0.12) 0%, transparent 70%)',
                }} />
              )}
            </div>
          ))}
          <div onClick={() => setOutcome(outcome === 'no_point' ? null : 'no_point')}
            style={{
              flex: '0 0 54px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 2,
              borderRadius: RADIUS.xl, cursor: 'pointer',
              border: `2px solid ${outcome === 'no_point' ? COLORS.textMuted + '50' : COLORS.border}`,
              background: outcome === 'no_point' ? COLORS.textMuted + '08' : COLORS.surfaceDark,
              fontSize: 18,
            }}>🚫<span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.textMuted }}>No pt</span></div>
          <div onClick={() => setOutcome(outcome === 'timeout' ? null : 'timeout')}
            style={{
              flex: '0 0 54px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: RADIUS.xl, cursor: 'pointer',
              border: `2px solid ${outcome === 'timeout' ? COLORS.accent + '50' : COLORS.border}`,
              background: outcome === 'timeout' ? COLORS.accent + '08' : COLORS.surfaceDark,
              fontSize: FONT_SIZE.xxl,
            }}>⏱</div>
        </div>

        {/* Side change — inline pill */}
        {!editingId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', marginBottom: SPACE.xl }}>
            <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, color: COLORS.textDim, fontWeight: 500 }}>Next point</span>
            <div style={{ display: 'flex', background: COLORS.surfaceDark, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, padding: 3 }}>
              <div onClick={() => setSideChange(false)} style={{
                padding: `${SPACE.sm}px ${SPACE.lg}px`, borderRadius: RADIUS.md, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                cursor: 'pointer', color: !sideChange ? COLORS.accent : COLORS.textMuted,
                background: !sideChange ? COLORS.border : 'transparent',
              }}>Same</div>
              <div onClick={() => setSideChange(true)} style={{
                padding: `${SPACE.sm}px ${SPACE.lg}px`, borderRadius: RADIUS.md, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                cursor: 'pointer', color: sideChange ? COLORS.accent : COLORS.textMuted,
                background: sideChange ? COLORS.border : 'transparent',
              }}>Swap sides</div>
            </div>
          </div>
        )}

        {/* Save button */}
        <Btn variant="accent" disabled={!outcome || saving}
          onClick={async () => {
            const doSwap = sideChange;
            setSideChange(false);
            setSaveSheetOpen(false);
            await savePoint(doSwap);
          }}
          style={{
            width: '100%', justifyContent: 'center', minHeight: 52, fontWeight: 700, fontSize: FONT_SIZE.lg,
            borderRadius: RADIUS.xl,
            background: outcome ? COLORS.accentGradient : '#1e293b',
            color: outcome ? '#000' : '#475569',
            boxShadow: outcome ? COLORS.accentGlow : 'none',
            border: 'none',
          }}>
          {saving ? 'Saving...' : outcome ? 'Save point' : 'Select winner to save'}
        </Btn>

        {/* More options — hidden by default */}
        <div onClick={() => setMoreInfoOpen(v => !v)}
          style={{ textAlign: 'center', padding: '14px 0 0', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, cursor: 'pointer' }}>
          {moreInfoOpen ? '− hide options' : '+ penalties · overtime · notes'}
        </div>

        {moreInfoOpen && (
          <div style={{ paddingTop: SPACE.md, marginTop: SPACE.md, borderTop: `1px solid ${COLORS.border}20`, display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, fontWeight: 500, minWidth: 65 }}>Penalties</span>
              <Select value={draftA.penalty} onChange={v => setDraftA(prev => ({ ...prev, penalty: v }))}
                style={{ flex: 1, background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding: '10px 12px', fontSize: FONT_SIZE.sm }}>
                <option value="">{teamA?.name?.slice(0,6)} — none</option>
                {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              <Select value={draftB.penalty} onChange={v => setDraftB(prev => ({ ...prev, penalty: v }))}
                style={{ flex: 1, background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding: '10px 12px', fontSize: FONT_SIZE.sm }}>
                <option value="">{teamB?.name?.slice(0,6)} — none</option>
                {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
            {/* OT toggle */}
            <div onClick={() => setIsOT(!isOT)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div style={{
                width: 44, height: 26, borderRadius: RADIUS.full, padding: 3,
                background: isOT ? COLORS.accent : COLORS.border, transition: 'background .2s',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: RADIUS.lg, background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'transform .2s',
                  transform: isOT ? 'translateX(18px)' : 'translateX(0)',
                }} />
              </div>
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, color: isOT ? COLORS.accent : COLORS.textMuted }}>Overtime</span>
            </div>
            <input value={draftComment} onChange={e => setDraftComment(e.target.value)}
              placeholder="Quick note (optional)"
              style={{
                fontFamily: FONT, fontSize: FONT_SIZE.sm, padding: '10px 14px', borderRadius: RADIUS.lg,
                background: COLORS.surfaceDark, color: COLORS.textMuted, border: `1px solid ${COLORS.border}`,
                width: '100%', outline: 'none', boxSizing: 'border-box',
              }} />
          </div>
        )}

        {/* Close match */}
        {!editingId && (
          <div onClick={() => { closeMatchConfirm.ask(true); setSaveSheetOpen(false); }}
            style={{ textAlign: 'center', padding: '10px 0 0', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.borderLight, cursor: 'pointer' }}>
            Close match (mark as final)
          </div>
        )}
      </BottomSheet>

      {/* ═══ ASSIGN BOTTOM SHEET ═══ */}
      <BottomSheet open={assignTarget !== null} onClose={() => setAssignTarget(null)}>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, textAlign: 'center', marginBottom: SPACE.md }}>
          Assign {assignTarget !== null ? getChipLabel(assignTarget) : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE.xs + 2 }}>
          {roster.map(r => {
            const taken = draft.assign.some((a, i) => a === r.id && i !== assignTarget);
            return (
              <div key={r.id} onClick={() => {
                if (taken) return;
                pushUndo();
                setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[assignTarget] = r.id; return n; });
                setAssignTarget(null);
              }}
                style={{
                  padding: `${SPACE.md}px ${SPACE.sm}px`, borderRadius: RADIUS.lg, textAlign: 'center',
                  cursor: taken ? 'default' : 'pointer', opacity: taken ? 0.25 : 1,
                  background: COLORS.surfaceDark, border: `1.5px solid ${COLORS.border}`,
                }}>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800, color: COLORS.accent }}>#{r.number}</div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 }}>
                  {(r.nickname || r.name || '').slice(0, 5)}
                </div>
              </div>
            );
          })}
        </div>
        {assignTarget !== null && draft.assign[assignTarget] && (
          <div onClick={() => {
            pushUndo();
            setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[assignTarget] = null; return n; });
            setAssignTarget(null);
          }}
            style={{ textAlign: 'center', padding: `${SPACE.md}px 0 0`, fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, cursor: 'pointer' }}>
            Unassign
          </div>
        )}
      </BottomSheet>

      {/* Delete point confirmation */}
      <ConfirmModal {...deleteConfirm.modalProps(
        (id) => handleDeletePoint(id),
        { title: 'Delete point?', message: 'Match score will be recalculated. This cannot be undone.', confirmLabel: 'Delete' }
      )} />

      {/* Concurrent scouting blocker */}
      {blockedTeam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
          <div style={{ background: COLORS.surface, borderRadius: RADIUS.xxl, padding: SPACE.xxl, textAlign: 'center', maxWidth: 280 }}>
            <div style={{ fontSize: FONT_SIZE.base, fontWeight: 600, fontFamily: FONT, color: COLORS.text, marginBottom: SPACE.sm }}>
              Another coach is scouting {(blockedTeam === 'A' ? teamA : teamB)?.name}
            </div>
            <div style={{ fontSize: FONT_SIZE.sm, fontFamily: FONT, color: COLORS.textDim, marginBottom: SPACE.lg }}>
              You can continue scouting your team.
            </div>
            <Btn variant="default" onClick={() => setBlockedTeam(null)}>
              Back to {(activeTeam === 'A' ? teamA : teamB)?.name}
            </Btn>
          </div>
        </div>
      )}

      {/* Close match confirmation */}
      <ConfirmModal {...closeMatchConfirm.modalProps(
        async () => { await updateMatchFn({ status: 'closed' }); },
        { title: 'Close match', message: 'Mark this match as FINAL? No more points can be added.', confirmLabel: 'Close match' }
      )} />

      {/* Remove player confirmation */}
      <ConfirmModal {...playerDeleteConfirm.modalProps(
        (idx) => { pushUndo(); removePlayer(idx); },
        { title: 'Remove player?', message: 'Remove this player from the field?', confirmLabel: 'Remove' }
      )} />

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: COLORS.accent, color: '#000', fontFamily: FONT, fontSize: FONT_SIZE.sm,
          fontWeight: 700, padding: '10px 20px', borderRadius: RADIUS.lg,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
