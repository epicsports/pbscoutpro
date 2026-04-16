import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { MoreShell, MoreSection, StatusHeader, MoreItem, WorkspaceFooter } from './MoreShell';

/**
 * Tournament More tab — Apple HIG–inspired hierarchy.
 *
 *  1. Status header (live/closed + LIVE toggle, test marker)
 *  2. Session         — edit details
 *  3. Browse          — workspace data (layouts/teams/players/scouts/todo)
 *  4. Account         — profile, sign out
 *  5. Danger zone     — close/reopen + delete (visually offset, red border)
 *  6. Workspace footer — current workspace + change link
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
  onReopenTournament,
  onDeleteTournament,
  onToggleLive,
  onLogout,
  onSignOut,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const hasTournament = !!tournamentId;
  const isClosed = tournament?.status === 'closed';

  const tournamentSubtitle = [
    tournament?.league,
    tournament?.year,
    tournament?.matchCount && `${tournament.matchCount} meczy`,
  ].filter(Boolean).join(' · ');

  return (
    <MoreShell>
      {/* 1. STATUS HEADER */}
      {hasTournament && (
        <StatusHeader
          status={tournament?.status}
          onToggleLive={onToggleLive}
          isTest={tournament?.isTest}
          type="tournament"
        />
      )}

      {/* 2. SESSION */}
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

      {/* 3. BROWSE */}
      <MoreSection title={t('browse_section') || 'Przeglądaj'}>
        <MoreItem icon="🗺" label={t('layouts_label') || 'Layouty'} onClick={() => navigate('/layouts')} />
        <MoreItem icon="🏢" label={t('teams_label') || 'Drużyny'} onClick={() => navigate('/teams')} />
        <MoreItem icon="🎽" label={t('players_label') || 'Zawodnicy'} onClick={() => navigate('/players')} />
        <MoreItem icon="🏅" label={t('scout_ranking') || 'Ranking scoutów'} onClick={() => navigate('/scouts')} />
        <MoreItem icon="📋" label={t('todo_label') || 'Moje TODO scoutingowe'} onClick={() => navigate('/my-issues')} isLast />
      </MoreSection>

      {/* 4. ACCOUNT */}
      <MoreSection title={t('account_section') || 'Konto'}>
        <MoreItem icon="👤" label={t('my_profile') || 'Mój profil'} onClick={() => navigate('/profile')} />
        {onSignOut && (
          <MoreItem icon="🚪" label={t('sign_out') || 'Wyloguj się'} onClick={onSignOut} isLast />
        )}
      </MoreSection>

      {/* 5. DANGER ZONE */}
      {hasTournament && (
        <MoreSection title={t('danger_zone') || 'Strefa zagrożenia'} tone="danger">
          {!isClosed && (
            <MoreItem icon="🏁" label={t('end_tournament') || 'Zakończ turniej'} onClick={onCloseTournament} />
          )}
          {isClosed && (
            <MoreItem icon="🔓" label={t('reopen_tournament') || 'Otwórz ponownie'} onClick={onReopenTournament} />
          )}
          <MoreItem icon="🗑" label={t('delete_tournament') || 'Usuń turniej'} danger onClick={onDeleteTournament} isLast />
        </MoreSection>
      )}

      {/* 6. WORKSPACE FOOTER */}
      <WorkspaceFooter workspaceName={workspaceName} onChangeWorkspace={onLogout} />
    </MoreShell>
  );
}
