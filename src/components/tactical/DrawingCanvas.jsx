// DrawingCanvas — player-driven tactical drawing engine (STAGE 1, additive).
//
// Ported faithfully from the CD prototype (prototype/tactical-canvas.jsx). Place a
// PLAYER → an ENTRY line auto-draws from the calibration base to the player,
// editable (drag player + waypoint). Click a player → shot menu (toward / into
// zone / into point / bounce). Bounce = target + draggable ricochet marker + a
// small shot spread. Toolbar = Gracz · Rysunek · Notatka. Layers / Edit /
// Fullscreen float. Phase axis below.
//
// SELF-CONTAINED by design: renders the field IMAGE as background + its own SVG
// (lines) and HTML (%-positioned nodes) layers. It does NOT import or modify the
// shared frozen canvas stack (BaseCanvas / InteractiveCanvas / DrawingOverlay /
// drawStrokes / DrawToolbar) — so live-scout capture (MatchPage) and the coach
// summary (ScoutedTeamPage) are untouched. Props:
//   fieldImage : url of the layout field image (background)
//   base       : { x, y } calibration base A in 0..1 (default ~0.05,0.5)
//   seed       : initial elements[]
//   onSave     : (elements) => void  — called on ✓ Zapisz
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Layers, Pencil, Maximize2, Minimize2 } from 'lucide-react';
import { COLORS, FONT, ELEV } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

const DRAW_COLORS = ['#f59e0b', '#ef4444', '#22c55e', '#38bdf8', '#a855f7', '#ffffff', '#f472b6'];

// Per-player slot colors — match the scout field (drawPlayers.js): red/blue/green/purple/orange.
const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316'];

const TYPES = {
  player: { pl: 'Gracz',   en: 'Player', color: COLORS.accent },
  entry:  { pl: 'Wejście', en: 'Entry',  color: '#38bdf8' },
  shot:   { pl: 'Strzał',  en: 'Shot',   color: '#ef4444' },
  bounce: { pl: 'Bounce',  en: 'Bounce', color: '#a855f7' },
  stroke: { pl: 'Rysunek', en: 'Draw',   color: '#f59e0b' },
  pin:    { pl: 'Notatka', en: 'Note',   color: '#22c55e' },
};
const PHASES = [['breakout', 'Breakout'], ['mid', 'Mid'], ['endgame', 'Endgame']];
const clamp = (v) => Math.max(0, Math.min(100, v));

// glass floating control (replaces prototype FIELD3F.FieldFloatTool)
function FloatBtn({ active, title, onClick, children }) {
  return (
    <div role="button" aria-label={title} title={title} onClick={onClick}
      style={{
        width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', background: active ? COLORS.accent : 'rgba(15,23,42,.85)',
        color: active ? '#0a0e17' : COLORS.text, border: `1px solid ${active ? COLORS.accent : ELEV.hairlineStrong}`,
        backdropFilter: 'blur(8px)', WebkitTapHighlightColor: 'transparent', boxShadow: ELEV.shadow1,
      }}>
      {children}
    </div>
  );
}

