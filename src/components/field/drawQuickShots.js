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

  const playerRadius = 14;
  const breakStart = playerRadius + 3;
  const breakLen = 10;
  const obstacleStart = playerRadius + 17;
  const obstacleLen = 12;

  ctx.save();
  ctx.lineCap = 'round';

  const drawTick = (px, py, zone, phase) => {
    const angle = zoneAngle[zone];
    if (angle === undefined) return;
    const color = ZONE_COLORS[zone];

    const start = phase === 'obstacle' ? obstacleStart : breakStart;
    const len = phase === 'obstacle' ? obstacleLen : breakLen;

    const x1 = px + Math.cos(angle) * start;
    const y1 = py + Math.sin(angle) * start;
    const x2 = px + Math.cos(angle) * (start + len);
    const y2 = py + Math.sin(angle) * (start + len);

    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.85;
    if (phase === 'obstacle') {
      ctx.lineWidth = 2.5;
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

    // End marker: break = small dot, obstacle = diamond
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    if (phase === 'obstacle') {
      // Diamond shape
      const s = 4;
      ctx.beginPath();
      ctx.moveTo(x2, y2 - s);
      ctx.lineTo(x2 + s, y2);
      ctx.lineTo(x2, y2 + s);
      ctx.lineTo(x2 - s, y2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x2, y2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
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
