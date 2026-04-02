import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../../hooks/useDevice';
import { COLORS, FONT, TOUCH, responsive } from '../../utils/theme';
import { Btn, Icons } from '../../components/ui';
import Header from '../../components/Header';
import { useLayouts } from '../../hooks/useFirestore';
import { useBallisticsWorker } from './useBallisticsWorker';

const TYPE_ABBREV = ['SB','SD','MD','Tr','C','Br','GB','MW','Wg','GW','Ck','TCK','T','MT','GP'];
const TYPE_LABELS = {
  SB:'Snake Beam',SD:'Small Dorito',MD:'Medium Dorito',Tr:'Tree',C:'Can/Cylinder',
  Br:'Brick',GB:'Giant Brick',MW:'Mini Wedge',Wg:'Wing',GW:'Giant Wing',
  Ck:'Cake',TCK:'Tall Cake',T:'Temple',MT:'Maya Temple',GP:'Giant Plus',
};
const TYPE_H = {
  SB:.76,SD:.85,MD:1,Tr:.9,C:1.2,Br:1.15,GB:1.5,MW:1.2,Wg:1.4,GW:1.7,
  Ck:1,TCK:1.6,T:1.5,MT:1.8,GP:1.5,
};
const TYPE_STANCE = {
  SB:'prone',SD:'kneeling',MD:'kneeling',Tr:'kneeling',C:'kneeling',
  Br:'kneeling',GB:'standing',MW:'kneeling',Wg:'kneeling',GW:'standing',
  Ck:'kneeling',TCK:'standing',T:'standing',MT:'standing',GP:'standing',
};
const BARREL_H = { prone:.45, kneeling:1.15, standing:1.55 };
const hCol = (h) => h <= .8 ? '#22c55e' : h <= 1.2 ? '#f59e0b' : '#ef4444';

function guessType(name) {
  if (!name) return 'Br';
  const n = name.toUpperCase();
  if (/^SB\d?$|SNAKE|^S\d/.test(n)) return 'SB';
  if (/^SD/.test(n) || (n.includes('DORITO') && n.includes('SM'))) return 'SD';
  if (/^MD|DORITO|^D\d|^D50/.test(n)) return 'MD';
  if (/^TR|TREE|DRZEW/.test(n)) return 'Tr';
  if (/^C\d?$|CAN|CYLINDER|PUSZK/.test(n)) return 'C';
  if (/^GB|GIANT.?B/.test(n)) return 'GB';
  if (/^BR|BRICK|CEGŁ/.test(n)) return 'Br';
  if (/^MW|MINI.?W|MINI.?WEDGE/.test(n)) return 'MW';
  if (/^GW|GIANT.?W|BIG.?W/.test(n)) return 'GW';
  if (/^WG|^WING/.test(n)) return 'Wg';
  if (/^TCK|TALL.?C/.test(n)) return 'TCK';
  if (/^CK|CAKE/.test(n)) return 'Ck';
  if (/^MT|MAYA/.test(n)) return 'MT';
  if (/^T\d?$|TEMPLE/.test(n)) return 'T';
  if (/^GP|PLUS|STAR|ROZGW/.test(n)) return 'GP';
  if (/TOWER|GOD/.test(n)) return 'MT';
  return 'Br';
}

