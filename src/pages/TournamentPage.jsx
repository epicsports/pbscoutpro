import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ScheduleImport from '../components/ScheduleImport';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePlayers } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS } from '../utils/theme';
import { compressImage, yearOptions } from '../utils/helpers';

export default function TournamentPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted, loading } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [eName, setEName] = useState('');
  const [eLeague, setELeague] = useState('');
  const [eYear, setEYear] = useState('');
  const fileRef = useRef(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const tournament = tournaments.find(t => t.id === tournamentId);
  if (!tournament) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const alreadyIds = scouted.map(s => s.teamId);
  const available = teams.filter(t => !alreadyIds.includes(t.id));

  const handleFieldUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 1200);
      await ds.updateTournament(tournamentId, { fieldImage: compressed });
    };
    reader.readAsDataURL(file);
  };

  const handleAddScouted = async (teamId) => {
    const teamRoster = players.filter(p => p.teamId === teamId).map(p => p.id);
    await ds.addScoutedTeam(tournamentId, { teamId, roster: teamRoster });
  };

  const handleRemoveScouted = async (sid) => { await ds.removeScoutedTeam(tournamentId, sid); setDeleteModal(null); };

  const openEdit = () => { setEName(tournament.name); setELeague(tournament.league); setEYear(tournament.year || 2026); setEditModal(true); };
  const handleSaveEdit = async () => { await ds.updateTournament(tournamentId, { name: eName.trim(), league: eLeague, year: Number(eYear) }); setEditModal(false); };

  // Resolve team names for matches
  const getTeamName = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    const t = s ? teams.find(x => x.id === s.teamId) : null;
    return t?.name || '?';
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name]} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <SectionTitle>{tournament.name} <LeagueBadge league={tournament.league} /> <YearBadge year={tournament.year} /></SectionTitle>
          <Btn variant="ghost" size="sm" onClick={openEdit}><Icons.Edit /> Edytuj</Btn>
        </div>

        {(tournament.location || tournament.date || tournament.division || tournament.rules) && (
          <div style={{ padding: 10, background: COLORS.surfaceLight, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
            {tournament.division && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, fontWeight: 600 }}>{tournament.division}</div>}
            {tournament.location && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📍 {tournament.location}</div>}
            {tournament.date && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📅 {tournament.date}</div>}
            {tournament.rules && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📋 {tournament.rules}</div>}
          </div>
        )}

        {/* Field */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Layout pola</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFieldUpload} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()}><Icons.Image /> {tournament.fieldImage ? 'Zmień' : 'Załaduj layout'}</Btn>
            {tournament.fieldImage && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.success }}>✅</span>}
          </div>
          {tournament.fieldImage && (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
              <img src={tournament.fieldImage} alt="Field" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 300 }} />
            </div>
          )}
        </div>

        {/* Scouted teams */}
        <div>
          <SectionTitle right={<Btn variant="accent" size="sm" onClick={() => setScheduleOpen(true)}>📷 Import</Btn>}>
            🏴 Drużyny ({scouted.length})
          </SectionTitle>

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}

          {scouted.map(st => {
            const gt = teams.find(g => g.id === st.teamId);
            if (!gt) return null;
            return (
              <Card key={st.id} icon="🏴" title={gt.name}
                subtitle={`${(st.roster||[]).length} zawodników`}
                onClick={() => navigate(`/tournament/${tournamentId}/team/${st.id}`)}
                actions={<span onClick={e => e.stopPropagation()}><Btn variant="ghost" size="sm" onClick={() => setDeleteModal({ id: st.id, name: gt.name })}><Icons.Trash /></Btn></span>} />
            );
          })}

          {available.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>Dodaj:</span>
              {available.slice(0, 10).map(t => (
                <Btn key={t.id} variant="default" size="sm" onClick={() => handleAddScouted(t.id)}><Icons.Plus /> {t.name}</Btn>
              ))}
            </div>
          )}
        </div>

        {/* All matches */}
        <div>
          <SectionTitle>⚔️ Mecze ({matches.length})</SectionTitle>
          {!matches.length && <EmptyState icon="📋" text="Dodaj mecze z rozpiski lub z poziomu drużyny" />}
          {matches.map(m => (
            <Card key={m.id} icon={<Icons.Target />}
              title={`${getTeamName(m.teamA)} vs ${getTeamName(m.teamB)}`}
              subtitle={[m.date, m.time].filter(Boolean).join(' · ')}
              onClick={() => navigate(`/tournament/${tournamentId}/match/${m.id}`)}
              actions={<span onClick={e => e.stopPropagation()}><Btn variant="ghost" size="sm" onClick={() => ds.deleteMatch(tournamentId, m.id)}><Icons.Trash /></Btn></span>} />
          ))}
        </div>
      </div>

      <ScheduleImport open={scheduleOpen} onClose={() => setScheduleOpen(false)}
        tournament={tournament} teams={teams} scouted={scouted} players={players}
        ds={ds} tournamentId={tournamentId} />

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edytuj turniej"
        footer={<><Btn variant="default" onClick={() => setEditModal(false)}>Anuluj</Btn><Btn variant="accent" onClick={handleSaveEdit} disabled={!eName.trim()}><Icons.Check /> Zapisz</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={eName} onChange={setEName} placeholder="Nazwa turnieju" autoFocus />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Liga</div>
              <div style={{ display: 'flex', gap: 6 }}>{LEAGUES.map(l => (<Btn key={l} variant="default" size="sm" active={eLeague===l} style={{ borderColor: eLeague===l?LEAGUE_COLORS[l]:COLORS.border, color: eLeague===l?LEAGUE_COLORS[l]:COLORS.textDim }} onClick={() => setELeague(l)}>{l}</Btn>))}</div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Rok</div>
              <Select value={eYear} onChange={v => setEYear(Number(v))}>{yearOptions().map(y => <option key={y} value={y}>{y}</option>)}</Select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Usuń?"
        footer={<><Btn variant="default" onClick={() => setDeleteModal(null)}>Anuluj</Btn><Btn variant="danger" onClick={() => handleRemoveScouted(deleteModal?.id)}><Icons.Trash /> Usuń</Btn></>}>
        <p style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.textDim, margin: 0 }}>Usunąć <strong style={{ color: COLORS.text }}>{deleteModal?.name}</strong>?</p>
      </Modal>
    </div>
  );
}
