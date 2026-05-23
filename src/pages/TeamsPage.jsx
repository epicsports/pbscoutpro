import React, { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import { Btn, Card, SectionTitle, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, ConfirmModal } from '../components/ui';
import { useActiveTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, TOUCH, LEAGUE_COLORS, responsive } from '../utils/theme';
import { useLeagues } from '../hooks/useLeagues';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';

export default function TeamsPage() {
  const { t } = useLanguage();
  const device = useDevice();
  const R = responsive(device.type);
  const navigate = useNavigate();
  const { teams, loading } = useActiveTeams();
  const modal = useModal();
  const { workspace } = useWorkspace();
  const leaguesList = useLeagues();
  // Per-shortName divisions lookup (avoids hooks-in-loop pattern)
  const divisionsByShortName = Object.fromEntries(
    leaguesList.map(L => [L.shortName, L.divisions || []])
  );
  // Legacy-order short-name list for sort stability (matches old LEAGUES const order)
  const leagueShortNamesOrder = leaguesList.map(L => L.shortName);

  const [name, setName] = useState('');
  const [leagues, setLeagues] = useState(['NXL']);
  const [parentTeamId, setParentTeamId] = useState('');
  const [divisions, setDivisions] = useState({});
  const [externalId, setExternalId] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [search, setSearch] = useState('');
  const [filterLeague, setFilterLeague] = useState('');
  const [collapsedParents, setCollapsedParents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('teamsPage_collapsed') || '{}'); } catch { return {}; }
  });

  const toggleCollapse = (parentId) => {
    setCollapsedParents(prev => {
      const next = { ...prev, [parentId]: !prev[parentId] };
      localStorage.setItem('teamsPage_collapsed', JSON.stringify(next));
      return next;
    });
  };

  const openAdd = () => { setName(''); setLeagues(['NXL']); setParentTeamId(''); setDivisions({}); setExternalId(''); modal.open('add'); };

  const handleAdd = async () => {
    if (!name.trim()) return;
    let teamLeagues = leagues;
    if (parentTeamId) {
      const parent = teams.find(t => t.id === parentTeamId);
      if (parent && JSON.stringify(leagues) === JSON.stringify(['NXL'])) {
        teamLeagues = parent.leagues || ['NXL'];
      }
    }
    await ds.addTeam({ name: name.trim(), leagues: teamLeagues, parentTeamId: parentTeamId || null, externalId: externalId.trim() || null, divisions });
    modal.close();
  };

  // Phase 2.3.d (2026-05-23) — UI "delete team" → retire (soft, recoverable).
  const handleDelete = async (id) => { await ds.retireTeam(id); modal.close(); setDeletePassword(''); };

  // Group: parents first (sorted A-Z), then children (sorted A-Z) under them
  // Apply search + league filter, keeping parent visible if any child matches
  const q = search.trim().toLowerCase();
  const matchesTeam = (t) => {
    if (filterLeague && !(t.leagues || []).includes(filterLeague)) return false;
    if (q && !(t.name || '').toLowerCase().includes(q) && !(t.externalId || '').includes(q)) return false;
    return true;
  };

  const allParents = teams.filter(t => !t.parentTeamId).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const allChildren = teams.filter(t => !!t.parentTeamId);

  // Build visible set: team matches OR any of its children match
  const visibleIds = new Set();
  teams.forEach(t => { if (matchesTeam(t)) visibleIds.add(t.id); });
  // If a child is visible, make its parent visible too
  allChildren.forEach(c => { if (visibleIds.has(c.id)) visibleIds.add(c.parentTeamId); });

  const parents = allParents.filter(p => visibleIds.has(p.id));
  const children = allChildren.filter(c => visibleIds.has(c.id));
  const orphans = children.filter(c => !teams.find(t => t.id === c.parentTeamId));

  const orderedTeams = [];
  parents.forEach(p => {
    const kids = children.filter(c => c.parentTeamId === p.id).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    orderedTeams.push({ ...p, _isParent: true, _childCount: kids.length });
    if (!collapsedParents[p.id]) {
      kids.forEach(c => orderedTeams.push({ ...c, _isChild: true }));
    }
  });
  orphans.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(t => orderedTeams.push({ ...t, _isParent: true, _childCount: 0 }));

  const hasFilters = !!search || !!filterLeague;

  const leagueToggle = (l, currentLeagues, setter) => {
    const a = currentLeagues.includes(l);
    const next = a ? currentLeagues.filter(x => x !== l) : [...currentLeagues, l];
    if (next.length) setter(next);
  };

  const ParentSelect = ({ value, onChange, excludeId }) => (
    <Select value={value} onChange={onChange} style={{ width: '100%' }}>
      <option value="">--- none (main team) ---</option>
      {teams.filter(t => t.id !== excludeId && !t.parentTeamId).sort((a, b) => a.name.localeCompare(b.name)).map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </Select>
  );

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: '/' }} title="Teams" subtitle="ROSTER MANAGEMENT" />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64 }}>
        <SectionTitle right={<Btn variant="accent" onClick={openAdd}><Icons.Plus /> Team</Btn>}>
          Teams ({teams.length})
        </SectionTitle>

        <div style={{ marginBottom: 12 }}>
          <Input value={search} onChange={setSearch} placeholder="🔍 Search by name..." />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <Select value={filterLeague} onChange={setFilterLeague} style={{ flex: 1, fontSize: 12 }}>
            <option value="">Liga: wszystkie</option>
            {leaguesList.map(L => <option key={L.id} value={L.shortName}>{L.shortName}</option>)}
          </Select>
          {hasFilters && (
            <Btn variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterLeague(''); }}
              style={{ color: COLORS.danger, fontSize: 11, padding: '4px 8px' }}>
              ✕ Wyczyść
            </Btn>
          )}
        </div>

        {loading && <SkeletonList count={4} />}
        {!loading && !orderedTeams.length && <EmptyState icon="🏴" text={hasFilters ? 'Brak wyników' : 'Add your first team'} />}

        {orderedTeams.map(t => {
          const sortedLeagues = (t.leagues || []).sort((a, b) => leagueShortNamesOrder.indexOf(a) - leagueShortNamesOrder.indexOf(b));
          return (
            <div key={t.id} style={{ marginLeft: t._isChild ? 20 : 0, marginBottom: 6 }}>
              {t._isChild && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>&#8627;</span>
                  <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>
                    2nd roster
                  </span>
                </div>
              )}
              <Card
                title={t.name}
                subtitle={[
                  t.externalId && `ID: ${t.externalId}`,
                  Object.entries(t.divisions || {}).filter(([,v]) => v).map(([l,d]) => `${l}: ${d}`).join(', '),
                ].filter(Boolean).join(' · ') || null}
                badge={<span style={{ display: 'flex', gap: 3 }}>{sortedLeagues.map(l => <LeagueBadge key={l} league={l} />)}</span>}
                onClick={() => navigate(`/team/${t.id}`)}
                actions={t._isParent && t._childCount > 0 ? (
                  <span onClick={e => { e.stopPropagation(); toggleCollapse(t.id); }}
                    style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, padding: '6px 8px', cursor: 'pointer' }}>
                    {collapsedParents[t.id] ? '▶' : '▼'} {t._childCount}
                  </span>
                ) : null}
              />
            </div>
          );
        })}
      </div>

      {/* Add team */}
      <Modal open={modal.is('add')} onClose={() => modal.close()} title="New team"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={handleAdd} disabled={!name.trim()}><Icons.Check /> Add</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Team name..." autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <Input value={externalId} onChange={setExternalId} placeholder="PBLeagues Team ID (optional)" />
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Leagues</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {leaguesList.map(L => {
                const l = L.shortName;
                const a = leagues.includes(l);
                return <Btn key={L.id} variant="default" size="sm" active={a}
                  style={{ borderColor: a ? LEAGUE_COLORS[l] : COLORS.border, color: a ? LEAGUE_COLORS[l] : COLORS.textDim }}
                  onClick={() => leagueToggle(l, leagues, setLeagues)}>{l}</Btn>;
              })}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>
              Parent team <span style={{ color: COLORS.textMuted }}>(optional - 2nd roster)</span>
            </div>
            <ParentSelect value={parentTeamId} onChange={setParentTeamId} />
          </div>
          {leagues.some(l => (divisionsByShortName[l] || []).length > 0) && (
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Divisions</div>
              {leagues.filter(l => (divisionsByShortName[l] || []).length > 0).map(l => (
                <div key={l} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: LEAGUE_COLORS[l], fontWeight: 700, width: 36 }}>{l}:</span>
                  {(divisionsByShortName[l] || []).map(d => {
                    const active = divisions[l] === d.name;
                    return <Btn key={d.id} variant="default" size="sm" active={active}
                      onClick={() => setDivisions(prev => ({ ...prev, [l]: active ? null : d.name }))}
                      style={{ fontSize: FONT_SIZE.xxs, padding: '2px 6px', minHeight: 44 }}>{d.name}</Btn>;
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal open={modal.is('delete')} onClose={() => { modal.close(); setDeletePassword(''); }}
        title="Delete team?" danger confirmLabel="Delete"
        message={`"${modal.value?.name}" will be removed from your teams. Scouted data is preserved and an admin can restore the team.`}
        requirePassword={workspace?.slug}
        password={deletePassword} onPasswordChange={v => setDeletePassword(v)}
        onConfirm={() => handleDelete(modal.value?.id)} />
    </div>
  );
}
