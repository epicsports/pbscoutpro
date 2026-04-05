import React, { useRef } from 'react';
import { COLORS, FONT } from '../utils/theme';
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
    // Use changedTouches for touchEnd (touches array is empty), clientX for click
    const touch = e.changedTouches?.[0] || e.touches?.[0];
    const cx = (touch ? touch.clientX : e.clientX) - rect.left;
    const cy = (touch ? touch.clientY : e.clientY) - rect.top;
    const relX = cx / rect.width;
    const relY = cy / rect.height;
    let fieldX;
    if (fieldSide === 'left') {
      fieldX = 0.35 + relX * 0.65;
    } else {
      fieldX = relX * 0.65;
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
        background: '#0a0e17',
        borderLeft: fromRight ? `1px solid ${COLORS.border}` : 'none',
        borderRight: !fromRight ? `1px solid ${COLORS.border}` : 'none',
        zIndex: 91,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 14px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          borderBottom: `1px solid ${COLORS.border}`, background: '#111827',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: playerColor }} />
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text, flex: 1 }}>
            🎯 Shots: {playerLabel}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim }}>
            {shots.length} placed
          </span>
          <div onClick={onClose} style={{ padding: '4px 8px', cursor: 'pointer', color: COLORS.textDim, fontSize: 16 }}>✕</div>
        </div>

        {/* Field area — preserves aspect ratio, no labels */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', background: '#0a0e17' }}>
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
              margin: '0 4px',
            }}>

            {/* Shot markers */}
            {shots.map((s, i) => {
              let drawX;
              if (fieldSide === 'left') drawX = (s.x - 0.35) / 0.65;
              else drawX = s.x / 0.65;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${drawX * 100}%`, top: `${s.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 22, height: 22, borderRadius: '50%',
                  background: playerColor + '40',
                  border: `2px solid ${playerColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT, fontSize: 9, fontWeight: 800, color: '#fff',
                  pointerEvents: 'none',
                }}>{i + 1}</div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px', borderTop: `1px solid ${COLORS.border}`, background: '#111827',
          display: 'flex', gap: 8,
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
