/**
 * tacticState — pure helpers shared by the tactic surfaces (TacticPage editor +
 * the Coach Tactics board). No React, no Firestore — just shape normalization so
 * a tactic doc renders identically wherever it's drawn.
 *
 *  - normalizeFreehandStrokes: any stored freehand shape → canonical
 *    { color, size, pts:[{x,y}] }[] (legacy points-only arrays survive).
 *  - tacticToCanvasProps: a tactic doc → the InteractiveCanvas position/shot/bump
 *    props (handles the new flat shape AND the legacy steps[0] shape).
 *  - onBoardTactics / sortBoardTactics: the Coach Tactics board read rules —
 *    CLIENT-SIDE (NOT Firestore orderBy) so legacy docs lacking `onBoard`/`order`
 *    are never silently excluded. Missing `onBoard` → treated TRUE; missing
 *    `order` → falls back to createdAt. Existing tactics appear by default; no
 *    migration write needed.
 */

import { STROKE_COLORS, STROKE_SIZES } from '../components/canvas/drawStrokes';
import { quickShotsFromFirestore } from '../services/dataService';

/**
 * Normalize freehandStrokes from any stored shape to the canonical
 * { color, size, pts:[{x,y}] }. Handles the LEGACY points-only shape (bare
 * `[{x,y},...]` arrays, or `{"0":[...]}`) the old bespoke tool wrote — wraps them
 * in amber/thin so existing tactic drawings survive. Drops <2-point strokes.
 * (Mirrors the function TacticPage shipped inline; lifted here so the board's
 * read-only preview paints saved strokes identically.)
 */
export function normalizeFreehandStrokes(raw) {
  if (!raw) return [];
  const values = Array.isArray(raw)
    ? raw
    : (typeof raw === 'object'
        ? Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map(k => raw[k])
        : []);
  return values
    .map((v) => {
      if (v && Array.isArray(v.pts)) return v; // already canonical
      // legacy points-only → amber + THIN (3px) to match the old bespoke
      // lineWidth=3, so existing drawings keep their weight under the renderer.
      if (Array.isArray(v)) return { color: STROKE_COLORS[0].value, size: STROKE_SIZES.thin, pts: v };
      return null;
    })
    .filter(s => s && Array.isArray(s.pts) && s.pts.length >= 2);
}

const EMPTY5 = () => [null, null, null, null, null];
const EMPTY5_ARR = () => [[], [], [], [], []];

// shots / bumpShots can be stored as nested arrays OR index-keyed maps (§ 9
// no-nested-arrays). Coerce either into a [[],[],[],[],[]] shape.
function normShotLayer(raw) {
  if (!raw) return EMPTY5_ARR();
  if (Array.isArray(raw)) return raw.map(s => (Array.isArray(s) ? s : Object.values(s || {})));
  return [0, 1, 2, 3, 4].map(i => { const v = raw[String(i)]; return Array.isArray(v) ? v : []; });
}

/**
 * tacticToCanvasProps — a tactic doc → read-only InteractiveCanvas props. Mirrors
 * TacticPage's load effect (new flat players/shots/bumps shape + the legacy
 * steps[0] shape), so the board preview is pixel-faithful to the editor.
 */
export function tacticToCanvasProps(tactic) {
  if (!tactic) {
    return { players: EMPTY5(), shots: EMPTY5_ARR(), bumpShots: EMPTY5_ARR(), bumps: EMPTY5(), runners: [false, false, false, false, false], quickShots: [], obstacleShots: [], freehandStrokes: [] };
  }
  const src = tactic.players ? tactic : (tactic.steps?.[0] || {});
  return {
    players: Array.isArray(src.players) ? src.players : EMPTY5(),
    shots: normShotLayer(src.shots),
    bumpShots: normShotLayer(tactic.bumpShots),
    bumps: Array.isArray(src.bumps) ? src.bumps : EMPTY5(),
    runners: Array.isArray(src.runners) ? src.runners : [false, false, false, false, false],
    quickShots: quickShotsFromFirestore(src.quickShots),
    obstacleShots: quickShotsFromFirestore(src.obstacleShots),
    freehandStrokes: normalizeFreehandStrokes(tactic.freehandStrokes),
  };
}

// ── Coach Tactics board read rules (client-side; legacy-safe) ──
const createdMs = (t) => {
  const c = t?.createdAt;
  if (c?.toMillis) return c.toMillis();
  if (typeof c?.seconds === 'number') return c.seconds * 1000;
  return 0;
};

/** Tactics shown ON the board: missing `onBoard` → TRUE (existing tactics appear). */
export function onBoardTactics(tactics) {
  return (tactics || []).filter(t => t && t.onBoard !== false);
}

/** Tactics in the library picker: explicitly removed from the board (onBoard === false). */
export function offBoardTactics(tactics) {
  return (tactics || []).filter(t => t && t.onBoard === false);
}

/**
 * sortBoardTactics — order asc (board position); ties / missing order fall back
 * to createdAt DESC (newest first, matching the legacy list) so reorder hasn't
 * happened yet still reads sensibly. NOT Firestore orderBy — see module note.
 */
export function sortBoardTactics(tactics) {
  const withOrder = (t) => (typeof t.order === 'number' ? t.order : Number.MAX_SAFE_INTEGER);
  return [...(tactics || [])].sort((a, b) => {
    const oa = withOrder(a); const ob = withOrder(b);
    if (oa !== ob) return oa - ob;
    return createdMs(b) - createdMs(a);
  });
}
