import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useIsSuperAdmin } from '../../hooks/useIsSuperAdmin';
import { useUserProfiles } from '../../hooks/useUserNames';
import PageHeader from '../../components/PageHeader';
import { Btn, Card, Modal, Input, EmptyState, ConfirmModal, MoreBtn, ActionSheet, SegmentedControl } from '../../components/ui';
import RoleChips from '../../components/settings/RoleChips';
import WorkspaceLogo from '../../components/settings/WorkspaceLogo';
import InviteSection from '../../components/settings/InviteSection';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS, TOUCH } from '../../utils/theme';
import { getRolesForUser } from '../../utils/roleUtils';
import * as ds from '../../services/dataService';
import { useLanguage } from '../../hooks/useLanguage';

// ─── Super-admin Workspaces surface (§ 91) ───────────────────────────────
// Cross-workspace access management WITHOUT switching the super_admin's active
// context — replaces the (deleted) workspace switcher. Reads all workspace docs
// (super_admin can read all per current rules) and writes members / userRoles /
// pendingApprovals on ANY workspace via the now-_wsSlug-aware dataService
// functions (PART A). Whole surface is super_admin-only: route is wrapped in
// <SuperAdminGuard> AND this component early-returns null as a layer-2 guard.
export default function WorkspacesAdminPage() {
  const { t } = useLanguage();
  const isSuperAdmin = useIsSuperAdmin();
  const [workspaces, setWorkspaces] = useState(null); // null = loading
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Live list of every workspace — reflects creates + member/role/pending
  // mutations automatically, so the manage view stays in sync after writes.
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'workspaces'),
      (snap) => {
        const list = snap.docs.map(d => ({ slug: d.id, ...d.data() }));
        list.sort((a, b) => String(a.name || a.slug).localeCompare(String(b.name || b.slug)));
        setWorkspaces(list);
      },
      (e) => { console.error('Workspaces snapshot failed:', e); setWorkspaces([]); },
    );
    return () => unsub();
  }, []);

  // Layer-2 guard — SuperAdminGuard already gates the route, but a render-time
  // check protects against future routing regressions (mirrors AdminLeaguesPage).
  if (!isSuperAdmin) return null;

  const selected = workspaces?.find(w => w.slug === selectedSlug) || null;

  if (selected) {
    return <ManageWorkspace workspace={selected} onBack={() => setSelectedSlug(null)} />;
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: '100dvh' }}>
      <PageHeader back={{ to: '/' }} title={t('wsadmin_title')} subtitle={t('wsadmin_subtitle')} />
      <div style={{ padding: SPACE.lg, paddingBottom: 80 }}>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: SPACE.md }}>
          <div style={{ flex: 1 }} />
          <Btn variant="accent" onClick={() => setCreateOpen(true)}>{t('wsadmin_new_btn')}</Btn>
        </div>

        {workspaces === null && <EmptyState icon="⏳" text={t('wsadmin_loading')} />}
        {workspaces && workspaces.length === 0 && <EmptyState icon="🏢" text={t('wsadmin_empty')} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
          {(workspaces || []).map(w => {
            const memberCount = Array.isArray(w.members) ? w.members.length : 0;
            const pendingCount = Array.isArray(w.pendingApprovals) ? w.pendingApprovals.length : 0;
            const memberWord = memberCount === 1 ? t('wsadmin_member_singular') : t('wsadmin_member_plural');
            const sub = `${w.slug} · ${memberCount} ${memberWord}`
              + (pendingCount > 0 ? ` · ${pendingCount} ${t('wsadmin_pending_suffix')}` : '');
            return (
              <Card
                key={w.slug}
                title={w.name || w.slug}
                subtitle={sub}
                onClick={() => setSelectedSlug(w.slug)}
              />
            );
          })}
        </div>

        <div style={{
          marginTop: SPACE.lg, padding: SPACE.md, borderRadius: RADIUS.md,
          backgroundColor: COLORS.surfaceDark, fontFamily: FONT, fontSize: FONT_SIZE.xs,
          color: COLORS.textMuted, lineHeight: 1.5,
        }}>
          <div style={{ color: COLORS.textDim, fontWeight: 600, marginBottom: 4 }}>{t('wsadmin_about_title')}</div>
          {t('wsadmin_about_body')}
        </div>
      </div>

      <CreateWorkspaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        existingSlugs={(workspaces || []).map(w => w.slug)}
      />
    </div>
  );
}

