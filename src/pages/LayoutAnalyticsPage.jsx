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

function forceLeft(p) {
  if (!p) return null;
  return p.x > 0.5 ? { ...p, x: 1 - p.x } : p;
}

function extractData(points, mode) {
  const deaths = [], positions = [], runners = [], bumpData = [];
  points.forEach(pt => {
    const ctx = pt._ctx || {};
    const sides = [
      { data: pt.homeData || pt.teamA, side: 'A' },
      { data: pt.awayData || pt.teamB, side: 'B' },
    ].filter(s => s.data);
    sides.forEach(({ data: d, side }) => {
      if (!d.players) return;
      const fs = d.fieldSide || pt.fieldSide || 'left';
      const mirrored = mirrorToLeft(d.players, fs).map(forceLeft);
      const mirroredBumps = mirrorToLeft(d.bumpStops || [], fs).map(forceLeft);
      const rn = d.runners || [];
      const elims = d.eliminations || [];
      mirrored.forEach((p, i) => {
        if (!p) return;
        if (elims[i]) deaths.push({ ...p, _ctx: ctx, side, playerIdx: i });
        positions.push(p);
        if (rn[i]) runners.push(p);
        if (mirroredBumps[i]) bumpData.push({ from: p, to: mirroredBumps[i] });
      });
    });
  });
  return { deaths, positions, runners, bumpData };
}

const MODES = {
  deaths: { title: 'Deaths heatmap', icon: '💀', emptyText: 'No elimination data yet', loadingText: 'Loading elimination data...' },
  breaks: { title: 'Break positions', icon: '🎯', emptyText: 'No scouted data yet', loadingText: 'Loading break data...' },
};

export default function LayoutAnalyticsPage() {
  const { layoutId, mode } = useParams();
  const cfg = MODES[mode] || MODES.deaths;
  const { layouts } = useLayouts();
  const layout = layouts.find(l => l.id === layoutId);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
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
        const maxH = typeof window !== 'undefined' ? window.innerHeight - 90 : 500;
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
      setData(extractData(points, mode));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [layoutId, mode]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = size;
    canvas.width = w * 2; canvas.height = h * 2; ctx.scale(2, 2);

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
      // Red heatmap
      if (data.deaths.length) {
        const { grid, max } = buildGrid(data.deaths, 22);
        renderGrid(grid, max, t => {
          const r = Math.round(239 + (220 - 239) * t);
          const g = Math.round(68 + (38 - 68) * t);
          const b = Math.round(68 + (38 - 68) * t);
          return `rgba(${r},${g},${b},${Math.min(0.85, t * 0.85 + 0.12)})`;
        });
        // Skull clusters
        const CLUSTER_DIST = 0.04, used = new Set(), clusters = [];
        data.deaths.forEach((d, i) => {
          if (used.has(i)) return;
          const cluster = [d]; used.add(i);
          data.deaths.forEach((d2, j) => {
            if (used.has(j)) return;
            if (Math.sqrt((d.x - d2.x) ** 2 + (d.y - d2.y) ** 2) < CLUSTER_DIST) { cluster.push(d2); used.add(j); }
          });
          clusters.push({ x: cluster.reduce((s, c) => s + c.x, 0) / cluster.length, y: cluster.reduce((s, c) => s + c.y, 0) / cluster.length, count: cluster.length });
        });
        clusters.forEach(cl => {
          ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💀', cl.x * w, cl.y * h);
          if (cl.count > 1) {
            const bx = cl.x * w + 9, by = cl.y * h - 9;
            ctx.fillStyle = COLORS.danger; ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = `bold ${cl.count > 9 ? 8 : 9}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(cl.count), bx, by);
          }
        });
      }
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
  }, [size, imgObj, data, mode]);

  const hasData = data && (mode === 'deaths' ? data.deaths.length : data.positions.length);

  return (
    <div style={{ height: '100dvh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: `/layout/${layoutId}` }} title={cfg.title} subtitle={layout?.name || 'Layout'} />
      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', paddingBottom: 80 }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, animation: 'spin 1s linear infinite' }} />
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>{cfg.loadingText}</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {!loading && !hasData && <EmptyState icon={cfg.icon} text={cfg.emptyText} />}
        {!loading && hasData && (<>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>
            {mode === 'deaths'
              ? <span>{data.deaths.length} eliminations across all tournaments</span>
              : <>
                  <span>● {data.positions.length} positions</span>
                  <span style={{ color: COLORS.success }}>▲ {data.runners.length} runners</span>
                  <span style={{ color: COLORS.bumpStop }}>◇ {data.bumpData.length} bumps</span>
                </>
            }
          </div>
          <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <canvas ref={canvasRef} style={{ width: size.w, height: size.h, borderRadius: RADIUS.lg, display: 'block', border: `1px solid ${COLORS.border}` }} />
          </div>
          {mode === 'deaths' && data.deaths.length > 0 && (
            <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: RADIUS.md, border: `1px solid ${COLORS.border}`, marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: FONT_SIZE.xxs }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: COLORS.textMuted, fontWeight: 600 }}>#</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: COLORS.textMuted, fontWeight: 600 }}>Tournament</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: COLORS.textMuted, fontWeight: 600 }}>Match</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.textMuted, fontWeight: 600 }}>Pt</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.textMuted, fontWeight: 600 }}>Side</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.textMuted, fontWeight: 600 }}>P#</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deaths.map((d, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}20` }}>
                      <td style={{ padding: '4px 8px', color: COLORS.textDim }}>{i + 1}</td>
                      <td style={{ padding: '4px 8px', color: COLORS.text, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d._ctx?.tournament || '?'}</td>
                      <td style={{ padding: '4px 8px', color: COLORS.text, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d._ctx?.match || '?'}</td>
                      <td style={{ padding: '4px 8px', color: COLORS.accent, textAlign: 'center' }}>{d._ctx?.pointIdx || '?'}</td>
                      <td style={{ padding: '4px 8px', color: d.side === 'A' ? COLORS.danger : COLORS.info, textAlign: 'center' }}>{d.side || '?'}</td>
                      <td style={{ padding: '4px 8px', color: COLORS.textDim, textAlign: 'center' }}>P{(d.playerIdx || 0) + 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}
