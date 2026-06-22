import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';

import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { Btn, Card, SectionTitle, EmptyState, SkeletonList, Icons, ConfirmModal } from '../components/ui';
import SearchFilterPanel from '../components/SearchFilterPanel';
import PlayerEditModal from '../components/PlayerEditModal';
import PlayerAvatar from '../components/PlayerAvatar';
import CSVImport from '../components/CSVImport';
import MergePlayersModal from '../components/MergePlayersModal';
import PlayerMultiSelectBar, { SelectCheckbox } from '../components/PlayerMultiSelectBar';
import { usePlayers, useActiveTeams } from '../hooks/useFirestore';
import { useLeagues } from '../hooks/useLeagues';
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin';
import * as ds from '../services/dataService';
import { COLORS, responsive } from '../utils/theme';
import { playerDisplayName } from '../utils/helpers';
import { playerOnTeam } from '../utils/playerTeams';
import { matchEntity, playerInLeague, playerInDivision } from '../utils/entityFilters';
import { useLanguage } from '../hooks/useLanguage';

export default function PlayersPage() {
  const { t } = useLanguage();
  const { players, loading } = usePlayers();
  const { teams } = useActiveTeams();
  const device = useDevice();
  const R = responsive(device.type);
  const modal = useModal();
  const leaguesList = useLeagues();
  // §90 Stage 2B.3 — player delete is super_admin-only and HARD-deletes the
  // global catalog doc (deletePlayerGlobal). The workspace players twin was
  // decommissioned, so the old workspace-soft-delete (deletePlayer) is gone.
  const isSuperAdmin = useIsSuperAdmin();
  // § Stage B — URL-backed filter state (bookmarkable). Order: search → Liga →
  // Dywizja → Team → Klasa → Rola. Division is DERIVED via team membership.
  const [sp, setSp] = useSearchParams();
  const search = sp.get('q') || '';
  const filterLeague = sp.get('liga') || '';
  const filterDiv = sp.get('dyw') || '';
  const filterTeam = sp.get('team') || '';
  const filterClass = sp.get('class') || '';
  const filterRole = sp.get('role') || '';
  const setParam = (key, val) => setSp(prev => { const n = new URLSearchParams(prev); if (val) n.set(key, val); else n.delete(key); return n; }, { replace: true });
  // Changing Liga clears Dywizja (divisions are league-scoped).
  const setLiga = (val) => setSp(prev => { const n = new URLSearchParams(prev); if (val) n.set('liga', val); else n.delete('liga'); n.delete('dyw'); return n; }, { replace: true });
  const clearFilters = () => setSp(prev => { const n = new URLSearchParams(prev); ['liga', 'dyw', 'team', 'class', 'role'].forEach(k => n.delete(k)); return n; }, { replace: true });
  const [editPlayer, setEditPlayer] = useState(null); // player obj | null
  const [csvOpen, setCsvOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [mergeOpen, setMergeOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  // Optimistic removal. usePlayers reads the version-gated catalog cache, which is
  // a ONE-SHOT load per mount (not a live listener) — so a successful
  // deletePlayerGlobal does NOT drop the row in-session, making the delete-confirm
  // look like a no-op. Hide deleted ids immediately; the catalog refetches fresh on
  // the next load (the delete already bumped /meta/catalogVersion).
  const [removedIds, setRemovedIds] = useState(() => new Set());

  const teamsById = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);
  const divisionsByLeague = useMemo(
    () => Object.fromEntries(leaguesList.map(L => [L.shortName, L.divisions || []])),
    [leaguesList],
  );

  const filtered = useMemo(() => players.filter(p => {
    if (removedIds.has(p.id)) return false;
    if (!matchEntity(search, p, ['name', 'nickname', 'number'])) return false;
    if (filterLeague && !playerInLeague(p, filterLeague, teamsById)) return false;
    if (filterLeague && filterDiv && !playerInDivision(p, filterDiv, teamsById, filterLeague)) return false;
    if (filterTeam && !playerOnTeam(p, filterTeam)) return false;
    if (filterClass && (p.playerClass || '') !== filterClass) return false;
    if (filterRole && (p.role || 'player') !== filterRole) return false;
    return true;
  }), [players, search, filterLeague, filterDiv, filterTeam, filterClass, filterRole, teamsById, removedIds]);

  const anyActive = !!(filterLeague || filterDiv || filterTeam || filterClass || filterRole);
  const filters = [
    { key: 'liga', label: t('league_label'), value: filterLeague, onChange: setLiga, allLabel: t('all_label'), options: leaguesList.map(L => ({ value: L.shortName, label: L.shortName })) },
    { key: 'dyw', label: t('division_label'), value: filterDiv, onChange: v => setParam('dyw', v), allLabel: t('all_label'), options: (filterLeague ? (divisionsByLeague[filterLeague] || []) : []).map(d => ({ value: d.name, label: d.name })) },
    { key: 'team', label: t('tab_team'), value: filterTeam, onChange: v => setParam('team', v), allLabel: t('all_label'), options: teams.map(t => ({ value: t.id, label: t.name })) },
    { key: 'class', label: t('profile_player_class_label'), value: filterClass, onChange: v => setParam('class', v), allLabel: t('all_label'), options: ['Pro', 'Semi-Pro', 'D1', 'D2', 'D3', 'D4', 'D5'].map(c => ({ value: c, label: c })) },
    { key: 'role', label: t('role_label'), value: filterRole, onChange: v => setParam('role', v), allLabel: t('all_label'), options: [{ value: 'player', label: 'Player' }, { value: 'coach', label: 'Coach' }, { value: 'staff', label: 'Staff' }] },
  ];

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

  const handleDelete = async (id) => {
    try {
      await ds.deletePlayerGlobal(id);
      setRemovedIds(prev => { const n = new Set(prev); n.add(id); return n; });
    } catch (e) {
      // Delete failed (e.g. rules) — leave the row visible (honest), surface in console.
      console.warn('[PlayersPage] delete failed:', e);
    } finally {
      modal.close();
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const selectedPlayers = players.filter(p => selectedIds.has(p.id));

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || bulkPending) return;
    setBulkPending(true);
    setBulkError(null);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(ids.map(id => ds.deletePlayerGlobal(id)));
    const failed = ids.filter((_, i) => results[i].status === 'rejected');
    const succeeded = ids.filter((_, i) => results[i].status === 'fulfilled');
    if (succeeded.length) setRemovedIds(prev => { const n = new Set(prev); succeeded.forEach(x => n.add(x)); return n; });
    setBulkPending(false);
    if (failed.length === 0) {
      setBulkDeleteOpen(false);
      clearSelection();
    } else {
      setBulkError(t('players_bulk_delete_failed', failed.length, ids.length));
      // eslint-disable-next-line no-console
      console.warn('[PlayersPage] bulk delete failures:', failed, results);
      setSelectedIds(new Set(failed));
    }
  };

  const handleMergeConfirm = async (canonicalId, absorbedIds, mergedFields) => {
    await ds.mergePlayers(canonicalId, absorbedIds, mergedFields);
    clearSelection();
  };

  const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || '—';

  return (
    <Screen archetype="list" padBottom={false} style={{ display: 'flex', flexDirection: 'column' }}
      header={<PageHeader back={{ to: '/' }} title={t('players_label')} />}>
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64 }}>
        <SectionTitle right={
          <div style={{ display: 'flex', gap: 4 }}>
            <Btn variant="default" size="sm" onClick={() => setCsvOpen(true)}>📋 CSV</Btn>
            <Btn variant="accent" onClick={openAdd}><Icons.Plus /> {t('players_add_btn')}</Btn>
          </div>
        }>
          <Icons.DB /> {t('players_count_title', players.length)}
        </SectionTitle>

        {/* § Stage B — unified search/filter panel (search → Liga → Dywizja → Team → Klasa → Rola) */}
        <SearchFilterPanel
          search={search}
          onSearchChange={v => setParam('q', v)}
          searchPlaceholder={t('players_search_ph')}
          filters={filters}
          style={{ marginBottom: 12 }}
        />
        {anyActive && (
          <Btn variant="ghost" size="sm" onClick={clearFilters}
            style={{ color: COLORS.danger, fontSize: 11, padding: '4px 8px', marginBottom: 8 }}>
            ✕ {t('clear_preset')}
          </Btn>
        )}

        {loading && <SkeletonList count={5} />}
        {!loading && !filtered.length && <EmptyState icon="👤" text={search ? t('no_results') : t('players_empty_add_first')} />}

        {filtered.map(p => {
          const isSelected = selectedIds.has(p.id);
          return (
            <Card key={p.id}
              iconLeft={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <SelectCheckbox checked={isSelected}
                    onChange={() => toggleSelected(p.id)} />
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
                p.age && t('players_age_yo', p.age),
              ].filter(Boolean).join(' · ')}
              onClick={() => openEdit(p)}
              actions={isSuperAdmin ? (
                <span onClick={e => e.stopPropagation()}>
                  <Btn variant="ghost" size="sm" title={t('b13_aria_delete_player')} aria-label={t('b13_aria_delete_player')} style={{ minWidth: 44, minHeight: 44 }} onClick={() => modal.open({ type: 'delete', id: p.id, name: playerDisplayName(p) })}><Icons.Trash /></Btn>
                </span>
              ) : undefined} />
          );
        })}
      </div>

      <PlayerMultiSelectBar
        count={selectedIds.size}
        canMerge={selectedIds.size >= 2}
        canDelete={isSuperAdmin}
        onClear={clearSelection}
        onDelete={() => { setBulkError(null); setBulkDeleteOpen(true); }}
        onMerge={() => setMergeOpen(true)}
        pending={bulkPending}
      />

      {/* Shared player modal (add + edit) */}
      <PlayerEditModal
        open={modal.is('edit')}
        player={editPlayer}
        teams={teams}
        onSave={handleSave}
        onCancel={() => modal.close()}
      />

      <ConfirmModal open={modal.is('delete')} onClose={() => modal.close()}
        title={t('players_delete_title')} danger confirmLabel={t('delete')}
        message={t('players_delete_msg', modal.value?.name)}
        onConfirm={() => handleDelete(modal.value?.id)} />

      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => { if (!bulkPending) { setBulkDeleteOpen(false); setBulkError(null); } }}
        title={t('players_bulk_delete_title', selectedIds.size)}
        danger
        confirmLabel={bulkPending ? t('players_bulk_deleting') : t('players_bulk_delete_label', selectedIds.size)}
        message={bulkError
          ? bulkError
          : t('players_bulk_delete_msg', selectedIds.size)}
        onConfirm={handleBulkDelete}
      />

      <MergePlayersModal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        players={selectedPlayers}
        teams={teams}
        onConfirm={handleMergeConfirm}
      />

      <CSVImport open={csvOpen} onClose={() => setCsvOpen(false)} teams={teams} players={players} ds={ds} />
    </Screen>
  );
}
