import React, { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useViewAs } from '../hooks/useViewAs';
import ViewAsDropdown from './ViewAsDropdown';
import { COLORS, FONT } from '../utils/theme';

/**
 * ViewAsIndicator — mandatory, non-dismissable visual marker of active
 * impersonation (§ 38.5). Rendered at app root, z-index 9999 to overlay
 * Modal (z:100), ActionSheet (z:91) and OfflineBanner (z:200).
 *
 * Two elements:
 *   1. 2px amber strip across the viewport top (persistent status line)
 *   2. Bottom-right pill — tap → re-opens ViewAsDropdown; ✕ → exitImpersonation
 *
 * Pill is positioned above BottomNav (~60px + safe-area) so the nav bar stays
 * tappable. Brief specifies `bottom: 16` but that would occlude navigation
 * — clearance respects BottomNav height; visual intent (bottom-right, always
 * visible) preserved.
 */
export default function ViewAsIndicator() {
  const { t } = useLanguage();
  const { isImpersonating, viewAs, exitImpersonation } = useViewAs();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!isImpersonating || !viewAs) return null;

  const roleLabel = t(`view_as_role_${viewAs.role}`);
  const pillText = typeof t('view_as_indicator_pill') === 'function'
    ? t('view_as_indicator_pill', { role: roleLabel })
    : `${t('view_as_indicator_pill')} ${roleLabel}`;

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 2,
        background: COLORS.accent,
        zIndex: 9999,
        pointerEvents: 'none',
      }} />
      <div
        onClick={() => setDropdownOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          right: 16,
          zIndex: 9999,
          display: 'flex', alignItems: 'center',
          paddingLeft: 14,
          minHeight: 44,
          borderRadius: 999,
          background: COLORS.accentGradient,
          boxShadow: COLORS.accentGlow,
          fontFamily: FONT, fontSize: 12, fontWeight: 700,
          color: '#000',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <span style={{ letterSpacing: '.2px' }}>{pillText}</span>
        {/* Exit × — own tap target ≥44×44 per § 27 so it's independently tappable. */}
        <span
          onClick={(e) => { e.stopPropagation(); exitImpersonation(); }}
          role="button"
          aria-label="Exit impersonation"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 44, minHeight: 44,
            marginLeft: 6,
            borderTopRightRadius: 999,
            borderBottomRightRadius: 999,
            background: '#00000018',
            fontSize: 18, lineHeight: 1, fontWeight: 800,
            color: '#000',
          }}>×</span>
      </div>
      <ViewAsDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </>
  );
}
