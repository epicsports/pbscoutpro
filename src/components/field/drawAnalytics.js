import { activeHeatmap } from '../../utils/theme';
import { makeFieldTransform } from '../../utils/helpers';

/** Draw visibility heatmap, counter bump heatmap, enemy path. */
export function drawAnalytics(ctx, w, h, {
  visibilityData, showVisibility, fieldCalibration,
  counterData, showCounter,
  enemyPath, counterDraft,
}) {
  // Visibility heatmap (3-channel: safe | arc | exposed)
  if (showVisibility && visibilityData) {
    const { cols, rows, safe, arc, exposed } = visibilityData;
    const scheme = activeHeatmap;
    const ft = makeFieldTransform(fieldCalibration);
    if (ft) {
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const idx = gy * cols + gx;
          const s = safe[idx], a = arc[idx], e = exposed[idx];
          if (s > 0.01) ctx.fillStyle = scheme.safe(s);
          else if (a > 0.01) ctx.fillStyle = scheme.arc(a);
          else if (e > 0.01) ctx.fillStyle = scheme.exposed(e);
          else continue;
          const fx = (gx + 0.5) / cols, fy = (gy + 0.5) / rows;
          const img = ft.toImage(fx, fy);
          const cellW = w / cols * (ft.fieldLenImg * w / w);
          const cellH = h / rows * (ft.fieldWidthImg * h / h);
          ctx.fillRect(img.x * w - cellW / 2, img.y * h - cellH / 2, cellW + 0.5, cellH + 0.5);
        }
      }
    } else {
      const imgData = ctx.createImageData(cols, rows);
      const d = imgData.data;
      for (let i = 0; i < cols * rows; i++) {
        const s = safe[i], a = arc[i], e = exposed[i];
        let r = 0, g = 0, b = 0, al = 0;
        if (s > 0.01) { r = Math.round(s * 255); g = Math.round((1 - s) * 200); al = Math.min(180, Math.round(s * 180 + 12)); }
        else if (a > 0.01) { r = 255; g = Math.round(160 - a * 60); b = Math.round(40 - a * 30); al = Math.min(140, Math.round(a * 155 + 10)); }
        else if (e > 0.01) { r = Math.round(e * 100); g = Math.round(e * 80); b = Math.round(180 + e * 75); al = Math.min(100, Math.round(e * 130 + 8)); }
        const off = i * 4;
        d[off] = r; d[off + 1] = g; d[off + 2] = b; d[off + 3] = al;
      }
      const tmp = document.createElement('canvas');
      tmp.width = cols; tmp.height = rows;
      tmp.getContext('2d').putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(tmp, 0, 0, w, h);
    }
  }

  // Counter bump heatmap
  if (showCounter && counterData?.bumpGrid) {
    const { bumpGrid, bumpCols, bumpRows } = counterData;
    const scheme = activeHeatmap;
    const ft = makeFieldTransform(fieldCalibration);
    if (ft) {
      for (let gy = 0; gy < bumpRows; gy++) {
        for (let gx = 0; gx < bumpCols; gx++) {
          const p = bumpGrid[gy * bumpCols + gx];
          if (p < 0.02) continue;
          ctx.fillStyle = scheme.bump(p);
          const fx = (gx + 0.5) / bumpCols, fy = (gy + 0.5) / bumpRows;
          const img = ft.toImage(fx, fy);
          ctx.fillRect(img.x * w - w / bumpCols * ft.fieldLenImg / 2, img.y * h - h / bumpRows * ft.fieldWidthImg / 2, w / bumpCols * ft.fieldLenImg + .5, h / bumpRows * ft.fieldWidthImg + .5);
        }
      }
    } else {
      const cw = w / bumpCols, ch = h / bumpRows;
      for (let gy = 0; gy < bumpRows; gy++) {
        for (let gx = 0; gx < bumpCols; gx++) {
          const p = bumpGrid[gy * bumpCols + gx];
          if (p < 0.02) continue;
          ctx.fillStyle = scheme.bump(p);
          ctx.fillRect(gx * cw, gy * ch, cw + .5, ch + .5);
        }
      }
    }
  }

  // Enemy path (orange polyline + arrow)
  if (enemyPath?.length >= 2) {
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(enemyPath[0].x * w, enemyPath[0].y * h);
    for (let i = 1; i < enemyPath.length; i++) ctx.lineTo(enemyPath[i].x * w, enemyPath[i].y * h);
    ctx.stroke();
    const last = enemyPath[enemyPath.length - 1], prev = enemyPath[enemyPath.length - 2];
    const adx = last.x - prev.x, ady = last.y - prev.y, alen = Math.sqrt(adx*adx + ady*ady);
    if (alen > 0.001) {
      const nx = adx/alen, ny = ady/alen, ex = last.x * w, ey = last.y * h;
      ctx.fillStyle = '#f97316'; ctx.beginPath();
      ctx.moveTo(ex, ey); ctx.lineTo(ex - nx*14 - ny*7, ey - ny*14 + nx*7); ctx.lineTo(ex - nx*14 + ny*7, ey - ny*14 - nx*7);
      ctx.closePath(); ctx.fill();
    }
  }

  // Enemy path draft (during drawing)
  if (counterDraft?.length >= 2) {
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(counterDraft[0].x * w, counterDraft[0].y * h);
    for (let i = 1; i < counterDraft.length; i++) ctx.lineTo(counterDraft[i].x * w, counterDraft[i].y * h);
    ctx.stroke(); ctx.setLineDash([]);
  }
}
