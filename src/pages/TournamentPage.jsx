import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Btn, Card, SectionTitle, EmptyState, Modal, Icons, LeagueBadge } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT } from '../utils/theme';
import { compressImage } from '../utils/helpers';

export default function TournamentPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams: globalTeams } = useTeams();
  const { scouted, loading } = useScoutedTeams(tournamentId);
  const [deleteModal, setDeleteModal] = useState(null);
  const fileRef = useRef(null);

  const tournament = tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return <EmptyState icon="❓" text="Turniej nie znaleziony" />;

  const alreadyIds = scouted.map((s) => s.globalTeamId);
  const available = globalTeams.filter(
    (t) => t.leagues.includes(tournament.league) && !alreadyIds.includes(t.id)
  );

  const handleFieldUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 1000);
      await ds.updateTournament(tournamentId, { fieldImage: compressed });
    };
    reader.readAsDataURL(file);
  };

  const handleAddScouted = async (globalTeamId) => {
    await ds.addScoutedTeam(tournamentId, globalTeamId);
  };

  const handleRemoveScouted = async (scoutedId) => {
    await ds.removeScoutedTeam(tournamentId, scoutedId);
    setDeleteModal(null);
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name]} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <SectionTitle>
          {tournament.name} <LeagueBadge league={tournament.league} />
        </SectionTitle>

        {/* Field layout */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Layout pola
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFieldUpload} style={{ display: 'none' }} />
            <Btn variant="default" size="sm" onClick={() => fileRef.current?.click()}>
              <Icons.Image /> {tournament.fieldImage ? 'Zmień layout' : 'Załaduj layout'}
            </Btn>
            {tournament.fieldImage && (
              <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.success }}>✅ Załadowany</span>
            )}
          </div>
          {tournament.fieldImage && (
            <div style={{
              marginTop: 8, borderRadius: 8, overflow: 'hidden',
              border: `1px solid ${COLORS.border}`, maxHeight: 120,
            }}>
              <img src={tournament.fieldImage} alt="layout"
                style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 120 }} />
            </div>
          )}
        </div>

        {/* Add scouted teams */}
        <div>
          <SectionTitle>🏴 Scoutowane drużyny</SectionTitle>

          {available.length > 0 && (
            <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>
                Dodaj z bazy ({tournament.league}):
              </span>
              {available.map((t) => (
                <Btn key={t.id} variant="default" size="sm" onClick={() => handleAddScouted(t.id)}>
                  <Icons.Plus /> {t.name}
                </Btn>
              ))}
            </div>
          )}

          {available.length === 0 && scouted.length === 0 && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, padding: '8px 0' }}>
              Brak drużyn z ligą {tournament.league} w bazie.{' '}
              <span style={{ color: COLORS.accent, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => navigate('/teams')}>
                Dodaj drużynę
              </span>
            </div>
          )}

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}

          {scouted.map((st) => {
            const gt = globalTeams.find((g) => g.id === st.globalTeamId);
            if (!gt) return null;
            return (
              <Card key={st.id} icon="🏴" title={gt.name}
                subtitle={`${gt.players?.length || 0} zawodników`}
                onClick={() => navigate(`/tournament/${tournamentId}/team/${st.id}`)}
                actions={
                  <span onClick={(e) => e.stopPropagation()}>
                    <Btn variant="ghost" size="sm"
                      onClick={() => setDeleteModal({ id: st.id, name: gt.name })}>
                      <Icons.Trash />
                    </Btn>
                  </span>
                } />
            );
          })}
        </div>
      </div>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Usuń scouting?"
        footer={<>
          <Btn variant="default" size="sm" onClick={() => setDeleteModal(null)}>Anuluj</Btn>
          <Btn variant="danger" size="sm" onClick={() => handleRemoveScouted(deleteModal?.id)}>
            <Icons.Trash /> Usuń
          </Btn>
        </>}>
        <p style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, margin: 0 }}>
          Usunąć scouting <strong style={{ color: COLORS.text }}>{deleteModal?.name}</strong> z tego turnieju?
        </p>
      </Modal>
    </div>
  );
}
