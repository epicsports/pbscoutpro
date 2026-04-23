import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreBtn, ActionSheet, ConfirmModal } from '../ui';
import PlayerAvatar from '../PlayerAvatar';
import RoleChips from './RoleChips';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import * as ds from '../../services/dataService';

/**
 * MemberCard — one row per active workspace member (in `members[]` with
 * non-empty userRoles).
 *
 * Role chips are tappable INLINE for admins (bug B2, § 38.3): no more
 * separate Edit / Save / Cancel mode. Taps go directly to Firestore with
 * optimistic UI and revert on error. Non-admins see chips as read-only
 * pills. The last admin is protected at two layers:
 *   - role chip: 'admin' chip disabled with reason when adminCount===1
 *   - remove action: hidden when target is the last admin
 * Self-admin chip remains transfer-gated (admin cannot demote themselves
 * without first running Transfer admin; § 38.3 hard guardrail).
 *
 * @param {object} props.workspaceSlug
 * @param {string} props.uid                - member uid
 * @param {string[]} props.roles            - current userRoles[uid]
 * @param {boolean} props.isMe              - is this the current viewer
 * @param {boolean} props.isWorkspaceAdmin  - target holds admin via userRoles or adminUid
 * @param {boolean} props.isCurrentUserAdmin - current viewer holds admin
 * @param {number} props.adminCount         - total admins in workspace (for last-admin guard)
 * @param {object|null} props.linkedPlayer  - optional players/{X} doc via linkedUid
 * @param {object|null} props.team          - team doc for linkedPlayer.teamId
 * @param {string|null} props.displayName   - /users/{uid}.displayName (bug B1 fallback)
 * @param {string|null} props.email         - /users/{uid}.email
 * @param {(target) => void} props.onTransferAdmin - opens RoleTransferModal for this target
 */
export default function MemberCard({
  workspaceSlug, uid, roles, isMe, isWorkspaceAdmin,
  isCurrentUserAdmin = false, adminCount = 1,
  linkedPlayer, team, displayName, email, onTransferAdmin,
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Nullable pending-write buffer for instant chip feedback while the
  // Firestore write is in flight. `pendingRoles` is null outside of an
  // active write, so the canonical `roles` prop (from snapshot) drives
  // display by default and takes over naturally when the write lands.
  const [pendingRoles, setPendingRoles] = useState(null);
  const displayedRoles = pendingRoles || roles;

  // Bug B1 fallback chain: linked-player identity → /users/{uid} profile →
  // email → localized "member" label. UID fragment no longer surfaced.
  const memberLabel = t('member_fallback') || 'Member';
  const name = linkedPlayer?.nickname
    || linkedPlayer?.name
    || displayName
    || email
    || memberLabel;
  const number = linkedPlayer?.number;
  const teamName = team?.name;
  const pbliId = linkedPlayer?.pbliId
    ? String(linkedPlayer.pbliId).replace(/^#?/, '#')
    : null;

  // Role-chip gating. Two independent reasons a specific role may be
  // disabled; first match wins (self-protect takes priority since users
  // self-correct via Transfer, while last-admin is a system invariant).
  let disabledRole = null;
  let disabledReason = null;
  if (isMe && roles.includes('admin')) {
    disabledRole = 'admin';
    disabledReason = t('members_admin_self_protect')
      || 'Aby zmienić swoją rolę, najpierw przekaż admina';
  } else if (roles.includes('admin') && adminCount <= 1) {
    disabledRole = 'admin';
    disabledReason = t('members_admin_last_protect')
      || 'Nie można usunąć ostatniego admina workspace';
  }

  // RoleChips readOnly when viewer is not admin. Admins edit inline; no
  // separate Edit mode anymore.
  const chipsReadOnly = !isCurrentUserAdmin;

  async function handleRolesChange(next) {
    if (saving) return;
    setPendingRoles(next);
    setSaving(true);
    try {
      await ds.updateUserRoles(workspaceSlug, uid, next);
    } catch (e) {
      console.error('Update roles failed:', e);
    } finally {
      setSaving(false);
      setPendingRoles(null);
    }
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

  // Menu actions. Transfer is offered when the target isn't already admin
  // and isn't the viewer. Remove is hidden for self (self-leave is not
  // in scope of this brief) and for last-admin (B3 guardrail).
  const menuActions = [];
  if (!isWorkspaceAdmin && !isMe) {
    menuActions.push({
      label: t('members_transfer_admin') || 'Transferuj admina do tego użytkownika',
      onPress: () => onTransferAdmin({ uid, name, number }),
    });
  }
  const canRemove = !isMe && !(isWorkspaceAdmin && adminCount <= 1);
  if (canRemove) {
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
        opacity: saving ? 0.7 : 1,
        transition: 'opacity .15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
          <div
            onClick={isCurrentUserAdmin ? () => navigate(`/settings/members/${uid}`) : undefined}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: SPACE.md,
              minWidth: 0,
              cursor: isCurrentUserAdmin ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <PlayerAvatar player={linkedPlayer} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
                color: COLORS.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {name}{number ? ` #${number}` : ''}
                {linkedPlayer && (
                  <span title={t('members_linked') || 'Powiązany profil'} style={{
                    display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                    background: COLORS.success, marginLeft: 6, verticalAlign: 'middle',
                  }} />
                )}
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
          </div>
          {menuActions.length > 0 && <MoreBtn onClick={() => setMenuOpen(true)} />}
        </div>

        <RoleChips
          selected={displayedRoles}
          onChange={handleRolesChange}
          readOnly={chipsReadOnly}
          disabledRole={disabledRole}
          disabledReason={disabledReason}
        />
      </div>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={menuActions}
      />
      <ConfirmModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title={(t('members_remove_title_named') || 'Usunąć {name} z workspace?').replace('{name}', name)}
        message={t('members_remove_confirm_body')
          || 'Użytkownik straci dostęp do wszystkich turniejów, drużyn i danych scoutingowych w tym workspace. Profil gracza zostanie rozlinkowany.'}
        confirmLabel={t('members_remove') || 'Usuń z workspace'}
        danger
        onConfirm={handleRemove}
      />
    </>
  );
}
