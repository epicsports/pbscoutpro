import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import HeatmapCanvas from '../components/HeatmapCanvas';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, ScoreBadge } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePlayers } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH } from '../utils/theme';

export default function ScoutedTeamPage() {
  const { tournamentId, scoutedId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches, loading } = useMatches(tournamentId, scoutedId);
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [showRoster, setShowRoster] = useState(false);

  const tournament = tournaments.find(t => t.id === tournamentId);
  const scoutedEntry = scouted.find(s => s.id === scoutedId);
  const team = teams.find(t => t.id === scoutedEntry?.teamId);
  // Other scouted teams in this tournament (for opponent selection)
  const otherScouted = scouted.filter(s => s.id !== scoutedId);

  if (!tournament || !team) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const roster = (scoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  const nonRosterPlayers = players.filter(p => !(scoutedEntry?.roster || []).includes(p.id));
  const searchResults = rosterSearch ? nonRosterPlayers.filter(p =>
    (p.name || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.nickname || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.number || '').includes(rosterSearch)
  ).slice(0, 8) : [];

  const handleAddMatch = async () => {
    if (!name.trim()) return;
    const ref = await ds.addMatch(tournamentId, scoutedId, { name: name.trim() });
    setModal(null); setName('');
    navigate(`/tournament/${tournamentId}/team/${scoutedId}/match/${ref.id}`);
  };

  const handleDeleteMatch = async (mid) => { await ds.deleteMatch(tournamentId, scoutedId, mid); setModal(null); };

  const handleAddToRoster = async (playerId) => {
    const newRoster = [...(scoutedEntry?.roster || []), playerId];
    await ds.updateScoutedTeam(tournamentId, scoutedId, { roster: newRoster });
    // Also assign player to team if not already
    const player = players.find(p => p.id === playerId);
    if (player && player.teamId !== team.id) {
      await ds.updatePlayer(playerId, { teamId: team.id });
    }
    setRosterSearch('');
  };

  const handleRemoveFromRoster = async (playerId) => {
    const newRoster = (scoutedEntry?.roster || []).filter(id => id !== playerId);
    await ds.updateScoutedTeam(tournamentId, scoutedId, { roster: newRoster });
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name, team.name]} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionTitle>{team.name}</SectionTitle>

        {/* Roster toggle */}
        <div>
          <Btn variant="default" onClick={() => setShowRoster(!showRoster)} style={{ width: '100%', justifyContent: 'space-between' }}>
            <span><Icons.Users /> Roster na turniej ({roster.length})</span>
            <span style={{ transform: showRoster ? 'rotate(90deg)' : 'none', transition: '0.2s' }}><Icons.Chev /></span>
          </Btn>

          {showRoster && (
            <div className="fade-in" style={{ marginTop: 8, padding: 12, background: COLORS.surface, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
              {/* Search to add */}
              <div style={{ marginBottom: 10 }}>
                <Input value={rosterSearch} onChange={setRosterSearch} placeholder="🔍 Dodaj zawodnika do rostera..." />
                {searchResults.length > 0 && (
                  <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {searchResults.map(p => {
                      const pTeam = teams.find(t => t.id === p.teamId);
                      return (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                          borderRadius: 6, cursor: 'pointer', marginBottom: 2, minHeight: 36,
                          background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
                        }} onClick={() => handleAddToRoster(p.id)}>
                          <span style={{ fontFamily: FONT, fontWeight: 800, color: COLORS.accent, fontSize: TOUCH.fontSm }}>#{p.number}</span>
                          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>
                            {p.nickname || p.name}
                          </span>
                          {pTeam && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>{pTeam.name}</span>}
                          <Icons.Plus />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Current roster */}
              {roster.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                  borderRadius: 6, marginBottom: 3, minHeight: 36,
                }}>
                  <span style={{ fontFamily: FONT, fontWeight: 800, color: COLORS.accent, fontSize: TOUCH.fontSm }}>#{p.number}</span>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>
                    {p.name} {p.nickname && <span style={{ color: COLORS.textDim }}>„{p.nickname}"</span>}
                  </span>
                  <Btn variant="ghost" size="sm" onClick={() => handleRemoveFromRoster(p.id)}><Icons.Trash /></Btn>
                </div>
              ))}
              {!roster.length && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 6 }}>Roster pusty</div>}
            </div>
          )}
        </div>

        {/* Matches */}
        <div>
          <SectionTitle right={
            <Btn variant="accent" onClick={() => { setName(''); setModal('addMatch'); }}>
              <Icons.Plus /> Mecz
            </Btn>
          }>Mecze</SectionTitle>

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}
          {!loading && !matches.length && <EmptyState icon="📋" text="Dodaj mecz" />}

          {matches.map(m => (
            <Card key={m.id} icon={<Icons.Target />} title={m.name} subtitle={m.date}
              onClick={() => navigate(`/tournament/${tournamentId}/team/${scoutedId}/match/${m.id}`)}
              actions={
                <span onClick={e => e.stopPropagation()}>
                  <Btn variant="ghost" size="sm" onClick={() => setModal({ type: 'delete', id: m.id, name: m.name })}><Icons.Trash /></Btn>
                </span>
              } />
          ))}
        </div>
      </div>

      {/* Add match */}
      <Modal open={modal === 'addMatch'} onClose={() => setModal(null)} title="Nowy mecz"
        footer={<>
          <Btn variant="default" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="accent" onClick={handleAddMatch} disabled={!name.trim()}><Icons.Check /> Dodaj</Btn>
        </>}>
        <Input value={name} onChange={setName} placeholder="Nazwa meczu..." onKeyDown={e => e.key === 'Enter' && handleAddMatch()} autoFocus />
      </Modal>

      {/* Delete match */}
      <Modal open={modal?.type === 'delete'} onClose={() => setModal(null)} title="Usuń mecz?"
        footer={<>
          <Btn variant="default" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="danger" onClick={() => handleDeleteMatch(modal?.id)}><Icons.Trash /> Usuń</Btn>
        </>}>
        <p style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.textDim, margin: 0 }}>
          Usunąć <strong style={{ color: COLORS.text }}>{modal?.name}</strong>?
        </p>
      </Modal>
    </div>
  );
}
