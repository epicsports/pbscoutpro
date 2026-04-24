import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { useDevice } from '../hooks/useDevice';
import { useWorkspace } from '../hooks/useWorkspace';
import { useViewAs } from '../hooks/useViewAs';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

import FieldCanvas from '../components/FieldCanvas';
import HeatmapCanvas from '../components/HeatmapCanvas';
import FieldEditor from '../components/FieldEditor'; // used only in heatmap view
import { Btn, SectionLabel, Select, EmptyState, ConfirmModal, ActionSheet, MoreBtn } from '../components/ui';
import CompletenessCard from '../components/scout/CompletenessCard';
import PerTeamHeatmapToggle from '../components/match/PerTeamHeatmapToggle';
import { hasAnyRole } from '../utils/roleUtils';
import { UnseenNotesModal, filterVisibleNotes } from '../components/CoachNotes';
import HotSheet from '../components/selflog/HotSheet';
import { MapPin } from 'lucide-react';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints, usePlayers, useLayouts, useTrainings, useMatchups, useTrainingPoints, useNotes } from '../hooks/useFirestore';
import { useCoachPointCounter } from '../hooks/useCoachPointCounter';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TEAM_COLORS, responsive } from '../utils/theme';
import { useTrackedSave } from '../hooks/useSaveStatus';
import { auth } from '../services/firebase';
import { mirrorPointToLeft, mirrorShotsToRight, matchScore } from '../utils/helpers';
import { useField } from '../hooks/useField';
import { useUndo } from '../hooks/useUndo';
import { useUserNames, fallbackScoutLabel } from '../hooks/useUserNames';
import BottomSheet from '../components/BottomSheet';
import PageHeader from '../components/PageHeader';
import RosterGrid from '../components/RosterGrid';
import ShotDrawer from '../components/ShotDrawer';
import QuickShotPanel from '../components/QuickShotPanel';
import QuickLogView from '../components/QuickLogView';
import PointSummary from '../components/PointSummary';

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];
const E5B = () => [false, false, false, false, false];
const PENALTIES = ['', '141', '241', '341'];

function emptyTeam() {
  return { players: E5(), shots: E5A(), quickShots: E5A(), obstacleShots: E5A(), assign: E5(), bumps: E5(), elim: E5B(), elimPos: E5(), runners: E5B(), penalty: '' };
}

function mirrorX(p) { return p ? { ...p, x: 1 - p.x } : null; }

