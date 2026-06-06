import React, { useState, useRef, useEffect, useCallback } from 'react';
import { COLORS, FONT, RADIUS } from '../utils/theme';
import { Input } from './ui';

/**
 * ColorPicker — HSV color picker (saturation/value box + hue slider + hex field),
 * dark-theme, app-tokenized, mobile-first (pointer events for touch + mouse).
 * Picks any hex; complements the preset swatches on TeamDetailPage.
 *
 * Props:
 *   value     — current hex string | null (null → starts from a neutral default)
 *   onChange  — (hex) => void  live, fires on every drag move (for optimistic preview)
 *   onCommit  — (hex) => void  fires on pointer release / hex blur (persist here)
 */

const DEFAULT_HSV = { h: 210, s: 0.55, v: 0.7 };
const clamp01 = (n) => Math.max(0, Math.min(1, n));

function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const to = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hexToHsv(hex) {
  if (typeof hex !== 'string') return null;
  const x = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(x)) return null;
  const r = parseInt(x.slice(0, 2), 16) / 255;
  const g = parseInt(x.slice(2, 4), 16) / 255;
  const b = parseInt(x.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export default function ColorPicker({ value, onChange, onCommit }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value) || DEFAULT_HSV);
  const [hexText, setHexText] = useState(() => (hexToHsv(value) ? value : hsvToHex(DEFAULT_HSV.h, DEFAULT_HSV.s, DEFAULT_HSV.v)));
  const lastEmit = useRef(null);

  // Sync from an EXTERNAL value change (e.g. a preset swatch tapped) — but not
  // from our own emits (round-trip would jitter low-saturation drags).
  useEffect(() => {
    if (value && value !== lastEmit.current) {
      const next = hexToHsv(value);
      if (next) { setHsv(next); setHexText(value); }
    }
  }, [value]);

  const hex = hsvToHex(hsv.h, hsv.s, hsv.v);

  const emit = useCallback((next, commit) => {
    const hx = hsvToHex(next.h, next.s, next.v);
    lastEmit.current = hx;
    setHsv(next);
    setHexText(hx);
    onChange?.(hx);
    if (commit) onCommit?.(hx);
  }, [onChange, onCommit]);

  // ── Saturation / Value box drag ──
  const svRef = useRef(null);
  const svDrag = useRef(false);
  const svFrom = (e) => {
    const r = svRef.current.getBoundingClientRect();
    const s = clamp01((e.clientX - r.left) / r.width);
    const v = clamp01(1 - (e.clientY - r.top) / r.height);
    return { ...hsv, s, v };
  };
  const svDown = (e) => { svDrag.current = true; e.currentTarget.setPointerCapture(e.pointerId); emit(svFrom(e), false); };
  const svMove = (e) => { if (svDrag.current) emit(svFrom(e), false); };
  const svUp = (e) => { if (!svDrag.current) return; svDrag.current = false; emit(svFrom(e), true); };

  // ── Hue slider drag ──
  const hueRef = useRef(null);
  const hueDrag = useRef(false);
  const hueFrom = (e) => {
    const r = hueRef.current.getBoundingClientRect();
    return { ...hsv, h: clamp01((e.clientX - r.left) / r.width) * 360 };
  };
  const hueDown = (e) => { hueDrag.current = true; e.currentTarget.setPointerCapture(e.pointerId); emit(hueFrom(e), false); };
  const hueMove = (e) => { if (hueDrag.current) emit(hueFrom(e), false); };
  const hueUp = (e) => { if (!hueDrag.current) return; hueDrag.current = false; emit(hueFrom(e), true); };

  // ── Hex field ──
  const onHexChange = (txt) => {
    setHexText(txt);
    const parsed = hexToHsv(txt.startsWith('#') ? txt : `#${txt}`);
    if (parsed) { setHsv(parsed); const hx = (txt.startsWith('#') ? txt : `#${txt}`).toLowerCase(); lastEmit.current = hx; onChange?.(hx); }
  };
  const onHexBlur = () => {
    const parsed = hexToHsv(hexText.startsWith('#') ? hexText : `#${hexText}`);
    if (parsed) onCommit?.((hexText.startsWith('#') ? hexText : `#${hexText}`).toLowerCase());
    else setHexText(hex); // revert invalid text to the current color
  };

  const hueColor = hsvToHex(hsv.h, 1, 1);
  const TOUCH = { WebkitUserSelect: 'none', userSelect: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Saturation / Value box */}
      <div
        ref={svRef}
        onPointerDown={svDown} onPointerMove={svMove} onPointerUp={svUp}
        style={{
          position: 'relative', width: '100%', height: 150, borderRadius: RADIUS.md,
          border: `1px solid ${COLORS.border}`, cursor: 'crosshair', overflow: 'hidden',
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueColor}`,
          ...TOUCH,
        }}>
        <div style={{
          position: 'absolute', left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`,
          width: 18, height: 18, borderRadius: '50%', transform: 'translate(-50%,-50%)',
          border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,.5)', background: hex,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Hue slider — 44px interactive wrapper, 16px visible track (§27 touch) */}
      <div
        ref={hueRef}
        onPointerDown={hueDown} onPointerMove={hueMove} onPointerUp={hueUp}
        style={{ position: 'relative', width: '100%', height: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', ...TOUCH }}>
        <div style={{
          width: '100%', height: 16, borderRadius: 999, border: `1px solid ${COLORS.border}`,
          background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
        }} />
        <div style={{
          position: 'absolute', left: `${(hsv.h / 360) * 100}%`, top: '50%',
          width: 22, height: 22, borderRadius: '50%', transform: 'translate(-50%,-50%)',
          border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.5)', background: hueColor,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Hex field + live preview swatch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 44, height: 44, borderRadius: RADIUS.sm, flexShrink: 0,
          background: hex, border: `1px solid ${COLORS.border}`,
        }} />
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontFamily: FONT, fontSize: 14, color: COLORS.textMuted, pointerEvents: 'none',
          }}>#</span>
          <Input
            value={hexText.replace('#', '')}
            onChange={(v) => onHexChange(v.trim())}
            onBlur={onHexBlur}
            placeholder="2563eb"
            style={{ paddingLeft: 26, fontFamily: FONT, letterSpacing: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}
