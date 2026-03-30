import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import HeatmapCanvas from '../components/HeatmapCanvas';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePlayers, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH } from '../utils/theme';
import { useWorkspace } from '../hooks/useWorkspace';
import { resolveField } from '../utils/helpers';

export default function ScoutedTeamPage() {
  const { tournamentId, scoutedId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { layouts } = useLayouts();
  const [rosterSearch, setRosterSearch] = useState('');
  const [showRoster, setShowRoster] = useState(false);
  const [addMatchModal, setAddMatchModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapType, setHeatmapType] = useState('positions');
  const [deleteMatchModal, setDeleteMatchModal] = useState(null); // { id, name }
  const [deleteMatchPassword, setDeleteMatchPassword] = useState('');
  const { workspace } = useWorkspace();

  const tournament = tournaments.find(t => t.id === tournamentId);
  const scoutedEntry = scouted.find(s => s.id === scoutedId);
  const team = teams.find(t => t.id === scoutedEntry?.teamId);
  const otherScouted = scouted.filter(s => s.id !== scoutedId);
  const teamMatches = matches.filter(m => m.teamA === scoutedId || m.teamB === scoutedId);
  const roster = (scoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  // Load tournament heatmap points — useEffect MUST be before any early return
  useEffect(() => {
    if (!teamMatches.length || !tournamentId) { setHeatmapPoints([]); return; }
    let cancelled = false;
    setHeatmapLoading(true);
    const matchIds = teamMatches.map(m => m.id);
    ds.fetchPointsForMatches(tournamentId, matchIds).then(pts => {
      if (cancelled) return;
      const teamPts = pts.map(pt => {
        const m = teamMatches.find(mm => mm.id === pt.matchId);
        if (!m) return null;
        const isA = m.teamA === scoutedId;
        const data = isA ? pt.teamA : pt.teamB;
        if (!data) return null;
        return { ...data, shots: ds.shotsFromFirestore(data.shots), outcome: pt.outcome };
      }).filter(Boolean);
      setHeatmapPoints(teamPts);
      setHeatmapLoading(false);
    }).catch(() => setHeatmapLoading(false));
    return () => { cancelled = true; };
  }, [teamMatches.length, tournamentId, scoutedId]);

  // NOW we can do early returns
  if (!tournament || !team) return <EmptyState icon="⏳" text="Loading..." />;

  const field = resolveField(tournament, layouts);

  const nonRosterPlayers = players.filter(p => !(scoutedEntry?.roster || []).includes(p.id));
  const searchResults = rosterSearch ? nonRosterPlayers.filter(p =>
    (p.name||'').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.nickname||'').toLowerCase().includes(rosterSearch.toLowerCase()) ||
    (p.number||'').includes(rosterSearch)
  ).slice(0, 8) : [];

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
              Tournament heatmap ({heatmapPoints.length} pts from {teamMatches.length} matches)
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <Btn variant="default" active={heatmapType==='positions'} size="sm" onClick={() => setHeatmapType('positions')}><Icons.Heat /> Positions</Btn>
              <Btn variant="default" active={heatmapType==='shooting'} size="sm" onClick={() => setHeatmapType('shooting')}><Icons.Target /> Shots</Btn>
            </div>
            {heatmapLoading ? (
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 20, textAlign: 'center' }}>Loading...</div>
            ) : (
              <HeatmapCanvas fieldImage={field.fieldImage} points={heatmapPoints} mode={heatmapType} rosterPlayers={roster} />
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
                <Input value={rosterSearch} onChange={setRosterSearch} placeholder="🔍 Search player..." />
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
              {!roster.length && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 6 }}>Empty roster</div>}
              {/* Quick add */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.border}30` }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Add new player:</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
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
              <Icons.Plus /> Match
            </Btn>
          }>Matches ({teamMatches.length})</SectionTitle>

          {!teamMatches.length && <EmptyState icon="📋" text="Add a match or import schedule" />}

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
            // Use simple string for title to avoid React child errors
            const scoreStr = hasScore ? ` ${myScore}:${oppScore} ${won ? 'W' : lost ? 'L' : 'D'}` : '';
            return (
              <Card key={m.id} icon={<Icons.Target />}
                title={`vs ${oppTeam?.name || '?'}${scoreStr}`}
                subtitle={[m.date, m.time].filter(Boolean).join(' · ')}
                badge={hasScore && (
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 800,
                    color: won ? COLORS.win : lost ? COLORS.loss : COLORS.textDim,
                    background: (won ? COLORS.win : lost ? COLORS.loss : COLORS.textDim) + '20',
                    padding: '1px 5px', borderRadius: 3 }}>
                    {won ? 'W' : lost ? 'L' : 'D'}
                  </span>
                )}
                onClick={() => navigate(`/tournament/${tournamentId}/match/${m.id}`)}
                actions={<span onClick={e => e.stopPropagation()}>
                  <Btn variant="ghost" size="sm" onClick={() => {
                    const oppName = oppTeam?.name || '?';
                    setDeleteMatchModal({ id: m.id, name: `vs ${oppName}` });
                    setDeleteMatchPassword('');
                  }}><Icons.Trash /></Btn>
                </span>} />
            );
          })}
        </div>
      </div>

      {/* Delete match — password protected */}
      <Modal open={!!deleteMatchModal} onClose={() => setDeleteMatchModal(null)} title="Delete match?"
        footer={<>
          <Btn variant="default" onClick={() => setDeleteMatchModal(null)}>Cancel</Btn>
          <Btn variant="danger"
            disabled={deleteMatchPassword !== workspace?.slug}
            onClick={async () => { await ds.deleteMatch(tournamentId, deleteMatchModal.id); setDeleteMatchModal(null); setDeleteMatchPassword(''); }}>
            <Icons.Trash /> Delete
          </Btn>
        </>}>
        <p style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.textDim, margin: '0 0 12px' }}>
          Delete <strong style={{ color: COLORS.text }}>{deleteMatchModal?.name}</strong>?
        </p>
        <Input value={deleteMatchPassword} onChange={setDeleteMatchPassword}
          placeholder="Enter workspace password to confirm..."
          style={{ borderColor: deleteMatchPassword && deleteMatchPassword !== workspace?.slug ? COLORS.danger : COLORS.border }} />
        {deleteMatchPassword && deleteMatchPassword !== workspace?.slug && (
          <p style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.danger, margin: '6px 0 0' }}>Incorrect password</p>
        )}
      </Modal>

      <Modal open={addMatchModal} onClose={() => setAddMatchModal(false)} title="New match"
        footer={<><Btn variant="default" onClick={() => setAddMatchModal(false)}>Cancel</Btn><Btn variant="accent" onClick={handleAddMatch} disabled={!selectedOpponent}><Icons.Check /> Add</Btn></>}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: 8, fontWeight: 700 }}>Opponent</div>
          <Select value={selectedOpponent} onChange={setSelectedOpponent} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
            <option value="">— select —</option>
            {otherScouted.map(s => { const t = teams.find(x => x.id === s.teamId); return t ? <option key={s.id} value={s.id}>{t.name}</option> : null; })}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
