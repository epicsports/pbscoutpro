import React, { useState } from 'react';
import { ActionSheet } from './ui';
import ViewAsPlayerPicker from './ViewAsPlayerPicker';
import { useLanguage } from '../hooks/useLanguage';
import { useViewAs } from '../hooks/useViewAs';
import { ROLES } from '../utils/roleUtils';

/**
 * ViewAsDropdown — 5-role picker + exit option (§ 38.5).
 *
 * All 5 canonical roles are listed regardless of the admin's own role set —
 * impersonation previews UI for any role, not just roles they hold.
 * Selecting 'player' opens a PlayerPicker to choose whose perspective to
 * impersonate (needed for self-log flows).
 */
export default function ViewAsDropdown({ open, onClose }) {
  const { t } = useLanguage();
  const { setViewAs, isImpersonating, exitImpersonation } = useViewAs();
  const [pickerOpen, setPickerOpen] = useState(false);

  const roleActions = ROLES.map(role => ({
    label: t(`view_as_role_${role}`),
    onPress: () => {
      if (role === 'player') {
        setPickerOpen(true);
      } else {
        setViewAs({ role });
      }
    },
  }));

  const actions = isImpersonating
    ? [
        ...roleActions,
        { separator: true },
        { label: t('view_as_exit'), onPress: () => exitImpersonation(), danger: true },
      ]
    : roleActions;

  return (
    <>
      <ActionSheet
        open={open}
        onClose={onClose}
        title={t('view_as_dropdown_title')}
        actions={actions}
      />
      <ViewAsPlayerPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(playerId) => {
          setViewAs({ role: 'player', playerId });
          setPickerOpen(false);
          onClose();
        }}
      />
    </>
  );
}
