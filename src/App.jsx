import React, { Suspense, lazy, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './hooks/useWorkspace';
import { useInviteRedemption } from './hooks/useInviteRedemption';
import { useOnline } from './hooks/useOnline';
import { LanguageProvider } from './hooks/useLanguage';
import { SaveStatusProvider } from './hooks/useSaveStatus';
import { setBasePath } from './services/dataService';
import { Loading } from './components/ui';
import { useLanguage } from './hooks/useLanguage';
import LoginPage from './pages/LoginPage';
import ReviewRolesModal from './components/ReviewRolesModal';
import RouteGuard from './components/RouteGuard';
import { ViewAsProvider } from './contexts/ViewAsContext';
import { useViewAs } from './hooks/useViewAs';
import { useIsSuperAdmin } from './hooks/useIsSuperAdmin';
import { KioskProvider } from './contexts/KioskContext';
import { QuickLogProvider } from './contexts/QuickLogContext';
import KioskPostSaveSummary from './components/kiosk/KioskPostSaveSummary';
import KioskLobbyOverlay from './components/kiosk/KioskLobbyOverlay';
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
const AdminLeaguesPage = lazy(() => import('./pages/admin/AdminLeaguesPage'));
const AdminPlayersPage = lazy(() => import('./pages/admin/AdminPlayersPage'));
const AdminTeamsPage = lazy(() => import('./pages/admin/AdminTeamsPage'));
const WorkspacesAdminPage = lazy(() => import('./pages/admin/WorkspacesAdminPage'));
const PbleaguesOnboardingPage = lazy(() => import('./pages/PbleaguesOnboardingPage'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));
const PlayerPerformanceTrackerPage = lazy(() => import('./pages/PlayerPerformanceTrackerPage'));

function AppRoutes() {
  const {
    workspace, loading, error, noWorkspace,
    basePath, user, userReady, signOutUser,
    roles, isAdmin, isPendingApproval, linkedPlayer, userProfile,
  } = useWorkspace();
  const [ready, setReady] = useState(false);
  const { inviteRedeeming, inviteError } = useInviteRedemption();

  useEffect(() => {
    if (basePath) { setBasePath(basePath); setReady(true); }
    else { setReady(false); }
  }, [basePath]);

  if (loading || !userReady) return <Loading text="Checking session..." />;
  // No Firebase user at all → show email/password login. Anonymous users
  // (legacy sessions that already passed through the retired team-code
  // gate) are allowed through.
  if (!user) return <LoginPage />;
  // Soft-disabled bootstrap (§ 50.5): admin set users/{uid}.disabled = true.
  // Render explicit screen with sign-out CTA. User can re-authenticate but
  // will land here again until admin re-enables.
  if (userProfile?.disabled) return <DisabledAccountScreen onSignOut={signOutUser} />;
  // Model B invite redemption — a stashed invite token (from a #/invite/{token}
  // link) redeems once the user is authed; on success setActiveWorkspace reloads
  // into the invited workspace. Failure → InviteErrorScreen.
  if (inviteError) return <InviteErrorScreen code={inviteError} onSignOut={signOutUser} />;
  if (inviteRedeeming) return <Loading text="Joining workspace…" />;
  // Retire team-code gate (2026-04-24). WorkspaceProvider auto-enters the
  // user's default workspace as soon as user + userProfile resolve. Until
  // that write lands we show a spinner; if the write fails we surface the
  // error with a sign-out escape. Admin workspace-switch still lives under
  // Settings → Mój workspace (password-gated via the untouched
  // enterWorkspace(code) path).
  if (!workspace) {
    if (error) return <AutoEnterErrorScreen error={error} onSignOut={signOutUser} />;
    // `noWorkspace` is set by auto-enter ONLY after it confirms neither a
    // defaultWorkspace pointer NOR any membership resolves (FIT-isolation fix).
    // Existing members with no defaultWorkspace enter via membership and never
    // reach here; brand-new non-members land on NoWorkspaceScreen. While
    // auto-enter is still resolving, show the spinner (not the screen).
    if (noWorkspace) {
      return <NoWorkspaceScreen onSignOut={signOutUser} />;
    }
    return <Loading text="Preparing your workspace..." />;
  }
  if (!ready) return <Loading text="Preparing data..." />;

  // § 38 AuthGate — route gating by linked-player + approval state.
  //   1. Admin always proceeds (emergency restore path: never locks out).
  //   2. Not linked AND hasn't deliberately skipped onboarding → onboarding.
  //   3. Linked but empty roles → pending approval.
  //   4. Otherwise → app.
  //
  // `linkSkippedAt` (2026-04-24 relax-pbleagues-onboarding): user chose
  // "Pomiń na razie" in PbleaguesOnboardingPage. They land in the app in
  // unlinked mode; can link later from ProfilePage. See § 49.8 + the
  // PPT unlinked-mode ship (e94aafa) for the rest of the story.
  //
  // rolesVersion < 2 means pre-migration: skip gates until migration runs
  // (admin-only trigger in useWorkspace). Existing active users see app as
  // before during the migration window.
  const premigration = workspace.rolesVersion !== 2;
  if (!isAdmin && !premigration) {
    if (!linkedPlayer && !userProfile?.linkSkippedAt) {
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
      <KioskProvider>
      <QuickLogProvider>
      <HashRouter>
        <Suspense fallback={<Loading text="Loading..." />}>
          <Routes>
            <Route path="/" element={<MainPage onSignOut={signOutUser} workspaceName={workspace.name} />} />
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
            <Route path="/admin/leagues" element={<SuperAdminGuard><AdminLeaguesPage /></SuperAdminGuard>} />
            <Route path="/admin/players" element={<SuperAdminGuard><AdminPlayersPage /></SuperAdminGuard>} />
            <Route path="/admin/teams" element={<SuperAdminGuard><AdminTeamsPage /></SuperAdminGuard>} />
            <Route path="/admin/workspaces" element={<SuperAdminGuard><WorkspacesAdminPage /></SuperAdminGuard>} />
            <Route path="/settings/members" element={<AdminGuard><MembersPage /></AdminGuard>} />
            <Route path="/settings/members/:uid" element={<AdminGuard><UserDetailPage /></AdminGuard>} />
            {/* PPT (DESIGN_DECISIONS § 48). Same component handles both the
                picker URL and the wizard host URL — branches on location. */}
            <Route path="/player/log" element={<PlayerPerformanceTrackerPage />} />
            <Route path="/player/log/wizard" element={<PlayerPerformanceTrackerPage />} />
          </Routes>
        </Suspense>
        <OfflineBanner />
        <ReviewRolesModal />
        <BlockedRouteToast />
        {/* § 55 KIOSK overlays — full-screen, self-gate by
            KioskContext.{postSaveOpen,lobbyOpen} + viewport. Mounted INSIDE
            HashRouter so KioskLobbyOverlay's useNavigate (Brief D deep-link)
            resolves Router context — outside it threw "useNavigate() may be
            used only in the context of a <Router>". Triggered after Quick Log
            save in TrainingScoutTab (E4). */}
        <KioskPostSaveSummary />
        <KioskLobbyOverlay />
      </HashRouter>
      </QuickLogProvider>
      </KioskProvider>
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

// SuperAdminGuard — wraps the GLOBAL editor routes (leagues / teams / players).
// Global data crosses workspaces, so these gate on cross-workspace super_admin
// (useIsSuperAdmin = users/{uid}.globalRole==='super_admin' OR the ADMIN_EMAILS
// bootstrap), NOT the workspace-level effectiveIsAdmin used by AdminGuard.
// /debug/flags keeps AdminGuard — feature flags are workspace-scoped config.
function SuperAdminGuard({ children }) {
  const isSuperAdmin = useIsSuperAdmin();
  const location = useLocation();
  if (!isSuperAdmin) {
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

// AutoEnterErrorScreen — shown when WorkspaceProvider's auto-enter of the
// user's default workspace fails (e.g. the target workspace doc doesn't
// exist, or a transient Firestore permission error). Gives the user an
// escape hatch via sign-out so they can re-try or report the issue.
function AutoEnterErrorScreen({ error, onSignOut }) {
  const { t } = useLanguage();
  return (
    <div style={{
      minHeight: '100dvh', background: COLORS.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 420, width: '100%',
        background: '#0f172a', border: `1px solid ${COLORS.danger}55`, borderRadius: 16,
        padding: 28, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{
          fontFamily: FONT, fontSize: 20, fontWeight: 700,
          color: COLORS.danger, marginBottom: 8,
        }}>{t('workspace_enter_error_title') || 'Nie udało się wejść do workspace\'a'}</div>
        <div style={{
          fontFamily: FONT, fontSize: 13, color: COLORS.textDim, marginBottom: 20,
          lineHeight: 1.5, wordBreak: 'break-word',
        }}>{error}</div>
        <button
          onClick={onSignOut}
          style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 700,
            padding: '12px 24px', minHeight: 48, borderRadius: 10,
            background: COLORS.accent, color: '#000', border: 'none',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}
        >{t('sign_out') || 'Wyloguj się'}</button>
      </div>
    </div>
  );
}

// InviteErrorScreen — shown when an invite link fails to redeem (expired,
// already used, invalid, or denied). Sign-out CTA; user asks for a fresh link.
function InviteErrorScreen({ code, onSignOut }) {
  const { t } = useLanguage();
  const body =
    code === 'INVITE_EXPIRED' ? (t('invite_error_expired') || 'This invite link has expired. Ask an admin for a fresh one.')
    : code === 'INVITE_REDEEMED' ? (t('invite_error_redeemed') || 'This invite link was already used. Ask an admin for a fresh one.')
    : code === 'INVITE_INVALID' ? (t('invite_error_invalid') || 'This invite link is invalid. Ask an admin for a fresh one.')
    : (t('invite_error_generic') || 'Couldn’t redeem this invite. Ask an admin for a fresh link.');
  return (
    <div style={{
      minHeight: '100dvh', background: COLORS.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        maxWidth: 420, width: '100%',
        background: '#0f172a', border: `1px solid ${COLORS.danger}55`, borderRadius: 16,
        padding: 28, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{
          fontFamily: FONT, fontSize: 20, fontWeight: 700,
          color: COLORS.danger, marginBottom: 8,
        }}>{t('invite_error_title') || 'Invite link problem'}</div>
        <div style={{
          fontFamily: FONT, fontSize: 14, color: COLORS.textDim, marginBottom: 24, lineHeight: 1.5,
        }}>{body}</div>
        <button
          onClick={onSignOut}
          style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 700,
            padding: '12px 24px', minHeight: 48, borderRadius: 10,
            background: COLORS.accent, color: '#000', border: 'none',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}
        >{t('sign_out') || 'Sign out'}</button>
      </div>
    </div>
  );
}

// NoWorkspaceScreen — landing for a new (non-bootstrap) account that has no
// workspace assignment (FIT-isolation fix). Replaces the endless "Preparing
// your workspace…" spinner. The real self-join / invite carrier is a separate
// greenfield brief; for now the user is told to ask an admin for access.
function NoWorkspaceScreen({ onSignOut }) {
  const { t } = useLanguage();
  return (
    <div style={{
      minHeight: '100dvh', background: COLORS.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 420, width: '100%',
        background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 16,
        padding: 28, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <div style={{
          fontFamily: FONT, fontSize: 20, fontWeight: 700,
          color: COLORS.text, marginBottom: 8,
        }}>{t('no_workspace_title') || 'Account created'}</div>
        <div style={{
          fontFamily: FONT, fontSize: 14, color: COLORS.textDim, marginBottom: 24,
          lineHeight: 1.5,
        }}>{t('no_workspace_body') || 'Your account was created successfully. An admin still needs to add you to your team’s workspace and assign your role — you’ll have access once that’s done.'}</div>
        <button
          onClick={onSignOut}
          style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 700,
            padding: '12px 24px', minHeight: 48, borderRadius: 10,
            background: COLORS.accent, color: '#000', border: 'none',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}
        >{t('sign_out') || 'Sign out'}</button>
      </div>
    </div>
  );
}

function DisabledAccountScreen({ onSignOut }) {
  const { t } = useLanguage();
  return (
    <div style={{
      minHeight: '100dvh', background: COLORS.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 420, width: '100%',
        background: '#0f172a', border: `1px solid ${COLORS.danger}55`, borderRadius: 16,
        padding: 28, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
        <div style={{
          fontFamily: FONT, fontSize: 20, fontWeight: 700,
          color: COLORS.danger, marginBottom: 8,
        }}>{t('user_disabled_status') || 'Konto wyłączone'}</div>
        <div style={{
          fontFamily: FONT, fontSize: 14, color: COLORS.textDim, marginBottom: 24,
          lineHeight: 1.5,
        }}>{t('disabled_login_bounce') || 'Konto zostało wyłączone przez administratora.'}</div>
        <button
          onClick={onSignOut}
          style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 700,
            padding: '12px 24px', minHeight: 48, borderRadius: 10,
            background: COLORS.accent, color: '#000', border: 'none',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}
        >{t('sign_out') || 'Wyloguj się'}</button>
      </div>
    </div>
  );
}

// OfflineBanner — high-trust connectivity affordance for venue use (§27:
// danger-red while offline, success-green on reconnect; non-interactive, so
// pointerEvents:none + no amber/glow). The copy reassures that work is durable:
// the localStorage scout draft + Firestore's queued writes both survive a drop
// and sync on reconnect (see SCOUTING_CONCURRENCY_AND_CACHE.md § 5).
function OfflineBanner() {
  const online = useOnline();
  const [reconnected, setReconnected] = useState(false);
  const wasOfflineRef = React.useRef(false);

  useEffect(() => {
    if (!online) { wasOfflineRef.current = true; setReconnected(false); return undefined; }
    if (!wasOfflineRef.current) return undefined;
    wasOfflineRef.current = false;
    setReconnected(true);
    const timer = setTimeout(() => setReconnected(false), 2500);
    return () => clearTimeout(timer);
  }, [online]);

  if (online && !reconnected) return null;

  const bar = {
    position: 'fixed', top: 0, left: 0, right: 0,
    padding: 'calc(6px + env(safe-area-inset-top, 0px)) 16px 6px',
    fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: '.2px',
    textAlign: 'center', zIndex: 200, pointerEvents: 'none',
    color: COLORS.white,
  };
  return online ? (
    <div style={{ ...bar, background: COLORS.success }}>Back online — syncing changes…</div>
  ) : (
    <div style={{ ...bar, background: COLORS.danger }}>Offline — changes save on this device and sync when you reconnect</div>
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
