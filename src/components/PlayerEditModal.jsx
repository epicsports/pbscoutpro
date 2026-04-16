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
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, Select, Btn, Icons, TextArea } from './ui';
import PlayerAvatar from './PlayerAvatar';
import AvatarCropModal from './AvatarCropModal';
import { COLORS, FONT, TOUCH, BUNKER_TYPES } from '../utils/theme';
import { cropToSquare, uploadPlayerPhoto } from '../services/imageService';
import { useWorkspace } from '../hooks/useWorkspace';

export default function PlayerEditModal({ player, defaultTeamId = '', teams = [], onSave, onCancel, open }) {
  const isEdit = !!player;
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || workspace?.id || 'default';

  const [fName,      setFName]      = useState('');
  const [fNick,      setFNick]      = useState('');
  const [fNumber,    setFNumber]    = useState('');
  const [fTeamId,    setFTeamId]    = useState('');
  const [fAge,       setFAge]       = useState('');
  const [fPbliId,    setFPbliId]    = useState('');
  const [fFavBunker, setFFavBunker] = useState('');
  const [fComment,   setFComment]   = useState('');
  const [fPhotoURL,  setFPhotoURL]  = useState(null);

  // Photo upload state
  const fileInputRef = useRef(null);
  const [cropFile, setCropFile] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);

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
      setFPhotoURL(player.photoURL || null);
    } else {
      setFName(''); setFNick(''); setFNumber('');
      setFTeamId(defaultTeamId || '');
      setFAge(''); setFPbliId(''); setFFavBunker(''); setFComment('');
      setFPhotoURL(null);
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
      photoURL:        fPhotoURL || null,
    });
  };

  const handlePickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { alert('Wybierz plik graficzny.'); return; }
    setCropFile(f);
    e.target.value = '';
  };

  const handleCropConfirm = async (cropRect) => {
    setPhotoSaving(true);
    try {
      const blob = await cropToSquare(cropFile, cropRect, 400, 0.85);
      // For new players we need a temp ID. Use timestamp+random — Firestore
      // doc id will be different but the photo URL is stored as-is anyway.
      const tempId = player?.id || `tmp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const url = await uploadPlayerPhoto(blob, workspaceSlug, tempId);
      setFPhotoURL(`${url}&_v=${Date.now()}`);
      setCropFile(null);
    } catch (err) {
      console.error('Player photo upload failed:', err);
      alert(`Błąd: ${err.message || err}`);
    }
    setPhotoSaving(false);
  };

  const formatDate = (iso) => {
    try { return new Date(iso).toLocaleDateString('pl-PL'); } catch { return iso; }
  };
  const getTeamName = (tid) => teams.find(t => t.id === tid)?.name || '—';

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={isEdit ? 'Edit player' : 'New player'}
      footer={<>
        <Btn variant="default" onClick={onCancel}>Cancel</Btn>
        <Btn variant="accent" disabled={!valid} onClick={handleSave}><Icons.Check /> Save</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Photo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
          <div onClick={() => fileInputRef.current?.click()}
            style={{ position: 'relative', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
            <PlayerAvatar player={{ ...player, nickname: fNick, name: fName, photoURL: fPhotoURL }} size={56} />
            <div style={{
              position: 'absolute', right: -2, bottom: -2,
              width: 22, height: 22, borderRadius: '50%',
              background: COLORS.accent, color: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, border: `2px solid ${COLORS.surface}`,
            }}>📷</div>
          </div>
          <div style={{ flex: 1 }}>
            <div onClick={() => fileInputRef.current?.click()} style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.accent,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>
              {fPhotoURL ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
            </div>
            {fPhotoURL && (
              <div onClick={() => setFPhotoURL(null)} style={{
                fontFamily: FONT, fontSize: 11, color: COLORS.danger,
                cursor: 'pointer', marginTop: 4, WebkitTapHighlightColor: 'transparent',
              }}>
                Usuń zdjęcie
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*"
            onChange={handlePickFile} style={{ display: 'none' }} />
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

        {/* Row: Team + Age */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Team</div>
            <Select value={fTeamId} onChange={setFTeamId} style={{ width: '100%' }}>
              <option value="">— none —</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Age</div>
            <Input value={fAge} onChange={setFAge} placeholder="e.g. 25" type="number" />
          </div>
        </div>

        {/* Row: PBLI ID + Fav bunker */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>PBLI ID</div>
            <Input value={fPbliId} onChange={setFPbliId} placeholder="Profile number" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Favorite bunker</div>
            <Select value={fFavBunker} onChange={setFFavBunker} style={{ width: '100%' }}>
              <option value="">— none —</option>
              {BUNKER_TYPES.map(b => <option key={b.abbr} value={b.abbr}>{b.abbr} — {b.name}</option>)}
            </Select>
          </div>
        </div>

        {/* Comment */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Notes</div>
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
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Team history</div>
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
      <AvatarCropModal
        open={!!cropFile}
        file={cropFile}
        saving={photoSaving}
        onCancel={() => !photoSaving && setCropFile(null)}
        onConfirm={handleCropConfirm}
      />
    </Modal>
  );
}
