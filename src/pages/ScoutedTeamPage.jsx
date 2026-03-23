import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons } from '../components/ui';
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
  const { matches } = useMatches(tournamentId);
  const [rosterSearch, setRosterSearch] = useState('');
  const [showRoster, setShowRoster] = useState(false);
  const [addMatchModal, setAddMatchModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState('');

  const tournament = tournaments.find(t => t.id === tournamentId);
  const scoutedEntry = scouted.find(s => s.id === scoutedId);
  const team = teams.find(t => t.id === scoutedEntry?.teamId);
  const otherScouted = scouted.filter(s => s.id !== scoutedId);

  if (!tournament || !team) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const roster = (scoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  const nonRosterPlayers = players.filter(p => !(scoutedEntry?.roster || []).includes(p.id));
  const searchResults = rosterSearch ? nonRosterPlayers.filter(p =>
    (p.name||'').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.nickname||'').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.number||'').includes(rosterSearch)
  ).slice(0, 8) : [];

  // Filter matches where this team plays (teamA or teamB)
  const teamMatches = matches.filter(m => m.teamA === scoutedId || m.teamB === scoutedId);

  const handleAddMatch = async () => {
    if (!selectedOpponent) return;
    const oppEntry = scouted.find(s => s.id === selectedOpponent);
    const oppTeam = oppEntry ? teams.find(t => t.id === oppEntry.teamId) : null;
    await ds.addMatch(tournamentId, {
      teamA: scoutedId,
      teamB: selectedOpponent,
      name: `${team.name} vs ${oppTeam?.name || '?'}`,
    });
    setAddMatchModal(false); setSelectedOpponent('');
  };

  const handleDeleteMatch = async (mid) => {
    await ds.deleteMatch(tournamentId, mid);
  };

  const handleAddToRoster = async (playerId) => {
    const newRoster = [...(scoutedEntry?.roster || []), playerId];
    await ds.updateScoutedTeam(tournamentId, scoutedId, { roster: newRoster });
    const player = players.find(p => p.id === playerId);
    if (player && player.teamId !== team.id) await ds.changePlayerTeam(playerId, team.id, player.teamHistory || []);
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

        {/* Roster */}
        <div>
          <Btn variant="default" onClick={() => setShowRoster(!showRoster)} style={{ width: '100%', justifyContent: 'space-between' }}>
            <span><Icons.Users /> Roster ({roster.length})</span>
            <span style={{ transform: showRoster ? 'rotate(90deg)' : 'none', transition: '0.2s' }}><Icons.Chev /></span>
          </Btn>
          {showRoster && (
            <div className="fade-in" style={{ marginTop: 8, padding: 12, background: COLORS.surface, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
              <div style={{ marginBottom: 10 }}>
                <Input value={rosterSearch} onChange={setRosterSearch} placeholder="🔍 Dodaj zawodnika..." />
                {searchResults.length > 0 && (
                  <div style={{ marginTop: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {searchResults.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, minHeight: 36, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}` }}
                        onClick={() => handleAddToRoster(p.id)}>
                        <span style={{ fontFamily: FONT, fontWeight: 800, color: COLORS.accent, fontSize: TOUCH.fontSm }}>#{p.number}</span>
                        <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>{p.nickname || p.name}</span>
                        <Icons.Plus />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {roster.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, marginBottom: 3, minHeight: 36 }}>
                  <span style={{ fontFamily: FONT, fontWeight: 800, color: COLORS.accent, fontSize: TOUCH.fontSm }}>#{p.number}</span>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>{p.name} {p.nickname && <span style={{ color: COLORS.textDim }}>„{p.nickname}"</span>}</span>
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
            <Btn variant="accent" size="sm" onClick={() => { setSelectedOpponent(''); setAddMatchModal(true); }}>
              <Icons.Plus /> Mecz
            </Btn>
          }>Mecze ({teamMatches.length})</SectionTitle>

          {!teamMatches.length && <EmptyState icon="📋" text="Dodaj mecz lub zaimportuj rozpiskę" />}

          {teamMatches.map(m => {
            const isA = m.teamA === scoutedId;
            const oppScoutedId = isA ? m.teamB : m.teamA;
            const oppEntry = scouted.find(s => s.id === oppScoutedId);
            const oppTeam = oppEntry ? teams.find(t => t.id === oppEntry.teamId) : null;
            return (
              <Card key={m.id} icon={<Icons.Target />}
                title={`vs ${oppTeam?.name || '?'}`}
                subtitle={m.date}
                onClick={() => navigate(`/tournament/${tournamentId}/match/${m.id}`)}
                actions={
                  <span onClick={e => e.stopPropagation()}>
                    <Btn variant="ghost" size="sm" onClick={() => handleDeleteMatch(m.id)}><Icons.Trash /></Btn>
                  </span>
                } />
            );
          })}
        </div>
      </div>

      {/* Add match modal */}
      <Modal open={addMatchModal} onClose={() => setAddMatchModal(false)} title="Nowy mecz"
        footer={<>
          <Btn variant="default" onClick={() => setAddMatchModal(false)}>Anuluj</Btn>
          <Btn variant="accent" onClick={handleAddMatch} disabled={!selectedOpponent}><Icons.Check /> Dodaj</Btn>
        </>}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: 8, fontWeight: 700 }}>Przeciwnik</div>
          <Select value={selectedOpponent} onChange={setSelectedOpponent} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
            <option value="">— wybierz —</option>
            {otherScouted.map(s => {
              const t = teams.find(x => x.id === s.teamId);
              return t ? <option key={s.id} value={s.id}>{t.name}</option> : null;
            })}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
