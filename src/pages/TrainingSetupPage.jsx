import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import AttendeesEditor from '../components/training/AttendeesEditor';
import { Btn, EmptyState, SkeletonList } from '../components/ui';
import { useTrainings, useActiveTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { useLanguage } from '../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';

/**
 * TrainingSetupPage — thin wrapper around AttendeesEditor with wizard CTA.
 *
 * Route: /training/:trainingId/setup (wizard step 1 — attendance picker).
 * The full editor logic lives in AttendeesEditor (reused in Scout tab).
 */
export default function TrainingSetupPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { trainings, loading: tLoading } = useTrainings();
  const { teams } = useActiveTeams();

  const training = trainings.find(t => t.id === trainingId);
  const team = training ? teams.find(t => t.id === training.teamId) : null;
  const attendees = training?.attendees || [];

  // §H3 no-eternal-loading — 12s ceiling on the training subscription.
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => {
    if (training) { setLoadTimedOut(false); return undefined; }
    const id = setTimeout(() => setLoadTimedOut(true), 12000);
    return () => clearTimeout(id);
  }, [training]);

  if (tLoading && !loadTimedOut) {
    return <div style={{ padding: SPACE.lg }}><SkeletonList count={4} /></div>;
  }
  if (!training) {
    return (
      <div data-testid="training-load-error">
        <EmptyState
          icon="⚠️"
          text={t('training_load_error')}
          subtitle={t('training_load_error_sub')}
        />
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Btn variant="accent" onClick={() => { setLoadTimedOut(false); navigate(0); }}>{t('match_retry')}</Btn>
        </div>
      </div>
    );
  }

  const handleContinue = async () => {
    // Auto-distribute attendees into 2 squads if not already set, then navigate to squads.
    const squads = training.squads || {};
    const hasSquads = Object.values(squads).some(arr => Array.isArray(arr) && arr.length);
    if (!hasSquads) {
      const next = { red: [], blue: [] };
      attendees.forEach((pid, i) => {
        next[i % 2 === 0 ? 'red' : 'blue'].push(pid);
      });
      await ds.updateTraining(trainingId, { squads: next });
    }
    navigate(`/training/${trainingId}/squads`);
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: '/' }}
        title={t('setup_whos_at_practice')}
        subtitle={team?.name || '—'}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, paddingBottom: 96 }}>
        <AttendeesEditor trainingId={trainingId} training={training} />
      </div>

      {/* Sticky footer CTA */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 20,
        padding: `${SPACE.md}px ${SPACE.lg}px calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
      }}>
        <Btn
          variant="accent"
          disabled={attendees.length === 0}
          onClick={handleContinue}
          style={{ width: '100%', minHeight: 52, fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700 }}
        >
          {attendees.length === 0
            ? t('no_attendees')
            : `${attendees.length} here — ${t('form_squads')}`}
        </Btn>
      </div>
    </div>
  );
}
