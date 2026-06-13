import React, { useMemo, useState, useEffect } from 'react';
import { COLORS, FONT } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useBaseCanvas } from '../canvas/BaseCanvas';

/**
 * ReasonRadial — Point-as-Timeline Stage 2b. A radial elimination-reason menu
 * that blooms ON the eliminated player (Settle/Mid only — Break is implicit).
 * Rendered as a child of BaseCanvas so it reads the live transform via
 * useBaseCanvas() and anchors at the player's screen position (same math as the
 * inline player toolbar). The anchor is clamped so the whole bloom stays on the
 * canvas (auto-flip/clamp near edges). A full-frame backdrop dismisses it.
 *
 * Props:
 *   menu    — { slot, pos:{x,y} } | null  (pos = player normalized field coords)
 *   current — current reason code for the slot | null (highlights the chosen one)
 *   onPick  — (code) => void
 *   onClose — () => void
 */
export const ELIM_REASONS = [
  { code: 'breakthrough', key: 'reason_breakthrough' },
  { code: 'penalty', key: 'reason_penalty' },
  { code: 'gunfight', key: 'reason_gunfight' },
  { code: 'obstacle', key: 'reason_obstacle' },
  { code: 'unknown', key: 'reason_unknown' },
];

export default function ReasonRadial({ menu, current, onPick, onClose }) {
  const { t } = useLanguage();
  const { canvasSize, zoom, pan, containerRef } = useBaseCanvas();

  // The tap that OPENS the menu (toolbar "Hit" / "Reason") fires a touchend with
  // preventDefault, but the trailing synthetic click can land on the freshly-
  // mounted backdrop and dismiss the menu before it's seen. Arm the backdrop
  // dismiss only after a short window so that ghost click is ignored.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(false);
    const tm = setTimeout(() => setArmed(true), 350);
    return () => clearTimeout(tm);
  }, [menu]);
  const dismiss = () => { if (armed) onClose(); };

  const layout = useMemo(() => {
    if (!menu?.pos || !canvasSize?.w) return null;
    const cw = containerRef.current?.clientWidth || canvasSize.w;
    const ch = containerRef.current?.clientHeight || canvasSize.h;
    const R = 78;    // bloom radius (px)
    const M = 52;    // clamp margin so chips stay fully on-canvas
    let ax = menu.pos.x * canvasSize.w * zoom + pan.x;
    let ay = menu.pos.y * canvasSize.h * zoom + pan.y;
    ax = Math.max(R + M, Math.min(cw - R - M, ax));
    ay = Math.max(R + M, Math.min(ch - R - M, ay));
    const n = ELIM_REASONS.length;
    const items = ELIM_REASONS.map((r, i) => {
      const theta = (i / n) * 2 * Math.PI - Math.PI / 2; // first option at top
      return { ...r, x: ax + R * Math.cos(theta), y: ay + R * Math.sin(theta) };
    });
    return { ax, ay, items };
  }, [menu, canvasSize, zoom, pan, containerRef]);

  if (!menu || !layout) return null;

  return (
    <>
      {/* Backdrop — tap anywhere to dismiss (modal-ish; blocks canvas while open). */}
      <div
        onClick={dismiss}
        onTouchStart={(e) => { e.stopPropagation(); dismiss(); }}
        style={{ position: 'absolute', inset: 0, zIndex: 40 }}
      />
      {/* Center label */}
      <div style={{
        position: 'absolute', left: layout.ax, top: layout.ay, transform: 'translate(-50%,-50%)',
        zIndex: 41, pointerEvents: 'none',
        fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', width: 64,
      }}>{t('reason_title')}</div>
      {layout.items.map((it) => {
        const active = current === it.code;
        return (
          <div key={it.code}
            onClick={(e) => { e.stopPropagation(); onPick(it.code); }}
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onPick(it.code); }}
            style={{
              position: 'absolute', left: it.x, top: it.y, transform: 'translate(-50%,-50%)',
              zIndex: 42, minWidth: 44, minHeight: 44, padding: '6px 12px', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              background: active ? COLORS.accent : '#0f172aee',
              color: active ? COLORS.black : COLORS.text,
              border: `1.5px solid ${active ? COLORS.accent : COLORS.border}`,
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              fontFamily: FONT, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
            {t(it.key)}
          </div>
        );
      })}
    </>
  );
}
