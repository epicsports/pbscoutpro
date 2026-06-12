import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TabBar, { useTabBarVisible } from '../components/TabBar';
import NavDrawer, { ReadsBallButton } from '../components/NavDrawer';
import MoreTabContent from '../components/tabs/MoreTabContent';
import { useWorkspace } from '../hooks/useWorkspace';
import TrainingPickerView from '../components/ppt/TrainingPickerView';
import WizardShell from '../components/ppt/WizardShell';
import TodaysLogsList from '../components/ppt/TodaysLogsList';
import ColdReviewFlow from '../components/selflog/ColdReviewFlow';
import { PlayerClaimCard } from '../components/home/FreshWorkspaceChecklist';
import { usePPTIdentity } from '../hooks/usePPTIdentity';
import { useLayouts, useActiveTeams } from '../hooks/useFirestore';
import { useLanguage } from '../hooks/useLanguage';
import {
  getTodaysSelfReports,
  getTodaysPendingSelfReports,
} from '../services/playerPerformanceTrackerService';
import { getPending } from '../services/pptPendingQueue';
import { getActiveTraining, setActiveTraining, clearActiveTraining } from '../utils/pptActiveTraining';
import { fetchAssignedPointsForPlayer } from '../services/dataService';
import { Btn } from '../components/ui';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';

/**
 * PlayerPerformanceTrackerPage — single entry for the PPT product
 * (DESIGN_DECISIONS § 48). Implements the picker | wizard | list state
 * machine per Checkpoint 5:
 *
 *   /player/log
 *     - today's list if todaysCount > 0 OR pending queue > 0 AND
 *       user hasn't explicitly requested the picker via `?pick=1`
 *     - else picker (multiple LIVE or zero LIVE)
 *     - else auto-redirect to wizard (exactly 1 LIVE) with replace:true
 *       so back-nav goes to Home, not a redirect-loop URL
 *
 *   /player/log/wizard?trainingId=X
 *     - WizardHost resolves training + layout from already-subscribed
 *       lists, WizardShell runs the 5-step flow.
 *
 * The `?pick=1` escape hatch is set by the list's "+ Nowy punkt" CTA
 * when there's no single LIVE training to auto-route to — sends the
 * user through the picker for this one visit, then the param drops
 * on the next navigation.
 */
const ENDED_LIMIT = 10;

// PPT lives OUTSIDE AppShell (own chrome), so the Gracz tab loses the global
// bottom menu. Wrap the page with the shared TabBar (fixed bottom) so the menu
// is always visible for MULTI-role users (§C3: the bar renders only at ≥2
// content tabs — pure players get full-bleed content). Hidden in the focused
// wizard flow. Tapping another tab persists it (MainPage's TAB_KEY) + returns
// to MainPage.
//
// §C1/§C2 on the player surface (mockup-7 frame 3): PPT gets its own slim top
// bar with the reads ball — for a pure player this page IS the app, and after
// the 'more' tab removal the drawer is their only path to settings/sign-out.
// Settings content = MoreTabContent BY REFERENCE with no tournament context
// (the session section self-hides).
export default function PlayerPerformanceTrackerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspace, signOutUser } = useWorkspace();
  const tabBarVisible = useTabBarVisible();
  // §C2 — transient drawer; NEVER auto-opens (false on every mount).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isWizard = location.pathname.endsWith('/wizard');
  const onTab = (tab) => {
    if (tab === 'ppt') { navigate('/player/log'); return; }
    try { localStorage.setItem('pbscoutpro_activeTab', tab); } catch {}
    navigate('/');
  };
  return (
    <>
      {!isWizard && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          minHeight: 48, padding: '2px 16px 2px 6px',
          background: COLORS.surfaceBar,
          borderBottom: `1px solid ${COLORS.surfaceLight}`,
        }}>
          <ReadsBallButton onClick={() => setDrawerOpen(true)} />
          <div style={{
            fontFamily: FONT, fontSize: 13, fontWeight: 600,
            color: COLORS.textMuted, flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{workspace?.name || ''}</div>
        </div>
      )}
      <PPTInner />
      {!isWizard && tabBarVisible && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40 }}>
          <TabBar activeTab="ppt" onTabChange={onTab} />
        </div>
      )}
      {!isWizard && (
        <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <MoreTabContent
            tournamentId={null}
            tournament={null}
            workspaceName={workspace?.name}
            onSignOut={signOutUser}
          />
        </NavDrawer>
      )}
    </>
  );
}

