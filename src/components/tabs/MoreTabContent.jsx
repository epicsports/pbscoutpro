import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE, ELEV } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useViewAs } from '../../hooks/useViewAs';
import { useIsSuperAdmin } from '../../hooks/useIsSuperAdmin';
import { leagueDisplayName } from '../../hooks/useLeagues';
import { hasAnyRole, getRolesForUser, ADMIN_EMAILS, canEditTactics } from '../../utils/roleUtils';
import ViewAsPill from '../ViewAsPill';
import { MoreShell, MoreSection, MoreItem } from './MoreShell';
import TakeABreakSection from './TakeABreakSection';
import { ConfirmModal } from '../ui';
import * as ds from '../../services/dataService';

/**
 * Settings tab content (§ 50). Section order:
 *   1. SESJA — edytuj turniej, zamknij turniej
 *   2. ZARZĄDZAJ — layouts, teams, players
 *   3. SCOUTING — handedness, my TODO, scout ranking
 *   4. WORKSPACE — current workspace + Wyjdź + Członkowie (admin)
 *   5. KONTO — profile, language, sign out
 *   6. ADMIN — view-as, feature flags
 *
 * Role gating per § 49 strict matrix:
 *   - SESJA / ZARZĄDZAJ / SCOUTING / ACTIONS hidden for pure-player
 *   - WORKSPACE.Mój workspace + Wyjdź visible to every role
 *   - WORKSPACE.Członkowie admin-only
 *   - KONTO visible to every role (incl. sign out — was admin-only pre-§50)
 *   - ADMIN entire section admin-only
 */
