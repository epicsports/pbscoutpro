import React, { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';

import { Btn, Card, SectionTitle, EmptyState, SkeletonList, Input, Icons, ConfirmModal } from '../components/ui';
import PlayerEditModal from '../components/PlayerEditModal';
import CSVImport from '../components/CSVImport';
import { usePlayers, useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, responsive } from '../utils/theme';
import { playerDisplayName } from '../utils/helpers';

export default function PlayersPage() {
  const { players, loading } = usePlayers();
  const { teams } = useTeams();
  const device = useDevice();
  const R = responsive(device.type);
  const modal = useModal();
  const [search, setSearch] = useState('');
  const [editPlayer, setEditPlayer] = useState(null); // player obj | null
  const [csvOpen, setCsvOpen] = useState(false);

  const filtered = players.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) ||
      (p.nickname || '').toLowerCase().includes(q) ||
      (p.number || '').includes(q);
  });

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
      <div style={{
        padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
        fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text,
      }}>Players</div>
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

        {loading && <SkeletonList count={5} />}
        {!loading && !filtered.length && <EmptyState icon="👤" text={search ? 'Brak wyników' : 'Dodaj playerów do bazy'} />}

        {filtered.map(p => (
          <Card key={p.id}
            icon={<span style={{ fontWeight: 800, fontSize: TOUCH.fontBase, color: COLORS.accent }}>#{p.number}</span>}
            title={<span>{p.name} {p.nickname && <span style={{ color: COLORS.textDim, fontWeight: 400 }}>„{p.nickname}"</span>}</span>}
            subtitle={[getTeamName(p.teamId), p.age && `${p.age} yo`, p.favoriteBunker, p.comment && `💬 ${p.comment.slice(0, 30)}`].filter(Boolean).join(' · ')}
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