function PPTInner() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { layouts } = useLayouts();
  const { teams } = useActiveTeams();
  const {
    playerId, uid, player, teamTrainings, liveTrainings,
    needsPicker, loading,
  } = usePPTIdentity();
  // Unlinked-mode (2026-04-24): when no playerId, fall back to the uid
  // path. PPT writes to /workspaces/{slug}/pendingSelfReports keyed by
  // uid until the user links a player, at which point onPlayerLinked()
  // migrates the batch to the canonical /players/{pid}/selfReports/.
  const scopeId = playerId || uid;
  const isLinked = !!playerId;

  const isWizardRoute = location.pathname.endsWith('/wizard');
  const trainingIdParam = searchParams.get('trainingId');
  const forcePicker = searchParams.get('pick') === '1';
  // ?leave=1 — set by the wizard's Step 1 back arrow so the user can exit
  // the wizard without immediately bouncing back via the sticky-training
  // auto-redirect. Sticky selection itself is preserved (the next "+ Nowy
  // punkt" tap still skips the picker).
  const leaveOnce = searchParams.get('leave') === '1';

  // Today's self-report count — decides whether to show list vs picker/
  // wizard on /player/log. Re-fetched on each mount + whenever scopeId
  // changes so navigating back from a successful save shows the new N.
  // Unlinked users count from pendingSelfReports instead.
  const [todaysCount, setTodaysCount] = useState(null);
  useEffect(() => {
    if (isWizardRoute) return; // list not needed inside wizard route
    if (!scopeId) { setTodaysCount(0); return; }
    let cancelled = false;
    const fetcher = isLinked
      ? getTodaysSelfReports(scopeId)
      : getTodaysPendingSelfReports(scopeId);
    fetcher
      .then(r => { if (!cancelled) setTodaysCount(r.length); })
      .catch(() => { if (!cancelled) setTodaysCount(0); });
    return () => { cancelled = true; };
  }, [scopeId, isLinked, isWizardRoute, location.pathname]);

  // § 63 — cross-type assigned points (training + sparing + tournament where a
  // coach assigned this player) for the picker's "to complete" section. Linked
  // players only (assignments key = playerId); not on the wizard route.
  const [assignedPoints, setAssignedPoints] = useState(null);
  const [coldEvent, setColdEvent] = useState(null); // event tapped → ColdReviewFlow
  useEffect(() => {
    if (isWizardRoute || !isLinked || !playerId) { setAssignedPoints([]); return undefined; }
    let cancelled = false;
    fetchAssignedPointsForPlayer(playerId, { includeLogged: false })
      .then(rows => { if (!cancelled) setAssignedPoints(rows); })
      .catch(() => { if (!cancelled) setAssignedPoints([]); });
    return () => { cancelled = true; };
  }, [playerId, isLinked, isWizardRoute, location.pathname]);

  const pendingCount = useMemo(
    () => getPending(scopeId, isLinked ? 'player' : 'uid').length,
    [scopeId, isLinked, location.pathname],
  );

  const hasAnyLogs = (todaysCount || 0) > 0 || pendingCount > 0;
  const showList = !forcePicker && hasAnyLogs;

  // Sticky training selection — once the player picks a training, it persists
  // for the rest of the day so subsequent point logs land directly in the
  // wizard without the picker round-trip (15s game-time budget per § 48).
  // Resolves the saved trainingId against the current teamTrainings list and
  // drops it if the training has since closed or been deleted.
  const stickyTraining = useMemo(() => {
    const sticky = getActiveTraining();
    if (!sticky) return null;
    const match = teamTrainings.find(tr => tr.id === sticky.trainingId);
    if (!match) {
      clearActiveTraining();
      return null;
    }
    if (match.status === 'closed') {
      clearActiveTraining();
      return null;
    }
    return match;
  }, [teamTrainings]);

  // Auto-enter wizard. Priority order:
  //   1. Sticky training (today's prior pick still valid) — beats every
  //      other case so post-save returns straight to Step 1.
  //   2. Today's logs list (when there's saved or pending data and the
  //      user hasn't explicitly forced the picker via ?pick=1).
  //   3. Exactly one LIVE training auto-pick (legacy convenience path).
  // `replace: true` so back-nav from wizard returns to Home rather than
  // looping through the redirect URL.
  useEffect(() => {
    if (loading || todaysCount === null) return;
    if (isWizardRoute) return;
    if (forcePicker) return;
    if (leaveOnce) return;
    if (stickyTraining) {
      navigate(`/player/log/wizard?trainingId=${stickyTraining.id}`, { replace: true });
      return;
    }
    if (showList) return;
    if (needsPicker) return;
    if (!liveTrainings[0]) return;
    navigate(`/player/log/wizard?trainingId=${liveTrainings[0].id}`, { replace: true });
  }, [loading, todaysCount, isWizardRoute, showList, forcePicker, leaveOnce, needsPicker, liveTrainings, stickyTraining, navigate]);

  const { upcomingTrainings, endedTrainings } = useMemo(() => {
    const upcoming = teamTrainings.filter(tr =>
      tr.status !== 'live' && tr.status !== 'closed'
    );
    const ended = teamTrainings
      .filter(tr => tr.status === 'closed')
      .slice(0, ENDED_LIMIT);
    return { upcomingTrainings: upcoming, endedTrainings: ended };
  }, [teamTrainings]);

  // Group assigned points → events; de-dupe against tappable training rows
  // (live/upcoming already have the wizard path, so don't also list them here).
  const assignedEvents = useMemo(() => {
    const byEvent = new Map();
    for (const c of assignedPoints || []) {
      if (!byEvent.has(c.eventId)) {
        byEvent.set(c.eventId, {
          eventId: c.eventId, eventName: c.eventName, eventDate: c.eventDate,
          eventType: c.eventType, count: 0,
        });
      }
      byEvent.get(c.eventId).count += 1;
    }
    const wizardIds = new Set([...liveTrainings, ...upcomingTrainings].map(tr => tr.id));
    return [...byEvent.values()].filter(ev => !wizardIds.has(ev.eventId));
  }, [assignedPoints, liveTrainings, upcomingTrainings]);

  const teamName = useMemo(() => {
    if (!player?.teamId || !Array.isArray(teams)) return '';
    const team = teams.find(t => t.id === player.teamId);
    return team?.name || '';
  }, [player, teams]);

  // "+ Nowy punkt" CTA from the list. Sticky training takes priority — if
  // the player already picked one today, jump straight to the wizard.
  // Otherwise fall back to single-LIVE auto-pick or the picker.
  const handleNewPoint = useCallback(() => {
    if (stickyTraining) {
      navigate(`/player/log/wizard?trainingId=${stickyTraining.id}`);
      return;
    }
    if (liveTrainings.length === 1) {
      navigate(`/player/log/wizard?trainingId=${liveTrainings[0].id}`);
      return;
    }
    navigate('/player/log?pick=1');
  }, [stickyTraining, liveTrainings, navigate]);

  // Tapping a training in the picker persists it as today's sticky pick so
  // the wizard becomes the default landing surface for the rest of the day.
  const handlePickTraining = useCallback((tr) => {
    if (tr?.id) setActiveTraining(tr.id);
    navigate(`/player/log/wizard?trainingId=${tr.id}`);
  }, [navigate]);

  // Guard — neither linked player nor uid (auth missing). PPT supports
  // unlinked logging via uid scope (2026-04-24); this guard only fires
  // when the user is somehow not authenticated, which AuthGate should
  // already have caught upstream.
  if (!loading && !scopeId) {
    return (
      <div style={{ minHeight: '100dvh', background: COLORS.bg }}>
        <PageHeader back={{ to: '/' }} title={t('ppt_picker_title')} />
        <div style={{
          padding: SPACE.xl, textAlign: 'center',
          fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
        }}>
          {t('ppt_no_player_linked')}
        </div>
      </div>
    );
  }

  // Wizard route — resolves training + layout and runs WizardShell.
  if (isWizardRoute) {
    return (
      <WizardHost
        playerId={playerId}
        uid={uid}
        trainingId={trainingIdParam}
        teamTrainings={teamTrainings}
        layouts={layouts}
      />
    );
  }

  // Waiting for todaysCount before we can decide list vs picker.
  if (todaysCount === null) {
    return (
      <div style={{ minHeight: '100dvh', background: COLORS.bg }}>
        <PageHeader back={{ to: '/' }} title={t('ppt_picker_title')} />
        <div style={{
          padding: SPACE.xl, textAlign: 'center',
          fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
        }}>
          {t('loading')}
        </div>
      </div>
    );
  }

  if (showList) {
    return <TodaysLogsList playerId={playerId} uid={uid} onNewPoint={handleNewPoint} />;
  }

  return (
    <>
      {/* B4 — unclaimed account: claim card ABOVE the picker (deep-links to the
          existing /profile LinkProfileModal flow). The picker stays usable so
          the §110.1 unlinked pendingSelfReports path is not regressed. */}
      {!loading && !isLinked && <PlayerClaimCard />}
      <TrainingPickerView
        playerName={player?.nickname || player?.name || ''}
        teamName={teamName}
        liveTrainings={liveTrainings}
        upcomingTrainings={upcomingTrainings}
        endedTrainings={endedTrainings}
        assignedEvents={assignedEvents}
        layouts={layouts}
        loading={loading}
        onPickTraining={handlePickTraining}
        onPickAssignedEvent={setColdEvent}
      />
      {coldEvent && (
        <ColdReviewFlow
          playerId={playerId}
          uid={uid}
          teamId={player?.teamId || null}
          layouts={layouts}
          controlledEventId={coldEvent.eventId}
          onControlledClose={() => setColdEvent(null)}
        />
      )}
    </>
  );
}