export default function MoreTabContent({
  tournamentId,
  tournament,
  workspaceName,
  onEditTournament,
  onCloseTournament,
  onDeleteTournament,
  onSignOut,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { workspace, user, userProfile, leaveWorkspace, linkedPlayer } = useWorkspace();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const isSuperAdmin = useIsSuperAdmin();
  const isPurePlayer = !effectiveIsAdmin
    && !hasAnyRole(effectiveRoles, 'coach', 'scout');
  const pendingCount = Array.isArray(workspace?.pendingApprovals) ? workspace.pendingApprovals.length : 0;
  const hasTournament = !!tournamentId;
  const isClosed = tournament?.status === 'closed';

  const tournamentSubtitle = [
    leagueDisplayName(tournament?.league),
    tournament?.year,
    tournament?.matchCount && `${tournament.matchCount} meczy`,
  ].filter(Boolean).join(' · ');

  return (
    <MoreShell>
      {/* 1. SESJA */}
      {hasTournament && !isPurePlayer && (
        <MoreSection title={t('session_section') || 'Sesja'}>
          <MoreItem
            iconName="pencil"
            label={t('edit_tournament') || 'Edytuj turniej'}
            sub={tournamentSubtitle || (t('tap_to_edit') || 'Dotknij aby edytować')}
            onClick={onEditTournament}
          />
          {isClosed ? (
            <MoreItem iconName="trash" label={t('delete_tournament') || 'Usuń turniej'} danger onClick={onDeleteTournament} isLast />
          ) : (
            <MoreItem iconName="flag" label={t('close_tournament') || 'Zamknij turniej'} accent onClick={onCloseTournament} isLast />
          )}
        </MoreSection>
      )}

      {/* DISPLAY — super-admin-only display toggles. Reuses the existing
          per-workspace piiSettings (avatarMode / surnameMode) — same prefs the
          super-admin Workspaces page edits, surfaced here as quick toggles.
          Gated isSuperAdmin → hidden for every other role. */}
      {isSuperAdmin && (
        <DisplaySection workspace={workspace} t={t} />
      )}

      {/* 2. ZARZĄDZAJ — coach + admin only (pure-player + scout-only hidden) */}
      {!isPurePlayer && (
        <MoreSection title={t('manage_section') || 'Zarządzaj'}>
          <MoreItem iconName="map" label={t('layouts_label') || 'Layouty'} onClick={() => navigate('/layouts')} />
          <MoreItem iconName="building" label={t('teams_label') || 'Drużyny'} onClick={() => navigate('/teams')} />
          <MoreItem iconName="jersey" label={t('players_label') || 'Zawodnicy'} onClick={() => navigate('/players')} isLast />
        </MoreSection>
      )}

      {/* PLAYBOOKS — coach-framed door to the SAME layout library (access already
          exists via ZARZĄDZAJ; this is discoverability/branding per the Playbooks
          brief). Gated canEditTactics(admin|coach) — hidden from scout. */}
      {canEditTactics(effectiveRoles) && (
        <MoreSection title={t('playbooks_label')}>
          <MoreItem iconName="book" testId="playbooks-entry" label={t('playbooks_subtitle')} onClick={() => navigate('/layouts')} />
          {/* Tactics door removed from the More menu (Jacek 2026-07-01) — it now
              lives only on the coach's tournament screen (CoachTabContent), opening
              the new DrawingCanvas module. */}
        </MoreSection>
      )}

      {/* 3. SCOUTING — handedness, my TODO, ranking. Hidden for pure-player
          (loupe + scouting tools belong to scout/coach context). */}
      {!isPurePlayer && (
        <ScoutingSection navigate={navigate} t={t} />
      )}

      {/* 4. WORKSPACE — every role sees Mój workspace + Wyjdź; Członkowie
          admin-only. Last-admin guard enforced on the leave flow. */}
      <WorkspaceSection
        workspace={workspace}
        user={user}
        userProfile={userProfile}
        workspaceName={workspaceName}
        effectiveIsAdmin={effectiveIsAdmin}
        pendingCount={pendingCount}
        leaveWorkspace={leaveWorkspace}
        navigate={navigate}
        t={t}
      />

      {/* 5. KONTO — profile + language + sign out (sign out ungated per § 50) */}
      <MoreSection title={t('account_section') || 'Konto'}>
        <MoreItem iconName="user" label={t('my_profile') || 'Mój profil'} onClick={() => navigate('/profile')} />
        {/* Brief E Gap 2 — "Moje statystyki" entry point. Conditional
            on linkedPlayer; unlinked users go via Mój profil → claim
            flow first (Brief E Gap 1 fallback CTA). */}
        {linkedPlayer && (
          <MoreItem iconName="trophy"
            label={t('my_stats') || 'Moje statystyki'}
            onClick={() => navigate(`/player/${linkedPlayer.id}/stats`)}
          />
        )}
        {linkedPlayer && (
          <MoreItem iconName="todo" testId="packing-menu-entry"
            label={t('packing_menu')}
            onClick={() => navigate('/player/checklist')}
          />
        )}
        <InlineLanguageRow t={t} />
        {onSignOut && (
          <MoreItem iconName="door" label={t('sign_out') || 'Wyloguj się'} danger onClick={onSignOut} isLast />
        )}
      </MoreSection>

      {/* 6. ADMIN — view-as (real switcher, re-enabled) + feature flags. Workspace-admin.
          ViewAsPill is the ENTRY (visible when not impersonating); the floating
          ViewAsIndicator (App root) is the always-visible EXIT + role-switcher during
          impersonation (gated on realIsAdmin), so the escape never disappears. */}
      {effectiveIsAdmin && (
        <MoreSection title={t('admin_section') || 'Admin'}>
          <ViewAsPill />
          <MoreItem
            iconName="flag"
            label={t('feature_flags_label') || 'Feature flags'}
            sub={t('feature_flags_sub') || 'Audiencja + włączenie per flaga'}
            onClick={() => navigate('/debug/flags')}
            isLast
          />
        </MoreSection>
      )}

      {/* 7. SUPER ADMIN — global cross-workspace editors. super_admin-only —
          same gate as SuperAdminGuard on the routes, so no dead links. */}
      {isSuperAdmin && (
        <MoreSection title={t('super_admin_section') || 'Super Admin'}>
          <MoreItem
            iconName="building"
            label={t('more_admin_workspaces_label')}
            sub={t('more_admin_workspaces_sub')}
            onClick={() => navigate('/admin/workspaces')}
          />
          <MoreItem
            iconName="map"
            label={t('more_admin_layouts_label')}
            sub={t('more_admin_layouts_sub')}
            onClick={() => navigate('/admin/layouts')}
          />
          <MoreItem
            iconName="note"
            label={t('more_admin_leagues_label')}
            sub={t('more_admin_leagues_sub')}
            onClick={() => navigate('/admin/leagues')}
          />
          <MoreItem
            iconName="user"
            label={t('more_admin_players_label')}
            sub={t('more_admin_players_sub')}
            onClick={() => navigate('/admin/players')}
          />
          <MoreItem
            iconName="shield"
            label={t('more_admin_teams_label')}
            sub={t('more_admin_teams_sub')}
            onClick={() => navigate('/admin/teams')}
            isLast
          />
        </MoreSection>
      )}

      {/* Very bottom of the drawer (§117) — ungated recreational entry. */}
      <TakeABreakSection />
    </MoreShell>
  );
}

/* ─── SCOUTING section ─────────────────────────────────────────────── */

const HANDEDNESS_KEY = 'pbscoutpro-handedness';

function ScoutingSection({ navigate, t }) {
  const [handedness, setHandedness] = useState(() => {
    try { return localStorage.getItem(HANDEDNESS_KEY) || 'right'; }
    catch { return 'right'; }
  });
  const toggleHandedness = () => {
    const next = handedness === 'right' ? 'left' : 'right';
    setHandedness(next);
    try { localStorage.setItem(HANDEDNESS_KEY, next); } catch {}
  };
  const handLabel = handedness === 'right'
    ? (t('handedness_right') || 'RIGHT')
    : (t('handedness_left') || 'LEFT');

  return (
    <MoreSection title={t('scouting_section') || 'Scouting'}>
      <MoreItem
        iconName="hand"
        label={t('handedness_label') || 'Ręka dominująca'}
        sub={t('handedness_sub') || 'Strona lupy podczas scoutingu'}
        onClick={toggleHandedness}
        rightSlot={<AccentPill text={handLabel} />}
      />
      <MoreItem
        iconName="todo"
        label={t('todo_label') || 'Moje TODO scoutingowe'}
        onClick={() => navigate('/my-issues')}
      />
      <MoreItem
        iconName="trophy"
        label={t('scout_ranking') || 'Ranking scoutów'}
        onClick={() => navigate('/scouts')}
        isLast
      />
    </MoreSection>
  );
}

/* ─── DISPLAY section (super-admin) ────────────────────────────────── */

// Quick toggles for the two per-workspace display prefs (piiSettings). Reuses
// ds.setWorkspacePiiSettings with the same optimistic-local-state + merge-the-
// existing-map + revert-on-error pattern as WorkspacesAdminPage (lines 139-170).
// No new data model — ON maps to the privacy-preserving mode of each pref.
function DisplaySection({ workspace, t }) {
  const slug = workspace?.slug;

  // Avatars: ON = 'avatar' (1-bit initials), OFF = 'photo' (default).
  const savedAvatarMode = workspace?.piiSettings?.avatarMode || 'photo';
  const [avatarMode, setAvatarMode] = useState(savedAvatarMode);
  const [savingAvatar, setSavingAvatar] = useState(false);
  useEffect(() => { setAvatarMode(workspace?.piiSettings?.avatarMode || 'photo'); }, [slug, savedAvatarMode]);

  // Surnames: ON = 'short' (first name + initial), OFF = 'full' (default).
  const savedSurnameMode = workspace?.piiSettings?.surnameMode || 'full';
  const [surnameMode, setSurnameMode] = useState(savedSurnameMode);
  const [savingSurname, setSavingSurname] = useState(false);
  useEffect(() => { setSurnameMode(workspace?.piiSettings?.surnameMode || 'full'); }, [slug, savedSurnameMode]);

  const toggleAvatars = async () => {
    if (savingAvatar || !slug) return;
    const next = avatarMode === 'avatar' ? 'photo' : 'avatar';
    setAvatarMode(next); // optimistic
    setSavingAvatar(true);
    try { await ds.setWorkspacePiiSettings(slug, { ...(workspace.piiSettings || {}), avatarMode: next }); }
    catch (e) { console.error('Save avatar mode failed:', e); setAvatarMode(savedAvatarMode); }
    finally { setSavingAvatar(false); }
  };

  const toggleSurnames = async () => {
    if (savingSurname || !slug) return;
    const next = surnameMode === 'short' ? 'full' : 'short';
    setSurnameMode(next); // optimistic
    setSavingSurname(true);
    try { await ds.setWorkspacePiiSettings(slug, { ...(workspace.piiSettings || {}), surnameMode: next }); }
    catch (e) { console.error('Save surname mode failed:', e); setSurnameMode(savedSurnameMode); }
    finally { setSavingSurname(false); }
  };

  return (
    <MoreSection title={t('drawer_display_section') || 'Wyświetlanie'}>
      <MoreItem
        iconName="user"
        label={t('drawer_display_avatars_label') || 'Awatary zamiast zdjęć'}
        sub={t('drawer_display_avatars_sub') || 'Grafiki 1-bit zamiast fotografii graczy'}
        onClick={toggleAvatars}
        rightSlot={<Toggle on={avatarMode === 'avatar'} onClick={toggleAvatars} />}
      />
      <MoreItem
        iconName="duo"
        label={t('drawer_display_surnames_label') || 'Ukryj nazwiska graczy'}
        sub={t('drawer_display_surnames_sub') || 'Pokazuj tylko imię i inicjał nazwiska'}
        onClick={toggleSurnames}
        rightSlot={<Toggle on={surnameMode === 'short'} onClick={toggleSurnames} />}
        isLast
      />
    </MoreSection>
  );
}

// Inline pill toggle (no shared component in ui.jsx). Track + knob; amber accent
// only on the ON state (§27). ≥44px hit area via the padded wrapper.
function Toggle({ on, onClick }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 44, minHeight: 44, marginRight: -4,
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        position: 'relative',
        width: 44, height: 26, borderRadius: 999,
        background: on ? COLORS.accent : ELEV.sunken,
        border: `1px solid ${on ? COLORS.accent : ELEV.hairlineStrong}`,
        transition: 'background 140ms ease, border-color 140ms ease',
        display: 'inline-block', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 20 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: on ? COLORS.black : COLORS.textDim,
          transition: 'left 140ms ease, background 140ms ease',
          boxShadow: ELEV.shadow1,
        }} />
      </span>
    </span>
  );
}

