import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SquadEditor from '../components/training/SquadEditor';
import { Btn, EmptyState, SkeletonList } from '../components/ui';
import { useTrainings } from '../hooks/useFirestore';
import { useLanguage } from '../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';

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

  const training = trainings.find(t => t.id === trainingId);
  const attendeesCount = training?.attendees?.length || 0;

  if (tLoading) {
    return <div style={{ padding: SPACE.lg }}><SkeletonList count={4} /></div>;
  }
  if (!training) return <EmptyState icon="⏳" text="Training not found" />;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: `/training/${trainingId}/setup` }}
        title={t('squads_title') || 'Squads'}
        subtitle={`${attendeesCount} players`}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, paddingBottom: 96 }}>
        <SquadEditor trainingId={trainingId} training={training} />
      </div>

      {/* Sticky footer CTA */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 20,
        padding: `${SPACE.md}px ${SPACE.lg}px calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
      }}>
        <Btn
          variant="accent"
          onClick={() => navigate(`/`)}
          style={{ width: '100%', minHeight: 52, fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700 }}
        >
          {t('start_training') || 'Start training'}
        </Btn>
      </div>
    </div>
  );
}
