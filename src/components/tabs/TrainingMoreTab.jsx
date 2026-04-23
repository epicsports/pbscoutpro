import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useLayouts, useTeams } from '../../hooks/useFirestore';
import { Modal, Btn, Input, Select, EmptyState, ConfirmModal } from '../ui';
import * as ds from '../../services/dataService';
import { MoreShell, MoreSection, MoreItem } from './MoreShell';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useViewAs } from '../../hooks/useViewAs';
import { hasAnyRole, getRolesForUser } from '../../utils/roleUtils';
import ViewAsPill from '../ViewAsPill';

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
  onSignOut,
  workspaceName,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { workspace: ws, user, leaveWorkspace } = useWorkspace();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const isAdmin = effectiveIsAdmin;
  // § 49 unified auth: hide scout/coach-level sections for pure-player.
  const isPurePlayer = !effectiveIsAdmin
    && !hasAnyRole(effectiveRoles, 'coach', 'scout');
  const pendingCount = Array.isArray(ws?.pendingApprovals) ? ws.pendingApprovals.length : 0;
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
      {/* 1. SESJA — edit + layout pick + end/delete (coach/scout/admin only). */}
      {!isPurePlayer && (
        <MoreSection title={t('session_section') || 'Sesja'} tone={isClosed ? 'danger' : 'default'}>
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
          />
          {isClosed ? (
            <MoreItem icon="🗑" label={t('delete_training') || 'Usuń trening'} danger onClick={onDeleteTraining} isLast />
          ) : (
            <MoreItem icon="🏁" label={t('end_training') || 'Zakończ trening'} accent onClick={onEndTraining} isLast />
          )}
        </MoreSection>
      )}

      {/* 2. ZARZĄDZAJ — coach + admin only. Layouts/Teams/Players. */}
      {!isPurePlayer && (
        <MoreSection title={t('manage_section') || 'Zarządzaj'}>
          <MoreItem icon="🗺" label={t('layouts_label') || 'Layouty'} onClick={() => navigate('/layouts')} />
          <MoreItem icon="🏢" label={t('teams_label') || 'Drużyny'} onClick={() => navigate('/teams')} />
          <MoreItem icon="🎽" label={t('players_label') || 'Zawodnicy'} onClick={() => navigate('/players')} isLast />
        </MoreSection>
      )}

      {/* 3. SCOUTING — handedness + my TODO + ranking. Pure-player hidden. */}
      {!isPurePlayer && (
        <TrainingScoutingSection navigate={navigate} t={t} />
      )}

      {/* 4. WORKSPACE */}
      <TrainingWorkspaceSection
        workspace={ws}
        user={user}
        workspaceName={workspaceName}
        effectiveIsAdmin={effectiveIsAdmin}
        pendingCount={pendingCount}
        leaveWorkspace={leaveWorkspace}
        navigate={navigate}
        t={t}
      />

      {/* 5. KONTO — profile + language + sign out (every role). */}
      <MoreSection title={t('account_section') || 'Konto'}>
        <MoreItem icon="👤" label={t('my_profile') || 'Mój profil'} onClick={() => navigate('/profile')} />
        <TrainingLanguageRow />
        {onSignOut && (
          <MoreItem icon="🚪" label={t('sign_out') || 'Wyloguj się'} danger onClick={onSignOut} isLast />
        )}
      </MoreSection>

      {/* 6. ADMIN — view-as + feature flags (admin only). */}
      {isAdmin && (
        <MoreSection title={t('admin_section') || 'Admin'}>
          <ViewAsPill />
          <MoreItem
            icon="🚩"
            label={t('feature_flags_label') || 'Feature flags'}
            sub={t('feature_flags_sub') || 'Audiencja + włączenie per flaga'}
            onClick={() => navigate('/debug/flags')}
            isLast
          />
        </MoreSection>
      )}

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

/* ─── § 50 SCOUTING + WORKSPACE helpers (mirror of MoreTabContent) ── */

const HANDEDNESS_KEY = 'pbscoutpro-handedness';

function TrainingScoutingSection({ navigate, t }) {
  const [handedness, setHandedness] = useState(() => {
    try { return localStorage.getItem(HANDEDNESS_KEY) || 'right'; }
    catch { return 'right'; }
  });
  const toggleHandedness = () => {
    const next = handedness === 'right' ? 'left' : 'right';
    setHandedness(next);
    try { localStorage.setItem(HANDEDNESS_KEY, next); } catch {}
  };
  const handLabel = handedness === 'right'
    ? (t('handedness_right') || 'RIGHT')
    : (t('handedness_left') || 'LEFT');
  return (
    <MoreSection title={t('scouting_section') || 'Scouting'}>
      <MoreItem
        icon="✋"
        label={t('handedness_label') || 'Ręka dominująca'}
        sub={t('handedness_sub') || 'Strona lupy podczas scoutingu'}
        onClick={toggleHandedness}
        rightSlot={<TrainingAccentPill text={handLabel} />}
      />
      <MoreItem
        icon="📋"
        label={t('todo_label') || 'Moje TODO scoutingowe'}
        onClick={() => navigate('/my-issues')}
      />
      <MoreItem
        icon="🏅"
        label={t('scout_ranking') || 'Ranking scoutów'}
        onClick={() => navigate('/scouts')}
        isLast
      />
    </MoreSection>
  );
}

