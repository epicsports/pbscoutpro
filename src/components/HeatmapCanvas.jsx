import React, { useRef, useEffect, useState } from 'react';
import { COLORS, FONT, TOUCH } from '../utils/theme';

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

    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, w, h);
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
        const v = grid[gy * cols + gx]; if (v < 0.01) continue;
        ctx.fillStyle = colorFn(Math.min(1, v / max));
        ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize);
      }
    };

    let count = 0;

    if (mode === 'positions') {
      // Light blue (#60a5fa) → purple (#a855f7)
      const pos = [];
      points.forEach(pt => { for (let i = 0; i < 5; i++) if (pt.players?.[i]) pos.push(pt.players[i]); });
      count = pos.length;
      const { grid, max } = buildGrid(pos, 40);
      renderGrid(grid, max, t => {
        const r = Math.round(96 + 72 * t), g = Math.round(165 - 80 * t), b = Math.round(250 - 3 * t);
        return `rgba(${r},${g},${b},${Math.min(0.6, t * 0.8 + 0.1)})`;
      });
      pos.forEach(p => { ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(96,165,250,0.7)'; ctx.fill(); });
    } else {
      // Shots: white → yellow + directional fade lines
      const shotData = [];
      points.forEach(pt => {
        const shots = Array.isArray(pt.shots) ? pt.shots : pt.shots ? [0,1,2,3,4].map(i => pt.shots[String(i)] || []) : [];
        for (let i = 0; i < 5; i++) {
          if (!shots[i] || !pt.players?.[i]) continue;
          shots[i].forEach(s => shotData.push({ sx: s.x, sy: s.y, px: pt.players[i].x, py: pt.players[i].y }));
        }
      });
      count = shotData.length;
      const { grid, max } = buildGrid(shotData.map(s => ({ x: s.sx, y: s.sy })), 30);
      renderGrid(grid, max, t => {
        const g = Math.round(255 - 68 * t), b = Math.round(255 - 219 * t);
        return `rgba(255,${g},${b},${Math.min(0.55, t * 0.7 + 0.08)})`;
      });
      // Directional fade lines: 15px from shot point along player→shot vector
      shotData.forEach(s => {
        const sx = s.sx * w, sy = s.sy * h, px = s.px * w, py = s.py * h;
        const dx = sx - px, dy = sy - py, len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        const nx = dx / len, ny = dy / len;
        const ex = sx + nx * 15, ey = sy + ny * 15;
        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0, 'rgba(251,191,36,0.5)'); grad.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      });
      shotData.forEach(s => { ctx.beginPath(); ctx.arc(s.sx * w, s.sy * h, 2.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill(); });
    }

    ctx.fillStyle = COLORS.text; ctx.font = `bold ${TOUCH.fontXs}px ${FONT}`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(`${count} ${mode === 'positions' ? 'pozycji' : 'strzałów'}`, w - 8, 8);
  }, [size, imgObj, points, mode, rosterPlayers]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas ref={canvasRef} style={{ width: size.w, height: size.h, borderRadius: 10, display: 'block', border: `1px solid ${COLORS.border}` }} />
    </div>
  );
}
