import { COLORS, FONT } from '../../utils/theme';

/**
 * Draw inline player toolbar (action buttons above/below a player).
 */
export function drawToolbar(ctx, w, h, { toolbarPlayer, toolbarItems, players }) {
  if (toolbarPlayer === null || !players[toolbarPlayer]) return;

  const pl = players[toolbarPlayer];
  const px = pl.x * w, py = pl.y * h;
  const items = toolbarItems;
  if (!items.length) return;

  const btnW = 48, btnH = 44, gap = 5;
  const totalW = items.length * (btnW + gap) - gap;
  const pr = Math.max(17, w * 0.044);
  let tx = px - totalW / 2;
  let ty = py - pr - btnH - 18;
  if (tx < 6) tx = 6;
  if (tx + totalW > w - 6) tx = w - 6 - totalW;
  let below = false;
  if (ty < 6) { ty = py + pr + 18; below = true; }

  const rr = (x, y, rw, rh, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, rw, rh, r); else ctx.rect(x, y, rw, rh); };

  // Background pill
  ctx.fillStyle = '#111827f2';
  rr(tx - 8, ty - 6, totalW + 16, btnH + 12, 14); ctx.fill();
  ctx.strokeStyle = COLORS.border + '80'; ctx.lineWidth = 1;
  rr(tx - 8, ty - 6, totalW + 16, btnH + 12, 14); ctx.stroke();

  // Pointer triangle
  const ptx = Math.max(tx + 12, Math.min(tx + totalW - 12, px));
  ctx.fillStyle = '#111827f2'; ctx.beginPath();
  if (!below) {
    ctx.moveTo(ptx - 7, ty + btnH + 6); ctx.lineTo(ptx, ty + btnH + 14); ctx.lineTo(ptx + 7, ty + btnH + 6);
  } else {
    ctx.moveTo(ptx - 7, ty - 6); ctx.lineTo(ptx, ty - 14); ctx.lineTo(ptx + 7, ty - 6);
  }
  ctx.fill();

  // Buttons
  items.forEach((item, idx) => {
    const bx = tx + idx * (btnW + gap);
    item._hitArea = { x: bx, y: ty, w: btnW, h: btnH };
    ctx.fillStyle = (item.color || '#94a3b8') + '12';
    rr(bx, ty, btnW, btnH, 10); ctx.fill();
    ctx.strokeStyle = (item.color || '#94a3b8') + '35'; ctx.lineWidth = 0.5;
    rr(bx, ty, btnW, btnH, 10); ctx.stroke();
    ctx.fillStyle = item.color || '#94a3b8';
    ctx.font = '18px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, bx + btnW / 2, ty + btnH / 2 - 5);
    ctx.font = `600 8px ${FONT}`;
    ctx.fillStyle = (item.color || '#94a3b8') + 'bb';
    ctx.fillText(item.label, bx + btnW / 2, ty + btnH - 4);
  });
}
