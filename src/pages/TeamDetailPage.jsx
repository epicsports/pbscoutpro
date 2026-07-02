import React, { useState, useEffect, useMemo } from 'react';
import Preloader from '../components/Preloader';
import { useModal } from '../hooks/useModal';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Input, Select, Icons, ConfirmModal } from '../components/ui';
import PlayerEditModal from '../components/PlayerEditModal';
import EntityPickerModal from '../components/EntityPickerModal';
import PlayerAvatar from '../components/PlayerAvatar';
import RdIcon from '../components/RdIcon';
import TeamBadge, { isHex } from '../components/TeamBadge';
import ColorPicker from '../components/ColorPicker';
import { useTeams, usePlayers } from '../hooks/useFirestore';
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin';
import { useWorkspace } from '../hooks/useWorkspace';
import TeamPickerModal from './admin/TeamPickerModal';
import { COUNTRY_NAMES } from '../utils/flags';
import { langToLocale } from '../utils/plural';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, TOUCH, LEAGUE_COLORS, ELEV, TNUM, responsive } from '../utils/theme';
import { useLeagues } from '../hooks/useLeagues';
import { useLanguage } from '../hooks/useLanguage';
import { playerOnTeam, withTeamAdded, withTeamRemoved } from '../utils/playerTeams';
import { playerInLeague, playerInDivision } from '../utils/entityFilters';
import { useDisplayName } from '../utils/playerName';

