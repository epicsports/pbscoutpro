import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useViewAs } from '../../hooks/useViewAs';
import { hasAnyRole, getRolesForUser } from '../../utils/roleUtils';
import ViewAsPlaceholder from '../ViewAsPlaceholder';
import { MoreShell, MoreSection, MoreItem } from './MoreShell';
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
  const { workspace, user, leaveWorkspace, linkedPlayer } = useWorkspace();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const isPurePlayer = !effectiveIsAdmin
    && !hasAnyRole(effectiveRoles, 'coach', 'scout');
  const pendingCount = Array.isArray(workspace?.pendingApprovals) ? workspace.pendingApprovals.length : 0;
  const hasTournament = !!tournamentId;
  const isClosed = tournament?.status === 'closed';

  const tournamentSubtitle = [
    tournament?.league,
    tournament?.year,
    tournament?.matchCount && `${tournament.matchCount} meczy`,
  ].filter(Boolean).join(' · ');

  return (
    <MoreShell>
      {/* 1. SESJA */}
      {hasTournament && !isPurePlayer && (
        <MoreSection title={t('session_section') || 'Sesja'}>
          <MoreItem
            icon="✏️"
            label={t('edit_tournament') || 'Edytuj turniej'}
            sub={tournamentSubtitle || (t('tap_to_edit') || 'Dotknij aby edytować')}
            onClick={onEditTournament}
          />
          {isClosed ? (
            <MoreItem icon="🗑" label={t('delete_tournament') || 'Usuń turniej'} danger onClick={onDeleteTournament} isLast />
          ) : (
            <MoreItem icon="🏁" label={t('close_tournament') || 'Zamknij turniej'} accent onClick={onCloseTournament} isLast />
          )}
        </MoreSection>
      )}

      {/* 2. ZARZĄDZAJ — coach + admin only (pure-player + scout-only hidden) */}
      {!isPurePlayer && (
        <MoreSection title={t('manage_section') || 'Zarządzaj'}>
          <MoreItem icon="🗺" label={t('layouts_label') || 'Layouty'} onClick={() => navigate('/layouts')} />
          <MoreItem icon="🏢" label={t('teams_label') || 'Drużyny'} onClick={() => navigate('/teams')} />
          <MoreItem icon="🎽" label={t('players_label') || 'Zawodnicy'} onClick={() => navigate('/players')} isLast />
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
        workspaceName={workspaceName}
        effectiveIsAdmin={effectiveIsAdmin}
        pendingCount={pendingCount}
        leaveWorkspace={leaveWorkspace}
        navigate={navigate}
        t={t}
      />

      {/* 5. KONTO — profile + language + sign out (sign out ungated per § 50) */}
      <MoreSection title={t('account_section') || 'Konto'}>
        <MoreItem icon="👤" label={t('my_profile') || 'Mój profil'} onClick={() => navigate('/profile')} />
        {/* Brief E Gap 2 — "Moje statystyki" entry point. Conditional
            on linkedPlayer; unlinked users go via Mój profil → claim
            flow first (Brief E Gap 1 fallback CTA). */}
        {linkedPlayer && (
          <MoreItem icon="📊"
            label={t('my_stats') || 'Moje statystyki'}
            onClick={() => navigate(`/player/${linkedPlayer.id}/stats`)}
          />
        )}
        <InlineLanguageRow t={t} />
        {onSignOut && (
          <MoreItem icon="🚪" label={t('sign_out') || 'Wyloguj się'} danger onClick={onSignOut} isLast />
        )}
      </MoreSection>

      {/* 6. ADMIN — view-as placeholder + feature flags. Entire section admin-only. */}
      {effectiveIsAdmin && (
        <MoreSection title={t('admin_section') || 'Admin'}>
          <ViewAsPlaceholder />
          <MoreItem
            icon="🚩"
            label={t('feature_flags_label') || 'Feature flags'}
            sub={t('feature_flags_sub') || 'Audiencja + włączenie per flaga'}
            onClick={() => navigate('/debug/flags')}
            isLast
          />
        </MoreSection>
      )}
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
        icon="✋"
        label={t('handedness_label') || 'Ręka dominująca'}
        sub={t('handedness_sub') || 'Strona lupy podczas scoutingu'}
        onClick={toggleHandedness}
        rightSlot={<AccentPill text={handLabel} />}
      />
      <MoreItem
        icon="📋"
        label={t('todo_label') || 'Moje TODO scoutingowe'}
        onClick={() => navigate('/my-issues')}
      />
      <MoreItem
        icon="🏅"
        label={t('scout_ranking') || 'Ranking scoutów'}
        onClick={() => navigate('/scouts')}
        isLast
      />
    </MoreSection>
  );
}

/* ─── WORKSPACE section ────────────────────────────────────────────── */

function WorkspaceSection({ workspace, user, workspaceName, effectiveIsAdmin, pendingCount, leaveWorkspace, navigate, t }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isLastAdmin = computeIsLastAdmin(workspace, user?.uid);
  const slug = workspace?.slug;

  const handleLeave = async () => {
    if (!user?.uid) return;
    setLeaving(true);
    try {
      await ds.leaveWorkspaceSelf(user.uid);
      setConfirmOpen(false);
      leaveWorkspace();
    } catch (e) {
      console.error('Leave workspace failed:', e);
      alert(`${t('leave_failed') || 'Nie udało się wyjść'}: ${e.message || e}`);
      setLeaving(false);
    }
  };

  return (
    <MoreSection title={t('workspace_section_settings') || 'Workspace'}>
      <MoreItem
        icon="🏠"
        label={t('my_workspace') || 'Mój workspace'}
        sub={slug || undefined}
      />
      <MoreItem
        icon=""
        label={workspaceName || slug || t('workspace_label') || 'Workspace'}
        rightSlot={
          <LeaveBtn
            disabled={isLastAdmin}
            tooltip={isLastAdmin ? (t('leave_workspace_last_admin') || 'Jesteś jedynym administratorem') : null}
            onClick={() => setConfirmOpen(true)}
            label={t('leave_workspace_btn') || 'Wyjdź'}
          />
        }
        isLast={!effectiveIsAdmin}
      />
      {effectiveIsAdmin && (
        <MoreItem
          icon="👥"
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

function computeIsLastAdmin(workspace, uid) {
  if (!workspace || !uid) return false;
  const myRoles = getRolesForUser(workspace, uid);
  if (!myRoles.includes('admin')) return false;
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
      icon="🌐"
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
      background: COLORS.accent, color: '#000',
      fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800,
    }}>{count}</span>
  );
}
