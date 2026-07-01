import React, { useEffect, useMemo, useRef, useState } from 'react';
import { COLORS, FONT, RADIUS } from '../../utils/theme';
import { pointInPolygon, polygonCentroid } from '../../utils/helpers';

/**
 * ZoneTapField — shared field-tap callout-zone selector (§109 + zone-attribution
 * W2). Pure select/deselect on the dense field: tap a zone polygon →
 * `onToggleZone(id)`. NO kill knowledge, NO chrome — wrapped by two adapters:
 *   - self-log (ZoneShotDrawer): `viewportSide='right'` + kill chips + Save.
 *   - scouting (QuickShotPanel drawer): `viewportSide={null}` (full field) +
 *     live per-slot write, no kills.
 *
 * Mapping by `viewportSide`:
 *   - 'right' → the right half nx∈[0.5,1] fills the canvas (zones authored on the
 *     field's right side; self-log is always right-half). px=(nx-0.5)·2·w.
 *   - null    → full field. px=nx·w.
 * The tap hit-test always resolves to FULL normalized space (`toNorm`), and
 * `zone.polygon` is full-normalized, so `pointInPolygon` works for both modes.
 */
export default function ZoneTapField({
  fieldImage,
  zones = [],
  selectedIds = [],
  viewportSide = null,
  onToggleZone,
}) {
  const isRight = viewportSide === 'right';
  const selSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const drawable = useMemo(
    () => (zones || []).filter(z => Array.isArray(z?.polygon) && z.polygon.length >= 3),
    [zones],
  );

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [img, setImg] = useState(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const toCanvas = (nx, ny, w, h) => ({ x: isRight ? (nx - 0.5) * 2 * w : nx * w, y: ny * h });
  const toNorm = (px, py, w, h) => ({ x: isRight ? 0.5 + (px / w) / 2 : px / w, y: py / h });

  // ── Field image load ──
  useEffect(() => {
    if (!fieldImage) { setImg(null); return undefined; }
    const im = new Image();
    let cancelled = false;
    im.onload = () => { if (!cancelled) setImg(im); };
    im.src = fieldImage;
    return () => { cancelled = true; };
  }, [fieldImage]);

  // ── Size: width-first; aspect halved for the right-half view ──
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    const compute = () => {
      const cw = node.clientWidth;
      const fullAspect = img && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 2;
      const aspect = fullAspect / (isRight ? 2 : 1);
      let w = cw;
      let h = w / Math.max(0.2, aspect);
      // Cap height like the app's other field views (height-constrained via
      // maxCanvasHeight). Width-first alone let the zone-picker field balloon on
      // wide / desktop containers — "layout strasznie duży" (Jacek 2026-07-02).
      // The canvas is margin:0 auto, so a narrower w just centers.
      const maxH = (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.42;
      if (h > maxH) { h = maxH; w = h * Math.max(0.2, aspect); }
      setSize({ w, h });
    };
    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(node);
    return () => obs.disconnect();
  }, [img, isRight]);

  // ── Draw: field bg + zone polygons (dimmed default / highlighted selected) ──
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

    if (img) {
      // right half → full image at 2×width offset left by w; full → 1:1.
      if (isRight) ctx.drawImage(img, -size.w, 0, size.w * 2, size.h);
      else ctx.drawImage(img, 0, 0, size.w, size.h);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, size.w, size.h);
    } else {
      ctx.fillStyle = COLORS.surface;
      ctx.fillRect(0, 0, size.w, size.h);
    }

    drawable.forEach(z => {
      const selected = selSet.has(z.id);
      const color = z.color || COLORS.accent;
      ctx.beginPath();
      z.polygon.forEach((p, i) => {
        const c = toCanvas(p.x, p.y, size.w, size.h);
        if (i === 0) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y);
      });
      ctx.closePath();
      ctx.globalAlpha = selected ? 0.42 : 0.12;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = selected ? color : `${color}66`;
      ctx.lineWidth = selected ? 3 : 1.5;
      ctx.setLineDash(selected ? [] : [6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      const ctr = polygonCentroid(z.polygon);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, size.w, size.h, drawable, selSet, isRight]);

  // pointerup = tap (the field doesn't scroll; no drag-vs-tap needed for select).
  const handleTap = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || size.w <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const norm = toNorm(e.clientX - rect.left, e.clientY - rect.top, size.w, size.h);
    for (let i = drawable.length - 1; i >= 0; i--) {       // topmost-first
      if (pointInPolygon(norm, drawable[i].polygon)) { onToggleZone?.(drawable[i].id); return; }
    }
  };

  return (
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
  );
}
