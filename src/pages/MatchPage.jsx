import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';

import FieldCanvas from '../components/FieldCanvas';
import HeatmapCanvas from '../components/HeatmapCanvas';
import FieldEditor from '../components/FieldEditor'; // used only in heatmap view
import { Btn, SectionTitle, SectionLabel, Select, Icons, EmptyState, Modal, ConfirmModal, ActionSheet, MoreBtn, CoachingStats } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints, usePlayers, useLayouts } from '../hooks/useFirestore';
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

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];
const E5B = () => [false, false, false, false, false];
const PENALTIES = ['', '141', '241', '341'];

function emptyTeam() {
  return { players: E5(), shots: E5A(), assign: E5(), bumps: E5(), elim: E5B(), elimPos: E5(), runners: E5B(), penalty: '' };
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
  const R = responsive(device.type);
  const isLandscape = device.isLandscape && !device.isDesktop;
    const { tournamentId, matchId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { points, loading } = usePoints(tournamentId, matchId);
  const { layouts } = useLayouts();

  // Editor state
  const [editingId, setEditingId] = useState(null);
  const deleteConfirm = useConfirm();
  const playerDeleteConfirm = useConfirm();
  const closeMatchConfirm = useConfirm();
  const clearAllConfirm = useConfirm();
  const [draftA, setDraftA] = useState(emptyTeam());
  const [draftB, setDraftB] = useState(emptyTeam());
  const [activeTeam, setActiveTeam] = useState('A');
  const [fieldSide, setFieldSide] = useState('left');
  const nextFieldSideRef = useRef('left'); // always holds the truth
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
  const [scoutingSide, setScoutingSide] = useState(null); // null=picker, 'home', 'away', 'observe'
  const [heatmapSide, setHeatmapSide] = useState('mine'); // mine|all — toggle in heatmap view
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const undoStack = useUndo(10);
  const [toolbarPlayer, setToolbarPlayer] = useState(null);
  const [shotMode, setShotMode] = useState(null);
  const [onFieldRoster, setOnFieldRoster] = useState([]);
  const [rosterGridVisible, setRosterGridVisible] = useState(true);
  const [sideChange, setSideChange] = useState(false);
  // Auto-select "Swap sides" when a winner is picked (paintball rule: winner switches sides)
  useEffect(() => {
    if (outcome === 'win_a' || outcome === 'win_b') setSideChange(true);
    else setSideChange(false);
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



  const tournament = tournaments.find(t => t.id === tournamentId);
  const match = matches.find(m => m.id === matchId);
  const field = useField(tournament, layouts, true); // useField hook



  // Resolve teams
  const scoutedA = scouted.find(s => s.id === match?.teamA);
  const scoutedB = scouted.find(s => s.id === match?.teamB);
  const teamA = teams.find(t => t.id === scoutedA?.teamId);
  const teamB = teams.find(t => t.id === scoutedB?.teamId);
  const rosterA = (scoutedA?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  const rosterB = (scoutedB?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  // Active draft/roster
  const draft = activeTeam === 'A' ? draftA : draftB;
  const setDraft = activeTeam === 'A' ? setDraftA : setDraftB;
  const roster = activeTeam === 'A' ? rosterA : rosterB;

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
    return [
      { icon: '👤', label: 'Assign', color: COLORS.accent, action: 'assign' },
      { icon: isElim ? '❤️' : '💀', label: isElim ? 'Alive' : 'Hit', color: COLORS.danger, action: 'hit' },
      { icon: isRunner ? '🔫' : '🏃', label: isRunner ? 'Gun up' : 'Runner', color: isRunner ? COLORS.info : COLORS.textDim, action: 'runner' },
      { icon: '🎯', label: 'Shot', color: COLORS.textDim, action: 'shoot' },
      { icon: '✕', label: 'Del', color: COLORS.textMuted, action: 'remove' },
    ];
  }, [toolbarPlayer, draft.elim, draft.runners]);

  // Auto-observe for closed matches — skip side picker
  useEffect(() => {
    if (match?.status === 'closed' && !scoutingSide) {
      setScoutingSide('observe');
      setViewMode('heatmap');
    }
  }, [match?.status, scoutingSide]);

  // Sync outcome from Firestore — when other coach saves with an outcome, update local state
  useEffect(() => {
    if (!editingId || (scoutingSide !== 'home' && scoutingSide !== 'away')) return;
    const currentPoint = points.find(p => p.id === editingId);
    if (currentPoint?.outcome && currentPoint.outcome !== 'pending' && !outcome) {
      setOutcome(currentPoint.outcome);
    }
  }, [points, editingId]);

  // Sync fieldSide from Firestore (match.currentHomeSide) — deterministic for both coaches
  const prevHomeSideRef = useRef(match?.currentHomeSide || 'left');
  useEffect(() => {
    if (!scoutingSide || scoutingSide === 'observe') return;
    const homeSide = match?.currentHomeSide || 'left';
    const prevHomeSide = prevHomeSideRef.current;
    prevHomeSideRef.current = homeSide;
    
    const myNewSide = scoutingSide === 'home' ? homeSide : (homeSide === 'left' ? 'right' : 'left');
    
    // If side actually changed (not initial mount), mirror existing draft positions
    // BUT NOT if coach is currently editing a point — don't disrupt active work
    if (prevHomeSide !== homeSide && fieldSide !== myNewSide && !editingId) {
      const mirrorDraft = d => ({
        ...d,
        players: d.players.map(p => p ? { ...p, x: 1 - p.x } : null),
        bumps: d.bumps.map(b => b ? { ...b, x: 1 - b.x } : null),
        shots: d.shots.map(arr => (arr || []).map(s => s ? { ...s, x: 1 - s.x } : null)),
      });
      if (scoutingSide === 'home') setDraftA(mirrorDraft);
      else setDraftB(mirrorDraft);
    }
    
    changeFieldSide(myNewSide);
  }, [match?.currentHomeSide, scoutingSide]);

  // Auto-attach to open point in concurrent mode
  // When other coach creates a shell point, this coach auto-enters edit mode for it
  useEffect(() => {
    if (!scoutingSide || scoutingSide === 'observe') return;
    if (editingId) return; // already editing
    if (saving) return;
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
        assign: [...(tA.assignments || E5())], bumps: [...(tA.bumpStops || E5())],
        elim: [...(tA.eliminations || E5B())], elimPos: [...(tA.eliminationPositions || E5())],
        runners: [...(tA.runners || E5B())],
        penalty: tA.penalty || '',
      });
      setDraftB({
        players: [...(tB.players || E5())], shots: ds.shotsFromFirestore(tB.shots).map(s => [...(s||[])]),
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
  useEffect(() => {
    return () => {
      const side = scoutingSideRef.current;
      if (side === 'home' || side === 'away') {
        const claimField = side === 'home' ? 'homeClaimedBy' : 'awayClaimedBy';
        const claimTimeField = side === 'home' ? 'homeClaimedAt' : 'awayClaimedAt';
        ds.updateMatch(tournamentId, matchId, { [claimField]: null, [claimTimeField]: null }).catch(() => {});
      }
    };
  }, [tournamentId, matchId]);

  // Heartbeat — refresh claim timestamp every 5 min so stale detection works on crash
  useEffect(() => {
    if (scoutingSide !== 'home' && scoutingSide !== 'away') return;
    const interval = setInterval(() => {
      const claimTimeField = scoutingSide === 'home' ? 'homeClaimedAt' : 'awayClaimedAt';
      ds.updateMatch(tournamentId, matchId, { [claimTimeField]: Date.now() }).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [scoutingSide, tournamentId, matchId]);

  if (!tournament || !match) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EmptyState icon="⏳" text="Loading..." />
    </div>
  );

  // Side claim handler — writes to Firestore so other coach sees it
  const CLAIM_TTL_MS = 30 * 60 * 1000; // 30 min stale threshold
  const claimSide = async (side) => {
    // Release previous claim if switching sides
    if (scoutingSide === 'home' || scoutingSide === 'away') {
      const prevField = scoutingSide === 'home' ? 'homeClaimedBy' : 'awayClaimedBy';
      const prevTimeField = scoutingSide === 'home' ? 'homeClaimedAt' : 'awayClaimedAt';
      await ds.updateMatch(tournamentId, matchId, { [prevField]: null, [prevTimeField]: null }).catch(() => {});
    }
    setScoutingSide(side);
    const homeSide = match?.currentHomeSide || 'left';
    if (side === 'home') { setActiveTeam('A'); changeFieldSide(homeSide); }
    else if (side === 'away') { setActiveTeam('B'); changeFieldSide(homeSide === 'left' ? 'right' : 'left'); }
    // Write claim to Firestore (home/away only, not observe)
    if (side === 'home' || side === 'away') {
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

  // Side picker overlay
  if (!scoutingSide) {
    const uid = auth.currentUser?.uid || null;
    const homeClaimed = match?.homeClaimedBy;
    const awayClaimed = match?.awayClaimedBy;
    const homeStale = isClaimStale(match?.homeClaimedAt);
    const awayStale = isClaimStale(match?.awayClaimedAt);
    // A side is blocked if claimed by someone else AND not stale
    const homeBlocked = homeClaimed && homeClaimed !== uid && !homeStale;
    const awayBlocked = awayClaimed && awayClaimed !== uid && !awayStale;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PageHeader back={{ to: `/tournament/${tournamentId}` }} title={match.name || 'Match'} subtitle="SELECT SIDE" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: SPACE.xxl, gap: SPACE.lg }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: FONT_SIZE.xxl, color: COLORS.text, textAlign: 'center' }}>
            Which team are you scouting?
          </div>
          {[
            { side: 'home', label: 'Home', team: teamA, color: TEAM_COLORS.A, blocked: homeBlocked, claimedBy: homeClaimed, stale: homeStale },
            { side: 'away', label: 'Away', team: teamB, color: TEAM_COLORS.B, blocked: awayBlocked, claimedBy: awayClaimed, stale: awayStale },
          ].map(({ side, label, team, color, blocked, claimedBy, stale }) => (
            <div key={side} onClick={() => !blocked && claimSide(side)} style={{
              width: '100%', maxWidth: 320, padding: `${SPACE.lg}px ${SPACE.xxl}px`, borderRadius: RADIUS.xl,
              background: blocked ? COLORS.surfaceDark : color + '10', border: `2px solid ${blocked ? COLORS.border : color}`,
              cursor: blocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: SPACE.md,
              opacity: blocked ? 0.5 : 1,
            }}>
              <div style={{ width: 14, height: 14, borderRadius: RADIUS.full, background: blocked ? COLORS.textMuted : color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: FONT_SIZE.lg, color: blocked ? COLORS.textMuted : COLORS.text }}>
                  {team?.name || side.toUpperCase()}
                </div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
                  {blocked ? 'Claimed by another coach' : stale && claimedBy ? `${label} · stale claim` : label}
                </div>
              </div>
              {blocked && (
                <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: RADIUS.xs, background: COLORS.danger + '20', color: COLORS.danger }}>LIVE</div>
              )}
            </div>
          ))}
          <div onClick={() => claimSide('observe')}
            style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, cursor: 'pointer', marginTop: SPACE.sm }}>
            Just observe
          </div>
        </div>
      </div>
    );
  }

  const isConcurrent = scoutingSide === 'home' || scoutingSide === 'away';
  const mySideKey = scoutingSide === 'home' ? 'homeData' : 'awayData';
  const myLegacyKey = scoutingSide === 'home' ? 'teamA' : 'teamB';

  const score = matchScore(points);
  const effectiveView = viewMode === 'auto'
    ? (isConcurrent
      ? 'editor'  // Concurrent: stay in editor, don't flip when other coach saves
      : (points.length > 0 && !editingId ? 'heatmap' : 'editor'))
    : viewMode;

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
      // Check for existing open/partial shell where my side is empty
      const mySide = scoutingSide === 'home' ? 'homeData' : 'awayData';
      const joinable = points.find(p => {
        if (p.status !== 'open' && p.status !== 'partial') return false;
        const myData = p[mySide];
        return !myData?.players?.some(Boolean);
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
        const ref = await ds.addPoint(tournamentId, matchId, {
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

          // Write home side if it has data
          if (homeHasData) {
            sideUpdate.homeData = { ...homeTeamData, scoutedBy: uid, fieldSide: fieldSide };
            sideUpdate.teamA = homeTeamData;
          }
          // Write away side if it has data
          if (awayHasData) {
            sideUpdate.awayData = { ...awayTeamData, scoutedBy: uid, fieldSide: fieldSide };
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
            await ds.updatePoint(tournamentId, matchId, editingId, sideUpdate);
          } else {
            // Fallback: no shell exists
            sideUpdate.order = Date.now();
            if (!outcome) sideUpdate.outcome = 'pending';
            sideUpdate.fieldSide = fieldSide;
            sideUpdate.status = (homeHasData && awayHasData) ? 'scouted' : 'partial';
            await ds.addPoint(tournamentId, matchId, sideUpdate);
          }
        } else {
          // ── SOLO: write both sides (legacy) ──
          const data = {
            teamA: makeTeamData(draftA), teamB: makeTeamData(draftB),
            homeData: { ...makeTeamData(draftA), scoutedBy: uid, fieldSide: fieldSide },
            awayData: { ...makeTeamData(draftB), scoutedBy: uid, fieldSide: fieldSide },
            outcome: outcome || 'pending',
            status: 'scouted',
            comment: draftComment || null, isOT: isOT || false, fieldSide,
          };
          if (editingId) await ds.updatePoint(tournamentId, matchId, editingId, data);
          else await ds.addPoint(tournamentId, matchId, data);
        }
      });

      // Update match score from all points (for tournament page display)
      const allPoints = editingId
        ? points.map(p => p.id === editingId ? { ...p, outcome: outcome || p.outcome } : p)
        : [...points, { outcome: outcome || 'pending' }];
      const scoreA = allPoints.filter(p => p.outcome === 'win_a').length;
      const scoreB = allPoints.filter(p => p.outcome === 'win_b').length;
      await ds.updateMatch(tournamentId, matchId, { scoreA, scoreB }).catch(() => {});

      resetDraft();
      setViewMode('heatmap');
      setRosterGridVisible(true);
      setOnFieldRoster([]);
    } catch (e) {
      console.error('Save failed:', e);
      alert('Save failed: ' + (e.message || 'Unknown error'));
    }
    setSaving(false);
    if (shouldSwapSides && isConcurrent) {
      // Sync swap to Firestore — other coach picks up via onSnapshot
      const newHomeSide = (match?.currentHomeSide || 'left') === 'left' ? 'right' : 'left';
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
      assign: [...(tA.assignments || E5())], bumps: [...(tA.bumpStops || E5())],
      elim: [...(tA.eliminations || E5B())], elimPos: [...(tA.eliminationPositions || E5())],
      runners: [...(tA.runners || E5B())],
      penalty: tA.penalty || '',
    });
    setDraftB({
      players: [...(tB.players || E5())], shots: sfs(tB.shots).map(s => [...(s||[])]),
      assign: [...(tB.assignments || E5())], bumps: [...(tB.bumpStops || E5())],
      elim: [...(tB.eliminations || E5B())], elimPos: [...(tB.eliminationPositions || E5())],
      runners: [...(tB.runners || E5B())],
      penalty: tB.penalty || '',
    });
    setOutcome(pt.outcome || null);
    setDraftComment(pt.comment || '');
    setIsOT(pt.isOT || false);
    setEditingId(pt.id); setSelPlayer(null); setMode('place'); setActiveTeam(scoutingSide === 'away' ? 'B' : 'A');
    // Load fieldSide: in concurrent mode, from my side's data; in solo, from point level
    if (isConcurrent) {
      const myData = scoutingSide === 'home' ? tA : tB;
      if (myData.fieldSide) changeFieldSide(myData.fieldSide);
      // else keep current fieldSide (new point, my side not saved yet)
    } else {
      changeFieldSide(pt.fieldSide || 'left');
    }
    if ((tB.players || E5()).some(Boolean)) setShowOpponent(true);
    setViewMode('editor');
  };

  const handleDeletePoint = async (pid) => {
    await ds.deletePoint(tournamentId, matchId, pid);
    // Recalculate score after deletion
    const remaining = points.filter(p => p.id !== pid);
    const scoreA = remaining.filter(p => p.outcome === 'win_a').length;
    const scoreB = remaining.filter(p => p.outcome === 'win_b').length;
    await ds.updateMatch(tournamentId, matchId, { scoreA, scoreB });
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
    if (action === 'shoot') { setShotMode(idx); setToolbarPlayer(null); }
    if (action === 'remove') {
      setToolbarPlayer(null);
      playerDeleteConfirm.ask(idx);
    }
    if (action === 'assign') { setAssignTarget(idx); setToolbarPlayer(null); }
  };

  const handleSelectPlayer = (idx) => {
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
          results.push({ ...mirrored, shots: mirrorShotsToRight(sfs(dataA.shots), fs), outcome: pt.outcome, side: 'A' });
        }
        if (dataB) {
          const fs = dataB.fieldSide || pt.fieldSide || 'left';
          const mirrored = mirrorPointToLeft(dataB, fs);
          results.push({ ...mirrored, shots: mirrorShotsToRight(sfs(dataB.shots), fs), outcome: pt.outcome, side: 'B' });
        }
        return results;
      });
    }
    return points.map(pt => {
      const d = side === 'A' ? (pt.homeData || pt.teamA) : (pt.awayData || pt.teamB);
      if (!d) return null;
      const sideFieldSide = d.fieldSide || pt.fieldSide || 'left';
      const mirrored = mirrorPointToLeft(d, sideFieldSide);
      return { ...mirrored, shots: mirrorShotsToRight(sfs(d.shots), sideFieldSide), outcome: pt.outcome };
    }).filter(Boolean);
  };

  // ═══ HEATMAP VIEW ═══
  if (effectiveView === 'heatmap') {
    const isClosed = match?.status === 'closed';
    const isDraw = score && score.a === score.b;
    const winnerA = score?.a > score?.b;
    const winnerB = score?.b > score?.a;
    const myTeam = scoutingSide === 'away' ? teamB : teamA;
    const oppTeam = scoutingSide === 'away' ? teamA : teamB;
    const myScore = scoutingSide === 'away' ? score?.b : score?.a;
    const oppScore = scoutingSide === 'away' ? score?.a : score?.b;
    const myWin = myScore > oppScore;
    const myLoss = myScore < oppScore;
    return (
      <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        {/* Match header */}
        {(() => {
          const resultColor = isClosed ? (isDraw ? COLORS.accent : myWin ? COLORS.success : COLORS.danger) : null;
          const resultLabel = isDraw ? 'DRAW' : myWin ? 'WIN' : 'LOSS';
          const badgeBg = isClosed ? (resultColor + '18') : COLORS.accent;
          const badgeColor = isClosed ? resultColor : '#000';
          return (
            <PageHeader
              back={{ to: () => {
                const myScoutedId = scoutingSide === 'away' ? match?.teamB : match?.teamA;
                navigate(`/tournament/${tournamentId}/team/${myScoutedId}`);
              }}}
              title={isClosed
                ? `${myTeam?.name || '?'} vs ${oppTeam?.name || '?'}`
                : `Scouting ${myTeam?.name || '?'}`}
              titleColor={resultColor}
              subtitle={isClosed
                ? `${myScore || 0}:${oppScore || 0} · ${resultLabel}`
                : `VS ${oppTeam?.name || '?'} · ${myScore || 0}:${oppScore || 0}`}
              subtitleColor={resultColor ? resultColor + 'B3' : undefined}
              badges={
                <span style={{
                  fontFamily: FONT, fontSize: 8, fontWeight: 800, padding: '3px 8px', borderRadius: RADIUS.xs,
                  background: badgeBg, color: badgeColor, letterSpacing: '.5px',
                  boxShadow: !isClosed ? COLORS.accentGlow : 'none',
                }}>{isClosed ? 'FINAL' : 'LIVE'}</span>
              }
              action={!isClosed && <MoreBtn onClick={() => setMatchMenuOpen(true)} />}
            />
          );
        })()}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Merge view toggle — only in concurrent mode */}
          {isConcurrent && (
            <div style={{ display: 'flex', gap: 0, margin: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.md, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
              {[
                { key: 'mine', label: myTeam?.name?.slice(0, 12) || 'My Team' },
                { key: 'all', label: 'Both Teams' },
              ].map(({ key, label }) => (
                <div key={key} onClick={() => setHeatmapSide(key)} style={{
                  flex: 1, padding: `${SPACE.xs}px ${SPACE.sm}px`, textAlign: 'center', cursor: 'pointer',
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, letterSpacing: '.5px',
                  background: heatmapSide === key ? COLORS.accent : 'transparent',
                  color: heatmapSide === key ? '#000' : COLORS.textMuted,
                  transition: 'background 0.15s, color 0.15s',
                }}>{label}</div>
              ))}
            </div>
          )}
          <div onClick={startNewPoint} title="Click to add a new point">
              <HeatmapCanvas fieldImage={field.fieldImage} points={getHeatmapPoints(
                isConcurrent
                  ? (heatmapSide === 'all' ? 'all' : (scoutingSide === 'away' ? 'B' : 'A'))
                  : 'all'
              )}
                rosterPlayers={[...rosterA, ...rosterB]}
                bunkers={[]} showBunkers={false}
                showZones={false}
                discoLine={0} zeekerLine={0} />
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
            {[...points].reverse().map((pt) => {
              const idx = points.indexOf(pt);
              const isOpen = (pt.status === 'open' || pt.status === 'partial') && (!pt.outcome || pt.outcome === 'pending');
              const oc = pt.outcome;
              const myWinOutcome = scoutingSide === 'away' ? 'win_b' : 'win_a';
              const oppWinOutcome = scoutingSide === 'away' ? 'win_a' : 'win_b';
              const oColor = oc === myWinOutcome ? COLORS.win : oc === oppWinOutcome ? COLORS.loss : oc === 'timeout' ? COLORS.timeout : COLORS.textMuted;
              const oLabel = oc === 'win_a' ? teamA?.name?.slice(0,3).toUpperCase() : oc === 'win_b' ? teamB?.name?.slice(0,3).toUpperCase() : oc === 'timeout' ? 'T' : '—';
              const ptDataA = pt.homeData || pt.teamA || {};
              const ptDataB = pt.awayData || pt.teamB || {};
              const elimA = (ptDataA.eliminations || []).filter(Boolean).length;
              const elimB = (ptDataB.eliminations || []).filter(Boolean).length;
              const totalElim = elimA + elimB;
              // My team players (for mini field preview)
              const isA = scoutingSide !== 'away';
              const myData = isA ? ptDataA : ptDataB;
              const myPlayers = (myData.players || []).filter(Boolean);
              const oppData = isA ? ptDataB : ptDataA;
              const oppPlayers = (oppData.players || []).filter(Boolean);
              const playingCount = myPlayers.length;
              const oppPlayingCount = oppPlayers.length;
              // Dorito/snake count per point
              const dl = field.discoLine || 0.30;
              const zl = field.zeekerLine || 0.80;
              const doritoSide = field.layout?.doritoSide || 'top';
              let dCount = 0, sCount = 0;
              myPlayers.forEach(p => {
                const crossedDisco = doritoSide === 'top' ? p.y < dl : p.y > (1 - dl);
                const crossedZeeker = doritoSide === 'top' ? p.y > zl : p.y < (1 - zl);
                if (crossedDisco) dCount++;
                else if (crossedZeeker) sCount++;
              });
              // Zone detection
              const hasDanger = field.dangerZone?.length >= 3
                ? myPlayers.some(p => pointInPolygon(p, field.dangerZone))
                : false;
              const hasSajgon = field.sajgonZone?.length >= 3
                ? myPlayers.some(p => pointInPolygon(p, field.sajgonZone))
                : false;
              const dTotal = dCount + sCount || 1;
              return (
                <div key={pt.id} className="fade-in" onClick={() => editPoint(pt)} style={{
                  display: 'flex', borderRadius: RADIUS.lg, background: isOpen ? COLORS.accent + '08' : COLORS.surfaceDark,
                  border: `1px ${isOpen ? 'dashed' : 'solid'} ${isOpen ? COLORS.accent + '60' : COLORS.border}`, marginBottom: 4, cursor: 'pointer',
                  overflow: 'hidden', transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = isOpen ? COLORS.accent + '60' : COLORS.border}>
                  {/* Left accent bar */}
                  <div style={{ width: 4, background: isOpen ? COLORS.accent : oColor, flexShrink: 0 }} />
                  {/* Content */}
                  <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
                    {/* Row 1: number + winner + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 800, color: COLORS.accent }}>#{idx+1}</span>
                      {isOpen
                        ? <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800, color: COLORS.accent, background: COLORS.accent + '18', padding: '2px 6px', borderRadius: 3, animation: 'pulse 2s infinite' }}>OPEN</span>
                        : <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 800, color: oColor }}>{oLabel}</span>
                      }
                      {pt.isOT && <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800, color: COLORS.accent, background: COLORS.accent + '18', padding: '2px 6px', borderRadius: 3 }}>OT</span>}
                      {hasDanger && <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.danger, background: COLORS.danger + '15', padding: '2px 5px', borderRadius: 3 }}>DANGER</span>}
                      {hasSajgon && <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.info, background: COLORS.info + '15', padding: '2px 5px', borderRadius: 3 }}>SAJGON</span>}
                      <span style={{ flex: 1 }} />
                      {isConcurrent && (
                        <span style={{ display: 'flex', gap: 3, marginRight: 6 }}>
                          <span title="Home" style={{ width: 6, height: 6, borderRadius: 3, background: ptDataA.players?.some(Boolean) ? COLORS.success : COLORS.border }} />
                          <span title="Away" style={{ width: 6, height: 6, borderRadius: 3, background: ptDataB.players?.some(Boolean) ? COLORS.info : COLORS.border }} />
                        </span>
                      )}
                      <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.textDim }}>{playingCount}v{oppPlayingCount}</span>
                    </div>
                    {/* Row 2: dorito/snake split bar */}
                    {(dCount > 0 || sCount > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', gap: 1, flex: 1 }}>
                          <div style={{ width: `${dCount / dTotal * 100}%`, background: COLORS.danger, borderRadius: 2 }} />
                          <div style={{ width: `${sCount / dTotal * 100}%`, background: COLORS.info, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textMuted, flexShrink: 0 }}>{dCount}D {sCount}S</span>
                      </div>
                    )}
                    {/* Row 3: extras */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: FONT_SIZE.xxs, fontFamily: FONT, color: COLORS.textMuted }}>
                      {totalElim > 0 && <span>{totalElim} elim</span>}
                      {ptDataA.penalty && <span style={{ color: COLORS.danger }}>{ptDataA.penalty}</span>}
                      {ptDataB.penalty && <span style={{ color: COLORS.danger }}>{ptDataB.penalty}</span>}
                    </div>
                    {/* Comment */}
                    {pt.comment && (
                      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic',
                        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        💬 {pt.comment}
                      </div>
                    )}
                  </div>
                  {/* Mini field preview */}
                  <div style={{ width: 56, flexShrink: 0, background: '#1a3a1a', borderLeft: `1px solid ${COLORS.border}`, position: 'relative' }}>
                    {myPlayers.map((p, pi) => p && (
                      <div key={pi} style={{
                        position: 'absolute',
                        left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                        transform: 'translate(-50%,-50%)',
                        width: 5, height: 5, borderRadius: '50%',
                        background: COLORS.danger,
                      }} />
                    ))}
                  </div>
                  {/* ⋮ menu */}
                  <div onClick={(e) => { e.stopPropagation(); setPointMenu({ id: pt.id, idx: idx + 1 }); }}
                    style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', color: COLORS.textMuted, fontSize: 18 }}>
                    ⋮
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {match?.status !== 'closed' && (
          <div style={{ position: 'sticky', bottom: 0, padding: `${SPACE.md}px ${R.layout.padding}px`, borderTop: `2px solid ${COLORS.accent}40`, background: COLORS.surface, display: 'flex', flexDirection: 'column', gap: SPACE.sm, zIndex: 20 }}>
            <Btn variant="accent" onClick={startNewPoint} style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: TOUCH.fontLg, fontWeight: 800 }}>
              <Icons.Plus /> ADD POINT
            </Btn>
            {isConcurrent && (
              <div onClick={() => {
                const otherSide = scoutingSide === 'home' ? 'away' : 'home';
                claimSide(otherSide);
                setViewMode('heatmap');
              }}
                style={{ textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, cursor: 'pointer', padding: 8 }}>
                Switch to {scoutingSide === 'home' ? (teamB?.name || 'Away') : (teamA?.name || 'Home')}
              </div>
            )}
          </div>
        )}

      <ConfirmModal {...deleteConfirm.modalProps(
        (id) => handleDeletePoint(id),
        { title: 'Delete point?', message: 'Match score will be recalculated. This cannot be undone.', confirmLabel: 'Delete' }
      )} />
      <ConfirmModal {...closeMatchConfirm.modalProps(
        async () => { await ds.updateMatch(tournamentId, matchId, { status: 'closed' }); },
        { title: 'End match', message: 'Mark this match as FINAL? No more points can be added.', confirmLabel: 'End match' }
      )} />
      <ConfirmModal {...clearAllConfirm.modalProps(
        async () => {
          for (const pt of points) await ds.deletePoint(tournamentId, matchId, pt.id);
          await ds.updateMatch(tournamentId, matchId, { scoreA: 0, scoreB: 0 });
          resetDraft();
        },
        { title: 'Clear all points?', message: `Delete all ${points.length} points from this match? This cannot be undone.`, confirmLabel: 'Clear all' }
      )} />
      <ActionSheet open={!!pointMenu} onClose={() => setPointMenu(null)} actions={[
        { label: 'Edit point', onPress: () => { const pt = points.find(p => p.id === pointMenu?.id); if (pt) editPoint(pt); } },
        { separator: true },
        { label: `Delete Point #${pointMenu?.idx}`, danger: true, onPress: () => deleteConfirm.ask(pointMenu?.id) },
      ]} />
      <ActionSheet open={matchMenuOpen} onClose={() => setMatchMenuOpen(false)} actions={[
        { label: 'End match (mark as FINAL)', onPress: () => closeMatchConfirm.ask(true) },
        ...(points.length > 0 ? [{ separator: true }, { label: 'Clear all points', danger: true, onPress: () => clearAllConfirm.ask(true) }] : []),
      ]} />
      </div>
    );
  }

  // ═══ EDITOR VIEW ═══
  return (
    <div style={{ height: '100dvh', maxWidth: isLandscape ? '100%' : (R.layout.maxWidth || 640), margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ═══ COMPACT HEADER ═══ */}
      {!isLandscape && (
      <PageHeader
        back={{ to: () => {
          if (points.length === 0 && !editingId) {
            const myScoutedId = scoutingSide === 'away' ? match?.teamB : match?.teamA;
            navigate(`/tournament/${tournamentId}/team/${myScoutedId}`);
          } else {
            setEditingId(null); setViewMode('heatmap');
            setToolbarPlayer(null); setShotMode(null);
          }
        }}}
        title={`Scouting ${(activeTeam === 'A' ? teamA : teamB)?.name || '?'}`}
        subtitle={`VS ${(activeTeam === 'A' ? teamB : teamA)?.name || '?'}${score ? ` · ${activeTeam === 'A' ? score.a : score.b}:${activeTeam === 'A' ? score.b : score.a}` : ''}${editingId ? ` · Pt ${points.findIndex(p => p.id === editingId) + 1}` : ''}`}
        badges={
          <span style={{
            fontFamily: FONT, fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: RADIUS.xs,
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
      )}
      {/* Landscape floating controls */}
      {isLandscape && (
        <div style={{ position: 'fixed', top: 12, left: 12, display: 'flex', gap: 8, zIndex: 50 }}>
          <Btn variant="default" size="sm" onClick={() => {
            if (points.length === 0 && !editingId) navigate(`/tournament/${tournamentId}`);
            else { setEditingId(null); setViewMode('heatmap'); setToolbarPlayer(null); setShotMode(null); }
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

        {/* Canvas */}
        <FieldCanvas fieldImage={field.fieldImage} viewportSide={fieldSide}
          maxCanvasHeight={typeof window !== 'undefined' ? (isLandscape ? window.innerHeight : window.innerHeight - 200) : 500}
          players={draft.players} shots={draft.shots} bumpStops={draft.bumps}
          eliminations={draft.elim} eliminationPositions={draft.elimPos}
          onPlacePlayer={handlePlacePlayer} onMovePlayer={handleMovePlayer}
          onPlaceShot={handlePlaceShot} onDeleteShot={handleDeleteShot}
          onBumpStop={handleBumpStop} onSelectPlayer={handleSelectPlayer}
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
          fieldCalibration={field.fieldCalibration} />

      </div>

      {/* ═══ ROSTER GRID ═══ */}
      {!isLandscape && rosterGridVisible && (
        <RosterGrid roster={roster} selected={onFieldRoster} onToggle={toggleRosterPlayer} />
      )}

      {/* ═══ BOTTOM BAR ═══ */}
      {!isLandscape && (() => {
        const oppColor = TEAM_COLORS[activeTeam === 'A' ? 'B' : 'A'];
        const oppName = (activeTeam === 'A' ? teamB : teamA)?.name || 'Other team';
        return (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px',
            background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          }}>
            <Btn variant="accent" style={{ width: '100%', padding: '14px 0', fontSize: FONT_SIZE.base, fontWeight: 700 }}
              onClick={() => setSaveSheetOpen(true)}>✓ Save point</Btn>
            {!isConcurrent && (
            <div onClick={() => {
              // Check concurrent scouting block
              const targetTeam = activeTeam === 'A' ? 'B' : 'A';
              const lastPt = points[points.length - 1];
              const targetData = targetTeam === 'A' ? (lastPt?.homeData || lastPt?.teamA) : (lastPt?.awayData || lastPt?.teamB);
              const scoutedBy = targetData?.scoutedBy;
              const myUid = auth.currentUser?.uid;
              if (scoutedBy && scoutedBy !== myUid) { setBlockedTeam(targetTeam); return; }
              setActiveTeam(targetTeam);
              changeFieldSide(s => s === 'left' ? 'right' : 'left');
              setToolbarPlayer(null); setShotMode(null); setSelPlayer(null);
              setRosterGridVisible(true);
            }} style={{
              width: '100%', padding: '14px 0', textAlign: 'center',
              fontSize: FONT_SIZE.base, fontWeight: 600, borderRadius: RADIUS.lg, cursor: 'pointer',
              border: `1px solid ${oppColor}30`, background: oppColor + '10', color: oppColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: FONT,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: oppColor }} />
              Scout {oppName}
            </div>
            )}
          </div>
        );
      })()}

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
        async () => { await ds.updateMatch(tournamentId, matchId, { status: 'closed' }); },
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
