import { ZONE_COLORS } from '../../utils/theme';

/**
 * Draw quick-shot direction indicators around each player.
 *
 * Instead of long arrows across the field, each player gets small colored
 * ticks radiating outward from their circle — pointing toward the zone
 * they're shooting at:
 *   - Dorito → upward tick (top of field)
 *   - Center → horizontal tick toward opponent side
 *   - Snake  → downward tick (bottom of field)
 *
 * Break shots: thin dashed (1.5px, dash [4,3])
 * Obstacle shots: thicker solid (2.5px)
 *
 * Respects doritoSide — if 'bottom', dorito/snake directions flip.
 *
 * § 29 + Apple HIG: minimal, deferred, doesn't clutter the field.
 */
export function drawQuickShots(ctx, w, h, {
  players = [],
  quickShots = [],
  obstacleShots = [],
  doritoSide = 'top',
  fieldSide = 'left',
}) {
  const anyBreak = quickShots && quickShots.some(zs => zs && zs.length);
  const anyObstacle = obstacleShots && obstacleShots.some(zs => zs && zs.length);
  if (!anyBreak && !anyObstacle) return;

  const flipped = doritoSide === 'bottom';

  // Direction angles (radians) for each zone — relative to player center.
  // 0 = right, PI/2 = down, PI = left, -PI/2 = up
  const towardOpponent = fieldSide === 'left' ? 0 : Math.PI;
  const zoneAngle = {
    dorito: flipped ? Math.PI / 2 : -Math.PI / 2,  // up or down
    center: towardOpponent,                          // toward opponent base
    snake:  flipped ? -Math.PI / 2 : Math.PI / 2,   // down or up
  };

  const playerRadius = 14; // approx player circle radius in canvas px
  const tickStart = playerRadius + 3;
  const tickLen = 12;

  ctx.save();
  ctx.lineCap = 'round';

  const drawTick = (px, py, zone, phase) => {
    const angle = zoneAngle[zone];
    if (angle === undefined) return;
    const color = ZONE_COLORS[zone];

    const x1 = px + Math.cos(angle) * tickStart;
    const y1 = py + Math.sin(angle) * tickStart;
    const x2 = px + Math.cos(angle) * (tickStart + tickLen);
    const y2 = py + Math.sin(angle) * (tickStart + tickLen);

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.8;
    if (phase === 'obstacle') {
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
    } else {
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small dot at the end of the tick
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x2, y2, phase === 'obstacle' ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // Break shots (dashed) first
  if (anyBreak) {
    quickShots.forEach((zs, idx) => {
      if (!zs || !zs.length) return;
      const pl = players[idx];
      if (!pl) return;
      const px = pl.x * w, py = pl.y * h;
      zs.forEach(z => drawTick(px, py, z, 'break'));
    });
  }

  // Obstacle shots (solid) on top
  if (anyObstacle) {
    obstacleShots.forEach((zs, idx) => {
      if (!zs || !zs.length) return;
      const pl = players[idx];
      if (!pl) return;
      const px = pl.x * w, py = pl.y * h;
      // Offset obstacle ticks slightly to not overlap break ticks
      zs.forEach(z => drawTick(px, py, z, 'obstacle'));
    });
  }

  ctx.restore();
}
