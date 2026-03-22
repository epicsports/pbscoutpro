import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import HeatmapCanvas from '../components/HeatmapCanvas';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Icons } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT } from '../utils/theme';
import { matchScore } from '../utils/helpers';

export default function ScoutedTeamPage() {
  const { tournamentId, scoutedId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams: globalTeams } = useTeams();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches, loading } = useMatches(tournamentId, scoutedId);
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [heatmap, setHeatmap] = useState(null); // { type: 'positions'|'shooting' }

  const tournament = tournaments.find((t) => t.id === tournamentId);
  const scoutedEntry = scouted.find((s) => s.id === scoutedId);
  const globalTeam = globalTeams.find((g) => g.id === scoutedEntry?.globalTeamId);

  if (!tournament || !globalTeam) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const handleAddMatch = async () => {
    if (!name.trim()) return;
    const ref = await ds.addMatch(tournamentId, scoutedId, { name: name.trim() });
    setModal(null); setName('');
    navigate(`/tournament/${tournamentId}/team/${scoutedId}/match/${ref.id}`);
  };

  const handleDeleteMatch = async (matchId) => {
    await ds.deleteMatch(tournamentId, scoutedId, matchId);
    setModal(null);
  };

  // For heatmap we need all points from all matches — we'll collect from subscriptions
  // Since we can't easily do multi-match point aggregation with real-time subs,
  // the heatmap will be available per-match (in scouting page) and we show a note here.

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name, globalTeam.name]} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionTitle>{globalTeam.name}</SectionTitle>

        {/* Matches */}
        <div>
          <SectionTitle right={
            <Btn variant="accent" size="sm" onClick={() => { setName(''); setModal('addMatch'); }}>
              <Icons.Plus /> Mecz
            </Btn>
          }>
            Mecze
          </SectionTitle>

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}
          {!loading && !matches.length && <EmptyState icon="📋" text="Dodaj mecz" />}

          {matches.map((m) => (
            <Card key={m.id} icon={<Icons.Target />} title={m.name}
              subtitle={m.date}
              onClick={() => navigate(`/tournament/${tournamentId}/team/${scoutedId}/match/${m.id}`)}
              actions={
                <span onClick={(e) => e.stopPropagation()}>
                  <Btn variant="ghost" size="sm"
                    onClick={() => setModal({ type: 'delete', id: m.id, name: m.name })}>
                    <Icons.Trash />
                  </Btn>
                </span>
              } />
          ))}
        </div>

        {/* Info about roster */}
        <div style={{
          padding: '8px 10px', borderRadius: 6, background: COLORS.surfaceLight,
          border: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 10, color: COLORS.textDim,
        }}>
          <strong style={{ color: COLORS.text }}>Skład:</strong>{' '}
          {globalTeam.players?.length
            ? globalTeam.players.map((p) =>
                `#${p.number} ${p.nickname || p.name}`
              ).join(', ')
            : 'Brak zawodników — dodaj w Bazie drużyn'}
        </div>
      </div>

      {/* Add match modal */}
      <Modal open={modal === 'addMatch'} onClose={() => setModal(null)} title="Nowy mecz"
        footer={<>
          <Btn variant="default" size="sm" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="accent" size="sm" onClick={handleAddMatch} disabled={!name.trim()}>
            <Icons.Check /> Dodaj
          </Btn>
        </>}>
        <Input value={name} onChange={setName} placeholder="Nazwa meczu..."
          onKeyDown={(e) => e.key === 'Enter' && handleAddMatch()} autoFocus />
      </Modal>

      {/* Delete match modal */}
      <Modal open={!!modal?.type} onClose={() => setModal(null)} title="Usuń mecz?"
        footer={<>
          <Btn variant="default" size="sm" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="danger" size="sm" onClick={() => handleDeleteMatch(modal?.id)}>
            <Icons.Trash /> Usuń
          </Btn>
        </>}>
        <p style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, margin: 0 }}>
          Usunąć <strong style={{ color: COLORS.text }}>{modal?.name}</strong> i wszystkie punkty?
        </p>
      </Modal>
    </div>
  );
}