export default function BreakAnalyzerPage() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);
  const { layouts, loading } = useLayouts();
  const layout = layouts?.find(l => l.id === layoutId);

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [cSize, setCSize] = useState({ w: 600, h: 400 });
  const [mode, setMode] = useState('vis'); // 'vis' | 'types' | 'counter'
  const [showHeat, setShowHeat] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [editId, setEditId] = useState(null);
  const [bunkers, setBunkers] = useState([]);
  const [fieldW] = useState(45.7);
  const [fieldH] = useState(36.6);

  // ── Visibility state ──
  const [selBunker, setSelBunker] = useState(null);
  const [freePoint, setFreePoint] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stanceOverride, setStanceOverride] = useState(null); // null|'standing'|'kneeling'|'prone'
  const dragTimerRef = useRef(null);
  const lastQueryRef = useRef(0);

  // ── Counter state ──
  const [counterDrawing, setCounterDrawing] = useState(false); // actively drawing path
  const [counterPath, setCounterPath] = useState(null);        // committed path [{x,y}]
  const [selectedCounterIdx, setSelectedCounterIdx] = useState(null);
  const counterPtsRef = useRef([]);                            // live points during draw

  const {
    isReady, progress, visData, counterData, error,
    initField, queryVis, analyzeCounter, clearCounter,
  } = useBallisticsWorker();

  // ── Image ──
  useEffect(() => {
    if (!layout?.fieldImage) { setImgObj(null); return; }
    const img = new Image(); img.onload = () => setImgObj(img); img.src = layout.fieldImage;
  }, [layout?.fieldImage]);

  // ── Resize ──
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width;
        setCSize(imgObj
          ? { w, h: Math.min(w * (imgObj.height / imgObj.width), device.isMobile ? 400 : 600) }
          : { w, h: w * 0.65 });
      }
    });
    obs.observe(el); return () => obs.disconnect();
  }, [imgObj, device.isMobile]);

  // ── Init bunkers ──
  useEffect(() => {
    if (!layout?.bunkers?.length) { setBunkers([]); return; }
    setBunkers(layout.bunkers.map(b => {
      const t = b.baType || guessType(b.name);
      return { ...b, baType: t, heightM: TYPE_H[t] || 1.2 };
    }));
  }, [layout?.bunkers]);

  // ── Init worker ──
  useEffect(() => {
    if (!bunkers.length) return;
    initField(bunkers.map(b => ({
      id: b.id, x: b.x, y: b.y, type: b.baType, heightM: b.heightM,
      shape: (b.baType === 'C' || b.baType === 'Tr') ? 'circle' : 'rect',
    })), fieldW, fieldH, 4);
  }, [bunkers, fieldW, fieldH, initField]);

  // ── Reset counter when switching away from counter mode ──
  useEffect(() => {
    if (mode !== 'counter') {
      setCounterDrawing(false);
      counterPtsRef.current = [];
    }
  }, [mode]);

  // ── Fire visibility query — v4: stanceOverride ──
  const fireQuery = useCallback((bId, pos, bType) => {
    const now = Date.now();
    if (now - lastQueryRef.current < 150) return;
    lastQueryRef.current = now;
    // v5 API: queryVis(bunkerId, pos, stanceOverride) — barrelH + bunkerType auto-resolved in worker
    queryVis(bId || null, pos || null, stanceOverride);
  }, [queryVis, stanceOverride]);

  // ── Get normalized canvas position from event ──
  const getPos = useCallback((e) => {
    const rect = overlayRef.current?.getBoundingClientRect(); if (!rect) return null;
    const cx = (e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? e.clientX) - rect.left;
    const cy = (e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? e.clientY) - rect.top;
    return { x: Math.max(0, Math.min(1, cx / cSize.w)), y: Math.max(0, Math.min(1, cy / cSize.h)) };
  }, [cSize]);

  // ── Find nearest bunker ──
  const findBunker = useCallback((nx, ny) => {
    let best = null, bestD = 30;
    for (const b of bunkers) {
      const dx = (b.x - nx) * cSize.w, dy = (b.y - ny) * cSize.h;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }, [bunkers, cSize]);

  // ── Pointer handlers ──
  const handleDown = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e); if (!pos) return;

    // ── Counter mode: start drawing path ──
    if (mode === 'counter') {
      setCounterDrawing(true);
      setCounterPath(null);
      clearCounter();
      setSelectedCounterIdx(null);
      counterPtsRef.current = [pos];
      return;
    }

    // ── Vis mode ──
    if (mode !== 'vis') return;
    setIsDragging(true);
    const b = findBunker(pos.x, pos.y);
    if (b) {
      setSelBunker(b.id); setFreePoint(null);
      fireQuery(b.id, null, b.baType);
    } else {
      setSelBunker(null); setFreePoint(pos);
      fireQuery(null, pos, null);
    }
  }, [mode, getPos, findBunker, fireQuery, clearCounter]);

  const handleMove = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e); if (!pos) return;

    // ── Counter mode: accumulate path points ──
    if (mode === 'counter' && counterDrawing) {
      const pts = counterPtsRef.current;
      if (!pts.length) return;
      const last = pts[pts.length - 1];
      const dist = Math.sqrt((pos.x - last.x) ** 2 + (pos.y - last.y) ** 2);
      if (dist > 0.012) {
        counterPtsRef.current = [...pts, pos];
        // Force overlay redraw by updating a ref-tracked state
        setCounterPath([...counterPtsRef.current]); // temp — shows live path
      }
      return;
    }

    // ── Vis mode ──
    if (!isDragging || mode !== 'vis') return;
    const b = findBunker(pos.x, pos.y);
    if (b) {
      setSelBunker(b.id); setFreePoint(null);
      fireQuery(b.id, null, b.baType);
    } else {
      setSelBunker(null); setFreePoint(pos);
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = setTimeout(() => fireQuery(null, pos, null), 80);
    }
  }, [mode, counterDrawing, isDragging, getPos, findBunker, fireQuery]);

  const handleUp = useCallback((e) => {
    // ── Counter mode: commit path and analyze ──
    if (mode === 'counter' && counterDrawing) {
      setCounterDrawing(false);
      const pts = counterPtsRef.current;
      if (pts.length >= 2) {
        setCounterPath([...pts]);
        const myBase = layout?.fieldCalibration?.homeBase ?? { x: 0.05, y: 0.5 };
        analyzeCounter(pts, myBase);
      }
      counterPtsRef.current = [];
      return;
    }
    setIsDragging(false);
    clearTimeout(dragTimerRef.current);
  }, [mode, counterDrawing, layout, analyzeCounter]);

  // ── Type mode tap ──
  const handleTypeTap = useCallback((e) => {
    if (mode !== 'types') return;
    e.preventDefault();
    const pos = getPos(e); if (!pos) return;
    const b = findBunker(pos.x, pos.y);
    if (b) setEditId(editId === b.id ? null : b.id);
  }, [mode, getPos, findBunker, editId]);

  // ── Update bunker type ──
  const setType = useCallback((id, t) => {
    setBunkers(prev => prev.map(b => b.id === id ? { ...b, baType: t, heightM: TYPE_H[t] || 1.2 } : b));
    setEditId(null);
  }, []);

  // ── Selected info ──
  const selInfo = useMemo(() => {
    if (!selBunker) return null;
    const b = bunkers.find(bk => bk.id === selBunker); if (!b) return null;
    const st = TYPE_STANCE[b.baType] || 'kneeling';
    return { name: b.name, type: b.baType, typeLabel: TYPE_LABELS[b.baType] || b.baType, h: b.heightM, stance: st };
  }, [selBunker, bunkers]);

  const visStats = useMemo(() => {
    if (!visData) return null;
    const total = visData.safe.length;
    const direct = visData.safe.filter(v => v > .01).length;
    const arcN   = (visData.arc || []).filter(v => v > .01).length;
    const expN   = (visData.exposed || []).filter(v => v > .01).length;
    return { total, direct, arcN, expN, pct: Math.round((direct + arcN + expN) / total * 100) };
  }, [visData]);

  // ── Best bump spot from counterData ──
  const bestBump = useMemo(() => {
    if (!counterData?.bumpGrid) return null;
    const { bumpGrid, bumpCols, bumpRows } = counterData;
    let best = 0, bi = 0;
    for (let i = 0; i < bumpGrid.length; i++) {
      if (bumpGrid[i] > best) { best = bumpGrid[i]; bi = i; }
    }
    if (best < 0.05) return null;
    return {
      x: (bi % bumpCols + 0.5) / bumpCols,
      y: (Math.floor(bi / bumpCols) + 0.5) / bumpRows,
      p: best,
    };
  }, [counterData]);

  // ═══ DRAW BASE CANVAS ═══
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const { w, h } = cSize;
    c.width = w * 2; c.height = h * 2; ctx.scale(2, 2);

    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = COLORS.textMuted; ctx.font = `14px ${FONT}`;
      ctx.textAlign = 'center'; ctx.fillText('Brak obrazu', w/2, h/2);
    }

    if (!showLabels || !bunkers.length) return;

    const fs = Math.max(9, Math.min(13, w * 0.022));
    const pad = Math.round(fs * 0.5), lh = Math.round(fs * 1.6);

    bunkers.forEach(b => {
      const bx = b.x*w, by = b.y*h;
      const sel = selBunker === b.id;
      const hc = hCol(b.heightM);

      ctx.beginPath(); ctx.arc(bx, by, sel?5:3, 0, Math.PI*2);
      ctx.fillStyle = sel ? COLORS.accent : hc; ctx.fill();
      if (sel) {
        ctx.beginPath(); ctx.arc(bx,by,14,0,Math.PI*2);
        ctx.strokeStyle=COLORS.accent+'50'; ctx.lineWidth=2; ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);
      }

      ctx.font = `bold ${fs}px ${FONT}`;
      const tw = ctx.measureText(b.name).width, pw = tw+pad*2, px = bx-pw/2, py = by-lh-6;
      ctx.fillStyle = sel ? 'rgba(245,158,11,0.18)' : 'rgba(8,12,22,0.92)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px,py,pw,lh,4); else ctx.rect(px,py,pw,lh);
      ctx.fill();
      ctx.strokeStyle = sel ? COLORS.accent : hc+'70'; ctx.lineWidth = sel?1.5:1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px,py,pw,lh,4); else ctx.rect(px,py,pw,lh);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(px+pad/2+1, py+lh/2, 2.5, 0, Math.PI*2);
      ctx.fillStyle = hc; ctx.fill();
      ctx.fillStyle = sel ? COLORS.accent : '#e2e8f0';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(b.name, bx, py+lh/2);
    });
  }, [cSize, imgObj, bunkers, showLabels, selBunker]);

  // ═══ DRAW OVERLAY (heatmap / counter results) ═══
  useEffect(() => {
    const c = overlayRef.current; if (!c) return;
    const { w, h } = cSize;
    c.width = w*2; c.height = h*2;
    const ctx = c.getContext('2d'); ctx.scale(2,2); ctx.clearRect(0,0,w,h);

    // ── Visibility heatmap (mode=vis) ──
    if (mode === 'vis' && showHeat && visData) {
      const { cols, rows, safe, risky } = visData;
      const cw = w/cols, ch2 = h/rows;
      for (let gy=0; gy<rows; gy++) {
        for (let gx=0; gx<cols; gx++) {
          const idx = gy*cols+gx, s = safe[idx], r = risky[idx];
          if (s<=.001 && r<=.001) continue;
          if (s>.001) {
            ctx.fillStyle = `rgba(${Math.round(s*255)},${Math.round((1-s)*200)},0,${Math.min(.55, s*.7+.05)})`;
          } else {
            ctx.fillStyle = `rgba(${Math.round(r*120)},${Math.round(r*80)},${Math.round(180+r*75)},${Math.min(.35, r*.5+.03)})`;
          }
          ctx.fillRect(gx*cw, gy*ch2, cw+.5, ch2+.5);
        }
      }
    }

    // ── Counter mode ──
    if (mode === 'counter') {
      // Bump heatmap (cyan)
      if (showHeat && counterData?.bumpGrid) {
        const { bumpGrid, bumpCols, bumpRows } = counterData;
        const cw2 = w/bumpCols, ch3 = h/bumpRows;
        for (let gy=0; gy<bumpRows; gy++) {
          for (let gx=0; gx<bumpCols; gx++) {
            const p = bumpGrid[gy*bumpCols+gx];
            if (p < 0.02) continue;
            ctx.fillStyle = `rgba(0,${Math.round(180+p*75)},${Math.round(200+p*55)},${Math.min(.5,p*.6+.03)})`;
            ctx.fillRect(gx*cw2, gy*ch3, cw2+.5, ch3+.5);
          }
        }
      }

      // Enemy path
      const pts = counterPath;
      if (pts?.length >= 2) {
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x*w, pts[0].y*h);
        for (let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x*w, pts[i].y*h);
        ctx.stroke();
        // Arrow head
        const last = pts[pts.length-1], prev = pts[pts.length-2];
        const dx = last.x-prev.x, dy = last.y-prev.y, len = Math.sqrt(dx*dx+dy*dy);
        if (len > 0.001) {
          const nx=dx/len, ny=dy/len, ex=last.x*w, ey=last.y*h;
          ctx.fillStyle='#f97316';
          ctx.beginPath();
          ctx.moveTo(ex,ey);
          ctx.lineTo(ex-nx*14-ny*7, ey-ny*14+nx*7);
          ctx.lineTo(ex-nx*14+ny*7, ey-ny*14-nx*7);
          ctx.closePath(); ctx.fill();
        }
        // Label
        ctx.fillStyle='#f97316cc'; ctx.font=`bold 9px ${FONT}`;
        ctx.textAlign='center'; ctx.textBaseline='bottom';
        ctx.fillText('WRÓG', pts[0].x*w, pts[0].y*h - 8);
      }

      // Lane lines + score badges (counter results)
      if (counterData?.counters) {
        counterData.counters.forEach((c, i) => {
          if (i >= 5) return;
          const b = bunkers.find(bk => bk.id === c.bunkerId); if (!b) return;
          const bx = b.x*w, by = b.y*h;
          const isSelected = i === selectedCounterIdx;
          const alpha = selectedCounterIdx !== null ? (isSelected ? 1 : 0.2) : 1;
          const isSafe = !!c.safe;
          const lane = c.safe || c.risky;

          // Lane line
          if (lane) {
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(lane.laneStart.x*w, lane.laneStart.y*h);
            ctx.lineTo(lane.laneEnd.x*w, lane.laneEnd.y*h);
            ctx.strokeStyle = isSafe ? '#22c55e' : '#3b82f6';
            ctx.lineWidth = Math.max(1.5, lane.pHit * 5);
            ctx.setLineDash(isSafe ? [6,3] : [4,4]); ctx.stroke(); ctx.setLineDash([]);
            ctx.globalAlpha = 1;
          }

          // Score badge
          ctx.globalAlpha = alpha;
          const pct = Math.round((c.safe?.pHit || c.risky?.pHit || 0) * 100);
          const col = isSafe ? '#22c55e' : '#3b82f6';
          const badgeY = by + 10;
          ctx.fillStyle = isSelected ? col+'cc' : 'rgba(0,0,0,0.88)';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(bx-22, badgeY, 44, 19, 4);
          else ctx.rect(bx-22, badgeY, 44, 19);
          ctx.fill();
          ctx.strokeStyle = col; ctx.lineWidth = isSelected ? 2 : 1;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(bx-22, badgeY, 44, 19, 4);
          else ctx.rect(bx-22, badgeY, 44, 19);
          ctx.stroke();
          ctx.fillStyle = isSelected ? '#fff' : col;
          ctx.font = `bold 10px ${FONT}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`#${i+1} ${pct}%`, bx, badgeY+9.5);
          ctx.globalAlpha = 1;
        });
      }

      // Best bump star marker
      if (showHeat && bestBump) {
        const bx2 = bestBump.x*w, by2 = bestBump.y*h;
        ctx.beginPath(); ctx.arc(bx2, by2, 8, 0, Math.PI*2);
        ctx.fillStyle = '#22d3ee40'; ctx.fill();
        ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#22d3ee'; ctx.font = `bold 8px ${FONT}`;
        ctx.textAlign='center'; ctx.textBaseline='bottom';
        ctx.fillText(`${Math.round(bestBump.p*100)}%`, bx2, by2-10);
      }

      // Drawing hint
      if (!counterPath && !counterData) {
        ctx.fillStyle = 'rgba(249,115,22,0.18)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f97316'; ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Narysuj ścieżkę biegu wroga', w/2, h/2 - 10);
        ctx.font = `11px ${FONT}`; ctx.fillStyle = '#f9731680';
        ctx.fillText('Przeciągnij palcem od bazy wroga', w/2, h/2 + 10);
      }
    }

    // ── Crosshair (vis mode only) ──
    if (mode === 'vis') drawCrosshair(ctx, w, h);

  }, [cSize, visData, counterData, counterPath, showHeat, mode, selBunker, bunkers, freePoint, bestBump, selectedCounterIdx]);

  function drawCrosshair(ctx, w, h) {
    let mx, my, isFree = false;
    if (selBunker) {
      const b = bunkers.find(bk => bk.id === selBunker);
      if (b) { mx = b.x*w; my = b.y*h; }
    } else if (freePoint) {
      mx = freePoint.x*w; my = freePoint.y*h; isFree = true;
    }
    if (mx === undefined) return;
    const col = isFree ? '#3b82f6' : COLORS.accent;
    ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI*2);
    ctx.fillStyle = col+'30'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = col+'aa'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx-16,my); ctx.lineTo(mx+16,my); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx,my-16); ctx.lineTo(mx,my+16); ctx.stroke();
    if (isFree) {
      ctx.beginPath(); ctx.arc(mx,my,18,0,Math.PI*2);
      ctx.strokeStyle=col+'40'; ctx.lineWidth=1; ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=col; ctx.font=`bold 9px ${FONT}`; ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText('FREE', mx, my-20);
    }
  }

  // ═══ RENDER ═══
  if (loading) return (
    <div style={{ background:COLORS.bg, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontFamily:FONT, color:COLORS.accent }}>⏳ Ładowanie...</span>
    </div>
  );
  if (!layout) return (
    <div style={{ background:COLORS.bg, minHeight:'100vh' }}>
      <Header breadcrumbs={[{label:'Layouts',path:'/layouts'},'?']} />
      <div style={{ fontFamily:FONT, color:COLORS.textDim, textAlign:'center', marginTop:40 }}>Layout nie znaleziony</div>
    </div>
  );

  return (
    <div style={{ background:COLORS.bg, minHeight:'100vh' }}>
      <Header breadcrumbs={[{label:'Layouts',path:'/layouts'}, `⚡ ${layout.name}`]} />

      {/* Toolbar */}
      <div style={{ padding:`4px ${R.layout.padding}px`, display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
        <Btn variant={mode==='vis'?'accent':'default'} size="sm"
          onClick={()=>{ setMode('vis'); setSelectedCounterIdx(null); }}
          style={{fontSize:R.font.sm}}>👁 Widoczność</Btn>
        <Btn variant={mode==='types'?'accent':'default'} size="sm"
          onClick={()=>{ setMode('types'); setSelectedCounterIdx(null); }}
          style={{fontSize:R.font.sm}}>✎ Typy</Btn>
        <Btn variant={mode==='counter'?'accent':'default'} size="sm"
          style={{ fontSize:R.font.sm, borderColor: mode==='counter' ? '#f97316' : undefined,
            color: mode==='counter' ? '#000' : '#f97316' }}
          onClick={()=>{
            if (mode === 'counter') {
              setMode('vis'); clearCounter(); setCounterPath(null); setSelectedCounterIdx(null);
            } else {
              setMode('counter'); clearCounter(); setCounterPath(null); setSelectedCounterIdx(null);
            }
          }}>
          🎯 Counter
        </Btn>
        <div style={{flex:1}} />
        <Btn variant={showHeat?'accent':'default'} size="sm"
          onClick={()=>setShowHeat(v=>!v)} style={{padding:'0 8px',minWidth:32}}>🔥</Btn>
        <Btn variant={showLabels?'accent':'default'} size="sm"
          onClick={()=>setShowLabels(v=>!v)} style={{padding:'0 8px',minWidth:32}}>🏷️</Btn>
      </div>

      {/* Stance selector — visible in vis mode */}
      {mode === 'vis' && (
        <div style={{ padding:`0 ${R.layout.padding}px 4px`, display:'flex', gap:4, alignItems:'center' }}>
          <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginRight:2 }}>Pozycja:</span>
          {[
            { key: null,        label: '⚙ Auto', title: 'Auto-detekcja z typu bunkra' },
            { key: 'standing',  label: '🧍 Stoi',   title: 'Standing · lufa 1.55m' },
            { key: 'kneeling',  label: '🧎 Klęczy', title: 'Kneeling · lufa 1.15m' },
            { key: 'prone',     label: '🐍 Leży',   title: 'Prone · lufa 0.45m' },
          ].map(s => (
            <button key={String(s.key)}
              title={s.title}
              onClick={() => {
                setStanceOverride(s.key);
                // Retrigger query with new stance
                if (selBunker) {
                  const b = bunkers.find(bk => bk.id === selBunker);
                  if (b) setTimeout(() => fireQuery(b.id, null, b.baType), 10);
                } else if (freePoint) {
                  setTimeout(() => fireQuery(null, freePoint, null), 10);
                }
              }}
              style={{
                padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${stanceOverride === s.key ? COLORS.accent : COLORS.border}`,
                background: stanceOverride === s.key ? COLORS.accent + '20' : COLORS.surface,
                color: stanceOverride === s.key ? COLORS.accent : COLORS.textDim,
                fontFamily: FONT, fontSize: 11, fontWeight: stanceOverride === s.key ? 700 : 400,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {progress && (
        <div style={{ padding:`2px ${R.layout.padding}px`, fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>
          ⏳ {
            progress.phase==='vis' ? 'Widoczność' :
            progress.phase==='counter-bump' ? 'Bump heatmapa' :
            progress.phase==='counter-bunkers' ? 'Pozycje za bunkrami' : 'Init'
          }... {progress.pct||0}%
          <div style={{height:2,background:COLORS.border,borderRadius:1,marginTop:2}}>
            <div style={{
              height:2, borderRadius:1, width:`${progress.pct||0}%`, transition:'width .15s',
              background: progress.phase?.startsWith('counter') ? '#f97316' : COLORS.accent,
            }} />
          </div>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} style={{ width:'100%', position:'relative', padding:`0 ${R.layout.padding}px` }}>
        <canvas ref={canvasRef}
          style={{ width:cSize.w, height:cSize.h, borderRadius:10, display:'block', border:`1px solid ${COLORS.border}` }} />
        <canvas ref={overlayRef}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          onPointerCancel={handleUp}
          onClick={mode==='types' ? handleTypeTap : undefined}
          style={{
            position:'absolute', top:0, left:R.layout.padding,
            width:cSize.w, height:cSize.h, borderRadius:10,
            cursor: mode==='counter' ? 'crosshair' : isDragging ? 'none' : mode==='types' ? 'pointer' : 'crosshair',
            touchAction:'none',
          }} />
      </div>

      {/* ── Info panels ── */}

      {/* Vis mode: selected bunker / free point info */}
      {mode==='vis' && (selInfo || freePoint) && (
        <div style={{ margin:`8px ${R.layout.padding}px`, padding:R.layout.cardPad, borderRadius:10,
          background:COLORS.surface, border:`1px solid ${COLORS.border}` }}>
          {selInfo ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontFamily:FONT, fontSize:R.font.lg, fontWeight:700, color:COLORS.accent }}>{selInfo.name}</span>
                <span style={{ padding:'2px 8px', borderRadius:4, fontSize:R.font.xs, fontFamily:FONT,
                  background:COLORS.surfaceLight, color:COLORS.text }}>{selInfo.typeLabel}</span>
                <span style={{ padding:'2px 8px', borderRadius:4, fontSize:R.font.xs, fontFamily:FONT,
                  background:hCol(selInfo.h)+'18', color:hCol(selInfo.h) }}>{selInfo.h.toFixed(2)}m</span>
              </div>
              {/* v4: show actual stance+barrelH returned by worker */}
              <div style={{ fontFamily:FONT, fontSize:R.font.xs, color:COLORS.textDim, marginTop:4 }}>
                {visData?.stance
                  ? <>
                      Pozycja: <strong style={{ color: COLORS.text }}>{visData.stance}</strong>
                      {stanceOverride && <span style={{ color: COLORS.accent }}> (override)</span>}
                      {' · '} Lufa: <strong style={{ color: COLORS.text }}>{visData.barrelH?.toFixed(2)}m</strong>
                    </>
                  : `${selInfo.stance} · lufa ${BARREL_H[selInfo.stance]}m`
                }
              </div>
            </>
          ) : freePoint && (
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontFamily:FONT, fontSize:R.font.lg, fontWeight:700, color:'#3b82f6' }}>Free point</span>
              <span style={{ padding:'2px 8px', borderRadius:4, fontSize:R.font.xs, fontFamily:FONT,
                background:'#3b82f618', color:'#3b82f6' }}>
                {stanceOverride || 'standing'} · {(visData?.barrelH ?? BARREL_H[stanceOverride || 'standing'] ?? 1.55).toFixed(2)}m
              </span>
            </div>
          )}
          {visStats && (
            <div style={{ fontFamily:FONT, fontSize:R.font.xs, color:COLORS.textDim, marginTop:4 }}>
              Pokrycie: {visStats.pct}% ({visStats.direct} bezpośr. + {visStats.risky} ryzykownych)
            </div>
          )}
          {visData?.isSnake && (
            <div style={{ fontFamily:FONT, fontSize:10, color:'#3b82f6', marginTop:4,
              padding:'4px 8px', borderRadius:4, background:'#3b82f620' }}>
              🐍 Zielony/czerwony = boki (prone) · Niebieski = przód (sit-up, ryzyko)
            </div>
          )}
          <div style={{ display:'flex', gap:12, marginTop:6, fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
            <span>🟢→🔴 Bezpieczny</span><span>🟠 Lob (arc)</span><span>🔵 Ryzykowny</span>
          </div>
        </div>
      )}

      {mode==='vis' && !selInfo && !freePoint && bunkers.length > 0 && (
        <div style={{ margin:`8px ${R.layout.padding}px`, padding:R.layout.cardPad, borderRadius:10,
          background:COLORS.surface, border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontFamily:FONT, fontSize:R.font.sm, color:COLORS.textDim, textAlign:'center' }}>
            👆 Kliknij bunkier lub przytrzymaj i przesuń po polu
          </div>
        </div>
      )}

      {/* Counter mode: results panel */}
      {mode==='counter' && counterData && !progress && (
        <div style={{ margin:`8px ${R.layout.padding}px`, borderRadius:10,
          background:COLORS.surface, border:`1px solid ${COLORS.border}`, overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'8px 12px', background:'#f9731618',
            borderBottom:`1px solid ${COLORS.border}`,
            display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:FONT, fontSize:TOUCH.fontSm, color:'#f97316', fontWeight:700, flex:1 }}>
              🎯 Counter-play · {counterData.enemyTotalTime}s bieg · {counterData.counters.length} opcji
            </span>
            <Btn variant="ghost" size="sm" onClick={()=>{ clearCounter(); setCounterPath(null); setSelectedCounterIdx(null); }}>
              ✕ Wyczyść
            </Btn>
          </div>

          {/* Best bump */}
          {bestBump && (
            <div style={{ padding:'6px 12px', borderBottom:`1px solid ${COLORS.border}20`,
              fontFamily:FONT, fontSize:TOUCH.fontXs, color:COLORS.textDim }}>
              💥 Najlepsza przycupa: ({Math.round(bestBump.x*100)}%, {Math.round(bestBump.y*100)}%)
              {' — '}
              <strong style={{ color:'#22d3ee' }}>P(hit) {Math.round(bestBump.p*100)}%</strong>
            </div>
          )}

          {/* Counter list */}
          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {counterData.counters.slice(0,5).map((c, i) => {
              const pHit = c.safe?.pHit || c.risky?.pHit || 0;
              const isSafe = !!c.safe;
              const window = c.safe || c.risky;
              const isSelected = i === selectedCounterIdx;
              return (
                <div key={c.bunkerId}
                  onClick={()=>setSelectedCounterIdx(isSelected ? null : i)}
                  style={{
                    padding:'8px 12px', cursor:'pointer',
                    background: isSelected ? (isSafe?'#22c55e18':'#3b82f618') : 'transparent',
                    borderBottom:`1px solid ${COLORS.border}15`,
                    display:'flex', alignItems:'center', gap:8,
                  }}>
                  <span style={{ fontFamily:FONT, fontSize:TOUCH.fontXs, color:COLORS.textMuted, minWidth:18 }}>#{i+1}</span>
                  <span style={{ fontSize:16 }}>{isSafe ? '🟢' : '🔵'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:FONT, fontSize:TOUCH.fontSm, color:COLORS.text, fontWeight:600 }}>
                      {c.bunkerName}
                      {!c.canIntercept && (
                        <span style={{ color:'#f97316', fontSize:9, marginLeft:6 }}>*nie zdążę</span>
                      )}
                    </div>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>
                      {c.arrivalTime}s dobieg
                      {window ? ` · ${window.duration.toFixed(1)}s okno · ${window.shootingSide}` : ''}
                    </div>
                  </div>
                  <span style={{ fontFamily:FONT, fontSize:TOUCH.fontBase, fontWeight:700,
                    color: isSafe?'#22c55e':'#3b82f6' }}>
                    {Math.round(pHit*100)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ padding:'5px 12px', display:'flex', gap:16, borderTop:`1px solid ${COLORS.border}20`,
            fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
            <span>🟢 za osłoną (safe)</span>
            <span>🔵 wychył/łuk (risky)</span>
            <span>* za późno</span>
          </div>
        </div>
      )}

      {bunkers.length === 0 && (
        <div style={{ margin:`8px ${R.layout.padding}px`, padding:20, borderRadius:10,
          background:COLORS.surface, border:`1px solid ${COLORS.border}`, textAlign:'center' }}>
          <div style={{ fontFamily:FONT, fontSize:R.font.base, color:COLORS.textDim }}>Brak bunkrów</div>
          <div style={{ fontFamily:FONT, fontSize:R.font.xs, color:COLORS.textMuted, marginTop:4 }}>
            Layouts → annotacje → dodaj bunkry
          </div>
        </div>
      )}

      {/* ── TYPE EDITOR ── */}
      {mode==='types' && bunkers.length > 0 && (
        <div style={{ margin:`8px ${R.layout.padding}px`, padding:R.layout.cardPad, borderRadius:10,
          background:COLORS.surface, border:`1px solid ${COLORS.border}` }}>
          <div style={{ fontFamily:FONT, fontSize:R.font.sm, fontWeight:700, color:COLORS.text, marginBottom:6 }}>
            ✎ Typy ({bunkers.length})
          </div>
          <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
            {bunkers.map(b => (
              <div key={b.id} onClick={()=>setEditId(editId===b.id?null:b.id)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px', borderRadius:6, cursor:'pointer',
                  background: editId===b.id ? COLORS.surfaceHover : 'transparent' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:hCol(b.heightM), flexShrink:0 }} />
                <span style={{ fontFamily:FONT, fontSize:R.font.sm, color:'#facc15', flex:1, minWidth:0,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.name}</span>
                <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, flexShrink:0 }}>
                  {b.baType} · {b.heightM.toFixed(1)}m
                </span>
              </div>
            ))}
          </div>
          {editId && (
            <div style={{ marginTop:8, padding:8, borderRadius:8,
              background:COLORS.surfaceLight, border:`1px solid ${COLORS.accent}40` }}>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, marginBottom:6 }}>
                {bunkers.find(b=>b.id===editId)?.name}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                {TYPE_ABBREV.map(t => {
                  const cur = bunkers.find(b=>b.id===editId)?.baType;
                  return (
                    <button key={t} onClick={()=>setType(editId,t)}
                      style={{ padding:'5px 8px', borderRadius:4, border:`1px solid ${COLORS.border}`,
                        background: cur===t ? COLORS.accent+'30' : COLORS.surface,
                        color: cur===t ? COLORS.accent : COLORS.text,
                        fontFamily:FONT, fontSize:11, cursor:'pointer' }}>
                      <strong>{t}</strong>
                      <span style={{fontSize:9,color:COLORS.textDim}}> {TYPE_H[t]?.toFixed(1)}m</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status bar */}
      <div style={{ padding:`4px ${R.layout.padding}px 12px`, fontFamily:FONT, fontSize:10,
        color: error ? COLORS.danger : COLORS.textMuted, textAlign:'right' }}>
        {error
          ? `❌ ${error}`
          : `${isReady?'✅':'⏳'} · ${bunkers.length} bunkrów · grid ${visData?.cols||counterData?.bumpCols||'?'}×${visData?.rows||counterData?.bumpRows||'?'}`
        }
      </div>
    </div>
  );
}
