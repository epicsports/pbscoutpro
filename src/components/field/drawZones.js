import { FONT } from '../../utils/theme';

/** Draw disco/zeeker lines + danger/sajgon/bigMove zone polygons. */
export function drawZones(ctx, w, h, {
  discoLine, zeekerLine,
  showZones, dangerZone, sajgonZone, bigMoveZone,
  layoutEditMode, editDangerPoints, editSajgonPoints, editBigMovePoints,
  selectedZoneVertex = -1,
  doritoSide, hideLineLabels,
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

  // Disco line — spans full field width (range marker for entire row)
  if (discoLine > 0) {
    const dy = discoLine * h;
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 5; ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(0, dy); ctx.lineTo(w, dy); ctx.stroke(); ctx.setLineDash([]);
    if (!hideLineLabels) drawLabel('DISCO', w / 2, dy - 10, '#fb923c', 'center', 'middle', 11);
  }
  // Zeeker line — spans full field width
  if (zeekerLine > 0) {
    const zy = zeekerLine * h;
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 5; ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(0, zy); ctx.lineTo(w, zy); ctx.stroke(); ctx.setLineDash([]);
    if (!hideLineLabels) drawLabel('ZEEKER', w / 2, zy + 10, '#22d3ee', 'center', 'middle', 11);
  }

  // Zone polygons
  const isEditingZone = layoutEditMode === 'danger' || layoutEditMode === 'sajgon' || layoutEditMode === 'bigMove';
  if (showZones || isEditingZone) {
    const drawZone = (pts, color, label) => {
      if (!pts || pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      pts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x * w, p.y * h); });
      if (pts.length > 2) ctx.closePath();
      ctx.fillStyle = color + '28'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
      if (pts.length > 2) {
        const cx2 = pts.reduce((s, p) => s + p.x, 0) / pts.length * w;
        const cy2 = pts.reduce((s, p) => s + p.y, 0) / pts.length * h;
        drawLabel(label, cx2, cy2, color, 'center', 'middle', 14);
      }
    };
    if (showZones) {
      if (dangerZone?.length > 2) drawZone(dangerZone, '#ef4444', 'DANGER');
      if (sajgonZone?.length > 2) drawZone(sajgonZone, '#3b82f6', 'SAJGON');
      if (bigMoveZone?.length > 2) drawZone(bigMoveZone, '#f59e0b', 'BIG MOVE');
    }
    if (layoutEditMode === 'danger') drawZone(editDangerPoints, '#ef4444', 'DANGER');
    if (layoutEditMode === 'sajgon') drawZone(editSajgonPoints, '#3b82f6', 'SAJGON');
    if (layoutEditMode === 'bigMove') drawZone(editBigMovePoints, '#f59e0b', 'BIG MOVE');
    // Vertex dots for edit mode
    const editPts =
      layoutEditMode === 'danger' ? editDangerPoints
      : layoutEditMode === 'sajgon' ? editSajgonPoints
      : layoutEditMode === 'bigMove' ? editBigMovePoints
      : [];
    const zColor =
      layoutEditMode === 'danger' ? '#ef4444'
      : layoutEditMode === 'sajgon' ? '#3b82f6'
      : layoutEditMode === 'bigMove' ? '#f59e0b'
      : '#ef4444';
    const pts = editPts || [];

    // Midpoint ghost dots (between consecutive vertices) — drag to insert vertex.
    if (pts.length >= 2) {
      for (let i = 0; i < pts.length; i++) {
        const next = (i + 1) % pts.length;
        // Skip closing edge if polygon not yet closed (triangle minimum)
        if (next === 0 && pts.length < 3) continue;
        const mx = (pts[i].x + pts[next].x) / 2 * w;
        const my = (pts[i].y + pts[next].y) / 2 * h;
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = zColor; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = zColor;
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', mx, my);
      }
    }

    // Vertex solid dots (with selected state ring)
    pts.forEach((p, i) => {
      const isSelected = selectedZoneVertex === i;
      const radius = isSelected ? 10 : 8;
      if (isSelected) {
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = zColor; ctx.globalAlpha = 0.4; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, radius, 0, Math.PI * 2);
      ctx.fillStyle = zColor; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      if (i === 0) {
        ctx.fillStyle = '#fff'; ctx.font = `bold 9px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✕', p.x * w, p.y * h);
      }
    });

    // Delete button on selected vertex (hidden on triangle — minimum constraint)
    if (typeof selectedZoneVertex === 'number' && selectedZoneVertex >= 0
        && pts.length > 3 && pts[selectedZoneVertex]) {
      const p = pts[selectedZoneVertex];
      const bx = p.x * w + 22;
      const by = p.y * h - 22;
      ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by - 5); ctx.lineTo(bx + 5, by + 5);
      ctx.moveTo(bx + 5, by - 5); ctx.lineTo(bx - 5, by + 5);
      ctx.stroke();
    }
  }
}
