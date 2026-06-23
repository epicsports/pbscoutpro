import React, { useState, useEffect, useMemo } from 'react';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Input, Icons, ConfirmModal } from '../components/ui';
import PlayerEditModal from '../components/PlayerEditModal';
import EntityPickerModal from '../components/EntityPickerModal';
import PlayerAvatar from '../components/PlayerAvatar';
import RdIcon from '../components/RdIcon';
import TeamBadge, { isHex } from '../components/TeamBadge';
import ColorPicker from '../components/ColorPicker';
import { useActiveTeams, usePlayers } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, TOUCH, LEAGUE_COLORS, ELEV, TNUM, responsive } from '../utils/theme';
import { useLeagues } from '../hooks/useLeagues';
import { useLanguage } from '../hooks/useLanguage';
import { playerOnTeam, withTeamAdded, withTeamRemoved } from '../utils/playerTeams';
import { playerInLeague, playerInDivision } from '../utils/entityFilters';

export default function TeamDetailPage() {
  const { t } = useLanguage();
  const device = useDevice();
  const R = responsive(device.type);
  const wide = device.width >= 720;
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  // § admin-parity — when reached from /admin/teams, Back returns there (HIG:
  // "back label matches destination"); workspace entry keeps /teams.
  const backTo = sp.get('from') === 'admin' ? '/admin/teams' : '/teams';
  const { teams, loading: teamsLoading } = useActiveTeams();
  const { players, playersById } = usePlayers();
  // No-eternal-loading guard (arc B rollout of the ScoutedTeamPage pattern):
  // if the team never resolves, flip to an error state after a bounded wait.
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const { workspace } = useWorkspace();
  const modal = useModal();
  const leaguesList = useLeagues();
  // Per-shortName divisions lookup map (sync helper, avoids hooks-in-loop)
  const divisionsByShortName = Object.fromEntries(
    leaguesList.map(L => [L.shortName, L.divisions || []])
  );
  const teamsById = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);

  // Add-new-player simple form
  const [fName, setFName] = useState('');
  const [fNick, setFNick] = useState('');
  const [fNumber, setFNumber] = useState('');
  // § Stage 3 — add-existing picker filter state (search is local to the picker;
  // Liga/Dywizja are DERIVED via team membership, league-scoped Dywizja).
  const [addLeague, setAddLeague] = useState('');
  const [addDiv, setAddDiv] = useState('');

  // Full edit (shared modal)
  const [editPlayer, setEditPlayer] = useState(null);

  // Delete team
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // External ID — inline editable, persisted on blur. MUST be declared with
  // the other hooks (not after the early-return below) so the hook call order
  // is stable across renders — previously this useState sat after the
  // `if (!team) return` gate, causing React error #310 ("Rendered more hooks
  // than during the previous render") when `teams` resolved from empty to
  // populated and the gate flipped.
  const [extIdLocal, setExtIdLocal] = useState('');
  // § Team branding Phase 2 — logo URL ref, inline editable, persisted on blur
  // (mirrors externalId + setWorkspaceLogo). Declared with the other hooks
  // (before the early return) for stable hook order.
  const [logoLocal, setLogoLocal] = useState('');
  // § Team branding — optimistic brand color. The write lands in global + bumps
  // the catalog version, but the already-mounted version-gated useTeams cache
  // won't refetch until a remount, so reflect the pick locally for instant
  // feedback. `undefined` = no draft (use team.color); `null` = explicit Default.
  const [colorDraft, setColorDraft] = useState(undefined);
  // § Multi-league / division — same optimistic pattern as colorDraft. The
  // version-gated useTeams cache won't refetch this mount, so a toggle's write
  // never lit the chip (and the NEXT toggle recomputed from the STALE base,
  // dropping the prior pick — "chips not active"). Drafts hold the live
  // selection; reset on team switch. null = no draft (use the team's value).
  const [leaguesDraft, setLeaguesDraft] = useState(null);
  const [divisionsDraft, setDivisionsDraft] = useState(null);
  useEffect(() => { setLeaguesDraft(null); setDivisionsDraft(null); }, [teamId]);

  const team = teams.find(t => t.id === teamId);
  const effLeagues = leaguesDraft ?? team?.leagues ?? [];
  const effDivisions = divisionsDraft ?? team?.divisions ?? {};
  const teamPlayers = players
    .filter(p => playerOnTeam(p, teamId))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  // § Stage 3 — picker filters (Liga → Dywizja, derived). Already-rostered
  // players are excluded by EntityPickerModal's excludeIds.
  const addFilters = [
    {
      key: 'liga', label: 'Liga', value: addLeague, allLabel: 'wszystkie',
      onChange: (v) => { setAddLeague(v); setAddDiv(''); },
      options: leaguesList.map(L => ({ value: L.shortName, label: L.shortName })),
    },
    {
      key: 'dyw', label: 'Dywizja', value: addDiv, allLabel: 'wszystkie',
      onChange: setAddDiv,
      options: (addLeague ? (divisionsByShortName[addLeague] || []) : []).map(d => ({ value: d.name, label: d.name })),
    },
  ];
  const addPredicate = (p) => playerInLeague(p, addLeague, teamsById) && playerInDivision(p, addDiv, teamsById, addLeague);

  // Sync local externalId when the team doc resolves/changes. Effect runs
  // after each render, closure captures the freshly-computed `team` above.
  useEffect(() => { setExtIdLocal(team?.externalId || ''); }, [team?.externalId]);
  useEffect(() => { setLogoLocal(team?.logoUrl || ''); }, [team?.logoUrl]);
  // Drop the optimistic color draft when navigating to another team, or once the
  // server value catches up (post-refetch team.color === the draft).
  useEffect(() => { setColorDraft(undefined); }, [teamId, team?.color]);

  // No-eternal-loading: once resolved, clear the timeout; while unresolved, arm
  // a 12s ceiling after which the error state shows even if the catalog
  // subscription never emits (deleted/invalid team URL on prod).
  useEffect(() => {
    if (team) { setLoadTimedOut(false); return undefined; }
    const id = setTimeout(() => setLoadTimedOut(true), 12000);
    return () => clearTimeout(id);
  }, [team]);

  if (!team) {
    const stillLoading = teamsLoading && !loadTimedOut;
    if (stillLoading) return <EmptyState icon="⏳" text={t('loading_default')} />;
    // Resolved-but-absent OR timed out → explicit error state, never an
    // eternal spinner (the 2026-06-11 scouted-team bug class).
    return (
      <div data-testid="team-load-error">
        <EmptyState
          icon="⚠️"
          text={t('b13_team_load_error')}
          subtitle={t('b13_team_load_error_sub')}
        />
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Btn variant="accent" onClick={() => { setLoadTimedOut(false); navigate(0); }}>Retry</Btn>
        </div>
      </div>
    );
  }

  // Effective brand color = optimistic draft if present, else the persisted value.
  const effColor = colorDraft !== undefined ? colorDraft : team.color;

  const handleAddNewPlayer = async () => {
    if (!fName.trim() || !fNumber.trim()) return;
    await ds.addPlayer({ name: fName.trim(), nickname: fNick.trim(), number: fNumber.trim(), teamId });
    modal.close(); setFName(''); setFNick(''); setFNumber('');
  };

  // § 72 — quick add/remove are teams[]-aware: append / detach a membership,
  // never overwrite the player's other teams or move them off the primary.
  // Tapping a player in the picker assigns immediately; once on the roster the
  // player is excluded from the list (excludeIds), so the picker stays open for
  // adding several in a row without reselecting.
  const handleAssignPlayer = async (playerId) => {
    const player = playersById[playerId];
    if (!player) return;
    await ds.updatePlayer(playerId, withTeamAdded(player, teamId));
  };

  const handleRemoveFromTeam = async (playerId) => {
    const player = playersById[playerId];
    if (!player) return;
    await ds.updatePlayer(playerId, withTeamRemoved(player, teamId));
  };

  const handleToggleLeague = async (league) => {
    const base = effLeagues;
    const next = base.includes(league) ? base.filter(l => l !== league) : [...base, league];
    if (!next.length) return;                  // keep at least one league
    setLeaguesDraft(next);                      // optimistic — the cache won't refetch this mount
    try { await ds.updateTeam(teamId, { leagues: next }); }
    catch { setLeaguesDraft(base); }            // revert on failure
  };
  const handleToggleDivision = async (l, name) => {
    const cur = effDivisions[l];
    const next = { ...effDivisions, [l]: cur === name ? null : name };
    setDivisionsDraft(next);
    try { await ds.updateTeam(teamId, { divisions: next }); }
    catch { setDivisionsDraft(effDivisions); }
  };

  // § Team branding — set/clear the brand color. Optimistic: reflect the pick
  // immediately (the cache won't refetch this mount), then persist global +
  // bump catalog version. Revert the draft if the write fails.
  const handleSetColor = (c) => {
    setColorDraft(c);
    ds.updateTeam(teamId, { color: c }).catch(() => setColorDraft(undefined));
  };

  // Custom picker — preview is optimistic-only (no write per drag move, else every
  // pointermove would fire a Firestore write + catalog-version bump); persist once
  // on pointer release / hex blur via commit.
  const handleColorPreview = (c) => setColorDraft(c);
  const handleColorCommit = (c) => {
    setColorDraft(c);
    ds.updateTeam(teamId, { color: c }).catch(() => setColorDraft(undefined));
  };

  // External ID — editable inline, saves on blur. State + sync effect live
  // above the early-return gate; only the blur handler stays here.
  const handleExtIdBlur = () => {
    const v = extIdLocal.trim() || null;
    if (v !== (team.externalId || null)) ds.updateTeam(teamId, { externalId: v });
  };

  // § Team branding Phase 2 — logo URL ref, saved on blur (URL string, never
  // base64; honors the HARD RULE). Empty clears → TeamBadge falls back to color.
  const handleLogoBlur = () => {
    const v = logoLocal.trim() || null;
    if (v !== (team.logoUrl || null)) ds.updateTeam(teamId, { logoUrl: v });
  };

  const handleEditSave = async (formData) => {
    if (formData.teamId !== (editPlayer.teamId || null)) {
      await ds.changePlayerTeam(editPlayer.id, formData.teamId, editPlayer.teamHistory || []);
    }
    await ds.updatePlayer(editPlayer.id, formData);
    setEditPlayer(null);
  };

  // Phase 2.3.d (2026-05-23) — the UI "delete team" is now a RETIRE: soft
  // delete via retiredAt, dual-written global+workspace, recoverable by an
  // admin. The hard-delete (`deleteTeam`) stays super_admin-only on
  // AdminTeamsPage. § 63.15.2.X.1 retireTeam = canonical UI delete path.
  const handleDeleteTeam = async () => {
    await ds.retireTeam(teamId);
    navigate(backTo);
  };

  return (
    <Screen archetype="list" padBottom={false} style={{ display: 'flex', flexDirection: 'column' }}
      header={<PageHeader back={{ to: backTo }} title={team.name} subtitle={t('team_detail_subtitle')} />}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80, padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: R.layout.gap * 2 }}>

        {/* § Team branding — hero mark + subtle brand tint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 16px', borderRadius: 16, boxShadow: ELEV.shadow1,
          background: isHex(effColor)
            ? `linear-gradient(120deg, ${effColor}26, ${effColor}08 46%, transparent 72%), ${ELEV.surface}`
            : ELEV.surface,
          border: `1px solid ${isHex(effColor) ? `${effColor}40` : ELEV.hairline}`,
        }}>
          <TeamBadge team={{ ...team, color: effColor }} size={56} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontLg, fontWeight: 800, color: COLORS.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{team.name}</div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>{(team.leagues || []).join(' · ') || t('team_detail_no_league')}</div>
          </div>
        </div>

        {/* Team info */}
        <div>
          {/* External ID */}
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>{t('team_detail_pbli_id_label')}</SectionLabel>
            <Input
              value={extIdLocal}
              onChange={setExtIdLocal}
              onBlur={handleExtIdBlur}
              placeholder={t('b13_team_ext_id_ph')}
            />
          </div>

          {/* § Team branding — brand color picker (super-admin canonical edit) */}
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>{t('team_detail_brand_color_label')}</SectionLabel>
            {/* HSV picker = the brand-color control (preset swatches removed per
                Jacek 2026-06-06). Live drag = optimistic preview; persists on
                pointer release / hex blur. */}
            <ColorPicker
              value={isHex(effColor) ? effColor : null}
              onChange={handleColorPreview}
              onCommit={handleColorCommit}
            />
            {/* Reset to the auto (id-hash) color — clears the custom brand color. */}
            <div
              onClick={() => handleSetColor(null)}
              style={{
                marginTop: 8, minHeight: 44, display: 'inline-flex', alignItems: 'center',
                cursor: 'pointer', fontFamily: FONT, fontSize: TOUCH.fontXs,
                color: !isHex(effColor) ? COLORS.accent : COLORS.textDim,
                WebkitTapHighlightColor: 'transparent',
              }}>{t('team_detail_reset_color')}</div>
          </div>

          {/* § Team branding Phase 2 — logo URL ref (paste a link; never base64) */}
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>{t('team_detail_logo_url_label')}</SectionLabel>
            <Input
              value={logoLocal}
              onChange={setLogoLocal}
              onBlur={handleLogoBlur}
              placeholder="https://…/logo.png"
            />
          </div>

          <SectionLabel>{t('team_detail_leagues_label')}</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {leaguesList.map(L => {
              const l = L.shortName;
              const a = effLeagues.includes(l);
              return <Btn key={L.id} variant="default" size="sm" active={a}
                style={{ borderColor: a ? LEAGUE_COLORS[l] : COLORS.border, color: a ? LEAGUE_COLORS[l] : COLORS.textDim }}
                onClick={() => handleToggleLeague(l)}>{l}</Btn>;
            })}
          </div>
          {effLeagues.filter(l => (divisionsByShortName[l] || []).length > 0).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Divisions</div>
              {effLeagues.filter(l => (divisionsByShortName[l] || []).length > 0).map(l => (
                <div key={l} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: LEAGUE_COLORS[l], fontWeight: 700, width: 30 }}>{l}:</span>
                  {(divisionsByShortName[l] || []).map(d => {
                    const cur = effDivisions[l];
                    return <Btn key={d.id} variant="default" size="sm" active={cur === d.name}
                      onClick={() => handleToggleDivision(l, d.name)}
                      style={{ fontSize: FONT_SIZE.xxs, padding: '2px 10px', minHeight: 44, minWidth: 44 }}>{d.name}</Btn>;
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
            {t('team_detail_roster_n', teamPlayers.length)}
          </SectionTitle>

          {!teamPlayers.length && <EmptyState icon="?" text={t('team_detail_empty_roster')} />}

          {/* Roster — grouped by role (coaching / players / staff). Premium ELEV
              cards; ≥720 reflows each group to a width-filling grid. HERO is a
              players-only concept; coaches/staff show their role in its place. */}
          {(() => {
            const isCoach = p => p.role === 'coach';
            const isStaff = p => p.role === 'staff';
            const isPlayer = p => !p.role || p.role === 'player';
            const groups = [
              { key: 'coach',  icon: 'book',     title: t('roster_group_coaching'), accent: COLORS.info,    label: t('role_coach'),             list: teamPlayers.filter(isCoach) },
              { key: 'player', icon: 'jersey',   title: t('roster_group_players'),  accent: COLORS.accent,  label: null,                        list: teamPlayers.filter(isPlayer) },
              { key: 'staff',  icon: 'building', title: t('roster_group_staff'),    accent: COLORS.textDim, label: t('player_form_staff_role'), list: teamPlayers.filter(isStaff) },
            ];
            const rosterCard = (p, g) => {
              // Avatar ring — semantic, keeps amber = HERO only (edge-case law):
              // HERO player → amber, coach → info, staff → neutral, plain player → hairline.
              const ringColor = g.key === 'player'
                ? (p.hero ? COLORS.accent : ELEV.hairlineStrong)
                : g.accent;
              return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
                borderRadius: 12, background: ELEV.surface, border: `1px solid ${p.hero && g.key === 'player' ? COLORS.accentA25 : ELEV.hairline}`, boxShadow: ELEV.shadow1,
                minHeight: TOUCH.minTarget,
              }}>
                <span style={{ display: 'inline-flex', borderRadius: '50%', padding: 2, border: `2px solid ${ringColor}`, flexShrink: 0 }}>
                  <PlayerAvatar player={p} size={40} />
                </span>
                {g.key === 'player' && p.number != null && p.number !== '' && (
                  <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: TOUCH.fontLg, color: COLORS.accent, minWidth: 30, ...TNUM }}>
                    #{p.number}
                  </span>
                )}
                <div
                  onClick={g.key === 'player' ? () => navigate(`/player/${p.id}/stats?scope=global`) : undefined}
                  style={{ flex: 1, cursor: g.key === 'player' ? 'pointer' : 'default', minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, fontWeight: 600 }}>{p.name}</div>
                  {p.nickname && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>{p.nickname}</div>}
                  {g.key === 'player' && (() => {
                    const meta = [p.age && `${p.age} y/o`, p.favoriteBunker, p.pbliId && `PBLI: ${p.pbliId}`].filter(Boolean).join(' - ');
                    return meta ? <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>{meta}</div> : null;
                  })()}
                </div>
                {g.key === 'player' ? (
                  /* HERO toggle — global (§ 25), players only */
                  <div
                    onClick={() => ds.setPlayerHero(p.id, !p.hero)}
                    title={p.hero ? 'Remove HERO rank' : 'Mark as HERO'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 8px', borderRadius: RADIUS.sm, cursor: 'pointer',
                      background: p.hero ? COLORS.accentA12 : 'transparent',
                      border: `1px solid ${p.hero ? COLORS.accentA25 : COLORS.surfaceLight}`,
                      minHeight: 44,
                    }}>
                    <span style={{ display: 'inline-flex', color: p.hero ? COLORS.accent : COLORS.textMuted }}><RdIcon name="star" size={12} /></span>
                    <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '.4px', color: p.hero ? COLORS.accent : COLORS.textMuted }}>HERO</span>
                  </div>
                ) : (
                  /* Role chip — coaches/staff in place of HERO */
                  <span style={{
                    fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase',
                    color: g.accent, background: `${g.accent}14`, border: `1px solid ${g.accent}40`,
                    borderRadius: RADIUS.sm, padding: '5px 9px',
                  }}>{g.label}</span>
                )}
                <Btn variant="ghost" size="sm" onClick={() => setEditPlayer(p)} title={t('team_detail_edit_profile_title')}><Icons.Edit /></Btn>
                <Btn variant="ghost" size="sm" onClick={() => handleRemoveFromTeam(p.id)} title={t('team_detail_remove_title')}><Icons.Trash /></Btn>
              </div>
              );
            };
            return groups.filter(g => g.list.length > 0).map(g => (
              <div key={g.key} style={{ marginBottom: 18 }}>
                {/* section header — icon + title + count badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '14px 2px 10px' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, color: g.accent, flexShrink: 0 }}>
                    <RdIcon name={g.icon} size={15} />
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: COLORS.textDim, textTransform: 'uppercase' }}>{g.title}</span>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.textMuted, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 999, padding: '2px 9px', ...TNUM }}>{g.list.length}</span>
                  <div style={{ flex: 1, height: 1, background: ELEV.hairline }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: wide ? 'repeat(auto-fill, minmax(340px, 1fr))' : '1fr', gap: 8 }}>
                  {g.list.map(p => rosterCard(p, g))}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Delete team */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setDeleteModal(true)}
            style={{ color: COLORS.danger, width: '100%', justifyContent: 'center' }}>
            <Icons.Trash /> {t('team_detail_delete_btn')}
          </Btn>
        </div>
      </div>

      {/* Add new player (quick form) */}
      <Modal open={modal.is('addNew')} onClose={() => modal.close()} title={t('team_detail_new_player_title')}
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={handleAddNewPlayer} disabled={!fName.trim() || !fNumber.trim()}><Icons.Check /> Add</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}><Input value={fName} onChange={setFName} placeholder={t('b13_input_full_name_star')} autoFocus /></div>
            <div style={{ flex: 1 }}><Input value={fNumber} onChange={setFNumber} placeholder="Nr *" /></div>
          </div>
          <Input value={fNick} onChange={setFNick} placeholder={t('b13_input_nickname')} />
        </div>
      </Modal>

      {/* Add existing player — shared kit (search → Liga → Dywizja),
          excludes players already on this team's roster (§ Stage 3). */}
      <EntityPickerModal
        open={modal.is('addExisting')}
        onClose={() => modal.close()}
        title={t('team_detail_add_existing_title')}
        items={players}
        fields={['name', 'nickname', 'number']}
        filters={addFilters}
        predicate={addPredicate}
        excludeIds={teamPlayers.map(p => p.id)}
        multi
        selectedIds={[]}
        onToggle={handleAssignPlayer}
        emptyText="No players match. Use “New” to create one."
      />

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
        title={t('delete_team')} danger confirmLabel={t('delete')}
        message={`"${team.name}" will be removed from your teams. Scouted data is preserved and an admin can restore the team.`}
        requirePassword={workspace?.slug}
        password={deletePassword} onPasswordChange={setDeletePassword}
        onConfirm={handleDeleteTeam} />
    </Screen>
  );
}
