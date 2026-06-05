import { COLORS, TEAM_COLORS } from '../../utils/theme';
import { formatKills } from '../../utils/deathAttribution';

/**
 * drawAnalyticsField — § 64.9 AnalyticsCanvas render-prop. Paints the death /
 * break analytics overlays onto BaseCanvas's <canvas>. Relocated VERBATIM from
 * LayoutAnalyticsPage's former bespoke draw effect (behavior-preserving); the
 * only delta is that BaseCanvas now owns the DPR scaling + transform, so this
 * helper paints at CSS pixel coords (w, h) exactly as the old effect did after
 * its `ctx.scale(2,2)`.
 *
 * NOTE: distinct from `drawAnalytics.js` (visibility / counter-bump heatmaps) —
 * different feature; do not conflate.
 *
 * opts: { mode:'deaths'|'breaks', imgObj, data, densityEnabled, attributionData,
 *         skullClusters, filter, linkMap }
 */
export function drawAnalyticsField(ctx, w, h, {
  mode, imgObj, data,
  densityEnabled, attributionData, skullClusters, filter, linkMap,
}) {
  if (!data) return;

  if (imgObj) {
    ctx.drawImage(imgObj, 0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
  }

  const gridSize = 8;
  const cols = Math.ceil(w / gridSize), rows = Math.ceil(h / gridSize);

  const buildGrid = (pts, radius) => {
    const grid = new Float32Array(cols * rows);
    pts.forEach(pos => {
      const cx = pos.x * w, cy = pos.y * h;
      const x0 = Math.max(0, Math.floor((cx - radius) / gridSize));
      const y0 = Math.max(0, Math.floor((cy - radius) / gridSize));
      const x1 = Math.min(cols - 1, Math.ceil((cx + radius) / gridSize));
      const y1 = Math.min(rows - 1, Math.ceil((cy + radius) / gridSize));
      for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
        const dx = gx * gridSize + gridSize / 2 - cx, dy = gy * gridSize + gridSize / 2 - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < radius) { const wt = 1 - d / radius; grid[gy * cols + gx] += wt * wt; }
      }
    });
    let max = 0; for (let i = 0; i < grid.length; i++) if (grid[i] > max) max = grid[i];
    return { grid, max };
  };

  const renderGrid = (grid, max, colorFn) => {
    if (max <= 0) return;
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
      const v = grid[gy * cols + gx]; if (v < 0.005) continue;
      ctx.fillStyle = colorFn(Math.min(1, v / max));
      ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize);
    }
  };

  if (mode === 'deaths') {
    // Red heatmap — density layer gated by densityEnabled (§ 61 Stage 3).
    // Skull clusters still render below regardless of density flag.
    if (data.deaths.length && densityEnabled) {
      const { grid, max } = buildGrid(data.deaths, 22);
      renderGrid(grid, max, t => {
        const r = Math.round(239 + (220 - 239) * t);
        const g = Math.round(68 + (38 - 68) * t);
        const b = Math.round(68 + (38 - 68) * t);
        return `rgba(${r},${g},${b},${Math.min(0.85, t * 0.85 + 0.12)})`;
      });
    }

    // Cross-filter active predicates (relocated from LayoutAnalyticsPage).
    const isSkullActive = (skullId) => {
      if (!filter.mode) return true;
      if (filter.mode === 'skull') return filter.id === skullId;
      return linkMap.shooterToSkulls.get(filter.id)?.has(skullId) === true;
    };
    const isShooterActive = (shooterId) => {
      if (!filter.mode) return true;
      if (filter.mode === 'shooter') return filter.id === shooterId;
      return linkMap.skullToShooters.get(filter.id)?.has(shooterId) === true;
    };

    // § 61 hotfix 2026-05-12 Bug 4: marker render split into faded layer
    // first, highlighted layer last so highlighted markers (either type)
    // sit on top of every faded marker.
    const drawSkull = (cl, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀', cl.x * w, cl.y * h);
      if (cl.count > 1) {
        const bx = cl.x * w + 9, by = cl.y * h - 9;
        ctx.fillStyle = COLORS.danger; ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${cl.count > 9 ? 8 : 9}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(cl.count), bx, by);
      }
    };
    const drawShooterMarker = (m, alpha) => {
      ctx.globalAlpha = alpha;
      const mx = m.x * w, my = m.y * h;
      const team = TEAM_COLORS[m.team] || TEAM_COLORS.A;
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fillStyle = team;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      const label = formatKills(m.credit);
      const bx = mx + 8, by = my - 8;
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = team;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${label.length > 2 ? 7 : 8}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx, by);
    };
    const validShooters = attributionData.shooterMarkers.filter(m => m && m.credit > 0);
    if (filter.mode) {
      // Pass 1 — faded layer (both marker types interleaved at 0.3 alpha).
      skullClusters.forEach(cl => { if (!isSkullActive(cl.id)) drawSkull(cl, 0.3); });
      validShooters.forEach(m => { if (!isShooterActive(m.id)) drawShooterMarker(m, 0.3); });
      // Pass 2 — highlighted layer (both types) on top of all faded markers.
      skullClusters.forEach(cl => { if (isSkullActive(cl.id)) drawSkull(cl, 1); });
      validShooters.forEach(m => { if (isShooterActive(m.id)) drawShooterMarker(m, 1); });
    } else {
      // No filter — original z-order: density < skulls < shooters, all full alpha.
      skullClusters.forEach(cl => drawSkull(cl, 1));
      validShooters.forEach(m => drawShooterMarker(m, 1));
    }
    ctx.globalAlpha = 1;
  } else {
    // Amber heatmap
    if (data.positions.length) {
      const { grid, max } = buildGrid(data.positions, 20);
      renderGrid(grid, max, t => {
        const r = Math.round(250 + (239 - 250) * t);
        const g = Math.round(204 + (68 - 204) * t);
        const b = Math.round(21 + (68 - 21) * t);
        return `rgba(${r},${g},${b},${Math.min(0.88, t * 0.85 + 0.12)})`;
      });
      // Bump arrows
      data.bumpData.forEach(({ from, to }) => {
        ctx.strokeStyle = COLORS.bumpStop + '40'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]);
        ctx.beginPath(); ctx.moveTo(from.x * w, from.y * h); ctx.lineTo(to.x * w, to.y * h); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(to.x * w, to.y * h, 3, 0, Math.PI * 2); ctx.fillStyle = COLORS.bumpStop + '60'; ctx.fill();
      });
      // Dots + triangles
      const runSet = new Set(data.runners.map(r => `${r.x},${r.y}`));
      data.positions.forEach(p => {
        if (runSet.has(`${p.x},${p.y}`)) return;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
      });
      data.runners.forEach(p => {
        const tx = p.x * w, ty = p.y * h, s = 4;
        ctx.beginPath(); ctx.moveTo(tx, ty - s); ctx.lineTo(tx + s, ty + s * 0.7); ctx.lineTo(tx - s, ty + s * 0.7); ctx.closePath();
        ctx.fillStyle = 'rgba(34,197,94,0.55)'; ctx.fill();
      });
    }
  }
}
