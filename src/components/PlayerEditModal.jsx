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
import { Modal, Input, Select, Btn, Icons } from './ui';
import { COLORS, FONT, TOUCH, BUNKER_TYPES } from '../utils/theme';

export default function PlayerEditModal({ player, defaultTeamId = '', teams = [], onSave, onCancel, open }) {
  const isEdit = !!player;

  const [fName,      setFName]      = useState('');
  const [fNick,      setFNick]      = useState('');
  const [fNumber,    setFNumber]    = useState('');
  const [fTeamId,    setFTeamId]    = useState('');
  const [fAge,       setFAge]       = useState('');
  const [fPbliId,    setFPbliId]    = useState('');
  const [fFavBunker, setFFavBunker] = useState('');
  const [fComment,   setFComment]   = useState('');

  // Populate form when player changes (edit) or modal opens (add)
  useEffect(() => {
    if (!open) return;
    if (player) {
      setFName(player.name || '');
      setFNick(player.nickname || '');
      setFNumber(player.number || '');
      setFTeamId(player.teamId || defaultTeamId || '');
      setFAge(player.age ? String(player.age) : '');
      setFPbliId(player.pbliId || '');
      setFFavBunker(player.favoriteBunker || '');
      setFComment(player.comment || '');
    } else {
      setFName(''); setFNick(''); setFNumber('');
      setFTeamId(defaultTeamId || '');
      setFAge(''); setFPbliId(''); setFFavBunker(''); setFComment('');
    }
  }, [open, player, defaultTeamId]);

  const valid = fName.trim() && fNumber.trim();

  const handleSave = async () => {
    if (!valid) return;
    await onSave({
      name:            fName.trim(),
      nickname:        fNick.trim(),
      number:          fNumber.trim(),
      teamId:          fTeamId || null,
      age:             fAge ? Number(fAge) : null,
      pbliId:          fPbliId.trim() || null,
      favoriteBunker:  fFavBunker || null,
      comment:         fComment.trim() || null,
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
      title={isEdit ? 'Edit playera' : 'New player'}
      footer={<>
        <Btn variant="default" onClick={onCancel}>Cancel</Btn>
        <Btn variant="accent" disabled={!valid} onClick={handleSave}><Icons.Check /> Save</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Row: Name + Nr */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 2 }}>
            <Input value={fName} onChange={setFName} placeholder="Imię i nazwisko *" autoFocus />
          </div>
          <div style={{ flex: 1 }}>
            <Input value={fNumber} onChange={setFNumber} placeholder="Nr *" />
          </div>
        </div>

        {/* Nickname */}
        <Input value={fNick} onChange={setFNick} placeholder="Ksywka (opcjonalnie)" />

        {/* Row: Team + Age */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Drużyna</div>
            <Select value={fTeamId} onChange={setFTeamId} style={{ width: '100%' }}>
              <option value="">— brak —</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Wiek</div>
            <Input value={fAge} onChange={setFAge} placeholder="np. 25" type="number" />
          </div>
        </div>

        {/* Row: PBLI ID + Fav bunker */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>PBLI ID</div>
            <Input value={fPbliId} onChange={setFPbliId} placeholder="Numer profilu" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Ulubiony bunkier</div>
            <Select value={fFavBunker} onChange={setFFavBunker} style={{ width: '100%' }}>
              <option value="">— brak —</option>
              {BUNKER_TYPES.map(b => <option key={b.abbr} value={b.abbr}>{b.abbr} — {b.name}</option>)}
            </Select>
          </div>
        </div>

        {/* Comment */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Notatki</div>
          <textarea
            value={fComment}
            onChange={e => setFComment(e.target.value)}
            placeholder="Notatki o playerze..."
            style={{
              width: '100%', fontFamily: FONT, fontSize: TOUCH.fontSm,
              padding: '8px 10px', borderRadius: 6, background: COLORS.bg,
              color: COLORS.text, border: `1px solid ${COLORS.border}`,
              minHeight: 56, resize: 'vertical', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Team history — edit mode only */}
        {isEdit && player?.teamHistory?.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Historia drużyn</div>
            <div style={{ background: COLORS.bg, borderRadius: 6, padding: 8, maxHeight: 110, overflowY: 'auto' }}>
              {player.teamHistory.map((h, i) => (
                <div key={i} style={{
                  fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.text,
                  padding: '3px 0', display: 'flex', gap: 6, alignItems: 'center',
                }}>
                  <span style={{ color: COLORS.accent, fontWeight: 700 }}>{getTeamName(h.teamId)}</span>
                  <span style={{ color: COLORS.textMuted }}>
                    {formatDate(h.from)} → {h.to ? formatDate(h.to) : 'teraz'}
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
