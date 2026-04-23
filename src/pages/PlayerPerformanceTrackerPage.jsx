import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TrainingPickerView from '../components/ppt/TrainingPickerView';
import WizardShell from '../components/ppt/WizardShell';
import { usePPTIdentity } from '../hooks/usePPTIdentity';
import { useLayouts, useTeams } from '../hooks/useFirestore';
import { useLanguage } from '../hooks/useLanguage';
import { getTodaysSelfReports } from '../services/playerPerformanceTrackerService';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';

/**
 * PlayerPerformanceTrackerPage — the single entry for PPT (DESIGN_DECISIONS
 * § 48). Handles both the picker and the wizard host route:
 *
 *   /player/log                       → picker (or auto-redirect to wizard
 *                                        if exactly one LIVE training)
 *   /player/log/wizard?trainingId=X   → wizard host (Checkpoint 2 stub;
 *                                        WizardShell + Steps land in
 *                                        Checkpoint 3+)
 *
 * Single-component routing simplifies state sharing and avoids a second
 * React-Router `<Route>` entry for what is logically one surface.
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

  // Auto-enter wizard when exactly one LIVE training exists and the user
  // landed on /player/log (picker URL). Uses `replace: true` so the back
  // button from the wizard returns to `/` (Home) rather than bouncing
  // through the picker URL that would immediately redirect again.
  useEffect(() => {
    if (loading) return;
    if (isWizardRoute) return;
    if (needsPicker) return;
    if (!liveTrainings[0]) return;
    navigate(`/player/log/wizard?trainingId=${liveTrainings[0].id}`, { replace: true });
  }, [loading, isWizardRoute, needsPicker, liveTrainings, navigate]);

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

  // Guard — player not linked to a workspace player doc. The wizard can't
  // write to /players/{playerId}/selfReports without a playerId, so we bail
  // with a friendly message and no wizard affordance.
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

  // Wizard route — Checkpoint 3: WizardShell + Step 1 + Step 2 real,
  // Steps 3/4/4b/5 stubs.
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
 * scoped to the wizard branch and don't run on the picker URL.
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
