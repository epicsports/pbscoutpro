/**
 * TacticPage — scouting-style tactic editor
 * Routes: /layout/:layoutId/tactic/:tacticId
 *         /tournament/:tournamentId/tactic/:tacticId
 *
 * Same interaction model as MatchPage scouting editor:
 * full-height canvas, floating toolbar on player tap, drag-to-bump, ShotDrawer.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';

import FieldCanvas from '../components/FieldCanvas';
import ShotDrawer from '../components/ShotDrawer';
import QuickShotPanel from '../components/QuickShotPanel';
import PageHeader from '../components/PageHeader';
import { Btn, Modal, Input, Icons, ActionSheet, MoreBtn, ConfirmModal } from '../components/ui';
import { useLayouts, useLayoutTactics, useTournaments, useTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, responsive } from '../utils/theme';

export default function TacticPage() {
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
  const { tactics: layoutTactics } = useLayoutTactics(isLayoutMode ? layoutId : null);
  const { tactics: tournamentTactics } = useTactics(isLayoutMode ? null : tournamentId);
  const tactics = isLayoutMode ? layoutTactics : tournamentTactics;
  const tactic = tactics.find(t => t.id === tacticId);

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
  const freehandCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef([]);

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
    // Deserialize freehandStrokes from Firestore object { "0": [...], "1": [...] } back to array
    const rawStrokes = tactic.freehandStrokes;
    if (Array.isArray(rawStrokes)) {
      setFreehandStrokes(rawStrokes);
    } else if (rawStrokes && typeof rawStrokes === 'object') {
      const keys = Object.keys(rawStrokes).sort((a, b) => Number(a) - Number(b));
      setFreehandStrokes(keys.map(k => rawStrokes[k]));
    } else {
      setFreehandStrokes([]);
    }
    setLoaded(true);
  }, [tactic?.id]);

  // ── Freehand canvas sizing + redraw ──
  const strokesRef = useRef(freehandStrokes);
  strokesRef.current = freehandStrokes;
  const redrawStrokes = () => {
    const canvas = freehandCanvasRef.current;
    if (!canvas || !canvas.width || !canvas.height) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const allStrokes = [...(strokesRef.current || [])];
    // Also draw the in-progress stroke if still drawing
    if (currentStrokeRef.current.length > 1) {
      allStrokes.push(currentStrokeRef.current);
    }
    allStrokes.forEach(stroke => {
      if (!stroke || stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * canvas.width, stroke[0].y * canvas.height);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x * canvas.width, stroke[i].y * canvas.height);
      }
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
  };

  // Resize canvas to match parent — ONLY when dimensions actually change
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  useEffect(() => {
    const canvas = freehandCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    let resizeTimeout = null;
    const ro = new ResizeObserver(() => {
      // Debounce to avoid clearing canvas during React re-renders
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        if (w < 1 || h < 1) return;
        if (canvasSizeRef.current.w !== w || canvasSizeRef.current.h !== h) {
          canvasSizeRef.current = { w, h };
          canvas.width = w;
          canvas.height = h;
        }
        redrawStrokes();
      }, 50);
    });
    ro.observe(parent);
    return () => { ro.disconnect(); clearTimeout(resizeTimeout); };
  }, []);

  // Redraw when strokes change (after adding a new stroke)
  useEffect(() => {
    redrawStrokes();
  }, [freehandStrokes]);

  // ── Dirty check ──
  const isDirty = useMemo(() => {
    if (!tactic || !loaded) return false;
    const origPlayers = tactic.players || tactic.steps?.[0]?.players || [null, null, null, null, null];
    const origShots = tactic.shots || tactic.steps?.[0]?.shots || [[], [], [], [], []];
    const origBumps = tactic.bumps || tactic.steps?.[0]?.bumps || [null, null, null, null, null];
    const origBumpShots = tactic.bumpShots || [[], [], [], [], []];
    const origRunners = tactic.runners || [false, false, false, false, false];
    const origStrokes = (() => {
      const raw = tactic.freehandStrokes;
      if (Array.isArray(raw)) return raw;
      if (raw && typeof raw === 'object') return Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map(k => raw[k]);
      return [];
    })();
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
      // Firestore doesn't allow nested arrays — serialize strokes as object { "0": [...], "1": [...] }
      const strokesToFirestore = (strokes) => {
        if (!strokes?.length) return null;
        const o = {};
        strokes.forEach((s, i) => { o[String(i)] = s; });
        return o;
      };
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
  const backLabel = isLayoutMode ? 'Layout' : 'Home';

  // ── Auto-print when ?print=1 ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('print') === '1' && tactic) {
      setTimeout(() => window.print(), 500);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [tactic?.id]);

  if (!tactic) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: FONT, color: COLORS.textMuted }}>Loading...</div>
    </div>
  );

  const isLandscape = device.isLandscape && !device.isDesktop;

  return (
    <div style={{
      height: '100dvh', maxWidth: isLandscape ? '100%' : (R.layout.maxWidth || 640), margin: '0 auto',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ═══ HEADER (hidden in landscape) ═══ */}
      {!isLandscape && (
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
        <FieldCanvas
          fieldImage={field.fieldImage}
          maxCanvasHeight={typeof window !== 'undefined' ? (isLandscape ? window.innerHeight : window.innerHeight - 200) : 500}
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
        />
        {/* Freehand drawing overlay */}
        <canvas
          ref={(el) => {
            freehandCanvasRef.current = el;
            if (el && el.parentElement && canvasSizeRef.current.w === 0) {
              el.width = el.parentElement.clientWidth;
              el.height = el.parentElement.clientHeight;
              canvasSizeRef.current = { w: el.width, h: el.height };
            }
          }}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            touchAction: 'none',
            pointerEvents: drawMode ? 'auto' : 'none',
            cursor: drawMode ? 'crosshair' : 'default',
          }}
          onPointerDown={(e) => {
            if (!drawMode) return;
            isDrawingRef.current = true;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            currentStrokeRef.current = [{ x, y }];
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!isDrawingRef.current) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            currentStrokeRef.current.push({ x, y });
            // Draw live stroke
            const canvas = freehandCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const pts = currentStrokeRef.current;
            if (pts.length < 2) return;
            const p1 = pts[pts.length - 2], p2 = pts[pts.length - 1];
            ctx.beginPath();
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
            ctx.strokeStyle = COLORS.accent;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
          }}
          onPointerUp={() => {
            if (!isDrawingRef.current) return;
            isDrawingRef.current = false;
            if (currentStrokeRef.current.length > 1) {
              const newStroke = [...currentStrokeRef.current];
              // Update ref immediately so any redraw (e.g. from ResizeObserver) has the data
              strokesRef.current = [...strokesRef.current, newStroke];
              setFreehandStrokes(strokesRef.current);
            }
            currentStrokeRef.current = [];
          }}
        />
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

      {/* ═══ LANDSCAPE FLOATING CONTROLS ═══ */}
      {isLandscape && (
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
      {isLandscape && (
        <div style={{
          position: 'fixed', bottom: 12, right: 12, display: 'flex', gap: 8, zIndex: 50,
        }}>
          <Btn variant={drawMode ? 'accent' : 'default'}
            style={{ background: drawMode ? undefined : COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '10px 14px', fontSize: FONT_SIZE.sm }}
            onClick={() => setDrawMode(v => !v)}>
            ✏️
          </Btn>
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

      {/* ═══ BOTTOM BAR (portrait only) ═══ */}
      {!isLandscape && (
      <div className="no-print" style={{
        padding: '10px 12px',
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', gap: SPACE.sm,
      }}>
        <Btn variant={drawMode ? 'accent' : 'default'}
          style={{ minWidth: 52, padding: '14px 16px', fontSize: FONT_SIZE.base, fontWeight: 700 }}
          onClick={() => setDrawMode(v => !v)}>
          ✏️
        </Btn>
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

      {/* ═══ SHOT DRAWER ═══ */}
      <ShotDrawer
        open={shotMode !== null}
        onClose={() => setShotMode(null)}
        playerIndex={shotMode}
        playerLabel={shotMode !== null ? `P${shotMode + 1}` : ''}
        playerColor={shotMode !== null ? COLORS.playerColors[shotMode] : '#fff'}
        fieldSide="left"
        fieldImage={field.fieldImage}
        bunkers={field.bunkers || []}
        shots={shotMode !== null ? (shotFromBump ? (bumpShots[shotMode] || []) : (shots[shotMode] || [])) : []}
        onAddShot={pos => { if (shotMode !== null) handlePlaceShot(shotMode, pos); }}
        onUndoShot={() => {
          if (shotMode !== null) {
            const arr = shotFromBump ? bumpShots[shotMode] : shots[shotMode];
            if (arr?.length) handleDeleteShot(shotMode, arr.length - 1);
          }
        }}
      />

      {/* ═══ ACTION SHEET ═══ */}
      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={[
        { label: 'Rename', onPress: () => { setNewName(tactic.name || ''); setRenameModal(true); } },
        ...(freehandStrokes.length > 0 ? [{ label: 'Clear drawings', onPress: () => {
          setFreehandStrokes([]);
          const canvas = freehandCanvasRef.current;
          if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }}] : []),
        { label: 'Print', onPress: () => window.print() },
        { separator: true },
        { label: 'Delete tactic', danger: true, onPress: () => setDeleteModal(true) },
      ]} />

      {/* ═══ RENAME MODAL ═══ */}
      <Modal open={renameModal} onClose={() => setRenameModal(false)} title="Rename tactic"
        footer={<>
          <Btn variant="default" onClick={() => setRenameModal(false)}>Cancel</Btn>
          <Btn variant="accent" onClick={handleRename} disabled={!newName.trim()}><Icons.Check /> Save</Btn>
        </>}>
        <Input value={newName} onChange={setNewName} placeholder="Tactic name" autoFocus
          onKeyDown={e => e.key === 'Enter' && handleRename()} />
      </Modal>

      {/* ═══ DELETE CONFIRM ═══ */}
      <ConfirmModal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete tactic"
        message="This tactic and all its data will be permanently lost."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
