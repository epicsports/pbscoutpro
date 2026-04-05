import React, { useRef } from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';
import { Btn } from './ui';

/**
 * ShotDrawer — full-height panel showing opponent field half.
 * Clean field, no bunker labels, proper aspect ratio, fade from scouted side.
 */
export default function ShotDrawer({
  open, onClose, playerIndex, playerLabel, playerColor,
  fieldSide, fieldImage, shots = [],
  onAddShot, onUndoShot,
}) {
  const containerRef = useRef(null);
  const usedTouch = useRef(false);
  if (!open) return null;

  const fromRight = fieldSide === 'left';

  const handleTap = (e) => {
    if (e.type === 'touchend') usedTouch.current = true;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const touch = e.changedTouches?.[0] || e.touches?.[0];
    const cx = (touch ? touch.clientX : e.clientX) - rect.left;
    const cy = (touch ? touch.clientY : e.clientY) - rect.top;

    // Image is rendered at auto × 100% height. Calculate actual image width.
    // Field image aspect ratio ≈ 1.54:1 (width/height)
    // Image height = container height, image width = containerH * aspect
    const containerW = rect.width;
    const containerH = rect.height;
    // We don't know exact aspect ratio, but backgroundSize: auto 100% means
    // the image width = containerH * (imgWidth/imgHeight). Since we show opponent
    // half, we need to map tap position to field coordinates.
    // 
    // Simpler approach: use backgroundSize: cover and let CSS handle it,
    // then relX/relY maps 1:1 to visible portion.
    const relX = cx / containerW;
    const relY = cy / containerH;
    
    // Map to field coords. The drawer shows the opponent side.
    // Shots should be stored in field coordinates (0-1 range).
    let fieldX;
    if (fieldSide === 'left') {
      // Scouting from left, opponent is on right half
      // relX 0→1 maps to field 0.5→1.0
      fieldX = 0.5 + relX * 0.5;
    } else {
      // Scouting from right, opponent is on left half
      // relX 0→1 maps to field 0.0→0.5
      fieldX = relX * 0.5;
    }
    onAddShot?.({ x: fieldX, y: relY, isKill: false });
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90,
      }} />
      <div style={{
        position: 'fixed', top: 0, bottom: 0,
        [fromRight ? 'right' : 'left']: 0,
        width: '75%', maxWidth: 320,
        background: COLORS.bg,
        borderLeft: fromRight ? `1px solid ${COLORS.border}` : 'none',
        borderRight: !fromRight ? `1px solid ${COLORS.border}` : 'none',
        zIndex: 91,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: `${SPACE.md}px 14px`, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface,
          display: 'flex', alignItems: 'center', gap: SPACE.sm,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: playerColor }} />
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text, flex: 1 }}>
            🎯 Shots: {playerLabel}
          </span>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
            {shots.length} placed
          </span>
          <div onClick={onClose} style={{ padding: `${SPACE.xs}px ${SPACE.sm}px`, cursor: 'pointer', color: COLORS.textDim, fontSize: FONT_SIZE.lg }}>✕</div>
        </div>

        {/* Field area — preserves aspect ratio, no labels */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', background: COLORS.bg }}>
          <div ref={containerRef}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleTap(e); }}
            onClick={(e) => { if (!usedTouch.current) handleTap(e); }}
            style={{
              flex: 1,
              position: 'relative', overflow: 'hidden', cursor: 'crosshair',
              backgroundImage: fieldImage ? `url(${fieldImage})` : 'none',
              backgroundSize: 'auto 100%',
              backgroundPosition: fieldSide === 'left' ? 'right center' : 'left center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#3a5a3a',
              margin: `0 ${SPACE.xs}px`,
            }}>

            {/* Shot markers */}
            {shots.map((s, i) => {
              let drawX;
              if (fieldSide === 'left') drawX = (s.x - 0.5) / 0.5;
              else drawX = s.x / 0.5;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${drawX * 100}%`, top: `${s.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 22, height: 22, borderRadius: '50%',
                  background: playerColor + '40',
                  border: `2px solid ${playerColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800, color: COLORS.white,
                  pointerEvents: 'none',
                }}>{i + 1}</div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px', borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface,
          display: 'flex', gap: SPACE.sm,
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        }}>
          <Btn variant="ghost" size="sm" onClick={onUndoShot} style={{ padding: '10px 14px' }}>↩ Undo</Btn>
          <Btn variant="accent" onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '12px 0', fontWeight: 700 }}>
            Done ({shots.length})
          </Btn>
        </div>
      </div>
    </>
  );
}
