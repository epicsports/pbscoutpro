import React, { useEffect, useRef } from 'react';
import { getStroke } from 'perfect-freehand';
import { useBaseCanvas } from './BaseCanvas';

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

// Per § 77 — three sizes mapped to perfect-freehand's `size` (px input).
// Match the values consumed by the toolbar's width pills + eraser radius.
export const STROKE_SIZES = { thin: 3, medium: 6, thick: 10 };

// Per § 77 — 5-color palette (amber default + white / red / cyan / green).
// Amber is the same `COLORS.accent` used elsewhere; keeping literal here so
// the palette is one source-of-truth for both DrawingOverlay + toolbar.
export const STROKE_COLORS = [
  { key: 'amber', label: 'Amber', value: '#f59e0b' },
  { key: 'white', label: 'White', value: '#ffffff' },
  { key: 'red',   label: 'Red',   value: '#ef4444' },
  { key: 'cyan',  label: 'Cyan',  value: '#06b6d4' },
  { key: 'green', label: 'Green', value: '#22c55e' },
];

// perfect-freehand options tuned for finger input on a paintball field canvas.
// Streamline = high (smoothing); thinning = mild (some taper); simulatePressure
// = true (gives the iPad-like taper when no real pressure is reported).
const FREEHAND_OPTIONS = {
  streamline: 0.55,
  thinning: 0.35,
  smoothing: 0.6,
  simulatePressure: true,
  last: true,
};

function getSvgPathFromStroke(points) {
  if (!points.length) return '';
  const d = points.reduce(
    (acc, [x, y], i, arr) => {
      if (i === 0) return `M ${x.toFixed(2)} ${y.toFixed(2)}`;
      const [nx, ny] = arr[(i + 1) % arr.length];
      return `${acc} L ${x.toFixed(2)} ${y.toFixed(2)} Q ${nx.toFixed(2)} ${ny.toFixed(2)}`;
    },
    ''
  );
  return d + ' Z';
}

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

    const paint = (stroke) => {
      if (!stroke || !Array.isArray(stroke.pts) || stroke.pts.length === 0) return;
      const pts = stroke.pts.map(p => [p.x * w, p.y * h]);
      const outline = getStroke(pts, { ...FREEHAND_OPTIONS, size: (stroke.size || STROKE_SIZES.medium) / zoom });
      if (!outline.length) return;
      const path = new Path2D(getSvgPathFromStroke(outline));
      c.fillStyle = stroke.color || STROKE_COLORS[0].value;
      c.fill(path);
    };

    strokes.forEach(paint);
    if (currentStroke) paint(currentStroke);

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
