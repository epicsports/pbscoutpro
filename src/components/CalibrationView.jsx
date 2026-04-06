/**
 * CalibrationView — reusable calibration UI with draggable markers + 3 zoom panels.
 * Used in LayoutWizardPage (Step 2) and re-calibrate flow from LayoutDetailPage.
 *
 * Props:
 *   image        — base64 field image
 *   calibration  — { homeBase: {x,y}, awayBase: {x,y} }
 *   onChange      — (newCalibration) => void
 *   doritoSide   — 'top' | 'bottom'
 *   onDoritoSideChange — (side) => void
 */
import React, { useRef, useCallback } from 'react';
import { Btn } from './ui';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';

// ── Zoom panel ──
function ZoomPanel({ image, focusX, focusY, label, color, markerLabel }) {
  const zoomFactor = 5;
  // To center the focus point: translate the zoomed image so that
  // focusX/focusY lands at 50%/50% of the container.
  // offset = 50% - focusX * zoomFactor * 100%
  const tx = 50 - focusX * zoomFactor * 100;
  const ty = 50 - focusY * zoomFactor * 100;
  return (
    <div style={{
      flex: 1, aspectRatio: '1', borderRadius: RADIUS.md, overflow: 'hidden',
      border: `1px solid ${color}40`, position: 'relative', background: COLORS.surfaceDark,
    }}>
      <div style={{
        position: 'absolute',
        width: `${zoomFactor * 100}%`,
        height: `${zoomFactor * 100}%`,
        left: `${tx}%`,
        top: `${ty}%`,
        backgroundImage: `url(${image})`,
        backgroundSize: '100% auto',
        backgroundPosition: 'top left',
        backgroundRepeat: 'no-repeat',
      }} />
      {/* Crosshairs */}
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: `1px solid ${color}40` }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: `1px solid ${color}40` }} />
      {/* Marker dot */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 16, height: 16, borderRadius: '50%',
        background: `${color}30`, border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontWeight: 700, color, fontFamily: FONT,
      }}>{markerLabel}</div>
      {/* Label */}
      <div style={{
        position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
        fontSize: 9, fontWeight: 700, color, letterSpacing: 0.5, fontFamily: FONT,
      }}>{label}</div>
    </div>
  );
}

export default function CalibrationView({ image, calibration, onChange, doritoSide, onDoritoSideChange }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null); // 'homeBase' | 'awayBase' | null
  const calibRef = useRef(calibration);
  calibRef.current = calibration;

  const home = calibration.homeBase;
  const away = calibration.awayBase;
  const centerX = (home.x + away.x) / 2;
  const centerY = home.y; // Y-locked

  const getPos = useCallback((e) => {
    const el = containerRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const cy = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    return { x: Math.max(0, Math.min(1, cx / rect.width)), y: Math.max(0, Math.min(1, cy / rect.height)) };
  }, []);

  const handleStart = useCallback((e) => {
    const pos = getPos(e); if (!pos) return;
    const h = calibRef.current.homeBase;
    const a = calibRef.current.awayBase;
    const dH = Math.sqrt((pos.x - h.x) ** 2 + (pos.y - h.y) ** 2);
    const dA = Math.sqrt((pos.x - a.x) ** 2 + (pos.y - a.y) ** 2);
    const closest = dH < dA ? dH : dA;
    if (closest > 0.15) return;
    dragRef.current = dH < dA ? 'homeBase' : 'awayBase';
    // Apply immediately
    const newY = pos.y;
    onChange({
      homeBase: { x: dragRef.current === 'homeBase' ? pos.x : h.x, y: newY },
      awayBase: { x: dragRef.current === 'awayBase' ? pos.x : a.x, y: newY },
    });
  }, [getPos, onChange]);

  const handleMove = useCallback((e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const pos = getPos(e); if (!pos) return;
    const h = calibRef.current.homeBase;
    const a = calibRef.current.awayBase;
    onChange({
      homeBase: { x: dragRef.current === 'homeBase' ? pos.x : h.x, y: pos.y },
      awayBase: { x: dragRef.current === 'awayBase' ? pos.x : a.x, y: pos.y },
    });
  }, [home, away, getPos, onChange]);

  const handleEnd = useCallback(() => { dragRef.current = null; }, []);

  if (!image) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
      {/* Instruction */}
      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, padding: `0 ${SPACE.lg}px` }}>
        Drag markers to home and away base centers
      </div>

      {/* Field image with markers */}
      <div ref={containerRef} style={{
        position: 'relative', touchAction: 'none', cursor: 'crosshair',
        margin: `0 ${SPACE.lg}px`, borderRadius: RADIUS.md, overflow: 'hidden',
        border: `1px solid ${COLORS.border}`,
        WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
      }}
        onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd}
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        onContextMenu={e => e.preventDefault()}
      >
        <img src={image} alt="Field" style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />

        {/* Home marker (green) */}
        <div style={{
          position: 'absolute',
          left: `${home.x * 100}%`, top: `${home.y * 100}%`,
          transform: 'translate(-50%,-50%)',
          width: 40, height: 40, borderRadius: '50%',
          background: COLORS.success + '30', border: `3px solid ${COLORS.success}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: COLORS.success, fontFamily: FONT,
          pointerEvents: 'none',
        }}>H</div>

        {/* Away marker (blue) */}
        <div style={{
          position: 'absolute',
          left: `${away.x * 100}%`, top: `${away.y * 100}%`,
          transform: 'translate(-50%,-50%)',
          width: 40, height: 40, borderRadius: '50%',
          background: '#3b82f630', border: '3px solid #3b82f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: '#3b82f6', fontFamily: FONT,
          pointerEvents: 'none',
        }}>A</div>

        {/* Center dot (amber) */}
        <div style={{
          position: 'absolute',
          left: `${centerX * 100}%`, top: `${centerY * 100}%`,
          transform: 'translate(-50%,-50%)',
          width: 8, height: 8, borderRadius: '50%',
          background: COLORS.accent, border: `1px solid ${COLORS.accent}`,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Three zoom panels */}
      <div style={{ display: 'flex', gap: SPACE.sm, padding: `0 ${SPACE.lg}px` }}>
        <ZoomPanel image={image} focusX={home.x} focusY={home.y} label="HOME" color={COLORS.success} markerLabel="H" />
        <ZoomPanel image={image} focusX={centerX} focusY={centerY} label="CENTER" color={COLORS.accent} markerLabel="C" />
        <ZoomPanel image={image} focusX={away.x} focusY={away.y} label="AWAY" color="#3b82f6" markerLabel="A" />
      </div>

      {/* Center verification */}
      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.success, padding: `0 ${SPACE.lg}px` }}>
        Field center calculated
      </div>

      {/* Dorito side selector */}
      {onDoritoSideChange && (
        <div style={{ padding: `0 ${SPACE.lg}px` }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: SPACE.xs }}>
            Dorito side
          </div>
          <div style={{ display: 'flex', gap: SPACE.sm }}>
            <Btn variant="default" size="sm" active={doritoSide === 'top'}
              onClick={() => onDoritoSideChange('top')}>Top ▲</Btn>
            <Btn variant="default" size="sm" active={doritoSide === 'bottom'}
              onClick={() => onDoritoSideChange('bottom')}>Bottom ▼</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
