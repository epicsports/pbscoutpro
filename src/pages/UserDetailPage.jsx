import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { Btn, ConfirmModal, Loading } from '../components/ui';
import RoleChips from '../components/settings/RoleChips';
import LinkProfileModal from '../components/settings/LinkProfileModal';
import PlayerAvatar from '../components/PlayerAvatar';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin';
import { usePlayers, useActiveTeams } from '../hooks/useFirestore';
import { invalidateUserName } from '../hooks/useUserNames';
import { getRolesForUser, hasRole } from '../utils/roleUtils';
import * as ds from '../services/dataService';

/**
 * UserDetailPage (§ 50.4) — admin-only deep view of a single workspace
 * member. AdminGuard wraps the route in App.jsx.
 *
 * Sections:
 *   1. Identity (avatar + email + uid + joined)
 *   2. Linked profile (player) — link / change / unlink
 *   3. Roles (deliberate edit, separate from MembersPage chip toggles)
 *   4. Danger zone — soft-disable account
 *
 * Soft-delete writes user.disabled = true via ADMIN_EMAILS allowlist
 * (rules carve-out § 50.5). User can authenticate but AppRoutes' bootstrap
 * check force-signs-out and shows "Konto wyłączone" message.
 */
export default function UserDetailPage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { workspace, user: currentUser } = useWorkspace();
  const { players } = usePlayers();
  const { teams } = useActiveTeams();
  const isSuperAdmin = useIsSuperAdmin();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [pendingGlobalRole, setPendingGlobalRole] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reloadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    } catch (e) {
      console.error('Load user profile failed:', e);
    } finally {
      setProfileLoading(false);
    }
  }, [uid]);

  useEffect(() => { reloadProfile(); }, [reloadProfile]);

  const linkedPlayer = useMemo(
    () => (players || []).find(p => p.linkedUid === uid) || null,
    [players, uid],
  );
  const linkedTeam = linkedPlayer?.teamId
    ? (teams || []).find(team => team.id === linkedPlayer.teamId) || null
    : null;

  const roles = useMemo(() => getRolesForUser(workspace, uid), [workspace, uid]);
  const isMe = currentUser?.uid === uid;
  const isWorkspaceAdmin = hasRole(roles, 'admin') || workspace?.adminUid === uid;
  const adminCount = useMemo(() => {
    const userRoles = workspace?.userRoles || {};
    return Object.values(userRoles).filter(r => Array.isArray(r) && r.includes('admin')).length
      + (workspace?.adminUid && !userRoles[workspace.adminUid]?.includes('admin') ? 1 : 0);
  }, [workspace]);

  // Disable role edit on the same conditions as MembersPage chip gate.
  let disabledRole = null;
  let disabledReason = null;
  if (isMe && roles.includes('admin')) {
    disabledRole = 'admin';
    disabledReason = t('members_admin_self_protect') || 'Aby zmienić swoją rolę, najpierw przekaż admina';
  } else if (roles.includes('admin') && adminCount <= 1) {
    disabledRole = 'admin';
    disabledReason = t('members_admin_last_protect') || 'Nie można usunąć ostatniego admina workspace';
  }

  const handleRolesChange = async (next) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await ds.updateUserRoles(workspace.slug, uid, next);
    } catch (e) {
      console.error('Update roles failed:', e);
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  // Global role (§ 66.2, Phase 3.b). pendingGlobalRole drives the confirm
  // modal: 'super_admin' = promote, 'standard' = revoke, null = closed.
  const currentGlobalRole = profile?.globalRole === 'super_admin' ? 'super_admin' : null;

  const handleGlobalRoleChange = async () => {
    if (busy || pendingGlobalRole === null) return;
    const target = pendingGlobalRole === 'super_admin' ? 'super_admin' : null;
    setBusy(true); setError(null);
    try {
      await ds.setUserGlobalRole(uid, target);
      invalidateUserName(uid);
      await reloadProfile();
    } catch (e) {
      console.error('Set global role failed:', e);
      setError(e.message || String(e));
    } finally {
      setBusy(false);
      setPendingGlobalRole(null);
    }
  };

  const handleLinkSelect = async (player) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await ds.adminLinkPlayer(player.id, uid);
      setLinkModalOpen(false);
    } catch (e) {
      console.error('Link player failed:', e);
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!linkedPlayer || busy) return;
    setBusy(true); setError(null);
    try {
      await ds.adminUnlinkPlayer(linkedPlayer.id);
      setUnlinkOpen(false);
    } catch (e) {
      console.error('Unlink player failed:', e);
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSoftDisable = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await ds.softDisableUser(uid, currentUser?.email || null);
      setDisableOpen(false);
      invalidateUserName(uid);
      await reloadProfile();
    } catch (e) {
      console.error('Disable user failed:', e);
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleReEnable = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await ds.reEnableUser(uid);
      invalidateUserName(uid);
      await reloadProfile();
    } catch (e) {
      console.error('Re-enable user failed:', e);
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (profileLoading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: '100dvh' }}>
        <PageHeader back={{ to: '/settings/members' }} title={t('user_detail_title') || 'Użytkownik'} />
        <Loading text={t('loading') || 'Wczytywanie…'} />
      </div>
    );
  }

  const displayName = profile?.displayName || linkedPlayer?.nickname || linkedPlayer?.name || profile?.email || uid.slice(0, 8);
  const isDisabled = profile?.disabled === true;

  return (
    <Screen
      archetype="detail"
      style={{ background: COLORS.bg, minHeight: '100dvh' }}
      header={
        <PageHeader
          back={{ to: '/settings/members' }}
          title={displayName}
          subtitle={profile?.email || uid.slice(0, 12)}
        />
      }
    >
      {isDisabled && (
        <DisabledBanner
          t={t}
          onReEnable={handleReEnable}
          busy={busy}
        />
      )}

      <div data-testid="user-detail-loaded" style={{
        padding: `${SPACE.md}px ${SPACE.lg}px`,
        display: 'flex', flexDirection: 'column', gap: SPACE.lg,
        maxWidth: 720, margin: '0 auto',
      }}>

        {/* 1. Identity */}
        <Section title={t('user_metadata_section') || 'Metadane'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: SPACE.md }}>
            <PlayerAvatar player={linkedPlayer} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 700,
                color: COLORS.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{displayName}</div>
              {profile?.email && (
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, marginTop: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{profile.email}</div>
              )}
            </div>
          </div>
          <Divider />
          <Row label={t('user_uid_label') || 'UID'} value={uid} mono />
          {profile?.createdAt && (
            <Row label={t('user_joined_label') || 'Dołączył'} value={fmtTs(profile.createdAt)} />
          )}
        </Section>

        {/* 2. Linked profile */}
        <Section title={t('user_linked_section') || 'Powiązany profil'}>
          {linkedPlayer ? (
            <div style={{ padding: SPACE.md, display: 'flex', alignItems: 'center', gap: SPACE.md }}>
              <PlayerAvatar player={linkedPlayer} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {linkedPlayer.nickname || linkedPlayer.name}
                  {linkedPlayer.number ? ` #${linkedPlayer.number}` : ''}
                  {linkedTeam && (
                    <span style={{ fontWeight: 500, color: COLORS.textDim }}> · {linkedTeam.name}</span>
                  )}
                </div>
                {linkedPlayer.pbliId && (
                  <div style={{
                    fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2,
                  }}>PBLI #{String(linkedPlayer.pbliId).replace(/^#?/, '')}</div>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              padding: SPACE.md,
              fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
            }}>{t('user_no_link') || 'Brak połączonego profilu'}</div>
          )}
          <Divider />
          <div style={{ padding: SPACE.md, display: 'flex', gap: SPACE.sm, flexWrap: 'wrap' }}>
            <Btn variant="accent" onClick={() => setLinkModalOpen(true)} disabled={busy}>
              {linkedPlayer ? (t('user_change_link_btn') || 'Zmień powiązanie') : (t('user_link_btn') || 'Połącz z profilem')}
            </Btn>
            {linkedPlayer && (
              <Btn variant="default" onClick={() => setUnlinkOpen(true)} disabled={busy}>
                {t('user_unlink_btn') || 'Rozłącz'}
              </Btn>
            )}
          </div>
        </Section>

        {/* 3. Roles */}
        <Section title={t('user_role_section') || 'Role'}>
          <div style={{ padding: SPACE.md }}>
            <RoleChips
              selected={roles}
              onChange={handleRolesChange}
              readOnly={busy}
              disabledRole={disabledRole}
              disabledReason={disabledReason}
            />
          </div>
        </Section>

        {/* 3b. Global role — super_admin only (§ 66.2, Phase 3.b) */}
        {isSuperAdmin && (
          <Section title={t('user_global_role_section') || 'Global role'}>
            <GlobalRoleOption
              label={t('user_global_role_standard') || 'Standard user'}
              selected={currentGlobalRole === null}
              first
              disabled={busy}
              onClick={() => { if (currentGlobalRole !== null) setPendingGlobalRole('standard'); }}
            />
            <GlobalRoleOption
              label={t('user_global_role_super') || 'Super admin'}
              description={t('user_global_role_desc')
                || 'Super admin manages users, roles, and global resources across all workspaces.'}
              selected={currentGlobalRole === 'super_admin'}
              disabled={busy}
              onClick={() => { if (currentGlobalRole !== 'super_admin') setPendingGlobalRole('super_admin'); }}
            />
          </Section>
        )}

        {error && (
          <div style={{
            padding: SPACE.md,
            background: `${COLORS.danger}12`,
            border: `1px solid ${COLORS.danger}55`,
            borderRadius: RADIUS.md,
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.danger,
          }}>{error}</div>
        )}

        {/* 4. Danger zone */}
        {!isMe && !isDisabled && (
          <Section title={t('danger_zone') || 'Strefa zagrożenia'} danger>
            <div style={{ padding: SPACE.md }}>
              <Btn variant="danger" onClick={() => setDisableOpen(true)} disabled={busy || (isWorkspaceAdmin && adminCount <= 1)}>
                {t('user_disable_btn') || 'Usuń usera'}
              </Btn>
              {(isWorkspaceAdmin && adminCount <= 1) && (
                <div style={{
                  marginTop: SPACE.sm,
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
                }}>{t('members_admin_last_protect') || 'Nie można usunąć ostatniego admina workspace'}</div>
              )}
            </div>
          </Section>
        )}
      </div>

      <LinkProfileModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        players={players || []}
        currentLinkedPlayer={linkedPlayer}
        onSelect={handleLinkSelect}
        busy={busy}
      />

      <ConfirmModal
        open={unlinkOpen}
        onClose={() => !busy && setUnlinkOpen(false)}
        title={t('user_unlink_title') || 'Rozłączyć profil?'}
        message={t('user_unlink_body') || 'User straci powiązanie z profilem.'}
        confirmLabel={t('user_unlink_btn') || 'Rozłącz'}
        danger
        onConfirm={handleUnlink}
      />

      <ConfirmModal
        open={disableOpen}
        onClose={() => !busy && setDisableOpen(false)}
        title={t('user_disable_title') || 'Wyłączyć konto?'}
        message={t('user_disable_body') || 'Działanie nieodwracalne na poziomie klienta.'}
        confirmLabel={t('user_disable_btn') || 'Usuń usera'}
        danger
        onConfirm={handleSoftDisable}
      />

      <ConfirmModal
        open={pendingGlobalRole !== null}
        onClose={() => !busy && setPendingGlobalRole(null)}
        title={pendingGlobalRole === 'super_admin'
          ? (t('user_global_role_promote_title') || 'Grant super admin?')
          : (t('user_global_role_revoke_title') || 'Revoke super admin?')}
        message={pendingGlobalRole === 'super_admin'
          ? t('user_global_role_promote_body', displayName)
          : t('user_global_role_revoke_body', displayName)}
        confirmLabel={pendingGlobalRole === 'super_admin'
          ? (t('user_global_role_promote_btn') || 'Grant')
          : (t('user_global_role_revoke_btn') || 'Revoke')}
        onConfirm={handleGlobalRoleChange}
      />
    </Screen>
  );
}

