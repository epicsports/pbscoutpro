import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './hooks/useWorkspace';
import { setBasePath } from './services/dataService';
import { Loading } from './components/ui';
import LoginGate from './pages/LoginGate';
import HomePage from './pages/HomePage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import PlayersPage from './pages/PlayersPage';
import TournamentPage from './pages/TournamentPage';
import ScoutedTeamPage from './pages/ScoutedTeamPage';
import ScoutingPage from './pages/ScoutingPage';

function AppRoutes() {
  const { workspace, loading, error, enterWorkspace, leaveWorkspace, basePath } = useWorkspace();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (basePath) { setBasePath(basePath); setReady(true); }
    else { setReady(false); }
  }, [basePath]);

  if (loading) return <Loading text="Sprawdzanie sesji..." />;
  if (!workspace) return <LoginGate onEnter={enterWorkspace} error={error} />;
  if (!ready) return <Loading text="Przygotowanie danych..." />;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage onLogout={leaveWorkspace} workspaceName={workspace.name} />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/team/:teamId" element={<TeamDetailPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/tournament/:tournamentId" element={<TournamentPage />} />
        <Route path="/tournament/:tournamentId/team/:scoutedId" element={<ScoutedTeamPage />} />
        <Route path="/tournament/:tournamentId/team/:scoutedId/match/:matchId" element={<ScoutingPage />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <AppRoutes />
    </WorkspaceProvider>
  );
}
