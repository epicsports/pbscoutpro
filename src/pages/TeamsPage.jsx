import React, { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';

import { Btn, Card, SectionTitle, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, ConfirmModal } from '../components/ui';
import { useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS, responsive } from '../utils/theme';
import { useWorkspace } from '../hooks/useWorkspace';

export default function TeamsPage() {
  const device = useDevice();
  const R = responsive(device.type);
  const navigate = useNavigate();
  const { teams, loading } = useTeams();
  const modal = useModal();
  const { workspace } = useWorkspace();

  const [name, setName] = useState('');
  const [leagues, setLeagues] = useState(['NXL']);
  const [parentTeamId, setParentTeamId] = useState('');
  const [editTeam, setEditTeam] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  const openAdd = () => { setName(''); setLeagues(['NXL']); setParentTeamId(''); modal.open('add'); };
  const openEdit = (t) => {
    setEditTeam(t); setName(t.name);
    setLeagues(t.leagues || ['NXL']);
    setParentTeamId(t.parentTeamId || '');
    modal.open('edit');
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    await ds.addTeam({ name: name.trim(), leagues, parentTeamId: parentTeamId || null });
    modal.close();
  };

  const handleEdit = async () => {
    if (!editTeam || !name.trim()) return;
    await ds.updateTeam(editTeam.id, {
      name: name.trim(), leagues,
      parentTeamId: parentTeamId || null,
    });
    modal.close(); setEditTeam(null);
  };

  const handleDelete = async (id) => { await ds.deleteTeam(id); modal.close(); setDeletePassword(''); };

  const getParentName = (id) => teams.find(t => t.id === id)?.name;

  // Group: parents first, then children indented under them
  const parents = teams.filter(t => !t.parentTeamId);
  const children = teams.filter(t => !!t.parentTeamId);
  const orphans = children.filter(c => !teams.find(t => t.id === c.parentTeamId));
  const orderedTeams = [
    ...parents.flatMap(p => [
      { ...p, _isParent: true },
      ...children.filter(c => c.parentTeamId === p.id).map(c => ({ ...c, _isChild: true })),
    ]),
    ...orphans.map(t => ({ ...t, _isParent: true })),
  ];

  const leagueToggle = (l, currentLeagues, setter) => {
    const a = currentLeagues.includes(l);
    const next = a ? currentLeagues.filter(x => x !== l) : [...currentLeagues, l];
    if (next.length) setter(next);
  };

  const ParentSelect = ({ value, onChange, excludeId }) => (
    <Select value={value} onChange={onChange} style={{ width: '100%' }}>
      <option value="">— brak (drużyna główna) —</option>
      {teams.filter(t => t.id !== excludeId && !t.parentTeamId).map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </Select>
  );

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
        fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text,
      }}>Teams</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64 }}>
        <SectionTitle right={<Btn variant="accent" onClick={openAdd}><Icons.Plus /> Team</Btn>}>
          <Icons.Users /> Teams ({teams.length})
        </SectionTitle>

        {loading && <SkeletonList count={4} />}
        {!loading && !teams.length && <EmptyState icon="🏴" text="Dodaj drużyny do bazy" />}

        {orderedTeams.map(t => (
          <div key={t.id} style={{ marginLeft: t._isChild ? 20 : 0, marginBottom: 6 }}>
            {t._isChild && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>↳</span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>
                  2nd roster · {getParentName(t.parentTeamId)}
                </span>
              </div>
            )}
            <Card
              icon={t._isChild ? '🏳️' : '🏴'}
              title={t.name}
              badge={<span style={{ display: 'flex', gap: 3 }}>{(t.leagues || []).map(l => <LeagueBadge key={l} league={l} />)}</span>}
              onClick={() => navigate(`/team/${t.id}`)}
              actions={
                <span style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(t)}><Icons.Edit /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => modal.open({ type: 'delete', id: t.id, name: t.name })}><Icons.Trash /></Btn>
                </span>
              }
            />
          </div>
        ))}
      </div>

      {/* Add team */}
      <Modal open={modal.is('add')} onClose={() => modal.close()} title="Nowa drużyna"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Anuluj</Btn>
          <Btn variant="accent" onClick={handleAdd} disabled={!name.trim()}><Icons.Check /> Dodaj</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Nazwa drużyny..." autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Ligi</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {LEAGUES.map(l => {
                const a = leagues.includes(l);
                return <Btn key={l} variant="default" size="sm" active={a}
                  style={{ borderColor: a ? LEAGUE_COLORS[l] : COLORS.border, color: a ? LEAGUE_COLORS[l] : COLORS.textDim }}
                  onClick={() => leagueToggle(l, leagues, setLeagues)}>{l}</Btn>;
              })}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>
              Drużyna matka <span style={{ color: COLORS.textMuted }}>(opcjonalnie — 2nd roster)</span>
            </div>
            <ParentSelect value={parentTeamId} onChange={setParentTeamId} />
          </div>
        </div>
      </Modal>

      {/* Edit team */}
      <Modal open={modal.is('edit')} onClose={() => modal.close()} title="Edytuj drużynę"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Anuluj</Btn>
          <Btn variant="accent" onClick={handleEdit} disabled={!name.trim()}><Icons.Check /> Zapisz</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Nazwa..." autoFocus />
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Ligi</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {LEAGUES.map(l => {
                const a = leagues.includes(l);
                return <Btn key={l} variant="default" size="sm" active={a}
                  style={{ borderColor: a ? LEAGUE_COLORS[l] : COLORS.border, color: a ? LEAGUE_COLORS[l] : COLORS.textDim }}
                  onClick={() => leagueToggle(l, leagues, setLeagues)}>{l}</Btn>;
              })}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Drużyna matka</div>
            <ParentSelect value={parentTeamId} onChange={setParentTeamId} excludeId={editTeam?.id} />
          </div>
        </div>
      </Modal>

      <ConfirmModal open={modal.is('delete')} onClose={() => { modal.close(); setDeletePassword(''); }}
        title="Usuń drużynę?" danger confirmLabel="Usuń"
        message={`Usunąć "${modal.value?.name}"?`}
        requirePassword={workspace?.slug}
        password={deletePassword} onPasswordChange={v => setDeletePassword(v)}
        onConfirm={() => handleDelete(modal.value?.id)} />
    </div>
  );
}
