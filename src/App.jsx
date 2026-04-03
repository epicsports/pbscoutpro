import React, { Suspense, lazy, useEffect, useState, useSyncExternalStore } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './hooks/useWorkspace';
import { SaveStatusProvider } from './hooks/useSaveStatus';
import { setBasePath } from './services/dataService';
import { Loading } from './components/ui';
import LoginGate from './pages/LoginGate';
import BottomNav from './components/BottomNav';

// Lazy load pages — reduces initial bundle
const HomePage = lazy(() => import('./pages/HomePage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'));
const PlayersPage = lazy(() => import('./pages/PlayersPage'));
const TournamentPage = lazy(() => import('./pages/TournamentPage'));
const ScoutedTeamPage = lazy(() => import('./pages/ScoutedTeamPage'));
const MatchPage = lazy(() => import('./pages/MatchPage'));
const LayoutsPage = lazy(() => import('./pages/LayoutsPage'));
const LayoutDetailPage = lazy(() => import('./pages/LayoutDetailPage'));
const TacticPage = lazy(() => import('./pages/TacticPage'));

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
      <Suspense fallback={<Loading text="Ładowanie..." />}>
        <Routes>
          <Route path="/" element={<HomePage onLogout={leaveWorkspace} workspaceName={workspace.name} />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/team/:teamId" element={<TeamDetailPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/layouts" element={<LayoutsPage />} />
          <Route path="/layout/:layoutId" element={<LayoutDetailPage />} />
          <Route path="/tournament/:tournamentId" element={<TournamentPage />} />
          <Route path="/tournament/:tournamentId/team/:scoutedId" element={<ScoutedTeamPage />} />
          <Route path="/tournament/:tournamentId/match/:matchId" element={<MatchPage />} />
          <Route path="/tournament/:tournamentId/tactic/:tacticId" element={<TacticPage />} />
          <Route path="/layout/:layoutId/tactic/:tacticId" element={<TacticPage />} />
        </Routes>
      </Suspense>
      <BottomNav />
      <OfflineBanner />
    </HashRouter>
  );
}

function useOnline() {
  return useSyncExternalStore(
    cb => { window.addEventListener('online', cb); window.addEventListener('offline', cb); return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); }; },
    () => navigator.onLine,
  );
}

function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      padding: '6px 16px', background: '#ef4444', color: '#fff',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
      textAlign: 'center', zIndex: 200,
    }}>
      Offline — using cached data
    </div>
  );
}

export default function App() {
  return (
    <WorkspaceProvider>
      <SaveStatusProvider>
        <AppRoutes />
      </SaveStatusProvider>
    </WorkspaceProvider>
  );
}