/* ─── helpers ──────────────────────────────────────────────────────── */

function Section({ title, danger, children }) {
  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
        letterSpacing: 0.5, textTransform: 'uppercase',
        color: danger ? `${COLORS.danger}99` : COLORS.textMuted,
        padding: '0 4px 8px',
      }}>{title}</div>
      <div style={{
        background: COLORS.surfaceDark,
        border: `1px solid ${danger ? `${COLORS.danger}22` : COLORS.border}`,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
      }}>{children}</div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: SPACE.md,
      padding: `${SPACE.sm}px ${SPACE.md}px`, minHeight: 44,
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
        minWidth: 80, letterSpacing: 0.3,
      }}>{label}</div>
      <div style={{
        fontFamily: mono ? "'SF Mono', 'Consolas', monospace" : FONT,
        fontSize: mono ? FONT_SIZE.xs : FONT_SIZE.sm, color: COLORS.text,
        flex: 1, minWidth: 0, wordBreak: 'break-all',
      }}>{value}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: COLORS.border, margin: 0 }} />;
}

// GlobalRoleOption — one radio row in the Global role section. The selected
// dot uses COLORS.accent (amber) per § 27 "amber = active/selected state".
function GlobalRoleOption({ label, description, selected, first, disabled, onClick }) {
  return (
    <div
      onClick={disabled || selected ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: SPACE.md,
        padding: SPACE.md, minHeight: 44,
        borderTop: first ? 'none' : `1px solid ${COLORS.border}`,
        cursor: disabled || selected ? 'default' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        border: `2px solid ${selected ? COLORS.accent : COLORS.border}`,
        background: selected ? COLORS.accent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.bg }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600, color: COLORS.text,
        }}>{label}</div>
        {description && (
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
            marginTop: 3, lineHeight: 1.4,
          }}>{description}</div>
        )}
      </div>
    </div>
  );
}

function fmtTs(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
    return d.toLocaleString();
  } catch { return '—'; }
}

function DisabledBanner({ t, onReEnable, busy }) {
  return (
    <div style={{
      padding: `${SPACE.sm}px ${SPACE.md}px`,
      background: `${COLORS.danger}18`,
      borderBottom: `1px solid ${COLORS.danger}55`,
      display: 'flex', alignItems: 'center', gap: SPACE.md,
    }}>
      <span style={{ fontSize: 20 }}>🚫</span>
      <div style={{
        flex: 1, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
        color: COLORS.danger,
      }}>{t('user_disabled_status') || 'Konto wyłączone'}</div>
      <Btn variant="default" onClick={onReEnable} disabled={busy}>
        {t('user_re_enable_btn') || 'Włącz ponownie'}
      </Btn>
    </div>
  );
}
