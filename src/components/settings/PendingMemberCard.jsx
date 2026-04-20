import React, { useState } from 'react';
import { Btn, MoreBtn, ActionSheet, ConfirmModal } from '../ui';
import PlayerAvatar from '../PlayerAvatar';
import RoleChips from './RoleChips';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import * as ds from '../../services/dataService';

/**
 * PendingMemberCard — one row per user in workspace.pendingApprovals[].
 *
 * Shows linked player identity + role multi-select + Approve. `⋮` menu
 * exposes "Reject" which removes the user from the workspace and unlinks
 * their player doc.
 *
 * @param {object} props.workspaceSlug
 * @param {string} props.uid                - pending user uid
 * @param {object|null} props.linkedPlayer  - the players/{X} doc matched via linkedUid === uid
 * @param {object|null} props.team          - team doc for linkedPlayer.teamId (name display)
 * @param {string|null} props.email         - user email from /users/{uid} (if cached; may be null)
 */
export default function PendingMemberCard({ workspaceSlug, uid, linkedPlayer, team, email }) {
  const { t } = useLanguage();
  // Default pre-selection: 'player' — most common case for PBLI-linked roster
  // members. Admin can toggle to add coach/scout/etc.
  const [selected, setSelected] = useState(['player']);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const name = linkedPlayer?.nickname || linkedPlayer?.name || '—';
  const number = linkedPlayer?.number;
  const pbliId = linkedPlayer?.pbliId
    ? String(linkedPlayer.pbliId).replace(/^#?/, '#')
    : null;
  const teamName = team?.name;

  async function handleApprove() {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    try {
      await ds.approveUserRoles(workspaceSlug, uid, selected);
    } catch (e) {
      console.error('Approve failed:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    setSaving(true);
    try {
      await ds.removeMember(workspaceSlug, uid);
    } catch (e) {
      console.error('Reject failed:', e);
    } finally {
      setSaving(false);
      setRejectOpen(false);
    }
  }

  return (
    <>
      <div style={{
        background: COLORS.surface,
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
          <MoreBtn onClick={() => setMenuOpen(true)} />
        </div>

        <RoleChips selected={selected} onChange={setSelected} />

        <Btn
          variant="accent"
          onClick={handleApprove}
          disabled={selected.length === 0 || saving}
          style={{ width: '100%', justifyContent: 'center', minHeight: TOUCH.targetLg }}
        >{t('members_approve') || 'Zatwierdź'}</Btn>
      </div>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={[
          { label: t('members_reject') || 'Odrzuć', danger: true, onPress: () => setRejectOpen(true) },
        ]}
      />
      <ConfirmModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t('members_reject_title') || 'Odrzucić tego użytkownika?'}
        message={t('members_reject_confirm_body') || 'Użytkownik zostanie usunięty z workspace. Profil gracza zostanie rozlinkowany i będzie dostępny do ponownego podłączenia.'}
        confirmLabel={t('members_reject') || 'Odrzuć'}
        danger
        onConfirm={handleReject}
      />
    </>
  );
}
