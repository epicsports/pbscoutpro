/**
 * PlayerEditModal — shared player edit form
 * Used by: PlayersPage, TeamDetailPage, ScoutedTeamPage
 *
 * Props:
 *   player:     player object (null = add mode)
 *   defaultTeamId: pre-select team (e.g. when opened from TeamDetailPage)
 *   teams:      all teams array for dropdown
 *   onSave:     async (formData) => void
 *   onCancel:   () => void
 *   open:       boolean
 */
import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Btn, Icons, TextArea, Field } from './ui';
import PlayerAvatar from './PlayerAvatar';
import RdIcon from './RdIcon';
import { useDevice } from '../hooks/useDevice';
import { COLORS, FONT, TOUCH, ELEV, BUNKER_TYPES } from '../utils/theme';
import { normalizePbliInput } from '../utils/pbliMatching';
import { playerTeams, withTeamAdded, withTeamRemoved } from '../utils/playerTeams';
import { useLanguage } from '../hooks/useLanguage';
import { langToLocale } from '../utils/plural';

export const NATIONALITIES = [
  { code: 'PL', flag: '🇵🇱', name: 'Polska' },
  { code: 'US', flag: '🇺🇸', name: 'USA' },
  { code: 'DE', flag: '🇩🇪', name: 'Niemcy' },
  { code: 'FR', flag: '🇫🇷', name: 'Francja' },
  { code: 'GB', flag: '🇬🇧', name: 'UK' },
  { code: 'RU', flag: '🇷🇺', name: 'Rosja' },
  { code: 'CZ', flag: '🇨🇿', name: 'Czechy' },
  { code: 'FI', flag: '🇫🇮', name: 'Finlandia' },
  { code: 'SE', flag: '🇸🇪', name: 'Szwecja' },
  { code: 'NL', flag: '🇳🇱', name: 'Holandia' },
  { code: 'IT', flag: '🇮🇹', name: 'Włochy' },
  { code: 'ES', flag: '🇪🇸', name: 'Hiszpania' },
  { code: 'AT', flag: '🇦🇹', name: 'Austria' },
  { code: 'CH', flag: '🇨🇭', name: 'Szwajcaria' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgia' },
  { code: 'DK', flag: '🇩🇰', name: 'Dania' },
  { code: 'UA', flag: '🇺🇦', name: 'Ukraina' },
  { code: 'SK', flag: '🇸🇰', name: 'Słowacja' },
  { code: 'LT', flag: '🇱🇹', name: 'Litwa' },
  { code: 'LV', flag: '🇱🇻', name: 'Łotwa' },
  { code: 'EE', flag: '🇪🇪', name: 'Estonia' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugalia' },
  { code: 'CA', flag: '🇨🇦', name: 'Kanada' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'ZA', flag: '🇿🇦', name: 'RPA' },
  { code: 'MY', flag: '🇲🇾', name: 'Malezja' },
  { code: 'TH', flag: '🇹🇭', name: 'Tajlandia' },
  { code: 'PH', flag: '🇵🇭', name: 'Filipiny' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonezja' },
  { code: 'CY', flag: '🇨🇾', name: 'Cypr' },
  { code: 'NO', flag: '🇳🇴', name: 'Norwegia' },
  { code: 'GR', flag: '🇬🇷', name: 'Grecja' },
  { code: 'RS', flag: '🇷🇸', name: 'Serbia' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazylia' },
  { code: 'CO', flag: '🇨🇴', name: 'Kolumbia' },
  { code: 'LU', flag: '🇱🇺', name: 'Luksemburg' },
  { code: 'BG', flag: '🇧🇬', name: 'Bułgaria' },
];

export default function PlayerEditModal({ player, defaultTeamId = '', teams = [], onSave, onCancel, open }) {
  const { t, lang } = useLanguage();
  const device = useDevice();
  const wide = device.width >= 720; // tablet/desktop → 2-col centered panel
  const isEdit = !!player;

  const [fName,      setFName]      = useState('');
  const [fNick,      setFNick]      = useState('');
  const [fNumber,    setFNumber]    = useState('');
  const [fTeamId,    setFTeamId]    = useState('');   // primary team
  const [fTeams,     setFTeams]     = useState([]);   // § 72 — all memberships
  const [fPbliId,    setFPbliId]    = useState('');
  const [fFavBunker, setFFavBunker] = useState('');
  const [fComment,   setFComment]   = useState('');
  const [fPhotoURL,  setFPhotoURL]  = useState('');
  const [fRole,      setFRole]      = useState('player');
  const [fClass,     setFClass]     = useState('');
  const [fNation,    setFNation]    = useState('');

  // Populate form when player changes (edit) or modal opens (add)
  useEffect(() => {
    if (!open) return;
    if (player) {
      setFName(player.name || '');
      setFNick(player.nickname || '');
      setFNumber(player.number || '');
      setFTeams(playerTeams(player));
      setFTeamId(player.teamId || playerTeams(player)[0] || '');
      setFPbliId(player.pbliId || '');
      setFFavBunker(player.favoriteBunker || '');
      setFComment(player.comment || '');
      setFPhotoURL(player.photoURL || '');
      setFRole(player.role || 'player');
      setFClass(player.playerClass || '');
      setFNation(player.nationality || '');
    } else {
      setFName(''); setFNick(''); setFNumber('');
      setFTeams(defaultTeamId ? [defaultTeamId] : []);
      setFTeamId(defaultTeamId || '');
      setFPbliId(''); setFFavBunker(''); setFComment('');
      setFPhotoURL('');
      setFRole('player'); setFClass(''); setFNation('');
    }
  }, [open, player, defaultTeamId]);

  const valid = fName.trim() && fNumber.trim();

  // § 72 — multi-team membership editor. Shared teams[]/primary invariant
  // logic (also used by the TeamDetailPage quick-buttons) — single-sourced
  // in playerTeams.js.
  const addTeam = (tid) => {
    const next = withTeamAdded({ teams: fTeams, teamId: fTeamId }, tid);
    setFTeams(next.teams);
    setFTeamId(next.teamId || '');
  };
  const removeTeam = (tid) => {
    const next = withTeamRemoved({ teams: fTeams, teamId: fTeamId }, tid);
    setFTeams(next.teams);
    setFTeamId(next.teamId || '');
  };

  const handleSave = async () => {
    if (!valid) return;
    await onSave({
      name:            fName.trim(),
      nickname:        fNick.trim(),
      number:          fNumber.trim(),
      // § 72 — teamId is the PRIMARY; always one of teams[].
      teamId:          (fTeams.includes(fTeamId) ? fTeamId : fTeams[0]) || null,
      teams:           fTeams,
      // Normalize at the write boundary so the data stays clean for the
      // self-claim matcher (strips `#`, whitespace, lowercases). See
      // src/utils/pbliMatching.js + 2026-04-24 relax-player-linking brief.
      pbliId:          normalizePbliInput(fPbliId) || null,
      favoriteBunker:  fFavBunker || null,
      comment:         fComment.trim() || null,
      photoURL:        fPhotoURL.trim() || null,
      role:            fRole || 'player',
      playerClass:     fClass || null,
      nationality:     fNation || null,
    });
  };

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleDateString(langToLocale(lang)); } catch { return iso; }
  };
  const getTeamName = (tid) => teams.find(t => t.id === tid)?.name || '—';

  // ─── Identity column (avatar + name/number/nick) ───
  const identityCol = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Avatar preview + photo URL (PlayerAvatar already falls back to initials) */}
      <Field label={t('player_edit_photo_label')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PlayerAvatar player={{ ...player, nickname: fNick, name: fName, photoURL: fPhotoURL }} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Input value={fPhotoURL} onChange={setFPhotoURL} placeholder="https://..." />
            <div style={{ display: 'flex', gap: 14, marginTop: 5 }}>
              {fPbliId.trim() && (
                <a href={`https://pbleagues.com/player/${fPbliId.trim()}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.accent, textDecoration: 'none', WebkitTapHighlightColor: 'transparent' }}>
                  {t('player_edit_open_pbl')}
                </a>
              )}
              {fPhotoURL && (
                <span onClick={() => setFPhotoURL('')} style={{ fontFamily: FONT, fontSize: 11, color: COLORS.danger, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  {t('player_edit_remove_link')}
                </span>
              )}
            </div>
          </div>
        </div>
      </Field>

      {/* Name + Number */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label={t('b13_input_full_name_star')} required><Input value={fName} onChange={setFName} placeholder="Jan Kowalski" autoFocus /></Field>
        </div>
        <div style={{ width: 96, flexShrink: 0 }}>
          <Field label="Nr" required><Input value={fNumber} onChange={setFNumber} placeholder="00" /></Field>
        </div>
      </div>

      {/* Nickname */}
      <Field label="Nickname"><Input value={fNick} onChange={setFNick} placeholder="np. Koe" /></Field>
    </div>
  );

  // ─── Details column (teams + classification + context) ───
  const detailsCol = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Teams — multi-membership (§ 72). ★ = primary team (tap to set). */}
      <Field label={`${t('player_edit_teams_label')}${fTeams.length > 1 ? t('player_edit_teams_primary') : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {fTeams.map(tid => {
            const isPrimary = tid === fTeamId;
            return (
              <div key={tid} style={{
                display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, borderRadius: 10,
                background: ELEV.surface, border: `1px solid ${isPrimary ? COLORS.accent : ELEV.hairline}`,
                boxShadow: ELEV.shadow1,
              }}>
                <span role="button" title={t('b13_set_primary')} onClick={() => setFTeamId(tid)}
                  style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', color: isPrimary ? COLORS.accent : COLORS.textMuted }}><RdIcon name="star" size={16} /></span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>{getTeamName(tid)}</span>
                <span role="button" title="Remove" onClick={() => removeTeam(tid)}
                  style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', color: COLORS.textMuted }}>
                  <RdIcon name="close" size={15} />
                </span>
              </div>
            );
          })}
          <Select value="" onChange={addTeam} style={{ width: '100%' }}>
            <option value="">{t('player_edit_add_team')}</option>
            {teams.filter(t => !fTeams.includes(t.id)).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
      </Field>

      {/* Role + Class */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label={t('role_label')}>
            <Select value={fRole} onChange={setFRole}>
              <option value="player">{t('role_player')}</option>
              <option value="coach">{t('role_coach')}</option>
              <option value="staff">{t('player_form_staff_role')}</option>
            </Select>
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label={t('player_form_class_label')}>
            <Select value={fClass} onChange={setFClass}>
              <option value="">— none —</option>
              <option value="Pro">Pro</option>
              <option value="Semi-Pro">Semi-Pro</option>
              <option value="D1">D1</option>
              <option value="D2">D2</option>
              <option value="D3">D3</option>
              <option value="D4">D4</option>
              <option value="D5">D5</option>
            </Select>
          </Field>
        </div>
      </div>

      {/* Nationality + PBLI ID */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label={t('player_form_nationality_label')}>
            <Select value={fNation} onChange={setFNation}>
              <option value="">— none —</option>
              {NATIONALITIES.map(n => <option key={n.code} value={n.code}>{n.flag} {n.name}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label={t('player_form_pbli_id_label')}><Input value={fPbliId} onChange={setFPbliId} placeholder={t('b13_profile_number_ph')} /></Field>
        </div>
      </div>

      {/* Fav bunker */}
      <Field label={t('player_form_fav_bunker_label')}>
        <Select value={fFavBunker} onChange={setFFavBunker}>
          <option value="">— none —</option>
          {BUNKER_TYPES.map(b => <option key={b.abbr} value={b.abbr}>{b.abbr} — {b.name}</option>)}
        </Select>
      </Field>

      {/* Notes */}
      <Field label={t('player_form_notes_label')}>
        <TextArea value={fComment} onChange={setFComment} placeholder={t('b13_notes_about_player_ph')} rows={2} />
      </Field>

      {/* Team history — edit mode only */}
      {isEdit && player?.teamHistory?.length > 0 && (
        <Field label={t('player_edit_team_history_label')}>
          <div style={{ background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 10, padding: 8, maxHeight: 110, overflowY: 'auto' }}>
            {player.teamHistory.map((h, i) => (
              <div key={i} style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.text, padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: COLORS.accent, fontWeight: 700 }}>{getTeamName(h.teamId)}</span>
                <span style={{ color: COLORS.textMuted }}>{formatDate(h.from)} → {h.to ? formatDate(h.to) : 'now'}</span>
              </div>
            ))}
          </div>
        </Field>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onCancel}
      maxWidth={wide ? 720 : undefined}
      title={isEdit ? t('player_edit_title_edit') : t('player_edit_title_new')}
      footer={<>
        <Btn variant="default" onClick={onCancel}>{t('cancel')}</Btn>
        <Btn variant="accent" disabled={!valid} onClick={handleSave}><Icons.Check /> {t('save')}</Btn>
      </>}
    >
      {wide ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start' }}>
          {identityCol}
          {detailsCol}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {identityCol}
          {detailsCol}
        </div>
      )}
    </Modal>
  );
}
