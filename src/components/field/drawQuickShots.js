import { TEAM_COLORS } from '../../utils/theme';
import { shotDirectionDeg, tracePathCone, getBreakShotDashEndpoints } from '../../utils/shotGeometry';

/**
 * Draw shot indicators around each player as cones (obstacle) or
 * radiating dashes (break).
 *
 * Direction = `shotDirectionDeg(zone, fieldSide, doritoSide)` — zone-aware
 * with viewport mirror + top/bottom dorito flip applied. Color follows
 * `team` ('A' = red, 'B' = blue).
 *
 * Obstacle shots: solid cone outline + 18% fill (sustained fire from
 *   position).
 * Break shots: 3 dashed radii from EXACT player center, ending at 75%
 *   of the cone radius (inside the obstacle cone boundary so when both
 *   render they don't collide at the edge).
 *
 * Render order: obstacle cones first (below), break dashes on top — so
 * dashes are still visible when overlapping the same zone+phase.
 */
export function drawQuickShots(ctx, w, h, {
  players = [],
  quickShots = [],
  obstacleShots = [],
  doritoSide = 'top',
  fieldSide = 'left',
  team = 'A',
}) {
  const anyBreak = quickShots && quickShots.some(zs => zs && zs.length);
  const anyObstacle = obstacleShots && obstacleShots.some(zs => zs && zs.length);
  if (!anyBreak && !anyObstacle) return;

  const teamColor = team === 'B' ? TEAM_COLORS.B : TEAM_COLORS.A;
  // Cone radius is proportional to canvas size. 0.20 (~ 1/5 of min dim)
  // balances "clearly visible direction" against player-density crowding
  // in tight breakout configurations. Tune by feel after first paint.
  const radius = Math.min(w, h) * 0.20;

  ctx.save();

  // ── Obstacle cones (drawn first so break dashes render on top) ──
  if (anyObstacle) {
    obstacleShots.forEach((zs, idx) => {
      if (!zs || !zs.length) return;
      const pl = players[idx];
      if (!pl) return;
      const cx = pl.x * w;
      const cy = pl.y * h;
      zs.forEach(zone => {
        const dir = shotDirectionDeg(zone, fieldSide, doritoSide);
        tracePathCone(ctx, cx, cy, radius, dir, 15);
        ctx.fillStyle = teamColor;
        ctx.globalAlpha = 0.18;
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    });
  }

  // ── Break dashes (3 radii per shot) ──
  if (anyBreak) {
    ctx.lineCap = 'round';
    ctx.setLineDash([6, 3]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = teamColor;
    ctx.globalAlpha = 0.9;

    quickShots.forEach((zs, idx) => {
      if (!zs || !zs.length) return;
      const pl = players[idx];
      if (!pl) return;
      const cx = pl.x * w;
      const cy = pl.y * h;
      zs.forEach(zone => {
        const dir = shotDirectionDeg(zone, fieldSide, doritoSide);
        const dashes = getBreakShotDashEndpoints(cx, cy, radius, dir, 15, 3);
        dashes.forEach(line => {
          ctx.beginPath();
          ctx.moveTo(line.x1, line.y1);
          ctx.lineTo(line.x2, line.y2);
          ctx.stroke();
        });
      });
    });

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
