import React, { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';

import PageHeader from '../components/PageHeader';
import { Btn, Card, SectionTitle, EmptyState, SkeletonList, Input, Select, Icons, ConfirmModal } from '../components/ui';
import PlayerEditModal from '../components/PlayerEditModal';
import PlayerAvatar from '../components/PlayerAvatar';
import CSVImport from '../components/CSVImport';
import { usePlayers, useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, TOUCH, responsive } from '../utils/theme';
import { playerDisplayName } from '../utils/helpers';

export default function PlayersPage() {
  const { players, loading } = usePlayers();
  const { teams } = useTeams();
  const device = useDevice();
  const R = responsive(device.type);
  const modal = useModal();
  const [search, setSearch] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [editPlayer, setEditPlayer] = useState(null); // player obj | null
  const [csvOpen, setCsvOpen] = useState(false);

  const filtered = players.filter(p => {
    if (filterTeam && p.teamId !== filterTeam) return false;
    if (filterClass && (p.playerClass || '') !== filterClass) return false;
    if (filterRole && (p.role || 'player') !== filterRole) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q) ||
      (p.number || '').includes(q);
  });

  const activeFilters = [filterTeam, filterClass, filterRole].filter(Boolean).length;

  const openAdd = () => { setEditPlayer(null); modal.open('edit'); };
  const openEdit = (p) => { setEditPlayer(p); modal.open('edit'); };

  const handleSave = async (formData) => {
    if (editPlayer) {
      // Team change needs history update
      if (formData.teamId !== (editPlayer.teamId || null)) {
        await ds.changePlayerTeam(editPlayer.id, formData.teamId, editPlayer.teamHistory || []);
      }
      await ds.updatePlayer(editPlayer.id, formData);
    } else {
      await ds.addPlayer(formData);
    }
    modal.close();
  };

  const handleDelete = async (id) => { await ds.deletePlayer(id); modal.close(); };

  const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || '—';

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Players" />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64 }}>
        <SectionTitle right={
          <div style={{ display: 'flex', gap: 4 }}>
            <Btn variant="default" size="sm" onClick={() => setCsvOpen(true)}>📋 CSV</Btn>
            <Btn variant="accent" onClick={openAdd}><Icons.Plus /> Player</Btn>
          </div>
        }>
          <Icons.DB /> Players ({players.length})
        </SectionTitle>

        <div style={{ marginBottom: 12 }}>
          <Input value={search} onChange={setSearch} placeholder="🔍 Search by name, nickname, number..." />
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <Select value={filterTeam} onChange={setFilterTeam} style={{ flex: 1, minWidth: 100, fontSize: 12 }}>
            <option value="">Drużyna: wszystkie</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select value={filterClass} onChange={setFilterClass} style={{ flex: 1, minWidth: 80, fontSize: 12 }}>
            <option value="">Klasa: wszystkie</option>
            {['Pro', 'Semi-Pro', 'D1', 'D2', 'D3', 'D4', 'D5'].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={filterRole} onChange={setFilterRole} style={{ flex: 1, minWidth: 80, fontSize: 12 }}>
            <option value="">Rola: wszystkie</option>
            <option value="player">Player</option>
            <option value="coach">Coach</option>
            <option value="staff">Staff</option>
          </Select>
          {activeFilters > 0 && (
            <Btn variant="ghost" size="sm" onClick={() => { setFilterTeam(''); setFilterClass(''); setFilterRole(''); }}
              style={{ color: COLORS.danger, fontSize: 11, padding: '4px 8px' }}>
              ✕ Wyczyść
            </Btn>
          )}
        </div>

        {loading && <SkeletonList count={5} />}
        {!loading && !filtered.length && <EmptyState icon="👤" text={search ? 'No results' : 'Add your first player'} />}

        {filtered.map(p => (
          <Card key={p.id}
            iconLeft={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <PlayerAvatar player={p} size={40} />
                <span style={{
                  fontWeight: 800, fontSize: 14, color: COLORS.accent,
                  minWidth: 32, textAlign: 'left',
                }}>#{p.number}</span>
              </div>
            }
            title={<span>{p.name} {p.nickname && <span style={{ color: COLORS.textDim, fontWeight: 400 }}>„{p.nickname}"</span>}</span>}
            subtitle={[
              getTeamName(p.teamId),
              p.playerClass,
              p.nationality,
              p.role && p.role !== 'player' && p.role,
              p.age && `${p.age} yo`,
            ].filter(Boolean).join(' · ')}
            onClick={() => openEdit(p)}
            actions={
              <span onClick={e => e.stopPropagation()}>
                <Btn variant="ghost" size="sm" onClick={() => modal.open({ type: 'delete', id: p.id, name: playerDisplayName(p) })}><Icons.Trash /></Btn>
              </span>
            } />
        ))}
      </div>

      {/* Shared player modal (add + edit) */}
      <PlayerEditModal
        open={modal.is('edit')}
        player={editPlayer}
        teams={teams}
        onSave={handleSave}
        onCancel={() => modal.close()}
      />

      <ConfirmModal open={modal.is('delete')} onClose={() => modal.close()}
        title="Delete player?" danger confirmLabel="Delete"
        message={`Delete "${modal.value?.name}"?`}
        onConfirm={() => handleDelete(modal.value?.id)} />

      <CSVImport open={csvOpen} onClose={() => setCsvOpen(false)} teams={teams} players={players} ds={ds} />
    </div>
  );
}
