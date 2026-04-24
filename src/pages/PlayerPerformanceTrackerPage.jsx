import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TrainingPickerView from '../components/ppt/TrainingPickerView';
import WizardShell from '../components/ppt/WizardShell';
import TodaysLogsList from '../components/ppt/TodaysLogsList';
import { usePPTIdentity } from '../hooks/usePPTIdentity';
import { useLayouts, useTeams } from '../hooks/useFirestore';
import { useLanguage } from '../hooks/useLanguage';
import { getTodaysSelfReports } from '../services/playerPerformanceTrackerService';
import { getPending } from '../services/pptPendingQueue';
import { getActiveTraining, setActiveTraining, clearActiveTraining } from '../utils/pptActiveTraining';
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

export default function PlayerPerformanceTrackerPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { layouts } = useLayouts();
  const { teams } = useTeams();
  const {
    playerId, player, teamTrainings, liveTrainings,
    needsPicker, loading,
  } = usePPTIdentity();

  const isWizardRoute = location.pathname.endsWith('/wizard');
  const trainingIdParam = searchParams.get('trainingId');
  const forcePicker = searchParams.get('pick') === '1';
  // ?leave=1 — set by the wizard's Step 1 back arrow so the user can exit
  // the wizard without immediately bouncing back via the sticky-training
  // auto-redirect. Sticky selection itself is preserved (the next "+ Nowy
  // punkt" tap still skips the picker).
  const leaveOnce = searchParams.get('leave') === '1';

  // Today's self-report count — decides whether to show list vs picker/
  // wizard on /player/log. Re-fetched on each mount + whenever playerId
  // changes so navigating back from a successful save shows the new N.
  const [todaysCount, setTodaysCount] = useState(null);
  useEffect(() => {
    if (isWizardRoute) return; // list not needed inside wizard route
    if (!playerId) { setTodaysCount(0); return; }
    let cancelled = false;
    getTodaysSelfReports(playerId)
      .then(r => { if (!cancelled) setTodaysCount(r.length); })
      .catch(() => { if (!cancelled) setTodaysCount(0); });
    return () => { cancelled = true; };
  }, [playerId, isWizardRoute, location.pathname]);

  const pendingCount = useMemo(
    () => getPending(playerId).length,
    [playerId, location.pathname],
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

  // Guard — player not linked to a workspace player doc. Surface a
  // prominent CTA to the self-claim flow so users blocked here (real P0
  // during NXL Czechy onboarding) have a one-tap path forward. See the
  // 2026-04-24 relax-player-linking hotfix for the cascade matcher that
  // makes the link step itself work reliably.
  if (!loading && !playerId) {
    return (
      <div style={{ minHeight: '100dvh', background: COLORS.bg }}>
        <PageHeader back={{ to: '/' }} title={t('ppt_picker_title')} />
        <div style={{
          padding: `${SPACE.xl}px ${SPACE.lg}px`,
          display: 'flex', flexDirection: 'column', gap: SPACE.lg,
          alignItems: 'stretch', maxWidth: 440, margin: '0 auto',
        }}>
          <div style={{
            padding: SPACE.lg,
            background: COLORS.surfaceDark,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADIUS.lg,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: SPACE.sm }}>🧩</div>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
              color: COLORS.text, marginBottom: SPACE.sm,
            }}>
              {t('ppt_no_player_linked_title') || 'Połącz z profilem gracza'}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
              color: COLORS.textMuted, lineHeight: 1.5,
            }}>
              {t('ppt_no_player_linked')}
            </div>
          </div>
          <Btn
            variant="accent"
            onClick={() => navigate('/profile')}
            style={{ width: '100%', minHeight: 52, fontWeight: 800 }}
          >
            {t('ppt_no_player_linked_cta') || 'Połącz z profilem gracza'}
          </Btn>
        </div>
      </div>
    );
  }

  // Wizard route — resolves training + layout and runs WizardShell.
  if (isWizardRoute) {
    return (
      <WizardHost
        playerId={playerId}
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
    return <TodaysLogsList playerId={playerId} onNewPoint={handleNewPoint} />;
  }

  return (
    <TrainingPickerView
      playerName={player?.nickname || player?.name || ''}
      teamName={teamName}
      liveTrainings={liveTrainings}
      upcomingTrainings={upcomingTrainings}
      endedTrainings={endedTrainings}
      layouts={layouts}
      loading={loading}
      onPickTraining={handlePickTraining}
    />
  );
}

/**
 * WizardHost resolves the training + layout referenced by ?trainingId=X
 * against the page's already-subscribed lists and hands a clean context
 * object to WizardShell. Also fetches today's selfReport count to seed
 * the training-pill counter (§ 48.3). Own component so the hooks stay
 * scoped to the wizard branch and don't run on the list/picker route.
 */
function WizardHost({ playerId, trainingId, teamTrainings, layouts }) {
  const training = useMemo(
    () => teamTrainings.find(tr => tr.id === trainingId) || null,
    [teamTrainings, trainingId],
  );
  const layout = useMemo(
    () => (training?.layoutId ? layouts.find(l => l.id === training.layoutId) : null) || null,
    [training, layouts],
  );
  const [todaysCount, setTodaysCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!playerId) return;
    getTodaysSelfReports(playerId)
      .then(rows => { if (!cancelled) setTodaysCount(rows.length); })
      .catch(() => { /* bootstrap as 0 */ });
    return () => { cancelled = true; };
  }, [playerId]);

  return (
    <WizardShell
      training={training}
      layout={layout}
      playerId={playerId}
      todaysPointsCount={todaysCount}
      backTo="/player/log"
    />
  );
}
