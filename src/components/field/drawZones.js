import { FONT } from '../../utils/theme';

/**
 * Draw disco/zeeker lines + zone polygons.
 *
 * § 88 — Accepts EITHER the new unified shape (`zones[]` + `editZonePoints`)
 * OR the legacy 3 named-zone props (`dangerZone`/`sajgonZone`/`bigMoveZone`
 * + `editDangerPoints`/...). The new shape takes precedence when present.
 * Legacy callers (FieldCanvas, HeatmapCanvas's own painter) keep working
 * unchanged — the dual-write migration ensures the 3 named fields stay in
 * sync with `layout.zones[]` until v2 cleanup retires them.
 *
 * In the new shape:
 *   - `zones` = resolved zones array (from `resolveZones(layout)`)
 *   - `layoutEditMode` = zone id (or null)
 *   - `editZonePoints` = current draft polygon (the user is drawing)
 */
export function drawZones(ctx, w, h, {
  discoLine, zeekerLine,
  discoColor = '#fb923c', zeekerColor = '#22d3ee',   // § 98 — editable division-line colors (overlay.lineDivision)
  calloutLines, editLinePoints, activeLineId, showCalloutLines,   // § 98 4b — callout lines (config-only)
  showZones,
  // § 88 new shape
  zones,
  editZonePoints,
  // legacy 3-field shape (backward-compat)
  dangerZone, sajgonZone, bigMoveZone,
  editDangerPoints, editSajgonPoints, editBigMovePoints,
  layoutEditMode,
  selectedZoneVertex = -1,
  doritoSide, hideLineLabels,
  t,
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
    ctx.strokeStyle = discoColor; ctx.lineWidth = 5; ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(0, dy); ctx.lineTo(w, dy); ctx.stroke(); ctx.setLineDash([]);
    if (!hideLineLabels) drawLabel(t('zone_label_disco'), w / 2, dy - 10, discoColor, 'center', 'middle', 11);
  }
  // Zeeker line — spans full field width
  if (zeekerLine > 0) {
    const zy = zeekerLine * h;
    ctx.strokeStyle = zeekerColor; ctx.lineWidth = 5; ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(0, zy); ctx.lineTo(w, zy); ctx.stroke(); ctx.setLineDash([]);
    if (!hideLineLabels) drawLabel(t('zone_label_zeeker'), w / 2, zy + 10, zeekerColor, 'center', 'middle', 11);
  }

  // § 88 — new shape detection. When `zones` is an array, drive the renderer
  // from it directly (each zone carries its own color + name). Otherwise fall
  // back to the legacy 3-field shape so existing callers (FieldCanvas, others
  // that haven't migrated yet) keep working through the dual-write mirror.
  const useNewShape = Array.isArray(zones);

  // Active edit zone (new shape) — looked up by id in `layoutEditMode`.
  const activeZone = useNewShape && layoutEditMode
    ? zones.find(z => z && z.id === layoutEditMode)
    : null;
  const isEditingZone = useNewShape
    ? !!activeZone
    : (layoutEditMode === 'danger' || layoutEditMode === 'sajgon' || layoutEditMode === 'bigMove');

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

    // Committed (persisted) polygons + draft polygon for the zone being edited.
    if (useNewShape) {
      if (showZones) {
        // While editing a zone, suppress its committed silhouette so it
        // doesn't double-draw under the in-progress polygon (mirrors the
        // legacy behavior of drawing only the editPoints array for the
        // active zone).
        for (const z of zones) {
          if (!z || !Array.isArray(z.polygon) || z.polygon.length < 3) continue;
          if (activeZone && z.id === activeZone.id) continue;
          drawZone(z.polygon, z.color || '#ef4444', z.name || '');
        }
      }
      if (activeZone) {
        drawZone(editZonePoints || [], activeZone.color || '#ef4444', activeZone.name || '');
      }
    } else {
      if (showZones) {
        if (dangerZone?.length > 2) drawZone(dangerZone, '#ef4444', t('zone_label_danger'));
        if (sajgonZone?.length > 2) drawZone(sajgonZone, '#3b82f6', t('zone_label_sajgon'));
        if (bigMoveZone?.length > 2) drawZone(bigMoveZone, '#f59e0b', t('zone_label_bigmove'));
      }
      if (layoutEditMode === 'danger') drawZone(editDangerPoints, '#ef4444', t('zone_label_danger'));
      if (layoutEditMode === 'sajgon') drawZone(editSajgonPoints, '#3b82f6', t('zone_label_sajgon'));
      if (layoutEditMode === 'bigMove') drawZone(editBigMovePoints, '#f59e0b', t('zone_label_bigmove'));
    }

    // Vertex dots for edit mode — derived from the active edit polygon
    // regardless of shape.
    const editPts = useNewShape
      ? (activeZone ? (editZonePoints || []) : [])
      : (layoutEditMode === 'danger' ? editDangerPoints
         : layoutEditMode === 'sajgon' ? editSajgonPoints
         : layoutEditMode === 'bigMove' ? editBigMovePoints
         : []);
    const zColor = useNewShape
      ? (activeZone ? (activeZone.color || '#ef4444') : '#ef4444')
      : (layoutEditMode === 'danger' ? '#ef4444'
         : layoutEditMode === 'sajgon' ? '#3b82f6'
         : layoutEditMode === 'bigMove' ? '#f59e0b'
         : '#ef4444');
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

  // § 98 4b — callout lines (0..N), config-only display layer. Each is a
  // 2-point segment (name + color); a hatch on the tracked side (above/below)
  // is a config-time aid. Committed lines + the in-progress draw.
  if (showCalloutLines) {
    const drawHatch = (a, b, color, side) => {
      const ax = a.x * w, ay = a.y * h, bx = b.x * w, by = b.y * h;
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const ux = dx / len, uy = dy / len;          // unit along segment
      let nx = -uy, ny = ux;                         // normal
      // 'above' = normal pointing up (negative y); 'below' = down.
      if ((side === 'above' && ny > 0) || (side === 'below' && ny < 0)) { nx = -nx; ny = -ny; }
      const tick = 9, step = 14;
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5; ctx.setLineDash([]);
      for (let d = step / 2; d < len; d += step) {
        const px = ax + ux * d, py = ay + uy * d;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + nx * tick, py + ny * tick); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    const drawSegment = (a, b, color, name) => {
      const ax = a.x * w, ay = a.y * h, bx = b.x * w, by = b.y * h;
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      if (name) drawLabel(name, (ax + bx) / 2, (ay + by) / 2 - 10, color, 'center', 'middle', 11);
    };
    const drawEndpoints = (pts, color) => pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 9, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    });
    if (Array.isArray(calloutLines)) {
      for (const ln of calloutLines) {
        if (!ln || ln.id === activeLineId) continue;   // active drawn from editLinePoints below
        const g = ln.geometry;
        if (g && g.a && g.b) {
          drawSegment(g.a, g.b, ln.color || '#22d3ee', ln.name || '');
          drawHatch(g.a, g.b, ln.color || '#22d3ee', ln.trackSide || 'above');
        }
      }
    }
    const pts = editLinePoints || [];
    const activeLn = Array.isArray(calloutLines) ? calloutLines.find(l => l && l.id === activeLineId) : null;
    const aColor = activeLn?.color || '#22d3ee';
    if (pts.length >= 2) {
      drawSegment(pts[0], pts[1], aColor, activeLn?.name || '');
      if (activeLn) drawHatch(pts[0], pts[1], aColor, activeLn.trackSide || 'above');
    }
    if (pts.length >= 1) drawEndpoints(pts, aColor);
  }
}
