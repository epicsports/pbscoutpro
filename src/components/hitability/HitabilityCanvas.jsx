import React, { useRef, useEffect, useState, useCallback } from 'react';
import { COLORS } from '../../utils/theme';

/**
 * HitabilityCanvas — § Hitability config/tracking field (STAGE 1: config render
 * + gestures). Built to the validated prototype (outputs/killability_prototype.html):
 * field image background + player/target markers + connecting lines, with bespoke
 * pointer handling (tap-vs-drag, add-by-side, collect-all-hits for disambiguation).
 *
 * Coords are NORMALISED 0–1 (app convention) — the canvas matches the field
 * aspect ratio so 0–1 maps directly to the canvas with no letterboxing.
 *
 * Reuses the app's marker/line idioms (drawPlayers-style) + COLORS palette; does
 * NOT route through the scouting touchHandler (its first-hit-only hit-test +
 * placement pipeline don't fit the link/disambiguation model — Opus STAGE 0).
 *
 * Controlled component: parent owns config state + persistence + the disambiguation
 * ActionSheet. The canvas emits `onTap(normX, normY, hits)` (hits = all markers/
 * lines under the tap, computed in pixel space) and drag callbacks.
 */

// Pixel hit radii (touch-sized). marker ≈ 44px target; line slightly tighter.
const TAP_R = 22;
const DRAG_R = 18;
const LINE_R = 12;

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  if (!l2) return dist(px, py, ax, ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return dist(px, py, ax + t * dx, ay + t * dy);
}

