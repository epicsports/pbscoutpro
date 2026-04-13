import { FONT } from '../../utils/theme';
import { ZONE_COLORS } from '../../utils/theme';

/**
 * Draw quick-shot direction arrows from each active player to the right
 * edge of the canvas. Each player's quickShots / obstacleShots is an array
 * of zone keys ("dorito" | "center" | "snake"). Arrows are color-coded.
 *
 * § 29 two shot phases:
 *   - Break shots: thin dashed arrow (lineWidth 1.5, dash [5, 3])
 *   - Obstacle play: thicker solid arrow (lineWidth 2.5, no dash)
 * Same zone colors, same right-edge targets. Both phases render together
 * for the same player when both are populated.
 *
 * Also draws three vertical bars on the right edge — one per zone — that
 * light up when any player targets that zone, plus small pill labels.
 *
 * When `doritoSide === 'bottom'` the dorito/snake target positions flip
 * so the arrow geometry matches the physical field layout.
 */
export function drawQuickShots(ctx, w, h, {
  players = [],
  quickShots = [],
  obstacleShots = [],
  doritoSide = 'top',
}) {
  const anyBreak = quickShots && quickShots.some(zs => zs && zs.length);
  const anyObstacle = obstacleShots && obstacleShots.some(zs => zs && zs.length);
  if (!anyBreak && !anyObstacle) return;

  // Zone vertical targets (percent of canvas height).
  // Dorito is the top-of-field breakout by default; flipped when doritoSide==='bottom'.
  const flipped = doritoSide === 'bottom';
  const zoneY = {
    dorito: (flipped ? 0.85 : 0.15) * h,
    center: 0.50 * h,
    snake:  (flipped ? 0.15 : 0.85) * h,
  };

  // Which zones are targeted by at least one player (either phase)?
  const zoneActive = { dorito: false, center: false, snake: false };
  const markZones = (arr) => (arr || []).forEach(zs => (zs || []).forEach(z => {
    if (z in zoneActive) zoneActive[z] = true;
  }));
  markZones(quickShots);
  markZones(obstacleShots);

  // ── Right-edge zone indicator bars ──
  const barHalf = h * 0.08;
  ['dorito', 'center', 'snake'].forEach(key => {
    const yMid = zoneY[key];
    const active = zoneActive[key];
    ctx.fillStyle = ZONE_COLORS[key] + (active ? 'ff' : '40');
    const bw = active ? 6 : 4;
    ctx.fillRect(w - bw, yMid - barHalf, bw, barHalf * 2);
  });

  // ── Arrow renderer ──
  // phase='break' → dashed 1.5, phase='obstacle' → solid 2.5
  const drawArrow = (px, py, zoneKey, phase) => {
    if (!(zoneKey in zoneY)) return;
    const tx = w - 10;
    const ty = zoneY[zoneKey];
    const color = ZONE_COLORS[zoneKey];
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    if (phase === 'obstacle') {
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
    } else {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
    }
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Arrowhead (small triangle at the end)
    const ang = Math.atan2(ty - py, tx - px);
    const ah = phase === 'obstacle' ? 9 : 7;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - ah * Math.cos(ang - Math.PI / 6), ty - ah * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(tx - ah * Math.cos(ang + Math.PI / 6), ty - ah * Math.sin(ang + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw break (dashed) first so obstacle (solid) renders on top.
  if (anyBreak) {
    quickShots.forEach((zs, idx) => {
      if (!zs || !zs.length) return;
      const pl = players[idx];
      if (!pl) return;
      const px = pl.x * w, py = pl.y * h;
      zs.forEach(z => drawArrow(px, py, z, 'break'));
    });
  }
  if (anyObstacle) {
    obstacleShots.forEach((zs, idx) => {
      if (!zs || !zs.length) return;
      const pl = players[idx];
      if (!pl) return;
      const px = pl.x * w, py = pl.y * h;
      zs.forEach(z => drawArrow(px, py, z, 'obstacle'));
    });
  }
  ctx.restore();

  // ── Right-edge pill labels (only for active zones) ──
  const drawPill = (text, x, y, color) => {
    ctx.font = `bold 10px ${FONT}`;
    const tw = ctx.measureText(text).width;
    const px = 5;
    const bw = tw + px * 2;
    const bh = 14;
    const lx = x - bw - 4;
    const ly = y - bh / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(lx, ly, bw, bh, 4);
      ctx.fill();
    } else {
      ctx.fillRect(lx, ly, bw, bh);
    }
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, lx + px, ly + bh / 2 + 1);
  };
  if (zoneActive.dorito) drawPill('DORITO', w - 12, zoneY.dorito, ZONE_COLORS.dorito);
  if (zoneActive.center) drawPill('CENTER', w - 12, zoneY.center, ZONE_COLORS.center);
  if (zoneActive.snake)  drawPill('SNAKE',  w - 12, zoneY.snake,  ZONE_COLORS.snake);

  // ── Legend (bottom-right) — only when both phases visible ──
  if (anyBreak && anyObstacle) {
    ctx.save();
    const legendY = h - 10;
    const lineLen = 18;
    ctx.font = `600 9px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const legendColor = '#94a3b8';
    // "Break" dashed swatch
    let lx = 10;
    ctx.strokeStyle = legendColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(lx, legendY); ctx.lineTo(lx + lineLen, legendY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = legendColor;
    ctx.fillText('Break', lx + lineLen + 4, legendY);
    // "Obstacle" solid swatch
    lx += lineLen + 4 + ctx.measureText('Break').width + 12;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(lx, legendY); ctx.lineTo(lx + lineLen, legendY); ctx.stroke();
    ctx.fillText('Obstacle', lx + lineLen + 4, legendY);
    ctx.restore();
  }
}
