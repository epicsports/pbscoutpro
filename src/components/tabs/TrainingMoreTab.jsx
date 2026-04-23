import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useLayouts, useTeams } from '../../hooks/useFirestore';
import { Modal, Btn, Input, Select, EmptyState } from '../ui';
import * as ds from '../../services/dataService';
import { MoreShell, MoreSection, MoreItem, ScoutingSection, LanguageSection } from './MoreShell';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useViewAs } from '../../hooks/useViewAs';
import { hasAnyRole } from '../../utils/roleUtils';

/**
 * Training More tab — Apple HIG–inspired hierarchy.
 *
 *  1. Session  — edit details + assigned layout
 *  2. Browse   — workspace data
 *  3. Actions  — end training (live) / delete training (ended)
 *  4. Account  — profile, workspace, sign out
 */
export default function TrainingMoreTab({
  trainingId,
  training,
  onEndTraining,
  onDeleteTraining,
  onLogout,
  onSignOut,
  workspaceName,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { workspace: ws } = useWorkspace();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  // Canonical admin check via useViewAs so impersonation collapses it
  // (matches MoreTabContent and AppShell). The legacy `ws?.isAdmin`
  // path is kept via effectiveIsAdmin — useViewAs derives it.
  const isAdmin = effectiveIsAdmin;
  // Limited-access predicate (§ 49 unified auth): hide scout/coach-level
  // sections for users without write-worthy roles (player, retired-viewer,
  // empty bootstrap). Coach or scout unlocks the full section set.
  const isPurePlayer = !effectiveIsAdmin
    && !hasAnyRole(effectiveRoles, 'coach', 'scout');
  const { layouts } = useLayouts();
  const { teams } = useTeams();
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editIsTest, setEditIsTest] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!editOpen || !training) return;
    setEditName(training.name || '');
    setEditDate(training.date || '');
    setEditTeamId(training.teamId || '');
    setEditIsTest(!!training.isTest);
  }, [editOpen, training]);

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      await ds.updateTraining(trainingId, {
        name: editName.trim() || null,
        date: editDate || null,
        teamId: editTeamId || null,
        isTest: editIsTest,
      });
      setEditOpen(false);
    } catch (e) {
      console.error(e);
      alert('Błąd zapisu: ' + (e.message || e));
    }
    setEditSaving(false);
  };

  const isClosed = training?.status === 'closed';
  const trainingTeam = training?.teamId ? teams.find(t => t.id === training.teamId) : null;
  const editSubtitle = [training?.date, trainingTeam?.name]
    .filter(Boolean).join(' · ') || (t('tap_to_edit') || 'Dotknij aby edytować');

  const assignedLayout = training?.layoutId ? layouts.find(l => l.id === training.layoutId) : null;
  const assignedLayoutLabel = assignedLayout
    ? `${assignedLayout.name}${assignedLayout.league ? ` · ${assignedLayout.league}` : ''}${assignedLayout.year ? ` ${assignedLayout.year}` : ''}`
    : (t('no_layout_yet') || 'Brak — dotknij aby przypisać');

  const handlePickLayout = async (layoutId) => {
    await ds.updateTraining(trainingId, { layoutId: layoutId || null });
    setLayoutPickerOpen(false);
  };

  return (
    <MoreShell>
      {/* 1. SESSION — training editing is coach/scout territory; hide
          for pure-player (bug E1). */}
      {!isPurePlayer && (
        <MoreSection title={t('session_section') || 'Sesja'}>
          <MoreItem
            icon="✏️"
            label={t('edit_training') || 'Edytuj trening'}
            sub={editSubtitle}
            onClick={() => setEditOpen(true)}
          />
          <MoreItem
            icon="🎯"
            label={t('layout_assigned_label') || 'Layout'}
            sub={assignedLayoutLabel}
            onClick={() => setLayoutPickerOpen(true)}
            isLast
          />
        </MoreSection>
      )}

      {/* 2. MANAGE — hide for pure-player (bug E1). */}
      {!isPurePlayer && (
        <MoreSection title={t('browse_section') || 'Zarządzaj'}>
          <MoreItem icon="🗺" label={t('layouts_label') || 'Layouty'} onClick={() => navigate('/layouts')} />
          <MoreItem icon="🏢" label={t('teams_label') || 'Drużyny'} onClick={() => navigate('/teams')} />
          <MoreItem icon="🎽" label={t('players_label') || 'Zawodnicy'} onClick={() => navigate('/players')} />
          <MoreItem icon="🏅" label={t('scout_ranking') || 'Ranking scoutów'} onClick={() => navigate('/scouts')} isLast />
        </MoreSection>
      )}

      {/* 2.5 SCOUTING — per-device scouting preferences (bug A3).
          Hide for pure-player — loupe is a scouting-canvas concern. */}
      {!isPurePlayer && <ScoutingSection />}

      {/* 3. ACTIONS — end/delete training is coach/admin; hide for pure-player. */}
      {!isPurePlayer && (
        <MoreSection title={t('actions_single') || 'Akcje'} tone={isClosed ? 'danger' : 'default'}>
          {isClosed ? (
            <MoreItem icon="🗑" label={t('delete_training') || 'Usuń trening'} danger onClick={onDeleteTraining} isLast />
          ) : (
            <MoreItem icon="🏁" label={t('end_training') || 'Zakończ trening'} accent onClick={onEndTraining} isLast />
          )}
        </MoreSection>
      )}

      {/* 4. ACCOUNT */}
      <MoreSection title={t('account_section') || 'Konto'}>
        <MoreItem icon="👤" label={t('my_profile') || 'Mój profil'} onClick={() => navigate('/profile')} />
        <MoreItem
          icon="🏠"
          label={t('workspace_label') || 'Workspace'}
          onClick={onLogout}
          rightSlot={workspaceName ? (
            <WorkspaceValue name={workspaceName} />
          ) : null}
        />
        {onSignOut && (
          <MoreItem icon="🚪" label={t('sign_out') || 'Wyloguj się'} danger onClick={onSignOut} isLast />
        )}
      </MoreSection>

      {/* Feature flags (admin only, bug D1) — promoted from Debug
          section; flag edit UI now lives inline on the destination page. */}
      {isAdmin && (
        <MoreSection title={t('feature_flags_section') || 'Feature flags'}>
          <MoreItem
            icon="🚩"
            label={t('feature_flags_label') || 'Feature flags'}
            sub={t('feature_flags_sub') || 'Audiencja + włączenie per flaga'}
            onClick={() => navigate('/debug/flags')}
            isLast
          />
        </MoreSection>
      )}

      {/* Language — last section, every screen */}
      <LanguageSection />

      {/* Layout picker modal */}
      <Modal open={layoutPickerOpen} onClose={() => setLayoutPickerOpen(false)}
        title={t('layout_assigned_label') || 'Layout'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
          {layouts.length === 0 ? (
            <EmptyState icon="🗺" text={t('no_layouts') || 'Brak layoutów'}
              action={<Btn variant="accent" onClick={() => { setLayoutPickerOpen(false); navigate('/layouts'); }}>
                {t('go_to_layouts') || 'Przejdź do layoutów'}
              </Btn>} />
          ) : (
            <>
              <LayoutOption
                label={t('no_layout_option') || '— Bez layoutu —'}
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

      {/* Edit training modal */}
      <Modal open={editOpen} onClose={() => !editSaving && setEditOpen(false)}
        title={t('edit_training') || 'Edytuj trening'}
        footer={<>
          <Btn variant="default" onClick={() => setEditOpen(false)} disabled={editSaving}>
            {t('cancel') || 'Anuluj'}
          </Btn>
          <Btn variant="accent" onClick={handleSaveEdit} disabled={editSaving}>
            {editSaving ? (t('saving') || 'Zapisywanie…') : (t('save') || 'Zapisz')}
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
              {t('training_name') || 'Nazwa (opcjonalnie)'}
            </div>
            <Input value={editName} onChange={setEditName}
              placeholder={trainingTeam?.name ? `np. ${trainingTeam.name} — pre-NXL` : 'Nazwa treningu'} />
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
              {t('training_date') || 'Data'}
            </div>
            <Input type="date" value={editDate} onChange={setEditDate} />
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
              {t('team') || 'Drużyna'}
            </div>
            <Select value={editTeamId} onChange={setEditTeamId} style={{ width: '100%' }}>
              <option value="">— {t('no_team') || 'brak'} —</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </Select>
          </div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: RADIUS.md,
            background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}>
            <input type="checkbox" checked={editIsTest}
              onChange={e => setEditIsTest(e.target.checked)}
              style={{ accentColor: COLORS.accent, width: 18, height: 18 }} />
            <div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 500, color: COLORS.text }}>
                {t('test_session') || 'Sesja testowa'}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                {t('test_excluded') || 'Nie liczy się do statystyk'}
              </div>
            </div>
          </label>
        </div>
      </Modal>
    </MoreShell>
  );
}

function WorkspaceValue({ name }) {
  return (
    <span style={{
      fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
      color: COLORS.textDim, marginRight: 4,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      maxWidth: 160,
    }}>{name}</span>
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
      {selected && <span style={{ fontFamily: FONT, fontSize: 16, color: COLORS.accent }}>✓</span>}
    </div>
  );
}
