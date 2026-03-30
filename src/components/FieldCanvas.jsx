import React, { useRef, useEffect, useState, useCallback } from 'react';
import { COLORS, FONT, TOUCH } from '../utils/theme';

export default function FieldCanvas({
  fieldImage, players = [], shots = [], bumpStops = [],
  eliminations = [], eliminationPositions = [],
  onPlacePlayer, onMovePlayer, onPlaceShot, onDeleteShot,
  onBumpStop, onSelectPlayer,
  editable = false, selectedPlayer, mode = 'place',
  playerAssignments = [], rosterPlayers = [],
  opponentPlayers, opponentEliminations = [],
  opponentAssignments = [], opponentRosterPlayers = [],
  showOpponentLayer = false, opponentColor = '#60a5fa',
  discoLine = 0, zeekerLine = 0,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });
  const [dragging, setDragging] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef(null);
  const longPressTimer = useRef(null);
  const longPressPos = useRef(null);
  const [bumpDial, setBumpDial] = useState(null);
  const didLongPress = useRef(false);
  const lastTapRef = useRef(0);

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
        setCanvasSize(imgObj ? { w, h: Math.min(w * (imgObj.height / imgObj.width), 600) } : { w, h: Math.min(w * 0.65, 500) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj]);

  // Helper: get player label for display
  const getPlayerLabel = (assignments, rosterList, idx) => {
    const ap = assignments?.[idx];
    const rp = ap && rosterList ? rosterList.find(tp => tp.id === ap) : null;
    return rp ? String(rp.number) : `P${idx + 1}`;
  };

  // ─── Draw ───
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = canvasSize;
    canvas.width = w * 2; canvas.height = h * 2;
    ctx.scale(2, 2);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Background
    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = COLORS.border + '30'; ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.strokeStyle = COLORS.textMuted + '40'; ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COLORS.textMuted + '40'; ctx.font = `${TOUCH.fontSm}px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('Załaduj layout pola w turnieju', w / 2, h / 2);
    }

    // Disco/Zeeker lines
    if (discoLine > 0) {
      const dy = discoLine * h;
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(0, dy); ctx.lineTo(w, dy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#f97316'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('DISCO', w - 4, dy - 2);
    }
    if (zeekerLine > 0) {
      const zy = zeekerLine * h;
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(0, zy); ctx.lineTo(w, zy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#3b82f6'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('ZEEKER', w - 4, zy + 2);
    }

    // Opponent overlay (mirrored) — #12: use opponentAssignments/opponentRosterPlayers for labels
    if (showOpponentLayer && opponentPlayers) {
      opponentPlayers.forEach((p, i) => {
        if (!p) return;
        const px = (1 - p.x) * w, py = p.y * h;
        const isElim = opponentEliminations[i];
        const label = getPlayerLabel(opponentAssignments, opponentRosterPlayers, i) ||
                      getPlayerLabel(playerAssignments, rosterPlayers, i);

        if (isElim) {
          ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.eliminatedOverlay; ctx.fill();
          ctx.strokeStyle = COLORS.skull + '60'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff'; ctx.font = '11px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💀', px, py);
        } else {
          ctx.globalAlpha = 0.35;
          ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2);
          ctx.fillStyle = opponentColor; ctx.fill();
          ctx.strokeStyle = opponentColor + '80'; ctx.lineWidth = 1; ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff'; ctx.font = `bold 9px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(label.slice(0, 3), px, py);
        }
      });
    }

    // #5: Shot lines — draw from BUMP position if bump exists, else from player position
    // #6: Bigger shot markers (X size 6 instead of 4)
    if (shots) {
      players.forEach((p, i) => {
        if (!p || !shots[i]?.length) return;
        const color = COLORS.playerColors[i];
        const bs = bumpStops?.[i];
        const originX = (bs ? bs.x : p.x) * w;
        const originY = (bs ? bs.y : p.y) * h;
        shots[i].forEach(s => {
          ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(s.x * w, s.y * h);
          ctx.strokeStyle = color + '40'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
          const sx = s.x * w, sy = s.y * h;
          if (s.isKill) {
            ctx.fillStyle = COLORS.skull; ctx.font = 'bold 14px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💀', sx, sy);
          } else {
            // #6: bigger X marker
            ctx.strokeStyle = color; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(sx - 6, sy - 6); ctx.lineTo(sx + 6, sy + 6); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 6, sy - 6); ctx.lineTo(sx - 6, sy + 6); ctx.stroke();
          }
        });
      });
    }

    // Bump stops — mały marker w miejscu przycupy + linia do pozycji docelowej gracza
    bumpStops?.forEach((bs, i) => {
      if (!bs) return;
      const bx = bs.x * w, by = bs.y * h;
      // Linia: od przycupy do miejsca docelowego (pozycja gracza)
      if (players[i]) {
        const px = players[i].x * w, py = players[i].y * h;
        const grad = ctx.createLinearGradient(bx, by, px, py);
        grad.addColorStop(0, COLORS.bumpStop + 'cc');
        grad.addColorStop(1, COLORS.bumpStop + '22');
        ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
        // Strzałka kierunku w połowie linii
        const dx = px - bx, dy = py - by, len = Math.sqrt(dx*dx + dy*dy);
        if (len > 20) {
          const mx = bx + dx * 0.55, my = by + dy * 0.55;
          const nx = dx/len, ny = dy/len;
          ctx.beginPath();
          ctx.moveTo(mx + nx*5 - ny*4, my + ny*5 + nx*4);
          ctx.lineTo(mx + nx*5 + ny*4, my + ny*5 - nx*4);
          ctx.lineTo(mx + nx*12, my + ny*12);
          ctx.closePath();
          ctx.fillStyle = COLORS.bumpStop + 'aa'; ctx.fill();
        }
      }
      // Mały marker przycupy (r=11 vs gracz r=18)
      ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.bumpStop + '25'; ctx.fill();
      ctx.strokeStyle = COLORS.bumpStop; ctx.lineWidth = 2; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COLORS.bumpStop; ctx.font = `bold 9px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${bs.duration}s`, bx, by);
    });

    // Elimination positions
    eliminationPositions?.forEach((ep) => {
      if (!ep) return;
      ctx.fillStyle = COLORS.skull; ctx.font = '14px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀', ep.x * w, ep.y * h);
    });

    // Players
    players.forEach((p, i) => {
      if (!p) return;
      const px = p.x * w, py = p.y * h, r = 18;
      const color = COLORS.playerColors[i];
      const isSel = selectedPlayer === i;
      const isElim = eliminations[i];

      if (isSel) {
        ctx.beginPath(); ctx.arc(px, py, r + 7, 0, Math.PI * 2);
        ctx.fillStyle = color + '25'; ctx.fill();
        ctx.strokeStyle = color + '70'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.arc(px + 1, py + 1, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);

      if (isElim) {
        ctx.fillStyle = COLORS.eliminatedOverlay; ctx.fill();
        ctx.strokeStyle = COLORS.skull + '80'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💀', px, py);
      } else {
        const grad = ctx.createRadialGradient(px - 3, py - 3, 2, px, py, r);
        grad.addColorStop(0, color); grad.addColorStop(1, color + 'bb');
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.3)';
        ctx.lineWidth = isSel ? 2.5 : 1.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(getPlayerLabel(playerAssignments, rosterPlayers, i).slice(0, 3), px, py);
      }
    });

    // Bump dial overlay
    if (bumpDial) {
      const dx = bumpDial.x * w, dy = bumpDial.y * h;
      ctx.beginPath(); ctx.arc(dx, dy, 32, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill();
      ctx.strokeStyle = COLORS.bumpStop; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = COLORS.bumpStop; ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${bumpDial.duration}s`, dx, dy);
      ctx.fillStyle = COLORS.bumpStop + '90'; ctx.font = `9px ${FONT}`;
      ctx.fillText('↕ przeciągnij', dx, dy + 22);
    }

    // HUD
    if (editable && mode === 'place') {
      const n = players.filter(Boolean).length;
      if (n < 5) {
        ctx.fillStyle = COLORS.accent + 'cc'; ctx.font = `bold 12px ${FONT}`;
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(`${n}/5`, w - 10, 10);
      }
    }
    if (editable && mode === 'shoot' && selectedPlayer !== null) {
      ctx.fillStyle = COLORS.playerColors[selectedPlayer] + 'cc';
      ctx.font = `bold 12px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(`Strzały P${selectedPlayer + 1}`, w - 10, 10);
    }

    ctx.restore();
    if (zoom > 1.05) {
      ctx.fillStyle = COLORS.accent + '80'; ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${Math.round(zoom * 100)}%`, 8, 8);
    }
  }, [canvasSize, imgObj, players, shots, bumpStops, eliminations, eliminationPositions,
      editable, selectedPlayer, mode, playerAssignments, rosterPlayers,
      opponentPlayers, opponentEliminations, opponentAssignments, opponentRosterPlayers,
      showOpponentLayer, opponentColor, bumpDial, zoom, pan, discoLine, zeekerLine]);

  // ─── Helpers ───
  const getRelPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const canvasX = (cx - rect.left - pan.x) / zoom;
    const canvasY = (cy - rect.top - pan.y) / zoom;
    return { x: Math.max(0, Math.min(1, canvasX / canvasSize.w)), y: Math.max(0, Math.min(1, canvasY / canvasSize.h)) };
  }, [zoom, pan, canvasSize]);

  const findPlayer = useCallback((pos) => {
    const { w, h } = canvasSize;
    for (let i = players.length - 1; i >= 0; i--) {
      if (!players[i]) continue;
      const dx = (players[i].x - pos.x) * w, dy = (players[i].y - pos.y) * h;
      if (Math.sqrt(dx * dx + dy * dy) < 24) return i;
    }
    return -1;
  }, [canvasSize, players]);

  const findShot = useCallback((pos) => {
    const { w, h } = canvasSize;
    for (let pi = 0; pi < 5; pi++) {
      if (!shots[pi]) continue;
      for (let si = shots[pi].length - 1; si >= 0; si--) {
        const s = shots[pi][si];
        const dx = (s.x - pos.x) * w, dy = (s.y - pos.y) * h;
        if (Math.sqrt(dx * dx + dy * dy) < 20) return { playerIdx: pi, shotIdx: si };
      }
    }
    return null;
  }, [canvasSize, shots]);

  // ─── Pinch-to-zoom ───
  const getTouchDist = (e) => {
    if (e.touches?.length < 2) return 0;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    // Double-tap reset
    const now = Date.now();
    if (now - lastTapRef.current < 300 && e.touches?.length === 1) { setZoom(1); setPan({ x: 0, y: 0 }); }
    lastTapRef.current = now;
    // Pinch
    if (e.touches?.length === 2) {
      pinchRef.current = { dist: getTouchDist(e), zoom, pan: { ...pan } };
      clearTimeout(longPressTimer.current); return;
    }
    if (e.touches?.length > 2) return;
    const pos = getRelPos(e);
    didLongPress.current = false;
    longPressPos.current = pos;

    if (mode === 'shoot') {
      const hitShot = findShot(pos);
      if (hitShot) { onDeleteShot?.(hitShot.playerIdx, hitShot.shotIdx); return; }
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        if (selectedPlayer !== null && players[selectedPlayer]) onPlaceShot?.(selectedPlayer, { ...pos, isKill: true });
      }, 2000);
      return;
    }

    const hit = findPlayer(pos);
    if (hit >= 0) {
      onSelectPlayer?.(hit);
      setDragging(hit);
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        setDragging(null);
        setBumpDial({ x: players[hit].x, y: players[hit].y, duration: 1, playerIdx: hit });
      }, 2000);
    } else if (players.filter(Boolean).length < 5) {
      onPlacePlayer?.(pos);
    }
  };

  const handleMove = (e) => {
    if (!editable) return;
    e.preventDefault();
    if (e.touches?.length === 2 && pinchRef.current) {
      const newDist = getTouchDist(e);
      const scale = newDist / pinchRef.current.dist;
      const nz = Math.max(1, Math.min(5, pinchRef.current.zoom * scale));
      setZoom(nz);
      setPan({ x: Math.max(-canvasSize.w * (nz - 1), Math.min(0, pinchRef.current.pan.x)), y: Math.max(-canvasSize.h * (nz - 1), Math.min(0, pinchRef.current.pan.y)) });
      return;
    }
    if (e.touches?.length > 1) return;
    const pos = getRelPos(e);
    if (longPressTimer.current && longPressPos.current) {
      const dx = (pos.x - longPressPos.current.x) * canvasSize.w, dy = (pos.y - longPressPos.current.y) * canvasSize.h;
      if (Math.sqrt(dx * dx + dy * dy) > 10) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    }
    if (bumpDial) {
      const dy = (longPressPos.current.y - pos.y) * canvasSize.h;
      setBumpDial(prev => ({ ...prev, duration: Math.max(1, Math.min(5, Math.round(1 + dy / 20))) }));
      return;
    }
    if (dragging !== null && mode === 'place') onMovePlayer?.(dragging, pos);
  };

  const handleEnd = () => {
    pinchRef.current = null;
    clearTimeout(longPressTimer.current); longPressTimer.current = null;
    if (bumpDial) { onBumpStop?.(bumpDial); setBumpDial(null); didLongPress.current = true; longPressPos.current = null; return; }
    if (mode === 'shoot' && !didLongPress.current && selectedPlayer !== null && players[selectedPlayer]) {
      const pos = longPressPos.current;
      if (pos && !findShot(pos)) onPlaceShot?.(selectedPlayer, { ...pos, isKill: false });
    }
    if (mode === 'place' && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos && findPlayer(pos) < 0 && players.filter(Boolean).length < 5) onPlacePlayer?.(pos);
    }
    setDragging(null); didLongPress.current = false; longPressPos.current = null;
  };

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h, borderRadius: 10, cursor: editable ? (mode === 'shoot' ? 'crosshair' : 'pointer') : 'default', display: 'block', border: `1px solid ${COLORS.border}` }}
        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd} onMouseLeave={handleEnd}
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
      />
      {zoom > 1.05 && (
        <div onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          style={{ position: 'absolute', top: 6, right: 6, padding: '4px 8px', background: 'rgba(0,0,0,0.7)', borderRadius: 6, cursor: 'pointer', fontFamily: FONT, fontSize: 10, color: COLORS.accent, fontWeight: 700 }}>
          {Math.round(zoom * 100)}% ✕
        </div>
      )}
    </div>
  );
}
