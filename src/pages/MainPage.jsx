import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import TournamentPicker from '../components/TournamentPicker';
import NewTournamentModal from '../components/NewTournamentModal';
import ScoutTabContent from '../components/tabs/ScoutTabContent';
import CoachTabContent from '../components/tabs/CoachTabContent';
import MoreTabContent from '../components/tabs/MoreTabContent';
import { Btn } from '../components/ui';
import { useTournaments, useMatches, useScoutedTeams } from '../hooks/useFirestore';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';

/**
 * MainPage — root of the bottom-tab nav (DESIGN_DECISIONS § 31).
 *
 * Owns:
 *  - active tab (persisted)
 *  - active tournament id (persisted)
 *  - tournament picker open/close
 * Delegates rendering to AppShell + tab content components.
 *
 * Tab content components are wired in Parts 3-5. For Part 2 we render
 * a minimal placeholder so the shell is testable end-to-end.
 */
const TAB_KEY = 'pbscoutpro_activeTab';
const TOURN_KEY = 'pbscoutpro_activeTournament';

export default function MainPage({ onLogout, workspaceName }) {
  const navigate = useNavigate();
  const { tournaments } = useTournaments();

  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem(TAB_KEY) || 'scout'; }
    catch { return 'scout'; }
  });
  const [tournamentId, setTournamentId] = useState(() => {
    try { return localStorage.getItem(TOURN_KEY) || null; }
    catch { return null; }
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const tournament = useMemo(
    () => tournaments.find(t => t.id === tournamentId) || null,
    [tournaments, tournamentId],
  );

  // If saved id no longer exists (deleted on another device), drop it.
  useEffect(() => {
    if (tournamentId && tournaments.length && !tournament) {
      setTournamentId(null);
      try { localStorage.removeItem(TOURN_KEY); } catch {}
    }
  }, [tournamentId, tournament, tournaments.length]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    try { localStorage.setItem(TAB_KEY, tab); } catch {}
  };

  const handleSelectTournament = (id) => {
    setTournamentId(id);
    try {
      if (id) localStorage.setItem(TOURN_KEY, id);
      else localStorage.removeItem(TOURN_KEY);
    } catch {}
    setPickerOpen(false);
  };

  // Subtitle for context bar: league + match count (loaded lazily).
  const { matches } = useMatches(tournamentId);
  const { scouted } = useScoutedTeams(tournamentId);
  const subtitle = tournament
    ? [
        tournament.league || (tournament.type === 'practice' ? 'Practice' : null),
        matches?.length ? `${matches.length} matches` : null,
        scouted?.length ? `${scouted.length} teams` : null,
      ].filter(Boolean).join(' · ')
    : '';

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tournament={tournament}
      tournamentSubtitle={subtitle}
      onChangeTournament={() => setPickerOpen(true)}
    >
      {activeTab === 'more' ? (
        <MoreTabContent
          tournamentId={tournamentId}
          workspaceName={workspaceName}
          onSwitchTournament={() => setPickerOpen(true)}
          onLogout={onLogout}
        />
      ) : tournament ? (
        activeTab === 'scout' ? (
          <ScoutTabContent tournamentId={tournamentId} />
        ) : (
          <CoachTabContent tournamentId={tournamentId} />
        )
      ) : (
        <NoTournamentEmptyState onChoose={() => setPickerOpen(true)} />
      )}

      <TournamentPicker
        open={pickerOpen}
        activeTournamentId={tournamentId}
        onSelect={(id, kind) => {
          setPickerOpen(false);
          if (kind === 'training') {
            navigate(`/training/${id}`);
          } else {
            handleSelectTournament(id);
          }
        }}
        onNew={() => setNewModalOpen(true)}
        onClose={() => setPickerOpen(false)}
      />
      <NewTournamentModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={(id, kind) => {
          if (!id) return;
          if (kind === 'training') {
            navigate(`/training/${id}/setup`);
          } else {
            handleSelectTournament(id);
          }
        }}
      />
    </AppShell>
  );
}

function NoTournamentEmptyState({ onChoose }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      gap: SPACE.lg,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>🏆</div>
      <div style={{
        fontFamily: FONT,
        fontSize: FONT_SIZE.md,
        fontWeight: 500,
        color: COLORS.textDim,
        maxWidth: 280,
        lineHeight: 1.4,
      }}>
        Select a tournament or training to start scouting
      </div>
      <Btn variant="accent" onClick={onChoose}
        style={{ minHeight: 48, fontSize: FONT_SIZE.md, fontWeight: 700, padding: '0 24px' }}>
        Choose tournament
      </Btn>
    </div>
  );
}

