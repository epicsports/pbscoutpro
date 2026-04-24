/**
 * shotGeometry — pure geometry helpers for cone-style shot visualization.
 *
 * Two render contexts share these primitives:
 *   - Scouting canvas (drawQuickShots) — direction derived from ZONE
 *     (dorito/center/snake) via TEAM_DIRECTIONS lookup, with viewport mirror
 *     (fieldSide) and dorito-side (top/bottom) flips applied.
 *   - Heatmap (HeatmapCanvas) — direction derived from the actual shot
 *     vector (sx-px, sy-py) per shot. No zone lookup, no flip. Heatmap
 *     shots have no break/obstacle phase distinction so they all render as
 *     obstacle cones with reduced radius/opacity for the aggregation context.
 *
 * Render target everywhere is Canvas2D (not SVG). The brief's SVG path
 * generator was translated to Canvas2D path-building primitives (caller
 * does fill + stroke after path setup).
 */

// ─── Direction lookup (scouting canvas) ────────────────────────────────
// Reference orientation: team A on the LEFT shooting RIGHT, team B on the
// RIGHT shooting LEFT. Coordinate convention: x grows right, y grows down.
// Angles in degrees, math convention (0° = right, 90° = down, 180° = left,
// -90° = up). Spread is 15° total around the direction axis.
//
// Real callers pass (zone, fieldSide, doritoSide) — `shotDirectionDeg`
// resolves the effective angle accounting for viewport mirroring and
// top-vs-bottom dorito orientation. The TEAM_DIRECTIONS table below is the
// canonical reference for the un-flipped case.

export const TEAM_DIRECTIONS = {
  A: { dorito: -30, center: 0,   snake: 30  },
  B: { dorito: 210, center: 180, snake: 150 },
};

/**
 * Resolve the cone direction (degrees) for a shot given:
 *   zone       — 'dorito' | 'center' | 'snake'
 *   fieldSide  — 'left' | 'right' (which side the active team's base is on
 *                in the viewport — determines whether shots go right or left)
 *   doritoSide — 'top' | 'bottom' (where the dorito wing physically sits;
 *                'bottom' swaps which zone is up vs down)
 *
 * Formula (verified against TEAM_DIRECTIONS table):
 *   shooting right  →  result = zoneOffset
 *   shooting left   →  result = 180° - zoneOffset    (mirror)
 * where zoneOffset is -30/0/+30 (or flipped for doritoSide=bottom).
 */
export function shotDirectionDeg(zone, fieldSide = 'left', doritoSide = 'top') {
  const flipDorito = doritoSide === 'bottom';
  const flipHorizontal = fieldSide === 'right';

  let zoneOffset = 0;
  if (zone === 'dorito') zoneOffset = flipDorito ? 30 : -30;
  if (zone === 'snake')  zoneOffset = flipDorito ? -30 : 30;
  // center → 0

  return flipHorizontal ? (180 - zoneOffset) : zoneOffset;
}

// ─── Canvas2D path builders ────────────────────────────────────────────

/**
 * Build the cone path on the provided Canvas2D context. Caller is responsible
 * for ctx.save/restore and for calling fill/stroke after this function. The
 * function leaves the path "closed" — stroke draws the two radial edges and
 * the arc; fill paints the interior.
 *
 * Direction follows math convention. Spread is total angle (default 15° →
 * 7.5° on each side of direction).
 *
 * Why no `team` param: SVG sweep-flag distinction in the brief is a quirk
 * of SVG path semantics. Canvas2D arc with default anticlockwise=false
 * traverses startAngle → endAngle in increasing radians, which is visually
 * clockwise (y-down). For a 15° spread (a1 = direction - 7.5°, a2 = direction
 * + 7.5°, with a1 < a2), this naturally draws the SHORT arc bulging
 * outward in the direction axis — works for both teams symmetrically.
 */
export function tracePathCone(ctx, cx, cy, radius, directionDeg, spreadDeg = 15) {
  const halfSpread = spreadDeg / 2;
  const a1 = (directionDeg - halfSpread) * Math.PI / 180;
  const a2 = (directionDeg + halfSpread) * Math.PI / 180;

  const x1 = cx + radius * Math.cos(a1);
  const y1 = cy + radius * Math.sin(a1);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x1, y1);
  ctx.arc(cx, cy, radius, a1, a2, false);
  ctx.closePath();
}

/**
 * Compute the endpoints for break-shot dashes — three (default) radial
 * segments from player center to 0.75 * radius, evenly spaced across the
 * spread. Caller draws each line via setLineDash + moveTo/lineTo/stroke.
 *
 * Dashes end inside the obstacle cone's outer arc (which is at full radius)
 * so when both render for the same player+zone they don't visually collide
 * at the cone edge.
 */
export function getBreakShotDashEndpoints(cx, cy, radius, directionDeg, spreadDeg = 15, dashCount = 3) {
  const halfSpread = spreadDeg / 2;
  const lines = [];
  for (let i = 0; i < dashCount; i++) {
    const t = dashCount === 1 ? 0.5 : i / (dashCount - 1);
    const angleDeg = directionDeg - halfSpread + t * spreadDeg;
    const angleRad = angleDeg * Math.PI / 180;
    const endX = cx + radius * 0.75 * Math.cos(angleRad);
    const endY = cy + radius * 0.75 * Math.sin(angleRad);
    lines.push({ x1: cx, y1: cy, x2: endX, y2: endY });
  }
  return lines;
}

/**
 * Direction (degrees) from a player position to a shot end position.
 * Used by HeatmapCanvas where shots have actual end coordinates rather
 * than zone enums. Returns 0 when start == end (degenerate; caller's
 * existing len < 1 guard typically catches this first).
 */
export function vectorDirectionDeg(px, py, sx, sy) {
  const dx = sx - px;
  const dy = sy - py;
  if (dx === 0 && dy === 0) return 0;
  return Math.atan2(dy, dx) * 180 / Math.PI;
}
