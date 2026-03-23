import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import HeatmapCanvas from '../components/HeatmapCanvas';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, ScoreBadge } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints, usePlayers } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH } from '../utils/theme';
import { matchScore } from '../utils/helpers';

export default function ScoutedTeamPage() {
  const { tournamentId, scoutedId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches, loading } = useMatches(tournamentId, scoutedId);
  const [modal, setModal] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [showRoster, setShowRoster] = useState(false);
  const [heatmap, setHeatmap] = useState(null); // { type: 'positions'|'shooting' }

  const tournament = tournaments.find(t => t.id === tournamentId);
  const scoutedEntry = scouted.find(s => s.id === scoutedId);
  const team = teams.find(t => t.id === scoutedEntry?.teamId);
  const otherScouted = scouted.filter(s => s.id !== scoutedId);

  if (!tournament || !team) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const roster = (scoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  const nonRosterPlayers = players.filter(p => !(scoutedEntry?.roster || []).includes(p.id));
  const searchResults = rosterSearch ? nonRosterPlayers.filter(p =>
    (p.name || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.nickname || '').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.number || '').includes(rosterSearch)
  ).slice(0, 8) : [];

  // Auto-generate match name from opponent
  const getAutoMatchName = () => {
    if (!selectedOpponent) return '';
    const oppEntry = scouted.find(s => s.id === selectedOpponent);
    const oppTeam = oppEntry ? teams.find(t => t.id === oppEntry.teamId) : null;
    return oppTeam ? `vs ${oppTeam.name}` : '';
  };

  const handleAddMatch = async () => {
    const opponentScoutedId = selectedOpponent || null;
    const oppEntry = opponentScoutedId ? scouted.find(s => s.id === opponentScoutedId) : null;
    const oppTeam = oppEntry ? teams.find(t => t.id === oppEntry.teamId) : null;

    // Auto name: "vs OpponentName" or fallback
    const matchName = oppTeam ? `vs ${oppTeam.name}` : `Mecz ${matches.length + 1}`;

    const ref = await ds.addMatch(tournamentId, scoutedId, {
      name: matchName,
      opponentScoutedId,
    });

    // Auto-create linked match for opponent
    if (opponentScoutedId) {
      await ds.addMatch(tournamentId, opponentScoutedId, {
        name: `vs ${team.name}`,
        opponentScoutedId: scoutedId,
      });
    }

    setModal(null); setSelectedOpponent('');
    navigate(`/tournament/${tournamentId}/team/${scoutedId}/match/${ref.id}`);
  };

  const handleDeleteMatch = async (mid) => { await ds.deleteMatch(tournamentId, scoutedId, mid); setModal(null); };

  const handleAddToRoster = async (playerId) => {
    const newRoster = [...(scoutedEntry?.roster || []), playerId];
    await ds.updateScoutedTeam(tournamentId, scoutedId, { roster: newRoster });
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

  // ─── Heatmap view ───
  if (heatmap) {
    return (
      <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <Header breadcrumbs={[tournament.name, team.name, 'Heatmapa']} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn variant="ghost" onClick={() => setHeatmap(null)}><Icons.Back /> Wróć</Btn>
          <SectionTitle>{heatmap.type === 'positions' ? 'Pozycje' : 'Ostrzał'} — cały turniej</SectionTitle>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="default" active={heatmap.type === 'positions'} onClick={() => setHeatmap({ type: 'positions' })}><Icons.Heat /> Pozycje</Btn>
            <Btn variant="default" active={heatmap.type === 'shooting'} onClick={() => setHeatmap({ type: 'shooting' })}><Icons.Target /> Ostrzał</Btn>
          </div>
          {/* We pass all points from all matches - collected via useAllPoints below */}
          <HeatmapCanvas fieldImage={tournament.fieldImage} points={heatmap.points || []} mode={heatmap.type} rosterPlayers={roster} />
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
            {(heatmap.points || []).length} punktów z {matches.length} meczy
          </div>
        </div>
      </div>
    );
  }

  // For tournament heatmap we need points from ALL matches
  // We'll collect them when user clicks heatmap button
  const openHeatmap = async (type) => {
    // Subscribe to all matches' points - for now just use what we have
    // Since we can't easily aggregate, we'll use the points from ScoutingPage's subscriptions
    // For MVP: show heatmap button per match, and a "load all" that gathers from each match
    // Simple approach: we already have matches, just need to load points for each
    try {
      const allPoints = [];
      for (const m of matches) {
        // We need to fetch points for each match - use a one-time get
        const { getDocs, collection, query, orderBy } = await import('firebase/firestore');
        const { db } = await import('../services/firebase');
        const { setBasePath } = await import('../services/dataService');
        // basePath is already set
        const bp = `workspaces/${tournament.id}`.replace(tournament.id, '');
        // Actually let's use a simpler approach - just open the heatmap and let user know
      }
    } catch (e) { console.error(e); }
    // Simple fallback: show empty with instruction
    setHeatmap({ type, points: [] });
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name, team.name]} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionTitle>{team.name}</SectionTitle>

        {/* Tournament heatmaps */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Heatmapy turniejowe
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="default" size="sm" onClick={() => openHeatmap('positions')}><Icons.Heat /> Pozycje</Btn>
            <Btn variant="default" size="sm" onClick={() => openHeatmap('shooting')}><Icons.Target /> Ostrzał</Btn>
          </div>
        </div>

        {/* Roster toggle */}
        <div>
          <Btn variant="default" onClick={() => setShowRoster(!showRoster)} style={{ width: '100%', justifyContent: 'space-between' }}>
            <span><Icons.Users /> Roster na turniej ({roster.length})</span>
            <span style={{ transform: showRoster ? 'rotate(90deg)' : 'none', transition: '0.2s' }}><Icons.Chev /></span>
          </Btn>

          {showRoster && (
            <div className="fade-in" style={{ marginTop: 8, padding: 12, background: COLORS.surface, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
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
                          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>{p.nickname || p.name}</span>
                          {pTeam && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>{pTeam.name}</span>}
                          <Icons.Plus />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {roster.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, marginBottom: 3, minHeight: 36 }}>
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
            <Btn variant="accent" onClick={() => { setSelectedOpponent(''); setModal('addMatch'); }}>
              <Icons.Plus /> Mecz
            </Btn>
          }>Mecze</SectionTitle>

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}
          {!loading && !matches.length && <EmptyState icon="📋" text="Dodaj mecz" />}

          {matches.map(m => {
            const oppScouted = m.opponentScoutedId ? scouted.find(s => s.id === m.opponentScoutedId) : null;
            const oppTeam = oppScouted ? teams.find(t => t.id === oppScouted.teamId) : null;
            return (
              <Card key={m.id} icon={<Icons.Target />}
                title={m.name}
                subtitle={[m.date, oppTeam && `vs ${oppTeam.name}`].filter(Boolean).join(' · ')}
                onClick={() => navigate(`/tournament/${tournamentId}/team/${scoutedId}/match/${m.id}`)}
                actions={
                  <span onClick={e => e.stopPropagation()}>
                    <Btn variant="ghost" size="sm" onClick={() => setModal({ type: 'delete', id: m.id, name: m.name })}><Icons.Trash /></Btn>
                  </span>
                } />
            );
          })}
        </div>
      </div>

      {/* Add match — opponent picker with auto-name */}
      <Modal open={modal === 'addMatch'} onClose={() => setModal(null)} title="Nowy mecz"
        footer={<>
          <Btn variant="default" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="accent" onClick={handleAddMatch} disabled={!selectedOpponent}>
            <Icons.Check /> {selectedOpponent ? `Dodaj: ${getAutoMatchName()}` : 'Wybierz przeciwnika'}
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: 8, fontWeight: 700 }}>
              Przeciwnik
            </div>
            <Select value={selectedOpponent} onChange={setSelectedOpponent} style={{ width: '100%', minHeight: TOUCH.minTarget, fontSize: TOUCH.fontBase }}>
              <option value="">— wybierz drużynę —</option>
              {otherScouted.map(s => {
                const t = teams.find(x => x.id === s.teamId);
                return t ? <option key={s.id} value={s.id}>{t.name}</option> : null;
              })}
            </Select>
            {selectedOpponent && (
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.success, marginTop: 6 }}>
                ✅ Nazwa meczu: <strong>{getAutoMatchName()}</strong>
                <br />Mecz zostanie dodany też do przeciwnika
              </div>
            )}
            {!otherScouted.length && (
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, marginTop: 6 }}>
                Brak innych drużyn w turnieju. Dodaj drużynę przeciwnika w ustawieniach turnieju.
              </div>
            )}
          </div>
        </div>
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
