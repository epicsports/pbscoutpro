import React, { useRef, useEffect, useState, useCallback } from 'react';
import { COLORS, FONT, TOUCH } from '../utils/theme';

/**
 * FieldCanvas — main scouting canvas
 *
 * Interaction model (place mode):
 *   - TAP empty space → place player at final position
 *   - HOLD (500ms) empty space → bump stop dialog (drag up/down for 1-5s timer)
 *     → release confirms bump stop → then TAP again for final position
 *   - TAP existing player → select
 *   - DRAG existing player → move
 *
 * Interaction model (shoot mode):
 *   - TAP empty space → place shot for selected player
 *   - HOLD (2s) → place kill shot (skull)
 *   - TAP existing shot → delete it
 */
export default function FieldCanvas({
  fieldImage, players = [], shots = [], bumpStops = [],
  eliminations = [], eliminationPositions = [],
  onPlacePlayer, onMovePlayer, onPlaceShot, onDeleteShot,
  onBumpStop, onSelectPlayer,
  editable = false, selectedPlayer, mode = 'place',
  playerAssignments = [], rosterPlayers = [],
  opponentPlayers, showOpponentLayer = false, opponentColor = '#888',
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });
  const [dragging, setDragging] = useState(null);

  // Long press
  const longPressTimer = useRef(null);
  const longPressPos = useRef(null);
  const [bumpDial, setBumpDial] = useState(null); // { x, y, duration }
  const didLongPress = useRef(false);

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
        setCanvasSize(imgObj
          ? { w, h: Math.min(w * (imgObj.height / imgObj.width), 600) }
          : { w, h: Math.min(w * 0.65, 500) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj]);

  // ─── Draw ───
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = canvasSize;
    canvas.width = w * 2; canvas.height = h * 2;
    ctx.scale(2, 2);

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

    // Opponent overlay (mirrored)
    if (showOpponentLayer && opponentPlayers) {
      opponentPlayers.forEach((p, i) => {
        if (!p) return;
        const px = (1 - p.x) * w, py = p.y * h;
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fillStyle = opponentColor; ctx.fill();
        ctx.strokeStyle = opponentColor + '80'; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`O${i + 1}`, px, py);
      });
    }

    // Shot lines
    if (shots) {
      players.forEach((p, i) => {
        if (!p || !shots[i]?.length) return;
        const color = COLORS.playerColors[i];
        shots[i].forEach(s => {
          ctx.beginPath(); ctx.moveTo(p.x * w, p.y * h); ctx.lineTo(s.x * w, s.y * h);
          ctx.strokeStyle = color + '35'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
          const sx = s.x * w, sy = s.y * h;
          if (s.isKill) {
            ctx.fillStyle = COLORS.skull; ctx.font = 'bold 12px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💀', sx, sy);
          } else {
            ctx.strokeStyle = color + 'bb'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(sx - 4, sy - 4); ctx.lineTo(sx + 4, sy + 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 4, sy - 4); ctx.lineTo(sx - 4, sy + 4); ctx.stroke();
          }
        });
      });
    }

    // Bump stops — SMALLER circles with dashed line to final position
    bumpStops?.forEach((bs, i) => {
      if (!bs) return;
      const bx = bs.x * w, by = bs.y * h;
      // Dashed line to final position (if player placed)
      if (players[i]) {
        const px = players[i].x * w, py = players[i].y * h;
        ctx.strokeStyle = COLORS.bumpStop + '50'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      }
      // Bump marker — SMALLER than player (r=10 vs r=18)
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.bumpStop + '30'; ctx.fill();
      ctx.strokeStyle = COLORS.bumpStop + 'aa'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      // Duration
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
      ctx.beginPath(); ctx.arc(px + 1, py + 1, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
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
        const ap = playerAssignments[i];
        const rp = ap && rosterPlayers ? rosterPlayers.find(tp => tp.id === ap) : null;
        ctx.fillText((rp ? String(rp.number) : `P${i + 1}`).slice(0, 3), px, py);
      }
    });

    // Bump dial overlay (while holding)
    if (bumpDial) {
      const dx = bumpDial.x * w, dy = bumpDial.y * h;
      ctx.beginPath(); ctx.arc(dx, dy, 32, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fill();
      ctx.strokeStyle = COLORS.bumpStop; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = COLORS.bumpStop; ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${bumpDial.duration}s`, dx, dy);
      // Hint
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
  }, [canvasSize, imgObj, players, shots, bumpStops, eliminations, eliminationPositions,
      editable, selectedPlayer, mode, playerAssignments, rosterPlayers,
      opponentPlayers, showOpponentLayer, opponentColor, bumpDial]);

  // ─── Helpers ───
  const getRelPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: Math.max(0, Math.min(1, (cx - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (cy - rect.top) / rect.height)) };
  }, []);

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
        if (Math.sqrt(dx * dx + dy * dy) < 18) return { playerIdx: pi, shotIdx: si };
      }
    }
    return null;
  }, [canvasSize, shots]);

  // ─── Interaction: PLACE mode ───
  // Tap empty = place player. Hold empty = bump stop (timer dial).
  // Tap player = select. Drag player = move.

  const handleStart = (e) => {
    if (!editable) return;
    e.preventDefault();
    const pos = getRelPos(e);
    didLongPress.current = false;
    longPressPos.current = pos;

    if (mode === 'shoot') {
      // Tap existing shot → delete
      const hitShot = findShot(pos);
      if (hitShot) { onDeleteShot?.(hitShot.playerIdx, hitShot.shotIdx); return; }
      // Start long press for kill shot (2s)
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        if (selectedPlayer !== null && players[selectedPlayer]) {
          onPlaceShot?.(selectedPlayer, { ...pos, isKill: true });
        }
      }, 2000);
      return;
    }

    // Place mode
    const hit = findPlayer(pos);
    if (hit >= 0) {
      // Tap on existing player → select + start drag
      onSelectPlayer?.(hit);
      setDragging(hit);
      longPressTimer.current = null; // no long press on existing players
    } else {
      // Empty space → start long press timer for bump stop
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        setBumpDial({ x: pos.x, y: pos.y, duration: 1 });
      }, 500);
    }
  };

  const handleMove = (e) => {
    if (!editable) return;
    e.preventDefault();
    const pos = getRelPos(e);

    // Cancel long press if moved too far
    if (longPressTimer.current && longPressPos.current) {
      const dx = (pos.x - longPressPos.current.x) * canvasSize.w;
      const dy = (pos.y - longPressPos.current.y) * canvasSize.h;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }

    // Bump dial — drag up/down to change duration
    if (bumpDial) {
      const dy = (longPressPos.current.y - pos.y) * canvasSize.h;
      const dur = Math.max(1, Math.min(5, Math.round(1 + dy / 20)));
      setBumpDial(prev => ({ ...prev, duration: dur }));
      return;
    }

    // Drag player
    if (dragging !== null && mode === 'place') {
      onMovePlayer?.(dragging, pos);
    }
  };

  const handleEnd = () => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;

    // Bump dial confirm → report bump stop, player will need another tap for final pos
    if (bumpDial) {
      onBumpStop?.(bumpDial);
      setBumpDial(null);
      didLongPress.current = true; // prevent placing player on this release
      longPressPos.current = null;
      return;
    }

    // Shoot mode — normal tap (not long press) = regular shot
    if (mode === 'shoot' && !didLongPress.current && selectedPlayer !== null && players[selectedPlayer]) {
      const pos = longPressPos.current;
      if (pos && !findShot(pos)) {
        onPlaceShot?.(selectedPlayer, { ...pos, isKill: false });
      }
    }

    // Place mode — normal tap on empty space = place player
    if (mode === 'place' && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos && findPlayer(pos) < 0 && players.filter(Boolean).length < 5) {
        onPlacePlayer?.(pos);
      }
    }

    setDragging(null);
    didLongPress.current = false;
    longPressPos.current = null;
  };

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <canvas ref={canvasRef}
        style={{
          width: canvasSize.w, height: canvasSize.h, borderRadius: 10,
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
