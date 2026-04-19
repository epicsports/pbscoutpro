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

  // Zone editor state — unified for all 3 zones (danger/sajgon/bigMove).
  // zoneStartRef: tap start, placement on release (new-point or close-polygon).
  // zoneDragRef: vertex drag session — { pointIdx, zoneType, startPos, hasMoved }.
  const zoneStartRef = { current: null };
  const zoneDragRef = { current: null };
  const draggingBumpRef = { current: null }; // playerIdx when dragging a bump stop

  // Zone editor — 44px touch targets (Apple HIG) for vertex/midpoint/delete hits.
  const ZONE_HIT_RADIUS_PX = 22;

  const getEditPoints = () => {
    const { layoutEditMode, editDangerPoints, editSajgonPoints, editBigMovePoints } = stateRef.current;
    if (layoutEditMode === 'danger') return editDangerPoints;
    if (layoutEditMode === 'sajgon') return editSajgonPoints;
    if (layoutEditMode === 'bigMove') return editBigMovePoints;
    return null;
  };
  const isZoneEditMode = () => {
    const m = stateRef.current.layoutEditMode;
    return m === 'danger' || m === 'sajgon' || m === 'bigMove';
  };
  const findZoneVertex = (pos) => {
    const editPts = getEditPoints();
    if (!editPts || editPts.length === 0) return -1;
    const { canvasSize } = stateRef.current;
    const { w, h } = canvasSize;
    for (let i = 0; i < editPts.length; i++) {
      const dx = (editPts[i].x - pos.x) * w;
      const dy = (editPts[i].y - pos.y) * h;
      if (Math.sqrt(dx * dx + dy * dy) < ZONE_HIT_RADIUS_PX) return i;
    }
    return -1;
  };
  const findZoneMidpoint = (pos) => {
    const editPts = getEditPoints();
    if (!editPts || editPts.length < 2) return -1;
    const { canvasSize } = stateRef.current;
    const { w, h } = canvasSize;
    for (let i = 0; i < editPts.length; i++) {
      const next = (i + 1) % editPts.length;
      // Skip closing edge if polygon not yet triangle
      if (next === 0 && editPts.length < 3) continue;
      const mx = (editPts[i].x + editPts[next].x) / 2;
      const my = (editPts[i].y + editPts[next].y) / 2;
      const dx = (mx - pos.x) * w;
      const dy = (my - pos.y) * h;
      if (Math.sqrt(dx * dx + dy * dy) < ZONE_HIT_RADIUS_PX) return i; // insertAfter idx
    }
    return -1;
  };
  const findZoneDeleteButton = (pos) => {
    const { canvasSize, selectedZoneVertex } = stateRef.current;
    const editPts = getEditPoints();
    if (!editPts || typeof selectedZoneVertex !== 'number' || selectedZoneVertex < 0) return false;
    if (editPts.length <= 3) return false; // minimum triangle — no delete
    const p = editPts[selectedZoneVertex];
    if (!p) return false;
    const { w, h } = canvasSize;
    const bx = p.x * w + 22;
    const by = p.y * h - 22;
    const dx = bx - pos.x * w;
    const dy = by - pos.y * h;
    return Math.sqrt(dx * dx + dy * dy) < ZONE_HIT_RADIUS_PX;
  };

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
      editDangerPoints, editSajgonPoints, editBigMovePoints,
      onPlacePlayer, onSelectPlayer, onPlaceShot, onDeleteShot,
      onBunkerPlace, onZonePoint, onZoneClose, onCalibrationMove,
    } = stateRef.current;

    // Pinch
    if (e.touches?.length === 2) {
      pinchRef.current = { dist: getTouchDist(e), zoom, pan: { ...pan } };
      panStartRef.current = null;
      setActiveTouchPos(null);
      clearTimeout(longPressTimer.current);
      longPressPos.current = null; // Prevent placement on handleUp
      didLongPress.current = true; // Mark as non-tap
      zoneStartRef.current = null; // Cancel zone placement
      return;
    }
    if (e.touches?.length > 2) return;

    // Single-finger / mouse: track for potential pan
    if (e.touches?.length === 1) {
      panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y, moved: false };
    } else if (!e.touches) {
      // Mouse event
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, moved: false };
    }

    // Loupe: track pixel position for magnifier (skip if all 5 players placed & not dragging)
    const allPlaced = players.filter(Boolean).length >= 5;
    if ((editable || layoutEditMode) && (e.touches?.length === 1 || !e.touches) && !(allPlaced && draggingRef.current === null)) {
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

    // ── Zone edit modes — unified polygon editor (Google-Maps style) ──
    if (isZoneEditMode()) {
      // Priority 0: tap on delete button (only when a vertex is selected)
      if (findZoneDeleteButton(pos)) {
        const { onZonePointDelete, selectedZoneVertex, onZoneVertexSelect } = stateRef.current;
        onZonePointDelete?.({ pointIdx: selectedZoneVertex });
        onZoneVertexSelect?.(-1); // clear selection after delete
        didLongPress.current = true;
        return;
      }
      // Priority 1: tap on existing vertex → start drag session
      const vertexIdx = findZoneVertex(pos);
      if (vertexIdx >= 0) {
        zoneDragRef.current = {
          pointIdx: vertexIdx,
          zoneType: layoutEditMode,
          startPos: pos,
          hasMoved: false,
        };
        didLongPress.current = true;
        return;
      }
      // Priority 2: tap on midpoint ghost → insert new vertex + immediately drag it
      const midpointAfterIdx = findZoneMidpoint(pos);
      if (midpointAfterIdx >= 0) {
        const { onZoneMidpointInsert } = stateRef.current;
        onZoneMidpointInsert?.({ insertAfterIdx: midpointAfterIdx, pos });
        zoneDragRef.current = {
          pointIdx: midpointAfterIdx + 1,
          zoneType: layoutEditMode,
          startPos: pos,
          hasMoved: true, // suppress tap-release selection logic
        };
        didLongPress.current = true;
        return;
      }
      // Priority 3: empty canvas — defer to handleUp (new point or deselect)
      zoneStartRef.current = pos;
      didLongPress.current = true;
      return;
    }
    if (layoutEditMode === 'bunker') {
      const { w, h } = canvasSize;
      const labelFont = Math.max(10, Math.min(15, w * 0.026));
      const lh = Math.round(labelFont * 1.8);
      for (const b of bunkers) {
        const bx = b.x * w, by = b.y * h;
        const displayName = b.positionName || b.name || b.type || '';
        const tw_approx = displayName.length * labelFont * 0.62 + Math.round(labelFont * 0.7) * 2;
        const pillMidY = by - lh / 2 - 4;

        // Anchor dot — start drag (edit on release if no movement)
        const dxAnch = (b.x - pos.x) * w, dyAnch = (b.y - pos.y) * h;
        if (Math.sqrt(dxAnch * dxAnch + dyAnch * dyAnch) < 30) {
          setDraggingBunker(b.id);
          draggingBunkerRef.current = b.id;
          dragStartRef.current = { x: pos.x, y: pos.y };
          try { navigator.vibrate?.(10); } catch (e) {}
          return;
        }

        // Pill click — start label drag
        const dxLbl = (bx / w - pos.x) * w;
        const dyLbl = (pillMidY / h - pos.y) * h;
        if (Math.abs(dxLbl) < tw_approx / 2 + 10 && Math.abs(dyLbl) < lh / 2 + 6) {
          setDraggingBunker('label:' + b.id);
          draggingBunkerRef.current = 'label:' + b.id;
          dragStartRef.current = { x: pos.x, y: pos.y };
          try { navigator.vibrate?.(10); } catch (e) {}
          return;
        }
      }
      // Empty space: mark for new bunker creation on handleUp (don't block panning)
      longPressPos.current = { ...pos, isBunkerCreate: true };
      return;
    }

    if (mode === 'shoot') {
      const hitShot = findShot(pos, selectedPlayer);
      if (hitShot) {
        // Don't delete immediately — defer to handleUp (tap only, not drag)
        longPressPos.current = { ...pos, isShot: true, deleteShot: hitShot };
        return;
      }
      // Mark position for instant placement on handleUp
      longPressPos.current = { ...pos, isShot: true };
      return;
    }

    const hit = findPlayer(pos);
    if (hit >= 0) {
      // Start drag — toolbar opens on release (handleUp) if no drag occurred
      setDragging(hit);
      dragStartRef.current = { x: players[hit].x, y: players[hit].y };
      longPressPos.current = { ...pos, isNew: false, hitPlayer: hit };
    } else {
      // Check bump stop hit
      const { bumpStops, onMoveBumpStop } = stateRef.current;
      const bumpHit = onMoveBumpStop && bumpStops ? bumpStops.findIndex(bs => {
        if (!bs) return false;
        const dx = (bs.x - pos.x) * canvasSize.w, dy = (bs.y - pos.y) * canvasSize.h;
        return Math.sqrt(dx * dx + dy * dy) < 22;
      }) : -1;
      if (bumpHit >= 0) {
        draggingBumpRef.current = bumpHit;
        dragStartRef.current = { x: bumpStops[bumpHit].x, y: bumpStops[bumpHit].y };
        didLongPress.current = true;
      } else if (stateRef.current.toolbarPlayer !== null) {
      // Toolbar is open but tapped empty space — close toolbar
      onToolbarAction?.('close', stateRef.current.toolbarPlayer);
      longPressPos.current = null;
      } else if (stateRef.current.onEmptyTap) {
      // No player hit, no toolbar — notify parent (closes QuickShotPanel etc.)
      stateRef.current.onEmptyTap();
      if (players.filter(Boolean).length < 5) {
        longPressPos.current = { ...pos, isNew: true };
      }
      } else if (players.filter(Boolean).length < 5) {
      // Empty space, no toolbar — mark for placement on handleUp
      longPressPos.current = { ...pos, isNew: true };
      }
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

    // Zone vertex drag: continuous position updates
    if (zoneDragRef.current) {
      const pos = getRelPos(e);
      const { onZonePointMove } = stateRef.current;
      onZonePointMove?.({ pointIdx: zoneDragRef.current.pointIdx, pos });
      zoneDragRef.current.hasMoved = true;
      return;
    }

    // Loupe: update position (skip if all 5 players placed & not dragging)
    const allPlaced = players.filter(Boolean).length >= 5;
    if ((e.touches?.length === 1 || !e.touches) && (editable || layoutEditMode) && !(allPlaced && draggingRef.current === null)) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      setActiveTouchPos({ x: cx - rect.left, y: cy - rect.top });
    }
    if (e.touches?.length === 2 && pinchRef.current) {
      const newDist = getTouchDist(e);
      const scale = newDist / pinchRef.current.dist;
      const nz = Math.max(1, Math.min(5, pinchRef.current.zoom * scale));
      
      // Zoom relative to center of visible area
      const container = canvasRef.current?.parentElement;
      const rect = container?.getBoundingClientRect();
      if (rect) {
        // Pinch center in container coords
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const oldZoom = pinchRef.current.zoom;
        // Keep the point under pinch center fixed
        const fieldX = (cx - pinchRef.current.pan.x) / oldZoom;
        const fieldY = (cy - pinchRef.current.pan.y) / oldZoom;
        const newPanX = cx - fieldX * nz;
        const newPanY = cy - fieldY * nz;
        const maxPanX = Math.max(0, canvasSize.w * nz - rect.width);
        const maxPanY = Math.max(0, canvasSize.h * nz - rect.height);
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
    if (panStartRef.current && (e.touches?.length === 1 || !e.touches) && dragging === null && draggingBunker === null) {
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = cx - panStartRef.current.x;
      const dy = cy - panStartRef.current.y;
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12 || panStartRef.current.moved) {
        if (!panStartRef.current.moved) {
          // Pan just started — cancel pending placement UNLESS loupe is active (long press)
          if (!didLongPress.current) {
            longPressPos.current = null;
          }
          clearTimeout(longPressTimer.current); longPressTimer.current = null;
        }
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
    // Bump stop drag
    if (draggingBumpRef.current !== null) {
      const { onMoveBumpStop } = stateRef.current;
      onMoveBumpStop?.(draggingBumpRef.current, pos);
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
    if (wasPanning) {
      zoneStartRef.current = null;
      // If user was fine-positioning a new player via loupe, place at final position
      if (longPressPos.current?.isNew && mode === 'place' && players.filter(Boolean).length < 5) {
        // touchend has no e.touches — use changedTouches or mouse coords
        try {
          const { zoom, pan, canvasSize: cs } = stateRef.current;
          const rect = canvasRef.current.getBoundingClientRect();
          const cx = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
          const cy = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
          const canvasX = (cx - rect.left - pan.x) / zoom;
          const canvasY = (cy - rect.top - pan.y) / zoom;
          const finalPos = {
            x: Math.max(0, Math.min(1, canvasX / cs.w)),
            y: Math.max(0, Math.min(1, canvasY / cs.h)),
          };
          onPlacePlayer?.(finalPos); try { navigator.vibrate?.(15); } catch (ee) {}
        } catch (_) {}
        dragStartRef.current = null;
        setDraggingBunker(null);
        setDragging(null); didLongPress.current = false; longPressPos.current = null;
      }
      return;
    }
    clearTimeout(longPressTimer.current); longPressTimer.current = null;

    // ── Zone vertex drag end: either select (if no movement) or just end drag ──
    if (zoneDragRef.current) {
      const ref = zoneDragRef.current;
      zoneDragRef.current = null;
      zoneStartRef.current = null;
      if (!ref.hasMoved) {
        const editPts = getEditPoints();
        const { onZoneVertexSelect } = stateRef.current;
        // Tap on first vertex with ≥3 points closes the polygon (legacy behavior).
        if (ref.pointIdx === 0 && editPts && editPts.length >= 3) {
          const { onZoneClose } = stateRef.current;
          onZoneClose?.();
          didLongPress.current = false;
          return;
        }
        // Tap on any vertex of a completed polygon selects it (shows delete btn).
        if (editPts && editPts.length >= 3) {
          onZoneVertexSelect?.(ref.pointIdx);
        }
      }
      didLongPress.current = false;
      return;
    }

    // ── Zone empty-canvas tap: add point (drawing) or deselect (editing) ──
    if (zoneStartRef.current) {
      const pos = zoneStartRef.current;
      zoneStartRef.current = null;
      const { onZonePoint, onZoneClose, onZoneVertexSelect, selectedZoneVertex, canvasSize } = stateRef.current;
      const editPts = getEditPoints() || [];
      // Deselect if a vertex was selected.
      if (editPts.length >= 3 && typeof selectedZoneVertex === 'number' && selectedZoneVertex >= 0) {
        onZoneVertexSelect?.(-1);
        didLongPress.current = false;
        return;
      }
      // Defensive: tap very close to first vertex closes (handleDown should have caught it).
      if (editPts.length >= 3) {
        const fp = editPts[0];
        const dx = (fp.x - pos.x) * canvasSize.w, dy = (fp.y - pos.y) * canvasSize.h;
        if (Math.sqrt(dx * dx + dy * dy) < 16) { onZoneClose?.(); didLongPress.current = false; return; }
        // Polygon is complete — empty-canvas taps no longer add vertices.
        // User must drag a midpoint ghost to insert. This matches Google Maps UX.
        didLongPress.current = false;
        return;
      }
      // Drawing phase (<3 points): tap adds a new vertex.
      onZonePoint?.(pos);
      didLongPress.current = false;
      return;
    }

    // Safety: also close here if toolbar still open after a non-drag tap on empty space
    if (stateRef.current.toolbarPlayer !== null && !didLongPress.current && dragging === null && e?.type !== 'mouseleave') {
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

    // New bunker on tap release (bunker edit mode, empty space, no panning)
    if (!didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos?.isBunkerCreate) {
        const { onBunkerPlace } = stateRef.current;
        onBunkerPlace?.(pos); try { navigator.vibrate?.(10); } catch (e) {}
        dragStartRef.current = null;
        setDraggingBunker(null);
        setDragging(null); didLongPress.current = false; longPressPos.current = null;
        return;
      }
    }

    // Quick tap in shoot mode = place or delete shot
    if (mode === 'shoot' && !didLongPress.current && !wasPanning && selectedPlayer !== null && players[selectedPlayer]) {
      const pos = longPressPos.current;
      if (pos?.isShot) {
        if (pos.deleteShot) {
          onDeleteShot?.(pos.deleteShot.playerIdx, pos.deleteShot.shotIdx);
        } else if (!findShot(pos)) {
          onPlaceShot?.(selectedPlayer, { ...pos, isKill: false });
        }
      }
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
    // Player tap detection: if player was tapped (not dragged), open toolbar
    if (dragging !== null && dragStartRef.current && players[dragging]) {
      const start = dragStartRef.current;
      const end = players[dragging];
      const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      if (dist <= 0.02) {
        // Tap — open toolbar on release
        const { onSelectPlayer } = stateRef.current;
        onSelectPlayer?.(dragging);
      }
    }
    // Bunker tap detection: if bunker was tapped (not dragged), open edit sheet
    const db = draggingBunkerRef.current;
    if (db && typeof db === 'string' && !db.startsWith('label:') && dragStartRef.current) {
      const { onBunkerPlace } = stateRef.current;
      const b = stateRef.current.bunkers.find(bk => bk.id === db);
      if (b) {
        // Compare bunker's current pos to drag start — if barely moved, it's a tap
        const dx = (b.x - dragStartRef.current.x) * canvasSize.w;
        const dy = (b.y - dragStartRef.current.y) * canvasSize.h;
        if (Math.sqrt(dx * dx + dy * dy) < 8) {
          onBunkerPlace?.({ x: b.x, y: b.y });
        }
      }
    }
    dragStartRef.current = null;
    setDraggingBunker(null);
    setDragging(null); didLongPress.current = false; longPressPos.current = null;
    draggingBumpRef.current = null;
  };

  return { handleDown, handleMove, handleUp };
}
