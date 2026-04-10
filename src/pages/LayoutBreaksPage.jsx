import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { EmptyState, SkeletonList } from '../components/ui';
import { useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS } from '../utils/theme';

function mirrorToLeft(players, fieldSide) {
  if (!players) return [];
  return players.map(p => p && fieldSide === 'right' ? { ...p, x: 1 - p.x } : p);
}

export default function LayoutBreaksPage() {
  const { layoutId } = useParams();
  const { layouts } = useLayouts();
  const layout = layouts.find(l => l.id === layoutId);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [runners, setRunners] = useState([]);
  const [bumpData, setBumpData] = useState([]);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [size, setSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    if (!layout?.fieldImage) { setImgObj(null); return; }
    const img = new Image();
    img.onload = () => setImgObj(img);
    img.src = layout.fieldImage;
  }, [layout?.fieldImage]);

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

  useEffect(() => {
    if (!layoutId) return;
    setLoading(true);
    ds.fetchLayoutDeaths(layoutId).then(points => {
      const pos = [], run = [], bumps = [];
      points.forEach(pt => {
        ['homeData', 'awayData', 'teamA', 'teamB'].forEach(key => {
          const d = pt[key];
          if (!d || !d.players) return;
          const fs = d.fieldSide || pt.fieldSide || 'left';
          const mirrored = mirrorToLeft(d.players, fs);
          const mirroredBumps = mirrorToLeft(d.bumpStops || [], fs);
          const rn = d.runners || [];
          mirrored.forEach((p, i) => {
            if (!p) return;
            pos.push(p);
            if (rn[i]) run.push(p);
            if (mirroredBumps[i]) bumps.push({ from: p, to: mirroredBumps[i] });
          });
        });
      });
      setPositions(pos);
      setRunners(run);
      setBumpData(bumps);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [layoutId]);

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

    if (!positions.length) return;

    const gridSize = 8;
    const cols = Math.ceil(w / gridSize), rows = Math.ceil(h / gridSize);
    const grid = new Float32Array(cols * rows);
    const radius = 20;
    positions.forEach(pos => {
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

    if (max > 0) {
      for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
        const v = grid[gy * cols + gx]; if (v < 0.005) continue;
        const t = Math.min(1, v / max);
        const r = Math.round(250 + (239 - 250) * t);
        const g = Math.round(204 + (68 - 204) * t);
        const b = Math.round(21 + (68 - 21) * t);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.88, t * 0.85 + 0.12)})`;
        ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize);
      }
    }

    // Bump arrows first (behind dots)
    bumpData.forEach(({ from, to }) => {
      ctx.strokeStyle = COLORS.bumpStop + '40'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]);
      ctx.beginPath(); ctx.moveTo(from.x * w, from.y * h); ctx.lineTo(to.x * w, to.y * h); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(to.x * w, to.y * h, 3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.bumpStop + '60'; ctx.fill();
    });

    // Dots for gun-up, triangles for runners
    const runSet = new Set(runners.map(r => `${r.x},${r.y}`));
    positions.forEach(p => {
      if (runSet.has(`${p.x},${p.y}`)) return;
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
    });
    runners.forEach(p => {
      const tx = p.x * w, ty = p.y * h, s = 4;
      ctx.beginPath(); ctx.moveTo(tx, ty - s); ctx.lineTo(tx + s, ty + s * 0.7); ctx.lineTo(tx - s, ty + s * 0.7); ctx.closePath();
      ctx.fillStyle = 'rgba(34,197,94,0.55)'; ctx.fill();
    });
  }, [size, imgObj, positions, runners, bumpData]);

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: `/layout/${layoutId}` }} title="Break positions" subtitle={layout?.name || 'Layout'} />
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <SkeletonList count={1} />}
        {!loading && !positions.length && <EmptyState icon="🎯" text="No scouted data yet" />}
        {!loading && positions.length > 0 && (
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>
            <span>● {positions.length} positions</span>
            <span style={{ color: '#22c55e' }}>▲ {runners.length} runners</span>
            <span style={{ color: COLORS.bumpStop }}>◇ {bumpData.length} bumps</span>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <canvas ref={canvasRef} style={{ width: size.w, height: size.h, borderRadius: RADIUS.lg, display: 'block', border: `1px solid ${COLORS.border}` }} />
        </div>
      </div>
    </div>
  );
}
