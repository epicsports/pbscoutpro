import React, { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useViewAs } from '../../hooks/useViewAs';
import { usePlayers, useActiveTeams } from '../../hooks/useFirestore';
import { useLeagues } from '../../hooks/useLeagues';
import PageHeader from '../../components/PageHeader';
import Screen from '../../components/Screen';
import { Btn, Card, EmptyState, MoreBtn, ActionSheet, Modal, Select } from '../../components/ui';
import SearchFilterPanel from '../../components/SearchFilterPanel';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';
import { deletePlayerGlobal } from '../../services/dataService';
import * as ds from '../../services/dataService';
import { playerInLeague, playerInDivision } from '../../utils/entityFilters';
import { useSearchFilter } from '../../hooks/useSearchFilter';
import CSVImport from '../../components/CSVImport';
import MergePlayersModal from '../../components/MergePlayersModal';
import PlayerMultiSelectBar, { SelectCheckbox } from '../../components/PlayerMultiSelectBar';
import PlayerFormModal from './PlayerFormModal';
import { useLanguage } from '../../hooks/useLanguage';

// Phase 2.2.c — Super admin CRUD for global /players/ collection (934 docs).
// Per DESIGN_DECISIONS § 63.15.3 + MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 2c.
//
// Defense in depth admin gate:
//   1. <AdminGuard> wraps the route in App.jsx (effectiveIsAdmin from useViewAs)
//   2. Component-level early return (this file) — paranoid safety net
//   3. Firestore rules at /players/{playerId} restrict delete to admin email
//      (Phase 2.2.b shipped — covers admin writes + admin-only delete)
const PAGE_SIZE = 50;
// Stable module-scope fields ref so useSearchFilter's memo doesn't re-run each
// render. Admin player search = name + nickname + number.
const PLAYER_SEARCH_FIELDS = ['name', 'nickname', 'number'];
const tsMs = (t) => {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

export default function AdminPlayersPage() {
  const { t } = useLanguage();
  const { effectiveIsAdmin } = useViewAs();
  const { players, loading } = usePlayers();
  const { teams } = useActiveTeams();
  const leaguesList = useLeagues();
  const teamsById = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [csvOpen, setCsvOpen] = useState(false);
  const [editing, setEditing] = useState(null);     // null = closed; 'new' = create; player obj = edit
  const [actionFor, setActionFor] = useState(null); // player for ActionSheet
  const [deleteFor, setDeleteFor] = useState(null); // player for Delete confirmation Modal
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  // Layer 2 admin gate — AdminGuard should have caught non-admins, but
  // render-time check guards against future routing regressions.
  if (!effectiveIsAdmin) return null;

  // URL-backed state — bookmarkable filtered views
  const search = searchParams.get('search') || '';
  const filter = searchParams.get('filter') || 'all';     // all | linked | unlinked | hero
  const liga = searchParams.get('liga') || '';
  const dyw = searchParams.get('dyw') || '';
  const sort = searchParams.get('sort') || 'name';        // name | updatedAt | originWorkspace
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '' || v === 'all' || v === 'name' || (k === 'page' && v === 0)) {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    setSearchParams(next, { replace: true });
  };
  // Changing Liga clears Dywizja (divisions are league-scoped).
  const setLiga = (v) => updateParams({ liga: v, dyw: '', page: 0 });

  // Structured filters folded into a predicate for the shared useSearchFilter
  // pipeline (search via matchEntity → predicate → sort → paginate). Admin pills
  // (linked/unlinked/hero) keep their bespoke UX; Liga/Dywizja are NEW (DERIVED
  // via team membership through entityFilters). 934 docs handled in-memory.
  const predicate = useCallback((p) => {
    if (filter === 'linked' && !p.pbliId) return false;
    else if (filter === 'unlinked' && p.pbliId) return false;
    else if (filter === 'hero' && !p.hero) return false;
    if (!playerInLeague(p, liga, teamsById)) return false;
    if (!playerInDivision(p, dyw, teamsById, liga)) return false;
    return true;
  }, [filter, liga, dyw, teamsById]);

  const sortFn = useCallback((a, b) => {
    if (sort === 'updatedAt') return tsMs(b.updatedAt) - tsMs(a.updatedAt);
    if (sort === 'originWorkspace') {
      return (a.originWorkspace || '').localeCompare(b.originWorkspace || '')
        || (a.name || '').localeCompare(b.name || '');
    }
    return (a.name || '').localeCompare(b.name || '');
  }, [sort]);

  const { paged, total, totalPages } = useSearchFilter({
    items: players, search, fields: PLAYER_SEARCH_FIELDS,
    predicate, sort: sortFn, page, pageSize: PAGE_SIZE,
  });
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;

  const handleDelete = async () => {
    if (!deleteFor) return;
    setPending(true);
    setDeleteError(null);
    try {
      await deletePlayerGlobal(deleteFor.id);
      setDeleteFor(null);
      // If the just-deleted player was being edited, close that modal too.
      if (editing && editing !== 'new' && editing.id === deleteFor.id) setEditing(null);
    } catch (err) {
      console.error('Delete player failed:', err);
      setDeleteError(err?.message || 'Delete failed — see console');
    } finally {
      setPending(false);
    }
  };

  const deleteAliasIds = Array.isArray(deleteFor?.aliasIds) ? deleteFor.aliasIds.filter(Boolean) : [];
  const hasAliases = deleteAliasIds.length > 0;

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const selectedPlayers = useMemo(
    () => players.filter(p => selectedIds.has(p.id)),
    [players, selectedIds],
  );
  // Track how many of the selected docs are canonical-with-aliases — bulk
  // delete must call this out (orphans alias references).
  const selectedAliasCount = selectedPlayers.reduce((acc, p) => (
    Array.isArray(p.aliasIds) && p.aliasIds.filter(Boolean).length > 0 ? acc + 1 : acc
  ), 0);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || bulkPending) return;
    setBulkPending(true);
    setBulkError(null);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(ids.map(id => deletePlayerGlobal(id)));
    const failed = ids.filter((_, i) => results[i].status === 'rejected');
    setBulkPending(false);
    if (failed.length === 0) {
      setBulkDeleteOpen(false);
      clearSelection();
    } else {
      setBulkError(`${failed.length} of ${ids.length} deletes failed — see console`);
      // eslint-disable-next-line no-console
      console.warn('[AdminPlayersPage] bulk delete failures:', failed, results);
      setSelectedIds(new Set(failed));
    }
  };

  const handleMergeConfirm = async (canonicalId, absorbedIds, mergedFields) => {
    await ds.mergePlayers(canonicalId, absorbedIds, mergedFields);
    clearSelection();
  };

  return (
    <Screen archetype="list" padBottom={false} header={<PageHeader back={{ to: '/' }} title={t('b13_players_admin')} />}>
      <div style={{ padding: SPACE.lg, paddingBottom: 80 }}>

        {/* Search + Liga + Dywizja (shared kit) */}
        <SearchFilterPanel
          search={search}
          onSearchChange={(v) => updateParams({ search: v, page: 0 })}
          searchPlaceholder="🔍 Search name, nickname, number…"
          filters={[
            { key: 'liga', label: 'Liga', value: liga, onChange: setLiga, allLabel: 'wszystkie', options: leaguesList.map(L => ({ value: L.shortName, label: L.shortName })) },
            { key: 'dyw', label: 'Dywizja', value: dyw, onChange: (v) => updateParams({ dyw: v, page: 0 }), allLabel: 'wszystkie', options: (leaguesList.find(L => L.shortName === liga)?.divisions || []).map(d => ({ value: d.name, label: d.name })) },
          ]}
          style={{ marginBottom: SPACE.sm }}
        />

        {/* Sort + create */}
        <div style={{ display: 'flex', gap: SPACE.xs, marginBottom: SPACE.sm, alignItems: 'stretch', flexWrap: 'wrap' }}>
          <Select
            value={sort}
            onChange={(v) => updateParams({ sort: v, page: 0 })}
            style={{ minWidth: 160 }}
          >
            <option value="name">{t('admin_players_sort_name')}</option>
            <option value="updatedAt">{t('b13_admin_sort_updated_desc')}</option>
            <option value="originWorkspace">{t('b13_admin_sort_workspace')}</option>
          </Select>
          <Btn variant="default" onClick={() => setCsvOpen(true)}>📋 CSV import</Btn>
          <Btn variant="accent" onClick={() => setEditing('new')}>+ New player</Btn>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: SPACE.xs, marginBottom: SPACE.md, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: t('admin_leagues_filter_all') },
            { key: 'linked', label: t('admin_players_filter_linked') },
            { key: 'unlinked', label: t('admin_players_filter_unlinked') },
            { key: 'hero', label: 'HERO' },
          ].map(p => (
            <Btn key={p.key}
              variant={filter === p.key ? 'accent' : 'default'}
              size="sm"
              onClick={() => updateParams({ filter: p.key, page: 0 })}
            >{p.label}</Btn>
          ))}
        </div>

        {/* Result count */}
        <div style={{
          fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
          marginBottom: SPACE.sm,
        }}>
          {loading
            ? 'Loading…'
            : total === 0
              ? 'No players match the current filter.'
              : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, total)} of ${total}${players.length !== total ? ` (filtered from ${players.length})` : ''}`}
        </div>

        {/* List */}
        {!loading && total === 0 ? (
          <EmptyState icon="👤" text={t('b13_admin_no_players')} subtitle={search || filter !== 'all' || liga ? 'Try changing the search or filter' : 'Phase 2.2.a bootstrap missing?'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
            {paged.map(p => {
              const aliasCount = Array.isArray(p.aliasIds) ? p.aliasIds.filter(Boolean).length : 0;
              const subtitleParts = [];
              if (p.pbliId) subtitleParts.push(`PBLI ${p.pbliId}`);
              else subtitleParts.push('No PBLI');
              if (p.originWorkspace) subtitleParts.push(p.originWorkspace);
              if (p.hero) subtitleParts.push('HERO');
              if (aliasCount > 0) subtitleParts.push(`${aliasCount} alias${aliasCount === 1 ? '' : 'es'}`);
              const displayName = p.nickname
                ? `${p.nickname}${p.name && p.name !== p.nickname ? ` (${p.name})` : ''}`
                : (p.name || '—');
              const isSelected = selectedIds.has(p.id);
              return (
                <Card
                  key={p.id}
                  iconLeft={<SelectCheckbox checked={isSelected} onChange={() => toggleSelected(p.id)} />}
                  title={displayName}
                  subtitle={subtitleParts.join(' · ')}
                  onClick={() => setEditing(p)}
                  actions={<MoreBtn onClick={() => setActionFor(p)} />}
                />
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.md, marginTop: SPACE.lg }}>
            <Btn variant="default" size="sm" disabled={safePage === 0}
              onClick={() => updateParams({ page: safePage - 1 })}>{t('admin_teams_prev')}</Btn>
            <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
              {t('admin_teams_page_n_of_m')(safePage + 1, totalPages)}
            </span>
            <Btn variant="default" size="sm" disabled={safePage >= totalPages - 1}
              onClick={() => updateParams({ page: safePage + 1 })}>{t('admin_teams_next')}</Btn>
          </div>
        )}

        <div style={{ marginTop: SPACE.lg, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceDark, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 1.5 }}>
          <div style={{ color: COLORS.textDim, fontWeight: 600, marginBottom: 4 }}>{t('admin_players_about_title')}</div>
          Global resource (§ 63.15.3) — single player identity across all workspaces. Workspace UI consumes via <code style={{ color: COLORS.text }}>usePlayers</code> hook (alias-aware). Edits propagate live via Firestore onSnapshot.
          <br />Edits dual-write to both the workspace doc and <code style={{ color: COLORS.text }}>/players/{'{id}'}</code>. Delete removes only the global doc; the workspace copy stays as recovery cushion until Phase 2.2.d cleanup.
          <br />Aliases come from Phase 2.2.a dedup (legacy doc IDs collapsed onto a canonical). Deleting a canonical with non-empty <code style={{ color: COLORS.text }}>aliasIds</code> orphans those references in old match data.
        </div>
      </div>

      {/* Row action sheet (Edit / Delete) */}
      <ActionSheet
        open={!!actionFor}
        onClose={() => setActionFor(null)}
        title={actionFor?.nickname || actionFor?.name}
        actions={actionFor ? [
          { label: t('edit'), onPress: () => { setEditing(actionFor); setActionFor(null); } },
          { label: t('delete'), danger: true, onPress: () => { setDeleteFor(actionFor); setActionFor(null); } },
        ] : []}
      />

      {/* Delete confirmation — branches on aliasIds */}
      <Modal
        open={!!deleteFor}
        onClose={() => { if (!pending) { setDeleteFor(null); setDeleteError(null); } }}
        title={hasAliases ? `⚠ Delete ${deleteFor?.nickname || deleteFor?.name}?` : `Delete ${deleteFor?.nickname || deleteFor?.name}?`}
        footer={<>
          <Btn variant="default" onClick={() => { setDeleteFor(null); setDeleteError(null); }} disabled={pending}>{t('cancel')}</Btn>
          <Btn variant="danger" onClick={handleDelete} disabled={pending}>
            {pending ? 'Deleting…' : (hasAliases ? 'Delete anyway' : 'Delete')}
          </Btn>
        </>}
      >
        {hasAliases ? (
          <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 8px' }}>
              This player is the canonical record for <strong style={{ color: COLORS.text }}>{deleteAliasIds.length} dedup {deleteAliasIds.length === 1 ? 'alias' : 'aliases'}</strong>:
            </p>
            <div style={{ padding: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceDark, maxHeight: 120, overflowY: 'auto', marginBottom: SPACE.sm }}>
              {deleteAliasIds.map((a) => (
                <div key={a} style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, padding: '2px 0' }}>
                  <code>{a}</code>
                </div>
              ))}
            </div>
            <p style={{ margin: '0 0 8px', color: COLORS.danger, fontWeight: 600 }}>
              Deletion will orphan legacy <code>point.assignments[]</code> entries referencing these alias IDs. They will render as "Unknown" in old matches.
            </p>
            <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 12 }}>
              Workspace copy preserved (cleanup in Phase 2.2.d). Continue?
            </p>
          </div>
        ) : (
          <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 8px' }}>
              This action cannot be undone. The player will be removed from <code style={{ color: COLORS.text }}>/players/</code>.
            </p>
            <p style={{ margin: 0, color: COLORS.textMuted, fontSize: 12 }}>
              Workspace copy preserved (cleanup in Phase 2.2.d).
            </p>
          </div>
        )}
        {deleteError && (
          <div style={{ marginTop: SPACE.sm, padding: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.danger}18`, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
            {deleteError}
          </div>
        )}
      </Modal>

      <PlayerFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        player={editing === 'new' ? null : editing}
        onRequestDelete={(p) => setDeleteFor(p)}
      />

      {/* Bulk delete + merge wired into the admin row checkboxes. */}
      <PlayerMultiSelectBar
        count={selectedIds.size}
        canMerge={selectedIds.size >= 2}
        onClear={clearSelection}
        onDelete={() => { setBulkError(null); setBulkDeleteOpen(true); }}
        onMerge={() => setMergeOpen(true)}
        pending={bulkPending}
      />

      <Modal
        open={bulkDeleteOpen}
        onClose={() => { if (!bulkPending) { setBulkDeleteOpen(false); setBulkError(null); } }}
        title={`Delete ${selectedIds.size} player${selectedIds.size === 1 ? '' : 's'} from /players/?`}
        footer={<>
          <Btn variant="default" onClick={() => { setBulkDeleteOpen(false); setBulkError(null); }} disabled={bulkPending}>{t('cancel')}</Btn>
          <Btn variant="danger" onClick={handleBulkDelete} disabled={bulkPending}>
            {bulkPending ? 'Deleting…' : `Delete ${selectedIds.size}`}
          </Btn>
        </>}
      >
        <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
          <p style={{ margin: '0 0 8px' }}>
            Hard delete from global <code style={{ color: COLORS.text }}>/players/</code>. Workspace copies preserved until Phase 2.2.d cleanup.
          </p>
          {selectedAliasCount > 0 && (
            <p style={{ margin: '0 0 8px', color: COLORS.danger, fontWeight: 600 }}>
              ⚠ {selectedAliasCount} of the selected {selectedAliasCount === 1 ? 'doc is' : 'docs are'} canonical with non-empty <code>aliasIds[]</code>. Deletion will orphan legacy <code>point.assignments[]</code> references → they will render as "Unknown" in old matches.
            </p>
          )}
          {bulkError && (
            <div style={{
              marginTop: SPACE.sm, padding: SPACE.sm, borderRadius: RADIUS.sm,
              backgroundColor: `${COLORS.danger}18`,
              fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger,
            }}>
              {bulkError}
            </div>
          )}
        </div>
      </Modal>

      <MergePlayersModal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        players={selectedPlayers}
        teams={teams}
        onConfirm={handleMergeConfirm}
      />

      {/* § 71 — global team + player CSV import (PBLeagues format). One entry
          covers both: CSVImport writes /teams/ and /players/. */}
      <CSVImport open={csvOpen} onClose={() => setCsvOpen(false)} teams={teams} players={players} ds={ds} />
    </Screen>
  );
}
