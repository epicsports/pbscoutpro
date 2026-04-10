import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { EmptyState, SkeletonList } from '../components/ui';
import { useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS } from '../utils/theme';

function mirrorToLeft(players, fieldSide) {
  if (!players) return [];
  return players.map(p => {
    if (!p) return null;
    return fieldSide === 'right' ? { x: 1 - p.x, y: p.y } : p;
  });
}

export default function LayoutDeathsPage() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const { layouts } = useLayouts();
  const layout = layouts.find(l => l.id === layoutId);
  const [loading, setLoading] = useState(true);
  const [deaths, setDeaths] = useState([]);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [size, setSize] = useState({ w: 600, h: 400 });

  // Load image
  useEffect(() => {
    if (!layout?.fieldImage) { setImgObj(null); return; }
    const img = new Image();
    img.onload = () => setImgObj(img);
    img.src = layout.fieldImage;
  }, [layout?.fieldImage]);

  // Resize canvas
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (imgObj) {
        const aspectH = Math.floor(w * (imgObj.height / imgObj.width));
        const maxH = typeof window !== 'undefined' ? window.innerHeight - 150 : 500;
        const h = Math.min(aspectH, maxH);
        setSize({ w: h === aspectH ? w : Math.floor(h * (imgObj.width / imgObj.height)), h });
      } else {
        setSize({ w, h: Math.min(w * 0.65, 400) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj]);

  // Fetch deaths
  useEffect(() => {
    if (!layoutId) return;
    setLoading(true);
    ds.fetchLayoutDeaths(layoutId).then(points => {
      const allDeaths = [];
      points.forEach(pt => {
        ['homeData', 'awayData', 'teamA', 'teamB'].forEach(key => {
          const d = pt[key];
          if (!d || !d.players) return;
          const fs = d.fieldSide || pt.fieldSide || 'left';
          const mirrored = mirrorToLeft(d.players, fs);
          const elims = d.eliminations || [];
          mirrored.forEach((p, i) => {
            if (p && elims[i]) allDeaths.push(p);
          });
        });
      });
      setDeaths(allDeaths);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [layoutId]);

  // Draw heatmap
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = size;
    canvas.width = w * 2; canvas.height = h * 2; ctx.scale(2, 2);

    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
    }

    if (!deaths.length) return;

    // Heatmap grid
    const gridSize = 8;
    const cols = Math.ceil(w / gridSize), rows = Math.ceil(h / gridSize);
    const grid = new Float32Array(cols * rows);
    const radius = 22;
    deaths.forEach(pos => {
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

    // Render: red heatmap
    if (max > 0) {
      for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
        const v = grid[gy * cols + gx]; if (v < 0.005) continue;
        const t = Math.min(1, v / max);
        const r = Math.round(239 + (220 - 239) * t);
        const g = Math.round(68 + (38 - 68) * t);
        const b = Math.round(68 + (38 - 68) * t);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.85, t * 0.85 + 0.12)})`;
        ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize);
      }
    }

    // Skull clusters
    const CLUSTER_DIST = 0.06;
    const used = new Set();
    const clusters = [];
    deaths.forEach((d, i) => {
      if (used.has(i)) return;
      const cluster = [d]; used.add(i);
      deaths.forEach((d2, j) => {
        if (used.has(j)) return;
        const dx = d.x - d2.x, dy = d.y - d2.y;
        if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_DIST) { cluster.push(d2); used.add(j); }
      });
      const cx = cluster.reduce((s, c) => s + c.x, 0) / cluster.length;
      const cy = cluster.reduce((s, c) => s + c.y, 0) / cluster.length;
      clusters.push({ x: cx, y: cy, count: cluster.length });
    });

    clusters.forEach(cl => {
      const px = cl.x * w, py = cl.y * h;
      ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀', px, py);
      if (cl.count > 1) {
        const bx = px + 9, by = py - 9;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${cl.count > 9 ? 8 : 9}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(cl.count), bx, by);
      }
    });
  }, [size, imgObj, deaths]);

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        back={{ to: `/layout/${layoutId}` }}
        title="Deaths heatmap"
        subtitle={layout?.name || 'Layout'}
      />
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <SkeletonList count={1} />}
        {!loading && !deaths.length && <EmptyState icon="💀" text="No elimination data yet" />}
        {!loading && deaths.length > 0 && (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' }}>
            {deaths.length} eliminations across all tournaments
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <canvas ref={canvasRef} style={{ width: size.w, height: size.h, borderRadius: RADIUS.lg, display: 'block', border: `1px solid ${COLORS.border}` }} />
        </div>
      </div>
    </div>
  );
}
