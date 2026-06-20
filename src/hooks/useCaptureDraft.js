// useCaptureDraft — the shared capture brain extracted VERBATIM from MatchPage
// (Stage 1, TACTIC_AS_SCOUTED_POINT.md §0/§1). A pure MOVE, not a rewrite: the
// draft state atoms, the stage-aware routing seam, the factories, the capture
// handlers, the annotation seam, and undo. MatchPage destructures the return into
// the SAME variable names, so savePoint / SaveSheet / outcome / side-stamp /
// editPoint / resetDraft / render stay byte-identical and consume these unchanged.
//
// PARITY: tests/e2e/capture-parity.spec.js (golden-master) drives the real path
// through the emulator probe and asserts the draft tree byte-identical pre/post.
//
// STAGE-1 SCOPE (deliberate, conservative on the non-negotiable):
//   - `outcomeEnabled` is the one thin branch added now: it gates the result-side
//     toolbar items (Hit / Reason). Default `true` → point path identical (the
//     harness runs with the default, proving identity).
//   - `teams`/positional-phase parameterization + serialize/hydrate exports are
//     DEFERRED to Stage 2, where the tactic editor exercises them — adding
//     untested branches to the NXL-proven path now would itself risk parity.
//   - savePoint's makeTeamData/buildTimeline/tdToDraft stay in MatchPage verbatim
//     (the point does not consume an eng.serialize — §0 cut line).
import { useState, useMemo, useRef } from 'react';
import { COLORS } from '../utils/theme';
import { isReasonRadial } from '../utils/pointPhases';
import { STROKE_COLORS, STROKE_SIZES, eraseAcrossStrokes } from '../components/canvas/drawStrokes';
import { useUndo } from './useUndo';

export const E5 = () => [null, null, null, null, null];
export const E5A = () => [[], [], [], [], []];
export const E5B = () => [false, false, false, false, false];

export function emptyTeam() {
  // § Stage 2b — elimReasons: per-slot elimination reason code, set only for
  // Settle/Mid hits (Break = implicit, stays null). Additive to elim/elimPos.
  return { players: E5(), shots: E5A(), quickShots: E5A(), obstacleShots: E5A(), zoneShots: E5A(), zoneObstacleShots: E5A(), assign: E5(), bumps: E5(), elim: E5B(), elimPos: E5(), elimReasons: E5(), runners: E5B(), penalty: '' };
}

function mirrorX(p) { return p ? { ...p, x: 1 - p.x } : null; }

const ERASER_REF_W = 1000;
const ERASER_REF_H = 500;

