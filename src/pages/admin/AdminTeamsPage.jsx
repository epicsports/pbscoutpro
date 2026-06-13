import React, { useMemo, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useViewAs } from '../../hooks/useViewAs';
import { useTeams, usePlayers } from '../../hooks/useFirestore';
import { useLeagues } from '../../hooks/useLeagues';
import PageHeader from '../../components/PageHeader';
import Screen from '../../components/Screen';
import { Btn, Card, EmptyState, MoreBtn, ActionSheet, Modal, Select } from '../../components/ui';
import SearchFilterPanel from '../../components/SearchFilterPanel';
import TeamBadge from '../../components/TeamBadge';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';
import { retireTeam, unretireTeam } from '../../services/dataService';
import { teamInLeague, teamInDivision } from '../../utils/entityFilters';
import { useSearchFilter } from '../../hooks/useSearchFilter';
import TeamFormModal from './TeamFormModal';
import TeamDuplicateResolutionView from './TeamDuplicateResolutionView';
import ChildrenOrphanWarning from './ChildrenOrphanWarning';
import { useLanguage } from '../../hooks/useLanguage';

// Phase 2.3.c — Super admin CRUD for global /teams/ collection (132 docs).
// Per DESIGN_DECISIONS § 63.15.2 + § 63.15.2.X + § 63.15.2.X.1 +
// MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 3c.
//
// Uses raw useTeams (sees retired). User-facing consumers use useActiveTeams.
// Defense in depth: AdminGuard route, component check, Firestore rules from 2.3.b.
const PAGE_SIZE = 50;
// Stable module-scope fields ref so useSearchFilter's memo doesn't re-run each
// render. Admin team search = name + externalId (PBLeagues id).
const TEAM_SEARCH_FIELDS = ['name', 'externalId'];
const tsMs = (t) => {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

export default function AdminTeamsPage() {
  const { t } = useLanguage();
  const { effectiveIsAdmin } = useViewAs();
  const navigate = useNavigate();
  const { teams, loading } = useTeams();
  const { players } = usePlayers();
  const leaguesList = useLeagues();
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
  const liga = searchParams.get('liga') || '';
  const dyw = searchParams.get('dyw') || '';
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
  // Changing Liga clears Dywizja (divisions are league-scoped).
  const setLiga = (v) => updateParams({ liga: v, dyw: '', page: 0 });

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

  // Structured filters folded into a predicate for the shared useSearchFilter
  // pipeline (search via matchEntity → predicate → sort → paginate). Admin pills
  // (active/parents/children/extid/duplicates/retired) keep their bespoke UX;
  // Liga/Dywizja are NEW (derived/direct on team via entityFilters).
  const predicate = useCallback((t) => {
    if (filter === 'active' && t.retiredAt) return false;
    else if (filter === 'parents' && !(!t.parentTeamId && childrenByParent[t.id]?.length > 0)) return false;
    else if (filter === 'children' && !t.parentTeamId) return false;
    else if (filter === 'with-extid' && !t.externalId) return false;
    else if (filter === 'no-extid' && t.externalId) return false;
    else if (filter === 'duplicates' && !dupTeamIds.has(t.id)) return false;
    else if (filter === 'retired' && !t.retiredAt) return false;
    // Default: hide retired unless 'all' or 'retired' explicit
    if (filter !== 'all' && filter !== 'retired' && t.retiredAt) return false;
    if (!teamInLeague(t, liga)) return false;
    if (!teamInDivision(t, dyw, liga)) return false;
    return true;
  }, [filter, childrenByParent, dupTeamIds, liga, dyw]);

  const sortFn = useCallback((a, b) => (
    sort === 'updatedAt'
      ? tsMs(b.updatedAt) - tsMs(a.updatedAt)
      : (a.name || '').localeCompare(b.name || '')
  ), [sort]);

  const { paged, total, totalPages } = useSearchFilter({
    items: teams, search, fields: TEAM_SEARCH_FIELDS,
    predicate, sort: sortFn, page, pageSize: PAGE_SIZE,
  });
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;

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

  // Liga → Dywizja kit filters (canonical order). Dywizja options come from the
  // selected Liga's divisions; teams carry a per-league division directly.
  const divisionOptions = (leaguesList.find(L => L.shortName === liga)?.divisions || [])
    .map(d => ({ value: d.name, label: d.name }));
  const searchFilters = [
    { key: 'liga', label: 'Liga', value: liga, onChange: setLiga, allLabel: 'wszystkie', options: leaguesList.map(L => ({ value: L.shortName, label: L.shortName })) },
    { key: 'dyw', label: 'Dywizja', value: dyw, onChange: (v) => updateParams({ dyw: v, page: 0 }), allLabel: 'wszystkie', options: divisionOptions },
  ];

  return (
    <Screen archetype="list" padBottom={false} header={<PageHeader back={{ to: '/' }} title={t('b13_teams_admin')} />}>
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

        {/* Search + Liga + Dywizja (shared kit) */}
        <SearchFilterPanel
          search={search}
          onSearchChange={(v) => updateParams({ search: v, page: 0 })}
          searchPlaceholder="🔍 Search team name or extId…"
          filters={searchFilters}
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
            : total === 0
              ? 'No teams match the current filter.'
              : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, total)} of ${total}${teams.length !== total ? ` (filtered from ${teams.length})` : ''}`}
        </div>

        {/* List */}
        {!loading && total === 0 ? (
          <EmptyState icon="🛡" text={t('b13_admin_no_teams')} subtitle={search || filter !== 'all' || liga ? 'Try changing the search or filter' : 'Phase 2.3.a bootstrap missing?'} />
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
                  iconLeft={<TeamBadge team={t} size={36} />}
                  title={`${titlePrefix}${t.name || '—'}`}
                  subtitle={parts.join(' · ') || ' '}
                  /* § admin-parity — body-tap opens the SHARED team-detail view
                     (roster + leagues/divisions); ⋮ keeps the admin metadata
                     form (parent/extId/retire) + duplicate-resolve. */
                  onClick={() => navigate(`/team/${t.id}?from=admin`)}
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
              onClick={() => updateParams({ page: safePage - 1 })}>{t('admin_teams_prev')}</Btn>
            <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
              {t('admin_teams_page_n_of_m', safePage + 1, totalPages)}
            </span>
            <Btn variant="default" size="sm" disabled={safePage >= totalPages - 1}
              onClick={() => updateParams({ page: safePage + 1 })}>{t('admin_teams_next')}</Btn>
          </div>
        )}

        <div style={{ marginTop: SPACE.lg, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceDark, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 1.5 }}>
          <div style={{ color: COLORS.textDim, fontWeight: 600, marginBottom: 4 }}>{t('admin_teams_about_title')}</div>
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
          { label: t('edit'), onPress: () => { setEditing(actionFor); setActionFor(null); } },
          ...(dupTeamIds.has(actionFor.id) ? [{
            label: t('admin_teams_action_resolve_dup'),
            onPress: () => { setResolveExternalId(actionFor.externalId); setActionFor(null); },
          }] : []),
          ...(actionFor.retiredAt ? [{
            label: t('admin_teams_action_restore'),
            onPress: () => handleRestore(actionFor),
          }] : [{
            label: t('admin_teams_action_retire'),
            danger: true,
            onPress: () => { setRetireFor(actionFor); setActionFor(null); },
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
    </Screen>
  );
}
