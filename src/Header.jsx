import React, { useRef, useEffect, useState } from 'react';
import { COLORS, FONT, TOUCH } from '../utils/theme';

/**
 * HeatmapCanvas — unified green→yellow→red heat scale
 * All player positions/shots merged into one heat layer.
 */
export default function HeatmapCanvas({ fieldImage, points = [], mode = 'positions', rosterPlayers = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [size, setSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    if (!fieldImage) { setImgObj(null); return; }
    const img = new Image();
    img.onload = () => setImgObj(img);
    img.src = fieldImage;
  }, [fieldImage]);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width;
        setSize(imgObj ? { w, h: Math.min(w * (imgObj.height / imgObj.width), 600) } : { w, h: Math.min(w * 0.65, 500) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); const { w, h } = size;
    canvas.width = w * 2; canvas.height = h * 2; ctx.scale(2, 2);

    // Background
    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
    }

    // Collect all data points (unified across all players)
    const allPositions = [];
    if (mode === 'positions') {
      points.forEach(pt => {
        for (let i = 0; i < 5; i++) {
          if (pt.players?.[i]) allPositions.push(pt.players[i]);
        }
      });
    } else {
      points.forEach(pt => {
        const shots = Array.isArray(pt.shots) ? pt.shots : pt.shots ? [0,1,2,3,4].map(i => pt.shots[String(i)] || []) : [];
        for (let i = 0; i < 5; i++) {
          if (shots[i]) allPositions.push(...shots[i]);
        }
      });
    }

    if (allPositions.length === 0) {
      ctx.fillStyle = COLORS.textMuted + '60'; ctx.font = `${TOUCH.fontSm}px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('Brak danych do heatmapy', w / 2, h / 2);
    } else {
      // Create density grid
      const gridSize = 8; // px per cell
      const cols = Math.ceil(w / gridSize);
      const rows = Math.ceil(h / gridSize);
      const grid = new Float32Array(cols * rows);
      const radius = mode === 'positions' ? 40 : 30; // influence radius in px

      // Accumulate density
      allPositions.forEach(pos => {
        const cx = pos.x * w, cy = pos.y * h;
        const r = radius;
        const x0 = Math.max(0, Math.floor((cx - r) / gridSize));
        const y0 = Math.max(0, Math.floor((cy - r) / gridSize));
        const x1 = Math.min(cols - 1, Math.ceil((cx + r) / gridSize));
        const y1 = Math.min(rows - 1, Math.ceil((cy + r) / gridSize));
        for (let gy = y0; gy <= y1; gy++) {
          for (let gx = x0; gx <= x1; gx++) {
            const dx = gx * gridSize + gridSize / 2 - cx;
            const dy = gy * gridSize + gridSize / 2 - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < r) {
              const weight = 1 - (dist / r);
              grid[gy * cols + gx] += weight * weight; // quadratic falloff
            }
          }
        }
      });

      // Find max density
      let maxDensity = 0;
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] > maxDensity) maxDensity = grid[i];
      }

      // Render heat colors: green(0) → yellow(0.5) → red(1)
      if (maxDensity > 0) {
        for (let gy = 0; gy < rows; gy++) {
          for (let gx = 0; gx < cols; gx++) {
            const val = grid[gy * cols + gx];
            if (val < 0.01) continue;
            const t = Math.min(1, val / maxDensity); // 0..1
            // Color: green → yellow → red
            let r, g, b;
            if (t < 0.5) {
              const p = t * 2; // 0..1
              r = Math.round(255 * p);
              g = 200;
              b = 0;
            } else {
              const p = (t - 0.5) * 2; // 0..1
              r = 255;
              g = Math.round(200 * (1 - p));
              b = 0;
            }
            const alpha = Math.min(0.6, t * 0.8 + 0.1);
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize);
          }
        }
      }

      // Draw individual dots on top
      allPositions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos.x * w, pos.y * h, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
      });
    }

    // Count label
    ctx.fillStyle = COLORS.text; ctx.font = `bold ${TOUCH.fontXs}px ${FONT}`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(`${allPositions.length} ${mode === 'positions' ? 'pozycji' : 'strzałów'}`, w - 8, 8);

  }, [size, imgObj, points, mode, rosterPlayers]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas ref={canvasRef} style={{
        width: size.w, height: size.h, borderRadius: 10, display: 'block',
        border: `1px solid ${COLORS.border}`,
      }} />
    </div>
  );
}
