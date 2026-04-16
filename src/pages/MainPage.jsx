import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import TournamentPicker from '../components/TournamentPicker';
import NewTournamentModal from '../components/NewTournamentModal';
import ScoutTabContent from '../components/tabs/ScoutTabContent';
import CoachTabContent from '../components/tabs/CoachTabContent';
import MoreTabContent from '../components/tabs/MoreTabContent';
import TrainingScoutTab from '../components/tabs/TrainingScoutTab';
import TrainingCoachTab from '../components/tabs/TrainingCoachTab';
import TrainingMoreTab from '../components/tabs/TrainingMoreTab';
import { Btn, Modal, ConfirmModal, Input, Select, Icons } from '../components/ui';
import { useTournaments, useTrainings, useMatches, useScoutedTeams, useLayouts, useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, SPACE, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { yearOptions, currentYear } from '../utils/helpers';

const TAB_KEY = 'pbscoutpro_activeTab';
const TOURN_KEY = 'pbscoutpro_activeTournament';
const LAST_KIND_KEY = 'pbscoutpro_lastKind';
const LAST_TRAINING_KEY = 'pbscoutpro_lastTraining';

export default function MainPage({ onLogout, workspaceName }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { teams } = useTeams();

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
    setActiveTab(tab);
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
        tournament.league || (tournament.type === 'practice' ? 'Practice' : null),
        matches?.length ? `${matches.length} matches` : null,
        scouted?.length ? `${scouted.length} teams` : null,
      ].filter(Boolean).join(' \u00b7 ')
    : '';

  const trainingSubtitle = training
    ? [training.date, training.layoutId ? 'Layout assigned' : null].filter(Boolean).join(' \u00b7 ')
    : '';

  // Context object for AppShell.
  const contextObj = isTrainingMode
    ? (training ? {
        name: trainingTeam?.name || 'Training',
        isTest: training.isTest,
        status: training.status,
        _isTraining: true,
      } : null)
    : tournament;

  const contextSubtitle = isTrainingMode ? trainingSubtitle : tournamentSubtitle;

  const renderContent = () => {
    if (isTrainingMode && training) {
      if (activeTab === 'more') {
        return (
          <TrainingMoreTab
            trainingId={trainingId}
            training={training}
            workspaceName={workspaceName}
            onToggleLive={() => {
              const newStatus = training.status === 'live' ? 'open' : (training.status === 'closed' ? 'open' : 'live');
              ds.updateTraining(trainingId, { status: newStatus });
            }}
            onEndTraining={() => setEndTrainingConfirm(true)}
            onDeleteTraining={() => setDeleteTrainingConfirm(true)}
            onNewTournament={(kind) => { setNewModalKind(kind || 'tournament'); setNewModalOpen(true); }}
            onLogout={onLogout}
          />
        );
      }
      if (activeTab === 'coach') {
        return <TrainingCoachTab trainingId={trainingId} training={training} layoutId={training.layoutId || null} />;
      }
      return <TrainingScoutTab trainingId={trainingId} training={training} />;
    }

    if (activeTab === 'more') {
      return (
        <MoreTabContent
          tournamentId={tournamentId} tournament={tournament} workspaceName={workspaceName}
          onEditTournament={() => setEditModalOpen(true)}
          onCloseTournament={() => setCloseConfirmOpen(true)}
          onReopenTournament={() => ds.updateTournament(tournamentId, { status: 'open' })}
          onDeleteTournament={() => setDeleteTournamentConfirm(true)}
          onNewTournament={(kind) => { setNewModalKind(kind || 'tournament'); setNewModalOpen(true); }}
          onToggleLive={tournamentId ? () => {
            ds.updateTournament(tournamentId, { status: tournament?.status === 'live' ? 'open' : 'live' });
          } : null}
          onLogout={onLogout}
        />
      );
    }

    if (tournament) {
      return activeTab === 'scout'
        ? <ScoutTabContent tournamentId={tournamentId} />
        : <CoachTabContent tournamentId={tournamentId} />;
    }

    return <NoTournamentEmptyState onChoose={() => setPickerOpen(true)} onNew={() => setNewModalOpen(true)} />;
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tournament={contextObj}
      tournamentSubtitle={contextSubtitle}
      onChangeTournament={() => setPickerOpen(true)}
    >
      {renderContent()}

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
        title="Close tournament?"
        message={`"${tournament?.name}" will be marked as closed. You can still view data but not add new matches.`}
        confirmLabel="Close tournament" danger
        onConfirm={async () => { await ds.updateTournament(tournamentId, { status: 'closed' }); setCloseConfirmOpen(false); }}
      />
      <ConfirmModal open={endTrainingConfirm} onClose={() => setEndTrainingConfirm(false)}
        title="End training?"
        message="Mark this training as finished? You can still view results and scouted data."
        confirmLabel="End training"
        onConfirm={async () => { await ds.updateTraining(trainingId, { status: 'closed' }); setEndTrainingConfirm(false); }}
      />
      <ConfirmModal open={deleteTrainingConfirm} onClose={() => setDeleteTrainingConfirm(false)}
        title="Delete training?"
        message="All matchups, scouted points and results will be permanently deleted."
        confirmLabel="Delete training" danger
        onConfirm={async () => {
          await ds.deleteTraining(trainingId);
          setTrainingId(null);
          try { localStorage.removeItem(LAST_TRAINING_KEY); localStorage.removeItem(LAST_KIND_KEY); } catch {}
          setDeleteTrainingConfirm(false);
        }}
      />
      <ConfirmModal open={deleteTournamentConfirm} onClose={() => setDeleteTournamentConfirm(false)}
        title="Delete tournament?"
        message={`"${tournament?.name}" and all its matches, scouted points and data will be permanently deleted.`}
        confirmLabel="Delete tournament" danger
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

function NoTournamentEmptyState({ onChoose, onNew }) {
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
        Select a tournament or create a new one
      </div>
      <Btn variant="accent" onClick={onChoose}
        style={{ minHeight: 48, fontSize: FONT_SIZE.md, fontWeight: 700, padding: '0 24px' }}>
        Choose tournament
      </Btn>
      <Btn variant="default" onClick={() => onNew?.()}
        style={{ minHeight: 44, fontSize: FONT_SIZE.sm, fontWeight: 600, padding: '0 20px' }}>
        + New tournament or training
      </Btn>
    </div>
  );
}

function EditTournamentModal({ open, onClose, tournament, tournamentId }) {
  const { t } = useLanguage();
  const { layouts } = useLayouts();
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [year, setYear] = useState(currentYear());
  const [division, setDivision] = useState('');
  const [layoutId, setLayoutId] = useState('');

  useEffect(() => {
    if (!open || !tournament) return;
    setName(tournament.name || '');
    setLeague(tournament.league || 'NXL');
    setYear(tournament.year || currentYear());
    setDivision((tournament.divisions || [])[0] || '');
    setLayoutId(tournament.layoutId || '');
  }, [open, tournament]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await ds.updateTournament(tournamentId, {
      name: name.trim(), league, year: Number(year),
      divisions: division ? [division] : [],
      layoutId: layoutId || null,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Tournament settings"
      footer={<>
        <Btn variant="default" onClick={onClose}>{t('cancel')}</Btn>
        <Btn variant="accent" onClick={handleSave} disabled={!name.trim()}><Icons.Check /> Save</Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        <Input value={name} onChange={setName} placeholder="Tournament name..." autoFocus />
        <div style={{ display: 'flex', gap: SPACE.md }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>League</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {LEAGUES.map(l => (
                <Btn key={l} variant="default" size="sm" active={league === l}
                  style={{ borderColor: league === l ? LEAGUE_COLORS[l] : COLORS.border, color: league === l ? LEAGUE_COLORS[l] : COLORS.textDim }}
                  onClick={() => { setLeague(l); setDivision(''); }}>{l}</Btn>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Year</div>
            <Select value={year} onChange={v => setYear(Number(v))}>
              {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        </div>
        {DIVISIONS[league] && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Division</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DIVISIONS[league].map(d => (
                <Btn key={d} variant="default" size="sm" active={division === d}
                  onClick={() => setDivision(division === d ? '' : d)}>{d}</Btn>
              ))}
            </div>
          </div>
        )}
        {layouts.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Layout</div>
            <Select value={layoutId} onChange={setLayoutId} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
              <option value="">— no layout —</option>
              {layouts.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.league} {l.year})</option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </Modal>
  );
}
