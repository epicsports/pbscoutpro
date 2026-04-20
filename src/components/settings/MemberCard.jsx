import React, { useState, useEffect } from 'react';
import { Btn, MoreBtn, ActionSheet, ConfirmModal } from '../ui';
import PlayerAvatar from '../PlayerAvatar';
import RoleChips from './RoleChips';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import * as ds from '../../services/dataService';

/**
 * MemberCard — one row per active workspace member (in `members[]` with
 * non-empty userRoles). Chips read-only by default; tap "Edytuj" to toggle
 * into edit mode with Save/Cancel. Current admin cannot toggle their own
 * `admin` chip — they must transfer first (self-protection, § 38.3).
 *
 * @param {object} props.workspaceSlug
 * @param {string} props.uid               - member uid
 * @param {string[]} props.roles           - current userRoles[uid]
 * @param {boolean} props.isMe             - is this the current viewer
 * @param {boolean} props.isWorkspaceAdmin - target holds admin via userRoles or adminUid
 * @param {object|null} props.linkedPlayer - optional players/{X} doc via linkedUid
 * @param {object|null} props.team         - team doc for linkedPlayer.teamId
 * @param {string|null} props.email        - optional cached email
 * @param {(target) => void} props.onTransferAdmin - opens RoleTransferModal for this target
 */
export default function MemberCard({
  workspaceSlug, uid, roles, isMe, isWorkspaceAdmin,
  linkedPlayer, team, email, onTransferAdmin,
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(roles);
  const [menuOpen, setMenuOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync draft when parent-provided roles change (another admin tab edited).
  useEffect(() => { if (!editing) setDraft(roles); }, [roles, editing]);

  const name = linkedPlayer?.nickname || linkedPlayer?.name || uid.slice(0, 6);
  const number = linkedPlayer?.number;
  const teamName = team?.name;
  const pbliId = linkedPlayer?.pbliId
    ? String(linkedPlayer.pbliId).replace(/^#?/, '#')
    : null;

  // Self-protect: if this card is for the current viewer AND they hold admin,
  // the admin chip is disabled until they transfer.
  const disabledRole = (isMe && roles.includes('admin')) ? 'admin' : null;
  const disabledReason = disabledRole ? (t('members_admin_self_protect') || 'Aby zmienić swoją rolę, najpierw przekaż admina') : null;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await ds.updateUserRoles(workspaceSlug, uid, draft);
      setEditing(false);
    } catch (e) {
      console.error('Update roles failed:', e);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(roles);
    setEditing(false);
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await ds.removeMember(workspaceSlug, uid);
    } catch (e) {
      console.error('Remove member failed:', e);
    } finally {
      setSaving(false);
      setRemoveOpen(false);
    }
  }

  // Menu actions: Transfer (hidden if target already admin or is me), Remove.
  const menuActions = [];
  if (!isWorkspaceAdmin && !isMe) {
    menuActions.push({
      label: t('members_transfer_admin') || 'Transferuj admina do tego użytkownika',
      onPress: () => onTransferAdmin({ uid, name, number }),
    });
  }
  if (!isMe) {
    menuActions.push({
      label: t('members_remove') || 'Usuń z workspace',
      danger: true,
      onPress: () => setRemoveOpen(true),
    });
  }

  return (
    <>
      <div style={{
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        padding: SPACE.md,
        display: 'flex', flexDirection: 'column', gap: SPACE.sm,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
          <PlayerAvatar player={linkedPlayer} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
              color: COLORS.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name}{number ? ` #${number}` : ''}
              {isMe && (
                <span style={{
                  marginLeft: SPACE.xs,
                  padding: '1px 6px',
                  borderRadius: RADIUS.xs,
                  background: `${COLORS.textMuted}20`,
                  color: COLORS.textDim,
                  fontSize: FONT_SIZE.xxs, fontWeight: 700, letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}>{t('members_you') || 'ty'}</span>
              )}
              {teamName && (
                <span style={{ fontWeight: 500, color: COLORS.textDim }}> · {teamName}</span>
              )}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
              marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {pbliId ? `PBLI ${pbliId}` : ''}
              {pbliId && email ? ' · ' : ''}
              {email || ''}
            </div>
          </div>
          {menuActions.length > 0 && <MoreBtn onClick={() => setMenuOpen(true)} />}
        </div>

        <RoleChips
          selected={editing ? draft : roles}
          onChange={setDraft}
          readOnly={!editing}
          disabledRole={editing ? disabledRole : null}
          disabledReason={disabledReason}
        />

        {editing ? (
          <div style={{ display: 'flex', gap: SPACE.sm }}>
            <Btn variant="ghost" onClick={handleCancel} style={{ flex: 1, justifyContent: 'center' }}>
              {t('cancel')}
            </Btn>
            <Btn
              variant="accent"
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 2, justifyContent: 'center', minHeight: TOUCH.minTarget }}
            >{t('save')}</Btn>
          </div>
        ) : (
          <Btn
            variant="default"
            onClick={() => setEditing(true)}
            style={{ width: '100%', justifyContent: 'center' }}
          >{t('edit')}</Btn>
        )}
      </div>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={menuActions}
      />
      <ConfirmModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title={t('members_remove_title') || 'Usunąć z workspace?'}
        message={t('members_remove_confirm_body') || 'Użytkownik straci dostęp. Profil gracza zostanie rozlinkowany.'}
        confirmLabel={t('members_remove') || 'Usuń z workspace'}
        danger
        onConfirm={handleRemove}
      />
    </>
  );
}
