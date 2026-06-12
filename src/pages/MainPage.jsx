import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import NavDrawer from '../components/NavDrawer';
import { computeVisibleTabs } from '../components/TabBar';
import TournamentPicker from '../components/TournamentPicker';
import NewTournamentModal from '../components/NewTournamentModal';
import ScoutTabContent from '../components/tabs/ScoutTabContent';
import CoachTabContent from '../components/tabs/CoachTabContent';
import MoreTabContent from '../components/tabs/MoreTabContent';
import TrainingScoutTab from '../components/tabs/TrainingScoutTab';
import TrainingCoachTab from '../components/tabs/TrainingCoachTab';
import TrainingMoreTab from '../components/tabs/TrainingMoreTab';
import WorkspaceLogo from '../components/settings/WorkspaceLogo';
import { Btn, Modal, ConfirmModal, Input, Select, Icons } from '../components/ui';
import { useTournaments, useTrainings, useMatches, useScoutedTeams, useLayouts, useActiveTeams, usePlayers } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import { useViewAs } from '../hooks/useViewAs';
import { hasAnyRole } from '../utils/roleUtils';
import { FreshWorkspaceChecklist, ScoutWaitingEmptyState } from '../components/home/FreshWorkspaceChecklist';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUE_COLORS } from '../utils/theme';
import { useLeagues, leagueDisplayName } from '../hooks/useLeagues';
import { useLeagueDivisions } from '../hooks/useLeagueDivisions';
import { useLanguage } from '../hooks/useLanguage';
import { yearOptions, currentYear } from '../utils/helpers';

const TAB_KEY = 'pbscoutpro_activeTab';
const TOURN_KEY = 'pbscoutpro_activeTournament';
const LAST_KIND_KEY = 'pbscoutpro_lastKind';
const LAST_TRAINING_KEY = 'pbscoutpro_lastTraining';

