import React, { useEffect, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { MoreItem } from './tabs/MoreShell';
import { COLORS, FONT } from '../utils/theme';

/**
 * ViewAsPlaceholder — "Podgląd jako" entry in the ADMIN settings section.
 *
 * Hotfix 2026-04-24: the full View Switcher (§ 38.5) is dormant while the
 * UX direction settles. This placeholder replaces the old ViewAsPill
 * dropdown. Tap shows a brief "Funkcja wkrótce" toast. No state change,
 * no floating indicator. When the feature is revived, restore the
 * ViewAsPill + ViewAsIndicator render points flagged in that commit.
 */
export default function ViewAsPlaceholder() {
  const { t } = useLanguage();
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(false), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <>
      <MoreItem
        icon="👁"
        label={t('view_as_placeholder') || 'Podgląd jako'}
        onClick={() => setToast(true)}
      />
      {toast && (
        <div style={{
          position: 'fixed',
          left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(130px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 320, width: 'calc(100% - 32px)',
          padding: '10px 14px',
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          color: COLORS.text,
          fontFamily: FONT, fontSize: 13, fontWeight: 600,
          textAlign: 'center',
          zIndex: 9998,
          pointerEvents: 'none',
        }}>{t('view_as_coming_soon') || 'Funkcja wkrótce'}</div>
      )}
    </>
  );
}
