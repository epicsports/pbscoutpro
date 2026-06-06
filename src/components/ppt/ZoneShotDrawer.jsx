import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Skull, X } from 'lucide-react';
import { Btn } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { resolveZones } from '../../utils/layoutZones';
import { pointInPolygon, polygonCentroid } from '../../utils/helpers';

/**
 * ZoneShotDrawer — § zone-shot capture (Pattern B), STAGE 1.
 *
 * Maximized drawer (fixed header + fixed Save button, both always visible) for
 * the self-log shot step. Body = the field's RIGHT half — the callout zones are
 * authored on the right side of the layout and this is always a self-log view,
 * so orientation is a fixed `right-half` framing (Jacek 2026-06-06; no per-point
 * derivation). The player taps zones they fired at (pure select on the dense
 * field — NO per-zone controls there, solving the dozen-small-zones problem),
 * and marks a binary `kill` per selected zone on roomy chips below (§27: kill is
 * an interactive control, so it gets a ≥44px target off the cramped field).
 *
 * Writes `shots:[{zoneId, kill}]` (binary kill — no count, one person). The
 * data layer dual-reads this vs legacy {bunker} shots (STAGE 0, §108-adjacent).
 *
 * Right-half normalized→canvas mapping: the right half nx∈[0.5,1] fills the
 * canvas width. fwd: px=(nx-0.5)·2·w ; inv (tap→norm): nx=0.5+(px/w)/2.
 */

const toCanvas = (nx, ny, w, h) => ({ x: (nx - 0.5) * 2 * w, y: ny * h });
const toNorm = (px, py, w, h) => ({ x: 0.5 + (px / w) / 2, y: py / h });

