import React, { useRef, useState, useCallback } from 'react';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';
import { Btn } from './ui';

/**
 * ShotDrawer — full-height panel showing opponent field half.
 * Scrollable field image, tap to place shots.
 */
export default function ShotDrawer({
  open, onClose, playerIndex, playerLabel, playerColor,
  fieldSide, fieldImage, shots = [],
  onAddShot, onUndoShot,
}) {
  const imgRef = useRef(null);
  const scrollRef = useRef(null);
  const usedTouch = useRef(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const fromRight = fieldSide === 'left';

  // Auto-scroll to opponent side when image loads
  const handleImgLoad = useCallback(() => {
    setImgLoaded(true);
    // Wait for layout, then scroll to opponent half
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (fieldSide === 'left') {
        // Scouting from left → opponent is on right → scroll to right
        el.scrollLeft = el.scrollWidth - el.clientWidth;
      } else {
        // Scouting from right → opponent is on left → scroll to left
        el.scrollLeft = 0;
      }
    });
  }, [fieldSide]);

  const getFieldCoords = useCallback((e) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const touch = e.changedTouches?.[0] || e.touches?.[0];
    const cx = (touch ? touch.clientX : e.clientX) - rect.left;
    const cy = (touch ? touch.clientY : e.clientY) - rect.top;
    const relX = cx / rect.width;
    const relY = cy / rect.height;
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;
    return { x: relX, y: relY };
  }, []);

  const handleTap = useCallback((e) => {
    if (e.type === 'touchend') usedTouch.current = true;
    const coords = getFieldCoords(e);
    if (!coords) return;
    onAddShot?.({ x: coords.x, y: coords.y, isKill: false });
  }, [getFieldCoords, onAddShot]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90,
      }} />
      <div style={{
        position: 'fixed', top: 0, bottom: 0,
        [fromRight ? 'right' : 'left']: 0,
        width: '80%', maxWidth: 340,
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
            Shots: {playerLabel}
          </span>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
            {shots.length} placed
          </span>
          <div onClick={onClose} style={{ padding: `${SPACE.xs}px ${SPACE.sm}px`, cursor: 'pointer', color: COLORS.textDim, fontSize: FONT_SIZE.lg }}>✕</div>
        </div>

        {/* Scrollable field area */}
        <div ref={scrollRef} style={{
          flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch',
          background: '#3a5a3a',
        }}>
          <div style={{ position: 'relative', height: '100%', width: 'fit-content', minWidth: '100%' }}>
            {fieldImage && (
              <img
                ref={imgRef}
                src={fieldImage}
                alt="Field"
                onLoad={handleImgLoad}
                onTouchEnd={(e) => { e.preventDefault(); handleTap(e); }}
                onClick={(e) => { if (!usedTouch.current) handleTap(e); }}
                style={{
                  height: '100%', width: 'auto', display: 'block', cursor: 'crosshair',
                  WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
                }}
                draggable={false}
              />
            )}

            {/* Shot markers */}
            {imgLoaded && shots.map((s, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${s.x * 100}%`, top: `${s.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: 22, height: 22, borderRadius: '50%',
                background: playerColor + '40',
                border: `2px solid ${playerColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800, color: COLORS.white,
                pointerEvents: 'none',
              }}>{i + 1}</div>
            ))}
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
