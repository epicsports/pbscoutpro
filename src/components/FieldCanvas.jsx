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
  // Canvas sizing
  maxCanvasHeight = null, // null = auto
  fillHeight = false, // true = stretch to fill parent
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
  const [dragging, _setDragging] = useState(null);
  const [draggingBunker, _setDraggingBunker] = useState(null);
  const draggingRef = useRef(null);
  const draggingBunkerRef = useRef(null);
  const setDragging = (v) => { draggingRef.current = v; _setDragging(v); };
  const setDraggingBunker = (v) => { draggingBunkerRef.current = v; _setDraggingBunker(v); };
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
    canvasRef, stateRef, draggingRef, draggingBunkerRef,
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
        if (!maxW || !imgObj) {
          if (maxW) setCanvasSize({ w: maxW, h: Math.min(maxW * 0.65, 500) });
          return;
        }
        const imgRatio = imgObj.height / imgObj.width;
        const maxH = maxCanvasHeight || Math.min(window.innerHeight - 200, 800);
        if (viewportSide) {
          // Max vertical: use all available height, full width
          const h = Math.min(maxH, window.innerHeight - 200);
          setCanvasSize({ w: Math.floor(maxW), h: Math.floor(Math.max(h, 200)) });
        } else {
          let w = maxW, h = maxW * imgRatio;
          if (h > maxH) { h = maxH; w = h / imgRatio; }
          setCanvasSize({ w: Math.floor(w), h: Math.floor(h) });
        }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj, viewportSide, maxCanvasHeight]);

  // Auto-zoom: fill canvas height with field when viewportSide is set
  useEffect(() => {
    if (viewportSide && imgObj && canvasSize.w > 0 && canvasSize.h > 0) {
      const imgRatio = imgObj.height / imgObj.width;
      const naturalH = canvasSize.w * imgRatio;
      const targetZoom = Math.max(1, canvasSize.h / naturalH);
      const panX = viewportSide === 'left' ? 0 : -(canvasSize.w * (targetZoom - 1));
      setZoom(targetZoom);
      setPan({ x: panX, y: 0 });
    } else if (!viewportSide) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [viewportSide, canvasSize.w, canvasSize.h, imgObj]);

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
      getPlayerLabel, zoom,
    });
    drawBunkers(ctx, w, h, { bunkers, showBunkers, layoutEditMode, selectedBunkerId,
      showCounter, counterData, selectedCounterBunkerId });

    // HUD (zoom-independent sizing)
    const _s = 1 / zoom;
    if (editable && mode === 'place') {
      const n = players.filter(Boolean).length;
      if (n < 5) {
        ctx.fillStyle = COLORS.accent + 'cc'; ctx.font = `bold ${12 * _s}px ${FONT}`;
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(`${n}/5`, w - 10 * _s, 10 * _s);
      }
    }
    if (editable && mode === 'shoot' && selectedPlayer !== null) {
      ctx.fillStyle = COLORS.playerColors[selectedPlayer] + 'cc';
      ctx.font = `bold ${12 * _s}px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(`Shots P${selectedPlayer + 1}`, w - 10 * _s, 10 * _s);
    }

    ctx.restore();
    if (zoom > 1.05) {
      ctx.fillStyle = COLORS.accent + '80'; ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${Math.round(zoom * 100)}%`, 8, 8);
    }

    drawViewportFade(ctx, w, h, viewportSide);
    // Toolbar is now HTML overlay — no canvas drawing needed

    if (pendingBunkerPos) {
      const px = pendingBunkerPos.x * w, py = pendingBunkerPos.y * h;
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#facc1580'; ctx.fill();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.stroke();
    }

    drawCalibration(ctx, w, h, { calibrationMode, calibrationData });
    drawLoupe(ctx, w, h, { activeTouchPos, loupeSourceRef, canvas, isInteractive: !viewportSide && (editable || layoutEditMode) });
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

  // Toolbar position in screen space
  const toolbarPos = useMemo(() => {
    if (toolbarPlayer === null || !players[toolbarPlayer]) return null;
    const pl = players[toolbarPlayer];
    const screenX = pl.x * canvasSize.w * zoom + pan.x;
    const screenY = pl.y * canvasSize.h * zoom + pan.y;
    const tbW = 228; // 4 buttons × 52 + gaps + padding
    let left = screenX - tbW / 2;
    let top = screenY - 80;
    let below = false;
    if (left < 4) left = 4;
    if (left + tbW > canvasSize.w - 4) left = canvasSize.w - 4 - tbW;
    if (top < 4) { top = screenY + 28; below = true; }
    return { left, top, below, anchorX: screenX };
  }, [toolbarPlayer, players, canvasSize, zoom, pan]);

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative', overflow: 'visible', ...(fillHeight ? { flex: 1 } : {}) }}>
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
      {/* HTML Toolbar overlay — native touch, no hitArea matching needed */}
      {toolbarPos && toolbarItems.length > 0 && (
        <div style={{
          position: 'absolute', left: toolbarPos.left, top: toolbarPos.top,
          display: 'flex', gap: 4, padding: 6,
          background: '#0f172aee', border: '1px solid #1e293b80', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 20, pointerEvents: 'auto',
        }}
          onTouchStart={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {toolbarItems.map((item, i) => (
            <div key={i}
              onClick={(e) => { e.stopPropagation(); onToolbarAction?.(item.action, toolbarPlayer); }}
              style={{
                width: 52, height: 48, borderRadius: 12,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                cursor: 'pointer', background: '#1e293b30',
                border: `1.5px solid ${(item.color || '#94a3b8') + '30'}`,
                WebkitTapHighlightColor: 'transparent',
              }}>
              <span style={{ fontSize: 17 }}>{item.icon}</span>
              <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5, color: (item.color || '#94a3b8') + '90', fontFamily: FONT }}>{item.label}</span>
            </div>
          ))}
          {/* Pointer triangle */}
          <div style={{
            position: 'absolute',
            left: Math.max(16, Math.min(toolbarPos.anchorX - toolbarPos.left - 7, 214)),
            [toolbarPos.below ? 'top' : 'bottom']: -8,
            width: 0, height: 0,
            borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
            [toolbarPos.below ? 'borderBottom' : 'borderTop']: '8px solid #0f172aee',
          }} />
        </div>
      )}
    </div>
  );
}
