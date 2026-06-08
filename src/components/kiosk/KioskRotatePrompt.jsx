import React from 'react';
import { RotateCw, Tablet } from 'lucide-react';
import { COLORS, FONT, TOUCH } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * KioskRotatePrompt — lobby fallback screen, two variants (Part 2, 2026-06-06):
 *
 *   variant='rotate' (default) — portrait TABLET that WOULD fit once rotated.
 *     The lobby is a landscape ≥1024 design (§27 — the 5-tile grid can't meet
 *     the size floor below 1024px). On orientationchange the parent re-evaluates
 *     `useKioskMode` and swaps to the real lobby. §27 floor preserved.
 *   variant='needsDevice' — device that can't fit in EITHER orientation (phone /
 *     too-small window). Rotating wouldn't help, so we show an HONEST "needs a
 *     tablet/laptop in landscape" message instead of a futile rotate affordance.
 */
export default function KioskRotatePrompt({ onBack, variant = 'rotate', title: titleProp, msg: msgProp }) {
  const { t } = useLanguage();
  const needsDevice = variant === 'needsDevice';
  const Icon = needsDevice ? Tablet : RotateCw;
  // Optional title/msg overrides let non-kiosk callers reuse the rotate idiom
  // with their own copy (e.g. § Hitability landscape-maximize). Kiosk callers
  // pass neither → unchanged.
  const title = titleProp || (needsDevice ? t('kiosk_needs_device_title') : t('kiosk_rotate_title'));
  const msg = msgProp || (needsDevice ? t('kiosk_needs_device_msg') : t('kiosk_rotate_msg'));
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: COLORS.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 18, padding: 28, textAlign: 'center',
    }}>
      <Icon size={48} color={COLORS.accent} strokeWidth={1.5} />
      <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 800, color: COLORS.text }}>
        {title}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: 14, fontWeight: 500, color: COLORS.textMuted,
        maxWidth: 320, lineHeight: 1.5,
      }}>
        {msg}
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
