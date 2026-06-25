/**
 * PlayersPage — the workspace roster manager: add / edit / delete players +
 * coaching staff + support staff, with search + URL-backed filters.
 *
 * Wide (≥720px viewport): renders RosterManageWide — a sticky-toolbar,
 * role-grouped (Coaching / Players / Support) responsive auto-fill grid of
 * avatar-ring cards, wired to the SAME real roster data + add/edit/delete
 * actions. Phone (<720px): the existing list, UNCHANGED (additive dispatch).
 */
import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';

import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import RdIcon from '../components/RdIcon';
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
import { COLORS, ELEV, FONT, FONT_SIZE, TYPE, TRACKING, TNUM, TOUCH, RADIUS, responsive } from '../utils/theme';
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

  // ── Wide dispatch (≥720) — role-grouped card-grid variant; phone path untouched ──
  const wide = device.width >= 720;

  return (
    <Screen archetype="list" padBottom={false} style={{ display: 'flex', flexDirection: 'column' }}
      header={<PageHeader back={{ to: '/' }} title={t('players_label')} />}>
      {wide ? (
        <RosterManageWide
          t={t}
          loading={loading}
          players={filtered}
          totalCount={players.length}
          search={search}
          onSearchChange={v => setParam('q', v)}
          isSuperAdmin={isSuperAdmin}
          getTeamName={getTeamName}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={(p) => modal.open({ type: 'delete', id: p.id, name: playerDisplayName(p) })}
        />
      ) : (
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
      )}

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

// ════════════════════════════════════════════════════════════════════════════
// RosterManageWide — sticky-toolbar, role-grouped (Coaching / Players / Support)
// responsive auto-fill card grid. Wired to the page's REAL roster + the SAME
// add / edit / delete actions; no mock data. Ported (look) from prototype
// redesign6.jsx:602 (RosterManageWide / WRosterCard / WRosterGroup) → our theme
// tokens (COLORS/ELEV/FONT/RADIUS/TYPE/TRACKING/TNUM/TOUCH), RdIcon, no emoji.
//
// § 27: amber is reserved for the HERO accent + the Add CTA + the active card
// ring (interactive/active only). Group accents (info / textDim) are non-amber.
// The whole card navigates → edit, so it carries NO chevron; the only inline
// affordance is a super_admin-only delete button (stop-propagated).
// ════════════════════════════════════════════════════════════════════════════
const isPlayerRole = (p) => !p.role || p.role === 'player';

function WRosterGroup({ icon, title, count, accent, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, color: accent || COLORS.textDim, flexShrink: 0,
        }}><RdIcon name={icon} size={16} /></span>
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.textDim, letterSpacing: TRACKING.label }}>{title}</span>
        <span style={{
          fontFamily: FONT, fontSize: 12, fontWeight: 800, color: COLORS.textMuted,
          background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: RADIUS.full, padding: '2px 9px', ...TNUM,
        }}>{count}</span>
        <div style={{ flex: 1, height: 1, background: ELEV.hairline }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 12 }}>{children}</div>
    </div>
  );
}

