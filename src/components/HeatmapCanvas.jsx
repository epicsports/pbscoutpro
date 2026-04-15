import React, { useRef, useEffect, useState } from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

export default function HeatmapCanvas({ fieldImage, points = [], rosterPlayers = [], bunkers = [], showBunkers = false, dangerZone = null, sajgonZone = null, showZones = false, showPositions = true, showShots = true, heroPlayerIds = [] }) {
  const device = useDevice();
  const R = responsive(device.type);
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
        setSize(imgObj ? (() => {
          const aspectH = Math.floor(w * (imgObj.height / imgObj.width));
          const maxH = typeof window !== 'undefined' ? window.innerHeight - 200 : R.canvas.maxHeight;
          const h = Math.min(aspectH, maxH);
          return { w: h === aspectH ? w : Math.floor(h * (imgObj.width / imgObj.height)), h };
        })() : { w, h: Math.min(w * 0.65, R.canvas.maxHeight - 100) });
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

    // ── Layer 1: Position heatmap ──
    if (showPositions) {
    // Split by side for different colors; tag each pos with hero flag
    const heroSet = new Set(heroPlayerIds);
    const posA = [], posB = [];
    const runnerPosA = [], runnerPosB = [];
    const elimPosA = [], elimPosB = [];
    points.forEach(pt => {
      const isB = pt.side === 'B';
      for (let i = 0; i < 5; i++) {
        if (!pt.players?.[i]) continue;
        const isRunner = pt.runners?.[i];
        const isElim = pt.eliminations?.[i];
        const assignedId = pt.assignments?.[i];
        const isHero = !!(assignedId && heroSet.has(assignedId));
        const marker = { ...pt.players[i], isHero };
        if (isElim) {
          (isB ? elimPosB : elimPosA).push(marker);
        } else if (isB) {
          (isRunner ? runnerPosB : posB).push(marker);
        } else {
          (isRunner ? runnerPosA : posA).push(marker);
        }
      }
    });
    // Team A heatmap (green) — includes ALL positions (alive + eliminated)
    const allPosA = [...posA, ...runnerPosA, ...elimPosA];
    if (allPosA.length > 0) {
      const { grid, max } = buildGrid(allPosA, 20);
      renderGrid(grid, max, t => {
        const r = Math.round(34  + (20  - 34)  * t);
        const g = Math.round(197 + (83  - 197) * t);
        const b = Math.round(94  + (45  - 94)  * t);
        return `rgba(${r},${g},${b},${Math.min(0.90, t * 0.9 + 0.15)})`;
      });
    }
    // Team B heatmap (teal) — includes ALL positions (alive + eliminated)
    const allPosB = [...posB, ...runnerPosB, ...elimPosB];
    if (allPosB.length > 0) {
      const { grid, max } = buildGrid(allPosB, 20);
      renderGrid(grid, max, t => {
        const r = Math.round(6   + (4   - 6)   * t);
        const g = Math.round(182 + (120 - 182) * t);
        const b = Math.round(212 + (180 - 212) * t);
        return `rgba(${r},${g},${b},${Math.min(0.90, t * 0.9 + 0.15)})`;
      });
    }
    // Hero ring (§ 25) — amber stroke around HERO position dots
    const drawHeroRing = (p, radius) => {
      if (!p.isHero) return;
      ctx.save();
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.restore();
    };
    // Dots: circles for gun-up, triangles for runners
    const drawDot = (p, color) => {
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      drawHeroRing(p, 3.5);
    };
    const drawTriangle = (p, color) => {
      const tx = p.x * w, ty = p.y * h, s2 = 4.5;
      ctx.beginPath(); ctx.moveTo(tx, ty - s2); ctx.lineTo(tx + s2, ty + s2*0.7); ctx.lineTo(tx - s2, ty + s2*0.7); ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
      drawHeroRing(p, s2);
    };
    posA.forEach(p => drawDot(p, 'rgba(34,197,94,0.7)'));
    runnerPosA.forEach(p => drawTriangle(p, 'rgba(34,197,94,0.7)'));
    posB.forEach(p => drawDot(p, 'rgba(6,182,212,0.7)'));
    runnerPosB.forEach(p => drawTriangle(p, 'rgba(6,182,212,0.7)'));
    // Eliminated players: faded dot + prominent red X
    const drawElimX = (p, teamColor) => {
      const px = p.x * w, py = p.y * h, s = 5;
      // Dark bg circle for contrast
      ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
      // Faded team dot
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = teamColor; ctx.fill();
      ctx.globalAlpha = 1;
      // Red X
      ctx.strokeStyle = COLORS.danger; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px - s, py - s); ctx.lineTo(px + s, py + s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px + s, py - s); ctx.lineTo(px - s, py + s); ctx.stroke();
      ctx.lineCap = 'butt';
      drawHeroRing(p, 5.5);
    };
    elimPosA.forEach(p => drawElimX(p, 'rgba(34,197,94,0.5)'));
    elimPosB.forEach(p => drawElimX(p, 'rgba(6,182,212,0.5)'));

    // ── Layer 2: Bump stops ──
    const bumpsA = [], bumpsB = [];
    points.forEach(pt => {
      const isB = pt.side === 'B';
      for (let i = 0; i < 5; i++) if (pt.bumpStops?.[i]) (isB ? bumpsB : bumpsA).push(pt.bumpStops[i]);
    });
    const drawBumpLayer = (bumpList, colorFn, diamondColor) => {
      if (bumpList.length === 0) return;
      const { grid: bg, max: bmax } = buildGrid(bumpList, 16);
      renderGrid(bg, bmax, colorFn);
      bumpList.forEach(p => {
        const bx = p.x * w, by = p.y * h, s = 4;
        ctx.beginPath(); ctx.moveTo(bx, by - s); ctx.lineTo(bx + s, by);
        ctx.lineTo(bx, by + s); ctx.lineTo(bx - s, by); ctx.closePath();
        ctx.fillStyle = diamondColor; ctx.fill();
      });
    };
    // Team A bumps (blue)
    drawBumpLayer(bumpsA, t => {
      const r = Math.round(191 + (168 - 191) * t);
      const g = Math.round(219 + (85  - 219) * t);
      const b = Math.round(254 + (247 - 254) * t);
      return `rgba(${r},${g},${b},${Math.min(0.92, t * 0.95 + 0.18)})`;
    }, 'rgba(147,197,253,0.9)');
    // Team B bumps (pink)
    drawBumpLayer(bumpsB, t => {
      const r = Math.round(244 + (212 - 244) * t);
      const g = Math.round(114 + (83  - 114) * t);
      const b = Math.round(182 + (150 - 182) * t);
      return `rgba(${r},${g},${b},${Math.min(0.92, t * 0.95 + 0.18)})`;
    }, 'rgba(244,114,182,0.9)');

    } // end showPositions

    // ── Layer 3: Shots heatmap + direction lines ──
    if (showShots) {
    const shotDataA = [], shotDataB = [];
    points.forEach(pt => {
      const isB = pt.side === 'B';
      const shots = Array.isArray(pt.shots) ? pt.shots : pt.shots ? [0,1,2,3,4].map(i => pt.shots[String(i)] || []) : [];
      for (let i = 0; i < 5; i++) {
        if (!shots[i] || !pt.players?.[i]) continue;
        shots[i].forEach(s => (isB ? shotDataB : shotDataA).push({ sx: s.x, sy: s.y, px: pt.players[i].x, py: pt.players[i].y, isKill: s.isKill }));
      }
    });
    const drawShotLayer = (shotData, heatColorFn, lineColor) => {
      if (shotData.length === 0) return;
      const { grid, max } = buildGrid(shotData.map(s => ({ x: s.sx, y: s.sy })), 15);
      renderGrid(grid, max, heatColorFn);
      shotData.forEach(s => {
        const sx = s.sx * w, sy = s.sy * h, px = s.px * w, py = s.py * h;
        const dx = sx - px, dy = sy - py, len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        const nx = dx / len, ny = dy / len;
        const ex = sx + nx * 18, ey = sy + ny * 18;
        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0, lineColor); grad.addColorStop(1, lineColor.replace(/[\d.]+\)$/, '0)'));
        ctx.strokeStyle = grad; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      });
    };
    // Team A shots (red)
    drawShotLayer(shotDataA, t => {
      return `rgba(${Math.round(239 + (220 - 239) * t)},${Math.round(68 + (38 - 68) * t)},${Math.round(68 + (38 - 68) * t)},${Math.min(0.88, t * 0.9 + 0.15)})`;
    }, 'rgba(239,68,68,0.7)');
    // Team B shots (teal)
    drawShotLayer(shotDataB, t => {
      return `rgba(${Math.round(6 + (4 - 6) * t)},${Math.round(182 + (212 - 182) * t)},${Math.round(212 + (240 - 212) * t)},${Math.min(0.88, t * 0.9 + 0.15)})`;
    }, 'rgba(6,182,212,0.7)');
    // Combined kills clustering
    const shotData = [...shotDataA, ...shotDataB];
    if (shotData.length > 0) {
      const CLUSTER_DIST = 0.06;
      const kills = shotData.filter(s => s.isKill);
      const normals = shotData.filter(s => !s.isKill);
      const clusters = []; const used = new Set();
      kills.forEach((k, i) => {
        if (used.has(i)) return;
        const cluster = [k]; used.add(i);
        kills.forEach((k2, j) => {
          if (used.has(j)) return;
          const dx = k.sx - k2.sx, dy = k.sy - k2.sy;
          if (Math.sqrt(dx*dx + dy*dy) < CLUSTER_DIST) { cluster.push(k2); used.add(j); }
        });
        const cx = cluster.reduce((s, c) => s + c.sx, 0) / cluster.length;
        const cy = cluster.reduce((s, c) => s + c.sy, 0) / cluster.length;
        clusters.push({ x: cx, y: cy, count: cluster.length });
      });
      clusters.forEach(cl => {
        const px = cl.x * w, py = cl.y * h;
        ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💀', px, py);
        if (cl.count > 1) {
          const bx = px + 8, by = py - 8;
          ctx.fillStyle = COLORS.danger;
          ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${cl.count > 9 ? 7 : 8}px sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(cl.count), bx, by);
        }
      });
      normals.forEach(s => {
        const sx = s.sx * w, sy = s.sy * h;
        ctx.strokeStyle = 'rgba(239,68,68,0.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(239,68,68,0.8)'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx - 8, sy); ctx.lineTo(sx - 5.5, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 5.5, sy); ctx.lineTo(sx + 8, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx, sy - 5.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy + 5.5); ctx.lineTo(sx, sy + 8); ctx.stroke();
      });
    }

    } // end showShots

    // ── Zones overlay ──
    if (showZones) {
      const drawZone = (pts, color, label) => {
        if (!pts || pts.length < 3) return;
        ctx.beginPath(); ctx.moveTo(pts[0].x * w, pts[0].y * h);
        pts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x * w, p.y * h); });
        ctx.closePath();
        ctx.fillStyle = color + '20'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
        const cx2 = pts.reduce((s, p) => s + p.x, 0) / pts.length * w;
        const cy2 = pts.reduce((s, p) => s + p.y, 0) / pts.length * h;
        ctx.fillStyle = color; ctx.font = `bold 12px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cx2, cy2);
      };
      if (dangerZone?.length >= 3) drawZone(dangerZone, COLORS.danger, 'DANGER');
      if (sajgonZone?.length >= 3) drawZone(sajgonZone, COLORS.info, 'SAJGON');
    }

    // ── Bunker labels ──
    if (showBunkers && bunkers.length > 0) {
      bunkers.forEach(b => {
        const bx = b.x * w, by = b.y * h;
        ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15'; ctx.fill();
        ctx.font = `bold 9px ${FONT}`;
        const tw = ctx.measureText(b.name).width;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath(); ctx.roundRect(bx + 6, by - 8, tw + 6, 14, 2); ctx.fill();
        ctx.fillStyle = '#facc15'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(b.name, bx + 9, by - 1);
      });
    }
  }, [size, imgObj, points, rosterPlayers, bunkers, showBunkers, dangerZone, sajgonZone, showZones, showPositions, showShots, heroPlayerIds]);

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <canvas ref={canvasRef} style={{ width: size.w, height: size.h, borderRadius: RADIUS.lg, display: 'block', border: `1px solid ${COLORS.border}` }} />
    </div>
  );
}
