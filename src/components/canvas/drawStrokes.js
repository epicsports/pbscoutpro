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

import { STROKE_SIZES } from './DrawingOverlay';

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

export { STROKE_SIZES };
