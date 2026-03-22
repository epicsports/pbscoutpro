import React, { useRef, useEffect, useState } from 'react';
import { COLORS, FONT } from '../utils/theme';

export default function HeatmapCanvas({ fieldImage, points, mode, rosterPlayers }) {
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
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width;
        setSize(imgObj
          ? { w, h: Math.min(w * (imgObj.height / imgObj.width), 500) }
          : { w, h: Math.min(w * 0.65, 450) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = size;
    canvas.width = w * 2; canvas.height = h * 2;
    ctx.scale(2, 2);

    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = COLORS.textMuted + '40';
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('Brak layoutu pola', w / 2, h / 2);
    }

    const drawBlobs = (dataBySlot, radius) => {
      for (let slot = 0; slot < 5; slot++) {
        const color = COLORS.playerColors[slot];
        const pts = dataBySlot[slot] || [];
        if (!pts.length) continue;
        pts.forEach((pos) => {
          const grd = ctx.createRadialGradient(pos.x * w, pos.y * h, 0, pos.x * w, pos.y * h, radius);
          grd.addColorStop(0, color + '50');
          grd.addColorStop(1, color + '00');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(pos.x * w, pos.y * h, radius, 0, Math.PI * 2);
          ctx.fill();
        });
        pts.forEach((pos) => {
          ctx.beginPath();
          ctx.arc(pos.x * w, pos.y * h, 3, 0, Math.PI * 2);
          ctx.fillStyle = color + 'cc';
          ctx.fill();
        });
      }
    };

    if (mode === 'positions') {
      const bySlot = Array.from({ length: 5 }, () => []);
      points.forEach((pt) => {
        for (let i = 0; i < 5; i++) if (pt.players?.[i]) bySlot[i].push(pt.players[i]);
      });
      drawBlobs(bySlot, 35);
    } else {
      const bySlot = Array.from({ length: 5 }, () => []);
      points.forEach((pt) => {
        if (pt.shots) for (let i = 0; i < 5; i++) if (pt.shots[i]) bySlot[i].push(...pt.shots[i]);
      });
      drawBlobs(bySlot, 28);
    }

    // Legend
    ctx.font = `bold 10px ${FONT}`;
    ctx.textBaseline = 'middle';
    const legendY = h - 12;
    for (let i = 0; i < 5; i++) {
      const lx = 10 + i * 65;
      ctx.fillStyle = COLORS.playerColors[i];
      ctx.beginPath(); ctx.arc(lx, legendY, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.text; ctx.textAlign = 'left';
      ctx.fillText((rosterPlayers?.[i]?.name || `P${i + 1}`).slice(0, 6), lx + 8, legendY);
    }
  }, [size, imgObj, points, mode, rosterPlayers]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas ref={canvasRef} style={{
        width: size.w, height: size.h, borderRadius: 8, display: 'block',
        border: `1px solid ${COLORS.border}`,
      }} />
    </div>
  );
}
