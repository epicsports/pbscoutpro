import React, { useRef, useCallback } from 'react';
import { COLORS, FONT, TOUCH } from '../utils/theme';
import { Btn } from './ui';

/**
 * ShotDrawer — full-height panel showing opponent field half.
 * Slides from opposite side of the field.
 * Tap to place numbered shot targets.
 */
export default function ShotDrawer({
  open, onClose, playerIndex, playerLabel, playerColor,
  fieldSide, fieldImage, bunkers = [], shots = [],
  onAddShot, onUndoShot,
}) {
  const containerRef = useRef(null);
  if (!open) return null;

  const fromRight = fieldSide === 'left';
  const slideFrom = fromRight ? 'right' : 'left';

  const handleTap = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    // Convert drawer coords to full field coords
    const relX = cx / rect.width;
    const relY = cy / rect.height;
    let fieldX, fieldY = relY;
    if (fieldSide === 'left') {
      fieldX = 0.35 + relX * 0.65; // drawer shows x: 0.35-1.0
    } else {
      fieldX = relX * 0.65; // drawer shows x: 0-0.65
    }
    onAddShot?.({ x: fieldX, y: fieldY, isKill: false });
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 90,
      }} />
      <div style={{
        position: 'fixed', top: 0, bottom: 0,
        [slideFrom]: 0,
        width: '70%', maxWidth: 320,
        background: COLORS.bg,
        borderLeft: fromRight ? `1px solid ${COLORS.border}` : 'none',
        borderRight: !fromRight ? `1px solid ${COLORS.border}` : 'none',
        zIndex: 91,
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: playerColor }} />
          <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text, flex: 1 }}>
            🔫 Shots: {playerLabel}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim }}>
            {shots.length} shots
          </span>
          <Btn variant="ghost" size="sm" onClick={onClose} style={{ padding: '4px 8px' }}>✕</Btn>
        </div>

        {/* Field area — tap to place shots */}
        <div ref={containerRef} onClick={handleTap}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden', cursor: 'crosshair',
            backgroundImage: fieldImage ? `url(${fieldImage})` : 'none',
            backgroundSize: fieldSide === 'left' ? '154% 100%' : '154% 100%',
            backgroundPosition: fieldSide === 'left' ? 'right center' : 'left center',
            backgroundColor: COLORS.surface,
          }}>
          {/* Dark overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' }} />

          {/* Existing shots */}
          {shots.map((s, i) => {
            // Convert field coords to drawer coords
            let drawX;
            if (fieldSide === 'left') drawX = (s.x - 0.35) / 0.65;
            else drawX = s.x / 0.65;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `${drawX * 100}%`, top: `${s.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: 24, height: 24, borderRadius: '50%',
                background: playerColor + '40',
                border: `2px solid ${playerColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT, fontSize: 10, fontWeight: 800, color: playerColor,
              }}>{i + 1}</div>
            );
          })}

          {/* Bunker labels */}
          {bunkers.map(b => {
            let drawX;
            if (fieldSide === 'left') drawX = (b.x - 0.35) / 0.65;
            else drawX = b.x / 0.65;
            if (drawX < 0 || drawX > 1) return null;
            return (
              <div key={b.id} style={{
                position: 'absolute',
                left: `${drawX * 100}%`, top: `${b.y * 100}%`,
                transform: 'translate(-50%, -100%)',
                fontFamily: FONT, fontSize: 8, fontWeight: 700,
                color: '#facc15', background: 'rgba(0,0,0,0.7)',
                padding: '1px 4px', borderRadius: 3, whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>{b.name}</div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px', borderTop: `1px solid ${COLORS.border}`,
          display: 'flex', gap: 8,
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        }}>
          <Btn variant="ghost" size="sm" onClick={onUndoShot} style={{ padding: '8px 12px' }}>↩ Undo</Btn>
          <Btn variant="accent" onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '10px 0' }}>
            Done ({shots.length})
          </Btn>
        </div>
      </div>
    </>
  );
}