export default function TeamDetailPage() {
  const { t, lang } = useLanguage();
  // § team-edit unification — editing/create/delete on the team screen is a
  // super-admin operation (security bugfix: previously any user reaching
  // /team/:id saw edit UI while the server silently rejected the write —
  // /docs TEAM_CONSOLIDATION_BRIEF). Non-super-admin = read-only profile.
  const canEdit = useIsSuperAdmin();
  const dn = useDisplayName();
  const device = useDevice();
  const R = responsive(device.type);
  const wide = device.width >= 720;
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  // § admin-parity — when reached from /admin/teams, Back returns there (HIG:
  // "back label matches destination"); workspace entry keeps /teams.
  const backTo = sp.get('from') === 'admin' ? '/admin/teams' : '/teams';
  // Raw teams (incl. retired) — drives sister-team curation + lets admin open
  // the detail page for a RETIRED team (the modal could; this page now must too).
  // `teams` (active only) keeps existing behavior for roster/picker/PlayerEdit.
  const { teams: allTeamsRaw, teamsById: allTeamsById, loading: teamsLoading } = useTeams();
  const teams = useMemo(() => allTeamsRaw.filter(t => !t.retiredAt), [allTeamsRaw]);
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

  // § Create mode — the SAME screen handles "new team" (route /team/new →
  // teamId==='new'), replacing the old admin TeamFormModal. Super-admin only.
  const isNew = teamId === 'new';
  const [cName, setCName] = useState('');
  const [cLeagues, setCLeagues] = useState(['NXL']);
  const [cExtId, setCExtId] = useState('');
  const [cCountry, setCCountry] = useState('');
  const [cLogo, setCLogo] = useState('');
  const [cColor, setCColor] = useState(null);
  const [cSaving, setCSaving] = useState(false);
  const [cErr, setCErr] = useState(null);

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

  // § team-edit unification — fields ported from the (now create-only) admin
  // TeamFormModal so this page is the single team-edit surface.
  // Name: inline-editable (saved on blur), like externalId.
  const [nameLocal, setNameLocal] = useState('');
  // Country: optimistic draft (the version-gated catalog cache won't refetch this
  // mount — same pattern as colorDraft). undefined = no draft; null = explicit none.
  const [countryDraft, setCountryDraft] = useState(undefined);
  // Sister-team picker + audit toggle (admin-only sections below).
  const [pickerMode, setPickerMode] = useState(null); // null | 'parent' | 'child'
  const [showAudit, setShowAudit] = useState(false);
  useEffect(() => { setCountryDraft(undefined); }, [teamId]);

  // Sister relationships derived from the RAW list (parent/children may be any
  // team, retired included for display). Cycle-safe picker lives in TeamPickerModal.
  const childrenByParent = useMemo(() => {
    const m = {};
    for (const tt of allTeamsRaw) if (tt.parentTeamId) (m[tt.parentTeamId] = m[tt.parentTeamId] || []).push(tt);
    return m;
  }, [allTeamsRaw]);

  // Active first; fall back to the raw map so admin can open a retired team.
  const team = teams.find(t => t.id === teamId) || allTeamsById[teamId];
  const parentTeam = team?.parentTeamId ? allTeamsById[team.parentTeamId] : null;
  const childTeams = childrenByParent[teamId] || [];
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
  useEffect(() => { setNameLocal(team?.name || ''); }, [team?.name]);
  // Drop the optimistic country draft once the server value catches up.
  useEffect(() => { setCountryDraft(undefined); }, [team?.country]);
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

  // Create mode renders BEFORE the team-resolution gate (no team doc yet).
  if (isNew) {
    if (!canEdit) {
      return (
        <div data-testid="team-create-denied">
          <EmptyState icon="🔒" text={t('team_create_denied')} />
        </div>
      );
    }
    const cReady = !!cName.trim();
    const saveNew = async () => {
      if (!cName.trim() || cSaving) return;
      setCSaving(true); setCErr(null);
      try {
        const ref = await ds.addTeam({
          name: cName.trim(), leagues: cLeagues,
          externalId: cExtId.trim() || null, country: cCountry || null,
          logoUrl: cLogo.trim() || null, color: cColor || null,
        });
        navigate(`/team/${ref.id}?from=admin`);
      } catch (e) { setCErr(e?.message || 'Save failed'); setCSaving(false); }
    };
    return (
      <Screen archetype="list" padBottom={false} style={{ display: 'flex', flexDirection: 'column' }}
        header={<PageHeader back={{ to: backTo }} title={t('team_create_title')} />}>
        <div style={{ flex: 1, overflowY: 'auto', maxWidth: 640, width: '100%', margin: '0 auto', padding: R.layout.padding, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <SectionLabel>{t('team_form_team_name_label')}</SectionLabel>
            <Input value={cName} onChange={setCName} placeholder={t('team_form_name_ph')} autoFocus />
          </div>
          <div>
            <SectionLabel>{t('team_detail_leagues_label')}</SectionLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {leaguesList.map(L => {
                const l = L.shortName; const a = cLeagues.includes(l);
                return <Btn key={L.id} variant="default" size="sm" active={a}
                  style={{ borderColor: a ? LEAGUE_COLORS[l] : COLORS.border, color: a ? LEAGUE_COLORS[l] : COLORS.textDim }}
                  onClick={() => setCLeagues(arr => arr.includes(l) ? arr.filter(x => x !== l) : [...arr, l])}>{l}</Btn>;
              })}
            </div>
          </div>
          <div>
            <SectionLabel>{t('team_detail_pbli_id_label')}</SectionLabel>
            <Input value={cExtId} onChange={setCExtId} placeholder={t('b13_team_ext_id_ph')} />
          </div>
          <div>
            <SectionLabel>{t('team_form_country_label')}</SectionLabel>
            <Select value={cCountry} onChange={setCCountry} style={{ width: '100%' }}>
              <option value="">{t('team_form_none_option')}</option>
              {Object.entries(COUNTRY_NAMES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </Select>
          </div>
          <div>
            <SectionLabel>{t('team_detail_logo_url_label')}</SectionLabel>
            <Input value={cLogo} onChange={setCLogo} placeholder="https://…/logo.png" />
          </div>
          <div>
            <SectionLabel>{t('team_detail_brand_color_label')}</SectionLabel>
            <ColorPicker value={isHex(cColor) ? cColor : null} onChange={setCColor} onCommit={setCColor} />
          </div>
          {cErr && <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>{cErr}</div>}
          <Btn variant="accent" disabled={!cReady || cSaving} onClick={saveNew} style={{ width: '100%', justifyContent: 'center' }}>
            <Icons.Check /> {cSaving ? t('saving') : t('save')}
          </Btn>
        </div>
      </Screen>
    );
  }

  if (!team) {
    const stillLoading = teamsLoading && !loadTimedOut;
    if (stillLoading) return <Preloader loop />;
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
          <Btn variant="accent" onClick={() => { setLoadTimedOut(false); navigate(0); }}>{t('action_retry')}</Btn>
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

  // ── § team-edit unification — name / country / sister / audit ──────────────
  // Name: saved on blur (non-empty enforced, mirrors externalId).
  const handleNameBlur = () => {
    const v = nameLocal.trim();
    if (!v) { setNameLocal(team.name || ''); return; }   // never allow blank
    if (v !== (team.name || '')) ds.updateTeam(teamId, { name: v });
  };
  // Country: optimistic + persist (same shape as handleSetColor). null = none.
  const effCountry = (countryDraft !== undefined ? countryDraft : team.country) || '';
  const handleSetCountry = (c) => {
    const v = c || null;
    setCountryDraft(v);
    ds.updateTeam(teamId, { country: v }).catch(() => setCountryDraft(undefined));
  };
  // Sister relationships — same writes the modal used (ds.setParentTeam).
  const handleSetParent = (id) => ds.setParentTeam(teamId, id);
  const handleAddChild = (id) => ds.setParentTeam(id, teamId);
  const handleRemoveParent = () => ds.setParentTeam(teamId, null);
  const handleRemoveChild = (cid) => ds.setParentTeam(cid, null);

  const formatTs = (ts) => {
    if (!ts) return '—';
    try {
      const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      return d.toLocaleString(langToLocale(lang));
    } catch { return String(ts); }
  };

  // Shared field controls — only one layout branch mounts at a time, so reusing
  // the same element in both the wide + phone bodies is safe.
  const nameInput = (
    <Input value={nameLocal} onChange={setNameLocal} onBlur={handleNameBlur} placeholder={t('team_form_name_ph')} />
  );
  const countrySelect = (
    <Select value={effCountry} onChange={handleSetCountry} style={{ width: '100%' }}>
      <option value="">{t('team_form_none_option')}</option>
      {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
        <option key={code} value={code}>{name}</option>
      ))}
    </Select>
  );

  // Admin-only metadata (sister teams + audit). Self-styled so it renders the
  // same in the wide card column and the phone flow.
  const relCard = (label, tm, onRemove, onChange) => (
    <div key={tm.id} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: RADIUS.md,
      background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, minHeight: 56,
    }}>
      <TeamBadge team={tm} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tm.name || '—'}</div>
        <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{label}{tm.leagues?.length ? ` · ${tm.leagues.join('/')}` : ''}</div>
      </div>
      {onChange && <Btn variant="default" size="sm" onClick={onChange}>{t('team_form_change_btn')}</Btn>}
      {onRemove && <Btn variant="default" size="sm" onClick={onRemove} style={{ color: COLORS.danger }}>{t('delete')}</Btn>}
    </div>
  );
  const auditRow = (label, value) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontFamily: FONT, fontSize: 11 }}>
      <div style={{ minWidth: 120, color: COLORS.textMuted, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: COLORS.textDim, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
  const adminMetaBlock = (
    <>
      <div>
        <SectionLabel>{t('team_form_section_sister')}</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {parentTeam && relCard(t('team_form_parent_label'), parentTeam, handleRemoveParent, () => setPickerMode('parent'))}
          {childTeams.map(c => relCard(t('team_form_child_label'), c, () => handleRemoveChild(c.id)))}
          {!parentTeam && childTeams.length === 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="default" onClick={() => setPickerMode('parent')}>{t('team_form_designate_parent')}</Btn>
              <Btn variant="default" onClick={() => setPickerMode('child')}>{t('team_form_add_child')}</Btn>
            </div>
          )}
          {!parentTeam && childTeams.length > 0 && (
            <Btn variant="default" onClick={() => setPickerMode('child')}>{t('team_form_add_another_child')}</Btn>
          )}
        </div>
        <div style={{ marginTop: 8, padding: 10, borderRadius: RADIUS.sm, background: ELEV.sunken, fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5 }}>{t('team_form_sister_note')}</div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setShowAudit(s => !s)} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '4px 0', fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 600,
          color: COLORS.textDim, minHeight: 44,
        }}>
          <span style={{ display: 'inline-flex', transform: showAudit ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: COLORS.textMuted }}><RdIcon name="chevron" size={12} /></span> {t('team_form_audit_toggle')}
        </button>
        {showAudit && (
          <div style={{ padding: 12, borderRadius: RADIUS.md, background: ELEV.sunken, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {auditRow('ID', <code style={{ color: COLORS.text }}>{team.id}</code>)}
            {auditRow(t('team_form_audit_origin'), team.originWorkspace || '—')}
            {auditRow(t('team_form_audit_created'), formatTs(team.createdAt))}
            {auditRow(t('team_form_audit_updated'), formatTs(team.updatedAt))}
            {team.retiredAt && auditRow(t('team_form_audit_retired_at'), formatTs(team.retiredAt))}
          </div>
        )}
      </div>
    </>
  );

  // ── Wide (≥720) — DASHBOARD layout (hero crest band ↔ roster grid) ──
  // Ports prototype `TeamProfileWide` (redesign6.jsx:211). Phone path below is
  // untouched (additive). Wired to the SAME real team/roster/handlers — only the
  // shell differs. Two-col grid collapses to single column under 820 (the hero
  // crest stays full-width on the narrower wide range, mirroring the prototype's
  // internal `useWide(760)` breakpoint). Logo "slot" reuses the EXISTING URL
  // field (§93 — URL ref, never base64/upload; real file→storage = m1247): the
  // slot focuses the logo URL Input on the right, it does NOT introduce upload.
  const twoCol = device.width >= 820;
  // The brand-color accent is the TEAM's identity color (not amber decoration);
  // falls back to TeamBadge's stable id-hash color when no explicit color is set.
  const crestColor = isHex(effColor) ? effColor : null;
  const activeDiv = effLeagues.map(l => effDivisions[l]).find(Boolean) || null;
  const leagueLine = effLeagues.join(' · ') || t('team_detail_no_league');

  const wcard = { background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, borderRadius: 18, boxShadow: ELEV.shadow1 };
  const wlabel = { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '.6px', textTransform: 'uppercase' };

  // Section wrapper as a plain function (NOT a render-scoped component) — invoked
  // inline so inputs inside don't remount on every keystroke (focus loss).
  const wSection = (title, right, children) => (
    <div style={{ ...wcard, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: COLORS.text }}>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );

  // Roster card — wide grid cell. Avatar ring (HERO→amber, coach→info, staff→
  // neutral, plain→hairline), number badge, position/role, ★HERO toggle.
  const isCoach = p => p.role === 'coach';
  const isStaff = p => p.role === 'staff';
  const isPlayer = p => !p.role || p.role === 'player';
  const wRosterCard = (p) => {
    const grp = isCoach(p) ? 'coach' : isStaff(p) ? 'staff' : 'player';
    const accent = grp === 'coach' ? COLORS.info : grp === 'staff' ? COLORS.textDim : COLORS.accent;
    const ringColor = grp === 'player' ? (p.hero ? COLORS.accent : ELEV.hairlineStrong) : accent;
    const meta = grp === 'player'
      ? [p.favoriteBunker, p.pbliId && `PBLI: ${p.pbliId}`].filter(Boolean).join(' · ')
      : null;
    return (
      <div key={p.id} style={{
        display: 'flex', alignItems: 'center', gap: 11, padding: '14px 15px',
        borderRadius: 14, background: ELEV.surface,
        border: `1px solid ${p.hero && grp === 'player' ? COLORS.accentA25 : ELEV.hairline}`,
        boxShadow: ELEV.shadow1, minHeight: TOUCH.minTarget, minWidth: 0,
      }}>
        <span style={{ display: 'inline-flex', borderRadius: '50%', padding: 2, border: `2px solid ${ringColor}`, flexShrink: 0 }}>
          <PlayerAvatar player={p} size={40} />
        </span>
        {grp === 'player' && p.number != null && p.number !== '' && (
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: TOUCH.fontLg, color: COLORS.accent, minWidth: 30, ...TNUM }}>#{p.number}</span>
        )}
        <div
          onClick={grp === 'player' ? () => navigate(`/player/${p.id}/stats?scope=global`) : undefined}
          style={{ flex: 1, cursor: grp === 'player' ? 'pointer' : 'default', minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dn({ name: p.name })}</div>
          {p.nickname && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nickname}</div>}
          {meta && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>}
        </div>
        {grp === 'player' ? (
          <div
            onClick={canEdit ? () => ds.setPlayerHero(p.id, !p.hero) : undefined}
            title={p.hero ? t('team_detail_hero_remove') : t('team_detail_hero_mark')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderRadius: RADIUS.sm,
              cursor: 'pointer', flexShrink: 0,
              background: p.hero ? COLORS.accentA12 : 'transparent',
              border: `1px solid ${p.hero ? COLORS.accentA25 : COLORS.surfaceLight}`, minHeight: 44,
            }}>
            <span style={{ display: 'inline-flex', color: p.hero ? COLORS.accent : COLORS.textMuted }}><RdIcon name="star" size={12} /></span>
            <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '.4px', color: p.hero ? COLORS.accent : COLORS.textMuted }}>{t('hero_label')}</span>
          </div>
        ) : (
          <span style={{
            fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase', flexShrink: 0,
            color: accent, background: `${accent}14`, border: `1px solid ${accent}40`, borderRadius: RADIUS.sm, padding: '5px 9px',
          }}>{grp === 'coach' ? t('role_coach') : t('player_form_staff_role')}</span>
        )}
        {canEdit && <>
          <Btn variant="ghost" size="sm" onClick={() => setEditPlayer(p)} title={t('team_detail_edit_profile_title')}><Icons.Edit /></Btn>
          <Btn variant="ghost" size="sm" onClick={() => handleRemoveFromTeam(p.id)} title={t('team_detail_remove_title')}><Icons.Trash /></Btn>
        </>}
      </div>
    );
  };

  const wideBody = (
    <div style={{ flex: 1, overflowY: 'auto', width: '100%', maxWidth: 1120, margin: '0 auto', padding: twoCol ? '28px 28px 80px' : '20px 16px 80px', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: twoCol ? 'minmax(0, 380px) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: twoCol ? 24 : 16, alignItems: 'start' }}>
      {/* LEFT — hero crest band + logo slot + brand color (sticky on wide) */}
      <div style={{ position: twoCol ? 'sticky' : 'static', top: 16, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* hero crest band — club color is the bg accent (team identity, not amber) */}
        <div style={{ ...wcard, padding: 0, overflow: 'hidden' }}>
          <div style={{
            position: 'relative', overflow: 'hidden', padding: '26px 22px 22px', textAlign: 'center',
            background: crestColor
              ? `radial-gradient(130% 120% at 50% 0%, ${crestColor}55, ${crestColor}12 50%, transparent 74%), linear-gradient(165deg, ${ELEV.raised}, ${ELEV.surface})`
              : `linear-gradient(165deg, ${ELEV.raised}, ${ELEV.surface})`,
          }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14, borderRadius: 22, boxShadow: crestColor ? `0 8px 24px ${crestColor}40` : ELEV.shadow1 }}>
              <TeamBadge team={{ ...team, color: effColor, country: effCountry }} size={96} />
            </div>
            <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 900, color: COLORS.text, letterSpacing: '-.5px', lineHeight: 1.08, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{team.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: crestColor || COLORS.textDim, background: crestColor ? `${crestColor}1e` : ELEV.sunken, border: `1px solid ${crestColor ? `${crestColor}55` : ELEV.hairline}`, borderRadius: 999, padding: '5px 12px', letterSpacing: '.4px' }}>
                {leagueLine}{activeDiv ? ` · ${activeDiv}` : ''}
              </span>
            </div>
          </div>
        </div>
        {/* logo slot (super-admin only) — focuses the logo URL Input on the right
            (§93: URL ref, never base64 upload; real file→storage = m1247). */}
        {canEdit && (
        <div style={{ ...wcard, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
            <span style={wlabel}>{t('team_detail_logo_url_label')}</span>
          </div>
          <div
            onClick={() => { const el = document.getElementById('team-logo-url-input'); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus(); } }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '22px 16px', borderRadius: 14, border: `1px solid ${ELEV.hairlineStrong}`, background: ELEV.sunken, cursor: 'pointer', minHeight: 44, WebkitTapHighlightColor: 'transparent' }}>
            {team.logoUrl
              ? <TeamBadge team={{ ...team, color: effColor, country: effCountry }} size={64} />
              : <span style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, color: COLORS.accent }}><RdIcon name="palette" size={20} /></span>}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: COLORS.text }}>{team.logoUrl ? t('team_detail_logo_change') : t('team_detail_logo_set')}</div>
              <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>{t('team_detail_logo_url_hint')}</div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* RIGHT — info (id / color / logo url / leagues) + roster grid */}
      <div style={{ minWidth: 0 }}>
        {/* Name */}
        {canEdit && wSection(t('team_form_team_name_label'), null, nameInput)}

        {/* External ID */}
        {canEdit && wSection(t('team_detail_pbli_id_label'), null, (
          <Input value={extIdLocal} onChange={setExtIdLocal} onBlur={handleExtIdBlur} placeholder={t('b13_team_ext_id_ph')} />
        ))}

        {/* Brand color */}
        {canEdit && wSection(t('team_detail_brand_color_label'), null, (
          <>
            <ColorPicker value={isHex(effColor) ? effColor : null} onChange={handleColorPreview} onCommit={handleColorCommit} />
            <div onClick={() => handleSetColor(null)} style={{ marginTop: 8, minHeight: 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontFamily: FONT, fontSize: TOUCH.fontXs, color: !isHex(effColor) ? COLORS.accent : COLORS.textDim, WebkitTapHighlightColor: 'transparent' }}>{t('team_detail_reset_color')}</div>
          </>
        ))}

        {/* Logo URL field — the canonical logo edit (the left slot focuses this) */}
        {canEdit && wSection(t('team_detail_logo_url_label'), null, (
          <Input id="team-logo-url-input" value={logoLocal} onChange={setLogoLocal} onBlur={handleLogoBlur} placeholder="https://…/logo.png" />
        ))}

        {/* Country — 2nd-tier crest identity (flags.js). Optional. */}
        {canEdit && wSection(t('team_form_country_label'), null, countrySelect)}

        {/* Leagues + divisions */}
        {canEdit && wSection(t('team_detail_leagues_label'), null, (
          <>
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
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('divisions_label')}</div>
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
          </>
        ))}

        {/* Sister teams + audit — super-admin only (§ team-edit unification) */}
        {canEdit && (
          <div style={{ ...wcard, padding: 20, marginBottom: 16 }}>{adminMetaBlock}</div>
        )}

        {/* Roster — grouped by role, each group a width-filling grid */}
        <div style={{ ...wcard, padding: 20 }}>
          <SectionTitle right={canEdit ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="accent" size="sm" onClick={() => { setFName(''); setFNick(''); setFNumber(''); modal.open('addNew'); }}><Icons.Plus /> {t('action_new')}</Btn>
              <Btn variant="default" size="sm" onClick={() => modal.open('addExisting')}><Icons.Search /> {t('action_find')}</Btn>
            </div>
          ) : null}>{t('team_detail_roster_n', teamPlayers.length)}</SectionTitle>

          {!teamPlayers.length && <EmptyState icon="?" text={t('team_detail_empty_roster')} />}

          {(() => {
            const groups = [
              { key: 'coach',  icon: 'book',     title: t('roster_group_coaching'), accent: COLORS.info,    list: teamPlayers.filter(isCoach) },
              { key: 'player', icon: 'jersey',   title: t('roster_group_players'),  accent: COLORS.accent,  list: teamPlayers.filter(isPlayer) },
              { key: 'staff',  icon: 'building', title: t('roster_group_staff'),    accent: COLORS.textDim, list: teamPlayers.filter(isStaff) },
            ];
            return groups.filter(g => g.list.length > 0).map(g => (
              <div key={g.key} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '14px 2px 12px' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, color: g.accent, flexShrink: 0 }}>
                    <RdIcon name={g.icon} size={15} />
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, letterSpacing: '.6px', color: COLORS.textDim, textTransform: 'uppercase' }}>{g.title}</span>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.textMuted, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 999, padding: '2px 9px', ...TNUM }}>{g.list.length}</span>
                  <div style={{ flex: 1, height: 1, background: ELEV.hairline }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: twoCol ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr', gap: 12 }}>
                  {g.list.map(p => wRosterCard(p))}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Delete team — super-admin only */}
        {canEdit && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setDeleteModal(true)} style={{ color: COLORS.danger, width: '100%', justifyContent: 'center' }}>
            <Icons.Trash /> {t('team_detail_delete_btn')}
          </Btn>
        </div>
        )}
      </div>
    </div>
  );

  return (
    <Screen archetype="list" padBottom={false} style={{ display: 'flex', flexDirection: 'column' }}
      header={<PageHeader back={{ to: backTo }} title={team.name} subtitle={t('team_detail_subtitle')} />}>
      {wide && wideBody}
      {!wide && (
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
          <TeamBadge team={{ ...team, color: effColor, country: effCountry }} size={56} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontLg, fontWeight: 800, color: COLORS.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{team.name}</div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>{(team.leagues || []).join(' · ') || t('team_detail_no_league')}</div>
          </div>
        </div>

        {/* Team info — super-admin only (read-only users see hero band + roster) */}
        {canEdit && (
        <div>
          {/* Name */}
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>{t('team_form_team_name_label')}</SectionLabel>
            {nameInput}
          </div>

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

          {/* Country — 2nd-tier crest identity (flags.js). Optional. */}
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>{t('team_form_country_label')}</SectionLabel>
            {countrySelect}
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
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('divisions_label')}</div>
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
        )}

        {/* Sister teams + audit — super-admin only (§ team-edit unification) */}
        {canEdit && (
          <div style={{
            background: ELEV.surface, border: `1px solid ${ELEV.hairline}`,
            borderRadius: 16, padding: 16, boxShadow: ELEV.shadow1,
          }}>{adminMetaBlock}</div>
        )}

        {/* Roster */}
        <div>
          <SectionTitle right={canEdit ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="accent" size="sm" onClick={() => { setFName(''); setFNick(''); setFNumber(''); modal.open('addNew'); }}>
                <Icons.Plus /> {t('action_new')}
              </Btn>
              <Btn variant="default" size="sm" onClick={() => modal.open('addExisting')}>
                <Icons.Search /> {t('action_find')}
              </Btn>
            </div>
          ) : null}>
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
                  <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, fontWeight: 600 }}>{dn({ name: p.name })}</div>
                  {p.nickname && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>{p.nickname}</div>}
                  {g.key === 'player' && (() => {
                    const meta = [p.favoriteBunker, p.pbliId && `PBLI: ${p.pbliId}`].filter(Boolean).join(' - ');
                    return meta ? <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>{meta}</div> : null;
                  })()}
                </div>
                {g.key === 'player' ? (
                  /* HERO toggle — global (§ 25), players only */
                  <div
                    onClick={canEdit ? () => ds.setPlayerHero(p.id, !p.hero) : undefined}
                    title={p.hero ? t('team_detail_hero_remove') : t('team_detail_hero_mark')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 8px', borderRadius: RADIUS.sm, cursor: 'pointer',
                      background: p.hero ? COLORS.accentA12 : 'transparent',
                      border: `1px solid ${p.hero ? COLORS.accentA25 : COLORS.surfaceLight}`,
                      minHeight: 44,
                    }}>
                    <span style={{ display: 'inline-flex', color: p.hero ? COLORS.accent : COLORS.textMuted }}><RdIcon name="star" size={12} /></span>
                    <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '.4px', color: p.hero ? COLORS.accent : COLORS.textMuted }}>{t('hero_label')}</span>
                  </div>
                ) : (
                  /* Role chip — coaches/staff in place of HERO */
                  <span style={{
                    fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase',
                    color: g.accent, background: `${g.accent}14`, border: `1px solid ${g.accent}40`,
                    borderRadius: RADIUS.sm, padding: '5px 9px',
                  }}>{g.label}</span>
                )}
                {canEdit && <>
                  <Btn variant="ghost" size="sm" onClick={() => setEditPlayer(p)} title={t('team_detail_edit_profile_title')}><Icons.Edit /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleRemoveFromTeam(p.id)} title={t('team_detail_remove_title')}><Icons.Trash /></Btn>
                </>}
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

        {/* Delete team — super-admin only */}
        {canEdit && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setDeleteModal(true)}
            style={{ color: COLORS.danger, width: '100%', justifyContent: 'center' }}>
            <Icons.Trash /> {t('team_detail_delete_btn')}
          </Btn>
        </div>
        )}
      </div>
      )}

      {/* Add new player (quick form) */}
      <Modal open={modal.is('addNew')} onClose={() => modal.close()} title={t('team_detail_new_player_title')}
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={handleAddNewPlayer} disabled={!fName.trim() || !fNumber.trim()}><Icons.Check /> {t('action_add')}</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}><Input value={fName} onChange={setFName} placeholder={t('b13_input_full_name_star')} autoFocus /></div>
            <div style={{ flex: 1 }}><Input value={fNumber} onChange={setFNumber} placeholder={t('player_number_input_placeholder')} /></div>
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
        emptyText={t('team_detail_no_players_match')}
        nameMode="player"
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

      {/* Sister-team picker (admin) — parent/child selection, cycle-safe */}
      <TeamPickerModal
        open={!!pickerMode}
        onClose={() => setPickerMode(null)}
        allTeams={allTeamsRaw}
        excludeId={teamId}
        mode={pickerMode || 'parent'}
        onSelect={(pickedId) => {
          if (pickerMode === 'parent') handleSetParent(pickedId);
          else if (pickerMode === 'child') handleAddChild(pickedId);
          setPickerMode(null);
        }}
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