export default function useCaptureDraft({
  onFieldRoster = [], lastAssignA, lastAssignB,
  setAssignTarget = () => {}, playerDeleteConfirm,
  outcome = null, setOutcome = () => {},
  // Stage-1 config (point-preserving defaults; non-default branches arrive Stage 2)
  target = 'point', teams = 'AB', outcomeEnabled = true,
} = {}) {
  void target; void teams; // reserved for Stage 2 (tactic: 'tactic'/'single')

  const [draftA, setDraftA] = useState(emptyTeam());
  const [draftB, setDraftB] = useState(emptyTeam());
  const [activeTeam, setActiveTeam] = useState('A');
  const [captureStage, setCaptureStage] = useState('break'); // 'break'|'settle'|'mid'|'endgame'
  const [stageDraftsA, setStageDraftsA] = useState({ settle: null, mid: null, endgame: null });
  const [stageDraftsB, setStageDraftsB] = useState({ settle: null, mid: null, endgame: null });
  const [stageAnnotations, setStageAnnotations] = useState({ settle: [], mid: [], endgame: [] });
  const [reasonMenu, setReasonMenu] = useState(null);
  const [selPlayer, setSelPlayer] = useState(null);
  const [mode, setMode] = useState('place');
  const [drawMode, setDrawMode] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [drawColor, setDrawColor] = useState(STROKE_COLORS[0].value);
  const [drawSizeKey, setDrawSizeKey] = useState('medium');
  const [eraserMode, setEraserMode] = useState(false);
  const [toolbarPlayer, setToolbarPlayer] = useState(null);
  const [shotMode, setShotMode] = useState(null);
  const [quickShotPlayer, setQuickShotPlayer] = useState(null); // idx of player in QuickShotPanel
  const undoStack = useUndo(10);

  // § Stage 2a — a fresh stage keyframe seeded from a base (carry positions +
  // assignments + runners; new shots / zones / bumps start empty for the stage).
  // § Stage 2b fix — elimination state PERSISTS across stages.
  const seedStageDraft = (base) => ({
    players: (base.players || E5()).map(p => (p ? { ...p } : null)),
    assign: [...(base.assign || E5())],
    runners: [...(base.runners || E5B())],
    elim: [...(base.elim || E5B())],
    elimPos: [...(base.elimPos || E5())],
    elimReasons: [...(base.elimReasons || E5())],
    shots: E5A(), quickShots: E5A(), obstacleShots: E5A(),
    zoneShots: E5A(), zoneObstacleShots: E5A(),
    bumps: E5(), penalty: '',
  });
  // Stage-aware draft routing — break is byte-identical to the prior code;
  // settle/mid route to the per-side stage keyframe so the canvas + all handlers
  // (which go through draft/setDraft) operate on that stage with no per-handler change.
  const breakSetDraft = activeTeam === 'A' ? setDraftA : setDraftB;
  const stageDrafts = activeTeam === 'A' ? stageDraftsA : stageDraftsB;
  const setStageDrafts = activeTeam === 'A' ? setStageDraftsA : setStageDraftsB;
  const breakDraft = activeTeam === 'A' ? draftA : draftB;
  const draft = captureStage === 'break' ? breakDraft : (stageDrafts[captureStage] || breakDraft);
  const setDraft = captureStage === 'break'
    ? breakSetDraft
    : (updater) => setStageDrafts(prev => {
        const cur = prev[captureStage] || seedStageDraft(breakDraft);
        const next = typeof updater === 'function' ? updater(cur) : updater;
        return { ...prev, [captureStage]: next };
      });
  // Per-stage drawings: break = top-level `annotations`; settle/mid = stageAnnotations[stage].
  const activeAnnotations = captureStage === 'break' ? annotations : (stageAnnotations[captureStage] || []);
  const setActiveAnnotations = captureStage === 'break'
    ? setAnnotations
    : (updater) => setStageAnnotations(prev => ({
        ...prev,
        [captureStage]: typeof updater === 'function' ? updater(prev[captureStage] || []) : updater,
      }));
  const switchStage = (next) => {
    if (next !== 'break') {
      const priorBase = (drafts, fallback) =>
        next === 'endgame' ? (drafts.mid || drafts.settle || fallback)
        : next === 'mid' ? (drafts.settle || fallback)
        : fallback;
      const baseA = priorBase(stageDraftsA, draftA);
      const baseB = priorBase(stageDraftsB, draftB);
      if (!stageDraftsA[next]) setStageDraftsA(prev => ({ ...prev, [next]: seedStageDraft(baseA) }));
      if (!stageDraftsB[next]) setStageDraftsB(prev => ({ ...prev, [next]: seedStageDraft(baseB) }));
    }
    setCaptureStage(next);
    setSelPlayer(null); setQuickShotPlayer(null); setToolbarPlayer(null); setRedoStack([]); setReasonMenu(null);
  };
  const stageHasData = (drafts, anns) => !!(drafts?.players?.some(Boolean) || anns?.length);
  const stageDone = {
    break: draftA.players.some(Boolean) || draftB.players.some(Boolean),
    settle: stageHasData(stageDraftsA.settle, stageAnnotations.settle) || stageHasData(stageDraftsB.settle, stageAnnotations.settle),
    mid: stageHasData(stageDraftsA.mid, stageAnnotations.mid) || stageHasData(stageDraftsB.mid, stageAnnotations.mid),
    endgame: stageHasData(stageDraftsA.endgame, stageAnnotations.endgame) || stageHasData(stageDraftsB.endgame, stageAnnotations.endgame),
  };

  // Mirrored opponent for canvas overlay
  const mirroredOpp = useMemo(() => {
    const src = activeTeam === 'A' ? draftB : draftA;
    return src.players.map(p => p ? mirrorX(p) : null);
  }, [activeTeam, draftA.players, draftB.players]);
  const mirroredOppElim = useMemo(() => {
    return (activeTeam === 'A' ? draftB : draftA).elim || E5B();
  }, [activeTeam, draftA.elim, draftB.elim]);

  const toolbarItems = useMemo(() => {
    if (toolbarPlayer === null) return [];
    const isElim = draft.elim[toolbarPlayer];
    const isRunner = draft.runners?.[toolbarPlayer];
    const isLate = !!draft.bumps?.[toolbarPlayer];
    return [
      { icon: '👤', label: 'Assign', color: COLORS.accent, action: 'assign' },
      // § outcomeEnabled — result-side (Hit) is omitted for outcome-less capture
      // (tactic, Stage 2). Default true → point toolbar identical.
      ...(outcomeEnabled ? [{ icon: isElim ? '❤️' : '💀', label: isElim ? 'Alive' : 'Hit', color: COLORS.danger, action: 'hit' }] : []),
      { icon: isRunner ? '🔫' : '🏃', label: isRunner ? 'Gun up' : 'Runner', color: isRunner ? COLORS.info : COLORS.textDim, action: 'runner' },
      { icon: '⏱', label: isLate ? 'Bumped' : 'Bump', color: isLate ? COLORS.accent : COLORS.textDim, action: 'late' },
      { icon: '🎯', label: 'Shot', color: COLORS.textDim, action: 'shoot' },
      // § Stage 2b — re-open the radial reason menu for an already-eliminated
      // player in Settle/Mid (Break has no reason).
      ...(outcomeEnabled && isElim && isReasonRadial(captureStage) ? [{ icon: '🏷️', label: 'Reason', color: COLORS.danger, action: 'reason' }] : []),
      { icon: '✕', label: 'Del', color: COLORS.textMuted, action: 'remove' },
    ];
  }, [toolbarPlayer, draft.elim, draft.runners, draft.bumps, captureStage, outcomeEnabled]);

  // Undo: snapshot before each mutation (deep-cloned to detach from live state).
  const pushUndo = () => undoStack.push({
    draftA: JSON.parse(JSON.stringify(draftA)), draftB: JSON.parse(JSON.stringify(draftB)),
    stageDraftsA: JSON.parse(JSON.stringify(stageDraftsA)), stageDraftsB: JSON.parse(JSON.stringify(stageDraftsB)),
    selPlayer, outcome,
  });
  const handleUndo = () => {
    const prev = undoStack.undo();
    if (!prev) return;
    setDraftA(prev.draftA); setDraftB(prev.draftB);
    if (prev.stageDraftsA) setStageDraftsA(prev.stageDraftsA);
    if (prev.stageDraftsB) setStageDraftsB(prev.stageDraftsB);
    setSelPlayer(prev.selPlayer); setOutcome(prev.outcome);
  };

  const handleToolbarAction = (action, idx) => {
    if (action === 'close') { setToolbarPlayer(null); return; }
    if (action === 'hit') { toggleElim(idx); setToolbarPlayer(null); }
    // § Stage 2b — re-open the radial reason menu for an eliminated player (Settle/Mid).
    if (action === 'reason') {
      const pos = draft.players[idx];
      if (pos) setReasonMenu({ slot: idx, pos });
      setToolbarPlayer(null);
      return;
    }
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

  // QuickShotPanel handlers — § 101 unification: shots write to the ACTIVE STAGE's
  // quick/zone fields via setDraft. `obstacle*` fields are legacy-read-only.
  const handleToggleQuickZone = (zone, kind = 'band') => {
    if (quickShotPlayer == null) return;
    const field = kind === 'callout' ? 'zoneShots' : 'quickShots';
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
  const handleMovePlayer = (idx, pos) => { pushUndo(); setDraft(prev => { const n = { ...prev, players: [...prev.players] }; n.players[idx] = pos; return n; }); };
  const removePlayer = (idx) => { pushUndo();
    setDraft(prev => ({ ...prev, players: prev.players.map((p,i)=>i===idx?null:p), shots: prev.shots.map((s,i)=>i===idx?[]:[...s]), bumps: prev.bumps.map((b,i)=>i===idx?null:b), elim: prev.elim.map((e,i)=>i===idx?false:e), elimPos: prev.elimPos.map((e,i)=>i===idx?null:e), assign: prev.assign.map((a,i)=>i===idx?null:a) }));
    setSelPlayer(null);
  };
  const handlePlaceShot = (pi, pos) => { pushUndo(); setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].push(pos); return n; }); };
  const handleDeleteShot = (pi, si) => { pushUndo(); setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].splice(si,1); return n; }); };
  // Bump is now handled by drag on canvas (onBumpPlayer prop)
  const handleBumpStop = () => {}; // no-op — kept for FieldCanvas prop compatibility

  // § 77 Draw Stage 1 — onDraw* handlers. Write to the ACTIVE stage's layer.
  const handleDrawStart = (pos) => {
    if (eraserMode) {
      const radiusPx = STROKE_SIZES[drawSizeKey] * 2;
      setActiveAnnotations(prev => eraseAcrossStrokes(prev, pos, radiusPx, ERASER_REF_W, ERASER_REF_H));
      setRedoStack([]);
      return;
    }
    setCurrentStroke({ color: drawColor, size: STROKE_SIZES[drawSizeKey], pts: [pos] });
  };
  const handleDrawMove = (pos) => {
    if (eraserMode) {
      const radiusPx = STROKE_SIZES[drawSizeKey] * 2;
      setActiveAnnotations(prev => eraseAcrossStrokes(prev, pos, radiusPx, ERASER_REF_W, ERASER_REF_H));
      return;
    }
    setCurrentStroke(prev => (prev ? { ...prev, pts: [...prev.pts, pos] } : prev));
  };
  const handleDrawEnd = () => {
    if (eraserMode) return;
    setCurrentStroke(prev => {
      if (!prev || prev.pts.length < 2) return null;
      setActiveAnnotations(p => [...p, prev]);
      setRedoStack([]);
      return null;
    });
  };
  const handleDrawAbort = () => { setCurrentStroke(null); };
  const handleDrawUndo = () => {
    setActiveAnnotations(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack(r => [...r, last]);
      return prev.slice(0, -1);
    });
  };
  const handleDrawRedo = () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setActiveAnnotations(a => [...a, last]);
      return prev.slice(0, -1);
    });
  };
  const handleDrawClear = () => {
    setActiveAnnotations([]);
    setRedoStack([]);
  };
  const enterDrawMode = () => {
    setToolbarPlayer(null);
    setQuickShotPlayer(null);
    setShotMode(null);
    setSelPlayer(null);
    setEraserMode(false);
    setCurrentStroke(null);
    setDrawMode(true);
  };
  const exitDrawMode = () => {
    setCurrentStroke(null);
    setEraserMode(false);
    setDrawMode(false);
  };
  const toggleElim = (idx) => {
    pushUndo();
    const willBeElim = !draft.elim[idx];
    setDraft(prev => {
      const n = { ...prev, elim: [...prev.elim] };
      n.elim[idx] = !n.elim[idx];
      // § Stage 2b — un-marking a hit clears its reason.
      if (!willBeElim) { n.elimReasons = [...(prev.elimReasons || E5())]; n.elimReasons[idx] = null; }
      return n;
    });
    // § Stage 2b — tagging a hit in Settle/Mid blooms the radial reason menu.
    if (willBeElim && isReasonRadial(captureStage)) {
      const pos = draft.players[idx];
      if (pos) setReasonMenu({ slot: idx, pos });
    }
  };
  const setElimReason = (idx, reason) => {
    setDraft(prev => { const n = { ...prev, elimReasons: [...(prev.elimReasons || E5())] }; n.elimReasons[idx] = reason; return n; });
    setReasonMenu(null);
  };

  return {
    // state
    draftA, setDraftA, draftB, setDraftB, activeTeam, setActiveTeam,
    captureStage, setCaptureStage, stageDraftsA, setStageDraftsA, stageDraftsB, setStageDraftsB,
    stageAnnotations, setStageAnnotations, reasonMenu, setReasonMenu,
    selPlayer, setSelPlayer, mode, setMode,
    drawMode, setDrawMode, annotations, setAnnotations, redoStack, setRedoStack,
    currentStroke, setCurrentStroke, drawColor, setDrawColor, drawSizeKey, setDrawSizeKey,
    eraserMode, setEraserMode, toolbarPlayer, setToolbarPlayer, shotMode, setShotMode,
    quickShotPlayer, setQuickShotPlayer, undoStack,
    // seam + derived
    draft, setDraft, activeAnnotations, setActiveAnnotations, breakDraft,
    switchStage, stageDone, mirroredOpp, mirroredOppElim, toolbarItems,
    // factories (also exported at module scope for savePoint/reset use)
    seedStageDraft,
    // handlers
    pushUndo, handleUndo, handleToolbarAction, handleToggleQuickZone, handleQuickShotPrecise,
    handleSelectPlayer, handlePlacePlayer, handleMovePlayer, removePlayer, handlePlaceShot,
    handleDeleteShot, handleBumpStop, handleDrawStart, handleDrawMove, handleDrawEnd, handleDrawAbort,
    handleDrawUndo, handleDrawRedo, handleDrawClear, enterDrawMode, exitDrawMode, toggleElim, setElimReason,
  };
}
