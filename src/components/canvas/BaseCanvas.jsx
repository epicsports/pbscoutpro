import React, { useRef, useEffect, useState, createContext, useContext } from 'react';
import { COLORS } from '../../utils/theme';
import { useLandscapeMode } from '../../hooks/useLandscapeMode';
import { createTouchHandler } from '../field/touchHandler';

/**
 * BaseCanvas — § 64.3 cross-cutting canvas infrastructure component.
 *
 * Owns the 7 concerns from § 64.3 (and only those):
 *   1. <canvas> DOM element + ref forwarding to specialized children.
 *   2. DPR scaling — `window.devicePixelRatio || 2` (§ 64.8.5).
 *   3. Sizing strategy — `sizingStrategy: 'width-first' | 'height-first'` +
 *      `maxCanvasHeight: number | null`.
 *   4. ResizeObserver — single setup, single handler (avoid the
 *      `parent.clientHeight` infinite-zoom feedback loop noted in
 *      `CANVAS_ARCHITECTURE.md` § 2.1).
 *   5. Landscape integration — consumes `useLandscapeMode`.
 *   6. Safe-area — DOCUMENTED EXPECTATION: the parent page provides safe-area
 *      padding; BaseCanvas does NOT read `env(safe-area-inset-*)` directly.
 *      (Matches Phase 0 finding C6.)
 *   7. `viewportSide: null | 'left' | 'right'` half-field clipping — promoted
 *      from FieldCanvas's currently-dormant prop per § 64.8.3.
 *
 * Plus § 64.4 gesture composition: reuses the existing `createTouchHandler`
 * factory with opt-in props (`pinchZoom` / `pan` / `loupe`). See the
 * "Gesture-gate caveat" below.
 *
 * Does NOT render content (no `drawField` / `drawPlayers` / `drawZones`
 * imports — those stay in the eventual `InteractiveCanvas` and friends).
 * The `draw` render-prop is how a specialized child paints onto BaseCanvas's
 * <canvas>; gesture/transform state is exposed via the `draw` arg + via
 * `BaseCanvasContext` for chrome.
 *
 * ─── Step 2 status (§ 64.9) ─────────────────────────────────────────────
 * Step 2 (`feat/canvas-step2-basecanvas`) is ADDITIVE — no consumer renders
 * BaseCanvas yet. The 8 current call-sites stay on
 * `FieldCanvas` / `HeatmapCanvas` / `FieldView` until their migration briefs
 * land (steps #4 → #7 + #11 per § 64.9). The contract below is the future
 * shape these consumers will transplant onto; nothing about this file
 * changes user-facing behavior today.
 *
 * ─── ⚠ Gesture-gate caveat (Step 2 limitation) ─────────────────────────
 * `createTouchHandler` is monolithic — pinch / pan / loupe / placement all
 * sit in one closure (`./field/touchHandler.js`). This brief excludes
 * touching that file. Therefore the `pinchZoom` / `pan` / `loupe` props
 * are **collectively** gated in this Step 2 implementation:
 *
 *   any of the three true  →  attach the handler (all gestures active)
 *   all three false        →  do not attach (read-only canvas)
 *
 * The API shape matches § 64.4 (three named opt-ins) so future consumers
 * can opt in granularly without a signature break. Granular per-gesture
 * gating becomes real when `touchHandler` is refactored (out of Step 2
 * scope).
 *
 * The placement callbacks (`onPlacePlayer` / `onPlaceShot` / `onMovePlayer` /
 * etc.) are pass-through props. When a specialized child doesn't supply
 * them (e.g. a read-only heatmap), the handler's optional-chained calls
 * become no-ops — no behavior leakage.
 *
 * ─── Composition pattern ───────────────────────────────────────────────
 * Two complementary mechanisms:
 *   (a) `draw` prop — render-prop callback `(ctx, w, h, state) => void`,
 *       called inside BaseCanvas's draw effect. `state` = `{ canvas,
 *       canvasSize, zoom, pan, activeTouchPos, loupeSourceRef }`. The
 *       2D context is pre-transformed with DPR + zoom + pan before the
 *       callback fires; child draw helpers paint at world coords.
 *   (b) `children` — React JSX rendered as siblings of the <canvas>
 *       (toolbar, reset-zoom button, badges, etc.). Chrome reads gesture
 *       state via `useBaseCanvas()` if needed.
 */

export const BaseCanvasContext = createContext(null);
export function useBaseCanvas() { return useContext(BaseCanvasContext); }

