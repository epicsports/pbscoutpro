import React, { useRef, useEffect, useState, createContext, useContext } from 'react';
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

  // ── Draw layer — render-prop `(ctx, w, h, state) => void`. ──
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
      if (sizingStrategy === 'height-first' || maxCanvasHeight) {
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
  // eslint-disable-next-line no-unused-vars
  const [dragging, setDragging] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [draggingBunker, setDraggingBunker] = useState(null);
  const loupeSourceRef = useRef(null);
  const draggingRef = useRef(null);
  const draggingBunkerRef = useRef(null);
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
  //    Updated every render so the handler sees fresh callbacks/state. ──
  const stateRef = useRef({});
  stateRef.current = {
    canvasSize,
    zoom,
    pan: panState,
    viewportSide,
    onPlacePlayer, onMovePlayer, onPlaceShot, onDeleteShot,
    onBumpStop, onSelectPlayer, onMoveBumpStop, onEmptyTap,
  };

  // ── Touch handler attachment — collectively gated by any-gesture-on.
  //    Imperative attachment with `{passive: false}` so handlers can call
  //    preventDefault (React synthetic touch events are passive). Mouse
  //    handlers are attached via JSX on the <canvas> below. ──
  const gesturesEnabled = pinchZoom || pan || loupe;
  useEffect(() => {
    if (!gesturesEnabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const handler = createTouchHandler({
      canvasRef, stateRef, draggingRef, draggingBunkerRef,
      setZoom, setPan: setPanState, setDragging, setDraggingBunker,
      setActiveTouchPos,
      pinchRef, longPressTimer, longPressPos, didLongPress,
      calDragRef, dragStartRef, panStartRef, lastTapRef,
    });
    const opts = { passive: false };
    canvas.addEventListener('touchstart', handler.handleDown, opts);
    canvas.addEventListener('touchmove', handler.handleMove, opts);
    canvas.addEventListener('touchend', handler.handleUp, opts);
    canvas.addEventListener('touchcancel', handler.handleUp, opts);
    canvasRef._mouseHandler = handler; // expose for JSX mouse handlers below
    return () => {
      canvas.removeEventListener('touchstart', handler.handleDown, opts);
      canvas.removeEventListener('touchmove', handler.handleMove, opts);
      canvas.removeEventListener('touchend', handler.handleUp, opts);
      canvas.removeEventListener('touchcancel', handler.handleUp, opts);
      canvasRef._mouseHandler = null;
    };
  }, [gesturesEnabled]);

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
        activeTouchPos, loupeSourceRef,
      });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [canvasSize.w, canvasSize.h, zoom, panState.x, panState.y, activeTouchPos, draw]);

  const ctxValue = {
    canvasRef, canvasSize,
    zoom, pan: panState,
    activeTouchPos, loupeSourceRef,
    isLandscape, viewportSide,
  };

  return (
    <BaseCanvasContext.Provider value={ctxValue}>
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            // Suppress browser gestures (scroll/zoom) when our handler owns touch.
            touchAction: gesturesEnabled ? 'none' : 'auto',
          }}
          // Mouse handlers — React synthetic events. Touch is attached
          // imperatively above for { passive: false }.
          onMouseDown={(e) => canvasRef._mouseHandler?.handleDown(e)}
          onMouseMove={(e) => canvasRef._mouseHandler?.handleMove(e)}
          onMouseUp={(e) => canvasRef._mouseHandler?.handleUp(e)}
          onMouseLeave={(e) => canvasRef._mouseHandler?.handleUp(e)}
        />
        {children}
      </div>
    </BaseCanvasContext.Provider>
  );
}
