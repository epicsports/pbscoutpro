import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import HeatmapCanvas from '../components/HeatmapCanvas';
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
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapType, setHeatmapType] = useState('positions');

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

  const teamMatches = matches.filter(m => m.teamA === scoutedId || m.teamB === scoutedId);

  // Load tournament heatmap points
  useEffect(() => {
    if (!teamMatches.length || !tournamentId) return;
    let cancelled = false;
    setHeatmapLoading(true);
    ds.fetchPointsForMatches(tournamentId, teamMatches.map(m => m.id)).then(pts => {
      if (cancelled) return;
      // Extract this team's data from each point
      const teamPoints = pts.map(pt => {
        const m = teamMatches.find(mm => mm.id === pt.matchId);
        if (!m) return null;
        const isA = m.teamA === scoutedId;
        const data = isA ? pt.teamA : pt.teamB;
        if (!data) return null;
        return { ...data, shots: ds.shotsFromFirestore(data.shots), outcome: pt.outcome };
      }).filter(Boolean);
      setHeatmapPoints(teamPoints);
      setHeatmapLoading(false);
    }).catch(() => setHeatmapLoading(false));
    return () => { cancelled = true; };
  }, [teamMatches.length, tournamentId, scoutedId]);

  const handleAddMatch = async () => {
    if (!selectedOpponent) return;
    const oppEntry = scouted.find(s => s.id === selectedOpponent);
    const oppTeam = oppEntry ? teams.find(t => t.id === oppEntry.teamId) : null;
    await ds.addMatch(tournamentId, {
      teamA: scoutedId, teamB: selectedOpponent,
      name: `${team.name} vs ${oppTeam?.name || '?'}`,
    });
    setAddMatchModal(false); setSelectedOpponent('');
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
      <Header breadcrumbs={[{label: tournament.name, path: `/tournament/${tournamentId}`}, team.name]} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionTitle>{team.name}</SectionTitle>

        {/* Tournament heatmap */}
        {teamMatches.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Heatmapa turniejowa ({heatmapPoints.length} punktów z {teamMatches.length} meczy)
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <Btn variant="default" active={heatmapType==='positions'} size="sm" onClick={() => setHeatmapType('positions')}><Icons.Heat /> Pozycje</Btn>
              <Btn variant="default" active={heatmapType==='shooting'} size="sm" onClick={() => setHeatmapType('shooting')}><Icons.Target /> Strzały</Btn>
            </div>
            {heatmapLoading ? (
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 20, textAlign: 'center' }}>Ładowanie punktów...</div>
            ) : (
              <HeatmapCanvas fieldImage={tournament.fieldImage} points={heatmapPoints} mode={heatmapType} rosterPlayers={roster} />
            )}
          </div>
        )}

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

              {/* Quick add */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.border}30` }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Dodaj nowego:</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Imię Nazwisko"
                    style={{ flex: 2, fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 10px', borderRadius: 6, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, minHeight: 36 }} />
                  <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="#"
                    style={{ width: 50, fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 8px', borderRadius: 6, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, minHeight: 36, textAlign: 'center' }} />
                  <Btn variant="accent" size="sm" disabled={!newName.trim()} onClick={async () => {
                    const ref = await ds.addPlayer({ name: newName.trim(), number: newNumber.trim(), teamId: team.id });
                    const nr = [...(scoutedEntry?.roster || []), ref.id];
                    await ds.updateScoutedTeam(tournamentId, scoutedId, { roster: nr });
                    setNewName(''); setNewNumber('');
                  }}><Icons.Plus /></Btn>
                </div>
              </div>
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
            const sA = m.scoreA || 0, sB = m.scoreB || 0;
            const myScore = isA ? sA : sB;
            const oppScore = isA ? sB : sA;
            const hasScore = sA > 0 || sB > 0;
            const won = myScore > oppScore;
            const lost = myScore < oppScore;
            return (
              <Card key={m.id} icon={<Icons.Target />}
                title={<span>vs {oppTeam?.name || '?'} {hasScore && (
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800, marginLeft: 6,
                    color: won ? COLORS.win : lost ? COLORS.loss : COLORS.textDim }}>
                    {myScore}:{oppScore} {won ? 'W' : lost ? 'L' : 'D'}
                  </span>
                )}</span>}
                subtitle={[m.date, m.time].filter(Boolean).join(' · ')}
                onClick={() => navigate(`/tournament/${tournamentId}/match/${m.id}`)}
                actions={<span onClick={e => e.stopPropagation()}><Btn variant="ghost" size="sm" onClick={() => ds.deleteMatch(tournamentId, m.id)}><Icons.Trash /></Btn></span>} />
            );
          })}
        </div>
      </div>

      <Modal open={addMatchModal} onClose={() => setAddMatchModal(false)} title="Nowy mecz"
        footer={<><Btn variant="default" onClick={() => setAddMatchModal(false)}>Anuluj</Btn><Btn variant="accent" onClick={handleAddMatch} disabled={!selectedOpponent}><Icons.Check /> Dodaj</Btn></>}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: 8, fontWeight: 700 }}>Przeciwnik</div>
          <Select value={selectedOpponent} onChange={setSelectedOpponent} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
            <option value="">— wybierz —</option>
            {otherScouted.map(s => { const t = teams.find(x => x.id === s.teamId); return t ? <option key={s.id} value={s.id}>{t.name}</option> : null; })}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
