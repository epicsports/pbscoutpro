import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useViewAs } from '../../hooks/useViewAs';
import ViewAsPill from '../ViewAsPill';
import { MoreShell, MoreSection, MoreItem, LanguageSection } from './MoreShell';

/**
 * Tournament More tab — Apple HIG–inspired hierarchy.
 *
 *  1. Session  — edit details
 *  2. Browse   — workspace data
 *  3. Actions  — close tournament (live) / delete tournament (ended)
 *  4. Account  — profile, workspace, sign out
 *
 * "Create new" actions intentionally NOT here — they belong to the context
 * picker accessed from the header "Change" button.
 */
export default function MoreTabContent({
  tournamentId,
  tournament,
  workspaceName,
  onEditTournament,
  onCloseTournament,
  onDeleteTournament,
  onLogout,
  onSignOut,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { workspace } = useWorkspace();
  // Admin-gated UI sections use `effectiveIsAdmin` so admin impersonating a
  // non-admin role sees what that role sees (§ 38.5). ViewAsPill itself guards
  // on the REAL admin flag internally — don't re-gate it here.
  const { effectiveIsAdmin } = useViewAs();
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
      {/* 1. SESSION */}
      {hasTournament && (
        <MoreSection title={t('session_section') || 'Sesja'}>
          <MoreItem
            icon="✏️"
            label={t('edit_tournament') || 'Edytuj turniej'}
            sub={tournamentSubtitle || (t('tap_to_edit') || 'Dotknij aby edytować')}
            onClick={onEditTournament}
            isLast
          />
        </MoreSection>
      )}

      {/* 2. BROWSE */}
      <MoreSection title={t('browse_section') || 'Przeglądaj'}>
        <MoreItem icon="🗺" label={t('layouts_label') || 'Layouty'} onClick={() => navigate('/layouts')} />
        <MoreItem icon="🏢" label={t('teams_label') || 'Drużyny'} onClick={() => navigate('/teams')} />
        <MoreItem icon="🎽" label={t('players_label') || 'Zawodnicy'} onClick={() => navigate('/players')} />
        <MoreItem icon="🏅" label={t('scout_ranking') || 'Ranking scoutów'} onClick={() => navigate('/scouts')} />
        <MoreItem icon="📋" label={t('todo_label') || 'Moje TODO scoutingowe'} onClick={() => navigate('/my-issues')} isLast />
      </MoreSection>

      {/* 3. ACTIONS — single adaptive row */}
      {hasTournament && (
        <MoreSection title={t('actions_single') || 'Akcje'} tone={isClosed ? 'danger' : 'default'}>
          {isClosed ? (
            <MoreItem icon="🗑" label={t('delete_tournament') || 'Usuń turniej'} danger onClick={onDeleteTournament} isLast />
          ) : (
            <MoreItem icon="🏁" label={t('close_tournament') || 'Zamknij turniej'} accent onClick={onCloseTournament} isLast />
          )}
        </MoreSection>
      )}

      {/* 4. ACCOUNT */}
      <MoreSection title={t('account_section') || 'Konto'}>
        <MoreItem icon="👤" label={t('my_profile') || 'Mój profil'} onClick={() => navigate('/profile')} />
        <MoreItem
          icon="🏠"
          label={t('workspace_label') || 'Workspace'}
          onClick={onLogout}
          rightSlot={workspaceName ? (
            <WorkspaceValue name={workspaceName} />
          ) : null}
        />
        {effectiveIsAdmin && (
          <MoreItem
            icon="👥"
            label={t('members_page_title') || 'Członkowie workspace\u2019u'}
            onClick={() => navigate('/settings/members')}
            rightSlot={pendingCount > 0 ? <PendingBadge count={pendingCount} /> : null}
          />
        )}
        <ViewAsPill />
        {onSignOut && (
          <MoreItem icon="🚪" label={t('sign_out') || 'Wyloguj się'} danger onClick={onSignOut} isLast />
        )}
      </MoreSection>

      {/* 5. DEBUG (admin only) */}
      {effectiveIsAdmin && (
        <MoreSection title="Debug">
          <MoreItem icon="🚩" label="Feature Flags" onClick={() => navigate('/debug/flags')} isLast />
        </MoreSection>
      )}

      {/* 6. LANGUAGE — last section, every screen */}
      <LanguageSection />
    </MoreShell>
  );
}

function WorkspaceValue({ name }) {
  return (
    <span style={{
      fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
      color: COLORS.textDim, marginRight: 4,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      maxWidth: 160,
    }}>{name}</span>
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
