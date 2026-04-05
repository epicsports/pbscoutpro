import React, { useRef, useEffect, useState, useMemo } from 'react';
import { COLORS, FONT, TOUCH, activeHeatmap } from '../utils/theme';
import { drawField, drawViewportFade } from './field/drawField';
import { drawLoupe } from './field/drawLoupe';
import { drawToolbar } from './field/drawToolbar';
import { drawCalibration } from './field/drawCalibration';
import { drawZones } from './field/drawZones';
import { drawAnalytics } from './field/drawAnalytics';
import { drawBunkers } from './field/drawBunkers';
import { drawPlayers } from './field/drawPlayers';
import { createTouchHandler } from './field/touchHandler';
import { makeFieldTransform } from '../utils/helpers';

export default function FieldCanvas({
  fieldImage, players = [], shots = [], bumpStops = [],
  eliminations = [], eliminationPositions = [],
  onPlacePlayer, onMovePlayer, onPlaceShot, onDeleteShot,
  onBumpStop, onSelectPlayer,
  editable = false, selectedPlayer, mode = 'place',
  playerAssignments = [], rosterPlayers = [],
  opponentPlayers, opponentEliminations = [],
  opponentAssignments = [], opponentRosterPlayers = [],
  showOpponentLayer = false, opponentColor = '#60a5fa',
  discoLine = 0, zeekerLine = 0,
  // ── Layout annotations ──
  bunkers = [], showBunkers = false,
  dangerZone = null, sajgonZone = null, showZones = false,
  // ── Bunker/zone edit mode ──
  layoutEditMode = null, // null | 'bunker' | 'danger' | 'sajgon'
  onBunkerPlace, onBunkerMove, onBunkerDelete,
  onZonePoint, onZoneUndo, onZoneClose,
  editDangerPoints = [], editSajgonPoints = [],
  onBunkerLabelNudge, onBunkerLabelOffset,
  selectedBunkerId = null,
  // ── BreakAnalyzer: visibility heatmap ──
  visibilityData = null,
  showVisibility = false,
  onVisibilityTap,
  fieldCalibration = null,
  // ── BreakAnalyzer: counter-analysis ──
  counterData = null,
  showCounter = false,
  enemyPath = null,
  selectedCounterBunkerId = null,
  counterDrawMode = false,
  onCounterPath,
  // Calibration mode
  calibrationMode = false,
  calibrationData = null,
  onCalibrationMove,
  // Pending bunker dot
  pendingBunkerPos = null,
  // Half-field viewport
  viewportSide = null, // null | 'left' | 'right'
  // Bump as drag
  onBumpPlayer,
  // Inline toolbar
  toolbarPlayer = null,
  toolbarItems = [],
  onToolbarAction,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });
  const [dragging, setDragging] = useState(null);
  const [draggingBunker, setDraggingBunker] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef(null);
  const longPressTimer = useRef(null);
  const longPressPos = useRef(null);
  const didLongPress = useRef(false);
  const calDragRef = useRef(null);
  const dragStartRef = useRef(null);
  const [activeTouchPos, setActiveTouchPos] = useState(null);
  const loupeSourceRef = useRef(null);
  const lastTapRef = useRef(0);
  const counterDraftRef = useRef([]);
  const [counterDraft, setCounterDraft] = useState([]);
  const panStartRef = useRef(null);

  // ── stateRef: bridge React state into touch handler ──
  const stateRef = useRef({});
  stateRef.current = {
    canvasSize, zoom, pan, players, shots, editable, mode, selectedPlayer,
    layoutEditMode, bunkers, calibrationMode, calibrationData,
    editDangerPoints, editSajgonPoints,
    toolbarPlayer, toolbarItems, showVisibility, dragging, draggingBunker,
    onPlacePlayer, onMovePlayer, onPlaceShot, onDeleteShot,
    onBumpStop, onSelectPlayer, onBumpPlayer,
    onCalibrationMove, onBunkerPlace, onBunkerMove, onBunkerDelete,
    onZonePoint, onZoneClose, onToolbarAction, onVisibilityTap,
    onBunkerLabelOffset,
  };

  // Stable touch handler (refs never change identity)
  const { handleDown, handleMove, handleUp } = useMemo(() => createTouchHandler({
    canvasRef, stateRef,
    setZoom, setPan, setDragging, setDraggingBunker, setActiveTouchPos,
    pinchRef, longPressTimer, longPressPos, didLongPress,
    calDragRef, dragStartRef, panStartRef, lastTapRef,
  }), []);

  useEffect(() => {
    if (!fieldImage) { setImgObj(null); return; }
    const img = new Image();
    img.onload = () => setImgObj(img);
    img.src = fieldImage;
  }, [fieldImage]);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const maxW = e.contentRect.width;
        if (imgObj) {
          const ratio = imgObj.height / imgObj.width;
          const maxH = Math.min(window.innerHeight * 0.65, 600);
          let w = maxW, h = maxW * ratio;
          if (h > maxH) { h = maxH; w = h / ratio; }
          setCanvasSize({ w: Math.floor(w), h: Math.floor(h) });
        } else {
          setCanvasSize({ w: maxW, h: Math.min(maxW * 0.65, 500) });
        }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj]);

  // Auto-zoom to half-field when viewportSide is set
  useEffect(() => {
    if (viewportSide && imgObj) {
      const targetZoom = 1 / 0.65;
      const panX = viewportSide === 'left' ? 0 : -(canvasSize.w * (targetZoom - 1));
      setZoom(targetZoom);
      setPan({ x: panX, y: 0 });
    } else if (!viewportSide) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [viewportSide, canvasSize.w, imgObj]);

  // Helper: get player label for display
  const getPlayerLabel = (assignments, rosterList, idx) => {
    const ap = assignments?.[idx];
    const rp = ap && rosterList ? rosterList.find(tp => tp.id === ap) : null;
    return rp ? String(rp.number) : `P${idx + 1}`;
  };

  // ─── Draw ───
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = canvasSize;
    canvas.width = w * 2; canvas.height = h * 2;
    ctx.scale(2, 2);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    drawField(ctx, w, h, canvas, { imgObj, activeTouchPos, loupeSourceRef });
    drawZones(ctx, w, h, { discoLine, zeekerLine, showZones, dangerZone, sajgonZone,
      layoutEditMode, editDangerPoints, editSajgonPoints });
    drawAnalytics(ctx, w, h, { visibilityData, showVisibility, fieldCalibration,
      counterData, showCounter, enemyPath, counterDraft });
    drawPlayers(ctx, w, h, {
      players, eliminations, eliminationPositions, bumpStops, shots,
      playerAssignments, rosterPlayers, selectedPlayer,
      opponentPlayers, opponentEliminations, showOpponentLayer, opponentColor,
      opponentAssignments, opponentRosterPlayers,
      getPlayerLabel,
    });
    drawBunkers(ctx, w, h, { bunkers, showBunkers, layoutEditMode, selectedBunkerId,
      showCounter, counterData, selectedCounterBunkerId });

    // HUD
    if (editable && mode === 'place') {
      const n = players.filter(Boolean).length;
      if (n < 5) {
        ctx.fillStyle = COLORS.accent + 'cc'; ctx.font = `bold 12px ${FONT}`;
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(`${n}/5`, w - 10, 10);
      }
    }
    if (editable && mode === 'shoot' && selectedPlayer !== null) {
      ctx.fillStyle = COLORS.playerColors[selectedPlayer] + 'cc';
      ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(`Shots P${selectedPlayer + 1}`, w - 10, 10);
    }

    ctx.restore();
    if (zoom > 1.05) {
      ctx.fillStyle = COLORS.accent + '80'; ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${Math.round(zoom * 100)}%`, 8, 8);
    }

    drawViewportFade(ctx, w, h, viewportSide);
    drawToolbar(ctx, w, h, { toolbarPlayer, toolbarItems, players });

    if (pendingBunkerPos) {
      const px = pendingBunkerPos.x * w, py = pendingBunkerPos.y * h;
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#facc1580'; ctx.fill();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.stroke();
    }

    drawCalibration(ctx, w, h, { calibrationMode, calibrationData });
    drawLoupe(ctx, w, h, { activeTouchPos, loupeSourceRef, canvas, isInteractive: editable || layoutEditMode });
  }, [canvasSize, imgObj, players, shots, bumpStops, eliminations, eliminationPositions,
      editable, selectedPlayer, mode, playerAssignments, rosterPlayers,
      opponentPlayers, opponentEliminations, opponentAssignments, opponentRosterPlayers,
      showOpponentLayer, opponentColor, zoom, pan, discoLine, zeekerLine,
      bunkers, showBunkers, dangerZone, sajgonZone, showZones,
      layoutEditMode, editDangerPoints, editSajgonPoints,
      visibilityData, showVisibility,
      counterData, showCounter, enemyPath, selectedCounterBunkerId, counterDraft,
      activeTouchPos, selectedBunkerId, calibrationMode, calibrationData, pendingBunkerPos, viewportSide,
      toolbarPlayer, toolbarItems]);

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative', overflow: 'visible' }}>
      <canvas ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h, borderRadius: 10, cursor: layoutEditMode ? 'crosshair' : editable ? (mode === 'shoot' ? 'crosshair' : 'pointer') : 'default', display: 'block', border: `1px solid ${COLORS.border}` }}
        onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp} onMouseLeave={handleUp}
        onTouchStart={handleDown} onTouchMove={handleMove} onTouchEnd={handleUp}
      />
      {zoom > 1.05 && (
        <div onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          style={{ position: 'absolute', top: 6, right: 6, padding: '4px 8px', background: 'rgba(0,0,0,0.7)', borderRadius: 6, cursor: 'pointer', fontFamily: FONT, fontSize: 10, color: COLORS.accent, fontWeight: 700 }}>
          {Math.round(zoom * 100)}% ✕
        </div>
      )}
    </div>
  );
}
