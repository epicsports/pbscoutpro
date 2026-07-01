import React, { Suspense, lazy, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './hooks/useWorkspace';
import { useInviteRedemption } from './hooks/useInviteRedemption';
import { useOnline } from './hooks/useOnline';
import { LanguageProvider } from './hooks/useLanguage';
import { SaveStatusProvider } from './hooks/useSaveStatus';
import { setBasePath } from './services/dataService';
import { reloadOnceForStaleChunk, isStaleChunkError } from './utils/staleChunkReload';
import Preloader from './components/Preloader';
import { useLanguage } from './hooks/useLanguage';
import LoginPage from './pages/LoginPage';
import EmailLinkSetupPage from './pages/EmailLinkSetupPage';
import { isEmailSignInLink } from './services/firebase';
import ReviewRolesModal from './components/ReviewRolesModal';
import RouteGuard from './components/RouteGuard';
import { ViewAsProvider } from './contexts/ViewAsContext';
import ViewAsIndicator from './components/ViewAsIndicator';
import DevSnapshotButton from './components/dev/DevSnapshotButton';
import { useViewAs } from './hooks/useViewAs';
import { useIsSuperAdmin } from './hooks/useIsSuperAdmin';
import { KioskProvider } from './contexts/KioskContext';
import { QuickLogProvider } from './contexts/QuickLogContext';
import KioskPostSaveSummary from './components/kiosk/KioskPostSaveSummary';
import KioskLobbyOverlay from './components/kiosk/KioskLobbyOverlay';
import { COLORS, FONT, ELEV } from './utils/theme';
import RdIcon from './components/RdIcon';

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
const LayoutTacticsBoardPage = lazy(() => import('./pages/LayoutTacticsBoardPage'));
const TacticEditorPage = lazy(() => import('./pages/TacticEditorPage'));
const TacticalHarness = lazy(() => import('./pages/TacticalHarness'));
const TacticsCanvasPage = lazy(() => import('./pages/TacticsCanvasPage'));
const TestCaptureHarness = lazy(() => import('./pages/TestCaptureHarness'));
const BunkerEditorPage = lazy(() => import('./pages/BunkerEditorPage'));
const BallisticsPage = lazy(() => import('./pages/BallisticsPage'));
const LayoutAnalyticsPage = lazy(() => import('./pages/LayoutAnalyticsPage'));
const PlayerStatsPage = lazy(() => import('./pages/PlayerStatsPage'));
const PackingChecklistPage = lazy(() => import('./pages/PackingChecklistPage'));
const TakeABreakPage = lazy(() => import('./pages/TakeABreakPage'));
const ReadsMiniPage = lazy(() => import('./pages/ReadsMiniPage'));
const ReadsSnakePage = lazy(() => import('./pages/ReadsSnakePage'));
const ReadsInvadersPage = lazy(() => import('./pages/ReadsInvadersPage'));
const ReadsLanderPage = lazy(() => import('./pages/ReadsLanderPage'));
const ReadWarriorPage = lazy(() => import('./pages/ReadWarriorPage'));
const ReadsAsteroidsPage = lazy(() => import('./pages/ReadsAsteroidsPage'));
const ReadbertPage = lazy(() => import('./pages/ReadbertPage'));
const TrainingSetupPage = lazy(() => import('./pages/TrainingSetupPage'));
const TrainingSquadsPage = lazy(() => import('./pages/TrainingSquadsPage'));
const TrainingPage = lazy(() => import('./pages/TrainingPageRedirect'));
const TrainingResultsPage = lazy(() => import('./pages/TrainingResultsPage'));
const HitabilityPage = lazy(() => import('./pages/HitabilityPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AvatarBuilderPage = lazy(() => import('./pages/AvatarBuilderPage'));
const ScoutRankingPage = lazy(() => import('./pages/ScoutRankingPage'));
const ScoutDetailPage = lazy(() => import('./pages/ScoutDetailPage'));
const ScoutIssuesPage = lazy(() => import('./pages/ScoutIssuesPage'));
const DebugFlagsPage = lazy(() => import('./pages/DebugFlagsPage'));
const AdminLeaguesPage = lazy(() => import('./pages/admin/AdminLeaguesPage'));
const AdminPlayersPage = lazy(() => import('./pages/admin/AdminPlayersPage'));
const AdminTeamsPage = lazy(() => import('./pages/admin/AdminTeamsPage'));
const WorkspacesAdminPage = lazy(() => import('./pages/admin/WorkspacesAdminPage'));
const AdminLayoutsPage = lazy(() => import('./pages/admin/AdminLayoutsPage'));
const PbleaguesOnboardingPage = lazy(() => import('./pages/PbleaguesOnboardingPage'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));
const PlayerPerformanceTrackerPage = lazy(() => import('./pages/PlayerPerformanceTrackerPage'));

function AppRoutes() {
  const {
    workspace, loading, error, noWorkspace, permissionError,
    basePath, user, userReady, signOutUser,
    roles, isAdmin, isPendingApproval, linkedPlayer, userProfile,
  } = useWorkspace();
  const [ready, setReady] = useState(false);
  const { inviteRedeeming, inviteError } = useInviteRedemption();

  useEffect(() => {
    if (basePath) { setBasePath(basePath); setReady(true); }
    else { setReady(false); }
  }, [basePath]);

  if (loading || !userReady) return <Preloader loop />;
  // Email-link invite (durable association): the URL is a Firebase email sign-in
  // link → run the express-registration flow (complete sign-in + set password)
  // BEFORE the login gate (this flow creates the account). After it replaces the
  // URL with the app root, the email-keyed self-claim associates the workspace.
  if (isEmailSignInLink()) return <EmailLinkSetupPage />;
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
  if (inviteRedeeming) return <Preloader loop />;
  // Maks pending-gate bug — never strand a user on a silent permission-listener
  // death. When the workspace listener can't confirm state (errors past its retry
  // budget, or no snapshot within the backstop window), show an explicit recovery
  // screen with retry instead of an indefinite gate/spinner.
  if (permissionError) return <PermissionErrorScreen onSignOut={signOutUser} />;
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
    return <Preloader loop />;
  }
  if (!ready) return <Preloader loop />;

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
        <Suspense fallback={<Preloader loop />}>
          <PbleaguesOnboardingPage />
        </Suspense>
      );
    }
    if (isPendingApproval) {
      return (
        <Suspense fallback={<Preloader loop />}>
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
        <Suspense fallback={<Preloader loop />}>
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
            <Route path="/layout/:layoutId/tactics" element={<RouteGuard><LayoutTacticsBoardPage /></RouteGuard>} />
            <Route path="/layout/:layoutId/tactic-edit/:tacticId" element={<RouteGuard><TacticEditorPage /></RouteGuard>} />
            {/* STAGE 2 — Coach Tactics on the new DrawingCanvas engine (additive; legacy /tactics untouched) */}
            <Route path="/layout/:layoutId/tactics-canvas" element={<RouteGuard><TacticsCanvasPage /></RouteGuard>} />
            {/* EMULATOR-ONLY capture-engine test rig (Stage 2.0 tactic golden) — dead in prod */}
            {import.meta.env.VITE_USE_EMULATOR === 'true' && <Route path="/test/capture" element={<TestCaptureHarness />} />}
            {/* Tactical DrawingCanvas render rig (STAGE 1) — emulator + preview only, dead in prod */}
            {(import.meta.env.VITE_USE_EMULATOR === 'true' || import.meta.env.VITE_PREVIEW === '1') && <Route path="/test/tactical" element={<TacticalHarness />} />}
            <Route path="/player/:playerId/stats" element={<PlayerStatsPage />} />
            <Route path="/player/checklist" element={<PackingChecklistPage />} />
            <Route path="/break" element={<TakeABreakPage />} />
            <Route path="/break/reads" element={<ReadsMiniPage />} />
            <Route path="/break/snake" element={<ReadsSnakePage />} />
            <Route path="/break/invaders" element={<ReadsInvadersPage />} />
            <Route path="/break/lander" element={<ReadsLanderPage />} />
            <Route path="/break/warrior" element={<ReadWarriorPage />} />
            <Route path="/break/asteroids" element={<ReadsAsteroidsPage />} />
            <Route path="/break/readbert" element={<ReadbertPage />} />
            <Route path="/training/:trainingId/setup" element={<TrainingSetupPage />} />
            <Route path="/training/:trainingId/squads" element={<TrainingSquadsPage />} />
            <Route path="/training/:trainingId/results" element={<TrainingResultsPage />} />
            <Route path="/training/:trainingId/hitability" element={<RouteGuard><HitabilityPage /></RouteGuard>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/avatar" element={<AvatarBuilderPage />} />
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
            <Route path="/admin/layouts" element={<SuperAdminGuard><AdminLayoutsPage /></SuperAdminGuard>} />
            <Route path="/settings/members" element={<AdminGuard><MembersPage /></AdminGuard>} />
            <Route path="/settings/members/:uid" element={<AdminGuard><UserDetailPage /></AdminGuard>} />
            {/* PPT (DESIGN_DECISIONS § 48). Same component handles both the
                picker URL and the wizard host URL — branches on location. */}
            <Route path="/player/log" element={<PlayerPerformanceTrackerPage />} />
            <Route path="/player/log/wizard" element={<PlayerPerformanceTrackerPage />} />
          </Routes>
        </Suspense>
        <OfflineBanner />
        {/* Super-admin dev tool — global mount so it's available on EVERY screen
            (not just MainPage). Self-gates via useIsSuperAdmin; inert otherwise. */}
        <DevSnapshotButton />
        {/* Persistent, non-dismissable impersonation exit (§38.5 / CC_BRIEF_VIEWAS_REENABLE):
            top amber strip + bottom-right pill with × → exitImpersonation. Visible whenever
            an admin is impersonating — the escape hatch whose ABSENCE got view-as disabled in
            2026-04-24. Renders null when not impersonating. */}
        <ViewAsIndicator />
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

// PermissionErrorScreen — the no-eternal-loading recovery for the permission
// gate (Maks bug). Shown when the workspace listener can't confirm state (silent
// death past retries, or no snapshot in time). Retry re-attaches via a clean
// reload; sign-out is the escape. Never an indefinite "poczekaj".
function PermissionErrorScreen({ onSignOut }) {
  const { t } = useLanguage();
  return (
    <div data-testid="permission-error" style={{
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
        }}>{t('permission_check_failed_title')}</div>
        <div style={{
          fontFamily: FONT, fontSize: 13, color: COLORS.textDim, marginBottom: 20,
          lineHeight: 1.5,
        }}>{t('permission_check_failed_body')}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 700,
            padding: '12px 24px', minHeight: 48, borderRadius: 10,
            background: COLORS.accent, color: '#000', border: 'none',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent', marginBottom: 10,
          }}
        >{t('permission_check_failed_retry')}</button>
        <button
          onClick={onSignOut}
          style={{
            display: 'block', margin: '0 auto',
            fontFamily: FONT, fontSize: 14, fontWeight: 600,
            padding: '10px 20px', minHeight: 44, borderRadius: 10,
            background: 'transparent', color: COLORS.textDim, border: `1px solid ${COLORS.border}`,
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
// your workspace…" spinner. Correct terminal state under the magic-link
// invite-only access model (§94): non-invited accounts have no workspace until
// an admin invites them (#/invite/{token} via useInviteRedemption) or grants
// access. NOT a gap — the invite carrier shipped (afc37f17).
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
  const { t } = useLanguage();
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

  // Premium slim bar — RdIcon + tokenized. §27 discipline preserved: danger-red
  // while offline, success-green on reconnect; non-interactive (pointerEvents:none).
  const tone = online ? COLORS.success : COLORS.danger;
  const bar = {
    position: 'fixed', top: 0, left: 0, right: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 'calc(7px + env(safe-area-inset-top, 0px)) 16px 7px',
    fontFamily: FONT, fontSize: 12.5, fontWeight: 800, letterSpacing: '.2px',
    zIndex: 200, pointerEvents: 'none', color: COLORS.white,
    background: tone, boxShadow: ELEV.shadow1,
  };
  return (
    <div role="status" style={bar}>
      <RdIcon name={online ? 'check' : 'wifioff'} size={15} />
      <span>{online ? (t('offline_reconnected') || 'Back online — syncing changes…') : (t('offline_banner') || 'Offline — changes save on this device and sync when you reconnect')}</span>
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
  // Stale-chunk self-heal (fallback path): a dynamic-import error that
  // propagates into React render (rather than firing window `vite:preloadError`)
  // triggers a single loop-guarded reload to fetch the fresh bundle. If the
  // guard suppresses it (genuine broken deploy), SentryFallback renders normally.
  onError: (error) => { if (isStaleChunkError(error)) reloadOnceForStaleChunk(); },
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
