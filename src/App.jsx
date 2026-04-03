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
      <HandednessPrompt />
    </HashRouter>
  );
}

function HandednessPrompt() {
  const [show, setShow] = useState(() => !localStorage.getItem('pbscoutpro-handedness'));
  if (!show) return null;
  const pick = (hand) => { localStorage.setItem('pbscoutpro-handedness', hand); setShow(false); };
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20,
    }}>
      <div style={{
        background: '#111827', border: '1px solid #2a3548', borderRadius: 16,
        padding: '24px 20px', maxWidth: 320, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, color: '#e2e8f0', marginBottom: 8 }}>
          Którą ręką obsługujesz telefon?
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>
          Dostosuje pozycję lupy na ekranie
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => pick('left')} style={{
            flex: 1, padding: '14px 0', borderRadius: 10, border: '2px solid #3b82f6',
            background: '#3b82f620', color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>🤚 Lewa</button>
          <button onClick={() => pick('right')} style={{
            flex: 1, padding: '14px 0', borderRadius: 10, border: '2px solid #f59e0b',
            background: '#f59e0b20', color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>🤚 Prawa</button>
        </div>
      </div>
    </div>
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
