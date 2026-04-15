/**
 * CalibrationView — tap to place markers, sliders for fine-tuning.
 * Used in LayoutWizardPage (Step 2) and re-calibrate flow from LayoutDetailPage.
 */
import React, { useRef, useState, useCallback } from 'react';
import { Btn, Slider } from './ui';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';

// ── Zoom panel ──
function ZoomPanel({ image, focusX, focusY, label, color, markerLabel, imageAspect }) {
  const zoomFactor = 5;
  // Image is displayed at 100% width inside the zoom container.
  // If container is square (aspect 1:1) and image is wider (e.g. 1.5:1),
  // the image height in the container = containerWidth / imageAspect.
  // focusX/focusY are normalized to image dimensions (0-1).
  // We need to translate so that focusX,focusY lands at 50%,50% of the container.
  
  // In the zoomed div: width = zoomFactor * 100% of container
  // Image fills that width, so image pixel X maps to: focusX * zoomFactor * 100% of container
  const tx = 50 - focusX * zoomFactor * 100;
  
  // Image height in container = (containerWidth * zoomFactor) / imageAspect
  // But we position with %, so focusY maps to: focusY * (imageHeight / containerHeight) * 100%
  // containerHeight = containerWidth (square), imageHeight = containerWidth * zoomFactor / imageAspect
  // ratio = zoomFactor / imageAspect
  const imgHeightRatio = imageAspect ? zoomFactor / imageAspect : zoomFactor;
  const ty = 50 - focusY * imgHeightRatio * 100;
  
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
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: `1px solid ${color}40` }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: `1px solid ${color}40` }} />
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 16, height: 16, borderRadius: '50%',
        background: `${color}30`, border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color, fontFamily: FONT,
      }}>{markerLabel}</div>
      <div style={{
        position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
        fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5, fontFamily: FONT,
      }}>{label}</div>
    </div>
  );
}

