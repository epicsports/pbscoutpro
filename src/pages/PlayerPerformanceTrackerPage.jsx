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
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';

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

  // Auto-enter wizard: only on the picker URL, only when user hasn't yet
  // landed in the list path for today, only when exactly one LIVE training
  // exists. `replace: true` so back-nav from wizard returns to Home, not
  // the redirect-loop URL.
  useEffect(() => {
    if (loading || todaysCount === null) return;
    if (isWizardRoute) return;
    if (showList) return;
    if (forcePicker) return;
    if (needsPicker) return;
    if (!liveTrainings[0]) return;
    navigate(`/player/log/wizard?trainingId=${liveTrainings[0].id}`, { replace: true });
  }, [loading, todaysCount, isWizardRoute, showList, forcePicker, needsPicker, liveTrainings, navigate]);

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

  // "+ Nowy punkt" CTA from the list. If there's a single LIVE training we
  // skip the picker; otherwise the escape-hatch `?pick=1` forces the
  // picker on the next render even though logs exist.
  const handleNewPoint = useCallback(() => {
    if (liveTrainings.length === 1) {
      navigate(`/player/log/wizard?trainingId=${liveTrainings[0].id}`);
      return;
    }
    navigate('/player/log?pick=1');
  }, [liveTrainings, navigate]);

  // Guard — player not linked to a workspace player doc.
  if (!loading && !playerId) {
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
      onPickTraining={(tr) => navigate(`/player/log/wizard?trainingId=${tr.id}`)}
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