export default function HitabilityCanvas({
  fieldImage,
  bunkers = [],
  players = [],
  targets = [],
  links = [],
  linking = null,
  mode = 'config',
  hitsByTarget = {},   // { targetId: count } — tracking badge (STAGE 2+)
  playedSet = {},      // { playerId: true } — "grał" ring (STAGE 2+)
  onTap,               // (normX, normY, { players:[ids], targets:[ids], conns:[{t,p}] })
  onDragMarker,        // (kind 'p'|'t', id, normX, normY)
  onDragEnd,           // ()
  maxHeight = 520,
}) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgReady, setImgReady] = useState(false);
  const [aspect, setAspect] = useState(16 / 10);
  const [size, setSize] = useState({ w: 0, h: 0 }); // CSS px
  const down = useRef(null);

  const ownersOf = useCallback(
    (tid) => links.filter(l => l.targetId === tid).map(l => l.playerId),
    [links],
  );
  const playerById = useCallback((id) => players.find(p => p.id === id), [players]);

  // Load field image.
  useEffect(() => {
    if (!fieldImage) { imgRef.current = null; setImgReady(false); return; }
    const img = new Image();
    let alive = true;
    img.onload = () => {
      if (!alive) return;
      imgRef.current = img;
      if (img.naturalWidth && img.naturalHeight) setAspect(img.naturalWidth / img.naturalHeight);
      setImgReady(true);
    };
    img.onerror = () => { if (alive) { imgRef.current = null; setImgReady(false); } };
    img.src = fieldImage;
    return () => { alive = false; };
  }, [fieldImage]);

  // Track CSS size for the drawing buffer (DPR-scaled).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = c.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // Draw.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !size.w || !size.h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== size.w * dpr || c.height !== size.h * dpr) {
      c.width = size.w * dpr; c.height = size.h * dpr;
    }
    const ctx = c.getContext('2d');
    const w = size.w, h = size.h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Field
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.field || '#0a1410'; ctx.fillRect(0, 0, w, h);
    }
    // Centre line (field halves — add-player vs add-target hint)
    ctx.strokeStyle = 'rgba(148,163,184,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke(); ctx.setLineDash([]);

    // Faint bunker anchors (reference)
    ctx.fillStyle = 'rgba(148,163,184,0.20)';
    for (const b of bunkers) {
      if (typeof b?.x !== 'number' || typeof b?.y !== 'number') continue;
      ctx.beginPath(); ctx.arc(b.x * w, b.y * h, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Lines (links)
    for (const l of links) {
      const p = playerById(l.playerId);
      const t = targets.find(x => x.id === l.targetId);
      if (!p || !t) continue;
      ctx.strokeStyle = p.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x * w, p.y * h); ctx.lineTo(t.x * w, t.y * h); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Target markers
    for (const t of targets) {
      const owners = ownersOf(t.id);
      const stroke = owners.length === 1
        ? (playerById(owners[0])?.color || COLORS.textMuted)
        : owners.length > 1 ? '#94a3b8' : '#475569';
      const tx = t.x * w, ty = t.y * h;
      ctx.beginPath(); ctx.arc(tx, ty, 11, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.bg; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2.5;
      ctx.setLineDash(owners.length ? [] : [3, 3]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8'; ctx.font = `9px ${getFont()}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.label, tx, ty + 0.5);
      const cnt = hitsByTarget[t.id] || 0;
      if (cnt > 0) {
        ctx.beginPath(); ctx.arc(tx + 12, ty - 11, 7, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.accent; ctx.fill();
        ctx.fillStyle = COLORS.bg; ctx.font = `bold 9px ${getFont()}`;
        ctx.fillText(String(cnt), tx + 12, ty - 10.5);
      }
    }

    // Player markers
    for (const p of players) {
      const px = p.x * w, py = p.y * h;
      if (linking === p.id) {
        ctx.beginPath(); ctx.arc(px, py, 15, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2; ctx.stroke();
      } else if (playedSet[p.id]) {
        ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold 9px ${getFont()}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.label, px, py + 0.5);
    }
  }, [size, imgReady, players, targets, links, linking, bunkers, hitsByTarget, playedSet, ownersOf, playerById]);

  // ── Pointer handling ──
  const relPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return {
      nx: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      ny: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
      cx: e.clientX, cy: e.clientY, w: r.width, h: r.height,
    };
  };

  const collectHits = (nx, ny, w, h) => {
    const px = nx * w, py = ny * h;
    const ph = players.filter(p => dist(px, py, p.x * w, p.y * h) <= TAP_R).map(p => p.id);
    const th = targets.filter(t => dist(px, py, t.x * w, t.y * h) <= TAP_R).map(t => t.id);
    const ch = [];
    for (const l of links) {
      const p = playerById(l.playerId);
      const t = targets.find(x => x.id === l.targetId);
      if (!p || !t) continue;
      if (segDist(px, py, p.x * w, p.y * h, t.x * w, t.y * h) <= LINE_R) ch.push({ t: l.targetId, p: l.playerId });
    }
    return { players: ph, targets: th, conns: ch };
  };

  const handleDown = (e) => {
    const v = relPos(e);
    down.current = { ...v, moved: false, drag: null };
    if (mode !== 'config') return;
    const px = v.nx * v.w, py = v.ny * v.h;
    const ps = players.filter(p => dist(px, py, p.x * v.w, p.y * v.h) <= DRAG_R);
    const ts = targets.filter(t => dist(px, py, t.x * v.w, t.y * v.h) <= DRAG_R);
    if (ps.length === 1 && ts.length === 0) down.current.drag = { k: 'p', id: ps[0].id };
    else if (ts.length === 1 && ps.length === 0) down.current.drag = { k: 't', id: ts[0].id };
    if (down.current.drag) { try { canvasRef.current.setPointerCapture(e.pointerId); } catch { /* noop */ } }
  };
  const handleMove = (e) => {
    const d = down.current; if (!d) return;
    const v = relPos(e);
    if (Math.hypot(v.cx - d.cx, v.cy - d.cy) > 5) d.moved = true;
    if (d.moved && d.drag && mode === 'config') {
      onDragMarker?.(d.drag.k, d.drag.id, v.nx, v.ny);
    }
  };
  const handleUp = (e) => {
    const d = down.current; down.current = null; if (!d) return;
    if (d.moved) { if (d.drag) onDragEnd?.(); return; }
    const v = relPos(e);
    onTap?.(v.nx, v.ny, collectHits(v.nx, v.ny, v.w, v.h));
  };

  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        style={{
          aspectRatio: String(aspect),
          maxWidth: '100%', maxHeight, width: 'auto', height: 'auto',
          background: COLORS.field || '#0a1410',
          border: `1px solid ${COLORS.border}`, borderRadius: 12,
          touchAction: 'none', display: 'block',
        }}
      />
    </div>
  );
}

function getFont() {
  return "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
}