function PointAxis({ phase, setPhase }) {
  const { lang } = useLanguage();
  const tx = (pl, en) => (lang === 'en' ? en : pl);
  const idx = Math.max(0, PHASES.findIndex((p) => p[0] === phase));
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (idx >= PHASES.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setPhase(PHASES[idx + 1][0]), 900);
    return () => clearTimeout(t);
  }, [playing, idx]); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = (idx / (PHASES.length - 1)) * 100;
  return (
    <div style={{ flexShrink: 0, padding: '10px 18px 12px', borderTop: `1px solid ${ELEV.hairline}`, background: ELEV.sunken }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: FONT, fontSize: 9.5, fontWeight: 800, letterSpacing: '1.3px', color: COLORS.textMuted }}>{tx('OŚ PUNKTU', 'POINT TIMELINE')}</span>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted }}>{PHASES[idx][1]}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div onClick={() => (idx >= PHASES.length - 1 ? (setPhase(PHASES[0][0]), setPlaying(true)) : setPlaying((p) => !p))}
          style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: COLORS.accent, color: '#0a0e17', fontSize: 13 }}>{playing ? '❚❚' : '▶'}</div>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
          <div style={{ height: 5, width: '100%', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: `1px solid ${ELEV.hairline}`, overflow: 'hidden' }}><div style={{ width: pos + '%', height: '100%', background: COLORS.accent }} /></div>
          {PHASES.map((p, i) => { const pp = (i / (PHASES.length - 1)) * 100; const on = i === idx; return <div key={p[0]} onClick={() => setPhase(p[0])} style={{ position: 'absolute', left: pp + '%', top: '50%', transform: 'translate(-50%,-50%)', width: on ? 14 : 11, height: on ? 14 : 11, borderRadius: '50%', background: i <= idx ? COLORS.accent : ELEV.surface, border: `2px solid ${on ? '#fff' : (i <= idx ? COLORS.accent : ELEV.hairlineStrong)}`, cursor: 'pointer' }} />; })}
        </div>
      </div>
      <div style={{ position: 'relative', height: 14, marginTop: 4 }}>
        {PHASES.map((p, i) => { const pp = (i / (PHASES.length - 1)) * 100; return <span key={p[0]} onClick={() => setPhase(p[0])} style={{ position: 'absolute', left: pp + '%', transform: i === 0 ? 'none' : i === PHASES.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)', fontFamily: FONT, fontSize: 10.5, fontWeight: i === idx ? 800 : 700, color: i === idx ? COLORS.accent : COLORS.textMuted, whiteSpace: 'nowrap', cursor: 'pointer' }}>{p[1]}</span>; })}
      </div>
    </div>
  );
}

function ToolIcon({ k, c, size = 18 }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (k === 'player') return <svg {...s}><circle cx="12" cy="12" r="8" /><path d="M9 12h6" /></svg>;
  if (k === 'stroke') return <svg {...s}><path d="M4 20l3-1L18 8l-2-2L7 17z" /><path d="M14 6l2-2 2 2-2 2" /></svg>;
  if (k === 'pin') return <svg {...s}><path d="M5 4h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>;
  if (k === 'entry') return <svg {...s}><path d="M4 19c6 1 8-8 15-9" /><path d="M15 6l4 4-5 1" /></svg>;
  if (k === 'shot') return <svg {...s}><circle cx="12" cy="12" r="7" strokeDasharray="3 2.5" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>;
  if (k === 'bounce') return <svg {...s}><path d="M3 13l6-6 4 4 5-7" /><path d="M14 4l4 0 0 4" /></svg>;
  return null;
}

export default function DrawingCanvas({ fieldImage, base = { x: 0.05, y: 0.5 }, seed = [], onSave, fieldSide = 'left', doritoSide = 'top' }) {
  const { lang } = useLanguage();
  const tx = (pl, en) => (lang === 'en' ? en : pl);
  const BASE = { x: base.x * 100, y: base.y * 100 }; // engine works in %-space (0..100)

  const [els, setEls] = useState(() => seed.map((e) => ({ ...e })));
  const [tool, setTool] = useState('player');
  const [drawOpen, setDrawOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [shotMode, setShotMode] = useState(null); // {playerId, kind:'precision'|'bounce'} — tap target
  const [color, setColor] = useState('#f59e0b');
  const [vis, setVis] = useState(() => Object.fromEntries(Object.keys(TYPES).map((k) => [k, true])));
  const [layersOpen, setLayersOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [editing, setEditing] = useState(false);
  const [phase, setPhase] = useState('breakout');
  const [drag, setDrag] = useState(null);
  const [stroke, setStroke] = useState(null);
  const boxRef = useRef(null);
  const TOOLS = ['player', 'stroke', 'pin'];

  const at = (e) => { const r = boxRef.current.getBoundingClientRect(); return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) }; };
  const nid = () => 'e' + Date.now() + Math.round(Math.random() * 999);
  const upd = (id, patch) => setEls((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const del = (id) => { setEls((es) => es.filter((e) => e.id !== id && e.playerId !== id)); setSel(null); };
  const playerColor = (pl) => { const i = els.filter((e) => e.type === 'player').indexOf(pl); return PLAYER_COLORS[i % PLAYER_COLORS.length] || COLORS.accent; };

  const placeTap = (p) => {
    if (shotMode) { // precision shot or bounce — tap the target
      const pl = els.find((e) => e.id === shotMode.playerId); if (!pl) { setShotMode(null); return; }
      const from = { x: pl.x, y: pl.y };
      if (shotMode.kind === 'bounce') {
        setEls((es) => [...es, { id: nid(), type: 'bounce', playerId: pl.id, from, via: { x: (from.x + p.x) / 2, y: (from.y + p.y) / 2 }, to: p, color: TYPES.bounce.color, phase, time: null }]);
      } else { // precision — line from player to the tapped point + crosshair marker
        setEls((es) => [...es, { id: nid(), type: 'shot', kind: 'precision', playerId: pl.id, from, to: p, color: playerColor(pl), phase, time: null }]);
      }
      setShotMode(null); return;
    }
    if (tool === 'player') { setEls((es) => { if (es.filter((e) => e.type === 'player').length >= 5) return es; const id = nid(); return [...es, { id, type: 'player', x: p.x, y: p.y, phase }, { id: nid(), type: 'entry', playerId: id, base: { ...BASE }, mid: { x: (BASE.x + p.x) / 2, y: (BASE.y + p.y) / 2 }, to: { x: p.x, y: p.y }, color: TYPES.entry.color, phase }]; }); return; }
    if (tool === 'pin') { setEls((es) => [...es, { id: nid(), type: 'pin', x: p.x, y: p.y, color: TYPES.pin.color, name: '', phase }]); return; }
  };

  const onDown = (e) => { setLayersOpen(false); if (!editing || drag) return; if (tool === 'stroke') { const p = at(e); setStroke({ color, d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`, pts: [p] }); } };
  const onMove = (e) => {
    if (!editing) return;
    if (drag) { const p = at(e); setEls((es) => { const t = es.find((x) => x.id === drag.id); const movePlayer = t && t.type === 'player' && !drag.ptKey; return es.map((x) => {
      if (x.id === drag.id) return drag.ptKey ? { ...x, [drag.ptKey]: p } : { ...x, x: p.x, y: p.y };
      if (movePlayer && x.playerId === drag.id) return x.type === 'entry' ? { ...x, to: p } : { ...x, from: p };
      return x;
    }); }); return; }
    if (stroke) { const p = at(e); setStroke((s) => ({ ...s, pts: [...s.pts, p], d: s.d + ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}` })); }
  };
  const onUp = (e) => {
    if (!editing) return;
    if (drag) { setDrag(null); return; }
    if (stroke) { if (stroke.pts.length > 1) setEls((es) => [...es, { id: nid(), type: 'stroke', color: stroke.color, d: stroke.d, phase }]); setStroke(null); return; }
    if (tool !== 'stroke' || shotMode) { setSel(null); placeTap(at(e)); }
  };
  const startDrag = (e, id, ptKey) => { if (!editing) return; e.stopPropagation(); setSel(id); setShotMode(null); setDrag({ id, ptKey }); };

  const goFull = () => { setFull(true); const el = boxRef.current && boxRef.current.closest('[data-canvas-root]'); if (el && el.requestFullscreen) el.requestFullscreen().then(() => { try { screen.orientation.lock('landscape'); } catch (x) { /* best-effort */ } }).catch(() => {}); };
  const exitFull = () => { setFull(false); setEditing(false); setDrawOpen(false); setShotMode(null); try { if (document.fullscreenElement) document.exitFullscreen(); screen.orientation.unlock(); } catch (x) { /* best-effort */ } };
  const enterEdit = () => { const n = !editing; setEditing(n); setDrawOpen(n); setTool('player'); setShotMode(null); if (n && !full) goFull(); };
  const save = () => { onSave?.(els); exitFull(); };

  const pt = (p) => ({ left: p.x + '%', top: p.y + '%' });
  const midp = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const ang = (a, b) => (Math.atan2((b.y - a.y) * 900, (b.x - a.x) * 1340) * 180) / Math.PI;
  const Arrow = ({ from, to, c }) => <div style={{ position: 'absolute', ...pt(to), transform: `translate(-50%,-50%) rotate(${ang(from, to)}deg)`, width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `10px solid ${c}`, zIndex: 4, pointerEvents: 'none' }} />;
  const Handle = ({ p, id, ptKey, c }) => <div onPointerDown={(e) => startDrag(e, id, ptKey)} style={{ position: 'absolute', ...pt(p), width: 13, height: 13, marginLeft: -6.5, marginTop: -6.5, borderRadius: '50%', background: '#0b0e14', border: `2.5px solid ${c}`, cursor: 'grab', zIndex: 6, boxShadow: sel === id ? `0 0 0 3px ${c}66` : 'none' }} />;

  const inPhase = (e) => e.phase == null || e.phase === phase;
  const V = els.filter((e) => vis[e.type] && inPhase(e));
  const players = els.filter((e) => e.type === 'player');
  const selEl = els.find((e) => e.id === sel);
  const spread = (via, to) => { const dx = to.x - via.x, dy = to.y - via.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, r = 2.4; return [-1, 0, 1].map((k) => ({ x: to.x + nx * r * k, y: to.y + ny * r * k })); };
  const stop = { onPointerDown: (e) => e.stopPropagation(), onPointerUp: (e) => e.stopPropagation() };

  const inner = (
    <div data-canvas-root style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: full ? '#05080f' : 'transparent' }}>
      <style>{`@keyframes tacflow{to{stroke-dashoffset:-20}}.tac-shot{animation:tacflow 1s linear infinite}.tac-entry{animation:tacflow 1.5s linear infinite}@media(prefers-reduced-motion:reduce){.tac-shot,.tac-entry{animation:none}}`}</style>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', padding: full ? 16 : 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div ref={boxRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={(e) => { if (stroke || drag) onUp(e); }}
          style={{ position: 'relative', height: '100%', aspectRatio: '1340 / 900', maxWidth: '100%', maxHeight: '100%', borderRadius: 14, overflow: 'hidden', border: `1px solid ${ELEV.hairlineStrong}`, touchAction: 'none', cursor: editing ? 'crosshair' : 'default', background: ELEV.sunken }}>
          {fieldImage && <img src={fieldImage} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />}
          {/* lines (svg) */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {V.filter((e) => e.type === 'stroke').map((e) => <path key={e.id} d={e.d} fill="none" stroke={e.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={sel && sel !== e.id ? 0.55 : 1} />)}
            {stroke && <path d={stroke.d} fill="none" stroke={stroke.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
            {V.filter((e) => e.type === 'entry').map((e) => { const pts = e.mid ? [e.base, e.mid, e.to] : [e.base, e.to]; const d = pts.map((q, i) => (i ? 'L' : 'M') + q.x + ' ' + q.y).join(' '); return <path key={e.id} className="tac-entry" d={d} fill="none" stroke={e.color} strokeWidth={sel === e.id ? 3.6 : 3} strokeDasharray="0.4 3.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={sel && sel !== e.id ? 0.55 : 1} />; })}
            {V.filter((e) => e.type === 'shot').map((e) => <line key={e.id} className="tac-shot" x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke={e.color} strokeWidth={sel === e.id ? 3 : 2.2} strokeDasharray="4 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={sel && sel !== e.id ? 0.55 : 1} />)}
            {V.filter((e) => e.type === 'bounce').map((e) => <g key={e.id} opacity={sel && sel !== e.id ? 0.55 : 1}><line className="tac-shot" x1={e.from.x} y1={e.from.y} x2={e.via.x} y2={e.via.y} stroke={e.color} strokeWidth="2.2" strokeDasharray="4 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />{spread(e.via, e.to).map((tp, i) => <line key={i} className="tac-shot" x1={e.via.x} y1={e.via.y} x2={tp.x} y2={tp.y} stroke={e.color} strokeWidth="1.8" strokeDasharray="3 2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}</g>)}
          </svg>
          {/* arrowheads + handles + nodes (html) */}
          {V.filter((e) => e.type === 'entry').map((e) => <React.Fragment key={e.id}><Arrow from={e.mid || e.base} to={e.to} c={e.color} />{editing && <Handle p={e.base} id={e.id} ptKey="base" c={e.color} />}{editing && e.mid && <Handle p={e.mid} id={e.id} ptKey="mid" c={e.color} />}</React.Fragment>)}
          {/* precision shot — crosshair at the target (scouting precision-shot symbol) + drag handle */}
          {V.filter((e) => e.type === 'shot').map((e) => (
            <React.Fragment key={e.id}>
              <div style={{ position: 'absolute', ...pt(e.to), transform: 'translate(-50%,-50%)', zIndex: 5, pointerEvents: 'none' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={e.color} strokeWidth="2">
                  <circle cx="11" cy="11" r="6" />
                  <circle cx="11" cy="11" r="1.6" fill={e.color} stroke="none" />
                  <path d="M11 1.5v4M11 16.5v4M1.5 11h4M16.5 11h4" strokeLinecap="round" />
                </svg>
              </div>
              {editing && <Handle p={e.to} id={e.id} ptKey="to" c={e.color} />}
            </React.Fragment>
          ))}
          {V.filter((e) => e.type === 'bounce').map((e) => <React.Fragment key={e.id}>{spread(e.via, e.to).map((tp, i) => <Arrow key={i} from={e.via} to={tp} c={e.color} />)}{editing && <div onPointerDown={(ev) => startDrag(ev, e.id, 'via')} style={{ position: 'absolute', ...pt(e.via), width: 24, height: 24, marginLeft: -12, marginTop: -12, transform: 'rotate(45deg)', background: '#0b0e14', border: `3px solid ${e.color}`, boxShadow: sel === e.id ? `0 0 0 3px ${e.color}66` : `0 2px 8px rgba(0,0,0,.5)`, cursor: 'grab', zIndex: 6 }} />}{editing && <Handle p={e.to} id={e.id} ptKey="to" c={e.color} />}</React.Fragment>)}
          {V.filter((e) => e.type === 'pin').map((e) => <div key={e.id} onPointerDown={(ev) => startDrag(ev, e.id, null)} style={{ position: 'absolute', ...pt(e), transform: 'translate(-50%,-100%)', zIndex: 5, cursor: editing ? 'grab' : 'default' }}><svg width="30" height="26" viewBox="0 0 28 24" fill={e.color} stroke="#0b0e14" strokeWidth="1.5"><path d="M4 2h20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-7l-3 4-3-4H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /><g fill="#0b0e14" stroke="none"><circle cx="10" cy="9.5" r="1.4" /><circle cx="14" cy="9.5" r="1.4" /><circle cx="18" cy="9.5" r="1.4" /></g></svg></div>)}
          {V.filter((e) => e.type === 'player').map((e) => { const n = players.indexOf(e) + 1; const c = playerColor(e); return <div key={e.id} onPointerDown={(ev) => startDrag(ev, e.id, null)} onClick={(ev) => { if (!editing) return; ev.stopPropagation(); setSel(e.id); setShotMode(null); }} style={{ position: 'absolute', ...pt(e), transform: 'translate(-50%,-50%)', width: 30, height: 30, borderRadius: '50%', background: c, border: '2px solid #0a0e17', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 14, fontWeight: 900, cursor: editing ? 'grab' : 'default', boxShadow: sel === e.id ? `0 0 0 3px ${c}66` : ELEV.shadow1, zIndex: 7 }}>{n}</div>; })}

          {/* floating: layers (top-left) */}
          <div {...stop} style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {editing && <FloatBtn title={tx('Wstecz', 'Back')} onClick={exitFull}><ChevronLeft size={18} /></FloatBtn>}
            <FloatBtn active={layersOpen} title={tx('Warstwy', 'Layers')} onClick={() => setLayersOpen((o) => !o)}><Layers size={17} /></FloatBtn>
            {layersOpen && (
              <div {...stop} style={{ marginTop: 8, width: 190, background: ELEV.raised, border: `1px solid ${ELEV.hairlineStrong}`, borderRadius: 12, boxShadow: ELEV.shadow2, padding: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 8px' }}><span style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: 800, letterSpacing: '.6px', color: COLORS.textMuted }}>{tx('WARSTWY', 'LAYERS')}</span><span onClick={() => setVis(Object.fromEntries(Object.keys(TYPES).map((k) => [k, true])))} style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.accent, cursor: 'pointer' }}>{tx('Wszystko', 'All')}</span></div>
                {Object.keys(TYPES).filter((k) => els.some((e) => e.type === k)).map((k) => { const on = vis[k]; const c = els.filter((e) => e.type === k).length; return (<div key={k} onClick={() => setVis((v) => ({ ...v, [k]: !v[k] }))} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 6px', borderRadius: 8, cursor: 'pointer' }}><span style={{ width: 18, display: 'flex', justifyContent: 'center' }}><ToolIcon k={k} c={TYPES[k].color} size={15} /></span><span style={{ flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: on ? COLORS.text : COLORS.textMuted }}>{tx(TYPES[k].pl, TYPES[k].en)}</span><span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>{c}</span><span style={{ fontSize: 15, color: on ? COLORS.accent : COLORS.textMuted }}>{on ? '◉' : '○'}</span></div>); })}
              </div>
            )}
          </div>
          {/* floating: fullscreen + edit (top-right) */}
          <div {...stop} style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, display: 'flex', gap: 8 }}>
            <FloatBtn active={full} title={tx('Pełny ekran', 'Fullscreen')} onClick={full ? exitFull : goFull}>{full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</FloatBtn>
            <FloatBtn active={editing} title={tx('Edytuj', 'Edit')} onClick={enterEdit}><Pencil size={16} /></FloatBtn>
          </div>
          {/* drawing toolbar (top-center, tablet) */}
          {editing && drawOpen && (
            <div {...stop} style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 22, display: 'flex', alignItems: 'center', gap: 3, background: ELEV.raised, border: `1px solid ${ELEV.hairlineStrong}`, borderRadius: 14, boxShadow: ELEV.shadow2, padding: 6 }}>
              {TOOLS.map((k) => { const on = tool === k && !shotMode; const m = TYPES[k]; return (
                <div key={k} onClick={() => { setTool(k); setShotMode(null); if (k === 'stroke') setColor(TYPES.stroke.color); }} title={tx(m.pl, m.en)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 54, padding: '7px 4px', borderRadius: 10, cursor: 'pointer', background: on ? m.color + '26' : 'transparent' }}>
                  <ToolIcon k={k} c={on ? m.color : COLORS.textDim} size={18} />
                  <span style={{ fontFamily: FONT, fontSize: 9.5, fontWeight: on ? 800 : 600, color: on ? COLORS.text : COLORS.textMuted }}>{tx(m.pl, m.en)}</span>
                </div>
              ); })}
              {tool === 'stroke' && <><span style={{ width: 1, height: 34, background: ELEV.hairline, margin: '0 5px' }} /><div style={{ display: 'flex', gap: 5, padding: '0 4px' }}>{DRAW_COLORS.slice(0, 7).map((c) => <div key={c} onClick={() => setColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '2px solid #fff' : '2px solid transparent' }} />)}</div></>}
            </div>
          )}
          {/* shot-mode hint */}
          {shotMode && <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 22, background: TYPES.shot.color, color: '#0a0e17', borderRadius: 999, padding: '8px 16px', fontFamily: FONT, fontSize: 13, fontWeight: 800 }}>{tx('Stuknij cel', 'Tap target')}</div>}

          {/* PLAYER shot menu */}
          {editing && selEl && selEl.type === 'player' && (
            <div {...stop} style={{ position: 'absolute', left: `min(${selEl.x}%, calc(100% - 200px))`, top: `min(calc(${selEl.y}% + 12px), calc(100% - 210px))`, width: 190, background: ELEV.raised, border: `1px solid ${ELEV.hairlineStrong}`, borderRadius: 12, boxShadow: ELEV.shadow2, padding: 10, zIndex: 25 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><span style={{ width: 20, height: 20, borderRadius: '50%', background: TYPES.player.color, color: '#0a0e17', fontFamily: FONT, fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{players.indexOf(selEl) + 1}</span><span style={{ flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: COLORS.text }}>{tx('Strzał', 'Shot')}</span><span onClick={() => del(selEl.id)} style={{ fontSize: 15, color: COLORS.danger, cursor: 'pointer' }}>🗑</span></div>
              {/* B8 — [Strzał (precyzyjny, tap w cel)] + [Bounce] */}
              <div onClick={() => { setShotMode({ playerId: selEl.id, kind: 'precision' }); setSel(null); }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px', borderRadius: 8, cursor: 'pointer', background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, marginBottom: 5 }}>
                <ToolIcon k="shot" c={TYPES.shot.color} size={15} /><span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{tx('Strzał', 'Shot')}</span>
              </div>
              <div onClick={() => { setShotMode({ playerId: selEl.id, kind: 'bounce' }); setSel(null); }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px', borderRadius: 8, cursor: 'pointer', background: ELEV.surface, border: `1px solid ${ELEV.hairline}` }}>
                <ToolIcon k="bounce" c={TYPES.bounce.color} size={15} /><span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>Bounce</span>
              </div>
            </div>
          )}
          {/* element inspector (shot/entry/bounce/pin) */}
          {editing && selEl && selEl.type !== 'player' && (() => { const a = selEl.to || selEl.via || selEl; return (
            <div {...stop} style={{ position: 'absolute', left: `min(${a.x}%, calc(100% - 210px))`, top: `min(calc(${a.y}% + 10px), calc(100% - 150px))`, width: 200, background: ELEV.raised, border: `1px solid ${ELEV.hairlineStrong}`, borderRadius: 12, boxShadow: ELEV.shadow2, padding: 12, zIndex: 25 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><ToolIcon k={selEl.type} c={selEl.color} size={15} /><span style={{ flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: 800, color: COLORS.text }}>{tx(TYPES[selEl.type].pl, TYPES[selEl.type].en)}</span><span onClick={() => del(selEl.id)} style={{ fontSize: 15, color: COLORS.danger, cursor: 'pointer' }}>🗑</span></div>
              {selEl.type === 'pin' && <input value={selEl.name || ''} onChange={(e) => upd(selEl.id, { name: e.target.value })} placeholder={tx('Szczegół…', 'Detail…')} style={{ width: '100%', boxSizing: 'border-box', background: ELEV.sunken, border: `1px solid ${ELEV.hairlineStrong}`, borderRadius: 8, padding: '7px 9px', color: COLORS.text, fontFamily: FONT, fontSize: 13, outline: 'none', marginBottom: 8 }} />}
              {(selEl.type === 'shot' || selEl.type === 'bounce') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, flex: 1 }}>{tx('Czas', 'Time')}</span>
                  <div onClick={() => upd(selEl.id, { time: Math.max(0, (selEl.time || 0) - 1) || null })} style={{ width: 26, height: 26, borderRadius: 7, background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textDim, cursor: 'pointer' }}>−</div>
                  <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.text, minWidth: 34, textAlign: 'center' }}>{selEl.time ? selEl.time + 's' : '—'}</span>
                  <div onClick={() => upd(selEl.id, { time: (selEl.time || 0) + 1 })} style={{ width: 26, height: 26, borderRadius: 7, background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textDim, cursor: 'pointer' }}>+</div>
                </div>
              )}
              {selEl.type === 'entry' && <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>{tx('Przeciągnij węzły, by zmienić kształt wejścia.', 'Drag nodes to reshape the entry.')}</span>}
            </div>
          ); })()}
          {editing && <div {...stop} onClick={save} style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 23, background: COLORS.accent, color: '#0a0e17', borderRadius: 11, padding: '9px 16px', cursor: 'pointer', fontFamily: FONT, fontSize: 13.5, fontWeight: 800 }}>✓ {tx('Zapisz', 'Save')}</div>}
        </div>
      </div>
      <PointAxis phase={phase} setPhase={setPhase} />
    </div>
  );
  if (full) return <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: '#05080f' }}>{inner}</div>;
  return inner;
}

export { TYPES as TACTICAL_TYPES };
