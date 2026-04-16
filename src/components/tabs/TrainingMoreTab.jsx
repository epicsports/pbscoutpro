import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useLayouts } from '../../hooks/useFirestore';
import { Modal, Btn, EmptyState } from '../ui';
import * as ds from '../../services/dataService';

export default function TrainingMoreTab({
  trainingId,
  training,
  onToggleLive,
  onEndTraining,
  onDeleteTraining,
  onNewTournament,
  onLogout,
  onSignOut,
  workspaceName,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { layouts } = useLayouts();
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const isLive = training?.status === 'live';
  const isClosed = training?.status === 'closed';
  const attendeeCount = (training?.attendees || []).length;
  const squadKeys = training?.squads ? Object.keys(training.squads).filter(k =>
    ['red', 'blue', 'green', 'yellow'].includes(k)) : [];
  const squadNames = squadKeys.map(k => ({ red: 'R1', blue: 'R2', green: 'R3', yellow: 'R4' }[k] || k));

  const assignedLayout = training?.layoutId ? layouts.find(l => l.id === training.layoutId) : null;
  const assignedLayoutLabel = assignedLayout
    ? `${assignedLayout.name}${assignedLayout.league ? ` · ${assignedLayout.league}` : ''}${assignedLayout.year ? ` ${assignedLayout.year}` : ''}`
    : null;

  const handlePickLayout = async (layoutId) => {
    await ds.updateTraining(trainingId, { layoutId: layoutId || null });
    setLayoutPickerOpen(false);
  };

  return (
    <div style={{ padding: SPACE.lg, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
      {/* Training management */}
      <Section title={t('training_section')}>
        <MoreItem icon="👥" label={t('attendees_title')} sub={t('attendees_sub', attendeeCount)}
          onClick={() => navigate(`/training/${trainingId}/setup`)} />
        <MoreItem icon="🔀" label={t('squads_title')} sub={squadNames.join(' · ') || 'Not set up'}
          onClick={() => navigate(`/training/${trainingId}/squads`)} />
        <MoreItem icon="🎯" label={t('training_layout') || 'Training layout'}
          sub={assignedLayoutLabel || (t('no_layout_assigned') || 'Tap to assign a layout')}
          onClick={() => setLayoutPickerOpen(true)} isLast />
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

      {/* Account */}
      <Section title={t('account_section') || 'Konto'}>
        <MoreItem icon="👤" label={t('my_profile') || 'Mój profil'}
          onClick={() => navigate('/profile')} />
        {onSignOut && (
          <MoreItem icon="🚪" label={t('sign_out') || 'Wyloguj się'} danger onClick={onSignOut} isLast />
        )}
      </Section>

      {/* Workspace */}
      <Section title={t('workspace_section')}>
        {workspaceName && (
          <div style={{
            padding: '10px 14px', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
          }}>
            {t('signed_in_as')} <span style={{ color: COLORS.text, fontWeight: 600 }}>{workspaceName}</span>
          </div>
        )}
        {onLogout && (
          <MoreItem icon="↩" label={t('leave_workspace')} onClick={onLogout} isLast />
        )}
      </Section>

      {/* Layout picker modal */}
      <Modal open={layoutPickerOpen} onClose={() => setLayoutPickerOpen(false)}
        title={t('training_layout') || 'Training layout'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
          {layouts.length === 0 ? (
            <EmptyState icon="🗺" text={t('no_layouts') || 'No layouts yet'}
              action={<Btn variant="accent" onClick={() => { setLayoutPickerOpen(false); navigate('/layouts'); }}>
                {t('go_to_layouts') || 'Go to Layouts'}
              </Btn>} />
          ) : (
            <>
              {/* "None" option — clear assignment */}
              <LayoutOption
                label={t('no_layout_option') || '— No layout —'}
                sub={null}
                selected={!training?.layoutId}
                onClick={() => handlePickLayout(null)}
              />
              {layouts.map(l => (
                <LayoutOption
                  key={l.id}
                  label={l.name || 'Untitled'}
                  sub={[l.league, l.year].filter(Boolean).join(' · ') || null}
                  selected={training?.layoutId === l.id}
                  onClick={() => handlePickLayout(l.id)}
                />
              ))}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

function LayoutOption({ label, sub, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', cursor: 'pointer', minHeight: 52,
      borderRadius: RADIUS.md,
      background: selected ? `${COLORS.accent}12` : COLORS.surfaceDark,
      border: `1px solid ${selected ? `${COLORS.accent}55` : COLORS.border}`,
      WebkitTapHighlightColor: 'transparent',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: selected ? 700 : 500,
          color: selected ? COLORS.accent : COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</div>
        {sub && (
          <div style={{
            fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2,
          }}>{sub}</div>
        )}
      </div>
      {selected && (
        <span style={{ fontFamily: FONT, fontSize: 16, color: COLORS.accent }}>✓</span>
      )}
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
