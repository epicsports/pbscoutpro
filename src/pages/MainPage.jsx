import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import TournamentPicker from '../components/TournamentPicker';
import NewTournamentModal from '../components/NewTournamentModal';
import ScoutTabContent from '../components/tabs/ScoutTabContent';
import CoachTabContent from '../components/tabs/CoachTabContent';
import MoreTabContent from '../components/tabs/MoreTabContent';
import { Btn, Modal, ConfirmModal, Input, Select, Icons } from '../components/ui';
import { useTournaments, useMatches, useScoutedTeams, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS } from '../utils/theme';
import { yearOptions, currentYear } from '../utils/helpers';

/**
 * MainPage — root of the bottom-tab nav (DESIGN_DECISIONS § 31).
 *
 * Owns:
 *  - active tab (persisted)
 *  - active tournament id (persisted)
 *  - tournament picker open/close
 * Delegates rendering to AppShell + tab content components.
 *
 * Tab content components are wired in Parts 3-5. For Part 2 we render
 * a minimal placeholder so the shell is testable end-to-end.
 */
const TAB_KEY = 'pbscoutpro_activeTab';
const TOURN_KEY = 'pbscoutpro_activeTournament';
const LAST_KIND_KEY = 'pbscoutpro_lastKind';
const LAST_TRAINING_KEY = 'pbscoutpro_lastTraining';

export default function MainPage({ onLogout, workspaceName }) {
  const navigate = useNavigate();
  const { tournaments } = useTournaments();

  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem(TAB_KEY) || 'scout'; }
    catch { return 'scout'; }
  });
  const [tournamentId, setTournamentId] = useState(() => {
    try { return localStorage.getItem(TOURN_KEY) || null; }
    catch { return null; }
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newModalKind, setNewModalKind] = useState('tournament');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  // Auto-navigate to last training on mount
  const autoNavDone = useRef(false);
  useEffect(() => {
    if (autoNavDone.current) return;
    autoNavDone.current = true;
    try {
      const lastKind = localStorage.getItem(LAST_KIND_KEY);
      const lastTraining = localStorage.getItem(LAST_TRAINING_KEY);
      if (lastKind === 'training' && lastTraining) {
        navigate(`/training/${lastTraining}`, { replace: true });
      }
    } catch {}
  }, []);

  const tournament = useMemo(
    () => tournaments.find(t => t.id === tournamentId) || null,
    [tournaments, tournamentId],
  );

  // If saved id no longer exists (deleted on another device), drop it.
  useEffect(() => {
    if (tournamentId && tournaments.length && !tournament) {
      setTournamentId(null);
      try { localStorage.removeItem(TOURN_KEY); } catch {}
    }
  }, [tournamentId, tournament, tournaments.length]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    try { localStorage.setItem(TAB_KEY, tab); } catch {}
  };

  const handleSelectTournament = (id) => {
    setTournamentId(id);
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

  // Subtitle for context bar: league + match count (loaded lazily).
  const { matches } = useMatches(tournamentId);
  const { scouted } = useScoutedTeams(tournamentId);
  const subtitle = tournament
    ? [
        tournament.league || (tournament.type === 'practice' ? 'Practice' : null),
        matches?.length ? `${matches.length} matches` : null,
        scouted?.length ? `${scouted.length} teams` : null,
      ].filter(Boolean).join(' · ')
    : '';

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tournament={tournament}
      tournamentSubtitle={subtitle}
      onChangeTournament={() => setPickerOpen(true)}
    >
      {activeTab === 'more' ? (
        <MoreTabContent
          tournamentId={tournamentId}
          tournament={tournament}
          workspaceName={workspaceName}
          onEditTournament={() => setEditModalOpen(true)}
          onCloseTournament={() => setCloseConfirmOpen(true)}
          onNewTournament={(kind) => { setNewModalKind(kind || 'tournament'); setNewModalOpen(true); }}
          onToggleLive={tournamentId ? () => {
            ds.updateTournament(tournamentId, {
              status: tournament?.status === 'live' ? 'open' : 'live',
            });
          } : null}
          onLogout={onLogout}
        />
      ) : tournament ? (
        activeTab === 'scout' ? (
          <ScoutTabContent tournamentId={tournamentId} />
        ) : (
          <CoachTabContent tournamentId={tournamentId} />
        )
      ) : (
        <NoTournamentEmptyState onChoose={() => setPickerOpen(true)} onNew={() => setNewModalOpen(true)} />
      )}

      <TournamentPicker
        open={pickerOpen}
        activeTournamentId={tournamentId}
        onSelect={(id, kind) => {
          setPickerOpen(false);
          if (kind === 'training') {
            try { localStorage.setItem(LAST_KIND_KEY, 'training'); localStorage.setItem(LAST_TRAINING_KEY, id); } catch {}
            navigate(`/training/${id}`);
          } else {
            handleSelectTournament(id);
          }
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
            try { localStorage.setItem(LAST_KIND_KEY, 'training'); localStorage.setItem(LAST_TRAINING_KEY, id); } catch {}
            navigate(`/training/${id}/setup`);
          } else {
            handleSelectTournament(id);
          }
        }}
      />
      {tournament && (
        <EditTournamentModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          tournament={tournament}
          tournamentId={tournamentId}
        />
      )}
      <ConfirmModal
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        title="Close tournament?"
        message={`"${tournament?.name}" will be marked as closed. You can still view data but not add new matches.`}
        confirmLabel="Close tournament"
        danger
        onConfirm={async () => {
          await ds.updateTournament(tournamentId, { status: 'closed' });
          setCloseConfirmOpen(false);
        }}
      />
    </AppShell>
  );
}

function NoTournamentEmptyState({ onChoose, onNew }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      gap: SPACE.lg,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48 }}>🏆</div>
      <div style={{
        fontFamily: FONT,
        fontSize: FONT_SIZE.md,
        fontWeight: 500,
        color: COLORS.textDim,
        maxWidth: 280,
        lineHeight: 1.4,
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
      name: name.trim(),
      league,
      year: Number(year),
      divisions: division ? [division] : [],
      layoutId: layoutId || null,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Tournament settings"
      footer={<>
        <Btn variant="default" onClick={onClose}>Cancel</Btn>
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

