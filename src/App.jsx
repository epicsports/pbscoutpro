import React, { Suspense, lazy, useEffect, useState, useSyncExternalStore } from 'react';
import * as Sentry from '@sentry/react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './hooks/useWorkspace';
import { LanguageProvider } from './hooks/useLanguage';
import { SaveStatusProvider } from './hooks/useSaveStatus';
import { setBasePath } from './services/dataService';
import { Loading } from './components/ui';
import { useLanguage } from './hooks/useLanguage';
import LoginGate from './pages/LoginGate';
import LoginPage from './pages/LoginPage';
import BottomNav from './components/BottomNav';
import ReviewRolesModal from './components/ReviewRolesModal';
import ViewAsIndicator from './components/ViewAsIndicator';
import RouteGuard from './components/RouteGuard';
import { ViewAsProvider } from './contexts/ViewAsContext';
import { useViewAs } from './hooks/useViewAs';
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
const DebugFlagsPage = lazy(() => import('./pages/DebugFlagsPage'));
const PbleaguesOnboardingPage = lazy(() => import('./pages/PbleaguesOnboardingPage'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const PlayerPerformanceTrackerPage = lazy(() => import('./pages/PlayerPerformanceTrackerPage'));

function AppRoutes() {
  const {
    workspace, loading, error, enterWorkspace, leaveWorkspace,
    basePath, user, userReady, signOutUser,
    roles, isAdmin, isPendingApproval, linkedPlayer,
  } = useWorkspace();
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

  // § 38 AuthGate — route gating by linked-player + approval state.
  //   1. Admin always proceeds (emergency restore path: never locks out).
  //   2. Not linked to any player → onboarding.
  //   3. Linked but empty roles → pending approval.
  //   4. Otherwise → app.
  // rolesVersion < 2 means pre-migration: skip gates until migration runs
  // (admin-only trigger in useWorkspace). Existing active users see app as
  // before during the migration window.
  const premigration = workspace.rolesVersion !== 2;
  if (!isAdmin && !premigration) {
    if (!linkedPlayer) {
      return (
        <Suspense fallback={<Loading text="Loading..." />}>
          <PbleaguesOnboardingPage />
        </Suspense>
      );
    }
    if (isPendingApproval) {
      return (
        <Suspense fallback={<Loading text="Loading..." />}>
          <PendingApprovalPage />
        </Suspense>
      );
    }
  }

  return (
    <ViewAsProvider key={workspace.slug} workspaceSlug={workspace.slug}>
      <HashRouter>
        <Suspense fallback={<Loading text="Loading..." />}>
          <Routes>
            <Route path="/" element={<MainPage onLogout={leaveWorkspace} onSignOut={signOutUser} workspaceName={workspace.name} />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/team/:teamId" element={<TeamDetailPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/layouts" element={<RouteGuard><LayoutsPage /></RouteGuard>} />
            <Route path="/layout/new" element={<RouteGuard><LayoutWizardPage /></RouteGuard>} />
            <Route path="/layout/:layoutId" element={<RouteGuard><LayoutDetailPage /></RouteGuard>} />
            <Route path="/layout/:layoutId/bunkers" element={<RouteGuard><BunkerEditorPage /></RouteGuard>} />
            <Route path="/layout/:layoutId/ballistics" element={<RouteGuard><BallisticsPage /></RouteGuard>} />
            <Route path="/layout/:layoutId/analytics/:mode" element={<RouteGuard><LayoutAnalyticsPage /></RouteGuard>} />
            <Route path="/tournament/:tournamentId/team/:scoutedId" element={<ScoutedTeamPage />} />
            <Route path="/tournament/:tournamentId/match/:matchId" element={<RouteGuard><MatchPage /></RouteGuard>} />
            <Route path="/tournament/:tournamentId/tactic/:tacticId" element={<RouteGuard><TacticPage /></RouteGuard>} />
            <Route path="/layout/:layoutId/tactic/:tacticId" element={<RouteGuard><TacticPage /></RouteGuard>} />
            <Route path="/player/:playerId/stats" element={<PlayerStatsPage />} />
            <Route path="/training/:trainingId/setup" element={<TrainingSetupPage />} />
            <Route path="/training/:trainingId/squads" element={<TrainingSquadsPage />} />
            <Route path="/training/:trainingId/results" element={<TrainingResultsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/training/:trainingId/matchup/:matchupId" element={<RouteGuard><MatchPage /></RouteGuard>} />
            <Route path="/training/:trainingId" element={<TrainingPage />} />
            <Route path="/scouts" element={<ScoutRankingPage />} />
            <Route path="/scouts/:uid" element={<ScoutDetailPage />} />
            <Route path="/my-issues" element={<ScoutIssuesPage />} />
            <Route path="/debug/flags" element={<AdminGuard><DebugFlagsPage /></AdminGuard>} />
            <Route path="/settings/members" element={<AdminGuard><MembersPage /></AdminGuard>} />
            {/* PPT (DESIGN_DECISIONS § 48). Same component handles both the
                picker URL and the wizard host URL — branches on location. */}
            <Route path="/player/log" element={<PlayerPerformanceTrackerPage />} />
            <Route path="/player/log/wizard" element={<PlayerPerformanceTrackerPage />} />
          </Routes>
        </Suspense>
        <BottomNav />
        <OfflineBanner />
        <ReviewRolesModal />
        <BlockedRouteToast />
        <ViewAsIndicator />
      </HashRouter>
    </ViewAsProvider>
  );
}

// AdminGuard — wraps admin-only routes. Uses `effectiveIsAdmin` from useViewAs
// so admin impersonating a non-admin role is correctly blocked (§ 38.5/38.6).
// Real admins retain access via the View Switcher exit (ViewAsIndicator × button).
function AdminGuard({ children }) {
  const { effectiveIsAdmin } = useViewAs();
  const location = useLocation();
  if (!effectiveIsAdmin) {
    return <Navigate to="/" replace state={{ blockedRoute: location.pathname }} />;
  }
  return children;
}

// BlockedRouteToast — surfaces "role X has no access to this section" after a
// RouteGuard / AdminGuard redirect. Reads `location.state.blockedRoute` set by
// those guards, shows briefly, then clears state so back-nav doesn't re-fire.
function BlockedRouteToast() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { effectiveRoles } = useViewAs();
  const blocked = location.state?.blockedRoute;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!blocked) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      navigate(location.pathname, { replace: true, state: {} });
    }, 3200);
    return () => clearTimeout(timer);
  }, [blocked, location.pathname, navigate]);

  if (!visible || !blocked) return null;
  const role = effectiveRoles[0] || 'guest';
  const roleLabel = t(`view_as_role_${role}`) || role;
  const text = t('view_as_blocked_route_toast', { role: roleLabel });
  return (
    <div style={{
      position: 'fixed',
      left: '50%', transform: 'translateX(-50%)',
      bottom: 'calc(130px + env(safe-area-inset-bottom, 0px))',
      maxWidth: 360, width: 'calc(100% - 32px)',
      padding: '10px 14px',
      background: COLORS.surface,
      border: `1px solid ${COLORS.accent}60`,
      borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      color: COLORS.text,
      fontFamily: FONT, fontSize: 13, fontWeight: 600,
      textAlign: 'center',
      zIndex: 9998,
      pointerEvents: 'none',
    }}>{text}</div>
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
