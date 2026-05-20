import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useViewAs } from '../../hooks/useViewAs';
import { useTeams, usePlayers } from '../../hooks/useFirestore';
import PageHeader from '../../components/PageHeader';
import { Btn, Card, EmptyState, Input, MoreBtn, ActionSheet, Modal, Select } from '../../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';
import { retireTeam, unretireTeam } from '../../services/dataService';
import TeamFormModal from './TeamFormModal';
import TeamDuplicateResolutionView from './TeamDuplicateResolutionView';
import ChildrenOrphanWarning from './ChildrenOrphanWarning';

// Phase 2.3.c — Super admin CRUD for global /teams/ collection (132 docs).
// Per DESIGN_DECISIONS § 63.15.2 + § 63.15.2.X + § 63.15.2.X.1 +
// MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 3c.
//
// Uses raw useTeams (sees retired). User-facing consumers use useActiveTeams.
// Defense in depth: AdminGuard route, component check, Firestore rules from 2.3.b.
const PAGE_SIZE = 50;

export default function AdminTeamsPage() {
  const { effectiveIsAdmin } = useViewAs();
  const { teams, loading } = useTeams();
  const { players } = usePlayers();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(null);
  const [actionFor, setActionFor] = useState(null);
  const [retireFor, setRetireFor] = useState(null);
  const [resolveExternalId, setResolveExternalId] = useState(null);
  const [pending, setPending] = useState(false);
  const [retireError, setRetireError] = useState(null);

  if (!effectiveIsAdmin) return null;

  const search = searchParams.get('search') || '';
  const filter = searchParams.get('filter') || 'all';
  const sort = searchParams.get('sort') || 'name';
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

  // Detect externalId duplicate groups (instant, in-memory)
  const dupGroupsByExtId = useMemo(() => {
    const map = {};
    for (const t of teams) {
      const k = t.externalId && String(t.externalId).trim();
      if (!k) continue;
      (map[k] = map[k] || []).push(t);
    }
    const groups = {};
    Object.entries(map).forEach(([k, arr]) => { if (arr.length > 1) groups[k] = arr; });
    return groups;
  }, [teams]);

  const dupTeamIds = useMemo(() => {
    const set = new Set();
    Object.values(dupGroupsByExtId).forEach(arr => arr.forEach(t => set.add(t.id)));
    return set;
  }, [dupGroupsByExtId]);

  const childrenByParent = useMemo(() => {
    const map = {};
    for (const t of teams) {
      if (t.parentTeamId) (map[t.parentTeamId] = map[t.parentTeamId] || []).push(t);
    }
    return map;
  }, [teams]);

  const filtered = useMemo(() => {
    let result = teams;

    if (filter === 'active') result = result.filter(t => !t.retiredAt);
    else if (filter === 'parents') result = result.filter(t => !t.parentTeamId && (childrenByParent[t.id]?.length > 0));
    else if (filter === 'children') result = result.filter(t => !!t.parentTeamId);
    else if (filter === 'with-extid') result = result.filter(t => t.externalId);
    else if (filter === 'no-extid') result = result.filter(t => !t.externalId);
    else if (filter === 'duplicates') result = result.filter(t => dupTeamIds.has(t.id));
    else if (filter === 'retired') result = result.filter(t => !!t.retiredAt);
    // 'all' = no filter

    // Default: hide retired unless 'all' or 'retired' explicit
    if (filter !== 'all' && filter !== 'retired') {
      result = result.filter(t => !t.retiredAt);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => (t.name || '').toLowerCase().includes(q));
    }

    const tsMs = (t) => {
      if (!t) return 0;
      if (typeof t.toMillis === 'function') return t.toMillis();
      const d = new Date(t);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };

    const sorted = [...result];
    if (sort === 'updatedAt') {
      sorted.sort((a, b) => tsMs(b.updatedAt) - tsMs(a.updatedAt));
    } else {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return sorted;
  }, [teams, search, filter, sort, childrenByParent, dupTeamIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const dupGroupCount = Object.keys(dupGroupsByExtId).length;

  const handleRetireConfirm = async (childAction, newParentForChildren) => {
    if (!retireFor) return;
    setPending(true);
    setRetireError(null);
    try {
      await retireTeam(retireFor.id, {
        reason: `Manual retire by admin`,
        childAction,
        newParentForChildren,
      });
      setRetireFor(null);
      if (editing && editing !== 'new' && editing.id === retireFor.id) setEditing(null);
    } catch (err) {
      console.error('Retire team failed:', err);
      setRetireError(err?.message || 'Retire failed — see console');
    } finally {
      setPending(false);
    }
  };

  const handleRestore = async (team) => {
    setPending(true);
    try {
      await unretireTeam(team.id);
      setActionFor(null);
    } catch (err) {
      console.error('Restore team failed:', err);
      alert(`Restore failed: ${err?.message || 'see console'}`);
    } finally {
      setPending(false);
    }
  };

  const filterPills = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'parents', label: 'Parents' },
    { key: 'children', label: 'Children' },
    { key: 'with-extid', label: 'With extId' },
    { key: 'no-extid', label: 'No extId' },
    ...(dupGroupCount > 0 ? [{ key: 'duplicates', label: `⚠ Duplicates (${dupTeamIds.size})`, danger: true }] : []),
    { key: 'retired', label: '🗄 Retired' },
  ];

  return (
    <>
      <PageHeader back={{ to: '/' }} title="Teams admin" />
      <div style={{ padding: SPACE.lg, paddingBottom: 80 }}>

        {/* Duplicate banner */}
        {dupGroupCount > 0 && filter !== 'duplicates' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: SPACE.sm,
            padding: SPACE.sm, marginBottom: SPACE.md,
            background: COLORS.surfaceDark,
            border: `1px solid ${COLORS.accent}60`,
            borderRadius: RADIUS.md,
            fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.text,
          }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <span style={{ flex: 1 }}>
              {dupGroupCount} externalId {dupGroupCount === 1 ? 'duplicate' : 'duplicates'} detected.
            </span>
            <Btn variant="default" size="sm" onClick={() => updateParams({ filter: 'duplicates', page: 0 })}>
              Review duplicates →
            </Btn>
          </div>
        )}

        {/* Search + sort + create */}
        <div style={{ display: 'flex', gap: SPACE.xs, marginBottom: SPACE.sm, alignItems: 'stretch', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <Input
              value={search}
              onChange={(v) => updateParams({ search: v, page: 0 })}
              placeholder="Search team name…"
            />
          </div>
          <Select
            value={sort}
            onChange={(v) => updateParams({ sort: v, page: 0 })}
            style={{ minWidth: 160 }}
          >
            <option value="name">Sort: name ↑</option>
            <option value="updatedAt">Sort: updated ↓</option>
          </Select>
          <Btn variant="accent" onClick={() => setEditing('new')}>+ New team</Btn>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: SPACE.xs, marginBottom: SPACE.md, flexWrap: 'wrap' }}>
          {filterPills.map(p => (
            <Btn key={p.key}
              variant={filter === p.key ? (p.danger ? 'danger' : 'accent') : 'default'}
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
            : filtered.length === 0
              ? 'No teams match the current filter.'
              : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} of ${filtered.length}${teams.length !== filtered.length ? ` (filtered from ${teams.length})` : ''}`}
        </div>

        {/* List */}
        {!loading && filtered.length === 0 ? (
          <EmptyState icon="🛡" text="No teams" subtitle={search || filter !== 'all' ? 'Try changing the search or filter' : 'Phase 2.3.a bootstrap missing?'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
            {paged.map(t => {
              const isDup = dupTeamIds.has(t.id);
              const isRetired = !!t.retiredAt;
              const childCount = (childrenByParent[t.id] || []).length;
              const parts = [];
              if (t.parentTeamId) {
                const parent = teams.find(x => x.id === t.parentTeamId);
                parts.push(`child of ${parent?.name || '—'}`);
              } else if (childCount > 0) {
                parts.push(`parent · ${childCount} ${childCount === 1 ? 'child' : 'children'}`);
              }
              if (t.leagues?.length) parts.push(t.leagues.join('/'));
              if (t.externalId) parts.push(`extId ${t.externalId.slice(0, 8)}…`);
              if (isRetired) parts.push('🗄 retired');

              const titlePrefix = isDup ? '⚠ ' : '';
              return (
                <Card
                  key={t.id}
                  title={`${titlePrefix}${t.name || '—'}`}
                  subtitle={parts.join(' · ') || ' '}
                  onClick={() => setEditing(t)}
                  actions={<MoreBtn onClick={() => setActionFor(t)} />}
                />
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.md, marginTop: SPACE.lg }}>
            <Btn variant="default" size="sm" disabled={safePage === 0}
              onClick={() => updateParams({ page: safePage - 1 })}>← Prev</Btn>
            <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
              Page {safePage + 1} of {totalPages}
            </span>
            <Btn variant="default" size="sm" disabled={safePage >= totalPages - 1}
              onClick={() => updateParams({ page: safePage + 1 })}>Next →</Btn>
          </div>
        )}

        <div style={{ marginTop: SPACE.lg, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceDark, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 1.5 }}>
          <div style={{ color: COLORS.textDim, fontWeight: 600, marginBottom: 4 }}>About teams</div>
          Global resource (§ 63.15.2 + § 63.15.2.X). Sister team relationships (parent ↔ children) are in-app curation — PBLeagues does not model them. <code style={{ color: COLORS.text }}>externalId</code> is canonical only for PBLeagues-tracked leagues (NXL today). Soft delete via <code style={{ color: COLORS.text }}>retiredAt</code> — retired teams hidden from user-facing lists but preserved for audit + reference resolution.
          <br />Edits dual-write to both <code style={{ color: COLORS.text }}>/teams/</code> and legacy workspace path. Live updates via onSnapshot — all users see admin changes immediately.
        </div>
      </div>

      {/* Row action sheet (Edit / Resolve duplicate / Retire / Restore) */}
      <ActionSheet
        open={!!actionFor}
        onClose={() => setActionFor(null)}
        title={actionFor?.name}
        actions={actionFor ? [
          { label: 'Edit', onClick: () => { setEditing(actionFor); setActionFor(null); } },
          ...(dupTeamIds.has(actionFor.id) ? [{
            label: 'Resolve duplicate →',
            onClick: () => { setResolveExternalId(actionFor.externalId); setActionFor(null); },
          }] : []),
          ...(actionFor.retiredAt ? [{
            label: 'Restore',
            onClick: () => handleRestore(actionFor),
          }] : [{
            label: 'Retire',
            danger: true,
            onClick: () => { setRetireFor(actionFor); setActionFor(null); },
          }]),
        ] : []}
      />

      {/* Retire confirmation — branches on children */}
      <Modal
        open={!!retireFor}
        onClose={() => { if (!pending) { setRetireFor(null); setRetireError(null); } }}
        title={retireFor && (childrenByParent[retireFor.id]?.length > 0)
          ? `⚠ Retire ${retireFor.name} with ${childrenByParent[retireFor.id].length} children?`
          : `Retire ${retireFor?.name}?`}
        footer={null}
      >
        {retireFor && (
          <ChildrenOrphanWarning
            team={retireFor}
            children={childrenByParent[retireFor.id] || []}
            allTeams={teams}
            pending={pending}
            error={retireError}
            onCancel={() => { setRetireFor(null); setRetireError(null); }}
            onConfirm={handleRetireConfirm}
          />
        )}
      </Modal>

      {/* Duplicate resolution view */}
      {resolveExternalId && (
        <TeamDuplicateResolutionView
          open={!!resolveExternalId}
          onClose={() => setResolveExternalId(null)}
          dupTeams={dupGroupsByExtId[resolveExternalId] || []}
          allTeams={teams}
          allPlayers={players}
          childrenByParent={childrenByParent}
        />
      )}

      {/* Team form modal */}
      <TeamFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        team={editing === 'new' ? null : editing}
        allTeams={teams}
        childrenByParent={childrenByParent}
        onRequestRetire={(t) => { setRetireFor(t); }}
      />
    </>
  );
}
