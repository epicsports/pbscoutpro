import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Icons, LeagueBadge } from '../components/ui';
import { useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, LEAGUES, LEAGUE_COLORS } from '../utils/theme';

export default function TeamsPage() {
  const navigate = useNavigate();
  const { teams, loading } = useTeams();
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [leagues, setLeagues] = useState([]);
  const [editId, setEditId] = useState(null);

  // Player form
  const [pName, setPName] = useState('');
  const [pNick, setPNick] = useState('');
  const [pNumber, setPNumber] = useState('');

  const editingTeam = editId ? teams.find((t) => t.id === editId) : null;

  const handleAddTeam = async () => {
    if (!name.trim()) return;
    await ds.addTeam({ name: name.trim(), leagues: leagues.length ? leagues : ['NXL'] });
    setModal(null); setName(''); setLeagues([]);
  };

  const handleDelete = async (id) => {
    await ds.deleteTeam(id);
    setModal(null);
    if (editId === id) setEditId(null);
  };

  const handleToggleLeague = async (team, league) => {
    const next = team.leagues.includes(league)
      ? team.leagues.filter((l) => l !== league)
      : [...team.leagues, league];
    if (next.length > 0) await ds.updateTeam(team.id, { leagues: next });
  };

  const handleAddPlayer = async () => {
    if (!pName.trim() || !pNumber.trim() || !editingTeam) return;
    const players = [...(editingTeam.players || []), {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: pName.trim(),
      nickname: pNick.trim() || '',
      number: pNumber.trim(),
    }];
    await ds.updateTeam(editingTeam.id, { players });
    setPName(''); setPNick(''); setPNumber('');
    setModal(null);
  };

  const handleRemovePlayer = async (playerId) => {
    if (!editingTeam) return;
    const players = editingTeam.players.filter((p) => p.id !== playerId);
    await ds.updateTeam(editingTeam.id, { players });
  };

  // ─── Team list view ───
  if (!editId) {
    return (
      <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <Header breadcrumbs={['Baza drużyn']} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          <SectionTitle right={
            <Btn variant="accent" size="sm" onClick={() => { setName(''); setLeagues([]); setModal('addTeam'); }}>
              <Icons.Plus /> Drużyna
            </Btn>
          }>
            <Icons.DB /> Baza drużyn
          </SectionTitle>

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}
          {!loading && !teams.length && <EmptyState icon="🏴" text="Dodaj drużyny do globalnej bazy" />}

          {teams.map((t) => (
            <Card key={t.id} icon="🏴" title={t.name}
              badge={<span style={{ display: 'flex', gap: 3 }}>{t.leagues.map((l) => <LeagueBadge key={l} league={l} />)}</span>}
              subtitle={`${t.players?.length || 0} zawodników`}
              onClick={() => setEditId(t.id)}
              actions={
                <span style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
                  <Btn variant="ghost" size="sm" onClick={() => setModal({ type: 'delete', id: t.id, name: t.name })}>
                    <Icons.Trash />
                  </Btn>
                </span>
              } />
          ))}
        </div>

        {/* Add team modal */}
        <Modal open={modal === 'addTeam'} onClose={() => setModal(null)} title="Nowa drużyna"
          footer={<>
            <Btn variant="default" size="sm" onClick={() => setModal(null)}>Anuluj</Btn>
            <Btn variant="accent" size="sm" onClick={handleAddTeam} disabled={!name.trim()}><Icons.Check /> Dodaj</Btn>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input value={name} onChange={setName} placeholder="Nazwa drużyny..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()} autoFocus />
            <div>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, marginBottom: 4 }}>Ligi</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map((l) => {
                  const active = leagues.includes(l);
                  return <Btn key={l} variant="default" size="sm" active={active}
                    style={{ borderColor: active ? LEAGUE_COLORS[l] : COLORS.border, color: active ? LEAGUE_COLORS[l] : COLORS.textDim }}
                    onClick={() => setLeagues((prev) => active ? prev.filter((x) => x !== l) : [...prev, l])}>{l}</Btn>;
                })}
              </div>
            </div>
          </div>
        </Modal>

        {/* Delete modal */}
        <Modal open={!!modal?.type} onClose={() => setModal(null)} title="Usuń drużynę?"
          footer={<>
            <Btn variant="default" size="sm" onClick={() => setModal(null)}>Anuluj</Btn>
            <Btn variant="danger" size="sm" onClick={() => handleDelete(modal?.id)}><Icons.Trash /> Usuń</Btn>
          </>}>
          <p style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, margin: 0 }}>
            Usunąć <strong style={{ color: COLORS.text }}>{modal?.name}</strong>?
          </p>
        </Modal>
      </div>
    );
  }

  // ─── Team edit view ───
  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={['Baza drużyn', editingTeam?.name || '...']} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Back */}
        <Btn variant="ghost" size="sm" onClick={() => setEditId(null)}>
          <Icons.Back /> Wróć do listy
        </Btn>

        {editingTeam && (
          <>
            <SectionTitle>{editingTeam.name}</SectionTitle>

            {/* Leagues */}
            <div>
              <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Ligi
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map((l) => {
                  const active = editingTeam.leagues.includes(l);
                  return (
                    <Btn key={l} variant="default" size="sm" active={active}
                      style={{ borderColor: active ? LEAGUE_COLORS[l] : COLORS.border, color: active ? LEAGUE_COLORS[l] : COLORS.textDim }}
                      onClick={() => handleToggleLeague(editingTeam, l)}>
                      {l}
                    </Btn>
                  );
                })}
              </div>
            </div>

            {/* Roster */}
            <div>
              <SectionTitle right={
                <Btn variant="accent" size="sm" onClick={() => { setPName(''); setPNick(''); setPNumber(''); setModal('addPlayer'); }}>
                  <Icons.Plus /> Zawodnik
                </Btn>
              }>
                <Icons.Users /> Skład ({editingTeam.players?.length || 0})
              </SectionTitle>

              {!editingTeam.players?.length && (
                <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, padding: '6px 0' }}>
                  Brak zawodników. Dodaj skład drużyny.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(editingTeam.players || []).map((p) => (
                  <div key={p.id} className="fade-in" style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    borderRadius: 6, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
                  }}>
                    <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 13, color: COLORS.accent, minWidth: 30 }}>
                      #{p.number}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.text, fontWeight: 600 }}>
                        {p.name}
                      </div>
                      {p.nickname && (
                        <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>
                          „{p.nickname}"
                        </div>
                      )}
                    </div>
                    <Btn variant="ghost" size="sm" onClick={() => handleRemovePlayer(p.id)}>
                      <Icons.Trash />
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add player modal */}
      <Modal open={modal === 'addPlayer'} onClose={() => setModal(null)} title="Nowy zawodnik"
        footer={<>
          <Btn variant="default" size="sm" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="accent" size="sm" onClick={handleAddPlayer} disabled={!pName.trim() || !pNumber.trim()}>
            <Icons.Check /> Dodaj
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Input value={pName} onChange={setPName} placeholder="Imię / nazwisko" autoFocus />
          <Input value={pNick} onChange={setPNick} placeholder="Ksywka (opcjonalnie)" />
          <Input value={pNumber} onChange={setPNumber} placeholder="Numer (np. 42)"
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()} />
        </div>
      </Modal>
    </div>
  );
}