/**
 * WizardHost resolves the training + layout referenced by ?trainingId=X
 * against the page's already-subscribed lists and hands a clean context
 * object to WizardShell. Also fetches today's selfReport count to seed
 * the training-pill counter (§ 48.3). Own component so the hooks stay
 * scoped to the wizard branch and don't run on the list/picker route.
 */
function WizardHost({ playerId, uid, trainingId, teamTrainings, layouts }) {
  const training = useMemo(
    () => teamTrainings.find(tr => tr.id === trainingId) || null,
    [teamTrainings, trainingId],
  );
  const layout = useMemo(
    () => (training?.layoutId ? layouts.find(l => l.id === training.layoutId) : null) || null,
    [training, layouts],
  );

  // § "Nowy punkt" parity — persist the active training as sticky on wizard
  // ENTRY (not only on explicit picker-pick via handlePickTraining). Without
  // this, a player who auto-landed in the wizard (single-live :177, or any
  // direct ?trainingId= entry) had no sticky, so handleNewPoint (:216-226) fell
  // through to the picker (pick=1) when >1 live training. Setting it here keeps
  // "Nowy punkt" in THIS training (mirrors tournament's URL-persisted event);
  // the "Zmień trening" pill (clearActiveTraining → pick=1) stays the SOLE
  // picker path. Guarded on a resolved training so a stale/invalid trainingId
  // never writes a bad sticky.
  useEffect(() => {
    if (training?.id) setActiveTraining(training.id);
  }, [training?.id]);

  const [todaysCount, setTodaysCount] = useState(0);

  // Seed the pill counter from whichever path holds today's logs —
  // canonical for linked players, pendingSelfReports for unlinked.
  useEffect(() => {
    let cancelled = false;
    const fetcher = playerId
      ? getTodaysSelfReports(playerId)
      : (uid ? getTodaysPendingSelfReports(uid) : Promise.resolve([]));
    fetcher
      .then(rows => { if (!cancelled) setTodaysCount(rows.length); })
      .catch(() => { /* bootstrap as 0 */ });
    return () => { cancelled = true; };
  }, [playerId, uid]);

  return (
    <WizardShell
      training={training}
      layout={layout}
      playerId={playerId}
      uid={uid}
      todaysPointsCount={todaysCount}
      backTo="/player/log"
    />
  );
}
