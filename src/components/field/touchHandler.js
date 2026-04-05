/**
 * Touch/pointer event handlers for FieldCanvas.
 * Extracted to reduce FieldCanvas line count.
 *
 * Uses stateRef pattern: reads current React state via opts.stateRef.current
 * because touch handlers run outside React's render cycle.
 */

function getTouchDist(e) {
  if (e.touches?.length < 2) return 0;
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function createTouchHandler(opts) {
  const {
    canvasRef, stateRef, draggingRef, draggingBunkerRef,
    // State setters
    setZoom, setPan, setDragging, setDraggingBunker,
    setActiveTouchPos,
    // Refs
    pinchRef, longPressTimer, longPressPos, didLongPress,
    calDragRef, dragStartRef, panStartRef, lastTapRef,
  } = opts;

  // Read-only helpers that close over stateRef
  const getRelPos = (e) => {
    const { zoom, pan, canvasSize } = stateRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const canvasX = (cx - rect.left - pan.x) / zoom;
    const canvasY = (cy - rect.top - pan.y) / zoom;
    return {
      x: Math.max(0, Math.min(1, canvasX / canvasSize.w)),
      y: Math.max(0, Math.min(1, canvasY / canvasSize.h)),
    };
  };

  const findPlayer = (pos) => {
    const { canvasSize, players } = stateRef.current;
    const { w, h } = canvasSize;
    for (let i = players.length - 1; i >= 0; i--) {
      if (!players[i]) continue;
      const dx = (players[i].x - pos.x) * w, dy = (players[i].y - pos.y) * h;
      if (Math.sqrt(dx * dx + dy * dy) < 24) return i;
    }
    return -1;
  };

  const findShot = (pos, onlyPlayerIdx = null) => {
    const { canvasSize, shots } = stateRef.current;
    const { w, h } = canvasSize;
    for (let pi = 0; pi < 5; pi++) {
      if (onlyPlayerIdx !== null && pi !== onlyPlayerIdx) continue;
      if (!shots[pi]) continue;
      for (let si = shots[pi].length - 1; si >= 0; si--) {
        const s = shots[pi][si];
        const btnX = s.x + 14 / w, btnY = s.y - 10 / h;
        const dxBtn = (btnX - pos.x) * w, dyBtn = (btnY - pos.y) * h;
        if (Math.sqrt(dxBtn * dxBtn + dyBtn * dyBtn) < 14)
          return { playerIdx: pi, shotIdx: si };
      }
    }
    return null;
  };

  // ─── Event handlers ───

  // Track whether touch was used to prevent mouse event double-fire
  const usedTouchRef = { current: false };

  const handleDown = (e) => {
    // Prevent mouse events if touch was used (mobile Safari fires both)
    if (e.type === 'touchstart') {
      usedTouchRef.current = true;
    } else if (usedTouchRef.current && (e.type === 'mousedown')) {
      return; // Skip mouse event — touch already handled it
    }
    e.preventDefault();
    const {
      zoom, pan, canvasSize, editable, mode, players, selectedPlayer,
      layoutEditMode, bunkers, calibrationMode, calibrationData,
      editDangerPoints, editSajgonPoints,
      onPlacePlayer, onSelectPlayer, onPlaceShot, onDeleteShot,
      onBunkerPlace, onZonePoint, onZoneClose, onCalibrationMove,
    } = stateRef.current;

    // Double-tap reset zoom
    const now = Date.now();
    if (now - lastTapRef.current < 300 && e.touches?.length === 1) {
      setZoom(1); setPan({ x: 0, y: 0 }); lastTapRef.current = 0; return;
    }
    lastTapRef.current = now;

    // Pinch
    if (e.touches?.length === 2) {
      pinchRef.current = { dist: getTouchDist(e), zoom, pan: { ...pan } };
      panStartRef.current = null;
      setActiveTouchPos(null);
      clearTimeout(longPressTimer.current);
      longPressPos.current = null; // Prevent placement on handleUp
      didLongPress.current = true; // Mark as non-tap
      return;
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
      const hDist = Math.sqrt((pos.x - homeBase.x) ** 2 + (pos.y - homeBase.y) ** 2);
      const aDist = Math.sqrt((pos.x - awayBase.x) ** 2 + (pos.y - awayBase.y) ** 2);
      if (hDist < 0.06) { calDragRef.current = 'homeBase'; didLongPress.current = true; return; }
      if (aDist < 0.06) { calDragRef.current = 'awayBase'; didLongPress.current = true; return; }
    }

    if (!editable && !layoutEditMode) return;
    const pos = getRelPos(e);
    didLongPress.current = false;
    longPressPos.current = pos;

    // ── Layout edit modes ──
    if (layoutEditMode === 'danger' || layoutEditMode === 'sajgon') {
      const editPts = layoutEditMode === 'danger' ? editDangerPoints : editSajgonPoints;
      if (editPts.length >= 3) {
        const fp = editPts[0];
        const dx = (fp.x - pos.x) * canvasSize.w, dy = (fp.y - pos.y) * canvasSize.h;
        if (Math.sqrt(dx * dx + dy * dy) < 16) { onZoneClose?.(); return; }
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
          onBunkerPlace?.({ x: b.x, y: b.y }); try { navigator.vibrate?.(10); } catch (e) {} didLongPress.current = true; return;
        }
      }
      // Place new bunker on empty space
      onBunkerPlace?.(pos); try { navigator.vibrate?.(10); } catch (e) {}
      didLongPress.current = true;
      return;
    }

    if (mode === 'shoot') {
      const hitShot = findShot(pos, selectedPlayer);
      if (hitShot) {
        didLongPress.current = true;
        onDeleteShot?.(hitShot.playerIdx, hitShot.shotIdx);
        return;
      }
      // Mark position for instant placement on handleUp (same as player placement)
      longPressPos.current = { ...pos, isShot: true };
      return;
    }

    const hit = findPlayer(pos);
    if (hit >= 0) {
      // Tap on existing player — open toolbar + start drag
      onSelectPlayer?.(hit);
      setDragging(hit);
      dragStartRef.current = { x: players[hit].x, y: players[hit].y };
      longPressPos.current = { ...pos, isNew: false };
    } else if (stateRef.current.toolbarPlayer !== null) {
      // Toolbar is open but tapped empty space — close toolbar
      onToolbarAction?.('close', stateRef.current.toolbarPlayer);
      longPressPos.current = null;
    } else if (players.filter(Boolean).length < 5) {
      // Empty space, no toolbar — mark for placement on handleUp
      longPressPos.current = { ...pos, isNew: true };
    }
  };

  const handleMove = (e) => {
    if (usedTouchRef.current && e.type === 'mousemove') return;
    e.preventDefault();
    const {
      zoom, pan, canvasSize, editable, mode, players,
      layoutEditMode, bunkers, calibrationMode,
      onMovePlayer, onCalibrationMove, onBunkerMove, onBunkerLabelOffset,
    } = stateRef.current;
    const dragging = draggingRef.current;
    const draggingBunker = draggingBunkerRef.current;

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
      
      // Zoom relative to pinch center
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        // Point under pinch center in field coords stays fixed
        const oldZoom = pinchRef.current.zoom;
        const newPanX = cx - (cx - pinchRef.current.pan.x) * (nz / oldZoom);
        const newPanY = cy - (cy - pinchRef.current.pan.y) * (nz / oldZoom);
        const containerW = rect.width;
        const containerH = rect.height;
        const maxPanX = Math.max(0, canvasSize.w * nz - containerW);
        const maxPanY = Math.max(0, canvasSize.h * nz - containerH);
        setPan({
          x: Math.max(-maxPanX, Math.min(0, newPanX)),
          y: Math.max(-maxPanY, Math.min(0, newPanY)),
        });
      }
      setZoom(nz);
      return;
    }
    if (e.touches?.length > 1) return;

    // Single-finger pan — always enabled (canvas may be wider than container)
    const containerW = canvasRef?.current?.parentElement?.clientWidth || canvasSize.w;
    const containerH = canvasRef?.current?.parentElement?.clientHeight || canvasSize.h;
    if (panStartRef.current && e.touches?.length === 1 && dragging === null && draggingBunker === null) {
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5 || panStartRef.current.moved) {
        panStartRef.current.moved = true;
        // Clamp pan: horizontal limited by canvas width vs container, vertical by zoom
        const maxPanX = Math.max(0, canvasSize.w * zoom - containerW);
        const maxPanY = Math.max(0, canvasSize.h * zoom - containerH);
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

    // Existing player drag
    if (dragging !== null && mode === 'place') {
      if (!longPressPos.current?.isNew) {
        clearTimeout(longPressTimer.current); longPressTimer.current = null;
      }
      onMovePlayer?.(dragging, pos);
    }
  };

  const handleUp = (e) => {
    // Prevent mouse events if touch was used
    if (e?.type === 'touchend') {
      usedTouchRef.current = true;
    } else if (usedTouchRef.current && (e?.type === 'mouseup' || e?.type === 'mouseleave')) {
      return;
    }
    const {
      canvasSize, mode, players, selectedPlayer,
      toolbarPlayer, toolbarItems, bunkers,
      showVisibility,
      onPlacePlayer, onPlaceShot, onToolbarAction,
      onVisibilityTap, onBumpPlayer,
    } = stateRef.current;
    const dragging = draggingRef.current;

    const wasPanning = panStartRef.current?.moved;
    pinchRef.current = null;
    panStartRef.current = null;
    calDragRef.current = null;
    setActiveTouchPos(null);
    if (wasPanning) return;
    clearTimeout(longPressTimer.current); longPressTimer.current = null;

    // Toolbar close: handled in handleDown via onSelectPlayer toggle
    // Safety: also close here if toolbar still open after a non-drag tap on empty space
    if (stateRef.current.toolbarPlayer !== null && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (!pos || pos.isNew) {
        // Tap was on empty space — close toolbar
        stateRef.current.onToolbarAction?.('close', stateRef.current.toolbarPlayer);
        longPressPos.current = null;
        dragStartRef.current = null;
        setDraggingBunker(null);
        setDragging(null); didLongPress.current = false;
        return;
      }
    }

    // Quick tap in shoot mode = place shot instantly
    if (mode === 'shoot' && !didLongPress.current && selectedPlayer !== null && players[selectedPlayer]) {
      const pos = longPressPos.current;
      if (pos?.isShot && !findShot(pos)) onPlaceShot?.(selectedPlayer, { ...pos, isKill: false });
    }
    // Quick tap in place mode = place player instantly
    if (mode === 'place' && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos?.isNew && players.filter(Boolean).length < 5) {
        onPlacePlayer?.(pos); try { navigator.vibrate?.(15); } catch (e) {}
      }
    }
    // Visibility tap
    if (showVisibility && onVisibilityTap && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos) {
        const hitBunker = bunkers.find(b => {
          const dx = (b.x - pos.x) * canvasSize.w;
          const dy = (b.y - pos.y) * canvasSize.h;
          return Math.sqrt(dx * dx + dy * dy) < 20;
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

  return { handleDown, handleMove, handleUp };
}
