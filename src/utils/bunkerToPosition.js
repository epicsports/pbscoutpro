/**
 * Convert a bunker centroid to a synthetic player position, offset slightly
 * toward the team's base. Used by the § 57 Phase 1b propagator to derive
 * positions from self-log breakout selections (where the player named the
 * bunker but never tapped a coordinate on the canvas).
 *
 * The offset (2% of normalized field width) nudges the synthetic point off
 * the bunker centroid toward the breakout side so it doesn't collide with
 * scout-tapped positions on the same bunker during heatmap aggregation.
 *
 * @param {object} bunker        — bunker doc from layout.bunkers (must have x,y in 0..1)
 * @param {'left'|'right'} fieldSide — team's starting side per the point
 * @returns {{x: number, y: number} | null}
 */
export function bunkerToPosition(bunker, fieldSide) {
  if (!bunker || typeof bunker.x !== 'number' || typeof bunker.y !== 'number') {
    return null;
  }
  const offset = 0.02;
  const dx = fieldSide === 'left' ? -offset : +offset;
  return { x: bunker.x + dx, y: bunker.y };
}