function TrainingWorkspaceSection({ workspace, user, workspaceName, effectiveIsAdmin, pendingCount, leaveWorkspace, navigate, t }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const isLastAdmin = computeIsLastAdminTr(workspace, user?.uid);
  const slug = workspace?.slug;

  const handleLeave = async () => {
    if (!user?.uid) return;
    setLeaving(true);
    try {
      await ds.leaveWorkspaceSelf(user.uid);
      setConfirmOpen(false);
      leaveWorkspace();
    } catch (e) {
      console.error('Leave workspace failed:', e);
      alert(`${t('leave_failed') || 'Nie udało się wyjść'}: ${e.message || e}`);
      setLeaving(false);
    }
  };

  return (
    <MoreSection title={t('workspace_section_settings') || 'Workspace'}>
      <MoreItem icon="🏠" label={t('my_workspace') || 'Mój workspace'} sub={slug || undefined} />
      <MoreItem
        icon=""
        label={workspaceName || slug || t('workspace_label') || 'Workspace'}
        rightSlot={
          <TrainingLeaveBtn
            disabled={isLastAdmin}
            tooltip={isLastAdmin ? (t('leave_workspace_last_admin') || 'Jesteś jedynym administratorem') : null}
            onClick={() => setConfirmOpen(true)}
            label={t('leave_workspace_btn') || 'Wyjdź'}
          />
        }
        isLast={!effectiveIsAdmin}
      />
      {effectiveIsAdmin && (
        <MoreItem
          icon="👥"
          label={t('members_label') || 'Członkowie'}
          onClick={() => navigate('/settings/members')}
          rightSlot={pendingCount > 0 ? <TrainingPendingBadge count={pendingCount} /> : null}
          isLast
        />
      )}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => !leaving && setConfirmOpen(false)}
        title={t('leave_workspace_title') || 'Wyjść z workspace?'}
        message={t('leave_workspace_body') || 'Stracisz dostęp do wszystkich danych w workspace.'}
        confirmLabel={leaving ? (t('leaving') || 'Wychodzę…') : (t('leave_workspace_btn') || 'Wyjdź')}
        danger
        onConfirm={handleLeave}
      />
    </MoreSection>
  );
}

function computeIsLastAdminTr(workspace, uid) {
  if (!workspace || !uid) return false;
  const myRoles = getRolesForUser(workspace, uid);
  if (!myRoles.includes('admin')) return false;
  const userRoles = workspace.userRoles || {};
  const adminCount = Object.values(userRoles).filter(r => Array.isArray(r) && r.includes('admin')).length;
  const adminUidExtra = workspace.adminUid && !userRoles[workspace.adminUid]?.includes('admin') ? 1 : 0;
  return (adminCount + adminUidExtra) <= 1;
}

function TrainingLanguageRow() {
  const { lang, setLang } = useLanguage();
  const next = lang === 'pl' ? 'en' : 'pl';
  const flag = lang === 'pl' ? '🇵🇱' : '🇬🇧';
  const langName = lang === 'pl' ? 'Polski' : 'English';
  return (
    <MoreItem
      icon="🌐"
      label={langName}
      onClick={() => setLang(next)}
      rightSlot={<TrainingAccentPill text={`${flag} ${lang.toUpperCase()}`} />}
    />
  );
}

function TrainingAccentPill({ text }) {
  return (
    <span style={{
      fontFamily: FONT, fontSize: 11, fontWeight: 700,
      color: COLORS.accent,
      padding: '4px 8px', borderRadius: 6,
      background: `${COLORS.accent}10`,
      border: `1px solid ${COLORS.accent}30`,
      letterSpacing: 0.4,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      marginRight: 4,
    }}>{text}</span>
  );
}

function TrainingLeaveBtn({ disabled, tooltip, onClick, label }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      title={tooltip || undefined}
      style={{
        fontFamily: FONT, fontSize: 12, fontWeight: 700,
        padding: '8px 14px', minHeight: 36,
        borderRadius: 8,
        background: disabled ? `${COLORS.danger}10` : `${COLORS.danger}18`,
        color: disabled ? `${COLORS.danger}66` : COLORS.danger,
        border: `1px solid ${disabled ? `${COLORS.danger}22` : `${COLORS.danger}55`}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: 0.3,
        WebkitTapHighlightColor: 'transparent',
        marginRight: 4,
      }}
    >{label}</button>
  );
}

function TrainingPendingBadge({ count }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 22, height: 22, padding: '0 6px', marginRight: 4,
      borderRadius: 999,
      background: COLORS.accent, color: '#000',
      fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800,
    }}>{count}</span>
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
