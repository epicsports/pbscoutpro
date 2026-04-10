import { FONT } from '../../utils/theme';

/** Draw disco/zeeker lines + danger/sajgon zone polygons. */
export function drawZones(ctx, w, h, {
  discoLine, zeekerLine,
  showZones, dangerZone, sajgonZone,
  layoutEditMode, editDangerPoints, editSajgonPoints,
  doritoSide,
}) {
  // Helper: draw label with dark background pill for contrast
  const drawLabel = (text, x, y, color, align = 'center', baseline = 'middle', fontSize = 12) => {
    ctx.font = `bold ${fontSize}px ${FONT}`;
    const tw = ctx.measureText(text).width;
    const px = 6, py = 3;
    let lx = x;
    if (align === 'right') lx = x - tw - px;
    else if (align === 'left') lx = x;
    else lx = x - tw / 2 - px;
    const ly = baseline === 'bottom' ? y - fontSize - py : baseline === 'top' ? y : y - fontSize / 2 - py;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    const rr = 4;
    const bw = tw + px * 2, bh = fontSize + py * 2;
    ctx.roundRect(lx, ly, bw, bh, rr);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, align === 'center' ? x : align === 'right' ? x - px : x + px, ly + bh / 2 + 1);
  };

  // Disco line
  if (discoLine > 0) {
    const dy = discoLine * h;
    const x0 = doritoSide === 'bottom' ? w / 2 : 0;
    const x1 = doritoSide === 'top' ? w / 2 : w;
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(x0, dy); ctx.lineTo(x1, dy); ctx.stroke(); ctx.setLineDash([]);
    drawLabel('DISCO', (x0 + x1) / 2, dy - 10, '#fb923c', 'center', 'middle', 11);
  }
  // Zeeker line
  if (zeekerLine > 0) {
    const zy = zeekerLine * h;
    const x0 = doritoSide === 'top' ? w / 2 : 0;
    const x1 = doritoSide === 'bottom' ? w / 2 : w;
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(x0, zy); ctx.lineTo(x1, zy); ctx.stroke(); ctx.setLineDash([]);
    drawLabel('ZEEKER', (x0 + x1) / 2, zy + 10, '#22d3ee', 'center', 'middle', 11);
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
        drawLabel(label, cx2, cy2, color, 'center', 'middle', 14);
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
