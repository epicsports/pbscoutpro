import React, { useEffect, useState } from 'react';
import { Btn, Input, Modal, Select, TextArea, Checkbox } from '../../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS, BUNKER_TYPES } from '../../utils/theme';
import { addPlayer, updatePlayer } from '../../services/dataService';
import { normalizePbliInput } from '../../utils/pbliMatching';
import { NATIONALITIES } from '../../components/PlayerEditModal';

// Phase 2.2.c — create/edit modal for global /players/{playerId}.
// Distinct from src/components/PlayerEditModal (workspace context with
// team dropdown + teamHistory). This one targets the global player
// identity per § 63.15.3 — no teamId, no team history (Phase 2.4
// teamMemberships will model team relationship separately).
//
// Props:
//   open      — modal visibility
//   onClose   — close handler
//   player    — null = create mode, object = edit mode
//   onRequestDelete — called with the player object when admin clicks Delete
//                      (parent owns the delete confirmation flow because the
//                      aliasIds-aware warning needs Modal-level rich content)
export default function PlayerFormModal({ open, onClose, player, onRequestDelete }) {
  const isEdit = !!player;

  // Identity
  const [fName, setFName] = useState('');
  const [fNickname, setFNickname] = useState('');
  const [fNumber, setFNumber] = useState('');

  // PBLI link
  const [fPbliId, setFPbliId] = useState('');
  const [fPbliIdFull, setFPbliIdFull] = useState('');

  // Attributes
  const [fHero, setFHero] = useState(false);
  const [fAge, setFAge] = useState('');
  const [fNationality, setFNationality] = useState('');
  const [fFavBunker, setFFavBunker] = useState('');
  const [fPlayerClass, setFPlayerClass] = useState('');
  const [fRole, setFRole] = useState('player');
  const [fPhotoURL, setFPhotoURL] = useState('');
  const [fComment, setFComment] = useState('');

  const [showAudit, setShowAudit] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFName(player?.name || '');
    setFNickname(player?.nickname || '');
    setFNumber(player?.number || '');
    setFPbliId(player?.pbliId || '');
    setFPbliIdFull(player?.pbliIdFull || '');
    setFHero(!!player?.hero);
    setFAge(player?.age ? String(player.age) : '');
    setFNationality(player?.nationality || '');
    setFFavBunker(player?.favoriteBunker || '');
    setFPlayerClass(player?.playerClass || '');
    setFRole(player?.role || 'player');
    setFPhotoURL(player?.photoURL || '');
    setFComment(player?.comment || '');
    setShowAudit(false);
    setErrors({});
    setSubmitError(null);
  }, [open, player]);

  const validate = () => {
    const e = {};
    if (!fName.trim()) e.name = 'required';
    if (fAge && (Number.isNaN(Number(fAge)) || Number(fAge) < 0 || Number(fAge) > 120)) e.age = '0-120';
    if (fPhotoURL.trim() && !/^https?:\/\//.test(fPhotoURL.trim())) e.photoURL = 'must start with http(s)://';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    setSubmitError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: fName.trim(),
        nickname: fNickname.trim() || null,
        number: fNumber.trim() || null,
        pbliId: normalizePbliInput(fPbliId) || null,
        pbliIdFull: fPbliIdFull.trim() || null,
        hero: !!fHero,
        age: fAge ? Number(fAge) : null,
        nationality: fNationality || null,
        favoriteBunker: fFavBunker || null,
        playerClass: fPlayerClass || null,
        role: fRole || 'player',
        photoURL: fPhotoURL.trim() || null,
        comment: fComment.trim() || null,
      };

      if (isEdit) {
        // updatePlayer dual-writes (Phase 2.2.b) to both workspace +
        // global /players/{id}. setDoc(merge:true) safe even for the
        // canonical-with-no-aliases case where global doc was created
        // by Phase 2.2.a bootstrap (not addPlayer).
        await updatePlayer(player.id, payload);
      } else {
        // addPlayer dual-writes too. It only picks a subset of fields
        // into the initial workspace doc — chain a follow-up update for
        // the admin-only fields (hero, pbliIdFull, photoURL, comment)
        // so they land on both copies via the standard dual-write path.
        const ref = await addPlayer({
          name: payload.name,
          nickname: payload.nickname,
          number: payload.number,
          age: payload.age,
          favoriteBunker: payload.favoriteBunker,
          pbliId: payload.pbliId,
          playerClass: payload.playerClass,
          role: payload.role,
          nationality: payload.nationality,
        });
        const extras = {};
        if (payload.pbliIdFull) extras.pbliIdFull = payload.pbliIdFull;
        if (payload.hero) extras.hero = true;
        if (payload.photoURL) extras.photoURL = payload.photoURL;
        if (payload.comment) extras.comment = payload.comment;
        if (Object.keys(extras).length > 0) {
          await updatePlayer(ref.id, extras);
        }
      }
      // Catalog version bump now happens inside addPlayer/updatePlayer (every
      // catalog-display mutation bumps — the § version-gated-cache invariant).
      onClose();
    } catch (err) {
      console.error('Player save failed:', err);
      setSubmitError(err?.message || 'Save failed — see console');
    } finally {
      setSaving(false);
    }
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    try {
      const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      return d.toLocaleString('pl-PL');
    } catch { return String(ts); }
  };

  const aliasIds = Array.isArray(player?.aliasIds) ? player.aliasIds.filter(Boolean) : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${player?.nickname || player?.name || 'player'}` : 'New player'}
      footer={<>
        {isEdit && onRequestDelete && (
          <Btn variant="danger" onClick={() => onRequestDelete(player)} disabled={saving} style={{ marginRight: 'auto' }}>
            Delete
          </Btn>
        )}
        <Btn variant="default" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn variant="accent" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>

        {/* Identity */}
        <SectionHeader>Identity</SectionHeader>
        <FieldRow label="Full name" error={errors.name}>
          <Input value={fName} onChange={setFName} placeholder="Full name" autoFocus />
        </FieldRow>
        <div style={{ display: 'flex', gap: SPACE.xs }}>
          <div style={{ flex: 2 }}>
            <FieldRow label="Nickname"><Input value={fNickname} onChange={setFNickname} placeholder="Optional" /></FieldRow>
          </div>
          <div style={{ flex: 1 }}>
            <FieldRow label="Jersey #"><Input value={fNumber} onChange={setFNumber} placeholder="—" /></FieldRow>
          </div>
        </div>

        {/* PBLI link */}
        <SectionHeader>PBLeagues link</SectionHeader>
        <div style={{ display: 'flex', gap: SPACE.xs }}>
          <div style={{ flex: 1 }}>
            <FieldRow label="PBLI ID" hint="First segment, e.g. 61114">
              <Input value={fPbliId} onChange={setFPbliId} placeholder="61114" />
            </FieldRow>
          </div>
          <div style={{ flex: 1 }}>
            <FieldRow label="PBLI ID (full)" hint="e.g. 61114-8236">
              <Input value={fPbliIdFull} onChange={setFPbliIdFull} placeholder="61114-8236" />
            </FieldRow>
          </div>
        </div>

        {/* Attributes */}
        <SectionHeader>Attributes</SectionHeader>
        <div style={{ padding: SPACE.xs }}>
          <Checkbox label="HERO (global rank)" checked={fHero} onChange={setFHero} />
        </div>
        <div style={{ display: 'flex', gap: SPACE.xs }}>
          <div style={{ flex: 1 }}>
            <FieldRow label="Age" error={errors.age}>
              <Input value={fAge} onChange={setFAge} placeholder="—" type="number" />
            </FieldRow>
          </div>
          <div style={{ flex: 2 }}>
            <FieldRow label="Nationality">
              <Select value={fNationality} onChange={setFNationality} style={{ width: '100%' }}>
                <option value="">— none —</option>
                {NATIONALITIES.map(n => <option key={n.code} value={n.code}>{n.flag} {n.name}</option>)}
              </Select>
            </FieldRow>
          </div>
        </div>
        <div style={{ display: 'flex', gap: SPACE.xs }}>
          <div style={{ flex: 1 }}>
            <FieldRow label="Role">
              <Select value={fRole} onChange={setFRole} style={{ width: '100%' }}>
                <option value="player">Player</option>
                <option value="coach">Coach</option>
                <option value="staff">Staff</option>
              </Select>
            </FieldRow>
          </div>
          <div style={{ flex: 1 }}>
            <FieldRow label="Class">
              <Select value={fPlayerClass} onChange={setFPlayerClass} style={{ width: '100%' }}>
                <option value="">— none —</option>
                <option value="Pro">Pro</option>
                <option value="Semi-Pro">Semi-Pro</option>
                <option value="D1">D1</option>
                <option value="D2">D2</option>
                <option value="D3">D3</option>
                <option value="D4">D4</option>
                <option value="D5">D5</option>
              </Select>
            </FieldRow>
          </div>
        </div>
        <FieldRow label="Favorite bunker">
          <Select value={fFavBunker} onChange={setFFavBunker} style={{ width: '100%' }}>
            <option value="">— none —</option>
            {BUNKER_TYPES.map(b => <option key={b.abbr} value={b.abbr}>{b.abbr} — {b.name}</option>)}
          </Select>
        </FieldRow>
        <FieldRow label="Photo URL" error={errors.photoURL} hint="https://...">
          <Input value={fPhotoURL} onChange={setFPhotoURL} placeholder="https://..." />
        </FieldRow>
        <FieldRow label="Notes">
          <TextArea value={fComment} onChange={setFComment} placeholder="Notes about player..." rows={2} />
        </FieldRow>

        {/* Audit (collapsed by default in edit mode; hidden in create mode) */}
        {isEdit && (
          <div style={{ marginTop: SPACE.xs }}>
            <button onClick={() => setShowAudit(s => !s)} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'transparent',
              border: 'none', cursor: 'pointer', padding: '4px 0',
              fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: COLORS.textDim,
              minHeight: 32,
            }}>
              {showAudit ? '▾' : '▸'} Audit / read-only
            </button>
            {showAudit && (
              <div style={{ padding: SPACE.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceDark, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <AuditRow label="ID" value={<code style={{ color: COLORS.text }}>{player.id}</code>} />
                <AuditRow label="Origin workspace" value={player.originWorkspace || '—'} />
                <AuditRow label="Created" value={formatTs(player.createdAt)} />
                <AuditRow label="Updated" value={formatTs(player.updatedAt)} />
                <AuditRow label="Migrated" value={formatTs(player.migratedAt)} />
                <AuditRow label="Linked uid" value={player.linkedUid || '—'} />
                <AuditRow label="Linked at" value={formatTs(player.linkedAt)} />
                <AuditRow label="Unlinked at" value={formatTs(player.unlinkedAt)} />
                <AuditRow label="Aliases" value={
                  aliasIds.length === 0 ? '—' : (
                    <span>
                      <strong style={{ color: COLORS.text }}>{aliasIds.length}</strong>
                      <span style={{ color: COLORS.textMuted }}>{' · '}</span>
                      {aliasIds.map((a, i) => (
                        <code key={a} style={{ color: COLORS.textMuted, marginRight: i === aliasIds.length - 1 ? 0 : 4 }}>
                          {a}{i === aliasIds.length - 1 ? '' : ','}
                        </code>
                      ))}
                    </span>
                  )
                } />
              </div>
            )}
          </div>
        )}

        {submitError && (
          <div style={{ padding: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.danger}18`, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
            {submitError}
          </div>
        )}
      </div>
    </Modal>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginTop: SPACE.xs,
    }}>{children}</div>
  );
}

function FieldRow({ label, error, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: COLORS.textDim }}>{label}</div>
        {error && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.danger }}>{error}</div>}
      </div>
      {children}
      {hint && !error && (
        <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
}

function AuditRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: SPACE.xs, alignItems: 'baseline', fontFamily: FONT, fontSize: 11 }}>
      <div style={{ minWidth: 110, color: COLORS.textMuted, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: COLORS.textDim, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}
