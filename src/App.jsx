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
const LayoutWizardPage = lazy(() => import('./pages/LayoutWizardPage'));
const TacticPage = lazy(() => import('./pages/TacticPage'));
const BunkerEditorPage = lazy(() => import('./pages/BunkerEditorPage'));
const BallisticsPage = lazy(() => import('./pages/BallisticsPage'));

function AppRoutes() {
  const { workspace, loading, error, enterWorkspace, leaveWorkspace, basePath } = useWorkspace();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (basePath) { setBasePath(basePath); setReady(true); }
    else { setReady(false); }
  }, [basePath]);

  if (loading) return <Loading text="Checking session..." />;
  if (!workspace) return <LoginGate onEnter={enterWorkspace} error={error} />;
  if (!ready) return <Loading text="Preparing data..." />;

  return (
    <HashRouter>
      <Suspense fallback={<Loading text="Loading..." />}>
        <Routes>
          <Route path="/" element={<HomePage onLogout={leaveWorkspace} workspaceName={workspace.name} />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/team/:teamId" element={<TeamDetailPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/layouts" element={<LayoutsPage />} />
          <Route path="/layout/new" element={<LayoutWizardPage />} />
          <Route path="/layout/:layoutId" element={<LayoutDetailPage />} />
          <Route path="/layout/:layoutId/bunkers" element={<BunkerEditorPage />} />
          <Route path="/layout/:layoutId/ballistics" element={<BallisticsPage />} />
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

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('React crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#ef4444', background: '#0a0e17', minHeight: '100vh', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          <h2 style={{ color: '#f59e0b', marginBottom: 12 }}>Crash Report</h2>
          <p><b>Error:</b> {this.state.error?.message}</p>
          <p style={{ marginTop: 8, color: '#64748b' }}>{this.state.error?.stack}</p>
          <button onClick={() => { this.setState({ error: null }); window.location.hash = '#/'; window.location.reload(); }}
            style={{ marginTop: 16, padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700 }}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <SaveStatusProvider>
          <AppRoutes />
        </SaveStatusProvider>
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}
