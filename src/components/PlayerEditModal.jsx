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
import { Modal, Input, Select, Btn, Icons, TextArea } from './ui';
import PlayerAvatar from './PlayerAvatar';
import { COLORS, FONT, TOUCH, BUNKER_TYPES } from '../utils/theme';
import { normalizePbliInput } from '../utils/pbliMatching';
import { playerTeams, withTeamAdded, withTeamRemoved } from '../utils/playerTeams';
import { useLanguage } from '../hooks/useLanguage';

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
  const { t } = useLanguage();
  const isEdit = !!player;

  const [fName,      setFName]      = useState('');
  const [fNick,      setFNick]      = useState('');
  const [fNumber,    setFNumber]    = useState('');
  const [fTeamId,    setFTeamId]    = useState('');   // primary team
  const [fTeams,     setFTeams]     = useState([]);   // § 72 — all memberships
  const [fAge,       setFAge]       = useState('');
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
      setFAge(player.age ? String(player.age) : '');
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
      setFAge(''); setFPbliId(''); setFFavBunker(''); setFComment('');
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
      age:             fAge ? Number(fAge) : null,
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
    try { return new Date(iso).toLocaleDateString('pl-PL'); } catch { return iso; }
  };
  const getTeamName = (tid) => teams.find(t => t.id === tid)?.name || '—';

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={isEdit ? t('player_edit_title_edit') : t('player_edit_title_new')}
      footer={<>
        <Btn variant="default" onClick={onCancel}>{t('cancel')}</Btn>
        <Btn variant="accent" disabled={!valid} onClick={handleSave}><Icons.Check /> {t('save')}</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Photo URL + preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
          <PlayerAvatar
            player={{ ...player, nickname: fNick, name: fName, photoURL: fPhotoURL }}
            size={56}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <span>{t('player_edit_photo_label')}</span>
              {fPbliId.trim() && (
                <a
                  href={`https://pbleagues.com/player/${fPbliId.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: FONT, fontSize: 11, fontWeight: 600,
                    color: COLORS.accent, textDecoration: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  {t('player_edit_open_pbl')}
                </a>
              )}
            </div>
            <Input
              value={fPhotoURL}
              onChange={setFPhotoURL}
              placeholder="https://..."
            />
            {fPhotoURL && (
              <div onClick={() => setFPhotoURL('')} style={{
                fontFamily: FONT, fontSize: 11, color: COLORS.danger,
                cursor: 'pointer', marginTop: 4, WebkitTapHighlightColor: 'transparent',
              }}>
                {t('player_edit_remove_link')}
              </div>
            )}
          </div>
        </div>

        {/* Row: Name + Nr */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 2 }}>
            <Input value={fName} onChange={setFName} placeholder="Full name *" autoFocus />
          </div>
          <div style={{ flex: 1 }}>
            <Input value={fNumber} onChange={setFNumber} placeholder="Nr *" />
          </div>
        </div>

        {/* Nickname */}
        <Input value={fNick} onChange={setFNick} placeholder="Nickname (optional)" />

        {/* Teams — multi-membership (§ 72). ★ = primary team (tap to set). */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>
            {t('player_edit_teams_label')}{fTeams.length > 1 ? t('player_edit_teams_primary') : ''}
          </div>
          {fTeams.map(tid => {
            const isPrimary = tid === fTeamId;
            return (
              <div key={tid} style={{
                display: 'flex', alignItems: 'center', gap: 6, minHeight: 44,
                marginBottom: 4, borderRadius: 8,
                background: COLORS.surfaceDark,
                border: `1px solid ${isPrimary ? COLORS.accent : COLORS.border}`,
              }}>
                <span role="button" title="Set primary" onClick={() => setFTeamId(tid)}
                  style={{
                    width: 44, height: 44, flexShrink: 0, fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    color: isPrimary ? COLORS.accent : COLORS.textMuted,
                  }}>★</span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 14, color: COLORS.text }}>
                  {getTeamName(tid)}
                </span>
                <span role="button" title="Remove" onClick={() => removeTeam(tid)}
                  style={{
                    width: 44, height: 44, flexShrink: 0, fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    color: COLORS.textMuted,
                  }}>✕</span>
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

        {/* Age */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('player_form_age_label')}</div>
          <Input value={fAge} onChange={setFAge} placeholder="e.g. 25" type="number" />
        </div>

        {/* Row: Role + Class */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('role_label')}</div>
            <Select value={fRole} onChange={setFRole} style={{ width: '100%' }}>
              <option value="player">{t('role_player')}</option>
              <option value="coach">{t('role_coach')}</option>
              <option value="staff">{t('player_form_staff_role')}</option>
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('player_form_class_label')}</div>
            <Select value={fClass} onChange={setFClass} style={{ width: '100%' }}>
              <option value="">— none —</option>
              <option value="Pro">Pro</option>
              <option value="Semi-Pro">Semi-Pro</option>
              <option value="D1">D1</option>
              <option value="D2">D2</option>
              <option value="D3">D3</option>
              <option value="D4">D4</option>
              <option value="D5">D5</option>
            </Select>
          </div>
        </div>

        {/* Row: Nationality + PBLI ID */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('player_form_nationality_label')}</div>
            <Select value={fNation} onChange={setFNation} style={{ width: '100%' }}>
              <option value="">— none —</option>
              {NATIONALITIES.map(n => <option key={n.code} value={n.code}>{n.flag} {n.name}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('player_form_pbli_id_label')}</div>
            <Input value={fPbliId} onChange={setFPbliId} placeholder="Profile number" />
          </div>
        </div>

        {/* Fav bunker */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('player_form_fav_bunker_label')}</div>
          <Select value={fFavBunker} onChange={setFFavBunker} style={{ width: '100%' }}>
            <option value="">— none —</option>
            {BUNKER_TYPES.map(b => <option key={b.abbr} value={b.abbr}>{b.abbr} — {b.name}</option>)}
          </Select>
        </div>

        {/* Comment */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('player_form_notes_label')}</div>
          <TextArea
            value={fComment}
            onChange={setFComment}
            placeholder="Notes about player..."
            rows={2}
          />
        </div>

        {/* Team history — edit mode only */}
        {isEdit && player?.teamHistory?.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('player_edit_team_history_label')}</div>
            <div style={{ background: COLORS.bg, borderRadius: 6, padding: 8, maxHeight: 110, overflowY: 'auto' }}>
              {player.teamHistory.map((h, i) => (
                <div key={i} style={{
                  fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.text,
                  padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center',
                }}>
                  <span style={{ color: COLORS.accent, fontWeight: 700 }}>{getTeamName(h.teamId)}</span>
                  <span style={{ color: COLORS.textMuted }}>
                    {formatDate(h.from)} → {h.to ? formatDate(h.to) : 'now'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