export default function ZoneShotDrawer({ open, layout, fieldImage, initial = [], onSave, onClose }) {
  const { t } = useLanguage();

  // Drawable callout zones (need a polygon to tap/render).
  const zones = useMemo(
    () => resolveZones(layout).filter(z => Array.isArray(z?.polygon) && z.polygon.length >= 3),
    [layout],
  );

  // selection: Map<zoneId, kill:boolean>. Seeded from `initial` on mount — the
  // parent conditionally mounts the drawer (open && <Drawer/>), so a fresh open
  // re-seeds naturally without a reset effect.
  const [sel, setSel] = useState(
    () => new Map((initial || []).filter(s => s?.zoneId).map(s => [s.zoneId, !!s.kill])),
  );

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [img, setImg] = useState(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // ── Field image load ──
  useEffect(() => {
    if (!fieldImage) { setImg(null); return undefined; }
    const im = new Image();
    let cancelled = false;
    im.onload = () => { if (!cancelled) setImg(im); };
    im.src = fieldImage;
    return () => { cancelled = true; };
  }, [fieldImage]);

  // ── Size: width-first within the drawer body; right-half aspect = full/2 ──
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    const compute = () => {
      const cw = node.clientWidth;
      const fullAspect = img && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 2;
      const halfAspect = fullAspect / 2; // right half is (fullW/2) × fullH
      const w = cw;
      const h = w / Math.max(0.2, halfAspect);
      setSize({ w, h });
    };
    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(node);
    return () => obs.disconnect();
  }, [img]);

  // ── Draw: right-half field bg + zone polygons (dimmed default / highlighted
  //    when selected). Selection only — kill lives on the chips below. ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w <= 0) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 2;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // bg — draw the FULL image at 2×width offset left by w, so the right half
    // [w..2w of image] maps to [0..w of canvas]; dim for polygon contrast.
    if (img) {
      ctx.drawImage(img, -size.w, 0, size.w * 2, size.h);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, size.w, size.h);
    } else {
      ctx.fillStyle = COLORS.surface;
      ctx.fillRect(0, 0, size.w, size.h);
    }

    zones.forEach(z => {
      const poly = z.polygon;
      const selected = sel.has(z.id);
      const color = z.color || COLORS.accent;
      ctx.beginPath();
      poly.forEach((p, i) => {
        const c = toCanvas(p.x, p.y, size.w, size.h);
        if (i === 0) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y);
      });
      ctx.closePath();
      ctx.globalAlpha = selected ? 0.42 : 0.12; // dimmed default, brighter when picked
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = selected ? color : `${color}66`;
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.setLineDash(selected ? [] : [6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // name pill at centroid
      const ctr = polygonCentroid(poly);
      if (ctr) {
        const cc = toCanvas(ctr.x, ctr.y, size.w, size.h);
        const label = z.name || '';
        ctx.font = `bold 12px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.beginPath();
        ctx.roundRect(cc.x - tw / 2 - 5, cc.y - 9, tw + 10, 18, 4);
        ctx.fill();
        ctx.fillStyle = selected ? color : '#fff';
        ctx.fillText(label, cc.x, cc.y);
      }
    });
  }, [img, size.w, size.h, zones, sel]);

  const toggleZone = (id) => setSel(prev => {
    const next = new Map(prev);
    if (next.has(id)) next.delete(id); else next.set(id, false);
    return next;
  });
  const toggleKill = (id) => setSel(prev => {
    const next = new Map(prev);
    if (next.has(id)) next.set(id, !next.get(id));
    return next;
  });

  // pointerup = tap (the field doesn't scroll; no drag-vs-tap needed for select).
  const handleTap = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || size.w <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const norm = toNorm(e.clientX - rect.left, e.clientY - rect.top, size.w, size.h);
    for (let i = zones.length - 1; i >= 0; i--) {        // topmost-first
      if (pointInPolygon(norm, zones[i].polygon)) { toggleZone(zones[i].id); return; }
    }
  };

  const selectedList = zones.filter(z => sel.has(z.id));
  const handleSave = () => {
    onSave(selectedList.map(z => ({ zoneId: z.id, kill: !!sel.get(z.id) })));
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: COLORS.bg, display: 'flex', flexDirection: 'column',
    }}>
      {/* Fixed header */}
      <div style={{
        flexShrink: 0, height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: `0 ${SPACE.md}px`,
        background: COLORS.surfaceDark, borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.text }}>
          {t('ppt_zone_drawer_title')}
        </span>
        <div onClick={onClose} role="button" aria-label="Close" style={{
          minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: COLORS.textMuted, WebkitTapHighlightColor: 'transparent',
        }}>
          <X size={22} />
        </div>
      </div>

      {/* Scrollable body — field + chips */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: SPACE.lg,
        display: 'flex', flexDirection: 'column', gap: SPACE.md,
      }}>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500, color: COLORS.textMuted }}>
          {t('ppt_zone_drawer_hint')}
        </div>

        {zones.length === 0 ? (
          <div style={{
            padding: SPACE.xl, textAlign: 'center', fontStyle: 'italic',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          }}>
            {t('ppt_zone_none')}
          </div>
        ) : (
          <>
            <div ref={wrapRef} style={{ width: '100%' }}>
              <canvas
                ref={canvasRef}
                onPointerUp={handleTap}
                style={{
                  display: 'block', margin: '0 auto', borderRadius: RADIUS.md,
                  border: `1px solid ${COLORS.border}`, cursor: 'pointer',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                }}
              />
            </div>

            {selectedList.length > 0 && (
              <>
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textDim,
                }}>
                  {t('ppt_zone_kill_hint')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.sm }}>
                  {selectedList.map(z => {
                    const kill = !!sel.get(z.id);
                    return (
                      <div key={z.id} style={{
                        display: 'flex', alignItems: 'center', gap: SPACE.sm,
                        minHeight: TOUCH.minTarget, paddingLeft: 12,
                        background: COLORS.surfaceLight, borderRadius: RADIUS.lg,
                        border: `1px solid ${kill ? COLORS.danger : (z.color || COLORS.border)}`,
                      }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: 4,
                          background: z.color || COLORS.textMuted, flexShrink: 0,
                        }} />
                        <span style={{
                          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                          color: COLORS.text, whiteSpace: 'nowrap',
                        }}>
                          {z.name}
                        </span>
                        <button
                          onClick={() => toggleKill(z.id)}
                          aria-pressed={kill}
                          aria-label={`kill ${z.name}`}
                          style={{
                            minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            borderRadius: RADIUS.md, WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          <Skull size={20} color={kill ? COLORS.danger : COLORS.textDim}
                            fill={kill ? COLORS.danger : 'none'} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Fixed Save */}
      <div style={{
        flexShrink: 0, padding: SPACE.lg,
        paddingBottom: `calc(${SPACE.lg}px + env(safe-area-inset-bottom, 0px))`,
        borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg,
      }}>
        <Btn variant="accent" onClick={handleSave}
          style={{ width: '100%', minHeight: 56, fontSize: 17, fontWeight: 800 }}>
          {t('ppt_zone_save')}{selectedList.length > 0 ? ` (${selectedList.length})` : ''}
        </Btn>
      </div>
    </div>
  );
}
