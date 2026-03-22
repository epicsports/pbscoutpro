import React, { useRef, useEffect, useState } from 'react';
import { COLORS, FONT } from '../utils/theme';

export default function FieldCanvas({
  fieldImage,
  players,
  shots,
  onPlacePlayer,
  onMovePlayer,
  onPlaceShot,
  editable = false,
  selectedPlayer,
  mode = 'place', // 'place' | 'shoot'
  playerAssignments,
  rosterPlayers,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });
  const [dragging, setDragging] = useState(null);

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
        if (imgObj) {
          setCanvasSize({ w, h: Math.min(w * (imgObj.height / imgObj.width), 500) });
        } else {
          setCanvasSize({ w, h: Math.min(w * 0.65, 450) });
        }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj]);

  // ─── Draw ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = canvasSize;
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);

    // Background
    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = COLORS.border + '40';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.strokeStyle = COLORS.textMuted + '50';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.textMuted + '50';
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('Załaduj layout w ustawieniach turnieju', w / 2, h / 2);
    }

    // Shot lines
    if (shots) {
      players.forEach((p, i) => {
        if (!p || !shots[i]?.length) return;
        const color = COLORS.playerColors[i];
        shots[i].forEach((s) => {
          ctx.beginPath();
          ctx.moveTo(p.x * w, p.y * h);
          ctx.lineTo(s.x * w, s.y * h);
          ctx.strokeStyle = color + '40';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
          const sx = s.x * w, sy = s.y * h;
          ctx.strokeStyle = color + 'bb';
          ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(sx - 4, sy - 4); ctx.lineTo(sx + 4, sy + 4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx + 4, sy - 4); ctx.lineTo(sx - 4, sy + 4); ctx.stroke();
        });
      });
    }

    // Players
    players.forEach((p, i) => {
      if (!p) return;
      const px = p.x * w, py = p.y * h, r = 16;
      const color = COLORS.playerColors[i];
      const isSel = selectedPlayer === i;

      if (isSel) {
        ctx.beginPath(); ctx.arc(px, py, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = color + '30'; ctx.fill();
        ctx.strokeStyle = color + '80'; ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.arc(px + 1, py + 1, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(px - 3, py - 3, 2, px, py, r);
      grad.addColorStop(0, color); grad.addColorStop(1, color + 'bb');
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.4)';
      ctx.lineWidth = isSel ? 2.5 : 1.5; ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = `bold 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const ap = playerAssignments?.[i];
      const rp = ap && rosterPlayers ? rosterPlayers.find((tp) => tp.id === ap) : null;
      ctx.fillText((rp ? String(rp.number) : `P${i + 1}`).slice(0, 3), px, py);
    });

    // Hints
    if (editable && mode === 'place') {
      const n = players.filter(Boolean).length;
      if (n < 5) {
        ctx.fillStyle = COLORS.accent + 'cc'; ctx.font = `bold 11px ${FONT}`;
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(`${n}/5`, w - 8, 8);
      }
    }
    if (editable && mode === 'shoot' && selectedPlayer !== null) {
      ctx.fillStyle = COLORS.playerColors[selectedPlayer] + 'cc';
      ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(`Strzały P${selectedPlayer + 1}`, w - 8, 8);
    }
  }, [canvasSize, imgObj, players, shots, editable, selectedPlayer, mode, playerAssignments, rosterPlayers]);

  // ─── Interaction ───
  const getRelPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (cx - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (cy - rect.top) / rect.height)),
    };
  };

  const findPlayer = (pos) => {
    const { w, h } = canvasSize;
    for (let i = players.length - 1; i >= 0; i--) {
      if (!players[i]) continue;
      const dx = (players[i].x - pos.x) * w;
      const dy = (players[i].y - pos.y) * h;
      if (Math.sqrt(dx * dx + dy * dy) < 22) return i;
    }
    return -1;
  };

  const handleStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    const pos = getRelPos(e);
    if (mode === 'shoot') {
      if (selectedPlayer !== null && players[selectedPlayer]) onPlaceShot?.(selectedPlayer, pos);
      return;
    }
    const hit = findPlayer(pos);
    if (hit >= 0) setDragging(hit);
    else if (players.filter(Boolean).length < 5) onPlacePlayer?.(pos);
  };

  const handleMove = (e) => {
    if (dragging === null || !editable || mode !== 'place') return;
    e.preventDefault();
    onMovePlayer?.(dragging, getRelPos(e));
  };

  const handleEnd = () => setDragging(null);

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: canvasSize.w, height: canvasSize.h, borderRadius: 8,
          cursor: editable ? (mode === 'shoot' ? 'crosshair' : 'pointer') : 'default',
          display: 'block', border: `1px solid ${COLORS.border}`,
        }}
        onMouseDown={handleStart} onMouseMove={handleMove}
        onMouseUp={handleEnd} onMouseLeave={handleEnd}
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
      />
    </div>
  );
}
