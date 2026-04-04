import React, { useRef, useEffect, useState, useCallback } from 'react';
import { COLORS, FONT, TOUCH, activeHeatmap } from '../utils/theme';
import { drawField, drawViewportFade } from './field/drawField';
import { drawLoupe } from './field/drawLoupe';
import { drawToolbar } from './field/drawToolbar';
import { drawCalibration } from './field/drawCalibration';
import { drawZones } from './field/drawZones';
import { drawAnalytics } from './field/drawAnalytics';
import { drawBunkers } from './field/drawBunkers';
import { drawPlayers } from './field/drawPlayers';
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
  const [draggingBunker, setDraggingBunker] = useState(null); // bunker id being dragged
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef(null);
  const longPressTimer = useRef(null);
  const longPressPos = useRef(null);
  const didLongPress = useRef(false);
  const calDragRef = useRef(null);
  const dragStartRef = useRef(null);
  const [activeTouchPos, setActiveTouchPos] = useState(null); // pixel coords for loupe
  const loupeSourceRef = useRef(null); // clean field image for loupe (no overlays)
  const lastTapRef = useRef(0);
  const counterDraftRef = useRef([]);
  const [counterDraft, setCounterDraft] = useState([]);

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
      const targetZoom = 1 / 0.65; // ~1.54x — show 65% of field
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

    // Background (field image or empty grid)
    drawField(ctx, w, h, canvas, { imgObj, activeTouchPos, loupeSourceRef });

    // Disco/Zeeker lines + zone polygons
    drawZones(ctx, w, h, { discoLine, zeekerLine, showZones, dangerZone, sajgonZone,
      layoutEditMode, editDangerPoints, editSajgonPoints });

    // Analytics: visibility heatmap, counter heatmap, enemy path
    drawAnalytics(ctx, w, h, { visibilityData, showVisibility, fieldCalibration,
      counterData, showCounter, enemyPath, counterDraft });

    // Players, shots, bumps, opponent overlay
    drawPlayers(ctx, w, h, {
      players, eliminations, eliminationPositions, bumpStops, shots,
      playerAssignments, rosterPlayers, selectedPlayer,
      opponentPlayers, opponentEliminations, showOpponentLayer, opponentColor,
      opponentAssignments, opponentRosterPlayers,
      getPlayerLabel,
    });

    // Zone polygons already drawn by drawZones above

    // Bunker labels + counter lane lines
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

    // Half-field fade gradient
    drawViewportFade(ctx, w, h, viewportSide);

    // Inline toolbar
    drawToolbar(ctx, w, h, { toolbarPlayer, toolbarItems, players });

    // ── Pending bunker dot ──
    if (pendingBunkerPos) {
      const px = pendingBunkerPos.x * w, py = pendingBunkerPos.y * h;
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#facc1580'; ctx.fill();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Calibration markers
    drawCalibration(ctx, w, h, { calibrationMode, calibrationData });

    // Magnifying loupe (drawn last, in screen space)
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

  // ─── Helpers ───
  const getRelPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const canvasX = (cx - rect.left - pan.x) / zoom;
    const canvasY = (cy - rect.top - pan.y) / zoom;
    return { x: Math.max(0, Math.min(1, canvasX / canvasSize.w)), y: Math.max(0, Math.min(1, canvasY / canvasSize.h)) };
  }, [zoom, pan, canvasSize]);

  const findPlayer = useCallback((pos) => {
    const { w, h } = canvasSize;
    for (let i = players.length - 1; i >= 0; i--) {
      if (!players[i]) continue;
      const dx = (players[i].x - pos.x) * w, dy = (players[i].y - pos.y) * h;
      if (Math.sqrt(dx * dx + dy * dy) < 24) return i;
    }
    return -1;
  }, [canvasSize, players]);

  const findShot = useCallback((pos, onlyPlayerIdx = null) => {
    const { w, h } = canvasSize;
    // Only check delete button area (small X badge), not the main target circle
    for (let pi = 0; pi < 5; pi++) {
      if (onlyPlayerIdx !== null && pi !== onlyPlayerIdx) continue; // only selected player
      if (!shots[pi]) continue;
      for (let si = shots[pi].length - 1; si >= 0; si--) {
        const s = shots[pi][si];
        const btnX = s.x + 14 / w, btnY = s.y - 10 / h;
        const dxBtn = (btnX - pos.x) * w, dyBtn = (btnY - pos.y) * h;
        if (Math.sqrt(dxBtn*dxBtn + dyBtn*dyBtn) < 14)
          return { playerIdx: pi, shotIdx: si };
      }
    }
    return null;
  }, [canvasSize, shots]);

  // ─── Pinch-to-zoom ───
  const getTouchDist = (e) => {
    if (e.touches?.length < 2) return 0;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panStartRef = useRef(null); // for single-finger pan when zoomed

  const handleStart = (e) => {
    e.preventDefault();
    // Double-tap reset zoom
    const now = Date.now();
    if (now - lastTapRef.current < 300 && e.touches?.length === 1) { setZoom(1); setPan({ x: 0, y: 0 }); lastTapRef.current = 0; return; }
    lastTapRef.current = now;
    // Pinch
    if (e.touches?.length === 2) {
      pinchRef.current = { dist: getTouchDist(e), zoom, pan: { ...pan } };
      panStartRef.current = null;
      setActiveTouchPos(null);
      clearTimeout(longPressTimer.current); return;
    }
    if (e.touches?.length > 2) return;

    // Single-finger: track for potential pan (when zoomed)
    if (e.touches?.length === 1) {
      panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y, moved: false };
    }

    // Loupe: track pixel position for magnifier
    if ((editable || layoutEditMode) && (e.touches?.length === 1 || !e.touches)) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      setActiveTouchPos({ x: cx - rect.left, y: cy - rect.top });
    }

    // Calibration drag
    if (calibrationMode && calibrationData) {
      const pos = getRelPos(e);
      const { homeBase, awayBase } = calibrationData;
      const hDist = Math.sqrt((pos.x - homeBase.x)**2 + (pos.y - homeBase.y)**2);
      const aDist = Math.sqrt((pos.x - awayBase.x)**2 + (pos.y - awayBase.y)**2);
      if (hDist < 0.06) { calDragRef.current = 'homeBase'; didLongPress.current = true; return; }
      if (aDist < 0.06) { calDragRef.current = 'awayBase'; didLongPress.current = true; return; }
    }

    if (!editable && !layoutEditMode) return;
    const pos = getRelPos(e);
    didLongPress.current = false;
    longPressPos.current = pos;

    // ── Layout edit modes ──
    if (layoutEditMode === 'danger' || layoutEditMode === 'sajgon') {
      // Close polygon if clicking near first point
      const editPts = layoutEditMode === 'danger' ? editDangerPoints : editSajgonPoints;
      if (editPts.length >= 3) {
        const fp = editPts[0];
        const dx = (fp.x - pos.x) * canvasSize.w, dy = (fp.y - pos.y) * canvasSize.h;
        if (Math.sqrt(dx*dx + dy*dy) < 16) { onZoneClose?.(); return; }
      }
      onZonePoint?.(pos);
      didLongPress.current = true;
      return;
    }
    if (layoutEditMode === 'bunker') {
      const { w, h } = canvasSize;
      const labelFont = Math.max(10, Math.min(15, w * 0.026));
      const lh = Math.round(labelFont * 1.8);
      for (const b of bunkers) {
        const bx = b.x * w, by = b.y * h;
        const tw_approx = b.name.length * labelFont * 0.62 + Math.round(labelFont * 0.7) * 2;
        const pillMidY = by - lh / 2 - 4;

        // Anchor drag — hit anchor dot (22px touch target)
        const dxAnch = (b.x - pos.x) * w, dyAnch = (b.y - pos.y) * h;
        if (Math.sqrt(dxAnch * dxAnch + dyAnch * dyAnch) < 22) {
          setDraggingBunker(b.id); didLongPress.current = true; return;
        }

        // Pill click — trigger onBunkerPlace which handles edit-existing logic
        const dxLbl = (bx / w - pos.x) * w;
        const dyLbl = (pillMidY / h - pos.y) * h;
        if (Math.abs(dxLbl) < tw_approx / 2 + 6 && Math.abs(dyLbl) < lh / 2 + 4) {
          onBunkerPlace?.({ x: b.x, y: b.y }); try { navigator.vibrate?.(10); } catch(e) {} didLongPress.current = true; return;
        }
      }
      // Place new bunker on empty space
      onBunkerPlace?.(pos); try { navigator.vibrate?.(10); } catch(e) {}
      didLongPress.current = true;
      return;
    }

    if (mode === 'shoot') {
      // Only interact with shots of the currently selected player
      const hitShot = findShot(pos, selectedPlayer);
      if (hitShot) {
        didLongPress.current = true; // prevent handleEnd from placing a new shot
        onDeleteShot?.(hitShot.playerIdx, hitShot.shotIdx);
        return;
      }
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        if (selectedPlayer !== null && players[selectedPlayer]) onPlaceShot?.(selectedPlayer, { ...pos, isKill: true });
      }, 2000);
      return;
    }

    const hit = findPlayer(pos);
    if (hit >= 0) {
      // Existing player — select + drag to move
      onSelectPlayer?.(hit);
      setDragging(hit);
      dragStartRef.current = { x: players[hit].x, y: players[hit].y };
      longPressPos.current = { ...pos, isNew: false };
    } else if (players.filter(Boolean).length < 5) {
      // New player — wait to distinguish tap vs hold
      const newIdx = players.findIndex(p => p === null);
      longPressPos.current = { ...pos, isNew: true, newIdx, newPos: pos };
      // Hold > 200ms = fine-position mode with loupe + drag
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        onPlacePlayer?.(pos); try { navigator.vibrate?.(15); } catch(e) {}
        setDragging(newIdx);
      }, 200);
    }
  };

  const handleMove = (e) => {
    e.preventDefault();
    // Loupe: update position
    if ((e.touches?.length === 1 || !e.touches) && (editable || layoutEditMode)) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      setActiveTouchPos({ x: cx - rect.left, y: cy - rect.top });
    }
    if (e.touches?.length === 2 && pinchRef.current) {
      const newDist = getTouchDist(e);
      const scale = newDist / pinchRef.current.dist;
      const nz = Math.max(1, Math.min(5, pinchRef.current.zoom * scale));
      setZoom(nz);
      setPan({ x: Math.max(-canvasSize.w * (nz - 1), Math.min(0, pinchRef.current.pan.x)), y: Math.max(-canvasSize.h * (nz - 1), Math.min(0, pinchRef.current.pan.y)) });
      return;
    }
    if (e.touches?.length > 1) return;

    // Single-finger pan when zoomed and not dragging an element
    if (zoom > 1.05 && panStartRef.current && e.touches?.length === 1 && dragging === null && draggingBunker === null) {
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5 || panStartRef.current.moved) {
        panStartRef.current.moved = true;
        const maxPanX = canvasSize.w * (zoom - 1);
        const maxPanY = canvasSize.h * (zoom - 1);
        setPan({
          x: Math.max(-maxPanX, Math.min(0, panStartRef.current.panX + dx)),
          y: Math.max(-maxPanY, Math.min(0, panStartRef.current.panY + dy)),
        });
        return;
      }
    }

    // Calibration drag
    if (calDragRef.current && calibrationMode) {
      const pos = getRelPos(e);
      onCalibrationMove?.(calDragRef.current, pos);
      return;
    }

    if (!editable && !layoutEditMode) return;
    const pos = getRelPos(e);

    // Bunker drag in layoutEditMode
    if (draggingBunker !== null) {
      if (typeof draggingBunker === 'string' && draggingBunker.startsWith('label:')) {
        // Vertical-only label drag
        const bid = draggingBunker.replace('label:', '');
        const b = bunkers.find(bk => bk.id === bid);
        if (b) {
          const anchorY = b.y * canvasSize.h;
          const curY = pos.y * canvasSize.h;
          const offsetSteps = Math.round((curY - anchorY) / 22);
          onBunkerLabelOffset?.(bid, offsetSteps);
        }
      } else {
        onBunkerMove?.(draggingBunker, pos);
      }
      return;
    }

    // Istniejący gracz — zwykły drag (bump NIE aktywuje)
    if (dragging !== null && mode === 'place') {
      // Jeśli to istniejący gracz (nie nowy), ruch anuluje timer i przesuwa
      if (!longPressPos.current?.isNew) {
        clearTimeout(longPressTimer.current); longPressTimer.current = null;
      }
      onMovePlayer?.(dragging, pos);
    }
  };

  const handleEnd = () => {
    const wasPanning = panStartRef.current?.moved;
    pinchRef.current = null;
    panStartRef.current = null;
    calDragRef.current = null;
    setActiveTouchPos(null);
    if (wasPanning) return;
    clearTimeout(longPressTimer.current); longPressTimer.current = null;

    // Toolbar tap check
    if (toolbarPlayer !== null && toolbarItems.length && !didLongPress.current) {
      const tPos = longPressPos.current;
      if (tPos) {
        const canvX = tPos.x * canvasSize.w, canvY = tPos.y * canvasSize.h;
        for (const item of toolbarItems) {
          if (!item._hitArea) continue;
          const h = item._hitArea;
          if (canvX >= h.x && canvX <= h.x + h.w && canvY >= h.y && canvY <= h.y + h.h) {
            onToolbarAction?.(item.action, toolbarPlayer);
            setDragging(null); draggingBunker && setDraggingBunker(null);
            didLongPress.current = false; longPressPos.current = null;
            return;
          }
        }
        // Tap outside toolbar = close
        onToolbarAction?.('close', toolbarPlayer);
        didLongPress.current = false; longPressPos.current = null;
        return;
      }
    }

    // Quick tap in shoot mode = place shot
    if (mode === 'shoot' && !didLongPress.current && selectedPlayer !== null && players[selectedPlayer]) {
      const pos = longPressPos.current;
      if (pos && !findShot(pos)) onPlaceShot?.(selectedPlayer, { ...pos, isKill: false });
    }
    // Quick tap in place mode = place player instantly (no loupe needed)
    if (mode === 'place' && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos?.isNew && players.filter(Boolean).length < 5) {
        onPlacePlayer?.(pos); try { navigator.vibrate?.(15); } catch(e) {}
      }
    }
    // ── Visibility tap: gdy showVisibility + brak innej interakcji ──
    if (showVisibility && onVisibilityTap && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos) {
        // Sprawdź czy tapnięto w bunkier
        const hitBunker = bunkers.find(b => {
          const dx = (b.x - pos.x) * canvasSize.w;
          const dy = (b.y - pos.y) * canvasSize.h;
          return Math.sqrt(dx*dx + dy*dy) < 20;
        });
        onVisibilityTap(hitBunker?.id ?? null, hitBunker ? null : pos);
      }
    }
    // Bump detection: if dragged far enough (>8%), trigger bump
    if (dragging !== null && dragStartRef.current && players[dragging]) {
      const start = dragStartRef.current;
      const end = players[dragging];
      const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      if (dist > 0.08 && onBumpPlayer) {
        onBumpPlayer(dragging, start);
      }
    }
    dragStartRef.current = null;
    setDraggingBunker(null);
    setDragging(null); didLongPress.current = false; longPressPos.current = null;
  };

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative', overflow: 'visible' }}>
      <canvas ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h, borderRadius: 10, cursor: layoutEditMode ? 'crosshair' : editable ? (mode === 'shoot' ? 'crosshair' : 'pointer') : 'default', display: 'block', border: `1px solid ${COLORS.border}` }}
        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
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
