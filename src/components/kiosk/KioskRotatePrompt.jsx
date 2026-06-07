import React from 'react';
import { RotateCw } from 'lucide-react';
import { COLORS, FONT, TOUCH } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * KioskRotatePrompt — shown when the coach ENTERS the KIOSK from portrait (the
 * scout-editor "OPEN KIOSK" force-entry, 2026-06-07). The KIOSK lobby/summary
 * is a landscape ≥1024 design (§27 — the 5-tile grid can't meet the size floor
 * below 1024px), so instead of the cramped layout we ask the coach to rotate.
 * On orientationchange the parent re-evaluates `useKioskCompatible` and swaps to
 * the real lobby/summary. §27 floor preserved (tiles only render ≥1024).
 */
export default function KioskRotatePrompt({ onBack }) {
  const { t } = useLanguage();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: COLORS.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 18, padding: 28, textAlign: 'center',
    }}>
      <RotateCw size={48} color={COLORS.accent} strokeWidth={1.5} />
      <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 800, color: COLORS.text }}>
        {t('kiosk_rotate_title')}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: 14, fontWeight: 500, color: COLORS.textMuted,
        maxWidth: 320, lineHeight: 1.5,
      }}>
        {t('kiosk_rotate_msg')}
      </div>
      {onBack && (
        <div onClick={onBack} role="button" style={{
          marginTop: 8, minHeight: TOUCH.minTarget, padding: '10px 20px',
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.accent,
          WebkitTapHighlightColor: 'transparent',
        }}>
          {t('kiosk_rotate_back')}
        </div>
      )}
    </div>
  );
}