export default function MainPage({ onSignOut, workspaceName }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tournaments, loading: tournamentsLoading } = useTournaments();
  const { trainings, loading: trainingsLoading } = useTrainings();
  const { teams } = useActiveTeams();
  const { players } = usePlayers();
  // B4 role-aware home — roles + derived onboarding signals (mockup-4).
  const { workspace, roles, isAdmin } = useWorkspace();
  const { layouts, loading: layoutsLoading } = useLayouts();

  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem(TAB_KEY) || 'scout'; }
    catch { return 'scout'; }
  });
  const [tournamentId, setTournamentId] = useState(() => {
    try {
      const lastKind = localStorage.getItem(LAST_KIND_KEY);
      if (lastKind === 'training') return null;
      return localStorage.getItem(TOURN_KEY) || null;
    }
    catch { return null; }
  });
  const [trainingId, setTrainingId] = useState(() => {
    try {
      const lastKind = localStorage.getItem(LAST_KIND_KEY);
      if (lastKind === 'training') return localStorage.getItem(LAST_TRAINING_KEY) || null;
      return null;
    }
    catch { return null; }
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  // §C2 nav drawer — transient overlay (mockup-7). NEVER auto-opens: false on
  // every mount; only the reads ball (AppShell top bar) opens it.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newModalKind, setNewModalKind] = useState('tournament');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [endTrainingConfirm, setEndTrainingConfirm] = useState(false);
  const [deleteTrainingConfirm, setDeleteTrainingConfirm] = useState(false);
  const [deleteTournamentConfirm, setDeleteTournamentConfirm] = useState(false);

  const tournament = useMemo(
    () => tournaments.find(t => t.id === tournamentId) || null,
    [tournaments, tournamentId],
  );
  const training = useMemo(
    () => trainings.find(t => t.id === trainingId) || null,
    [trainings, trainingId],
  );
  const trainingTeam = useMemo(
    () => training ? teams.find(t => t.id === training.teamId) : null,
    [training, teams],
  );

  const isTrainingMode = !!trainingId;

  // If saved id no longer exists, drop it.
  useEffect(() => {
    if (tournamentId && tournaments.length && !tournament) {
      setTournamentId(null);
      try { localStorage.removeItem(TOURN_KEY); } catch {}
    }
  }, [tournamentId, tournament, tournaments.length]);

  useEffect(() => {
    if (trainingId && trainings.length && !training) {
      setTrainingId(null);
      try { localStorage.removeItem(LAST_TRAINING_KEY); localStorage.removeItem(LAST_KIND_KEY); } catch {}
    }
  }, [trainingId, training, trainings.length]);

  const handleTabChange = (tab) => {
    // Gracz tab (§ 49) is a nav shortcut to PPT rather than an
    // in-place content swap — PPT has its own layout + chrome
    // (picker / wizard / list) that would clash with AppShell's
    // tournament context bar. Don't persist 'ppt' to localStorage;
    // returning to `/` should drop the user back on whatever tab
    // they were last on.
    if (tab === 'ppt') {
      navigate('/player/log');
      return;
    }
    setActiveTab(tab);
    // §C3: only content tabs exist now ('more' is retired — settings live in
    // the drawer), so every switched-to tab is a valid resume target. A stale
    // persisted 'more' from older sessions is migrated by AppShell's fallback
    // effect (hidden tab → first content tab).
    try { localStorage.setItem(TAB_KEY, tab); } catch {}
  };

  const handleSelectTournament = (id) => {
    setTournamentId(id);
    setTrainingId(null);
    try {
      if (id) {
        localStorage.setItem(TOURN_KEY, id);
        localStorage.setItem(LAST_KIND_KEY, 'tournament');
        localStorage.removeItem(LAST_TRAINING_KEY);
      } else {
        localStorage.removeItem(TOURN_KEY);
        localStorage.removeItem(LAST_KIND_KEY);
      }
    } catch {}
    setPickerOpen(false);
  };

  const handleSelectTraining = (id) => {
    setTrainingId(id);
    setTournamentId(null);
    try {
      localStorage.setItem(LAST_KIND_KEY, 'training');
      localStorage.setItem(LAST_TRAINING_KEY, id);
      localStorage.removeItem(TOURN_KEY);
    } catch {}
    setPickerOpen(false);
  };

  // Subtitle for tournament context bar.
  const { matches } = useMatches(tournamentId);
  const { scouted } = useScoutedTeams(tournamentId);
  const tournamentSubtitle = tournament
    ? [
        tournament.league || null,
        matches?.length ? t('matches_count', matches.length) : null,
        scouted?.length ? t('teams_count', scouted.length) : null,
      ].filter(Boolean).join(' \u00b7 ')
    : '';

  const trainingSubtitle = training
    ? [
        training.date,
        // If we used training.name as title, surface team in subtitle so context isn't lost
        training.name && trainingTeam?.name ? trainingTeam.name : null,
        training.layoutId ? t('training_layout_assigned') : null,
      ].filter(Boolean).join(' \u00b7 ')
    : '';

  // Context object for AppShell.
  const contextObj = isTrainingMode
    ? (training ? {
        name: training.name || trainingTeam?.name || t('training'),
        isTest: training.isTest,
        status: training.status,
        _isTraining: true,
      } : null)
    : tournament;

  const contextSubtitle = isTrainingMode ? trainingSubtitle : tournamentSubtitle;

  // ── B4 role-aware home (mockup-4, gate passed 2026-06-10) ──
  // Checklist state is DERIVED FROM DATA (no onboarding-progress collection):
  // signals come from subscriptions MainPage already mounts (+ the
  // version-cached catalog read for layouts) — A3 zero-new-expensive-reads.
  // hasLayout keys off the workspace's OVERLAYS (useLayouts maps overlays→base
  // join), so the global library alone does NOT satisfy the step.
  const signalsReady = !tournamentsLoading && !trainingsLoading && !layoutsLoading && !!workspace;
  const signals = {
    hasEvent: tournaments.length > 0 || trainings.length > 0,
    hasLayout: layouts.length > 0,
    hasMembers: (workspace?.members || []).length > 1,
  };
  // Admin nudge row (step 5) — done when any overlay carries config content;
  // does NOT gate checklist disappearance (signals only).
  const configDone = layouts.some(l => (l.zones || []).length > 0 || (l.lines || []).length > 0);
  const isCoachish = isAdmin || hasAnyRole(roles, 'coach');
  const isScoutOnly = !isCoachish && hasAnyRole(roles, 'scout');
  // "Zrobię to później" — session-scoped dismissal, no stored state beyond it.
  const [checklistLater, setChecklistLater] = useState(() => {
    try { return sessionStorage.getItem('pbscoutpro_b4_later') === '1'; } catch { return false; }
  });
  const dismissChecklist = () => {
    setChecklistLater(true);
    try { sessionStorage.setItem('pbscoutpro_b4_later', '1'); } catch {}
  };
  const checklistVisible = signalsReady && isCoachish && !checklistLater
    && !(signals.hasEvent && signals.hasLayout && signals.hasMembers);

  // §C4 viewer-only terminal state — a user with ZERO content tabs (viewer
  // role matches no tab gate) gets a workspace summary card as their home;
  // the drawer is their whole surface (replaces the old "lands on More").
  // Effective roles (useViewAs) so an admin impersonating viewer previews it.
  // Gated on the loaded workspace doc — empty roles while loading must not
  // flash the card for content-role users.
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const isViewerOnly = !!workspace
    && computeVisibleTabs(effectiveRoles, effectiveIsAdmin).length === 0;

  // §C2 drawer content — today's settings surface BY REFERENCE (chrome
  // restructure, not content redesign): TrainingMoreTab in an active training
  // context, MoreTabContent otherwise. Same props the 'more' tab used to get.
  const drawerContent = (isTrainingMode && training) ? (
    <TrainingMoreTab
      trainingId={trainingId}
      training={training}
      workspaceName={workspaceName}
      onEndTraining={() => setEndTrainingConfirm(true)}
      onDeleteTraining={() => setDeleteTrainingConfirm(true)}
      onSignOut={onSignOut}
    />
  ) : (
    <MoreTabContent
      tournamentId={tournamentId} tournament={tournament} workspaceName={workspaceName}
      onEditTournament={() => setEditModalOpen(true)}
      onCloseTournament={() => setCloseConfirmOpen(true)}
      onDeleteTournament={() => setDeleteTournamentConfirm(true)}
      onSignOut={onSignOut}
    />
  );

  const renderContent = () => {
    if (isViewerOnly) {
      return <ViewerHomeCard workspace={workspace} workspaceName={workspaceName} />;
    }
    // B4 — coach/admin fresh-workspace checklist replaces the home content
    // until all signals are true or the user defers it for this session.
    // An explicitly-entered training stays reachable.
    if (!isTrainingMode && checklistVisible) {
      return (
        <FreshWorkspaceChecklist
          isAdmin={isAdmin}
          workspaceName={workspace?.name || workspaceName || t('workspace_label')}
          signals={signals}
          configDone={configDone}
          onAddEvent={() => setNewModalOpen(true)}
          onLater={dismissChecklist}
        />
      );
    }
    if (isTrainingMode && training) {
      if (activeTab === 'coach') {
        return <TrainingCoachTab trainingId={trainingId} training={training} layoutId={training.layoutId || null} />;
      }
      return <TrainingScoutTab trainingId={trainingId} training={training} />;
    }

    if (tournament) {
      return activeTab === 'scout'
        ? <ScoutTabContent tournamentId={tournamentId} />
        : <CoachTabContent tournamentId={tournamentId} />;
    }

    // B4 — a scout with no active event gets the single-path waiting state
    // (mockup-4) instead of the coach-flavoured tournament-picker empty state.
    if (isScoutOnly) return <ScoutWaitingEmptyState />;

    return <NoTournamentEmptyState onChoose={() => setPickerOpen(true)} onNew={() => setNewModalOpen(true)} />;
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tournament={contextObj}
      tournamentSubtitle={contextSubtitle}
      onChangeTournament={() => setPickerOpen(true)}
      onOpenDrawer={() => setDrawerOpen(true)}
    >
      {renderContent()}

      {/* §C2 nav drawer — settings surface by reference (mockup-7). */}
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {drawerContent}
      </NavDrawer>

      <TournamentPicker
        open={pickerOpen}
        activeTournamentId={isTrainingMode ? null : tournamentId}
        activeTrainingId={isTrainingMode ? trainingId : null}
        onSelect={(id, kind) => {
          setPickerOpen(false);
          if (kind === 'training') handleSelectTraining(id);
          else handleSelectTournament(id);
        }}
        onNew={() => setNewModalOpen(true)}
        onClose={() => setPickerOpen(false)}
      />
      <NewTournamentModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        kind={newModalKind}
        onCreated={(id, kind) => {
          if (!id) return;
          if (kind === 'training') {
            handleSelectTraining(id);
            navigate(`/training/${id}/setup`);
          } else {
            handleSelectTournament(id);
          }
        }}
      />
      {tournament && (
        <EditTournamentModal open={editModalOpen} onClose={() => setEditModalOpen(false)}
          tournament={tournament} tournamentId={tournamentId} />
      )}
      <ConfirmModal open={closeConfirmOpen} onClose={() => setCloseConfirmOpen(false)}
        title={t('close_tournament') || 'Zamknij turniej'}
        message={t('close_tournament_msg')}
        confirmLabel={t('close_tournament') || 'Zamknij turniej'}
        onConfirm={async () => { await ds.updateTournament(tournamentId, { status: 'closed' }); setCloseConfirmOpen(false); }}
      />
      <ConfirmModal open={endTrainingConfirm} onClose={() => setEndTrainingConfirm(false)}
        title={t('end_training') || 'Zakończ trening'}
        message={t('end_training_msg')}
        confirmLabel={t('end_training') || 'Zakończ trening'}
        onConfirm={() => {
          // § 70 — updateTraining(status:'closed') runs propagateTraining (the
          // multi-source matcher across every matchup), which can take tens of
          // seconds. Dismiss the modal immediately; the close-write +
          // propagation run in the background (both best-effort).
          setEndTrainingConfirm(false);
          ds.updateTraining(trainingId, { status: 'closed' })
            .catch(e => console.error('End training failed:', e));
        }}
      />
      <ConfirmModal open={deleteTrainingConfirm} onClose={() => setDeleteTrainingConfirm(false)}
        title={t('delete_training_confirm_title')}
        message={t('delete_training_confirm_msg')}
        confirmLabel={t('delete_training')} danger
        onConfirm={async () => {
          await ds.deleteTraining(trainingId);
          setTrainingId(null);
          try { localStorage.removeItem(LAST_TRAINING_KEY); localStorage.removeItem(LAST_KIND_KEY); } catch {}
          setDeleteTrainingConfirm(false);
        }}
      />
      <ConfirmModal open={deleteTournamentConfirm} onClose={() => setDeleteTournamentConfirm(false)}
        title={t('delete_tournament_confirm_title')}
        message={t('delete_tournament_confirm_msg', tournament?.name)}
        confirmLabel={t('delete_tournament')} danger
        onConfirm={async () => {
          await ds.deleteTournament(tournamentId);
          setTournamentId(null);
          try { localStorage.removeItem(TOURN_KEY); localStorage.removeItem(LAST_KIND_KEY); } catch {}
          setDeleteTournamentConfirm(false);
        }}
      />
    </AppShell>
  );
}

/**
 * ViewerHomeCard — §C4 viewer-only terminal state (mockup-7). A read-only user
 * with no content tabs gets a workspace summary card (logo + name + role) as
 * their whole home; settings/sign-out live in the drawer behind the reads
 * ball. Non-interactive card: no chevron, no CTA, ≤3 data points (§27).
 */
function ViewerHomeCard({ workspace, workspaceName }) {
  const { t } = useLanguage();
  return (
    <div data-testid="viewer-home" style={{
      padding: SPACE.lg, maxWidth: 480, margin: '0 auto', width: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        padding: SPACE.xxl,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: SPACE.sm, textAlign: 'center', marginTop: SPACE.xl,
      }}>
        <WorkspaceLogo url={workspace?.logoUrl} size={48} radius={RADIUS.md} />
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 700,
          color: COLORS.text, letterSpacing: '-.2px',
        }}>{workspace?.name || workspaceName || t('workspace_label')}</div>
        <div style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 600,
          color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '.5px',
        }}>{t('role_viewer') || 'Viewer'}</div>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
          color: COLORS.textDim, lineHeight: 1.5, maxWidth: 280, marginTop: SPACE.xs,
        }}>{t('viewer_home_hint')}</div>
      </div>
    </div>
  );
}

