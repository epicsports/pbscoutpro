import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SquadEditor from '../components/training/SquadEditor';
import { Btn, EmptyState, SkeletonList } from '../components/ui';
import { useTrainings } from '../hooks/useFirestore';
import { useLanguage } from '../hooks/useLanguage';
import { useDevice } from '../hooks/useDevice';
import { COLORS, FONT, FONT_SIZE, SPACE, ELEV } from '../utils/theme';

/**
 * TrainingSquadsPage — thin wrapper around SquadEditor with wizard CTA.
 *
 * Route: /training/:trainingId/squads (wizard step 2 — squad builder).
 * Full drag & drop logic lives in SquadEditor (reused in Scout tab).
 */
export default function TrainingSquadsPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { trainings, loading: tLoading } = useTrainings();
  const device = useDevice();
  const wide = device.width >= 720;

  const training = trainings.find(t => t.id === trainingId);
  const attendeesCount = training?.attendees?.length || 0;

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

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: `/training/${trainingId}/setup` }}
        title={t('squads_title')}
        subtitle={t('squads_players_subtitle', attendeesCount)}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, paddingBottom: 96 }}>
        <div style={{ width: '100%', maxWidth: wide ? 1040 : 640, margin: '0 auto' }}>
          <SquadEditor trainingId={trainingId} training={training} />
        </div>
      </div>

      {/* Sticky footer CTA */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 20,
        padding: `${SPACE.md}px ${SPACE.lg}px calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
        background: ELEV.surface, borderTop: `1px solid ${ELEV.hairline}`,
      }}>
        <div style={{ width: '100%', maxWidth: wide ? 1040 : 640, margin: '0 auto' }}>
          <Btn
            variant="accent"
            onClick={() => navigate(`/`)}
            style={{ width: '100%', minHeight: 52, fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700 }}
          >
            {t('start_training')}
          </Btn>
        </div>
      </div>
    </div>
  );
}
