import React, { useState } from 'react';
import { Undo2, Redo2, Eraser, Trash2, Check, Minus, Equal } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { ConfirmModal } from '../ui';
import { STROKE_COLORS, STROKE_SIZES } from './DrawingOverlay';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * DrawToolbar — § 77 Draw Stage 1.
 *
 * Floating toolbar that drives the draw consumer state on the parent
 * (Match). Single-row when there is room (typical landscape), wraps to two
 * rows on narrow / portrait-FS widths (`flex-wrap` + `width:fit-content`).
 * Centered horizontally inside the canvas frame via the classic
 * `left:0; right:0; margin:auto; width:fit-content` trick (per brief —
 * survives content-driven width changes more cleanly than `left:50%;
 * transform:translateX(-50%)` when the row count flips).
 *
 * Props:
 *   - `color` (string hex)         — current paint color
 *   - `onColorChange(hex)`
 *   - `sizeKey` ('thin'/'medium'/'thick')
 *   - `onSizeChange(key)`
 *   - `eraserActive` (boolean)
 *   - `onEraserToggle(next)`
 *   - `canUndo`, `canRedo`         — gates the buttons
 *   - `onUndo`, `onRedo`
 *   - `onClear()`                  — full clear (ConfirmModal lives inside toolbar)
 *   - `onDone()`                   — exit draw mode (commit happens in parent)
 *   - `hasStrokes` (boolean)       — gates Clear button enable state
 *
 * § 27: amber for interactive accents (selected color/width, eraser-active,
 * Done CTA). Touch targets 44px minimum (TOUCH.minTarget). Confirm-modal
 * for Clear (data-loss). No emoji — Lucide icons only.
 */
export default function DrawToolbar({
  color, onColorChange,
  sizeKey, onSizeChange,
  eraserActive, onEraserToggle,
  canUndo, canRedo, hasStrokes,
  onUndo, onRedo, onClear, onDone,
}) {
  const { t } = useLanguage();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      <div
        onPointerDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0, margin: '0 auto',
          width: 'fit-content', maxWidth: 'calc(100% - 16px)',
          zIndex: 40,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
          gap: SPACE.xs,
          padding: 8,
          background: 'rgba(15, 23, 42, 0.92)',
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.lg,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          fontFamily: FONT,
        }}
      >
        {/* Color swatches */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          {STROKE_COLORS.map(c => {
            const active = c.value === color && !eraserActive;
            return (
              <div
                key={c.key} role="button" aria-label={`Color ${c.label}`}
                onClick={() => { onColorChange(c.value); onEraserToggle(false); }}
                style={{
                  width: 36, height: TOUCH.minTarget,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: c.value,
                  border: `1px solid ${COLORS.borderLight}`,
                  // Color-INDEPENDENT selection ring: a bg-colored gap then an accent
                  // ring — reads on ANY swatch incl. amber (a `2px accent` border is
                  // invisible on the amber swatch since swatch ≈ accent).
                  boxShadow: active ? `0 0 0 2px ${COLORS.bg}, 0 0 0 4px ${COLORS.accent}` : 'none',
                  transition: 'box-shadow .12s',
                }} />
              </div>
            );
          })}
        </div>

        <span style={{ width: 1, height: 28, background: COLORS.surfaceLight }} />

        {/* Width pills */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {([
            { key: 'thin',   icon: <Minus size={16} strokeWidth={2} /> },
            { key: 'medium', icon: <Equal size={16} strokeWidth={2.5} /> },
            { key: 'thick',  icon: <Equal size={18} strokeWidth={4} /> },
          ]).map(w => {
            const active = w.key === sizeKey;
            return (
              <div
                key={w.key} role="button" aria-label={`Width ${w.key}`}
                onClick={() => onSizeChange(w.key)}
                style={{
                  width: 40, height: TOUCH.minTarget,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: RADIUS.sm,
                  background: active ? `${COLORS.accent}1f` : 'transparent',
                  border: `1px solid ${active ? COLORS.accent : 'transparent'}`,
                  color: active ? COLORS.accent : COLORS.textDim,
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >{w.icon}</div>
            );
          })}
        </div>

        <span style={{ width: 1, height: 28, background: COLORS.surfaceLight }} />

        {/* Actions: Undo / Redo / Eraser */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <IconBtn label={t('draw_toolbar_undo')} disabled={!canUndo} onClick={onUndo} icon={<Undo2 size={20} strokeWidth={2} />} />
          <IconBtn label={t('draw_toolbar_redo')} disabled={!canRedo} onClick={onRedo} icon={<Redo2 size={20} strokeWidth={2} />} />
          <IconBtn
            label={t('draw_toolbar_eraser')}
            active={eraserActive}
            onClick={() => onEraserToggle(!eraserActive)}
            icon={<Eraser size={20} strokeWidth={2} />}
          />
        </div>

        <span style={{ width: 1, height: 28, background: COLORS.surfaceLight }} />

        {/* Destructive + done */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <IconBtn
            label={t('draw_toolbar_clear_all')}
            disabled={!hasStrokes}
            danger
            onClick={() => setConfirmClear(true)}
            icon={<Trash2 size={20} strokeWidth={2} />}
          />
          <div
            role="button" aria-label={t('done')}
            onClick={onDone}
            style={{
              minWidth: 72, height: TOUCH.minTarget, padding: '0 14px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              borderRadius: RADIUS.sm,
              background: COLORS.accent, color: '#0b0f1a',
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              letterSpacing: '.3px',
            }}
          >
            <Check size={16} strokeWidth={2.5} /> {t('done')}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('draw_toolbar_clear_confirm_title')}
        message="This will remove every stroke on this point. Cannot be undone via Undo."
        confirmLabel={t('draw_toolbar_clear_all')}
        danger
        onConfirm={() => { onClear(); setConfirmClear(false); }}
      />
    </>
  );
}

function IconBtn({ label, icon, onClick, disabled, active, danger }) {
  const color = disabled ? COLORS.textMuted
    : active ? COLORS.accent
    : danger ? COLORS.danger
    : COLORS.text;
  const bg = active ? `${COLORS.accent}1f` : 'transparent';
  const border = active ? `1px solid ${COLORS.accent}` : `1px solid transparent`;
  return (
    <div
      role="button" aria-label={label}
      onClick={disabled ? undefined : onClick}
      style={{
        width: TOUCH.minTarget, height: TOUCH.minTarget,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: RADIUS.sm,
        background: bg, border, color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        WebkitTapHighlightColor: 'transparent',
      }}
    >{icon}</div>
  );
}
