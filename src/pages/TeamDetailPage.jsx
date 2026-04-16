import React, { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Input, Icons, ConfirmModal } from '../components/ui';
import PlayerEditModal from '../components/PlayerEditModal';
import { useTeams, usePlayers } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS, responsive } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

export default function TeamDetailPage() {
  const { t } = useLanguage();
  const device = useDevice();
  const R = responsive(device.type);
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { workspace } = useWorkspace();
  const modal = useModal();

  // Add-new-player simple form
  const [fName, setFName] = useState('');
  const [fNick, setFNick] = useState('');
  const [fNumber, setFNumber] = useState('');
  const [searchAdd, setSearchAdd] = useState('');

  // Full edit (shared modal)
  const [editPlayer, setEditPlayer] = useState(null);

  // Delete team
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const team = teams.find(t => t.id === teamId);
  const teamPlayers = players
    .filter(p => p.teamId === teamId)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const otherPlayers = players.filter(p => p.teamId !== teamId);
  const searchResults = searchAdd
    ? otherPlayers.filter(p =>
        (p.name || '').toLowerCase().includes(searchAdd.toLowerCase()) ||
        (p.nickname || '').toLowerCase().includes(searchAdd.toLowerCase()) ||
        (p.number || '').includes(searchAdd)
      ).sort((a, b) => (a.name || '').localeCompare(b.name || '')).slice(0, 8)
    : [];

  if (!team) return <EmptyState icon="?" text="Loading..." />;

  const handleAddNewPlayer = async () => {
    if (!fName.trim() || !fNumber.trim()) return;
    await ds.addPlayer({ name: fName.trim(), nickname: fNick.trim(), number: fNumber.trim(), teamId });
    modal.close(); setFName(''); setFNick(''); setFNumber('');
  };

  const handleAssignPlayer = async (playerId) => {
    const player = players.find(p => p.id === playerId);
    await ds.changePlayerTeam(playerId, teamId, player?.teamHistory || []);
    setSearchAdd('');
  };

  const handleRemoveFromTeam = async (playerId) => {
    const player = players.find(p => p.id === playerId);
    await ds.changePlayerTeam(playerId, null, player?.teamHistory || []);
  };

  const handleToggleLeague = async (league) => {
    const next = team.leagues.includes(league)
      ? team.leagues.filter(l => l !== league)
      : [...team.leagues, league];
    if (next.length > 0) await ds.updateTeam(teamId, { leagues: next });
  };

  const handleEditSave = async (formData) => {
    if (formData.teamId !== (editPlayer.teamId || null)) {
      await ds.changePlayerTeam(editPlayer.id, formData.teamId, editPlayer.teamHistory || []);
    }
    await ds.updatePlayer(editPlayer.id, formData);
    setEditPlayer(null);
  };

  const handleDeleteTeam = async () => {
    await ds.deleteTeam(teamId);
    navigate('/teams');
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: '/teams' }} title={team.name} subtitle="TEAM PROFILE" />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80, padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: R.layout.gap * 2 }}>

        {/* Team info */}
        <div>
          <SectionLabel>Leagues</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LEAGUES.map(l => {
              const a = team.leagues.includes(l);
              return <Btn key={l} variant="default" size="sm" active={a}
                style={{ borderColor: a ? LEAGUE_COLORS[l] : COLORS.border, color: a ? LEAGUE_COLORS[l] : COLORS.textDim }}
                onClick={() => handleToggleLeague(l)}>{l}</Btn>;
            })}
          </div>
          {team.leagues.filter(l => DIVISIONS[l]).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Divisions</div>
              {team.leagues.filter(l => DIVISIONS[l]).map(l => (
                <div key={l} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: LEAGUE_COLORS[l], fontWeight: 700, width: 30 }}>{l}:</span>
                  {DIVISIONS[l].map(d => {
                    const cur = (team.divisions || {})[l];
                    return <Btn key={d} variant="default" size="sm" active={cur === d}
                      onClick={() => ds.updateTeam(teamId, { divisions: { ...(team.divisions || {}), [l]: cur === d ? null : d } })}
                      style={{ fontSize: FONT_SIZE.xxs, padding: '2px 6px', minHeight: 44 }}>{d}</Btn>;
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Roster */}
        <div>
          <SectionTitle right={
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="accent" size="sm" onClick={() => { setFName(''); setFNick(''); setFNumber(''); modal.open('addNew'); }}>
                <Icons.Plus /> New
              </Btn>
              <Btn variant="default" size="sm" onClick={() => modal.open('addExisting')}>
                <Icons.Search /> Find
              </Btn>
            </div>
          }>
            Roster ({teamPlayers.length})
          </SectionTitle>

          {!teamPlayers.length && <EmptyState icon="?" text="Add players to this team" />}

          {teamPlayers.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
              borderRadius: RADIUS.lg, background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
              marginBottom: 6, minHeight: TOUCH.minTarget,
            }}>
              <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: TOUCH.fontLg, color: COLORS.accent, minWidth: 36 }}>
                #{p.number}
              </span>
              <div
                onClick={() => navigate(`/player/${p.id}/stats?scope=global`)}
                style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, fontWeight: 600 }}>{p.name}</div>
                {p.nickname && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>{p.nickname}</div>}
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>
                  {[p.age && `${p.age} y/o`, p.favoriteBunker, p.pbliId && `PBLI: ${p.pbliId}`].filter(Boolean).join(' - ') || ''}
                </div>
              </div>
              {/* HERO toggle — global (§ 25) */}
              <div
                onClick={() => ds.setPlayerHero(p.id, !p.hero)}
                title={p.hero ? 'Remove HERO rank' : 'Mark as HERO'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 8px', borderRadius: RADIUS.sm, cursor: 'pointer',
                  background: p.hero ? '#f59e0b12' : 'transparent',
                  border: `1px solid ${p.hero ? '#f59e0b25' : COLORS.surfaceLight}`,
                  minHeight: 44,
                }}>
                <span style={{ fontSize: 12, color: p.hero ? COLORS.accent : COLORS.textMuted }}>★</span>
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '.4px', color: p.hero ? COLORS.accent : COLORS.textMuted }}>HERO</span>
              </div>
              <Btn variant="ghost" size="sm" onClick={() => setEditPlayer(p)} title="Edit profile"><Icons.Edit /></Btn>
              <Btn variant="ghost" size="sm" onClick={() => handleRemoveFromTeam(p.id)} title="Remove from team"><Icons.Trash /></Btn>
            </div>
          ))}
        </div>

        {/* Delete team */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setDeleteModal(true)}
            style={{ color: COLORS.danger, width: '100%', justifyContent: 'center' }}>
            <Icons.Trash /> Delete team
          </Btn>
        </div>
      </div>

      {/* Add new player (quick form) */}
      <Modal open={modal.is('addNew')} onClose={() => modal.close()} title="New player"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={handleAddNewPlayer} disabled={!fName.trim() || !fNumber.trim()}><Icons.Check /> Add</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}><Input value={fName} onChange={setFName} placeholder="Full name *" autoFocus /></div>
            <div style={{ flex: 1 }}><Input value={fNumber} onChange={setFNumber} placeholder="Nr *" /></div>
          </div>
          <Input value={fNick} onChange={setFNick} placeholder="Nickname" />
        </div>
      </Modal>

      {/* Search existing player */}
      <Modal open={modal.is('addExisting')} onClose={() => modal.close()} title="Add existing player">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input value={searchAdd} onChange={setSearchAdd} placeholder="Search by name, nickname, number..." autoFocus />
          {searchResults.length > 0 && (
            <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {searchResults.map(p => {
                const currentTeam = teams.find(t => t.id === p.teamId);
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    borderRadius: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    cursor: 'pointer', minHeight: 40,
                  }} onClick={() => handleAssignPlayer(p.id)}>
                    <span style={{ fontFamily: FONT, fontWeight: 800, color: COLORS.accent }}>#{p.number}</span>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, flex: 1 }}>
                      {p.name} {p.nickname && <span style={{ color: COLORS.textDim }}>{p.nickname}</span>}
                    </span>
                    {currentTeam && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>{currentTeam.name}</span>}
                    <Icons.Plus />
                  </div>
                );
              })}
            </div>
          )}
          {searchAdd && !searchResults.length && (
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 8 }}>
              No results. Create a new player.
            </div>
          )}
        </div>
      </Modal>

      {/* Full edit modal */}
      <PlayerEditModal
        open={!!editPlayer}
        player={editPlayer}
        defaultTeamId={teamId}
        teams={teams}
        onSave={handleEditSave}
        onCancel={() => setEditPlayer(null)}
      />

      {/* Delete team confirm */}
      <ConfirmModal open={deleteModal} onClose={() => { setDeleteModal(false); setDeletePassword(''); }}
        title="Delete team?" danger confirmLabel="Delete"
        message={`Delete "${team.name}"? Players will not be deleted but will become unassigned.`}
        requirePassword={workspace?.slug}
        password={deletePassword} onPasswordChange={setDeletePassword}
        onConfirm={handleDeleteTeam} />
    </div>
  );
}
