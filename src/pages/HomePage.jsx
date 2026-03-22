import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Icons, LeagueBadge } from '../components/ui';
import { useTournaments, useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, LEAGUES, LEAGUE_COLORS } from '../utils/theme';

export default function HomePage({ onLogout, workspaceName }) {
  const navigate = useNavigate();
  const { tournaments, loading: tLoading } = useTournaments();
  const { teams } = useTeams();
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');

  const handleAddTournament = async () => {
    if (!name.trim()) return;
    await ds.addTournament({ name: name.trim(), league });
    setModal(null);
    setName('');
  };

  const handleDelete = async (id) => {
    await ds.deleteTournament(id);
    setModal(null);
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header row */}
        <div>
          <SectionTitle right={
            <Btn variant="accent" size="sm" onClick={() => navigate('/teams')}>
              <Icons.DB /> Baza drużyn ({teams.length})
            </Btn>
          }>
            🎯 Paintball Scout
          </SectionTitle>
        </div>

        {/* Tournaments */}
        <div>
          <SectionTitle right={
            <Btn variant="accent" size="sm" onClick={() => { setName(''); setLeague('NXL'); setModal('add'); }}>
              <Icons.Plus /> Turniej
            </Btn>
          }>
            <Icons.Trophy /> Turnieje
          </SectionTitle>

          {tLoading && <EmptyState icon="⏳" text="Ładowanie..." />}
          {!tLoading && !tournaments.length && <EmptyState icon="🏆" text="Dodaj turniej, np. NXL Tampa 2026" />}

          {tournaments.map((t) => (
            <Card key={t.id} icon={<Icons.Trophy />} title={t.name}
              badge={<LeagueBadge league={t.league} />}
              subtitle={`${t.fieldImage ? '✅ layout' : '❌ brak layoutu'}`}
              onClick={() => navigate(`/tournament/${t.id}`)}
              actions={
                <span style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
                  <Btn variant="ghost" size="sm" onClick={() => setModal({ type: 'delete', id: t.id, name: t.name })}>
                    <Icons.Trash />
                  </Btn>
                </span>
              } />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>
            <span style={{ color: COLORS.accent, fontWeight: 700 }}>🔒 {workspaceName}</span>
            <span style={{ marginLeft: 6 }}>· real-time sync</span>
          </div>
          <Btn variant="ghost" size="sm" style={{ color: COLORS.danger + '90' }} onClick={onLogout}>
            Wyloguj
          </Btn>
        </div>
      </div>

      {/* Add tournament modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Nowy turniej"
        footer={<>
          <Btn variant="default" size="sm" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="accent" size="sm" onClick={handleAddTournament} disabled={!name.trim()}>
            <Icons.Check /> Dodaj
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input value={name} onChange={setName} placeholder="NXL Tampa 2026..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddTournament()} autoFocus />
          <div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, marginBottom: 4 }}>Liga</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {LEAGUES.map((l) => (
                <Btn key={l} variant="default" size="sm" active={league === l}
                  style={{ borderColor: league === l ? LEAGUE_COLORS[l] : COLORS.border, color: league === l ? LEAGUE_COLORS[l] : COLORS.textDim }}
                  onClick={() => setLeague(l)}>{l}</Btn>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!modal?.type} onClose={() => setModal(null)}
        title={`Usuń turniej?`}
        footer={<>
          <Btn variant="default" size="sm" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="danger" size="sm" onClick={() => handleDelete(modal?.id)}>
            <Icons.Trash /> Usuń
          </Btn>
        </>}>
        <p style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, margin: 0 }}>
          Usunąć <strong style={{ color: COLORS.text }}>{modal?.name}</strong> i wszystkie dane?
        </p>
      </Modal>
    </div>
  );
}
