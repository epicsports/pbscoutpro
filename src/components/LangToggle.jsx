import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { FONT, COLORS } from '../utils/theme';

/**
 * LangToggle — single pill, tap toggles PL↔EN.
 * Shows current language flag + code. Minimal footprint in header.
 */
export default function LangToggle() {
  const { lang, setLang } = useLanguage();
  const next = lang === 'pl' ? 'en' : 'pl';
  const flag = lang === 'pl' ? '🇵🇱' : '🇬🇧';
  return (
    <div onClick={() => setLang(next)} style={{
      fontFamily: FONT, fontSize: 11, fontWeight: 700,
      color: COLORS.textMuted,
      padding: '4px 7px', borderRadius: 6, cursor: 'pointer',
      background: `${COLORS.accent}10`,
      border: `1px solid ${COLORS.accent}25`,
      minHeight: 28, display: 'flex', alignItems: 'center', gap: 3,
      WebkitTapHighlightColor: 'transparent',
      letterSpacing: 0.3,
    }}>
      {flag} {lang.toUpperCase()}
    </div>
  );
}
