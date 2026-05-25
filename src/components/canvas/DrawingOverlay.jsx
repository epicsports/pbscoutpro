import React, { useEffect, useRef } from 'react';
import { useBaseCanvas } from './BaseCanvas';
import { paintStroke, STROKE_SIZES, STROKE_COLORS, FREEHAND_OPTIONS } from './drawStrokes';

// Re-export for back-compat — Stage 1 consumers (MatchPage, DrawToolbar)
// import these from DrawingOverlay. § 78 moved the canonical declarations to
// drawStrokes.js so the static-render path used by HeatmapCanvas shares one
// source-of-truth; re-exporting keeps the import surface stable.
export { STROKE_SIZES, STROKE_COLORS, FREEHAND_OPTIONS };

/**
 * DrawingOverlay — § 77 (Draw Stage 1).
 *
 * Render-only overlay for hand-drawn annotations on top of a BaseCanvas frame.
 * Input is OWNED by BaseCanvas (iPad/PencilKit arbiter model — 1-finger in
 * drawMode routes to the consumer via `onDraw{Start,Move,End,Abort}`;
 * 2-finger zoom/pan untouched; 2nd finger mid-stroke aborts the stroke).
 * Therefore this component declares `pointerEvents: 'none'` and never touches
 * input itself — it just paints what the consumer hands it.
 *
 * Inputs:
 *   - `strokes`         — array of committed strokes: `{color, size, pts:[{x,y},...]}`.
 *                         Coords are NATIVE-orientation field coords 0..1 (no mirror at
 *                         storage time per § 77 Stage 1; Stage 2 will apply
 *                         `mirrorPointToLeft` at read time when aggregating).
 *   - `currentStroke`   — same shape; the in-progress stroke (rendered with the same
 *                         pipeline so the live trace matches the committed look).
 *
 * Sizing / DPR:
 *   - Tracks the BaseCanvas frame size via `useBaseCanvas().canvasSize` (already
 *     ResizeObserver-driven inside BaseCanvas).
 *   - Backing-store sized to `(cssSize × DPR)`; CSS size matches the frame so
 *     strokes are crisp on retina.
 *   - rAF retry on first mount handles the brief case where the parent's
 *     clientWidth/Height haven't settled before our first effect fires.
 *
 * Field→screen mapping:
 *   - Reads `zoom`, `pan`, `canvasSize` from `BaseCanvasContext`; renders strokes
 *     using `pt.x * canvasSize.w * zoom + pan.x` (and same for y). Matches the
 *     transform BaseCanvas applies to its main canvas ctx, so strokes track
 *     zoom + pan without rubber-banding.
 *
 * perfect-freehand:
 *   - Stored shape is input points only (light, replayable). On every render the
 *     outline polygon is computed via `getStroke(...)` and filled. Defaults give
 *     a tapered iPad/Adobe-style stroke (thinning + smoothing). Pressure not
 *     supplied — single-finger touch on phones reports no pressure, so the
 *     tapered taper-by-velocity falloff is what gives the stroke shape.
 */


export default function DrawingOverlay({ strokes = [], currentStroke = null }) {
  const ctx = useBaseCanvas();
  const canvasRef = useRef(null);
  const rafRetryRef = useRef(0);

  // Backing-store + CSS sizing. Re-runs when frame dimensions change (driven by
  // BaseCanvas's own ResizeObserver via context). DPR-aware.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ctx) return undefined;
    const { canvasSize } = ctx;
    const apply = () => {
      const w = canvasSize?.w || 0;
      const h = canvasSize?.h || 0;
      if (w < 1 || h < 1) {
        // rAF-retry — parent dims not settled on the very first mount; try
        // again on next frame (matches the pattern Tactic's freehand uses to
        // avoid clearing the canvas during React re-renders).
        if (rafRetryRef.current < 5) {
          rafRetryRef.current += 1;
          requestAnimationFrame(apply);
        }
        return;
      }
      rafRetryRef.current = 0;
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 2;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    apply();
    return undefined;
  }, [ctx?.canvasSize?.w, ctx?.canvasSize?.h, ctx]);

  // Render strokes. Re-runs on every committed/in-progress change + on transform
  // change so strokes track zoom+pan + repaint as the live stroke grows.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ctx) return;
    const { zoom = 1, pan = { x: 0, y: 0 }, canvasSize } = ctx;
    const w = canvasSize?.w || 0;
    const h = canvasSize?.h || 0;
    if (w < 1 || h < 1) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 2;
    const c = canvas.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.translate(pan.x, pan.y);
    c.scale(zoom, zoom);

    strokes.forEach(s => paintStroke(c, s, w, h, zoom));
    if (currentStroke) paintStroke(c, currentStroke, w, h, zoom);

    c.setTransform(1, 0, 0, 1, 0, 0);
  }, [strokes, currentStroke, ctx?.zoom, ctx?.pan?.x, ctx?.pan?.y, ctx?.canvasSize?.w, ctx?.canvasSize?.h, ctx]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        zIndex: 15,
      }}
    />
  );
}
