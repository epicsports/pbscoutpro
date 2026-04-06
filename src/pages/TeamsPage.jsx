import React, { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import { Btn, Card, SectionTitle, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, ConfirmModal } from '../components/ui';
import { useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS, responsive } from '../utils/theme';
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
  const [divisions, setDivisions] = useState({});
  const [deletePassword, setDeletePassword] = useState('');
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

  const openAdd = () => { setName(''); setLeagues(['NXL']); setParentTeamId(''); setDivisions({}); modal.open('add'); };

  const handleAdd = async () => {
    if (!name.trim()) return;
    let teamLeagues = leagues;
    if (parentTeamId) {
      const parent = teams.find(t => t.id === parentTeamId);
      if (parent && JSON.stringify(leagues) === JSON.stringify(['NXL'])) {
        teamLeagues = parent.leagues || ['NXL'];
      }
    }
    await ds.addTeam({ name: name.trim(), leagues: teamLeagues, parentTeamId: parentTeamId || null, divisions });
    modal.close();
  };

  const handleDelete = async (id) => { await ds.deleteTeam(id); modal.close(); setDeletePassword(''); };

  // Group: parents first (sorted A-Z), then children (sorted A-Z) under them
  const parents = teams.filter(t => !t.parentTeamId).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const children = teams.filter(t => !!t.parentTeamId);
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
      <PageHeader title="Teams" />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64 }}>
        <SectionTitle right={<Btn variant="accent" onClick={openAdd}><Icons.Plus /> Team</Btn>}>
          <Icons.Users /> Teams ({teams.length})
        </SectionTitle>

        {loading && <SkeletonList count={4} />}
        {!loading && !teams.length && <EmptyState icon="🏴" text="Add your first team" />}

        {orderedTeams.map(t => (
          <div key={t.id} style={{ marginLeft: t._isChild ? 20 : 0, marginBottom: 6 }}>
            {t._isChild && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>---</span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>
                  2nd roster
                </span>
              </div>
            )}
            <Card
              icon={t._isChild ? '---' : '---'}
              title={t.name}
              badge={<span style={{ display: 'flex', gap: 3 }}>{(t.leagues || []).map(l => <LeagueBadge key={l} league={l} />)}</span>}
              onClick={() => navigate(`/team/${t.id}`)}
              actions={t._isParent && t._childCount > 0 ? (
                <span onClick={e => { e.stopPropagation(); toggleCollapse(t.id); }}
                  style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, padding: '4px 8px', cursor: 'pointer' }}>
                  {collapsedParents[t.id] ? `+${t._childCount}` : `${t._childCount}`}
                </span>
              ) : null}
            />
          </div>
        ))}
      </div>

      {/* Add team */}
      <Modal open={modal.is('add')} onClose={() => modal.close()} title="New team"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Cancel</Btn>
          <Btn variant="accent" onClick={handleAdd} disabled={!name.trim()}><Icons.Check /> Add</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Team name..." autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Leagues</div>
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
              Parent team <span style={{ color: COLORS.textMuted }}>(optional - 2nd roster)</span>
            </div>
            <ParentSelect value={parentTeamId} onChange={setParentTeamId} />
          </div>
          {leagues.some(l => DIVISIONS[l]) && (
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Divisions</div>
              {leagues.filter(l => DIVISIONS[l]).map(l => (
                <div key={l} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: LEAGUE_COLORS[l], fontWeight: 700, width: 36 }}>{l}:</span>
                  {DIVISIONS[l].map(d => {
                    const active = divisions[l] === d;
                    return <Btn key={d} variant="default" size="sm" active={active}
                      onClick={() => setDivisions(prev => ({ ...prev, [l]: active ? null : d }))}
                      style={{ fontSize: FONT_SIZE.xxs, padding: '2px 6px', minHeight: 36 }}>{d}</Btn>;
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal open={modal.is('delete')} onClose={() => { modal.close(); setDeletePassword(''); }}
        title="Delete team?" danger confirmLabel="Delete"
        message={`Delete "${modal.value?.name}"?`}
        requirePassword={workspace?.slug}
        password={deletePassword} onPasswordChange={v => setDeletePassword(v)}
        onConfirm={() => handleDelete(modal.value?.id)} />
    </div>
  );
}
