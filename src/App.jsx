import React, { Suspense, lazy, useEffect, useState, useSyncExternalStore } from 'react';
import * as Sentry from '@sentry/react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './hooks/useWorkspace';
import { LanguageProvider } from './hooks/useLanguage';
import { SaveStatusProvider } from './hooks/useSaveStatus';
import { setBasePath } from './services/dataService';
import { Loading } from './components/ui';
import { useLanguage } from './hooks/useLanguage';
import LoginGate from './pages/LoginGate';
import LoginPage from './pages/LoginPage';
import BottomNav from './components/BottomNav';
import { useTournaments, useTrainings } from './hooks/useFirestore';
import { COLORS, FONT } from './utils/theme';

// Lazy load pages — reduces initial bundle
const MainPage = lazy(() => import('./pages/MainPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'));
const PlayersPage = lazy(() => import('./pages/PlayersPage'));
const ScoutedTeamPage = lazy(() => import('./pages/ScoutedTeamPage'));
const MatchPage = lazy(() => import('./pages/MatchPage'));
const LayoutsPage = lazy(() => import('./pages/LayoutsPage'));
const LayoutDetailPage = lazy(() => import('./pages/LayoutDetailPage'));
const LayoutWizardPage = lazy(() => import('./pages/LayoutWizardPage'));
const TacticPage = lazy(() => import('./pages/TacticPage'));
const BunkerEditorPage = lazy(() => import('./pages/BunkerEditorPage'));
const BallisticsPage = lazy(() => import('./pages/BallisticsPage'));
const LayoutAnalyticsPage = lazy(() => import('./pages/LayoutAnalyticsPage'));
const PlayerStatsPage = lazy(() => import('./pages/PlayerStatsPage'));
const TrainingSetupPage = lazy(() => import('./pages/TrainingSetupPage'));
const TrainingSquadsPage = lazy(() => import('./pages/TrainingSquadsPage'));
const TrainingPage = lazy(() => import('./pages/TrainingPageRedirect'));
const TrainingResultsPage = lazy(() => import('./pages/TrainingResultsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ScoutRankingPage = lazy(() => import('./pages/ScoutRankingPage'));
const ScoutDetailPage = lazy(() => import('./pages/ScoutDetailPage'));
const ScoutIssuesPage = lazy(() => import('./pages/ScoutIssuesPage'));

function AppRoutes() {
  const { workspace, loading, error, enterWorkspace, leaveWorkspace, basePath, user, userReady, signOutUser } = useWorkspace();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (basePath) { setBasePath(basePath); setReady(true); }
    else { setReady(false); }
  }, [basePath]);

  if (loading || !userReady) return <Loading text="Checking session..." />;
  // No Firebase user at all → show email/password login. Anonymous users
  // (legacy sessions that already passed through LoginGate) are allowed through.
  if (!user) return <LoginPage />;
  if (!workspace) return <LoginGate onEnter={enterWorkspace} error={error} user={user} onSignOut={signOutUser} />;
  if (!ready) return <Loading text="Preparing data..." />;

  return (
    <HashRouter>
      <Suspense fallback={<Loading text="Loading..." />}>
        <Routes>
          <Route path="/" element={<MainPage onLogout={leaveWorkspace} onSignOut={signOutUser} workspaceName={workspace.name} />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/team/:teamId" element={<TeamDetailPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/layouts" element={<LayoutsPage />} />
          <Route path="/layout/new" element={<LayoutWizardPage />} />
          <Route path="/layout/:layoutId" element={<LayoutDetailPage />} />
          <Route path="/layout/:layoutId/bunkers" element={<BunkerEditorPage />} />
          <Route path="/layout/:layoutId/ballistics" element={<BallisticsPage />} />
          <Route path="/layout/:layoutId/analytics/:mode" element={<LayoutAnalyticsPage />} />
          <Route path="/tournament/:tournamentId/team/:scoutedId" element={<ScoutedTeamPage />} />
          <Route path="/tournament/:tournamentId/match/:matchId" element={<MatchPage />} />
          <Route path="/tournament/:tournamentId/tactic/:tacticId" element={<TacticPage />} />
          <Route path="/layout/:layoutId/tactic/:tacticId" element={<TacticPage />} />
          <Route path="/player/:playerId/stats" element={<PlayerStatsPage />} />
          <Route path="/training/:trainingId/setup" element={<TrainingSetupPage />} />
          <Route path="/training/:trainingId/squads" element={<TrainingSquadsPage />} />
          <Route path="/training/:trainingId/results" element={<TrainingResultsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/training/:trainingId/matchup/:matchupId" element={<MatchPage />} />
          <Route path="/training/:trainingId" element={<TrainingPage />} />
          <Route path="/scouts" element={<ScoutRankingPage />} />
          <Route path="/scouts/:uid" element={<ScoutDetailPage />} />
          <Route path="/my-issues" element={<ScoutIssuesPage />} />
        </Routes>
      </Suspense>
      <SessionContextBar />
      <BottomNav />
      <OfflineBanner />
    </HashRouter>
  );
}

/**
 * SessionContextBar — persistent LIVE session jumper.
 * Appears above BottomNav when any tournament or training has status === 'live'.
 * Tapping it navigates back to that session.
 */
function SessionContextBar() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const liveTournament = tournaments.find(x => x.status === 'live') || null;
  const liveTraining = trainings.find(x => x.status === 'live') || null;
  const session = liveTournament || liveTraining;
  if (!session) return null;
  const type = liveTournament ? 'tournament' : 'training';
  const isSparing = session.eventType === 'sparing';
  const label = type === 'tournament'
    ? session.name
    : `${t('training')} · ${session.date || ''}`;
  const badge = type === 'training'
    ? t('live_training')
    : isSparing ? t('live_sparing') : t('live_tournament');
  const go = () => {
    if (type === 'training') {
      // Set training context so MainPage picks it up on mount
      try {
        localStorage.setItem('pbscoutpro_lastKind', 'training');
        localStorage.setItem('pbscoutpro_lastTraining', session.id);
        localStorage.removeItem('pbscoutpro_activeTournament');
      } catch {}
    }
    navigate('/');
  };
  return (
    <div onClick={go} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px', background: '#0d1117',
      borderTop: '1px solid #1a2234',
      cursor: 'pointer', minHeight: 44,
      WebkitTapHighlightColor: 'transparent',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#ef444415', border: '1px solid #ef444430',
        borderRadius: 5, padding: '2px 7px', flexShrink: 0,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#ef4444', animation: 'livepulse 1.5s infinite',
        }} />
        <span style={{
          fontFamily: FONT, fontSize: 9, fontWeight: 800,
          color: '#ef4444', letterSpacing: 0.8,
        }}>
          {badge}
        </span>
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 600,
        color: COLORS.text, flex: 1, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {session.isTest && '(TEST) '}{label}
      </span>
      <span style={{
        fontFamily: FONT, fontSize: 12, color: COLORS.accent,
        fontWeight: 600, flexShrink: 0,
      }}>{t('live_go')}</span>
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
      fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
      textAlign: 'center', zIndex: 200,
    }}>
      Offline — using cached data
    </div>
  );
}

function SentryFallback({ error, resetError }) {
  return (
    <div style={{ padding: 24, color: '#ef4444', background: '#0a0e17', minHeight: '100vh', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      <h2 style={{ color: '#f59e0b', marginBottom: 12 }}>Crash Report</h2>
      <p><b>Error:</b> {error?.message}</p>
      <p style={{ marginTop: 8, color: '#64748b' }}>{error?.stack}</p>
      <button onClick={() => { resetError(); window.location.hash = '#/'; window.location.reload(); }}
        style={{ marginTop: 16, padding: '10px 20px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, minHeight: 44 }}>
        Reload App
      </button>
    </div>
  );
}

const ErrorBoundary = Sentry.withErrorBoundary(({ children }) => children, {
  fallback: SentryFallback,
  showDialog: false,
});

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <LanguageProvider>
          <SaveStatusProvider>
            <AppRoutes />
          </SaveStatusProvider>
        </LanguageProvider>
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}
