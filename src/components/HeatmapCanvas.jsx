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
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, w, h);
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

    let count = 0;

    if (mode === 'positions') {
      // ── Warstwa 1: pozycje graczy — zielony (rzadko) → czerwony (często) ──
      const pos = [];
      points.forEach(pt => { for (let i = 0; i < 5; i++) if (pt.players?.[i]) pos.push(pt.players[i]); });
      count = pos.length;
      const { grid, max } = buildGrid(pos, 40);
      renderGrid(grid, max, t => {
        // zielony #22c55e → żółty → czerwony #ef4444
        const r = Math.round(34  + (239 - 34)  * t);
        const g = Math.round(197 + (68  - 197) * t);
        const b = Math.round(94  + (68  - 94)  * t);
        return `rgba(${r},${g},${b},${Math.min(0.85, t * 0.9 + 0.15)})`;
      });
      // Kropki pozycji
      pos.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
      });

      // ── Warstwa 2: przycupy (bump stops) — ciemnoniebieski → jasnoniebieski ──
      const bumps = [];
      points.forEach(pt => { for (let i = 0; i < 5; i++) if (pt.bumpStops?.[i]) bumps.push(pt.bumpStops[i]); });
      if (bumps.length > 0) {
        const { grid: bg, max: bmax } = buildGrid(bumps, 32);
        renderGrid(bg, bmax, t => {
          // ciemnoniebieski #1e3a8a → jasnoniebieski #93c5fd
          const r = Math.round(30  + (147 - 30)  * t);
          const g = Math.round(58  + (197 - 58)  * t);
          const b = Math.round(138 + (253 - 138) * t);
          return `rgba(${r},${g},${b},${Math.min(0.90, t * 0.95 + 0.18)})`;
        });
        // Romb dla przycup (odróżnienie od kółek pozycji)
        bumps.forEach(p => {
          const bx = p.x * w, by = p.y * h, s = 4;
          ctx.beginPath(); ctx.moveTo(bx, by - s); ctx.lineTo(bx + s, by);
          ctx.lineTo(bx, by + s); ctx.lineTo(bx - s, by); ctx.closePath();
          ctx.fillStyle = 'rgba(147,197,253,0.9)'; ctx.fill();
        });
      }
    } else {
      // ── Strzały: intensywna heatmapa + linie kierunkowe ──
      const shotData = [];
      points.forEach(pt => {
        const shots = Array.isArray(pt.shots) ? pt.shots : pt.shots ? [0,1,2,3,4].map(i => pt.shots[String(i)] || []) : [];
        for (let i = 0; i < 5; i++) {
          if (!shots[i] || !pt.players?.[i]) continue;
          shots[i].forEach(s => shotData.push({ sx: s.x, sy: s.y, px: pt.players[i].x, py: pt.players[i].y, isKill: s.isKill }));
        }
      });
      count = shotData.length;
      const { grid, max } = buildGrid(shotData.map(s => ({ x: s.sx, y: s.sy })), 30);
      renderGrid(grid, max, t => {
        // żółty → pomarańczowy → czerwony (silniejsza intensywność)
        const r = 255;
        const g = Math.round(220 - 180 * t);
        const b = Math.round(30  -  30 * t);
        return `rgba(${r},${g},${b},${Math.min(0.85, t * 0.9 + 0.15)})`;
      });
      // Linie kierunkowe
      shotData.forEach(s => {
        const sx = s.sx * w, sy = s.sy * h, px = s.px * w, py = s.py * h;
        const dx = sx - px, dy = sy - py, len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        const nx = dx / len, ny = dy / len;
        const ex = sx + nx * 18, ey = sy + ny * 18;
        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0, 'rgba(251,191,36,0.7)'); grad.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      });
      // Znaczniki strzałów (kill = czaszka, normal = biały punkt)
      shotData.forEach(s => {
        if (s.isKill) {
          ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💀', s.sx * w, s.sy * h);
        } else {
          ctx.beginPath(); ctx.arc(s.sx * w, s.sy * h, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
        }
      });
    }

    ctx.fillStyle = COLORS.text; ctx.font = `bold ${TOUCH.fontXs}px ${FONT}`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(`${count} ${mode === 'positions' ? 'pozycji' : 'strzałów'}`, w - 8, 8);

    // Legenda
    if (mode === 'positions') {
      const lx = 8, ly = h - 28;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath();
      ctx.roundRect(lx - 4, ly - 4, 130, 22, 4); ctx.fill();
      // zielony
      ctx.fillStyle = 'rgba(34,197,94,0.9)'; ctx.fillRect(lx, ly + 3, 12, 10);
      ctx.fillStyle = COLORS.text; ctx.font = `${TOUCH.fontXs - 1}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('rzadko', lx + 15, ly + 8);
      // czerwony
      ctx.fillStyle = 'rgba(239,68,68,0.9)'; ctx.fillRect(lx + 60, ly + 3, 12, 10);
      ctx.fillText('często', lx + 75, ly + 8);
    }
  }, [size, imgObj, points, mode, rosterPlayers]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas ref={canvasRef} style={{ width: size.w, height: size.h, borderRadius: 10, display: 'block', border: `1px solid ${COLORS.border}` }} />
    </div>
  );
}
