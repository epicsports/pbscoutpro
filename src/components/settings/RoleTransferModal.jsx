import React, { useState, useEffect } from 'react';
import { Modal, Btn, Input } from '../ui';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useWorkspace } from '../../hooks/useWorkspace';
import { getRolesForUser, ROLES } from '../../utils/roleUtils';
import * as ds from '../../services/dataService';

const CONFIRM_TOKEN = 'TRANSFER';

/**
 * Admin transfer modal — § 38.3 atomic transfer semantics.
 *
 * Source admin keeps all non-admin roles (falls back to ['coach'] if admin
 * was their only role). Target gains 'admin' on top of existing roles.
 * Guard: user must type `TRANSFER` to enable the confirm button.
 *
 * @param {boolean} props.open
 * @param {object|null} props.target     - { uid, name, number } or null
 * @param {() => void} props.onClose
 * @param {() => void} props.onSuccess   - typically navigate to '/' + toast
 */
export default function RoleTransferModal({ open, target, onClose, onSuccess }) {
  const { t } = useLanguage();
  const { workspace, user } = useWorkspace();
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) { setConfirm(''); setError(null); }
  }, [open]);

  if (!open || !target || !workspace || !user) return null;

  // Preview post-transfer roles for both users.
  const myCurrent = getRolesForUser(workspace, user.uid);
  const myAfter = myCurrent.filter(r => r !== 'admin');
  const myFinal = myAfter.length > 0 ? myAfter : ['coach'];

  const theirCurrent = getRolesForUser(workspace, target.uid);
  const theirFinal = theirCurrent.includes('admin') ? theirCurrent : [...theirCurrent, 'admin'];

  const canConfirm = confirm.trim().toUpperCase() === CONFIRM_TOKEN && !saving;

  async function handleTransfer() {
    if (!canConfirm) return;
    setSaving(true);
    setError(null);
    try {
      await ds.transferAdmin(workspace.slug, user.uid, target.uid);
      onSuccess?.();
    } catch (e) {
      console.error('Admin transfer failed:', e);
      setError(e?.code || e?.message || 'unknown');
    } finally {
      setSaving(false);
    }
  }

  const targetLabel = `${target.name || '—'}${target.number ? ` #${target.number}` : ''}`;
  const warningBody = t('members_transfer_warning', {
    name: targetLabel,
    myFinal: myFinal.map(r => t(`role_${r}`) || r).join(', '),
    theirFinal: theirFinal.map(r => t(`role_${r}`) || r).join(', '),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('members_transfer_title') || 'Transfer admina'}
      footer={
        <div style={{ display: 'flex', gap: SPACE.sm, width: '100%' }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            {t('cancel')}
          </Btn>
          <Btn
            variant="danger"
            onClick={handleTransfer}
            disabled={!canConfirm}
            style={{ flex: 2 }}
          >{t('members_transfer_confirm') || 'Transferuj admina'}</Btn>
        </div>
      }
    >
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim,
        lineHeight: 1.55,
        padding: SPACE.md,
        background: `${COLORS.danger}10`,
        border: `1px solid ${COLORS.danger}40`,
        borderRadius: 8,
        marginBottom: SPACE.md,
      }}>{warningBody}</div>

      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
        color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase',
        marginBottom: SPACE.xs,
      }}>{t('members_transfer_confirm_label') || `Wpisz „${CONFIRM_TOKEN}" żeby kontynuować`}</div>
      <Input
        value={confirm}
        onChange={setConfirm}
        placeholder={CONFIRM_TOKEN}
        autoFocus
      />

      {error && (
        <div style={{
          marginTop: SPACE.sm,
          fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger,
        }}>{error}</div>
      )}
    </Modal>
  );
}
