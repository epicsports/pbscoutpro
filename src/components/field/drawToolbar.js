import { COLORS, FONT } from '../../utils/theme';

/**
 * Draw inline player toolbar — variant D (semantic colors).
 * Amber=assign(primary), Red=hit(danger), Gray=shot/del(secondary).
 */
export function drawToolbar(ctx, w, h, { toolbarPlayer, toolbarItems, players }) {
  if (toolbarPlayer === null || !players[toolbarPlayer]) return;

  const pl = players[toolbarPlayer];
  const px = pl.x * w, py = pl.y * h;
  const items = toolbarItems;
  if (!items.length) return;

  const btnW = 52, btnH = 48, gap = 4;
  const totalW = items.length * (btnW + gap) - gap;
  const pad = 6;
  const pillW = totalW + pad * 2, pillH = btnH + pad * 2;
  const pr = 20;
  let tx = px - totalW / 2;
  let ty = py - pr - pillH - 12;
  if (tx < pad + 4) tx = pad + 4;
  if (tx + totalW > w - pad - 4) tx = w - pad - 4 - totalW;
  let below = false;
  if (ty < 4) { ty = py + pr + 16; below = true; }

  const rr = (x, y, rw, rh, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, rw, rh, r); else ctx.rect(x, y, rw, rh); };

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(tx - pad + 2, ty - pad + 3, pillW, pillH, 18); ctx.fill();

  // Background pill
  ctx.fillStyle = '#0f172aee';
  rr(tx - pad, ty - pad, pillW, pillH, 16); ctx.fill();
  ctx.strokeStyle = '#1e293b80'; ctx.lineWidth = 1;
  rr(tx - pad, ty - pad, pillW, pillH, 16); ctx.stroke();

  // Pointer triangle
  const ptx = Math.max(tx + 12, Math.min(tx + totalW - 12, px));
  ctx.fillStyle = '#0f172aee'; ctx.beginPath();
  if (!below) {
    ctx.moveTo(ptx - 7, ty - pad + pillH); ctx.lineTo(ptx, ty - pad + pillH + 8); ctx.lineTo(ptx + 7, ty - pad + pillH);
  } else {
    ctx.moveTo(ptx - 7, ty - pad); ctx.lineTo(ptx, ty - pad - 8); ctx.lineTo(ptx + 7, ty - pad);
  }
  ctx.fill();

  // Buttons
  items.forEach((item, idx) => {
    const bx = tx + idx * (btnW + gap);
    item._hitArea = { x: bx, y: ty, w: btnW, h: btnH };

    // Button background
    ctx.fillStyle = '#1e293b30';
    rr(bx, ty, btnW, btnH, 12); ctx.fill();
    ctx.strokeStyle = (item.color || '#94a3b8') + '30'; ctx.lineWidth = 1.5;
    rr(bx, ty, btnW, btnH, 12); ctx.stroke();

    // Icon
    ctx.fillStyle = item.color || '#94a3b8';
    ctx.font = '17px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, bx + btnW / 2, ty + btnH / 2 - 4);

    // Label
    ctx.font = `600 7px ${FONT}`;
    ctx.fillStyle = (item.color || '#94a3b8') + '90';
    ctx.fillText(item.label, bx + btnW / 2, ty + btnH - 5);
  });
}
