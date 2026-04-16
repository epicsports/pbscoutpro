import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import AttendeesEditor from '../components/training/AttendeesEditor';
import { Btn, EmptyState, SkeletonList } from '../components/ui';
import { useTrainings, useTeams } from '../hooks/useFirestore';
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
  const { teams } = useTeams();

  const training = trainings.find(t => t.id === trainingId);
  const team = training ? teams.find(t => t.id === training.teamId) : null;
  const attendees = training?.attendees || [];

  if (tLoading) {
    return <div style={{ padding: SPACE.lg }}><SkeletonList count={4} /></div>;
  }
  if (!training) return <EmptyState icon="⏳" text="Training not found" />;

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
        title="Who's at practice?"
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
            ? (t('no_attendees') || 'Select players to continue')
            : `${attendees.length} here — ${t('form_squads') || 'Form squads'}`}
        </Btn>
      </div>
    </div>
  );
}
