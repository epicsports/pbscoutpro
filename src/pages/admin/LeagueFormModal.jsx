import React, { useEffect, useMemo, useState } from 'react';
import { Btn, Input, Modal } from '../../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';
import { createLeague, updateLeague, generateDivisionId } from '../../services/dataService';
import { useAllLeagues, refreshLeagues } from '../../hooks/useLeagues';
import { useLanguage } from '../../hooks/useLanguage';

// Phase 2.1c — create/edit modal for /leagues/{leagueId}.
// Props:
//   open      — modal visibility
//   onClose   — close handler
//   league    — null = create mode, object = edit mode
export default function LeagueFormModal({ open, onClose, league }) {
  const { t } = useLanguage();
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
    if (!sn) e.shortName = t('form_field_required');
    else if (!/^[A-Z0-9]{2,10}$/.test(sn)) e.shortName = t('league_form_shortname_error_format');
    else {
      const taken = allLeagues.find(L => L.shortName && L.shortName.toLowerCase() === sn.toLowerCase() && L.id !== league?.id);
      if (taken) e.shortName = `already in use (${taken.id})`;
    }
    if (!name.trim()) e.name = t('form_field_required');
    else if (name.trim().length > 50) e.name = t('league_form_name_error_max_chars');

    const cleaned = divisions.filter(d => d.name.trim());
    if (cleaned.length === 0) e.divisions = t('league_form_divisions_error_min_one');
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
      await refreshLeagues(); // refetch so the admin list shows the new/edited league now (no reload)
      onClose();
    } catch (err) {
      console.error('League save failed:', err);
      setSubmitError(err?.message || t('save_error_with_console_hint'));
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
      title={isEdit ? t('league_form_title_edit', league?.shortName || 'league') : t('league_form_title_new')}
      footer={<>
        <Btn variant="default" onClick={onClose} disabled={saving}>{t('cancel')}</Btn>
        <Btn variant="accent" onClick={handleSave} disabled={saving}>{saving ? t('saving') : t('save')}</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>

        {/* § 71 — shortName is the immutable KEY: id=l_${shortName} is derived
            at create, and every layout/tournament/team ref stores this string.
            Editable only at CREATE; frozen (read-only) in edit. */}
        <FieldRow label={t('league_form_short_name_label')} error={errors.shortName}
          hint={isEdit
            ? t('league_form_short_name_frozen_hint')
            : (previewLeagueId ? t('league_form_id_preview', previewLeagueId) : t('league_form_short_name_ph'))}>
          {isEdit ? (
            <div style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${COLORS.border}`, background: COLORS.surfaceDark,
              color: COLORS.textDim, fontFamily: FONT, fontSize: 14,
              boxSizing: 'border-box', minHeight: 44, display: 'flex', alignItems: 'center',
            }}>{shortName}</div>
          ) : (
            <Input value={shortName} onChange={v => setShortName(v.toUpperCase())} placeholder={t('league_form_shortname_placeholder')} />
          )}
        </FieldRow>

        <FieldRow label={t('league_form_display_name_label')} error={errors.name}
          hint={t('league_form_display_name_hint')}>
          <Input value={name} onChange={setName} placeholder={t('league_form_display_name_ph')} />
        </FieldRow>

        <FieldRow label={t('league_form_region_label')} hint={t('league_form_region_hint')}>
          <Input value={region} onChange={setRegion} placeholder="" />
        </FieldRow>

        <FieldRow label={t('league_form_parent_family_label')} hint={t('league_form_parent_family_hint')}>
          <Input value={parentLeagueFamily} onChange={setParentLeagueFamily} placeholder="" />
        </FieldRow>

        <div>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: COLORS.textDim, marginBottom: SPACE.xs }}>
            {t('divisions_label')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
            {divisions.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: SPACE.xs, alignItems: 'center' }}>
                <span style={{ width: 24, textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>{i + 1}.</span>
                <div style={{ flex: 1 }}>
                  <Input value={d.name} onChange={v => updateDivision(i, v)} placeholder={t('league_form_division_name_ph')} />
                </div>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, minWidth: 60 }}>
                  {d.name.trim() ? `${t('league_form_division_id_prefix')}${generateDivisionId(d.name)}` : ''}
                </span>
                <Btn variant="default" size="sm" onClick={() => removeDivision(i)} disabled={divisions.length === 1}
                  style={{ color: COLORS.danger, minWidth: 44 }}>{t('league_form_division_remove_button')}</Btn>
              </div>
            ))}
          </div>
          <Btn variant="default" size="sm" onClick={addDivision} style={{ marginTop: SPACE.xs }}>{t('league_form_add_division')}</Btn>
          {errors.divisions && (
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.danger, marginTop: SPACE.xs }}>
              {errors.divisions}
            </div>
          )}
          {renamedExisting && (
            <div style={{ marginTop: SPACE.xs, padding: SPACE.xs, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.accent}18`, fontFamily: FONT, fontSize: 11, color: COLORS.accent }}>
              {t('league_form_rename_warn')}
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
