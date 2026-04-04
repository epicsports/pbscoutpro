import { FONT } from '../../utils/theme';

/** Draw HOME/AWAY calibration markers with axis line. */
export function drawCalibration(ctx, w, h, { calibrationMode, calibrationData }) {
  if (!calibrationMode || !calibrationData) return;
  const { homeBase, awayBase } = calibrationData;
  const hx = homeBase.x * w, hy = homeBase.y * h;
  const ax = awayBase.x * w, ay = awayBase.y * h;
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#facc1580'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ax, ay); ctx.stroke();
  ctx.setLineDash([]);
  [{ x: hx, y: hy, color: '#22c55e', label: 'HOME' },
   { x: ax, y: ay, color: '#ef4444', label: 'AWAY' }].forEach(m => {
    ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = m.color + '40'; ctx.fill();
    ctx.strokeStyle = m.color; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = m.color; ctx.font = `bold 10px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(m.label, m.x, m.y - 18);
  });
}