function NoTournamentEmptyState({ onChoose, onNew }) {
  const { t } = useLanguage();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 24px', gap: SPACE.lg, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>{'\ud83c\udfc6'}</div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 500,
        color: COLORS.textDim, maxWidth: 280, lineHeight: 1.4,
      }}>
        {t('main_no_event_text')}
      </div>
      <Btn variant="accent" onClick={onChoose}
        style={{ minHeight: 48, fontSize: FONT_SIZE.md, fontWeight: 700, padding: '0 24px' }}>
        {t('main_choose_tournament')}
      </Btn>
      <Btn variant="default" onClick={() => onNew?.()}
        style={{ minHeight: 44, fontSize: FONT_SIZE.sm, fontWeight: 600, padding: '0 20px' }}>
        {t('main_new_event_btn')}
      </Btn>
    </div>
  );
}

function EditTournamentModal({ open, onClose, tournament, tournamentId }) {
  const { t } = useLanguage();
  const { layouts } = useLayouts();
  const leaguesList = useLeagues();
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const leagueDivisions = useLeagueDivisions(league);
  const leagueHasDivisions = leagueDivisions.length > 0;
  const [year, setYear] = useState(currentYear());
  // Multi-select (bug H1). Defensive initializer below accepts either the
  // array-shaped `divisions` (current data model) or a legacy singular
  // `division` string, so editing an existing tournament never loses data.
  const [divisions, setDivisions] = useState([]);
  const [layoutId, setLayoutId] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // § PWA_COLDBOOT STAGE 3 — "Download for offline" state. lastAt persists per
  // tournament so the timestamp survives reopening the modal.
  const [dlStatus, setDlStatus] = useState('idle'); // idle | downloading | done | error
  const [dlAt, setDlAt] = useState(() => {
    try { return Number(localStorage.getItem(`pbOfflineDl_${tournamentId}`)) || 0; } catch { return 0; }
  });

  const handleDownloadOffline = async () => {
    setDlStatus('downloading');
    try {
      const at = await ds.prefetchTournamentForOffline(tournamentId, layoutId || tournament?.layoutId || null);
      setDlAt(at);
      try { localStorage.setItem(`pbOfflineDl_${tournamentId}`, String(at)); } catch { /* non-fatal */ }
      setDlStatus('done');
    } catch {
      setDlStatus('error');
    }
  };

  useEffect(() => {
    if (!open || !tournament) return;
    setName(tournament.name || '');
    setLeague(tournament.league || 'NXL');
    setYear(tournament.year || currentYear());
    setDivisions(
      Array.isArray(tournament.divisions) && tournament.divisions.length
        ? tournament.divisions
        : tournament.division
          ? [tournament.division]
          : []
    );
    setLayoutId(tournament.layoutId || '');
    setSubmitAttempted(false);
  }, [open, tournament]);

  const toggleDivision = (d) => {
    setDivisions(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const divisionsRequired = leagueHasDivisions;
  const canSave = !!name.trim() && (!divisionsRequired || divisions.length >= 1);

  const handleSave = async () => {
    setSubmitAttempted(true);
    if (!name.trim()) return;
    if (divisionsRequired && divisions.length === 0) return;
    await ds.updateTournament(tournamentId, {
      name: name.trim(), league, year: Number(year),
      divisions,
      // Keep singular `division` synced with first array entry for any
      // legacy consumer still reading it. Array remains authoritative.
      division: divisions[0] || null,
      layoutId: layoutId || null,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('tournament_settings_title')}
      footer={<>
        <Btn variant="default" onClick={onClose}>{t('cancel')}</Btn>
        <Btn variant="accent" onClick={handleSave} disabled={!canSave}><Icons.Check /> {t('save')}</Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        <Input value={name} onChange={setName} placeholder={t('tournament_name_ph')} autoFocus />
        <div style={{ display: 'flex', gap: SPACE.md }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('league_label')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {leaguesList.map(L => {
                const l = L.shortName;
                return (
                  <Btn key={L.id} variant="default" size="sm" active={league === l}
                    style={{ borderColor: league === l ? LEAGUE_COLORS[l] : COLORS.border, color: league === l ? LEAGUE_COLORS[l] : COLORS.textDim }}
                    onClick={() => { setLeague(l); setDivisions([]); }}>{l}</Btn>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('year_label')}</div>
            <Select value={year} onChange={v => setYear(Number(v))}>
              {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        </div>
        {leagueHasDivisions && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>
              {t('divisions_label')} <span style={{ color: COLORS.textDim, fontWeight: 400 }}>{t('divisions_one_or_more')}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {leagueDivisions.map(d => (
                <Btn key={d.id} variant="default" size="sm" active={divisions.includes(d.name)}
                  onClick={() => toggleDivision(d.name)}>{d.name}</Btn>
              ))}
            </div>
            {submitAttempted && divisions.length === 0 && (
              <div style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 600,
                color: COLORS.danger, marginTop: 6,
              }}>
                {t('divisions_required_error')}
              </div>
            )}
          </div>
        )}
        {layouts.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('layout_assigned_label')}</div>
            <Select value={layoutId} onChange={setLayoutId} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
              <option value="">— no layout —</option>
              {layouts.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({leagueDisplayName(l.league)} {l.year})</option>
              ))}
            </Select>
          </div>
        )}

        {/* § PWA_COLDBOOT STAGE 3 — manual offline precache. Secondary action
            (variant=default — Save stays the single amber CTA). Eager-reads the
            tournament into IndexedDB so the app opens it offline at the venue. */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: SPACE.md, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{t('offline_label')}</div>
          <Btn variant="default" onClick={handleDownloadOffline} disabled={dlStatus === 'downloading'}
            style={{ justifyContent: 'center', minHeight: TOUCH.minTarget }}>
            {dlStatus === 'downloading' ? t('offline_downloading') : dlStatus === 'done' ? t('offline_downloaded') : t('offline_download_btn')}
          </Btn>
          {dlStatus === 'error' && (
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.danger }}>
              {t('offline_download_failed')}
            </div>
          )}
          {dlAt > 0 && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>
              {t('offline_last_downloaded', new Date(dlAt).toLocaleString())}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
