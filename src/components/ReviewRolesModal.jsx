import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Btn } from './ui';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';

/**
 * ReviewRolesModal — shown on admin's first login after role migration
 * (`rolesVersion === 2 && migrationReviewedAt === null`). Prompts admin to
 * review the auto-assigned roles in Settings → Members. Dismissable; once
 * dismissed, `migrationReviewedAt` is stamped so it never shows again.
 */
export default function ReviewRolesModal() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { workspace, user, isAdmin } = useWorkspace();
  const [dismissing, setDismissing] = useState(false);

  const shouldShow = isAdmin
    && workspace?.rolesVersion === 2
    && !workspace?.migrationReviewedAt;
  if (!shouldShow) return null;

  const memberCount = workspace?.members?.length || 0;
  const body = t('review_roles_body', { count: memberCount });

  async function handleDismiss() {
    if (!workspace?.slug || dismissing) return;
    setDismissing(true);
    try {
      await ds.dismissMemberReview(workspace.slug);
    } catch (e) {
      console.warn('dismissMemberReview failed:', e?.code);
    } finally {
      setDismissing(false);
    }
  }

  async function handleGoToSettings() {
    await handleDismiss();
    navigate('/settings/members');
  }

  return (
    <Modal
      open={true}
      onClose={handleDismiss}
      title={t('review_roles_title') || 'Sprawdź role członków'}
      footer={
        <div style={{ display: 'flex', gap: SPACE.sm, width: '100%' }}>
          <Btn variant="ghost" onClick={handleDismiss} disabled={dismissing} style={{ flex: 1 }}>
            {t('review_roles_later') || 'Zrobię to później'}
          </Btn>
          <Btn variant="accent" onClick={handleGoToSettings} disabled={dismissing} style={{ flex: 2 }}>
            {t('review_roles_go') || 'Przejdź do ustawień'}
          </Btn>
        </div>
      }
    >
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.base, color: COLORS.textDim,
        lineHeight: 1.55,
      }}>{body}</div>
    </Modal>
  );
}
