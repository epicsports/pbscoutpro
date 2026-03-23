import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ScheduleImport from '../components/ScheduleImport';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, usePlayers } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS } from '../utils/theme';
import { compressImage, yearOptions } from '../utils/helpers';

// ─── Roster parser ───
function parseRoster(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result = [];
  for (const line of lines) {
    const cols = line.split(/\t+/).map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      const numCol = cols.find(c => c.match(/^\d{1,3}$/));
      const nameCol = cols.find(c => !c.match(/^\d{1,3}$/) && c.length > 1);
      if (numCol && nameCol) { result.push({ number: numCol, name: nameCol }); continue; }
    }
    const m1 = line.match(/^(\d{1,3})\s+(.+)/);
    if (m1) { result.push({ number: m1[1], name: m1[2] }); continue; }
    const m2 = line.match(/(.+?)\s+(\d{1,3})$/);
    if (m2) { result.push({ number: m2[2], name: m2[1] }); continue; }
    if (line.length > 2) result.push({ number: '', name: line });
  }
  return result;
}

export default function TournamentPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted, loading } = useScoutedTeams(tournamentId);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [eName, setEName] = useState('');
  const [eLeague, setELeague] = useState('');
  const [eYear, setEYear] = useState('');
  const fileRef = useRef(null);

  // Schedule & roster import
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rosterModal, setRosterModal] = useState(null);
  const [rosterText, setRosterText] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState([]);

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

  const handleRemoveScouted = async (sid) => {
    await ds.removeScoutedTeam(tournamentId, sid);
    setDeleteModal(null);
  };

  const openEdit = () => {
    setEName(tournament.name); setELeague(tournament.league); setEYear(tournament.year || 2026);
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    await ds.updateTournament(tournamentId, { name: eName.trim(), league: eLeague, year: Number(eYear) });
    setEditModal(false);
  };

  const handleParseRoster = () => setParsedPlayers(parseRoster(rosterText));

  const handleImportRoster = async () => {
    if (!rosterModal) return;
    const scoutedEntry = scouted.find(s => s.id === rosterModal);
    const teamId = scoutedEntry?.teamId;
    const newRoster = [...(scoutedEntry?.roster || [])];
    for (const p of parsedPlayers) {
      if (!p.name) continue;
      const existing = players.find(ep =>
        ep.name.toLowerCase() === p.name.toLowerCase() ||
        (ep.number === p.number && ep.number)
      );
      if (existing) {
        if (!newRoster.includes(existing.id)) newRoster.push(existing.id);
        if (teamId && existing.teamId !== teamId) await ds.changePlayerTeam(existing.id, teamId, existing.teamHistory || []);
      } else {
        const ref = await ds.addPlayer({ name: p.name, number: p.number, teamId });
        newRoster.push(ref.id);
      }
    }
    await ds.updateScoutedTeam(tournamentId, rosterModal, { roster: newRoster });
    setRosterModal(null); setRosterText(''); setParsedPlayers([]);
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name]} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <SectionTitle>
            {tournament.name} <LeagueBadge league={tournament.league} /> <YearBadge year={tournament.year} />
          </SectionTitle>
          <Btn variant="ghost" size="sm" onClick={openEdit}><Icons.Edit /> Edytuj</Btn>
        </div>

        {/* Tournament meta — show if available */}
        {(tournament.location || tournament.date || tournament.division || tournament.rules) && (
          <div style={{ padding: 10, background: COLORS.surfaceLight, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
            {tournament.division && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, fontWeight: 600 }}>{tournament.division}</div>}
            {tournament.location && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📍 {tournament.location}</div>}
            {tournament.date && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📅 {tournament.date}</div>}
            {tournament.rules && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📋 {tournament.rules}</div>}
          </div>
        )}

        {/* Field layout */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Layout pola
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFieldUpload} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()}>
              <Icons.Image /> {tournament.fieldImage ? 'Zmień layout' : 'Załaduj layout'}
            </Btn>
            {tournament.fieldImage && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.success }}>✅ Załadowany</span>}
          </div>
          {tournament.fieldImage && (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
              <img src={tournament.fieldImage} alt="Field layout" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 400 }} />
            </div>
          )}
        </div>

        {/* Scouted teams */}
        <div>
          <SectionTitle right={
            <Btn variant="accent" size="sm" onClick={() => setScheduleOpen(true)}>📷 Import rozpiski</Btn>
          }>🏴 Scoutowane drużyny</SectionTitle>

          {available.length > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>Dodaj drużynę do scoutowania:</span>
              {available.slice(0, 10).map(t => (
                <Btn key={t.id} variant="default" size="sm" onClick={() => handleAddScouted(t.id)}>
                  <Icons.Plus /> {t.name}
                </Btn>
              ))}
            </div>
          )}

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}

          {scouted.map(st => {
            const gt = teams.find(g => g.id === st.teamId);
            if (!gt) return null;
            const rosterCount = (st.roster || []).length;
            return (
              <Card key={st.id} icon="🏴" title={gt.name}
                subtitle={`${rosterCount} zawodników w rosterze`}
                onClick={() => navigate(`/tournament/${tournamentId}/team/${st.id}`)}
                actions={
                  <span onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 2 }}>
                    <Btn variant="ghost" size="sm" onClick={() => { setRosterText(''); setParsedPlayers([]); setRosterModal(st.id); }} title="Import rostera">📋</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => setDeleteModal({ id: st.id, name: gt.name })}><Icons.Trash /></Btn>
                  </span>
                } />
            );
          })}
        </div>
      </div>

      {/* Schedule import (OCR) */}
      <ScheduleImport open={scheduleOpen} onClose={() => setScheduleOpen(false)}
        tournament={tournament} teams={teams} scouted={scouted} players={players}
        ds={ds} tournamentId={tournamentId} />

      {/* Roster import */}
      <Modal open={!!rosterModal} onClose={() => { setRosterModal(null); setParsedPlayers([]); }}
        title={`📋 Import rostera — ${teams.find(t => t.id === scouted.find(s => s.id === rosterModal)?.teamId)?.name || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
            Wklej listę zawodników. Format: "42 Jan Kowalski" lub tab-separated.
          </div>
          <textarea value={rosterText} onChange={e => setRosterText(e.target.value)}
            placeholder={"42\tJan Kowalski\n7\tAdam Nowak"} rows={6}
            style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, padding: 10, borderRadius: 8, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, resize: 'vertical', width: '100%' }} />
          <Btn variant="default" onClick={handleParseRoster} disabled={!rosterText.trim()}>🔍 Parsuj</Btn>
          {parsedPlayers.length > 0 && (
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.accent, fontWeight: 700, marginBottom: 6 }}>
                Znaleziono {parsedPlayers.length} zawodników:
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {parsedPlayers.map((p, i) => {
                  const existing = players.find(ep => ep.name.toLowerCase() === p.name.toLowerCase() || (ep.number === p.number && ep.number));
                  return (
                    <div key={i} style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '4px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: COLORS.accent, fontWeight: 800, minWidth: 28 }}>#{p.number || '?'}</span>
                      <span style={{ color: COLORS.text }}>{p.name}</span>
                      {existing ? <span style={{ fontSize: 9, color: COLORS.success }}>✅ istniejący</span> : <span style={{ fontSize: 9, color: COLORS.textMuted }}>nowy</span>}
                    </div>
                  );
                })}
              </div>
              <Btn variant="accent" onClick={handleImportRoster} style={{ width: '100%', justifyContent: 'center', marginTop: 8, minHeight: 44 }}>
                <Icons.Check /> Importuj {parsedPlayers.length} zawodników
              </Btn>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit tournament */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edytuj turniej"
        footer={<>
          <Btn variant="default" onClick={() => setEditModal(false)}>Anuluj</Btn>
          <Btn variant="accent" onClick={handleSaveEdit} disabled={!eName.trim()}><Icons.Check /> Zapisz</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={eName} onChange={setEName} placeholder="Nazwa turnieju" autoFocus />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Liga</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map(l => (
                  <Btn key={l} variant="default" size="sm" active={eLeague === l}
                    style={{ borderColor: eLeague === l ? LEAGUE_COLORS[l] : COLORS.border, color: eLeague === l ? LEAGUE_COLORS[l] : COLORS.textDim }}
                    onClick={() => setELeague(l)}>{l}</Btn>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Rok</div>
              <Select value={eYear} onChange={v => setEYear(Number(v))}>
                {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete scouted */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Usuń scouting?"
        footer={<>
          <Btn variant="default" onClick={() => setDeleteModal(null)}>Anuluj</Btn>
          <Btn variant="danger" onClick={() => handleRemoveScouted(deleteModal?.id)}><Icons.Trash /> Usuń</Btn>
        </>}>
        <p style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.textDim, margin: 0 }}>
          Usunąć <strong style={{ color: COLORS.text }}>{deleteModal?.name}</strong>?
        </p>
      </Modal>
    </div>
  );
}
