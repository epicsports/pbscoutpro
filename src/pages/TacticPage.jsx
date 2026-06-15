/**
 * TacticPage — scouting-style tactic editor
 * Routes: /layout/:layoutId/tactic/:tacticId
 *         /tournament/:tournamentId/tactic/:tacticId
 *
 * Same interaction model as MatchPage scouting editor:
 * full-height canvas, floating toolbar on player tap, drag-to-bump, ShotDrawer.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';

import InteractiveCanvas from '../components/canvas/InteractiveCanvas';
import FullscreenToggle from '../components/canvas/FullscreenToggle';
import { useLandscapeMode } from '../hooks/useLandscapeMode';
import ShotDrawer from '../components/ShotDrawer';
import QuickShotPanel from '../components/QuickShotPanel';
import PageHeader from '../components/PageHeader';
import { Btn, Modal, Input, Icons, ActionSheet, MoreBtn, ConfirmModal, EmptyState } from '../components/ui';
import { useLayouts, useLayoutTactics, useTournaments, useTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, SPACE, responsive } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
// § 64 / § 77 canonical drawing stack — the same components ScoutedTeamPage +
// MatchPage use. TacticPage was the last bespoke-freehand holdout (ITEM-1 unify).
import DrawingOverlay from '../components/canvas/DrawingOverlay';
import DrawToolbar from '../components/canvas/DrawToolbar';
import { STROKE_COLORS, STROKE_SIZES, strokesToFirestore, eraseAcrossStrokes } from '../components/canvas/drawStrokes';

// Normalize freehandStrokes from any stored shape to the canonical
// { color, size, pts:[{x,y}] }. Handles the LEGACY points-only shape
// (bare `[{x,y},...]` arrays, or `{"0":[...]}`) the bespoke tool wrote — wraps
// them in amber/medium so existing tactic drawings survive the unify (the
// discovery's "defaults amber/width when absent"). Drops <2-point strokes.
function normalizeFreehandStrokes(raw) {
  if (!raw) return [];
  const values = Array.isArray(raw)
    ? raw
    : (typeof raw === 'object'
        ? Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map(k => raw[k])
        : []);
  return values
    .map((v) => {
      if (v && Array.isArray(v.pts)) return v; // already canonical
      // legacy points-only → amber + THIN (3px) to match the old bespoke
      // lineWidth=3, so existing drawings keep their weight under the new renderer.
      if (Array.isArray(v)) return { color: STROKE_COLORS[0].value, size: STROKE_SIZES.thin, pts: v };
      return null;
    })
    .filter(s => s && Array.isArray(s.pts) && s.pts.length >= 2);
}

export default function TacticPage() {
  const { t } = useLanguage();
  const { tournamentId, layoutId: paramLayoutId, tacticId } = useParams();
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);

  // Determine if layout-mode or tournament-mode
  const isLayoutMode = !!paramLayoutId;
  const { layouts } = useLayouts();
  const { tournaments } = useTournaments();
  const tournament = tournamentId ? tournaments.find(t => t.id === tournamentId) : null;
  const layoutId = paramLayoutId || tournament?.layoutId;
  const layout = layouts.find(l => l.id === layoutId);

  // Tactics — from layout or tournament
  const { tactics: layoutTactics, loading: layoutTacticsLoading } = useLayoutTactics(isLayoutMode ? layoutId : null);
  const { tactics: tournamentTactics, loading: tournamentTacticsLoading } = useTactics(isLayoutMode ? null : tournamentId);
  const tactics = isLayoutMode ? layoutTactics : tournamentTactics;
  const tactic = tactics.find(t => t.id === tacticId);
  const tacticsLoading = isLayoutMode ? layoutTacticsLoading : tournamentTacticsLoading;
  // No-eternal-loading guard (arc B rollout of the ScoutedTeamPage pattern).
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => {
    if (tactic) { setLoadTimedOut(false); return undefined; }
    const id = setTimeout(() => setLoadTimedOut(true), 12000);
    return () => clearTimeout(id);
  }, [tactic]);

  // Field data from layout
  const field = {
    fieldImage: layout?.fieldImage,
    bunkers: layout?.bunkers || [],
    fieldCalibration: layout?.fieldCalibration || null,
  };

  // ── State ──
  const [players, setPlayers] = useState([null, null, null, null, null]);
  const [shots, setShots] = useState([[], [], [], [], []]);
  const [bumpShots, setBumpShots] = useState([[], [], [], [], []]);
  const [bumps, setBumps] = useState([null, null, null, null, null]);
  const [runners, setRunners] = useState([false, false, false, false, false]);
  const [quickShots, setQuickShots] = useState([[], [], [], [], []]);
  const [obstacleShots, setObstacleShots] = useState([[], [], [], [], []]);

  const [selPlayer, setSelPlayer] = useState(null);
  const [toolbarPlayer, setToolbarPlayer] = useState(null);
  const [shotMode, setShotMode] = useState(null);
  const [quickShotPlayer, setQuickShotPlayer] = useState(null);
  const [shotFromBump, setShotFromBump] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [freehandStrokes, setFreehandStrokes] = useState([]);
  // Shared-stack draw state (mirrors ScoutedTeamPage's coach-plan): in-progress
  // stroke + redo stack + the toolbar's color / size / eraser selection.
  const [freehandCurrent, setFreehandCurrent] = useState(null);
  const [freehandRedo, setFreehandRedo] = useState([]);
  const [drawColor, setDrawColor] = useState(STROKE_COLORS[0].value);
  const [drawSizeKey, setDrawSizeKey] = useState('medium');
  const [drawEraser, setDrawEraser] = useState(false);

  // ── Load from Firestore (handles old steps[] and new flat format) ──
  useEffect(() => {
    if (!tactic) return;
    // New format: flat players/shots/bumps
    if (tactic.players) {
      setPlayers(Array.isArray(tactic.players) ? tactic.players : [null, null, null, null, null]);
      const rawShots = tactic.shots || [[], [], [], [], []];
      setShots(Array.isArray(rawShots)
        ? rawShots.map(s => Array.isArray(s) ? s : Object.values(s || {}))
        : [0, 1, 2, 3, 4].map(i => {
            const v = rawShots[String(i)]; return Array.isArray(v) ? v : [];
          })
      );
      setBumps(tactic.bumps || [null, null, null, null, null]);
      setRunners(tactic.runners || [false, false, false, false, false]);
      const rawBumpShots = tactic.bumpShots || [[], [], [], [], []];
      setBumpShots(Array.isArray(rawBumpShots)
        ? rawBumpShots.map(sh => Array.isArray(sh) ? sh : Object.values(sh || {}))
        : [0,1,2,3,4].map(i => { const v = rawBumpShots[String(i)]; return Array.isArray(v) ? v : []; })
      );
      setQuickShots(ds.quickShotsFromFirestore(tactic.quickShots));
      setObstacleShots(ds.quickShotsFromFirestore(tactic.obstacleShots));
    }
    // Old format: steps[0]
    else if (tactic.steps?.[0]) {
      const s = tactic.steps[0];
      setPlayers(Array.isArray(s.players) ? s.players : [null, null, null, null, null]);
      const rawShots = s.shots || [[], [], [], [], []];
      setShots(Array.isArray(rawShots)
        ? rawShots.map(sh => Array.isArray(sh) ? sh : Object.values(sh || {}))
        : [0, 1, 2, 3, 4].map(i => {
            const v = rawShots[String(i)]; return Array.isArray(v) ? v : [];
          })
      );
      setBumps(Array.isArray(s.bumps) ? s.bumps : [null, null, null, null, null]);
      setRunners(Array.isArray(s.runners) ? s.runners : [false, false, false, false, false]);
      setQuickShots(ds.quickShotsFromFirestore(s.quickShots));
      setObstacleShots(ds.quickShotsFromFirestore(s.obstacleShots));
    }
    setNewName(tactic.name || '');
    // Freehand strokes → canonical { color, size, pts } (legacy points-only wrapped).
    setFreehandStrokes(normalizeFreehandStrokes(tactic.freehandStrokes));
    setFreehandRedo([]);
    setFreehandCurrent(null);
    setLoaded(true);
  }, [tactic?.id]);

  // ── Dirty check ──
  const isDirty = useMemo(() => {
    if (!tactic || !loaded) return false;
    const origPlayers = tactic.players || tactic.steps?.[0]?.players || [null, null, null, null, null];
    const origShots = tactic.shots || tactic.steps?.[0]?.shots || [[], [], [], [], []];
    const origBumps = tactic.bumps || tactic.steps?.[0]?.bumps || [null, null, null, null, null];
    const origBumpShots = tactic.bumpShots || [[], [], [], [], []];
    const origRunners = tactic.runners || [false, false, false, false, false];
    const origStrokes = normalizeFreehandStrokes(tactic.freehandStrokes);
    const origQuickShots = ds.quickShotsFromFirestore(tactic.quickShots ?? tactic.steps?.[0]?.quickShots);
    const origObstacleShots = ds.quickShotsFromFirestore(tactic.obstacleShots ?? tactic.steps?.[0]?.obstacleShots);
    return JSON.stringify(players) !== JSON.stringify(origPlayers)
      || JSON.stringify(shots) !== JSON.stringify(origShots)
      || JSON.stringify(bumpShots) !== JSON.stringify(origBumpShots)
      || JSON.stringify(bumps) !== JSON.stringify(origBumps)
      || JSON.stringify(runners) !== JSON.stringify(origRunners)
      || JSON.stringify(quickShots) !== JSON.stringify(origQuickShots)
      || JSON.stringify(obstacleShots) !== JSON.stringify(origObstacleShots)
      || JSON.stringify(freehandStrokes) !== JSON.stringify(origStrokes);
  }, [players, shots, bumpShots, bumps, runners, quickShots, obstacleShots, freehandStrokes, tactic, loaded]);

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      // Canonical { color, size, pts } → Firestore (no nested arrays, § 9).
      const data = { players, shots: ds.shotsToFirestore(shots), bumpShots: ds.shotsToFirestore(bumpShots), bumps, runners, quickShots: ds.quickShotsToFirestore(quickShots), obstacleShots: ds.quickShotsToFirestore(obstacleShots), freehandStrokes: strokesToFirestore(freehandStrokes) };
      if (isLayoutMode) {
        await ds.updateLayoutTactic(layoutId, tacticId, data);
      } else {
        await ds.updateTactic(tournamentId, tacticId, data);
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      console.error('Save error:', e);
      alert('Save failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // ── Freehand draw handlers (shared DrawingOverlay stack via InteractiveCanvas's
  //    BaseCanvas draw-arbiter — 1-finger draw / 2-finger zoom). `pos` is a 0..1
  //    field coord. Eraser radius / dims mirror ScoutedTeamPage's coach plan. ──
  const handleDrawStart = (pos) => {
    if (drawEraser) {
      setFreehandStrokes(prev => eraseAcrossStrokes(prev, pos, STROKE_SIZES[drawSizeKey] * 2, 1000, 500));
      setFreehandRedo([]);
      return;
    }
    setFreehandCurrent({ color: drawColor, size: STROKE_SIZES[drawSizeKey], pts: [pos] });
  };
  const handleDrawMove = (pos) => {
    if (drawEraser) {
      setFreehandStrokes(prev => eraseAcrossStrokes(prev, pos, STROKE_SIZES[drawSizeKey] * 2, 1000, 500));
      return;
    }
    setFreehandCurrent(prev => (prev ? { ...prev, pts: [...prev.pts, pos] } : prev));
  };
  const handleDrawEnd = () => {
    if (drawEraser) return;
    setFreehandCurrent(prev => {
      if (!prev || prev.pts.length < 2) return null;
      setFreehandStrokes(p => [...p, prev]);
      setFreehandRedo([]);
      return null;
    });
  };
  const handleDrawAbort = () => setFreehandCurrent(null);
  const handleDrawUndo = () => setFreehandStrokes(prev => {
    if (prev.length === 0) return prev;
    const last = prev[prev.length - 1];
    setFreehandRedo(r => [...r, last]);
    return prev.slice(0, -1);
  });
  const handleDrawRedo = () => setFreehandRedo(prev => {
    if (prev.length === 0) return prev;
    const last = prev[prev.length - 1];
    setFreehandStrokes(s => [...s, last]);
    return prev.slice(0, -1);
  });
  const handleDrawClear = () => { setFreehandStrokes([]); setFreehandRedo([]); };
  const exitDrawMode = () => { setFreehandCurrent(null); setDrawEraser(false); setDrawMode(false); };

  // ── Rename ──
  const handleRename = async () => {
    if (!newName.trim()) return;
    if (isLayoutMode) {
      await ds.updateLayoutTactic(layoutId, tacticId, { name: newName.trim() });
    } else {
      await ds.updateTactic(tournamentId, tacticId, { name: newName.trim() });
    }
    setRenameModal(false);
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (isLayoutMode) {
      await ds.deleteLayoutTactic(layoutId, tacticId);
      navigate(`/layout/${layoutId}`);
    } else {
      await ds.deleteTactic(tournamentId, tacticId);
      navigate('/');
    }
  };

  // ── Toolbar items — only Shot + Del ──
  const toolbarItems = useMemo(() => {
    if (toolbarPlayer === null) return [];
    const isRunner = runners[toolbarPlayer];
    const hasBump = bumps[toolbarPlayer];
    const curCurve = hasBump?.curve ?? 0.15;
    const items = [
      { icon: '🎯', label: 'Shot 1st', color: COLORS.textDim, action: 'shoot' },
      { icon: isRunner ? '●' : '▲', label: isRunner ? 'Gun up' : 'Runner', color: isRunner ? COLORS.accent : COLORS.success, action: 'toggleRunner' },
    ];
    if (hasBump) {
      items.splice(1, 0, { icon: '🎯', label: 'Shot 2nd', color: COLORS.bumpStop, action: 'shootBump' });
      const curveLabel = curCurve === 0 ? 'Straight' : curCurve > 0 ? 'Arc ↶' : 'Arc ↷';
      items.push({ icon: '⌒', label: curveLabel, color: COLORS.bumpStop, action: 'cycleCurve' });
      items.push({ icon: '↩', label: 'Clear 2nd', color: COLORS.accent, action: 'clearBump' });
    }
    items.push({ icon: '✕', label: 'Del', color: COLORS.textMuted, action: 'remove' });
    return items;
  }, [toolbarPlayer, bumps, runners]);

  const handleToolbarAction = (action, idx) => {
    if (action === 'close') { setToolbarPlayer(null); return; }
    if (action === 'shoot') { setQuickShotPlayer(idx); setSelPlayer(idx); setToolbarPlayer(null); }
    if (action === 'shootBump') { setShotMode(idx); setShotFromBump(true); setToolbarPlayer(null); }
    if (action === 'toggleRunner') { setRunners(prev => { const n = [...prev]; n[idx] = !n[idx]; return n; }); setToolbarPlayer(null); }
    if (action === 'cycleCurve') {
      setBumps(prev => {
        const n = [...prev]; if (!n[idx]) return n;
        const cur = n[idx].curve ?? 0.15;
        const steps = [0.15, -0.15, 0.3, -0.3, 0];
        const next = steps[(steps.indexOf(cur) + 1) % steps.length] || steps[0];
        n[idx] = { ...n[idx], curve: next };
        return n;
      });
    }
    if (action === 'clearBump') { setBumps(prev => { const n = [...prev]; n[idx] = null; return n; }); setToolbarPlayer(null); }
    if (action === 'remove') { removePlayer(idx); setToolbarPlayer(null); setSelPlayer(null); }
  };

  const handleSelectPlayer = (idx) => {
    if (quickShotPlayer != null && idx !== quickShotPlayer) setQuickShotPlayer(null);
    setSelPlayer(idx);
    setToolbarPlayer(toolbarPlayer === idx ? null : idx);
  };

  // QuickShotPanel handlers
  const handleToggleQuickZone = (zone, phase = 'break') => {
    if (quickShotPlayer == null) return;
    const setter = phase === 'obstacle' ? setObstacleShots : setQuickShots;
    setter(prev => {
      const cur = (prev[quickShotPlayer] || []);
      const updated = cur.includes(zone) ? cur.filter(z => z !== zone) : [...cur, zone];
      const next = prev.map(a => [...(a || [])]);
      next[quickShotPlayer] = updated;
      return next;
    });
  };
  const handleQuickShotPrecise = () => {
    const idx = quickShotPlayer;
    setQuickShotPlayer(null);
    if (idx != null) { setShotMode(idx); setShotFromBump(false); }
  };

  // ── Player handlers ──
  const handlePlacePlayer = (pos) => {
    // If a player is selected AND that player exists → set second position (bump)
    if (selPlayer !== null && players[selPlayer]) {
      setBumps(prev => { const n = [...prev]; n[selPlayer] = { ...pos, curve: 0.15 }; return n; });
      setSelPlayer(null);
      return;
    }
    // Otherwise place new player
    setPlayers(prev => {
      const next = [...prev];
      const idx = next.findIndex(p => p === null);
      if (idx >= 0) { next[idx] = pos; setSelPlayer(idx); }
      return next;
    });
  };

  const handleMovePlayer = (idx, pos) => {
    setPlayers(prev => { const n = [...prev]; n[idx] = pos; return n; });
  };

  const handleBumpPlayer = (idx, fromPos) => {
    // For tactics: player = start position, bump = destination
    // fromPos = where player was before drag, players[idx] = where dragged to
    const dest = players[idx];
    if (dest) {
      setBumps(prev => { const n = [...prev]; n[idx] = { x: dest.x, y: dest.y, curve: 0.15 }; return n; });
      setPlayers(prev => { const n = [...prev]; n[idx] = { x: fromPos.x, y: fromPos.y }; return n; });
    }
  };

  const removePlayer = (idx) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? null : p));
    setShots(prev => prev.map((s, i) => i === idx ? [] : s));
    setBumpShots(prev => prev.map((s, i) => i === idx ? [] : s));
    setBumps(prev => prev.map((b, i) => i === idx ? null : b));
    setRunners(prev => prev.map((r, i) => i === idx ? false : r));
    setQuickShots(prev => prev.map((z, i) => i === idx ? [] : z));
    setObstacleShots(prev => prev.map((z, i) => i === idx ? [] : z));
    setSelPlayer(null);
  };

  // ── Shot handlers ──
  const handlePlaceShot = (pi, pos) => {
    if (shotFromBump) {
      setBumpShots(prev => { const n = prev.map(a => [...a]); n[pi].push(pos); return n; });
    } else {
      setShots(prev => { const n = prev.map(a => [...a]); n[pi].push(pos); return n; });
    }
  };

  const handleDeleteShot = (pi, si) => {
    if (shotFromBump) {
      setBumpShots(prev => { const n = prev.map(a => [...a]); n[pi].splice(si, 1); return n; });
    } else {
      setShots(prev => { const n = prev.map(a => [...a]); n[pi].splice(si, 1); return n; });
    }
  };

  // ── Navigation ──
  const backTo = isLayoutMode ? `/layout/${layoutId}` : '/';
  const backLabel = isLayoutMode ? t('tactic_back_layout') : t('tactic_back_home');

  // ── Auto-print when ?print=1 ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('print') === '1' && tactic) {
      setTimeout(() => window.print(), 500);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [tactic?.id]);

  // § 76 hotfix — same conditional-hook problem as LayoutDetailPage: this
  // hook MUST live ABOVE the `if (!tactic) return ...` short-circuit (was
  // at L408 previously). Moving the hook up keeps it unconditional across
  // renders; values are still read after the conditional return as before.
  // `immersive` unifies landscape + portrait-FS for chrome-hide/fit;
  // `isLandscape` kept for FullscreenToggle visibility gate only.
  const isLandscape = device.isLandscape && !device.isDesktop;
  const { canvasMaxHeight, fsActive, immersive, setFullscreen } = useLandscapeMode();

  if (!tactic) {
    // No-eternal-loading (arc B): bounded wait → explicit error state with
    // Retry, never an eternal spinner on a deleted/invalid tactic URL.
    const stillLoading = tacticsLoading && !loadTimedOut;
    if (stillLoading) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: FONT, color: COLORS.textMuted }}>{t('tactic_loading')}</div>
        </div>
      );
    }
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon="⚠️"
          text={t('tactic_not_found')}
          subtitle={t('tactic_not_found_sub')}
        />
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Btn variant="accent" onClick={() => { setLoadTimedOut(false); navigate(0); }}>{t('match_retry')}</Btn>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="tactic-loaded" style={{
      height: '100dvh', maxWidth: immersive ? '100%' : (R.layout.maxWidth || 640), margin: '0 auto',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ═══ HEADER (hidden when immersive — landscape or portrait-FS) ═══ */}
      {!immersive && (
        <div className="no-print">
          <PageHeader
            back={{ to: backTo }}
            title={tactic.name || 'Tactic'}
            subtitle={(layout?.name || backLabel).toUpperCase()}
            action={<MoreBtn onClick={() => setMenuOpen(true)} />}
          />
        </div>
      )}

      {/* Print title (hidden in normal view) */}
      <div className="print-title" style={{ display: 'none' }}>
        {tactic.name}
      </div>

      {/* ═══ CANVAS ═══ */}
      <div className="print-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <FullscreenToggle fsActive={fsActive} onToggle={() => setFullscreen(!fsActive)} isLandscape={isLandscape} />
        <InteractiveCanvas
          fieldImage={field.fieldImage}
          maxCanvasHeight={canvasMaxHeight(0, 200)}
          players={players}
          shots={shots}
          bumpShots={bumpShots}
          bumpStops={bumps}
          eliminations={[false, false, false, false, false]}
          eliminationPositions={[null, null, null, null, null]}
          runners={runners}
          quickShots={quickShots}
          obstacleShots={obstacleShots}
          doritoSide={layout?.doritoSide || 'top'}
          onPlacePlayer={drawMode ? undefined : handlePlacePlayer}
          onMovePlayer={drawMode ? undefined : handleMovePlayer}
          onPlaceShot={drawMode ? undefined : handlePlaceShot}
          onDeleteShot={drawMode ? undefined : handleDeleteShot}
          onBumpPlayer={drawMode ? undefined : handleBumpPlayer}
          onSelectPlayer={drawMode ? undefined : handleSelectPlayer}
          onMoveBumpStop={drawMode ? undefined : ((idx, pos) => {
            setBumps(prev => { const n = [...prev]; if (n[idx]) n[idx] = { ...n[idx], x: pos.x, y: pos.y }; return n; });
          })}
          editable={!drawMode}
          selectedPlayer={drawMode ? null : selPlayer}
          mode={shotMode !== null ? 'shoot' : 'place'}
          toolbarPlayer={toolbarPlayer}
          toolbarItems={toolbarItems}
          onToolbarAction={handleToolbarAction}
          bunkers={field.bunkers}
          showBunkers={false}
          fieldCalibration={field.fieldCalibration}
          discoLine={0}
          zeekerLine={0}
          drawMode={drawMode}
          onDrawStart={handleDrawStart}
          onDrawMove={handleDrawMove}
          onDrawEnd={handleDrawEnd}
          onDrawAbort={handleDrawAbort}
        >
          {/* Canonical freehand layer — renders inside the BaseCanvas frame
              (zoom/pan aware) only while drawing; saved strokes paint via the
              field render path on load. */}
          {drawMode && <DrawingOverlay strokes={freehandStrokes} currentStroke={freehandCurrent} />}
        </InteractiveCanvas>
        {/* Freehand toolbar (shared) — floats over the canvas while drawing.
            colors / sizes / eraser / undo-redo / clear; Done exits draw mode (the
            tactic Save button persists the strokes with everything else). */}
        {drawMode && (
          <DrawToolbar
            color={drawColor}
            onColorChange={setDrawColor}
            sizeKey={drawSizeKey}
            onSizeChange={setDrawSizeKey}
            eraserActive={drawEraser}
            onEraserToggle={setDrawEraser}
            canUndo={freehandStrokes.length > 0}
            canRedo={freehandRedo.length > 0}
            hasStrokes={freehandStrokes.length > 0}
            onUndo={handleDrawUndo}
            onRedo={handleDrawRedo}
            onClear={handleDrawClear}
            onDone={exitDrawMode}
          />
        )}
        <QuickShotPanel
          visible={quickShotPlayer != null}
          playerIndex={quickShotPlayer}
          playerLabel={quickShotPlayer != null ? `Player ${quickShotPlayer + 1}` : ''}
          breakZones={quickShotPlayer != null ? (quickShots[quickShotPlayer] || []) : []}
          obstacleZones={quickShotPlayer != null ? (obstacleShots[quickShotPlayer] || []) : []}
          onToggleZone={handleToggleQuickZone}
          onPrecise={handleQuickShotPrecise}
          onClose={() => setQuickShotPlayer(null)}
        />
      </div>

      {/* Draw mode indicator is shown via the ✏️ button being amber */}

      {/* ═══ IMMERSIVE FLOATING CONTROLS (landscape or portrait-FS) ═══ */}
      {immersive && (
        <div style={{
          position: 'fixed', top: 12, left: 12, display: 'flex', gap: 8, zIndex: 50,
        }}>
          <Btn variant="default" size="sm" onClick={() => navigate(backTo)}
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '8px 12px' }}>
            ‹ Back
          </Btn>
          <Btn variant="default" size="sm" onClick={() => setMenuOpen(true)}
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '8px 12px' }}>
            ⋮
          </Btn>
        </div>
      )}
      {immersive && (
        <div style={{
          position: 'fixed', bottom: 12, right: 12, display: 'flex', gap: 8, zIndex: 50,
        }}>
          {!drawMode && (
          <Btn variant="default"
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '10px 14px', fontSize: FONT_SIZE.sm }}
            onClick={() => setDrawMode(true)}>
            ✏️
          </Btn>
          )}
          <Btn variant={savedFlash ? 'default' : 'accent'}
            style={{ padding: '10px 20px', fontSize: FONT_SIZE.sm, fontWeight: 700,
              backdropFilter: 'blur(8px)',
              ...(savedFlash ? { background: COLORS.success + '20', borderColor: COLORS.success, color: COLORS.success } : {}),
            }}
            onClick={handleSave}
            disabled={(!isDirty && !savedFlash) || saving}>
            {saving ? '...' : savedFlash ? '✓' : 'Save'}
          </Btn>
        </div>
      )}

      {/* ═══ BOTTOM BAR (hidden when immersive — landscape or portrait-FS) ═══ */}
      {!immersive && (
      <div className="no-print" style={{
        padding: '10px 12px',
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', gap: SPACE.sm,
      }}>
        {!drawMode && (
        <Btn variant="default"
          style={{ minWidth: 52, padding: '14px 16px', fontSize: FONT_SIZE.base, fontWeight: 700 }}
          onClick={() => setDrawMode(true)}>
          ✏️
        </Btn>
        )}
        <Btn variant={savedFlash ? 'default' : 'accent'}
          style={{ flex: 1, padding: '14px 0', fontSize: FONT_SIZE.base, fontWeight: 700,
            ...(savedFlash ? { background: COLORS.success + '20', borderColor: COLORS.success, color: COLORS.success } : {}),
          }}
          onClick={handleSave}
          disabled={(!isDirty && !savedFlash) || saving}>
          {saving ? 'Saving...' : savedFlash ? '✓ Saved' : 'Save tactic'}
        </Btn>
      </div>
      )}

      {/* ═══ SHOT DRAWER ═══ (§ 86 / B11 — BaseCanvas-mounted, §75 grammar) */}
      <ShotDrawer
        open={shotMode !== null}
        onClose={() => setShotMode(null)}
        playerIndex={shotMode}
        playerLabel={shotMode !== null ? `P${shotMode + 1}` : ''}
        playerColor={shotMode !== null ? COLORS.playerColors[shotMode] : '#fff'}
        fieldSide="left"
        fieldImage={field.fieldImage}
        fieldCalibration={field?.fieldCalibration || null}
        bunkers={field.bunkers || []}
        shots={shotMode !== null ? (shotFromBump ? (bumpShots[shotMode] || []) : (shots[shotMode] || [])) : []}
        onAddShot={pos => { if (shotMode !== null) handlePlaceShot(shotMode, pos); }}
        onUndoShot={() => {
          if (shotMode !== null) {
            const arr = shotFromBump ? bumpShots[shotMode] : shots[shotMode];
            if (arr?.length) handleDeleteShot(shotMode, arr.length - 1);
          }
        }}
        onDeleteShotIdx={si => { if (shotMode !== null) handleDeleteShot(shotMode, si); }}
      />

      {/* ═══ ACTION SHEET ═══ */}
      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={[
        { label: 'Rename', onPress: () => { setNewName(tactic.name || ''); setRenameModal(true); } },
        ...(freehandStrokes.length > 0 ? [{ label: 'Clear drawings', onPress: handleDrawClear }] : []),
        { label: 'Print', onPress: () => window.print() },
        { separator: true },
        { label: t('tactic_delete_action'), danger: true, onPress: () => setDeleteModal(true) },
      ]} />

      {/* ═══ RENAME MODAL ═══ */}
      <Modal open={renameModal} onClose={() => setRenameModal(false)} title={t('tactic_rename_modal_title')}
        footer={<>
          <Btn variant="default" onClick={() => setRenameModal(false)}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={handleRename} disabled={!newName.trim()}><Icons.Check /> Save</Btn>
        </>}>
        <Input value={newName} onChange={setNewName} placeholder={t('tactic_name_placeholder')} autoFocus
          onKeyDown={e => e.key === 'Enter' && handleRename()} />
      </Modal>

      {/* ═══ DELETE CONFIRM ═══ */}
      <ConfirmModal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title={t('tactic_delete_action')}
        message="This tactic and all its data will be permanently lost."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
