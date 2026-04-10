import { FONT } from '../../utils/theme';

/** Draw disco/zeeker lines + danger/sajgon zone polygons.
 * doritoSide: 'top' or 'bottom' — determines which half gets each line.
 * If not provided, lines span full width (backward compatible). */
export function drawZones(ctx, w, h, {
  discoLine, zeekerLine,
  showZones, dangerZone, sajgonZone,
  layoutEditMode, editDangerPoints, editSajgonPoints,
  doritoSide,
}) {
  // Disco line — dorito side only (or full width if no side info)
  if (discoLine > 0) {
    const dy = discoLine * h;
    const x0 = doritoSide === 'bottom' ? w / 2 : 0;
    const x1 = doritoSide === 'top' ? w / 2 : w;
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(x0, dy); ctx.lineTo(x1, dy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fb923c'; ctx.font = `bold 9px ${FONT}`;
    ctx.textAlign = doritoSide === 'bottom' ? 'left' : 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('DISCO', doritoSide === 'bottom' ? x0 + 4 : x1 - 4, dy - 2);
  }
  // Zeeker line — snake side only (or full width if no side info)
  if (zeekerLine > 0) {
    const zy = zeekerLine * h;
    const x0 = doritoSide === 'top' ? w / 2 : 0;
    const x1 = doritoSide === 'bottom' ? w / 2 : w;
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(x0, zy); ctx.lineTo(x1, zy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#22d3ee'; ctx.font = `bold 9px ${FONT}`;
    ctx.textAlign = doritoSide === 'top' ? 'left' : 'right'; ctx.textBaseline = 'top';
    ctx.fillText('ZEEKER', doritoSide === 'top' ? x0 + 4 : x1 - 4, zy + 2);
  }

  // Zone polygons
  if (showZones || layoutEditMode === 'danger' || layoutEditMode === 'sajgon') {
    const drawZone = (pts, color, label) => {
      if (!pts || pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      pts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x * w, p.y * h); });
      if (pts.length > 2) ctx.closePath();
      ctx.fillStyle = color + '28'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
      if (pts.length > 2) {
        const cx2 = pts.reduce((s, p) => s + p.x, 0) / pts.length * w;
        const cy2 = pts.reduce((s, p) => s + p.y, 0) / pts.length * h;
        ctx.fillStyle = color; ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, cx2, cy2);
      }
    };
    if (showZones) {
      if (dangerZone?.length > 2) drawZone(dangerZone, '#ef4444', 'DANGER');
      if (sajgonZone?.length > 2) drawZone(sajgonZone, '#3b82f6', 'SAJGON');
    }
    if (layoutEditMode === 'danger') drawZone(editDangerPoints, '#ef4444', 'DANGER');
    if (layoutEditMode === 'sajgon') drawZone(editSajgonPoints, '#3b82f6', 'SAJGON');
    // Vertex dots for edit mode
    const editPts = layoutEditMode === 'danger' ? editDangerPoints : layoutEditMode === 'sajgon' ? editSajgonPoints : [];
    const zColor = layoutEditMode === 'danger' ? '#ef4444' : '#3b82f6';
    editPts.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 6, 0, Math.PI * 2);
      ctx.fillStyle = zColor; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      if (i === 0) { ctx.fillStyle = '#fff'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✕', p.x * w, p.y * h); }
    });
  }
}