// ─── Manage a single (possibly non-active) workspace ─────────────────────
function ManageWorkspace({ workspace, onBack }) {
  const { t } = useLanguage();
  const slug = workspace.slug;
  const members = Array.isArray(workspace.members) ? workspace.members : [];
  const pendingUids = Array.isArray(workspace.pendingApprovals) ? workspace.pendingApprovals : [];
  const pendingSet = useMemo(() => new Set(pendingUids), [pendingUids]);
  const activeUids = useMemo(
    () => members.filter(uid => !pendingSet.has(uid)),
    [members, pendingSet],
  );
  const allUids = useMemo(
    () => [...new Set([...activeUids, ...pendingUids])],
    [activeUids, pendingUids],
  );
  const profiles = useUserProfiles(allUids);

  const [logoInput, setLogoInput] = useState(workspace.logoUrl || '');
  const [savingLogo, setSavingLogo] = useState(false);
  useEffect(() => { setLogoInput(workspace.logoUrl || ''); }, [workspace.slug]);

  async function handleSaveLogo() {
    if (savingLogo) return;
    setSavingLogo(true);
    try { await ds.setWorkspaceLogo(slug, logoInput); }
    catch (e) { console.error('Save logo failed:', e); }
    finally { setSavingLogo(false); }
  }

  // Privacy/PII Phase 1 — per-workspace avatar mode (super-admin only).
  // 'photo' (default) = show uploaded player photos; 'avatar' = suppress
  // photos everywhere, show deterministic colored initials. Optimistic local
  // state so the segmented control reflects the tap immediately; the live
  // workspace snapshot re-syncs it after the write lands.
  const savedAvatarMode = workspace.piiSettings?.avatarMode || 'photo';
  const [avatarMode, setAvatarMode] = useState(savedAvatarMode);
  const [savingAvatarMode, setSavingAvatarMode] = useState(false);
  useEffect(() => { setAvatarMode(workspace.piiSettings?.avatarMode || 'photo'); }, [workspace.slug, savedAvatarMode]);

  async function handleSetAvatarMode(mode) {
    if (savingAvatarMode || mode === savedAvatarMode) return;
    setAvatarMode(mode); // optimistic
    setSavingAvatarMode(true);
    try { await ds.setWorkspacePiiSettings(slug, { ...(workspace.piiSettings || {}), avatarMode: mode }); }
    catch (e) { console.error('Save avatar mode failed:', e); setAvatarMode(savedAvatarMode); }
    finally { setSavingAvatarMode(false); }
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: '100dvh' }}>
      <PageHeader
        back={{ to: onBack }}
        title={workspace.name || slug}
        subtitle={t('wsadmin_manage_subtitle', slug)}
      />
      <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, display: 'flex', flexDirection: 'column', gap: SPACE.xl, paddingBottom: 80 }}>

        {/* Logo */}
        <section>
          <SectionLabel text={t('wsadmin_logo_label')} />
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.sm }}>
            <WorkspaceLogo url={logoInput.trim() || workspace.logoUrl} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input value={logoInput} onChange={setLogoInput} placeholder="https://…/logo.png" />
            </div>
            <Btn
              variant="accent"
              disabled={savingLogo || logoInput.trim() === (workspace.logoUrl || '')}
              onClick={handleSaveLogo}
            >{savingLogo ? t('saving') : t('save')}</Btn>
          </div>
        </section>

        {/* Player avatars — PII privacy control (Privacy Phase 1) */}
        <section>
          <SectionLabel text={t('wsadmin_avatars_label')} />
          <div style={{ marginTop: SPACE.sm }}>
            <SegmentedControl
              value={avatarMode}
              onChange={handleSetAvatarMode}
              items={[
                { key: 'photo',  label: t('wsadmin_avatars_photo') },
                { key: 'avatar', label: t('wsadmin_avatars_avatar') },
              ]}
            />
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: SPACE.xs, lineHeight: 1.5 }}>
              {t('wsadmin_avatars_hint')}
            </div>
          </div>
        </section>

        {/* Invites (Model B) — super_admin may issue any role for this workspace */}
        <section>
          <SectionLabel text={t('invite_section_title')} />
          <div style={{ marginTop: SPACE.sm }}>
            <InviteSection slug={slug} roles={['admin', 'coach', 'scout', 'player']} />
          </div>
        </section>

        {/* Pending approvals */}
        {pendingUids.length > 0 && (
          <section>
            <SectionLabel text={t('members_pending_header')} count={pendingUids.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, marginTop: SPACE.sm }}>
              {pendingUids.map(uid => (
                <PendingRow key={uid} slug={slug} uid={uid} profile={profiles[uid] || null} />
              ))}
            </div>
          </section>
        )}

        {/* Active members */}
        <section>
          <SectionLabel text={t('members_label')} count={activeUids.length} />
          {activeUids.length === 0 ? (
            <EmptyState icon="👥" text={t('members_empty')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, marginTop: SPACE.sm }}>
              {activeUids.map(uid => (
                <MemberRow
                  key={uid}
                  slug={slug}
                  uid={uid}
                  roles={getRolesForUser(workspace, uid)}
                  profile={profiles[uid] || null}
                  isAdminUid={workspace.adminUid === uid}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ text, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE.sm }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
        letterSpacing: 0.6, textTransform: 'uppercase',
        color: COLORS.textMuted,
      }}>{text}</div>
      {typeof count === 'number' && (
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.textDim }}>
          ({count})
        </div>
      )}
    </div>
  );
}