export default function BaseCanvas({
  // ── Sizing (§ 64.3) ──
  sizingStrategy = 'width-first',     // 'width-first' | 'height-first'
  maxCanvasHeight = null,             // null = no cap (width-first behavior)

  // ── Background image (drives aspect ratio when present) ──
  fieldImage = null,

  // ── Half-field clipping (§ 64.8.3) ──
  viewportSide = null,                // null | 'left' | 'right'

  // ── Gesture opt-ins (§ 64.4) — see "Gesture-gate caveat" above ──
  pinchZoom = false,
  pan = false,
  loupe = false,

  // ── Touch / place callbacks — pass-through to createTouchHandler.
  //    A specialized child passes only what it needs; absent ones become
  //    no-ops via optional chaining inside the handler. ──
  onPlacePlayer, onMovePlayer, onPlaceShot, onDeleteShot,
  onBumpStop, onSelectPlayer, onMoveBumpStop, onEmptyTap,

  // ── § 77 Draw Stage 1 — drawMode + draw callbacks (iPad/PencilKit arbiter).
  //    When `drawMode` is true:
  //      • 1-finger → routes to `onDrawStart/Move/End(fieldPt)` (`fieldPt` is
  //        the normalized 0..1 canvas-relative point from `getRelPos`);
  //      • 2-fingers → unchanged zoom/pan (pinch path early-returns BEFORE
  //        drawMode dispatch);
  //      • 2nd finger landing mid-stroke → `onDrawAbort()` then pinch starts;
  //      • all existing field-edit dispatch (place/select/bump/shot/etc.) is
  //        SUSPENDED — the page's `editable` flag stays as-is but tap/drag
  //        events route to draw instead of field edits.
  //    No event-forwarding — draw lives inside touchHandler's single dispatch.
  //    Consumer holds the stroke state and the perfect-freehand engine; this
  //    branch just delivers normalized points. See DrawingOverlay (render-only)
  //    + the page-level draw state (MatchPage). ──
  drawMode = false,
  onDrawStart, onDrawMove, onDrawEnd, onDrawAbort,

  // ── Specialized-child feature state for touchHandler (§ 64.9 Step #4
  //    contract evolution). `touchHandler` reads ~25 fields from `stateRef`
  //    beyond the infra fields BaseCanvas owns (players / mode / bunkers /
  //    selectedZoneVertex / various callbacks / etc.). Specialized children
  //    pass them as one object; BaseCanvas merges into `stateRef` so
  //    `touchHandler` sees the whole world. Default empty = read-only
  //    canvas (no feature surface). ──
  touchHandlerState = {},

  // ── Canvas cursor — mode-dependent in InteractiveCanvas (crosshair for
  //    placement modes, pointer for select, default otherwise). ──
  cursor = 'default',

  // ── Draw layer — render-prop `(ctx, w, h, state) => void`.
  //    `state` includes `imgObj` (loaded from `fieldImage`) so specialized
  //    children's `drawField(...)` call has the bg image. ──
  draw,

  // ── Chrome — siblings of the <canvas>. ──
  children,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { isLandscape } = useLandscapeMode();

  // ── Image load (drives aspect) ──
  const [imgObj, setImgObj] = useState(null);
  useEffect(() => {
    if (!fieldImage) { setImgObj(null); return undefined; }
    const img = new Image();
    let cancelled = false;
    img.onload = () => { if (!cancelled) setImgObj(img); };
    img.src = fieldImage;
    return () => { cancelled = true; };
  }, [fieldImage]);

  // ── Sizing + ResizeObserver ──
  // Note: observe the CONTAINER, never the canvas itself — that's the
  // infinite-zoom feedback loop (CANVAS_ARCHITECTURE § 2.1).
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const aspect = imgObj && imgObj.naturalHeight
      ? imgObj.naturalWidth / imgObj.naturalHeight
      : 2;
    const compute = () => {
      const containerW = node.clientWidth;
      let w, h;
      if (sizingStrategy === 'fit') {
        // object-fit:contain — pick the smaller axis as the constraint so
        // the canvas always fits inside both container width AND the
        // viewport-derived height cap. Defaults to `window.innerHeight`
        // when `maxCanvasHeight` is not provided (read-only consumers
        // typically don't need the per-site offset table from
        // `useLandscapeMode.canvasMaxHeight`). Fixes the landscape
        // overflow on HeatmapCanvas surfaces (ScoutedTeam etc.) without
        // changing portrait behavior — in portrait, width-first wins
        // because `containerH * aspect ≫ containerW`. (§ 76 hotfix #2.)
        const maxH = maxCanvasHeight
          ? Math.max(200, maxCanvasHeight)
          : (typeof window !== 'undefined' ? window.innerHeight : containerW / aspect);
        const widthFromHeight = maxH * aspect;
        w = Math.min(containerW, widthFromHeight);
        h = w / aspect;
      } else if (sizingStrategy === 'height-first' || maxCanvasHeight) {
        // Height-first: cap height; width = height × aspect (may exceed
        // container — viewportSide / pan handles clipping if needed).
        h = maxCanvasHeight
          ? Math.max(200, maxCanvasHeight)
          : node.clientHeight;
        w = h * aspect;
      } else {
        // Width-first: width = container; height = width / aspect.
        w = containerW;
        h = w / aspect;
      }
      setCanvasSize({ w, h });
    };
    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(node);
    return () => obs.disconnect();
  }, [imgObj, maxCanvasHeight, sizingStrategy]);

  // ── Gesture state ──
  const [zoom, setZoom] = useState(1);
  const [panState, setPanState] = useState({ x: 0, y: 0 });
  const [activeTouchPos, setActiveTouchPos] = useState(null);
  // Wrapped setters per FieldCanvas:81-86 — touchHandler reads the ref in
  // handleMove (drag-player path) + handleUp (tap detection); raw useState
  // setters freeze the ref at null → silent tap/drag death. PROJECT_GUIDELINES
  // § 9 anti-pattern. The state values themselves stay so future render-time
  // consumers (chrome, draw-effect deps) can read them.
  // eslint-disable-next-line no-unused-vars
  const [dragging, _setDragging] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [draggingBunker, _setDraggingBunker] = useState(null);
  // A2 v2 — shot-drag sentinel. State value mirrors the ref so render-time
  // consumers (e.g. ShotDrawer's chrome / cursor change) can read it; ref
  // is what touchHandler reads at gesture-time. PROJECT_GUIDELINES § 9 —
  // ref-wrapped setter is load-bearing.
  // eslint-disable-next-line no-unused-vars
  const [draggingShot, _setDraggingShot] = useState(null);
  const loupeSourceRef = useRef(null);
  const draggingRef = useRef(null);
  const draggingBunkerRef = useRef(null);
  const draggingShotRef = useRef(null);
  // § 77 — Stroke-in-progress sentinel for the draw arbiter. Owned by
  // BaseCanvas (sibling of draggingRef) so handleDown/Move/Up can read/write
  // it imperatively without React re-renders during a stroke.
  const drawingRef = useRef(false);
  const setDragging = (v) => { draggingRef.current = v; _setDragging(v); };
  const setDraggingBunker = (v) => { draggingBunkerRef.current = v; _setDraggingBunker(v); };
  const setDraggingShot = (v) => { draggingShotRef.current = v; _setDraggingShot(v); };
  const pinchRef = useRef(null);
  const longPressTimer = useRef(null);
  const longPressPos = useRef(null);
  const didLongPress = useRef(false);
  const calDragRef = useRef(null);
  const dragStartRef = useRef(null);
  const panStartRef = useRef(null);
  const lastTapRef = useRef(null);

  // ── viewportSide half-field clipping (§ 64.8.3) ──
  // When `viewportSide` is set, force zoom=1 and pan the canvas so the
  // requested half stays visible inside the container. Transplanted from
  // FieldCanvas L204-216 — same semantics.
  useEffect(() => {
    if (!viewportSide || !imgObj || canvasSize.w <= 0) return;
    const containerW = containerRef.current?.clientWidth || canvasSize.w;
    setZoom(1);
    if (viewportSide === 'right') {
      setPanState({ x: -Math.max(0, canvasSize.w - containerW), y: 0 });
    } else {
      setPanState({ x: 0, y: 0 });
    }
  }, [viewportSide, imgObj, canvasSize.w]);

  // ── stateRef — what createTouchHandler reads at handler-fire time.
  //    Updated every render so the handler sees fresh callbacks/state.
  //    BaseCanvas contributes infra + gesture state + the standard callbacks;
  //    specialized child contributes feature state via `touchHandlerState`. ──
  const stateRef = useRef({});
  stateRef.current = {
    // Specialized-child feature state goes first so BaseCanvas's own infra
    // fields below win on key collision (e.g. `canvasSize` is BaseCanvas's).
    ...touchHandlerState,
    canvasSize,
    zoom,
    pan: panState,
    viewportSide,
    dragging,
    draggingBunker,
    onPlacePlayer, onMovePlayer, onPlaceShot, onDeleteShot,
    onBumpStop, onSelectPlayer, onMoveBumpStop, onEmptyTap,
    // § 77 — draw arbiter
    drawMode,
    onDrawStart, onDrawMove, onDrawEnd, onDrawAbort,
  };

  // ── Touch handler attachment — collectively gated by any-handler-need-on.
  //    The draw arbiter (§ 77 / § 78) lives INSIDE `createTouchHandler` and
  //    its dispatch is unreachable without an attached handler. So `drawMode`
  //    must trigger attachment too, even on read-only-otherwise canvases
  //    (HeatmapCanvas on ScoutedTeam Coach Plan defaults pinchZoom=pan=false
  //    + loupe=false; pre-fix, the gate `gesturesEnabled` left handlerRef
  //    null and both mouse + touch silently no-op'd → § 78 Stage 2 was a
  //    latent silent-fail since 0d135c6f ship. Fix: add drawMode to the
  //    handler-need predicate so any consumer that opts into draw gets
  //    capture even without gestures.
  //    Imperative attachment with `{passive: false}` so handlers can call
  //    preventDefault (React synthetic touch events are passive). Mouse
  //    handlers are attached via JSX on the <canvas> below. ──
  const handlerRef = useRef(null);
  const gesturesEnabled = pinchZoom || pan || loupe;
  const handlerNeeded = gesturesEnabled || drawMode;
  useEffect(() => {
    if (!handlerNeeded) { handlerRef.current = null; return undefined; }
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const handler = createTouchHandler({
      canvasRef, stateRef, draggingRef, draggingBunkerRef, draggingShotRef, drawingRef,
      setZoom, setPan: setPanState, setDragging, setDraggingBunker, setDraggingShot,
      setActiveTouchPos,
      pinchRef, longPressTimer, longPressPos, didLongPress,
      calDragRef, dragStartRef, panStartRef, lastTapRef,
    });
    handlerRef.current = handler;
    const opts = { passive: false };
    canvas.addEventListener('touchstart', handler.handleDown, opts);
    canvas.addEventListener('touchmove', handler.handleMove, opts);
    canvas.addEventListener('touchend', handler.handleUp, opts);
    canvas.addEventListener('touchcancel', handler.handleUp, opts);
    return () => {
      canvas.removeEventListener('touchstart', handler.handleDown, opts);
      canvas.removeEventListener('touchmove', handler.handleMove, opts);
      canvas.removeEventListener('touchend', handler.handleUp, opts);
      canvas.removeEventListener('touchcancel', handler.handleUp, opts);
      handlerRef.current = null;
    };
  }, [handlerNeeded]);

  // ── DPR + draw effect ──
  // Sets canvas backing-store size to (cssSize × DPR), CSS size to cssSize,
  // applies DPR + zoom + pan transform, then delegates to `draw`. Reset at
  // the end so any out-of-band ctx work outside `draw` starts clean.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.w <= 0) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 2;
    canvas.width = Math.round(canvasSize.w * dpr);
    canvas.height = Math.round(canvasSize.h * dpr);
    canvas.style.width = `${canvasSize.w}px`;
    canvas.style.height = `${canvasSize.h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(panState.x, panState.y);
    ctx.scale(zoom, zoom);
    if (draw) {
      draw(ctx, canvasSize.w, canvasSize.h, {
        canvas, canvasSize, zoom, pan: panState,
        activeTouchPos, loupeSourceRef, imgObj,
      });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [canvasSize.w, canvasSize.h, zoom, panState.x, panState.y, activeTouchPos, draw]);

  const ctxValue = {
    canvasRef, containerRef, canvasSize,
    zoom, pan: panState, setZoom, setPan: setPanState,
    activeTouchPos, loupeSourceRef,
    isLandscape, viewportSide,
    imgObj,
  };

  // Two-layer structure transplanted from FieldCanvas:367-451 for visual
  // read-equivalence: OUTER (resize-observed, 100% width) + INNER frame
  // (sized to canvasSize, bordered, overflow:hidden so a height-first canvas
  // wider than the container clips cleanly; margin auto centers it). All
  // chrome children render INSIDE the frame so absolute positioning resolves
  // against the frame's coords.
  return (
    <BaseCanvasContext.Provider value={ctxValue}>
      <div ref={containerRef} style={{ width: '100%' }}>
        <div style={{
          width: canvasSize.w || '100%',
          maxWidth: '100%',
          height: canvasSize.h || 'auto',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 10,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.bg,
          margin: '0 auto',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              width: canvasSize.w, height: canvasSize.h,
              display: 'block',
              cursor,
              // Suppress iOS Safari magnifier/callout + text selection when
              // the handler attaches (touchAction: none also unblocks
              // preventDefault on touchstart). When the handler is NOT
              // needed (no gestures AND no drawMode), allow default touch
              // behavior so page scroll still works on read-only consumers.
              touchAction: handlerNeeded ? 'none' : 'auto',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            // Mouse handlers — React synthetic events. Touch is attached
            // imperatively above for { passive: false }.
            onMouseDown={(e) => handlerRef.current?.handleDown(e)}
            onMouseMove={(e) => handlerRef.current?.handleMove(e)}
            onMouseUp={(e) => handlerRef.current?.handleUp(e)}
            onMouseLeave={(e) => handlerRef.current?.handleUp(e)}
          />
          {children}
        </div>
      </div>
    </BaseCanvasContext.Provider>
  );
}
