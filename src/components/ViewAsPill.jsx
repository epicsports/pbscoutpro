import React, { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { useViewAs } from '../hooks/useViewAs';
import ViewAsDropdown from './ViewAsDropdown';
import { MoreItem } from './tabs/MoreShell';
import { COLORS, FONT } from '../utils/theme';

/**
 * ViewAsPill — admin-only entry point to the View Switcher (§ 38.5).
 *
 * Visibility is gated on REAL admin status (`realIsAdmin`), never on
 * `effectiveIsAdmin`, so the pill stays visible even when an admin impersonates
 * viewer/player — it IS the escape hatch (§ 38.10 anti-pattern).
 *
 * Rendered inside the Account section of MoreTabContent.
 */
export default function ViewAsPill() {
  const { t } = useLanguage();
  const { realIsAdmin, isImpersonating, viewAs } = useViewAs();
  const [open, setOpen] = useState(false);

  if (!realIsAdmin) return null;

  const roleLabel = viewAs ? t(`view_as_role_${viewAs.role}`) : null;
  const activeText = isImpersonating ? t('view_as_pill_active', { role: roleLabel }) : null;

  // Exit lives inside the dropdown (as a row) and on ViewAsIndicator ×. We
  // don't nest an exit button inside the MoreItem's right slot — it would
  // fall below the 44×44 touch-target minimum (§ 27).
  return (
    <>
      <MoreItem
        icon="👁"
        label={t('view_as_pill_label')}
        sub={isImpersonating ? activeText : undefined}
        onClick={() => setOpen(true)}
        rightSlot={isImpersonating ? <ActiveBadge roleLabel={roleLabel} /> : null}
      />
      <ViewAsDropdown open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ActiveBadge({ roleLabel }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 10px', marginRight: 4,
      borderRadius: 6,
      background: `${COLORS.accent}12`,
      border: `1px solid ${COLORS.accent}40`,
      fontFamily: FONT, fontSize: 11, fontWeight: 700,
      color: COLORS.accent,
      letterSpacing: '.3px',
    }}>{roleLabel}</span>
  );
}
