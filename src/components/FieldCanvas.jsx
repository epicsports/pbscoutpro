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
  // ── Layout annotations ──
  bunkers = [], showBunkers = false,
  dangerZone = null, sajgonZone = null, showZones = false,
  // ── Bunker/zone edit mode ──
  layoutEditMode = null, // null | 'bunker' | 'danger' | 'sajgon'
  onBunkerPlace, onBunkerMove, onBunkerDelete,
  onZonePoint, onZoneUndo, onZoneClose,
  editDangerPoints = [], editSajgonPoints = [],
  onBunkerLabelNudge, onBunkerLabelOffset,
  // ── BreakAnalyzer: visibility heatmap ──
  visibilityData = null,
  showVisibility = false,
  onVisibilityTap,
  // ── BreakAnalyzer: counter-analysis ──
  counterData = null,
  showCounter = false,
  enemyPath = null,
  selectedCounterBunkerId = null,
  counterDrawMode = false,
  onCounterPath,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });
  const [dragging, setDragging] = useState(null);
  const [draggingBunker, setDraggingBunker] = useState(null); // bunker id being dragged
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef(null);
  const longPressTimer = useRef(null);
  const longPressPos = useRef(null);
  const [bumpDial, setBumpDial] = useState(null);
  const didLongPress = useRef(false);
  const lastTapRef = useRef(0);
  const counterDraftRef = useRef([]);
  const [counterDraft, setCounterDraft] = useState([]);

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
        const maxW = e.contentRect.width;
        if (imgObj) {
          const ratio = imgObj.height / imgObj.width;
          const maxH = Math.min(window.innerHeight * 0.65, 600);
          let w = maxW, h = maxW * ratio;
          if (h > maxH) { h = maxH; w = h / ratio; }
          setCanvasSize({ w: Math.floor(w), h: Math.floor(h) });
        } else {
          setCanvasSize({ w: maxW, h: Math.min(maxW * 0.65, 500) });
        }
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

    // ── Visibility heatmap layer (BreakAnalyzer) — between image and bunker labels ──
    if (showVisibility && visibilityData) {
      const { cols, rows, safe, risky } = visibilityData;
      const cw = w / cols, ch2 = h / rows;
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const idx = gy * cols + gx;
          const s = safe[idx], r = risky[idx];
          if (s <= .001 && r <= .001) continue;
          if (s > .001) {
            // SAFE — green→red wg accuracy
            ctx.fillStyle = `rgba(${Math.round(s*255)},${Math.round((1-s)*200)},0,${Math.min(.55, s*.7+.05)})`;
          } else {
            // RISKY — niebieski (arc/situp/lean-out)
            ctx.fillStyle = `rgba(${Math.round(r*120)},${Math.round(r*80)},${Math.round(180+r*75)},${Math.min(.35, r*.5+.03)})`;
          }
          ctx.fillRect(gx * cw, gy * ch2, cw + .5, ch2 + .5);
        }
      }
    }

    // ── Counter bump heatmap (cyan) ──
    if (showCounter && counterData?.bumpGrid) {
      const { bumpGrid, bumpCols, bumpRows } = counterData;
      const cw2 = w / bumpCols, ch3 = h / bumpRows;
      for (let gy = 0; gy < bumpRows; gy++) {
        for (let gx = 0; gx < bumpCols; gx++) {
          const p = bumpGrid[gy * bumpCols + gx];
          if (p < 0.02) continue;
          ctx.fillStyle = `rgba(0,${Math.round(180+p*75)},${Math.round(200+p*55)},${Math.min(.5,p*.6+.03)})`;
          ctx.fillRect(gx * cw2, gy * ch3, cw2 + .5, ch3 + .5);
        }
      }
    }

    // ── Enemy path (orange polyline + arrow) ──
    if (enemyPath?.length >= 2) {
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(enemyPath[0].x * w, enemyPath[0].y * h);
      for (let i = 1; i < enemyPath.length; i++) ctx.lineTo(enemyPath[i].x * w, enemyPath[i].y * h);
      ctx.stroke();
      // Arrow head at end
      const last = enemyPath[enemyPath.length - 1];
      const prev = enemyPath[enemyPath.length - 2];
      const adx = last.x - prev.x, ady = last.y - prev.y;
      const alen = Math.sqrt(adx*adx + ady*ady);
      if (alen > 0.001) {
        const nx = adx/alen, ny = ady/alen;
        const ex = last.x * w, ey = last.y * h;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - nx*14 - ny*7, ey - ny*14 + nx*7);
        ctx.lineTo(ex - nx*14 + ny*7, ey - ny*14 - nx*7);
        ctx.closePath(); ctx.fill();
      }
    }

    // ── Enemy path draft (during drawing) ──
    if (counterDraft.length >= 2) {
      ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(counterDraft[0].x * w, counterDraft[0].y * h);
      for (let i = 1; i < counterDraft.length; i++) ctx.lineTo(counterDraft[i].x * w, counterDraft[i].y * h);
      ctx.stroke(); ctx.setLineDash([]);
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
            // Target/crosshair icon for shot
            ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
            // Cross lines
            ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx - 7, sy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 7, sy); ctx.lineTo(sx + 10, sy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy - 7); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx, sy + 7); ctx.lineTo(sx, sy + 10); ctx.stroke();
            // Delete button (X in small circle) to the right
            const bx2 = sx + 14, by2 = sy - 10;
            ctx.beginPath(); ctx.arc(bx2, by2, 7, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fill();
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(bx2-3, by2-3); ctx.lineTo(bx2+3, by2+3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bx2+3, by2-3); ctx.lineTo(bx2-3, by2+3); ctx.stroke();
          }
        });
      });
    }

    // Bump stops — mały marker w miejscu przycupy + linia ze strzałką do pozycji docelowej
    bumpStops?.forEach((bs, i) => {
      if (!bs) return;
      const bx = bs.x * w, by = bs.y * h;
      if (players[i]) {
        const px = players[i].x * w, py = players[i].y * h;
        const grad = ctx.createLinearGradient(bx, by, px, py);
        grad.addColorStop(0, COLORS.bumpStop + 'dd');
        grad.addColorStop(1, COLORS.bumpStop + '33');
        ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
        const ddx = px - bx, ddy = py - by, len = Math.sqrt(ddx*ddx + ddy*ddy);
        if (len > 24) {
          const mx = bx + ddx * 0.52, my = by + ddy * 0.52;
          const nx = ddx/len, ny = ddy/len;
          ctx.beginPath();
          ctx.moveTo(mx - nx*7 - ny*5, my - ny*7 + nx*5);
          ctx.lineTo(mx - nx*7 + ny*5, my - ny*7 - nx*5);
          ctx.lineTo(mx + nx*7, my + ny*7);
          ctx.closePath();
          ctx.fillStyle = COLORS.bumpStop + 'bb'; ctx.fill();
        }
      }
      ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.bumpStop + '28'; ctx.fill();
      ctx.strokeStyle = COLORS.bumpStop; ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
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

    // Bump dial overlay — pulsujący ring w miejscu przyciśnięcia, czas obok
    if (bumpDial) {
      const bx = bumpDial.x * w, by = bumpDial.y * h;
      const cur = bumpDial.curX !== undefined ? bumpDial.curX * w : bx;
      const cur_y = bumpDial.curY !== undefined ? bumpDial.curY * h : by;
      // Ring w miejscu przycupy
      ctx.beginPath(); ctx.arc(bx, by, 26, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.bumpStop; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by, 26, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.bumpStop + '22'; ctx.fill();
      ctx.fillStyle = COLORS.bumpStop; ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⏱', bx, by);
      // Czas — duży badge obok kursora/palca (przesunięty 48px w prawo + 10px w górę)
      const tx = cur + 48, ty = cur_y - 10;
      const label = `${bumpDial.duration}s`;
      ctx.font = `bold 22px ${FONT}`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath(); ctx.roundRect(tx - 8, ty - 18, tw + 16, 34, 8); ctx.fill();
      ctx.strokeStyle = COLORS.bumpStop; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(tx - 8, ty - 18, tw + 16, 34, 8); ctx.stroke();
      ctx.fillStyle = COLORS.bumpStop; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, tx, ty);
      // Podpowiedź
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('↕ góra/dół = czas', bx, by + 42);
    }

    // ── Zones (DANGER / SAJGON) ──
    if (showZones || layoutEditMode === 'danger' || layoutEditMode === 'sajgon') {
      const drawZone = (pts, color, label) => {
        if (!pts || pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].x * w, pts[0].y * h);
        pts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x * w, p.y * h); });
        if (pts.length > 2) ctx.closePath();
        ctx.fillStyle = color + '28'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
        // Label in centroid
        if (pts.length > 2) {
          const cx2 = pts.reduce((s, p) => s + p.x, 0) / pts.length * w;
          const cy2 = pts.reduce((s, p) => s + p.y, 0) / pts.length * h;
          ctx.fillStyle = color; ctx.font = `bold 13px ${FONT}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(label, cx2, cy2);
        }
      };
      if (showZones) {
        if (dangerZone?.length > 2) drawZone(dangerZone, '#ef4444', 'DANGER');
        if (sajgonZone?.length > 2) drawZone(sajgonZone, '#3b82f6', 'SAJGON');
      }
      // Edit in-progress polygons
      if (layoutEditMode === 'danger') drawZone(editDangerPoints, '#ef4444', 'DANGER');
      if (layoutEditMode === 'sajgon') drawZone(editSajgonPoints, '#3b82f6', 'SAJGON');
      // Vertex dots for edit mode
      const editPts = layoutEditMode === 'danger' ? editDangerPoints : layoutEditMode === 'sajgon' ? editSajgonPoints : [];
      const zColor = layoutEditMode === 'danger' ? '#ef4444' : '#3b82f6';
      editPts.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 6, 0, Math.PI * 2);
        ctx.fillStyle = zColor; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        if (i === 0) { ctx.fillStyle = '#fff'; ctx.font = `bold 8px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✕', p.x * w, p.y * h); }
      });
    }

    // ── Bunker labels ──
    // Anchor = bottom-center of label pill. No X delete button (delete from list only).
    // Larger, more readable labels. No labelOffsetY distance option.
    if ((showBunkers || layoutEditMode === 'bunker') && bunkers.length > 0) {
      // Scale font with canvas width for readability on all devices
      const labelFont = Math.max(10, Math.min(15, w * 0.026));
      ctx.font = `bold ${labelFont}px ${FONT}`;
      const lpad = Math.round(labelFont * 0.7);
      const lh = Math.round(labelFont * 1.8);

      bunkers.forEach(b => {
        const bx = b.x * w, by = b.y * h;
        // Anchor = bottom-center of pill → pill sits ABOVE the anchor point
        const pillTop = by - lh - 4;    // 4px gap above anchor
        const pillBot = by - 4;
        const pillMidY = (pillTop + pillBot) / 2;

        ctx.font = `bold ${labelFont}px ${FONT}`;
        const tw = ctx.measureText(b.name).width;
        const pillLeft = bx - tw / 2 - lpad;
        const pillW = tw + lpad * 2;

        // Connecting dot line: anchor → pill bottom (very subtle)
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, pillBot);
        ctx.strokeStyle = 'rgba(250,204,21,0.20)'; ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);

        // Anchor dot — small, just marks the bunker position
        const anchorR = layoutEditMode === 'bunker' ? 4 : 2;
        ctx.beginPath(); ctx.arc(bx, by, anchorR, 0, Math.PI * 2);
        ctx.fillStyle = layoutEditMode === 'bunker' ? '#facc15' : 'rgba(250,204,21,0.55)'; ctx.fill();
        if (layoutEditMode === 'bunker') {
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
        }

        // Label pill — strong background, readable border
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 5;
        ctx.fillStyle = 'rgba(8,12,22,0.94)';
        // roundRect polyfill check
        const rr = (x, y, w, h, r) => {
          ctx.beginPath();
          if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); }
          else { ctx.rect(x, y, w, h); }
        };
        rr(pillLeft, pillTop, pillW, lh, 4); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = layoutEditMode === 'bunker' ? '#facc15' : 'rgba(250,204,21,0.5)';
        ctx.lineWidth = layoutEditMode === 'bunker' ? 1.5 : 1;
        rr(pillLeft, pillTop, pillW, lh, 4); ctx.stroke();

        // Text
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.name, bx, pillMidY + 0.5);

        // Edit mode: show drag handle indicator only (no delete X)
        if (layoutEditMode === 'bunker') {
          // Subtle "drag" indicator on anchor
          ctx.strokeStyle = 'rgba(250,204,21,0.5)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(bx, by, anchorR + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    // ── Counter lane lines + score badges (top layer, above bunker labels) ──
    if (showCounter && counterData?.counters) {
      counterData.counters.forEach((c, i) => {
        if (i >= 5) return;
        const b = bunkers.find(bk => bk.id === c.bunkerId);
        if (!b) return;
        const bx = b.x * w, by = b.y * h;
        const isSelected = c.bunkerId === selectedCounterBunkerId;
        const alpha = selectedCounterBunkerId ? (isSelected ? 1 : 0.25) : 1;

        // Lane line — safe (green) or risky (blue)
        if (c.safe) {
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(c.safe.laneStart.x * w, c.safe.laneStart.y * h);
          ctx.lineTo(c.safe.laneEnd.x * w, c.safe.laneEnd.y * h);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = Math.max(1.5, c.safe.pHit * 5);
          ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        } else if (c.risky) {
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(c.risky.laneStart.x * w, c.risky.laneStart.y * h);
          ctx.lineTo(c.risky.laneEnd.x * w, c.risky.laneEnd.y * h);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = Math.max(1.5, c.risky.pHit * 4);
          ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }

        // Score badge on bunker
        ctx.globalAlpha = alpha;
        const pct = Math.round((c.safe?.pHit || c.risky?.pHit || 0) * 100);
        const col = c.safe ? '#22c55e' : '#3b82f6';
        const badgeY = by + 10;
        ctx.fillStyle = isSelected ? col + 'dd' : 'rgba(0,0,0,0.88)';
        const rr = (x, y, bw, bh, r) => {
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, r); else ctx.rect(x, y, bw, bh);
        };
        rr(bx - 21, badgeY, 42, 19, 4); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = isSelected ? 2 : 1;
        rr(bx - 21, badgeY, 42, 19, 4); ctx.stroke();
        // Rank + pct
        ctx.fillStyle = isSelected ? (c.safe ? '#000' : '#fff') : col;
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`#${i+1} ${pct}%`, bx, badgeY + 9.5);
        ctx.globalAlpha = 1;
      });
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
      showOpponentLayer, opponentColor, bumpDial, zoom, pan, discoLine, zeekerLine,
      bunkers, showBunkers, dangerZone, sajgonZone, showZones,
      layoutEditMode, editDangerPoints, editSajgonPoints,
      visibilityData, showVisibility,
      counterData, showCounter, enemyPath, selectedCounterBunkerId, counterDraft]);

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

  const findShot = useCallback((pos, onlyPlayerIdx = null) => {
    const { w, h } = canvasSize;
    // Only check delete button area (small X badge), not the main target circle
    for (let pi = 0; pi < 5; pi++) {
      if (onlyPlayerIdx !== null && pi !== onlyPlayerIdx) continue; // only selected player
      if (!shots[pi]) continue;
      for (let si = shots[pi].length - 1; si >= 0; si--) {
        const s = shots[pi][si];
        const btnX = s.x + 14 / w, btnY = s.y - 10 / h;
        const dxBtn = (btnX - pos.x) * w, dyBtn = (btnY - pos.y) * h;
        if (Math.sqrt(dxBtn*dxBtn + dyBtn*dyBtn) < 14)
          return { playerIdx: pi, shotIdx: si };
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
    if (!editable && !layoutEditMode) return;
    e.preventDefault();
    // Double-tap reset zoom
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

    // ── Layout edit modes ──
    if (layoutEditMode === 'danger' || layoutEditMode === 'sajgon') {
      // Close polygon if clicking near first point
      const editPts = layoutEditMode === 'danger' ? editDangerPoints : editSajgonPoints;
      if (editPts.length >= 3) {
        const fp = editPts[0];
        const dx = (fp.x - pos.x) * canvasSize.w, dy = (fp.y - pos.y) * canvasSize.h;
        if (Math.sqrt(dx*dx + dy*dy) < 16) { onZoneClose?.(); return; }
      }
      onZonePoint?.(pos);
      didLongPress.current = true;
      return;
    }
    if (layoutEditMode === 'bunker') {
      const { w, h } = canvasSize;
      const labelFont = Math.max(10, Math.min(15, w * 0.026));
      const lh = Math.round(labelFont * 1.8);
      for (const b of bunkers) {
        const bx = b.x * w, by = b.y * h;
        const tw_approx = b.name.length * labelFont * 0.62 + Math.round(labelFont * 0.7) * 2;
        const pillMidY = by - lh / 2 - 4;

        // Anchor drag — hit anchor dot
        const dxAnch = (b.x - pos.x) * w, dyAnch = (b.y - pos.y) * h;
        if (Math.sqrt(dxAnch * dxAnch + dyAnch * dyAnch) < 14) {
          setDraggingBunker(b.id); didLongPress.current = true; return;
        }

        // Pill click — trigger onBunkerPlace which handles edit-existing logic
        const dxLbl = (bx / w - pos.x) * w;
        const dyLbl = (pillMidY / h - pos.y) * h;
        if (Math.abs(dxLbl) < tw_approx / 2 + 6 && Math.abs(dyLbl) < lh / 2 + 4) {
          onBunkerPlace?.(pos); didLongPress.current = true; return;
        }
      }
      // Place new bunker on empty space
      onBunkerPlace?.(pos);
      didLongPress.current = true;
      return;
    }

    if (mode === 'shoot') {
      // Only interact with shots of the currently selected player
      const hitShot = findShot(pos, selectedPlayer);
      if (hitShot) {
        didLongPress.current = true; // prevent handleEnd from placing a new shot
        onDeleteShot?.(hitShot.playerIdx, hitShot.shotIdx);
        return;
      }
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        if (selectedPlayer !== null && players[selectedPlayer]) onPlaceShot?.(selectedPlayer, { ...pos, isKill: true });
      }, 2000);
      return;
    }

    const hit = findPlayer(pos);
    if (hit >= 0) {
      // Istniejący gracz — tylko drag (bez bump)
      onSelectPlayer?.(hit);
      setDragging(hit);
      longPressPos.current = { ...pos, isNew: false };
    } else if (players.filter(Boolean).length < 5) {
      // Nowe miejsce — znajdź slot PRZED postawieniem (wiemy który jest wolny)
      const newIdx = players.findIndex(p => p === null);
      longPressPos.current = { ...pos, isNew: true, newIdx, newPos: pos };
      onPlacePlayer?.(pos);
      // Timer 0.5s: jeśli użytkownik trzyma → bump dial dla właśnie postawionego gracza
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        setBumpDial({ x: pos.x, y: pos.y, duration: 1, playerIdx: newIdx, curX: pos.x, curY: pos.y });
      }, 500);
    }
  };

  const handleMove = (e) => {
    if (!editable && !layoutEditMode) return;
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

    // Jeśli bump dial aktywny — aktualizuj czas (góra/dół) i pozycję kursora dla badge'a
    if (bumpDial) {
      const dy = (longPressPos.current.y - pos.y) * canvasSize.h;
      setBumpDial(prev => ({
        ...prev,
        duration: Math.max(1, Math.min(5, Math.round(1 + dy / 20))),
        curX: pos.x,
        curY: pos.y,
      }));
      return;
    }

    // Bunker drag in layoutEditMode
    if (draggingBunker !== null) {
      if (typeof draggingBunker === 'string' && draggingBunker.startsWith('label:')) {
        // Vertical-only label drag
        const bid = draggingBunker.replace('label:', '');
        const b = bunkers.find(bk => bk.id === bid);
        if (b) {
          const anchorY = b.y * canvasSize.h;
          const curY = pos.y * canvasSize.h;
          const offsetSteps = Math.round((curY - anchorY) / 22);
          onBunkerLabelOffset?.(bid, offsetSteps);
        }
      } else {
        onBunkerMove?.(draggingBunker, pos);
      }
      return;
    }

    // Istniejący gracz — zwykły drag (bump NIE aktywuje)
    if (dragging !== null && mode === 'place') {
      // Jeśli to istniejący gracz (nie nowy), ruch anuluje timer i przesuwa
      if (!longPressPos.current?.isNew) {
        clearTimeout(longPressTimer.current); longPressTimer.current = null;
      }
      onMovePlayer?.(dragging, pos);
    }
  };

  const handleEnd = () => {
    pinchRef.current = null;
    clearTimeout(longPressTimer.current); longPressTimer.current = null;
    // Bump dial aktywny — zapisz bump, czekaj na pozycję docelową
    if (bumpDial) {
      onBumpStop?.(bumpDial);
      setBumpDial(null); didLongPress.current = true; longPressPos.current = null;
      return;
    }
    if (mode === 'shoot' && !didLongPress.current && selectedPlayer !== null && players[selectedPlayer]) {
      const pos = longPressPos.current;
      if (pos && !findShot(pos)) onPlaceShot?.(selectedPlayer, { ...pos, isKill: false });
    }
    if (mode === 'place' && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos && findPlayer(pos) < 0 && players.filter(Boolean).length < 5) onPlacePlayer?.(pos);
    }
    // ── Visibility tap: gdy showVisibility + brak innej interakcji ──
    if (showVisibility && onVisibilityTap && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos) {
        // Sprawdź czy tapnięto w bunkier
        const hitBunker = bunkers.find(b => {
          const dx = (b.x - pos.x) * canvasSize.w;
          const dy = (b.y - pos.y) * canvasSize.h;
          return Math.sqrt(dx*dx + dy*dy) < 20;
        });
        onVisibilityTap(hitBunker?.id ?? null, hitBunker ? null : pos);
      }
    }
    setDraggingBunker(null);
    setDragging(null); didLongPress.current = false; longPressPos.current = null;
  };

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h, borderRadius: 10, cursor: layoutEditMode ? 'crosshair' : editable ? (mode === 'shoot' ? 'crosshair' : 'pointer') : 'default', display: 'block', border: `1px solid ${COLORS.border}` }}
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