export default function MatchPage() {
  const device = useDevice();
  const { user, workspace, roles, isAdmin, linkedPlayer } = useWorkspace();
  // UI gating uses effective roles so admin impersonating viewer/player sees
  // that role's CTAs (§ 38.5). Author identity (userRole for notes) stays on
  // REAL roles — notes attributed to the real author regardless of impersonation.
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const isViewer = !effectiveIsAdmin
    && effectiveRoles.length > 0
    && effectiveRoles.every(r => r === 'viewer');
  const userId = user?.uid || null;
  // Legacy single-role shim for CoachNotes (author role label). Multi-role
  // users get the highest-privilege tag first. REAL roles — note authorship
  // reflects the actual author, not an impersonated role.
  const userRole = isAdmin ? 'admin'
    : roles.includes('coach') ? 'coach'
    : roles.includes('scout') ? 'scout'
    : roles.includes('viewer') ? 'viewer'
    : roles.includes('player') ? 'player'
    : 'coach';
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
  // Brief 8 Problem B: per-coach stream filter + post-merge canonical filter.
  // matches[]/matchups[] are already available here — match.merged / matchup.merged
  // are computed inline so the filter responds to merge state without waiting on
  // later match/matchup derivation.
  const matchMergedFlag = matches.find(m => m.id === matchId)?.merged || false;
  const matchupMergedFlag = matchups.find(m => m.id === matchupId)?.merged || false;
  const { points: tournPoints, loading: tournLoading } = usePoints(tournamentId, matchId, { currentUid: userId, merged: matchMergedFlag });
  const { points: trainPoints, loading: trainLoading } = useTrainingPoints(trainingId, matchupId, { currentUid: userId, merged: matchupMergedFlag });
  // Per-coach point index for deterministic doc IDs ({matchKey}_{coachShortId}_{NNN}).
  // Keyed by (tournament matchId || training matchupId) + userId. Persists across
  // browser refresh via localStorage — zero Firestore round-trip on reserveNext.
  const { reserveNext: reserveNextPointIndex } = useCoachPointCounter(
    isTraining ? matchupId : matchId,
    userId,
  );
  const points = isTraining ? trainPoints : tournPoints;
  const loading = isTraining ? trainLoading : tournLoading;
  const { layouts } = useLayouts();

  // Collect unique scout UIDs from all points for display in review cards.
  const scoutUids = useMemo(() => {
    const set = new Set();
    (points || []).forEach(pt => {
      if (pt.homeData?.scoutedBy) set.add(pt.homeData.scoutedBy);
      if (pt.awayData?.scoutedBy) set.add(pt.awayData.scoutedBy);
    });
    return [...set];
  }, [points]);
  const scoutNamesMap = useUserNames(scoutUids);
  const scoutShortName = (uid) => {
    if (!uid) return null;
    const full = scoutNamesMap[uid] || fallbackScoutLabel(uid);
    const first = full.split(/[\s@]/)[0];
    return first.length > 12 ? first.slice(0, 12) : first;
  };

  // ── ds wrappers — switch between tournament & training paths ──
  const addPointFn = (data) => isTraining
    ? ds.addTrainingPoint(trainingId, matchupId, data)
    : ds.addPoint(tournamentId, matchId, data);
  // Brief 8 Problem B: create a new point in the per-coach stream with a
  // deterministic doc ID and the stream-identifying fields. Returns { id }
  // matching addPointFn's shape (docRef) so callers can branch on ref?.id.
  const savePointAsNewStream = async (data) => {
    const uid = auth.currentUser?.uid || 'unknown';
    const coachShortId = uid.slice(0, 8);
    const idx = reserveNextPointIndex();
    const matchKey = isTraining ? matchupId : matchId;
    const pointId = `${matchKey}_${coachShortId}_${String(idx).padStart(3, '0')}`;
    const enriched = {
      ...data,
      coachUid: uid,
      coachShortId,
      index: idx,
      canonical: false,
      mergedInto: null,
    };
    if (isTraining) {
      await ds.setTrainingPointWithId(trainingId, matchupId, pointId, enriched);
    } else {
      await ds.setPointWithId(tournamentId, matchId, pointId, enriched);
    }
    return { id: pointId };
  };
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
  const [hmVisibility, setHmVisibility] = useState({
    teamA: { positions: true, shots: true },
    teamB: { positions: true, shots: true },
  });
  const [previewPointId, setPreviewPointId] = useState(null);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const undoStack = useUndo(10);
  const [toolbarPlayer, setToolbarPlayer] = useState(null);
  const [shotMode, setShotMode] = useState(null);
  const [quickShotPlayer, setQuickShotPlayer] = useState(null); // idx of player in QuickShotPanel
  const [onFieldRoster, setOnFieldRoster] = useState([]);
  const [rosterGridVisible, setRosterGridVisible] = useState(true);
  const [sideChange, setSideChange] = useState(false);
  // Auto-select "Swap sides" on winner pick, per PROJECT_GUIDELINES § 2.5:
  // win_a/win_b → auto-flip to Swap; timeout / no_point / clear → reset to Same.
  // Effect keyed on `outcome` so same-outcome re-selection doesn't re-fire —
  // user's manual toggle override persists until outcome actually changes
  // (which includes selecting the same outcome off → null and back on again).
  // Restores the pre-2026-04-15 behavior; the over-correction that forced
  // Same on every outcome change is removed.
  useEffect(() => {
    // Fix Y: editing existing point must not re-arm swap intent — editPoint
    // hydrates `outcome` from Firestore and that should not be treated as a
    // winner pick. Auto-swap fires only for new-point scouting (§ 2.5).
    if (editingId) return;
    if (outcome === 'win_a' || outcome === 'win_b') {
      setSideChange(true);
    } else {
      setSideChange(false);
    }
  }, [outcome, editingId]);
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
  // For training matchups: always use LIVE squads from training.squads, not the
  // snapshot saved at matchup creation. This way, adding/removing players from
  // a squad immediately reflects in the scouting UI.
  const scoutedA = isTraining && matchup
    ? { id: matchup.homeSquad, roster: training?.squads?.[matchup.homeSquad] || matchup.homeRoster || [] }
    : scouted.find(s => s.id === match?.teamA);
  const scoutedB = isTraining && matchup
    ? { id: matchup.awaySquad, roster: training?.squads?.[matchup.awaySquad] || matchup.awayRoster || [] }
    : scouted.find(s => s.id === match?.teamB);
  const teamA = isTraining && matchup
    ? { id: matchup.homeSquad, name: SQUAD_DISPLAY[matchup.homeSquad] || matchup.homeSquad }
    : teams.find(t => t.id === scoutedA?.teamId);
  const teamB = isTraining && matchup
    ? { id: matchup.awaySquad, name: SQUAD_DISPLAY[matchup.awaySquad] || matchup.awaySquad }
    : teams.find(t => t.id === scoutedB?.teamId);
  const rosterA = (scoutedA?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  const rosterB = (scoutedB?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  // Coach Notes — per scouted team, tournament mode only
  const { notes: notesA } = useNotes(isTraining ? null : tournamentId, isTraining ? null : match?.teamA);
  const { notes: notesB } = useNotes(isTraining ? null : tournamentId, isTraining ? null : match?.teamB);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesModalShown, setNotesModalShown] = useState(false);
  const scoutedNotesSide = scoutingSide === 'away' ? 'B' : 'A';
  const relevantNotes = scoutedNotesSide === 'A' ? notesA : notesB;
  const relevantScoutedId = scoutedNotesSide === 'A' ? match?.teamA : match?.teamB;
  const relevantTeamName = scoutedNotesSide === 'A' ? teamA?.name : teamB?.name;
  const visibleNotes = useMemo(
    () => filterVisibleNotes(relevantNotes, userId, userRole),
    [relevantNotes, userId, userRole]
  );
  const unseenNotes = useMemo(
    () => visibleNotes.filter(n => !(n.seenBy || []).includes(userId)),
    [visibleNotes, userId]
  );

  useEffect(() => {
    if (isTraining || notesModalShown || !match || !userId || !scoutingSide) return;
    if (unseenNotes.length > 0) {
      setNotesModalOpen(true);
      setNotesModalShown(true);
    }
  }, [isTraining, match, userId, scoutingSide, unseenNotes.length, notesModalShown]);

  // ═══ SELF-LOG (Tier 1 HotSheet) ═══
  // Identity comes from useWorkspace().linkedPlayer (set at PBLI onboarding
  // per § 38.12). useSelfLogIdentity shim removed in Commit 4.
  const selfPlayerId = linkedPlayer?.id || null;
  const [hotSheetOpen, setHotSheetOpen] = useState(false);
  const selfPlayer = useMemo(
    () => players.find(p => p.id === selfPlayerId),
    [players, selfPlayerId]
  );
  const selfTeamId = selfPlayer?.teamId || null;
  const selfLogPoints = isTraining ? trainPoints : tournPoints;
  const pendingSelfLogCount = useMemo(() => {
    if (!selfPlayerId) return 0;
    return (selfLogPoints || []).filter(pt => !pt.selfLogs?.[selfPlayerId]).length;
  }, [selfLogPoints, selfPlayerId]);

  async function handleSelfLogSave({ breakout, breakoutVariant, outcome, shots: shotMap, variants: availableVariants }) {
    if (!selfPlayerId) return;
    // Find the most recent pending point (not yet logged by this player),
    // else create a new one.
    const pending = (selfLogPoints || [])
      .filter(pt => !pt.selfLogs?.[selfPlayerId])
      .sort((a, b) => (b.order || 0) - (a.order || 0))[0];
    let pid = pending?.id;
    if (!pid) {
      const doc = await addPointFn({ order: Date.now() });
      pid = doc.id;
    }
    // 1. Write self-log on the point
    if (isTraining) {
      await ds.setPlayerSelfLogTraining(trainingId, matchupId, pid, selfPlayerId, {
        breakout, breakoutVariant, outcome,
      });
    } else {
      await ds.setPlayerSelfLog(tournamentId, matchId, pid, selfPlayerId, {
        breakout, breakoutVariant, outcome,
      });
    }
    // 2. Write shot documents with synthetic coords (bunker center)
    const bunkers = field?.layout?.bunkers || [];
    const layoutIdForShot = field?.layout?.id || null;
    for (const [targetBunker, result] of Object.entries(shotMap || {})) {
      const b = bunkers.find(bb => (bb.positionName || bb.name) === targetBunker);
      const shotDoc = {
        playerId: selfPlayerId,
        // scoutedBy required by firestore.rules v2 self-log carve-out
        // (§ 38.9) — allow update/delete only when owner uid matches.
        scoutedBy: userId,
        breakout, breakoutVariant,
        targetBunker, result,
        x: b?.x ?? 0.5,
        y: b?.y ?? 0.5,
        layoutId: layoutIdForShot,
        tournamentId: isTraining ? trainingId : tournamentId,
      };
      if (isTraining) {
        await ds.addSelfLogShotTraining(trainingId, matchupId, pid, shotDoc);
      } else {
        await ds.addSelfLogShot(tournamentId, matchId, pid, shotDoc);
      }
    }
    // 3. Increment team variant usage
    if (breakoutVariant && selfTeamId) {
      const v = (availableVariants || []).find(vv => vv.variantName === breakoutVariant);
      if (v) await ds.incrementVariantUsage(selfTeamId, v.id);
    }
  }

  const markAllNotesSeen = async () => {
    if (!userId || !relevantScoutedId) { setNotesModalOpen(false); return; }
    await Promise.all(unseenNotes.map(n =>
      ds.markNoteSeen(tournamentId, relevantScoutedId, n.id, userId)
    ));
    setNotesModalOpen(false);
  };

  const notesModalEl = (
    <UnseenNotesModal
      open={notesModalOpen}
      onClose={() => setNotesModalOpen(false)}
      notes={unseenNotes}
      teamName={relevantTeamName}
      onMarkAllSeen={markAllNotesSeen}
    />
  );

  const selfLogFabEl = selfPlayerId && field?.layout ? (
    <>
      <button
        onClick={() => setHotSheetOpen(true)}
        title="Zaloguj swój punkt"
        style={{
          position: 'fixed', bottom: SPACE.xxl, right: SPACE.xxl,
          width: 56, height: 56, borderRadius: RADIUS.full,
          background: COLORS.accentGradient,
          border: 'none', color: '#000', cursor: 'pointer',
          boxShadow: COLORS.accentGlow,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 150,
        }}
      >
        <MapPin size={24} strokeWidth={2.5} />
        {pendingSelfLogCount > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 20, height: 20, borderRadius: RADIUS.full,
            padding: '0 5px',
            background: COLORS.danger, color: '#fff',
            fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${COLORS.bg}`,
          }}>{pendingSelfLogCount}</div>
        )}
      </button>
      <HotSheet
        open={hotSheetOpen}
        onClose={() => setHotSheetOpen(false)}
        layout={field.layout}
        playerId={selfPlayerId}
        teamId={selfTeamId}
        points={selfLogPoints}
        onSave={handleSelfLogSave}
      />
    </>
  ) : null;

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
        // Local orientation — per-coach streams (§ 42) mean no shared side
        // claim is necessary; each coach keeps their own perspective derived
        // from match.currentHomeSide (legacy shared signal kept for § 2.5
        // paintball auto-swap behavior).
        const homeSide = match?.currentHomeSide || 'left';
        if (side === 'home') {
          setActiveTeam('A');
          changeFieldSide(homeSide);
        } else {
          setActiveTeam('B');
          changeFieldSide(homeSide === 'left' ? 'right' : 'left');
        }
      }
    } else {
      // No scout param → review mode (works for closed matches too)
      if (scoutingSide !== 'observe') setScoutingSide('observe');
      if (viewMode !== 'review') setViewMode('review');
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
  //
  // 2026-04-24 concurrent-flip regression (reported NXL Czechy prep): coach B
  // placing players for a new point saw their view flip when coach A saved a
  // winning point first. Per § 2.5 paintball rule the flip IS correct for idle
  // coaches, but mid-placement it scrambles coach B's in-progress work. Add
  // `hasDraftData` to the editingId guard — same intent (perspective locked
  // during active local work). Once coach B saves or clears their draft, the
  // effect re-runs and the flip applies. Full architectural cleanup (deprecate
  // cross-coach sync entirely per Brief 8 v2 / § 42 per-coach streams) is
  // tracked in HANDOVER "Next on deck" as Path X — scheduled post-Saturday.
  useEffect(() => {
    if (!scoutingSide || scoutingSide === 'observe') return;
    if (editingId) return; // perspective locked during active edit
    const hasDraftData = draftA.players.some(Boolean) || draftB.players.some(Boolean);
    if (hasDraftData) return; // perspective locked during active new-point placement
    const homeSide = match?.currentHomeSide || 'left';
    if (lastSyncedHomeSideRef.current === homeSide) return; // already applied, skip no-op re-fires
    const isInitialSync = lastSyncedHomeSideRef.current === null;
    lastSyncedHomeSideRef.current = homeSide;
    const mySide = scoutingSide === 'home' ? homeSide : (homeSide === 'left' ? 'right' : 'left');
    if (mySide === nextFieldSideRef.current) return; // local already matches (self-initiated swap)
    changeFieldSide(mySide);
    // Brief 9 Bug 3b: toast suppressed. Per-coach streams (§ 42) don't share
    // currentHomeSide — flips here can only originate from legacy (non-mode=new)
    // saves, which are essentially extinct under Brief 8. Local fieldSide still
    // syncs for correctness on those residual paths; the notification was noise.
    void isInitialSync;
  }, [match?.currentHomeSide, scoutingSide, editingId, draftA.players, draftB.players]);

  // Auto-attach — Brief 8 Problem A rewrite: URL-driven intent only, no fallback search.
  //   mode=new          → user clicked a Scout CTA → fresh scouting, skip attach.
  //   point=<id>        → explicit edit by ID → deferred to pointParamId effect (L515).
  //   neither           → legacy/unknown URL → warn; do NOT auto-attach.
  // The prior fallback openPoint search (status='open'||'partial' + !hasMyPlayers) is
  // removed entirely — it was the root cause of users' own partial points being silently
  // reloaded on the next Scout › click (BUG-C).
  useEffect(() => {
    if (!scoutingSide || scoutingSide === 'observe') return;
    if (editingId) return;
    if (saving) return;
    if (draftA.players.some(Boolean) || draftB.players.some(Boolean)) return;

    const mode = searchParams.get('mode');
    const pointIdParam = searchParams.get('point');
    // mode=new → Scout CTA fresh intent; skip attach (handled on save).
    // point=<id> → explicit edit; handled by pointParamId effect above.
    // neither → legacy/unknown URL; no attach applied (Brief 8 removed
    // the fallback openPoint search — prior root cause of silent reloads).
    void mode; void pointIdParam;
  }, [scoutingSide, editingId, saving, draftA, draftB, searchParams]);

  // Claim system retired (Brief F). Per-coach point streams (§ 42) give
  // each coach their own doc identity via coachUid, so no side needs to be
  // "claimed" at the match level. `match.home/awayClaimedBy/At` fields are
  // no longer written or read; stale values on pre-retirement match docs
  // are harmless (no code reads them).

  if (!tournament || !match) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EmptyState icon="⏳" text="Loading..." />
    </div>
  );

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

  // Quick log mode — full-screen replacement, no canvas
  if (viewMode === 'quicklog') {
    return (
      <QuickLogView
        teamA={teamA}
        teamB={teamB}
        roster={activeTeam === 'A' ? rosterA : rosterB}
        points={points}
        activeTeam={activeTeam}
        onSavePoint={async ({ assignments, players: zonePlayers, outcome }) => {
          const teamData = {
            players: zonePlayers || Array(5).fill(null),
            assignments,
            // shots must be object-of-arrays (not Array(5).fill([])) — Firestore
            // rejects nested arrays. Empty-map matches pointFactory.baseSide
            // shape; shotsFromFirestore() rehydrates to [[],[],[],[],[]] on read.
            shots: {},
            eliminations: Array(5).fill(false),
            eliminationPositions: Array(5).fill(null),
            quickShots: {},
            obstacleShots: {},
            bumpStops: Array(5).fill(null),
            runners: Array(5).fill(false),
          };
          const homeSide = activeTeam === 'A' ? 'left' : 'right';
          const awaySide = homeSide === 'left' ? 'right' : 'left';
          const data = {
            homeData: activeTeam === 'A' ? { ...teamData, fieldSide: homeSide } : {},
            awayData: activeTeam === 'B' ? { ...teamData, fieldSide: awaySide } : {},
            teamA: activeTeam === 'A' ? teamData : {},
            teamB: activeTeam === 'B' ? teamData : {},
            outcome,
            status: 'scouted',
            fieldSide: 'left',
          };
          await addPointFn(data);
          // Brief 9 Bug 2 (Option A): match.scoreA/scoreB computed from
          // coachUid-filtered `points` would overwrite the other coach's
          // subset — last-write-wins race. Authoritative score is written
          // once by endMatchAndMerge from canonical docs. Match lists show
          // 0:0 for active matches until End match (intentional).
        }}
        onBack={() => { setViewMode('review'); navigate(reviewUrl, { replace: true }); }}
        onSwitchToScout={() => {
          setViewMode('editor');
          const scoutedId = activeTeam === 'A' ? match?.teamA : match?.teamB;
          if (scoutedId) goScout(scoutedId);
        }}
      />
    );
  }

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
      // Check for existing point where my side is empty — chess-model join.
      // Search newest first. Only 'open' (shell created by other coach) and
      // 'partial' (one-sided in-progress) are legitimate join targets.
      // 'scouted' is terminal per § 18 — joining would load a completed
      // point into drafts and silently overwrite on next save. Mirror of
      // the narrowing applied in savePoint's fallback (§ 40 / Brief 6 L975).
      const mySide = scoutingSide === 'home' ? 'homeData' : 'awayData';
      const joinable = [...points].reverse().find(p => {
        // Must not have my side's data yet
        if (p[mySide]?.players?.some(Boolean)) return false;
        return p.status === 'open' || p.status === 'partial';
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
            // Brief 8 Problem A + B: mode=new → explicit "create new point" intent,
            // bypass the joinable search entirely AND route to the per-coach stream
            // (deterministic ID {matchKey}_{coachShortId}_{NNN}, coachUid/canonical
            // fields). usePoints filter by currentUid hides these docs from other
            // coaches' views until end-match merge flips canonical=true.
            const mode = searchParams.get('mode');
            if (mode === 'new') {
              sideUpdate.order = Date.now();
              if (!outcome) sideUpdate.outcome = 'pending';
              sideUpdate.fieldSide = fieldSide;
              sideUpdate.status = (homeHasData && awayHasData) ? 'scouted' : 'partial';
              await savePointAsNewStream(sideUpdate);
              return;
            }
            // Fallback: no shell exists — check for joinable point first (race condition protection).
            // Only 'open' (shell created by other coach) and 'partial' (one-sided in-progress)
            // are legitimate join targets. 'scouted' is terminal per § 18 — joining would
            // overwrite completed work.
            const mySide = scoutingSide === 'home' ? 'homeData' : 'awayData';
            const otherSide = scoutingSide === 'home' ? 'awayData' : 'homeData';
            const joinable = [...points].reverse().find(p => {
              if (p[mySide]?.players?.some(Boolean)) return false;
              return p.status === 'open' || p.status === 'partial';
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
          if (editingId) {
            await updatePointFn(editingId, data);
          } else {
            await addPointFn(data);
          }
        }
      });

      // Brief 9 Bug 2 (Option A): no per-save match.scoreA/B write — coachUid-
      // filtered `points` would write only own-stream subset and race other
      // coach's write. endMatchAndMerge computes score from canonical docs
      // and writes once. Match lists show 0:0 for active matches (intentional).

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
    // Fix Y: edit saves never mutate match.currentHomeSide — the edited point's
    // own {homeData,awayData}.fieldSide snapshot is authoritative for its
    // rendering. Auto-swap fires only on new-point save with a winner.
    if (shouldSwapSides && isConcurrent && !editingId) {
      // Sync swap to Firestore — both coaches' devices pick up via onSnapshot.
      // Brief 9 Bug 3a mode=new guard REVERTED: paintball rule is that both
      // teams physically swap sides after a point with a winner (§ 2.5), so
      // match.currentHomeSide is a legitimate shared signal even under
      // per-coach streams. Brief 7 `!editingId` guard stays (edit saves still
      // never flip). Toast suppression (Bug 3b, L619) remains — the flip is
      // real, just no longer announced as a surprise.
      const newHomeSide = (match?.currentHomeSide || 'left') === 'left' ? 'right' : 'left';
      const myNewSide = scoutingSide === 'home' ? newHomeSide : (newHomeSide === 'left' ? 'right' : 'left');
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
    // Brief 9 Bug 2 (Option A): no match.scoreA/B rewrite on delete — same
    // filter-race concern. If match was already merged, delete leaves stale
    // canonical score; re-running End match on closed matches is not
    // supported yet (follow-up). For live matches, End match recomputes
    // from surviving canonicals.
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
        // Priority 1: pre-picked roster from bottom grid (onFieldRoster)
        // Priority 2: last point's assignment at same slot (lastAssignA/B)
        if (!n.assign[idx]) {
          const alreadyAssigned = new Set(n.assign.filter(Boolean));
          const nextFromRoster = onFieldRoster.find(pid => !alreadyAssigned.has(pid));
          const lastRef = activeTeam === 'A' ? lastAssignA : lastAssignB;
          if (nextFromRoster) {
            n.assign[idx] = nextFromRoster;
          } else if (lastRef.current[idx]) {
            n.assign[idx] = lastRef.current[idx];
          }
        }
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
    // Brief 8 Problem A: Scout › CTA always enters fresh scouting (new point intent).
    // mode=new tells auto-attach and savePoint to bypass all fallback joinable searches.
    const goScout = (scoutedTeamId) => {
      if (!scoutedTeamId) return;
      navigate(`${reviewUrl}?scout=${scoutedTeamId}&mode=new`);
    };
    // List card tap on an existing point → explicit edit by ID (Brief 8 Rule 2).
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
              fontFamily: FONT, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: RADIUS.xs,
              background: isClosed ? '#64748b18' : '#f59e0b18',
              color: isClosed ? COLORS.textMuted : COLORS.accent,
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
            background: COLORS.surface,
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
                fontFamily: FONT, fontSize: 18, fontWeight: 700, color: COLORS.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{teamA?.name || 'Home'}</div>
              {!isClosed && (
                <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                  <div onClick={(e) => { e.stopPropagation(); goScout(match?.teamA); }} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.accent }}>
                    Scout ›
                  </div>
                  <div onClick={(e) => { e.stopPropagation(); setActiveTeam('A'); setViewMode('quicklog'); }} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted }}>
                    Quick ›
                  </div>
                </div>
              )}
            </div>
            {/* Divider */}
            <div style={{ width: 1, background: COLORS.surfaceLight }} />
            {/* Score center — recessed */}
            <div style={{
              flex: '0 0 auto', minWidth: 110,
              padding: '14px 12px',
              background: '#0d1117',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 900, color: COLORS.text, lineHeight: 1 }}>
                {sA}<span style={{ color: COLORS.textMuted }}>:</span>{sB}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted, marginTop: 4, letterSpacing: '.4px' }}>
                {points.length} POINT{points.length === 1 ? '' : 'S'}
              </div>
            </div>
            <div style={{ width: 1, background: COLORS.surfaceLight }} />
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
                fontFamily: FONT, fontSize: 18, fontWeight: 700, color: COLORS.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{teamB?.name || 'Away'}</div>
              {!isClosed && (
                <div style={{ display: 'flex', gap: 12, marginTop: 3, justifyContent: 'flex-end' }}>
                  <div onClick={(e) => { e.stopPropagation(); setActiveTeam('B'); setViewMode('quicklog'); }} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted }}>
                    ‹ Quick
                  </div>
                  <div onClick={(e) => { e.stopPropagation(); goScout(match?.teamB); }} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.accent }}>
                    ‹ Scout
                  </div>
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
                visibility={{ A: hmVisibility.teamA, B: hmVisibility.teamB }}
                discoLine={0} zeekerLine={0} />
          </div>
          {/* Per-team layer toggles (§ 40) — independent positions/shots for each team */}
          <PerTeamHeatmapToggle
            teamA={{ name: teamA?.name, color: TEAM_COLORS.A }}
            teamB={{ name: teamB?.name, color: TEAM_COLORS.B }}
            visibility={hmVisibility}
            onChange={setHmVisibility}
          />
          {/* Scouting completeness (§ 33 sibling — match-view feedback).
               One canonical card replaces the prior two surfaces (inline
               2-bar mini-summary inside the Points list block + scout-only
               ScoutScoreSheet). All 5 ranking metrics + composite, with
               4-tier color scale (≥90 gold + star / 70-89 green / 50-69
               amber / <50 red + warn). Coaching analytics (dorito/snake
               %) still intentionally NOT rendered here — those tendencies
               belong on ScoutedTeamPage drill-down. */}
          {(() => {
            const showCompletenessCard = hasAnyRole(roles, 'scout', 'coach') || isAdmin;
            if (!showCompletenessCard) return null;
            return <CompletenessCard points={points} />;
          })()}
          {/* Points list */}
          <div style={{ padding: `8px ${R.layout.padding}px`, borderTop: `1px solid ${COLORS.border}` }}>
            <SectionLabel>Points ({points.length})</SectionLabel>
            {/* Inline Breaks/Shots 2-bar mini-summary removed — superseded
                by CompletenessCard above (5 metrics + composite, role-gated
                to scout/coach/admin). § 27 — one canonical surface, not
                three (the prior surfaces had three different threshold
                scales for the same conceptual data). */}
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
                const aBar = aWon ? COLORS.success : bWon ? COLORS.danger : COLORS.borderLight;
                const bBar = bWon ? COLORS.success : aWon ? COLORS.danger : COLORS.borderLight;
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
                    background: isPreviewing ? '#f59e0b08' : COLORS.surfaceDark,
                    border: `1px solid ${isPreviewing ? '#f59e0b40' : isOpen ? COLORS.accent + '60' : COLORS.surfaceLight}`,
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
                          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted }}>#{idx+1}</span>
                          {pt.isOT && <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.accent, letterSpacing: '.3px' }}>OT</span>}
                          {isOpen && <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.accent, letterSpacing: '.3px' }}>OPEN</span>}
                        </div>
                        <div style={{
                          fontFamily: FONT, fontSize: 14,
                          fontWeight: aWon ? 600 : 500,
                          color: aWon ? COLORS.text : COLORS.textMuted,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          marginTop: 1,
                        }}>{teamA?.name || 'Home'}</div>
                        {ptDataA.scoutedBy && (
                          <div style={{
                            fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted,
                            marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{scoutShortName(ptDataA.scoutedBy)}</div>
                        )}
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
                        color: isPreviewing ? COLORS.accent : '#8b95a5',
                        lineHeight: 1,
                      }}>
                        {prog.a}<span style={{ color: COLORS.textMuted }}>:</span>{prog.b}
                      </div>
                      {totalElim > 0 && (
                        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted, marginTop: 3 }}>
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
                          color: bWon ? COLORS.text : COLORS.textMuted,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{teamB?.name || 'Away'}</div>
                        {ptDataB.scoutedBy && (
                          <div style={{
                            fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted,
                            marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{scoutShortName(ptDataB.scoutedBy)}</div>
                        )}
                        {(ptDataA.penalty || ptDataB.penalty || pt.comment) && (
                          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ptDataA.penalty && <span style={{ color: COLORS.danger }}>{ptDataA.penalty} </span>}
                            {ptDataB.penalty && <span style={{ color: COLORS.danger }}>{ptDataB.penalty} </span>}
                            {pt.comment && <span style={{ fontStyle: 'italic' }}>💬 {pt.comment}</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: bBar, flexShrink: 0 }} />
                    </div>
                    {/* ⋮ menu */}
                    <div onClick={(e) => { e.stopPropagation(); setPointMenu({ id: pt.id, idx: idx + 1 }); }}
                      style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', color: COLORS.textMuted, fontSize: 18 }}>
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
                color: COLORS.danger,
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
        async () => {
          // Brief 8 Commit 3 — run end-match merge before flipping status.
          // Merge is idempotent (skips if match.merged=true) so a second
          // click is safe. After merge, usePoints filter flips to canonical,
          // UI shows the merged view. Toast surfaces unmerged count for audit.
          try {
            const result = isTraining
              ? await ds.endMatchupAndMerge(trainingId, matchupId)
              : await ds.endMatchAndMerge(tournamentId, matchId);
            await updateMatchFn({ status: 'closed' });
            if (!result?.alreadyMerged && result?.unmerged > 0) {
              setToast(`⚠ ${result.unmerged} unmerged point${result.unmerged === 1 ? '' : 's'} — audit manually`);
              setTimeout(() => setToast(null), 4000);
            }
          } catch (e) {
            console.error('End-match merge failed:', e);
            alert('End match failed: ' + (e.message || 'Unknown error'));
          }
        },
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
      {notesModalEl}
      {selfLogFabEl}
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
            team={activeTeam}
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
            background: outcome ? COLORS.accentGradient : COLORS.surfaceLight,
            color: outcome ? '#000' : COLORS.textMuted,
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
      {notesModalEl}
      {selfLogFabEl}
    </div>
  );
}
