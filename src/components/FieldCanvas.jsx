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

  // Max vertical: field height fills all available space
  // Canvas sizing:
  // - When maxCanvasHeight is set: use it as the height, width = height * aspect (may clip)
  // - When not set (LayoutDetailPage): use container width, derive height (safe from feedback loop)
  const lastSizeRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(() => {
      const containerW = el.clientWidth || 390;
      if (imgObj) {
        const imgAspect = imgObj.width / imgObj.height;
        let w, h;
        if (maxCanvasHeight) {
          // Height-first: fill the given height, width clips horizontally
          h = Math.max(200, maxCanvasHeight);
          w = Math.floor(h * imgAspect);
        } else {
          // Width-first: fit container width. Use parent height as cap but guard against loop.
          const parent = el.parentElement;
          const parentH = parent ? parent.clientHeight : window.innerHeight - 200;
          const hFromWidth = Math.floor(containerW / imgAspect);
          // Guard: if parent height keeps growing beyond reasonable, cap it
          const maxH = Math.min(parentH, window.innerHeight - 100);
          h = Math.max(200, Math.min(hFromWidth, maxH));
          w = Math.floor(h * imgAspect);
          // Feedback loop guard: if size didn't change, skip setState
          const key = `${w}x${h}`;
          if (lastSizeRef.current === key) return;
          lastSizeRef.current = key;
        }
        setCanvasSize({ w, h });
      } else {
        setCanvasSize({ w: containerW, h: Math.min(containerW * 0.65, 500) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj, maxCanvasHeight]);

  // Set pan based on viewportSide — applies on mount and on side change
  const lastViewportSide = useRef(null);
  useEffect(() => {
    if (!imgObj || canvasSize.w <= 0) return;
    if (viewportSide === lastViewportSide.current) return;
    lastViewportSide.current = viewportSide;
    setZoom(1);
    if (viewportSide === 'right') {
      const excessW = canvasSize.w - (containerRef.current?.clientWidth || canvasSize.w);
      setPan({ x: -excessW, y: 0 });
    } else {
      setPan({ x: 0, y: 0 });
    }
  }, [viewportSide, imgObj, canvasSize.w]);

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

    // No viewport fade — clean view
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
    // Clamp to visible container width (not canvas width which may be wider)
    const visibleW = containerRef.current?.clientWidth || canvasSize.w;
    let left = screenX - tbW / 2;
    let top = screenY - 80;
    let below = false;
    if (left < 4) left = 4;
    if (left + tbW > visibleW - 4) left = visibleW - 4 - tbW;
    if (top < 4) { top = screenY + 28; below = true; }
    return { left, top, below, anchorX: Math.min(screenX, visibleW - 10) };
  }, [toolbarPlayer, players, canvasSize, zoom, pan]);

  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: canvasSize.h || 'auto',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 10,
      border: `1px solid ${COLORS.border}`,
      background: '#0a0e17',
    }}>
      <canvas ref={canvasRef}
        style={{
          width: canvasSize.w, height: canvasSize.h,
          display: 'block',
          cursor: layoutEditMode ? 'crosshair' : editable ? (mode === 'shoot' ? 'crosshair' : 'pointer') : 'default',
        }}
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
        <>
          {/* Invisible backdrop — tap anywhere to close toolbar */}
          <div
            onClick={() => onToolbarAction?.('close', toolbarPlayer)}
            onTouchStart={(e) => { e.stopPropagation(); }}
            style={{
              position: 'absolute', inset: 0, zIndex: 19,
              background: 'transparent',
            }}
          />
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
        </>
      )}
    </div>
  );
}