export default function CalibrationView({ image, calibration, onChange, doritoSide, onDoritoSideChange }) {
  const containerRef = useRef(null);
  const [activeMarker, setActiveMarker] = useState('homeBase');
  const [imageAspect, setImageAspect] = useState(1.5); // default landscape

  const home = calibration.homeBase;
  const away = calibration.awayBase;
  const centerX = (home.x + away.x) / 2;
  const centerY = home.y;

  // Tap image to place active marker roughly
  const handleTap = useCallback((e) => {
    const el = containerRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const touch = e.changedTouches?.[0] || e.touches?.[0];
    const cx = (touch ? touch.clientX : e.clientX) - rect.left;
    const cy = (touch ? touch.clientY : e.clientY) - rect.top;
    const x = Math.max(0, Math.min(1, cx / rect.width));
    const y = Math.max(0, Math.min(1, cy / rect.height));

    // Y-lock: both markers share same Y
    if (activeMarker === 'homeBase') {
      onChange({ homeBase: { x, y }, awayBase: { ...away, y } });
    } else {
      onChange({ homeBase: { ...home, y }, awayBase: { x, y } });
    }
  }, [activeMarker, home, away, onChange]);

  // Slider update
  const updateAxis = (marker, axis, value) => {
    const v = value / 1000; // slider 0-1000 → 0.000-1.000
    if (marker === 'homeBase') {
      const newHome = { ...home, [axis]: v };
      // Y-lock: sync Y
      onChange({ homeBase: newHome, awayBase: { ...away, y: axis === 'y' ? v : away.y } });
    } else {
      const newAway = { ...away, [axis]: v };
      onChange({ homeBase: { ...home, y: axis === 'y' ? v : home.y }, awayBase: newAway });
    }
  };

  if (!image) return null;

  const active = activeMarker === 'homeBase' ? home : away;
  const activeColor = activeMarker === 'homeBase' ? COLORS.success : COLORS.info;
  const activeLabel = activeMarker === 'homeBase' ? 'Home base' : 'Away base';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
      {/* Instruction */}
      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, padding: `0 ${SPACE.lg}px` }}>
        Tap field to place marker, then fine-tune with sliders
      </div>

      {/* Marker selector pills */}
      <div style={{ display: 'flex', gap: SPACE.sm, padding: `0 ${SPACE.lg}px` }}>
        <Btn variant="default" size="sm" active={activeMarker === 'homeBase'}
          style={{ flex: 1, justifyContent: 'center', borderColor: activeMarker === 'homeBase' ? COLORS.success : COLORS.border,
            color: activeMarker === 'homeBase' ? COLORS.success : COLORS.textDim }}
          onClick={() => setActiveMarker('homeBase')}>
          H · Home base
        </Btn>
        <Btn variant="default" size="sm" active={activeMarker === 'awayBase'}
          style={{ flex: 1, justifyContent: 'center', borderColor: activeMarker === 'awayBase' ? COLORS.info : COLORS.border,
            color: activeMarker === 'awayBase' ? COLORS.info : COLORS.textDim }}
          onClick={() => setActiveMarker('awayBase')}>
          A · Away base
        </Btn>
      </div>

      {/* Field image — tap to place */}
      <div ref={containerRef} style={{
        position: 'relative', cursor: 'crosshair',
        margin: `0 ${SPACE.lg}px`, borderRadius: RADIUS.md, overflow: 'hidden',
        border: `1px solid ${activeColor}40`,
        WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
      }}
        onTouchEnd={(e) => { e.preventDefault(); handleTap(e); }}
        onClick={(e) => handleTap(e)}
        onContextMenu={e => e.preventDefault()}
      >
        <img src={image} alt="Field" onLoad={e => {
          const { naturalWidth, naturalHeight } = e.target;
          if (naturalWidth && naturalHeight) setImageAspect(naturalWidth / naturalHeight);
        }} style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />

        {/* Home marker */}
        <div style={{
          position: 'absolute',
          left: `${home.x * 100}%`, top: `${home.y * 100}%`,
          transform: 'translate(-50%,-50%)',
          width: activeMarker === 'homeBase' ? 44 : 32,
          height: activeMarker === 'homeBase' ? 44 : 32,
          borderRadius: '50%',
          background: COLORS.success + (activeMarker === 'homeBase' ? '40' : '20'),
          border: `3px solid ${COLORS.success}${activeMarker === 'homeBase' ? '' : '80'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: activeMarker === 'homeBase' ? 16 : 12, fontWeight: 800,
          color: COLORS.success, fontFamily: FONT,
          pointerEvents: 'none', transition: 'all 0.15s',
        }}>H</div>

        {/* Away marker */}
        <div style={{
          position: 'absolute',
          left: `${away.x * 100}%`, top: `${away.y * 100}%`,
          transform: 'translate(-50%,-50%)',
          width: activeMarker === 'awayBase' ? 44 : 32,
          height: activeMarker === 'awayBase' ? 44 : 32,
          borderRadius: '50%',
          background: `#3b82f6${activeMarker === 'awayBase' ? '40' : '20'}`,
          border: `3px solid #3b82f6${activeMarker === 'awayBase' ? '' : '80'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: activeMarker === 'awayBase' ? 16 : 12, fontWeight: 800,
          color: COLORS.info, fontFamily: FONT,
          pointerEvents: 'none', transition: 'all 0.15s',
        }}>A</div>

        {/* Center dot */}
        <div style={{
          position: 'absolute',
          left: `${centerX * 100}%`, top: `${centerY * 100}%`,
          transform: 'translate(-50%,-50%)',
          width: 8, height: 8, borderRadius: '50%',
          background: COLORS.accent, pointerEvents: 'none',
        }} />
      </div>

      {/* Fine-tune sliders for active marker */}
      <div style={{ padding: `0 ${SPACE.lg}px`, display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: activeColor }}>
          Fine-tune: {activeLabel}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, width: 14 }}>X</span>
          <input type="range" min={0} max={1000} step={1}
            value={Math.round(active.x * 1000)}
            onChange={(e) => updateAxis(activeMarker, 'x', Number(e.target.value))}
            style={{ flex: 1, accentColor: activeColor }} />
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, width: 36, textAlign: 'right' }}>
            {(active.x * 100).toFixed(1)}%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, width: 14 }}>Y</span>
          <input type="range" min={0} max={1000} step={1}
            value={Math.round(active.y * 1000)}
            onChange={(e) => updateAxis(activeMarker, 'y', Number(e.target.value))}
            style={{ flex: 1, accentColor: activeColor }} />
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, width: 36, textAlign: 'right' }}>
            {(active.y * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Zoom panels */}
      <div style={{ display: 'flex', gap: SPACE.sm, padding: `0 ${SPACE.lg}px` }}>
        <ZoomPanel image={image} focusX={home.x} focusY={home.y} label="HOME" color={COLORS.success} markerLabel="H" imageAspect={imageAspect} />
        <ZoomPanel image={image} focusX={centerX} focusY={centerY} label="CENTER" color={COLORS.accent} markerLabel="C" imageAspect={imageAspect} />
        <ZoomPanel image={image} focusX={away.x} focusY={away.y} label="AWAY" color="#3b82f6" markerLabel="A" imageAspect={imageAspect} />
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
