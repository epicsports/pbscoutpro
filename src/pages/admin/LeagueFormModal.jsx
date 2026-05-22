import React, { useEffect, useMemo, useState } from 'react';
import { Btn, Input, Modal } from '../../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';
import { createLeague, updateLeague, generateDivisionId } from '../../services/dataService';
import { useAllLeagues } from '../../hooks/useLeagues';

// Phase 2.1c — create/edit modal for /leagues/{leagueId}.
// Props:
//   open      — modal visibility
//   onClose   — close handler
//   league    — null = create mode, object = edit mode
export default function LeagueFormModal({ open, onClose, league }) {
  const isEdit = !!league;
  const allLeagues = useAllLeagues();
  const [shortName, setShortName] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [parentLeagueFamily, setParentLeagueFamily] = useState('');
  const [divisions, setDivisions] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Reset form on open + league change
  useEffect(() => {
    if (!open) return;
    setShortName(league?.shortName || '');
    setName(league?.name || '');
    setRegion(league?.region || '');
    setParentLeagueFamily(league?.parentLeagueFamily || '');
    setDivisions(
      Array.isArray(league?.divisions) && league.divisions.length
        ? league.divisions.map(d => ({ name: d.name || '' }))
        : [{ name: '' }]
    );
    setErrors({});
    setSubmitError(null);
  }, [open, league]);

  // Live id preview (helps admin understand convention)
  const previewLeagueId = useMemo(
    () => shortName ? `l_${shortName.toLowerCase().trim()}` : '',
    [shortName]
  );

  const validate = () => {
    const e = {};
    const sn = shortName.trim();
    if (!sn) e.shortName = 'required';
    else if (!/^[A-Z0-9]{2,10}$/.test(sn)) e.shortName = '2-10 uppercase letters/digits';
    else {
      const taken = allLeagues.find(L => L.shortName && L.shortName.toLowerCase() === sn.toLowerCase() && L.id !== league?.id);
      if (taken) e.shortName = `already in use (${taken.id})`;
    }
    if (!name.trim()) e.name = 'required';
    else if (name.trim().length > 50) e.name = 'max 50 chars';

    const cleaned = divisions.filter(d => d.name.trim());
    if (cleaned.length === 0) e.divisions = 'at least one division required';
    else {
      const seen = new Set();
      for (const d of cleaned) {
        const key = d.name.trim().toLowerCase();
        if (seen.has(key)) { e.divisions = `duplicate division name "${d.name}"`; break; }
        seen.add(key);
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    setSubmitError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const cleanedDivisions = divisions.filter(d => d.name.trim());
      if (isEdit) {
        await updateLeague(league.id, {
          shortName: shortName.trim(),
          name: name.trim(),
          region: region.trim() || null,
          parentLeagueFamily: parentLeagueFamily.trim() || null,
          divisions: cleanedDivisions,
        });
      } else {
        await createLeague({
          shortName: shortName.trim(),
          name: name.trim(),
          region: region.trim() || null,
          parentLeagueFamily: parentLeagueFamily.trim() || null,
          divisions: cleanedDivisions,
        });
      }
      onClose();
    } catch (err) {
      console.error('League save failed:', err);
      setSubmitError(err?.message || 'Save failed — see console');
    } finally {
      setSaving(false);
    }
  };

  const updateDivision = (i, value) => {
    setDivisions(prev => prev.map((d, idx) => idx === i ? { name: value } : d));
  };
  const addDivision = () => setDivisions(prev => [...prev, { name: '' }]);
  const removeDivision = (i) => setDivisions(prev => prev.filter((_, idx) => idx !== i));

  const renamedExisting = isEdit && divisions.some((d, i) => {
    const orig = league?.divisions?.[i];
    return orig && d.name.trim() && d.name.trim() !== orig.name;
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${league?.shortName || 'league'}` : 'New league'}
      footer={<>
        <Btn variant="default" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn variant="accent" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>

        {/* § 71 — shortName is the immutable KEY: id=l_${shortName} is derived
            at create, and every layout/tournament/team ref stores this string.
            Editable only at CREATE; frozen (read-only) in edit. */}
        <FieldRow label="Short name (code)" error={errors.shortName}
          hint={isEdit
            ? 'Permanent — the key stored in every layout / tournament / team reference. Rename the Display name instead.'
            : (previewLeagueId ? `id will be: ${previewLeagueId}` : 'e.g. NXL, PXL, DPL')}>
          {isEdit ? (
            <div style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${COLORS.border}`, background: COLORS.surfaceDark,
              color: COLORS.textDim, fontFamily: FONT, fontSize: 14,
              boxSizing: 'border-box', minHeight: 44, display: 'flex', alignItems: 'center',
            }}>{shortName}</div>
          ) : (
            <Input value={shortName} onChange={v => setShortName(v.toUpperCase())} placeholder="NXL" />
          )}
        </FieldRow>

        <FieldRow label="Display name" error={errors.name}
          hint="Shown across the app — safe to rename anytime (resolved from the short name).">
          <Input value={name} onChange={setName} placeholder="National X Ball League" />
        </FieldRow>

        <FieldRow label="Region (optional)" hint="e.g. US, EU — leave blank if single-region">
          <Input value={region} onChange={setRegion} placeholder="" />
        </FieldRow>

        <FieldRow label="Parent league family (optional)" hint="UI grouping across regions, e.g. 'nxl' for NXL US + NXL EU">
          <Input value={parentLeagueFamily} onChange={setParentLeagueFamily} placeholder="" />
        </FieldRow>

        <div>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: COLORS.textDim, marginBottom: SPACE.xs }}>
            Divisions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
            {divisions.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: SPACE.xs, alignItems: 'center' }}>
                <span style={{ width: 24, textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>{i + 1}.</span>
                <div style={{ flex: 1 }}>
                  <Input value={d.name} onChange={v => updateDivision(i, v)} placeholder="Division name" />
                </div>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, minWidth: 60 }}>
                  {d.name.trim() ? `id: ${generateDivisionId(d.name)}` : ''}
                </span>
                <Btn variant="default" size="sm" onClick={() => removeDivision(i)} disabled={divisions.length === 1}
                  style={{ color: COLORS.danger, minWidth: 44 }}>×</Btn>
              </div>
            ))}
          </div>
          <Btn variant="default" size="sm" onClick={addDivision} style={{ marginTop: SPACE.xs }}>+ Add division</Btn>
          {errors.divisions && (
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.danger, marginTop: SPACE.xs }}>
              {errors.divisions}
            </div>
          )}
          {renamedExisting && (
            <div style={{ marginTop: SPACE.xs, padding: SPACE.xs, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.accent}18`, fontFamily: FONT, fontSize: 11, color: COLORS.accent }}>
              ⚠ Renaming a division regenerates its id. Existing tournaments + teams store division as name string — they keep working. Future id-based references would shift.
            </div>
          )}
        </div>

        {submitError && (
          <div style={{ padding: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.danger}18`, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
            {submitError}
          </div>
        )}
      </div>
    </Modal>
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