function displayNameOf(profile, uid) {
  return profile?.displayName || profile?.email || `User ${uid.slice(0, 6)}`;
}

// ─── Pending row — approve with selected roles, or reject ─────────────────
function PendingRow({ slug, uid, profile }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(['player']);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const name = displayNameOf(profile, uid);

  async function handleApprove() {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    try { await ds.approveUserRoles(slug, uid, selected); }
    catch (e) { console.error('Approve failed:', e); }
    finally { setSaving(false); }
  }
  async function handleReject() {
    setSaving(true);
    try { await ds.removeMember(slug, uid); }
    catch (e) { console.error('Reject failed:', e); }
    finally { setSaving(false); setRejectOpen(false); }
  }

  return (
    <>
      <div style={{
        background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg, padding: SPACE.md,
        display: 'flex', flexDirection: 'column', gap: SPACE.sm,
        opacity: saving ? 0.7 : 1, transition: 'opacity .15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{name}</div>
            {profile?.email && (
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{profile.email}</div>
            )}
          </div>
          <MoreBtn onClick={() => setMenuOpen(true)} />
        </div>
        <RoleChips selected={selected} onChange={setSelected} />
        <Btn
          variant="accent"
          onClick={handleApprove}
          disabled={selected.length === 0 || saving}
          style={{ width: '100%', justifyContent: 'center', minHeight: TOUCH.targetLg }}
        >{t('members_approve')}</Btn>
      </div>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={[{ label: t('members_reject'), danger: true, onPress: () => setRejectOpen(true) }]}
      />
      <ConfirmModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t('wsadmin_reject_title', name)}
        message={t('wsadmin_reject_msg')}
        confirmLabel={t('members_reject')}
        danger
        onConfirm={handleReject}
      />
    </>
  );
}

// ─── Member row — inline role editing + remove ───────────────────────────
function MemberRow({ slug, uid, roles, profile, isAdminUid }) {
  const { t } = useLanguage();
  const [pendingRoles, setPendingRoles] = useState(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const displayed = pendingRoles || roles;
  const name = displayNameOf(profile, uid);
  const isSuper = profile?.globalRole === 'super_admin';

  async function handleRolesChange(next) {
    if (saving) return;
    setPendingRoles(next);
    setSaving(true);
    try { await ds.updateUserRoles(slug, uid, next); }
    catch (e) { console.error('Update roles failed:', e); }
    finally { setSaving(false); setPendingRoles(null); }
  }
  async function handleRemove() {
    setSaving(true);
    try { await ds.removeMember(slug, uid); }
    catch (e) { console.error('Remove member failed:', e); }
    finally { setSaving(false); setRemoveOpen(false); }
  }

  // The adminUid pointer is the workspace owner — removing them would orphan
  // the pointer, so the remove action is withheld for that member.
  const menuActions = isAdminUid ? [] : [
    { label: t('wsadmin_remove_action'), danger: true, onPress: () => setRemoveOpen(true) },
  ];

  return (
    <>
      <div style={{
        background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg, padding: SPACE.md,
        display: 'flex', flexDirection: 'column', gap: SPACE.sm,
        opacity: saving ? 0.7 : 1, transition: 'opacity .15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {name}
              {isSuper && <NeutralBadge text={t('wsadmin_badge_super')} />}
              {isAdminUid && <NeutralBadge text={t('wsadmin_badge_owner')} />}
            </div>
            {profile?.email && (
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{profile.email}</div>
            )}
          </div>
          {menuActions.length > 0 && <MoreBtn onClick={() => setMenuOpen(true)} />}
        </div>
        <RoleChips selected={displayed} onChange={handleRolesChange} />
      </div>

      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={menuActions} />
      <ConfirmModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title={t('wsadmin_remove_title', name)}
        message={t('wsadmin_remove_msg')}
        confirmLabel={t('wsadmin_remove_action')}
        danger
        onConfirm={handleRemove}
      />
    </>
  );
}

// Non-interactive status badge — neutral gray per § 27 colour discipline
// (amber is reserved for interactive elements).
function NeutralBadge({ text }) {
  return (
    <span style={{
      marginLeft: SPACE.xs, padding: '1px 6px', borderRadius: RADIUS.xs,
      background: `${COLORS.textMuted}20`, color: COLORS.text,
      border: `1px solid ${COLORS.textMuted}55`,
      fontSize: FONT_SIZE.xxs, fontWeight: 800, letterSpacing: 0.4,
      textTransform: 'uppercase', verticalAlign: 'middle',
    }}>{text}</span>
  );
}

// ─── Create workspace modal ──────────────────────────────────────────────
function CreateWorkspaceModal({ open, onClose, existingSlugs }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [code, setCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) { setName(''); setSlug(''); setCode(''); setLogoUrl(''); setError(null); }
  }, [open]);

  const normSlug = slug.toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').slice(0, 40);
  const dupe = existingSlugs.includes(normSlug);
  const canCreate = normSlug.length >= 2
    && name.trim().length > 0
    && code.trim().length >= 4
    && !dupe && !saving;

  async function handleCreate() {
    if (!canCreate) return;
    setSaving(true);
    setError(null);
    try {
      await ds.createWorkspace(normSlug, name, code, logoUrl);
      onClose();
    } catch (e) {
      setError(e?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('wsadmin_modal_title')}
      footer={
        <>
          <Btn variant="default" onClick={onClose}>{t('cancel')}</Btn>
          <Btn variant="accent" disabled={!canCreate} onClick={handleCreate}>
            {saving ? t('wsadmin_creating') : t('create')}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        <Field label={t('wsadmin_field_name')}>
          <Input value={name} onChange={setName} placeholder={t('wsadmin_name_ph')} autoFocus />
        </Field>
        <Field label={t('wsadmin_field_slug')} hint={normSlug ? t('wsadmin_slug_id_hint', normSlug) : t('wsadmin_slug_hint')}>
          <Input value={slug} onChange={setSlug} placeholder={t('wsadmin_slug_ph')} />
        </Field>
        <Field label={t('wsadmin_field_code')} hint={t('wsadmin_code_hint')}>
          <Input value={code} onChange={setCode} placeholder="••••" />
        </Field>
        <Field label={t('wsadmin_field_logo')} hint={t('wsadmin_logo_hint')}>
          <Input value={logoUrl} onChange={setLogoUrl} placeholder="https://…/logo.png" />
        </Field>
        {dupe && normSlug.length >= 2 && (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
            {t('wsadmin_slug_dupe', normSlug)}
          </div>
        )}
        {error && (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>{error}</div>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
        color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase',
        marginBottom: SPACE.xs,
      }}>{label}</div>
      {children}
      {hint && (
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
