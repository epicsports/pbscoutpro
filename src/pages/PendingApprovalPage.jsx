/**
 * PendingApprovalPage — § 38.13 admin approval gate.
 *
 * Shown when user is linked (PBLI onboarding done) but `userRoles[uid] = []`.
 * Blocks all app access until admin assigns at least one role via Settings →
 * Members (coming in Commit 2).
 */
import React from 'react';
import { Btn } from '../components/ui';
import { useWorkspace } from '../hooks/useWorkspace';
import { useLanguage } from '../hooks/useLanguage';
import { ADMIN_EMAILS } from '../utils/roleUtils';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../utils/theme';

export default function PendingApprovalPage() {
  const { t } = useLanguage();
  const { linkedPlayer, signOutUser } = useWorkspace();

  const body = t('pending_approval_body', {
    name: linkedPlayer?.nickname || linkedPlayer?.name || '—',
    number: linkedPlayer?.number || '—',
    adminEmail: ADMIN_EMAILS[0] || 'admin',
  });

  const outer = {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: COLORS.bg,
    padding: SPACE.lg,
    zIndex: 50,
  };
  const card = {
    width: '100%', maxWidth: 420,
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.xl,
    padding: `${SPACE.xl}px ${SPACE.lg}px`,
    display: 'flex', flexDirection: 'column', gap: SPACE.md,
  };

  return (
    <div style={outer}>
      <div style={card}>
        <div style={{
          fontFamily: FONT, fontSize: 21, fontWeight: 700,
          color: COLORS.text, letterSpacing: '-0.01em',
        }}>{t('pending_approval_title')}</div>

        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, color: COLORS.textDim,
          lineHeight: 1.5,
        }}>{body}</div>

        <Btn
          variant="accent"
          size="lg"
          onClick={() => window.location.reload()}
          style={{ width: '100%', justifyContent: 'center', minHeight: 52 }}
        >{t('pending_approval_refresh')}</Btn>

        <Btn
          variant="ghost"
          onClick={signOutUser}
          style={{ width: '100%', justifyContent: 'center' }}
        >{t('pending_approval_signout')}</Btn>
      </div>
    </div>
  );
}
