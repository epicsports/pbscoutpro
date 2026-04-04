import React, { useRef, useEffect, useState, useCallback } from 'react';
import { COLORS, FONT, TOUCH, activeHeatmap } from '../utils/theme';
import { drawField, drawViewportFade } from './field/drawField';
import { drawLoupe } from './field/drawLoupe';
import { makeFieldTransform } from '../utils/helpers';

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
  selectedBunkerId = null,
  // ── BreakAnalyzer: visibility heatmap ──
  visibilityData = null,
  showVisibility = false,
  onVisibilityTap,
  fieldCalibration = null,
  // ── BreakAnalyzer: counter-analysis ──
  counterData = null,
  showCounter = false,
  enemyPath = null,
  selectedCounterBunkerId = null,
  counterDrawMode = false,
  onCounterPath,
  // Calibration mode
  calibrationMode = false,
  calibrationData = null,
  onCalibrationMove,
  // Pending bunker dot
  pendingBunkerPos = null,
  // Half-field viewport
  viewportSide = null, // null | 'left' | 'right'
  // Bump as drag
  onBumpPlayer,
  // Inline toolbar
  toolbarPlayer = null,
  toolbarItems = [],
  onToolbarAction,
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
  const didLongPress = useRef(false);
  const calDragRef = useRef(null);
  const dragStartRef = useRef(null);
  const [activeTouchPos, setActiveTouchPos] = useState(null); // pixel coords for loupe
  const loupeSourceRef = useRef(null); // clean field image for loupe (no overlays)
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

  // Auto-zoom to half-field when viewportSide is set
  useEffect(() => {
    if (viewportSide && imgObj) {
      const targetZoom = 1 / 0.65; // ~1.54x — show 65% of field
      const panX = viewportSide === 'left' ? 0 : -(canvasSize.w * (targetZoom - 1));
      setZoom(targetZoom);
      setPan({ x: panX, y: 0 });
    } else if (!viewportSide) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [viewportSide, canvasSize.w, imgObj]);

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

    // Background (field image or empty grid)
    drawField(ctx, w, h, canvas, { imgObj, activeTouchPos, loupeSourceRef });

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

    // ── Visibility heatmap layer v5 (3-channel: safe | arc | exposed) ──
    if (showVisibility && visibilityData) {
      const { cols, rows, safe, arc, exposed } = visibilityData;
      const scheme = activeHeatmap;
      const ft = makeFieldTransform(fieldCalibration);

      if (ft) {
        // Calibrated: render each grid cell at its correct field→image position
        for (let gy = 0; gy < rows; gy++) {
          for (let gx = 0; gx < cols; gx++) {
            const idx = gy * cols + gx;
            const s = safe[idx], a = arc[idx], e = exposed[idx];
            if (s > 0.01) ctx.fillStyle = scheme.safe(s);
            else if (a > 0.01) ctx.fillStyle = scheme.arc(a);
            else if (e > 0.01) ctx.fillStyle = scheme.exposed(e);
            else continue;
            // Grid cell center in field-normalized coords
            const fx = (gx + 0.5) / cols, fy = (gy + 0.5) / rows;
            // Transform to image-normalized, then to canvas pixels
            const img = ft.toImage(fx, fy);
            const cellW = w / cols * (ft.fieldLenImg * w / w);
            const cellH = h / rows * (ft.fieldWidthImg * h / h);
            const px = img.x * w - cellW / 2;
            const py = img.y * h - cellH / 2;
            ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
          }
        }
      } else {
        // No calibration: use ImageData for 10x faster rendering
        const imgData = ctx.createImageData(cols, rows);
        const d = imgData.data;
        for (let i = 0; i < cols * rows; i++) {
          const s = safe[i], a = arc[i], e = exposed[i];
          let r = 0, g = 0, b = 0, al = 0;
          if (s > 0.01) {
            r = Math.round(s * 255); g = Math.round((1 - s) * 200); al = Math.min(180, Math.round(s * 180 + 12));
          } else if (a > 0.01) {
            r = 255; g = Math.round(160 - a * 60); b = Math.round(40 - a * 30); al = Math.min(140, Math.round(a * 155 + 10));
          } else if (e > 0.01) {
            r = Math.round(e * 100); g = Math.round(e * 80); b = Math.round(180 + e * 75); al = Math.min(100, Math.round(e * 130 + 8));
          }
          const off = i * 4;
          d[off] = r; d[off + 1] = g; d[off + 2] = b; d[off + 3] = al;
        }
        // Scale up to canvas size using temporary canvas
        const tmp = document.createElement('canvas');
        tmp.width = cols; tmp.height = rows;
        tmp.getContext('2d').putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(tmp, 0, 0, w, h);
      }
    }

    // ── Counter bump heatmap ──
    if (showCounter && counterData?.bumpGrid) {
      const { bumpGrid, bumpCols, bumpRows } = counterData;
      const scheme = activeHeatmap;
      const ft = makeFieldTransform(fieldCalibration);

      if (ft) {
        for (let gy = 0; gy < bumpRows; gy++) {
          for (let gx = 0; gx < bumpCols; gx++) {
            const p = bumpGrid[gy * bumpCols + gx];
            if (p < 0.02) continue;
            ctx.fillStyle = scheme.bump(p);
            const fx = (gx + 0.5) / bumpCols, fy = (gy + 0.5) / bumpRows;
            const img = ft.toImage(fx, fy);
            const cw = w / bumpCols * ft.fieldLenImg;
            const ch = h / bumpRows * ft.fieldWidthImg;
            ctx.fillRect(img.x * w - cw / 2, img.y * h - ch / 2, cw + .5, ch + .5);
          }
        }
      } else {
        const cw2 = w / bumpCols, ch3 = h / bumpRows;
        for (let gy = 0; gy < bumpRows; gy++) {
          for (let gx = 0; gx < bumpCols; gx++) {
            const p = bumpGrid[gy * bumpCols + gx];
            if (p < 0.02) continue;
            ctx.fillStyle = scheme.bump(p);
            ctx.fillRect(gx * cw2, gy * ch3, cw2 + .5, ch3 + .5);
          }
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

        // Selected bunker highlight ring
        if (selectedBunkerId && b.id === selectedBunkerId) {
          ctx.save();
          ctx.beginPath(); ctx.arc(bx, by, 18, 0, Math.PI * 2);
          ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
          ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
          ctx.restore();
        }

        // Label pill — semi-transparent, less obtrusive
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
        ctx.fillStyle = 'rgba(8,12,22,0.65)';
        // roundRect polyfill check
        const rr = (x, y, w, h, r) => {
          ctx.beginPath();
          if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); }
          else { ctx.rect(x, y, w, h); }
        };
        rr(pillLeft, pillTop, pillW, lh, 4); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = layoutEditMode === 'bunker' ? 'rgba(250,204,21,0.8)' : 'rgba(250,204,21,0.35)';
        ctx.lineWidth = layoutEditMode === 'bunker' ? 1.5 : 0.8;
        rr(pillLeft, pillTop, pillW, lh, 4); ctx.stroke();

        // Text — slightly transparent when not editing
        ctx.fillStyle = layoutEditMode === 'bunker' ? '#facc15' : 'rgba(250,204,21,0.75)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.name, bx, pillMidY + 0.5);

        // Edit mode: bigger drag handle for easy touch (min 22px hit area)
        if (layoutEditMode === 'bunker') {
          ctx.strokeStyle = 'rgba(250,204,21,0.5)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(bx, by, anchorR + 6, 0, Math.PI * 2);
          ctx.stroke();
          // Inner fill for visibility
          ctx.fillStyle = 'rgba(250,204,21,0.15)';
          ctx.beginPath(); ctx.arc(bx, by, anchorR + 6, 0, Math.PI * 2);
          ctx.fill();
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

        // Lane line — safe (green) | arc (orange) | exposed (blue)
        const bestLane = c.safe || c.arc || c.exposed;
        const laneColor = c.safe ? '#22c55e' : c.arc ? '#f97316' : '#3b82f6';
        if (bestLane) {
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(bestLane.laneStart.x * w, bestLane.laneStart.y * h);
          ctx.lineTo(bestLane.laneEnd.x * w, bestLane.laneEnd.y * h);
          ctx.strokeStyle = laneColor;
          ctx.lineWidth = Math.max(1.5, bestLane.pHit * 5);
          ctx.setLineDash(c.safe ? [6, 3] : c.arc ? [5, 4] : [4, 4]);
          ctx.stroke(); ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }

        // Score badge on bunker
        ctx.globalAlpha = alpha;
        const pct = Math.round((c.safe?.pHit || c.arc?.pHit || c.exposed?.pHit || 0) * 100);
        const col = laneColor;
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
      ctx.fillText(`Shots P${selectedPlayer + 1}`, w - 10, 10);
    }

    ctx.restore();
    if (zoom > 1.05) {
      ctx.fillStyle = COLORS.accent + '80'; ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${Math.round(zoom * 100)}%`, 8, 8);
    }

    // Half-field fade gradient
    drawViewportFade(ctx, w, h, viewportSide);

    // ── Inline toolbar ──
    if (toolbarPlayer !== null && players[toolbarPlayer]) {
      const pl = players[toolbarPlayer];
      const px = pl.x * w, py = pl.y * h;
      const items = toolbarItems;
      if (items.length > 0) {
        const btnW = 48, btnH = 44, gap = 5;
        const totalW = items.length * (btnW + gap) - gap;
        const pr = Math.max(17, w * 0.044);
        let tx = px - totalW / 2;
        let ty = py - pr - btnH - 18;
        if (tx < 6) tx = 6;
        if (tx + totalW > w - 6) tx = w - 6 - totalW;
        let below = false;
        if (ty < 6) { ty = py + pr + 18; below = true; }

        // Background pill
        const rr = (x, y, rw, rh, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, rw, rh, r); else ctx.rect(x, y, rw, rh); };
        ctx.fillStyle = '#111827f2';
        rr(tx - 8, ty - 6, totalW + 16, btnH + 12, 14); ctx.fill();
        ctx.strokeStyle = COLORS.border + '80'; ctx.lineWidth = 1;
        rr(tx - 8, ty - 6, totalW + 16, btnH + 12, 14); ctx.stroke();

        // Pointer triangle
        const ptx = Math.max(tx + 12, Math.min(tx + totalW - 12, px));
        ctx.fillStyle = '#111827f2'; ctx.beginPath();
        if (!below) {
          ctx.moveTo(ptx - 7, ty + btnH + 6); ctx.lineTo(ptx, ty + btnH + 14); ctx.lineTo(ptx + 7, ty + btnH + 6);
        } else {
          ctx.moveTo(ptx - 7, ty - 6); ctx.lineTo(ptx, ty - 14); ctx.lineTo(ptx + 7, ty - 6);
        }
        ctx.fill();

        // Buttons
        items.forEach((item, idx) => {
          const bx = tx + idx * (btnW + gap);
          item._hitArea = { x: bx, y: ty, w: btnW, h: btnH };
          ctx.fillStyle = (item.color || '#94a3b8') + '12';
          rr(bx, ty, btnW, btnH, 10); ctx.fill();
          ctx.strokeStyle = (item.color || '#94a3b8') + '35'; ctx.lineWidth = 0.5;
          rr(bx, ty, btnW, btnH, 10); ctx.stroke();
          ctx.fillStyle = item.color || '#94a3b8';
          ctx.font = '18px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(item.icon, bx + btnW / 2, ty + btnH / 2 - 5);
          ctx.font = `600 8px ${FONT}`;
          ctx.fillStyle = (item.color || '#94a3b8') + 'bb';
          ctx.fillText(item.label, bx + btnW / 2, ty + btnH - 4);
        });
      }
    }

    // ── Pending bunker dot ──
    if (pendingBunkerPos) {
      const px = pendingBunkerPos.x * w, py = pendingBunkerPos.y * h;
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#facc1580'; ctx.fill();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.stroke();
    }

    // ── Calibration markers ──
    if (calibrationMode && calibrationData) {
      const { homeBase, awayBase } = calibrationData;
      const hx = homeBase.x * w, hy = homeBase.y * h;
      const ax = awayBase.x * w, ay = awayBase.y * h;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#facc1580'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.setLineDash([]);
      [{ x: hx, y: hy, color: '#22c55e', label: 'HOME' },
       { x: ax, y: ay, color: '#ef4444', label: 'AWAY' }].forEach(m => {
        ctx.beginPath(); ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = m.color + '40'; ctx.fill();
        ctx.strokeStyle = m.color; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = m.color; ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(m.label, m.x, m.y - 18);
      });
    }

    // Magnifying loupe (drawn last, in screen space)
    drawLoupe(ctx, w, h, { activeTouchPos, loupeSourceRef, canvas, isInteractive: editable || layoutEditMode });
  }, [canvasSize, imgObj, players, shots, bumpStops, eliminations, eliminationPositions,
      editable, selectedPlayer, mode, playerAssignments, rosterPlayers,
      opponentPlayers, opponentEliminations, opponentAssignments, opponentRosterPlayers,
      showOpponentLayer, opponentColor, zoom, pan, discoLine, zeekerLine,
      bunkers, showBunkers, dangerZone, sajgonZone, showZones,
      layoutEditMode, editDangerPoints, editSajgonPoints,
      visibilityData, showVisibility,
      counterData, showCounter, enemyPath, selectedCounterBunkerId, counterDraft,
      activeTouchPos, selectedBunkerId, calibrationMode, calibrationData, pendingBunkerPos, viewportSide,
      toolbarPlayer, toolbarItems]);

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

  const panStartRef = useRef(null); // for single-finger pan when zoomed

  const handleStart = (e) => {
    e.preventDefault();
    // Double-tap reset zoom
    const now = Date.now();
    if (now - lastTapRef.current < 300 && e.touches?.length === 1) { setZoom(1); setPan({ x: 0, y: 0 }); lastTapRef.current = 0; return; }
    lastTapRef.current = now;
    // Pinch
    if (e.touches?.length === 2) {
      pinchRef.current = { dist: getTouchDist(e), zoom, pan: { ...pan } };
      panStartRef.current = null;
      setActiveTouchPos(null);
      clearTimeout(longPressTimer.current); return;
    }
    if (e.touches?.length > 2) return;

    // Single-finger: track for potential pan (when zoomed)
    if (e.touches?.length === 1) {
      panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y, moved: false };
    }

    // Loupe: track pixel position for magnifier
    if ((editable || layoutEditMode) && (e.touches?.length === 1 || !e.touches)) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      setActiveTouchPos({ x: cx - rect.left, y: cy - rect.top });
    }

    // Calibration drag
    if (calibrationMode && calibrationData) {
      const pos = getRelPos(e);
      const { homeBase, awayBase } = calibrationData;
      const hDist = Math.sqrt((pos.x - homeBase.x)**2 + (pos.y - homeBase.y)**2);
      const aDist = Math.sqrt((pos.x - awayBase.x)**2 + (pos.y - awayBase.y)**2);
      if (hDist < 0.06) { calDragRef.current = 'homeBase'; didLongPress.current = true; return; }
      if (aDist < 0.06) { calDragRef.current = 'awayBase'; didLongPress.current = true; return; }
    }

    if (!editable && !layoutEditMode) return;
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

        // Anchor drag — hit anchor dot (22px touch target)
        const dxAnch = (b.x - pos.x) * w, dyAnch = (b.y - pos.y) * h;
        if (Math.sqrt(dxAnch * dxAnch + dyAnch * dyAnch) < 22) {
          setDraggingBunker(b.id); didLongPress.current = true; return;
        }

        // Pill click — trigger onBunkerPlace which handles edit-existing logic
        const dxLbl = (bx / w - pos.x) * w;
        const dyLbl = (pillMidY / h - pos.y) * h;
        if (Math.abs(dxLbl) < tw_approx / 2 + 6 && Math.abs(dyLbl) < lh / 2 + 4) {
          onBunkerPlace?.({ x: b.x, y: b.y }); try { navigator.vibrate?.(10); } catch(e) {} didLongPress.current = true; return;
        }
      }
      // Place new bunker on empty space
      onBunkerPlace?.(pos); try { navigator.vibrate?.(10); } catch(e) {}
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
      // Existing player — select + drag to move
      onSelectPlayer?.(hit);
      setDragging(hit);
      dragStartRef.current = { x: players[hit].x, y: players[hit].y };
      longPressPos.current = { ...pos, isNew: false };
    } else if (players.filter(Boolean).length < 5) {
      // New player — wait to distinguish tap vs hold
      const newIdx = players.findIndex(p => p === null);
      longPressPos.current = { ...pos, isNew: true, newIdx, newPos: pos };
      // Hold > 200ms = fine-position mode with loupe + drag
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        onPlacePlayer?.(pos); try { navigator.vibrate?.(15); } catch(e) {}
        setDragging(newIdx);
      }, 200);
    }
  };

  const handleMove = (e) => {
    e.preventDefault();
    // Loupe: update position
    if ((e.touches?.length === 1 || !e.touches) && (editable || layoutEditMode)) {
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      setActiveTouchPos({ x: cx - rect.left, y: cy - rect.top });
    }
    if (e.touches?.length === 2 && pinchRef.current) {
      const newDist = getTouchDist(e);
      const scale = newDist / pinchRef.current.dist;
      const nz = Math.max(1, Math.min(5, pinchRef.current.zoom * scale));
      setZoom(nz);
      setPan({ x: Math.max(-canvasSize.w * (nz - 1), Math.min(0, pinchRef.current.pan.x)), y: Math.max(-canvasSize.h * (nz - 1), Math.min(0, pinchRef.current.pan.y)) });
      return;
    }
    if (e.touches?.length > 1) return;

    // Single-finger pan when zoomed and not dragging an element
    if (zoom > 1.05 && panStartRef.current && e.touches?.length === 1 && dragging === null && draggingBunker === null) {
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5 || panStartRef.current.moved) {
        panStartRef.current.moved = true;
        const maxPanX = canvasSize.w * (zoom - 1);
        const maxPanY = canvasSize.h * (zoom - 1);
        setPan({
          x: Math.max(-maxPanX, Math.min(0, panStartRef.current.panX + dx)),
          y: Math.max(-maxPanY, Math.min(0, panStartRef.current.panY + dy)),
        });
        return;
      }
    }

    // Calibration drag
    if (calDragRef.current && calibrationMode) {
      const pos = getRelPos(e);
      onCalibrationMove?.(calDragRef.current, pos);
      return;
    }

    if (!editable && !layoutEditMode) return;
    const pos = getRelPos(e);

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
    const wasPanning = panStartRef.current?.moved;
    pinchRef.current = null;
    panStartRef.current = null;
    calDragRef.current = null;
    setActiveTouchPos(null);
    if (wasPanning) return;
    clearTimeout(longPressTimer.current); longPressTimer.current = null;

    // Toolbar tap check
    if (toolbarPlayer !== null && toolbarItems.length && !didLongPress.current) {
      const tPos = longPressPos.current;
      if (tPos) {
        const canvX = tPos.x * canvasSize.w, canvY = tPos.y * canvasSize.h;
        for (const item of toolbarItems) {
          if (!item._hitArea) continue;
          const h = item._hitArea;
          if (canvX >= h.x && canvX <= h.x + h.w && canvY >= h.y && canvY <= h.y + h.h) {
            onToolbarAction?.(item.action, toolbarPlayer);
            setDragging(null); draggingBunker && setDraggingBunker(null);
            didLongPress.current = false; longPressPos.current = null;
            return;
          }
        }
        // Tap outside toolbar = close
        onToolbarAction?.('close', toolbarPlayer);
        didLongPress.current = false; longPressPos.current = null;
        return;
      }
    }

    // Quick tap in shoot mode = place shot
    if (mode === 'shoot' && !didLongPress.current && selectedPlayer !== null && players[selectedPlayer]) {
      const pos = longPressPos.current;
      if (pos && !findShot(pos)) onPlaceShot?.(selectedPlayer, { ...pos, isKill: false });
    }
    // Quick tap in place mode = place player instantly (no loupe needed)
    if (mode === 'place' && !didLongPress.current && dragging === null) {
      const pos = longPressPos.current;
      if (pos?.isNew && players.filter(Boolean).length < 5) {
        onPlacePlayer?.(pos); try { navigator.vibrate?.(15); } catch(e) {}
      }
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
    // Bump detection: if dragged far enough (>8%), trigger bump
    if (dragging !== null && dragStartRef.current && players[dragging]) {
      const start = dragStartRef.current;
      const end = players[dragging];
      const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      if (dist > 0.08 && onBumpPlayer) {
        onBumpPlayer(dragging, start);
      }
    }
    dragStartRef.current = null;
    setDraggingBunker(null);
    setDragging(null); didLongPress.current = false; longPressPos.current = null;
  };

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative', overflow: 'visible' }}>
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
