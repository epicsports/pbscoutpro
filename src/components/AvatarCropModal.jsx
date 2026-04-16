import React, { useState, useRef, useEffect } from 'react';
import { Modal, Btn } from './ui';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

/**
 * AvatarCropModal — pick file, then drag/pinch to position + zoom
 * a circular crop area. Outputs a cropRect { x, y, size } in source px
 * that the caller can pass to cropToSquare().
 *
 * Usage:
 *   <AvatarCropModal open={open} file={file}
 *     onCancel={() => setOpen(false)}
 *     onConfirm={async (cropRect) => {
 *       const blob = await cropToSquare(file, cropRect, 400);
 *       const url = await uploadAvatar(blob, user.uid);
 *     }} />
 */
export default function AvatarCropModal({ open, file, onCancel, onConfirm, saving }) {
  const { t } = useLanguage();
  const [imgSrc, setImgSrc] = useState(null);
  const [imgDim, setImgDim] = useState({ w: 0, h: 0 });

  // View rect is always 280×280. Source image scales to fit max dimension,
  // leaving room to pan/zoom inside. zoom=1 means the image's shorter side
  // exactly fits 280px; zoom>1 = zoomed in.
  const VIEW = 280;
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // center offset in view px

  // Load file into image
  useEffect(() => {
    if (!file) { setImgSrc(null); return; }
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      setImgDim({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Touch/mouse drag state
  const dragRef = useRef(null);
  const pinchRef = useRef(null);

  const getEventPoint = (e) => {
    const t = e.touches?.[0] || e;
    return { x: t.clientX, y: t.clientY };
  };

  const handleStart = (e) => {
    if (e.touches?.length === 2) {
      // Start pinch
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { startDist: dist, startZoom: zoom };
      dragRef.current = null;
    } else {
      const p = getEventPoint(e);
      dragRef.current = { startX: p.x, startY: p.y, origX: offset.x, origY: offset.y };
      pinchRef.current = null;
    }
  };

  const handleMove = (e) => {
    if (pinchRef.current && e.touches?.length === 2) {
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const next = Math.max(1, Math.min(4, pinchRef.current.startZoom * (dist / pinchRef.current.startDist)));
      setZoom(next);
      e.preventDefault();
    } else if (dragRef.current) {
      const p = getEventPoint(e);
      setOffset({
        x: dragRef.current.origX + (p.x - dragRef.current.startX),
        y: dragRef.current.origY + (p.y - dragRef.current.startY),
      });
      e.preventDefault();
    }
  };

  const handleEnd = () => {
    dragRef.current = null;
    pinchRef.current = null;
  };

  // Compute how the image is displayed (contain + zoom)
  // At zoom=1, shorter side = VIEW. So scale = VIEW / min(w, h) * zoom
  const srcMin = Math.min(imgDim.w, imgDim.h) || 1;
  const displayScale = (VIEW / srcMin) * zoom;
  const dispW = imgDim.w * displayScale;
  const dispH = imgDim.h * displayScale;

  // Clamp offset so crop circle stays within image bounds
  const maxOffsetX = Math.max(0, (dispW - VIEW) / 2);
  const maxOffsetY = Math.max(0, (dispH - VIEW) / 2);
  const clampedOffset = {
    x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offset.x)),
    y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offset.y)),
  };

  const handleConfirm = () => {
    if (!imgDim.w) return;
    // Convert view coords to source coords.
    // View center = source center + offset (in view px) → source center + offset/scale
    const srcCenterX = imgDim.w / 2 - clampedOffset.x / displayScale;
    const srcCenterY = imgDim.h / 2 - clampedOffset.y / displayScale;
    const srcSize = VIEW / displayScale;
    const cropRect = {
      x: Math.max(0, srcCenterX - srcSize / 2),
      y: Math.max(0, srcCenterY - srcSize / 2),
      size: Math.min(srcSize, Math.min(imgDim.w, imgDim.h)),
    };
    onConfirm(cropRect);
  };

  return (
    <Modal open={open} onClose={() => !saving && onCancel()}
      title={t('crop_photo') || 'Dopasuj zdjęcie'}
      footer={<>
        <Btn variant="default" onClick={onCancel} disabled={saving}>{t('cancel')}</Btn>
        <Btn variant="accent" onClick={handleConfirm} disabled={saving || !imgSrc}>
          {saving ? (t('saving') || 'Zapisywanie…') : (t('use_photo') || 'Użyj zdjęcia')}
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.md }}>
        <div
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          onMouseDown={handleStart}
          onMouseMove={dragRef.current ? handleMove : undefined}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          style={{
            position: 'relative', width: VIEW, height: VIEW,
            overflow: 'hidden', borderRadius: '50%',
            background: COLORS.surfaceDark,
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            cursor: dragRef.current ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          {imgSrc && (
            <img
              src={imgSrc}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: '50%', top: '50%',
                width: dispW, height: dispH,
                transform: `translate(calc(-50% + ${clampedOffset.x}px), calc(-50% + ${clampedOffset.y}px))`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Zoom slider */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>−</span>
          <input
            type="range" min={1} max={4} step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: COLORS.accent }}
          />
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>+</span>
        </div>

        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, textAlign: 'center' }}>
          {t('crop_hint') || 'Przeciągnij aby wyśrodkować, suwak zoom lub pinch palcami.'}
        </div>
      </div>
    </Modal>
  );
}
