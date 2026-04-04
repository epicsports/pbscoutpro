import { FONT } from '../../utils/theme';

/** Draw disco/zeeker lines + danger/sajgon zone polygons. */
export function drawZones(ctx, w, h, {
  discoLine, zeekerLine,
  showZones, dangerZone, sajgonZone,
  layoutEditMode, editDangerPoints, editSajgonPoints,
}) {
  // Disco/Zeeker lines
  if (discoLine > 0) {
    const dy = discoLine * h;
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, dy); ctx.lineTo(w, dy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#f97316'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('DISCO', w - 4, dy - 2);
  }
  if (zeekerLine > 0) {
    const zy = zeekerLine * h;
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, zy); ctx.lineTo(w, zy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#3b82f6'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('ZEEKER', w - 4, zy + 2);
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
