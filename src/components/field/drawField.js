import { COLORS, FONT, TOUCH } from '../../utils/theme';

/**
 * Draw field background image or empty grid placeholder.
 * Also captures loupe source snapshot if touch is active.
 */
export function drawField(ctx, w, h, canvas, { imgObj, activeTouchPos, loupeSourceRef }) {
  if (imgObj) {
    ctx.drawImage(imgObj, 0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(0, 0, w, h);
    // Snapshot clean field for loupe (no overlays)
    if (activeTouchPos) {
      if (!loupeSourceRef.current) loupeSourceRef.current = document.createElement('canvas');
      const lc = loupeSourceRef.current;
      lc.width = canvas.width; lc.height = canvas.height;
      lc.getContext('2d').drawImage(canvas, 0, 0);
    }
  } else {
    ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = COLORS.border + '30'; ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = COLORS.textMuted + '40'; ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COLORS.textMuted + '40'; ctx.font = `${TOUCH.fontSm}px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('Upload a field layout in the tournament', w / 2, h / 2);
  }
}

/**
 * Draw half-field fade gradient on the far side.
 */
export function drawViewportFade(ctx, w, h, viewportSide) {
  if (!viewportSide) return;
  const fadeW = w * 0.25;
  const grd = ctx.createLinearGradient(
    viewportSide === 'left' ? w - fadeW : 0, 0,
    viewportSide === 'left' ? w : fadeW, 0
  );
  grd.addColorStop(0, 'rgba(10,14,23,0)');
  grd.addColorStop(1, 'rgba(10,14,23,0.7)');
  ctx.fillStyle = grd;
  ctx.fillRect(viewportSide === 'left' ? w - fadeW : 0, 0, fadeW, h);
}
