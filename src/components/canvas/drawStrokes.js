/**
 * drawStrokes — § 77 Draw Stage 1 pure helpers.
 *
 * Stroke shape (canonical, in-memory + Firestore-decoded):
 *   { color: '#hex', size: number-px, pts: [{x: 0..1, y: 0..1}, ...] }
 *
 * Coords are NATIVE-orientation field coords (0..1). No mirror at storage
 * time per § 77; Stage 2 aggregation will apply `mirrorPointToLeft` at read
 * time when stacking annotations from multiple points onto a single side.
 *
 * Firestore shape (annotations object on the point doc):
 *   { "0": {color, size, pts: [{x,y}, ...]}, "1": {...}, ... }
 *   Numeric string keys preserve order; `pts` is a list of `{x,y}` maps (no
 *   nested arrays per § 9 anti-pattern). Empty / unset → no annotations.
 */

import { getStroke } from 'perfect-freehand';

// § 77 — three sizes mapped to perfect-freehand's `size` (px input).
// Match the values consumed by the toolbar's width pills + eraser radius.
export const STROKE_SIZES = { thin: 3, medium: 6, thick: 10 };

// § 77 — drawing palette (amber default + white / red / cyan / green; extended
// 2026-06-18 with blue / orange / purple / pink for richer coach annotations).
// Amber is the same `COLORS.accent` used elsewhere; keeping literals here so
// the palette is one source-of-truth for both DrawingOverlay + toolbar.
export const STROKE_COLORS = [
  { key: 'amber',  label: 'Amber',  value: '#f59e0b' },
  { key: 'white',  label: 'White',  value: '#ffffff' },
  { key: 'red',    label: 'Red',    value: '#ef4444' },
  { key: 'orange', label: 'Orange', value: '#f97316' },
  { key: 'cyan',   label: 'Cyan',   value: '#06b6d4' },
  { key: 'blue',   label: 'Blue',   value: '#3b82f6' },
  { key: 'green',  label: 'Green',  value: '#22c55e' },
  { key: 'purple', label: 'Purple', value: '#a855f7' },
  { key: 'pink',   label: 'Pink',   value: '#ec4899' },
];

// perfect-freehand options tuned for finger input on a paintball field canvas.
// Streamline = high (smoothing); thinning = mild (some taper); simulatePressure
// = true (gives the iPad-like taper when no real pressure is reported).
// § 78 — hoisted here from DrawingOverlay so the static-render path used by
// HeatmapCanvas (saved coach plan + scout annotations) shares one tuning.
export const FREEHAND_OPTIONS = {
  streamline: 0.55,
  thinning: 0.35,
  smoothing: 0.6,
  simulatePressure: true,
  last: true,
};

/**
 * paintStroke — § 78 helper shared by DrawingOverlay (separate overlay
 * canvas) and HeatmapCanvas (renders inside the main BaseCanvas draw
 * callback for static layers like coachAnnotations / point.annotations).
 *
 * Caller is responsible for applying the field→screen transform on `ctx`
 * BEFORE calling. `w` / `h` are the world canvas dimensions in CSS px.
 * `zoom` is used to keep stroke thickness constant in screen pixels
 * regardless of canvas zoom (perfect-freehand `size` is divided by zoom).
 *
 * No-ops for invalid strokes (missing pts, empty pts) so callers can pass
 * untrusted Firestore data without guarding upstream.
 */
export function paintStroke(ctx, stroke, w, h, zoom = 1) {
  if (!stroke || !Array.isArray(stroke.pts) || stroke.pts.length === 0) return;
  const pts = stroke.pts.map(p => [p.x * w, p.y * h]);
  const outline = getStroke(pts, {
    ...FREEHAND_OPTIONS,
    size: (stroke.size || STROKE_SIZES.medium) / (zoom || 1),
  });
  if (!outline.length) return;
  const path = new Path2D(svgPathFromStroke(outline));
  ctx.fillStyle = stroke.color || STROKE_COLORS[0].value;
  ctx.fill(path);
}

// SVG path builder per perfect-freehand canonical example. See
// DrawingOverlay.jsx bug history (§ 77 hotfix 2026-05-24) — invalid `Q`
// without endpoint pair silently no-ops in Path2D.
function svgPathFromStroke(stroke) {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', stroke[0][0], stroke[0][1], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

export function strokesToFirestore(strokes) {
  if (!Array.isArray(strokes) || strokes.length === 0) return null;
  const out = {};
  strokes.forEach((s, i) => {
    if (!s || !Array.isArray(s.pts) || s.pts.length < 2) return;
    out[String(i)] = {
      color: s.color,
      size: s.size,
      pts: s.pts.map(p => ({ x: p.x, y: p.y })),
    };
  });
  return Object.keys(out).length === 0 ? null : out;
}

export function strokesFromFirestore(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(s => s && Array.isArray(s.pts) && s.pts.length >= 2);
  if (typeof raw !== 'object') return [];
  return Object.keys(raw)
    .sort((a, b) => Number(a) - Number(b))
    .map(k => raw[k])
    .filter(s => s && Array.isArray(s.pts) && s.pts.length >= 2);
}

/**
 * eraseAtPoint — sized point-erase per § 77. Walks `stroke.pts`; any point
 * within `radiusPx` (screen px) of `eraserPos` is removed; the surviving
 * contiguous runs become new strokes. Returns an array of 0..N strokes that
 * replace the input (zero when the eraser passes through every point with no
 * surviving 2-point run).
 *
 * `eraserPos` is a field 0..1 coord; `canvasW/H` give the screen size at
 * zoom=1 (caller scales radius for zoom so the eraser feels constant on
 * screen regardless of zoom — see Match's drawMove dispatcher).
 */
export function eraseAtPoint(stroke, eraserPos, radiusPx, canvasW, canvasH) {
  if (!stroke || !Array.isArray(stroke.pts) || stroke.pts.length === 0) return [];
  const survive = [];
  let current = null;
  for (const pt of stroke.pts) {
    const dx = (pt.x - eraserPos.x) * canvasW;
    const dy = (pt.y - eraserPos.y) * canvasH;
    const within = Math.hypot(dx, dy) < radiusPx;
    if (within) {
      if (current && current.pts.length >= 2) survive.push(current);
      current = null;
    } else {
      if (!current) current = { color: stroke.color, size: stroke.size, pts: [] };
      current.pts.push(pt);
    }
  }
  if (current && current.pts.length >= 2) survive.push(current);
  return survive;
}

/**
 * eraseAcrossStrokes — apply `eraseAtPoint` to every stroke, return the new
 * stroke array. Returns the same reference if nothing changed (so React
 * setState bails on identity).
 */
export function eraseAcrossStrokes(strokes, eraserPos, radiusPx, canvasW, canvasH) {
  let changed = false;
  const next = [];
  for (const s of strokes) {
    const replaced = eraseAtPoint(s, eraserPos, radiusPx, canvasW, canvasH);
    if (replaced.length === 1 && replaced[0] === s) {
      next.push(s);
      continue;
    }
    if (replaced.length !== 1 || replaced[0].pts.length !== s.pts.length) {
      changed = true;
    }
    next.push(...replaced);
  }
  return changed ? next : strokes;
}