/* ─── WORKSPACE section ────────────────────────────────────────────── */

function WorkspaceSection({ workspace, user, userProfile, workspaceName, effectiveIsAdmin, pendingCount, leaveWorkspace, navigate, t }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isLastAdmin = computeIsLastAdmin(workspace, user, userProfile);
  const isSuperAdmin = useIsSuperAdmin();
  const isWorkspaceAdminUid = !!user?.uid && workspace?.adminUid === user.uid;
  // Admins must not self-leave (UX bug bundle 2026-05-20 Bug 1): a workspace
  // adminUid holder leaving orphans the pointer; a super_admin leaving is a
  // silent no-op (autoEnterDefaultWorkspace re-joins them on next render).
  const cannotLeave = isLastAdmin || isSuperAdmin || isWorkspaceAdminUid;

  const handleLeave = async () => {
    if (!user?.uid) return;
    setLeaving(true);
    try {
      await ds.leaveWorkspaceSelf(user.uid);
      setConfirmOpen(false);
      leaveWorkspace();
    } catch (e) {
      console.error('Leave workspace failed:', e);
      const msg = e?.message === 'SUPER_ADMIN_CANNOT_LEAVE'
        ? (t('super_admin_cannot_leave') || 'Super admin nie może opuścić workspace.')
        : e?.message === 'WORKSPACE_ADMIN_CANNOT_LEAVE'
        ? (t('workspace_admin_cannot_leave') || 'Admin workspace nie może wyjść. Najpierw przekaż rolę admina.')
        : `${t('leave_failed') || 'Nie udało się wyjść'}: ${e?.message || e}`;
      alert(msg);
      setLeaving(false);
    }
  };

  return (
    <MoreSection title={t('workspace_section_settings') || 'Workspace'}>
      {/* WorkspaceSwitcher removed here — NavDrawer renders it once at the top
          (under the workspace identity header, §92 variant="drawer"). Keeping
          this legacy in-section copy showed it TWICE in the drawer for >1-ws
          accounts (Jacek 2026-06-19). */}
      <MoreItem
        iconName="door"
        label={t('leave_workspace_row') || 'Wyjdź z workspace'}
        rightSlot={
          <LeaveBtn
            disabled={cannotLeave}
            tooltip={
              isSuperAdmin
                ? (t('super_admin_cannot_leave') || 'Super admin nie może opuścić workspace.')
                : isWorkspaceAdminUid
                ? (t('workspace_admin_cannot_leave') || 'Admin workspace nie może wyjść. Najpierw przekaż rolę admina.')
                : isLastAdmin
                ? (t('leave_workspace_last_admin') || 'Jesteś jedynym administratorem')
                : null
            }
            onClick={() => setConfirmOpen(true)}
            label={t('leave_workspace_btn') || 'Wyjdź'}
          />
        }
        isLast={!effectiveIsAdmin}
      />
      {effectiveIsAdmin && (
        <MoreItem
          iconName="duo"
          label={t('members_label') || 'Członkowie'}
          onClick={() => navigate('/settings/members')}
          rightSlot={pendingCount > 0 ? <PendingBadge count={pendingCount} /> : null}
          isLast
        />
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => !leaving && setConfirmOpen(false)}
        title={t('leave_workspace_title') || 'Wyjść z workspace?'}
        message={t('leave_workspace_body') || 'Stracisz dostęp do wszystkich danych w workspace.'}
        confirmLabel={leaving ? (t('leaving') || 'Wychodzę…') : (t('leave_workspace_btn') || 'Wyjdź')}
        danger
        onConfirm={handleLeave}
      />
    </MoreSection>
  );
}

// B14 widen (2026-05-27): self-is-admin gate previously checked role-array
// `'admin'` only. Returned false for super_admin / adminUid-only users
// (nobody in prod holds role-array 'admin'), so the "Jesteś jedynym
// administratorem" tooltip never fired even when it should have. Widened
// to all 4 paths of `roleUtils.isAdmin/isSuperAdmin`: role-array, adminUid,
// globalRole==='super_admin', ADMIN_EMAILS. Count stays role-array +
// adminUid (super_admin / email paths require expensive /users/ walks; the
// surrounding `cannotLeave` OR-chain in WorkspaceSection covers those
// cases via `useIsSuperAdmin()` independently).
function computeIsLastAdmin(workspace, user, userProfile) {
  const uid = user?.uid;
  if (!workspace || !uid) return false;
  const myRoles = getRolesForUser(workspace, uid);
  const selfIsAdmin = myRoles.includes('admin')
    || workspace.adminUid === uid
    || userProfile?.globalRole === 'super_admin'
    || (!!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  if (!selfIsAdmin) return false;
  const userRoles = workspace.userRoles || {};
  const adminCount = Object.values(userRoles).filter(r => Array.isArray(r) && r.includes('admin')).length;
  const adminUidExtra = workspace.adminUid && !userRoles[workspace.adminUid]?.includes('admin') ? 1 : 0;
  return (adminCount + adminUidExtra) <= 1;
}

/* ─── Inline pieces ────────────────────────────────────────────────── */

function InlineLanguageRow({ t: _t }) {
  // Reuse LanguageSection's MoreItem as a single row, not a section.
  return <LanguageRowBody />;
}

function LanguageRowBody() {
  const { lang, setLang } = useLanguage();
  const next = lang === 'pl' ? 'en' : 'pl';
  const flag = lang === 'pl' ? '🇵🇱' : '🇬🇧';
  const langName = lang === 'pl' ? 'Polski' : 'English';
  return (
    <MoreItem
      iconName="globe"
      label={langName}
      onClick={() => setLang(next)}
      rightSlot={<AccentPill text={`${flag} ${lang.toUpperCase()}`} />}
    />
  );
}

function AccentPill({ text }) {
  return (
    <span style={{
      fontFamily: FONT, fontSize: 11, fontWeight: 700,
      color: COLORS.accent,
      padding: '4px 8px', borderRadius: 6,
      background: `${COLORS.accent}10`,
      border: `1px solid ${COLORS.accent}30`,
      letterSpacing: 0.4,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      marginRight: 4,
    }}>{text}</span>
  );
}

function LeaveBtn({ disabled, tooltip, onClick, label }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      title={tooltip || undefined}
      style={{
        fontFamily: FONT, fontSize: 12, fontWeight: 700,
        padding: '8px 14px', minHeight: 36,
        borderRadius: 8,
        background: disabled ? `${COLORS.danger}10` : `${COLORS.danger}18`,
        color: disabled ? `${COLORS.danger}66` : COLORS.danger,
        border: `1px solid ${disabled ? `${COLORS.danger}22` : `${COLORS.danger}55`}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: 0.3,
        WebkitTapHighlightColor: 'transparent',
        marginRight: 4,
      }}
    >{label}</button>
  );
}

function PendingBadge({ count }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 22, height: 22, padding: '0 6px', marginRight: 4,
      borderRadius: 999,
      background: COLORS.accent, color: COLORS.black,
      fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800,
    }}>{count}</span>
  );
}