// Single roster card. Player → avatar in a HERO/neutral ring + jersey-number
// badge; coach/staff → avatar in a role-tinted ring + role icon-badge and a
// role eyebrow. Whole card opens edit. Edge cases: PlayerAvatar self-handles
// the empty-photo → initials ring; long names wrap to 2 lines (no shrink); a
// missing nickname drops the eyebrow; a missing number falls back to the role
// icon badge so nothing renders "#" with no value.
function WRosterCard({ p, roleColor, teamName, canDelete, onEdit, onDelete, t }) {
  const player = isPlayerRole(p);
  const hero = !!p.hero;
  const ring = player ? (hero ? COLORS.accent : ELEV.hairlineStrong) : roleColor;
  const num = (p.number ?? '').toString().trim();
  const nick = (p.nickname || '').trim();
  const roleLabel = p.role === 'coach' ? t('role_coach') : t('role_staff');
  // Class is the per-player descriptor (Pro / D1 …); team name is the fallback.
  const sub = p.playerClass || teamName;
  return (
    <div
      onClick={onEdit}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 14,
        padding: 15, minHeight: TOUCH.targetLg, cursor: 'pointer', boxSizing: 'border-box',
        background: ELEV.surface, borderRadius: RADIUS.lg,
        border: `1px solid ${hero ? COLORS.accentA40 : ELEV.hairline}`,
        boxShadow: ELEV.shadow1,
      }}
    >
      {/* avatar in a role/HERO ring + number-or-role badge */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <PlayerAvatar player={p} size={54} ringColor={ring} />
        {player && num
          ? <span style={{
              position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
              background: hero ? COLORS.accent : ELEV.surface, color: hero ? COLORS.black : COLORS.textDim,
              border: `2px solid ${ELEV.surface}`, borderRadius: RADIUS.full,
              fontFamily: FONT, fontSize: 11, fontWeight: 800, padding: '1px 8px', ...TNUM,
            }}>#{num}</span>
          : <span style={{
              position: 'absolute', bottom: -4, right: -4, width: 21, height: 21, borderRadius: '50%',
              background: roleColor, border: `2px solid ${ELEV.surface}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.white,
            }}><RdIcon name={p.role === 'coach' ? 'book' : (player ? 'jersey' : 'building')} size={11} /></span>}
      </div>

      {/* name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!player && (
          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.8px', color: roleColor, marginBottom: 3 }}>
            {roleLabel.toUpperCase()}
          </div>
        )}
        <div style={{
          fontFamily: FONT, fontSize: 15.5, fontWeight: 800, color: COLORS.text, lineHeight: 1.2,
          letterSpacing: TRACKING.tight,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {p.name}{player && nick && <span style={{ color: COLORS.textDim, fontWeight: 600 }}> „{nick}"</span>}
        </div>
        {player && (sub || hero) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, flexWrap: 'wrap' }}>
            {sub && <span style={{ fontFamily: FONT, fontSize: 12.5, color: COLORS.textMuted }}>{sub}</span>}
            {hero && <span style={{
              fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.accent,
              background: COLORS.accentA12, border: `1px solid ${COLORS.accentA40}`, borderRadius: RADIUS.sm,
              padding: '2px 7px', letterSpacing: '.4px',
            }}>★ HERO</span>}
          </div>
        )}
      </div>

      {/* super_admin-only delete (stop-propagated so it doesn't open edit) */}
      {canDelete && (
        <button
          type="button"
          aria-label={t('b13_aria_delete_player')}
          title={t('b13_aria_delete_player')}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            flexShrink: 0, width: TOUCH.minTarget, height: TOUCH.minTarget,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: RADIUS.md,
            color: COLORS.textMuted, cursor: 'pointer',
          }}
        ><RdIcon name="trash" size={17} /></button>
      )}
    </div>
  );
}

function RosterManageWide({ t, loading, players, totalCount, search, onSearchChange, isSuperAdmin, getTeamName, onAdd, onEdit, onDelete }) {
  const coaches = players.filter(p => p.role === 'coach');
  const roster = players.filter(isPlayerRole);
  const staff = players.filter(p => p.role === 'staff');
  const heroCount = roster.filter(p => p.hero).length;

  const card = (p, roleColor) => (
    <WRosterCard
      key={p.id} p={p} roleColor={roleColor} teamName={getTeamName(p.teamId)}
      canDelete={isSuperAdmin} t={t}
      onEdit={() => onEdit(p)} onDelete={() => onDelete(p)}
    />
  );

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', background: ELEV.bg, fontFamily: FONT }}>
      {/* ── sticky toolbar: search + count + HERO tally + add ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '14px 28px', borderBottom: `1px solid ${ELEV.hairline}`,
        background: `${ELEV.bg}f2`, backdropFilter: 'blur(8px)',
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220, maxWidth: 420 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, display: 'flex', pointerEvents: 'none' }}>
            <RdIcon name="user" size={15} />
          </span>
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('players_search_ph')}
            style={{
              width: '100%', boxSizing: 'border-box', minHeight: TOUCH.minTarget,
              padding: '10px 12px 10px 34px', borderRadius: RADIUS.md,
              background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`,
              color: COLORS.text, fontFamily: FONT, fontSize: FONT_SIZE.base, outline: 'none',
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700, color: COLORS.textMuted, ...TNUM }}>
          {t('players_count_title', totalCount)}
        </span>
        {heroCount > 0 && (
          <span style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.accent,
            background: COLORS.accentA12, border: `1px solid ${COLORS.accentA40}`, borderRadius: RADIUS.full,
            padding: '4px 10px', letterSpacing: '.3px',
          }}>{heroCount} HERO</span>
        )}
        <Btn variant="accent" size="sm" onClick={onAdd}>
          <Icons.Plus /> {t('players_add_btn')}
        </Btn>
      </div>

      {/* ── grouped grid ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 28px 56px', boxSizing: 'border-box' }}>
        {loading && <SkeletonList count={5} />}

        {!loading && totalCount === 0 && (
          <EmptyState icon="👤" text={t('players_empty_add_first')} />
        )}

        {!loading && totalCount > 0 && players.length === 0 && (
          <div style={{ padding: '64px 16px', textAlign: 'center', color: COLORS.textMuted, fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: 0.6 }}>
              <RdIcon name="user" size={30} />
            </div>
            {t('no_results')}
          </div>
        )}

        {!loading && players.length > 0 && (
          <>
            {coaches.length > 0 && (
              <WRosterGroup icon="book" title={t('roster_group_coaching').toUpperCase()} count={coaches.length} accent={COLORS.info}>
                {coaches.map(p => card(p, COLORS.info))}
              </WRosterGroup>
            )}
            {roster.length > 0 && (
              <WRosterGroup icon="jersey" title={t('roster_group_players').toUpperCase()} count={roster.length} accent={COLORS.textDim}>
                {roster.map(p => card(p, COLORS.textDim))}
              </WRosterGroup>
            )}
            {staff.length > 0 && (
              <WRosterGroup icon="building" title={t('roster_group_staff').toUpperCase()} count={staff.length} accent={COLORS.textDim}>
                {staff.map(p => card(p, COLORS.textDim))}
              </WRosterGroup>
            )}
          </>
        )}
      </div>
    </div>
  );
}
