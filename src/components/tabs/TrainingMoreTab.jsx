import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

export default function TrainingMoreTab({
  trainingId,
  training,
  onToggleLive,
  onEndTraining,
  onDeleteTraining,
  onNewTournament,
  onLogout,
  workspaceName,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isLive = training?.status === 'live';
  const isClosed = training?.status === 'closed';
  const attendeeCount = (training?.attendees || []).length;
  const squadKeys = training?.squads ? Object.keys(training.squads).filter(k =>
    ['red', 'blue', 'green', 'yellow'].includes(k)) : [];
  const squadNames = squadKeys.map(k => ({ red: 'R1', blue: 'R2', green: 'R3', yellow: 'R4' }[k] || k));

  return (
    <div style={{ padding: SPACE.lg, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
      {/* Training management */}
      <Section title={t('training_section')}>
        <MoreItem icon="👥" label={t('attendees_title')} sub={t('attendees_sub', attendeeCount)}
          onClick={() => navigate(`/training/${trainingId}/setup`)} />
        <MoreItem icon="🔀" label={t('squads_title')} sub={squadNames.join(' · ') || 'Not set up'}
          onClick={() => navigate(`/training/${trainingId}/squads`)} />
        {training?.layoutId && (
          <MoreItem icon="🏆" label={t('tab_layouts')}
            sub={training.layoutName || t('layout_assigned')}
            onClick={() => navigate(`/layout/${training.layoutId}`)} isLast />
        )}
        {!training?.layoutId && (
          <MoreItem icon="🏆" label={t('tab_layouts')} sub={t('squads_sub_empty')} isLast />
        )}
      </Section>

      {/* Status */}
      {!isClosed && (
        <Section title={t('status_section')}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', background: COLORS.surfaceDark,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: isLive ? COLORS.success : COLORS.textMuted,
              boxShadow: isLive ? '0 0 8px #22c55e60' : 'none',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 500, color: COLORS.text }}>
                {isLive ? 'LIVE' : 'Not live'}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                {isLive ? 'Training is visible to others' : 'Tap to set live'}
              </div>
            </div>
            <div onClick={onToggleLive} style={{
              width: 44, height: 26, borderRadius: 13,
              background: isLive ? COLORS.success : COLORS.border,
              position: 'relative', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              minHeight: 26,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: 'white',
                position: 'absolute', top: 2,
                left: isLive ? 'auto' : 2, right: isLive ? 2 : 'auto',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'all 0.15s',
              }} />
            </div>
          </div>
        </Section>
      )}

      {/* Actions */}
      <Section title={t('actions_section')}>
        {!isClosed && (
          <MoreItem icon="✅" label={t('end_training')} onClick={onEndTraining} />
        )}
        <MoreItem icon="🗑" label={t('delete_training')} danger onClick={onDeleteTraining} isLast={!isClosed} />
        {isClosed && (
          <MoreItem icon="🔓" label={t('reopen_training')} onClick={onToggleLive} isLast />
        )}
      </Section>

      {/* Create */}
      <Section title={t('create_section')}>
        <MoreItem icon="🏆" label={t('new_tournament')} onClick={() => onNewTournament?.('tournament')} />
        <MoreItem icon="🏋️" label={t('new_training')} onClick={() => onNewTournament?.('training')} isLast />
      </Section>

      {/* Navigation */}
      <Section title={t('navigate_section')}>
        <MoreItem icon="🗺" label={t('layouts_label')} onClick={() => navigate('/layouts')} />
        <MoreItem icon="🏢" label={t('teams_label')} onClick={() => navigate('/teams')} />
        <MoreItem icon="🎽" label={t('players_label')} onClick={() => navigate('/players')} />
        <MoreItem icon="🏅" label={t('scout_ranking')} onClick={() => navigate('/scouts')} isLast />
      </Section>

      {/* Workspace */}
      <Section title={t('workspace_section')}>
        {workspaceName && (
          <div style={{
            padding: '10px 14px', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
          }}>
            Signed in as <span style={{ color: COLORS.text, fontWeight: 600 }}>{workspaceName}</span>
          </div>
        )}
        {onLogout && (
          <MoreItem icon="🚪" label={t('leave_workspace')} danger onClick={onLogout} isLast />
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 600,
        color: COLORS.textMuted, textTransform: 'uppercase',
        letterSpacing: '.5px', padding: '0 4px 8px',
      }}>{title}</div>
      <div style={{
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg, overflow: 'hidden',
      }}>{children}</div>
    </div>
  );
}

function MoreItem({ icon, label, sub, onClick, danger, isLast }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', cursor: 'pointer', minHeight: 52,
      borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
      WebkitTapHighlightColor: 'transparent',
    }}>
      <span style={{ fontSize: 18, width: 22, textAlign: 'center', opacity: 0.8 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 500,
          color: danger ? COLORS.danger : COLORS.text,
        }}>{label}</span>
        {sub && (
          <div style={{
            fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{sub}</div>
        )}
      </div>
      <span style={{ fontFamily: FONT, fontSize: 14, color: COLORS.borderLight }}>›</span>
    </div>
  );
}
