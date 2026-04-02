import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../../hooks/useDevice';
import { COLORS, FONT, TOUCH, responsive } from '../../utils/theme';
import { Btn, Icons } from '../../components/ui';
import Header from '../../components/Header';
import { useLayouts } from '../../hooks/useFirestore';
import { useBallisticsWorker } from './useBallisticsWorker';

// ─── NXL bunker type data ───
const TYPE_ABBREV = [
  'SB','SD','MD','Tr','C','Br','GB','MW','Wg','GW','Ck','TCK','T','MT','GP',
];
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

// Height → color
const hCol = (h) => h <= .8 ? '#22c55e' : h <= 1.2 ? '#f59e0b' : '#ef4444';

// Guess type from existing label name
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

// ─── MAIN COMPONENT ───
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
  const [selBunker, setSelBunker] = useState(null);
  const [mode, setMode] = useState('vis'); // 'vis' | 'types'
  const [showHeat, setShowHeat] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [editId, setEditId] = useState(null);
  const [bunkers, setBunkers] = useState([]);
  const [fieldW] = useState(45.7);
  const [fieldH] = useState(36.6);

  const { isReady, progress, visData, error, initField, queryVis } = useBallisticsWorker();

  // Load image
  useEffect(() => {
    if (!layout?.fieldImage) { setImgObj(null); return; }
    const img = new Image();
    img.onload = () => setImgObj(img);
    img.src = layout.fieldImage;
  }, [layout?.fieldImage]);

  // Resize
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
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj, device.isMobile]);

  // Init bunkers from layout
  useEffect(() => {
    if (!layout?.bunkers?.length) { setBunkers([]); return; }
    setBunkers(layout.bunkers.map(b => {
      const t = b.baType || guessType(b.name);
      return { ...b, baType: t, heightM: TYPE_H[t] || 1.2 };
    }));
  }, [layout?.bunkers]);

  // Init worker
  useEffect(() => {
    if (!bunkers.length) return;
    initField(bunkers.map(b => ({
      id: b.id, x: b.x, y: b.y, type: b.baType,
      heightM: b.heightM, shape: b.baType === 'C' || b.baType === 'Tr' ? 'circle' : 'rect',
    })), fieldW, fieldH, 4);
  }, [bunkers, fieldW, fieldH, initField]);

  // ─── Draw base canvas ───
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const { w, h } = cSize;
    c.width = w * 2; c.height = h * 2;
    ctx.scale(2, 2);

    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = COLORS.textMuted; ctx.font = `14px ${FONT}`;
      ctx.textAlign = 'center'; ctx.fillText('Brak obrazu layoutu', w / 2, h / 2);
    }

    if (!showLabels || !bunkers.length) return;

    const fs = Math.max(9, Math.min(13, w * 0.022));
    ctx.font = `bold ${fs}px ${FONT}`;
    const pad = Math.round(fs * 0.5), lh = Math.round(fs * 1.6);

    bunkers.forEach(b => {
      const bx = b.x * w, by = b.y * h;
      const sel = selBunker === b.id;
      const hc = hCol(b.heightM);

      // Anchor
      ctx.beginPath(); ctx.arc(bx, by, sel ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = sel ? COLORS.accent : hc; ctx.fill();
      if (sel) {
        ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.accent + '50'; ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
      }

      // Pill
      const label = b.name;
      ctx.font = `bold ${fs}px ${FONT}`;
      const tw = ctx.measureText(label).width;
      const pw = tw + pad * 2, px = bx - pw / 2, py = by - lh - 6;
      ctx.fillStyle = sel ? 'rgba(245,158,11,0.18)' : 'rgba(8,12,22,0.92)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, pw, lh, 4); else ctx.rect(px, py, pw, lh);
      ctx.fill();
      ctx.strokeStyle = sel ? COLORS.accent : hc + '70';
      ctx.lineWidth = sel ? 1.5 : 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, pw, lh, 4); else ctx.rect(px, py, pw, lh);
      ctx.stroke();

      // Type dot
      ctx.beginPath(); ctx.arc(px + pad / 2 + 1, py + lh / 2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = hc; ctx.fill();

      ctx.fillStyle = sel ? COLORS.accent : '#e2e8f0';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, bx, py + lh / 2);
    });
  }, [cSize, imgObj, bunkers, showLabels, selBunker]);

  // ─── Draw heatmap overlay ───
  useEffect(() => {
    const c = overlayRef.current; if (!c) return;
    const { w, h } = cSize;
    c.width = w * 2; c.height = h * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2); ctx.clearRect(0, 0, w, h);
    if (!showHeat || !visData) return;

    const { cols, rows, safe, risky } = visData;
    const cw = w / cols, ch = h / rows;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const idx = gy * cols + gx;
        const s = safe[idx], r = risky[idx];
        if (s <= .001 && r <= .001) continue;

        if (s > .001) {
          // SAFE shot — green (low acc) → red (high acc)
          ctx.fillStyle = `rgba(${Math.round(s*255)},${Math.round((1-s)*200)},0,${Math.min(.55, s*.7+.05)})`;
        } else {
          // RISKY shot — blue/cyan tint (requires exposure: arc, sit-up, lean-out)
          ctx.fillStyle = `rgba(${Math.round(r*120)},${Math.round(r*80)},${Math.round(180+r*75)},${Math.min(.35, r*.5+.03)})`;
        }
        ctx.fillRect(gx * cw, gy * ch, cw + .5, ch + .5);
      }
    }

    // Shooter marker
    if (selBunker) {
      const b = bunkers.find(bk => bk.id === selBunker);
      if (b) {
        const bx = b.x * w, by = b.y * h;
        ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245,158,11,0.25)'; ctx.fill();
        ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = COLORS.accent + '80'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx - 16, by); ctx.lineTo(bx + 16, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by - 16); ctx.lineTo(bx, by + 16); ctx.stroke();
      }
    }
  }, [cSize, visData, showHeat, selBunker, bunkers]);

  // ─── Click → select bunker ───
  const handleTap = useCallback((e) => {
    e.preventDefault();
    const rect = overlayRef.current?.getBoundingClientRect(); if (!rect) return;
    const cx = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - rect.left;
    const cy = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - rect.top;
    const nx = cx / cSize.w, ny = cy / cSize.h;

    let best = null, bestD = 40; // px threshold
    for (const b of bunkers) {
      const dx = (b.x - nx) * cSize.w, dy = (b.y - ny) * cSize.h;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = b; }
    }

    if (mode === 'types') {
      if (best) setEditId(editId === best.id ? null : best.id);
      return;
    }

    if (best) {
      setSelBunker(best.id);
      const stance = TYPE_STANCE[best.baType] || 'kneeling';
      queryVis(best.id, null, BARREL_H[stance] || 1.15, best.baType);
    } else {
      setSelBunker(null);
    }
  }, [mode, bunkers, cSize, queryVis, editId]);

  // Update type
  const setType = useCallback((id, t) => {
    setBunkers(prev => prev.map(b => b.id === id ? { ...b, baType: t, heightM: TYPE_H[t] || 1.2 } : b));
    setEditId(null);
  }, []);

  // Selected bunker info
  const selInfo = useMemo(() => {
    if (!selBunker) return null;
    const b = bunkers.find(bk => bk.id === selBunker);
    if (!b) return null;
    const st = TYPE_STANCE[b.baType] || 'kneeling';
    return { name: b.name, type: b.baType, typeLabel: TYPE_LABELS[b.baType] || b.baType, h: b.heightM, stance: st };
  }, [selBunker, bunkers]);

  // Visibility stats
  const visStats = useMemo(() => {
    if (!visData) return null;
    const total = visData.safe.length;
    const direct = visData.safe.filter(v => v > .01).length;
    const riskyN = visData.risky.filter(v => v > .01).length;
    return { total, direct, risky: riskyN, covered: direct + riskyN, pct: Math.round((direct + riskyN) / total * 100) };
  }, [visData]);

  if (loading) return <div style={{ background: COLORS.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ fontFamily: FONT, color: COLORS.accent }}>⏳ Ładowanie...</span>
  </div>;

  if (!layout) return <div style={{ background: COLORS.bg, minHeight: '100vh', padding: 20 }}>
    <Header breadcrumbs={[{ label: 'Layouts', path: '/layouts' }, 'Not found']} />
    <div style={{ fontFamily: FONT, color: COLORS.textDim, textAlign: 'center', marginTop: 40 }}>
      Layout nie znaleziony
    </div>
  </div>;

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh' }}>
      <Header breadcrumbs={[{ label: 'Layouts', path: '/layouts' }, `⚡ ${layout.name}`]} />

      {/* Toolbar */}
      <div style={{ padding: `4px ${R.layout.padding}px`, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap' }}>
        <Btn variant={mode === 'vis' ? 'accent' : 'default'} size="sm" onClick={() => setMode('vis')}
          style={{ fontSize: R.font.sm }}>👁 Widoczność</Btn>
        <Btn variant={mode === 'types' ? 'accent' : 'default'} size="sm" onClick={() => setMode('types')}
          style={{ fontSize: R.font.sm }}>✎ Typy</Btn>
        <div style={{ flex: 1 }} />
        <Btn variant={showHeat ? 'accent' : 'default'} size="sm" onClick={() => setShowHeat(!showHeat)}
          style={{ padding: '0 8px', minWidth: 32 }}>🔥</Btn>
        <Btn variant={showLabels ? 'accent' : 'default'} size="sm" onClick={() => setShowLabels(!showLabels)}
          style={{ padding: '0 8px', minWidth: 32 }}>🏷️</Btn>
      </div>

      {/* Progress */}
      {progress && (
        <div style={{ padding: `2px ${R.layout.padding}px`, fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>
          ⏳ {progress.phase === 'vis' ? 'Obliczanie widoczności' : 'Inicjalizacja'}... {progress.pct || 0}%
          <div style={{ height: 2, background: COLORS.border, borderRadius: 1, marginTop: 2 }}>
            <div style={{ height: 2, background: COLORS.accent, borderRadius: 1, width: `${progress.pct || 0}%`, transition: 'width .2s' }} />
          </div>
        </div>
      )}

      {/* Canvas stack */}
      <div ref={containerRef} style={{ width: '100%', position: 'relative', padding: `0 ${R.layout.padding}px` }}>
        <canvas ref={canvasRef} style={{
          width: cSize.w, height: cSize.h, borderRadius: 10, display: 'block',
          border: `1px solid ${COLORS.border}`,
        }} />
        <canvas ref={overlayRef}
          onClick={handleTap} onTouchEnd={handleTap}
          style={{
            position: 'absolute', top: 0, left: R.layout.padding,
            width: cSize.w, height: cSize.h, borderRadius: 10,
            cursor: mode === 'types' ? 'pointer' : 'crosshair', touchAction: 'manipulation',
          }} />
      </div>

      {/* ── VIS MODE: Selected bunker info ── */}
      {mode === 'vis' && selInfo && (
        <div style={{ margin: `8px ${R.layout.padding}px`, padding: R.layout.cardPad, borderRadius: 10,
          background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT, fontSize: R.font.lg, fontWeight: 700, color: COLORS.accent }}>{selInfo.name}</span>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: R.font.xs, fontFamily: FONT,
              background: COLORS.surfaceLight, color: COLORS.text }}>{selInfo.typeLabel}</span>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: R.font.xs, fontFamily: FONT,
              background: hCol(selInfo.h) + '18', color: hCol(selInfo.h) }}>{selInfo.h.toFixed(2)}m</span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: R.font.xs, color: COLORS.textDim, marginTop: 4 }}>
            Pozycja: {selInfo.stance} · Lufa: {BARREL_H[selInfo.stance]}m
          </div>
          {visStats && (
            <div style={{ fontFamily: FONT, fontSize: R.font.xs, color: COLORS.textDim, marginTop: 2 }}>
              Pokrycie: {visStats.pct}% pola ({visStats.direct} bezpośr. + {visStats.risky} ryzykownych)
            </div>
          )}
          {visData?.isSnake && (
            <div style={{ fontFamily: FONT, fontSize: 10, color: '#3b82f6', marginTop: 4,
              padding: '4px 8px', borderRadius: 4, background: '#3b82f620' }}>
              🐍 Snake: zielony/czerwony = strzał na boki (bezpieczny, leżąc) · niebieski = do przodu (sit-up, ryzykowny)
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>
            <span>🟢 niska celność</span><span>🔴 wysoka celność</span><span>🔵 ryzykowny (wychył/łuk)</span>
          </div>
        </div>
      )}

      {mode === 'vis' && !selInfo && bunkers.length > 0 && (
        <div style={{ margin: `8px ${R.layout.padding}px`, padding: R.layout.cardPad, borderRadius: 10,
          background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontFamily: FONT, fontSize: R.font.sm, color: COLORS.textDim, textAlign: 'center' }}>
            👆 Kliknij bunkier aby zobaczyć jego zasięg strzału
          </div>
        </div>
      )}

      {bunkers.length === 0 && (
        <div style={{ margin: `8px ${R.layout.padding}px`, padding: '20px', borderRadius: 10,
          background: COLORS.surface, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
          <div style={{ fontFamily: FONT, fontSize: R.font.base, color: COLORS.textDim }}>
            Brak bunkrów na tym layoucie
          </div>
          <div style={{ fontFamily: FONT, fontSize: R.font.xs, color: COLORS.textMuted, marginTop: 4 }}>
            Wróć do Layouts → otwórz annotacje → dodaj bunkry
          </div>
        </div>
      )}

      {/* ── TYPES MODE ── */}
      {mode === 'types' && bunkers.length > 0 && (
        <div style={{ margin: `8px ${R.layout.padding}px`, padding: R.layout.cardPad, borderRadius: 10,
          background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontFamily: FONT, fontSize: R.font.sm, color: COLORS.text, fontWeight: 700, marginBottom: 6 }}>
            ✎ Typy bunkrów ({bunkers.length})
          </div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>
            Typ → wysokość → pozycja strzelecka. Kliknij na mapie lub z listy.
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {bunkers.map(b => (
              <div key={b.id} onClick={() => setEditId(editId === b.id ? null : b.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                  borderRadius: 6, cursor: 'pointer',
                  background: editId === b.id ? COLORS.surfaceHover : 'transparent' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: hCol(b.heightM), flexShrink: 0 }} />
                <span style={{ fontFamily: FONT, fontSize: R.font.sm, color: '#facc15', flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, flexShrink: 0 }}>
                  {b.baType} · {b.heightM.toFixed(2)}m
                </span>
              </div>
            ))}
          </div>

          {editId && (
            <div style={{ marginTop: 8, padding: 8, borderRadius: 8,
              background: COLORS.surfaceLight, border: `1px solid ${COLORS.accent}40` }}>
              <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.accent, marginBottom: 6 }}>
                Typ: {bunkers.find(b => b.id === editId)?.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {TYPE_ABBREV.map(t => {
                  const cur = bunkers.find(b => b.id === editId)?.baType;
                  return (
                    <button key={t} onClick={() => setType(editId, t)}
                      style={{ padding: '5px 8px', borderRadius: 4, border: `1px solid ${COLORS.border}`,
                        background: cur === t ? COLORS.accent + '30' : COLORS.surface,
                        color: cur === t ? COLORS.accent : COLORS.text,
                        fontFamily: FONT, fontSize: 11, cursor: 'pointer', lineHeight: 1.2 }}>
                      <strong>{t}</strong>
                      <span style={{ fontSize: 9, color: COLORS.textDim, marginLeft: 3 }}>
                        {TYPE_H[t]?.toFixed(1)}m
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      <div style={{ padding: `4px ${R.layout.padding}px 12px`, fontFamily: FONT, fontSize: 10,
        color: error ? COLORS.danger : COLORS.textMuted, textAlign: 'right' }}>
        {error ? `❌ ${error}` : `Worker: ${isReady ? '✅' : '⏳'} · ${bunkers.length} bunkrów`}
      </div>
    </div>
  );
}
