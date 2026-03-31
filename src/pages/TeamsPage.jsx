import React, { useState } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Icons, LeagueBadge , ConfirmModal} from '../components/ui';
import { useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS , responsive } from '../utils/theme';
import { useWorkspace } from '../hooks/useWorkspace';

export default function TeamsPage() {
  const device = useDevice();
  const R = responsive(device.type);
    const navigate = useNavigate();
  const { teams, loading } = useTeams();
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [leagues, setLeagues] = useState([]);
  const [editTeam, setEditTeam] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const { workspace } = useWorkspace();

  const handleAdd = async () => {
    if (!name.trim()) return;
    await ds.addTeam({ name: name.trim(), leagues: leagues.length ? leagues : ['NXL'] });
    setModal(null); setName(''); setLeagues([]);
  };

  const handleDelete = async (id) => { await ds.deleteTeam(id); setModal(null); setDeletePassword(''); };

  const handleToggleLeague = async (team, league) => {
    const next = team.leagues.includes(league) ? team.leagues.filter(l => l !== league) : [...team.leagues, league];
    if (next.length > 0) await ds.updateTeam(team.id, { leagues: next });
  };

  const handleRename = async () => {
    if (!editTeam || !name.trim()) return;
    await ds.updateTeam(editTeam.id, { name: name.trim() });
    setModal(null); setEditTeam(null);
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={['Teams']} />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding }}>
        <SectionTitle right={
          <Btn variant="accent" onClick={() => { setName(''); setLeagues([]); setModal('add'); }}>
            <Icons.Plus /> Team
          </Btn>
        }>
          <Icons.Users /> Teams database
        </SectionTitle>

        {loading && <EmptyState icon="⏳" text="Loading..." />}
        {!loading && !teams.length && <EmptyState icon="🏴" text="Add teams to the database" />}

        {teams.map(t => (
          <Card key={t.id} icon="🏴" title={t.name}
            badge={<span style={{ display: 'flex', gap: 3 }}>{t.leagues.map(l => <LeagueBadge key={l} league={l} />)}</span>}
            onClick={() => navigate(`/team/${t.id}`)}
            actions={
              <span style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                <Btn variant="ghost" size="sm" onClick={() => { setEditTeam(t); setName(t.name); setModal('edit'); }}><Icons.Edit /></Btn>
                <Btn variant="ghost" size="sm" onClick={() => setModal({ type: 'delete', id: t.id, name: t.name })}><Icons.Trash /></Btn>
              </span>
            } />
        ))}
      </div>

      {/* Add team */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="New team"
        footer={<>
          <Btn variant="default" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="accent" onClick={handleAdd} disabled={!name.trim()}><Icons.Check /> Add</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Team name..." onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Leagues</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {LEAGUES.map(l => {
                const a = leagues.includes(l);
                return <Btn key={l} variant="default" size="sm" active={a}
                  style={{ borderColor: a ? LEAGUE_COLORS[l] : COLORS.border, color: a ? LEAGUE_COLORS[l] : COLORS.textDim }}
                  onClick={() => setLeagues(p => a ? p.filter(x => x !== l) : [...p, l])}>{l}</Btn>;
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit team */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit team"
        footer={<>
          <Btn variant="default" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="accent" onClick={handleRename} disabled={!name.trim()}><Icons.Check /> Save</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Name..." autoFocus />
          {editTeam && (
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Leagues</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map(l => {
                  const a = editTeam.leagues.includes(l);
                  return <Btn key={l} variant="default" size="sm" active={a}
                    style={{ borderColor: a ? LEAGUE_COLORS[l] : COLORS.border, color: a ? LEAGUE_COLORS[l] : COLORS.textDim }}
                    onClick={() => handleToggleLeague(editTeam, l)}>{l}</Btn>;
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal open={!!modal?.type} onClose={() => { setModal(null); setDeletePassword(''); }}
        title="Delete team?" danger confirmLabel="Delete"
        message={`Delete "${modal?.name}"?`}
        requirePassword={workspace?.slug}
        password={deletePassword} onPasswordChange={v => setDeletePassword(v)}
        onConfirm={() => handleDelete(modal?.id)} />
    </div>
  );
}
